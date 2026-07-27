// Solana rail for $Pc: SPL deposit verification + SPL token payouts.
//
// Mirrors the Ethereum modules (pc-pricing.verifyOnChainDeposit and
// payout-signer) so the payments routes / payout engine can treat both
// networks uniformly:
//
//   verifySolanaDeposit({ signature, expectedTokens })
//     -> { status: 'confirmed'|'pending'|'rejected'|'needs_review', ... }
//   sendSplTransfer({ to, amountTokens })  -> { txHash }
//   waitForSolanaReceipt(sig, opts)        -> { status: 'confirmed'|'failed'|'timeout' }
//   checkSolanaSignatureOnce(sig)          -> single-shot status probe
//   getSolanaPcBalance()                   -> hot-wallet whole-token balance (bigint)
//
// Config (env):
//   SOL_DEPOSIT_WALLET        — treasury owner address deposits are sent to
//   PC_SPL_MINT               — $Pc SPL mint address on Solana
//   SOLANA_PAYOUT_PRIVATE_KEY — hot-wallet secret key (base58 or JSON byte array)
//   SOLANA_RPC_URL            — primary RPC (default mainnet-beta)
//   SOLANA_RPC_FALLBACK_URLS  — comma-separated failover RPCs
//
// Fail-closed: anything unconfigured or ambiguous routes to 'needs_review'
// (deposits) or a skipped/failed payout — never a silent credit or send.

import {
  Connection, Keypair, PublicKey, Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';

const BASE58_SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;
const BASE58_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaNetwork(network) {
  return /sol/i.test(String(network || ''));
}

export function isValidSolanaAddress(addr) {
  if (!addr || !BASE58_ADDR_RE.test(String(addr).trim())) return false;
  try { new PublicKey(String(addr).trim()); return true; } catch { return false; }
}

export function isValidSolanaSignature(sig) {
  return !!sig && BASE58_SIG_RE.test(String(sig).trim());
}

function rpcUrls() {
  const urls = [process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'];
  const extra = (process.env.SOLANA_RPC_FALLBACK_URLS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  return [...urls, ...extra];
}

// Raw JSON-RPC with failover across all configured endpoints.
export async function solRpc(method, params) {
  let lastErr = null;
  for (const url of rpcUrls()) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`All Solana RPCs failed: ${lastErr?.message || 'unknown'}`);
}

function pcMint() { return (process.env.PC_SPL_MINT || '').trim() || null; }
function solTreasury() { return (process.env.SOL_DEPOSIT_WALLET || '').trim() || null; }

export function isSolanaDepositConfigured() {
  return !!(pcMint() && solTreasury());
}

// ---- Deposit verification ----
//
// Confirms `signature` is a finalized SPL transfer of >= expectedTokens of
// PC_SPL_MINT into the SOL_DEPOSIT_WALLET owner. Uses token-balance deltas
// from transaction meta (robust across transfer/transferChecked/CPI paths).
export async function verifySolanaDeposit({ signature, expectedTokens }) {
  const sig = String(signature || '').trim();
  if (!isValidSolanaSignature(sig)) {
    return { status: 'rejected', reason: 'Invalid Solana transaction signature format' };
  }
  const mint = pcMint();
  const treasury = solTreasury();
  if (!mint) return { status: 'needs_review', reason: 'PC_SPL_MINT not configured' };
  if (!treasury) return { status: 'needs_review', reason: 'SOL_DEPOSIT_WALLET not configured' };

  let tx, statuses;
  try {
    [tx, statuses] = await Promise.all([
      solRpc('getTransaction', [sig, {
        encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0,
      }]),
      solRpc('getSignatureStatuses', [[sig], { searchTransactionHistory: true }]),
    ]);
  } catch (err) {
    return { status: 'needs_review', reason: `Solana RPC unavailable: ${err.message}` };
  }

  const st = statuses?.value?.[0] || null;
  if (!tx) {
    // Not found (yet) — treat as pending; the recheck loop will retry, and
    // 7-day-old rows age out of the sweep naturally.
    return { status: 'pending', confirmations: 0, required: 'finalized', reason: 'Transaction not found yet' };
  }
  if (tx.meta?.err) {
    return { status: 'rejected', reason: 'Transaction failed on-chain' };
  }

  // Sum treasury-owned balance deltas for the $Pc mint.
  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];
  const sumFor = (list, ownerFilter) => list
    .filter(b => b.mint === mint && (!ownerFilter || b.owner === ownerFilter))
    .reduce((acc, b) => acc + BigInt(b.uiTokenAmount?.amount || '0'), 0n);
  const preAmt = sumFor(pre, treasury);
  const postAmt = sumFor(post, treasury);
  const deltaRaw = postAmt - preAmt;
  if (deltaRaw <= 0n) {
    return { status: 'rejected', reason: 'No $Pc transfer to the deposit wallet found in this transaction' };
  }
  const decimals = (post.find(b => b.mint === mint) || pre.find(b => b.mint === mint))
    ?.uiTokenAmount?.decimals ?? 9;
  const amountTokens = deltaRaw / (10n ** BigInt(decimals));
  const expected = BigInt(Math.floor(Number(expectedTokens) || 0));
  if (amountTokens < expected) {
    return {
      status: 'rejected',
      reason: `On-chain transfer (${amountTokens.toString()} $Pc) is less than requested deposit (${expected.toString()} $Pc)`,
      amountTokens,
    };
  }

  // Sender: owner of the token account whose $Pc balance decreased;
  // fall back to the fee payer (first signer).
  let fromAddress = null;
  for (const b of pre) {
    if (b.mint !== mint || b.owner === treasury) continue;
    const after = post.find(p => p.accountIndex === b.accountIndex);
    const preV = BigInt(b.uiTokenAmount?.amount || '0');
    const postV = BigInt(after?.uiTokenAmount?.amount || '0');
    if (postV < preV) { fromAddress = b.owner || null; break; }
  }
  if (!fromAddress) {
    const keys = tx.transaction?.message?.accountKeys || [];
    const feePayer = keys.find(k => k.signer) || keys[0];
    fromAddress = typeof feePayer === 'string' ? feePayer : (feePayer?.pubkey || null);
  }

  // Require finality before crediting — Solana's equivalent of ETH's
  // 12-confirmation rule. 'confirmed' commitment can still be reorged.
  const conf = st?.confirmationStatus || null;
  if (conf !== 'finalized') {
    return {
      status: 'pending',
      confirmations: st?.confirmations ?? 0,
      required: 'finalized',
      amountTokens,
    };
  }

  return { status: 'confirmed', amountTokens, fromAddress, confirmations: 'finalized' };
}

// ---- Payouts ----

let _cachedKeypair = null;
function _loadKeypair() {
  if (_cachedKeypair) return _cachedKeypair;
  const raw = (process.env.SOLANA_PAYOUT_PRIVATE_KEY || '').trim();
  if (!raw) return null;
  let secret;
  if (raw.startsWith('[')) {
    secret = Uint8Array.from(JSON.parse(raw));
  } else {
    secret = bs58.decode(raw);
  }
  _cachedKeypair = Keypair.fromSecretKey(secret);
  return _cachedKeypair;
}

export function getSolanaPayoutAddress() {
  try { return _loadKeypair()?.publicKey?.toBase58() || null; } catch { return null; }
}

export function isSolanaPayoutConfigured() {
  try { return !!(_loadKeypair() && pcMint()); } catch { return false; }
}

let _mintDecimalsCache = null;
async function _getMintDecimals() {
  if (_mintDecimalsCache !== null) return _mintDecimalsCache;
  const res = await solRpc('getTokenSupply', [pcMint()]);
  const d = res?.value?.decimals;
  if (typeof d !== 'number') throw new Error('Could not read $Pc mint decimals');
  _mintDecimalsCache = d;
  return d;
}

// Hot-wallet whole-token $Pc balance (bigint), for breaker floor checks.
export async function getSolanaPcBalance(ownerAddress) {
  const owner = ownerAddress || getSolanaPayoutAddress();
  if (!owner || !pcMint()) return null;
  const res = await solRpc('getTokenAccountsByOwner', [
    owner, { mint: pcMint() }, { encoding: 'jsonParsed' },
  ]);
  let raw = 0n;
  let decimals = 9;
  for (const acc of res?.value || []) {
    const info = acc.account?.data?.parsed?.info?.tokenAmount;
    if (!info) continue;
    raw += BigInt(info.amount || '0');
    decimals = info.decimals ?? decimals;
  }
  return raw / (10n ** BigInt(decimals));
}

export async function getSolanaNativeBalance(ownerAddress) {
  const owner = ownerAddress || getSolanaPayoutAddress();
  if (!owner) return null;
  const res = await solRpc('getBalance', [owner]);
  return BigInt(res?.value ?? res ?? 0);
}

// Serialize sends so blockhash/sig bookkeeping never interleaves.
let _sendChain = Promise.resolve();
function _withSendLock(fn) {
  const next = _sendChain.then(fn, fn);
  _sendChain = next.catch(() => {});
  return next;
}

// Sign + broadcast an SPL $Pc transfer from the Solana hot wallet.
// amountTokens: bigint whole tokens. Returns { txHash } (base58 signature).
export async function sendSplTransfer({ to, amountTokens }) {
  if (!isSolanaPayoutConfigured()) throw new Error('SOLANA_PAYOUT_PRIVATE_KEY or PC_SPL_MINT not configured');
  if (!isValidSolanaAddress(to)) throw new Error('Invalid Solana destination address');
  if (typeof amountTokens !== 'bigint') amountTokens = BigInt(amountTokens);
  if (amountTokens <= 0n) throw new Error('Amount must be > 0');

  return _withSendLock(async () => {
    const kp = _loadKeypair();
    const mintPk = new PublicKey(pcMint());
    const destOwner = new PublicKey(String(to).trim());
    const decimals = await _getMintDecimals();
    const rawAmount = amountTokens * (10n ** BigInt(decimals));

    const fromAta = getAssociatedTokenAddressSync(mintPk, kp.publicKey, false);
    const destAta = getAssociatedTokenAddressSync(mintPk, destOwner, false);

    const tx = new Transaction();
    // Idempotent ATA create — no-op if the recipient already has one, and
    // guarantees payouts work for wallets that never held $Pc before.
    tx.add(createAssociatedTokenAccountIdempotentInstruction(
      kp.publicKey, destAta, destOwner, mintPk,
    ));
    tx.add(createTransferCheckedInstruction(
      fromAta, mintPk, destAta, kp.publicKey, rawAmount, decimals,
    ));

    // Blockhash acquisition with failover across all RPCs (a primary-RPC
    // outage must not block payout signing when a fallback is healthy).
    let blockhash = null, lastValidBlockHeight = null, bhErr = null;
    for (const url of rpcUrls()) {
      try {
        const c = new Connection(url, { commitment: 'confirmed' });
        ({ blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed'));
        break;
      } catch (e) { bhErr = e; }
    }
    if (!blockhash) throw new Error(`Solana blockhash fetch failed: ${bhErr?.message || 'unknown'}`);
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = kp.publicKey;
    tx.sign(kp);

    const sigBytes = tx.serialize();
    // Broadcast with failover across all RPCs.
    let txHash = null, lastErr = null;
    for (const url of rpcUrls()) {
      try {
        const c = new Connection(url, { commitment: 'confirmed' });
        txHash = await c.sendRawTransaction(sigBytes, { skipPreflight: false, maxRetries: 3 });
        break;
      } catch (e) { lastErr = e; }
    }
    if (!txHash) throw new Error(`Solana broadcast failed: ${lastErr?.message || 'unknown'}`);
    return { txHash, nonce: null, gasPrice: null, gasLimit: null };
  });
}

// Single-shot signature status check (used by the periodic reconciler).
// Returns { status: 'confirmed'|'failed'|'pending', confirmations, gasUsed: null }.
export async function checkSolanaSignatureOnce(signature) {
  const res = await solRpc('getSignatureStatuses', [[signature], { searchTransactionHistory: true }]);
  const st = res?.value?.[0];
  if (!st) return { status: 'pending', confirmations: 0, gasUsed: null };
  if (st.err) return { status: 'failed', confirmations: st.confirmations ?? 0, gasUsed: null };
  if (st.confirmationStatus === 'finalized') {
    return { status: 'confirmed', confirmations: st.confirmations ?? 32, gasUsed: null };
  }
  return { status: 'pending', confirmations: st.confirmations ?? 0, gasUsed: null };
}

// Poll until finalized / failed / timeout — same result shape as the
// Ethereum waitForReceipt so the payout engine can share its finalizer.
export async function waitForSolanaReceipt(signature, { timeoutMs = 180_000, intervalMs = 5_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await checkSolanaSignatureOnce(signature);
      if (r.status === 'confirmed') return { status: 'confirmed', confirmations: r.confirmations, gasUsed: null };
      if (r.status === 'failed') return { status: 'failed', confirmations: r.confirmations, gasUsed: null };
    } catch (_) { /* keep polling */ }
    await new Promise(res => setTimeout(res, intervalMs));
  }
  return { status: 'timeout', confirmations: 0, gasUsed: null };
}
