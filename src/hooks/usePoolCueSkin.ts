import { useState, useEffect, useCallback } from 'react';

export interface CueSkinDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  shaftLight: string;
  shaftDark: string;
  buttLight: string;
  buttDark: string;
  wrapColor: string;
  tipColor: string;
  accentColor: string;
}

export const CUE_SKINS: CueSkinDef[] = [
  {
    id: 'maple',
    name: 'Maple Classic',
    rarity: 'common',
    shaftLight: '#F5E0A0',
    shaftDark: '#C9A84C',
    buttLight: '#8B6914',
    buttDark: '#3E2800',
    wrapColor: 'rgba(200,180,140,0.5)',
    tipColor: '#1a9090',
    accentColor: '#C0A030',
  },
  {
    id: 'mahogany',
    name: 'Mahogany Wood',
    rarity: 'rare',
    shaftLight: '#C47A45',
    shaftDark: '#7B3F20',
    buttLight: '#5A2810',
    buttDark: '#2E1008',
    wrapColor: 'rgba(160,100,60,0.5)',
    tipColor: '#1a9090',
    accentColor: '#D4AF37',
  },
  {
    id: 'carbon',
    name: 'Carbon Fiber',
    rarity: 'epic',
    shaftLight: '#484848',
    shaftDark: '#111111',
    buttLight: '#2A2A2A',
    buttDark: '#080808',
    wrapColor: 'rgba(80,80,80,0.6)',
    tipColor: '#00CFCF',
    accentColor: '#00BFFF',
  },
  {
    id: 'ivory',
    name: 'Ivory Inlay',
    rarity: 'epic',
    shaftLight: '#FFF5E0',
    shaftDark: '#D4C090',
    buttLight: '#E0D0A0',
    buttDark: '#8B7840',
    wrapColor: 'rgba(220,200,160,0.5)',
    tipColor: '#2a6090',
    accentColor: '#FFD700',
  },
  {
    id: 'neon',
    name: 'Neon Electric',
    rarity: 'legendary',
    shaftLight: '#003366',
    shaftDark: '#001122',
    buttLight: '#002244',
    buttDark: '#000811',
    wrapColor: 'rgba(0,200,255,0.4)',
    tipColor: '#00FFFF',
    accentColor: '#00FFFF',
  },
];

const STORAGE_KEY = 'pcasino_pool_cue_skin';
const CUE_SKIN_CHANGE_EVENT = 'pcasino_pool_cue_skin_change';

export function getDefaultCueSkin(): CueSkinDef {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = CUE_SKINS.find(s => s.id === stored);
      if (found) return found;
    }
  } catch {}
  return CUE_SKINS[0];
}

export function usePoolCueSkin() {
  const [activeCueSkin, setActiveCueSkin] = useState<CueSkinDef>(getDefaultCueSkin);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = CUE_SKINS.find(s => s.id === id);
      if (found) setActiveCueSkin(found);
    };
    window.addEventListener(CUE_SKIN_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CUE_SKIN_CHANGE_EVENT, handler);
  }, []);

  const selectCueSkin = useCallback((id: string) => {
    const found = CUE_SKINS.find(s => s.id === id);
    if (!found) return;
    setActiveCueSkin(found);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CUE_SKIN_CHANGE_EVENT, { detail: id }));
  }, []);

  return { activeCueSkin, selectCueSkin, allCueSkins: CUE_SKINS };
}
