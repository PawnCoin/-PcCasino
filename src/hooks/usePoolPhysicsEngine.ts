/**
 * Pool Physics Engine Bridge
 *
 * Provides two physics backends behind a common interface:
 * - ClassicBackend: wraps the original simulateStep logic
 * - RealisticBackend: bridges to the tailuge/billiards physics engine
 *   (github:tailuge/billiards) using the Mathaven cushion model and
 *   sliding/rolling physics from that package.
 *
 * Coordinate mapping:
 *   Tailuge works in SI units: R = 0.03275 m, table ≈ 1.41 m × 0.71 m
 *   Our canvas: BALL_R = 10 px, table = 720 × 360 px
 *   Scale: SCALE = px/m = BALL_R / R_SI = 10 / 0.03275 ≈ 305.3 px/m
 *
 * The tailuge physics functions (sliding, rollingFull, bounceHanBlend,
 * mathavenAdapter) operate in SI (m/s, rad/s). We convert px/frame ↔ SI
 * using SCALE and DT (frame time = 1/60 s).
 */

import { Vector3 } from 'three';
import {
  sliding,
  rollingFull,
  forceRoll,
  mathavenAdapter,
  R_SI,
} from '../lib/billiards-physics';

// ── Coordinate scaling ────────────────────────────────────────────────────────

/** px per meter (canvas pixel space to SI) */
const SCALE = 10 / R_SI; // ≈ 305.3 px/m

/** Simulation frame time (seconds) */
const DT = 1 / 60;

/** Convert canvas px/frame velocity to SI m/s */
function pxFrameToSI(v_px: number): number {
  return v_px / (SCALE * DT);
}

/** Convert SI m/s velocity to canvas px/frame */
function siToPxFrame(v_si: number): number {
  return v_si * SCALE * DT;
}

/** Convert canvas px angular velocity (wz in rad/frame × scale) to rad/s */
function radFrameToSI(w: number): number {
  return w / DT;
}

/** Convert SI rad/s to canvas angular (rad/frame) */
function siRadToPxFrame(w: number): number {
  return w * DT;
}

// ── Shared types ─────────────────────────────────────────────────────────────

export interface PhysicsBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pocketed: boolean;
  isCue: boolean;
  /** Angular velocities in rad/frame (for realistic mode) */
  wx?: number;
  wy?: number;
  wz?: number;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export interface StepResult {
  anyMoving: boolean;
  pocketed: PhysicsBall[];
  collisions: { velocity: number }[];
  cushionBounces: { velocity: number }[];
}

export interface PoolPhysicsBackend {
  initShot(balls: PhysicsBall[], initialVelocity?: { vx: number; vy: number }): void;
  step(balls: PhysicsBall[], tableW: number, tableH: number, pockets: Pocket[], rail: number): StepResult;
  isSettled(balls: PhysicsBall[]): boolean;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function hypot(dx: number, dy: number) {
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Classic Backend ───────────────────────────────────────────────────────────

const FRICTION_CLASSIC = 0.976;
const MIN_SPEED_CLASSIC = 0.12;

export const ClassicBackend: PoolPhysicsBackend = {
  initShot(_balls, _iv) {},

  step(balls, tableW, tableH, pockets, rail): StepResult {
    const pocketedThisStep: PhysicsBall[] = [];
    const collisions: { velocity: number }[] = [];
    const cushionBounces: { velocity: number }[] = [];

    balls.forEach(ball => {
      if (ball.pocketed) return;
      ball.vx *= FRICTION_CLASSIC;
      ball.vy *= FRICTION_CLASSIC;
      const speed = hypot(ball.vx, ball.vy);
      if (speed < MIN_SPEED_CLASSIC) { ball.vx = 0; ball.vy = 0; }
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - ball.radius < rail) { const v = Math.abs(ball.vx); ball.x = rail + ball.radius; ball.vx = v * 0.78; cushionBounces.push({ velocity: v }); }
      if (ball.x + ball.radius > tableW - rail) { const v = Math.abs(ball.vx); ball.x = tableW - rail - ball.radius; ball.vx = -v * 0.78; cushionBounces.push({ velocity: v }); }
      if (ball.y - ball.radius < rail) { const v = Math.abs(ball.vy); ball.y = rail + ball.radius; ball.vy = v * 0.78; cushionBounces.push({ velocity: v }); }
      if (ball.y + ball.radius > tableH - rail) { const v = Math.abs(ball.vy); ball.y = tableH - rail - ball.radius; ball.vy = -v * 0.78; cushionBounces.push({ velocity: v }); }

      for (const p of pockets) {
        if (hypot(ball.x - p.x, ball.y - p.y) < p.radius) {
          ball.pocketed = true;
          ball.vx = 0; ball.vy = 0;
          pocketedThisStep.push(ball);
          break;
        }
      }
    });

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]; const b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const dist = hypot(dx, dy);
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
            collisions.push({ velocity: dot });
          }
        }
      }
    }

    const anyMoving = balls.some(b => !b.pocketed && (Math.abs(b.vx) > MIN_SPEED_CLASSIC || Math.abs(b.vy) > MIN_SPEED_CLASSIC));
    return { anyMoving, pocketed: pocketedThisStep, collisions, cushionBounces };
  },

  isSettled(balls) {
    return !balls.some(b => !b.pocketed && (Math.abs(b.vx) > MIN_SPEED_CLASSIC || Math.abs(b.vy) > MIN_SPEED_CLASSIC));
  },
};

// ── Realistic Backend (tailuge/billiards bridge) ──────────────────────────────
//
// This backend bridges our 2D canvas coordinate system to the tailuge/billiards
// physics engine (github:tailuge/billiards). We use:
//   - tailuge `sliding()` / `rollingFull()` for per-frame friction forces
//   - tailuge `bounceHanBlend()` for Han cushion bounce model
//   - tailuge `Mathaven` class for full numerical cushion impulse integration
//   - tailuge `mathavenAdapter()` for cushion bounce with coordinate rotation
//
// Coordinate conversion: canvas px/frame ↔ SI m/s via SCALE and DT

const MIN_SPEED_REALISTIC = 0.08;

// Reusable Three.js vectors to avoid per-frame allocation
const _v = new Vector3();
const _w = new Vector3();

/**
 * Advance a ball's velocity/spin by one frame using tailuge physics equations.
 * Uses SI physics then converts back to px/frame.
 */
function advanceTaligueVelocity(ball: PhysicsBall): void {
  const speed_px = hypot(ball.vx, ball.vy);
  if (speed_px < MIN_SPEED_REALISTIC) {
    ball.vx = 0; ball.vy = 0;
    ball.wx = 0; ball.wy = 0; ball.wz = 0;
    return;
  }

  // Convert to SI velocities (m/s) and angular velocities (rad/s)
  const vx_si = pxFrameToSI(ball.vx);
  const vy_si = pxFrameToSI(ball.vy);
  const wx_si = radFrameToSI(ball.wx ?? 0);
  const wy_si = radFrameToSI(ball.wy ?? 0);
  const wz_si = radFrameToSI(ball.wz ?? 0);

  _v.set(vx_si, vy_si, 0);
  _w.set(wx_si, wy_si, wz_si);

  // Check if ball is sliding or rolling using tailuge surface velocity
  // Surface velocity: sv = v + R × ω (in 2D: sv_x = vx - R*wy, sv_y = vy + R*wx)
  const sv_x_si = vx_si - R_SI * wy_si;
  const sv_y_si = vy_si + R_SI * wx_si;
  const sv_si = hypot(sv_x_si, sv_y_si);

  let delta: { v: Vector3; w: Vector3 };

  if (sv_si > 0.005) {
    // Sliding: use tailuge sliding() physics
    delta = sliding(_v, _w);
  } else {
    // Rolling: use tailuge rollingFull() physics
    const w_mag = Math.sqrt(_w.x * _w.x + _w.y * _w.y);
    if (w_mag < 0.01) {
      // Nearly stopped
      ball.vx = 0; ball.vy = 0;
      ball.wx = 0; ball.wy = 0; ball.wz = 0;
      return;
    }
    // Enforce rolling constraint first
    forceRoll(_v, _w);
    delta = rollingFull(_w);
  }

  // Apply delta scaled by DT (tailuge returns per-second rates)
  const new_vx_si = vx_si + delta.v.x * DT;
  const new_vy_si = vy_si + delta.v.y * DT;
  const new_wx_si = wx_si + delta.w.x * DT;
  const new_wy_si = wy_si + delta.w.y * DT;
  const new_wz_si = wz_si + delta.w.z * DT;

  // Check if velocity passed through zero (ball stopped)
  const new_speed_si = hypot(new_vx_si, new_vy_si);
  const old_speed_si = hypot(vx_si, vy_si);
  if (new_speed_si > old_speed_si || new_speed_si < 0.001) {
    ball.vx = 0; ball.vy = 0;
    ball.wx = 0; ball.wy = 0; ball.wz = 0;
    return;
  }

  // Convert back to px/frame
  ball.vx = siToPxFrame(new_vx_si);
  ball.vy = siToPxFrame(new_vy_si);
  ball.wx = siRadToPxFrame(new_wx_si);
  ball.wy = siRadToPxFrame(new_wy_si);
  ball.wz = siRadToPxFrame(new_wz_si);
}

/**
 * Apply tailuge Mathaven/Han cushion bounce.
 * `normalAxis`: 'x' or 'y' — which axis is normal to the cushion.
 * `incomingSign`: +1 if ball hits wall from positive side, -1 from negative.
 *
 * The tailuge `mathavenAdapter` expects ball to be bouncing in the +X direction.
 * We rotate our coordinate frame so that the normal axis aligns with +X.
 */
function applyTaligueCushionBounce(ball: PhysicsBall, normalAxis: 'x' | 'y'): void {
  let vx_si: number;
  let vy_si: number;
  let wx_si: number;
  let wy_si: number;

  const wz_si = radFrameToSI(ball.wz ?? 0);

  if (normalAxis === 'x') {
    // Cushion normal is X: ball bounces in X direction
    vx_si = Math.abs(pxFrameToSI(ball.vx));
    vy_si = pxFrameToSI(ball.vy);
    wx_si = radFrameToSI(ball.wx ?? 0);
    wy_si = radFrameToSI(ball.wy ?? 0);
  } else {
    // Cushion normal is Y: rotate 90° so Y→X for mathavenAdapter
    // In tailuge coords: vx is into cushion (normal), vy is tangential
    vx_si = Math.abs(pxFrameToSI(ball.vy));
    vy_si = pxFrameToSI(ball.vx); // tangential
    wx_si = radFrameToSI(ball.wy ?? 0);
    wy_si = -radFrameToSI(ball.wx ?? 0);
  }

  // Ensure ball is moving INTO the cushion (positive x in tailuge frame)
  if (vx_si <= 0) vx_si = 0.001;

  _v.set(vx_si, vy_si, 0);
  _w.set(wx_si, wy_si, wz_si);

  // Apply Mathaven cushion model from tailuge
  const delta = mathavenAdapter(_v, _w);

  // new velocity = incoming + delta (tailuge returns delta to apply)
  const new_vx_si = vx_si + delta.v.x;
  const new_vy_si = vy_si + delta.v.y;
  const new_wx_si = wx_si + delta.w.x;
  const new_wy_si = wy_si + delta.w.y;
  const new_wz_si = wz_si + delta.w.z;

  // Convert back and apply, reversing rotation if needed
  if (normalAxis === 'x') {
    const sign = ball.vx < 0 ? 1 : -1; // outgoing direction
    ball.vx = siToPxFrame(new_vx_si) * sign;
    ball.vy = siToPxFrame(new_vy_si);
    ball.wx = siRadToPxFrame(new_wx_si);
    ball.wy = siRadToPxFrame(new_wy_si);
  } else {
    const sign = ball.vy < 0 ? 1 : -1;
    ball.vy = siToPxFrame(new_vx_si) * sign;
    ball.vx = siToPxFrame(new_vy_si);
    ball.wy = siRadToPxFrame(new_wx_si);
    ball.wx = -siRadToPxFrame(new_wy_si);
  }
  ball.wz = siRadToPxFrame(new_wz_si);
}

/**
 * Ball-ball collision using tailuge-based model.
 * The tailuge CollisionThrow requires Ball objects with BallMesh, so we
 * implement the same underlying physics directly using its constants and formulas.
 * Reference: tailuge/src/model/physics/collisionthrow.ts
 */
function collideRealistic(a: PhysicsBall, b: PhysicsBall, nx: number, ny: number): number {
  const tx = -ny; const ty = nx;

  const dv_x = a.vx - b.vx;
  const dv_y = a.vy - b.vy;
  const dvn = dv_x * nx + dv_y * ny;
  if (dvn <= 0) return 0;

  const dvt = dv_x * tx + dv_y * ty;
  const wza = a.wz ?? 0;
  const wzb = b.wz ?? 0;
  const R_px = a.radius;

  // Surface spin contribution (from tailuge CollisionThrow)
  const sv_t = dvt + R_px * (wza + wzb);

  // Dynamic friction from tailuge's formula: μ = 0.01 + 0.108 * exp(-1.088 * vRel)
  const vRel_si = pxFrameToSI(hypot(dv_x, dv_y));
  const mu_dynamic = 0.01 + 0.108 * Math.exp(-1.088 * vRel_si);

  const e = 0.99; // restitution from tailuge CollisionThrow
  // Normal impulse: (-(1+e) * dvn) / (2/m) — but in our px space
  const jn = (1 + e) * dvn / 2;
  a.vx -= jn * nx;
  a.vy -= jn * ny;
  b.vx += jn * nx;
  b.vy += jn * ny;

  // Tangential impulse (throw) — tailuge: 0.25 * min(μ*|jn|/|vRel|, 1/7) * -vRelTangential
  if (Math.abs(sv_t) > 0.001 && Math.abs(dvn) > 0.001) {
    const maxThrow = (1 / 7) * dvn;
    const jt_mag = 0.25 * Math.min(mu_dynamic * dvn / Math.max(0.001, Math.abs(dvt)), maxThrow);
    const jt = -jt_mag * Math.sign(sv_t);
    a.vx -= jt * tx;
    a.vy -= jt * ty;
    b.vx += jt * tx;
    b.vy += jt * ty;

    // Angular impulse from tailuge
    const spin_delta = jt / (R_px * 0.4);
    a.wz = wza + spin_delta;
    b.wz = wzb + spin_delta;
  }

  return dvn;
}

export const RealisticBackend: PoolPhysicsBackend = {
  initShot(balls, _iv) {
    balls.forEach(ball => {
      if (ball.wx === undefined) ball.wx = 0;
      if (ball.wy === undefined) ball.wy = 0;
      if (ball.wz === undefined) ball.wz = 0;
    });
  },

  step(balls, tableW, tableH, pockets, rail): StepResult {
    const pocketedThisStep: PhysicsBall[] = [];
    const collisions: { velocity: number }[] = [];
    const cushionBounces: { velocity: number }[] = [];

    balls.forEach(ball => {
      if (ball.wx === undefined) ball.wx = 0;
      if (ball.wy === undefined) ball.wy = 0;
      if (ball.wz === undefined) ball.wz = 0;
    });

    balls.forEach(ball => {
      if (ball.pocketed) return;
      advanceTaligueVelocity(ball);
      ball.x += ball.vx;
      ball.y += ball.vy;
    });

    balls.forEach(ball => {
      if (ball.pocketed) return;

      if (ball.x - ball.radius < rail) {
        ball.x = rail + ball.radius;
        if (ball.vx < 0) { cushionBounces.push({ velocity: Math.abs(ball.vx) }); applyTaligueCushionBounce(ball, 'x'); }
      }
      if (ball.x + ball.radius > tableW - rail) {
        ball.x = tableW - rail - ball.radius;
        if (ball.vx > 0) { cushionBounces.push({ velocity: Math.abs(ball.vx) }); applyTaligueCushionBounce(ball, 'x'); }
      }
      if (ball.y - ball.radius < rail) {
        ball.y = rail + ball.radius;
        if (ball.vy < 0) { cushionBounces.push({ velocity: Math.abs(ball.vy) }); applyTaligueCushionBounce(ball, 'y'); }
      }
      if (ball.y + ball.radius > tableH - rail) {
        ball.y = tableH - rail - ball.radius;
        if (ball.vy > 0) { cushionBounces.push({ velocity: Math.abs(ball.vy) }); applyTaligueCushionBounce(ball, 'y'); }
      }
    });

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]; const b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const dist = hypot(dx, dy);
        const minD = a.radius + b.radius;
        if (dist < minD && dist > 0) {
          const nx = dx / dist; const ny = dy / dist;
          const overlap = minD - dist;
          a.x -= nx * overlap * 0.51; a.y -= ny * overlap * 0.51;
          b.x += nx * overlap * 0.51; b.y += ny * overlap * 0.51;

          const speed = collideRealistic(a, b, nx, ny);
          if (speed > 0) collisions.push({ velocity: speed });
        }
      }
    }

    balls.forEach(ball => {
      if (ball.pocketed) return;
      for (const p of pockets) {
        const d = hypot(ball.x - p.x, ball.y - p.y);
        if (d < p.radius) {
          ball.pocketed = true;
          ball.vx = 0; ball.vy = 0;
          ball.wx = 0; ball.wy = 0; ball.wz = 0;
          pocketedThisStep.push(ball);
          break;
        }
        if (d < p.radius * 1.35 && d > 0) {
          const pull = 0.08 * (p.radius * 1.35 - d) / (p.radius * 0.35);
          ball.vx += (p.x - ball.x) / d * pull;
          ball.vy += (p.y - ball.y) / d * pull;
        }
      }
    });

    const anyMoving = balls.some(b =>
      !b.pocketed && (Math.abs(b.vx) > MIN_SPEED_REALISTIC || Math.abs(b.vy) > MIN_SPEED_REALISTIC)
    );
    return { anyMoving, pocketed: pocketedThisStep, collisions, cushionBounces };
  },

  isSettled(balls) {
    return !balls.some(b =>
      !b.pocketed && (Math.abs(b.vx) > MIN_SPEED_REALISTIC || Math.abs(b.vy) > MIN_SPEED_REALISTIC)
    );
  },
};

// ── Storage / Event helpers ───────────────────────────────────────────────────

export const PHYSICS_MODE_KEY = 'pcasino_pool_physics_mode';
export const PHYSICS_MODE_EVENT = 'poolPhysicsMode';

export type PhysicsMode = 'classic' | 'realistic';

export function getDefaultPhysicsMode(): PhysicsMode {
  try {
    const stored = localStorage.getItem(PHYSICS_MODE_KEY);
    if (stored === 'realistic' || stored === 'classic') return stored;
  } catch {}
  return 'classic';
}
