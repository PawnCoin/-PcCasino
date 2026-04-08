import { useState, useEffect } from 'react';
import { DOMINO_SKINS } from '@/data/dominoSkins';
import type { DominoSkinDef, SkinKey } from '@/data/dominoSkins';

export { DOMINO_SKINS };
export type { DominoSkinDef, SkinKey };

const DOMINO_SKIN_CHANGE_EVENT = 'pcasino_domino_skin_change';
const STORAGE_KEY = 'pcasino_domino_skin';

export function getDefaultDominoSkin(): DominoSkinDef {
  const stored = localStorage.getItem(STORAGE_KEY) as SkinKey | null;
  return (stored && DOMINO_SKINS[stored]) ? DOMINO_SKINS[stored] : DOMINO_SKINS.ivory;
}

export function getDefaultDominoSkinKey(): SkinKey {
  const stored = localStorage.getItem(STORAGE_KEY) as SkinKey | null;
  return (stored && DOMINO_SKINS[stored]) ? stored : 'ivory';
}

export function useDominoSkin() {
  const [activeSkinKey, setActiveSkinKey] = useState<SkinKey>(getDefaultDominoSkinKey);

  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<SkinKey>).detail;
      if (DOMINO_SKINS[key]) setActiveSkinKey(key);
    };
    window.addEventListener(DOMINO_SKIN_CHANGE_EVENT, handler);
    return () => window.removeEventListener(DOMINO_SKIN_CHANGE_EVENT, handler);
  }, []);

  const selectSkin = (key: SkinKey) => {
    localStorage.setItem(STORAGE_KEY, key);
    window.dispatchEvent(new CustomEvent(DOMINO_SKIN_CHANGE_EVENT, { detail: key }));
  };

  return {
    activeSkinKey,
    activeSkin: DOMINO_SKINS[activeSkinKey],
    selectSkin,
    DOMINO_SKINS,
  };
}
