import { useState, useEffect, useCallback } from 'react';

export interface TableSkinDef {
  id: string;
  name: string;
  felt: string;
  border: string;
  line: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const TABLE_SKINS: TableSkinDef[] = [
  { id: 'wood',    name: 'Mahogany',    felt: '#2B4A1A', border: '#5D3A1A', line: '#3A6025', rarity: 'common' },
  { id: 'marble',  name: 'Marble',      felt: '#253545', border: '#7090B0', line: '#4A70A0', rarity: 'rare' },
  { id: 'neon',    name: 'Neon Grid',   felt: '#080018', border: '#3300CC', line: '#5500FF', rarity: 'epic' },
  { id: 'glass',   name: 'Glass',       felt: 'rgba(20,60,100,0.55)', border: 'rgba(80,180,255,0.45)', line: 'rgba(100,200,255,0.25)', rarity: 'rare' },
  { id: 'velvet',  name: 'Red Velvet',  felt: '#3D0A0A', border: '#8B1A1A', line: '#6B1010', rarity: 'common' },
  { id: 'ocean',   name: 'Deep Ocean',  felt: '#0A1F3A', border: '#1A4A8A', line: '#1A3A6A', rarity: 'rare' },
  { id: 'emerald', name: 'Emerald',     felt: '#062A14', border: '#1A6A3A', line: '#0A4A2A', rarity: 'epic' },
  { id: 'gold',    name: 'Gold Luxury', felt: '#100A00', border: '#8B6914', line: '#6B4900', rarity: 'legendary' },
  { id: 'midnight',name: 'Midnight Sky',felt: '#050510', border: '#1A1A5A', line: '#0A0A3A', rarity: 'epic' },
  { id: 'slate',   name: 'Dark Slate',  felt: '#14141E', border: '#3A3A5A', line: '#222240', rarity: 'common' },
];

const STORAGE_KEY = 'pcasino_table_skin';
const TABLE_SKIN_CHANGE_EVENT = 'pcasino_table_skin_change';

export function getDefaultTableSkin(): TableSkinDef {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = TABLE_SKINS.find(s => s.id === stored);
      if (found) return found;
    }
  } catch {}
  return TABLE_SKINS[0];
}

export function useTableSkin() {
  const [activeSkin, setActiveSkin] = useState<TableSkinDef>(getDefaultTableSkin);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = TABLE_SKINS.find(s => s.id === id);
      if (found) setActiveSkin(found);
    };
    window.addEventListener(TABLE_SKIN_CHANGE_EVENT, handler);
    return () => window.removeEventListener(TABLE_SKIN_CHANGE_EVENT, handler);
  }, []);

  const selectSkin = useCallback((id: string) => {
    const found = TABLE_SKINS.find(s => s.id === id);
    if (!found) return;
    setActiveSkin(found);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(TABLE_SKIN_CHANGE_EVENT, { detail: id }));
  }, []);

  return { activeSkin, selectSkin, allSkins: TABLE_SKINS };
}
