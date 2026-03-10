import { useState } from 'react';
import { ArrowLeft, Info, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createDeck, shuffleDeck } from '@/hooks/useGameEngine';
import { PokerChip, ChipStack } from '@/components/PokerChip';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import type { Card } from '@/types';

interface SpadesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

const spadesRules = {
  objective: 'Be the first partnership to reach 500 points by winning tricks and accurately predicting how many tricks you will win.',
  deck: [
    'Standard 52-card deck',
    'Spades are always trump',
    'Rank: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2',
  ],
  gameplay: [
    'Partners sit across from each other',
    'Each player receives 13 cards',
    'Bidding: Each player bids number of tricks they expect to win (0-13)',
    'Nil bid: Player bids 0 tricks (bonus/penalty applies)',
    'Blind Nil: Bid nil without looking at cards (double bonus/penalty)',
    'Playing: Player left of dealer leads first trick',
    'Must follow suit if possible',
    'Cannot lead spades until spades are "broken" (played on another suit)',
    'Highest card of led suit wins, unless spade is played (spades trump)',
    'Winner of trick leads next trick',
  ],
  scoring: [
    '10 points per trick bid and won',
    '1 point per overtrick (bag) - but 10 bags = -100 penalty',
    'Nil bid: +100 if successful, -100 if fails',
    'Blind Nil: +200 if successful, -200 if fails',
    'Failed bid: -10 points per trick under bid',
  ],
  variations: [
    'Sandbag Penalty: Accumulating 10 bags costs 100 points',
    'No Table Talk: Partners cannot communicate about hands',
    'Jokers: Some variants include Jokers as high trumps',
    'Deuces High: 2s rank above Aces in some variants',
  ],
};

interface Player {
  id: string;
  name: string;
  hand: Card[];
  bid: number | null;
  tricks: number;
  avatar: string;
  color: string;
}

interface Trick {
  cards: { player: string; card: Card }[];
  winner: string | null;
}

const CHIP_VALUES = [5, 10, 25, 50, 100, 500];

export function SpadesGame({ balance, onBack, onBet, onWin, cardBackStyle }: SpadesGameProps) {
  const [gamePhase, setGamePhase] = useState<'betting' | 'bidding' | 'playing' | 'scoring'>('betting');
  const [players, setPlayers] = useState<Player[]>([
    { id: 'you', name: 'You', hand: [], bid: null, tricks: 0, avatar: 'Y', color: 'from-[#D4AF37] to-[#B8860B]' },
    { id: 'p2', name: 'Player 2', hand: [], bid: null, tricks: 0, avatar: 'P2', color: 'from-[#B71C1C] to-[#8B0000]' },
    { id: 'p3', name: 'Player 3', hand: [], bid: null, tricks: 0, avatar: 'P3', color: 'from-[#1E88E5] to-[#1565C0]' },
    { id: 'p4', name: 'Player 4', hand: [], bid: null, tricks: 0, avatar: 'P4', color: 'from-[#43A047] to-[#2E7D32]' },
  ]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [currentTrick, setCurrentTrick] = useState<Trick>({ cards: [], winner: null });
  const [tricks, setTricks] = useState<Trick[]>([]);
  const [spadesBroken, setSpadesBroken] = useState(false);
  const [showSpadesBroken, setShowSpadesBroken] = useState(false);
  const [selectedChip, setSelectedChip] = useState(25);
  const [currentBet, setCurrentBet] = useState(0);
  const [tableChips, setTableChips] = useState<{ amount: number; count: number }[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('Place your bet to start');
  const [teamScore, setTeamScore] = useState({ you: 0, opponent: 0 });
  const [bags, setBags] = useState({ you: 0, opponent: 0 });
  const [round, setRound] = useState(1);
  const [trickWinner, setTrickWinner] = useState<string | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const [loseFlash, setLoseFlash] = useState(false);

  const yourPlayer = players.find(p => p.id === 'you')!;
  const yourPartner = players.find(p => p.id === 'p3')!;

  const triggerSpadesBroken = () => {
    setShowSpadesBroken(true);
    setTimeout(() => setShowSpadesBroken(false), 1500);
  };

  const addChipToBet = (amount: number) => {
    if (currentBet + amount > balance) {
      setMessage('Insufficient balance!');
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

  const startGame = () => {
    if (currentBet === 0) {
      setMessage('Place a bet first!');
      return;
    }
    if (!onBet(currentBet)) return;
    
    const newDeck = shuffleDeck(createDeck());
    const newPlayers = [...players];
    
    for (let i = 0; i < 4; i++) {
      newPlayers[i].hand = newDeck.slice(i * 13, (i + 1) * 13);
      newPlayers[i].bid = null;
      newPlayers[i].tricks = 0;
    }
    
    setPlayers(newPlayers);
    setGamePhase('bidding');
    setCurrentPlayer(0);
    setTricks([]);
    setCurrentTrick({ cards: [], winner: null });
    setSpadesBroken(false);
    setMessage('Bidding phase. How many tricks will you win?');
  };

  const placeBid = (bidAmount: number) => {
    const newPlayers = [...players];
    newPlayers[0].bid = bidAmount;
    setPlayers(newPlayers);
    
    for (let i = 1; i < 4; i++) {
      const hand = newPlayers[i].hand;
      const spadeCount = hand.filter(c => c.suit === 'spades').length;
      const highCards = hand.filter(c => 
        c.rank === 'A' || c.rank === 'K' || c.rank === 'Q'
      ).length;
      const estimatedTricks = Math.min(13, Math.floor(spadeCount * 0.7 + highCards * 0.5));
      newPlayers[i].bid = Math.max(1, estimatedTricks);
    }
    
    setPlayers(newPlayers);
    setGamePhase('playing');
    setCurrentPlayer(0);
    setMessage('Playing phase. Lead a card!');
  };

  const playCard = (cardIndex: number) => {
    if (currentPlayer !== 0) return;
    
    const card = yourPlayer.hand[cardIndex];
    
    if (currentTrick.cards.length > 0) {
      const leadSuit = currentTrick.cards[0].card.suit;
      const hasLeadSuit = yourPlayer.hand.some(c => c.suit === leadSuit);
      
      if (hasLeadSuit && card.suit !== leadSuit) {
        setMessage(`You must follow suit! Play ${leadSuit}`);
        return;
      }
    }
    
    if (currentTrick.cards.length === 0 && card.suit === 'spades' && !spadesBroken) {
      const hasNonSpade = yourPlayer.hand.some(c => c.suit !== 'spades');
      if (hasNonSpade) {
        setMessage('Spades not broken yet! Lead another suit.');
        return;
      }
    }
    
    if (card.suit === 'spades' && !spadesBroken) {
      setSpadesBroken(true);
      triggerSpadesBroken();
    }
    
    const newPlayers = [...players];
    newPlayers[0].hand.splice(cardIndex, 1);
    setPlayers(newPlayers);
    
    const newTrick = { ...currentTrick };
    newTrick.cards.push({ player: 'you', card });
    setCurrentTrick(newTrick);
    
    setTimeout(() => playAICards(newTrick), 500);
  };

  const playAICards = (trick: Trick) => {
    let currentTrickCards = [...trick.cards];
    let nextPlayer = currentPlayer + 1;
    
    const playNextAI = () => {
      if (currentTrickCards.length >= 4) {
        resolveTrick(currentTrickCards);
        return;
      }
      
      const playerIndex = nextPlayer % 4;
      const player = players[playerIndex];
      
      let cardToPlay: Card;
      
      if (currentTrickCards.length === 0) {
        const nonSpades = player.hand.filter(c => c.suit !== 'spades');
        if (nonSpades.length > 0) {
          cardToPlay = nonSpades.reduce((highest, c) => c.value > highest.value ? c : highest);
        } else {
          cardToPlay = player.hand.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
        }
      } else {
        const leadSuit = currentTrickCards[0].card.suit;
        const followCards = player.hand.filter(c => c.suit === leadSuit);
        
        if (followCards.length > 0) {
          cardToPlay = followCards.reduce((highest, c) => c.value > highest.value ? c : highest);
        } else {
          const spades = player.hand.filter(c => c.suit === 'spades');
          if (spades.length > 0 && !trick.cards.some(c => c.card.suit === 'spades')) {
            cardToPlay = spades.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
          } else {
            cardToPlay = player.hand.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
          }
        }
      }
      
      const newPlayers = [...players];
      const cardIndex = newPlayers[playerIndex].hand.findIndex(c => 
        c.suit === cardToPlay.suit && c.rank === cardToPlay.rank
      );
      newPlayers[playerIndex].hand.splice(cardIndex, 1);
      setPlayers(newPlayers);
      
      currentTrickCards.push({ player: player.id, card: cardToPlay });
      setCurrentTrick({ cards: currentTrickCards, winner: null });
      
      if (cardToPlay.suit === 'spades' && !spadesBroken) {
        setSpadesBroken(true);
        triggerSpadesBroken();
      }
      
      nextPlayer++;
      setTimeout(playNextAI, 500);
    };
    
    playNextAI();
  };

  const resolveTrick = (trickCards: { player: string; card: Card }[]) => {
    const leadSuit = trickCards[0].card.suit;
    let winningCard = trickCards[0].card;
    let winner = trickCards[0].player;
    
    for (let i = 1; i < trickCards.length; i++) {
      const { card, player } = trickCards[i];
      
      if (card.suit === 'spades') {
        if (winningCard.suit !== 'spades' || card.value > winningCard.value) {
          winningCard = card;
          winner = player;
        }
      } else if (card.suit === leadSuit && winningCard.suit !== 'spades') {
        if (card.value > winningCard.value) {
          winningCard = card;
          winner = player;
        }
      }
    }
    
    const newPlayers = [...players];
    const winnerIndex = newPlayers.findIndex(p => p.id === winner);
    newPlayers[winnerIndex].tricks++;
    setPlayers(newPlayers);
    
    setTrickWinner(winner);
    setTimeout(() => setTrickWinner(null), 1200);
    
    setTricks(prev => [...prev, { cards: trickCards, winner }]);
    setCurrentTrick({ cards: [], winner: null });
    setCurrentPlayer(winnerIndex);
    
    const winnerName = winner === 'you' ? 'You' : winner === 'p3' ? 'Your partner' : 'Opponent';
    setMessage(`${winnerName} won the trick!`);
    
    if (tricks.length + 1 >= 13) {
      setTimeout(scoreRound, 1500);
    }
  };

  const scoreRound = () => {
    const yourTeamBid = (yourPlayer.bid || 0) + (yourPartner.bid || 0);
    const yourTeamTricks = yourPlayer.tricks + yourPartner.tricks;
    const opponentBid = (players[1].bid || 0) + (players[3].bid || 0);
    const opponentTricks = players[1].tricks + players[3].tricks;
    
    let yourScore = 0;
    let opponentScore = 0;
    let newBags = { ...bags };
    
    if (yourTeamTricks >= yourTeamBid) {
      yourScore = yourTeamBid * 10;
      const overtricks = yourTeamTricks - yourTeamBid;
      newBags.you += overtricks;
    } else {
      yourScore = -yourTeamBid * 10;
    }
    
    if (opponentTricks >= opponentBid) {
      opponentScore = opponentBid * 10;
      const overtricks = opponentTricks - opponentBid;
      newBags.opponent += overtricks;
    } else {
      opponentScore = -opponentBid * 10;
    }
    
    if (newBags.you >= 10) {
      yourScore -= 100;
      newBags.you -= 10;
    }
    if (newBags.opponent >= 10) {
      opponentScore -= 100;
      newBags.opponent -= 10;
    }
    
    setTeamScore(prev => ({
      you: prev.you + yourScore,
      opponent: prev.opponent + opponentScore
    }));
    setBags(newBags);
    
    if (teamScore.you + yourScore >= 500 || teamScore.opponent + opponentScore >= 500) {
      const won = teamScore.you + yourScore > teamScore.opponent + opponentScore;
      if (won) {
        onWin(currentBet * 2);
        setMessage(`You won the game! +${currentBet * 2} $Pc`);
        setWinFlash(true);
        setTimeout(() => setWinFlash(false), 2000);
      } else {
        setMessage('Opponents won the game. Better luck next time!');
        setLoseFlash(true);
        setTimeout(() => setLoseFlash(false), 1500);
      }
      setGamePhase('betting');
      setCurrentBet(0);
      setTableChips([]);
    } else {
      setMessage(`Round ${round} complete! Your team: ${yourScore} pts`);
      setRound(prev => prev + 1);
      setTimeout(() => {
        setCurrentBet(0);
        setTableChips([]);
        startGame();
      }, 3000);
    }
  };

  const renderCard = (card: Card, onClick?: () => void, small = false, fanIndex?: number, fanTotal?: number) => {
    const suitSymbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    };

    const hasFan = fanIndex !== undefined && fanTotal !== undefined;
    const fanRotation = hasFan ? (fanIndex - (fanTotal - 1) / 2) * 4 : 0;
    const fanTranslateY = hasFan ? Math.abs(fanIndex - (fanTotal - 1) / 2) * 6 : 0;

    return (
      <div
        className="perspective-[600px]"
        style={{
          perspective: '600px',
          transform: hasFan ? `rotate(${fanRotation}deg) translateY(${fanTranslateY}px)` : undefined,
          transformOrigin: 'bottom center',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: hasFan ? fanIndex : undefined,
        }}
      >
        <button
          onClick={onClick}
          disabled={!onClick}
          className={`premium-card ${card.isRed ? 'red' : 'black'} relative flex flex-col items-center justify-center gap-0.5 ${onClick ? 'hover:-translate-y-4 hover:scale-110 hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] cursor-pointer hover:z-50' : ''} transition-all duration-300`}
          style={{
            width: small ? '50px' : '70px',
            height: small ? '70px' : '98px',
            animation: 'spadesCardFlip 0.4s ease-out forwards',
            transformStyle: 'preserve-3d',
            color: card.isRed ? '#c62828' : '#212121',
          }}
        >
          <span className={`font-bold ${small ? 'text-lg' : 'text-xl'}`}>{card.rank}</span>
          <span className={small ? 'text-2xl' : 'text-3xl'}>{suitSymbols[card.suit]}</span>
        </button>
      </div>
    );
  };

  const renderCardBack = (width: number, height: number, key?: number | string) => {
    const backStyle = cardBackStyle || { type: 'css' as const, style: {} };
    
    if (backStyle.type === 'image' && backStyle.image) {
      return (
        <div
          key={key}
          className="rounded-lg overflow-hidden"
          style={{ 
            width: `${width}px`, 
            height: `${height}px`,
            background: `url(${backStyle.image}) center/cover`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      );
    }
    
    return (
      <div
        key={key}
        className="playing-card playing-card-back"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    );
  };

  const playerPositionMap: Record<string, number> = { 'you': 0, 'p2': 1, 'p3': 2, 'p4': 3 };

  return (
    <CasinoEnvironment gameType="spades">
      <div className="min-h-screen bg-[#0a0a0a]">
        <style>{`
          @keyframes spadesCardFlip {
            0% { transform: rotateY(90deg) scale(0.8); opacity: 0; }
            60% { transform: rotateY(-5deg) scale(1.02); opacity: 1; }
            100% { transform: rotateY(0deg) scale(1); opacity: 1; }
          }
          @keyframes spadesSlideIn0 {
            0% { transform: translateY(60px) rotate(5deg); opacity: 0; }
            100% { transform: translateY(0) rotate(0deg); opacity: 1; }
          }
          @keyframes spadesSlideIn1 {
            0% { transform: translateX(60px) rotate(-5deg); opacity: 0; }
            100% { transform: translateX(0) rotate(0deg); opacity: 1; }
          }
          @keyframes spadesSlideIn2 {
            0% { transform: translateY(-60px) rotate(-5deg); opacity: 0; }
            100% { transform: translateY(0) rotate(0deg); opacity: 1; }
          }
          @keyframes spadesSlideIn3 {
            0% { transform: translateX(-60px) rotate(5deg); opacity: 0; }
            100% { transform: translateX(0) rotate(0deg); opacity: 1; }
          }
          @keyframes spadesBrokenFlash {
            0% { transform: scale(0.3); opacity: 0; }
            30% { transform: scale(1.3); opacity: 1; }
            60% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes trickWinGlow {
            0% { box-shadow: 0 0 10px rgba(212,175,55,0.3); }
            50% { box-shadow: 0 0 40px rgba(212,175,55,0.8), 0 0 80px rgba(212,175,55,0.4); }
            100% { box-shadow: 0 0 10px rgba(212,175,55,0.3); }
          }
          @keyframes winCelebration {
            0% { box-shadow: inset 0 0 0 rgba(67,160,71,0); }
            30% { box-shadow: inset 0 0 120px rgba(67,160,71,0.3); }
            100% { box-shadow: inset 0 0 0 rgba(67,160,71,0); }
          }
          @keyframes loseShake {
            0%, 100% { transform: translateX(0); }
            10%, 50%, 90% { transform: translateX(-4px); }
            30%, 70% { transform: translateX(4px); }
          }
          @keyframes scoreRollUp {
            0% { transform: translateY(10px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[#D4AF37]/30">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-casino font-bold text-[#D4AF37]">SPADES</span>
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

        <div className="pt-14 min-h-screen flex flex-col p-4 relative z-10">
          <div className="flex gap-4 flex-1">
            <div
              className="flex-1 relative rounded-full overflow-hidden"
              style={{
                animation: winFlash ? 'winCelebration 1.5s ease-out' : loseFlash ? 'loseShake 0.5s ease-out' : undefined,
                minHeight: '500px',
              }}
            >
              <div className="absolute inset-0 rounded-full wood-rail" style={{ borderRadius: '50%' }} />

              <div
                className="absolute inset-[16px] rounded-full premium-felt"
                style={{ borderRadius: '50%' }}
              />

              <div
                className="absolute inset-[16px] rounded-full pointer-events-none"
                style={{
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.06) 0%, transparent 60%)',
                }}
              />

              <div
                className="absolute inset-[28px] rounded-full pointer-events-none"
                style={{
                  borderRadius: '50%',
                  border: '1.5px solid rgba(212,175,55,0.2)',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
                }}
              />

              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
                <div className="text-center relative">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${players[2].color} flex items-center justify-center font-bold mb-1 mx-auto border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)]`}>
                    {players[2].avatar}
                  </div>
                  <div className="px-3 py-0.5 rounded-full bg-black/70 border border-[#D4AF37]/30 backdrop-blur-sm">
                    <div className="text-sm font-medium text-white">{players[2].name}</div>
                    <div className="text-xs text-[#C0C0C0]">
                      Bid: {players[2].bid ?? '?'} | Won: {players[2].tricks}
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {players[2].hand.map((_, i) => renderCardBack(22, 32, `top${i}`))}
                  </div>
                </div>
              </div>

              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10">
                <div className="text-center relative">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${players[3].color} flex items-center justify-center font-bold mb-1 mx-auto border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)]`}>
                    {players[3].avatar}
                  </div>
                  <div className="px-3 py-0.5 rounded-full bg-black/70 border border-[#D4AF37]/30 backdrop-blur-sm">
                    <div className="text-sm font-medium text-white">{players[3].name}</div>
                    <div className="text-xs text-[#C0C0C0]">
                      Bid: {players[3].bid ?? '?'} | Won: {players[3].tricks}
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {players[3].hand.slice(0, 6).map((_, i) => renderCardBack(22, 32, `left${i}`))}
                  </div>
                </div>
              </div>

              <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                <div className="text-center relative">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${players[1].color} flex items-center justify-center font-bold mb-1 mx-auto border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)]`}>
                    {players[1].avatar}
                  </div>
                  <div className="px-3 py-0.5 rounded-full bg-black/70 border border-[#D4AF37]/30 backdrop-blur-sm">
                    <div className="text-sm font-medium text-white">{players[1].name}</div>
                    <div className="text-xs text-[#C0C0C0]">
                      Bid: {players[1].bid ?? '?'} | Won: {players[1].tricks}
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {players[1].hand.slice(0, 6).map((_, i) => renderCardBack(22, 32, `right${i}`))}
                  </div>
                </div>
              </div>

              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 z-10"
                style={{
                  animation: trickWinner ? 'trickWinGlow 1s ease-in-out' : undefined,
                }}
              >
                <div className="absolute inset-0 border-2 border-dashed border-[#D4AF37]/15 rounded-full" />
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)',
                  }}
                />
                
                {currentTrick.cards.map((play, i) => {
                  const pIdx = playerPositionMap[play.player] ?? 0;
                  const positions = [
                    { bottom: '10px', left: '50%', transform: 'translateX(-50%)' },
                    { right: '10px', top: '50%', transform: 'translateY(-50%)' },
                    { top: '10px', left: '50%', transform: 'translateX(-50%)' },
                    { left: '10px', top: '50%', transform: 'translateY(-50%)' },
                  ];
                  return (
                    <div
                      key={`trick-${i}-${play.card.suit}-${play.card.rank}`}
                      className="absolute transition-all duration-500 ease-out"
                      style={{
                        ...positions[pIdx],
                        animation: `spadesSlideIn${pIdx} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                      }}
                    >
                      <div
                        className="drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]"
                        style={{
                          filter: trickWinner === play.player ? 'drop-shadow(0 0 12px rgba(212,175,55,0.8))' : undefined,
                        }}
                      >
                        {renderCard(play.card, undefined, true)}
                      </div>
                    </div>
                  );
                })}
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/70 px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 backdrop-blur-sm">
                  <div className="text-xs text-[#C0C0C0]">Trick {tricks.length + 1}/13</div>
                  {spadesBroken && <div className="text-xs text-[#D4AF37] font-bold">♠ Broken</div>}
                </div>
              </div>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${yourPlayer.color} flex items-center justify-center font-bold text-lg mb-1 mx-auto border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.4)]`}>
                    {yourPlayer.avatar}
                  </div>
                  <div className="px-4 py-0.5 rounded-full bg-black/70 border border-[#D4AF37]/30 backdrop-blur-sm text-center">
                    <div className="font-medium text-white">{yourPlayer.name}</div>
                    <div className="text-sm text-[#C0C0C0]">
                      Bid: {yourPlayer.bid ?? '?'} | Won: {yourPlayer.tricks}
                    </div>
                  </div>
                </div>
              </div>

              {showSpadesBroken && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div
                    className="text-9xl"
                    style={{
                      animation: 'spadesBrokenFlash 1.5s ease-out forwards',
                      textShadow: '0 0 40px rgba(212,175,55,0.8), 0 0 80px rgba(212,175,55,0.4)',
                      color: '#D4AF37',
                    }}
                  >
                    ♠
                  </div>
                </div>
              )}

              {winFlash && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div
                    className="text-6xl font-casino font-bold text-[#43A047]"
                    style={{
                      animation: 'spadesBrokenFlash 1.5s ease-out forwards',
                      textShadow: '0 0 30px rgba(67,160,71,0.8), 0 0 60px rgba(67,160,71,0.4)',
                    }}
                  >
                    WIN!
                  </div>
                </div>
              )}
            </div>

            <div
              className="w-56 flex flex-col gap-3 shrink-0"
              style={{
                background: 'linear-gradient(180deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%)',
                border: '2px solid rgba(212,175,55,0.4)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="text-center">
                <div
                  className="font-casino text-lg tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37, #FFD700, #B8860B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  SCOREBOARD
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent mt-1" />
              </div>

              <div className="text-center">
                <div className="text-xs text-[#C0C0C0] uppercase tracking-wide mb-1">Round</div>
                <div
                  className="text-3xl font-bold text-[#D4AF37]"
                  style={{ animation: 'scoreRollUp 0.4s ease-out' }}
                >
                  {round}
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(67,160,71,0.15) 0%, rgba(46,125,50,0.1) 100%)',
                    border: '1px solid rgba(67,160,71,0.3)',
                  }}
                >
                  <div className="text-xs text-[#43A047] uppercase tracking-wide font-bold mb-1">Your Team</div>
                  <div className="flex items-baseline justify-between">
                    <div
                      className="text-3xl font-bold text-[#43A047]"
                      style={{ animation: 'scoreRollUp 0.4s ease-out' }}
                      key={`ys-${teamScore.you}`}
                    >
                      {teamScore.you}
                    </div>
                    <div className="text-xs text-[#C0C0C0]">
                      <span className="text-[#D4AF37]">{bags.you}</span> bags
                    </div>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <div className="text-xs text-[#C0C0C0]">You: {yourPlayer.bid ?? '-'}</div>
                    <div className="text-xs text-[#C0C0C0]">| P3: {players[2].bid ?? '-'}</div>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(183,28,28,0.15) 0%, rgba(139,0,0,0.1) 100%)',
                    border: '1px solid rgba(183,28,28,0.3)',
                  }}
                >
                  <div className="text-xs text-[#B71C1C] uppercase tracking-wide font-bold mb-1">Opponents</div>
                  <div className="flex items-baseline justify-between">
                    <div
                      className="text-3xl font-bold text-[#B71C1C]"
                      style={{ animation: 'scoreRollUp 0.4s ease-out' }}
                      key={`os-${teamScore.opponent}`}
                    >
                      {teamScore.opponent}
                    </div>
                    <div className="text-xs text-[#C0C0C0]">
                      <span className="text-[#D4AF37]">{bags.opponent}</span> bags
                    </div>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <div className="text-xs text-[#C0C0C0]">P2: {players[1].bid ?? '-'}</div>
                    <div className="text-xs text-[#C0C0C0]">| P4: {players[3].bid ?? '-'}</div>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

              <div className="text-center">
                <div className="text-xs text-[#C0C0C0] uppercase tracking-wide mb-1">Tricks Won</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-[#43A047]">
                    <span className="font-bold text-lg">{yourPlayer.tricks + yourPartner.tricks}</span>
                    <span className="text-[#C0C0C0] text-xs"> / {(yourPlayer.bid || 0) + (yourPartner.bid || 0)}</span>
                  </div>
                  <div className="text-[#B71C1C]">
                    <span className="font-bold text-lg">{players[1].tricks + players[3].tricks}</span>
                    <span className="text-[#C0C0C0] text-xs"> / {(players[1].bid || 0) + (players[3].bid || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center mt-1">
                <div className="text-xs text-[#C0C0C0]/60">Goal: 500 pts</div>
                <div className="w-full h-2 rounded-full bg-black/50 mt-1 overflow-hidden border border-[#D4AF37]/20">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (teamScore.you / 500) * 100)}%`,
                      background: 'linear-gradient(90deg, #43A047, #66BB6A)',
                    }}
                  />
                </div>
                <div className="w-full h-2 rounded-full bg-black/50 mt-1 overflow-hidden border border-[#B71C1C]/20">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (teamScore.opponent / 500) * 100)}%`,
                      background: 'linear-gradient(90deg, #B71C1C, #E53935)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="text-center my-3">
              <div className="inline-block px-6 py-3 rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40 font-bold backdrop-blur-sm shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                {message}
              </div>
            </div>
          )}

          <div
            className="border-t-2 p-4 rounded-xl mt-2"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(5,5,5,0.98) 100%)',
              borderColor: 'rgba(93,64,55,0.6)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {gamePhase === 'betting' && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center text-[#C0C0C0] text-sm mb-2 uppercase tracking-wider">Select Chip Value</div>
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

                <div className="flex items-center justify-center gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-[#C0C0C0] text-xs mb-1">CURRENT BET</div>
                    <div className="text-3xl font-bold text-[#D4AF37]">{currentBet} $Pc</div>
                  </div>

                  <button
                    onClick={() => addChipToBet(selectedChip)}
                    className="relative w-24 h-24 rounded-full border-4 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all bg-black/40 flex items-center justify-center hover:shadow-[0_0_25px_rgba(212,175,55,0.3)]"
                  >
                    {tableChips.length > 0 ? (
                      <div className="relative">
                        {tableChips.map((chip, i) => (
                          <div key={i} className="absolute" style={{ 
                            transform: `translate(${Math.sin(i * 0.5) * 5}px, ${-i * 4}px)`,
                            zIndex: tableChips.length - i 
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

                <Button 
                  onClick={startGame} 
                  className="w-full btn-primary py-5 text-xl font-bold"
                  disabled={currentBet === 0}
                >
                  START GAME
                </Button>
              </div>
            )}

            {gamePhase === 'bidding' && (
              <div className="max-w-2xl mx-auto text-center">
                <div className="text-[#C0C0C0] mb-2">How many tricks will you win? (0-13)</div>
                <div className="flex gap-2 justify-center flex-wrap">
                  {Array.from({ length: 14 }, (_, i) => i).map(bid => (
                    <button
                      key={bid}
                      onClick={() => placeBid(bid)}
                      className="w-10 h-10 rounded-lg bg-[#5D4037]/50 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold transition-all border border-[#D4AF37]/30 hover:scale-110 hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    >
                      {bid}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gamePhase === 'playing' && (
              <div className="flex justify-center items-end gap-0 flex-wrap py-2" style={{ minHeight: '120px' }}>
                {yourPlayer.hand.map((card, i) => (
                  <div
                    key={`hand-${card.suit}-${card.rank}`}
                    style={{
                      marginLeft: i === 0 ? 0 : '-12px',
                    }}
                  >
                    {renderCard(card, () => playCard(i), false, i, yourPlayer.hand.length)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-2xl text-gradient-gold">
                Spades Rules
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Objective</h3>
                <p className="text-gray-300">{spadesRules.objective}</p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">The Deck</h3>
                <ul className="space-y-1 text-gray-300">
                  {spadesRules.deck.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37]">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Gameplay</h3>
                <ul className="space-y-1 text-gray-300">
                  {spadesRules.gameplay.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37] font-bold">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Scoring</h3>
                <ul className="space-y-1 text-gray-300">
                  {spadesRules.scoring.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#D4AF37]">•</span>
                      {item}
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
