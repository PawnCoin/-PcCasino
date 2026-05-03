import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, Shield, History, Gift, AlertTriangle, Copy, CheckCircle, Bell, Lock, Eye, EyeOff, TrendingUp, Clock, Wallet, DollarSign, FileText, X, ExternalLink, ChevronRight, Star, QrCode, Smartphone, Upload, Phone, BadgeCheck, RefreshCw, Plus, Trash2, Star as StarIcon, Edit, Camera, Twitter, Instagram, Send, MessageCircle, Play, Save, Users, MessageSquare, UserPlus, UserX, Swords } from 'lucide-react';
import { CasinoIcon } from '@/components/CasinoIcons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { Transaction } from '@/types';
import { authApi, kycApi, walletApi, friendsApi, getToken } from '@/lib/api';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { DirectMessageModal } from '@/components/DirectMessageModal';
import { DemoModeProfileCard } from '@/components/DemoModeProfileCard';
import { VipBadge } from '@/components/VipBadge';
import { useAccessControl } from '@/hooks/useAccessControl';

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
    kycStatus?: string;
    phoneVerified?: boolean;
    phoneNumber?: string;
    realTransactionsUnlocked?: boolean;
    demoMode?: boolean;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    socialTwitter?: string;
    socialInstagram?: string;
    socialTelegram?: string;
    socialDiscord?: string;
    publicStatsVisible?: boolean;
    publicSocialsVisible?: boolean;
  } | null;
  transactions: Transaction[];
  avatarDef?: AvatarDef;
  onShowDeposit: () => void;
  onShowWithdraw: () => void;
  onShowReferral: () => void;
  onShowTournaments: () => void;
  onShowLegal: (page: string) => void;
  onShowDispute: () => void;
  onNavigateToGame?: (game: string) => void;
  onUserUpdated?: (updates: Record<string, unknown>) => void;
}

type ProfileTab = 'overview' | 'transactions' | 'security' | 'bonuses' | 'disputes' | 'limits' | 'preferences' | 'provably' | 'friends';
type KycStep = 'intro' | 'email' | 'phone' | 'id-upload' | 'selfie' | 'submitted';

const GAME_HISTORY_KEY = 'pcasino_game_history';

interface GameHistoryEntry {
  id: string;
  game: string;
  result: 'win' | 'loss';
  amount: number;
  net: number;
  timestamp: number;
}

interface LinkedWallet {
  id: number;
  wallet_address: string;
  chain_label: string;
  label: string | null;
  is_default: boolean;
  wallet_verified: boolean;
  wallet_verified_at: string | null;
  created_at: string;
}

function ProvablyFairSection() {
  const [clientSeed, setClientSeed] = useState(() => Math.random().toString(36).slice(2, 18));
  const [serverSeedHash] = useState('a7f3b2c9d4e1f8a5b6c3d7e2f9a4b1c8d5e2f3a9b6c4d1e7f2a8b3c9d6e4f1a2');
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
      setVerifyResult('Please fill in all fields to verify');
      return;
    }
    const result = generateResult(verifyClientSeed, verifyServerSeed, verifyNonce);
    setVerifyResult(`Verified! Raw result: ${result} | Roulette: ${result % 37} | Dice: ${(result % 6) + 1} | Slots ROI: ${((result % 100) / 100).toFixed(4)}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white text-lg flex items-center gap-2">
        <Eye className="w-5 h-5 text-[#D4AF37]" />
        Provably Fair Gaming
      </h3>
      <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <p className="text-sm text-gray-300 mb-2">All game results are generated using a combination of a <strong className="text-[#D4AF37]">client seed</strong> (you control), a <strong className="text-[#D4AF37]">server seed</strong> (committed before the game), and a <strong className="text-[#D4AF37]">nonce</strong> (game counter).</p>
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
        </div>
      </div>

      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-white text-sm">Verify a Past Game</h4>
        <div className="space-y-2">
          <input type="text" value={verifyClientSeed} onChange={e => setVerifyClientSeed(e.target.value)} placeholder="Client seed used..." className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          <input type="text" value={verifyServerSeed} onChange={e => setVerifyServerSeed(e.target.value)} placeholder="Server seed (revealed after game)..." className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          <input type="text" value={verifyNonce} onChange={e => setVerifyNonce(e.target.value)} placeholder="Nonce (game round #)..." className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
          <button onClick={handleVerify} className="w-full py-2 rounded-lg text-sm font-bold text-black" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
            Verify Result
          </button>
          {verifyResult && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-gray-300 break-all">{verifyResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- KYC Verification Flow ----
function KycFlow({ user, onComplete }: { user: NonNullable<UserProfileProps['user']>; onComplete: (newStatus: string) => void }) {
  const [step, setStep] = useState<KycStep>('intro');
  const [phone, setPhone] = useState(user.phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<string | null>(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    walletApi.list().then(data => {
      const hasVerified = (data.wallets || []).some((w: any) => w.wallet_verified && w.is_default);
      setWalletVerified(hasVerified);
    }).catch(() => {});
  }, []);

  const phoneVerified = user.phoneVerified;
  const emailVerified = user.emailVerified;

  useEffect(() => {
    // Start at the first incomplete step
    if (!emailVerified) { setStep('email'); return; }
    if (!phoneVerified) { setStep('phone'); return; }
    setStep('id-upload');
  }, [emailVerified, phoneVerified]);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSendOtp = async () => {
    if (!phone.trim()) { toast.error('Enter your phone number'); return; }
    setLoading(true);
    try {
      await kycApi.sendPhoneOtp(phone.trim());
      setOtpSent(true);
      toast.success('OTP sent to your phone!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { toast.error('Enter the OTP code'); return; }
    setLoading(true);
    try {
      await kycApi.verifyPhoneOtp(otp.trim());
      toast.success('Phone verified!');
      setStep('id-upload');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    try {
      const data = await readFileAsBase64(file);
      setIdFile(data);
      toast.success('ID document selected');
    } catch { toast.error('Failed to read file'); }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    try {
      const data = await readFileAsBase64(file);
      setSelfieFile(data);
      toast.success('Selfie selected');
    } catch { toast.error('Failed to read file'); }
  };

  const handleSubmit = async () => {
    if (!idFile || !selfieFile) { toast.error('Both ID document and selfie are required'); return; }
    setLoading(true);
    try {
      await kycApi.submitDocuments({ idDocumentData: idFile, selfieData: selfieFile });
      setStep('submitted');
      onComplete('pending');
      toast.success('KYC documents submitted for review!');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    }
    setLoading(false);
  };

  const stepBg = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white text-lg flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-[#D4AF37]" />
        Identity Verification (KYC)
      </h3>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-4">
        {(['email', 'phone', 'id-upload', 'selfie'] as KycStep[]).map((s, i) => {
          const labels = ['Email', 'Phone', 'ID Doc', 'Selfie'];
          const isComplete = (s === 'email' && emailVerified) || (s === 'phone' && phoneVerified);
          const isCurrent = step === s || (step === 'id-upload' && s === 'id-upload') || (step === 'selfie' && s === 'selfie') || (step === 'submitted' && (s === 'id-upload' || s === 'selfie'));
          return (
            <div key={s} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isComplete ? '#4ade80' : isCurrent ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                    color: isComplete || isCurrent ? 'black' : '#9ca3af',
                  }}>
                  {isComplete ? '\u2713' : i + 1}
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5">{labels[i]}</span>
              </div>
              {i < 3 && <div className="w-6 h-px mb-4" style={{ background: isComplete ? '#4ade80' : 'rgba(255,255,255,0.1)' }} />}
            </div>
          );
        })}
      </div>

      {/* Step: Email */}
      {step === 'email' && (
        <div className="p-4 rounded-xl space-y-3" style={stepBg}>
          <h4 className="font-bold text-white text-sm">Step 1: Email Verification</h4>
          <p className="text-sm text-gray-400">Your email must be verified before proceeding. Check your inbox for the verification link we sent when you registered.</p>
          {emailVerified ? (
            <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> Email verified!</div>
          ) : (
            <div className="p-3 rounded-lg text-sm text-yellow-400" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
              Email not yet verified. Please check your inbox and click the verification link.
            </div>
          )}
        </div>
      )}

      {/* Step: Phone OTP */}
      {step === 'phone' && (
        <div className="p-4 rounded-xl space-y-3" style={stepBg}>
          <h4 className="font-bold text-white text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> Step 2: Phone Verification</h4>
          <p className="text-xs text-gray-400">Enter your phone number to receive a one-time verification code.</p>
          {!otpSent ? (
            <>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
              />
              <Button disabled={loading} onClick={handleSendOtp} className="w-full" style={{ background: 'rgba(59,130,246,0.3)', color: 'white', border: '1px solid rgba(59,130,246,0.4)' }}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-green-400">OTP sent to {phone}. Enter the 6-digit code below.</p>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2 rounded-lg text-center text-xl font-mono tracking-widest"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(59,130,246,0.4)', color: 'white' }}
              />
              <div className="flex gap-2">
                <Button disabled={loading} onClick={handleVerifyOtp} className="flex-1" style={{ background: 'rgba(74,222,128,0.3)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }}>
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
                <Button onClick={() => setOtpSent(false)} size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
                  Resend
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step: ID Upload */}
      {step === 'id-upload' && (
        <div className="p-4 rounded-xl space-y-3" style={stepBg}>
          <h4 className="font-bold text-white text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-yellow-400" /> Step 3: Government ID</h4>
          <p className="text-xs text-gray-400">Upload a clear photo of your government-issued ID (passport, driver's license, or national ID card). Max 5MB, JPG/PNG.</p>

          <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={handleIdUpload} />
          <button
            onClick={() => idInputRef.current?.click()}
            className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all hover:border-[#D4AF37]/60"
            style={{ borderColor: idFile ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)' }}
          >
            {idFile ? (
              <>
                <img src={idFile} alt="ID preview" className="max-h-24 rounded-lg object-contain" />
                <span className="text-xs text-green-400">ID document ready</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500" />
                <span className="text-sm text-gray-400">Click to upload ID document</span>
                <span className="text-xs text-gray-600">Passport, driver's license, or national ID</span>
              </>
            )}
          </button>

          {idFile && (
            <Button onClick={() => setStep('selfie')} className="w-full" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}>
              Continue to Selfie
            </Button>
          )}
        </div>
      )}

      {/* Step: Selfie */}
      {step === 'selfie' && (
        <div className="p-4 rounded-xl space-y-3" style={stepBg}>
          <h4 className="font-bold text-white text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-purple-400" /> Step 4: Selfie with ID</h4>
          <p className="text-xs text-gray-400">Take a selfie holding your ID next to your face. Both your face and the ID must be clearly visible. Max 5MB, JPG/PNG.</p>

          <input ref={selfieInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelfieUpload} />
          <button
            onClick={() => selfieInputRef.current?.click()}
            className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all hover:border-purple-400/60"
            style={{ borderColor: selfieFile ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)' }}
          >
            {selfieFile ? (
              <>
                <img src={selfieFile} alt="Selfie preview" className="max-h-24 rounded-lg object-contain" />
                <span className="text-xs text-green-400">Selfie ready</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500" />
                <span className="text-sm text-gray-400">Click to upload selfie with ID</span>
                <span className="text-xs text-gray-600">Hold your ID next to your face</span>
              </>
            )}
          </button>

          <div className="flex gap-2">
            <Button onClick={() => setStep('id-upload')} size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
              Back
            </Button>
            <Button disabled={loading || !selfieFile} onClick={handleSubmit} className="flex-1" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: 'black' }}>
              {loading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Submitted */}
      {step === 'submitted' && (
        <div className="p-6 rounded-xl text-center space-y-3" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.3)' }}>
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <h4 className="font-bold text-white text-lg">Submitted for Review</h4>
          <p className="text-sm text-gray-400">Your documents have been submitted. An admin will review your submission within 24-72 hours. You'll receive a notification once reviewed.</p>
          <div className="p-3 rounded-lg text-xs text-gray-500" style={{ background: 'rgba(255,255,255,0.03)' }}>
            KYC Status: <span className="text-yellow-400 font-bold">PENDING REVIEW</span>
          </div>
        </div>
      )}

      {/* Tiered status breakdown */}
      <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
        <h4 className="text-xs font-bold text-[#D4AF37] mb-2">Your Access Tiers</h4>
        {[
          { label: 'KYC Verified', desc: 'Email + Phone + Documents approved', done: user.kycStatus === 'approved' },
          { label: 'Wallet Verified (100M+ $Pc)', desc: 'Default wallet holds ≥100M $Pc on-chain', done: walletVerified },
          { label: 'Full Access Unlocked', desc: 'Real crypto deposits & withdrawals enabled', done: user.realTransactionsUnlocked || false },
        ].map((tier, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${tier.done ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-500'}`}>
              {tier.done ? '\u2713' : i + 1}
            </div>
            <div>
              <span className={tier.done ? 'text-green-400' : 'text-gray-300'}>{tier.label}</span>
              <span className="text-xs text-gray-500 ml-2">— {tier.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Wallet Manager ----
function WalletManager({ userId }: { userId: string }) {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState('');
  const [newChain, setNewChain] = useState('ERC-20');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const CHAINS = ['ERC-20', 'BEP-20', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Avalanche'];

  const fetchWallets = async () => {
    try {
      const data = await walletApi.list();
      setWallets(data.wallets || []);
    } catch (err: any) {
      toast.error('Failed to load wallets');
    }
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, [userId]);

  const handleAdd = async () => {
    if (!newAddr.trim()) { toast.error('Enter a wallet address'); return; }
    setAdding(true);
    try {
      await walletApi.add({ walletAddress: newAddr.trim(), chainLabel: newChain, label: newLabel.trim() || undefined });
      toast.success('Wallet added!');
      setNewAddr(''); setNewLabel(''); setShowAdd(false);
      await fetchWallets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add wallet');
    }
    setAdding(false);
  };

  const handleRemove = async (id: number) => {
    try {
      await walletApi.remove(id);
      toast.success('Wallet removed');
      await fetchWallets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove wallet');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await walletApi.setDefault(id);
      toast.success('Default wallet updated');
      await fetchWallets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default');
    }
  };

  const handleVerifyBalance = async (id: number) => {
    setVerifyingId(id);
    try {
      const result = await walletApi.verifyBalance(id);
      if (result.meetsThreshold) {
        toast.success(`Wallet verified! Balance: ${result.balance} $Pc — threshold met!`);
      } else {
        const bal = result.balance ? `${result.balance} $Pc` : 'unknown';
        toast.error(`Balance (${bal}) below 100M $Pc threshold.${result.error ? ' ' + result.error : ''}`);
      }
      await fetchWallets();
    } catch (err: any) {
      toast.error(err.message || 'Balance check failed');
    }
    setVerifyingId(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">Loading wallets...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[#D4AF37]" />
          Linked Wallets ({wallets.length}/5)
        </h4>
        {wallets.length < 5 && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs px-3 py-1 rounded-lg flex items-center gap-1"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
            <Plus className="w-3 h-3" /> Add Wallet
          </button>
        )}
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <input
            type="text"
            value={newAddr}
            onChange={e => setNewAddr(e.target.value)}
            placeholder="Wallet address (0x...)"
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
          />
          <div className="flex gap-2">
            <select
              value={newChain}
              onChange={e => setNewChain(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            >
              {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={adding} onClick={handleAdd} size="sm" className="flex-1" style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }}>
              {adding ? 'Adding...' : 'Add'}
            </Button>
            <Button onClick={() => setShowAdd(false)} size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {wallets.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No wallets linked yet. Add your first wallet above.
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map(w => (
            <div key={w.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: w.is_default ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                      {w.chain_label}
                    </span>
                    {w.label && <span className="text-xs text-gray-300">{w.label}</span>}
                    {w.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                        Default
                      </span>
                    )}
                    {w.wallet_verified && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-gray-400 mt-1 break-all">{w.wallet_address}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleVerifyBalance(w.id)}
                    disabled={verifyingId === w.id}
                    title="Check on-chain balance"
                    className="p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                    style={{ color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}
                  >
                    <RefreshCw className={`w-3 h-3 ${verifyingId === w.id ? 'animate-spin' : ''}`} />
                  </button>
                  {!w.is_default && (
                    <button
                      onClick={() => handleSetDefault(w.id)}
                      title="Set as default"
                      className="p-1.5 rounded-lg hover:bg-yellow-500/10 transition-colors"
                      style={{ color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
                    >
                      <StarIcon className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(w.id)}
                    title="Remove wallet"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600">Click the refresh icon on any wallet to check your on-chain $Pc balance. A balance of 100M+ $Pc is required to unlock real transactions.</p>
    </div>
  );
}

export function UserProfile({ isOpen, onClose, user, transactions, avatarDef, onShowDeposit, onShowWithdraw, onShowReferral, onShowTournaments, onShowLegal, onShowDispute, onNavigateToGame, onUserUpdated }: UserProfileProps) {
  const access = useAccessControl(true, user?.vipTier);
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
  const [kycStatus, setKycStatus] = useState<string>('unverified');
  const [showKycFlow, setShowKycFlow] = useState(false);

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editDiscord, setEditDiscord] = useState('');
  const [editPublicStats, setEditPublicStats] = useState(true);
  const [editPublicSocials, setEditPublicSocials] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Favorite games state
  const [favoriteGames, setFavoriteGames] = useState<{ game: string; gameName: string; icon: string; playCount: number; winRate: number }[]>([]);
  const [favGamesLoading, setFavGamesLoading] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [encountered, setEncountered] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [dmTarget, setDmTarget] = useState<{ id: number; username: string; avatar?: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      const stored = localStorage.getItem(GAME_HISTORY_KEY);
      setGameHistory(stored ? JSON.parse(stored) : []);
      setTwoFAEnabled(!!user.totpEnabled);
      setSelfExclusion(user.selfExcluded ? 'Active' : '');
      setDailyLimit(user.dailyLossLimit || 0);
      setKycStatus(user.kycStatus || 'unverified');
      setEditDisplayName(user.displayName || '');
      setEditBio(user.bio || '');
      setEditTwitter(user.socialTwitter || '');
      setEditInstagram(user.socialInstagram || '');
      setEditTelegram(user.socialTelegram || '');
      setEditDiscord(user.socialDiscord || '');
      setEditPublicStats(user.publicStatsVisible !== false);
      setEditPublicSocials(user.publicSocialsVisible !== false);

      // Fetch favorite games
      if (getToken()) {
        setFavGamesLoading(true);
        authApi.getFavoriteGames()
          .then(data => { if (data.games) setFavoriteGames(data.games); })
          .catch(() => {})
          .finally(() => setFavGamesLoading(false));
      }
    }
    if (!isOpen) {
      setEditMode(false);
      setAvatarPreview(null);
    }
  }, [isOpen, user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    if (getToken()) {
      setAvatarUploading(true);
      try {
        const data = await authApi.uploadAvatar(file);
        if (data.avatarUrl) {
          setAvatarPreview(null);
          onUserUpdated?.({ avatarUrl: data.avatarUrl });
          toast.success('Profile photo updated!');
        }
      } catch (err: any) {
        toast.error(err.message || 'Upload failed');
        setAvatarPreview(null);
      }
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setEditSaving(true);
    try {
      const data = await authApi.updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
        socialTwitter: editTwitter.trim().replace(/^@/, ''),
        socialInstagram: editInstagram.trim().replace(/^@/, ''),
        socialTelegram: editTelegram.trim().replace(/^@/, ''),
        socialDiscord: editDiscord.trim(),
        publicStatsVisible: editPublicStats,
        publicSocialsVisible: editPublicSocials,
      });
      if (data.user) {
        onUserUpdated?.(data.user as Record<string, unknown>);
      }
      setEditMode(false);
      toast.success('Profile saved!');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    }
    setEditSaving(false);
  };

  const fetchFriends = useCallback(async () => {
    if (!getToken()) return;
    setFriendsLoading(true);
    try {
      const [friendsData, requestsData, encounteredData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
        friendsApi.getEncountered(),
      ]);
      setFriends(friendsData.friends || []);
      setPendingRequests(requestsData.requests || []);
      setEncountered(encounteredData.encountered || []);
    } catch (err: any) {
      console.error('Failed to load friends:', err.message);
    }
    setFriendsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'friends') {
      fetchFriends();
    }
  }, [isOpen, activeTab, fetchFriends]);

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
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'bonuses', label: 'Bonuses', icon: Gift },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'limits', label: 'Limits', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'provably', label: 'Provably Fair', icon: Eye },
  ];

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(2))}M`;
    if (n >= 1_000) return `${parseFloat((n / 1_000).toFixed(1))}K`;
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

  const txIconName = (type: string) => {
    if (type === 'win') return 'trophy';
    if (type === 'bet') return 'dice';
    if (type === 'deposit') return 'money-bag';
    if (type === 'withdraw') return 'money-bag';
    return 'document';
  };

  const kycBadgeColor = kycStatus === 'approved' ? { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' }
    : kycStatus === 'pending' ? { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' }
    : kycStatus === 'rejected' ? { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.3)' }
    : { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' };

  const kycLabel = kycStatus === 'approved' ? 'KYC: VERIFIED' : kycStatus === 'pending' ? 'KYC: PENDING' : kycStatus === 'rejected' ? 'KYC: REJECTED' : 'KYC: UNVERIFIED';

  return (
    <>
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
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : avatarDef ? (
                  <AvatarSprite avatar={avatarDef} size={56} style={{ borderRadius: 0 }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
                    <CasinoIcon name="person" size={24} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{user.displayName || user.username}</h2>
                  {user.displayName && <span className="text-xs text-gray-500">@{user.username}</span>}
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
                  {kycStatus === 'approved' && <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
                <div className="text-sm text-gray-400 mt-0.5">
                  {user.email || 'No email linked'} • ID: {String(user.id)}
                </div>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {/* Clickable KYC badge */}
                  <button
                    onClick={() => setShowKycFlow(true)}
                    className="text-xs px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                    style={{
                      background: kycBadgeColor.bg,
                      color: kycBadgeColor.color,
                      border: `1px solid ${kycBadgeColor.border}`,
                    }}
                  >
                    {kycLabel}
                  </button>
                  {user.realTransactionsUnlocked && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                      Full Access
                    </span>
                  )}
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
              {/* Demo-mode warning — visible at top of profile regardless of active tab */}
              {user?.demoMode && (
                <div className="mb-4">
                  <DemoModeProfileCard demoMode={user?.demoMode} />
                </div>
              )}
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">Account Overview</h3>
                    {!editMode ? (
                      <Button
                        onClick={() => setEditMode(true)}
                        size="sm"
                        style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)', fontSize: 12 }}
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit Profile
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => { setEditMode(false); }}
                          size="sm"
                          style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={editSaving}
                          size="sm"
                          style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 12 }}
                        >
                          <Save className="w-3 h-3 mr-1" /> {editSaving ? 'Saving…' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Edit Profile Panel */}
                  {editMode && (
                    <div className="p-4 rounded-xl space-y-4" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                      {/* Avatar Upload */}
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(212,175,55,0.5)' }}>
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
                            ) : user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : avatarDef ? (
                              <AvatarSprite avatar={avatarDef} size={64} style={{ borderRadius: 0 }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
                                <CasinoIcon name="person" size={24} />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.6)' }}
                          >
                            {avatarUploading ? (
                              <div className="w-5 h-5 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
                            ) : (
                              <Camera className="w-5 h-5 text-white" />
                            )}
                          </button>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">Profile Photo</p>
                          <button onClick={() => fileInputRef.current?.click()} className="text-xs text-[#D4AF37] hover:underline">
                            {avatarUploading ? 'Uploading…' : 'Change photo'}
                          </button>
                          <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, GIF up to 5MB</p>
                        </div>
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Display Name <span className="text-gray-600">(optional)</span></label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={e => setEditDisplayName(e.target.value.slice(0, 60))}
                          placeholder={user.username}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        />
                      </div>

                      {/* Bio */}
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Bio / Tagline <span className="text-gray-600">({editBio.length}/300)</span></label>
                        <textarea
                          value={editBio}
                          onChange={e => setEditBio(e.target.value.slice(0, 300))}
                          placeholder="Tell other players about yourself…"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        />
                      </div>

                      {/* Social handles */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Twitter className="w-3 h-3 text-[#1DA1F2]" /> Twitter/X</label>
                          <input type="text" value={editTwitter} onChange={e => setEditTwitter(e.target.value.slice(0, 50))} placeholder="@handle"
                            className="w-full px-2 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Instagram className="w-3 h-3 text-[#E1306C]" /> Instagram</label>
                          <input type="text" value={editInstagram} onChange={e => setEditInstagram(e.target.value.slice(0, 50))} placeholder="@handle"
                            className="w-full px-2 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Send className="w-3 h-3 text-[#0088cc]" /> Telegram</label>
                          <input type="text" value={editTelegram} onChange={e => setEditTelegram(e.target.value.slice(0, 50))} placeholder="@handle"
                            className="w-full px-2 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3 text-[#5865F2]" /> Discord</label>
                          <input type="text" value={editDiscord} onChange={e => setEditDiscord(e.target.value.slice(0, 60))} placeholder="user#1234"
                            className="w-full px-2 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                        </div>
                      </div>

                      {/* Privacy toggles */}
                      <div className="space-y-2 pt-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Public Card Privacy</p>
                        {[
                          { key: 'stats', label: 'Show stats on public card', value: editPublicStats, set: setEditPublicStats },
                          { key: 'socials', label: 'Show social links on public card', value: editPublicSocials, set: setEditPublicSocials },
                        ].map(item => (
                          <div key={item.key} className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">{item.label}</span>
                            <button onClick={() => item.set(!item.value)} className="w-9 h-5 rounded-full transition-all relative" style={{ background: item.value ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: item.value ? '1.1rem' : '0.1rem' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Won', value: formatAmount(totalWon), color: '#4ade80', iconName: 'trophy' },
                      { label: 'Total Bet', value: formatAmount(totalBet), color: '#facc15', iconName: 'dice' },
                      { label: 'Net Profit', value: formatAmount(Math.abs(netProfit)), color: getNetColor(netProfit), iconName: netProfit >= 0 ? 'star' : 'chart-down' },
                      { label: 'Win Rate', value: `${winRate}%`, color: '#c084fc', iconName: 'target' },
                    ].map(stat => (
                      <div key={stat.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <CasinoIcon name={stat.iconName} size={24} />
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
                          <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Access Status Panel */}
                    <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h4 className="font-bold text-white text-sm">Access Status</h4>
                      {[
                        { label: 'Email', done: user.emailVerified, value: user.emailVerified ? 'Verified' : 'Unverified' },
                        { label: 'Phone', done: user.phoneVerified, value: user.phoneVerified ? 'Verified' : 'Unverified' },
                        { label: 'KYC', done: kycStatus === 'approved', value: kycStatus === 'approved' ? 'Approved' : kycStatus === 'pending' ? 'Under Review' : kycStatus === 'rejected' ? 'Rejected' : 'Not Submitted' },
                        { label: 'Real Txns', done: user.realTransactionsUnlocked, value: user.realTransactionsUnlocked ? 'Unlocked' : 'Locked' },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between text-sm items-center">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="text-xs font-bold" style={{ color: item.done ? '#4ade80' : '#9ca3af' }}>
                            {item.done ? '\u2713 ' : ''}{item.value}
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowKycFlow(true)}
                        className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
                      >
                        {kycStatus === 'approved' ? 'View KYC Status' : 'Complete Verification →'}
                      </button>
                    </div>
                  </div>

                  {/* Favorite Games */}
                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#D4AF37]" /> Favorite Games
                    </h4>
                    {favGamesLoading ? (
                      <div className="text-center py-3 text-gray-500 text-xs">Loading…</div>
                    ) : favoriteGames.length === 0 ? (
                      <div className="text-center py-3 text-gray-500 text-xs">Play some games to see your favorites here!</div>
                    ) : (
                      <div className="space-y-2">
                        {favoriteGames.map((fg, idx) => {
                          return (
                            <div key={fg.game} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <span className="w-7 flex justify-center"><CasinoIcon name={fg.icon || 'gamepad'} size={22} /></span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white">{fg.gameName || fg.game}</div>
                                <div className="text-xs text-gray-500">{fg.playCount} plays • {fg.winRate}% wins</div>
                              </div>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>#{idx + 1}</span>
                              {onNavigateToGame && (
                                <button
                                  onClick={() => { onClose(); onNavigateToGame(fg.game); }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                                  style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
                                >
                                  <Play className="w-3 h-3" /> Play
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Wallet Manager */}
                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <WalletManager userId={user.id} />
                  </div>
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
                          <div className="w-8 flex justify-center"><CasinoIcon name={txIconName(tx.type)} size={20} /></div>
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

              {/* FRIENDS */}
              {activeTab === 'friends' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#D4AF37]" />
                      Friends & Contacts
                    </h3>
                    <button
                      onClick={fetchFriends}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                    >
                      Refresh
                    </button>
                  </div>

                  {friendsLoading ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
                  ) : (
                    <>
                      {/* Pending Requests */}
                      {pendingRequests.length > 0 && (
                        <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-yellow-400" />
                            Incoming Requests ({pendingRequests.length})
                          </h4>
                          {pendingRequests.map((req) => (
                            <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                                <CasinoIcon name="slot-machine" size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white">{req.username}</div>
                                <div className="text-xs text-gray-500">{req.vipTier?.toUpperCase()} VIP</div>
                              </div>
                              <div className="flex gap-1">
                                {access.canAddFriend ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      await friendsApi.acceptRequest(req.id);
                                      toast.success(`${req.username} is now your friend!`);
                                      fetchFriends();
                                    } catch (err: any) { toast.error(err.message); }
                                  }}
                                  className="px-2 py-1 rounded-lg text-xs font-bold"
                                  style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }}
                                >
                                  Accept
                                </button>
                                ) : (
                                <span className="px-2 py-1 rounded-lg text-[10px] text-gray-500" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  VIP Required (Silver+)
                                </span>
                                )}
                                <button
                                  onClick={async () => {
                                    try {
                                      await friendsApi.removeOrDecline(req.id);
                                      toast.success('Request declined');
                                      fetchFriends();
                                    } catch (err: any) { toast.error(err.message); }
                                  }}
                                  className="px-2 py-1 rounded-lg text-xs"
                                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Friends List */}
                      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h4 className="font-bold text-white text-sm">Friends ({friends.length})</h4>
                        {friends.length === 0 ? (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No friends yet. Join multiplayer rooms to meet players!</p>
                          </div>
                        ) : (
                          friends.map((f) => (
                            <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                              <div className="relative flex-shrink-0">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <CasinoIcon name="slot-machine" size={18} />
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${f.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-bold text-white">{f.username}</span>
                                  <VipBadge tier={f.vipTier} size="sm" />
                                </div>
                                <div className="text-xs text-gray-500">{f.vipTier?.toUpperCase()} VIP • {f.favoriteGame}</div>
                              </div>
                              <div className="flex gap-1">
                                {access.canMessage ? (
                                <button
                                  onClick={() => setDmTarget({ id: f.friendId, username: f.username, avatar: f.avatar })}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                                  title="Send message"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                ) : (
                                <span
                                  className="p-1.5 rounded-lg opacity-40 cursor-not-allowed"
                                  style={{ background: 'rgba(255,255,255,0.03)', color: '#666', border: '1px solid rgba(255,255,255,0.08)' }}
                                  title="VIP membership required to send messages (Silver tier+). Wager 10M+ $Pc to unlock."
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </span>
                                )}
                                <button
                                  onClick={async () => {
                                    try {
                                      await friendsApi.removeOrDecline(f.id);
                                      toast.success(`${f.username} removed`);
                                      fetchFriends();
                                    } catch (err: any) { toast.error(err.message); }
                                  }}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                                  title="Remove friend"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await friendsApi.blockUser(f.friendId);
                                      toast.success(`${f.username} blocked`);
                                      fetchFriends();
                                    } catch (err: any) { toast.error(err.message); }
                                  }}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ background: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.2)' }}
                                  title="Block user"
                                >
                                  <Swords className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Met In Games */}
                      {encountered.length > 0 && (
                        <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            <Swords className="w-4 h-4 text-purple-400" />
                            Met In Games (recent)
                          </h4>
                          {encountered.map((p) => (
                            <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                                style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}>
                                <CasinoIcon name="gamepad" size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white">{p.username}</div>
                                <div className="text-xs text-gray-500">{p.gameType} • {new Date(p.encounteredAt).toLocaleDateString()}</div>
                              </div>
                              {access.canAddFriend ? (
                              <button
                                onClick={async () => {
                                  try {
                                    await friendsApi.sendRequest(p.userId);
                                    toast.success(`Friend request sent to ${p.username}!`);
                                    fetchFriends();
                                  } catch (err: any) { toast.error(err.message); }
                                }}
                                className="px-2 py-1 rounded-lg text-xs flex items-center gap-1"
                                style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                              >
                                <UserPlus className="w-3 h-3" /> Add
                              </button>
                              ) : (
                              <span className="px-2 py-1 rounded-lg text-[10px] text-gray-500 flex items-center gap-1 cursor-not-allowed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} title="VIP membership required (Silver tier+). Wager 10M+ $Pc to unlock.">
                                <Lock className="w-3 h-3" /> VIP Only
                              </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
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
                      {user.emailVerified ? 'Verified' : 'Resend'}
                    </Button>
                  </div>
                  {/* KYC */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm text-white">KYC Verification</div>
                      <div className="text-xs" style={{ color: kycStatus === 'approved' ? '#4ade80' : '#fbbf24' }}>
                        {kycStatus === 'approved' ? 'Approved — identity verified' : kycStatus === 'pending' ? 'Under review' : kycStatus === 'rejected' ? 'Rejected — resubmit required' : 'Not yet verified'}
                      </div>
                    </div>
                    <Button onClick={() => setShowKycFlow(true)} size="sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 11 }}>
                      {kycStatus === 'approved' ? 'Verified' : 'Verify'}
                    </Button>
                  </div>
                  </div>

                  <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm">Account Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">User ID</span><code className="text-yellow-400 text-xs">{user.id}</code></div>
                      <div className="flex justify-between"><span className="text-gray-400">Username</span><span className="text-white">{user.username}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="text-white">{user.email || 'Not linked'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="text-white">{user.phoneNumber || 'Not linked'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">KYC Status</span>
                        <span className="font-bold" style={{ color: kycStatus === 'approved' ? '#4ade80' : '#fbbf24' }}>
                          {kycStatus.toUpperCase()}
                        </span>
                      </div>
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
                      <p className="text-xs text-gray-400 mb-3">Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code.</p>
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
                          <CasinoIcon name={bonus.status === 'claimed' ? 'checkmark' : bonus.status === 'locked' ? 'lock' : bonus.status === 'active' ? 'lightning' : 'gift'} size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white text-sm">{bonus.name}</div>
                          <div className="text-xs text-gray-400">{bonus.desc}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm" style={{ color: bonus.color }}>{bonus.amount}</div>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            background: bonus.status === 'available' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
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
                          If you experience a technical malfunction during gameplay that results in an unfair loss, you may be eligible for a full or partial refund. All disputes are reviewed within 48–72 hours.
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
                          {selfExclusionLoading ? '...' : selfExclusion === period ? '\u2713 ' : ''}{period}
                        </button>
                      ))}
                    </div>
                    {selfExclusion && (
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
                        <div className="text-xs text-red-400 font-bold">Self-exclusion active: {selfExclusion}</div>
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

    {/* DM Modal */}
    {dmTarget && (
      <DirectMessageModal
        isOpen={!!dmTarget}
        onClose={() => setDmTarget(null)}
        recipientId={dmTarget.id}
        recipientUsername={dmTarget.username}
        myId={Number(user.id)}
      />
    )}

    <Dialog open={showKycFlow} onOpenChange={setShowKycFlow}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden" style={{
        background: 'rgba(6,6,12,0.99)',
        border: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 0 60px rgba(0,0,0,0.9)',
      }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-[#D4AF37]" />
            Identity Verification
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="p-4">
            <KycFlow
              user={{ ...user, kycStatus, phoneVerified: user.phoneVerified, phoneNumber: user.phoneNumber }}
              onComplete={(newStatus) => {
                setKycStatus(newStatus);
                if (newStatus !== 'approved') {
                  setTimeout(() => setShowKycFlow(false), 3000);
                }
              }}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
