import type { Card } from '@/types';

interface PlayingCardProps {
  card?: Card | null;
  hidden?: boolean;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  sm: { width: 45, height: 63, rankSize: '11px', suitSize: '13px', centerSize: '24px', padding: '3px' },
  md: { width: 70, height: 100, rankSize: '15px', suitSize: '16px', centerSize: '36px', padding: '5px' },
  lg: { width: 90, height: 126, rankSize: '18px', suitSize: '20px', centerSize: '44px', padding: '6px' },
  xl: { width: 110, height: 154, rankSize: '22px', suitSize: '24px', centerSize: '56px', padding: '8px' },
};

export function PlayingCard({ 
  card, 
  hidden = false, 
  cardBackStyle, 
  size = 'md',
  className = '' 
}: PlayingCardProps) {
  const config = sizeConfig[size];
  
  if (hidden || !card) {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div
          className={`rounded-lg overflow-hidden ${className}`}
          style={{ 
            width: config.width, 
            height: config.height,
            background: `url(${backStyle.image}) center/cover`,
            boxShadow: '0 6px 16px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.2)',
          }}
        />
      );
    }
    
    return (
      <div
        className={`rounded-lg overflow-hidden ${className}`}
        style={{ 
          width: config.width, 
          height: config.height,
          background: `
            repeating-linear-gradient(
              45deg,
              #1a237e 0px,
              #1a237e 8px,
              #283593 8px,
              #283593 16px
            )
          `,
          boxShadow: '0 6px 16px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.2)',
          border: '2px solid rgba(212,175,55,0.3)',
        }}
      >
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 50%)
            `,
          }}
        >
          <div 
            className="w-3/4 h-3/4 rounded border border-white/20"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)',
            }}
          />
        </div>
      </div>
    );
  }

  const suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const suitColors: Record<string, string> = {
    hearts: '#c62828',
    diamonds: '#c62828',
    clubs: '#1a1a1a',
    spades: '#1a1a1a',
  };

  const suitColor = suitColors[card.suit];
  const suitSymbol = suitSymbols[card.suit];

  return (
    <div
      className={`relative rounded-lg overflow-hidden select-none ${className}`}
      style={{ 
        width: config.width, 
        height: config.height,
        background: 'linear-gradient(165deg, #ffffff 0%, #fafafa 40%, #f5f5f5 100%)',
        boxShadow: `
          0 8px 20px rgba(0,0,0,0.5),
          0 3px 6px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.9),
          inset 0 -1px 0 rgba(0,0,0,0.05)
        `,
        border: '1.5px solid rgba(0,0,0,0.12)',
        outline: '1px solid rgba(212,175,55,0.2)',
        outlineOffset: '-3px',
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            135deg,
            transparent 0%,
            transparent 40%,
            rgba(255,255,255,0.5) 47%,
            rgba(255,255,255,0.7) 50%,
            rgba(255,255,255,0.5) 53%,
            transparent 60%,
            transparent 100%
          )`,
          opacity: 0.4,
        }}
      />
      
      <div 
        className="absolute flex flex-col items-center leading-none font-bold"
        style={{ 
          color: suitColor, 
          top: config.padding, 
          left: config.padding,
        }}
      >
        <span style={{ fontSize: config.rankSize, textShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
          {card.rank}
        </span>
        <span style={{ fontSize: config.suitSize, marginTop: '-1px' }}>{suitSymbol}</span>
      </div>

      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: suitColor }}
      >
        <span 
          style={{ 
            fontSize: config.centerSize,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            opacity: 0.85,
          }}
        >
          {suitSymbol}
        </span>
      </div>

      <div 
        className="absolute flex flex-col items-center leading-none font-bold"
        style={{ 
          color: suitColor,
          bottom: config.padding,
          right: config.padding,
          transform: 'rotate(180deg)',
        }}
      >
        <span style={{ fontSize: config.rankSize, textShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
          {card.rank}
        </span>
        <span style={{ fontSize: config.suitSize, marginTop: '-1px' }}>{suitSymbol}</span>
      </div>

      <div 
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      />
    </div>
  );
}

export default PlayingCard;
