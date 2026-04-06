import React from 'react';

export interface AvatarDef {
  sheet: 1 | 2;
  row: number;
  col: number;
  name: string;
}

const SHEET_URLS: Record<1 | 2, string> = {
  1: '/avatars/sheet1.png',
  2: '/avatars/sheet2.png',
};

const COLS = 4;
const ROWS = 6;

export function getAvatarStyle(avatar: AvatarDef, sizePx: number): React.CSSProperties {
  const colPct = avatar.col === 0 ? 0 : (avatar.col / (COLS - 1)) * 100;
  const rowPct = avatar.row === 0 ? 0 : (avatar.row / (ROWS - 1)) * 100;
  return {
    backgroundImage: `url(${SHEET_URLS[avatar.sheet]})`,
    backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
    backgroundPosition: `${colPct}% ${rowPct}%`,
    backgroundRepeat: 'no-repeat',
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    borderRadius: '50%',
    flexShrink: 0,
  };
}

interface AvatarSpriteProps {
  avatar: AvatarDef;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
}

export function AvatarSprite({ avatar, size = 48, className = '', style = {}, active = false }: AvatarSpriteProps) {
  if (!avatar) return <div className={className} style={{ width: size, height: size, borderRadius: '50%', background: '#333', flexShrink: 0, ...style }} />;
  return (
    <div
      className={className}
      style={{
        ...getAvatarStyle(avatar, size),
        boxShadow: active
          ? '0 0 0 3px #D4AF37, 0 0 12px rgba(212,175,55,0.5)'
          : '0 0 0 2px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.5)',
        ...style,
      }}
    />
  );
}

export const ALL_AVATARS: AvatarDef[] = (() => {
  const list: AvatarDef[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      list.push({ sheet: 1, row, col, name: `Character ${row * COLS + col + 1}` });
      list.push({ sheet: 2, row, col, name: `Character ${row * COLS + col + 25}` });
    }
  }
  return list;
})();

export const SPADES_AVATARS: AvatarDef[] = [
  { sheet: 1, row: 0, col: 0, name: 'Old Pro' },
  { sheet: 2, row: 0, col: 1, name: 'Officer' },
  { sheet: 1, row: 1, col: 1, name: 'Doc' },
  { sheet: 2, row: 1, col: 3, name: 'Champ' },
];

// ─── Dealer Avatar System ────────────────────────────────────────────────────
// Dealer sprite sheet: /avatars/dealers.png — 4 cols × 5 rows = 20 dealer portraits
// EXCLUSIVELY used for dealer seats — never for player seats
// Sheet dimensions: 1024 × 1536 px → each cell is 256 × 307.2 px

const DEALER_COLS = 4;
const DEALER_ROWS = 5;
const DEALER_SHEET_W = 1024;
const DEALER_SHEET_H = 1536;
const DEALER_CELL_W = DEALER_SHEET_W / DEALER_COLS; // 256
const DEALER_CELL_H = DEALER_SHEET_H / DEALER_ROWS; // 307.2

export interface DealerAvatarDef {
  row: number; // 0–4
  col: number; // 0–3
}

export function getDealerAvatarStyle(avatar: DealerAvatarDef, widthPx: number): React.CSSProperties {
  const displayW = widthPx;
  const displayH = Math.round(widthPx * DEALER_CELL_H / DEALER_CELL_W);
  const bgW = displayW * DEALER_COLS;
  const bgH = displayH * DEALER_ROWS;
  const posX = avatar.col * displayW;
  const posY = avatar.row * displayH;
  return {
    backgroundImage: 'url(/avatars/dealers.png)',
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `-${posX}px -${posY}px`,
    backgroundRepeat: 'no-repeat',
    width: `${displayW}px`,
    height: `${displayH}px`,
    flexShrink: 0,
  };
}

interface DealerAvatarSpriteProps {
  avatar: DealerAvatarDef;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function DealerAvatarSprite({ avatar, size = 48, className = '', style = {} }: DealerAvatarSpriteProps) {
  const baseStyle = getDealerAvatarStyle(avatar, size);
  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        ...style,
      }}
    />
  );
}

// All 20 dealer avatar positions (row 0–4, col 0–3)
export const ALL_DEALER_AVATARS: DealerAvatarDef[] = (() => {
  const list: DealerAvatarDef[] = [];
  for (let row = 0; row < DEALER_ROWS; row++) {
    for (let col = 0; col < DEALER_COLS; col++) {
      list.push({ row, col });
    }
  }
  return list;
})();
