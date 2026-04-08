import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { sendVerificationEmail, sendWelcomeEmail, generateUnsubscribeToken } from './email.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pcasino-secret-jwt-key-2024';
const TOKEN_EXPIRY = '30d';

function hashPassword(password) {
  return createHash('sha256').update(password + 'pcasino_salt_2024').digest('hex');
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    if (!result.rows.length) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth error' });
  }
}

function getVipTier(totalWagered) {
  if (totalWagered >= 10_000_000_000) return 'diamond';
  if (totalWagered >= 1_000_000_000) return 'platinum';
  if (totalWagered >= 100_000_000) return 'gold';
  if (totalWagered >= 10_000_000) return 'silver';
  return 'bronze';
}

// Register with email/password
router.post('/register', async (req, res) => {
  const { username, email, password, referralCode } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username must be 3-30 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const passwordHash = hashPassword(password);
    const verifyToken = randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO users (username, email, password_hash, email_verify_token, balance)
       VALUES ($1, $2, $3, $4, 1000000000) RETURNING *`,
      [username, email, passwordHash, verifyToken]
    );
    const user = result.rows[0];

    // Handle referral — validate code against persisted referral_codes table (exact match only)
    if (referralCode) {
      try {
        const codeRow = await query(
          'SELECT user_id FROM referral_codes WHERE code = $1 LIMIT 1',
          [referralCode]
        );
        if (codeRow.rows.length) {
          const referrerId = codeRow.rows[0].user_id;
          if (referrerId !== user.id) {
            // Link referral (idempotent — ON CONFLICT DO NOTHING)
            await query(
              'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [referrerId, user.id]
            );
            // Credit welcome bonus to referred user only (referrer earns commission on first deposit)
            await query('UPDATE users SET balance = balance + 50000000 WHERE id = $1', [user.id]);
            // Notify referred user of their welcome bonus
            await query(
              "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'referral', '🎁 Welcome Bonus Credited!', $2)",
              [user.id, `50,000,000 $Pc welcome bonus credited to your account for joining via referral!`]
            );
          }
        }
      } catch (e) {
        // Non-fatal — referral bonus is secondary; registration must succeed regardless
      }
    }

    // Re-read final balance from DB to reflect any referral bonus credited above
    const freshUser = await query('SELECT balance FROM users WHERE id = $1', [user.id]);
    const finalBalance = freshUser.rows.length ? parseInt(freshUser.rows[0].balance) : parseInt(user.balance);

    // Send verification email + welcome email on registration
    try {
      await sendVerificationEmail(email, username, verifyToken);
    } catch (e) {
      console.error('[Email] Verification email failed:', e.message);
    }
    sendWelcomeEmail(email, username).catch(e => console.error('[Email] Welcome email failed:', e.message));

    const token = generateToken(user.id);
    await query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [user.id, token]);

    // Add welcome notification
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'welcome', 'Welcome to $Pc Casino!', $2)",
      [user.id, `Welcome ${username}! You've received 1,000,000,000 $Pc to start playing. Check your email to verify your account.`]
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        balance: finalBalance, avatar: user.avatar,
        isAdmin: user.is_admin, emailVerified: user.email_verified,
        vipTier: user.vip_tier, totpEnabled: user.totp_enabled,
        withdrawAddress: user.withdraw_address,
        socialAvatarUrl: user.social_avatar_url || null,
        kycStatus: user.kyc_status || 'unverified',
        phoneVerified: user.phone_verified || false,
        phoneNumber: user.phone_number || null,
        realTransactionsUnlocked: user.real_transactions_unlocked || false,
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with email/password
router.post('/login', async (req, res) => {
  const { email, password, totpCode } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const hash = hashPassword(password);
    if (user.password_hash !== hash) return res.status(401).json({ error: 'Invalid credentials' });

    // Check self-exclusion
    if (user.self_excluded && (!user.self_exclude_until || new Date(user.self_exclude_until) > new Date())) {
      return res.status(403).json({ error: 'Account is self-excluded. Please contact support to re-enable.' });
    }

    // 2FA check
    if (user.totp_enabled) {
      if (!totpCode) return res.status(206).json({ requires2FA: true });
      const { TOTP } = await import('otpauth');
      const totp = new TOTP({ secret: user.totp_secret, digits: 6, period: 30 });
      if (!totp.validate({ token: totpCode, window: 1 })) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);
    const token = generateToken(user.id);
    await query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [user.id, token]);

    res.json({
      success: true, token,
      user: {
        id: user.id, username: user.username, email: user.email,
        balance: parseInt(user.balance), avatar: user.avatar,
        isAdmin: user.is_admin, emailVerified: user.email_verified,
        vipTier: user.vip_tier, totpEnabled: user.totp_enabled,
        withdrawAddress: user.withdraw_address,
        dailyDepositLimit: parseInt(user.daily_deposit_limit),
        dailyLossLimit: parseInt(user.daily_loss_limit),
        selfExcluded: user.self_excluded,
        walletAddress: user.wallet_address,
        kycStatus: user.kyc_status || 'unverified',
        phoneVerified: user.phone_verified || false,
        phoneNumber: user.phone_number || null,
        realTransactionsUnlocked: user.real_transactions_unlocked || false,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Social login (simulated but persists to DB)
router.post('/social', async (req, res) => {
  const { provider, username, email, socialId, avatar } = req.body;
  if (!provider || !username) return res.status(400).json({ error: 'Missing required fields' });

  try {
    let user;
    // Try find existing user by social ID or email
    const existing = await query(
      'SELECT * FROM users WHERE (social_provider = $1 AND social_id = $2) OR (email = $3 AND $3 IS NOT NULL)',
      [provider, socialId || username, email || null]
    );

    if (existing.rows.length) {
      user = existing.rows[0];
      await query('UPDATE users SET last_seen = NOW(), avatar = COALESCE($1, avatar) WHERE id = $2', [avatar || null, user.id]);
    } else {
      // Create new user
      const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || `user_${Date.now().toString(36)}`;
      const uniqueUsername = `${cleanUsername}_${Math.random().toString(36).slice(2, 5)}`;
      const result = await query(
        `INSERT INTO users (username, email, social_provider, social_id, avatar, email_verified, balance)
         VALUES ($1, $2, $3, $4, $5, $6, 1000000000) RETURNING *`,
        [uniqueUsername, email || null, provider, socialId || username, avatar || 'wizard', !!email]
      );
      user = result.rows[0];
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'welcome', 'Welcome to $Pc Casino!', $2)",
        [user.id, `Welcome ${user.username}! You've received 1,000,000,000 $Pc to start playing.`]
      );
    }

    const token = generateToken(user.id);
    await query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [user.id, token]);

    res.json({
      success: true, token,
      user: {
        id: user.id, username: user.username, email: user.email,
        balance: parseInt(user.balance), avatar: user.avatar,
        isAdmin: user.is_admin, emailVerified: user.email_verified,
        vipTier: user.vip_tier, totpEnabled: user.totp_enabled,
        withdrawAddress: user.withdraw_address, socialProvider: provider,
        walletAddress: user.wallet_address,
        dailyDepositLimit: parseInt(user.daily_deposit_limit),
        dailyLossLimit: parseInt(user.daily_loss_limit),
        kycStatus: user.kyc_status || 'unverified',
        phoneVerified: user.phone_verified || false,
        phoneNumber: user.phone_number || null,
        realTransactionsUnlocked: user.real_transactions_unlocked || false,
      }
    });
  } catch (err) {
    console.error('Social auth error:', err);
    res.status(500).json({ error: 'Social login failed' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  const user = req.user;
  res.json({
    user: {
      id: user.id, username: user.username, email: user.email,
      balance: parseInt(user.balance), avatar: user.avatar,
      isAdmin: user.is_admin, emailVerified: user.email_verified,
      vipTier: getVipTier(parseInt(user.total_wagered)), totpEnabled: user.totp_enabled,
      withdrawAddress: user.withdraw_address, socialProvider: user.social_provider,
      walletAddress: user.wallet_address,
      dailyDepositLimit: parseInt(user.daily_deposit_limit),
      dailyLossLimit: parseInt(user.daily_loss_limit),
      selfExcluded: user.self_excluded,
      totalWagered: parseInt(user.total_wagered),
      totalWon: parseInt(user.total_won),
      socialAvatarUrl: user.social_avatar_url || null,
      kycStatus: user.kyc_status || 'unverified',
      phoneVerified: user.phone_verified || false,
      phoneNumber: user.phone_number || null,
      realTransactionsUnlocked: user.real_transactions_unlocked || false,
      displayName: user.display_name || null,
      bio: user.bio || null,
      avatarUrl: user.avatar_url || null,
      socialTwitter: user.social_twitter || null,
      socialInstagram: user.social_instagram || null,
      socialTelegram: user.social_telegram || null,
      socialDiscord: user.social_discord || null,
      publicStatsVisible: user.public_stats_visible !== false,
      publicSocialsVisible: user.public_socials_visible !== false,
    }
  });
});

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) {
    await query('DELETE FROM sessions WHERE token = $1', [token]).catch(() => {});
  }
  res.json({ success: true });
});

// Verify email
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid link');
  try {
    const result = await query('SELECT id FROM users WHERE email_verify_token = $1', [token]);
    if (!result.rows.length) return res.status(400).send('Invalid or expired link');
    const { id } = result.rows[0];
    await query('UPDATE users SET email_verified = TRUE, email_verify_token = NULL WHERE id = $1', [id]);
    res.redirect('/?verified=1');
  } catch (err) {
    res.status(500).send('Verification failed');
  }
});

// Unsubscribe from emails (token-based, no login required)
router.get('/unsubscribe', async (req, res) => {
  const { email, token } = req.query;
  if (!email || !token) return res.status(400).send('Invalid unsubscribe link');
  const expected = generateUnsubscribeToken(email);
  if (!expected || expected !== token) return res.status(400).send('Invalid unsubscribe link');
  try {
    await query('UPDATE users SET email_unsubscribed = TRUE WHERE email = $1', [email]);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Unsubscribed</title>
      <style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
      .card{text-align:center;border:1px solid #D4AF37;padding:40px;border-radius:8px;max-width:400px;}
      h1{color:#D4AF37;}a{color:#D4AF37;}</style></head>
      <body><div class="card">
        <h1>$Pc Casino</h1>
        <h2>Unsubscribed</h2>
        <p>You've been unsubscribed from $Pc Casino emails. You won't receive marketing or notification emails.</p>
        <p>You can re-subscribe at any time from your account settings.</p>
        <p><a href="/">Return to Casino</a></p>
      </div></body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Failed to unsubscribe. Please try again.');
  }
});

// Setup 2FA
router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const { TOTP, Secret } = await import('otpauth');
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: '$Pc Casino',
      label: req.user.email || req.user.username,
      secret,
      digits: 6,
      period: 30,
    });
    await query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
    res.json({ success: true, secret: secret.base32, otpauth: totp.toString() });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: '2FA setup failed' });
  }
});

// Enable 2FA after verifying first code
router.post('/2fa/enable', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  try {
    const user = await query('SELECT totp_secret FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.totp_secret) return res.status(400).json({ error: 'Run 2FA setup first' });

    const { TOTP } = await import('otpauth');
    const totp = new TOTP({ secret: user.rows[0].totp_secret, digits: 6, period: 30 });
    const valid = totp.validate({ token: code, window: 1 });
    if (valid === null) return res.status(400).json({ error: 'Invalid code' });

    await query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '2FA enable failed' });
  }
});

// Disable 2FA
router.post('/2fa/disable', requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const user = await query('SELECT totp_secret, totp_enabled FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.totp_enabled) return res.status(400).json({ error: '2FA is not enabled' });

    const { TOTP } = await import('otpauth');
    const totp = new TOTP({ secret: user.rows[0].totp_secret, digits: 6, period: 30 });
    if (totp.validate({ token: code, window: 1 }) === null) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    await query('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '2FA disable failed' });
  }
});

// Update profile
router.patch('/profile', requireAuth, async (req, res) => {
  const {
    avatar, withdrawAddress, walletAddress, dailyDepositLimit, dailyLossLimit,
    displayName, bio, socialTwitter, socialInstagram, socialTelegram, socialDiscord,
    publicStatsVisible, publicSocialsVisible,
  } = req.body;
  const updates = [];
  const values = [];
  let i = 1;

  if (avatar) { updates.push(`avatar = $${i++}`); values.push(avatar); }
  if (withdrawAddress !== undefined) { updates.push(`withdraw_address = $${i++}`); values.push(withdrawAddress); }
  if (walletAddress !== undefined) { updates.push(`wallet_address = $${i++}`); values.push(walletAddress); }
  if (dailyDepositLimit !== undefined) { updates.push(`daily_deposit_limit = $${i++}`); values.push(dailyDepositLimit); }
  if (dailyLossLimit !== undefined) { updates.push(`daily_loss_limit = $${i++}`); values.push(dailyLossLimit); }
  if (displayName !== undefined) {
    if (displayName && displayName.length > 60) return res.status(400).json({ error: 'Display name too long (max 60 chars)' });
    updates.push(`display_name = $${i++}`); values.push(displayName || null);
  }
  if (bio !== undefined) {
    if (bio && bio.length > 300) return res.status(400).json({ error: 'Bio too long (max 300 chars)' });
    updates.push(`bio = $${i++}`); values.push(bio || null);
  }
  if (socialTwitter !== undefined) { updates.push(`social_twitter = $${i++}`); values.push(socialTwitter || null); }
  if (socialInstagram !== undefined) { updates.push(`social_instagram = $${i++}`); values.push(socialInstagram || null); }
  if (socialTelegram !== undefined) { updates.push(`social_telegram = $${i++}`); values.push(socialTelegram || null); }
  if (socialDiscord !== undefined) { updates.push(`social_discord = $${i++}`); values.push(socialDiscord || null); }
  if (publicStatsVisible !== undefined) { updates.push(`public_stats_visible = $${i++}`); values.push(!!publicStatsVisible); }
  if (publicSocialsVisible !== undefined) { updates.push(`public_socials_visible = $${i++}`); values.push(!!publicSocialsVisible); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.user.id);

  try {
    const result = await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    const u = result.rows[0];
    res.json({
      success: true,
      user: {
        displayName: u.display_name || null,
        bio: u.bio || null,
        avatarUrl: u.avatar_url || null,
        socialTwitter: u.social_twitter || null,
        socialInstagram: u.social_instagram || null,
        socialTelegram: u.social_telegram || null,
        socialDiscord: u.social_discord || null,
        publicStatsVisible: u.public_stats_visible !== false,
        publicSocialsVisible: u.public_socials_visible !== false,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Avatar photo upload
router.post('/profile/avatar', requireAuth, async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }
    const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : contentType.includes('webp') ? 'webp' : 'jpg';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType.split(';')[0].trim())) {
      return res.status(400).json({ error: 'Unsupported image type. Use JPG, PNG, GIF, or WebP.' });
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 5MB)' });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const filename = `avatar_${req.user.id}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.id]);

    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// Favorite games
router.get('/profile/favorite-games', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        game,
        COUNT(*) AS play_count,
        SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins
      FROM game_history
      WHERE user_id = $1 AND game IS NOT NULL AND game != ''
      GROUP BY game
      ORDER BY play_count DESC
      LIMIT 5
    `, [req.user.id]);

    const GAME_META = {
      poker:        { gameName: 'Texas Hold\'em Poker', icon: '🃏' },
      blackjack:    { gameName: 'Blackjack', icon: '🂡' },
      roulette:     { gameName: 'Roulette', icon: '🎡' },
      craps:        { gameName: 'Craps', icon: '🎲' },
      spades:       { gameName: 'Spades', icon: '♠️' },
      slots:        { gameName: 'Slots', icon: '🎰' },
      bingo:        { gameName: 'Bingo 75-Ball', icon: '🔵' },
      dominoes:     { gameName: 'Dominoes', icon: '🁢' },
      sports:       { gameName: 'Sports Betting', icon: '⚽' },
      pool:         { gameName: 'Pool Table', icon: '🎱' },
      darts:        { gameName: 'Darts 501', icon: '🎯' },
      'horse-racing': { gameName: 'Horse Racing', icon: '🐎' },
      vip:          { gameName: 'VIP Lounge', icon: '👑' },
    };

    const games = result.rows.map(row => {
      const meta = GAME_META[row.game] || { gameName: row.game, icon: '🎮' };
      return {
        game: row.game,
        gameName: meta.gameName,
        icon: meta.icon,
        playCount: parseInt(row.play_count),
        winRate: row.play_count > 0 ? Math.round((parseInt(row.wins) / parseInt(row.play_count)) * 100) : 0,
      };
    });

    res.json({ success: true, games });
  } catch (err) {
    console.error('Favorite games error:', err);
    res.status(500).json({ error: 'Failed to fetch favorite games' });
  }
});

// Public profile (casino card) — visible to anyone who knows the username
router.get('/profile/public/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await query(
      `SELECT id, username, display_name, bio, avatar, avatar_url, social_avatar_url,
              vip_tier, total_wagered, total_won,
              social_twitter, social_instagram, social_telegram, social_discord,
              public_stats_visible, public_socials_visible
       FROM users WHERE username = $1`,
      [username]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

    const u = result.rows[0];
    const vipTier = getVipTier(parseInt(u.total_wagered) || 0);

    let gamesPlayed = 0;
    let winRate = 0;
    let favoriteGame = null;

    if (u.public_stats_visible !== false) {
      const statsResult = await query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins
         FROM game_history WHERE user_id = $1`,
        [u.id]
      );
      if (statsResult.rows.length) {
        gamesPlayed = parseInt(statsResult.rows[0].total) || 0;
        const wins = parseInt(statsResult.rows[0].wins) || 0;
        winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
      }
      const favResult = await query(
        `SELECT game FROM game_history WHERE user_id = $1 AND game IS NOT NULL AND game != ''
         GROUP BY game ORDER BY COUNT(*) DESC LIMIT 1`,
        [u.id]
      );
      if (favResult.rows.length) favoriteGame = favResult.rows[0].game;
    }

    const PUBLIC_GAME_META = {
      poker:        { gameName: 'Texas Hold\'em Poker', icon: '🃏' },
      blackjack:    { gameName: 'Blackjack', icon: '🂡' },
      roulette:     { gameName: 'Roulette', icon: '🎡' },
      craps:        { gameName: 'Craps', icon: '🎲' },
      spades:       { gameName: 'Spades', icon: '♠️' },
      slots:        { gameName: 'Slots', icon: '🎰' },
      bingo:        { gameName: 'Bingo 75-Ball', icon: '🔵' },
      dominoes:     { gameName: 'Dominoes', icon: '🁢' },
      sports:       { gameName: 'Sports Betting', icon: '⚽' },
      pool:         { gameName: 'Pool Table', icon: '🎱' },
      darts:        { gameName: 'Darts 501', icon: '🎯' },
      'horse-racing': { gameName: 'Horse Racing', icon: '🐎' },
      vip:          { gameName: 'VIP Lounge', icon: '👑' },
    };
    const favMeta = favoriteGame ? (PUBLIC_GAME_META[favoriteGame] || { gameName: favoriteGame, icon: '🎮' }) : null;

    res.json({
      success: true,
      profile: {
        username: u.username,
        displayName: u.display_name || null,
        bio: u.bio || null,
        avatar: u.avatar,
        avatarUrl: u.avatar_url || u.social_avatar_url || null,
        vipTier,
        publicStatsVisible: u.public_stats_visible !== false,
        publicSocialsVisible: u.public_socials_visible !== false,
        gamesPlayed: u.public_stats_visible !== false ? gamesPlayed : null,
        winRate: u.public_stats_visible !== false ? winRate : null,
        favoriteGame: u.public_stats_visible !== false ? favoriteGame : null,
        favoriteGameName: u.public_stats_visible !== false ? (favMeta?.gameName || null) : null,
        favoriteGameIcon: u.public_stats_visible !== false ? (favMeta?.icon || null) : null,
        socialTwitter: u.public_socials_visible !== false ? (u.social_twitter || null) : null,
        socialInstagram: u.public_socials_visible !== false ? (u.social_instagram || null) : null,
        socialTelegram: u.public_socials_visible !== false ? (u.social_telegram || null) : null,
        socialDiscord: u.public_socials_visible !== false ? (u.social_discord || null) : null,
      }
    });
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Self-exclusion
router.post('/self-exclude', requireAuth, async (req, res) => {
  const { days } = req.body;
  const excludeUntil = days
    ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  try {
    await query('UPDATE users SET self_excluded = TRUE, self_exclude_until = $1 WHERE id = $2', [excludeUntil, req.user.id]);
    res.json({ success: true, excludeUntil });
  } catch (err) {
    res.status(500).json({ error: 'Self-exclusion failed' });
  }
});

export default router;
