import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PokerChip, ChipStack } from '@/components/PokerChip';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import type { Card } from '@/types';

interface Spanish21GameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 500, 1000];

// Card values for Spanish 21 (no 10s)
const SPANISH_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'J', 'Q', 'K', 'A'];

interface Hand {
  cards: Card[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isComplete: boolean;
}

interface SideBets {
  threeCardPoker: number;
  matchTheDealer: number;
  perfectPair: number;
}

// Evaluate 3 Card Poker hand
const evaluate3CardPoker = (cards: Card[]): { hand: string; payout: number } => {
  if (cards.length !== 3) return { hand: 'Invalid', payout: 0 };
  
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const isFlush = cards.every(c => c.suit === cards[0].suit);
  const isStraight = sorted[0].value - sorted[1].value === 1 && sorted[1].value - sorted[2].value === 1;
  const isRoyal = sorted[0].rank === 'A' && sorted[1].rank === 'K' && sorted[2].rank === 'Q';
  const isThreeOfAKind = cards.every(c => c.value === cards[0].value);
  
  if (isRoyal && isFlush) return { hand: 'Mini Royal Flush', payout: 40 };
  if (isStraight && isFlush) return { hand: 'Straight Flush', payout: 30 };
  if (isThreeOfAKind && isFlush) return { hand: 'Suited 3 of a Kind', payout: 20 };
  if (isThreeOfAKind) return { hand: '3 of a Kind', payout: 10 };
  if (isStraight) return { hand: 'Straight', payout: 3 };
  if (isFlush) return { hand: 'Flush', payout: 1 };
  
  return { hand: 'No Hand', payout: 0 };
};

// Evaluate Match The Dealer
const evaluateMatchTheDealer = (playerCards: Card[], dealerCard: Card): { matches: number; suited: number; payout: number } => {
  let matches = 0;
  let suited = 0;
  
  playerCards.forEach(pc => {
    if (pc.value === dealerCard.value) {
      matches++;
      if (pc.suit === dealerCard.suit) suited++;
    }
  });
  
  if (matches === 2 && suited === 2) return { matches, suited, payout: 15 };
  if (matches === 2 && suited === 1) return { matches, suited, payout: 13 };
  if (matches === 2 && suited === 0) return { matches, suited, payout: 7 };
  if (matches === 1 && suited === 1) return { matches, suited, payout: 6 };
  if (matches === 1 && suited === 0) return { matches, suited, payout: 3 };
  
  return { matches, suited, payout: 0 };
};

// Evaluate Perfect Pair
const evaluatePerfectPair = (cards: Card[]): { type: string; payout: number } => {
  if (cards.length < 2) return { type: 'None', payout: 0 };
  
  const c1 = cards[0];
  const c2 = cards[1];
  
  if (c1.value !== c2.value) return { type: 'None', payout: 0 };
  
  if (c1.suit === c2.suit) return { type: 'Perfect Pair', payout: 20 };
  
  const redSuits: string[] = ['hearts', 'diamonds'];
  const c1IsRed = redSuits.includes(c1.suit);
  const c2IsRed = redSuits.includes(c2.suit);
  
  if ((c1IsRed && c2IsRed) || (!c1IsRed && !c2IsRed)) return { type: 'Same Color', payout: 8 };
  
  return { type: 'Mixed Color', payout: 4 };
};

// Calculate hand value
const calculateHandValue = (cards: Card[]): { value: number; isSoft: boolean; isBlackjack: boolean } => {
  let value = 0;
  let aces = 0;
  
  cards.forEach(card => {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  });
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  const isSoft = aces > 0 && value <= 21;
  const isBlackjack = cards.length === 2 && value === 21;
  
  return { value, isSoft, isBlackjack };
};

// Create Spanish 21 deck (48 cards - no 10s)
const createSpanishDeck = (): Card[] => {
  const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  
  for (let d = 0; d < 6; d++) {
    suits.forEach(suit => {
      SPANISH_RANKS.forEach(rank => {
        let value = parseInt(rank);
        if (isNaN(value)) {
          if (rank === 'A') value = 11;
          else value = 10;
        }
        deck.push({
          suit: suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
          rank: rank as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'J' | 'Q' | 'K' | 'A',
          value,
          isRed: suit === 'hearts' || suit === 'diamonds'
        });
      });
    });
  }
  
  return deck;
};

// Shuffle deck
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function Spanish21Game({ balance, onBack, onBet, onWin, cardBackStyle }: Spanish21GameProps) {
  const [gameState, setGameState] = useState<'betting' | 'dealing' | 'player' | 'dealer' | 'finished'>('betting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<Hand[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [anteBet, setAnteBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState(10);
  const [sideBets, setSideBets] = useState<SideBets>({ threeCardPoker: 0, matchTheDealer: 0, perfectPair: 0 });
  const [, setInsuranceBet] = useState(0);
  const [showInsurance, setShowInsurance] = useState(false);
  const [showEvenMoney, setShowEvenMoney] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('Place your Ante bet and optional side bets');
  const [showDealerCard, setShowDealerCard] = useState(false);
  const [sideBetResults, setSideBetResults] = useState<{ name: string; win: number }[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [cardDealAnim, setCardDealAnim] = useState(false);
  const [chipEntranceAnim, setChipEntranceAnim] = useState<string | null>(null);
  const [showBonusStarburst, setShowBonusStarburst] = useState(false);
  const [bonusMultiplier, setBonusMultiplier] = useState('');
  const [showBustEffect, setShowBustEffect] = useState(false);
  const [showWinFlash, setShowWinFlash] = useState(false);
  const [sideBetCelebration, setSideBetCelebration] = useState<string | null>(null);

  const currentHand = playerHands[currentHandIndex];

  const initDeck = useCallback(() => {
    setDeck(shuffleDeck(createSpanishDeck()));
  }, []);

  const placeAnteBet = () => {
    if (anteBet === 0) {
      setMessage('Place an Ante bet first!');
      return;
    }
    if (!onBet(anteBet + sideBets.threeCardPoker + sideBets.matchTheDealer + sideBets.perfectPair)) {
      setMessage('Insufficient balance!');
      return;
    }
    dealCards();
  };

  const dealCards = () => {
    const newDeck = deck.length < 20 ? shuffleDeck(createSpanishDeck()) : [...deck];
    
    // Burn first card
    const afterBurn = newDeck.slice(1);
    
    // Deal 2 cards to player and dealer
    const playerCards = [afterBurn[0], afterBurn[2]];
    const dealerCards = [afterBurn[1], afterBurn[3]];
    
    setDeck(afterBurn.slice(4));
    setPlayerHands([{ cards: playerCards, bet: anteBet, isDoubled: false, isSplit: false, isComplete: false }]);
    setDealerHand(dealerCards);
    setGameState('dealing');
    setShowDealerCard(false);
    setCurrentHandIndex(0);
    setSideBetResults([]);
    
    // Evaluate side bets
    const results: { name: string; win: number }[] = [];
    
    // 3 Card Poker (player's 2 cards + dealer's up card)
    if (sideBets.threeCardPoker > 0) {
      const pokerResult = evaluate3CardPoker([...playerCards, dealerCards[0]]);
      if (pokerResult.payout > 0) {
        results.push({ name: '3 Card Poker', win: sideBets.threeCardPoker * (pokerResult.payout + 1) });
      }
    }
    
    // Match The Dealer
    if (sideBets.matchTheDealer > 0) {
      const matchResult = evaluateMatchTheDealer(playerCards, dealerCards[0]);
      if (matchResult.payout > 0) {
        results.push({ name: 'Match The Dealer', win: sideBets.matchTheDealer * matchResult.payout });
      }
    }
    
    // Perfect Pair
    if (sideBets.perfectPair > 0) {
      const pairResult = evaluatePerfectPair(playerCards);
      if (pairResult.payout > 0) {
        results.push({ name: 'Perfect Pair', win: sideBets.perfectPair * pairResult.payout });
      }
    }
    
    setSideBetResults(results);
    setCardDealAnim(true);
    setTimeout(() => setCardDealAnim(false), 800);
    
    const sideBetWins = results.reduce((sum, r) => sum + r.win, 0);
    if (sideBetWins > 0) {
      onWin(sideBetWins);
      const topResult = results.reduce((best, r) => r.win > best.win ? r : best, results[0]);
      setSideBetCelebration(topResult.name);
      setTimeout(() => setSideBetCelebration(null), 3000);
      triggerCelebration(`${topResult.name} Win! +${sideBetWins} $Pc`);
    }
    
    // Check for insurance/even money
    const playerValue = calculateHandValue(playerCards);
    const dealerUpCard = dealerCards[0];
    
    if (dealerUpCard.rank === 'A') {
      if (playerValue.isBlackjack) {
        setShowEvenMoney(true);
        setMessage('Dealer shows Ace. Even Money?');
      } else {
        setShowInsurance(true);
        setMessage('Dealer shows Ace. Insurance?');
      }
    } else if (['J', 'Q', 'K'].includes(dealerUpCard.rank) || dealerUpCard.value === 10) {
      // Dealer peeks for blackjack
      const dealerValue = calculateHandValue(dealerCards);
      if (dealerValue.isBlackjack) {
        setShowDealerCard(true);
        finishRound();
        return;
      }
      setGameState('player');
      setMessage('Your turn. Hit or Stand?');
    } else {
      setGameState('player');
      if (playerValue.isBlackjack) {
        setMessage('Blackjack! Waiting for dealer...');
        setTimeout(() => dealerTurn(), 1500);
      } else {
        setMessage('Your turn. Hit or Stand?');
      }
    }
  };

  const takeInsurance = () => {
    const insuranceAmount = Math.floor(anteBet / 2);
    if (!onBet(insuranceAmount)) {
      setMessage('Insufficient balance for insurance!');
      return;
    }
    setInsuranceBet(insuranceAmount);
    setShowInsurance(false);
    
    const dealerValue = calculateHandValue(dealerHand);
    if (dealerValue.isBlackjack) {
      onWin(insuranceAmount * 3);
      setMessage('Dealer has Blackjack! Insurance pays 2:1');
      setShowDealerCard(true);
      finishRound();
    } else {
      setMessage('Dealer does not have Blackjack. Play continues.');
      setGameState('player');
    }
  };

  const takeEvenMoney = () => {
    onWin(anteBet * 2);
    setShowEvenMoney(false);
    setMessage('Even Money taken!');
    resetGame();
  };

  const declineInsurance = () => {
    setShowInsurance(false);
    setShowEvenMoney(false);
    
    const dealerValue = calculateHandValue(dealerHand);
    const playerValue = calculateHandValue(playerHands[0].cards);
    
    if (dealerValue.isBlackjack) {
      setShowDealerCard(true);
      if (playerValue.isBlackjack) {
        onWin(anteBet);
        setMessage('Both have Blackjack - Push!');
      } else {
        setMessage('Dealer has Blackjack!');
      }
      finishRound();
    } else {
      setGameState('player');
      if (playerValue.isBlackjack) {
        onWin(anteBet * 2.5);
        setMessage('Blackjack pays 3:2!');
        setTimeout(() => resetGame(), 2000);
      } else {
        setMessage('Your turn. Hit or Stand?');
      }
    }
  };

  const handleHit = () => {
    const newCard = deck[0];
    setDeck(prev => prev.slice(1));
    
    const newHands = [...playerHands];
    newHands[currentHandIndex].cards = [...currentHand.cards, newCard];
    setPlayerHands(newHands);
    
    const handValue = calculateHandValue(newHands[currentHandIndex].cards);
    
    if (handValue.value > 21) {
      setMessage('BUST!');
      setShowBustEffect(true);
      setTimeout(() => setShowBustEffect(false), 1200);
      newHands[currentHandIndex].isComplete = true;
      setPlayerHands(newHands);
      
      if (currentHandIndex < playerHands.length - 1) {
        setCurrentHandIndex(prev => prev + 1);
        setMessage(`Hand ${currentHandIndex + 2}. Hit or Stand?`);
      } else {
        setTimeout(() => dealerTurn(), 1000);
      }
    }
  };

  const handleStand = () => {
    const newHands = [...playerHands];
    newHands[currentHandIndex].isComplete = true;
    setPlayerHands(newHands);
    
    if (currentHandIndex < playerHands.length - 1) {
      setCurrentHandIndex(prev => prev + 1);
      setMessage(`Hand ${currentHandIndex + 2}. Hit or Stand?`);
    } else {
      dealerTurn();
    }
  };

  const handleDoubleDown = () => {
    if (currentHand.cards.length !== 2) return;
    if (!onBet(currentHand.bet)) return;
    
    const newHands = [...playerHands];
    newHands[currentHandIndex].bet *= 2;
    newHands[currentHandIndex].isDoubled = true;
    
    const newCard = deck[0];
    setDeck(prev => prev.slice(1));
    newHands[currentHandIndex].cards = [...currentHand.cards, newCard];
    newHands[currentHandIndex].isComplete = true;
    setPlayerHands(newHands);
    
    const handValue = calculateHandValue(newHands[currentHandIndex].cards);
    
    if (handValue.value > 21) {
      setMessage('Bust!');
    }
    
    if (currentHandIndex < playerHands.length - 1) {
      setCurrentHandIndex(prev => prev + 1);
      setMessage(`Hand ${currentHandIndex + 2}. Hit or Stand?`);
    } else {
      setTimeout(() => dealerTurn(), 1000);
    }
  };

  const handleSplit = () => {
    if (currentHand.cards.length !== 2) return;
    if (currentHand.cards[0].value !== currentHand.cards[1].value) return;
    if (playerHands.length >= 4) return;
    if (!onBet(currentHand.bet)) return;
    
    const newHands = [...playerHands];
    const card1 = currentHand.cards[0];
    const card2 = currentHand.cards[1];
    
    newHands[currentHandIndex] = { 
      cards: [card1, deck[0]], 
      bet: currentHand.bet, 
      isDoubled: false, 
      isSplit: true, 
      isComplete: false 
    };
    newHands.splice(currentHandIndex + 1, 0, { 
      cards: [card2, deck[1]], 
      bet: currentHand.bet, 
      isDoubled: false, 
      isSplit: true, 
      isComplete: false 
    });
    
    setDeck(prev => prev.slice(2));
    setPlayerHands(newHands);
    setMessage('Hand split. Playing first hand.');
  };

  const handleSurrender = () => {
    onWin(Math.floor(currentHand.bet / 2));
    const newHands = [...playerHands];
    newHands[currentHandIndex].isComplete = true;
    setPlayerHands(newHands);
    setMessage('Surrendered. Half bet returned.');
    
    if (currentHandIndex < playerHands.length - 1) {
      setCurrentHandIndex(prev => prev + 1);
    } else {
      finishRound();
    }
  };

  const dealerTurn = () => {
    setGameState('dealer');
    setShowDealerCard(true);
    setMessage('Dealer\'s turn...');
    
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];
    
    const playDealer = () => {
      const dealerValue = calculateHandValue(currentDealerHand);
      
      if (dealerValue.value < 17 || (dealerValue.value === 17 && dealerValue.isSoft)) {
        currentDealerHand = [...currentDealerHand, currentDeck[0]];
        currentDeck = currentDeck.slice(1);
        setDealerHand(currentDealerHand);
        setDeck(currentDeck);
        setTimeout(playDealer, 800);
      } else {
        finishRound();
      }
    };
    
    setTimeout(playDealer, 1000);
  };

  const finishRound = () => {
    setGameState('finished');
    setShowDealerCard(true);
    
    const dealerValue = calculateHandValue(dealerHand);
    const dealerBust = dealerValue.value > 21;
    
    let totalWin = 0;
    
    playerHands.forEach(hand => {
      const handValue = calculateHandValue(hand.cards);
      const handBust = handValue.value > 21;
      
      if (handBust) {
        // Lose - no win
      } else if (dealerBust || handValue.value > dealerValue.value) {
        totalWin += hand.bet * 2;
      } else if (handValue.value === dealerValue.value) {
        totalWin += hand.bet;
      }
    });
    
    if (totalWin > 0) {
      onWin(totalWin);
      setMessage(`You win! +${totalWin} $Pc`);
      setShowWinFlash(true);
      setTimeout(() => setShowWinFlash(false), 1500);
      const special21Hand = playerHands.find(hand => {
        const hv = calculateHandValue(hand.cards);
        return hv.value === 21 && hand.cards.length >= 5;
      });
      if (special21Hand) {
        const cardCount = special21Hand.cards.length;
        const multiplierText = cardCount >= 7 ? '7+ CARD 21 — 3:1 BONUS!' : cardCount === 6 ? '6 CARD 21 — 2:1 BONUS!' : '5 CARD 21 — BONUS!';
        setBonusMultiplier(multiplierText);
        setShowBonusStarburst(true);
        setTimeout(() => setShowBonusStarburst(false), 3500);
        triggerCelebration(`🎰 ${multiplierText} +${totalWin} $Pc`);
      } else if (totalWin >= anteBet * 3) {
        triggerCelebration(`Big Win! +${totalWin} $Pc`);
      }
    } else {
      setMessage('Dealer wins.');
    }
  };

  const resetGame = () => {
    setGameState('betting');
    setAnteBet(0);
    setSideBets({ threeCardPoker: 0, matchTheDealer: 0, perfectPair: 0 });
    setInsuranceBet(0);
    setShowInsurance(false);
    setShowEvenMoney(false);
    setPlayerHands([]);
    setDealerHand([]);
    setSideBetResults([]);
    setMessage('Place your Ante bet and optional side bets');
  };

  useEffect(() => {
    initDeck();
  }, [initDeck]);

  const triggerCelebration = (msg: string) => {
    setCelebrationMessage(msg);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const addToAnte = (amount: number) => {
    if (anteBet + amount > balance) {
      setMessage('Insufficient balance!');
      return;
    }
    setAnteBet(prev => prev + amount);
  };

  const addToSideBet = (type: keyof SideBets, amount: number) => {
    const currentTotal = anteBet + sideBets.threeCardPoker + sideBets.matchTheDealer + sideBets.perfectPair + amount;
    if (currentTotal > balance) {
      setMessage('Insufficient balance!');
      return;
    }
    // Side bets must be at least $2 and <= ante bet
    if (sideBets[type] + amount < 2 && sideBets[type] === 0) {
      setMessage('Side bets must be at least $2');
      return;
    }
    if (sideBets[type] + amount > anteBet && anteBet > 0) {
      setMessage('Side bets cannot exceed Ante bet');
      return;
    }
    setSideBets(prev => ({ ...prev, [type]: prev[type] + amount }));
    setChipEntranceAnim(type);
    setTimeout(() => setChipEntranceAnim(null), 500);
  };

  const renderCardBack = (key?: number | string) => {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div
          key={key}
          className="premium-card rounded-lg overflow-hidden"
          style={{ 
            width: '90px',
            height: '126px',
            background: `url(${backStyle.image}) center/cover`,
            boxShadow: '0 8px 20px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)',
          }}
        />
      );
    }
    
    return (
      <div key={key} className="playing-card playing-card-back" style={{ width: '90px', height: '126px' }} />
    );
  };

  const renderCard = (card: Card, index: number, hidden = false) => {
    if (hidden) {
      return renderCardBack(index);
    }

    const suitSymbols: Record<string, string> = {
      hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
    };

    return (
      <div key={index} className={`premium-card card-hover-lift ${card.isRed ? 'text-red-700' : 'text-gray-900'}`}
        style={{
          width: '90px',
          height: '126px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: cardDealAnim ? `sp21-card-deal 0.6s ease-out ${index * 0.2}s both` : undefined,
          cursor: 'default',
          perspective: '600px',
        }}
      >
        <span className="text-2xl font-bold leading-none">{card.rank}</span>
        <span className="text-3xl leading-none">{suitSymbols[card.suit]}</span>
      </div>
    );
  };

  return (
    <CasinoEnvironment gameType="spanish21">
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-casino font-bold text-[#D4AF37]">SPANISH 21 + SIDEBETS</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1 rounded-full balance-display">
              <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5" />
              <span className="font-bold text-[#D4AF37]">
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-400">$Pc</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Celebration Particle Burst Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 animate-pulse" style={{ animationDuration: '0.3s' }} />
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ['#D4AF37', '#FFD700', '#ff6b35', '#9b59b6', '#3498db', '#e74c3c'][i % 6],
                left: '50%',
                top: '50%',
                boxShadow: `0 0 8px ${['#D4AF37', '#FFD700', '#ff6b35', '#9b59b6', '#3498db', '#e74c3c'][i % 6]}`,
                animation: `particle-burst-${i % 8} 2s ease-out forwards`,
                opacity: 0,
              }}
            />
          ))}
          <div className="relative z-10 px-10 py-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37] text-black font-bold text-2xl shadow-[0_0_60px_rgba(212,175,55,0.8)] animate-bounce">
            {celebrationMessage}
          </div>
          <style>{`
            ${Array.from({ length: 8 }).map((_, i) => `
              @keyframes particle-burst-${i} {
                0% { transform: translate(0, 0) scale(0); opacity: 1; }
                100% { 
                  transform: translate(${Math.cos(i * Math.PI / 4) * 300}px, ${Math.sin(i * Math.PI / 4) * 300}px) scale(1.5); 
                  opacity: 0; 
                }
              }
            `).join('')}
          `}</style>
        </div>
      )}

      {/* Bust Effect Overlay */}
      {showBustEffect && (
        <div className="fixed inset-0 z-[55] pointer-events-none">
          <div className="absolute inset-0 sp21-bust-flash" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl font-black text-red-500 sp21-bust-slam" style={{ textShadow: '0 0 40px rgba(183,28,28,0.8), 0 4px 8px rgba(0,0,0,0.6)' }}>
            BUST!
          </div>
        </div>
      )}

      {/* Win Flash Overlay */}
      {showWinFlash && (
        <div className="fixed inset-0 z-[55] pointer-events-none">
          <div className="absolute inset-0 sp21-win-flash" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[0, 1, 2].map(ring => (
              <div key={ring} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#D4AF37] sp21-win-ring" style={{ animationDelay: `${ring * 0.3}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Bonus Starburst Overlay */}
      {showBonusStarburst && (
        <div className="fixed inset-0 z-[58] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="absolute sp21-starburst-ray"
              style={{
                width: '4px',
                height: '200px',
                background: `linear-gradient(to top, transparent, ${i % 2 === 0 ? '#D4AF37' : '#FFD700'})`,
                left: '50%',
                top: '50%',
                transformOrigin: 'bottom center',
                transform: `rotate(${i * 22.5}deg) translateY(-100%)`,
                opacity: 0,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
          <div className="relative z-10 px-12 py-8 rounded-3xl sp21-bonus-text" style={{
            background: 'linear-gradient(135deg, #D4AF37, #FFD700, #D4AF37)',
            boxShadow: '0 0 80px rgba(212,175,55,0.9), 0 0 160px rgba(212,175,55,0.4)',
          }}>
            <div className="text-black font-black text-4xl text-center">{bonusMultiplier}</div>
          </div>
        </div>
      )}

      {/* Side Bet Celebration Overlay */}
      {sideBetCelebration && (
        <div className="fixed inset-0 z-[56] pointer-events-none flex items-center justify-center">
          {sideBetCelebration === '3 Card Poker' && (
            <div className="flex gap-4 sp21-side-fan">
              {['♠', '♥', '♦'].map((s, i) => (
                <div key={i} className="w-20 h-28 premium-card flex items-center justify-center text-4xl" style={{
                  transform: `rotate(${(i - 1) * 15}deg)`,
                  animationDelay: `${i * 0.15}s`,
                  color: i === 1 ? '#c62828' : i === 2 ? '#c62828' : '#212121',
                }}>
                  {s}
                </div>
              ))}
            </div>
          )}
          {sideBetCelebration === 'Match The Dealer' && (
            <div className="sp21-match-glow text-5xl font-black text-purple-400" style={{ textShadow: '0 0 40px rgba(155,89,182,0.8)' }}>
              MATCH!
            </div>
          )}
          {sideBetCelebration === 'Perfect Pair' && (
            <div className="sp21-pair-glow text-5xl font-black text-emerald-400" style={{ textShadow: '0 0 40px rgba(16,185,129,0.8)' }}>
              PERFECT PAIR!
            </div>
          )}
        </div>
      )}

      {/* Game Area */}
      <div className="pt-14 min-h-screen flex flex-col p-4 relative z-10">
        {/* Vegas Style Table with Wood Rail */}
        <div className="flex-1 rounded-3xl wood-rail relative overflow-hidden"
          style={{ padding: '12px' }}
        >
          {/* Casino table corner decorations */}
          <div className="absolute top-4 left-4 z-[5] pointer-events-none select-none" style={{ opacity: 0.75, fontSize: 22, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>🥃</div>
          <div className="absolute top-4 right-4 z-[5] pointer-events-none select-none" style={{ opacity: 0.7, fontSize: 20, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>🚬</div>
          <div className="absolute bottom-16 left-4 z-[5] pointer-events-none select-none" style={{ opacity: 0.68, fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>🍸</div>
          <div className="absolute bottom-16 right-4 z-[5] pointer-events-none select-none" style={{ opacity: 0.68, fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>🍺</div>

          <div className="absolute inset-[12px] rounded-2xl premium-felt" />

          {/* Casino spotlight cone - dramatic overhead light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-60 pointer-events-none z-[1]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.08) 40%, transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-32 pointer-events-none z-[1]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 60%)',
            }}
          />

          {/* Center logo watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <img src="/logos/pc-logo.png" alt="$Pc" className="w-32 h-32" />
          </div>

          {/* Insurance line marking */}
          <div className="absolute top-32 w-full flex justify-center pointer-events-none">
            <div className="text-[#D4AF37]/20 text-xs tracking-[0.5em] uppercase">Spanish 21 • Player Always Wins on 21</div>
          </div>

          {/* Side Bet Areas - Large Neon Circles */}
          {gameState === 'betting' && (
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-6 z-10">
              {/* 3 Card Poker - Gold Neon */}
              <button
                onClick={() => addToSideBet('threeCardPoker', selectedChip)}
                className="group relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 hover:scale-110"
                style={{
                  background: 'radial-gradient(circle, rgba(20,15,5,0.9) 0%, rgba(10,8,2,0.95) 100%)',
                  border: `3px solid ${sideBets.threeCardPoker > 0 ? 'rgba(212,175,55,0.9)' : 'rgba(212,175,55,0.4)'}`,
                  boxShadow: sideBets.threeCardPoker > 0
                    ? '0 0 25px rgba(212,175,55,0.7), 0 0 50px rgba(212,175,55,0.3), inset 0 0 20px rgba(212,175,55,0.15)'
                    : '0 0 12px rgba(212,175,55,0.2), inset 0 0 8px rgba(212,175,55,0.05)',
                  animation: sideBets.threeCardPoker > 0 ? 'sp21-neon-pulse-gold 2s ease-in-out infinite' : undefined,
                }}
              >
                <div className="text-[#D4AF37] font-black text-xs tracking-wider">3 CARD</div>
                <div className="text-[#FFD700] font-black text-xs">POKER</div>
                <div className="text-[9px] text-[#C0C0C0] mt-0.5">Min $2</div>
                <div className="text-[#D4AF37] font-bold text-sm mt-0.5">{sideBets.threeCardPoker > 0 ? `${sideBets.threeCardPoker}` : ''}</div>
                {sideBets.threeCardPoker > 0 && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 transition-all duration-500 ${chipEntranceAnim === 'threeCardPoker' ? 'animate-bounce scale-125' : ''}`}>
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(sideBets.threeCardPoker / selectedChip))} size="sm" />
                  </div>
                )}
              </button>

              {/* Match The Dealer - Purple Neon */}
              <button
                onClick={() => addToSideBet('matchTheDealer', selectedChip)}
                className="group relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 hover:scale-110"
                style={{
                  background: 'radial-gradient(circle, rgba(20,5,25,0.9) 0%, rgba(10,2,15,0.95) 100%)',
                  border: `3px solid ${sideBets.matchTheDealer > 0 ? 'rgba(155,89,182,0.9)' : 'rgba(155,89,182,0.4)'}`,
                  boxShadow: sideBets.matchTheDealer > 0
                    ? '0 0 25px rgba(155,89,182,0.7), 0 0 50px rgba(155,89,182,0.3), inset 0 0 20px rgba(155,89,182,0.15)'
                    : '0 0 12px rgba(155,89,182,0.2), inset 0 0 8px rgba(155,89,182,0.05)',
                  animation: sideBets.matchTheDealer > 0 ? 'sp21-neon-pulse-purple 2s ease-in-out infinite' : undefined,
                }}
              >
                <div className="text-purple-300 font-black text-xs tracking-wider">MATCH</div>
                <div className="text-purple-200 font-black text-xs">DEALER</div>
                <div className="text-[9px] text-[#C0C0C0] mt-0.5">Min $2</div>
                <div className="text-purple-300 font-bold text-sm mt-0.5">{sideBets.matchTheDealer > 0 ? `${sideBets.matchTheDealer}` : ''}</div>
                {sideBets.matchTheDealer > 0 && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 transition-all duration-500 ${chipEntranceAnim === 'matchTheDealer' ? 'animate-bounce scale-125' : ''}`}>
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(sideBets.matchTheDealer / selectedChip))} size="sm" />
                  </div>
                )}
              </button>

              {/* Perfect Pair - Emerald Neon */}
              <button
                onClick={() => addToSideBet('perfectPair', selectedChip)}
                className="group relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 hover:scale-110"
                style={{
                  background: 'radial-gradient(circle, rgba(5,20,15,0.9) 0%, rgba(2,10,8,0.95) 100%)',
                  border: `3px solid ${sideBets.perfectPair > 0 ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.4)'}`,
                  boxShadow: sideBets.perfectPair > 0
                    ? '0 0 25px rgba(16,185,129,0.7), 0 0 50px rgba(16,185,129,0.3), inset 0 0 20px rgba(16,185,129,0.15)'
                    : '0 0 12px rgba(16,185,129,0.2), inset 0 0 8px rgba(16,185,129,0.05)',
                  animation: sideBets.perfectPair > 0 ? 'sp21-neon-pulse-emerald 2s ease-in-out infinite' : undefined,
                }}
              >
                <div className="text-emerald-300 font-black text-xs tracking-wider">PERFECT</div>
                <div className="text-emerald-200 font-black text-xs">PAIR</div>
                <div className="text-[9px] text-[#C0C0C0] mt-0.5">Min $2</div>
                <div className="text-emerald-300 font-bold text-sm mt-0.5">{sideBets.perfectPair > 0 ? `${sideBets.perfectPair}` : ''}</div>
                {sideBets.perfectPair > 0 && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 transition-all duration-500 ${chipEntranceAnim === 'perfectPair' ? 'animate-bounce scale-125' : ''}`}>
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(sideBets.perfectPair / selectedChip))} size="sm" />
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Side Bet Results */}
          {sideBetResults.length > 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {sideBetResults.map((result, i) => (
                <div key={i} className="px-3 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37] text-black font-bold text-sm animate-pulse"
                  style={{ boxShadow: '0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3)' }}
                >
                  {result.name}: +{result.win} $Pc
                </div>
              ))}
            </div>
          )}

          {/* Card Shoe Visual */}
          <div className="absolute top-20 right-8 w-24 h-16 rounded-lg z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #2a1f14 0%, #1a1208 100%)',
              border: '2px solid rgba(93,64,55,0.6)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.05)',
            }}
          >
            <div className="absolute inset-1 rounded" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, transparent 100%)' }} />
            <div className="absolute -left-1 top-2 w-2 h-12 rounded-sm" style={{ background: 'linear-gradient(180deg, #f0f0f0, #d0d0d0, #b0b0b0)' }} />
          </div>

          {/* Dealer */}
          <div className="relative z-10 flex flex-col items-center justify-start pt-24"
            style={{ filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.15))' }}
          >
            <div className="text-center mb-3">
              <div className="inline-block px-6 py-1 rounded-lg mb-2" style={{
                background: 'linear-gradient(135deg, #2a2015 0%, #1a1008 100%)',
                border: '2px solid rgba(212,175,55,0.5)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 0 15px rgba(212,175,55,0.2)',
              }}>
                <span className="text-sm text-[#D4AF37] tracking-[0.3em] font-black" style={{ textShadow: '0 0 10px rgba(212,175,55,0.5)' }}>DEALER</span>
              </div>
              <div className="text-xl font-bold text-white bg-black/60 px-5 py-1.5 rounded-full border border-[#D4AF37]/30">
                {showDealerCard ? calculateHandValue(dealerHand).value : '?'}
              </div>
            </div>
            
            <div className="flex gap-3">
              {dealerHand.map((card, i) => renderCard(card, i, i === 1 && !showDealerCard))}
            </div>
          </div>

          {/* Insurance / Even Money Dialog */}
          {(showInsurance || showEvenMoney) && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <div className="bg-black/90 border-2 border-[#D4AF37] rounded-2xl p-6 text-center">
                <div className="text-[#D4AF37] font-bold text-xl mb-4">
                  {showEvenMoney ? 'Even Money?' : 'Insurance?'}
                </div>
                <div className="text-white mb-4">
                  {showEvenMoney 
                    ? 'Take 1:1 payout now?' 
                    : `Bet ${Math.floor(anteBet / 2)} $Pc that dealer has Blackjack?`
                  }
                </div>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={showEvenMoney ? takeEvenMoney : takeInsurance}
                    className="bg-[#43A047] hover:bg-[#2E7D32] px-6"
                  >
                    YES
                  </Button>
                  <Button 
                    onClick={declineInsurance}
                    className="bg-[#B71C1C] hover:bg-[#8B0000] px-6"
                  >
                    NO
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && !showInsurance && !showEvenMoney && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="px-8 py-4 rounded-2xl bg-black/80 text-xl font-bold text-white border-2 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                {message}
              </div>
            </div>
          )}

          {/* Player Hands */}
          <div className="absolute bottom-36 left-0 right-0 flex justify-center gap-6 z-10">
            {playerHands.map((hand, handIndex) => {
              const handValue = calculateHandValue(hand.cards);
              const isActive = handIndex === currentHandIndex && gameState === 'player';
              return (
                <div 
                  key={handIndex} 
                  className={`flex flex-col items-center transition-all duration-300 ${
                    isActive ? 'scale-110' : 'opacity-70'
                  }`}
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 15px rgba(212,175,55,0.3))' : undefined,
                  }}
                >
                  {isActive && (
                    <div className="absolute -inset-4 rounded-2xl border border-[#D4AF37]/30 pointer-events-none" style={{
                      boxShadow: '0 0 20px rgba(212,175,55,0.15)',
                    }} />
                  )}
                  <div className="flex gap-2 mb-2">
                    {hand.cards.map((card, i) => renderCard(card, i))}
                  </div>
                  <div className={`text-lg font-bold px-4 py-1.5 rounded-full border ${
                    handValue.value > 21 
                      ? 'bg-[#B71C1C]/90 text-white border-red-600/50' 
                      : handValue.value === 21
                        ? 'bg-[#2E7D32]/90 text-[#FFD700] border-[#43A047]/50'
                        : 'bg-black/70 text-[#D4AF37] border-[#D4AF37]/30'
                  }`}>
                    {handValue.value}
                    {handValue.isSoft && ' Soft'}
                    {handValue.isBlackjack && ' ♠ BJ!'}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full premium-chip" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', transform: 'scale(0.7)' }} />
                    <span className="text-[#D4AF37] text-sm font-bold">{hand.bet} $Pc</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Area */}
        <div className="bg-black/90 border-t-2 border-[#5D4037] p-4 mt-2 rounded-xl" style={{
          boxShadow: '0 -4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.1)',
        }}>
          {gameState === 'betting' && (
            <div className="max-w-4xl mx-auto">
              {/* Chip Selection */}
              <div className="text-center text-[#C0C0C0] text-sm mb-2">SELECT CHIP VALUE</div>
              <div className="flex justify-center gap-2 flex-wrap mb-4">
                {CHIP_VALUES.map(amount => (
                  <PokerChip
                    key={amount}
                    amount={amount}
                    size="md"
                    selected={selectedChip === amount}
                    onClick={() => setSelectedChip(amount)}
                  />
                ))}
              </div>

              {/* Ante Bet Area */}
              <div className="flex items-center justify-center gap-8 mb-4">
                <div className="text-center">
                  <div className="text-[#C0C0C0] text-xs mb-1">ANTE BET</div>
                  <div className="text-3xl font-bold text-[#D4AF37]">{anteBet} $Pc</div>
                </div>

                <button
                  onClick={() => addToAnte(selectedChip)}
                  className="relative w-28 h-28 rounded-full border-4 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all bg-black/40 flex items-center justify-center"
                  style={{
                    boxShadow: anteBet > 0
                      ? '0 0 20px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.1)'
                      : '0 0 10px rgba(212,175,55,0.1)',
                    animation: anteBet > 0 ? 'neon-pulse 2s ease-in-out infinite' : undefined,
                  }}
                >
                  {anteBet > 0 ? (
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(anteBet / selectedChip))} size="md" />
                  ) : (
                    <span className="text-[#D4AF37]/50 text-sm">CLICK FOR ANTE</span>
                  )}
                </button>

                <button
                  onClick={resetGame}
                  disabled={anteBet === 0}
                  className="px-4 py-2 rounded-lg bg-[#B71C1C]/80 hover:bg-[#B71C1C] text-white text-sm font-bold disabled:opacity-30"
                >
                  CLEAR
                </button>
              </div>

              {/* Total Bet Display */}
              <div className="text-center mb-4">
                <span className="text-[#C0C0C0]">Total Wager: </span>
                <span className="text-[#D4AF37] font-bold text-xl">
                  {anteBet + sideBets.threeCardPoker + sideBets.matchTheDealer + sideBets.perfectPair} $Pc
                </span>
              </div>

              <Button
                onClick={placeAnteBet}
                className="w-full btn-primary py-5 text-xl font-bold"
                disabled={anteBet === 0}
              >
                DEAL
              </Button>
            </div>
          )}

          {gameState === 'player' && (
            <div className="max-w-3xl mx-auto">
              {/* Current Hand Info */}
              <div className="text-center mb-4">
                <span className="text-[#C0C0C0]">Hand {currentHandIndex + 1} of {playerHands.length}</span>
                <span className="mx-4 text-[#D4AF37]">|</span>
                <span className="text-[#D4AF37] font-bold">Bet: {currentHand?.bet} $Pc</span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={handleHit}
                  className="px-10 py-5 rounded-xl font-bold bg-gradient-to-b from-[#1E88E5] to-[#1565C0] hover:from-[#42A5F5] hover:to-[#1E88E5] border-b-4 border-[#0D47A1] active:border-b-0 active:translate-y-1"
                >
                  HIT
                </Button>
                <Button
                  onClick={handleStand}
                  className="px-10 py-5 rounded-xl font-bold bg-gradient-to-b from-[#B71C1C] to-[#8B0000] hover:from-[#EF5350] hover:to-[#B71C1C] border-b-4 border-[#5c0000] active:border-b-0 active:translate-y-1"
                >
                  STAND
                </Button>
                <Button
                  onClick={handleDoubleDown}
                  disabled={currentHand?.cards.length !== 2 || currentHand?.bet * 2 > balance}
                  className="px-8 py-5 rounded-xl font-bold bg-gradient-to-b from-[#43A047] to-[#2E7D32] hover:from-[#66BB6A] hover:to-[#43A047] border-b-4 border-[#1B5E20] active:border-b-0 active:translate-y-1 disabled:opacity-40"
                >
                  DOUBLE
                </Button>
                <Button
                  onClick={handleSplit}
                  disabled={
                    currentHand?.cards.length !== 2 || 
                    currentHand?.cards[0].value !== currentHand?.cards[1].value || 
                    playerHands.length >= 4 ||
                    currentHand?.bet > balance
                  }
                  className="px-8 py-5 rounded-xl font-bold bg-gradient-to-b from-[#D4AF37] to-[#B8860B] hover:from-[#FFD700] hover:to-[#D4AF37] text-black border-b-4 border-[#8B6914] active:border-b-0 active:translate-y-1 disabled:opacity-40"
                >
                  SPLIT
                </Button>
                <Button
                  onClick={handleSurrender}
                  disabled={currentHand?.cards.length !== 2}
                  className="px-8 py-5 rounded-xl font-bold bg-gradient-to-b from-[#5D4037] to-[#3E2723] hover:from-[#8D6E63] hover:to-[#5D4037] border-b-4 border-[#271c19] active:border-b-0 active:translate-y-1 disabled:opacity-40"
                >
                  SURRENDER
                </Button>
              </div>
            </div>
          )}

          {gameState === 'finished' && (
            <div className="text-center">
              <Button
                onClick={resetGame}
                className="btn-primary px-16 py-5 text-xl font-bold"
              >
                PLAY AGAIN
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Card & Chip Animation Styles */}
      <style>{`
        @keyframes sp21-card-deal {
          0% { 
            transform: perspective(600px) translateX(200px) translateY(-80px) rotateY(-90deg) scale(0.5); 
            opacity: 0; 
            filter: blur(3px);
          }
          60% { 
            transform: perspective(600px) translateX(-5px) translateY(5px) rotateY(8deg) scale(1.02); 
            opacity: 1; 
            filter: blur(0);
          }
          100% { 
            transform: perspective(600px) translateX(0) translateY(0) rotateY(0deg) scale(1); 
            opacity: 1;
          }
        }
        .card-hover-lift:hover {
          transform: translateY(-8px) scale(1.05) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.7), 0 0 20px rgba(212,175,55,0.3) !important;
          z-index: 10;
        }
        @keyframes sp21-neon-pulse-gold {
          0%, 100% { box-shadow: 0 0 15px rgba(212,175,55,0.4), 0 0 30px rgba(212,175,55,0.2), inset 0 0 12px rgba(212,175,55,0.1); }
          50% { box-shadow: 0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4), inset 0 0 25px rgba(212,175,55,0.2); }
        }
        @keyframes sp21-neon-pulse-purple {
          0%, 100% { box-shadow: 0 0 15px rgba(155,89,182,0.4), 0 0 30px rgba(155,89,182,0.2), inset 0 0 12px rgba(155,89,182,0.1); }
          50% { box-shadow: 0 0 30px rgba(155,89,182,0.8), 0 0 60px rgba(155,89,182,0.4), inset 0 0 25px rgba(155,89,182,0.2); }
        }
        @keyframes sp21-neon-pulse-emerald {
          0%, 100% { box-shadow: 0 0 15px rgba(16,185,129,0.4), 0 0 30px rgba(16,185,129,0.2), inset 0 0 12px rgba(16,185,129,0.1); }
          50% { box-shadow: 0 0 30px rgba(16,185,129,0.8), 0 0 60px rgba(16,185,129,0.4), inset 0 0 25px rgba(16,185,129,0.2); }
        }
        .sp21-bust-flash {
          animation: sp21-bust-anim 1.2s ease-out forwards;
        }
        @keyframes sp21-bust-anim {
          0% { background: rgba(183,28,28,0.4); }
          20% { background: rgba(183,28,28,0.6); }
          100% { background: transparent; }
        }
        .sp21-bust-slam {
          animation: sp21-slam 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes sp21-slam {
          0% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -48%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        .sp21-win-flash {
          animation: sp21-win-anim 1.5s ease-out forwards;
        }
        @keyframes sp21-win-anim {
          0% { background: rgba(46,125,50,0.3); }
          30% { background: rgba(46,125,50,0.5); }
          100% { background: transparent; }
        }
        .sp21-win-ring {
          animation: sp21-ring-expand 1.5s ease-out forwards;
          width: 20px;
          height: 20px;
        }
        @keyframes sp21-ring-expand {
          0% { width: 20px; height: 20px; opacity: 1; border-color: rgba(212,175,55,0.9); }
          100% { width: 400px; height: 400px; opacity: 0; border-color: rgba(212,175,55,0); }
        }
        .sp21-starburst-ray {
          animation: sp21-ray-burst 1s ease-out forwards;
        }
        @keyframes sp21-ray-burst {
          0% { opacity: 0; height: 0; }
          30% { opacity: 1; height: 250px; }
          100% { opacity: 0; height: 350px; }
        }
        .sp21-bonus-text {
          animation: sp21-bonus-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes sp21-bonus-entrance {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .sp21-side-fan {
          animation: sp21-fan-in 0.8s ease-out forwards;
        }
        @keyframes sp21-fan-in {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .sp21-match-glow {
          animation: sp21-glow-pulse 2s ease-in-out infinite;
        }
        @keyframes sp21-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .sp21-pair-glow {
          animation: sp21-pair-pulse 1.5s ease-in-out infinite;
        }
        @keyframes sp21-pair-pulse {
          0%, 100% { transform: scale(1) rotate(-2deg); opacity: 0.8; }
          50% { transform: scale(1.15) rotate(2deg); opacity: 1; }
        }
      `}</style>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold">
              Spanish 21 with Side Bets
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Objective</h3>
              <p className="text-gray-300">Get a hand closer to 21 than the dealer without going over. Blackjack (Ace + 10/J/Q/K) pays 3:2.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Spanish 21 Deck</h3>
              <p className="text-gray-300">6-8 decks of 48 cards each (standard 52-card deck with all 10s removed).</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Player Actions</h3>
              <ul className="space-y-1 text-gray-300">
                <li><span className="text-[#D4AF37]">•</span> Hit - Take another card</li>
                <li><span className="text-[#D4AF37]">•</span> Stand - Keep current hand</li>
                <li><span className="text-[#D4AF37]">•</span> Double Down - Double bet, receive one more card</li>
                <li><span className="text-[#D4AF37]">•</span> Split - Split pair into two hands (up to 3 times)</li>
                <li><span className="text-[#D4AF37]">•</span> Surrender - Forfeit half bet (first action only)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Dealer Rules</h3>
              <p className="text-gray-300">Dealer must stand on hard 17, hit soft 17.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">3 Card Poker Side Bet</h3>
              <p className="text-gray-300 text-xs mb-1">Your 2 cards + Dealer's up card</p>
              <ul className="space-y-1 text-gray-300">
                <li><span className="text-[#D4AF37]">•</span> Mini Royal Flush: 40:1</li>
                <li><span className="text-[#D4AF37]">•</span> Straight Flush: 30:1</li>
                <li><span className="text-[#D4AF37]">•</span> Suited 3 of a Kind: 20:1</li>
                <li><span className="text-[#D4AF37]">•</span> 3 of a Kind: 10:1</li>
                <li><span className="text-[#D4AF37]">•</span> Straight: 3:1</li>
                <li><span className="text-[#D4AF37]">•</span> Flush: 1:1</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Match The Dealer Side Bet</h3>
              <ul className="space-y-1 text-gray-300">
                <li><span className="text-[#D4AF37]">•</span> Two Suited Matches: 15:1</li>
                <li><span className="text-[#D4AF37]">•</span> One Suited + One Non-Suited: 13:1</li>
                <li><span className="text-[#D4AF37]">•</span> Two Non-Suited Matches: 7:1</li>
                <li><span className="text-[#D4AF37]">•</span> One Suited Match: 6:1</li>
                <li><span className="text-[#D4AF37]">•</span> One Non-Suited Match: 3:1</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Perfect Pair Side Bet</h3>
              <ul className="space-y-1 text-gray-300">
                <li><span className="text-[#D4AF37]">•</span> Perfect Pair (same suit): 20:1</li>
                <li><span className="text-[#D4AF37]">•</span> Same Color Pair: 8:1</li>
                <li><span className="text-[#D4AF37]">•</span> Mixed Color Pair: 4:1</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </CasinoEnvironment>
  );
}
