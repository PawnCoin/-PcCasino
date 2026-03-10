import { useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Trophy, Clock, ExternalLink, BarChart3, Wallet, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/types';

interface CommandCenterProps {
  balance: number;
  transactions: Transaction[];
  onBack: () => void;
}

export function CommandCenter({ balance, transactions, onBack }: CommandCenterProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'stats'>('overview');

  const totalWins = transactions.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
  const totalBets = transactions.filter(t => t.type === 'bet').reduce((sum, t) => sum + t.amount, 0);
  const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalWins - totalBets;
  const winCount = transactions.filter(t => t.type === 'win').length;
  const betCount = transactions.filter(t => t.type === 'bet').length;
  const winRate = betCount > 0 ? ((winCount / betCount) * 100).toFixed(1) : '0.0';

  const gameStats = transactions
    .filter(t => t.game && t.game !== 'Welcome Bonus' && t.game !== 'Daily Bonus' && t.game !== 'Dev Reload')
    .reduce((acc, t) => {
      const game = t.game!;
      if (!acc[game]) acc[game] = { wins: 0, bets: 0, profit: 0 };
      if (t.type === 'win') { acc[game].wins += t.amount; acc[game].profit += t.amount; }
      if (t.type === 'bet') { acc[game].bets += t.amount; acc[game].profit -= t.amount; }
      return acc;
    }, {} as Record<string, { wins: number; bets: number; profit: number }>);

  const recentTransactions = transactions.slice(0, 20);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
          <div>
            <h1 className="font-casino text-3xl text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
              $Pc Command Center
            </h1>
            <p className="text-sm text-[#808080]">Your $Pc Casino dashboard & analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(27,94,32,0.4), rgba(27,94,32,0.1))',
              border: '1px solid rgba(67,160,71,0.4)',
              boxShadow: '0 0 20px rgba(67,160,71,0.1)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[#43A047]" />
              <span className="text-xs text-[#808080]">Balance</span>
            </div>
            <div className="text-2xl font-bold text-[#D4AF37]">
              {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#808080]">$Pc</div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: netProfit >= 0
                ? 'linear-gradient(135deg, rgba(27,94,32,0.3), rgba(27,94,32,0.05))'
                : 'linear-gradient(135deg, rgba(183,28,28,0.3), rgba(183,28,28,0.05))',
              border: `1px solid ${netProfit >= 0 ? 'rgba(67,160,71,0.3)' : 'rgba(239,83,80,0.3)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {netProfit >= 0 ? <TrendingUp className="w-4 h-4 text-[#43A047]" /> : <TrendingDown className="w-4 h-4 text-[#EF5350]" />}
              <span className="text-xs text-[#808080]">Net Profit</span>
            </div>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-[#43A047]' : 'text-[#EF5350]'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#808080]">$Pc</div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs text-[#808080]">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-[#D4AF37]">{winRate}%</div>
            <div className="text-xs text-[#808080]">{winCount} wins / {betCount} bets</div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(93,64,55,0.3), rgba(93,64,55,0.1))',
              border: '1px solid rgba(93,64,55,0.4)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#C0C0C0]" />
              <span className="text-xs text-[#808080]">Total Volume</span>
            </div>
            <div className="text-2xl font-bold text-white">{(totalBets + totalWins).toLocaleString()}</div>
            <div className="text-xs text-[#808080]">$Pc wagered & won</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['overview', 'history', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                  : 'text-[#808080] hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(10,10,10,0.8)',
                border: '1px solid rgba(93,64,55,0.4)',
              }}
            >
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                Financial Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-[#5D4037]/20">
                  <span className="text-[#808080]">Total Deposits</span>
                  <span className="font-bold text-[#43A047]">+{totalDeposits.toLocaleString()} $Pc</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-[#5D4037]/20">
                  <span className="text-[#808080]">Total Withdrawals</span>
                  <span className="font-bold text-[#EF5350]">-{totalWithdrawals.toLocaleString()} $Pc</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-[#5D4037]/20">
                  <span className="text-[#808080]">Total Wagered</span>
                  <span className="font-bold text-[#EF5350]">-{totalBets.toLocaleString()} $Pc</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-[#5D4037]/20">
                  <span className="text-[#808080]">Total Won</span>
                  <span className="font-bold text-[#43A047]">+{totalWins.toLocaleString()} $Pc</span>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(10,10,10,0.8)',
                border: '1px solid rgba(93,64,55,0.4)',
              }}
            >
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
                Game Performance
              </h3>
              {Object.keys(gameStats).length === 0 ? (
                <div className="text-center text-[#808080] py-8">No game data yet. Start playing!</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(gameStats).map(([game, stats]) => (
                    <div key={game} className="flex justify-between items-center p-3 rounded-lg bg-[#5D4037]/20">
                      <span className="text-white capitalize font-medium">{game}</span>
                      <span className={`font-bold ${stats.profit >= 0 ? 'text-[#43A047]' : 'text-[#EF5350]'}`}>
                        {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString()} $Pc
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="p-6 rounded-xl md:col-span-2"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.03))',
                border: '1px solid rgba(212,175,55,0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-[#D4AF37]" />
                  Pawn Coin Command Center
                </h3>
              </div>
              <p className="text-sm text-[#808080] mb-4">
                Access the full Pawn Coin ecosystem — manage your $Pc tokens, view blockchain transactions, stake rewards, and more.
              </p>
              <a
                href="https://pawncoinpc.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="btn-primary flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open Pawn Coin Command Center
                </Button>
              </a>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div
            className="p-6 rounded-xl"
            style={{
              background: 'rgba(10,10,10,0.8)',
              border: '1px solid rgba(93,64,55,0.4)',
            }}
          >
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              Session History
            </h3>
            {recentTransactions.length === 0 ? (
              <div className="text-center text-[#808080] py-8">No transactions yet</div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#5D4037]/20 border border-[#5D4037]/30"
                  >
                    <div>
                      <div className="font-bold capitalize text-white">{tx.type}</div>
                      <div className="text-xs text-[#808080]">
                        {tx.game || ''} {tx.game ? '•' : ''} {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className={`font-bold ${
                      tx.type === 'win' || tx.type === 'deposit' ? 'text-[#43A047]' : 'text-[#EF5350]'
                    }`}>
                      {tx.type === 'win' || tx.type === 'deposit' ? '+' : '-'}
                      {tx.amount.toLocaleString()} $Pc
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(10,10,10,0.8)',
                border: '1px solid rgba(93,64,55,0.4)',
              }}
            >
              <h3 className="font-bold text-white mb-4">Betting Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#808080]">Win Rate</span>
                    <span className="text-[#D4AF37]">{winRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#5D4037]/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(parseFloat(winRate), 100)}%`,
                        background: 'linear-gradient(90deg, #D4AF37, #43A047)',
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#5D4037]/20 text-center">
                    <div className="text-2xl font-bold text-white">{betCount}</div>
                    <div className="text-xs text-[#808080]">Total Bets</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#5D4037]/20 text-center">
                    <div className="text-2xl font-bold text-white">{winCount}</div>
                    <div className="text-xs text-[#808080]">Total Wins</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#5D4037]/20 text-center">
                    <div className="text-2xl font-bold text-[#D4AF37]">
                      {betCount > 0 ? Math.round(totalBets / betCount) : 0}
                    </div>
                    <div className="text-xs text-[#808080]">Avg Bet Size</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#5D4037]/20 text-center">
                    <div className="text-2xl font-bold text-[#D4AF37]">
                      {winCount > 0 ? Math.round(totalWins / winCount) : 0}
                    </div>
                    <div className="text-xs text-[#808080]">Avg Win Size</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(10,10,10,0.8)',
                border: '1px solid rgba(93,64,55,0.4)',
              }}
            >
              <h3 className="font-bold text-white mb-4">Per-Game Breakdown</h3>
              {Object.keys(gameStats).length === 0 ? (
                <div className="text-center text-[#808080] py-8">No game data yet</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(gameStats).map(([game, stats]) => (
                    <div key={game} className="p-3 rounded-lg bg-[#5D4037]/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-white capitalize">{game}</span>
                        <span className={`text-sm font-bold ${stats.profit >= 0 ? 'text-[#43A047]' : 'text-[#EF5350]'}`}>
                          {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString()} $Pc
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-[#808080]">
                        <span>Wagered: {stats.bets.toLocaleString()}</span>
                        <span>Won: {stats.wins.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
