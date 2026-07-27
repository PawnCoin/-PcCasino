import { Router } from 'express';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { query } from './db.js';
import { requireAuth } from './auth-routes.js';
import { isDemoMode } from './demo-mode.js';
import { getRequiredPcThreshold } from './pc-pricing.js';
import { isValidSolanaAddress, getSolanaPcBalance } from './solana.js';

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

// Rail-aware $Pc balance check: Ethereum (0x...) wallets query the ERC-20
// contract; Solana wallets query SPL token accounts for PC_SPL_MINT. Both
// fail closed (balance null => not verified) on RPC/config errors.
export async function checkPcBalanceForAddress(walletAddress) {
  const addr = String(walletAddress || '').trim();
  if (/^0x/i.test(addr)) return checkOnChainPcBalance(addr);
  try {
    if (!process.env.PC_SPL_MINT) return { balance: null, error: 'PC_SPL_MINT not configured' };
    const balance = await getSolanaPcBalance(addr);
    if (balance === null) return { balance: null, error: 'Could not read Solana $Pc balance' };
    return { balance, error: null };
  } catch (err) {
    console.error('[WalletBalance SOL]', err.message);
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
  const { balance, error: balErr } = await checkPcBalanceForAddress(wallet.wallet_address);

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

// ---- Solana wallet linking via Phantom signMessage (ed25519) ----
// In-memory nonce store: userId -> { nonce, walletAddress, expiresAt }.
// Nonces are single-use and short-lived; server-side storage prevents a
// client from supplying its own (replayable) nonce.
const solanaLinkNonces = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000;

export function buildSolanaLinkMessage(walletAddress, nonce) {
  return `Pc Casino wallet link\nWallet: ${walletAddress}\nNonce: ${nonce}\n\nSign this message to prove you own this Solana wallet. This does not cost anything or approve any transaction.`;
}

// POST /api/wallets/solana/nonce — issue a one-time nonce to sign
router.post('/solana/nonce', requireAuth, async (req, res) => {
  const addr = String(req.body?.walletAddress || '').trim();
  if (!isValidSolanaAddress(addr)) {
    return res.status(400).json({ error: 'Valid Solana wallet address required' });
  }
  const nonce = crypto.randomBytes(24).toString('hex');
  solanaLinkNonces.set(req.user.id, { nonce, walletAddress: addr, expiresAt: Date.now() + NONCE_TTL_MS });
  res.json({ nonce, message: buildSolanaLinkMessage(addr, nonce) });
});

// POST /api/wallets/solana/verify — verify ed25519 signature and link wallet
router.post('/solana/verify', requireAuth, async (req, res) => {
  const addr = String(req.body?.walletAddress || '').trim();
  const signatureB64 = String(req.body?.signature || '').trim();
  if (!isValidSolanaAddress(addr) || !signatureB64) {
    return res.status(400).json({ error: 'walletAddress and signature required' });
  }

  const entry = solanaLinkNonces.get(req.user.id);
  if (!entry || entry.expiresAt < Date.now()) {
    solanaLinkNonces.delete(req.user.id);
    return res.status(400).json({ error: 'No active linking nonce. Please restart the linking flow.' });
  }
  if (entry.walletAddress !== addr) {
    return res.status(400).json({ error: 'Wallet address does not match the nonce request.' });
  }

  let signature;
  try {
    signature = Buffer.from(signatureB64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid signature encoding' });
  }
  if (signature.length !== 64) {
    return res.status(400).json({ error: 'Invalid signature length' });
  }

  let verified = false;
  try {
    const message = Buffer.from(buildSolanaLinkMessage(addr, entry.nonce), 'utf8');
    const pubkey = bs58.decode(addr);
    verified = nacl.sign.detached.verify(new Uint8Array(message), new Uint8Array(signature), new Uint8Array(pubkey));
  } catch (err) {
    console.error('[solana verify]', err.message);
    return res.status(400).json({ error: 'Signature verification failed' });
  }
  if (!verified) {
    return res.status(400).json({ error: 'Signature does not match this wallet. Make sure you signed with the selected Phantom account.' });
  }

  // Single-use: consume the nonce only after a successful verification so a
  // fat-fingered wrong-account signature can be retried within the TTL.
  solanaLinkNonces.delete(req.user.id);

  try {
    // Already linked (case-sensitive base58 compare)? Just mark ownership verified.
    const existing = await query(
      'SELECT id FROM user_wallets WHERE user_id = $1 AND wallet_address = $2',
      [req.user.id, addr]
    );
    if (existing.rows.length) {
      const upd = await query(
        `UPDATE user_wallets SET ownership_verified = TRUE, ownership_verified_at = NOW()
         WHERE id = $1 RETURNING *`,
        [existing.rows[0].id]
      );
      return res.json({ success: true, wallet: upd.rows[0], alreadyLinked: true });
    }

    const countResult = await query('SELECT COUNT(*) as cnt FROM user_wallets WHERE user_id = $1', [req.user.id]);
    if (parseInt(countResult.rows[0].cnt) >= MAX_WALLETS) {
      return res.status(400).json({ error: `Maximum of ${MAX_WALLETS} wallets allowed.` });
    }
    const isDefault = parseInt(countResult.rows[0].cnt) === 0;
    const result = await query(
      `INSERT INTO user_wallets (user_id, wallet_address, chain_label, label, is_default, ownership_verified, ownership_verified_at)
       VALUES ($1, $2, 'SOL', $3, $4, TRUE, NOW()) RETURNING *`,
      [req.user.id, addr, (String(req.body?.label || '').trim().slice(0, 100)) || 'Phantom', isDefault]
    );
    res.json({ success: true, wallet: result.rows[0] });
  } catch (err) {
    console.error('[solana verify link]', err.message);
    res.status(500).json({ error: 'Failed to link wallet' });
  }
});

// GET /api/wallets
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, wallet_address, chain_label, label, is_default, wallet_verified, wallet_verified_at, ownership_verified, ownership_verified_at, created_at
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
  // Rail-aware format enforcement: only well-formed EVM (0x + 40 hex) or
  // Solana base58 addresses may be stored. This blocks crafted strings that
  // could collide with real addresses under normalization.
  const isEvmAddr = /^0x[0-9a-fA-F]{40}$/.test(addr);
  const isSolAddr = isValidSolanaAddress(addr);
  if (!isEvmAddr && !isSolAddr) {
    return res.status(400).json({ error: 'Address must be a valid Ethereum (0x...) or Solana address.' });
  }
  const chain = (chainLabel || (isSolAddr && !isEvmAddr ? 'SOL' : 'ERC-20')).trim().slice(0, 50);
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
    const { balance, error: balErr } = await checkPcBalanceForAddress(wallet.rows[0].wallet_address);
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
