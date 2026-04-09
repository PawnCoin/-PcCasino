import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import BOT_PROFILES, { type BotProfile } from '@/data/bingoBotProfiles';

export interface CasinoBot extends BotProfile {
  status: string;
  lastReactionEmoji: string | null;
  lastReactionTime: number;
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

const BOT_EMOJIS = ['🎉', '😮', '🔥', '💰', '🍀', '😎', '👏', '🤞'];

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

  const makeBot = useCallback((bot: BotProfile): CasinoBot => ({
    ...bot,
    status: statusesRef.current[Math.floor(Math.random() * statusesRef.current.length)],
    lastReactionEmoji: null,
    lastReactionTime: 0,
  }), []);

  const selectBots = useCallback((count?: number) => {
    const n = count ?? randomBetween(minBots, maxBots);
    return shuffle(BOT_PROFILES).slice(0, n).map(makeBot);
  }, [minBots, maxBots, makeBot]);

  const [activeBots, setActiveBots] = useState<CasinoBot[]>(() => selectBots());

  useEffect(() => {
    fluctuationTimer.current = setInterval(() => {
      setActiveBots(prev => {
        const roll = Math.random();
        if (roll < 0.12 && prev.length > minBots) {
          const idx = Math.floor(Math.random() * prev.length);
          return prev.filter((_, i) => i !== idx);
        }
        if (roll > 0.88 && prev.length < maxBots) {
          const currentIds = new Set(prev.map(b => b.id));
          const available = BOT_PROFILES.filter(b => !currentIds.has(b.id));
          if (available.length > 0) {
            const newBot = available[Math.floor(Math.random() * available.length)];
            return [...prev, makeBot(newBot)];
          }
        }
        if (roll > 0.4 && roll < 0.6) {
          const s = statusesRef.current;
          const idx = Math.floor(Math.random() * prev.length);
          return prev.map((b, i) =>
            i === idx ? { ...b, status: s[Math.floor(Math.random() * s.length)] } : b
          );
        }
        return prev;
      });
    }, 12000 + Math.random() * 8000);

    return () => {
      if (fluctuationTimer.current) clearInterval(fluctuationTimer.current);
    };
  }, [minBots, maxBots, makeBot]);

  const triggerReaction = useCallback(() => {
    setActiveBots(prev => {
      if (prev.length === 0) return prev;
      const idx = Math.floor(Math.random() * prev.length);
      const emoji = BOT_EMOJIS[Math.floor(Math.random() * BOT_EMOJIS.length)];
      return prev.map((b, i) =>
        i === idx ? { ...b, lastReactionEmoji: emoji, lastReactionTime: Date.now() } : b
      );
    });
  }, []);

  const refreshBots = useCallback(() => {
    setActiveBots(selectBots());
  }, [selectBots]);

  const onlinePlayerCount = activeBots.length + 1;

  return {
    activeBots,
    onlinePlayerCount,
    triggerReaction,
    refreshBots,
  };
}
