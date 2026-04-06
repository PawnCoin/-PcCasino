import { useState, useEffect } from 'react';
import { ChipFace } from './PokerChip';

interface AnimatedChipProps {
  amount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete?: () => void;
}

export function AnimatedChip({ amount, startX, startY, endX, endY, onComplete }: AnimatedChipProps) {
  const [position, setPosition] = useState({ x: startX, y: startY });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setPosition({
        x: startX + (endX - startX) * easeOut,
        y: startY + (endY - startY) * easeOut,
      });

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

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
      }}
    >
      <ChipFace amount={amount} size={44} />
    </div>
  );
}

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
