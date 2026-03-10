import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArrowLeft, Info, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PokerChip } from '@/components/PokerChip';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useRouletteVoice } from '@/hooks/useGameVoice';
import RouletteWheel3D from '@/components/games/RouletteWheel3D';

interface RouletteGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
}

interface PlacedBet {
  type: string;
  numbers: number[];
  amount: number;
  payout: number;
}

const CHIP_VALUES = [1, 5, 10, 25, 100];

const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const SEGMENT_ANGLE = (Math.PI * 2) / 37;

const isRed = (num: number) => RED_NUMBERS.includes(num);

const rouletteRules = {
  objective: 'Predict where the ball will land on the spinning wheel.',
  insideBets: [
    { name: 'Straight Up', desc: 'Single number', payout: '35:1' },
    { name: 'Split', desc: 'Two adjacent numbers', payout: '17:1' },
    { name: 'Street', desc: 'Row of 3 numbers', payout: '11:1' },
    { name: 'Corner', desc: 'Square of 4 numbers', payout: '8:1' },
    { name: 'Line', desc: '6 numbers (2 rows)', payout: '5:1' },
  ],
  outsideBets: [
    { name: 'Red/Black', desc: 'Color bet', payout: '1:1' },
    { name: 'Even/Odd', desc: 'Parity bet', payout: '1:1' },
    { name: '1-18 / 19-36', desc: 'Half bet', payout: '1:1' },
    { name: 'Dozen', desc: '1st/2nd/3rd 12', payout: '2:1' },
    { name: 'Column', desc: '12 numbers in column', payout: '2:1' },
  ],
};

const GRID_NUMBERS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

function HistoryPanel({ history }: { history: number[] }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.98) 100%)',
        border: '1px solid rgba(212,175,55,0.4)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        minWidth: '65px',
        maxWidth: '70px',
      }}
    >
      <div
        className="px-2 py-1.5 text-center text-[8px] font-bold tracking-[0.2em] uppercase"
        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
      >
        History
      </div>
      <div className="p-1 space-y-0.5 max-h-[200px] overflow-y-auto">
        {history.length === 0 && (
          <div className="text-[9px] text-gray-600 text-center py-3">No spins yet</div>
        )}
        {history.map((num, i) => (
          <div
            key={i}
            className="w-full h-6 rounded flex items-center justify-center text-[11px] font-bold"
            style={{
              background: num === 0
                ? 'linear-gradient(135deg, #15803d, #0D5A12)'
                : isRed(num)
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                  : 'linear-gradient(135deg, #333, #111)',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              border: i === 0 ? '1px solid rgba(212,175,55,0.7)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: i === 0 ? '0 0 8px rgba(212,175,55,0.3)' : 'none',
            }}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
}

function BetChipIndicator({ amount }: { amount: number }) {
  const chipColor = amount >= 100 ? '#333' : amount >= 25 ? '#388e3c' : amount >= 10 ? '#1976d2' : amount >= 5 ? '#d32f2f' : '#e0e0e0';
  const textColor = amount >= 100 || amount >= 10 ? '#fff' : amount >= 5 ? '#fff' : '#333';
  return (
    <div
      className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"
      style={{ animation: 'rouletteChipDrop 0.3s ease-out forwards' }}
    >
      <div
        className="rounded-full flex items-center justify-center font-bold border-2"
        style={{
          width: '20px',
          height: '20px',
          background: `radial-gradient(circle at 35% 30%, ${chipColor}, ${chipColor}dd)`,
          borderColor: 'rgba(212,175,55,0.7)',
          color: textColor,
          fontSize: '7px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        {amount}
      </div>
    </div>
  );
}

export function RouletteGame({ balance, onBack, onBet, onWin }: RouletteGameProps) {
  const [selectedChip, setSelectedChip] = useState(10);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballRadius, setBallRadius] = useState(2.45);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('Place your bets!');
  const [useLaPartage, setUseLaPartage] = useState(true);
  const [history, setHistory] = useState<number[]>([]);
  const [winFlash, setWinFlash] = useState(false);
  const [loseFlash, setLoseFlash] = useState(false);
  const [lastWin, setLastWin] = useState(0);

  const animRef = useRef<number | null>(null);
  const pendingSpinRef = useRef(false);
  const ballClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { announceBetsOpen, announceNoMoreBets, announceResult, announceWin, announceLoss } = useRouletteVoice();

  const totalBet = placedBets.reduce((sum, bet) => sum + bet.amount, 0);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (mountedRef.current) fn();
    }, ms);
    pendingTimeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    announceBetsOpen();
    return () => {
      mountedRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (ballClickTimeoutRef.current) clearTimeout(ballClickTimeoutRef.current);
      pendingTimeoutsRef.current.forEach(id => clearTimeout(id));
    };
  }, []);

  const placeBet = useCallback((type: string, numbers: number[], payout: number) => {
    if (isSpinning) return;
    if (!onBet(selectedChip)) {
      setMessage('Insufficient balance!');
      playSound('error');
      return;
    }

    const existingIdx = placedBets.findIndex(b => b.type === type);
    if (existingIdx >= 0) {
      const newBets = [...placedBets];
      newBets[existingIdx] = { ...newBets[existingIdx], amount: newBets[existingIdx].amount + selectedChip };
      setPlacedBets(newBets);
    } else {
      setPlacedBets(prev => [...prev, { type, numbers, amount: selectedChip, payout }]);
    }
    playSound('chipPlace');
    setMessage(`Bet ${selectedChip} $Pc on ${type}`);
    setWinningNumber(null);
    setLastWin(0);
  }, [isSpinning, selectedChip, placedBets, onBet, playSound]);

  const clearBets = useCallback(() => {
    if (isSpinning) return;
    placedBets.forEach(bet => onWin(bet.amount));
    setPlacedBets([]);
    setMessage('Bets cleared');
    playSound('clear');
  }, [isSpinning, placedBets, onWin, playSound]);

  const repeatBet = useCallback(() => {
    if (isSpinning || lastBets.length === 0) return;
    const affordable: PlacedBet[] = [];
    let totalDeducted = 0;
    for (const bet of lastBets) {
      if (onBet(bet.amount)) {
        affordable.push({ ...bet });
        totalDeducted += bet.amount;
      }
    }
    if (affordable.length === 0) {
      setMessage('Insufficient balance!');
      playSound('error');
      return;
    }
    setPlacedBets(affordable);
    setWinningNumber(null);
    setLastWin(0);
    playSound('chipPlace');
    setMessage(`Repeated bet: ${totalDeducted} $Pc`);
  }, [isSpinning, lastBets, onBet, playSound]);

  const spin = useCallback(() => {
    if (isSpinning || placedBets.length === 0) return;

    setIsSpinning(true);
    setMessage('No more bets!');
    setWinningNumber(null);
    setLastWin(0);

    playSound('noMoreBets');
    announceNoMoreBets();

    safeTimeout(() => {
      playSound('wheelTick');
    }, 600);

    let clickDelay = 100;
    let clickCount = 0;
    const scheduleBallClick = () => {
      ballClickTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        playSound('ballClick');
        clickCount++;
        if (clickCount < 22) {
          clickDelay = Math.min(clickDelay + 20, 500);
          scheduleBallClick();
        }
      }, clickDelay);
    };
    scheduleBallClick();

    const winningIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    const winningNum = WHEEL_NUMBERS[winningIndex];

    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const wheelDelta = extraSpins * 360 + (winningIndex * (360 / 37));
    const ballDelta = -(extraSpins * 2 * Math.PI + winningIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);

    const duration = 6000;
    const startTime = Date.now();
    const startWheelRot = wheelRotation;
    const startBallAngle = ballAngle;
    const targetWheelRot = startWheelRot + wheelDelta;
    const targetBallAngle = startBallAngle + ballDelta;
    const startBallRadius = 2.45;
    const endBallRadius = 1.95;

    const animate = () => {
      if (!mountedRef.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);

      setWheelRotation(startWheelRot + (targetWheelRot - startWheelRot) * easeOut);
      setBallAngle(startBallAngle + (targetBallAngle - startBallAngle) * easeOut);
      setBallRadius(startBallRadius + (endBallRadius - startBallRadius) * easeOut);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        if (ballClickTimeoutRef.current) clearTimeout(ballClickTimeoutRef.current);
        playSound('ballLand');
        safeTimeout(() => finishSpin(winningNum), 500);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [isSpinning, placedBets, wheelRotation, ballAngle, playSound, announceNoMoreBets, safeTimeout]);

  const finishSpin = (number: number) => {
    setWinningNumber(number);
    setIsSpinning(false);
    setHistory(prev => [number, ...prev.slice(0, 19)]);

    announceResult(number, isRed(number));

    let totalWinAmount = 0;
    let laPartageRefund = 0;
    const isZero = number === 0;

    placedBets.forEach(bet => {
      let won = false;
      let winAmount = 0;

      if (bet.type === number.toString()) {
        won = true; winAmount = bet.amount * (bet.payout + 1);
      } else if (bet.type === 'red' && isRed(number)) {
        won = true; winAmount = bet.amount * 2;
      } else if (bet.type === 'black' && !isRed(number) && number !== 0) {
        won = true; winAmount = bet.amount * 2;
      } else if (bet.type === 'even' && number !== 0 && number % 2 === 0) {
        won = true; winAmount = bet.amount * 2;
      } else if (bet.type === 'odd' && number !== 0 && number % 2 === 1) {
        won = true; winAmount = bet.amount * 2;
      } else if (bet.type === 'low' && number >= 1 && number <= 18) {
        won = true; winAmount = bet.amount * 2;
      } else if (bet.type === 'high' && number >= 19 && number <= 36) {
        won = true; winAmount = bet.amount * 2;
      } else if (bet.type === '1st12' && number >= 1 && number <= 12) {
        won = true; winAmount = bet.amount * 3;
      } else if (bet.type === '2nd12' && number >= 13 && number <= 24) {
        won = true; winAmount = bet.amount * 3;
      } else if (bet.type === '3rd12' && number >= 25 && number <= 36) {
        won = true; winAmount = bet.amount * 3;
      } else if (bet.type === 'col1' && number % 3 === 1 && number !== 0) {
        won = true; winAmount = bet.amount * 3;
      } else if (bet.type === 'col2' && number % 3 === 2) {
        won = true; winAmount = bet.amount * 3;
      } else if (bet.type === 'col3' && number % 3 === 0 && number !== 0) {
        won = true; winAmount = bet.amount * 3;
      }

      if (won) totalWinAmount += winAmount;
      else if (isZero && bet.payout === 1 && useLaPartage) {
        laPartageRefund += bet.amount / 2;
      }
    });

    if (laPartageRefund > 0) totalWinAmount += laPartageRefund;

    setLastBets([...placedBets]);

    if (totalWinAmount > 0) {
      onWin(totalWinAmount);
      setLastWin(totalWinAmount);
      setMessage(laPartageRefund > 0
        ? `Zero! La Partage: ${laPartageRefund} $Pc returned!`
        : `Number ${number}! You won ${totalWinAmount} $Pc!`
      );
      playSound('win');
      safeTimeout(() => announceWin(totalWinAmount), 1200);
      setWinFlash(true);
      safeTimeout(() => setWinFlash(false), 1500);
    } else {
      setMessage(`Number ${number}. Better luck next time!`);
      playSound('lose');
      safeTimeout(() => announceLoss(), 1200);
      setLoseFlash(true);
      safeTimeout(() => setLoseFlash(false), 1200);
    }

    setPlacedBets([]);

    safeTimeout(() => {
      announceBetsOpen();
    }, 3000);
  };

  useEffect(() => {
    if (pendingSpinRef.current && placedBets.length > 0 && !isSpinning) {
      pendingSpinRef.current = false;
      spin();
    }
  }, [placedBets, isSpinning, spin]);

  const repeatAndSpin = useCallback(() => {
    if (isSpinning || lastBets.length === 0) return;
    const affordable: PlacedBet[] = [];
    for (const bet of lastBets) {
      if (onBet(bet.amount)) affordable.push({ ...bet });
    }
    if (affordable.length === 0) {
      setMessage('Insufficient balance!');
      playSound('error');
      return;
    }
    pendingSpinRef.current = true;
    setPlacedBets(affordable);
    setWinningNumber(null);
    setLastWin(0);
  }, [isSpinning, lastBets, onBet, playSound]);

  const getBetAmount = (type: string) => {
    const bet = placedBets.find(b => b.type === type);
    return bet?.amount || 0;
  };

  return (
    <div
      className="h-screen flex flex-col"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0a0a0a 50%, #000 100%)`,
      }}
    >
      <style>{`
        @keyframes rouletteChipDrop {
          0% { transform: translateX(-50%) translateY(-12px) scale(0.4); opacity: 0; }
          60% { transform: translateX(-50%) translateY(2px) scale(1.05); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
        @keyframes rouletteFlash {
          0% { opacity: 0; }
          20% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes rouletteLoseShake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-3px); }
          20% { transform: translateX(3px); }
          30% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          50% { transform: translateX(0); }
        }
        @keyframes rouletteWinGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,0.4); }
          50% { box-shadow: 0 0 16px rgba(212,175,55,0.8), 0 0 30px rgba(212,175,55,0.3); }
        }
        @keyframes rouletteNeonPulse {
          0% { filter: brightness(0.9); }
          100% { filter: brightness(1.3); }
        }
        .roulette-cell:hover {
          filter: brightness(1.35) !important;
          box-shadow: 0 0 10px rgba(212,175,55,0.5) !important;
          z-index: 5;
        }
      `}</style>

      {winFlash && (
        <div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, transparent 70%)', animation: 'rouletteFlash 1.5s ease-out forwards' }} />
      )}
      {loseFlash && (
        <div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.2) 0%, transparent 70%)', animation: 'rouletteFlash 1.2s ease-out forwards' }} />
      )}

      {/* Header */}
      <nav className="flex-shrink-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-casino font-bold text-[#D4AF37] text-sm">ROULETTE</span>
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Return to lobby</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <img src="/logos/pc-logo.png" alt="$Pc" className="w-4 h-4" />
              <span className="font-bold text-[#D4AF37] text-sm">{balance.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500">$Pc</span>
            </div>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(true)}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Settings</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRules(true)}>
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Rules</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top: 3D Wheel + Credit + History */}
        <div className="relative flex-shrink-0" style={{ height: '42%', minHeight: '280px' }}>
          {/* Credit counter */}
          <div
            className="absolute top-3 left-3 z-20"
            style={{
              background: 'linear-gradient(145deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.98) 100%)',
              border: '1.5px solid rgba(212,175,55,0.5)',
              borderRadius: '8px',
              padding: '8px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <div className="text-[8px] text-[#D4AF37] font-bold tracking-[0.2em] uppercase">Credit</div>
            <div className="text-xl font-bold text-white" style={{ textShadow: '0 0 8px rgba(212,175,55,0.2)' }}>
              {balance.toLocaleString()}
            </div>
            <div className="text-[9px] text-gray-500">$Pc</div>
          </div>

          {/* 3D Wheel Canvas */}
          <div className="w-full h-full">
            <Canvas
              shadows
              camera={{ position: [0, 3.5, 5.5], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'transparent' }}
            >
              <Suspense fallback={null}>
                <RouletteWheel3D
                  rotation={wheelRotation}
                  ballAngle={ballAngle}
                  ballRadius={ballRadius}
                  isSpinning={isSpinning}
                  winningNumber={winningNumber}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* History panel */}
          <div className="absolute top-3 right-3 z-20">
            <HistoryPanel history={history} />
          </div>

          {/* Winning number overlay */}
          {winningNumber !== null && !isSpinning && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
              <div
                className="px-5 py-2 rounded-xl flex items-center gap-3"
                style={{
                  background: 'linear-gradient(145deg, rgba(0,0,0,0.95), rgba(15,15,25,0.98))',
                  border: `2px solid ${isRed(winningNumber) ? 'rgba(220,38,38,0.7)' : winningNumber === 0 ? 'rgba(21,128,61,0.7)' : 'rgba(180,180,180,0.5)'}`,
                  boxShadow: `0 0 20px ${isRed(winningNumber) ? 'rgba(220,38,38,0.3)' : winningNumber === 0 ? 'rgba(21,128,61,0.3)' : 'rgba(150,150,150,0.2)'}`,
                }}
              >
                <div
                  className={`text-3xl font-bold ${isRed(winningNumber) ? 'text-[#dc2626]' : winningNumber === 0 ? 'text-[#15803d]' : 'text-gray-200'}`}
                  style={{ textShadow: '0 0 12px currentColor', animation: 'rouletteNeonPulse 1.5s ease-in-out infinite alternate' }}
                >
                  {winningNumber}
                </div>
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: isRed(winningNumber) ? '#dc2626' : winningNumber === 0 ? '#15803d' : '#aaa' }}>
                  {winningNumber === 0 ? 'GREEN' : isRed(winningNumber) ? 'RED' : 'BLACK'}
                </div>
                {lastWin > 0 && (
                  <div className="text-sm font-bold text-[#43A047]">+{lastWin} $Pc</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="flex-shrink-0 text-center py-1">
          <span
            className="inline-block px-4 py-1 rounded-full text-xs font-bold"
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: lastWin > 0 ? '#43A047' : '#D4AF37',
              border: `1px solid ${lastWin > 0 ? 'rgba(67,160,71,0.3)' : 'rgba(212,175,55,0.2)'}`,
              textShadow: `0 0 6px ${lastWin > 0 ? 'rgba(67,160,71,0.3)' : 'rgba(212,175,55,0.2)'}`,
            }}
          >
            {message}
          </span>
        </div>

        {/* Betting table */}
        <div
          className={`flex-1 overflow-auto px-3 pb-1 min-h-0 ${loseFlash ? '' : ''}`}
          style={{ animation: loseFlash ? 'rouletteLoseShake 0.6s ease-out' : undefined }}
        >
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-xl p-2.5 relative"
              style={{
                background: `
                  repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.006) 1px, transparent 2px, transparent 3px),
                  repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.004) 1px, transparent 2px, transparent 3px),
                  linear-gradient(145deg, #1B5E20 0%, #0D3312 50%, #051a08 100%)
                `,
                boxShadow: `
                  0 10px 40px rgba(0,0,0,0.6),
                  inset 0 1px 2px rgba(255,255,255,0.03),
                  0 0 0 5px #5D4037,
                  0 0 0 7px #3E2723,
                  0 0 0 8px rgba(212,175,55,0.3)
                `,
              }}
            >
              {/* Number grid */}
              <div className="flex gap-[2px]">
                {/* Zero */}
                <button
                  onClick={() => placeBet('0', [0], 35)}
                  className="roulette-cell relative flex items-center justify-center font-bold text-lg transition-all flex-shrink-0"
                  style={{
                    width: '36px',
                    borderRadius: '5px',
                    background: 'linear-gradient(145deg, #15803d, #0D5A12)',
                    border: winningNumber === 0 ? '2px solid #D4AF37' : '1.5px solid rgba(212,175,55,0.35)',
                    boxShadow: winningNumber === 0 ? '0 0 12px rgba(212,175,55,0.5)' : '0 2px 6px rgba(0,0,0,0.3)',
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    animation: winningNumber === 0 ? 'rouletteWinGlow 1.5s ease-in-out infinite' : undefined,
                  }}
                >
                  0
                  {getBetAmount('0') > 0 && <BetChipIndicator amount={getBetAmount('0')} />}
                </button>

                {/* Number grid */}
                <div className="grid grid-cols-12 flex-1 gap-[2px]">
                  {GRID_NUMBERS.flat().map((num) => {
                    const numRed = isRed(num);
                    const betAmt = getBetAmount(num.toString());
                    const isWinner = winningNumber === num;

                    return (
                      <button
                        key={num}
                        onClick={() => placeBet(num.toString(), [num], 35)}
                        className="roulette-cell relative h-8 rounded flex items-center justify-center font-bold text-xs transition-all"
                        style={{
                          background: numRed
                            ? 'linear-gradient(145deg, #dc2626, #991b1b)'
                            : 'linear-gradient(145deg, #222, #0a0a0a)',
                          border: isWinner ? '2px solid #D4AF37' : '1px solid rgba(212,175,55,0.25)',
                          boxShadow: isWinner ? '0 0 12px rgba(212,175,55,0.5)' : '0 1px 3px rgba(0,0,0,0.3)',
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          animation: isWinner ? 'rouletteWinGlow 1.5s ease-in-out infinite' : undefined,
                        }}
                      >
                        {num}
                        {betAmt > 0 && <BetChipIndicator amount={betAmt} />}
                      </button>
                    );
                  })}
                </div>

                {/* 2:1 columns */}
                <div className="flex flex-col gap-[2px] flex-shrink-0">
                  {[
                    { type: 'col3', nums: [3,6,9,12,15,18,21,24,27,30,33,36] },
                    { type: 'col2', nums: [2,5,8,11,14,17,20,23,26,29,32,35] },
                    { type: 'col1', nums: [1,4,7,10,13,16,19,22,25,28,31,34] },
                  ].map(({ type, nums }) => (
                    <button
                      key={type}
                      onClick={() => placeBet(type, nums, 2)}
                      className="roulette-cell relative w-10 flex-1 rounded flex items-center justify-center font-bold text-[9px] transition-all hover:brightness-125"
                      style={{
                        background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        color: '#D4AF37',
                      }}
                    >
                      2:1
                      {getBetAmount(type) > 0 && <BetChipIndicator amount={getBetAmount(type)} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dozens */}
              <div className="flex gap-[2px] mt-[2px]" style={{ marginLeft: '38px', marginRight: '42px' }}>
                {[
                  { type: '1st12', label: '1st 12', nums: Array.from({ length: 12 }, (_, i) => i + 1) },
                  { type: '2nd12', label: '2nd 12', nums: Array.from({ length: 12 }, (_, i) => i + 13) },
                  { type: '3rd12', label: '3rd 12', nums: Array.from({ length: 12 }, (_, i) => i + 25) },
                ].map(({ type, label, nums }) => (
                  <button
                    key={type}
                    onClick={() => placeBet(type, nums, 2)}
                    className="roulette-cell relative flex-1 h-8 rounded flex items-center justify-center font-bold text-xs transition-all hover:brightness-125"
                    style={{
                      background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#D4AF37',
                    }}
                  >
                    {label}
                    {getBetAmount(type) > 0 && <BetChipIndicator amount={getBetAmount(type)} />}
                  </button>
                ))}
              </div>

              {/* Outside bets */}
              <div className="flex gap-[2px] mt-[2px]" style={{ marginLeft: '38px', marginRight: '42px' }}>
                {[
                  { type: 'low', label: '1-18', nums: Array.from({ length: 18 }, (_, i) => i + 1), bg: '' },
                  { type: 'even', label: 'EVEN', nums: Array.from({ length: 18 }, (_, i) => (i + 1) * 2), bg: '' },
                  { type: 'red', label: '◆', nums: RED_NUMBERS, bg: 'linear-gradient(145deg, #dc2626, #991b1b)', color: '#fff' },
                  { type: 'black', label: '◆', nums: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35], bg: 'linear-gradient(145deg, #222, #000)', color: '#fff' },
                  { type: 'odd', label: 'ODD', nums: Array.from({ length: 18 }, (_, i) => i * 2 + 1), bg: '' },
                  { type: 'high', label: '19-36', nums: Array.from({ length: 18 }, (_, i) => i + 19), bg: '' },
                ].map(({ type, label, nums, bg, color }) => (
                  <button
                    key={type}
                    onClick={() => placeBet(type, nums, 1)}
                    className="roulette-cell relative flex-1 h-8 rounded flex items-center justify-center font-bold text-[10px] transition-all hover:brightness-125"
                    style={{
                      background: bg || 'linear-gradient(145deg, #5D4037, #3E2723)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: color || '#D4AF37',
                    }}
                  >
                    {label}
                    {getBetAmount(type) > 0 && <BetChipIndicator amount={getBetAmount(type)} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(15,15,15,0.98) 0%, rgba(5,5,5,1) 100%)',
          borderTop: '2px solid rgba(212,175,55,0.3)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <div className="max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Chips */}
            <div className="flex gap-1.5">
              {CHIP_VALUES.map(value => (
                <PokerChip
                  key={value}
                  amount={value}
                  size="sm"
                  selected={selectedChip === value}
                  onClick={() => setSelectedChip(value)}
                />
              ))}
            </div>

            {/* Total */}
            <div className="text-center flex-shrink-0 px-2">
              <div className="text-[8px] text-gray-500 uppercase tracking-wider">Bet</div>
              <div className="text-base font-bold text-[#D4AF37]">{totalBet} $Pc</div>
            </div>

            {/* Buttons */}
            <div className="flex gap-1.5">
              <Button
                onClick={() => spin()}
                disabled={isSpinning || placedBets.length === 0}
                className="px-4 py-2.5 rounded-lg font-bold text-xs"
                style={{
                  background: isSpinning || placedBets.length === 0 ? '#333' : 'linear-gradient(145deg, #43A047, #2E7D32)',
                  boxShadow: isSpinning || placedBets.length === 0 ? 'none' : '0 3px 10px rgba(67,160,71,0.4)',
                  color: isSpinning || placedBets.length === 0 ? '#666' : '#fff',
                }}
              >
                {isSpinning ? 'SPINNING...' : 'SPIN'}
              </Button>

              <Button
                onClick={repeatAndSpin}
                disabled={isSpinning || lastBets.length === 0}
                className="px-3 py-2.5 rounded-lg font-bold text-[10px]"
                style={{
                  background: isSpinning || lastBets.length === 0 ? '#333' : 'linear-gradient(145deg, #1E88E5, #1565C0)',
                  boxShadow: isSpinning || lastBets.length === 0 ? 'none' : '0 3px 8px rgba(30,136,229,0.3)',
                  color: isSpinning || lastBets.length === 0 ? '#666' : '#fff',
                }}
              >
                REPEAT & SPIN
              </Button>

              <Button
                onClick={repeatBet}
                disabled={isSpinning || lastBets.length === 0}
                className="px-3 py-2.5 rounded-lg font-bold text-[10px]"
                style={{
                  background: isSpinning || lastBets.length === 0 ? '#333' : 'linear-gradient(145deg, #D4AF37, #B8860B)',
                  boxShadow: isSpinning || lastBets.length === 0 ? 'none' : '0 3px 8px rgba(212,175,55,0.3)',
                  color: isSpinning || lastBets.length === 0 ? '#666' : '#000',
                }}
              >
                REPEAT
              </Button>

              <Button
                onClick={clearBets}
                disabled={isSpinning || placedBets.length === 0}
                className="px-3 py-2.5 rounded-lg font-bold text-[10px]"
                style={{
                  background: isSpinning || placedBets.length === 0 ? '#333' : 'linear-gradient(145deg, #B71C1C, #8B0000)',
                  boxShadow: isSpinning || placedBets.length === 0 ? 'none' : '0 3px 8px rgba(183,28,28,0.3)',
                  color: isSpinning || placedBets.length === 0 ? '#666' : '#fff',
                }}
              >
                CLEAR
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-panel-strong">
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold">Roulette Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Objective</h3>
              <p className="text-[#C0C0C0]">{rouletteRules.objective}</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">European Roulette</h3>
              <p className="text-[#C0C0C0]">37 pockets (0-36), single zero. La Partage returns half of even-money bets when zero hits.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Inside Bets</h3>
              <ul className="space-y-1 text-[#C0C0C0]">
                {rouletteRules.insideBets.map((bet, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    <span><strong className="text-white">{bet.name}:</strong> {bet.desc} ({bet.payout})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Outside Bets</h3>
              <ul className="space-y-1 text-[#C0C0C0]">
                {rouletteRules.outsideBets.map((bet, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    <span><strong className="text-white">{bet.name}:</strong> {bet.desc} ({bet.payout})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm glass-panel-strong">
          <DialogHeader>
            <DialogTitle className="font-casino text-xl text-gradient-gold">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#5D4037]/20">
              <div>
                <div className="font-bold text-white">La Partage</div>
                <div className="text-xs text-[#808080]">Half back on zero (even-money bets)</div>
              </div>
              <Switch checked={useLaPartage} onCheckedChange={setUseLaPartage} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
