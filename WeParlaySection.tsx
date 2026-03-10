import { useState } from 'react';
import { ExternalLink, Info, TrendingUp, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WeParlaySectionProps {
  userBalance: number;
}

export function WeParlaySection({ userBalance }: WeParlaySectionProps) {
  const [showInfo, setShowInfo] = useState(false);

  const features = [
    {
      icon: TrendingUp,
      title: 'Live Betting',
      description: 'Bet on live sports events with real-time odds',
    },
    {
      icon: Shield,
      title: 'Secure & Trusted',
      description: 'Your $Pc tokens are safe with blockchain verification',
    },
    {
      icon: Zap,
      title: 'Instant Payouts',
      description: 'Winning bets paid out instantly to your wallet',
    },
  ];

  return (
    <section id="weparlay-section" className="px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-casino text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-gradient-gold">WeParlay.io</span>
            <span className="text-gray-400 text-sm font-normal">Sports Betting</span>
          </h2>
          <Button variant="ghost" onClick={() => setShowInfo(true)} className="text-[#D4AF37]">
            <Info className="w-4 h-4 mr-2" />
            How it Works
          </Button>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-[#D4AF37]/20">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f0f1a] to-[#1a1a2e] p-6 border-b border-[#D4AF37]/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="font-casino text-xl font-bold text-white mb-1">
                  Bet with <span className="text-[#D4AF37]">$Pc</span> on WeParlay.io
                </h3>
                <p className="text-gray-400 text-sm">
                  The premier crypto sports betting platform
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">Your Balance</div>
                  <div className="font-bold text-[#D4AF37] text-xl flex items-center gap-2">
                    <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5" />
                    {userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc
                  </div>
                </div>
                
                <a
                  href="https://weparlay.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="btn-primary">
                    Go to WeParlay.io
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#B8860B]/20 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-bold text-white mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/logos/pcpay-logo.png" 
                  alt="$PcPay" 
                  className="h-8 opacity-80"
                />
                <span className="text-gray-400">Powered by $PcPay Crypto Payments</span>
              </div>
              
              <div className="flex gap-3">
                <a
                  href="https://weparlay.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D4AF37] hover:underline text-sm"
                >
                  Visit WeParlay.io →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Active Events', value: '247', color: 'text-green-400' },
            { label: 'Live Matches', value: '89', color: 'text-red-400' },
            { label: 'Total Volume', value: '2.4M $Pc', color: 'text-[#D4AF37]' },
            { label: 'Players Online', value: '1,247', color: 'text-blue-400' },
          ].map((stat, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="glass-panel-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-gradient-gold">
              How WeParlay.io Works
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-white/5">
              <div className="font-bold text-white mb-2">1. Connect Your Wallet</div>
              <p className="text-gray-400">
                Link your $Pc wallet to WeParlay.io for seamless betting.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5">
              <div className="font-bold text-white mb-2">2. Choose Your Event</div>
              <p className="text-gray-400">
                Browse hundreds of live sports events with competitive odds.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5">
              <div className="font-bold text-white mb-2">3. Place Your Bet</div>
              <p className="text-gray-400">
                Bet with $Pc tokens. Minimum bets start at just 10 $Pc.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5">
              <div className="font-bold text-white mb-2">4. Instant Payouts</div>
              <p className="text-gray-400">
                Winnings are sent directly to your wallet after the event ends.
              </p>
            </div>
            
            <a
              href="https://weparlay.io"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full btn-primary">
                Start Betting on WeParlay.io
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
