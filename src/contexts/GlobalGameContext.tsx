import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ALL_AVATARS } from '@/components/AvatarSprite';
import { walletApi } from '@/lib/api';

export interface GameSettings {
  displayName: string;
  avatar: string;
  avatarDef: string;
  volumeLevel: number;
  voiceEnabled: boolean;
  textEnabled: boolean;
  aiHelpEnabled: boolean;
  casinoSoundEnabled: boolean;
  cardSkin: string;
  vappTVEnabled: boolean;
  celebrationsEnabled: boolean;
}

export interface PcMembership {
  isMember: boolean;
  tier: 'guest' | 'player' | 'member';
  requiredBalance: number;
  usdBasis: number | null;
  pricePerPc: number | null;
  thresholdUnavailable: boolean;
}

interface GlobalGameContextValue {
  settings: GameSettings;
  updateSettings: (patch: Partial<GameSettings>) => void;
  membership: PcMembership;
  checkMembership: (balance: number) => PcMembership;
  formatPc: (amount: number) => string;
  parsePcInput: (input: string) => number;
  shareWin: (game: string, amount: number, detail?: string) => Promise<void>;
  QUICK_BETS: number[];
}

// Fallback while the live USD-based threshold is fetched / if the API is offline.
const MEMBER_THRESHOLD_FALLBACK = 100_000_000;

const DEFAULT_SETTINGS: GameSettings = {
  displayName: 'Player',
  avatar: 'dice',
  avatarDef: JSON.stringify(ALL_AVATARS[0]),
  volumeLevel: 0.7,
  voiceEnabled: true,
  textEnabled: true,
  aiHelpEnabled: true,
  casinoSoundEnabled: true,
  cardSkin: 'default',
  vappTVEnabled: false,
  celebrationsEnabled: true,
};

export const QUICK_BETS = [
  1_000_000,
  5_000_000,
  10_000_000,
  50_000_000,
  100_000_000,
];

const GlobalGameContext = createContext<GlobalGameContextValue | null>(null);

export function GlobalGameProvider({ children, balance }: { children: ReactNode; balance: number }) {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem('pcasino_game_settings');
      const parsed = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
      if (!parsed.avatarDef) parsed.avatarDef = JSON.stringify(ALL_AVATARS[0]);
      return parsed;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem('pcasino_game_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  // Live USD-based wallet threshold (refreshed on mount + every 5 min).
  const [memberThreshold, setMemberThreshold] = useState<number>(MEMBER_THRESHOLD_FALLBACK);
  const [usdBasis, setUsdBasis] = useState<number | null>(null);
  const [pricePerPc, setPricePerPc] = useState<number | null>(null);
  const [thresholdUnavailable, setThresholdUnavailable] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await walletApi.getThreshold();
        if (!alive) return;
        const n = data.pcAmount != null ? parseInt(data.pcAmount, 10) : NaN;
        if (Number.isFinite(n) && n > 0) setMemberThreshold(n);
        if (typeof data.usdBasis === 'number') setUsdBasis(data.usdBasis);
        if (typeof data.pricePerPc === 'number') setPricePerPc(data.pricePerPc);
        setThresholdUnavailable(!!data.unavailable);
      } catch { /* fallback already set */ }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const checkMembership = useCallback((bal: number): PcMembership => {
    const isMember = bal >= memberThreshold;
    return {
      isMember,
      tier: isMember ? 'member' : bal > 0 ? 'player' : 'guest',
      requiredBalance: memberThreshold,
      usdBasis,
      pricePerPc,
      thresholdUnavailable,
    };
  }, [memberThreshold, usdBasis, pricePerPc, thresholdUnavailable]);

  const membership = checkMembership(balance);

  const formatPc = useCallback((amount: number): string => {
    if (amount >= 1_000_000_000) return `${parseFloat((amount / 1_000_000_000).toFixed(2))}B`;
    if (amount >= 1_000_000) return `${parseFloat((amount / 1_000_000).toFixed(2))}M`;
    if (amount >= 1_000) return `${parseFloat((amount / 1_000).toFixed(1))}K`;
    return amount.toLocaleString();
  }, []);

  const parsePcInput = useCallback((input: string): number => {
    const s = input.trim().toUpperCase();
    if (s.endsWith('B')) return parseFloat(s) * 1_000_000_000;
    if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
    if (s.endsWith('K')) return parseFloat(s) * 1_000;
    return parseFloat(s) || 0;
  }, []);

  const shareWin = useCallback(async (game: string, amount: number, detail?: string) => {
    const text = `I just won ${formatPc(amount)} $Pc playing ${game} on $Pc Casino! ${detail || ''} Come play with me! #PcCasino #Crypto`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '$Pc Casino Win!', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {}
  }, [formatPc]);

  return (
    <GlobalGameContext.Provider value={{ settings, updateSettings, membership, checkMembership, formatPc, parsePcInput, shareWin, QUICK_BETS }}>
      {children}
    </GlobalGameContext.Provider>
  );
}

export function useGlobalGame() {
  const ctx = useContext(GlobalGameContext);
  if (!ctx) throw new Error('useGlobalGame must be used inside GlobalGameProvider');
  return ctx;
}
