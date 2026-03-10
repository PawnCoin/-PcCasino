import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createDeck, shuffleDeck, evaluatePokerHand } from '@/hooks/useGameEngine';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { usePokerVoice } from '@/hooks/useGameVoice';
import { PokerChip, ChipStack } from '@/components/PokerChip';
import { PokerHandAnalyzer } from '@/components/PokerHandAnalyzer';
import { PlayingCard } from '@/components/PlayingCard';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import type { Card } from '@/types';

interface PokerGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

const CHIP_VALUES = [5, 10, 25, 50, 100, 500];

const handRankings: Record<string, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_of_a_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_of_a_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  pair: 'Pair',
  high_card: 'High Card',
};

// Animated chip component
function AnimatedChipFly({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Start from chip selection area (bottom center)
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 100;
    // End at pot area (center of table)
    const endX = window.innerWidth / 2;
    const endY = window.innerHeight / 2 - 50;

    setPosition({ x: startX, y: startY });

    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setPosition({
        x: startX + (endX - startX) * easeOut,
        y: startY + (endY - startY) * easeOut,
      });

      if (progress < 0.5) {
        setScale(1 + Math.sin(progress * Math.PI) * 0.3);
      } else {
        setScale(1);
      }

      if (progress >= 0.9) {
        setOpacity(1 - (progress - 0.9) * 10);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  const chipColors: Record<number, string> = {
    5: 'from-red-500 to-red-700',
    10: 'from-blue-500 to-blue-700',
    25: 'from-green-500 to-green-700',
    50: 'from-orange-500 to-orange-700',
    100: 'from-gray-800 to-black',
    500: 'from-[#D4AF37] to-[#B8860B]',
  };

  return (
    <div
      className={`fixed z-50 w-12 h-12 rounded-full bg-gradient-to-br ${chipColors[amount] || chipColors[5]} border-2 border-white/30 flex flex-col items-center justify-center pointer-events-none`}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
      }}
    >
      <div className="absolute inset-2 rounded-full border border-dashed border-white/40" />
      <span className="text-[7px] font-bold text-white/80">$Pc</span>
      <span className="text-[9px] font-bold text-white">{amount}</span>
      <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/30" />
    </div>
  );
}

export function PokerGame({ balance, onBack, onBet, onWin, cardBackStyle }: PokerGameProps) {
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [playerBet, setPlayerBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState(25);
  const [showRules, setShowRules] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(true);
  const [showVoice, setShowVoice] = useState(true);
  const [message, setMessage] = useState('Welcome to Texas Hold\'em!');
  const [playerChips, setPlayerChips] = useState<{ amount: number; count: number }[]>([]);
  const [flyingChips, setFlyingChips] = useState<number[]>([]);
  const [opponents, setOpponents] = useState([
    { id: 1, name: 'Player 2', balance: 2500, bet: 0, cards: 2, active: true },
    { id: 2, name: 'Player 3', balance: 1800, bet: 0, cards: 2, active: true },
    { id: 3, name: 'Player 4', balance: 3200, bet: 0, cards: 2, active: true },
  ]);

  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { announceEvent, stop, isSupported: voiceSupported } = usePokerVoice();
  const chipAreaRef = useRef<HTMLDivElement>(null);

  // Start new hand
  const startNewHand = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[1]];
    
    const newOpponents = opponents.map((opp) => ({
      ...opp,
      bet: 0,
      active: true,
    }));
    
    setDeck(newDeck.slice(8));
    setPlayerHand(playerCards);
    setCommunityCards([]);
    setPot(60);
    setCurrentBet(20);
    setPlayerBet(20);
    setPlayerChips([{ amount: 20, count: 1 }]);
    setOpponents(newOpponents.map(o => ({ ...o, bet: 20 })));
    setGamePhase('preflop');
    setMessage('Pre-flop: Your turn. Call, raise, or fold?');
    
    if (showVoice) {
      announceEvent('New hand. Pre-flop betting.');
    }
  }, [opponents, showVoice, announceEvent]);

  // Deal community cards
  const dealCommunity = useCallback((count: number) => {
    const newCards = deck.slice(0, count);
    setCommunityCards(prev => [...prev, ...newCards]);
    setDeck(prev => prev.slice(count));
  }, [deck]);

  // Animate chip flying
  const animateChip = (amount: number) => {
    setFlyingChips(prev => [...prev, amount]);
    playSound('chip');
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(a => a !== amount));
    }, 500);
  };

  // Place bet with chips
  const placeBet = (amount: number) => {
    if (!onBet(amount)) {
      setMessage('Insufficient balance!');
      playSound('error');
      return false;
    }
    
    animateChip(amount);
    
    const existingChip = playerChips.find(c => c.amount === amount);
    if (existingChip) {
      setPlayerChips(playerChips.map(c => 
        c.amount === amount ? { ...c, count: c.count + 1 } : c
      ));
    } else {
      setPlayerChips([...playerChips, { amount, count: 1 }]);
    }
    
    setPot(prev => prev + amount);
    setPlayerBet(prev => prev + amount);
    return true;
  };

  // Player actions
  const handleFold = () => {
    setMessage('You folded. Starting new hand...');
    playSound('clear');
    if (showVoice) announceEvent('You folded.');
    setPlayerChips([]);
    setTimeout(startNewHand, 2000);
  };

  const handleCheck = () => {
    setMessage('You checked.');
    playSound('click');
    if (showVoice) announceEvent('You checked.');
    advancePhase();
  };

  const handleCall = () => {
    const callAmount = currentBet - playerBet;
    if (placeBet(callAmount)) {
      setMessage(`You called ${callAmount} $Pc`);
      if (showVoice) announceEvent(`You called ${callAmount}.`);
      advancePhase();
    }
  };

  const handleRaise = () => {
    const raiseAmount = selectedChip;
    const totalNeeded = (currentBet - playerBet) + raiseAmount;
    if (placeBet(totalNeeded)) {
      setCurrentBet(playerBet + raiseAmount);
      setMessage(`You raised to ${playerBet + raiseAmount} $Pc`);
      if (showVoice) announceEvent(`You raised to ${playerBet + raiseAmount}.`);
      advancePhase();
    }
  };

  const handleAllIn = () => {
    const allInAmount = balance;
    if (placeBet(allInAmount)) {
      setCurrentBet(playerBet);
      setMessage('ALL IN!');
      playSound('win');
      if (showVoice) announceEvent('All in!');
      advancePhase();
    }
  };

  const advancePhase = () => {
    setTimeout(() => {
      switch (gamePhase) {
        case 'preflop':
          dealCommunity(3);
          setGamePhase('flop');
          setCurrentBet(0);
          setPlayerBet(0);
          setPlayerChips([]);
          setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setMessage('The Flop. Check or bet?');
          if (showVoice) announceEvent('The flop.');
          break;
        case 'flop':
          dealCommunity(1);
          setGamePhase('turn');
          setCurrentBet(0);
          setPlayerBet(0);
          setPlayerChips([]);
          setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setMessage('The Turn. Check or bet?');
          if (showVoice) announceEvent('The turn.');
          break;
        case 'turn':
          dealCommunity(1);
          setGamePhase('river');
          setCurrentBet(0);
          setPlayerBet(0);
          setPlayerChips([]);
          setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setMessage('The River. Final betting round.');
          if (showVoice) announceEvent('The river.');
          break;
        case 'river':
          setGamePhase('showdown');
          resolveHand();
          break;
      }
    }, 500);
  };

  const resolveHand = () => {
    const allCards = [...playerHand, ...communityCards];
    const result = evaluatePokerHand(allCards);
    
    const playerWins = Math.random() > 0.6;
    
    if (playerWins) {
      const winAmount = pot;
      onWin(winAmount);
      setMessage(`WINNER! ${handRankings[result.hand]} - You won ${winAmount} $Pc!`);
      playSound('win');
      if (showVoice) announceEvent(`Winner! You won ${winAmount} dollars with ${handRankings[result.hand]}.`);
    } else {
      setMessage(`Opponent wins. You had ${handRankings[result.hand]}`);
      playSound('lose');
      if (showVoice) announceEvent(`Opponent wins. You had ${handRankings[result.hand]}.`);
    }
    
    setTimeout(() => {
      setPlayerChips([]);
      startNewHand();
    }, 4000);
  };

  // Clear current bet
  const clearBet = () => {
    const total = playerChips.reduce((sum, c) => sum + c.amount * c.count, 0);
    if (total > 0) {
      onWin(total);
      setPlayerChips([]);
      setPlayerBet(0);
      setMessage('Bet cleared');
      playSound('clear');
    }
  };

  useEffect(() => {
    startNewHand();
    return () => {
      stop();
    };
  }, []);



  const getPhaseLabel = () => {
    switch (gamePhase) {
      case 'preflop': return 'PRE-FLOP';
      case 'flop': return 'THE FLOP';
      case 'turn': return 'THE TURN';
      case 'river': return 'THE RIVER';
      case 'showdown': return 'SHOWDOWN';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Flying chips animation */}
      {flyingChips.map((amount, i) => (
        <AnimatedChipFly key={`${amount}-${i}-${Date.now()}`} amount={amount} onComplete={() => {}} />
      ))}

      {/* Hand Analyzer - Only visible to player */}
      <PokerHandAnalyzer 
        holeCards={playerHand} 
        communityCards={communityCards} 
        isVisible={showAnalyzer && playerHand.length > 0} 
      />

      {/* Header */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-casino font-bold text-[#D4AF37]">TEXAS HOLD'EM</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Return to game lobby</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-4 py-1 rounded-full balance-display cursor-pointer hover:scale-105 transition-transform">
                    <img src="/logos/pc-logo.png" alt="$Pc" className="w-5 h-5" />
                    <span className="font-bold text-[#D4AF37]">
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
            
            {/* Voice toggle */}
            {voiceSupported && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowVoice(!showVoice)}
                      className={showVoice ? 'text-[#D4AF37]' : 'text-gray-500'}
                    >
                      {showVoice ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showVoice ? 'Voice announcements ON' : 'Voice announcements OFF'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Sound toggle */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? 'Unmute game sounds' : 'Mute game sounds'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Analyzer toggle */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowAnalyzer(!showAnalyzer)}
                    className={showAnalyzer ? 'text-[#43A047]' : 'text-gray-500'}
                  >
                    <span className="text-xs font-bold">AI</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showAnalyzer ? 'Hand analyzer ON' : 'Hand analyzer OFF'}</p>
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
                  <p>View Poker rules & hand rankings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </nav>

      {/* Game Area */}
      <div className="pt-14 min-h-screen flex flex-col">
        {/* Vegas Style Poker Table */}
        <div className="flex-1 relative p-4">
          {/* Table Surface */}
          <div 
            className="relative w-full max-w-6xl mx-auto rounded-[50%/30%] overflow-hidden"
            style={{
              aspectRatio: '2/1.2',
              background: 'radial-gradient(ellipse at center, #2E7D32 0%, #1B5E20 40%, #0D3312 70%, #051a08 100%)',
              boxShadow: `
                inset 0 0 150px rgba(0,0,0,0.6),
                0 0 0 12px #5D4037,
                0 0 0 14px #3E2723,
                0 20px 60px rgba(0,0,0,0.8)
              `,
            }}
          >
            {/* Felt texture overlay */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 1px, transparent 1px),
                  radial-gradient(circle at 70% 60%, rgba(255,255,255,0.03) 1px, transparent 1px),
                  radial-gradient(circle at 40% 80%, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '15px 15px, 20px 20px, 25px 25px',
              }}
            />
            
            {/* Table markings */}
            <div className="absolute inset-[5%] border-2 border-dashed border-[#D4AF37]/20 rounded-[50%/30%]" />
            
            {/* Phase indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 bg-black/60 rounded-full border border-[#D4AF37]/30">
                <span className="text-[#D4AF37] font-casino text-sm tracking-widest">{getPhaseLabel()}</span>
              </div>
            </div>

            {/* POT - Center */}
            <div className="absolute top-[25%] left-1/2 -translate-x-1/2 text-center">
              <div className="text-xs text-[#C0C0C0] tracking-widest mb-1">POT</div>
              <div className="text-3xl font-bold text-[#D4AF37] gold-text">{pot.toLocaleString()}</div>
              <div className="text-xs text-[#C0C0C0]">$Pc</div>
              
              {/* Pot chips */}
              {pot > 0 && (
                <div className="mt-2 flex justify-center">
                  <div className="relative">
                    <PokerChip amount={100} size="sm" />
                    <div className="absolute -top-1 left-3">
                      <PokerChip amount={500} size="sm" />
                    </div>
                    <div className="absolute top-1 left-6">
                      <PokerChip amount={50} size="sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Community Cards */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i}>
                  {communityCards[i] ? (
                    <PlayingCard card={communityCards[i]} size="md" />
                  ) : (
                    <div 
                      className="rounded-lg border-2 border-dashed border-[#D4AF37]/20 bg-black/20"
                      style={{ width: '50px', height: '70px' }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Opponent - Top */}
            <div className="absolute top-[8%] left-1/2 -translate-x-1/2">
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                </div>
                <PlayerAvatar
                  name="Player 2"
                  balance={2500}
                  size="sm"
                  showTalkButton={true}
                />
                {opponents[0].bet > 0 && (
                  <div className="mt-1">
                    <PokerChip amount={opponents[0].bet} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Opponent - Left */}
            <div className="absolute top-[35%] left-[5%]">
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                </div>
                <PlayerAvatar
                  name="Player 3"
                  balance={1800}
                  size="sm"
                  showTalkButton={true}
                />
                {opponents[1].bet > 0 && (
                  <div className="mt-1">
                    <PokerChip amount={opponents[1].bet} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Opponent - Right */}
            <div className="absolute top-[35%] right-[5%]">
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                </div>
                <PlayerAvatar
                  name="Player 4"
                  balance={3200}
                  size="sm"
                  showTalkButton={true}
                />
                {opponents[2].bet > 0 && (
                  <div className="mt-1">
                    <PokerChip amount={opponents[2].bet} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Player Area - Bottom */}
            <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-full max-w-md">
              {/* Message */}
              {message && (
                <div className="text-center mb-3">
                  <span className="px-4 py-2 bg-black/70 rounded-full text-sm text-[#D4AF37] border border-[#D4AF37]/30">
                    {message}
                  </span>
                </div>
              )}
              
              {/* Player's bet chips */}
              {playerChips.length > 0 && (
                <div className="flex justify-center mb-3">
                  <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
                    {playerChips.map((chip, i) => (
                      <div key={i} className="relative">
                        <ChipStack amount={chip.amount} count={chip.count} size="md" />
                      </div>
                    ))}
                  </div>
                  <div className="ml-2 text-[#D4AF37] font-bold self-center">
                    {playerBet} $Pc
                  </div>
                </div>
              )}
              
              {/* Player cards and info */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex gap-2">
                  {playerHand.map((card, i) => (
                    <PlayingCard key={i} card={card} size="md" />
                  ))}
                </div>
                
                <PlayerAvatar
                  name="You"
                  balance={balance}
                  size="md"
                  isActive={true}
                  showTalkButton={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/90 border-t border-[#5D4037]/30 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Chip Selection */}
            <div ref={chipAreaRef} className="flex justify-center gap-3 mb-4">
              {CHIP_VALUES.map(value => (
                <PokerChip
                  key={value}
                  amount={value}
                  size="md"
                  selected={selectedChip === value}
                  onClick={() => setSelectedChip(value)}
                />
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleFold}
                variant="destructive"
                className="px-6 py-5 rounded-xl font-bold bg-[#B71C1C] hover:bg-[#8B0000]"
              >
                FOLD
              </Button>
              
              {currentBet === 0 || playerBet >= currentBet ? (
                <Button
                  onClick={handleCheck}
                  className="px-6 py-5 rounded-xl font-bold bg-[#1E88E5] hover:bg-[#1565C0]"
                >
                  CHECK
                </Button>
              ) : (
                <Button
                  onClick={handleCall}
                  className="px-6 py-5 rounded-xl font-bold bg-[#43A047] hover:bg-[#2E7D32]"
                >
                  CALL {currentBet - playerBet}
                </Button>
              )}
              
              <Button
                onClick={handleRaise}
                className="px-6 py-5 rounded-xl font-bold bg-[#D4AF37] hover:bg-[#B8860B] text-black"
              >
                RAISE +{selectedChip}
              </Button>
              
              <Button
                onClick={handleAllIn}
                className="px-6 py-5 rounded-xl font-bold bg-gradient-to-r from-[#8B0000] to-[#B71C1C]"
              >
                ALL IN
              </Button>
              
              {playerChips.length > 0 && (
                <Button
                  onClick={clearBet}
                  variant="outline"
                  className="px-4 py-5 rounded-xl border-[#5D4037] text-[#C0C0C0]"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold">
              Texas Hold'em Rules
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Hand Rankings (Best to Worst)</h3>
              <div className="grid grid-cols-1 gap-1 text-gray-300">
                {[
                  'Royal Flush - A♦ K♦ Q♦ J♦ 10♦ (Same suit, highest straight)',
                  'Straight Flush - Five cards in a row, same suit',
                  'Four of a Kind - Four cards of the same rank',
                  'Full House - Three of a kind + a pair',
                  'Flush - All five cards same suit',
                  'Straight - Five cards in order, mixed suits',
                  'Three of a Kind - Three cards of same rank',
                  'Two Pair - Two different pairs',
                  'One Pair - Two cards of same rank',
                  'High Card - Highest single card wins',
                ].map((hand, i) => (
                  <div key={i} className="flex items-start gap-2 p-1 rounded hover:bg-white/5">
                    <span className="text-[#D4AF37] font-bold w-6">{i + 1}.</span>
                    <span>{hand}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Betting Actions</h3>
              <ul className="space-y-1 text-gray-300">
                {[
                  'Check - Don\'t bet, stay in the hand',
                  'Bet - Put chips into the pot',
                  'Call - Match another player\'s bet',
                  'Raise - Increase the current bet',
                  'Fold - Give up your hand',
                  'All-In - Bet all your remaining chips',
                ].map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Game Flow</h3>
              <ol className="space-y-1 text-gray-300">
                {[
                  'Pre-Flop: Bet after receiving 2 hole cards',
                  'The Flop: 3 community cards dealt',
                  'The Turn: 4th community card dealt',
                  'The River: 5th community card dealt',
                  'Showdown: Best 5-card hand wins',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
