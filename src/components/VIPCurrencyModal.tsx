import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, AlertTriangle, Info, Lock, CheckCircle } from 'lucide-react';
import { CasinoIcon } from '@/components/CasinoIcons';
import { useGlobalGame } from '@/contexts/GlobalGameContext';

interface VIPCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  walletVerified: boolean;
  onOpenDeposit: () => void;
}

const FIATS = [
  { code: 'USD', name: 'US Dollar', flag: 'US', rate: '~$0.000139' },
  { code: 'EUR', name: 'Euro', flag: 'EU', rate: '~\u20ac0.000128' },
  { code: 'GBP', name: 'British Pound', flag: 'GB', rate: '~\u00a30.000109' },
  { code: 'JPY', name: 'Japanese Yen', flag: 'JP', rate: '~\u00a50.0208' },
  { code: 'CAD', name: 'Canadian Dollar', flag: 'CA', rate: '~$0.000189' },
  { code: 'AUD', name: 'Australian Dollar', flag: 'AU', rate: '~$0.000213' },
  { code: 'CHF', name: 'Swiss Franc', flag: 'CH', rate: '~CHF 0.000125' },
  { code: 'CNY', name: 'Chinese Yuan', flag: 'CN', rate: '~\u00a50.00101' },
  { code: 'MXN', name: 'Mexican Peso', flag: 'MX', rate: '~$0.00239' },
  { code: 'BRL', name: 'Brazilian Real', flag: 'BR', rate: '~R$0.000764' },
];

const CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'BNB', name: 'BNB', icon: '⬡' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'XRP', name: 'XRP', icon: 'X' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳' },
  { symbol: 'AVAX', name: 'Avalanche', icon: 'A' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'DOT', name: 'Polkadot', icon: '●' },
  { symbol: 'LINK', name: 'Chainlink', icon: '⬡' },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡' },
  { symbol: 'UNI', name: 'Uniswap', icon: 'U' },
  { symbol: 'ATOM', name: 'Cosmos', icon: 'A' },
  { symbol: 'LTC', name: 'Litecoin', icon: 'Ł' },
  { symbol: 'TRX', name: 'TRON', icon: 'T' },
  { symbol: 'NEAR', name: 'NEAR Protocol', icon: 'N' },
  { symbol: 'FTM', name: 'Fantom', icon: 'F' },
  { symbol: 'ALGO', name: 'Algorand', icon: 'A' },
  { symbol: 'ICP', name: 'Internet Computer', icon: '∞' },
  { symbol: 'MANA', name: 'Decentraland', icon: 'M' },
  { symbol: 'SAND', name: 'The Sandbox', icon: 'S' },
  { symbol: 'APE', name: 'ApeCoin', icon: 'A' },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: 'S' },
  { symbol: 'XLM', name: 'Stellar', icon: '*' },
  { symbol: 'VET', name: 'VeChain', icon: 'V' },
];

const COMMODITIES = [
  { symbol: 'GOLD', name: 'Gold', icon: 'Au', unit: 'per troy oz' },
  { symbol: 'SILVER', name: 'Silver', icon: 'Ag', unit: 'per troy oz' },
  { symbol: 'OIL', name: 'Crude Oil (WTI)', icon: 'OIL', unit: 'per barrel' },
  { symbol: 'NAT_GAS', name: 'Natural Gas', icon: 'NG', unit: 'per MMBtu' },
  { symbol: 'PLAT', name: 'Platinum', icon: 'Pt', unit: 'per troy oz' },
  { symbol: 'COPPER', name: 'Copper', icon: 'Cu', unit: 'per lb' },
];

export function VIPCurrencyModal({ isOpen, onClose, balance, walletVerified, onOpenDeposit }: VIPCurrencyModalProps) {
  const [activeTab, setActiveTab] = useState<'fiat' | 'crypto' | 'commodity'>('fiat');
  // Use the live USD-based threshold from GlobalGameContext (which polls
  // /api/wallet-threshold). Falls back to 100M only while loading or offline.
  const { membership } = useGlobalGame();
  const requiredPc = membership.requiredBalance;
  const isVIP = balance >= requiredPc;
  const usdBasisLabel = typeof membership.usdBasis === 'number'
    ? `$${membership.usdBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;
  const pricePerPcLabel = typeof membership.pricePerPc === 'number' && membership.pricePerPc > 0
    ? `$${membership.pricePerPc.toExponential(3)}`
    : null;
  const requiredPcDisplay = requiredPc >= 1_000_000_000
    ? `${(requiredPc / 1_000_000_000).toFixed(2)}B`
    : `${(requiredPc / 1_000_000).toFixed(1)}M`;
  const deficit = Math.max(0, requiredPc - balance);
  const deficitDisplay = deficit >= 1_000_000_000
    ? `${(deficit / 1_000_000_000).toFixed(2)}B`
    : `${(deficit / 1_000_000).toFixed(1)}M`;

  const TabBtn = ({ id, label }: { id: typeof activeTab; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      style={{
        background: activeTab === id ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(180,140,30,0.15))' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${activeTab === id ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'}`,
        color: activeTab === id ? '#D4AF37' : '#9ca3af',
      }}
    >
      {label}
    </button>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] p-0 overflow-hidden" style={{
        background: 'rgba(6,6,12,0.99)',
        border: '1px solid rgba(212,175,55,0.4)',
        boxShadow: '0 0 80px rgba(0,0,0,0.9), 0 0 40px rgba(212,175,55,0.1)',
      }}>
        <DialogHeader className="px-6 py-4 border-b border-white/10" style={{
          background: 'linear-gradient(135deg, rgba(40,20,0,0.9), rgba(10,10,10,0.9))'
        }}>
          <DialogTitle className="flex items-center gap-3 font-casino text-lg" style={{ color: '#D4AF37' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
              <Crown className="w-5 h-5 text-black" />
            </div>
            VIP Multi-Currency Betting
            {isVIP && (
              <span className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37' }}>
                <CheckCircle className="w-3 h-3" /> VIP ACTIVE
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(88vh-72px)]">
          <div className="p-6">

            {/* VIP Gate */}
            {!isVIP ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.3)' }}>
                  <Lock className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">VIP Access Required</h3>
                <p className="text-gray-400 mb-2">Hold at least <span className="text-[#D4AF37] font-bold">{requiredPc.toLocaleString()} $Pc</span>{usdBasisLabel ? <> (≈ <span className="text-[#D4AF37] font-bold">{usdBasisLabel} USD</span>{pricePerPcLabel ? <> at {pricePerPcLabel}/$Pc</> : null})</> : null} in your wallet to unlock:</p>
                <ul className="text-sm text-gray-300 space-y-1 mb-6 max-w-xs mx-auto text-left">
                  <li className="flex items-center gap-2"><span className="text-[#D4AF37]">•</span> Betting with USD, EUR, GBP & 7 more fiat currencies</li>
                  <li className="flex items-center gap-2"><span className="text-[#D4AF37]">•</span> Top 25 cryptocurrencies at live market rates</li>
                  <li className="flex items-center gap-2"><span className="text-[#D4AF37]">•</span> Gold, Silver, Oil & commodity betting</li>
                  <li className="flex items-center gap-2"><span className="text-[#D4AF37]">•</span> Deposit in any currency — auto-converted</li>
                  <li className="flex items-center gap-2"><span className="text-[#D4AF37]">•</span> Priority 2-hour withdrawals</li>
                </ul>
                <div className="text-sm text-gray-500 mb-4">
                  Your balance: <span className="text-white font-bold">{(balance / 1_000_000).toFixed(1)}M $Pc</span>
                  {' '}— Need {deficitDisplay} more (target {requiredPcDisplay})
                </div>
                <button
                  onClick={() => { onClose(); onOpenDeposit(); }}
                  className="px-6 py-3 rounded-xl font-bold text-black transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
                >
                  Deposit $Pc Now
                </button>
              </div>
            ) : (
              <>
                {/* VIP Header Info */}
                <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300">
                      <p className="font-semibold text-[#D4AF37] mb-1">VIP Multi-Currency Betting is Active</p>
                      <p>All bets placed in fiat or crypto are <strong className="text-white">automatically converted to $Pc</strong> at the live market rate at time of bet placement. Winnings are paid out in $Pc.</p>
                      <p className="mt-1 text-xs text-gray-400">Wallet verification required for fiat deposits. Contact support to enable fiat billing via PcPay.</p>
                    </div>
                  </div>
                </div>

                {/* Tab Selector */}
                <div className="flex gap-2 mb-5">
                  <TabBtn id="fiat" label="Fiat Currencies" />
                  <TabBtn id="crypto" label="Top 25 Crypto" />
                  <TabBtn id="commodity" label="Commodities" />
                </div>

                {/* Fiat Tab */}
                {activeTab === 'fiat' && (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">Approximate conversion rate per 1M $Pc. Rates update at bet time.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FIATS.map(f => (
                        <Tooltip key={f.code}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 p-3 rounded-xl cursor-default transition-all hover:scale-[1.02]"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <span className="text-2xl">{f.flag}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm">{f.code}</div>
                                <div className="text-xs text-gray-400 truncate">{f.name}</div>
                              </div>
                              <div className="text-xs text-[#D4AF37] font-mono text-right">
                                {f.rate}<br /><span className="text-gray-500">per $Pc</span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Bet in {f.name} — converted to $Pc at live rate</p>
                            <p className="text-xs text-gray-400">Rate shown is indicative only</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,193,7,0.07)', border: '1px solid rgba(255,193,7,0.2)' }}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-200">Fiat deposits require wallet address verification and PcPay billing setup. Contact <span className="font-bold">support@pccasino.io</span> to enable fiat billing on your VIP account.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Crypto Tab */}
                {activeTab === 'crypto' && (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">Top 25 cryptocurrencies supported. All automatically converted to $Pc at CoinGecko live rate.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CRYPTOS.map(c => (
                        <Tooltip key={c.symbol}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 p-2.5 rounded-xl cursor-default transition-all hover:scale-[1.02]"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                                {c.icon}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs">{c.symbol}</div>
                                <div className="text-[10px] text-gray-400">{c.name}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Bet with {c.name} ({c.symbol})</p>
                            <p className="text-xs text-gray-400">Converted to $Pc at CoinGecko live rate at bet time</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commodity Tab */}
                {activeTab === 'commodity' && (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">Commodity bets use live market prices (delayed up to 15 minutes). Converted to $Pc at bet time.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {COMMODITIES.map(c => (
                        <Tooltip key={c.symbol}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 p-3 rounded-xl cursor-default transition-all hover:scale-[1.02]"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <span className="text-3xl">{c.icon}</span>
                              <div>
                                <div className="font-bold text-white text-sm">{c.name}</div>
                                <div className="text-xs text-gray-400">{c.unit}</div>
                                <div className="text-xs text-[#D4AF37] mt-0.5">Live rate at bet time</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Bet with {c.name}</p>
                            <p className="text-xs text-gray-400">Prices delayed up to 15 min. Converted to $Pc at bet time.</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,193,7,0.07)', border: '1px solid rgba(255,193,7,0.2)' }}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-200">Commodity prices are sourced from live market data and may have up to 15-minute delay. Final conversion rate is confirmed at the moment your bet is placed. $Pc Casino is not liable for market moves between quote and execution.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* How to Use */}
                <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold text-[#D4AF37] mb-2">How to Use Multi-Currency Betting</p>
                  <ol className="text-xs text-gray-400 space-y-1">
                    <li>1. Open any game (Poker, Blackjack, Roulette, etc.)</li>
                    <li>2. In the bet panel, look for the currency selector (shown to VIP members only)</li>
                    <li>3. Choose your preferred currency — it will convert automatically</li>
                    <li>4. Winnings are always credited in $Pc to your casino balance</li>
                    <li>5. For fiat deposits, click Wallet → Deposit → Fiat Tab</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
