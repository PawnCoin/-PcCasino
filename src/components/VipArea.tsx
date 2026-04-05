import { useState } from 'react';
import { Lock, Crown, ChevronRight, Star, Shield } from 'lucide-react';
import type { GameType } from '@/types';

interface VipAreaProps {
  balance: number;
  onBack: () => void;
  onSelectGame: (game: GameType) => void;
}

const vipGames = [
  { id: 'poker' as GameType, name: "Texas Hold'em", emoji: '♠️', description: 'High-stakes private tables', minBet: 5000 },
  { id: 'blackjack' as GameType, name: 'Blackjack', emoji: '🃏', description: 'Dealer vs. VIP only', minBet: 2500 },
  { id: 'roulette' as GameType, name: 'Roulette', emoji: '🎰', description: 'European wheel, no limits', minBet: 1000 },
  { id: 'craps' as GameType, name: 'Craps', emoji: '🎲', description: 'Private craps pit', minBet: 1000 },
  { id: 'bingo' as GameType, name: 'Bingo', emoji: '🎱', description: 'VIP bingo lounge', minBet: 500 },
  { id: 'slots' as GameType, name: 'Slots', emoji: '💎', description: 'Diamond tier jackpots', minBet: 250 },
];

export function VipArea({ balance, onBack, onSelectGame }: VipAreaProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  if (!ageConfirmed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(180deg, #0d0018 0%, #05000d 100%)' }}
      >
        <div
          className="max-w-md w-full p-10 rounded-3xl text-center"
          style={{
            background: 'rgba(20,0,40,0.95)',
            border: '1px solid rgba(160,32,240,0.5)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.95), 0 0 60px rgba(160,32,240,0.15)',
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #6A0DAD, #A020F0)', boxShadow: '0 0 40px rgba(160,32,240,0.5)' }}
          >
            <span className="text-4xl">🔞</span>
          </div>
          <h2
            className="font-casino text-3xl font-bold mb-3"
            style={{ color: '#E040FB', textShadow: '0 0 20px rgba(224,64,251,0.5)' }}
          >
            ADULT V.I.P. AREA
          </h2>
          <p className="text-[#C0A0D0] mb-2 text-sm">
            This is an exclusive 18+ lounge. You must confirm your age to enter.
          </p>
          <p className="text-[#808080] mb-8 text-xs">
            Contains adult-themed content. Must be 18 or older to enter.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setAgeConfirmed(true)}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #6A0DAD, #A020F0)',
                boxShadow: '0 0 30px rgba(160,32,240,0.4)',
                color: 'white',
              }}
            >
              I AM 18 OR OLDER — ENTER
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 rounded-xl font-medium text-[#808080] hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0d0018 0%, #05000d 100%)' }}
    >
      <div
        className="sticky top-0 z-40 px-4 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(10,0,25,0.95)',
          borderBottom: '1px solid rgba(160,32,240,0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
          style={{ background: 'rgba(160,32,240,0.15)', border: '1px solid rgba(160,32,240,0.3)', color: '#E040FB' }}
        >
          ← Back to Lobby
        </button>
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6" style={{ color: '#E040FB' }} />
          <span className="font-casino text-xl font-bold" style={{ color: '#E040FB', textShadow: '0 0 15px rgba(224,64,251,0.5)' }}>
            ADULT V.I.P. LOUNGE
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: 'rgba(160,32,240,0.15)', border: '1px solid rgba(160,32,240,0.3)' }}
        >
          <span className="text-[#E040FB] font-bold">{balance.toLocaleString()} $Pc</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div
          className="rounded-3xl p-8 mb-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(106,13,173,0.3) 0%, rgba(30,0,60,0.6) 100%)',
            border: '1px solid rgba(160,32,240,0.4)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(160,32,240,0.1)',
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(224,64,251,1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6A0DAD, #A020F0)', boxShadow: '0 0 25px rgba(160,32,240,0.5)' }}
              >
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-casino text-3xl font-bold" style={{ color: '#E040FB' }}>Exclusive Private Lounge</h1>
                <p className="text-[#A080B0]">The most exclusive gaming experience — all your favorite games, elevated.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[
                { icon: '💃', label: 'Live Performers', desc: 'Live entertainment & private shows' },
                { icon: '🥂', label: 'Premium Service', desc: 'Dedicated hosts, no wait times' },
                { icon: '🎰', label: 'All Casino Games', desc: 'Full game suite, higher limits' },
              ].map(item => (
                <div
                  key={item.label}
                  className="p-4 rounded-2xl flex items-center gap-3"
                  style={{ background: 'rgba(160,32,240,0.1)', border: '1px solid rgba(160,32,240,0.2)' }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-bold text-white text-sm">{item.label}</div>
                    <div className="text-xs text-[#A080B0]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2
          className="font-casino text-2xl font-bold mb-6 flex items-center gap-3"
          style={{ color: '#E040FB', textShadow: '0 0 20px rgba(224,64,251,0.4)' }}
        >
          <Star className="w-6 h-6" />
          VIP GAMES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {vipGames.map((game) => (
            <div
              key={game.id}
              onMouseEnter={() => setHovered(game.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectGame(game.id)}
              className="cursor-pointer rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2"
              style={{
                background: hovered === game.id
                  ? 'linear-gradient(135deg, rgba(106,13,173,0.5), rgba(60,0,100,0.7))'
                  : 'rgba(20,0,40,0.7)',
                border: hovered === game.id
                  ? '1px solid rgba(224,64,251,0.6)'
                  : '1px solid rgba(160,32,240,0.25)',
                boxShadow: hovered === game.id
                  ? '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(160,32,240,0.2)'
                  : '0 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{game.emoji}</span>
                <div
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(160,32,240,0.2)', border: '1px solid rgba(160,32,240,0.4)', color: '#E040FB' }}
                >
                  VIP
                </div>
              </div>
              <h3 className="font-casino text-lg font-bold text-white mb-1">{game.name}</h3>
              <p className="text-sm text-[#A080B0] mb-4">{game.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#808080]">Min Bet</span>
                <span className="font-bold text-sm" style={{ color: '#E040FB' }}>{game.minBet.toLocaleString()} $Pc</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-3xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(30,0,60,0.8), rgba(10,0,25,0.9))',
            border: '1px solid rgba(160,32,240,0.3)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#E040FB]" />
            <span className="text-[#E040FB] font-bold">PRIVATE ENTERTAINMENT ROOMS</span>
          </div>
          <p className="text-[#A080B0] text-sm mb-6">
            Private dance rooms and entertainment suites coming soon. 
            Invitation-based access for elite members only.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm"
            style={{ background: 'rgba(160,32,240,0.15)', border: '1px solid rgba(160,32,240,0.3)', color: '#C080D0' }}
          >
            <Lock className="w-4 h-4" />
            Invitation Required — Contact V.I.P. Host
          </div>
        </div>
      </div>
    </div>
  );
}
