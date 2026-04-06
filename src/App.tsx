import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
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
import { PokerGame } from '@/components/games/PokerGame';
import { BlackjackGame } from '@/components/games/BlackjackGame';
import { RouletteGame } from '@/components/games/RouletteGame';
import { CrapsGame } from '@/components/games/CrapsGame';
import { SpadesGame } from '@/components/games/SpadesGame';
import { SlotsGame } from '@/components/games/SlotsGame';
import { BingoGame } from '@/components/games/BingoGame';
import { DominoesGame } from '@/components/games/DominoesGame';
import { MultiplayerLobby } from '@/components/MultiplayerLobby';
import { GameRoom } from '@/components/GameRoom';
import { VipArea } from '@/components/VipArea';
import { GlobalGameProvider } from '@/contexts/GlobalGameContext';
import { CasinoBackground } from '@/components/CasinoBackground';
import { UserProfile } from '@/components/UserProfile';
import { AdminDashboard } from '@/components/AdminDashboard';
import { LegalPages } from '@/components/LegalPages';
import type { LegalPage } from '@/components/LegalPages';
import { DisputeCenter } from '@/components/DisputeCenter';
import { TournamentsPage } from '@/components/TournamentsPage';
import { ReferralPage } from '@/components/ReferralPage';

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
  socialProvider?: 'google' | 'twitter' | 'discord' | 'telegram';
  balance: number;
  avatar: string;
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

  // Card deck preference
  const { selectedDeck, selectDeck, getCardBackStyle, addCustomDeck, allDecks } = useCardDeck();

  // Check for existing session
  useEffect(() => {
    const storedUser = localStorage.getItem('pcasino_user');
    const storedTxs = localStorage.getItem('pcasino_transactions');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    if (storedTxs) {
      setTransactions(JSON.parse(storedTxs));
    }
  }, []);

  // Unified login - all methods go to same profile
  const handleUnifiedLogin = async (
    method: 'wallet' | 'google' | 'twitter' | 'discord' | 'telegram',
    data?: { address?: string; email?: string; username?: string }
  ) => {
    // Check if user already exists with this identifier
    const existingUser = localStorage.getItem('pcasino_user');
    let userData: UnifiedUser;

    if (existingUser) {
      // Link new login method to existing profile
      userData = JSON.parse(existingUser);
      if (method === 'wallet' && data?.address) {
        userData.walletAddress = data.address;
      } else if (method !== 'wallet') {
        userData.socialProvider = method;
        if (data?.email) userData.email = data.email;
        if (data?.username) userData.username = data.username;
      }
    } else {
      // Create new unified profile
      userData = {
        id: `user_${Date.now()}`,
        username: data?.username || `Player${Math.floor(Math.random() * 10000)}`,
        email: data?.email,
        walletAddress: data?.address,
        socialProvider: method !== 'wallet' ? method : undefined,
        balance: 1_000_000_000, // Welcome bonus (1B $Pc)
        avatar: ['👤', '🎰', '💎', '🎲', '🃏'][Math.floor(Math.random() * 5)],
      };
    }

    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('pcasino_user', JSON.stringify(userData));
    
    if (!existingUser) {
      addTransaction('deposit', 1_000_000_000, 'Welcome Bonus');
      toast.success('Welcome! 1B $Pc bonus added!');
    } else {
      toast.success(`${method.charAt(0).toUpperCase() + method.slice(1)} connected to your profile!`);
    }
    
    setShowAuth(false);
    setShowWalletModal(false);
  };

  const handleWalletConnect = (_walletType: string, address: string) => {
    handleUnifiedLogin('wallet', { address });
  };

  const handleSocialConnect = (provider: 'google' | 'twitter' | 'discord' | 'telegram') => {
    // Simulate social auth
    const mockData = {
      google: { email: 'player@gmail.com', username: 'GooglePlayer' },
      twitter: { email: 'player@twitter.com', username: 'TwitterPlayer' },
      discord: { email: 'player@discord.com', username: 'DiscordPlayer' },
      telegram: { email: 'player@telegram.com', username: 'TelegramPlayer' },
    };
    handleUnifiedLogin(provider, mockData[provider]);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
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
    if (!user || amount > user.balance) {
      toast.error('Insufficient balance!');
      return false;
    }
    updateBalance(user.balance - amount);
    addTransaction('bet', amount, currentView === 'lobby' ? undefined : currentView);
    return true;
  };

  const handleWin = (amount: number) => {
    if (user) {
      updateBalance(user.balance + amount);
      addTransaction('win', amount, currentView === 'lobby' ? undefined : currentView);
      toast.success(`You won ${amount.toLocaleString()} $Pc!`);
    }
  };

  // Deposit/Withdraw
  const handleDeposit = (amount: number) => {
    if (user) {
      updateBalance(user.balance + amount);
      addTransaction('deposit', amount);
      toast.success(`Deposited ${amount.toLocaleString()} $Pc`);
    }
  };

  const handleWithdraw = (amount: number) => {
    if (user && amount <= user.balance) {
      updateBalance(user.balance - amount);
      addTransaction('withdraw', amount);
      toast.success(`Withdrew ${amount.toLocaleString()} $Pc`);
      return true;
    }
    toast.error('Insufficient balance!');
    return false;
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

  // Daily bonus
  const claimDailyBonus = () => {
    if (dailyBonusClaimed) {
      toast.error('Daily bonus already claimed!');
      return;
    }
    if (user) {
      updateBalance(user.balance + 50_000_000);
      addTransaction('deposit', 50_000_000, 'Daily Bonus');
      setDailyBonusClaimed(true);
      toast.success('Claimed 50M $Pc daily bonus!');
    }
  };

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
          />
        );
      case 'craps':
        return (
          <CrapsGame
            balance={user?.balance || 0}
            onBack={() => setCurrentView('lobby')}
            onBet={handleBet}
            onWin={handleWin}
            onAddBalance={handleAddBalance}
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
            cardBackStyle={getCardBackStyle()}
          />
        );
      case 'pool':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a0a 100%)' }}>
            <div className="text-center p-12 rounded-2xl" style={{ border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(0,0,0,0.6)' }}>
              <div className="text-7xl mb-6">🎱</div>
              <h2 className="font-casino text-4xl font-bold mb-3 metallic-gold-text">Pool Table</h2>
              <p className="text-[#A0A0A0] text-lg mb-8">Game coming soon — drop in your build to activate</p>
              <button
                onClick={() => setCurrentView('lobby')}
                className="px-8 py-3 rounded-xl font-bold text-black transition-all"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', boxShadow: '0 0 20px rgba(212,175,55,0.4)' }}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        );
      case 'darts':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0a0a1a 100%)' }}>
            <div className="text-center p-12 rounded-2xl" style={{ border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(0,0,0,0.6)' }}>
              <div className="text-7xl mb-6">🎯</div>
              <h2 className="font-casino text-4xl font-bold mb-3 metallic-gold-text">Darts</h2>
              <p className="text-[#A0A0A0] text-lg mb-8">Game coming soon — drop in your build to activate</p>
              <button
                onClick={() => setCurrentView('lobby')}
                className="px-8 py-3 rounded-xl font-bold text-black transition-all"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', boxShadow: '0 0 20px rgba(212,175,55,0.4)' }}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        );
      case 'sports':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #060d1a 100%)' }}>
            <div className="text-center p-12 rounded-2xl" style={{ border: '1px solid rgba(21,101,192,0.4)', background: 'rgba(0,0,0,0.7)' }}>
              <div className="text-7xl mb-6">🏈</div>
              <h2 className="font-casino text-4xl font-bold mb-3" style={{ color: '#64B5F6' }}>Sports Gambling</h2>
              <p className="text-[#A0A0A0] text-lg mb-8">Powered by WeParlay Inc. — Opening in new tab...</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => { window.open('https://weparlay.com', '_blank', 'noopener,noreferrer'); setCurrentView('lobby'); }}
                  className="px-8 py-3 rounded-xl font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)', boxShadow: '0 0 20px rgba(21,101,192,0.4)' }}
                >
                  Go to WeParlay →
                </button>
                <button
                  onClick={() => setCurrentView('lobby')}
                  className="px-8 py-3 rounded-xl font-bold text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  Back to Lobby
                </button>
              </div>
            </div>
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
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#D4AF37] mb-4">Support & Legal</h4>
                    <ul className="space-y-2 text-sm text-[#808080]">
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
        />
      )}

      <main>
        {renderView()}
      </main>

      {/* Auth Modal - Social Logins */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onConnect={handleSocialConnect}
        onWalletConnect={() => {
          setShowAuth(false);
          setShowWalletModal(true);
        }}
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
                0x742d35Cc6634C0532925a3b8D4C9db96590b8f3a
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
        user={user}
        transactions={transactions}
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
    </div>
    </GlobalGameProvider>
  );
}

export default App;
