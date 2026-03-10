import type { Card } from '@/types';

interface PlayingCardProps {
  card?: Card | null;
  hidden?: boolean;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { width: 35, height: 50, fontSize: 'text-sm', suitSize: 'text-lg' },
  md: { width: 50, height: 70, fontSize: 'text-base', suitSize: 'text-xl' },
  lg: { width: 70, height: 100, fontSize: 'text-lg', suitSize: 'text-2xl' },
};

export function PlayingCard({ 
  card, 
  hidden = false, 
  cardBackStyle, 
  size = 'md',
  className = '' 
}: PlayingCardProps) {
  const config = sizeConfig[size];
  
  // Render card back
  if (hidden || !card) {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div
          className={`rounded-lg overflow-hidden shadow-lg ${className}`}
          style={{ 
            width: config.width, 
            height: config.height,
            background: `url(${backStyle.image}) center/cover`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        />
      );
    }
    
    // Default card back pattern
    return (
      <div
        className={`rounded-lg overflow-hidden shadow-lg ${className}`}
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 20px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Inner border pattern */}
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

  // Render card face
  const suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const suitColors: Record<string, string> = {
    hearts: '#dc2626',
    diamonds: '#dc2626',
    clubs: '#1f2937',
    spades: '#1f2937',
  };

  const suitColor = suitColors[card.suit];
  const suitSymbol = suitSymbols[card.suit];

  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-lg select-none ${className}`}
      style={{ 
        width: config.width, 
        height: config.height,
        background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
        boxShadow: `
          0 4px 12px rgba(0,0,0,0.4),
          0 0 0 1px rgba(0,0,0,0.1),
          inset 0 1px 0 rgba(255,255,255,0.8)
        `,
      }}
    >
      {/* Card texture */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.02) 2px,
              rgba(0,0,0,0.02) 4px
            )
          `,
        }}
      />
      
      {/* Top left corner */}
      <div 
        className="absolute top-1 left-1 flex flex-col items-center leading-none"
        style={{ color: suitColor }}
      >
        <span className={`font-bold ${config.fontSize}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          {card.rank}
        </span>
        <span className={config.suitSize}>{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: suitColor }}
      >
        <span 
          className="text-4xl md:text-5xl"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.15)',
            opacity: 0.9,
          }}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Bottom right corner (inverted) */}
      <div 
        className="absolute bottom-1 right-1 flex flex-col items-center leading-none"
        style={{ 
          color: suitColor,
          transform: 'rotate(180deg)',
        }}
      >
        <span className={`font-bold ${config.fontSize}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          {card.rank}
        </span>
        <span className={config.suitSize}>{suitSymbol}</span>
      </div>

      {/* Subtle border */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      />
    </div>
  );
}

export default PlayingCard;
