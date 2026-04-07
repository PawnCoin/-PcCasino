import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  History, 
  PieChart,
  Target,
  Award,
  Calendar,
  Copy,
  Check,
  Zap,
  QrCode,
  AlertCircle,
  Filter,
  Search
} from 'lucide-react';
import type { Transaction } from '@/types';

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  transactions: Transaction[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onDevReload?: (amount: number) => void;
  withdrawAddress?: string;
  onSaveWithdrawAddress?: (address: string) => void;
  depositAddress?: string;
}

const EXCHANGE_RATES = {
  USD: 0.0000012,
  BTC: 0.000000000019,
  ETH: 0.00000000032,
  SOL: 0.000000011,
};

function ExchangeRateBar({ amount }: { amount: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-black/40 border border-[#5D4037]/30">
      {Object.entries(EXCHANGE_RATES).map(([currency, rate]) => {
        const converted = (amount * rate).toFixed(currency === 'BTC' ? 8 : currency === 'ETH' ? 6 : 4);
        return (
          <div key={currency} className="text-center">
            <div className="text-xs text-[#808080]">{currency}</div>
            <div className="text-xs font-bold text-[#D4AF37]">≈ {converted}</div>
          </div>
        );
      })}
    </div>
  );
}

export function FinancialModal({ 
  isOpen, 
  onClose, 
  balance, 
  transactions,
  onDeposit,
  onWithdraw,
  onDevReload,
  withdrawAddress: savedWithdrawAddress,
  onSaveWithdrawAddress,
  depositAddress: depositAddressProp,
}: FinancialModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [customDepositAmount, setCustomDepositAmount] = useState('');
  const [customWithdrawAmount, setCustomWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState(savedWithdrawAddress || '');
  const [addressSaved, setAddressSaved] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposit' | 'withdraw' | 'bet' | 'win'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [depositAddressFetched, setDepositAddressFetched] = useState('');

  useEffect(() => {
    if (!depositAddressProp && isOpen) {
      fetch('/api/payments/address', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pcasino_token') || ''}` },
      })
        .then(r => r.json())
        .then(d => { if (d?.address) setDepositAddressFetched(d.address); })
        .catch(() => {});
    }
  }, [isOpen, depositAddressProp]);

  const depositAddress = depositAddressProp || depositAddressFetched || 'Loading deposit address…';

  const stats = useMemo(() => {
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
    const bets = transactions.filter(t => t.type === 'bet').reduce((sum, t) => sum + t.amount, 0);
    const wins = transactions.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
    
    const netProfit = wins - bets;
    const winRate = bets > 0 ? (wins / bets) * 100 : 0;
    
    const gameStats: Record<string, { bets: number; wins: number }> = {};
    transactions.forEach(t => {
      if (t.game) {
        if (!gameStats[t.game]) gameStats[t.game] = { bets: 0, wins: 0 };
        if (t.type === 'bet') gameStats[t.game].bets += t.amount;
        if (t.type === 'win') gameStats[t.game].wins += t.amount;
      }
    });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyStats = last7Days.map(date => {
      const dayTxs = transactions.filter(t => 
        new Date(t.timestamp).toISOString().split('T')[0] === date
      );
      const dayBets = dayTxs.filter(t => t.type === 'bet').reduce((sum, t) => sum + t.amount, 0);
      const dayWins = dayTxs.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        bets: dayBets,
        wins: dayWins,
        profit: dayWins - dayBets
      };
    });

    return {
      deposits,
      withdrawals,
      bets,
      wins,
      netProfit,
      winRate,
      gameStats,
      dailyStats,
      totalTransactions: transactions.length
    };
  }, [transactions]);

  const filteredHistory = useMemo(() => {
    return transactions.filter(tx => {
      const matchType = historyFilter === 'all' || tx.type === historyFilter;
      const matchSearch = !historySearch || 
        tx.type.includes(historySearch.toLowerCase()) ||
        (tx.game && tx.game.toLowerCase().includes(historySearch.toLowerCase())) ||
        tx.id.toLowerCase().includes(historySearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [transactions, historyFilter, historySearch]);

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = (amount: number) => {
    if (amount > 0) onDeposit(amount);
  };

  const handleCustomDeposit = () => {
    const amount = parseFloat(customDepositAmount);
    if (!isNaN(amount) && amount > 0) {
      handleDeposit(amount);
      setCustomDepositAmount('');
    }
  };

  const handleWithdraw = (amount: number) => {
    if (!withdrawAddress.trim()) {
      alert('Please enter your destination wallet address before withdrawing.');
      return;
    }
    if (amount <= 0 || amount > balance) return;
    onWithdraw(amount);
  };

  const handleCustomWithdraw = () => {
    const amount = parseFloat(customWithdrawAmount);
    if (!isNaN(amount) && amount > 0 && amount <= balance) {
      handleWithdraw(amount);
      setCustomWithdrawAmount('');
    }
  };

  const handleSaveAddress = () => {
    onSaveWithdrawAddress?.(withdrawAddress);
    setAddressSaved(true);
    setTimeout(() => setAddressSaved(false), 2000);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold flex items-center gap-3">
              <Wallet className="w-7 h-7 text-[#D4AF37]" />
              Financial Center
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 bg-[#5D4037]/20">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] text-xs sm:text-sm px-1 sm:px-3">
                <PieChart className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="deposit" className="data-[state=active]:bg-[#43A047]/20 data-[state=active]:text-[#43A047] text-xs sm:text-sm px-1 sm:px-3">
                <ArrowDownRight className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Deposit</span>
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="data-[state=active]:bg-[#EF5350]/20 data-[state=active]:text-[#EF5350] text-xs sm:text-sm px-1 sm:px-3">
                <ArrowUpRight className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Withdraw</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#1E88E5]/20 data-[state=active]:text-[#1E88E5] text-xs sm:text-sm px-1 sm:px-3">
                <History className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  <div 
                    className="p-6 rounded-2xl"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                      border: '1px solid rgba(212,175,55,0.4)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-[#808080] mb-1">Current Balance</div>
                        <div className="text-4xl font-bold text-[#D4AF37]">
                          {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc
                        </div>
                        <div className="text-sm text-[#808080] mt-1">
                          ≈ ${(balance * EXCHANGE_RATES.USD).toFixed(2)} USD
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                        <img src="/logos/pc-logo.png" alt="$Pc" className="w-10 h-10" />
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rates */}
                  <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                    <div className="text-sm font-bold text-[#D4AF37] mb-2">Live Exchange Rates (1,000 $Pc)</div>
                    <ExchangeRateBar amount={1000} />
                  </div>

                  {onDevReload && (
                    <div 
                      className="p-4 rounded-xl"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(156,39,176,0.2), rgba(156,39,176,0.05))',
                        border: '1px dashed rgba(156,39,176,0.5)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-[#9C27B0]" />
                        <span className="font-bold text-[#9C27B0]">DEV MODE - Reload Balance</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[1000, 5000, 10000, 50000].map(amount => (
                          <button
                            key={amount}
                            onClick={() => onDevReload(amount)}
                            className="p-2 rounded-lg bg-[#9C27B0]/20 hover:bg-[#9C27B0]/30 border border-[#9C27B0]/30 text-center transition-colors"
                          >
                            <div className="font-bold text-[#9C27B0]">+{amount.toLocaleString()}</div>
                            <div className="text-xs text-[#808080]">$Pc</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-[#43A047]" />
                        <span className="text-xs text-[#808080]">Total Deposits</span>
                      </div>
                      <div className="text-xl font-bold text-[#43A047]">+{stats.deposits.toLocaleString()} $Pc</div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-[#EF5350]" />
                        <span className="text-xs text-[#808080]">Total Withdrawals</span>
                      </div>
                      <div className="text-xl font-bold text-[#EF5350]">-{stats.withdrawals.toLocaleString()} $Pc</div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-[#1E88E5]" />
                        <span className="text-xs text-[#808080]">Total Bets</span>
                      </div>
                      <div className="text-xl font-bold text-[#1E88E5]">{stats.bets.toLocaleString()} $Pc</div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs text-[#808080]">Total Wins</span>
                      </div>
                      <div className="text-xl font-bold text-[#D4AF37]">{stats.wins.toLocaleString()} $Pc</div>
                    </div>
                  </div>

                  <div 
                    className={`p-4 rounded-xl border ${stats.netProfit >= 0 ? 'bg-[#43A047]/10 border-[#43A047]/30' : 'bg-[#EF5350]/10 border-[#EF5350]/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {stats.netProfit >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-[#43A047]" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-[#EF5350]" />
                        )}
                        <span className="text-sm text-[#808080]">Net Profit/Loss</span>
                      </div>
                      <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-[#43A047]' : 'text-[#EF5350]'}`}>
                        {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toLocaleString()} $Pc
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-sm text-[#808080]">Win Rate</span>
                      </div>
                      <div className="text-xl font-bold text-[#D4AF37]">{stats.winRate.toFixed(1)}%</div>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#43A047] transition-all duration-500"
                        style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {Object.entries(stats.gameStats).length > 0 && (
                    <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-sm font-bold text-white">Game Performance</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(stats.gameStats).map(([game, data]) => {
                          const profit = data.wins - data.bets;
                          return (
                            <div key={game} className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                              <span className="text-sm text-[#C0C0C0] capitalize">{game}</span>
                              <span className={`text-sm font-bold ${profit >= 0 ? 'text-[#43A047]' : 'text-[#EF5350]'}`}>
                                {profit >= 0 ? '+' : ''}{profit.toLocaleString()} $Pc
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-bold text-white">Last 7 Days Activity</span>
                    </div>
                    <div className="space-y-2">
                      {stats.dailyStats.map((day, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-[#808080] w-20">{day.date}</span>
                          <div className="flex-1 flex items-center gap-1">
                            <div 
                              className="h-4 bg-[#1E88E5]/50 rounded"
                              style={{ width: `${Math.min((day.bets / (stats.bets || 1)) * 100, 100)}%` }}
                            />
                            <div 
                              className="h-4 bg-[#43A047]/50 rounded"
                              style={{ width: `${Math.min((day.wins / (stats.wins || 1)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-16 text-right ${day.profit >= 0 ? 'text-[#43A047]' : 'text-[#EF5350]'}`}>
                            {day.profit >= 0 ? '+' : ''}{day.profit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#1E88E5]/50 rounded" /> Bets</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#43A047]/50 rounded" /> Wins</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Deposit Tab */}
            <TabsContent value="deposit" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-2">
                  <div 
                    className="p-6 rounded-2xl"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(67,160,71,0.2), rgba(67,160,71,0.05))',
                      border: '1px solid rgba(67,160,71,0.4)'
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#43A047]/20 flex items-center justify-center">
                        <ArrowDownRight className="w-6 h-6 text-[#43A047]" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">Deposit $Pc</div>
                        <div className="text-sm text-[#808080]">Send $Pc to your casino wallet</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black/50 border border-[#5D4037]/30 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-[#808080]">Your Deposit Address (ERC-20 / $Pc)</div>
                        <button
                          onClick={() => setShowQR(!showQR)}
                          className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#FFD700] transition-colors"
                        >
                          <QrCode className="w-3 h-3" />
                          {showQR ? 'Hide QR' : 'Show QR'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 rounded-lg bg-black/50 text-xs break-all text-[#D4AF37]">
                          {depositAddress}
                        </code>
                        <button
                          onClick={copyAddress}
                          className="p-3 rounded-lg bg-[#5D4037]/30 hover:bg-[#5D4037]/50 transition-colors"
                        >
                          {copied ? <Check className="w-5 h-5 text-[#43A047]" /> : <Copy className="w-5 h-5 text-[#C0C0C0]" />}
                        </button>
                      </div>
                      {showQR && (
                        <div className="mt-3 flex justify-center">
                          <div className="p-3 bg-white rounded-xl">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${depositAddress}`}
                              alt="QR Code"
                              className="w-40 h-40"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Exchange Rate */}
                    <div className="mb-4">
                      <div className="text-xs text-[#808080] mb-2">Exchange Rates</div>
                      <ExchangeRateBar amount={customDepositAmount ? parseFloat(customDepositAmount) || 0 : 1000} />
                    </div>

                    {/* Custom Amount */}
                    <div className="mb-4">
                      <div className="text-sm text-[#808080] mb-2">Custom Amount</div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={customDepositAmount}
                          onChange={e => setCustomDepositAmount(e.target.value)}
                          placeholder="Enter amount in $Pc..."
                          min="1"
                          className="flex-1 p-3 rounded-lg bg-black/50 border border-[#43A047]/40 text-white placeholder-[#606060] focus:outline-none focus:border-[#43A047]"
                        />
                        <button
                          onClick={handleCustomDeposit}
                          disabled={!customDepositAmount || parseFloat(customDepositAmount) <= 0}
                          className="px-4 py-3 rounded-lg bg-[#43A047] hover:bg-[#388E3C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
                        >
                          Deposit
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-[#808080] mb-3">Quick Deposit Amounts</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1000, 5000, 10000, 25000, 50000, 100000].map(amount => (
                        <Tooltip key={amount}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDeposit(amount)}
                              className="p-3 rounded-lg bg-[#43A047]/20 hover:bg-[#43A047]/30 border border-[#43A047]/30 text-center transition-colors"
                            >
                              <div className="font-bold text-[#43A047]">{amount.toLocaleString()}</div>
                              <div className="text-xs text-[#808080]">$Pc</div>
                              <div className="text-xs text-[#505050]">≈ ${(amount * EXCHANGE_RATES.USD).toFixed(2)}</div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Deposit {amount.toLocaleString()} $Pc (≈ ${(amount * EXCHANGE_RATES.USD).toFixed(2)} USD)</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                    <div className="text-sm font-bold text-[#D4AF37] mb-2">How to Deposit</div>
                    <ol className="text-sm text-[#808080] space-y-1 list-decimal list-inside">
                      <li>Copy your deposit address or scan the QR code</li>
                      <li>Open your crypto wallet (MetaMask, Phantom, etc.)</li>
                      <li>Send $Pc tokens to this address on the correct network</li>
                      <li>Funds will appear in your balance within minutes</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1E88E5]/10 border border-[#1E88E5]/30 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#1E88E5] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#808080]">Only send $Pc tokens. Sending other tokens may result in permanent loss. Minimum deposit: 100 $Pc.</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Withdraw Tab */}
            <TabsContent value="withdraw" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-2">
                  <div 
                    className="p-6 rounded-2xl"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(239,83,80,0.2), rgba(239,83,80,0.05))',
                      border: '1px solid rgba(239,83,80,0.4)'
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#EF5350]/20 flex items-center justify-center">
                        <ArrowUpRight className="w-6 h-6 text-[#EF5350]" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">Withdraw $Pc</div>
                        <div className="text-sm text-[#808080]">Send $Pc to your external wallet</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black/50 border border-[#5D4037]/30 mb-4">
                      <div className="text-sm text-[#808080] mb-1">Available Balance</div>
                      <div className="text-3xl font-bold text-[#D4AF37]">
                        {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc
                      </div>
                      <div className="text-sm text-[#808080]">≈ ${(balance * EXCHANGE_RATES.USD).toFixed(2)} USD</div>
                    </div>

                    {/* Destination Address */}
                    <div className="mb-4">
                      <div className="text-sm text-[#808080] mb-2 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        Destination Wallet Address <span className="text-[#EF5350]">*</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={withdrawAddress}
                          onChange={e => setWithdrawAddress(e.target.value)}
                          placeholder="0x... or Solana address"
                          className="flex-1 p-3 rounded-lg bg-black/50 border border-[#EF5350]/40 text-white placeholder-[#606060] focus:outline-none focus:border-[#EF5350] text-sm font-mono"
                        />
                        <button
                          onClick={handleSaveAddress}
                          disabled={!withdrawAddress.trim()}
                          className="px-3 py-2 rounded-lg bg-[#5D4037]/40 hover:bg-[#5D4037]/60 disabled:opacity-50 border border-[#5D4037]/50 transition-colors"
                        >
                          {addressSaved ? <Check className="w-4 h-4 text-[#43A047]" /> : <Check className="w-4 h-4 text-[#808080]" />}
                        </button>
                      </div>
                      {!withdrawAddress.trim() && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 text-[#EF5350]" />
                          <span className="text-xs text-[#EF5350]">Required: enter your destination address before withdrawing</span>
                        </div>
                      )}
                    </div>

                    {/* Exchange Rate for current balance */}
                    <div className="mb-4">
                      <div className="text-xs text-[#808080] mb-2">Exchange Rates</div>
                      <ExchangeRateBar amount={customWithdrawAmount ? parseFloat(customWithdrawAmount) || 0 : 1000} />
                    </div>

                    {/* Custom Amount */}
                    <div className="mb-4">
                      <div className="text-sm text-[#808080] mb-2">Custom Amount</div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={customWithdrawAmount}
                          onChange={e => setCustomWithdrawAmount(e.target.value)}
                          placeholder="Enter amount in $Pc..."
                          min="100"
                          max={balance}
                          className="flex-1 p-3 rounded-lg bg-black/50 border border-[#EF5350]/40 text-white placeholder-[#606060] focus:outline-none focus:border-[#EF5350]"
                        />
                        <button
                          onClick={handleCustomWithdraw}
                          disabled={!customWithdrawAmount || parseFloat(customWithdrawAmount) <= 0 || parseFloat(customWithdrawAmount) > balance || !withdrawAddress.trim()}
                          className="px-4 py-3 rounded-lg bg-[#EF5350] hover:bg-[#D32F2F] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-[#808080] mb-3">Quick Withdraw Amounts</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1000, 5000, 10000, 25000, 50000, 100000].map(amount => (
                        <Tooltip key={amount}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleWithdraw(amount)}
                              disabled={amount > balance || !withdrawAddress.trim()}
                              className="p-3 rounded-lg bg-[#EF5350]/20 hover:bg-[#EF5350]/30 disabled:opacity-50 disabled:cursor-not-allowed border border-[#EF5350]/30 text-center transition-colors"
                            >
                              <div className="font-bold text-[#EF5350]">{amount.toLocaleString()}</div>
                              <div className="text-xs text-[#808080]">$Pc</div>
                              <div className="text-xs text-[#505050]">≈ ${(amount * EXCHANGE_RATES.USD).toFixed(2)}</div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {!withdrawAddress.trim() ? 'Enter destination address first' :
                               amount > balance ? 'Insufficient balance' : 
                               `Withdraw ${amount.toLocaleString()} $Pc`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                    <div className="text-sm font-bold text-[#D4AF37] mb-2">Withdrawal Info</div>
                    <ul className="text-sm text-[#808080] space-y-1">
                      <li>• Minimum withdrawal: 100 $Pc</li>
                      <li>• Processing time: 10–30 minutes on-chain</li>
                      <li>• Network fee: 1 $Pc</li>
                      <li>• Daily limit: 10,000,000 $Pc</li>
                      <li>• Destination address must be ERC-20 compatible</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-[#808080]">Always double-check your destination address. Withdrawals to wrong addresses cannot be reversed.</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-[#808080]">
                    <Filter className="w-3 h-3" />
                  </div>
                  {(['all', 'deposit', 'withdraw', 'bet', 'win'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors capitalize ${
                        historyFilter === f 
                          ? 'bg-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/60'
                          : 'bg-black/30 text-[#808080] border-[#5D4037]/30 hover:border-[#D4AF37]/30'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-[#5D4037]/30">
                  <Search className="w-4 h-4 text-[#808080]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search by game, type, or ID..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#606060] focus:outline-none"
                  />
                </div>
                <div className="text-xs text-[#808080]">{filteredHistory.length} transactions</div>
              </div>
              <ScrollArea className="h-[380px] mt-2">
                <div className="space-y-2 pr-4">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center text-[#808080] py-12">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No transactions found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredHistory.map((tx) => (
                      <Tooltip key={tx.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-[#5D4037]/20 border border-[#5D4037]/30 hover:bg-[#5D4037]/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'win' || tx.type === 'deposit' ? 'bg-[#43A047]/20' : 
                                tx.type === 'bet' ? 'bg-[#1E88E5]/20' : 'bg-[#EF5350]/20'
                              }`}>
                                {tx.type === 'win' && <Award className="w-5 h-5 text-[#43A047]" />}
                                {tx.type === 'deposit' && <ArrowDownRight className="w-5 h-5 text-[#43A047]" />}
                                {tx.type === 'withdraw' && <ArrowUpRight className="w-5 h-5 text-[#EF5350]" />}
                                {tx.type === 'bet' && <Target className="w-5 h-5 text-[#1E88E5]" />}
                                {tx.type === 'bonus' && <Award className="w-5 h-5 text-[#D4AF37]" />}
                              </div>
                              <div>
                                <div className="font-bold capitalize text-white">{tx.type}</div>
                                <div className="text-xs text-[#808080]">
                                  {tx.game && <span className="capitalize">{tx.game} • </span>}
                                  {new Date(tx.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className={`font-bold text-right ${
                                tx.type === 'win' || tx.type === 'deposit' || tx.type === 'bonus' ? 'text-[#43A047]' : 'text-[#EF5350]'
                              }`}>
                                {tx.type === 'win' || tx.type === 'deposit' || tx.type === 'bonus' ? '+' : '-'}
                                {tx.amount.toLocaleString()} $Pc
                              </div>
                              <div className="text-xs text-[#606060] text-right">
                                ≈ ${(tx.amount * EXCHANGE_RATES.USD).toFixed(4)}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Transaction ID: {tx.id}</p>
                          <p>Status: {tx.status}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
