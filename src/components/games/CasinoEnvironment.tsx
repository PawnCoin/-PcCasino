import { useMemo } from 'react';
import type { ReactNode } from 'react';

interface CasinoEnvironmentProps {
  children: ReactNode;
  gameType?: string;
}

export function CasinoEnvironment({ children, gameType }: CasinoEnvironmentProps) {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 6}s`,
      size: `${1.5 + Math.random() * 2}px`,
    })),
    []
  );

  return (
    <div className="relative min-h-screen" data-game={gameType}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="casino-dust-particle"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      <div className="relative z-[5]">
        {children}
      </div>
    </div>
  );
}
