import { useState, useRef, useEffect } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { useTableSkin } from '@/hooks/useTableSkin';
import { PremiumFeltOverlay } from '@/components/PremiumFeltOverlay';
import { useCrapsDiceSkin } from '@/hooks/useCrapsDiceSkin';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PokerChip, ChipStack, ChipSelector, DealerVegasProps, formatChipLabel } from '@/components/PokerChip';
import { PcTokenLabel } from '@/components/PcTokenLabel';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { CasinoEnvironment } from './CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';
import { useCasinoBots } from '@/hooks/useCasinoBots';

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
  skinFaceBg?: string;
  skinPipBg?: string;
  skinPipStroke?: string;
  skinBorder?: string;
}

function RealisticDice3D({ value, rotation, position, isRolling, glowColor, skinFaceBg, skinPipBg, skinPipStroke, skinBorder }: RealisticDice3DProps) {
  const faceBg = skinFaceBg || `linear-gradient(145deg, #ffffff 0%, #f0f0f0 40%, #e0e0e0 100%)`;
  const pipBg = skinPipBg || `radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)`;
  const pipShadow = skinPipStroke || 'none';
  const borderStyle = `1px solid ${skinBorder || 'rgba(0,0,0,0.08)'}`;

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
            background: faceBg,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: borderStyle,
            transform: `translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
        </div>

        {/* Face 6 - Back */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: faceBg,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: borderStyle,
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
                background: pipBg,
                boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
              }}
            />
          ))}
        </div>

        {/* Face 2 - Right */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: faceBg,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: borderStyle,
            transform: `rotateY(90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-3 left-3 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute bottom-3 right-3 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
        </div>

        {/* Face 5 - Left */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: faceBg,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: borderStyle,
            transform: `rotateY(-90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
        </div>

        {/* Face 3 - Top */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: faceBg,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: borderStyle,
            transform: `rotateX(90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
        </div>

        {/* Face 4 - Bottom */}
        <div
          className="absolute w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: faceBg,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.1), 
              inset 0 3px 8px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.15)
            `,
            border: borderStyle,
            transform: `rotateX(-90deg) translateZ(${HALF}px)`,
            backfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
            }}
          />
          <div 
            className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full"
            style={{
              background: pipBg,
              boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.5)${pipShadow !== 'none' ? ', ' + pipShadow : ''}`,
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

export function CrapsGame({ balance, onBack, onBet, onWin, onAddBalance }: CrapsGameProps & { onShowWallet?: () => void }) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { activeSkin: diceSkin } = useCrapsDiceSkin();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const { activeBots, onlinePlayerCount, chatMessages, triggerGameEvent } = useCasinoBots({ gameName: 'Craps', minBots: 4, maxBots: 10, statusMessages: ['Betting', 'Watching', 'Rolling', 'At table'] });
  const [gamePhase, setGamePhase] = useState<'comeout' | 'point'>('comeout');
  const [point, setPoint] = useState<number | null>(null);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedChip, setSelectedChip] = useState(() => {
    const standards = [500, 100, 50, 25, 10, 5, 1];
    return standards.find(c => c <= balance) || 1;
  });
  const accent = diceSkin.accentColor;
  const accentRgb = diceSkin.accentColorRgb;
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
      triggerWinBurst();
      addReaction('money-bag', 'you');
      setMessage(prev => `${prev} You won ${totalWin} $Pc!`);
      setWinFlash(true);
      setWinText(`+${totalWin} $Pc`);
      setTimeout(() => { setWinFlash(false); setWinText(''); }, 2000);
      triggerGameEvent('win');
    } else if (total === 7 && gamePhase === 'point') {
      setLoseFlash(true);
      setTimeout(() => setLoseFlash(false), 1500);
      triggerGameEvent('lose');
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

  const VIP_COLORS: Record<string, string> = { gold: '#D4AF37', silver: '#9E9E9E', bronze: '#8D6E63' };

  const feltZoneStyle = (bg: string, borderColor: string, hasBet: boolean): React.CSSProperties => ({
    background: bg,
    border: `2px solid ${borderColor}`,
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: hasBet ? `inset 0 0 20px rgba(212,175,55,0.25), 0 0 8px rgba(212,175,55,0.15)` : 'inset 0 0 12px rgba(0,0,0,0.3)',
  });

  const renderZoneChip = (betType: string) => {
    const chips = getBetChips(betType);
    const amount = getBetAmount(betType);
    if (chips.length === 0 || amount === 0) return null;
    return (
      <div className="absolute z-20" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
        <ChipStack amount={chips[0]?.amount || 10} count={Math.min(chips[0]?.count || 1, 4)} size="sm" />
        <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', textAlign: 'center', marginTop: 1, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          <PcTokenLabel amount={amount} size={9} />
        </div>
      </div>
    );
  };

  const tablePlayerPositions: React.CSSProperties[] = [
    { top: '-52px', left: '8%' },
    { top: '-52px', left: '28%' },
    { top: '-52px', right: '28%' },
    { top: '-52px', right: '8%' },
    { bottom: '-52px', left: '15%' },
    { bottom: '-52px', right: '15%' },
  ];

  return (
    <CasinoEnvironment gameType="craps">
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ you: 'bottom' }}
      />
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0a0a0a 50%, #000000 100%)' }}
    >
      <InGameTopBar
        gameName="Craps"
        balance={balance}
        onBack={onBack}
        onAddBalance={onAddBalance}
        showShare
        rightSlot={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
          </div>
        }
      />

      {winFlash && (
        <div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(67,160,71,0.3) 0%, transparent 70%)', animation: 'craps-win-flash 2s ease-out forwards' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl font-bold font-casino text-[#D4AF37] animate-bounce" style={{ textShadow: '0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4)' }}>{winText}</div>
          </div>
        </div>
      )}
      {loseFlash && (
        <div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${accentRgb},0.3) 0%, transparent 70%)`, animation: 'craps-lose-flash 1.5s ease-out forwards' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold font-casino" style={{ color: accent, textShadow: `0 0 20px rgba(${accentRgb},0.8)`, animation: 'craps-shake 0.5s ease-out' }}>SEVEN OUT!</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 py-4 sm:px-6">

          <div className="flex items-center justify-center gap-5 mb-4">
            <div className="text-center">
              <div className="text-xs text-[#C0C0C0] tracking-[3px] font-bold">{gamePhase === 'comeout' ? 'COME OUT ROLL' : 'POINT PHASE'}</div>
              {point && <div className="text-2xl font-bold text-[#D4AF37] mt-1" style={{ textShadow: '0 0 15px rgba(212,175,55,0.5)' }}>POINT: {point}</div>}
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: point ? 'radial-gradient(circle at 35% 35%, #fff 0%, #e0e0e0 40%, #b0b0b0 100%)' : 'radial-gradient(circle at 35% 35%, #444 0%, #222 40%, #111 100%)',
              boxShadow: point ? '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.2)' : '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(100,100,100,0.3)',
              border: point ? '3px solid rgba(212,175,55,0.5)' : '3px solid rgba(80,80,80,0.5)',
              fontWeight: 900, fontSize: 12, color: point ? '#111' : '#666', fontFamily: "'Orbitron', sans-serif", letterSpacing: 1, transition: 'all 0.4s',
            }}>{point ? 'ON' : 'OFF'}</div>
            {message && (
              <div className="px-5 py-2 rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold max-w-xs text-center">{message}</div>
            )}
          </div>

          <div className="relative" style={{ marginTop: 56, marginBottom: 56 }}>

            {activeBots.slice(0, 6).map((bot, i) => {
              const pos = tablePlayerPositions[i] || tablePlayerPositions[0];
              const vipColor = VIP_COLORS[bot.vipTier] || '#8D6E63';
              return (
                <div key={bot.id} className="absolute z-30 flex flex-col items-center gap-0.5" style={pos}>
                  <div className="relative">
                    <img src={bot.photoUrl} alt={bot.name} className="rounded-full object-cover"
                      style={{ width: 36, height: 36, border: `2.5px solid ${vipColor}`, boxShadow: `0 0 8px ${vipColor}40, 0 4px 12px rgba(0,0,0,0.6)` }} />
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%',
                      background: vipColor, border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 6, fontWeight: 900, color: '#000',
                    }}>{bot.vipTier === 'gold' ? '★' : bot.vipTier === 'silver' ? 'S' : 'B'}</div>
                    {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
                      <span className="absolute -top-3 -right-2" style={{ fontSize: 14, animation: 'reactionPop 0.3s ease-out', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{bot.lastReactionEmoji}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 8, color: '#d1d5db', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>{bot.name}</span>
                  {bot.currentBet > 0 && (
                    <span style={{ fontSize: 7, fontWeight: 700, color: '#D4AF37', background: 'rgba(212,175,55,0.12)', padding: '1px 4px', borderRadius: 3 }}>
                      {bot.currentBet >= 1000000 ? `${(bot.currentBet/1000000).toFixed(1)}M` : bot.currentBet >= 1000 ? `${(bot.currentBet/1000).toFixed(0)}K` : bot.currentBet}
                    </span>
                  )}
                </div>
              );
            })}

            <div
              ref={tableRef}
              className="relative rounded-2xl overflow-hidden"
              style={{
                boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 3px rgba(212,175,55,0.6), 0 0 20px rgba(212,175,55,0.15)${winFlash ? ', 0 0 40px rgba(67,160,71,0.5)' : ''}${loseFlash ? `, 0 0 40px rgba(${accentRgb},0.5)` : ''}`,
                transition: 'box-shadow 0.3s',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[14px] pointer-events-none" style={{ background: 'linear-gradient(180deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)', borderBottom: '1px solid rgba(212,175,55,0.4)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -1px 3px rgba(0,0,0,0.3)', borderRadius: '16px 16px 0 0', zIndex: 20 }} />
              <div className="absolute bottom-0 left-0 right-0 h-[14px] pointer-events-none" style={{ background: 'linear-gradient(0deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)', borderTop: '1px solid rgba(212,175,55,0.4)', boxShadow: 'inset 0 -2px 4px rgba(255,255,255,0.15), inset 0 1px 3px rgba(0,0,0,0.3)', borderRadius: '0 0 16px 16px', zIndex: 20 }} />
              <div className="absolute top-[14px] bottom-[14px] left-0 w-[14px] pointer-events-none" style={{ background: 'linear-gradient(90deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)', borderRight: '1px solid rgba(212,175,55,0.4)', boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.15), inset -1px 0 3px rgba(0,0,0,0.3)', zIndex: 20 }} />
              <div className="absolute top-[14px] bottom-[14px] right-0 w-[14px] pointer-events-none" style={{ background: 'linear-gradient(270deg, #6D4C2E 0%, #5D4037 50%, #4E342E 100%)', borderLeft: '1px solid rgba(212,175,55,0.4)', boxShadow: 'inset -2px 0 4px rgba(255,255,255,0.15), inset 1px 0 3px rgba(0,0,0,0.3)', zIndex: 20 }} />

              <div className="absolute pointer-events-none" style={{ inset: '16px', border: '1.5px dashed rgba(212,175,55,0.3)', borderRadius: '10px', zIndex: 15 }} />

              <div style={{ background: tableSkin.felt, padding: '14px' }}>
                <PremiumFeltOverlay borderRadius="12px" goldBorderInset={4} showGoldBorder={false} />
                <TableBrand style={{ opacity: 0.07 }} />

                <div className="relative z-10" style={{ padding: '6px' }}>

                  <button
                    onClick={() => placeBet('dontpass', 1)}
                    disabled={gamePhase === 'point'}
                    className="w-full rounded-t-xl disabled:opacity-50"
                    style={feltZoneStyle(`rgba(${accentRgb},0.18)`, `rgba(${accentRgb},0.45)`, getBetAmount('dontpass') > 0)}
                    onMouseEnter={(e) => { if (gamePhase !== 'point') e.currentTarget.style.background = `rgba(${accentRgb},0.3)`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `rgba(${accentRgb},0.18)`; }}
                  >
                    <div style={{ padding: '8px 12px', textAlign: 'center', minHeight: 42 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: 4, textTransform: 'uppercase' }}>DON'T PASS BAR</div>
                      <div style={{ fontSize: 8, color: '#bbb', marginTop: 1 }}>Wins on 2 or 3 · 12 is a push</div>
                    </div>
                    {renderZoneChip('dontpass')}
                  </button>

                  <div className="grid grid-cols-7 gap-0 mt-px">
                    <div
                      className="col-span-1 row-span-2"
                      style={{ ...feltZoneStyle('rgba(30,136,229,0.15)', 'rgba(30,136,229,0.35)', false), minHeight: 90, borderRadius: '0 0 0 8px', cursor: 'default', opacity: 0.7 }}
                    >
                      <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', padding: '6px 0' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#64B5F6', letterSpacing: 2 }}>COME</div>
                      </div>
                    </div>

                    {[
                      { num: 4, payout: 1.8, label: '9:5' },
                      { num: 5, payout: 1.4, label: '7:5' },
                      { num: 6, payout: 1.17, label: '7:6' },
                      { num: 8, payout: 1.17, label: '7:6' },
                      { num: 9, payout: 1.4, label: '7:5' },
                      { num: 10, payout: 1.8, label: '9:5' },
                    ].map(({ num, payout, label }) => (
                      <button
                        key={num}
                        onClick={() => placeBet(`place${num}`, payout)}
                        className="col-span-1"
                        style={feltZoneStyle('rgba(93,64,55,0.3)', 'rgba(212,175,55,0.3)', getBetAmount(`place${num}`) > 0)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(93,64,55,0.5)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(93,64,55,0.3)'; }}
                      >
                        <div style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <div style={{ fontSize: num === 6 || num === 9 ? 10 : 18, fontWeight: 900, color: '#D4AF37', fontFamily: "'Cinzel', serif" }}>
                            {num === 6 ? 'SIX' : num === 9 ? 'NINE' : num}
                          </div>
                          <div style={{ fontSize: 7, color: '#aaa', fontWeight: 600 }}>{label}</div>
                          {point === num && (
                            <div style={{
                              width: 16, height: 16, borderRadius: '50%', margin: '3px auto 0',
                              background: 'radial-gradient(circle at 35% 35%, #fff, #ccc)', border: '2px solid rgba(212,175,55,0.6)',
                              fontSize: 6, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111',
                            }}>ON</div>
                          )}
                        </div>
                        {renderZoneChip(`place${num}`)}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => placeBet('field', 1)}
                    className="w-full mt-px"
                    style={feltZoneStyle('rgba(30,136,229,0.12)', 'rgba(30,136,229,0.35)', getBetAmount('field') > 0)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,136,229,0.22)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,136,229,0.12)'; }}
                  >
                    <div style={{ padding: '6px 12px', textAlign: 'center', minHeight: 36 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64B5F6', letterSpacing: 3 }}>FIELD</span>
                        <span style={{ fontSize: 9, color: '#aaa' }}>2 · 3 · 4 · 9 · 10 · 11 · 12</span>
                      </div>
                      <div style={{ fontSize: 7, color: '#888', marginTop: 1 }}>2 pays double · 12 pays triple</div>
                    </div>
                    {renderZoneChip('field')}
                  </button>

                  <div className="grid grid-cols-6 gap-0 mt-px">
                    {[
                      { num: 4, payout: 7, dice: '2-2' },
                      { num: 6, payout: 9, dice: '3-3' },
                      { num: 8, payout: 9, dice: '4-4' },
                      { num: 10, payout: 7, dice: '5-5' },
                    ].map(({ num, payout, dice }) => (
                      <button
                        key={num}
                        onClick={() => placeBet(`hard${num}`, payout)}
                        className="col-span-1"
                        style={feltZoneStyle('rgba(139,69,19,0.25)', 'rgba(212,175,55,0.25)', getBetAmount(`hard${num}`) > 0)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,69,19,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,69,19,0.25)'; }}
                      >
                        <div style={{ padding: '5px 2px', textAlign: 'center' }}>
                          <div style={{ fontSize: 8, fontWeight: 800, color: '#D4AF37', letterSpacing: 1 }}>HARD {num}</div>
                          <div style={{ fontSize: 7, color: '#999' }}>{dice}</div>
                          <div style={{ fontSize: 7, color: '#aaa', fontWeight: 700 }}>{payout}:1</div>
                        </div>
                        {renderZoneChip(`hard${num}`)}
                      </button>
                    ))}

                    <button
                      onClick={() => placeBet('any7', 4)}
                      className="col-span-1"
                      style={feltZoneStyle('rgba(255,111,0,0.2)', 'rgba(255,111,0,0.4)', getBetAmount('any7') > 0)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,111,0,0.35)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,111,0,0.2)'; }}
                    >
                      <div style={{ padding: '5px 2px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#FFB74D', letterSpacing: 1 }}>ANY 7</div>
                        <div style={{ fontSize: 8, color: '#aaa', fontWeight: 700 }}>4:1</div>
                      </div>
                      {renderZoneChip('any7')}
                    </button>

                    <button
                      onClick={() => placeBet('anycraps', 7)}
                      className="col-span-1"
                      style={feltZoneStyle(`rgba(${accentRgb},0.18)`, `rgba(${accentRgb},0.4)`, getBetAmount('anycraps') > 0)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `rgba(${accentRgb},0.3)`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = `rgba(${accentRgb},0.18)`; }}
                    >
                      <div style={{ padding: '5px 2px', textAlign: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 800, color: accent, letterSpacing: 0.5 }}>ANY CRAPS</div>
                        <div style={{ fontSize: 7, color: '#999' }}>2,3,12</div>
                        <div style={{ fontSize: 8, color: '#aaa', fontWeight: 700 }}>7:1</div>
                      </div>
                      {renderZoneChip('anycraps')}
                    </button>
                  </div>

                  <div className="relative mt-px rounded-b-lg overflow-hidden" style={{
                    background: 'rgba(20,60,20,0.25)',
                    border: '2px solid rgba(67,160,71,0.35)',
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        width: '220px', height: '220px',
                        left: `${spotlightPos.x}%`, top: `${spotlightPos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        background: `radial-gradient(circle, rgba(255,255,220,${isRolling ? 0.18 : 0.08}) 0%, rgba(212,175,55,${isRolling ? 0.1 : 0.03}) 40%, transparent 70%)`,
                        transition: isRolling ? 'left 0.05s linear, top 0.05s linear' : 'all 0.5s ease-out',
                        zIndex: 2, filter: 'blur(2px)',
                      }}
                    />

                    <button
                      onClick={() => placeBet('pass', 1)}
                      disabled={gamePhase === 'point'}
                      className="absolute inset-0 z-[1] disabled:cursor-default"
                      style={{ background: 'transparent', border: 'none', cursor: gamePhase === 'point' ? 'default' : 'pointer' }}
                      onMouseEnter={(e) => { if (gamePhase !== 'point') e.currentTarget.parentElement!.style.background = 'rgba(20,60,20,0.4)'; }}
                      onMouseLeave={(e) => { e.currentTarget.parentElement!.style.background = 'rgba(20,60,20,0.25)'; }}
                    />

                    <div className="absolute top-2 left-0 right-0 text-center pointer-events-none z-[3]">
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#66BB6A', letterSpacing: 6, textTransform: 'uppercase' }}>
                        P A S S &nbsp; L I N E
                      </span>
                      <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>Win on 7 or 11 · Lose on 2, 3, or 12 · Pays 1:1</div>
                    </div>

                    {getBetAmount('pass') > 0 && (
                      <div className="absolute z-20 pointer-events-none" style={{ bottom: 8, left: 24 }}>
                        <ChipStack amount={getBetChips('pass')[0]?.amount || 10} count={Math.min(getBetChips('pass')[0]?.count || 1, 4)} size="sm" />
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', textAlign: 'center', marginTop: 1, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                          <PcTokenLabel amount={getBetAmount('pass')} size={9} />
                        </div>
                      </div>
                    )}

                    <div className="relative z-[5]" style={{ pointerEvents: 'none' }}>
                      <RealisticDice3D
                        value={dice[0]}
                        rotation={dice1Rotation}
                        position={dice1Position}
                        isRolling={isRolling}
                        diceId={1}
                        glowColor={winFlash ? 'rgba(67,160,71,0.6)' : loseFlash ? `rgba(${accentRgb},0.5)` : undefined}
                        skinFaceBg={`linear-gradient(145deg, ${diceSkin.faceGradientStart} 0%, ${diceSkin.faceGradientMid} 40%, ${diceSkin.faceGradientEnd} 100%)`}
                        skinPipBg={diceSkin.pipGradient}
                        skinPipStroke={diceSkin.pipStroke}
                        skinBorder={diceSkin.borderColor}
                      />
                      <RealisticDice3D
                        value={dice[1]}
                        rotation={dice2Rotation}
                        position={dice2Position}
                        isRolling={isRolling}
                        diceId={2}
                        glowColor={winFlash ? 'rgba(67,160,71,0.6)' : loseFlash ? `rgba(${accentRgb},0.5)` : undefined}
                        skinFaceBg={`linear-gradient(145deg, ${diceSkin.faceGradientStart} 0%, ${diceSkin.faceGradientMid} 40%, ${diceSkin.faceGradientEnd} 100%)`}
                        skinPipBg={diceSkin.pipGradient}
                        skinPipStroke={diceSkin.pipStroke}
                        skinBorder={diceSkin.borderColor}
                      />
                    </div>

                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 border border-[#D4AF37]/30 z-10 pointer-events-none">
                      <div className="text-[9px] text-[#C0C0C0]">TOTAL</div>
                      <div className="text-2xl font-bold text-[#D4AF37]">{diceTotal}</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 mb-3 flex-wrap">
            <div className="text-[10px] text-[#C0C0C0] tracking-[2px] font-bold">RECENT ROLLS</div>
            <div className="flex gap-1.5">
              {rollHistory.map((roll, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold border"
                  style={roll === 7 ? { background: `rgba(${accentRgb},0.3)`, color: accent, borderColor: `rgba(${accentRgb},0.5)` }
                    : roll === point ? { background: 'rgba(67,160,71,0.3)', color: '#66BB6A', borderColor: 'rgba(67,160,71,0.5)' }
                    : { background: 'rgba(0,0,0,0.5)', color: '#C0C0C0', borderColor: 'rgba(93,64,55,0.3)' }}
                >{roll}</div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div>
                <div className="text-[8px] text-gray-600 tracking-widest font-bold uppercase">Balance</div>
                <div className="text-sm font-bold"><PcTokenLabel amount={formatChipLabel(balance)} size={14} /></div>
              </div>
              <div style={{ width: 1, height: 20, background: 'rgba(212,175,55,0.15)' }} />
              <div>
                <div className="text-[8px] text-gray-600 tracking-widest font-bold uppercase">Total Bet</div>
                <div className="text-sm font-bold"><PcTokenLabel amount={totalBet} size={14} /></div>
              </div>
              {onAddBalance && (
                <>
                  <div style={{ width: 1, height: 20, background: 'rgba(212,175,55,0.15)' }} />
                  <button onClick={() => onAddBalance(10_000)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-green-400" style={{ border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)' }}>+ Get $Pc</button>
                </>
              )}
            </div>

            <div className="flex-1 flex justify-center">
              <ChipSelector selectedChip={selectedChip} onSelect={setSelectedChip} balance={balance} compact />
            </div>
          </div>

          <div className="flex gap-3 max-w-lg mx-auto">
            <Button onClick={rollDice} disabled={isRolling || bets.length === 0} className="btn-primary flex-1 py-4 text-lg font-bold min-h-[50px]">
              {isRolling ? 'ROLLING...' : 'ROLL DICE'}
            </Button>
            <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
            <Button onClick={clearBets} disabled={isRolling || bets.length === 0} variant="outline" className="min-h-[50px] px-3"
              style={{ borderColor: `rgba(${accentRgb},0.5)`, color: accent }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `rgba(${accentRgb},0.2)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
              <RotateCcw className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 mb-2">
            <div className="flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlinePlayerCount} players online</span>
            </div>
            <DealerVegasProps />
          </div>

        </div>
      </div>

      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold">Craps Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Objective</h3>
              <p className="text-gray-300">{crapsRules.objective}</p>
            </div>
            {[
              { title: 'Game Phases', items: crapsRules.phases },
              { title: 'Pass Line Bet', items: crapsRules.passLine },
              { title: "Don't Pass Bet", items: crapsRules.dontPass },
              { title: 'Place Bets', items: crapsRules.placeBets },
              { title: 'Hardways', items: crapsRules.hardways },
              { title: 'Proposition Bets', items: crapsRules.proposition },
            ].map(({ title, items }) => (
              <div key={title}>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">{title}</h3>
                <ul className="space-y-1 text-gray-300">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-[#D4AF37]">•</span>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </CasinoEnvironment>
  );
}
