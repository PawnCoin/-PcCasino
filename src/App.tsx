import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { getSocket } from '@/lib/socket';
import { authApi, paymentsApi, gameApi, setToken, clearToken, getToken } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { HeroSection } from '@/components/HeroSection';
import { GamesGrid } from '@/components/GamesGrid';
import { WeParlaySection } from '@/components/WeParlaySection';
import { RecentWinners } from '@/components/RecentWinners';
import { Leaderboard } from '@/components/Leaderboard';
import { WalletConnect } from '@/components/WalletConnect';
import { AuthModal } from '@/components/AuthModal';
import { FinancialModal } from '@/components/FinancialModal';
import { CardDeckSelector } from '@/components/CardDeckSelector';
import { VappTVPlayer } from '@/components/VappTVPlayer';
import { useCardDeck } from '@/hooks/useCardDeck';
import { MusicPlayer } from '@/components/MusicPlayer';
import { JackpotTicker } from '@/components/JackpotTicker';
import { PokerGame } from '@/components/games/PokerGame';
import { SpadesGame } from '@/components/games/SpadesGame';
import { SlotsGame } from '@/components/games/SlotsGame';
import { BlackjackGame } from '@/components/games/BlackjackGame';
import { RouletteGame } from '@/components/games/RouletteGame';
import { BingoGame } from '@/components/games/BingoGame';
import { DominoesGame } from '@/components/games/DominoesGame';
import { PoolGame } from '@/components/games/PoolGame';
import { DartsGame } from '@/components/games/DartsGame';
import { IframeGameWrapper } from '@/components/games/IframeGameWrapper';
import { InGameTopBar } from '@/components/InGameTopBar';
import { MultiplayerLobby } from '@/components/MultiplayerLobby';
import { GameRoom } from '@/components/GameRoom';
import { VipArea } from '@/components/VipArea';
import { GlobalGameProvider } from '@/contexts/GlobalGameContext';
import { CasinoBackground } from '@/components/CasinoBackground';
import { Sportsbook } from '@/components/Sportsbook';
import { UserProfile } from '@/components/UserProfile';
import { AdminDashboard } from '@/components/AdminDashboard';
import { LegalPages } from '@/components/LegalPages';
import type { LegalPage } from '@/components/LegalPages';
import { DisputeCenter } from '@/components/DisputeCenter';
import { TournamentsPage } from '@/components/TournamentsPage';
import { ReferralPage } from '@/components/ReferralPage';
import { LobbyChat } from '@/components/LobbyChat';
import { ProvablyFairPage } from '@/components/ProvablyFairPage';
import { ReferralWelcomeOverlay } from '@/components/ReferralWelcomeOverlay';
import { JackpotCelebration } from '@/components/JackpotCelebration';
import { PokerHandSharePage } from '@/components/PokerHandSharePage';
import { JackpotCelebration } from '@/components/JackpotCelebration';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gift, History, Share2, Twitter, MessageCircle, Send } from 'lucide-react';
import type { GameType, Transaction } from '@/types';

interface UnifiedUser {
  id: string;
  username: string;
  email?: string;
  walletAddress?: string;
  withdrawAddress?: string;
  socialProvider?: 'google' | 'twitter' | 'discord' | 'telegram';
  balance: number;
  avatar: string;
  socialAvatarUrl?: string;
  isAdmin?: boolean;
  vipTier?: string;
  totpEnabled?: boolean;
  emailVerified?: boolean;
}

function App() {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userAvatarDef, setUserAvatarDef] = useState<AvatarDef>(() => {
    try {
      const stored = localStorage.getItem('pcasino_user_avatar_def');
      return stored ? JSON.parse(stored) : ALL_AVATARS[Math.floor(Math.random() * 12)];
    } catch {
      return ALL_AVATARS[0];
    }
  });
  
  const [currentView, setCurrentView] = useState<'lobby' | GameType>('lobby');
  const [pokerShareToken, setPokerShareToken] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/poker\/hand\/([a-f0-9]{32})$/);
    return match ? match[1] : null;
  });
  const [showAuth, setShowAuth] = useState(false);
  const [, setShowWalletModal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showCardDeck, setShowCardDeck] = useState(false);
  const [showVappTV, setShowVappTV] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [provablyFairPrefill, setProvablyFairPrefill] = useState<{ serverSeed?: string; serverSeedHash?: string; clientSeed?: string; nonce?: number; game?: string } | undefined>();
  const [showLobby, setShowLobby] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [legalPage, setLegalPage] = useState<LegalPage>('terms');
  const [showDispute, setShowDispute] = useState(false);
  const [showTournaments, setShowTournaments] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  // Jackpot celebration state (shown when the logged-in user wins the jackpot)
  const [jackpotCelebration, setJackpotCelebration] = useState<{ amount: number; username: string } | null>(null);

  // Referral welcome overlay state
  const [referralOverlay, setReferralOverlay] = useState<{
    referrerUsername: string;
    welcomeBonus: number;
    code: string;
  } | null>(null);
  // Referral code persists through overlay dismissal so it can be passed to AuthModal
  const [pendingReferralCode, setPendingReferralCode] = useState<string | undefined>();

  // Card deck preference
  const { selectedDeck, selectDeck, getCardBackStyle, addCustomDeck, allDecks } = useCardDeck();

  // Notifications state
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Deposit address fetched from backend
  const [depositAddress, setDepositAddress] = useState('');

  // Fetch deposit address from backend
  useEffect(() => {
    if (getToken()) {
      paymentsApi.getDepositAddress().then((data: any) => {
        if (data?.address) setDepositAddress(data.address);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // Responsible gambling - session tracking
  const [sessionBets, setSessionBets] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [sessionWins, setSessionWins] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await gameApi.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread || 0);
    } catch { }
  }, []);

  // Detect ?ref=CODE on load — validate, store in sessionStorage, show welcome overlay
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (!refCode || isAuthenticated) return;

    // Persist code so it survives page refresh before registration
    sessionStorage.setItem('pcasino_ref_code', refCode);

    // Validate and fetch referrer info
    fetch(`/api/referrals/validate/${encodeURIComponent(refCode)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.valid && data.referrerUsername) {
          setPendingReferralCode(refCode);
          setReferralOverlay({
            referrerUsername: data.referrerUsername,
            welcomeBonus: data.welcomeBonus ?? 50000000,
            code: refCode,
          });
        } else {
          // Validation failed — clear invalid code so stale UX is not shown
          sessionStorage.removeItem('pcasino_ref_code');
        }
      })
      .catch(() => {});

    // Clean ref from URL without reload
    const clean = new URL(window.location.href);
    clean.searchParams.delete('ref');
    window.history.replaceState({}, '', clean.toString());
  }, [isAuthenticated]);

  // Handle OAuth callback from URL params (?oauth_token=...&oauth_provider=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    const oauthProvider = params.get('oauth_provider');
    const oauthError = params.get('oauth_error');

    if (oauthError) {
      const errMsgs: Record<string, string> = {
        google_not_configured: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        discord_not_configured: 'Discord OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.',
        twitter_not_configured: 'Twitter OAuth not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET.',
        google_failed: 'Google login failed. Please try again.',
        discord_failed: 'Discord login failed. Please try again.',
        twitter_failed: 'Twitter login failed. Please try again.',
        cancelled: 'Login cancelled.',
      };
      toast.error(errMsgs[oauthError] || `OAuth error: ${oauthError}`);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauthToken && oauthProvider) {
      setToken(oauthToken);
      window.history.replaceState({}, '', window.location.pathname);
      authApi.me().then(data => {
        if (data.user) {
          const userData: UnifiedUser = {
            id: data.user.id, username: data.user.username, email: data.user.email,
            walletAddress: data.user.walletAddress, socialProvider: data.user.socialProvider,
            balance: data.user.balance, avatar: data.user.avatar || 'wizard',
            socialAvatarUrl: data.user.socialAvatarUrl || undefined,
            isAdmin: data.user.isAdmin, vipTier: data.user.vipTier,
            totpEnabled: data.user.totpEnabled, withdrawAddress: data.user.withdrawAddress,
            emailVerified: data.user.emailVerified,
          };
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('pcasino_user', JSON.stringify(userData));
          toast.success(`Logged in with ${oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1)}! Welcome, ${userData.username}!`);
          fetchNotifications();
        }
      }).catch(() => {
        toast.error('Failed to complete login. Please try again.');
        clearToken();
      });
    }
  }, []);

  // Check for existing session via JWT token
  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.me().then(data => {
        if (data.user) {
          setUser({
            id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            walletAddress: data.user.walletAddress,
            socialProvider: data.user.socialProvider,
            balance: data.user.balance,
            avatar: data.user.avatar || 'wizard',
            isAdmin: data.user.isAdmin,
            vipTier: data.user.vipTier,
            totpEnabled: data.user.totpEnabled,
            withdrawAddress: data.user.withdrawAddress,
            dailyDepositLimit: data.user.dailyDepositLimit,
            dailyLossLimit: data.user.dailyLossLimit,
            emailVerified: data.user.emailVerified,
          } as any);
          setIsAuthenticated(true);
          // Load transactions from DB
          paymentsApi.getTransactions({ limit: 100 }).then(txData => {
            if (txData.transactions) {
              setTransactions(txData.transactions.map((t: any) => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                game: t.game,
                timestamp: new Date(t.created_at),
                status: t.status || 'confirmed',
              })));
            }
          }).catch(() => {
            // Fall back to localStorage transactions
            const storedTxs = localStorage.getItem('pcasino_transactions');
            if (storedTxs) setTransactions(JSON.parse(storedTxs));
          });
          fetchNotifications();
        }
      }).catch(() => {
        // Token invalid, clear it
        clearToken();
        const storedUser = localStorage.getItem('pcasino_user');
        const storedTxs = localStorage.getItem('pcasino_transactions');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
        if (storedTxs) setTransactions(JSON.parse(storedTxs));
      });
    } else {
      // No token - use localStorage for offline/guest state
      const storedUser = localStorage.getItem('pcasino_user');
      const storedTxs = localStorage.getItem('pcasino_transactions');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
      if (storedTxs) setTransactions(JSON.parse(storedTxs));
    }
  }, [fetchNotifications]);

  // Poll notifications every 30s when logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // Unified login - all methods go to same profile
  const handleUnifiedLogin = async (
    method: 'wallet' | 'google' | 'twitter' | 'discord' | 'telegram',
    data?: { address?: string; email?: string; username?: string }
  ) => {
    if (method === 'wallet' && data?.address && user) {
      // Link wallet to existing profile
      try {
        await authApi.updateProfile({ walletAddress: data.address });
      } catch { }
      const updated = { ...user, walletAddress: data.address } as any;
      setUser(updated);
      localStorage.setItem('pcasino_user', JSON.stringify(updated));
      toast.success('Wallet linked to your profile!');
      setShowWalletModal(false);
      return;
    }

    // Social login via DB
    try {
      const apiData = await authApi.social({
        provider: method === 'wallet' ? 'wallet' : method,
        username: data?.username || `Player${Math.floor(Math.random() * 10000)}`,
        email: data?.email,
        socialId: data?.address || data?.username,
      });
      if (apiData.token) {
        setToken(apiData.token);
        const u = apiData.user;
        const userData = {
          id: u.id, username: u.username, email: u.email,
          walletAddress: u.walletAddress, socialProvider: u.socialProvider,
          balance: u.balance, avatar: u.avatar || 'wizard',
          isAdmin: u.isAdmin, vipTier: u.vipTier,
          totpEnabled: u.totpEnabled, withdrawAddress: u.withdrawAddress,
          dailyDepositLimit: u.dailyDepositLimit, dailyLossLimit: u.dailyLossLimit,
          emailVerified: u.emailVerified,
        } as any;
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('pcasino_user', JSON.stringify(userData));
        toast.success(`Welcome! 1B $Pc bonus ready!`);
        fetchNotifications();
      }
    } catch (err: any) {
      // Fallback to localStorage if API is down
      const existingUser = localStorage.getItem('pcasino_user');
      if (!existingUser) {
        const username = data?.username || `Player${Math.floor(Math.random() * 10000)}`;
        const userData = {
          id: `user_${Date.now()}`,
          username, email: data?.email,
          walletAddress: data?.address,
          socialProvider: method !== 'wallet' ? method : undefined,
          balance: 1_000_000_000,
          avatar: 'wizard', isAdmin: false,
        } as any;
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('pcasino_user', JSON.stringify(userData));
        addTransaction('deposit', 1_000_000_000, 'Welcome Bonus');
        toast.success('Welcome! 1B $Pc bonus added!');
      } else {
        const userData = JSON.parse(existingUser);
        setUser(userData);
        setIsAuthenticated(true);
        toast.success(`${method.charAt(0).toUpperCase() + method.slice(1)} connected!`);
      }
    }

    setShowAuth(false);
    setShowWalletModal(false);
  };

  const handleWalletConnect = (_walletType: string, address: string) => {
    handleUnifiedLogin('wallet', { address });
  };

  const handleEmailLogin = (u: any) => {
    const userData = {
      id: u.id, username: u.username, email: u.email,
      walletAddress: u.walletAddress, socialProvider: u.socialProvider,
      balance: u.balance ?? 1_000_000_000,
      avatar: u.avatar || 'wizard',
      isAdmin: u.isAdmin, vipTier: u.vipTier,
      totpEnabled: u.totpEnabled, withdrawAddress: u.withdrawAddress,
      dailyDepositLimit: u.dailyDepositLimit, dailyLossLimit: u.dailyLossLimit,
      emailVerified: u.emailVerified,
    } as any;
    setUser(userData);
    setIsAuthenticated(true);
    setPendingReferralCode(undefined);
    localStorage.setItem('pcasino_user', JSON.stringify(userData));
    fetchNotifications();
    toast.success(`Welcome, ${userData.username}! 🎰`);
    setShowAuth(false);
  };

  // Socket event handlers for payment confirmation and cashback
  useEffect(() => {
    const socket = getSocket();
    const onDepositConfirmed = ({ amount, balance: newBal }: any) => {
      if (newBal !== undefined) updateBalance(newBal);
      else if (user) updateBalance(user.balance + amount);
      addTransaction('deposit', amount, 'Auto-credited');
      toast.success(`✅ Deposit of ${parseInt(amount).toLocaleString()} $Pc confirmed — your balance has been updated`, { duration: 8000 });
      fetchNotifications();
    };
    const onCashbackCredited = ({ amount, tier }: any) => {
      if (user) updateBalance(user.balance + amount);
      addTransaction('deposit', amount, 'VIP Cashback');
      toast.success(`💎 ${tier?.toUpperCase()} cashback: ${parseInt(amount).toLocaleString()} $Pc credited!`, { duration: 8000 });
      fetchNotifications();
    };
    const onPaymentRefund = ({ amount }: any) => {
      if (user) updateBalance(user.balance + amount);
      addTransaction('deposit', amount, 'Dispute Refund');
      toast.success(`↩️ Refund of ${parseInt(amount).toLocaleString()} $Pc credited!`);
    };
    const onJackpotWon = (payload: { userId: number | string; username: string; amount: number; newJackpot: number; timestamp: number }) => {
      if (user && String(user.id) === String(payload.userId)) {
        updateBalance(user.balance + payload.amount);
        setJackpotCelebration({ amount: payload.amount, username: payload.username });
        fetchNotifications();
      }
    };
    socket.on('payment:deposit:confirmed', onDepositConfirmed);
    socket.on('cashback:credited', onCashbackCredited);
    socket.on('payment:refund', onPaymentRefund);
    socket.on('jackpot:won', onJackpotWon);
    return () => {
      socket.off('payment:deposit:confirmed', onDepositConfirmed);
      socket.off('cashback:credited', onCashbackCredited);
      socket.off('payment:refund', onPaymentRefund);
      socket.off('jackpot:won', onJackpotWon);
    };
  }, [user?.id]);

  // Redirect to OAuth providers (only Google and Discord are live)
  const handleOAuthRedirect = (provider: 'google' | 'discord') => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  const handleSocialConnect = (provider: 'google' | 'twitter' | 'discord' | 'telegram') => {
    if (provider === 'google' || provider === 'discord') {
      handleOAuthRedirect(provider);
      return;
    }
    // Twitter and Telegram are "Coming Soon" — do nothing
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { }
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('pcasino_user');
    toast.success('Logged out successfully');
  };

  // Transaction management
  const addTransaction = (type: Transaction['type'], amount: number, game?: string) => {
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type,
      amount,
      game,
      timestamp: new Date(),
      status: 'confirmed',
    };
    const updated = [newTx, ...transactions].slice(0, 100);
    setTransactions(updated);
    localStorage.setItem('pcasino_transactions', JSON.stringify(updated));
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      const updated = { ...user, balance: newBalance };
      setUser(updated);
      localStorage.setItem('pcasino_user', JSON.stringify(updated));
    }
  };

  // Betting functions
  const handleBet = (amount: number): boolean => {
    if (!user) { toast.error('Please login to play'); return false; }

    // Self-exclusion check
    if ((user as any).selfExcluded) {
      toast.error('Your account is self-excluded. Contact support to reinstate.');
      return false;
    }

    // Daily loss limit enforcement
    const dailyLossLimit = (user as any).dailyLossLimit;
    if (dailyLossLimit && dailyLossLimit > 0 && sessionLosses >= dailyLossLimit) {
      toast.error(`Daily loss limit of ${dailyLossLimit.toLocaleString()} $Pc reached. Responsible gaming limit active.`);
      return false;
    }

    if (amount > user.balance) {
      toast.error('Insufficient balance!');
      return false;
    }

    updateBalance(user.balance - amount);
    setSessionBets(prev => prev + amount);
    addTransaction('bet', amount, currentView === 'lobby' ? undefined : currentView);
    // Record to DB asynchronously
    if (getToken()) {
      paymentsApi.recordTransaction({ type: 'bet', amount, game: currentView === 'lobby' ? undefined : currentView })
        .then(res => {
          if (res.balance !== undefined) updateBalance(res.balance);
        })
        .catch(() => {});
    }
    return true;
  };

  const handleWin = (amount: number) => {
    if (user) {
      const betAmount = 0; // Net gain is tracked separately
      updateBalance(user.balance + amount);
      setSessionWins(prev => prev + amount);
      addTransaction('win', amount, currentView === 'lobby' ? undefined : currentView);
      toast.success(`You won ${amount.toLocaleString()} $Pc!`);
      const gameLabel = currentView === 'lobby' ? 'Casino' : currentView;
      // Record to DB asynchronously
      if (getToken()) {
        paymentsApi.recordTransaction({ type: 'win', amount, game: currentView === 'lobby' ? undefined : currentView })
          .then(res => {
            if (res.balance !== undefined) updateBalance(res.balance);
          })
          .catch(() => {});
        // Save game history
        gameApi.saveGameHistory({
          game: gameLabel,
          result: 'win',
          winAmount: amount,
          net: amount - betAmount,
        }).catch(() => {});
        // Record win to leaderboard DB
        gameApi.recordWin({ amount, game: gameLabel }).catch(() => {});
      }
      getSocket().emit('game:win', {
        amount,
        game: gameLabel,
        username: user.username,
        userId: parseInt(user.id),
      });
    }
  };

  // Track a loss (called when a bet resolves as a loss)
  const handleLoss = useCallback((amount: number) => {
    setSessionLosses(prev => prev + amount);
    const dailyLossLimit = (user as any)?.dailyLossLimit;
    if (dailyLossLimit && dailyLossLimit > 0) {
      const newTotal = sessionLosses + amount;
      if (newTotal >= dailyLossLimit * 0.8 && newTotal < dailyLossLimit) {
        toast.warning(`⚠️ You're approaching your daily loss limit (${Math.round((newTotal / dailyLossLimit) * 100)}% used)`);
      }
    }
  }, [user, sessionLosses]);

  // Deposit — submit a real deposit request
  const handleDeposit = async (amount: number, txHash?: string) => {
    if (user) {
      if (getToken()) {
        try {
          await paymentsApi.requestDeposit({ amount, txHash });
          addTransaction('deposit', amount);
          toast.success(`Deposit request for ${amount.toLocaleString()} $Pc submitted! Pending review.`, { duration: 5000 });
          fetchNotifications();
        } catch (err: any) {
          toast.error(err.message || 'Deposit request failed');
        }
      } else {
        // Fallback for unauthenticated state
        updateBalance(user.balance + amount);
        addTransaction('deposit', amount);
        toast.success(`Deposited ${amount.toLocaleString()} $Pc`);
      }
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!user) return false;
    if (amount > user.balance) { toast.error('Insufficient balance!'); return false; }

    const withdrawAddr = (user as any).withdrawAddress;
    if (!withdrawAddr) {
      toast.error('Please save a withdrawal address in your profile first.');
      setShowProfile(true);
      return false;
    }

    if (getToken()) {
      try {
        await paymentsApi.requestWithdraw({ amount, toAddress: withdrawAddr });
        updateBalance(user.balance - amount);
        addTransaction('withdraw', amount);
        toast.success(`Withdrawal of ${amount.toLocaleString()} $Pc submitted! Processing within 24-48h.`, { duration: 6000 });
        fetchNotifications();
        return true;
      } catch (err: any) {
        toast.error(err.message || 'Withdrawal failed');
        return false;
      }
    } else {
      updateBalance(user.balance - amount);
      addTransaction('withdraw', amount);
      toast.success(`Withdrew ${amount.toLocaleString()} $Pc`);
      return true;
    }
  };

  // Dev mode reload - add $Pc for testing
  const handleDevReload = (amount: number) => {
    if (user) {
      updateBalance(user.balance + amount);
      addTransaction('deposit', amount, 'Dev Reload');
      toast.success(`[DEV] Added ${amount.toLocaleString()} $Pc!`);
    }
  };

  // In-game $Pc reload (used from InGameTopBar quick-buy)
  const handleAddBalance = (amount: number) => {
    if (user) {
      updateBalance(user.balance + amount);
      addTransaction('deposit', amount, 'Quick Reload');
      const fmt = amount >= 1_000_000 ? `${(amount / 1_000_000).toFixed(0)}M` : amount.toLocaleString();
      toast.success(`${fmt} $Pc added to your balance!`);
    }
  };

  // Daily bonus - DB-backed
  const claimDailyBonus = async () => {
    if (dailyBonusClaimed) {
      toast.error('Daily bonus already claimed today!');
      return;
    }
    if (user) {
      if (getToken()) {
        try {
          const data = await gameApi.claimDailyBonus();
          if (data.success) {
            updateBalance(data.balance ?? user.balance + 50_000_000);
            addTransaction('deposit', data.bonus || 50_000_000, 'Daily Bonus');
            setDailyBonusClaimed(true);
            toast.success(`🎁 Claimed ${(data.bonus || 50_000_000).toLocaleString()} $Pc daily bonus!`);
            fetchNotifications();
          }
        } catch (err: any) {
          const msg = err?.message || '';
          if (msg.includes('already claimed')) {
            setDailyBonusClaimed(true);
            toast.error('Daily bonus already claimed today!');
          } else {
            // Fallback to local state
            updateBalance(user.balance + 50_000_000);
            addTransaction('deposit', 50_000_000, 'Daily Bonus');
            setDailyBonusClaimed(true);
            toast.success('Claimed 50M $Pc daily bonus!');
          }
        }
      } else {
        updateBalance(user.balance + 50_000_000);
        addTransaction('deposit', 50_000_000, 'Daily Bonus');
        setDailyBonusClaimed(true);
        toast.success('Claimed 50M $Pc daily bonus!');
      }
    }
  };

  // Check daily bonus status from DB on login
  useEffect(() => {
    if (!isAuthenticated || !getToken()) return;
    gameApi.getDailyBonus()
      .then((data: any) => { if (data.claimed) setDailyBonusClaimed(true); })
      .catch(() => {
        const lastClaim = localStorage.getItem('pcasino_daily_bonus_claimed');
        if (lastClaim) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          if (new Date(lastClaim) >= today) setDailyBonusClaimed(true);
        }
      });
  }, [isAuthenticated]);

  // Game selection
  const handleSelectGame = (game: GameType) => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setCurrentView(game);
  };

  // Open a legal page
  const handleShowLegal = (page: string) => {
    setLegalPage((page as LegalPage) || 'terms');
    setShowLegal(true);
  };

  // Tournament deduction
  const handleTournamentDeduction = (amount: number) => {
    if (user) {
      updateBalance(user.balance - amount);
      addTransaction('bet', amount, 'Tournament Entry');
    }
  };

  // Share to social media
  const handleShare = (platform: 'twitter' | 'discord' | 'copy') => {
    const text = `I'm playing at $Pc Casino! Join me and get a welcome bonus! 🎰💰`;
    const url = window.location.origin;
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'discord':
        toast.info('Share this link with your Discord friends!');
        break;
      case 'copy':
        navigator.clipboard.writeText(`${text} ${url}`);
        toast.success('Link copied to clipboard!');
        break;
    }
    setShowShare(false);
  };

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'poker':
        return (
          <PokerGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
            cardBackStyle={getCardBackStyle()}
          />
        );
      case 'blackjack':
        return (
          <BlackjackGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            cardBackStyle={getCardBackStyle()}
            onOpenProvablyFair={prefill => { setProvablyFairPrefill(prefill); setShowProvablyFair(true); }}
          />
        );
      case 'roulette':
        return (
          <RouletteGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onOpenProvablyFair={prefill => { setProvablyFairPrefill(prefill); setShowProvablyFair(true); }}
          />
        );
      case 'craps':
        return (
          <IframeGameWrapper
            gameId="craps"
            gameName="Craps & Dice"
            gameEmoji="🎲"
            gamePath="/games/craps/index.html"
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onShowWallet={() => setShowDeposit(true)}
          />
        );
      case 'spades':
        return (
          <SpadesGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
            cardBackStyle={getCardBackStyle()}
          />
        );
      case 'slots':
        return (
          <SlotsGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
            onOpenProvablyFair={prefill => { setProvablyFairPrefill(prefill); setShowProvablyFair(true); }}
          />
        );
      case 'bingo':
        return (
          <BingoGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
          />
        );
      case 'dominoes':
        return (
          <DominoesGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
            cardBackStyle={getCardBackStyle()}
          />
        );
      case 'horse-racing':
        return (
          <IframeGameWrapper
            gameId="horse-racing"
            gameName="Horse Racing"
            gameEmoji="🏇"
            gamePath="/games/horse-racing/index.html"
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onShowWallet={() => setShowDeposit(true)}
          />
        );
      case 'pool':
        return (
          <PoolGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
          />
        );
      case 'darts':
        return (
          <DartsGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
            onShowWallet={() => setShowDeposit(true)}
          />
        );
      case 'sports':
        return (
          <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #060d1a 100%)' }}>
            <InGameTopBar
              gameName="⚽ Sportsbook"
              balance={user?.balance || 0}
              onBack={() => setCurrentView('lobby')}
              onShowWallet={() => setShowDeposit(true)}
            />
            <Sportsbook
              balance={user?.balance || 0}
              isAuthenticated={!!user}
              onPlaceBet={(_event, _selection, amount) => {
                if (!user) { toast.error('Please login to place bets'); return false; }
                if (amount > user.balance) { toast.error('Insufficient balance!'); return false; }
                updateBalance(user.balance - amount);
                addTransaction('bet', amount, 'sports');
                if (getToken()) {
                  paymentsApi.recordTransaction({ type: 'bet', amount, game: 'sports' })
                    .then(res => { if (res.balance !== undefined) updateBalance(res.balance); })
                    .catch(() => {});
                }
                return true;
              }}
            />
          </div>
        );
      case 'vip':
        return (
          <VipArea
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onSelectGame={(game) => setCurrentView(game)}
          />
        );
      default:
        return (
          <>
            <HeroSection
              onScrollToGames={() => document.getElementById('games-section')?.scrollIntoView({ behavior: 'smooth' })}
              onOpenDeposit={() => setShowDeposit(true)}
            />
            <div className="flex justify-center py-3 px-4">
              <JackpotTicker onJackpotWin={(amount) => { if (!jackpotCelebration) toast.success(`🎰 Jackpot won: ${amount.toLocaleString()} $Pc!`, { duration: 6000 }); }} />
            </div>
            <GamesGrid onSelectGame={handleSelectGame} />
            <Leaderboard />
            <WeParlaySection userBalance={user?.balance || 0} onSelectVip={() => handleSelectGame('vip')} />
            <RecentWinners />
            
            {/* Footer */}
            <footer className="border-t border-[#5D4037]/30 py-12 px-4">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <img src="/logos/pc-logo.png" alt="$Pc" className="w-8 h-8" />
                      <span className="font-casino font-bold text-[#D4AF37]">$Pc CASINO</span>
                    </div>
                    <p className="text-sm text-[#808080]">
                      The future of gaming with $Pc token. Play poker, casino games, and sportsbook with worldwide rules.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#D4AF37] mb-4">Games</h4>
                    <ul className="space-y-2 text-sm text-[#808080]">
                      <li><button onClick={() => handleSelectGame('poker')} className="hover:text-[#D4AF37] transition-colors">Texas Hold'em</button></li>
                      <li><button onClick={() => handleSelectGame('blackjack')} className="hover:text-[#D4AF37] transition-colors">Blackjack</button></li>
                      <li><button onClick={() => handleSelectGame('roulette')} className="hover:text-[#D4AF37] transition-colors">Roulette</button></li>
                      <li><button onClick={() => handleSelectGame('craps')} className="hover:text-[#D4AF37] transition-colors">Craps</button></li>
                      <li><button onClick={() => handleSelectGame('spades')} className="hover:text-[#D4AF37] transition-colors">Spades</button></li>
                      <li><button onClick={() => handleSelectGame('bingo')} className="hover:text-[#D4AF37] transition-colors">Bingo 75-Ball</button></li>
                      <li><button onClick={() => handleSelectGame('dominoes')} className="hover:text-[#D4AF37] transition-colors">Dominoes</button></li>
                      <li><button onClick={() => handleSelectGame('horse-racing')} className="hover:text-[#D4AF37] transition-colors">Horse Racing</button></li>
                      <li><button onClick={() => handleSelectGame('pool')} className="hover:text-[#D4AF37] transition-colors">Pool Table</button></li>
                      <li><button onClick={() => handleSelectGame('darts')} className="hover:text-[#D4AF37] transition-colors">Darts</button></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#D4AF37] mb-4">Support & Legal</h4>
                    <ul className="space-y-2 text-sm text-[#808080]">
                      <li><button onClick={() => setShowProvablyFair(true)} className="hover:text-[#D4AF37] transition-colors text-left">Provably Fair</button></li>
                      <li><button onClick={() => handleShowLegal('rules')} className="hover:text-[#D4AF37] transition-colors text-left">Game Rules</button></li>
                      <li><button onClick={() => handleShowLegal('responsible')} className="hover:text-[#D4AF37] transition-colors text-left">Responsible Gaming</button></li>
                      <li><button onClick={() => handleShowLegal('crypto')} className="hover:text-[#D4AF37] transition-colors text-left">Crypto & Money Rules</button></li>
                      <li><button onClick={() => handleShowLegal('malfunction')} className="hover:text-[#D4AF37] transition-colors text-left">Malfunction Policy</button></li>
                      <li><button onClick={() => handleShowLegal('terms')} className="hover:text-[#D4AF37] transition-colors text-left">Terms of Service</button></li>
                      <li><button onClick={() => handleShowLegal('privacy')} className="hover:text-[#D4AF37] transition-colors text-left">Privacy Policy</button></li>
                      <li><button onClick={() => handleShowLegal('aml')} className="hover:text-[#D4AF37] transition-colors text-left">AML / KYC Policy</button></li>
                      <li><button onClick={() => { if (isAuthenticated) { setShowDispute(true); } else { setShowAuth(true); } }} className="hover:text-[#D4AF37] transition-colors text-left">File a Dispute</button></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#D4AF37] mb-4">Connect</h4>
                    <div className="flex gap-3">
                      <button onClick={() => handleShare('twitter')} className="w-10 h-10 rounded-full bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/40 border border-[#1DA1F2]/30 flex items-center justify-center transition-colors">
                        <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                      </button>
                      <button onClick={() => handleShare('discord')} className="w-10 h-10 rounded-full bg-[#5865F2]/20 hover:bg-[#5865F2]/40 border border-[#5865F2]/30 flex items-center justify-center transition-colors">
                        <MessageCircle className="w-5 h-5 text-[#5865F2]" />
                      </button>
                      <button onClick={() => setShowShare(true)} className="w-10 h-10 rounded-full bg-[#D4AF37]/20 hover:bg-[#D4AF37]/40 border border-[#D4AF37]/30 flex items-center justify-center transition-colors">
                        <Share2 className="w-5 h-5 text-[#D4AF37]" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-t border-[#5D4037]/30 pt-8 text-center text-sm text-[#808080]">
                  <div className="flex flex-wrap justify-center gap-4 mb-4 text-xs">
                    <button onClick={() => handleShowLegal('terms')} className="hover:text-[#D4AF37] transition-colors">Terms of Service</button>
                    <button onClick={() => handleShowLegal('privacy')} className="hover:text-[#D4AF37] transition-colors">Privacy Policy</button>
                    <button onClick={() => handleShowLegal('crypto')} className="hover:text-[#D4AF37] transition-colors">Crypto & Money Rules</button>
                    <button onClick={() => handleShowLegal('malfunction')} className="hover:text-[#D4AF37] transition-colors">Malfunction Policy</button>
                    <button onClick={() => handleShowLegal('aml')} className="hover:text-[#D4AF37] transition-colors">AML/KYC</button>
                    <button onClick={() => handleShowLegal('responsible')} className="hover:text-[#D4AF37] transition-colors">Responsible Gaming</button>
                    <button onClick={() => handleShowLegal('cookies')} className="hover:text-[#D4AF37] transition-colors">Cookies</button>
                  </div>
                  <p>&copy; 2026 $Pc Casino. All rights reserved. 18+ Only. Gamble Responsibly.</p>
                  <p className="mt-2">Powered by $Pc Token • <a href="https://pawncoinpc.com" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">pawncoinpc.com</a></p>
                  <p className="mt-1 text-xs opacity-50">$Pc is a digital entertainment token. Not financial advice. Cryptocurrency values fluctuate. Past winnings do not guarantee future results.</p>
                </div>
              </div>
            </footer>
          </>
        );
    }
  };

  // Render poker hand share page if URL matches
  if (pokerShareToken) {
    return (
      <GlobalGameProvider balance={0}>
        <div className="min-h-screen">
          <CasinoBackground />
          <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(212,175,55,0.5)', color: 'white' } }} />
          <PokerHandSharePage
            token={pokerShareToken}
            onBack={() => {
              setPokerShareToken(null);
              window.history.replaceState({}, '', '/');
              setCurrentView('lobby');
            }}
          />
        </div>
      </GlobalGameProvider>
    );
  }

  return (
    <GlobalGameProvider balance={user?.balance || 0}>
    <div className="min-h-screen">
      <CasinoBackground />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 10, 0.95)',
            border: '1px solid rgba(212, 175, 55, 0.5)',
            color: 'white',
          },
        }}
      />
      
      {currentView === 'lobby' && (
        <Navigation
          user={user}
          isAuthenticated={isAuthenticated}
          balance={user?.balance || 0}
          avatarDef={userAvatarDef}
          unreadNotifications={unreadCount}
          onConnect={() => setShowAuth(true)}
          onConnectWallet={() => setShowWalletModal(true)}
          onDisconnect={logout}
          onShowHistory={() => setShowHistory(true)}
          onShowRewards={() => setShowRewards(true)}
          onShowFinancial={() => setShowFinancial(true)}
          onShowCardDeck={() => setShowCardDeck(true)}
          onShowMultiplayer={() => setShowLobby(true)}
          onShowProfile={() => setShowProfile(true)}
          onShowAdmin={() => setShowAdmin(true)}
          onShowDeposit={() => setShowDeposit(true)}
          onShowWithdraw={() => setShowWithdraw(true)}
          onShowTournaments={() => setShowTournaments(true)}
          onShowReferral={() => setShowReferral(true)}
          onShowLegal={handleShowLegal}
          isAdmin={user?.isAdmin === true}
        />
      )}

      <div id="app-content">
        {renderView()}
      </div>

      {/* Referral welcome overlay — shown when ?ref=CODE is detected for non-authenticated visitors */}
      {referralOverlay && !isAuthenticated && (
        <ReferralWelcomeOverlay
          referrerUsername={referralOverlay.referrerUsername}
          welcomeBonus={referralOverlay.welcomeBonus}
          onRegister={() => {
            setReferralOverlay(null);
            setShowAuth(true);
          }}
          onDismiss={() => setReferralOverlay(null)}
        />
      )}

      {/* Auth Modal - Email/Social/Wallet */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onConnect={handleSocialConnect}
        onEmailLogin={handleEmailLogin}
        onWalletConnect={() => {
          setShowAuth(false);
          setShowWalletModal(true);
        }}
        initialReferralCode={pendingReferralCode}
      />

      {/* Wallet Connect Modal */}
      <WalletConnect
        isConnected={isAuthenticated && !!user?.walletAddress}
        walletAddress={user?.walletAddress || null}
        balance={user?.balance || 0}
        onConnect={handleWalletConnect}
        onDisconnect={() => {
          if (user) {
            const updated = { ...user, walletAddress: undefined };
            setUser(updated);
            localStorage.setItem('pcasino_user', JSON.stringify(updated));
          }
        }}
      />

      {/* Deposit Modal */}
      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent 
          className="max-w-md"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-gradient-gold">Deposit $Pc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="p-4 rounded-xl"
              style={{ 
                background: 'rgba(20,20,20,0.8)',
                border: '1px solid rgba(93,64,55,0.5)'
              }}
            >
              <div className="text-sm text-[#808080] mb-2">Your Deposit Address</div>
              <code className="block p-3 rounded-lg bg-black/50 text-xs break-all text-[#D4AF37]">
                {depositAddress || 'Loading deposit address…'}
              </code>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map(amount => (
                <button
                  key={amount}
                  onClick={() => handleDeposit(amount)}
                  className="p-3 rounded-lg bg-[#5D4037]/30 hover:bg-[#5D4037]/50 border border-[#5D4037]/50 text-center transition-colors"
                >
                  <div className="font-bold text-[#D4AF37]">{amount}</div>
                  <div className="text-xs text-[#808080]">$Pc</div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent 
          className="max-w-md"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(183,28,28,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-[#EF5350]">Withdraw $Pc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="p-4 rounded-xl"
              style={{ 
                background: 'rgba(20,20,20,0.8)',
                border: '1px solid rgba(93,64,55,0.5)'
              }}
            >
              <div className="text-sm text-[#808080] mb-2">Available Balance</div>
              <div className="text-2xl font-bold text-[#D4AF37]">
                {user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map(amount => (
                <button
                  key={amount}
                  onClick={() => handleWithdraw(amount)}
                  disabled={!user || amount > user.balance}
                  className="p-3 rounded-lg bg-[#5D4037]/30 hover:bg-[#5D4037]/50 disabled:opacity-50 disabled:cursor-not-allowed border border-[#5D4037]/50 text-center transition-colors"
                >
                  <div className="font-bold text-[#D4AF37]">{amount}</div>
                  <div className="text-xs text-[#808080]">$Pc</div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent 
          className="max-w-md max-h-[80vh]"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-[#D4AF37] flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="text-center text-[#808080] py-8">No transactions yet</div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#5D4037]/20 border border-[#5D4037]/30"
                  >
                    <div>
                      <div className="font-bold capitalize text-white">{tx.type}</div>
                      <div className="text-xs text-[#808080]">
                        {tx.game || ''} • {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`font-bold ${
                      tx.type === 'win' || tx.type === 'deposit' ? 'text-[#43A047]' : 'text-[#EF5350]'
                    }`}>
                      {tx.type === 'win' || tx.type === 'deposit' ? '+' : '-'}
                      {tx.amount} $Pc
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Rewards Modal */}
      <Dialog open={showRewards} onOpenChange={setShowRewards}>
        <DialogContent 
          className="max-w-md"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-[#D4AF37] flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Rewards Center
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="p-4 rounded-xl border border-[#D4AF37]/30"
              style={{ 
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))'
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Gift className="w-6 h-6 text-[#D4AF37]" />
                <span className="font-bold text-white">Daily Bonus</span>
              </div>
              <p className="text-sm text-[#808080] mb-3">Claim your free daily $Pc reward</p>
              <Button
                onClick={claimDailyBonus}
                disabled={dailyBonusClaimed}
                className="w-full btn-primary"
              >
                {dailyBonusClaimed ? 'Already Claimed' : 'Claim 50M $Pc'}
              </Button>
            </div>
            
            <div 
              className="p-4 rounded-xl border border-[#5D4037]/30"
              style={{ background: 'rgba(20,20,20,0.8)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Share2 className="w-6 h-6 text-[#1E88E5]" />
                <span className="font-bold text-white">Referral Bonus</span>
              </div>
              <p className="text-sm text-[#808080] mb-3">Invite friends and earn 100 $Pc per referral</p>
              <Button
                onClick={() => setShowShare(true)}
                variant="outline"
                className="w-full border-[#D4AF37]/50 text-[#D4AF37]"
              >
                Share Referral Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Financial Modal */}
      <FinancialModal
        isOpen={showFinancial}
        onClose={() => setShowFinancial(false)}
        balance={user?.balance || 0}
        transactions={transactions}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onDevReload={handleDevReload}
        withdrawAddress={user?.withdrawAddress}
        depositAddress={depositAddress}
        onSaveWithdrawAddress={(address) => {
          if (user) {
            const updated = { ...user, withdrawAddress: address };
            setUser(updated);
            localStorage.setItem('pcasino_user', JSON.stringify(updated));
          }
        }}
      />

      {/* Card Deck Selector */}
      <CardDeckSelector
        isOpen={showCardDeck}
        onClose={() => setShowCardDeck(false)}
        selectedDeck={selectedDeck}
        allDecks={allDecks}
        onSelectDeck={selectDeck}
        onUploadDeck={addCustomDeck}
      />

      {/* Share Modal */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent 
          className="max-w-sm"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-[#D4AF37]">Share $Pc Casino</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={() => handleShare('twitter')}
              className="w-full justify-start gap-3 bg-[#1DA1F2] hover:bg-[#1a91da]"
            >
              <Twitter className="w-5 h-5" />
              Share on Twitter
            </Button>
            <Button
              onClick={() => handleShare('discord')}
              className="w-full justify-start gap-3 bg-[#5865F2] hover:bg-[#4752c4]"
            >
              <MessageCircle className="w-5 h-5" />
              Share on Discord
            </Button>
            <Button
              onClick={() => handleShare('copy')}
              variant="outline"
              className="w-full justify-start gap-3 border-[#D4AF37]/50 text-[#D4AF37]"
            >
              <Send className="w-5 h-5" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VappTV Player */}
      <VappTVPlayer isOpen={showVappTV} onClose={() => setShowVappTV(false)} />

      {/* Music Player */}
      <MusicPlayer />

      {/* Multiplayer Lobby */}
      <MultiplayerLobby
        isOpen={showLobby}
        onClose={() => setShowLobby(false)}
        onJoinTable={(tableId, game) => {
          setActiveRoomId(tableId);
          toast.success(`Joined table — loading ${game}!`);
          setCurrentView(game);
        }}
        userBalance={user?.balance || 0}
        username={user?.username || 'Player'}
        userId={user?.id}
      />

      {/* Live Game Room Panel (shows when in a multiplayer room) */}
      {activeRoomId && currentView !== 'lobby' && (
        <GameRoom
          roomId={activeRoomId}
          username={user?.username || 'Player'}
          userId={user?.id}
          onLeave={() => {
            setActiveRoomId(null);
            setCurrentView('lobby');
          }}
        />
      )}

      {/* User Profile Modal */}
      <UserProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user as any}
        transactions={transactions}
        avatarDef={userAvatarDef}
        onShowDeposit={() => { setShowProfile(false); setShowDeposit(true); }}
        onShowWithdraw={() => { setShowProfile(false); setShowWithdraw(true); }}
        onShowReferral={() => { setShowProfile(false); setShowReferral(true); }}
        onShowTournaments={() => { setShowProfile(false); setShowTournaments(true); }}
        onShowLegal={handleShowLegal}
        onShowDispute={() => { setShowProfile(false); setShowDispute(true); }}
      />

      {/* Admin Dashboard */}
      <AdminDashboard
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        isAdmin={user?.isAdmin}
      />

      {/* Legal Pages */}
      <LegalPages
        isOpen={showLegal}
        onClose={() => setShowLegal(false)}
        page={legalPage}
        onChangePage={(p) => setLegalPage(p)}
      />

      {/* Dispute Center */}
      <DisputeCenter
        isOpen={showDispute}
        onClose={() => setShowDispute(false)}
        user={user}
      />

      {/* Tournaments Page */}
      <TournamentsPage
        isOpen={showTournaments}
        onClose={() => setShowTournaments(false)}
        user={user}
        onDeductBalance={handleTournamentDeduction}
      />

      {/* Referral Page */}
      <ReferralPage
        isOpen={showReferral}
        onClose={() => setShowReferral(false)}
        user={user}
      />

      {/* Provably Fair Page */}
      <ProvablyFairPage
        isOpen={showProvablyFair}
        onClose={() => { setShowProvablyFair(false); setProvablyFairPrefill(undefined); }}
        prefill={provablyFairPrefill}
      />

      {/* Quick Action Buttons */}
      {currentView === 'lobby' && (
        <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
          <button
            onClick={() => setShowLobby(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ 
              background: 'rgba(10,10,10,0.9)',
              border: '1px solid rgba(212,175,55,0.4)',
              boxShadow: '0 5px 20px rgba(0,0,0,0.5)'
            }}
            title="Multiplayer Lobby"
          >
            <span className="text-xl">👥</span>
          </button>
          <button
            onClick={() => setShowVappTV(!showVappTV)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ 
              background: 'rgba(10,10,10,0.9)',
              border: '1px solid rgba(212,175,55,0.4)',
              boxShadow: '0 5px 20px rgba(0,0,0,0.5)'
            }}
            title="VappTV"
          >
            <span className="text-xl">📺</span>
          </button>
        </div>
      )}

      {/* Global Lobby Chat */}
      {currentView === 'lobby' && (
        <LobbyChat
          username={user?.username}
          avatar={user?.avatar}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Progressive Jackpot Celebration */}
      {jackpotCelebration && (
        <JackpotCelebration
          amount={jackpotCelebration.amount}
          username={jackpotCelebration.username}
          onClose={() => setJackpotCelebration(null)}
        />
      )}
    </div>
    </GlobalGameProvider>
  );
}

export default App;
