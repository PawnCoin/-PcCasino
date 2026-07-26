// Pure-JS Ethereum signer + JSON-RPC sender for ERC-20 transfers from the
// configured PAYOUT_WALLET hot wallet. Uses @noble/curves (secp256k1) +
// @noble/hashes (keccak_256) so we don't need to ship a full web3 library.
//
// Supports legacy (EIP-155) tx encoding which all major RPCs accept.
//
// Exports:
//   getPayoutAddress()                         — derived hot-wallet address (or null)
//   getOnChainPcBalance()                      — hot-wallet $Pc balance (bigint tokens)
//   sendErc20Transfer({ to, amountTokens })    — sign + broadcast, returns { txHash, nonce }
//   waitForReceipt(txHash, opts)               — poll for confirmation
//
// All sends are funneled through a single in-process mutex (`_sendLock`) so
// nonces never collide. The cached nonce is bumped optimistically and
// resynced from the chain on every call.

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { Buffer } from 'node:buffer';

const PC_DECIMALS = 18n;
const ERC20_TRANSFER_SELECTOR = 'a9059cbb';
const DEFAULT_GAS_LIMIT = 90_000n;
const MIN_GAS_PRICE = 1_000_000_000n; // 1 gwei floor

import { ethRpcUrls } from './pc-pricing.js';
function chainId() { return BigInt(parseInt(process.env.PAYOUT_CHAIN_ID || '1', 10)); }
function pcContract() { return process.env.PC_TOKEN_CONTRACT || null; }

let _cachedKey = null; // { priv: Uint8Array, address: '0x...' }
function _loadKey() {
  if (_cachedKey) return _cachedKey;
  const raw = process.env.PAYOUT_WALLET_PRIVATE_KEY;
  if (!raw) return null;
  let hex = raw.trim().toLowerCase();
  if (hex.startsWith('0x')) hex = hex.slice(2);
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('PAYOUT_WALLET_PRIVATE_KEY must be 32-byte hex (with or without 0x prefix)');
  }
  const priv = Buffer.from(hex, 'hex');
  const pub = secp256k1.getPublicKey(priv, false); // 65-byte uncompressed (0x04 || X || Y)
  const addrBytes = keccak_256(pub.slice(1)).slice(-20);
  const address = '0x' + Buffer.from(addrBytes).toString('hex');

  // Cross-check with PAYOUT_WALLET_ADDRESS if set — fail-closed on mismatch.
  const declared = (process.env.PAYOUT_WALLET_ADDRESS || '').trim().toLowerCase();
  if (declared && declared !== address) {
    throw new Error(`PAYOUT_WALLET_ADDRESS (${declared}) does not match key-derived address (${address}). Refusing to sign.`);
  }
  _cachedKey = { priv, address };
  return _cachedKey;
}

export function getPayoutAddress() {
  try { return _loadKey()?.address || null; } catch { return null; }
}

export function isPayoutConfigured() {
  try { return !!(_loadKey() && pcContract()); } catch { return false; }
}

export async function ethRpc(method, params) {
  let lastErr = null;
  for (const url of ethRpcUrls()) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    } catch (e) { lastErr = e; }
  }
  throw new Error(lastErr?.message || 'All Ethereum RPCs failed');
}

export async function getOnChainPcBalance(address) {
  const addr = (address || getPayoutAddress());
  if (!addr) return null;
  if (!pcContract()) return null;
  const padded = addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const hex = await ethRpc('eth_call', [{ to: pcContract(), data: '0x70a08231' + padded }, 'latest']);
  if (!hex || hex === '0x') return 0n;
  return BigInt(hex) / (10n ** PC_DECIMALS);
}

export async function getNativeBalance(address) {
  const addr = (address || getPayoutAddress());
  if (!addr) return null;
  const hex = await ethRpc('eth_getBalance', [addr, 'latest']);
  return BigInt(hex || '0x0');
}

// ---- RLP ----
function bigToBuf(n) {
  if (n === 0n) return Buffer.alloc(0);
  let h = n.toString(16);
  if (h.length % 2) h = '0' + h;
  return Buffer.from(h, 'hex');
}
function rlpLen(len, off) {
  if (len < 56) return Buffer.from([off + len]);
  const lb = bigToBuf(BigInt(len));
  return Buffer.concat([Buffer.from([off + 55 + lb.length]), lb]);
}
function rlpEncode(item) {
  if (Array.isArray(item)) {
    const enc = Buffer.concat(item.map(rlpEncode));
    return Buffer.concat([rlpLen(enc.length, 0xc0), enc]);
  }
  let buf;
  if (Buffer.isBuffer(item)) buf = item;
  else if (item instanceof Uint8Array) buf = Buffer.from(item);
  else if (typeof item === 'bigint' || typeof item === 'number') buf = bigToBuf(BigInt(item));
  else if (typeof item === 'string') {
    let s = item;
    if (s.startsWith('0x')) s = s.slice(2);
    if (s.length % 2) s = '0' + s;
    buf = Buffer.from(s, 'hex');
  } else throw new Error('rlp: unsupported');
  if (buf.length === 1 && buf[0] < 0x80) return buf;
  return Buffer.concat([rlpLen(buf.length, 0x80), buf]);
}

// Build ERC-20 transfer(address,uint256) calldata
function buildTransferData(to, amountWei) {
  const padAddr = to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const padAmt = amountWei.toString(16).padStart(64, '0');
  return Buffer.from(ERC20_TRANSFER_SELECTOR + padAddr + padAmt, 'hex');
}

// ---- Nonce manager + send mutex ----
let _cachedNonce = null;
let _pendingChain = Promise.resolve();
function _withLock(fn) {
  const next = _pendingChain.then(fn, fn);
  // Prevent unhandled rejection from poisoning the chain — swallow result for the next link.
  _pendingChain = next.catch(() => {});
  return next;
}

async function _nextNonce() {
  const addr = _loadKey().address;
  const onchain = BigInt(await ethRpc('eth_getTransactionCount', [addr, 'pending']));
  const nonce = _cachedNonce !== null && _cachedNonce > onchain ? _cachedNonce : onchain;
  _cachedNonce = nonce + 1n;
  return nonce;
}

export function resetNonceCache() { _cachedNonce = null; }

// Sign + broadcast a $Pc ERC-20 transfer.
//   to: 0x-hex address
//   amountTokens: BigInt — whole-token units (multiplied to 18-decimals internally)
// Returns { txHash, nonce, gasPrice, gasLimit, rawTx }.
export async function sendErc20Transfer({ to, amountTokens }) {
  if (!isPayoutConfigured()) throw new Error('PAYOUT_WALLET_PRIVATE_KEY or PC_TOKEN_CONTRACT not configured');
  if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to.trim())) throw new Error('Invalid destination address');
  if (typeof amountTokens !== 'bigint') amountTokens = BigInt(amountTokens);
  if (amountTokens <= 0n) throw new Error('Amount must be > 0');

  return _withLock(async () => {
    const key = _loadKey();
    const cid = chainId();
    const data = buildTransferData(to, amountTokens * (10n ** PC_DECIMALS));

    let gasPriceHex;
    try { gasPriceHex = await ethRpc('eth_gasPrice', []); }
    catch (e) { throw new Error(`Could not fetch gasPrice: ${e.message}`); }
    let gasPrice = BigInt(gasPriceHex);
    if (gasPrice < MIN_GAS_PRICE) gasPrice = MIN_GAS_PRICE;
    // Bump 15% to ensure inclusion.
    gasPrice = (gasPrice * 115n) / 100n;

    let gasLimit = DEFAULT_GAS_LIMIT;
    try {
      const est = await ethRpc('eth_estimateGas', [{ from: key.address, to: pcContract(), data: '0x' + data.toString('hex') }]);
      gasLimit = (BigInt(est) * 12n) / 10n; // +20% buffer
    } catch (_) { /* fall back to default */ }

    const nonce = await _nextNonce();

    // EIP-155 legacy tx: rlp([nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0])
    const unsigned = rlpEncode([
      nonce, gasPrice, gasLimit,
      Buffer.from(pcContract().replace(/^0x/, ''), 'hex'),
      0n,
      data,
      cid, 0n, 0n,
    ]);
    const sigHash = keccak_256(unsigned);
    const sig = secp256k1.sign(sigHash, key.priv, { format: 'recovered' });
    // sig is 65 bytes: [recovery (1)] || r (32) || s (32)
    const recovery = sig[0];
    const r = Buffer.from(sig.slice(1, 33));
    const s = Buffer.from(sig.slice(33, 65));
    const v = BigInt(recovery) + cid * 2n + 35n;

    const signed = rlpEncode([
      nonce, gasPrice, gasLimit,
      Buffer.from(pcContract().replace(/^0x/, ''), 'hex'),
      0n,
      data,
      v, r, s,
    ]);

    let txHash;
    try {
      txHash = await ethRpc('eth_sendRawTransaction', ['0x' + signed.toString('hex')]);
    } catch (err) {
      // On broadcast failure, drop optimistic nonce so the next attempt re-syncs.
      _cachedNonce = null;
      throw err;
    }
    return { txHash, nonce: Number(nonce), gasPrice: gasPrice.toString(), gasLimit: gasLimit.toString() };
  });
}

// Poll until the tx has at least `confirmations` confirmations or `timeoutMs` elapses.
// Returns { status: 'confirmed'|'failed'|'timeout', confirmations, blockNumber }.
export async function waitForReceipt(txHash, { confirmations = 1, timeoutMs = 180_000, intervalMs = 5_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await ethRpc('eth_getTransactionReceipt', [txHash]);
      if (r) {
        const head = BigInt(await ethRpc('eth_blockNumber', []));
        const txBlock = BigInt(r.blockNumber);
        const confs = head >= txBlock ? Number(head - txBlock + 1n) : 0;
        const gasUsed = r.gasUsed ? BigInt(r.gasUsed).toString() : null;
        if (r.status === '0x0') return { status: 'failed', confirmations: confs, blockNumber: Number(txBlock), gasUsed };
        if (confs >= confirmations) return { status: 'confirmed', confirmations: confs, blockNumber: Number(txBlock), gasUsed };
      }
    } catch (_) { /* keep polling */ }
    await new Promise(res => setTimeout(res, intervalMs));
  }
  return { status: 'timeout', confirmations: 0, blockNumber: null };
}
