import { useEffect, useState } from 'react';

interface JackpotCelebrationProps {
  amount: number;
  username: string;
  onClose: () => void;
}

export function JackpotCelebration({ amount, username, onClose }: JackpotCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number }>>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', '#FB5607', '#FF006E', '#8338EC', '#3A86FF'];
    const ps = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      delay: Math.random() * 2,
    }));
    setParticles(ps);

    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(2))}M`;
    if (n >= 1_000) return `${parseFloat((n / 1_000).toFixed(1))}K`;
    return n.toLocaleString();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.25) 0%, rgba(0,0,0,0.95) 70%)' }}
      onClick={onClose}
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `jackpotParticleFall ${2 + p.delay}s ease-in ${p.delay * 0.3}s infinite`,
            opacity: 0.85,
          }}
        />
      ))}

      <div
        className="relative z-10 flex flex-col items-center gap-6 px-10 py-12 rounded-3xl text-center max-w-lg mx-4"
        style={{
          background: 'linear-gradient(145deg, rgba(30,20,5,0.97), rgba(10,5,0,0.98))',
          border: '2px solid #D4AF37',
          boxShadow: '0 0 80px rgba(212,175,55,0.6), 0 0 160px rgba(212,175,55,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl animate-bounce select-none">🎰</div>

        <div>
          <div
            className="text-sm font-bold tracking-[0.3em] mb-1"
            style={{ color: '#D4AF37', textShadow: '0 0 20px rgba(212,175,55,0.8)' }}
          >
            PROGRESSIVE JACKPOT
          </div>
          <div
            className="font-casino text-5xl font-black mb-2"
            style={{ color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.9), 0 0 60px rgba(255,215,0,0.5)' }}
          >
            YOU WON!
          </div>
          <div
            className="font-casino text-3xl font-bold"
            style={{ color: '#FFF', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
          >
            {formatAmount(amount)} $Pc
          </div>
        </div>

        <div className="text-base text-yellow-200 opacity-80">
          Congratulations, <span className="font-bold text-yellow-400">{username}</span>!<br />
          The jackpot has been credited to your balance.
        </div>

        <div className="flex gap-2 text-3xl select-none animate-pulse">
          <span>🎊</span><span>🏆</span><span>💎</span><span>🏆</span><span>🎊</span>
        </div>

        <button
          onClick={onClose}
          className="px-8 py-3 rounded-full font-bold text-base transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
            color: '#000',
            boxShadow: '0 0 20px rgba(212,175,55,0.5)',
          }}
        >
          Collect Winnings
        </button>
        <div className="text-xs text-gray-500">Click anywhere to dismiss</div>
      </div>

      <style>{`
        @keyframes jackpotParticleFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
