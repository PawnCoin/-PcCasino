import { useState, useEffect, useCallback } from 'react';

export interface PoolBallPreset {
  id: string;
  name: string;
  colors: string[];
}

export const POOL_BALL_PRESETS: PoolBallPreset[] = [
  { id: 'classic',  name: 'Classic',  colors: ['#F5C518','#0044CC','#CC0000','#6600CC','#CC4400','#006600','#8B0000'] },
  { id: 'pastel',   name: 'Pastel',   colors: ['#FFD1DC','#AECBFA','#B5EAD7','#DCD3FF','#FFDDB0','#C5E8C5','#FFB3B3'] },
  { id: 'neon',     name: 'Neon',     colors: ['#FF3E00','#00BFFF','#39FF14','#FF00FF','#FF9F00','#00FFCC','#FF0066'] },
  { id: 'gold',     name: 'Gold',     colors: ['#D4AF37','#B8860B','#FFD700','#C5A028','#DAA520','#B8860B','#8B6914'] },
  { id: 'crystal',  name: 'Crystal',  colors: ['#7EC8E3','#89CFF0','#A2D2FF','#BDE0FE','#CDB4DB','#FFC8DD','#FFAFCC'] },
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
