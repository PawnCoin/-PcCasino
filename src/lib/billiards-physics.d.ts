import type { Vector3 } from "three";

interface PhysicsDelta {
  v: Vector3;
  w: Vector3;
}

export declare function sliding(v: Vector3, w: Vector3): PhysicsDelta;
export declare function rollingFull(w: Vector3): PhysicsDelta;
export declare function forceRoll(v: Vector3, w: Vector3): void;
export declare function mathavenAdapter(v: Vector3, w: Vector3): PhysicsDelta;

export declare const R_SI: number;
