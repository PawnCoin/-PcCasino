import type { CSSProperties } from 'react';

const CROSS_PATTERN_SVG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

const FELT_WEAVE = `
  repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.015) 1px, transparent 2px, transparent 4px),
  repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.01) 1px, transparent 2px, transparent 4px)
`;

interface PremiumFeltOverlayProps {
  borderRadius?: string;
  inset?: number;
  showGoldBorder?: boolean;
  showSpotlight?: boolean;
  showCrossPattern?: boolean;
  showWeave?: boolean;
  goldBorderInset?: number;
  spotlightStyle?: CSSProperties;
  className?: string;
}

export function PremiumFeltOverlay({
  borderRadius = '16px',
  inset = 0,
  showGoldBorder = true,
  showSpotlight = true,
  showCrossPattern = true,
  showWeave = true,
  goldBorderInset = 8,
  spotlightStyle,
  className = '',
}: PremiumFeltOverlayProps) {
  return (
    <>
      {showCrossPattern && (
        <div
          className={`absolute pointer-events-none ${className}`}
          style={{
            inset,
            borderRadius,
            backgroundImage: CROSS_PATTERN_SVG,
            zIndex: 1,
          }}
        />
      )}

      {showWeave && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset,
            borderRadius,
            backgroundImage: FELT_WEAVE,
            opacity: 0.5,
            zIndex: 1,
          }}
        />
      )}

      {showGoldBorder && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: inset + goldBorderInset,
            border: '2px solid rgba(212,175,55,0.3)',
            borderRadius,
            boxShadow: 'inset 0 0 20px rgba(212,175,55,0.08)',
            zIndex: 2,
          }}
        />
      )}

      {showSpotlight && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            top: inset,
            width: '60%',
            height: '40%',
            background: 'conic-gradient(from 180deg at 50% 0%, transparent 25%, rgba(212,175,55,0.08) 40%, rgba(212,175,55,0.18) 50%, rgba(212,175,55,0.08) 60%, transparent 75%)',
            filter: 'blur(6px)',
            zIndex: 3,
            ...spotlightStyle,
          }}
        />
      )}
    </>
  );
}

