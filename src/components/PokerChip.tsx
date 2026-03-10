// PokerChip Component - Visual casino chips with $Pc branding

interface PokerChipProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const chipColors: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'from-white to-gray-200', border: '#9e9e9e', text: '#333' },
  5: { bg: 'from-red-500 to-red-700', border: '#ffcdd2', text: '#fff' },
  10: { bg: 'from-blue-500 to-blue-700', border: '#bbdefb', text: '#fff' },
  25: { bg: 'from-green-500 to-green-700', border: '#c8e6c9', text: '#fff' },
  50: { bg: 'from-orange-500 to-orange-700', border: '#ffe0b2', text: '#fff' },
  100: { bg: 'from-black to-gray-800', border: '#e0e0e0', text: '#fff' },
  500: { bg: 'from-[#D4AF37] to-[#B8860B]', border: '#4a3c00', text: '#4a3c00' },
  1000: { bg: 'from-[#C0C0C0] to-[#808080]', border: '#fff', text: '#333' },
  5000: { bg: 'from-[#8B4513] to-[#5D4037]', border: '#D4AF37', text: '#D4AF37' },
};

export function PokerChip({ amount, size = 'md', onClick, selected, className = '' }: PokerChipProps) {
  const colors = chipColors[amount] || chipColors[1];
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[8px]',
    md: 'w-12 h-12 text-[10px]',
    lg: 'w-16 h-16 text-xs',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-full flex items-center justify-center font-bold
        bg-gradient-to-br ${colors.bg}
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-110 hover:-translate-y-1' : 'cursor-default'}
        ${selected ? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-black scale-110' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        boxShadow: `
          0 4px 8px rgba(0,0,0,0.5),
          inset 0 2px 4px rgba(255,255,255,0.3),
          0 0 0 3px ${colors.border}
        `,
        color: colors.text,
      }}
    >
      {/* Dashed border pattern */}
      <div 
        className="absolute inset-1 rounded-full border-2 border-dashed opacity-60"
        style={{ borderColor: colors.border }}
      />
      
      {/* Inner content */}
      <div className="relative z-10 flex flex-col items-center leading-none">
        <span className="text-[6px] opacity-70">$Pc</span>
        <span>{amount >= 1000 ? `${amount/1000}K` : amount}</span>
      </div>
      
      {/* Shine effect */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1/2 h-1/3 bg-white/20 rounded-full blur-[1px]" />
    </button>
  );
}

// Chip stack component for showing multiple chips
interface ChipStackProps {
  amount: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ChipStack({ amount, count = 1, size = 'md' }: ChipStackProps) {
  return (
    <div className="relative">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <div 
          key={i} 
          className="absolute"
          style={{ 
            transform: `translateY(${-i * 3}px)`,
            zIndex: count - i 
          }}
        >
          <PokerChip amount={amount} size={size} />
        </div>
      ))}
      {count > 5 && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-[#D4AF37] whitespace-nowrap">
          x{count}
        </div>
      )}
    </div>
  );
}

// Bet area with chips
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
      
      {/* Chip display */}
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
      
      {/* Total amount */}
      {totalAmount > 0 && (
        <div className="mt-2 text-[#D4AF37] font-bold text-sm">
          {totalAmount} $Pc
        </div>
      )}
    </button>
  );
}
