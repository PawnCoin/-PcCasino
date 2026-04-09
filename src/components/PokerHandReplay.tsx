import { useState } from 'react';
import { PlayingCard } from '@/components/PlayingCard';
import { ChevronDown, ChevronUp, Share2, Trophy, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CasinoIcon } from '@/components/CasinoIcons';

interface PokerAction {
  street: string;
  actor: string;
  action: string;
  amount?: number;
  potAfter?: number;
}

interface PokerHandRecord {
  id: number;
  share_token: string;
  hole_cards: any[];
  community_cards: any[];
  actions: PokerAction[];
  pot: number;
  winner: 'player' | 'opponent';
  winner_name?: string;
  hand_name?: string;
  net: number;
  opponents?: any[];
  created_at: string;
  username?: string;
}

interface PokerHandReplayProps {
  hand: PokerHandRecord;
  compact?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663',
};
const SUIT_COLORS: Record<string, string> = {
  spades: '#fff', hearts: '#ef4444', diamonds: '#ef4444', clubs: '#fff',
};

function MiniCard({ card }: { card: { rank: string; suit: string } }) {
  const color = SUIT_COLORS[card.suit] || '#fff';
  const symbol = SUIT_SYMBOLS[card.suit] || '';
  return (
    <div style={{
      width: 36, height: 50, borderRadius: 5,
      background: 'linear-gradient(135deg,#1a1a2e,#16213e)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color, fontSize: 13, fontWeight: 800, flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      <div>{card.rank}</div>
      <div style={{ fontSize: 11 }}>{symbol}</div>
    </div>
  );
}

const STREET_ORDER = ['preflop', 'flop', 'turn', 'river'];
const STREET_LABELS: Record<string, string> = {
  preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River',
};

function groupActionsByStreet(actions: PokerAction[]) {
  const grouped: Record<string, PokerAction[]> = {};
  for (const a of actions) {
    const s = a.street || 'preflop';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(a);
  }
  return grouped;
}

export function PokerHandReplay({ hand, compact = false }: PokerHandReplayProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [replayStep, setReplayStep] = useState<number | null>(null);

  const shareUrl = `${window.location.origin}/poker/hand/${hand.share_token}`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.info(`Share URL: ${shareUrl}`);
    }
  };

  const isWin = hand.winner === 'player';
  const netDisplay = hand.net >= 0 ? `+${hand.net.toLocaleString()}` : hand.net.toLocaleString();
  const timeAgo = formatTimeAgo(hand.created_at);

  const streetGroups = groupActionsByStreet(hand.actions || []);
  const allActions = hand.actions || [];

  const displayedActions = replayStep !== null ? allActions.slice(0, replayStep) : allActions;
  const currentStreetActions = replayStep !== null ? displayedActions : allActions;

  const communityByStreet: Record<string, any[]> = {
    flop: hand.community_cards.slice(0, 3),
    turn: hand.community_cards.slice(0, 4),
    river: hand.community_cards.slice(0, 5),
  };

  return (
    <div style={{
      background: 'rgba(10,10,20,0.95)',
      border: `1.5px solid ${isWin ? 'rgba(212,175,55,0.5)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      {/* Summary row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          cursor: compact ? 'pointer' : 'default',
          background: isWin ? 'rgba(212,175,55,0.06)' : 'rgba(239,68,68,0.04)',
        }}
        onClick={() => compact && setExpanded(e => !e)}
      >
        {/* Win/Loss badge */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: isWin ? 'rgba(212,175,55,0.2)' : 'rgba(239,68,68,0.15)',
          border: `2px solid ${isWin ? '#D4AF37' : '#ef4444'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          <CasinoIcon name={isWin ? 'trophy' : 'chart-down'} size={16} />
        </div>

        {/* Hole cards */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {hand.hole_cards.map((c, i) => <MiniCard key={i} card={c} />)}
        </div>

        {/* Hand info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isWin ? '#D4AF37' : '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hand.hand_name || (isWin ? 'WIN' : 'LOSS')}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
            <Clock style={{ width: 9, height: 9, display: 'inline', marginRight: 3 }} />{timeAgo}
          </div>
        </div>

        {/* Net */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: hand.net >= 0 ? '#43A047' : '#ef4444' }}>
            {netDisplay} $Pc
          </div>
          <div style={{ fontSize: 9, color: '#6b7280' }}>Pot: {hand.pot.toLocaleString()}</div>
        </div>

        {/* Share button */}
        <button
          onClick={e => { e.stopPropagation(); handleShare(); }}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, flexShrink: 0 }}
        >
          <Share2 style={{ width: 11, height: 11 }} />
          Share
        </button>

        {compact && (
          <div style={{ color: '#6b7280', flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
          </div>
        )}
      </div>

      {/* Expanded replay */}
      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Community cards */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#6b7280', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Board</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {hand.community_cards.length === 0 && (
                <div style={{ fontSize: 11, color: '#4b5563' }}>No community cards (folded pre-flop)</div>
              )}
              {hand.community_cards.map((c, i) => (
                <div key={i} style={{
                  opacity: replayStep !== null ? (
                    i < 3 ? (currentStreetActions.some(a => a.street === 'flop') ? 1 : 0.2)
                    : i === 3 ? (currentStreetActions.some(a => a.street === 'turn') ? 1 : 0.2)
                    : (currentStreetActions.some(a => a.street === 'river') ? 1 : 0.2)
                  ) : 1,
                  transition: 'opacity 0.3s',
                }}>
                  <MiniCard card={c} />
                </div>
              ))}
            </div>
          </div>

          {/* Action replay by street */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#6b7280', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Action Timeline</div>
            {STREET_ORDER.map(street => {
              const acts = streetGroups[street];
              if (!acts?.length) return null;
              return (
                <div key={street} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 4 }}>
                    ── {STREET_LABELS[street]} ──
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {acts.map((a, i) => {
                      const globalIdx = allActions.indexOf(a);
                      const visible = replayStep === null || globalIdx < replayStep;
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
                          opacity: visible ? 1 : 0.2, transition: 'opacity 0.3s',
                          background: 'rgba(255,255,255,0.03)', borderRadius: 5, padding: '3px 8px',
                        }}>
                          <span style={{ color: a.actor === 'You' ? '#D4AF37' : '#9ca3af', fontWeight: 700, minWidth: 50 }}>{a.actor}</span>
                          <span style={{
                            padding: '1px 7px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                            background: a.action === 'FOLD' ? 'rgba(239,68,68,0.2)' :
                              a.action === 'RAISE' || a.action === 'ALL IN' ? 'rgba(212,175,55,0.2)' :
                              a.action === 'CALL' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.15)',
                            color: a.action === 'FOLD' ? '#ef4444' :
                              a.action === 'RAISE' || a.action === 'ALL IN' ? '#D4AF37' :
                              a.action === 'CALL' ? '#43A047' : '#60a5fa',
                            border: `1px solid currentColor`,
                          }}>{a.action}</span>
                          {a.amount ? <span style={{ color: '#6b7280' }}>{a.amount.toLocaleString()} $Pc</span> : null}
                          {a.potAfter ? <span style={{ color: '#4b5563', marginLeft: 'auto', fontSize: 9 }}>Pot: {a.potAfter.toLocaleString()}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {allActions.length === 0 && (
              <div style={{ fontSize: 11, color: '#4b5563', fontStyle: 'italic' }}>No actions recorded</div>
            )}
          </div>

          {/* Replay controls */}
          {allActions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <button
                onClick={() => setReplayStep(1)}
                style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', cursor: 'pointer', fontWeight: 700 }}
              >
                ▶ Replay
              </button>
              {replayStep !== null && replayStep < allActions.length && (
                <button
                  onClick={() => setReplayStep(s => Math.min((s ?? 0) + 1, allActions.length))}
                  style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}
                >
                  Next →
                </button>
              )}
              {replayStep !== null && (
                <button
                  onClick={() => setReplayStep(null)}
                  style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', cursor: 'pointer' }}
                >
                  Show All
                </button>
              )}
              {replayStep !== null && (
                <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 4 }}>
                  Step {replayStep} / {allActions.length}
                </span>
              )}
            </div>
          )}

          {/* Result */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: 10, color: '#6b7280' }}>Result: </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isWin ? '#43A047' : '#ef4444' }}>
                {isWin ? `YOU WIN — ${hand.hand_name || ''}` : `${hand.winner_name || 'Opponent'} wins — ${hand.hand_name || ''}`}
              </span>
            </div>
            <button
              onClick={handleShare}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
                padding: '4px 12px', borderRadius: 6,
                background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)',
                color: '#D4AF37', cursor: 'pointer',
              }}
            >
              <Share2 style={{ width: 11, height: 11 }} />
              Copy Share Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const ts = new Date(dateStr).getTime();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export type { PokerHandRecord, PokerAction };
