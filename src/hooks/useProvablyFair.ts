import { useState, useCallback, useRef } from 'react';
import { getToken } from '@/lib/api';

export interface ProvablyFairRound {
  roundId: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string;
  result?: Record<string, unknown>;
}

function generateClientSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useProvablyFair(game: 'slots' | 'roulette' | 'blackjack' | 'dice') {
  const [round, setRound] = useState<ProvablyFairRound | null>(null);
  const [lastReveal, setLastReveal] = useState<ProvablyFairRound | null>(null);
  const nonceRef = useRef(0);
  const clientSeedRef = useRef(generateClientSeed());

  // Step 1: Create a round — gets serverSeedHash commitment only. No result leaked.
  const startRound = useCallback(async (): Promise<ProvablyFairRound | null> => {
    const token = getToken();
    if (!token) return null;

    nonceRef.current += 1;
    const clientSeed = clientSeedRef.current;
    const nonce = nonceRef.current;

    try {
      const res = await fetch('/api/provably-fair/new-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ game, clientSeed, nonce }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newRound: ProvablyFairRound = {
        roundId: data.roundId,
        serverSeedHash: data.serverSeedHash,
        clientSeed,
        nonce,
        // No result here — outcome is unknown until resolveRound() is called after play
      };
      setRound(newRound);
      return newRound;
    } catch {
      return null;
    }
  }, [game]);

  // Blackjack: deal initial 4 cards. Transitions created → dealing. Returns cards[0..3].
  const dealBlackjack = useCallback(async (roundId: number): Promise<{ suit: string; value: string }[] | null> => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/provably-fair/blackjack-deal/${roundId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.cards ?? null;
    } catch {
      return null;
    }
  }, []);

  // Blackjack: mark hand as finished (dealing → finished). Must be called before resolve.
  const finishBlackjack = useCallback(async (roundId: number): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch(`/api/provably-fair/blackjack-finish/${roundId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // Blackjack: draw next card from seed-derived deck. Server advances draw_index atomically.
  const drawBlackjackCard = useCallback(async (roundId: number): Promise<{ suit: string; value: string } | null> => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/provably-fair/blackjack-draw/${roundId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.card ?? null;
    } catch {
      return null;
    }
  }, []);

  // Step 2: Resolve — called AFTER the round completes; returns server-authoritative outcome.
  // For blackjack: returns the full seed-derived deck post-hand (no advantage since hand is over).
  const resolveRound = useCallback(async (roundId: number): Promise<Record<string, unknown> | null> => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/provably-fair/resolve/${roundId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Merge result into round state
      setRound(prev => prev && prev.roundId === roundId ? { ...prev, result: data.result } : prev);
      return data.result ?? null;
    } catch {
      return null;
    }
  }, []);

  const revealRound = useCallback(async (roundId: number): Promise<ProvablyFairRound | null> => {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`/api/provably-fair/reveal/${roundId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const revealed: ProvablyFairRound = {
        roundId,
        serverSeedHash: data.serverSeedHash,
        serverSeed: data.serverSeed,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
      };
      setLastReveal(revealed);
      return revealed;
    } catch {
      return null;
    }
  }, []);

  const refreshClientSeed = useCallback(() => {
    clientSeedRef.current = generateClientSeed();
    nonceRef.current = 0;
    setRound(null);
    setLastReveal(null);
  }, []);

  return {
    round,
    lastReveal,
    startRound,
    dealBlackjack,
    finishBlackjack,
    drawBlackjackCard,
    resolveRound,
    revealRound,
    refreshClientSeed,
    clientSeed: clientSeedRef.current,
  };
}
