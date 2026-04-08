import { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Send, Crown, CheckCircle, X, Smile, Wifi, WifiOff, LogOut } from 'lucide-react';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import { getSocket, leaveRoom, setReady, sendChatMessage, sendReaction, type Room, type ChatMessage } from '@/lib/socket';

function nameToAvatar(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ALL_AVATARS[h % ALL_AVATARS.length];
}

const QUICK_REACTIONS = ['🔥', '👏', '💎', '🎉', '😂', '💀', '🤑', '👑'];

interface GameRoomProps {
  roomId: string;
  username: string;
  userId?: string;
  onLeave: () => void;
  onViewProfile?: (username: string) => void;
}

export function GameRoom({ roomId, username, userId, onLeave, onViewProfile }: GameRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [myReady, setMyReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: number; emoji: string; x: number }>>([]);
  const [collapsed, setCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reactionCounter = useRef(0);

  useEffect(() => {
    const sock = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onRoomUpdate = ({ room: updatedRoom }: { room: Room }) => {
      if (updatedRoom.id === roomId) setRoom(updatedRoom);
    };

    let msgIdCounter = Date.now();
    const nextMsgId = () => ++msgIdCounter;

    const onPlayerJoined = ({ player }: { player: { id: string; username: string; seat: number } }) => {
      if (player.id !== userId) {
        setMessages(prev => [...prev, {
          id: nextMsgId(),
          playerId: 'system',
          username: 'System',
          message: `${player.username} joined the table`,
          timestamp: Date.now(),
        }]);
      }
    };

    const onPlayerLeft = ({ playerId, username: leftName }: { playerId: string; username: string }) => {
      if (playerId !== userId) {
        setMessages(prev => [...prev, {
          id: nextMsgId(),
          playerId: 'system',
          username: 'System',
          message: `${leftName} left the table`,
          timestamp: Date.now(),
        }]);
      }
    };

    const onChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-100), { ...msg, id: typeof msg.id === 'number' ? msg.id : nextMsgId() }]);
    };

    const onReaction = ({ username: fromUser, emoji }: { playerId: string; username: string; emoji: string }) => {
      const id = ++reactionCounter.current;
      const x = 10 + Math.random() * 80;
      setFloatingReactions(prev => [...prev, { id, emoji, x }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2500);
    };

    const onGameStarted = () => {
      setMessages(prev => [...prev, {
        id: nextMsgId(),
        playerId: 'system',
        username: 'System',
        message: '🎮 Game has started!',
        timestamp: Date.now(),
      }]);
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('room:update', onRoomUpdate);
    sock.on('room:playerJoined', onPlayerJoined);
    sock.on('room:playerLeft', onPlayerLeft);
    sock.on('chat:message', onChatMessage);
    sock.on('reaction', onReaction);
    sock.on('game:started', onGameStarted);

    setConnected(sock.connected);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('room:update', onRoomUpdate);
      sock.off('room:playerJoined', onPlayerJoined);
      sock.off('room:playerLeft', onPlayerLeft);
      sock.off('chat:message', onChatMessage);
      sock.off('reaction', onReaction);
      sock.off('game:started', onGameStarted);
    };
  }, [roomId, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleReaction = (emoji: string) => {
    sendReaction(emoji);
  };

  const handleReadyToggle = () => {
    const newReady = !myReady;
    setMyReady(newReady);
    setReady(newReady);
  };

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  const players = room?.players || [];
  const myPlayer = players.find(p => p.id === userId);

  if (collapsed) {
    return (
      <div
        className="fixed bottom-4 right-4 z-40 flex flex-col gap-2"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Floating reactions */}
        {floatingReactions.map(r => (
          <div key={r.id} className="floating-reaction" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </div>
        ))}

        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shadow-lg"
          style={{
            background: 'rgba(8,8,16,0.95)',
            border: '1px solid rgba(147,51,234,0.5)',
            color: '#e879f9',
            boxShadow: '0 0 20px rgba(147,51,234,0.3)',
          }}
        >
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
          <Users className="w-4 h-4" />
          {players.length} at table
          {messages.length > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {Math.min(messages.length, 9)}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-40 flex flex-col"
      style={{
        width: 280,
        maxHeight: '70vh',
        pointerEvents: 'auto',
      }}
    >
      {/* Floating reactions */}
      {floatingReactions.map(r => (
        <div
          key={r.id}
          className="absolute text-3xl pointer-events-none"
          style={{
            left: `${r.x}%`,
            bottom: '100%',
            animation: 'floatUp 2.5s ease-out forwards',
            zIndex: 100,
          }}
        >
          {r.emoji}
        </div>
      ))}

      <div
        className="flex flex-col rounded-tl-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(8,8,16,0.97)',
          border: '1px solid rgba(147,51,234,0.4)',
          borderBottom: 'none',
          borderRight: 'none',
          maxHeight: '70vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5"
          style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.5), rgba(49,46,129,0.5))' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="font-bold text-sm text-white truncate">{room?.name || 'Game Room'}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-gray-400">{players.length}/{room?.maxPlayers || '?'}</span>
            <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="px-2 py-2 border-b border-white/10" style={{ maxHeight: 130, overflowY: 'auto' }}>
          {players.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-2">Waiting for players...</div>
          ) : (
            players.map((player) => (
              <div key={player.id} className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarSprite avatar={nameToAvatar(player.username)} size={24} style={{ borderRadius: 0 }} />
                  )}
                </div>
                {player.id !== userId && onViewProfile ? (
                  <button
                    className="text-xs text-white truncate flex-1 text-left hover:text-[#D4AF37] transition-colors"
                    onClick={() => onViewProfile(player.username)}
                  >
                    {player.username}
                  </button>
                ) : (
                  <span className="text-xs text-white truncate flex-1">{player.username}</span>
                )}
                {room?.hostId === player.id && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                {player.isReady && <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />}
                {player.id === userId && (
                  <span className="text-xs text-purple-400 flex-shrink-0">you</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Ready + Reactions bar */}
        <div className="px-2 py-2 border-b border-white/10 flex items-center gap-1 flex-wrap">
          <button
            onClick={handleReadyToggle}
            className="px-2 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0"
            style={{
              background: myReady ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)',
              border: myReady ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: myReady ? '#4ade80' : '#9ca3af',
            }}
          >
            {myReady ? '✓ Ready' : 'Ready?'}
          </button>
          <div className="flex gap-0.5 flex-wrap flex-1">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-base hover:scale-125 transition-transform p-0.5 rounded"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 transition-colors border-b border-white/10"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {chatOpen ? 'Hide Chat' : 'Show Chat'}
          {messages.length > 0 && !chatOpen && (
            <span className="ml-auto bg-purple-600 text-white text-xs rounded-full px-1.5">
              {messages.length}
            </span>
          )}
        </button>

        {/* Chat Messages */}
        {chatOpen && (
          <>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ maxHeight: 160 }}>
              {messages.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`text-xs ${msg.playerId === 'system' ? 'text-center text-gray-500 italic' : ''}`}>
                    {msg.playerId !== 'system' && (
                      <span className="font-bold" style={{ color: msg.playerId === userId ? '#e879f9' : '#94a3b8' }}>
                        {msg.playerId !== userId && onViewProfile ? (
                          <button
                            className="hover:underline hover:opacity-80 transition-opacity"
                            onClick={() => onViewProfile(msg.username)}
                          >
                            {msg.username}
                          </button>
                        ) : (
                          msg.username
                        )}
                        {': '}
                      </span>
                    )}
                    <span className={msg.playerId === 'system' ? 'text-gray-500' : 'text-gray-300'}>
                      {msg.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-1 p-2 border-t border-white/10">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Message..."
                className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
              <button
                onClick={handleSendChat}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(147,51,234,0.3)', color: '#e879f9' }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Leave Table
        </button>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
        }
      `}</style>
    </div>
  );
}
