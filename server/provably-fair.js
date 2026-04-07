import { randomBytes, createHmac, createHash } from 'crypto';
import { query } from './db.js';

/**
 * Provably Fair System
 *
 * Each game round:
 *  1. Server generates a random server seed (32 bytes hex)
 *  2. Hash of server seed (SHA-256) is stored and returned to the client BEFORE the round
 *  3. Client provides a client seed (browser-generated) and a nonce (round count)
 *  4. Outcome = HMAC-SHA256(serverSeed, clientSeed:nonce)
 *  5. After the round, the unhashed server seed is revealed for verification
 */

export function generateServerSeed() {
  return randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed) {
  return createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Deterministic outcome generator.
 * Returns an array of floats in [0,1) derived from the HMAC output.
 * Each 4-byte chunk gives one float; up to 8 floats from a single 32-byte HMAC.
 */
export function deriveOutcomes(serverSeed, clientSeed, nonce, count = 1) {
  const hmac = createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest();

  const results = [];
  for (let i = 0; i < Math.min(count, 8); i++) {
    const offset = i * 4;
    const val = (hmac.readUInt32BE(offset) / 0xFFFFFFFF);
    results.push(val);
  }
  return results;
}

/**
 * Derive a specific game result from seeds.
 * game: 'slots' | 'roulette' | 'blackjack'
 */
export function deriveGameResult(game, serverSeed, clientSeed, nonce) {
  const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  ];
  // Must match client SYMBOLS array in SlotsGame.tsx exactly
  const SYMBOLS = ['🍒', '🍋', '🍊', '🔔', '⭐', '💎', '7️⃣', '🎰'];
  const WEIGHTS = [20, 18, 15, 12, 10, 8, 5, 2];
  const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);

  const CARD_SUITS = ['♠', '♥', '♦', '♣'];
  const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  if (game === 'roulette') {
    const [f] = deriveOutcomes(serverSeed, clientSeed, nonce, 1);
    const idx = Math.floor(f * WHEEL_NUMBERS.length);
    return { number: WHEEL_NUMBERS[idx] };
  }

  if (game === 'slots') {
    const ROWS = 3;
    const COLS = 5;
    const needed = ROWS * COLS;
    const grid = [];

    for (let cell = 0; cell < needed; cell++) {
      const cellNonce = `${nonce}:${cell}`;
      const [f] = deriveOutcomes(serverSeed, clientSeed, cellNonce, 1);
      let r = f * TOTAL_WEIGHT;
      let symbol = SYMBOLS[0];
      for (let i = 0; i < SYMBOLS.length; i++) {
        r -= WEIGHTS[i];
        if (r <= 0) { symbol = SYMBOLS[i]; break; }
      }
      const row = Math.floor(cell / COLS);
      if (!grid[row]) grid[row] = [];
      grid[row].push(symbol);
    }
    return { grid };
  }

  if (game === 'blackjack') {
    // Generate a full shuffled deck (52 cards) using Fisher-Yates with HMAC-derived floats.
    // Each card position i uses nonce `${nonce}:card${i}` for an independent HMAC float.
    const deck = [];
    for (let suit of CARD_SUITS) {
      for (let value of CARD_VALUES) {
        deck.push({ suit, value });
      }
    }
    // Fisher-Yates shuffle: for position i (from 51 down to 1), pick j from [0..i]
    for (let i = deck.length - 1; i > 0; i--) {
      const [f] = deriveOutcomes(serverSeed, clientSeed, `${nonce}:card${i}`, 1);
      const j = Math.floor(f * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // cards[0..3] = initial deal: player1, dealer1, player2, dealer2
    // cards[4..] = remaining deck for hits and dealer draws
    return { cards: deck };
  }

  return {};
}

/**
 * Save a new game round to the database.
 * Returns { roundId, serverSeedHash } — hash is shown to the player before the round.
 */
export async function createGameRound(userId, game, clientSeed, nonce) {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const result = deriveGameResult(game, serverSeed, clientSeed, nonce);

  const row = await query(
    `INSERT INTO game_rounds (user_id, game, server_seed, server_seed_hash, client_seed, nonce, result)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, game, serverSeed, serverSeedHash, clientSeed, nonce, JSON.stringify(result)]
  );

  return {
    roundId: row.rows[0].id,
    serverSeedHash,
    result,
  };
}

/**
 * Reveal the server seed for a completed round.
 * Sets revealed_at so the hash vs seed can be independently verified.
 */
export async function revealGameRound(roundId, userId) {
  const row = await query(
    `UPDATE game_rounds
     SET revealed_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revealed_at IS NULL
     RETURNING server_seed, server_seed_hash, client_seed, nonce, game, result`,
    [roundId, userId]
  );
  if (!row.rows.length) return null;
  return row.rows[0];
}

/**
 * Fetch a past round for public verification (no auth required for verification).
 */
export async function getGameRound(roundId) {
  const row = await query(
    `SELECT id, user_id, game, server_seed_hash,
            CASE WHEN revealed_at IS NOT NULL THEN server_seed ELSE NULL END as server_seed,
            client_seed, nonce, result, created_at, revealed_at
     FROM game_rounds WHERE id = $1`,
    [roundId]
  );
  return row.rows[0] || null;
}
