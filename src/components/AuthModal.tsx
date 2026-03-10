import { useState } from 'react';
import { Wallet, Twitter, MessageCircle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: 'google' | 'twitter' | 'discord' | 'telegram') => void;
  onWalletConnect: () => void;
}

export function AuthModal({ isOpen, onClose, onConnect, onWalletConnect }: AuthModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleSocialConnect = async (provider: 'google' | 'twitter' | 'discord' | 'telegram') => {
    setConnecting(provider);
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    onConnect(provider);
    setConnecting(null);
  };

  const socialProviders = [
    { 
      id: 'google' as const, 
      name: 'Google', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      color: '#EA4335',
      bgColor: 'from-[#EA4335]/20 to-[#EA4335]/10',
      borderColor: '#EA4335/50'
    },
    { 
      id: 'twitter' as const, 
      name: 'Twitter / X', 
      icon: <Twitter className="w-5 h-5" />,
      color: '#1DA1F2',
      bgColor: 'from-[#1DA1F2]/20 to-[#1DA1F2]/10',
      borderColor: '#1DA1F2/50'
    },
    { 
      id: 'discord' as const, 
      name: 'Discord', 
      icon: <MessageCircle className="w-5 h-5" />,
      color: '#5865F2',
      bgColor: 'from-[#5865F2]/20 to-[#5865F2]/10',
      borderColor: '#5865F2/50'
    },
    { 
      id: 'telegram' as const, 
      name: 'Telegram', 
      icon: <Send className="w-5 h-5" />,
      color: '#0088cc',
      bgColor: 'from-[#0088cc]/20 to-[#0088cc]/10',
      borderColor: '#0088cc/50'
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md"
        style={{ 
          background: 'rgba(10,10,10,0.98)',
          border: '1px solid rgba(212,175,55,0.4)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.1)'
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-casino text-2xl text-gradient-gold text-center">
            WELCOME TO $Pc CASINO
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center text-[#C0C0C0] text-sm mb-6">
          Connect to start playing with $Pc
        </div>

        {/* Wallet Connect - Primary Option */}
        <button
          onClick={() => { onWalletConnect(); onClose(); }}
          className="w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-300 group relative overflow-hidden mb-4"
          style={{ 
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
            border: '2px solid rgba(212,175,55,0.6)',
            boxShadow: '0 0 30px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(212,175,55,0.5), rgba(212,175,55,0.2))',
              border: '1px solid rgba(212,175,55,0.6)',
              boxShadow: '0 0 20px rgba(212,175,55,0.3)'
            }}
          >
            <Wallet className="w-7 h-7 text-[#D4AF37]" />
          </div>
          
          <div className="flex-1 text-left">
            <div className="font-bold text-[#D4AF37] text-lg group-hover:text-[#FFD700] transition-colors">
              Connect Crypto Wallet
            </div>
            <div className="text-xs text-[#808080]">
              MetaMask, Phantom, Coinbase & more
            </div>
          </div>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#5D4037]/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-[#0a0a0a] text-xs text-[#808080]">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Social Login Options */}
        <div className="space-y-2">
          {socialProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSocialConnect(provider.id)}
              disabled={connecting !== null}
              className="w-full p-3 rounded-xl flex items-center gap-4 transition-all duration-300 group relative overflow-hidden disabled:opacity-50"
              style={{ 
                background: 'rgba(20,20,20,0.8)',
                border: `1px solid rgba(93,64,55,0.5)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              {/* Hover glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ 
                  background: `linear-gradient(90deg, ${provider.color}15, transparent)`,
                }}
              />
              
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center relative z-10"
                style={{ 
                  background: `linear-gradient(135deg, ${provider.color}40, ${provider.color}20)`,
                  border: `1px solid ${provider.color}60`,
                  boxShadow: `0 0 15px ${provider.color}30`,
                  color: provider.color
                }}
              >
                {provider.icon}
              </div>
              
              <div className="flex-1 text-left relative z-10">
                <div className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                  {provider.name}
                </div>
              </div>

              {connecting === provider.id && (
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#5D4037]/30 text-center">
          <p className="text-xs text-[#808080]">
            All login methods link to the same profile
          </p>
          <p className="text-xs text-[#606060] mt-1">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
