import { Router } from 'express';
import { query, pool } from './db.js';
import { requireAuth } from './auth-routes.js';
import { sendDepositConfirmationEmail, sendWithdrawEmail } from './email.js';

const router = Router();
// TREASURY WALLET — set DEPOSIT_WALLET_ADDRESS in environment secrets before going live
// This is where all player deposits are received on-chain
const DEPOSIT_ADDRESS = process.env.DEPOSIT_WALLET_ADDRESS;
if (!DEPOSIT_ADDRESS) {
  console.warn('[PAYMENTS] WARNING: DEPOSIT_WALLET_ADDRESS is not set. Deposits will be rejected until configured.');
}

// Get deposit address
router.get('/address', requireAuth, (req, res) => {
  if (!DEPOSIT_ADDRESS) {
    return res.status(503).json({ error: 'Deposit address not configured. Please contact support.' });
  }
  res.json({ address: DEPOSIT_ADDRESS });
});

// Submit deposit request (user says "I've sent the payment")
router.post('/deposit/request', requireAuth, async (req, res) => {
  const { amount, txHash, fromAddress, network } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const user = req.user;

  // Check daily deposit limit
  if (parseInt(user.daily_deposit_limit) > 0) {
    const todayDeposits = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM deposit_requests
       WHERE user_id = $1 AND status = 'approved' AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const todayTotal = parseInt(todayDeposits.rows[0].total);
    if (todayTotal + amount > parseInt(user.daily_deposit_limit)) {
      return res.status(400).json({ error: 'Daily deposit limit exceeded' });
    }
  }

  try {
    const result = await query(
      `INSERT INTO deposit_requests (user_id, amount, tx_hash, from_address, network)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, amount, txHash || null, fromAddress || null, network || 'ERC-20']
    );

    // Add notification
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Request Submitted', $2)",
      [user.id, `Your deposit of ${parseInt(amount).toLocaleString()} $Pc is pending review. It will be credited within 24 hours.`]
    );

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('Deposit request error:', err);
    res.status(500).json({ error: 'Deposit request failed' });
  }
});

// Admin: approve deposit
router.post('/deposit/:id/approve', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });

  try {
    const dep = await query('SELECT * FROM deposit_requests WHERE id = $1', [req.params.id]);
    if (!dep.rows.length) return res.status(404).json({ error: 'Not found' });
    const d = dep.rows[0];
    if (d.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    await query('BEGIN');
    await query('UPDATE deposit_requests SET status = $1, processed_at = NOW() WHERE id = $2', ['approved', d.id]);
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [d.amount, d.user_id]);
    await query(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
      [d.user_id, 'deposit', d.amount, `Deposit approved - ${d.network}`]
    );

    // Leaderboard update
    await query(
      `INSERT INTO leaderboard (user_id, username, balance) 
       SELECT id, username, balance FROM users WHERE id = $1
       ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance`,
      [d.user_id]
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
        [d.user_id]
      );
      if (ref.rows.length) {
        const referrerId = ref.rows[0].referrer_id;
        const commission = Math.floor(parseInt(d.amount) * 0.1);
        await commClient.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [commission, referrerId]);
        await commClient.query(
          'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
          [referrerId, 'referral_commission', commission, `Referral commission from user #${d.user_id} first deposit`]
        );
        await commClient.query('COMMIT');
        // Notification is outside the transaction — non-fatal side effect
        await query(
          "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'referral', 'Referral Commission! 🎉', $2)",
          [referrerId, `You earned ${commission.toLocaleString()} $Pc (10%) referral commission from your friend's first deposit!`]
        );
      } else {
        await commClient.query('ROLLBACK');
      }
    } catch (commErr) {
      await commClient.query('ROLLBACK').catch(() => {});
      console.error('[referral commission]', commErr.message);
    } finally {
      commClient.release();
    }

    // Send email
    const user = await query('SELECT email, username FROM users WHERE id = $1', [d.user_id]);
    if (user.rows[0]?.email) {
      sendDepositConfirmationEmail(user.rows[0].email, user.rows[0].username, d.amount).catch(() => {});
    }

    // Add notification
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'deposit', 'Deposit Approved! ✅', $2)",
      [d.user_id, `Your deposit of ${parseInt(d.amount).toLocaleString()} $Pc has been credited to your account.`]
    );

    res.json({ success: true });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Approve deposit error:', err);
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Admin: reject deposit
router.post('/deposit/:id/reject', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const { note } = req.body;
  try {
    await query('UPDATE deposit_requests SET status = $1, admin_note = $2, processed_at = NOW() WHERE id = $3',
      ['rejected', note || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// Submit withdraw request
router.post('/withdraw/request', requireAuth, async (req, res) => {
  const { amount, toAddress, network } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!toAddress) return res.status(400).json({ error: 'Destination address required' });

  const user = req.user;
  const balance = parseInt(user.balance);

  if (amount > balance) return res.status(400).json({ error: 'Insufficient balance' });

  // Check daily loss limit
  if (parseInt(user.daily_loss_limit) > 0) {
    const todayLoss = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'bet' AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const todayWon = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = $1 AND type = 'win' AND created_at > NOW() - INTERVAL '24 hours'`,
      [user.id]
    );
    const netLoss = parseInt(todayLoss.rows[0].total) - parseInt(todayWon.rows[0].total);
    if (netLoss >= parseInt(user.daily_loss_limit)) {
      return res.status(400).json({ error: 'Daily loss limit reached. Withdrawal blocked until tomorrow.' });
    }
  }

  try {
    await query('BEGIN');
    // Reserve balance
    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, user.id]);

    const result = await query(
      `INSERT INTO withdraw_requests (user_id, amount, to_address, network)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, amount, toAddress, network || 'ERC-20']
    );
    await query(
      'INSERT INTO transactions (user_id, type, amount, description, status) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'withdraw', amount, `Withdrawal request to ${toAddress.slice(0, 10)}...`, 'pending']
    );
    await query('COMMIT');

    // Send email
    if (user.email) {
      sendWithdrawEmail(user.email, user.username, amount, toAddress).catch(() => {});
    }

    // Add notification
    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Requested', $2)",
      [user.id, `Withdrawal of ${parseInt(amount).toLocaleString()} $Pc to ${toAddress.slice(0, 16)}... is pending. Processing within 24-48 hours.`]
    );

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Withdraw request error:', err);
    res.status(500).json({ error: 'Withdrawal request failed' });
  }
});

// Admin: approve withdraw
router.post('/withdraw/:id/approve', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const wr = await query('SELECT * FROM withdraw_requests WHERE id = $1', [req.params.id]);
    if (!wr.rows.length) return res.status(404).json({ error: 'Not found' });
    const w = wr.rows[0];
    if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    await query('UPDATE withdraw_requests SET status = $1, processed_at = NOW() WHERE id = $2', ['approved', w.id]);
    await query("UPDATE transactions SET status = 'completed' WHERE user_id = $1 AND type = 'withdraw' AND status = 'pending'", [w.user_id]);
    await query("INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'withdraw', 'Withdrawal Sent ✅', $2)",
      [w.user_id, `Your withdrawal of ${parseInt(w.amount).toLocaleString()} $Pc has been sent to ${w.to_address.slice(0, 16)}...`]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Record bet/win transactions
router.post('/transaction', requireAuth, async (req, res) => {
  const { type, amount, game, description } = req.body;
  if (!type || !amount) return res.status(400).json({ error: 'type and amount required' });

  const user = req.user;

  try {
    if (type === 'bet') {
      if (parseInt(user.balance) < amount) return res.status(400).json({ error: 'Insufficient balance' });

      // Check responsible gambling - daily loss limit
      if (parseInt(user.daily_loss_limit) > 0) {
        const todayBets = await query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
           WHERE user_id = $1 AND type = 'bet' AND created_at > NOW() - INTERVAL '24 hours'`,
          [user.id]
        );
        const todayWins = await query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
           WHERE user_id = $1 AND type = 'win' AND created_at > NOW() - INTERVAL '24 hours'`,
          [user.id]
        );
        const netLoss = parseInt(todayBets.rows[0].total) - parseInt(todayWins.rows[0].total);
        if (netLoss + amount > parseInt(user.daily_loss_limit)) {
          return res.status(400).json({ error: 'Daily loss limit reached. Betting blocked until tomorrow.', limitReached: true });
        }
      }

      await query('UPDATE users SET balance = balance - $1, total_wagered = total_wagered + $1 WHERE id = $2', [amount, user.id]);
    } else if (type === 'win') {
      await query('UPDATE users SET balance = balance + $1, total_won = total_won + $1 WHERE id = $2', [amount, user.id]);

      // Update VIP tier
      const updated = await query('SELECT total_wagered, username, balance FROM users WHERE id = $1', [user.id]);
      const totalWagered = parseInt(updated.rows[0].total_wagered);
      let tier = 'bronze';
      if (totalWagered >= 10_000_000_000) tier = 'diamond';
      else if (totalWagered >= 1_000_000_000) tier = 'platinum';
      else if (totalWagered >= 100_000_000) tier = 'gold';
      else if (totalWagered >= 10_000_000) tier = 'silver';
      await query('UPDATE users SET vip_tier = $1 WHERE id = $2', [tier, user.id]);

      // Update leaderboard
      await query(
        `INSERT INTO leaderboard (user_id, username, total_won, balance, games_played, favorite_game)
         SELECT id, username, total_won, balance, 1, $2 FROM users WHERE id = $1
         ON CONFLICT (user_id) DO UPDATE SET
           total_won = leaderboard.total_won + $3,
           balance = EXCLUDED.balance,
           games_played = leaderboard.games_played + 1,
           updated_at = NOW()`,
        [user.id, game || 'unknown', amount]
      );
    }

    const txResult = await query(
      'INSERT INTO transactions (user_id, type, amount, game, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.id, type, amount, game || null, description || null]
    );

    const balResult = await query('SELECT balance FROM users WHERE id = $1', [user.id]);
    res.json({ success: true, transaction: txResult.rows[0], balance: parseInt(balResult.rows[0].balance) });
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

// Get user transactions
router.get('/transactions', requireAuth, async (req, res) => {
  const { type, limit = 100, offset = 0 } = req.query;
  let queryText = 'SELECT * FROM transactions WHERE user_id = $1';
  const params = [req.user.id];

  if (type && type !== 'all') {
    queryText += ` AND type = $${params.length + 1}`;
    params.push(type);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const result = await query(queryText, params);
    res.json({ transactions: result.rows.map(t => ({ ...t, amount: parseInt(t.amount) })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get pending deposit/withdraw requests (admin)
router.get('/admin/deposits', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const result = await query(
    `SELECT d.*, u.username, u.email FROM deposit_requests d
     JOIN users u ON d.user_id = u.id
     ORDER BY d.created_at DESC LIMIT 50`
  );
  res.json({ deposits: result.rows });
});

router.get('/admin/withdrawals', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  const result = await query(
    `SELECT w.*, u.username, u.email FROM withdraw_requests w
     JOIN users u ON w.user_id = u.id
     ORDER BY w.created_at DESC LIMIT 50`
  );
  res.json({ withdrawals: result.rows });
});

export default router;
