import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ALL_AVATARS } from '@/components/AvatarSprite';

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
}

export interface PcMembership {
  isMember: boolean;
  tier: 'guest' | 'player' | 'member';
  requiredBalance: number;
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

const MEMBER_THRESHOLD = 100_000_000;

const DEFAULT_SETTINGS: GameSettings = {
  displayName: 'Player',
  avatar: '🎲',
  avatarDef: JSON.stringify(ALL_AVATARS[0]),
  volumeLevel: 0.7,
  voiceEnabled: true,
  textEnabled: true,
  aiHelpEnabled: true,
  casinoSoundEnabled: true,
  cardSkin: 'default',
  vappTVEnabled: false,
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

  const checkMembership = useCallback((bal: number): PcMembership => {
    const isMember = bal >= MEMBER_THRESHOLD;
    return {
      isMember,
      tier: isMember ? 'member' : bal > 0 ? 'player' : 'guest',
      requiredBalance: MEMBER_THRESHOLD,
    };
  }, []);

  const membership = checkMembership(balance);

  const formatPc = useCallback((amount: number): string => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
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
    const text = `🎰 I just won ${formatPc(amount)} $Pc playing ${game} on $Pc Casino! ${detail || ''} Come play with me! 💰 #PcCasino #Crypto`;
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
