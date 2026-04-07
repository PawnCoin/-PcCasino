import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from './db.js';
import { requireAuth } from './auth-routes.js';

const router = Router();

// Save game history entry
router.post('/history', requireAuth, async (req, res) => {
  const { game, result, betAmount, winAmount, net, seedHash, nonce } = req.body;
  if (!game || !result) return res.status(400).json({ error: 'game and result required' });

  try {
    const entry = await query(
      `INSERT INTO game_history (user_id, game, result, bet_amount, win_amount, net, seed_hash, nonce)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, game, result, betAmount || 0, winAmount || 0, net || 0, seedHash || null, nonce || 0]
    );
    res.json({ success: true, entry: entry.rows[0] });
  } catch (err) {
    console.error('Game history error:', err);
    res.status(500).json({ error: 'Failed to save game history' });
  }
});

// Get game history
router.get('/history', requireAuth, async (req, res) => {
  const { game, limit = 50, offset = 0 } = req.query;
  let q = 'SELECT * FROM game_history WHERE user_id = $1';
  const params = [req.user.id];

  if (game) {
    q += ` AND game = $${params.length + 1}`;
    params.push(game);
  }

  q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const result = await query(q, params);
    const stats = await query(
      `SELECT
         COUNT(*) as total_games,
         COUNT(CASE WHEN result = 'win' THEN 1 END) as total_wins,
         COALESCE(SUM(CASE WHEN result = 'win' THEN win_amount ELSE 0 END), 0) as biggest_win_sum,
         COALESCE(MAX(CASE WHEN result = 'win' THEN win_amount ELSE 0 END), 0) as biggest_win,
         COALESCE(SUM(bet_amount), 0) as total_bet,
         COALESCE(SUM(win_amount), 0) as total_won
       FROM game_history WHERE user_id = $1`,
      [req.user.id]
    );
    const s = stats.rows[0];
    const totalGames = parseInt(s.total_games);
    const totalWins = parseInt(s.total_wins);
    res.json({
      history: result.rows.map(h => ({ ...h, net: parseInt(h.net), bet_amount: parseInt(h.bet_amount), win_amount: parseInt(h.win_amount) })),
      stats: {
        totalGames,
        totalWins,
        winRate: totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0',
        biggestWin: parseInt(s.biggest_win),
        totalBet: parseInt(s.total_bet),
        totalWon: parseInt(s.total_won),
        roi: parseInt(s.total_bet) > 0 ? (((parseInt(s.total_won) - parseInt(s.total_bet)) / parseInt(s.total_bet)) * 100).toFixed(2) : '0.00',
      }
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unread });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
router.post('/notifications/read', requireAuth, async (req, res) => {
  const { ids } = req.body;
  try {
    if (ids?.length) {
      await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2)', [req.user.id, ids]);
    } else {
      await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

// --- DAILY BONUS ---
// GET: check if already claimed today
router.get('/daily-bonus', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT daily_bonus_claimed_at FROM users WHERE id = $1', [req.user.id]);
    const claimedAt = result.rows[0]?.daily_bonus_claimed_at;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alreadyClaimed = claimedAt && new Date(claimedAt) >= today;
    res.json({ claimed: alreadyClaimed, claimedAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check daily bonus' });
  }
});

// POST: claim daily bonus
router.post('/daily-bonus', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT daily_bonus_claimed_at, balance FROM users WHERE id = $1', [req.user.id]);
    const claimedAt = result.rows[0]?.daily_bonus_claimed_at;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (claimedAt && new Date(claimedAt) >= today) {
      return res.status(400).json({ error: 'Daily bonus already claimed today' });
    }

    const BONUS = 50_000_000;
    await query('UPDATE users SET balance = balance + $1, daily_bonus_claimed_at = NOW() WHERE id = $2', [BONUS, req.user.id]);
    await query(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'bonus', BONUS, 'Daily Login Bonus']
    );
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'bonus', '🎁 Daily Bonus Claimed!', $2)",
      [req.user.id, `You claimed your 50,000,000 $Pc daily login bonus!`]
    );

    const balResult = await query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, bonus: BONUS, balance: parseInt(balResult.rows[0].balance) });
  } catch (err) {
    console.error('Daily bonus error:', err);
    res.status(500).json({ error: 'Failed to claim daily bonus' });
  }
});

// Get tournaments (DB-backed)
router.get('/tournaments', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, COUNT(te.id) as registered_count
       FROM tournaments t
       LEFT JOIN tournament_entries te ON te.tournament_id = t.id
       GROUP BY t.id
       ORDER BY t.start_time ASC`
    );
    res.json({ tournaments: result.rows.map(t => ({ ...t, prize_pool: parseInt(t.prize_pool), entry_fee: parseInt(t.entry_fee), registered_count: parseInt(t.registered_count) })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Register for tournament
router.post('/tournaments/:id/register', requireAuth, async (req, res) => {
  try {
    const t = await query('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
    if (!t.rows.length) return res.status(404).json({ error: 'Tournament not found' });
    const tournament = t.rows[0];

    const count = await query('SELECT COUNT(*) FROM tournament_entries WHERE tournament_id = $1', [tournament.id]);
    if (parseInt(count.rows[0].count) >= tournament.max_players) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    const entryFee = parseInt(tournament.entry_fee);
    if (entryFee > 0 && parseInt(req.user.balance) < entryFee) {
      return res.status(400).json({ error: 'Insufficient balance for entry fee' });
    }

    await query('BEGIN');
    if (entryFee > 0) {
      await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [entryFee, req.user.id]);
      await query('INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'bet', entryFee, `Tournament entry: ${tournament.name}`]);
    }
    await query(
      'INSERT INTO tournament_entries (tournament_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [tournament.id, req.user.id]
    );
    await query('COMMIT');

    await query("INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'tournament', 'Tournament Registered! 🏆', $2)",
      [req.user.id, `You're registered for ${tournament.name}!`]);

    const newBalance = await query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, balance: parseInt(newBalance.rows[0].balance) });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(400).json({ error: 'Already registered' });
    console.error('Tournament register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Referral: get user's referral info
router.get('/referral', requireAuth, async (req, res) => {
  try {
    const refs = await query(
      `SELECT r.*, u.username as referred_username, u.created_at as joined_at
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1`,
      [req.user.id]
    );
    const code = req.user.username.toUpperCase().slice(0, 8) + '_' + req.user.id.toString().slice(0, 4).toUpperCase();
    res.json({
      referralCode: code,
      referrals: refs.rows,
      totalEarned: refs.rows.reduce((sum, r) => sum + parseInt(r.reward_amount), 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
});

// DB-backed leaderboard
router.get('/leaderboard/db', async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, u.avatar FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       ORDER BY l.total_won DESC LIMIT 20`
    );
    res.json({ leaderboard: result.rows.map((r, i) => ({ ...r, rank: i + 1, totalWon: parseInt(r.total_won), balance: parseInt(r.balance), gamesPlayed: parseInt(r.games_played), winStreak: parseInt(r.win_streak || 0), favoriteGame: r.favorite_game || 'Casino' })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// --- LIVE SPORTS ODDS ---
const sportsCache = { data: null, fetchedAt: 0 };
const SPORTS_CACHE_TTL = 5 * 60 * 1000; // 5 min

router.get('/sports', async (req, res) => {
  try {
    const now = Date.now();

    // Return cache if fresh
    if (sportsCache.data && now - sportsCache.fetchedAt < SPORTS_CACHE_TTL) {
      return res.json({ events: sportsCache.data, live: true, cached: true });
    }

    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return res.json({ events: getFallbackEvents(), live: false, note: 'Set ODDS_API_KEY for live data' });
    }

    // Fetch from The Odds API
    const sports = ['americanfootball_nfl', 'basketball_nba', 'baseball_mlb', 'soccer_epl', 'mma_mixed_martial_arts'];
    const allEvents = [];

    for (const sport of sports.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (response.ok) {
          const data = await response.json();
          const mapped = data.slice(0, 4).map(e => ({
            id: e.id,
            sport: e.sport_key.includes('nfl') ? 'NFL' : e.sport_key.includes('nba') ? 'NBA' : e.sport_key.includes('mlb') ? 'MLB' : e.sport_key.includes('soccer') ? 'EPL' : 'MMA',
            league: e.sport_title,
            homeTeam: e.home_team,
            awayTeam: e.away_team,
            status: new Date(e.commence_time) < new Date() ? 'live' : 'upcoming',
            startTime: e.commence_time,
            odds: parseOdds(e.bookmakers),
          }));
          allEvents.push(...mapped);
        }
      } catch (e) {
        // skip failed sport
      }
    }

    if (allEvents.length > 0) {
      sportsCache.data = allEvents;
      sportsCache.fetchedAt = now;
      return res.json({ events: allEvents, live: true });
    }

    return res.json({ events: getFallbackEvents(), live: false });
  } catch (err) {
    console.error('Sports error:', err);
    res.json({ events: getFallbackEvents(), live: false });
  }
});

function parseOdds(bookmakers) {
  if (!bookmakers?.length) return { home: -110, away: 110 };
  const bm = bookmakers[0];
  const h2h = bm.markets?.find(m => m.key === 'h2h');
  const spreads = bm.markets?.find(m => m.key === 'spreads');
  const totals = bm.markets?.find(m => m.key === 'totals');
  const odds = {};
  if (h2h?.outcomes?.length >= 2) {
    odds.home = h2h.outcomes[0].price;
    odds.away = h2h.outcomes[1].price;
    if (h2h.outcomes[2]) odds.draw = h2h.outcomes[2].price;
  }
  if (spreads?.outcomes?.length >= 2) {
    odds.spread = { home: spreads.outcomes[0].price, away: spreads.outcomes[1].price, homePoint: spreads.outcomes[0].point };
  }
  if (totals?.outcomes?.length >= 2) {
    odds.total = { over: totals.outcomes[0].price, under: totals.outcomes[1].price, line: totals.outcomes[0].point };
  }
  return odds;
}

function getFallbackEvents() {
  const now = Date.now();
  return [
    { id: 'f1', sport: 'NFL', league: 'National Football League', homeTeam: 'Kansas City Chiefs', awayTeam: 'Baltimore Ravens', status: 'upcoming', startTime: new Date(now + 3600000).toISOString(), odds: { home: -115, away: 105, spread: { home: -3, away: 3 }, total: { over: -110, under: -110, line: 48.5 } } },
    { id: 'f2', sport: 'NBA', league: 'National Basketball Association', homeTeam: 'Boston Celtics', awayTeam: 'Golden State Warriors', status: 'upcoming', startTime: new Date(now + 7200000).toISOString(), odds: { home: -140, away: 120, spread: { home: -3.5, away: 3.5 }, total: { over: -110, under: -110, line: 224.5 } } },
    { id: 'f3', sport: 'MLB', league: 'Major League Baseball', homeTeam: 'New York Yankees', awayTeam: 'Los Angeles Dodgers', status: 'live', startTime: new Date(now - 3600000).toISOString(), odds: { home: -130, away: 110 } },
    { id: 'f4', sport: 'UFC', league: 'Ultimate Fighting Championship', homeTeam: 'Jon Jones', awayTeam: 'Stipe Miocic', status: 'upcoming', startTime: new Date(now + 86400000).toISOString(), odds: { home: -300, away: 240 } },
    { id: 'f5', sport: 'EPL', league: 'English Premier League', homeTeam: 'Arsenal', awayTeam: 'Manchester City', status: 'upcoming', startTime: new Date(now + 172800000).toISOString(), odds: { home: 185, away: 145, draw: 240 } },
    { id: 'f6', sport: 'NBA', league: 'National Basketball Association', homeTeam: 'Miami Heat', awayTeam: 'Denver Nuggets', status: 'live', startTime: new Date(now - 1800000).toISOString(), odds: { home: -105, away: -115, total: { over: -110, under: -110, line: 218 } } },
  ];
}

// Exchange rates (fetch from CoinGecko)
router.get('/exchange-rates', async (req, res) => {
  try {
    const cacheKey = '_exchangeRatesCache';
    const cacheTime = '_exchangeRatesCacheTime';
    const CACHE_TTL = 5 * 60 * 1000;

    if (global[cacheKey] && Date.now() - global[cacheTime] < CACHE_TTL) {
      return res.json({ rates: global[cacheKey], cached: true });
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin&vs_currencies=usd',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error('CoinGecko error');
    const data = await response.json();

    const PC_USD = 0.0000012;
    const rates = {
      USD: PC_USD,
      BTC: PC_USD / data.bitcoin.usd,
      ETH: PC_USD / data.ethereum.usd,
      SOL: PC_USD / data.solana.usd,
      USDC: PC_USD / data['usd-coin'].usd,
    };

    global[cacheKey] = rates;
    global[cacheTime] = Date.now();

    res.json({ rates, live: true });
  } catch (err) {
    res.json({
      rates: { USD: 0.0000012, BTC: 0.000000000019, ETH: 0.00000000032, SOL: 0.000000011, USDC: 0.0000012 },
      live: false,
      error: err.message
    });
  }
});

// ---- Poker Hand History ----

// Save a poker hand (requires auth)
router.post('/poker/hands', requireAuth, async (req, res) => {
  const { holeCards, communityCards, actions, pot, winner, winnerName, handName, net, opponents } = req.body;
  if (!holeCards || !communityCards || !winner) {
    return res.status(400).json({ error: 'holeCards, communityCards, and winner are required' });
  }
  try {
    let shareToken;
    let attempts = 0;
    while (attempts < 5) {
      shareToken = randomBytes(16).toString('hex');
      const existing = await query('SELECT id FROM poker_hand_history WHERE share_token = $1', [shareToken]);
      if (!existing.rows.length) break;
      attempts++;
    }
    if (!shareToken) return res.status(500).json({ error: 'Failed to generate unique share token' });

    const result = await query(
      `INSERT INTO poker_hand_history
         (user_id, share_token, hole_cards, community_cards, actions, pot, winner, winner_name, hand_name, net, opponents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, share_token, created_at`,
      [
        req.user.id,
        shareToken,
        JSON.stringify(holeCards),
        JSON.stringify(communityCards),
        JSON.stringify(actions || []),
        pot || 0,
        winner,
        winnerName || null,
        handName || null,
        net || 0,
        JSON.stringify(opponents || []),
      ]
    );
    const row = result.rows[0];
    res.json({ success: true, handId: row.id, shareToken: row.share_token, createdAt: row.created_at });
  } catch (err) {
    console.error('[poker/hands POST]', err.message);
    res.status(500).json({ error: 'Failed to save hand history' });
  }
});

// List the last 50 poker hands for the authenticated user
router.get('/poker/hands', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, share_token, hole_cards, community_cards, actions, pot, winner, winner_name, hand_name, net, opponents, created_at
       FROM poker_hand_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ hands: result.rows });
  } catch (err) {
    console.error('[poker/hands GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch hand history' });
  }
});

// Get a single hand by id — authenticated, user can only access their own hands
router.get('/poker/hands/:id', requireAuth, async (req, res) => {
  const handId = parseInt(req.params.id, 10);
  if (!Number.isFinite(handId) || handId <= 0) return res.status(400).json({ error: 'Invalid hand id' });
  try {
    const result = await query(
      `SELECT id, share_token, hole_cards, community_cards, actions, pot, winner, winner_name, hand_name, net, opponents, created_at
       FROM poker_hand_history
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [handId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Hand not found' });
    res.json({ hand: result.rows[0] });
  } catch (err) {
    console.error('[poker/hands/:id GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch hand' });
  }
});

// Get a single hand by share token — public (no auth required)
router.get('/poker/hands/share/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length > 64) {
    return res.status(400).json({ error: 'Invalid token' });
  }
  try {
    const result = await query(
      `SELECT ph.id, ph.share_token, ph.hole_cards, ph.community_cards, ph.actions, ph.pot,
              ph.winner, ph.winner_name, ph.hand_name, ph.net, ph.opponents, ph.created_at,
              u.username
       FROM poker_hand_history ph
       JOIN users u ON u.id = ph.user_id
       WHERE ph.share_token = $1
       LIMIT 1`,
      [token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Hand not found' });
    res.json({ hand: result.rows[0] });
  } catch (err) {
    console.error('[poker/hands/share GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch hand' });
  }
});

export default router;
