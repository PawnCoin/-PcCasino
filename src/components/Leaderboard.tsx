import { useState, useEffect, useRef } from 'react';
import { Trophy, TrendingUp, Flame, Crown, Medal, RefreshCw, ChevronRight } from 'lucide-react';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import { getSocket } from '@/lib/socket';

interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  avatarIdx: number;
  balance: number;
  totalWon: number;
  winStreak: number;
  favoriteGame: string;
  gamesPlayed: number;
}

function nameToAvatarIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return Math.abs(h) % ALL_AVATARS.length;
}

const FALLBACK_LEADERS: LeaderboardPlayer[] = [
  { rank: 1, id: 'u1', username: 'HighRoller_King', avatarIdx: 0, balance: 2450000, totalWon: 8900000, winStreak: 12, favoriteGame: 'Poker', gamesPlayed: 342 },
  { rank: 2, id: 'u2', username: 'VegasQueen', avatarIdx: 5, balance: 1890000, totalWon: 6200000, winStreak: 8, favoriteGame: 'Blackjack', gamesPlayed: 289 },
  { rank: 3, id: 'u3', username: 'LuckyAce', avatarIdx: 10, balance: 1560000, totalWon: 4800000, winStreak: 15, favoriteGame: 'Bingo', gamesPlayed: 415 },
  { rank: 4, id: 'u4', username: 'CryptoWhale', avatarIdx: 15, balance: 1230000, totalWon: 3500000, winStreak: 5, favoriteGame: 'Roulette', gamesPlayed: 198 },
  { rank: 5, id: 'u5', username: 'DiamondHands', avatarIdx: 20, balance: 980000, totalWon: 2800000, winStreak: 7, favoriteGame: 'Craps', gamesPlayed: 267 },
  { rank: 6, id: 'u6', username: 'NightOwl', avatarIdx: 3, balance: 850000, totalWon: 2100000, winStreak: 4, favoriteGame: 'Poker', gamesPlayed: 312 },
  { rank: 7, id: 'u7', username: 'RoyalFlush', avatarIdx: 8, balance: 720000, totalWon: 1800000, winStreak: 9, favoriteGame: 'Poker', gamesPlayed: 188 },
  { rank: 8, id: 'u8', username: 'JackpotHunter', avatarIdx: 13, balance: 650000, totalWon: 1500000, winStreak: 3, favoriteGame: 'Slots', gamesPlayed: 502 },
  { rank: 9, id: 'u9', username: 'CardShark', avatarIdx: 18, balance: 580000, totalWon: 1200000, winStreak: 6, favoriteGame: 'Blackjack', gamesPlayed: 224 },
  { rank: 10, id: 'u10', username: 'SpadesMaster', avatarIdx: 23, balance: 490000, totalWon: 980000, winStreak: 11, favoriteGame: 'Spades', gamesPlayed: 165 },
];

type LeaderboardTab = 'balance' | 'totalWon' | 'winStreak';

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('totalWon');
  const [leaders, setLeaders] = useState<LeaderboardPlayer[]>(FALLBACK_LEADERS);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isLive, setIsLive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const loaded = useRef(false);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard?.length) {
          setLeaders(data.leaderboard.map((p: any, i: number) => ({
            ...p,
            rank: i + 1,
            avatarIdx: nameToAvatarIdx(p.username),
          })));
          setLastUpdated(data.lastUpdated || Date.now());
        }
      }
    } catch { /* use fallback */ }
  };

  useEffect(() => {
    if (!loaded.current) { loaded.current = true; fetchLeaderboard(); }
    const socket = getSocket();
    const onUpdate = ({ leaderboard }: any) => {
      if (leaderboard?.length) {
        setLeaders(leaderboard.map((p: any, i: number) => ({ ...p, rank: i + 1, avatarIdx: nameToAvatarIdx(p.username) })));
        setLastUpdated(Date.now());
        setIsLive(true);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
      }
    };
    socket.on('leaderboard:update', onUpdate);
    return () => { socket.off('leaderboard:update', onUpdate); };
  }, []);

  const sortedLeaders = [...leaders].sort((a, b) => {
    if (activeTab === 'balance') return b.balance - a.balance;
    if (activeTab === 'totalWon') return b.totalWon - a.totalWon;
    return b.winStreak - a.winStreak;
  }).map((p, i) => ({ ...p, rank: i + 1 }));

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-[#FFD700]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-[#C0C0C0]" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-[#CD7F32]" />;
    return <span className="text-[#808080] font-bold text-sm">#{rank}</span>;
  };

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const tabs: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: 'totalWon', label: 'Most Won', icon: TrendingUp },
    { id: 'balance', label: 'Top Balance', icon: Trophy },
    { id: 'winStreak', label: 'Win Streaks', icon: Flame },
  ];

  return (
    <section className="px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-casino text-3xl font-bold flex items-center gap-3 metallic-gold-text"
            style={{ textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', boxShadow: '0 0 25px rgba(212,175,55,0.5)' }}>
              <Trophy className="w-7 h-7 text-black" />
            </div>
            LEADERBOARD
          </h2>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all ${pulse ? 'scale-110' : ''}`}
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            <button onClick={fetchLeaderboard} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))' : 'rgba(255,255,255,0.04)',
                  color: activeTab === tab.id ? '#D4AF37' : '#9ca3af',
                  border: activeTab === tab.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Podium - top 3 */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {[sortedLeaders[1], sortedLeaders[0], sortedLeaders[2]].map((player, podiumIdx) => {
            if (!player) return null;
            const isFirst = podiumIdx === 1;
            const heights = [80, 110, 60];
            return (
              <div key={player.id} className="flex flex-col items-center" style={{ width: 100 }}>
                <div className="mb-2">
                  <AvatarSprite avatarIdx={player.avatarIdx} size={isFirst ? 52 : 42} />
                </div>
                <div className="text-xs font-bold text-center truncate w-full text-white mb-1">{player.username}</div>
                <div className="text-xs mb-1" style={{ color: activeTab === 'totalWon' ? '#D4AF37' : activeTab === 'balance' ? '#60a5fa' : '#f97316' }}>
                  {activeTab === 'totalWon' ? formatNum(player.totalWon) : activeTab === 'balance' ? formatNum(player.balance) : `${player.winStreak} 🔥`} $Pc
                </div>
                <div className="w-full rounded-t-xl flex items-center justify-center font-bold"
                  style={{
                    height: heights[podiumIdx],
                    background: isFirst ? 'linear-gradient(180deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))' : 'rgba(255,255,255,0.05)',
                    border: isFirst ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: isFirst ? '#D4AF37' : '#9ca3af',
                    fontSize: isFirst ? 22 : 18,
                  }}>
                  {isFirst ? '🥇' : podiumIdx === 0 ? '🥈' : '🥉'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {sortedLeaders.slice(3).map((player) => (
            <div key={player.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
              <div className="w-8 text-center flex-shrink-0">{getRankIcon(player.rank)}</div>
              <AvatarSprite avatarIdx={player.avatarIdx} size={34} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{player.username}</div>
                <div className="text-xs text-gray-400">{player.favoriteGame} • {player.gamesPlayed} games</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm" style={{ color: '#D4AF37' }}>
                  {activeTab === 'totalWon' ? formatNum(player.totalWon)
                    : activeTab === 'balance' ? formatNum(player.balance)
                    : `${player.winStreak} streak`} $Pc
                </div>
                <div className="text-xs text-gray-500">
                  {activeTab === 'totalWon' ? `Balance: ${formatNum(player.balance)}` : `Won: ${formatNum(player.totalWon)}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {lastUpdated && (
          <div className="text-center text-xs text-gray-600 mt-3">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>
    </section>
  );
}
