import { useState, useEffect, useCallback, useRef } from 'react';
import { CasinoIcon } from '@/components/CasinoIcons';

export const CELEBRATION_EMOJIS = ['celebrate', 'fire', 'money-bag', 'angry', 'money-face', 'crown', 'salute', 'gem'];
export const AI_REACTION_EMOJIS = ['fire', 'clap', 'angry', 'celebrate', 'skull', 'shaka'];

export interface CelebrationReaction {
  id: string;
  player: string;
  emoji: string;
  x?: number;
  y?: number;
}

export interface WinBurst {
  id: string;
  x: number;
  y: number;
  emojis: string[];
}


function getDefaultPosition(player: string, positions: Record<string, 'top' | 'left' | 'right' | 'bottom'>): { x: number; y: number } {
  const side = positions[player];
  const w = typeof window !== 'undefined' ? window.innerWidth : 800;
  const h = typeof window !== 'undefined' ? window.innerHeight : 600;
  if (side === 'top') return { x: w / 2, y: h * 0.22 };
  if (side === 'left') return { x: w * 0.12, y: h / 2 };
  if (side === 'right') return { x: w * 0.88, y: h / 2 };
  if (side === 'bottom') return { x: w / 2, y: h * 0.78 };
  if (player === 'you') return { x: w / 2, y: h * 0.72 };
  return { x: w / 2, y: h * 0.3 };
}

interface FloatingReactionProps {
  reaction: CelebrationReaction;
  playerPositions?: Record<string, 'top' | 'left' | 'right' | 'bottom'>;
}

function FloatingReaction({ reaction, playerPositions = {} }: FloatingReactionProps) {
  const [opacity, setOpacity] = useState(1);
  const [yOff, setYOff] = useState(0);

  const defaultPos = getDefaultPosition(reaction.player, playerPositions);
  const startX = reaction.x ?? defaultPos.x;
  const startY = reaction.y ?? defaultPos.y;

  useEffect(() => {
    const start = Date.now();
    const duration = 2400;
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setYOff(-progress * 80);
      setOpacity(progress < 0.55 ? 1 : 1 - (progress - 0.55) / 0.45);
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      left: startX,
      top: startY,
      transform: `translateX(-50%) translateY(${yOff}px)`,
      zIndex: 9999,
      pointerEvents: 'none',
      opacity,
      animation: 'celebBubblePop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      <div style={{
        background: 'rgba(10,10,18,0.92)',
        border: '1.5px solid rgba(212,175,55,0.5)',
        borderRadius: 16,
        padding: '6px 10px',
        fontSize: 24,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 12px rgba(212,175,55,0.2)',
        backdropFilter: 'blur(4px)',
        minWidth: 44,
        textAlign: 'center',
      }}>
        <CasinoIcon name={reaction.emoji} size={24} />
      </div>
      <div style={{
        position: 'absolute',
        bottom: -7,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 11,
        height: 11,
        background: 'rgba(10,10,18,0.92)',
        border: '1.5px solid rgba(212,175,55,0.5)',
        borderRadius: '50%',
      }} />
    </div>
  );
}

interface WinBurstDisplayProps {
  burst: WinBurst;
  onComplete: () => void;
}

function WinBurstDisplay({ burst, onComplete }: WinBurstDisplayProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <>
      {burst.emojis.map((emoji, i) => {
        const angle = (i / burst.emojis.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 80 + Math.random() * 60;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist;
        const delay = i * 40;
        const duration = 900 + Math.random() * 400;

        return (
          <div
            key={i}
            style={{
              position: 'fixed',
              left: burst.x,
              top: burst.y,
              zIndex: 9998,
              pointerEvents: 'none',
              animation: `celebBurst ${duration}ms ease-out ${delay}ms both`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
            } as unknown as React.CSSProperties}
          >
            <CasinoIcon name={emoji} size={20 + Math.random() * 14} />
          </div>
        );
      })}
    </>
  );
}

interface EmojiReactionPickerProps {
  onReact: (emoji: string) => void;
  emojis?: string[];
  enabled?: boolean;
}

export function EmojiReactionPicker({ onReact, emojis = CELEBRATION_EMOJIS, enabled = true }: EmojiReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [lastCooldown, setLastCooldown] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleReact = (emoji: string) => {
    const now = Date.now();
    if (now - lastCooldown < 600) return;
    setLastCooldown(now);
    onReact(emoji);
    setOpen(false);
  };

  if (!enabled) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${open ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10,
          padding: '5px 10px',
          cursor: 'pointer',
          fontSize: 16,
          color: '#D4AF37',
          transition: 'all 0.15s',
        }}
        title="Send reaction"
      >
        <CasinoIcon name="smile" size={16} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,10,20,0.96)',
          border: '1.5px solid rgba(212,175,55,0.35)',
          borderRadius: 14,
          padding: '8px 10px',
          display: 'flex',
          gap: 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          animation: 'celebPickerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
          zIndex: 200,
          backdropFilter: 'blur(8px)',
        }}>
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 22,
                padding: '2px 4px',
                borderRadius: 8,
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <CasinoIcon name={emoji} size={22} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CelebrationSystemProps {
  enabled: boolean;
  reactions: CelebrationReaction[];
  winBursts?: WinBurst[];
  onBurstComplete?: (id: string) => void;
  playerPositions?: Record<string, 'top' | 'left' | 'right' | 'bottom'>;
}

export function CelebrationSystem({
  enabled,
  reactions,
  winBursts = [],
  onBurstComplete,
  playerPositions = {},
}: CelebrationSystemProps) {
  if (!enabled) return null;

  return (
    <>
      <style>{`
        @keyframes celebBubblePop {
          0%   { transform: translateX(-50%) scale(0.3) translateY(10px); opacity: 0; }
          60%  { transform: translateX(-50%) scale(1.1) translateY(-2px); opacity: 1; }
          80%  { transform: translateX(-50%) scale(0.96) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
        }
        @keyframes celebBubbleFade {
          0%,70% { opacity: 1; }
          100%    { opacity: 0; }
        }
        @keyframes celebBurst {
          0%   { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
          60%  { transform: translate(var(--tx), var(--ty)) scale(1.2) rotate(20deg); opacity: 1; }
          100% { transform: translate(calc(var(--tx)*1.4), calc(var(--ty)*1.4)) scale(0.5) rotate(40deg); opacity: 0; }
        }
        @keyframes celebPickerIn {
          0%  { transform: translateX(-50%) scale(0.8) translateY(6px); opacity: 0; }
          100%{ transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
        }
        @keyframes celebSparkle {
          0%,100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
          50%     { transform: scale(1.3) rotate(180deg); opacity: 1; }
        }
      `}</style>

      {reactions.map(r => (
        <FloatingReaction key={r.id} reaction={r} playerPositions={playerPositions} />
      ))}

      {winBursts.map(burst => (
        <WinBurstDisplay
          key={burst.id}
          burst={burst}
          onComplete={() => onBurstComplete?.(burst.id)}
        />
      ))}
    </>
  );
}

export function useReactions(enabled: boolean) {
  const [reactions, setReactions] = useState<CelebrationReaction[]>([]);
  const [winBursts, setWinBursts] = useState<WinBurst[]>([]);

  const addReaction = useCallback((emoji: string, player: string = 'you', x?: number, y?: number) => {
    if (!enabled) return;
    const r: CelebrationReaction = {
      id: `${Date.now()}-${Math.random()}`,
      player,
      emoji,
      x,
      y,
    };
    setReactions(prev => [...prev.slice(-6), r]);
    setTimeout(() => setReactions(prev => prev.filter(rx => rx.id !== r.id)), 2800);
  }, [enabled]);

  const triggerWinBurst = useCallback((x?: number, y?: number) => {
    if (!enabled) return;
    const emojis = ['celebrate', 'fire', 'money-bag', 'money-face', 'crown', 'gem', 'star', 'confetti'];
    const burst: WinBurst = {
      id: `burst-${Date.now()}`,
      x: x ?? window.innerWidth / 2,
      y: y ?? window.innerHeight / 2,
      emojis: Array.from({ length: 12 }, (_, i) => emojis[i % emojis.length]),
    };
    setWinBursts(prev => [...prev, burst]);
  }, [enabled]);

  const removeBurst = useCallback((id: string) => {
    setWinBursts(prev => prev.filter(b => b.id !== id));
  }, []);

  const addAIReaction = useCallback((player: string) => {
    if (!enabled) return;
    if (Math.random() > 0.65) {
      const emoji = AI_REACTION_EMOJIS[Math.floor(Math.random() * AI_REACTION_EMOJIS.length)];
      setTimeout(() => addReaction(emoji, player), 150 + Math.random() * 300);
    }
  }, [enabled, addReaction]);

  return { reactions, winBursts, addReaction, triggerWinBurst, removeBurst, addAIReaction };
}

interface TableBrandProps {
  className?: string;
  style?: React.CSSProperties;
}

export function TableBrand({ className, style }: TableBrandProps) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: '50%',
        left: '50%',
        transform: 'translate(-50%, 50%)',
        pointerEvents: 'none',
        zIndex: 3,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        opacity: 0.12,
        ...style,
      }}
    >
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.9)',
        fontFamily: "'Cinzel', 'Georgia', serif",
        textShadow: '0 1px 0 rgba(0,0,0,0.5)',
        mixBlendMode: 'overlay',
      }}>
        $Pc
      </div>
      <div style={{
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.25em',
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
        fontFamily: "'Cinzel', serif",
      }}>
        CASINO
      </div>
    </div>
  );
}
