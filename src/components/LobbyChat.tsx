import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface ChatMsg {
  id: number;
  socketId: string;
  username: string;
  avatar: string;
  avatarUrl?: string | null;
  message: string;
  timestamp: number;
}

interface LobbyChatProps {
  username?: string;
  avatar?: string;
  avatarUrl?: string | null;
  isAuthenticated: boolean;
  onViewProfile?: (username: string) => void;
}

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'nigga', 'faggot', 'retard',
  'whore', 'slut', 'bastard', 'motherfucker', 'cocksucker', 'prick', 'dick', 'pussy',
];

function filterProfanity(text: string): string {
  let filtered = text;
  for (const word of BLOCKED_WORDS) {
    const pattern = new RegExp(word, 'gi');
    filtered = filtered.replace(pattern, '*'.repeat(word.length));
  }
  return filtered;
}

export function LobbyChat({ username, avatar, avatarUrl, isAuthenticated, onViewProfile }: LobbyChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const sock = socketRef.current;

    const handleMsg = (msg: ChatMsg) => {
      setMessages(prev => [...prev.slice(-99), msg]);
      if (!isOpen) setUnread(prev => prev + 1);
    };

    const handleHistory = ({ messages: hist }: { messages: ChatMsg[] }) => {
      setMessages(hist);
    };

    sock.on('lobby:chat', handleMsg);
    sock.on('lobby:chat:history', handleHistory);
    sock.emit('lobby:chat:history');

    return () => {
      sock.off('lobby:chat', handleMsg);
      sock.off('lobby:chat:history', handleHistory);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const filtered = filterProfanity(input.trim());
    socketRef.current.emit('lobby:chat', {
      message: filtered,
      username: username || 'Guest',
      avatar: avatar || '',
      avatarUrl: avatarUrl || null,
    });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div
          className="w-80 rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'rgba(10,10,10,0.97)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            height: '420px',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05)', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-bold text-[#D4AF37] text-sm">Lobby Chat</span>
              <span className="text-xs text-[#808080]">({messages.length} messages)</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#808080] hover:text-white transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-[#606060] text-xs mt-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No messages yet. Be the first to chat!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2">
                  {msg.avatarUrl ? (
                    <img src={msg.avatarUrl} alt={msg.username} className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <span className="text-base shrink-0 mt-0.5">{msg.avatar}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <button
                    className="text-xs font-bold text-[#D4AF37] truncate hover:underline cursor-pointer"
                    onClick={() => onViewProfile && onViewProfile(msg.username)}
                  >{msg.username}</button>
                      <span className="text-xs text-[#505050] shrink-0">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs text-[#C0C0C0] break-words leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-2 flex gap-2"
            style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}
          >
            {isAuthenticated ? (
              <>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  maxLength={200}
                  className="flex-1 px-3 py-2 rounded-lg text-xs text-white placeholder-[#606060] focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
                >
                  <Send className="w-3.5 h-3.5 text-black" />
                </button>
              </>
            ) : (
              <p className="text-xs text-[#606060] text-center w-full py-1">Log in to chat</p>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: isOpen ? 'rgba(10,10,10,0.9)' : 'linear-gradient(135deg, #D4AF37, #B8860B)',
          border: '2px solid rgba(212,175,55,0.6)',
          boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
        }}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-[#D4AF37]" />
        ) : (
          <MessageCircle className="w-5 h-5 text-black" />
        )}
        {!isOpen && unread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF5350] flex items-center justify-center">
            <span className="text-xs text-white font-bold">{unread > 9 ? '9+' : unread}</span>
          </div>
        )}
      </button>
    </div>
  );
}
