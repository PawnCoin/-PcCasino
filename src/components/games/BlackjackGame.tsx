import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createDeck, shuffleDeck, calculateBlackjackValue, isBlackjack } from '@/hooks/useGameEngine';
import { PokerChip, ChipStack } from '@/components/PokerChip';
import { CasinoEnvironment } from './CasinoEnvironment';
import type { Card } from '@/types';

interface BlackjackGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 500, 1000];

const blackjackRules = {
  objective: 'Get a hand value closer to 21 than the dealer without going over.',
  cardValues: [
    'Number cards (2-10): Face value',
    'Face cards (J, Q, K): 10 points',
    'Ace: 11 or 1 point (soft hand)',
  ],
  gameplay: [
    'Place your bet using $Pc chips',
    'Dealer deals 2 cards to each player and themselves (1 face up)',
    'Player decisions: Hit, Stand, Double Down, Split, or Surrender',
    'Dealer must hit on 16 or less, stand on 17 or more',
    'Win by having higher value without busting, or dealer busts',
  ],
  actions: [
    'Hit: Take another card',
    'Stand: Keep current hand',
    'Double Down: Double bet, take one more card',
    'Split: Split pair into two hands (double bet)',
    'Surrender: Forfeit half bet and end hand',
  ],
  payouts: [
    'Blackjack (Ace + 10-value): 3:2 payout',
    'Regular win: 1:1 payout',
    'Insurance (dealer shows Ace): 2:1 if dealer has blackjack',
  ],
  variations: [
    'European: Dealer only takes one card initially',
    'American: Dealer takes two cards, peeks for blackjack',
    'Vegas Strip: Dealer stands on soft 17',
    'Atlantic City: Late surrender allowed',
  ],
};

export function BlackjackGame({ balance, onBack, onBet, onWin, cardBackStyle }: BlackjackGameProps) {
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer' | 'finished'>('betting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<Card[][]>([[]]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [tableChips, setTableChips] = useState<{ amount: number; count: number }[]>([]);
  const [selectedChip, setSelectedChip] = useState(5);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('Place your bet to start');
  const [showDealerCard, setShowDealerCard] = useState(false);
  const [handBets, setHandBets] = useState<number[]>([0]);
  const [resultOverlay, setResultOverlay] = useState<'win' | 'bust' | 'blackjack' | null>(null);
  const [showWinRings, setShowWinRings] = useState(false);
  const [tableShake, setTableShake] = useState(false);

  const currentHand = playerHands[currentHandIndex];

  const initDeck = useCallback(() => {
    setDeck(shuffleDeck(createDeck()));
  }, []);

  const addChipToBet = (amount: number) => {
    if (currentBet + amount > balance) {
      setMessage('Insufficient balance!');
      setTimeout(() => setMessage('Place your bet to start'), 1500);
      return;
    }
    
    setCurrentBet(prev => prev + amount);
    setTableChips(prev => {
      const existing = prev.find(c => c.amount === amount);
      if (existing) {
        return prev.map(c => c.amount === amount ? { ...c, count: c.count + 1 } : c);
      }
      return [...prev, { amount, count: 1 }];
    });
  };

  const clearBet = () => {
    setCurrentBet(0);
    setTableChips([]);
    setMessage('Place your bet to start');
  };

  const startRound = () => {
    if (currentBet === 0) {
      setMessage('Place a bet first!');
      return;
    }
    if (!onBet(currentBet)) return;
    
    setResultOverlay(null);
    setShowWinRings(false);
    setTableShake(false);

    const newDeck = deck.length < 20 ? shuffleDeck(createDeck()) : [...deck];
    
    const playerCards = [newDeck[0], newDeck[2]];
    const dealerCards = [newDeck[1], newDeck[3]];
    
    setDeck(newDeck.slice(4));
    setPlayerHands([playerCards]);
    setDealerHand(dealerCards);
    setGameState('playing');
    setShowDealerCard(false);
    setCurrentHandIndex(0);
    setHandBets([currentBet]);
    
    if (isBlackjack(playerCards)) {
      setMessage('Blackjack!');
      setTimeout(() => finishRound(true), 1500);
    } else {
      setMessage('Your turn. Hit or Stand?');
    }
  };

  const handleHit = () => {
    const newCard = deck[0];
    setDeck(prev => prev.slice(1));
    
    const newHands = [...playerHands];
    newHands[currentHandIndex] = [...currentHand, newCard];
    setPlayerHands(newHands);
    
    const newValue = calculateBlackjackValue(newHands[currentHandIndex]);
    
    if (newValue > 21) {
      setMessage('Bust!');
      triggerBust();
      if (currentHandIndex < playerHands.length - 1) {
        setCurrentHandIndex(prev => prev + 1);
      } else {
        setTimeout(() => dealerTurn(), 1000);
      }
    }
  };

  const handleStand = () => {
    if (currentHandIndex < playerHands.length - 1) {
      setCurrentHandIndex(prev => prev + 1);
      setMessage(`Hand ${currentHandIndex + 2}. Hit or Stand?`);
    } else {
      dealerTurn();
    }
  };

  const handleDoubleDown = () => {
    const handBet = handBets[currentHandIndex];
    if (!onBet(handBet)) return;
    
    setHandBets(prev => {
      const newBets = [...prev];
      newBets[currentHandIndex] = handBet * 2;
      return newBets;
    });
    
    const newCard = deck[0];
    setDeck(prev => prev.slice(1));
    
    const newHands = [...playerHands];
    newHands[currentHandIndex] = [...currentHand, newCard];
    setPlayerHands(newHands);
    
    setTimeout(() => {
      if (currentHandIndex < playerHands.length - 1) {
        setCurrentHandIndex(prev => prev + 1);
      } else {
        dealerTurn();
      }
    }, 1000);
  };

  const handleSplit = () => {
    if (currentHand.length !== 2 || currentHand[0].value !== currentHand[1].value) return;
    const handBet = handBets[currentHandIndex];
    if (!onBet(handBet)) return;
    
    const newHands = [...playerHands];
    const card1 = currentHand[0];
    const card2 = currentHand[1];
    
    newHands[currentHandIndex] = [card1, deck[0]];
    newHands.splice(currentHandIndex + 1, 0, [card2, deck[1]]);
    
    setDeck(prev => prev.slice(2));
    setPlayerHands(newHands);
    setHandBets(prev => {
      const newBets = [...prev];
      newBets.splice(currentHandIndex + 1, 0, handBet);
      return newBets;
    });
    setMessage('Hand split. Playing first hand.');
  };

  const dealerTurn = () => {
    setGameState('dealer');
    setShowDealerCard(true);
    setMessage('Dealer\'s turn...');
    
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];
    
    const playDealer = () => {
      const dealerValue = calculateBlackjackValue(currentDealerHand);
      
      if (dealerValue < 17) {
        currentDealerHand = [...currentDealerHand, currentDeck[0]];
        currentDeck = currentDeck.slice(1);
        setDealerHand(currentDealerHand);
        setDeck(currentDeck);
        setTimeout(playDealer, 800);
      } else {
        finishRound(false);
      }
    };
    
    setTimeout(playDealer, 1000);
  };

  const triggerWin = (isBlackjackWin: boolean) => {
    setResultOverlay(isBlackjackWin ? 'blackjack' : 'win');
    setShowWinRings(true);
    setTimeout(() => {
      setShowWinRings(false);
    }, 2000);
  };

  const triggerBust = () => {
    setResultOverlay('bust');
    setTableShake(true);
    setTimeout(() => {
      setTableShake(false);
    }, 600);
  };

  const finishRound = (playerBlackjack: boolean) => {
    setGameState('finished');
    setShowDealerCard(true);
    
    const dealerValue = calculateBlackjackValue(dealerHand);
    const dealerBust = dealerValue > 21;
    const dealerBlackjack = isBlackjack(dealerHand);
    
    let totalWin = 0;
    
    playerHands.forEach((hand, idx) => {
      const handValue = calculateBlackjackValue(hand);
      const handBust = handValue > 21;
      const bet = handBets[idx];
      
      if (handBust) {
        // Lose
      } else if (playerBlackjack && !dealerBlackjack) {
        totalWin += bet * 2.5;
      } else if (dealerBust || handValue > dealerValue) {
        totalWin += bet * 2;
      } else if (handValue === dealerValue) {
        totalWin += bet;
      }
    });
    
    if (totalWin > 0) {
      onWin(totalWin);
      setMessage(`You win! +${totalWin.toFixed(2)} $Pc`);
      triggerWin(playerBlackjack);
    } else {
      setMessage('Dealer wins.');
      triggerBust();
    }
  };

  const resetGame = () => {
    setGameState('betting');
    setCurrentBet(0);
    setTableChips([]);
    setHandBets([0]);
    setMessage('Place your bet to start');
    setResultOverlay(null);
    setShowWinRings(false);
    setTableShake(false);
  };

  useEffect(() => {
    initDeck();
  }, [initDeck]);

  const renderCardBack = (key?: number | string) => {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div
          key={key}
          className="premium-card card-hover-lift rounded-lg overflow-hidden"
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
      <div key={key} className="premium-card card-hover-lift rounded-lg overflow-hidden"
        style={{
          width: '90px',
          height: '126px',
          background: 'linear-gradient(135deg, #1a237e 0%, #0d1642 100%)',
          border: '2px solid rgba(192, 192, 192, 0.4)',
        }}
      >
        <div className="absolute inset-[4px] rounded"
          style={{
            background: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(212,175,55,0.15) 5px, rgba(212,175,55,0.15) 10px)`,
            border: '1px solid rgba(212,175,55,0.3)',
          }}
        />
      </div>
    );
  };

  const renderCard = (card: Card, index: number, hidden = false) => {
    if (hidden) {
      return renderCardBack(index);
    }

    const suitSymbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    };

    return (
      <div
        key={index}
        className={`premium-card card-hover-lift card-deal-3d relative flex flex-col items-center justify-center rounded-lg ${card.isRed ? 'text-red-700' : 'text-gray-900'}`}
        style={{
          width: '90px',
          height: '126px',
          animationDelay: `${index * 0.15}s`,
        }}
      >
        <span className="text-2xl font-bold leading-none">{card.rank}</span>
        <span className="text-3xl leading-none">{suitSymbols[card.suit]}</span>
      </div>
    );
  };

  return (
    <CasinoEnvironment gameType="blackjack">
      <div className="min-h-screen bg-[#0a0a0a]">
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-casino font-bold text-[#D4AF37]">BLACKJACK</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Return to game lobby</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center gap-4">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-4 py-1 rounded-full balance-display cursor-pointer hover:scale-105 transition-transform">
                      <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5" />
                      <span className={`font-bold text-[#D4AF37] ${resultOverlay === 'win' || resultOverlay === 'blackjack' ? 'balance-roll' : ''}`}>
                        {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400">$Pc</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your current $Pc balance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isMuted ? 'Unmute game sounds' : 'Mute game sounds'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                      <Info className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Blackjack rules & payouts</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </nav>

        <div className="pt-14 min-h-screen flex flex-col p-4 relative z-10">
          <div
            className={`flex-1 rounded-3xl wood-rail relative overflow-hidden p-3 ${tableShake ? 'bust-effect' : ''}`}
          >
            <div className="absolute inset-3 rounded-2xl premium-felt overflow-hidden">
              <div className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              />
            </div>

            <div className="absolute inset-5 border-2 border-[#D4AF37]/30 rounded-2xl pointer-events-none z-[2]"
              style={{
                boxShadow: 'inset 0 0 20px rgba(212,175,55,0.08)',
              }}
            />

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none z-[3]"
              style={{
                background: 'conic-gradient(from 180deg at 50% 0%, transparent 25%, rgba(212,175,55,0.08) 40%, rgba(212,175,55,0.18) 50%, rgba(212,175,55,0.08) 60%, transparent 75%)',
                filter: 'blur(6px)',
              }}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[2]">
              <div className="absolute top-8 w-64 h-20 border-2 border-[#D4AF37]/20 rounded-full" />
              
              <div className="absolute top-32 w-full flex justify-center">
                <div className="text-[#D4AF37]/30 text-xs tracking-[0.5em] uppercase">Insurance Pays 2 to 1</div>
              </div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                <img src="/logos/pc-logo.png" alt="$Pc" className="w-32 h-32" />
              </div>
              
              <div className="absolute bottom-24 flex gap-8">
                {playerHands.map((_, idx) => (
                  <div key={idx} className="relative">
                    {(idx === currentHandIndex && gameState === 'playing') && (
                      <div className="absolute -inset-2 rounded-xl animate-pulse pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.25) 0%, transparent 70%)',
                          filter: 'blur(6px)',
                        }}
                      />
                    )}
                    <div className={`w-24 h-16 border-2 border-dashed rounded-lg ${
                      idx === currentHandIndex && gameState === 'playing' 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                        : 'border-[#D4AF37]/30'
                    }`}>
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-[#C0C0C0]">
                        {playerHands.length > 1 ? `HAND ${idx + 1}` : 'YOUR BET'}
                      </div>
                      {handBets[idx] > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 chip-bounce">
                          <ChipStack amount={Math.min(...CHIP_VALUES.filter(v => v >= handBets[idx] / 5))} count={3} size="sm" />
                        </div>
                      )}
                    </div>
                    {handBets[idx] > 0 && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[#D4AF37] text-xs font-bold">
                        {handBets[idx]} $Pc
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-start pt-6">
              <div className="relative mb-3">
                <div className="px-6 py-1 rounded-lg border border-[#D4AF37]/50"
                  style={{
                    background: 'linear-gradient(180deg, #2a1f0e 0%, #1a1208 100%)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.2)',
                  }}
                >
                  <div className="text-sm text-[#D4AF37] tracking-[0.3em] font-bold font-casino">DEALER</div>
                </div>
              </div>
              <div className="text-center mb-2">
                <div className="text-xl font-bold text-white bg-black/40 px-4 py-1 rounded-full">
                  {showDealerCard ? calculateBlackjackValue(dealerHand) : '?'}
                </div>
              </div>
              
              <div className="flex gap-3">
                {dealerHand.map((card, i) => renderCard(card, i, i === 1 && !showDealerCard))}
              </div>
            </div>

            <div className="absolute top-6 right-6 z-10"
              style={{
                width: '60px',
                height: '40px',
                background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                borderRadius: '6px 6px 2px 2px',
                border: '2px solid rgba(80,80,80,0.5)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.7), inset 0 -2px 4px rgba(0,0,0,0.5)',
              }}
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50px] h-[8px] rounded-b"
                style={{
                  background: 'linear-gradient(180deg, #1a237e 0%, #0d1642 100%)',
                  border: '1px solid rgba(192,192,192,0.3)',
                }}
              />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-500 tracking-wider">SHOE</div>
            </div>

            {message && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="px-8 py-4 rounded-2xl bg-black/80 text-xl font-bold text-white border-2 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                  {message}
                </div>
              </div>
            )}

            {resultOverlay === 'win' && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                <div className="absolute inset-0 win-celebration"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(46,125,50,0.4) 0%, transparent 70%)' }}
                />
                {showWinRings && (
                  <>
                    <div className="win-ring" style={{ width: '100px', height: '100px', animationDelay: '0s' }} />
                    <div className="win-ring" style={{ width: '100px', height: '100px', animationDelay: '0.2s' }} />
                    <div className="win-ring" style={{ width: '100px', height: '100px', animationDelay: '0.4s' }} />
                  </>
                )}
                <div className="text-slam text-6xl font-casino font-bold text-[#D4AF37]"
                  style={{ textShadow: '0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4), 0 4px 8px rgba(0,0,0,0.8)' }}
                >
                  WIN!
                </div>
              </div>
            )}

            {resultOverlay === 'blackjack' && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                <div className="absolute inset-0 win-celebration"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.3) 0%, transparent 70%)' }}
                />
                {showWinRings && (
                  <>
                    <div className="win-ring" style={{ width: '120px', height: '120px', animationDelay: '0s' }} />
                    <div className="win-ring" style={{ width: '120px', height: '120px', animationDelay: '0.15s' }} />
                    <div className="win-ring" style={{ width: '120px', height: '120px', animationDelay: '0.3s' }} />
                    <div className="win-ring" style={{ width: '120px', height: '120px', animationDelay: '0.45s' }} />
                  </>
                )}
                <div className="text-slam text-5xl font-casino font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFF8DC 50%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
                    textShadow: 'none',
                  }}
                >
                  BLACKJACK!
                </div>
              </div>
            )}

            {resultOverlay === 'bust' && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                <div className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(183,28,28,0.35) 0%, transparent 70%)',
                    animation: 'win-celebration-flash 0.8s ease-out forwards',
                  }}
                />
                <div className="text-slam text-6xl font-casino font-bold text-[#B71C1C]"
                  style={{ textShadow: '0 0 30px rgba(183,28,28,0.8), 0 4px 8px rgba(0,0,0,0.8)' }}
                >
                  BUST
                </div>
              </div>
            )}

            <div className="absolute bottom-36 left-0 right-0 flex justify-center gap-8 z-10">
              {playerHands.map((hand, handIndex) => (
                <div 
                  key={handIndex} 
                  className={`flex flex-col items-center transition-all duration-300 ${
                    handIndex === currentHandIndex && gameState === 'playing' ? 'scale-110' : 'opacity-70'
                  }`}
                >
                  <div className="flex gap-2 mb-2">
                    {hand.map((card, i) => renderCard(card, i))}
                  </div>
                  <div className={`text-lg font-bold px-3 py-1 rounded-full ${
                    calculateBlackjackValue(hand) > 21 
                      ? 'bg-[#B71C1C] text-white' 
                      : 'bg-black/60 text-[#D4AF37]'
                  }`}>
                    {calculateBlackjackValue(hand)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/90 border-t-2 border-[#5D4037] p-4 mt-2 rounded-xl">
            {gameState === 'betting' && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                  <div className="text-center text-[#C0C0C0] text-sm mb-2">SELECT CHIP VALUE</div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {CHIP_VALUES.map(amount => (
                      <div key={amount} className="bj-chip-sheen rounded-full premium-chip">
                        <PokerChip
                          amount={amount}
                          size="md"
                          selected={selectedChip === amount}
                          onClick={() => setSelectedChip(amount)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-[#C0C0C0] text-xs mb-1">CURRENT BET</div>
                    <div className="text-3xl font-bold text-[#D4AF37]">{currentBet} $Pc</div>
                  </div>

                  <button
                    onClick={() => addChipToBet(selectedChip)}
                    className="relative w-28 h-28 rounded-full border-4 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all bg-black/40 flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.2)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)]"
                  >
                    {tableChips.length > 0 ? (
                      <div className="relative">
                        {tableChips.map((chip, i) => (
                          <div key={i} className="absolute chip-bounce" style={{ 
                            transform: `translate(${Math.sin(i * 0.7) * 6}px, ${-i * 5}px) rotate(${i * 15}deg)`,
                            zIndex: tableChips.length - i,
                            animationDelay: `${i * 0.1}s`,
                          }}>
                            <ChipStack amount={chip.amount} count={chip.count} size="sm" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#D4AF37]/50 text-sm">CLICK TO BET</span>
                    )}
                  </button>

                  <button
                    onClick={clearBet}
                    disabled={currentBet === 0}
                    className="px-4 py-2 rounded-lg bg-[#B71C1C]/80 hover:bg-[#B71C1C] text-white text-sm font-bold disabled:opacity-30"
                  >
                    CLEAR
                  </button>
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  {[10, 25, 50, 100, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedChip(amount);
                        addChipToBet(amount);
                      }}
                      disabled={currentBet + amount > balance}
                      className="px-4 py-2 rounded-lg bg-[#5D4037]/50 hover:bg-[#5D4037] text-[#D4AF37] text-sm font-medium border border-[#D4AF37]/30 disabled:opacity-30"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={startRound}
                  className="w-full btn-primary py-5 text-xl font-bold"
                  disabled={currentBet === 0 || currentBet > balance}
                >
                  DEAL
                </Button>
              </div>
            )}

            {gameState === 'playing' && (
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-4">
                  <span className="text-[#C0C0C0]">Hand {currentHandIndex + 1} of {playerHands.length}</span>
                  <span className="mx-4 text-[#D4AF37]">|</span>
                  <span className="text-[#D4AF37] font-bold">Bet: {handBets[currentHandIndex]} $Pc</span>
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
                    disabled={currentHand.length !== 2 || handBets[currentHandIndex] * 2 > balance}
                    className="px-8 py-5 rounded-xl font-bold bg-gradient-to-b from-[#43A047] to-[#2E7D32] hover:from-[#66BB6A] hover:to-[#43A047] border-b-4 border-[#1B5E20] active:border-b-0 active:translate-y-1 disabled:opacity-40"
                  >
                    DOUBLE
                  </Button>
                  <Button
                    onClick={handleSplit}
                    disabled={currentHand.length !== 2 || currentHand[0].value !== currentHand[1].value || handBets[currentHandIndex] * 2 > balance}
                    className="px-8 py-5 rounded-xl font-bold bg-gradient-to-b from-[#D4AF37] to-[#B8860B] hover:from-[#FFD700] hover:to-[#D4AF37] text-black border-b-4 border-[#8B6914] active:border-b-0 active:translate-y-1 disabled:opacity-40"
                  >
                    SPLIT
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

        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-2xl text-gradient-gold">
                Blackjack Rules
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Objective</h3>
                <p className="text-gray-300">{blackjackRules.objective}</p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Card Values</h3>
                <ul className="space-y-1 text-gray-300">
                  {blackjackRules.cardValues.map((value, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37]">•</span>
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Gameplay</h3>
                <ul className="space-y-1 text-gray-300">
                  {blackjackRules.gameplay.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Player Actions</h3>
                <ul className="space-y-1 text-gray-300">
                  {blackjackRules.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37]">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Payouts</h3>
                <ul className="space-y-1 text-gray-300">
                  {blackjackRules.payouts.map((payout, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37]">•</span>
                      {payout}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CasinoEnvironment>
  );
}
