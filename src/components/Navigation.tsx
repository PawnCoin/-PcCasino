import { useState, useEffect } from 'react';
import { Menu, X, Wallet, History, Gift, LogOut, User, ChevronDown, DollarSign, BarChart3, Layers, Users, ExternalLink, Shield, UserCircle, AlertTriangle, Star, Home, Trophy, BookOpen, Crown, MessageSquare } from 'lucide-react';
import { CasinoIcon } from '@/components/CasinoIcons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import type { UnifiedUser } from '@/types';
import { PcPriceTicker } from '@/components/PcPriceTicker';
import { formatPcAmount } from '@/utils/formatPc';
import { useGlobalGame } from '@/contexts/GlobalGameContext';

interface NavigationProps {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  balance: number;
  avatarDef?: AvatarDef;
  avatarUrl?: string | null;
  unreadNotifications?: number;
  unreadDmCount?: number;
  onConnect: () => void;
  onConnectWallet: () => void;
  onDisconnect: () => void;
  onShowHistory: () => void;
  onShowRewards: () => void;
  onShowFinancial?: () => void;
  onShowCardDeck?: () => void;
  onShowMultiplayer?: () => void;
  onShowProfile?: () => void;
  onShowAdmin?: () => void;
  onShowDeposit?: () => void;
  onShowWithdraw?: () => void;
  onShowTournaments?: () => void;
  onShowReferral?: () => void;
  onShowLegal?: (page: string) => void;
  onShowPcToken?: () => void;
  onShowVIPCurrency?: () => void;
  isAdmin?: boolean;
}

export function Navigation({ 
  user, 
  isAuthenticated, 
  balance,
  avatarDef,
  avatarUrl,
  unreadNotifications = 0,
  unreadDmCount = 0,
  onConnect, 
  onConnectWallet,
  onDisconnect, 
  onShowHistory, 
  onShowRewards,
  onShowFinancial,
  onShowCardDeck,
  onShowMultiplayer,
  onShowProfile,
  onShowAdmin,
  onShowDeposit,
  onShowWithdraw,
  onShowTournaments,
  onShowReferral,
  onShowLegal,
  onShowPcToken,
  onShowVIPCurrency,
  isAdmin,
}: NavigationProps) {
  const displayAvatar = avatarDef || ALL_AVATARS[0];
  const resolvedAvatarUrl = avatarUrl || user?.avatarUrl || null;
  // Live USD-based VIP threshold (sourced from /api/wallet-threshold via context).
  const { membership: navMembership } = useGlobalGame();
  const navThresholdLabel = navMembership.requiredBalance >= 1_000_000_000
    ? `${(navMembership.requiredBalance / 1_000_000_000).toFixed(2)}B`
    : `${(navMembership.requiredBalance / 1_000_000).toFixed(0)}M`;
  const navUsdLabel = typeof navMembership.usdBasis === 'number'
    ? `$${navMembership.usdBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showWeparlayConfirm, setShowWeparlayConfirm] = useState(false);
  const [showGuideDropdown, setShowGuideDropdown] = useState(false);

  const closeDrawer = () => setIsDrawerOpen(false);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  const formatAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="/" className="flex items-center gap-2.5 group">
                  <div className="relative">
                    <img 
                      src="/logos/pc-logo.png" 
                      alt="$Pc" 
                      className="w-12 h-12 transition-transform group-hover:scale-110 drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                    />
                    <div className="absolute inset-0 bg-[#D4AF37]/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="font-casino font-bold text-xl text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.7)]">
                    $Pc CASINO
                  </span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Return to Home</p>
              </TooltipContent>
            </Tooltip>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              {/* Guide dropdown */}
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowGuideDropdown(v => !v)}
                      onBlur={() => setTimeout(() => setShowGuideDropdown(false), 150)}
                      className="flex items-center gap-1 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors font-medium"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Guide
                      <ChevronDown className={`w-3 h-3 transition-transform ${showGuideDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Games, Leaderboard, Rules & Rewards</p></TooltipContent>
                </Tooltip>

                {showGuideDropdown && (
                  <div
                    className="absolute top-full left-0 mt-2 w-48 rounded-xl overflow-hidden z-50"
                    style={{
                      background: 'rgba(10, 38, 14, 0.92)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid rgba(67,160,71,0.35)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(67,160,71,0.12)',
                    }}
                  >
                    <a
                      href="#games-section"
                      onClick={() => setShowGuideDropdown(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:text-[#D4AF37] hover:bg-white/5 transition-colors"
                    >
                      <Layers className="w-4 h-4 text-[#43A047]" />
                      Games
                    </a>
                    <a
                      href="#leaderboard"
                      onClick={() => setShowGuideDropdown(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:text-[#D4AF37] hover:bg-white/5 transition-colors border-t border-[#43A047]/10"
                    >
                      <Trophy className="w-4 h-4 text-[#43A047]" />
                      Leaderboard
                    </a>
                    <button
                      onClick={() => { onShowLegal?.('rules'); setShowGuideDropdown(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:text-[#D4AF37] hover:bg-white/5 transition-colors border-t border-[#43A047]/10"
                    >
                      <BookOpen className="w-4 h-4 text-[#43A047]" />
                      Rules
                    </button>
                    <button
                      onClick={() => { onShowRewards(); setShowGuideDropdown(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:text-[#D4AF37] hover:bg-white/5 transition-colors border-t border-[#43A047]/10"
                    >
                      <Gift className="w-4 h-4 text-[#43A047]" />
                      Rewards
                    </button>
                  </div>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowMultiplayer}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(79,70,229,0.3))',
                      border: '1px solid rgba(147,51,234,0.5)',
                      color: '#C084FC',
                      boxShadow: '0 0 15px rgba(147,51,234,0.2)',
                    }}
                  >
                    <Users className="w-4 h-4" />
                    Multiplayer
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Join or create live multiplayer tables</p></TooltipContent>
              </Tooltip>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Live $Pc price — always visible */}
              <div className="hidden md:block">
                <PcPriceTicker compact={false} onFullInfo={onShowPcToken} />
              </div>

              {isAuthenticated ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={onShowFinancial}
                        className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 rounded-full hover:scale-105 transition-all group"
                        style={{ 
                          background: navMembership.isMember
                            ? 'linear-gradient(90deg, rgba(40,20,0,0.7), rgba(80,40,0,0.5))'
                            : 'linear-gradient(90deg, rgba(27,94,32,0.5), rgba(46,125,50,0.3))',
                          border: navMembership.isMember
                            ? '1px solid rgba(212,175,55,0.7)'
                            : '1px solid rgba(67,160,71,0.4)',
                          boxShadow: navMembership.isMember
                            ? '0 0 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.15)'
                            : '0 0 15px rgba(67,160,71,0.2), 0 0 30px rgba(212,175,55,0.1)',
                          animation: 'pulse-gold 2s ease-in-out infinite'
                        }}
                      >
                        {navMembership.isMember && (
                          <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                        )}
                        <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold text-[#D4AF37] text-sm">
                          {formatPcAmount(balance)}
                        </span>
                        <span className="text-xs text-[#808080]">$Pc</span>
                        <BarChart3 className="w-4 h-4 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {navMembership.isMember ? (
                        <div className="text-center">
                          <p className="font-bold text-yellow-400"><CasinoIcon name="crown" size={14} /> VIP Member</p>
                          <p className="text-xs">Holding {navThresholdLabel}+ $Pc{navUsdLabel ? ` (≈ ${navUsdLabel})` : ''} — Bet with fiat, crypto & commodities</p>
                          <p className="text-xs text-gray-400">Click for financial options</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p>Click for financial options & statistics</p>
                          <p className="text-xs text-gray-400">Hold {navThresholdLabel}+ $Pc{navUsdLabel ? ` (≈ ${navUsdLabel})` : ''} to unlock VIP betting</p>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  {/* VIP badge — shown when balance crosses dynamic USD-based threshold */}
                  {navMembership.isMember && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onShowVIPCurrency}
                          className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(180,140,30,0.12))',
                            border: '1px solid rgba(212,175,55,0.6)',
                            boxShadow: '0 0 12px rgba(212,175,55,0.3)',
                          }}
                        >
                          <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span className="text-[#D4AF37] font-bold text-xs">VIP</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="font-bold text-yellow-400"><CasinoIcon name="crown" size={14} /> VIP Multi-Currency</p>
                        <p className="text-xs">Bet with fiat, crypto & commodities</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {!user?.walletAddress && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={onConnectWallet}
                          variant="outline"
                          size="sm"
                          className="hidden sm:flex items-center gap-2 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        >
                          <Wallet className="w-4 h-4" />
                          Link Wallet
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom"><p>Connect crypto wallet</p></TooltipContent>
                    </Tooltip>
                  )}

                  {/* User Menu */}
                  <div className="relative hidden md:block">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowUserDropdown(!showUserDropdown)}
                          className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#5D4037]/30 transition-colors"
                        >
                          <div className="relative rounded-full overflow-visible" style={{ width: 28, height: 28 }}>
                            <div className="rounded-full overflow-hidden" style={{ width: 28, height: 28 }}>
                              {resolvedAvatarUrl ? (
                                <img src={resolvedAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <AvatarSprite avatar={displayAvatar} size={28} style={{ borderRadius: 0 }} />
                              )}
                            </div>
                            {unreadNotifications > 0 && (
                              <div className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black z-10"
                                style={{ background: '#D4AF37', padding: '0 3px' }}>
                                {unreadNotifications > 9 ? '9+' : unreadNotifications}
                              </div>
                            )}
                          </div>
                          {unreadDmCount > 0 && (
                            <div className="relative flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                              <div className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-black"
                                style={{ background: '#ef4444', padding: '0 2px' }}>
                                {unreadDmCount > 9 ? '9+' : unreadDmCount}
                              </div>
                            </div>
                          )}
                          <span className="hidden sm:block font-medium text-white">{user?.username}</span>
                          {user?.walletAddress && (
                            <span className="hidden md:block text-xs text-[#43A047]">
                              {formatAddress(user.walletAddress)}
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-[#C0C0C0]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom"><p>Account menu & settings</p></TooltipContent>
                    </Tooltip>

                    {showUserDropdown && (
                      <div 
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
                        style={{ 
                          background: 'rgba(10,10,10,0.98)',
                          border: '1px solid rgba(212,175,55,0.4)',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
                        }}
                      >
                        <div className="p-4 border-b border-[#5D4037]/30">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full overflow-hidden" style={{ width: 44, height: 44 }}>
                              {resolvedAvatarUrl ? (
                                <img src={resolvedAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <AvatarSprite avatar={displayAvatar} size={44} style={{ borderRadius: 0 }} />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white">{user?.username}</div>
                              {user?.email && (
                                <div className="text-xs text-[#808080]">{user.email}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => { onShowFinancial?.(); setShowUserDropdown(false); }}
                            className="mt-3 p-2 rounded-lg flex items-center justify-between w-full hover:bg-[#D4AF37]/10 transition-colors"
                            style={{ background: 'rgba(27,94,32,0.3)' }}
                          >
                            <span className="text-xs text-[#808080]">Balance</span>
                            <span className="font-bold text-[#D4AF37]">{balance.toLocaleString()} $Pc</span>
                          </button>
                        </div>
                        
                        <button
                          onClick={() => { onShowProfile?.(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors border-b border-[#5D4037]/20"
                        >
                          <UserCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold">My Profile</span>
                        </button>

                        <button
                          onClick={() => { onShowHistory(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#C0C0C0] hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          <History className="w-4 h-4" />
                          <span className="text-sm">History</span>
                        </button>
                        
                        <button
                          onClick={() => { onShowRewards(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#C0C0C0] hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          <Gift className="w-4 h-4" />
                          <span className="text-sm">Rewards</span>
                        </button>

                        <button
                          onClick={() => { onShowReferral?.(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 hover:bg-[#D4AF37]/10 transition-colors border-b border-[#5D4037]/20"
                          style={{ color: '#c084fc' }}
                        >
                          <Star className="w-4 h-4" />
                          <span className="text-sm font-semibold">Affiliate Dashboard</span>
                        </button>

                        <button
                          onClick={() => { onShowCardDeck?.(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#C0C0C0] hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          <Layers className="w-4 h-4" />
                          <span className="text-sm">Card Decks</span>
                        </button>

                        <button
                          onClick={() => { onShowReferral?.(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          <Star className="w-4 h-4" />
                          <span className="text-sm">Affiliate Dashboard</span>
                        </button>

                        {!user?.walletAddress && (
                          <button
                            onClick={() => { onConnectWallet(); setShowUserDropdown(false); }}
                            className="w-full p-3 flex items-center gap-3 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                          >
                            <Wallet className="w-4 h-4" />
                            <span className="text-sm">Connect Wallet</span>
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button
                            onClick={() => { onShowAdmin?.(); setShowUserDropdown(false); }}
                            className="w-full p-3 flex items-center gap-3 text-[#EF5350] hover:bg-[#EF5350]/10 transition-colors border-t border-[#5D4037]/30"
                          >
                            <Shield className="w-4 h-4" />
                            <span className="text-sm">Admin Panel</span>
                          </button>
                        )}

                        <button
                          onClick={() => { onDisconnect(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#EF5350] hover:bg-[#EF5350]/10 transition-colors border-t border-[#5D4037]/30"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onConnectWallet}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      >
                        <Wallet className="w-4 h-4" />
                        Wallet
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Connect with MetaMask, Phantom, etc.</p></TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onConnect}
                        size="sm"
                        className="btn-primary flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        LOGIN
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Login with Google, Twitter, Discord, or Telegram</p></TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Mobile: balance pill (sm screens) */}
              {isAuthenticated && (
                <button
                  onClick={onShowFinancial}
                  className="flex sm:hidden items-center gap-1.5 px-2 py-1.5 rounded-full"
                  style={{ 
                    background: 'linear-gradient(90deg, rgba(27,94,32,0.5), rgba(46,125,50,0.3))',
                    border: '1px solid rgba(67,160,71,0.4)',
                  }}
                >
                  <img src="/logos/pc-logo.png" alt="$Pc" className="w-4 h-4" />
                  <span className="font-bold text-[#D4AF37] text-xs">
                    {balance >= 1_000_000 
                      ? `${(balance/1_000_000).toFixed(1)}M` 
                      : balance >= 1000 
                      ? `${(balance/1000).toFixed(0)}K` 
                      : balance.toFixed(0)}
                  </span>
                </button>
              )}

              {/* Mobile Login Button */}
              {!isAuthenticated && (
                <Button
                  onClick={onConnect}
                  size="sm"
                  className="md:hidden btn-primary flex items-center gap-1 text-xs px-3"
                >
                  <User className="w-3 h-3" />
                  LOGIN
                </Button>
              )}

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Toggle menu"
              >
                {isDrawerOpen ? <X className="w-6 h-6 text-[#D4AF37]" /> : <Menu className="w-6 h-6 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={closeDrawer}
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 md:hidden flex flex-col overflow-y-auto"
        style={{
          width: '280px',
          maxWidth: '85vw',
          background: 'rgba(8,8,8,0.98)',
          borderLeft: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.8)',
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/20"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center gap-2">
            <img src="/logos/pc-logo.png" alt="$Pc" className="w-8 h-8" />
            <span className="font-casino font-bold text-[#D4AF37]">$Pc CASINO</span>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-[#C0C0C0]" />
          </button>
        </div>

        {/* User Info (if authenticated) */}
        {isAuthenticated && user && (
          <div className="p-4 border-b border-[#5D4037]/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 44, height: 44 }}>
                {resolvedAvatarUrl ? (
                  <img src={resolvedAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarSprite avatar={displayAvatar} size={44} style={{ borderRadius: 0 }} />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white truncate">{user.username}</div>
                {user.email && <div className="text-xs text-[#808080] truncate">{user.email}</div>}
              </div>
            </div>
            <button
              onClick={() => { onShowFinancial?.(); closeDrawer(); }}
              className="w-full p-3 rounded-xl flex items-center justify-between transition-colors hover:bg-[#D4AF37]/10"
              style={{ background: 'rgba(27,94,32,0.3)', border: '1px solid rgba(67,160,71,0.3)' }}
            >
              <div className="flex items-center gap-2">
                <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5" />
                <span className="text-xs text-[#808080]">Balance</span>
              </div>
              <span className="font-bold text-[#D4AF37]">{balance.toLocaleString()} $Pc</span>
            </button>
          </div>
        )}

        {/* Nav Links */}
        <div className="flex-1 py-2">
          <a 
            href="#games-section" 
            className="flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors min-h-[56px]"
            onClick={closeDrawer}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Games</span>
          </a>

          <a 
            href="#leaderboard" 
            className="flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors min-h-[56px]"
            onClick={closeDrawer}
          >
            <Trophy className="w-5 h-5" />
            <span className="font-medium">Leaderboard</span>
          </a>


          <div className="border-t border-[#5D4037]/20 mt-2 pt-2">
            <button 
              onClick={() => { onShowRewards(); closeDrawer(); }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors min-h-[56px]"
            >
              <Gift className="w-5 h-5" />
              <span className="font-medium">Rewards</span>
            </button>

            <button
              onClick={() => { onShowReferral?.(); closeDrawer(); }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#D4AF37]/10 transition-colors min-h-[56px]"
              style={{ color: '#C084FC' }}
            >
              <Star className="w-5 h-5" />
              <span className="font-medium">Affiliate Dashboard</span>
            </button>

            <button
              onClick={() => { onShowMultiplayer?.(); closeDrawer(); }}
              className="w-full flex items-center gap-3 px-4 py-4 transition-colors text-left min-h-[56px]"
              style={{ color: '#C084FC' }}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Multiplayer</span>
            </button>
          </div>

          {isAuthenticated ? (
            <div className="border-t border-[#5D4037]/20 mt-2 pt-2">
              <button 
                onClick={() => { onShowProfile?.(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#D4AF37]/10 text-[#D4AF37] transition-colors min-h-[56px]"
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-medium">My Profile</span>
              </button>

              <button 
                onClick={() => { onShowFinancial?.(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors min-h-[56px]"
              >
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Financial Options</span>
              </button>

              <button 
                onClick={() => { onShowHistory(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors min-h-[56px]"
              >
                <History className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>

              <button 
                onClick={() => { onShowCardDeck?.(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#C0C0C0] hover:text-[#D4AF37] transition-colors min-h-[56px]"
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium">Card Decks</span>
              </button>

              <button 
                onClick={() => { onShowReferral?.(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#5D4037]/30 text-[#D4AF37] transition-colors min-h-[56px]"
              >
                <Star className="w-5 h-5" />
                <span className="font-medium">Affiliate Dashboard</span>
              </button>

              {isAdmin && (
                <button 
                  onClick={() => { onShowAdmin?.(); closeDrawer(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#EF5350]/10 text-[#EF5350] transition-colors border-t border-[#5D4037]/20 min-h-[56px]"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Admin Panel</span>
                </button>
              )}

              <button 
                onClick={() => { onDisconnect(); closeDrawer(); }}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#EF5350]/20 text-[#EF5350] transition-colors border-t border-[#5D4037]/20 min-h-[56px]"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <div className="border-t border-[#5D4037]/20 mt-2 pt-2 px-4 space-y-3 pb-4">
              <Button
                onClick={() => { onConnect(); closeDrawer(); }}
                className="w-full btn-primary flex items-center gap-2 min-h-[48px]"
              >
                <User className="w-4 h-4" />
                LOGIN / REGISTER
              </Button>
            </div>
          )}
        </div>

        {/* Bottom safe area */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)', minHeight: '8px' }} />
      </div>

      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 15px rgba(67,160,71,0.2), 0 0 30px rgba(212,175,55,0.1); }
          50% { box-shadow: 0 0 20px rgba(67,160,71,0.4), 0 0 40px rgba(212,175,55,0.2); }
        }
      `}</style>

      {/* WeParlay.io Leave-Site Confirmation Dialog */}
      <Dialog open={showWeparlayConfirm} onOpenChange={setShowWeparlayConfirm}>
        <DialogContent
          className="max-w-sm"
          style={{
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-lg text-[#D4AF37] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Leaving $Pc Casino
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#C0C0C0]">
              You are about to visit <span className="font-bold text-[#D4AF37]">WeParlay.io</span>, an external sports betting platform. Your $Pc Casino session will remain active.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWeparlayConfirm(false)}
                className="flex-1 py-3 rounded-lg text-sm font-medium text-[#C0C0C0] hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Stay Here
              </button>
              <a
                href="https://weparlay.io"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWeparlayConfirm(false)}
                className="flex-1 py-3 rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                  color: '#1a1a1a',
                }}
              >
                Go to WeParlay.io
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
