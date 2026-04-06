import { useState } from 'react';
import { ExternalLink, Info, TrendingUp, Shield, Zap, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WeParlaySectionProps {
  userBalance: number;
  onSelectVip?: () => void;
}

export function WeParlaySection({ userBalance, onSelectVip }: WeParlaySectionProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showVipInfo, setShowVipInfo] = useState(false);

  return (
    <section id="weparlay-section" className="px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-casino text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-gradient-gold">Featured Areas</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sports Gambling Card — WeParlay */}
          <div
            className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #0d1b2e 0%, #0a1220 100%)',
              border: '1px solid rgba(21,101,192,0.4)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Top badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider" style={{ background: 'rgba(21,101,192,0.3)', color: '#64B5F6', border: '1px solid rgba(21,101,192,0.5)' }}>
                SPORTS
              </span>
            </div>

            {/* Hero image area */}
            <div className="h-44 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(21,101,192,0.1) 0%, rgba(13,27,46,0.8) 100%)' }}>
              <div className="text-8xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">🏈</div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-1">
                <h3 className="font-casino text-2xl font-bold text-white">Sports Gambling</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                NFL, NBA, MLB, UFC &amp; more. Live betting, parlays, and spreads powered by WeParlay Inc.
              </p>
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>🏈</span>
                  <span>WeParlay Inc.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInfo(true)}
                    className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Free Picks
                  </button>
                  <a href="https://weparlay.com" target="_blank" rel="noopener noreferrer">
                    <button
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, rgba(21,101,192,0.3), rgba(13,71,161,0.5))', color: '#64B5F6', border: '1px solid rgba(21,101,192,0.5)' }}
                    >
                      Bet Now <ExternalLink className="w-3 h-3 inline ml-1" />
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Adult VIP Area Card */}
          <div
            className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #0d0018 0%, #15003a 50%, #0d0018 100%)',
              border: '1px solid rgba(160,32,240,0.5)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(160,32,240,0.1)',
            }}
          >
            {/* Top badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider" style={{ background: 'rgba(160,32,240,0.3)', color: '#E040FB', border: '1px solid rgba(160,32,240,0.5)' }}>
                VIP EXCLUSIVE
              </span>
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(160,32,240,0.4) 0%, transparent 60%)' }} />

            {/* Hero image area */}
            <div className="h-44 flex items-center justify-center relative" style={{ background: 'linear-gradient(180deg, rgba(160,32,240,0.1) 0%, rgba(13,0,24,0.8) 100%)' }}>
              <div className="text-8xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">👑</div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-1">
                <h3 className="font-casino text-2xl font-bold" style={{ color: '#E040FB' }}>Adult V.I.P. Area</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Exclusive 18+ private lounge. Invite-only games, private dance rooms, and all casino games.
              </p>
              <div className="border-t border-purple-900/40 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(200,100,220,0.8)' }}>
                  <span className="text-base">🔞</span>
                  <span>18+ Only</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVipInfo(true)}
                    className="px-3 py-2 rounded-xl text-xs transition-colors"
                    style={{ background: 'rgba(160,32,240,0.1)', color: '#c084fc', border: '1px solid rgba(160,32,240,0.3)' }}
                  >
                    <Info className="w-3 h-3 inline mr-1" /> Info
                  </button>
                  <button
                    onClick={onSelectVip}
                    className="px-5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #6A0DAD, #A020F0)', color: 'white', boxShadow: '0 0 20px rgba(160,32,240,0.4)' }}
                  >
                    INVITE →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Active Events', value: '247', color: 'text-green-400' },
            { label: 'Live Matches', value: '89', color: 'text-red-400' },
            { label: 'Total Volume', value: '2.4M $Pc', color: 'text-[#D4AF37]' },
            { label: 'Players Online', value: '1,247', color: 'text-blue-400' },
          ].map((stat, index) => (
            <div key={index} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WeParlay Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md" style={{ background: 'rgba(8,16,32,0.99)', border: '1px solid rgba(21,101,192,0.4)' }}>
          <DialogHeader>
            <DialogTitle className="font-casino text-xl" style={{ color: '#64B5F6' }}>
              🏈 WeParlay Free Picks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { title: '1. Connect Your Wallet', desc: 'Link your $Pc wallet to WeParlay for seamless sports betting.' },
              { title: '2. Get Free Picks', desc: 'Expert picks available daily — NFL, NBA, MLB, UFC, soccer and more.' },
              { title: '3. Place Your Bet', desc: 'Bet with $Pc tokens. Minimum bet: 10 $Pc. Parlays welcome.' },
              { title: '4. Instant Payouts', desc: 'Winnings sent directly to your wallet the moment the game ends.' },
            ].map((step, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.2)' }}>
                <div className="font-bold text-white mb-1">{step.title}</div>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
            <a href="https://weparlay.com" target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full" style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)', color: 'white' }}>
                Open WeParlay <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIP Info Dialog */}
      <Dialog open={showVipInfo} onOpenChange={setShowVipInfo}>
        <DialogContent className="max-w-md" style={{ background: 'rgba(13,0,24,0.99)', border: '1px solid rgba(160,32,240,0.4)' }}>
          <DialogHeader>
            <DialogTitle className="font-casino text-xl" style={{ color: '#E040FB' }}>
              👑 Adult V.I.P. Area
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(160,32,240,0.1)', border: '1px solid rgba(160,32,240,0.3)' }}>
              <div className="text-3xl mb-2">🔞</div>
              <p className="text-purple-300 font-bold">Strictly 18+ Only</p>
              <p className="text-gray-400 text-xs mt-1">Age verification required upon entry</p>
            </div>
            {[
              { icon: Crown, title: 'Exclusive Private Tables', desc: 'High-stakes invite-only games with VIP buy-ins' },
              { icon: Shield, title: 'Private Rooms', desc: 'Invite friends to password-protected private dance rooms' },
              { icon: Zap, title: 'VIP Bonuses', desc: 'Exclusive bonuses, cashback, and weekly $Pc rewards' },
              { icon: Lock, title: 'Premium Access', desc: 'Access all casino games with no limits inside the VIP area' },
            ].map((item, i) => {
              const IIcon = item.icon;
              return (
                <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: 'rgba(160,32,240,0.06)', border: '1px solid rgba(160,32,240,0.15)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(160,32,240,0.2)' }}>
                    <IIcon className="w-4 h-4" style={{ color: '#E040FB' }} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">{item.title}</div>
                    <div className="text-gray-400 text-xs">{item.desc}</div>
                  </div>
                </div>
              );
            })}
            <Button
              onClick={() => { setShowVipInfo(false); onSelectVip?.(); }}
              className="w-full font-bold"
              style={{ background: 'linear-gradient(135deg, #6A0DAD, #A020F0)', color: 'white', boxShadow: '0 0 20px rgba(160,32,240,0.3)' }}
            >
              Enter VIP Area →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
