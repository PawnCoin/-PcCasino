import { useState, useEffect, useCallback } from 'react';

export interface RouletteSkinDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  wheelBg: string;
  redColor: string;
  blackColor: string;
  greenColor: string;
  numberColor: string;
  rimColor: string;
  accentColor: string;
}

export const ROULETTE_SKINS: RouletteSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Casino',
    rarity: 'common',
    wheelBg: '#1a1a1a',
    redColor: '#dc2626',
    blackColor: '#111111',
    greenColor: '#15803d',
    numberColor: '#ffffff',
    rimColor: '#8B6914',
    accentColor: '#D4AF37',
  },
  {
    id: 'royal_blue',
    name: 'Royal Blue',
    rarity: 'rare',
    wheelBg: '#0a1628',
    redColor: '#1E88E5',
    blackColor: '#0d1b2a',
    greenColor: '#00897B',
    numberColor: '#e0e0e0',
    rimColor: '#4A90D9',
    accentColor: '#64B5F6',
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    rarity: 'rare',
    wheelBg: '#120820',
    redColor: '#9C27B0',
    blackColor: '#1a0a2e',
    greenColor: '#4A148C',
    numberColor: '#e1bee7',
    rimColor: '#7B1FA2',
    accentColor: '#CE93D8',
  },
  {
    id: 'vegas_gold',
    name: 'Vegas Gold',
    rarity: 'epic',
    wheelBg: '#100a00',
    redColor: '#B8860B',
    blackColor: '#1a1000',
    greenColor: '#6B4900',
    numberColor: '#FFD700',
    rimColor: '#D4AF37',
    accentColor: '#FFD700',
  },
  {
    id: 'neon',
    name: 'Neon Cyber',
    rarity: 'epic',
    wheelBg: '#050510',
    redColor: '#FF0066',
    blackColor: '#0a0a20',
    greenColor: '#00FF88',
    numberColor: '#00FFFF',
    rimColor: '#FF00CC',
    accentColor: '#00FFFF',
  },
  {
    id: 'diamond',
    name: 'Diamond Elite',
    rarity: 'legendary',
    wheelBg: '#0a0a14',
    redColor: '#E53935',
    blackColor: '#1a1a2e',
    greenColor: '#00C853',
    numberColor: '#ffffff',
    rimColor: '#D4AF37',
    accentColor: '#FFD700',
  },
];

const STORAGE_KEY = 'pcasino_roulette_skin';
const CHANGE_EVENT = 'pcasino_roulette_skin_change';

export function getDefaultRouletteSkin(): RouletteSkinDef {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = ROULETTE_SKINS.find(s => s.id === stored);
      if (found) return found;
    }
  } catch {}
  return ROULETTE_SKINS[0];
}

export function useRouletteSkin() {
  const [activeSkin, setActiveSkin] = useState<RouletteSkinDef>(getDefaultRouletteSkin);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = ROULETTE_SKINS.find(s => s.id === id);
      if (found) setActiveSkin(found);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const selectSkin = useCallback((id: string) => {
    const found = ROULETTE_SKINS.find(s => s.id === id);
    if (!found) return;
    setActiveSkin(found);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return { activeSkin, selectSkin, allSkins: ROULETTE_SKINS };
}
