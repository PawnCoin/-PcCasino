import { useState, useEffect } from 'react';
import { Star, Copy, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReferralPageProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; username: string; balance: number } | null;
}

export function ReferralPage({ isOpen, onClose, user }: ReferralPageProps) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      const stored = localStorage.getItem(`pcasino_ref_${user.id}`);
      if (stored) {
        setCode(stored);
      } else {
        generateCode();
      }
      loadReferrals();
    }
  }, [isOpen, user]);

  const generateCode = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('pcasino_token');
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
      // Fallback only used if network request fails entirely
    }
  };

  const loadReferrals = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('pcasino_token');
      const res = await fetch(`/api/referrals/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) { const data = await res.json(); setReferrals(data.referrals || []); }
    } catch { setReferrals([]); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Referral code copied!');
  };

  const copyLink = () => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
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

  // DB schema: each row is one referred user — count rows for total referrals
  const totalReferrals = referrals.length;
  // commission_paid=true means 10% first-deposit commission was credited for that referral
  const commissionsEarned = referrals.filter((r: any) => r.commission_paid).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(167,139,250,0.3)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Star className="w-5 h-5" /> Referral Program
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Referred', value: totalReferrals, color: '#c084fc', icon: '👥' },
              { label: 'Commissions Paid', value: commissionsEarned, color: '#4ade80', icon: '💎' },
              { label: 'Bonus per Referral', value: '50M $Pc', color: '#D4AF37', icon: '⚡' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-xl mb-1">{stat.icon}</div>
                <div className="font-bold text-sm" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Your code */}
          <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(167,139,250,0.03))', border: '1px solid rgba(167,139,250,0.25)' }}>
            <div className="text-xs text-purple-400 font-bold mb-2 uppercase tracking-wider">Your Referral Code</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 rounded-xl text-xl font-mono font-bold text-center tracking-widest"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                {code || 'Loading...'}
              </code>
              <button onClick={copyCode} className="p-3 rounded-xl transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {copied ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={copyLink} className="flex-1" size="sm"
                style={{ background: 'rgba(167,139,250,0.15)', color: '#c084fc', border: '1px solid rgba(167,139,250,0.3)', fontSize: 12 }}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
              </Button>
              <Button onClick={shareLink} className="flex-1" size="sm"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', fontSize: 12 }}>
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-sm font-bold text-white mb-3">How It Works</div>
            {[
              { step: '1', text: 'Share your unique code with friends', color: '#c084fc' },
              { step: '2', text: 'They sign up and enter your code', color: '#60a5fa' },
              { step: '3', text: 'They receive 50M $Pc welcome bonus', color: '#4ade80' },
              { step: '4', text: 'You earn 10% of their first deposit', color: '#D4AF37' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3 py-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}>
                  {item.step}
                </div>
                <span className="text-sm text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Note: referral codes are applied at registration only */}
          <div className="p-3 rounded-xl text-sm text-gray-400 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            Referral codes can only be applied when creating a new account. Share your link to earn commissions on your friends' first deposits.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
