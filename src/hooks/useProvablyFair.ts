import { useState, useCallback, useRef } from 'react';
import { getToken } from '@/lib/api';

export interface ProvablyFairRound {
  roundId: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string;
}

function generateClientSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useProvablyFair(game: 'slots' | 'roulette' | 'blackjack') {
  const [round, setRound] = useState<ProvablyFairRound | null>(null);
  const [lastReveal, setLastReveal] = useState<ProvablyFairRound | null>(null);
  const nonceRef = useRef(0);
  const clientSeedRef = useRef(generateClientSeed());

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
      };
      setRound(newRound);
      return newRound;
    } catch {
      return null;
    }
  }, [game]);

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
    revealRound,
    refreshClientSeed,
    clientSeed: clientSeedRef.current,
  };
}
