import { useState, useEffect } from 'react';
import { gameApi } from '@/lib/api';
import { PokerHandReplay } from '@/components/PokerHandReplay';
import type { PokerHandRecord } from '@/components/PokerHandReplay';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface PokerHandSharePageProps {
  token: string;
  onBack?: () => void;
}

export function PokerHandSharePage({ token, onBack }: PokerHandSharePageProps) {
  const [hand, setHand] = useState<PokerHandRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHand = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gameApi.getPokerHandByToken(token);
        setHand(data.hand);
      } catch (err: any) {
        setError(err.message || 'Hand not found');
      } finally {
        setLoading(false);
      }
    };
    fetchHand();
  }, [token]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0c0820 0%, #050510 60%, #020208 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 16px',
    }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 600, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back
            </button>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.05em' }}>
              ♠ Poker Hand Replay
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>$Pc Casino · Texas Hold'em</div>
          </div>
        </div>

        {hand && (
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            Shared by <span style={{ color: '#9ca3af', fontWeight: 700 }}>{hand.username}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 600 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14 }}>Loading hand replay...</div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: '24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 700 }}>Hand Not Found</div>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{error}</div>
          </div>
        )}

        {hand && !loading && (
          <PokerHandReplay hand={hand} compact={false} />
        )}

        {!loading && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8 }}>Play at $Pc Casino</div>
            {onBack ? (
              <button
                onClick={onBack}
                style={{
                  padding: '8px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Play Now →
              </button>
            ) : (
              <a
                href="/"
                style={{
                  display: 'inline-block', padding: '8px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000',
                  textDecoration: 'none',
                }}
              >
                Play Now →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
