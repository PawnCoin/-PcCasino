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
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
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

function AnimatedChipFly({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 100;
    const endX = window.innerWidth / 2;
    const endY = window.innerHeight / 2 - 50;

    setPosition({ x: startX, y: startY });

    const duration = 400;
    const startTime = Date.now();
    let lastTrailTime = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const newX = startX + (endX - startX) * easeOut;
      const newY = startY + (endY - startY) * easeOut;
      setPosition({ x: newX, y: newY });

      if (elapsed - lastTrailTime > 30 && progress < 0.85) {
        lastTrailTime = elapsed;
        trailIdRef.current += 1;
        setTrail(prev => [...prev.slice(-8), { x: newX, y: newY, id: trailIdRef.current }]);
      }

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
    <>
      {trail.map((t, i) => (
        <div
          key={t.id}
          className="fixed z-49 rounded-full pointer-events-none"
          style={{
            left: t.x,
            top: t.y,
            width: `${6 + i}px`,
            height: `${6 + i}px`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(212,175,55,${0.3 + i * 0.05}), transparent)`,
            boxShadow: `0 0 ${4 + i * 2}px rgba(212,175,55,${0.2 + i * 0.03})`,
            animation: 'pokerTrailFade 0.4s ease-out forwards',
          }}
        />
      ))}
      <div
        className={`fixed z-50 w-12 h-12 rounded-full bg-gradient-to-br ${chipColors[amount] || chipColors[5]} border-2 border-white/30 flex flex-col items-center justify-center pointer-events-none`}
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity,
          boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3), 0 0 15px rgba(212,175,55,0.4)',
        }}
      >
        <div className="absolute inset-2 rounded-full border border-dashed border-white/40" />
        <span className="text-[7px] font-bold text-white/80">$Pc</span>
        <span className="text-[9px] font-bold text-white">{amount}</span>
        <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/30" />
      </div>
    </>
  );
}

function PotChipStack({ pot }: { pot: number }) {
  const chipBreakdown = [];
  let remaining = pot;
  const denominations = [500, 100, 50, 25, 10, 5];
  for (const denom of denominations) {
    const count = Math.floor(remaining / denom);
    if (count > 0) {
      chipBreakdown.push({ amount: denom, count: Math.min(count, 3) });
      remaining -= denom * count;
    }
  }

  const chipColors: Record<number, string> = {
    5: '#ef4444',
    10: '#3b82f6',
    25: '#22c55e',
    50: '#f97316',
    100: '#374151',
    500: '#D4AF37',
  };

  return (
    <div className="flex items-end justify-center gap-1">
      {chipBreakdown.slice(0, 4).map((chip, stackIdx) => (
        <div key={stackIdx} className="relative flex flex-col-reverse items-center">
          {Array.from({ length: chip.count }, (_, i) => (
            <div
              key={i}
              className="premium-chip"
              style={{
                width: '22px',
                height: '22px',
                marginTop: i > 0 ? '-14px' : '0',
                background: `radial-gradient(circle at 35% 35%, ${chipColors[chip.amount]}dd, ${chipColors[chip.amount]}88)`,
                border: '2px solid rgba(255,255,255,0.3)',
                zIndex: i,
                fontSize: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {i === chip.count - 1 ? chip.amount : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PokerGame({ balance, onBack, onBet, onWin, cardBackStyle }: PokerGameProps) {
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [revealedCommunity, setRevealedCommunity] = useState(0);
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
  const [winEffect, setWinEffect] = useState(false);
  const [loseEffect, setLoseEffect] = useState(false);
  const [winText, setWinText] = useState('');
  const [opponents, setOpponents] = useState([
    { id: 1, name: 'Player 2', balance: 2500, bet: 0, cards: 2, active: true, position: 'BB' },
    { id: 2, name: 'Player 3', balance: 1800, bet: 0, cards: 2, active: true, position: 'SB' },
    { id: 3, name: 'Player 4', balance: 3200, bet: 0, cards: 2, active: true, position: '' },
    { id: 4, name: 'Player 5', balance: 2100, bet: 0, cards: 2, active: true, position: '' },
    { id: 5, name: 'Player 6', balance: 4000, bet: 0, cards: 2, active: true, position: '' },
  ]);

  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { announceEvent, stop, isSupported: voiceSupported } = usePokerVoice();
  const chipAreaRef = useRef<HTMLDivElement>(null);

  const startNewHand = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[1]];
    
    const newOpponents = opponents.map((opp, idx) => ({
      ...opp,
      bet: 0,
      active: idx < 3 || Math.random() > 0.3,
    }));
    
    setDeck(newDeck.slice(8));
    setPlayerHand(playerCards);
    setCommunityCards([]);
    setRevealedCommunity(0);
    setPot(60);
    setCurrentBet(20);
    setPlayerBet(20);
    setPlayerChips([{ amount: 20, count: 1 }]);
    setOpponents(newOpponents.map(o => ({ ...o, bet: 20 })));
    setGamePhase('preflop');
    setMessage('Pre-flop: Your turn. Call, raise, or fold?');
    setWinEffect(false);
    setLoseEffect(false);
    setWinText('');
    
    if (showVoice) {
      announceEvent('New hand. Pre-flop betting.');
    }
  }, [opponents, showVoice, announceEvent]);

  const dealCommunity = useCallback((count: number) => {
    const newCards = deck.slice(0, count);
    setCommunityCards(prev => [...prev, ...newCards]);
    setDeck(prev => prev.slice(count));
    setTimeout(() => {
      setRevealedCommunity(prev => prev + count);
    }, 100);
  }, [deck]);

  const animateChip = (amount: number) => {
    setFlyingChips(prev => [...prev, amount]);
    playSound('chip');
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(a => a !== amount));
    }, 500);
  };

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

  const [showdownData, setShowdownData] = useState<{
    winner: 'player' | 'opponent';
    handName: string;
    winAmount: number;
    opponentName?: string;
    opponentCards?: Card[];
  } | null>(null);
  const [showdownTimer, setShowdownTimer] = useState(0);

  const resolveHand = () => {
    const allCards = [...playerHand, ...communityCards];
    const result = evaluatePokerHand(allCards);
    
    const playerWins = Math.random() > 0.6;
    const handName = handRankings[result.hand];
    
    const oppCards: Card[] = [
      deck[0] || { rank: 'K', suit: 'spades' },
      deck[1] || { rank: 'Q', suit: 'hearts' },
    ];
    
    if (playerWins) {
      const winAmount = pot;
      onWin(winAmount);
      setWinEffect(true);
      setWinText(`${handName} — ${winAmount} $Pc!`);
      setMessage(`YOU WIN! ${handName}`);
      playSound('win');
      if (showVoice) announceEvent(`Winner! You won ${winAmount} dollars with ${handName}.`);
      setShowdownData({ winner: 'player', handName, winAmount, opponentCards: oppCards });
    } else {
      setLoseEffect(true);
      const winnerIdx = Math.floor(Math.random() * 3);
      const opponentName = opponents[winnerIdx]?.name || 'Player 2';
      setMessage(`${opponentName} wins with ${handName}`);
      playSound('lose');
      if (showVoice) announceEvent(`${opponentName} wins with ${handName}.`);
      setShowdownData({ winner: 'opponent', handName, winAmount: pot, opponentName, opponentCards: oppCards });
    }
    
    setShowdownTimer(4);
    const countdown = setInterval(() => {
      setShowdownTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          setPlayerChips([]);
          setShowdownData(null);
          startNewHand();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
    <CasinoEnvironment gameType="poker">
      <div className="min-h-screen bg-[#0a0a0a] relative">
        <style>{`
          @keyframes pokerTrailFade {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          }
          @keyframes pokerPotGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.1); }
            50% { box-shadow: 0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.2), 0 0 80px rgba(212,175,55,0.1); }
          }
          @keyframes pokerMetallicShine {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes pokerCommunityReveal {
            0% {
              transform: perspective(800px) translateX(120px) rotateY(-90deg) scale(0.6);
              opacity: 0;
              filter: blur(3px);
            }
            50% {
              transform: perspective(800px) translateX(10px) rotateY(-20deg) scale(1.05);
              opacity: 1;
              filter: blur(0);
            }
            100% {
              transform: perspective(800px) translateX(0) rotateY(0deg) scale(1);
              opacity: 1;
              filter: blur(0);
            }
          }
          @keyframes pokerWinPulse {
            0% { box-shadow: inset 0 0 60px rgba(34,197,94,0), 0 0 0 0 rgba(212,175,55,0); }
            30% { box-shadow: inset 0 0 100px rgba(34,197,94,0.25), 0 0 40px 10px rgba(212,175,55,0.3); }
            60% { box-shadow: inset 0 0 60px rgba(34,197,94,0.1), 0 0 80px 20px rgba(212,175,55,0.15); }
            100% { box-shadow: inset 0 0 60px rgba(34,197,94,0), 0 0 0 0 rgba(212,175,55,0); }
          }
          @keyframes pokerLoseShake {
            0%, 100% { transform: translateX(0); }
            10% { transform: translateX(-6px) rotate(-0.5deg); }
            20% { transform: translateX(6px) rotate(0.5deg); }
            30% { transform: translateX(-4px) rotate(-0.3deg); }
            40% { transform: translateX(4px) rotate(0.3deg); }
            50% { transform: translateX(-2px); }
            60% { transform: translateX(2px); }
            70% { transform: translateX(0); }
          }
          @keyframes pokerWinTextAppear {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            40% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            60% { transform: translate(-50%, -50%) scale(0.95); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
          @keyframes pokerGoldRing {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; border-width: 4px; }
            100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; border-width: 1px; }
          }
          @keyframes pokerChipsSweep {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(0, 120px) scale(0.5); opacity: 0; }
          }
          @keyframes pokerTimerCountdown {
            0% { width: 100%; }
            100% { width: 0%; }
          }
          @keyframes pokerLeatherSheen {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
          }
          @keyframes pokerSpotlight {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.8; }
          }
        `}</style>

        {flyingChips.map((amount, i) => (
          <AnimatedChipFly key={`${amount}-${i}-${Date.now()}`} amount={amount} onComplete={() => {}} />
        ))}

        <PokerHandAnalyzer 
          holeCards={playerHand} 
          communityCards={communityCards} 
          isVisible={showAnalyzer && playerHand.length > 0} 
        />

        {winEffect && (
          <>
            <div
              className="fixed inset-0 z-[60] pointer-events-none"
              style={{ animation: 'pokerWinPulse 1.5s ease-out forwards' }}
            />
            <div
              className="fixed z-[61] pointer-events-none rounded-full border-[#D4AF37]"
              style={{
                top: '50%',
                left: '50%',
                width: '100px',
                height: '100px',
                borderStyle: 'solid',
                animation: 'pokerGoldRing 1.2s ease-out forwards',
              }}
            />
            <div
              className="fixed z-[62] pointer-events-none rounded-full border-[#D4AF37]/60"
              style={{
                top: '50%',
                left: '50%',
                width: '100px',
                height: '100px',
                borderStyle: 'solid',
                animation: 'pokerGoldRing 1.2s ease-out 0.2s forwards',
                opacity: 0,
              }}
            />
            {winText && (
              <div
                className="fixed z-[63] pointer-events-none"
                style={{
                  top: '40%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'pokerWinTextAppear 0.8s ease-out forwards',
                }}
              >
                <div className="text-center">
                  <div
                    className="text-4xl font-casino font-bold mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #D4AF37, #FFD700, #D4AF37)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: 'none',
                      filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.8))',
                    }}
                  >
                    WINNER!
                  </div>
                  <div className="text-lg text-white font-bold" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
                    {winText}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {loseEffect && (
          <div
            className="fixed inset-0 z-[60] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(183,28,28,0.15) 0%, transparent 70%)',
              animation: 'pokerLoseShake 0.6s ease-out',
            }}
          />
        )}

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

        <div className="pt-14 h-screen flex flex-col relative z-10">
          {/* === TABLE AREA === */}
          <div className="flex-1 relative px-4 pt-2 pb-0 min-h-0">
            <div 
              className="relative w-full max-w-5xl mx-auto h-full"
              style={{
                animation: loseEffect ? 'pokerLoseShake 0.6s ease-out' : undefined,
              }}
            >
              {/* Wood rail */}
              <div
                className="absolute inset-0 rounded-[50%/35%]"
                style={{
                  background: `
                    radial-gradient(ellipse at 30% 20%, rgba(160,120,80,0.3) 0%, transparent 50%),
                    radial-gradient(ellipse at 70% 80%, rgba(160,120,80,0.2) 0%, transparent 50%),
                    linear-gradient(180deg, #6D4C2E 0%, #5D4037 20%, #4E342E 50%, #3E2723 80%, #2E1F18 100%)
                  `,
                  boxShadow: `
                    inset 0 4px 8px rgba(255,255,255,0.1),
                    inset 0 -4px 8px rgba(0,0,0,0.5),
                    0 8px 40px rgba(0,0,0,0.8),
                    0 0 0 2px rgba(212,175,55,0.4)
                  `,
                }}
              />
              {/* Gold notch rim */}
              <div
                className="absolute inset-0 rounded-[50%/35%] pointer-events-none"
                style={{
                  background: `repeating-conic-gradient(from 0deg, transparent 0deg 8deg, rgba(212,175,55,0.15) 8deg 9deg, transparent 9deg 18deg)`,
                  mask: 'radial-gradient(ellipse at center, transparent 85%, black 90%, black 100%)',
                  WebkitMask: 'radial-gradient(ellipse at center, transparent 85%, black 90%, black 100%)',
                }}
              />

              {/* Green felt */}
              <div 
                className="absolute rounded-[50%/35%]"
                style={{
                  inset: '14px',
                  background: 'radial-gradient(ellipse at 50% 40%, #2E7D32 0%, #1B5E20 30%, #0D3312 60%, #051a08 100%)',
                  boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)',
                }}
              >
                {/* Felt texture */}
                <div 
                  className="absolute inset-0 opacity-50 rounded-[50%/35%]"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.015) 1px, transparent 2px, transparent 3px),
                      repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.01) 1px, transparent 2px, transparent 3px)
                    `,
                  }}
                />
                {/* Gold border lines */}
                <div className="absolute inset-[5%] border-2 border-dashed border-[#D4AF37]/20 rounded-[50%/35%]" />
                <div
                  className="absolute inset-[4%] rounded-[50%/35%] pointer-events-none"
                  style={{
                    border: '1.5px solid rgba(212,175,55,0.25)',
                    boxShadow: 'inset 0 0 40px rgba(212,175,55,0.06)',
                  }}
                />

                {/* TEXAS HOLD'EM text on felt */}
                <div
                  className="absolute top-[10%] left-1/2 -translate-x-1/2 pointer-events-none select-none"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '16px',
                    letterSpacing: '0.4em',
                    color: 'rgba(212,175,55,0.35)',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  TEXAS HOLD'EM POKER
                </div>

                {/* $Pc center branding */}
                <div
                  className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center gap-2"
                  style={{ opacity: 0.2 }}
                >
                  <img src="/logos/pc-logo.png" alt="" className="w-10 h-10" />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: '#D4AF37', letterSpacing: '0.3em' }}>$Pc CASINO</span>
                </div>

                {/* Spotlight */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[45%] pointer-events-none rounded-[50%/35%]"
                  style={{
                    background: 'radial-gradient(ellipse at center top, rgba(255,255,220,0.1) 0%, rgba(212,175,55,0.05) 30%, transparent 60%)',
                    animation: 'pokerSpotlight 4s ease-in-out infinite',
                  }}
                />
              </div>

              {/* Table limits placard */}
              <div
                className="absolute z-[10] pointer-events-none"
                style={{
                  top: '10%',
                  left: '12%',
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,20,0.98) 100%)',
                  border: '1px solid rgba(212,175,55,0.6)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ fontSize: '8px', color: '#D4AF37', letterSpacing: '0.15em', fontWeight: 700 }}>TABLE LIMITS</div>
                <div style={{ fontSize: '9px', color: '#C0C0C0', marginTop: '2px' }}>MIN 5 $Pc</div>
                <div style={{ fontSize: '9px', color: '#C0C0C0' }}>MAX 500 $Pc</div>
              </div>

              {/* Card shoe */}
              <div
                className="absolute z-[10] pointer-events-none"
                style={{
                  top: '10%',
                  right: '12%',
                  width: '35px',
                  height: '50px',
                  background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                  border: '2px solid rgba(212,175,55,0.5)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: '3px', left: '4px', right: '4px', height: '6px', background: 'linear-gradient(180deg, #283593, #1a237e)', borderRadius: '2px' }} />
                <div style={{ position: 'absolute', top: '10px', left: '4px', right: '4px', height: '5px', background: 'linear-gradient(180deg, #283593, #1a237e)', borderRadius: '2px' }} />
                <div style={{ position: 'absolute', top: '16px', left: '4px', right: '4px', height: '5px', background: 'linear-gradient(180deg, #283593, #1a237e)', borderRadius: '2px' }} />
                <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', fontSize: '6px', color: 'rgba(212,175,55,0.6)', fontWeight: 700 }}>SHOE</div>
              </div>

              {/* Phase label */}
              <div className="absolute top-[3%] left-1/2 -translate-x-1/2 z-[10]">
                <div
                  className="px-5 py-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(20,20,20,0.95) 100%)',
                    border: '1px solid rgba(212,175,55,0.5)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-[#D4AF37] font-casino text-sm tracking-[0.2em]">{getPhaseLabel()}</span>
                </div>
              </div>

              {/* Pot display */}
              <div
                className="absolute top-[20%] left-1/2 -translate-x-1/2 text-center z-[10]"
                style={{
                  animation: pot > 0 ? 'pokerPotGlow 2s ease-in-out infinite' : 'none',
                  background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)',
                  borderRadius: '20px',
                  padding: '8px 20px',
                }}
              >
                <div className="text-[10px] text-[#C0C0C0] tracking-[0.3em] mb-1 font-bold">POT</div>
                <div className="text-2xl font-bold text-[#D4AF37] gold-text">{pot.toLocaleString()}</div>
                <div className="text-xs text-[#C0C0C0]">$Pc</div>
                {pot > 0 && (
                  <div className="mt-1" style={{ animation: winEffect ? 'pokerChipsSweep 1s ease-in 0.5s forwards' : undefined }}>
                    <PotChipStack pot={pot} />
                  </div>
                )}
              </div>

              {/* Community cards */}
              <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 z-[10]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      animation: communityCards[i] && i < revealedCommunity
                        ? `pokerCommunityReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.15}s both`
                        : undefined,
                    }}
                  >
                    {communityCards[i] ? (
                      <PlayingCard card={communityCards[i]} size="lg" />
                    ) : (
                      <div 
                        className="rounded-lg border-2 border-dashed border-[#D4AF37]/20 bg-black/20"
                        style={{ width: '70px', height: '100px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* === OPPONENT SEATS === */}
              {/* Seat 1 - Top center (Dealer area) */}
              <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-[10]">
                <div className="flex flex-col items-center">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Dealer</div>
                  <div className="flex gap-1 mb-1">
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  </div>
                  <div className="text-[10px] text-white font-bold">{opponents[0].name}</div>
                  <div className="text-[9px] text-[#D4AF37]">{opponents[0].balance.toLocaleString()} $Pc</div>
                  {opponents[0].bet > 0 && <div className="mt-1"><PokerChip amount={opponents[0].bet} size="sm" /></div>}
                  {opponents[0].position && (
                    <div className="mt-1 px-2 py-0.5 rounded-full text-[7px] font-bold" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37' }}>
                      {opponents[0].position}
                    </div>
                  )}
                </div>
              </div>

              {/* Seat 2 - Top left */}
              <div className="absolute top-[15%] left-[8%] z-[10]">
                <div className="flex flex-col items-center">
                  <div className="flex gap-1 mb-1">
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  </div>
                  <div className="text-[10px] text-white font-bold">{opponents[1].name}</div>
                  <div className="text-[9px] text-[#D4AF37]">{opponents[1].balance.toLocaleString()} $Pc</div>
                  {opponents[1].bet > 0 && <div className="mt-1"><PokerChip amount={opponents[1].bet} size="sm" /></div>}
                  {opponents[1].position && (
                    <div className="mt-1 px-2 py-0.5 rounded-full text-[7px] font-bold" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37' }}>
                      {opponents[1].position}
                    </div>
                  )}
                </div>
              </div>

              {/* Seat 3 - Top right */}
              <div className="absolute top-[15%] right-[8%] z-[10]">
                <div className="flex flex-col items-center">
                  <div className="flex gap-1 mb-1">
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  </div>
                  <div className="text-[10px] text-white font-bold">{opponents[2].name}</div>
                  <div className="text-[9px] text-[#D4AF37]">{opponents[2].balance.toLocaleString()} $Pc</div>
                  {opponents[2].bet > 0 && <div className="mt-1"><PokerChip amount={opponents[2].bet} size="sm" /></div>}
                </div>
              </div>

              {/* Seat 4 - Left side */}
              <div className="absolute top-[50%] -translate-y-1/2 left-[3%] z-[10]">
                <div className="flex flex-col items-center">
                  <div className="flex gap-1 mb-1">
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  </div>
                  <div className="text-[10px] text-white font-bold">{opponents[3].name}</div>
                  <div className="text-[9px] text-[#D4AF37]">{opponents[3].balance.toLocaleString()} $Pc</div>
                  {opponents[3].bet > 0 && <div className="mt-1"><PokerChip amount={opponents[3].bet} size="sm" /></div>}
                </div>
              </div>

              {/* Seat 5 - Right side */}
              <div className="absolute top-[50%] -translate-y-1/2 right-[3%] z-[10]">
                <div className="flex flex-col items-center">
                  <div className="flex gap-1 mb-1">
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                    <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
                  </div>
                  <div className="text-[10px] text-white font-bold">{opponents[4].name}</div>
                  <div className="text-[9px] text-[#D4AF37]">{opponents[4].balance.toLocaleString()} $Pc</div>
                  {opponents[4].bet > 0 && <div className="mt-1"><PokerChip amount={opponents[4].bet} size="sm" /></div>}
                </div>
              </div>

              {/* Showdown overlay (on table) */}
              {showdownData && (
                <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
                  <div
                    className="text-center p-6 rounded-2xl"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
                      minWidth: '320px',
                    }}
                  >
                    <div className="text-xs tracking-[0.3em] mb-3 font-bold" style={{ color: 'rgba(212,175,55,0.7)' }}>
                      SHOWDOWN
                    </div>
                    {showdownData.opponentCards && (
                      <div className="flex justify-center gap-3 mb-3 items-center">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mr-2">
                          {showdownData.winner === 'opponent' ? showdownData.opponentName : 'Opponent'}
                        </div>
                        {showdownData.opponentCards.map((c, i) => (
                          <div key={i} style={{ animation: `pokerCommunityReveal 0.5s ease-out ${i * 0.2}s both` }}>
                            <PlayingCard card={c} size="md" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      className="text-2xl font-casino font-bold mb-1"
                      style={{
                        color: showdownData.winner === 'player' ? '#D4AF37' : '#ef4444',
                        textShadow: showdownData.winner === 'player' ? '0 0 20px rgba(212,175,55,0.6)' : '0 0 20px rgba(239,68,68,0.4)',
                      }}
                    >
                      {showdownData.handName.toUpperCase()}
                    </div>
                    <div className="text-lg font-bold mb-2" style={{ color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {showdownData.winner === 'player'
                        ? `YOU WIN ${showdownData.winAmount.toLocaleString()} $Pc!`
                        : `${showdownData.opponentName} wins`
                      }
                    </div>
                    <div className="text-xs text-gray-400">Next hand in {showdownTimer}s</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* === PLAYER HAND AREA (below table) === */}
          <div
            className="relative z-20 px-4 py-2"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(5,5,5,0.98) 100%)',
              borderTop: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <div className="max-w-4xl mx-auto">
              {message && (
                <div className="text-center mb-2">
                  <span
                    className="px-4 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(20,15,10,0.95) 100%)',
                      color: '#fff',
                      border: '1px solid rgba(212,175,55,0.3)',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                      textShadow: '0 0 8px rgba(212,175,55,0.4)',
                    }}
                  >
                    {message}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center gap-6">
                {/* Player's hole cards */}
                <div className="flex gap-3">
                  {playerHand.map((card, i) => (
                    <div
                      key={i}
                      className="card-hover-lift"
                      style={{
                        filter: showdownData?.winner === 'player' ? 'drop-shadow(0 0 12px rgba(212,175,55,0.6))' : undefined,
                      }}
                    >
                      <PlayingCard card={card} size="xl" />
                    </div>
                  ))}
                </div>

                {/* Player label + bet */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="px-4 py-1.5 rounded text-xs font-bold tracking-wider text-center"
                    style={{
                      background: showdownData?.winner === 'player' ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.7)',
                      border: showdownData?.winner === 'player' ? '1.5px solid rgba(212,175,55,0.8)' : '1px solid rgba(255,255,255,0.2)',
                      color: showdownData?.winner === 'player' ? '#D4AF37' : '#fff',
                      boxShadow: showdownData?.winner === 'player' ? '0 0 15px rgba(212,175,55,0.4)' : 'none',
                    }}
                  >
                    YOU
                  </div>
                  <div className="text-xs text-[#D4AF37] font-bold">
                    {balance.toLocaleString()} $Pc
                  </div>
                  {playerChips.length > 0 && (
                    <div className="flex gap-1 items-center mt-1">
                      {playerChips.map((chip, i) => (
                        <div key={i} className="chip-bounce">
                          <PokerChip amount={chip.amount} size="sm" />
                        </div>
                      ))}
                      <span className="text-[#D4AF37] text-xs font-bold ml-1">{playerBet} $Pc</span>
                    </div>
                  )}
                </div>

                {/* Dealer button */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #f0f0f0 0%, #c0c0c0 20%, #ffffff 45%, #e0e0e0 55%, #c0c0c0 80%, #f0f0f0 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'pokerMetallicShine 4s linear infinite',
                    border: '2.5px solid rgba(212,175,55,0.7)',
                    color: '#1a1a1a',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.8), 0 0 8px rgba(212,175,55,0.3)',
                  }}
                >
                  D
                </div>
              </div>
            </div>
          </div>

          {/* === BOTTOM CONTROLS BAR === */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(15,15,15,0.98) 0%, rgba(5,5,5,1) 100%)',
              borderTop: '2px solid rgba(212,175,55,0.3)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <div className="max-w-5xl mx-auto px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cash</span>
                    <span className="text-sm font-bold text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Bet</span>
                    <span className="text-sm font-bold text-[#D4AF37]">{playerBet.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                  </div>
                  {winEffect && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Win</span>
                      <span className="text-sm font-bold text-[#43A047]">{pot.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                    </div>
                  )}
                </div>

                <div ref={chipAreaRef} className="flex gap-2">
                  {CHIP_VALUES.map(value => (
                    <PokerChip
                      key={value}
                      amount={value}
                      size="sm"
                      selected={selectedChip === value}
                      onClick={() => setSelectedChip(value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-3">
                {gamePhase === 'showdown' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">Next hand in {showdownTimer}s...</span>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={handleFold}
                      variant="destructive"
                      className="px-5 py-3 rounded-lg font-bold text-sm bg-[#B71C1C] hover:bg-[#8B0000]"
                      style={{ boxShadow: '0 3px 10px rgba(183,28,28,0.4)' }}
                    >
                      FOLD
                    </Button>
                    {currentBet === 0 || playerBet >= currentBet ? (
                      <Button
                        onClick={handleCheck}
                        className="px-5 py-3 rounded-lg font-bold text-sm bg-[#1E88E5] hover:bg-[#1565C0]"
                        style={{ boxShadow: '0 3px 10px rgba(30,136,229,0.4)' }}
                      >
                        CHECK
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCall}
                        className="px-5 py-3 rounded-lg font-bold text-sm bg-[#43A047] hover:bg-[#2E7D32]"
                        style={{ boxShadow: '0 3px 10px rgba(67,160,71,0.4)' }}
                      >
                        CALL {currentBet - playerBet}
                      </Button>
                    )}
                    <Button
                      onClick={handleRaise}
                      className="px-5 py-3 rounded-lg font-bold text-sm bg-[#D4AF37] hover:bg-[#B8860B] text-black"
                      style={{ boxShadow: '0 3px 10px rgba(212,175,55,0.4)' }}
                    >
                      RAISE +{selectedChip}
                    </Button>
                    <Button
                      onClick={handleAllIn}
                      className="px-5 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-[#8B0000] to-[#B71C1C]"
                      style={{ boxShadow: '0 3px 10px rgba(139,0,0,0.4)' }}
                    >
                      ALL IN
                    </Button>
                    {playerChips.length > 0 && (
                      <Button
                        onClick={clearBet}
                        variant="outline"
                        className="px-3 py-3 rounded-lg border-[#5D4037] text-[#C0C0C0]"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

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
    </CasinoEnvironment>
  );
}
