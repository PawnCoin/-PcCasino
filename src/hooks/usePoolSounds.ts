import { useRef, useCallback } from 'react';

const SOUND_URLS = {
  cue: '/sounds/cue.ogg',
  ballcollision: '/sounds/ballcollision.ogg',
  cushion: '/sounds/cushion.ogg',
  pot: '/sounds/pot.ogg',
};

const audioCache: Record<string, HTMLAudioElement[]> = {};
const POOL_SIZE = 4;

function getPooledAudio(key: string): HTMLAudioElement | null {
  if (!audioCache[key]) {
    audioCache[key] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(SOUND_URLS[key as keyof typeof SOUND_URLS]);
      a.preload = 'auto';
      audioCache[key].push(a);
    }
  }
  const pool = audioCache[key];
  for (const a of pool) {
    if (a.paused || a.ended) {
      return a;
    }
  }
  const a = pool[0];
  a.currentTime = 0;
  return a;
}

function playSound(key: string, volume: number) {
  const audio = getPooledAudio(key);
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function usePoolSounds() {
  const lastCollisionTime = useRef(0);
  const lastCushionTime = useRef(0);

  const playCueStrike = useCallback((power: number) => {
    playSound('cue', Math.max(0.3, power) * 0.9);
  }, []);

  const playBallCollision = useCallback((velocity: number) => {
    const vol = Math.min(1, Math.max(0.08, velocity * 0.06)) * 0.6;
    playSound('ballcollision', vol);
  }, []);

  const playPocketDrop = useCallback(() => {
    playSound('pot', 0.7);
  }, []);

  const playBreakShot = useCallback(() => {
    playSound('cue', 1.0);
  }, []);

  const playCushionBounce = useCallback((velocity: number) => {
    const vol = Math.min(1, Math.max(0.05, velocity * 0.08)) * 0.5;
    playSound('cushion', vol);
  }, []);

  const playCollisions = useCallback((collisions: { velocity: number }[], soundEnabled: boolean) => {
    if (!soundEnabled || collisions.length === 0) return;
    const now = performance.now();
    if (now - lastCollisionTime.current < 16) return;
    lastCollisionTime.current = now;
    const count = Math.min(3, collisions.length);
    for (let i = 0; i < count; i++) {
      playBallCollision(collisions[i].velocity);
    }
  }, [playBallCollision]);

  const playCushionBounces = useCallback((bounces: { velocity: number }[], soundEnabled: boolean) => {
    if (!soundEnabled || bounces.length === 0) return;
    const now = performance.now();
    if (now - lastCushionTime.current < 30) return;
    lastCushionTime.current = now;
    const strongest = bounces.reduce((a, b) => a.velocity > b.velocity ? a : b);
    playCushionBounce(strongest.velocity);
  }, [playCushionBounce]);

  return { playCueStrike, playBallCollision, playPocketDrop, playBreakShot, playCollisions, playCushionBounces };
}
