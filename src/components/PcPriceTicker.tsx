import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, ExternalLink } from 'lucide-react';

interface PcPriceData {
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
  dex: string | null;
  chain: string | null;
  url: string | null;
  source: string | null;
  error?: string;
}

function formatUSD(n: number | null): string {
  if (n == null) return '—';
  if (n < 0.001) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  if (n < 1000) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatCompact(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

const POLL_INTERVAL = 30_000;

export function PcPriceTicker({ compact = false, onFullInfo }: { compact?: boolean; onFullInfo?: () => void }) {
  const [data, setData] = useState<PcPriceData | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrice = async () => {
    try {
      const res = await fetch('/api/pc-price');
      if (!res.ok) return;
      const incoming: PcPriceData = await res.json();
      setData(prev => {
        if (prev?.price && incoming.price) {
          if (incoming.price > prev.price) {
            setFlash('up');
            setTimeout(() => setFlash(null), 1500);
          } else if (incoming.price < prev.price) {
            setFlash('down');
            setTimeout(() => setFlash(null), 1500);
          }
          setPrevPrice(prev.price);
        }
        return incoming;
      });
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    timerRef.current = setInterval(fetchPrice, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const up = (data?.priceChange24h ?? 0) >= 0;
  const notConfigured = data?.error === 'PC_TOKEN_CONTRACT not configured';
  const noData = !loading && (data?.price == null) && !notConfigured;

  if (notConfigured) {
    return (
      <div
        title="Live $Pc price feed"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '3px 8px' : '5px 12px', borderRadius: 20,
          background: 'rgba(10,8,0,0.75)',
          border: '1px solid rgba(212,175,55,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          cursor: 'default',
        }}
      >
        <img src="/logos/pc-logo.png" alt="$Pc" style={{ width: compact ? 14 : 16, height: compact ? 14 : 16, borderRadius: '50%' }} />
        <span style={{ fontSize: compact ? 10 : 11, color: '#D4AF37', fontWeight: 900, letterSpacing: '0.05em' }}>$Pc</span>
        <span style={{ fontSize: compact ? 10 : 11, color: '#666', fontWeight: 700 }}>—</span>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#888',
          opacity: 0.5,
        }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20,
        background: 'rgba(30,20,0,0.6)', border: '1px solid rgba(212,175,55,0.15)',
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4AF37', opacity: 0.5, animation: 'pulse 1s infinite' }} />
        <span style={{ fontSize: 10, color: '#888', fontWeight: 700, letterSpacing: '0.05em' }}>$Pc…</span>
      </div>
    );
  }

  if (noData) {
    return (
      <div
        title="Live $Pc price feed unavailable"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '3px 8px' : '5px 12px', borderRadius: 20,
          background: 'rgba(10,8,0,0.75)',
          border: '1px solid rgba(212,175,55,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          cursor: 'default',
        }}
      >
        <img src="/logos/pc-logo.png" alt="$Pc" style={{ width: compact ? 14 : 16, height: compact ? 14 : 16, borderRadius: '50%' }} />
        <span style={{ fontSize: compact ? 10 : 11, color: '#D4AF37', fontWeight: 900, letterSpacing: '0.05em' }}>$Pc</span>
        <span style={{ fontSize: compact ? 10 : 11, color: '#666', fontWeight: 700 }}>—</span>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#888',
          opacity: 0.5,
        }} />
      </div>
    );
  }

  const priceColor =
    flash === 'up' ? '#4caf50' :
    flash === 'down' ? '#ef5350' :
    up ? '#4caf50' : '#ef5350';

  const tickerEl = (
    <button
      onClick={() => setExpanded(v => !v)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '3px 8px' : '5px 12px', borderRadius: 20,
        background: flash
          ? `rgba(${flash === 'up' ? '20,80,20' : '80,20,20'},0.7)`
          : 'rgba(10,8,0,0.75)',
        border: `1px solid ${priceColor}40`,
        boxShadow: flash ? `0 0 12px ${priceColor}40` : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.4s ease',
        cursor: 'pointer',
      }}
    >
      <img src="/logos/pc-logo.png" alt="$Pc" style={{ width: compact ? 14 : 16, height: compact ? 14 : 16, borderRadius: '50%' }} />
      <span style={{ fontSize: compact ? 10 : 11, color: '#D4AF37', fontWeight: 900, letterSpacing: '0.05em' }}>$Pc</span>
      <span style={{ fontSize: compact ? 10 : 11, color: priceColor, fontWeight: 700, transition: 'color 0.4s' }}>
        {formatUSD(data?.price ?? null)}
      </span>
      {data?.priceChange24h != null && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 2,
          fontSize: compact ? 9 : 10,
          color: up ? '#4caf50' : '#ef5350',
          fontWeight: 700,
        }}>
          {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {up ? '+' : ''}{data.priceChange24h.toFixed(2)}%
        </span>
      )}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#4caf50',
        boxShadow: '0 0 6px #4caf50',
        animation: 'pulse 2s infinite',
      }} />
    </button>
  );

  if (compact) return tickerEl;

  return (
    <div style={{ position: 'relative' }}>
      {tickerEl}
      {expanded && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9999,
            minWidth: 220,
            background: 'rgba(8,6,0,0.97)',
            border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(212,175,55,0.08)',
            padding: '14px 16px',
          }}
        >
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src="/logos/pc-logo.png" alt="$Pc" style={{ width: 20, height: 20, borderRadius: '50%' }} />
              <span style={{ fontSize: 13, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.08em' }}>$Pc COIN</span>
            </div>
            <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {data?.source === 'dexscreener' ? 'DexScreener' : data?.source === 'geckoterminal' ? 'GeckoTerminal' : ''}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: priceColor, lineHeight: 1 }}>
              {formatUSD(data?.price ?? null)}
            </div>
            {data?.priceChange24h != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                {up ? <TrendingUp size={12} color="#4caf50" /> : <TrendingDown size={12} color="#ef5350" />}
                <span style={{ fontSize: 12, color: up ? '#4caf50' : '#ef5350', fontWeight: 700 }}>
                  {up ? '+' : ''}{data.priceChange24h.toFixed(2)}% (24h)
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 10 }}>
            {data?.volume24h != null && (
              <div>
                <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vol 24h</div>
                <div style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>{formatCompact(data.volume24h)}</div>
              </div>
            )}
            {data?.liquidity != null && (
              <div>
                <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Liquidity</div>
                <div style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>{formatCompact(data.liquidity)}</div>
              </div>
            )}
            {data?.marketCap != null && (
              <div>
                <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Market Cap</div>
                <div style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>{formatCompact(data.marketCap)}</div>
              </div>
            )}
            {data?.dex != null && (
              <div>
                <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DEX</div>
                <div style={{ fontSize: 12, color: '#ccc', fontWeight: 700, textTransform: 'capitalize' }}>{data.dex}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {data?.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '5px 8px', borderRadius: 8,
                  background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
                  color: '#D4AF37', fontSize: 10, fontWeight: 700, textDecoration: 'none',
                }}
              >
                <ExternalLink size={10} />
                DexScreener
              </a>
            )}
            <a
              href={`https://www.coingecko.com/en/coins/pc-coin`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '5px 8px', borderRadius: 8,
                background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                color: '#888', fontSize: 10, fontWeight: 700, textDecoration: 'none',
              }}
            >
              <ExternalLink size={10} />
              CoinGecko
            </a>
          </div>
          {onFullInfo && (
            <button
              onClick={() => { setExpanded(false); onFullInfo(); }}
              style={{
                marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '7px 8px', borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.08))',
                border: '1px solid rgba(212,175,55,0.4)',
                color: '#D4AF37', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Activity size={10} />
              Full Chart & Token Info
            </button>
          )}

          <div style={{ marginTop: 8, fontSize: 9, color: '#444', textAlign: 'center' }}>
            Updates every 30s · Live on-chain data
          </div>
        </div>
      )}
    </div>
  );
}
