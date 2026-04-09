import { type CasinoBot } from '@/hooks/useCasinoBots';
import { Users } from 'lucide-react';

interface GameBotBarProps {
  bots: CasinoBot[];
  onlineCount: number;
  maxVisible?: number;
  compact?: boolean;
  showStatus?: boolean;
}

const VIP_COLORS: Record<string, string> = {
  gold: '#D4AF37',
  silver: '#9E9E9E',
  bronze: '#8D6E63',
};

export function GameBotBar({ bots, onlineCount, maxVisible = 5, compact = false, showStatus = true }: GameBotBarProps) {
  const visible = bots.slice(0, maxVisible);

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 14, background: 'rgba(67,160,71,0.1)', border: '1px solid rgba(67,160,71,0.25)' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
        <Users style={{ width: 11, height: 11, color: '#66BB6A' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlineCount}</span>
        <div style={{ display: 'flex', marginLeft: 2 }}>
          {visible.slice(0, 3).map((bot, i) => (
            <img
              key={bot.id}
              src={bot.photoUrl}
              alt={bot.name}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `1px solid ${VIP_COLORS[bot.vipTier]}`,
                objectFit: 'cover',
                marginLeft: i === 0 ? 0 : -4,
                position: 'relative',
                zIndex: 3 - i,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(67,160,71,0.2)', borderRadius: 10, padding: '10px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlineCount} players online</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map(bot => (
          <div key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={bot.photoUrl} alt={bot.name} style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${VIP_COLORS[bot.vipTier]}`, objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%',
                background: VIP_COLORS[bot.vipTier], border: '1px solid #111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 4, fontWeight: 900, color: '#000',
              }}>
                {bot.vipTier === 'gold' ? 'G' : bot.vipTier === 'silver' ? 'S' : 'B'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bot.name}</div>
              {showStatus && (
                <div style={{ fontSize: 8, color: '#66BB6A', fontWeight: 600 }}>{bot.status}</div>
              )}
            </div>
            {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
              <span style={{ fontSize: 12 }}>{bot.lastReactionEmoji}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: '#d1d5db', textAlign: 'center', marginTop: 6 }}>Live table</div>
    </div>
  );
}

export function GameBotLobbyRow({ bots, onlineCount }: { bots: CasinoBot[]; onlineCount: number }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 11, color: '#d1d5db' }}><strong style={{ color: '#66BB6A' }}>{onlineCount}</strong> players at table</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
        {bots.slice(0, 6).map(bot => (
          <div key={bot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ position: 'relative' }}>
              <img src={bot.photoUrl} alt={bot.name} style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${VIP_COLORS[bot.vipTier]}`, objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%',
                background: VIP_COLORS[bot.vipTier], border: '1.5px solid #111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 5, fontWeight: 900, color: '#000',
              }}>
                {bot.vipTier === 'gold' ? 'G' : bot.vipTier === 'silver' ? 'S' : 'B'}
              </div>
            </div>
            <span style={{ fontSize: 8, color: '#d1d5db', maxWidth: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bot.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
