import { useState, useRef, useEffect } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PokerChip, ChipStack, ChipSelector, DealerVegasProps, formatChipLabel } from '@/components/PokerChip';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { CasinoEnvironment } from './CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';

interface CrapsGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
}

// Worldwide Craps Rules
const crapsRules = {
  objective: 'Predict the outcome of the roll of two dice.',
  phases: [
    'Come Out Roll: First roll of a new round',
    'Point Phase: Established when 4, 5, 6, 8, 9, or 10 is rolled',
    'Seven Out: Rolling 7 after point is established ends the round',
  ],
  passLine: [
    'Pass Line Bet: Win on 7 or 11 on come out, lose on 2, 3, or 12',
    'If point is established, win if point is rolled again before 7',
    'Pays even money (1:1)',
  ],
  dontPass: [
    "Don't Pass Bet: Opposite of Pass Line",
    'Win on 2 or 3 on come out, lose on 7 or 11',
    '12 is a push (tie)',
    'Pays even money (1:1)',
  ],
  comeBets: [
    'Come Bet: Similar to Pass Line but can be placed anytime',
    'Win on 7 or 11, lose on 2, 3, or 12',
    'If point is rolled, it becomes your Come Point',
  ],
  placeBets: [
    'Place Bet: Bet on specific number (4, 5, 6, 8, 9, 10)',
    'Win if number is rolled before 7',
    'Payouts: 4/10 = 9:5, 5/9 = 7:5, 6/8 = 7:6',
  ],
  fieldBet: [
    'Field Bet: One-roll bet',
    'Win on 2, 3, 4, 9, 10, 11, 12',
    '2 pays double, 12 pays triple (or double depending on casino)',
  ],
  hardways: [
    'Hardway Bet: Both dice show same number',
    'Hard 4 (2-2), Hard 6 (3-3), Hard 8 (4-4), Hard 10 (5-5)',
    'Lose if 7 is rolled or easy way is rolled',
    'Payouts: Hard 4/10 = 7:1, Hard 6/8 = 9:1',
  ],
  proposition: [
    'Any 7: Pays 4:1',
    'Any Craps (2, 3, 12): Pays 7:1',
    'Horn Bet (2, 3, 11, 12): Pays 15:1 or 30:1',
  ],
};

interface Bet {
  type: string;
  amount: number;
  payout: number;
  active: boolean;
  chips: { amount: number; count: number }[];
}

const CHIP_VALUES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];

// Ultra Realistic 3D Dice Component with Vegas Quality
interface RealisticDice3DProps {
  value: number;
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number };
  isRolling: boolean;
  diceId: number;
  glowColor?: string;
}

function RealisticDice3D({ value, rotation, position, isRolling, glowColor }: RealisticDice3DProps) {
  const getFaceRotation = (faceValue: number): { x: number; y: number } => {
    const faceRotations: Record<number, { x: number; y: number }> = {
      1: { x: 0, y: 0 },
      6: { x: 180, y: 0 },
      2: { x: 0, y: -90 },
      5: { x: 0, y: 90 },
      3: { x: -90, y: 0 },
      4: { x: 90, y: 0 },
    };
    return faceRotations[faceValue] || { x: 0, y: 0 };
  };

  const finalRotation = getFaceRotation(value);
  const totalRotation = {
    x: rotation.x + finalRotation.x,
    y: rotation.y + finalRotation.y,
    z: rotation.z,
  };

  const DICE_SIZE = 80;
  const HALF = DICE_SIZE / 2;

  return (
    <div
      className="absolute"
      style={{
        width: `${DICE_SIZE}px`,
        height: `${DICE_SIZE}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        transition: isRolling ? 'none' : 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        zIndex: 10,
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${totalRotation.x}deg) rotateY(${totalRotation.y}deg) rotateZ(${totalRotation.z}deg)`,
          transition: isRolling ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Face 1 - Front */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: `
              linear-gradient(145deg, 
                #ffffff 0%, 
                #f0f0f0 40%, 
                #e0e0e0 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            transform: `translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
        </div>

        {/* Face 6 - Back */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: `
              linear-gradient(145deg, 
                #ffffff 0%, 
                #f0f0f0 40%, 
                #e0e0e0 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            transform: `rotateY(180deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          {[[0.22, 0.22], [0.78, 0.22], [0.22, 0.5], [0.78, 0.5], [0.22, 0.78], [0.78, 0.78]].map(([top, left], i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{ 
                top: `${top * 100}%`, 
                left: `${left * 100}%`, 
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>

        {/* Face 2 - Right */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: `
              linear-gradient(145deg, 
                #ffffff 0%, 
                #f0f0f0 40%, 
                #e0e0e0 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            transform: `rotateY(90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-3 left-3 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute bottom-3 right-3 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
        </div>

        {/* Face 5 - Left */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: `
              linear-gradient(145deg, 
                #ffffff 0%, 
                #f0f0f0 40%, 
                #e0e0e0 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            transform: `rotateY(-90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
        </div>

        {/* Face 3 - Top */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: `
              linear-gradient(145deg, 
                #ffffff 0%, 
                #f0f0f0 40%, 
                #e0e0e0 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            transform: `rotateX(90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
        </div>

        {/* Face 4 - Bottom */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: `
              linear-gradient(145deg, 
                #ffffff 0%, 
                #f0f0f0 40%, 
                #e0e0e0 100%
              )
            `,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            transform: `rotateX(-90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
          <div 
            className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)',
            }}
          />
        </div>
      </div>

      {/* Beveled edge highlight overlay */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          width: `${DICE_SIZE}px`,
          height: `${DICE_SIZE}px`,
          left: `${position.x}px`,
          top: `${position.y}px`,
          background: 'transparent',
          boxShadow: `
            inset 3px 3px 6px rgba(255,255,255,0.4),
            inset -3px -3px 6px rgba(0,0,0,0.3),
            inset 0 0 12px rgba(212,175,55,0.2),
            0 0 15px rgba(255,255,255,0.05)
          `,
          borderRadius: '14px',
          zIndex: 11,
          transition: isRolling ? 'none' : 'all 0.4s ease',
        }}
      />

      {/* Translucent inner glow */}
      <div
        className="absolute rounded-xl pointer-events-none"
        style={{
          width: `${DICE_SIZE}px`,
          height: `${DICE_SIZE}px`,
          left: `${position.x}px`,
          top: `${position.y}px`,
          background: isRolling
            ? 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 50%)',
          borderRadius: '14px',
          zIndex: 12,
          transition: isRolling ? 'none' : 'all 0.4s ease',
        }}
      />

      {/* Glow layer during roll */}
      {isRolling && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            width: `${DICE_SIZE + 30}px`,
            height: `${DICE_SIZE + 30}px`,
            left: `${position.x - 15}px`,
            top: `${position.y - 15}px`,
            background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0.1) 40%, transparent 70%)',
            filter: 'blur(10px)',
            zIndex: 9,
            animation: 'pulse 0.3s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Win/loss glow around dice */}
      {glowColor && !isRolling && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            width: `${DICE_SIZE + 20}px`,
            height: `${DICE_SIZE + 20}px`,
            left: `${position.x - 10}px`,
            top: `${position.y - 10}px`,
            boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
            borderRadius: '14px',
            zIndex: 8,
            animation: 'pulse 1s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Dynamic dice shadow */}
      <div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full transition-all"
        style={{
          width: isRolling ? '55px' : '70px',
          height: isRolling ? '12px' : '14px',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.7), transparent 70%)',
          filter: 'blur(6px)',
          opacity: isRolling ? 0.4 : 0.9,
          transition: 'all 0.1s ease-out',
        }}
      />
    </div>
  );
}

export function CrapsGame({ balance, onBack, onBet, onWin, onAddBalance }: CrapsGameProps) {
  const [gamePhase, setGamePhase] = useState<'comeout' | 'point'>('comeout');
  const [point, setPoint] = useState<number | null>(null);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedChip, setSelectedChip] = useState(10);
  const [showRules, setShowRules] = useState(false);
  const [message, setMessage] = useState('Place your bets and roll!');
  const [rollHistory, setRollHistory] = useState<number[]>([]);
  const [winFlash, setWinFlash] = useState(false);
  const [loseFlash, setLoseFlash] = useState(false);
  const [winText, setWinText] = useState('');
  
  // 3D dice animation state
  const [dice1Rotation, setDice1Rotation] = useState({ x: 0, y: 0, z: 0 });
  const [dice2Rotation, setDice2Rotation] = useState({ x: 0, y: 0, z: 0 });
  const [dice1Position, setDice1Position] = useState({ x: 80, y: 100 });
  const [dice2Position, setDice2Position] = useState({ x: 200, y: 100 });
  
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  
  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRolling) {
      const midX = (dice1Position.x + dice2Position.x) / 2;
      const midY = (dice1Position.y + dice2Position.y) / 2;
      const pctX = Math.min(100, Math.max(0, (midX / 400) * 100));
      const pctY = Math.min(100, Math.max(0, (midY / 320) * 100));
      setSpotlightPos({ x: pctX, y: pctY });
    } else {
      const midX = (dice1Position.x + dice2Position.x) / 2;
      const midY = (dice1Position.y + dice2Position.y) / 2;
      const pctX = Math.min(100, Math.max(0, (midX / 400) * 100));
      const pctY = Math.min(100, Math.max(0, (midY / 320) * 100));
      setSpotlightPos({ x: pctX, y: pctY });
    }
  }, [dice1Position, dice2Position, isRolling]);

  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
  const diceTotal = dice[0] + dice[1];

  // Add chips to bet
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

  // Place a bet
  const placeBet = (type: string, payout: number) => {
    if (isRolling) return;
    
    if (gamePhase === 'point' && (type === 'pass' || type === 'dontpass')) {
      setMessage('Cannot place Pass/Don\'t Pass bets during point phase');
      return;
    }

    if (!onBet(selectedChip)) {
      setMessage('Insufficient balance!');
      playSound('error');
      return;
    }

    const existingBet = bets.find(b => b.type === type);
    if (existingBet) {
      setBets(bets.map(b => b.type === type ? { 
        ...b, 
        amount: b.amount + selectedChip,
        chips: addChipsToBet(selectedChip, b.chips)
      } : b));
    } else {
      setBets([...bets, { 
        type, 
        amount: selectedChip, 
        payout, 
        active: true,
        chips: [{ amount: selectedChip, count: 1 }]
      }]);
    }
    playSound('chip');
    setMessage(`Bet ${selectedChip} $Pc on ${type.toUpperCase()}`);
  };

  // Clear all bets
  const clearBets = () => {
    if (isRolling) return;
    bets.forEach(bet => {
      if (bet.active) onWin(bet.amount);
    });
    setBets([]);
    setMessage('All bets cleared');
    playSound('clear');
  };

  // Roll the dice with ultra-realistic 3D physics animation
  const rollDice = async () => {
    if (isRolling || bets.length === 0) return;

    setIsRolling(true);
    setMessage('Rolling...');
    playSound('diceRoll');

    // Generate final dice values
    const finalDice1 = Math.floor(Math.random() * 6) + 1;
    const finalDice2 = Math.floor(Math.random() * 6) + 1;

    // Animation parameters - longer for realism
    const duration = 3000;
    const startTime = Date.now();
    
    // Starting positions (from the "shooter" end of table)
    const startX1 = 30;
    const startY1 = 240;
    const startX2 = 60;
    const startY2 = 240;
    
    // Final landing positions (random on the table with collision avoidance)
    const endX1 = 60 + Math.random() * 160;
    const endY1 = 40 + Math.random() * 100;
    const endX2 = 100 + Math.random() * 160;
    const endY2 = 60 + Math.random() * 100;

    // Control points for bezier curve (creates arc motion)
    const controlX1 = startX1 + (endX1 - startX1) * 0.5 + (Math.random() - 0.5) * 60;
    const controlY1 = startY1 + (endY1 - startY1) * 0.3 - 40; // Arc up
    const controlX2 = startX2 + (endX2 - startX2) * 0.5 + (Math.random() - 0.5) * 60;
    const controlY2 = startY2 + (endY2 - startY2) * 0.3 - 40;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Custom easing - fast start, slow end with bounce
      const easeOutBounce = (t: number) => {
        if (t < 0.7) {
          return 1 - Math.pow(1 - t / 0.7, 3);
        } else {
          const bounceT = (t - 0.7) / 0.3;
          return 1 - Math.sin(bounceT * Math.PI) * 0.1 * (1 - bounceT);
        }
      };
      
      const easedProgress = easeOutBounce(progress);
      
      // Quadratic bezier curve for arc motion
      const bezier = (t: number, p0: number, p1: number, p2: number) => {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
      };
      
      // Calculate positions with arc trajectory
      const currentX1 = bezier(easedProgress, startX1, controlX1, endX1);
      const currentY1 = bezier(easedProgress, startY1, controlY1, endY1);
      const currentX2 = bezier(easedProgress, startX2, controlX2, endX2);
      const currentY2 = bezier(easedProgress, startY2, controlY2, endY2);
      
      // Add bounce effect when dice hit the table
      const getBounce = (t: number, seed: number) => {
        if (t < 0.6) return 0;
        const bouncePhase = (t - 0.6) / 0.4;
        return Math.sin(bouncePhase * Math.PI * 4 + seed) * (1 - bouncePhase) * 15;
      };
      
      setDice1Position({
        x: currentX1,
        y: currentY1 + getBounce(progress, 0),
      });
      
      setDice2Position({
        x: currentX2,
        y: currentY2 + getBounce(progress, 1),
      });
      
      // Chaotic rotation during roll - multiple axis spinning
      const rotationSpeed = Math.max(0, 1 - progress * 1.2); // Slow down near end
      const chaos1 = Math.sin(elapsed * 0.02) * 200 * rotationSpeed;
      const chaos2 = Math.cos(elapsed * 0.018) * 200 * rotationSpeed;
      
      setDice1Rotation({
        x: elapsed * 1.2 * rotationSpeed + chaos1,
        y: elapsed * 0.9 * rotationSpeed + chaos2,
        z: elapsed * 0.6 * rotationSpeed + Math.sin(elapsed * 0.015) * 100,
      });
      
      setDice2Rotation({
        x: elapsed * 1.0 * rotationSpeed + chaos2,
        y: elapsed * 0.8 * rotationSpeed + chaos1,
        z: elapsed * 0.5 * rotationSpeed + Math.cos(elapsed * 0.012) * 100,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final positions and values with slight random offset for realism
        setDice([finalDice1, finalDice2]);
        setDice1Rotation({ 
          x: Math.random() * 10 - 5, 
          y: Math.random() * 10 - 5, 
          z: Math.random() * 10 - 5 
        });
        setDice2Rotation({ 
          x: Math.random() * 10 - 5, 
          y: Math.random() * 10 - 5, 
          z: Math.random() * 10 - 5 
        });
        resolveRoll([finalDice1, finalDice2]);
      }
    };

    requestAnimationFrame(animate);
  };

  // Resolve the roll
  const resolveRoll = (rolledDice: [number, number]) => {
    const total = rolledDice[0] + rolledDice[1];
    setRollHistory(prev => [total, ...prev].slice(0, 10));

    let totalWin = 0;
    const newBets = [...bets];

    if (gamePhase === 'comeout') {
      bets.forEach((bet, index) => {
        if (bet.type === 'pass') {
          if (total === 7 || total === 11) {
            totalWin += bet.amount * 2;
            newBets[index].active = false;
            playSound('win');
          } else if (total === 2 || total === 3 || total === 12) {
            newBets[index].active = false;
          }
        } else if (bet.type === 'dontpass') {
          if (total === 2 || total === 3) {
            totalWin += bet.amount * 2;
            newBets[index].active = false;
            playSound('win');
          } else if (total === 7 || total === 11) {
            newBets[index].active = false;
          } else if (total === 12) {
            totalWin += bet.amount;
            newBets[index].active = false;
          }
        } else if (bet.type === 'field') {
          if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
            const multiplier = total === 2 ? 2 : total === 12 ? 3 : 1;
            totalWin += bet.amount * (multiplier + 1);
            playSound('win');
          }
          newBets[index].active = false;
        } else if (bet.type === 'any7') {
          if (total === 7) {
            totalWin += bet.amount * 5;
            playSound('win');
          }
          newBets[index].active = false;
        } else if (bet.type === 'anycraps') {
          if ([2, 3, 12].includes(total)) {
            totalWin += bet.amount * 8;
            playSound('win');
          }
          newBets[index].active = false;
        }
      });

      if ([4, 5, 6, 8, 9, 10].includes(total)) {
        setPoint(total);
        setGamePhase('point');
        setMessage(`Point is ${total}! Roll again before 7`);
      } else {
        setMessage(`Roll: ${total}. ${total === 7 || total === 11 ? 'Natural!' : total === 2 || total === 3 || total === 12 ? 'Craps!' : ''}`);
      }
    } else {
      bets.forEach((bet, index) => {
        if (bet.type === 'pass') {
          if (total === point) {
            totalWin += bet.amount * 2;
            newBets[index].active = false;
            playSound('win');
          } else if (total === 7) {
            newBets[index].active = false;
          }
        } else if (bet.type === 'dontpass') {
          if (total === 7) {
            totalWin += bet.amount * 2;
            newBets[index].active = false;
            playSound('win');
          } else if (total === point) {
            newBets[index].active = false;
          }
        } else if (bet.type.startsWith('place')) {
          const placeNumber = parseInt(bet.type.replace('place', ''));
          if (total === placeNumber) {
            totalWin += bet.amount * (bet.payout + 1);
            playSound('win');
          } else if (total === 7) {
            newBets[index].active = false;
          }
        } else if (bet.type.startsWith('hard')) {
          const hardNumber = parseInt(bet.type.replace('hard', ''));
          const isHard = rolledDice[0] === rolledDice[1];
          if (total === hardNumber && isHard) {
            totalWin += bet.amount * (bet.payout + 1);
            playSound('win');
          } else if (total === 7 || (total === hardNumber && !isHard)) {
            newBets[index].active = false;
          }
        } else if (bet.type === 'field') {
          if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
            const multiplier = total === 2 ? 2 : total === 12 ? 3 : 1;
            totalWin += bet.amount * (multiplier + 1);
            playSound('win');
          }
          newBets[index].active = false;
        } else if (bet.type === 'any7') {
          if (total === 7) {
            totalWin += bet.amount * 5;
            playSound('win');
          }
          newBets[index].active = false;
        } else if (bet.type === 'anycraps') {
          if ([2, 3, 12].includes(total)) {
            totalWin += bet.amount * 8;
            playSound('win');
          }
          newBets[index].active = false;
        }
      });

      if (total === 7) {
        setPoint(null);
        setGamePhase('comeout');
        setMessage('Seven out! New round starting...');
        newBets.forEach(bet => bet.active = false);
      } else if (total === point) {
        setPoint(null);
        setGamePhase('comeout');
        setMessage('Point hit! New round starting...');
      } else {
        setMessage(`Roll: ${total}. Point is ${point}`);
      }
    }

    setBets(newBets.filter(b => b.active));

    if (totalWin > 0) {
      onWin(totalWin);
      setMessage(prev => `${prev} You won ${totalWin} $Pc!`);
      setWinFlash(true);
      setWinText(`+${totalWin} $Pc`);
      setTimeout(() => { setWinFlash(false); setWinText(''); }, 2000);
    } else if (total === 7 && gamePhase === 'point') {
      setLoseFlash(true);
      setTimeout(() => setLoseFlash(false), 1500);
    }

    setIsRolling(false);
  };

  const getBetAmount = (type: string) => {
    const bet = bets.find(b => b.type === type);
    return bet ? bet.amount : 0;
  };

  const getBetChips = (type: string) => {
    const bet = bets.find(b => b.type === type);
    return bet?.chips || [];
  };

  return (
    <CasinoEnvironment gameType="craps">
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a0a 50%, #000000 100%)
        `,
      }}
    >
      {/* Header */}
      <InGameTopBar
        gameName="Craps"
        balance={balance}
        onBack={onBack}
        onAddBalance={onAddBalance}
        showShare
        rightSlot={
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                  <Info className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>View Craps rules & payouts</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Dealer side Vegas props */}
      <div className="flex justify-center py-1 pointer-events-none select-none" style={{ borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <DealerVegasProps />
      </div>

      {/* Win/Loss Flash Overlays */}
      {winFlash && (
        <div className="fixed inset-0 z-[100] pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(67,160,71,0.3) 0%, transparent 70%)',
          animation: 'craps-win-flash 2s ease-out forwards',
        }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl font-bold font-casino text-[#D4AF37] animate-bounce" style={{
              textShadow: '0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4)',
            }}>
              {winText}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{
              width: '200px',
              height: '200px',
              border: '3px solid rgba(212,175,55,0.6)',
              borderRadius: '50%',
              animation: 'craps-ring-expand 1.5s ease-out forwards',
            }} />
          </div>
        </div>
      )}
      {loseFlash && (
        <div className="fixed inset-0 z-[100] pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(183,28,28,0.3) 0%, transparent 70%)',
          animation: 'craps-lose-flash 1.5s ease-out forwards',
        }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold font-casino text-[#EF5350]" style={{
              textShadow: '0 0 20px rgba(239,83,80,0.8)',
              animation: 'craps-shake 0.5s ease-out',
            }}>
              SEVEN OUT!
            </div>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side - 3D Dice Table */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          {/* Phase Indicator + Point Marker Puck */}
          <div className="mb-4 text-center flex items-center gap-4 justify-center">
            <div>
              <div className="text-sm text-[#C0C0C0] mb-1 tracking-wider">
                {gamePhase === 'comeout' ? 'COME OUT ROLL' : 'POINT PHASE'}
              </div>
              {point && (
                <div 
                  className="text-4xl font-bold text-[#D4AF37]"
                  style={{ textShadow: '0 0 20px rgba(212,175,55,0.5)' }}
                >
                  POINT: {point}
                </div>
              )}
            </div>
            {/* ON/OFF Point Puck */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: point
                ? 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e0e0e0 40%, #b0b0b0 100%)'
                : 'radial-gradient(circle at 35% 35%, #444 0%, #222 40%, #111 100%)',
              boxShadow: point
                ? '0 4px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 15px rgba(255,255,255,0.2)'
                : '0 4px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(100,100,100,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '14px',
              color: point ? '#111' : '#666',
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: '1px',
              border: point ? '3px solid rgba(212,175,55,0.5)' : '3px solid rgba(80,80,80,0.5)',
              transition: 'all 0.4s ease',
            }}>
              {point ? 'ON' : 'OFF'}
            </div>
          </div>

          {/* 3D Craps Table with Rolling Dice */}
          <div 
            ref={tableRef}
            className="relative w-full max-w-md h-80 mb-6 rounded-2xl overflow-hidden wood-rail"
            style={{
              boxShadow: `
                0 20px 60px rgba(0,0,0,0.8),
                inset 0 0 0 12px transparent,
                0 0 0 3px rgba(212,175,55,0.6),
                0 0 20px rgba(212,175,55,0.15)
                ${winFlash ? ', 0 0 40px rgba(67,160,71,0.5), 0 0 80px rgba(67,160,71,0.3)' : ''}
                ${loseFlash ? ', 0 0 40px rgba(183,28,28,0.5)' : ''}
              `,
              perspective: '1000px',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            {/* Casino table decorations */}
            <div className="absolute top-2 left-2 z-[25] pointer-events-none select-none" style={{ opacity: 0.72, fontSize: 20, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🥃</div>
            <div className="absolute top-2 right-2 z-[25] pointer-events-none select-none" style={{ opacity: 0.68, fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🚬</div>
            <div className="absolute bottom-4 left-2 z-[25] pointer-events-none select-none" style={{ opacity: 0.68, fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🍸</div>
            <div className="absolute bottom-4 right-2 z-[25] pointer-events-none select-none" style={{ opacity: 0.65, fontSize: 16, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🍺</div>

            {/* Premium felt surface */}
            <div className="absolute inset-[12px] rounded-xl premium-felt" style={{
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
            }} />

            {/* Gold stitching inner border */}
            <div className="absolute pointer-events-none" style={{
              inset: '14px',
              border: '1.5px dashed rgba(212,175,55,0.35)',
              borderRadius: '10px',
              zIndex: 3,
            }} />

            {/* Padded rail top edge */}
            <div className="absolute top-0 left-0 right-0 h-[12px] pointer-events-none" style={{
              background: 'linear-gradient(180deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)',
              borderBottom: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -1px 3px rgba(0,0,0,0.3)',
              borderRadius: '16px 16px 0 0',
              zIndex: 20,
            }} />
            {/* Padded rail bottom edge */}
            <div className="absolute bottom-0 left-0 right-0 h-[12px] pointer-events-none" style={{
              background: 'linear-gradient(0deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)',
              borderTop: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 0 -2px 4px rgba(255,255,255,0.15), inset 0 1px 3px rgba(0,0,0,0.3)',
              borderRadius: '0 0 16px 16px',
              zIndex: 20,
            }} />
            {/* Padded rail left edge */}
            <div className="absolute top-[12px] bottom-[12px] left-0 w-[12px] pointer-events-none" style={{
              background: 'linear-gradient(90deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)',
              borderRight: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.15), inset -1px 0 3px rgba(0,0,0,0.3)',
              zIndex: 20,
            }} />
            {/* Padded rail right edge */}
            <div className="absolute top-[12px] bottom-[12px] right-0 w-[12px] pointer-events-none" style={{
              background: 'linear-gradient(270deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)',
              borderLeft: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset -2px 0 4px rgba(255,255,255,0.15), inset 1px 0 3px rgba(0,0,0,0.3)',
              zIndex: 20,
            }} />

            {/* Spotlight tracking animation that follows dice */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: '220px',
                height: '220px',
                left: `${spotlightPos.x}%`,
                top: `${spotlightPos.y}%`,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, rgba(255,255,220,${isRolling ? 0.18 : 0.1}) 0%, rgba(212,175,55,${isRolling ? 0.1 : 0.04}) 40%, transparent 70%)`,
                transition: isRolling ? 'left 0.05s linear, top 0.05s linear' : 'all 0.5s ease-out',
                zIndex: 2,
                filter: 'blur(2px)',
              }}
            />

            {/* Color-coded table markings */}
            <div className="absolute top-[16px] left-[16px] right-[16px] h-[24px] rounded-t-lg pointer-events-none" style={{
              background: 'rgba(46,125,50,0.3)',
              border: '1px solid rgba(67,160,71,0.4)',
              zIndex: 3,
            }}>
              <div className="text-center text-[#66BB6A] text-[10px] font-bold tracking-[3px] leading-[24px]">
                PASS LINE
              </div>
            </div>
            <div className="absolute bottom-[16px] left-[16px] right-[16px] h-[24px] rounded-b-lg pointer-events-none" style={{
              background: 'rgba(183,28,28,0.2)',
              border: '1px solid rgba(183,28,28,0.4)',
              zIndex: 3,
            }}>
              <div className="text-center text-[#EF5350] text-[10px] font-bold tracking-[3px] leading-[24px]">
                DON'T PASS BAR
              </div>
            </div>

            {/* 3D Dice */}
            <RealisticDice3D
              value={dice[0]}
              rotation={dice1Rotation}
              position={dice1Position}
              isRolling={isRolling}
              diceId={1}
              glowColor={winFlash ? 'rgba(67,160,71,0.6)' : loseFlash ? 'rgba(183,28,28,0.5)' : undefined}
            />
            <RealisticDice3D
              value={dice[1]}
              rotation={dice2Rotation}
              position={dice2Position}
              isRolling={isRolling}
              diceId={2}
              glowColor={winFlash ? 'rgba(67,160,71,0.6)' : loseFlash ? 'rgba(183,28,28,0.5)' : undefined}
            />

            {/* Dice total display */}
            <div 
              className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-black/60 border border-[#D4AF37]/30"
            >
              <div className="text-xs text-[#C0C0C0]">TOTAL</div>
              <div className="text-3xl font-bold text-[#D4AF37]">{diceTotal}</div>
            </div>
          </div>

          {/* Roll History */}
          <div className="mb-4">
            <div className="text-sm text-[#C0C0C0] mb-2 tracking-wider">RECENT ROLLS</div>
            <div className="flex gap-2">
              {rollHistory.map((roll, i) => (
                <div 
                  key={i} 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border ${
                    roll === 7 ? 'bg-[#B71C1C]/30 text-[#EF5350] border-[#B71C1C]/50' :
                    roll === point ? 'bg-[#43A047]/30 text-[#66BB6A] border-[#43A047]/50' :
                    'bg-black/50 text-[#C0C0C0] border-[#5D4037]/30'
                  }`}
                >
                  {roll}
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="mb-4 px-8 py-3 rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40 text-center font-bold">
              {message}
            </div>
          )}

          {/* Balance + Get More */}
          <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest font-bold uppercase">Balance</div>
              <div className="text-base font-bold text-[#D4AF37]">{formatChipLabel(balance)} $Pc</div>
            </div>
            {onAddBalance && (
              <button onClick={() => onAddBalance(10_000)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-green-400" style={{ border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)' }}>
                + Get $Pc
              </button>
            )}
          </div>
          {/* Chip Selection */}
          <div className="mb-4">
            <div className="text-center text-[#C0C0C0] text-xs mb-2 tracking-wider">SELECT CHIP</div>
            <ChipSelector
              selectedChip={selectedChip}
              onSelect={setSelectedChip}
              balance={balance}
              compact
            />
          </div>

          {/* Total Bet */}
          <div className="text-center mb-4">
            <span className="text-[#C0C0C0]">Total Bet: </span>
            <span className="text-[#D4AF37] font-bold text-xl">{totalBet} $Pc</span>
          </div>

          {/* Roll Button */}
          <div className="flex gap-4">
            <Button
              onClick={rollDice}
              disabled={isRolling || bets.length === 0}
              className="btn-primary px-12 py-6 text-xl font-bold"
            >
              {isRolling ? 'ROLLING...' : 'ROLL DICE'}
            </Button>
            <Button
              onClick={clearBets}
              disabled={isRolling || bets.length === 0}
              variant="outline"
              className="border-[#B71C1C]/50 text-[#B71C1C] hover:bg-[#B71C1C]/20"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Right Side - Betting Table */}
        <div className="flex-1 p-6 border-l border-[#5D4037]/30 overflow-y-auto" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(13,51,18,0.3) 50%, rgba(0,0,0,0.7) 100%)',
        }}>
          <div className="max-w-lg mx-auto">
            {/* Pass/Don't Pass */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => placeBet('pass', 1)}
                disabled={gamePhase === 'point'}
                className="relative p-4 rounded-xl bg-[#1B5E20]/50 border-2 border-[#43A047]/50 hover:bg-[#1B5E20]/70 transition-all disabled:opacity-50"
              >
                <div className="font-bold text-lg text-[#D4AF37]">PASS LINE</div>
                <div className="text-xs text-[#C0C0C0]">Win on 7/11</div>
                {getBetChips('pass').length > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <ChipStack amount={getBetChips('pass')[0]?.amount || 10} count={getBetChips('pass')[0]?.count || 1} size="sm" />
                  </div>
                )}
                {getBetAmount('pass') > 0 && (
                  <div className="mt-1 text-[#D4AF37] font-bold">{getBetAmount('pass')} $Pc</div>
                )}
              </button>
              <button
                onClick={() => placeBet('dontpass', 1)}
                disabled={gamePhase === 'point'}
                className="relative p-4 rounded-xl bg-[#B71C1C]/30 border-2 border-[#B71C1C]/50 hover:bg-[#B71C1C]/50 transition-all disabled:opacity-50"
              >
                <div className="font-bold text-lg text-[#D4AF37]">DON'T PASS</div>
                <div className="text-xs text-[#C0C0C0]">Win on 2/3</div>
                {getBetChips('dontpass').length > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <ChipStack amount={getBetChips('dontpass')[0]?.amount || 10} count={getBetChips('dontpass')[0]?.count || 1} size="sm" />
                  </div>
                )}
                {getBetAmount('dontpass') > 0 && (
                  <div className="mt-1 text-[#D4AF37] font-bold">{getBetAmount('dontpass')} $Pc</div>
                )}
              </button>
            </div>

            {/* Field Bet */}
            <button
              onClick={() => placeBet('field', 1)}
              className="w-full relative p-4 rounded-xl bg-[#1E88E5]/30 border-2 border-[#1E88E5]/50 hover:bg-[#1E88E5]/50 transition-all mb-4"
            >
              <div className="font-bold text-lg text-[#D4AF37]">FIELD</div>
              <div className="text-xs text-[#C0C0C0]">2,3,4,9,10,11,12 (2=2x, 12=3x)</div>
              {getBetChips('field').length > 0 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <ChipStack amount={getBetChips('field')[0]?.amount || 10} count={getBetChips('field')[0]?.count || 1} size="sm" />
                </div>
              )}
              {getBetAmount('field') > 0 && (
                <div className="mt-1 text-[#D4AF37] font-bold">{getBetAmount('field')} $Pc</div>
              )}
            </button>

            {/* Place Bets */}
            <div className="text-sm text-[#C0C0C0] mb-2 tracking-wider">PLACE BETS</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { num: 4, payout: 1.8 },
                { num: 5, payout: 1.4 },
                { num: 6, payout: 1.17 },
                { num: 8, payout: 1.17 },
                { num: 9, payout: 1.4 },
                { num: 10, payout: 1.8 },
              ].map(({ num, payout }) => (
                <button
                  key={num}
                  onClick={() => placeBet(`place${num}`, payout)}
                  className="relative p-3 rounded-xl bg-[#5D4037]/50 border border-[#D4AF37]/30 hover:bg-[#5D4037]/70 transition-all"
                >
                  <div className="font-bold text-[#D4AF37]">{num}</div>
                  <div className="text-xs text-[#C0C0C0]">{payout}:1</div>
                  {getBetChips(`place${num}`).length > 0 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <ChipStack amount={getBetChips(`place${num}`)[0]?.amount || 10} count={1} size="sm" />
                    </div>
                  )}
                  {getBetAmount(`place${num}`) > 0 && (
                    <div className="text-[#D4AF37] text-sm font-bold">{getBetAmount(`place${num}`)}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Hardways */}
            <div className="text-sm text-[#C0C0C0] mb-2 tracking-wider">HARDWAYS</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { num: 4, payout: 7 },
                { num: 6, payout: 9 },
                { num: 8, payout: 9 },
                { num: 10, payout: 7 },
              ].map(({ num, payout }) => (
                <button
                  key={num}
                  onClick={() => placeBet(`hard${num}`, payout)}
                  className="relative p-3 rounded-xl bg-[#8B4513]/50 border border-[#D4AF37]/30 hover:bg-[#8B4513]/70 transition-all"
                >
                  <div className="font-bold text-[#D4AF37]">HARD {num}</div>
                  <div className="text-xs text-[#C0C0C0]">{payout}:1</div>
                  {getBetChips(`hard${num}`).length > 0 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <ChipStack amount={getBetChips(`hard${num}`)[0]?.amount || 10} count={1} size="sm" />
                    </div>
                  )}
                  {getBetAmount(`hard${num}`) > 0 && (
                    <div className="text-[#D4AF37] text-sm font-bold">{getBetAmount(`hard${num}`)}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Proposition Bets */}
            <div className="text-sm text-[#C0C0C0] mb-2 tracking-wider">ONE ROLL BETS</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeBet('any7', 4)}
                className="relative p-3 rounded-xl bg-[#FF6F00]/30 border border-[#FF6F00]/50 hover:bg-[#FF6F00]/50 transition-all"
              >
                <div className="font-bold text-[#D4AF37]">ANY 7</div>
                <div className="text-xs text-[#C0C0C0]">4:1</div>
                {getBetChips('any7').length > 0 && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <ChipStack amount={getBetChips('any7')[0]?.amount || 10} count={1} size="sm" />
                  </div>
                )}
                {getBetAmount('any7') > 0 && (
                  <div className="text-[#D4AF37] font-bold">{getBetAmount('any7')} $Pc</div>
                )}
              </button>
              <button
                onClick={() => placeBet('anycraps', 7)}
                className="relative p-3 rounded-xl bg-[#C2185B]/30 border border-[#C2185B]/50 hover:bg-[#C2185B]/50 transition-all"
              >
                <div className="font-bold text-[#D4AF37]">ANY CRAPS</div>
                <div className="text-xs text-[#C0C0C0]">7:1</div>
                {getBetChips('anycraps').length > 0 && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <ChipStack amount={getBetChips('anycraps')[0]?.amount || 10} count={1} size="sm" />
                  </div>
                )}
                {getBetAmount('anycraps') > 0 && (
                  <div className="text-[#D4AF37] font-bold">{getBetAmount('anycraps')} $Pc</div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold">
              Craps Rules
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Objective</h3>
              <p className="text-gray-300">{crapsRules.objective}</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Game Phases</h3>
              <ul className="space-y-1 text-gray-300">
                {crapsRules.phases.map((phase, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {phase}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Pass Line Bet</h3>
              <ul className="space-y-1 text-gray-300">
                {crapsRules.passLine.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Don't Pass Bet</h3>
              <ul className="space-y-1 text-gray-300">
                {crapsRules.dontPass.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Place Bets</h3>
              <ul className="space-y-1 text-gray-300">
                {crapsRules.placeBets.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Hardways</h3>
              <ul className="space-y-1 text-gray-300">
                {crapsRules.hardways.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </CasinoEnvironment>
  );
}
