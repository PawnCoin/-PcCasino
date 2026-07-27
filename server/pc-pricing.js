// Centralized $Pc pricing + USD-based wallet eligibility threshold.
//
// The wallet "member tier" gate is no longer hardcoded at 100M $Pc. Instead it
// is computed live from a USD basis (default $10,000, configurable via
// WALLET_THRESHOLD_USD) divided by the current $Pc/USD price (cached for 60s).
//
// Fail-closed: if no price has ever been observed, requests that need the
// threshold are blocked. If the cache is merely stale (last fetch failed), we
// keep using the last known price and surface `stale: true` in the response.

const PC_PRICE_CACHE_TTL = 60_000;
const _pcPriceCache = { data: null, ts: 0 };

export const WALLET_THRESHOLD_USD = (() => {
  const raw = parseFloat(process.env.WALLET_THRESHOLD_USD || '10000');
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
})();

// ERC-20 Transfer(address,address,uint256)
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MIN_CONFIRMATIONS = parseInt(process.env.DEPOSIT_MIN_CONFIRMATIONS || '12', 10);

// Primary + failover RPC endpoints. Operators can add redundancy with
// ETH_RPC_FALLBACK_URLS (comma-separated); we always keep a public default
// last so verification degrades gracefully instead of hard-failing.
export function ethRpcUrls() {
  const urls = [process.env.ETH_RPC_URL || 'https://cloudflare-eth.com'];
  for (const u of (process.env.ETH_RPC_FALLBACK_URLS || '').split(',').map(s => s.trim()).filter(Boolean)) {
    if (!urls.includes(u)) urls.push(u);
  }
  if (!urls.includes('https://eth.llamarpc.com')) urls.push('https://eth.llamarpc.com');
  return urls;
}

async function ethCall(method, params) {
  let lastErr = null;
  for (const url of ethRpcUrls()) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
      const json = await r.json();
      if (json.error) throw new Error(json.error.message || 'RPC error');
      return json.result;
    } catch (e) { lastErr = e; }
  }
  throw new Error(lastErr?.message || 'All Ethereum RPCs failed');
}

async function _fetchLivePcPriceFromSources() {
  const contractAddress = process.env.PC_TOKEN_CONTRACT;
  const pairAddress = process.env.PC_TOKEN_PAIR;
  const network = process.env.PC_TOKEN_NETWORK === 'Etherscan.io' ? 'eth' : (process.env.PC_TOKEN_NETWORK || 'eth');

  if (!contractAddress) {
    return { price: null, source: null, error: 'PC_TOKEN_CONTRACT not configured' };
  }

  if (pairAddress) {
    try {
      const r = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pairAddress}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) {
        const data = await r.json();
        const attrs = data.data?.attributes;
        const price = attrs?.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null;
        if (price) {
          return {
            price,
            priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
            volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
            liquidity: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
            marketCap: null, dex: 'uniswap', chain: network,
            url: `https://www.geckoterminal.com/${network}/pools/${pairAddress}`,
            source: 'geckoterminal',
          };
        }
      }
    } catch (e) { console.error('[PcPrice] GeckoTerminal pool error:', e.message); }
  }

  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      if (data.pairs?.length) {
        const pair = [...data.pairs].sort((a, b) => (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)))[0];
        return {
          price: parseFloat(pair.priceUsd || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          marketCap: pair.fdv ? parseFloat(pair.fdv) : null,
          dex: pair.dexId, chain: pair.chainId, url: pair.url, source: 'dexscreener',
        };
      }
    }
  } catch (e) { console.error('[PcPrice] DexScreener error:', e.message); }

  if (pairAddress) {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${network}/${pairAddress}`, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const data = await r.json();
        const pair = data.pair || data.pairs?.[0];
        if (pair?.priceUsd) {
          return {
            price: parseFloat(pair.priceUsd),
            priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
            volume24h: parseFloat(pair.volume?.h24 || 0),
            liquidity: parseFloat(pair.liquidity?.usd || 0),
            marketCap: pair.fdv ? parseFloat(pair.fdv) : null,
            dex: pair.dexId, chain: pair.chainId, url: pair.url, source: 'dexscreener',
          };
        }
      }
    } catch (e) { console.error('[PcPrice] DexScreener pair error:', e.message); }
  }

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${contractAddress}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      const attrs = data.data?.attributes;
      if (attrs?.price_usd) {
        return {
          price: parseFloat(attrs.price_usd),
          priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
          volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
          liquidity: null, marketCap: null, dex: null, chain: network,
          url: pairAddress ? `https://www.geckoterminal.com/${network}/pools/${pairAddress}` : null,
          source: 'geckoterminal',
        };
      }
    }
  } catch (e) { console.error('[PcPrice] GeckoTerminal token error:', e.message); }

  return { price: null, source: null, error: 'Price data unavailable from all sources' };
}

// ---- Solana $Pc price (SPL mint) ----
// Separate cache from the ETH feed; the wallet-threshold math keeps using
// getPcPrice() (ETH) and is unaffected.
const _solPriceCache = { data: null, ts: 0 };

async function _fetchLiveSolPcPriceFromSources() {
  const mint = process.env.PC_SPL_MINT;
  if (!mint) return { price: null, source: null, error: 'PC_SPL_MINT not configured' };

  // Primary: DexScreener token lookup by mint.
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      const solPairs = (data.pairs || []).filter(p => p.chainId === 'solana');
      if (solPairs.length) {
        const pair = [...solPairs].sort((a, b) => (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)))[0];
        return {
          price: parseFloat(pair.priceUsd || 0) || null,
          priceChange24h: pair.priceChange?.h24 != null ? parseFloat(pair.priceChange.h24) : null,
          volume24h: pair.volume?.h24 != null ? parseFloat(pair.volume.h24) : null,
          liquidity: pair.liquidity?.usd != null ? parseFloat(pair.liquidity.usd) : null,
          marketCap: pair.fdv ? parseFloat(pair.fdv) : null,
          dex: pair.dexId, chain: 'solana', url: pair.url, source: 'dexscreener',
        };
      }
    }
  } catch (e) { console.error('[PcPrice SOL] DexScreener error:', e.message); }

  // Fallback: GeckoTerminal token endpoint on the solana network.
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      const attrs = data.data?.attributes;
      if (attrs?.price_usd) {
        return {
          price: parseFloat(attrs.price_usd),
          priceChange24h: attrs.price_change_percentage?.h24 ? parseFloat(attrs.price_change_percentage.h24) : null,
          volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
          liquidity: null, marketCap: null, dex: null, chain: 'solana',
          url: `https://www.geckoterminal.com/solana/tokens/${mint}`,
          source: 'geckoterminal',
        };
      }
    }
  } catch (e) { console.error('[PcPrice SOL] GeckoTerminal error:', e.message); }

  return { price: null, source: null, error: 'Solana price data unavailable from all sources' };
}

// Cached Solana $Pc price. Same contract as getPcPrice(): { data, stale, error }.
export async function getSolPcPrice() {
  if (_solPriceCache.data && Date.now() - _solPriceCache.ts < PC_PRICE_CACHE_TTL) {
    return { data: _solPriceCache.data, stale: false };
  }
  const fresh = await _fetchLiveSolPcPriceFromSources();
  if (fresh.price) {
    _solPriceCache.data = fresh;
    _solPriceCache.ts = Date.now();
    return { data: fresh, stale: false };
  }
  if (_solPriceCache.data) {
    return { data: _solPriceCache.data, stale: true, error: fresh.error };
  }
  return { data: null, stale: true, error: fresh.error };
}

// Returns the cached price payload, refreshing in the background if stale.
// Always returns { data, stale } where data may be null only if no price has
// ever been observed.
export async function getPcPrice() {
  if (_pcPriceCache.data && Date.now() - _pcPriceCache.ts < PC_PRICE_CACHE_TTL) {
    return { data: _pcPriceCache.data, stale: false };
  }
  const fresh = await _fetchLivePcPriceFromSources();
  if (fresh.price) {
    _pcPriceCache.data = fresh;
    _pcPriceCache.ts = Date.now();
    return { data: fresh, stale: false };
  }
  // Live fetch failed — fall back to last known price if we have one.
  if (_pcPriceCache.data) {
    return { data: _pcPriceCache.data, stale: true, error: fresh.error };
  }
  return { data: null, stale: true, error: fresh.error };
}

// Compute how many whole $Pc tokens are required to satisfy WALLET_THRESHOLD_USD
// at the current $Pc/USD price.
//
// Returns { pcAmount: BigInt|null, usdBasis, pricePerPc, stale, source, error,
//           unavailable: boolean }.
//
// Fail-closed: if no price has ever been observed (live + cache both empty),
// pcAmount is null and unavailable=true. Callers MUST refuse to grant
// wallet-gated access in that state.
export async function getRequiredPcThreshold() {
  const { data, stale, error } = await getPcPrice();
  if (!data || !data.price || data.price <= 0) {
    return {
      pcAmount: null,
      usdBasis: WALLET_THRESHOLD_USD,
      pricePerPc: null,
      stale: true,
      source: null,
      error: error || 'No $Pc price available — wallet gate temporarily unavailable',
      unavailable: true,
    };
  }
  const required = Math.ceil(WALLET_THRESHOLD_USD / data.price);
  if (!Number.isFinite(required) || required <= 0) {
    return {
      pcAmount: null,
      usdBasis: WALLET_THRESHOLD_USD,
      pricePerPc: data.price,
      stale: !!stale,
      source: data.source,
      error: 'Price feed produced an invalid threshold',
      unavailable: true,
    };
  }
  return {
    pcAmount: BigInt(Math.floor(required)),
    usdBasis: WALLET_THRESHOLD_USD,
    pricePerPc: data.price,
    stale: !!stale,
    source: data.source,
    error: stale ? error : null,
    unavailable: false,
  };
}

// ---- On-chain ERC-20 deposit verification ----
//
// Verifies that `txHash` is a confirmed ERC-20 Transfer of >= expectedTokens
// of PC_TOKEN_CONTRACT into DEPOSIT_WALLET_ADDRESS (the treasury).
//
// Returns one of:
//   { status: 'confirmed', amountTokens: BigInt, fromAddress, confirmations }
//   { status: 'pending',   confirmations, required }   // tx exists but unconfirmed
//   { status: 'rejected',  reason }                    // tx doesn't match
//   { status: 'needs_review', reason }                 // RPC outage or ambiguity
export async function verifyOnChainDeposit({ txHash, expectedTokens, treasury, contract }) {
  if (!txHash || typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) {
    return { status: 'rejected', reason: 'Invalid tx hash format' };
  }
  if (!treasury) return { status: 'needs_review', reason: 'Treasury address not configured' };
  if (!contract) return { status: 'needs_review', reason: 'PC_TOKEN_CONTRACT not configured' };

  const tx = txHash.trim();
  let receipt, blockNumberHex;
  try {
    [receipt, blockNumberHex] = await Promise.all([
      ethCall('eth_getTransactionReceipt', [tx]),
      ethCall('eth_blockNumber', []),
    ]);
  } catch (err) {
    return { status: 'needs_review', reason: `RPC unavailable: ${err.message}` };
  }

  if (!receipt) {
    return { status: 'pending', confirmations: 0, required: MIN_CONFIRMATIONS, reason: 'Tx not yet mined' };
  }
  if (receipt.status && receipt.status !== '0x1') {
    return { status: 'rejected', reason: 'Transaction reverted on-chain' };
  }

  const head = BigInt(blockNumberHex);
  const txBlock = BigInt(receipt.blockNumber);
  const confirmations = Number(head >= txBlock ? head - txBlock + 1n : 0n);

  const treasuryLower = treasury.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const contractLower = contract.toLowerCase();

  const transferLog = (receipt.logs || []).find(log =>
    (log.address || '').toLowerCase() === contractLower &&
    (log.topics || [])[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
    (log.topics || [])[2]?.toLowerCase().endsWith(treasuryLower.slice(-40))
  );

  if (!transferLog) {
    return { status: 'rejected', reason: 'No matching $Pc Transfer to treasury in tx logs' };
  }

  let amountWei;
  try {
    amountWei = BigInt(transferLog.data);
  } catch {
    return { status: 'rejected', reason: 'Could not parse transfer amount' };
  }
  // PC token has 18 decimals (matches checkOnChainPcBalance assumption).
  const amountTokens = amountWei / (10n ** 18n);
  const expected = BigInt(Math.floor(Number(expectedTokens) || 0));

  if (amountTokens < expected) {
    return {
      status: 'rejected',
      reason: `On-chain transfer (${amountTokens.toString()} $Pc) is less than requested deposit (${expected.toString()} $Pc)`,
      amountTokens,
    };
  }

  if (confirmations < MIN_CONFIRMATIONS) {
    return { status: 'pending', confirmations, required: MIN_CONFIRMATIONS, amountTokens };
  }

  // Recover from-address (topics[1])
  const fromTopic = (transferLog.topics || [])[1] || '';
  const fromAddress = fromTopic.length >= 40 ? '0x' + fromTopic.slice(-40) : null;

  return { status: 'confirmed', amountTokens, fromAddress, confirmations };
}
