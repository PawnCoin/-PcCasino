export interface DominoSkinDef {
  name: string;
  bg: string;
  pip: string;
  border: string;
  divider: string;
  faceDownBg: string;
  gloss?: boolean;
  glow?: string;
}

export const DOMINO_SKINS: Record<string, DominoSkinDef> = {
  ivory:       { name: 'Classic Ivory',    bg: '#F2EDD7', pip: '#111', border: '#B8A880', divider: '#C0A878',
                 faceDownBg: 'repeating-linear-gradient(45deg,#D4C8A0 0,#D4C8A0 5px,#B8A870 5px,#B8A870 10px)' },
  black:       { name: 'Obsidian',          bg: '#1C1C1C', pip: '#E8E8E8', border: '#555', divider: '#444',
                 faceDownBg: 'repeating-linear-gradient(45deg,#2e2e2e 0,#2e2e2e 5px,#0f0f0f 5px,#0f0f0f 10px)' },
  neon:        { name: 'Neon Cyber',        bg: '#080818', pip: '#00FFEE', border: '#FF00CC', divider: '#FF00CC',
                 faceDownBg: 'repeating-linear-gradient(45deg,#FF00CC 0,#FF00CC 1px,#080818 1px,#080818 7px)',
                 glow: 'rgba(255,0,204,0.7)' },
  gold:        { name: 'Vegas Gold',        bg: '#120E00', pip: '#FFD700', border: '#8B6914', divider: '#8B6914',
                 faceDownBg: 'repeating-linear-gradient(45deg,#8B6914 0,#8B6914 4px,#120E00 4px,#120E00 9px)',
                 glow: 'rgba(255,215,0,0.45)' },
  shinyGold:   { name: 'Shiny Gold',
                 bg: 'linear-gradient(145deg,#ffe066 0%,#d4a000 30%,#ffe680 55%,#b8860b 80%,#ffd700 100%)',
                 pip: '#1a0800', border: '#C8930A', divider: '#9A6800',
                 faceDownBg: 'linear-gradient(145deg,#7A5000 0%,#C8930A 40%,#F0C040 65%,#9A6800 100%)',
                 gloss: true, glow: 'rgba(255,210,0,0.65)' },
  silver:      { name: 'Sterling Silver',
                 bg: 'linear-gradient(145deg,#b0b0b0 0%,#e8e8e8 35%,#a0a0a0 60%,#d8d8d8 100%)',
                 pip: '#222', border: '#888', divider: '#6a6a6a',
                 faceDownBg: 'linear-gradient(145deg,#686868 0%,#b8b8b8 40%,#eaeaea 65%,#808080 100%)',
                 gloss: true, glow: 'rgba(180,180,180,0.4)' },
  platinum:    { name: 'Platinum',
                 bg: 'linear-gradient(145deg,#d4d4e8 0%,#ffffff 40%,#c8c8e0 65%,#eeeeff 100%)',
                 pip: '#333', border: '#AAAACC', divider: '#9090B8',
                 faceDownBg: 'linear-gradient(145deg,#9090B8 0%,#d0d0f0 40%,#ffffff 65%,#a0a0c8 100%)',
                 gloss: true, glow: 'rgba(180,180,255,0.5)' },
  water:       { name: 'Ocean Water',
                 bg: 'linear-gradient(145deg,rgba(0,90,170,0.92) 0%,rgba(0,160,240,0.88) 45%,rgba(0,200,255,0.85) 70%,rgba(0,100,180,0.92) 100%)',
                 pip: '#e0f8ff', border: 'rgba(0,200,255,0.7)', divider: 'rgba(80,220,255,0.6)',
                 faceDownBg: 'linear-gradient(180deg,#002244 0%,#004488 35%,#0066AA 60%,#002244 100%)',
                 gloss: true, glow: 'rgba(0,160,255,0.6)' },
  glass:       { name: 'Frosted Glass',
                 bg: 'rgba(255,255,255,0.10)', pip: 'rgba(255,255,255,0.95)',
                 border: 'rgba(255,255,255,0.30)', divider: 'rgba(255,255,255,0.22)',
                 faceDownBg: 'rgba(120,140,200,0.45)',
                 gloss: true, glow: 'rgba(255,255,255,0.25)' },
  roseGold:    { name: 'Rose Gold',
                 bg: 'linear-gradient(145deg,#c97b5a 0%,#e8a87c 30%,#d4886a 60%,#b86a50 100%)',
                 pip: '#fff8f5', border: '#C07050', divider: '#9E5A3A',
                 faceDownBg: 'linear-gradient(145deg,#6A2A18 0%,#B06040 40%,#E09070 65%,#7A3020 100%)',
                 gloss: true, glow: 'rgba(220,120,90,0.5)' },
  emerald:     { name: 'Emerald',
                 bg: 'linear-gradient(145deg,#0a3d22 0%,#1e7a44 35%,#0d5a30 65%,#0a3d22 100%)',
                 pip: '#a0ffd0', border: '#0D7A47', divider: '#085530',
                 faceDownBg: 'linear-gradient(145deg,#021408 0%,#083520 40%,#0D5A30 65%,#021408 100%)',
                 gloss: true, glow: 'rgba(20,180,90,0.6)' },
  crystal:     { name: 'Crystal Blue',
                 bg: 'linear-gradient(145deg,rgba(80,130,230,0.55) 0%,rgba(160,210,255,0.65) 45%,rgba(60,110,220,0.55) 100%)',
                 pip: '#ffffff', border: 'rgba(100,180,255,0.8)', divider: 'rgba(80,150,255,0.6)',
                 faceDownBg: 'linear-gradient(145deg,rgba(20,50,140,0.9) 0%,rgba(60,120,220,0.85) 50%,rgba(20,50,140,0.9) 100%)',
                 gloss: true, glow: 'rgba(80,160,255,0.7)' },
  obsidianFire:{ name: 'Obsidian Fire',
                 bg: 'linear-gradient(145deg,#0a0000 0%,#1a0505 50%,#0a0000 100%)',
                 pip: '#FF4500', border: '#CC2200', divider: '#881100',
                 faceDownBg: 'linear-gradient(145deg,#050000 0%,#1A0800 40%,#2A0000 60%,#050000 100%)',
                 glow: 'rgba(255,69,0,0.7)' },
};

export type SkinKey = keyof typeof DOMINO_SKINS;
