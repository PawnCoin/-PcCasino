import { useState, useEffect, useCallback } from 'react';

export interface SlotsSkinDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cabinetGradient: string;
  reelBg: string;
  reelBorder: string;
  headerGradient: string;
  headerText: string;
  ledColor1: string;
  ledColor2: string;
  accentColor: string;
}

export const SLOTS_SKINS: SlotsSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Vegas',
    rarity: 'common',
    cabinetGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
    reelBg: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
    reelBorder: '#D4AF37',
    headerGradient: 'linear-gradient(180deg, #D4AF37 0%, #B8860B 40%, #8B6914 100%)',
    headerText: '#1a1a1a',
    ledColor1: '#FFD700',
    ledColor2: '#FF4444',
    accentColor: '#D4AF37',
  },
  {
    id: 'retro',
    name: 'Retro Arcade',
    rarity: 'common',
    cabinetGradient: 'linear-gradient(180deg, #3a2020 0%, #2a1515 100%)',
    reelBg: 'linear-gradient(180deg, #1a0a0a 0%, #0d0505 100%)',
    reelBorder: '#CC4444',
    headerGradient: 'linear-gradient(180deg, #CC4444 0%, #991111 40%, #661010 100%)',
    headerText: '#FFD700',
    ledColor1: '#FF6666',
    ledColor2: '#FFD700',
    accentColor: '#CC4444',
  },
  {
    id: 'neon',
    name: 'Neon Vegas',
    rarity: 'rare',
    cabinetGradient: 'linear-gradient(180deg, #0a0a2a 0%, #050518 100%)',
    reelBg: 'linear-gradient(180deg, #050510 0%, #0a0a1a 100%)',
    reelBorder: '#00FFFF',
    headerGradient: 'linear-gradient(180deg, #FF00CC 0%, #9900AA 40%, #660077 100%)',
    headerText: '#00FFFF',
    ledColor1: '#00FFFF',
    ledColor2: '#FF00CC',
    accentColor: '#00FFFF',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    rarity: 'rare',
    cabinetGradient: 'linear-gradient(180deg, #0a2040 0%, #051530 100%)',
    reelBg: 'linear-gradient(180deg, #051020 0%, #0a1830 100%)',
    reelBorder: '#4A90D9',
    headerGradient: 'linear-gradient(180deg, #4A90D9 0%, #2060A0 40%, #104080 100%)',
    headerText: '#ffffff',
    ledColor1: '#64B5F6',
    ledColor2: '#1E88E5',
    accentColor: '#4A90D9',
  },
  {
    id: 'royal_gold',
    name: 'Royal Gold',
    rarity: 'epic',
    cabinetGradient: 'linear-gradient(180deg, #1a1400 0%, #0d0a00 100%)',
    reelBg: 'linear-gradient(180deg, #0a0800 0%, #141000 100%)',
    reelBorder: '#FFD700',
    headerGradient: 'linear-gradient(180deg, #FFD700 0%, #D4AF37 40%, #8B6914 100%)',
    headerText: '#000000',
    ledColor1: '#FFD700',
    ledColor2: '#FFA500',
    accentColor: '#FFD700',
  },
  {
    id: 'cyber',
    name: 'Cyber Matrix',
    rarity: 'legendary',
    cabinetGradient: 'linear-gradient(180deg, #0a1a0a 0%, #050d05 100%)',
    reelBg: 'linear-gradient(180deg, #000a00 0%, #001000 100%)',
    reelBorder: '#00FF00',
    headerGradient: 'linear-gradient(180deg, #00FF00 0%, #00AA00 40%, #006600 100%)',
    headerText: '#000000',
    ledColor1: '#00FF00',
    ledColor2: '#00FFAA',
    accentColor: '#00FF00',
  },
];

const STORAGE_KEY = 'pcasino_slots_skin';
const CHANGE_EVENT = 'pcasino_slots_skin_change';

export function getDefaultSlotsSkin(): SlotsSkinDef {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = SLOTS_SKINS.find(s => s.id === stored);
      if (found) return found;
    }
  } catch {}
  return SLOTS_SKINS[0];
}

export function useSlotsSkin() {
  const [activeSkin, setActiveSkin] = useState<SlotsSkinDef>(getDefaultSlotsSkin);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = SLOTS_SKINS.find(s => s.id === id);
      if (found) setActiveSkin(found);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const selectSkin = useCallback((id: string) => {
    const found = SLOTS_SKINS.find(s => s.id === id);
    if (!found) return;
    setActiveSkin(found);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return { activeSkin, selectSkin, allSkins: SLOTS_SKINS };
}
