import { useMemo } from 'react';
import type { ReactNode } from 'react';

interface CasinoEnvironmentProps {
  children: ReactNode;
  gameType?: string;
}

export function CasinoEnvironment({ children, gameType }: CasinoEnvironmentProps) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 6}s`,
      size: `${1.5 + Math.random() * 2}px`,
    })),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden" data-game={gameType}>
      <div
        className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
        }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-48 h-16"
          style={{
            background: 'radial-gradient(ellipse at center bottom, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.08) 40%, transparent 70%)',
            filter: 'blur(2px)',
          }}
        />
        <div
          className="absolute left-[20%] top-0 w-32 h-14"
          style={{
            background: 'radial-gradient(ellipse at center bottom, rgba(212,175,55,0.12) 0%, transparent 60%)',
            filter: 'blur(3px)',
          }}
        />
        <div
          className="absolute right-[20%] top-0 w-32 h-14"
          style={{
            background: 'radial-gradient(ellipse at center bottom, rgba(212,175,55,0.12) 0%, transparent 60%)',
            filter: 'blur(3px)',
          }}
        />
      </div>

      <div
        className="absolute top-0 left-0 bottom-0 w-8 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(30,20,15,0.4) 40%, transparent 100%)',
        }}
      />
      <div
        className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(270deg, rgba(0,0,0,0.7) 0%, rgba(30,20,15,0.4) 40%, transparent 100%)',
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(10,10,10,0.3) 50%, transparent 100%)',
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-4"
          style={{
            background: 'linear-gradient(0deg, rgba(212,175,55,0.05) 0%, transparent 100%)',
          }}
        />
      </div>

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
