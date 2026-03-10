import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PokerChip } from '@/components/PokerChip';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';

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

function VegasRouletteWheel({
  rotation,
  ballRotation,
  isSpinning,
  winningNumber,
}: {
  rotation: number;
  ballRotation: number;
  isSpinning: boolean;
  winningNumber: number | null;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-80 h-24 rounded-full"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.8), rgba(0,0,0,0.3) 40%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      <div
        className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px]"
        style={{
          transform: 'rotateX(30deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute -inset-3 rounded-full"
          style={{
            background: `linear-gradient(145deg, #2E1A12 0%, #5D4037 30%, #8D6E63 50%, #5D4037 70%, #2E1A12 100%)`,
            boxShadow: `0 30px 80px rgba(0,0,0,0.9), 0 0 0 4px #1a0f0a, inset 0 0 50px rgba(0,0,0,0.6), inset 0 0 80px rgba(212,175,55,0.08)`,
            transform: 'translateZ(-20px)',
          }}
        />

        <div
          className="absolute -inset-1 rounded-full"
          style={{
            background: `repeating-conic-gradient(from 0deg, #D4AF37 0deg 3deg, #B8860B 3deg 6deg)`,
            boxShadow: `0 0 25px rgba(212,175,55,0.4), inset 0 0 15px rgba(0,0,0,0.5)`,
            transform: 'translateZ(-10px)',
          }}
        />

        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: `linear-gradient(145deg, #4E342E 0%, #3E2723 30%, #2a1a12 50%, #3E2723 70%, #4E342E 100%)`,
            boxShadow: `inset 0 0 30px rgba(0,0,0,0.7)`,
            transform: 'translateZ(-5px)',
          }}
        />

        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, #D4AF37 0deg, #F4D03F 45deg, #D4AF37 90deg, #B8860B 135deg, #D4AF37 180deg, #F4D03F 225deg, #D4AF37 270deg, #B8860B 315deg, #D4AF37 360deg)`,
            boxShadow: `inset 0 0 10px rgba(0,0,0,0.4), 0 0 10px rgba(212,175,55,0.3)`,
          }}
        />

        <div
          className="absolute inset-6 rounded-full overflow-hidden"
          style={{
            background: '#0a0a0a',
            boxShadow: `inset 0 0 30px rgba(0,0,0,0.8), 0 0 0 2px #D4AF37, 0 0 15px rgba(212,175,55,0.2)`,
            transform: 'translateZ(5px)',
          }}
        >
          <div
            ref={wheelRef}
            className="absolute inset-0"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.5s ease-out',
            }}
          >
            {WHEEL_NUMBERS.map((num, i) => {
              const angle = i * (360 / 37);
              const isNumRed = isRed(num);
              const isZero = num === 0;
              const isWinner = winningNumber === num && !isSpinning;

              return (
                <div
                  key={num}
                  className="absolute top-0 left-1/2 w-9 h-1/2 origin-bottom"
                  style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
                >
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-11 rounded-b-lg"
                    style={{
                      background: isZero
                        ? 'linear-gradient(180deg, #166534 0%, #14532d 50%, #0D5A12 100%)'
                        : isNumRed
                          ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)'
                          : 'linear-gradient(180deg, #374151 0%, #1f2937 50%, #111 100%)',
                      boxShadow: isWinner
                        ? `inset 0 2px 4px rgba(255,255,255,0.3), 0 0 12px rgba(212,175,55,0.8), 0 0 0 1px #D4AF37`
                        : `inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(212,175,55,0.3)`,
                    }}
                  >
                    <span
                      className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {num}
                    </span>
                  </div>
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3"
                    style={{ background: 'linear-gradient(to bottom, #D4AF37, #B8860B, transparent)' }}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 rounded-full z-20"
            style={{
              background: `radial-gradient(ellipse at 35% 35%, #F4D03F 0%, #D4AF37 20%, #B8860B 40%, #8B6914 60%, #5D4037 80%, #3E2723 100%)`,
              boxShadow: `0 10px 40px rgba(0,0,0,0.8), inset 0 2px 8px rgba(255,255,255,0.4), inset 0 -4px 12px rgba(0,0,0,0.4), 0 0 0 4px #3E2723, 0 0 0 6px #D4AF37, 0 0 20px rgba(212,175,55,0.3)`,
              transform: 'translateZ(15px)',
            }}
          >
            <div
              className="absolute inset-2 rounded-full"
              style={{
                background: `repeating-conic-gradient(from 0deg, rgba(255,255,255,0.08) 0deg 10deg, transparent 10deg 20deg)`,
              }}
            />
            <div
              className="absolute inset-5 rounded-full"
              style={{
                background: 'linear-gradient(145deg, #D4AF37, #B8860B)',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
              }}
            />
            <img
              src="/logos/pc-logo.png"
              alt="$Pc"
              className="w-10 h-10 sm:w-12 sm:h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-xl"
              style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))' }}
            />
          </div>
        </div>

        <div
          className="absolute inset-4 rounded-full pointer-events-none"
          style={{
            boxShadow: `inset 0 0 25px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(212,175,55,0.2)`,
            transform: 'translateZ(8px)',
          }}
        />

        <div
          className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full z-30"
          style={{
            background: `radial-gradient(circle at 30% 30%, #ffffff 0%, #f0f0f0 20%, #d0d0d0 40%, #909090 70%, #505050 100%)`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(0,0,0,0.3), inset 1px 1px 3px rgba(255,255,255,0.8)`,
            top: '8%',
            left: '50%',
            transform: `translateX(-50%) rotate(${ballRotation}deg)`,
            transformOrigin: '0 140px',
            transition: isSpinning ? 'none' : 'transform 0.5s ease-out',
          }}
        />

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full z-40"
          style={{
            background: `radial-gradient(circle at 35% 35%, #F4D03F 0%, #D4AF37 40%, #B8860B 70%, #8B6914 100%)`,
            boxShadow: `0 6px 20px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)`,
            transform: 'translateZ(25px)',
          }}
        />

        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-4"
            style={{
              top: '2%',
              left: '50%',
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
              transformOrigin: '0 145px',
            }}
          >
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(145deg, #F4D03F, #D4AF37, #B8860B)',
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              }}
            />
          </div>
        ))}

        <div
          className="absolute inset-14 rounded-full pointer-events-none"
          style={{
            border: '1.5px solid rgba(212,175,55,0.2)',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.4)',
          }}
        />
      </div>

      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 z-50"
        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.8))' }}
      >
        <div
          className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: '#D4AF37' }}
        />
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '-12px',
          background: `conic-gradient(from 0deg, rgba(255,255,255,0.0) 0deg, rgba(255,255,255,0.3) 25deg, rgba(220,235,255,0.45) 55deg, rgba(255,255,255,0.1) 85deg, rgba(255,255,255,0.0) 120deg, rgba(220,235,255,0.2) 170deg, rgba(255,255,255,0.35) 230deg, rgba(220,235,255,0.08) 290deg, rgba(255,255,255,0.0) 360deg)`,
          mask: 'radial-gradient(circle, transparent 66%, black 68%, black 77%, transparent 79%)',
          WebkitMask: 'radial-gradient(circle, transparent 66%, black 68%, black 77%, transparent 79%)',
          transform: 'rotateX(30deg) translateZ(2px)',
          mixBlendMode: 'screen' as const,
        }}
      />

      {isSpinning && (
        <>
          <div
            className="absolute w-7 h-7 rounded-full z-30 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(212,175,55,0.2) 40%, transparent 70%)',
              top: '8%',
              left: '50%',
              transform: `translateX(-50%) rotate(${ballRotation}deg)`,
              transformOrigin: '0 140px',
              filter: 'blur(5px)',
            }}
          />
          <div
            className="absolute w-10 h-10 rounded-full z-29 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 60%)',
              top: '7%',
              left: '49%',
              transform: `translateX(-50%) rotate(${ballRotation + 10}deg)`,
              transformOrigin: '0 145px',
              filter: 'blur(10px)',
            }}
          />
        </>
      )}
    </div>
  );
}

function HistoryPanel({ history }: { history: number[] }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.98) 100%)',
        border: '1px solid rgba(212,175,55,0.4)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        minWidth: '70px',
      }}
    >
      <div
        className="px-3 py-1.5 text-center text-[9px] font-bold tracking-[0.2em] uppercase"
        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
      >
        Last
      </div>
      <div className="p-1.5 space-y-1 max-h-[260px] overflow-y-auto">
        {history.length === 0 && (
          <div className="text-[10px] text-gray-600 text-center py-2">No spins</div>
        )}
        {history.map((num, i) => (
          <div
            key={i}
            className="w-full h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{
              background: num === 0
                ? 'linear-gradient(135deg, #15803d, #0D5A12)'
                : isRed(num)
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                  : 'linear-gradient(135deg, #333, #111)',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              border: i === 0 ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.1)',
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

export function RouletteGame({ balance, onBack, onBet, onWin }: RouletteGameProps) {
  const [selectedChip, setSelectedChip] = useState(10);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
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
  const { isMuted, toggleMute, playSound } = useSoundEffects();

  const totalBet = placedBets.reduce((sum, bet) => sum + bet.amount, 0);

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
    playSound('chip');
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
    const totalNeeded = lastBets.reduce((sum, b) => sum + b.amount, 0);
    let totalDeducted = 0;
    const affordable: PlacedBet[] = [];

    for (const bet of lastBets) {
      if (onBet(bet.amount)) {
        affordable.push({ ...bet });
        totalDeducted += bet.amount;
      }
    }

    if (affordable.length === 0) {
      setMessage('Insufficient balance for repeat!');
      playSound('error');
      return;
    }

    setPlacedBets(affordable);
    setWinningNumber(null);
    setLastWin(0);
    playSound('chip');
    setMessage(`Repeated bet: ${totalDeducted} $Pc`);
  }, [isSpinning, lastBets, onBet, playSound]);

  const spin = useCallback(async () => {
    if (isSpinning || placedBets.length === 0) return;

    setIsSpinning(true);
    setMessage('No more bets!');
    setWinningNumber(null);
    setLastWin(0);
    playSound('spin');

    const winningIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    const winningNum = WHEEL_NUMBERS[winningIndex];

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetRotation = extraSpins * 360 + (winningIndex * (360 / 37));
    const ballTargetRotation = -(extraSpins * 360 + (winningIndex * (360 / 37)) + 180);

    const duration = 6000;
    const startTime = Date.now();
    const startRotation = wheelRotation;
    const startBallRotation = ballRotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);

      setWheelRotation(startRotation + (targetRotation - startRotation) * easeOut);
      setBallRotation(startBallRotation + (ballTargetRotation - startBallRotation) * easeOut);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        finishSpin(winningNum);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [isSpinning, placedBets, wheelRotation, ballRotation, playSound]);

  const finishSpin = (number: number) => {
    setWinningNumber(number);
    setIsSpinning(false);
    setHistory(prev => [number, ...prev.slice(0, 19)]);

    let totalWin = 0;
    let laPartageRefund = 0;
    const isZero = number === 0;

    placedBets.forEach(bet => {
      let won = false;
      let winAmount = 0;

      if (bet.type === number.toString()) {
        won = true;
        winAmount = bet.amount * (bet.payout + 1);
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

      if (won) totalWin += winAmount;
      else if (isZero && bet.payout === 1 && useLaPartage) {
        laPartageRefund += bet.amount / 2;
      }
    });

    if (laPartageRefund > 0) totalWin += laPartageRefund;

    setLastBets([...placedBets]);

    if (totalWin > 0) {
      onWin(totalWin);
      setLastWin(totalWin);
      setMessage(laPartageRefund > 0
        ? `Zero! La Partage: ${laPartageRefund} $Pc returned!`
        : `Number ${number}! You won ${totalWin} $Pc!`
      );
      playSound('win');
      setWinFlash(true);
      setTimeout(() => setWinFlash(false), 1500);
    } else {
      setMessage(`Number ${number}. Better luck next time!`);
      playSound('error');
      setLoseFlash(true);
      setTimeout(() => setLoseFlash(false), 1200);
    }

    setPlacedBets([]);
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
    <CasinoEnvironment gameType="roulette">
      <div
        className="min-h-screen"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a0a 50%, #000000 100%)`,
        }}
      >
        <style>{`
          @keyframes rouletteNeonPulse {
            0% { opacity: 0.85; filter: brightness(0.9); }
            100% { opacity: 1; filter: brightness(1.2); }
          }
          @keyframes rouletteChipDrop {
            0% { transform: translateY(-15px) scale(0.5); opacity: 0; }
            60% { transform: translateY(2px) scale(1.05); opacity: 1; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes rouletteExpandRing {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
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
            0%, 100% { box-shadow: 0 0 8px currentColor; }
            50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
          }
          .roulette-cell:hover {
            filter: brightness(1.4) !important;
            box-shadow: 0 0 12px rgba(212,175,55,0.5), inset 0 1px 1px rgba(255,255,255,0.2) !important;
            z-index: 5;
          }
          .roulette-chip-indicator {
            animation: rouletteChipDrop 0.3s ease-out forwards;
          }
        `}</style>

        {winFlash && (
          <div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, transparent 70%)', animation: 'rouletteFlash 1.5s ease-out forwards' }} />
        )}
        {loseFlash && (
          <div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.2) 0%, transparent 70%)', animation: 'rouletteFlash 1.2s ease-out forwards' }} />
        )}

        {/* Header */}
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-casino font-bold text-[#D4AF37]">ROULETTE</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Return to lobby</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-3">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                      <Settings className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Settings</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                      <Info className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Rules</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </nav>

        {/* Main Game Layout */}
        <div className="pt-14 h-screen flex flex-col">
          {/* Top section: Credit + Wheel + History */}
          <div className="relative flex items-start justify-center px-4 pt-4 pb-2 flex-shrink-0" style={{ minHeight: '320px' }}>
            {/* Credit counter - top left */}
            <div
              className="absolute top-4 left-4 z-20"
              style={{
                background: 'linear-gradient(145deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.98) 100%)',
                border: '2px solid rgba(212,175,55,0.5)',
                borderRadius: '10px',
                padding: '10px 18px',
                boxShadow: '0 6px 25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                minWidth: '120px',
              }}
            >
              <div className="text-[9px] text-[#D4AF37] font-bold tracking-[0.2em] uppercase mb-1">Credit</div>
              <div className="text-2xl font-bold text-white" style={{ textShadow: '0 0 10px rgba(212,175,55,0.3)' }}>
                {balance.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">$Pc</div>
            </div>

            {/* Roulette wheel - center */}
            <div className="relative flex flex-col items-center">
              <VegasRouletteWheel
                rotation={wheelRotation}
                ballRotation={ballRotation}
                isSpinning={isSpinning}
                winningNumber={winningNumber}
              />

              {/* Winning number display below wheel */}
              {winningNumber !== null && !isSpinning && (
                <div className="mt-6 text-center relative">
                  <div
                    className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full pointer-events-none"
                    style={{
                      border: `2px solid ${isRed(winningNumber) ? 'rgba(220,38,38,0.6)' : winningNumber === 0 ? 'rgba(21,128,61,0.6)' : 'rgba(200,200,200,0.4)'}`,
                      animation: 'rouletteExpandRing 1.5s ease-out infinite',
                    }}
                  />
                  <div
                    className="relative px-6 py-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(145deg, rgba(0,0,0,0.95), rgba(15,15,25,0.98))',
                      border: `2px solid ${isRed(winningNumber) ? 'rgba(220,38,38,0.7)' : winningNumber === 0 ? 'rgba(21,128,61,0.7)' : 'rgba(180,180,180,0.5)'}`,
                      boxShadow: `0 0 15px ${isRed(winningNumber) ? 'rgba(220,38,38,0.3)' : winningNumber === 0 ? 'rgba(21,128,61,0.3)' : 'rgba(150,150,150,0.2)'}`,
                    }}
                  >
                    <div
                      className={`text-4xl font-bold ${isRed(winningNumber) ? 'text-[#dc2626]' : winningNumber === 0 ? 'text-[#15803d]' : 'text-gray-200'}`}
                      style={{ textShadow: `0 0 15px currentColor`, animation: 'rouletteNeonPulse 1.5s ease-in-out infinite alternate' }}
                    >
                      {winningNumber}
                    </div>
                    <div className="text-[10px] font-bold tracking-[0.2em] mt-1" style={{ color: isRed(winningNumber) ? '#dc2626' : winningNumber === 0 ? '#15803d' : '#aaa' }}>
                      {winningNumber === 0 ? 'GREEN' : isRed(winningNumber) ? 'RED' : 'BLACK'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* History panel - top right */}
            <div className="absolute top-4 right-4 z-20">
              <HistoryPanel history={history} />
            </div>
          </div>

          {/* Message bar */}
          <div className="text-center py-1 flex-shrink-0">
            <span
              className="inline-block px-5 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(15,10,5,0.9) 100%)',
                color: lastWin > 0 ? '#43A047' : '#D4AF37',
                border: `1px solid ${lastWin > 0 ? 'rgba(67,160,71,0.4)' : 'rgba(212,175,55,0.3)'}`,
                boxShadow: `0 2px 10px rgba(0,0,0,0.4)`,
                textShadow: `0 0 8px ${lastWin > 0 ? 'rgba(67,160,71,0.3)' : 'rgba(212,175,55,0.3)'}`,
              }}
            >
              {message}
            </span>
          </div>

          {/* Betting Table + Controls */}
          <div className={`flex-1 overflow-auto px-4 pb-2 ${loseFlash ? 'roulette-lose-shake' : ''}`} style={{ animation: loseFlash ? 'rouletteLoseShake 0.6s ease-out' : undefined }}>
            <div className="max-w-3xl mx-auto">
              {/* Betting board */}
              <div
                className="rounded-xl p-3 relative"
                style={{
                  background: `
                    repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.008) 1px, transparent 2px, transparent 3px),
                    repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.005) 1px, transparent 2px, transparent 3px),
                    linear-gradient(145deg, #1B5E20 0%, #0D3312 50%, #051a08 100%)
                  `,
                  boxShadow: `
                    0 15px 50px rgba(0,0,0,0.7),
                    inset 0 1px 3px rgba(255,255,255,0.04),
                    0 0 0 6px #5D4037,
                    0 0 0 8px #3E2723,
                    0 0 0 10px rgba(212,175,55,0.35)
                  `,
                }}
              >
                {/* Main number grid with 0 */}
                <div className="flex gap-[2px]">
                  {/* Zero */}
                  <button
                    onClick={() => placeBet('0', [0], 35)}
                    className="roulette-cell relative flex items-center justify-center font-bold text-lg transition-all hover:scale-105 flex-shrink-0"
                    style={{
                      width: '40px',
                      height: 'auto',
                      borderRadius: '6px',
                      background: 'linear-gradient(145deg, #15803d, #0D5A12)',
                      border: winningNumber === 0 ? '2px solid #D4AF37' : '1.5px solid rgba(212,175,55,0.4)',
                      boxShadow: winningNumber === 0
                        ? '0 0 15px rgba(212,175,55,0.6), inset 0 1px 2px rgba(255,255,255,0.15)'
                        : '0 3px 10px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      animation: winningNumber === 0 ? 'rouletteWinGlow 1.5s ease-in-out infinite' : undefined,
                    }}
                  >
                    0
                    {getBetAmount('0') > 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 roulette-chip-indicator">
                        <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center text-[7px] font-bold text-black border border-[#8B6914]">
                          {getBetAmount('0')}
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Number grid 3 rows x 12 cols */}
                  <div className="grid grid-cols-12 flex-1 gap-[2px]">
                    {GRID_NUMBERS.flat().map((num) => {
                      const isNumRed = isRed(num);
                      const betAmt = getBetAmount(num.toString());
                      const isWinner = winningNumber === num;

                      return (
                        <button
                          key={num}
                          onClick={() => placeBet(num.toString(), [num], 35)}
                          className="roulette-cell relative h-9 rounded flex items-center justify-center font-bold text-sm transition-all"
                          style={{
                            background: isNumRed
                              ? 'linear-gradient(145deg, #dc2626, #991b1b)'
                              : 'linear-gradient(145deg, #1f2937, #111)',
                            border: isWinner ? '2px solid #D4AF37' : '1px solid rgba(212,175,55,0.3)',
                            boxShadow: isWinner
                              ? '0 0 15px rgba(212,175,55,0.6), inset 0 1px 1px rgba(255,255,255,0.15)'
                              : '0 2px 5px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.08)',
                            color: 'white',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            animation: isWinner ? 'rouletteWinGlow 1.5s ease-in-out infinite' : undefined,
                          }}
                        >
                          {num}
                          {betAmt > 0 && (
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 roulette-chip-indicator">
                              <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center text-[6px] font-bold text-black border border-[#8B6914]">
                                {betAmt}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 2:1 column bets */}
                  <div className="flex flex-col gap-[2px] flex-shrink-0">
                    {[
                      { type: 'col3', label: '2:1', nums: [3,6,9,12,15,18,21,24,27,30,33,36] },
                      { type: 'col2', label: '2:1', nums: [2,5,8,11,14,17,20,23,26,29,32,35] },
                      { type: 'col1', label: '2:1', nums: [1,4,7,10,13,16,19,22,25,28,31,34] },
                    ].map(({ type, label, nums }) => (
                      <button
                        key={type}
                        onClick={() => placeBet(type, nums, 2)}
                        className="roulette-cell relative w-10 flex-1 rounded flex items-center justify-center font-bold text-[10px] transition-all hover:brightness-125"
                        style={{
                          background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                          border: '1px solid rgba(212,175,55,0.35)',
                          color: '#D4AF37',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          writingMode: 'vertical-lr',
                          textOrientation: 'mixed',
                        }}
                      >
                        {label}
                        {getBetAmount(type) > 0 && (
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 roulette-chip-indicator">
                            <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center text-[6px] font-bold text-black border border-[#8B6914]">
                              {getBetAmount(type)}
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dozens row */}
                <div className="flex gap-[2px] mt-[2px]" style={{ marginLeft: '42px', marginRight: '42px' }}>
                  {[
                    { type: '1st12', label: '1st 12', nums: Array.from({ length: 12 }, (_, i) => i + 1) },
                    { type: '2nd12', label: '2nd 12', nums: Array.from({ length: 12 }, (_, i) => i + 13) },
                    { type: '3rd12', label: '3rd 12', nums: Array.from({ length: 12 }, (_, i) => i + 25) },
                  ].map(({ type, label, nums }) => (
                    <button
                      key={type}
                      onClick={() => placeBet(type, nums, 2)}
                      className="roulette-cell relative flex-1 h-9 rounded flex items-center justify-center font-bold text-sm transition-all hover:brightness-125"
                      style={{
                        background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                        border: '1px solid rgba(212,175,55,0.35)',
                        color: '#D4AF37',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}
                    >
                      {label}
                      {getBetAmount(type) > 0 && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 roulette-chip-indicator">
                          <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center text-[6px] font-bold text-black border border-[#8B6914]">
                            {getBetAmount(type)}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Outside bets row */}
                <div className="flex gap-[2px] mt-[2px]" style={{ marginLeft: '42px', marginRight: '42px' }}>
                  {[
                    { type: 'low', label: '1-18', nums: Array.from({ length: 18 }, (_, i) => i + 1), style: {} },
                    { type: 'even', label: 'EVEN', nums: Array.from({ length: 18 }, (_, i) => (i + 1) * 2), style: {} },
                    { type: 'red', label: '◆', nums: RED_NUMBERS, style: { background: 'linear-gradient(145deg, #dc2626, #991b1b)', color: '#fff' } },
                    { type: 'black', label: '◆', nums: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35], style: { background: 'linear-gradient(145deg, #1f2937, #000)', color: '#fff' } },
                    { type: 'odd', label: 'ODD', nums: Array.from({ length: 18 }, (_, i) => i * 2 + 1), style: {} },
                    { type: 'high', label: '19-36', nums: Array.from({ length: 18 }, (_, i) => i + 19), style: {} },
                  ].map(({ type, label, nums, style: btnStyle }) => (
                    <button
                      key={type}
                      onClick={() => placeBet(type, nums, 1)}
                      className="roulette-cell relative flex-1 h-9 rounded flex items-center justify-center font-bold text-xs transition-all hover:scale-105 hover:brightness-125"
                      style={{
                        background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                        border: '1px solid rgba(212,175,55,0.35)',
                        color: '#D4AF37',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        ...btnStyle,
                      }}
                    >
                      {label}
                      {getBetAmount(type) > 0 && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 roulette-chip-indicator">
                          <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center text-[6px] font-bold text-black border border-[#8B6914]">
                            {getBetAmount(type)}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar: Chips + Action Buttons */}
          <div
            className="flex-shrink-0"
            style={{
              background: 'linear-gradient(180deg, rgba(15,15,15,0.98) 0%, rgba(5,5,5,1) 100%)',
              borderTop: '2px solid rgba(212,175,55,0.3)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <div className="max-w-4xl mx-auto px-4 py-2">
              <div className="flex items-center justify-between gap-4">
                {/* Chip selector */}
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

                {/* Bet total */}
                <div className="text-center flex-shrink-0">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">Total Bet</div>
                  <div className="text-lg font-bold text-[#D4AF37]">{totalBet} $Pc</div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => spin()}
                    disabled={isSpinning || placedBets.length === 0}
                    className="px-5 py-3 rounded-lg font-bold text-sm text-black"
                    style={{
                      background: isSpinning || placedBets.length === 0
                        ? 'linear-gradient(145deg, #555, #333)'
                        : 'linear-gradient(145deg, #43A047, #2E7D32)',
                      boxShadow: '0 3px 10px rgba(67,160,71,0.4)',
                      color: isSpinning || placedBets.length === 0 ? '#888' : '#fff',
                    }}
                  >
                    {isSpinning ? 'SPINNING...' : 'SPIN'}
                  </Button>

                  <Button
                    onClick={repeatAndSpin}
                    disabled={isSpinning || lastBets.length === 0}
                    className="px-4 py-3 rounded-lg font-bold text-[11px]"
                    style={{
                      background: isSpinning || lastBets.length === 0
                        ? 'linear-gradient(145deg, #555, #333)'
                        : 'linear-gradient(145deg, #1E88E5, #1565C0)',
                      boxShadow: '0 3px 10px rgba(30,136,229,0.3)',
                      color: isSpinning || lastBets.length === 0 ? '#888' : '#fff',
                    }}
                  >
                    REPEAT & SPIN
                  </Button>

                  <Button
                    onClick={repeatBet}
                    disabled={isSpinning || lastBets.length === 0}
                    className="px-4 py-3 rounded-lg font-bold text-[11px]"
                    style={{
                      background: isSpinning || lastBets.length === 0
                        ? 'linear-gradient(145deg, #555, #333)'
                        : 'linear-gradient(145deg, #D4AF37, #B8860B)',
                      boxShadow: '0 3px 10px rgba(212,175,55,0.3)',
                      color: isSpinning || lastBets.length === 0 ? '#888' : '#000',
                    }}
                  >
                    REPEAT BET
                  </Button>

                  <Button
                    onClick={clearBets}
                    disabled={isSpinning || placedBets.length === 0}
                    className="px-4 py-3 rounded-lg font-bold text-[11px]"
                    style={{
                      background: isSpinning || placedBets.length === 0
                        ? 'linear-gradient(145deg, #555, #333)'
                        : 'linear-gradient(145deg, #B71C1C, #8B0000)',
                      boxShadow: '0 3px 10px rgba(183,28,28,0.3)',
                      color: isSpinning || placedBets.length === 0 ? '#888' : '#fff',
                    }}
                  >
                    CLEAR
                  </Button>
                </div>
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
                <p className="text-[#C0C0C0]">37 pockets (0-36), single zero. La Partage rule returns half of even-money bets when zero hits.</p>
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
    </CasinoEnvironment>
  );
}
