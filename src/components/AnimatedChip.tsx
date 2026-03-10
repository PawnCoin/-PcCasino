import { useState, useEffect } from 'react';

interface AnimatedChipProps {
  amount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete?: () => void;
}

const chipColors: Record<number, { bg: string; border: string }> = {
  1: { bg: 'from-white to-gray-200', border: 'border-gray-400' },
  5: { bg: 'from-red-500 to-red-700', border: 'border-red-800' },
  10: { bg: 'from-blue-500 to-blue-700', border: 'border-blue-800' },
  25: { bg: 'from-green-500 to-green-700', border: 'border-green-800' },
  50: { bg: 'from-orange-500 to-orange-700', border: 'border-orange-800' },
  100: { bg: 'from-gray-800 to-black', border: 'border-gray-600' },
  500: { bg: 'from-[#D4AF37] to-[#B8860B]', border: 'border-[#8B6914]' },
  1000: { bg: 'from-gray-300 to-gray-400', border: 'border-gray-500' },
};

export function AnimatedChip({ amount, startX, startY, endX, endY, onComplete }: AnimatedChipProps) {
  const [position, setPosition] = useState({ x: startX, y: startY });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function - ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setPosition({
        x: startX + (endX - startX) * easeOut,
        y: startY + (endY - startY) * easeOut,
      });

      // Scale up slightly then settle
      if (progress < 0.5) {
        setScale(1 + Math.sin(progress * Math.PI) * 0.2);
      } else {
        setScale(1);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [startX, startY, endX, endY, onComplete]);

  const colors = chipColors[amount] || chipColors[1];

  return (
    <div
      className={`fixed z-50 w-10 h-10 rounded-full bg-gradient-to-br ${colors.bg} ${colors.border} border-2 flex flex-col items-center justify-center pointer-events-none`}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
      }}
    >
      {/* Chip pattern */}
      <div className="absolute inset-2 rounded-full border border-dashed border-white/40" />
      
      {/* $Pc logo */}
      <span className="text-[6px] font-bold text-white/80">$Pc</span>
      
      {/* Amount */}
      <span className="text-[8px] font-bold text-white">{amount}</span>
      
      {/* Shine effect */}
      <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/30" />
    </div>
  );
}

// Hook for managing chip animations
export function useChipAnimations() {
  const [animations, setAnimations] = useState<Array<{
    id: string;
    amount: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }>>([]);

  const addChipAnimation = (amount: number, startX: number, startY: number, endX: number, endY: number) => {
    const id = `chip_${Date.now()}_${Math.random()}`;
    setAnimations(prev => [...prev, { id, amount, startX, startY, endX, endY }]);
    
    // Remove after animation completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 500);
  };

  const ChipAnimations = () => (
    <>
      {animations.map(anim => (
        <AnimatedChip
          key={anim.id}
          amount={anim.amount}
          startX={anim.startX}
          startY={anim.startY}
          endX={anim.endX}
          endY={anim.endY}
        />
      ))}
    </>
  );

  return { addChipAnimation, ChipAnimations };
}
