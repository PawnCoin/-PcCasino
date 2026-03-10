import { useEffect, useState } from 'react';
import { Play, TrendingUp, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onScrollToGames: () => void;
  onOpenDeposit: () => void;
}

export function HeroSection({ onScrollToGames, onOpenDeposit }: HeroSectionProps) {
  const [stats, setStats] = useState({
    volume: 2.4,
    players: 1247,
    jackpot: 500000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        volume: Number((prev.volume + Math.random() * 0.1 - 0.05).toFixed(2)),
        players: Math.floor(prev.players + Math.random() * 10 - 5),
        jackpot: Math.floor(prev.jackpot + Math.random() * 1000),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Main Hero */}
        <div 
          className="relative mb-12 rounded-3xl overflow-hidden border border-[#D4AF37]/40"
          style={{ 
            boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 60px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-black/90" />
          
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5" />
          
          <div className="relative p-8 md:p-16 text-center">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B5E20]/40 border border-[#43A047]/50 mb-6"
              style={{ boxShadow: '0 0 20px rgba(67,160,71,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-[#C0C0C0]">Live Network Active</span>
            </div>
            
            <h1 className="font-casino text-4xl md:text-6xl lg:text-7xl font-black mb-6">
              <span className="text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">THE FUTURE OF</span>
              <br />
              <span className="text-gradient-gold drop-shadow-[0_4px_15px_rgba(212,175,55,0.5)]">GAMING</span>
            </h1>
            
            <p className="text-xl text-[#C0C0C0] mb-8 max-w-2xl mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Play with <span className="text-[#D4AF37] font-bold">$Pc</span> across Poker, 
              Sports, Casino Games. Experience professional-grade gaming with worldwide rules.
            </p>
            
            {/* Buttons - Equal Width */}
            <div className="flex flex-wrap justify-center gap-4">
              {/* Start Playing Button */}
              <Button
                onClick={onScrollToGames}
                className="btn-primary px-8 py-6 rounded-full font-bold text-lg flex items-center justify-center gap-2 min-w-[220px]"
                style={{ boxShadow: '0 10px 30px rgba(212,175,55,0.3)' }}
              >
                <Play className="w-5 h-5" />
                START PLAYING
              </Button>
              
              {/* $PcPay Button - Compact button, large logo */}
              <button
                onClick={onOpenDeposit}
                className="relative px-2 py-1 rounded-full font-bold transition-all hover:scale-105 overflow-hidden group flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(145deg, #D4AF37, #B8860B)',
                  boxShadow: '0 6px 20px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                  border: '2px solid rgba(255,215,0,0.5)',
                  height: '44px',
                  minWidth: '140px'
                }}
              >
                <img 
                  src="/logos/pcpay-button.png" 
                  alt="$PcPay" 
                  className="h-20 w-auto object-contain max-w-[180px]"
                  style={{ transform: 'scale(1.3)' }}
                />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Stats Ticker */}
        <div 
          className="mb-12 overflow-hidden rounded-2xl border border-[#D4AF37]/30"
          style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center py-4 px-6 bg-gradient-to-r from-[#1B5E20]/30 via-[#1B5E20]/20 to-[#1B5E20]/30 backdrop-blur-xl">
            <span className="text-sm font-bold text-[#D4AF37] mr-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              LIVE NETWORK
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-12 animate-marquee whitespace-nowrap">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex gap-12">
                    <span className="text-sm text-[#C0C0C0]">
                      24h Volume: <span className="text-[#43A047] font-bold">{stats.volume.toFixed(1)}M $Pc</span>
                    </span>
                    <span className="text-sm text-[#C0C0C0]">
                      Active Players: <span className="text-[#1E88E5] font-bold">{stats.players.toLocaleString()}</span>
                    </span>
                    <span className="text-sm text-[#C0C0C0]">
                      Jackpot: <span className="text-[#D4AF37] font-bold">{(stats.jackpot / 1000).toFixed(0)}K $Pc</span>
                    </span>
                    <span className="text-sm text-[#C0C0C0]">
                      Tables: <span className="text-[#D4AF37] font-bold">847 Active</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: TrendingUp, label: 'Deposit', sublabel: 'Add $Pc to play', color: 'green' },
            { icon: TrendingUp, label: 'Withdraw', sublabel: 'Cash out winnings', color: 'red' },
            { icon: Users, label: 'Refer Friends', sublabel: 'Earn bonuses', color: 'blue' },
            { icon: Trophy, label: 'Tournaments', sublabel: 'Compete & win', color: 'yellow' },
          ].map((action) => {
            const Icon = action.icon;
            const colorClasses: Record<string, string> = {
              green: 'from-[#43A047]/30 to-[#2E7D32]/30 text-[#66BB6A] border-[#43A047]/50 shadow-[0_0_20px_rgba(67,160,71,0.2)]',
              red: 'from-[#B71C1C]/30 to-[#8B0000]/30 text-[#EF5350] border-[#B71C1C]/50 shadow-[0_0_20px_rgba(183,28,28,0.2)]',
              blue: 'from-[#1E88E5]/30 to-[#1565C0]/30 text-[#42A5F5] border-[#1E88E5]/50 shadow-[0_0_20px_rgba(30,136,229,0.2)]',
              yellow: 'from-[#D4AF37]/30 to-[#B8860B]/30 text-[#F4D03F] border-[#D4AF37]/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]',
            };
            
            return (
              <button
                key={action.label}
                className={`relative p-5 rounded-xl bg-gradient-to-br ${colorClasses[action.color]} border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] group overflow-hidden`}
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 5px 20px rgba(0,0,0,0.3)' }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorClasses[action.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-white/10`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{action.label}</div>
                <div className="text-xs text-[#C0C0C0]">{action.sublabel}</div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
