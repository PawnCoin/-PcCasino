import { useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Flame, Star } from 'lucide-react';

interface LeaderboardPlayer {
  rank: number;
  username: string;
  avatar: string;
  balance: number;
  totalWon: number;
  winStreak: number;
  favoriteGame: string;
}

const MOCK_LEADERS: LeaderboardPlayer[] = [
  { rank: 1, username: 'HighRoller_King', avatar: '👑', balance: 2450000, totalWon: 8900000, winStreak: 12, favoriteGame: 'Poker' },
  { rank: 2, username: 'VegasQueen', avatar: '💎', balance: 1890000, totalWon: 6200000, winStreak: 8, favoriteGame: 'Blackjack' },
  { rank: 3, username: 'LuckyAce', avatar: '🍀', balance: 1560000, totalWon: 4800000, winStreak: 15, favoriteGame: 'Spanish 21' },
  { rank: 4, username: 'CryptoWhale', avatar: '🐋', balance: 1230000, totalWon: 3500000, winStreak: 5, favoriteGame: 'Roulette' },
  { rank: 5, username: 'DiamondHands', avatar: '💎', balance: 980000, totalWon: 2800000, winStreak: 7, favoriteGame: 'Craps' },
  { rank: 6, username: 'NightOwl', avatar: '🦉', balance: 850000, totalWon: 2100000, winStreak: 4, favoriteGame: 'Poker' },
  { rank: 7, username: 'RoyalFlush', avatar: '♠️', balance: 720000, totalWon: 1800000, winStreak: 9, favoriteGame: 'Poker' },
  { rank: 8, username: 'JackpotHunter', avatar: '🎯', balance: 650000, totalWon: 1500000, winStreak: 3, favoriteGame: 'Slots' },
  { rank: 9, username: 'CardShark', avatar: '🦈', balance: 580000, totalWon: 1200000, winStreak: 6, favoriteGame: 'Blackjack' },
  { rank: 10, username: 'SpadesMaster', avatar: '♠️', balance: 490000, totalWon: 980000, winStreak: 11, favoriteGame: 'Spades' },
];

type LeaderboardTab = 'balance' | 'totalWon' | 'winStreak';

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('balance');

  const sortedLeaders = [...MOCK_LEADERS].sort((a, b) => {
    if (activeTab === 'balance') return b.balance - a.balance;
    if (activeTab === 'totalWon') return b.totalWon - a.totalWon;
    return b.winStreak - a.winStreak;
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-[#FFD700]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-[#C0C0C0]" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-[#CD7F32]" />;
    return <span className="text-[#808080] font-bold">#{rank}</span>;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const tabs: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: 'balance', label: 'Top Balance', icon: Trophy },
    { id: 'totalWon', label: 'Most Won', icon: TrendingUp },
    { id: 'winStreak', label: 'Win Streaks', icon: Flame },
  ];

  return (
    <section className="px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-casino text-3xl font-bold text-[#D4AF37] drop-shadow-[0_2px_10px_rgba(212,175,55,0.5)] mb-2">
            <Trophy className="w-8 h-8 inline-block mr-2" />
            LEADERBOARD
          </h2>
          <p className="text-[#C0C0C0]">Top players competing for glory and $Pc</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-black/50 text-[#C0C0C0] border border-[#5D4037]/50 hover:border-[#D4AF37]/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Leaderboard */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ 
            background: 'rgba(10,10,10,0.9)',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          {/* Top 3 Podium */}
          <div className="p-6 bg-gradient-to-b from-[#D4AF37]/10 to-transparent">
            <div className="flex justify-center items-end gap-4">
              {sortedLeaders.slice(0, 3).map((player, idx) => {
                const heights = ['h-24', 'h-32', 'h-20'];
                const positions = [2, 1, 3];
                const colors = ['from-[#C0C0C0] to-[#808080]', 'from-[#FFD700] to-[#B8860B]', 'from-[#CD7F32] to-[#8B4513]'];
                const actualIdx = positions[idx] - 1;
                
                return (
                  <div key={player.username} className="flex flex-col items-center">
                    <div className="text-4xl mb-2">{player.avatar}</div>
                    <div className="text-sm font-bold text-white mb-1">{player.username}</div>
                    <div className="text-xs text-[#D4AF37] mb-2">
                      {activeTab === 'balance' && formatNumber(player.balance) + ' $Pc'}
                      {activeTab === 'totalWon' && formatNumber(player.totalWon) + ' $Pc'}
                      {activeTab === 'winStreak' && player.winStreak + ' wins'}
                    </div>
                    <div 
                      className={`w-20 ${heights[actualIdx]} rounded-t-lg bg-gradient-to-t ${colors[actualIdx]} flex items-center justify-center`}
                      style={{ boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}
                    >
                      <span className="text-2xl font-bold text-black">{positions[idx]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-[#5D4037]/30">
            {sortedLeaders.slice(3).map((player) => (
              <div 
                key={player.username}
                className="p-4 flex items-center gap-4 hover:bg-[#D4AF37]/5 transition-colors"
              >
                <div className="w-10 flex justify-center">
                  {getRankIcon(player.rank)}
                </div>
                
                <div className="text-2xl">{player.avatar}</div>
                
                <div className="flex-1">
                  <div className="font-bold text-white">{player.username}</div>
                  <div className="text-xs text-[#808080]">Favorite: {player.favoriteGame}</div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-[#D4AF37]">
                    {activeTab === 'balance' && formatNumber(player.balance) + ' $Pc'}
                    {activeTab === 'totalWon' && formatNumber(player.totalWon) + ' $Pc'}
                    {activeTab === 'winStreak' && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {player.winStreak}
                      </span>
                    )}
                  </div>
                  {activeTab === 'winStreak' && (
                    <div className="text-xs text-[#808080]">{formatNumber(player.balance)} $Pc</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Rank */}
        <div 
          className="mt-6 p-4 rounded-xl flex items-center gap-4"
          style={{ 
            background: 'linear-gradient(90deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 0 30px rgba(212,175,55,0.1)'
          }}
        >
          <Star className="w-6 h-6 text-[#D4AF37]" />
          <div className="flex-1">
            <div className="font-bold text-white">Your Rank</div>
            <div className="text-sm text-[#C0C0C0]">#247 out of 12,847 players</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[#D4AF37]">5,240 $Pc</div>
            <div className="text-xs text-[#808080]">Keep playing to climb!</div>
          </div>
        </div>
      </div>
    </section>
  );
}
