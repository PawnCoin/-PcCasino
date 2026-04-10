import { type CasinoBot, type BotChatMessage } from '@/hooks/useCasinoBots';
import { Users, MessageCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface GameBotBarProps {
  bots: CasinoBot[];
  onlineCount: number;
  maxVisible?: number;
  compact?: boolean;
  showStatus?: boolean;
  chatMessages?: BotChatMessage[];
  showChat?: boolean;
}

const VIP_COLORS: Record<string, string> = {
  gold: '#D4AF37',
  silver: '#9E9E9E',
  bronze: '#8D6E63',
};

const VIP_GLOW: Record<string, string> = {
  gold: '0 0 6px rgba(212,175,55,0.5)',
  silver: '0 0 4px rgba(158,158,158,0.4)',
  bronze: 'none',
};

function formatBet(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

function BotChatBubble({ message }: { message: BotChatMessage }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 8px',
      animation: 'botChatIn 0.3s ease-out',
    }}>
      <img src={message.botPhoto} alt={message.botName} style={{
        width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.2)',
      }} />
      <div>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#D4AF37' }}>{message.botName}</span>
        <div style={{ fontSize: 9, color: '#d1d5db', lineHeight: 1.3, marginTop: 1 }}>{message.message}</div>
      </div>
    </div>
  );
}

export function GameBotBar({ bots, onlineCount, maxVisible = 6, compact = false, showStatus = true, chatMessages = [], showChat = false }: GameBotBarProps) {
  const visible = bots.slice(0, maxVisible);
  const recentChat = chatMessages.slice(-3);

  if (compact) {
    const latestMsg = recentChat.length > 0 ? recentChat[recentChat.length - 1] : null;
    const showBubble = latestMsg && Date.now() - latestMsg.timestamp < 8000;
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 14, background: 'rgba(67,160,71,0.1)', border: '1px solid rgba(67,160,71,0.25)' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
          <Users style={{ width: 11, height: 11, color: '#66BB6A' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlineCount}</span>
          <div style={{ display: 'flex', marginLeft: 2 }}>
            {visible.slice(0, 4).map((bot, i) => (
              <div key={bot.id} style={{ position: 'relative', marginLeft: i === 0 ? 0 : -5, zIndex: 4 - i }}>
                <img
                  src={bot.photoUrl}
                  alt={bot.name}
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `1.5px solid ${VIP_COLORS[bot.vipTier]}`,
                    objectFit: 'cover',
                    boxShadow: VIP_GLOW[bot.vipTier],
                  }}
                />
                {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
                  <span style={{
                    position: 'absolute', top: -8, right: -4, fontSize: 10,
                    animation: 'reactionPop 0.3s ease-out',
                  }}>{bot.lastReactionEmoji}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        {showBubble && latestMsg && (
          <div key={latestMsg.timestamp} style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap', animation: 'botChatIn 0.3s ease-out', zIndex: 50,
            backdropFilter: 'blur(8px)',
          }}>
            <img src={latestMsg.botPhoto} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700 }}>{latestMsg.botName}:</span>
            <span style={{ fontSize: 9, color: '#d1d5db', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{latestMsg.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(67,160,71,0.2)', borderRadius: 10, padding: '8px 10px', backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', animation: 'onlinePulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#66BB6A' }}>{onlineCount} players online</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {visible.map(bot => (
          <div key={bot.id} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
            borderRadius: 6, background: 'rgba(255,255,255,0.03)',
            transition: 'background 0.2s',
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={bot.photoUrl} alt={bot.name} style={{
                width: 24, height: 24, borderRadius: '50%',
                border: `2px solid ${VIP_COLORS[bot.vipTier]}`,
                objectFit: 'cover',
                boxShadow: VIP_GLOW[bot.vipTier],
              }} />
              <div style={{
                position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%',
                background: VIP_COLORS[bot.vipTier], border: '1px solid #111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 4, fontWeight: 900, color: '#000',
              }}>
                {bot.vipTier === 'gold' ? '★' : bot.vipTier === 'silver' ? 'S' : 'B'}
              </div>
              {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
                <span style={{
                  position: 'absolute', top: -10, right: -6, fontSize: 14,
                  animation: 'reactionPop 0.3s ease-out',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                }}>{bot.lastReactionEmoji}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bot.name}</span>
                {bot.currentBet > 0 && (
                  <span style={{
                    fontSize: 7, fontWeight: 700, color: '#D4AF37',
                    background: 'rgba(212,175,55,0.15)', padding: '1px 4px', borderRadius: 3,
                  }}>{formatBet(bot.currentBet)}</span>
                )}
              </div>
              {showStatus && (
                <div style={{
                  fontSize: 8, fontWeight: 600,
                  color: bot.status === 'Betting' ? '#D4AF37' : bot.status === 'Playing' ? '#66BB6A' : '#9ca3af',
                }}>{bot.status}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showChat && recentChat.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
            <MessageCircle style={{ width: 8, height: 8, color: '#666' }} />
            <span style={{ fontSize: 7, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Chat</span>
          </div>
          {recentChat.map((msg, i) => (
            <BotChatBubble key={`${msg.botId}-${msg.timestamp}-${i}`} message={msg} />
          ))}
        </div>
      )}
      <div style={{ fontSize: 8, color: '#555', textAlign: 'center', marginTop: 5, letterSpacing: 0.5 }}>LIVE TABLE</div>
    </div>
  );
}

export function GameBotLobbyRow({ bots, onlineCount, chatMessages = [] }: { bots: CasinoBot[]; onlineCount: number; chatMessages?: BotChatMessage[] }) {
  const latestChat = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

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
              <img src={bot.photoUrl} alt={bot.name} style={{
                width: 30, height: 30, borderRadius: '50%',
                border: `2px solid ${VIP_COLORS[bot.vipTier]}`,
                objectFit: 'cover',
                boxShadow: VIP_GLOW[bot.vipTier],
              }} />
              <div style={{
                position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%',
                background: VIP_COLORS[bot.vipTier], border: '1.5px solid #111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 5, fontWeight: 900, color: '#000',
              }}>
                {bot.vipTier === 'gold' ? '★' : bot.vipTier === 'silver' ? 'S' : 'B'}
              </div>
              {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
                <span style={{
                  position: 'absolute', top: -8, right: -4, fontSize: 12,
                  animation: 'reactionPop 0.3s ease-out',
                }}>{bot.lastReactionEmoji}</span>
              )}
            </div>
            <span style={{ fontSize: 8, color: '#d1d5db', maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bot.name}</span>
            {bot.currentBet > 0 && (
              <span style={{ fontSize: 7, color: '#D4AF37', fontWeight: 700 }}>{formatBet(bot.currentBet)}</span>
            )}
          </div>
        ))}
      </div>
      {latestChat && Date.now() - latestChat.timestamp < 10000 && (
        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
          justifyContent: 'center', opacity: 0.8,
        }}>
          <img src={latestChat.botPhoto} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: 9, color: '#d1d5db' }}>
            <strong style={{ color: '#D4AF37' }}>{latestChat.botName}:</strong> {latestChat.message}
          </span>
        </div>
      )}
    </div>
  );
}
