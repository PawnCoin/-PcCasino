import { useState, useEffect, useCallback, useRef } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { PokerChip, ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';

interface SlotsGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🔔', '⭐', '💎', '7️⃣', '🎰'] as const;
const SYMBOL_NAMES: Record<string, string> = {
  '🍒': 'Cherry',
  '🍋': 'Lemon',
  '🍊': 'Orange',
  '🔔': 'Bell',
  '⭐': 'Star',
  '💎': 'Diamond',
  '7️⃣': 'Seven',
  '🎰': '$Pc',
};

const PAYOUTS: Record<string, number> = {
  '🍒': 2,
  '🍋': 3,
  '🍊': 4,
  '🔔': 6,
  '⭐': 8,
  '💎': 15,
  '7️⃣': 25,
  '🎰': 50,
};

const CHIP_VALUES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];
const ROWS = 3;
const COLS = 5;

type ReelSymbol = (typeof SYMBOLS)[number];

function getRandomSymbol(): ReelSymbol {
  const weights = [20, 18, 15, 12, 10, 8, 5, 2];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= weights[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function generateGrid(): ReelSymbol[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => getRandomSymbol())
  );
}

interface WinLine {
  row: number;
  count: number;
  symbol: ReelSymbol;
  payout: number;
}

function evaluateWins(grid: ReelSymbol[][], bet: number): { lines: WinLine[]; totalWin: number } {
  const lines: WinLine[] = [];
  let totalWin = 0;

  for (let row = 0; row < ROWS; row++) {
    const symbol = grid[row][0];
    let count = 1;
    for (let col = 1; col < COLS; col++) {
      if (grid[row][col] === symbol) count++;
      else break;
    }
    if (count >= 3) {
      const multiplier = PAYOUTS[symbol] || 2;
      const linePay = bet * multiplier * (count - 2);
      lines.push({ row, count, symbol, payout: linePay });
      totalWin += linePay;
    }
  }

  return { lines, totalWin };
}

const slotsRules = {
  objective: 'Spin the reels and match symbols across paylines to win $Pc prizes.',
  symbols: SYMBOLS.map(s => `${s} ${SYMBOL_NAMES[s]}: ${PAYOUTS[s]}x multiplier`),
  gameplay: [
    'Select your bet amount using $Pc chips',
    'Press SPIN to start the reels',
    'Match 3, 4, or 5 identical symbols from left to right on a payline',
    '3 matches = 1x multiplier, 4 = 2x, 5 = 3x the symbol payout',
    'Each row is a separate payline (3 paylines total)',
  ],
  payouts: [
    '🎰 $Pc Logo: 50x (JACKPOT)',
    '7️⃣ Lucky Seven: 25x',
    '💎 Diamond: 15x',
    '⭐ Star: 8x',
    '🔔 Bell: 6x',
    '🍊 Orange: 4x',
    '🍋 Lemon: 3x',
    '🍒 Cherry: 2x',
  ],
  special: [
    'Jackpot: 5 $Pc logos on any row pays 50x × 3 = 150x your bet!',
    'Multi-line wins are added together',
  ],
};

const LED_COUNT = 24;

export function SlotsGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet }: SlotsGameProps) {
  const [grid, setGrid] = useState<ReelSymbol[][]>(generateGrid);
  const [spinning, setSpinning] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState(5);
  const [showRules, setShowRules] = useState(false);
  const [message, setMessage] = useState('Place your bet and spin!');
  const [winLines, setWinLines] = useState<WinLine[]>([]);
  const [isJackpot, setIsJackpot] = useState(false);
  const [spinPhase, setSpinPhase] = useState<number[]>([0, 0, 0, 0, 0]);
  const [lastWin, setLastWin] = useState(0);
  const [displayedWin, setDisplayedWin] = useState(0);
  const spinTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isMuted, toggleMute, playSound } = useSoundEffects();

  useEffect(() => {
    if (lastWin > 0) {
      let current = 0;
      const step = lastWin / 30;
      setDisplayedWin(0);
      counterRef.current = setInterval(() => {
        current += step;
        if (current >= lastWin) {
          current = lastWin;
          if (counterRef.current) clearInterval(counterRef.current);
        }
        setDisplayedWin(current);
      }, 40);
    } else {
      setDisplayedWin(0);
    }
    return () => { if (counterRef.current) clearInterval(counterRef.current); };
  }, [lastWin]);

  const addChipToBet = (amount: number) => {
    if (spinning) return;
    if (currentBet + amount > balance) {
      setMessage('Insufficient balance!');
      setTimeout(() => setMessage('Place your bet and spin!'), 1500);
      return;
    }
    setCurrentBet(prev => prev + amount);
    playSound('chip');
  };

  const clearBet = () => {
    if (spinning) return;
    setCurrentBet(0);
    setMessage('Place your bet and spin!');
    playSound('clear');
  };

  const spin = useCallback(() => {
    if (currentBet === 0) {
      setMessage('Place a bet first!');
      return;
    }
    if (spinning) return;
    if (!onBet(currentBet)) return;

    setSpinning(true);
    setWinLines([]);
    setIsJackpot(false);
    setLastWin(0);
    setMessage('Spinning...');
    playSound('spin');

    const finalGrid = generateGrid();

    spinTimers.current.forEach(t => clearTimeout(t));
    spinTimers.current = [];

    setSpinPhase([1, 1, 1, 1, 1]);

    for (let col = 0; col < COLS; col++) {
      const delay = 600 + col * 400;
      const timer = setTimeout(() => {
        setSpinPhase(prev => {
          const next = [...prev];
          next[col] = 0;
          return next;
        });

        setGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          for (let row = 0; row < ROWS; row++) {
            newGrid[row][col] = finalGrid[row][col];
          }
          return newGrid;
        });

        playSound('click');

        if (col === COLS - 1) {
          setTimeout(() => {
            const { lines, totalWin } = evaluateWins(finalGrid, currentBet);
            setGrid(finalGrid);
            setSpinning(false);

            if (totalWin > 0) {
              setWinLines(lines);
              setLastWin(totalWin);
              onWin(totalWin + currentBet);

              const hasJackpot = lines.some(l => l.symbol === '🎰' && l.count === 5);
              if (hasJackpot) {
                setIsJackpot(true);
                setMessage(`🎰 JACKPOT! +${totalWin.toFixed(2)} $Pc! 🎰`);
                playSound('jackpot');
              } else {
                setMessage(`Winner! +${totalWin.toFixed(2)} $Pc!`);
                playSound('win');
              }
            } else {
              setMessage('No win. Try again!');
              playSound('lose');
            }
          }, 300);
        }
      }, delay);
      spinTimers.current.push(timer);
    }
  }, [currentBet, spinning, onBet, onWin, playSound]);

  useEffect(() => {
    return () => {
      spinTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <CasinoEnvironment gameType="slots">
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <InGameTopBar
          gameName="Slots"
          balance={balance}
          onBack={onBack}
          onAddBalance={onAddBalance}
          onShowWallet={onShowWallet}
          showShare
          rightSlot={
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                    <Info className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View Slots rules & payouts</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />

        <div className="flex-1 pb-8 px-4 flex flex-col items-center gap-6 relative z-10">
          <div
            className="slots-cabinet relative w-full max-w-3xl overflow-hidden"
            style={{
              perspective: '1200px',
            }}
          >
            <div
              className="absolute top-0 left-0 w-6 bottom-0 pointer-events-none z-[3]"
              style={{
                background: 'linear-gradient(90deg, #3a3a3a 0%, #1a1a1a 30%, #2a2a2a 60%, #1a1a1a 100%)',
                borderRight: '1px solid rgba(212,175,55,0.3)',
                borderLeft: '2px solid rgba(212,175,55,0.4)',
                transform: 'perspective(800px) rotateY(15deg)',
                transformOrigin: 'left center',
                boxShadow: 'inset -4px 0 10px rgba(0,0,0,0.5)',
              }}
            />
            <div
              className="absolute top-0 right-0 w-6 bottom-0 pointer-events-none z-[3]"
              style={{
                background: 'linear-gradient(270deg, #3a3a3a 0%, #1a1a1a 30%, #2a2a2a 60%, #1a1a1a 100%)',
                borderLeft: '1px solid rgba(212,175,55,0.3)',
                borderRight: '2px solid rgba(212,175,55,0.4)',
                transform: 'perspective(800px) rotateY(-15deg)',
                transformOrigin: 'right center',
                boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.5)',
              }}
            />

            <div
              className="relative rounded-t-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
                border: '3px solid transparent',
                borderImage: 'linear-gradient(180deg, #D4AF37, #B8860B, #D4AF37) 1',
                boxShadow: '0 0 40px rgba(212,175,55,0.15), inset 0 0 60px rgba(0,0,0,0.8)',
              }}
            >
              <div
                className="relative overflow-hidden py-3 px-4"
                style={{
                  background: 'linear-gradient(180deg, #D4AF37 0%, #B8860B 40%, #8B6914 100%)',
                }}
              >
                <div className="flex items-center justify-center relative z-10">
                  {Array.from({ length: LED_COUNT }).map((_, i) => (
                    <div
                      key={`led-${i}`}
                      className="slots-led-light"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        margin: '0 4px',
                        background: '#FFD700',
                        boxShadow: '0 0 4px #FFD700, 0 0 8px rgba(255,215,0,0.5)',
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="text-center mt-1 relative z-10">
                  <div className="flex items-center justify-center gap-3">
                    <img src="/logos/pc-logo.png" alt="$Pc" className="w-8 h-8 drop-shadow-lg" />
                    <h1
                      className="text-3xl font-bold tracking-wider"
                      style={{
                        color: '#1a1a1a',
                        textShadow: '0 1px 2px rgba(255,255,255,0.3)',
                      }}
                    >
                      $Pc MEGA SLOTS
                    </h1>
                    <img src="/logos/pc-logo.png" alt="$Pc" className="w-8 h-8 drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex items-center justify-center mt-1 relative z-10">
                  {Array.from({ length: LED_COUNT }).map((_, i) => (
                    <div
                      key={`led-b-${i}`}
                      className="slots-led-light"
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        margin: '0 4px',
                        background: '#FF4444',
                        boxShadow: '0 0 3px #FF4444, 0 0 6px rgba(255,68,68,0.5)',
                        animationDelay: `${(LED_COUNT - i) * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, transparent, #fff6, transparent)' }} />
              </div>

              <div
                className="text-center py-2"
                style={{
                  background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
                  borderBottom: '2px solid rgba(212,175,55,0.3)',
                }}
              >
                <span
                  className="text-lg tracking-[0.3em] font-bold"
                  style={{
                    background: 'linear-gradient(90deg, #D4AF37, #FFD700, #D4AF37)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: isJackpot ? 'slots-jackpot-flash 0.3s ease-in-out infinite alternate' : 'none',
                  }}
                >
                  ★ JACKPOT ★
                </span>
              </div>

              {isJackpot && (
                <div className="absolute inset-0 pointer-events-none z-[2]">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: `${4 + Math.random() * 8}px`,
                        height: `${4 + Math.random() * 8}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        background: `hsl(${40 + Math.random() * 20}, 90%, ${60 + Math.random() * 30}%)`,
                        animation: `jackpotParticle ${1 + Math.random() * 2}s ease-out ${Math.random() * 0.5}s forwards`,
                        opacity: 0,
                      }}
                    />
                  ))}
                </div>
              )}

              <div
                className="absolute inset-0 rounded-3xl pointer-events-none z-[1]"
                style={{
                  boxShadow: spinning
                    ? '0 0 15px rgba(212,175,55,0.6), 0 0 30px rgba(212,175,55,0.3), inset 0 0 15px rgba(212,175,55,0.15)'
                    : '0 0 8px rgba(212,175,55,0.2), inset 0 0 8px rgba(212,175,55,0.05)',
                  transition: 'box-shadow 0.5s ease',
                }}
              />

              <div className="p-6 relative">
                <div
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
                    border: '3px solid #D4AF37',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.1)',
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 z-10" style={{ background: 'linear-gradient(180deg, #D4AF37, #B8860B, #D4AF37)' }} />
                  <div className="absolute right-0 top-0 bottom-0 w-1 z-10" style={{ background: 'linear-gradient(180deg, #D4AF37, #B8860B, #D4AF37)' }} />

                  {[0, 1, 2].map(rowIdx => (
                    <div
                      key={`payline-${rowIdx}`}
                      className="absolute left-0 w-3 z-10 flex items-center justify-center"
                      style={{
                        top: `${((rowIdx + 0.5) / ROWS) * 100}%`,
                        transform: 'translateY(-50%)',
                        height: '20px',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: winLines.some(l => l.row === rowIdx) ? '#FFD700' : '#D4AF37',
                          boxShadow: winLines.some(l => l.row === rowIdx)
                            ? '0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.5)'
                            : '0 0 4px rgba(212,175,55,0.3)',
                          animation: winLines.some(l => l.row === rowIdx) ? 'neonPulse 0.8s ease-in-out infinite alternate' : 'none',
                        }}
                      />
                    </div>
                  ))}
                  {[0, 1, 2].map(rowIdx => (
                    <div
                      key={`payline-r-${rowIdx}`}
                      className="absolute right-0 w-3 z-10 flex items-center justify-center"
                      style={{
                        top: `${((rowIdx + 0.5) / ROWS) * 100}%`,
                        transform: 'translateY(-50%)',
                        height: '20px',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: winLines.some(l => l.row === rowIdx) ? '#FFD700' : '#D4AF37',
                          boxShadow: winLines.some(l => l.row === rowIdx)
                            ? '0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.5)'
                            : '0 0 4px rgba(212,175,55,0.3)',
                          animation: winLines.some(l => l.row === rowIdx) ? 'neonPulse 0.8s ease-in-out infinite alternate' : 'none',
                        }}
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-5 gap-2">
                    {grid.map((row, rowIdx) =>
                      row.map((symbol, colIdx) => {
                        const isWinCell = winLines.some(
                          l => l.row === rowIdx && colIdx < l.count
                        );
                        const isSpinning = spinPhase[colIdx] === 1;

                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className="slots-reel-cell relative flex items-center justify-center rounded-xl transition-all duration-300"
                            style={{
                              aspectRatio: '1',
                              background: isWinCell
                                ? 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.05) 100%)'
                                : 'linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%)',
                              border: isWinCell
                                ? '2px solid #D4AF37'
                                : '1px solid rgba(212,175,55,0.15)',
                              boxShadow: isWinCell
                                ? '0 0 20px rgba(212,175,55,0.4), inset 0 0 10px rgba(212,175,55,0.2)'
                                : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                              filter: isSpinning ? 'blur(4px)' : 'blur(0px)',
                              transform: isSpinning ? 'scaleY(1.1)' : 'scaleY(1)',
                              animation: !isSpinning && isWinCell ? 'slots-win-cell-glow 1s ease-in-out infinite alternate' : 'none',
                            }}
                          >
                            {isWinCell && (
                              <div
                                className="absolute inset-0 rounded-xl pointer-events-none"
                                style={{
                                  animation: 'neonPulse 1s ease-in-out infinite alternate',
                                  boxShadow: '0 0 15px rgba(212,175,55,0.5), 0 0 30px rgba(212,175,55,0.2)',
                                }}
                              />
                            )}
                            <span
                              className="text-4xl md:text-5xl select-none transition-all duration-200"
                              style={{
                                filter: isSpinning ? 'blur(2px)' : isWinCell ? 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' : 'none',
                                animation: isSpinning
                                  ? 'slotSpin 0.1s linear infinite'
                                  : isWinCell
                                  ? 'slots-symbol-pulse 0.6s ease-in-out infinite alternate'
                                  : 'none',
                              }}
                            >
                              {isSpinning ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : symbol}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {winLines.map((line, i) => (
                    <div
                      key={i}
                      className="absolute left-4 right-4 h-1 pointer-events-none"
                      style={{
                        top: `${((line.row + 0.5) / ROWS) * 100}%`,
                        background: 'linear-gradient(90deg, transparent, #D4AF37, #FFD700, #D4AF37, transparent)',
                        boxShadow: '0 0 10px rgba(212,175,55,0.8)',
                        animation: 'winLineGlow 1s ease-in-out infinite alternate',
                        width: `${(line.count / COLS) * 100}%`,
                      }}
                    />
                  ))}
                </div>

                {message && (
                  <div className="text-center mt-4">
                    <div
                      className={`inline-block px-6 py-3 rounded-xl font-bold text-lg border-2 ${
                        lastWin > 0
                          ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-gray-600 text-gray-300 bg-black/50'
                      }`}
                      style={{
                        boxShadow: lastWin > 0 ? '0 0 20px rgba(212,175,55,0.3)' : 'none',
                        animation: isJackpot ? 'jackpotText 0.5s ease-in-out infinite alternate' : 'none',
                      }}
                    >
                      {message}
                    </div>
                  </div>
                )}
              </div>

              <div
                className="flex items-center justify-between px-6 py-3"
                style={{
                  background: 'linear-gradient(180deg, #111 0%, #1a1a1a 100%)',
                  borderTop: '2px solid rgba(212,175,55,0.3)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 tracking-wider">CREDIT</span>
                  <div
                    className="px-4 py-1 rounded-md font-bold text-lg"
                    style={{
                      background: '#0a0a0a',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#00FF88',
                      fontFamily: 'monospace',
                      textShadow: '0 0 6px rgba(0,255,136,0.5)',
                      minWidth: '120px',
                      textAlign: 'center',
                    }}
                  >
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 tracking-wider">WIN</span>
                  <div
                    className="px-4 py-1 rounded-md font-bold text-lg"
                    style={{
                      background: '#0a0a0a',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: displayedWin > 0 ? '#FFD700' : '#333',
                      fontFamily: 'monospace',
                      textShadow: displayedWin > 0 ? '0 0 6px rgba(255,215,0,0.5)' : 'none',
                      minWidth: '120px',
                      textAlign: 'center',
                      animation: displayedWin > 0 ? 'slots-credit-roll 0.1s ease-in-out' : 'none',
                    }}
                  >
                    {displayedWin > 0 ? displayedWin.toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute right-[-28px] top-[40%] z-[4] cursor-pointer hidden md:block"
              style={{
                width: '24px',
                height: '80px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '60px',
                  background: 'linear-gradient(90deg, #888, #ccc, #888)',
                  borderRadius: '4px',
                  margin: '0 auto',
                  boxShadow: '2px 2px 6px rgba(0,0,0,0.5)',
                }}
              />
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  background: 'radial-gradient(circle at 40% 40%, #ff4444, #aa0000)',
                  borderRadius: '50%',
                  margin: '0 auto',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(255,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>
          </div>

          <div className="w-full max-w-3xl bg-black/90 border-2 border-[#D4AF37]/20 rounded-2xl p-6"
            style={{
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              background: 'linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)',
            }}
          >
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
            <div className="mb-4">
              <div className="text-center text-[#C0C0C0] text-xs mb-2 tracking-wider">SELECT CHIP VALUE</div>
              <ChipSelector
                selectedChip={selectedChip}
                onSelect={setSelectedChip}
                balance={balance}
                compact
              />
            </div>

            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-[#C0C0C0] text-xs mb-1">CURRENT BET</div>
                <div className="text-3xl font-bold text-[#D4AF37]">{currentBet} $Pc</div>
              </div>

              <button
                onClick={() => addChipToBet(selectedChip)}
                disabled={spinning}
                className="w-20 h-20 rounded-full border-4 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all bg-black/40 flex items-center justify-center disabled:opacity-30"
              >
                <span className="text-[#D4AF37]/70 text-xs text-center">TAP TO<br/>ADD</span>
              </button>

              <button
                onClick={clearBet}
                disabled={currentBet === 0 || spinning}
                className="px-4 py-2 rounded-lg bg-[#B71C1C]/80 hover:bg-[#B71C1C] text-white text-sm font-bold disabled:opacity-30 transition-colors"
              >
                CLEAR
              </button>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[10, 25, 50, 100, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedChip(amount);
                    addChipToBet(amount);
                  }}
                  disabled={currentBet + amount > balance || spinning}
                  className="px-4 py-2 rounded-lg bg-[#5D4037]/50 hover:bg-[#5D4037] text-[#D4AF37] text-sm font-medium border border-[#D4AF37]/30 disabled:opacity-30 transition-colors"
                >
                  +{amount}
                </button>
              ))}
            </div>

            <Button
              onClick={spin}
              className="w-full py-5 text-xl font-bold transition-all"
              disabled={currentBet === 0 || currentBet > balance || spinning}
              style={{
                background: spinning
                  ? 'linear-gradient(135deg, #333 0%, #555 100%)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 50%, #D4AF37 100%)',
                color: spinning ? '#888' : '#1a1a1a',
                boxShadow: spinning ? 'none' : '0 0 20px rgba(212,175,55,0.3), 0 4px 15px rgba(212,175,55,0.4)',
                border: 'none',
              }}
            >
              {spinning ? '⏳ SPINNING...' : '🎰 SPIN'}
            </Button>
          </div>

          {lastWin > 0 && !spinning && (
            <div className="text-center">
              <span className="text-[#D4AF37] text-sm">
                Last win: <strong>+{lastWin.toFixed(2)} $Pc</strong>
                {winLines.length > 0 && ` (${winLines.length} payline${winLines.length > 1 ? 's' : ''})`}
              </span>
            </div>
          )}
        </div>

        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="bg-[#1a1a2e] border-[#D4AF37]/30 text-white max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#D4AF37] text-2xl font-bold flex items-center gap-2">
                🎰 Slots Rules & Payouts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-[#D4AF37] font-bold mb-1">Objective</h3>
                <p className="text-gray-300">{slotsRules.objective}</p>
              </div>
              <div>
                <h3 className="text-[#D4AF37] font-bold mb-1">How to Play</h3>
                <ul className="space-y-1">
                  {slotsRules.gameplay.map((rule, i) => (
                    <li key={i} className="text-gray-300 flex gap-2">
                      <span className="text-[#D4AF37]">•</span> {rule}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[#D4AF37] font-bold mb-1">Symbol Payouts (per bet)</h3>
                <ul className="space-y-1">
                  {slotsRules.payouts.map((payout, i) => (
                    <li key={i} className="text-gray-300 flex gap-2">
                      <span className="text-[#D4AF37]">•</span> {payout}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[#D4AF37] font-bold mb-1">Special</h3>
                <ul className="space-y-1">
                  {slotsRules.special.map((s, i) => (
                    <li key={i} className="text-gray-300 flex gap-2">
                      <span className="text-[#D4AF37]">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <style>{`
          @keyframes slotSpin {
            0% { transform: translateY(-20%); opacity: 0.6; }
            50% { transform: translateY(0%); opacity: 1; }
            100% { transform: translateY(20%); opacity: 0.6; }
          }
          @keyframes slots-symbol-pulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(212,175,55,0.4)); }
            100% { transform: scale(1.15); filter: drop-shadow(0 0 12px rgba(212,175,55,0.8)); }
          }
          @keyframes neonPulse {
            0% { box-shadow: 0 0 10px rgba(212,175,55,0.3), 0 0 20px rgba(212,175,55,0.1); }
            100% { box-shadow: 0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3); }
          }
          @keyframes winLineGlow {
            0% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes jackpotParticle {
            0% { transform: scale(0) translateY(0); opacity: 1; }
            50% { opacity: 1; }
            100% { transform: scale(1.5) translateY(-80px); opacity: 0; }
          }
          @keyframes jackpotText {
            0% { transform: scale(1); text-shadow: 0 0 10px rgba(212,175,55,0.5); }
            100% { transform: scale(1.05); text-shadow: 0 0 30px rgba(212,175,55,0.8); }
          }
          @keyframes slots-led-chase {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          .slots-led-light {
            animation: slots-led-chase 1.5s ease-in-out infinite;
          }
          @keyframes slots-jackpot-flash {
            0% { filter: brightness(1); }
            100% { filter: brightness(2); }
          }
          @keyframes slots-win-cell-glow {
            0% { box-shadow: 0 0 10px rgba(212,175,55,0.3), inset 0 0 5px rgba(212,175,55,0.1); }
            100% { box-shadow: 0 0 25px rgba(212,175,55,0.6), inset 0 0 15px rgba(212,175,55,0.3); }
          }
          @keyframes slots-credit-roll {
            0% { transform: translateY(-2px); }
            50% { transform: translateY(2px); }
            100% { transform: translateY(0); }
          }
        `}</style>
      </div>
    </CasinoEnvironment>
  );
}