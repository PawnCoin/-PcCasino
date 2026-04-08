import { useState, useEffect, useCallback } from 'react';

export interface DartsSkinDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  boardColor1: string;
  boardColor2: string;
  wireColor: string;
  bullColor: string;
  bullOuterColor: string;
  numberColor: string;
  boardRimColor: string;
  bgGlow: string;
}

export const DARTS_SKINS: DartsSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Bristle',
    rarity: 'common',
    boardColor1: '#dc2626',
    boardColor2: '#15803d',
    wireColor: 'rgba(192,192,192,0.6)',
    bullColor: '#dc2626',
    bullOuterColor: '#15803d',
    numberColor: '#ffffff',
    boardRimColor: '#333333',
    bgGlow: 'rgba(0,0,0,0)',
  },
  {
    id: 'royal',
    name: 'Royal Blue',
    rarity: 'rare',
    boardColor1: '#1E88E5',
    boardColor2: '#0D47A1',
    wireColor: 'rgba(212,175,55,0.5)',
    bullColor: '#D4AF37',
    bullOuterColor: '#1565C0',
    numberColor: '#FFD700',
    boardRimColor: '#0a2040',
    bgGlow: 'rgba(30,136,229,0.2)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    rarity: 'rare',
    boardColor1: '#7B1FA2',
    boardColor2: '#4A148C',
    wireColor: 'rgba(206,147,216,0.4)',
    bullColor: '#CE93D8',
    bullOuterColor: '#6A1B9A',
    numberColor: '#E1BEE7',
    boardRimColor: '#1a0a2e',
    bgGlow: 'rgba(123,31,162,0.2)',
  },
  {
    id: 'fire',
    name: 'Inferno',
    rarity: 'epic',
    boardColor1: '#FF6F00',
    boardColor2: '#BF360C',
    wireColor: 'rgba(255,215,0,0.5)',
    bullColor: '#FFD700',
    bullOuterColor: '#E65100',
    numberColor: '#FFF8E1',
    boardRimColor: '#3E2723',
    bgGlow: 'rgba(255,111,0,0.3)',
  },
  {
    id: 'gold',
    name: 'Gold Prestige',
    rarity: 'epic',
    boardColor1: '#D4AF37',
    boardColor2: '#8B6914',
    wireColor: 'rgba(255,255,255,0.3)',
    bullColor: '#FFD700',
    bullOuterColor: '#B8860B',
    numberColor: '#000000',
    boardRimColor: '#3E2800',
    bgGlow: 'rgba(212,175,55,0.3)',
  },
  {
    id: 'neon',
    name: 'Neon Strike',
    rarity: 'legendary',
    boardColor1: '#FF0066',
    boardColor2: '#00FFFF',
    wireColor: 'rgba(255,255,255,0.4)',
    bullColor: '#FF00CC',
    bullOuterColor: '#00FF88',
    numberColor: '#ffffff',
    boardRimColor: '#0a0a1a',
    bgGlow: 'rgba(0,255,255,0.3)',
  },
];

const STORAGE_KEY = 'pcasino_darts_skin';
const CHANGE_EVENT = 'pcasino_darts_skin_change';

export function getDefaultDartsSkin(): DartsSkinDef {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = DARTS_SKINS.find(s => s.id === stored);
      if (found) return found;
    }
  } catch {}
  return DARTS_SKINS[0];
}

export function useDartsSkin() {
  const [activeSkin, setActiveSkin] = useState<DartsSkinDef>(getDefaultDartsSkin);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = DARTS_SKINS.find(s => s.id === id);
      if (found) setActiveSkin(found);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const selectSkin = useCallback((id: string) => {
    const found = DARTS_SKINS.find(s => s.id === id);
    if (!found) return;
    setActiveSkin(found);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return { activeSkin, selectSkin, allSkins: DARTS_SKINS };
}
