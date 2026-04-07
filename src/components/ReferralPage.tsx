import { useState, useEffect, useCallback } from 'react';
import { Star, Copy, CheckCircle, Share2, DollarSign, Users, TrendingUp, Clock, Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReferralPageProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; username: string; balance: number } | null;
}

interface AffiliateStats {
  totalReferrals: number;
  totalDeposits: number;
  commissionEarned: number;
  commissionPendingPayout: number;
  pendingReferrals: number;
  activePayoutRequest: { id: number; amount: number; status: string; created_at: string } | null;
  referrals: Array<{
    id: number;
    referredId: number;
    referredUsername: string;
    joinedAt: string;
    depositTotal: number;
    commissionPaid: boolean;
    commissionAmount: number;
  }>;
}

function formatPc(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ReferralPage({ isOpen, onClose, user }: ReferralPageProps) {
  const [code, setCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals'>('overview');

  const getToken = () => localStorage.getItem('pcasino_token');

  const generateCode = useCallback(async () => {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.referral.code);
        localStorage.setItem(`pcasino_ref_${user.id}`, data.referral.code);
      }
    } catch {
      // silent — code loading error is non-fatal
    }
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/affiliate/stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent — stats loading error is non-fatal
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      const stored = localStorage.getItem(`pcasino_ref_${user.id}`);
      if (stored) {
        setCode(stored);
      } else {
        generateCode();
      }
      loadStats();
    }
  }, [isOpen, user, generateCode, loadStats]);

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast.success('Referral code copied!');
  };

  const copyLink = () => {
    if (!code) return;
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success('Referral link copied!');
  };

  const shareLink = () => {
    const link = `${window.location.origin}?ref=${code}`;
    if (navigator.share) {
      navigator.share({ title: '$Pc Casino', text: `Join me on $Pc Casino and get 50M $Pc welcome bonus! Use my code: ${code}`, url: link });
    } else {
      copyLink();
    }
  };

  const requestPayout = async () => {
    if (!user) return;
    if (stats?.activePayoutRequest) {
      toast.error('You already have a pending payout request.');
      return;
    }
    if (!stats || stats.commissionPendingPayout <= 0) {
      toast.error('No commission available to request payout for.');
      return;
    }
    setPayoutLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/affiliate/payout-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        toast.success('Payout request submitted! Our team will process it within 24–48 hours.');
        loadStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit payout request');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setPayoutLoading(false);
    }
  };

  const referralLink = code ? `${window.location.origin}?ref=${code}` : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(167,139,250,0.15)', background: 'linear-gradient(135deg, rgba(88,28,135,0.15), rgba(6,6,12,0))' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400 text-lg">
              <Star className="w-5 h-5" /> Affiliate Dashboard
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 mt-1">Earn 10% commission on every referred friend's first deposit</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Referral Link Section */}
          <div className="p-4 rounded-2xl space-y-3" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(167,139,250,0.03))', border: '1px solid rgba(167,139,250,0.25)' }}>
            <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Your Referral Link</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono truncate"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#c084fc', border: '1px solid rgba(167,139,250,0.2)' }}>
                {referralLink || 'Loading...'}
              </div>
              <button
                onClick={copyLink}
                className="p-2.5 rounded-xl flex-shrink-0 transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                title="Copy link"
              >
                {linkCopied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <span className="text-xs text-gray-400">Code:</span>
                <code className="text-sm font-mono font-bold tracking-widest" style={{ color: '#D4AF37' }}>
                  {code || '—'}
                </code>
                <button onClick={copyCode} className="ml-auto">
                  {codeCopied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300 transition-colors" />}
                </button>
              </div>
              <Button
                onClick={shareLink}
                size="sm"
                style={{ background: 'rgba(167,139,250,0.15)', color: '#c084fc', border: '1px solid rgba(167,139,250,0.3)' }}
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
              <Button
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me on $Pc Casino! Use my referral link: ${referralLink}`)}`,'_blank')}
                size="sm"
                style={{ background: 'rgba(29,161,242,0.15)', color: '#60a5fa', border: '1px solid rgba(29,161,242,0.3)' }}
                title="Share on X/Twitter"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Referrals',
                value: stats ? stats.totalReferrals : '—',
                subValue: stats ? `${stats.pendingReferrals} pending deposit` : '',
                color: '#c084fc',
                icon: <Users className="w-4 h-4" />,
              },
              {
                label: 'Total Deposits',
                value: stats ? `${formatPc(stats.totalDeposits)} $Pc` : '—',
                subValue: 'by referred users',
                color: '#60a5fa',
                icon: <TrendingUp className="w-4 h-4" />,
              },
              {
                label: 'Commission Earned',
                value: stats ? `${formatPc(stats.commissionEarned)} $Pc` : '—',
                subValue: '10% of first deposits',
                color: '#4ade80',
                icon: <DollarSign className="w-4 h-4" />,
              },
              {
                label: 'Pending Payout',
                value: stats ? `${formatPc(stats.commissionPendingPayout)} $Pc` : '—',
                subValue: stats?.activePayoutRequest ? 'Request submitted' : 'Available to request',
                color: '#D4AF37',
                icon: <Wallet className="w-4 h-4" />,
              },
            ].map(stat => (
              <div
                key={stat.label}
                className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-1.5 mb-2" style={{ color: stat.color }}>
                  {stat.icon}
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <div className="font-bold text-sm text-white">
                  {loading ? <span className="text-gray-500">...</span> : stat.value}
                </div>
                {stat.subValue && (
                  <div className="text-xs text-gray-500 mt-0.5">{stat.subValue}</div>
                )}
              </div>
            ))}
          </div>

          {/* Payout Request */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[#D4AF37] text-sm mb-1">Commission Payout</div>
                {stats?.activePayoutRequest ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Payout request for <span className="text-[#D4AF37] font-medium">{formatPc(stats.activePayoutRequest.amount)} $Pc</span> is pending review</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    {stats && stats.commissionPendingPayout > 0
                      ? `${formatPc(stats.commissionPendingPayout)} $Pc available — click to request payout`
                      : 'No commission available yet. Refer friends who deposit to earn commission.'}
                  </div>
                )}
              </div>
              <Button
                onClick={requestPayout}
                disabled={payoutLoading || !stats || stats.commissionPendingPayout <= 0 || !!stats?.activePayoutRequest}
                size="sm"
                className="flex-shrink-0"
                style={{
                  background: stats?.activePayoutRequest ? 'rgba(255,255,255,0.05)' : 'rgba(212,175,55,0.2)',
                  color: stats?.activePayoutRequest ? '#6b7280' : '#D4AF37',
                  border: `1px solid ${stats?.activePayoutRequest ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.4)'}`,
                  minWidth: 120,
                }}
              >
                {payoutLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : stats?.activePayoutRequest ? (
                  <><Clock className="w-3.5 h-3.5 mr-1.5" /> Pending</>
                ) : (
                  <><Wallet className="w-3.5 h-3.5 mr-1.5" /> Request Payout</>
                )}
              </Button>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Payouts are processed manually within 24–48 hours. Commission is calculated at 10% of each referred user's first deposit.
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {(['overview', 'referrals'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 text-sm font-medium capitalize transition-colors"
                style={{
                  color: activeTab === tab ? '#c084fc' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #c084fc' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab === 'referrals' ? `Referred Users (${stats?.totalReferrals ?? 0})` : 'How It Works'}
              </button>
            ))}
            <button
              onClick={loadStats}
              className="ml-auto p-2 text-gray-500 hover:text-gray-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-2">
              {[
                { step: '1', text: 'Share your unique referral link or code with friends', color: '#c084fc' },
                { step: '2', text: 'They sign up using your link — they get 50M $Pc welcome bonus', color: '#60a5fa' },
                { step: '3', text: 'When they make their first deposit, you earn 10% commission automatically', color: '#4ade80' },
                { step: '4', text: 'Accumulated commission appears in "Pending Payout" — request it anytime', color: '#D4AF37' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3 py-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}
                  >
                    {item.step}
                  </div>
                  <span className="text-sm text-gray-300">{item.text}</span>
                </div>
              ))}
              <div
                className="mt-4 p-3 rounded-xl text-xs text-gray-400"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Referral codes can only be applied when creating a new account. Commission is earned on the referred user's first deposit only.
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">Loading referrals...</div>
              ) : !stats || stats.referrals.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="w-8 h-8 text-gray-600 mx-auto" />
                  <div className="text-gray-500 text-sm">No referrals yet</div>
                  <div className="text-gray-600 text-xs">Share your link to start earning commissions</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Table header */}
                  <div
                    className="grid grid-cols-4 gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 uppercase tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span>Username</span>
                    <span>Joined</span>
                    <span className="text-right">Deposits</span>
                    <span className="text-right">Commission</span>
                  </div>

                  {/* Rows */}
                  {stats.referrals.map(ref => (
                    <div
                      key={ref.id}
                      className="grid grid-cols-4 gap-2 px-3 py-3 rounded-lg items-center"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: ref.commissionPaid ? '#4ade80' : '#f59e0b' }}
                          title={ref.commissionPaid ? 'Commission earned' : 'Awaiting first deposit'}
                        />
                        <span className="text-sm text-white font-medium truncate">{ref.referredUsername}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(ref.joinedAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-right font-medium" style={{ color: ref.depositTotal > 0 ? '#60a5fa' : '#6b7280' }}>
                        {ref.depositTotal > 0 ? `${formatPc(ref.depositTotal)} $Pc` : '—'}
                      </span>
                      <div className="text-right">
                        {ref.commissionPaid ? (
                          <span className="text-xs font-bold" style={{ color: '#4ade80' }}>
                            +{formatPc(ref.commissionAmount)} $Pc
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Totals row */}
                  <div
                    className="grid grid-cols-4 gap-2 px-3 py-3 rounded-lg items-center font-bold"
                    style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)' }}
                  >
                    <span className="text-xs text-purple-400 col-span-2">Total</span>
                    <span className="text-xs text-right" style={{ color: '#60a5fa' }}>
                      {formatPc(stats.totalDeposits)} $Pc
                    </span>
                    <span className="text-xs text-right" style={{ color: '#4ade80' }}>
                      +{formatPc(stats.commissionEarned)} $Pc
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
