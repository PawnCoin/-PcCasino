import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('helium') ? false : { rejectUnauthorized: false },
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(30) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        email_verify_token VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        wallet_address VARCHAR(255),
        social_provider VARCHAR(50),
        social_id VARCHAR(255),
        balance BIGINT DEFAULT 1000000000,
        avatar VARCHAR(100) DEFAULT 'wizard',
        vip_tier VARCHAR(20) DEFAULT 'bronze',
        total_wagered BIGINT DEFAULT 0,
        total_won BIGINT DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        totp_secret VARCHAR(255),
        totp_enabled BOOLEAN DEFAULT FALSE,
        withdraw_address VARCHAR(255),
        daily_deposit_limit BIGINT DEFAULT 0,
        daily_loss_limit BIGINT DEFAULT 0,
        self_excluded BOOLEAN DEFAULT FALSE,
        self_exclude_until TIMESTAMP,
        last_seen TIMESTAMP DEFAULT NOW(),
        daily_bonus_claimed_at TIMESTAMP,
        cashback_paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add missing columns to existing users table
    const alterColumns = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_won BIGINT DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS self_exclude_until TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_bonus_claimed_at TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS cashback_paid_at TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_avatar_url TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE`,
    ];
    for (const sql of alterColumns) {
      await query(sql).catch(() => {});
    }

    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(512) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS deposit_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        tx_hash VARCHAR(255),
        from_address VARCHAR(255),
        network VARCHAR(50) DEFAULT 'ERC-20',
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP`).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS withdraw_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        to_address VARCHAR(255),
        network VARCHAR(50) DEFAULT 'ERC-20',
        status VARCHAR(20) DEFAULT 'pending',
        tx_hash VARCHAR(255),
        admin_note TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP`).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount BIGINT NOT NULL,
        game VARCHAR(100),
        description TEXT,
        status VARCHAR(20) DEFAULT 'confirmed',
        balance_after BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT`).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS game_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game VARCHAR(100) NOT NULL,
        result VARCHAR(20) NOT NULL,
        bet_amount BIGINT DEFAULT 0,
        win_amount BIGINT DEFAULT 0,
        net BIGINT DEFAULT 0,
        seed_hash VARCHAR(255),
        nonce INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(30) NOT NULL,
        total_won BIGINT DEFAULT 0,
        balance BIGINT DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        favorite_game VARCHAR(100),
        win_streak INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reward_amount BIGINT DEFAULT 50000000,
        commission_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(referred_id)
      )
    `);
    // Migration: add commission_paid column if not present
    await query(`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE`).catch(() => {});

    // Stores durable referral codes so they survive server restarts
    await query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(32) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id)`);

    await query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        game VARCHAR(100) NOT NULL,
        entry_fee BIGINT DEFAULT 0,
        prize_pool BIGINT DEFAULT 0,
        max_players INTEGER DEFAULT 100,
        status VARCHAR(20) DEFAULT 'registering',
        start_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tournament_entries (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS game_rounds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game VARCHAR(30) NOT NULL,
        server_seed VARCHAR(64) NOT NULL,
        server_seed_hash VARCHAR(64) NOT NULL,
        client_seed VARCHAR(128) NOT NULL,
        nonce INTEGER NOT NULL DEFAULT 0,
        result JSONB,
        revealed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_game_rounds_user ON game_rounds(user_id)`);
    // Add status column if it doesn't exist (migration-safe)
    await query(`ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'created'`);
    // Add draw_index for blackjack sequential card delivery (migration-safe)
    await query(`ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS draw_index INTEGER DEFAULT 0`);
    // Backfill: existing revealed rounds → 'revealed'; others → 'created'
    await query(`UPDATE game_rounds SET status = 'revealed' WHERE revealed_at IS NOT NULL AND status = 'created'`);

    // Progressive jackpot persistent state (single row)
    await query(`
      CREATE TABLE IF NOT EXISTS jackpot_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        amount BIGINT NOT NULL DEFAULT 10000000,
        last_won_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT jackpot_state_single_row CHECK (id = 1)
      )
    `);
    // Seed the row if it doesn't exist
    await query(`INSERT INTO jackpot_state (id, amount) VALUES (1, 10000000) ON CONFLICT DO NOTHING`);

    // Jackpot win history
    await query(`
      CREATE TABLE IF NOT EXISTS jackpot_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(30) NOT NULL,
        amount BIGINT NOT NULL,
        seed_value BIGINT NOT NULL,
        won_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_jackpot_history_won_at ON jackpot_history(won_at DESC)`);

    // Poker hand history — full hand snapshots for replay
    await query(`
      CREATE TABLE IF NOT EXISTS poker_hand_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        share_token VARCHAR(32) UNIQUE NOT NULL,
        hole_cards JSONB NOT NULL,
        community_cards JSONB NOT NULL,
        actions JSONB NOT NULL DEFAULT '[]',
        pot BIGINT NOT NULL DEFAULT 0,
        winner VARCHAR(20) NOT NULL,
        winner_name VARCHAR(100),
        hand_name VARCHAR(100),
        net BIGINT NOT NULL DEFAULT 0,
        opponents JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_poker_hand_history_user ON poker_hand_history(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_poker_hand_history_token ON poker_hand_history(share_token)`);

    console.log('[DB] All tables initialized successfully');
  } catch (err) {
    console.error('[DB] Table initialization error:', err.message);
  }
}

export default pool;
