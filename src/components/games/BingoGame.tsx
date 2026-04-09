import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Volume2, VolumeX, RefreshCw, Info, Users, Award,
  Plus, Minus, ChevronLeft, ChevronRight, Share2, PlusCircle,
} from 'lucide-react';
import { useTableSkin } from '@/hooks/useTableSkin';
import { PremiumFeltOverlay } from '@/components/PremiumFeltOverlay';
import { useBingoSkin, type BingoSkinId } from '@/hooks/useBingoSkin';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { CasinoIcon } from '@/components/CasinoIcons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useBingoVoice } from '@/hooks/useGameVoice';
import { InGameTopBar } from '@/components/InGameTopBar';
import { ChipSelector } from '@/components/PokerChip';
import { PcTokenLabel } from '@/components/PcTokenLabel';
import { useBingoBots } from '@/hooks/useBingoBots';

interface BingoGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
}

function fmtPc(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000 % 1 === 0 ? (n / 1_000_000).toFixed(0) : (n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

type GamePhase = 'setup' | 'playing' | 'won' | 'gameover';
type BallMachineState = 'idle' | 'mixing' | 'ejecting' | 'settled';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;
const COL_RANGES: [number, number][] = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];

const BALL_COLORS: Record<string, { bg: string; solid: string; shadow: string }> = {
  B: { bg: 'linear-gradient(135deg,#0D47A1,#42A5F5)', solid: '#1565C0', shadow: 'rgba(21,101,192,0.8)' },
  I: { bg: 'linear-gradient(135deg,#4A148C,#CE93D8)', solid: '#7B1FA2', shadow: 'rgba(106,27,154,0.8)' },
  N: { bg: 'linear-gradient(135deg,#7A2E00,#E8650A)', solid: '#CC4A00', shadow: 'rgba(204,85,0,0.8)' },
  G: { bg: 'linear-gradient(135deg,#1B5E20,#66BB6A)', solid: '#2E7D32', shadow: 'rgba(27,94,32,0.8)' },
  O: { bg: 'linear-gradient(135deg,#B71C1C,#EF5350)', solid: '#C62828', shadow: 'rgba(183,28,28,0.8)' },
};

const HOPPER_BALLS = [
  { x: 12,  y: 88,  col: 'B', sz: 26 },
  { x: 48,  y: 82,  col: 'I', sz: 28 },
  { x: 88,  y: 86,  col: 'N', sz: 25 },
  { x: 130, y: 84,  col: 'G', sz: 27 },
  { x: 165, y: 90,  col: 'O', sz: 25 },
  { x: 28,  y: 52,  col: 'O', sz: 26 },
  { x: 68,  y: 50,  col: 'B', sz: 28 },
  { x: 110, y: 54,  col: 'I', sz: 25 },
  { x: 152, y: 56,  col: 'G', sz: 27 },
  { x: 8,   y: 18,  col: 'N', sz: 25 },
  { x: 50,  y: 16,  col: 'G', sz: 27 },
  { x: 100, y: 14,  col: 'O', sz: 26 },
  { x: 148, y: 20,  col: 'B', sz: 25 },
];

// ── BINGO CARD SKINS ─────────────────────────────────────────────────────────
type BingoCardSkin = 'classic' | 'royal' | 'neon' | 'vintage' | 'space' | 'gold';
interface CardSkinDef {
  id: BingoCardSkin; name: string; emoji: string;
  cardBg: string; cardBorder: string; winBorder: string; winGlow: string;
  cellBg: string; cellHinted: string; cellDaubed: string; cellWin: string;
  borderNormal: string; borderHinted: string; borderDaubed: string; borderWin: string;
  daubBg: string; textColor: string; hintedText: string; daubedText: string;
}
const BINGO_SKINS: CardSkinDef[] = [
  {
    id: 'classic', name: 'Classic', emoji: 'slot-machine',
    cardBg: 'linear-gradient(160deg,rgba(28,28,28,0.97),rgba(12,12,12,0.99))',
    cardBorder: 'rgba(212,175,55,0.4)', winBorder: 'rgba(212,175,55,0.9)', winGlow: '#D4AF37',
    cellBg: 'rgba(28,28,28,0.8)', cellHinted: 'rgba(40,32,8,0.95)', cellDaubed: 'rgba(15,15,15,0.95)', cellWin: 'rgba(212,175,55,0.18)',
    borderNormal: 'rgba(255,255,255,0.07)', borderHinted: 'rgba(212,175,55,0.8)', borderDaubed: '', borderWin: 'rgba(212,175,55,0.9)',
    daubBg: '', textColor: '#e5e7eb', hintedText: '#D4AF37', daubedText: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'royal', name: 'Royal', emoji: 'crown',
    cardBg: 'linear-gradient(160deg,rgba(30,15,60,0.98),rgba(10,5,30,0.99))',
    cardBorder: 'rgba(147,112,219,0.5)', winBorder: 'rgba(186,156,255,0.95)', winGlow: '#9370DB',
    cellBg: 'rgba(25,10,50,0.85)', cellHinted: 'rgba(55,25,100,0.95)', cellDaubed: 'rgba(14,5,30,0.97)', cellWin: 'rgba(147,112,219,0.22)',
    borderNormal: 'rgba(147,112,219,0.12)', borderHinted: 'rgba(186,156,255,0.9)', borderDaubed: 'rgba(147,112,219,0.28)', borderWin: 'rgba(186,156,255,0.9)',
    daubBg: 'linear-gradient(135deg,rgba(80,0,140,0.9),rgba(147,112,219,0.88))', textColor: '#d8b4fe', hintedText: '#c084fc', daubedText: 'rgba(216,180,254,0.45)',
  },
  {
    id: 'neon', name: 'Neon', emoji: 'lightning',
    cardBg: 'linear-gradient(160deg,rgba(0,5,15,0.99),rgba(0,2,10,0.99))',
    cardBorder: 'rgba(0,255,200,0.45)', winBorder: 'rgba(0,255,200,0.95)', winGlow: '#00ffc8',
    cellBg: 'rgba(0,10,20,0.9)', cellHinted: 'rgba(0,38,38,0.95)', cellDaubed: 'rgba(0,4,10,0.98)', cellWin: 'rgba(0,255,200,0.12)',
    borderNormal: 'rgba(0,200,150,0.1)', borderHinted: 'rgba(0,255,200,0.88)', borderDaubed: 'rgba(0,200,150,0.28)', borderWin: 'rgba(0,255,200,0.9)',
    daubBg: 'linear-gradient(135deg,rgba(0,100,80,0.9),rgba(0,220,180,0.9))', textColor: '#67e8f9', hintedText: '#00ffc8', daubedText: 'rgba(0,255,200,0.38)',
  },
  {
    id: 'vintage', name: 'Vintage', emoji: 'document',
    cardBg: 'linear-gradient(160deg,rgba(55,35,15,0.97),rgba(38,24,10,0.99))',
    cardBorder: 'rgba(180,140,80,0.45)', winBorder: 'rgba(200,160,90,0.95)', winGlow: '#C8A050',
    cellBg: 'rgba(48,30,12,0.85)', cellHinted: 'rgba(78,52,18,0.95)', cellDaubed: 'rgba(28,18,6,0.97)', cellWin: 'rgba(180,140,80,0.2)',
    borderNormal: 'rgba(180,140,80,0.14)', borderHinted: 'rgba(200,160,90,0.88)', borderDaubed: 'rgba(180,140,80,0.22)', borderWin: 'rgba(200,160,90,0.9)',
    daubBg: 'linear-gradient(135deg,rgba(100,62,20,0.9),rgba(180,132,58,0.88))', textColor: '#d4b896', hintedText: '#c8a96e', daubedText: 'rgba(180,140,80,0.45)',
  },
  {
    id: 'space', name: 'Space', emoji: 'rocket',
    cardBg: 'linear-gradient(160deg,rgba(5,5,25,0.99),rgba(2,2,15,0.99))',
    cardBorder: 'rgba(100,149,237,0.45)', winBorder: 'rgba(130,175,255,0.95)', winGlow: '#6495ED',
    cellBg: 'rgba(8,8,30,0.9)', cellHinted: 'rgba(18,18,65,0.95)', cellDaubed: 'rgba(4,4,18,0.98)', cellWin: 'rgba(100,149,237,0.16)',
    borderNormal: 'rgba(100,149,237,0.1)', borderHinted: 'rgba(130,175,255,0.88)', borderDaubed: 'rgba(100,149,237,0.22)', borderWin: 'rgba(130,175,255,0.9)',
    daubBg: 'linear-gradient(135deg,rgba(25,25,112,0.9),rgba(100,149,237,0.88))', textColor: '#bfdbfe', hintedText: '#93c5fd', daubedText: 'rgba(147,197,253,0.38)',
  },
  {
    id: 'gold', name: 'Gold VIP', emoji: 'gem',
    cardBg: 'linear-gradient(160deg,rgba(16,10,0,0.99),rgba(8,5,0,0.99))',
    cardBorder: 'rgba(255,215,0,0.5)', winBorder: 'rgba(255,215,0,0.95)', winGlow: '#FFD700',
    cellBg: 'rgba(16,10,0,0.9)', cellHinted: 'rgba(40,28,0,0.95)', cellDaubed: 'rgba(8,5,0,0.98)', cellWin: 'rgba(255,215,0,0.18)',
    borderNormal: 'rgba(212,175,55,0.15)', borderHinted: 'rgba(255,215,0,0.9)', borderDaubed: 'rgba(212,175,55,0.3)', borderWin: 'rgba(255,215,0,0.95)',
    daubBg: 'linear-gradient(135deg,rgba(180,140,20,0.9),rgba(255,215,0,0.88))', textColor: '#FFD700', hintedText: '#FFC107', daubedText: 'rgba(255,215,0,0.4)',
  },
];

const WIN_PAYOUTS: Record<string, number> = { Line: 3, Diagonal: 5, '4 Corners': 7, BLACKOUT: 20 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCard(): (number | 'FREE')[][] {
  const card: (number | 'FREE')[][] = [];
  for (let col = 0; col < 5; col++) {
    const [min, max] = COL_RANGES[col];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    card.push(shuffle(pool).slice(0, 5) as number[]);
  }
  card[2][2] = 'FREE';
  return card;
}

function getColumnLetter(n: number): string {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

function checkWin(daubed: boolean[][]): { won: boolean; pattern: string; winCells: Set<string> } {
  for (let row = 0; row < 5; row++) {
    if ([0, 1, 2, 3, 4].every(c => daubed[c][row]))
      return { won: true, pattern: 'Line', winCells: new Set([0, 1, 2, 3, 4].map(c => `${c},${row}`)) };
  }
  for (let col = 0; col < 5; col++) {
    if ([0, 1, 2, 3, 4].every(r => daubed[col][r]))
      return { won: true, pattern: 'Line', winCells: new Set([0, 1, 2, 3, 4].map(r => `${col},${r}`)) };
  }
  if ([0, 1, 2, 3, 4].every(i => daubed[i][i]))
    return { won: true, pattern: 'Diagonal', winCells: new Set([0, 1, 2, 3, 4].map(i => `${i},${i}`)) };
  if ([0, 1, 2, 3, 4].every(i => daubed[i][4 - i]))
    return { won: true, pattern: 'Diagonal', winCells: new Set([0, 1, 2, 3, 4].map(i => `${i},${4 - i}`)) };
  if (daubed[0][0] && daubed[4][0] && daubed[0][4] && daubed[4][4])
    return { won: true, pattern: '4 Corners', winCells: new Set(['0,0', '4,0', '0,4', '4,4']) };
  if ([0, 1, 2, 3, 4].every(c => [0, 1, 2, 3, 4].every(r => daubed[c][r]))) {
    const all = new Set<string>();
    for (let c = 0; c < 5; c++) for (let r = 0; r < 5; r++) all.add(`${c},${r}`);
    return { won: true, pattern: 'BLACKOUT', winCells: all };
  }
  return { won: false, pattern: '', winCells: new Set() };
}

// ── BALL MACHINE ────────────────────────────────────────────────────────────
interface BallMachineProps {
  machineState: BallMachineState;
  currentBall: number | null;
  drawKey: number;
  onDraw: () => void;
  autoPlay: boolean;
  autoSpeed: number;
  phase: GamePhase;
  calledCount: number;
  isMuted: boolean;
}

function BallMachine({ machineState, currentBall, drawKey, onDraw, autoPlay, autoSpeed, phase, calledCount, isMuted }: BallMachineProps) {
  const letter = currentBall ? getColumnLetter(currentBall) : null;
  const bc = letter ? BALL_COLORS[letter] : null;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const clinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playBallClink = () => {
    if (isMuted) return;
    try {
      const ctx = getAudioCtx();
      const numClicks = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < numClicks; k++) {
        const delay = k * (0.055 + Math.random() * 0.07);
        const t = ctx.currentTime + delay;

        // Noise burst — wooden impact transient
        const bufSize = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const bpf = ctx.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 250 + Math.random() * 180;
        bpf.Q.value = 2.5;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        noise.connect(bpf);
        bpf.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);
        noise.stop(t + 0.06);

        // Low tonal thump — wood body resonance
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 + Math.random() * 80, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        oscGain.gain.setValueAtTime(0.18, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    } catch {}
  };

  useEffect(() => {
    if (machineState === 'mixing') {
      playBallClink();
      clinkTimerRef.current = setInterval(() => {
        playBallClink();
      }, 180 + Math.random() * 160);
    } else {
      if (clinkTimerRef.current) clearInterval(clinkTimerRef.current);
    }
    return () => { if (clinkTimerRef.current) clearInterval(clinkTimerRef.current); };
  }, [machineState, isMuted]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Glass hopper housing */}
      <div style={{ position: 'relative', width: 200, height: 130, borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 28px rgba(0,0,0,0.8), inset 0 0 0 2px rgba(212,175,55,0.3)' }}>
        {/* Glass body */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(180,220,255,0.06) 0%,rgba(10,10,18,0.92) 40%,rgba(8,8,12,0.98) 100%)', borderRadius: 20 }} />
        {/* Glass border */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, border: '2px solid rgba(180,220,255,0.18)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)' }} />
        {/* Glass shine top-left */}
        <div style={{ position: 'absolute', top: 6, left: 8, width: '35%', height: '28%', background: 'linear-gradient(135deg,rgba(255,255,255,0.10),transparent)', borderRadius: 12, pointerEvents: 'none' }} />
        {/* Glass shine top-right */}
        <div style={{ position: 'absolute', top: 4, right: 10, width: '18%', height: '15%', background: 'rgba(255,255,255,0.06)', borderRadius: '50%', pointerEvents: 'none' }} />
        {/* Label */}
        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 7.5, color: 'rgba(212,175,55,0.6)', letterSpacing: '0.3em', fontWeight: 700, zIndex: 5, whiteSpace: 'nowrap' }}>BALL CAGE</div>

        {/* Balls inside glass */}
        {HOPPER_BALLS.map((b, i) => {
          const ballBc = BALL_COLORS[b.col as keyof typeof BALL_COLORS];
          const isMixing = machineState === 'mixing';
          const isEjecting = machineState === 'ejecting' && currentBall ? getColumnLetter(currentBall) === b.col : false;
          const bounceIdx = i % 13;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: b.x, top: b.y,
              width: b.sz, height: b.sz,
              borderRadius: '50%',
              background: ballBc.bg,
              boxShadow: `0 3px 10px ${ballBc.shadow}, inset 0 2px 5px rgba(255,255,255,0.35), inset 0 -1px 3px rgba(0,0,0,0.4)`,
              animationName: isEjecting && i === 0 ? 'hopperEject' : isMixing ? `hb${bounceIdx}` : 'hopperIdle',
              animationDuration: isMixing ? `${0.55 + (i % 7) * 0.08}s` : '4s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.85)',
              zIndex: 2,
              textShadow: '0 1px 3px rgba(0,0,0,0.7)',
            }}>
              {/* Specular highlight */}
              <div style={{ position: 'absolute', top: '12%', left: '18%', width: '30%', height: '28%', background: 'radial-gradient(circle,rgba(255,255,255,0.55) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              {b.col}
            </div>
          );
        })}

        {/* Mixing turbulence glow */}
        {machineState === 'mixing' && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'radial-gradient(ellipse at 50% 80%,rgba(212,175,55,0.1) 0%,transparent 70%)', animation: 'mixingPulse 0.3s ease-in-out infinite', pointerEvents: 'none', zIndex: 4 }} />
        )}
      </div>

      {/* Chute */}
      <div style={{ width: 6, height: 16, background: 'linear-gradient(180deg,rgba(212,175,55,0.5),rgba(212,175,55,0.15))', borderRadius: 3, boxShadow: '0 0 6px rgba(212,175,55,0.3)' }} />

      {/* Current ball display */}
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        {currentBall !== null && bc ? (
          <div key={drawKey} style={{
            width: 110, height: 110, borderRadius: '50%',
            background: bc.bg,
            boxShadow: `0 0 40px ${bc.shadow}, 0 6px 24px rgba(0,0,0,0.8), inset 0 4px 8px rgba(255,255,255,0.3)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'ballSettle 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '10%', left: '18%', width: '28%', height: '28%', background: 'radial-gradient(circle,rgba(255,255,255,0.55) 0%,transparent 70%)', borderRadius: '50%' }} />
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>{letter}</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>{currentBall}</div>
          </div>
        ) : (
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'rgba(20,20,20,0.8)', border: '3px dashed rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.15em', textAlign: 'center' }}>WAITING{'\n'}FOR DRAW</span>
          </div>
        )}
        {machineState === 'mixing' && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,175,55,0.15) 0%,transparent 70%)', animation: 'mixingPulse 0.4s ease-in-out infinite' }} />
        )}
      </div>

      {/* Countdown bar */}
      {phase === 'playing' && calledCount > 0 && (
        <div style={{ width: 160, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
          <div key={`cd-${drawKey}`} style={{
            height: '100%', background: 'linear-gradient(90deg,#D4AF37,#FFD700)',
            borderRadius: 3,
            animationName: autoPlay ? 'countdownDrain' : 'none',
            animationDuration: `${autoSpeed}ms`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
          }} />
        </div>
      )}

      {/* Draw controls — only visible when not in autoPlay mode */}
      {phase === 'playing' && !autoPlay && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onDraw} disabled={machineState !== 'settled' && machineState !== 'idle'} style={{
            padding: '7px 20px', borderRadius: 10, fontWeight: 800, fontSize: 12,
            background: 'linear-gradient(135deg,#1B5E20,#43A047)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(27,94,32,0.6)',
          }}>▶ DRAW</button>
        </div>
      )}
    </div>
  );
}

// ── SINGLE BINGO CARD ────────────────────────────────────────────────────────
interface BingoCardProps {
  cardIdx: number;
  card: (number | 'FREE')[][];
  daubed: boolean[][];
  hinted: Set<string>;
  winCells: Set<string>;
  cellSize: number;
  onDaub: (cardIdx: number, col: number, row: number) => void;
  isWinner: boolean;
  label?: string;
  phase: GamePhase;
  onClaimBingo: () => void;
  bingoFeedback: 'none' | 'valid' | 'invalid';
  skin: BingoCardSkin;
}

function BingoCard({ cardIdx, card, daubed, hinted, winCells, cellSize, onDaub, isWinner, label, phase, onClaimBingo, bingoFeedback, skin }: BingoCardProps) {
  const fontSize = cellSize >= 54 ? 18 : cellSize >= 44 ? 15 : cellSize >= 36 ? 13 : 11;
  const headerFont = cellSize >= 54 ? 22 : cellSize >= 44 ? 18 : cellSize >= 36 ? 15 : 13;
  const sk = BINGO_SKINS.find(s => s.id === skin) ?? BINGO_SKINS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {label && (
        <div style={{ textAlign: 'center', fontSize: 9, color: '#d1d5db', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      )}
      <div style={{
        background: sk.cardBg,
        border: `2px solid ${isWinner ? sk.winBorder : sk.cardBorder}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: isWinner ? `0 0 30px ${sk.winGlow}66, 0 8px 32px rgba(0,0,0,0.8)` : '0 6px 28px rgba(0,0,0,0.7)',
        animation: isWinner ? 'cardWinPulse 1s ease-in-out infinite' : 'none',
      }}>
        {/* BINGO header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, padding: `8px 8px 4px` }}>
          {COLUMNS.map((l) => {
            const bc = BALL_COLORS[l];
            return (
              <div key={l} style={{ textAlign: 'center', fontWeight: 900, fontSize: headerFont, background: bc.bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 6px ${bc.shadow})` }}>{l}</div>
            );
          })}
        </div>

        {/* Grid */}
        <div style={{ padding: '0 8px 6px', display: 'grid', gridTemplateColumns: `repeat(5,${cellSize}px)`, gap: 3 }}>
          {[0, 1, 2, 3, 4].map(row => [0, 1, 2, 3, 4].map(col => {
            const val = card[col]?.[row];
            const cellKey = `${cardIdx},${col},${row}`;
            const gridKey = `${col},${row}`;
            const isDaubed = daubed[col]?.[row];
            const isHinted = hinted.has(cellKey);
            const isWin = winCells.has(gridKey);
            const isFree = val === 'FREE';
            const colL = COLUMNS[col];
            const bc = BALL_COLORS[colL];

            const canDaub = isHinted && !isDaubed;

            return (
              <div key={`${col}-${row}`}
                onClick={() => canDaub && onDaub(cardIdx, col, row)}
                style={{
                  width: cellSize, height: cellSize,
                  borderRadius: 8,
                  position: 'relative',
                  background: isWin ? sk.cellWin : isDaubed ? sk.cellDaubed : isHinted ? sk.cellHinted : sk.cellBg,
                  border: isWin ? `2px solid ${sk.borderWin}` : isDaubed ? `1.5px solid ${sk.borderDaubed || `${bc.solid}44`}` : isHinted ? `1.5px solid ${sk.borderHinted}` : `1.5px solid ${sk.borderNormal}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canDaub ? 'pointer' : 'default',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  animation: isWin ? 'cellWinPulse 1s ease-in-out infinite' : isHinted && !isDaubed ? 'hintGlow 1.3s ease-in-out infinite' : 'none',
                  boxShadow: isHinted && !isDaubed ? `0 0 12px ${sk.winGlow}55, inset 0 0 8px ${sk.winGlow}18` : 'none',
                }}
                onMouseEnter={e => { if (canDaub) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.zIndex = '5'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
              >
                {/* Daubed marker */}
                {isDaubed && (
                  <div style={{
                    position: 'absolute', inset: 3, borderRadius: 6,
                    background: isFree ? 'linear-gradient(135deg,rgba(212,175,55,0.45),rgba(212,175,55,0.65))' : (sk.daubBg || bc.bg),
                    opacity: 0.88,
                    animation: 'daubAppear 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
                    boxShadow: `inset 0 0 6px rgba(0,0,0,0.35), 0 0 6px ${bc.shadow}`,
                  }} />
                )}

                {/* Number / FREE */}
                <span style={{
                  position: 'relative', zIndex: 2,
                  fontSize: isFree ? fontSize * 0.62 : fontSize,
                  fontWeight: 800,
                  color: isHinted && !isDaubed ? sk.hintedText : isDaubed ? sk.daubedText : sk.textColor,
                  letterSpacing: isFree ? '0.04em' : 0,
                  userSelect: 'none',
                }}>{isFree ? 'FREE' : val}</span>

                {/* Hint indicator */}
                {isHinted && !isDaubed && (
                  <div style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: sk.hintedText, animation: 'hintDot 0.8s ease-in-out infinite' }} />
                )}

                {/* Win star */}
                {isWin && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `radial-gradient(circle,${sk.winGlow}40 0%,transparent 70%)` }} />
                )}
              </div>
            );
          }))}
        </div>

        {/* Per-card BINGO button */}
        {phase === 'playing' && (
          <div style={{ padding: '0 8px 8px' }}>
            <button
              onClick={onClaimBingo}
              style={{
                width: '100%',
                padding: cellSize >= 54 ? '10px 0' : '7px 0',
                borderRadius: 10,
                fontWeight: 900,
                fontSize: cellSize >= 54 ? 18 : 14,
                fontFamily: "'Cinzel',serif",
                letterSpacing: '0.15em',
                border: 'none',
                cursor: 'pointer',
                background: bingoFeedback === 'valid'
                  ? 'linear-gradient(135deg,#1B5E20,#43A047)'
                  : bingoFeedback === 'invalid'
                    ? 'linear-gradient(135deg,#B71C1C,#E53935)'
                    : 'linear-gradient(135deg,#D4AF37,#B8860B)',
                color: bingoFeedback !== 'none' ? '#fff' : '#000',
                boxShadow: bingoFeedback === 'invalid'
                  ? '0 3px 14px rgba(183,28,28,0.6)'
                  : '0 3px 18px rgba(212,175,55,0.5), 0 0 0 2px rgba(212,175,55,0.12)',
                animation: bingoFeedback === 'invalid' ? 'bingoShake 0.4s ease-in-out' : bingoFeedback === 'valid' ? 'bingoFlash 0.6s ease-in-out' : 'none',
                transition: 'background 0.25s, box-shadow 0.25s',
              }}
            >
              {bingoFeedback === 'valid' ? 'BINGO!' : bingoFeedback === 'invalid' ? 'NOT YET' : 'BINGO!'}
            </button>
          </div>
        )}
        {phase === 'won' && isWinner && (
          <div style={{ padding: '0 8px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: cellSize >= 54 ? 20 : 15, fontWeight: 900, fontFamily: "'Cinzel',serif", background: 'linear-gradient(135deg,#D4AF37,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.7))' }}>BINGO!</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CONFETTI ────────────────────────────────────────────────────────────────
function ConfettiPiece({ x, y, color, delay, shape }: { x: number; y: number; color: string; delay: number; shape: string }) {
  return (
    <div style={{
      position: 'fixed', left: x, top: y, width: shape === 'circle' ? 9 : 8, height: shape === 'circle' ? 9 : 12,
      background: color, borderRadius: shape === 'circle' ? '50%' : '2px',
      animationDelay: `${delay}ms`, animation: 'confettiFall 2.8s ease-in forwards',
      pointerEvents: 'none', zIndex: 300,
    }} />
  );
}

// ── MAIN GAME ────────────────────────────────────────────────────────────────
export function BingoGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet }: BingoGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [numCards, setNumCards] = useState(1);
  const [betAmount, setBetAmount] = useState(5_000_000);
  const [cards, setCards] = useState<(number | 'FREE')[][][]>([]);
  const [daubed, setDaubed] = useState<boolean[][][]>([]);
  const [hinted, setHinted] = useState<Set<string>>(new Set());
  const [winCells, setWinCells] = useState<Map<number, Set<string>>>(new Map());
  const [ballPool, setBallPool] = useState<number[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [machineState, setMachineState] = useState<BallMachineState>('idle');
  const [drawKey, setDrawKey] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [wonPrize, setWonPrize] = useState(0);
  const [autoSpeed, setAutoSpeed] = useState(6000);
  const [winPattern, setWinPattern] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [bingoFeedback, setBingoFeedback] = useState<'none' | 'valid' | 'invalid'>('none');
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; delay: number; shape: string; id: number }[]>([]);
  const [calledTicker, setCalledTicker] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const { activeSkinId: cardSkin, selectSkin: setCardSkinHook } = useBingoSkin();
  const setCardSkin = (id: BingoCardSkin) => setCardSkinHook(id as BingoSkinId);
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [winnerDisplayName, setWinnerDisplayName] = useState('');
  const confId = useRef(0);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDrawing = useRef(false);

  const { callNumber, announceWin: announceWinVoice, announceNotYet, isSupported: voiceSupported } = useBingoVoice();
  const { playSound } = useSoundEffects();
  const {
    activeBots, onlinePlayerCount, botBingoEvent,
    startGame: startBotGame, endGame: endBotGame,
    advanceBotProgress, triggerBotReaction, tryBotBingo,
  } = useBingoBots();

  const botReactionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'playing') {
      botReactionTimer.current = setInterval(() => {
        if (Math.random() < 0.4) {
          triggerBotReaction((emoji, player) => addReaction(emoji, player));
        }
      }, 8000 + Math.random() * 7000);
      return () => {
        if (botReactionTimer.current) clearInterval(botReactionTimer.current);
      };
    }
    return () => {
      if (botReactionTimer.current) clearInterval(botReactionTimer.current);
    };
  }, [phase, triggerBotReaction, addReaction]);

  useEffect(() => {
    if (phase === 'playing' && calledNumbers.length > 0) {
      advanceBotProgress(calledNumbers.length);
      tryBotBingo(calledNumbers.length);
    }
  }, [calledNumbers.length, phase, advanceBotProgress, tryBotBingo]);

  const startGame = useCallback(() => {
    const totalCost = betAmount * numCards;
    if (!onBet(totalCost)) { setMessage('Insufficient balance!'); return; }
    playSound('chip');

    const newCards = Array.from({ length: numCards }, generateCard);
    const initDaubed = newCards.map(() => {
      const d = Array.from({ length: 5 }, () => Array(5).fill(false) as boolean[]);
      d[2][2] = true;
      return d;
    });

    setCards(newCards);
    setDaubed(initDaubed);
    setBallPool(shuffle(Array.from({ length: 75 }, (_, i) => i + 1)));
    setCalledNumbers([]);
    setCurrentBall(null);
    setHinted(new Set());
    setWinCells(new Map());
    setWonPrize(0);
    setPhase('playing');
    setWinPattern('');
    setBingoFeedback('none');
    setConfetti([]);
    setCalledTicker([]);
    setMachineState('idle');
    setShowWinOverlay(false);
    setMessage('Click DRAW BALL or enable auto to start calling numbers!');
    setAutoPlay(false);
    isDrawing.current = false;
    startBotGame();
  }, [betAmount, numCards, onBet, playSound, startBotGame]);

  const drawBall = useCallback(() => {
    if (isDrawing.current) return;
    setBallPool(prev => {
      if (prev.length === 0) {
        setPhase('gameover');
        setMessage('All 75 balls called! Game over.');
        endBotGame();
        return prev;
      }

      isDrawing.current = true;
      const [drawn, ...rest] = prev;

      setMachineState('mixing');

      setTimeout(() => {
        setMachineState('ejecting');
        setTimeout(() => {
          setCurrentBall(drawn);
          setMachineState('settled');
          setDrawKey(k => k + 1);

          setCalledNumbers(c => [...c, drawn]);
          setCalledTicker(t => [drawn, ...t].slice(0, 12));

          if (voiceOn && voiceSupported) {
            callNumber(getColumnLetter(drawn), drawn);
          }

          // Build new hints
          setCards(cds => {
            setHinted(prev => {
              const next = new Set(prev);
              cds.forEach((card, ci) => {
                COLUMNS.forEach((_, col) => {
                  [0, 1, 2, 3, 4].forEach(row => {
                    if (card[col]?.[row] === drawn) {
                      next.add(`${ci},${col},${row}`);
                    }
                  });
                });
              });
              return next;
            });
            return cds;
          });

          isDrawing.current = false;
        }, 1200);
      }, 5000);

      return rest;
    });
  }, [voiceOn, voiceSupported, callNumber, endBotGame]);

  // Auto-play
  useEffect(() => {
    if (autoPlay && phase === 'playing') {
      const loop = () => {
        autoTimer.current = setTimeout(() => {
          drawBall();
          if (autoPlay) loop();
        }, autoSpeed);
      };
      const first = setTimeout(() => { drawBall(); loop(); }, 200);
      return () => {
        clearTimeout(first);
        if (autoTimer.current) clearTimeout(autoTimer.current);
      };
    }
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [autoPlay, phase, autoSpeed, drawBall]);

  const daubCell = useCallback((cardIdx: number, col: number, row: number) => {
    const key = `${cardIdx},${col},${row}`;
    if (!hinted.has(key)) return;

    setHinted(prev => { const n = new Set(prev); n.delete(key); return n; });
    setDaubed(prev => {
      const next = prev.map(c => c.map(r => [...r]));
      next[cardIdx][col][row] = true;
      return next;
    });
    playSound && playSound('click');
  }, [hinted, playSound]);

  const claimBingo = useCallback(() => {
    if (phase !== 'playing') return;

    let foundWin = false;
    const newWinCells = new Map<number, Set<string>>();
    let bestPattern = '';

    daubed.forEach((cardDaubed, ci) => {
      if (foundWin) return;
      const { won, pattern, winCells: wc } = checkWin(cardDaubed);
      if (won) {
        foundWin = true;
        newWinCells.set(ci, wc);
        bestPattern = pattern;
      }
    });

    if (foundWin) {
      const mult = WIN_PAYOUTS[bestPattern] || 3;
      const prize = betAmount * numCards * mult;
      playSound('jackpot');
      onWin(prize);
      triggerWinBurst();
      addReaction('party', 'you');
      setWonPrize(prize);
      setWinCells(newWinCells);
      setWinPattern(bestPattern);
      setPhase('won');
      setBingoFeedback('valid');
      setAutoPlay(false);
      setShowWinOverlay(true);
      const winnerName = settings.displayName || 'Player';
      setWinnerDisplayName(winnerName);
      setMessage(`BINGO! ${bestPattern} — You win ${fmtPc(prize)} $Pc (${mult}×)!`);
      if (voiceOn && voiceSupported) announceWinVoice(winnerName, bestPattern, prize);
      endBotGame();

      const colors = ['#D4AF37', '#FFD700', '#43A047', '#1E88E5', '#E53935', '#9C27B0', '#FF9800', '#fff', '#00BCD4'];
      const pieces = Array.from({ length: 90 }, (_, i) => ({
        x: Math.random() * window.innerWidth, y: -30 - Math.random() * 160,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1400, shape: Math.random() > 0.5 ? 'circle' : 'rect',
        id: confId.current++,
      }));
      setConfetti(pieces);
      setTimeout(() => setConfetti([]), 4500);
    } else {
      setBingoFeedback('invalid');
      setMessage('Not a valid BINGO yet — keep marking your numbers!');
      if (voiceOn && voiceSupported) announceNotYet();
      setTimeout(() => setBingoFeedback('none'), 2200);
    }
  }, [phase, daubed, betAmount, numCards, onWin, voiceOn, voiceSupported, announceWinVoice, announceNotYet, playSound]);

  const calledSet = new Set(calledNumbers);
  const totalHinted = hinted.size;

  const cellSize = numCards === 1 ? 60 : numCards === 2 ? 52 : numCards === 3 ? 43 : 37;
  const cardColumns = numCards <= 3 ? numCards : numCards === 4 ? 2 : 3;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#080808 0%,#0b140b 50%,#080808 100%)', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ you: 'bottom' }}
      />
      <style>{`
        @keyframes hb0{0%{transform:translate(0,0) rotate(-5deg)}25%{transform:translate(42px,-32px) rotate(14deg)}50%{transform:translate(85px,-6px) rotate(-10deg)}75%{transform:translate(40px,30px) rotate(12deg)}100%{transform:translate(0,0) rotate(-5deg)}}
        @keyframes hb1{0%{transform:translate(0,0) rotate(8deg)}30%{transform:translate(-35px,28px) rotate(-18deg)}60%{transform:translate(60px,22px) rotate(12deg)}100%{transform:translate(0,0) rotate(8deg)}}
        @keyframes hb2{0%{transform:translate(0,0)}20%{transform:translate(-52px,-24px) rotate(-22deg)}55%{transform:translate(28px,30px) rotate(16deg)}80%{transform:translate(-18px,-14px) rotate(-8deg)}100%{transform:translate(0,0)}}
        @keyframes hb3{0%{transform:translate(0,0) rotate(5deg)}35%{transform:translate(55px,-30px) rotate(-15deg)}70%{transform:translate(-28px,20px) rotate(22deg)}100%{transform:translate(0,0) rotate(5deg)}}
        @keyframes hb4{0%{transform:translate(0,0) rotate(-10deg)}40%{transform:translate(-45px,24px) rotate(18deg)}75%{transform:translate(38px,-28px) rotate(-20deg)}100%{transform:translate(0,0) rotate(-10deg)}}
        @keyframes hb5{0%{transform:translate(0,0) rotate(3deg)}33%{transform:translate(70px,18px) rotate(-14deg)}66%{transform:translate(-22px,-26px) rotate(10deg)}100%{transform:translate(0,0) rotate(3deg)}}
        @keyframes hb6{0%{transform:translate(0,0)}28%{transform:translate(-62px,-18px) rotate(20deg)}58%{transform:translate(32px,32px) rotate(-16deg)}85%{transform:translate(14px,-8px) rotate(6deg)}100%{transform:translate(0,0)}}
        @keyframes hb7{0%{transform:translate(0,0) rotate(-8deg)}22%{transform:translate(48px,26px) rotate(16deg)}50%{transform:translate(-38px,-20px) rotate(-12deg)}78%{transform:translate(20px,18px) rotate(8deg)}100%{transform:translate(0,0) rotate(-8deg)}}
        @keyframes hb8{0%{transform:translate(0,0) rotate(12deg)}38%{transform:translate(-58px,14px) rotate(-20deg)}72%{transform:translate(36px,-24px) rotate(14deg)}100%{transform:translate(0,0) rotate(12deg)}}
        @keyframes hb9{0%{transform:translate(0,0)}18%{transform:translate(44px,-30px) rotate(-18deg)}45%{transform:translate(-30px,22px) rotate(20deg)}72%{transform:translate(58px,16px) rotate(-8deg)}100%{transform:translate(0,0)}}
        @keyframes hb10{0%{transform:translate(0,0) rotate(-6deg)}30%{transform:translate(-50px,-22px) rotate(16deg)}60%{transform:translate(34px,28px) rotate(-14deg)}100%{transform:translate(0,0) rotate(-6deg)}}
        @keyframes hb11{0%{transform:translate(0,0) rotate(10deg)}25%{transform:translate(60px,20px) rotate(-22deg)}55%{transform:translate(-40px,-18px) rotate(12deg)}80%{transform:translate(22px,12px) rotate(-6deg)}100%{transform:translate(0,0) rotate(10deg)}}
        @keyframes hb12{0%{transform:translate(0,0)}20%{transform:translate(-44px,28px) rotate(18deg)}50%{transform:translate(62px,-22px) rotate(-16deg)}80%{transform:translate(-16px,20px) rotate(10deg)}100%{transform:translate(0,0)}}
        @keyframes hopperIdle{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(2px,-3px) rotate(3deg)}}
        @keyframes hopperEject{0%{transform:translate(0,0) scale(1); opacity:1}100%{transform:translate(0,80px) scale(0); opacity:0}}
        @keyframes ballSettle{0%{transform:translateY(-60px) scale(0.5) rotate(-30deg);opacity:0}55%{transform:translateY(10px) scale(1.1) rotate(8deg);opacity:1}75%{transform:translateY(-5px) scale(0.97) rotate(-3deg)}100%{transform:translateY(0) scale(1) rotate(0);opacity:1}}
        @keyframes mixingPulse{0%,100%{opacity:0.3}50%{opacity:0.8}}
        @keyframes countdownDrain{from{width:100%}to{width:0%}}
        @keyframes daubAppear{0%{transform:scale(0) rotate(-15deg);opacity:0}60%{transform:scale(1.15) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes hintGlow{0%,100%{box-shadow:0 0 10px rgba(212,175,55,0.4),inset 0 0 6px rgba(212,175,55,0.1);border-color:rgba(212,175,55,0.6)}50%{box-shadow:0 0 20px rgba(212,175,55,0.8),inset 0 0 12px rgba(212,175,55,0.25);border-color:rgba(212,175,55,1)}}
        @keyframes hintDot{0%,100%{transform:scale(0.7);opacity:0.6}50%{transform:scale(1.3);opacity:1}}
        @keyframes cardWinPulse{0%,100%{box-shadow:0 0 20px rgba(212,175,55,0.4),0 8px 32px rgba(0,0,0,0.8)}50%{box-shadow:0 0 40px rgba(212,175,55,0.9),0 8px 32px rgba(0,0,0,0.8)}}
        @keyframes cellWinPulse{0%,100%{box-shadow:none}50%{box-shadow:0 0 14px rgba(212,175,55,0.7)}}
        @keyframes confettiFall{0%{opacity:1;transform:translateY(0) rotate(0) scale(1)}100%{opacity:0;transform:translateY(100vh) rotate(540deg) scale(0.2)}}
        @keyframes bingoShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
        @keyframes bingoFlash{0%,100%{background:linear-gradient(135deg,#D4AF37,#B8860B)}50%{background:linear-gradient(135deg,#FFD700,#D4AF37)}}
        @keyframes tickerSlide{from{transform:translateX(120px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes onlinePulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes winOverlayIn{0%{opacity:0;transform:scale(0.9)}100%{opacity:1;transform:scale(1)}}
        @keyframes verifiedPulse{0%,100%{box-shadow:0 0 20px rgba(67,160,71,0.6)}50%{box-shadow:0 0 40px rgba(67,160,71,1)}}
      `}</style>

      {/* Confetti */}
      {confetti.map(p => <ConfettiPiece key={p.id} x={p.x} y={p.y} color={p.color} delay={p.delay} shape={p.shape} />)}

      {/* WIN OVERLAY */}
      {showWinOverlay && phase === 'won' && (() => {
        const winCardIdx = Array.from(winCells.keys())[0] ?? 0;
        const winCard = cards[winCardIdx];
        const winDaubed = daubed[winCardIdx] || [];
        const winCellSet = winCells.get(winCardIdx) || new Set<string>();
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 20, padding: 24,
            animation: 'winOverlayIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* BINGO! heading */}
            <div style={{
              fontSize: 72, fontWeight: 900, fontFamily: "'Cinzel',serif",
              background: 'linear-gradient(135deg,#D4AF37,#FFD700,#D4AF37)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.9))',
              lineHeight: 1, animation: 'bingoFlash 1s ease-in-out infinite',
            }}>BINGO!</div>

            {/* VERIFIED badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
              borderRadius: 50, background: 'rgba(27,94,32,0.9)',
              border: '2px solid #43A047', color: '#fff',
              fontSize: 16, fontWeight: 900, letterSpacing: '0.1em',
              boxShadow: '0 0 20px rgba(67,160,71,0.6)',
              animation: 'verifiedPulse 1s ease-in-out infinite',
            }}>
              VERIFIED
            </div>

            {/* Winner name + pattern + prize */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#d1d5db', letterSpacing: '0.06em', marginBottom: 2 }}>
                {winnerDisplayName} wins!
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#e5e7eb' }}>{winPattern}</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}><PcTokenLabel amount={fmtPc(wonPrize)} size={28} /></div>
            </div>

            {/* Winning card */}
            {winCard && (
              <BingoCard
                cardIdx={winCardIdx}
                card={winCard}
                daubed={winDaubed}
                hinted={new Set()}
                winCells={winCellSet}
                cellSize={52}
                onDaub={() => {}}
                isWinner={true}
                phase="won"
                onClaimBingo={() => {}}
                bingoFeedback="valid"
                skin={cardSkin}
              />
            )}

            {/* PLAY AGAIN button */}
            <button
              onClick={() => { setShowWinOverlay(false); startGame(); }}
              style={{
                padding: '14px 48px', borderRadius: 14, fontWeight: 900, fontSize: 18,
                fontFamily: "'Cinzel',serif",
                background: 'linear-gradient(135deg,#D4AF37,#B8860B)',
                color: '#000', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(212,175,55,0.5)',
                letterSpacing: '0.08em',
              }}
            >PLAY AGAIN</button>

            <button
              onClick={() => setShowWinOverlay(false)}
              style={{ fontSize: 12, color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >View board</button>
          </div>
        );
      })()}

      {/* Bot bingo claim event */}
      {botBingoEvent && phase === 'playing' && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 350,
          background: 'rgba(0,0,0,0.92)', border: '2px solid #EF5350', borderRadius: 16,
          padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12,
          animation: 'winOverlayIn 0.3s ease-out', boxShadow: '0 8px 40px rgba(239,83,80,0.4)',
        }}>
          <img src={botBingoEvent.botPhoto} alt={botBingoEvent.botName} style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #EF5350', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#EF5350' }}>{botBingoEvent.botName} claims BINGO!</div>
            <div style={{ fontSize: 11, color: '#d1d5db' }}>Verifying... <span style={{ color: '#FFA726' }}>Not valid!</span></div>
          </div>
        </div>
      )}

      {/* NAV */}
      <InGameTopBar
        gameName="Bingo 75-Ball"
        balance={balance}
        onBack={onBack}
        onAddBalance={onAddBalance}
        onShowWallet={onShowWallet}
        winAmount={phase === 'won' ? wonPrize : undefined}
        showShare={phase === 'won'}
        rightSlot={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 14, background: 'rgba(67,160,71,0.1)', border: '1px solid rgba(67,160,71,0.25)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
              <Users style={{ width: 11, height: 11, color: '#66BB6A' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlinePlayerCount.toLocaleString()}</span>
            </div>
            {voiceSupported && (
              <button onClick={() => setVoiceOn(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: voiceOn ? '#D4AF37' : 'rgba(255,255,255,0.55)', padding: 4, borderRadius: 6 }} title="Voice caller">
                <Volume2 style={{ width: 14, height: 14 }} />
              </button>
            )}
            <button onClick={() => setIsMuted(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isMuted ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)', padding: 4, borderRadius: 6 }}>
              {isMuted ? <VolumeX style={{ width: 14, height: 14 }} /> : <Volume2 style={{ width: 14, height: 14 }} />}
            </button>
            <button onClick={() => setShowRules(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.65)', padding: 4, borderRadius: 6 }}>
              <Info style={{ width: 14, height: 14 }} />
            </button>
          </div>
        }
      />

      {/* CALLED TICKER */}
      {calledTicker.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.2em', flexShrink: 0 }}>CALLED</span>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center' }}>
            {calledTicker.map((n, i) => {
              const l = getColumnLetter(n);
              const bc = BALL_COLORS[l];
              const isNew = i === 0;
              const diameter = isNew ? 40 : Math.max(20, 34 - i * 3);
              const opacity = Math.max(0.35, 1 - i * 0.08);
              return (
                <div key={i} style={{
                  flexShrink: 0,
                  width: diameter, height: diameter, borderRadius: '50%',
                  position: 'relative',
                  background: bc.bg,
                  boxShadow: isNew
                    ? `0 0 14px ${bc.shadow}, 0 4px 12px rgba(0,0,0,0.7), inset 0 3px 6px rgba(255,255,255,0.3)`
                    : `0 2px 6px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)`,
                  animation: isNew ? 'tickerSlide 0.4s ease-out' : 'none',
                  opacity,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {/* Specular highlight — top-left shine for 3D sphere effect */}
                  <div style={{
                    position: 'absolute', top: '10%', left: '15%',
                    width: '38%', height: '32%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.65) 0%, transparent 70%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                  }} />
                  <span style={{ fontSize: isNew ? 9 : 7, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.6)', position: 'relative', zIndex: 1 }}>{l}</span>
                  <span style={{ fontSize: isNew ? 12 : 8, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 }}>{n}</span>
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 9, color: '#d1d5db', flexShrink: 0, marginLeft: 'auto' }}>{calledNumbers.length}/75</span>
        </div>
      )}

      {/* MESSAGE */}
      {message && (
        <div style={{ textAlign: 'center', padding: '6px 16px', background: phase === 'won' ? 'rgba(212,175,55,0.08)' : 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, fontWeight: 700, color: phase === 'won' ? '#D4AF37' : '#e5e7eb', flexShrink: 0, letterSpacing: '0.04em' }}>
          {message}
        </div>
      )}

      {/* SETUP SCREEN */}
      {phase === 'setup' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ background: 'rgba(15,15,15,0.95)', border: '2px solid rgba(212,175,55,0.4)', borderRadius: 20, padding: '40px 48px', maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Cinzel',serif", background: 'linear-gradient(135deg,#D4AF37,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>BINGO 75-BALL</div>
            <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 32 }}>American 75-ball bingo — daub your card, call BINGO!</div>

            {/* Card skin selector */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: '#e5e7eb', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 12 }}>CARD SKIN</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {BINGO_SKINS.map(sk => (
                  <button
                    key={sk.id}
                    onClick={() => setCardSkin(sk.id)}
                    style={{
                      padding: '10px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                      background: cardSkin === sk.id ? sk.cardBg : 'rgba(255,255,255,0.07)',
                      border: `2px solid ${cardSkin === sk.id ? sk.winBorder : 'rgba(255,255,255,0.15)'}`,
                      color: cardSkin === sk.id ? sk.textColor : '#d1d5db',
                      fontWeight: cardSkin === sk.id ? 800 : 600,
                      fontSize: 12,
                      boxShadow: cardSkin === sk.id ? `0 0 16px ${sk.winGlow}55, 0 4px 12px rgba(0,0,0,0.5)` : 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72,
                      transform: cardSkin === sk.id ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    <span><CasinoIcon name={sk.emoji} size={22} /></span>
                    <span style={{ fontSize: 10, letterSpacing: '0.08em' }}>{sk.name.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#e5e7eb', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 12 }}>NUMBER OF CARDS</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <button onClick={() => setNumCards(c => Math.max(1, c - 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', color: '#fff', fontSize: 18 }}>-</button>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#D4AF37', width: 60, textAlign: 'center' }}>{numCards}</div>
                <button onClick={() => setNumCards(c => Math.min(5, c + 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', color: '#fff', fontSize: 18 }}>+</button>
              </div>
              <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 6 }}>max 5 cards</div>
            </div>

            {/* Balance + Get More */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.15)' }}>
              <div>
                <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.15em', fontWeight: 700 }}>YOUR BALANCE</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}><PcTokenLabel amount={fmtPc(balance)} size={18} /></div>
              </div>
              {onAddBalance && (
                <button
                  onClick={() => onAddBalance(10_000)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)', color: '#66BB6A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  <PlusCircle size={13} /> Get $Pc
                </button>
              )}
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: '#e5e7eb', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 10 }}>COST PER CARD</div>
              <ChipSelector selectedChip={betAmount} onSelect={setBetAmount} balance={balance} compact />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#d1d5db' }}>TOTAL COST</div><div style={{ fontSize: 18, fontWeight: 800 }}><PcTokenLabel amount={fmtPc(betAmount * numCards)} size={18} /></div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#d1d5db' }}>BLACKOUT WIN</div><div style={{ fontSize: 18, fontWeight: 800 }}><PcTokenLabel amount={fmtPc(betAmount * numCards * WIN_PAYOUTS.BLACKOUT)} size={18} /></div></div>
            </div>

            <button onClick={startGame} style={{
              width: '100%', padding: '14px 0', borderRadius: 12, fontWeight: 900, fontSize: 16,
              background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(212,175,55,0.4)', letterSpacing: '0.05em', fontFamily: "'Cinzel',serif",
            }}>BUY CARDS & PLAY</button>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, color: '#d1d5db' }}><strong style={{ color: '#66BB6A' }}>{onlinePlayerCount}</strong> players in lobby</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                {activeBots.slice(0, 8).map(bot => (
                  <div key={bot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ position: 'relative' }}>
                      <img src={bot.photoUrl} alt={bot.name} style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${bot.vipTier === 'gold' ? '#D4AF37' : bot.vipTier === 'silver' ? '#9E9E9E' : '#8D6E63'}`, objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: bot.vipTier === 'gold' ? '#D4AF37' : bot.vipTier === 'silver' ? '#9E9E9E' : '#8D6E63', border: '1.5px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 5, fontWeight: 900, color: '#000' }}>
                        {bot.vipTier === 'gold' ? 'G' : bot.vipTier === 'silver' ? 'S' : 'B'}
                      </div>
                    </div>
                    <span style={{ fontSize: 8, color: '#d1d5db', maxWidth: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bot.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING / WON SCREEN */}
      {(phase === 'playing' || phase === 'won' || phase === 'gameover') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }} className="sm:!flex-row">
          <TableBrand style={{ opacity: 0.06 }} />

          {/* LEFT COLUMN: Ball machine + number board */}
          <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: tableSkin.felt, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', position: 'relative', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)' }} className="sm:!w-[300px] sm:!flex-shrink-0">
            <PremiumFeltOverlay borderRadius="0px" goldBorderInset={6} showSpotlight={false} />

            <BallMachine
              machineState={machineState}
              currentBall={currentBall}
              drawKey={drawKey}
              onDraw={drawBall}
              autoPlay={autoPlay}
              autoSpeed={autoSpeed}
              phase={phase}
              calledCount={calledNumbers.length}
              isMuted={isMuted}
            />

            {/* Auto-play toggle */}
            {phase === 'playing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
                <button onClick={() => setAutoPlay(a => !a)} style={{
                  padding: '8px 0', borderRadius: 10, fontWeight: 800, fontSize: 11,
                  background: autoPlay ? 'linear-gradient(135deg,#B71C1C,#E53935)' : 'linear-gradient(135deg,#1565C0,#1E88E5)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: autoPlay ? '0 3px 12px rgba(183,28,28,0.5)' : '0 3px 12px rgba(21,101,192,0.5)',
                  letterSpacing: '0.08em',
                }}>
                  {autoPlay ? 'STOP AUTO' : 'AUTO PLAY'}
                </button>

                {/* Speed selector */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{ l: 'SLOW', v: 8000 }, { l: 'MED', v: 5000 }, { l: 'FAST', v: 3000 }].map(s => (
                    <button key={s.v} onClick={() => setAutoSpeed(s.v)} style={{
                      flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer',
                      background: autoSpeed === s.v ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${autoSpeed === s.v ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      color: autoSpeed === s.v ? '#D4AF37' : 'rgba(255,255,255,0.6)',
                    }}>{s.l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Skin swap during gameplay */}
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8 }}>CARD SKIN</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {BINGO_SKINS.map(sk => (
                  <button
                    key={sk.id}
                    onClick={() => setCardSkin(sk.id)}
                    title={sk.name}
                    style={{
                      padding: '4px 6px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s',
                      background: cardSkin === sk.id ? sk.cardBg : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${cardSkin === sk.id ? sk.winBorder : 'rgba(255,255,255,0.1)'}`,
                      fontSize: 14, lineHeight: 1,
                      boxShadow: cardSkin === sk.id ? `0 0 8px ${sk.winGlow}66` : 'none',
                    }}
                  ><CasinoIcon name={sk.emoji} size={14} /></button>
                ))}
              </div>
            </div>

            {/* Win payouts */}
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8 }}>PAYOUTS</div>
              {Object.entries(WIN_PAYOUTS).map(([p, m]) => (
                <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ color: '#e5e7eb' }}>{p}</span>
                  <span style={{ fontWeight: 700, color: '#D4AF37' }}>{m}×</span>
                </div>
              ))}
            </div>

            {/* Number board — vertical BINGO, horizontal numbers */}
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 8px' }}>
              <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>CALLED NUMBERS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {COLUMNS.map((l, ci) => {
                  const bc = BALL_COLORS[l];
                  return (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {/* Letter label */}
                      <div style={{
                        width: 18, flexShrink: 0,
                        fontSize: 15, fontWeight: 900, textAlign: 'center',
                        background: bc.bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        filter: `drop-shadow(0 0 4px ${bc.shadow})`,
                      }}>{l}</div>

                      {/* 15 number circles in a row — sized to fit 300px sidebar without scrolling */}
                      <div style={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
                        {Array.from({ length: 15 }, (_, j) => {
                          const n = COL_RANGES[ci][0] + j;
                          const called = calledSet.has(n);
                          return (
                            <div key={n} title={`${l}${n}`} style={{
                              width: 15, height: 15, borderRadius: '50%',
                              background: called ? bc.bg : 'rgba(22,22,22,0.9)',
                              border: called ? 'none' : '1px solid rgba(255,255,255,0.07)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 6.5, fontWeight: 700, lineHeight: 1,
                              color: called ? '#fff' : 'rgba(255,255,255,0.55)',
                              boxShadow: called ? `0 0 5px ${bc.shadow}` : 'none',
                              transition: 'background 0.3s, box-shadow 0.3s',
                              flexShrink: 0,
                            }}>{n}</div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Online social bar */}
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(67,160,71,0.2)', borderRadius: 10, padding: '10px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlinePlayerCount} players online</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {activeBots.slice(0, 6).map(bot => (
                  <div key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={bot.photoUrl} alt={bot.name} style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${bot.vipTier === 'gold' ? '#D4AF37' : bot.vipTier === 'silver' ? '#9E9E9E' : '#8D6E63'}`, objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: bot.vipTier === 'gold' ? '#D4AF37' : bot.vipTier === 'silver' ? '#9E9E9E' : '#8D6E63', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 4, fontWeight: 900, color: '#000' }}>
                        {bot.vipTier === 'gold' ? 'G' : bot.vipTier === 'silver' ? 'S' : 'B'}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bot.name}</div>
                      {phase === 'playing' && (
                        <div style={{ fontSize: 8, color: bot.numbersAway <= 3 ? '#EF5350' : bot.numbersAway <= 6 ? '#FFA726' : '#66BB6A', fontWeight: 600 }}>
                          {bot.numbersAway <= 1 ? '1 away!' : `${bot.numbersAway} away`}
                        </div>
                      )}
                    </div>
                    {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
                      <span style={{ fontSize: 12, animation: 'daubAppear 0.3s ease-out' }}>{bot.lastReactionEmoji}</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: '#d1d5db', textAlign: 'center', marginTop: 6 }}>Multiplayer lobby</div>
            </div>
          </div>

          {/* RIGHT: Cards grid */}
          <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Hint info bar */}
            {totalHinted > 0 && phase === 'playing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', animation: 'hintGlow 1.5s ease-in-out infinite' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4AF37', animation: 'hintDot 0.8s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37' }}>{totalHinted} number{totalHinted !== 1 ? 's' : ''} called on your card{numCards > 1 ? 's' : ''} — click to daub!</span>
              </div>
            )}

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cardColumns}, auto)`, gap: 14, justifyContent: 'center' }}>
              {cards.map((card, ci) => (
                <BingoCard
                  key={ci}
                  cardIdx={ci}
                  card={card}
                  daubed={daubed[ci] || []}
                  hinted={hinted}
                  winCells={winCells.get(ci) || new Set()}
                  cellSize={cellSize}
                  onDaub={daubCell}
                  isWinner={winCells.has(ci)}
                  label={numCards > 1 ? `CARD ${ci + 1}` : undefined}
                  phase={phase}
                  onClaimBingo={claimBingo}
                  bingoFeedback={bingoFeedback}
                  skin={cardSkin}
                />
              ))}
            </div>

            {/* Win celebration */}
            {phase === 'won' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "'Cinzel',serif", background: 'linear-gradient(135deg,#D4AF37,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.7))' }}>BINGO!</div>
                <div style={{ fontSize: 18, color: '#D4AF37', fontWeight: 700, marginTop: 4 }}>{winPattern}</div>
                <button onClick={startGame} style={{ marginTop: 20, padding: '12px 36px', borderRadius: 12, fontWeight: 900, fontSize: 16, background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,175,55,0.4)', fontFamily: "'Cinzel',serif" }}>
                  PLAY AGAIN
                </button>
              </div>
            )}

            {phase === 'gameover' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 20, color: '#e5e7eb', fontWeight: 700 }}>All 75 balls called — no BINGO this round</div>
                <button onClick={startGame} style={{ marginTop: 16, padding: '12px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14, background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000', border: 'none', cursor: 'pointer' }}>TRY AGAIN</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM BINGO BUTTON BAR */}
      {(phase === 'playing' || phase === 'won') && (
        <div style={{ background: 'rgba(5,5,5,0.99)', borderTop: '2px solid rgba(212,175,55,0.2)', boxShadow: '0 -4px 20px rgba(0,0,0,0.7)', flexShrink: 0, padding: '8px 12px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* Hint count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.15em' }}>HINTS</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: totalHinted > 0 ? '#D4AF37' : '#d1d5db' }}>{totalHinted}</div>
            </div>

            {/* BINGO! BUTTON */}
            <button onClick={claimBingo} disabled={phase !== 'playing'} style={{
              padding: '12px 24px', borderRadius: 14, fontWeight: 900, fontSize: 18,
              fontFamily: "'Cinzel',serif",
              background: bingoFeedback === 'valid' ? 'linear-gradient(135deg,#1B5E20,#43A047)' : bingoFeedback === 'invalid' ? 'linear-gradient(135deg,#B71C1C,#E53935)' : phase === 'won' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#D4AF37,#B8860B)',
              color: phase === 'won' ? 'rgba(255,255,255,0.6)' : bingoFeedback !== 'none' ? '#fff' : '#000',
              border: 'none',
              cursor: phase !== 'playing' ? 'default' : 'pointer',
              boxShadow: phase === 'won' ? 'none' : bingoFeedback === 'invalid' ? '0 4px 20px rgba(183,28,28,0.6)' : '0 4px 28px rgba(212,175,55,0.5), 0 0 0 3px rgba(212,175,55,0.15)',
              letterSpacing: '0.12em',
              animation: bingoFeedback === 'invalid' ? 'bingoShake 0.4s ease-in-out' : bingoFeedback === 'valid' ? 'bingoFlash 0.6s ease-in-out' : 'none',
              transition: 'background 0.3s, box-shadow 0.3s',
              minHeight: '52px',
              flex: '1 0 auto',
              maxWidth: '200px',
            }}>
              {bingoFeedback === 'valid' ? 'BINGO!' : bingoFeedback === 'invalid' ? 'NOT YET' : 'BINGO!'}
            </button>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.15em' }}>CALLED</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#e5e7eb' }}>{calledNumbers.length}<span style={{ fontSize: 10, color: '#d1d5db' }}>/75</span></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#d1d5db', letterSpacing: '0.15em' }}>WIN</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37' }}>{fmtPc(betAmount * numCards * WIN_PAYOUTS.Line)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent style={{ background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(212,175,55,0.4)', maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: '#D4AF37' }}>How to Play — 75-Ball Bingo</DialogTitle>
          </DialogHeader>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.8 }}>
            <p><strong style={{ color: '#D4AF37' }}>1.</strong> Buy 1–5 cards. The center FREE space is daubed automatically.</p>
            <p><strong style={{ color: '#D4AF37' }}>2.</strong> Click <em>DRAW BALL</em> or enable <em>AUTO PLAY</em>. The ball machine calls a number.</p>
            <p><strong style={{ color: '#D4AF37' }}>3.</strong> When your number is called, it glows gold on your card. <strong>Click it to daub it.</strong> The hint stays so you never lose track.</p>
            <p><strong style={{ color: '#D4AF37' }}>4.</strong> When you have a winning pattern, hit the big <strong>BINGO!</strong> button to claim your win.</p>
            <p style={{ marginTop: 12, fontWeight: 700, color: '#D4AF37' }}>Win Patterns:</p>
            {Object.entries(WIN_PAYOUTS).map(([p, m]) => <div key={p} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '3px 0' }}><span>{p === 'Line' ? 'Line (any row or column)' : p === 'Diagonal' ? 'Diagonal (corner to corner)' : p}</span><strong style={{ color: '#D4AF37' }}>{m}× total cost</strong></div>)}
            <p style={{ marginTop: 10, fontSize: 11, color: '#d1d5db' }}>Playing with multiple cards multiplies your total bet AND your prize. You can win on any one card.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
