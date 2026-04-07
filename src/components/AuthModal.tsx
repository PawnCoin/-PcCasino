import { useState } from 'react';
import { Wallet, Twitter, MessageCircle, Send, Eye, EyeOff, Mail, Lock, User, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authApi, setToken } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: 'google' | 'twitter' | 'discord' | 'telegram') => void;
  onWalletConnect: () => void;
  onEmailLogin?: (user: any) => void;
}

type Tab = 'login' | 'register' | 'social';

export function AuthModal({ isOpen, onClose, onConnect, onWalletConnect, onEmailLogin }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>('login');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');

  // Form fields
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState(
    () => sessionStorage.getItem('pcasino_ref_code') || ''
  );

  const reset = () => {
    setError('');
    setLoading(false);
    setNeeds2FA(false);
    setTwoFaCode('');
    setTempToken('');
  };

  const handleSocialConnect = async (provider: 'google' | 'twitter' | 'discord' | 'telegram') => {
    setConnecting(provider);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onConnect(provider);
    setConnecting(null);
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError('Username, email and password are required');
      return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register({ username, email, password, referralCode: referral || undefined });
      setToken(res.token);
      // Clear the stored referral code after successful registration
      sessionStorage.removeItem('pcasino_ref_code');
      onEmailLogin?.(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login({ email, password, totpCode: needs2FA ? twoFaCode : undefined });
      if (res.requires2FA) {
        setNeeds2FA(true);
        setTempToken(res.tempToken || '');
        setLoading(false);
        return;
      }
      setToken(res.token);
      onEmailLogin?.(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async () => {
    if (!twoFaCode.trim()) { setError('Enter your 2FA code'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login({ email, password, totpCode: twoFaCode });
      setToken(res.token);
      onEmailLogin?.(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const socialProviders = [
    {
      id: 'google' as const,
      name: 'Google',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      color: '#EA4335',
      comingSoon: false,
    },
    {
      id: 'discord' as const,
      name: 'Discord',
      icon: <MessageCircle className="w-5 h-5" />,
      color: '#5865F2',
      comingSoon: false,
    },
    {
      id: 'twitter' as const,
      name: 'Twitter / X',
      icon: <Twitter className="w-5 h-5" />,
      color: '#1DA1F2',
      comingSoon: true,
    },
    {
      id: 'telegram' as const,
      name: 'Telegram',
      icon: <Send className="w-5 h-5" />,
      color: '#0088cc',
      comingSoon: true,
    },
  ];

  const inputCls = `w-full bg-black/40 border border-[#5D4037]/50 rounded-xl px-4 py-3 text-white placeholder-[#606060] text-sm
    focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30 transition-all`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(10,10,10,0.98)',
          border: '1px solid rgba(212,175,55,0.4)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.1)'
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-casino text-2xl text-gradient-gold text-center">
            WELCOME TO $Pc CASINO
          </DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-black/40 rounded-xl p-1 mb-4">
          {(['login', 'register', 'social'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); reset(); }}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize"
              style={tab === t
                ? { background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: '#000' }
                : { color: '#808080' }}
            >
              {t === 'login' ? 'Login' : t === 'register' ? 'Register' : 'Social'}
            </button>
          ))}
        </div>

        {/* Wallet button always visible */}
        <button
          onClick={() => { onWalletConnect(); onClose(); }}
          className="w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-300 group relative overflow-hidden mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
            border: '2px solid rgba(212,175,55,0.6)',
          }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.5), rgba(212,175,55,0.2))', border: '1px solid rgba(212,175,55,0.6)' }}>
            <Wallet className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div className="text-left">
            <div className="font-bold text-[#D4AF37] text-base">Connect Crypto Wallet</div>
            <div className="text-xs text-[#808080]">MetaMask, Phantom, Coinbase & more</div>
          </div>
        </button>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#5D4037]/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-[#0a0a0a] text-xs text-[#808080]">OR</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 px-4 py-2 rounded-lg text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {/* Login Tab */}
        {tab === 'login' && !needs2FA && (
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
              <input
                className={inputCls + ' pl-10'}
                placeholder="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
              <input
                className={inputCls + ' pl-10 pr-10'}
                placeholder="Password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#606060] hover:text-[#D4AF37]"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-black transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              onClick={() => setTab('register')}
              className="w-full text-center text-xs text-[#808080] hover:text-[#D4AF37] transition-colors pt-1"
            >
              Don't have an account? Register →
            </button>
          </div>
        )}

        {/* 2FA Step */}
        {tab === 'login' && needs2FA && (
          <div className="space-y-3">
            <div className="text-center text-sm text-[#C0C0C0] mb-2">
              <KeyRound className="w-8 h-8 mx-auto mb-2 text-[#D4AF37]" />
              Enter your 6-digit authenticator code
            </div>
            <input
              className={inputCls + ' text-center tracking-widest text-lg'}
              placeholder="000000"
              maxLength={6}
              value={twoFaCode}
              onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handle2FA()}
              autoFocus
            />
            <button
              onClick={handle2FA}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-black transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              onClick={() => setNeeds2FA(false)}
              className="w-full text-center text-xs text-[#606060] hover:text-[#808080]"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Register Tab */}
        {tab === 'register' && (
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
              <input
                className={inputCls + ' pl-10'}
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
              <input
                className={inputCls + ' pl-10'}
                placeholder="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060]" />
              <input
                className={inputCls + ' pl-10 pr-10'}
                placeholder="Password (min 8 characters)"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#606060] hover:text-[#D4AF37]"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                className={inputCls}
                placeholder="Referral code (optional)"
                value={referral}
                onChange={e => setReferral(e.target.value)}
              />
              {referral && (
                <div className="mt-1 text-xs px-2 py-0.5 rounded flex items-center gap-1"
                  style={{ color: '#D4AF37' }}>
                  <span>✓</span>
                  <span>Referral code applied — welcome bonus included!</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-black transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p className="text-xs text-[#606060] text-center">
              A verification email will be sent to confirm your address
            </p>
            <button
              onClick={() => setTab('login')}
              className="w-full text-center text-xs text-[#808080] hover:text-[#D4AF37] transition-colors"
            >
              Already have an account? Sign in →
            </button>
          </div>
        )}

        {/* Social Tab */}
        {tab === 'social' && (
          <div className="space-y-2">
            {socialProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => !provider.comingSoon && handleSocialConnect(provider.id)}
                disabled={connecting !== null || provider.comingSoon}
                className="w-full p-3 rounded-xl flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                style={{
                  background: 'rgba(20,20,20,0.8)',
                  border: '1px solid rgba(93,64,55,0.5)',
                  opacity: provider.comingSoon ? 0.55 : 1,
                  cursor: provider.comingSoon ? 'default' : 'pointer',
                }}
              >
                {!provider.comingSoon && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(90deg, ${provider.color}15, transparent)` }} />
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center relative z-10"
                  style={{ background: `linear-gradient(135deg, ${provider.color}40, ${provider.color}20)`, border: `1px solid ${provider.color}60`, color: provider.color }}>
                  {provider.icon}
                </div>
                <div className="flex-1 text-left relative z-10">
                  <div className="font-bold text-white transition-colors" style={{ color: provider.comingSoon ? '#606060' : undefined }}>
                    {provider.name}
                  </div>
                </div>
                {provider.comingSoon ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full relative z-10"
                    style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                    Soon
                  </span>
                ) : connecting === provider.id ? (
                  <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                ) : null}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#5D4037]/30 text-center">
          <p className="text-xs text-[#606060]">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
