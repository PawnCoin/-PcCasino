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
    image: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=2073&auto=format&fit=crop',
    minBet: 50,
    activeTables: 142,
    badge: 'LIVE',
    href: '/game/poker',
  },
  {
    id: 'spanish21',
    name: 'Spanish 21 + Side Bets',
    description: 'Blackjack variant with 3 Card Poker, Match The Dealer, and Perfect Pair side bets.',
    image: 'https://images.unsplash.com/photo-1541278107931-e006523892df?q=80&w=2071&auto=format&fit=crop',
    minBet: 10,
    activeTables: 89,
    badge: 'NEW',
    href: '/game/spanish21',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer to 21. Multiple hands, side bets, and insurance.',
    image: 'https://images.unsplash.com/photo-1541278107931-e006523892df?q=80&w=2071&auto=format&fit=crop',
    minBet: 5,
    activeTables: 234,
    badge: 'HOT',
    href: '/game/blackjack',
  },
  {
    id: 'spades',
    name: 'Spades',
    description: 'Classic partnership trick-taking card game. Bid and win tricks with your partner.',
    image: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=2073&auto=format&fit=crop',
    minBet: 5,
    activeTables: 67,
    badge: 'CLASSIC',
    href: '/game/spades',
  },
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'European & American wheels with racetrack betting.',
    image: 'https://images.unsplash.com/photo-1596838132731-dd9d7fab3097?q=80&w=2070&auto=format&fit=crop',
    minBet: 1,
    activeTables: 56,
    badge: 'LIVE',
    href: '/game/roulette',
  },
  {
    id: 'craps',
    name: 'Craps & Dice',
    description: 'Street craps and casino craps with full point system.',
    image: 'https://images.unsplash.com/photo-1596838132731-dd9d7fab3097?q=80&w=2070&auto=format&fit=crop',
    minBet: 5,
    activeTables: 34,
    badge: 'NEW',
    href: '/game/craps',
  },
  {
    id: 'slots',
    name: 'Slots',
    description: 'Progressive jackpots with $Pc themed reels.',
    image: 'https://images.unsplash.com/photo-1596838132731-dd9d7fab3097?q=80&w=2070&auto=format&fit=crop',
    minBet: 0.1,
    activeTables: 0,
    badge: 'JACKPOT',
    href: '/game/slots',
  },
];

const badgeStyles: Record<string, string> = {
  LIVE: 'bg-[#43A047]/40 text-[#66BB6A] border-[#43A047]/60 shadow-[0_0_15px_rgba(67,160,71,0.5)]',
  HOT: 'bg-[#B71C1C]/40 text-[#EF5350] border-[#B71C1C]/60 shadow-[0_0_15px_rgba(183,28,28,0.5)]',
  NEW: 'bg-[#1E88E5]/40 text-[#42A5F5] border-[#1E88E5]/60 shadow-[0_0_15px_rgba(30,136,229,0.5)]',
  CLASSIC: 'bg-[#D4AF37]/40 text-[#F4D03F] border-[#D4AF37]/60 shadow-[0_0_15px_rgba(212,175,55,0.5)]',
  JACKPOT: 'bg-[#C2185B]/40 text-[#F06292] border-[#C2185B]/60 shadow-[0_0_15px_rgba(194,24,87,0.5)]',
};

interface GamesGridProps {
  onSelectGame: (game: GameType) => void;
}

export function GamesGrid({ onSelectGame }: GamesGridProps) {
  return (
    <section id="games-section" className="px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <h2 
          className="font-casino text-3xl font-bold mb-8 flex items-center gap-3 text-[#D4AF37]"
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
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className="group relative cursor-pointer z-10"
              style={{ perspective: '1200px' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectGame(game.id);
                }
              }}
            >
              {/* 3D Card Container with depth */}
              <div 
                className="relative transition-all duration-500 transform-gpu"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(5deg)',
                }}
              >
                {/* Floating shadow */}
                <div 
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 rounded-full opacity-40 group-hover:opacity-60 transition-opacity"
                  style={{ 
                    background: 'radial-gradient(ellipse, rgba(0,0,0,0.8), transparent 70%)',
                    filter: 'blur(8px)',
                    transform: 'translateZ(-30px)'
                  }}
                />

                {/* Gold Glow Effect */}
                <div 
                  className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ 
                    background: 'linear-gradient(135deg, #D4AF37, #FFD700, #B8860B)',
                    filter: 'blur(12px)',
                    transform: 'translateZ(-20px)'
                  }}
                />
                
                {/* Main Card - 3D depth */}
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
                  {/* Top metallic edge */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ 
                      background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)'
                    }}
                  />

                  {/* Game Image with 3D depth */}
                  <div className="relative h-44 overflow-hidden">
                    <img 
                      src={game.image} 
                      alt={game.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      style={{ 
                        filter: 'brightness(0.85) contrast(1.1)',
                      }}
                    />
                    {/* Top shine effect */}
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 40%)'
                      }}
                    />
                    
                    {/* Bottom gradient fade */}
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: 'linear-gradient(to top, #0a0a0a 0%, transparent 50%)'
                      }}
                    />
                    
                    {/* 3D Badge */}
                    <span 
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm transition-all duration-300 group-hover:scale-110 ${badgeStyles[game.badge]}`}
                      style={{ 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {game.badge}
                    </span>
                  </div>

                  {/* Content with 3D depth */}
                  <div className="p-5 relative">
                    {/* Title with gold glow */}
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

                    {/* Footer with metallic look */}
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

                  {/* Hover overlay shine */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.08) 50%, rgba(212,175,55,0) 100%)'
                    }}
                  />

                  {/* Bottom metallic edge on hover */}
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
