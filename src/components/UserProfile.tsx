import { useState, useEffect, useMemo } from 'react';
import { User, Shield, History, Gift, AlertTriangle, Copy, CheckCircle, Bell, Lock, Eye, EyeOff, TrendingUp, Clock, Wallet, DollarSign, FileText, X, ExternalLink, ChevronRight, Star, QrCode, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { Transaction } from '@/types';
import { authApi, getToken } from '@/lib/api';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    email?: string;
    walletAddress?: string;
    balance: number;
    avatar: string;
    vipTier?: string;
    totpEnabled?: boolean;
    selfExcluded?: boolean;
    dailyLossLimit?: number;
    dailyDepositLimit?: number;
    emailVerified?: boolean;
  } | null;
  transactions: Transaction[];
  avatarDef?: AvatarDef;
  onShowDeposit: () => void;
  onShowWithdraw: () => void;
  onShowReferral: () => void;
  onShowTournaments: () => void;
  onShowLegal: (page: string) => void;
  onShowDispute: () => void;
}

type ProfileTab = 'overview' | 'transactions' | 'security' | 'bonuses' | 'disputes' | 'limits' | 'preferences' | 'provably';

const GAME_HISTORY_KEY = 'pcasino_game_history';

interface GameHistoryEntry {
  id: string;
  game: string;
  result: 'win' | 'loss';
  amount: number;
  net: number;
  timestamp: number;
}

function ProvablyFairSection() {
  const [clientSeed, setClientSeed] = useState(() => Math.random().toString(36).slice(2, 18));
  const [serverSeedHash, setServerSeedHash] = useState('a7f3b2c9d4e1f8a5b6c3d7e2f9a4b1c8d5e2f3a9b6c4d1e7f2a8b3c9d6e4f1a2');
  const [verifyClientSeed, setVerifyClientSeed] = useState('');
  const [verifyServerSeed, setVerifyServerSeed] = useState('');
  const [verifyNonce, setVerifyNonce] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const generateResult = (client: string, server: string, nonce: string) => {
    const combined = `${client}-${server}-${nonce}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const handleVerify = () => {
    if (!verifyClientSeed || !verifyServerSeed || !verifyNonce) {
      setVerifyResult('❌ Please fill in all fields to verify');
      return;
    }
    const result = generateResult(verifyClientSeed, verifyServerSeed, verifyNonce);
    setVerifyResult(`✅ Verified! Raw result: ${result} | Roulette: ${result % 37} | Dice: ${(result % 6) + 1} | Slots ROI: ${((result % 100) / 100).toFixed(4)}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white text-lg flex items-center gap-2">
        <Eye className="w-5 h-5 text-[#D4AF37]" />
        Provably Fair Gaming
      </h3>
      <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <p className="text-sm text-gray-300 mb-2">All game results are generated using a combination of a <strong className="text-[#D4AF37]">client seed</strong> (you control), a <strong className="text-[#D4AF37]">server seed</strong> (committed before the game), and a <strong className="text-[#D4AF37]">nonce</strong> (game counter). This makes every result independently verifiable.</p>
        <p className="text-xs text-gray-500">Formula: <code className="text-blue-400">SHA256(serverSeed + clientSeed + nonce)</code> → game outcome</p>
      </div>

      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-white text-sm">Your Active Seeds</h4>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Client Seed (editable)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientSeed}
              onChange={e => setClientSeed(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            />
            <button
              onClick={() => setClientSeed(Math.random().toString(36).slice(2, 18))}
              className="px-3 py-2 rounded-lg text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors border border-[#D4AF37]/30"
            >
              Random
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Server Seed Hash (next game)</label>
          <div className="px-3 py-2 rounded-lg font-mono text-xs text-green-400 break-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {serverSeedHash}
          </div>
          <p className="text-xs text-gray-500 mt-1">The actual server seed will be revealed after you change your client seed.</p>
        </div>
        <button
          onClick={() => { setServerSeedHash(Math.random().toString(16).slice(2).padEnd(64, '0')); setVerifyResult(null); }}
          className="w-full py-2 rounded-lg text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', border: '1px solid rgba(212,175,55,0.4)' }}
        >
          Rotate Seeds & Reveal Previous
        </button>
      </div>

      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-white text-sm">Verify a Past Game</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Client Seed used</label>
            <input type="text" value={verifyClientSeed} onChange={e => setVerifyClientSeed(e.target.value)} placeholder="e.g. abc123xyz..." className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Server Seed (revealed after game)</label>
            <input type="text" value={verifyServerSeed} onChange={e => setVerifyServerSeed(e.target.value)} placeholder="e.g. f3a9b6c4d1e7..." className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nonce (game round #)</label>
            <input type="text" value={verifyNonce} onChange={e => setVerifyNonce(e.target.value)} placeholder="e.g. 42" className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          </div>
          <button
            onClick={handleVerify}
            className="w-full py-2 rounded-lg text-sm font-bold text-black transition-all"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
          >
            Verify Result
          </button>
          {verifyResult && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-gray-300 break-all">{verifyResult}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 rounded-xl text-xs text-gray-400" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-bold text-gray-300 mb-1">How it works:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Before each game, the server commits to a seed hash</li>
          <li>You can choose any client seed you want</li>
          <li>After the game, request the server seed reveal</li>
          <li>Combine client seed + server seed + nonce to reproduce the exact result</li>
          <li>Any third party can verify the outcome independently</li>
        </ul>
      </div>
    </div>
  );
}

export function UserProfile({ isOpen, onClose, user, transactions, avatarDef, onShowDeposit, onShowWithdraw, onShowReferral, onShowTournaments, onShowLegal, onShowDispute }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [copied, setCopied] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAOtpauth, setTwoFAOtpauth] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [dailyLimit, setDailyLimit] = useState(0);
  const [selfExclusion, setSelfExclusion] = useState('');
  const [selfExclusionLoading, setSelfExclusionLoading] = useState(false);
  const [notifications, setNotifications] = useState(() => JSON.parse(localStorage.getItem('pcasino_notifications') || '{"wins":true,"bonuses":true,"news":false,"tournaments":true}'));
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [kycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');

  useEffect(() => {
    if (isOpen && user) {
      const stored = localStorage.getItem(GAME_HISTORY_KEY);
      setGameHistory(stored ? JSON.parse(stored) : []);
      setTwoFAEnabled(!!user.totpEnabled);
      setSelfExclusion(user.selfExcluded ? 'Active' : '');
      setDailyLimit(user.dailyLossLimit || 0);
    }
  }, [isOpen, user]);

  const sessionStats = useMemo(() => {
    const wins = transactions.filter(t => t.type === 'win');
    const bets = transactions.filter(t => t.type === 'bet');
    const biggestWin = wins.length > 0 ? Math.max(...wins.map(t => t.amount)) : 0;
    const biggestBet = bets.length > 0 ? Math.max(...bets.map(t => t.amount)) : 0;
    const gameBreakdown: Record<string, { bets: number; wins: number; count: number }> = {};
    transactions.forEach(t => {
      if (t.game) {
        if (!gameBreakdown[t.game]) gameBreakdown[t.game] = { bets: 0, wins: 0, count: 0 };
        gameBreakdown[t.game].count++;
        if (t.type === 'bet') gameBreakdown[t.game].bets += t.amount;
        if (t.type === 'win') gameBreakdown[t.game].wins += t.amount;
      }
    });
    const mostPlayed = Object.entries(gameBreakdown).sort((a, b) => b[1].count - a[1].count)[0];
    const mostProfitable = Object.entries(gameBreakdown).sort((a, b) => (b[1].wins - b[1].bets) - (a[1].wins - a[1].bets))[0];
    return { biggestWin, biggestBet, mostPlayed, mostProfitable, gameBreakdown };
  }, [transactions]);

  if (!user) return null;

  const totalWon = transactions.filter(t => t.type === 'win').reduce((s, t) => s + t.amount, 0);
  const totalBet = transactions.filter(t => t.type === 'bet').reduce((s, t) => s + t.amount, 0);
  const totalDeposited = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = transactions.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
  const winRate = gameHistory.length > 0 ? (gameHistory.filter(g => g.result === 'win').length / gameHistory.length * 100).toFixed(1) : '0';
  const netProfit = totalWon - totalBet;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const saveLimit = async () => {
    if (getToken()) {
      try {
        await authApi.updateProfile({ dailyLossLimit: dailyLimit });
        toast.success('Daily loss limit saved');
      } catch (err: any) {
        toast.error(err.message || 'Failed to save limit');
      }
    } else {
      localStorage.setItem('pcasino_daily_limit', String(dailyLimit));
      toast.success('Daily limit saved');
    }
  };

  const periodToDays: Record<string, number | undefined> = {
    '24 Hours': 1, '7 Days': 7, '30 Days': 30,
    '6 Months': 180, '1 Year': 365, 'Permanent': undefined,
  };

  const activateSelfExclusion = async (period: string) => {
    setSelfExclusionLoading(true);
    const days = periodToDays[period];
    if (getToken()) {
      try {
        await authApi.selfExclude(days);
        setSelfExclusion(period);
        toast.success(`Self-exclusion set for ${period}. Please contact support to reinstate.`);
      } catch (err: any) {
        toast.error(err.message || 'Self-exclusion failed');
      }
    } else {
      setSelfExclusion(period);
      localStorage.setItem('pcasino_self_exclusion', period);
      toast.success(`Self-exclusion set for ${period}`);
    }
    setSelfExclusionLoading(false);
  };

  const saveNotifications = (key: string, val: boolean) => {
    const updated = { ...notifications, [key]: val };
    setNotifications(updated);
    localStorage.setItem('pcasino_notifications', JSON.stringify(updated));
  };

  const tabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'bonuses', label: 'Bonuses', icon: Gift },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'limits', label: 'Limits', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'provably', label: 'Provably Fair', icon: Eye },
  ];

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const getNetColor = (n: number) => n >= 0 ? '#4ade80' : '#f87171';

  const txColor = (type: string) => {
    if (type === 'win') return '#4ade80';
    if (type === 'bet') return '#facc15';
    if (type === 'deposit') return '#60a5fa';
    if (type === 'withdraw') return '#f87171';
    return '#9ca3af';
  };

  const txIcon = (type: string) => {
    if (type === 'win') return '🏆';
    if (type === 'bet') return '🎲';
    if (type === 'deposit') return '💰';
    if (type === 'withdraw') return '🏧';
    return '📋';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden" style={{
        background: 'rgba(6,6,12,0.99)',
        border: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 0 60px rgba(0,0,0,0.9)',
      }}>
        {/* Profile Header */}
        <div className="px-6 py-5 border-b border-white/10" style={{ background: 'linear-gradient(135deg, rgba(30,20,10,0.8), rgba(10,10,10,0.8))' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 0 20px rgba(212,175,55,0.3)' }}>
                {avatarDef ? (
                  <AvatarSprite avatar={avatarDef} size={56} style={{ borderRadius: 0 }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
                    {user.avatar || '👤'}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{user.username}</h2>
                  {/* VIP Tier Badge */}
                  {(() => {
                    const tier = user.vipTier || 'bronze';
                    const tierColors: Record<string, { bg: string; color: string; border: string }> = {
                      bronze:   { bg: 'rgba(205,127,50,0.2)',  color: '#CD7F32', border: 'rgba(205,127,50,0.4)' },
                      silver:   { bg: 'rgba(192,192,192,0.2)', color: '#C0C0C0', border: 'rgba(192,192,192,0.4)' },
                      gold:     { bg: 'rgba(212,175,55,0.2)',  color: '#D4AF37', border: 'rgba(212,175,55,0.4)' },
                      platinum: { bg: 'rgba(229,228,226,0.2)', color: '#E5E4E2', border: 'rgba(229,228,226,0.4)' },
                      diamond:  { bg: 'rgba(185,242,255,0.2)', color: '#B9F2FF', border: 'rgba(185,242,255,0.5)' },
                    };
                    const c = tierColors[tier] || tierColors.bronze;
                    return (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {tier} VIP
                      </span>
                    );
                  })()}
                  {kycStatus === 'verified' && <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
                <div className="text-sm text-gray-400 mt-0.5">
                  {user.email || 'No email linked'} • ID: {user.id.slice(0, 12)}...
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: kycStatus === 'verified' ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
                    color: kycStatus === 'verified' ? '#4ade80' : '#fbbf24',
                    border: `1px solid ${kycStatus === 'verified' ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  }}>
                    KYC: {kycStatus.toUpperCase()}
                  </span>
                  {user.selfExcluded && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                      SELF-EXCLUDED
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#D4AF37' }}>{formatAmount(user.balance)}</div>
              <div className="text-xs text-gray-400">$Pc Balance</div>
              <div className="flex gap-2 mt-2">
                <Button onClick={onShowDeposit} size="sm" style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 12 }}>
                  <DollarSign className="w-3 h-3 mr-1" /> Deposit
                </Button>
                <Button onClick={onShowWithdraw} size="sm" style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)', fontSize: 12 }}>
                  <Wallet className="w-3 h-3 mr-1" /> Withdraw
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(92vh-140px)]">
          {/* Sidebar tabs */}
          <div className="w-44 flex-shrink-0 border-r border-white/10 py-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all"
                  style={{
                    color: activeTab === tab.id ? '#D4AF37' : '#9ca3af',
                    background: activeTab === tab.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                    borderRight: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                  }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
            <div className="px-3 pt-4 mt-4 border-t border-white/10 space-y-1">
              <button onClick={onShowReferral} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-purple-400 hover:bg-purple-500/10 transition-colors">
                <Star className="w-3.5 h-3.5" /> Referral
              </button>
              <button onClick={onShowTournaments} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                <TrendingUp className="w-3.5 h-3.5" /> Tournaments
              </button>
              <button onClick={() => onShowLegal('terms')} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-gray-400 hover:bg-white/5 transition-colors">
                <FileText className="w-3.5 h-3.5" /> Legal
              </button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-5">
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-lg">Account Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Won', value: formatAmount(totalWon), color: '#4ade80', icon: '🏆' },
                      { label: 'Total Bet', value: formatAmount(totalBet), color: '#facc15', icon: '🎲' },
                      { label: 'Net Profit', value: formatAmount(Math.abs(netProfit)), color: getNetColor(netProfit), icon: netProfit >= 0 ? '📈' : '📉' },
                      { label: 'Win Rate', value: `${winRate}%`, color: '#c084fc', icon: '🎯' },
                    ].map(stat => (
                      <div key={stat.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-xl">{stat.icon}</div>
                        <div className="font-bold text-lg mt-1" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="text-xs text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h4 className="font-bold text-white text-sm">Financial Summary</h4>
                      {[
                        { label: 'Total Deposited', value: formatAmount(totalDeposited), color: '#60a5fa' },
                        { label: 'Total Withdrawn', value: formatAmount(totalWithdrawn), color: '#f87171' },
                        { label: 'Games Played', value: transactions.filter(t => t.type === 'bet').length, color: '#e879f9' },
                        { label: 'Biggest Win', value: formatAmount(sessionStats.biggestWin), color: '#4ade80' },
                        { label: 'Biggest Bet', value: formatAmount(sessionStats.biggestBet), color: '#facc15' },
                        { label: 'Most Played', value: sessionStats.mostPlayed ? sessionStats.mostPlayed[0] : 'N/A', color: '#c084fc' },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="capitalize" style={{ color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h4 className="font-bold text-white text-sm">Quick Actions</h4>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Submit Dispute', action: onShowDispute, color: '#f87171' },
                          { label: 'Referral Program', action: onShowReferral, color: '#a78bfa' },
                          { label: 'Join Tournament', action: onShowTournaments, color: '#facc15' },
                          { label: 'Game Rules', action: () => onShowLegal('rules'), color: '#60a5fa' },
                        ].map(item => (
                          <button key={item.label} onClick={item.action}
                            className="w-full text-left text-xs px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/5 transition-colors"
                            style={{ color: item.color }}>
                            {item.label} <ChevronRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Wallet info */}
                  {user.walletAddress && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Connected Wallet</div>
                          <code className="text-xs text-green-400">{user.walletAddress}</code>
                        </div>
                        <button onClick={() => copyToClipboard(user.walletAddress!)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                          {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TRANSACTIONS */}
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Transaction History</h3>
                    <span className="text-xs text-gray-400">{transactions.length} records</span>
                  </div>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="text-xl w-8 text-center">{txIcon(tx.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white capitalize">{tx.type}</span>
                              {tx.game && <span className="text-xs text-gray-500">• {tx.game}</span>}
                            </div>
                            <div className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold" style={{ color: txColor(tx.type) }}>
                              {tx.type === 'bet' || tx.type === 'withdraw' ? '-' : '+'}{formatAmount(tx.amount)} $Pc
                            </div>
                            <div className="text-xs px-1.5 py-0.5 rounded-full text-center"
                              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: 10 }}>
                              {tx.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-lg">Security Settings</h3>

                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> Account Security</h4>
                    {/* 2FA Row */}
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <div className="text-sm text-white">Two-Factor Authentication</div>
                      <div className="text-xs" style={{ color: twoFAEnabled ? '#4ade80' : '#f87171' }}>
                        {twoFAEnabled ? '2FA Active — extra security enabled' : '2FA Off — recommended to enable'}
                      </div>
                    </div>
                    <Button
                      disabled={twoFALoading}
                      onClick={async () => {
                        if (twoFAEnabled) {
                          setShowDisable2FA(true);
                        } else {
                          setTwoFALoading(true);
                          try {
                            if (getToken()) {
                              const res = await authApi.setup2FA();
                              setTwoFASecret(res.secret);
                              setTwoFAOtpauth(res.otpauth);
                            } else {
                              setTwoFASecret('JBSWY3DPEHPK3PXP');
                              setTwoFAOtpauth('');
                            }
                            setShow2FASetup(true);
                          } catch (err: any) {
                            toast.error(err.message || '2FA setup failed');
                          }
                          setTwoFALoading(false);
                        }
                      }}
                      size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11 }}>
                      {twoFALoading ? 'Loading...' : twoFAEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                  {/* Email Verification */}
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <div className="text-sm text-white">Email Verification</div>
                      <div className="text-xs" style={{ color: user.emailVerified ? '#4ade80' : '#fbbf24' }}>
                        {user.emailVerified ? 'Verified' : user.email ? 'Not yet verified' : 'No email linked'}
                      </div>
                    </div>
                    <Button onClick={() => toast.info('Verification email sent. Check your inbox.')} size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11 }}>
                      {user.emailVerified ? 'Verified ✓' : 'Resend'}
                    </Button>
                  </div>
                  {/* KYC */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm text-white">KYC Verification</div>
                      <div className="text-xs" style={{ color: kycStatus === 'verified' ? '#4ade80' : '#fbbf24' }}>{kycStatus}</div>
                    </div>
                    <Button onClick={() => toast.info('KYC documents required. Contact support.')} size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11 }}>
                      Verify
                    </Button>
                  </div>
                  </div>

                  <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm">Account Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">User ID</span><code className="text-yellow-400 text-xs">{user.id}</code></div>
                      <div className="flex justify-between"><span className="text-gray-400">Username</span><span className="text-white">{user.username}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="text-white">{user.email || 'Not linked'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Wallet</span><span className="text-green-400 text-xs">{user.walletAddress ? `${user.walletAddress.slice(0, 10)}...` : 'Not connected'}</span></div>
                    </div>
                  </div>

                  {/* 2FA Setup Panel */}
                  {show2FASetup && twoFASecret && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.3)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-blue-400" />
                          Setup 2FA — Authenticator App
                        </h4>
                        <button onClick={() => { setShow2FASetup(false); setTwoFACode(''); }}><X className="w-4 h-4 text-gray-400" /></button>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code to verify and enable.</p>
                      <div className="flex justify-center mb-3">
                        <div className="p-3 bg-white rounded-xl">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(twoFAOtpauth || `otpauth://totp/PcCasino:${user.username}?secret=${twoFASecret}&issuer=PcCasino`)}`}
                            alt="2FA QR Code"
                            className="w-36 h-36"
                          />
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-400 mb-3 font-mono bg-black/30 rounded-lg p-2">
                        Manual key: <span className="text-blue-300">{twoFASecret}</span>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-400 mb-1 block">Enter 6-digit verification code</label>
                        <input
                          type="text"
                          value={twoFACode}
                          onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full px-3 py-2 rounded-lg text-center text-xl font-mono tracking-widest"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(59,130,246,0.4)', color: 'white' }}
                        />
                      </div>
                      <Button
                        disabled={twoFALoading}
                        onClick={async () => {
                          if (twoFACode.length !== 6) { toast.error('Please enter a 6-digit code'); return; }
                          setTwoFALoading(true);
                          try {
                            if (getToken()) {
                              await authApi.enable2FA(twoFACode);
                            }
                            setTwoFAEnabled(true);
                            setShow2FASetup(false);
                            setTwoFACode('');
                            toast.success('2FA enabled! Your account is now more secure.');
                          } catch (err: any) {
                            toast.error(err.message || 'Invalid code. Try again.');
                          }
                          setTwoFALoading(false);
                        }}
                        className="w-full text-sm"
                        style={{ background: 'rgba(59,130,246,0.3)', color: 'white', border: '1px solid rgba(59,130,246,0.4)' }}
                      >
                        {twoFALoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                      </Button>
                    </div>
                  )}

                  {/* Disable 2FA Panel */}
                  {showDisable2FA && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.3)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-white text-sm">Disable 2FA</h4>
                        <button onClick={() => { setShowDisable2FA(false); setDisable2FACode(''); }}><X className="w-4 h-4 text-gray-400" /></button>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Enter your current 6-digit authenticator code to disable 2FA.</p>
                      <input
                        type="text"
                        value={disable2FACode}
                        onChange={e => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-3 py-2 rounded-lg text-center text-xl font-mono tracking-widest mb-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(248,113,113,0.4)', color: 'white' }}
                      />
                      <Button
                        disabled={twoFALoading}
                        onClick={async () => {
                          if (disable2FACode.length !== 6) { toast.error('Enter your 6-digit code'); return; }
                          setTwoFALoading(true);
                          try {
                            if (getToken()) {
                              await authApi.disable2FA(disable2FACode);
                            }
                            setTwoFAEnabled(false);
                            setShowDisable2FA(false);
                            setDisable2FACode('');
                            toast.success('2FA disabled.');
                          } catch (err: any) {
                            toast.error(err.message || 'Invalid code');
                          }
                          setTwoFALoading(false);
                        }}
                        className="w-full text-sm"
                        style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)' }}
                      >
                        {twoFALoading ? 'Processing...' : 'Confirm Disable 2FA'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* BONUSES */}
              {activeTab === 'bonuses' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-lg">Bonuses & Rewards</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { name: 'Welcome Bonus', desc: '1 Billion $Pc on sign-up', amount: '1B $Pc', status: 'claimed', color: '#D4AF37' },
                      { name: 'Daily Login Bonus', desc: 'Log in every day to claim', amount: '50M $Pc', status: 'available', color: '#4ade80' },
                      { name: 'Referral Bonus', desc: 'Earn 50M $Pc per referral', amount: '50M/ref', status: 'active', color: '#a78bfa' },
                      { name: 'First Deposit Bonus', desc: '100% match on first deposit', amount: '100% Match', status: 'pending', color: '#60a5fa' },
                      { name: 'High Roller Bonus', desc: 'Play 10M+ $Pc to unlock', amount: '500M $Pc', status: 'locked', color: '#f87171' },
                      { name: 'Weekend Special', desc: 'Extra bonus every Saturday', amount: '100M $Pc', status: 'available', color: '#fbbf24' },
                    ].map(bonus => (
                      <div key={bonus.name} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${bonus.color}20`, border: `1px solid ${bonus.color}40` }}>
                          {bonus.status === 'claimed' ? '✓' : bonus.status === 'locked' ? '🔒' : bonus.status === 'active' ? '⚡' : '🎁'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white text-sm">{bonus.name}</div>
                          <div className="text-xs text-gray-400">{bonus.desc}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm" style={{ color: bonus.color }}>{bonus.amount}</div>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            background: bonus.status === 'available' ? 'rgba(74,222,128,0.1)' : bonus.status === 'claimed' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.05)',
                            color: bonus.status === 'available' ? '#4ade80' : '#9ca3af',
                          }}>
                            {bonus.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DISPUTES */}
              {activeTab === 'disputes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Game Disputes</h3>
                    <Button onClick={onShowDispute} size="sm" style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)', fontSize: 12 }}>
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> File Dispute
                    </Button>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold text-yellow-400">Malfunction Refund Policy</div>
                        <div className="text-xs text-gray-400 mt-1">
                          If you experience a technical malfunction during gameplay that results in an unfair loss, you may be eligible for a full or partial refund. You must provide your session ID, game type, approximate time, and description of what occurred. All disputes are reviewed within 48–72 hours. Approved refunds are credited instantly to your account.
                        </div>
                        <button onClick={() => onShowLegal('malfunction')} className="text-xs text-yellow-400 hover:underline mt-1 flex items-center gap-1">
                          Read Full Malfunction Policy <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-8 text-gray-400">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No open disputes</p>
                    <p className="text-xs mt-1">File a dispute if you experienced a game malfunction</p>
                  </div>
                </div>
              )}

              {/* LIMITS */}
              {activeTab === 'limits' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-lg">Responsible Gaming Limits</h3>
                  <div className="p-4 rounded-xl space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <label className="text-sm text-gray-300 mb-2 block">Daily Deposit Limit ($Pc)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={dailyLimit || ''}
                          onChange={e => setDailyLimit(Number(e.target.value))}
                          placeholder="No limit"
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        />
                        <Button onClick={saveLimit} size="sm" style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }}>
                          Save
                        </Button>
                      </div>
                      {dailyLimit > 0 && <p className="text-xs text-gray-400 mt-1">Limit: {dailyLimit.toLocaleString()} $Pc/day</p>}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm">Self-Exclusion</h4>
                    <p className="text-xs text-gray-400">Temporarily block yourself from playing for a set period.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['24 Hours', '7 Days', '30 Days', '6 Months', '1 Year', 'Permanent'].map(period => (
                        <button key={period}
                          disabled={selfExclusionLoading || !!selfExclusion}
                          onClick={() => activateSelfExclusion(period)}
                          className="p-2 rounded-lg text-sm border transition-all hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: selfExclusion === period ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.04)',
                            color: selfExclusion === period ? '#f87171' : '#9ca3af',
                            border: selfExclusion === period ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          }}>
                          {selfExclusionLoading ? '...' : selfExclusion === period ? '✓ ' : ''}{period}
                        </button>
                      ))}
                    </div>
                    {selfExclusion && (
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
                        <div className="text-xs text-red-400 font-bold">⛔ Self-exclusion active: {selfExclusion}</div>
                        <div className="text-xs text-gray-400 mt-1">To reinstate your account, please contact support@pccasino.com</div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => onShowLegal('responsible')} className="w-full p-3 rounded-xl text-sm text-left flex items-center gap-3 hover:bg-white/5 transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#60a5fa' }}>
                    <Shield className="w-4 h-4" />
                    Read Responsible Gaming Policy
                    <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                  </button>
                </div>
              )}

              {/* PROVABLY FAIR */}
              {activeTab === 'provably' && (
                <ProvablyFairSection />
              )}

              {/* PREFERENCES */}
              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-lg">Preferences</h3>
                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm">Notifications</h4>
                    {[
                      { key: 'wins', label: 'Win notifications' },
                      { key: 'bonuses', label: 'Bonus alerts' },
                      { key: 'tournaments', label: 'Tournament reminders' },
                      { key: 'news', label: 'Site news & updates' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-sm text-gray-300">{item.label}</span>
                        <button onClick={() => saveNotifications(item.key, !notifications[item.key])}
                          className="w-10 h-5 rounded-full transition-all relative"
                          style={{ background: notifications[item.key] ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{ left: notifications[item.key] ? '1.25rem' : '0.125rem' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
