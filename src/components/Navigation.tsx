import { useState } from 'react';
import { Menu, X, Wallet, History, Gift, LogOut, User, ChevronDown, DollarSign, BarChart3, Layers, Users, ExternalLink, Shield, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import type { UnifiedUser } from '@/types';

interface NavigationProps {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  balance: number;
  avatarDef?: AvatarDef;
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
}

export function Navigation({ 
  user, 
  isAuthenticated, 
  balance,
  avatarDef,
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
}: NavigationProps) {
  const displayAvatar = avatarDef || ALL_AVATARS[0];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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
                <a href="/" className="flex items-center gap-2 group">
                  <div className="relative">
                    <img 
                      src="/logos/pc-logo.png" 
                      alt="$Pc" 
                      className="w-10 h-10 transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="font-casino font-bold text-xl text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                    $Pc CASINO
                  </span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Return to Home</p>
              </TooltipContent>
            </Tooltip>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="#games-section" className="text-[#C0C0C0] hover:text-[#D4AF37] transition-colors font-medium">
                    Games
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Browse all casino games</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="#leaderboard" className="text-[#C0C0C0] hover:text-[#D4AF37] transition-colors font-medium">
                    Leaderboard
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>View top players & rankings</p></TooltipContent>
              </Tooltip>

              {/* WeParlay.io - Image Menu Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://weparlay.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 group relative"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="relative overflow-hidden rounded-lg transition-all group-hover:scale-105"
                      style={{
                        width: 110,
                        height: 36,
                        border: '1px solid rgba(212,175,55,0.5)',
                        boxShadow: '0 0 12px rgba(212,175,55,0.2)',
                      }}>
                      <img
                        src="/images/weparlay-menu.png"
                        alt="WeParlay.io"
                        className="w-full h-full object-cover object-center transition-transform group-hover:scale-110"
                        style={{ filter: 'brightness(0.9) saturate(1.1)' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <span className="font-bold text-xs text-[#D4AF37] drop-shadow-lg tracking-wide">WeParlay.io</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Sports Betting on WeParlay.io</p>
                </TooltipContent>
              </Tooltip>

              {/* 18+ Adult Section */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="#weparlay"
                    className="flex items-center gap-1.5 group relative"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="relative overflow-hidden rounded-lg transition-all group-hover:scale-105"
                      style={{
                        width: 88,
                        height: 36,
                        border: '1px solid rgba(147,51,234,0.5)',
                        boxShadow: '0 0 12px rgba(147,51,234,0.2)',
                      }}>
                      <img
                        src="/images/adult-menu-banner.png"
                        alt="18+ VIP"
                        className="w-full h-full object-cover object-center transition-transform group-hover:scale-110"
                        style={{ filter: 'brightness(0.8) saturate(1.2)' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <span className="font-bold text-xs tracking-wider"
                          style={{ color: '#d8b4fe', textShadow: '0 0 8px rgba(147,51,234,0.8)' }}>
                          18+ VIP
                        </span>
                      </div>
                    </div>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>VIP Adult Gaming • 18+ Only</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onShowRewards}
                    className="text-[#C0C0C0] hover:text-[#D4AF37] transition-colors font-medium flex items-center gap-1"
                  >
                    <Gift className="w-4 h-4" />
                    Rewards
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Claim bonuses & daily rewards</p></TooltipContent>
              </Tooltip>

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
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={onShowFinancial}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full hover:scale-105 transition-all group"
                        style={{ 
                          background: 'linear-gradient(90deg, rgba(27,94,32,0.5), rgba(46,125,50,0.3))',
                          border: '1px solid rgba(67,160,71,0.4)',
                          boxShadow: '0 0 15px rgba(67,160,71,0.2), 0 0 30px rgba(212,175,55,0.1)',
                          animation: 'pulse-gold 2s ease-in-out infinite'
                        }}
                      >
                        <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold text-[#D4AF37]">
                          {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-[#808080]">$Pc</span>
                        <BarChart3 className="w-4 h-4 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Click for financial options & statistics</p></TooltipContent>
                  </Tooltip>

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
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowUserDropdown(!showUserDropdown)}
                          className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#5D4037]/30 transition-colors"
                        >
                          <div className="rounded-full overflow-hidden" style={{ width: 28, height: 28 }}>
                            <AvatarSprite avatar={displayAvatar} size={28} style={{ borderRadius: 0 }} />
                          </div>
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
                              <AvatarSprite avatar={displayAvatar} size={44} style={{ borderRadius: 0 }} />
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
                          onClick={() => { onShowCardDeck?.(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#C0C0C0] hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          <Layers className="w-4 h-4" />
                          <span className="text-sm">Card Decks</span>
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
                        
                        <button
                          onClick={() => { onShowAdmin?.(); setShowUserDropdown(false); }}
                          className="w-full p-3 flex items-center gap-3 text-[#808080] hover:bg-[#D4AF37]/10 transition-colors border-t border-[#5D4037]/30"
                        >
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Admin Panel</span>
                        </button>

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
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onConnectWallet}
                        variant="outline"
                        size="sm"
                        className="hidden sm:flex items-center gap-2 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#5D4037]/30">
              <div className="flex flex-col gap-2">
                <a 
                  href="#games-section" 
                  className="p-3 rounded-lg hover:bg-[#5D4037]/30 text-[#C0C0C0] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Games
                </a>
                <a 
                  href="#leaderboard" 
                  className="p-3 rounded-lg hover:bg-[#5D4037]/30 text-[#C0C0C0] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Leaderboard
                </a>

                {/* Mobile WeParlay image button */}
                <a
                  href="https://weparlay.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg overflow-hidden"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ border: '1px solid rgba(212,175,55,0.4)' }}
                >
                  <div className="relative h-14 rounded-lg overflow-hidden">
                    <img
                      src="/images/weparlay-menu.png"
                      alt="WeParlay.io"
                      className="w-full h-full object-cover object-center"
                      style={{ filter: 'brightness(0.85)' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2"
                      style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <span className="font-bold text-[#D4AF37] text-base tracking-wide">WeParlay.io Sports Betting</span>
                      <ExternalLink className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                  </div>
                </a>

                {/* Mobile 18+ VIP image button */}
                <a
                  href="#weparlay"
                  className="p-2 rounded-lg overflow-hidden"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ border: '1px solid rgba(147,51,234,0.4)' }}
                >
                  <div className="relative h-12 rounded-lg overflow-hidden">
                    <img
                      src="/images/adult-menu-banner.png"
                      alt="18+ VIP"
                      className="w-full h-full object-cover object-center"
                      style={{ filter: 'brightness(0.7)' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <span className="font-bold text-sm tracking-widest"
                        style={{ color: '#d8b4fe', textShadow: '0 0 10px rgba(147,51,234,0.8)' }}>
                        🔞 18+ VIP ADULT GAMING
                      </span>
                    </div>
                  </div>
                </a>

                <button 
                  onClick={() => { onShowRewards(); setIsMenuOpen(false); }}
                  className="p-3 rounded-lg hover:bg-[#5D4037]/30 text-[#C0C0C0] transition-colors text-left"
                >
                  Rewards
                </button>
                <button
                  onClick={() => { onShowMultiplayer?.(); setIsMenuOpen(false); }}
                  className="p-3 rounded-lg transition-colors text-left flex items-center gap-2"
                  style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC' }}
                >
                  <Users className="w-4 h-4" />
                  Multiplayer
                </button>
                
                {isAuthenticated && (
                  <>
                    <button 
                      onClick={() => { onShowProfile?.(); setIsMenuOpen(false); }}
                      className="p-3 rounded-lg hover:bg-[#D4AF37]/10 text-[#D4AF37] transition-colors text-left flex items-center gap-2 border border-[#D4AF37]/30"
                    >
                      <UserCircle className="w-4 h-4" />
                      My Profile
                    </button>
                    <button 
                      onClick={() => { onShowFinancial?.(); setIsMenuOpen(false); }}
                      className="p-3 rounded-lg hover:bg-[#5D4037]/30 text-[#D4AF37] transition-colors text-left flex items-center gap-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      Financial Options
                    </button>
                    <button 
                      onClick={() => { onShowHistory(); setIsMenuOpen(false); }}
                      className="p-3 rounded-lg hover:bg-[#5D4037]/30 text-[#C0C0C0] transition-colors text-left"
                    >
                      History
                    </button>
                    <button 
                      onClick={() => { onShowAdmin?.(); setIsMenuOpen(false); }}
                      className="p-3 rounded-lg hover:bg-[#5D4037]/30 text-[#808080] transition-colors text-left flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </button>
                    <button 
                      onClick={() => { onDisconnect(); setIsMenuOpen(false); }}
                      className="p-3 rounded-lg hover:bg-[#EF5350]/20 text-[#EF5350] transition-colors text-left"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 15px rgba(67,160,71,0.2), 0 0 30px rgba(212,175,55,0.1); }
          50% { box-shadow: 0 0 20px rgba(67,160,71,0.4), 0 0 40px rgba(212,175,55,0.2); }
        }
      `}</style>
    </TooltipProvider>
  );
}
