import { useEffect, useState } from 'react';
import { usePokerVoice } from '@/hooks/useGameVoice';
import type { Card } from '@/types';

interface PokerHandAnalyzerProps {
  holeCards: Card[];
  communityCards: Card[];
  isVisible: boolean;
}

interface HandAnalysis {
  handName: string;
  handRank: number;
  winProbability: number;
  description: string;
  advice: string;
}

// Evaluate hand strength
function evaluateHand(cards: Card[]): { rank: number; name: string; kickers: number[] } {
  if (cards.length < 5) return { rank: 0, name: 'High Card', kickers: [] };

  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  // Count occurrences
  const valueCounts: Record<number, number> = {};
  values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);

  // Check for flush
  const suitCounts: Record<string, number> = {};
  suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
  const flushSuit = Object.entries(suitCounts).find(([, count]) => count >= 5)?.[0];
  const isFlush = !!flushSuit;

  // Check for straight
  const uniqueValues = [...new Set(values)];
  let isStraight = false;
  let straightHigh = 0;

  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
      isStraight = true;
      straightHigh = uniqueValues[i];
    }
  }
  // Check for A-5 straight (wheel)
  if (uniqueValues.includes(14) && uniqueValues.includes(5) && uniqueValues.includes(4) && 
      uniqueValues.includes(3) && uniqueValues.includes(2)) {
    isStraight = true;
    straightHigh = 5;
  }

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    const flushCards = sorted.filter(c => c.suit === flushSuit);
    if (flushCards.some(c => c.value === 14) && flushCards.some(c => c.value === 13)) {
      return { rank: 9, name: 'Royal Flush', kickers: [] };
    }
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 8, name: 'Straight Flush', kickers: [straightHigh] };
  }

  // Four of a Kind
  const quads = Object.entries(valueCounts).find(([, count]) => count === 4);
  if (quads) {
    const kicker = values.find(v => v !== parseInt(quads[0]));
    return { rank: 7, name: 'Four of a Kind', kickers: [parseInt(quads[0]), kicker || 0] };
  }

  // Full House
  const trips = Object.entries(valueCounts).find(([, count]) => count === 3);
  const pair = Object.entries(valueCounts).find(([, count]) => count === 2);
  if (trips && pair) {
    return { rank: 6, name: 'Full House', kickers: [parseInt(trips[0]), parseInt(pair[0])] };
  }

  // Flush
  if (isFlush) {
    const flushCards = sorted.filter(c => c.suit === flushSuit).slice(0, 5);
    return { rank: 5, name: 'Flush', kickers: flushCards.map(c => c.value) };
  }

  // Straight
  if (isStraight) {
    return { rank: 4, name: 'Straight', kickers: [straightHigh] };
  }

  // Three of a Kind
  if (trips) {
    const tripValue = parseInt(trips[0]);
    const kickers = values.filter(v => v !== tripValue).slice(0, 2);
    return { rank: 3, name: 'Three of a Kind', kickers: [tripValue, ...kickers] };
  }

  // Two Pair
  const pairs = Object.entries(valueCounts).filter(([, count]) => count === 2);
  if (pairs.length >= 2) {
    const pairValues = pairs.map(p => parseInt(p[0])).sort((a, b) => b - a).slice(0, 2);
    const kicker = values.find(v => !pairValues.includes(v));
    return { rank: 2, name: 'Two Pair', kickers: [...pairValues, kicker || 0] };
  }

  // Pair
  if (pairs.length === 1) {
    const pairValue = parseInt(pairs[0][0]);
    const kickers = values.filter(v => v !== pairValue).slice(0, 3);
    return { rank: 1, name: 'Pair', kickers: [pairValue, ...kickers] };
  }

  // High Card
  return { rank: 0, name: 'High Card', kickers: values.slice(0, 5) };
}

// Calculate win probability based on hand strength and game phase
function calculateWinProbability(handRank: number, numCards: number): number {
  // Base probabilities by hand rank
  const baseProbs: Record<number, number> = {
    0: 15, // High Card
    1: 35, // Pair
    2: 55, // Two Pair
    3: 70, // Three of a Kind
    4: 75, // Straight
    5: 80, // Flush
    6: 88, // Full House
    7: 95, // Four of a Kind
    8: 98, // Straight Flush
    9: 100, // Royal Flush
  };

  let prob = baseProbs[handRank] || 15;

  // Adjust based on how many cards are dealt (more cards = more accurate)
  if (numCards === 2) {
    prob *= 0.6; // Preflop - less certainty
  } else if (numCards === 5) {
    prob *= 0.85; // Flop
  } else if (numCards === 6) {
    prob *= 0.95; // Turn
  }

  return Math.min(Math.round(prob), 100);
}

// Get advice based on hand and game phase
function getAdvice(handRank: number, numCards: number): string {
  if (handRank >= 9) return "Royal Flush! All in! This is unbeatable!";
  if (handRank >= 8) return "Straight Flush! Monster hand - bet big!";
  if (handRank >= 7) return "Four of a Kind! All in! You have a monster hand!";
  if (handRank >= 6) return "Full House! Strong hand - raise confidently!";
  if (handRank >= 5) return "Flush! Strong hand. Consider raising.";
  if (handRank >= 4) return "Straight! Good hand. Bet or raise.";
  if (handRank >= 3) return "Three of a Kind! Decent hand. Call or raise.";
  if (handRank === 2) return "Two Pair! Playable hand. Call or raise small.";
  if (handRank === 1) {
    // Pair - give more nuanced advice based on card count
    if (numCards === 2) return "Pair in hand. Decent starting hand. Call to see the flop.";
    if (numCards === 5) return "One pair. Marginal but playable. Check or call.";
    return "One pair. Decent hand. Consider calling.";
  }
  // High card - don't be too aggressive with fold advice
  if (numCards === 2) return "High cards. Consider calling to see the flop.";
  if (numCards >= 5) return "High card only. Check or fold if there's a bet.";
  return "High card. Marginal - check or call small bets.";
}

export function PokerHandAnalyzer({ holeCards, communityCards, isVisible }: PokerHandAnalyzerProps) {
  const [analysis, setAnalysis] = useState<HandAnalysis | null>(null);
  const [hasAnnounced, setHasAnnounced] = useState(false);
  const { announceHand, isSupported } = usePokerVoice();

  useEffect(() => {
    if (holeCards.length === 0) {
      setAnalysis(null);
      setHasAnnounced(false);
      return;
    }

    const allCards = [...holeCards, ...communityCards];
    const { rank, name } = evaluateHand(allCards);
    const winProb = calculateWinProbability(rank, allCards.length);
    const advice = getAdvice(rank, allCards.length);

    let description = name;
    if (name === 'Pair') {
      const pairValue = holeCards[0]?.value === holeCards[1]?.value 
        ? holeCards[0]?.rank 
        : holeCards.find(c => communityCards.some(cc => cc.value === c.value))?.rank;
      description = `Pair of ${pairValue || 'cards'}`;
    } else if (name === 'High Card') {
      description = `High card ${holeCards[0]?.rank}`;
    }

    const newAnalysis = {
      handName: name,
      handRank: rank,
      winProbability: winProb,
      description,
      advice,
    };

    setAnalysis(newAnalysis);

    // Announce hand when it improves or on significant change
    if (isSupported && !hasAnnounced && rank >= 1 && isVisible) {
      announceHand(description, winProb);
      setHasAnnounced(true);
    }
  }, [holeCards, communityCards, isVisible, hasAnnounced, announceHand, isSupported]);

  if (!isVisible || !analysis) return null;

  // Get color based on hand strength
  const getStrengthColor = (rank: number) => {
    if (rank >= 7) return 'from-red-500 to-red-700';
    if (rank >= 5) return 'from-orange-500 to-orange-700';
    if (rank >= 3) return 'from-yellow-500 to-yellow-700';
    if (rank >= 1) return 'from-blue-500 to-blue-700';
    return 'from-gray-500 to-gray-700';
  };

  const getProbColor = (prob: number) => {
    if (prob >= 80) return 'text-green-400';
    if (prob >= 50) return 'text-yellow-400';
    if (prob >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div 
      className="fixed bottom-4 left-4 z-40 p-4 rounded-xl max-w-xs"
      style={{
        background: 'linear-gradient(145deg, rgba(10,10,10,0.95), rgba(5,5,5,0.98))',
        border: '2px solid rgba(212,175,55,0.5)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div 
          className={`w-3 h-3 rounded-full bg-gradient-to-br ${getStrengthColor(analysis.handRank)}`}
          style={{ boxShadow: '0 0 10px currentColor' }}
        />
        <span className="text-xs text-[#808080] uppercase tracking-wider">Your Hand</span>
        {isSupported && (
          <button
            onClick={() => announceHand(analysis.description, analysis.winProbability)}
            className="ml-auto text-[#D4AF37] hover:text-[#FFD700] transition-colors"
            title="Read aloud"
          >
            🔊
          </button>
        )}
      </div>

      {/* Hand Name */}
      <div className="text-xl font-bold text-white mb-2">
        {analysis.description}
      </div>

      {/* Win Probability */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[#808080]">Win Probability</span>
          <span className={`font-bold ${getProbColor(analysis.winProbability)}`}>
            {analysis.winProbability}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#5D4037]/50 overflow-hidden">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getStrengthColor(analysis.handRank)} transition-all duration-500`}
            style={{ width: `${analysis.winProbability}%` }}
          />
        </div>
      </div>

      {/* Advice */}
      <div 
        className="p-2 rounded-lg text-sm"
        style={{
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.3)',
        }}
      >
        <span className="text-[#D4AF37]">💡</span>{' '}
        <span className="text-[#C0C0C0]">{analysis.advice}</span>
      </div>

      {/* Privacy notice */}
      <div className="mt-2 text-[10px] text-[#606060] text-center">
        Only you can see this
      </div>
    </div>
  );
}
