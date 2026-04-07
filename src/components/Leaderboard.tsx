import { useState, useEffect, useRef } from 'react';
import { Trophy, TrendingUp, Flame, Crown, Medal, RefreshCw, Calendar, Clock } from 'lucide-react';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import { getSocket } from '@/lib/socket';
import { gameApi } from '@/lib/api';

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

type LeaderboardTab = 'balance' | 'totalWon' | 'winStreak';
type PeriodTab = 'daily' | 'weekly' | 'alltime';

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('totalWon');
  const [activePeriod, setActivePeriod] = useState<PeriodTab>('alltime');
  const [leaders, setLeaders] = useState<LeaderboardPlayer[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isLive, setIsLive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);

  const fetchLeaderboard = async (period: PeriodTab = activePeriod) => {
    setLoading(true);
    try {
      const data = await gameApi.getLeaderboard(period);
      if (data.leaderboard?.length) {
        setLeaders(data.leaderboard.map((p: any, i: number) => ({
          ...p,
          rank: i + 1,
          avatarIdx: nameToAvatarIdx(p.username),
        })));
        setLastUpdated(Date.now());
      } else {
        setLeaders([]);
      }
    } catch {
      try {
        const res = await fetch(`/api/leaderboard?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          if (data.leaderboard?.length) {
            setLeaders(data.leaderboard.map((p: any, i: number) => ({
              ...p,
              rank: i + 1,
              avatarIdx: nameToAvatarIdx(p.username),
            })));
            setLastUpdated(data.lastUpdated || Date.now());
          } else {
            setLeaders([]);
          }
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchLeaderboard('alltime');
    }

    const socket = getSocket();
    const onUpdate = ({ leaderboard }: any) => {
      if (leaderboard?.length && activePeriod === 'alltime') {
        setLeaders(leaderboard.map((p: any, i: number) => ({
          ...p,
          rank: i + 1,
          avatarIdx: nameToAvatarIdx(p.username),
        })));
        setLastUpdated(Date.now());
        setIsLive(true);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
      }
    };
    socket.on('leaderboard:update', onUpdate);

    const interval = setInterval(() => {
      fetchLeaderboard(activePeriod);
    }, 30000);

    return () => {
      socket.off('leaderboard:update', onUpdate);
      clearInterval(interval);
    };
  }, [activePeriod]);

  const handlePeriodChange = (period: PeriodTab) => {
    setActivePeriod(period);
    setIsLive(false);
    fetchLeaderboard(period);
  };

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

  const periods: { id: PeriodTab; label: string; icon: typeof Calendar }[] = [
    { id: 'daily', label: '24h', icon: Clock },
    { id: 'weekly', label: '7 Days', icon: Calendar },
    { id: 'alltime', label: 'All Time', icon: Trophy },
  ];

  return (
    <section className="px-3 sm:px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="font-casino text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 metallic-gold-text"
            style={{ textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', boxShadow: '0 0 25px rgba(212,175,55,0.5)' }}>
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-black" />
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
            <button onClick={() => fetchLeaderboard(activePeriod)} className="p-2 rounded-lg hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 mb-4">
          {periods.map(p => {
            const Icon = p.icon;
            return (
              <button key={p.id} onClick={() => handlePeriodChange(p.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[44px] flex-1 sm:flex-none justify-center sm:justify-start"
                style={{
                  background: activePeriod === p.id ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))' : 'rgba(255,255,255,0.03)',
                  color: activePeriod === p.id ? '#D4AF37' : '#6b7280',
                  border: activePeriod === p.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                <Icon className="w-3 h-3" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all min-h-[44px] flex-1 sm:flex-none justify-center"
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

        {sortedLeaders.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Trophy className="w-12 h-12 text-[#D4AF37]/30" />
            <div className="text-center">
              <div className="text-lg font-bold text-[#D4AF37]/60 mb-1">No players yet</div>
              <div className="text-sm text-gray-600">
                {activePeriod === 'daily' ? 'No wins in the last 24 hours.' : activePeriod === 'weekly' ? 'No wins in the last 7 days.' : 'Be the first to play and claim the top spot!'}
              </div>
            </div>
          </div>
        )}

        {loading && leaders.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-[#D4AF37]/40 animate-spin" />
          </div>
        )}

        {/* Podium - top 3 */}
        {sortedLeaders.length > 0 && <div className="flex justify-center items-end gap-4 mb-8">
          {[sortedLeaders[1], sortedLeaders[0], sortedLeaders[2]].map((player, podiumIdx) => {
            if (!player) return null;
            const isFirst = podiumIdx === 1;
            const heights = [80, 110, 60];
            return (
              <div key={player.id} className="flex flex-col items-center" style={{ width: 100 }}>
                <div className="mb-2">
                  <AvatarSprite avatar={ALL_AVATARS[player.avatarIdx % ALL_AVATARS.length]} size={isFirst ? 52 : 42} />
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
        </div>}

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {sortedLeaders.slice(3).map((player) => (
            <div key={player.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
              <div className="w-8 text-center flex-shrink-0">{getRankIcon(player.rank)}</div>
              <AvatarSprite avatar={ALL_AVATARS[player.avatarIdx % ALL_AVATARS.length]} size={34} />
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
            Last updated: {new Date(lastUpdated).toLocaleTimeString()} • Auto-refreshes every 30s
          </div>
        )}
      </div>
    </section>
  );
}
