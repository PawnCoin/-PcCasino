import React, { useState, useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
import { Settings, RotateCcw, Zap, GraduationCap, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InGameTopBar } from '@/components/InGameTopBar';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tile { left: number; right: number; id: string }

interface PlacedTile {
  tile: Tile;
  dispLeft: number;
  dispRight: number;
  isDouble: boolean;
}

interface DomPlayer {
  id: string; name: string; avatar: string;
  hand: Tile[]; isHuman: boolean; score: number;
}

type Phase = 'setup' | 'playing' | 'roundOver';
type GameMode = 'real' | 'practice';
type SkinKey = keyof typeof DOMINO_SKINS;
type TableKey = keyof typeof TABLE_SKINS;
type TileSize = 'sm' | 'md' | 'lg';

interface DominoSkinConfig {
  name: string;
  bg: string;
  pip: string;
  border: string;
  divider: string;
  gloss?: boolean;
  glow?: string;
  faceDownBg?: string;
}

interface TableSkinConfig {
  name: string;
  felt: string | string[];
  border: string;
  line: string;
  gloss?: boolean;
}

interface GS {
  phase: Phase;
  mode: GameMode;
  players: DomPlayer[];
  boneyard: Tile[];
  chain: PlacedTile[];
  leftVal: number;
  rightVal: number;
  currentPlayer: number;
  consecutivePasses: number;
  bet: number;
  roundWinner: string;
  roundScore: number;
  practiceGamesLeft: number;
}

type Action =
  | { type: 'START'; mode: GameMode; bet: number }
  | { type: 'PLAY_TILE'; playerId: string; tileId: string; end: 'left' | 'right' }
  | { type: 'DRAW' }
  | { type: 'PASS' }
  | { type: 'RESET' }
  | { type: 'SET_BET'; bet: number };

// ─── Domino Skin configs ───────────────────────────────────────────────────────
const DOMINO_SKINS: Record<string, DominoSkinConfig> = {
  ivory: {
    name: 'Classic Ivory', bg: '#F2EDD7', pip: '#111',
    border: '#B8A880', divider: '#C0A878',
  },
  black: {
    name: 'Obsidian', bg: '#1C1C1C', pip: '#E8E8E8',
    border: '#555', divider: '#444',
  },
  neon: {
    name: 'Neon Cyber', bg: '#080818', pip: '#00FFEE',
    border: '#FF00CC', divider: '#FF00CC',
    glow: 'rgba(255,0,204,0.7)',
  },
  gold: {
    name: 'Vegas Gold', bg: '#120E00', pip: '#FFD700',
    border: '#8B6914', divider: '#8B6914',
    glow: 'rgba(255,215,0,0.45)',
  },
  shinyGold: {
    name: 'Shiny Gold',
    bg: 'linear-gradient(145deg,#ffe066 0%,#d4a000 30%,#ffe680 55%,#b8860b 80%,#ffd700 100%)',
    pip: '#1a0800', border: '#C8930A', divider: '#9A6800',
    gloss: true, glow: 'rgba(255,210,0,0.65)',
    faceDownBg: 'linear-gradient(145deg,#9A6800,#C8930A,#9A6800)',
  },
  silver: {
    name: 'Sterling Silver',
    bg: 'linear-gradient(145deg,#b0b0b0 0%,#e8e8e8 35%,#a0a0a0 60%,#d8d8d8 100%)',
    pip: '#222', border: '#888', divider: '#6a6a6a',
    gloss: true, glow: 'rgba(180,180,180,0.4)',
  },
  platinum: {
    name: 'Platinum',
    bg: 'linear-gradient(145deg,#d4d4e8 0%,#ffffff 40%,#c8c8e0 65%,#eeeeff 100%)',
    pip: '#333', border: '#AAAACC', divider: '#9090B8',
    gloss: true, glow: 'rgba(180,180,255,0.5)',
  },
  water: {
    name: 'Ocean Water',
    bg: 'linear-gradient(145deg,rgba(0,90,170,0.92) 0%,rgba(0,160,240,0.88) 45%,rgba(0,200,255,0.85) 70%,rgba(0,100,180,0.92) 100%)',
    pip: '#e0f8ff', border: 'rgba(0,200,255,0.7)', divider: 'rgba(80,220,255,0.6)',
    gloss: true, glow: 'rgba(0,160,255,0.6)',
  },
  glass: {
    name: 'Frosted Glass',
    bg: 'rgba(255,255,255,0.10)',
    pip: 'rgba(255,255,255,0.95)', border: 'rgba(255,255,255,0.30)', divider: 'rgba(255,255,255,0.22)',
    gloss: true, glow: 'rgba(255,255,255,0.25)',
    faceDownBg: 'rgba(100,120,180,0.25)',
  },
  roseGold: {
    name: 'Rose Gold',
    bg: 'linear-gradient(145deg,#c97b5a 0%,#e8a87c 30%,#d4886a 60%,#b86a50 100%)',
    pip: '#fff8f5', border: '#C07050', divider: '#9E5A3A',
    gloss: true, glow: 'rgba(220,120,90,0.5)',
  },
  emerald: {
    name: 'Emerald',
    bg: 'linear-gradient(145deg,#0a3d22 0%,#1e7a44 35%,#0d5a30 65%,#0a3d22 100%)',
    pip: '#a0ffd0', border: '#0D7A47', divider: '#085530',
    gloss: true, glow: 'rgba(20,180,90,0.6)',
  },
  crystal: {
    name: 'Crystal Blue',
    bg: 'linear-gradient(145deg,rgba(80,130,230,0.55) 0%,rgba(160,210,255,0.65) 45%,rgba(60,110,220,0.55) 100%)',
    pip: '#ffffff', border: 'rgba(100,180,255,0.8)', divider: 'rgba(80,150,255,0.6)',
    gloss: true, glow: 'rgba(80,160,255,0.7)',
  },
  obsidianFire: {
    name: 'Obsidian Fire',
    bg: 'linear-gradient(145deg,#0a0000 0%,#1a0505 50%,#0a0000 100%)',
    pip: '#FF4500', border: '#CC2200', divider: '#881100',
    glow: 'rgba(255,69,0,0.7)',
  },
};

// ─── Table Skin configs ────────────────────────────────────────────────────────
const TABLE_SKINS: Record<string, TableSkinConfig> = {
  wood: {
    name: 'Mahogany', felt: '#2B4A1A', border: '#5D3A1A', line: '#3A6025',
  },
  marble: {
    name: 'Marble', felt: '#253545', border: '#7090B0', line: '#4A70A0',
  },
  neon: {
    name: 'Neon Grid', felt: '#080018', border: '#3300CC', line: '#5500FF',
  },
  glass: {
    name: 'Glass', felt: 'rgba(20,60,100,0.5)', border: 'rgba(80,180,255,0.4)', line: 'rgba(100,200,255,0.25)',
    gloss: true,
  },
  velvet: {
    name: 'Red Velvet', felt: '#3D0A0A', border: '#8B1A1A', line: '#6B1010',
  },
  ocean: {
    name: 'Deep Ocean', felt: '#0A1F3A', border: '#1A4A8A', line: '#1A3A6A',
  },
  emerald: {
    name: 'Emerald', felt: '#062A14', border: '#1A6A3A', line: '#0A4A2A',
  },
  gold: {
    name: 'Gold Luxury', felt: '#100A00', border: '#8B6914', line: '#6B4900',
  },
  midnight: {
    name: 'Midnight Sky', felt: '#050510', border: '#1A1A5A', line: '#0A0A3A',
  },
  slate: {
    name: 'Dark Slate', felt: '#14141E', border: '#3A3A5A', line: '#222240',
  },
};

// ─── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_W = 5000;
const CANVAS_H = 600;
const CANVAS_CX = 2500;
const CANVAS_CY = 300;

const TILE_DIMS: Record<TileSize, { long: number; short: number; pip: number }> = {
  sm: { long: 60, short: 30, pip: 20 },
  md: { long: 76, short: 38, pip: 26 },
  lg: { long: 96, short: 48, pip: 32 },
};
const TILE_GAP = 5;

// ─── Domino set ───────────────────────────────────────────────────────────────
function makeDominoSet(): Tile[] {
  const set: Tile[] = [];
  let id = 0;
  for (let i = 0; i <= 6; i++)
    for (let j = i; j <= 6; j++)
      set.push({ left: i, right: j, id: `d${id++}` });
  return set;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlay(tile: Tile, leftVal: number, rightVal: number, chainEmpty: boolean): boolean {
  if (chainEmpty) return true;
  return tile.left === leftVal || tile.right === leftVal ||
         tile.left === rightVal || tile.right === rightVal;
}

function canPlayEnd(tile: Tile, end: 'left' | 'right', leftVal: number, rightVal: number): boolean {
  const v = end === 'left' ? leftVal : rightVal;
  return tile.left === v || tile.right === v;
}

function placeRight(tile: Tile, rightVal: number): { pt: PlacedTile; newRight: number } {
  const isDouble = tile.left === tile.right;
  if (tile.left === rightVal) return { pt: { tile, dispLeft: tile.left, dispRight: tile.right, isDouble }, newRight: tile.right };
  return { pt: { tile, dispLeft: tile.right, dispRight: tile.left, isDouble }, newRight: tile.left };
}

function placeLeft(tile: Tile, leftVal: number): { pt: PlacedTile; newLeft: number } {
  const isDouble = tile.left === tile.right;
  if (tile.right === leftVal) return { pt: { tile, dispLeft: tile.left, dispRight: tile.right, isDouble }, newLeft: tile.left };
  return { pt: { tile, dispLeft: tile.right, dispRight: tile.left, isDouble }, newLeft: tile.right };
}

function handPips(hand: Tile[]) { return hand.reduce((s, t) => s + t.left + t.right, 0); }

function aiChoose(hand: Tile[], leftVal: number, rightVal: number, chainEmpty: boolean): { tile: Tile; end: 'left' | 'right' } | null {
  const playable = hand.filter(t => canPlay(t, leftVal, rightVal, chainEmpty));
  if (playable.length === 0) return null;
  playable.sort((a, b) => (b.left + b.right) - (a.left + a.right));
  const tile = playable[0];
  if (chainEmpty) return { tile, end: 'right' };
  const end = canPlayEnd(tile, 'right', leftVal, rightVal) ? 'right' : 'left';
  return { tile, end };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function initGS(): GS {
  return {
    phase: 'setup', mode: 'real',
    players: [], boneyard: [], chain: [],
    leftVal: -1, rightVal: -1,
    currentPlayer: 0, consecutivePasses: 0,
    bet: 10, roundWinner: '', roundScore: 0,
    practiceGamesLeft: 3,
  };
}

function gsReducer(state: GS, action: Action): GS {
  switch (action.type) {
    case 'SET_BET': return { ...state, bet: action.bet };
    case 'START': {
      const set = shuffle(makeDominoSet());
      const players: DomPlayer[] = [
        { id: 'human', name: 'You',    avatar: '🎲', hand: set.slice(0, 7),  isHuman: true,  score: 0 },
        { id: 'ai1',   name: 'Carlos', avatar: '🤖', hand: set.slice(7, 14), isHuman: false, score: 0 },
        { id: 'ai2',   name: 'Maya',   avatar: '🦾', hand: set.slice(14,21), isHuman: false, score: 0 },
        { id: 'ai3',   name: 'Zara',   avatar: '🎰', hand: set.slice(21,28), isHuman: false, score: 0 },
      ];
      return {
        ...state, phase: 'playing', mode: action.mode, bet: action.bet,
        players, boneyard: set.slice(28), chain: [],
        leftVal: -1, rightVal: -1, currentPlayer: 0, consecutivePasses: 0,
        roundWinner: '', roundScore: 0,
        practiceGamesLeft: action.mode === 'practice' ? state.practiceGamesLeft - 1 : state.practiceGamesLeft,
      };
    }
    case 'PLAY_TILE': {
      const pIdx = state.players.findIndex(p => p.id === action.playerId);
      if (pIdx < 0) return state;
      const player = state.players[pIdx];
      const tile = player.hand.find(t => t.id === action.tileId);
      if (!tile) return state;
      const chainEmpty = state.chain.length === 0;
      if (!chainEmpty && !canPlayEnd(tile, action.end, state.leftVal, state.rightVal)) return state;
      const newHand = player.hand.filter(t => t.id !== tile.id);
      let newChain: PlacedTile[];
      let newLeft = state.leftVal;
      let newRight = state.rightVal;
      if (chainEmpty) {
        const isDouble = tile.left === tile.right;
        newChain = [{ tile, dispLeft: tile.left, dispRight: tile.right, isDouble }];
        newLeft = tile.left; newRight = tile.right;
      } else if (action.end === 'right') {
        const { pt, newRight: nr } = placeRight(tile, state.rightVal);
        newChain = [...state.chain, pt]; newRight = nr;
      } else {
        const { pt, newLeft: nl } = placeLeft(tile, state.leftVal);
        newChain = [pt, ...state.chain]; newLeft = nl;
      }
      const newPlayers = state.players.map((p, i) => i === pIdx ? { ...p, hand: newHand } : p);
      if (newHand.length === 0) {
        const score = newPlayers.filter((_, i) => i !== pIdx).reduce((sum, p) => sum + handPips(p.hand), 0);
        newPlayers[pIdx] = { ...newPlayers[pIdx], score: newPlayers[pIdx].score + score };
        return { ...state, players: newPlayers, chain: newChain, leftVal: newLeft, rightVal: newRight, phase: 'roundOver', roundWinner: player.name, roundScore: score };
      }
      const next = (pIdx + 1) % newPlayers.length;
      return { ...state, players: newPlayers, chain: newChain, leftVal: newLeft, rightVal: newRight, currentPlayer: next, consecutivePasses: 0 };
    }
    case 'DRAW': {
      if (state.boneyard.length === 0) return state;
      const drawn = state.boneyard[0];
      return { ...state, boneyard: state.boneyard.slice(1), players: state.players.map(p => p.id === 'human' ? { ...p, hand: [...p.hand, drawn] } : p) };
    }
    case 'PASS': {
      const newPasses = state.consecutivePasses + 1;
      const next = (state.currentPlayer + 1) % state.players.length;
      if (newPasses >= state.players.length) {
        const pipsArr = state.players.map(p => ({ name: p.name, pips: handPips(p.hand) }));
        const winner = pipsArr.reduce((a, b) => a.pips <= b.pips ? a : b);
        return { ...state, phase: 'roundOver', roundWinner: winner.name, roundScore: 0, consecutivePasses: newPasses };
      }
      return { ...state, currentPlayer: next, consecutivePasses: newPasses };
    }
    case 'RESET': return { ...initGS(), practiceGamesLeft: state.practiceGamesLeft };
    default: return state;
  }
}

// ─── Audio ────────────────────────────────────────────────────────────────────
class DominoAudio {
  private ctx: AudioContext | null = null;
  muted = false;
  private getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return this.ctx;
  }
  private tone(freq: number, gain: number, decay: number, type: OscillatorType = 'sine') {
    if (this.muted) return;
    try {
      const c = this.getCtx();
      const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + decay);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + decay);
    } catch (_) {}
  }
  private noise(gainVal: number, freq = 2800, q = 0.8, dur = 0.05) {
    if (this.muted) return;
    try {
      const c = this.getCtx();
      const n = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.15));
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.value = gainVal;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    } catch (_) {}
  }
  pickUp() { this.noise(0.35, 3000, 1, 0.04); }
  place()  { this.noise(0.65, 2600, 0.7, 0.06); this.tone(160, 0.3, 0.12, 'triangle'); }
  draw()   { this.tone(380, 0.18, 0.06); }
  win()    { [0,110,220,370].forEach((d, i) => setTimeout(() => this.tone(440 + i*110, 0.5, 0.3), d)); }
  slam() {
    this.noise(1.4, 500, 0.5, 0.08);
    this.tone(55, 0.9, 0.4, 'sawtooth');
    setTimeout(() => this.tone(110, 0.5, 0.3, 'triangle'), 80);
    if (this.muted) return;
    try {
      const c = this.getCtx();
      const n = Math.floor(c.sampleRate * 0.8);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        d[i] = Math.sin(2 * Math.PI * 38 * t) * Math.exp(-t * 5) * (0.9 + Math.random() * 0.2);
      }
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.value = 2.2;
      src.connect(g); g.connect(c.destination); src.start();
    } catch (_) {}
  }
  crack() {
    if (this.muted) return;
    try {
      const c = this.getCtx();
      const n = Math.floor(c.sampleRate * 1.2);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 5) * (t < 0.04 ? 1 : 0.25);
      }
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const g = c.createGain(); g.gain.value = 1.8;
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    } catch (_) {}
  }
}

const audio = new DominoAudio();

// ─── Pip face ─────────────────────────────────────────────────────────────────
const PIPS: Record<number, [number, number][]> = {
  0: [],
  1: [[50,50]],
  2: [[28,28],[72,72]],
  3: [[28,28],[50,50],[72,72]],
  4: [[28,28],[72,28],[28,72],[72,72]],
  5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};

function PipFace({ value, color, size }: { value: number; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
      {PIPS[value]?.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={13} fill={color}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
      ))}
    </svg>
  );
}

// ─── Tile visual ──────────────────────────────────────────────────────────────
function DominoTileView({
  dispLeft, dispRight, isDouble, selected, playable, faceDown,
  skinKey, tileSize = 'md', onClick,
}: {
  dispLeft: number; dispRight: number; isDouble: boolean;
  selected?: boolean; playable?: boolean; faceDown?: boolean;
  skinKey: SkinKey; tileSize?: TileSize;
  onClick?: () => void;
}) {
  const skin = DOMINO_SKINS[skinKey] ?? DOMINO_SKINS.ivory;
  const dim = TILE_DIMS[tileSize];
  const isVert = isDouble;
  const W = isVert ? dim.short : dim.long;
  const H = isVert ? dim.long  : dim.short;
  const flexDir: React.CSSProperties['flexDirection'] = isVert ? 'column' : 'row';

  const faceDownBg = skin.faceDownBg
    ?? 'repeating-linear-gradient(45deg,#222 0,#222 4px,#1a1a1a 4px,#1a1a1a 8px)';

  const glowStr = skin.glow
    ? (selected
        ? `0 0 18px rgba(212,175,55,0.95), 0 0 12px ${skin.glow}, 0 4px 12px rgba(0,0,0,.7)`
        : playable
        ? `0 0 14px rgba(67,196,80,0.75), 0 0 8px ${skin.glow}, 0 3px 8px rgba(0,0,0,.6)`
        : `0 0 10px ${skin.glow}, 0 3px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)`)
    : (selected
        ? '0 0 18px rgba(212,175,55,0.95), 0 4px 12px rgba(0,0,0,.7)'
        : playable
        ? '0 0 14px rgba(67,196,80,0.75), 0 3px 8px rgba(0,0,0,.6)'
        : '0 3px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)');

  const borderColor = selected ? '#D4AF37' : playable ? '#43C450' : skin.border;

  return (
    <div
      onClick={onClick}
      style={{
        width: W, height: H, flexShrink: 0, position: 'relative',
        background: faceDown ? faceDownBg : skin.bg,
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        display: 'flex', flexDirection: flexDir,
        alignItems: 'center', justifyContent: 'space-around',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: glowStr,
        transform: selected ? 'translateY(-10px) scale(1.08)' : playable ? 'translateY(-4px)' : 'none',
        transition: 'all .18s ease',
        backdropFilter: skin.bg.startsWith('rgba') ? 'blur(8px)' : undefined,
        WebkitBackdropFilter: skin.bg.startsWith('rgba') ? 'blur(8px)' : undefined,
        overflow: 'hidden',
      }}
    >
      {/* Glass gloss overlay */}
      {skin.gloss && !faceDown && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 4, pointerEvents: 'none', zIndex: 10,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.12) 100%)',
        }} />
      )}

      {!faceDown && (
        <>
          <PipFace value={dispLeft} color={skin.pip} size={dim.pip} />
          <div style={{
            background: skin.divider, flexShrink: 0,
            width:  isVert ? '78%' : 2,
            height: isVert ? 2    : '78%',
          }} />
          <PipFace value={dispRight} color={skin.pip} size={dim.pip} />
        </>
      )}
    </div>
  );
}

// ─── Crack overlay ────────────────────────────────────────────────────────────
function CrackOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <svg width="100%" height="100%" viewBox="0 0 600 300" style={{ position: 'absolute', inset: 0 }}>
        {[
          'M300,150 L200,60 L160,10','M300,150 L420,70 L480,20',
          'M300,150 L140,180 L60,220','M300,150 L450,200 L540,260',
          'M300,150 L290,270 L270,300','M300,150 L340,280 L360,300',
        ].map((d, i) => (
          <path key={i} d={d} stroke="rgba(255,255,255,0.55)" strokeWidth={2 - i * 0.15}
            fill="none" strokeLinecap="round"
            style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: `crackDraw 0.35s ${i * 0.025}s ease-out forwards` }} />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%,rgba(255,210,60,.22) 0%,transparent 60%)',
        animation: 'flashFade .5s ease-out forwards',
      }} />
    </div>
  );
}

// ─── SkinCard preview button ──────────────────────────────────────────────────
function SkinCard({ skinKey, active, onClick }: { skinKey: string; active: boolean; onClick: () => void }) {
  const skin = DOMINO_SKINS[skinKey];
  const dim = TILE_DIMS.sm;
  return (
    <button onClick={onClick} style={{
      borderRadius: 10, cursor: 'pointer',
      border: `2px solid ${active ? '#D4AF37' : 'rgba(255,255,255,0.07)'}`,
      background: active ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      padding: '8px 6px',
      transition: 'all .15s',
      boxShadow: active ? '0 0 8px rgba(212,175,55,0.3)' : 'none',
    }}>
      {/* Mini tile preview */}
      <div style={{
        width: dim.long, height: dim.short, borderRadius: 4,
        background: skin.bg, border: `1.5px solid ${skin.border}`,
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        overflow: 'hidden', position: 'relative', flexShrink: 0,
        boxShadow: skin.glow ? `0 0 6px ${skin.glow}` : '0 2px 4px rgba(0,0,0,0.5)',
      }}>
        {skin.gloss && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.35) 0%,transparent 55%)', pointerEvents: 'none', zIndex: 2 }} />
        )}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: skin.pip, flexShrink: 0 }} />
        <div style={{ width: 1.5, height: '70%', background: skin.divider, flexShrink: 0 }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: skin.pip, flexShrink: 0 }} />
      </div>
      <span style={{ fontSize: 9, color: active ? '#D4AF37' : '#666', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
        {skin.name}
      </span>
    </button>
  );
}

function TableCard({ tableKey, active, onClick }: { tableKey: string; active: boolean; onClick: () => void }) {
  const t = TABLE_SKINS[tableKey];
  const felt = Array.isArray(t.felt) ? t.felt[0] : t.felt;
  return (
    <button onClick={onClick} style={{
      padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
      border: `2px solid ${active ? '#D4AF37' : 'rgba(255,255,255,0.07)'}`,
      background: active ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      transition: 'all .15s',
      boxShadow: active ? '0 0 8px rgba(212,175,55,0.3)' : 'none',
    }}>
      <div style={{
        width: 40, height: 24, borderRadius: 5,
        background: felt, border: `1.5px solid ${t.border}`,
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.2,
          backgroundImage: `repeating-linear-gradient(0deg,${t.line} 0,${t.line} 1px,transparent 1px,transparent 12px),repeating-linear-gradient(90deg,${t.line} 0,${t.line} 1px,transparent 1px,transparent 12px)`,
        }} />
      </div>
      <span style={{ fontSize: 9, color: active ? '#D4AF37' : '#666', fontWeight: 700, whiteSpace: 'nowrap' }}>{t.name}</span>
    </button>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 46, height: 25, borderRadius: 13, border: 'none', cursor: 'pointer',
      background: on ? '#D4AF37' : '#333', position: 'relative', transition: 'background .2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 24 : 3, width: 19, height: 19,
        borderRadius: '50%', background: '#fff', transition: 'left .2s',
      }} />
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface DominoesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
}

export function DominoesGame({ balance, onBack, onBet, onWin, onAddBalance }: DominoesGameProps) {
  const [gs, dispatch] = useReducer(gsReducer, undefined, initGS);
  const [muted, setMuted] = useState(false);
  const [slamOn, setSlamOn] = useState(true);
  const [dominoSkin, setDominoSkin] = useState<SkinKey>('ivory');
  const [tableSkin, setTableSkin] = useState<TableKey>('wood');
  const [tileSize, setTileSize] = useState<TileSize>('md');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [betConfirmed, setBetConfirmed] = useState(false);

  // 2D board layout tracking
  const [chainCenterIdx, setChainCenterIdx] = useState(0);
  const prevChainRef = useRef<PlacedTile[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { audio.muted = muted; }, [muted]);

  // ─── Track chainCenterIdx when tiles are added left vs right ────────────────
  useEffect(() => {
    const prev = prevChainRef.current;
    const cur = gs.chain;

    if (cur.length === 0) {
      setChainCenterIdx(0);
    } else if (cur.length === 1) {
      setChainCenterIdx(0);
    } else if (cur.length > prev.length && prev.length > 0) {
      if (cur[0].tile.id !== prev[0].tile.id) {
        setChainCenterIdx(ci => ci + 1);
      }
    } else if (cur.length < prev.length) {
      setChainCenterIdx(0);
    }
    prevChainRef.current = cur;
  }, [gs.chain]);

  // ─── Compute 2D tile positions ──────────────────────────────────────────────
  const chainPositions = useMemo(() => {
    const chain = gs.chain;
    if (!chain.length) return [];
    const dim = TILE_DIMS[tileSize];
    const GAP = TILE_GAP;

    const positions: { x: number; y: number; w: number; h: number }[] = new Array(chain.length);
    const ci = Math.min(chainCenterIdx, chain.length - 1);

    // Center tile
    const ct = chain[ci];
    const ctW = ct.isDouble ? dim.short : dim.long;
    const ctH = ct.isDouble ? dim.long  : dim.short;
    positions[ci] = { x: CANVAS_CX - ctW / 2, y: CANVAS_CY - ctH / 2, w: ctW, h: ctH };

    // Right side
    let rx = CANVAS_CX + ctW / 2 + GAP;
    for (let i = ci + 1; i < chain.length; i++) {
      const pt = chain[i];
      const w = pt.isDouble ? dim.short : dim.long;
      const h = pt.isDouble ? dim.long  : dim.short;
      positions[i] = { x: rx, y: CANVAS_CY - h / 2, w, h };
      rx += w + GAP;
    }

    // Left side
    let lx = CANVAS_CX - ctW / 2 - GAP;
    for (let i = ci - 1; i >= 0; i--) {
      const pt = chain[i];
      const w = pt.isDouble ? dim.short : dim.long;
      const h = pt.isDouble ? dim.long  : dim.short;
      lx -= w;
      positions[i] = { x: lx, y: CANVAS_CY - h / 2, w, h };
      lx -= GAP;
    }

    return positions;
  }, [gs.chain, chainCenterIdx, tileSize]);

  // ─── Auto-center board when game starts ─────────────────────────────────────
  useEffect(() => {
    if (gs.phase === 'playing' && boardRef.current) {
      const b = boardRef.current;
      b.scrollLeft = CANVAS_CX - b.clientWidth / 2;
      b.scrollTop  = CANVAS_CY - b.clientHeight / 2;
    }
  }, [gs.phase]);

  // ─── Auto-scroll to newest tile ─────────────────────────────────────────────
  useEffect(() => {
    if (!boardRef.current || !chainPositions.length) return;
    const b = boardRef.current;
    const last = chainPositions[gs.chain.length - 1];
    if (!last) return;
    const rightEdge = last.x + last.w + 40;
    const leftEdge  = (chainPositions[0]?.x ?? 0) - 40;
    if (rightEdge > b.scrollLeft + b.clientWidth - 20) {
      b.scrollLeft = rightEdge - b.clientWidth + 60;
    } else if (leftEdge < b.scrollLeft + 20) {
      b.scrollLeft = leftEdge - 60;
    }
  }, [chainPositions, gs.chain.length]);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const isHumanTurn = gs.phase === 'playing' && gs.players[gs.currentPlayer]?.id === 'human';
  const humanPlayer = gs.players.find(p => p.isHuman);
  const aiPlayers   = gs.players.filter(p => !p.isHuman);
  const chainEmpty  = gs.chain.length === 0;

  const playableIds = new Set<string>();
  if (isHumanTurn && humanPlayer) {
    humanPlayer.hand.forEach(t => {
      if (canPlay(t, gs.leftVal, gs.rightVal, chainEmpty)) playableIds.add(t.id);
    });
  }

  const canDraw    = isHumanTurn && playableIds.size === 0 && gs.boneyard.length > 0;
  const canPass    = isHumanTurn && playableIds.size === 0 && gs.boneyard.length === 0;
  const selectedTile  = humanPlayer?.hand.find(t => t.id === selectedTileId) ?? null;
  const canPlayLeft  = !!selectedTile && !chainEmpty && canPlayEnd(selectedTile, 'left',  gs.leftVal, gs.rightVal);
  const canPlayRight = !!selectedTile && !chainEmpty && canPlayEnd(selectedTile, 'right', gs.leftVal, gs.rightVal);

  // ─── AI turn ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const player = gs.players[gs.currentPlayer];
    if (!player || player.isHuman) return;
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(() => {
      const choice = aiChoose(player.hand, gs.leftVal, gs.rightVal, chainEmpty);
      if (choice) { audio.place(); dispatch({ type: 'PLAY_TILE', playerId: player.id, tileId: choice.tile.id, end: choice.end }); }
      else dispatch({ type: 'PASS' });
    }, 700 + Math.random() * 500);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.currentPlayer, gs.phase]);

  // ─── Round over effect ──────────────────────────────────────────────────────
  const prevPhase = useRef<Phase>('setup');
  useEffect(() => {
    if (gs.phase === 'roundOver' && prevPhase.current !== 'roundOver') {
      const humanWon = gs.roundWinner === 'You';
      if (humanWon) {
        if (slamOn) { setShaking(true); setCracking(true); setTimeout(() => { setShaking(false); setCracking(false); }, 900); }
        audio.slam(); setTimeout(() => audio.crack(), 160); audio.win();
        if (gs.mode === 'real') { const w = gs.bet * 3; onWin(w); toast.success(`DOMINO OUT! You won ${w} $Pc!`); }
        else toast.success('DOMINO OUT! Great job! (Practice — no payout)');
      } else {
        gs.mode === 'real' ? toast.error(`${gs.roundWinner} dominoed out!`) : toast.info(`${gs.roundWinner} wins this practice round.`);
      }
    }
    prevPhase.current = gs.phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.phase, gs.roundWinner]);

  // ─── Human actions ──────────────────────────────────────────────────────────
  const handleTileClick = (tileId: string) => {
    if (!isHumanTurn) return;
    if (!playableIds.has(tileId)) { toast.error("That tile can't be played here"); return; }
    audio.pickUp();
    setSelectedTileId(prev => prev === tileId ? null : tileId);
  };

  const handlePlayEnd = (end: 'left' | 'right') => {
    if (!selectedTileId) return;
    audio.place();
    dispatch({ type: 'PLAY_TILE', playerId: 'human', tileId: selectedTileId, end });
    setSelectedTileId(null);
  };

  const handlePlayFirst = () => {
    if (!selectedTileId) return;
    audio.place();
    dispatch({ type: 'PLAY_TILE', playerId: 'human', tileId: selectedTileId, end: 'right' });
    setSelectedTileId(null);
  };

  const handleDraw = () => { if (!canDraw) return; audio.draw(); dispatch({ type: 'DRAW' }); toast.info('Drew a tile from the boneyard'); };
  const handlePass = () => { if (!canPass) return; dispatch({ type: 'PASS' }); toast.info('Turn passed'); };

  const confirmBet = () => {
    if (balance < gs.bet) { toast.error('Insufficient balance!'); return; }
    setBetConfirmed(true);
    toast.success(`${gs.bet} $Pc bet locked in!`);
  };

  const startGame = (mode: GameMode) => {
    if (mode === 'real') { if (!betConfirmed) return; if (!onBet(gs.bet)) return; }
    dispatch({ type: 'START', mode, bet: gs.bet });
    setSelectedTileId(null);
  };

  const table = TABLE_SKINS[tableSkin];
  const tableFelt = Array.isArray(table.felt) ? table.felt[0] : table.felt;

  let statusMsg = '';
  if (gs.phase === 'playing') {
    if (isHumanTurn) {
      if (selectedTile)    statusMsg = chainEmpty ? 'Play your tile to start the chain' : 'Choose which end to play on ↓';
      else if (canDraw)    statusMsg = 'No playable tile — draw from the boneyard';
      else if (canPass)    statusMsg = 'No moves — pass your turn';
      else                 statusMsg = 'Your turn — click a highlighted tile to play';
    } else {
      const cur = gs.players[gs.currentPlayer];
      statusMsg = cur ? `${cur.avatar} ${cur.name} is thinking...` : '';
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes crackDraw  { to { stroke-dashoffset: 0 } }
        @keyframes flashFade  { 0%{opacity:1} 100%{opacity:0} }
        @keyframes shake      {
          0%,100%{transform:translate(0)}
          10%{transform:translate(-8px,-5px)rotate(-1.2deg)}
          20%{transform:translate(8px,5px)rotate(1.2deg)}
          30%{transform:translate(-5px,3px)rotate(-.7deg)}
          40%{transform:translate(5px,-3px)rotate(.7deg)}
          50%{transform:translate(-3px,5px)rotate(-.3deg)}
          60%{transform:translate(3px,-5px)rotate(.3deg)}
          80%{transform:translate(-1px,2px)}
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop     { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse   { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes tileLand { from{opacity:0;transform:scale(0.6)translateY(-10px)} to{opacity:1;transform:scale(1)translateY(0)} }
        .domino-board::-webkit-scrollbar { width: 6px; height: 6px; }
        .domino-board::-webkit-scrollbar-track { background: transparent; }
        .domino-board::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 3px; }
      `}</style>

      {/* Header */}
      <InGameTopBar
        gameName="🁣 Dominoes"
        balance={balance}
        onBack={onBack}
        onAddBalance={onAddBalance}
        showShare
        rightSlot={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {gs.mode === 'practice' && gs.phase !== 'setup' && (
              <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(30,136,229,.18)', border: '1px solid rgba(30,136,229,.4)', color: '#42A5F5', fontSize: 11, fontWeight: 700 }}>PRACTICE</span>
            )}
            <button onClick={() => setShowSettings(s => !s)} style={{ background: 'none', border: 'none', color: showSettings ? '#D4AF37' : '#666', cursor: 'pointer' }}>
              <Settings size={20} />
            </button>
          </div>
        }
      />

      {/* ── Settings panel ── */}
      {showSettings && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 200,
          background: 'rgba(6,4,0,.98)', borderLeft: '1px solid rgba(212,175,55,.3)',
          padding: '18px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#D4AF37', fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>⚙ Settings</span>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
          </div>

          {/* Domino Skins */}
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Domino Skin</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {(Object.keys(DOMINO_SKINS) as SkinKey[]).map(k => (
                <SkinCard key={k} skinKey={k} active={dominoSkin === k} onClick={() => setDominoSkin(k)} />
              ))}
            </div>
          </div>

          {/* Table Themes */}
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Table Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {(Object.keys(TABLE_SKINS) as TableKey[]).map(k => (
                <TableCard key={k} tableKey={k} active={tableSkin === k} onClick={() => setTableSkin(k)} />
              ))}
            </div>
          </div>

          {/* Tile Size */}
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Tile Size</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['sm', 'md', 'lg'] as TileSize[]).map(sz => (
                <button key={sz} onClick={() => setTileSize(sz)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  background: tileSize === sz ? 'rgba(212,175,55,.18)' : 'rgba(255,255,255,.04)',
                  border: `2px solid ${tileSize === sz ? '#D4AF37' : 'rgba(255,255,255,.08)'}`,
                  color: tileSize === sz ? '#D4AF37' : '#666',
                }}>
                  {{ sm: 'Small', md: 'Medium', lg: 'Large' }[sz]}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Effects */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13 }}>Sound</div>
                <div style={{ color: '#555', fontSize: 11 }}>Tile click & game audio</div>
              </div>
              <Toggle on={!muted} onToggle={() => setMuted(m => !m)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13 }}>Slam Effect</div>
                <div style={{ color: '#555', fontSize: 11 }}>Table crack on domino-out</div>
              </div>
              <Toggle on={slamOn} onToggle={() => setSlamOn(s => !s)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Setup screen ── */}
      {gs.phase === 'setup' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(12,9,0,.97)', border: '1px solid rgba(212,175,55,.4)', borderRadius: 20, padding: 38, maxWidth: 440, width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,.85)', animation: 'slideUp .4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🁣🁢🁡</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 24, fontWeight: 800, color: '#D4AF37', letterSpacing: 3 }}>DOMINOES</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 3 }}>Classic Draw · Double-Six · 4 Players</div>
            </div>

            <div style={{ background: 'rgba(30,136,229,.08)', border: '1px solid rgba(30,136,229,.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <GraduationCap size={15} color="#42A5F5" />
                <span style={{ color: '#42A5F5', fontWeight: 700, fontSize: 13 }}>Practice Mode</span>
                <span style={{ marginLeft: 'auto', color: gs.practiceGamesLeft > 0 ? '#42A5F5' : '#EF5350', fontWeight: 700, fontSize: 13 }}>
                  {gs.practiceGamesLeft}/3 games left
                </span>
              </div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 10 }}>Learn the rules free. No bets, no payouts. Limited to 3 sessions.</div>
              <button
                onClick={() => gs.practiceGamesLeft > 0 && startGame('practice')}
                disabled={gs.practiceGamesLeft === 0}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                  cursor: gs.practiceGamesLeft > 0 ? 'pointer' : 'not-allowed',
                  background: gs.practiceGamesLeft > 0 ? 'rgba(30,136,229,.22)' : 'rgba(60,60,60,.3)',
                  color: gs.practiceGamesLeft > 0 ? '#42A5F5' : '#444',
                  fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                <GraduationCap size={14} />
                {gs.practiceGamesLeft > 0 ? 'Start Free Practice Game' : 'Practice Limit Reached'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.15)' }}>
              <div>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.15em', fontWeight: 700 }}>YOUR BALANCE</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#D4AF37' }}>{formatChipLabel(balance)} $Pc</div>
              </div>
              {onAddBalance && (
                <button onClick={() => onAddBalance(10_000)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)', color: '#66BB6A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <PlusCircle size={13} /> Get $Pc
                </button>
              )}
            </div>

            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, marginBottom: 8, letterSpacing: '0.1em' }}>PLAY FOR $Pc — SELECT BET</div>
            <div style={{ marginBottom: 12 }}>
              <ChipSelector selectedChip={gs.bet} onSelect={(amt) => { dispatch({ type: 'SET_BET', bet: amt }); setBetConfirmed(false); }} balance={balance} compact />
            </div>
            <div style={{ color: '#444', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>Win 3× your bet on domino-out!</div>
            {!betConfirmed ? (
              <button onClick={confirmBet} disabled={balance < gs.bet} style={{
                width: '100%', height: 46, borderRadius: 10, border: 'none',
                cursor: balance >= gs.bet ? 'pointer' : 'not-allowed',
                background: balance >= gs.bet ? 'linear-gradient(135deg,#D4AF37,#9A7A20)' : '#2a2a2a',
                color: balance >= gs.bet ? '#000' : '#555', fontWeight: 700, fontSize: 15,
              }}>Lock Bet ({formatChipLabel(gs.bet)} $Pc)</button>
            ) : (
              <button onClick={() => startGame('real')} style={{
                width: '100%', height: 46, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#43A047,#1B5E20)', color: '#fff', fontWeight: 700, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Zap size={17} /> Deal Tiles!
              </button>
            )}
            {betConfirmed && <div style={{ marginTop: 8, textAlign: 'center', color: '#43A047', fontSize: 12, fontWeight: 600 }}>✓ Bet locked — click Deal!</div>}
          </div>
        </div>
      )}

      {/* ── Round over ── */}
      {gs.phase === 'roundOver' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(12,9,0,.98)', border: '1px solid rgba(212,175,55,.5)', borderRadius: 20, padding: 46, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,.9)', animation: 'slideUp .5s ease' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{gs.roundWinner === 'You' ? '🏆' : '😔'}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 23, fontWeight: 800, color: gs.roundWinner === 'You' ? '#D4AF37' : '#EF5350', marginBottom: 8 }}>
              {gs.roundWinner === 'You' ? 'DOMINO OUT!' : `${gs.roundWinner} Wins!`}
            </div>
            {gs.roundScore > 0 && <div style={{ color: '#555', fontSize: 13, marginBottom: 5 }}>Score: {gs.roundScore} pips</div>}
            {gs.roundWinner === 'You' && gs.mode === 'real' && (
              <div style={{ color: '#43A047', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>+{gs.bet * 3} $Pc</div>
            )}
            {gs.mode === 'practice' && <div style={{ color: '#42A5F5', fontSize: 12, marginBottom: 6 }}>Practice round — no payout</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => { dispatch({ type: 'RESET' }); setBetConfirmed(false); }} style={{
                flex: 1, height: 46, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><RotateCcw size={14} /> Play Again</button>
              <button onClick={onBack} style={{
                flex: 1, height: 46, borderRadius: 10, cursor: 'pointer',
                background: 'none', border: '1px solid rgba(212,175,55,.35)', color: '#D4AF37', fontWeight: 600, fontSize: 14,
              }}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Playing ── */}
      {gs.phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: shaking ? 'shake .8s ease' : 'none' }}>

          {/* AI hands row */}
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', flexShrink: 0 }}>
            {aiPlayers.map((p, i) => {
              const active = gs.currentPlayer === i + 1;
              return (
                <div key={p.id} style={{
                  flex: 1, padding: '7px 9px', borderRadius: 10, transition: 'all .25s',
                  background: active ? 'rgba(212,175,55,.10)' : 'rgba(255,255,255,.02)',
                  border: `1px solid ${active ? 'rgba(212,175,55,.45)' : 'rgba(255,255,255,.05)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>{p.avatar}</span>
                    <span style={{ color: '#ccc', fontSize: 11, fontWeight: 600 }}>{p.name}</span>
                    {active && <span style={{ marginLeft: 'auto', display: 'block', width: 7, height: 7, borderRadius: '50%', background: '#D4AF37', animation: 'pulse 1s infinite' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {p.hand.map((_, ti) => (
                      <DominoTileView key={ti} dispLeft={0} dispRight={0} isDouble={false}
                        faceDown skinKey={dominoSkin} tileSize="sm" />
                    ))}
                  </div>
                  <div style={{ color: '#444', fontSize: 9, marginTop: 3 }}>{p.hand.length} tiles</div>
                </div>
              );
            })}
          </div>

          {/* ── 2D Table / Board ── */}
          <div style={{ flex: 1, margin: '0 12px', position: 'relative', minHeight: 0 }}>
            <div style={{
              height: '100%', minHeight: 200, borderRadius: 18, position: 'relative', overflow: 'hidden',
              background: tableFelt, border: `3px solid ${table.border}`,
              boxShadow: `inset 0 2px 24px rgba(0,0,0,.55), 0 0 0 5px rgba(0,0,0,.3)`,
            }}>
              {/* Felt grid texture */}
              <div style={{
                position: 'absolute', inset: 0, opacity: .05, pointerEvents: 'none',
                backgroundImage: `repeating-linear-gradient(0deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 36px),repeating-linear-gradient(90deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 36px)`,
              }} />

              {/* Table gloss for glass theme */}
              {table.gloss && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 60%)', borderRadius: 15 }} />
              )}

              {/* Corner decorations */}
              <div style={{ position: 'absolute', top: 7, left: 8, zIndex: 5, opacity: 0.7, fontSize: 18, pointerEvents: 'none', userSelect: 'none' }}>🥃</div>
              <div style={{ position: 'absolute', top: 7, right: 8, zIndex: 5, opacity: 0.65, fontSize: 16, pointerEvents: 'none', userSelect: 'none' }}>🚬</div>
              <div style={{ position: 'absolute', bottom: 7, left: 8, zIndex: 5, opacity: 0.65, fontSize: 16, pointerEvents: 'none', userSelect: 'none' }}>🍸</div>
              <div style={{ position: 'absolute', bottom: 7, right: 8, zIndex: 5, opacity: 0.65, fontSize: 15, pointerEvents: 'none', userSelect: 'none' }}>🍺</div>

              <CrackOverlay active={cracking} />

              {/* Boneyard count */}
              <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 6, padding: '3px 10px', borderRadius: 8, background: 'rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.07)', color: '#666', fontSize: 11 }}>
                🁣 {gs.boneyard.length} left
              </div>

              {/* End-value labels */}
              {!chainEmpty && (
                <>
                  <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 6, padding: '3px 10px', borderRadius: 14, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 800, fontSize: 15 }}>{gs.leftVal}</div>
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 6, padding: '3px 10px', borderRadius: 14, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 800, fontSize: 15 }}>{gs.rightVal}</div>
                </>
              )}

              {/* 2D scrollable canvas */}
              <div
                ref={boardRef}
                className="domino-board"
                style={{
                  position: 'absolute', inset: 0,
                  overflow: 'auto',
                  cursor: 'grab',
                }}
              >
                {/* Large canvas for 2D tile placement */}
                <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative', flexShrink: 0 }}>

                  {chainEmpty ? (
                    <div style={{
                      position: 'absolute',
                      left: CANVAS_CX, top: CANVAS_CY,
                      transform: 'translate(-50%, -50%)',
                      color: 'rgba(255,255,255,.18)', fontSize: 13, fontStyle: 'italic', whiteSpace: 'nowrap',
                    }}>
                      Play a tile to start the chain
                    </div>
                  ) : (
                    gs.chain.map((pt, i) => {
                      const pos = chainPositions[i];
                      if (!pos) return null;
                      const isNew = i === 0 || i === gs.chain.length - 1;
                      return (
                        <div
                          key={pt.tile.id}
                          style={{
                            position: 'absolute',
                            left: pos.x, top: pos.y,
                            animation: isNew ? 'tileLand 0.22s ease-out' : 'none',
                          }}
                        >
                          <DominoTileView
                            dispLeft={pt.dispLeft} dispRight={pt.dispRight}
                            isDouble={pt.isDouble} skinKey={dominoSkin} tileSize={tileSize}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center', padding: '6px 16px', color: isHumanTurn ? '#D4AF37' : '#555', fontSize: 13, fontWeight: 500, flexShrink: 0, minHeight: 30 }}>
            {statusMsg}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '2px 16px 6px', flexShrink: 0, flexWrap: 'wrap' }}>
            {isHumanTurn && selectedTile && chainEmpty && (
              <>
                <Button onClick={handlePlayFirst} style={{ background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, border: 'none' }}>Place First Tile</Button>
                <Button onClick={() => setSelectedTileId(null)} variant="ghost" style={{ color: '#555' }}>Cancel</Button>
              </>
            )}
            {isHumanTurn && selectedTile && !chainEmpty && (
              <>
                {canPlayLeft && (
                  <Button onClick={() => handlePlayEnd('left')} style={{ background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 700 }}>
                    ← Play on Left ({gs.leftVal})
                  </Button>
                )}
                {canPlayRight && (
                  <Button onClick={() => handlePlayEnd('right')} style={{ background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 700 }}>
                    Play on Right ({gs.rightVal}) →
                  </Button>
                )}
                <Button onClick={() => setSelectedTileId(null)} variant="ghost" style={{ color: '#555' }}>Cancel</Button>
              </>
            )}
            {isHumanTurn && !selectedTile && (
              <>
                {canDraw && (
                  <Button onClick={handleDraw} style={{ background: 'rgba(30,136,229,.18)', border: '1px solid rgba(30,136,229,.45)', color: '#42A5F5', fontWeight: 700 }}>
                    Draw from Boneyard
                  </Button>
                )}
                {canPass && (
                  <Button onClick={handlePass} style={{ background: 'rgba(183,28,28,.18)', border: '1px solid rgba(183,28,28,.45)', color: '#EF5350', fontWeight: 700 }}>
                    Pass Turn
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Human hand */}
          <div style={{ padding: '8px 16px 16px', background: 'rgba(0,0,0,.45)', borderTop: '1px solid rgba(212,175,55,.1)', flexShrink: 0 }}>
            <div style={{ color: '#D4AF37', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Your Hand ({humanPlayer?.hand.length ?? 0} tiles)
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
              {humanPlayer?.hand.map(tile => (
                <div key={tile.id} style={{ animation: 'pop .25s ease' }}>
                  <DominoTileView
                    dispLeft={tile.left} dispRight={tile.right}
                    isDouble={tile.left === tile.right}
                    selected={selectedTileId === tile.id}
                    playable={isHumanTurn && playableIds.has(tile.id) && selectedTileId !== tile.id}
                    skinKey={dominoSkin} tileSize={tileSize}
                    onClick={() => handleTileClick(tile.id)}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
