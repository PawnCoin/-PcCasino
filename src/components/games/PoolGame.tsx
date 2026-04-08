import { useEffect, useRef, useState, useCallback } from 'react';
import { InGameTopBar } from '@/components/InGameTopBar';
import { toast } from 'sonner';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { useTableSkin } from '@/hooks/useTableSkin';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { usePoolBallSkin, POOL_BALL_PRESETS, getDefaultPoolBallPreset } from '@/hooks/usePoolBallSkin';

interface PoolGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  striped: boolean;
  pocketed: boolean;
  isCue: boolean;
  isEight: boolean;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

const TABLE_W = 700;
const TABLE_H = 350;
const BALL_R = 10;
const FRICTION = 0.985;
const MIN_SPEED = 0.08;
const POCKET_R = 18;

const BALL_COLORS = POOL_BALL_PRESETS[0].colors;
const POCKETS: Pocket[] = [
  { x: 28, y: 28, radius: POCKET_R },
  { x: TABLE_W / 2, y: 18, radius: POCKET_R - 2 },
  { x: TABLE_W - 28, y: 28, radius: POCKET_R },
  { x: 28, y: TABLE_H - 28, radius: POCKET_R },
  { x: TABLE_W / 2, y: TABLE_H - 18, radius: POCKET_R - 2 },
  { x: TABLE_W - 28, y: TABLE_H - 28, radius: POCKET_R },
];

function makeBalls(ballColors = BALL_COLORS): Ball[] {
  const balls: Ball[] = [];
  // Cue ball
  balls.push({ id: 0, x: TABLE_W * 0.25, y: TABLE_H / 2, vx: 0, vy: 0, radius: BALL_R, color: '#FFFFFF', striped: false, pocketed: false, isCue: true, isEight: false });
  
  // Rack triangle
  const rackX = TABLE_W * 0.67;
  const rackY = TABLE_H / 2;
  const rows = [[1], [2,9], [3,8,4], [5,10,7,11], [6,12,15,13,14]];
  let bId = 1;
  rows.forEach((row, ri) => {
    row.forEach((_, ci) => {
      const id = bId++;
      const x = rackX + ri * (BALL_R * 2 * 0.866);
      const y = rackY + (ci - (row.length - 1) / 2) * (BALL_R * 2);
      const isEight = id === 8;
      const striped = id > 8;
      const colorIdx = (id - 1) % 7;
      balls.push({ id, x, y, vx: 0, vy: 0, radius: BALL_R, color: isEight ? '#1a1a1a' : ballColors[colorIdx], striped, pocketed: false, isCue: false, isEight });
    });
  });
  return balls;
}

export function PoolGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet }: PoolGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, addAIReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const { activePreset: ballPreset } = usePoolBallSkin();
  const ballPresetRef = useRef(ballPreset);
  useEffect(() => { ballPresetRef.current = ballPreset; }, [ballPreset]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>(makeBalls(getDefaultPoolBallPreset().colors));
  const animRef = useRef<number>(0);
  const shootingRef = useRef(false);
  const aimStartRef = useRef<{ x: number; y: number } | null>(null);
  const aimEndRef = useRef<{ x: number; y: number } | null>(null);
  const movingRef = useRef(false);
  const [gamePhase, setGamePhase] = useState<'idle' | 'aiming' | 'rolling' | 'won' | 'lost' | 'break'>('idle');
  const [betAmount, setBetAmount] = useState(1000);
  const [betPlaced, setBetPlaced] = useState(false);
  const [playerGroup, setPlayerGroup] = useState<'solid' | 'striped' | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [message, setMessage] = useState('Place your bet and shoot!');
  const [pocketedByPlayer, setPocketedByPlayer] = useState<number[]>([]);
  const [pocketedByAi, setPocketedByAi] = useState<number[]>([]);
  const [canShoot, setCanShoot] = useState(false);
  const [ballBalance, setBallBalance] = useState(balance);

  useEffect(() => { setBallBalance(balance); }, [balance]);

  const tableSkinRef = useRef(tableSkin);
  useEffect(() => { tableSkinRef.current = tableSkin; }, [tableSkin]);

  const drawTable = useCallback((ctx: CanvasRenderingContext2D, balls: Ball[], aimStart: { x: number; y: number } | null, aimEnd: { x: number; y: number } | null) => {
    ctx.clearRect(0, 0, TABLE_W, TABLE_H);

    // Felt
    ctx.fillStyle = tableSkinRef.current.felt;
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);

    // Rail lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(TABLE_W * i / 4, 0); ctx.lineTo(TABLE_W * i / 4, TABLE_H); ctx.stroke();
    }

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(TABLE_W * 0.25, 20); ctx.lineTo(TABLE_W * 0.25, TABLE_H - 20); ctx.stroke();
    ctx.setLineDash([]);

    // Pockets
    POCKETS.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Aim line
    if (aimStart && aimEnd) {
      const cue = balls.find(b => b.isCue && !b.pocketed);
      if (cue) {
        const dx = aimStart.x - aimEnd.x;
        const dy = aimStart.y - aimEnd.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 5) {
          const nx = dx / len;
          const ny = dy / len;
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x + nx * 120, cue.y + ny * 120);
          ctx.stroke();
          ctx.setLineDash([]);

          // Power indicator
          const power = Math.min(len / 150, 1);
          ctx.fillStyle = `rgba(255,${Math.floor(255 * (1 - power))},0,0.8)`;
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(power * 100)}%`, cue.x, cue.y - 20);
        }
      }
    }

    // Balls
    balls.forEach(ball => {
      if (ball.pocketed) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

      if (ball.striped) {
        ctx.fillStyle = '#EEEEEE';
        ctx.fill();
        ctx.fillStyle = ball.color;
        ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius * 0.5, ball.radius * 2, ball.radius);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius * 0.5, ball.radius * 2, ball.radius);
      } else {
        ctx.fillStyle = ball.color;
        ctx.fill();
      }

      // Shine
      const shine = ctx.createRadialGradient(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.35, 0, ball.x, ball.y, ball.radius);
      shine.addColorStop(0, 'rgba(255,255,255,0.5)');
      shine.addColorStop(0.4, 'rgba(255,255,255,0.1)');
      shine.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = shine;
      ctx.fill();

      // Number
      if (!ball.isCue && !ball.isEight) {
        ctx.fillStyle = ball.striped ? ball.color : '#fff';
        ctx.font = `bold ${ball.radius * 0.9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(ball.id), ball.x, ball.y + 0.5);
      } else if (ball.isEight) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${ball.radius * 0.9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('8', ball.x, ball.y + 0.5);
      }
      ctx.restore();
    });
  }, []);

  const simulate = useCallback(() => {
    const balls = ballsRef.current;
    let anyMoving = false;

    balls.forEach(ball => {
      if (ball.pocketed) return;
      ball.vx *= FRICTION;
      ball.vy *= FRICTION;
      const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      if (speed < MIN_SPEED) { ball.vx = 0; ball.vy = 0; }
      else { anyMoving = true; }

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounces
      const padding = 26;
      if (ball.x - ball.radius < padding) { ball.x = padding + ball.radius; ball.vx = Math.abs(ball.vx) * 0.75; }
      if (ball.x + ball.radius > TABLE_W - padding) { ball.x = TABLE_W - padding - ball.radius; ball.vx = -Math.abs(ball.vx) * 0.75; }
      if (ball.y - ball.radius < padding) { ball.y = padding + ball.radius; ball.vy = Math.abs(ball.vy) * 0.75; }
      if (ball.y + ball.radius > TABLE_H - padding) { ball.y = TABLE_H - padding - ball.radius; ball.vy = -Math.abs(ball.vy) * 0.75; }

      // Pocket check
      POCKETS.forEach(p => {
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius) {
          ball.pocketed = true;
          ball.vx = 0; ball.vy = 0;
        }
      });
    });

    // Ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]; const b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist) {
          const nx = dx / dist; const ny = dy / dist;
          const overlap = minDist - dist;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          b.x += nx * overlap / 2; b.y += ny * overlap / 2;
          const dvx = a.vx - b.vx; const dvy = a.vy - b.vy;
          const dot = dvx * nx + dvy * ny;
          if (dot > 0) {
            a.vx -= dot * nx; a.vy -= dot * ny;
            b.vx += dot * nx; b.vy += dot * ny;
          }
        }
      }
    }

    return anyMoving;
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const moving = simulate();
    drawTable(ctx, ballsRef.current, aimStartRef.current, aimEndRef.current);
    movingRef.current = moving;
    if (moving) {
      animRef.current = requestAnimationFrame(gameLoop);
    } else {
      // Check pocketed balls this turn
      const balls = ballsRef.current;
      const newlypocketed = balls.filter(b => b.pocketed && !b.isCue);
      const cue = balls.find(b => b.isCue);
      if (cue?.pocketed) {
        // Scratch - replace cue ball
        cue.pocketed = false;
        cue.x = TABLE_W * 0.25;
        cue.y = TABLE_H / 2;
        cue.vx = 0; cue.vy = 0;
        setMessage('Scratch! Cue ball replaced.');
        setTurn('player');
        setCanShoot(true);
        setGamePhase('idle');
      } else {
        const eightBall = balls.find(b => b.isEight);
        if (eightBall?.pocketed) {
          // Eight ball pocketed
          const solidsPocketed = balls.filter(b => !b.isCue && !b.isEight && !b.striped && b.pocketed).length;
          const stripedsPocketed = balls.filter(b => !b.isCue && !b.isEight && b.striped && b.pocketed).length;
          const group = playerGroup;
          const playerDone = group === 'solid' ? solidsPocketed >= 7 : stripedsPocketed >= 7;
          if (playerDone) {
            setGamePhase('won');
            setMessage('🏆 You win! Eight ball pocketed legally!');
            if (betPlaced) { onWin(betAmount * 2); }
            triggerWinBurst();
            addReaction('👑', 'you');
          } else {
            setGamePhase('lost');
            setMessage('You lose! Eight ball pocketed too early.');
            addAIReaction('ai');
          }
          return;
        }
        setGamePhase('idle');
        setCanShoot(true);
      }
    }
  }, [simulate, drawTable, playerGroup, betPlaced, betAmount, onWin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawTable(ctx, ballsRef.current, null, null);
  }, [drawTable]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_W / rect.width;
    const scaleY = TABLE_H / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canShoot || movingRef.current || gamePhase === 'won' || gamePhase === 'lost') return;
    const pos = getCanvasPos(e);
    aimStartRef.current = pos;
    aimEndRef.current = pos;
    setGamePhase('aiming');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gamePhase !== 'aiming' || !aimStartRef.current) return;
    aimEndRef.current = getCanvasPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawTable(ctx, ballsRef.current, aimStartRef.current, aimEndRef.current);
  };

  const handleMouseUp = () => {
    if (gamePhase !== 'aiming' || !aimStartRef.current || !aimEndRef.current) return;
    const start = aimStartRef.current;
    const end = aimEndRef.current;
    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 5) {
      const power = Math.min(len / 150, 1);
      const cue = ballsRef.current.find(b => b.isCue);
      if (cue) {
        cue.vx = (dx / len) * power * 16;
        cue.vy = (dy / len) * power * 16;
        setGamePhase('rolling');
        setCanShoot(false);
        aimStartRef.current = null;
        aimEndRef.current = null;
        animRef.current = requestAnimationFrame(gameLoop);
      }
    } else {
      setGamePhase('idle');
    }
  };

  const placeBet = () => {
    if (betPlaced) return;
    if (!onBet(betAmount)) return;
    setBetPlaced(true);
    setCanShoot(true);
    setMessage('Break! Shoot to start. Pocket a ball to claim your group.');
    toast.success(`Bet of ${betAmount.toLocaleString()} $Pc placed!`);
  };

  const resetGame = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    ballsRef.current = makeBalls(ballPresetRef.current.colors);
    setBetPlaced(false);
    setPlayerGroup(null);
    setTurn('player');
    setCanShoot(false);
    setPocketedByPlayer([]);
    setPocketedByAi([]);
    setGamePhase('idle');
    setMessage('Place your bet and shoot!');
    aimStartRef.current = null;
    aimEndRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawTable(ctx, ballsRef.current, null, null);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const solids = ballsRef.current.filter(b => !b.isCue && !b.isEight && !b.striped);
  const stripeds = ballsRef.current.filter(b => !b.isCue && !b.isEight && b.striped);
  const solidsPocketed = solids.filter(b => b.pocketed).length;
  const stripedsPocketed = stripeds.filter(b => b.pocketed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ you: 'bottom', ai: 'top' }}
      />
      <InGameTopBar gameName="Pool Table" balance={ballBalance} onBack={onBack} onAddBalance={onAddBalance} onShowWallet={onShowWallet} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 }}>
        {/* Status bar */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(22,101,52,0.3)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, color: '#86efac' }}>
            {message}
          </div>
          {playerGroup && (
            <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)', fontSize: 12, color: '#D4AF37' }}>
              You: {playerGroup === 'solid' ? '🟡 Solids' : '⚪ Stripeds'} ({playerGroup === 'solid' ? solidsPocketed : stripedsPocketed}/7)
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 0 6px #5D4037, 0 0 0 10px #3E2723' }}>
          <TableBrand style={{ opacity: 0.1 }} />
          <canvas
            ref={canvasRef}
            width={TABLE_W}
            height={TABLE_H}
            style={{ display: 'block', cursor: canShoot && !movingRef.current ? 'crosshair' : 'default', maxWidth: '100%', height: 'auto' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {(gamePhase === 'won' || gamePhase === 'lost') && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
              <div style={{ fontSize: 48 }}>{gamePhase === 'won' ? '🏆' : '😔'}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: gamePhase === 'won' ? '#D4AF37' : '#ef4444', marginTop: 8 }}>
                {gamePhase === 'won' ? `+${(betAmount * 2).toLocaleString()} $Pc` : `Lost ${betAmount.toLocaleString()} $Pc`}
              </div>
              <button onClick={resetGame} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, background: '#D4AF37', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: 15 }}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!betPlaced ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <ChipSelector selectedChip={betAmount} onSelect={setBetAmount} balance={balance} compact />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Bet: <strong style={{ color: '#D4AF37' }}>{formatChipLabel(betAmount)} $Pc</strong></span>
                <button onClick={placeBet} style={{ padding: '8px 24px', borderRadius: 8, background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: 14 }}>
                  Place Bet & Play
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {canShoot ? '🎯 Click & drag from cue ball to aim' : movingRef.current ? '⌛ Balls in motion...' : ''}
              </span>
              {settings.celebrationsEnabled && (
                <EmojiReactionPicker onReact={emoji => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
              )}
              {(gamePhase === 'idle' || gamePhase === 'aiming') && (
                <button onClick={resetGame} style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                  Forfeit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ball counter */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
          <span>Solids pocketed: {solidsPocketed}/7</span>
          <span>Stripeds pocketed: {stripedsPocketed}/7</span>
          <span>Eight ball: {ballsRef.current.find(b => b.isEight)?.pocketed ? '✅ pocketed' : '🎱 on table'}</span>
        </div>
      </div>
    </div>
  );
}
