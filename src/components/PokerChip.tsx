import React, { useState } from 'react';
import { PcTokenLabel } from '@/components/PcTokenLabel';

// ─── Denomination tiers ────────────────────────────────────────────────────
export const STANDARD_CHIPS   = [1, 5, 10, 25, 50, 100, 500];
export const THOUSAND_CHIPS   = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 500_000];
export const MILLION_CHIPS    = [1_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];
export const ALL_CHIP_DENOMS  = [...STANDARD_CHIPS, ...THOUSAND_CHIPS, ...MILLION_CHIPS];

type ChipTier = 'standard' | 'thousands' | 'millions' | 'ultimate';
interface CS {
  body: string; bodyL: string; bodyD: string;
  notch: string; notch2: string;
  ring: string; label: string;
  tierRing: string; tier: ChipTier;
  isUltimate?: boolean;
}

const STYLES: Record<number, CS> = {
  // ─── Standard — classic casino palette ──────────────────────────────────
  1:   { body:'#b0b0b0', bodyL:'#e8e8e8', bodyD:'#707070', notch:'#e0e0e0', notch2:'#888',   ring:'#888',    label:'#111', tierRing:'transparent', tier:'standard' },
  5:   { body:'#c0002a', bodyL:'#ff4060', bodyD:'#7a0000', notch:'#ff6080', notch2:'#900020', ring:'#ff8a80', label:'#111', tierRing:'transparent', tier:'standard' },
  10:  { body:'#1050b0', bodyL:'#4080f0', bodyD:'#002880', notch:'#6090ff', notch2:'#0030a0', ring:'#82b1ff', label:'#111', tierRing:'transparent', tier:'standard' },
  25:  { body:'#196a20', bodyL:'#40b040', bodyD:'#003810', notch:'#60d060', notch2:'#105020', ring:'#69f0ae', label:'#111', tierRing:'transparent', tier:'standard' },
  50:  { body:'#c04000', bodyL:'#ff7020', bodyD:'#801800', notch:'#ff9040', notch2:'#a03000', ring:'#ffd740', label:'#111', tierRing:'transparent', tier:'standard' },
  100: { body:'#181818', bodyL:'#383838', bodyD:'#000',    notch:'#D4AF37', notch2:'#8a7020', ring:'#D4AF37', label:'#111', tierRing:'transparent', tier:'standard' },
  500: { body:'#5a0e8a', bodyL:'#8030c0', bodyD:'#2a0048', notch:'#d870fc', notch2:'#6020a0', ring:'#e040fb', label:'#111', tierRing:'transparent', tier:'standard' },

  // ─── Thousands — distinct colors, gold tier ring ─────────────────────────
  1_000:   { body:'#6a0000', bodyL:'#a01010', bodyD:'#380000', notch:'#FFD600', notch2:'#8a5000', ring:'#FFD600', label:'#111', tierRing:'#FFD600', tier:'thousands' },
  5_000:   { body:'#a02800', bodyL:'#e05010', bodyD:'#601000', notch:'#FFEA00', notch2:'#a06000', ring:'#FFEA00', label:'#111', tierRing:'#FFB300', tier:'thousands' },
  10_000:  { body:'#3e2018', bodyL:'#6a4030', bodyD:'#180800', notch:'#FF9500', notch2:'#804000', ring:'#FFA000', label:'#111', tierRing:'#FF8F00', tier:'thousands' },
  25_000:  { body:'#1a4a6a', bodyL:'#2a7aaa', bodyD:'#0a1e30', notch:'#60C8FF', notch2:'#1060a0', ring:'#40B0FF', label:'#111', tierRing:'#0090FF', tier:'thousands' },
  50_000:  { body:'#6a6000', bodyL:'#a09020', bodyD:'#383400', notch:'#FFFFA0', notch2:'#808000', ring:'#FFF176', label:'#111', tierRing:'#F9A825', tier:'thousands' },
  100_000: { body:'#181818', bodyL:'#383838', bodyD:'#000',    notch:'#FF8000', notch2:'#a04000', ring:'#FF8F00', label:'#111', tierRing:'#FF6D00', tier:'thousands' },
  500_000: { body:'#700040', bodyL:'#a83068', bodyD:'#380018', notch:'#FFD700', notch2:'#986020', ring:'#FFD700', label:'#111', tierRing:'#FFD700', tier:'thousands' },

  // ─── Millions — distinct tones, cyan tier ring ───────────────────────────
  1_000_000:   { body:'#005048', bodyL:'#308878', bodyD:'#002028', notch:'#80FFF0', notch2:'#007060', ring:'#69F0AE', label:'#111', tierRing:'#00E5FF', tier:'millions' },
  5_000_000:   { body:'#7a0050', bodyL:'#b02080', bodyD:'#3a0020', notch:'#FF80D0', notch2:'#900060', ring:'#F06292', label:'#111', tierRing:'#E040FB', tier:'millions' },
  10_000_000:  { body:'#003070', bodyL:'#2860b0', bodyD:'#001040', notch:'#60D8FF', notch2:'#004088', ring:'#40C4FF', label:'#111', tierRing:'#0091EA', tier:'millions' },
  20_000_000:  { body:'#380070', bodyL:'#6028a8', bodyD:'#100030', notch:'#D060FF', notch2:'#600090', ring:'#E040FB', label:'#111', tierRing:'#D500F9', tier:'millions' },
  50_000_000:  { body:'#004030', bodyL:'#208070', bodyD:'#001818', notch:'#60F0B0', notch2:'#006040', ring:'#00E676', label:'#111', tierRing:'#00C853', tier:'millions' },
  100_000_000: { body:'#140800', bodyL:'#3a2000', bodyD:'#000',    notch:'#FFE060', notch2:'#906800', ring:'#FFD700', label:'#111', tierRing:'#FFD700', tier:'millions' },
  // ─── 500M — Platinum/Silver prestige chip ────────────────────────────────
  500_000_000: { body:'#1a1a2e', bodyL:'#3a3a5e', bodyD:'#000010', notch:'#E0E8FF', notch2:'#9090c0', ring:'#C0C8FF', label:'#fff', tierRing:'#B0C4DE', tier:'millions' },
  // ─── 1B — Ultimate Chip — full gold prestige ─────────────────────────────
  1_000_000_000: { body:'#1a0a00', bodyL:'#3a1a00', bodyD:'#000', notch:'#FFD700', notch2:'#D4AF37', ring:'#FFD700', label:'#111', tierRing:'#FFD700', tier:'ultimate', isUltimate: true },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
export function formatChipLabel(n: number): string {
  if (n >= 1_000_000_000) return '1B';
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return v % 1 === 0 ? `${v}M` : `${v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return v % 1 === 0 ? `${v}K` : `${v.toFixed(1)}K`;
  }
  return `${n}`;
}

function getStyle(amount: number): CS {
  if (STYLES[amount]) return STYLES[amount];
  if (amount >= 1_000_000_000) return STYLES[1_000_000_000];
  if (amount >= 1_000_000)     return STYLES[1_000_000];
  if (amount >= 1_000)         return STYLES[1_000];
  return STYLES[1];
}

// ─── SVG Chip Face ─────────────────────────────────────────────────────────
export function ChipFace({ amount, size }: { amount: number; size: number }) {
  const s   = getStyle(amount);
  const cx  = size / 2, cy = size / 2;
  const r   = size / 2 - 1.5;
  // Inner medallion radius — larger to match reference image
  const rMed = r * 0.60;
  const lbl  = formatChipLabel(amount);
  const uid  = `pc-${amount}-${size}`;

  // Font size scales with label length
  const numFS = size * (lbl.length >= 4 ? 0.155 : lbl.length === 3 ? 0.175 : 0.20);

  // 16 edge notch blocks — alternating body/notch like real casino chip
  const NOTCH_COUNT = 16;
  const notchW  = size * 0.10;
  const notchH  = r * 0.22;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block', overflow:'visible' }}>
      <defs>
        <radialGradient id={`${uid}-body`} cx="38%" cy="28%" r="72%">
          <stop offset="0%"   stopColor={s.bodyL} />
          <stop offset="55%"  stopColor={s.body} />
          <stop offset="100%" stopColor={s.bodyD} />
        </radialGradient>
        <radialGradient id={`${uid}-med`} cx="35%" cy="28%" r="70%">
          <stop offset="0%"   stopColor={s.isUltimate ? '#FFF8DC' : '#ffffff'} />
          <stop offset="60%"  stopColor={s.isUltimate ? '#FFD700' : '#e8e8e8'} />
          <stop offset="100%" stopColor={s.isUltimate ? '#B8860B' : '#cacaca'} />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* Drop shadow */}
      <circle cx={cx + 1.5} cy={cy + 2.5} r={r} fill="rgba(0,0,0,0.5)" />

      {/* Chip body */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-body)`} />

      {/* 16 edge notch blocks — alternating between notch color and darker base */}
      {Array.from({ length: NOTCH_COUNT }, (_, i) => (
        <rect
          key={i}
          x={cx - notchW / 2}
          y={1.5}
          width={notchW}
          height={notchH}
          fill={i % 2 === 0 ? s.notch : s.notch2}
          rx={1.5}
          transform={`rotate(${(i * 360) / NOTCH_COUNT}, ${cx}, ${cy})`}
          clipPath={`url(#${uid}-clip)`}
        />
      ))}

      {/* Outer rim */}
      <circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />

      {/* Tier ring just outside medallion — gold for K, cyan for M */}
      {s.tier !== 'standard' && (
        <circle cx={cx} cy={cy} r={rMed + 3.5}
          fill="none"
          stroke={s.tierRing}
          strokeWidth={2.5}
          opacity={0.85}
        />
      )}

      {/* Dashed accent ring */}
      <circle cx={cx} cy={cy} r={rMed + (s.tier !== 'standard' ? 6.5 : 3.5)}
        fill="none"
        stroke={s.ring}
        strokeWidth={0.8}
        strokeDasharray={`${size * 0.038} ${size * 0.032}`}
        opacity={0.5}
      />

      {/* Medallion background */}
      <circle cx={cx} cy={cy} r={rMed} fill={`url(#${uid}-med)`} />
      <circle cx={cx} cy={cy} r={rMed} fill="none" stroke={s.ring} strokeWidth={1.0} opacity={0.4} />

      {/* $Pc — top of medallion */}
      <text
        x={cx} y={cy - rMed * 0.44}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.10} fontWeight="900"
        fill={s.isUltimate ? '#5a3a00' : '#111'} fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="0.2"
        style={{ paintOrder: 'stroke fill', stroke: s.isUltimate ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.4)', strokeWidth: 0.8 }}
      >
        $Pc
      </text>

      {/* Amount — center */}
      <text
        x={cx} y={cy + rMed * 0.12}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={numFS} fontWeight="900"
        fill={s.isUltimate ? '#3a1a00' : '#111'} fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.5"
        style={{ paintOrder: 'stroke fill', stroke: s.isUltimate ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.5)', strokeWidth: 0.8 }}
      >
        {lbl}
      </text>

      {/* Tier bottom label */}
      {s.tier !== 'standard' && (
        <text
          x={cx} y={cy + rMed * 0.66}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={s.isUltimate ? size * 0.055 : size * 0.070} fontWeight="800"
          fill={s.tierRing} fontFamily="Arial, sans-serif" letterSpacing="1.5"
          opacity={0.9}
          style={{ paintOrder: 'stroke fill', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 0.6 }}
        >
          {s.isUltimate ? 'ULTIMATE' : s.tier === 'thousands' ? '— K —' : '— M —'}
        </text>
      )}

      {/* Highlight glare */}
      <ellipse cx={cx - r * 0.08} cy={cy - r * 0.38} rx={r * 0.36} ry={r * 0.15}
        fill="rgba(255,255,255,0.20)" />
    </svg>
  );
}

// ─── PokerChip ──────────────────────────────────────────────────────────────
interface PokerChipProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onDoubleClick?: (amount: number) => void;
  selected?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, amount: number) => void;
}

export const CHIP_PX = { sm: 44, md: 58, lg: 74 };

export function PokerChip({ amount, size = 'md', onClick, onDoubleClick, selected, className = '', draggable: isDraggable, onDragStart }: PokerChipProps) {
  const px = CHIP_PX[size];
  const inner = (
    <>
      {selected && (
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: '0 0 0 2.5px #D4AF37, 0 0 14px rgba(212,175,55,0.8)', borderRadius: '50%' }} />
      )}
      <ChipFace amount={amount} size={px} />
    </>
  );

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('chip-amount', String(amount));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(e, amount);
  };

  const baseStyle: React.CSSProperties = { width: px, height: px, background: 'none', border: 'none', padding: 0 };
  const baseClass = `relative inline-flex items-center justify-center transition-all duration-200 ${selected ? 'scale-110 -translate-y-1' : ''} ${className}`;

  const handleDblClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onDoubleClick?.(amount);
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        onDoubleClick={onDoubleClick ? handleDblClick : undefined}
        draggable={isDraggable}
        onDragStart={isDraggable ? handleDragStart : undefined}
        className={`${baseClass} cursor-pointer hover:scale-110 hover:-translate-y-1.5 active:scale-95`}
        style={baseStyle}
      >
        {inner}
      </button>
    );
  }
  return (
    <div
      className={`${baseClass} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      style={baseStyle}
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDoubleClick={onDoubleClick ? handleDblClick : undefined}
    >
      {inner}
    </div>
  );
}

// ─── ChipSelector ───────────────────────────────────────────────────────────
type SelectorTab = 'standard' | 'thousands' | 'millions' | 'all';

interface ChipSelectorProps {
  selectedChip: number;
  onSelect: (amount: number) => void;
  onDoubleClick?: (amount: number) => void;
  balance?: number;
  compact?: boolean;
}

export function ChipSelector({ selectedChip, onSelect, onDoubleClick, balance, compact }: ChipSelectorProps) {
  const initTab = (): SelectorTab => {
    if (selectedChip >= 1_000_000) return 'millions';
    if (selectedChip >= 1_000) return 'thousands';
    return 'standard';
  };
  const [tab, setTab] = useState<SelectorTab>(initTab);
  const [showAll, setShowAll] = useState(false);
  const [customRaw, setCustomRaw] = useState('');

  const isHighStakes = balance !== undefined && balance >= 5_000;

  const chipsForTab = () => {
    if (tab === 'standard') return STANDARD_CHIPS;
    if (tab === 'thousands') return THOUSAND_CHIPS;
    if (tab === 'millions') return MILLION_CHIPS;
    return ALL_CHIP_DENOMS;
  };
  const chips = showAll ? ALL_CHIP_DENOMS : chipsForTab();
  const chipSize = compact ? 'sm' : 'md';

  const TAB_STYLES = (active: boolean, tier: SelectorTab) => {
    const color = tier === 'millions' ? '#00BCD4' : tier === 'thousands' ? '#FF8F00' : '#D4AF37';
    return {
      padding: compact ? '3px 8px' : '4px 11px',
      borderRadius: 20,
      border: active ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,0.10)',
      background: active ? `rgba(${tier === 'millions' ? '0,188,212' : tier === 'thousands' ? '255,143,0' : '212,175,55'},0.15)` : 'rgba(255,255,255,0.04)',
      color: active ? color : '#555',
      fontSize: compact ? 9 : 10,
      fontWeight: 700,
      cursor: 'pointer',
      letterSpacing: '0.5px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties;
  };

  const handleCustom = () => {
    const v = parseInt(customRaw.replace(/[^0-9]/g, ''), 10);
    if (v && v > 0) {
      onSelect(v);
      setCustomRaw('');
      if (v >= 1_000_000) setTab('millions');
      else if (v >= 1_000) setTab('thousands');
      else setTab('standard');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 5 : 7, alignItems: 'center' }}>

      {/* Top bar: tier tabs + show-all toggle */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!showAll && (
          <>
            <button style={TAB_STYLES(tab === 'standard', 'standard')} onClick={() => setTab('standard')}>
              1–500
            </button>
            <button style={TAB_STYLES(tab === 'thousands', 'thousands')} onClick={() => setTab('thousands')}>
              {isHighStakes ? '⚡ 1K–500K' : '1K–500K'}
            </button>
            <button style={TAB_STYLES(tab === 'millions', 'millions')} onClick={() => setTab('millions')}>
              1M–1B ★
            </button>
          </>
        )}
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            padding: compact ? '3px 8px' : '4px 10px',
            borderRadius: 20,
            border: showAll ? '1.5px solid #aaa' : '1.5px solid rgba(255,255,255,0.10)',
            background: showAll ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
            color: showAll ? '#ddd' : '#555',
            fontSize: compact ? 9 : 10,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.5px',
            transition: 'all 0.15s',
          }}
        >
          {showAll ? '▴ COLLAPSE' : '▾ SHOW ALL'}
        </button>
      </div>

      {/* Section headers when showing all */}
      {showAll ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6, alignItems: 'center' }}>
          {/* Standard */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>STANDARD</div>
            <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {STANDARD_CHIPS.map(amt => (
                <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} onDoubleClick={onDoubleClick} draggable />
              ))}
            </div>
          </div>
          {/* Thousands */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 9, color: '#FF8F00', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>THOUSANDS ⸻ K</div>
            <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {THOUSAND_CHIPS.map(amt => (
                <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} onDoubleClick={onDoubleClick} draggable />
              ))}
            </div>
          </div>
          {/* Millions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 9, color: '#00BCD4', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>MILLIONS ⸻ M</div>
            <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {MILLION_CHIPS.map(amt => (
                <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} onDoubleClick={onDoubleClick} draggable />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {chips.map(amt => (
            <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} onDoubleClick={onDoubleClick} draggable />
          ))}
        </div>
      )}

      {/* Custom amount */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Custom $Pc…"
          value={customRaw}
          onChange={e => setCustomRaw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustom()}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 8,
            color: '#D4AF37',
            fontSize: 12,
            padding: compact ? '4px 8px' : '5px 10px',
            width: 110,
            outline: 'none',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={handleCustom}
          style={{
            background: 'rgba(212,175,55,0.18)',
            border: '1px solid rgba(212,175,55,0.5)',
            borderRadius: 8,
            color: '#D4AF37',
            fontSize: 11,
            fontWeight: 700,
            padding: compact ? '4px 10px' : '5px 12px',
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          USE
        </button>
      </div>
    </div>
  );
}

// ─── CasinoChipTray ─────────────────────────────────────────────────────────
// Realistic casino chip tray with all different colored chip stacks visible
export function CasinoChipTray({ style, className = '' }: { style?: React.CSSProperties; className?: string }) {
  const chipCols = [
    { main: '#d0d0d0', stripe: '#ffffff', label: '$1' },
    { main: '#c0002a', stripe: '#ff4060', label: '$5' },
    { main: '#1050b0', stripe: '#4080f0', label: '$10' },
    { main: '#196a20', stripe: '#40b040', label: '$25' },
    { main: '#c04000', stripe: '#ff7020', label: '$50' },
    { main: '#222222', stripe: '#D4AF37', label: '$100' },
    { main: '#5a0e8a', stripe: '#d870fc', label: '$500' },
    { main: '#8B0000', stripe: '#FFD700', label: '$1K' },
  ];
  const CHIPS = 11;
  const colW = 20;
  const colGap = 3;
  const chipH = 5;
  const padX = 8;
  const padY = 6;
  const trayW = chipCols.length * (colW + colGap) - colGap + padX * 2;
  const stackH = CHIPS * chipH;
  const trayH = stackH + padY * 2 + 6;
  const totalH = trayH + 14;

  return (
    <div className={className} style={style}>
      <svg width={trayW} height={totalH} viewBox={`0 0 ${trayW} ${totalH}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ct-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1f0e" />
            <stop offset="100%" stopColor="#0d0a04" />
          </linearGradient>
        </defs>
        {/* Label above tray */}
        <text x={trayW / 2} y={9} textAnchor="middle" fontSize={7}
          fill="#D4AF37" fontWeight="800" letterSpacing="2" fontFamily="Arial, sans-serif">
          CHIP TRAY
        </text>
        {/* Outer tray body */}
        <rect x={0} y={12} width={trayW} height={trayH} rx={5}
          fill="url(#ct-body)" stroke="#D4AF37" strokeWidth={1.4} />
        {/* Inner dark base */}
        <rect x={3} y={15} width={trayW - 6} height={trayH - 6} rx={3}
          fill="#050400" />
        {/* Chip columns */}
        {chipCols.map((col, ci) => {
          const x = padX + ci * (colW + colGap);
          const bottomY = 12 + padY + stackH + 4;
          return (
            <g key={ci}>
              {/* Column slot */}
              <rect x={x - 1} y={18} width={colW + 2} height={stackH + 4} rx={2} fill="rgba(0,0,0,0.35)" />
              {/* Stacked chips — bottom to top */}
              {Array.from({ length: CHIPS }, (_, i) => {
                const cy = bottomY - i * chipH;
                return (
                  <g key={i}>
                    <ellipse cx={x + colW / 2} cy={cy} rx={colW / 2 - 0.5} ry={chipH * 0.44}
                      fill={col.main} stroke="rgba(0,0,0,0.55)" strokeWidth={0.5} />
                    <ellipse cx={x + colW / 2} cy={cy} rx={colW / 2 - 0.5} ry={chipH * 0.15}
                      fill={col.stripe} opacity={0.65} />
                  </g>
                );
              })}
              {/* Top chip face (circle from above) */}
              <ellipse
                cx={x + colW / 2}
                cy={bottomY - CHIPS * chipH - chipH * 0.44}
                rx={colW / 2 - 0.5}
                ry={colW / 2 - 0.5}
                fill={col.main} stroke={col.stripe} strokeWidth={1.3}
              />
              <ellipse
                cx={x + colW / 2}
                cy={bottomY - CHIPS * chipH - chipH * 0.44}
                rx={colW / 2 * 0.5}
                ry={colW / 2 * 0.5}
                fill="rgba(255,255,255,0.18)"
              />
            </g>
          );
        })}
        {/* Gold border shine */}
        <rect x={0} y={12} width={trayW} height={trayH} rx={5}
          fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth={0.5} />
      </svg>
    </div>
  );
}

// ─── ChipStack ──────────────────────────────────────────────────────────────
interface ChipStackProps {
  amount: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ChipStack({ amount, count = 1, size = 'md' }: ChipStackProps) {
  const stackCount = Math.min(count, 6);
  const px = CHIP_PX[size];
  return (
    <div className="relative" style={{ paddingBottom: `${stackCount * 4}px`, width: px, height: px + stackCount * 4 }}>
      {Array.from({ length: stackCount }).map((_, i) => (
        <div key={i} className="absolute" style={{ bottom: i * 5, left: 0, zIndex: stackCount - i }}>
          <PokerChip amount={amount} size={size} />
        </div>
      ))}
      {count > 6 && (
        <div className="absolute left-1/2 -translate-x-1/2 text-[#D4AF37] font-bold whitespace-nowrap"
          style={{ bottom: -4, fontSize: 9, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          x{count}
        </div>
      )}
    </div>
  );
}

// ─── BetArea ────────────────────────────────────────────────────────────────
interface BetAreaProps {
  label: string;
  chips: { amount: number; count: number }[];
  onClick?: () => void;
  isActive?: boolean;
  totalAmount: number;
}

export function BetArea({ label, chips, onClick, isActive, totalAmount }: BetAreaProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 transition-all ${isActive ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'border-[#5D4037]/50 bg-black/40 hover:border-[#D4AF37]/30'}`}
    >
      <div className="text-[#C0C0C0] text-xs mb-2 tracking-wider uppercase">{label}</div>
      <div className="flex flex-wrap gap-1 justify-center min-h-[60px]">
        {chips.length > 0 ? (
          chips.map((chip, i) => <div key={i} className="relative"><ChipStack amount={chip.amount} count={chip.count} size="sm" /></div>)
        ) : (
          <div className="text-gray-600 text-xs italic">Click to bet</div>
        )}
      </div>
      {totalAmount > 0 && (
        <div className="mt-2 font-bold text-sm"><PcTokenLabel amount={formatChipLabel(totalAmount)} /></div>
      )}
    </button>
  );
}

// ─── DealerVegasProps ────────────────────────────────────────────────────────
// Renders a Vegas-style dealer side: chip tray + dice + card shoe + card fan
// Place this on the dealer's side of any chip-based game table

interface DealerVegasPropsProps {
  className?: string;
  style?: React.CSSProperties;
}

export function DealerVegasProps({ className = '', style }: DealerVegasPropsProps) {
  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      style={{ userSelect: 'none', ...style }}
    >
      {/* Chip Tray */}
      <ChipTrayIcon />
      {/* Card Shoe */}
      <CardShoeIcon />
      {/* Dice Pair */}
      <DicePairIcon />
      {/* Card Fan */}
      <CardFanIcon />
    </div>
  );
}

// Individual prop SVG components

function ChipTrayIcon() {
  // A rectangular casino chip tray with 5 columns of stacked chips
  const cols = [
    { color: '#c0002a', notch: '#ff6080' }, // red $5
    { color: '#1050b0', notch: '#6090ff' }, // blue $10
    { color: '#196a20', notch: '#40b040' }, // green $25
    { color: '#181818', notch: '#D4AF37' }, // black $100
    { color: '#5a0e8a', notch: '#d870fc' }, // purple $500
  ];
  const trayW = 90, trayH = 52;
  const colW  = 14, chipH = 5;
  const stackH = 32;
  const startX = 8;

  return (
    <svg width={trayW} height={trayH + 12} viewBox={`0 0 ${trayW} ${trayH + 12}`} style={{ display: 'block' }}>
      {/* Tray body */}
      <rect x={1} y={12} width={trayW - 2} height={trayH} rx={5}
        fill="url(#tray-grad)" stroke="#D4AF37" strokeWidth={1.2} />
      <defs>
        <linearGradient id="tray-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2010" />
          <stop offset="100%" stopColor="#0a0800" />
        </linearGradient>
      </defs>
      {/* Tray felt base */}
      <rect x={6} y={trayH - 4} width={trayW - 12} height={14} rx={3}
        fill="#1a4a1a" />

      {/* Chip columns */}
      {cols.map((col, ci) => {
        const x = startX + ci * (colW + 3);
        const chips = 6;
        return (
          <g key={ci}>
            {Array.from({ length: chips }, (_, i) => (
              <g key={i}>
                {/* Chip body */}
                <ellipse cx={x + colW / 2} cy={trayH - 8 - i * chipH} rx={colW / 2 - 0.5} ry={chipH * 0.45}
                  fill={col.color} stroke="rgba(0,0,0,0.4)" strokeWidth={0.5} />
                {/* Notch stripe */}
                <ellipse cx={x + colW / 2} cy={trayH - 8 - i * chipH} rx={colW / 2 - 0.5} ry={chipH * 0.18}
                  fill={col.notch} opacity={0.6} />
              </g>
            ))}
          </g>
        );
      })}

      {/* Tray label */}
      <text x={trayW / 2} y={9} textAnchor="middle" fontSize={6} fill="#D4AF37" fontWeight="700" letterSpacing="1" fontFamily="Arial, sans-serif">
        CHIP TRAY
      </text>
      {/* Gold border highlight */}
      <rect x={1} y={12} width={trayW - 2} height={trayH} rx={5}
        fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth={0.5} />
    </svg>
  );
}

function CardShoeIcon() {
  return (
    <svg width={36} height={52} viewBox="0 0 36 52" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="shoe-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2010" />
          <stop offset="100%" stopColor="#0a0808" />
        </linearGradient>
      </defs>
      {/* Shoe body */}
      <rect x={2} y={2} width={32} height={44} rx={4}
        fill="url(#shoe-grad)" stroke="#D4AF37" strokeWidth={1} />
      {/* Card slot opening */}
      <rect x={5} y={6} width={26} height={36} rx={2}
        fill="#000820" stroke="rgba(192,192,192,0.2)" strokeWidth={0.5} />
      {/* Card stacks inside */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={6} y={8 + i * 8} width={24} height={6} rx={1}
          fill={i % 2 === 0 ? '#e8e8e8' : '#f4f4f4'}
          stroke="rgba(0,0,0,0.3)" strokeWidth={0.3} />
      ))}
      {/* Label */}
      <text x={18} y={50} textAnchor="middle" fontSize={6} fill="#D4AF37" fontWeight="700" fontFamily="Arial, sans-serif">SHOE</text>
    </svg>
  );
}

function DicePairIcon() {
  function Die({ x, y, value, size = 22 }: { x: number; y: number; value: number; size?: number }) {
    const r = 3;
    const dotPositions: Record<number, [number, number][]> = {
      1: [[0, 0]],
      2: [[-1, -1], [1, 1]],
      3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    };
    const cx = x + size / 2, cy = y + size / 2;
    const spread = size * 0.26;
    return (
      <g>
        <defs>
          <linearGradient id={`die-${value}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8f8f8" />
            <stop offset="100%" stopColor="#d0d0d0" />
          </linearGradient>
        </defs>
        <rect x={x} y={y} width={size} height={size} rx={r}
          fill={`url(#die-${value}-g)`} stroke="#999" strokeWidth={0.8}
          style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.5))' }}
        />
        {(dotPositions[value] || []).map(([dx, dy], i) => (
          <circle key={i}
            cx={cx + dx * spread} cy={cy + dy * spread}
            r={size * 0.075}
            fill="#c00010"
          />
        ))}
      </g>
    );
  }
  return (
    <svg width={52} height={28} viewBox="0 0 52 28" style={{ display: 'block' }}>
      <Die x={2} y={3} value={6} />
      <Die x={28} y={3} value={5} />
    </svg>
  );
}

function CardFanIcon() {
  const suits = ['♠', '♥', '♦', '♣'];
  const colors = ['#e8e8e8', '#fff', '#f4f4f4', '#efefef'];
  const rotations = [-25, -10, 5, 20];
  const W = 44, H = 62;
  const cx = 22, cy = 58;
  return (
    <svg width={W + 10} height={H - 10} viewBox={`0 0 ${W + 10} ${H - 10}`} style={{ display: 'block', overflow: 'visible' }}>
      {rotations.map((rot, i) => (
        <g key={i} transform={`rotate(${rot}, ${cx}, ${cy})`}>
          <rect x={cx - 9} y={cy - 50} width={18} height={28} rx={2}
            fill={colors[i]} stroke="#aaa" strokeWidth={0.6} />
          <text
            x={cx} y={cy - 36}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="bold"
            fill={suits[i] === '♥' || suits[i] === '♦' ? '#c00' : '#111'}
          >
            {suits[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
