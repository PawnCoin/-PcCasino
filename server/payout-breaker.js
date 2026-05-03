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
import { getOnChainPcBalance, getPayoutAddress } from './payout-signer.js';

const FLAG_TRIPPED = 'payout_breaker_tripped';
const FLAG_REASON  = 'payout_breaker_reason';
const FLAG_FAILS   = 'payout_breaker_consecutive_failures';
const FLAG_RESET   = 'payout_breaker_last_reset_at';

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
    await _notifyAdminsOfTrip(reason).catch(e => console.error('[PayoutBreaker] admin notify failed:', e.message));
  }
}

// High-priority dashboard notification + email-to-admins broadcast when the
// breaker first trips. Notifications appear in the bell icon for every admin
// account; emails are best-effort. Never throws — failure here must not
// block subsequent breaker bookkeeping.
async function _notifyAdminsOfTrip(reason) {
  const admins = await query(
    `SELECT id, email, username, email_unsubscribed FROM users WHERE is_admin = TRUE`,
  ).catch(() => ({ rows: [] }));
  const title = '🚨 Payout Breaker TRIPPED';
  const message = `Auto-payouts are PAUSED. Reason: ${reason || 'unknown'}. Visit Admin → Payments → Payout System Health to investigate and reset.`;
  for (const a of admins.rows) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'admin_alert', $2, $3)`,
      [a.id, title, message],
    ).catch(() => {});
  }
  // High-visibility server log so on-call engineers see this even without
  // the dashboard. The dashboard notifications above are the primary
  // user-facing channel; email is intentionally omitted to keep this module
  // dependency-free and avoid SMTP rate-limit blowback during incidents.
  console.error(`[PayoutBreaker] ALERT broadcast to ${admins.rows.length} admin(s): ${reason}`);
}

export async function resetBreaker(adminUsername = null) {
  await _setFlag(FLAG_TRIPPED, '0');
  await _setFlag(FLAG_REASON, null);
  await _setFlag(FLAG_FAILS, '0');
  await _setFlag(FLAG_RESET, new Date().toISOString());
  console.log(`[PayoutBreaker] reset by ${adminUsername || 'system'}`);
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
