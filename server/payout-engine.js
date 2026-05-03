// Orchestrates fully-automatic on-chain $Pc payouts.
//
// attemptAutoPayout(withdrawId) is fired immediately after a withdrawal is
// auto-approved (and may also be invoked by an admin retry endpoint). It:
//
//   1. Loads the withdraw row inside an atomic UPDATE that flips
//      status='approved' (tx_hash IS NULL) -> status='sending', returning
//      the row only to the caller that wins the race. This is the
//      idempotency lock — concurrent invocations for the same row become
//      no-ops.
//   2. Runs the circuit-breaker pre-flight (floor / 1h / 24h / single).
//   3. Signs + broadcasts via payout-signer (serialized, nonce-managed).
//   4. Inserts a payout_log row, then polls for confirmation in the
//      background (non-blocking). On confirm: status='completed', stores
//      tx_hash, fires existing notification + email. On failure: refund-safe
//      rollback to 'approved' so an admin can retry/manually-send, and
//      records a breaker failure.

import { query, pool } from './db.js';
import {
  isPayoutConfigured, sendErc20Transfer, waitForReceipt,
  getPayoutAddress, getOnChainPcBalance, getNativeBalance, ethRpc,
} from './payout-signer.js';
import {
  preflight as breakerPreflight, recordSuccess, recordFailure,
  getBreakerState, getWindowTotals, resetBreaker,
} from './payout-breaker.js';
import { sendWithdrawSentEmail } from './email.js';
import { isDemoMode } from './demo-mode.js';

const CONFIRMATIONS = parseInt(process.env.PAYOUT_CONFIRMATIONS || '2', 10);
const RECEIPT_TIMEOUT_MS = parseInt(process.env.PAYOUT_RECEIPT_TIMEOUT_MS || '300000', 10);

async function _logPayout({
  withdrawId, userId = null, idempotencyKey = null, status, txHash = null,
  amount, toAddress, error = null, gasPrice = null, gasLimit = null,
  gasUsed = null, walletBalanceAfter = null, nonce = null,
}) {
  await query(
    `INSERT INTO payout_log (withdraw_id, user_id, idempotency_key, status, tx_hash, amount, to_address,
                             error_message, gas_price, gas_limit, gas_used, wallet_balance_after, nonce)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [withdrawId, userId, idempotencyKey, status, txHash, String(amount), toAddress,
     error, gasPrice, gasLimit, gasUsed, walletBalanceAfter, nonce],
  ).catch(e => console.error('[payout_log insert]', e.message));
}

// Reads hot-wallet $Pc balance after a send so we can record it in the
// audit log. Best-effort — never blocks completion.
async function _safeBalanceSnapshot() {
  try { const b = await getOnChainPcBalance(); return b == null ? null : b.toString(); } catch { return null; }
}

async function _markCompleted(withdrawId, txHash) {
  await query(
    `UPDATE withdraw_requests SET status = 'completed', tx_hash = $1, processed_at = NOW() WHERE id = $2`,
    [txHash, withdrawId],
  );
  await query(
    `UPDATE transactions SET status = 'completed' WHERE withdraw_request_id = $1 AND status = 'pending'`,
    [withdrawId],
  );
}

async function _rollbackToApproved(withdrawId, note) {
  // Returns the row to the manual "Awaiting Send" queue so an admin can retry.
  await query(
    `UPDATE withdraw_requests SET status = 'approved',
       admin_note = COALESCE($1, admin_note)
     WHERE id = $2 AND status = 'sending'`,
    [note ? `Auto-payout failed: ${note}` : null, withdrawId],
  ).catch(e => console.error('[payout rollback]', e.message));
}

// Attempt an automatic on-chain payout for a single withdraw_request row.
// Safe to call multiple times — only the first call that flips the row to
// 'sending' will actually broadcast.
//
// Returns { skipped, reason } or { broadcast: true, txHash }.
export async function attemptAutoPayout(withdrawId) {
  if (isDemoMode()) return { skipped: true, reason: 'demo_mode' };
  if (!isPayoutConfigured()) return { skipped: true, reason: 'payout_wallet_not_configured' };

  // Idempotent claim — only the caller whose UPDATE flips an approved row
  // (with no tx_hash yet) gets to broadcast.
  const claim = await query(
    `UPDATE withdraw_requests
       SET status = 'sending', updated_at = NOW()
       WHERE id = $1 AND status = 'approved' AND tx_hash IS NULL
       RETURNING *`,
    [withdrawId],
  );
  if (!claim.rows.length) {
    // Maybe a previous broadcast succeeded but the process crashed before
    // we could mark it 'sending'. Look up by idempotency_key in payout_log
    // — if a 'sent'/'confirmed' entry exists, adopt the tx_hash AND kick
    // off the receipt finalizer so the row finishes the happy path
    // automatically (no admin intervention required).
    const existing = await query('SELECT * FROM withdraw_requests WHERE id = $1', [withdrawId]);
    const row = existing.rows[0];
    if (row?.idempotency_key) {
      const prior = await query(
        `SELECT tx_hash FROM payout_log
           WHERE idempotency_key = $1 AND status IN ('sent','confirmed') AND tx_hash IS NOT NULL
           ORDER BY created_at DESC LIMIT 1`,
        [row.idempotency_key],
      ).catch(() => null);
      const priorHash = prior?.rows?.[0]?.tx_hash;
      if (priorHash) {
        if (!row.tx_hash) {
          await query(`UPDATE withdraw_requests SET tx_hash = $1 WHERE id = $2 AND tx_hash IS NULL`, [priorHash, withdrawId]);
        }
        if (row.status !== 'completed') {
          _finalizeReceiptInBackground(row, priorHash);
        }
        return { skipped: true, reason: 'recovered_existing_tx', txHash: priorHash };
      }
    }
    return { skipped: true, reason: 'not_claimable' };
  }
  const w = claim.rows[0];
  const amountPc = BigInt(w.amount);

  // Pre-broadcast idempotency check — if a send for this key already
  // succeeded (e.g. prior process crashed between broadcast and DB update),
  // adopt the existing tx_hash instead of double-sending AND finalize.
  if (w.idempotency_key) {
    const prior = await query(
      `SELECT tx_hash FROM payout_log
         WHERE idempotency_key = $1 AND status IN ('sent','confirmed') AND tx_hash IS NOT NULL
         ORDER BY created_at DESC LIMIT 1`,
      [w.idempotency_key],
    ).catch(() => null);
    const priorHash = prior?.rows?.[0]?.tx_hash;
    if (priorHash) {
      await query(
        `UPDATE withdraw_requests SET tx_hash = $1, updated_at = NOW() WHERE id = $2`,
        [priorHash, w.id],
      );
      await _logPayout({
        withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
        status: 'idempotent_replay', txHash: priorHash, amount: w.amount, toAddress: w.to_address,
      });
      // Run the same receipt-confirmation finalizer the happy path uses so
      // the withdrawal completes itself (notification + email fire on
      // confirm). Returns immediately — finalize runs in background.
      _finalizeReceiptInBackground(w, priorHash);
      return { skipped: true, reason: 'idempotent_replay', txHash: priorHash };
    }
  }

  // Circuit breaker
  const pre = await breakerPreflight({ amount: amountPc });
  if (!pre.ok) {
    await _rollbackToApproved(w.id, `breaker:${pre.code}`);
    await _logPayout({
      withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
      status: 'breaker_blocked', amount: w.amount, toAddress: w.to_address, error: pre.reason,
    });
    return { skipped: true, reason: pre.code, message: pre.reason };
  }

  // Broadcast
  let send;
  try {
    send = await sendErc20Transfer({ to: w.to_address, amountTokens: amountPc });
  } catch (err) {
    const fails = await recordFailure(err.message);
    await _rollbackToApproved(w.id, `broadcast:${err.message}`);
    await _logPayout({
      withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
      status: 'send_failed', amount: w.amount, toAddress: w.to_address, error: err.message,
    });
    console.error(`[payout #${w.id}] broadcast failed (consec=${fails}):`, err.message);
    return { skipped: true, reason: 'broadcast_failed', message: err.message };
  }

  // Persist tx_hash immediately so a crash mid-confirm doesn't lose the link.
  await query(
    `UPDATE withdraw_requests SET tx_hash = $1, updated_at = NOW() WHERE id = $2`,
    [send.txHash, w.id],
  );
  const balAfterBroadcast = await _safeBalanceSnapshot();
  await _logPayout({
    withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
    status: 'sent', txHash: send.txHash, amount: w.amount, toAddress: w.to_address,
    gasPrice: send.gasPrice, gasLimit: send.gasLimit, nonce: send.nonce,
    walletBalanceAfter: balAfterBroadcast,
  });

  // Poll for confirmation in the background. Don't block the HTTP path.
  _finalizeReceiptInBackground(w, send.txHash);

  return { broadcast: true, txHash: send.txHash };
}

// Apply a confirmed receipt: mark completed, log, fire notification + email.
// Idempotent — duplicate notifications are suppressed by tx_hash slice.
async function _handleConfirmedReceipt(w, txHash, gasUsed, { source = 'watcher' } = {}) {
  await _markCompleted(w.id, txHash);
  await recordSuccess();
  const balAfter = await _safeBalanceSnapshot();
  await _logPayout({
    withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
    status: source === 'recheck' ? 'auto_finalized' : 'confirmed',
    txHash, amount: w.amount, toAddress: w.to_address,
    gasUsed, walletBalanceAfter: balAfter,
    error: source === 'recheck' ? 'Auto-finalized by post-timeout reconciler' : null,
  });
  // Avoid duplicate notification if a prior watcher already fired one
  // for the same tx_hash (idempotency-replay or recheck after timeout).
  const dup = await query(
    `SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'withdraw' AND message LIKE $2 LIMIT 1`,
    [w.user_id, `%${txHash.slice(0, 12)}%`],
  ).catch(() => ({ rows: [] }));
  if (!dup.rows.length) {
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Sent ✅', $2)",
      [w.user_id, `Your withdrawal of ${parseInt(w.amount).toLocaleString()} $Pc has been sent on-chain (tx: ${txHash.slice(0, 12)}...)`],
    );
    try {
      const u = await query('SELECT email, username, email_unsubscribed FROM users WHERE id = $1', [w.user_id]);
      const row = u.rows[0];
      if (row?.email && !row.email_unsubscribed) {
        sendWithdrawSentEmail(row.email, row.username, parseInt(w.amount), w.to_address, txHash)
          .catch(e => console.error(`[Email:withdraw-sent] ${e?.message}`));
      }
    } catch (_) {}
  }
}

// Apply a reverted receipt: log, record breaker failure, and flip the row
// back to 'approved' (clearing tx_hash) so the admin queue can retry/reject.
async function _handleRevertedReceipt(w, txHash, gasUsed) {
  await recordFailure(`tx ${txHash} reverted on-chain`);
  await _logPayout({
    withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
    status: 'reverted', txHash, amount: w.amount, toAddress: w.to_address,
    error: 'Transaction reverted on-chain', gasUsed,
  });
  // Reverted tx burned gas but moved no $Pc — safe to flip back to
  // 'approved' so the existing admin queue can either retry the
  // auto-send or reject/refund the user. We clear tx_hash so a retry
  // generates a fresh broadcast (idempotency_key intentionally kept
  // so log replays still match historic attempts).
  await query(
    `UPDATE withdraw_requests
        SET status = 'approved', tx_hash = NULL,
            admin_note = $1
      WHERE id = $2 AND status = 'sending'`,
    [`Auto-payout reverted on-chain (tx ${txHash}); requeued for retry/reject.`, w.id],
  );
}

// Single-shot receipt check. Returns the same shape as waitForReceipt but
// performs exactly one RPC roundtrip pair (no polling). Used by the
// post-timeout reconciler so we don't tie up workers waiting for slow chains.
async function _checkReceiptOnce(txHash, confirmations = CONFIRMATIONS) {
  const r = await ethRpc('eth_getTransactionReceipt', [txHash]);
  if (!r) return { status: 'pending', confirmations: 0, gasUsed: null };
  const head = BigInt(await ethRpc('eth_blockNumber', []));
  const txBlock = BigInt(r.blockNumber);
  const confs = head >= txBlock ? Number(head - txBlock + 1n) : 0;
  const gasUsed = r.gasUsed ? BigInt(r.gasUsed).toString() : null;
  if (r.status === '0x0') return { status: 'failed', confirmations: confs, gasUsed };
  if (confs >= confirmations) return { status: 'confirmed', confirmations: confs, gasUsed };
  return { status: 'pending', confirmations: confs, gasUsed };
}

// Background receipt poller. Used both by the broadcast happy path and by the
// idempotency-replay path (when we recover a tx_hash for a key whose original
// confirmation watcher was killed by a process crash). On confirm: marks the
// withdrawal completed, fires user notification + email. On revert/timeout:
// records a payout_log entry and leaves the row in 'sending' for admin
// inspection (the periodic reconciler will keep re-checking after timeout).
// Never throws.
function _finalizeReceiptInBackground(w, txHash) {
  (async () => {
    try {
      const receipt = await waitForReceipt(txHash, { confirmations: CONFIRMATIONS, timeoutMs: RECEIPT_TIMEOUT_MS });
      if (receipt.status === 'confirmed') {
        await _handleConfirmedReceipt(w, txHash, receipt.gasUsed);
      } else if (receipt.status === 'failed') {
        await _handleRevertedReceipt(w, txHash, receipt.gasUsed);
      } else {
        await _logPayout({
          withdrawId: w.id, userId: w.user_id, idempotencyKey: w.idempotency_key,
          status: 'pending_timeout', txHash, amount: w.amount, toAddress: w.to_address,
          error: 'Receipt poll timed out',
        });
        // Timeout means the tx may still confirm later. We must NOT flip
        // back to 'approved' here (would double-pay if the original lands).
        // Annotate so admins see it in the queue. The periodic reconciler
        // (recheckTimedOutPayouts) will keep checking the receipt every
        // minute and auto-finalize once it confirms — no admin needed.
        await query(
          `UPDATE withdraw_requests SET admin_note = $1 WHERE id = $2 AND status = 'sending'`,
          [`Receipt poll timed out for tx ${txHash}. Auto-reconciler will retry until confirmed.`, w.id],
        );
        console.warn(`[payout #${w.id}] receipt timeout for tx ${txHash} — handing off to reconciler`);
      }
    } catch (e) {
      console.error(`[payout #${w.id}] confirmation watcher error:`, e.message);
    }
  })().catch(() => {});
}

// Snapshot for the admin "Payout System Health" panel.
export async function getPayoutHealth() {
  const breaker = await getBreakerState();
  const totals = await getWindowTotals();
  const address = getPayoutAddress();
  let pcBalance = null, ethBalance = null, balanceError = null;
  if (address) {
    try { pcBalance = (await getOnChainPcBalance()).toString(); }
    catch (e) { balanceError = e.message; }
    try { ethBalance = (await getNativeBalance()).toString(); }
    catch (_) {}
  }
  const recent = await query(
    `SELECT pl.id, pl.withdraw_id, pl.status, pl.tx_hash, pl.amount, pl.to_address,
            pl.error_message, pl.gas_price, pl.nonce, pl.created_at,
            w.user_id, u.username
       FROM payout_log pl
       LEFT JOIN withdraw_requests w ON w.id = pl.withdraw_id
       LEFT JOIN users u ON u.id = w.user_id
       ORDER BY pl.created_at DESC LIMIT 20`,
  ).catch(() => ({ rows: [] }));

  // Chain-aware explorer URL prefix surfaced to the admin UI so each payout
  // tx hash can be a clickable link. Operators set PAYOUT_EXPLORER_BASE_URL
  // (e.g. https://etherscan.io/tx/, https://polygonscan.com/tx/) per chain;
  // we default to mainnet Etherscan so links remain functional out of the box.
  const explorerBase = process.env.PAYOUT_EXPLORER_BASE_URL || 'https://etherscan.io/tx/';

  return {
    configured: isPayoutConfigured(),
    demoMode: isDemoMode(),
    address,
    pcBalance,
    ethBalance,
    balanceError,
    breaker,
    totals,
    explorerBase,
    recent: recent.rows.map(r => ({ ...r, amount: r.amount?.toString?.() ?? r.amount })),
  };
}

export { resetBreaker };

// Startup reconciler: scans for any 'sending' rows that already have a
// tx_hash and resumes the receipt-finalization watcher for each. This
// closes the gap where the process crashes after broadcast but before
// confirmation — without this pass, those rows would sit in the admin
// queue forever waiting for a poll that never resumes. Safe to call
// repeatedly: the finalizer is idempotent (duplicate notifications are
// suppressed by tx_hash, and the SQL UPDATE on revert is gated on
// status='sending').
export async function reconcileStaleSendingPayouts() {
  if (isDemoMode() || !isPayoutConfigured()) return { resumed: 0, skipped: 'not_configured_or_demo' };
  const stale = await query(
    `SELECT id, user_id, amount, to_address, tx_hash, idempotency_key, status
       FROM withdraw_requests
      WHERE status = 'sending' AND tx_hash IS NOT NULL`,
  ).catch(e => { console.error('[payout reconcile] query failed:', e.message); return { rows: [] }; });
  for (const w of stale.rows) {
    console.log(`[payout reconcile] resuming receipt watcher for #${w.id} tx ${w.tx_hash}`);
    _finalizeReceiptInBackground(w, w.tx_hash);
  }
  return { resumed: stale.rows.length };
}

// Periodic reconciler for withdrawals that the in-process receipt watcher
// gave up on (status='sending' with a tx_hash, but the original
// waitForReceipt poll timed out before reaching CONFIRMATIONS). Without
// this, those rows sit in the admin queue forever waiting for a human to
// click Mark Sent, even though the tx may have confirmed minutes later.
//
// We only re-check rows whose updated_at is older than RECEIPT_TIMEOUT_MS
// so we don't race the live in-process watcher for freshly-broadcast txs.
// On confirmed → marks completed + fires notification/email (idempotent).
// On revert    → flips back to 'approved' so admin queue can retry/refund.
// On pending   → no-op; we'll re-check next minute.
//
// Safe to call repeatedly. Never throws. Returns counts for observability.
export async function recheckTimedOutPayouts() {
  if (isDemoMode() || !isPayoutConfigured()) return { rechecked: 0, skipped: 'not_configured_or_demo' };
  // Only consider rows older than the receipt timeout — younger ones are
  // still being polled by the in-process watcher and don't need our help.
  // Fair-rotation: ORDER BY last_rechecked_at NULLS FIRST so never-checked
  // rows always go first, then we cycle oldest-checked → newest-checked.
  // This prevents a backlog of >25 stuck pending rows from starving newly
  // timed-out payouts (the LIMIT 25 cap matters for slow chains).
  const graceSec = Math.max(30, Math.ceil(RECEIPT_TIMEOUT_MS / 1000));
  const stale = await query(
    `SELECT id, user_id, amount, to_address, tx_hash, idempotency_key, status
       FROM withdraw_requests
      WHERE status = 'sending' AND tx_hash IS NOT NULL
        AND updated_at < NOW() - ($1 || ' seconds')::interval
      ORDER BY last_rechecked_at ASC NULLS FIRST, updated_at ASC
      LIMIT 25`,
    [String(graceSec)],
  ).catch(e => { console.error('[payout recheck] query failed:', e.message); return { rows: [] }; });

  let confirmed = 0, reverted = 0, pending = 0, errored = 0;
  for (const w of stale.rows) {
    try {
      const r = await _checkReceiptOnce(w.tx_hash);
      if (r.status === 'confirmed') {
        await _handleConfirmedReceipt(w, w.tx_hash, r.gasUsed, { source: 'recheck' });
        confirmed++;
        console.log(`[payout recheck] auto-finalized #${w.id} tx ${w.tx_hash} (confs=${r.confirmations})`);
      } else if (r.status === 'failed') {
        await _handleRevertedReceipt(w, w.tx_hash, r.gasUsed);
        reverted++;
        console.warn(`[payout recheck] reverted #${w.id} tx ${w.tx_hash}`);
      } else {
        pending++;
      }
      // Stamp last_rechecked_at unconditionally so the next sweep rotates
      // to other pending rows. Gated on status='sending' so we don't touch
      // rows the confirm/revert handlers just transitioned out of sending.
      await query(
        `UPDATE withdraw_requests SET last_rechecked_at = NOW()
          WHERE id = $1 AND status = 'sending'`,
        [w.id],
      ).catch(() => {});
    } catch (e) {
      errored++;
      console.error(`[payout recheck #${w.id}]`, e.message);
      // Still bump the marker on transient RPC errors so a single bad row
      // doesn't permanently block the rest of the queue.
      await query(
        `UPDATE withdraw_requests SET last_rechecked_at = NOW()
          WHERE id = $1 AND status = 'sending'`,
        [w.id],
      ).catch(() => {});
    }
  }
  if (confirmed || reverted) {
    console.log(`[payout recheck] swept ${stale.rows.length} (confirmed=${confirmed} reverted=${reverted} pending=${pending} errored=${errored})`);
  }
  return { rechecked: stale.rows.length, confirmed, reverted, pending, errored };
}

// Cadence for the periodic timed-out-payout reconciler. One minute matches
// the deposit recheck loop in payments-routes.js and is well under typical
// L1/L2 confirmation windows. Module-level so it starts as soon as the
// server imports the engine; the function self-guards against demo mode
// and unconfigured payout wallets, so it's a cheap no-op in those cases.
const RECHECK_INTERVAL_MS = parseInt(process.env.PAYOUT_RECHECK_INTERVAL_MS || '60000', 10);
if (RECHECK_INTERVAL_MS > 0 && process.env.NODE_ENV !== 'test') {
  setInterval(() => { recheckTimedOutPayouts().catch(() => {}); }, RECHECK_INTERVAL_MS);
}
