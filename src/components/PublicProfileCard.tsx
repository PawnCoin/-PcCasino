import { useState, useEffect } from 'react';
import { X, Twitter, Instagram, Send, MessageCircle, Shield } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { authApi } from '@/lib/api';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';

interface PublicProfile {
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

interface PublicProfileCardProps {
  username: string | null;
  onClose: () => void;
  onNavigateToGame?: (game: string) => void;
}

function nameToAvatarIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return Math.abs(h) % ALL_AVATARS.length;
}

const TIER_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  bronze: { bg: 'rgba(205,127,50,0.2)', color: '#CD7F32', border: 'rgba(205,127,50,0.4)' },
  silver: { bg: 'rgba(192,192,192,0.2)', color: '#C0C0C0', border: 'rgba(192,192,192,0.4)' },
  gold: { bg: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: 'rgba(212,175,55,0.4)' },
  platinum: { bg: 'rgba(229,228,226,0.2)', color: '#E5E4E2', border: 'rgba(229,228,226,0.4)' },
  diamond: { bg: 'rgba(185,242,255,0.2)', color: '#B9F2FF', border: 'rgba(185,242,255,0.5)' },
};

export function PublicProfileCard({ username, onClose, onNavigateToGame }: PublicProfileCardProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    authApi.getPublicProfile(username)
      .then(data => {
        if (data.profile) setProfile(data.profile);
        else setError('Profile not found');
      })
      .catch(err => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [username]);

  const isOpen = !!username;

  const tierColors = profile ? (TIER_COLORS[profile.vipTier] || TIER_COLORS.bronze) : TIER_COLORS.bronze;
  const avatarIdx = profile ? nameToAvatarIdx(profile.username) : 0;
  const avatarDef = ALL_AVATARS[avatarIdx];

  const GAME_EMOJIS: Record<string, string> = {
    poker: '🃏', blackjack: '♠️', roulette: '🎡', craps: '🎲', slots: '🎰',
    bingo: '🅱️', spades: '♠', dominoes: '🁣', pool: '🎱', darts: '🎯',
    'horse-racing': '🏇', sports: '⚽', vip: '💎',
  };

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
              ) : profile ? (
                <AvatarSprite avatar={avatarDef} size={64} style={{ borderRadius: 0 }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
                  👤
                </div>
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

          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {profile && !loading && (
            <div className="space-y-4">
              {/* Name & tier */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {profile.displayName || profile.username}
                  </h2>
                  {profile.displayName && (
                    <p className="text-xs text-gray-500">@{profile.username}</p>
                  )}
                  {profile.bio && (
                    <p className="text-sm text-gray-400 mt-1 max-w-[200px] leading-relaxed">{profile.bio}</p>
                  )}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold uppercase shrink-0 mt-1"
                  style={{ background: tierColors.bg, color: tierColors.color, border: `1px solid ${tierColors.border}` }}
                >
                  {profile.vipTier} VIP
                </span>
              </div>

              {/* Stats */}
              {profile.publicStatsVisible && (profile.gamesPlayed !== null || profile.winRate !== null || profile.favoriteGame) && (
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
                        <div className="text-base">{profile.favoriteGameIcon || GAME_EMOJIS[profile.favoriteGame] || '🎮'}</div>
                        <div className="text-xs text-gray-500 truncate">{profile.favoriteGameName || profile.favoriteGame}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social links */}
              {profile.publicSocialsVisible && (profile.socialTwitter || profile.socialInstagram || profile.socialTelegram || profile.socialDiscord) && (
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
              {!profile.publicStatsVisible && !profile.publicSocialsVisible && (
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
