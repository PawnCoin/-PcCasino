/**
 * Self-contained billiards physics adapter.
 * Inlined from github:tailuge/billiards (MIT) to avoid importing
 * uncompiled TypeScript source from node_modules at production build time.
 * Only `three` (Vector3) is kept as an external import — it ships proper ESM.
 */

import { Vector3 } from "three";

// ── Math helpers (from billiards/src/utils/utils.ts) ─────────────────────────

const _atan2 = (y, x) => Math.fround(Math.atan2(y, x));
const _pow   = (x, y) => Math.fround(Math.pow(x, y));
const _sin   = (t)    => Math.fround(Math.sin(t));
const _cos   = (t)    => Math.fround(Math.cos(t));
const _sqrt  = (t)    => Math.fround(Math.sqrt(t));

// ── Constants (from billiards/src/model/physics/constants.ts) ────────────────

const g   = 9.8;
const muS = 0.16;
const muC = 0.85;
const m   = 0.23;
export const R = 0.03275;
export { R as R_SI };
const e   = 0.86;
const ee  = 0.98;
const μs  = 0.212;
const μw  = 0.165;
const mu  = 0.00985;
const rho = 0.034;

const Mz  = ((mu * m * g * 2) / 3) * rho;
const Mxy = (7 / (5 * Math.sqrt(2))) * R * mu * m * g;
const I   = (2 / 5) * m * R * R;

// Mathaven cushion constants
const sinθ = 2 / 5;
const cosθ = Math.sqrt(21) / 5;

// ── Vector3 helpers (from billiards/src/utils/three-utils.ts) ────────────────

const up = new Vector3(0, 0, 1);

const _upCrossVec = new Vector3();
function upCross(v) {
  return _upCrossVec.copy(up).cross(v);
}

const _normVec = new Vector3();
function norm(v) {
  return _normVec.copy(v).normalize();
}

// ── Mathaven class (from billiards/src/model/physics/mathaven.ts) ─────────────

class Mathaven {
  constructor(M, R, ee, μs, μw) {
    this.M  = M;
    this.R  = R;
    this.ee = ee;
    this.μs = μs;
    this.μw = μw;
    this.P  = 0;
    this.WzI = 0;
    this.i  = 0;
    this.N  = 100;
    this.vx = 0; this.vy = 0;
    this.ωx = 0; this.ωy = 0; this.ωz = 0;
    this.s  = 0; this.φ  = 0;
    this.sʹ = 0; this.φʹ = 0;
  }

  _updateSlipSpeedsAndAngles() {
    const R = this.R;
    const v_xI = this.vx + this.ωy * R * sinθ - this.ωz * R * cosθ;
    const v_yI = -this.vy * sinθ + this.ωx * R;
    const v_xC = this.vx - this.ωy * R;
    const v_yC = this.vy + this.ωx * R;
    this.s  = _sqrt(_pow(v_xI, 2) + _pow(v_yI, 2));
    this.φ  = _atan2(v_yI, v_xI);
    if (this.φ < 0) this.φ += 2 * Math.PI;
    this.sʹ = _sqrt(_pow(v_xC, 2) + _pow(v_yC, 2));
    this.φʹ = _atan2(v_yC, v_xC);
    if (this.φʹ < 0) this.φʹ += 2 * Math.PI;
  }

  compressionPhase() {
    const ΔP = Math.max((this.M * this.vy) / this.N, 0.001);
    while (this.vy > 0) this._updateSingleStep(ΔP);
  }

  restitutionPhase(targetWorkRebound) {
    const ΔP = Math.max(targetWorkRebound / this.N, 0.001);
    this.WzI = 0;
    while (this.WzI < targetWorkRebound) this._updateSingleStep(ΔP);
  }

  _updateSingleStep(ΔP) {
    this._updateSlipSpeedsAndAngles();
    this._updateVelocity(ΔP);
    this._updateAngularVelocity(ΔP);
    this._updateWorkDone(ΔP);
    if (this.i++ > 10 * this.N) throw new Error("Mathaven: solution not found");
  }

  _updateVelocity(ΔP) {
    const { μs, μw, M, φ, φʹ } = this;
    this.vx -= (1 / M) * (μw * _cos(φ) + μs * _cos(φʹ) * (sinθ + μw * _sin(φ) * cosθ)) * ΔP;
    this.vy -= (1 / M) * (cosθ - μw * sinθ * _sin(φ) + μs * _sin(φʹ) * (sinθ + μw * _sin(φ) * cosθ)) * ΔP;
  }

  _updateAngularVelocity(ΔP) {
    const { μs, μw, M, R, φ, φʹ } = this;
    this.ωx += -(5 / (2 * M * R)) * (μw * _sin(φ) + μs * _sin(φʹ) * (sinθ + μw * _sin(φ) * cosθ)) * ΔP;
    this.ωy += -(5 / (2 * M * R)) * (μw * _cos(φ) * sinθ - μs * _cos(φʹ) * (sinθ + μw * _sin(φ) * cosθ)) * ΔP;
    this.ωz +=  (5 / (2 * M * R)) * (μw * _cos(φ) * cosθ) * ΔP;
  }

  _updateWorkDone(ΔP) {
    this.WzI += ΔP * Math.abs(this.vy);
    this.P   += ΔP;
  }

  solve(vx, vy, ωx, ωy, ωz) {
    this.vx = vx; this.vy = vy;
    this.ωx = ωx; this.ωy = ωy; this.ωz = ωz;
    this.WzI = 0; this.P = 0; this.i = 0;
    this.compressionPhase();
    this.restitutionPhase(this.ee * this.ee * this.WzI);
  }
}

// ── Physics functions (from billiards/src/model/physics/physics.ts) ───────────

const _sv = new Vector3();
function surfaceVelocityFull(v, w) {
  return _sv.copy(v).addScaledVector(upCross(w), R);
}
function surfaceVelocity(v, w) {
  return surfaceVelocityFull(v, w).setZ(0);
}

const _delta = { v: new Vector3(), w: new Vector3() };
Object.freeze(_delta);

export function sliding(v, w) {
  const va = surfaceVelocity(v, w);
  _delta.v.copy(norm(va).multiplyScalar(-muS * g));
  _delta.w.copy(norm(upCross(va)).multiplyScalar(((5 / 2) * muS * g) / R));
  _delta.w.setZ(-(5 / 2) * (Mz / (m * R * R)) * Math.sign(w.z));
  return _delta;
}

export function rollingFull(w) {
  const mag = new Vector3(w.x, w.y, 0).length();
  const k  = ((5 / 7) * Mxy) / (m * R) / mag;
  const kw = ((5 / 7) * Mxy) / (m * R * R) / mag;
  _delta.v.set(-k * w.y, k * w.x, 0);
  _delta.w.set(-kw * w.x, -kw * w.y, -(5 / 2) * (Mz / (m * R * R)) * Math.sign(w.z));
  return _delta;
}

export function forceRoll(v, w) {
  const wz = w.z;
  w.copy(upCross(v).multiplyScalar(1 / R));
  w.setZ(wz);
}

function rotateApplyUnrotate(theta, v, w, model) {
  const vr = v.clone().applyAxisAngle(up, theta);
  const wr = w.clone().applyAxisAngle(up, theta);
  const delta = model(vr, wr);
  delta.v.applyAxisAngle(up, -theta);
  delta.w.applyAxisAngle(up, -theta);
  return delta;
}

function cartesionToBallCentric(v, w) {
  const mathaven = new Mathaven(m, R, ee, μs, μw);
  mathaven.solve(v.x, v.y, w.x, w.y, w.z);
  const rv = new Vector3(mathaven.vx, mathaven.vy, 0);
  const rw = new Vector3(mathaven.ωx, mathaven.ωy, mathaven.ωz);
  return { v: rv.sub(v), w: rw.sub(w) };
}

export function mathavenAdapter(v, w) {
  return rotateApplyUnrotate(Math.PI / 2, v, w, cartesionToBallCentric);
}
