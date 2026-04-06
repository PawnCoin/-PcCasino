import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface JackpotTickerProps {
  onJackpotWin?: (amount: number) => void;
}

export function JackpotTicker({ onJackpotWin }: JackpotTickerProps) {
  const [amount, setAmount] = useState(0);
  const [prevAmount, setPrevAmount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [winFlash, setWinFlash] = useState(false);
  const [lastWon, setLastWon] = useState<string | null>(null);
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Fetch initial value
    fetch('/api/jackpot')
      .then(r => r.json())
      .then(d => {
        if (d.amount) { setAmount(d.amount); setPrevAmount(d.amount); }
      })
      .catch(() => {});

    const socket = getSocket();
    const onUpdate = ({ amount: a }: { amount: number }) => {
      setPrevAmount(prev => prev);
      setAmount(a);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    };
    const onWon = ({ username, amount: won, newJackpot }: any) => {
      setWinFlash(true);
      setLastWon(username);
      setTimeout(() => {
        setWinFlash(false);
        setAmount(newJackpot);
        if (onJackpotWin) onJackpotWin(won);
      }, 3000);
    };

    socket.on('jackpot:update', onUpdate);
    socket.on('jackpot:won', onWon);
    return () => {
      socket.off('jackpot:update', onUpdate);
      socket.off('jackpot:won', onWon);
    };
  }, [onJackpotWin]);

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(3)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return n.toLocaleString();
  };

  if (winFlash) {
    return (
      <div className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl animate-bounce"
        style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(255,215,0,0.2))', border: '2px solid #D4AF37', boxShadow: '0 0 40px rgba(212,175,55,0.8)' }}>
        <span className="text-2xl">🎰</span>
        <div className="text-center">
          <div className="text-xs font-bold text-yellow-300 tracking-widest">JACKPOT WON!</div>
          <div className="font-casino text-xl font-bold text-yellow-400">{lastWon} just hit it!</div>
        </div>
        <span className="text-2xl">🎊</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-default select-none"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
        border: '1px solid rgba(212,175,55,0.35)',
        boxShadow: pulse ? '0 0 20px rgba(212,175,55,0.4)' : '0 0 10px rgba(212,175,55,0.15)',
        transition: 'box-shadow 0.3s',
      }}>
      <Zap className={`w-4 h-4 text-yellow-400 flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} />
      <div className="flex flex-col items-start">
        <span className="text-[9px] font-bold text-yellow-600 tracking-widest leading-none">PROGRESSIVE JACKPOT</span>
        <span
          ref={displayRef}
          className={`font-casino font-bold text-base leading-tight transition-all duration-300 ${pulse ? 'scale-105' : ''}`}
          style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}
        >
          {formatAmount(amount)} $Pc
        </span>
      </div>
    </div>
  );
}
