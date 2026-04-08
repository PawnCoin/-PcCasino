import { useState, useEffect, useCallback } from 'react';

export interface DiceSkinDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  faceGradientStart: string;
  faceGradientMid: string;
  faceGradientEnd: string;
  pipColor: string;
  pipGradient: string;
  borderColor: string;
  glowColor: string;
}

export const DICE_SKINS: DiceSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic White',
    rarity: 'common',
    faceGradientStart: '#ffffff',
    faceGradientMid: '#f0f0f0',
    faceGradientEnd: '#e0e0e0',
    pipColor: '#D4AF37',
    pipGradient: 'radial-gradient(circle at 30% 30%, #F4D03F, #D4AF37, #B8860B)',
    borderColor: 'rgba(0,0,0,0.08)',
    glowColor: 'rgba(212,175,55,0.3)',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    rarity: 'rare',
    faceGradientStart: '#2a2a2a',
    faceGradientMid: '#1a1a1a',
    faceGradientEnd: '#0f0f0f',
    pipColor: '#e0e0e0',
    pipGradient: 'radial-gradient(circle at 30% 30%, #ffffff, #d0d0d0, #a0a0a0)',
    borderColor: 'rgba(255,255,255,0.1)',
    glowColor: 'rgba(200,200,200,0.3)',
  },
  {
    id: 'ruby',
    name: 'Ruby Red',
    rarity: 'rare',
    faceGradientStart: '#cc2222',
    faceGradientMid: '#991111',
    faceGradientEnd: '#770808',
    pipColor: '#FFD700',
    pipGradient: 'radial-gradient(circle at 30% 30%, #FFD700, #D4AF37, #B8860B)',
    borderColor: 'rgba(255,100,100,0.2)',
    glowColor: 'rgba(220,38,38,0.4)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    rarity: 'epic',
    faceGradientStart: '#0d5a30',
    faceGradientMid: '#0a4020',
    faceGradientEnd: '#062a14',
    pipColor: '#a0ffd0',
    pipGradient: 'radial-gradient(circle at 30% 30%, #a0ffd0, #50cc80, #20aa60)',
    borderColor: 'rgba(20,180,90,0.3)',
    glowColor: 'rgba(20,180,90,0.5)',
  },
  {
    id: 'gold',
    name: 'Gold Luxury',
    rarity: 'epic',
    faceGradientStart: '#D4AF37',
    faceGradientMid: '#B8860B',
    faceGradientEnd: '#8B6914',
    pipColor: '#1a0800',
    pipGradient: 'radial-gradient(circle at 30% 30%, #2a1800, #1a0800, #0a0400)',
    borderColor: 'rgba(212,175,55,0.4)',
    glowColor: 'rgba(255,215,0,0.5)',
  },
  {
    id: 'crystal',
    name: 'Crystal Ice',
    rarity: 'legendary',
    faceGradientStart: 'rgba(180,220,255,0.9)',
    faceGradientMid: 'rgba(140,190,240,0.85)',
    faceGradientEnd: 'rgba(100,160,220,0.8)',
    pipColor: '#ffffff',
    pipGradient: 'radial-gradient(circle at 30% 30%, #ffffff, #d0e8ff, #a0c8ff)',
    borderColor: 'rgba(100,180,255,0.4)',
    glowColor: 'rgba(100,180,255,0.6)',
  },
];

const STORAGE_KEY = 'pcasino_craps_dice_skin';
const CHANGE_EVENT = 'pcasino_craps_dice_skin_change';

export function getDefaultDiceSkin(): DiceSkinDef {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = DICE_SKINS.find(s => s.id === stored);
      if (found) return found;
    }
  } catch {}
  return DICE_SKINS[0];
}

export function useCrapsDiceSkin() {
  const [activeSkin, setActiveSkin] = useState<DiceSkinDef>(getDefaultDiceSkin);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = DICE_SKINS.find(s => s.id === id);
      if (found) setActiveSkin(found);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const selectSkin = useCallback((id: string) => {
    const found = DICE_SKINS.find(s => s.id === id);
    if (!found) return;
    setActiveSkin(found);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return { activeSkin, selectSkin, allSkins: DICE_SKINS };
}
