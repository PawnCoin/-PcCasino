import nodemailer from 'nodemailer';

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

export async function sendVerificationEmail(to, username, token) {
  const transporter = getTransporter();
  if (!transporter) return;

  const verifyUrl = `${SITE_URL}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Verify your $Pc Casino account',
    html: `
      <div style="background:#0a0a0a;color:#fff;padding:40px;font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #D4AF37;">
        <h1 style="color:#D4AF37;text-align:center;">$Pc Casino</h1>
        <h2>Welcome, ${username}!</h2>
        <p>Click the button below to verify your email address and unlock your full account.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${verifyUrl}" style="background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Verify Email
          </a>
        </div>
        <p style="color:#666;font-size:12px;">Link expires in 24 hours. If you didn't create this account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to, username) {
  const transporter = getTransporter();
  if (!transporter) return;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Welcome to $Pc Casino — Your 1B $Pc bonus is waiting!',
    html: `
      <div style="background:#0a0a0a;color:#fff;padding:40px;font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #D4AF37;">
        <h1 style="color:#D4AF37;text-align:center;">$Pc Casino</h1>
        <h2>You're in, ${username}! 🎰</h2>
        <p>Your account is verified and your <strong style="color:#D4AF37;">1,000,000,000 $Pc</strong> starting balance is ready.</p>
        <p>Games available: Poker, Blackjack, Roulette, Craps, Slots, Spades, Bingo, Dominoes, and more.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${SITE_URL}" style="background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Start Playing
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendDepositConfirmationEmail(to, username, amount) {
  const transporter = getTransporter();
  if (!transporter) return;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Deposit of ${amount.toLocaleString()} $Pc received`,
    html: `
      <div style="background:#0a0a0a;color:#fff;padding:40px;font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #D4AF37;">
        <h1 style="color:#D4AF37;text-align:center;">$Pc Casino</h1>
        <h2>Deposit Confirmed ✅</h2>
        <p>Hi ${username}, your deposit of <strong style="color:#D4AF37;">${amount.toLocaleString()} $Pc</strong> has been credited to your account.</p>
        <p>Happy playing!</p>
      </div>
    `,
  });
}

export async function sendWithdrawEmail(to, username, amount, address) {
  const transporter = getTransporter();
  if (!transporter) return;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Withdrawal request for ${amount.toLocaleString()} $Pc`,
    html: `
      <div style="background:#0a0a0a;color:#fff;padding:40px;font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #D4AF37;">
        <h1 style="color:#D4AF37;text-align:center;">$Pc Casino</h1>
        <h2>Withdrawal Request Received</h2>
        <p>Hi ${username}, we've received your withdrawal request:</p>
        <ul>
          <li>Amount: <strong style="color:#D4AF37;">${amount.toLocaleString()} $Pc</strong></li>
          <li>To: <code>${address}</code></li>
        </ul>
        <p>Your request will be processed within 24-48 hours. You'll receive a confirmation email once complete.</p>
      </div>
    `,
  });
}
