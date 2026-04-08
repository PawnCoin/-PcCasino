import { useEffect, useRef, useState, useCallback } from 'react';
import { InGameTopBar } from '@/components/InGameTopBar';
import { InGameOptionsPanel } from '@/components/InGameOptionsPanel';
import { toast } from 'sonner';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { LobbyChat } from '@/components/LobbyChat';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { useTableSkin } from '@/hooks/useTableSkin';
import { usePoolBallSkin, getDefaultPoolBallPreset } from '@/hooks/usePoolBallSkin';
import { useGameVoice } from '@/hooks/useGameVoice';
import { useSoundEffects } from '@/hooks/useSoundEffects';

// ─── Types ───────────────────────────────────────────────────────────────────
type GameMode = 'select' | '8ball' | '9ball' | 'snooker' | 'shotbet' | 'rake' | 'tournament';
type TurnPlayer = 'player' | 'ai';
type Group = 'solid' | 'striped' | null;
type Phase = 'lobby' | 'betting' | 'playing' | 'ai_turn' | 'won' | 'lost' | 'result';
type RakeState = { playerLetters: number; aiLetters: number; callerIsPlayer: boolean; challengeActive: boolean; challengeShot: { ballId: number; pocketIdx: number } | null; playerCallPos: { x: number; y: number } | null };
type ShotBetState = { playerBalance: number; aiBalance: number; calledBall: number | null; calledPocket: number | null; perShot: number; isCallPhase: boolean };

interface Ball {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  striped: boolean;
  pocketed: boolean;
  isCue: boolean;
  isEight: boolean;
  snookerType?: 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black';
  points?: number;
  respotX?: number; respotY?: number;
}
interface Pocket { x: number; y: number; radius: number; }
interface TournamentSlot { name: string; isAI: boolean; }
interface TournamentBracket { slots: TournamentSlot[]; results: (string | null)[]; round: number; }

interface PoolGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TABLE_W = 720;
const TABLE_H = 360;
const SNOOKER_W = 780;
const SNOOKER_H = 420;
const BALL_R = 10;
const SNOOKER_R = 9;
const FRICTION = 0.984;
const MIN_SPEED = 0.07;
const POCKET_R = 18;
const RAIL = 28;

const DEFAULT_BALL_COLORS: string[] = ['#F5C518','#0044CC','#CC0000','#6600CC','#CC4400','#006600','#8B0000'];

const SNOOKER_COLORS: Record<string, string> = {
  red:'#CC0000', yellow:'#FFE000', green:'#00AA00',
  brown:'#8B4513', blue:'#0055CC', pink:'#FF69B4', black:'#111111',
};

function makePockets(w: number, h: number): Pocket[] {
  return [
    { x: RAIL - 2, y: RAIL - 2, radius: POCKET_R },
    { x: w / 2, y: RAIL - 4, radius: POCKET_R - 2 },
    { x: w - RAIL + 2, y: RAIL - 2, radius: POCKET_R },
    { x: RAIL - 2, y: h - RAIL + 2, radius: POCKET_R },
    { x: w / 2, y: h - RAIL + 4, radius: POCKET_R - 2 },
    { x: w - RAIL + 2, y: h - RAIL + 2, radius: POCKET_R },
  ];
}

const POCKETS = makePockets(TABLE_W, TABLE_H);
const SNOOKER_POCKETS = makePockets(SNOOKER_W, SNOOKER_H);

// ─── Ball factories ───────────────────────────────────────────────────────────
function make8BallRack(ballColors: string[] = DEFAULT_BALL_COLORS): Ball[] {
  const balls: Ball[] = [];
  balls.push({ id: 0, x: TABLE_W * 0.25, y: TABLE_H / 2, vx: 0, vy: 0, radius: BALL_R, color: '#FFFFFF', striped: false, pocketed: false, isCue: true, isEight: false });
  const rackX = TABLE_W * 0.67;
  const rackY = TABLE_H / 2;
  const order = [1, 2, 9, 3, 8, 4, 5, 10, 7, 11, 6, 12, 15, 13, 14];
  const rows = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9], [10, 11, 12, 13, 14]];
  rows.forEach((row, ri) => {
    row.forEach((idx, ci) => {
      const id = order[idx];
      const x = rackX + ri * (BALL_R * 2 * 0.866);
      const y = rackY + (ci - (row.length - 1) / 2) * (BALL_R * 2 + 0.5);
      const isEight = id === 8;
      const striped = id > 8;
      const color = isEight ? '#1a1a1a' : (ballColors[(id - 1) % 7] || '#888');
      balls.push({ id, x, y, vx: 0, vy: 0, radius: BALL_R, color, striped, pocketed: false, isCue: false, isEight });
    });
  });
  return balls;
}

function make9BallRack(): Ball[] {
  const balls: Ball[] = [];
  balls.push({ id: 0, x: TABLE_W * 0.25, y: TABLE_H / 2, vx: 0, vy: 0, radius: BALL_R, color: '#FFFFFF', striped: false, pocketed: false, isCue: true, isEight: false });
  const rackX = TABLE_W * 0.67;
  const rackY = TABLE_H / 2;
  const diamond = [[1], [2, 3], [4, 9, 5], [6, 7], [8]];
  diamond.forEach((row, ri) => {
    row.forEach((id, ci) => {
      const x = rackX + (ri - 2) * (BALL_R * 2 * 0.866);
      const y = rackY + (ci - (row.length - 1) / 2) * (BALL_R * 2 + 0.5);
      const isEight = false;
      const color = DEFAULT_BALL_COLORS[(id - 1) % 7] || '#888';
      balls.push({ id, x, y, vx: 0, vy: 0, radius: BALL_R, color, striped: false, pocketed: false, isCue: false, isEight });
    });
  });
  return balls;
}

function makeSnookerRack(): Ball[] {
  const balls: Ball[] = [];
  balls.push({ id: 0, x: SNOOKER_W * 0.22, y: SNOOKER_H / 2, vx: 0, vy: 0, radius: SNOOKER_R, color: '#FFFFFF', striped: false, pocketed: false, isCue: true, isEight: false, snookerType: undefined });

  // 15 reds in triangle
  const rackX = SNOOKER_W * 0.67;
  const rackY = SNOOKER_H / 2;
  let id = 1;
  for (let ri = 0; ri < 5; ri++) {
    for (let ci = 0; ci <= ri; ci++) {
      const x = rackX + ri * (SNOOKER_R * 2 * 0.866);
      const y = rackY + (ci - ri / 2) * (SNOOKER_R * 2 + 0.5);
      balls.push({ id: id++, x, y, vx: 0, vy: 0, radius: SNOOKER_R, color: SNOOKER_COLORS.red, striped: false, pocketed: false, isCue: false, isEight: false, snookerType: 'red', points: 1 });
    }
  }

  // Colored balls on spots
  const coloredDefs: { t: Ball['snookerType']; pts: number; rx: number; ry: number }[] = [
    { t: 'yellow', pts: 2, rx: 0.30, ry: 0.60 },
    { t: 'green',  pts: 3, rx: 0.30, ry: 0.40 },
    { t: 'brown',  pts: 4, rx: 0.30, ry: 0.50 },
    { t: 'blue',   pts: 5, rx: 0.50, ry: 0.50 },
    { t: 'pink',   pts: 6, rx: 0.62, ry: 0.50 },
    { t: 'black',  pts: 7, rx: 0.78, ry: 0.50 },
  ];
  coloredDefs.forEach((d, i) => {
    balls.push({
      id: id++, x: SNOOKER_W * d.rx, y: SNOOKER_H * d.ry,
      vx: 0, vy: 0, radius: SNOOKER_R, color: SNOOKER_COLORS[d.t!]!,
      striped: false, pocketed: false, isCue: false, isEight: false,
      snookerType: d.t, points: d.pts,
      respotX: SNOOKER_W * d.rx, respotY: SNOOKER_H * d.ry,
    });
  });
  return balls;
}

// ─── Physics Engine ────────────────────────────────────────────────────────────
function simulateStep(balls: Ball[], tableW: number, tableH: number, pockets: Pocket[]): { anyMoving: boolean; pocketed: Ball[] } {
  const pocketedThisStep: Ball[] = [];

  balls.forEach(ball => {
    if (ball.pocketed) return;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed < MIN_SPEED) { ball.vx = 0; ball.vy = 0; }
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounces
    if (ball.x - ball.radius < RAIL) { ball.x = RAIL + ball.radius; ball.vx = Math.abs(ball.vx) * 0.78; }
    if (ball.x + ball.radius > tableW - RAIL) { ball.x = tableW - RAIL - ball.radius; ball.vx = -Math.abs(ball.vx) * 0.78; }
    if (ball.y - ball.radius < RAIL) { ball.y = RAIL + ball.radius; ball.vy = Math.abs(ball.vy) * 0.78; }
    if (ball.y + ball.radius > tableH - RAIL) { ball.y = tableH - RAIL - ball.radius; ball.vy = -Math.abs(ball.vy) * 0.78; }

    // Pocket check
    for (const p of pockets) {
      if (Math.hypot(ball.x - p.x, ball.y - p.y) < p.radius) {
        ball.pocketed = true;
        ball.vx = 0; ball.vy = 0;
        pocketedThisStep.push(ball);
        break;
      }
    }
  });

  // Ball-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i]; const b = balls[j];
      if (a.pocketed || b.pocketed) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minD = a.radius + b.radius;
      if (dist < minD && dist > 0) {
        const nx = dx / dist; const ny = dy / dist;
        const overlap = minD - dist;
        a.x -= nx * overlap * 0.51; a.y -= ny * overlap * 0.51;
        b.x += nx * overlap * 0.51; b.y += ny * overlap * 0.51;
        const dvx = a.vx - b.vx; const dvy = a.vy - b.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot > 0) {
          a.vx -= dot * nx; a.vy -= dot * ny;
          b.vx += dot * nx; b.vy += dot * ny;
        }
      }
    }
  }

  const anyMoving = balls.some(b => !b.pocketed && (Math.abs(b.vx) > MIN_SPEED || Math.abs(b.vy) > MIN_SPEED));
  return { anyMoving, pocketed: pocketedThisStep };
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
function drawPool(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  pockets: Pocket[],
  tableW: number,
  tableH: number,
  aimStart: { x: number; y: number } | null,
  aimEnd: { x: number; y: number } | null,
  highlightPocket: number | null,
  highlightBall: number | null,
  feltColor?: string,
) {
  ctx.save();

  // Dark ambient background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, tableW, tableH);

  // Outer wood frame
  const frameGrad = ctx.createLinearGradient(0, 0, 0, tableH);
  frameGrad.addColorStop(0, '#5D3A1A');
  frameGrad.addColorStop(0.5, '#3E2000');
  frameGrad.addColorStop(1, '#5D3A1A');
  ctx.fillStyle = frameGrad;
  ctx.fillRect(0, 0, tableW, tableH);

  // Leather cushion rails
  const railGrad = ctx.createLinearGradient(0, 0, 0, tableH);
  railGrad.addColorStop(0, '#2A5C2A');
  railGrad.addColorStop(1, '#1A4A1A');
  ctx.fillStyle = railGrad;
  ctx.fillRect(RAIL - 8, RAIL - 8, tableW - (RAIL - 8) * 2, tableH - (RAIL - 8) * 2);

  // Felt surface — use skin color if provided, else default radial gradient
  if (feltColor) {
    ctx.fillStyle = feltColor;
    ctx.fillRect(RAIL, RAIL, tableW - RAIL * 2, tableH - RAIL * 2);
  } else {
    const feltGrad = ctx.createRadialGradient(tableW / 2, tableH / 2, 0, tableW / 2, tableH / 2, tableW * 0.7);
    feltGrad.addColorStop(0, '#1a6b2a');
    feltGrad.addColorStop(0.6, '#145220');
    feltGrad.addColorStop(1, '#0d3d17');
    ctx.fillStyle = feltGrad;
    ctx.fillRect(RAIL, RAIL, tableW - RAIL * 2, tableH - RAIL * 2);
  }

  // Felt texture - subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = RAIL; x < tableW - RAIL; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, RAIL); ctx.lineTo(x, tableH - RAIL); ctx.stroke();
  }
  for (let y = RAIL; y < tableH - RAIL; y += 40) {
    ctx.beginPath(); ctx.moveTo(RAIL, y); ctx.lineTo(tableW - RAIL, y); ctx.stroke();
  }

  // Head/foot string markings
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tableW * 0.25, RAIL + 4); ctx.lineTo(tableW * 0.25, tableH - RAIL - 4); ctx.stroke();
  ctx.setLineDash([]);

  // Foot spot
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(tableW * 0.75, tableH / 2, 3, 0, Math.PI * 2); ctx.fill();

  // Logo watermark on felt center
  try {
    const img = new Image();
    img.src = '/logos/pc-logo.png';
    if (img.complete && img.naturalWidth > 0) {
      ctx.globalAlpha = 0.07;
      const logoSize = Math.min(tableW, tableH) * 0.22;
      ctx.drawImage(img, tableW / 2 - logoSize / 2, tableH / 2 - logoSize / 2, logoSize, logoSize);
      ctx.globalAlpha = 1;
    }
  } catch { }

  // Pockets
  pockets.forEach((p, i) => {
    const isHighlighted = highlightPocket === i;
    // Outer shadow
    const shadowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius + 6);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
    shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2); ctx.fill();
    // Pocket hole
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#080808'; ctx.fill();
    // Chrome/brass trim ring
    const trimGrad = ctx.createLinearGradient(p.x - p.radius, p.y - p.radius, p.x + p.radius, p.y + p.radius);
    trimGrad.addColorStop(0, isHighlighted ? '#FFD700' : '#C0A030');
    trimGrad.addColorStop(0.5, isHighlighted ? '#FFF0A0' : '#E8C84A');
    trimGrad.addColorStop(1, isHighlighted ? '#FFD700' : '#9A7820');
    ctx.strokeStyle = trimGrad;
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.stroke();
  });

  // Aiming guide
  if (aimStart && aimEnd) {
    const cue = balls.find(b => b.isCue && !b.pocketed);
    if (cue) {
      const dx = aimStart.x - aimEnd.x;
      const dy = aimStart.y - aimEnd.y;
      const len = Math.hypot(dx, dy);
      if (len > 5) {
        const nx = dx / len; const ny = dy / len;
        const power = Math.min(len / 150, 1);

        // Dotted aiming line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x + nx * 150, cue.y + ny * 150);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cue stick visual
        const cueLen = 140 + power * 30;
        const cueX1 = cue.x - nx * (cue.radius + 2);
        const cueY1 = cue.y - ny * (cue.radius + 2);
        const cueX2 = cue.x - nx * (cue.radius + 2 + cueLen);
        const cueY2 = cue.y - ny * (cue.radius + 2 + cueLen);
        const perpX = -ny; const perpY = nx;
        const tipW = 2; const buttW = 8;

        const cueGrad = ctx.createLinearGradient(cueX1, cueY1, cueX2, cueY2);
        cueGrad.addColorStop(0, '#F5E6C0');
        cueGrad.addColorStop(0.2, '#C9A84C');
        cueGrad.addColorStop(0.5, '#8B6914');
        cueGrad.addColorStop(0.8, '#6B4F10');
        cueGrad.addColorStop(1, '#3E2800');
        ctx.beginPath();
        ctx.moveTo(cueX1 + perpX * tipW, cueY1 + perpY * tipW);
        ctx.lineTo(cueX2 + perpX * buttW, cueY2 + perpY * buttW);
        ctx.lineTo(cueX2 - perpX * buttW, cueY2 - perpY * buttW);
        ctx.lineTo(cueX1 - perpX * tipW, cueY1 - perpY * tipW);
        ctx.closePath();
        ctx.fillStyle = cueGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();

        // Power meter bar
        const barX = 12; const barY = tableH - 30;
        const barW = 120; const barH = 12;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        const powerGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        powerGrad.addColorStop(0, '#4CAF50');
        powerGrad.addColorStop(0.5, '#FF9800');
        powerGrad.addColorStop(1, '#F44336');
        ctx.fillStyle = powerGrad;
        ctx.fillRect(barX, barY, barW * power, barH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`POWER ${Math.round(power * 100)}%`, barX, barY - 4);
      }
    }
  }

  // Balls
  balls.forEach(ball => {
    if (ball.pocketed) return;
    ctx.save();

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    const isHighlightedBall = highlightBall === ball.id;

    if (ball.striped) {
      // Striped ball base
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#F5F5F5'; ctx.fill();
      // Stripe band
      ctx.save();
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = ball.color;
      ctx.fillRect(ball.x - ball.radius, ball.y - ball.radius * 0.45, ball.radius * 2, ball.radius * 0.9);
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color; ctx.fill();
    }

    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // 3D gloss
    const gloss = ctx.createRadialGradient(
      ball.x - ball.radius * 0.32, ball.y - ball.radius * 0.36, 0,
      ball.x, ball.y, ball.radius
    );
    gloss.addColorStop(0, 'rgba(255,255,255,0.6)');
    gloss.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    gloss.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gloss; ctx.fill();

    // Number label
    if (!ball.isCue) {
      const numColor = ball.isEight ? '#fff' : (ball.striped ? '#222' : '#fff');
      ctx.fillStyle = numColor;
      ctx.font = `bold ${ball.radius * 0.85}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ball.id), ball.x, ball.y + 0.5);
    }

    // Snooker colored balls - no numbers, just dots
    if (ball.snookerType && ball.snookerType !== 'red' && !ball.isCue) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Highlight ring for selected ball/pocket
    if (isHighlightedBall) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 3, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();
  });

  // Vignette overlay
  const vig = ctx.createRadialGradient(tableW / 2, tableH / 2, tableH * 0.3, tableW / 2, tableH / 2, tableW * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, tableW, tableH);

  ctx.restore();
}

// ─── Pool Voice Hook ─────────────────────────────────────────────────────────
function usePoolVoice() {
  const { speak, isSupported } = useGameVoice();
  const sayYourShot = useCallback(() => { if (isSupported) speak('Your shot.', 0.9); }, [speak, isSupported]);
  const sayBallInHand = useCallback(() => { if (isSupported) speak('Ball in hand.', 0.88); }, [speak, isSupported]);
  const say8BallCornerPocket = useCallback(() => { if (isSupported) speak('Eight ball, corner pocket.', 0.85); }, [speak, isSupported]);
  const sayNiceBreak = useCallback(() => { if (isSupported) speak('Nice break!', 0.9); }, [speak, isSupported]);
  const sayRaked = useCallback(() => { if (isSupported) speak("R-A-K-E. You've been raked!", 0.82); }, [speak, isSupported]);
  const sayBallPocketed = useCallback((n: number) => { if (isSupported) speak(`Ball ${n} pocketed.`, 0.9); }, [speak, isSupported]);
  const sayFoul = useCallback(() => { if (isSupported) speak('Foul!', 0.92); }, [speak, isSupported]);
  return { sayYourShot, sayBallInHand, say8BallCornerPocket, sayNiceBreak, sayRaked, sayBallPocketed, sayFoul };
}

// ─── AI Shot Logic ────────────────────────────────────────────────────────────
function aiPickShot(balls: Ball[], pockets: Pocket[], group: Group, mode: GameMode): { targetBall: Ball | null; targetPocket: Pocket; power: number } {
  const cue = balls.find(b => b.isCue && !b.pocketed)!;
  const candidates = balls.filter(b => {
    if (b.pocketed || b.isCue) return false;
    if (mode === '8ball' || mode === 'shotbet') {
      if (group === 'solid') return !b.isEight && !b.striped;
      if (group === 'striped') return !b.isEight && b.striped;
      return !b.isEight;
    }
    if (mode === '9ball') {
      const alive = balls.filter(b2 => !b2.pocketed && !b2.isCue);
      const minId = Math.min(...alive.map(b2 => b2.id));
      return b.id === minId;
    }
    if (mode === 'snooker') return b.snookerType === 'red';
    return !b.isEight;
  });
  if (!candidates.length) {
    const any = balls.find(b => !b.pocketed && !b.isCue && !b.isEight);
    if (!any) return { targetBall: null, targetPocket: pockets[0], power: 8 };
    return { targetBall: any, targetPocket: pockets[0], power: 8 };
  }
  // Pick closest candidate to cue ball
  const target = candidates.reduce((best, b) => {
    const d = Math.hypot(b.x - cue.x, b.y - cue.y);
    return d < Math.hypot(best.x - cue.x, best.y - cue.y) ? b : best;
  });
  // Pick best pocket (closest to target ball)
  const pocket = pockets.reduce((best, p) => {
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    return d < Math.hypot(target.x - best.x, target.y - best.y) ? p : best;
  });
  return { targetBall: target, targetPocket: pocket, power: 8 + Math.random() * 5 };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function PoolGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet }: PoolGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { activePreset: ballPreset } = usePoolBallSkin();
  const { settings, membership } = useGlobalGame();
  const { reactions, winBursts, addReaction, addAIReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const poolVoice = usePoolVoice();
  const { playSound } = useSoundEffects();

  // ── Skin refs (kept in sync for draw callbacks) ──────────────────────────
  const ballPresetRef = useRef(ballPreset);
  useEffect(() => { ballPresetRef.current = ballPreset; }, [ballPreset]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [phase, setPhase] = useState<Phase>('lobby');
  const [betAmount, setBetAmount] = useState(10000);
  const [perShotBet, setPerShotBet] = useState(1000);
  const [turn, setTurn] = useState<TurnPlayer>('player');
  const [playerGroup, setPlayerGroup] = useState<Group>(null);
  const [message, setMessage] = useState('Choose a game mode to begin.');
  const [canShoot, setCanShoot] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [localBalance, setLocalBalance] = useState(balance);

  // Snooker
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [snookerPhase, setSnookerPhase] = useState<'red' | 'color'>('red');
  const [redsRemaining, setRedsRemaining] = useState(15);

  // Shot Bet
  const [shotBet, setShotBet] = useState<ShotBetState>({ playerBalance: 0, aiBalance: 0, calledBall: null, calledPocket: null, perShot: 1000, isCallPhase: false });

  // RAKE
  const RAKE_LETTERS = ['R', 'A', 'K', 'E'];
  const [rake, setRake] = useState<RakeState>({ playerLetters: 0, aiLetters: 0, callerIsPlayer: true, challengeActive: false, challengeShot: null, playerCallPos: null });

  // Tournament
  const [tournament, setTournament] = useState<TournamentBracket | null>(null);
  const [tournamentMatchup, setTournamentMatchup] = useState<{ player: string; opponent: string; entryFee: number } | null>(null);

  // UI
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [selectedCallBall, setSelectedCallBall] = useState<number | null>(null);
  const [selectedCallPocket, setSelectedCallPocket] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const triggerAiShotRef = useRef<() => void>(() => {});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>(make8BallRack(getDefaultPoolBallPreset().colors));
  const animRef = useRef<number>(0);
  const aimStartRef = useRef<{ x: number; y: number } | null>(null);
  const aimEndRef = useRef<{ x: number; y: number } | null>(null);
  const movingRef = useRef(false);
  const phaseLockRef = useRef<Phase>('lobby');
  const tableWRef = useRef(TABLE_W);
  const tableHRef = useRef(TABLE_H);
  const pocketsRef = useRef<Pocket[]>(POCKETS);
  const highlightPocketRef = useRef<number | null>(null);
  const highlightBallRef = useRef<number | null>(null);
  const betAmountRef = useRef(betAmount);
  const playerGroupRef = useRef<Group>(null);
  const gameModeRef = useRef<GameMode>('select');
  const snookerPhaseRef = useRef<'red' | 'color'>('red');
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const shotBetRef = useRef(shotBet);
  const rakeRef = useRef(rake);
  const turnRef = useRef<TurnPlayer>('player');

  // Keep refs in sync
  useEffect(() => { betAmountRef.current = betAmount; }, [betAmount]);
  useEffect(() => { playerGroupRef.current = playerGroup; }, [playerGroup]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { snookerPhaseRef.current = snookerPhase; }, [snookerPhase]);
  useEffect(() => { playerScoreRef.current = playerScore; aiScoreRef.current = aiScore; }, [playerScore, aiScore]);
  useEffect(() => { shotBetRef.current = shotBet; }, [shotBet]);
  useEffect(() => { rakeRef.current = rake; }, [rake]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { setLocalBalance(balance); }, [balance]);

  const tableSkinRef = useRef(tableSkin);
  useEffect(() => { tableSkinRef.current = tableSkin; }, [tableSkin]);

  // ── Canvas drawing ─────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPool(ctx, ballsRef.current, pocketsRef.current, tableWRef.current, tableHRef.current, aimStartRef.current, aimEndRef.current, highlightPocketRef.current, highlightBallRef.current, tableSkinRef.current?.felt);
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  const handleShotEnd = useCallback((pocketedThisTurn: Ball[]) => {
    const balls = ballsRef.current;
    const mode = gameModeRef.current;
    const group = playerGroupRef.current;
    const curTurn = turnRef.current;

    const cueBall = balls.find(b => b.isCue);
    const scratch = cueBall?.pocketed === true;

    if (scratch) {
      // Reset cue ball
      if (cueBall) {
        cueBall.pocketed = false;
        if (mode === 'snooker') {
          cueBall.x = SNOOKER_W * 0.22; cueBall.y = SNOOKER_H / 2;
        } else {
          cueBall.x = TABLE_W * 0.25; cueBall.y = TABLE_H / 2;
        }
        cueBall.vx = 0; cueBall.vy = 0;
      }
      playSound('error');
      poolVoice.sayFoul();

      if (mode === 'shotbet') {
        const ps = shotBetRef.current;
        const penalty = ps.perShot * 2;
        if (curTurn === 'player') {
          setShotBet(prev => ({ ...prev, playerBalance: prev.playerBalance - penalty, isCallPhase: false, calledBall: null, calledPocket: null }));
          setMessage('Scratch! You lose double bet. AI gets ball-in-hand.');
          setTurn('ai');
        } else {
          setShotBet(prev => ({ ...prev, aiBalance: prev.aiBalance - penalty, isCallPhase: false }));
          setMessage('AI scratched! Ball-in-hand for you.');
          setTurn('player');
        }
      } else if (mode === 'rake') {
        const r = rakeRef.current;
        if (r.callerIsPlayer && curTurn === 'player') {
          setRake(prev => ({ ...prev, playerLetters: prev.playerLetters + 1, challengeActive: false, challengeShot: null }));
          setMessage(`Scratch! You get a letter. ${RAKE_LETTERS[rakeRef.current.playerLetters] || ''}!`);
        }
        setTurn('player');
      } else {
        if (curTurn === 'player') {
          setMessage('Scratch! Ball-in-hand for AI. AI\'s turn.');
          setTurn('ai');
        } else {
          setMessage('AI scratched! Ball-in-hand. Your shot.');
          setTurn('player');
          poolVoice.sayBallInHand();
        }
      }
      phaseLockRef.current = 'playing';
      setPhase('playing');
      setTimeout(() => {
        setCanShoot(turnRef.current === 'player');
        if (turnRef.current === 'ai') {
          setTimeout(() => triggerAiShotRef.current(), 1000);
        }
      }, 800);
      return;
    }

    // 8-Ball logic
    if (mode === '8ball' || mode === 'shotbet') {
      const eightBall = balls.find(b => b.isEight);
      if (eightBall?.pocketed) {
        const solidsDown = balls.filter(b => !b.isCue && !b.isEight && !b.striped && b.pocketed).length;
        const stripesDown = balls.filter(b => !b.isCue && !b.isEight && b.striped && b.pocketed).length;
        if (group === 'solid' && solidsDown >= 7 && curTurn === 'player') {
          handleGameWin();
        } else if (group === 'striped' && stripesDown >= 7 && curTurn === 'player') {
          handleGameWin();
        } else if (group !== null && curTurn === 'ai') {
          const aiGroup: Group = group === 'solid' ? 'striped' : 'solid';
          const aiDone = aiGroup === 'solid' ? solidsDown >= 7 : stripesDown >= 7;
          if (aiDone) handleGameLoss();
          else handleGameLoss();
        } else {
          handleGameLoss(); // premature 8-ball
        }
        return;
      }

      // Assign groups
      if (group === null && pocketedThisTurn.filter(b => !b.isCue).length > 0) {
        const firstPocketed = pocketedThisTurn.find(b => !b.isCue && !b.isEight);
        if (firstPocketed) {
          if (curTurn === 'player') {
            const pg: Group = firstPocketed.striped ? 'striped' : 'solid';
            setPlayerGroup(pg);
            playerGroupRef.current = pg;
            setMessage(`You claimed ${pg === 'solid' ? 'Solids' : 'Stripes'}! AI gets the other.`);
          } else {
            const aiGotStriped = firstPocketed.striped;
            const pg: Group = aiGotStriped ? 'solid' : 'striped';
            setPlayerGroup(pg);
            playerGroupRef.current = pg;
            setMessage(`AI claimed ${aiGotStriped ? 'Stripes' : 'Solids'}. You have ${pg === 'solid' ? 'Solids' : 'Stripes'}.`);
          }
        }
      }

      // Shot Bet settlement
      if (mode === 'shotbet') {
        const ps = shotBetRef.current;
        const calledBall = ps.calledBall;
        const calledPocket = ps.calledPocket;
        const madeCalled = calledBall !== null && pocketedThisTurn.some(b => b.id === calledBall);
        if (curTurn === 'player') {
          if (madeCalled) {
            setShotBet(prev => ({ ...prev, playerBalance: prev.playerBalance + prev.perShot, isCallPhase: true, calledBall: null, calledPocket: null }));
            setMessage(`Nice shot! +${ps.perShot.toLocaleString()} $Pc`);
          } else {
            setShotBet(prev => ({ ...prev, playerBalance: prev.playerBalance - prev.perShot, isCallPhase: false, calledBall: null, calledPocket: null }));
            setMessage(`Missed called shot. -${ps.perShot.toLocaleString()} $Pc`);
            setTurn('ai');
            phaseLockRef.current = 'playing'; setPhase('playing');
            setTimeout(() => triggerAiShotRef.current(), 1200);
            return;
          }
        }
      }
    }

    // 9-Ball logic
    if (mode === '9ball') {
      const nineBall = balls.find(b => b.id === 9);
      if (nineBall?.pocketed) {
        if (curTurn === 'player') handleGameWin();
        else handleGameLoss();
        return;
      }
    }

    // Snooker logic
    if (mode === 'snooker') {
      const sp = snookerPhaseRef.current;
      pocketedThisTurn.forEach(b => {
        if (!b.isCue) {
          if (curTurn === 'player') {
            setPlayerScore(prev => prev + (b.points || 0));
            playerScoreRef.current += (b.points || 0);
          } else {
            setAiScore(prev => prev + (b.points || 0));
            aiScoreRef.current += (b.points || 0);
          }
          // Respot colors if reds remain
          if (b.snookerType && b.snookerType !== 'red' && b.respotX) {
            const reds = balls.filter(r => r.snookerType === 'red' && !r.pocketed);
            if (reds.length > 0) {
              b.pocketed = false;
              b.x = b.respotX!; b.y = b.respotY!;
              b.vx = 0; b.vy = 0;
            }
          }
          if (b.snookerType === 'red') {
            setRedsRemaining(prev => prev - 1);
          }
        }
      });

      const allReds = balls.filter(b => b.snookerType === 'red');
      const allPocketed = balls.filter(b => !b.isCue && !b.pocketed).length === 0;
      if (allPocketed) {
        if (playerScoreRef.current > aiScoreRef.current) handleGameWin();
        else handleGameLoss();
        return;
      }

      if (sp === 'red' && pocketedThisTurn.some(b => b.snookerType === 'red')) {
        setSnookerPhase('color');
        snookerPhaseRef.current = 'color';
      } else {
        setSnookerPhase('red');
        snookerPhaseRef.current = 'red';
      }
    }

    // RAKE logic
    if (mode === 'rake') {
      const r = rakeRef.current;
      if (r.challengeActive && r.challengeShot) {
        const madeChallengeShot = pocketedThisTurn.some(b => b.id === r.challengeShot!.ballId);
        if (r.callerIsPlayer) {
          // AI was trying to match player
          if (!madeChallengeShot && curTurn === 'ai') {
            setRake(prev => ({ ...prev, aiLetters: prev.aiLetters + 1, challengeActive: false, challengeShot: null, callerIsPlayer: true }));
            setMessage(`AI missed! AI gets a letter: ${RAKE_LETTERS[rakeRef.current.aiLetters] || ''}!`);
          } else {
            setRake(prev => ({ ...prev, challengeActive: false, challengeShot: null, callerIsPlayer: false }));
            setMessage('AI matched your shot! AI calls next.');
          }
        } else {
          // Player is trying to match AI
          if (!madeChallengeShot && curTurn === 'player') {
            setRake(prev => ({ ...prev, playerLetters: prev.playerLetters + 1, challengeActive: false, challengeShot: null, callerIsPlayer: false }));
            setMessage(`You missed! You get a letter: ${RAKE_LETTERS[rakeRef.current.playerLetters] || ''}!`);
          } else {
            setRake(prev => ({ ...prev, challengeActive: false, challengeShot: null, callerIsPlayer: true }));
            setMessage('You matched the shot! You call next.');
          }
        }
        if (rakeRef.current.playerLetters >= 4) { handleGameLoss(); return; }
        if (rakeRef.current.aiLetters >= 4) { handleGameWin(); return; }
      } else if (!r.challengeActive && r.callerIsPlayer && curTurn === 'player') {
        // Player made their called shot — AI must match
        const madeCalled = r.challengeShot && pocketedThisTurn.some(b => b.id === r.challengeShot!.ballId);
        if (madeCalled) {
          setRake(prev => ({ ...prev, challengeActive: true }));
          setMessage('You made it! AI must match your shot from the same position.');
          setTurn('ai');
          setTimeout(() => triggerAiShotRef.current(), 1200);
          return;
        }
      }
    }

    // Continue game
    const didScore = pocketedThisTurn.filter(b => !b.isCue).length > 0;
    const nextTurn: TurnPlayer = didScore ? curTurn : (curTurn === 'player' ? 'ai' : 'player');
    setTurn(nextTurn);
    turnRef.current = nextTurn;

    if (nextTurn === 'player') {
      setMessage('Your shot!');
      poolVoice.sayYourShot();
      phaseLockRef.current = 'playing'; setPhase('playing');
      setCanShoot(true);
      if (mode === 'shotbet') {
        setShotBet(prev => ({ ...prev, isCallPhase: true }));
        setShowCallPanel(true);
      } else if (mode === 'rake' && rakeRef.current.callerIsPlayer) {
        setShowCallPanel(true);
      }
    } else {
      setMessage('AI is thinking...');
      phaseLockRef.current = 'playing'; setPhase('playing');
      setCanShoot(false);
      setTimeout(() => triggerAiShotRef.current(), 800 + Math.random() * 600);
    }
  }, []);

  const gameLoopStep = useCallback(() => {
    const tw = tableWRef.current;
    const th = tableHRef.current;
    const pockets = pocketsRef.current;
    const balls = ballsRef.current;

    const { anyMoving, pocketed } = simulateStep(balls, tw, th, pockets);
    redrawCanvas();
    movingRef.current = anyMoving;

    if (anyMoving) {
      animRef.current = requestAnimationFrame(gameLoopStep);
    } else {
      // All balls stopped
      const pocketedThisTurn = pocketed;
      handleShotEnd(pocketedThisTurn);
    }
  }, [redrawCanvas, handleShotEnd]);

  const handleGameWin = useCallback(() => {
    const winAmt = betAmountRef.current * 2;
    onWin(winAmt);
    setLocalBalance(prev => prev + betAmountRef.current);
    triggerWinBurst();
    addReaction('👑', 'you');
    poolVoice.say8BallCornerPocket();
    playSound('win');
    phaseLockRef.current = 'won'; setPhase('won');
    setMessage(`You win! +${winAmt.toLocaleString()} $Pc`);
    setCanShoot(false);
  }, [onWin, triggerWinBurst, addReaction, playSound]);

  const handleGameLoss = useCallback(() => {
    addAIReaction('ai');
    playSound('lose');
    phaseLockRef.current = 'lost'; setPhase('lost');
    setMessage(`You lose! -${betAmountRef.current.toLocaleString()} $Pc`);
    setCanShoot(false);
  }, [addAIReaction, playSound]);

  const triggerAiShot = useCallback(() => {
    const balls = ballsRef.current;
    const mode = gameModeRef.current;
    const group: Group = playerGroupRef.current === 'solid' ? 'striped' : playerGroupRef.current === 'striped' ? 'solid' : null;
    const pockets = pocketsRef.current;
    const cue = balls.find(b => b.isCue && !b.pocketed);
    if (!cue) return;

    const { targetBall, targetPocket, power } = aiPickShot(balls, pockets, group, mode);
    if (!targetBall) return;

    // Aim from cue to ball → toward pocket
    const dxBall = targetBall.x - cue.x;
    const dyBall = targetBall.y - cue.y;
    const lenBall = Math.hypot(dxBall, dyBall);
    if (lenBall === 0) return;

    // Ghost ball position
    const ghostX = targetBall.x - (dxBall / lenBall) * (BALL_R * 2);
    const ghostY = targetBall.y - (dyBall / lenBall) * (BALL_R * 2);

    const dx = ghostX - cue.x;
    const dy = ghostY - cue.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const accuracy = 0.85 + Math.random() * 0.12;
    cue.vx = (dx / len) * power * accuracy;
    cue.vy = (dy / len) * power * accuracy;
    // Small random deviation
    cue.vx += (Math.random() - 0.5) * 0.8;
    cue.vy += (Math.random() - 0.5) * 0.8;

    setCanShoot(false);
    phaseLockRef.current = 'playing';
    animRef.current = requestAnimationFrame(gameLoopStep);
  }, [gameLoopStep]);

  // Wire triggerAiShot into the ref so handleShotEnd can call it
  useEffect(() => {
    triggerAiShotRef.current = triggerAiShot;
  }, [triggerAiShot]);

  // ── Shoot handler ──────────────────────────────────────────────────────────
  const shoot = useCallback(() => {
    if (!aimStartRef.current || !aimEndRef.current) return;
    const start = aimStartRef.current;
    const end = aimEndRef.current;
    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) return;
    const power = Math.min(len / 150, 1);
    const cue = ballsRef.current.find(b => b.isCue && !b.pocketed);
    if (!cue) return;
    cue.vx = (dx / len) * power * 16;
    cue.vy = (dy / len) * power * 16;
    setCanShoot(false);
    aimStartRef.current = null;
    aimEndRef.current = null;
    playSound('chip');
    phaseLockRef.current = 'playing';
    animRef.current = requestAnimationFrame(gameLoopStep);
  }, [gameLoopStep, playSound]);

  // ── Canvas interaction ─────────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (tableWRef.current / rect.width),
      y: (e.clientY - rect.top) * (tableHRef.current / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canShoot || movingRef.current || phase === 'won' || phase === 'lost') return;
    aimStartRef.current = getPos(e);
    aimEndRef.current = getPos(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!aimStartRef.current) return;
    aimEndRef.current = getPos(e);
    redrawCanvas();
  };

  const handleMouseUp = () => {
    if (!aimStartRef.current || !aimEndRef.current) return;
    shoot();
  };

  // Touch support
  const getPosTouche = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) * (tableWRef.current / rect.width),
      y: (touch.clientY - rect.top) * (tableHRef.current / rect.height),
    };
  };

  // ── Game Initialization ───────────────────────────────────────────────────
  const startGame = useCallback((mode: GameMode) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    let tw = TABLE_W; let th = TABLE_H; let pockets = POCKETS;
    if (mode === 'snooker') { tw = SNOOKER_W; th = SNOOKER_H; pockets = SNOOKER_POCKETS; }
    tableWRef.current = tw; tableHRef.current = th; pocketsRef.current = pockets;

    // Setup canvas DPR
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = tw;
      canvas.height = th;
    }

    const skinColors = ballPresetRef.current?.colors ?? DEFAULT_BALL_COLORS;
    let balls: Ball[];
    if (mode === '9ball') balls = make9BallRack();
    else if (mode === 'snooker') balls = makeSnookerRack();
    else balls = make8BallRack(skinColors);

    ballsRef.current = balls;
    aimStartRef.current = null; aimEndRef.current = null;
    highlightPocketRef.current = null; highlightBallRef.current = null;

    setPlayerGroup(null); playerGroupRef.current = null;
    setTurn('player'); turnRef.current = 'player';
    setPlayerScore(0); playerScoreRef.current = 0;
    setAiScore(0); aiScoreRef.current = 0;
    setSnookerPhase('red'); snookerPhaseRef.current = 'red';
    setRedsRemaining(15);
    setShotBet({ playerBalance: 0, aiBalance: 0, calledBall: null, calledPocket: null, perShot: perShotBet, isCallPhase: false });
    setRake({ playerLetters: 0, aiLetters: 0, callerIsPlayer: true, challengeActive: false, challengeShot: null, playerCallPos: null });
    setShowCallPanel(false);

    setCanShoot(true);
    phaseLockRef.current = 'playing';
    setPhase('playing');
    setMessage(mode === 'snooker' ? 'Snooker! Pot a red first.' : mode === '9ball' ? '9-Ball! Must hit the lowest ball first.' : mode === 'rake' ? 'RAKE! You call first — declare ball and pocket.' : mode === 'shotbet' ? 'Shot Bet! Call your ball and pocket before shooting.' : 'Break! Shoot to start.');

    if (mode === 'rake' || mode === 'shotbet') {
      setShowCallPanel(true);
    }

    setTimeout(() => redrawCanvas(), 50);
  }, [perShotBet, redrawCanvas]);

  const placeBetAndStart = useCallback(() => {
    if (!onBet(betAmount)) {
      toast.error('Insufficient balance!');
      return;
    }
    playSound('chip');
    toast.success(`Bet of ${betAmount.toLocaleString()} $Pc placed!`);
    startGame(gameMode);
  }, [betAmount, gameMode, onBet, playSound, startGame]);

  const resetToSelect = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setGameMode('select');
    gameModeRef.current = 'select';
    setPhase('lobby');
    phaseLockRef.current = 'lobby';
    setCanShoot(false);
    setMessage('Choose a game mode to begin.');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Initial render
  useEffect(() => {
    if (canvasRef.current && phase === 'playing') {
      redrawCanvas();
    }
  }, [phase, redrawCanvas]);

  // ── Tournament setup ─────────────────────────────────────────────────────────
  const startTournament = useCallback((size: 4 | 8, mode: GameMode, entryFee: number) => {
    if (!onBet(entryFee)) { toast.error('Insufficient balance!'); return; }
    const slots: TournamentSlot[] = [
      { name: 'You', isAI: false },
      ...Array.from({ length: size - 1 }, (_, i) => ({ name: `AI Player ${i + 1}`, isAI: true })),
    ];
    setTournament({ slots, results: Array(size).fill(null), round: 1 });
    setTournamentMatchup({ player: 'You', opponent: slots[1].name, entryFee });
    setGameMode(mode);
    gameModeRef.current = mode;
    startGame(mode);
    playSound('chip');
    toast.success(`Tournament entry: -${entryFee.toLocaleString()} $Pc`);
  }, [onBet, startGame, playSound]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const modeLabel = gameMode === '8ball' ? '8-Ball' : gameMode === '9ball' ? '9-Ball' : gameMode === 'snooker' ? 'Snooker' : gameMode === 'shotbet' ? 'Shot Bet' : gameMode === 'rake' ? 'RAKE' : 'Pool';
  const tw = gameMode === 'snooker' ? SNOOKER_W : TABLE_W;
  const th = gameMode === 'snooker' ? SNOOKER_H : TABLE_H;

  const balls8 = ballsRef.current;
  const solids = balls8.filter(b => !b.isCue && !b.isEight && !b.striped);
  const stripes = balls8.filter(b => !b.isCue && !b.isEight && b.striped);
  const solidsPocketed = solids.filter(b => b.pocketed).length;
  const stripesPocketed = stripes.filter(b => b.pocketed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#050505', color: '#fff', overflow: 'hidden' }}>
      <CelebrationSystem enabled={settings.celebrationsEnabled} reactions={reactions} winBursts={winBursts} onBurstComplete={removeBurst} playerPositions={{ you: 'bottom', ai: 'top' }} />

      <InGameTopBar
        gameName={`Pool — ${modeLabel}`}
        balance={localBalance}
        onBack={onBack}
        onAddBalance={onAddBalance}
        onShowWallet={onShowWallet}
        showShare={phase === 'won'}
        winAmount={phase === 'won' ? betAmount * 2 : undefined}
      />

      <InGameOptionsPanel isOpen={showOptions} onClose={() => setShowOptions(false)} isMember={membership.isMember} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', padding: '8px 12px 12px', gap: 8 }}>

        {/* ── Mode select screen ─────────────────────────────────────────── */}
        {gameMode === 'select' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, maxWidth: 680, width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>🎱 $Pc POOL SUITE</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Choose your game mode</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, width: '100%' }}>
              {([
                { id: '8ball', label: '8-Ball', sub: 'Solids vs Stripes, classic', emoji: '🎱', color: '#1a1a1a' },
                { id: '9ball', label: '9-Ball', sub: '9 balls, win with the 9', emoji: '9️⃣', color: '#F5C518' },
                { id: 'snooker', label: 'Snooker', sub: 'Reds + colors, highest score', emoji: '🔴', color: '#CC0000' },
                { id: 'shotbet', label: 'Shot Bet', sub: 'Call your shot, bet per ball', emoji: '💰', color: '#D4AF37' },
                { id: 'rake', label: 'RAKE', sub: 'Spell R-A-K-E to lose', emoji: '🐴', color: '#8B5CF6' },
                { id: 'tournament', label: 'Tournament', sub: 'Bracket — 4 or 8 players', emoji: '🏆', color: '#F59E0B' },
              ] as const).map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (m.id === 'tournament') { setGameMode('tournament'); gameModeRef.current = 'tournament'; setPhase('betting'); }
                    else { setGameMode(m.id); gameModeRef.current = m.id; setPhase('betting'); }
                  }}
                  style={{
                    padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', color: '#fff',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{m.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{m.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Bet screen ────────────────────────────────────────────────────── */}
        {phase === 'betting' && gameMode !== 'select' && gameMode !== 'tournament' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, maxWidth: 560, width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 900, color: '#D4AF37' }}>{modeLabel}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {gameMode === '8ball' && 'Classic 8-ball — win pays 2x'}
                {gameMode === '9ball' && '9-Ball — win pays 2x'}
                {gameMode === 'snooker' && 'Snooker — highest score wins, pays 2x'}
                {gameMode === 'shotbet' && 'Shot Bet — per-shot wagers + game stake pays 2x'}
                {gameMode === 'rake' && 'RAKE — first to spell R-A-K-E loses, pays 2x'}
              </div>
            </div>

            {(gameMode === 'shotbet') && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Per-Shot Bet Amount</div>
                <ChipSelector selectedChip={perShotBet} onSelect={setPerShotBet} balance={localBalance} compact />
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Game Stake</div>
              <ChipSelector selectedChip={betAmount} onSelect={setBetAmount} balance={localBalance} compact />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={resetToSelect}
                style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}
              >
                Back
              </button>
              <button
                onClick={placeBetAndStart}
                disabled={betAmount > localBalance}
                style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14, border: 'none', opacity: betAmount > localBalance ? 0.5 : 1 }}
              >
                {betAmount > localBalance ? 'Insufficient Balance' : `Place ${betAmount.toLocaleString()} $Pc & Play`}
              </button>
            </div>
          </div>
        )}

        {/* ── Tournament Setup ────────────────────────────────────────────── */}
        {phase === 'betting' && gameMode === 'tournament' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, maxWidth: 480, width: '100%' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 900, color: '#D4AF37' }}>🏆 TOURNAMENT</div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { size: 4, mode: '8ball' as GameMode, fee: 50000, label: '4-Player 8-Ball — 50K entry' },
                { size: 8, mode: '8ball' as GameMode, fee: 100000, label: '8-Player 8-Ball — 100K entry' },
                { size: 4, mode: '9ball' as GameMode, fee: 50000, label: '4-Player 9-Ball — 50K entry' },
                { size: 8, mode: 'snooker' as GameMode, fee: 200000, label: '8-Player Snooker — 200K entry' },
              ]).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => startTournament(opt.size as 4 | 8, opt.mode, opt.fee)}
                  style={{ padding: '14px 20px', borderRadius: 10, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'left' }}
                >
                  {opt.label}
                  <span style={{ float: 'right', color: opt.fee > localBalance ? '#ef4444' : '#86efac' }}>
                    {opt.fee > localBalance ? 'Too expensive' : `Pot: ${(opt.fee * opt.size).toLocaleString()} $Pc`}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={resetToSelect} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}>Back</button>
          </div>
        )}

        {/* ── Playing screen ────────────────────────────────────────────────── */}
        {phase !== 'lobby' && phase !== 'betting' && gameMode !== 'select' && (
          <>
            {/* Status bar */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: tw }}>
              <div style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(22,101,52,0.3)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#86efac', flex: 1, textAlign: 'center' }}>
                {message}
              </div>
              {gameMode === 'snooker' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', fontSize: 12, color: '#93c5fd' }}>You: {playerScore}pts</div>
                  <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#fca5a5' }}>AI: {aiScore}pts</div>
                </div>
              )}
              {(gameMode === '8ball' || gameMode === 'shotbet') && playerGroup && (
                <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)', fontSize: 11, color: '#D4AF37' }}>
                  You: {playerGroup === 'solid' ? '● Solids' : '◎ Stripes'} ({playerGroup === 'solid' ? solidsPocketed : stripesPocketed}/7)
                </div>
              )}
              {gameMode === 'shotbet' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11, color: '#86efac' }}>Shot: {shotBet.playerBalance > 0 ? '+' : ''}{shotBet.playerBalance.toLocaleString()}</div>
                </div>
              )}
              {gameMode === 'rake' && (
                <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.4)', fontSize: 12, color: '#c4b5fd', fontFamily: 'monospace', fontWeight: 700 }}>
                  You: {RAKE_LETTERS.slice(0, rake.playerLetters).join('')}{'_'.repeat(4 - rake.playerLetters)} | AI: {RAKE_LETTERS.slice(0, rake.aiLetters).join('')}{'_'.repeat(4 - rake.aiLetters)}
                </div>
              )}
              {tournament && tournamentMatchup && (
                <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, color: '#FCD34D' }}>
                  🏆 vs {tournamentMatchup.opponent}
                </div>
              )}
            </div>

            {/* Canvas container */}
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 0 6px #5D3A1A, 0 0 0 10px #3E2000', flexShrink: 0, background: '#0a0a0a' }}>
              <canvas
                ref={canvasRef}
                width={tw}
                height={th}
                style={{ display: 'block', cursor: canShoot && !movingRef.current ? 'crosshair' : 'default', maxWidth: '100%', height: 'auto', touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={e => { e.preventDefault(); if (!canShoot || movingRef.current) return; aimStartRef.current = getPosTouche(e); aimEndRef.current = getPosTouche(e); }}
                onTouchMove={e => { e.preventDefault(); if (!aimStartRef.current) return; aimEndRef.current = getPosTouche(e); redrawCanvas(); }}
                onTouchEnd={e => { e.preventDefault(); shoot(); }}
              />

              {/* Win/Loss overlay */}
              {(phase === 'won' || phase === 'lost') && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', gap: 12 }}>
                  <div style={{ fontSize: 56 }}>{phase === 'won' ? '🏆' : '😔'}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: phase === 'won' ? '#D4AF37' : '#ef4444', fontFamily: "'Cinzel', serif" }}>
                    {phase === 'won' ? `+${(betAmount * 2).toLocaleString()} $Pc` : `Lost ${betAmount.toLocaleString()} $Pc`}
                  </div>
                  {gameMode === 'shotbet' && (
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>
                      Shot bet net: {shotBet.playerBalance > 0 ? '+' : ''}{shotBet.playerBalance.toLocaleString()} $Pc
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setPhase('betting'); setGameMode(gameMode); }} style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: 14 }}>
                      Play Again
                    </button>
                    <button onClick={resetToSelect} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      Game Select
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: tw }}>

              {/* Shooting hint */}
              {canShoot && phase === 'playing' && (
                <div style={{ fontSize: 11, color: '#6b7280', padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>
                  🎯 Click & drag from cue ball to aim and shoot
                </div>
              )}
              {movingRef.current && (
                <div style={{ fontSize: 11, color: '#6b7280', padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>
                  ⌛ Balls rolling...
                </div>
              )}

              {/* Shot Bet call panel */}
              {showCallPanel && canShoot && (gameMode === 'shotbet' || gameMode === 'rake') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)', width: '100%', maxWidth: 440 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.1em' }}>CALL YOUR SHOT</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Ball #</div>
                      <select
                        value={selectedCallBall ?? ''}
                        onChange={e => setSelectedCallBall(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: '#111', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontSize: 12 }}
                      >
                        <option value=''>Select ball</option>
                        {ballsRef.current.filter(b => !b.pocketed && !b.isCue).map(b => (
                          <option key={b.id} value={b.id}>Ball {b.id}{b.isEight ? ' (8-ball)' : b.snookerType ? ` (${b.snookerType})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Pocket</div>
                      <select
                        value={selectedCallPocket ?? ''}
                        onChange={e => setSelectedCallPocket(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: '#111', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontSize: 12 }}
                      >
                        <option value=''>Select pocket</option>
                        {['Top-Left', 'Top-Center', 'Top-Right', 'Bot-Left', 'Bot-Center', 'Bot-Right'].map((label, i) => (
                          <option key={i} value={i}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedCallBall === null || selectedCallPocket === null) { toast.error('Select a ball and pocket!'); return; }
                        setShotBet(prev => ({ ...prev, calledBall: selectedCallBall, calledPocket: selectedCallPocket, isCallPhase: false }));
                        setRake(prev => ({ ...prev, challengeShot: { ballId: selectedCallBall, pocketIdx: selectedCallPocket } }));
                        highlightBallRef.current = selectedCallBall;
                        highlightPocketRef.current = selectedCallPocket;
                        setShowCallPanel(false);
                        setSelectedCallBall(null); setSelectedCallPocket(null);
                        redrawCanvas();
                        toast.info(`Called: Ball ${selectedCallBall} → ${['Top-Left','Top-Center','Top-Right','Bot-Left','Bot-Center','Bot-Right'][selectedCallPocket]}`);
                      }}
                      disabled={selectedCallBall === null || selectedCallPocket === null}
                      style={{ padding: '6px 16px', borderRadius: 6, background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37', cursor: 'pointer', fontSize: 12, fontWeight: 700, alignSelf: 'flex-end', opacity: (selectedCallBall === null || selectedCallPocket === null) ? 0.5 : 1 }}
                    >
                      Lock In
                    </button>
                  </div>
                </div>
              )}

              {/* Emoji reactions */}
              {settings.celebrationsEnabled && phase === 'playing' && (
                <EmojiReactionPicker onReact={emoji => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
              )}

              {/* Forfeit */}
              {(phase === 'playing') && (
                <button
                  onClick={handleGameLoss}
                  style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                >
                  Forfeit
                </button>
              )}

              {/* Chat toggle */}
              <button
                onClick={() => setShowChat(v => !v)}
                style={{ padding: '6px 10px', borderRadius: 8, background: showChat ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}
              >
                💬 Chat
              </button>
            </div>

            {/* Ball tracker */}
            {(gameMode === '8ball' || gameMode === 'shotbet') && (
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#6b7280', justifyContent: 'center' }}>
                <span>Solids: {solidsPocketed}/7</span>
                <span>Stripes: {stripesPocketed}/7</span>
                <span>8-ball: {ballsRef.current.find(b => b.isEight)?.pocketed ? '✅ pocketed' : '🎱 on table'}</span>
              </div>
            )}
            {gameMode === 'snooker' && (
              <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                Reds remaining: {redsRemaining} | Next: {snookerPhase === 'red' ? 'Red ball' : 'Color ball'} | You: {playerScore}pts | AI: {aiScore}pts
              </div>
            )}
            {gameMode === '9ball' && (
              <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                Balls remaining: {ballsRef.current.filter(b => !b.pocketed && !b.isCue).length} | Must hit lowest ball first
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat overlay */}
      {showChat && (
        <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 200 }}>
          <LobbyChat username={''} avatar={'🎱'} isAuthenticated={true} />
        </div>
      )}
    </div>
  );
}
