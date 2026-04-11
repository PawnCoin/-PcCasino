import React, { useState, useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
import { Settings, RotateCcw, Zap, GraduationCap, PlusCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InGameTopBar } from '@/components/InGameTopBar';
import { useCasinoBots } from '@/hooks/useCasinoBots';
import { GameBotBar } from '@/components/GameBotBar';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { CasinoIcon } from '@/components/CasinoIcons';
import { AvatarSprite } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useTableSkin } from '@/hooks/useTableSkin';
import type { TableSkinDef } from '@/hooks/useTableSkin';
import { PremiumFeltOverlay } from '@/components/PremiumFeltOverlay';
import { useDominoSkin } from '@/hooks/useDominoSkin';
import { DOMINO_SKINS } from '@/data/dominoSkins';
import { PcTokenLabel } from '@/components/PcTokenLabel';
import type { SkinKey as DominoSkinKey } from '@/data/dominoSkins';

type CardBackStyle = { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
type GameSpeed = 1 | 2 | 3 | 4;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tile { left: number; right: number; id: string }
interface PlacedTile { tile: Tile; dispLeft: number; dispRight: number; isDouble: boolean; placedBy: string; }
interface DomPlayer { id: string; name: string; avatarDef: AvatarDef; hand: Tile[]; isHuman: boolean; score: number; color: string; }
type Phase = 'setup' | 'washing' | 'picking' | 'playing' | 'roundOver';
type GameMode = 'real' | 'practice';
type SkinKey = DominoSkinKey;
type TileSize = 'sm' | 'md' | 'lg';
type DominoSkinDef = import('@/data/dominoSkins').DominoSkinDef;

interface GS {
  phase: Phase; mode: GameMode;
  players: DomPlayer[]; boneyard: Tile[]; chain: PlacedTile[];
  leftVal: number; rightVal: number;
  currentPlayer: number; consecutivePasses: number;
  bet: number; roundWinner: string; roundScore: number; practiceGamesLeft: number;
  firstPlayTileId: string | null;
  lastPlayedBy: string | null; lastPlayedLeft: number; lastPlayedRight: number;
  lastScorer: string | null; lastScoreAmount: number;
  lastPassedBy: string | null;
  roundNumber: number; targetScore: number;
  roundLoser: string | null;
  pickingPool: Tile[];
  pickingClaims: Record<string, string>;
  freshGame: boolean;
  lastMoveScore: number;
  openEndTotal: number;
  humanReplaced: boolean;
  drawTrigger: number;
  spinnerPlaced: boolean;
  spinnerVal: number;
  spinnerLeftPlayed: boolean;
  spinnerRightPlayed: boolean;
  topChain: PlacedTile[];
  bottomChain: PlacedTile[];
  topVal: number;
  bottomVal: number;
}

type Action =
  | { type: 'INIT_WASH'; mode: GameMode; bet: number; freshGame: boolean; targetScore?: number }
  | { type: 'FINISH_WASH' }
  | { type: 'CLAIM_TILE'; tileId: string; playerId: string }
  | { type: 'START_PLAYING' }
  | { type: 'PLAY_TILE'; playerId: string; tileId: string; end: 'left' | 'right' | 'top' | 'bottom' }
  | { type: 'DRAW'; playerId?: string } | { type: 'PASS' } | { type: 'RESET' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SET_BET'; bet: number }
  | { type: 'REPLACE_HUMAN' };

// ─── Player colors (used in picking phase) ────────────────────────────────────
const PLAYER_COLORS: Record<string, string> = {
  human: '#D4AF37', ai1: '#42A5F5', ai2: '#EF5350', ai3: '#66BB6A',
};

// DOMINO_SKINS imported from @/data/dominoSkins

const CANVAS_W = 5000, CANVAS_H = 600, CANVAS_CX = 2500, CANVAS_CY = 300;
const BASE_DIMS: Record<TileSize, { long: number; short: number; pip: number }> = {
  sm: { long: 58, short: 29, pip: 19 },
  md: { long: 76, short: 38, pip: 26 },
  lg: { long: 96, short: 48, pip: 32 },
};
const TILE_GAP = 5;
const TARGET_SCORE = 150;
const SPEED_DELAYS: Record<GameSpeed, number> = { 1: 3600, 2: 3000, 3: 2400, 4: 2000 };

const DOM_QUICK_TEXTS = ['Nice draw!', "Can't play!", 'Big score!', 'Good block!', 'Ouch!', 'My turn!', 'Watch this!'];
const DOM_REACTIONS = ['fire', 'angry', 'party', 'clap', 'skull', 'wave', 'shocked'];

interface DomReaction { id: string; player: string; emoji: string; }

const AI_AVATARS: AvatarDef[] = [
  { sheet: 1, row: 1, col: 0, name: 'Carlos' },
  { sheet: 2, row: 0, col: 2, name: 'Maya' },
  { sheet: 1, row: 2, col: 3, name: 'Zara' },
];
const HUMAN_AVATAR: AvatarDef = { sheet: 1, row: 0, col: 1, name: 'You' };
const PLAYER_DEFS = [
  { id: 'human', name: 'You',    avatarDef: HUMAN_AVATAR,  isHuman: true,  color: '#D4AF37' },
  { id: 'ai1',   name: 'Carlos', avatarDef: AI_AVATARS[0], isHuman: false, color: '#42A5F5' },
  { id: 'ai2',   name: 'Maya',   avatarDef: AI_AVATARS[1], isHuman: false, color: '#EF5350' },
  { id: 'ai3',   name: 'Zara',   avatarDef: AI_AVATARS[2], isHuman: false, color: '#66BB6A' },
];

// ─── Domino helpers ───────────────────────────────────────────────────────────
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
function canPlay(tile: Tile, lv: number, rv: number, empty: boolean, spinnerPlaced?: boolean, tv?: number, bv?: number, topBottomOpen?: boolean): boolean {
  if (empty) return true;
  if (tile.left === lv || tile.right === lv || tile.left === rv || tile.right === rv) return true;
  if (spinnerPlaced && topBottomOpen && tv !== undefined && bv !== undefined) {
    if (tile.left === tv || tile.right === tv || tile.left === bv || tile.right === bv) return true;
  }
  return false;
}
function canPlayEnd(tile: Tile, end: 'left' | 'right' | 'top' | 'bottom', lv: number, rv: number, spinnerPlaced?: boolean, tv?: number, bv?: number, topBottomOpen?: boolean): boolean {
  if (end === 'left')   return tile.left === lv || tile.right === lv;
  if (end === 'right')  return tile.left === rv || tile.right === rv;
  if (end === 'top')    return !!(spinnerPlaced && topBottomOpen && tv !== undefined && (tile.left === tv || tile.right === tv));
  if (end === 'bottom') return !!(spinnerPlaced && topBottomOpen && bv !== undefined && (tile.left === bv || tile.right === bv));
  return false;
}
function placeRight(tile: Tile, rv: number, by: string): { pt: PlacedTile; newRight: number } {
  const isDouble = tile.left === tile.right;
  if (tile.left === rv) return { pt: { tile, dispLeft: tile.left, dispRight: tile.right, isDouble, placedBy: by }, newRight: tile.right };
  return { pt: { tile, dispLeft: tile.right, dispRight: tile.left, isDouble, placedBy: by }, newRight: tile.left };
}
function placeLeft(tile: Tile, lv: number, by: string): { pt: PlacedTile; newLeft: number } {
  const isDouble = tile.left === tile.right;
  if (tile.right === lv) return { pt: { tile, dispLeft: tile.left, dispRight: tile.right, isDouble, placedBy: by }, newLeft: tile.left };
  return { pt: { tile, dispLeft: tile.right, dispRight: tile.left, isDouble, placedBy: by }, newLeft: tile.right };
}
function handPips(hand: Tile[]) { return hand.reduce((s, t) => s + t.left + t.right, 0); }
/** Standard Caribbean domino scoring: raw pip total rounded to nearest multiple of 5. */
function roundToFive(n: number): number { return Math.round(n / 5) * 5; }
/** All-Fives mid-game scoring: only totals of 10–30 score (5 is excluded). */
const VALID_MID_SCORES = new Set([10, 15, 20, 25, 30]);
function isScoringTotal(n: number): boolean { return VALID_MID_SCORES.has(n); }
function highestDouble(hand: Tile[]): { tile: Tile; val: number } | null {
  const doubles = hand.filter(t => t.left === t.right).sort((a, b) => b.left - a.left);
  if (!doubles.length) return null;
  return { tile: doubles[0], val: doubles[0].left };
}

/**
 * Calculate total open-end pips for All-Fives scoring.
 * Supports 4 open ends when the spinner is placed.
 * Spinner arms: top/bottom open ends each contribute their open value.
 * Doubles at arm tips count both sides (e.g. double-4 = 8).
 * When spinner is placed we don't double-count the spinner itself for left/right.
 */
/**
 * Calculate total open-end pips for All-Fives scoring.
 * Rules:
 *  - The spinner tile itself is NEVER counted as an open end.
 *  - Left arm only counted when spinnerLeftPlayed (a non-spinner tile exists there).
 *  - Right arm only counted when spinnerRightPlayed.
 *  - Top/bottom arms only counted when tiles exist there.
 *  - Doubles at any open end count both pips (value × 2).
 */
function calcOpenEndPips(
  chain: PlacedTile[], lv: number, rv: number,
  topChain: PlacedTile[], bottomChain: PlacedTile[], tv: number, bv: number,
  spinnerPlaced: boolean,
  spinnerLeftPlayed = true, spinnerRightPlayed = true
): number {
  if (chain.length === 0) return 0;

  let total = 0;

  if (!spinnerPlaced) {
    // No spinner: standard two-ended chain
    if (chain.length === 1) return lv + rv;
    total += chain[0].isDouble               ? lv * 2 : lv;
    total += chain[chain.length - 1].isDouble ? rv * 2 : rv;
    return total;
  }

  // Spinner placed: count each arm only when a non-spinner tile occupies that end.
  // Left arm — only when spinnerLeftPlayed (chain[0] is a real tile, not the spinner)
  if (spinnerLeftPlayed && chain.length > 0) {
    total += chain[0].isDouble ? lv * 2 : lv;
  }
  // Right arm — only when spinnerRightPlayed (chain[last] is a real tile, not the spinner)
  if (spinnerRightPlayed && chain.length > 0) {
    total += chain[chain.length - 1].isDouble ? rv * 2 : rv;
  }
  // Top arm — only when tiles exist there
  if (topChain.length > 0) {
    const topEnd = topChain[topChain.length - 1];
    total += topEnd.isDouble ? tv * 2 : tv;
  }
  // Bottom arm — only when tiles exist there
  if (bottomChain.length > 0) {
    const bottomEnd = bottomChain[bottomChain.length - 1];
    total += bottomEnd.isDouble ? bv * 2 : bv;
  }

  return total;
}

/**
 * Simulate placing a tile on any of the 4 ends and return resulting open-end pip total.
 */
function simulatePlay(
  chain: PlacedTile[], topChain: PlacedTile[], bottomChain: PlacedTile[],
  tile: Tile, end: 'left' | 'right' | 'top' | 'bottom',
  lv: number, rv: number, tv: number, bv: number, spinnerPlaced: boolean,
  spinnerLeftPlayed: boolean, spinnerRightPlayed: boolean
): number {
  const isDouble = tile.left === tile.right;
  let newLv = lv, newRv = rv, newTv = tv, newBv = bv;
  let newChain = chain, newTopChain = topChain, newBottomChain = bottomChain;
  let newSLP = spinnerLeftPlayed, newSRP = spinnerRightPlayed;
  if (end === 'right') {
    const pt: PlacedTile = { tile, dispLeft: tile.left === rv ? tile.left : tile.right, dispRight: tile.left === rv ? tile.right : tile.left, isDouble, placedBy: 'ai' };
    newRv = tile.left === rv ? tile.right : tile.left;
    newChain = [...chain, pt];
    if (spinnerPlaced) newSRP = true;
  } else if (end === 'left') {
    const pt: PlacedTile = { tile, dispLeft: tile.right === lv ? tile.left : tile.right, dispRight: tile.right === lv ? tile.right : tile.left, isDouble, placedBy: 'ai' };
    newLv = tile.right === lv ? tile.left : tile.right;
    newChain = [pt, ...chain];
    if (spinnerPlaced) newSLP = true;
  } else if (end === 'top') {
    const pt: PlacedTile = { tile, dispLeft: tile.left, dispRight: tile.right, isDouble, placedBy: 'ai' };
    newTv = tile.left === tv ? tile.right : tile.left;
    newTopChain = [...topChain, pt];
  } else {
    const pt: PlacedTile = { tile, dispLeft: tile.left, dispRight: tile.right, isDouble, placedBy: 'ai' };
    newBv = tile.left === bv ? tile.right : tile.left;
    newBottomChain = [...bottomChain, pt];
  }
  return calcOpenEndPips(newChain, newLv, newRv, newTopChain, newBottomChain, newTv, newBv, spinnerPlaced, newSLP, newSRP);
}

function aiChoose(
  hand: Tile[], lv: number, rv: number, empty: boolean, firstTileId: string | null,
  chain: PlacedTile[], topChain: PlacedTile[], bottomChain: PlacedTile[],
  tv: number, bv: number, spinnerPlaced: boolean, topBottomOpen: boolean,
  spinnerLeftPlayed: boolean, spinnerRightPlayed: boolean
): { tile: Tile; end: 'left' | 'right' | 'top' | 'bottom' } | null {
  if (empty && firstTileId) {
    const t = hand.find(h => h.id === firstTileId);
    return t ? { tile: t, end: 'right' } : null;
  }
  const playable = hand.filter(t => canPlay(t, lv, rv, empty, spinnerPlaced, tv, bv, topBottomOpen));
  if (!playable.length) return null;
  if (empty) {
    const tile = [...playable].sort((a, b) => (b.left + b.right) - (a.left + a.right))[0];
    return { tile, end: 'right' };
  }
  const ends: ('left' | 'right' | 'top' | 'bottom')[] = ['left', 'right'];
  if (spinnerPlaced && topBottomOpen) ends.push('top', 'bottom');
  const candidates: { tile: Tile; end: 'left' | 'right' | 'top' | 'bottom'; score: number; pips: number }[] = [];
  for (const tile of playable) {
    for (const end of ends) {
      if (!canPlayEnd(tile, end, lv, rv, spinnerPlaced, tv, bv, topBottomOpen)) continue;
      const total = simulatePlay(chain, topChain, bottomChain, tile, end, lv, rv, tv, bv, spinnerPlaced, spinnerLeftPlayed, spinnerRightPlayed);
      candidates.push({ tile, end, score: isScoringTotal(total) ? total : 0, pips: tile.left + tile.right });
    }
  }
  candidates.sort((a, b) => b.score - a.score || b.pips - a.pips);
  return candidates[0] ? { tile: candidates[0].tile, end: candidates[0].end } : null;
}
/** The washer for next round is whoever has the LOWEST accumulated score. */
function findRoundLoser(players: DomPlayer[]): string {
  if (!players.length) return '';
  return players.reduce((a, b) => a.score <= b.score ? a : b).name;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function initGS(): GS {
  return {
    phase: 'setup', mode: 'real',
    players: [], boneyard: [], chain: [], leftVal: -1, rightVal: -1,
    currentPlayer: 0, consecutivePasses: 0,
    bet: 10, roundWinner: '', roundScore: 0, practiceGamesLeft: 3,
    firstPlayTileId: null,
    lastPlayedBy: null, lastPlayedLeft: 0, lastPlayedRight: 0,
    lastScorer: null, lastScoreAmount: 0, lastPassedBy: null,
    roundNumber: 0, targetScore: TARGET_SCORE, roundLoser: null, drawTrigger: 0,
    pickingPool: [], pickingClaims: {}, freshGame: true,
    lastMoveScore: 0, openEndTotal: 0, humanReplaced: false,
    spinnerPlaced: false, spinnerVal: -1, spinnerLeftPlayed: false, spinnerRightPlayed: false,
    topChain: [], bottomChain: [], topVal: -1, bottomVal: -1,
  };
}

function gsReducer(state: GS, action: Action): GS {
  switch (action.type) {
    case 'SET_BET': return { ...state, bet: action.bet };

    case 'INIT_WASH': {
      const pool = shuffle(makeDominoSet());
      const prevScores = action.freshGame ? {} : Object.fromEntries(state.players.map(p => [p.id, p.score]));
      const players: DomPlayer[] = PLAYER_DEFS.map(def => ({
        ...def, hand: [], score: action.freshGame ? 0 : (prevScores[def.id] ?? 0),
      }));
      return {
        ...state, phase: 'washing', mode: action.mode, bet: action.bet,
        players, pickingPool: pool, pickingClaims: {}, boneyard: [],
        chain: [], leftVal: -1, rightVal: -1,
        currentPlayer: 0, consecutivePasses: 0,
        roundWinner: '', roundScore: 0,
        firstPlayTileId: null, lastPlayedBy: null, lastPlayedLeft: 0, lastPlayedRight: 0,
        lastPassedBy: null, roundLoser: action.freshGame ? null : state.roundLoser, lastScorer: null, lastScoreAmount: 0,
        lastMoveScore: 0, openEndTotal: 0, humanReplaced: false,
        spinnerPlaced: false, spinnerVal: -1, spinnerLeftPlayed: false, spinnerRightPlayed: false, topChain: [], bottomChain: [], topVal: -1, bottomVal: -1,
        roundNumber: action.freshGame ? 1 : state.roundNumber + 1,
        targetScore: action.targetScore ?? state.targetScore,
        practiceGamesLeft: action.mode === 'practice' ? state.practiceGamesLeft - 1 : state.practiceGamesLeft,
        freshGame: action.freshGame,
      };
    }

    case 'FINISH_WASH': {
      return { ...state, phase: 'picking', pickingClaims: {} };
    }

    case 'CLAIM_TILE': {
      if (state.phase !== 'picking') return state;
      const { tileId, playerId } = action;
      if (state.pickingClaims[tileId]) return state; // already claimed
      const playerClaims = Object.values(state.pickingClaims).filter(pid => pid === playerId).length;
      if (playerClaims >= 7) return state; // already has 7
      return { ...state, pickingClaims: { ...state.pickingClaims, [tileId]: playerId } };
    }

    case 'START_PLAYING': {
      if (state.phase !== 'picking') return state;
      // Build hands from claims
      const claimMap = state.pickingClaims;
      const newPlayers = state.players.map(p => ({
        ...p, hand: state.pickingPool.filter(t => claimMap[t.id] === p.id),
      }));
      // Remaining = boneyard
      const newBoneyard = state.pickingPool.filter(t => !claimMap[t.id]);
      // Determine starting player: highest double
      let startingPlayer = 0, bestVal = -1, firstPlayTileId: string | null = null;
      newPlayers.forEach((p, idx) => {
        const hd = highestDouble(p.hand);
        if (hd && hd.val > bestVal) { bestVal = hd.val; startingPlayer = idx; firstPlayTileId = hd.tile.id; }
      });
      if (!firstPlayTileId) {
        newPlayers.forEach((p, idx) => {
          const maxPip = Math.max(...p.hand.map(t => t.left + t.right));
          if (maxPip > bestVal) { bestVal = maxPip; startingPlayer = idx; firstPlayTileId = p.hand.find(t => t.left + t.right === maxPip)!.id; }
        });
      }
      return { ...state, phase: 'playing', players: newPlayers, boneyard: newBoneyard, currentPlayer: startingPlayer, firstPlayTileId };
    }

    case 'PLAY_TILE': {
      const pIdx = state.players.findIndex(p => p.id === action.playerId);
      if (pIdx < 0) return state;
      const player = state.players[pIdx];
      const tile = player.hand.find(t => t.id === action.tileId);
      if (!tile) return state;
      const chainEmpty = state.chain.length === 0;
      if (chainEmpty && state.firstPlayTileId && tile.id !== state.firstPlayTileId) return state;
      // Validate end — mismatched numbers are illegal; top/bottom blocked until both sides played
      const tbo = state.spinnerLeftPlayed && state.spinnerRightPlayed;
      if (!chainEmpty) {
        if (!canPlayEnd(tile, action.end, state.leftVal, state.rightVal, state.spinnerPlaced, state.topVal, state.bottomVal, tbo)) return state;
      }

      const newHand = player.hand.filter(t => t.id !== tile.id);
      let newChain: PlacedTile[] = state.chain;
      let newLeft = state.leftVal, newRight = state.rightVal;
      let newTopChain: PlacedTile[] = state.topChain;
      let newBottomChain: PlacedTile[] = state.bottomChain;
      let newTopVal = state.topVal, newBottomVal = state.bottomVal;
      let newSpinnerPlaced = state.spinnerPlaced;
      let newSpinnerVal = state.spinnerVal;

      let newSpinnerLeftPlayed = state.spinnerLeftPlayed;
      let newSpinnerRightPlayed = state.spinnerRightPlayed;

      if (chainEmpty) {
        const isDouble = tile.left === tile.right;
        newChain = [{ tile, dispLeft: tile.left, dispRight: tile.right, isDouble, placedBy: player.name }];
        newLeft = tile.left; newRight = tile.right;
        if (isDouble) {
          // First double = spinner: arms open only after BOTH sides have tiles
          newSpinnerPlaced = true;
          newSpinnerVal = tile.left;
          newTopVal = tile.left;
          newBottomVal = tile.left;
          newTopChain = [];
          newBottomChain = [];
          newSpinnerLeftPlayed = false;
          newSpinnerRightPlayed = false;
        }
      } else if (action.end === 'right') {
        const { pt, newRight: nr } = placeRight(tile, state.rightVal, player.name);
        newChain = [...state.chain, pt]; newRight = nr;
        if (state.spinnerPlaced) newSpinnerRightPlayed = true;
      } else if (action.end === 'left') {
        const { pt, newLeft: nl } = placeLeft(tile, state.leftVal, player.name);
        newChain = [pt, ...state.chain]; newLeft = nl;
        if (state.spinnerPlaced) newSpinnerLeftPlayed = true;
      } else if (action.end === 'top') {
        // Play on top arm of spinner — dispLeft=openEnd, dispRight=connectEnd
        // Tiles are rendered rotated 90° CW so dispRight (connect) faces downward toward spinner
        const matchVal = state.topVal;
        const isDouble = tile.left === tile.right;
        const openEndPip = tile.left === matchVal ? tile.right : tile.left;
        const pt: PlacedTile = { tile, dispLeft: openEndPip, dispRight: matchVal, isDouble, placedBy: player.name };
        newTopChain = [...state.topChain, pt];
        newTopVal = openEndPip;
      } else if (action.end === 'bottom') {
        // Play on bottom arm of spinner — dispLeft=openEnd, dispRight=connectEnd
        // Tiles are rendered rotated -90° CW so dispRight (connect) faces upward toward spinner
        const matchVal = state.bottomVal;
        const isDouble = tile.left === tile.right;
        const openEndPip = tile.left === matchVal ? tile.right : tile.left;
        const pt: PlacedTile = { tile, dispLeft: openEndPip, dispRight: matchVal, isDouble, placedBy: player.name };
        newBottomChain = [...state.bottomChain, pt];
        newBottomVal = openEndPip;
      }

      const newPlayers = state.players.map((p, i) => i === pIdx ? { ...p, hand: newHand } : p);

      // Calculate open-end pip total for All-Fives mid-game scoring (4 ends when spinner active)
      const openEndTotal = calcOpenEndPips(newChain, newLeft, newRight, newTopChain, newBottomChain, newTopVal, newBottomVal, newSpinnerPlaced, newSpinnerLeftPlayed, newSpinnerRightPlayed);
      const midGameScore = isScoringTotal(openEndTotal) ? openEndTotal : 0;

      const baseState = {
        ...state, players: newPlayers,
        chain: newChain, leftVal: newLeft, rightVal: newRight,
        topChain: newTopChain, bottomChain: newBottomChain, topVal: newTopVal, bottomVal: newBottomVal,
        spinnerPlaced: newSpinnerPlaced, spinnerVal: newSpinnerVal,
        spinnerLeftPlayed: newSpinnerLeftPlayed, spinnerRightPlayed: newSpinnerRightPlayed,
        currentPlayer: (pIdx + 1) % newPlayers.length, consecutivePasses: 0,
        lastPlayedBy: player.id, lastPlayedLeft: tile.left, lastPlayedRight: tile.right,
        lastPassedBy: null,
        firstPlayTileId: chainEmpty ? null : state.firstPlayTileId,
        openEndTotal,
        lastMoveScore: midGameScore,
      };

      if (newHand.length === 0) {
        const rawPips = newPlayers.filter((_, i) => i !== pIdx).reduce((sum, p) => sum + handPips(p.hand), 0);
        const roundEndScore = roundToFive(rawPips);
        const totalScore = roundEndScore + midGameScore;
        const updatedPlayers = newPlayers.map((p, i) => i === pIdx ? { ...p, score: p.score + totalScore } : p);
        const roundLoser = findRoundLoser(updatedPlayers);
        return { ...baseState, players: updatedPlayers, phase: 'roundOver', roundWinner: player.name, roundScore: totalScore, lastScorer: player.name, lastScoreAmount: totalScore, roundLoser };
      }

      if (midGameScore > 0) {
        const scoringPlayers = newPlayers.map((p, i) =>
          i === pIdx ? { ...p, score: p.score + midGameScore } : p
        );
        return { ...baseState, players: scoringPlayers, lastScorer: player.name, lastScoreAmount: midGameScore };
      }

      return { ...baseState, lastScorer: state.lastScorer, lastScoreAmount: state.lastScoreAmount };
    }

    case 'DRAW': {
      if (!state.boneyard.length) return state;
      const drawn = state.boneyard[0];
      const targetId = action.playerId ?? 'human';
      return {
        ...state,
        boneyard: state.boneyard.slice(1),
        drawTrigger: state.drawTrigger + 1,
        players: state.players.map(p => p.id === targetId ? { ...p, hand: [...p.hand, drawn] } : p),
      };
    }

    case 'PASS': {
      const currentPlayerName = state.players[state.currentPlayer]?.name ?? '';
      const newPasses = state.consecutivePasses + 1;
      const next = (state.currentPlayer + 1) % state.players.length;
      if (newPasses >= state.players.length) {
        const pipsArr = state.players.map((p, i) => ({ idx: i, name: p.name, pips: handPips(p.hand) }));
        const winnerEntry = pipsArr.reduce((a, b) => a.pips <= b.pips ? a : b);
        const rawScore = pipsArr.filter(p => p.idx !== winnerEntry.idx).reduce((s, p) => s + p.pips, 0);
        const score = roundToFive(rawScore);
        const updatedPlayers = state.players.map((p, i) => i === winnerEntry.idx ? { ...p, score: p.score + score } : p);
        const roundLoser = findRoundLoser(updatedPlayers);
        return { ...state, players: updatedPlayers, phase: 'roundOver', roundWinner: winnerEntry.name, roundScore: score, consecutivePasses: newPasses, lastPassedBy: currentPlayerName, lastScorer: winnerEntry.name, lastScoreAmount: score, roundLoser, lastMoveScore: 0 };
      }
      return { ...state, currentPlayer: next, consecutivePasses: newPasses, lastPassedBy: currentPlayerName, lastMoveScore: 0 };
    }

    case 'REPLACE_HUMAN': {
      const updatedPlayers = state.players.map(p => p.isHuman ? { ...p, isHuman: false } : p);
      return { ...state, players: updatedPlayers, humanReplaced: true };
    }
    case 'NEXT_ROUND': return { ...state, phase: 'setup' };
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
  private boneClack(loudness = 0.7) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx(); const sr = ctx.sampleRate;
      const n = Math.floor(sr * 0.25);
      const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const att = Math.min(t / 0.0005, 1.0);
        const impact = (Math.random() * 2 - 1) * Math.exp(-t * 320) * 0.9;
        const tableRes = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 60) * 0.7;
        const bodyRes = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 90) * 0.35;
        const highClick = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 500) * 0.4;
        d[i] = att * (impact + tableRes + bodyRes + highClick) * loudness;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4500;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -6; comp.ratio.value = 4;
      const g = ctx.createGain(); g.gain.value = 1.0;
      src.connect(hp); hp.connect(lp); lp.connect(comp); comp.connect(g); g.connect(ctx.destination); src.start();
    } catch (_) {}
  }
  private boneSlide(loudness = 0.3) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx(); const sr = ctx.sampleRate;
      const n = Math.floor(sr * 0.12);
      const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.min(t / 0.003, 1.0) * Math.exp(-t * 22);
        const scrape = (Math.random() * 2 - 1) * 0.5;
        const rattle = Math.sin(2 * Math.PI * (600 + Math.random() * 200) * t) * 0.15;
        d[i] = env * (scrape + rattle) * loudness;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0.6;
      src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
    } catch (_) {}
  }
  knock() {
    if (this.muted) return;
    const delays = [0, 250, 520];
    delays.forEach((delay, ki) => setTimeout(() => {
      try {
        const ctx = this.getCtx(); const sr = ctx.sampleRate;
        const n = Math.floor(sr * 0.22);
        const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
        const baseFreq = 240 - ki * 12;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const att = Math.min(t / 0.0006, 1.0);
          const knuckle = (Math.random() * 2 - 1) * Math.exp(-t * 350) * 0.5;
          const wood = Math.sin(2 * Math.PI * baseFreq * t) * Math.exp(-t * 35) * 0.8;
          const sub = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 18) * 0.6;
          d[i] = att * (knuckle + wood + sub) * 0.7;
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 350; bp.Q.value = 0.5;
        const g = ctx.createGain(); g.gain.value = 0.8;
        src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
      } catch (_) {}
    }, delay));
  }
  washSound() {
    if (this.muted) return;
    for (let k = 0; k < 20; k++) {
      setTimeout(() => {
        try {
          const ctx = this.getCtx(); const sr = ctx.sampleRate;
          const n = Math.floor(sr * 0.08);
          const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const click = (Math.random() * 2 - 1) * Math.exp(-t * 200) * 0.6;
            const rattle = Math.sin(2 * Math.PI * (800 + Math.random() * 600) * t) * Math.exp(-t * 80) * 0.25;
            d[i] = (click + rattle) * 0.5;
          }
          const src = ctx.createBufferSource(); src.buffer = buf;
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.4;
          const g = ctx.createGain(); g.gain.value = 0.45;
          src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
        } catch (_) {}
      }, k * 120 + Math.random() * 80);
    }
  }
  pickUp() { this.boneSlide(0.4); }
  place() { this.boneClack(0.8); setTimeout(() => this.boneSlide(0.12), 25); }
  draw() { this.boneSlide(0.35); setTimeout(() => this.boneClack(0.3), 50); }
  win() {
    if (this.muted) return;
    [0, 180, 380, 560].forEach(delay => setTimeout(() => this.boneClack(0.5 + Math.random() * 0.3), delay));
    setTimeout(() => {
      try {
        const ctx = this.getCtx(); const sr = ctx.sampleRate;
        const dur = 1.2; const n = Math.floor(sr * dur);
        const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const env = t < 0.15 ? t / 0.15 : Math.exp(-(t - 0.15) * 2.0);
          d[i] = (Math.random() * 2 - 1) * env * 0.3;
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.3;
        const g = ctx.createGain(); g.gain.value = 0.4;
        src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
      } catch (_) {}
    }, 200);
  }
  slam() {
    if (this.muted) return;
    this.boneClack(1.2);
    try {
      const ctx = this.getCtx(); const sr = ctx.sampleRate;
      const n = Math.floor(sr * 0.35);
      const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const thump = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 12) * 1.2;
        const rattle = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.5;
        d[i] = (thump + rattle);
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = 1.0;
      src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start();
    } catch (_) {}
  }
  crack() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx(); const sr = ctx.sampleRate;
      const n = Math.floor(sr * 0.4);
      const buf = ctx.createBuffer(1, n, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const snap = (Math.random() * 2 - 1) * Math.exp(-t * 250) * 1.0;
        const resonance = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 60) * 0.5;
        d[i] = (snap + resonance);
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 1.2;
      src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
    } catch (_) {}
  }
}
const audio = new DominoAudio();

// ─── Pip face ─────────────────────────────────────────────────────────────────
const PIPS: Record<number, [number, number][]> = {
  0: [], 1: [[50,50]], 2: [[28,28],[72,72]], 3: [[28,28],[50,50],[72,72]],
  4: [[28,28],[72,28],[28,72],[72,72]], 5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  // Standard two-column 6-pip layout (used for double-6 and as base)
  6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
};
// On non-double-6 tiles, the 6-pip half displays 3-across × 2-down for correct orientation
const PIPS_6_ROTATED: [number, number][] = [[22,28],[50,28],[78,28],[22,72],[50,72],[78,72]];

function PipFace({ value, color, size, rotated }: { value: number; color: string; size: number; rotated?: boolean }) {
  const dots = (rotated && value === 6) ? PIPS_6_ROTATED : (PIPS[value] ?? []);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={13} fill={color} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.65))' }} />
      ))}
    </svg>
  );
}

// ─── Domino Tile (face-up or face-down on board) ──────────────────────────────
function DominoTileView({
  dispLeft, dispRight, isDouble, selected, playable, faceDown, skinKey, dims, onClick, forceVertical,
  draggable: isDraggable, onDragStart, onDragEnd, isDragging,
}: {
  dispLeft: number; dispRight: number; isDouble: boolean;
  selected?: boolean; playable?: boolean; faceDown?: boolean;
  skinKey: SkinKey; dims: { long: number; short: number; pip: number };
  onClick?: () => void; forceVertical?: boolean;
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; isDragging?: boolean;
}) {
  const skin = DOMINO_SKINS[skinKey] ?? DOMINO_SKINS.ivory;
  // Board doubles are always vertical (perpendicular); hand tiles always vertical too
  const isVert = forceVertical ? true : isDouble;
  const W = isVert ? dims.short : dims.long;
  const H = isVert ? dims.long  : dims.short;
  const flexDir: React.CSSProperties['flexDirection'] = isVert ? 'column' : 'row';
  const borderColor = selected ? '#D4AF37' : playable ? '#43C450' : skin.border;

  // Face-down ALWAYS uses the skin's faceDownBg — global card back style never applies to dominoes
  const faceDownBg = faceDown ? skin.faceDownBg : skin.bg;

  const glowStr = skin.glow
    ? (selected ? `0 0 18px rgba(212,175,55,0.95), 0 0 12px ${skin.glow}, 0 4px 12px rgba(0,0,0,.7)`
       : playable ? `0 0 14px rgba(67,196,80,0.75), 0 0 8px ${skin.glow}, 0 3px 8px rgba(0,0,0,.6)`
       : `0 0 10px ${skin.glow}, 0 3px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)`)
    : (selected ? '0 0 18px rgba(212,175,55,0.95), 0 4px 12px rgba(0,0,0,.7)'
       : playable ? '0 0 14px rgba(67,196,80,0.75), 0 3px 8px rgba(0,0,0,.6)'
       : '0 3px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)');

  return (
    <div onClick={onClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
      width: W, height: H, flexShrink: 0, position: 'relative',
      background: faceDownBg, border: `2px solid ${borderColor}`, borderRadius: 6,
      display: 'flex', flexDirection: flexDir, alignItems: 'center', justifyContent: 'space-around',
      cursor: isDraggable ? 'grab' : onClick ? 'pointer' : 'default',
      boxShadow: glowStr,
      transform: selected ? 'translateY(-10px) scale(1.08)' : playable ? 'translateY(-4px)' : 'none',
      transition: 'all .18s ease', overflow: 'hidden',
      backdropFilter: !faceDown && skin.bg.startsWith('rgba') ? 'blur(8px)' : undefined,
      opacity: isDragging ? 0.35 : 1,
    }}>
      {!faceDown && skin.gloss && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, pointerEvents: 'none', zIndex: 10,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.10) 100%)' }} />
      )}
      {!faceDown && (
        <>
          {/* Non-double tiles: rotate the 6-pip face to 3-across × 2-down */}
          <PipFace value={dispLeft}  color={skin.pip} size={dims.pip} rotated={dispLeft  === 6 && !isDouble} />
          <div style={{ background: skin.divider, flexShrink: 0, width: isVert ? '78%' : 2, height: isVert ? 2 : '78%' }} />
          <PipFace value={dispRight} color={skin.pip} size={dims.pip} rotated={dispRight === 6 && !isDouble} />
        </>
      )}
    </div>
  );
}

// ─── Standing Tile (vertical face-down, for player seats around the table) ────
function StandingTile({ skinKey, w = 16, h = 34, claimedBy }: { skinKey: SkinKey; w?: number; h?: number; claimedBy?: string }) {
  const skin = DOMINO_SKINS[skinKey] ?? DOMINO_SKINS.ivory;
  return (
    <div style={{
      width: w, height: h, flexShrink: 0, borderRadius: 3,
      background: skin.faceDownBg, border: `1.5px solid ${skin.border}`,
      boxShadow: skin.glow ? `0 0 5px ${skin.glow}, 0 2px 4px rgba(0,0,0,0.6)` : '0 2px 5px rgba(0,0,0,0.6)',
      position: 'relative', overflow: 'hidden',
    }}>
      {skin.gloss && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(255,255,255,0.3) 0%,transparent 60%)', pointerEvents: 'none' }} />}
      {claimedBy && (
        <div style={{ position: 'absolute', inset: 0, background: `${claimedBy}44`, borderRadius: 2 }} />
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

// ─── Skin / Table preview cards ───────────────────────────────────────────────
function SkinCard({ skinKey, active, onClick, dims }: { skinKey: string; active: boolean; onClick: () => void; dims: { long: number; short: number; pip: number } }) {
  const skin = DOMINO_SKINS[skinKey];
  const W = Math.round(dims.long * 0.75), H = Math.round(dims.short * 0.75);
  return (
    <button onClick={onClick} style={{ borderRadius: 10, cursor: 'pointer', border: `2px solid ${active ? '#D4AF37' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 5px', transition: 'all .15s', boxShadow: active ? '0 0 8px rgba(212,175,55,0.3)' : 'none' }}>
      <div style={{ width: W, height: H, borderRadius: 4, background: skin.bg, border: `1.5px solid ${skin.border}`, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {skin.gloss && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.35) 0%,transparent 55%)', pointerEvents: 'none', zIndex: 2 }} />}
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: skin.pip }} />
        <div style={{ width: 1.5, height: '70%', background: skin.divider }} />
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: skin.pip }} />
      </div>
      <div style={{ width: W, height: H, borderRadius: 4, background: skin.faceDownBg, border: `1.5px solid ${skin.border}`, overflow: 'hidden', flexShrink: 0 }} />
      <span style={{ fontSize: 8.5, color: active ? '#D4AF37' : '#666', fontWeight: 700, whiteSpace: 'nowrap' }}>{skin.name}</span>
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

// ─── Score Board ──────────────────────────────────────────────────────────────
function ScoreBoard({ players, currentPlayer, lastScorer, lastScoreAmount, roundNumber, targetScore }: {
  players: DomPlayer[]; currentPlayer: number; lastScorer: string | null; lastScoreAmount: number;
  roundNumber: number; targetScore: number;
}) {
  if (!players.length) return null;
  const leader = [...players].sort((a, b) => b.score - a.score)[0];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 12px', background: 'rgba(0,0,0,0.75)', borderBottom: '1px solid rgba(212,175,55,0.15)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {players.map((p, i) => {
          const isActive = i === currentPlayer;
          const isLeader = p.id === leader.id && p.score > 0;
          const pct = Math.min(p.score / targetScore, 1);
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 60 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {isLeader && <span style={{ fontSize: 9, color: '#D4AF37' }}>\u2655</span>}
                <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#D4AF37' : '#ccc' }}>{p.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', minWidth: 45 }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${pct * 100}%`, background: p.color, transition: 'width .5s ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? '#D4AF37' : '#aaa', minWidth: 26, textAlign: 'right' }}>{p.score}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>ROUND {roundNumber} · GOAL {targetScore}</span>
        {lastScorer && lastScoreAmount > 0 && <span style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700 }}>Last: {lastScorer} +{lastScoreAmount} pts</span>}
      </div>
    </div>
  );
}

// ─── Last Play Banner ─────────────────────────────────────────────────────────
function LastPlayBanner({ playerName, left, right, skinKey }: { playerName: string; left: number; right: number; skinKey: SkinKey }) {
  const miniDims = { long: 30, short: 15, pip: 9 };
  return (
    <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px',
      background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(212,175,55,0.5)', borderRadius: 20,
      animation: 'slideDown .2s ease', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
      <span style={{ fontSize: 10, color: '#D4AF37', fontWeight: 700 }}>{playerName} played</span>
      <DominoTileView dispLeft={left} dispRight={right} isDouble={left === right} skinKey={skinKey} dims={miniDims} />
    </div>
  );
}

// ─── Player Seat (around table) ───────────────────────────────────────────────
function PlayerSeat({ player, active, tileCount, isHuman, orientation, skinKey, dims, justPassed }: {
  player: DomPlayer; active: boolean; tileCount: number; isHuman?: boolean;
  orientation: 'top' | 'bottom' | 'left' | 'right';
  skinKey: SkinKey; dims: { long: number; short: number; pip: number };
  justPassed?: boolean;
}) {
  const isVertical = orientation === 'left' || orientation === 'right';
  // Tile size: w=16, h=34 — portrait/vertical standing orientation
  const tileW = 18, tileH = 38;
  return (
    <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', alignItems: 'center', gap: 6, padding: isHuman ? '6px 10px' : '5px 8px', position: 'relative' }}>
      {/* Pass badge */}
      {justPassed && !isHuman && (
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(183,28,28,0.92)', border: '1px solid #EF5350', borderRadius: 10,
          padding: '2px 8px', fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap',
          animation: 'pop .2s ease', zIndex: 10, pointerEvents: 'none' }}>
          {player.name} KNOCKED
        </div>
      )}
      <AvatarSprite avatar={player.avatarDef} size={isHuman ? 40 : 32} active={active} style={{ flexShrink: 0, borderRadius: '50%' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isVertical ? 'center' : 'flex-start', gap: 1, minWidth: 0 }}>
        <div style={{ fontSize: isHuman ? 11 : 10, fontWeight: 700, color: active ? '#D4AF37' : '#aaa', whiteSpace: 'nowrap' }}>
          {player.name}
          {active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', marginLeft: 3, animation: 'pulse 1s infinite', verticalAlign: 'middle' }} />}
        </div>
        <div style={{ color: '#aaa', fontSize: 9 }}>{tileCount} tile{tileCount !== 1 ? 's' : ''}</div>
        <div style={{ color: player.color, fontSize: 11, fontWeight: 800 }}>{player.score} pts</div>
      </div>
      {!isHuman && tileCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'center', maxWidth: 240 }}>
          {Array.from({ length: tileCount }, (_, i) => (
            <StandingTile key={i} skinKey={skinKey} w={tileW} h={tileH} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Washing Screen ───────────────────────────────────────────────────────────
function WashingScreen({ onDone, skinKey, washerName, isNewGame }: { onDone: () => void; skinKey: SkinKey; washerName: string; isNewGame?: boolean }) {
  const [frame, setFrame] = useState(0);
  const [washing, setWashing] = useState(false);
  const washedRef = useRef(false);

  const doWash = useCallback(() => {
    if (washedRef.current) return;
    washedRef.current = true;
    setWashing(true);
    audio.washSound();
    const iv = setInterval(() => setFrame(f => f + 1), 80);
    const tm = setTimeout(() => { clearInterval(iv); onDone(); }, 2800);
    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [onDone]);

  // Auto-start: new game always auto-washes. CPU washer also auto-washes — only human sees the button.
  const autoWash = isNewGame || (washerName !== 'You' && washerName !== '');
  useEffect(() => {
    if (autoWash) {
      const tm = setTimeout(() => doWash(), 800);
      return () => clearTimeout(tm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWash]);

  const skin = DOMINO_SKINS[skinKey] ?? DOMINO_SKINS.ivory;
  const count = 18;

  const titleText = isNewGame
    ? (washing ? 'COMPUTER IS SHUFFLING...' : 'NEW GAME \u2014 Computer Shuffles the Bones')
    : washerName === 'You'
      ? (washing ? 'WASHING THE BONES...' : 'YOU HAVE THE LOWEST SCORE \u2014 MUST WASH!')
      : (washing ? `${washerName.toUpperCase()} IS WASHING...` : `${washerName.toUpperCase()} HAS THE LOWEST SCORE \u2014 WASHING...`);

  const subText = isNewGame
    ? 'Dealer shuffles all 28 bones face-down…'
    : (washing ? 'Mixing all 28 dominoes face-down…' : washerName === 'You' ? 'Lowest score washes the bones for next round' : `${washerName} is washing the bones…`);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37', marginBottom: 4 }}>{titleText}</div>
        <div style={{ color: '#aaa', fontSize: 12 }}>{subText}</div>
      </div>

      {/* Animated bone pile */}
      <div style={{ position: 'relative', width: 360, height: 100 }}>
        {Array.from({ length: count }, (_, i) => {
          const angle = ((frame * (washing ? 9 : 0) + i * (360 / count)) % 360) * (Math.PI / 180);
          const rx = 150, ry = 30;
          const x = Math.cos(angle) * rx;
          const y = Math.sin(angle) * ry;
          const scale = washing ? (0.55 + 0.45 * ((Math.sin(angle) + 1) / 2)) : 0.7 + (i % 3) * 0.1;
          const xi = washing ? x : (i - count / 2) * 18 + (Math.sin(i * 1.7) * 8);
          const yi = washing ? y : Math.sin(i * 2.1) * 15;
          return (
            <div key={i} style={{
              position: 'absolute', left: `calc(50% + ${xi}px - 8px)`, top: `calc(50% + ${yi}px - 17px)`,
              width: 16, height: 34, borderRadius: 3,
              background: skin.faceDownBg, border: `1.5px solid ${skin.border}`,
              transform: `scale(${scale}) rotate(${washing ? frame * 2 + i * 5 : i * 12}deg)`,
              opacity: scale * 0.9,
              transition: washing ? 'left .08s linear, top .08s linear' : 'none',
              boxShadow: skin.glow ? `0 0 4px ${skin.glow}` : '0 2px 4px rgba(0,0,0,0.5)',
            }} />
          );
        })}
      </div>

      {/* Manual wash button only shown when human has lowest score and not yet washing */}
      {washerName === 'You' && !washing && (
        <button onClick={doWash} style={{
          padding: '14px 40px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000',
          fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 0 20px rgba(212,175,55,0.4)', animation: 'pulse 1.2s infinite',
        }}>
          Wash the Bones!
        </button>
      )}
    </div>
  );
}

const PICK_TIME_LIMIT = 20;

// ─── Picking Screen (full table visible, simultaneous picking) ────────────────
function PickingScreen({
  players, pickingPool, pickingClaims, tableSkinDef, skinKey, onClaim, onStart, gameSpeed,
}: {
  players: DomPlayer[]; pickingPool: Tile[]; pickingClaims: Record<string, string>;
  tableSkinDef: TableSkinDef; skinKey: SkinKey; onClaim: (tileId: string, playerId: string) => void;
  onStart: () => void; gameSpeed: GameSpeed;
}) {
  const table = tableSkinDef;
  const skin = DOMINO_SKINS[skinKey] ?? DOMINO_SKINS.ivory;

  const humanClaims = Object.entries(pickingClaims).filter(([, pid]) => pid === 'human').length;
  const humanDone = humanClaims >= 7;
  const allDone = players.every(p => Object.values(pickingClaims).filter(pid => pid === p.id).length >= 7);

  // Pick countdown timer — auto-fill human's bones if time runs out
  const [pickTimeLeft, setPickTimeLeft] = useState(PICK_TIME_LIMIT);
  const autoFillRef = useRef(false);

  useEffect(() => {
    if (humanDone || allDone) return;
    const iv = setInterval(() => {
      setPickTimeLeft(t => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanDone, allDone]);

  // Separate effect: auto-fill human tiles when countdown hits 0 (NOT inside setState updater)
  useEffect(() => {
    if (pickTimeLeft === 0 && !humanDone && !autoFillRef.current) {
      autoFillRef.current = true;
      const unclaimed = pickingPool.filter(tile => !pickingClaims[tile.id]);
      const needed = 7 - humanClaims;
      const shuffled = [...unclaimed].sort(() => Math.random() - 0.5);
      shuffled.slice(0, needed).forEach(tile => onClaim(tile.id, 'human'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickTimeLeft, humanDone]);

  // AI auto-picking — picks one tile at a time at speed-based intervals
  useEffect(() => {
    if (allDone) return;
    const aiIds = ['ai1', 'ai2', 'ai3'];
    const delay = SPEED_DELAYS[gameSpeed] * 0.45;
    const iv = setInterval(() => {
      const unclaimed = pickingPool.filter(t => !pickingClaims[t.id]);
      if (!unclaimed.length) { clearInterval(iv); return; }
      // If only ONE player still needs tiles, give them all remaining at once
      const playersNeeding = players.filter(p => Object.values(pickingClaims).filter(pid => pid === p.id).length < 7);
      if (playersNeeding.length === 1) {
        const needer = playersNeeding[0];
        const neededCount = 7 - Object.values(pickingClaims).filter(pid => pid === needer.id).length;
        unclaimed.slice(0, neededCount).forEach(t => onClaim(t.id, needer.id));
        clearInterval(iv);
        return;
      }
      const currentUnclaimed = pickingPool.filter(t => !pickingClaims[t.id]);
      const shuffledUnclaimed = [...currentUnclaimed].sort(() => Math.random() - 0.5);
      let pickIdx = 0;
      for (const aiId of aiIds) {
        const aiCount = Object.values(pickingClaims).filter(pid => pid === aiId).length;
        if (aiCount < 7 && pickIdx < shuffledUnclaimed.length) {
          const pick = shuffledUnclaimed[pickIdx];
          if (pick && !pickingClaims[pick.id]) {
            onClaim(pick.id, aiId);
            audio.pickUp();
            pickIdx++;
          }
        }
      }
    }, delay);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingClaims, allDone, pickingPool, gameSpeed]);

  // Auto-start when all done
  useEffect(() => {
    if (allDone) { setTimeout(onStart, 600); }
  }, [allDone, onStart]);

  const aiPlayers = players.filter(p => !p.isHuman);
  const humanPlayer = players.find(p => p.isHuman);

  const getPlayerForTile = (tileId: string): DomPlayer | null => {
    const pid = pickingClaims[tileId];
    return pid ? (players.find(p => p.id === pid) ?? null) : null;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '6px 10px 0' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateRows: 'auto 1fr auto', gridTemplateColumns: 'minmax(100px, auto) 1fr minmax(100px, auto)', gap: 6, minHeight: 0 }}>

        {/* TOP */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          {aiPlayers[0] && (
            <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12 }}>
              <PlayerSeat player={aiPlayers[0]} active={false} tileCount={Object.values(pickingClaims).filter(p => p === 'ai1').length} orientation="top" skinKey={skinKey} dims={BASE_DIMS.sm} />
            </div>
          )}
        </div>

        {/* LEFT */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {aiPlayers[1] && (
            <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12 }}>
              <PlayerSeat player={aiPlayers[1]} active={false} tileCount={Object.values(pickingClaims).filter(p => p === 'ai2').length} orientation="left" skinKey={skinKey} dims={BASE_DIMS.sm} />
            </div>
          )}
        </div>

        {/* CENTER TABLE with picking pool */}
        <div style={{ position: 'relative', minHeight: 0, minWidth: 0 }}>
          <div className="wood-rail" style={{ width: '100%', height: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', background: table.felt, boxShadow: `inset 0 2px 24px rgba(0,0,0,.55), inset 0 0 60px rgba(0,0,0,0.4)` }}>
            <PremiumFeltOverlay borderRadius="16px" goldBorderInset={6} showSpotlight={true} />
            <div style={{ position: 'absolute', inset: 0, opacity: .05, pointerEvents: 'none', backgroundImage: `repeating-linear-gradient(0deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 38px),repeating-linear-gradient(90deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 38px)` }} />
            {/* Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 12px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '4px 10px', color: '#D4AF37', fontWeight: 700, fontSize: 12 }}>
                  {humanDone ? '7 Bones — Ready!' : `Pick ${7 - humanClaims} more`}
                </div>
                {players.map(p => {
                  const count = Object.values(pickingClaims).filter(pid => pid === p.id).length;
                  return (
                    <div key={p.id} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${count >= 7 ? 'rgba(67,160,71,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                      <span style={{ fontSize: 9, color: p.color, fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: count >= 7 ? '#66BB6A' : '#888', fontWeight: 800 }}>{count}/7</span>
                    </div>
                  );
                })}
              </div>
              {!humanDone && (
                <div style={{
                  background: pickTimeLeft <= 5 ? 'rgba(183,28,28,0.85)' : 'rgba(0,0,0,0.7)',
                  border: `1px solid ${pickTimeLeft <= 5 ? '#EF5350' : 'rgba(212,175,55,0.3)'}`,
                  borderRadius: 8, padding: '4px 10px',
                  color: pickTimeLeft <= 5 ? '#fff' : '#888', fontWeight: 700, fontSize: 12,
                  transition: 'all .3s', animation: pickTimeLeft <= 5 ? 'pulse .6s infinite' : 'none',
                }}>
                  Auto-pick in {pickTimeLeft}s
                </div>
              )}
              {allDone && (
                <div style={{ padding: '5px 16px', borderRadius: 8, background: 'rgba(67,160,71,0.2)', border: '1px solid rgba(67,160,71,0.5)', color: '#66BB6A', fontWeight: 700, fontSize: 12 }}>
                  Starting…
                </div>
              )}
              {humanDone && !allDone && (
                <div style={{ padding: '5px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#aaa', fontWeight: 700, fontSize: 12 }}>
                  Waiting for others…
                </div>
              )}
            </div>

            {/* All 28 tiles scrambled on the table */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap', gap: 8, padding: '40px 16px 12px', alignContent: 'center', justifyContent: 'center', overflow: 'auto' }}>
              {pickingPool.map((tile, i) => {
                const claimer = getPlayerForTile(tile.id);
                const isClaimedByHuman = pickingClaims[tile.id] === 'human';
                const isClaimed = !!pickingClaims[tile.id];
                const canClaim = !isClaimed && !humanDone;
                return (
                  <div key={tile.id}
                    onClick={canClaim ? () => { onClaim(tile.id, 'human'); audio.pickUp(); } : undefined}
                    style={{
                      width: 30, height: 58, borderRadius: 5,
                      background: isClaimed ? (claimer?.color ? `${claimer.color}` : skin.faceDownBg) : skin.faceDownBg,
                      border: `2px solid ${isClaimed ? (claimer?.color ?? skin.border) : skin.border}`,
                      cursor: canClaim ? 'pointer' : 'default',
                      opacity: isClaimed ? 0.5 : 1,
                      transform: `rotate(${(i * 7) % 9 - 4}deg) ${isClaimedByHuman ? 'scale(0.85)' : canClaim ? 'scale(1)' : 'scale(0.9)'}`,
                      transition: 'all .2s',
                      boxShadow: canClaim ? `0 0 10px rgba(212,175,55,0.5), 0 3px 6px rgba(0,0,0,0.6)` : '0 2px 4px rgba(0,0,0,0.4)',
                      position: 'relative', overflow: 'hidden',
                      animation: !isClaimed && i % 4 === 0 ? 'pulse 2s infinite' : 'none',
                    }}>
                    {skin.gloss && !isClaimed && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(255,255,255,0.25) 0%,transparent 55%)', pointerEvents: 'none' }} />}
                    {isClaimed && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {claimer?.name?.[0] ?? ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {aiPlayers[2] && (
            <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12 }}>
              <PlayerSeat player={aiPlayers[2]} active={false} tileCount={Object.values(pickingClaims).filter(p => p === 'ai3').length} orientation="right" skinKey={skinKey} dims={BASE_DIMS.sm} />
            </div>
          )}
        </div>

        {/* BOTTOM (human) */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          {humanPlayer && (
            <div style={{ background: 'rgba(212,175,55,.08)', border: '1px solid rgba(212,175,55,.3)', borderRadius: 12 }}>
              <div style={{ padding: '5px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700 }}>Your Hand ({humanClaims}/7)</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} style={{ width: 20, height: 42, borderRadius: 4, background: i < humanClaims ? skin.faceDownBg : 'rgba(255,255,255,0.05)', border: `2px solid ${i < humanClaims ? skin.border : 'rgba(255,255,255,0.08)'}`, transition: 'all .2s', transform: i < humanClaims ? 'scale(1)' : 'scale(0.85)', opacity: i < humanClaims ? 1 : 0.3 }} />
                  ))}
                </div>
                <div style={{ color: '#555', fontSize: 10 }}>
                  {humanDone ? 'Hand full! Waiting for AI…' : 'Click bones on the table to grab them — first come first served!'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Thought Bubble / Reaction UI ─────────────────────────────────────────────
function DomReactionBubble({ reaction, playerColor }: { reaction: DomReaction; playerColor: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(18,12,0,0.96)', border: `1.5px solid ${playerColor}`,
      borderRadius: 18, padding: '5px 13px', fontSize: 20, whiteSpace: 'nowrap',
      pointerEvents: 'none', zIndex: 50,
      boxShadow: `0 4px 18px rgba(0,0,0,0.7), 0 0 10px ${playerColor}55`,
      animation: 'bubblePop .32s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      <CasinoIcon name={reaction.emoji} size={24} />
      <div style={{
        position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: `8px solid ${playerColor}`,
      }} />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface DominoesGameProps {
  balance: number; onBack: () => void;
  onBet: (amount: number) => boolean; onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void; cardBackStyle?: CardBackStyle;
  onShowWallet?: () => void;
}

export function DominoesGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet }: DominoesGameProps) {
  const { settings } = useGlobalGame();
  const { reactions: emojiReactions, winBursts, addAIReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const [gs, dispatch] = useReducer(gsReducer, undefined, initGS);
  const { isMuted, playSound } = useSoundEffects();
  const { activeBots, onlinePlayerCount, chatMessages, triggerGameEvent } = useCasinoBots({ gameName: 'Dominoes', minBots: 2, maxBots: 6, statusMessages: ['Watching', 'Waiting', 'Next game', 'Spectating'] });
  const [muted, setMuted] = useState(false);
  const [slamOn, setSlamOn] = useState(true);
  const [selectedTargetScore, setSelectedTargetScore] = useState<number>(150);
  const { activeSkinKey: dominoSkin, selectSkin: setDominoSkin } = useDominoSkin();
  const { activeSkin: tableSkinDef } = useTableSkin();
  const [tileSize, setTileSize] = useState<TileSize>('md');
  const [boardZoom, setBoardZoom] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [betConfirmed, setBetConfirmed] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(2);
  const [lastPlayBanner, setLastPlayBanner] = useState<{ playerName: string; left: number; right: number } | null>(null);
  const [playSecondsLeft, setPlaySecondsLeft] = useState(30);
  const [reactions, setReactions] = useState<DomReaction[]>([]);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [propCelebrating, setPropCelebrating] = useState(false);
  const [dropZoneOver, setDropZoneOver] = useState<'left' | 'right' | 'top' | 'bottom' | 'first' | null>(null);

  const [chainCenterIdx, setChainCenterIdx] = useState(0);
  const prevChainRef = useRef<PlacedTile[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { audio.muted = muted || isMuted; }, [muted, isMuted]);

  const addReaction = useCallback((emoji: string, pid: string = 'human') => {
    const r: DomReaction = { id: `${Date.now()}-${Math.random()}`, player: pid, emoji };
    setReactions(prev => [...prev.slice(-4), r]);
    setTimeout(() => setReactions(prev => prev.filter(x => x.id !== r.id)), 2800);
  }, []);

  const dims = useMemo(() => {
    const base = BASE_DIMS[tileSize];
    return { long: Math.round(base.long * boardZoom), short: Math.round(base.short * boardZoom), pip: Math.round(base.pip * boardZoom) };
  }, [tileSize, boardZoom]);

  // Chain center tracking
  useEffect(() => {
    const prev = prevChainRef.current, cur = gs.chain;
    if (cur.length === 0) setChainCenterIdx(0);
    else if (cur.length === 1) setChainCenterIdx(0);
    else if (cur.length > prev.length && prev.length > 0 && cur[0].tile.id !== prev[0].tile.id) setChainCenterIdx(ci => ci + 1);
    else if (cur.length < prev.length) setChainCenterIdx(0);
    prevChainRef.current = cur;
  }, [gs.chain]);

  const chainPositions = useMemo(() => {
    const chain = gs.chain;
    if (!chain.length) return [];
    const positions: { x: number; y: number; w: number; h: number }[] = new Array(chain.length);
    const ci = Math.min(chainCenterIdx, chain.length - 1);
    const ct = chain[ci];
    const ctW = ct.isDouble ? dims.short : dims.long, ctH = ct.isDouble ? dims.long : dims.short;
    positions[ci] = { x: CANVAS_CX - ctW / 2, y: CANVAS_CY - ctH / 2, w: ctW, h: ctH };
    let rx = CANVAS_CX + ctW / 2 + TILE_GAP;
    for (let i = ci + 1; i < chain.length; i++) {
      const pt = chain[i]; const w = pt.isDouble ? dims.short : dims.long; const h = pt.isDouble ? dims.long : dims.short;
      positions[i] = { x: rx, y: CANVAS_CY - h / 2, w, h }; rx += w + TILE_GAP;
    }
    let lx = CANVAS_CX - ctW / 2 - TILE_GAP;
    for (let i = ci - 1; i >= 0; i--) {
      const pt = chain[i]; const w = pt.isDouble ? dims.short : dims.long; const h = pt.isDouble ? dims.long : dims.short;
      lx -= w; positions[i] = { x: lx, y: CANVAS_CY - h / 2, w, h }; lx -= TILE_GAP;
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

  // Auto-scroll newest tile
  useEffect(() => {
    if (!boardRef.current || !chainPositions.length) return;
    const b = boardRef.current;
    const last = chainPositions[gs.chain.length - 1];
    if (!last) return;
    if (last.x + last.w + 40 > b.scrollLeft + b.clientWidth - 20) b.scrollLeft = last.x + last.w - b.clientWidth + 80;
    else if ((chainPositions[0]?.x ?? 0) - 40 < b.scrollLeft + 20) b.scrollLeft = (chainPositions[0]?.x ?? 0) - 80;
  }, [chainPositions, gs.chain.length]);

  // Last-play banner
  useEffect(() => {
    if (gs.chain.length > 0 && gs.lastPlayedBy) {
      const playerName = gs.players.find(p => p.id === gs.lastPlayedBy)?.name ?? gs.lastPlayedBy;
      setLastPlayBanner({ playerName, left: gs.lastPlayedLeft, right: gs.lastPlayedRight });
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setLastPlayBanner(null), 2200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.chain.length]);

  // Mid-game score notification + celebrate bounce on human score
  useEffect(() => {
    if (gs.phase !== 'playing' || !gs.lastMoveScore || gs.lastMoveScore <= 0) return;
    const scorer = gs.lastScorer ?? '';
    const isHuman = scorer === 'You';
    if (isHuman) {
      toast.success(`+${gs.lastMoveScore} pts! (${gs.openEndTotal} open ends)`);
      setPropCelebrating(true);
      setTimeout(() => setPropCelebrating(false), 1200);
    } else {
      toast.info(`${scorer} scored +${gs.lastMoveScore} pts`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.chain.length, gs.lastMoveScore]);

  // Play timer — reset when turn changes, replace human if they go AFK
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const currentIsHuman = gs.players[gs.currentPlayer]?.id === 'human' && gs.players[gs.currentPlayer]?.isHuman;
    setPlaySecondsLeft(30);
    if (!currentIsHuman) return;
    const iv = setInterval(() => {
      setPlaySecondsLeft(s => {
        if (s <= 1) {
          clearInterval(iv);
          toast.error('Too slow! You were replaced by CPU.');
          dispatch({ type: 'REPLACE_HUMAN' });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.currentPlayer, gs.phase]);

  // Derived state
  const isHumanTurn = gs.phase === 'playing' && gs.players[gs.currentPlayer]?.id === 'human';
  const humanPlayer = gs.players.find(p => p.isHuman);
  const aiPlayers   = gs.players.filter(p => !p.isHuman);
  const chainEmpty  = gs.chain.length === 0;

  const topBottomOpen = gs.spinnerLeftPlayed && gs.spinnerRightPlayed;

  const playableIds = useMemo(() => {
    const set = new Set<string>();
    if (!isHumanTurn || !humanPlayer) return set;
    if (chainEmpty && gs.firstPlayTileId) {
      if (humanPlayer.hand.find(t => t.id === gs.firstPlayTileId)) set.add(gs.firstPlayTileId);
      return set;
    }
    humanPlayer.hand.forEach(t => { if (canPlay(t, gs.leftVal, gs.rightVal, chainEmpty, gs.spinnerPlaced, gs.topVal, gs.bottomVal, topBottomOpen)) set.add(t.id); });
    return set;
  }, [isHumanTurn, humanPlayer, chainEmpty, gs.firstPlayTileId, gs.leftVal, gs.rightVal, gs.spinnerPlaced, gs.topVal, gs.bottomVal, topBottomOpen]);

  const canDraw    = isHumanTurn && playableIds.size === 0 && gs.boneyard.length > 0;
  const canPass    = isHumanTurn && playableIds.size === 0 && gs.boneyard.length === 0;
  const selectedTile = humanPlayer?.hand.find(t => t.id === selectedTileId) ?? null;
  const draggingTile = humanPlayer?.hand.find(t => t.id === draggingTileId) ?? null;
  const activeTile = draggingTile ?? selectedTile;
  const canPlayLeft   = !!activeTile && !chainEmpty && canPlayEnd(activeTile, 'left',   gs.leftVal, gs.rightVal, gs.spinnerPlaced, gs.topVal, gs.bottomVal, topBottomOpen);
  const canPlayRight  = !!activeTile && !chainEmpty && canPlayEnd(activeTile, 'right',  gs.leftVal, gs.rightVal, gs.spinnerPlaced, gs.topVal, gs.bottomVal, topBottomOpen);
  const canPlayTop    = !!activeTile && !chainEmpty && canPlayEnd(activeTile, 'top',    gs.leftVal, gs.rightVal, gs.spinnerPlaced, gs.topVal, gs.bottomVal, topBottomOpen);
  const canPlayBottom = !!activeTile && !chainEmpty && canPlayEnd(activeTile, 'bottom', gs.leftVal, gs.rightVal, gs.spinnerPlaced, gs.topVal, gs.bottomVal, topBottomOpen);

  const ghostPositions = useMemo(() => {
    if (!activeTile || chainEmpty) return {};
    const result: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const isActiveDouble = activeTile.left === activeTile.right;
    if (canPlayLeft && chainPositions.length > 0) {
      const first = chainPositions[0];
      if (first) {
        const w = isActiveDouble ? dims.short : dims.long;
        const h = isActiveDouble ? dims.long : dims.short;
        result.left = { x: first.x - TILE_GAP - w, y: CANVAS_CY - h / 2, w, h };
      }
    }
    if (canPlayRight && chainPositions.length > 0) {
      const last = chainPositions[chainPositions.length - 1];
      if (last) {
        const w = isActiveDouble ? dims.short : dims.long;
        const h = isActiveDouble ? dims.long : dims.short;
        result.right = { x: last.x + last.w + TILE_GAP, y: CANVAS_CY - h / 2, w, h };
      }
    }
    if (canPlayTop && gs.spinnerPlaced) {
      const spinnerPos = chainPositions[chainCenterIdx];
      if (spinnerPos) {
        const spinnerCX = spinnerPos.x + spinnerPos.w / 2;
        let curY = spinnerPos.y - TILE_GAP;
        for (let i = 0; i < gs.topChain.length; i++) {
          const pt = gs.topChain[i];
          const visH = pt.isDouble ? dims.short : dims.long;
          curY -= visH + TILE_GAP;
        }
        const visW = isActiveDouble ? dims.long : dims.short;
        const visH = isActiveDouble ? dims.short : dims.long;
        result.top = { x: spinnerCX - visW / 2, y: curY - visH, w: visW, h: visH };
      }
    }
    if (canPlayBottom && gs.spinnerPlaced) {
      const spinnerPos = chainPositions[chainCenterIdx];
      if (spinnerPos) {
        const spinnerCX = spinnerPos.x + spinnerPos.w / 2;
        let curY = spinnerPos.y + spinnerPos.h + TILE_GAP;
        for (let i = 0; i < gs.bottomChain.length; i++) {
          const pt = gs.bottomChain[i];
          const visH = pt.isDouble ? dims.short : dims.long;
          curY += visH + TILE_GAP;
        }
        const visW = isActiveDouble ? dims.long : dims.short;
        const visH = isActiveDouble ? dims.short : dims.long;
        result.bottom = { x: spinnerCX - visW / 2, y: curY, w: visW, h: visH };
      }
    }
    return result;
  }, [activeTile, chainEmpty, canPlayLeft, canPlayRight, canPlayTop, canPlayBottom, chainPositions, chainCenterIdx, dims, gs.spinnerPlaced, gs.topChain, gs.bottomChain]);

  // AI turn — draws from boneyard if no playable tile before passing
  useEffect(() => {
    if (gs.phase !== 'playing') return;
    const player = gs.players[gs.currentPlayer];
    if (!player || player.isHuman) return;
    if (aiTimer.current) clearTimeout(aiTimer.current);
    const delay = SPEED_DELAYS[gameSpeed] + Math.random() * (SPEED_DELAYS[gameSpeed] * 0.3);
    aiTimer.current = setTimeout(() => {
      const choice = aiChoose(player.hand, gs.leftVal, gs.rightVal, chainEmpty, gs.firstPlayTileId, gs.chain, gs.topChain, gs.bottomChain, gs.topVal, gs.bottomVal, gs.spinnerPlaced, topBottomOpen, gs.spinnerLeftPlayed, gs.spinnerRightPlayed);
      if (choice) {
        audio.place();
        const reactionRoll = Math.random();
        if (reactionRoll > 0.75) {
          // Quick text phrase reaction
          const phrase = DOM_QUICK_TEXTS[Math.floor(Math.random() * DOM_QUICK_TEXTS.length)];
          setTimeout(() => addReaction(phrase, player.id), 200);
        } else if (reactionRoll > 0.5) {
          // Emoji reaction
          setTimeout(() => addReaction(DOM_REACTIONS[Math.floor(Math.random() * DOM_REACTIONS.length)], player.id), 200);
        }
        dispatch({ type: 'PLAY_TILE', playerId: player.id, tileId: choice.tile.id, end: choice.end });
        addAIReaction(player.id);
      } else if (gs.boneyard.length > 0) {
        // AI draws from boneyard — will retry on next drawTrigger cycle
        audio.draw();
        if (Math.random() > 0.5) setTimeout(() => addReaction(Math.random() > 0.5 ? "angry" : "Can't play!", player.id), 150);
        dispatch({ type: 'DRAW', playerId: player.id });
      } else {
        audio.knock();
        if (Math.random() > 0.45) setTimeout(() => addReaction(Math.random() > 0.5 ? "fist" : "Good block!", player.id), 100);
        dispatch({ type: 'PASS' });
      }
    }, delay);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.currentPlayer, gs.phase, gameSpeed, gs.drawTrigger]);

  // Round over effects
  const prevPhase = useRef<Phase>('setup');
  useEffect(() => {
    if (gs.phase === 'roundOver' && prevPhase.current !== 'roundOver') {
      const humanWon = gs.roundWinner === 'You';
      setPropCelebrating(true);
      setTimeout(() => setPropCelebrating(false), 1200);
      if (humanWon) {
        if (slamOn) { setShaking(true); setCracking(true); setTimeout(() => { setShaking(false); setCracking(false); }, 900); }
        audio.slam(); setTimeout(() => audio.crack(), 180); setTimeout(() => audio.win(), 350);
        addReaction('party', 'human');
        if (gs.mode === 'real') { const w = gs.bet * 3; onWin(w); triggerWinBurst(); toast.success(`DOMINO OUT! +${w} $Pc · +${gs.roundScore} pts`); }
        else toast.success('DOMINO OUT! (Practice)');
        triggerGameEvent('win');
      } else {
        addReaction('angry', 'human');
        gs.mode === 'real' ? toast.error(`${gs.roundWinner} wins! +${gs.roundScore} pts`) : toast.info(`${gs.roundWinner} wins the round.`);
        triggerGameEvent('lose');
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
  const handlePlayEnd = (end: 'left' | 'right' | 'top' | 'bottom', tileIdOverride?: string) => {
    const tileId = tileIdOverride ?? selectedTileId;
    if (!tileId) return;
    audio.place(); dispatch({ type: 'PLAY_TILE', playerId: 'human', tileId, end });
    setSelectedTileId(null); setDraggingTileId(null); setDropZoneOver(null);
  };
  const handlePlayFirst = (tileIdOverride?: string) => {
    const tileId = tileIdOverride ?? selectedTileId;
    if (!tileId) return;
    audio.place(); dispatch({ type: 'PLAY_TILE', playerId: 'human', tileId, end: 'right' });
    setSelectedTileId(null); setDraggingTileId(null); setDropZoneOver(null);
  };
  const handleDraw = () => { if (!canDraw) return; audio.draw(); dispatch({ type: 'DRAW' }); toast.info('Drew a tile'); };
  const handlePass = () => { if (!canPass) return; audio.knock(); dispatch({ type: 'PASS' }); toast.info('You knocked \u2014 passing'); };

  const confirmBet = () => {
    if (balance < gs.bet) { toast.error('Insufficient balance!'); return; }
    setBetConfirmed(true); toast.success(`${gs.bet} $Pc locked in!`);
  };
  const startWash = (mode: GameMode, fresh: boolean) => {
    if (mode === 'real') { if (!betConfirmed) return; if (fresh && !onBet(gs.bet)) return; if (fresh) playSound('chip'); }
    dispatch({ type: 'INIT_WASH', mode, bet: gs.bet, freshGame: fresh, targetScore: fresh ? selectedTargetScore : gs.targetScore });
    setSelectedTileId(null);
  };

  const handleWashDone = useCallback(() => { dispatch({ type: 'FINISH_WASH' }); }, []);
  const handleClaim = useCallback((tileId: string, playerId: string) => { dispatch({ type: 'CLAIM_TILE', tileId, playerId }); }, []);
  const handleStartPlaying = useCallback(() => { dispatch({ type: 'START_PLAYING' }); }, []);

  const table = tableSkinDef;
  const speedLabels: Record<GameSpeed, string> = { 1: 'Slow', 2: 'Normal', 3: 'Fast', 4: 'Turbo' };
  const isGameWon = gs.phase === 'roundOver' && gs.players.some(p => p.score >= gs.targetScore);

  let statusMsg = '';
  if (gs.phase === 'playing') {
    if (chainEmpty && gs.firstPlayTileId) {
      const starter = gs.players[gs.currentPlayer];
      statusMsg = starter?.id === 'human' ? 'You start! Play your highest double.' : `${starter?.name} starts with the highest double`;
    } else if (isHumanTurn) {
      if (activeTile) statusMsg = chainEmpty ? 'Drag or place your tile to start the chain' : gs.spinnerPlaced ? 'Drop on an end — ← Left, Right →, ▲ Top, or ▼ Bottom' : 'Drop or choose which end ↓';
      else if (canDraw) statusMsg = 'No playable tile — draw from the boneyard';
      else if (canPass) statusMsg = 'No moves — knock on the table to pass';
      else statusMsg = 'Your turn — tap a highlighted tile';
    } else {
      const cur = gs.players[gs.currentPlayer];
      statusMsg = cur ? `${cur.name} is thinking…` : '';
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={emojiReactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ human: 'bottom', you: 'bottom', ai1: 'top', ai2: 'left', ai3: 'right' }}
      />
      <style>{`
        @keyframes crackDraw { to { stroke-dashoffset: 0 } }
        @keyframes flashFade { 0%{opacity:1} 100%{opacity:0} }
        @keyframes shake { 0%,100%{transform:translate(0)} 10%{transform:translate(-8px,-5px)rotate(-1.2deg)} 20%{transform:translate(8px,5px)rotate(1.2deg)} 30%{transform:translate(-5px,3px)rotate(-.7deg)} 40%{transform:translate(5px,-3px)rotate(.7deg)} 50%{transform:translate(-3px,5px)rotate(-.3deg)} 60%{transform:translate(3px,-5px)rotate(.3deg)} 80%{transform:translate(-1px,2px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pop { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse { 0%,100%{opacity:.65} 50%{opacity:1} }
        @keyframes tileIn { from{opacity:0;transform:scale(0.5) rotate(-15deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes knockPulse { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 18px rgba(239,83,80,0.7)} }
        @keyframes bubblePop { 0%{opacity:0;transform:translateX(-50%) scale(0.5) translateY(6px)} 100%{opacity:1;transform:translateX(-50%) scale(1) translateY(0)} }
        @keyframes dropZonePulse { 0%,100%{box-shadow:0 0 12px rgba(212,175,55,0.5),inset 0 0 8px rgba(212,175,55,0.15)} 50%{box-shadow:0 0 28px rgba(212,175,55,0.9),inset 0 0 18px rgba(212,175,55,0.35)} }
        @keyframes celebBounce { 0%,100%{transform:scale(1)} 25%{transform:scale(1.15) translateY(-6px)} 50%{transform:scale(0.95)} 75%{transform:scale(1.08) translateY(-3px)} }
        .dom-board::-webkit-scrollbar { width: 5px; height: 5px; }
        .dom-board::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 3px; }
        .dom-board::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <InGameTopBar gameName="Dominoes" balance={balance} onBack={onBack} onAddBalance={onAddBalance} onShowWallet={onShowWallet} showShare
        rightSlot={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <GameBotBar bots={activeBots} onlineCount={onlinePlayerCount} compact chatMessages={chatMessages} />
            {gs.mode === 'practice' && gs.phase !== 'setup' && <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(30,136,229,.18)', border: '1px solid rgba(30,136,229,.4)', color: '#42A5F5', fontSize: 11, fontWeight: 700 }}>PRACTICE</span>}
            <button onClick={() => setShowSettings(s => !s)} style={{ background: 'none', border: 'none', color: showSettings ? '#D4AF37' : '#666', cursor: 'pointer' }}><Settings size={20} /></button>
          </div>
        }
      />

      {/* Settings panel */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(320px, 100vw)', zIndex: 200, background: 'rgba(6,4,0,.98)', borderLeft: '1px solid rgba(212,175,55,.3)', padding: '18px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#D4AF37', fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>Settings</span>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20 }}>\u00d7</button>
          </div>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Game Speed</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {([1,2,3,4] as GameSpeed[]).map(s => (
                <button key={s} onClick={() => setGameSpeed(s)} style={{ padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11, background: gameSpeed === s ? 'rgba(212,175,55,.18)' : 'rgba(255,255,255,.04)', border: `2px solid ${gameSpeed === s ? '#D4AF37' : 'rgba(255,255,255,.08)'}`, color: gameSpeed === s ? '#D4AF37' : '#666' }}>{speedLabels[s]}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Domino Skin</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(Object.keys(DOMINO_SKINS) as SkinKey[]).map(k => <SkinCard key={k} skinKey={k} active={dominoSkin === k} onClick={() => setDominoSkin(k)} dims={BASE_DIMS.sm} />)}
            </div>
          </div>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Tile Size</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['sm', 'md', 'lg'] as TileSize[]).map(sz => (
                <button key={sz} onClick={() => setTileSize(sz)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: tileSize === sz ? 'rgba(212,175,55,.18)' : 'rgba(255,255,255,.04)', border: `2px solid ${tileSize === sz ? '#D4AF37' : 'rgba(255,255,255,.08)'}`, color: tileSize === sz ? '#D4AF37' : '#666' }}>{{ sm: 'Small', md: 'Medium', lg: 'Large' }[sz]}</button>
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
          <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Rules (Draw \u00b7 All-Fives)</div>
            <div style={{ color: '#555', fontSize: 10, lineHeight: 1.7 }}>
              \u2022 Highest double plays first<br />
              \u2022 <span style={{ color: '#D4AF37' }}>Spinner:</span> first double — opens all 4 sides (L/R/Top/Bottom)<br />
              {'\u2022'} Regular doubles placed perpendicularly (sideways)<br />
              {'\u2022'} <span style={{ color: '#43A047' }}>Score during play:</span> open ends sum {'\u00f7'} 5 = points<br />
              {'\u2022'} Up to 4 open ends counted when spinner is active<br />
              {'\u2022'} Doubles at arm tips count both sides (e.g. [4|4] = 8)<br />
              {'\u2022'} Domino-out: opponents' remaining pips ({'\u00f7'}5)<br />
              {'\u2022'} Blocked: lowest pip total wins ({'\u00f7'}5)<br />
              {'\u2022'} Draw from boneyard when you can't play<br />
              {'\u2022'} Knock (pass) only when boneyard is empty<br />
              {'\u2022'} Loser washes bones for next round<br />
              {'\u2022'} First to {gs.targetScore || selectedTargetScore} pts wins
            </div>
          </div>
        </div>
      )}

      {/* ── Setup ── */}
      {gs.phase === 'setup' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(12,9,0,.97)', border: '1px solid rgba(212,175,55,.4)', borderRadius: 20, padding: 'clamp(16px,4vw,36px)', maxWidth: 440, width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,.85)', animation: 'slideUp .4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}><CasinoIcon name="dominoes" size={46} /></div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 24, fontWeight: 800, color: '#D4AF37', letterSpacing: 3 }}>DOMINOES</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 3 }}>Draw · All-Fives · Double-Six · 4 Players</div>
            </div>
            {gs.roundNumber > 0 && gs.players.length > 0 && (
              <div style={{ marginBottom: 14, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>SCORES · ROUND {gs.roundNumber}</div>
                {[...gs.players].sort((a, b) => b.score - a.score).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: '#888', fontSize: 12 }}>{p.name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 80, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(p.score / TARGET_SCORE, 1) * 100}%`, background: p.color }} />
                      </div>
                      <span style={{ color: p.color, fontWeight: 800, fontSize: 13, minWidth: 36, textAlign: 'right' }}>{p.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: 'rgba(30,136,229,.08)', border: '1px solid rgba(30,136,229,.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <GraduationCap size={15} color="#42A5F5" />
                <span style={{ color: '#42A5F5', fontWeight: 700, fontSize: 13 }}>Practice Mode</span>
                <span style={{ marginLeft: 'auto', color: gs.practiceGamesLeft > 0 ? '#42A5F5' : '#EF5350', fontWeight: 700, fontSize: 13 }}>{gs.practiceGamesLeft}/3 left</span>
              </div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 10 }}>Learn free — no bets. 3 sessions max.</div>
              <button onClick={() => gs.practiceGamesLeft > 0 && startWash('practice', true)} disabled={gs.practiceGamesLeft === 0} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', cursor: gs.practiceGamesLeft > 0 ? 'pointer' : 'not-allowed', background: gs.practiceGamesLeft > 0 ? 'rgba(30,136,229,.22)' : 'rgba(60,60,60,.3)', color: gs.practiceGamesLeft > 0 ? '#42A5F5' : '#444', fontWeight: 700, fontSize: 13 }}>
                {gs.practiceGamesLeft > 0 ? 'Start Free Practice' : 'Practice Limit Reached'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.15)' }}>
              <div><div style={{ fontSize: 9, color: '#555', letterSpacing: '0.15em', fontWeight: 700 }}>YOUR BALANCE</div><div style={{ fontSize: 18 }}><PcTokenLabel amount={formatChipLabel(balance)} size={18} /></div></div>
              {onAddBalance && <button onClick={() => onAddBalance(10_000)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)', color: '#66BB6A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><PlusCircle size={13} /> Get <PcTokenLabel size={11} /></button>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, marginBottom: 8, letterSpacing: '0.1em' }}>WIN GOAL</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[100, 150, 200].map(pts => (
                  <button key={pts} onClick={() => setSelectedTargetScore(pts)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: selectedTargetScore === pts ? 'rgba(212,175,55,.18)' : 'rgba(255,255,255,.04)', border: `2px solid ${selectedTargetScore === pts ? '#D4AF37' : 'rgba(255,255,255,.08)'}`, color: selectedTargetScore === pts ? '#D4AF37' : '#666' }}>{pts} pts</button>
                ))}
              </div>
            </div>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 12, marginBottom: 8, letterSpacing: '0.1em' }}>SELECT BET</div>
            <div style={{ marginBottom: 12 }}><ChipSelector selectedChip={gs.bet} onSelect={(amt) => { dispatch({ type: 'SET_BET', bet: amt }); setBetConfirmed(false); }} balance={balance} compact /></div>
            <div style={{ color: '#444', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>Win 3× your bet on domino-out!</div>
            {!betConfirmed
              ? <button onClick={confirmBet} disabled={balance < gs.bet} style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', cursor: balance >= gs.bet ? 'pointer' : 'not-allowed', background: balance >= gs.bet ? 'linear-gradient(135deg,#D4AF37,#9A7A20)' : '#2a2a2a', color: balance >= gs.bet ? '#000' : '#555', fontWeight: 700, fontSize: 15 }}>Lock Bet (<PcTokenLabel amount={formatChipLabel(gs.bet)} size={15} />)</button>
              : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startWash('real', true)} style={{ flex: 1, height: 46, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#43A047,#1B5E20)', color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Zap size={16} /> New Game</button>
                  {gs.roundNumber > 0 && <button onClick={() => startWash('real', false)} style={{ flex: 1, height: 46, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Zap size={16} /> Next Round</button>}
                </div>
              )
            }
            {betConfirmed && <div style={{ marginTop: 8, textAlign: 'center', color: '#43A047', fontSize: 12, fontWeight: 600 }}>Bet locked \u2014 choose above</div>}
          </div>
        </div>
      )}

      {/* ── Washing ── */}
      {gs.phase === 'washing' && (
        <WashingScreen onDone={handleWashDone} skinKey={dominoSkin} washerName={gs.roundLoser ?? ''} isNewGame={gs.freshGame} />
      )}

      {/* ── Picking (full table visible) ── */}
      {gs.phase === 'picking' && (
        <PickingScreen
          players={gs.players} pickingPool={gs.pickingPool} pickingClaims={gs.pickingClaims}
          tableSkinDef={tableSkinDef} skinKey={dominoSkin}
          onClaim={handleClaim} onStart={handleStartPlaying} gameSpeed={gameSpeed}
        />
      )}

      {/* ── Round over ── */}
      {gs.phase === 'roundOver' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(12,9,0,.98)', border: '1px solid rgba(212,175,55,.5)', borderRadius: 20, padding: 'clamp(16px,4vw,36px)', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,.9)', animation: 'slideUp .5s ease' }}>
            <div style={{ marginBottom: 8 }}><CasinoIcon name={isGameWon || gs.roundWinner === 'You' ? 'trophy' : 'sad'} size={48} /></div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 800, color: gs.roundWinner === 'You' ? '#D4AF37' : '#EF5350', marginBottom: 4 }}>
              {isGameWon ? `GAME OVER — ${gs.players.find(p => p.score >= gs.targetScore)?.name ?? gs.roundWinner} WINS!` : gs.roundWinner === 'You' ? 'DOMINO OUT!' : `${gs.roundWinner} Wins the Round`}
            </div>
            {gs.roundScore > 0 && <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>+{gs.roundScore} pts to {gs.roundWinner}</div>}
            {gs.roundLoser && !isGameWon && <div style={{ color: '#EF5350', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{gs.roundLoser === 'You' ? 'You lost' : gs.roundLoser + ' lost'} — must wash next round!</div>}
            {gs.roundWinner === 'You' && gs.mode === 'real' && <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}><span style={{ color: '#43A047' }}>+</span><PcTokenLabel amount={gs.bet * 3} size={20} /></div>}
            {gs.mode === 'practice' && <div style={{ color: '#42A5F5', fontSize: 12, marginBottom: 6 }}>Practice round — no payout</div>}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px', margin: '12px 0', textAlign: 'left' }}>
              <div style={{ color: '#D4AF37', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>STANDINGS · FIRST TO {TARGET_SCORE}</div>
              {[...gs.players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11 }}>{['1st','2nd','3rd','4th'][i]}</span>
                    <span style={{ fontSize: 13, color: i === 0 ? '#D4AF37' : '#888' }}>{p.name}</span>
                    {p.name === gs.roundLoser && !isGameWon && <span style={{ fontSize: 9, color: '#EF5350', fontWeight: 700 }}>WASHES</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 70, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(p.score / TARGET_SCORE, 1) * 100}%`, background: p.color }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, color: i === 0 ? '#D4AF37' : '#666', minWidth: 40, textAlign: 'right' }}>{p.score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {isGameWon
                ? <button onClick={() => { dispatch({ type: 'RESET' }); setBetConfirmed(false); }} style={{ flex: 1, height: 46, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, fontSize: 14 }}>New Game</button>
                : <button onClick={() => dispatch({ type: 'NEXT_ROUND' })} style={{ flex: 1, height: 46, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RotateCcw size={14} /> Next Round →</button>
              }
              <button onClick={onBack} style={{ flex: 1, height: 46, borderRadius: 10, cursor: 'pointer', background: 'none', border: '1px solid rgba(212,175,55,.35)', color: '#D4AF37', fontWeight: 600, fontSize: 14 }}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Playing ── */}
      {gs.phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: shaking ? 'shake .8s ease' : 'none', minHeight: 0 }}>
          <ScoreBoard players={gs.players} currentPlayer={gs.currentPlayer} lastScorer={gs.lastScorer} lastScoreAmount={gs.lastScoreAmount} roundNumber={gs.roundNumber} targetScore={gs.targetScore} />
          <div style={{ flex: 1, display: 'grid', gridTemplateRows: 'auto 1fr auto', gridTemplateColumns: 'minmax(100px, auto) 1fr minmax(100px, auto)', gap: 6, padding: '6px 10px 0', minHeight: 0 }}>

            {/* TOP */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
              {aiPlayers[0] && (
                <div style={{ background: gs.currentPlayer === 1 ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${gs.currentPlayer === 1 ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s', animation: gs.lastPassedBy === aiPlayers[0].name ? 'knockPulse .6s ease' : 'none', position: 'relative' }}>
                  <PlayerSeat player={aiPlayers[0]} active={gs.currentPlayer === 1} tileCount={aiPlayers[0].hand.length} orientation="top" skinKey={dominoSkin} dims={dims} justPassed={gs.lastPassedBy === aiPlayers[0].name} />
                  {reactions.filter(r => r.player === aiPlayers[0].id).slice(-1).map(r => (
                    <DomReactionBubble key={r.id} reaction={r} playerColor={aiPlayers[0].color} />
                  ))}
                </div>
              )}
            </div>

            {/* LEFT */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {aiPlayers[1] && (
                <div style={{ background: gs.currentPlayer === 2 ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${gs.currentPlayer === 2 ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s', position: 'relative', animation: gs.lastPassedBy === aiPlayers[1].name ? 'knockPulse .6s ease' : 'none' }}>
                  <PlayerSeat player={aiPlayers[1]} active={gs.currentPlayer === 2} tileCount={aiPlayers[1].hand.length} orientation="left" skinKey={dominoSkin} dims={dims} justPassed={gs.lastPassedBy === aiPlayers[1].name} />
                  {reactions.filter(r => r.player === aiPlayers[1].id).slice(-1).map(r => (
                    <DomReactionBubble key={r.id} reaction={r} playerColor={aiPlayers[1].color} />
                  ))}
                </div>
              )}
            </div>

            {/* CENTER TABLE */}
            <div style={{ position: 'relative', minHeight: 0, minWidth: 0 }}>
              <div className="wood-rail" style={{ width: '100%', height: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', background: table.felt, boxShadow: `inset 0 2px 24px rgba(0,0,0,.55), inset 0 0 60px rgba(0,0,0,0.4), 0 0 0 5px rgba(0,0,0,.3)` }}>
                <PremiumFeltOverlay borderRadius="16px" goldBorderInset={6} showSpotlight={true} />
                <div style={{ position: 'absolute', inset: 0, opacity: .05, pointerEvents: 'none', backgroundImage: `repeating-linear-gradient(0deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 38px),repeating-linear-gradient(90deg,${table.line} 0,${table.line} 1px,transparent 1px,transparent 38px)` }} />
                <TableBrand style={{ opacity: 0.08 }} />
                <CrackOverlay active={cracking} />
                {lastPlayBanner && <LastPlayBanner playerName={lastPlayBanner.playerName} left={lastPlayBanner.left} right={lastPlayBanner.right} skinKey={dominoSkin} />}
                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 6, display: 'flex', gap: 5, alignItems: 'center' }}>
                  <div style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.2)', color: '#ddd', fontSize: 11, fontWeight: 600 }}>{gs.boneyard.length} bones</div>
                  <button onClick={() => setBoardZoom(z => Math.min(z + 0.15, 2.2))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(212,175,55,.3)', background: 'rgba(0,0,0,.6)', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ZoomIn size={13} /></button>
                  <button onClick={() => setBoardZoom(z => Math.max(z - 0.15, 0.4))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(212,175,55,.3)', background: 'rgba(0,0,0,.6)', color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ZoomOut size={13} /></button>
                </div>
                {chainEmpty && activeTile && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropZoneOver('first'); }}
                    onDragLeave={() => setDropZoneOver(null)}
                    onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayFirst(id || undefined); setDropZoneOver(null); }}
                    onClick={() => handlePlayFirst()}
                    style={{
                      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                      width: 120, height: 60, borderRadius: 12, zIndex: 10, cursor: 'pointer',
                      border: `2px dashed ${dropZoneOver === 'first' ? '#D4AF37' : 'rgba(212,175,55,0.6)'}`,
                      background: dropZoneOver === 'first' ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#D4AF37', fontWeight: 700, fontSize: 12,
                      animation: 'dropZonePulse 1.4s infinite',
                      transition: 'all .15s',
                    }}>
                    Drop here
                  </div>
                )}
                {!chainEmpty && (
                  <>
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 6, padding: '3px 9px', borderRadius: 12, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 800, fontSize: 14 }}>{gs.leftVal}</div>
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 6, padding: '3px 9px', borderRadius: 12, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 800, fontSize: 14 }}>{gs.rightVal}</div>
                    {/* Ends counter — always at bottom-left so it is never blocked by other UI */}
                    {(() => {
                      const scoring = isScoringTotal(gs.openEndTotal);
                      return (
                        <div style={{
                          position: 'absolute', left: 10, bottom: 8, zIndex: 8,
                          padding: '3px 12px', borderRadius: 12, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
                          background: scoring ? 'rgba(67,160,71,0.92)' : 'rgba(0,0,0,.8)',
                          border: scoring ? '1px solid #66BB6A' : '1px solid rgba(255,255,255,.18)',
                          color: scoring ? '#fff' : '#ddd',
                          transition: 'all .2s',
                          boxShadow: scoring ? '0 0 12px rgba(67,160,71,0.5)' : 'none',
                        }}>
                          {scoring ? `${gs.openEndTotal} pts!` : `Ends: ${gs.openEndTotal}`}
                        </div>
                      );
                    })()}
                  </>
                )}
                <div ref={boardRef} className="dom-board" style={{ position: 'absolute', inset: 0, overflow: 'auto', cursor: 'grab' }}>
                  <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
                    {chainEmpty ? (
                      <div style={{ position: 'absolute', left: CANVAS_CX, top: CANVAS_CY, transform: 'translate(-50%,-50%)', color: 'rgba(255,255,255,.18)', fontSize: 13, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                        {gs.firstPlayTileId ? 'Waiting for first double…' : 'Play a tile to start the chain'}
                      </div>
                    ) : (
                      <>
                        {/* Main horizontal chain */}
                        {gs.chain.map((pt, i) => {
                          const pos = chainPositions[i];
                          if (!pos) return null;
                          const isNewest = i === gs.chain.length - 1 || i === 0;
                          const isSpinner = gs.spinnerPlaced && i === chainCenterIdx;
                          return (
                            <div key={pt.tile.id} style={{ position: 'absolute', left: pos.x, top: pos.y, animation: isNewest ? 'tileIn .28s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
                              <DominoTileView dispLeft={pt.dispLeft} dispRight={pt.dispRight} isDouble={pt.isDouble} skinKey={dominoSkin} dims={dims} />
                              {isSpinner && (
                                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 8, fontWeight: 800, color: '#D4AF37', background: 'rgba(0,0,0,0.8)', padding: '1px 5px', borderRadius: 6, whiteSpace: 'nowrap', border: '1px solid rgba(212,175,55,0.5)' }}>SPINNER</div>
                              )}
                            </div>
                          );
                        })}
                        {/* Top chain — extends upward from spinner, tiles rotated 90° CW */}
                        {gs.spinnerPlaced && gs.topChain.length > 0 && (() => {
                          const spinnerPos = chainPositions[chainCenterIdx];
                          if (!spinnerPos) return null;
                          const spinnerCX = spinnerPos.x + spinnerPos.w / 2;
                          const elements: React.ReactNode[] = [];
                          let curY = spinnerPos.y - TILE_GAP;
                          for (let i = 0; i < gs.topChain.length; i++) {
                            const pt = gs.topChain[i];
                            const visW = pt.isDouble ? dims.long  : dims.short;
                            const visH = pt.isDouble ? dims.short : dims.long;
                            curY -= visH;
                            elements.push(
                              <div key={`top-${pt.tile.id}`} style={{
                                position: 'absolute',
                                left: spinnerCX - visW / 2,
                                top: curY,
                                width: visW, height: visH,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: i === gs.topChain.length - 1 ? 'tileIn .28s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                              }}>
                                <div style={{ transform: 'rotate(90deg)', transformOrigin: 'center center', flexShrink: 0 }}>
                                  <DominoTileView dispLeft={pt.dispLeft} dispRight={pt.dispRight} isDouble={pt.isDouble} skinKey={dominoSkin} dims={dims} />
                                </div>
                              </div>
                            );
                            curY -= TILE_GAP;
                          }
                          return elements;
                        })()}
                        {/* Bottom chain — extends downward from spinner, tiles rotated -90° CW */}
                        {gs.spinnerPlaced && gs.bottomChain.length > 0 && (() => {
                          const spinnerPos = chainPositions[chainCenterIdx];
                          if (!spinnerPos) return null;
                          const spinnerCX = spinnerPos.x + spinnerPos.w / 2;
                          const elements: React.ReactNode[] = [];
                          let curY = spinnerPos.y + spinnerPos.h + TILE_GAP;
                          for (let i = 0; i < gs.bottomChain.length; i++) {
                            const pt = gs.bottomChain[i];
                            const visW = pt.isDouble ? dims.long  : dims.short;
                            const visH = pt.isDouble ? dims.short : dims.long;
                            elements.push(
                              <div key={`bottom-${pt.tile.id}`} style={{
                                position: 'absolute',
                                left: spinnerCX - visW / 2,
                                top: curY,
                                width: visW, height: visH,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: i === gs.bottomChain.length - 1 ? 'tileIn .28s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                              }}>
                                <div style={{ transform: 'rotate(-90deg)', transformOrigin: 'center center', flexShrink: 0 }}>
                                  <DominoTileView dispLeft={pt.dispLeft} dispRight={pt.dispRight} isDouble={pt.isDouble} skinKey={dominoSkin} dims={dims} />
                                </div>
                              </div>
                            );
                            curY += visH + TILE_GAP;
                          }
                          return elements;
                        })()}
                        {/* Ghost domino-shaped placement outlines at exact board positions */}
                        {activeTile && (['left', 'right', 'top', 'bottom'] as const).map(end => {
                          const canPlayDir = end === 'left' ? canPlayLeft : end === 'right' ? canPlayRight : end === 'top' ? canPlayTop : canPlayBottom;
                          const pos = ghostPositions[end];
                          if (!canPlayDir || !pos) return null;
                          const isVertical = end === 'top' || end === 'bottom';
                          return (
                            <div
                              key={`ghost-${end}`}
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropZoneOver(end); }}
                              onDragLeave={() => setDropZoneOver(null)}
                              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayEnd(end, id || undefined); setDropZoneOver(null); }}
                              onClick={() => handlePlayEnd(end)}
                              style={{
                                position: 'absolute',
                                left: pos.x,
                                top: pos.y,
                                width: pos.w,
                                height: pos.h,
                                borderRadius: 6,
                                zIndex: 15,
                                cursor: 'pointer',
                                border: `2px dashed ${dropZoneOver === end ? '#D4AF37' : 'rgba(212,175,55,0.7)'}`,
                                background: dropZoneOver === end ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: isVertical ? 'column' : 'row',
                                color: '#D4AF37', fontWeight: 800, fontSize: 11,
                                animation: 'dropZonePulse 1.4s infinite',
                                transition: 'all .15s',
                              }}>
                              {end === 'left' ? '←' : end === 'right' ? '→' : end === 'top' ? '▲' : '▼'}
                            </div>
                          );
                        })}
                        {/* Open-end indicators for top/bottom arms — only shown when both sides are played */}
                        {gs.spinnerPlaced && (() => {
                          const spinnerPos = chainPositions[chainCenterIdx];
                          if (!spinnerPos) return null;
                          const spinnerCX = spinnerPos.x + spinnerPos.w / 2;
                          const topOpen    = gs.topChain.length === 0;
                          const bottomOpen = gs.bottomChain.length === 0;
                          return (
                            <>
                              {/* If arms not yet open, show lock indicator */}
                              {!topBottomOpen && (
                                <div style={{ position: 'absolute', left: spinnerCX - 60, top: spinnerPos.y - 32, fontSize: 9, color: 'rgba(255,100,100,0.85)', fontWeight: 700, textAlign: 'center', width: 120, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 4px', border: '1px solid rgba(255,100,100,0.4)' }}>
                                  Play both sides first
                                </div>
                              )}
                              {topBottomOpen && topOpen && (
                                <div style={{ position: 'absolute', left: spinnerCX - 14, top: spinnerPos.y - 28, fontSize: 9, color: 'rgba(212,175,55,0.9)', fontWeight: 700, textAlign: 'center', width: 28 }}>▲{gs.topVal}</div>
                              )}
                              {topBottomOpen && bottomOpen && (
                                <div style={{ position: 'absolute', left: spinnerCX - 14, top: spinnerPos.y + spinnerPos.h + 10, fontSize: 9, color: 'rgba(212,175,55,0.9)', fontWeight: 700, textAlign: 'center', width: 28 }}>▼{gs.bottomVal}</div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {aiPlayers[2] && (
                <div style={{ background: gs.currentPlayer === 3 ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${gs.currentPlayer === 3 ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s', position: 'relative', animation: gs.lastPassedBy === aiPlayers[2].name ? 'knockPulse .6s ease' : 'none' }}>
                  <PlayerSeat player={aiPlayers[2]} active={gs.currentPlayer === 3} tileCount={aiPlayers[2].hand.length} orientation="right" skinKey={dominoSkin} dims={dims} justPassed={gs.lastPassedBy === aiPlayers[2].name} />
                  {reactions.filter(r => r.player === aiPlayers[2].id).slice(-1).map(r => (
                    <DomReactionBubble key={r.id} reaction={r} playerColor={aiPlayers[2].color} />
                  ))}
                </div>
              )}
            </div>

            {/* BOTTOM (human) */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
              {humanPlayer && (
                <div style={{ background: isHumanTurn ? 'rgba(212,175,55,.10)' : 'rgba(0,0,0,.4)', border: `1px solid ${isHumanTurn ? 'rgba(212,175,55,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, transition: 'all .25s', position: 'relative', animation: propCelebrating ? 'celebBounce .6s ease' : 'none' }}>
                  <PlayerSeat player={humanPlayer} active={isHumanTurn} tileCount={humanPlayer.hand.length} isHuman orientation="bottom" skinKey={dominoSkin} dims={dims} />
                  {reactions.filter(r => r.player === 'human').slice(-1).map(r => (
                    <DomReactionBubble key={r.id} reaction={r} playerColor={humanPlayer.color} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '3px 16px', flexShrink: 0, minHeight: 24 }}>
            <span style={{ color: isHumanTurn ? '#D4AF37' : '#bbb', fontSize: 12, fontWeight: 500 }}>{statusMsg}</span>
            {isHumanTurn && !gs.humanReplaced && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 8,
                background: playSecondsLeft <= 8 ? 'rgba(183,28,28,0.7)' : 'rgba(0,0,0,0.5)',
                color: playSecondsLeft <= 8 ? '#fff' : '#666',
                border: `1px solid ${playSecondsLeft <= 8 ? '#EF5350' : 'rgba(255,255,255,0.08)'}`,
                animation: playSecondsLeft <= 8 ? 'pulse .6s infinite' : 'none',
                transition: 'all .3s',
              }}>{playSecondsLeft}s</span>
            )}
            {gs.humanReplaced && <span style={{ fontSize: 11, color: '#EF5350', fontWeight: 700 }}>You were replaced by CPU</span>}
          </div>

          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', padding: '2px 16px 4px', flexShrink: 0, flexWrap: 'wrap' }}>
            {isHumanTurn && activeTile && chainEmpty && (
              <>
                <Button
                  onClick={() => handlePlayFirst()}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayFirst(id || undefined); }}
                  style={{ background: 'linear-gradient(135deg,#D4AF37,#9A7A20)', color: '#000', fontWeight: 700, border: 'none' }}>Place First Tile</Button>
                <Button onClick={() => { setSelectedTileId(null); setDraggingTileId(null); }} variant="ghost" style={{ color: '#555' }}>Cancel</Button>
              </>
            )}
            {isHumanTurn && activeTile && !chainEmpty && (
              <>
                {canPlayLeft   && <Button onClick={() => handlePlayEnd('left')}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayEnd('left', id || undefined); }}
                  style={{ background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 700 }}>← Left ({gs.leftVal})</Button>}
                {canPlayRight  && <Button onClick={() => handlePlayEnd('right')}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayEnd('right', id || undefined); }}
                  style={{ background: 'rgba(212,175,55,.15)', border: '1px solid rgba(212,175,55,.45)', color: '#D4AF37', fontWeight: 700 }}>Right ({gs.rightVal}) →</Button>}
                {canPlayTop    && <Button onClick={() => handlePlayEnd('top')}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayEnd('top', id || undefined); }}
                  style={{ background: 'rgba(212,175,55,.12)', border: '1px solid rgba(212,175,55,.35)', color: '#D4AF37', fontWeight: 700 }}>▲ Top ({gs.topVal})</Button>}
                {canPlayBottom && <Button onClick={() => handlePlayEnd('bottom')}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('tileId'); handlePlayEnd('bottom', id || undefined); }}
                  style={{ background: 'rgba(212,175,55,.12)', border: '1px solid rgba(212,175,55,.35)', color: '#D4AF37', fontWeight: 700 }}>▼ Bottom ({gs.bottomVal})</Button>}
                <Button onClick={() => { setSelectedTileId(null); setDraggingTileId(null); }} variant="ghost" style={{ color: '#555' }}>Cancel</Button>
              </>
            )}
            {isHumanTurn && !activeTile && (
              <>{canDraw && <Button onClick={handleDraw} style={{ background: 'rgba(30,136,229,.18)', border: '1px solid rgba(30,136,229,.45)', color: '#42A5F5', fontWeight: 700 }}>Draw from Boneyard</Button>}
              {canPass && <Button onClick={handlePass} style={{ background: 'rgba(183,28,28,.18)', border: '1px solid rgba(183,28,28,.45)', color: '#EF5350', fontWeight: 700 }}>Knock (Pass)</Button>}</>
            )}
          </div>

          {/* Reaction panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 14px', flexShrink: 0, justifyContent: 'flex-end' }}>
            {showReactionPanel && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 14, padding: '5px 10px', animation: 'pop .2s ease' }}>
                {DOM_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { addReaction(emoji, 'human'); setShowReactionPanel(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 8, transition: 'transform .1s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <CasinoIcon name={emoji} size={24} />
                  </button>
                ))}
                {DOM_QUICK_TEXTS.map(text => (
                  <button key={text} onClick={() => { addReaction(text, 'human'); setShowReactionPanel(false); }} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, cursor: 'pointer', fontSize: 10, color: '#D4AF37', fontWeight: 600, padding: '3px 8px', whiteSpace: 'nowrap' }}>
                    {text}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowReactionPanel(p => !p)} style={{ background: showReactionPanel ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showReactionPanel ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, cursor: 'pointer', fontSize: 15, padding: '3px 10px', color: '#D4AF37', fontWeight: 700, transition: 'all .15s' }}>
              <CasinoIcon name="chat" size={15} />
            </button>
          </div>

          {/* Human hand — all tiles shown vertically (portrait) */}
          <div style={{ padding: '5px 14px 10px', background: 'rgba(0,0,0,.55)', borderTop: '1px solid rgba(212,175,55,.15)', flexShrink: 0 }}>
            <div style={{ color: '#D4AF37', fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Your Hand — {humanPlayer?.hand.length ?? 0} tile{(humanPlayer?.hand.length ?? 0) !== 1 ? 's' : ''}
              {!isHumanTurn && <span style={{ color: '#888', fontWeight: 400, marginLeft: 8, fontSize: 9 }}>Waiting…</span>}</span>
              <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end' }}>
              {humanPlayer?.hand.map(tile => {
                const isPlayable = isHumanTurn && playableIds.has(tile.id);
                const isSelected = selectedTileId === tile.id;
                const isDragging = draggingTileId === tile.id;
                return (
                <div key={tile.id} style={{ animation: 'pop .25s ease' }}>
                  <DominoTileView dispLeft={tile.left} dispRight={tile.right} isDouble={tile.left === tile.right}
                    forceVertical
                    selected={isSelected}
                    playable={isPlayable && !isSelected}
                    isDragging={isDragging}
                    skinKey={dominoSkin} dims={dims}
                    onClick={() => handleTileClick(tile.id)}
                    draggable={isPlayable}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('tileId', tile.id);
                      setDraggingTileId(tile.id);
                      setSelectedTileId(tile.id);
                    }}
                    onDragEnd={() => { setDraggingTileId(null); setSelectedTileId(null); setDropZoneOver(null); }}
                  />
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
