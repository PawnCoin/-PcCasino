import { useEffect, useState } from 'react';
import { Flame, TrendingUp } from 'lucide-react';

interface Winner {
  id: string;
  name: string;
  game: string;
  amount: number;
  time: string;
  avatar: string;
  multiplier?: number;
}

const initialWinners: Winner[] = [
  { id: '1', name: 'CryptoKing', game: 'Slots - Mega Jackpot', amount: 45000, time: '2 min ago', avatar: 'CK', multiplier: 500 },
  { id: '2', name: 'PokerFace', game: "Texas Hold'em", amount: 12500, time: '5 min ago', avatar: 'PF', multiplier: 25 },
  { id: '3', name: 'DiceMaster', game: 'Craps', amount: 8900, time: '12 min ago', avatar: 'DM', multiplier: 18 },
  { id: '4', name: 'Lucky7', game: 'Roulette', amount: 23400, time: '18 min ago', avatar: 'L7', multiplier: 35 },
  { id: '5', name: 'SpadesPro', game: 'Spades', amount: 5600, time: '25 min ago', avatar: 'SP' },
  { id: '6', name: 'BlackjackBJ', game: 'Blackjack', amount: 18900, time: '32 min ago', avatar: 'BJ', multiplier: 3 },
];

const randomNames = ['MoonShot', 'DiamondHands', 'LuckyStrike', 'HighRoller', 'CryptoQueen', 'WhaleAlert', 'AllIn', 'RoyalFlush'];
const randomGames = ['Slots', 'Poker', 'Blackjack', 'Roulette', 'Craps', 'Spades', 'Baccarat'];

export function RecentWinners() {
  const [winners, setWinners] = useState<Winner[]>(initialWinners);

  // Simulate new winners
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newWinner: Winner = {
          id: Date.now().toString(),
          name: randomNames[Math.floor(Math.random() * randomNames.length)],
          game: randomGames[Math.floor(Math.random() * randomGames.length)],
          amount: Math.floor(Math.random() * 50000) + 1000,
          time: 'Just now',
          avatar: 'NW',
          multiplier: Math.floor(Math.random() * 50) + 2,
        };
        
        setWinners(prev => [newWinner, ...prev].slice(0, 8));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          RECENT WINNERS
        </h2>

        <div className="glass-panel rounded-2xl p-6 border border-orange-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {winners.map((winner, index) => (
              <div
                key={winner.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group animate-deal-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-sm shadow-lg">
                    {winner.avatar}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <div className="font-bold text-white group-hover:text-purple-400 transition-colors">
                      {winner.name}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      {winner.game}
                      {winner.multiplier && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                          {winner.multiplier}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Win Amount */}
                <div className="text-right">
                  <div className="font-bold text-green-400 text-lg flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{winner.amount.toLocaleString()} $Pc
                  </div>
                  <div className="text-xs text-gray-500">{winner.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Stats */}
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gradient-gold">
                {(winners.reduce((sum, w) => sum + w.amount, 0) / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-gray-400">Total Won (24h)</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">1,247</div>
              <div className="text-sm text-gray-400">Active Players</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">98.5%</div>
              <div className="text-sm text-gray-400">Payout Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
