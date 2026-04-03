import { useEffect, useRef, useState } from 'react';
import type { GameType } from '@/types';

interface GameCard {
  id: GameType;
  name: string;
  description: string;
  image: string;
  minBet: number;
  activeTables: number;
  badge: 'LIVE' | 'HOT' | 'NEW' | 'CLASSIC' | 'JACKPOT';
  href: string;
}

const games: GameCard[] = [
  {
    id: 'poker',
    name: "Texas Hold'em",
    description: 'High-stakes poker with worldwide rules. Play against real players in live tournaments.',
    image: '/logos/game-poker.png',
    minBet: 50,
    activeTables: 142,
    badge: 'LIVE',
    href: '/game/poker',
  },
  {
    id: 'spanish21',
    name: 'Spanish 21 + Side Bets',
    description: 'Blackjack variant with 3 Card Poker, Match The Dealer, and Perfect Pair side bets.',
    image: '/logos/game-spanish21.png',
    minBet: 10,
    activeTables: 89,
    badge: 'NEW',
    href: '/game/spanish21',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer to 21. Multiple hands, side bets, and insurance.',
    image: '/logos/game-blackjack.png',
    minBet: 5,
    activeTables: 234,
    badge: 'HOT',
    href: '/game/blackjack',
  },
  {
    id: 'spades',
    name: 'Spades',
    description: 'Classic partnership trick-taking card game. Bid and win tricks with your partner.',
    image: '/logos/game-spades.png',
    minBet: 5,
    activeTables: 67,
    badge: 'CLASSIC',
    href: '/game/spades',
  },
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'European & American wheels with racetrack betting.',
    image: '/logos/game-roulette.png',
    minBet: 1,
    activeTables: 56,
    badge: 'LIVE',
    href: '/game/roulette',
  },
  {
    id: 'craps',
    name: 'Craps & Dice',
    description: 'Street craps and casino craps with full point system.',
    image: '/logos/game-craps.png',
    minBet: 5,
    activeTables: 34,
    badge: 'NEW',
    href: '/game/craps',
  },
  {
    id: 'slots',
    name: 'Slots',
    description: 'Progressive jackpots with $Pc themed reels.',
    image: '/logos/game-slots.png',
    minBet: 0.1,
    activeTables: 0,
    badge: 'JACKPOT',
    href: '/game/slots',
  },
  {
    id: 'bingo',
    name: 'Bingo 75-Ball',
    description: 'American 75-ball bingo with voice caller, win patterns, and blackout jackpots.',
    image: '/logos/pc-logo.png',
    minBet: 5,
    activeTables: 28,
    badge: 'HOT',
    href: '/game/bingo',
  },
  {
    id: 'dominoes',
    name: 'Dominoes',
    description: 'Classic Draw Dominoes on a square table. Slam your last tile and crack the table to win!',
    image: '/logos/pc-logo.png',
    minBet: 5,
    activeTables: 18,
    badge: 'NEW',
    href: '/game/dominoes',
  },
];

const badgeStyles: Record<string, string> = {
  LIVE: 'bg-[#43A047]/40 text-[#66BB6A] border-[#43A047]/60 shadow-[0_0_15px_rgba(67,160,71,0.5)]',
  HOT: 'bg-[#B71C1C]/40 text-[#EF5350] border-[#B71C1C]/60 shadow-[0_0_15px_rgba(183,28,28,0.5)]',
  NEW: 'bg-[#1E88E5]/40 text-[#42A5F5] border-[#1E88E5]/60 shadow-[0_0_15px_rgba(30,136,229,0.5)]',
  CLASSIC: 'bg-[#D4AF37]/40 text-[#F4D03F] border-[#D4AF37]/60 shadow-[0_0_15px_rgba(212,175,55,0.5)]',
  JACKPOT: 'bg-[#C2185B]/40 text-[#F06292] border-[#C2185B]/60 shadow-[0_0_15px_rgba(194,24,87,0.5)]',
};

const badgeGlowAnimation: Record<string, string> = {
  LIVE: 'animate-badge-glow-green',
  HOT: 'animate-badge-glow-red',
  NEW: 'animate-badge-glow-blue',
  CLASSIC: 'animate-badge-glow-gold',
  JACKPOT: 'animate-badge-glow-pink',
};

interface GamesGridProps {
  onSelectGame: (game: GameType) => void;
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['rgba(212,175,55,', 'rgba(255,215,0,', 'rgba(192,192,192,'];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += (Math.random() - 0.5) * 0.01;
        p.alpha = Math.max(0.05, Math.min(0.5, p.alpha));

        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha * 0.2})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export function GamesGrid({ onSelectGame }: GamesGridProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, gameId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
    setHoveredCard(gameId);
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
    setMousePos({ x: 0.5, y: 0.5 });
  };

  const getCardTransform = (gameId: string) => {
    if (hoveredCard !== gameId) return 'rotateX(5deg)';
    const rotateY = (mousePos.x - 0.5) * 20;
    const rotateX = (0.5 - mousePos.y) * 15 + 5;
    return `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
  };

  const getSpotlightGradient = (gameId: string) => {
    if (hoveredCard !== gameId) return 'none';
    const x = mousePos.x * 100;
    const y = mousePos.y * 100;
    return `radial-gradient(circle at ${x}% ${y}%, rgba(212,175,55,0.15) 0%, transparent 60%)`;
  };

  return (
    <section id="games-section" className="px-4 pb-12 relative">
      <ParticleBackground />
      <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
        <h2 
          className="font-casino text-3xl font-bold mb-8 flex items-center gap-3 metallic-gold-text"
          style={{ textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              boxShadow: '0 0 25px rgba(212,175,55,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,215,0,0.5)'
            }}
          >
            <span className="text-2xl">🎲</span>
          </div>
          CASINO GAMES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {games.map((game, index) => (
            <div
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              onMouseMove={(e) => handleMouseMove(e, game.id)}
              onMouseLeave={handleMouseLeave}
              className="group relative cursor-pointer z-10 game-card-entrance"
              style={{ perspective: '1200px', animationDelay: `${index * 80}ms` }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectGame(game.id);
                }
              }}
            >
              <div 
                className="relative transition-all duration-500 transform-gpu"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: getCardTransform(game.id),
                }}
              >
                <div 
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 rounded-full opacity-40 group-hover:opacity-60 transition-opacity"
                  style={{ 
                    background: 'radial-gradient(ellipse, rgba(0,0,0,0.8), transparent 70%)',
                    filter: 'blur(8px)',
                    transform: 'translateZ(-30px)'
                  }}
                />

                <div 
                  className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ 
                    background: 'linear-gradient(135deg, #D4AF37, #FFD700, #B8860B)',
                    filter: 'blur(12px)',
                    transform: 'translateZ(-20px)'
                  }}
                />
                
                <div 
                  className="relative rounded-2xl overflow-hidden transition-all duration-500 group-hover:translate-y-[-12px]"
                  style={{ 
                    background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                    border: '1px solid rgba(93,64,55,0.6)',
                    boxShadow: `
                      0 25px 50px rgba(0,0,0,0.8),
                      0 10px 20px rgba(0,0,0,0.5),
                      inset 0 1px 0 rgba(255,255,255,0.08),
                      inset 0 -1px 0 rgba(0,0,0,0.5)
                    `,
                    transform: 'translateZ(0)'
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ 
                      background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)'
                    }}
                  />

                  <div className="relative h-44 overflow-hidden">
                    <img 
                      src={game.image} 
                      alt={game.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      style={{ 
                        filter: 'brightness(0.85) contrast(1.1)',
                      }}
                    />
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 40%)'
                      }}
                    />
                    
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: 'linear-gradient(to top, #0a0a0a 0%, transparent 50%)'
                      }}
                    />

                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: getSpotlightGradient(game.id) }}
                    />
                    
                    <span 
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm transition-all duration-300 group-hover:scale-110 ${badgeStyles[game.badge]} ${badgeGlowAnimation[game.badge]}`}
                      style={{ 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {game.badge}
                    </span>
                  </div>

                  <div className="p-5 relative">
                    <h3 
                      className="font-casino text-xl font-bold mb-2 text-white group-hover:text-[#D4AF37] transition-all duration-300"
                      style={{ 
                        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                      }}
                    >
                      {game.name}
                    </h3>
                    <p className="text-sm text-[#A0A0A0] mb-4 line-clamp-2">
                      {game.description}
                    </p>

                    <div 
                      className="flex items-center justify-between text-sm pt-4 border-t border-[#5D4037]/40"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                    >
                      <span className="text-[#707070]">
                        {game.activeTables > 0 ? `${game.activeTables} tables` : '500K Jackpot'}
                      </span>
                      <span 
                        className="text-[#D4AF37] font-bold px-3 py-1 rounded-full"
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                          border: '1px solid rgba(212,175,55,0.4)',
                          boxShadow: '0 0 15px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}
                      >
                        {game.minBet} $Pc
                      </span>
                    </div>
                  </div>

                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.08) 50%, rgba(212,175,55,0) 100%)'
                    }}
                  />

                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ 
                      background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
