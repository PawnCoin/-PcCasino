import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, AlertTriangle, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { friendsApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Message {
  id: number;
  senderId: number;
  senderUsername?: string;
  recipientId: number;
  content: string;
  createdAt: string;
}

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: number;
  recipientUsername: string;
  recipientAvatar?: string;
  myId: number;
}

export function DirectMessageModal({
  isOpen,
  onClose,
  recipientId,
  recipientUsername,
  myId,
}: DirectMessageModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [anticheatWarning, setAnticheatWarning] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const data = await friendsApi.getConversation(recipientId);
      setMessages(data.messages || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load messages');
    }
    setLoading(false);
  }, [isOpen, recipientId]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time incoming DMs
  useEffect(() => {
    if (!isOpen) return;
    const sock = getSocket();
    const handleNewDM = (msg: Message) => {
      if (
        (msg.senderId === recipientId && msg.recipientId === myId) ||
        (msg.senderId === myId && msg.recipientId === recipientId)
      ) {
        setMessages(prev => [...prev, msg]);
      }
    };
    sock.on('dm:new', handleNewDM);
    return () => { sock.off('dm:new', handleNewDM); };
  }, [isOpen, recipientId, myId]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSending(true);
    setAnticheatWarning('');
    try {
      const data = await friendsApi.sendMessage(recipientId, trimmed);
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setInput('');
      }
    } catch (err: any) {
      if (err.message?.includes('blocked') || err.message?.includes('anti-cheat') || err.message?.includes('game-related')) {
        setAnticheatWarning(err.message || 'Message blocked by anti-cheat filter');
      } else {
        toast.error(err.message || 'Failed to send message');
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        style={{
          background: 'rgba(8,8,16,0.99)',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 0 60px rgba(0,0,0,0.9)',
          height: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(212,175,55,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-white">{recipientUsername}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Anti-cheat notice */}
        <div className="px-4 py-2 flex-shrink-0" style={{ background: 'rgba(251,191,36,0.05)', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
          <p className="text-xs text-yellow-600">Messages are monitored for fair play. Game state sharing is prohibited.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-600 text-sm py-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No messages yet. Say hello!</p>
            </div>
          ) : (
            (() => {
              let lastDate = '';
              return messages.map((msg) => {
                const dateLabel = formatDate(msg.createdAt);
                const showDate = dateLabel !== lastDate;
                lastDate = dateLabel;
                const isMine = msg.senderId === myId;
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-xs text-gray-600 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[75%] px-3 py-2 rounded-2xl text-sm"
                        style={{
                          background: isMine
                            ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))'
                            : 'rgba(255,255,255,0.07)',
                          border: isMine ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.1)',
                          color: isMine ? '#D4AF37' : '#e2e8f0',
                          borderBottomRightRadius: isMine ? 4 : undefined,
                          borderBottomLeftRadius: !isMine ? 4 : undefined,
                        }}
                      >
                        <p className="break-words leading-relaxed">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-60 text-right">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Anti-cheat warning */}
        {anticheatWarning && (
          <div
            className="mx-4 mb-2 px-3 py-2 rounded-lg flex items-start gap-2 flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{anticheatWarning}</p>
            <button onClick={() => setAnticheatWarning('')} className="ml-auto text-red-400/60 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input */}
        <div
          className="px-4 py-3 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setAnticheatWarning(''); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="px-3"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: 'black' }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
