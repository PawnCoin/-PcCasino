import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, RotateCcw, Mic, MicOff, Camera, History } from 'lucide-react';
import { useTableSkin } from '@/hooks/useTableSkin';
import { PremiumFeltOverlay } from '@/components/PremiumFeltOverlay';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createDeck, shuffleDeck, evaluatePokerHand, getBestHand } from '@/hooks/useGameEngine';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { usePokerVoice } from '@/hooks/useGameVoice';
import { PokerChip, ChipSelector } from '@/components/PokerChip';
import { AvatarSprite, getAvatarStyle, ALL_AVATARS, DealerAvatarSprite } from '@/components/AvatarSprite';
import type { AvatarDef, DealerAvatarDef } from '@/components/AvatarSprite';
import { PokerHandAnalyzer } from '@/components/PokerHandAnalyzer';
import { PlayingCard } from '@/components/PlayingCard';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';
import { useCasinoBots } from '@/hooks/useCasinoBots';
import { GameBotBar } from '@/components/GameBotBar';
import { PokerHandHistory } from '@/components/PokerHandHistory';
import { PublicProfileCard } from '@/components/PublicProfileCard';
import { gameApi } from '@/lib/api';
import { getToken } from '@/lib/api';
import { useServerGame } from '@/hooks/useServerGame';
import type { Card } from '@/types';

interface PokerGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

const CHIP_VALUES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000];

const handRankings: Record<string, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_of_a_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_of_a_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  pair: 'Pair',
  high_card: 'High Card',
};

// Dealer roster — uses the dealer sprite sheet exclusively (4 cols × 5 rows = 20 dealers)
const DEALER_ROSTER: { name: string; avatar: DealerAvatarDef }[] = [
  { name: 'Marcus Vega',    avatar: { row: 0, col: 0 } },
  { name: 'Sophia Lane',    avatar: { row: 0, col: 1 } },
  { name: 'Victor Noir',    avatar: { row: 0, col: 2 } },
  { name: 'Diana Cole',     avatar: { row: 0, col: 3 } },
  { name: 'Lorenzo King',   avatar: { row: 1, col: 0 } },
  { name: 'Bianca Rush',    avatar: { row: 1, col: 1 } },
  { name: 'Rafael Stone',   avatar: { row: 1, col: 2 } },
  { name: 'Celeste Hart',   avatar: { row: 1, col: 3 } },
  { name: 'Anton Cruz',     avatar: { row: 2, col: 0 } },
  { name: 'Vivienne Bell',  avatar: { row: 2, col: 1 } },
  { name: 'Jackson Reed',   avatar: { row: 2, col: 2 } },
  { name: 'Nina Frost',     avatar: { row: 2, col: 3 } },
  { name: 'Damon West',     avatar: { row: 3, col: 0 } },
  { name: 'Leila Storm',    avatar: { row: 3, col: 1 } },
  { name: 'Felix Mara',     avatar: { row: 3, col: 2 } },
  { name: 'Zara Blaze',     avatar: { row: 3, col: 3 } },
  { name: 'Oscar Raines',   avatar: { row: 4, col: 0 } },
  { name: 'Camille Fox',    avatar: { row: 4, col: 1 } },
  { name: 'Theo Blackwood', avatar: { row: 4, col: 2 } },
  { name: 'Isabel Cruz',    avatar: { row: 4, col: 3 } },
];


function AnimatedChipFly({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 100;
    const endX = window.innerWidth / 2;
    const endY = window.innerHeight / 2 - 50;
    setPosition({ x: startX, y: startY });
    const duration = 400;
    const startTime = Date.now();
    let lastTrailTime = 0;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newX = startX + (endX - startX) * easeOut;
      const newY = startY + (endY - startY) * easeOut;
      setPosition({ x: newX, y: newY });
      if (elapsed - lastTrailTime > 30 && progress < 0.85) {
        lastTrailTime = elapsed;
        trailIdRef.current += 1;
        setTrail(prev => [...prev.slice(-8), { x: newX, y: newY, id: trailIdRef.current }]);
      }
      if (progress < 0.5) setScale(1 + Math.sin(progress * Math.PI) * 0.3);
      else setScale(1);
      if (progress >= 0.9) setOpacity(1 - (progress - 0.9) * 10);
      if (progress < 1) requestAnimationFrame(animate);
      else onComplete();
    };
    requestAnimationFrame(animate);
  }, [onComplete]);

  const chipColors: Record<number, string> = {
    5: 'from-red-500 to-red-700',
    10: 'from-blue-500 to-blue-700',
    25: 'from-green-500 to-green-700',
    50: 'from-orange-500 to-orange-700',
    100: 'from-gray-800 to-black',
    500: 'from-[#D4AF37] to-[#B8860B]',
  };

  return (
    <>
      {trail.map((t, i) => (
        <div
          key={t.id}
          className="fixed z-49 rounded-full pointer-events-none"
          style={{
            left: t.x, top: t.y, width: `${6 + i}px`, height: `${6 + i}px`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(212,175,55,${0.3 + i * 0.05}), transparent)`,
            animation: 'pokerTrailFade 0.4s ease-out forwards',
          }}
        />
      ))}
      <div
        className={`fixed z-50 w-12 h-12 rounded-full bg-gradient-to-br ${chipColors[amount] || chipColors[5]} border-2 border-white/30 flex flex-col items-center justify-center pointer-events-none`}
        style={{
          left: position.x, top: position.y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity,
          boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
        }}
      >
        <div className="absolute inset-2 rounded-full border border-dashed border-white/40" />
        <span className="text-[7px] font-bold text-white/80">$Pc</span>
        <span className="text-[9px] font-bold text-white">{amount}</span>
      </div>
    </>
  );
}

function PotChipStack({ pot }: { pot: number }) {
  const chipBreakdown = [];
  let remaining = pot;
  for (const denom of [500, 100, 50, 25, 10, 5]) {
    const count = Math.floor(remaining / denom);
    if (count > 0) { chipBreakdown.push({ amount: denom, count: Math.min(count, 3) }); remaining -= denom * count; }
  }
  const chipColors: Record<number, string> = { 5: '#ef4444', 10: '#3b82f6', 25: '#22c55e', 50: '#f97316', 100: '#374151', 500: '#D4AF37' };
  return (
    <div className="flex items-end justify-center gap-1">
      {chipBreakdown.slice(0, 4).map((chip, stackIdx) => (
        <div key={stackIdx} className="relative flex flex-col-reverse items-center">
          {Array.from({ length: chip.count }, (_, i) => (
            <div key={i} className="premium-chip" style={{
              width: '22px', height: '22px', marginTop: i > 0 ? '-14px' : '0',
              background: `radial-gradient(circle at 35% 35%, ${chipColors[chip.amount]}dd, ${chipColors[chip.amount]}88)`,
              border: '2px solid rgba(255,255,255,0.3)', zIndex: i, fontSize: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
            }}>
              {i === chip.count - 1 ? chip.amount : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DealerSeat({ dealer }: { dealer: { name: string; avatar: DealerAvatarDef } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'stretch',
        background: 'linear-gradient(135deg, rgba(12,8,28,0.97), rgba(22,14,36,0.99))',
        border: '1.5px solid rgba(212,175,55,0.7)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 18px rgba(212,175,55,0.2)',
        minWidth: 140,
      }}>
        <div style={{ flexShrink: 0, overflow: 'hidden', borderRight: '1px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DealerAvatarSprite avatar={dealer.avatar} size={54} />
        </div>
        <div style={{ padding: '6px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 8, color: '#D4AF37', letterSpacing: '0.2em', fontWeight: 800, textTransform: 'uppercase' }}>Dealer</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 2, whiteSpace: 'nowrap' }}>{dealer.name}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(212,175,55,0.55)', marginTop: 2, letterSpacing: '0.1em' }}>$Pc Casino</div>
        </div>
      </div>
    </div>
  );
}

/* ── Player info box (matches reference panel style) ── */
interface OpponentData {
  id: number;
  name: string;
  balance: number;
  bet: number;
  active: boolean;
  position: string;
  avatarIdx: number;
  folded: boolean;
  holeCards?: Card[];
}

const ACTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'FOLD':   { bg: 'rgba(239,68,68,0.85)',   border: '#ef4444', text: '#fff' },
  'CHECK':  { bg: 'rgba(59,130,246,0.85)',   border: '#3b82f6', text: '#fff' },
  'CALL':   { bg: 'rgba(34,197,94,0.85)',    border: '#22c55e', text: '#fff' },
  'RAISE':  { bg: 'rgba(212,175,55,0.9)',    border: '#D4AF37', text: '#000' },
  'ALL IN': { bg: 'rgba(168,85,247,0.9)',    border: '#a855f7', text: '#fff' },
  '...':    { bg: 'rgba(40,40,60,0.9)',      border: 'rgba(255,255,255,0.25)', text: '#9ca3af' },
};

function OpponentSeat({
  opponent,
  cardBackStyle,
  cardDirection = 'up',
  action,
  onAvatarClick,
}: {
  opponent: OpponentData;
  cardBackStyle?: PokerGameProps['cardBackStyle'];
  cardDirection?: 'up' | 'left' | 'right' | 'down';
  action?: { label: string; thinking: boolean } | null;
  onAvatarClick?: () => void;
}) {
  const clickProps = onAvatarClick
    ? {
        onClick: onAvatarClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAvatarClick(); }
        },
        role: 'button' as const,
        tabIndex: 0,
        style: { cursor: 'pointer' as const },
      }
    : {};
  if (!opponent.active) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1.5px dashed rgba(212,175,55,0.3)',
        borderRadius: 10,
        padding: '8px 14px',
        textAlign: 'center',
        minWidth: 90,
      }}>
        <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.6)', letterSpacing: '0.15em', fontWeight: 700 }}>SEAT {opponent.id}</div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Sit Here</div>
      </div>
    );
  }

  if (opponent.folded) {
    const isLeft = cardDirection === 'left';
    const isRight = cardDirection === 'right';
    const foldedCards = (
      <div style={{ position: 'relative', display: 'flex', gap: 3, flexShrink: 0 }}>
        <div style={{ opacity: 0.4, filter: 'grayscale(1)' }}>
          <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
        </div>
        <div style={{ opacity: 0.4, filter: 'grayscale(1)' }}>
          <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#ef4444', textShadow: '0 0 8px rgba(239,68,68,0.6)', pointerEvents: 'none' }}>\u00d7</div>
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', opacity: 0.55 }}>
        {cardDirection === 'up' && <div style={{ marginBottom: 2 }}>{foldedCards}</div>}
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          background: 'rgba(8,8,8,0.75)', border: '1.5px solid rgba(239,68,68,0.25)',
          borderRadius: 10, overflow: 'hidden', minWidth: 140, filter: 'grayscale(0.7)',
        }}>
          {isLeft && <div style={{ marginRight: 4, marginLeft: 4 }}>{foldedCards}</div>}
          <div
            {...clickProps}
            title={onAvatarClick ? `View ${opponent.name}` : undefined}
            style={{ ...(clickProps.style || {}), width: 52, height: 60, flexShrink: 0, overflow: 'hidden', borderRight: isLeft ? 'none' : '1px solid rgba(255,255,255,0.06)', borderLeft: isLeft ? '1px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AvatarSprite avatar={ALL_AVATARS[opponent.avatarIdx % ALL_AVATARS.length]} size={52} style={{ borderRadius: 0 }} />
          </div>
          <div style={{ padding: '6px 10px', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{opponent.name}</div>
            <div style={{ fontSize: 11, color: '#374151', fontWeight: 700, marginTop: 2 }}>{opponent.balance.toLocaleString()}</div>
            <div style={{ marginTop: 3, display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', fontSize: 8, color: '#ef4444', fontWeight: 700, letterSpacing: '0.1em' }}>FOLDED</div>
          </div>
          {isRight && <div style={{ marginRight: 6, marginLeft: 2 }}>{foldedCards}</div>}
        </div>
        {cardDirection === 'down' && <div style={{ marginTop: 2 }}>{foldedCards}</div>}
      </div>
    );
  }

  const cards = (
    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
      <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
      <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
    </div>
  );

  const isLeft = cardDirection === 'left';
  const isRight = cardDirection === 'right';

  const actionTheme = action ? (ACTION_COLORS[action.label] || ACTION_COLORS['...']) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>

      {/* action badge overlay */}
      {action && actionTheme && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'oppActionIn 0.2s ease-out both',
        }}>
          <div style={{
            background: actionTheme.bg,
            border: `2px solid ${actionTheme.border}`,
            color: actionTheme.text,
            borderRadius: 8, padding: '4px 12px',
            fontSize: action.thinking ? 18 : 13,
            fontWeight: 900, letterSpacing: action.thinking ? '0.3em' : '0.15em',
            textTransform: 'uppercase',
            boxShadow: `0 0 20px ${actionTheme.border}88`,
            backdropFilter: 'blur(4px)',
          }}>
            {action.label}
          </div>
        </div>
      )}

      {/* cards above for top seats */}
      {cardDirection === 'up' && (
        <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
          <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
        </div>
      )}

      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        background: action && !action.thinking ? `${actionTheme?.bg ?? 'rgba(10,10,18,0.88)'}` : 'rgba(10,10,18,0.88)',
        border: action ? `1.5px solid ${actionTheme?.border ?? 'rgba(255,255,255,0.12)'}` : '1.5px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: action && !action.thinking ? `0 0 18px ${actionTheme?.border ?? 'transparent'}66` : '0 4px 16px rgba(0,0,0,0.6)',
        minWidth: 140,
        transition: 'border 0.2s, box-shadow 0.2s',
      }}>
        {/* cards left for left-side seats */}
        {isLeft && <div style={{ marginRight: 4, marginLeft: 4 }}>{cards}</div>}

        {/* avatar */}
        <div
          {...clickProps}
          title={onAvatarClick ? `View ${opponent.name}` : undefined}
          style={{
            ...(clickProps.style || {}),
            width: 52, height: 60, flexShrink: 0, overflow: 'hidden',
            borderRight: isLeft ? 'none' : '1px solid rgba(255,255,255,0.08)',
            borderLeft: isLeft ? '1px solid rgba(255,255,255,0.08)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <AvatarSprite avatar={ALL_AVATARS[opponent.avatarIdx % ALL_AVATARS.length]} size={52} style={{ borderRadius: 0 }} />
        </div>

        {/* name & balance */}
        <div
          {...clickProps}
          style={{ ...(clickProps.style || {}), padding: '6px 10px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{opponent.name}</div>
          <div style={{ fontSize: 11, color: '#43A047', fontWeight: 700, marginTop: 2 }}>
            {opponent.balance.toLocaleString()}
          </div>
          {opponent.position && (
            <div style={{
              marginTop: 3, display: 'inline-block',
              padding: '1px 6px', borderRadius: 4,
              background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)',
              fontSize: 8, color: '#D4AF37', fontWeight: 700,
            }}>{opponent.position}</div>
          )}
        </div>

        {/* cards right for right-side seats */}
        {isRight && <div style={{ marginRight: 6, marginLeft: 2 }}>{cards}</div>}
      </div>

      {/* bet chip */}
      {opponent.bet > 0 && (
        <div style={{ marginTop: 2 }}>
          <PokerChip amount={opponent.bet} size="sm" />
        </div>
      )}
    </div>
  );
}

/* ── User seat at bottom ── */
function UserSeat({
  balance, playerBet, playerTotalBet, playerHand, showdownWinner, userAvatar, onAvatarChange,
}: {
  balance: number; playerBet: number; playerTotalBet: number; playerHand: Card[];
  showdownWinner?: 'player' | 'opponent' | null; userAvatar: string | null;
  onAvatarChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDef, setSelectedDef] = useState<AvatarDef>(ALL_AVATARS[0]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) { onAvatarChange(ev.target.result as string); setPickerOpen(false); } };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>

      {/* avatar picker popup */}
      {pickerOpen && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,18,0.97)', border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: 12, padding: 12, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          minWidth: 260,
        }}>
          <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>CHOOSE YOUR AVATAR</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 }}>
            {ALL_AVATARS.slice(0, 24).map((av, i) => (
              <div
                key={i}
                onClick={() => { setSelectedDef(av); onAvatarChange(''); setPickerOpen(false); }}
                style={{
                  cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
                  border: (selectedDef === av && !userAvatar) ? '2px solid #D4AF37' : '2px solid transparent',
                  transition: 'border-color 0.15s',
                }}
              >
                <AvatarSprite avatar={av} size={36} style={{ borderRadius: 0 }} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, textAlign: 'center' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 10, color: '#9ca3af', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
            >
              Upload photo instead
            </button>
          </div>
        </div>
      )}

      {/* hole cards */}
      <div style={{ display: 'flex', gap: 10 }}>
        {playerHand.map((card, i) => (
          <div key={i} style={{ filter: showdownWinner === 'player' ? 'drop-shadow(0 0 14px rgba(212,175,55,0.7))' : undefined }}>
            <PlayingCard card={card} size="xl" />
          </div>
        ))}
      </div>

      {/* player info box */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        background: showdownWinner === 'player' ? 'rgba(212,175,55,0.15)' : 'rgba(10,10,18,0.92)',
        border: showdownWinner === 'player' ? '1.5px solid rgba(212,175,55,0.8)' : '1.5px solid rgba(255,255,255,0.18)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: showdownWinner === 'player' ? '0 0 20px rgba(212,175,55,0.35)' : '0 4px 16px rgba(0,0,0,0.6)',
        minWidth: 160,
      }}>
        {/* avatar — click to open picker */}
        <div
          style={{ width: 56, height: 64, flexShrink: 0, position: 'relative', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPickerOpen(p => !p)}
          title="Click to choose avatar"
        >
          {userAvatar
            ? <div style={{ width: 56, height: 64, backgroundImage: `url(${userAvatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            : <AvatarSprite avatar={selectedDef} size={56} style={{ borderRadius: 0 }} />
          }
          <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(212,175,55,0.85)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera style={{ width: 9, height: 9, color: '#000' }} />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        {/* info */}
        <div style={{ padding: '6px 12px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: showdownWinner === 'player' ? '#D4AF37' : '#fff' }}>You</div>
          <div style={{ fontSize: 11, color: '#43A047', fontWeight: 700, marginTop: 2 }}>{balance.toLocaleString()}</div>
          {playerTotalBet > 0 && (
            <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4AF37', flexShrink: 0 }} />
              <div style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700 }}>In pot: {playerTotalBet.toLocaleString()} $Pc</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PokerGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet, cardBackStyle }: PokerGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, addAIReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
  const { activeBots, onlinePlayerCount, chatMessages, triggerGameEvent } = useCasinoBots({ gameName: 'Poker', minBots: 4, maxBots: 10, statusMessages: ['At table', 'Watching', 'In hand', 'Waiting'] });
  const { sendAction: serverSendAction, createRoom: serverCreateRoom, addBots: serverAddBots, gameState: serverState, connected: serverConnected, error: serverError } = useServerGame({ gameType: 'poker' });
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [revealedCommunity, setRevealedCommunity] = useState(0);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [playerBet, setPlayerBet] = useState(0);
  const [playerTotalBet, setPlayerTotalBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState(25);
  const [showRules, setShowRules] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(true);
  const [showVoice, setShowVoice] = useState(true);
  const [message, setMessage] = useState("Welcome to Texas Hold'em!");
  const [playerChips, setPlayerChips] = useState<{ amount: number; count: number }[]>([]);
  const [flyingChips, setFlyingChips] = useState<number[]>([]);
  const [winEffect, setWinEffect] = useState(false);
  const [loseEffect, setLoseEffect] = useState(false);
  const [winText, setWinText] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [potSweepToUser, setPotSweepToUser] = useState(false);
  const [dealer] = useState(() => DEALER_ROSTER[Math.floor(Math.random() * DEALER_ROSTER.length)]);
  const [oppAction, setOppAction] = useState<{ idx: number; label: string; thinking: boolean } | null>(null);
  const [profilePopupIdx, setProfilePopupIdx] = useState<number | null>(null);
  const [opponents, setOpponents] = useState<OpponentData[]>([
    { id: 1, name: 'Taylor', balance: 1540, bet: 0, active: true, position: 'BB', avatarIdx: 1, folded: false },
    { id: 2, name: '', balance: 0, bet: 0, active: false, position: '', avatarIdx: 0, folded: false },
    { id: 3, name: 'Morgan', balance: 2475, bet: 0, active: true, position: '', avatarIdx: 3, folded: false },
    { id: 4, name: 'Jordan', balance: 2500, bet: 0, active: true, position: 'SB', avatarIdx: 4, folded: false },
    { id: 5, name: 'Riley', balance: 3883, bet: 0, active: true, position: '', avatarIdx: 5, folded: false },
    { id: 6, name: 'Casey', balance: 1190, bet: 0, active: true, position: '', avatarIdx: 2, folded: false },
    { id: 7, name: '', balance: 0, bet: 0, active: false, position: '', avatarIdx: 7, folded: false },
    { id: 8, name: '', balance: 0, bet: 0, active: false, position: '', avatarIdx: 8, folded: false },
  ]);

  const [showdownData, setShowdownData] = useState<{
    winner: 'player' | 'opponent';
    handName: string;
    winAmount: number;
    opponentName?: string;
    opponentCards?: Card[];
    playerCards?: Card[];
  } | null>(null);
  const [showdownTimer, setShowdownTimer] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [handActions, setHandActions] = useState<{ street: string; actor: string; action: string; amount?: number; potAfter?: number }[]>([]);
  const [currentStreet, setCurrentStreet] = useState<string>('preflop');
  const handActionsRef = useRef(handActions);
  handActionsRef.current = handActions;
  const currentStreetRef = useRef(currentStreet);
  currentStreetRef.current = currentStreet;
  const isAuthenticated = !!getToken();

  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { announceEvent, stop, isSupported: voiceSupported } = usePokerVoice();
  const chipAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!serverState || !serverConnected) return;
    const s = serverState as Record<string, unknown>;
    if (s.phase) setGamePhase(s.phase as typeof gamePhase);
    if (Array.isArray(s.communityCards)) setCommunityCards(s.communityCards as Card[]);
    if (typeof s.pot === 'number') setPot(s.pot);
    if (typeof s.currentBet === 'number') setCurrentBet(s.currentBet);
    if (Array.isArray(s.holeCards)) setPlayerHand(s.holeCards as Card[]);
  }, [serverState, serverConnected]);

  const simulateOpponentActions = useCallback((callback: () => void) => {
    const activeOpps = opponents
      .map((o, idx) => ({ ...o, idx }))
      .filter(o => o.active && o.name && !o.folded);
    let delay = 0;
    activeOpps.forEach(opp => {
      setTimeout(() => setOppAction({ idx: opp.idx, label: '...', thinking: true }), delay);
      delay += 500;
      const rand = Math.random();
      let label: string;
      if (currentBet > opp.bet) {
        if (rand < 0.15) label = 'FOLD';
        else if (rand < 0.85) label = 'CALL';
        else if (rand < 0.95) label = 'RAISE';
        else label = 'ALL IN';
      } else {
        if (rand < 0.65) label = 'CHECK';
        else if (rand < 0.85) label = 'RAISE';
        else if (rand < 0.95) label = 'FOLD';
        else label = 'ALL IN';
      }
      setTimeout(() => {
        setOppAction({ idx: opp.idx, label, thinking: false });
        addAIReaction(opp.name || `opponent-${opp.id}`);
      }, delay);
      delay += 700;
      setTimeout(() => {
        setOppAction(null);
        if (label === 'FOLD') {
          setOpponents(prev => prev.map(o => o.id === opp.id ? { ...o, folded: true } : o));
          setHandActions(prev => [...prev, { street: currentStreetRef.current, actor: opp.name, action: 'FOLD' }]);
        } else if (label === 'CALL' || label === 'RAISE' || label === 'ALL IN') {
          const callDiff = Math.max(0, currentBet - opp.bet);
          const betAdd = label === 'ALL IN' ? opp.balance : label === 'RAISE' ? callDiff + 50 : callDiff;
          const actual = Math.min(betAdd, opp.balance);
          setPot(prev => {
            const newPot = prev + actual;
            setHandActions(prevActs => [...prevActs, { street: currentStreetRef.current, actor: opp.name, action: label, amount: actual, potAfter: newPot }]);
            return newPot;
          });
          setOpponents(prev => prev.map(o =>
            o.id === opp.id
              ? { ...o, balance: Math.max(0, o.balance - actual), bet: o.bet + actual }
              : o
          ));
          if (label === 'RAISE') {
            setCurrentBet(prev => prev + 50);
          }
        } else {
          setHandActions(prev => [...prev, { street: currentStreetRef.current, actor: opp.name, action: 'CHECK' }]);
        }
      }, delay);
      delay += 150;
    });
    setTimeout(callback, delay + 200);
  }, [opponents, currentBet]);

  const startNewHand = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[1]];
    const newOpponents = opponents.map((opp, idx) => ({
      ...opp, bet: 0, folded: false, holeCards: undefined as Card[] | undefined,
      active: opp.name !== '' ? (idx < 4 || Math.random() > 0.3) : false,
    }));
    let cardIdx = 2;
    const withCards = newOpponents.map(o => {
      if (!o.active || !o.name) return o;
      const cards = [newDeck[cardIdx], newDeck[cardIdx + 1]];
      cardIdx += 2;
      return { ...o, holeCards: cards };
    });
    const activeOppIds = withCards.filter(o => o.active && o.name).map(o => o.id);
    const bbId = activeOppIds[0] ?? -1;
    const finalOpps = withCards.map(o => {
      if (!o.active) return o;
      if (o.id === bbId) return { ...o, bet: 20, balance: o.balance - 20, position: 'BB' };
      return { ...o, bet: 10, balance: o.balance - 10, position: o.position === 'BB' ? '' : o.position };
    });
    const oppPot = finalOpps.reduce((s, o) => s + o.bet, 0);
    const startPot = 10 + oppPot;
    setDeck(newDeck.slice(cardIdx));
    setPlayerHand(playerCards);
    playSound('card');
    setCommunityCards([]);
    setRevealedCommunity(0);
    setPot(startPot);
    setCurrentBet(20);
    setPlayerBet(10);
    setPlayerTotalBet(10);
    setPlayerChips([{ amount: 10, count: 1 }]);
    setOpponents(finalOpps);
    setGamePhase('preflop');
    setMessage("Pre-flop: Call 10 more to match the BB, raise, or fold?");
    setWinEffect(false);
    setLoseEffect(false);
    setWinText('');
    // Record forced blind postings at hand start
    const blindActions: { street: string; actor: string; action: string; amount?: number; potAfter?: number }[] = [
      { street: 'preflop', actor: 'You', action: 'POST SB', amount: 10 },
    ];
    finalOpps.forEach(o => {
      if (!o.active || !o.name) return;
      if (o.id === bbId) {
        blindActions.push({ street: 'preflop', actor: o.name, action: 'POST BB', amount: 20 });
      }
    });
    setHandActions(blindActions);
    setCurrentStreet('preflop');
    if (showVoice) announceEvent('New hand. Pre-flop betting.');
  }, [opponents, showVoice, announceEvent, playSound]);

  const dealCommunity = useCallback((count: number) => {
    // Burn the top card (standard poker procedure) before dealing community cards
    const afterBurn = deck.slice(1);
    const newCards = afterBurn.slice(0, count);
    setCommunityCards(prev => [...prev, ...newCards]);
    setDeck(afterBurn.slice(count));
    playSound('card');
    setTimeout(() => setRevealedCommunity(prev => prev + count), 100);
  }, [deck, playSound]);

  const animateChip = (amount: number) => {
    setFlyingChips(prev => [...prev, amount]);
    playSound('chip');
    setTimeout(() => setFlyingChips(prev => prev.filter(a => a !== amount)), 500);
  };

  const placeBet = (amount: number) => {
    if (!onBet(amount)) { setMessage('Insufficient balance!'); playSound('error'); return false; }
    animateChip(amount);
    const existing = playerChips.find(c => c.amount === amount);
    if (existing) setPlayerChips(playerChips.map(c => c.amount === amount ? { ...c, count: c.count + 1 } : c));
    else setPlayerChips([...playerChips, { amount, count: 1 }]);
    setPot(prev => prev + amount);
    setPlayerBet(prev => prev + amount);
    setPlayerTotalBet(prev => prev + amount);
    return true;
  };

  const recordAction = useCallback((actor: string, action: string, amount?: number, potAfter?: number) => {
    setHandActions(prev => [...prev, { street: currentStreetRef.current, actor, action, amount, potAfter }]);
  }, []);

  const handleFold = () => {
    if (serverConnected) { serverSendAction('fold'); return; }
    setMessage('You folded. Starting new hand...');
    playSound('clear');
    if (showVoice) announceEvent('You folded.');
    recordAction('You', 'FOLD');

    // Capture hand state before clearing
    const capturedActions = [...handActionsRef.current, { street: currentStreetRef.current, actor: 'You', action: 'FOLD' }];
    const capturedPot = pot;
    const capturedCommunityCards = [...communityCards];
    const capturedPlayerHand = [...playerHand];
    const capturedOpponents = [...opponents];
    const capturedPlayerTotalBet = playerTotalBet;

    // Save folded hand to DB
    if (isAuthenticated) {
      gameApi.savePokerHand({
        holeCards: capturedPlayerHand,
        communityCards: capturedCommunityCards,
        actions: capturedActions,
        pot: capturedPot,
        winner: 'opponent',
        winnerName: 'Fold',
        handName: 'Fold',
        net: -capturedPlayerTotalBet,
        opponents: capturedOpponents.filter(o => o.active && o.name).map(o => ({ name: o.name, folded: o.folded })),
      }).catch(() => {});
    }

    setPlayerChips([]);
    setTimeout(startNewHand, 2000);
  };

  const handleCheck = () => {
    if (serverConnected) { serverSendAction('check'); return; }
    setMessage('You checked.');
    playSound('click');
    if (showVoice) announceEvent('You checked.');
    recordAction('You', 'CHECK');
    advancePhase();
  };

  const handleCall = () => {
    if (serverConnected) { serverSendAction('call'); return; }
    const callAmount = currentBet - playerBet;
    if (placeBet(callAmount)) {
      setMessage(`You called ${callAmount} $Pc`);
      if (showVoice) announceEvent(`You called ${callAmount}.`);
      recordAction('You', 'CALL', callAmount, pot + callAmount);
      advancePhase();
    }
  };

  const handleRaise = () => {
    if (serverConnected) { serverSendAction('raise', { amount: selectedChip }); return; }
    const raiseAmount = selectedChip;
    const totalNeeded = (currentBet - playerBet) + raiseAmount;
    if (placeBet(totalNeeded)) {
      setCurrentBet(playerBet + raiseAmount);
      setMessage(`You raised to ${playerBet + raiseAmount} $Pc`);
      if (showVoice) announceEvent(`You raised to ${playerBet + raiseAmount}.`);
      recordAction('You', 'RAISE', totalNeeded, pot + totalNeeded);
      advancePhase();
    }
  };

  const handleAllIn = () => {
    if (serverConnected) { serverSendAction('allIn'); return; }
    const allInAmount = balance;
    if (placeBet(allInAmount)) {
      setCurrentBet(playerBet);
      setMessage('ALL IN!');
      playSound('win');
      if (showVoice) announceEvent('All in!');
      recordAction('You', 'ALL IN', allInAmount, pot + allInAmount);
      advancePhase();
    }
  };

  const advancePhase = () => {
    simulateOpponentActions(() => {
      switch (gamePhase) {
        case 'preflop':
          dealCommunity(3); setGamePhase('flop'); setCurrentBet(0); setPlayerBet(0);
          setPlayerChips([]); setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setCurrentStreet('flop');
          setMessage('The Flop. Check or bet?');
          if (showVoice) announceEvent('The flop.');
          break;
        case 'flop':
          dealCommunity(1); setGamePhase('turn'); setCurrentBet(0); setPlayerBet(0);
          setPlayerChips([]); setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setCurrentStreet('turn');
          setMessage('The Turn. Check or bet?');
          if (showVoice) announceEvent('The turn.');
          break;
        case 'turn':
          dealCommunity(1); setGamePhase('river'); setCurrentBet(0); setPlayerBet(0);
          setPlayerChips([]); setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setCurrentStreet('river');
          setMessage('The River. Final betting round.');
          if (showVoice) announceEvent('The river.');
          break;
        case 'river':
          setGamePhase('showdown'); resolveHand();
          break;
      }
    });
  };

  const resolveHand = () => {
    const playerAllCards = [...playerHand, ...communityCards];
    const playerBest = getBestHand(playerAllCards);
    const playerHandName = handRankings[playerBest.hand];

    const activeOpps = opponents.filter(o => o.active && o.name && !o.folded && o.holeCards?.length === 2);
    let bestOppScore = 0;
    let bestOppName = '';
    let bestOppCards: Card[] = [];
    let bestOppHandName = '';

    for (const opp of activeOpps) {
      const oppAllCards = [...(opp.holeCards || []), ...communityCards];
      const oppBest = getBestHand(oppAllCards);
      if (oppBest.score > bestOppScore) {
        bestOppScore = oppBest.score;
        bestOppName = opp.name;
        bestOppCards = opp.holeCards || [];
        bestOppHandName = handRankings[oppBest.hand];
      }
    }

    const playerWins = activeOpps.length === 0 || playerBest.score >= bestOppScore;
    const winningHandName = playerWins ? playerHandName : bestOppHandName;

    const capturedPot = pot;
    const capturedCommunityCards = [...communityCards];
    const capturedPlayerHand = [...playerHand];
    const capturedOpponents = [...opponents];
    const capturedActions = [...handActionsRef.current];

    if (playerWins) {
      const winAmount = capturedPot;
      onWin(winAmount);
      triggerWinBurst();
      addReaction('fire', 'you');
      triggerGameEvent(winAmount > 1000 ? 'bigWin' : 'win');
      setWinEffect(true);
      setPotSweepToUser(true);
      setTimeout(() => setPotSweepToUser(false), 1200);
      setWinText(`${playerHandName} — ${winAmount} $Pc!`);
      setMessage(`YOU WIN! ${playerHandName}`);
      playSound('win');
      if (showVoice) announceEvent(`Winner. You won ${winAmount} with ${playerHandName}.`);
      setShowdownData({ winner: 'player', handName: playerHandName, winAmount, opponentCards: bestOppCards.length ? bestOppCards : undefined, playerCards: playerHand });

      if (isAuthenticated) {
        gameApi.savePokerHand({
          holeCards: capturedPlayerHand,
          communityCards: capturedCommunityCards,
          actions: capturedActions,
          pot: capturedPot,
          winner: 'player',
          handName: playerHandName,
          net: capturedPot - playerTotalBet,
          opponents: capturedOpponents.filter(o => o.active && o.name).map(o => ({ name: o.name, folded: o.folded })),
        }).catch(() => {});
      }
    } else {
      setLoseEffect(true);
      setMessage(`${bestOppName} wins with ${bestOppHandName}`);
      playSound('lose');
      triggerGameEvent('lose');
      if (showVoice) announceEvent(`${bestOppName} wins with ${bestOppHandName}.`);
      setShowdownData({ winner: 'opponent', handName: bestOppHandName, winAmount: capturedPot, opponentName: bestOppName, opponentCards: bestOppCards });

      if (isAuthenticated) {
        gameApi.savePokerHand({
          holeCards: capturedPlayerHand,
          communityCards: capturedCommunityCards,
          actions: capturedActions,
          pot: capturedPot,
          winner: 'opponent',
          winnerName: bestOppName,
          handName: bestOppHandName,
          net: -playerTotalBet,
          opponents: capturedOpponents.filter(o => o.active && o.name).map(o => ({ name: o.name, folded: o.folded })),
        }).catch(() => {});
      }
    }
    setShowdownTimer(4);
    const countdown = setInterval(() => {
      setShowdownTimer(prev => {
        if (prev <= 1) { clearInterval(countdown); setPlayerChips([]); setShowdownData(null); startNewHand(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const clearBet = () => {
    const total = playerChips.reduce((sum, c) => sum + c.amount * c.count, 0);
    if (total > 0) { onWin(total); setPlayerChips([]); setPlayerBet(0); setMessage('Bet cleared'); playSound('clear'); }
  };

  useEffect(() => { startNewHand(); return () => stop(); }, []);

  const getPhaseLabel = () => {
    switch (gamePhase) {
      case 'preflop': return 'PRE-FLOP';
      case 'flop': return 'THE FLOP';
      case 'turn': return 'THE TURN';
      case 'river': return 'THE RIVER';
      case 'showdown': return 'SHOWDOWN';
      default: return '';
    }
  };

  /* 8-seat layout: 4 opponents on each side + dealer at top center + user at bottom center */
  const seatPositions: { style: React.CSSProperties; dir: 'up' | 'left' | 'right' | 'down'; betOffset: { x: number; y: number } }[] = [
    // LEFT SIDE — 4 seats top-to-bottom (dir: right = cards fly right)
    { style: { top: '6%',  left: '-4px' }, dir: 'right', betOffset: { x: -80, y: 0 } },
    { style: { top: '25%', left: '-4px' }, dir: 'right', betOffset: { x: -80, y: 0 } },
    { style: { top: '44%', left: '-4px' }, dir: 'right', betOffset: { x: -80, y: 0 } },
    { style: { top: '63%', left: '-4px' }, dir: 'right', betOffset: { x: -80, y: 0 } },
    // RIGHT SIDE — 4 seats top-to-bottom (dir: left = cards fly left)
    { style: { top: '6%',  right: '-4px' }, dir: 'left', betOffset: { x: 80, y: 0 } },
    { style: { top: '25%', right: '-4px' }, dir: 'left', betOffset: { x: 80, y: 0 } },
    { style: { top: '44%', right: '-4px' }, dir: 'left', betOffset: { x: 80, y: 0 } },
    { style: { top: '63%', right: '-4px' }, dir: 'left', betOffset: { x: 80, y: 0 } },
  ];

  return (
    <CasinoEnvironment gameType="poker">
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ you: 'bottom', ai1: 'left', ai2: 'top', ai3: 'right' }}
      />
      <div className="h-screen bg-[#0a0a0a] relative flex flex-col overflow-hidden">
        <style>{`
          @keyframes pokerTrailFade { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(0.3)} }
          @keyframes pokerPotGlow { 0%,100%{box-shadow:0 0 20px rgba(212,175,55,0.3),0 0 40px rgba(212,175,55,0.1)} 50%{box-shadow:0 0 30px rgba(212,175,55,0.5),0 0 60px rgba(212,175,55,0.2)} }
          @keyframes pokerMetallicShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
          @keyframes pokerCommunityReveal {
            0%{transform:perspective(800px) translateX(120px) rotateY(-90deg) scale(0.6);opacity:0;filter:blur(3px)}
            50%{transform:perspective(800px) translateX(10px) rotateY(-20deg) scale(1.05);opacity:1;filter:blur(0)}
            100%{transform:perspective(800px) translateX(0) rotateY(0deg) scale(1);opacity:1;filter:blur(0)}
          }
          @keyframes pokerWinPulse {
            0%{box-shadow:inset 0 0 60px rgba(34,197,94,0),0 0 0 0 rgba(212,175,55,0)}
            30%{box-shadow:inset 0 0 100px rgba(34,197,94,0.25),0 0 40px 10px rgba(212,175,55,0.3)}
            60%{box-shadow:inset 0 0 60px rgba(34,197,94,0.1),0 0 80px 20px rgba(212,175,55,0.15)}
            100%{box-shadow:inset 0 0 60px rgba(34,197,94,0),0 0 0 0 rgba(212,175,55,0)}
          }
          @keyframes pokerLoseShake {
            0%,100%{transform:translateX(0)} 10%{transform:translateX(-6px) rotate(-0.5deg)} 20%{transform:translateX(6px) rotate(0.5deg)}
            30%{transform:translateX(-4px) rotate(-0.3deg)} 40%{transform:translateX(4px) rotate(0.3deg)} 50%{transform:translateX(-2px)} 60%{transform:translateX(2px)}
          }
          @keyframes pokerWinTextAppear {
            0%{transform:translate(-50%,-50%) scale(0.3);opacity:0} 40%{transform:translate(-50%,-50%) scale(1.2);opacity:1}
            60%{transform:translate(-50%,-50%) scale(0.95)} 100%{transform:translate(-50%,-50%) scale(1);opacity:1}
          }
          @keyframes pokerGoldRing {
            0%{transform:translate(-50%,-50%) scale(0.3);opacity:1;border-width:4px} 100%{transform:translate(-50%,-50%) scale(2.5);opacity:0;border-width:1px}
          }
          @keyframes pokerChipsSweep { 0%{transform:translate(-50%,0) scale(1);opacity:1} 100%{transform:translate(-50%,160px) scale(0.3);opacity:0} }
          @keyframes chipToss { 0%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0.4)} 30%{opacity:1} 80%{opacity:0.9;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(0,0) scale(0.6)} }
          @keyframes betChipAppear { 0%{opacity:0;transform:scale(0) translateY(8px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes pokerSpotlight { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
          @keyframes oppActionIn { 0%{opacity:0;transform:scale(0.6)} 60%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
        `}</style>

        {flyingChips.map((amount, i) => (
          <AnimatedChipFly key={`chip-${i}-${amount}`} amount={amount} onComplete={() => {}} />
        ))}

        <PokerHandAnalyzer
          holeCards={playerHand}
          communityCards={communityCards}
          isVisible={showAnalyzer && playerHand.length > 0}
        />

        {winEffect && (
          <>
            <div className="fixed inset-0 z-[60] pointer-events-none" style={{ animation: 'pokerWinPulse 1.5s ease-out forwards' }} />
            <div className="fixed z-[61] pointer-events-none rounded-full border-[#D4AF37]" style={{ top: '50%', left: '50%', width: '100px', height: '100px', borderStyle: 'solid', animation: 'pokerGoldRing 1.2s ease-out forwards' }} />
            {winText && (
              <div className="fixed z-[63] pointer-events-none" style={{ top: '40%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'pokerWinTextAppear 0.8s ease-out forwards' }}>
                <div className="text-center">
                  <div className="text-4xl font-casino font-bold mb-2" style={{ background: 'linear-gradient(135deg,#D4AF37,#FFD700,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.8))' }}>WINNER!</div>
                  <div className="text-lg text-white font-bold" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>{winText}</div>
                </div>
              </div>
            )}
          </>
        )}

        {loseEffect && (
          <div className="fixed inset-0 z-[60] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center,rgba(183,28,28,0.15) 0%,transparent 70%)', animation: 'pokerLoseShake 0.6s ease-out' }} />
        )}

        {/* ── NAV ── */}
        <InGameTopBar
          gameName="Texas Hold'em"
          balance={balance}
          onBack={onBack}
          onAddBalance={onAddBalance}
          onShowWallet={onShowWallet}
          showShare
          rightSlot={
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GameBotBar bots={activeBots} onlineCount={onlinePlayerCount} compact chatMessages={chatMessages} />
              {voiceSupported && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setShowVoice(!showVoice)} className={showVoice ? 'text-[#D4AF37]' : 'text-gray-500'}>
                        {showVoice ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{showVoice ? 'Voice ON' : 'Voice OFF'}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowAnalyzer(!showAnalyzer)} className={showAnalyzer ? 'text-[#43A047]' : 'text-gray-500'}>
                      <span className="text-xs font-bold">AI</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{showAnalyzer ? 'Hand analyzer ON' : 'Hand analyzer OFF'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowHistory(h => !h)} className={showHistory ? 'text-[#D4AF37]' : 'text-gray-500'}>
                      <History className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Hand History</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                      <Info className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Poker rules & hand rankings</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        />

        {/* ── MAIN LAYOUT ── */}
        <div className="flex-1 flex relative z-10" style={{ minHeight: 0 }}>

          {/* Hand History Side Panel */}
          {showHistory && (
            <div style={{
              width: 340, flexShrink: 0,
              background: 'rgba(5,5,10,0.98)',
              borderRight: '1px solid rgba(212,175,55,0.2)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}>
              <PokerHandHistory isAuthenticated={isAuthenticated} />
            </div>
          )}

        <div className="flex-1 flex flex-col relative z-10" style={{ minHeight: 0 }}>
          {/* TABLE */}
          <div className="flex-1 relative px-6 pt-3 pb-0 min-h-0">
            <div
              className="relative w-full max-w-5xl mx-auto h-full"
              style={{ animation: loseEffect ? 'pokerLoseShake 0.6s ease-out' : undefined }}
            >
              {/* Wood rail */}
              <div className="absolute inset-0 rounded-[50%/38%]" style={{
                background: 'linear-gradient(180deg,#6D4C2E 0%,#5D4037 20%,#4E342E 50%,#3E2723 80%,#2E1F18 100%)',
                boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.1),inset 0 -4px 8px rgba(0,0,0,0.5),0 8px 40px rgba(0,0,0,0.8),0 0 0 2px rgba(212,175,55,0.4)',
              }} />
              {/* Gold notch rim */}
              <div className="absolute inset-0 rounded-[50%/38%] pointer-events-none" style={{
                background: 'repeating-conic-gradient(from 0deg,transparent 0deg 8deg,rgba(212,175,55,0.15) 8deg 9deg,transparent 9deg 18deg)',
                mask: 'radial-gradient(ellipse at center,transparent 85%,black 90%,black 100%)',
                WebkitMask: 'radial-gradient(ellipse at center,transparent 85%,black 90%,black 100%)',
              }} />

              {/* Felt */}
              <div className="absolute rounded-[50%/38%]" style={{
                inset: 14,
                background: tableSkin.felt,
                boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)',
              }}>
                <div className="absolute inset-0 opacity-50 rounded-[50%/38%]" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg,transparent 0px,rgba(255,255,255,0.015) 1px,transparent 2px,transparent 3px),repeating-linear-gradient(90deg,transparent 0px,rgba(255,255,255,0.01) 1px,transparent 2px,transparent 3px)',
                }} />
                <PremiumFeltOverlay borderRadius="50%/38%" goldBorderInset={0} showGoldBorder={false} showSpotlight={false} />
                <div className="absolute inset-[5%] border-2 border-dashed border-[#D4AF37]/20 rounded-[50%/38%]" />
                <div className="absolute inset-[4%] rounded-[50%/38%] pointer-events-none" style={{ border: '1.5px solid rgba(212,175,55,0.25)', boxShadow: 'inset 0 0 40px rgba(212,175,55,0.06)' }} />

                {/* Branding */}
                <div className="absolute top-[8%] left-1/2 -translate-x-1/2 pointer-events-none select-none" style={{ fontFamily:"'Cinzel',serif", fontSize:14, letterSpacing:'0.4em', color:'rgba(212,175,55,0.3)', whiteSpace:'nowrap' }}>
                  TEXAS HOLD'EM POKER
                </div>
                <TableBrand style={{ opacity: 0.09 }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[45%] pointer-events-none rounded-[50%/38%]" style={{ background:'radial-gradient(ellipse at center top,rgba(255,255,220,0.08) 0%,transparent 60%)', animation:'pokerSpotlight 4s ease-in-out infinite' }} />
              </div>

              {/* Phase badge */}
              <div className="absolute top-[2%] left-1/2 -translate-x-1/2 z-[15]">
                <div className="px-5 py-1.5 rounded-full" style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.85) 0%,rgba(20,20,20,0.95) 100%)', border:'1px solid rgba(212,175,55,0.5)', boxShadow:'0 4px 15px rgba(0,0,0,0.5)' }}>
                  <span className="text-[#D4AF37] font-casino text-sm tracking-[0.2em]">{getPhaseLabel()}</span>
                </div>
              </div>

              {/* Table limits */}
              <div className="absolute z-[15] pointer-events-none" style={{ top:'12%', left:'14%', background:'linear-gradient(135deg,rgba(0,0,0,0.95),rgba(20,20,20,0.98))', border:'1px solid rgba(212,175,55,0.6)', borderRadius:6, padding:'5px 10px' }}>
                <div style={{ fontSize:8, color:'#D4AF37', letterSpacing:'0.15em', fontWeight:700 }}>TABLE LIMITS</div>
                <div style={{ fontSize:9, color:'#C0C0C0', marginTop:2 }}>MIN 5 $Pc</div>
                <div style={{ fontSize:9, color:'#C0C0C0' }}>MAX 500 $Pc</div>
              </div>

              {/* (chip tray and card shoe removed) */}
              <div className="absolute z-[15] pointer-events-none" style={{ top:'12%', right:'14%', width:35, height:50, background:'linear-gradient(180deg,#1a1a1a,#0a0a0a)', border:'2px solid rgba(212,175,55,0.5)', borderRadius:4 }}>
                {[3,10,17].map(t => <div key={t} style={{ position:'absolute', top:t, left:4, right:4, height:5, background:'linear-gradient(180deg,#283593,#1a237e)', borderRadius:2 }} />)}
                <div style={{ position:'absolute', bottom:3, left:'50%', transform:'translateX(-50%)', fontSize:6, color:'rgba(212,175,55,0.6)', fontWeight:700 }}>SHOE</div>
              </div>

              {/* Opponent bet chip indicators near the pot */}
              {opponents.map((opp, idx) => {
                const pos = seatPositions[idx];
                if (!pos || !opp.active || opp.bet <= 0) return null;
                const offset = pos.betOffset;
                return (
                  <div key={`bet-${opp.id}`} className="absolute z-[16] pointer-events-none"
                    style={{
                      top: '32%', left: '50%',
                      transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
                      animation: 'betChipAppear 0.3s ease-out forwards',
                    }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#8B6914)', border: '2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,0.5)' }}>
                        {opp.bet >= 1000 ? `${Math.round(opp.bet/1000)}k` : opp.bet}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pot — also a drop target for chips (with large invisible hit area) */}
              <div
                className="absolute top-[14%] left-1/2 -translate-x-1/2 text-center z-[15]"
                style={{ width: 200, paddingTop: 20, paddingBottom: 14 }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const amount = parseInt(e.dataTransfer.getData('chip-amount'), 10);
                  if (amount > 0) placeBet(amount);
                }}
              >
              <div
                className="mx-auto"
                style={{ animation: pot > 0 ? 'pokerPotGlow 2s ease-in-out infinite' : 'none', background:'radial-gradient(ellipse at center,rgba(212,175,55,0.08) 0%,transparent 70%)', borderRadius:20, padding:'6px 20px', minWidth: 80, display:'inline-block' }}
              >
                <div style={{ fontSize:9, color:'#C0C0C0', letterSpacing:'0.3em', fontWeight:700, marginBottom:2 }}>POT</div>
                <div className="text-2xl font-bold text-[#D4AF37] gold-text">{pot.toLocaleString()}</div>
                <div className="text-xs text-[#C0C0C0]">$Pc</div>
                {pot > 0 && (
                  <div className="mt-1 relative" style={{ animation: potSweepToUser ? 'pokerChipsSweep 0.9s ease-in forwards' : undefined }}>
                    <PotChipStack pot={pot} />
                    {potSweepToUser && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37', textShadow: '0 0 10px #D4AF37', whiteSpace: 'nowrap', marginTop: -24 }}>
                          +{pot.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>

              {/* Community cards — larger, centered */}
              <div className="absolute left-1/2 -translate-x-1/2 z-[15] flex gap-3" style={{ top: '46%', transform: 'translate(-50%, -50%)' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ animation: communityCards[i] && i < revealedCommunity ? `pokerCommunityReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.15}s both` : undefined }}>
                    {communityCards[i] ? (
                      <PlayingCard card={communityCards[i]} size="lg" />
                    ) : (
                      <div style={{ width: 70, height: 100, borderRadius: 8, border: '2px dashed rgba(212,175,55,0.2)', background: 'rgba(0,0,0,0.15)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Dealer button */}
              <div className="absolute z-[15]" style={{ bottom: '28%', left: '48%' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f0f0f0,#c0c0c0,#ffffff,#e0e0e0)', border: '2px solid rgba(212,175,55,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1a1a1a', boxShadow: '0 4px 12px rgba(0,0,0,0.6)', animation: 'pokerMetallicShine 4s linear infinite', backgroundSize: '200% 100%' }}>
                  D
                </div>
              </div>

              {/* Dealer seat — always top center */}
              <div className="absolute z-[20]" style={{ top: '0%', left: '50%', transform: 'translateX(-50%)' }}>
                <DealerSeat dealer={dealer} />
              </div>

              {/* Opponent seats — 4 on left side, 4 on right side */}
              {opponents.map((opp, idx) => {
                const pos = seatPositions[idx];
                if (!pos) return null;
                const myAction = oppAction?.idx === idx ? { label: oppAction.label, thinking: oppAction.thinking } : null;
                return (
                  <div key={opp.id} className="absolute z-[20]" style={pos.style}>
                    <OpponentSeat
                      opponent={opp}
                      cardBackStyle={cardBackStyle}
                      cardDirection={pos.dir}
                      action={myAction}
                      onAvatarClick={opp.active && opp.name ? () => setProfilePopupIdx(idx) : undefined}
                    />
                  </div>
                );
              })}

              {/* User seat — bottom center */}
              <div className="absolute z-[20]" style={{ bottom: '2%', left: '50%', transform: 'translateX(-50%)' }}>
                <UserSeat
                  balance={balance}
                  playerBet={playerBet}
                  playerTotalBet={playerTotalBet}
                  playerHand={playerHand}
                  showdownWinner={showdownData?.winner}
                  userAvatar={userAvatar}
                  onAvatarChange={setUserAvatar}
                />
              </div>

              {/* Showdown overlay */}
              {showdownData && (
                <div className="absolute inset-0 z-[25] flex items-center justify-center pointer-events-none">
                  <div className="text-center px-6 py-4 rounded-2xl" style={{ background: 'radial-gradient(ellipse at center,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.82) 70%,transparent 100%)', minWidth: 360, maxWidth: 480 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 6, fontWeight: 800, color: 'rgba(212,175,55,0.75)' }}>SHOWDOWN</div>
                    <div className="text-2xl font-casino font-bold mb-1" style={{ color: showdownData.winner === 'player' ? '#D4AF37' : '#ef4444', textShadow: showdownData.winner === 'player' ? '0 0 24px rgba(212,175,55,0.7)' : '0 0 24px rgba(239,68,68,0.5)' }}>
                      {showdownData.handName.toUpperCase()}
                    </div>
                    <div className="text-base font-bold mb-4" style={{ color: showdownData.winner === 'player' ? '#43A047' : '#9ca3af' }}>
                      {showdownData.winner === 'player' ? `YOU WIN ${showdownData.winAmount.toLocaleString()} $Pc!` : `${showdownData.opponentName} wins this hand`}
                    </div>

                    {/* Community cards (board) */}
                    {communityCards.length > 0 && (
                      <div className="mb-3">
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>Board</div>
                        <div className="flex justify-center gap-1.5 items-center">
                          {communityCards.map((c, i) => (
                            <div key={i} style={{ animation: `pokerCommunityReveal 0.45s ease-out ${i * 0.08}s both` }}>
                              <PlayingCard card={c} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent)', marginBottom: 10 }} />

                    {/* Hole cards row: player + opponent side by side */}
                    <div className="flex justify-center gap-6 items-start">
                      {/* Player hole cards */}
                      {showdownData.playerCards && (
                        <div>
                          <div style={{ fontSize: 8, color: showdownData.winner === 'player' ? '#D4AF37' : 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>
                            {showdownData.winner === 'player' ? 'Your Cards' : 'Your Cards'}
                          </div>
                          <div className="flex justify-center gap-1.5 items-center">
                            {showdownData.playerCards.map((c, i) => (
                              <div key={i} style={{ animation: `pokerCommunityReveal 0.5s ease-out ${i * 0.12 + 0.2}s both`, filter: showdownData.winner === 'player' ? 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' : 'none' }}>
                                <PlayingCard card={c} size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Opponent hole cards */}
                      {showdownData.opponentCards && (
                        <div>
                          <div style={{ fontSize: 8, color: showdownData.winner === 'opponent' ? '#ef4444' : 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>
                            {showdownData.winner === 'opponent' ? showdownData.opponentName : showdownData.opponentName}
                          </div>
                          <div className="flex justify-center gap-1.5 items-center">
                            {showdownData.opponentCards.map((c, i) => (
                              <div key={i} style={{ animation: `pokerCommunityReveal 0.5s ease-out ${i * 0.12 + 0.35}s both`, filter: showdownData.winner === 'opponent' ? 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' : 'none' }}>
                                <PlayingCard card={c} size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-4">Next hand in {showdownTimer}s</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── STATUS MESSAGE + CHIPS ── */}
          <div className="relative z-20 px-4 py-2" style={{ background: 'linear-gradient(180deg,rgba(10,10,10,0.95) 0%,rgba(5,5,5,0.98) 100%)', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="max-w-4xl mx-auto">
              {message && (
                <div className="text-center mb-2">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'linear-gradient(135deg,rgba(0,0,0,0.9),rgba(20,15,10,0.95))', color: '#fff', border: '1px solid rgba(212,175,55,0.3)', textShadow: '0 0 8px rgba(212,175,55,0.4)' }}>
                    {message}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cash</span>
                    <span className="text-sm font-bold text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bet</span>
                    <span className="text-sm font-bold text-[#D4AF37]">{playerBet.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                  </div>
                  {winEffect && (
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Win</span>
                      <span className="text-sm font-bold text-[#43A047]">{pot.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                    </div>
                  )}
                </div>

                <div ref={chipAreaRef}>
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelect={setSelectedChip}
                    onDoubleClick={(amount) => placeBet(amount)}
                    balance={balance}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={{ background: 'linear-gradient(180deg,rgba(15,15,15,0.98),rgba(5,5,5,1))', borderTop: '2px solid rgba(212,175,55,0.3)', boxShadow: '0 -4px 20px rgba(0,0,0,0.6)' }}>
            <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
              <div className="flex justify-center flex-wrap gap-2 sm:gap-3">
                {gamePhase === 'showdown' ? (
                  <span className="text-gray-400 text-sm">Next hand in {showdownTimer}s...</span>
                ) : (
                  <>
                    <Button onClick={handleFold} variant="destructive" className="px-4 sm:px-6 py-3 rounded-lg font-bold text-sm bg-[#B71C1C] hover:bg-[#8B0000] min-h-[48px]" style={{ boxShadow: '0 3px 10px rgba(183,28,28,0.4)' }}>
                      FOLD
                    </Button>
                    {currentBet === 0 || playerBet >= currentBet ? (
                      <Button onClick={handleCheck} className="px-4 sm:px-6 py-3 rounded-lg font-bold text-sm bg-[#1E88E5] hover:bg-[#1565C0] min-h-[48px]" style={{ boxShadow: '0 3px 10px rgba(30,136,229,0.4)' }}>
                        CHECK
                      </Button>
                    ) : (
                      <Button onClick={handleCall} className="px-4 sm:px-6 py-3 rounded-lg font-bold text-sm bg-[#43A047] hover:bg-[#2E7D32] min-h-[48px]" style={{ boxShadow: '0 3px 10px rgba(67,160,71,0.4)' }}>
                        CALL ({currentBet - playerBet})
                      </Button>
                    )}
                    <Button onClick={handleRaise} className="px-4 sm:px-6 py-3 rounded-lg font-bold text-sm bg-[#D4AF37] hover:bg-[#B8860B] text-black min-h-[48px]" style={{ boxShadow: '0 3px 10px rgba(212,175,55,0.4)' }}>
                      RAISE +{selectedChip}
                    </Button>
                    <Button onClick={handleAllIn} className="px-4 sm:px-6 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-[#8B0000] to-[#B71C1C] min-h-[48px]" style={{ boxShadow: '0 3px 10px rgba(139,0,0,0.4)' }}>
                      ALL IN
                    </Button>
                    {playerChips.length > 0 && (
                      <Button onClick={clearBet} variant="outline" className="px-3 py-3 rounded-lg border-[#5D4037] text-[#C0C0C0] min-h-[48px] min-w-[48px]">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Rules dialog */}
        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-2xl text-gradient-gold">Texas Hold'em Rules</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Hand Rankings (Best to Worst)</h3>
                <div className="grid grid-cols-1 gap-1 text-gray-300">
                  {['Royal Flush - A\u2666 K\u2666 Q\u2666 J\u2666 10\u2666','Straight Flush - Five in a row, same suit','Four of a Kind - Four same rank','Full House - Three of a kind + pair','Flush - All five same suit','Straight - Five in order mixed suits','Three of a Kind','Two Pair','One Pair','High Card'].map((hand, i) => (
                    <div key={i} className="flex items-start gap-2 p-1 rounded hover:bg-white/5">
                      <span className="text-[#D4AF37] font-bold w-6">{i + 1}.</span>
                      <span>{hand}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Betting Actions</h3>
                <ul className="space-y-1 text-gray-300">
                  {["Check - Stay in, don't bet","Bet - Put chips into the pot","Call - Match another player's bet","Raise - Increase the current bet","Fold - Give up your hand","All-In - Bet all remaining chips"].map((a, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-[#D4AF37]">•</span>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Game Flow</h3>
                <ol className="space-y-1 text-gray-300">
                  {['Pre-Flop: Bet after receiving 2 hole cards','The Flop: 3 community cards dealt','The Turn: 4th community card','The River: 5th community card','Showdown: Best 5-card hand wins'].map((s, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-[#D4AF37] font-bold">{i + 1}.</span>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* In-game public profile popup for opponent seats */}
        <PublicProfileCard
          username={profilePopupIdx != null ? (opponents[profilePopupIdx]?.name || null) : null}
          onClose={() => setProfilePopupIdx(null)}
          fallbackPlayer={profilePopupIdx != null && opponents[profilePopupIdx] ? {
            displayName: opponents[profilePopupIdx].name,
            isBot: true,
            avatarDef: ALL_AVATARS[opponents[profilePopupIdx].avatarIdx % ALL_AVATARS.length],
          } : undefined}
          inGameContext={profilePopupIdx != null && opponents[profilePopupIdx] ? {
            action: oppAction?.idx === profilePopupIdx && !oppAction.thinking ? oppAction.label : (opponents[profilePopupIdx].folded ? 'FOLD' : null),
            currentBet: opponents[profilePopupIdx].bet,
            cashAtTable: opponents[profilePopupIdx].balance,
            cashLabel: 'Stack',
            gameLabel: 'Poker',
          } : undefined}
        />
      </div>
    </CasinoEnvironment>
  );
}
