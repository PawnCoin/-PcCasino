import { useState, useEffect } from 'react';
import { gameApi } from '@/lib/api';
import { PokerHandReplay } from '@/components/PokerHandReplay';
import type { PokerHandRecord } from '@/components/PokerHandReplay';
import { History, RefreshCw, AlertCircle } from 'lucide-react';

interface PokerHandHistoryProps {
  isAuthenticated: boolean;
}

export function PokerHandHistory({ isAuthenticated }: PokerHandHistoryProps) {
  const [hands, setHands] = useState<PokerHandRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchHands = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await gameApi.getPokerHands();
      setHands(data.hands || []);
      setFetched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load hand history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !fetched) {
      fetchHands();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Sign in to view your hand history</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History style={{ width: 16, height: 16, color: '#D4AF37' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Hand History</span>
          {hands.length > 0 && (
            <span style={{ fontSize: 10, color: '#6b7280', background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '1px 7px' }}>
              {hands.length} hands
            </span>
          )}
        </div>
        <button
          onClick={fetchHands}
          disabled={loading}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}
        >
          <RefreshCw style={{ width: 11, height: 11, animation: loading ? 'spin 1s linear infinite' : undefined }} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {loading && !fetched && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', fontSize: 13 }}>
            Loading hand history...
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 12, marginBottom: 10 }}>
            <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
            {error}
          </div>
        )}

        {!loading && fetched && hands.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🃏</div>
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No hands recorded yet</div>
            <div style={{ color: '#4b5563', fontSize: 11, marginTop: 4 }}>Play a few hands to see your history here</div>
          </div>
        )}

        {hands.map(hand => (
          <PokerHandReplay key={hand.id} hand={hand} compact />
        ))}
      </div>
    </div>
  );
}
