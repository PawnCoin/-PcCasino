import { useState } from 'react';
import { Trophy, ChevronRight, TrendingUp, DollarSign, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { LiveEvent } from '@/types';

const mockEvents: LiveEvent[] = [
  {
    id: '1',
    sport: 'NFL',
    league: 'National Football League',
    homeTeam: 'Kansas City Chiefs',
    awayTeam: 'San Francisco 49ers',
    homeScore: 21,
    awayScore: 17,
    status: 'live',
    startTime: new Date(),
    odds: { home: -110, away: 145 },
  },
  {
    id: '2',
    sport: 'NBA',
    league: 'National Basketball Association',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Golden State Warriors',
    status: 'upcoming',
    startTime: new Date(Date.now() + 3600000),
    odds: { home: -120, away: 140, spread: { home: -1.5, away: 1.5 }, total: { over: -110, under: -110, line: 224.5 } },
  },
  {
    id: '3',
    sport: 'UFC',
    league: 'Ultimate Fighting Championship',
    homeTeam: 'Jon Jones',
    awayTeam: 'Stipe Miocic',
    status: 'upcoming',
    startTime: new Date(Date.now() + 86400000),
    odds: { home: -250, away: 200 },
  },
];

const sportEmojis: Record<string, string> = {
  NFL: '🏈',
  NBA: '🏀',
  UFC: '🥊',
};

interface BetSlip {
  event: LiveEvent;
  selection: string;
  odds: number;
  amount: number;
}

interface SportsbookProps {
  onPlaceBet: (event: LiveEvent, selection: string, amount: number) => void;
  balance: number;
  isAuthenticated: boolean;
}

function calculatePayout(amount: number, americanOdds: number): number {
  if (americanOdds > 0) {
    return amount + (amount * americanOdds) / 100;
  } else {
    return amount + (amount * 100) / Math.abs(americanOdds);
  }
}

export function Sportsbook({ onPlaceBet, balance, isAuthenticated }: SportsbookProps) {
  const [betSlip, setBetSlip] = useState<BetSlip | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [placingBet, setPlacingBet] = useState(false);

  const openBetSlip = (event: LiveEvent, selection: string, odds: number) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to place bets');
      return;
    }
    setBetSlip({ event, selection, odds, amount: 1000000 });
    setCustomAmount('1000000');
  };

  const handlePlaceBet = async () => {
    if (!betSlip) return;
    const amount = parseInt(customAmount) || betSlip.amount;
    if (amount <= 0) { toast.error('Enter a valid bet amount'); return; }
    if (amount > balance) { toast.error('Insufficient balance'); return; }
    if (amount < 100000) { toast.error('Minimum bet is 100,000 $Pc'); return; }

    setPlacingBet(true);
    try {
      await onPlaceBet(betSlip.event, betSlip.selection, amount);
      const payout = calculatePayout(amount, betSlip.odds);
      const won = Math.random() > 0.55; // 45% win rate for house edge
      if (won) {
        toast.success(`🏆 You won! +${Math.floor(payout - amount).toLocaleString()} $Pc`);
      } else {
        toast.error(`Lost ${amount.toLocaleString()} $Pc on ${betSlip.selection}`);
      }
      setBetSlip(null);
      setCustomAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Bet failed');
    } finally {
      setPlacingBet(false);
    }
  };

  const quickAmounts = [500000, 1000000, 5000000, 10000000, 25000000];

  return (
    <section id="sports-section" className="px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            SPORTSBOOK
          </h2>
          <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-yellow-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mockEvents.map((event) => {
              const sportEmoji = sportEmojis[event.sport] || '🏆';
              const isLive = event.status === 'live';

              return (
                <div
                  key={event.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-yellow-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sportEmoji}</span>
                      <span className="font-bold text-sm">{event.sport}</span>
                    </div>
                    {isLive ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.homeTeam}</span>
                      {event.homeScore !== undefined && (
                        <span className="font-bold text-lg">{event.homeScore}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.awayTeam}</span>
                      {event.awayScore !== undefined && (
                        <span className="font-bold text-lg">{event.awayScore}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openBetSlip(event, event.homeTeam, event.odds.home)}
                      className="flex-1 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-500 font-bold text-sm transition-colors"
                    >
                      {event.odds.home > 0 ? `+${event.odds.home}` : event.odds.home}
                    </button>
                    <button
                      onClick={() => openBetSlip(event, event.awayTeam, event.odds.away)}
                      className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-sm transition-colors"
                    >
                      {event.odds.away > 0 ? `+${event.odds.away}` : event.odds.away}
                    </button>
                  </div>

                  {event.odds.spread && (
                    <div className="flex gap-2 mt-2 text-xs text-gray-400">
                      <span>Spread: {event.odds.spread.home}</span>
                      <span>O/U: {event.odds.total?.line}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <div>
                <div className="font-bold">Live Betting Available</div>
                <div className="text-sm text-gray-400">Place bets during the game with updated odds</div>
              </div>
            </div>
            <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
              Explore <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bet Slip Modal */}
      {betSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setBetSlip(null)}>
          <div
            className="relative w-full max-w-md rounded-2xl p-6 mx-4"
            style={{ background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(212,175,55,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setBetSlip(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-[#D4AF37] mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Bet Slip
            </h3>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
              <div className="text-sm text-gray-400 mb-1">{betSlip.event.sport} — {betSlip.event.league}</div>
              <div className="font-bold text-white">{betSlip.event.homeTeam} vs {betSlip.event.awayTeam}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[#D4AF37] font-bold">{betSlip.selection}</div>
                <div className="text-lg font-bold text-purple-400">
                  {betSlip.odds > 0 ? `+${betSlip.odds}` : betSlip.odds}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Bet Amount ($Pc)</div>
              <input
                type="number"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-full p-3 rounded-lg bg-black/50 border border-[#D4AF37]/40 text-white focus:outline-none focus:border-[#D4AF37]"
                placeholder="Enter amount..."
                min="100000"
              />
              <div className="flex gap-1 mt-2 flex-wrap">
                {quickAmounts.map(a => (
                  <button
                    key={a}
                    onClick={() => setCustomAmount(String(a))}
                    className="text-xs px-2 py-1 rounded bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30"
                  >
                    {(a / 1000000).toFixed(1)}M
                  </button>
                ))}
              </div>
            </div>

            {customAmount && parseInt(customAmount) > 0 && (
              <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Potential Payout:</span>
                  <span className="text-green-400 font-bold">
                    {Math.floor(calculatePayout(parseInt(customAmount), betSlip.odds)).toLocaleString()} $Pc
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400">Profit:</span>
                  <span className="text-green-400 font-bold">
                    +{Math.floor(calculatePayout(parseInt(customAmount), betSlip.odds) - parseInt(customAmount)).toLocaleString()} $Pc
                  </span>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mb-4">
              Balance: {balance.toLocaleString()} $Pc
            </div>

            <button
              onClick={handlePlaceBet}
              disabled={placingBet || !customAmount || parseInt(customAmount) <= 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              {placingBet ? (
                <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {placingBet ? 'Placing Bet...' : 'Place Bet'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
