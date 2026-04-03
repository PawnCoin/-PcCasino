import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Pause, RefreshCw, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useGameVoice } from '@/hooks/useGameVoice';

interface BingoGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
}

type GamePhase = 'setup' | 'playing' | 'won';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;
const COL_RANGES = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];

const BALL_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  B: { bg: 'linear-gradient(135deg,#1565C0,#42A5F5)', shadow: 'rgba(21,101,192,0.7)', text: '#fff' },
  I: { bg: 'linear-gradient(135deg,#6A1B9A,#CE93D8)', shadow: 'rgba(106,27,154,0.7)', text: '#fff' },
  N: { bg: 'linear-gradient(135deg,#212121,#616161)', shadow: 'rgba(33,33,33,0.7)', text: '#fff' },
  G: { bg: 'linear-gradient(135deg,#1B5E20,#66BB6A)', shadow: 'rgba(27,94,32,0.7)', text: '#fff' },
  O: { bg: 'linear-gradient(135deg,#B71C1C,#EF5350)', shadow: 'rgba(183,28,28,0.7)', text: '#fff' },
};

const WIN_PAYOUTS: Record<string, number> = {
  'Line': 3,
  'Diagonal': 5,
  '4 Corners': 7,
  'BLACKOUT': 20,
};

const BET_OPTIONS = [5, 10, 25, 50, 100];

function generateCard(): (number | 'FREE')[][] {
  const card: (number | 'FREE')[][] = [];
  for (let col = 0; col < 5; col++) {
    const [min, max] = COL_RANGES[col];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    card.push(pool.slice(0, 5) as number[]);
  }
  card[2][2] = 'FREE';
  return card;
}

function generateBallPool(): number[] {
  const pool = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function getColumnLetter(n: number): string {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

function checkWin(daubed: boolean[][]): { won: boolean; pattern: string; winCells: Set<string> } {
  const cells: string[] = [];

  for (let row = 0; row < 5; row++) {
    if ([0, 1, 2, 3, 4].every(col => daubed[col][row])) {
      return { won: true, pattern: 'Line', winCells: new Set([0, 1, 2, 3, 4].map(c => `${c},${row}`)) };
    }
  }
  for (let col = 0; col < 5; col++) {
    if ([0, 1, 2, 3, 4].every(row => daubed[col][row])) {
      return { won: true, pattern: 'Line', winCells: new Set([0, 1, 2, 3, 4].map(r => `${col},${r}`)) };
    }
  }
  if ([0, 1, 2, 3, 4].every(i => daubed[i][i])) {
    return { won: true, pattern: 'Diagonal', winCells: new Set([0, 1, 2, 3, 4].map(i => `${i},${i}`)) };
  }
  if ([0, 1, 2, 3, 4].every(i => daubed[i][4 - i])) {
    return { won: true, pattern: 'Diagonal', winCells: new Set([0, 1, 2, 3, 4].map(i => `${i},${4 - i}`)) };
  }
  if (daubed[0][0] && daubed[4][0] && daubed[0][4] && daubed[4][4]) {
    return { won: true, pattern: '4 Corners', winCells: new Set(['0,0', '4,0', '0,4', '4,4']) };
  }
  if ([0, 1, 2, 3, 4].every(col => [0, 1, 2, 3, 4].every(row => daubed[col][row]))) {
    const all = new Set<string>();
    for (let c = 0; c < 5; c++) for (let r = 0; r < 5; r++) all.add(`${c},${r}`);
    return { won: true, pattern: 'BLACKOUT', winCells: all };
  }

  void cells;
  return { won: false, pattern: '', winCells: new Set() };
}

function getNearWinCells(daubed: boolean[][]): Set<string> {
  const near = new Set<string>();
  for (let row = 0; row < 5; row++) {
    const cols = [0, 1, 2, 3, 4];
    if (cols.filter(c => daubed[c][row]).length === 4) {
      const miss = cols.find(c => !daubed[c][row]);
      if (miss !== undefined) near.add(`${miss},${row}`);
    }
  }
  for (let col = 0; col < 5; col++) {
    const rows = [0, 1, 2, 3, 4];
    if (rows.filter(r => daubed[col][r]).length === 4) {
      const miss = rows.find(r => !daubed[col][r]);
      if (miss !== undefined) near.add(`${col},${miss}`);
    }
  }
  const diag1 = [0, 1, 2, 3, 4];
  if (diag1.filter(i => daubed[i][i]).length === 4) {
    const miss = diag1.find(i => !daubed[i][i]);
    if (miss !== undefined) near.add(`${miss},${miss}`);
  }
  const diag2 = [0, 1, 2, 3, 4];
  if (diag2.filter(i => daubed[i][4 - i]).length === 4) {
    const miss = diag2.find(i => !daubed[i][4 - i]);
    if (miss !== undefined) near.add(`${miss},${4 - miss}`);
  }
  return near;
}

function ConfettiParticle({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <div style={{
      position: 'fixed', left: x, top: y, width: 10, height: 10,
      background: color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      animationDelay: `${delay}ms`,
      animation: 'bingoConfettiFall 2.5s ease-in forwards',
      pointerEvents: 'none', zIndex: 200,
    }} />
  );
}

export function BingoGame({ balance, onBack, onBet, onWin }: BingoGameProps) {
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [card, setCard] = useState<(number | 'FREE')[][]>([]);
  const [daubed, setDaubed] = useState<boolean[][]>(Array.from({ length: 5 }, () => Array(5).fill(false)));
  const [ballPool, setBallPool] = useState<number[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [betAmount, setBetAmount] = useState(25);
  const [winPattern, setWinPattern] = useState('');
  const [winCells, setWinCells] = useState<Set<string>>(new Set());
  const [nearCells, setNearCells] = useState<Set<string>>(new Set());
  const [ballAnim, setBallAnim] = useState(false);
  const [winEffect, setWinEffect] = useState(false);
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; delay: number; id: number }[]>([]);
  const [recentBalls, setRecentBalls] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [message, setMessage] = useState('');
  const [autoSpeed, setAutoSpeed] = useState(2500);
  const confettiId = useRef(0);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { speak, isSupported: voiceSupported } = useGameVoice();
  const [voiceOn, setVoiceOn] = useState(true);

  const announceNumber = useCallback((n: number) => {
    if (!voiceOn || !voiceSupported) return;
    const letter = getColumnLetter(n);
    speak(`${letter} ${n}`, 0.9);
  }, [voiceOn, voiceSupported, speak]);

  const startNewGame = useCallback(() => {
    if (!onBet(betAmount)) {
      setMessage('Insufficient balance!');
      return;
    }
    const newCard = generateCard();
    const initDaubed = Array.from({ length: 5 }, () => Array(5).fill(false));
    initDaubed[2][2] = true; // FREE center
    setCard(newCard);
    setDaubed(initDaubed);
    setBallPool(generateBallPool());
    setCalledNumbers([]);
    setCurrentBall(null);
    setPhase('playing');
    setWinPattern('');
    setWinCells(new Set());
    setNearCells(new Set());
    setWinEffect(false);
    setConfetti([]);
    setRecentBalls([]);
    setAutoPlay(false);
    setMessage('Good luck! Draw a ball to start.');
    playSound('click');
  }, [betAmount, onBet, playSound]);

  const triggerWin = useCallback((pattern: string, cells: Set<string>, pool: number[], bet: number) => {
    const mult = WIN_PAYOUTS[pattern] || 3;
    const prize = bet * mult;
    onWin(prize);
    setWinEffect(true);
    setWinPattern(pattern);
    setWinCells(cells);
    setPhase('won');
    setAutoPlay(false);
    setMessage(`BINGO! ${pattern} — You win ${prize} $Pc! (${mult}x)`);
    playSound('win');
    if (voiceOn && voiceSupported) speak(`Bingo! ${pattern}. You win ${prize} pawn coin!`, 0.88);

    const colors = ['#D4AF37', '#43A047', '#1E88E5', '#E53935', '#9C27B0', '#FF9800', '#fff'];
    const pieces = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 200,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1200,
      id: confettiId.current++,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 4000);
  }, [onWin, playSound, voiceOn, voiceSupported, speak]);

  const drawBall = useCallback(() => {
    if (phase !== 'playing' || ballPool.length === 0) return;

    const [drawn, ...rest] = ballPool;
    setBallPool(rest);
    setCurrentBall(drawn);
    setRecentBalls(prev => [drawn, ...prev].slice(0, 6));
    setCalledNumbers(prev => [...prev, drawn]);
    setBallAnim(true);
    setTimeout(() => setBallAnim(false), 800);

    playSound('ballClick');
    announceNumber(drawn);

    setDaubed(prev => {
      const next = prev.map(col => [...col]);
      const letter = getColumnLetter(drawn);
      const colIdx = COLUMNS.indexOf(letter as typeof COLUMNS[number]);
      for (let row = 0; row < 5; row++) {
        if (card[colIdx]?.[row] === drawn) {
          next[colIdx][row] = true;
        }
      }

      const near = getNearWinCells(next);
      setNearCells(near);

      const { won, pattern, winCells: wc } = checkWin(next);
      if (won) {
        setTimeout(() => triggerWin(pattern, wc, rest, betAmount), 400);
      } else if (rest.length === 0) {
        setPhase('won');
        setMessage('No more balls! Start a new game.');
      }

      return next;
    });
  }, [phase, ballPool, card, betAmount, announceNumber, playSound, triggerWin]);

  useEffect(() => {
    if (autoPlay && phase === 'playing') {
      autoTimer.current = setInterval(drawBall, autoSpeed);
      return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
    }
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [autoPlay, phase, drawBall, autoSpeed]);

  const calledSet = new Set(calledNumbers);
  const letter = currentBall ? getColumnLetter(currentBall) : null;
  const ballColor = letter ? BALL_COLORS[letter] : null;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0a0a0a 0%,#0d1a0d 50%,#0a0a0a 100%)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes bingoBallDrop {
          0%  { transform: translateY(-80px) scale(0.6) rotate(-30deg); opacity:0; }
          50% { transform: translateY(12px) scale(1.12) rotate(10deg); opacity:1; }
          70% { transform: translateY(-6px) scale(0.97) rotate(-4deg); }
          100%{ transform: translateY(0) scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes bingoDaub {
          0%  { transform:scale(0) rotate(-20deg); opacity:0; }
          60% { transform:scale(1.2) rotate(8deg); opacity:1; }
          100%{ transform:scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes bingoNearWin {
          0%,100%{ box-shadow: 0 0 8px 2px rgba(212,175,55,0.4); }
          50%    { box-shadow: 0 0 22px 6px rgba(212,175,55,0.9); }
        }
        @keyframes bingoWinPulse {
          0%,100%{ box-shadow: 0 0 10px 3px rgba(212,175,55,0.5); }
          50%    { box-shadow: 0 0 30px 12px rgba(212,175,55,1); }
        }
        @keyframes bingoConfettiFall {
          0%  { opacity:1; transform:translateY(0) rotate(0deg) scale(1); }
          100%{ opacity:0; transform:translateY(100vh) rotate(720deg) scale(0.3); }
        }
        @keyframes bingoWinText {
          0%  { transform:translate(-50%,-50%) scale(0.4); opacity:0; }
          50% { transform:translate(-50%,-50%) scale(1.1); opacity:1; }
          100%{ transform:translate(-50%,-50%) scale(1); opacity:1; }
        }
        @keyframes bingoGlow {
          0%,100%{ opacity:0.4; } 50%{ opacity:0.9; }
        }
        @keyframes ballSpin {
          0%  { transform: scale(0.5) rotate(-180deg); opacity:0; }
          100%{ transform: scale(1) rotate(0deg); opacity:1; }
        }
      `}</style>

      {/* confetti */}
      {confetti.map(p => <ConfettiParticle key={p.id} x={p.x} y={p.y} color={p.color} delay={p.delay} />)}

      {/* Win overlay */}
      {winEffect && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 150, background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 60%)', animation: 'bingoGlow 1.5s ease-in-out infinite' }}>
          <div style={{ position: 'absolute', top: '35%', left: '50%', animation: 'bingoWinText 0.7s ease-out forwards', textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '0.1em', background: 'linear-gradient(135deg,#D4AF37,#FFD700,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.9))' }}>BINGO!</div>
            <div style={{ fontSize: 20, color: '#fff', fontWeight: 700, textShadow: '0 0 12px rgba(0,0,0,0.9)', marginTop: 4 }}>{winPattern}</div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(212,175,55,0.3)', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
            <ArrowLeft style={{ width: 20, height: 20 }} />
            <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, color: '#D4AF37', fontSize: 15, letterSpacing: '0.1em' }}>BINGO 75-BALL</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <img src="/logos/pc-logo.png" alt="$Pc" style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 700, color: '#D4AF37' }}>{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>$Pc</span>
            </div>
            {voiceSupported && (
              <button onClick={() => setVoiceOn(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: voiceOn ? '#D4AF37' : '#4b5563', padding: 6, borderRadius: 8 }} title="Toggle voice">
                <Volume2 style={{ width: 18, height: 18 }} />
              </button>
            )}
            <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isMuted ? '#4b5563' : '#9ca3af', padding: 6, borderRadius: 8 }}>
              {isMuted ? <VolumeX style={{ width: 18, height: 18 }} /> : <Volume2 style={{ width: 18, height: 18 }} />}
            </button>
            <button onClick={() => setShowRules(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 6, borderRadius: 8 }}>
              <Info style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      </nav>

      {/* MESSAGE BAR */}
      {message && (
        <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(212,175,55,0.06)', borderBottom: '1px solid rgba(212,175,55,0.15)', fontSize: 13, fontWeight: 700, color: winEffect ? '#D4AF37' : '#d1d5db', letterSpacing: '0.05em' }}>
          {message}
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', gap: 20, padding: '16px 20px', maxWidth: 1200, margin: '0 auto', width: '100%', minHeight: 0 }}>

        {/* LEFT: Bingo Card */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', letterSpacing: '0.2em', fontWeight: 700 }}>YOUR CARD</div>

          {/* Card */}
          <div style={{
            background: 'linear-gradient(160deg,rgba(30,30,30,0.95),rgba(15,15,15,0.98))',
            border: '2px solid rgba(212,175,55,0.5)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.1)',
          }}>
            {/* BINGO header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, padding: '10px 10px 6px' }}>
              {COLUMNS.map((letter, ci) => {
                const bc = BALL_COLORS[letter];
                return (
                  <div key={letter} style={{
                    textAlign: 'center', fontWeight: 900, fontSize: 22, letterSpacing: '0.05em',
                    background: bc.bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: `drop-shadow(0 0 8px ${bc.shadow})`,
                    padding: '2px 0',
                  }}>{letter}</div>
                );
              })}
            </div>

            {/* Cells */}
            <div style={{ padding: '0 10px 10px', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
              {[0, 1, 2, 3, 4].map(row =>
                [0, 1, 2, 3, 4].map(col => {
                  const val = card[col]?.[row];
                  const key = `${col},${row}`;
                  const isDaubed = daubed[col]?.[row];
                  const isFree = val === 'FREE';
                  const isWin = winCells.has(key);
                  const isNear = nearCells.has(key) && !isDaubed;
                  const colLetter = COLUMNS[col];
                  const bc = BALL_COLORS[colLetter];

                  return (
                    <div key={key} style={{
                      width: 62, height: 62,
                      borderRadius: 10,
                      position: 'relative',
                      background: isWin ? 'rgba(212,175,55,0.15)' : isDaubed ? 'rgba(20,20,20,0.9)' : 'rgba(30,30,30,0.7)',
                      border: isWin ? '2px solid rgba(212,175,55,0.9)' : isDaubed ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'default', overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      animation: isWin ? 'bingoWinPulse 1s ease-in-out infinite' : isNear ? 'bingoNearWin 1.2s ease-in-out infinite' : 'none',
                      boxShadow: isNear ? '0 0 14px rgba(212,175,55,0.5)' : 'none',
                    }}>
                      {/* Number / FREE label */}
                      <span style={{
                        fontSize: isFree ? 10 : 18, fontWeight: 800,
                        color: isDaubed ? 'rgba(255,255,255,0.35)' : isNear ? '#D4AF37' : '#fff',
                        letterSpacing: isFree ? '0.05em' : '0',
                        zIndex: 1, position: 'relative',
                      }}>{isFree ? 'FREE' : val}</span>

                      {/* Daub marker */}
                      {isDaubed && (
                        <div style={{
                          position: 'absolute', inset: 4, borderRadius: 8,
                          background: isFree
                            ? 'linear-gradient(135deg,rgba(212,175,55,0.35),rgba(212,175,55,0.55))'
                            : `${bc.bg}`,
                          opacity: 0.82,
                          animation: 'bingoDaub 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
                          boxShadow: `inset 0 0 10px rgba(0,0,0,0.3), 0 0 8px ${bc.shadow}`,
                          zIndex: 0,
                        }} />
                      )}

                      {/* Win star overlay */}
                      {isWin && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)' }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Called count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', padding: '0 4px' }}>
            <span>Called: <strong style={{ color: '#D4AF37' }}>{calledNumbers.length}/75</strong></span>
            <span>Remaining: <strong style={{ color: '#6b7280' }}>{75 - calledNumbers.length}</strong></span>
          </div>
        </div>

        {/* CENTER: Ball Display */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 0 }}>

          {/* Current Ball */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.25em', fontWeight: 700 }}>CURRENT BALL</div>
            {currentBall !== null && ballColor && letter ? (
              <div style={{
                width: 130, height: 130, borderRadius: '50%',
                background: ballColor.bg,
                boxShadow: `0 0 40px ${ballColor.shadow}, 0 8px 30px rgba(0,0,0,0.7), inset 0 4px 8px rgba(255,255,255,0.25)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                animation: ballAnim ? 'bingoBallDrop 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
              }}>
                {/* Shine */}
                <div style={{ position: 'absolute', top: '10%', left: '15%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>{letter}</div>
                <div style={{ fontSize: 46, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{currentBall}</div>
              </div>
            ) : (
              <div style={{ width: 130, height: 130, borderRadius: '50%', background: 'rgba(30,30,30,0.8)', border: '3px dashed rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#4b5563', letterSpacing: '0.1em' }}>WAITING</span>
              </div>
            )}
          </div>

          {/* Recent balls */}
          {recentBalls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.2em' }}>RECENTLY CALLED</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {recentBalls.slice(1).map((n, i) => {
                  const l = getColumnLetter(n);
                  const bc = BALL_COLORS[l];
                  return (
                    <div key={i} style={{
                      width: 44, height: 44, borderRadius: '50%', background: bc.bg,
                      boxShadow: `0 2px 10px ${bc.shadow}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      opacity: 1 - i * 0.2,
                    }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{n}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto speed control */}
          {phase === 'playing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.1em' }}>SPEED</span>
              {[{ label: 'SLOW', val: 4000 }, { label: 'MED', val: 2500 }, { label: 'FAST', val: 1200 }].map(s => (
                <button key={s.val} onClick={() => setAutoSpeed(s.val)} style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: autoSpeed === s.val ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${autoSpeed === s.val ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  color: autoSpeed === s.val ? '#D4AF37' : '#6b7280',
                }}>{s.label}</button>
              ))}
            </div>
          )}

          {/* Pattern payout guide */}
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', width: '100%' }}>
            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8 }}>WIN PATTERNS</div>
            {Object.entries(WIN_PAYOUTS).map(([pattern, mult]) => (
              <div key={pattern} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: '#d1d5db' }}>{pattern}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37' }}>{mult}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Number Board */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.2em', fontWeight: 700, textAlign: 'center' }}>CALLED NUMBERS</div>

          <div style={{
            background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '10px 12px',
            display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6,
          }}>
            {COLUMNS.map((letter, ci) => {
              const bc = BALL_COLORS[letter];
              return (
                <div key={letter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 900,
                    background: bc.bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginBottom: 2,
                  }}>{letter}</div>
                  {Array.from({ length: 15 }, (_, j) => {
                    const n = COL_RANGES[ci][0] + j;
                    const isCalled = calledSet.has(n);
                    return (
                      <div key={n} style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isCalled ? bc.bg : 'rgba(30,30,30,0.7)',
                        border: isCalled ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700,
                        color: isCalled ? '#fff' : '#374151',
                        boxShadow: isCalled ? `0 0 8px ${bc.shadow}` : 'none',
                        transition: 'all 0.3s ease',
                        flexShrink: 0,
                      }}>{n}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div style={{ background: 'linear-gradient(180deg,rgba(10,10,10,0.98),rgba(5,5,5,1))', borderTop: '2px solid rgba(212,175,55,0.25)', boxShadow: '0 -4px 20px rgba(0,0,0,0.6)', flexShrink: 0, padding: '12px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

          {/* Bet selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.1em', fontWeight: 700 }}>CARD COST</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {BET_OPTIONS.map(v => (
                <button key={v} disabled={phase === 'playing'} onClick={() => setBetAmount(v)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: phase === 'playing' ? 'not-allowed' : 'pointer',
                  background: betAmount === v ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${betAmount === v ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.1)'}`,
                  color: betAmount === v ? '#D4AF37' : '#9ca3af',
                  opacity: phase === 'playing' && betAmount !== v ? 0.4 : 1,
                }}>{v} $Pc</button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {phase === 'setup' || phase === 'won' ? (
              <Button onClick={startNewGame} style={{
                padding: '10px 28px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000',
                boxShadow: '0 4px 16px rgba(212,175,55,0.4)', border: 'none', cursor: 'pointer',
              }}>
                <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
                {phase === 'won' ? 'NEW GAME' : 'BUY CARD & PLAY'}
              </Button>
            ) : (
              <>
                <Button onClick={drawBall} disabled={autoPlay || ballPool.length === 0} style={{
                  padding: '10px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                  background: autoPlay || ballPool.length === 0 ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#1B5E20,#43A047)',
                  color: '#fff', border: 'none', cursor: autoPlay || ballPool.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: autoPlay ? 'none' : '0 4px 14px rgba(27,94,32,0.5)',
                  opacity: autoPlay ? 0.5 : 1,
                }}>
                  <Play style={{ width: 16, height: 16, marginRight: 8 }} />
                  DRAW BALL
                </Button>

                <Button onClick={() => setAutoPlay(a => !a)} style={{
                  padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                  background: autoPlay ? 'linear-gradient(135deg,#B71C1C,#E53935)' : 'linear-gradient(135deg,#1565C0,#1E88E5)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: autoPlay ? '0 4px 14px rgba(183,28,28,0.5)' : '0 4px 14px rgba(21,101,192,0.5)',
                }}>
                  {autoPlay ? <><Pause style={{ width: 16, height: 16, marginRight: 8 }} />STOP AUTO</> : <><Zap style={{ width: 16, height: 16, marginRight: 8 }} />AUTO PLAY</>}
                </Button>

                <Button onClick={() => { setAutoPlay(false); setPhase('won'); setMessage('Game ended. Start a new game.'); }} style={{
                  padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                  background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
                  border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                }}>
                  <RefreshCw style={{ width: 14, height: 14 }} />
                </Button>
              </>
            )}
          </div>

          {/* Win stats */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.1em' }}>CARD COST</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af' }}>{betAmount} $Pc</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.1em' }}>JACKPOT</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37' }}>{betAmount * WIN_PAYOUTS['BLACKOUT']} $Pc</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent style={{ background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(212,175,55,0.4)', maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: '#D4AF37' }}>Bingo 75-Ball Rules</DialogTitle>
          </DialogHeader>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 12 }}>American 75-ball bingo uses a 5×5 card. Columns are labeled B-I-N-G-O with the following number ranges:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
              {COLUMNS.map((l, i) => <div key={l} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}><strong style={{ color: '#D4AF37' }}>{l}</strong>: {COL_RANGES[i][0]}–{COL_RANGES[i][1]}</div>)}
            </div>
            <p style={{ marginBottom: 8 }}>The center square is <strong>FREE</strong> — it's always marked.</p>
            <p style={{ fontWeight: 700, color: '#D4AF37', marginBottom: 6 }}>Win Patterns & Payouts:</p>
            {Object.entries(WIN_PAYOUTS).map(([p, m]) => <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span>{p}</span><strong style={{ color: '#D4AF37' }}>{m}× your card cost</strong></div>)}
            <p style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>Auto Play draws one ball every few seconds automatically. Adjust the speed with the SLOW/MED/FAST buttons.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
