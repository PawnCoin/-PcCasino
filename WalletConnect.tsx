import { useState } from 'react';
import { Wallet, ChevronDown, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WalletConnectProps {
  isConnected: boolean;
  walletAddress: string | null;
  balance: number;
  onConnect: (walletType: string, address: string) => void;
  onDisconnect: () => void;
}

const WALLETS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#E2761B' },
  { id: 'phantom', name: 'Phantom', icon: '👻', color: '#AB9FF2' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', color: '#0052FF' },
  { id: 'trust', name: 'Trust Wallet', icon: '🔐', color: '#3375BB' },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', color: '#3B99FC' },
];

export function WalletConnect({ 
  isConnected, 
  walletAddress, 
  balance, 
  onConnect, 
  onDisconnect 
}: WalletConnectProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (walletId: string) => {
    setConnecting(walletId);
    
    // Simulate wallet connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock wallet address
    const mockAddress = '0x' + Array(40).fill(0).map(() => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
    
    onConnect(walletId, mockAddress);
    setConnecting(null);
    setShowWalletModal(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && walletAddress) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1B5E20]/50 to-[#2E7D32]/50 border border-[#43A047]/50 hover:border-[#43A047] transition-all"
          style={{ boxShadow: '0 0 20px rgba(67,160,71,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' }}
        >
          <div className="w-6 h-6 rounded-full bg-[#43A047] flex items-center justify-center">
            <Wallet className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-white">{formatAddress(walletAddress)}</span>
          <ChevronDown className={`w-4 h-4 text-[#C0C0C0] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div 
            className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50"
            style={{ 
              background: 'rgba(10,10,10,0.95)',
              border: '1px solid rgba(212,175,55,0.3)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <div className="p-4 border-b border-[#5D4037]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
                  <User className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Connected</div>
                  <div className="text-xs text-[#C0C0C0]">{formatAddress(walletAddress)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1B5E20]/30">
                <span className="text-xs text-[#C0C0C0]">Balance</span>
                <span className="text-sm font-bold text-[#D4AF37]">{balance.toLocaleString()} $Pc</span>
              </div>
            </div>
            <button
              onClick={() => {
                onDisconnect();
                setShowDropdown(false);
              }}
              className="w-full p-3 flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Disconnect</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowWalletModal(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        CONNECT WALLET
      </Button>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
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
              CONNECT WALLET
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center text-[#C0C0C0] text-sm mb-6">
            Connect your crypto wallet to play with $Pc
          </div>

          <div className="space-y-3">
            {WALLETS.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={connecting !== null}
                className="w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                style={{ 
                  background: 'rgba(20,20,20,0.8)',
                  border: '1px solid rgba(93,64,55,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                }}
              >
                {/* Hover glow */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ 
                    background: `linear-gradient(90deg, ${wallet.color}20, transparent)`,
                  }}
                />
                
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative z-10"
                  style={{ 
                    background: `linear-gradient(135deg, ${wallet.color}40, ${wallet.color}20)`,
                    border: `1px solid ${wallet.color}60`,
                    boxShadow: `0 0 20px ${wallet.color}30`
                  }}
                >
                  {wallet.icon}
                </div>
                
                <div className="flex-1 text-left relative z-10">
                  <div className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                    {wallet.name}
                  </div>
                  <div className="text-xs text-[#808080]">
                    {connecting === wallet.id ? 'Connecting...' : 'Click to connect'}
                  </div>
                </div>

                {connecting === wallet.id && (
                  <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#5D4037]/30 text-center">
            <p className="text-xs text-[#808080]">
              By connecting, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
