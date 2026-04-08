import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useTableSkin } from '@/hooks/useTableSkin';
import { useRouletteSkin } from '@/hooks/useRouletteSkin';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { Info, Settings, Undo2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PokerChip, ChipFace, ChipSelector, DealerVegasProps, formatChipLabel } from '@/components/PokerChip';
import { PcTokenLabel } from '@/components/PcTokenLabel';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useRouletteVoice } from '@/hooks/useGameVoice';
import RouletteWheel3D from '@/components/games/RouletteWheel3D';
import { InGameTopBar } from '@/components/InGameTopBar';
import { useProvablyFair } from '@/hooks/useProvablyFair';
import { VerifyRoundModal } from '@/components/VerifyRoundModal';

interface RouletteGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onOpenProvablyFair?: (prefill?: { serverSeed?: string; clientSeed?: string; nonce?: number }) => void;
}

interface PlacedBet {
  type: string;
  numbers: number[];
  amount: number;
  payout: number;
}

interface BetHistoryEntry {
  type: string;
  numbers: number[];
  amount: number;
  payout: number;
}

interface ResultOverlay {
  type: 'win' | 'loss';
  amount: number;
  number: number;
}

const CHIP_VALUES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];

const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const isRed = (num: number) => RED_NUMBERS.includes(num);

const IDLE_SPEED = 5;

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

function BetChipStack({ amount, chipCount }: { amount: number; chipCount: number }) {
  const stackCount = Math.min(chipCount || 1, 4);
  const CHIP_SIZE = 24;

  return (
    <div className="absolute -top-4 left-1/2 z-10 pointer-events-none" style={{ transform: 'translateX(-50%)', animation: 'rouletteChipDrop 0.3s ease-out forwards' }}>
      {Array.from({ length: stackCount }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: `${-i * 4}px`,
            left: `${i * 0.5}px`,
            zIndex: stackCount - i,
            opacity: i === 0 ? 1 : 0.85,
          }}
        >
          <ChipFace amount={amount} size={CHIP_SIZE} />
        </div>
      ))}
    </div>
  );
}

function ResultOverlayDisplay({ result, onDismiss }: { result: ResultOverlay; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isWin = result.type === 'win';
  const numberColor = result.number === 0 ? '#15803d' : isRed(result.number) ? '#dc2626' : '#aaa';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: isWin
          ? 'radial-gradient(ellipse at center, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0.85) 70%)'
          : 'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, rgba(0,0,0,0.85) 70%)',
        animation: 'resultOverlayIn 0.5s ease-out forwards',
      }}
      onClick={onDismiss}
    >
      <div className="text-center" style={{ animation: 'resultContentIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <div
          className="text-6xl font-bold mb-3"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: isWin ? '#43A047' : '#dc2626',
            textShadow: `0 0 40px ${isWin ? 'rgba(67,160,71,0.6)' : 'rgba(220,38,38,0.6)'}, 0 0 80px ${isWin ? 'rgba(67,160,71,0.3)' : 'rgba(220,38,38,0.3)'}`,
            letterSpacing: '0.05em',
          }}
        >
          {isWin ? 'YOU WIN!' : 'YOU LOST!'}
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
            style={{
              background: result.number === 0
                ? 'linear-gradient(145deg, #1fa34a, #15803d)'
                : isRed(result.number)
                  ? 'linear-gradient(145deg, #e53935, #b71c1c)'
                  : 'linear-gradient(145deg, #2a2a2a, #111)',
              border: '2px solid rgba(212,175,55,0.6)',
              color: '#fff',
              boxShadow: `0 0 20px ${numberColor}44`,
            }}
          >
            {result.number}
          </div>
          <div style={{ color: numberColor }} className="text-sm font-bold uppercase tracking-wider">
            {result.number === 0 ? 'GREEN' : isRed(result.number) ? 'RED' : 'BLACK'}
          </div>
        </div>

        <div
          className="text-4xl font-bold"
          style={{
            color: isWin ? '#D4AF37' : '#666',
            textShadow: isWin ? '0 0 20px rgba(212,175,55,0.4)' : 'none',
          }}
        >
          {isWin ? `+${result.amount.toLocaleString()}` : `-${result.amount.toLocaleString()}`} $Pc
        </div>

        <div className="text-xs text-gray-500 mt-4 tracking-wider">TAP TO CONTINUE</div>
      </div>
    </div>
  );
}

export function RouletteGame({ balance, onBack, onBet, onWin, onAddBalance, onOpenProvablyFair }: RouletteGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { activeSkin: rouletteSkin } = useRouletteSkin();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const [selectedChip, setSelectedChip] = useState(1_000_000);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [betHistory, setBetHistory] = useState<BetHistoryEntry[]>([]);
  const [lastBets, setLastBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(IDLE_SPEED);
  const [ballDropped, setBallDropped] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('Place your bets!');
  const [useLaPartage, setUseLaPartage] = useState(true);
  const [history, setHistory] = useState<number[]>([]);
  const [resultOverlay, setResultOverlay] = useState<ResultOverlay | null>(null);
  const [lastWin, setLastWin] = useState(0);

  const pendingSpinRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const winningNumRef = useRef<number>(0);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const placedBetsRef = useRef<PlacedBet[]>([]);
  placedBetsRef.current = placedBets;

  const { round, lastReveal, startRound, resolveRound, revealRound } = useProvablyFair('roulette');
  const [showVerify, setShowVerify] = useState(false);
  const currentRoundIdRef = useRef<number | null>(null);
  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { announceBetsOpen, announceNoMoreBets, announceResult, announceWin, announceLoss } = useRouletteVoice();

  const totalBet = placedBets.reduce((sum, bet) => sum + bet.amount, 0);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(t => t !== id);
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
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
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
    setBetHistory(prev => [...prev, { type, numbers, amount: selectedChip, payout }]);
    playSound('chipPlace');
    setMessage(`Bet ${selectedChip} $Pc on ${type}`);
    setWinningNumber(null);
    setLastWin(0);
    setResultOverlay(null);
  }, [isSpinning, selectedChip, placedBets, onBet, playSound]);

  const undoBet = useCallback(() => {
    if (isSpinning || betHistory.length === 0) return;
    const lastEntry = betHistory[betHistory.length - 1];

    onWin(lastEntry.amount);

    setPlacedBets(prev => {
      const idx = prev.findIndex(b => b.type === lastEntry.type);
      if (idx < 0) return prev;
      const newBets = [...prev];
      if (newBets[idx].amount <= lastEntry.amount) {
        newBets.splice(idx, 1);
      } else {
        newBets[idx] = { ...newBets[idx], amount: newBets[idx].amount - lastEntry.amount };
      }
      return newBets;
    });

    setBetHistory(prev => prev.slice(0, -1));
    playSound('clear');
    setMessage('Last bet undone');
  }, [isSpinning, betHistory, onWin, playSound]);

  const clearBets = useCallback(() => {
    if (isSpinning) return;
    placedBets.forEach(bet => onWin(bet.amount));
    setPlacedBets([]);
    setBetHistory([]);
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
    setBetHistory(affordable.map(b => ({ type: b.type, numbers: b.numbers, amount: b.amount, payout: b.payout })));
    setWinningNumber(null);
    setLastWin(0);
    setResultOverlay(null);
    playSound('chipPlace');
    setMessage(`Repeated bet: ${totalDeducted} $Pc`);
  }, [isSpinning, lastBets, onBet, playSound]);

  const finishSpin = useCallback((number: number) => {
    setHistory(prev => [number, ...prev.slice(0, 19)]);
    announceResult(number, isRed(number));

    const betsSnapshot = placedBetsRef.current;

    safeTimeout(() => {
      if (!mountedRef.current) return;

      let totalWinAmount = 0;
      let laPartageRefund = 0;
      const isZero = number === 0;

      betsSnapshot.forEach(bet => {
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

      setLastBets([...betsSnapshot]);

      const totalBetAmount = betsSnapshot.reduce((sum, b) => sum + b.amount, 0);

      if (totalWinAmount > 0) {
        onWin(totalWinAmount);
        triggerWinBurst();
        addReaction('🤑', 'you');
        setLastWin(totalWinAmount);
        setMessage(laPartageRefund > 0
          ? `Zero! La Partage: ${laPartageRefund} $Pc returned!`
          : `Number ${number}! You won ${totalWinAmount} $Pc!`
        );
        playSound('win');
        announceWin(totalWinAmount);
        setResultOverlay({ type: 'win', amount: totalWinAmount, number });
      } else {
        setMessage(`Number ${number}. Better luck next time!`);
        playSound('lose');
        announceLoss();
        setResultOverlay({ type: 'loss', amount: totalBetAmount, number });
      }

      setPlacedBets([]);
      setBetHistory([]);
    }, 3000);
  }, [useLaPartage, onWin, playSound, announceResult, announceWin, announceLoss, safeTimeout]);

  const spin = useCallback(async () => {
    if (isSpinning || placedBets.length === 0) return;

    setIsSpinning(true);
    setMessage('No more bets!');
    setWinningNumber(null);
    setLastWin(0);
    setBallDropped(false);
    setResultOverlay(null);

    playSound('noMoreBets');
    announceNoMoreBets();

    const pfRound = await startRound();
    if (!pfRound) {
      setIsSpinning(false);
      setMessage('Log in to play — provably fair requires authentication.');
      const total = placedBets.reduce((s, b) => s + b.amount, 0);
      if (total > 0) onWin ? onWin(total) : undefined;
      setPlacedBets([]);
      return;
    }
    currentRoundIdRef.current = pfRound.roundId;

    const animationNum = WHEEL_NUMBERS[Math.floor(Math.random() * WHEEL_NUMBERS.length)];
    winningNumRef.current = animationNum;

    safeTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentSpeed(15);
      playSound('wheelTick');
    }, 200);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(75); }, 2000);

    safeTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentSpeed(145);
      playSound('ballClick');
    }, 3000);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(240); }, 3500);

    safeTimeout(() => {
      if (!mountedRef.current) return;
      clickIntervalRef.current = setInterval(() => {
        if (mountedRef.current) playSound('ballClick');
      }, 280);
    }, 3500);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(245); }, 4700);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(265); }, 6700);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(245); }, 10500);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(240); }, 12000);

    safeTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentSpeed(145);
      setBallDropped(true);
      setWinningNumber(animationNum);
      if (clickIntervalRef.current) {
        clearInterval(clickIntervalRef.current);
        clickIntervalRef.current = null;
      }
      playSound('ballLand');
    }, 13500);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(75); }, 15300);

    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(55); }, 16000);
    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(38); }, 16800);
    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(25); }, 17500);
    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(15); }, 18200);
    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(10); }, 19000);
    safeTimeout(() => { if (mountedRef.current) setCurrentSpeed(7); }, 19500);

    safeTimeout(async () => {
      if (!mountedRef.current) return;
      setCurrentSpeed(IDLE_SPEED);

      if (!currentRoundIdRef.current) return;
      const resolved = await resolveRound(currentRoundIdRef.current);
      if (!resolved || typeof resolved.number !== 'number') {
        const total = placedBetsRef.current.reduce((s, b) => s + b.amount, 0);
        if (total > 0) onWin(total);
        setPlacedBets([]);
        setBetHistory([]);
        currentRoundIdRef.current = null;
        setIsSpinning(false);
        setMessage('Round could not be verified. Bet refunded.');
        return;
      }
      const authoritativeNum = resolved.number;
      setWinningNumber(authoritativeNum);

      finishSpin(authoritativeNum);

      await revealRound(currentRoundIdRef.current);
    }, 20300);
  }, [isSpinning, placedBets, playSound, announceNoMoreBets, safeTimeout, finishSpin, startRound, resolveRound, revealRound]);

  const dismissResult = useCallback(() => {
    setResultOverlay(null);
    setIsSpinning(false);
    setMessage('Place your bets!');
    announceBetsOpen();
  }, [announceBetsOpen]);

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
    setBetHistory(affordable.map(b => ({ type: b.type, numbers: b.numbers, amount: b.amount, payout: b.payout })));
    setWinningNumber(null);
    setLastWin(0);
    setResultOverlay(null);
  }, [isSpinning, lastBets, onBet, playSound]);

  const betAmountMap = useMemo(() => {
    const map: Record<string, number> = {};
    placedBets.forEach(b => { map[b.type] = b.amount; });
    return map;
  }, [placedBets]);

  const betHistoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    betHistory.forEach(h => { map[h.type] = (map[h.type] || 0) + 1; });
    return map;
  }, [betHistory]);

  return (
    <div
      className="h-screen flex flex-col"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0a0a0a 50%, #000 100%)`,
      }}
    >
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
      />
      <style>{`
        @keyframes rouletteChipDrop {
          0% { transform: translateX(-50%) translateY(-12px) scale(0.4); opacity: 0; }
          60% { transform: translateX(-50%) translateY(2px) scale(1.05); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
        @keyframes rouletteWinGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,0.4); }
          50% { box-shadow: 0 0 16px rgba(212,175,55,0.8), 0 0 30px rgba(212,175,55,0.3); }
        }
        @keyframes rouletteNeonPulse {
          0% { filter: brightness(0.9); }
          100% { filter: brightness(1.3); }
        }
        @keyframes resultOverlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes resultContentIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .roulette-cell:hover {
          filter: brightness(1.35) !important;
          box-shadow: 0 0 10px rgba(212,175,55,0.5) !important;
          z-index: 5;
        }
        .chip-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .chip-scroll::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.3);
          border-radius: 2px;
        }
        .chip-scroll::-webkit-scrollbar-thumb {
          background: rgba(212,175,55,0.4);
          border-radius: 2px;
        }
      `}</style>

      {resultOverlay && (
        <ResultOverlayDisplay result={resultOverlay} onDismiss={dismissResult} />
      )}

      {/* Provably fair commitment — shown immediately when a round is active, before spin completes */}
      {round && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div
            title={round.serverSeedHash}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(74,222,128,0.7)', fontFamily: 'monospace' }}
          >
            <Shield style={{ width: 11, height: 11, flexShrink: 0 }} />
            {round.serverSeedHash.slice(0, 16)}…
          </div>
          {!isSpinning && (
            <button
              onClick={() => setShowVerify(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Shield style={{ width: 12, height: 12 }} />
              Verify round
            </button>
          )}
        </div>
      )}
      {!round && lastReveal && !isSpinning && (
        <button
          onClick={() => setShowVerify(true)}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 50, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Shield style={{ width: 12, height: 12 }} />
          Verify last round
        </button>
      )}

      <VerifyRoundModal
        isOpen={showVerify}
        onClose={() => setShowVerify(false)}
        round={round}
        lastReveal={lastReveal}
        game="roulette"
        onOpenProvablyFairPage={prefill => {
          setShowVerify(false);
          if (onOpenProvablyFair) onOpenProvablyFair(prefill);
          else onBack();
        }}
      />

      {/* Header */}
      <InGameTopBar
        gameName="Roulette"
        balance={balance}
        onBack={onBack}
        onAddBalance={onAddBalance}
        showShare
        rightSlot={
          <div style={{ display: 'flex', gap: 4 }}>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRules(true)}>
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Rules</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top: 3D Wheel + Credit + History */}
        <div className="relative flex-shrink-0" style={{ height: '34%', minHeight: '220px' }}>
          {/* Dealer side Vegas props */}
          <div className="absolute top-2 right-3 z-20 pointer-events-none">
            <DealerVegasProps />
          </div>
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
              {(isNaN(balance) || balance == null ? 0 : balance).toLocaleString()}
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
                  targetSpeed={currentSpeed}
                  ballDropped={ballDropped}
                  winningNumber={winningNumber}
                  skinColors={{
                    redColor: rouletteSkin.redColor,
                    blackColor: rouletteSkin.blackColor,
                    greenColor: rouletteSkin.greenColor,
                    numberColor: rouletteSkin.numberColor,
                    rimColor: rouletteSkin.rimColor,
                    accentColor: rouletteSkin.accentColor,
                  }}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* History panel */}
          <div className="absolute top-3 right-3 z-20">
            <HistoryPanel history={history} />
          </div>

          {/* Winning number overlay */}
          {winningNumber !== null && (
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
                  <div className="text-sm font-bold"><span style={{ color: '#43A047' }}>+</span><PcTokenLabel amount={lastWin} size={14} /></div>
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
        <div className="flex-1 overflow-auto px-1 sm:px-2 pb-1 min-h-0">
          <div className="max-w-3xl mx-auto min-w-0">
            <div
              className="rounded-xl p-1.5 sm:p-3 relative"
              style={{
                background: `
                  repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.006) 1px, transparent 2px, transparent 3px),
                  repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.004) 1px, transparent 2px, transparent 3px),
                  ${tableSkin.felt}
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
              <TableBrand style={{ opacity: 0.08 }} />
              {/* Number grid */}
              <div className="flex gap-[2px]">
                {/* Zero */}
                <button
                  onClick={() => placeBet('0', [0], 35)}
                  className="roulette-cell relative flex items-center justify-center font-bold text-base sm:text-xl transition-all flex-shrink-0"
                  style={{
                    width: '32px',
                    minWidth: '28px',
                    borderRadius: '6px',
                    background: 'linear-gradient(145deg, #1fa34a, #15803d)',
                    border: winningNumber === 0 ? '2.5px solid #D4AF37' : '1.5px solid rgba(212,175,55,0.35)',
                    boxShadow: winningNumber === 0 ? '0 0 15px rgba(212,175,55,0.6)' : '0 2px 6px rgba(0,0,0,0.3)',
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    animation: winningNumber === 0 ? 'rouletteWinGlow 1.5s ease-in-out infinite' : undefined,
                  }}
                >
                  0
                  {(betAmountMap['0'] || 0) > 0 && <BetChipStack amount={betAmountMap['0']} chipCount={betHistoryCountMap['0'] || 1} />}
                </button>

                {/* Number grid */}
                <div className="grid grid-cols-12 flex-1 gap-[2px]">
                  {GRID_NUMBERS.flat().map((num) => {
                    const numRed = isRed(num);
                    const betAmt = betAmountMap[num.toString()] || 0;
                    const isWinner = winningNumber === num;

                    return (
                      <button
                        key={num}
                        onClick={() => placeBet(num.toString(), [num], 35)}
                        className="roulette-cell relative h-9 rounded flex items-center justify-center font-bold text-sm transition-all"
                        style={{
                          background: numRed
                            ? 'linear-gradient(145deg, #e53935, #b71c1c)'
                            : 'linear-gradient(145deg, #2a2a2a, #111)',
                          border: isWinner ? '2.5px solid #D4AF37' : '1px solid rgba(255,255,255,0.12)',
                          boxShadow: isWinner ? '0 0 15px rgba(212,175,55,0.6)' : '0 1px 3px rgba(0,0,0,0.3)',
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          animation: isWinner ? 'rouletteWinGlow 1.5s ease-in-out infinite' : undefined,
                        }}
                      >
                        {num}
                        {betAmt > 0 && <BetChipStack amount={betAmt} chipCount={betHistoryCountMap[num.toString()] || 1} />}
                      </button>
                    );
                  })}
                </div>

                {/* 2:1 columns */}
                <div className="flex flex-col gap-[2px] flex-shrink-0" style={{ width: '36px', minWidth: '30px' }}>
                  {[
                    { type: 'col3', nums: [3,6,9,12,15,18,21,24,27,30,33,36] },
                    { type: 'col2', nums: [2,5,8,11,14,17,20,23,26,29,32,35] },
                    { type: 'col1', nums: [1,4,7,10,13,16,19,22,25,28,31,34] },
                  ].map(({ type, nums }) => (
                    <button
                      key={type}
                      onClick={() => placeBet(type, nums, 2)}
                      className="roulette-cell relative flex-1 rounded flex items-center justify-center font-bold text-xs transition-all hover:brightness-125"
                      style={{
                        background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        color: '#D4AF37',
                        letterSpacing: '0.05em',
                      }}
                    >
                      2:1
                      {(betAmountMap[type] || 0) > 0 && <BetChipStack amount={betAmountMap[type]} chipCount={betHistoryCountMap[type] || 1} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dozens */}
              <div className="flex gap-[2px] mt-[2px]" style={{ marginLeft: '34px', marginRight: '38px' }}>
                {[
                  { type: '1st12', label: '1st 12', nums: Array.from({ length: 12 }, (_, i) => i + 1) },
                  { type: '2nd12', label: '2nd 12', nums: Array.from({ length: 12 }, (_, i) => i + 13) },
                  { type: '3rd12', label: '3rd 12', nums: Array.from({ length: 12 }, (_, i) => i + 25) },
                ].map(({ type, label, nums }) => (
                  <button
                    key={type}
                    onClick={() => placeBet(type, nums, 2)}
                    className="roulette-cell relative flex-1 h-9 rounded flex items-center justify-center font-bold text-xs tracking-wide transition-all hover:brightness-125"
                    style={{
                      background: 'linear-gradient(145deg, #5D4037, #3E2723)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#D4AF37',
                    }}
                  >
                    {label}
                    {(betAmountMap[type] || 0) > 0 && <BetChipStack amount={betAmountMap[type]} chipCount={betHistoryCountMap[type] || 1} />}
                  </button>
                ))}
              </div>

              {/* Outside bets */}
              <div className="flex gap-[2px] mt-[2px]" style={{ marginLeft: '34px', marginRight: '38px' }}>
                {[
                  { type: 'low', label: '1-18', nums: Array.from({ length: 18 }, (_, i) => i + 1), bg: '', color: '' },
                  { type: 'even', label: 'EVEN', nums: Array.from({ length: 18 }, (_, i) => (i + 1) * 2), bg: '', color: '' },
                  { type: 'red', label: 'RED', nums: RED_NUMBERS, bg: 'linear-gradient(145deg, #e53935, #b71c1c)', color: '#fff' },
                  { type: 'black', label: 'BLACK', nums: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35], bg: 'linear-gradient(145deg, #2a2a2a, #111)', color: '#fff' },
                  { type: 'odd', label: 'ODD', nums: Array.from({ length: 18 }, (_, i) => i * 2 + 1), bg: '', color: '' },
                  { type: 'high', label: '19-36', nums: Array.from({ length: 18 }, (_, i) => i + 19), bg: '', color: '' },
                ].map(({ type, label, nums, bg, color }) => (
                  <button
                    key={type}
                    onClick={() => placeBet(type, nums, 1)}
                    className="roulette-cell relative flex-1 h-9 rounded flex items-center justify-center font-bold text-[11px] tracking-wide transition-all hover:brightness-125"
                    style={{
                      background: bg || 'linear-gradient(145deg, #5D4037, #3E2723)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: color || '#D4AF37',
                    }}
                  >
                    {label}
                    {(betAmountMap[type] || 0) > 0 && <BetChipStack amount={betAmountMap[type]} chipCount={betHistoryCountMap[type] || 1} />}
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
          <div className="flex items-center justify-between gap-2">
            {/* Chips */}
            <div className="flex-shrink-0">
              <ChipSelector
                selectedChip={selectedChip}
                onSelect={setSelectedChip}
                balance={balance}
                compact
              />
            </div>

            {/* Total */}
            <div className="text-center flex-shrink-0 px-2">
              <div className="text-[8px] text-gray-500 uppercase tracking-wider">Bet</div>
              <div className="text-base font-bold"><PcTokenLabel amount={totalBet} size={16} /></div>
            </div>

            {/* Buttons */}
            <div className="flex gap-1 flex-wrap justify-end">
              <Button
                onClick={undoBet}
                disabled={isSpinning || betHistory.length === 0}
                className="px-2 py-2.5 rounded-lg font-bold text-[10px] min-h-[44px] min-w-[44px]"
                style={{
                  background: isSpinning || betHistory.length === 0 ? '#333' : 'linear-gradient(145deg, #F57C00, #E65100)',
                  boxShadow: isSpinning || betHistory.length === 0 ? 'none' : '0 3px 8px rgba(245,124,0,0.3)',
                  color: isSpinning || betHistory.length === 0 ? '#666' : '#fff',
                }}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>

              <Button
                onClick={() => spin()}
                disabled={isSpinning || placedBets.length === 0}
                className="px-3 sm:px-4 py-2.5 rounded-lg font-bold text-xs min-h-[44px]"
                style={{
                  background: isSpinning || placedBets.length === 0 ? '#333' : 'linear-gradient(145deg, #43A047, #2E7D32)',
                  boxShadow: isSpinning || placedBets.length === 0 ? 'none' : '0 3px 10px rgba(67,160,71,0.4)',
                  color: isSpinning || placedBets.length === 0 ? '#666' : '#fff',
                }}
              >
                {isSpinning ? '...' : 'SPIN'}
              </Button>
              <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />

              <Button
                onClick={repeatAndSpin}
                disabled={isSpinning || lastBets.length === 0}
                className="hidden sm:flex px-2 py-2.5 rounded-lg font-bold text-[10px] min-h-[44px]"
                style={{
                  background: isSpinning || lastBets.length === 0 ? '#333' : 'linear-gradient(145deg, #1E88E5, #1565C0)',
                  boxShadow: isSpinning || lastBets.length === 0 ? 'none' : '0 3px 8px rgba(30,136,229,0.3)',
                  color: isSpinning || lastBets.length === 0 ? '#666' : '#fff',
                }}
              >
                RE+SPIN
              </Button>

              <Button
                onClick={repeatBet}
                disabled={isSpinning || lastBets.length === 0}
                className="px-2 py-2.5 rounded-lg font-bold text-[10px] min-h-[44px]"
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
                className="px-2 py-2.5 rounded-lg font-bold text-[10px] min-h-[44px]"
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
