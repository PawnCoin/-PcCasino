import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import BOT_PROFILES, { type BotProfile, BOT_CHAT_POOLS } from '@/data/bingoBotProfiles';

export interface BotBet {
  position: string;
  amount: number;
  timestamp: number;
}

export interface BotChatMessage {
  botId: string;
  botName: string;
  botPhoto: string;
  message: string;
  timestamp: number;
}

export interface CasinoBot extends BotProfile {
  status: string;
  lastReactionEmoji: string | null;
  lastReactionTime: number;
  currentBet: number;
  betPositions: BotBet[];
  isTyping: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBetAmount(bot: BotProfile): number {
  const [min, max] = bot.betRange;
  const raw = min + Math.random() * (max - min);
  if (raw < 100) return Math.round(raw / 5) * 5;
  if (raw < 1000) return Math.round(raw / 25) * 25;
  if (raw < 10000) return Math.round(raw / 100) * 100;
  return Math.round(raw / 1000) * 1000;
}

const BOT_EMOJIS = ['🎉', '😮', '🔥', '💰', '🍀', '😎', '👏', '🤞', '🎰', '💎', '⚡', '🃏'];

const ROULETTE_POSITIONS = [
  'number0', 'number1', 'number2', 'number3', 'number4', 'number5',
  'number6', 'number7', 'number8', 'number9', 'number10', 'number11',
  'number12', 'number13', 'number14', 'number15', 'number16', 'number17',
  'number18', 'number19', 'number20', 'number21', 'number22', 'number23',
  'number24', 'number25', 'number26', 'number27', 'number28', 'number29',
  'number30', 'number31', 'number32', 'number33', 'number34', 'number35', 'number36',
  'section0', 'section1', 'section2', 'section3', 'section4', 'section5',
  'section6', 'section7', 'section8', 'section9', 'section10', 'section11',
];

interface UseCasinoBotsOptions {
  gameName: string;
  minBots?: number;
  maxBots?: number;
  statusMessages?: string[];
}

const DEFAULT_STATUSES = ['Watching', 'Betting', 'Playing'];

export function useCasinoBots({
  gameName,
  minBots = 3,
  maxBots = 8,
  statusMessages,
}: UseCasinoBotsOptions) {
  const statusKey = statusMessages ? statusMessages.join('|') : '';
  const statuses = useMemo(
    () => statusMessages || DEFAULT_STATUSES,
    [statusKey],
  );
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const fluctuationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const betTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const makeBot = useCallback((bot: BotProfile): CasinoBot => ({
    ...bot,
    status: statusesRef.current[Math.floor(Math.random() * statusesRef.current.length)],
    lastReactionEmoji: null,
    lastReactionTime: 0,
    currentBet: generateBetAmount(bot),
    betPositions: [],
    isTyping: false,
  }), []);

  const selectBots = useCallback((count?: number) => {
    const n = count ?? randomBetween(minBots, maxBots);
    return shuffle(BOT_PROFILES).slice(0, n).map(makeBot);
  }, [minBots, maxBots, makeBot]);

  const [activeBots, setActiveBots] = useState<CasinoBot[]>(() => selectBots());
  const [chatMessages, setChatMessages] = useState<BotChatMessage[]>([]);

  useEffect(() => {
    fluctuationTimer.current = setInterval(() => {
      setActiveBots(prev => {
        const roll = Math.random();
        if (roll < 0.10 && prev.length > minBots) {
          const idx = Math.floor(Math.random() * prev.length);
          return prev.filter((_, i) => i !== idx);
        }
        if (roll > 0.90 && prev.length < maxBots) {
          const currentIds = new Set(prev.map(b => b.id));
          const available = BOT_PROFILES.filter(b => !currentIds.has(b.id));
          if (available.length > 0) {
            const newBot = available[Math.floor(Math.random() * available.length)];
            return [...prev, makeBot(newBot)];
          }
        }
        if (roll > 0.35 && roll < 0.55) {
          const s = statusesRef.current;
          const idx = Math.floor(Math.random() * prev.length);
          return prev.map((b, i) =>
            i === idx ? { ...b, status: s[Math.floor(Math.random() * s.length)] } : b
          );
        }
        if (roll > 0.55 && roll < 0.70) {
          const idx = Math.floor(Math.random() * prev.length);
          return prev.map((b, i) =>
            i === idx ? { ...b, currentBet: generateBetAmount(b) } : b
          );
        }
        return prev;
      });
    }, 8000 + Math.random() * 7000);

    return () => {
      if (fluctuationTimer.current) clearInterval(fluctuationTimer.current);
    };
  }, [minBots, maxBots, makeBot]);

  useEffect(() => {
    chatTimer.current = setInterval(() => {
      setActiveBots(prev => {
        if (prev.length === 0) return prev;
        const bot = prev[Math.floor(Math.random() * prev.length)];
        const pool = bot.chatPool.length > 0 ? bot.chatPool : BOT_CHAT_POOLS.NEUTRAL_CHAT;
        const msg = pickRandom(pool);
        const newMsg: BotChatMessage = {
          botId: bot.id,
          botName: bot.name,
          botPhoto: bot.photoUrl,
          message: msg,
          timestamp: Date.now(),
        };
        setChatMessages(msgs => {
          const updated = [...msgs, newMsg];
          return updated.length > 20 ? updated.slice(-20) : updated;
        });
        return prev;
      });
    }, 15000 + Math.random() * 20000);

    return () => {
      if (chatTimer.current) clearInterval(chatTimer.current);
    };
  }, []);

  useEffect(() => {
    betTimer.current = setInterval(() => {
      setActiveBots(prev => {
        if (prev.length === 0) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        const bot = prev[idx];
        const numPositions = randomBetween(1, 4);
        const positions: BotBet[] = [];
        const used = new Set<string>();
        for (let i = 0; i < numPositions; i++) {
          let pos: string;
          do { pos = pickRandom(ROULETTE_POSITIONS); } while (used.has(pos));
          used.add(pos);
          positions.push({
            position: pos,
            amount: generateBetAmount(bot),
            timestamp: Date.now(),
          });
        }
        return prev.map((b, i) =>
          i === idx ? { ...b, betPositions: positions, status: 'Betting' } : b
        );
      });
    }, 10000 + Math.random() * 10000);

    return () => {
      if (betTimer.current) clearInterval(betTimer.current);
    };
  }, []);

  const triggerReaction = useCallback(() => {
    setActiveBots(prev => {
      if (prev.length === 0) return prev;
      const count = Math.min(prev.length, randomBetween(1, 3));
      const indices = shuffle(prev.map((_, i) => i)).slice(0, count);
      return prev.map((b, i) => {
        if (!indices.includes(i)) return b;
        const emoji = BOT_EMOJIS[Math.floor(Math.random() * BOT_EMOJIS.length)];
        return { ...b, lastReactionEmoji: emoji, lastReactionTime: Date.now() };
      });
    });
  }, []);

  const triggerGameEvent = useCallback((event: 'win' | 'lose' | 'bigWin' | 'newRound') => {
    setActiveBots(prev => {
      if (prev.length === 0) return prev;
      const chatBot = prev[Math.floor(Math.random() * prev.length)];
      let pool: string[];
      switch (event) {
        case 'win': pool = BOT_CHAT_POOLS.WIN_CHAT; break;
        case 'lose': pool = BOT_CHAT_POOLS.LOSE_CHAT; break;
        case 'bigWin': pool = [...BOT_CHAT_POOLS.WIN_CHAT, ...BOT_CHAT_POOLS.AGGRESSIVE_CHAT]; break;
        case 'newRound': pool = BOT_CHAT_POOLS.NEUTRAL_CHAT; break;
      }
      const msg = pickRandom(pool);
      setChatMessages(msgs => {
        const updated = [...msgs, {
          botId: chatBot.id,
          botName: chatBot.name,
          botPhoto: chatBot.photoUrl,
          message: msg,
          timestamp: Date.now(),
        }];
        return updated.length > 20 ? updated.slice(-20) : updated;
      });
      return prev;
    });
    triggerReaction();
  }, [triggerReaction]);

  const refreshBots = useCallback(() => {
    setActiveBots(selectBots());
  }, [selectBots]);

  const onlinePlayerCount = activeBots.length + 1;

  return {
    activeBots,
    onlinePlayerCount,
    triggerReaction,
    triggerGameEvent,
    refreshBots,
    chatMessages,
  };
}
