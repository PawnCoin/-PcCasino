interface PokerChipProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const chipColors: Record<number, { base: string; dark: string; light: string; edge: string; text: string }> = {
  1: { base: '#e0e0e0', dark: '#b0b0b0', light: '#f5f5f5', edge: '#9e9e9e', text: '#333' },
  5: { base: '#d32f2f', dark: '#b71c1c', light: '#ef5350', edge: '#ffcdd2', text: '#fff' },
  10: { base: '#1976d2', dark: '#0d47a1', light: '#42a5f5', edge: '#bbdefb', text: '#fff' },
  25: { base: '#388e3c', dark: '#1b5e20', light: '#66bb6a', edge: '#c8e6c9', text: '#fff' },
  50: { base: '#f57c00', dark: '#e65100', light: '#ffb74d', edge: '#ffe0b2', text: '#fff' },
  100: { base: '#333333', dark: '#1a1a1a', light: '#555555', edge: '#e0e0e0', text: '#fff' },
  500: { base: '#D4AF37', dark: '#B8860B', light: '#F4D03F', edge: '#8B6914', text: '#4a3c00' },
  1000: { base: '#B0B0B0', dark: '#808080', light: '#D0D0D0', edge: '#ffffff', text: '#333' },
  5000: { base: '#6D4C41', dark: '#3E2723', light: '#8D6E63', edge: '#D4AF37', text: '#D4AF37' },
  10000: { base: '#7B1FA2', dark: '#4A148C', light: '#AB47BC', edge: '#E1BEE7', text: '#fff' },
};

export function PokerChip({ amount, size = 'md', onClick, selected, className = '' }: PokerChipProps) {
  const c = chipColors[amount] || chipColors[1];
  
  const sizes = {
    sm: { w: 36, h: 36, font: '8px', label: '5px', edge: 3, dash: 2 },
    md: { w: 52, h: 52, font: '11px', label: '6px', edge: 4, dash: 2 },
    lg: { w: 68, h: 68, font: '14px', label: '8px', edge: 5, dash: 3 },
  };
  const s = sizes[size];

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-center font-bold
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-110 hover:-translate-y-2' : 'cursor-default'}
        ${selected ? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-black scale-110' : ''}
        ${className}
      `}
      style={{
        width: s.w,
        height: s.w,
        borderRadius: '50%',
        background: `
          radial-gradient(ellipse at 35% 25%, ${c.light} 0%, ${c.base} 40%, ${c.dark} 100%)
        `,
        boxShadow: `
          0 ${s.edge + 2}px ${s.edge * 3}px rgba(0,0,0,0.6),
          0 ${s.edge}px 0 ${s.edge - 1}px ${c.dark},
          inset 0 3px 6px rgba(255,255,255,0.35),
          inset 0 -3px 6px rgba(0,0,0,0.25)
        `,
        color: c.text,
      }}
    >
      <div 
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: `${s.edge + 1}px`,
          border: `${s.dash}px dashed ${c.edge}`,
          opacity: 0.5,
        }}
      />

      <div 
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: `${s.edge + 5}px`,
          border: `1px solid ${c.edge}`,
          opacity: 0.3,
        }}
      />

      <div 
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '3px',
          left: '18%',
          width: '64%',
          height: '30%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
          borderRadius: '50%',
        }}
      />

      <div className="relative z-10 flex flex-col items-center leading-none">
        <span style={{ fontSize: s.label, opacity: 0.7 }}>$Pc</span>
        <span style={{ fontSize: s.font, fontWeight: 800, letterSpacing: '0.5px' }}>
          {amount >= 1000 ? `${amount/1000}K` : amount}
        </span>
      </div>
    </button>
  );
}

interface ChipStackProps {
  amount: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ChipStack({ amount, count = 1, size = 'md' }: ChipStackProps) {
  const stackCount = Math.min(count, 6);
  const c = chipColors[amount] || chipColors[1];
  
  return (
    <div className="relative" style={{ paddingBottom: `${stackCount * 4}px` }}>
      {Array.from({ length: stackCount }).map((_, i) => (
        <div 
          key={i} 
          className="absolute"
          style={{ 
            transform: `translateY(${-i * 5}px) rotate(${i * 7 - 10}deg)`,
            zIndex: stackCount - i,
          }}
        >
          {i > 0 && (
            <div
              className="absolute rounded-full"
              style={{
                width: '100%',
                height: '100%',
                top: '5px',
                background: `linear-gradient(180deg, ${c.dark} 0%, rgba(0,0,0,0.4) 100%)`,
                borderRadius: '50%',
                filter: 'blur(1px)',
                opacity: 0.4,
              }}
            />
          )}
          <PokerChip amount={amount} size={size} />
        </div>
      ))}
      {count > 6 && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 text-[#D4AF37] font-bold whitespace-nowrap"
          style={{ 
            bottom: '-4px', 
            fontSize: '9px',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          x{count}
        </div>
      )}
    </div>
  );
}

interface BetAreaProps {
  label: string;
  chips: { amount: number; count: number }[];
  onClick?: () => void;
  isActive?: boolean;
  totalAmount: number;
}

export function BetArea({ label, chips, onClick, isActive, totalAmount }: BetAreaProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all
        ${isActive 
          ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
          : 'border-[#5D4037]/50 bg-black/40 hover:border-[#D4AF37]/30'
        }
      `}
    >
      <div className="text-[#C0C0C0] text-xs mb-2 tracking-wider uppercase">{label}</div>
      
      <div className="flex flex-wrap gap-1 justify-center min-h-[60px]">
        {chips.length > 0 ? (
          chips.map((chip, i) => (
            <div key={i} className="relative">
              <ChipStack amount={chip.amount} count={chip.count} size="sm" />
            </div>
          ))
        ) : (
          <div className="text-gray-600 text-xs italic">Click to bet</div>
        )}
      </div>
      
      {totalAmount > 0 && (
        <div className="mt-2 text-[#D4AF37] font-bold text-sm">
          {totalAmount} $Pc
        </div>
      )}
    </button>
  );
}
