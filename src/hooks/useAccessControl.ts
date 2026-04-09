import { useMemo } from 'react';

export type VipTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

const VIP_TIERS: VipTier[] = ['silver', 'gold', 'platinum', 'diamond'];

export interface AccessControl {
  isGuest: boolean;
  isAuthenticated: boolean;
  isVip: boolean;
  vipTier: VipTier;
  canChat: boolean;
  canPlayGame: boolean;
  canMessage: boolean;
  canAddFriend: boolean;
  canAccessVip: boolean;
}

export function isVipTier(tier: string): boolean {
  return VIP_TIERS.includes(tier as VipTier);
}

export function useAccessControl(
  isAuthenticated: boolean,
  vipTier?: string,
): AccessControl {
  return useMemo(() => {
    const tier = (vipTier || 'bronze') as VipTier;
    const isGuest = !isAuthenticated;
    const isVip = isVipTier(tier);

    return {
      isGuest,
      isAuthenticated,
      isVip,
      vipTier: tier,
      canChat: isAuthenticated,
      canPlayGame: isAuthenticated,
      canMessage: isAuthenticated && isVip,
      canAddFriend: isAuthenticated && isVip,
      canAccessVip: isAuthenticated && isVip,
    };
  }, [isAuthenticated, vipTier]);
}

export const VIP_TIER_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  bronze: { color: '#CD7F32', bg: 'rgba(205,127,50,0.2)', border: 'rgba(205,127,50,0.4)', label: 'B' },
  silver: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.2)', border: 'rgba(192,192,192,0.4)', label: 'S' },
  gold: { color: '#D4AF37', bg: 'rgba(212,175,55,0.2)', border: 'rgba(212,175,55,0.4)', label: 'G' },
  platinum: { color: '#E5E4E2', bg: 'rgba(229,228,226,0.2)', border: 'rgba(229,228,226,0.4)', label: 'P' },
  diamond: { color: '#B9F2FF', bg: 'rgba(185,242,255,0.2)', border: 'rgba(185,242,255,0.5)', label: 'D' },
};
