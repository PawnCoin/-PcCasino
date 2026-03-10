import { useState, useRef } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PokerChip, ChipStack } from '@/components/PokerChip';
import { useSoundEffects } from '@/hooks/useSoundEffects';

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
  chips: { amount: number; count: number }[];
}

const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 500, 1000];

// European Roulette wheel order
const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const isRed = (num: number) => RED_NUMBERS.includes(num);

// Roulette Rules
const rouletteRules = {
  objective: 'Predict where the ball will land on the spinning wheel.',
  wheel: [
    'European Wheel: 37 pockets (0-36) - Better odds',
    'American Wheel: 38 pockets (0, 00, 1-36) - Higher house edge',
    'This game uses European rules (single zero)',
  ],
  insideBets: [
    { name: 'Straight Up', desc: 'Single number', payout: '35:1' },
    { name: 'Split', desc: 'Two adjacent numbers', payout: '17:1' },
    { name: 'Street', desc: 'Row of 3 numbers', payout: '11:1' },
    { name: 'Corner', desc: 'Square of 4 numbers', payout: '8:1' },
    { name: 'Line', desc: '6 numbers (2 rows)', payout: '5:1' },
  ],
  outsideBets: [
    { name: 'Red', desc: 'Any red number', payout: '1:1' },
    { name: 'Black', desc: 'Any black number', payout: '1:1' },
    { name: 'Even', desc: 'Even numbers', payout: '1:1' },
    { name: 'Odd', desc: 'Odd numbers', payout: '1:1' },
    { name: 'Low (1-18)', desc: 'Numbers 1-18', payout: '1:1' },
    { name: 'High (19-36)', desc: 'Numbers 19-36', payout: '1:1' },
    { name: 'Dozen', desc: '1st, 2nd, or 3rd 12', payout: '2:1' },
    { name: 'Column', desc: '12 numbers in column', payout: '2:1' },
  ],
};

// Ultra 3D Vegas-style Roulette Wheel Component with Deep Depth
function VegasRouletteWheel({ 
  rotation, 
  ballRotation, 
  isSpinning 
}: { 
  rotation: number; 
  ballRotation: number; 
  isSpinning: boolean;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  
  return (
    <div 
      className="relative"
      style={{
        perspective: '1500px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Deep table shadow beneath wheel */}
      <div 
        className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 40%, transparent 70%)',
          filter: 'blur(25px)',
          transform: 'translateZ(-100px)',
        }}
      />

      {/* Main 3D Wheel Container with dramatic tilt */}
      <div 
        className="relative w-80 h-80 md:w-[440px] md:h-[440px]"
        style={{
          transform: 'rotateX(35deg) rotateY(-5deg) translateZ(80px)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Deep Base Layer - Creates depth */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #1a0f0a, #2a1a12, #1a0f0a)',
            boxShadow: '0 50px 100px rgba(0,0,0,0.95)',
            transform: 'translateZ(-60px)',
          }}
        />

        {/* Outer Wood Rim - Multi-layered for depth */}
        <div 
          className="absolute -inset-2 rounded-full"
          style={{
            background: `
              linear-gradient(145deg, 
                #2E1A12 0%, 
                #3E2723 15%,
                #5D4037 30%, 
                #8D6E63 50%, 
                #5D4037 70%, 
                #3E2723 85%,
                #2E1A12 100%
              )
            `,
            boxShadow: `
              0 40px 100px rgba(0,0,0,0.95),
              0 0 0 6px #1a0f0a,
              inset 0 0 60px rgba(0,0,0,0.7),
              inset 0 0 100px rgba(212,175,55,0.1)
            `,
            transform: 'translateZ(-30px)',
          }}
        />

        {/* Gold decorative outer ring */}
        <div 
          className="absolute -inset-1 rounded-full"
          style={{
            background: `
              repeating-conic-gradient(
                from 0deg,
                #D4AF37 0deg 3deg,
                #B8860B 3deg 6deg
              )
            `,
            boxShadow: `
              0 0 30px rgba(212,175,55,0.5),
              inset 0 0 20px rgba(0,0,0,0.6)
            `,
            transform: 'translateZ(-15px)',
          }}
        />

        {/* Inner wood ring with bevel */}
        <div 
          className="absolute inset-2 rounded-full"
          style={{
            background: `
              linear-gradient(145deg, 
                #4E342E 0%, 
                #3E2723 30%,
                #2a1a12 50%,
                #3E2723 70%, 
                #4E342E 100%
              )
            `,
            boxShadow: `
              inset 0 0 40px rgba(0,0,0,0.8),
              0 0 20px rgba(0,0,0,0.5)
            `,
            transform: 'translateZ(-5px)',
          }}
        />

        {/* Gold inner decorative ring */}
        <div 
          className="absolute inset-5 rounded-full"
          style={{
            background: `
              conic-gradient(
                from 0deg,
                #D4AF37 0deg,
                #F4D03F 45deg,
                #D4AF37 90deg,
                #B8860B 135deg,
                #D4AF37 180deg,
                #F4D03F 225deg,
                #D4AF37 270deg,
                #B8860B 315deg,
                #D4AF37 360deg
              )
            `,
            boxShadow: `
              inset 0 0 15px rgba(0,0,0,0.5),
              0 0 15px rgba(212,175,55,0.4)
            `,
          }}
        />

        {/* Number track/pockets container */}
        <div 
          className="absolute inset-8 rounded-full overflow-hidden"
          style={{
            background: '#0a0a0a',
            boxShadow: `
              inset 0 0 40px rgba(0,0,0,0.9),
              0 0 0 3px #D4AF37,
              0 0 20px rgba(212,175,55,0.3)
            `,
            transform: 'translateZ(10px)',
          }}
        >
          {/* Rotating number track */}
          <div
            ref={wheelRef}
            className="absolute inset-0"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.5s ease-out',
            }}
          >
            {/* Individual number pockets with 3D depth */}
            {WHEEL_NUMBERS.map((num, i) => {
              const angle = i * (360 / 37);
              const isNumRed = isRed(num);
              const isZero = num === 0;
              
              return (
                <div
                  key={num}
                  className="absolute top-0 left-1/2 w-10 h-1/2 origin-bottom"
                  style={{
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                  }}
                >
                  {/* 3D Pocket with depth */}
                  <div 
                    className="absolute top-3 left-1/2 -translate-x-1/2 w-7 h-12 rounded-b-xl"
                    style={{
                      background: isZero 
                        ? 'linear-gradient(180deg, #166534 0%, #14532d 50%, #0D5A12 100%)' 
                        : isNumRed 
                          ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)' 
                          : 'linear-gradient(180deg, #374151 0%, #1f2937 50%, #000000 100%)',
                      boxShadow: `
                        inset 0 2px 4px rgba(255,255,255,0.3),
                        inset 0 -3px 6px rgba(0,0,0,0.6),
                        0 2px 4px rgba(0,0,0,0.5),
                        0 0 0 1px rgba(212,175,55,0.4)
                      `,
                      transform: 'translateZ(5px)',
                    }}
                  >
                    <span 
                      className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                    >
                      {num}
                    </span>
                  </div>
                  {/* Gold divider */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4"
                    style={{
                      background: 'linear-gradient(to bottom, #D4AF37, #B8860B, transparent)',
                      boxShadow: '0 0 4px rgba(212,175,55,0.5)',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Center hub with dramatic 3D effect */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full z-20"
            style={{
              background: `
                radial-gradient(ellipse at 35% 35%, 
                  #F4D03F 0%, 
                  #D4AF37 20%, 
                  #B8860B 40%, 
                  #8B6914 60%, 
                  #5D4037 80%,
                  #3E2723 100%
                )
              `,
              boxShadow: `
                0 15px 50px rgba(0,0,0,0.9),
                inset 0 3px 10px rgba(255,255,255,0.5),
                inset 0 -5px 15px rgba(0,0,0,0.5),
                0 0 0 5px #3E2723,
                0 0 0 8px #D4AF37,
                0 0 30px rgba(212,175,55,0.4)
              `,
              transform: 'translateZ(25px)',
            }}
          >
            {/* Decorative sunburst pattern on hub */}
            <div 
              className="absolute inset-2 rounded-full"
              style={{
                background: `
                  repeating-conic-gradient(
                    from 0deg,
                    rgba(255,255,255,0.1) 0deg 10deg,
                    transparent 10deg 20deg
                  )
                `,
              }}
            />
            {/* Inner ring */}
            <div 
              className="absolute inset-6 rounded-full"
              style={{
                background: 'linear-gradient(145deg, #D4AF37, #B8860B)',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
              }}
            />
            <img 
              src="/logos/pc-logo.png" 
              alt="$Pc" 
              className="w-12 h-12 md:w-14 md:h-14 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))' }}
            />
          </div>
        </div>

        {/* Ball track rim */}
        <div 
          className="absolute inset-6 rounded-full pointer-events-none"
          style={{
            boxShadow: `
              inset 0 0 30px rgba(0,0,0,0.7),
              0 0 0 2px rgba(212,175,55,0.3)
            `,
            transform: 'translateZ(15px)',
          }}
        />

        {/* The Ball with realistic 3D */}
        <div
          className="absolute w-5 h-5 md:w-6 md:h-6 rounded-full z-30"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, 
                #ffffff 0%, 
                #f0f0f0 20%,
                #d0d0d0 40%, 
                #909090 70%, 
                #505050 100%
              )
            `,
            boxShadow: `
              0 5px 15px rgba(0,0,0,0.9), 
              inset -3px -3px 6px rgba(0,0,0,0.4),
              inset 2px 2px 4px rgba(255,255,255,0.9)
            `,
            top: '10%',
            left: '50%',
            transform: `translateX(-50%) rotate(${ballRotation}deg)`,
            transformOrigin: '0 160px',
            transition: isSpinning ? 'none' : 'transform 0.5s ease-out',
          }}
        />

        {/* Turret (center spindle) - Elevated 3D */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full z-40"
          style={{
            background: `
              radial-gradient(circle at 35% 35%,
                #F4D03F 0%,
                #D4AF37 40%, 
                #B8860B 70%, 
                #8B6914 100%
              )
            `,
            boxShadow: `
              0 8px 25px rgba(0,0,0,0.8),
              inset 0 2px 5px rgba(255,255,255,0.5),
              inset 0 -3px 6px rgba(0,0,0,0.4)
            `,
            transform: 'translateZ(40px)',
          }}
        />

        {/* Decorative diamonds on outer rim */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-5"
            style={{
              top: '2%',
              left: '50%',
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
              transformOrigin: '0 165px',
            }}
          >
            <div 
              className="w-full h-full"
              style={{
                background: 'linear-gradient(145deg, #F4D03F, #D4AF37, #B8860B)',
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                boxShadow: `
                  0 3px 8px rgba(0,0,0,0.6),
                  inset 0 1px 2px rgba(255,255,255,0.5)
                `,
                transform: 'translateZ(5px)',
              }}
            />
          </div>
        ))}

        {/* Inner decorative metal ring */}
        <div 
          className="absolute inset-16 rounded-full pointer-events-none"
          style={{
            border: '2px solid rgba(212,175,55,0.3)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* Pointer/Deflector with 3D */}
      <div 
        className="absolute -top-8 left-1/2 -translate-x-1/2 z-50"
        style={{ 
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.9))',
          transform: 'translateZ(50px)',
        }}
      >
        <div 
          className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[30px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: '#D4AF37' }}
        />
        <div 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      {/* === ADDED: Metallic Chrome Highlight Layer on Wheel Rim === */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '-12px',
          background: `conic-gradient(
            from 0deg,
            rgba(255,255,255,0.0) 0deg,
            rgba(255,255,255,0.25) 30deg,
            rgba(200,220,255,0.4) 60deg,
            rgba(255,255,255,0.1) 90deg,
            rgba(255,255,255,0.0) 120deg,
            rgba(200,220,255,0.15) 180deg,
            rgba(255,255,255,0.3) 240deg,
            rgba(200,220,255,0.05) 300deg,
            rgba(255,255,255,0.0) 360deg
          )`,
          mask: 'radial-gradient(circle, transparent 68%, black 70%, black 76%, transparent 78%)',
          WebkitMask: 'radial-gradient(circle, transparent 68%, black 70%, black 76%, transparent 78%)',
          transform: 'rotateX(35deg) rotateY(-5deg) translateZ(82px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* === ADDED: Ball Glow Trail === */}
      {isSpinning && (
        <>
          <div
            className="absolute w-8 h-8 rounded-full z-30 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(212,175,55,0.3) 40%, transparent 70%)',
              top: '10%',
              left: '50%',
              transform: `translateX(-50%) rotate(${ballRotation}deg)`,
              transformOrigin: '0 160px',
              filter: 'blur(6px)',
            }}
          />
          <div
            className="absolute w-12 h-12 rounded-full z-29 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, rgba(212,175,55,0.1) 40%, transparent 70%)',
              top: '8%',
              left: '49%',
              transform: `translateX(-50%) rotate(${ballRotation + 8}deg)`,
              transformOrigin: '0 165px',
              filter: 'blur(12px)',
            }}
          />
          <div
            className="absolute w-10 h-10 rounded-full z-28 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
              top: '9%',
              left: '49.5%',
              transform: `translateX(-50%) rotate(${ballRotation + 16}deg)`,
              transformOrigin: '0 163px',
              filter: 'blur(18px)',
            }}
          />
        </>
      )}

      {/* === ADDED: Spotlight with Dynamic Shadow During Spin === */}
      {isSpinning && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${50 + Math.sin(ballRotation * 0.02) * 15}% ${50 + Math.cos(ballRotation * 0.02) * 15}%, rgba(255,255,255,0.08) 0%, transparent 50%)`,
            transform: 'scale(1.2)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Ambient glow effect */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 50%, rgba(212,175,55,0.05) 70%, transparent 100%)',
          transform: 'scale(1.3)',
        }}
      />
    </div>
  );
}

export function RouletteGame({ balance, onBack, onBet, onWin }: RouletteGameProps) {
  const [selectedChip, setSelectedChip] = useState(10);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('Place your bets!');
  const [useLaPartage, setUseLaPartage] = useState(true);
  
  const { isMuted, toggleMute, playSound } = useSoundEffects();

  const totalBet = placedBets.reduce((sum, bet) => sum + bet.amount, 0);

  const addChipsToBet = (amount: number, existingChips: { amount: number; count: number }[] = []) => {
    const newChips = [...existingChips];
    const existing = newChips.find(c => c.amount === amount);
    if (existing) {
      existing.count += 1;
    } else {
      newChips.push({ amount, count: 1 });
    }
    return newChips;
  };

  const placeNumberBet = (number: number, payout: number) => {
    if (isSpinning) return;
    if (!onBet(selectedChip)) {
      setMessage('Insufficient balance!');
      playSound('error');
      return;
    }

    const existingBetIndex = placedBets.findIndex(b => b.type === number.toString());
    
    if (existingBetIndex >= 0) {
      const newBets = [...placedBets];
      newBets[existingBetIndex].amount += selectedChip;
      newBets[existingBetIndex].chips = addChipsToBet(selectedChip, newBets[existingBetIndex].chips);
      setPlacedBets(newBets);
    } else {
      setPlacedBets([...placedBets, {
        type: number.toString(),
        numbers: [number],
        amount: selectedChip,
        payout,
        chips: [{ amount: selectedChip, count: 1 }],
      }]);
    }
    playSound('chip');
    setMessage(`Bet ${selectedChip} $Pc on ${number}`);
  };

  const placeOutsideBet = (type: string, numbers: number[], payout: number) => {
    if (isSpinning) return;
    if (!onBet(selectedChip)) {
      setMessage('Insufficient balance!');
      playSound('error');
      return;
    }

    const existingBetIndex = placedBets.findIndex(b => b.type === type);
    
    if (existingBetIndex >= 0) {
      const newBets = [...placedBets];
      newBets[existingBetIndex].amount += selectedChip;
      newBets[existingBetIndex].chips = addChipsToBet(selectedChip, newBets[existingBetIndex].chips);
      setPlacedBets(newBets);
    } else {
      setPlacedBets([...placedBets, { 
        type, 
        numbers, 
        amount: selectedChip, 
        payout,
        chips: [{ amount: selectedChip, count: 1 }],
      }]);
    }
    playSound('chip');
    setMessage(`Bet ${selectedChip} $Pc on ${type}`);
  };

  const clearBets = () => {
    if (isSpinning) return;
    placedBets.forEach(bet => {
      onWin(bet.amount);
    });
    setPlacedBets([]);
    setMessage('Bets cleared');
    playSound('clear');
  };

  const spin = async () => {
    if (isSpinning || placedBets.length === 0) return;

    setIsSpinning(true);
    setMessage('No more bets!');
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
      // Ease out cubic for realistic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      setWheelRotation(startRotation + (targetRotation - startRotation) * easeOut);
      setBallRotation(startBallRotation + (ballTargetRotation - startBallRotation) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(winningNum);
      }
    };

    requestAnimationFrame(animate);
  };

  const finishSpin = (number: number) => {
    setWinningNumber(number);
    setIsSpinning(false);
    playSound('win');

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
        won = true;
        winAmount = bet.amount * 2;
      } else if (bet.type === 'black' && !isRed(number) && number !== 0) {
        won = true;
        winAmount = bet.amount * 2;
      } else if (bet.type === 'even' && number !== 0 && number % 2 === 0) {
        won = true;
        winAmount = bet.amount * 2;
      } else if (bet.type === 'odd' && number !== 0 && number % 2 === 1) {
        won = true;
        winAmount = bet.amount * 2;
      } else if (bet.type === 'low' && number >= 1 && number <= 18) {
        won = true;
        winAmount = bet.amount * 2;
      } else if (bet.type === 'high' && number >= 19 && number <= 36) {
        won = true;
        winAmount = bet.amount * 2;
      } else if (bet.type === '1st12' && number >= 1 && number <= 12) {
        won = true;
        winAmount = bet.amount * 3;
      } else if (bet.type === '2nd12' && number >= 13 && number <= 24) {
        won = true;
        winAmount = bet.amount * 3;
      } else if (bet.type === '3rd12' && number >= 25 && number <= 36) {
        won = true;
        winAmount = bet.amount * 3;
      } else if (bet.type === 'col1' && number % 3 === 1 && number !== 0) {
        won = true;
        winAmount = bet.amount * 3;
      } else if (bet.type === 'col2' && number % 3 === 2) {
        won = true;
        winAmount = bet.amount * 3;
      } else if (bet.type === 'col3' && number % 3 === 0 && number !== 0) {
        won = true;
        winAmount = bet.amount * 3;
      }

      if (won) {
        totalWin += winAmount;
      } else if (isZero && bet.payout === 1 && useLaPartage) {
        laPartageRefund += bet.amount / 2;
      }
    });

    if (laPartageRefund > 0) {
      totalWin += laPartageRefund;
      setMessage(`Zero! La Partage: ${laPartageRefund} $Pc returned!`);
    }

    if (totalWin > 0) {
      onWin(totalWin);
      if (!laPartageRefund) setMessage(`Number ${number}! You won ${totalWin} $Pc!`);
    } else {
      setMessage(`Number ${number}. Better luck next time!`);
    }

    setPlacedBets([]);
  };

  const getBetChips = (type: string) => {
    const bet = placedBets.find(b => b.type === type);
    return bet?.chips || [];
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a0a 50%, #000000 100%)
        `,
      }}
    >
      {/* === ADDED: Neon pulse keyframes for winning number === */}
      <style>{`
        @keyframes neonPulse {
          0% { opacity: 0.85; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.8)) brightness(0.9); }
          100% { opacity: 1; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.8)) brightness(1.2); }
        }
        @keyframes spotlightSweep {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
      `}</style>
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
              <TooltipContent>
                <p>Return to game lobby</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center gap-4">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-4 py-1 rounded-full balance-display cursor-pointer hover:scale-105 transition-transform">
                    <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5" />
                    <span className="font-bold text-[#D4AF37]">
                      {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-gray-400">$Pc</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your current $Pc balance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                    <Settings className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Game settings (La Partage, etc.)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? 'Unmute game sounds' : 'Mute game sounds'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                    <Info className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Roulette rules & payouts</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </nav>

      {/* Game Area - Vegas 3D Style */}
      <div className="pt-14 min-h-screen flex flex-col lg:flex-row gap-4 p-4">
        {/* 3D Roulette Wheel */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative">
            {/* === ADDED: Spotlight Cone Effect During Spin === */}
            {isSpinning && (
              <div
                className="absolute -inset-16 pointer-events-none z-0"
                style={{
                  background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.12) 0%, rgba(255,255,255,0.04) 30%, transparent 60%)',
                  animation: 'spotlightSweep 2s ease-in-out infinite',
                }}
              />
            )}
            <VegasRouletteWheel 
              rotation={wheelRotation}
              ballRotation={ballRotation}
              isSpinning={isSpinning}
            />
            
            {/* === ENHANCED: Neon-Lit Winning Number Display Overlay === */}
            {winningNumber !== null && (
              <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 text-center">
                <div
                  className="relative px-8 py-4 rounded-2xl"
                  style={{
                    background: 'linear-gradient(145deg, rgba(0,0,0,0.9), rgba(20,20,30,0.95))',
                    border: `2px solid ${
                      isRed(winningNumber) ? 'rgba(220,38,38,0.8)' :
                      winningNumber === 0 ? 'rgba(21,128,61,0.8)' :
                      'rgba(156,163,175,0.6)'
                    }`,
                    boxShadow: `
                      0 0 20px ${
                        isRed(winningNumber) ? 'rgba(220,38,38,0.4)' :
                        winningNumber === 0 ? 'rgba(21,128,61,0.4)' :
                        'rgba(156,163,175,0.3)'
                      },
                      0 0 60px ${
                        isRed(winningNumber) ? 'rgba(220,38,38,0.2)' :
                        winningNumber === 0 ? 'rgba(21,128,61,0.2)' :
                        'rgba(156,163,175,0.1)'
                      },
                      inset 0 0 30px rgba(0,0,0,0.5)
                    `,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at center, ${
                        isRed(winningNumber) ? 'rgba(220,38,38,0.15)' :
                        winningNumber === 0 ? 'rgba(21,128,61,0.15)' :
                        'rgba(156,163,175,0.1)'
                      } 0%, transparent 70%)`,
                    }}
                  />
                  <div className="text-sm text-[#C0C0C0] mb-1 tracking-[0.3em] uppercase" style={{ textShadow: '0 0 10px rgba(192,192,192,0.5)' }}>WINNING NUMBER</div>
                  <div
                    className={`text-7xl font-bold ${
                      isRed(winningNumber) ? 'text-[#dc2626]' :
                      winningNumber === 0 ? 'text-[#15803d]' :
                      'text-gray-300'
                    }`}
                    style={{
                      textShadow: `
                        0 0 10px currentColor,
                        0 0 30px currentColor,
                        0 0 60px currentColor,
                        0 0 90px currentColor
                      `,
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
                      animation: 'neonPulse 1.5s ease-in-out infinite alternate',
                    }}
                  >
                    {winningNumber}
                  </div>
                  {isRed(winningNumber) && <div className="text-sm text-[#dc2626] font-bold tracking-[0.3em]" style={{ textShadow: '0 0 15px rgba(220,38,38,0.6)' }}>RED</div>}
                  {!isRed(winningNumber) && winningNumber !== 0 && <div className="text-sm text-gray-400 font-bold tracking-[0.3em]" style={{ textShadow: '0 0 15px rgba(156,163,175,0.4)' }}>BLACK</div>}
                  {winningNumber === 0 && <div className="text-sm text-[#15803d] font-bold tracking-[0.3em]" style={{ textShadow: '0 0 15px rgba(21,128,61,0.6)' }}>GREEN</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vegas Style Betting Table */}
        <div className="flex-1 p-4">
          {/* Chip Selection */}
          <div className="mb-4">
            <div className="text-center text-[#C0C0C0] text-sm mb-2 tracking-wider">SELECT CHIP VALUE</div>
            <div className="flex justify-center gap-2 flex-wrap">
              {CHIP_VALUES.map(amount => (
                <PokerChip
                  key={amount}
                  amount={amount}
                  size="md"
                  selected={selectedChip === amount}
                  onClick={() => setSelectedChip(amount)}
                />
              ))}
            </div>
          </div>

          {/* 3D Betting Table */}
          <div className="overflow-x-auto relative">
            {/* === ADDED: Subtle Ambient Glow Around Betting Board === */}
            <div
              className="absolute -inset-4 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, rgba(27,94,32,0.06) 30%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
            <div 
              className="inline-block p-4 rounded-lg relative"
              style={{
                background: 'linear-gradient(145deg, #1B5E20, #0D3312, #1B5E20)',
                boxShadow: `
                  0 20px 60px rgba(0,0,0,0.8),
                  inset 0 2px 4px rgba(255,255,255,0.05),
                  0 0 0 8px #5D4037,
                  0 0 0 10px #3E2723,
                  0 0 40px rgba(27,94,32,0.15),
                  0 0 80px rgba(212,175,55,0.08)
                `,
              }}
            >
              {/* Zero */}
              <div className="flex mb-1">
                <button
                  onClick={() => placeNumberBet(0, 35)}
                  className="relative w-14 h-24 rounded-lg flex items-center justify-center font-bold text-xl transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(145deg, #15803d, #0D5A12)',
                    border: '2px solid rgba(212,175,55,0.5)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  0
                  {getBetChips('0').length > 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <ChipStack amount={getBetChips('0')[0]?.amount || 10} count={1} size="sm" />
                    </div>
                  )}
                </button>

                {/* Number grid - 3 rows */}
                <div className="grid grid-cols-12 gap-1 ml-1">
                  {[3,6,9,12,15,18,21,24,27,30,33,36,2,5,8,11,14,17,20,23,26,29,32,35,1,4,7,10,13,16,19,22,25,28,31,34].map((num) => {
                    const isNumRed = isRed(num);
                    const chips = getBetChips(num.toString());
                    
                    return (
                      <button
                        key={num}
                        onClick={() => placeNumberBet(num, 35)}
                        className="relative w-9 h-8 md:w-10 md:h-9 rounded flex items-center justify-center font-bold text-sm transition-all hover:scale-110"
                        style={{
                          background: isNumRed 
                            ? 'linear-gradient(145deg, #dc2626, #991b1b)' 
                            : 'linear-gradient(145deg, #1f2937, #000000)',
                          border: '1px solid rgba(212,175,55,0.4)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        {num}
                        {chips.length > 0 && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                            <ChipStack amount={chips[0]?.amount || 10} count={chips[0]?.count || 1} size="sm" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 2 to 1 column bets */}
                <div className="flex flex-col gap-1 ml-1">
                  {[
                    { type: 'col3', label: '2:1', nums: [3,6,9,12,15,18,21,24,27,30,33,36] },
                    { type: 'col2', label: '2:1', nums: [2,5,8,11,14,17,20,23,26,29,32,35] },
                    { type: 'col1', label: '2:1', nums: [1,4,7,10,13,16,19,22,25,28,31,34] },
                  ].map(({ type, label, nums }) => {
                    const chips = getBetChips(type);
                    
                    return (
                      <button
                        key={type}
                        onClick={() => placeOutsideBet(type, nums, 2)}
                        className="relative w-12 h-8 md:w-14 md:h-9 rounded flex items-center justify-center font-bold text-xs"
                        style={{
                          background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#D4AF37',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        {label}
                        {chips.length > 0 && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                            <ChipStack amount={chips[0]?.amount || 10} count={1} size="sm" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dozens */}
              <div className="flex gap-1 mt-2">
                {[
                  { type: '1st12', label: '1st 12', nums: Array.from({length: 12}, (_, i) => i + 1) },
                  { type: '2nd12', label: '2nd 12', nums: Array.from({length: 12}, (_, i) => i + 13) },
                  { type: '3rd12', label: '3rd 12', nums: Array.from({length: 12}, (_, i) => i + 25) },
                ].map(({ type, label, nums }) => {
                  const chips = getBetChips(type);
                  
                  return (
                    <button
                      key={type}
                      onClick={() => placeOutsideBet(type, nums, 2)}
                      className="relative flex-1 h-10 rounded flex items-center justify-center font-bold text-sm"
                      style={{
                        background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        color: '#D4AF37',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}
                    >
                      {label}
                      {chips.length > 0 && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={chips[0]?.amount || 10} count={1} size="sm" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Outside bets - Even/Odd, Red/Black, Low/High */}
              <div className="flex gap-1 mt-1">
                {[
                  { type: 'low', label: '1-18', nums: Array.from({length: 18}, (_, i) => i + 1) },
                  { type: 'even', label: 'EVEN', nums: Array.from({length: 18}, (_, i) => (i + 1) * 2) },
                  { type: 'red', label: 'RED', nums: RED_NUMBERS, isRed: true },
                  { type: 'black', label: 'BLACK', nums: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36].filter(n => !RED_NUMBERS.includes(n)), isBlack: true },
                  { type: 'odd', label: 'ODD', nums: Array.from({length: 18}, (_, i) => i * 2 + 1).filter(n => n > 0) },
                  { type: 'high', label: '19-36', nums: Array.from({length: 18}, (_, i) => i + 19) },
                ].map(({ type, label, nums, isRed: redBtn, isBlack: blackBtn }) => {
                  const chips = getBetChips(type);
                  
                  return (
                    <button
                      key={type}
                      onClick={() => placeOutsideBet(type, nums, 1)}
                      className="relative flex-1 h-10 rounded flex items-center justify-center font-bold text-xs transition-all hover:scale-105"
                      style={{
                        background: redBtn 
                          ? 'linear-gradient(145deg, #dc2626, #991b1b)' 
                          : blackBtn 
                            ? 'linear-gradient(145deg, #1f2937, #000000)' 
                            : 'linear-gradient(145deg, #5D4037, #3E2723)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        color: redBtn || blackBtn ? 'white' : '#D4AF37',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}
                    >
                      {label}
                      {chips.length > 0 && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <ChipStack amount={chips[0]?.amount || 10} count={1} size="sm" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Total Bet & Controls */}
          <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-black/60 border border-[#5D4037]/50">
            <div>
              <span className="text-[#C0C0C0] text-sm">Total Bet: </span>
              <span className="text-[#D4AF37] font-bold text-xl">{totalBet} $Pc</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearBets}
                disabled={isSpinning || placedBets.length === 0}
                className="border-[#B71C1C]/50 text-[#B71C1C] hover:bg-[#B71C1C]/20"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="mt-4 text-center">
              <div className="inline-block px-6 py-2 rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40 font-bold">
                {message}
              </div>
            </div>
          )}

          {/* Spin Button */}
          <Button
            onClick={spin}
            disabled={isSpinning || placedBets.length === 0}
            className="w-full btn-primary py-6 text-xl font-bold mt-4"
            style={{ boxShadow: '0 10px 30px rgba(212,175,55,0.3)' }}
          >
            {isSpinning ? 'SPINNING...' : 'SPIN WHEEL'}
          </Button>
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
            <DialogTitle className="font-casino text-xl text-gradient-gold">Game Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#5D4037]/20">
              <div>
                <div className="font-bold text-white">La Partage</div>
                <div className="text-xs text-[#808080]">Lose half on zero (even-money bets)</div>
              </div>
              <Switch checked={useLaPartage} onCheckedChange={setUseLaPartage} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
