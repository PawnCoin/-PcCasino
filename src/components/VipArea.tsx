import { useState, useEffect } from 'react';
import { Lock, Crown, ChevronRight, Star, Shield, History, Gift, TrendingDown } from 'lucide-react';
import type { GameType } from '@/types';
import { vipApi } from '@/lib/api';

interface VipAreaProps {
  balance: number;
  userId?: string | number;
  vipTier?: string;
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

const TIER_RATES: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 5, diamond: 10 };
const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

interface CashbackEntry {
  id: number;
  tier: string;
  rate: number;
  netLosses: number;
  amount: number;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
}

type VipTab = 'games' | 'cashback';

export function VipArea({ balance, userId, vipTier = 'bronze', onBack, onSelectGame }: VipAreaProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VipTab>('games');
  const [cashbackHistory, setCashbackHistory] = useState<CashbackEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (ageConfirmed && userId) {
      setHistoryLoading(true);
      vipApi.getCashbackHistory()
        .then(data => setCashbackHistory(data.history || []))
        .catch(() => setCashbackHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [ageConfirmed, userId]);

  const tierColor = TIER_COLORS[vipTier] || '#E040FB';
  const cashbackRate = TIER_RATES[vipTier] || 0;

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
        className="sticky top-0 z-40 px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2"
        style={{
          background: 'rgba(10,0,25,0.95)',
          borderBottom: '1px solid rgba(160,32,240,0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all hover:scale-105 min-h-[44px] text-sm sm:text-base"
          style={{ background: 'rgba(160,32,240,0.15)', border: '1px solid rgba(160,32,240,0.3)', color: '#E040FB' }}
        >
          ← <span className="hidden sm:inline">Back to Lobby</span><span className="sm:hidden">Back</span>
        </button>
        <div className="flex items-center gap-1 sm:gap-3">
          <Crown className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#E040FB' }} />
          <span className="font-casino text-sm sm:text-xl font-bold" style={{ color: '#E040FB', textShadow: '0 0 15px rgba(224,64,251,0.5)' }}>
            <span className="hidden sm:inline">ADULT V.I.P. LOUNGE</span>
            <span className="sm:hidden">V.I.P.</span>
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-full"
          style={{ background: 'rgba(160,32,240,0.15)', border: '1px solid rgba(160,32,240,0.3)' }}
        >
          <span className="text-[#E040FB] font-bold text-xs sm:text-base">{balance.toLocaleString()} $Pc</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        {/* VIP Status Banner */}
        <div
          className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-8 sm:mb-10 relative overflow-hidden"
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
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                    style={{ background: 'rgba(160,32,240,0.2)', border: `1px solid ${tierColor}40`, color: tierColor }}
                  >
                    {vipTier.toUpperCase()} TIER
                  </span>
                  {cashbackRate > 0 && (
                    <span className="text-xs text-[#A080B0]">
                      {cashbackRate}% weekly cashback on net losses
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
              {[
                { icon: '💃', label: 'Live Performers', desc: 'Live entertainment & private shows' },
                { icon: '🥂', label: 'Premium Service', desc: 'Dedicated hosts, no wait times' },
                { icon: '🎰', label: 'All Casino Games', desc: 'Full game suite, higher limits' },
              ].map(item => (
                <div
                  key={item.label}
                  className="p-3 sm:p-4 rounded-2xl flex items-center gap-3"
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

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'games' as VipTab, label: 'VIP Games', icon: Star },
            { id: 'cashback' as VipTab, label: 'Cashback History', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #6A0DAD, #A020F0)' : 'rgba(160,32,240,0.1)',
                  border: activeTab === tab.id ? '1px solid rgba(160,32,240,0.6)' : '1px solid rgba(160,32,240,0.2)',
                  color: activeTab === tab.id ? 'white' : '#A080B0',
                  boxShadow: activeTab === tab.id ? '0 0 20px rgba(160,32,240,0.3)' : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* GAMES TAB */}
        {activeTab === 'games' && (
          <>
            <h2
              className="font-casino text-2xl font-bold mb-6 flex items-center gap-3"
              style={{ color: '#E040FB', textShadow: '0 0 20px rgba(224,64,251,0.4)' }}
            >
              <Star className="w-6 h-6" />
              VIP GAMES
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10 sm:mb-12">
              {vipGames.map((game) => (
                <div
                  key={game.id}
                  onMouseEnter={() => setHovered(game.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectGame(game.id)}
                  className="cursor-pointer rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 active:scale-95"
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
          </>
        )}

        {/* CASHBACK HISTORY TAB */}
        {activeTab === 'cashback' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Gift className="w-6 h-6" style={{ color: '#E040FB' }} />
              <h2 className="font-casino text-2xl font-bold" style={{ color: '#E040FB', textShadow: '0 0 20px rgba(224,64,251,0.4)' }}>
                CASHBACK HISTORY
              </h2>
            </div>

            {/* Tier cashback info card */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ background: 'rgba(160,32,240,0.1)', border: '1px solid rgba(160,32,240,0.3)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm text-[#A080B0] mb-1">Your Current Tier</div>
                  <div className="font-casino text-xl font-bold capitalize" style={{ color: tierColor }}>
                    {vipTier} — {cashbackRate}% Weekly Cashback
                  </div>
                  <div className="text-xs text-[#808080] mt-1">
                    Cashback is calculated on net losses each week and paid every Monday at midnight UTC.
                  </div>
                </div>
                <div className="flex gap-4">
                  {Object.entries(TIER_RATES).filter(([t]) => t !== 'bronze').map(([t, r]) => (
                    <div
                      key={t}
                      className="text-center px-3 py-2 rounded-xl"
                      style={{
                        background: vipTier === t ? 'rgba(160,32,240,0.25)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${vipTier === t ? TIER_COLORS[t] + '60' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <div className="text-xs font-bold capitalize" style={{ color: TIER_COLORS[t] }}>{t}</div>
                      <div className="text-xs text-[#A080B0]">{r}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!userId && (
              <div
                className="text-center py-16 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Lock className="w-10 h-10 mx-auto mb-3 text-[#808080]" />
                <p className="text-[#808080]">Sign in to view your cashback history.</p>
              </div>
            )}

            {userId && historyLoading && (
              <div className="text-center py-16 text-[#808080]">Loading cashback history...</div>
            )}

            {userId && !historyLoading && cashbackHistory.length === 0 && (
              <div
                className="text-center py-16 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <TrendingDown className="w-10 h-10 mx-auto mb-3 text-[#808080]" />
                <p className="text-[#808080] font-medium mb-1">No cashback payments yet</p>
                <p className="text-xs text-[#606060]">
                  Cashback is paid weekly on Monday for eligible VIP tiers (Silver+).
                </p>
              </div>
            )}

            {userId && !historyLoading && cashbackHistory.length > 0 && (
              <div className="space-y-3">
                {cashbackHistory.map((entry) => {
                  const color = TIER_COLORS[entry.tier] || '#E040FB';
                  const weekStart = new Date(entry.weekStart).toLocaleDateString();
                  const weekEnd = new Date(entry.weekEnd).toLocaleDateString();
                  const paidAt = new Date(entry.createdAt).toLocaleDateString();
                  return (
                    <div
                      key={entry.id}
                      className="p-5 rounded-2xl flex flex-col md:flex-row md:items-center gap-4"
                      style={{
                        background: 'rgba(160,32,240,0.06)',
                        border: '1px solid rgba(160,32,240,0.2)',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(106,13,173,0.4), rgba(160,32,240,0.3))' }}
                      >
                        <Gift className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
                          >
                            {entry.tier.toUpperCase()}
                          </span>
                          <span className="text-xs text-[#808080]">{(entry.rate * 100).toFixed(0)}% cashback</span>
                        </div>
                        <div className="text-sm text-[#C0A0D0]">
                          Week of {weekStart} – {weekEnd}
                        </div>
                        <div className="text-xs text-[#606060] mt-0.5">
                          Paid on {paidAt} • Net losses: {entry.netLosses.toLocaleString()} $Pc
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg" style={{ color: '#4ade80' }}>
                          +{entry.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-[#808080]">$Pc credited</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
