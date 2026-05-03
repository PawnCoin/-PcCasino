// Circuit breaker for automatic on-chain $Pc payouts.
//
// Trips when ANY of the following are true:
//   - Hot-wallet balance < BREAKER_FLOOR (default 20,000,000,000 = 20B $Pc)
//   - 1h burst > BREAKER_BURST_1H        (default 5,000,000,000  = 5B $Pc)
//   - 24h send total > BREAKER_LIMIT_24H (default 20,000,000,000 = 20B $Pc)
//   - Single payout > BREAKER_SINGLE_MAX (default 2,000,000,000  = 2B $Pc)
//   - 3 consecutive on-chain send failures
//
// State (tripped flag + reason + consecutive_failures + last_reset_at) is
// persisted in the existing `system_flags` key/value table so it survives
// restarts. Daily / hourly windows are recomputed live from `payout_log`.

import { query } from './db.js';
import { getOnChainPcBalance, getNativeBalance, getPayoutAddress } from './payout-signer.js';
import { sendPayoutBreakerTrippedEmail, sendPayoutBreakerAutoRecoveredEmail, sendPayoutBreakerResolvedEmail } from './email.js';

const FLAG_TRIPPED   = 'payout_breaker_tripped';
const FLAG_REASON    = 'payout_breaker_reason';
const FLAG_FAILS     = 'payout_breaker_consecutive_failures';
const FLAG_RESET     = 'payout_breaker_last_reset_at';
// Wall-clock timestamp the *current* trip event happened (cleared on reset).
// Used to (a) dedupe the initial alert email so we send at most one per trip,
// and (b) decide when the 1h follow-up alert is due.
const FLAG_TRIPPED_AT       = 'payout_breaker_tripped_at';
const FLAG_FOLLOWUP_SENT_AT = 'payout_breaker_followup_sent_at';

const FOLLOWUP_DELAY_MS = parseInt(process.env.PAYOUT_BREAKER_FOLLOWUP_MS || String(60 * 60 * 1000), 10);

// Read first non-empty env var from a list of names. Lets us honor the
// task-spec env names (PAYOUT_*_PC) while still accepting older BREAKER_*
// names that operators may already have configured.
function envBig(names, def) {
  for (const n of names) {
    const raw = process.env[n];
    if (raw == null || raw === '') continue;
    try { const v = BigInt(raw); if (v > 0n) return v; } catch { /* fall through */ }
  }
  return BigInt(def);
}

export function breakerLimits() {
  return {
    floor:     envBig(['PAYOUT_FLOOR_PC',        'BREAKER_FLOOR'],     '20000000000'),
    burst1h:   envBig(['PAYOUT_BURST_LIMIT_PC',  'BREAKER_BURST_1H'],   '5000000000'),
    limit24h:  envBig(['PAYOUT_DAILY_LIMIT_PC',  'BREAKER_LIMIT_24H'], '20000000000'),
    singleMax: envBig(['PAYOUT_SINGLE_MAX_PC',   'BREAKER_SINGLE_MAX'], '2000000000'),
    maxConsecutiveFailures: parseInt(process.env.PAYOUT_MAX_CONSECUTIVE_FAILURES || process.env.BREAKER_MAX_FAILS || '3', 10),
  };
}

async function _getFlag(key) {
  const r = await query('SELECT value FROM system_flags WHERE key = $1', [key]).catch(() => null);
  return r?.rows?.[0]?.value ?? null;
}
async function _setFlag(key, value) {
  await query(
    `INSERT INTO system_flags (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value === null ? null : String(value)],
  );
}

export async function isTripped() {
  const v = await _getFlag(FLAG_TRIPPED);
  return v === '1' || v === 'true';
}

export async function getBreakerState() {
  const [tripped, reason, failsRaw, lastReset] = await Promise.all([
    isTripped(),
    _getFlag(FLAG_REASON),
    _getFlag(FLAG_FAILS),
    _getFlag(FLAG_RESET),
  ]);
  return {
    tripped,
    reason: reason || null,
    consecutiveFailures: parseInt(failsRaw || '0', 10),
    lastResetAt: lastReset || null,
    limits: Object.fromEntries(
      Object.entries(breakerLimits()).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v]),
    ),
  };
}

export async function tripBreaker(reason) {
  // Read prior state first so we only fire admin alerts on the *transition*
  // from clear → tripped (no spam if preflight checks the breaker on every
  // queued withdrawal while it's already open).
  const wasAlreadyTripped = await isTripped();
  await _setFlag(FLAG_TRIPPED, '1');
  await _setFlag(FLAG_REASON, reason || 'Manual trip');
  console.warn('[PayoutBreaker] TRIPPED:', reason);
  if (!wasAlreadyTripped) {
    // Stamp the trip timestamp + clear any prior follow-up marker so the
    // 1h re-alert checker treats this as a fresh event.
    const trippedAt = new Date().toISOString();
    await _setFlag(FLAG_TRIPPED_AT, trippedAt);
    await _setFlag(FLAG_FOLLOWUP_SENT_AT, null);
    await _notifyAdminsOfTrip(reason, { trippedAt, followup: false })
      .catch(e => console.error('[PayoutBreaker] admin notify failed:', e.message));
  }
}

// Best-effort hot-wallet snapshot for the alert email. Returns nulls on RPC
// outage rather than throwing — the alert must always go out.
async function _safeWalletSnapshot() {
  let pc = null, eth = null;
  if (getPayoutAddress()) {
    try { pc = (await getOnChainPcBalance()).toString(); } catch (_) {}
    try { eth = (await getNativeBalance()).toString(); } catch (_) {}
  }
  return { pc, eth };
}

// High-priority dashboard notification + email-to-admins broadcast when the
// breaker trips (or remains tripped 1h later). Notifications appear in the
// bell icon for every admin account; emails are best-effort. Never throws —
// failure here must not block subsequent breaker bookkeeping.
async function _notifyAdminsOfTrip(reason, { trippedAt = null, followup = false } = {}) {
  const admins = await query(
    `SELECT id, email, username, email_unsubscribed FROM users WHERE is_admin = TRUE`,
  ).catch(() => ({ rows: [] }));
  // Snapshot hot-wallet balances up front so both the in-app notification
  // and the email carry the same numbers (admins need the balance to decide
  // whether to refill, not just the reason — see task #92 acceptance).
  const snap = await _safeWalletSnapshot();
  const fmtPc = (s) => {
    if (s === null || s === undefined || s === '') return 'unknown';
    try { return BigInt(s).toLocaleString() + ' $Pc'; } catch { return String(s); }
  };
  const fmtEth = (s) => {
    if (s === null || s === undefined || s === '') return 'unknown';
    try { return (Number(BigInt(s)) / 1e18).toFixed(4) + ' ETH'; } catch { return String(s); }
  };
  const balanceLine = `Hot wallet: ${fmtPc(snap.pc)} / ${fmtEth(snap.eth)}.`;
  const title = followup
    ? '⏰ Payout Breaker still tripped (1h)'
    : '🚨 Payout Breaker TRIPPED';
  const lead = followup
    ? `Auto-payouts have been PAUSED for 1 hour.`
    : `Auto-payouts are PAUSED.`;
  const message = `${lead} Reason: ${reason || 'unknown'}. ${balanceLine} Visit Admin → Payments → Payout System Health to investigate and reset.`;
  for (const a of admins.rows) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'admin_alert', $2, $3)`,
      [a.id, title, message],
    ).catch(() => {});
  }
  // Email — fire-and-forget per admin so a slow SMTP server doesn't stall
  // the trip path. We deliberately ignore email_unsubscribed here: this is
  // an operational alert tied to the admin role, not a marketing message.
  for (const a of admins.rows) {
    if (!a.email) continue;
    sendPayoutBreakerTrippedEmail(a.email, {
      reason, hotPcBalance: snap.pc, hotEthBalance: snap.eth, trippedAt, followup,
    }).catch(e => console.error(`[PayoutBreaker] email to ${a.email} failed:`, e?.message));
  }
  console.error(`[PayoutBreaker] ALERT broadcast (${followup ? 'followup' : 'initial'}) to ${admins.rows.length} admin(s): ${reason}`);
}

// Periodic checker: if the breaker has been tripped for >= FOLLOWUP_DELAY_MS
// and we haven't already sent the follow-up, fire the second alert. Idempotent
// across invocations and process restarts thanks to FLAG_FOLLOWUP_SENT_AT.
// Safe to call frequently (every few minutes) — does nothing once the
// follow-up has fired or the breaker is reset.
export async function checkBreakerFollowupAlert() {
  if (!(await isTripped())) return { skipped: 'not_tripped' };
  const trippedAtRaw = await _getFlag(FLAG_TRIPPED_AT);
  if (!trippedAtRaw) return { skipped: 'no_trip_timestamp' };
  if (await _getFlag(FLAG_FOLLOWUP_SENT_AT)) return { skipped: 'followup_already_sent' };
  const trippedAtMs = Date.parse(trippedAtRaw);
  if (!Number.isFinite(trippedAtMs)) return { skipped: 'bad_trip_timestamp' };
  if (Date.now() - trippedAtMs < FOLLOWUP_DELAY_MS) return { skipped: 'too_early' };
  const reason = await _getFlag(FLAG_REASON);
  // Only mark FLAG_FOLLOWUP_SENT_AT *after* the notification path resolves —
  // if user-lookup or notification insertion throws, we leave the flag clear
  // so the next 5-minute tick retries. Otherwise a transient DB blip during
  // the 1h tick would permanently suppress the second alert for this trip.
  try {
    await _notifyAdminsOfTrip(reason, { trippedAt: trippedAtRaw, followup: true });
  } catch (e) {
    console.error('[PayoutBreaker] followup notify failed (will retry next tick):', e.message);
    return { error: e.message, willRetry: true };
  }
  await _setFlag(FLAG_FOLLOWUP_SENT_AT, new Date().toISOString());
  return { sent: true };
}

// Auto-recover checker: if the breaker tripped solely on a balance/floor
// condition and the hot wallet has since been refilled comfortably above the
// floor (with a safety margin to avoid flapping), AND there are no recent
// consecutive send failures, reset the breaker automatically and notify
// admins. Trips for non-balance reasons (consecutive failures, single payout
// limit, 1h burst, 24h cap) are intentionally NOT auto-resettable — those
// represent decisions that need a human review before resuming.
//
// Idempotent and cheap when the breaker is clear (one system_flags read).
// Safe to call from the same scheduler tick as the followup checker.
export async function checkBreakerAutoRecover() {
  if (!(await isTripped())) return { skipped: 'not_tripped' };
  const reason = await _getFlag(FLAG_REASON);
  // Both BELOW_FLOOR and INSUFFICIENT_HOT_WALLET trips stamp the reason
  // with a "Hot-wallet balance ..." prefix in tripBreaker callsites above.
  if (!reason || !/^Hot-wallet balance /.test(reason)) {
    return { skipped: 'non_balance_reason', reason };
  }
  // Require a clean failure counter — task spec says "no recent failures",
  // not just "below the trip threshold". Any pending failure means the last
  // send attempt didn't succeed, so a human should look before we resume.
  const fails = parseInt((await _getFlag(FLAG_FAILS)) || '0', 10);
  const limits = breakerLimits();
  if (fails > 0) {
    return { skipped: 'recent_failures', fails };
  }
  if (!getPayoutAddress()) return { skipped: 'no_payout_address' };
  let balance;
  try {
    balance = await getOnChainPcBalance();
  } catch (e) {
    return { skipped: 'balance_check_failed', error: e.message };
  }
  // Require the balance to be at least 10% above the floor so a wallet
  // sitting *exactly* at the floor doesn't repeatedly auto-reset and
  // re-trip on the next preflight.
  const safeFloor = limits.floor + (limits.floor / 10n);
  if (balance < safeFloor) {
    return { skipped: 'below_safe_floor', balance: balance.toString(), safeFloor: safeFloor.toString() };
  }
  const trippedAtRaw = await _getFlag(FLAG_TRIPPED_AT);
  await resetBreaker('auto-recover');
  await _notifyAdminsOfAutoRecover({
    priorReason: reason,
    balance: balance.toString(),
    floor: limits.floor.toString(),
    trippedAt: trippedAtRaw,
  }).catch(e => console.error('[PayoutBreaker] auto-recover notify failed:', e.message));
  return { recovered: true, balance: balance.toString(), priorReason: reason };
}

// Dashboard notification + email broadcast when the breaker auto-resets after
// the hot wallet is refilled. Mirrors `_notifyAdminsOfTrip` so admins see a
// matching "good news" entry alongside the original alert.
async function _notifyAdminsOfAutoRecover({ priorReason, balance, floor, trippedAt }) {
  const admins = await query(
    `SELECT id, email FROM users WHERE is_admin = TRUE`,
  ).catch(() => ({ rows: [] }));
  const ethSnap = await _safeWalletSnapshot();
  const fmtPc = (s) => {
    if (s === null || s === undefined || s === '') return 'unknown';
    try { return BigInt(s).toLocaleString() + ' $Pc'; } catch { return String(s); }
  };
  const title = '✅ Payout Breaker auto-recovered';
  const message = `Hot wallet refilled to ${fmtPc(balance)} (floor ${fmtPc(floor)}). Auto-payouts have RESUMED. Original trip: ${priorReason || 'unknown'}.`;
  for (const a of admins.rows) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'admin_alert', $2, $3)`,
      [a.id, title, message],
    ).catch(() => {});
  }
  for (const a of admins.rows) {
    if (!a.email) continue;
    sendPayoutBreakerAutoRecoveredEmail(a.email, {
      priorReason, hotPcBalance: balance, hotEthBalance: ethSnap.eth, floor, trippedAt,
    }).catch(e => console.error(`[PayoutBreaker] auto-recover email to ${a.email} failed:`, e?.message));
  }
  console.log(`[PayoutBreaker] AUTO-RECOVERED, broadcast to ${admins.rows.length} admin(s). Balance ${balance}, prior reason: ${priorReason}`);
}

export async function resetBreaker(adminUsername = null) {
  // Snapshot prior state BEFORE we clear the flags so the "Payouts resumed"
  // notification can show the original trip reason and trip timestamp.
  // Also gates the notification: if the breaker wasn't actually tripped
  // (e.g. an admin double-clicks Reset, or the auto-recover path beat the
  // admin to it) we skip the broadcast entirely — no spam.
  const wasTripped = await isTripped();
  const priorReason = wasTripped ? await _getFlag(FLAG_REASON) : null;
  const trippedAt   = wasTripped ? await _getFlag(FLAG_TRIPPED_AT) : null;

  await _setFlag(FLAG_TRIPPED, '0');
  await _setFlag(FLAG_REASON, null);
  await _setFlag(FLAG_FAILS, '0');
  const resetAt = new Date().toISOString();
  await _setFlag(FLAG_RESET, resetAt);
  // Clear trip-event markers so the next trip is treated as a fresh event
  // (initial alert fires + 1h followup window restarts).
  await _setFlag(FLAG_TRIPPED_AT, null);
  await _setFlag(FLAG_FOLLOWUP_SENT_AT, null);
  console.log(`[PayoutBreaker] reset by ${adminUsername || 'system'}`);

  // The auto-recover path calls resetBreaker('auto-recover') and then sends
  // its own dedicated "auto-recovered" email/notification — don't double up.
  // Only the manual admin reset path triggers the "Payouts resumed" closing
  // notification (Task #96).
  if (wasTripped && adminUsername !== 'auto-recover') {
    await _notifyAdminsOfResolved({
      resetBy: adminUsername || 'system',
      resetAt,
      priorReason,
      trippedAt,
    }).catch(e => console.error('[PayoutBreaker] resolved notify failed:', e.message));
  }
}

// Dashboard notification + email broadcast when an admin manually resets
// the breaker. Mirrors `_notifyAdminsOfTrip` so admins see a matching
// "good news" entry alongside the original alert. Never throws.
async function _notifyAdminsOfResolved({ resetBy, resetAt, priorReason, trippedAt }) {
  const admins = await query(
    `SELECT id, email FROM users WHERE is_admin = TRUE`,
  ).catch(() => ({ rows: [] }));
  const whenStr = resetAt ? new Date(resetAt).toUTCString() : 'just now';
  const title = '✅ Payouts resumed';
  const message = `Payout breaker reset by ${resetBy || 'admin'} at ${whenStr}. Auto-payouts have RESUMED.${priorReason ? ` Original trip: ${priorReason}.` : ''}`;
  for (const a of admins.rows) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'admin_alert', $2, $3)`,
      [a.id, title, message],
    ).catch(() => {});
  }
  for (const a of admins.rows) {
    if (!a.email) continue;
    sendPayoutBreakerResolvedEmail(a.email, { resetBy, resetAt, priorReason, trippedAt })
      .catch(e => console.error(`[PayoutBreaker] resolved email to ${a.email} failed:`, e?.message));
  }
  console.log(`[PayoutBreaker] RESOLVED broadcast to ${admins.rows.length} admin(s) by ${resetBy}`);
}

export async function recordSuccess() {
  await _setFlag(FLAG_FAILS, '0');
}

export async function recordFailure(reason) {
  const cur = parseInt((await _getFlag(FLAG_FAILS)) || '0', 10);
  const next = cur + 1;
  await _setFlag(FLAG_FAILS, String(next));
  const { maxConsecutiveFailures } = breakerLimits();
  if (next >= maxConsecutiveFailures) {
    await tripBreaker(`${next} consecutive send failures: ${reason || 'unknown'}`);
  }
  return next;
}

// Returns { ok: true } if allowed, otherwise { ok: false, reason, code }.
// Performs amount/window/floor checks; auto-trips the breaker on hard violations.
export async function preflight({ amount }) {
  const amt = typeof amount === 'bigint' ? amount : BigInt(amount);
  const limits = breakerLimits();

  if (await isTripped()) {
    const reason = await _getFlag(FLAG_REASON);
    return { ok: false, code: 'BREAKER_TRIPPED', reason: reason || 'Breaker is tripped' };
  }

  if (amt > limits.singleMax) {
    await tripBreaker(`Single payout ${amt.toString()} exceeds limit ${limits.singleMax.toString()}`);
    return { ok: false, code: 'SINGLE_MAX_EXCEEDED', reason: `Single payout exceeds limit (${limits.singleMax.toString()} $Pc)` };
  }

  // Hot-wallet floor check (live RPC). Fail-closed on RPC outage.
  if (getPayoutAddress()) {
    let balance = null;
    try { balance = await getOnChainPcBalance(); } catch (e) { return { ok: false, code: 'BALANCE_CHECK_FAILED', reason: e.message }; }
    if (balance === null) return { ok: false, code: 'BALANCE_UNAVAILABLE', reason: 'Could not read hot-wallet balance' };
    if (balance < limits.floor) {
      await tripBreaker(`Hot-wallet balance ${balance.toString()} below floor ${limits.floor.toString()}`);
      return { ok: false, code: 'BELOW_FLOOR', reason: `Hot-wallet balance ${balance.toString()} below floor` };
    }
    if (balance < amt) {
      await tripBreaker(`Hot-wallet balance ${balance.toString()} insufficient for payout ${amt.toString()}`);
      return { ok: false, code: 'INSUFFICIENT_HOT_WALLET', reason: 'Hot-wallet balance insufficient' };
    }
  }

  const r1h = await query(
    `SELECT COALESCE(SUM(amount), 0)::text AS total FROM payout_log
       WHERE status = 'sent' AND created_at > NOW() - INTERVAL '1 hour'`,
  ).catch(() => null);
  const burst = BigInt(r1h?.rows?.[0]?.total || '0') + amt;
  if (burst > limits.burst1h) {
    await tripBreaker(`1h burst ${burst.toString()} exceeds limit ${limits.burst1h.toString()}`);
    return { ok: false, code: 'BURST_1H_EXCEEDED', reason: `1h burst limit reached (${limits.burst1h.toString()} $Pc)` };
  }

  const r24 = await query(
    `SELECT COALESCE(SUM(amount), 0)::text AS total FROM payout_log
       WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours'`,
  ).catch(() => null);
  const day = BigInt(r24?.rows?.[0]?.total || '0') + amt;
  if (day > limits.limit24h) {
    await tripBreaker(`24h total ${day.toString()} exceeds limit ${limits.limit24h.toString()}`);
    return { ok: false, code: 'LIMIT_24H_EXCEEDED', reason: `24h limit reached (${limits.limit24h.toString()} $Pc)` };
  }

  return { ok: true };
}

export async function getWindowTotals() {
  const r = await query(
    `SELECT
       -- Each broadcast writes exactly one 'sent' row. Counting only 'sent'
       -- (not the later 'confirmed' row for the same withdrawal) avoids
       -- double-counting in rate-limit windows and the admin health panel.
       COALESCE(SUM(amount) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '1 hour'), 0)::text  AS h1,
       COALESCE(SUM(amount) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours'), 0)::text AS h24,
       COUNT(*) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours')::int AS count_24h
       FROM payout_log`,
  ).catch(() => null);
  return {
    burst1h: r?.rows?.[0]?.h1 || '0',
    sent24h: r?.rows?.[0]?.h24 || '0',
    count24h: r?.rows?.[0]?.count_24h || 0,
  };
}
