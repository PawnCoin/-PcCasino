import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Settings, Trophy, RotateCcw, ChevronRight, Star, Shield, Crown, Flame, Zap, Volume2, VolumeX } from 'lucide-react';
import { useTableSkin } from '@/hooks/useTableSkin';
import { PremiumFeltOverlay } from '@/components/PremiumFeltOverlay';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createDeck, shuffleDeck } from '@/hooks/useGameEngine';
import { PokerChip, ChipStack, ChipSelector, formatChipLabel, ALL_CHIP_DENOMS } from '@/components/PokerChip';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';
import { chooseAICard, calculateAIBid } from '@/hooks/useSpadesAI';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { AvatarSprite, SPADES_AVATARS } from '@/components/AvatarSprite';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import type { AIDifficulty } from '@/hooks/useSpadesAI';
import type { Card } from '@/types';

interface SpadesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
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

const CHIP_VALUES = ALL_CHIP_DENOMS;


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
const SPADES_RANK: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
const QUICK_TEXTS = ['Nice play! 👌', 'Good job! 👍', 'Thanks partner! 🤝', 'Nice! 🎉', 'Well played! 🔥', 'Ouch! 😬', 'Lucky! 🍀'];
const PLAYER_COLORS = [
  'from-[#D4AF37] to-[#8B6914]',
  'from-[#B71C1C] to-[#7B1111]',
  'from-[#1565C0] to-[#0D3E87]',
  'from-[#2E7D32] to-[#1B5020]',
];
const PLAYER_AVATARS = ['🎭', '⚔️', '🤝', '🛡️'];
const PLAYER_TEXT_COLORS = ['text-[#D4AF37]', 'text-[#ef5350]', 'text-[#64b5f6]', 'text-[#81c784]'];

export function SpadesGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet, cardBackStyle }: SpadesGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { playSound, isMuted, toggleMute } = useSoundEffects();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, addAIReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);

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
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [roundHistory, setRoundHistory] = useState<{ your: number; opp: number; round: number }[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [dealStep, setDealStep] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [tossCard, setTossCard] = useState<{ card: Card; rotation: number; fromPlayer?: boolean; playerIdx?: number } | null>(null);
  const [firstPlayer, setFirstPlayer] = useState(0);
  const [pendingBid, setPendingBid] = useState<{ amount: number; isNil: boolean; isBlindNil: boolean } | null>(null);
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
  const [localCardBack, setLocalCardBack] = useState<null | { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string }>(null);
  const [showCardBackPicker, setShowCardBackPicker] = useState(false);
  const [bookStacks, setBookStacks] = useState<number[]>([0, 0, 0, 0]);
  const [animatingBook, setAnimatingBook] = useState<string | null>(null);
  const [smackMode, setSmackMode] = useState(false);
  const [smackActive, setSmackActive] = useState(false);
  const [trickAnnouncement, setTrickAnnouncement] = useState<{ winner: string; leadsNext: boolean } | null>(null);

  // Disarm smack if the player's turn ends before they play a card
  useEffect(() => {
    if (currentPlayer !== 0 || gamePhase !== 'playing') {
      setSmackMode(false);
    }
  }, [currentPlayer, gamePhase]);

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
      setBookStacks([0, 0, 0, 0]);

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
    if (firstPlayer === 0) {
      setCurrentPlayer(0);
      setMessage('Your lead — play a card!');
      showTip('Spades cannot be led until broken.');
    } else {
      setCurrentPlayer(firstPlayer);
      setMessage(`${PLAYER_NAMES[firstPlayer]} leads the first trick!`);
      showTip('Spades cannot be led until broken.');
      setTimeout(() => startNewTrick(firstPlayer, newPlayers, false), 700);
    }
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
    setTossCard({ card, rotation, fromPlayer: true, playerIdx: 0 });
    if (smackMode) {
      playSound('smack');
      setSmackMode(false);
      setSmackActive(true);
      setTimeout(() => setSmackActive(false), 700);
    } else {
      playSound('card');
    }
    setTimeout(() => setTossCard(null), 850);

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
      setTossCard({ card: chosen, rotation: aiRotation, playerIdx: pIdx });
      setTimeout(() => setTossCard(null), 500);

      updated[pIdx] = { ...updated[pIdx], hand: updated[pIdx].hand.filter(c => !(c.suit === chosen.suit && c.rank === chosen.rank)) };
      trickCards = [...trickCards, { player: player.id, card: chosen }];
      setCurrentTrick([...trickCards]);
      if (Math.random() > 0.7) setTimeout(() => addAIReaction(player.id), 200);
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
      setTossCard({ card: chosen, rotation: rot, playerIdx: pIdx });
      setTimeout(() => setTossCard(null), 500);
      updated[pIdx] = { ...updated[pIdx], hand: updated[pIdx].hand.filter(c => !(c.suit === chosen.suit && c.rank === chosen.rank)) };
      trickCards = [...trickCards, { player: player.id, card: chosen }];
      setCurrentTrick([...trickCards]);
      if (Math.random() > 0.7) setTimeout(() => addAIReaction(player.id), 200);
      nextPIdx = (nextPIdx + 3) % 4;
      aiTimer.current = setTimeout(playNext, Math.round(580 / gameSpeed));
    };

    setIsAIThinking(true);
    aiTimer.current = setTimeout(playNext, Math.round(900 / gameSpeed));
  };

  const resolveTrick = (cards: TrickCard[], curPlayers: SpadesPlayer[]) => {
    const lead = cards[0].card.suit;
    let winCard = cards[0].card, winner = cards[0].player;
    const rank = (c: Card) => SPADES_RANK[c.rank] ?? c.value;
    for (let i = 1; i < cards.length; i++) {
      const { card, player } = cards[i];
      if (card.suit === 'spades') {
        if (winCard.suit !== 'spades' || rank(card) > rank(winCard)) { winCard = card; winner = player; }
      } else if (card.suit === lead && winCard.suit !== 'spades') {
        if (rank(card) > rank(winCard)) { winCard = card; winner = player; }
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
    const playerIdOrder = ['you', 'p2', 'p3', 'p4'];
    const wname = PLAYER_NAMES[playerIdOrder.indexOf(winner)] ?? 'Unknown';

    const winnerBookIdx = playerIdOrder.indexOf(winner);
    if (winnerBookIdx >= 0) {
      setBookStacks(prev => { const n = [...prev]; n[winnerBookIdx]++; return n; });
    }
    setAnimatingBook(winner);
    setTimeout(() => setAnimatingBook(null), 1100);
    playSound('shuffle');
    setTrickAnnouncement({ winner: wname, leadsNext: false });
    setTimeout(() => setTrickAnnouncement({ winner: wname, leadsNext: true }), Math.round(800 / gameSpeed));
    setTimeout(() => setTrickAnnouncement(null), Math.round(2200 / gameSpeed));
    setTimeout(() => setTrickWinner(null), Math.round(1300 / gameSpeed));
    const winnerIdx = newPlayers.findIndex(p => p.id === winner);
    setCurrentPlayer(winnerIdx);
    if (newCompleted.length >= 13) {
      setMessage(`${wname} won the last trick!`);
      setTimeout(() => scoreRound(newPlayers), Math.round(2400 / gameSpeed));
    } else if (winnerIdx === 0) {
      setTimeout(() => {
        setIsAIThinking(false);
        setMessage('You won the trick! Your lead — play a card!');
      }, Math.round(2200 / gameSpeed));
    } else {
      setMessage(`${wname} won the trick!`);
      setTimeout(() => startNewTrick(winnerIdx, newPlayers, spadesBroken), Math.round(2400 / gameSpeed));
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

    const nextFirst = (firstPlayer + 3) % 4;
    const doNextRound = () => {
      setShowHandResult(false);
      setHandResult(null);
      setFirstPlayer(nextFirst);
      if (ny >= houseRules.targetScore || no >= houseRules.targetScore) {
        const won = ny > no;
        if (won) {
          onWin(currentBet * 2);
          triggerWinBurst();
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
          setBookStacks([0, 0, 0, 0]);
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
          @keyframes cardSmackIn {
            0%   { transform: translate(-50%, -50%) scale(1.5) rotate(calc(var(--tr) * 1.8)); opacity: 0; filter: drop-shadow(0 30px 40px rgba(0,0,0,0.9)); }
            35%  { transform: translate(-50%, -50%) scale(0.92) rotate(var(--tr)); opacity: 1; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.7)); }
            55%  { transform: translate(-50%, -50%) scale(1.04) rotate(var(--tr)); opacity: 1; }
            72%  { transform: translate(-50%, -50%) scale(1.0) rotate(var(--tr)); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1.0) rotate(var(--tr)); opacity: 1; }
          }
          @keyframes cardSlideIn-0 {
            0%   { transform: translate(-50%,120px) rotate(calc(var(--tr) + 15deg)) scale(0.65); opacity: 0; }
            42%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.05); opacity: 1; }
            70%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
            100% { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
          }
          @keyframes cardSlideIn-1 {
            0%   { transform: translate(-50%,-50%) translateX(-120px) rotate(calc(var(--tr) - 18deg)) scale(0.65); opacity: 0; }
            42%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.05); opacity: 1; }
            70%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
            100% { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
          }
          @keyframes cardSlideIn-2 {
            0%   { transform: translate(-50%,-50%) translateY(-110px) rotate(calc(var(--tr) + 12deg)) scale(0.65); opacity: 0; }
            42%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.05); opacity: 1; }
            70%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
            100% { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
          }
          @keyframes cardSlideIn-3 {
            0%   { transform: translate(-50%,-50%) translateX(120px) rotate(calc(var(--tr) - 14deg)) scale(0.65); opacity: 0; }
            42%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.05); opacity: 1; }
            70%  { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
            100% { transform: translate(-50%,-50%) rotate(var(--tr)) scale(1.0); opacity: 1; }
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
            0%,100% { filter: brightness(1); }
            35%      { filter: brightness(1.15) saturate(1.3); }
          }
          @keyframes loseShake {
            0%,100% { transform: translateX(0); }
            20%,60% { transform: translateX(-6px); }
            40%,80% { transform: translateX(6px); }
          }
          @keyframes thoughtBubblePop {
            0%   { transform: scale(0.4) translateY(12px); opacity: 0; }
            60%  { transform: scale(1.08) translateY(-2px); opacity: 1; }
            80%  { transform: scale(0.97) translateY(0); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes thoughtBubbleFade {
            0%,75% { opacity: 1; }
            100%   { opacity: 0; }
          }
          @keyframes propBounce {
            0%   { transform: translateY(0) rotate(0deg) scale(1); }
            20%  { transform: translateY(-14px) rotate(-6deg) scale(1.15); }
            45%  { transform: translateY(4px) rotate(5deg) scale(0.95); }
            65%  { transform: translateY(-7px) rotate(-3deg) scale(1.08); }
            82%  { transform: translateY(2px) rotate(2deg) scale(0.98); }
            100% { transform: translateY(0) rotate(0deg) scale(1); }
          }
          @keyframes propSparkle {
            0%   { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.75)); }
            30%  { filter: drop-shadow(0 0 18px rgba(212,175,55,0.9)) drop-shadow(0 0 8px rgba(255,255,255,0.7)); }
            60%  { filter: drop-shadow(0 0 12px rgba(212,175,55,0.6)); }
            100% { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.75)); }
          }
          @keyframes smackRipple {
            0%   { transform: translate(-50%,-50%) scale(0.1); opacity: 0.9; border-width: 4px; }
            60%  { transform: translate(-50%,-50%) scale(1.8); opacity: 0.5; border-width: 2px; }
            100% { transform: translate(-50%,-50%) scale(3); opacity: 0; border-width: 1px; }
          }
          @keyframes smackText {
            0%   { transform: translate(-50%, -50%) scale(0.5) rotate(-8deg); opacity: 0; }
            25%  { transform: translate(-50%, -60%) scale(1.2) rotate(4deg); opacity: 1; }
            60%  { transform: translate(-50%, -70%) scale(1.0) rotate(-2deg); opacity: 1; }
            100% { transform: translate(-50%, -90%) scale(0.85) rotate(0deg); opacity: 0; }
          }
          @keyframes smackArmPulse {
            0%,100% { box-shadow: 0 0 6px rgba(212,175,55,0.4); }
            50%     { box-shadow: 0 0 16px rgba(212,175,55,0.9), 0 0 32px rgba(212,175,55,0.4); }
          }
          @keyframes bookSlide-0 {
            0%   { transform: translate(-50%,-50%) translate(0px, 90px) scale(0.5) rotate(-15deg); opacity: 0; }
            50%  { opacity: 1; }
            100% { transform: translate(-50%,-50%) translate(0px, calc(50vh * 0.32)) scale(1) rotate(-5deg); opacity: 1; }
          }
          @keyframes bookSlide-1 {
            0%   { transform: translate(-50%,-50%) translate(-80px, 0) scale(0.5) rotate(12deg); opacity: 0; }
            50%  { opacity: 1; }
            100% { transform: translate(-50%,-50%) translate(calc(-50vw * 0.38), 0) scale(1) rotate(8deg); opacity: 1; }
          }
          @keyframes bookSlide-2 {
            0%   { transform: translate(-50%,-50%) translate(0, -80px) scale(0.5) rotate(10deg); opacity: 0; }
            50%  { opacity: 1; }
            100% { transform: translate(-50%,-50%) translate(0, calc(-50vh * 0.32)) scale(1) rotate(5deg); opacity: 1; }
          }
          @keyframes bookSlide-3 {
            0%   { transform: translate(-50%,-50%) translate(80px, 0) scale(0.5) rotate(-12deg); opacity: 0; }
            50%  { opacity: 1; }
            100% { transform: translate(-50%,-50%) translate(calc(50vw * 0.38), 0) scale(1) rotate(-8deg); opacity: 1; }
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
          onShowWallet={onShowWallet}
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

        {/* THOUGHT BUBBLES - rendered inside table area, see below */}

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
                {/* Speed control strip + Sound toggle */}
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
                  <button
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                    className="ml-2 p-1 rounded-full transition-all"
                    style={{
                      background: isMuted ? 'rgba(239,83,80,0.2)' : 'rgba(212,175,55,0.15)',
                      border: `1px solid ${isMuted ? 'rgba(239,83,80,0.4)' : 'rgba(212,175,55,0.3)'}`,
                      color: isMuted ? '#ef5350' : '#D4AF37',
                    }}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* TABLE */}
              <div
                className="flex-1 relative"
                style={{
                  background: '#050308',
                  animation: winFlash ? 'winPulse 2s ease-out' : loseFlash ? 'loseShake 0.5s ease-out' : undefined,
                  minHeight: '300px',
                  overflow: 'hidden',
                }}
              >
                {/* ══ ROUNDED SQUARE TABLE LAYERS ══ */}
                {/* Leather outer ring */}
                <div className="absolute pointer-events-none" style={{
                  top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: '82%', height: '88%', minHeight: 240, minWidth: 240, maxWidth: 520, maxHeight: 420,
                  borderRadius: '28px',
                  background: 'radial-gradient(ellipse at 38% 30%, #4a2208 0%, #2a1205 45%, #1a0902 100%)',
                  boxShadow: '0 8px 60px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.6), inset 0 2px 6px rgba(255,255,255,0.05)',
                  zIndex: 0,
                }} />
                {/* Wood-grain rail */}
                <div className="absolute pointer-events-none" style={{
                  top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 'calc(82% - 16px)', height: 'calc(88% - 12px)', minHeight: 228, minWidth: 228, maxWidth: 504, maxHeight: 408,
                  borderRadius: '22px',
                  background: 'conic-gradient(from 0deg, #8B5E3C 0%, #6B4226 8%, #9a6a44 16%, #5a3418 24%, #8B5E3C 32%, #7a5230 40%, #9a6742 48%, #6B4226 56%, #8B5E3C 64%, #5a3418 72%, #9a6a44 80%, #7a5230 88%, #8B5E3C 100%)',
                  boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(255,255,255,0.06)',
                  zIndex: 1,
                }} />
                {/* Felt surface */}
                <div className="absolute pointer-events-none" style={{
                  top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 'calc(82% - 48px)', height: 'calc(88% - 38px)', minHeight: 202, minWidth: 192, maxWidth: 472, maxHeight: 382,
                  borderRadius: '16px',
                  background: tableSkin.felt,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)',
                  zIndex: 2,
                  overflow: 'hidden',
                }}>
                  <PremiumFeltOverlay borderRadius="16px" goldBorderInset={12} />
                </div>

                {/* $Pc logo engraving in table center — realistic felt engraving */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-[3]" style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: "'Cinzel',serif", fontSize: 52, lineHeight: 1,
                    color: 'transparent',
                    WebkitTextStroke: '1px rgba(0,0,0,0.25)',
                    textShadow: '1px 1px 0px rgba(255,255,255,0.07), -1px -1px 0px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4)',
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
                    opacity: 0.55,
                  }}>♠</div>
                  <div style={{
                    fontFamily: "'Cinzel',serif", fontSize: 11, letterSpacing: '0.45em',
                    color: 'transparent',
                    WebkitTextStroke: '0.5px rgba(0,0,0,0.3)',
                    textShadow: '0.5px 0.5px 0px rgba(255,255,255,0.06), -0.5px -0.5px 0px rgba(0,0,0,0.4)',
                    opacity: 0.45,
                    marginTop: 4,
                  }}>$Pc CASINO</div>
                  <div style={{
                    fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: '0.3em',
                    color: 'transparent',
                    WebkitTextStroke: '0.5px rgba(0,0,0,0.25)',
                    textShadow: '0.5px 0.5px 0px rgba(255,255,255,0.05), -0.5px -0.5px 0px rgba(0,0,0,0.35)',
                    opacity: 0.35,
                    marginTop: 2,
                  }}>EST. MMI</div>
                </div>

                {/* $Pc watermark */}
                <TableBrand style={{ opacity: 0.09 }} />

                {/* ── BOOK STACKS ON TABLE ── */}
                {gamePhase === 'playing' && (
                  <>
                    {/* You (bottom) book stack */}
                    {bookStacks[0] > 0 && (
                      <div className="absolute z-[5]" style={{ bottom: '18%', left: '50%', transform: 'translateX(-50%)' }}>
                        <div className="flex items-center gap-1">
                          <div style={{ position: 'relative', width: 24, height: 16 }}>
                            {[0,1,2].map(layer => (
                              <div key={layer} style={{ position: 'absolute', width: 16, height: 20, borderRadius: 2, background: animatingBook === 'you' ? '#FFD700' : '#43A047', border: '1px solid rgba(255,255,255,0.3)', left: layer * 3, top: layer * -2, boxShadow: '0 1px 4px rgba(0,0,0,0.5)', transition: 'background 0.3s' }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 900, color: animatingBook === 'you' ? '#FFD700' : '#43A047', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>×{bookStacks[0]}</span>
                        </div>
                      </div>
                    )}
                    {/* West (left) book stack */}
                    {bookStacks[1] > 0 && (
                      <div className="absolute z-[5]" style={{ left: '18%', top: '50%', transform: 'translateY(-50%)' }}>
                        <div className="flex items-center gap-1">
                          <div style={{ position: 'relative', width: 24, height: 16 }}>
                            {[0,1,2].map(layer => (
                              <div key={layer} style={{ position: 'absolute', width: 16, height: 20, borderRadius: 2, background: animatingBook === 'p2' ? '#D4AF37' : '#ef5350', border: '1px solid rgba(255,255,255,0.3)', left: layer * 3, top: layer * -2, boxShadow: '0 1px 4px rgba(0,0,0,0.5)', transition: 'background 0.3s' }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 900, color: animatingBook === 'p2' ? '#D4AF37' : '#ef5350', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>×{bookStacks[1]}</span>
                        </div>
                      </div>
                    )}
                    {/* Partner (top) book stack */}
                    {bookStacks[2] > 0 && (
                      <div className="absolute z-[5]" style={{ top: '18%', left: '50%', transform: 'translateX(-50%)' }}>
                        <div className="flex items-center gap-1">
                          <div style={{ position: 'relative', width: 24, height: 16 }}>
                            {[0,1,2].map(layer => (
                              <div key={layer} style={{ position: 'absolute', width: 16, height: 20, borderRadius: 2, background: animatingBook === 'p3' ? '#D4AF37' : '#4CAF50', border: '1px solid rgba(255,255,255,0.3)', left: layer * 3, top: layer * -2, boxShadow: '0 1px 4px rgba(0,0,0,0.5)', transition: 'background 0.3s' }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 900, color: animatingBook === 'p3' ? '#D4AF37' : '#4CAF50', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>×{bookStacks[2]}</span>
                        </div>
                      </div>
                    )}
                    {/* East (right) book stack */}
                    {bookStacks[3] > 0 && (
                      <div className="absolute z-[5]" style={{ right: '18%', top: '50%', transform: 'translateY(-50%)' }}>
                        <div className="flex items-center gap-1">
                          <div style={{ position: 'relative', width: 24, height: 16 }}>
                            {[0,1,2].map(layer => (
                              <div key={layer} style={{ position: 'absolute', width: 16, height: 20, borderRadius: 2, background: animatingBook === 'p4' ? '#D4AF37' : '#ef5350', border: '1px solid rgba(255,255,255,0.3)', left: layer * 3, top: layer * -2, boxShadow: '0 1px 4px rgba(0,0,0,0.5)', transition: 'background 0.3s' }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 900, color: animatingBook === 'p4' ? '#D4AF37' : '#ef5350', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>×{bookStacks[3]}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── TRICK WINNER ANNOUNCEMENT ── */}
                {trickAnnouncement && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-40 pointer-events-none" style={{ transform: 'translate(-50%, -120%)' }}>
                    <div style={{
                      background: 'rgba(0,0,0,0.9)',
                      border: '2px solid #D4AF37',
                      borderRadius: 14,
                      padding: '10px 24px',
                      textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(212,175,55,0.3)',
                      animation: 'thoughtBubblePop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.03em' }}>
                        {trickAnnouncement.winner === 'You' ? '🏆 You won the trick!' : `🏆 ${trickAnnouncement.winner} won the trick!`}
                      </div>
                      {trickAnnouncement.leadsNext && (
                        <div style={{ fontSize: 12, color: '#C0C0C0', marginTop: 4, fontWeight: 600 }}>
                          {trickAnnouncement.winner === 'You' ? 'Your lead next' : `${trickAnnouncement.winner} leads next`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

                {/* ── TOSS CARD OVERLAY (slide-and-turn from player direction) ── */}
                {tossCard && (() => {
                  const pi = tossCard.playerIdx ?? 0;
                  const dur = tossCard.fromPlayer ? '0.85s' : '0.55s';
                  return (
                    <div
                      key={`${tossCard.card.suit}${tossCard.card.rank}-${Math.round(tossCard.rotation * 1000)}`}
                      style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        zIndex: 50,
                        pointerEvents: 'none',
                        animation: `cardSlideIn-${pi} ${dur} cubic-bezier(0.22,1,0.36,1) forwards`,
                        '--tr': `${tossCard.rotation}deg`,
                      } as React.CSSProperties}
                    >
                      {renderCardFace(tossCard.card, undefined, { size: 'lg' })}
                    </div>
                  );
                })()}

                {/* ── TRICK-WIN BOOK BUNDLE (flies from center to winner corner) ── */}
                {animatingBook !== null && (() => {
                  const bookIdx = ['you','p2','p3','p4'].indexOf(animatingBook);
                  const isYourTeam = animatingBook === 'you' || animatingBook === 'p3';
                  if (bookIdx < 0) return null;
                  return (
                    <div className="absolute pointer-events-none" style={{
                      top: '50%', left: '50%', zIndex: 42,
                      animation: `bookSlide-${bookIdx} 0.9s cubic-bezier(0.22,0.61,0.36,1) forwards`,
                    }}>
                      {[0,1,2,3].map(layer => (
                        <div key={layer} style={{
                          position: 'absolute',
                          width: 22, height: 30, borderRadius: 3,
                          background: isYourTeam ? 'rgba(67,160,71,0.88)' : 'rgba(239,83,80,0.88)',
                          border: '1.5px solid rgba(255,255,255,0.35)',
                          transform: `translate(-50%,-50%) rotate(${(layer - 1.5) * 7}deg)`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.55)',
                        }} />
                      ))}
                    </div>
                  );
                })()}

                {/* ── CARD SMACK VISUAL (when user smacks a card) ── */}
                {smackActive && (
                  <div className="absolute pointer-events-none" style={{ top: '50%', left: '50%', zIndex: 55 }}>
                    <div style={{
                      position: 'absolute', width: 90, height: 90, borderRadius: '50%',
                      border: '4px solid rgba(212,175,55,0.9)',
                      animation: 'smackRipple 0.55s ease-out forwards',
                    }} />
                    <div style={{
                      position: 'absolute', width: 140, height: 140, borderRadius: '50%',
                      border: '2px solid rgba(212,175,55,0.45)',
                      animation: 'smackRipple 0.55s 0.06s ease-out forwards',
                    }} />
                    <div style={{
                      position: 'absolute',
                      transform: 'translate(-50%, -50%)',
                      fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 22,
                      color: '#D4AF37', letterSpacing: '0.08em',
                      textShadow: '0 0 20px rgba(212,175,55,0.9), 0 2px 4px rgba(0,0,0,0.8)',
                      animation: 'smackText 0.65s ease-out forwards',
                      whiteSpace: 'nowrap',
                    }}>SMACK!</div>
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
                {gamePhase === 'bidding' && !pendingBid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 25 }}>
                    <div className="pointer-events-auto bg-black/85 backdrop-blur-md rounded-2xl px-5 py-4 border border-[#D4AF37]/30 shadow-2xl"
                      style={{ animation: 'bidPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                      <div className="text-center text-white font-bold text-base mb-3">Your Bid</div>
                      <div className="flex flex-wrap justify-center gap-2 mb-2" style={{ maxWidth: '280px' }}>
                        {houseRules.nilAllowed && (
                          <button onClick={() => setPendingBid({ amount: 0, isNil: true, isBlindNil: false })}
                            className="w-10 h-10 rounded-full font-black text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-110 shadow-lg flex items-center justify-center">
                            Nil
                          </button>
                        )}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => (
                          <button key={n} onClick={() => setPendingBid({ amount: n, isNil: false, isBlindNil: false })}
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
                          <button onClick={() => setPendingBid({ amount: 0, isNil: false, isBlindNil: true })}
                            className="w-full py-1.5 rounded-full font-bold text-xs border-2 border-purple-500 text-purple-300 bg-purple-900/30 hover:bg-purple-800/50 transition-all hover:scale-105">
                            🔮 Blind NIL (±200)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── BID CONFIRMATION ── */}
                {pendingBid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 30 }}>
                    <div className="pointer-events-auto bg-black/92 backdrop-blur-md rounded-2xl px-6 py-5 border border-[#D4AF37]/60 shadow-2xl text-center"
                      style={{ animation: 'bidPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both', minWidth: 220 }}>
                      <div className="text-[#D4AF37] font-bold text-lg mb-1">Confirm Bid</div>
                      <div className="text-white text-3xl font-black mb-1">
                        {pendingBid.isNil ? 'NIL' : pendingBid.isBlindNil ? 'BLIND NIL' : pendingBid.amount}
                      </div>
                      <div className="text-xs text-gray-400 mb-4">
                        {pendingBid.isNil ? 'You are betting you will win 0 tricks (+/−100 pts)' : pendingBid.isBlindNil ? 'Bid NIL without seeing your hand (+/−200 pts)' : `You are bidding ${pendingBid.amount} trick${pendingBid.amount !== 1 ? 's' : ''}`}
                      </div>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setPendingBid(null)}
                          className="px-4 py-2 rounded-full text-sm font-bold border border-white/20 text-white/70 hover:bg-white/10 transition-all">
                          Cancel
                        </button>
                        <button
                          onClick={() => { const b = pendingBid; setPendingBid(null); placeBid(b.amount, b.isNil, b.isBlindNil); }}
                          className="px-5 py-2 rounded-full text-sm font-black text-black transition-all hover:scale-105"
                          style={{ background: 'linear-gradient(135deg,#D4AF37,#B8860B)' }}>
                          Lock It In ♠
                        </button>
                      </div>
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
                <div style={{ background: 'linear-gradient(180deg, rgba(8,8,14,0.95) 0%, rgba(5,5,10,1) 100%)', borderTop: '2px solid rgba(93,64,55,0.5)', padding: '10px 8px 12px', position: 'relative', zIndex: 20 }}>
                  {/* Reaction buttons + SMACK */}
                  <div className="absolute right-2 top-1 flex flex-col gap-1 items-end">
                    <div className="flex gap-1 items-center">
                      {/* SMACK button — arm before playing a card you're confident about */}
                      {gamePhase === 'playing' && currentPlayer === 0 && (
                        <button
                          onClick={() => setSmackMode(m => !m)}
                          title={smackMode ? 'SMACK armed — play any card to slam it!' : 'Arm the SMACK — play with attitude!'}
                          style={{
                            fontSize: 11, padding: '2px 7px', borderRadius: 8,
                            background: smackMode ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${smackMode ? '#D4AF37' : 'rgba(255,255,255,0.15)'}`,
                            color: smackMode ? '#D4AF37' : '#666',
                            cursor: 'pointer', fontWeight: 800, letterSpacing: '0.04em',
                            transition: 'all 0.2s',
                            animation: smackMode ? 'smackArmPulse 0.8s ease-in-out infinite' : undefined,
                            userSelect: 'none',
                          }}>
                          💥 {smackMode ? 'ARMED!' : 'SMACK'}
                        </button>
                      )}
                      <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
                    </div>
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

        {/* ═══ CELEBRATION SYSTEM ═══ */}
        <CelebrationSystem
          enabled={settings.celebrationsEnabled}
          reactions={reactions}
          winBursts={winBursts}
          onBurstComplete={removeBurst}
          playerPositions={{ you: 'bottom', p2: 'left', p3: 'top', p4: 'right' }}
        />

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
