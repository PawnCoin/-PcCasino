import React, { useState } from 'react';

// ─── Denomination tiers ────────────────────────────────────────────────────
export const STANDARD_CHIPS   = [1, 5, 10, 25, 50, 100, 500];
export const THOUSAND_CHIPS   = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 500_000];
export const MILLION_CHIPS    = [1_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000];
export const ALL_CHIP_DENOMS  = [...STANDARD_CHIPS, ...THOUSAND_CHIPS, ...MILLION_CHIPS];

type ChipTier = 'standard' | 'thousands' | 'millions';
interface CS {
  body: string; bodyL: string; bodyD: string;
  notch: string; notch2: string;
  ring: string; star: string; label: string;
  tierRing: string; tier: ChipTier;
}

const STYLES: Record<number, CS> = {
  // ─── Standard — classic casino palette ──────────────────────────────────
  1:   { body:'#b0b0b0', bodyL:'#e8e8e8', bodyD:'#707070', notch:'#e0e0e0', notch2:'#888', ring:'#888', star:'#aaa', label:'#222', tierRing:'transparent', tier:'standard' },
  5:   { body:'#c0002a', bodyL:'#ff4060', bodyD:'#7a0000', notch:'#ff6080', notch2:'#900020', ring:'#ff8a80', star:'#e57373', label:'#fff', tierRing:'transparent', tier:'standard' },
  10:  { body:'#1050b0', bodyL:'#4080f0', bodyD:'#002880', notch:'#6090ff', notch2:'#0030a0', ring:'#82b1ff', star:'#90caf9', label:'#fff', tierRing:'transparent', tier:'standard' },
  25:  { body:'#196a20', bodyL:'#40b040', bodyD:'#003810', notch:'#60d060', notch2:'#105020', ring:'#69f0ae', star:'#a5d6a7', label:'#fff', tierRing:'transparent', tier:'standard' },
  50:  { body:'#c04000', bodyL:'#ff7020', bodyD:'#801800', notch:'#ff9040', notch2:'#a03000', ring:'#ffd740', star:'#ffb74d', label:'#fff', tierRing:'transparent', tier:'standard' },
  100: { body:'#181818', bodyL:'#383838', bodyD:'#000', notch:'#D4AF37', notch2:'#8a7020', ring:'#D4AF37', star:'#c9a227', label:'#D4AF37', tierRing:'transparent', tier:'standard' },
  500: { body:'#5a0e8a', bodyL:'#8030c0', bodyD:'#2a0048', notch:'#d870fc', notch2:'#6020a0', ring:'#e040fb', star:'#ce93d8', label:'#fff', tierRing:'transparent', tier:'standard' },

  // ─── Thousands — warm amber/copper/gold — gold tier ring ────────────────
  1_000:   { body:'#6a0000', bodyL:'#a01010', bodyD:'#380000', notch:'#FFD600', notch2:'#8a5000', ring:'#FFD600', star:'#FFAB40', label:'#FFD600', tierRing:'#FFD600', tier:'thousands' },
  5_000:   { body:'#a02800', bodyL:'#e05010', bodyD:'#601000', notch:'#FFEA00', notch2:'#a06000', ring:'#FFEA00', star:'#FFD740', label:'#fff', tierRing:'#FFB300', tier:'thousands' },
  10_000:  { body:'#3e2018', bodyL:'#6a4030', bodyD:'#180800', notch:'#FF9500', notch2:'#804000', ring:'#FFA000', star:'#FFB300', label:'#fff', tierRing:'#FF8F00', tier:'thousands' },
  25_000:  { body:'#4a2c1a', bodyL:'#7a5040', bodyD:'#280c00', notch:'#FFD060', notch2:'#906020', ring:'#FFCA28', star:'#FFB300', label:'#fff', tierRing:'#FFC400', tier:'thousands' },
  50_000:  { body:'#6a6000', bodyL:'#a09020', bodyD:'#383400', notch:'#FFFFA0', notch2:'#808000', ring:'#FFF176', star:'#F9A825', label:'#1a1a1a', tierRing:'#F9A825', tier:'thousands' },
  100_000: { body:'#181818', bodyL:'#383838', bodyD:'#000', notch:'#FF8000', notch2:'#a04000', ring:'#FF8F00', star:'#FFA000', label:'#FF8F00', tierRing:'#FF6D00', tier:'thousands' },
  500_000: { body:'#700040', bodyL:'#a83068', bodyD:'#380018', notch:'#FFD700', notch2:'#986020', ring:'#FFD700', star:'#FDD835', label:'#fff', tierRing:'#FFD700', tier:'thousands' },

  // ─── Millions — cool teal/cyan/platinum — cyan tier ring ────────────────
  1_000_000:   { body:'#005048', bodyL:'#308878', bodyD:'#002028', notch:'#80FFF0', notch2:'#007060', ring:'#69F0AE', star:'#4DD0E1', label:'#E0FFF8', tierRing:'#00E5FF', tier:'millions' },
  5_000_000:   { body:'#003838', bodyL:'#206858', bodyD:'#001818', notch:'#60E8E0', notch2:'#005050', ring:'#4DD0E1', star:'#00E5FF', label:'#E0F7FA', tierRing:'#00BCD4', tier:'millions' },
  10_000_000:  { body:'#003070', bodyL:'#2860b0', bodyD:'#001040', notch:'#60D8FF', notch2:'#004088', ring:'#40C4FF', star:'#00B0FF', label:'#fff', tierRing:'#0091EA', tier:'millions' },
  20_000_000:  { body:'#380070', bodyL:'#6028a8', bodyD:'#100030', notch:'#D060FF', notch2:'#600090', ring:'#E040FB', star:'#CE93D8', label:'#fff', tierRing:'#D500F9', tier:'millions' },
  50_000_000:  { body:'#182028', bodyL:'#384858', bodyD:'#080c10', notch:'#B0D0E0', notch2:'#304050', ring:'#B0BEC5', star:'#90A4AE', label:'#CFD8DC', tierRing:'#78909C', tier:'millions' },
  100_000_000: { body:'#140800', bodyL:'#3a2000', bodyD:'#000', notch:'#FFE060', notch2:'#906800', ring:'#FFD700', star:'#FFC400', label:'#FFD700', tierRing:'#FFD700', tier:'millions' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
export function formatChipLabel(n: number): string {
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
  if (amount >= 1_000_000) return STYLES[1_000_000];
  if (amount >= 1_000)     return STYLES[1_000];
  return STYLES[1];
}

function starPoints(cx: number, cy: number, rOut: number, rIn: number, pts: number): string {
  const step = Math.PI / pts;
  return Array.from({ length: pts * 2 }, (_, i) => {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = i * step - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

// ─── SVG Chip Face ─────────────────────────────────────────────────────────
function ChipFace({ amount, size }: { amount: number; size: number }) {
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
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="60%"  stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#cacaca" />
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

      {/* Star — more opaque to match reference image */}
      <polygon
        points={starPoints(cx, cy, rMed * 0.80, rMed * 0.36, 5)}
        fill={s.star}
        opacity={0.55}
      />

      {/* $Pc — top of medallion */}
      <text
        x={cx} y={cy - rMed * 0.48}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.105} fontWeight="900"
        fill={s.label} fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="0.2"
      >
        $Pc
      </text>

      {/* Amount — center */}
      <text
        x={cx} y={cy + rMed * 0.14}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={numFS} fontWeight="900"
        fill={s.label} fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.5"
        style={{ paintOrder: 'stroke fill', stroke: 'rgba(0,0,0,0.2)', strokeWidth: 0.5 }}
      >
        {lbl}
      </text>

      {/* Tier bottom label — small curved indicator text */}
      {s.tier !== 'standard' && (
        <text
          x={cx} y={cy + rMed * 0.68}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.075} fontWeight="800"
          fill={s.tierRing} fontFamily="Arial, sans-serif" letterSpacing="1.5"
          opacity={0.9}
        >
          {s.tier === 'thousands' ? '— K —' : '— M —'}
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
  selected?: boolean;
  className?: string;
}

export const CHIP_PX = { sm: 44, md: 58, lg: 74 };

export function PokerChip({ amount, size = 'md', onClick, selected, className = '' }: PokerChipProps) {
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

  const baseStyle: React.CSSProperties = { width: px, height: px, background: 'none', border: 'none', padding: 0 };
  const baseClass = `relative inline-flex items-center justify-center transition-all duration-200 ${selected ? 'scale-110 -translate-y-1' : ''} ${className}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClass} cursor-pointer hover:scale-110 hover:-translate-y-1.5 active:scale-95`} style={baseStyle}>
        {inner}
      </button>
    );
  }
  return (
    <div className={`${baseClass} cursor-default`} style={baseStyle}>
      {inner}
    </div>
  );
}

// ─── ChipSelector ───────────────────────────────────────────────────────────
type SelectorTab = 'standard' | 'thousands' | 'millions' | 'all';

interface ChipSelectorProps {
  selectedChip: number;
  onSelect: (amount: number) => void;
  balance?: number;
  compact?: boolean;
}

export function ChipSelector({ selectedChip, onSelect, balance, compact }: ChipSelectorProps) {
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
              1M–100M
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
                <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} />
              ))}
            </div>
          </div>
          {/* Thousands */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 9, color: '#FF8F00', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>THOUSANDS ⸻ K</div>
            <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {THOUSAND_CHIPS.map(amt => (
                <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} />
              ))}
            </div>
          </div>
          {/* Millions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 9, color: '#00BCD4', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>MILLIONS ⸻ M</div>
            <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {MILLION_CHIPS.map(amt => (
                <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: compact ? 3 : 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {chips.map(amt => (
            <PokerChip key={amt} amount={amt} size={chipSize} selected={selectedChip === amt} onClick={() => onSelect(amt)} />
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
        <div className="mt-2 text-[#D4AF37] font-bold text-sm">{formatChipLabel(totalAmount)} $Pc</div>
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
