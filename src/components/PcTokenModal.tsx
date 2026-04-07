import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp, TrendingDown, ExternalLink, Copy, Check,
  Activity, BarChart3, Zap, RefreshCw, Info, ShoppingCart, Wallet
} from 'lucide-react';

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

interface TokenInfo {
  contractAddress: string | null;
  network: string;
  pcpayEnabled: boolean;
}

function fmt(n: number | null): string {
  if (n == null) return '—';
  if (n < 0.000001) return `$${n.toExponential(4)}`;
  if (n < 0.001) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  if (n < 1000) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtCompact(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function networkLabel(network: string): string {
  const map: Record<string, string> = {
    eth: 'Ethereum', solana: 'Solana', bsc: 'BNB Chain',
    polygon: 'Polygon', arbitrum: 'Arbitrum', base: 'Base',
    avalanche: 'Avalanche', optimism: 'Optimism',
  };
  return map[network?.toLowerCase()] || network?.toUpperCase() || 'Unknown';
}

interface PcTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowDeposit?: () => void;
}

export function PcTokenModal({ isOpen, onClose, onShowDeposit }: PcTokenModalProps) {
  const [priceData, setPriceData] = useState<PcPriceData | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedContract, setCopiedContract] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [priceRes, infoRes] = await Promise.all([
        fetch('/api/pc-price'),
        fetch('/api/pc-token-info'),
      ]);
      if (priceRes.ok) setPriceData(await priceRes.json());
      if (infoRes.ok) setTokenInfo(await infoRes.json());
      setLastUpdated(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [isOpen, fetchAll]);

  const copyContract = () => {
    if (tokenInfo?.contractAddress) {
      navigator.clipboard.writeText(tokenInfo.contractAddress);
      setCopiedContract(true);
      setTimeout(() => setCopiedContract(false), 2000);
    }
  };

  const up = (priceData?.priceChange24h ?? 0) >= 0;
  const priceColor = priceData?.priceChange24h == null ? '#D4AF37' : up ? '#4caf50' : '#ef5350';
  const network = tokenInfo?.network || 'eth';
  const contractAddress = tokenInfo?.contractAddress;

  const dexScreenerUrl = priceData?.url || (contractAddress
    ? `https://dexscreener.com/${network}/${contractAddress}`
    : `https://dexscreener.com/`);
  const geckoterminalUrl = contractAddress
    ? `https://www.geckoterminal.com/${network}/tokens/${contractAddress}`
    : `https://www.geckoterminal.com/`;
  const coingeckoUrl = `https://www.coingecko.com/en/coins/pc-coin`;

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-2xl w-full"
        style={{
          background: 'linear-gradient(135deg, rgba(8,6,0,0.99), rgba(15,10,0,0.99))',
          border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <DialogHeader style={{ padding: '20px 24px 0' }}>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logos/pc-logo.png" alt="$Pc" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <span style={{ color: '#D4AF37', fontWeight: 900, fontSize: 20, letterSpacing: '0.06em' }}>$Pc COIN</span>
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: '#555',
            }}>
              {lastUpdated && (
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
              <button
                onClick={fetchAll}
                style={{ color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea style={{ maxHeight: '80vh' }}>
          <div style={{ padding: '16px 24px 24px' }}>

            {/* Price Hero */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 16,
            }}>
              {loading ? (
                <div style={{ color: '#555', fontSize: 14 }}>Loading live price…</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                        Live Price
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 900, color: priceColor, lineHeight: 1 }}>
                        {fmt(priceData?.price ?? null)}
                      </div>
                    </div>
                    {priceData?.priceChange24h != null && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: up ? 'rgba(76,175,80,0.15)' : 'rgba(239,83,80,0.15)',
                        border: `1px solid ${up ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
                        borderRadius: 8, padding: '4px 10px',
                      }}>
                        {up ? <TrendingUp size={14} color="#4caf50" /> : <TrendingDown size={14} color="#ef5350" />}
                        <span style={{ fontSize: 14, fontWeight: 700, color: up ? '#4caf50' : '#ef5350' }}>
                          {up ? '+' : ''}{priceData.priceChange24h.toFixed(2)}% (24h)
                        </span>
                      </div>
                    )}
                    {priceData?.source && (
                      <div style={{ fontSize: 10, color: '#444', marginLeft: 'auto' }}>
                        via {priceData.source === 'dexscreener' ? 'DexScreener' : 'GeckoTerminal'}
                      </div>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 16 }}>
                    {[
                      { label: 'Volume 24h', value: fmtCompact(priceData?.volume24h ?? null) },
                      { label: 'Liquidity', value: fmtCompact(priceData?.liquidity ?? null) },
                      { label: 'Market Cap', value: fmtCompact(priceData?.marketCap ?? null) },
                      { label: 'Network', value: networkLabel(priceData?.chain || network) },
                      { label: 'DEX', value: priceData?.dex ? priceData.dex.charAt(0).toUpperCase() + priceData.dex.slice(1) : '—' },
                      { label: 'Ticker', value: '$Pc' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '10px 12px',
                        border: '1px solid rgba(212,175,55,0.1)',
                      }}>
                        <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, color: '#ccc', fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Live indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 6px #4caf50', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: 10, color: '#555' }}>Live — refreshes every 30 seconds</span>
                    <Activity size={11} color="#555" />
                  </div>
                </>
              )}
            </div>

            {/* DexScreener Chart Embed */}
            {contractAddress && (
              <div style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 16,
              }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
                  <BarChart3 size={16} color="#D4AF37" />
                  <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 700 }}>Live Chart</span>
                  <a
                    href={dexScreenerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 'auto', fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    Open on DexScreener <ExternalLink size={11} />
                  </a>
                </div>
                <iframe
                  src={`https://dexscreener.com/${network}/${contractAddress}?embed=1&theme=dark&info=0`}
                  style={{ width: '100%', height: 400, border: 'none', display: 'block' }}
                  title="$Pc Live Chart"
                  allow="clipboard-write"
                />
              </div>
            )}

            {/* Contract Address */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Info size={15} color="#D4AF37" />
                <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 700 }}>Token Details</span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contract Address</span>
                  {contractAddress ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ fontSize: 11, color: '#D4AF37', background: 'rgba(212,175,55,0.08)', padding: '3px 8px', borderRadius: 6, wordBreak: 'break-all' }}>
                        {contractAddress.length > 20
                          ? `${contractAddress.slice(0, 10)}…${contractAddress.slice(-8)}`
                          : contractAddress}
                      </code>
                      <button
                        onClick={copyContract}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedContract ? '#4caf50' : '#666', padding: 2 }}
                        title="Copy address"
                      >
                        {copiedContract ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#444' }}>Not configured (set PC_TOKEN_CONTRACT)</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network</span>
                  <span style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>{networkLabel(network)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Symbol</span>
                  <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 900 }}>$Pc</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Use in Casino</span>
                  <span style={{ fontSize: 12, color: '#4caf50', fontWeight: 700 }}>All games, jackpots, VIP rewards</span>
                </div>
              </div>
            </div>

            {/* How to Buy */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(67,160,71,0.25)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ShoppingCart size={15} color="#4caf50" />
                <span style={{ fontSize: 13, color: '#4caf50', fontWeight: 700 }}>How to Buy $Pc</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                {[
                  'Get a crypto wallet — MetaMask (EVM) or Phantom (Solana)',
                  `Buy ${networkLabel(network)} native tokens on any exchange (Coinbase, Binance, Kraken)`,
                  `Bridge / swap to get $Pc on ${networkLabel(network)} via the DEX links below`,
                  'Deposit $Pc to your casino wallet and start playing instantly',
                ].map((step, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Links & Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'DexScreener', url: dexScreenerUrl, icon: <BarChart3 size={14} />, color: '#D4AF37' },
                { label: 'GeckoTerminal', url: geckoterminalUrl, icon: <Activity size={14} />, color: '#4caf50' },
                { label: 'CoinGecko', url: coingeckoUrl, icon: <TrendingUp size={14} />, color: '#8bc34a' },
              ].map(({ label, url, icon, color }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 12px', borderRadius: 10,
                    background: `${color}14`, border: `1px solid ${color}30`,
                    color, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                    transition: 'background 0.2s',
                  }}
                >
                  {icon} {label} <ExternalLink size={11} />
                </a>
              ))}
            </div>

            {/* Deposit CTA */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37', marginBottom: 3 }}>
                  Ready to play?
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Deposit $Pc and start earning jackpots, VIP rewards, and referral bonuses.
                </div>
              </div>
              <button
                onClick={() => { onClose(); onShowDeposit?.(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                  border: 'none', color: '#000', fontSize: 13, fontWeight: 900,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <Wallet size={16} /> Deposit $Pc
              </button>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
