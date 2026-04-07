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
import { initDatabase, query } from './db.js';

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

app.use(express.json());

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/game', gameRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const PORT = 3001;

// ---- In-memory data stores ----
const rooms = new Map();
const players = new Map();
const disputes = new Map();
const tournaments = new Map();
const referrals = new Map();
const adminLogs = [];
const pcpaymentsConfig = { apiKey: process.env.PCPAY_API_KEY || '', webhookSecret: process.env.PCPAY_WEBHOOK_SECRET || '', endpoint: '', enabled: false };
const lobbyChat = [];

// ---- Progressive Jackpot (grows only from real bets — see /api/jackpot/contribute) ----
let jackpot = 0;
let jackpotLastWon = null;

// Broadcast jackpot every 5 seconds (only real value)
setInterval(() => {
  io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
}, 5000);

// ---- Leaderboard (DB-only — no fake fallback) ----

async function getLeaderboardFromDB() {
  try {
    const result = await query(
      `SELECT l.user_id as id, l.username, l.total_won as "totalWon", l.balance, l.games_played as "gamesPlayed",
              l.favorite_game as "favoriteGame", COALESCE(l.win_streak, 0) as "winStreak"
       FROM leaderboard l
       ORDER BY l.total_won DESC LIMIT 20`
    );
    if (result.rows.length > 0) {
      return result.rows.map(r => ({
        ...r,
        totalWon: parseInt(r.totalWon),
        balance: parseInt(r.balance),
        gamesPlayed: parseInt(r.gamesPlayed),
        winStreak: parseInt(r.winStreak),
      }));
    }
  } catch (e) {}
  return null;
}

async function broadcastLeaderboard() {
  const dbData = await getLeaderboardFromDB();
  const data = dbData || [];
  io.emit('leaderboard:update', { leaderboard: data, lastUpdated: Date.now() });
  return data;
}

// Broadcast leaderboard updates every 30 seconds with real DB data
setInterval(broadcastLeaderboard, 30000);

// ---- Recent winners feed (real data only — populated by game wins) ----
const recentWinners = [];

// ---- VIP Cashback Automation ----
const VIP_CASHBACK_RATES = { bronze: 0, silver: 0.01, gold: 0.02, platinum: 0.05, diamond: 0.10 };

async function runVipCashback() {
  try {
    // Find users who haven't received cashback in the last 7 days
    const users = await query(
      `SELECT id, username, vip_tier, total_wagered, cashback_paid_at
       FROM users
       WHERE vip_tier != 'bronze'
         AND (cashback_paid_at IS NULL OR cashback_paid_at < NOW() - INTERVAL '7 days')`
    );
    
    let count = 0;
    for (const user of users.rows) {
      const rate = VIP_CASHBACK_RATES[user.vip_tier] || 0;
      if (!rate) continue;

      // Cashback on wagered amount in the last 7 days
      const wageredResult = await query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE user_id = $1 AND type = 'bet' AND created_at > NOW() - INTERVAL '7 days'`,
        [user.id]
      );
      const wagered = parseInt(wageredResult.rows[0].total);
      if (wagered <= 0) continue;

      const cashback = Math.floor(wagered * rate);
      if (cashback <= 0) continue;

      await query('UPDATE users SET balance = balance + $1, cashback_paid_at = NOW() WHERE id = $2', [cashback, user.id]);
      await query(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [user.id, 'bonus', cashback, `${user.vip_tier.toUpperCase()} VIP Weekly Cashback (${(rate * 100).toFixed(0)}%)`]
      );
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'bonus', '💎 VIP Cashback Credited!', $2)",
        [user.id, `Your ${user.vip_tier.toUpperCase()} weekly cashback of ${cashback.toLocaleString()} $Pc has been credited!`]
      );

      // Notify connected user
      io.to(`user_${user.id}`).emit('cashback:credited', { amount: cashback, tier: user.vip_tier });
      count++;
    }
    if (count > 0) console.log(`[VIP Cashback] Credited ${count} users`);
  } catch (err) {
    console.error('[VIP Cashback] Error:', err.message);
  }
}

// Run cashback check every 6 hours
setInterval(runVipCashback, 6 * 60 * 60 * 1000);
// Run once on startup (after 30s to let DB init)
setTimeout(runVipCashback, 30000);

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

// ---- Helper functions ----
function generateRoomId() { return `room_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

function getPublicRooms() {
  return Array.from(rooms.values()).filter(r => !r.isPrivate).map(r => ({
    id: r.id, game: r.game, name: r.name, minBet: r.minBet, maxBet: r.maxBet, maxPlayers: r.maxPlayers,
    players: r.players.map(p => ({ id: p.id, username: p.username, balance: p.balance, seat: p.seat, isReady: p.isReady })),
    status: r.status, pot: r.pot, createdAt: r.createdAt, isPrivate: r.isPrivate,
  }));
}

function broadcastLobby() { io.emit('lobby:update', { rooms: getPublicRooms() }); }

function logAdmin(action, data) { adminLogs.unshift({ id: Date.now(), action, data, timestamp: Date.now() }); if (adminLogs.length > 500) adminLogs.pop(); }

// ---- REST API ----

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size, players: players.size }));

// Leaderboard - real DB only
app.get('/api/leaderboard', async (req, res) => {
  const dbData = await getLeaderboardFromDB();
  const data = dbData || [];
  const sorted = [...data].sort((a, b) => (b.totalWon || 0) - (a.totalWon || 0)).map((p, i) => ({ ...p, rank: i + 1 }));
  res.json({ leaderboard: sorted, totalPlayers: players.size, lastUpdated: Date.now() });
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
    jackpot,
    gamesPlayed24h,
  });
});

// Jackpot current value
app.get('/api/jackpot', (req, res) => {
  res.json({ amount: jackpot, lastWon: jackpotLastWon });
});

// Jackpot contribution — called by game server when real bets are placed
app.post('/api/jackpot/contribute', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  jackpot += Math.floor(amount * 0.01); // 1% of bet goes to jackpot
  io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
  res.json({ jackpot });
});

// Jackpot win — resets pot and records winner
app.post('/api/jackpot/win', (req, res) => {
  const { userId, username } = req.body;
  const won = jackpot;
  jackpot = 0;
  jackpotLastWon = Date.now();
  io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
  io.emit('jackpot:won', { userId, username, amount: won, timestamp: Date.now() });
  res.json({ won, jackpot });
});

// Live $Pc price — proxies DexScreener + GeckoTerminal (no CORS issues)
app.get('/api/pc-price', async (req, res) => {
  const contractAddress = process.env.PC_TOKEN_CONTRACT;

  if (!contractAddress) {
    return res.json({
      price: null, priceChange24h: null, volume24h: null,
      liquidity: null, marketCap: null, dex: null, chain: null, url: null,
      source: null, error: 'PC_TOKEN_CONTRACT not configured',
    });
  }

  // Try DexScreener first (free, no API key needed)
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      if (data.pairs?.length) {
        const pair = [...data.pairs].sort((a, b) =>
          (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))
        )[0];
        return res.json({
          price: parseFloat(pair.priceUsd || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          marketCap: pair.fdv ? parseFloat(pair.fdv) : null,
          pairAddress: pair.pairAddress,
          dex: pair.dexId,
          chain: pair.chainId,
          url: pair.url,
          source: 'dexscreener',
        });
      }
    }
  } catch (e) {
    console.error('[PcPrice] DexScreener error:', e.message);
  }

  // Fallback: GeckoTerminal (free, no API key needed)
  try {
    const network = process.env.PC_TOKEN_NETWORK || 'eth';
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/${network}/token_price/${contractAddress}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      const priceRaw = data.data?.attributes?.token_prices?.[contractAddress.toLowerCase()];
      if (priceRaw) {
        return res.json({
          price: parseFloat(priceRaw),
          priceChange24h: null, volume24h: null, liquidity: null,
          marketCap: null, dex: null, chain: network, url: null,
          source: 'geckoterminal',
        });
      }
    }
  } catch (e) {
    console.error('[PcPrice] GeckoTerminal error:', e.message);
  }

  // Fallback: CoinGecko Terminal search by network + address
  try {
    const network = process.env.PC_TOKEN_NETWORK || 'eth';
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${contractAddress}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      const attrs = data.data?.attributes;
      if (attrs?.price_usd) {
        return res.json({
          price: parseFloat(attrs.price_usd),
          priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
          volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
          liquidity: null, marketCap: null,
          dex: null, chain: network, url: null,
          source: 'geckoterminal',
        });
      }
    }
  } catch (e) {
    console.error('[PcPrice] GeckoTerminal tokens error:', e.message);
  }

  return res.json({ price: null, source: null, error: 'Price data unavailable from all sources' });
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

app.post('/api/tournaments/:id/register', (req, res) => {
  const t = tournaments.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.registeredPlayers >= t.maxPlayers) return res.status(400).json({ error: 'Tournament full' });
  const { userId, username } = req.body;
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
app.post('/api/referrals', (req, res) => {
  const { referrerId, referrerUsername } = req.body;
  const code = `${referrerUsername.toUpperCase().slice(0, 6)}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const referral = { code, referrerId, referrerUsername, uses: 0, earnings: 0, createdAt: Date.now() };
  referrals.set(code, referral);
  res.json({ referral });
});

app.post('/api/referrals/use', (req, res) => {
  const { code, newUserId } = req.body;
  const ref = referrals.get(code);
  if (!ref) return res.status(404).json({ error: 'Invalid referral code' });
  ref.uses++;
  ref.earnings += 50000000;
  referrals.set(code, ref);
  logAdmin('referral:used', { code, newUserId });
  res.json({ success: true, bonusAmount: 50000000 });
});

app.get('/api/referrals/:userId', (req, res) => {
  const userRefs = Array.from(referrals.values()).filter(r => r.referrerId === req.params.userId);
  res.json({ referrals: userRefs });
});

// ---- Provably Fair API routes ----
// Create a new game round — commits server seed hash to client BEFORE round plays out.
// Does NOT return the result; the outcome is computed after the round ends via /resolve.
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
    // Only return the commitment (hash). The result is computed after the round completes.
    res.json({ roundId, serverSeedHash });
  } catch (err) {
    console.error('[PF] new-round error:', err.message);
    res.status(500).json({ error: 'Failed to create game round' });
  }
});

// Blackjack deal — returns the authoritative initial 4 cards from the seed-derived deck.
// Transitions status: created → dealing. Rejects if called again (idempotent guard).
// Only for blackjack game type.
app.post('/api/provably-fair/blackjack-deal/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);
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
    // Return only initial 4 cards: [player1, dealer1, player2, dealer2]
    res.json({ cards: cards.slice(0, 4), serverSeedHash: rows[0].server_seed_hash });
  } catch (err) {
    console.error('[PF] blackjack-deal error:', err.message);
    res.status(500).json({ error: 'Failed to deal blackjack hand' });
  }
});

// Blackjack draw — returns the next card from the seed-derived deck sequentially.
// Requires status = 'dealing'. Advances draw_index atomically to prevent duplicate draws.
app.post('/api/provably-fair/blackjack-draw/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);
    // Atomically increment draw_index and read the card at that position
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
    const idx = rows[0].draw_index - 1; // draw_index was incremented, so current card is at idx
    if (!cards || idx >= cards.length) return res.status(410).json({ error: 'Deck exhausted' });
    res.json({ card: cards[idx] });
  } catch (err) {
    console.error('[PF] blackjack-draw error:', err.message);
    res.status(500).json({ error: 'Failed to draw card' });
  }
});

// Blackjack finish — marks hand as complete after all player/dealer actions are done.
// Transitions status: dealing → finished. Must be called before resolve/reveal.
// Returns no cards — only confirms the hand is over server-side.
app.post('/api/provably-fair/blackjack-finish/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);
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

// Resolve a round — client calls this after the round completes to get the authoritative outcome.
// Enforces lifecycle:
//   Slots/Roulette/Dice: created → resolved
//   Blackjack: finished → resolved (cannot resolve while still dealing)
// Returns the seed-derived result. For blackjack: returns ONLY draw_index (card count used),
// NOT the full deck — full deck is revealed post-reveal for verification only.
app.post('/api/provably-fair/resolve/:roundId', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);
    // Fetch round to check game type and status
    const { rows: checkRows } = await query(
      'SELECT game, status, user_id, result, server_seed_hash FROM game_rounds WHERE id = $1',
      [roundId]
    );
    if (!checkRows.length) return res.status(404).json({ error: 'Round not found' });
    const round = checkRows[0];
    if (round.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Enforce correct terminal state per game type
    const validFromStates = round.game === 'blackjack' ? ['finished'] : ['created'];
    if (!validFromStates.includes(round.status)) {
      return res.status(409).json({ error: `Cannot resolve: round is ${round.status}` });
    }

    // Transition to resolved
    await query(
      `UPDATE game_rounds SET status = 'resolved' WHERE id = $1`,
      [roundId]
    );

    // Return only minimal outcome — for blackjack do NOT return full deck (prevents cheating on future rounds)
    let safeResult = round.result;
    if (round.game === 'blackjack' && safeResult?.cards) {
      safeResult = { cardCount: safeResult.cards.length }; // just confirms deck was 52 cards
    }
    res.json({ result: safeResult, serverSeedHash: round.server_seed_hash });
  } catch (err) {
    console.error('[PF] resolve error:', err.message);
    res.status(500).json({ error: 'Failed to resolve round' });
  }
});

// Reveal server seed — only allowed after round has been resolved (status = 'resolved').
// Enforces lifecycle: resolved → revealed. Prevents pre-game seed disclosure.
app.post('/api/provably-fair/reveal/:roundId', requireAuth, async (req, res) => {
  try {
    // Enforce: must be in 'resolved' state before revealing (prevents pre-play disclosure)
    const statusCheck = await query(
      'SELECT status, user_id FROM game_rounds WHERE id = $1',
      [parseInt(req.params.roundId)]
    );
    if (!statusCheck.rows.length) return res.status(404).json({ error: 'Round not found' });
    const row = statusCheck.rows[0];
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (row.status !== 'resolved') {
      return res.status(409).json({ error: `Round must be resolved before revealing server seed (current status: ${row.status})` });
    }
    const data = await revealGameRound(parseInt(req.params.roundId), req.user.id);
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

// Public verification — only returns revealed rounds; never exposes user_id or pre-reveal data
app.get('/api/provably-fair/verify/:roundId', async (req, res) => {
  try {
    const round = await getGameRound(parseInt(req.params.roundId));
    if (!round) return res.status(404).json({ error: 'Round not found' });
    if (!round.revealed_at) return res.status(403).json({ error: 'Round not yet revealed' });
    // Return only what is needed for independent verification; omit user_id
    const { server_seed, server_seed_hash, client_seed, nonce, game, result, created_at, revealed_at } = round;
    res.json({ server_seed, server_seed_hash, client_seed, nonce, game, result, created_at, revealed_at });
  } catch (err) {
    res.status(500).json({ error: 'Verification lookup failed' });
  }
});

// Client-side verification endpoint — reproduce result from seeds (no DB lookup needed)
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
    totalWon: leaderboard.reduce((s, p) => s + p.totalWon, 0),
    jackpot,
    adminLogs: adminLogs.slice(0, 20),
  });
});

app.get('/api/admin/logs', (req, res) => { res.json({ logs: adminLogs }); });

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

// ---- Socket.io events ----
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on('player:identify', async ({ username, balance, avatar, userId }) => {
    const player = { id: userId || socket.id, socketId: socket.id, username, balance, avatar, roomId: null, seat: null, isReady: false, connectedAt: Date.now() };
    players.set(socket.id, player);
    if (userId) socket.join(`user_${userId}`);
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    const dbData = await getLeaderboardFromDB();
    socket.emit('leaderboard:update', { leaderboard: dbData || leaderboard, lastUpdated: Date.now() });
    socket.emit('winners:list', { winners: recentWinners.slice(0, 10) });
    socket.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
    io.emit('lobby:stats', { playersOnline: players.size });
  });

  socket.on('lobby:get', () => {
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    socket.emit('lobby:stats', { playersOnline: players.size });
    socket.emit('leaderboard:update', { leaderboard });
    socket.emit('winners:list', { winners: recentWinners.slice(0, 10) });
  });

  socket.on('room:create', ({ game, name, minBet, maxBet, isPrivate, username, balance, avatar }, cb) => {
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, isReady: false };
    players.set(socket.id, { ...player, roomId: null, seat: 0 });
    const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
    const roomId = generateRoomId();
    const newRoom = { id: roomId, game, name: name || `${username}'s Table`, minBet: minBet || 10, maxBet: maxBet || 1000, maxPlayers, players: [{ id: socket.id, username, balance, avatar, seat: 0, isReady: false }], status: 'waiting', pot: 0, createdAt: Date.now(), isPrivate: !!isPrivate, hostId: socket.id, gameState: null, chat: [] };
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    players.get(socket.id).roomId = roomId;
    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room: newRoom, playerId: socket.id });
  });

  socket.on('room:join', ({ roomId, username, balance, avatar }, cb) => {
    const room = rooms.get(roomId);
    if (!room) { if (cb) cb({ success: false, error: 'Room not found' }); return; }
    if (room.players.length >= room.maxPlayers) { if (cb) cb({ success: false, error: 'Room is full' }); return; }
    const seat = room.players.length;
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, isReady: false };
    player.roomId = roomId; player.seat = seat;
    players.set(socket.id, player);
    room.players.push({ id: socket.id, username, balance, avatar, seat, isReady: false });
    socket.join(roomId);
    io.to(roomId).emit('room:update', { room });
    io.to(roomId).emit('room:playerJoined', { player: { id: socket.id, username, seat } });
    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room, playerId: socket.id });
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

  socket.on('game:win', ({ amount, game, username }) => {
    const winner = generateWinner();
    winner.name = username || winner.name;
    winner.game = game || winner.game;
    winner.amount = amount || winner.amount;
    recentWinners.unshift(winner);
    if (recentWinners.length > 50) recentWinners.pop();
    io.emit('winners:new', winner);
    const lb = leaderboard.find(p => p.username === username);
    if (lb) { lb.totalWon += amount; lb.gamesPlayed++; }
    broadcastLeaderboard();
    // Jackpot win contributes to jackpot growth burst
    growJackpot(); growJackpot(); growJackpot();
    io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
  });

  socket.on('jackpot:win', ({ userId, username, amount }) => {
    const won = jackpot;
    jackpot = 500_000 + Math.floor(Math.random() * 200_000); // reset
    jackpotLastWon = Date.now();
    io.emit('jackpot:won', { username, amount: won, newJackpot: jackpot });
    io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
    logAdmin('jackpot:won', { userId, username, amount: won });
  });

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

  socket.on('lobby:chat', ({ message, username, avatar }) => {
    if (!message || message.trim().length === 0 || message.length > 200) return;
    const msg = { id: Date.now(), socketId: socket.id, username: username || 'Guest', avatar: avatar || '👤', message: message.trim(), timestamp: Date.now() };
    lobbyChat.push(msg);
    if (lobbyChat.length > 100) lobbyChat.shift();
    io.emit('lobby:chat', msg);
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

  socket.on('leaderboard:submitWin', ({ username, amount, game }) => {
    const entry = leaderboard.find(p => p.username === username);
    if (entry) { entry.totalWon += amount; entry.gamesPlayed++; }
    broadcastLeaderboard();
  });

  socket.on('disconnect', () => {
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

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Multiplayer server running on :${PORT}`);
  initDatabase();
});
