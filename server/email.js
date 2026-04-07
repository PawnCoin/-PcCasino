import nodemailer from 'nodemailer';
import { createHmac } from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET;
if (!UNSUBSCRIBE_SECRET) {
  console.warn('[Email] WARNING: UNSUBSCRIBE_SECRET env var is not set — unsubscribe links will not work securely. Set UNSUBSCRIBE_SECRET in environment secrets.');
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER or SMTP_PASS not set — emails will not send');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

const FROM = process.env.SMTP_FROM || '$Pc Casino <noreply@pcasino.com>';
const SITE_URL = process.env.SITE_URL || 'https://pcasino.replit.app';

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

export async function sendVerificationEmail(to, username, token) {
  const transporter = getTransporter();
  if (!transporter) return;

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Verify your $Pc Casino account',
    html: emailWrapper(content, to),
  });
}

export async function sendWelcomeEmail(to, username) {
  const transporter = getTransporter();
  if (!transporter) return;

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Welcome to $Pc Casino — Your 1B $Pc bonus is ready!',
    html: emailWrapper(content, to),
  });
}

export async function sendDepositConfirmationEmail(to, username, amount) {
  const transporter = getTransporter();
  if (!transporter) return;

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Deposit of ${parseInt(amount).toLocaleString()} $Pc confirmed`,
    html: emailWrapper(content, to),
  });
}

export async function sendWithdrawEmail(to, username, amount, address) {
  const transporter = getTransporter();
  if (!transporter) return;

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Withdrawal request for ${parseInt(amount).toLocaleString()} $Pc submitted`,
    html: emailWrapper(content, to),
  });
}

export async function sendCashbackEmail(to, username, amount, tier) {
  const transporter = getTransporter();
  if (!transporter) return;

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Your ${tierLabel} VIP cashback of ${parseInt(amount).toLocaleString()} $Pc has been credited`,
    html: emailWrapper(content, to),
  });
}

export async function sendTournamentReminderEmail(to, username, tournament) {
  const transporter = getTransporter();
  if (!transporter) return;

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Reminder: ${tournament.name} starts in 1 hour!`,
    html: emailWrapper(content, to),
  });
}
