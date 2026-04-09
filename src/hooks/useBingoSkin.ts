import { useState, useEffect, useCallback } from 'react';

export type BingoSkinId = 'classic' | 'royal' | 'neon' | 'vintage' | 'space' | 'gold';

export interface BingoSkinPreview {
  id: BingoSkinId;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  emoji: string;
  cardBg: string;
  headerBg: string;
  headerText: string;
  cellBg: string;
  cellBorder: string;
  dauberColor: string;
}

export const BINGO_SKIN_PREVIEWS: BingoSkinPreview[] = [
  {
    id: 'classic',
    name: 'Classic',
    rarity: 'common',
    emoji: 'slot-machine',
    cardBg: '#1c1c1c',
    headerBg: 'linear-gradient(180deg, #D4AF37, #B8860B)',
    headerText: '#ffffff',
    cellBg: 'rgba(28,28,28,0.8)',
    cellBorder: 'rgba(255,255,255,0.07)',
    dauberColor: '#D4AF37',
  },
  {
    id: 'royal',
    name: 'Royal',
    rarity: 'rare',
    emoji: 'crown',
    cardBg: '#1e0f3c',
    headerBg: 'linear-gradient(180deg, #9370DB, #5B2C9E)',
    headerText: '#e0d0ff',
    cellBg: 'rgba(25,10,50,0.85)',
    cellBorder: 'rgba(147,112,219,0.12)',
    dauberColor: '#9370DB',
  },
  {
    id: 'neon',
    name: 'Neon',
    rarity: 'epic',
    emoji: 'lightning',
    cardBg: '#00050f',
    headerBg: 'linear-gradient(180deg, #00ffc8, #008866)',
    headerText: '#000000',
    cellBg: 'rgba(0,10,20,0.9)',
    cellBorder: 'rgba(0,200,150,0.1)',
    dauberColor: '#00ffc8',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    rarity: 'rare',
    emoji: 'document',
    cardBg: '#37230f',
    headerBg: 'linear-gradient(180deg, #C8A050, #8B6914)',
    headerText: '#F5E6C8',
    cellBg: 'rgba(48,30,12,0.85)',
    cellBorder: 'rgba(180,140,80,0.14)',
    dauberColor: '#C8A050',
  },
  {
    id: 'space',
    name: 'Space',
    rarity: 'epic',
    emoji: 'rocket',
    cardBg: '#050519',
    headerBg: 'linear-gradient(180deg, #6495ED, #3050A0)',
    headerText: '#ffffff',
    cellBg: 'rgba(8,8,30,0.9)',
    cellBorder: 'rgba(100,149,237,0.1)',
    dauberColor: '#6495ED',
  },
  {
    id: 'gold',
    name: 'Gold VIP',
    rarity: 'legendary',
    emoji: 'gem',
    cardBg: '#100a00',
    headerBg: 'linear-gradient(180deg, #FFD700, #D4AF37)',
    headerText: '#000000',
    cellBg: 'rgba(16,10,0,0.9)',
    cellBorder: 'rgba(212,175,55,0.2)',
    dauberColor: '#FFD700',
  },
];

const STORAGE_KEY = 'pcasino_bingo_skin';
const CHANGE_EVENT = 'pcasino_bingo_skin_change';

export function getDefaultBingoSkinId(): BingoSkinId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as BingoSkinId | null;
    if (stored && BINGO_SKIN_PREVIEWS.find(s => s.id === stored)) return stored;
  } catch {}
  return 'classic';
}

export function useBingoSkin() {
  const [activeSkinId, setActiveSkinId] = useState<BingoSkinId>(getDefaultBingoSkinId);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as BingoSkinId;
      if (BINGO_SKIN_PREVIEWS.find(s => s.id === id)) setActiveSkinId(id);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const selectSkin = useCallback((id: BingoSkinId) => {
    if (!BINGO_SKIN_PREVIEWS.find(s => s.id === id)) return;
    setActiveSkinId(id);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  const activePreview = BINGO_SKIN_PREVIEWS.find(s => s.id === activeSkinId) ?? BINGO_SKIN_PREVIEWS[0];

  return { activeSkinId, activePreview, selectSkin, allPreviews: BINGO_SKIN_PREVIEWS };
}
