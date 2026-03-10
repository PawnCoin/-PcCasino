import { useState, useMemo } from 'react';
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
  Zap
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
}

export function FinancialModal({ 
  isOpen, 
  onClose, 
  balance, 
  transactions,
  onDeposit,
  onWithdraw,
  onDevReload
}: FinancialModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate statistics
  const stats = useMemo(() => {
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
    const bets = transactions.filter(t => t.type === 'bet').reduce((sum, t) => sum + t.amount, 0);
    const wins = transactions.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
    
    const netProfit = wins - bets;
    const winRate = bets > 0 ? (wins / bets) * 100 : 0;
    
    // Game breakdown
    const gameStats: Record<string, { bets: number; wins: number }> = {};
    transactions.forEach(t => {
      if (t.game) {
        if (!gameStats[t.game]) gameStats[t.game] = { bets: 0, wins: 0 };
        if (t.type === 'bet') gameStats[t.game].bets += t.amount;
        if (t.type === 'win') gameStats[t.game].wins += t.amount;
      }
    });

    // Daily stats (last 7 days)
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

  const copyAddress = () => {
    navigator.clipboard.writeText('0x742d35Cc6634C0532925a3b8D4C9db96590b8f3a');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const depositAddress = '0x742d35Cc6634C0532925a3b8D4C9db96590b8f3a';

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-2xl max-h-[85vh] overflow-hidden"
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
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]">
                <PieChart className="w-4 h-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="deposit" className="data-[state=active]:bg-[#43A047]/20 data-[state=active]:text-[#43A047]">
                <ArrowDownRight className="w-4 h-4 mr-1" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="data-[state=active]:bg-[#EF5350]/20 data-[state=active]:text-[#EF5350]">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#1E88E5]/20 data-[state=active]:text-[#1E88E5]">
                <History className="w-4 h-4 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {/* Balance Card */}
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
                      </div>
                      <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                        <img src="/logos/pc-logo.png" alt="$Pc" className="w-10 h-10" />
                      </div>
                    </div>
                  </div>

                  {/* Dev Mode Reload - Only shown when onDevReload is provided */}
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

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-[#43A047]" />
                            <span className="text-xs text-[#808080]">Total Deposits</span>
                          </div>
                          <div className="text-xl font-bold text-[#43A047]">+{stats.deposits.toLocaleString()} $Pc</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total amount deposited to your account</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-[#EF5350]" />
                            <span className="text-xs text-[#808080]">Total Withdrawals</span>
                          </div>
                          <div className="text-xl font-bold text-[#EF5350]">-{stats.withdrawals.toLocaleString()} $Pc</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total amount withdrawn from your account</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-[#1E88E5]" />
                            <span className="text-xs text-[#808080]">Total Bets</span>
                          </div>
                          <div className="text-xl font-bold text-[#1E88E5]">{stats.bets.toLocaleString()} $Pc</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total amount wagered across all games</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-xs text-[#808080]">Total Wins</span>
                          </div>
                          <div className="text-xl font-bold text-[#D4AF37]">{stats.wins.toLocaleString()} $Pc</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total amount won from all games</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Net Profit */}
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

                  {/* Win Rate */}
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

                  {/* Game Performance */}
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

                  {/* Daily Activity Chart */}
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
              <div className="space-y-4">
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

                  <div className="p-4 rounded-xl bg-black/50 border border-[#5D4037]/30 mb-4">
                    <div className="text-sm text-[#808080] mb-2">Your Deposit Address</div>
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
                  </div>

                  <div className="text-sm text-[#808080] mb-3">Quick Deposit Amounts</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 500, 1000, 2500, 5000, 10000].map(amount => (
                      <Tooltip key={amount}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onDeposit(amount)}
                            className="p-3 rounded-lg bg-[#43A047]/20 hover:bg-[#43A047]/30 border border-[#43A047]/30 text-center transition-colors"
                          >
                            <div className="font-bold text-[#43A047]">{amount.toLocaleString()}</div>
                            <div className="text-xs text-[#808080]">$Pc</div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Deposit {amount.toLocaleString()} $Pc</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                  <div className="text-sm font-bold text-[#D4AF37] mb-2">How to Deposit</div>
                  <ol className="text-sm text-[#808080] space-y-1 list-decimal list-inside">
                    <li>Copy your deposit address above</li>
                    <li>Open your crypto wallet (MetaMask, Phantom, etc.)</li>
                    <li>Send $Pc tokens to this address</li>
                    <li>Funds will appear in your balance within minutes</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* Withdraw Tab */}
            <TabsContent value="withdraw" className="mt-4">
              <div className="space-y-4">
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
                    <div className="text-sm text-[#808080] mb-2">Available Balance</div>
                    <div className="text-3xl font-bold text-[#D4AF37]">
                      {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc
                    </div>
                  </div>

                  <div className="text-sm text-[#808080] mb-3">Quick Withdraw Amounts</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 500, 1000, 2500, 5000, 10000].map(amount => (
                      <Tooltip key={amount}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onWithdraw(amount)}
                            disabled={amount > balance}
                            className="p-3 rounded-lg bg-[#EF5350]/20 hover:bg-[#EF5350]/30 disabled:opacity-50 disabled:cursor-not-allowed border border-[#EF5350]/30 text-center transition-colors"
                          >
                            <div className="font-bold text-[#EF5350]">{amount.toLocaleString()}</div>
                            <div className="text-xs text-[#808080]">$Pc</div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{amount > balance ? 'Insufficient balance' : `Withdraw ${amount.toLocaleString()} $Pc`}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                  <div className="text-sm font-bold text-[#D4AF37] mb-2">Withdrawal Info</div>
                  <ul className="text-sm text-[#808080] space-y-1">
                    <li>• Minimum withdrawal: 100 $Pc</li>
                    <li>• Processing time: Instant</li>
                    <li>• Network fee: 1 $Pc</li>
                    <li>• Daily limit: 100,000 $Pc</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  {transactions.length === 0 ? (
                    <div className="text-center text-[#808080] py-12">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No transactions yet</p>
                      <p className="text-sm">Start playing to see your history!</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <Tooltip key={tx.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-[#5D4037]/20 border border-[#5D4037]/30 hover:bg-[#5D4037]/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'win' || tx.type === 'deposit' ? 'bg-[#43A047]/20' : 'bg-[#EF5350]/20'
                              }`}>
                                {tx.type === 'win' && <Award className="w-5 h-5 text-[#43A047]" />}
                                {tx.type === 'deposit' && <ArrowDownRight className="w-5 h-5 text-[#43A047]" />}
                                {tx.type === 'withdraw' && <ArrowUpRight className="w-5 h-5 text-[#EF5350]" />}
                                {tx.type === 'bet' && <Target className="w-5 h-5 text-[#1E88E5]" />}
                              </div>
                              <div>
                                <div className="font-bold capitalize text-white">{tx.type}</div>
                                <div className="text-xs text-[#808080]">
                                  {tx.game && <span className="capitalize">{tx.game} • </span>}
                                  {new Date(tx.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className={`font-bold ${
                              tx.type === 'win' || tx.type === 'deposit' ? 'text-[#43A047]' : 'text-[#EF5350]'
                            }`}>
                              {tx.type === 'win' || tx.type === 'deposit' ? '+' : '-'}
                              {tx.amount.toLocaleString()} $Pc
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
