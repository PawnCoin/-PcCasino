import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Settings, Trophy, RotateCcw, ChevronRight, Star, Shield, Crown, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createDeck, shuffleDeck } from '@/hooks/useGameEngine';
import { PokerChip, ChipStack, ChipSelector, formatChipLabel, ALL_CHIP_DENOMS } from '@/components/PokerChip';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';
import { chooseAICard, calculateAIBid } from '@/hooks/useSpadesAI';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { AvatarSprite, SPADES_AVATARS } from '@/components/AvatarSprite';
import type { AIDifficulty } from '@/hooks/useSpadesAI';
import type { Card } from '@/types';

interface SpadesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

interface SpadesPlayer {
  id: string;
  name: string;
  hand: Card[];
  bid: number | null;
  tricks: number;
  avatar: string;
  color: string;
  nilBid: boolean;
  blindNilBid: boolean;
}

interface TrickCard { player: string; card: Card; }
interface CompletedTrick { cards: TrickCard[]; winner: string; }

interface HouseRules {
  targetScore: number;
  sandbagPenalty: boolean;
  nilAllowed: boolean;
  blindNilAllowed: boolean;
}

interface PlayerStats { wins: number; losses: number; mmr: number; }
interface Reaction { id: string; player: string; emoji: string; }

const CHIP_VALUES = ALL_CHIP_DENOMS;
const REACTIONS = ['🔥', '👏', '😤', '🎉', '💀', '🤙'];

interface TablePropDef { id: string; label: string; el: React.ReactNode; }
const TABLE_PROPS: TablePropDef[] = [
  {
    id: 'whiskey', label: '🥃 Whiskey', el: (
      <svg width="52" height="60" viewBox="0 0 52 60">
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f5c542"/><stop offset="50%" stopColor="#b8832a"/><stop offset="100%" stopColor="#7a4f10"/></linearGradient>
          <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(255,255,255,0.35)"/><stop offset="100%" stopColor="transparent"/></linearGradient>
        </defs>
        <rect x="10" y="12" width="32" height="36" rx="4" fill="url(#wg1)" opacity="0.92"/>
        <rect x="10" y="12" width="12" height="36" rx="4" fill="url(#wg2)"/>
        <rect x="10" y="30" width="32" height="3" fill="rgba(180,120,20,0.5)"/>
        <ellipse cx="26" cy="12" rx="16" ry="4" fill="#c8973a"/>
        <ellipse cx="26" cy="48" rx="16" ry="4" fill="#7a4f10"/>
        <rect x="14" y="14" width="24" height="32" rx="2" fill="rgba(255,220,80,0.12)"/>
        <ellipse cx="20" cy="22" rx="4" ry="6" fill="rgba(255,255,255,0.18)" transform="rotate(-15 20 22)"/>
      </svg>
    ),
  },
  {
    id: 'beer', label: '🍺 Beer', el: (
      <svg width="52" height="64" viewBox="0 0 52 64">
        <defs>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f5b220"/><stop offset="60%" stopColor="#d4860a"/><stop offset="100%" stopColor="#a05e05"/></linearGradient>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(255,255,255,0.4)"/><stop offset="100%" stopColor="transparent"/></linearGradient>
        </defs>
        <rect x="8" y="16" width="28" height="40" rx="4" fill="url(#bg1)"/>
        <rect x="8" y="16" width="10" height="40" rx="4" fill="url(#bg2)"/>
        <path d="M36 22 Q44 22 44 30 Q44 38 36 38" fill="none" stroke="#c8920a" strokeWidth="5" strokeLinecap="round"/>
        <path d="M36 23 Q42 23 42 30 Q42 37 36 37" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
        <ellipse cx="22" cy="16" rx="14" ry="5" fill="white" opacity="0.9"/>
        <ellipse cx="22" cy="14" rx="13" ry="4" fill="white"/>
        <ellipse cx="16" cy="14" rx="4" ry="3" fill="rgba(255,255,255,0.7)"/>
        <ellipse cx="15" cy="30" rx="3" ry="5" fill="rgba(255,255,255,0.18)" transform="rotate(-10 15 30)"/>
      </svg>
    ),
  },
  {
    id: 'money', label: '💰 Cash', el: (
      <svg width="60" height="52" viewBox="0 0 60 52">
        <defs>
          <linearGradient id="mg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5dc769"/><stop offset="50%" stopColor="#2e8b40"/><stop offset="100%" stopColor="#1a5c28"/></linearGradient>
        </defs>
        {[6,4,2,0].map(o => <rect key={o} x={4+o} y={8+o} width="52" height="32" rx="3" fill={`rgba(30,110,50,${0.5+o*0.1})`} stroke="rgba(100,200,100,0.2)" strokeWidth="0.5"/>)}
        <rect x="4" y="8" width="52" height="32" rx="3" fill="url(#mg1)"/>
        <rect x="4" y="8" width="18" height="32" rx="3" fill="rgba(255,255,255,0.12)"/>
        <ellipse cx="30" cy="24" rx="10" ry="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        <text x="30" y="28" textAnchor="middle" fontSize="11" fontWeight="bold" fill="rgba(255,255,255,0.85)">$</text>
        <rect x="8" y="14" width="12" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
        <rect x="8" y="30" width="12" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
        <rect x="40" y="14" width="12" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
        <rect x="40" y="30" width="12" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
      </svg>
    ),
  },
  {
    id: 'jewelry', label: '💍 Ring', el: (
      <svg width="52" height="58" viewBox="0 0 52 58">
        <defs>
          <linearGradient id="jg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ffe066"/><stop offset="50%" stopColor="#d4af37"/><stop offset="100%" stopColor="#8b6914"/></linearGradient>
          <linearGradient id="jg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a8edfc"/><stop offset="40%" stopColor="#5bc8f5"/><stop offset="100%" stopColor="#1a7ac8"/></linearGradient>
        </defs>
        <ellipse cx="26" cy="40" rx="18" ry="10" fill="none" stroke="url(#jg1)" strokeWidth="7"/>
        <ellipse cx="26" cy="40" rx="18" ry="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/>
        <polygon points="26,4 34,16 26,24 18,16" fill="url(#jg2)"/>
        <polygon points="26,4 34,16 26,24 18,16" fill="url(#jg2)" opacity="0.6"/>
        <polygon points="26,4 34,16 26,10" fill="rgba(255,255,255,0.6)"/>
        <polygon points="18,16 26,24 20,20" fill="rgba(255,255,255,0.3)"/>
        <rect x="20" y="22" width="12" height="7" fill="url(#jg1)"/>
        <line x1="26" y1="4" x2="18" y2="16" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8"/>
        <line x1="26" y1="4" x2="34" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      </svg>
    ),
  },
  {
    id: 'cigar', label: '🚬 Cigar', el: (
      <svg width="68" height="36" viewBox="0 0 68 36">
        <defs>
          <linearGradient id="cg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#8B4513"/><stop offset="50%" stopColor="#6B3410"/><stop offset="100%" stopColor="#4a2108"/></linearGradient>
          <linearGradient id="cg2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#c8a84b"/><stop offset="100%" stopColor="#9a7a25"/></linearGradient>
        </defs>
        <rect x="4" y="12" width="46" height="12" rx="6" fill="url(#cg1)"/>
        <rect x="4" y="12" width="12" height="12" rx="6" fill="rgba(255,255,255,0.12)"/>
        <rect x="46" y="12" width="8" height="12" rx="3" fill="url(#cg2)"/>
        <rect x="50" y="13" width="14" height="10" rx="5" fill="#d4a04a"/>
        <rect x="62" y="14" width="4" height="8" rx="4" fill="#e8e0d0" opacity="0.9"/>
        <path d="M64 14 Q66 8 62 4 Q68 6 66 12" fill="rgba(200,200,200,0.4)"/>
        <path d="M62 12 Q65 5 60 2" stroke="rgba(220,220,220,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'cocktail', label: '🍸 Cocktail', el: (
      <svg width="50" height="66" viewBox="0 0 50 66">
        <defs>
          <linearGradient id="ckg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff6b9d"/><stop offset="100%" stopColor="#c0392b"/></linearGradient>
          <linearGradient id="ckg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(255,255,255,0.35)"/><stop offset="100%" stopColor="transparent"/></linearGradient>
        </defs>
        <polygon points="4,8 46,8 28,38 22,38" fill="rgba(255,120,170,0.25)" stroke="rgba(200,100,150,0.5)" strokeWidth="1"/>
        <polygon points="4,8 46,8 28,38 22,38" fill="url(#ckg1)" opacity="0.85"/>
        <polygon points="4,8 20,8 22,38" fill="url(#ckg2)"/>
        <line x1="25" y1="38" x2="25" y2="56" stroke="#c8a855" strokeWidth="2.5"/>
        <ellipse cx="25" cy="57" rx="10" ry="3" fill="#a07830" opacity="0.7"/>
        <line x1="34" y1="14" x2="46" y2="6" stroke="#90ee90" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="46" cy="6" rx="4" ry="4" fill="#2e8b57"/>
        <circle cx="14" cy="22" r="2.5" fill="rgba(255,255,255,0.3)"/>
      </svg>
    ),
  },
  {
    id: 'coffee', label: '☕ Coffee', el: (
      <svg width="54" height="64" viewBox="0 0 54 64">
        <defs>
          <linearGradient id="cofg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f5f5f0"/><stop offset="100%" stopColor="#ddd8cc"/></linearGradient>
        </defs>
        <rect x="6" y="20" width="32" height="32" rx="6" fill="url(#cofg1)"/>
        <rect x="6" y="20" width="10" height="32" rx="6" fill="rgba(255,255,255,0.5)"/>
        <path d="M38 26 Q46 26 46 32 Q46 38 38 38" fill="none" stroke="#ccc" strokeWidth="4" strokeLinecap="round"/>
        <ellipse cx="22" cy="20" rx="16" ry="5" fill="#e8e0d0"/>
        <ellipse cx="22" cy="22" rx="13" ry="4" fill="#4a2c10" opacity="0.9"/>
        <ellipse cx="16" cy="22" rx="4" ry="2" fill="rgba(255,255,255,0.2)"/>
        <path d="M16 8 Q16 4 20 6 Q20 2 24 4 Q24 1 28 3" stroke="rgba(200,200,200,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <rect x="8" y="50" width="36" height="4" rx="2" fill="#c8b89a"/>
        <rect x="4" y="54" width="44" height="3" rx="1.5" fill="#b8a888"/>
      </svg>
    ),
  },
];

const CARD_BACK_PRESETS = [
  { id: 'classic_blue', label: 'Classic Blue', style: { background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%)' } as React.CSSProperties },
  { id: 'crimson', label: 'Crimson', style: { background: 'linear-gradient(135deg, #7b1c1c 0%, #b71c1c 50%, #7b1c1c 100%)' } as React.CSSProperties },
  { id: 'midnight_gold', label: 'Midnight Gold', style: { background: 'linear-gradient(135deg, #3d2b00 0%, #8b6914 50%, #3d2b00 100%)' } as React.CSSProperties },
  { id: 'emerald', label: 'Emerald', style: { background: 'linear-gradient(135deg, #0d3312 0%, #2e7d32 50%, #0d3312 100%)' } as React.CSSProperties },
  { id: 'amethyst', label: 'Amethyst', style: { background: 'linear-gradient(135deg, #2d0050 0%, #6a1b9a 50%, #2d0050 100%)' } as React.CSSProperties },
];

const TIERS = [
  { name: 'Bronze', min: 0, color: '#CD7F32', icon: Shield },
  { name: 'Silver', min: 1000, color: '#C0C0C0', icon: Star },
  { name: 'Gold', min: 1500, color: '#D4AF37', icon: Crown },
  { name: 'Platinum', min: 2000, color: '#00BCD4', icon: Zap },
  { name: 'Diamond', min: 2500, color: '#9C27B0', icon: Flame },
];
const getTier = (mmr: number) => [...TIERS].reverse().find(t => mmr >= t.min) || TIERS[0];

const DEFAULT_RULES: HouseRules = { targetScore: 500, sandbagPenalty: true, nilAllowed: true, blindNilAllowed: true };
const PARTNER_INDEX: Record<number, number> = { 0: 2, 1: 3, 2: 0, 3: 1 };

const SUIT_SYMBOLS: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const PLAYER_NAMES = ['You', 'West', 'Partner', 'East'];
const PLAYER_COLORS = [
  'from-[#D4AF37] to-[#8B6914]',
  'from-[#B71C1C] to-[#7B1111]',
  'from-[#1565C0] to-[#0D3E87]',
  'from-[#2E7D32] to-[#1B5020]',
];
const PLAYER_AVATARS = ['🎭', '⚔️', '🤝', '🛡️'];
const PLAYER_TEXT_COLORS = ['text-[#D4AF37]', 'text-[#ef5350]', 'text-[#64b5f6]', 'text-[#81c784]'];

export function SpadesGame({ balance, onBack, onBet, onWin, onAddBalance, cardBackStyle }: SpadesGameProps) {
  const { playSound } = useSoundEffects();

  const mkPlayer = (idx: number): SpadesPlayer => ({
    id: idx === 0 ? 'you' : `p${idx + 1}`,
    name: PLAYER_NAMES[idx],
    hand: [], bid: null, tricks: 0,
    avatar: PLAYER_AVATARS[idx],
    color: PLAYER_COLORS[idx],
    nilBid: false, blindNilBid: false,
  });

  const [gamePhase, setGamePhase] = useState<'menu' | 'betting' | 'dealing' | 'bidding' | 'playing' | 'scoring'>('menu');
  const [players, setPlayers] = useState<SpadesPlayer[]>([0, 1, 2, 3].map(mkPlayer));
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [currentTrick, setCurrentTrick] = useState<TrickCard[]>([]);
  const [completedTricks, setCompletedTricks] = useState<CompletedTrick[]>([]);
  const [lastTrick, setLastTrick] = useState<CompletedTrick | null>(null);
  const [spadesBroken, setSpadesBroken] = useState(false);
  const [showSpadesBroken, setShowSpadesBroken] = useState(false);
  const [selectedChip, setSelectedChip] = useState(25);
  const [currentBet, setCurrentBet] = useState(0);
  const [tableChips, setTableChips] = useState<{ amount: number; count: number }[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showHouseRules, setShowHouseRules] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [message, setMessage] = useState('');
  const [teamScore, setTeamScore] = useState({ you: 0, opponent: 0 });
  const [bags, setBags] = useState({ you: 0, opponent: 0 });
  const [round, setRound] = useState(1);
  const [trickWinner, setTrickWinner] = useState<string | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const [loseFlash, setLoseFlash] = useState(false);
  const [houseRules, setHouseRules] = useState<HouseRules>({ ...DEFAULT_RULES });
  const [pendingRules, setPendingRules] = useState<HouseRules>({ ...DEFAULT_RULES });
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');
  const [rankedMode, setRankedMode] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ wins: 0, losses: 0, mmr: 1200 });
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [roundHistory, setRoundHistory] = useState<{ your: number; opp: number; round: number }[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [dealStep, setDealStep] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [tossCard, setTossCard] = useState<{ card: Card; rotation: number } | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [showHandResult, setShowHandResult] = useState(false);
  const [handResult, setHandResult] = useState<{
    yourBid: number; yourTricks: number; yourScore: number;
    oppBid: number; oppTricks: number; oppScore: number;
    newTotalYou: number; newTotalOpp: number;
    continueFn: () => void;
  } | null>(null);
  const [selectedProp, setSelectedProp] = useState('beer');
  const [showPropPicker, setShowPropPicker] = useState(false);
  const [localCardBack, setLocalCardBack] = useState<null | { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string }>(null);
  const [showCardBackPicker, setShowCardBackPicker] = useState(false);

  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    if (dealTimer.current) clearTimeout(dealTimer.current);
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
  }, []);

  useEffect(() => {
    if (gamePhase === 'playing' && currentPlayer === 0 && !isAIThinking) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => {
        setTurnTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(turnTimerRef.current!);
            turnTimerRef.current = null;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
      setTurnTimeLeft(null);
    }
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gamePhase, currentPlayer, isAIThinking]);

  useEffect(() => {
    if (turnTimeLeft === 0 && gamePhase === 'playing' && currentPlayer === 0) {
      const legal = getLegalIndices(players[0].hand, currentTrick);
      if (legal.length > 0) playCard(legal[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnTimeLeft]);

  const showTip = useCallback((msg: string) => {
    if (!tooltipsEnabled) return;
    setTooltip(msg);
    setTimeout(() => setTooltip(null), 3000);
  }, [tooltipsEnabled]);

  const addReaction = (emoji: string, pid: string = 'you') => {
    const r: Reaction = { id: `${Date.now()}-${Math.random()}`, player: pid, emoji };
    setReactions(prev => [...prev.slice(-4), r]);
    setTimeout(() => setReactions(prev => prev.filter(x => x.id !== r.id)), 2800);
  };

  const addChipToBet = (amount: number) => {
    if (currentBet + amount > balance) { setMessage('Insufficient balance!'); return; }
    playSound('chip');
    setCurrentBet(p => p + amount);
    setTableChips(prev => {
      const ex = prev.find(c => c.amount === amount);
      return ex ? prev.map(c => c.amount === amount ? { ...c, count: c.count + 1 } : c) : [...prev, { amount, count: 1 }];
    });
  };
  const clearBet = () => { setCurrentBet(0); setTableChips([]); setMessage(''); };

  const dealCards = () => {
    const newDeck = shuffleDeck(createDeck());
    return [0, 1, 2, 3].map((i) => ({
      ...mkPlayer(i),
      hand: newDeck.slice(i * 13, (i + 1) * 13).sort((a, b) => {
        const so: Record<string, number> = { hearts: 0, clubs: 1, diamonds: 2, spades: 3 };
        const rv: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
        return so[a.suit] - so[b.suit] || (rv[b.rank] ?? b.value) - (rv[a.rank] ?? a.value);
      }),
    }));
  };

  const startGame = () => {
    if (currentBet === 0) { setMessage('Place a bet first!'); return; }
    if (!onBet(currentBet)) return;
    setIsShuffling(true);
    setGamePhase('dealing');
    setDealStep(0);
    playSound('shuffle');
    setMessage('Shuffling...');

    dealTimer.current = setTimeout(() => {
      setIsShuffling(false);
      const newPlayers = dealCards();
      setPlayers(newPlayers);
      setCompletedTricks([]);
      setCurrentTrick([]);
      setLastTrick(null);
      setSpadesBroken(false);
      setRoundHistory([]);

      let step = 0;
      const dealInterval = setInterval(() => {
        step++;
        playSound('card');
        setDealStep(step);
        if (step >= 13) {
          clearInterval(dealInterval);
          setTimeout(() => {
            setGamePhase('bidding');
            setCurrentPlayer(0);
            setMessage('Look at your cards, then place your bid!');
            showTip('Count your spades and high cards to estimate your tricks.');
          }, 400);
        }
      }, 80);
    }, 1600);
  };

  const placeBid = (bidAmount: number, isNil = false, isBlindNil = false) => {
    playSound('click');
    const newPlayers = [...players];
    newPlayers[0] = { ...newPlayers[0], bid: bidAmount, nilBid: isNil, blindNilBid: isBlindNil };
    for (let i = 1; i < 4; i++) {
      const { bid, nilBid, blindNilBid } = calculateAIBid(newPlayers[i].hand, aiDifficulty, houseRules.nilAllowed, houseRules.blindNilAllowed);
      newPlayers[i] = { ...newPlayers[i], bid, nilBid, blindNilBid };
    }
    setPlayers(newPlayers);
    setGamePhase('playing');
    setCurrentPlayer(0);
    setMessage('Your lead — play a card!');
    showTip('Spades cannot be led until broken.');
  };

  const getLegalIndices = (hand: Card[], trick: TrickCard[]): number[] => {
    if (trick.length === 0) {
      if (!spadesBroken) {
        const nonSpade = hand.map((c, i) => i).filter(i => hand[i].suit !== 'spades');
        if (nonSpade.length > 0) return nonSpade;
      }
      return hand.map((_, i) => i);
    }
    const lead = trick[0].card.suit;
    const followers = hand.map((c, i) => i).filter(i => hand[i].suit === lead);
    return followers.length > 0 ? followers : hand.map((_, i) => i);
  };

  const triggerSpadesBroken = () => {
    setShowSpadesBroken(true);
    showTip('♠ Spades are broken! You can now lead spades.');
    setTimeout(() => setShowSpadesBroken(false), 1800);
  };

  const playCard = (cardIndex: number) => {
    if (currentPlayer !== 0 || isAIThinking) return;
    const card = players[0].hand[cardIndex];
    const legal = getLegalIndices(players[0].hand, currentTrick);
    if (!legal.includes(cardIndex)) {
      if (currentTrick.length > 0 && players[0].hand.some(c => c.suit === currentTrick[0].card.suit)) {
        setMessage(`Follow suit! Play a ${currentTrick[0].card.suit}.`);
      } else {
        setMessage('Spades not broken — lead another suit.');
      }
      return;
    }

    const rotation = (Math.random() - 0.5) * 28;
    setTossCard({ card, rotation });
    playSound('card');
    setTimeout(() => setTossCard(null), 450);

    if (card.suit === 'spades' && !spadesBroken) { setSpadesBroken(true); triggerSpadesBroken(); }

    const newPlayers = players.map((p, i) => i === 0 ? { ...p, hand: p.hand.filter((_, j) => j !== cardIndex) } : p);
    setPlayers(newPlayers);
    const newTrick = [...currentTrick, { player: 'you', card }];
    setCurrentTrick(newTrick);
    setIsAIThinking(true);
    aiTimer.current = setTimeout(() => playAICards(newTrick, newPlayers), Math.round(650 / gameSpeed));
  };

  const playAICards = (trick: TrickCard[], curPlayers: SpadesPlayer[]) => {
    let trickCards = [...trick];
    let nextPlayer = (currentPlayer + 3) % 4;
    const updated = curPlayers.map(p => ({ ...p }));

    const playNext = () => {
      if (trickCards.length >= 4) { setIsAIThinking(false); resolveTrick(trickCards, updated); return; }
      const pIdx = nextPlayer;
      const player = updated[pIdx];
      const chosen = chooseAICard({
        player: { ...player, bid: player.bid },
        playerIndex: pIdx,
        allPlayers: updated.map(p => ({ ...p, bid: p.bid })),
        currentTrick: trickCards,
        tricksPlayed: completedTricks.length,
        spadesBroken,
        difficulty: aiDifficulty,
        partnerIndex: PARTNER_INDEX[pIdx],
      });

      if (chosen.suit === 'spades' && !spadesBroken) { setSpadesBroken(true); triggerSpadesBroken(); }
      playSound('card');

      const aiRotation = (Math.random() - 0.5) * 24;
      setTossCard({ card: chosen, rotation: aiRotation });
      setTimeout(() => setTossCard(null), 500);

      updated[pIdx] = { ...updated[pIdx], hand: updated[pIdx].hand.filter(c => !(c.suit === chosen.suit && c.rank === chosen.rank)) };
      trickCards = [...trickCards, { player: player.id, card: chosen }];
      setCurrentTrick([...trickCards]);
      if (Math.random() > 0.7) setTimeout(() => addReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)], player.id), 200);
      nextPlayer = (nextPlayer + 3) % 4;
      aiTimer.current = setTimeout(playNext, Math.round(580 / gameSpeed));
    };
    playNext();
  };

  const startNewTrick = (leaderIdx: number, curPlayers: SpadesPlayer[], sbBroken: boolean) => {
    let trickCards: TrickCard[] = [];
    let updated = curPlayers.map(p => ({ ...p }));
    let nextPIdx = leaderIdx;
    let localBroken = sbBroken;

    const playNext = () => {
      if (trickCards.length >= 4) {
        setIsAIThinking(false);
        resolveTrick(trickCards, updated);
        return;
      }
      const pIdx = nextPIdx;
      if (pIdx === 0) {
        setCurrentTrick([...trickCards]);
        setPlayers(updated);
        setCurrentPlayer(0);
        setIsAIThinking(false);
        return;
      }
      const player = updated[pIdx];
      const chosen = chooseAICard({
        player: { ...player, bid: player.bid },
        playerIndex: pIdx,
        allPlayers: updated.map(p => ({ ...p, bid: p.bid })),
        currentTrick: trickCards,
        tricksPlayed: completedTricks.length,
        spadesBroken: localBroken,
        difficulty: aiDifficulty,
        partnerIndex: PARTNER_INDEX[pIdx],
      });
      if (chosen.suit === 'spades' && !localBroken) { setSpadesBroken(true); triggerSpadesBroken(); localBroken = true; }
      playSound('card');
      const rot = (Math.random() - 0.5) * 24;
      setTossCard({ card: chosen, rotation: rot });
      setTimeout(() => setTossCard(null), 500);
      updated[pIdx] = { ...updated[pIdx], hand: updated[pIdx].hand.filter(c => !(c.suit === chosen.suit && c.rank === chosen.rank)) };
      trickCards = [...trickCards, { player: player.id, card: chosen }];
      setCurrentTrick([...trickCards]);
      if (Math.random() > 0.7) setTimeout(() => addReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)], player.id), 200);
      nextPIdx = (nextPIdx + 3) % 4;
      aiTimer.current = setTimeout(playNext, Math.round(580 / gameSpeed));
    };

    setIsAIThinking(true);
    aiTimer.current = setTimeout(playNext, Math.round(900 / gameSpeed));
  };

  const resolveTrick = (cards: TrickCard[], curPlayers: SpadesPlayer[]) => {
    const lead = cards[0].card.suit;
    let winCard = cards[0].card, winner = cards[0].player;
    for (let i = 1; i < cards.length; i++) {
      const { card, player } = cards[i];
      if (card.suit === 'spades') {
        if (winCard.suit !== 'spades' || card.value > winCard.value) { winCard = card; winner = player; }
      } else if (card.suit === lead && winCard.suit !== 'spades') {
        if (card.value > winCard.value) { winCard = card; winner = player; }
      }
    }
    const newPlayers = curPlayers.map(p => ({ ...p, tricks: p.id === winner ? p.tricks + 1 : p.tricks }));
    setPlayers(newPlayers);
    const completed: CompletedTrick = { cards, winner };
    const newCompleted = [...completedTricks, completed];
    setCompletedTricks(newCompleted);
    setLastTrick(completed);
    setCurrentTrick([]);
    setTrickWinner(winner);
    const wname = ['you', 'p2', 'p3', 'p4'].indexOf(winner) >= 0 ? PLAYER_NAMES[['you', 'p2', 'p3', 'p4'].indexOf(winner)] : 'Unknown';
    setMessage(`${wname} won the trick!`);
    playSound('chip');
    setTimeout(() => setTrickWinner(null), Math.round(1300 / gameSpeed));
    const winnerIdx = newPlayers.findIndex(p => p.id === winner);
    setCurrentPlayer(winnerIdx);
    if (newCompleted.length >= 13) {
      setTimeout(() => scoreRound(newPlayers), Math.round(1700 / gameSpeed));
    } else if (winnerIdx !== 0) {
      setTimeout(() => startNewTrick(winnerIdx, newPlayers, spadesBroken), Math.round(1600 / gameSpeed));
    }
  };

  const scoreRound = (fp: SpadesPlayer[]) => {
    const yourBid = (fp[0].bid || 0) + (fp[2].bid || 0);
    const yourTricks = fp[0].tricks + fp[2].tricks;
    const oppBid = (fp[1].bid || 0) + (fp[3].bid || 0);
    const oppTricks = fp[1].tricks + fp[3].tricks;
    let ys = 0, os = 0, nb = { ...bags };
    const scoreTeam = (bid: number, won: number, isYou: boolean) => {
      let s = won >= bid ? bid * 10 : -bid * 10;
      if (won >= bid) { const over = won - bid; if (isYou) nb.you += over; else nb.opponent += over; }
      return s;
    };
    ys = scoreTeam(yourBid, yourTricks, true);
    os = scoreTeam(oppBid, oppTricks, false);
    if (houseRules.sandbagPenalty) {
      if (nb.you >= 10) { ys -= 100; nb.you -= 10; }
      if (nb.opponent >= 10) { os -= 100; nb.opponent -= 10; }
    }

    // NIL scoring
    for (const p of fp) {
      if (!p.nilBid && !p.blindNilBid) continue;
      const bonus = p.blindNilBid ? 200 : 100;
      const isYourTeam = p.id === 'you' || p.id === 'p3';
      if (p.tricks === 0) { if (isYourTeam) ys += bonus; else os += bonus; }
      else { if (isYourTeam) ys -= bonus; else os -= bonus; }
    }

    const ny = teamScore.you + ys, no = teamScore.opponent + os;
    setTeamScore({ you: ny, opponent: no });
    setBags(nb);
    setRoundHistory(prev => [...prev, { your: ys, opp: os, round }]);
    setRound(r => r + 1);
    setMessage(`Round ${round} done! You: ${ys > 0 ? '+' : ''}${ys} pts`);

    const doNextRound = () => {
      setShowHandResult(false);
      setHandResult(null);
      if (ny >= houseRules.targetScore || no >= houseRules.targetScore) {
        const won = ny > no;
        if (won) {
          onWin(currentBet * 2);
          setMessage(`🎉 You won! +${currentBet * 2} $Pc`);
          setWinFlash(true); setTimeout(() => setWinFlash(false), 2500);
          playSound('win');
          if (rankedMode) setPlayerStats(p => ({ ...p, wins: p.wins + 1, mmr: p.mmr + 25 }));
        } else {
          setMessage('Opponents won. Better luck next time!');
          setLoseFlash(true); setTimeout(() => setLoseFlash(false), 1500);
          playSound('lose');
          if (rankedMode) setPlayerStats(p => ({ ...p, losses: p.losses + 1, mmr: Math.max(0, p.mmr - 20) }));
        }
        setGamePhase('menu');
        setCurrentBet(0); setTableChips([]);
        setTeamScore({ you: 0, opponent: 0 }); setBags({ you: 0, opponent: 0 });
        setRound(1);
      } else {
        setIsShuffling(true);
        setGamePhase('dealing');
        setDealStep(0);
        playSound('shuffle');
        setMessage('Shuffling...');
        dealTimer.current = setTimeout(() => {
          setIsShuffling(false);
          const np = dealCards();
          setPlayers(np);
          setCompletedTricks([]); setCurrentTrick([]); setLastTrick(null); setSpadesBroken(false);
          let step = 0;
          const di = setInterval(() => {
            step++; playSound('card'); setDealStep(step);
            if (step >= 13) {
              clearInterval(di);
              setTimeout(() => { setGamePhase('bidding'); setCurrentPlayer(0); setMessage('New round! Place your bid.'); }, 400);
            }
          }, 80);
        }, 1600);
      }
    };

    setHandResult({
      yourBid, yourTricks, yourScore: ys,
      oppBid, oppTricks, oppScore: os,
      newTotalYou: ny, newTotalOpp: no,
      continueFn: doNextRound,
    });
    setTimeout(() => setShowHandResult(true), 1800);
  };

  const legalIndices = (gamePhase === 'playing' && currentPlayer === 0)
    ? getLegalIndices(players[0].hand, currentTrick) : [];

  const playerIdMap: Record<string, number> = { you: 0, p2: 1, p3: 2, p4: 3 };
  const tier = getTier(playerStats.mmr);
  const TierIcon = tier.icon;

  // Card face renderer - proper playing card with corner indices
  const SUIT_COLORS: Record<string, string> = {
    hearts: '#c0272d',
    diamonds: '#c0272d',
    clubs: '#111827',
    spades: '#111827',
  };

  const renderCardFace = (
    card: Card,
    onClick?: () => void,
    opts: { size?: 'sm' | 'md' | 'lg'; playable?: boolean; highlight?: boolean; fanIdx?: number; fanTotal?: number } = {}
  ) => {
    const { size = 'md', playable = true, highlight = false, fanIdx, fanTotal } = opts;
    const suit = SUIT_SYMBOLS[card.suit];
    const color = SUIT_COLORS[card.suit] ?? '#111827';

    const dims = size === 'lg' ? { w: 92, h: 130 } : size === 'sm' ? { w: 50, h: 70 } : { w: 72, h: 100 };
    const textSizes = size === 'lg' ? { rank: '16px', corner: '13px', center: '38px' } : size === 'sm' ? { rank: '10px', corner: '8px', center: '22px' } : { rank: '13px', corner: '11px', center: '30px' };

    const hasFan = fanIdx !== undefined && fanTotal !== undefined;
    const fanRot = hasFan ? (fanIdx - (fanTotal - 1) / 2) * 5 : 0;
    const fanY = hasFan ? Math.abs(fanIdx - (fanTotal - 1) / 2) * 4 : 0;

    return (
      <div
        key={`${card.suit}-${card.rank}-${fanIdx}`}
        style={{
          transform: hasFan ? `rotate(${fanRot}deg) translateY(${fanY}px)` : undefined,
          transformOrigin: 'bottom center',
          transition: 'transform 0.2s ease',
          zIndex: hasFan ? fanIdx : undefined,
          position: 'relative',
        }}
      >
        <button
          onClick={onClick}
          disabled={!onClick}
          onMouseEnter={() => fanIdx !== undefined && setHoveredCard(fanIdx)}
          onMouseLeave={() => setHoveredCard(null)}
          className={`relative select-none transition-all duration-200 ${onClick && playable ? 'cursor-pointer' : ''}`}
          style={{
            width: `${dims.w}px`,
            height: `${dims.h}px`,
            background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 60%, #ebebeb 100%)',
            borderRadius: '8px',
            border: `1.5px solid ${highlight ? '#D4AF37' : 'rgba(0,0,0,0.18)'}`,
            boxShadow: highlight
              ? `0 0 0 2px #D4AF37, 0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.9)`
              : `0 6px 18px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)`,
            transform: (hoveredCard === fanIdx && onClick && playable)
              ? 'translateY(-22px) scale(1.08)'
              : undefined,
            opacity: (onClick === undefined && !playable) ? 0.45 : 1,
            animation: 'cardFlipIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            color,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Top-left corner */}
          <div style={{ position: 'absolute', top: '4px', left: '5px', lineHeight: 1, textAlign: 'center' }}>
            <div style={{ fontSize: textSizes.rank, fontWeight: 900, lineHeight: 1 }}>{card.rank}</div>
            <div style={{ fontSize: textSizes.corner, lineHeight: 1 }}>{suit}</div>
          </div>
          {/* Center suit */}
          <div style={{ fontSize: textSizes.center, lineHeight: 1 }}>{suit}</div>
          {/* Bottom-right corner (rotated 180°) */}
          <div style={{ position: 'absolute', bottom: '4px', right: '5px', lineHeight: 1, textAlign: 'center', transform: 'rotate(180deg)' }}>
            <div style={{ fontSize: textSizes.rank, fontWeight: 900, lineHeight: 1 }}>{card.rank}</div>
            <div style={{ fontSize: textSizes.corner, lineHeight: 1 }}>{suit}</div>
          </div>
          {/* Gloss overlay */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '7px', background: 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, transparent 50%)', pointerEvents: 'none' }} />
        </button>
      </div>
    );
  };

  const activeCardBack = localCardBack || cardBackStyle;

  const renderCardBack = (w: number, h: number, rotDeg = 0, key?: string | number) => {
    const hasImageBack = activeCardBack?.type === 'image';
    const hasCssBack = activeCardBack?.type === 'css';
    const backStyle: React.CSSProperties = hasImageBack
      ? { backgroundImage: `url(${(activeCardBack as { type: 'image'; image: string }).image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : hasCssBack
        ? (activeCardBack as { type: 'css'; style: React.CSSProperties }).style
        : { background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%)' };

    return (
      <div key={key} style={{
        width: `${w}px`, height: `${h}px`, borderRadius: '7px', flexShrink: 0,
        ...backStyle,
        border: '1.5px solid rgba(192,192,192,0.35)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        transform: `rotate(${rotDeg}deg)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {!hasImageBack && (
          <div style={{
            position: 'absolute', inset: '5px', borderRadius: '4px',
            border: '1px solid rgba(212,175,55,0.4)',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,175,55,0.08) 4px, rgba(212,175,55,0.08) 8px)',
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', borderRadius: '7px', pointerEvents: 'none' }} />
      </div>
    );
  };

  const posNames: Record<string, string> = { you: 'You', p2: 'West', p3: 'Partner', p4: 'East' };

  return (
    <CasinoEnvironment gameType="spades">
      <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
        <style>{`
          @keyframes cardFlipIn {
            0% { transform: rotateY(90deg) scale(0.7); opacity: 0; }
            60% { transform: rotateY(-5deg) scale(1.02); opacity: 1; }
            100% { transform: rotateY(0deg) scale(1); opacity: 1; }
          }
          @keyframes tossCard {
            0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
            40% { transform: translateY(-60px) rotate(var(--tr)) scale(1.12); opacity: 1; }
            100% { transform: translateY(-120px) rotate(calc(var(--tr)*1.5)) scale(0.9); opacity: 0; }
          }
          @keyframes tossCardIn {
            0% { transform: translate(-50%, -50%) rotate(calc(var(--tr) * 2)) scale(0.4); opacity: 0; }
            35% { transform: translate(-50%, -50%) rotate(var(--tr)) scale(1.18); opacity: 1; }
            70% { transform: translate(-50%, -50%) rotate(var(--tr)) scale(1.05); opacity: 1; }
            100% { transform: translate(-50%, -50%) rotate(var(--tr)) scale(0.85); opacity: 0; }
          }
          @keyframes slideToCenter-0 {
            0%  { transform: translateY(80px) scale(0.8) rotate(var(--tr)); opacity: 0; }
            100%{ transform: translateY(0) scale(1) rotate(var(--tr)); opacity: 1; }
          }
          @keyframes slideToCenter-1 {
            0%  { transform: translateX(80px) scale(0.8) rotate(var(--tr)); opacity: 0; }
            100%{ transform: translateX(0) scale(1) rotate(var(--tr)); opacity: 1; }
          }
          @keyframes slideToCenter-2 {
            0%  { transform: translateY(-80px) scale(0.8) rotate(var(--tr)); opacity: 0; }
            100%{ transform: translateY(0) scale(1) rotate(var(--tr)); opacity: 1; }
          }
          @keyframes slideToCenter-3 {
            0%  { transform: translateX(-80px) scale(0.8) rotate(var(--tr)); opacity: 0; }
            100%{ transform: translateX(0) scale(1) rotate(var(--tr)); opacity: 1; }
          }
          @keyframes deckShuffle {
            0%,100% { transform: translateX(0) rotate(0deg); }
            20%  { transform: translateX(-18px) rotate(-8deg); }
            40%  { transform: translateX(18px) rotate(8deg); }
            60%  { transform: translateX(-12px) rotate(-5deg); }
            80%  { transform: translateX(12px) rotate(5deg); }
          }
          @keyframes dealFly {
            0%   { transform: translate(0,0) scale(0.5) rotate(0deg); opacity:0; }
            40%  { opacity: 1; }
            100% { transform: translate(var(--dx),var(--dy)) scale(1) rotate(var(--dr)); opacity: 1; }
          }
          @keyframes spadesBurst {
            0%   { transform: scale(0.2) rotate(-30deg); opacity: 0; }
            45%  { transform: scale(1.5) rotate(8deg); opacity: 1; }
            75%  { transform: scale(1) rotate(0deg); opacity: 1; }
            100% { transform: scale(2) rotate(15deg); opacity: 0; }
          }
          @keyframes trickGlow {
            0%,100% { filter: drop-shadow(0 0 4px rgba(212,175,55,0.3)); }
            50% { filter: drop-shadow(0 0 20px rgba(212,175,55,0.95)); }
          }
          @keyframes winPulse {
            0%,100% { box-shadow: inset 0 0 0 transparent; }
            40%      { box-shadow: inset 0 0 120px rgba(67,160,71,0.3); }
          }
          @keyframes loseShake {
            0%,100% { transform: translateX(0); }
            20%,60% { transform: translateX(-6px); }
            40%,80% { transform: translateX(6px); }
          }
          @keyframes reactionFloat {
            0%   { transform: translateY(0) scale(0.6); opacity: 1; }
            100% { transform: translateY(-90px) scale(1.5); opacity: 0; }
          }
          @keyframes tipSlide {
            0%   { transform: translateY(-10px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes bidPop {
            0%   { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* NAV */}
        <InGameTopBar
          gameName="♠ Spades"
          balance={balance}
          onBack={onBack}
          onAddBalance={onAddBalance}
          showShare
          rightSlot={
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {rankedMode && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold"
                  style={{ borderColor: tier.color, color: tier.color }}>
                  <TierIcon className="w-3 h-3" />{tier.name} {playerStats.mmr}
                </div>
              )}
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowHouseRules(true)}><Settings className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowTournament(true)}><Trophy className="w-4 h-4 text-[#D4AF37]" /></Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowRules(true)}><Info className="w-4 h-4" /></Button>
            </div>
          }
        />

        {/* TOOLTIP */}
        {tooltip && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-black/90 border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-medium pointer-events-none"
            style={{ animation: 'tipSlide 0.3s ease-out' }}>
            💡 {tooltip}
          </div>
        )}

        {/* FLOATING REACTIONS */}
        <div className="fixed bottom-44 right-3 z-50 pointer-events-none flex flex-col gap-1">
          {reactions.map(r => (
            <div key={r.id} className="text-3xl" style={{ animation: 'reactionFloat 2.8s ease-out forwards' }}>{r.emoji}</div>
          ))}
        </div>

        {/* AI INDICATOR */}
        {isAIThinking && (
          <div className="fixed top-14 right-3 z-40 text-xs px-2 py-1 rounded-full bg-black/80 border border-[#D4AF37]/30 text-[#D4AF37] animate-pulse">AI…</div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex flex-col flex-1">

          {/* ═══════════ MENU SCREEN ═══════════ */}
          {gamePhase === 'menu' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-8">
              <div className="text-center">
                <div className="text-9xl mb-2" style={{ textShadow: '0 0 60px rgba(212,175,55,0.7)', filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.5))' }}>♠</div>
                <h1 className="font-casino text-5xl font-bold text-gradient-gold tracking-widest">SPADES</h1>
                <p className="text-gray-500 text-sm mt-1">Elite Competitive Edition</p>
              </div>

              <div className="w-full max-w-xs space-y-3">
                <div className="text-xs text-[#C0C0C0] uppercase tracking-widest text-center">AI Difficulty</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['easy', 'medium', 'hard', 'elite'] as AIDifficulty[]).map(d => (
                    <button key={d} onClick={() => setAIDifficulty(d)}
                      className="py-2.5 rounded-xl font-bold text-sm transition-all border-2 capitalize"
                      style={{ background: aiDifficulty === d ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)', borderColor: aiDifficulty === d ? '#D4AF37' : 'rgba(255,255,255,0.08)', color: aiDifficulty === d ? '#D4AF37' : '#666' }}>
                      {d === 'elite' ? '👑 ' : d === 'hard' ? '🔥 ' : d === 'medium' ? '⚡ ' : '😊 '}{d}
                    </button>
                  ))}
                </div>

                <button onClick={() => setRankedMode(r => !r)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all"
                  style={{ background: rankedMode ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)', borderColor: rankedMode ? '#D4AF37' : 'rgba(255,255,255,0.08)' }}>
                  <span className="text-sm font-bold" style={{ color: rankedMode ? '#D4AF37' : '#666' }}>🏆 Ranked Mode</span>
                  <div className="w-10 h-5 rounded-full relative" style={{ background: rankedMode ? '#D4AF37' : '#333' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: rankedMode ? '22px' : '2px' }} />
                  </div>
                </button>

                {rankedMode && (
                  <div className="flex justify-center gap-6 text-center">
                    <div><div className="text-xl font-bold" style={{ color: tier.color }}>{playerStats.mmr}</div><div className="text-xs text-gray-500">MMR</div></div>
                    <div><div className="text-xl font-bold text-[#43A047]">{playerStats.wins}</div><div className="text-xs text-gray-500">Wins</div></div>
                    <div><div className="text-xl font-bold text-[#B71C1C]">{playerStats.losses}</div><div className="text-xs text-gray-500">Losses</div></div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setTooltipsEnabled(t => !t)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold border transition-all"
                    style={{ background: tooltipsEnabled ? 'rgba(30,136,229,0.15)' : 'transparent', borderColor: tooltipsEnabled ? '#1E88E5' : 'rgba(255,255,255,0.1)', color: tooltipsEnabled ? '#1E88E5' : '#555' }}>
                    💡 Tips {tooltipsEnabled ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => setShowHouseRules(true)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold border border-white/10 text-gray-500 hover:text-white hover:border-white/25 transition-all">
                    ⚙️ Rules
                  </button>
                </div>

                <Button onClick={() => setGamePhase('betting')} className="btn-primary w-full py-4 text-xl font-bold">PLAY NOW ♠</Button>
              </div>
            </div>
          )}

          {/* ═══════════ BETTING SCREEN ═══════════ */}
          {gamePhase === 'betting' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-8">
              <div className="text-2xl font-casino text-gradient-gold font-bold">Place Your Bet</div>
              <div className="text-sm text-gray-400">Win 2× your bet if your team reaches {houseRules.targetScore} pts first</div>

              {/* Balance + Get More */}
              <div className="flex items-center justify-between w-full max-w-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
                <div>
                  <div className="text-[9px] text-gray-600 tracking-widest font-bold uppercase">Balance</div>
                  <div className="text-lg font-bold text-[#D4AF37]">{formatChipLabel(balance)} $Pc</div>
                </div>
                {onAddBalance && (
                  <button onClick={() => onAddBalance(10_000)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-green-400" style={{ border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)' }}>
                    + Get $Pc
                  </button>
                )}
              </div>

              {/* Full chip selector */}
              <ChipSelector
                selectedChip={selectedChip}
                onSelect={setSelectedChip}
                balance={balance}
              />

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Bet</div>
                  <div className="text-4xl font-bold text-[#D4AF37]">{currentBet}</div>
                  <div className="text-xs text-gray-500">$Pc</div>
                </div>
                <button onClick={() => addChipToBet(selectedChip)}
                  className="relative w-24 h-24 rounded-full border-4 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all bg-black/40 flex items-center justify-center hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                  {tableChips.length > 0 ? (
                    <div className="relative">
                      {tableChips.map((c, i) => (
                        <div key={i} className="absolute" style={{ transform: `translate(${Math.sin(i * 0.6) * 5}px,${-i * 4}px)`, zIndex: tableChips.length - i }}>
                          <ChipStack amount={c.amount} count={c.count} size="sm" />
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-[#D4AF37]/40 text-xs text-center">CLICK<br />TO BET</span>}
                </button>
                <button onClick={clearBet} disabled={currentBet === 0} className="px-4 py-2 rounded-lg bg-[#B71C1C]/70 hover:bg-[#B71C1C] text-white text-sm font-bold disabled:opacity-30 transition-all">CLEAR</button>
              </div>

              <Button onClick={startGame} disabled={currentBet === 0} className="btn-primary py-4 px-12 text-xl font-bold">
                DEAL CARDS ♠
              </Button>
              <button onClick={() => setGamePhase('menu')} className="text-gray-600 text-sm hover:text-gray-400 transition-colors">← Back to Menu</button>
            </div>
          )}

          {/* ═══════════ TABLE (DEALING / BIDDING / PLAYING) ═══════════ */}
          {(gamePhase === 'dealing' || gamePhase === 'bidding' || gamePhase === 'playing') && (
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>

              {/* SCORE BAR */}
              <div className="border-b border-white/5" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 uppercase">R{round}</div>
                    <div className="flex items-center gap-1">
                      <div className="w-14 h-2 rounded-full bg-black/50 overflow-hidden border border-[#43A047]/30">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (teamScore.you / houseRules.targetScore) * 100)}%`, background: '#43A047' }} />
                      </div>
                      <span className="text-[#43A047] text-xs font-bold">{teamScore.you}</span>
                      <span className="text-gray-600 text-[10px]">· {bags.you}🎒</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setShowPropPicker(true)} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Table Props">🎭</button>
                    <button onClick={() => setShowCardBackPicker(true)} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Card Back">🃏</button>
                    <span className="text-[#D4AF37]/50 text-[10px]">{houseRules.targetScore}pt</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 text-[10px]">{bags.opponent}🎒 ·</span>
                    <span className="text-[#ef5350] text-xs font-bold">{teamScore.opponent}</span>
                    <div className="w-14 h-2 rounded-full bg-black/50 overflow-hidden border border-[#B71C1C]/30">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (teamScore.opponent / houseRules.targetScore) * 100)}%`, background: '#B71C1C' }} />
                    </div>
                  </div>
                </div>
                {/* Speed control strip */}
                <div className="flex items-center gap-2 px-3 pb-1.5">
                  <span className="text-[10px] text-gray-600 shrink-0">Speed:</span>
                  {[0.5, 1, 1.5, 2, 3].map(s => (
                    <button key={s} onClick={() => setGameSpeed(s)}
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold transition-all"
                      style={{ background: gameSpeed === s ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)', color: gameSpeed === s ? '#D4AF37' : '#555', border: `1px solid ${gameSpeed === s ? '#D4AF37' : 'transparent'}` }}>
                      {s === 0.5 ? '½×' : `${s}×`}
                    </button>
                  ))}
                  <span className="text-[10px] text-gray-600 ml-auto shrink-0">{gameSpeed === 0.5 ? 'Slow' : gameSpeed >= 3 ? 'Turbo' : gameSpeed >= 2 ? 'Fast' : gameSpeed >= 1.5 ? 'Quick' : 'Normal'}</span>
                </div>
              </div>

              {/* TABLE */}
              <div
                className="flex-1 relative"
                style={{
                  background: 'radial-gradient(ellipse at 50% 45%, #2e7d32 0%, #1b5e20 45%, #0d3312 100%)',
                  animation: winFlash ? 'winPulse 2s ease-out' : loseFlash ? 'loseShake 0.5s ease-out' : undefined,
                  minHeight: '300px',
                }}
              >
                {/* Felt texture lines */}
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)' }} />
                {/* Inner border */}
                <div className="absolute inset-[10px] pointer-events-none rounded-sm" style={{ border: '1px solid rgba(212,175,55,0.15)', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3)' }} />

                {/* $Pc logo engraving in table center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-[1]" style={{ opacity: 0.07 }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 36, color: '#D4AF37', letterSpacing: '0.2em', textAlign: 'center', lineHeight: 1.1 }}>♠</div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: '#D4AF37', letterSpacing: '0.35em', textAlign: 'center', marginTop: 2 }}>$Pc CASINO</div>
                </div>

                {/* 3D Table prop - user selected */}
                {(() => {
                  const prop = TABLE_PROPS.find(p => p.id === selectedProp) || TABLE_PROPS[0];
                  return (
                    <div className="absolute top-3 right-3 select-none z-[2]"
                      style={{ opacity: 0.88, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.75))', cursor: 'pointer' }}
                      onClick={() => setShowPropPicker(true)}
                      title="Click to change prop">
                      {prop.el}
                    </div>
                  );
                })()}

                {/* ── PARTNER (TOP) ── */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
                  {/* Partner card backs - arch fan */}
                  {(() => {
                    const n = Math.min(players[2].hand.length || 8, 13);
                    const step = Math.min(8, 72 / Math.max(n - 1, 1));
                    return (
                      <div style={{ position: 'relative', width: '220px', height: '64px' }}>
                        {Array.from({ length: n }).map((_, i) => {
                          const angle = (i - (n - 1) / 2) * step;
                          return (
                            <div key={i} style={{
                              position: 'absolute', left: '50%', bottom: 0,
                              transform: `translateX(-50%) rotate(${angle}deg)`,
                              transformOrigin: 'bottom center',
                              zIndex: i,
                            }}>
                              {renderCardBack(38, 56, 0, i)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {/* Player badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 border border-[#1565C0]/50 backdrop-blur-sm">
                    <div className="relative">
                      <AvatarSprite avatar={SPADES_AVATARS[2]} size={38} active={currentPlayer === 2 && gamePhase === 'playing'} />
                      {currentPlayer === 2 && gamePhase === 'playing' && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{players[2].name}</div>
                      <div className="text-xs text-white/60">{players[2].nilBid ? '🚫NIL' : `Bid: ${players[2].bid ?? '?'}`} · {players[2].tricks}✓</div>
                    </div>
                  </div>
                </div>

                {/* ── WEST (LEFT) ── */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-row items-center gap-1.5 z-10">
                  {/* West arch fan - fan opens RIGHT toward table center */}
                  {(() => {
                    const n = Math.min(players[1].hand.length || 8, 13);
                    const step = Math.min(8, 72 / Math.max(n - 1, 1));
                    return (
                      <div style={{ position: 'relative', width: '64px', height: '200px' }}>
                        {Array.from({ length: n }).map((_, i) => {
                          const angle = (i - (n - 1) / 2) * step;
                          return (
                            <div key={i} style={{
                              position: 'absolute', left: 0, top: '50%',
                              transform: `translateY(-50%) rotate(${angle}deg)`,
                              transformOrigin: 'left center',
                              zIndex: i,
                            }}>
                              {renderCardBack(56, 38, 0, i)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="flex flex-col items-center px-2 py-2 rounded-xl bg-black/75 border border-[#8B0000]/50 backdrop-blur-sm">
                    <div className="relative mb-1">
                      <AvatarSprite avatar={SPADES_AVATARS[1]} size={50} active={currentPlayer === 1 && gamePhase === 'playing'} />
                      {currentPlayer === 1 && gamePhase === 'playing' && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />}
                    </div>
                    <div className="text-xs font-bold text-white">{players[1].name}</div>
                    <div className="text-[10px] text-white/60">{players[1].nilBid ? '🚫NIL' : `Bid: ${players[1].bid ?? '?'}`}</div>
                    <div className="text-[10px] text-white/60">{players[1].tricks}✓</div>
                  </div>
                </div>

                {/* ── EAST (RIGHT) ── */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-row-reverse items-center gap-1.5 z-10">
                  {/* East arch fan - fan opens LEFT toward table center */}
                  {(() => {
                    const n = Math.min(players[3].hand.length || 8, 13);
                    const step = Math.min(8, 72 / Math.max(n - 1, 1));
                    return (
                      <div style={{ position: 'relative', width: '64px', height: '200px' }}>
                        {Array.from({ length: n }).map((_, i) => {
                          const angle = (i - (n - 1) / 2) * step;
                          return (
                            <div key={i} style={{
                              position: 'absolute', right: 0, top: '50%',
                              transform: `translateY(-50%) rotate(${angle}deg)`,
                              transformOrigin: 'right center',
                              zIndex: i,
                            }}>
                              {renderCardBack(56, 38, 0, i)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="flex flex-col items-center px-2 py-2 rounded-xl bg-black/75 border border-[#1b5020]/50 backdrop-blur-sm">
                    <div className="relative mb-1">
                      <AvatarSprite avatar={SPADES_AVATARS[3]} size={50} active={currentPlayer === 3 && gamePhase === 'playing'} />
                      {currentPlayer === 3 && gamePhase === 'playing' && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />}
                    </div>
                    <div className="text-xs font-bold text-white">{players[3].name}</div>
                    <div className="text-[10px] text-white/60">{players[3].nilBid ? '🚫NIL' : `Bid: ${players[3].bid ?? '?'}`}</div>
                    <div className="text-[10px] text-white/60">{players[3].tricks}✓</div>
                  </div>
                </div>

                {/* ── TURN TIMER ── */}
                {turnTimeLeft !== null && gamePhase === 'playing' && currentPlayer === 0 && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2"
                      style={{
                        borderColor: turnTimeLeft <= 5 ? '#ef5350' : turnTimeLeft <= 10 ? '#FFA726' : '#D4AF37',
                        color: turnTimeLeft <= 5 ? '#ef5350' : turnTimeLeft <= 10 ? '#FFA726' : '#D4AF37',
                        background: 'rgba(0,0,0,0.85)',
                        animation: turnTimeLeft <= 5 ? 'trickGlow 0.5s ease-in-out infinite' : undefined,
                      }}
                    >{turnTimeLeft}</div>
                    <span className="text-[10px] text-gray-400">auto-play</span>
                  </div>
                )}

                {/* ── YOUR AVATAR (bottom center of table) ── */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-black/85 border border-[#D4AF37]/40 backdrop-blur-sm">
                  <div className="relative">
                    <AvatarSprite avatar={SPADES_AVATARS[0]} size={44} active={currentPlayer === 0 && gamePhase === 'playing'} />
                    {currentPlayer === 0 && gamePhase === 'playing' && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">You</div>
                    <div className="text-xs text-white/60">{players[0].nilBid ? '🚫NIL' : players[0].blindNilBid ? '🔮BNIL' : `Bid: ${players[0].bid ?? '?'}`} · {players[0].tricks}✓</div>
                  </div>
                </div>

                {/* ── CENTER TRICK AREA ── */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" style={{ width: '220px', height: '200px' }}>
                  {/* Dealer label */}
                  {gamePhase !== 'playing' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                      <div className="text-xs text-[#D4AF37]/40 uppercase tracking-widest">DEALER</div>
                      <div className="text-sm font-bold text-[#D4AF37]/60">Marcus</div>
                    </div>
                  )}

                  {/* Played trick cards */}
                  {currentTrick.map((play, i) => {
                    const pIdx = playerIdMap[play.player] ?? 0;
                    const tossRots = [-8, 12, -5, 10];
                    const rot = tossRots[pIdx] + (Math.random() * 6 - 3);
                    const positions: React.CSSProperties[] = [
                      { position: 'absolute', bottom: '10px', left: '50%', transform: `translateX(-50%) rotate(${rot}deg)` },
                      { position: 'absolute', right: '10px', top: '50%', transform: `translateY(-50%) rotate(${rot}deg)` },
                      { position: 'absolute', top: '10px', left: '50%', transform: `translateX(-50%) rotate(${rot}deg)` },
                      { position: 'absolute', left: '10px', top: '50%', transform: `translateY(-50%) rotate(${rot}deg)` },
                    ];
                    return (
                      <div key={`${i}-${play.card.suit}${play.card.rank}`}
                        style={{
                          ...positions[pIdx],
                          animation: `slideToCenter-${pIdx} 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards`,
                          '--tr': `${rot}deg`,
                          zIndex: i + 1,
                        } as React.CSSProperties}>
                        <div style={{ animation: trickWinner === play.player ? 'trickGlow 0.8s ease-in-out infinite' : undefined }}>
                          {renderCardFace(play.card, undefined, { size: 'md' })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Trick counter */}
                  {gamePhase === 'playing' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/70 px-2 py-1 rounded-lg border border-[#D4AF37]/20 backdrop-blur-sm pointer-events-none"
                      style={{ zIndex: 0 }}>
                      <div className="text-xs text-[#C0C0C0]">Trick {completedTricks.length + 1}/13</div>
                      {spadesBroken && <div className="text-xs text-[#D4AF37] font-bold">♠ Broken</div>}
                    </div>
                  )}
                </div>

                {/* ── TOSS CARD OVERLAY ── */}
                {tossCard && (
                  <div
                    key={`${tossCard.card.suit}${tossCard.card.rank}-${Math.round(tossCard.rotation * 1000)}`}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 50,
                      pointerEvents: 'none',
                      animation: 'tossCardIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
                      '--tr': `${tossCard.rotation}deg`,
                      filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))',
                    } as React.CSSProperties}
                  >
                    {renderCardFace(tossCard.card, undefined, { size: 'lg' })}
                  </div>
                )}

                {/* ── DEALING ANIMATION OVERLAY ── */}
                {gamePhase === 'dealing' && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
                    {/* Deck */}
                    <div style={{ position: 'relative', animation: isShuffling ? 'deckShuffle 1.5s ease-in-out' : undefined }}>
                      {[4, 3, 2, 1, 0].map(i => (
                        <div key={i} style={{ position: i === 0 ? 'relative' : 'absolute', top: i === 0 ? 0 : `${-i * 1.5}px`, left: i === 0 ? 0 : `${i * 0.5}px` }}>
                          {renderCardBack(72, 100, i === 0 ? 0 : (i % 2 === 0 ? 1 : -1))}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-[#D4AF37] text-sm font-bold animate-pulse">
                      {isShuffling ? 'Shuffling...' : `Dealing cards... (${dealStep}/13)`}
                    </div>
                  </div>
                )}

                {/* ── BIDDING OVERLAY (on the table center) ── */}
                {gamePhase === 'bidding' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 25 }}>
                    <div className="pointer-events-auto bg-black/85 backdrop-blur-md rounded-2xl px-5 py-4 border border-[#D4AF37]/30 shadow-2xl"
                      style={{ animation: 'bidPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                      <div className="text-center text-white font-bold text-base mb-3">Your Bid</div>
                      <div className="flex flex-wrap justify-center gap-2 mb-2" style={{ maxWidth: '280px' }}>
                        {houseRules.nilAllowed && (
                          <button onClick={() => placeBid(0, true, false)}
                            className="w-10 h-10 rounded-full font-black text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-110 shadow-lg flex items-center justify-center">
                            Nil
                          </button>
                        )}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => (
                          <button key={n} onClick={() => placeBid(n)}
                            className="w-10 h-10 rounded-full font-black text-sm transition-all hover:scale-110 shadow-md flex items-center justify-center"
                            style={{ background: n <= 6 ? 'white' : '#d0d0c0', color: '#111' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#D4AF37')}
                            onMouseLeave={e => (e.currentTarget.style.background = n <= 6 ? 'white' : '#d0d0c0')}>
                            {n}
                          </button>
                        ))}
                      </div>
                      {houseRules.blindNilAllowed && (
                        <div className="mt-2">
                          <button onClick={() => placeBid(0, false, true)}
                            className="w-full py-1.5 rounded-full font-bold text-xs border-2 border-purple-500 text-purple-300 bg-purple-900/30 hover:bg-purple-800/50 transition-all hover:scale-105">
                            🔮 Blind NIL (±200)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SPADES BROKEN BURST */}
                {showSpadesBroken && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="text-9xl" style={{ animation: 'spadesBurst 2s ease-out forwards', color: '#D4AF37', textShadow: '0 0 60px rgba(212,175,55,0.9)' }}>♠</div>
                  </div>
                )}

                {/* WIN FLASH */}
                {winFlash && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="text-5xl font-casino font-black text-[#43A047]" style={{ animation: 'spadesBurst 2s ease-out forwards', textShadow: '0 0 40px rgba(67,160,71,0.9)' }}>🎉 WIN!</div>
                  </div>
                )}
              </div>

              {/* WOOD RAIL */}
              <div className="h-4 wood-rail" />

              {/* MESSAGE BAR */}
              {message && (
                <div className="text-center py-2 px-3" style={{ background: 'rgba(0,0,0,0.8)' }}>
                  <span className="text-[#D4AF37] text-sm font-bold">{message}</span>
                  {lastTrick && (
                    <button onClick={() => setShowLastTrick(true)} className="ml-3 text-xs text-[#D4AF37]/50 hover:text-[#D4AF37]/80 transition-colors inline-flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Last trick
                    </button>
                  )}
                </div>
              )}

              {/* ── YOUR HAND ── shown during bidding AND playing */}
              {(gamePhase === 'bidding' || gamePhase === 'playing') && players[0].hand.length > 0 && (
                <div style={{ background: 'linear-gradient(180deg, rgba(8,8,14,0.95) 0%, rgba(5,5,10,1) 100%)', borderTop: '2px solid rgba(93,64,55,0.5)', padding: '10px 8px 12px', position: 'relative' }}>
                  {/* Reaction button */}
                  <div className="absolute right-2 top-2 flex gap-1">
                    {REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => addReaction(emoji)}
                        className="text-lg hover:scale-125 transition-transform" style={{ lineHeight: 1 }}>
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center items-end" style={{ minHeight: '120px', gap: '-8px' }}>
                    {players[0].hand.map((card, i) => {
                      const isLegal = legalIndices.includes(i);
                      const canPlay = gamePhase === 'playing' && currentPlayer === 0;
                      return (
                        <div key={`hand-${card.suit}-${card.rank}`}
                          style={{ marginLeft: i === 0 ? 0 : '-18px', position: 'relative', zIndex: hoveredCard === i ? 50 : i }}>
                          {renderCardFace(card, canPlay && isLegal ? () => playCard(i) : undefined, {
                            size: 'lg',
                            playable: !canPlay || isLegal,
                            highlight: canPlay && isLegal,
                            fanIdx: i,
                            fanTotal: players[0].hand.length,
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {gamePhase === 'bidding' && (
                    <div className="text-center text-xs text-gray-600 mt-2">Review your hand above, then place your bid ↑</div>
                  )}
                </div>
              )}

              {/* Round history strip */}
              {roundHistory.length > 0 && (
                <div className="flex gap-3 px-3 py-1 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  {roundHistory.map((h, i) => (
                    <div key={i} className="flex gap-1.5 text-xs shrink-0">
                      <span className="text-gray-600">R{h.round}</span>
                      <span className={h.your >= 0 ? 'text-[#43A047]' : 'text-[#ef5350]'}>{h.your > 0 ? '+' : ''}{h.your}</span>
                      <span className="text-gray-600">vs</span>
                      <span className={h.opp >= 0 ? 'text-[#ef5350]' : 'text-[#43A047]'}>{h.opp > 0 ? '+' : ''}{h.opp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ HAND RESULT MODAL ═══ */}
        <Dialog open={showHandResult} onOpenChange={() => {}}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/40" style={{ zIndex: 200 }}>
            <DialogHeader>
              <DialogTitle className="font-casino text-xl text-gradient-gold text-center">♠ Round {round - 1} Results</DialogTitle>
            </DialogHeader>
            {handResult && (
              <div className="space-y-4 py-2">
                {/* Your team */}
                <div className="rounded-xl p-3 border" style={{ background: 'rgba(67,160,71,0.08)', borderColor: 'rgba(67,160,71,0.35)' }}>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Your Team (You + Partner)</div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">Bid</span>
                    <span className="text-sm font-bold text-white">{handResult.yourBid}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">Tricks Won</span>
                    <span className={`text-sm font-bold ${handResult.yourTricks >= handResult.yourBid ? 'text-[#43A047]' : 'text-[#ef5350]'}`}>{handResult.yourTricks}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
                    <span className="text-sm font-bold text-white">Points Earned</span>
                    <span className={`text-xl font-black ${handResult.yourScore >= 0 ? 'text-[#43A047]' : 'text-[#ef5350]'}`}>{handResult.yourScore > 0 ? '+' : ''}{handResult.yourScore}</span>
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">Running Total: <span className="text-white font-bold">{handResult.newTotalYou}</span></div>
                </div>
                {/* Opponent team */}
                <div className="rounded-xl p-3 border" style={{ background: 'rgba(183,28,28,0.08)', borderColor: 'rgba(183,28,28,0.35)' }}>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Opponent Team (West + East)</div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">Bid</span>
                    <span className="text-sm font-bold text-white">{handResult.oppBid}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">Tricks Won</span>
                    <span className={`text-sm font-bold ${handResult.oppTricks >= handResult.oppBid ? 'text-[#43A047]' : 'text-[#ef5350]'}`}>{handResult.oppTricks}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
                    <span className="text-sm font-bold text-white">Points Earned</span>
                    <span className={`text-xl font-black ${handResult.oppScore >= 0 ? 'text-[#ef5350]' : 'text-[#43A047]'}`}>{handResult.oppScore > 0 ? '+' : ''}{handResult.oppScore}</span>
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">Running Total: <span className="text-white font-bold">{handResult.newTotalOpp}</span></div>
                </div>
                {/* Progress to goal */}
                <div className="text-center text-xs text-gray-500">Goal: {houseRules.targetScore} pts</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#43A047] w-8">You</span>
                    <div className="flex-1 h-2 rounded-full bg-black/50 overflow-hidden border border-[#43A047]/30">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (handResult.newTotalYou / houseRules.targetScore) * 100)}%`, background: '#43A047' }} />
                    </div>
                    <span className="text-xs text-white w-8 text-right">{handResult.newTotalYou}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ef5350] w-8">Opp</span>
                    <div className="flex-1 h-2 rounded-full bg-black/50 overflow-hidden border border-[#B71C1C]/30">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (handResult.newTotalOpp / houseRules.targetScore) * 100)}%`, background: '#B71C1C' }} />
                    </div>
                    <span className="text-xs text-white w-8 text-right">{handResult.newTotalOpp}</span>
                  </div>
                </div>
                <Button onClick={() => handResult.continueFn()} className="w-full btn-primary text-base font-bold py-3">
                  {handResult.newTotalYou >= houseRules.targetScore || handResult.newTotalOpp >= houseRules.targetScore ? '🎯 See Results' : '▶ Next Round'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══ PROP PICKER DIALOG ═══ */}
        <Dialog open={showPropPicker} onOpenChange={setShowPropPicker}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader><DialogTitle className="font-casino text-xl text-gradient-gold">🎭 Table Props</DialogTitle></DialogHeader>
            <div className="py-2">
              <div className="text-xs text-gray-500 mb-3">Choose a prop to display on the table</div>
              <div className="grid grid-cols-3 gap-3">
                {TABLE_PROPS.map(prop => (
                  <button key={prop.id} onClick={() => { setSelectedProp(prop.id); setShowPropPicker(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                    style={{
                      background: selectedProp === prop.id ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                      borderColor: selectedProp === prop.id ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                    }}>
                    <div style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.6))' }}>{prop.el}</div>
                    <span className="text-[10px] font-bold" style={{ color: selectedProp === prop.id ? '#D4AF37' : '#888' }}>{prop.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══ CARD BACK PICKER DIALOG ═══ */}
        <Dialog open={showCardBackPicker} onOpenChange={setShowCardBackPicker}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader><DialogTitle className="font-casino text-xl text-gradient-gold">🃏 Card Back Style</DialogTitle></DialogHeader>
            <div className="py-2 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {CARD_BACK_PRESETS.map(preset => {
                  const isActive = localCardBack?.type === 'css' && JSON.stringify((localCardBack as { type: 'css'; style: React.CSSProperties }).style) === JSON.stringify(preset.style);
                  return (
                    <button key={preset.id} onClick={() => { setLocalCardBack({ type: 'css', style: preset.style }); setShowCardBackPicker(false); }}
                      className="flex flex-col items-center gap-2 transition-all">
                      <div style={{
                        width: '56px', height: '80px', borderRadius: '8px',
                        ...preset.style,
                        border: `2px solid ${isActive ? '#D4AF37' : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: isActive ? '0 0 12px rgba(212,175,55,0.5)' : '0 4px 10px rgba(0,0,0,0.4)',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', inset: '5px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.4)', background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,175,55,0.1) 4px, rgba(212,175,55,0.1) 8px)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)', borderRadius: '8px' }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: isActive ? '#D4AF37' : '#888' }}>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Upload custom */}
              <div className="border-t border-white/10 pt-3">
                <div className="text-xs text-gray-500 mb-2">Upload Custom Design</div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 cursor-pointer hover:border-[#D4AF37]/50 transition-all">
                  <span className="text-sm">📁</span>
                  <span className="text-xs text-gray-400">Choose image file…</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const img = ev.target?.result as string;
                      setLocalCardBack({ type: 'image', image: img });
                      setShowCardBackPicker(false);
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
              </div>
              {localCardBack && (
                <button onClick={() => { setLocalCardBack(null); setShowCardBackPicker(false); }}
                  className="w-full py-2 rounded-lg text-xs font-bold text-gray-500 border border-white/10 hover:border-white/25 hover:text-gray-300 transition-all">
                  Reset to Default
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══ HOUSE RULES DIALOG ═══ */}
        <Dialog open={showHouseRules} onOpenChange={setShowHouseRules}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader><DialogTitle className="font-casino text-xl text-gradient-gold">⚙️ House Rules</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <div className="text-sm text-[#C0C0C0] mb-2">Target Score</div>
                <div className="flex gap-2">
                  {[300, 500, 750].map(s => (
                    <button key={s} onClick={() => setPendingRules(r => ({ ...r, targetScore: s }))}
                      className="flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all"
                      style={{ background: pendingRules.targetScore === s ? 'rgba(212,175,55,0.2)' : 'transparent', borderColor: pendingRules.targetScore === s ? '#D4AF37' : 'rgba(255,255,255,0.1)', color: pendingRules.targetScore === s ? '#D4AF37' : '#666' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { key: 'sandbagPenalty', label: '🎒 Sandbag Penalty (10 bags = -100)' },
                { key: 'nilAllowed', label: '🚫 NIL Bidding' },
                { key: 'blindNilAllowed', label: '🔮 Blind NIL Bidding' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-gray-300">{label}</span>
                  <button onClick={() => setPendingRules(r => ({ ...r, [key]: !(r as any)[key] }))}
                    className="w-10 h-5 rounded-full relative transition-all"
                    style={{ background: (pendingRules as any)[key] ? '#D4AF37' : '#333' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: (pendingRules as any)[key] ? '22px' : '2px' }} />
                  </button>
                </div>
              ))}
              <div>
                <div className="text-sm text-[#C0C0C0] mb-2">AI Difficulty</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['easy', 'medium', 'hard', 'elite'] as AIDifficulty[]).map(d => (
                    <button key={d} onClick={() => setAIDifficulty(d)}
                      className="py-2 rounded-lg text-sm font-bold border-2 transition-all capitalize"
                      style={{ background: aiDifficulty === d ? 'rgba(212,175,55,0.2)' : 'transparent', borderColor: aiDifficulty === d ? '#D4AF37' : 'rgba(255,255,255,0.1)', color: aiDifficulty === d ? '#D4AF37' : '#666' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => { setHouseRules({ ...pendingRules }); setShowHouseRules(false); }} className="w-full btn-primary">Apply</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══ LAST TRICK DIALOG ═══ */}
        <Dialog open={showLastTrick} onOpenChange={setShowLastTrick}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader><DialogTitle className="font-casino text-xl text-gradient-gold">↩ Last Trick</DialogTitle></DialogHeader>
            {lastTrick && (
              <div className="py-4">
                <div className="relative mx-auto" style={{ width: '200px', height: '200px' }}>
                  {lastTrick.cards.map((play, i) => {
                    const pIdx = playerIdMap[play.player] ?? 0;
                    const ps: React.CSSProperties[] = [
                      { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%) rotate(-5deg)' },
                      { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(8deg)' },
                      { position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%) rotate(3deg)' },
                      { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%) rotate(-6deg)' },
                    ];
                    return (
                      <div key={i} style={{ ...ps[pIdx], filter: lastTrick.winner === play.player ? 'drop-shadow(0 0 14px rgba(212,175,55,0.9))' : undefined }}>
                        {renderCardFace(play.card, undefined, { size: 'md' })}
                      </div>
                    );
                  })}
                </div>
                <div className="text-center mt-4 text-sm">
                  <span className="text-gray-400">Winner: </span>
                  <span className="text-[#D4AF37] font-bold">{posNames[lastTrick.winner] || lastTrick.winner}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══ TOURNAMENT DIALOG ═══ */}
        <Dialog open={showTournament} onOpenChange={setShowTournament}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader><DialogTitle className="font-casino text-xl text-gradient-gold">🏆 Tournament</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{ t1: 'You & Partner', t2: 'Team Alpha' }, { t1: 'Team Beta', t2: 'Team Gamma' }].map((m, i) => (
                  <div key={i} className="rounded-xl p-3 border border-[#D4AF37]/20" style={{ background: 'rgba(212,175,55,0.05)' }}>
                    <div className="text-sm font-bold text-gray-300 py-1">{m.t1}</div>
                    <div className="text-xs text-center text-[#D4AF37]/40 font-bold">VS</div>
                    <div className="text-sm font-bold text-gray-400 py-1">{m.t2}</div>
                  </div>
                ))}
              </div>
              <div className="text-center text-xs text-gray-600">— Final —</div>
              <div className="rounded-xl p-4 border border-[#D4AF37]/30 text-center" style={{ background: 'rgba(212,175,55,0.07)' }}>
                <div className="text-sm text-gray-500">Winner vs Winner</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══ RULES DIALOG ═══ */}
        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-w-lg glass-panel-strong max-h-[80vh] overflow-y-auto border-[#D4AF37]/20">
            <DialogHeader><DialogTitle className="font-casino text-2xl text-gradient-gold">♠ Spades Rules</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              {[
                { t: 'Objective', items: ['First team to reach target score (default 500 pts) wins.', 'Win by accurately bidding and winning tricks each round.'] },
                { t: 'Bidding', items: ['After cards are dealt, each player bids tricks they expect to win.', 'NIL bid: win 0 tricks → +100; fail → -100.', 'Blind NIL: bid before seeing cards → ±200 pts.'] },
                { t: 'Scoring', items: ['+10 pts per bid trick won', '+1 pt per overtrick (bag) — 10 bags = -100 penalty', 'Failed bid: -10 pts per trick under'] },
                { t: 'Gameplay', items: ['Must follow suit if possible.', 'Cannot lead spades until broken (a spade is played on another suit).', 'Spades always trump. Highest card wins the trick.'] },
              ].map(({ t, items }) => (
                <div key={t}>
                  <h3 className="font-bold text-[#D4AF37] mb-1">{t}</h3>
                  <ul className="space-y-0.5 text-gray-300">{items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-[#D4AF37]">•</span>{it}</li>)}</ul>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CasinoEnvironment>
  );
}
