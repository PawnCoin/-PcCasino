import { Router } from 'express';
import { query } from './db.js';
import { requireAuth } from './auth-routes.js';
import { isDemoMode } from './demo-mode.js';
import { getRequiredPcThreshold } from './pc-pricing.js';

const router = Router();

const MAX_WALLETS = 5;

// Helper: check on-chain $Pc balance for an address
export async function checkOnChainPcBalance(walletAddress) {
  const contractAddress = process.env.PC_TOKEN_CONTRACT;
  if (!contractAddress) {
    return { balance: null, error: 'PC_TOKEN_CONTRACT not configured' };
  }

  // ERC-20 balanceOf(address) ABI selector = 0x70a08231
  const paddedAddr = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = `0x70a08231${paddedAddr}`;
  const rpcUrl = process.env.ETH_RPC_URL || 'https://cloudflare-eth.com';

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: contractAddress, data }, 'latest'],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await response.json();
    if (json.error) return { balance: null, error: json.error.message };

    const hex = json.result;
    if (!hex || hex === '0x') return { balance: 0n, error: null };

    const balanceBigInt = BigInt(hex);
    const balanceTokens = balanceBigInt / BigInt(10 ** 18);

    return { balance: balanceTokens, error: null };
  } catch (err) {
    console.error('[WalletBalance]', err.message);
    return { balance: null, error: err.message };
  }
}

// Perform live balance check on the user's default wallet; update wallet_verified + real_transactions_unlocked
// Returns { meetsThreshold, walletAddress, currentBalance, requiredBalance, usdBasis, pricePerPc, error }
export async function refreshDefaultWalletVerification(userId, kycStatus) {
  const threshold = await getRequiredPcThreshold();

  // Fail-closed when the threshold cannot be computed (no live or cached price).
  if (threshold.unavailable) {
    await query('UPDATE users SET real_transactions_unlocked = FALSE WHERE id = $1', [userId]);
    return {
      meetsThreshold: false,
      walletAddress: null,
      requiredBalance: null,
      usdBasis: threshold.usdBasis,
      pricePerPc: null,
      priceUnavailable: true,
      error: threshold.error || 'Wallet eligibility threshold temporarily unavailable',
    };
  }

  const walletResult = await query(
    'SELECT id, wallet_address FROM user_wallets WHERE user_id = $1 AND is_default = TRUE LIMIT 1',
    [userId]
  );

  if (!walletResult.rows.length) {
    // No wallet linked — ensure unlock is false
    await query('UPDATE users SET real_transactions_unlocked = FALSE WHERE id = $1', [userId]);
    return {
      meetsThreshold: false,
      walletAddress: null,
      requiredBalance: threshold.pcAmount.toString(),
      usdBasis: threshold.usdBasis,
      pricePerPc: threshold.pricePerPc,
      error: 'No default wallet linked',
    };
  }

  const wallet = walletResult.rows[0];
  const { balance, error: balErr } = await checkOnChainPcBalance(wallet.wallet_address);

  const meetsThreshold = balance !== null && balance >= threshold.pcAmount;

  await query(
    `UPDATE user_wallets SET wallet_verified = $1, wallet_verified_at = CASE WHEN $1 THEN NOW() ELSE wallet_verified_at END WHERE id = $2`,
    [meetsThreshold, wallet.id]
  );

  const kycApproved = kycStatus === 'approved';
  const unlock = kycApproved && meetsThreshold;
  await query('UPDATE users SET real_transactions_unlocked = $1 WHERE id = $2', [unlock, userId]);

  return {
    meetsThreshold,
    walletAddress: wallet.wallet_address,
    currentBalance: balance !== null ? balance.toString() : null,
    requiredBalance: threshold.pcAmount.toString(),
    usdBasis: threshold.usdBasis,
    pricePerPc: threshold.pricePerPc,
    priceStale: threshold.stale,
    error: balErr,
  };
}

// GET /api/wallets
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, wallet_address, chain_label, label, is_default, wallet_verified, wallet_verified_at, created_at
       FROM user_wallets WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [req.user.id]
    );
    res.json({ wallets: result.rows });
  } catch (err) {
    console.error('[GET wallets]', err.message);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// POST /api/wallets — add a wallet (max 5)
router.post('/', requireAuth, async (req, res) => {
  const { walletAddress, chainLabel, label } = req.body;
  if (!walletAddress || walletAddress.trim().length < 10) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  const addr = walletAddress.trim();
  const chain = (chainLabel || 'ERC-20').trim().slice(0, 50);
  const lbl = (label || '').trim().slice(0, 100) || null;

  try {
    const countResult = await query(
      'SELECT COUNT(*) as cnt FROM user_wallets WHERE user_id = $1',
      [req.user.id]
    );
    if (parseInt(countResult.rows[0].cnt) >= MAX_WALLETS) {
      return res.status(400).json({ error: `Maximum of ${MAX_WALLETS} wallets allowed.` });
    }

    const dupCheck = await query(
      'SELECT id FROM user_wallets WHERE user_id = $1 AND LOWER(wallet_address) = LOWER($2)',
      [req.user.id, addr]
    );
    if (dupCheck.rows.length) {
      return res.status(409).json({ error: 'This wallet address is already linked.' });
    }

    const isDefault = parseInt(countResult.rows[0].cnt) === 0;

    const result = await query(
      `INSERT INTO user_wallets (user_id, wallet_address, chain_label, label, is_default)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, addr, chain, lbl, isDefault]
    );

    res.json({ success: true, wallet: result.rows[0] });
  } catch (err) {
    console.error('[POST wallets]', err.message);
    res.status(500).json({ error: 'Failed to add wallet' });
  }
});

// DELETE /api/wallets/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const walletId = parseInt(req.params.id, 10);
  if (!walletId) return res.status(400).json({ error: 'Invalid wallet ID' });

  try {
    const wallet = await query(
      'SELECT * FROM user_wallets WHERE id = $1 AND user_id = $2',
      [walletId, req.user.id]
    );
    if (!wallet.rows.length) return res.status(404).json({ error: 'Wallet not found' });

    await query('DELETE FROM user_wallets WHERE id = $1', [walletId]);

    if (wallet.rows[0].is_default) {
      await query(
        `UPDATE user_wallets SET is_default = TRUE
         WHERE user_id = $1 AND id = (SELECT id FROM user_wallets WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [req.user.id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE wallet]', err.message);
    res.status(500).json({ error: 'Failed to remove wallet' });
  }
});

// PATCH /api/wallets/:id/default
router.patch('/:id/default', requireAuth, async (req, res) => {
  const walletId = parseInt(req.params.id, 10);
  if (!walletId) return res.status(400).json({ error: 'Invalid wallet ID' });

  try {
    const wallet = await query(
      'SELECT * FROM user_wallets WHERE id = $1 AND user_id = $2',
      [walletId, req.user.id]
    );
    if (!wallet.rows.length) return res.status(404).json({ error: 'Wallet not found' });

    await query('UPDATE user_wallets SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    await query('UPDATE user_wallets SET is_default = TRUE WHERE id = $1', [walletId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH wallet default]', err.message);
    res.status(500).json({ error: 'Failed to set default wallet' });
  }
});

// POST /api/wallets/:id/verify-balance — manual check for a specific wallet
router.post('/:id/verify-balance', requireAuth, async (req, res) => {
  const walletId = parseInt(req.params.id, 10);
  if (!walletId) return res.status(400).json({ error: 'Invalid wallet ID' });

  try {
    const wallet = await query(
      'SELECT * FROM user_wallets WHERE id = $1 AND user_id = $2',
      [walletId, req.user.id]
    );
    if (!wallet.rows.length) return res.status(404).json({ error: 'Wallet not found' });

    const threshold = await getRequiredPcThreshold();
    if (threshold.unavailable) {
      await query('UPDATE users SET real_transactions_unlocked = FALSE WHERE id = $1', [req.user.id]);
      return res.status(503).json({
        error: threshold.error || 'Price feed unavailable; cannot compute wallet threshold. Please retry shortly.',
        code: 'PRICE_FEED_UNAVAILABLE',
        priceUnavailable: true,
      });
    }
    const { balance, error: balErr } = await checkOnChainPcBalance(wallet.rows[0].wallet_address);
    const meetsThreshold = balance !== null && balance >= threshold.pcAmount;

    await query(
      `UPDATE user_wallets SET wallet_verified = $1, wallet_verified_at = CASE WHEN $1 THEN NOW() ELSE wallet_verified_at END WHERE id = $2`,
      [meetsThreshold, walletId]
    );

    const userResult = await query('SELECT kyc_status FROM users WHERE id = $1', [req.user.id]);
    const kycApproved = userResult.rows[0]?.kyc_status === 'approved';
    const unlock = kycApproved && meetsThreshold;

    await query('UPDATE users SET real_transactions_unlocked = $1 WHERE id = $2', [unlock, req.user.id]);

    const demo = isDemoMode();
    res.json({
      balance: balance !== null ? balance.toString() : null,
      meetsThreshold,
      walletVerified: meetsThreshold,
      realTransactionsUnlocked: demo ? false : unlock,
      demoMode: demo,
      threshold: threshold.pcAmount.toString(),
      thresholdUsd: threshold.usdBasis,
      pricePerPc: threshold.pricePerPc,
      priceStale: threshold.stale,
      error: balErr || null,
    });
  } catch (err) {
    console.error('[verify-balance]', err.message);
    res.status(500).json({ error: 'Balance verification failed' });
  }
});

export default router;
