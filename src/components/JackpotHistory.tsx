import { useState, useEffect } from 'react';
import { Trophy, X, Clock, User, Coins } from 'lucide-react';
import { jackpotApi } from '@/lib/api';

interface JackpotWin {
  id: number;
  username: string;
  amount: number;
  won_at: string;
}

interface JackpotHistoryProps {
  onClose: () => void;
}

export function JackpotHistory({ onClose }: JackpotHistoryProps) {
  const [history, setHistory] = useState<JackpotWin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jackpotApi.getHistory()
      .then(data => setHistory(data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const formatAmount = (n: number) => {
    if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(2))}M`;
    if (n >= 1_000) return `${parseFloat((n / 1_000).toFixed(1))}K`;
    return n.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1a1100, #0d0a00)',
          border: '1px solid rgba(212,175,55,0.4)',
          boxShadow: '0 0 50px rgba(212,175,55,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)' }}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="font-bold text-yellow-300 text-base">Jackpot Hall of Fame</h2>
              <p className="text-xs text-yellow-700">Past progressive jackpot winners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🎰</div>
              <div className="text-yellow-600 font-medium">No jackpots won yet</div>
              <div className="text-gray-600 text-sm mt-1">Be the first to hit the jackpot!</div>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {history.map((win, idx) => (
                <div
                  key={win.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{
                    background: idx === 0 ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                    border: idx === 0 ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      background: idx === 0 ? 'linear-gradient(135deg, #D4AF37, #FFD700)' : 'rgba(255,255,255,0.08)',
                      color: idx === 0 ? '#000' : '#888',
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                      <span className="font-semibold text-yellow-200 text-sm truncate">{win.username}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                      <span className="text-xs text-gray-500">{formatDate(win.won_at)}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Coins className="w-3.5 h-3.5 text-yellow-500" />
                      <span
                        className="font-casino font-bold text-sm"
                        style={{ color: '#FFD700', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}
                      >
                        {formatAmount(win.amount)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">$Pc</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="px-6 py-3 border-t text-center"
          style={{ borderColor: 'rgba(212,175,55,0.15)' }}
        >
          <p className="text-xs text-gray-600">
            Every bet contributes 1% to the progressive jackpot pool
          </p>
        </div>
      </div>
    </div>
  );
}
