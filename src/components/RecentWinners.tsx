import { useEffect, useState, useRef } from 'react';
import { Flame, TrendingUp, Zap } from 'lucide-react';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import { getSocket } from '@/lib/socket';

interface Winner {
  id: string;
  name: string;
  game: string;
  amount: number;
  multiplier?: number;
  timestamp?: number;
}

function nameToAvatarIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return Math.abs(h) % ALL_AVATARS.length;
}

const SEED_WINNERS: Winner[] = [
  { id: '1', name: 'CryptoKing', game: 'Slots - Mega Jackpot', amount: 45000, multiplier: 500, timestamp: Date.now() - 120000 },
  { id: '2', name: 'PokerFace', game: "Texas Hold'em", amount: 12500, multiplier: 25, timestamp: Date.now() - 300000 },
  { id: '3', name: 'DiceMaster', game: 'Craps', amount: 8900, multiplier: 18, timestamp: Date.now() - 720000 },
  { id: '4', name: 'Lucky7', game: 'Roulette', amount: 23400, multiplier: 35, timestamp: Date.now() - 1080000 },
  { id: '5', name: 'SpadesPro', game: 'Spades', amount: 5600, timestamp: Date.now() - 1500000 },
  { id: '6', name: 'BlackjackBJ', game: 'Blackjack', amount: 18900, multiplier: 3, timestamp: Date.now() - 1920000 },
];

function timeAgo(ts?: number): string {
  if (!ts) return 'Just now';
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)} min ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

export function RecentWinners() {
  const [winners, setWinners] = useState<Winner[]>(SEED_WINNERS);
  const [newWinnerId, setNewWinnerId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const initialized = useRef(false);

  const fetchWinners = async () => {
    try {
      const res = await fetch('/api/winners');
      if (res.ok) {
        const data = await res.json();
        if (data.winners?.length) setWinners(data.winners);
      }
    } catch { /* use seed */ }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchWinners();
    }
    const socket = getSocket();

    const onNew = (winner: any) => {
      setIsLive(true);
      setWinners(prev => [winner, ...prev].slice(0, 10));
      setNewWinnerId(winner.id);
      setTimeout(() => setNewWinnerId(null), 2000);
    };

    const onList = ({ winners: list }: any) => {
      if (list?.length) setWinners(list);
      setIsLive(true);
    };

    socket.on('winners:new', onNew);
    socket.on('winners:list', onList);
    return () => {
      socket.off('winners:new', onNew);
      socket.off('winners:list', onList);
    };
  }, []);

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const getAmountColor = (amount: number) => {
    if (amount >= 50000) return '#D4AF37';
    if (amount >= 20000) return '#4ade80';
    if (amount >= 5000) return '#60a5fa';
    return '#9ca3af';
  };

  return (
    <section className="px-4 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-casino text-3xl font-bold flex items-center gap-3 metallic-gold-text"
            style={{ textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', boxShadow: '0 0 25px rgba(212,175,55,0.5)' }}>
              <Flame className="w-7 h-7 text-black" />
            </div>
            RECENT WINNERS
          </h2>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
              <TrendingUp className="w-3 h-3" />
              Live Feed
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {winners.slice(0, 6).map((winner) => (
            <div key={winner.id}
              className="group p-4 rounded-2xl transition-all duration-500"
              style={{
                background: newWinnerId === winner.id
                  ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                  : 'rgba(255,255,255,0.03)',
                border: newWinnerId === winner.id
                  ? '1px solid rgba(212,175,55,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: newWinnerId === winner.id ? '0 0 30px rgba(212,175,55,0.2)' : 'none',
                transform: newWinnerId === winner.id ? 'scale(1.02)' : 'scale(1)',
              }}>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <AvatarSprite avatarIdx={nameToAvatarIdx(winner.name)} size={42} />
                  {newWinnerId === winner.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm truncate">{winner.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo(winner.timestamp)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{winner.game}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-bold" style={{ color: getAmountColor(winner.amount) }}>
                      +{formatAmount(winner.amount)} $Pc
                    </div>
                    {winner.multiplier && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                        {winner.multiplier}x
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrolling ticker */}
        <div className="mt-6 rounded-xl overflow-hidden py-2" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 px-4 mb-1">
            <span className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Flame className="w-3 h-3" /> RECENT ACTIVITY</span>
          </div>
          <div className="flex gap-6 px-4 overflow-x-auto no-scrollbar">
            {winners.map(w => (
              <div key={w.id} className="flex items-center gap-2 flex-shrink-0 py-1">
                <AvatarSprite avatarIdx={nameToAvatarIdx(w.name)} size={20} />
                <span className="text-xs text-gray-300">{w.name}</span>
                <span className="text-xs text-gray-500">won</span>
                <span className="text-xs font-bold" style={{ color: getAmountColor(w.amount) }}>+{formatAmount(w.amount)} $Pc</span>
                <span className="text-xs text-gray-500">on {w.game}</span>
                {w.multiplier && <span className="text-xs text-yellow-500">{w.multiplier}x</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
