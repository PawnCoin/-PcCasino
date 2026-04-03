import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX, Settings, Trophy, Zap, RotateCcw, ChevronRight, Star, Shield, Crown, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createDeck, shuffleDeck } from '@/hooks/useGameEngine';
import { PokerChip, ChipStack } from '@/components/PokerChip';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import { chooseAICard, calculateAIBid } from '@/hooks/useSpadesAI';
import type { AIDifficulty } from '@/hooks/useSpadesAI';
import type { Card } from '@/types';

interface SpadesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
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
  nilSuccess?: boolean | null;
}

interface TrickCard {
  player: string;
  card: Card;
}

interface CompletedTrick {
  cards: TrickCard[];
  winner: string;
}

interface HouseRules {
  targetScore: number;
  sandbagPenalty: boolean;
  nilAllowed: boolean;
  blindNilAllowed: boolean;
  spadesAlwaysBroken: boolean;
}

interface PlayerStats {
  wins: number;
  losses: number;
  mmr: number;
  tier: string;
}

interface Reaction {
  id: string;
  player: string;
  emoji: string;
  timestamp: number;
}

interface TournamentMatch {
  id: string;
  team1: string;
  team2: string;
  winner?: string;
  round: number;
}

const CHIP_VALUES = [5, 10, 25, 50, 100, 500];
const REACTIONS = ['🔥', '👏', '😤', '🎉', '💀', '🤙', '😂', '👑'];

const TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: '#CD7F32', icon: Shield },
  { name: 'Silver', min: 1000, max: 1499, color: '#C0C0C0', icon: Star },
  { name: 'Gold', min: 1500, max: 1999, color: '#D4AF37', icon: Crown },
  { name: 'Platinum', min: 2000, max: 2499, color: '#00BCD4', icon: Zap },
  { name: 'Diamond', min: 2500, max: 9999, color: '#9C27B0', icon: Flame },
];

const getTier = (mmr: number) => {
  return TIERS.find(t => mmr >= t.min && mmr <= t.max) || TIERS[0];
};

const DEFAULT_RULES: HouseRules = {
  targetScore: 500,
  sandbagPenalty: true,
  nilAllowed: true,
  blindNilAllowed: true,
  spadesAlwaysBroken: false,
};

const INITIAL_PLAYERS: SpadesPlayer[] = [
  { id: 'you', name: 'You', hand: [], bid: null, tricks: 0, avatar: '♠', color: 'from-[#D4AF37] to-[#B8860B]', nilBid: false, blindNilBid: false },
  { id: 'p2', name: 'West', hand: [], bid: null, tricks: 0, avatar: 'W', color: 'from-[#B71C1C] to-[#8B0000]', nilBid: false, blindNilBid: false },
  { id: 'p3', name: 'Partner', hand: [], bid: null, tricks: 0, avatar: 'P', color: 'from-[#1E88E5] to-[#1565C0]', nilBid: false, blindNilBid: false },
  { id: 'p4', name: 'East', hand: [], bid: null, tricks: 0, avatar: 'E', color: 'from-[#43A047] to-[#2E7D32]', nilBid: false, blindNilBid: false },
];

const PARTNER_INDEX: Record<number, number> = { 0: 2, 1: 3, 2: 0, 3: 1 };

export function SpadesGame({ balance, onBack, onBet, onWin, cardBackStyle }: SpadesGameProps) {
  const [gamePhase, setGamePhase] = useState<'menu' | 'betting' | 'bidding' | 'playing' | 'scoring'>('menu');
  const [players, setPlayers] = useState<SpadesPlayer[]>(INITIAL_PLAYERS.map(p => ({ ...p })));
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
  const [isMuted, setIsMuted] = useState(false);
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
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ wins: 0, losses: 0, mmr: 1200, tier: 'Silver' });
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [roundHistory, setRoundHistory] = useState<{ your: number; opp: number; round: number }[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tournament, setTournament] = useState<TournamentMatch[]>([
    { id: 'm1', team1: 'You & Partner', team2: 'Team Alpha', round: 1 },
    { id: 'm2', team1: 'Team Beta', team2: 'Team Gamma', round: 1 },
    { id: 'm3', team1: 'TBD', team2: 'TBD', round: 2 },
  ]);

  const yourPlayer = players[0];
  const yourPartner = players[2];

  useEffect(() => {
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, []);

  const showTooltip = useCallback((msg: string) => {
    if (!tooltipsEnabled) return;
    setTooltip(msg);
    setTimeout(() => setTooltip(null), 3000);
  }, [tooltipsEnabled]);

  const triggerSpadesBroken = () => {
    setShowSpadesBroken(true);
    showTooltip('♠ Spades are now broken! You can lead spades.');
    setTimeout(() => setShowSpadesBroken(false), 1800);
  };

  const addReaction = (emoji: string) => {
    const newReaction: Reaction = {
      id: `${Date.now()}-${Math.random()}`,
      player: 'you',
      emoji,
      timestamp: Date.now(),
    };
    setReactions(prev => [...prev.slice(-5), newReaction]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 2500);
    setShowReactionPanel(false);
  };

  const addAIReaction = (playerId: string) => {
    if (Math.random() > 0.25) return;
    const emoji = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    const newReaction: Reaction = {
      id: `${Date.now()}-ai-${Math.random()}`,
      player: playerId,
      emoji,
      timestamp: Date.now(),
    };
    setReactions(prev => [...prev.slice(-5), newReaction]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 2500);
  };

  const addChipToBet = (amount: number) => {
    if (currentBet + amount > balance) { setMessage('Insufficient balance!'); return; }
    setCurrentBet(prev => prev + amount);
    setTableChips(prev => {
      const existing = prev.find(c => c.amount === amount);
      if (existing) return prev.map(c => c.amount === amount ? { ...c, count: c.count + 1 } : c);
      return [...prev, { amount, count: 1 }];
    });
  };

  const clearBet = () => { setCurrentBet(0); setTableChips([]); setMessage(''); };

  const dealCards = (existingPlayers: SpadesPlayer[]) => {
    const newDeck = shuffleDeck(createDeck());
    const newPlayers = existingPlayers.map((p, i) => ({
      ...p,
      hand: newDeck.slice(i * 13, (i + 1) * 13).sort((a, b) => {
        const suitOrder: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
        return suitOrder[a.suit] - suitOrder[b.suit] || b.value - a.value;
      }),
      bid: null, tricks: 0, nilBid: false, blindNilBid: false, nilSuccess: null,
    }));
    return newPlayers;
  };

  const startGame = () => {
    if (currentBet === 0) { setMessage('Place a bet first!'); return; }
    if (!onBet(currentBet)) return;
    const newPlayers = dealCards(INITIAL_PLAYERS.map(p => ({ ...p })));
    setPlayers(newPlayers);
    setGamePhase('bidding');
    setCurrentPlayer(0);
    setCompletedTricks([]);
    setCurrentTrick([]);
    setLastTrick(null);
    setSpadesBroken(houseRules.spadesAlwaysBroken);
    setMessage('Place your bid — how many tricks will you win?');
    showTooltip('Count your spades and high cards to estimate your tricks.');
  };

  const placeBid = (bidAmount: number, isNil = false, isBlindNil = false) => {
    const newPlayers = [...players];
    newPlayers[0] = { ...newPlayers[0], bid: bidAmount, nilBid: isNil, blindNilBid: isBlindNil };

    for (let i = 1; i < 4; i++) {
      const { bid, nilBid, blindNilBid } = calculateAIBid(
        newPlayers[i].hand, aiDifficulty,
        houseRules.nilAllowed, houseRules.blindNilAllowed
      );
      newPlayers[i] = { ...newPlayers[i], bid, nilBid, blindNilBid };
    }

    setPlayers(newPlayers);
    setGamePhase('playing');
    setCurrentPlayer(0);
    setMessage('Lead a card to start!');
    showTooltip('You lead the first trick — spades cannot be led until broken.');
  };

  const getLegalCards = (hand: Card[], trick: TrickCard[]): number[] => {
    if (trick.length === 0) {
      if (!spadesBroken) {
        const hasNonSpade = hand.some(c => c.suit !== 'spades');
        if (hasNonSpade) return hand.map((_, i) => i).filter(i => hand[i].suit !== 'spades');
      }
      return hand.map((_, i) => i);
    }
    const leadSuit = trick[0].card.suit;
    const hasLead = hand.some(c => c.suit === leadSuit);
    if (hasLead) return hand.map((_, i) => i).filter(i => hand[i].suit === leadSuit);
    return hand.map((_, i) => i);
  };

  const playCard = (cardIndex: number) => {
    if (currentPlayer !== 0 || isAIThinking) return;
    const card = yourPlayer.hand[cardIndex];
    const legal = getLegalCards(yourPlayer.hand, currentTrick);
    if (!legal.includes(cardIndex)) {
      if (currentTrick.length > 0 && yourPlayer.hand.some(c => c.suit === currentTrick[0].card.suit)) {
        setMessage(`Follow suit! Play a ${currentTrick[0].card.suit} card.`);
        showTooltip('You must follow the led suit if you have one.');
      } else {
        setMessage('Spades not broken yet — lead another suit.');
        showTooltip('Lead a non-spade or wait until spades are broken.');
      }
      return;
    }

    if (card.suit === 'spades' && !spadesBroken) {
      setSpadesBroken(true);
      triggerSpadesBroken();
    }

    const newPlayers = [...players];
    newPlayers[0] = { ...newPlayers[0], hand: newPlayers[0].hand.filter((_, i) => i !== cardIndex) };
    setPlayers(newPlayers);

    const newTrick = [...currentTrick, { player: 'you', card }];
    setCurrentTrick(newTrick);
    setIsAIThinking(true);
    aiTimer.current = setTimeout(() => playAICards(newTrick, newPlayers), 600);
  };

  const playAICards = (trick: TrickCard[], currentPlayers: SpadesPlayer[]) => {
    let trickCards = [...trick];
    let nextPlayer = currentPlayer + 1;
    const updatedPlayers = currentPlayers.map(p => ({ ...p }));

    const playNext = () => {
      if (trickCards.length >= 4) {
        setIsAIThinking(false);
        resolveTrick(trickCards, updatedPlayers);
        return;
      }

      const pIdx = nextPlayer % 4;
      const player = updatedPlayers[pIdx];
      let broken = spadesBroken;

      const chosenCard = chooseAICard({
        player: { ...player, bid: player.bid },
        playerIndex: pIdx,
        allPlayers: updatedPlayers.map(p => ({ ...p, bid: p.bid })),
        currentTrick: trickCards,
        tricksPlayed: completedTricks.length,
        spadesBroken: broken,
        difficulty: aiDifficulty,
        partnerIndex: PARTNER_INDEX[pIdx],
      });

      if (chosenCard.suit === 'spades' && !broken) {
        broken = true;
        setSpadesBroken(true);
        triggerSpadesBroken();
      }

      updatedPlayers[pIdx] = {
        ...updatedPlayers[pIdx],
        hand: updatedPlayers[pIdx].hand.filter(c => !(c.suit === chosenCard.suit && c.rank === chosenCard.rank)),
      };

      trickCards = [...trickCards, { player: player.id, card: chosenCard }];
      setCurrentTrick([...trickCards]);
      addAIReaction(player.id);

      nextPlayer++;
      aiTimer.current = setTimeout(playNext, 550);
    };

    playNext();
  };

  const resolveTrick = (trickCards: TrickCard[], currentPlayers: SpadesPlayer[]) => {
    const leadSuit = trickCards[0].card.suit;
    let winningCard = trickCards[0].card;
    let winner = trickCards[0].player;

    for (let i = 1; i < trickCards.length; i++) {
      const { card, player } = trickCards[i];
      if (card.suit === 'spades') {
        if (winningCard.suit !== 'spades' || card.value > winningCard.value) { winningCard = card; winner = player; }
      } else if (card.suit === leadSuit && winningCard.suit !== 'spades') {
        if (card.value > winningCard.value) { winningCard = card; winner = player; }
      }
    }

    const newPlayers = currentPlayers.map(p => ({
      ...p,
      tricks: p.id === winner ? p.tricks + 1 : p.tricks,
    }));
    setPlayers(newPlayers);

    const completed: CompletedTrick = { cards: trickCards, winner };
    const newCompleted = [...completedTricks, completed];
    setCompletedTricks(newCompleted);
    setLastTrick(completed);
    setCurrentTrick([]);

    const winnerName = winner === 'you' ? 'You' : winner === 'p3' ? 'Partner' : winner === 'p2' ? 'West' : 'East';
    setTrickWinner(winner);
    setMessage(`${winnerName} won the trick!`);
    setTimeout(() => setTrickWinner(null), 1200);

    const winnerIndex = newPlayers.findIndex(p => p.id === winner);
    setCurrentPlayer(winnerIndex);

    if (newCompleted.length >= 13) {
      setTimeout(() => scoreRound(newPlayers), 1600);
    }
  };

  const scoreRound = (finalPlayers: SpadesPlayer[]) => {
    const yourTeamBid = (finalPlayers[0].bid || 0) + (finalPlayers[2].bid || 0);
    const yourTeamTricks = finalPlayers[0].tricks + finalPlayers[2].tricks;
    const opponentBid = (finalPlayers[1].bid || 0) + (finalPlayers[3].bid || 0);
    const opponentTricks = finalPlayers[1].tricks + finalPlayers[3].tricks;

    let yourScore = 0;
    let opponentScore = 0;
    let newBags = { ...bags };
    let roundMsg = '';

    const scoreTeam = (
      players: SpadesPlayer[],
      teamBid: number,
      teamTricks: number,
      isYou: boolean
    ) => {
      let score = 0;
      const [p1, p2] = players;

      for (const p of [p1, p2]) {
        if (p.nilBid || p.blindNilBid) {
          const bonus = p.blindNilBid ? 200 : 100;
          if (p.tricks === 0) {
            score += bonus;
            roundMsg += ` ${p.name} NIL ✓ +${bonus}!`;
          } else {
            score -= bonus;
            roundMsg += ` ${p.name} NIL ✗ -${bonus}!`;
          }
        }
      }

      const nonNilBid = players.reduce((sum, p) => {
        if (p.nilBid || p.blindNilBid) return sum;
        return sum + (p.bid || 0);
      }, 0);
      const nonNilTricks = players.reduce((sum, p) => {
        if (p.nilBid || p.blindNilBid) return sum;
        return sum + p.tricks;
      }, 0);

      if (nonNilBid > 0) {
        if (nonNilTricks >= nonNilBid) {
          score += nonNilBid * 10;
          const overtricks = nonNilTricks - nonNilBid;
          if (isYou) newBags.you += overtricks;
          else newBags.opponent += overtricks;
        } else {
          score -= nonNilBid * 10;
        }
      }

      return score;
    };

    yourScore = scoreTeam([finalPlayers[0], finalPlayers[2]], yourTeamBid, yourTeamTricks, true);
    opponentScore = scoreTeam([finalPlayers[1], finalPlayers[3]], opponentBid, opponentTricks, false);

    if (houseRules.sandbagPenalty) {
      if (newBags.you >= 10) { yourScore -= 100; newBags.you -= 10; roundMsg += ' Sandbag penalty -100!'; }
      if (newBags.opponent >= 10) { opponentScore -= 100; newBags.opponent -= 10; }
    }

    const newYourTotal = teamScore.you + yourScore;
    const newOppTotal = teamScore.opponent + opponentScore;

    setTeamScore({ you: newYourTotal, opponent: newOppTotal });
    setBags(newBags);
    setRoundHistory(prev => [...prev, { your: yourScore, opp: opponentScore, round }]);
    setRound(prev => prev + 1);
    setMessage(`Round scored! Your team: ${yourScore > 0 ? '+' : ''}${yourScore} pts.${roundMsg}`);

    if (newYourTotal >= houseRules.targetScore || newOppTotal >= houseRules.targetScore) {
      const won = newYourTotal > newOppTotal;
      setTimeout(() => {
        if (won) {
          onWin(currentBet * 2);
          setMessage(`You won the game! +${currentBet * 2} $Pc 🎉`);
          setWinFlash(true);
          setTimeout(() => setWinFlash(false), 2500);
          if (rankedMode) {
            setPlayerStats(prev => ({
              ...prev, wins: prev.wins + 1, mmr: prev.mmr + 25,
              tier: getTier(prev.mmr + 25).name,
            }));
          }
          setTournament(prev => prev.map(m =>
            m.id === 'm1' ? { ...m, winner: 'You & Partner' } : m
          ));
        } else {
          setMessage('Opponents won the game. Better luck next time!');
          setLoseFlash(true);
          setTimeout(() => setLoseFlash(false), 1500);
          if (rankedMode) {
            setPlayerStats(prev => ({
              ...prev, losses: prev.losses + 1, mmr: Math.max(0, prev.mmr - 20),
              tier: getTier(Math.max(0, prev.mmr - 20)).name,
            }));
          }
        }
        setGamePhase('menu');
        setCurrentBet(0);
        setTableChips([]);
        setTeamScore({ you: 0, opponent: 0 });
        setBags({ you: 0, opponent: 0 });
        setRound(1);
        setRoundHistory([]);
      }, 2000);
    } else {
      setTimeout(() => {
        const newPlayers = dealCards(players);
        setPlayers(newPlayers);
        setCompletedTricks([]);
        setCurrentTrick([]);
        setLastTrick(null);
        setSpadesBroken(houseRules.spadesAlwaysBroken);
        setGamePhase('bidding');
        setCurrentPlayer(0);
        setMessage('New round! Place your bid.');
      }, 3500);
    }
  };

  const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

  const renderCard = (card: Card, onClick?: () => void, small = false, fanIndex?: number, fanTotal?: number, playable = true) => {
    const hasFan = fanIndex !== undefined && fanTotal !== undefined;
    const fanRotation = hasFan ? (fanIndex - (fanTotal - 1) / 2) * 4 : 0;
    const fanTranslateY = hasFan ? Math.abs(fanIndex - (fanTotal - 1) / 2) * 5 : 0;
    const isLegal = playable && onClick;

    return (
      <div
        style={{
          transform: hasFan ? `rotate(${fanRotation}deg) translateY(${fanTranslateY}px)` : undefined,
          transformOrigin: 'bottom center',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          zIndex: hasFan ? fanIndex : undefined,
        }}
      >
        <button
          onClick={onClick}
          disabled={!onClick}
          className={`premium-card ${card.isRed ? 'red' : 'black'} relative flex flex-col items-center justify-center gap-0.5
            ${isLegal ? 'hover:-translate-y-5 hover:scale-110 hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] cursor-pointer hover:z-50' : ''}
            ${!playable ? 'opacity-40' : ''}
            transition-all duration-200`}
          style={{
            width: small ? '48px' : '68px',
            height: small ? '68px' : '96px',
            animation: 'spadesCardFlip 0.35s ease-out forwards',
            color: card.isRed ? '#c62828' : '#1a1a1a',
          }}
        >
          <span className={`font-bold leading-none ${small ? 'text-base' : 'text-xl'}`}>{card.rank}</span>
          <span className={small ? 'text-xl' : 'text-3xl'}>{suitSymbols[card.suit]}</span>
        </button>
      </div>
    );
  };

  const renderCardBack = (width: number, height: number, key?: number | string) => {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div key={key} className="rounded-lg overflow-hidden"
          style={{ width: `${width}px`, height: `${height}px`, background: `url(${backStyle.image}) center/cover`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }} />
      );
    }
    return <div key={key} className="playing-card playing-card-back" style={{ width: `${width}px`, height: `${height}px` }} />;
  };

  const playerPositionMap: Record<string, number> = { 'you': 0, 'p2': 1, 'p3': 2, 'p4': 3 };
  const tier = getTier(playerStats.mmr);
  const TierIcon = tier.icon;

  const legalIndices = gamePhase === 'playing' && currentPlayer === 0
    ? getLegalCards(yourPlayer.hand, currentTrick)
    : [];

  return (
    <CasinoEnvironment gameType="spades">
      <div className="min-h-screen bg-[#080810]">
        <style>{`
          @keyframes spadesCardFlip {
            0% { transform: rotateY(90deg) scale(0.8); opacity: 0; }
            60% { transform: rotateY(-4deg) scale(1.02); opacity: 1; }
            100% { transform: rotateY(0deg) scale(1); opacity: 1; }
          }
          @keyframes slidein-bottom { 0% { transform: translateY(50px) scale(0.8); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes slidein-right { 0% { transform: translateX(50px) scale(0.8); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
          @keyframes slidein-top { 0% { transform: translateY(-50px) scale(0.8); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes slidein-left { 0% { transform: translateX(-50px) scale(0.8); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
          @keyframes spadesBrokenFlash {
            0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
            40% { transform: scale(1.4) rotate(5deg); opacity: 1; }
            70% { transform: scale(1) rotate(0deg); opacity: 1; }
            100% { transform: scale(1.8) rotate(10deg); opacity: 0; }
          }
          @keyframes trickGlow {
            0%, 100% { box-shadow: 0 0 10px rgba(212,175,55,0.2); }
            50% { box-shadow: 0 0 50px rgba(212,175,55,0.9), 0 0 100px rgba(212,175,55,0.4); }
          }
          @keyframes winCelebration {
            0% { box-shadow: inset 0 0 0 rgba(67,160,71,0); }
            40% { box-shadow: inset 0 0 150px rgba(67,160,71,0.35); }
            100% { box-shadow: inset 0 0 0 rgba(67,160,71,0); }
          }
          @keyframes loseShake {
            0%, 100% { transform: translateX(0); }
            15%, 55%, 85% { transform: translateX(-5px); }
            35%, 70% { transform: translateX(5px); }
          }
          @keyframes reactionFloat {
            0% { transform: translateY(0) scale(0.5); opacity: 1; }
            100% { transform: translateY(-80px) scale(1.4); opacity: 0; }
          }
          @keyframes rankPulse {
            0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,0.3); }
            50% { box-shadow: 0 0 18px rgba(212,175,55,0.7); }
          }
          @keyframes aiThink {
            0%, 100% { opacity: 0.4; } 50% { opacity: 1; }
          }
          @keyframes dealIn {
            0% { transform: translateY(-200px) scale(0) rotate(-30deg); opacity: 0; }
            100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          }
          .legal-card { filter: drop-shadow(0 0 8px rgba(212,175,55,0.5)); }
          .illegal-card { filter: brightness(0.5) saturate(0.3); cursor: not-allowed !important; }
        `}</style>

        {/* TOP NAV */}
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/25">
          <div className="max-w-7xl mx-auto px-3 h-13 flex items-center justify-between gap-2">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-casino font-bold text-[#D4AF37] text-lg tracking-widest">SPADES</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {rankedMode && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold"
                  style={{ borderColor: tier.color, color: tier.color, animation: 'rankPulse 2s infinite' }}>
                  <TierIcon className="w-3.5 h-3.5" />
                  {tier.name} · {playerStats.mmr} MMR
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full balance-display text-sm">
                <img src="/logos/pc-logo.png" alt="$Pc" className="w-4 h-4" />
                <span className="font-bold text-[#D4AF37]">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-xs text-gray-400">$Pc</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="w-8 h-8">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowHouseRules(true)} className="w-8 h-8">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowTournament(true)} className="w-8 h-8">
                <Trophy className="w-4 h-4 text-[#D4AF37]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowRules(true)} className="w-8 h-8">
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* FLOATING TOOLTIP */}
        {tooltip && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-[#1a1a2e]/95 border border-[#D4AF37]/50 text-[#D4AF37] text-sm font-medium shadow-xl backdrop-blur-md pointer-events-none"
            style={{ animation: 'slidein-top 0.3s ease-out' }}>
            💡 {tooltip}
          </div>
        )}

        {/* FLOATING REACTIONS */}
        <div className="fixed bottom-40 right-4 z-50 flex flex-col gap-1 pointer-events-none">
          {reactions.map(r => (
            <div key={r.id} className="text-3xl" style={{ animation: 'reactionFloat 2.5s ease-out forwards' }}>
              {r.emoji}
            </div>
          ))}
        </div>

        {/* AI THINKING INDICATOR */}
        {isAIThinking && (
          <div className="fixed top-16 right-4 z-40 px-3 py-1.5 rounded-full bg-black/80 border border-[#D4AF37]/30 text-xs text-[#D4AF37]"
            style={{ animation: 'aiThink 0.8s infinite' }}>
            AI thinking...
          </div>
        )}

        <div className="pt-14 min-h-screen flex flex-col p-3 relative z-10 gap-3">

          {/* MENU / MODE SELECT */}
          {gamePhase === 'menu' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
              <div className="text-center">
                <div className="text-8xl mb-3" style={{ textShadow: '0 0 40px rgba(212,175,55,0.6)' }}>♠</div>
                <h1 className="font-casino text-4xl font-bold text-gradient-gold tracking-widest mb-1">SPADES</h1>
                <p className="text-gray-400 text-sm">Elite Competitive Edition</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {(['easy', 'medium', 'hard', 'elite'] as AIDifficulty[]).map(d => (
                  <button key={d} onClick={() => setAIDifficulty(d)}
                    className="px-4 py-3 rounded-xl font-bold uppercase text-sm transition-all border-2"
                    style={{
                      background: aiDifficulty === d ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                      borderColor: aiDifficulty === d ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                      color: aiDifficulty === d ? '#D4AF37' : '#888',
                    }}>
                    {d === 'elite' ? '👑 ' : d === 'hard' ? '🔥 ' : d === 'medium' ? '⚡ ' : '😊 '}{d}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full max-w-sm">
                <button
                  onClick={() => setRankedMode(r => !r)}
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
                  style={{
                    background: rankedMode ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                    borderColor: rankedMode ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                  }}>
                  <span className="text-sm font-bold" style={{ color: rankedMode ? '#D4AF37' : '#888' }}>
                    🏆 Ranked Mode
                  </span>
                  <div className="w-10 h-5 rounded-full relative transition-all" style={{ background: rankedMode ? '#D4AF37' : '#333' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: rankedMode ? '22px' : '2px' }} />
                  </div>
                </button>
              </div>

              {rankedMode && (
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: tier.color }}>{playerStats.mmr}</div>
                    <div className="text-xs text-gray-500">MMR</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#43A047]">{playerStats.wins}</div>
                    <div className="text-xs text-gray-500">Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#B71C1C]">{playerStats.losses}</div>
                    <div className="text-xs text-gray-500">Losses</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={() => setTooltipsEnabled(t => !t)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: tooltipsEnabled ? 'rgba(30,136,229,0.15)' : 'transparent',
                    borderColor: tooltipsEnabled ? '#1E88E5' : 'rgba(255,255,255,0.1)',
                    color: tooltipsEnabled ? '#1E88E5' : '#666',
                  }}>
                  💡 Tips {tooltipsEnabled ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => setShowHouseRules(true)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all">
                  ⚙️ House Rules
                </button>
              </div>

              <Button onClick={() => setGamePhase('betting')} className="btn-primary py-4 px-12 text-xl font-bold w-full max-w-sm">
                PLAY NOW
              </Button>
            </div>
          )}

          {gamePhase !== 'menu' && (
            <div className="flex gap-3 flex-1">
              {/* TABLE */}
              <div className="flex-1 relative rounded-full overflow-hidden"
                style={{
                  animation: winFlash ? 'winCelebration 2s ease-out' : loseFlash ? 'loseShake 0.5s ease-out' : undefined,
                  minHeight: '480px',
                }}>
                <div className="absolute inset-0 rounded-full wood-rail" style={{ borderRadius: '50%' }} />
                <div className="absolute inset-[14px] rounded-full premium-felt" style={{ borderRadius: '50%' }} />
                <div className="absolute inset-[14px] rounded-full pointer-events-none"
                  style={{ borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
                <div className="absolute inset-[26px] rounded-full pointer-events-none"
                  style={{ borderRadius: '50%', border: '1.5px solid rgba(212,175,55,0.18)', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.35)' }} />

                {/* PLAYER: TOP (partner p3) */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                  <div className="text-center">
                    <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${players[2].color} flex items-center justify-center font-bold mb-1 mx-auto border-2 border-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.3)]`}>
                      {players[2].avatar}
                      {currentPlayer === 2 && gamePhase === 'playing' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
                      )}
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-black/80 border border-[#D4AF37]/25 backdrop-blur-sm">
                      <div className="text-xs font-medium text-[#1E88E5]">Partner</div>
                      <div className="text-xs text-[#C0C0C0]">
                        {players[2].nilBid ? '🚫NIL' : players[2].blindNilBid ? '🔮BNIL' : `Bid: ${players[2].bid ?? '?'}`} · {players[2].tricks}✓
                      </div>
                    </div>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {players[2].hand.slice(0, 8).map((_, i) => renderCardBack(20, 30, `top${i}`))}
                    </div>
                  </div>
                </div>

                {/* PLAYER: LEFT (p4) */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                  <div className="text-center">
                    <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${players[3].color} flex items-center justify-center font-bold mb-1 mx-auto border-2 border-[#D4AF37]`}>
                      {players[3].avatar}
                      {currentPlayer === 3 && gamePhase === 'playing' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
                      )}
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-black/80 border border-[#D4AF37]/25 backdrop-blur-sm">
                      <div className="text-xs font-medium text-[#43A047]">East</div>
                      <div className="text-xs text-[#C0C0C0]">
                        {players[3].nilBid ? '🚫NIL' : `Bid: ${players[3].bid ?? '?'}`} · {players[3].tricks}✓
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {players[3].hand.slice(0, 5).map((_, i) => renderCardBack(20, 30, `left${i}`))}
                    </div>
                  </div>
                </div>

                {/* PLAYER: RIGHT (p2) */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
                  <div className="text-center">
                    <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${players[1].color} flex items-center justify-center font-bold mb-1 mx-auto border-2 border-[#D4AF37]`}>
                      {players[1].avatar}
                      {currentPlayer === 1 && gamePhase === 'playing' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
                      )}
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-black/80 border border-[#D4AF37]/25 backdrop-blur-sm">
                      <div className="text-xs font-medium text-[#B71C1C]">West</div>
                      <div className="text-xs text-[#C0C0C0]">
                        {players[1].nilBid ? '🚫NIL' : `Bid: ${players[1].bid ?? '?'}`} · {players[1].tricks}✓
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {players[1].hand.slice(0, 5).map((_, i) => renderCardBack(20, 30, `right${i}`))}
                    </div>
                  </div>
                </div>

                {/* CENTER TRICK AREA */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 z-10"
                  style={{ animation: trickWinner ? 'trickGlow 0.8s ease-in-out' : undefined }}>
                  <div className="absolute inset-0 border-2 border-dashed border-[#D4AF37]/12 rounded-full" />
                  <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)' }} />

                  {currentTrick.map((play, i) => {
                    const pIdx = playerPositionMap[play.player] ?? 0;
                    const positions = [
                      { bottom: '8px', left: '50%', transform: 'translateX(-50%)', animation: 'slidein-bottom 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' },
                      { right: '8px', top: '50%', transform: 'translateY(-50%)', animation: 'slidein-right 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' },
                      { top: '8px', left: '50%', transform: 'translateX(-50%)', animation: 'slidein-top 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' },
                      { left: '8px', top: '50%', transform: 'translateY(-50%)', animation: 'slidein-left 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' },
                    ];
                    const pos = positions[pIdx];
                    return (
                      <div key={`trick-${i}-${play.card.suit}-${play.card.rank}`} className="absolute" style={{ ...pos, zIndex: i }}>
                        <div style={{ filter: trickWinner === play.player ? 'drop-shadow(0 0 14px rgba(212,175,55,0.9))' : undefined }}>
                          {renderCard(play.card, undefined, true)}
                        </div>
                      </div>
                    );
                  })}

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/75 px-3 py-1.5 rounded-xl border border-[#D4AF37]/25 backdrop-blur-sm pointer-events-none">
                    <div className="text-xs text-[#C0C0C0]">Trick {completedTricks.length + 1}/13</div>
                    {spadesBroken && <div className="text-xs text-[#D4AF37] font-bold">♠ Broken</div>}
                  </div>
                </div>

                {/* PLAYER: BOTTOM (you) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                  <div className="relative">
                    <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${yourPlayer.color} flex items-center justify-center font-bold text-xl mb-1 mx-auto border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.5)]`}>
                      {yourPlayer.avatar}
                      {currentPlayer === 0 && gamePhase === 'playing' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
                      )}
                    </div>
                    <div className="px-3 py-0.5 rounded-full bg-black/80 border border-[#D4AF37]/30 backdrop-blur-sm text-center">
                      <div className="font-medium text-[#D4AF37] text-sm">You</div>
                      <div className="text-xs text-[#C0C0C0]">
                        {yourPlayer.nilBid ? '🚫NIL' : yourPlayer.blindNilBid ? '🔮BNIL' : `Bid: ${yourPlayer.bid ?? '?'}`} · {yourPlayer.tricks}✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* SPADES BROKEN FLASH */}
                {showSpadesBroken && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="text-8xl" style={{ animation: 'spadesBrokenFlash 1.8s ease-out forwards', textShadow: '0 0 50px rgba(212,175,55,0.9)', color: '#D4AF37' }}>♠</div>
                  </div>
                )}

                {winFlash && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="text-5xl font-casino font-bold text-[#43A047]" style={{ animation: 'spadesBrokenFlash 2s ease-out forwards', textShadow: '0 0 30px rgba(67,160,71,0.9)' }}>WIN! 🎉</div>
                  </div>
                )}
              </div>

              {/* SCOREBOARD SIDEBAR */}
              <div className="w-52 flex flex-col gap-3 shrink-0"
                style={{ background: 'linear-gradient(180deg, rgba(12,12,20,0.97) 0%, rgba(8,8,16,0.99) 100%)', border: '1.5px solid rgba(212,175,55,0.35)', borderRadius: '16px', padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>

                <div className="text-center">
                  <div className="font-casino text-base tracking-widest text-gradient-gold">SCOREBOARD</div>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mt-1" />
                </div>

                <div className="text-center">
                  <div className="text-xs text-[#C0C0C0] uppercase tracking-wide">Round</div>
                  <div className="text-2xl font-bold text-[#D4AF37]">{round}</div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, rgba(67,160,71,0.15) 0%, rgba(46,125,50,0.1) 100%)', border: '1px solid rgba(67,160,71,0.3)' }}>
                    <div className="text-xs text-[#43A047] uppercase font-bold mb-1">Your Team</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold text-[#43A047]" key={`ys-${teamScore.you}`}>{teamScore.you}</div>
                      <div className="text-xs text-[#C0C0C0]"><span className="text-[#D4AF37]">{bags.you}</span> bags</div>
                    </div>
                    <div className="flex gap-1 text-xs text-[#C0C0C0] mt-0.5">
                      <span>You: {yourPlayer.nilBid ? 'NIL' : yourPlayer.bid ?? '-'}</span>
                      <span>·</span>
                      <span>P: {yourPartner.nilBid ? 'NIL' : yourPartner.bid ?? '-'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/40 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (teamScore.you / houseRules.targetScore) * 100)}%`, background: 'linear-gradient(90deg, #43A047, #66BB6A)' }} />
                    </div>
                  </div>

                  <div className="rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, rgba(183,28,28,0.15) 0%, rgba(139,0,0,0.1) 100%)', border: '1px solid rgba(183,28,28,0.3)' }}>
                    <div className="text-xs text-[#B71C1C] uppercase font-bold mb-1">Opponents</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold text-[#B71C1C]" key={`os-${teamScore.opponent}`}>{teamScore.opponent}</div>
                      <div className="text-xs text-[#C0C0C0]"><span className="text-[#D4AF37]">{bags.opponent}</span> bags</div>
                    </div>
                    <div className="flex gap-1 text-xs text-[#C0C0C0] mt-0.5">
                      <span>W: {players[1].nilBid ? 'NIL' : players[1].bid ?? '-'}</span>
                      <span>·</span>
                      <span>E: {players[3].nilBid ? 'NIL' : players[3].bid ?? '-'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/40 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (teamScore.opponent / houseRules.targetScore) * 100)}%`, background: 'linear-gradient(90deg, #B71C1C, #E53935)' }} />
                    </div>
                  </div>
                </div>

                <div className="text-center text-xs text-[#C0C0C0]/50">Goal: {houseRules.targetScore} pts</div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

                <div className="text-center">
                  <div className="text-xs text-[#C0C0C0] uppercase tracking-wide mb-1">Tricks</div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div className="text-[#43A047] font-bold text-lg">
                      {yourPlayer.tricks + yourPartner.tricks}
                      <span className="text-[#C0C0C0] text-xs"> / {(yourPlayer.bid || 0) + (yourPartner.bid || 0)}</span>
                    </div>
                    <div className="text-[#B71C1C] font-bold text-lg">
                      {players[1].tricks + players[3].tricks}
                      <span className="text-[#C0C0C0] text-xs"> / {(players[1].bid || 0) + (players[3].bid || 0)}</span>
                    </div>
                  </div>
                </div>

                {lastTrick && (
                  <button onClick={() => setShowLastTrick(true)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs border border-[#D4AF37]/20 text-[#D4AF37]/70 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all">
                    <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Last Trick</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}

                {roundHistory.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="text-xs text-[#C0C0C0]/50 text-center">History</div>
                    {roundHistory.slice(-3).map((h, i) => (
                      <div key={i} className="flex justify-between text-xs px-1">
                        <span className="text-[#C0C0C0]/50">R{h.round}</span>
                        <span className={h.your >= 0 ? 'text-[#43A047]' : 'text-[#B71C1C]'}>{h.your > 0 ? '+' : ''}{h.your}</span>
                        <span className={h.opp >= 0 ? 'text-[#B71C1C]' : 'text-[#43A047]'}>{h.opp > 0 ? '+' : ''}{h.opp}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* REACTION BUTTON */}
                <button onClick={() => setShowReactionPanel(p => !p)}
                  className="w-full py-1.5 rounded-lg text-xs border border-[#D4AF37]/20 text-[#D4AF37]/70 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all">
                  😄 React
                </button>
                {showReactionPanel && (
                  <div className="grid grid-cols-4 gap-1">
                    {REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => addReaction(emoji)}
                        className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MESSAGE BAR */}
          {gamePhase !== 'menu' && message && (
            <div className="text-center">
              <div className="inline-block px-6 py-2.5 rounded-full bg-black/85 text-[#D4AF37] border border-[#D4AF37]/35 font-bold backdrop-blur-sm shadow-[0_0_20px_rgba(212,175,55,0.12)] text-sm">
                {message}
              </div>
            </div>
          )}

          {/* BOTTOM ACTION AREA */}
          {gamePhase !== 'menu' && (
            <div className="border-t-2 p-4 rounded-xl" style={{ background: 'linear-gradient(180deg, rgba(10,10,16,0.97) 0%, rgba(6,6,12,0.99) 100%)', borderColor: 'rgba(93,64,55,0.5)', boxShadow: '0 -4px 24px rgba(0,0,0,0.5)' }}>

              {gamePhase === 'betting' && (
                <div className="max-w-2xl mx-auto">
                  <div className="text-center text-[#C0C0C0] text-xs mb-3 uppercase tracking-wider">Select Chip • Click to Bet</div>
                  <div className="flex justify-center gap-2 flex-wrap mb-4">
                    {CHIP_VALUES.map(amount => (
                      <PokerChip key={amount} amount={amount} size="md" selected={selectedChip === amount} onClick={() => setSelectedChip(amount)} />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-[#C0C0C0] text-xs mb-1">CURRENT BET</div>
                      <div className="text-3xl font-bold text-[#D4AF37]">{currentBet} $Pc</div>
                    </div>
                    <button onClick={() => addChipToBet(selectedChip)}
                      className="relative w-22 h-22 rounded-full border-4 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all bg-black/40 flex items-center justify-center hover:shadow-[0_0_28px_rgba(212,175,55,0.35)]"
                      style={{ width: '90px', height: '90px' }}>
                      {tableChips.length > 0 ? (
                        <div className="relative">
                          {tableChips.map((chip, i) => (
                            <div key={i} className="absolute" style={{ transform: `translate(${Math.sin(i * 0.5) * 4}px, ${-i * 4}px)`, zIndex: tableChips.length - i }}>
                              <ChipStack amount={chip.amount} count={chip.count} size="sm" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#D4AF37]/50 text-xs text-center">CLICK<br/>TO BET</span>
                      )}
                    </button>
                    <button onClick={clearBet} disabled={currentBet === 0} className="px-4 py-2 rounded-lg bg-[#B71C1C]/80 hover:bg-[#B71C1C] text-white text-sm font-bold disabled:opacity-30 transition-all">
                      CLEAR
                    </button>
                  </div>
                  <Button onClick={startGame} className="w-full btn-primary py-4 text-xl font-bold" disabled={currentBet === 0}>
                    DEAL CARDS ♠
                  </Button>
                </div>
              )}

              {gamePhase === 'bidding' && (
                <div className="max-w-2xl mx-auto text-center">
                  <div className="text-[#C0C0C0] text-sm mb-3 font-medium">How many tricks will you win?</div>
                  <div className="flex gap-2 justify-center flex-wrap mb-3">
                    {Array.from({ length: 14 }, (_, i) => i).map(bid => (
                      <button key={bid} onClick={() => placeBid(bid, bid === 0, false)}
                        className="w-10 h-10 rounded-lg font-bold text-sm transition-all border hover:scale-110 hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                        style={{
                          background: bid === 0 ? 'rgba(183,28,28,0.3)' : 'rgba(93,64,55,0.4)',
                          borderColor: bid === 0 ? 'rgba(183,28,28,0.6)' : 'rgba(212,175,55,0.25)',
                          color: bid === 0 ? '#ef9a9a' : '#D4AF37',
                        }}>
                        {bid}
                      </button>
                    ))}
                  </div>
                  {houseRules.nilAllowed && (
                    <div className="flex gap-3 justify-center mt-2">
                      <button onClick={() => placeBid(0, true, false)}
                        className="px-5 py-2 rounded-lg font-bold text-sm border-2 border-[#B71C1C] text-[#ef5350] bg-[#B71C1C]/15 hover:bg-[#B71C1C]/30 transition-all hover:scale-105">
                        🚫 NIL <span className="text-xs opacity-70">(±100)</span>
                      </button>
                      {houseRules.blindNilAllowed && (
                        <button onClick={() => placeBid(0, false, true)}
                          className="px-5 py-2 rounded-lg font-bold text-sm border-2 border-[#9C27B0] text-[#ce93d8] bg-[#9C27B0]/15 hover:bg-[#9C27B0]/30 transition-all hover:scale-105">
                          🔮 BLIND NIL <span className="text-xs opacity-70">(±200)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {gamePhase === 'playing' && (
                <div className="flex justify-center items-end gap-0 flex-wrap py-1" style={{ minHeight: '110px' }}>
                  {yourPlayer.hand.map((card, i) => {
                    const isLegal = legalIndices.includes(i);
                    return (
                      <div key={`hand-${card.suit}-${card.rank}`}
                        className={isLegal ? 'legal-card' : 'illegal-card'}
                        style={{ marginLeft: i === 0 ? 0 : '-10px' }}>
                        {renderCard(card, isLegal ? () => playCard(i) : undefined, false, i, yourPlayer.hand.length, isLegal)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* HOUSE RULES DIALOG */}
        <Dialog open={showHouseRules} onOpenChange={setShowHouseRules}>
          <DialogContent className="max-w-md glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-xl text-gradient-gold">⚙️ House Rules</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <div className="text-sm text-[#C0C0C0] mb-2">Target Score</div>
                <div className="flex gap-2">
                  {[300, 500, 750].map(score => (
                    <button key={score} onClick={() => setPendingRules(r => ({ ...r, targetScore: score }))}
                      className="flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all"
                      style={{
                        background: pendingRules.targetScore === score ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                        borderColor: pendingRules.targetScore === score ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                        color: pendingRules.targetScore === score ? '#D4AF37' : '#888',
                      }}>{score}</button>
                  ))}
                </div>
              </div>

              {[
                { key: 'sandbagPenalty', label: '🎒 Sandbag Penalty (10 bags = -100)' },
                { key: 'nilAllowed', label: '🚫 NIL Bidding Allowed' },
                { key: 'blindNilAllowed', label: '🔮 Blind NIL Allowed' },
                { key: 'spadesAlwaysBroken', label: '♠ Spades Always Broken' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-gray-300">{label}</span>
                  <button onClick={() => setPendingRules(r => ({ ...r, [key]: !(r as any)[key] }))}
                    className="w-11 h-6 rounded-full relative transition-all"
                    style={{ background: (pendingRules as any)[key] ? '#D4AF37' : '#333' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                      style={{ left: (pendingRules as any)[key] ? '25px' : '3px' }} />
                  </button>
                </div>
              ))}

              <div>
                <div className="text-sm text-[#C0C0C0] mb-2">AI Difficulty</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['easy', 'medium', 'hard', 'elite'] as AIDifficulty[]).map(d => (
                    <button key={d} onClick={() => setAIDifficulty(d)}
                      className="py-2 rounded-lg text-sm font-bold border-2 transition-all capitalize"
                      style={{
                        background: aiDifficulty === d ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                        borderColor: aiDifficulty === d ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                        color: aiDifficulty === d ? '#D4AF37' : '#888',
                      }}>{d}</button>
                  ))}
                </div>
              </div>

              <Button onClick={() => { setHouseRules({ ...pendingRules }); setShowHouseRules(false); }}
                className="w-full btn-primary">
                Apply Rules
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* LAST TRICK REPLAY DIALOG */}
        <Dialog open={showLastTrick} onOpenChange={setShowLastTrick}>
          <DialogContent className="max-w-sm glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-xl text-gradient-gold">↩ Last Trick Replay</DialogTitle>
            </DialogHeader>
            {lastTrick && (
              <div className="py-4">
                <div className="relative w-48 h-48 mx-auto">
                  {lastTrick.cards.map((play, i) => {
                    const pIdx = playerPositionMap[play.player] ?? 0;
                    const positions = [
                      { bottom: '8px', left: '50%', transform: 'translateX(-50%)' },
                      { right: '8px', top: '50%', transform: 'translateY(-50%)' },
                      { top: '8px', left: '50%', transform: 'translateX(-50%)' },
                      { left: '8px', top: '50%', transform: 'translateY(-50%)' },
                    ];
                    const isWinner = lastTrick.winner === play.player;
                    return (
                      <div key={i} className="absolute" style={positions[pIdx]}>
                        <div style={{ filter: isWinner ? 'drop-shadow(0 0 12px rgba(212,175,55,0.9))' : undefined }}>
                          {renderCard(play.card, undefined, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center mt-4 text-sm">
                  <span className="text-[#C0C0C0]">Winner: </span>
                  <span className="text-[#D4AF37] font-bold">
                    {lastTrick.winner === 'you' ? 'You' : lastTrick.winner === 'p3' ? 'Partner' : lastTrick.winner === 'p2' ? 'West' : 'East'}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* TOURNAMENT DIALOG */}
        <Dialog open={showTournament} onOpenChange={setShowTournament}>
          <DialogContent className="max-w-md glass-panel-strong border-[#D4AF37]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-xl text-gradient-gold">🏆 Tournament Bracket</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="text-xs text-[#C0C0C0] uppercase tracking-wider text-center">Semi-Finals</div>
              <div className="grid grid-cols-2 gap-3">
                {tournament.filter(m => m.round === 1).map(match => (
                  <div key={match.id} className="rounded-xl p-3 border"
                    style={{ background: 'rgba(212,175,55,0.05)', borderColor: 'rgba(212,175,55,0.25)' }}>
                    <div className={`text-sm font-bold py-1 px-2 rounded-lg mb-1 transition-all ${match.winner === match.team1 ? 'bg-[#43A047]/20 text-[#43A047]' : 'text-gray-300'}`}>
                      {match.team1}
                    </div>
                    <div className="text-xs text-center text-[#D4AF37]/50 font-bold">VS</div>
                    <div className={`text-sm font-bold py-1 px-2 rounded-lg mt-1 ${match.winner === match.team2 ? 'bg-[#43A047]/20 text-[#43A047]' : 'text-gray-300'}`}>
                      {match.team2}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <div className="w-px h-6 bg-[#D4AF37]/30" />
              </div>
              <div className="text-xs text-[#C0C0C0] uppercase tracking-wider text-center">Final</div>
              {tournament.filter(m => m.round === 2).map(match => (
                <div key={match.id} className="rounded-xl p-3 border mx-auto max-w-xs"
                  style={{ background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.4)' }}>
                  <div className="text-sm font-bold py-1 px-2 rounded-lg mb-1 text-gray-400">{match.team1}</div>
                  <div className="text-xs text-center text-[#D4AF37]/50 font-bold">VS</div>
                  <div className="text-sm font-bold py-1 px-2 rounded-lg mt-1 text-gray-400">{match.team2}</div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* RULES DIALOG */}
        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-2xl text-gradient-gold">♠ Spades Rules</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 text-sm">
              {[
                { title: 'Objective', items: ['Be the first team to reach the target score (default 500pts).', 'Score by accurately predicting and winning tricks each round.'] },
                { title: 'Scoring', items: ['+10 pts per trick bid and won', '+1 pt per overtrick (bag) — 10 bags = -100 penalty', 'NIL bid: +100 success / -100 failure', 'Blind NIL bid: +200 success / -200 failure', 'Failed bid: -10 pts per trick under bid'] },
                { title: 'Gameplay', items: ['Partners sit across from each other (You & Partner vs West & East)', 'Must follow suit if possible', 'Cannot lead spades until broken', 'Highest card of led suit wins (spades always trump)', 'Winner of trick leads next'] },
              ].map(({ title, items }) => (
                <div key={title}>
                  <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">{title}</h3>
                  <ul className="space-y-1 text-gray-300">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#D4AF37]">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CasinoEnvironment>
  );
}
