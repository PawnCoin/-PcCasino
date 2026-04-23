import { useState, useEffect } from 'react';
import { X, Twitter, Instagram, Send, MessageCircle, Shield, UserPlus, Check, Lock, Bot, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { authApi, friendsApi, getToken } from '@/lib/api';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { CasinoIcon } from '@/components/CasinoIcons';
import { VipBadge } from '@/components/VipBadge';
import { useAccessControl } from '@/hooks/useAccessControl';

interface PublicProfile {
  id?: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatar: string;
  avatarUrl: string | null;
  vipTier: string;
  publicStatsVisible: boolean;
  publicSocialsVisible: boolean;
  gamesPlayed: number | null;
  winRate: number | null;
  favoriteGame: string | null;
  favoriteGameName: string | null;
  favoriteGameIcon: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialTelegram: string | null;
  socialDiscord: string | null;
}

export interface InGameContext {
  /** Last action taken (e.g. "CALL", "RAISE", "FOLD", "PASS") */
  action?: string | null;
  /** Current per-street wager / bet on the table */
  currentBet?: number | null;
  /** Cash / chip stack the player has at the table */
  cashAtTable?: number | null;
  /** Optional label for the type of cash shown (defaults to "Stack") */
  cashLabel?: string;
  /** Optional label for the wager / per-hand stat (defaults to "Wager") */
  betLabel?: string;
  /** Optional unit label for the cash column (defaults to "$Pc") */
  cashUnit?: string;
  /** Optional unit label for the wager column (defaults to "$Pc") */
  betUnit?: string;
  /** Optional game name shown in section header */
  gameLabel?: string;
}

export interface FallbackPlayer {
  /** Display name shown when no real profile exists (bot/AI opponent) */
  displayName: string;
  /** When true, do not attempt API lookup; render as AI opponent and disable Add Friend */
  isBot?: boolean;
  /** Avatar to render when there's no profile image */
  avatarDef?: AvatarDef;
}

interface PublicProfileCardProps {
  username: string | null;
  onClose: () => void;
  onNavigateToGame?: (game: string) => void;
  /** Optional live in-game context shown when opened from a multiplayer game */
  inGameContext?: InGameContext;
  /** Fallback shown when no real account exists (e.g. local AI opponent) */
  fallbackPlayer?: FallbackPlayer;
  /** When true, render in view-only mode and hide DM/messaging actions (always hidden currently) */
  hideMessageActions?: boolean;
}

function nameToAvatarIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return Math.abs(h) % ALL_AVATARS.length;
}

const ACTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  FOLD:    { bg: 'rgba(239,68,68,0.2)',   border: 'rgba(239,68,68,0.6)',   text: '#fca5a5' },
  CHECK:   { bg: 'rgba(59,130,246,0.2)',  border: 'rgba(59,130,246,0.6)',  text: '#93c5fd' },
  CALL:    { bg: 'rgba(34,197,94,0.2)',   border: 'rgba(34,197,94,0.6)',   text: '#86efac' },
  RAISE:   { bg: 'rgba(212,175,55,0.25)', border: 'rgba(212,175,55,0.7)',  text: '#FCD34D' },
  BET:     { bg: 'rgba(212,175,55,0.25)', border: 'rgba(212,175,55,0.7)',  text: '#FCD34D' },
  'ALL IN':{ bg: 'rgba(168,85,247,0.25)', border: 'rgba(168,85,247,0.7)',  text: '#d8b4fe' },
  PASS:    { bg: 'rgba(156,163,175,0.2)', border: 'rgba(156,163,175,0.5)', text: '#d1d5db' },
  KNOCKED: { bg: 'rgba(183,28,28,0.25)',  border: 'rgba(239,83,80,0.7)',   text: '#fecaca' },
  PLAYING: { bg: 'rgba(34,197,94,0.18)',  border: 'rgba(34,197,94,0.55)',  text: '#86efac' },
  THINKING:{ bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.5)',  text: '#93c5fd' },
};

export function PublicProfileCard({
  username,
  onClose,
  inGameContext,
  fallbackPlayer,
}: PublicProfileCardProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);
  const isBot = !!fallbackPlayer?.isBot;
  const isAuthenticated = !!getToken();
  const [viewerVipTier, setViewerVipTier] = useState<string | undefined>(undefined);
  // Fetch viewer's vipTier so client-side affordance matches server-side VIP gating
  useEffect(() => {
    if (!isAuthenticated) { setViewerVipTier(undefined); return; }
    let cancelled = false;
    authApi.me()
      .then((data: { user?: { vipTier?: string } }) => {
        if (cancelled) return;
        setViewerVipTier(data?.user?.vipTier || undefined);
      })
      .catch(() => { /* leave undefined; server still enforces */ });
    return () => { cancelled = true; };
  }, [isAuthenticated]);
  const access = useAccessControl(isAuthenticated, viewerVipTier);

  useEffect(() => {
    setProfile(null);
    setError(null);
    setFriendRequestSent(false);
    if (!username) return;
    if (isBot) return; // skip API lookup for AI opponents
    setLoading(true);
    authApi.getPublicProfile(username)
      .then(data => {
        if (data.profile) setProfile(data.profile);
        else setError('Profile not found');
      })
      .catch(err => setError(err?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [username, isBot]);

  const isOpen = !!username || !!fallbackPlayer;

  const displayName =
    profile?.displayName || profile?.username || fallbackPlayer?.displayName || username || 'Player';
  const avatarDef = profile
    ? ALL_AVATARS[nameToAvatarIdx(profile.username)]
    : (fallbackPlayer?.avatarDef || ALL_AVATARS[nameToAvatarIdx(displayName)]);

  const GAME_ICONS: Record<string, string> = {
    poker: 'cards', blackjack: 'spade', roulette: 'roulette-wheel', craps: 'dice', slots: 'slot-machine',
    bingo: 'bingo', spades: 'spade', dominoes: 'domino', pool: 'pool-ball', darts: 'target',
    'horse-racing': 'horse', sports: 'soccer', vip: 'gem',
  };

  const handleAddFriend = async () => {
    if (!profile?.id || friendRequestSent || friendBusy) return;
    setFriendBusy(true);
    try {
      await friendsApi.sendRequest(profile.id);
      setFriendRequestSent(true);
      toast.success(`Friend request sent to ${profile.displayName || profile.username}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send friend request';
      if (/already.*friend/i.test(msg) || /already.*sent/i.test(msg)) {
        setFriendRequestSent(true);
      }
      toast.error(msg);
    } finally {
      setFriendBusy(false);
    }
  };

  const actionTheme = inGameContext?.action
    ? (ACTION_COLORS[inGameContext.action.toUpperCase()] || ACTION_COLORS.PASS)
    : null;

  const showInGameSection = !!inGameContext && (
    inGameContext.action != null ||
    (inGameContext.currentBet != null && inGameContext.currentBet >= 0) ||
    (inGameContext.cashAtTable != null && inGameContext.cashAtTable >= 0)
  );

  const cashLabel = inGameContext?.cashLabel || 'Stack at Table';
  const betLabel = inGameContext?.betLabel || 'Wager';
  const cashUnit = inGameContext?.cashUnit ?? '$Pc';
  const betUnit = inGameContext?.betUnit ?? '$Pc';

  return (
    <Dialog open={isOpen} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden"
        style={{
          background: 'rgba(6,6,12,0.99)',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 0 60px rgba(0,0,0,0.9)',
        }}
      >
        <DialogTitle className="sr-only">{displayName} player profile</DialogTitle>
        <DialogDescription className="sr-only">
          Public profile and live in-game status for {displayName}.
        </DialogDescription>
        {/* Header gradient */}
        <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, rgba(30,20,10,0.9), rgba(212,175,55,0.15), rgba(10,10,10,0.9))' }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute -bottom-8 left-5">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden"
              style={{ border: '3px solid rgba(212,175,55,0.6)', boxShadow: '0 0 20px rgba(212,175,55,0.3)' }}
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <AvatarSprite avatar={avatarDef} size={64} style={{ borderRadius: 0 }} />
              )}
            </div>
          </div>
        </div>

        <div className="pt-10 px-5 pb-5">
          {loading && (
            <div className="text-center py-8 text-gray-400">
              <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading profile…</p>
            </div>
          )}

          {error && !loading && !fallbackPlayer && (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {(profile || fallbackPlayer || (error && fallbackPlayer)) && !loading && (
            <div className="space-y-4">
              {/* Name & tier */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">
                    {displayName}
                  </h2>
                  {profile?.displayName && profile.username && (
                    <p className="text-xs text-gray-500">@{profile.username}</p>
                  )}
                  {isBot && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 inline-flex items-center gap-1">
                      <Bot className="w-3 h-3" /> AI Opponent
                    </p>
                  )}
                  {profile?.bio && (
                    <p className="text-sm text-gray-400 mt-1 max-w-[200px] leading-relaxed">{profile.bio}</p>
                  )}
                </div>
                {profile?.vipTier && <VipBadge tier={profile.vipTier} size="md" showLabel />}
              </div>

              {/* Live in-game status */}
              {showInGameSection && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}
                >
                  <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Live {inGameContext?.gameLabel ? `· ${inGameContext.gameLabel}` : 'Status'}
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Action</div>
                      {inGameContext?.action && actionTheme ? (
                        <div
                          className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider"
                          style={{
                            background: actionTheme.bg,
                            border: `1px solid ${actionTheme.border}`,
                            color: actionTheme.text,
                          }}
                        >
                          {inGameContext.action.toUpperCase()}
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{betLabel}</div>
                      <div className="text-sm font-bold text-white">
                        {inGameContext?.currentBet != null
                          ? inGameContext.currentBet.toLocaleString()
                          : '—'}
                      </div>
                      {inGameContext?.currentBet != null && betUnit && (
                        <div className="text-[8px] text-gray-500 -mt-0.5">{betUnit}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{cashLabel}</div>
                      <div className="text-sm font-bold text-[#43A047]">
                        {inGameContext?.cashAtTable != null
                          ? inGameContext.cashAtTable.toLocaleString()
                          : '—'}
                      </div>
                      {inGameContext?.cashAtTable != null && cashUnit && (
                        <div className="text-[8px] text-gray-500 -mt-0.5">{cashUnit}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add Friend action (no DM during gameplay) */}
              {!isBot && profile && (
                <div>
                  {!isAuthenticated ? (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      <Lock className="w-3.5 h-3.5" /> Sign in to add friend
                    </button>
                  ) : !access.canAddFriend ? (
                    <button
                      disabled
                      title="VIP membership required (Silver+). Wager 10M+ $Pc to unlock."
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      <Lock className="w-3.5 h-3.5" /> Add Friend (VIP only)
                    </button>
                  ) : friendRequestSent ? (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }}
                    >
                      <Check className="w-3.5 h-3.5" /> Request Sent
                    </button>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      disabled={friendBusy || !profile.id}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                      style={{ background: 'rgba(212,175,55,0.18)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.6)' }}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> {friendBusy ? 'Sending…' : 'Add Friend'}
                    </button>
                  )}
                </div>
              )}
              {isBot && (
                <div
                  className="text-center text-[11px] text-gray-500 italic rounded-lg py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  AI opponents can't be added as friends
                </div>
              )}

              {/* Stats — only for real profiles */}
              {profile && profile.publicStatsVisible && (profile.gamesPlayed !== null || profile.winRate !== null || profile.favoriteGame) && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Casino Stats
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {profile.gamesPlayed !== null && (
                      <div className="text-center">
                        <div className="text-base font-bold text-[#c084fc]">
                          {profile.gamesPlayed >= 1000 ? `${(profile.gamesPlayed / 1000).toFixed(1)}K` : profile.gamesPlayed}
                        </div>
                        <div className="text-xs text-gray-500">Played</div>
                      </div>
                    )}
                    {profile.winRate !== null && (
                      <div className="text-center">
                        <div className="text-base font-bold text-[#4ade80]">{profile.winRate}%</div>
                        <div className="text-xs text-gray-500">Win Rate</div>
                      </div>
                    )}
                    {profile.favoriteGame && (
                      <div className="text-center">
                        <CasinoIcon name={GAME_ICONS[profile.favoriteGame] || 'gamepad'} size={20} />
                        <div className="text-xs text-gray-500 truncate">{profile.favoriteGameName || profile.favoriteGame}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social links — only for real profiles */}
              {profile && profile.publicSocialsVisible && (profile.socialTwitter || profile.socialInstagram || profile.socialTelegram || profile.socialDiscord) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Socials</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.socialTwitter && (
                      <a
                        href={`https://twitter.com/${profile.socialTwitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                        style={{ background: 'rgba(29,161,242,0.15)', color: '#1DA1F2', border: '1px solid rgba(29,161,242,0.3)' }}
                      >
                        <Twitter className="w-3 h-3" />
                        @{profile.socialTwitter}
                      </a>
                    )}
                    {profile.socialInstagram && (
                      <a
                        href={`https://instagram.com/${profile.socialInstagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                        style={{ background: 'rgba(225,48,108,0.15)', color: '#E1306C', border: '1px solid rgba(225,48,108,0.3)' }}
                      >
                        <Instagram className="w-3 h-3" />
                        @{profile.socialInstagram}
                      </a>
                    )}
                    {profile.socialTelegram && (
                      <a
                        href={`https://t.me/${profile.socialTelegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                        style={{ background: 'rgba(0,136,204,0.15)', color: '#0088cc', border: '1px solid rgba(0,136,204,0.3)' }}
                      >
                        <Send className="w-3 h-3" />
                        @{profile.socialTelegram}
                      </a>
                    )}
                    {profile.socialDiscord && (
                      <span
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(88,101,242,0.15)', color: '#5865F2', border: '1px solid rgba(88,101,242,0.3)' }}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {profile.socialDiscord}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* No public info */}
              {profile && !profile.publicStatsVisible && !profile.publicSocialsVisible && !showInGameSection && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  This player's stats and socials are private.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
