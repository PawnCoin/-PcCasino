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
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(60)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_telegram VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_discord VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS public_stats_visible BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS public_socials_visible BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_house BOOLEAN DEFAULT FALSE`,
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
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);

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
    // Backfill: lowercase any existing tx_hash values so the case-insensitive
    // unique index below can be created without collisions on legacy data.
    // Backfill lowercasing applies ONLY to Ethereum-style 0x… hashes.
    // Solana signatures are base58 and case-SENSITIVE — lowercasing them
    // would make them permanently unverifiable on-chain. The functional
    // unique index below still provides case-insensitive dedupe for all rails.
    await query(`UPDATE deposit_requests SET tx_hash = LOWER(tx_hash) WHERE tx_hash IS NOT NULL AND tx_hash <> LOWER(tx_hash) AND tx_hash ~* '^0x[0-9a-f]+$'`).catch(() => {});
    // Functional unique index on lowercased tx_hash — hard guarantee against
    // replay/double-credit even if dedupe logic is bypassed somewhere.
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_tx_hash_lower ON deposit_requests (LOWER(tx_hash)) WHERE tx_hash IS NOT NULL`).catch((e) => {
      console.warn('[DB] uq_deposit_tx_hash_lower not created:', e.message);
    });

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
    // Idempotency key for withdrawal auto-payouts (Task #91). Generated at
    // withdraw-request creation; protects against double-broadcast races.
    await query(`ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64)`).catch(() => {});
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_withdraw_idempotency_key ON withdraw_requests (idempotency_key) WHERE idempotency_key IS NOT NULL`).catch(() => {});
    // Tracks the last time the post-timeout reconciler (Task #93) re-checked
    // a 'sending' row's on-chain receipt. Used by recheckTimedOutPayouts to
    // rotate fairly through the queue (NULLS FIRST for never-rechecked rows)
    // so a backlog of >25 stuck payouts can't starve newer arrivals.
    await query(`ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS last_rechecked_at TIMESTAMP`).catch(() => {});

    // Payout audit log — every send attempt (sent / confirmed / reverted /
    // breaker_blocked / send_failed). Used by the admin "Payout System
    // Health" panel and by the breaker to compute rolling 1h / 24h windows.
    await query(`
      CREATE TABLE IF NOT EXISTS payout_log (
        id SERIAL PRIMARY KEY,
        withdraw_id INTEGER REFERENCES withdraw_requests(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        idempotency_key VARCHAR(64),
        status VARCHAR(30) NOT NULL,
        tx_hash VARCHAR(255),
        amount BIGINT NOT NULL,
        to_address VARCHAR(255),
        error_message TEXT,
        gas_price VARCHAR(64),
        gas_limit VARCHAR(64),
        gas_used VARCHAR(64),
        wallet_balance_after VARCHAR(80),
        nonce INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Idempotent migrations for environments that already have payout_log.
    await query(`ALTER TABLE payout_log ADD COLUMN IF NOT EXISTS user_id INTEGER`).catch(() => {});
    await query(`ALTER TABLE payout_log ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64)`).catch(() => {});
    await query(`ALTER TABLE payout_log ADD COLUMN IF NOT EXISTS gas_used VARCHAR(64)`).catch(() => {});
    await query(`ALTER TABLE payout_log ADD COLUMN IF NOT EXISTS wallet_balance_after VARCHAR(80)`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_payout_log_created ON payout_log(created_at DESC)`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_payout_log_withdraw ON payout_log(withdraw_id)`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_payout_log_status_created ON payout_log(status, created_at DESC)`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_payout_log_idem_key ON payout_log(idempotency_key) WHERE idempotency_key IS NOT NULL`).catch(() => {});

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
    // Link transaction rows to specific deposit/withdraw requests so admin
    // status updates only touch the correct row (avoids fan-out across all
    // pending withdrawals for a user).
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS withdraw_request_id INTEGER`).catch(() => {});
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deposit_request_id INTEGER`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_tx_withdraw_request ON transactions(withdraw_request_id)`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_tx_deposit_request ON transactions(deposit_request_id)`).catch(() => {});

    // Admin audit log — append-only record of admin actions on payment flows
    // (mark-sent, reject, manual credit). Used for accountability + later
    // reconciliation.
    await query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_username VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(40),
        target_id INTEGER,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id)`).catch(() => {});

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

    // VIP cashback payment history
    await query(`
      CREATE TABLE IF NOT EXISTS cashback_payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(30) NOT NULL,
        vip_tier VARCHAR(20) NOT NULL,
        cashback_rate NUMERIC(5,4) NOT NULL,
        net_losses BIGINT NOT NULL,
        cashback_amount BIGINT NOT NULL,
        week_start TIMESTAMP NOT NULL,
        week_end TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_cashback_payments_user ON cashback_payments(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cashback_payments_created ON cashback_payments(created_at DESC)`);

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

    // Affiliate payout requests — created when an affiliate clicks "Request Payout"
    await query(`
      CREATE TABLE IF NOT EXISTS affiliate_payout_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_affiliate_payout_user ON affiliate_payout_requests(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_affiliate_payout_status ON affiliate_payout_requests(status)`);

    // Migration: add deposit_total to referrals for caching referred user totals
    await query(`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deposit_total BIGINT DEFAULT 0`).catch(() => {});

    // KYC columns on users
    const kycUserColumns = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'unverified'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE`,
    ];
    for (const sql of kycUserColumns) {
      await query(sql).catch(() => {});
    }

    // KYC submissions table
    await query(`
      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        id_document_path TEXT,
        selfie_path TEXT,
        id_document_data TEXT,
        selfie_data TEXT,
        rejection_reason TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await query(`ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS id_document_data TEXT`).catch(() => {});
    await query(`ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS selfie_data TEXT`).catch(() => {});
    await query(`ALTER TABLE kyc_submissions ADD COLUMN IF NOT EXISTS document_fingerprint VARCHAR(64)`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user ON kyc_submissions(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON kyc_submissions(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_kyc_submissions_fingerprint ON kyc_submissions(document_fingerprint)`).catch(() => {});

    // User wallets table
    await query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        wallet_address VARCHAR(255) NOT NULL,
        chain_label VARCHAR(50) DEFAULT 'ERC-20',
        label VARCHAR(100),
        is_default BOOLEAN DEFAULT FALSE,
        wallet_verified BOOLEAN DEFAULT FALSE,
        wallet_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON user_wallets(user_id)`);
    // Cryptographic proof-of-ownership (e.g. Phantom signMessage for Solana wallets)
    await query(`ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS ownership_verified BOOLEAN DEFAULT FALSE`).catch(() => {});
    await query(`ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS ownership_verified_at TIMESTAMP`).catch(() => {});
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS real_transactions_unlocked BOOLEAN DEFAULT FALSE`).catch(() => {});

    // OTP store for phone verification (in-memory handled server side, but store for audit)
    // Phone OTP is stored in-memory with expiry, no persistent table needed

    // ---- Friends / Social system ----
    await query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(requester_id, addressee_id),
        CHECK (requester_id <> addressee_id),
        CHECK (status IN ('pending','accepted','blocked'))
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id)`);

    // Direct messages between friends
    await query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_flagged BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at DESC)`);

    // Game encounters — who you've shared a room with
    await query(`
      CREATE TABLE IF NOT EXISTS game_encounters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        other_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_type VARCHAR(50),
        room_id VARCHAR(100),
        encountered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, other_user_id, room_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_encounters_user ON game_encounters(user_id, encountered_at DESC)`);

    // System-wide flags (idempotent migrations / backfills tracking)
    await query(`
      CREATE TABLE IF NOT EXISTS system_flags (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[DB] All tables initialized successfully');
  } catch (err) {
    console.error('[DB] Table initialization error:', err.message);
  }
}

export default pool;
