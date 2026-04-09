import { Crown } from 'lucide-react';
import { isVipTier, VIP_TIER_COLORS } from '@/hooks/useAccessControl';

interface VipBadgeProps {
  tier?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function VipBadge({ tier, size = 'sm', showLabel = false }: VipBadgeProps) {
  if (!tier || !isVipTier(tier)) return null;

  const colors = VIP_TIER_COLORS[tier] || VIP_TIER_COLORS.bronze;
  const iconSize = size === 'sm' ? 10 : size === 'md' ? 14 : 18;
  const fontSize = size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[11px]' : 'text-xs';
  const padding = size === 'sm' ? 'px-1 py-px' : size === 'md' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-bold uppercase shrink-0 ${padding} ${fontSize}`}
      style={{
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        textShadow: `0 0 6px ${colors.color}40`,
      }}
      title={`${tier.charAt(0).toUpperCase() + tier.slice(1)} VIP`}
    >
      <Crown style={{ width: iconSize, height: iconSize }} />
      {showLabel && <span>{tier}</span>}
    </span>
  );
}
