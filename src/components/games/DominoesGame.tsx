import React, { useState, useReducer, useEffect, useRef, useMemo } from 'react';
import { Settings, RotateCcw, Zap, GraduationCap, PlusCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InGameTopBar } from '@/components/InGameTopBar';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';

type CardBackStyle = { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tile { left: number; right: number; id: string }
interface PlacedTile { tile: Tile; dispLeft: number; dispRight: number; isDouble: boolean; }
interface DomPlayer { id: string; name: string; avatarDef: AvatarDef; hand: Tile[]; isHuman: boolean; score: number; }
type Phase = 'setup' | 'playing' | 'roundOver';
type GameMode = 'real' | 'practice';
type SkinKey = keyof typeof DOMINO_SKINS;
type TableKey = keyof typeof TABLE_SKINS;
type TileSize = 'sm' | 'md' | 'lg';

interface DominoSkinDef {
  name: string; bg: string; pip: string; border: string; divider: string;
  faceDownBg: string; gloss?: boolean; glow?: string;
}
interface TableSkinDef { name: string; felt: string; border: string; line: string; }

interface GS {
  phase: Phase; mode: GameMode;
  players: DomPlayer[]; boneyard: Tile[]; chain: PlacedTile[];
  leftVal: number; rightVal: number;
  currentPlayer: number; consecutivePasses: number;
  bet: number; roundWinner: string; roundScore: number; practiceGamesLeft: number;
  firstPlayTileId: string | null;
}
type Action =
  | { type: 'START'; mode: GameMode; bet: number }
  | { type: 'PLAY_TILE'; playerId: string; tileId: string; end: 'left' | 'right' }
  | { type: 'DRAW' } | { type: 'PASS' } | { type: 'RESET' } | { type: 'SET_BET'; bet: number };

// ─── Skins ────────────────────────────────────────────────────────────────────
const DOMINO_SKINS: Record<string, DominoSkinDef> = {
  ivory:       { name: 'Classic Ivory',    bg: '#F2EDD7', pip: '#111', border: '#B8A880', divider: '#C0A878',
                 faceDownBg: 'repeating-linear-gradient(45deg,#D4C8A0 0,#D4C8A0 5px,#B8A870 5px,#B8A870 10px)' },
  black:       { name: 'Obsidian',          bg: '#1C1C1C', pip: '#E8E8E8', border: '#555', divider: '#444',
                 faceDownBg: 'repeating-linear-gradient(45deg,#2e2e2e 0,#2e2e2e 5px,#0f0f0f 5px,#0f0f0f 10px)' },
  neon:        { name: 'Neon Cyber',        bg: '#080818', pip: '#00FFEE', border: '#FF00CC', divider: '#FF00CC',
                 faceDownBg: 'repeating-linear-gradient(45deg,#FF00CC 0,#FF00CC 1px,#080818 1px,#080818 7px)',
                 glow: 'rgba(255,0,204,0.7)' },
  gold:        { name: 'Vegas Gold',        bg: '#120E00', pip: '#FFD700', border: '#8B6914', divider: '#8B6914',
                 faceDownBg: 'repeating-linear-gradient(45deg,#8B6914 0,#8B6914 4px,#120E00 4px,#120E00 9px)',
                 glow: 'rgba(255,215,0,0.45)' },
  shinyGold:   { name: 'Shiny Gold',
                 bg: 'linear-gradient(145deg,#ffe066 0%,#d4a000 30%,#ffe680 55%,#b8860b 80%,#ffd700 100%)',
                 pip: '#1a0800', border: '#C8930A', divider: '#9A6800',
                 faceDownBg: 'linear-gradient(145deg,#7A5000 0%,#C8930A 40%,#F0C040 65%,#9A6800 100%)',
                 gloss: true, glow: 'rgba(255,210,0,0.65)' },
  silver:      { name: 'Sterling Silver',
                 bg: 'linear-gradient(145deg,#b0b0b0 0%,#e8e8e8 35%,#a0a0a0 60%,#d8d8d8 100%)',
                 pip: '#222', border: '#888', divider: '#6a6a6a',
                 faceDownBg: 'linear-gradient(145deg,#686868 0%,#b8b8b8 40%,#eaeaea 65%,#808080 100%)',
                 gloss: true, glow: 'rgba(180,180,180,0.4)' },
  platinum:    { name: 'Platinum',
                 bg: 'linear-gradient(145deg,#d4d4e8 0%,#ffffff 40%,#c8c8e0 65%,#eeeeff 100%)',
                 pip: '#333', border: '#AAAACC', divider: '#9090B8',
                 faceDownBg: 'linear-gradient(145deg,#9090B8 0%,#d0d0f0 40%,#ffffff 65%,#a0a0c8 100%)',
                 gloss: true, glow: 'rgba(180,180,255,0.5)' },
  water:       { name: 'Ocean Water',
                 bg: 'linear-gradient(145deg,rgba(0,90,170,0.92) 0%,rgba(0,160,240,0.88) 45%,rgba(0,200,255,0.85) 70%,rgba(0,100,180,0.92) 100%)',
                 pip: '#e0f8ff', border: 'rgba(0,200,255,0.7)', divider: 'rgba(80,220,255,0.6)',
                 faceDownBg: 'linear-gradient(180deg,#002244 0%,#004488 35%,#0066AA 60%,#002244 100%)',
                 gloss: true, glow: 'rgba(0,160,255,0.6)' },
  glass:       { name: 'Frosted Glass',
                 bg: 'rgba(255,255,255,0.10)', pip: 'rgba(255,255,255,0.95)',
                 border: 'rgba(255,255,255,0.30)', divider: 'rgba(255,255,255,0.22)',
                 faceDownBg: 'rgba(60,80,140,0.35)',
                 gloss: true, glow: 'rgba(255,255,255,0.25)' },
  roseGold:    { name: 'Rose Gold',
                 bg: 'linear-gradient(145deg,#c97b5a 0%,#e8a87c 30%,#d4886a 60%,#b86a50 100%)',
                 pip: '#fff8f5', border: '#C07050', divider: '#9E5A3A',
                 faceDownBg: 'linear-gradient(145deg,#6A2A18 0%,#B06040 40%,#E09070 65%,#7A3020 100%)',
                 gloss: true, glow: 'rgba(220,120,90,0.5)' },
  emerald:     { name: 'Emerald',
                 bg: 'linear-gradient(145deg,#0a3d22 0%,#1e7a44 35%,#0d5a30 65%,#0a3d22 100%)',
                 pip: '#a0ffd0', border: '#0D7A47', divider: '#085530',
                 faceDownBg: 'linear-gradient(145deg,#021408 0%,#083520 40%,#0D5A30 65%,#021408 100%)',
                 gloss: true, glow: 'rgba(20,180,90,0.6)' },
  crystal:     { name: 'Crystal Blue',
                 bg: 'linear-gradient(145deg,rgba(80,130,230,0.55) 0%,rgba(160,210,255,0.65) 45%,rgba(60,110,220,0.55) 100%)',
                 pip: '#ffffff', border: 'rgba(100,180,255,0.8)', divider: 'rgba(80,150,255,0.6)',
                 faceDownBg: 'linear-gradient(145deg,rgba(20,50,140,0.9) 0%,rgba(60,120,220,0.85) 50%,rgba(20,50,140,0.9) 100%)',
                 gloss: true, glow: 'rgba(80,160,255,0.7)' },
  obsidianFire:{ name: 'Obsidian Fire',
                 bg: 'linear-gradient(145deg,#0a0000 0%,#1a0505 50%,#0a0000 100%)',
                 pip: '#FF4500', border: '#CC2200', divider: '#881100',
                 faceDownBg: 'linear-gradient(145deg,#050000 0%,#1A0800 40%,#2A0000 60%,#050000 100%)',
                 glow: 'rgba(255,69,0,0.7)' },
};

const TABLE_SKINS: Record<string, TableSkinDef> = {
  wood:    { name: 'Mahogany',    felt: '#2B4A1A', border: '#5D3A1A', line: '#3A6025' },
  marble:  { name: 'Marble',      felt: '#253545', border: '#7090B0', line: '#4A70A0' },
  neon:    { name: 'Neon Grid',   felt: '#080018', border: '#3300CC', line: '#5500FF' },
  glass:   { name: 'Glass',       felt: 'rgba(20,60,100,0.55)', border: 'rgba(80,180,255,0.45)', line: 'rgba(100,200,255,0.25)' },
  velvet:  { name: 'Red Velvet',  felt: '#3D0A0A', border: '#8B1A1A', line: '#6B1010' },
  ocean:   { name: 'Deep Ocean',  felt: '#0A1F3A', border: '#1A4A8A', line: '#1A3A6A' },
  emerald: { name: 'Emerald',     felt: '#062A14', border: '#1A6A3A', line: '#0A4A2A' },
  gold:    { name: 'Gold Luxury', felt: '#100A00', border: '#8B6914', line: '#6B4900' },
  midnight:{ name: 'Midnight Sky',felt: '#050510', border: '#1A1A5A', line: '#0A0A3A' },
  slate:   { name: 'Dark Slate',  felt: '#14141E', border: '#3A3A5A', line: '#222240' },
};

// Canvas / tile constants
const CANVAS_W = 5000, CANVAS_H = 600, CANVAS_CX = 2500, CANVAS_CY = 300;
const BASE_DIMS: Record<TileSize, { long: number; short: number; pip: number }> = {
  sm: { long: 58, short: 29, pip: 19 },
  md: { long: 76, short: 38, pip: 26 },
  lg: { long: 96, short: 48, pip: 32 },
};
const TILE_GAP = 5;

// AI avatar definitions (fixed, distinct avatars)
const AI_AVATARS: AvatarDef[] = [
  { sheet: 1, row: 1, col: 0, name: 'Carlos' },
  { sheet: 2, row: 0, col: 2, name: 'Maya' },
  { sheet: 1, row: 2, col: 3, name: 'Zara' },
];
const HUMAN_AVATAR: AvatarDef = { sheet: 1, row: 0, col: 1, name: 'You' };

// ─── Domino set & game helpers ───────────────────────────────────────────────
function makeDominoSet(): Tile[] {
  const set: Tile[] = [];
  let id = 0;
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) set.push({ left: i, right: j, id: `d${id++}` });
  return set;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function canPlay(tile: Tile, lv: number, rv: number, empty: boolean): boolean {
  if (empty) return true;
  return tile.left === lv || tile.right === lv || tile.left === rv || tile.right === rv;
}
function canPlayEnd(tile: Tile, end: 'left' | 'right', lv: number, rv: number): boolean {
  const v = end === 'left' ? lv : rv;
  return tile.left === v || tile.right === v;
}
function placeRight(tile: Tile, rv: number): { pt: PlacedTile; newRight: number } {
  const isDouble = tile.left === tile.right;
  if (tile.left === rv) return { pt: { tile, dispLeft: tile.left, dispRight: tile.right, isDouble }, newRight: tile.right };
  return { pt: { tile, dispLeft: tile.right, dispRight: tile.left, isDouble }, newRight: tile.left };
}
function placeLeft(tile: Tile, lv: number): { pt: PlacedTile; newLeft: number } {
  const isDouble = tile.left === tile.right;
  if (tile.right === lv) return { pt: { tile, dispLeft: tile.left, dispRight: tile.right, isDouble }, newLeft: tile.left };
  return { pt: { tile, dispLeft: tile.right, dispRight: tile.left, isDouble }, newLeft: tile.right };
}
function handPips(hand: Tile[]) { return hand.reduce((s, t) => s + t.left + t.right, 0); }
function highestDouble(hand: Tile[]): { tile: Tile; val: number } | null {
  const doubles = hand.filter(t => t.left === t.right).sort((a, b) => b.left - a.left);
  if (!doubles.length) return null;
  return { tile: doubles[0], val: doubles[0].left };
}
function aiChoose(hand: Tile[], lv: number, rv: number, empty: boolean, firstTileId: string | null): { tile: Tile; end: 'left' | 'right' } | null {
  if (empty && firstTileId) {
    const t = hand.find(h => h.id === firstTileId);
    return t ? { tile: t, end: 'right' } : null;
  }
  const playable = hand.filter(t => canPlay(t, lv, rv, empty));
  if (!playable.length) return null;
  playable.sort((a, b) => (b.left + b.right) - (a.left + a.right));
  const tile = playable[0];
  if (empty) return { tile, end: 'right' };
  const end = canPlayEnd(tile, 'right', lv, rv) ? 'right' : 'left';
  return { tile, end };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function initGS(): GS {
  return { phase: 'setup', mode: 'real', players: [], boneyard: [], chain: [], leftVal: -1, rightVal: -1, currentPlayer: 0, consecutivePasses: 0, bet: 10, roundWinner: '', roundScore: 0, practiceGamesLeft: 3, firstPlayTileId: null };
}

function gsReducer(state: GS, action: Action): GS {
  switch (action.type) {
    case 'SET_BET': return { ...state, bet: action.bet };
    case 'START': {
      const set = shuffle(makeDominoSet());
      const players: DomPlayer[] = [
        { id: 'human', name: 'You',    avatarDef: HUMAN_AVATAR,  hand: set.slice(0, 7),  isHuman: true,  score: 0 },
        { id: 'ai1',   name: 'Carlos', avatarDef: AI_AVATARS[0], hand: set.slice(7, 14), isHuman: false, score: 0 },
        { id: 'ai2',   name: 'Maya',   avatarDef: AI_AVATARS[1], hand: set.slice(14,21), isHuman: false, score: 0 },
        { id: 'ai3',   name: 'Zara',   avatarDef: AI_AVATARS[2], hand: set.slice(21,28), isHuman: false, score: 0 },
      ];
      // Determine starting player: whoever has the highest double
      let startingPlayer = 0;
      let bestVal = -1;
      let firstPlayTileId: string | null = null;
      players.forEach((p, idx) => {
        const hd = highestDouble(p.hand);
        if (hd && hd.val > bestVal) { bestVal = hd.val; startingPlayer = idx; firstPlayTileId = hd.tile.id; }
      });
      // If nobody has a double (impossible with full set), fallback to highest pip total
      if (!firstPlayTileId) {
        players.forEach((p, idx) => {
          const maxPip = Math.max(...p.hand.map(t => t.left + t.right));
          if (maxPip > bestVal) { bestVal = maxPip; startingPlayer = idx; firstPlayTileId = p.hand.find(t => t.left + t.right === maxPip)!.id; }
        });
      }
      return { ...state, phase: 'playing', mode: action.mode, bet: action.bet, players, boneyard: set.slice(28), chain: [], leftVal: -1, rightVal: -1, currentPlayer: startingPlayer, consecutivePasses: 0, roundWinner: '', roundScore: 0, practiceGamesLeft: action.mode === 'practice' ? state.practiceGamesLeft - 1 : state.practiceGamesLeft, firstPlayTileId };
    }
    case 'PLAY_TILE': {
      const pIdx = state.players.findIndex(p => p.id === action.playerId);
      if (pIdx < 0) return state;
      const player = state.players[pIdx];
      const tile = player.hand.find(t => t.id === action.tileId);
      if (!tile) return state;
      const chainEmpty = state.chain.length === 0;
      // Enforce first play rule
      if (chainEmpty && state.firstPlayTileId && tile.id !== state.firstPlayTileId) return state;
      if (!chainEmpty && !canPlayEnd(tile, action.end, state.leftVal, state.rightVal)) return state;
      const newHand = player.hand.filter(t => t.id !== tile.id);
      let newChain: PlacedTile[], newLeft = state.leftVal, newRight = state.rightVal;
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
        return { ...state, players: newPlayers, chain: newChain, leftVal: newLeft, rightVal: newRight, phase: 'roundOver', roundWinner: player.name, roundScore: score, firstPlayTileId: null };
      }
      const next = (pIdx + 1) % newPlayers.length;
      return { ...state, players: newPlayers, chain: newChain, leftVal: newLeft, rightVal: newRight, currentPlayer: next, consecutivePasses: 0, firstPlayTileId: chainEmpty ? null : state.firstPlayTileId };
    }
    case 'DRAW': {
      if (!state.boneyard.length) return state;
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

// ─── Realistic Audio ──────────────────────────────────────────────────────────
class DominoAudio {
  private ctx: AudioContext | null = null;
  muted = false;
  private getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return this.ctx;
  }
  private woodClack(loudness = 0.7) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const sr = ctx.sampleRate;
      const dur = 0.14;
      const n = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const att = Math.min(t / 0.0006, 1.0);
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 200) * 0.9;
        const h1 = Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t * 55) * 0.55;
        const h2 = Math.sin(2 * Math.PI * 780 * t) * Math.exp(-t * 38) * 0.45;
        const h3 = Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t * 28) * 0.65;
        const thump = Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 32) * 0.75;
        d[i] = att * (noise + h1 + h2 + h3 + thump) * loudness;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -6; comp.ratio.value = 4;
      src.connect(comp); comp.connect(g); g.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }
  private slideNoise(loudness = 0.3) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const sr = ctx.sampleRate;
      const dur = 0.07;
      const n = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * loudness;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
      const g = ctx.createGain(); g.gain.value = 0.5;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }
  private chime(freq: number, delay: number, vol = 0.45) {
    if (this.muted) return;
    setTimeout(() => {
      try {
        const ctx = this.getCtx();
        const sr = ctx.sampleRate;
        const dur = 0.5;
        const n = Math.floor(sr * dur);
        const buf = ctx.createBuffer(1, n, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const att = Math.min(t / 0.004, 1);
          d[i] = att * Math.exp(-t * 6) * (Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(2 * Math.PI * freq * 2.02 * t) * 0.2 + Math.sin(2 * Math.PI * freq * 3.01 * t) * 0.1) * vol;
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain(); g.gain.value = 1.0;
        src.connect(g); g.connect(ctx.destination); src.start();
      } catch (_) {}
    }, delay);
  }
  pickUp() { this.slideNoise(0.4); }
  place()  { this.woodClack(0.7); }
  draw()   { this.slideNoise(0.25); this.woodClack(0.3); }
  win()    { [0,130,260,400].forEach((d, i) => this.chime([523.25, 659.25, 784.00, 1046.50][i], d, 0.5)); }
  slam() {
    if (this.muted) return;
    // Heavy bass impact
    try {
      const ctx = this.getCtx();
      const sr = ctx.sampleRate;
      const dur = 0.55;
      const n = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const transient = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 1.2;
        const body = Math.sin(2 * Math.PI * 48 * t) * Math.exp(-t * 8) * 1.5;
        const wood = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 25) * 0.8;
        d[i] = transient + body + wood;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 1.4;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start();
    } catch (_) {}
    this.woodClack(1.0);
  }
  crack() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const sr = ctx.sampleRate;
      const dur = 0.6;
      const n = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) * 9);
        d[i] = (Math.random() * 2 - 1) * env * 1.6;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 1.8;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    } catch (_) {}
  }
}
const audio = new DominoAudio();

// ─── Pip face ─────────────────────────────────────────────────────────────────
const PIPS: Record<number, [number, number][]> = {
  0: [], 1: [[50,50]], 2: [[28,28],[72,72]], 3: [[28,28],[50,50],[72,72]],
  4: [[28,28],[72,28],[28,72],[72,72]], 5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};
function PipFace({ value, color, size }: { value: number; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
      {PIPS[value]?.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={13} fill={color} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.65))' }} />
      ))}
    </svg>
  );
}

// ─── Domino Tile ──────────────────────────────────────────────────────────────
function DominoTileView({
  dispLeft, dispRight, isDouble, selected, playable, faceDown,
  skinKey, dims, onClick, cardBackStyle,
}: {
  dispLeft: number; dispRight: number; isDouble: boolean;
  selected?: boolean; playable?: boolean; faceDown?: boolean;
  skinKey: SkinKey; dims: { long: number; short: number; pip: number };
  onClick?: () => void; cardBackStyle?: CardBackStyle;
}) {
  const skin = DOMINO_SKINS[skinKey] ?? DOMINO_SKINS.ivory;
  const isVert = isDouble;
  const W = isVert ? dims.short : dims.long;
  const H = isVert ? dims.long  : dims.short;
  const flexDir: React.CSSProperties['flexDirection'] = isVert ? 'column' : 'row';
  const borderColor = selected ? '#D4AF37' : playable ? '#43C450' : skin.border;

  // Face-down background priority: cardBackStyle (only if meaningful) > skin.faceDownBg
  let faceDownBackground: React.CSSProperties = {};
  if (faceDown) {
    if (cardBackStyle?.type === 'image' && cardBackStyle.image) {
      faceDownBackground = { background: `url(${cardBackStyle.image}) center/cover no-repeat` };
    } else if (cardBackStyle?.type === 'css' && Object.keys(cardBackStyle.style).length > 0) {
      faceDownBackground = cardBackStyle.style;
    } else {
      faceDownBackground = { background: skin.faceDownBg };
    }
  }

  const glowStr = skin.glow
    ? (selected ? `0 0 18px rgba(212,175,55,0.95), 0 0 12px ${skin.glow}, 0 4px 12px rgba(0,0,0,.7)`
       : playable ? `0 0 14px rgba(67,196,80,0.75), 0 0 8px ${skin.glow}, 0 3px 8px rgba(0,0,0,.6)`
       : `0 0 10px ${skin.glow}, 0 3px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)`)
    : (selected ? '0 0 18px rgba(212,175,55,0.95), 0 4px 12px rgba(0,0,0,.7)'
       : playable ? '0 0 14px rgba(67,196,80,0.75), 0 3px 8px rgba(0,0,0,.6)'
       : '0 3px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)');

  return (
    <div onClick={onClick} style={{
      width: W, height: H, flexShrink: 0, position: 'relative',
      ...(faceDown ? faceDownBackground : { background: skin.bg }),
      border: `2px solid ${borderColor}`, borderRadius: 6,
      display: 'flex', flexDirection: flexDir, alignItems: 'center', justifyContent: 'space-around',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: glowStr,
      transform: selected ? 'translateY(-10px) scale(1.08)' : playable ? 'translateY(-4px)' : 'none',
      transition: 'all .18s ease',
      overflow: 'hidden',
      backdropFilter: !faceDown && skin.bg.startsWith('rgba') ? 'blur(8px)' : undefined,
    }}>
      {!faceDown && skin.gloss && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, pointerEvents: 'none', zIndex: 10,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.10) 100%)' }} />
      )}
      {!faceDown && (
        <>
          <PipFace value={dispLeft} color={skin.pip} size={dims.pip} />
          <div style={{ background: skin.divider, flexShrink: 0, width: isVert ? '78%' : 2, height: isVert ? 2 : '78%' }} />
          <PipFace value={dispRight} color={skin.pip} size={dims.pip} />
        </>
      )}
    </div>
  );
}

// ─── CrackOverlay ─────────────────────────────────────────────────────────────
function CrackOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <svg width="100%" height="100%" viewBox="0 0 600 400" style={{ position: 'absolute', inset: 0 }}>
        {['M300,200 L200,80 L160,10','M300,200 L420,90 L490,15','M300,200 L130,230 L55,290','M300,200 L460,250 L545,310','M300,200 L295,320 L270,400','M300,200 L345,330 L365,400'].map((d, i) => (
          <path key={i} d={d} stroke="rgba(255,255,255,0.55)" strokeWidth={2 - i * 0.15} fill="none" strokeLinecap="round"
            style={{ strokeDasharray: 400, strokeDashoffset: 400, animation: `crackDraw 0.35s ${i * 0.025}s ease-out forwards` }} />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%,rgba(255,210,60,.22) 0%,transparent 60%)', animation: 'flashFade .5s ease-out forwards' }} />
    </div>
  );
}

// ─── Skin & Table preview cards ───────────────────────────────────────────────
function SkinCard({ skinKey, active, onClick, dims }: { skinKey: string; active: boolean; onClick: () => void; dims: { long: number; short: number; pip: number } }) {
  const skin = DOMINO_SKINS[skinKey];
  const W = Math.round(dims.long * 0.75), H = Math.round(dims.short * 0.75);
  return (
    <button onClick={onClick} style={{ borderRadius: 10, cursor: 'pointer', border: `2px solid ${active ? '#D4AF37' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 5px', transition: 'all .15s', boxShadow: active ? '0 0 8px rgba(212,175,55,0.3)' : 'none' }}>
      <div style={{ width: W, height: H, borderRadius: 4, background: skin.bg, border: `1.5px solid ${skin.border}`, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden', position: 'relative', flexShrink: 0, boxShadow: skin.glow ? `0 0 6px ${skin.glow}` : '0 2px 4px rgba(0,0,0,0.5)' }}>
        {skin.gloss && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.35) 0%,transparent 55%)', pointerEvents: 'none', zIndex: 2 }} />}
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: skin.pip, flexShrink: 0 }} />
        <div style={{ width: 1.5, height: '70%', background: skin.divider, flexShrink: 0 }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: skin.pip, flexShrink: 0 }} />
      </div>
      {/* Face-down preview */}
      <div style={{ width: W, height: H, borderRadius: 4, background: skin.faceDownBg, border: `1.5px solid ${skin.border}`, overflow: 'hidden', flexShrink: 0 }} />
      <span style={{ fontSize: 8.5, color: active ? '#D4AF37' : '#666', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{skin.name}</span>
    </button>
  );
}
function TableCard({ tableKey, active, onClick }: { tableKey: string; active: boolean; onClick: () => void }) {
  const t = TABLE_SKINS[tableKey];
  return (
    <button onClick={onClick} style={{ padding: '8px 6px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${active ? '#D4AF37' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all .15s', boxShadow: active ? '0 0 8px rgba(212,175,55,0.3)' : 'none' }}>
      <div style={{ width: 44, height: 28, borderRadius: 5, background: t.felt, border: `1.5px solid ${t.border}`, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: `repeating-linear-gradient(0deg,${t.line} 0,${t.line} 1px,transparent 1px,transparent 14px),repeating-linear-gradient(90deg,${t.line} 0,${t.line} 1px,transparent 1px,transparent 14px)` }} />
      </div>
      <span style={{ fontSize: 8.5, color: active ? '#D4AF37' : '#666', fontWeight: 700, whiteSpace: 'nowrap' }}>{t.name}</span>
    </button>
  );
}
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ width: 46, height: 25, borderRadius: 13, border: 'none', cursor: 'pointer', background: on ? '#D4AF37' : '#333', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 24 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </button>
  );
}

// ─── Player Seat (square table) ───────────────────────────────────────────────
function PlayerSeat({ player, active, tileCount, isHuman, orientation, cardBackStyle, skinKey, dims }: {
  player: DomPlayer; active: boolean; tileCount: number; isHuman?: boolean;
  orientation: 'top' | 'bottom' | 'left' | 'right';
  cardBackStyle?: CardBackStyle; skinKey: SkinKey;
  dims: { long: number; short: number; pip: number };
}) {
  const isVertical = orientation === 'left' || orientation === 'right';
  const miniDims = { long: 36, short: 18, pip: 10 };
  return (
    <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', alignItems: 'center', gap: 6, padding: isHuman ? '6px 10px' : '5px 8px' }}>
      {/* Avatar */}
      <AvatarSprite avatar={player.avatarDef} size={isHuman ? 42 : 36} active={active}
        style={{ flexShrink: 0, borderRadius: '50%' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isVertical ? 'center' : 'flex-start', gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: isHuman ? 12 : 10, fontWeight: 700, color: active ? '#D4AF37' : '#aaa', whiteSpace: 'nowrap' }}>
          {player.name} {active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', marginLeft: 3, animation: 'pulse 1s infinite', verticalAlign: 'middle' }} />}
        </div>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 600 }}>{tileCount} tiles</div>
      </div>
      {/* Mini tile stack (face-down for AI, shown for all) */}
      {!isHuman && tileCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: isVertical ? 60 : 100, justifyContent: 'center' }}>
          {Array.from({ length: Math.min(tileCount, 5) }, (_, i) => (
            <DominoTileView key={i} dispLeft={0} dispRight={0} isDouble={false} faceDown skinKey={skinKey} dims={miniDims} cardBackStyle={cardBackStyle} />
          ))}
          {tileCount > 5 && <span style={{ fontSize: 8, color: '#555', alignSelf: 'center' }}>+{tileCount - 5}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface DominoesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  cardBackStyle?: CardBackStyle;
}

export function DominoesGame({ balance, onBack, onBet, onWin, onAddBalance, cardBackStyle }: DominoesGameProps) {
  const [gs, dispatch] = useReducer(gsReducer, undefined, initGS);
  const [muted, setMuted] = useState(false);
  const [slamOn, setSlamOn] = useState(true);
  const [dominoSkin, setDominoSkin] = useState<SkinKey>('ivory');
  const [tableSkin, setTableSkin] = useState<TableKey>('wood');
  const [tileSize, setTileSize] = useState<TileSize>('md');
  const [boardZoom, setBoardZoom] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [betConfirmed, setBetConfirmed] = useState(false);

  // Chain layout tracking
  const [chainCenterIdx, setChainCenterIdx] = useState(0);
  const prevChainRef = useRef<PlacedTile[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { audio.muted = muted; }, [muted]);

  // Compute dims with zoom
  const dims = useMemo(() => {
    const base = BASE_DIMS[tileSize];
    return { long: Math.round(base.long * boardZoom), short: Math.round(base.short * boardZoom), pip: Math.round(base.pip * boardZoom) };
  }, [tileSize, boardZoom]);

  // Track center tile index
  useEffect(() => {
    const prev = prevChainRef.current, cur = gs.chain;
    if (cur.length === 0) setChainCenterIdx(0);
    else if (cur.length === 1) setChainCenterIdx(0);
    else if (cur.length > prev.length && prev.length > 0 && cur[0].tile.id !== prev[0].tile.id)
      setChainCenterIdx(ci => ci + 1);
    else if (cur.length < prev.length) setChainCenterIdx(0);
    prevChainRef.current = cur;
  }, [gs.chain]);

  // Compute 2D tile positions
  const chainPositions = useMemo(() => {
    const chain = gs.chain;
    if (!chain.length) return [];
    const GAP = TILE_GAP;
    const positions: { x: number; y: number; w: number; h: number }[] = new Array(chain.length);
    const ci = Math.min(chainCenterIdx, chain.length - 1);
    const ct = chain[ci];
    const ctW = ct.isDouble ? dims.short : dims.long;
    const ctH = ct.isDouble ? dims.long  : dims.short;
    positions[ci] = { x: CANVAS_CX - ctW / 2, y: CANVAS_CY - ctH / 2, w: ctW, h: ctH };
    let rx = CANVAS_CX + ctW / 2 + GAP;
    for (let i = ci + 1; i < chain.length; i++) {
      const pt = chain[i]; const w = pt.isDouble ? dims.short : dims.long; const h = pt.isDouble ? dims.long : dims.short;
      positions[i] = { x: rx, y: CANVAS_CY - h / 2, w, h }; rx += w + GAP;
    }
    let lx = CANVAS_CX - ctW / 2 - GAP;
    for (let i = ci - 1; i >= 0; i--) {
      const pt = chain[i]; const w = pt.isDouble ? dims.short : dims.long; const h = pt.isDouble ? dims.long : dims.short;
      lx -= w; positions[i] = { x: lx, y: CANVAS_CY - h / 2, w, h }; lx -= GAP;
    }
    return positions;
  }, [gs.chain, chainCenterIdx, dims]);

  // Auto-center board
  useEffect(() => {
    if (gs.phase === 'playing' && boardRef.current) {
      const b = boardRef.current;
      b.scrollLeft = CANVAS_CX - b.clientWidth / 2;
      b.scrollTop  = CANVAS_CY - b.clientHeight / 2;
    }
  }, [gs.phase]);

  // Auto-scroll to newest tile
  useEffect(() => {
    if (!boardRef.current || !chainPositions.length) return;
    const b = boardRef.current;
    const last = chainPositions[gs.chain.length - 1];
    if (!last) return;
    if (last.x + last.w + 40 > b.scrollLeft + b.clientWidth - 20) b.scrollLeft = last.x + last.w - b.clientWidth + 80;
    else if ((chainPositions[0]?.x ?? 0) - 40 < b.scrollLeft + 20) b.scrollLeft = (chainPositions[0]?.x ?? 0) - 80;
  }, [chainPositions, gs.chain.length]);

  // Derived state
  const isHumanTurn = gs.phase === 'playing' && gs.players[gs.currentPlayer]?.id === 'human';
  const humanPlayer = gs.players.find(p => p.isHuman);
  const aiPlayers   = gs.players.filter(p => !p.isHuman);
  const chainEmpty  = gs.chain.length === 0;

  const playableIds = useMemo(() => {
    const set = new Set<string>();
    if (!isHumanTurn || !humanPlayer) return set;
    if (chainEmpty && gs.firstPlayTileId) {
      if (humanPlayer.hand.find(t => t.id === gs.firstPlayTileId)) set.add(gs.firstPlayTileId);
      return set;
    }
    humanPlayer.hand.forEach(t => { if (canPlay(t, gs.leftVal, gs.rightVal, chainEmpty)) set.add(t.id); });
    return set;
  }, [isHumanTurn, humanPlayer, chainEmpty, gs.firstPlayTileId, gs.leftVal, gs.rightVal]);

  const canDraw   = isHumanTurn && playableIds.size === 0 && gs.boneyard.length > 0;
  const canPass   = isHumanTurn && playableIds.size === 0 && gs.boneyard.length === 0;
  const selectedTile = humanPlayer?.hand.find(t => t.id === selectedTileId) ?? null;
  const canPlayLeft  = !!selectedTile && !chainEmpty && canPlayEnd(selectedTile, 'left',  gs.leftVal, gs.rightVal);
  const canPlayRight = !!selectedTile && !chainEmpty && canPlayEnd(selectedTile, 'right', gs.leftVal, gs.rightVal);

  // AI turn
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const player = gs.players[gs.currentPlayer];
    if (!player || player.isHuman) return;
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(() => {
      const choice = aiChoose(player.hand, gs.leftVal, gs.rightVal, chainEmpty, gs.firstPlayTileId);
      if (choice) { audio.place(); dispatch({ type: 'PLAY_TILE', playerId: player.id, tileId: choice.tile.id, end: choice.end }); }
      else dispatch({ type: 'PASS' });
    }, 700 + Math.random() * 500);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.currentPlayer, gs.phase]);

  // Round over
  const prevPhase = useRef<Phase>('setup');
  useEffect(() => {
    if (gs.phase === 'roundOver' && prevPhase.current !== 'roundOver') {
      const humanWon = gs.roundWinner === 'You';
      if (humanWon) {
        if (slamOn) { setShaking(true); setCracking(true); setTimeout(() => { setShaking(false); setCracking(false); }, 900); }
        audio.slam(); setTimeout(() => audio.crack(), 180); setTimeout(() => audio.win(), 350);
        if (gs.mode === 'real') { const w = gs.bet * 3; onWin(w); toast.success(`DOMINO OUT! You won ${w} $Pc!`); }
        else toast.success('DOMINO OUT! Great job! (Practice)');
      } else {
        gs.mode === 'real' ? toast.error(`${gs.roundWinner} dominoed out!`) : toast.info(`${gs.roundWinner} wins.`);
      }
    }
    prevPhase.current = gs.phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.phase, gs.roundWinner]);

  // Human actions
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
    setBetConfirmed(true); toast.success(`${gs.bet} $Pc bet locked in!`);
  };
  const startGame = (mode: GameMode) => {
    if (mode === 'real') { if (!betConfirmed) return; if (!onBet(gs.bet)) return; }
    dispatch({ type: 'START', mode, bet: gs.bet });
    setSelectedTileId(null);
  };

  const table = TABLE_SKINS[tableSkin];

  let statusMsg = '';
  if (gs.phase === 'playing') {
    if (chainEmpty && gs.firstPlayTileId) {
      const starter = gs.players[gs.currentPlayer];
      statusMsg = starter?.id === 'human' ? `You start! Play your highest double.` : `${starter?.name} starts with the highest double`;
    } else if (isHumanTurn) {
      if (selectedTile) statusMsg = chainEmpty ? 'Play your tile to start the chain' : 'Choose which end to play on ↓';
      else if (canDraw)  statusMsg = 'No playable tile — draw from the boneyard';
      else if (canPass)  statusMsg = 'No moves — pass your turn';
      else               statusMsg = 'Your turn — click a highlighted tile to play';
    } else {
      const cur = gs.players[gs.currentPlayer];
      statusMsg = cur ? `${cur.name} is thinking...` : '';
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes crackDraw { to { stroke-dashoffset: 0 } }
        @keyframes flashFade { 0%{opacity:1} 100%{opacity:0} }
        @keyframes shake { 0%,100%{transform:translate(0)} 10%{transform:translate(-8px,-5px)rotate(-1.2deg)} 20%{transform:translate(8px,5px)rotate(1.2deg)} 30%{transform:translate(-5px,3px)rotate(-.7deg)} 40%{transform:translate(5px,-3px)rotate(.7deg)} 50%{transform:translate(-3px,5px)rotate(-.3deg)} 60%{transform:translate(3px,-5px)rotate(.3deg)} 80%{transform:translate(-1px,2px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes tileLand { from{opacity:0;transform:scale(0.7)translateY(-8px)} to{opacity:1;transform:scale(1)translateY(0)} }
        .dom-board::-webkit-scrollbar { width: 5px; height: 5px; }
        .dom-board::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 3px; }
        .dom-board::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <InGameTopBar gameName="🁣 Dominoes" balance={balance} onBack={onBack} onAddBalance={onAddBalance} showShare
        rightSlot={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {gs.mode === 'practice' && gs.phase !== 'setup' && <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(30,136,229,.18)', border: '1px solid rgba(30,136,229,.4)', color: '#42A5F5', fontSize: 11, fontWeight: 700 }}>PRACTICE</span>}
            <button onClick={() => setShowSettings(s => !s)} style={{ background: 'none', border: 'none', color: showSettings ? '#D4AF37' : '#666', cursor: 'pointer' }}><Settings size={20} /></button>
          </div>
        }
      />

      {/* ── Settings panel ── */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 200, background: 'rgba(6,4,0,.98)', borderLeft: '1px solid rgba(212,175,55,.3)', padding: '18px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#D4AF37', fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>⚙ Settings</span>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
          </div>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Domino Skin <span style={{ color: '#555', fontSize: 9, fontWeight: 400 }}>(front / back preview)</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(Object.keys(DOMINO_SKINS) as SkinKey[]).map(k => <SkinCard key={k} skinKey={k} active={dominoSkin === k} onClick={() => setDominoSkin(k)} dims={BASE_DIMS.sm} />)}
            </div>
          </div>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Table Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(Object.keys(TABLE_SKINS) as TableKey[]).map(k => <TableCard key={k} tableKey={k} active={tableSkin === k} onClick={() => setTableSkin(k)} />)}
            </div>
          </div>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Tile Size</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['sm', 'md', 'lg'] as TileSize[]).map(sz => (
                <button key={sz} onClick={() => setTileSize(sz)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: tileSize === sz ? 'rgba(212,175,55,.18)' : 'rgba(255,255,255,.04)', border: `2px solid ${tileSize === sz ? '#D4AF37' : 'rgba(255,255,255,.08)'}`, color: tileSize === sz ? '#D4AF37' : '#666' }}>
                  {{ sm: 'Small', md: 'Medium', lg: 'Large' }[sz]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13 }}>Sound</div><div style={{ color: '#555', fontSize: 11 }}>Tile clack &amp; game audio</div></div>
              <Toggle on={!muted} onToggle={() => setMuted(m => !m)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13 }}>Slam Effect</div><div style={{ color: '#555', fontSize: 11 }}>Table crack on domino-out</div></div>
              <Toggle on={slamOn} onToggle={() => setSlamOn(s => !s)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Setup ── */}
      {gs.phase === 'setup' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(12,9,0,.97)', border: '1px solid rgba(212,175,55,.4)', borderRadius: 20, padding: 36, maxWidth: 440, width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,.85)', animation: 'slideUp .4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 46, marginBottom: 8 }}>🁣🁢🁡</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 24, fontWeight: 800, color: '#D4AF37', letterSpacing: 3 }}>DOMINOES</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 3 }}>Classic Draw · Double-Six · 4 Players · Square Table</div>
            </div>
            <div style={{ background: 'rgba(30,136,229,.08)', border: '1px solid rgba(30,136,229,.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <GraduationCap size={15} color="#42A5F5" />
                <span style={{ color: '#42A5F5', fontWeight: 700, fontSize: 13 }}>Practice Mode</span>
                <span style={{ marginLeft: 'auto', color: gs.practiceGamesLeft > 0 ? '#42A5F5' : '#EF5350', fontWeight: 700, fontSize: 13 }}>{gs.practiceGamesLeft}/3 left</span>
              </div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 10 }}>Learn free — no bets, no payouts. 3 sessions max.</div>
              <button onClick={() => gs.practiceGamesLeft > 0 && startGame('practice')} disabled={gs.practiceGamesLeft === 0} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', cursor: gs.practiceGamesLeft > 0 ? 'pointer' : 'not-allowed', background: gs.practiceGamesLeft > 0 ? 'rgba(30,136,229,.22)' : 'rgba(60,60,60,.3)', color: gs.practiceGamesLeft > 0 ? '#42A5F5' : '#444', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <GraduationCap size={14} />{gs.practiceGamesLeft > 0 ? 'Start Free Practice Game' : 'Practice Limit Reached'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.15)' }}>
              <div><div style={{ fontSize: 9, color: '#555', letterSpacing: '0.15em', fontWeight: 700 }}>YOUR BALANCE</div><div style={{ fontSize: 18, fontWeight: 900, color: '#D4AF37' }}>{formatChipLabel(balance)} $Pc</div></div>
              {onAddBalance && <button onClick={() => onAddBalance(10_000)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)', color: '#66BB6A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><PlusCircle size={13} /> Get $Pc</button>}
            </div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, marginBottom: 8, letterSpacing: '0.1em' }}>PLAY FOR $Pc — SELECT BET</div>
            <div style={{ marginBottom: 12 }}><ChipSelector selectedChip={gs.bet} onSelect={(amt) => { dispatch({ type: 'SET_BET', bet: amt }); setBetConfirmed(false); }} balance={balance} compact /></div>
            <div style={{ color: '#444', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>Win 3× your bet on domino-out!</div>
            {!betConfirmed
              ? <button onClick={confirmBet} disabled={balance < gs.bet} style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', cursor: balance >= gs.bet ? 'pointer' : 'not-allowed', background: balance >= gs.bet ? 'linear-gradient(135deg,#D4AF37,#9A7A20)' : '#2a2a2a', color: balance >= gs.bet ? '#000' : '#555', fontWeight: 700, fontSize: 15 }}>Lock Bet ({formatChipLabel(gs.bet)} $Pc)</button>
              : <button onClick={() => startGame('real')} style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#43A047,#1B5E20)', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Zap size={17} /> Deal Tiles!</button>
            }
            {betConfirmed && <div style={{ marginTop: 8, textAlign: 'center', color: '#43A047', fontSize: 12, fontWeight: 600 }}>✓ Bet locked — click Deal!</div>}
          </div>
        </div>
      )}

      {/* ── Round over ── */}
      {gs.phase === 'roundOver' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(12,9,0,.98)', border: '1px solid rgba(212,175,55,.5)', borderRadius: 20, padding: 46, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,.9)', animation: 'slideUp .5s ease' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{gs.roundWinner === 'You' ? '🏆' : '😔'}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 23, fontWeight: 800, color: gs.roundWinner === 'You' ? '#D4AF37' : '#EF5350', marginBottom: 8 }}>{gs.roundWinner === 'You' ? 'DOMINO OUT!' : `${gs.roundWinner} Wins!`}</div>
            {gs.roundScore > 0 && <div style={{ color: '#555', fontSize: 13, marginBottom: 5 }}>Score: {gs.roundScore} pips</div>}
            {gs.roundWinner === 'You' && gs.mode === 'real' && <div style={{ color: '#43A047', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>+{gs.bet * 3} $Pc</div>}
            {gs.mode === 'practice' && <div style={{ color: '#42A5F5', fontSize: 12, marginBottom: 6 }}>Practice round — no payout</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => { dispatch({ type: 'RESET' }); setBetConfirmed(false); }} style={{ flex: 1, height: 46, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RotateCcw size={14} /> Play Again</button>
              <button onClick={onBack} style={{ flex: 1, height: 46, borderRadius: 10, cursor: 'pointer', background: 'none', border: '1px solid rgba(212,175,55,.35)', color: '#D4AF37', fontWeight: 600, fontSize: 14 }}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Playing: Square table layout ── */}
      {gs.phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: shaking ? 'shake .8s ease' : 'none', padding: '6px 10px 0' }}>

          {/* Square table grid: top / [left, board, right] / bottom */}
          <div style={{ flex: 1, display: 'grid', gridTemplateRows: 'auto 1fr auto', gridTemplateColumns: 'auto 1fr auto', gap: 6, minHeight: 0 }}>

            {/* TOP player (AI 1) */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              {aiPlayers[0] && (
                <div style={{ background: gs.currentPlayer === 1 ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${gs.currentPlayer === 1 ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s' }}>
                  <PlayerSeat player={aiPlayers[0]} active={gs.currentPlayer === 1} tileCount={aiPlayers[0].hand.length} orientation="top" cardBackStyle={cardBackStyle} skinKey={dominoSkin} dims={dims} />
                </div>
              )}
            </div>

            {/* LEFT player (AI 2) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {aiPlayers[1] && (
                <div style={{ background: gs.currentPlayer === 2 ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${gs.currentPlayer === 2 ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s' }}>
                  <PlayerSeat player={aiPlayers[1]} active={gs.currentPlayer === 2} tileCount={aiPlayers[1].hand.length} orientation="left" cardBackStyle={cardBackStyle} skinKey={dominoSkin} dims={dims} />
                </div>
              )}
            </div>

            {/* CENTER: Square table with domino board */}
            <div style={{ position: 'relative', minHeight: 0, minWidth: 0 }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden',
                background: table.felt, border: `3px solid ${table.border}`,
                boxShadow: `inset 0 2px 24px rgba(0,0,0,.55), 0 0 0 5px rgba(0,0,0,.3)`,
              }}>
                {/* Felt grid */}
                <div style={{ position: 'absolute', inset: 0, opacity: .05, pointerEvents: 'none', backgroundImage: `repeating-linear-gradient(0deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 38px),repeating-linear-gradient(90deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 38px)` }} />
                {/* Corner decorations — consistent across games */}
                <div style={{ position: 'absolute', top: 7, left: 8, zIndex: 5, opacity: 0.7, fontSize: 17, pointerEvents: 'none', userSelect: 'none' }}>🥃</div>
                <div style={{ position: 'absolute', top: 7, right: 8, zIndex: 5, opacity: 0.65, fontSize: 15, pointerEvents: 'none', userSelect: 'none' }}>🚬</div>
                <div style={{ position: 'absolute', bottom: 7, left: 8, zIndex: 5, opacity: 0.65, fontSize: 15, pointerEvents: 'none', userSelect: 'none' }}>🍸</div>
                <div style={{ position: 'absolute', bottom: 7, right: 8, zIndex: 5, opacity: 0.65, fontSize: 14, pointerEvents: 'none', userSelect: 'none' }}>🍺</div>

                <CrackOverlay active={cracking} />

                {/* Boneyard + zoom controls */}
                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 6, display: 'flex', gap: 5, alignItems: 'center' }}>
                  <div style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.07)', color: '#666', fontSize: 11 }}>🁣 {gs.boneyard.length}</div>
                  <button onClick={() => setBoardZoom(z => Math.min(z + 0.15, 2.2))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(212,175,55,.3)', background: 'rgba(0,0,0,.6)', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ZoomIn size={13} /></button>
                  <button onClick={() => setBoardZoom(z => Math.max(z - 0.15, 0.4))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(212,175,55,.3)', background: 'rgba(0,0,0,.6)', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ZoomOut size={13} /></button>
                </div>

                {/* End-value labels */}
                {!chainEmpty && (
                  <>
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 6, padding: '3px 9px', borderRadius: 12, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 800, fontSize: 14 }}>{gs.leftVal}</div>
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 6, padding: '3px 9px', borderRadius: 12, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 800, fontSize: 14 }}>{gs.rightVal}</div>
                  </>
                )}

                {/* 2D scrollable board canvas */}
                <div ref={boardRef} className="dom-board" style={{ position: 'absolute', inset: 0, overflow: 'auto', cursor: 'grab' }}>
                  <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
                    {chainEmpty ? (
                      <div style={{ position: 'absolute', left: CANVAS_CX, top: CANVAS_CY, transform: 'translate(-50%,-50%)', color: 'rgba(255,255,255,.18)', fontSize: 13, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                        {gs.firstPlayTileId ? 'Waiting for first double to be played...' : 'Play a tile to start the chain'}
                      </div>
                    ) : (
                      gs.chain.map((pt, i) => {
                        const pos = chainPositions[i];
                        if (!pos) return null;
                        const isNew = i === 0 || i === gs.chain.length - 1;
                        return (
                          <div key={pt.tile.id} style={{ position: 'absolute', left: pos.x, top: pos.y, animation: isNew ? 'tileLand .22s ease-out' : 'none' }}>
                            <DominoTileView dispLeft={pt.dispLeft} dispRight={pt.dispRight} isDouble={pt.isDouble} skinKey={dominoSkin} dims={dims} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT player (AI 3) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {aiPlayers[2] && (
                <div style={{ background: gs.currentPlayer === 3 ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${gs.currentPlayer === 3 ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s' }}>
                  <PlayerSeat player={aiPlayers[2]} active={gs.currentPlayer === 3} tileCount={aiPlayers[2].hand.length} orientation="right" cardBackStyle={cardBackStyle} skinKey={dominoSkin} dims={dims} />
                </div>
              )}
            </div>

            {/* BOTTOM player (Human) */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              {humanPlayer && (
                <div style={{ background: isHumanTurn ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${isHumanTurn ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s' }}>
                  <PlayerSeat player={humanPlayer} active={isHumanTurn} tileCount={humanPlayer.hand.length} isHuman orientation="bottom" cardBackStyle={cardBackStyle} skinKey={dominoSkin} dims={dims} />
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center', padding: '5px 16px', color: isHumanTurn ? '#D4AF37' : '#555', fontSize: 12, fontWeight: 500, flexShrink: 0, minHeight: 28 }}>{statusMsg}</div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', padding: '2px 16px 6px', flexShrink: 0, flexWrap: 'wrap' }}>
            {isHumanTurn && selectedTile && chainEmpty && (
              <><Button onClick={handlePlayFirst} style={{ background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, border: 'none' }}>Place First Tile</Button><Button onClick={() => setSelectedTileId(null)} variant="ghost" style={{ color: '#555' }}>Cancel</Button></>
            )}
            {isHumanTurn && selectedTile && !chainEmpty && (
              <>{canPlayLeft && <Button onClick={() => handlePlayEnd('left')} style={{ background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 700 }}>← Left ({gs.leftVal})</Button>}
              {canPlayRight && <Button onClick={() => handlePlayEnd('right')} style={{ background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 700 }}>Right ({gs.rightVal}) →</Button>}
              <Button onClick={() => setSelectedTileId(null)} variant="ghost" style={{ color: '#555' }}>Cancel</Button></>
            )}
            {isHumanTurn && !selectedTile && (
              <>{canDraw && <Button onClick={handleDraw} style={{ background: 'rgba(30,136,229,.18)', border: '1px solid rgba(30,136,229,.45)', color: '#42A5F5', fontWeight: 700 }}>Draw from Boneyard</Button>}
              {canPass && <Button onClick={handlePass} style={{ background: 'rgba(183,28,28,.18)', border: '1px solid rgba(183,28,28,.45)', color: '#EF5350', fontWeight: 700 }}>Pass Turn</Button>}</>
            )}
          </div>

          {/* Human hand */}
          <div style={{ padding: '8px 14px 14px', background: 'rgba(0,0,0,.5)', borderTop: '1px solid rgba(212,175,55,.1)', flexShrink: 0 }}>
            <div style={{ color: '#D4AF37', fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }}>Your Hand ({humanPlayer?.hand.length ?? 0} tiles)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {humanPlayer?.hand.map(tile => (
                <div key={tile.id} style={{ animation: 'pop .25s ease' }}>
                  <DominoTileView dispLeft={tile.left} dispRight={tile.right} isDouble={tile.left === tile.right}
                    selected={selectedTileId === tile.id}
                    playable={isHumanTurn && playableIds.has(tile.id) && selectedTileId !== tile.id}
                    skinKey={dominoSkin} dims={dims} cardBackStyle={cardBackStyle}
                    onClick={() => handleTileClick(tile.id)} />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
