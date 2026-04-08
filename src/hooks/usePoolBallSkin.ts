import { useState, useEffect, useCallback } from 'react';

export type BallMaterial = 'classic' | 'glass' | 'metallic' | 'crystal' | 'frosted';

export interface PoolBallPreset {
  id: string;
  name: string;
  material: BallMaterial;
  colors: string[];
}

export const POOL_BALL_PRESETS: PoolBallPreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    material: 'classic',
    colors: ['#F5C518','#0044CC','#CC0000','#6600CC','#CC4400','#006600','#8B0000'],
  },
  {
    id: 'glass',
    name: 'Glass',
    material: 'glass',
    colors: ['#F5C518','#0044CC','#CC0000','#6600CC','#CC4400','#006600','#8B0000'],
  },
  {
    id: 'metallic',
    name: 'Metallic',
    material: 'metallic',
    colors: ['#D4AF37','#336699','#993333','#663399','#994422','#336633','#662200'],
  },
  {
    id: 'crystal',
    name: 'Crystal Gem',
    material: 'crystal',
    colors: ['#FFD700','#4488FF','#FF3333','#9944FF','#FF6622','#22AA44','#AA1111'],
  },
  {
    id: 'frosted',
    name: 'Frosted Matte',
    material: 'frosted',
    colors: ['#D4A020','#2255AA','#AA2020','#5522AA','#AA3318','#1A7733','#7A1A1A'],
  },
];

export const POOL_BALL_STORAGE_KEY = 'pcasino_pool_ball_skin';
export const POOL_BALL_CHANGE_EVENT = 'pcasino_pool_ball_skin_change';

export function getDefaultPoolBallPreset(): PoolBallPreset {
  try {
    const stored = localStorage.getItem(POOL_BALL_STORAGE_KEY);
    if (stored) {
      const found = POOL_BALL_PRESETS.find(p => p.id === stored);
      if (found) return found;
    }
  } catch {}
  return POOL_BALL_PRESETS[0];
}

export function usePoolBallSkin() {
  const [activePreset, setActivePreset] = useState<PoolBallPreset>(getDefaultPoolBallPreset);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = POOL_BALL_PRESETS.find(p => p.id === id);
      if (found) setActivePreset(found);
    };
    window.addEventListener(POOL_BALL_CHANGE_EVENT, handler);
    return () => window.removeEventListener(POOL_BALL_CHANGE_EVENT, handler);
  }, []);

  const selectPreset = useCallback((id: string) => {
    const found = POOL_BALL_PRESETS.find(p => p.id === id);
    if (!found) return;
    setActivePreset(found);
    localStorage.setItem(POOL_BALL_STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(POOL_BALL_CHANGE_EVENT, { detail: id }));
  }, []);

  return { activePreset, selectPreset, allPresets: POOL_BALL_PRESETS };
}
