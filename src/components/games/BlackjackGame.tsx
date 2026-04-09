import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createDeck, shuffleDeck, calculateBlackjackValue, isBlackjack } from '@/hooks/useGameEngine';
import { PokerChip, ChipStack, ChipSelector, CasinoChipTray, formatChipLabel } from '@/components/PokerChip';
import { PcTokenLabel } from '@/components/PcTokenLabel';
import { PlayingCard } from '@/components/PlayingCard';
import { CasinoEnvironment } from './CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';
import type { Card } from '@/types';
import { useProvablyFair } from '@/hooks/useProvablyFair';
import { VerifyRoundModal } from '@/components/VerifyRoundModal';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { useTableSkin } from '@/hooks/useTableSkin';

interface BlackjackGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
  onOpenProvablyFair?: (prefill?: { serverSeed?: string; clientSeed?: string; nonce?: number }) => void;
}

const CHIP_VALUES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000, 1_000_000_000];

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

export function BlackjackGame({ balance, onBack, onBet, onWin, onAddBalance, cardBackStyle, onOpenProvablyFair }: BlackjackGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { settings } = useGlobalGame();
  const { reactions, winBursts, addReaction, triggerWinBurst, removeBurst } = useReactions(settings.celebrationsEnabled);
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
  const [tossChips, setTossChips] = useState<{ id: number; amount: number }[]>([]);
  const tossIdRef = useRef(0);

  const { round: pfRound, lastReveal: pfLastReveal, startRound: pfStartRound, dealBlackjack: pfDealBlackjack, finishBlackjack: pfFinishBlackjack, drawBlackjackCard: pfDrawBlackjackCard, resolveRound: pfResolveRound, revealRound: pfRevealRound } = useProvablyFair('blackjack');
  const [showVerify, setShowVerify] = useState(false);
  const currentPfRoundIdRef = useRef<number | null>(null);
  // actionLockRef prevents concurrent card draw requests (hit/doubledown/split/dealer)
  const actionLockRef = useRef(false);

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

    // Trigger chip toss animation
    const id = ++tossIdRef.current;
    setTossChips(prev => [...prev, { id, amount }]);
    setTimeout(() => setTossChips(prev => prev.filter(c => c.id !== id)), 800);
  };

  const clearBet = () => {
    setCurrentBet(0);
    setTableChips([]);
    setMessage('Place your bet to start');
  };

  const startRound = async () => {
    if (currentBet === 0) {
      setMessage('Place a bet first!');
      return;
    }
    if (!onBet(currentBet)) return;
    
    setResultOverlay(null);
    setShowWinRings(false);
    setTableShake(false);

    // Step 1: Commit — get server seed hash (commitment) before outcome is known
    const pfRoundData = await pfStartRound();
    if (!pfRoundData) {
      onWin(currentBet); // refund
      setMessage('Log in to play — provably fair requires authentication.');
      return;
    }
    currentPfRoundIdRef.current = pfRoundData.roundId;

    // Step 2: Deal — server returns only the initial 4 seed-derived cards (no future cards exposed).
    // Transitions round: created → dealing. Server tracks draw_index for sequential draws.
    const dealtCards = await pfDealBlackjack(pfRoundData.roundId);
    if (!dealtCards || dealtCards.length < 4) {
      onWin(currentBet); // refund — abort if deal fails (network error, not authenticated)
      setMessage('Failed to deal hand. Please try again.');
      return;
    }

    // Convert server card format {suit, value} → typed Card
    const suitMap: Record<string, Card['suit']> = {
      '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs',
    };
    const serverToCard = (sc: { suit: string; value: string }): Card => {
      const suit = suitMap[sc.suit] ?? 'spades';
      const rank = sc.value as Card['rank'];
      const isRed = suit === 'hearts' || suit === 'diamonds';
      const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
      return { suit, rank, isRed, value };
    };

    // Initial deal: cards[0]=player1, cards[1]=dealer1, cards[2]=player2, cards[3]=dealer2
    const playerCards: Card[] = [serverToCard(dealtCards[0]), serverToCard(dealtCards[2])];
    const dealerCards: Card[] = [serverToCard(dealtCards[1]), serverToCard(dealtCards[3])];
    // Subsequent draws (hits/dealer) are fetched server-side via pfDrawBlackjackCard
    setDeck([]);
    
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

  const drawNextCard = useCallback(async (): Promise<Card | null> => {
    const roundId = currentPfRoundIdRef.current;
    if (!roundId) return null;
    const suitMap: Record<string, Card['suit']> = {
      '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs',
    };
    const sc = await pfDrawBlackjackCard(roundId);
    if (!sc) return null;
    const suit = suitMap[sc.suit] ?? 'spades';
    const rank = sc.value as Card['rank'];
    const isRed = suit === 'hearts' || suit === 'diamonds';
    const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
    return { suit, rank, isRed, value };
  }, [pfDrawBlackjackCard]);

  const acquireAction = () => {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    return true;
  };
  const releaseAction = () => { actionLockRef.current = false; };

  const handleHit = async () => {
    if (!acquireAction()) return; // prevent concurrent requests
    const newCard = await drawNextCard();
    releaseAction();
    if (!newCard) return;
    
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

  const handleDoubleDown = async () => {
    if (!acquireAction()) return;
    const handBet = handBets[currentHandIndex];
    if (!onBet(handBet)) { releaseAction(); return; }
    
    setHandBets(prev => {
      const newBets = [...prev];
      newBets[currentHandIndex] = handBet * 2;
      return newBets;
    });
    
    const newCard = await drawNextCard();
    releaseAction();
    if (!newCard) return;
    
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

  const handleSplit = async () => {
    if (!acquireAction()) return;
    if (currentHand.length !== 2 || currentHand[0].value !== currentHand[1].value) { releaseAction(); return; }
    const handBet = handBets[currentHandIndex];
    if (!onBet(handBet)) { releaseAction(); return; }
    
    const newHands = [...playerHands];
    const card1 = currentHand[0];
    const card2 = currentHand[1];
    
    // Sequential server draws — each awaited in order so draw_index advances correctly
    const splitCard1 = await drawNextCard();
    const splitCard2 = await drawNextCard();
    releaseAction();
    if (!splitCard1 || !splitCard2) return;
    newHands[currentHandIndex] = [card1, splitCard1];
    newHands.splice(currentHandIndex + 1, 0, [card2, splitCard2]);
    
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
    
    const playDealer = async () => {
      const dealerValue = calculateBlackjackValue(currentDealerHand);
      
      if (dealerValue < 17) {
        if (!acquireAction()) { setTimeout(playDealer, 200); return; }
        const nextCard = await drawNextCard();
        releaseAction();
        if (!nextCard) { finishRound(false); return; }
        currentDealerHand = [...currentDealerHand, nextCard];
        setDealerHand(currentDealerHand);
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
      triggerWinBurst();
      addReaction(playerBlackjack ? '🎉' : '🤑', 'you');
    } else {
      setMessage('Dealer wins.');
      triggerBust();
    }

    if (currentPfRoundIdRef.current) {
      const roundId = currentPfRoundIdRef.current;
      (async () => {
        const finished = await pfFinishBlackjack(roundId);
        if (!finished) return;
        const resolved = await pfResolveRound(roundId);
        if (!resolved) return;
        // Retry reveal once on failure to handle transient network errors
        const revealed = await pfRevealRound(roundId);
        if (!revealed) await pfRevealRound(roundId);
      })();
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
    actionLockRef.current = false; // reset action lock for new hand
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
      return (
        <div key={index} style={{ animationDelay: `${index * 0.15}s` }} className="card-deal-3d">
          <PlayingCard hidden cardBackStyle={cardBackStyle} size="lg" />
        </div>
      );
    }
    return (
      <div key={index} style={{ animationDelay: `${index * 0.15}s` }} className="card-deal-3d card-hover-lift">
        <PlayingCard card={card} cardBackStyle={cardBackStyle} size="lg" />
      </div>
    );
  };

  return (
    <CasinoEnvironment gameType="blackjack">
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ you: 'bottom', dealer: 'top' }}
      />
      <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
        <InGameTopBar
          gameName="Blackjack"
          balance={balance}
          onBack={onBack}
          onAddBalance={onAddBalance}
          showShare
          rightSlot={
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                    <Info className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View Blackjack rules & payouts</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />

        <div className="flex-1 flex flex-col p-2 relative z-10 min-h-0">
          <div
            className={`flex-1 min-h-0 rounded-3xl wood-rail relative overflow-hidden p-3 ${tableShake ? 'bust-effect' : ''}`}
          >
            {/* $Pc watermark */}
            <TableBrand style={{ bottom: '10%', opacity: 0.09 }} />

            <div className="absolute inset-3 rounded-2xl premium-felt overflow-hidden" style={{ background: tableSkin.felt }}>
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
                        <PcTokenLabel amount={handBets[idx]} size={12} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Chip Tray (left side of table) ── */}
            <div className="absolute top-6 left-5 z-10"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.7))' }}>
              <CasinoChipTray />
            </div>

            {/* ── Diagonal Card Shoe (near dealer, right side) ── */}
            <div className="absolute top-4 right-6 z-10"
              style={{ transform: 'rotate(-18deg)', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.8))' }}>
              <svg width={48} height={68} viewBox="0 0 48 68">
                <defs>
                  <linearGradient id="bj-shoe-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2a2010" />
                    <stop offset="100%" stopColor="#0a0808" />
                  </linearGradient>
                </defs>
                <rect x={2} y={2} width={44} height={58} rx={5}
                  fill="url(#bj-shoe-g)" stroke="#D4AF37" strokeWidth={1.2} />
                <rect x={6} y={6} width={36} height={48} rx={3}
                  fill="#000820" stroke="rgba(192,192,192,0.15)" strokeWidth={0.5} />
                {[0, 1, 2, 3, 4].map(i => (
                  <rect key={i} x={7} y={8 + i * 9} width={34} height={7} rx={1}
                    fill={i % 2 === 0 ? '#e8e8e8' : '#f5f5f5'}
                    stroke="rgba(0,0,0,0.25)" strokeWidth={0.3} />
                ))}
                <text x={24} y={66} textAnchor="middle" fontSize={7}
                  fill="#D4AF37" fontWeight="700" fontFamily="Arial, sans-serif">SHOE</text>
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-start pt-6">
              <div className="relative mb-3 flex items-center gap-4">
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

            {/* ── Chip Toss Animation Overlay ── */}
            {tossChips.map(tc => (
              <div key={tc.id} className="chip-toss-fly" style={{ pointerEvents: 'none' }}>
                <PokerChip amount={tc.amount} size="md" />
              </div>
            ))}

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

          <div className="bg-black/90 border-t-2 border-[#5D4037] p-2 sm:p-3 mt-1 rounded-xl flex-shrink-0 overflow-y-auto" style={{ maxHeight: '52vh' }}>
            {gameState === 'betting' && (
              <div className="max-w-4xl mx-auto">
                {/* Balance + Get More row */}
                <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <div>
                    <div className="text-[9px] text-gray-600 tracking-widest font-bold uppercase">Balance</div>
                    <div className="text-base font-bold"><PcTokenLabel amount={formatChipLabel(balance)} size={16} /></div>
                  </div>
                  {onAddBalance && (
                    <button onClick={() => onAddBalance(10_000)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-green-400" style={{ border: '1px solid rgba(67,160,71,0.5)', background: 'rgba(67,160,71,0.12)' }}>
                      + Get $Pc
                    </button>
                  )}
                </div>
                <div className="mb-4">
                  <div className="text-center text-[#C0C0C0] text-xs mb-2 tracking-wider">SELECT CHIP VALUE</div>
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelect={setSelectedChip}
                    balance={balance}
                    compact
                  />
                </div>

                <div className="flex items-center justify-center gap-4 sm:gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-[#C0C0C0] text-xs mb-1">CURRENT BET</div>
                    <div className="text-xl sm:text-3xl font-bold"><PcTokenLabel amount={currentBet} size={24} /></div>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[9px] text-[#C0C0C0]/60 tracking-widest uppercase">Tap or Click</div>
                    <button
                      onClick={() => addChipToBet(selectedChip)}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const amt = parseInt(e.dataTransfer.getData('chip-amount'), 10);
                        if (amt > 0) addChipToBet(amt);
                      }}
                      className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-dashed border-[#D4AF37]/60 hover:border-[#D4AF37] active:border-[#D4AF37] transition-all bg-black/50 flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.2)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)]"
                    >
                      {tableChips.length > 0 ? (
                        <div className="relative w-24 h-24 flex flex-wrap items-center justify-center gap-0.5">
                          {tableChips.map((chip, i) => (
                            <div key={i} className="chip-land" style={{
                              animationDelay: `${i * 0.05}s`,
                              zIndex: tableChips.length - i,
                            }}>
                              <PokerChip amount={chip.amount} size="sm" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[#D4AF37]/40 text-2xl">⬤</span>
                          <span className="text-[#D4AF37]/50 text-[10px] tracking-widest">BET HERE</span>
                        </div>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={clearBet}
                    disabled={currentBet === 0}
                    className="px-4 py-2 rounded-lg bg-[#B71C1C]/80 hover:bg-[#B71C1C] text-white text-sm font-bold disabled:opacity-30"
                  >
                    CLEAR
                  </button>
                </div>

                <div className="flex justify-center gap-1.5 sm:gap-2 mb-4 flex-wrap">
                  {[1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedChip(amount);
                        addChipToBet(amount);
                      }}
                      disabled={currentBet + amount > balance}
                      className="px-2 sm:px-3 py-2 rounded-lg bg-[#5D4037]/50 hover:bg-[#5D4037] active:bg-[#5D4037] text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/30 disabled:opacity-30 transition-all min-h-[44px] min-w-[44px]"
                    >
                      +{formatChipLabel(amount)}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={startRound}
                  className="w-full btn-primary py-4 sm:py-5 text-lg sm:text-xl font-bold min-h-[56px]"
                  disabled={currentBet === 0 || currentBet > balance}
                >
                  DEAL
                </Button>
              </div>
            )}

            {gameState === 'playing' && (
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-3">
                  <span className="text-[#C0C0C0] text-sm">Hand {currentHandIndex + 1} of {playerHands.length}</span>
                  <span className="mx-2 text-[#D4AF37]">|</span>
                  <span className="font-bold text-sm"><PcTokenLabel amount={handBets[currentHandIndex]} size={14} /></span>
                </div>
                
                <div className="flex justify-end mb-1">
                  <EmojiReactionPicker onReact={(emoji) => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-3">
                  <Button
                    onClick={handleHit}
                    className="py-4 sm:px-10 sm:py-5 rounded-xl font-bold text-base bg-gradient-to-b from-[#1E88E5] to-[#1565C0] hover:from-[#42A5F5] hover:to-[#1E88E5] border-b-4 border-[#0D47A1] active:border-b-0 active:translate-y-1 min-h-[56px]"
                  >
                    HIT
                  </Button>
                  <Button
                    onClick={handleStand}
                    className="py-4 sm:px-10 sm:py-5 rounded-xl font-bold text-base bg-gradient-to-b from-[#B71C1C] to-[#8B0000] hover:from-[#EF5350] hover:to-[#B71C1C] border-b-4 border-[#5c0000] active:border-b-0 active:translate-y-1 min-h-[56px]"
                  >
                    STAND
                  </Button>
                  <Button
                    onClick={handleDoubleDown}
                    disabled={currentHand.length !== 2 || handBets[currentHandIndex] * 2 > balance}
                    className="py-4 sm:px-8 sm:py-5 rounded-xl font-bold text-base bg-gradient-to-b from-[#43A047] to-[#2E7D32] hover:from-[#66BB6A] hover:to-[#43A047] border-b-4 border-[#1B5E20] active:border-b-0 active:translate-y-1 disabled:opacity-40 min-h-[56px]"
                  >
                    DOUBLE
                  </Button>
                  <Button
                    onClick={handleSplit}
                    disabled={currentHand.length !== 2 || currentHand[0].value !== currentHand[1].value || handBets[currentHandIndex] * 2 > balance}
                    className="py-4 sm:px-8 sm:py-5 rounded-xl font-bold text-base bg-gradient-to-b from-[#D4AF37] to-[#B8860B] hover:from-[#FFD700] hover:to-[#D4AF37] text-black border-b-4 border-[#8B6914] active:border-b-0 active:translate-y-1 disabled:opacity-40 min-h-[56px]"
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
                  className="btn-primary px-10 sm:px-16 py-4 sm:py-5 text-lg sm:text-xl font-bold min-h-[56px]"
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

        {/* Provably fair: show server seed hash commitment during the hand, verify button when finished */}
        {pfRound && (
          <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div
              title={pfRound.serverSeedHash}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(74,222,128,0.7)', fontFamily: 'monospace' }}
            >
              <Shield style={{ width: 11, height: 11, flexShrink: 0 }} />
              {pfRound.serverSeedHash.slice(0, 16)}…
            </div>
            {gameState === 'finished' && (
              <button
                onClick={() => setShowVerify(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Shield style={{ width: 12, height: 12 }} />
                Verify this round
              </button>
            )}
          </div>
        )}
        {!pfRound && pfLastReveal && gameState === 'finished' && (
          <button
            onClick={() => setShowVerify(true)}
            style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 50, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Shield style={{ width: 12, height: 12 }} />
            Verify last round
          </button>
        )}

        <VerifyRoundModal
          isOpen={showVerify}
          onClose={() => setShowVerify(false)}
          round={pfRound}
          lastReveal={pfLastReveal}
          game="blackjack"
          onOpenProvablyFairPage={prefill => {
            setShowVerify(false);
            if (onOpenProvablyFair) onOpenProvablyFair(prefill);
            else onBack();
          }}
        />
      </div>
    </CasinoEnvironment>
  );
}
