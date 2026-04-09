import { useState, useEffect, useCallback, useRef } from 'react';
import BOT_PROFILES, { type BotProfile } from '@/data/bingoBotProfiles';

export interface ActiveBot extends BotProfile {
  daubProgress: number;
  numbersAway: number;
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

export function useBingoBots() {
  const [activeBots, setActiveBots] = useState<ActiveBot[]>([]);
  const [botBingoEvent, setBotBingoEvent] = useState<{ botName: string; botPhoto: string } | null>(null);
  const fluctuationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const bingoEventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectBots = useCallback((count?: number) => {
    const n = count ?? randomBetween(5, 12);
    const selected = shuffle(BOT_PROFILES).slice(0, n);
    return selected.map(bot => ({
      ...bot,
      daubProgress: 0,
      numbersAway: randomBetween(10, 20),
      lastReactionEmoji: null,
      lastReactionTime: 0,
    }));
  }, []);

  const initSession = useCallback(() => {
    setActiveBots(selectBots());
    setBotBingoEvent(null);
  }, [selectBots]);

  const startGame = useCallback(() => {
    const freshBots = selectBots();
    setActiveBots(freshBots.map(b => ({
      ...b,
      daubProgress: 0,
      numbersAway: randomBetween(10, 20),
      lastReactionEmoji: null,
      lastReactionTime: 0,
    })));
    setBotBingoEvent(null);

    if (fluctuationTimer.current) clearInterval(fluctuationTimer.current);
    fluctuationTimer.current = setInterval(() => {
      setActiveBots(prev => {
        if (prev.length < 5) return prev;
        const roll = Math.random();
        if (roll < 0.15 && prev.length > 5) {
          const idx = Math.floor(Math.random() * prev.length);
          return prev.filter((_, i) => i !== idx);
        }
        if (roll > 0.85 && prev.length < 12) {
          const currentIds = new Set(prev.map(b => b.id));
          const available = BOT_PROFILES.filter(b => !currentIds.has(b.id));
          if (available.length > 0) {
            const newBot = available[Math.floor(Math.random() * available.length)];
            return [...prev, {
              ...newBot,
              daubProgress: Math.floor(Math.random() * 30),
              numbersAway: randomBetween(5, 15),
              lastReactionEmoji: null,
              lastReactionTime: 0,
            }];
          }
        }
        return prev;
      });
    }, 15000);
  }, [selectBots]);

  const advanceBotProgress = useCallback((calledCount: number) => {
    setActiveBots(prev => prev.map(bot => {
      const baseProgress = Math.min(95, Math.floor((calledCount / 75) * 100 * (0.7 + Math.random() * 0.6)));
      const away = Math.max(1, Math.floor((1 - baseProgress / 100) * 24));
      return {
        ...bot,
        daubProgress: baseProgress,
        numbersAway: away,
      };
    }));
  }, []);

  const triggerBotReaction = useCallback((addReaction?: (emoji: string, player: string) => void) => {
    setActiveBots(prev => {
      const idx = Math.floor(Math.random() * prev.length);
      if (idx >= prev.length) return prev;
      const emoji = BOT_EMOJIS[Math.floor(Math.random() * BOT_EMOJIS.length)];
      if (addReaction) {
        addReaction(emoji, prev[idx].name);
      }
      return prev.map((b, i) =>
        i === idx ? { ...b, lastReactionEmoji: emoji, lastReactionTime: Date.now() } : b
      );
    });
  }, []);

  const tryBotBingo = useCallback((calledCount: number): boolean => {
    if (calledCount < 20) return false;
    const chance = calledCount > 50 ? 0.08 : calledCount > 35 ? 0.04 : 0.015;
    if (Math.random() > chance) return false;
    setActiveBots(prev => {
      if (prev.length === 0) return prev;
      const candidate = prev[Math.floor(Math.random() * prev.length)];
      setBotBingoEvent({ botName: candidate.name, botPhoto: candidate.photoUrl });
      if (bingoEventTimer.current) clearTimeout(bingoEventTimer.current);
      bingoEventTimer.current = setTimeout(() => {
        setBotBingoEvent(null);
        bingoEventTimer.current = null;
      }, 4000);
      return prev;
    });
    return true;
  }, []);

  const endGame = useCallback(() => {
    if (fluctuationTimer.current) {
      clearInterval(fluctuationTimer.current);
      fluctuationTimer.current = null;
    }
    if (bingoEventTimer.current) {
      clearTimeout(bingoEventTimer.current);
      bingoEventTimer.current = null;
    }
    setBotBingoEvent(null);
  }, []);

  useEffect(() => {
    initSession();
    return () => {
      if (fluctuationTimer.current) clearInterval(fluctuationTimer.current);
      if (bingoEventTimer.current) clearTimeout(bingoEventTimer.current);
    };
  }, [initSession]);

  const onlinePlayerCount = activeBots.length + 1;

  return {
    activeBots,
    onlinePlayerCount,
    botBingoEvent,
    initSession,
    startGame,
    endGame,
    advanceBotProgress,
    triggerBotReaction,
    tryBotBingo,
  };
}
