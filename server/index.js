import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import authRoutes, { requireAuth, verifyToken } from './auth-routes.js';
import { createGameRound, revealGameRound, getGameRound, hashServerSeed, deriveGameResult } from './provably-fair.js';
import paymentsRoutes from './payments-routes.js';
import gameRoutes from './game-routes.js';
import kycRoutes, { adminKycRouter } from './kyc-routes.js';
import walletRoutes from './wallet-routes.js';
import friendsRoutes, { setFriendsIO } from './friends-routes.js';
import { initDatabase, query, pool } from './db.js';
import { cleanupExpiredSessions } from './auth-routes.js';
import { loadJackpotFromDB, getJackpot, getJackpotLastWon, setJackpotIO, broadcastJackpot } from './jackpot.js';
import { sendCashbackEmail, sendTournamentReminderEmail } from './email.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const app = express();
app.use(cors({ origin: '*', credentials: true }));

// Capture raw body for the PcPay webhook BEFORE express.json() parses it
// This must be registered first so the raw bytes are preserved for HMAC verification
app.use('/api/pcpayments/webhook', (req, _res, next) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
});

// Increase JSON body size limit to 10MB to support base64-encoded KYC document uploads
app.use(express.json({ limit: '10mb' }));

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/kyc', kycRoutes);
// Alias: /api/admin/kyc/... also works (spec-aligned route)
app.use('/api/admin/kyc', adminKycRouter);
app.use('/api/wallets', walletRoutes);
app.use('/api/friends', friendsRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3001;

// ---- In-memory data stores ----
const rooms = new Map();
const players = new Map();
const disputes = new Map();
const tournaments = new Map();
const referrals = new Map();
const adminLogs = [];
const pcpaymentsConfig = { apiKey: process.env.PCPAY_API_KEY || '', webhookSecret: process.env.PCPAY_WEBHOOK_SECRET || '', endpoint: '', enabled: false };
const lobbyChat = [];

// ---- Progressive Jackpot — managed by ./jackpot.js ----
// Broadcast jackpot every 5 seconds via jackpot module
setInterval(() => broadcastJackpot(), 5000);

// ---- Leaderboard (DB-only — no fake fallback) ----

async function getLeaderboardFromDB(period = 'alltime') {
  try {
    let sql;
    if (period === 'daily') {
      sql = `SELECT u.id, u.username, u.balance, u.avatar, u.vip_tier as "vipTier",
                    COALESCE(SUM(gh.win_amount), 0) as "totalWon",
                    COUNT(gh.id) as "gamesPlayed"
             FROM game_history gh
             JOIN users u ON gh.user_id = u.id
             WHERE gh.result = 'win' AND gh.created_at >= NOW() - INTERVAL '24 hours'
             GROUP BY u.id, u.username, u.balance, u.avatar, u.vip_tier
             ORDER BY "totalWon" DESC LIMIT 20`;
    } else if (period === 'weekly') {
      sql = `SELECT u.id, u.username, u.balance, u.avatar, u.vip_tier as "vipTier",
                    COALESCE(SUM(gh.win_amount), 0) as "totalWon",
                    COUNT(gh.id) as "gamesPlayed"
             FROM game_history gh
             JOIN users u ON gh.user_id = u.id
             WHERE gh.result = 'win' AND gh.created_at >= NOW() - INTERVAL '7 days'
             GROUP BY u.id, u.username, u.balance, u.avatar, u.vip_tier
             ORDER BY "totalWon" DESC LIMIT 20`;
    } else {
      sql = `SELECT l.user_id as id, l.username, l.total_won as "totalWon", l.balance, l.games_played as "gamesPlayed",
                    l.favorite_game as "favoriteGame", COALESCE(l.win_streak, 0) as "winStreak",
                    u.vip_tier as "vipTier"
             FROM leaderboard l
             LEFT JOIN users u ON l.user_id = u.id
             ORDER BY l.total_won DESC LIMIT 20`;
    }
    const result = await query(sql);
    if (result.rows.length > 0) {
      return result.rows.map(r => ({
        ...r,
        id: String(r.id),
        totalWon: parseInt(r.totalWon || 0),
        balance: parseInt(r.balance || 0),
        gamesPlayed: parseInt(r.gamesPlayed || 0),
        winStreak: parseInt(r.winStreak || 0),
        favoriteGame: r.favoriteGame || 'Casino',
      }));
    }
  } catch (e) {
    console.error('[Leaderboard DB]', e.message);
  }
  return [];
}

async function recordWinToDB(userId, username, amount, game) {
  if (!userId || !amount || amount <= 0) return;
  try {
    const userRow = await query('SELECT balance, avatar FROM users WHERE id = $1', [userId]);
    const balance = userRow.rows[0]?.balance ? parseInt(userRow.rows[0].balance) : 0;
    await query(
      `INSERT INTO leaderboard (user_id, username, total_won, balance, games_played, favorite_game, updated_at)
       VALUES ($1, $2, $3, $4, 1, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         total_won = leaderboard.total_won + $3,
         balance = $4,
         games_played = leaderboard.games_played + 1,
         favorite_game = COALESCE(EXCLUDED.favorite_game, leaderboard.favorite_game),
         updated_at = NOW()`,
      [userId, username, amount, balance, game || 'Casino']
    );
  } catch (e) {
    console.error('[recordWinToDB]', e.message);
  }
}

async function broadcastLeaderboard() {
  const dbData = await getLeaderboardFromDB('alltime');
  io.emit('leaderboard:update', { leaderboard: dbData, lastUpdated: Date.now() });
  return dbData;
}

// Broadcast leaderboard updates every 30 seconds with real DB data
setInterval(broadcastLeaderboard, 30000);

// ---- Recent winners feed (real data only — populated by game wins) ----
const recentWinners = [];

function generateWinner() {
  return { name: '', game: '', amount: 0 };
}

// ---- VIP Cashback Automation ----
const VIP_CASHBACK_RATES = { bronze: 0, silver: 0.01, gold: 0.02, platinum: 0.05, diamond: 0.10 };

async function runVipCashback() {
  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  let count = 0;
  let totalCredited = 0;

  try {
    const users = await query(
      `SELECT id, username, email, vip_tier, total_wagered, cashback_paid_at, email_unsubscribed
       FROM users
       WHERE vip_tier != 'bronze'
         AND (cashback_paid_at IS NULL OR cashback_paid_at < NOW() - INTERVAL '7 days')`
    );

    for (const user of users.rows) {
      const rate = VIP_CASHBACK_RATES[user.vip_tier] || 0;
      if (!rate) continue;

      // Net losses = total bets - total wins in the last 7 days
      const lossResult = await query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0) as total_bet,
           COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0) as total_won
         FROM transactions
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [user.id]
      );
      const totalBet = parseInt(lossResult.rows[0].total_bet);
      const totalWon = parseInt(lossResult.rows[0].total_won);
      const netLosses = totalBet - totalWon;
      if (netLosses <= 0) continue;

      const cashback = Math.floor(netLosses * rate);
      if (cashback <= 0) continue;

      await query('UPDATE users SET balance = balance + $1, cashback_paid_at = NOW() WHERE id = $2', [cashback, user.id]);
      await query(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [user.id, 'bonus', cashback, `${user.vip_tier.toUpperCase()} VIP Weekly Cashback (${(rate * 100).toFixed(0)}%)`]
      );
      await query(
        `INSERT INTO cashback_payments (user_id, username, vip_tier, cashback_rate, net_losses, cashback_amount, week_start, week_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, user.username, user.vip_tier, rate, netLosses, cashback, weekStart.toISOString(), weekEnd.toISOString()]
      );
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'bonus', '💎 VIP Cashback Credited!', $2)",
        [user.id, `Your ${user.vip_tier.toUpperCase()} weekly cashback of ${cashback.toLocaleString()} $Pc has been credited to your balance!`]
      );

      io.to(`user_${user.id}`).emit('cashback:credited', { amount: cashback, tier: user.vip_tier });

      // Send cashback email notification if user has email and hasn't unsubscribed
      if (user.email && !user.email_unsubscribed) {
        sendCashbackEmail(user.email, user.username, cashback, user.vip_tier).catch(e =>
          console.error('[Email] Cashback email failed:', e.message)
        );
      }
      count++;
      totalCredited += cashback;
    }

    if (count > 0) {
      console.log(`[VIP Cashback] Credited ${count} users, total: ${totalCredited.toLocaleString()} $Pc`);
      logAdmin('vip:cashback:run', { usersCredited: count, totalCredited, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });
    }
  } catch (err) {
    console.error('[VIP Cashback] Error:', err.message);
    logAdmin('vip:cashback:error', { error: err.message });
  }
}

// Schedule VIP cashback for every Monday at 00:00 UTC
function scheduleWeeklyCashback() {
  const now = new Date();
  const nextMonday = new Date(now);
  // Find next Monday 00:00 UTC
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  const msUntilMonday = nextMonday.getTime() - now.getTime();
  console.log(`[VIP Cashback] Next run scheduled for ${nextMonday.toISOString()} (in ${Math.round(msUntilMonday / 3600000)}h)`);
  setTimeout(() => {
    runVipCashback();
    setInterval(runVipCashback, 7 * 24 * 60 * 60 * 1000);
  }, msUntilMonday);
}

// Schedule weekly Monday run (after 30s for DB init)
setTimeout(scheduleWeeklyCashback, 30000);

// ---- Default rooms ----
const defaultGames = ['poker', 'blackjack', 'roulette', 'craps', 'spades', 'slots', 'bingo', 'dominoes'];
const defaultNames = ['High Rollers Den','Beginners Welcome','VIP Lounge','Quick Match','Night Owls Table','Crypto Kings','Diamond Hands','Moon Shot Room','Weekend Warriors','Pro Circuit','The Gold Room','Lucky Sevens'];

for (let i = 0; i < 16; i++) {
  const game = defaultGames[i % defaultGames.length];
  const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
  const id = `default_${i}`;
  rooms.set(id, { id, game, name: `${defaultNames[i % defaultNames.length]} #${i + 1}`, minBet: [5,10,25,50,100,250,500][i%7], maxBet: [500,1000,5000,10000,50000,100000][i%6], maxPlayers, players: [], status: 'waiting', pot: 0, createdAt: Date.now(), isPrivate: false, hostId: null, gameState: null, chat: [] });
}

// Default tournaments
const defaultTournaments = [
  { id: 't1', name: 'Sunday Poker Championship', game: 'poker', entryFee: 5000, prizePool: 500000, maxPlayers: 100, registeredPlayers: 67, startTime: Date.now() + 7200000, status: 'registering', type: 'knockout' },
  { id: 't2', name: 'Blackjack Masters', game: 'blackjack', entryFee: 2500, prizePool: 200000, maxPlayers: 50, registeredPlayers: 34, startTime: Date.now() + 14400000, status: 'registering', type: 'points' },
  { id: 't3', name: 'Slots Jackpot Race', game: 'slots', entryFee: 1000, prizePool: 100000, maxPlayers: 200, registeredPlayers: 156, startTime: Date.now() + 3600000, status: 'registering', type: 'race' },
  { id: 't4', name: 'Roulette Championship', game: 'roulette', entryFee: 10000, prizePool: 1000000, maxPlayers: 30, registeredPlayers: 28, startTime: Date.now() + 86400000, status: 'registering', type: 'knockout' },
  { id: 't5', name: 'Spades Open', game: 'spades', entryFee: 500, prizePool: 50000, maxPlayers: 40, registeredPlayers: 12, startTime: Date.now() + 172800000, status: 'registering', type: 'round-robin' },
];
defaultTournaments.forEach(t => tournaments.set(t.id, t));

// ---- Tournament Reminder Emails ----
// Track which tournaments have already had their 1h reminder sent
const tournamentRemindersSent = new Set();

async function checkTournamentReminders() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const windowMs = 5 * 60 * 1000; // remind if start is within 55-65 min from now

  for (const [tid, t] of tournaments) {
    if (t.status !== 'registering') continue;
    if (tournamentRemindersSent.has(tid)) continue;
    const timeUntilStart = t.startTime - now;
    if (timeUntilStart > oneHour + windowMs || timeUntilStart < oneHour - windowMs) continue;

    tournamentRemindersSent.add(tid);
    console.log(`[Tournament] Sending 1h reminders for: ${t.name}`);

    // Use registeredUserIds from in-memory tournament data (populated by /api/tournaments/:id/register)
    const userIds = Array.isArray(t.registeredUserIds) ? t.registeredUserIds : [];
    if (userIds.length === 0) continue;

    try {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await query(
        `SELECT email, username FROM users
         WHERE id IN (${placeholders}) AND email IS NOT NULL AND email_unsubscribed IS NOT TRUE`,
        userIds
      );
      for (const row of result.rows) {
        sendTournamentReminderEmail(row.email, row.username, t).catch(e =>
          console.error('[Email] Tournament reminder failed:', e.message)
        );
      }
    } catch (e) {
      console.error('[Tournament] Reminder query failed:', e.message);
    }
  }
}

// Check for tournament reminders every 5 minutes
setInterval(checkTournamentReminders, 5 * 60 * 1000);

// ---- Helper functions ----
function generateRoomId() { return `room_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

function getPublicRooms() {
  const publicRooms = Array.from(rooms.values()).filter(r => !r.isPrivate).map(r => ({
    id: r.id, game: r.game, name: r.name, minBet: r.minBet, maxBet: r.maxBet, maxPlayers: r.maxPlayers,
    players: r.players.map(p => ({ id: p.id, username: p.username, balance: p.balance, seat: p.seat, isReady: p.isReady })),
    status: r.status, pot: r.pot, createdAt: r.createdAt, isPrivate: r.isPrivate,
  }));
  publicRooms.unshift({
    id: 'roulette-main', game: 'roulette', name: 'Roulette Table', minBet: 1, maxBet: 500000000, maxPlayers: 50,
    players: rouletteGetPlayers().map(p => ({ id: p.id, username: p.username, balance: 0, seat: 0, isReady: true })),
    status: rouletteRoom.phase === 'betting' ? 'waiting' : (rouletteRoom.phase === 'spinning' ? 'playing' : 'waiting'),
    pot: 0, createdAt: Date.now(), isPrivate: false,
  });
  return publicRooms;
}

function broadcastLobby() { io.emit('lobby:update', { rooms: getPublicRooms() }); }

function logAdmin(action, data) { adminLogs.unshift({ id: Date.now(), action, data, timestamp: Date.now() }); if (adminLogs.length > 500) adminLogs.pop(); }

// ---- REST API ----

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size, players: players.size }));

// Leaderboard - real DB only, supports ?period=daily|weekly|alltime
app.get('/api/leaderboard', async (req, res) => {
  const period = ['daily', 'weekly', 'alltime'].includes(req.query.period) ? req.query.period : 'alltime';
  const dbData = await getLeaderboardFromDB(period);
  const sorted = dbData.map((p, i) => ({ ...p, rank: i + 1 }));
  res.json({ leaderboard: sorted, totalPlayers: players.size, lastUpdated: Date.now(), period });
});

// Recent winners
app.get('/api/winners', (req, res) => {
  res.json({ winners: recentWinners.slice(0, 20) });
});

// Stats for lobby banner — real data only
app.get('/api/stats', async (req, res) => {
  let totalWonToday = 0;
  let gamesPlayed24h = 0;
  try {
    const wonResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'win' AND created_at > NOW() - INTERVAL '24 hours'`
    );
    totalWonToday = parseInt(wonResult.rows[0]?.total || 0);
    const gamesResult = await query(
      `SELECT COUNT(*) as count FROM game_history WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    gamesPlayed24h = parseInt(gamesResult.rows[0]?.count || 0);
  } catch (_) {}
  res.json({
    playersOnline: players.size,
    activeTables: rooms.size,
    totalWonToday,
    jackpot: getJackpot(),
    gamesPlayed24h,
  });
});

// Jackpot current value
app.get('/api/jackpot', (req, res) => {
  res.json({ amount: getJackpot(), lastWon: getJackpotLastWon() });
});


// Jackpot history — public list of past winners
app.get('/api/jackpot/history', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, amount, won_at FROM jackpot_history ORDER BY won_at DESC LIMIT 20`
    );
    res.json({ history: result.rows.map(r => ({ ...r, amount: parseInt(r.amount) })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch jackpot history' });
  }
});


// Live $Pc price — proxies GeckoTerminal + DexScreener (no CORS issues for browser)
// Server-side 60s cache to avoid GeckoTerminal free-tier rate limits
const _pcPriceCache = { data: null, ts: 0 };
const PC_PRICE_CACHE_TTL = 60_000;

async function _fetchLivePcPriceFromSources() {
  const contractAddress = process.env.PC_TOKEN_CONTRACT;
  const pairAddress = process.env.PC_TOKEN_PAIR;
  const network = process.env.PC_TOKEN_NETWORK === 'Etherscan.io' ? 'eth' : (process.env.PC_TOKEN_NETWORK || 'eth');

  if (!contractAddress) {
    return { price: null, priceChange24h: null, volume24h: null, liquidity: null, marketCap: null, dex: null, chain: null, url: null, source: null, error: 'PC_TOKEN_CONTRACT not configured' };
  }

  // Source 1: GeckoTerminal pool endpoint (most reliable for Uniswap V3 pools)
  if (pairAddress) {
    try {
      const r = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pairAddress}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) {
        const data = await r.json();
        const attrs = data.data?.attributes;
        const price = attrs?.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null;
        if (price) {
          return {
            price,
            priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
            volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
            liquidity: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
            marketCap: null, dex: 'uniswap', chain: network,
            url: `https://www.geckoterminal.com/${network}/pools/${pairAddress}`,
            source: 'geckoterminal',
          };
        }
      }
    } catch (e) { console.error('[PcPrice] GeckoTerminal pool error:', e.message); }
  }

  // Source 2: DexScreener by token address
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      if (data.pairs?.length) {
        const pair = [...data.pairs].sort((a, b) => (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)))[0];
        return {
          price: parseFloat(pair.priceUsd || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          marketCap: pair.fdv ? parseFloat(pair.fdv) : null,
          dex: pair.dexId, chain: pair.chainId, url: pair.url, source: 'dexscreener',
        };
      }
    }
  } catch (e) { console.error('[PcPrice] DexScreener error:', e.message); }

  // Source 3: DexScreener by pair address
  if (pairAddress) {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${network}/${pairAddress}`, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const data = await r.json();
        const pair = data.pair || data.pairs?.[0];
        if (pair?.priceUsd) {
          return {
            price: parseFloat(pair.priceUsd),
            priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
            volume24h: parseFloat(pair.volume?.h24 || 0),
            liquidity: parseFloat(pair.liquidity?.usd || 0),
            marketCap: pair.fdv ? parseFloat(pair.fdv) : null,
            dex: pair.dexId, chain: pair.chainId, url: pair.url, source: 'dexscreener',
          };
        }
      }
    } catch (e) { console.error('[PcPrice] DexScreener pair error:', e.message); }
  }

  // Source 4: GeckoTerminal token endpoint
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${contractAddress}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      const attrs = data.data?.attributes;
      if (attrs?.price_usd) {
        return {
          price: parseFloat(attrs.price_usd),
          priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
          volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
          liquidity: null, marketCap: null, dex: null, chain: network,
          url: pairAddress ? `https://www.geckoterminal.com/${network}/pools/${pairAddress}` : null,
          source: 'geckoterminal',
        };
      }
    }
  } catch (e) { console.error('[PcPrice] GeckoTerminal token error:', e.message); }

  return { price: null, source: null, error: 'Price data unavailable from all sources' };
}

app.get('/api/pc-price', async (req, res) => {
  if (_pcPriceCache.data && Date.now() - _pcPriceCache.ts < PC_PRICE_CACHE_TTL) {
    return res.json(_pcPriceCache.data);
  }
  const result = await _fetchLivePcPriceFromSources();
  if (result.price) { _pcPriceCache.data = result; _pcPriceCache.ts = Date.now(); }
  res.json(result);
});

// Disputes
app.get('/api/disputes', (req, res) => { res.json({ disputes: Array.from(disputes.values()) }); });

app.post('/api/disputes', (req, res) => {
  const { userId, username, game, sessionId, description, amount, evidence } = req.body;
  if (!userId || !game || !description) return res.status(400).json({ error: 'Missing required fields' });
  const dispute = { id: `dispute_${Date.now()}`, userId, username, game, sessionId, description, amount: amount || 0, evidence: evidence || '', status: 'open', createdAt: Date.now(), updatedAt: Date.now(), resolution: null, refundAmount: null };
  disputes.set(dispute.id, dispute);
  logAdmin('dispute:created', dispute);
  io.emit('admin:disputeNew', dispute);
  res.json({ dispute });
});

app.patch('/api/disputes/:id', (req, res) => {
  const dispute = disputes.get(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Not found' });
  const { status, resolution, refundAmount, adminNote } = req.body;
  Object.assign(dispute, { status, resolution, refundAmount: refundAmount || 0, adminNote, updatedAt: Date.now() });
  disputes.set(dispute.id, dispute);
  logAdmin('dispute:updated', dispute);
  io.to(`user_${dispute.userId}`).emit('dispute:updated', dispute);
  res.json({ dispute });
});

// Tournaments
app.get('/api/tournaments', (req, res) => {
  res.json({ tournaments: Array.from(tournaments.values()) });
});

app.post('/api/tournaments/:id/register', requireAuth, (req, res) => {
  const t = tournaments.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.registeredPlayers >= t.maxPlayers) return res.status(400).json({ error: 'Tournament full' });
  const userId = req.user.id;
  const username = req.user.username;
  if (!t.registeredUserIds) t.registeredUserIds = [];
  if (t.registeredUserIds.includes(userId)) return res.status(400).json({ error: 'Already registered' });
  t.registeredUserIds.push(userId);
  t.registeredPlayers++;
  tournaments.set(t.id, t);
  logAdmin('tournament:register', { userId, username, tournamentId: t.id });
  io.emit('tournament:update', t);
  res.json({ tournament: t, success: true });
});

// Referrals
app.post('/api/referrals', requireAuth, async (req, res) => {
  // Source identity from authenticated session — ignore client-supplied body values to prevent spoofing
  const referrerId = req.user.id;
  const referrerUsername = req.user.username;
  try {
    // Check for existing code for this user in DB
    const existing = await query('SELECT code FROM referral_codes WHERE user_id = $1 LIMIT 1', [referrerId]);
    if (existing.rows.length) {
      const code = existing.rows[0].code;
      referrals.set(code, { code, referrerId, referrerUsername, uses: 0, earnings: 0, createdAt: Date.now() });
      return res.json({ referral: { code, referrerId, referrerUsername } });
    }
    // Generate new code and persist to DB — retry on collision (up to 5 attempts)
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${referrerUsername.toUpperCase().slice(0, 6)}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const inserted = await query(
        'INSERT INTO referral_codes (code, user_id) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING code',
        [candidate, referrerId]
      );
      if (inserted.rows.length) { code = inserted.rows[0].code; break; }
    }
    if (!code) return res.status(500).json({ error: 'Failed to generate unique referral code, please try again' });
    const referral = { code, referrerId, referrerUsername, uses: 0, earnings: 0, createdAt: Date.now() };
    referrals.set(code, referral);
    res.json({ referral });
  } catch (err) {
    console.error('[referrals POST]', err.message);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

// Deprecated: referral codes are now applied at registration via auth-routes.js
// against the durable referral_codes table. This endpoint is a no-op stub kept
// for backwards compatibility only.
app.post('/api/referrals/use', (req, res) => {
  res.status(410).json({ error: 'Referral codes must be applied at registration. This endpoint is deprecated.' });
});

// Public: validate a referral code and return referrer info (no auth required)
// Must be defined BEFORE /:userId wildcard to avoid being captured by it
// Validates ONLY against persisted referral_codes table (no prefix guessing)
app.get('/api/referrals/validate/:code', async (req, res) => {
  const { code } = req.params;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Invalid code' });
  try {
    // Exact match against DB — authoritative source of truth
    const result = await query(
      `SELECT rc.code, rc.user_id, u.username
       FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       WHERE rc.code = $1
       LIMIT 1`,
      [code]
    );
    if (result.rows.length) {
      const row = result.rows[0];
      // Keep in-memory map in sync for /api/referrals/use compatibility
      if (!referrals.has(code)) {
        referrals.set(code, { code, referrerId: row.user_id, referrerUsername: row.username, uses: 0, earnings: 0, createdAt: Date.now() });
      }
      return res.json({
        valid: true,
        referrerUsername: row.username,
        referrerId: row.user_id,
        welcomeBonus: 50000000,
      });
    }
    return res.status(404).json({ valid: false, error: 'Referral code not found' });
  } catch (err) {
    console.error('[referral:validate]', err.message);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

app.get('/api/referrals/:userId', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
  // Users may only view their own referrals (admins may view any)
  if (req.user.id !== userId && !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Fetch from DB to avoid in-memory type mismatch (referrerId stored as numeric id)
    const result = await query(
      `SELECT r.id, r.referred_id, r.commission_paid, r.created_at, u.username AS referred_username
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ referrals: result.rows });
  } catch (err) {
    console.error('[referrals GET]', err.message);
    res.status(500).json({ error: 'Failed to load referrals' });
  }
});

// Affiliate dashboard stats — aggregated referral data for the authenticated user
app.get('/api/affiliate/stats', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    // Get all referrals with referred user details and their deposit totals
    const referralsResult = await query(
      `SELECT
         r.id,
         r.referred_id,
         r.commission_paid,
         r.created_at,
         u.username AS referred_username,
         COALESCE(SUM(d.amount), 0) AS deposit_total
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       LEFT JOIN deposit_requests d ON d.user_id = r.referred_id AND d.status = 'approved'
       WHERE r.referrer_id = $1
       GROUP BY r.id, r.referred_id, r.commission_paid, r.created_at, u.username
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Commission earned = sum of referral_commission transactions
    const commissionResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE user_id = $1 AND type = 'referral_commission'`,
      [userId]
    );

    // Commission pending = unpaid referrals (no first deposit yet → no commission)
    // We track as: referrals where commission_paid = false (awaiting first deposit)
    const pendingCount = referralsResult.rows.filter(r => !r.commission_paid).length;
    const commissionEarned = parseInt(commissionResult.rows[0].total);

    // Pending payout = commission earned that has not been paid out yet
    // (earned commission minus any approved payout requests)
    const paidOutResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM affiliate_payout_requests
       WHERE user_id = $1 AND status = 'approved'`,
      [userId]
    );
    const commissionPendingPayout = Math.max(0, commissionEarned - parseInt(paidOutResult.rows[0].total));

    // Active payout request (pending)
    const activePayout = await query(
      `SELECT id, amount, status, created_at FROM affiliate_payout_requests
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    res.json({
      totalReferrals: referralsResult.rows.length,
      totalDeposits: referralsResult.rows.reduce((s, r) => s + parseInt(r.deposit_total), 0),
      commissionEarned,
      commissionPendingPayout,
      pendingReferrals: pendingCount,
      activePayoutRequest: activePayout.rows[0] || null,
      referrals: referralsResult.rows.map(r => ({
        id: r.id,
        referredId: r.referred_id,
        referredUsername: r.referred_username,
        joinedAt: r.created_at,
        depositTotal: parseInt(r.deposit_total),
        commissionPaid: r.commission_paid,
        commissionAmount: r.commission_paid ? Math.floor(parseInt(r.deposit_total) * 0.1) : 0,
      })),
    });
  } catch (err) {
    console.error('[affiliate stats]', err.message);
    res.status(500).json({ error: 'Failed to load affiliate stats' });
  }
});

// Request affiliate commission payout
app.post('/api/affiliate/payout-request', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    // Check for already pending request
    const existing = await query(
      `SELECT id FROM affiliate_payout_requests WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: 'You already have a pending payout request. Please wait for it to be processed.' });
    }

    // Calculate how much commission is available for payout
    const commissionResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE user_id = $1 AND type = 'referral_commission'`,
      [userId]
    );
    const paidOutResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM affiliate_payout_requests
       WHERE user_id = $1 AND status = 'approved'`,
      [userId]
    );
    const available = parseInt(commissionResult.rows[0].total) - parseInt(paidOutResult.rows[0].total);

    if (available <= 0) {
      return res.status(400).json({ error: 'No commission available to request payout for.' });
    }

    const result = await query(
      `INSERT INTO affiliate_payout_requests (user_id, amount) VALUES ($1, $2) RETURNING *`,
      [userId, available]
    );

    // Notify admin via notification to admin users
    const admins = await query(`SELECT id FROM users WHERE is_admin = TRUE`);
    for (const admin of admins.rows) {
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'affiliate_payout', 'Affiliate Payout Request', $2)",
        [admin.id, `${req.user.username} requested a payout of ${available.toLocaleString()} $Pc in affiliate commissions.`]
      ).catch(() => {});
    }

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('[affiliate payout request]', err.message);
    res.status(500).json({ error: 'Failed to create payout request' });
  }
});

// Admin: get all affiliate payout requests
app.get('/api/admin/affiliate-payouts', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await query(
      `SELECT apr.*, u.username FROM affiliate_payout_requests apr
       JOIN users u ON u.id = apr.user_id
       ORDER BY apr.created_at DESC LIMIT 100`
    );
    res.json({ payouts: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payout requests' });
  }
});

// Admin: approve affiliate payout request
app.post('/api/admin/affiliate-payouts/:id/approve', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const pr = await query('SELECT * FROM affiliate_payout_requests WHERE id = $1', [req.params.id]);
    if (!pr.rows.length) return res.status(404).json({ error: 'Not found' });
    const p = pr.rows[0];
    if (p.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    await query(
      `UPDATE affiliate_payout_requests SET status = 'approved', processed_at = NOW(), admin_note = $1 WHERE id = $2`,
      [req.body.note || null, p.id]
    );
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'affiliate_payout', 'Affiliate Payout Approved ✅', $2)",
      [p.user_id, `Your affiliate commission payout of ${parseInt(p.amount).toLocaleString()} $Pc has been approved and is being processed.`]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Admin: reject affiliate payout request
app.post('/api/admin/affiliate-payouts/:id/reject', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const pr = await query('SELECT * FROM affiliate_payout_requests WHERE id = $1', [req.params.id]);
    if (!pr.rows.length) return res.status(404).json({ error: 'Not found' });
    if (pr.rows[0].status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    await query(
      `UPDATE affiliate_payout_requests SET status = 'rejected', processed_at = NOW(), admin_note = $1 WHERE id = $2`,
      [req.body.note || null, pr.rows[0].id]
    );
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'affiliate_payout', 'Affiliate Payout Rejected', $2)",
      [pr.rows[0].user_id, `Your affiliate payout request was rejected. ${req.body.note ? 'Reason: ' + req.body.note : 'Please contact support for details.'}`]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// ---- Provably Fair API routes ----
// Create a new game round — commits server seed hash to client BEFORE round plays out.
app.post('/api/provably-fair/new-round', requireAuth, async (req, res) => {
  const { game, clientSeed, nonce } = req.body;
  if (!game || !clientSeed || nonce === undefined) {
    return res.status(400).json({ error: 'game, clientSeed, and nonce are required' });
  }
  const ALLOWED_GAMES = ['slots', 'roulette', 'blackjack', 'dice'];
  if (!ALLOWED_GAMES.includes(game)) {
    return res.status(400).json({ error: `Invalid game. Must be one of: ${ALLOWED_GAMES.join(', ')}` });
  }
  try {
    const { roundId, serverSeedHash } = await createGameRound(req.user.id, game, clientSeed, nonce);
    res.json({ roundId, serverSeedHash });
  } catch (err) {
    console.error('[PF] new-round error:', err.message);
    res.status(500).json({ error: 'Failed to create game round' });
  }
});

const parseRoundId = (param) => {
  const id = parseInt(param, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
};

// Blackjack: created → dealing, returns initial 4 cards
app.post('/api/provably-fair/blackjack-deal/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseRoundId(req.params.roundId);
    if (!roundId) return res.status(400).json({ error: 'Invalid round ID' });
    const { rows } = await query(
      `UPDATE game_rounds SET status = 'dealing', draw_index = 4
       WHERE id = $1 AND user_id = $2 AND game = 'blackjack' AND status = 'created'
       RETURNING result, server_seed_hash`,
      [roundId, req.user.id]
    );
    if (!rows.length) {
      const check = await query('SELECT status, user_id FROM game_rounds WHERE id = $1', [roundId]);
      if (!check.rows.length) return res.status(404).json({ error: 'Round not found' });
      if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      return res.status(409).json({ error: `Round already ${check.rows[0].status}` });
    }
    const cards = rows[0].result?.cards;
    if (!cards || cards.length < 4) return res.status(500).json({ error: 'Invalid round data' });
    res.json({ cards: cards.slice(0, 4), serverSeedHash: rows[0].server_seed_hash });
  } catch (err) {
    console.error('[PF] blackjack-deal error:', err.message);
    res.status(500).json({ error: 'Failed to deal blackjack hand' });
  }
});

// Blackjack: atomically advance draw_index, return next card
app.post('/api/provably-fair/blackjack-draw/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseRoundId(req.params.roundId);
    if (!roundId) return res.status(400).json({ error: 'Invalid round ID' });
    const { rows } = await query(
      `UPDATE game_rounds SET draw_index = draw_index + 1
       WHERE id = $1 AND user_id = $2 AND game = 'blackjack' AND status = 'dealing'
       RETURNING result, draw_index`,
      [roundId, req.user.id]
    );
    if (!rows.length) {
      const check = await query('SELECT status, user_id FROM game_rounds WHERE id = $1', [roundId]);
      if (!check.rows.length) return res.status(404).json({ error: 'Round not found' });
      if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      return res.status(409).json({ error: `Cannot draw: round is ${check.rows[0].status}` });
    }
    const cards = rows[0].result?.cards;
    const idx = rows[0].draw_index - 1;
    if (!cards || idx >= cards.length) return res.status(410).json({ error: 'Deck exhausted' });
    res.json({ card: cards[idx] });
  } catch (err) {
    console.error('[PF] blackjack-draw error:', err.message);
    res.status(500).json({ error: 'Failed to draw card' });
  }
});

// Blackjack: dealing → finished (must precede resolve)
app.post('/api/provably-fair/blackjack-finish/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseRoundId(req.params.roundId);
    if (!roundId) return res.status(400).json({ error: 'Invalid round ID' });
    const { rows } = await query(
      `UPDATE game_rounds SET status = 'finished'
       WHERE id = $1 AND user_id = $2 AND game = 'blackjack' AND status = 'dealing'
       RETURNING id`,
      [roundId, req.user.id]
    );
    if (!rows.length) {
      const check = await query('SELECT status, user_id FROM game_rounds WHERE id = $1', [roundId]);
      if (!check.rows.length) return res.status(404).json({ error: 'Round not found' });
      if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      return res.status(409).json({ error: `Cannot finish: round is ${check.rows[0].status}` });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[PF] blackjack-finish error:', err.message);
    res.status(500).json({ error: 'Failed to finish blackjack round' });
  }
});

// Resolve: blackjack requires finished→resolved; others require created→resolved.
// Returns minimal result only (blackjack: card count, not full deck).
app.post('/api/provably-fair/resolve/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseRoundId(req.params.roundId);
    if (!roundId) return res.status(400).json({ error: 'Invalid round ID' });
    const { rows: checkRows } = await query(
      'SELECT game, status, user_id, result, server_seed_hash FROM game_rounds WHERE id = $1',
      [roundId]
    );
    if (!checkRows.length) return res.status(404).json({ error: 'Round not found' });
    const round = checkRows[0];
    if (round.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const validFrom = round.game === 'blackjack' ? ['finished'] : ['created'];
    if (!validFrom.includes(round.status)) {
      return res.status(409).json({ error: `Cannot resolve: round is ${round.status}` });
    }
    await query(`UPDATE game_rounds SET status = 'resolved' WHERE id = $1`, [roundId]);
    let safeResult = round.result;
    if (round.game === 'blackjack' && safeResult?.cards) {
      safeResult = { cardCount: safeResult.cards.length };
    }
    res.json({ result: safeResult, serverSeedHash: round.server_seed_hash });
  } catch (err) {
    console.error('[PF] resolve error:', err.message);
    res.status(500).json({ error: 'Failed to resolve round' });
  }
});

// Reveal: resolved → revealed. Returns server seed for independent verification.
app.post('/api/provably-fair/reveal/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseRoundId(req.params.roundId);
    if (!roundId) return res.status(400).json({ error: 'Invalid round ID' });
    const statusCheck = await query(
      'SELECT status, user_id FROM game_rounds WHERE id = $1',
      [roundId]
    );
    if (!statusCheck.rows.length) return res.status(404).json({ error: 'Round not found' });
    const row = statusCheck.rows[0];
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (row.status !== 'resolved') {
      return res.status(409).json({ error: `Cannot reveal: round is ${row.status}` });
    }
    const data = await revealGameRound(roundId, req.user.id);
    if (!data) return res.status(404).json({ error: 'Round not found or already revealed' });
    res.json({
      serverSeed: data.server_seed,
      serverSeedHash: data.server_seed_hash,
      clientSeed: data.client_seed,
      nonce: data.nonce,
      game: data.game,
      result: data.result,
    });
  } catch (err) {
    console.error('[PF] reveal error:', err.message);
    res.status(500).json({ error: 'Failed to reveal round' });
  }
});

// Public round lookup — only revealed rounds, user_id excluded.
// Intentionally unauthenticated: provably-fair requires players can share round IDs
// with third parties for independent verification without needing an account.
app.get('/api/provably-fair/verify/:roundId', async (req, res) => {
  try {
    const roundId = parseRoundId(req.params.roundId);
    if (!roundId) return res.status(400).json({ error: 'Invalid round ID' });
    const round = await getGameRound(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });
    if (!round.revealed_at) return res.status(403).json({ error: 'Round not yet revealed' });
    const { server_seed, server_seed_hash, client_seed, nonce, game, result, created_at, revealed_at } = round;
    res.json({ server_seed, server_seed_hash, client_seed, nonce, game, result, created_at, revealed_at });
  } catch (err) {
    res.status(500).json({ error: 'Verification lookup failed' });
  }
});

app.post('/api/provably-fair/verify', (req, res) => {
  const { game, serverSeed, clientSeed, nonce } = req.body;
  if (!game || !serverSeed || !clientSeed || nonce === undefined) {
    return res.status(400).json({ error: 'game, serverSeed, clientSeed, nonce required' });
  }
  try {
    const serverSeedHash = hashServerSeed(serverSeed);
    const result = deriveGameResult(game, serverSeed, clientSeed, nonce);
    res.json({ serverSeedHash, result, valid: true });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// PcPayments API integration — admin-only endpoints
app.get('/api/pcpayments/config', requireAuth, (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin only' });
  res.json({ config: { ...pcpaymentsConfig, apiKey: pcpaymentsConfig.apiKey ? '***configured***' : '', webhookSecret: pcpaymentsConfig.webhookSecret ? '***set***' : '' } });
});

app.post('/api/pcpayments/config', requireAuth, (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin only' });
  const { apiKey, webhookSecret, endpoint, enabled } = req.body;
  if (apiKey) pcpaymentsConfig.apiKey = apiKey;
  // Only allow setting webhookSecret via runtime config if env var is not already set
  if (webhookSecret && !process.env.PCPAY_WEBHOOK_SECRET) pcpaymentsConfig.webhookSecret = webhookSecret;
  if (endpoint) pcpaymentsConfig.endpoint = endpoint;
  if (enabled !== undefined) pcpaymentsConfig.enabled = enabled;
  logAdmin('pcpayments:configured', { endpoint: pcpaymentsConfig.endpoint, enabled: pcpaymentsConfig.enabled });
  res.json({ success: true, config: { ...pcpaymentsConfig, apiKey: '***set***', webhookSecret: '***set***' } });
});

// PcPay checkout initiation — calls pcpayments.online on behalf of the user
app.post('/api/deposit/initiate', requireAuth, async (req, res) => {
  const apiKey = process.env.PCPAY_API_KEY || pcpaymentsConfig.apiKey;
  if (!apiKey) {
    return res.status(503).json({ error: 'PCPAY_NOT_CONFIGURED' });
  }
  const { amount } = req.body;
  const parsedAmount = parseInt(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  const userId = req.user.id;
  const username = req.user.username;
  const siteUrl = process.env.SITE_URL || 'https://pccasino.online';
  try {
    const response = await fetch('https://pcpayments.online/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PcPay-Key': apiKey,
      },
      body: JSON.stringify({
        amount: parsedAmount,
        currency: 'PC',
        userId: String(userId),
        username,
        callbackUrl: `${siteUrl}/api/pcpayments/webhook`,
        returnUrl: siteUrl,
        metadata: { casinoUserId: userId },
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[PcPay checkout] Error', response.status, data);
      return res.status(502).json({ error: data.error || 'PcPay checkout failed', status: response.status });
    }
    console.log('[PcPay checkout] Session created for user', userId, 'amount', parsedAmount);
    res.json(data);
  } catch (err) {
    console.error('[PcPay checkout] Exception:', err.message);
    res.status(502).json({ error: 'PcPay checkout unavailable. Try again later.' });
  }
});

// Token info endpoint — returns contract address & network so frontend can display it
app.get('/api/pc-token-info', (req, res) => {
  const contractAddress = process.env.PC_TOKEN_CONTRACT || null;
  const network = process.env.PC_TOKEN_NETWORK || 'eth';
  const pcpayEnabled = !!(process.env.PCPAY_API_KEY || pcpaymentsConfig.apiKey);
  res.json({ contractAddress, network, pcpayEnabled });
});

// PcPay webhook - auto-credit user balance
// Raw body captured by the path-specific middleware registered before express.json()
app.post('/api/pcpayments/webhook', async (req, res) => {
  // --- Signature validation (fail-closed) ---
  const webhookSecret = process.env.PCPAY_WEBHOOK_SECRET || pcpaymentsConfig.webhookSecret;

  // If no secret is configured, refuse all webhook requests to prevent unauthenticated credits
  if (!webhookSecret) {
    console.error('[PcPay webhook] PCPAY_WEBHOOK_SECRET is not configured — rejecting webhook');
    return res.status(503).json({ error: 'Webhook not configured. Set PCPAY_WEBHOOK_SECRET.' });
  }

  const sigHeader = req.headers['x-pcpay-signature'] || req.headers['x-webhook-signature'];
  if (!sigHeader) {
    console.warn('[PcPay webhook] Missing signature header — rejected');
    return res.status(401).json({ error: 'Missing signature' });
  }

  try {
    // Use req.rawBody captured before express.json() consumed the stream
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    const provided = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : sigHeader;
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(provided, 'hex');
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      console.warn('[PcPay webhook] Invalid signature — rejected');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    console.warn('[PcPay webhook] Signature check error:', err.message);
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  // Parse body from raw bytes (express.json() may or may not have run depending on content-type)
  let body;
  try {
    body = req.rawBody ? JSON.parse(req.rawBody.toString()) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { type, userId: bodyUserId, amount, txHash, fromAddress, network } = body;
  logAdmin('pcpayments:webhook', { type, userId: bodyUserId, amount, txHash });

  if (type === 'deposit' && amount > 0) {
    try {
      // Resolve user: prefer lookup by wallet_address (fromAddress), fallback to userId
      let resolvedUserId = null;
      if (fromAddress) {
        const byWallet = await query(
          'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1',
          [fromAddress]
        );
        if (byWallet.rows.length) resolvedUserId = byWallet.rows[0].id;
      }
      // If wallet lookup fails and userId provided in body (only trusted when signature validated)
      if (!resolvedUserId && bodyUserId && webhookSecret) {
        resolvedUserId = bodyUserId;
      }
      if (!resolvedUserId) {
        console.warn('[PcPay webhook] Could not resolve user for deposit', { fromAddress, bodyUserId });
        return res.status(422).json({ received: true, error: 'User not found' });
      }

      const userId = resolvedUserId;

      // Auto-approve deposit and credit balance
      await query('BEGIN');
      // Idempotency: skip if same txHash already recorded
      if (txHash) {
        const existing = await query('SELECT id FROM deposit_requests WHERE tx_hash = $1', [txHash]);
        if (existing.rows.length) {
          await query('ROLLBACK');
          return res.json({ received: true, duplicate: true });
        }
      }
      await query(
        `INSERT INTO deposit_requests (user_id, amount, tx_hash, from_address, network, status, processed_at)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', NOW())`,
        [userId, amount, txHash || null, fromAddress || null, network || 'ERC-20']
      );
      await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, userId]);
      await query(
        'INSERT INTO transactions (user_id, type, amount, description, status) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'deposit', amount, `Auto-credited via PcPay webhook - ${txHash ? txHash.slice(0, 12) : 'N/A'}`, 'confirmed']
      );
      // Update leaderboard
      await query(
        `INSERT INTO leaderboard (user_id, username, balance)
         SELECT id, username, balance FROM users WHERE id = $1
         ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance`,
        [userId]
      );
      await query('COMMIT');

      // First-deposit referral commission: single DB client transaction for true atomicity
      // commission_paid flips only if balance credit + transaction record both succeed
      const commClient = await pool.connect();
      try {
        await commClient.query('BEGIN');
        const ref = await commClient.query(
          `UPDATE referrals SET commission_paid = TRUE
           WHERE referred_id = $1 AND commission_paid = FALSE
           RETURNING referrer_id`,
          [userId]
        );
        if (ref.rows.length) {
          const referrerId = ref.rows[0].referrer_id;
          const commission = Math.floor(parseInt(amount) * 0.1);
          await commClient.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [commission, referrerId]);
          await commClient.query(
            'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
            [referrerId, 'referral_commission', commission, `Referral commission from user #${userId} first deposit`]
          );
          await commClient.query('COMMIT');
          // Notification is outside the transaction — non-fatal side effect
          await query(
            "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'referral', 'Referral Commission! 🎉', $2)",
            [referrerId, `You earned ${commission.toLocaleString()} $Pc (10%) referral commission from your friend's first deposit!`]
          );
          io.to(`user_${referrerId}`).emit('referral:commission', { amount: commission });
        } else {
          await commClient.query('ROLLBACK');
        }
      } catch (commErr) {
        await commClient.query('ROLLBACK').catch(() => {});
        console.error('[referral commission webhook]', commErr.message);
      } finally {
        commClient.release();
      }

      // Notify user in-app
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', '✅ Deposit Confirmed!', $2)",
        [userId, `Deposit of ${parseInt(amount).toLocaleString()} $Pc confirmed — your balance has been updated.`]
      );

      const balResult = await query('SELECT balance, username FROM users WHERE id = $1', [userId]);
      if (balResult.rows[0]) {
        io.to(`user_${userId}`).emit('payment:deposit:confirmed', {
          amount,
          balance: parseInt(balResult.rows[0].balance),
          txHash,
          auto: true,
        });
      }
    } catch (err) {
      await query('ROLLBACK').catch(() => {});
      console.error('[PcPay webhook] Error:', err.message);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  } else if (type === 'withdrawal' && bodyUserId) {
    io.to(`user_${bodyUserId}`).emit('payment:withdrawal', { amount, txHash });
  }

  res.json({ received: true });
});

// Admin routes
app.get('/api/admin/users', (req, res) => {
  const list = Array.from(players.values()).map(p => ({ id: p.id, username: p.username, balance: p.balance, roomId: p.roomId, connectedAt: p.connectedAt }));
  res.json({ users: list, total: list.length });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    playersOnline: players.size,
    activeTables: rooms.size,
    activeDisputes: Array.from(disputes.values()).filter(d => d.status === 'open').length,
    activeTournaments: Array.from(tournaments.values()).filter(t => t.status !== 'finished').length,
    totalReferrals: referrals.size,
    jackpot: getJackpot(),
    adminLogs: adminLogs.slice(0, 20),
  });
});

app.get('/api/admin/logs', (req, res) => { res.json({ logs: adminLogs }); });

// VIP cashback history — per user
app.get('/api/vip/cashback-history', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, vip_tier, cashback_rate, net_losses, cashback_amount, week_start, week_end, created_at
       FROM cashback_payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 52`,
      [req.user.id]
    );
    res.json({
      history: result.rows.map(r => ({
        id: r.id,
        tier: r.vip_tier,
        rate: parseFloat(r.cashback_rate),
        netLosses: parseInt(r.net_losses),
        amount: parseInt(r.cashback_amount),
        weekStart: r.week_start,
        weekEnd: r.week_end,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cashback history' });
  }
});

// Admin: all cashback payments log
app.get('/api/admin/cashback-log', async (req, res) => {
  try {
    const result = await query(
      `SELECT cp.id, cp.user_id, cp.username, cp.vip_tier, cp.cashback_rate,
              cp.net_losses, cp.cashback_amount, cp.week_start, cp.week_end, cp.created_at
       FROM cashback_payments cp
       ORDER BY cp.created_at DESC
       LIMIT 200`
    );
    res.json({
      payments: result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        tier: r.vip_tier,
        rate: parseFloat(r.cashback_rate),
        netLosses: parseInt(r.net_losses),
        amount: parseInt(r.cashback_amount),
        weekStart: r.week_start,
        weekEnd: r.week_end,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cashback log' });
  }
});

app.post('/api/admin/broadcast', (req, res) => {
  const { message, type } = req.body;
  io.emit('admin:broadcast', { message, type: type || 'info', timestamp: Date.now() });
  logAdmin('broadcast', { message });
  res.json({ success: true });
});

app.post('/api/admin/disputes/:id/resolve', (req, res) => {
  const dispute = disputes.get(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Not found' });
  const { resolution, refundAmount, status } = req.body;
  Object.assign(dispute, { status: status || 'resolved', resolution, refundAmount: refundAmount || 0, updatedAt: Date.now() });
  disputes.set(dispute.id, dispute);
  logAdmin('admin:dispute:resolved', dispute);
  io.to(`user_${dispute.userId}`).emit('dispute:updated', dispute);
  if (refundAmount) io.to(`user_${dispute.userId}`).emit('payment:refund', { amount: refundAmount, disputeId: dispute.id });
  res.json({ dispute });
});

// ---- OAuth Routes ----
const OAUTH_BASE = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:3001'}`;

// CSRF state store — maps random state token → { provider, expiresAt }
const oauthStates = new Map();
function generateOAuthState(provider) {
  const state = randomBytes(32).toString('hex');
  // Expire after 10 minutes
  oauthStates.set(state, { provider, expiresAt: Date.now() + 10 * 60 * 1000 });
  // Clean up expired states
  for (const [k, v] of oauthStates) {
    if (v.expiresAt < Date.now()) oauthStates.delete(k);
  }
  return state;
}
function validateOAuthState(state, expectedProvider) {
  const entry = oauthStates.get(state);
  if (!entry || entry.expiresAt < Date.now() || entry.provider !== expectedProvider) return false;
  oauthStates.delete(state); // consume — one-time use
  return true;
}
// Generate a unique username, falling back to numeric suffixes only when needed
async function makeUniqueUsername(base) {
  const clean = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
  const existing = await query('SELECT id FROM users WHERE username = $1', [clean]);
  if (!existing.rows.length) return clean;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${clean.slice(0, 17)}_${i}`;
    const ex = await query('SELECT id FROM users WHERE username = $1', [candidate]);
    if (!ex.rows.length) return candidate;
  }
  return `${clean.slice(0, 14)}_${randomBytes(3).toString('hex')}`;
}

app.get('/api/auth/oauth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.redirect(`/?oauth_error=google_not_configured`);
  const state = generateOAuthState('google');
  const redirectUri = `${OAUTH_BASE}/api/auth/oauth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/api/auth/oauth/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error || !code) return res.redirect(`/?oauth_error=${error || 'cancelled'}`);
  if (!state || !validateOAuthState(state, 'google')) return res.redirect(`/?oauth_error=invalid_state`);
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${OAUTH_BASE}/api/auth/oauth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('No access token');
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileRes.json();
    const socialAvatarUrl = profile.picture || null;
    const { default: jwt } = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'pcasino-secret-jwt-key-2024';
    let user;
    // 1. Check by social provider + id
    let existing = await query('SELECT * FROM users WHERE social_provider = $1 AND social_id = $2', ['google', profile.id]);
    if (existing.rows.length) {
      user = existing.rows[0];
      await query('UPDATE users SET last_seen = NOW(), email = COALESCE(email, $1), social_avatar_url = $2 WHERE id = $3',
        [profile.email, socialAvatarUrl, user.id]);
    } else if (profile.email) {
      // 2. Check if email already registered — link social to existing account
      const byEmail = await query('SELECT * FROM users WHERE email = $1', [profile.email]);
      if (byEmail.rows.length) {
        user = byEmail.rows[0];
        await query('UPDATE users SET social_provider = $1, social_id = $2, email_verified = true, last_seen = NOW(), social_avatar_url = $3 WHERE id = $4',
          ['google', profile.id, socialAvatarUrl, user.id]);
      }
    }
    if (!user) {
      // 3. Create new user — use actual display name, no random suffix unless needed
      const displayName = profile.name || profile.email.split('@')[0];
      const username = await makeUniqueUsername(displayName);
      const result = await query(
        `INSERT INTO users (username, email, social_provider, social_id, email_verified, balance, avatar, social_avatar_url)
         VALUES ($1, $2, 'google', $3, true, 1000000000, 'wizard', $4) RETURNING *`,
        [username, profile.email, profile.id, socialAvatarUrl]
      );
      user = result.rows[0];
      await query("INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'welcome', 'Welcome to $Pc Casino!', $2)",
        [user.id, `Welcome ${user.username}! You've received 1,000,000,000 $Pc to start playing.`]);
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    await query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [user.id, token]);
    res.redirect(`/?oauth_token=${token}&oauth_provider=google`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`/?oauth_error=google_failed`);
  }
});

app.get('/api/auth/oauth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return res.redirect(`/?oauth_error=discord_not_configured`);
  const state = generateOAuthState('discord');
  const redirectUri = `${OAUTH_BASE}/api/auth/oauth/discord/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/api/auth/oauth/discord/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error || !code) return res.redirect(`/?oauth_error=${error || 'cancelled'}`);
  if (!state || !validateOAuthState(state, 'discord')) return res.redirect(`/?oauth_error=invalid_state`);
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = `${OAUTH_BASE}/api/auth/oauth/discord/callback`;
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('No access token');
    const profileRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileRes.json();
    const socialAvatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.webp?size=128`
      : null;
    const { default: jwt } = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'pcasino-secret-jwt-key-2024';
    let user;
    // 1. Check by social provider + id
    let existing = await query('SELECT * FROM users WHERE social_provider = $1 AND social_id = $2', ['discord', profile.id]);
    if (existing.rows.length) {
      user = existing.rows[0];
      await query('UPDATE users SET last_seen = NOW(), social_avatar_url = COALESCE($1, social_avatar_url) WHERE id = $2',
        [socialAvatarUrl, user.id]);
    } else if (profile.email) {
      // 2. Check if email already registered — link social to existing account
      const byEmail = await query('SELECT * FROM users WHERE email = $1', [profile.email]);
      if (byEmail.rows.length) {
        user = byEmail.rows[0];
        await query('UPDATE users SET social_provider = $1, social_id = $2, email_verified = true, last_seen = NOW(), social_avatar_url = COALESCE($3, social_avatar_url) WHERE id = $4',
          ['discord', profile.id, socialAvatarUrl, user.id]);
      }
    }
    if (!user) {
      // 3. Create new user — use actual display name, no random suffix unless needed
      const displayName = profile.global_name || profile.username || 'user';
      const username = await makeUniqueUsername(displayName);
      const result = await query(
        `INSERT INTO users (username, email, social_provider, social_id, email_verified, balance, avatar, social_avatar_url)
         VALUES ($1, $2, 'discord', $3, $4, 1000000000, 'wizard', $5) RETURNING *`,
        [username, profile.email || null, profile.id, !!profile.email, socialAvatarUrl]
      );
      user = result.rows[0];
      await query("INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'welcome', 'Welcome to $Pc Casino!', $2)",
        [user.id, `Welcome ${user.username}! You've received 1,000,000,000 $Pc to start playing.`]);
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    await query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [user.id, token]);
    res.redirect(`/?oauth_token=${token}&oauth_provider=discord`);
  } catch (err) {
    console.error('Discord OAuth error:', err);
    res.redirect(`/?oauth_error=discord_failed`);
  }
});

// Twitter OAuth — Coming Soon (disabled until production-grade PKCE + state handling is implemented)
app.get('/api/auth/oauth/twitter', (req, res) => {
  res.redirect(`/?oauth_error=twitter_coming_soon`);
});

app.get('/api/auth/oauth/twitter/callback', (req, res) => {
  res.redirect(`/?oauth_error=twitter_coming_soon`);
});


  // ---- Multiplayer Roulette Room Engine ----
  const rouletteRoom = {
    id: 'roulette-main',
    players: new Map(),
    phase: 'waiting',
    timer: 0,
    result: null,
    roundId: 0,
    intervalId: null,
    BETTING_DURATION: 30,
    SPIN_DURATION: 12,
    history: [],
  };

  function rouletteGetPlayers() {
    return Array.from(rouletteRoom.players.values()).map(p => ({
      id: p.id, socketId: p.socketId, username: p.username,
      avatarUrl: p.avatarUrl, avatar: p.avatar,
      betTotal: p.betTotal || 0, lastWin: p.lastWin || 0,
    }));
  }

  function rouletteBroadcast(event, data) {
    for (const [sid] of rouletteRoom.players) {
      io.to(sid).emit(event, data);
    }
  }

  function rouletteStartRound() {
    rouletteRoom.roundId++;
    rouletteRoom.phase = 'betting';
    rouletteRoom.timer = rouletteRoom.BETTING_DURATION;
    rouletteRoom.result = null;
    for (const p of rouletteRoom.players.values()) {
      p.betTotal = 0;
      p.lastWin = 0;
      p.betsLocked = false;
      p.bets = [];
    }
    rouletteBroadcast('roulette:state', {
      phase: 'betting', timer: rouletteRoom.timer, roundId: rouletteRoom.roundId,
      players: rouletteGetPlayers(), history: rouletteRoom.history,
    });
  }

  async function rouletteTickTimer() {
    if (rouletteRoom.players.size === 0) {
      rouletteRoom.phase = 'waiting';
      if (rouletteRoom.intervalId) { clearInterval(rouletteRoom.intervalId); rouletteRoom.intervalId = null; }
      return;
    }
    if (rouletteRoom.phase === 'betting') {
      rouletteRoom.timer--;
      if (rouletteRoom.timer <= 0) {
        rouletteRoom.phase = 'spinning';
        rouletteRoom.result = Math.floor(Math.random() * 37);
        for (const p of rouletteRoom.players.values()) { p.betsLocked = true; }
        const balanceChecks = [];
        for (const [sid, p] of rouletteRoom.players) {
          if (p.betTotal > 0 && p.id && p.id !== sid) {
            balanceChecks.push(
              query('SELECT balance FROM users WHERE id = $1', [p.id])
                .then(r => { if (r.rows[0]) p.balance = r.rows[0].balance; })
                .catch(() => {})
            );
          }
        }
        if (balanceChecks.length > 0) await Promise.all(balanceChecks);
        for (const [, p] of rouletteRoom.players) {
          if (p.betTotal > p.balance) { p.bets = []; p.betTotal = 0; }
        }
        rouletteRoom.history.unshift(rouletteRoom.result);
        if (rouletteRoom.history.length > 20) rouletteRoom.history.length = 20;
        const settlePromises = [];
        for (const [sid, p] of rouletteRoom.players) {
          const payout = (p.bets && p.bets.length > 0) ? rouletteResolveBets(p.bets, rouletteRoom.result) : 0;
          const stake = p.betTotal || 0;
          const netChange = payout - stake;
          p.lastWin = payout;
          p.balance = Math.max(0, (p.balance || 0) + netChange);
          if (netChange !== 0 && p.id && p.id !== sid) {
            settlePromises.push(
              query('UPDATE users SET balance = balance + $1 WHERE id = $2 AND balance + $1 >= 0', [netChange, p.id])
                .catch(err => console.error('[Roulette] DB settle error:', err.message))
            );
          }
          io.to(sid).emit('roulette:spin', {
            result: rouletteRoom.result, roundId: rouletteRoom.roundId,
            players: rouletteGetPlayers(), netChange, newBalance: p.balance,
          });
        }
        if (settlePromises.length > 0) Promise.all(settlePromises).catch(() => {});
        console.log('[Roulette] Round ' + rouletteRoom.roundId + ' result: ' + rouletteRoom.result + ' (' + rouletteRoom.players.size + ' players)');
        rouletteRoom.timer = rouletteRoom.SPIN_DURATION;
      } else {
        rouletteBroadcast('roulette:state', {
          phase: 'betting', timer: rouletteRoom.timer, roundId: rouletteRoom.roundId,
          players: rouletteGetPlayers(),
        });
      }
    } else if (rouletteRoom.phase === 'spinning') {
      rouletteRoom.timer--;
      if (rouletteRoom.timer <= 0) {
        rouletteStartRound();
      }
    }
  }

  function rouletteEnsureTimer() {
    if (!rouletteRoom.intervalId) {
      rouletteRoom.intervalId = setInterval(rouletteTickTimer, 1000);
      rouletteStartRound();
    }
  }

  
  // Roulette payout calculator
  const ROULETTE_RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const ROULETTE_BLACK = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

  const VALID_ROULETTE_BETS = new Set();
  (function buildCanonicalBets() {
    const add = (arr) => VALID_ROULETTE_BETS.add(JSON.stringify([...arr].sort((a,b)=>a-b)));
    for (let i = 0; i <= 36; i++) add([i]);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 3; c++) {
      const n = r*3+c+1;
      if (c < 2) add([n, n+1]);
      if (r < 11) add([n, n+3]);
    }
    add([0,1]); add([0,2]); add([0,3]);
    for (let r = 0; r < 12; r++) { const s = r*3+1; add([s,s+1,s+2]); }
    add([0,1,2]); add([0,2,3]);
    for (let r = 0; r < 11; r++) for (let c = 0; c < 2; c++) {
      const n = r*3+c+1; add([n,n+1,n+3,n+4]);
    }
    add([0,1,2,3]);
    for (let r = 0; r < 11; r++) { const s = r*3+1; add([s,s+1,s+2,s+3,s+4,s+5]); }
    add(Array.from({length:12},(_,i)=>i+1));
    add(Array.from({length:12},(_,i)=>i+13));
    add(Array.from({length:12},(_,i)=>i+25));
    add([1,4,7,10,13,16,19,22,25,28,31,34]);
    add([2,5,8,11,14,17,20,23,26,29,32,35]);
    add([3,6,9,12,15,18,21,24,27,30,33,36]);
    add(ROULETTE_RED); add(ROULETTE_BLACK);
    add(Array.from({length:18},(_,i)=>i+1));
    add(Array.from({length:18},(_,i)=>i+19));
    const odd = [], even = [];
    for (let i = 1; i <= 36; i++) { if (i%2===1) odd.push(i); else even.push(i); }
    add(odd); add(even);
  })();

  function rouletteValidateBet(bet) {
    if (!bet || typeof bet.amount !== 'number' || bet.amount <= 0 || bet.amount > 500000000) return null;
    if (!Array.isArray(bet.numbers)) return null;
    const nums = [...new Set(bet.numbers.filter(n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 36))].sort((a,b)=>a-b);
    if (nums.length === 0) return null;
    const key = JSON.stringify(nums);
    if (!VALID_ROULETTE_BETS.has(key)) return null;
    return { amount: bet.amount, numbers: nums };
  }

  function rouletteResolveBets(playerBets, result) {
    let totalPayout = 0;
    for (const bet of playerBets) {
      const nums = bet.numbers;
      const amt = bet.amount;
      if (!Array.isArray(nums) || typeof amt !== 'number' || amt <= 0) continue;
      if (nums.includes(result)) {
        let multiplier = 0;
        const len = nums.length;
        if (len === 1) multiplier = 36;
        else if (len === 2) multiplier = 18;
        else if (len === 3) multiplier = 12;
        else if (len === 4) multiplier = 9;
        else if (len === 6) multiplier = 6;
        else if (len === 12) multiplier = 3;
        else if (len === 18) multiplier = 2;
        else multiplier = Math.floor(36 / len);
        totalPayout += amt * multiplier;
      }
    }
    return totalPayout;
  }

  // ---- Socket.io events ----
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on('player:identify', async ({ username, balance, avatar, userId, avatarUrl }) => {
    let vipTier = 'bronze';
    if (userId) {
      try {
        const r = await query('SELECT vip_tier FROM users WHERE id = $1', [userId]);
        if (r.rows.length) vipTier = r.rows[0].vip_tier || 'bronze';
      } catch {}
    }
    const player = { id: userId || socket.id, socketId: socket.id, username, balance, avatar, avatarUrl: avatarUrl || null, vipTier, roomId: null, seat: null, isReady: false, connectedAt: Date.now() };
    players.set(socket.id, player);
    if (userId) socket.join(`user_${userId}`);
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    const dbData = await getLeaderboardFromDB();
    socket.emit('leaderboard:update', { leaderboard: dbData || leaderboard, lastUpdated: Date.now() });
    socket.emit('winners:list', { winners: recentWinners.slice(0, 10) });
    socket.emit('jackpot:update', { amount: getJackpot(), lastWon: getJackpotLastWon() });
    io.emit('lobby:stats', { playersOnline: players.size });
  });

  socket.on('lobby:get', async () => {
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    socket.emit('lobby:stats', { playersOnline: players.size });
    const dbData = await getLeaderboardFromDB('alltime');
    socket.emit('leaderboard:update', { leaderboard: dbData, lastUpdated: Date.now() });
    socket.emit('winners:list', { winners: recentWinners.slice(0, 10) });
  });

  socket.on('room:create', ({ game, name, minBet, maxBet, isPrivate, username, balance, avatar, avatarUrl }, cb) => {
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, avatarUrl: avatarUrl || null, isReady: false };
    players.set(socket.id, { ...player, roomId: null, seat: 0 });
    const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
    const roomId = generateRoomId();
    const existingPlayer = players.get(socket.id);
    const newRoom = { id: roomId, game, name: name || `${username}'s Table`, minBet: minBet || 10, maxBet: maxBet || 1000, maxPlayers, players: [{ id: socket.id, username, balance, avatar, avatarUrl: avatarUrl || null, vipTier: existingPlayer?.vipTier || 'bronze', seat: 0, isReady: false }], status: 'waiting', pot: 0, createdAt: Date.now(), isPrivate: !!isPrivate, hostId: socket.id, gameState: null, chat: [] };
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    players.get(socket.id).roomId = roomId;
    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room: newRoom, playerId: socket.id });
  });

  socket.on('room:join', ({ roomId, username, balance, avatar, avatarUrl }, cb) => {
    if (roomId === 'roulette-main') {
      rouletteJoinPlayer();
      if (cb) cb({ success: true, roomId: 'roulette-main' });
      socket.emit('room:joined', { room: { id: 'roulette-main', game: 'roulette', name: 'Roulette Table', players: rouletteGetPlayers(), status: rouletteRoom.phase }, playerId: socket.id });
      return;
    }
    const room = rooms.get(roomId);
    if (!room) { if (cb) cb({ success: false, error: 'Room not found' }); return; }
    if (room.players.length >= room.maxPlayers) { if (cb) cb({ success: false, error: 'Room is full' }); return; }
    const seat = room.players.length;
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, avatarUrl: avatarUrl || null, isReady: false };
    player.roomId = roomId; player.seat = seat;
    players.set(socket.id, player);
    room.players.push({ id: socket.id, username, balance, avatar, avatarUrl: avatarUrl || null, vipTier: player.vipTier || 'bronze', seat, isReady: false });
    socket.join(roomId);
    io.to(roomId).emit('room:update', { room });
    io.to(roomId).emit('room:playerJoined', { player: { id: socket.id, username, seat } });
    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room, playerId: socket.id });

    // Record game encounters for all players already in room (if numeric userId)
    const joiningPlayer = players.get(socket.id);
    const joiningUserId = joiningPlayer?.id;
    if (joiningUserId && typeof joiningUserId === 'number') {
      for (const rp of room.players) {
        const rpUserId = rp.id;
        if (rpUserId && typeof rpUserId === 'number' && rpUserId !== joiningUserId) {
          const gameType = room.game || null;
          query(
            `INSERT INTO game_encounters (user_id, other_user_id, game_type, room_id)
             VALUES ($1, $2, $3, $4), ($2, $1, $3, $4)
             ON CONFLICT (user_id, other_user_id, room_id) DO NOTHING`,
            [joiningUserId, rpUserId, gameType, roomId]
          ).catch(e => console.error('[encounter]', e.message));
        }
      }
    }
  });

  socket.on('room:leave', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(player.roomId);
    const roomId = player.roomId;
    player.roomId = null;
    if (room.players.length === 0 && roomId.startsWith('room_')) { rooms.delete(roomId); }
    else {
      if (room.hostId === socket.id && room.players.length > 0) room.hostId = room.players[0].id;
      io.to(roomId).emit('room:update', { room });
      io.to(roomId).emit('room:playerLeft', { playerId: socket.id, username: player.username });
    }
    broadcastLobby();
  });

  socket.on('player:ready', ({ isReady }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    const rp = room.players.find(p => p.id === socket.id);
    if (rp) rp.isReady = isReady;
    io.to(player.roomId).emit('room:update', { room });
  });

  socket.on('game:action', ({ action, data }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    io.to(player.roomId).emit('game:action', { playerId: socket.id, username: player.username, action, data, timestamp: Date.now() });
  });

  socket.on('game:stateSync', ({ gameState }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    room.gameState = gameState;
    room.status = gameState.status || room.status;
    socket.to(player.roomId).emit('game:stateSync', { gameState });
  });

  socket.on('game:start', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    room.status = 'playing';
    io.to(player.roomId).emit('game:started', { roomId: player.roomId });
    broadcastLobby();
  });

  socket.on('game:win', async ({ amount, game, username, userId }) => {
    const winner = generateWinner();
    winner.name = username || winner.name;
    winner.game = game || winner.game;
    winner.amount = amount || winner.amount;
    const player = players.get(socket.id);
    const resolvedUserId = userId || player?.id;
    const resolvedUsername = username || player?.username;
    try {
      if (resolvedUserId && typeof resolvedUserId === 'number') {
        const uRow = await query('SELECT vip_tier FROM users WHERE id = $1', [resolvedUserId]);
        if (uRow.rows.length) winner.vipTier = uRow.rows[0].vip_tier || 'bronze';
      }
    } catch {}
    recentWinners.unshift(winner);
    if (recentWinners.length > 50) recentWinners.pop();
    io.emit('winners:new', winner);
    if (resolvedUserId && typeof resolvedUserId === 'number') {
      recordWinToDB(resolvedUserId, resolvedUsername, amount, game).then(() => broadcastLeaderboard());
    } else {
      broadcastLeaderboard();
    }
    broadcastJackpot();
  });

  // jackpot:win socket events are deprecated — jackpot is now triggered server-side

  socket.on('game:end', ({ winners }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.status = 'waiting'; room.gameState = null;
    io.to(player.roomId).emit('game:ended', { winners });
    broadcastLobby();
  });

  socket.on('chat:message', ({ message }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const msg = { id: Date.now(), playerId: socket.id, username: player.username, message, timestamp: Date.now() };
    const room = rooms.get(player.roomId);
    if (room) { room.chat = [...(room.chat || []).slice(-50), msg]; io.to(player.roomId).emit('chat:message', msg); }
  });

  socket.on('lobby:chat', async ({ message, token }) => {
    if (!message || message.trim().length === 0 || message.length > 200) return;
    if (!token) return;
    try {
      const payload = verifyToken(token);
      if (!payload) return;
      const sessionCheck = await query(
        'SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW()',
        [token]
      );
      if (!sessionCheck.rows.length) return;
      const userRow = await query('SELECT id, username, avatar, social_avatar_url, vip_tier FROM users WHERE id = $1', [payload.userId]);
      if (!userRow.rows.length) return;
      const u = userRow.rows[0];
      const msg = { id: Date.now(), socketId: socket.id, username: u.username, avatar: u.avatar || '👤', avatarUrl: u.social_avatar_url || null, vipTier: u.vip_tier || 'bronze', message: message.trim(), timestamp: Date.now() };
      lobbyChat.push(msg);
      if (lobbyChat.length > 100) lobbyChat.shift();
      io.emit('lobby:chat', msg);
    } catch (err) {
      console.error('[lobby:chat auth]', err.message);
    }
  });

  socket.on('lobby:chat:history', () => {
    socket.emit('lobby:chat:history', { messages: lobbyChat.slice(-50) });
  });

  socket.on('reaction', ({ emoji }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    io.to(player.roomId).emit('reaction', { playerId: socket.id, username: player.username, emoji });
  });

  socket.on('player:balanceUpdate', ({ balance }) => {
    const player = players.get(socket.id);
    if (player) {
      player.balance = balance;
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) { const rp = room.players.find(p => p.id === socket.id); if (rp) { rp.balance = balance; io.to(player.roomId).emit('room:update', { room }); } }
      }
    }
  });

  socket.on('leaderboard:submitWin', ({ username, amount, game, userId }) => {
    const player = players.get(socket.id);
    const resolvedUserId = userId || player?.id;
    const resolvedUsername = username || player?.username;
    if (resolvedUserId && typeof resolvedUserId === 'number') {
      recordWinToDB(resolvedUserId, resolvedUsername, amount, game).then(() => broadcastLeaderboard());
    } else {
      broadcastLeaderboard();
    }
  });

  
    // ---- Multiplayer Roulette Handlers ----
    function rouletteJoinPlayer() {
      const mainPlayer = players.get(socket.id);
      const trustedId = (mainPlayer && mainPlayer.id) ? mainPlayer.id : socket.id;
      const trustedUsername = (mainPlayer && mainPlayer.username) ? mainPlayer.username : 'Guest';
      const trustedAvatarUrl = mainPlayer ? mainPlayer.avatarUrl : null;
      const trustedAvatar = mainPlayer ? mainPlayer.avatar : null;
      const playerBalance = (mainPlayer && typeof mainPlayer.balance === 'number') ? mainPlayer.balance : 0;
      const rp = { id: trustedId, socketId: socket.id, username: trustedUsername, avatarUrl: trustedAvatarUrl, avatar: trustedAvatar, betTotal: 0, lastWin: 0, betsLocked: false, balance: playerBalance };
      rouletteRoom.players.set(socket.id, rp);
      socket.join('roulette-main');
      rouletteEnsureTimer();
      socket.emit('roulette:state', {
        phase: rouletteRoom.phase, timer: rouletteRoom.timer, roundId: rouletteRoom.roundId,
        players: rouletteGetPlayers(), history: rouletteRoom.history,
      });
      rouletteBroadcast('roulette:players', { players: rouletteGetPlayers() });
      console.log('[Roulette] ' + rp.username + ' joined (' + rouletteRoom.players.size + ' players)');
      broadcastLobby();
      return rp;
    }

    socket.on('roulette:join', () => { rouletteJoinPlayer(); });

    socket.on('roulette:leave', () => {
      const rp = rouletteRoom.players.get(socket.id);
      rouletteRoom.players.delete(socket.id);
      socket.leave('roulette-main');
      rouletteBroadcast('roulette:players', { players: rouletteGetPlayers() });
      if (rp) console.log('[Roulette] ' + rp.username + ' left (' + rouletteRoom.players.size + ' players)');
    broadcastLobby();
    });

    socket.on('roulette:bet', ({ amount, numbers }) => {
      const rp = rouletteRoom.players.get(socket.id);
      if (!rp || rouletteRoom.phase !== 'betting' || rp.betsLocked) return;
      const validated = rouletteValidateBet({ amount, numbers });
      if (!validated) return;
      if (!rp.bets) rp.bets = [];
      const newTotal = rp.bets.reduce((s, b) => s + b.amount, 0) + validated.amount;
      if (newTotal > rp.balance) return;
      rp.bets.push(validated);
      rp.betTotal = newTotal;
      rouletteBroadcast('roulette:players', { players: rouletteGetPlayers() });
    });

    socket.on('roulette:betsSnapshot', ({ bets }) => {
      const rp = rouletteRoom.players.get(socket.id);
      if (!rp || rouletteRoom.phase !== 'betting' || rp.betsLocked || !Array.isArray(bets)) return;
      const validated = bets.map(rouletteValidateBet).filter(Boolean);
      const total = validated.reduce((s, b) => s + b.amount, 0);
      if (total > rp.balance) return;
      rp.bets = validated;
      rp.betTotal = total;
      rouletteBroadcast('roulette:players', { players: rouletteGetPlayers() });
    });

  socket.on('disconnect', () => {
    // Cleanup roulette room on disconnect
      const roulettePlayer = rouletteRoom.players.get(socket.id);
      if (roulettePlayer) {
        rouletteRoom.players.delete(socket.id);
        rouletteBroadcast('roulette:players', { players: rouletteGetPlayers() });
      }
      const player = players.get(socket.id);
    if (player?.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0 && player.roomId.startsWith('room_')) rooms.delete(player.roomId);
        else {
          if (room.hostId === socket.id && room.players.length > 0) room.hostId = room.players[0].id;
          io.to(player.roomId).emit('room:playerLeft', { playerId: socket.id, username: player.username });
          io.to(player.roomId).emit('room:update', { room });
        }
      }
    }
    players.delete(socket.id);
    broadcastLobby();
    io.emit('lobby:stats', { playersOnline: players.size });
  });
});

// ---- Clean URL routes for static pages ----
['privacy-policy', 'terms', 'about', 'contact'].forEach(page => {
  app.get(`/${page}`, (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(readFileSync(join(publicDir, `${page}.html`)));
  });
});

// ---- Serve uploaded avatars ----
app.use('/uploads', express.static(join(__dirname, '..', 'public', 'uploads')));

// ---- Production: serve built frontend ----
if (process.env.NODE_ENV === 'production') {
  const distDir = join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Multiplayer server running on :${PORT}`);
  setJackpotIO(io);
  setFriendsIO(io);
  initDatabase().then(() => {
    loadJackpotFromDB();
    cleanupExpiredSessions();
    setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
  });
});
