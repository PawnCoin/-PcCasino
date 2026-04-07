import { query, pool } from './db.js';

export const JACKPOT_SEED = 10_000_000;
export const JACKPOT_CONTRIBUTION = 0.01;
// Win probability: 1 in 50,000,000 per $Pc wagered
export const JACKPOT_WIN_CHANCE_PER_PC = 1 / 50_000_000;

// In-memory cache of current jackpot value — updated after every DB write
let jackpot = JACKPOT_SEED;
let jackpotLastWon = null;
let _io = null;

export function setJackpotIO(io) {
  _io = io;
}

export function getJackpot() { return jackpot; }
export function getJackpotLastWon() { return jackpotLastWon; }

export async function loadJackpotFromDB() {
  try {
    const res = await query('SELECT amount, last_won_at FROM jackpot_state WHERE id = 1');
    if (res.rows.length) {
      jackpot = parseInt(res.rows[0].amount);
      jackpotLastWon = res.rows[0].last_won_at ? new Date(res.rows[0].last_won_at).getTime() : null;
      console.log(`[Jackpot] Loaded from DB: ${jackpot} $Pc`);
    }
  } catch (e) {
    console.error('[Jackpot] Failed to load from DB:', e.message);
  }
}

export function broadcastJackpot() {
  if (_io) _io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
}

/**
 * Called server-side after every validated bet.
 * Atomically accumulates the 1% contribution in the DB then evaluates win probability.
 * No in-process mutex — concurrent bets each get their own DB transaction.
 */
export async function processJackpotContribution(userId, username, betAmount) {
  const contribution = Math.floor(betAmount * JACKPOT_CONTRIBUTION);
  if (contribution <= 0) return { triggered: false };

  const winProbability = Math.min(betAmount * JACKPOT_WIN_CHANCE_PER_PC, 0.001);
  const willTrigger = Math.random() < winProbability;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Atomically increment jackpot — safe under concurrent bets
    // Also obtain row-level lock so win evaluation is serialized
    const updated = await client.query(
      `UPDATE jackpot_state
         SET amount = amount + $1, updated_at = NOW()
       WHERE id = 1
       RETURNING amount`,
      [contribution]
    );
    const newAmount = parseInt(updated.rows[0].amount);

    // Only trigger if RNG hit AND pot > seed (meaningful win)
    if (willTrigger && newAmount > JACKPOT_SEED) {
      // Payout winner — all within the same transaction
      await client.query(
        'UPDATE users SET balance = balance + $1, total_won = total_won + $1 WHERE id = $2',
        [newAmount, userId]
      );
      await client.query(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [userId, 'jackpot', newAmount, 'Progressive Jackpot Win']
      );
      await client.query(
        'INSERT INTO jackpot_history (user_id, username, amount, seed_value) VALUES ($1, $2, $3, $4)',
        [userId, username, newAmount, JACKPOT_SEED]
      );
      await client.query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'jackpot', '🎰 JACKPOT!', $2)",
        [userId, `You won the progressive jackpot of ${newAmount.toLocaleString()} $Pc!`]
      );
      await client.query(
        'UPDATE jackpot_state SET amount = $1, last_won_at = NOW(), updated_at = NOW() WHERE id = 1',
        [JACKPOT_SEED]
      );
      await client.query('COMMIT');

      // Sync in-memory cache
      jackpot = JACKPOT_SEED;
      jackpotLastWon = Date.now();

      if (_io) {
        _io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
        _io.emit('jackpot:won', { userId, username, amount: newAmount, newJackpot: jackpot, timestamp: Date.now() });
      }
      console.log(`[Jackpot] WON by ${username} — ${newAmount} $Pc`);
      return { triggered: true, won: newAmount };
    }

    await client.query('COMMIT');
    // Sync in-memory cache after normal contribution
    jackpot = newAmount;
    if (_io) _io.emit('jackpot:update', { amount: jackpot, lastWon: jackpotLastWon });
    return { triggered: false };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[Jackpot] Contribution error:', e.message);
    return { triggered: false };
  } finally {
    client.release();
  }
}
