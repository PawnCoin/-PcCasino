import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PokerChip, ChipStack } from '@/components/PokerChip';
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
    
    // Pay side bet wins immediately
    const sideBetWins = results.reduce((sum, r) => sum + r.win, 0);
    if (sideBetWins > 0) {
      onWin(sideBetWins);
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
      setMessage('Bust!');
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
  };

  const renderCardBack = (key?: number | string) => {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div
          key={key}
          className="playing-card rounded-lg overflow-hidden"
          style={{ 
            background: `url(${backStyle.image}) center/cover`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      );
    }
    
    return <div key={key} className="playing-card playing-card-back" />;
  };

  const renderCard = (card: Card, index: number, hidden = false) => {
    if (hidden) {
      return renderCardBack(index);
    }

    const suitSymbols: Record<string, string> = {
      hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
    };

    return (
      <div key={index} className={`playing-card ${card.isRed ? 'red' : 'black'}`}>
        <span className="text-2xl font-bold">{card.rank}</span>
        <span className="text-3xl">{suitSymbols[card.suit]}</span>
      </div>
    );
  };

  return (
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

      {/* Game Area */}
      <div className="pt-14 min-h-screen flex flex-col p-4">
        {/* Vegas Style Table */}
        <div className="flex-1 rounded-3xl border-8 border-[#5D4037] shadow-2xl relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, #2E7D32 0%, #1B5E20 40%, #0D3312 100%)' }}
        >
          {/* Felt texture */}
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
          
          <div className="absolute inset-2 border-2 border-[#8B6914]/60 rounded-2xl pointer-events-none" />

          {/* Side Bet Areas - Top */}
          {gameState === 'betting' && (
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-4">
              {/* 3 Card Poker */}
              <button
                onClick={() => addToSideBet('threeCardPoker', selectedChip)}
                className="relative p-4 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-black/40 hover:border-[#D4AF37] transition-all"
              >
                <div className="text-[#D4AF37] font-bold text-sm">3 CARD POKER</div>
                <div className="text-[10px] text-[#C0C0C0]">Min $2, Max = Ante</div>
                <div className="text-[#D4AF37] font-bold mt-1">{sideBets.threeCardPoker} $Pc</div>
                {sideBets.threeCardPoker > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(sideBets.threeCardPoker / selectedChip))} size="sm" />
                  </div>
                )}
              </button>

              {/* Match The Dealer */}
              <button
                onClick={() => addToSideBet('matchTheDealer', selectedChip)}
                className="relative p-4 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-black/40 hover:border-[#D4AF37] transition-all"
              >
                <div className="text-[#D4AF37] font-bold text-sm">MATCH THE DEALER</div>
                <div className="text-[10px] text-[#C0C0C0]">Min $2, Max = Ante</div>
                <div className="text-[#D4AF37] font-bold mt-1">{sideBets.matchTheDealer} $Pc</div>
                {sideBets.matchTheDealer > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(sideBets.matchTheDealer / selectedChip))} size="sm" />
                  </div>
                )}
              </button>

              {/* Perfect Pair */}
              <button
                onClick={() => addToSideBet('perfectPair', selectedChip)}
                className="relative p-4 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-black/40 hover:border-[#D4AF37] transition-all"
              >
                <div className="text-[#D4AF37] font-bold text-sm">PERFECT PAIR</div>
                <div className="text-[10px] text-[#C0C0C0]">Min $2, Max = Ante</div>
                <div className="text-[#D4AF37] font-bold mt-1">{sideBets.perfectPair} $Pc</div>
                {sideBets.perfectPair > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <ChipStack amount={selectedChip} count={Math.max(1, Math.floor(sideBets.perfectPair / selectedChip))} size="sm" />
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Side Bet Results */}
          {sideBetResults.length > 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2">
              {sideBetResults.map((result, i) => (
                <div key={i} className="px-3 py-1 rounded-full bg-[#D4AF37] text-black font-bold text-sm">
                  {result.name}: +{result.win} $Pc
                </div>
              ))}
            </div>
          )}

          {/* Dealer */}
          <div className="relative z-10 flex flex-col items-center justify-start pt-24">
            <div className="text-center mb-2">
              <div className="text-sm text-[#C0C0C0] mb-1 tracking-wider font-bold">DEALER</div>
              <div className="text-xl font-bold text-white bg-black/40 px-4 py-1 rounded-full">
                {showDealerCard ? calculateHandValue(dealerHand).value : '?'}
              </div>
            </div>
            
            <div className="flex gap-2">
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
          <div className="absolute bottom-36 left-0 right-0 flex justify-center gap-4 z-10">
            {playerHands.map((hand, handIndex) => {
              const handValue = calculateHandValue(hand.cards);
              return (
                <div 
                  key={handIndex} 
                  className={`flex flex-col items-center transition-all duration-300 ${
                    handIndex === currentHandIndex && gameState === 'player' ? 'scale-110' : 'opacity-70'
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    {hand.cards.map((card, i) => renderCard(card, i))}
                  </div>
                  <div className={`text-lg font-bold px-3 py-1 rounded-full ${
                    handValue.value > 21 ? 'bg-[#B71C1C] text-white' : 'bg-black/60 text-[#D4AF37]'
                  }`}>
                    {handValue.value}
                    {handValue.isSoft && ' Soft'}
                    {handValue.isBlackjack && ' ♠'}
                  </div>
                  <div className="text-[#D4AF37] text-sm font-bold mt-1">{hand.bet} $Pc</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Area */}
        <div className="bg-black/90 border-t-2 border-[#5D4037] p-4 mt-2 rounded-xl">
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
  );
}
