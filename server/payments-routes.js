import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query, pool } from './db.js';
import { requireAuth } from './auth-routes.js';
import { processJackpotContribution } from './jackpot.js';
import { sendDepositConfirmationEmail, sendWithdrawEmail, sendWithdrawSentEmail } from './email.js';
import { refreshDefaultWalletVerification } from './wallet-routes.js';
import { isDemoMode } from './demo-mode.js';
import { verifyOnChainDeposit } from './pc-pricing.js';
import {
  isSolanaNetwork, isSolanaDepositConfigured, verifySolanaDeposit,
  isValidSolanaAddress, isValidSolanaSignature,
} from './solana.js';
import { attemptAutoPayout, getPayoutHealth, resetBreaker } from './payout-engine.js';

const router = Router();

// Canonical network labels stored on deposit_requests / withdraw_requests.
const NET_SOL = 'SOL';
const NET_ETH = 'ERC-20';
function normalizeNetwork(network, { address = null, txHash = null } = {}) {
  if (network) return isSolanaNetwork(network) ? NET_SOL : NET_ETH;
  // No explicit network — infer from address/tx format so legacy callers
  // (saved profile addresses) keep working on either rail.
  const probe = String(address || txHash || '').trim();
  if (/^0x[0-9a-fA-F]+$/.test(probe)) return NET_ETH;
  if (probe && /^[1-9A-HJ-NP-Za-km-z]+$/.test(probe)) return NET_SOL;
  return NET_ETH;
}

// Broadcast an operational alert to all admins (bell notifications).
// Best-effort — never throws.
async function _alertAdmins(title, message) {
  try {
    const admins = await query('SELECT id FROM users WHERE is_admin = TRUE');
    for (const a of admins.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'admin_alert', $2, $3)`,
        [a.id, title, message],
      ).catch(() => {});
    }
  } catch (e) {
    console.error('[admin alert]', e.message);
  }
}
// TREASURY WALLET — set DEPOSIT_WALLET_ADDRESS in environment secrets before going live
// This is where all player deposits are received on-chain
const DEPOSIT_ADDRESS = process.env.DEPOSIT_WALLET_ADDRESS;
if (!DEPOSIT_ADDRESS) {
  console.warn('[PAYMENTS] WARNING: DEPOSIT_WALLET_ADDRESS is not set. Deposits will be rejected until configured.');
}

const SOL_DEPOSIT_ADDRESS = process.env.SOL_DEPOSIT_WALLET || null;

// Get deposit addresses for both rails. `address` kept for legacy callers
// (Ethereum). Solana is the featured/default network in the UI.
router.get('/address', requireAuth, (req, res) => {
  if (!DEPOSIT_ADDRESS && !SOL_DEPOSIT_ADDRESS) {
    return res.status(503).json({ error: 'Deposit address not configured. Please contact support.' });
  }
  res.json({
    address: DEPOSIT_ADDRESS || null,
    eth: DEPOSIT_ADDRESS || null,
    sol: SOL_DEPOSIT_ADDRESS,
    defaultNetwork: SOL_DEPOSIT_ADDRESS ? NET_SOL : NET_ETH,
  });
});

// Internal helper: credit a deposit, update leaderboard, fire referral commission,
// send email + notification. Marks the row with the supplied status (default 'approved').
// Returns { ok: true } or throws.
async function _creditDepositRow(depositRow, { status = 'approved', descriptionPrefix = 'Deposit approved' } = {}) {
  const d = depositRow;
  // Atomic, idempotent state transition on a single connection. The
  // state-guarded UPDATE prevents double-credit if two callers (manual
  // approve + auto-recheck, or two recheck ticks) race on the same row.
  // Only the caller whose UPDATE flips a still-creditable row gets to
  // touch balance / transactions / leaderboard.
  const client = await pool.connect();
  let credited = false;
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE deposit_requests SET status = $1, processed_at = NOW()
       WHERE id = $2 AND status IN ('pending','needs_review')
       RETURNING *`,
      [status, d.id]
    );
    if (!upd.rows.length) {
      await client.query('ROLLBACK');
      console.warn(`[deposit credit] skip id=${d.id} — already in non-creditable state`);
      return { ok: false, alreadyProcessed: true };
    }
    const row = upd.rows[0];
    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [row.amount, row.user_id]);
    await client.query(
      'INSERT INTO transactions (user_id, type, amount, description, deposit_request_id) VALUES ($1, $2, $3, $4, $5)',
      [row.user_id, 'deposit', row.amount, `${descriptionPrefix} - ${row.network}${row.tx_hash ? ` (${row.tx_hash.slice(0, 12)}...)` : ''}`, row.id]
    );
    await client.query(
      `INSERT INTO leaderboard (user_id, username, balance)
       SELECT id, username, balance FROM users WHERE id = $1
       ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance`,
      [row.user_id]
    );
    await client.query('COMMIT');
    credited = true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw err;
  }
  client.release();
  if (!credited) return { ok: false, alreadyProcessed: true };

  // First-deposit referral commission (atomic)
  const commClient = await pool.connect();
  try {
    await commClient.query('BEGIN');
    const ref = await commClient.query(
      `UPDATE referrals SET commission_paid = TRUE
       WHERE referred_id = $1 AND commission_paid = FALSE
       RETURNING referrer_id`,
      [d.user_id]
    );
    if (ref.rows.length) {
      const referrerId = ref.rows[0].referrer_id;
      const commission = Math.floor(parseInt(d.amount) * 0.1);
      await commClient.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [commission, referrerId]);
      await commClient.query(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [referrerId, 'referral_commission', commission, `Referral commission from user #${d.user_id} first deposit`]
      );
      await commClient.query('COMMIT');
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'referral', 'Referral Commission! 🎉', $2)",
        [referrerId, `You earned ${commission.toLocaleString()} $Pc (10%) referral commission from your friend's first deposit!`]
      );
    } else {
      await commClient.query('ROLLBACK');
    }
  } catch (commErr) {
    await commClient.query('ROLLBACK').catch(() => {});
    console.error('[referral commission]', commErr.message);
  } finally {
    commClient.release();
  }

  // Email + notification (non-fatal)
  const user = await query('SELECT email, username, email_unsubscribed FROM users WHERE id = $1', [d.user_id]);
  if (user.rows[0]?.email && !user.rows[0].email_unsubscribed) {
    sendDepositConfirmationEmail(user.rows[0].email, user.rows[0].username, d.amount)
      .catch(e => console.error(`[Email:deposit] dispatch error to=${user.rows[0].email} reason="${e?.message || 'unknown'}"`));
  }
  await query(
    "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Approved! ✅', $2)",
    [d.user_id, `Your deposit of ${parseInt(d.amount).toLocaleString()} $Pc has been credited to your account.`]
  );
}

// Submit deposit request (user says "I've sent the payment")
router.post('/deposit/request', requireAuth, async (req, res) => {
  if (isDemoMode()) {
    return res.status(403).json({
      error: 'Demo mode is active. Real-money deposits are disabled.',
      code: 'DEMO_MODE_ENABLED',
      demoMode: true,
    });
  }

  const { amount, txHash, fromAddress, network } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const user = req.user;

  if (user.kyc_status !== 'approved') {
    return res.status(403).json({
      error: 'KYC verification required before deposits. Please complete identity verification in your profile.',
      code: 'KYC_REQUIRED',
    });
  }

  // Live wallet-eligibility check (USD-based threshold). Fail-closed.
  const walletCheck = await refreshDefaultWalletVerification(user.id, user.kyc_status).catch(err => {
    console.error('[deposit/wallet-check]', err.message);
    return { meetsThreshold: false, walletAddress: null, error: 'Wallet verification service unavailable. Please try again.' };
  });
  if (walletCheck.priceUnavailable) {
    return res.status(503).json({
      error: walletCheck.error || 'Wallet eligibility threshold temporarily unavailable. Please retry shortly.',
      code: 'PRICE_FEED_UNAVAILABLE',
    });
  }
  if (!walletCheck.meetsThreshold) {
    return res.status(403).json({
      error: walletCheck.error === 'No default wallet linked'
        ? `No verified wallet linked. Please add a wallet holding at least ${walletCheck.requiredBalance || ''} $Pc (≈ $${walletCheck.usdBasis || ''}) in your profile.`
        : walletCheck.error || 'Your linked wallet does not meet the $Pc holdings threshold for real transactions.',
      code: 'WALLET_THRESHOLD_NOT_MET',
      kycStatus: user.kyc_status,
      currentWalletBalance: walletCheck.currentBalance || null,
      requiredBalance: walletCheck.requiredBalance || null,
      usdBasis: walletCheck.usdBasis || null,
      pricePerPc: walletCheck.pricePerPc || null,
    });
  }

  // Daily deposit limit
  if (parseInt(user.daily_deposit_limit) > 0) {
    const todayDeposits = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM deposit_requests
       WHERE user_id = $1 AND status IN ('approved', 'auto_credited', 'confirmed') AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const todayTotal = parseInt(todayDeposits.rows[0].total);
    if (todayTotal + amount > parseInt(user.daily_deposit_limit)) {
      return res.status(400).json({ error: 'Daily deposit limit exceeded' });
    }
  }

  // Rate-limit claim attempts: repeated submissions are the signature of
  // someone probing for a tx hash they can steal. Cap requests per user.
  const recentCount = await query(
    `SELECT COUNT(*)::int AS cnt FROM deposit_requests
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
    [user.id]
  ).catch(() => null);
  if ((recentCount?.rows?.[0]?.cnt ?? 0) >= 5) {
    await _alertAdmins(
      '⚠️ Deposit rate limit hit',
      `User #${user.id} (${user.username}) exceeded 5 deposit requests in 10 minutes — possible tx-claim probing.`
    );
    return res.status(429).json({
      error: 'Too many deposit requests. Please wait a few minutes and try again.',
      code: 'RATE_LIMITED',
    });
  }

  // Resolve network first — hash normalization is network-specific.
  const net = normalizeNetwork(network, { txHash });

  // Normalize tx hashes. Ethereum hashes are case-insensitive → store
  // lowercased to prevent trivial casing-bypass replays. Solana signatures
  // are base58 (case-SENSITIVE) → preserve case; a case-variant of a valid
  // signature can never verify on-chain, and the case-insensitive dedupe
  // below still blocks casing-replay attempts across both rails.
  const txHashRaw = txHash ? String(txHash).trim() : null;
  const txHashNorm = txHashRaw ? (net === NET_SOL ? txHashRaw : txHashRaw.toLowerCase()) : null;

  // Early format rejection — cheap, and prevents junk rows.
  if (txHashNorm) {
    const okFormat = net === NET_SOL
      ? isValidSolanaSignature(txHashNorm)
      : /^0x[0-9a-fA-F]{64}$/.test(txHashNorm);
    if (!okFormat) {
      return res.status(400).json({
        error: net === NET_SOL
          ? 'Invalid Solana transaction signature format.'
          : 'Invalid Ethereum transaction hash format.',
        code: 'INVALID_TX_HASH',
      });
    }
  }

  // Dedupe by tx hash across ALL networks (case-insensitive) — prevents
  // replay/double-credit, including cross-user and cross-network reuse.
  if (txHashNorm) {
    const dup = await query(
      `SELECT id, status FROM deposit_requests WHERE LOWER(tx_hash) = LOWER($1) LIMIT 1`,
      [txHashNorm]
    );
    if (dup.rows.length) {
      return res.status(409).json({
        error: 'This transaction hash has already been submitted.',
        code: 'DUPLICATE_TX_HASH',
        existingStatus: dup.rows[0].status,
      });
    }
  }

  // Refuse Solana deposits when the Solana rail isn't configured — no
  // silent fallback to admin review with an unverifiable signature.
  if (net === NET_SOL && txHashNorm && !isSolanaDepositConfigured()) {
    return res.status(503).json({
      error: 'Solana deposits are temporarily unavailable. Please use Ethereum or try again later.',
      code: 'SOLANA_NOT_CONFIGURED',
    });
  }

  let createdRow;
  try {
    const result = await query(
      `INSERT INTO deposit_requests (user_id, amount, tx_hash, from_address, network, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [user.id, amount, txHashNorm, fromAddress || null, net]
    );
    createdRow = result.rows[0];
  } catch (err) {
    console.error('Deposit request error:', err);
    return res.status(500).json({ error: 'Deposit request failed' });
  }

  // If a tx hash was supplied, attempt automatic on-chain verification + credit.
  // No tx hash → leave pending for admin review (unchanged legacy behavior).
  if (txHashNorm) {
    try {
      const verdict = net === NET_SOL
        ? await verifySolanaDeposit({ signature: txHashNorm, expectedTokens: amount })
        : await verifyOnChainDeposit({
            txHash: txHashNorm,
            expectedTokens: amount,
            treasury: DEPOSIT_ADDRESS,
            contract: process.env.PC_TOKEN_CONTRACT,
          });

      // Ownership binding: even if the tx is a valid treasury-bound transfer,
      // we must confirm the *sender* is one of THIS user's linked wallets.
      // Otherwise a malicious user could claim someone else's pending tx.
      const ownershipOk = await _verifyDepositOwnership(user.id, verdict.fromAddress);

      if (verdict.status === 'confirmed' && !ownershipOk) {
        await query(
          `UPDATE deposit_requests SET status = 'needs_review', from_address = $1,
                 admin_note = $2, processed_at = NOW() WHERE id = $3`,
          [verdict.fromAddress || null, `On-chain tx confirmed but sender ${verdict.fromAddress} is not a linked/verified wallet for this user — admin review required.`, createdRow.id]
        );
        await query(
          "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Needs Review', $2)",
          [user.id, 'Your deposit was found on-chain but the sender wallet is not linked to your account. An admin will review.']
        );
        return res.json({
          success: true,
          needsReview: true,
          reason: 'sender_not_linked',
          request: { ...createdRow, status: 'needs_review' },
        });
      }

      if (verdict.status === 'confirmed') {
        await _creditDepositRow(createdRow, {
          status: 'auto_credited',
          descriptionPrefix: 'Auto-credited on-chain deposit',
        });
        return res.json({
          success: true,
          autoCredited: true,
          confirmations: verdict.confirmations,
          request: { ...createdRow, status: 'auto_credited' },
        });
      }

      if (verdict.status === 'rejected') {
        await query(
          `UPDATE deposit_requests SET status = 'auto_rejected', admin_note = $1, processed_at = NOW() WHERE id = $2`,
          [verdict.reason, createdRow.id]
        );
        await query(
          "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Rejected', $2)",
          [user.id, `Your deposit could not be verified on-chain: ${verdict.reason}`]
        );
        await _alertAdmins(
          '⚠️ Deposit auto-rejected',
          `Deposit #${createdRow.id} by ${user.username} (${net}, ${parseInt(amount).toLocaleString()} $Pc) rejected: ${verdict.reason}`
        );
        return res.status(400).json({
          error: `Deposit rejected: ${verdict.reason}`,
          code: 'DEPOSIT_VERIFICATION_FAILED',
          request: { ...createdRow, status: 'auto_rejected' },
        });
      }

      if (verdict.status === 'pending') {
        await query(
          `UPDATE deposit_requests SET admin_note = $1 WHERE id = $2`,
          [`Awaiting confirmations (${verdict.confirmations}/${verdict.required})`, createdRow.id]
        );
        await query(
          "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Pending Confirmations', $2)",
          [user.id, `Your deposit is on-chain but awaiting ${verdict.required} confirmations (${verdict.confirmations}/${verdict.required}). It will auto-credit once confirmed.`]
        );
        return res.json({
          success: true,
          pending: true,
          confirmations: verdict.confirmations,
          required: verdict.required,
          request: createdRow,
        });
      }

      // needs_review
      await query(
        `UPDATE deposit_requests SET status = 'needs_review', admin_note = $1 WHERE id = $2`,
        [verdict.reason, createdRow.id]
      );
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Pending Review', $2)",
        [user.id, `Your deposit needs manual review: ${verdict.reason}. An admin will look at it shortly.`]
      );
      return res.json({
        success: true,
        needsReview: true,
        reason: verdict.reason,
        request: { ...createdRow, status: 'needs_review' },
      });
    } catch (err) {
      console.error('[deposit auto-verify]', err);
      await query(
        `UPDATE deposit_requests SET status = 'needs_review', admin_note = $1 WHERE id = $2`,
        [`Auto-verify error: ${err.message}`, createdRow.id]
      ).catch(() => {});
      return res.json({
        success: true,
        needsReview: true,
        reason: 'Verification service error; flagged for admin review',
        request: { ...createdRow, status: 'needs_review' },
      });
    }
  }

  // No tx hash supplied — legacy "I've sent it" path, queued for admin review.
  await query(
    "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Request Submitted', $2)",
    [user.id, `Your deposit of ${parseInt(amount).toLocaleString()} $Pc is pending review. It will be credited within 24 hours.`]
  );
  return res.json({ success: true, request: createdRow });
});

// Admin: approve deposit
router.post('/deposit/:id/approve', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  if (isDemoMode()) {
    return res.status(403).json({ error: 'Demo mode is active. Approvals are disabled.', code: 'DEMO_MODE_ENABLED' });
  }

  try {
    const dep = await query('SELECT * FROM deposit_requests WHERE id = $1', [req.params.id]);
    if (!dep.rows.length) return res.status(404).json({ error: 'Not found' });
    const d = dep.rows[0];
    if (!['pending', 'needs_review'].includes(d.status)) {
      return res.status(400).json({ error: 'Already processed' });
    }
    await _creditDepositRow(d, { status: 'approved', descriptionPrefix: 'Deposit approved' });
    res.json({ success: true });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Approve deposit error:', err);
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Admin: reject deposit
router.post('/deposit/:id/reject', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const { note } = req.body;
  try {
    await query('UPDATE deposit_requests SET status = $1, admin_note = $2, processed_at = NOW() WHERE id = $3',
      ['rejected', note || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// Submit withdraw request — auto-approves after safety checks (admin still
// physically sends funds and marks 'completed' afterwards).
router.post('/withdraw/request', requireAuth, async (req, res) => {
  if (isDemoMode()) {
    return res.status(403).json({
      error: 'Demo mode is active. Real-money withdrawals are disabled.',
      code: 'DEMO_MODE_ENABLED',
      demoMode: true,
    });
  }

  const { amount, toAddress, network } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!toAddress) return res.status(400).json({ error: 'Destination address required' });

  // Resolve rail + validate the destination address format for that rail
  // BEFORE debiting anything. Mis-typed addresses must never enter the
  // payout queue.
  const withdrawNet = normalizeNetwork(network, { address: toAddress });
  const addrTrimmed = String(toAddress).trim();
  if (withdrawNet === NET_SOL) {
    if (!isValidSolanaAddress(addrTrimmed)) {
      return res.status(400).json({ error: 'Invalid Solana destination address.', code: 'INVALID_ADDRESS' });
    }
  } else if (!/^0x[0-9a-fA-F]{40}$/.test(addrTrimmed)) {
    return res.status(400).json({ error: 'Invalid Ethereum (ERC-20) destination address.', code: 'INVALID_ADDRESS' });
  }

  const user = req.user;

  if (user.kyc_status !== 'approved') {
    return res.status(403).json({
      error: 'KYC verification required before withdrawals. Please complete identity verification in your profile.',
      code: 'KYC_REQUIRED',
    });
  }

  // Live on-chain wallet check (USD-based threshold). Fail-closed.
  const withdrawWalletCheck = await refreshDefaultWalletVerification(user.id, user.kyc_status).catch(err => {
    console.error('[withdraw/wallet-check]', err.message);
    return { meetsThreshold: false, walletAddress: null, error: 'Wallet verification service unavailable. Please try again.' };
  });
  if (withdrawWalletCheck.priceUnavailable) {
    return res.status(503).json({
      error: withdrawWalletCheck.error || 'Wallet eligibility threshold temporarily unavailable. Please retry shortly.',
      code: 'PRICE_FEED_UNAVAILABLE',
    });
  }
  if (!withdrawWalletCheck.meetsThreshold) {
    return res.status(403).json({
      error: withdrawWalletCheck.error === 'No default wallet linked'
        ? `No verified wallet linked. Please add a wallet holding at least ${withdrawWalletCheck.requiredBalance || ''} $Pc.`
        : withdrawWalletCheck.error || 'Your linked wallet does not meet the $Pc holdings threshold for withdrawals.',
      code: 'WALLET_THRESHOLD_NOT_MET',
      kycStatus: user.kyc_status,
      currentWalletBalance: withdrawWalletCheck.currentBalance || null,
      requiredBalance: withdrawWalletCheck.requiredBalance || null,
      usdBasis: withdrawWalletCheck.usdBasis || null,
      pricePerPc: withdrawWalletCheck.pricePerPc || null,
    });
  }

  const balance = parseInt(user.balance);
  if (amount > balance) return res.status(400).json({ error: 'Insufficient balance' });

  // Daily loss limit
  if (parseInt(user.daily_loss_limit) > 0) {
    const todayLoss = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'bet' AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const todayWon = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'win' AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const netLoss = parseInt(todayLoss.rows[0].total) - parseInt(todayWon.rows[0].total);
    if (netLoss >= parseInt(user.daily_loss_limit)) {
      return res.status(400).json({ error: 'Daily loss limit reached. Withdrawal blocked until tomorrow.' });
    }
  }

  try {
    await query('BEGIN');
    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, user.id]);

    // Auto-approve immediately. Status flow: 'approved' (queued for send) ->
    // 'sending' (broadcast in flight) -> 'completed' (on-chain confirmed) OR
    // back to 'approved' on broadcast failure for admin retry/manual send.
    const idempotencyKey = randomBytes(16).toString('hex');
    const result = await query(
      `INSERT INTO withdraw_requests (user_id, amount, to_address, network, status, idempotency_key, processed_at)
       VALUES ($1, $2, $3, $4, 'approved', $5, NOW()) RETURNING *`,
      [user.id, amount, addrTrimmed, withdrawNet, idempotencyKey]
    );
    // Link the transaction row to this specific withdraw_request so later
    // mark-sent / reject only updates THIS row (not all pending withdraws).
    await query(
      'INSERT INTO transactions (user_id, type, amount, description, status, withdraw_request_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, 'withdraw', amount, `Withdrawal approved to ${toAddress.slice(0, 10)}... — awaiting send`, 'pending', result.rows[0].id]
    );
    await query('COMMIT');

    if (user.email && !user.email_unsubscribed) {
      sendWithdrawEmail(user.email, user.username, amount, toAddress)
        .catch(e => console.error(`[Email:withdraw] dispatch error to=${user.email} reason="${e?.message || 'unknown'}"`));
    }

    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Approved', $2)",
      [user.id, `Your withdrawal of ${parseInt(amount).toLocaleString()} $Pc to ${toAddress.slice(0, 16)}... was auto-approved and is queued for sending.`]
    );

    // Fire-and-forget automatic on-chain payout (Task #91). Errors are
    // surfaced to the user via notifications + the admin "Awaiting Send"
    // queue (the row rolls back to status='approved' on failure).
    attemptAutoPayout(result.rows[0].id)
      .then(r => {
        if (r?.broadcast) console.log(`[auto-payout] withdraw #${result.rows[0].id} broadcast ${r.txHash}`);
        else if (r?.skipped) console.log(`[auto-payout] withdraw #${result.rows[0].id} skipped: ${r.reason}`);
      })
      .catch(e => console.error(`[auto-payout] withdraw #${result.rows[0].id} error:`, e.message));

    res.json({ success: true, autoApproved: true, request: result.rows[0] });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Withdraw request error:', err);
    res.status(500).json({ error: 'Withdrawal request failed' });
  }
});

// Admin: payout system health snapshot (Task #91).
router.get('/admin/payouts/health', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const health = await getPayoutHealth();
    res.json(health);
  } catch (err) {
    console.error('[payouts/health]', err);
    res.status(500).json({ error: 'Failed to load payout health' });
  }
});

// Admin: manually reset the payout circuit breaker (Task #91).
router.post('/admin/payouts/reset-breaker', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    await resetBreaker(req.user.username);
    await query(
      `INSERT INTO admin_actions (admin_id, admin_username, action, target_type, target_id, details)
       VALUES ($1, $2, 'payout_breaker_reset', 'system', 0, $3)`,
      [req.user.id, req.user.username, JSON.stringify({ at: new Date().toISOString() })],
    ).catch(() => {});
    res.json({ success: true, breaker: (await getPayoutHealth()).breaker });
  } catch (err) {
    console.error('[payouts/reset-breaker]', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Admin: retry an auto-payout that failed (row should be back at 'approved').
router.post('/admin/payouts/:id/retry', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const r = await attemptAutoPayout(parseInt(req.params.id, 10));
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: rollback a 'sending' row whose receipt poll timed out, after the
// admin has manually verified on-chain that the broadcast tx will never
// confirm (e.g. dropped from mempool, replaced by speedup, etc.). Flips
// the row back to 'approved' so the standard awaiting-send queue can
// retry the auto-send or refund the user. Refuses if the row is in any
// other state — operators must never blindly rollback a still-pending tx.
router.post('/admin/payouts/:id/rollback-sending', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  if (isDemoMode()) {
    return res.status(403).json({ error: 'Demo mode is active.', code: 'DEMO_MODE_ENABLED' });
  }
  const id = parseInt(req.params.id, 10);
  try {
    const wr = await query('SELECT * FROM withdraw_requests WHERE id = $1', [id]);
    if (!wr.rows.length) return res.status(404).json({ error: 'Not found' });
    const w = wr.rows[0];
    if (w.status !== 'sending') {
      return res.status(400).json({ error: `Cannot rollback a ${w.status} withdrawal` });
    }
    const note = `Rolled back from 'sending' by admin ${req.user.username}` +
      (w.tx_hash ? ` (prior tx ${w.tx_hash} confirmed unrecoverable).` : '.');
    await query(
      `UPDATE withdraw_requests
          SET status = 'approved', tx_hash = NULL, admin_note = $1
        WHERE id = $2 AND status = 'sending'`,
      [note, id],
    );
    await query(
      `INSERT INTO admin_actions (admin_id, admin_username, action, target_type, target_id, details)
       VALUES ($1, $2, 'payout_rollback_sending', 'withdraw_request', $3, $4)`,
      [req.user.id, req.user.username, id, JSON.stringify({ priorTxHash: w.tx_hash })],
    ).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error('[payout rollback-sending]', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: manual approve — transitions a 'pending' (needs-review/manual-check)
// withdrawal to 'approved' (awaiting send). Does NOT finalize. The admin must
// still call /mark-sent after physically sending the funds.
router.post('/withdraw/:id/approve', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  if (isDemoMode()) {
    return res.status(403).json({ error: 'Demo mode is active. Approvals are disabled.', code: 'DEMO_MODE_ENABLED' });
  }
  try {
    const wr = await query('SELECT * FROM withdraw_requests WHERE id = $1', [req.params.id]);
    if (!wr.rows.length) return res.status(404).json({ error: 'Not found' });
    const w = wr.rows[0];
    if (w.status === 'approved') return res.json({ success: true, alreadyApproved: true });
    if (w.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve a ${w.status} withdrawal` });
    }
    await query(
      `UPDATE withdraw_requests SET status = 'approved', processed_at = NOW() WHERE id = $1`,
      [w.id]
    );
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Approved', $2)",
      [w.user_id, `Your withdrawal of ${parseInt(w.amount).toLocaleString()} $Pc was approved and is queued for sending.`]
    );
    await query(
      `INSERT INTO admin_actions (admin_id, admin_username, action, target_type, target_id, details)
       VALUES ($1, $2, 'withdraw_approve', 'withdraw_request', $3, $4)`,
      [req.user.id, req.user.username, w.id, JSON.stringify({ amount: parseInt(w.amount), toAddress: w.to_address, recipientUserId: w.user_id })]
    ).catch(e => console.error('[admin_actions log]', e.message));
    // Hand off to the auto-payout engine the same way the auto-approval path
    // (POST /withdraw/request) does. Manual approvals must reach the signer
    // automatically — admins should never have to take a second action to
    // physically broadcast the on-chain transfer.
    attemptAutoPayout(w.id)
      .catch(e => console.error(`[auto-payout #${w.id} after manual approve]`, e?.message));
    res.json({ success: true });
  } catch (err) {
    console.error('[withdraw approve]', err);
    res.status(500).json({ error: 'Approve failed' });
  }
});

// Admin: mark withdrawal as physically sent. Flips status -> 'completed' and
// finalizes the transaction row + notifies the user.
router.post('/withdraw/:id/mark-sent', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  if (isDemoMode()) {
    return res.status(403).json({ error: 'Demo mode is active. Sends are disabled.', code: 'DEMO_MODE_ENABLED' });
  }
  return _markWithdrawSent(req, res);
});

async function _markWithdrawSent(req, res) {
  const { txHash } = req.body || {};
  try {
    const wr = await query('SELECT * FROM withdraw_requests WHERE id = $1', [req.params.id]);
    if (!wr.rows.length) return res.status(404).json({ error: 'Not found' });
    const w = wr.rows[0];
    // Strict state-machine: only an 'approved' (awaiting-send) row may be
    // marked sent. 'pending' rows must first be manually approved via
    // /withdraw/:id/approve to enforce the audit-friendly two-step flow.
    if (!['approved', 'sending'].includes(w.status)) {
      return res.status(400).json({
        error: w.status === 'pending'
          ? 'Withdrawal is still pending manual approval. Approve it first.'
          : `Cannot mark ${w.status} withdrawal as sent`,
      });
    }

    await query(
      `UPDATE withdraw_requests SET status = 'completed', tx_hash = COALESCE($1, tx_hash), processed_at = NOW() WHERE id = $2`,
      [txHash || null, w.id]
    );
    // Scope the transaction-row update to THIS specific withdraw_request only.
    await query(
      "UPDATE transactions SET status = 'completed' WHERE withdraw_request_id = $1 AND status = 'pending'",
      [w.id]
    );
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Sent ✅', $2)",
      [w.user_id, `Your withdrawal of ${parseInt(w.amount).toLocaleString()} $Pc has been sent to ${w.to_address.slice(0, 16)}...${txHash ? ` (tx: ${txHash.slice(0, 12)}...)` : ''}`]
    );

    // Email confirmation to the recipient (best-effort).
    try {
      const u = await query('SELECT email, username, email_unsubscribed FROM users WHERE id = $1', [w.user_id]);
      const row = u.rows[0];
      if (row?.email && !row.email_unsubscribed) {
        sendWithdrawSentEmail(row.email, row.username, parseInt(w.amount), w.to_address, txHash || w.tx_hash || null)
          .catch(e => console.error(`[Email:withdraw-sent] dispatch error to=${row.email} reason="${e?.message || 'unknown'}"`));
      }
    } catch (emailErr) {
      console.error('[withdraw mark-sent email lookup]', emailErr.message);
    }

    // Audit log entry — admin id, withdrawal id, tx hash, timestamp.
    await query(
      `INSERT INTO admin_actions (admin_id, admin_username, action, target_type, target_id, details)
       VALUES ($1, $2, 'withdraw_mark_sent', 'withdraw_request', $3, $4)`,
      [
        req.user.id,
        req.user.username,
        w.id,
        JSON.stringify({
          txHash: txHash || w.tx_hash || null,
          amount: parseInt(w.amount),
          toAddress: w.to_address,
          recipientUserId: w.user_id,
        }),
      ]
    ).catch(e => console.error('[admin_actions log]', e.message));

    res.json({ success: true });
  } catch (err) {
    console.error('[withdraw mark-sent]', err);
    res.status(500).json({ error: 'Mark-sent failed' });
  }
}

// Admin: reject withdraw — refund balance, mark rejected.
router.post('/withdraw/:id/reject', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const { note } = req.body || {};
  try {
    const wr = await query('SELECT * FROM withdraw_requests WHERE id = $1', [req.params.id]);
    if (!wr.rows.length) return res.status(404).json({ error: 'Not found' });
    const w = wr.rows[0];
    // Idempotent guard: only refund withdrawals still in a refundable state.
    // Re-rejecting an already-rejected/completed row would double-refund.
    // 'sending' is NEVER directly refundable: even if tx_hash is null in the
    // DB, the broadcast may have succeeded just before a DB-write fault —
    // refunding here would risk double-pay if the tx later confirms. Admins
    // must first call /admin/payouts/:id/rollback-sending after verifying
    // on-chain that no tx is pending; that endpoint moves the row back to
    // 'approved', which is then refundable through this route.
    if (!['pending', 'approved'].includes(w.status)) {
      return res.status(400).json({
        error: w.status === 'sending'
          ? 'Cannot refund a sending withdrawal directly. Verify on-chain and use rollback-sending first.'
          : `Cannot reject a ${w.status} withdrawal`,
        code: w.status === 'rejected' ? 'ALREADY_REJECTED' : 'NOT_REFUNDABLE',
      });
    }

    await query('BEGIN');
    await query(
      `UPDATE withdraw_requests SET status = 'rejected', admin_note = $1, processed_at = NOW() WHERE id = $2`,
      [note || null, w.id]
    );
    // Refund the reserved balance
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [w.amount, w.user_id]);
    await query(
      "INSERT INTO transactions (user_id, type, amount, description, status) VALUES ($1, $2, $3, $4, $5)",
      [w.user_id, 'refund', w.amount, `Withdrawal #${w.id} rejected — refunded`, 'completed']
    );
    // Scope the transaction-row update to THIS specific withdraw_request only.
    await query("UPDATE transactions SET status = 'rejected' WHERE withdraw_request_id = $1 AND status = 'pending'", [w.id]);
    await query('COMMIT');

    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Rejected', $2)",
      [w.user_id, `Your withdrawal of ${parseInt(w.amount).toLocaleString()} $Pc was rejected and the balance refunded.${note ? ' Reason: ' + note : ''}`]
    );
    res.json({ success: true });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('[withdraw reject]', err);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// Record bet/win transactions
router.post('/transaction', requireAuth, async (req, res) => {
  const { type, amount, game, description } = req.body;
  if (!type || !amount) return res.status(400).json({ error: 'type and amount required' });

  const user = req.user;

  try {
    if (type === 'bet') {
      if (parseInt(user.balance) < amount) return res.status(400).json({ error: 'Insufficient balance' });

      if (parseInt(user.daily_loss_limit) > 0) {
        const todayBets = await query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
           WHERE user_id = $1 AND type = 'bet' AND created_at > NOW() - INTERVAL '24 hours'`,
          [user.id]
        );
        const todayWins = await query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
           WHERE user_id = $1 AND type = 'win' AND created_at > NOW() - INTERVAL '24 hours'`,
          [user.id]
        );
        const netLoss = parseInt(todayBets.rows[0].total) - parseInt(todayWins.rows[0].total);
        if (netLoss + amount > parseInt(user.daily_loss_limit)) {
          return res.status(400).json({ error: 'Daily loss limit reached. Betting blocked until tomorrow.', limitReached: true });
        }
      }

      await query('UPDATE users SET balance = balance - $1, total_wagered = total_wagered + $1 WHERE id = $2', [amount, user.id]);
      processJackpotContribution(user.id, user.username, amount).catch(() => {});
    } else if (type === 'win') {
      await query('UPDATE users SET balance = balance + $1, total_won = total_won + $1 WHERE id = $2', [amount, user.id]);

      const updated = await query('SELECT total_wagered, username, balance FROM users WHERE id = $1', [user.id]);
      const totalWagered = parseInt(updated.rows[0].total_wagered);
      let tier = 'bronze';
      if (totalWagered >= 10_000_000_000) tier = 'diamond';
      else if (totalWagered >= 1_000_000_000) tier = 'platinum';
      else if (totalWagered >= 100_000_000) tier = 'gold';
      else if (totalWagered >= 10_000_000) tier = 'silver';
      await query('UPDATE users SET vip_tier = $1 WHERE id = $2', [tier, user.id]);

      await query(
        `INSERT INTO leaderboard (user_id, username, total_won, balance, games_played, favorite_game)
         SELECT id, username, total_won, balance, 1, $2 FROM users WHERE id = $1
         ON CONFLICT (user_id) DO UPDATE SET
           total_won = leaderboard.total_won + $3,
           balance = EXCLUDED.balance,
           games_played = leaderboard.games_played + 1,
           updated_at = NOW()`,
        [user.id, game || 'unknown', amount]
      );
    }

    const txResult = await query(
      'INSERT INTO transactions (user_id, type, amount, game, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.id, type, amount, game || null, description || null]
    );

    const balResult = await query('SELECT balance FROM users WHERE id = $1', [user.id]);
    res.json({ success: true, transaction: txResult.rows[0], balance: parseInt(balResult.rows[0].balance) });
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

// Get user transactions
// LEFT JOINs withdraw_requests so each withdraw row carries live payout
// state (status, tx_hash, to_address, network) — this powers the player-
// facing live status bar (queued / sending / completed) + Etherscan link
// without needing a separate endpoint or a socket push (Task #94).
router.get('/transactions', requireAuth, async (req, res) => {
  const { type, limit = 100, offset = 0 } = req.query;
  let queryText = `
    SELECT t.*,
           w.status     AS withdraw_status,
           w.tx_hash    AS withdraw_tx_hash,
           w.to_address AS withdraw_to_address,
           w.network    AS withdraw_network,
           w.updated_at AS withdraw_updated_at
      FROM transactions t
      LEFT JOIN withdraw_requests w ON t.withdraw_request_id = w.id
     WHERE t.user_id = $1`;
  const params = [req.user.id];

  if (type && type !== 'all') {
    queryText += ` AND t.type = $${params.length + 1}`;
    params.push(type);
  }

  queryText += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const result = await query(queryText, params);
    res.json({ transactions: result.rows.map(t => ({ ...t, amount: parseInt(t.amount) })) });
  } catch (err) {
    console.error('[GET /transactions]', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Confirms that `senderAddress` (the on-chain tx 'from') belongs to the user.
// Matches against any wallet linked to the user (case-insensitive). Returns
// false when no wallets are linked or the sender doesn't match — in which case
// the deposit must be routed to manual admin review, never auto-credited.
async function _verifyDepositOwnership(userId, senderAddress) {
  if (!senderAddress) return false;
  try {
    const r = await query(
      'SELECT wallet_address FROM user_wallets WHERE user_id = $1',
      [userId]
    );
    if (!r.rows.length) return false;
    const sender = senderAddress.toLowerCase();
    return r.rows.some(row => (row.wallet_address || '').toLowerCase() === sender);
  } catch (err) {
    console.error('[deposit ownership check]', err.message);
    return false;
  }
}

// ---- Background re-verification of pending deposits ----
// Deposits that arrived on-chain but were under MIN_CONFIRMATIONS at submit
// time stay status='pending' with a tx_hash. This worker rescans them every
// minute so they auto-credit once confirmed without admin intervention.
async function _recheckPendingDeposits() {
  if (isDemoMode()) return;
  const ethConfigured = !!(DEPOSIT_ADDRESS && process.env.PC_TOKEN_CONTRACT);
  const solConfigured = isSolanaDepositConfigured();
  if (!ethConfigured && !solConfigured) return;
  try {
    const rows = await query(
      `SELECT * FROM deposit_requests
       WHERE status = 'pending' AND tx_hash IS NOT NULL
         AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at ASC LIMIT 25`
    );
    for (const d of rows.rows) {
      try {
        const rowIsSol = isSolanaNetwork(d.network);
        // Skip rows whose rail isn't configured — they stay pending for
        // admin attention rather than being silently rejected.
        if (rowIsSol ? !solConfigured : !ethConfigured) continue;
        const verdict = rowIsSol
          ? await verifySolanaDeposit({ signature: d.tx_hash, expectedTokens: d.amount })
          : await verifyOnChainDeposit({
              txHash: d.tx_hash,
              expectedTokens: d.amount,
              treasury: DEPOSIT_ADDRESS,
              contract: process.env.PC_TOKEN_CONTRACT,
            });
        if (verdict.status === 'confirmed') {
          // Same ownership binding as the sync path — never auto-credit a
          // sender that isn't a linked wallet for this user.
          const ownershipOk = await _verifyDepositOwnership(d.user_id, verdict.fromAddress);
          if (!ownershipOk) {
            await query(
              `UPDATE deposit_requests SET status = 'needs_review', from_address = $1,
                     admin_note = $2, processed_at = NOW() WHERE id = $3`,
              [verdict.fromAddress || null, `Sender ${verdict.fromAddress} is not a linked wallet — admin review required.`, d.id]
            );
            await query(
              "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Needs Review', $2)",
              [d.user_id, 'On-chain tx confirmed but sender wallet is not linked to your account. Admin review pending.']
            );
          } else {
            await _creditDepositRow(d, { status: 'auto_credited', descriptionPrefix: 'Auto-credited (recheck)' });
          }
        } else if (verdict.status === 'rejected') {
          await query(
            `UPDATE deposit_requests SET status = 'auto_rejected', admin_note = $1, processed_at = NOW() WHERE id = $2`,
            [verdict.reason, d.id]
          );
          await query(
            "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Rejected', $2)",
            [d.user_id, `Your deposit was rejected on rescan: ${verdict.reason}`]
          );
        } else if (verdict.status === 'pending') {
          await query(
            `UPDATE deposit_requests SET admin_note = $1, updated_at = NOW() WHERE id = $2`,
            [`Awaiting confirmations (${verdict.confirmations}/${verdict.required})`, d.id]
          );
        }
        // 'needs_review' → leave as-is for admin attention
      } catch (innerErr) {
        console.error('[deposit recheck row]', d.id, innerErr.message);
      }
    }
  } catch (err) {
    console.error('[deposit recheck]', err.message);
  }
}
// Kick off interval — non-blocking, swallows its own errors.
setInterval(() => { _recheckPendingDeposits().catch(() => {}); }, 60_000);

// Get pending deposit/withdraw requests (admin)
router.get('/admin/deposits', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const result = await query(
    `SELECT d.*, u.username, u.email FROM deposit_requests d
     JOIN users u ON d.user_id = u.id
     ORDER BY d.created_at DESC LIMIT 50`
  );
  res.json({ deposits: result.rows });
});

router.get('/admin/withdrawals', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const result = await query(
    `SELECT w.*, u.username, u.email FROM withdraw_requests w
     JOIN users u ON w.user_id = u.id
     ORDER BY
       CASE w.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
       w.created_at DESC
     LIMIT 100`
  );
  res.json({ withdrawals: result.rows });
});

export default router;
