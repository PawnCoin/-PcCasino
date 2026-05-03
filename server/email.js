import nodemailer from 'nodemailer';
import { createHmac } from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET;
if (!UNSUBSCRIBE_SECRET) {
  console.warn('[Email] WARNING: UNSUBSCRIBE_SECRET env var is not set — unsubscribe links will not work securely. Set UNSUBSCRIBE_SECRET in environment secrets.');
}

// Canonical operator domain. The legacy fallback used `pcasino.com` (a typo —
// nobody owns that domain), which caused every welcome/verification email to
// bounce back to the operator with a "mail daemon" failure. The real domain
// is `pccasino.online`. Do NOT change this back to `pcasino.com`.
const CANONICAL_FROM_ADDRESS = 'noreply@pccasino.online';
const CANONICAL_FROM = `$Pc Casino <${CANONICAL_FROM_ADDRESS}>`;

// Cached SMTP state (populated by initEmail() at boot)
let cachedTransporter = null;
let smtpReady = false;
let smtpStatusReason = 'not initialized';
let effectiveFromHeader = CANONICAL_FROM;
let effectiveReplyTo = null;

// Per-day counters (rotates daily on first send after midnight UTC)
let counterDay = null;
let sentCount = 0;
let failedCount = 0;

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function rotateCountersIfNeeded() {
  const today = todayUTC();
  if (counterDay && counterDay !== today) {
    console.log(`[Email] Daily counters for ${counterDay}: sent=${sentCount}, failed=${failedCount}`);
    sentCount = 0;
    failedCount = 0;
  }
  counterDay = today;
}

function bumpSent() { rotateCountersIfNeeded(); sentCount++; }
function bumpFailed() { rotateCountersIfNeeded(); failedCount++; }

export function getEmailCounters() {
  rotateCountersIfNeeded();
  return { day: counterDay, sent: sentCount, failed: failedCount };
}

// Snapshot the current (about-to-end) day's counters, log them as the
// authoritative "previous day" line, and reset for the new day. Called by
// the nightly scheduler in server/index.js.
export function flushDailyCounters() {
  const day = counterDay || todayUTC();
  const sent = sentCount;
  const failed = failedCount;
  console.log(`[Email] Nightly counters: day=${day} sent=${sent} failed=${failed}`);
  sentCount = 0;
  failedCount = 0;
  counterDay = todayUTC();
  return { day, sent, failed };
}

export function getEmailStatus() {
  return {
    ready: smtpReady,
    reason: smtpStatusReason,
    from: effectiveFromHeader,
    replyTo: effectiveReplyTo,
    counters: getEmailCounters(),
  };
}

function parseDomain(addr) {
  if (!addr) return null;
  // Handle "Display Name <user@domain>" or bare "user@domain"
  const m = String(addr).match(/<([^>]+)>|([^\s<>]+@[^\s<>]+)/);
  const email = m ? (m[1] || m[2]) : null;
  if (!email) return null;
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : null;
}

function buildTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// Resolve the From / Reply-To headers, honoring SPF/DKIM-domain alignment.
// If SMTP_FROM's domain doesn't match the SMTP-authenticated user's domain,
// the relay (Hostinger, etc.) will reject the message — so we fall back to
// SMTP_USER for From: and put the friendly canonical address in Reply-To.
function resolveFromHeaders() {
  const smtpUser = process.env.SMTP_USER || null;
  const smtpFrom = process.env.SMTP_FROM || CANONICAL_FROM;
  const fromDomain = parseDomain(smtpFrom);
  const userDomain = parseDomain(smtpUser);

  if (!smtpUser) {
    // No SMTP configured; nothing meaningful to log
    return { from: smtpFrom, replyTo: null, substituted: false };
  }
  if (!fromDomain || !userDomain || fromDomain === userDomain) {
    return { from: smtpFrom, replyTo: null, substituted: false };
  }
  // Mismatch — fall back to SMTP_USER for From: to satisfy SPF/DKIM
  const fallbackFrom = `$Pc Casino <${smtpUser}>`;
  return { from: fallbackFrom, replyTo: CANONICAL_FROM_ADDRESS, substituted: true, fromDomain, userDomain };
}

// One-time boot initialization: build transporter, run verify(), log a single
// status line, cache result for callers via getEmailStatus().
export async function initEmail() {
  const t = buildTransporter();
  if (!t) {
    smtpReady = false;
    smtpStatusReason = 'SMTP_USER or SMTP_PASS not set';
    console.warn('[Email] DISABLED: ' + smtpStatusReason + ' — outbound email will not be sent.');
    return;
  }
  cachedTransporter = t;

  const headers = resolveFromHeaders();
  effectiveFromHeader = headers.from;
  effectiveReplyTo = headers.replyTo;
  if (headers.substituted) {
    console.warn(`[Email] From-domain mismatch: SMTP_FROM uses "${headers.fromDomain}" but SMTP_USER uses "${headers.userDomain}". Falling back to From: ${effectiveFromHeader}, Reply-To: ${effectiveReplyTo}`);
  }

  try {
    await t.verify();
    smtpReady = true;
    smtpStatusReason = 'verified';
    console.log(`[Email] READY: SMTP verified. From: ${effectiveFromHeader}${effectiveReplyTo ? ` Reply-To: ${effectiveReplyTo}` : ''}`);
  } catch (err) {
    smtpReady = false;
    smtpStatusReason = `verify failed: ${err.message}`;
    console.error('[Email] DISABLED: SMTP verify failed —', err.message);
  }
}

export function isEmailReady() {
  return smtpReady;
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  // Lazy fallback for code paths that send before initEmail() ran
  cachedTransporter = buildTransporter();
  if (cachedTransporter) {
    const headers = resolveFromHeaders();
    effectiveFromHeader = headers.from;
    effectiveReplyTo = headers.replyTo;
  }
  return cachedTransporter;
}

const SITE_URL = process.env.SITE_URL || 'https://pccasino.online';

export function generateUnsubscribeToken(email) {
  if (!UNSUBSCRIBE_SECRET) return null;
  return createHmac('sha256', UNSUBSCRIBE_SECRET).update(email).digest('hex');
}

function getUnsubscribeUrl(email) {
  const token = generateUnsubscribeToken(email);
  return `${SITE_URL}/api/auth/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

function emailFooter(email) {
  const unsubUrl = UNSUBSCRIBE_SECRET ? getUnsubscribeUrl(email) : null;
  const unsubLine = unsubUrl
    ? `<br><a href="${unsubUrl}" style="color:#888;text-decoration:underline;">Unsubscribe from emails</a>`
    : '';
  return `
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #222;text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">
        You're receiving this because you have an account at $Pc Casino.${unsubLine}
      </p>
    </div>
  `;
}

function emailWrapper(content, email) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#050505;">
      <div style="background:#0a0a0a;color:#fff;padding:40px 32px;font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #D4AF37;border-radius:8px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">$Pc Casino</h1>
          <p style="color:#888;font-size:12px;margin:4px 0 0;">The Premier Crypto Casino</p>
        </div>
        ${content}
        ${email ? emailFooter(email) : ''}
      </div>
    </body>
    </html>
  `;
}

// Centralized send wrapper: structured per-send logging + counters.
// Callers should `await sendMail(...)` and handle the boolean if they care.
async function sendMail({ to, subject, html, label }) {
  const transporter = getTransporter();
  if (!transporter) {
    bumpFailed();
    console.warn(`[Email:${label}] SKIPPED to=${to} reason="SMTP not configured"`);
    return { ok: false, skipped: true, reason: smtpStatusReason };
  }
  const mail = { from: effectiveFromHeader, to, subject, html };
  if (effectiveReplyTo) mail.replyTo = effectiveReplyTo;
  try {
    const info = await transporter.sendMail(mail);
    bumpSent();
    console.log(`[Email:${label}] SENT to=${to} messageId=${info.messageId || '-'} response="${(info.response || '').slice(0, 120)}"`);
    return { ok: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    bumpFailed();
    const code = err.responseCode || err.code || '-';
    const reason = (err.response || err.message || 'unknown').slice(0, 200);
    console.error(`[Email:${label}] FAILED to=${to} code=${code} reason="${reason}"`);
    return { ok: false, code, reason };
  }
}

export async function sendVerificationEmail(to, username, token) {
  const verifyUrl = `${SITE_URL}/api/auth/verify-email?token=${token}`;
  const content = `
    <h2 style="color:#fff;margin:0 0 16px;">Welcome, ${username}!</h2>
    <p style="color:#ccc;line-height:1.6;">Click the button below to verify your email address and unlock your full account.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="background:#D4AF37;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Verify Email
      </a>
    </div>
    <p style="color:#555;font-size:12px;">Link expires in 24 hours. If you didn't create this account, ignore this email.</p>
  `;
  return sendMail({ to, subject: 'Verify your $Pc Casino account', html: emailWrapper(content, to), label: 'verify' });
}

export async function sendWelcomeEmail(to, username) {
  const content = `
    <h2 style="color:#D4AF37;margin:0 0 16px;">You're in, ${username}!</h2>
    <p style="color:#ccc;line-height:1.6;">Your account is verified and your starting balance is ready:</p>
    <div style="background:#111;border:1px solid #D4AF37;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
      <p style="color:#888;font-size:14px;margin:0 0 4px;">Starting Balance</p>
      <p style="color:#D4AF37;font-size:28px;font-weight:bold;margin:0;">1,000,000,000 $Pc</p>
    </div>
    <p style="color:#ccc;line-height:1.6;">Available games: <strong style="color:#D4AF37;">Poker, Blackjack, Roulette, Craps, Slots, Spades, Bingo, Dominoes</strong> and more.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${SITE_URL}" style="background:#D4AF37;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Start Playing Now
      </a>
    </div>
  `;
  return sendMail({ to, subject: 'Welcome to $Pc Casino — Your 1B $Pc bonus is ready!', html: emailWrapper(content, to), label: 'welcome' });
}

export async function sendDepositConfirmationEmail(to, username, amount) {
  const content = `
    <h2 style="color:#fff;margin:0 0 16px;">Deposit Confirmed</h2>
    <p style="color:#ccc;line-height:1.6;">Hi ${username}, your deposit has been approved and credited to your account.</p>
    <div style="background:#111;border:1px solid #2d8a4e;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
      <p style="color:#888;font-size:14px;margin:0 0 4px;">Amount Credited</p>
      <p style="color:#2ecc71;font-size:28px;font-weight:bold;margin:0;">+${parseInt(amount).toLocaleString()} $Pc</p>
    </div>
    <p style="color:#ccc;line-height:1.6;">Your balance has been updated. Happy playing!</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${SITE_URL}" style="background:#D4AF37;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Play Now
      </a>
    </div>
  `;
  return sendMail({ to, subject: `Deposit of ${parseInt(amount).toLocaleString()} $Pc confirmed`, html: emailWrapper(content, to), label: 'deposit' });
}

export async function sendWithdrawEmail(to, username, amount, address) {
  const content = `
    <h2 style="color:#fff;margin:0 0 16px;">Withdrawal Request Received</h2>
    <p style="color:#ccc;line-height:1.6;">Hi ${username}, we've received your withdrawal request.</p>
    <div style="background:#111;border:1px solid #444;border-radius:8px;padding:20px;margin:24px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#888;padding:8px 0;font-size:14px;">Amount</td>
          <td style="color:#D4AF37;font-weight:bold;text-align:right;">${parseInt(amount).toLocaleString()} $Pc</td>
        </tr>
        <tr>
          <td style="color:#888;padding:8px 0;font-size:14px;border-top:1px solid #222;">Destination</td>
          <td style="color:#ccc;font-size:12px;text-align:right;word-break:break-all;border-top:1px solid #222;">${address}</td>
        </tr>
      </table>
    </div>
    <p style="color:#ccc;line-height:1.6;">Your request will be processed within <strong>24-48 hours</strong>. You'll receive a confirmation email once complete.</p>
  `;
  return sendMail({ to, subject: `Withdrawal request for ${parseInt(amount).toLocaleString()} $Pc submitted`, html: emailWrapper(content, to), label: 'withdraw' });
}

export async function sendCashbackEmail(to, username, amount, tier) {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierColors = { silver: '#C0C0C0', gold: '#D4AF37', platinum: '#E5E4E2', diamond: '#b9f2ff' };
  const tierColor = tierColors[tier] || '#D4AF37';

  const content = `
    <h2 style="color:#fff;margin:0 0 16px;">Weekly VIP Cashback Credited!</h2>
    <p style="color:#ccc;line-height:1.6;">Hi ${username}, your weekly VIP cashback has been automatically applied to your account.</p>
    <div style="background:#111;border:1px solid ${tierColor};border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
      <p style="color:${tierColor};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">${tierLabel} VIP Cashback</p>
      <p style="color:#fff;font-size:32px;font-weight:bold;margin:0 0 4px;">+${parseInt(amount).toLocaleString()} $Pc</p>
      <p style="color:#666;font-size:12px;margin:0;">Credited to your balance</p>
    </div>
    <p style="color:#ccc;line-height:1.6;">Keep wagering to maintain and grow your VIP status. Higher tiers earn larger cashback rates.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${SITE_URL}" style="background:#D4AF37;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Play Now
      </a>
    </div>
  `;
  return sendMail({ to, subject: `Your ${tierLabel} VIP cashback of ${parseInt(amount).toLocaleString()} $Pc has been credited`, html: emailWrapper(content, to), label: 'cashback' });
}

export async function sendTournamentReminderEmail(to, username, tournament) {
  const gameLabel = tournament.game.charAt(0).toUpperCase() + tournament.game.slice(1);
  const startTime = new Date(tournament.startTime);
  const timeStr = startTime.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  const content = `
    <h2 style="color:#fff;margin:0 0 16px;">Tournament Starting Soon!</h2>
    <p style="color:#ccc;line-height:1.6;">Hi ${username}, a tournament you registered for starts in <strong style="color:#D4AF37;">1 hour</strong>.</p>
    <div style="background:#111;border:1px solid #D4AF37;border-radius:8px;padding:24px;margin:24px 0;">
      <p style="color:#D4AF37;font-size:20px;font-weight:bold;margin:0 0 16px;">${tournament.name}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#888;padding:8px 0;font-size:14px;">Game</td>
          <td style="color:#fff;text-align:right;">${gameLabel}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:8px 0;font-size:14px;border-top:1px solid #222;">Entry Fee</td>
          <td style="color:#D4AF37;font-weight:bold;text-align:right;border-top:1px solid #222;">${parseInt(tournament.entryFee).toLocaleString()} $Pc</td>
        </tr>
        <tr>
          <td style="color:#888;padding:8px 0;font-size:14px;border-top:1px solid #222;">Prize Pool</td>
          <td style="color:#2ecc71;font-weight:bold;text-align:right;border-top:1px solid #222;">${parseInt(tournament.prizePool).toLocaleString()} $Pc</td>
        </tr>
        <tr>
          <td style="color:#888;padding:8px 0;font-size:14px;border-top:1px solid #222;">Start Time</td>
          <td style="color:#fff;font-size:12px;text-align:right;border-top:1px solid #222;">${timeStr}</td>
        </tr>
      </table>
    </div>
    <p style="color:#ccc;line-height:1.6;">Make sure you're logged in and ready to play when the tournament begins!</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${SITE_URL}" style="background:#D4AF37;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        Go to Casino
      </a>
    </div>
  `;
  return sendMail({ to, subject: `Reminder: ${tournament.name} starts in 1 hour!`, html: emailWrapper(content, to), label: 'tournament' });
}

// Admin debug helper — sends a tiny "is the pipe alive?" email and returns the
// raw nodemailer result (or error) so the admin dashboard can show it.
export async function sendTestEmail(to) {
  const content = `
    <h2 style="color:#D4AF37;margin:0 0 16px;">SMTP Test</h2>
    <p style="color:#ccc;line-height:1.6;">If you're reading this, $Pc Casino's outbound SMTP is working.</p>
    <p style="color:#888;font-size:12px;">Sent at ${new Date().toISOString()} from ${effectiveFromHeader}.</p>
  `;
  return sendMail({ to, subject: 'Test from $Pc Casino', html: emailWrapper(content, to), label: 'test' });
}
