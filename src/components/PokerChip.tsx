import React, { useState } from 'react';

// ─── Denomination tiers ────────────────────────────────────────────────────
export const STANDARD_CHIPS   = [1, 5, 10, 25, 50, 100, 500];
export const THOUSAND_CHIPS   = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 500_000];
export const MILLION_CHIPS    = [1_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000];
export const ALL_CHIP_DENOMS  = [...STANDARD_CHIPS, ...THOUSAND_CHIPS, ...MILLION_CHIPS];

type ChipTier = 'standard' | 'thousands' | 'millions';
interface CS { body: string; bodyL: string; bodyD: string; notch: string; ring: string; star: string; label: string; tier: ChipTier }

const STYLES: Record<number, CS> = {
  // ─── Standard — classic casino palette ─────────────────────────────────
  1:   { body:'#d0d0d0', bodyL:'#f0f0f0', bodyD:'#909090', notch:'#a0a0a0', ring:'#888',    star:'#bbb',    label:'#333', tier:'standard' },
  5:   { body:'#c62828', bodyL:'#ff5f52', bodyD:'#8e0000', notch:'#ff8a80', ring:'#ff8a80', star:'#e57373', label:'#fff', tier:'standard' },
  10:  { body:'#1565c0', bodyL:'#5e92f3', bodyD:'#003c8f', notch:'#82b1ff', ring:'#82b1ff', star:'#90caf9', label:'#fff', tier:'standard' },
  25:  { body:'#2e7d32', bodyL:'#60ad5e', bodyD:'#005005', notch:'#b9f6ca', ring:'#69f0ae', star:'#a5d6a7', label:'#fff', tier:'standard' },
  50:  { body:'#e65100', bodyL:'#ff833a', bodyD:'#ac1900', notch:'#ffd180', ring:'#ffd740', star:'#ffb74d', label:'#fff', tier:'standard' },
  100: { body:'#1a1a1a', bodyL:'#444',    bodyD:'#000',    notch:'#D4AF37', ring:'#D4AF37', star:'#c9a227', label:'#D4AF37', tier:'standard' },
  500: { body:'#6a1b9a', bodyL:'#9c4dcc', bodyD:'#38006b', notch:'#ea80fc', ring:'#e040fb', star:'#ce93d8', label:'#fff', tier:'standard' },

  // ─── Thousands — warm amber/copper/gold family ─────────────────────────
  1_000:   { body:'#7f0000', bodyL:'#b71c1c', bodyD:'#4a0000', notch:'#FFD600', ring:'#FFD600', star:'#FFAB40', label:'#FFD600', tier:'thousands' },
  5_000:   { body:'#bf360c', bodyL:'#f9683a', bodyD:'#870000', notch:'#FFEA00', ring:'#FFEA00', star:'#FFD740', label:'#fff',    tier:'thousands' },
  10_000:  { body:'#4e342e', bodyL:'#7b5e57', bodyD:'#260e04', notch:'#FF8F00', ring:'#FFA000', star:'#FFB300', label:'#fff',    tier:'thousands' },
  25_000:  { body:'#5d4037', bodyL:'#8b6d62', bodyD:'#321911', notch:'#FFD740', ring:'#FFCA28', star:'#FFB300', label:'#fff',    tier:'thousands' },
  50_000:  { body:'#827717', bodyL:'#b5a549', bodyD:'#514700', notch:'#F9F9C4', ring:'#FFF176', star:'#F9A825', label:'#1a1a1a',tier:'thousands' },
  100_000: { body:'#212121', bodyL:'#484848', bodyD:'#000',    notch:'#FF6D00', ring:'#FF8F00', star:'#FFA000', label:'#FF6D00', tier:'thousands' },
  500_000: { body:'#880e4f', bodyL:'#bc477b', bodyD:'#560027', notch:'#FFD700', ring:'#FFD700', star:'#FDD835', label:'#fff',    tier:'thousands' },

  // ─── Millions — cool teal/cyan/platinum family ─────────────────────────
  1_000_000:   { body:'#00695c', bodyL:'#439889', bodyD:'#003d33', notch:'#A7FFEB', ring:'#69F0AE', star:'#4DD0E1', label:'#E0F7FA', tier:'millions' },
  5_000_000:   { body:'#004D40', bodyL:'#39796b', bodyD:'#00251a', notch:'#80DEEA', ring:'#4DD0E1', star:'#00E5FF', label:'#E0F7FA', tier:'millions' },
  10_000_000:  { body:'#01579b', bodyL:'#4f83cc', bodyD:'#002f6c', notch:'#80D8FF', ring:'#40C4FF', star:'#00B0FF', label:'#fff',    tier:'millions' },
  20_000_000:  { body:'#4a148c', bodyL:'#7c43bd', bodyD:'#12005e', notch:'#EA80FC', ring:'#E040FB', star:'#CE93D8', label:'#fff',    tier:'millions' },
  50_000_000:  { body:'#263238', bodyL:'#4f5b62', bodyD:'#000a12', notch:'#CFD8DC', ring:'#B0BEC5', star:'#90A4AE', label:'#CFD8DC', tier:'millions' },
  100_000_000: { body:'#1a0a00', bodyL:'#4a2800', bodyD:'#000',    notch:'#FFD700', ring:'#FFD700', star:'#FFC400', label:'#FFD700', tier:'millions' },
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
  const s  = getStyle(amount);
  const cx = size / 2, cy = size / 2;
  const r  = size / 2 - 1.5;
  const rInner = r * 0.71;
  const rCenter= r * 0.54;
  const lbl    = formatChipLabel(amount);
  const uid    = `pc-${amount}`;

  // Tier sub-label
  const tierLabel = s.tier === 'thousands' ? '·K·' : s.tier === 'millions' ? '·M·' : '';
  const tierColor = s.tier === 'thousands' ? '#FF8F00' : s.tier === 'millions' ? '#00BCD4' : 'transparent';

  // Font size scales with label length
  const numFS = size * (lbl.length >= 4 ? 0.145 : lbl.length === 3 ? 0.165 : 0.19);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block', overflow:'visible' }}>
      <defs>
        <radialGradient id={`${uid}-b`} cx="36%" cy="28%" r="70%">
          <stop offset="0%"   stopColor={s.bodyL} />
          <stop offset="50%"  stopColor={s.body} />
          <stop offset="100%" stopColor={s.bodyD} />
        </radialGradient>
        <radialGradient id={`${uid}-c`} cx="38%" cy="30%" r="72%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e4e4e4" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* Drop shadow */}
      <circle cx={cx} cy={cy + 2} r={r} fill="rgba(0,0,0,0.45)" />

      {/* Chip body */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-b)`} />

      {/* 8 edge notch tabs — the Lucky-Chip style colored blocks */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={cx - size * 0.065}
          y={1.5}
          width={size * 0.13}
          height={r * 0.24}
          fill={s.notch}
          rx={2}
          transform={`rotate(${i * 45}, ${cx}, ${cy})`}
          clipPath={`url(#${uid}-clip)`}
        />
      ))}

      {/* Outer rim line */}
      <circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />

      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={s.ring} strokeWidth={1.6} opacity={0.75} />
      {/* Laurel dashes */}
      <circle cx={cx} cy={cy} r={rInner - 2.5} fill="none" stroke={s.ring} strokeWidth={0.9}
        strokeDasharray={`${size * 0.04} ${size * 0.035}`} opacity={0.5} />

      {/* Center medallion */}
      <circle cx={cx} cy={cy} r={rCenter} fill={`url(#${uid}-c)`} />
      <circle cx={cx} cy={cy} r={rCenter} fill="none" stroke={s.ring} strokeWidth={0.8} opacity={0.4} />

      {/* Star */}
      <polygon
        points={starPoints(cx, cy, rCenter * 0.82, rCenter * 0.38, 5)}
        fill={s.star}
        opacity={0.38}
      />

      {/* $Pc — top of center */}
      <text x={cx} y={cy - rCenter * 0.42}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.1} fontWeight="800"
        fill={s.label} fontFamily="Arial, sans-serif" letterSpacing="0.3">
        $Pc
      </text>

      {/* Amount number — center */}
      <text x={cx} y={cy + rCenter * 0.18}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={numFS} fontWeight="900"
        fill={s.label} fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.5">
        {lbl}
      </text>

      {/* Tier micro-label */}
      {tierLabel && (
        <text x={cx} y={cy + rCenter * 0.72}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.082} fontWeight="700"
          fill={tierColor} fontFamily="Arial, sans-serif" letterSpacing="1">
          {tierLabel}
        </text>
      )}

      {/* Top highlight */}
      <ellipse cx={cx - r * 0.09} cy={cy - r * 0.36} rx={r * 0.38} ry={r * 0.17}
        fill="rgba(255,255,255,0.18)" />
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

const CHIP_PX = { sm: 42, md: 56, lg: 72 };

export function PokerChip({ amount, size = 'md', onClick, selected, className = '' }: PokerChipProps) {
  const px = CHIP_PX[size];
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-110 hover:-translate-y-1.5 active:scale-95' : 'cursor-default'} ${selected ? 'scale-110 -translate-y-1' : ''} ${className}`}
      style={{ width: px, height: px, background: 'none', border: 'none', padding: 0 }}
    >
      {selected && (
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: '0 0 0 2.5px #D4AF37, 0 0 12px rgba(212,175,55,0.7)', borderRadius: '50%' }} />
      )}
      <ChipFace amount={amount} size={px} />
    </button>
  );
}

// ─── ChipSelector ───────────────────────────────────────────────────────────
type SelectorTab = 'standard' | 'thousands' | 'millions';

interface ChipSelectorProps {
  selectedChip: number;
  onSelect: (amount: number) => void;
  balance?: number;
  compact?: boolean;
}

export function ChipSelector({ selectedChip, onSelect, balance, compact }: ChipSelectorProps) {
  const [tab, setTab] = useState<SelectorTab>(
    selectedChip >= 1_000_000 ? 'millions' : selectedChip >= 1_000 ? 'thousands' : 'standard'
  );
  const [customRaw, setCustomRaw] = useState('');

  const chips = tab === 'standard' ? STANDARD_CHIPS : tab === 'thousands' ? THOUSAND_CHIPS : MILLION_CHIPS;
  const chipSize = compact ? 'sm' : 'md';

  const TAB_STYLES = (active: boolean, tier: SelectorTab) => ({
    padding: compact ? '3px 8px' : '4px 12px',
    borderRadius: 20,
    border: active ? `1.5px solid ${tier === 'millions' ? '#00BCD4' : tier === 'thousands' ? '#FF8F00' : '#D4AF37'}` : '1.5px solid rgba(255,255,255,0.12)',
    background: active ? (tier === 'millions' ? 'rgba(0,188,212,0.15)' : tier === 'thousands' ? 'rgba(255,143,0,0.15)' : 'rgba(212,175,55,0.15)') : 'rgba(255,255,255,0.05)',
    color: active ? (tier === 'millions' ? '#00BCD4' : tier === 'thousands' ? '#FF8F00' : '#D4AF37') : '#666',
    fontSize: compact ? 10 : 11,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.5px',
    transition: 'all 0.15s',
  } as React.CSSProperties);

  const handleCustom = () => {
    const v = parseInt(customRaw.replace(/[^0-9]/g, ''), 10);
    if (v && v > 0) {
      if (!isNaN(v)) {
        onSelect(v);
        setCustomRaw('');
        // Auto-switch tab
        if (v >= 1_000_000) setTab('millions');
        else if (v >= 1_000) setTab('thousands');
        else setTab('standard');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8, alignItems: 'center' }}>
      {/* Tier tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={TAB_STYLES(tab === 'standard', 'standard')} onClick={() => setTab('standard')}>
          Standard
        </button>
        <button style={TAB_STYLES(tab === 'thousands', 'thousands')} onClick={() => setTab('thousands')}>
          Thousands
        </button>
        <button style={TAB_STYLES(tab === 'millions', 'millions')} onClick={() => setTab('millions')}>
          Millions
        </button>
      </div>

      {/* Chip row */}
      <div style={{ display: 'flex', gap: compact ? 4 : 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {chips.map(amt => (
          <PokerChip
            key={amt}
            amount={amt}
            size={chipSize}
            selected={selectedChip === amt}
            onClick={() => onSelect(amt)}
          />
        ))}
      </div>

      {/* Custom amount */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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

// ─── ChipStack (for placed bets display) ───────────────────────────────────
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

// ─── BetArea (unchanged API) ────────────────────────────────────────────────
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
