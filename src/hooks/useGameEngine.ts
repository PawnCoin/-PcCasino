import type { Card, PokerHand } from '@/types';

export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      const isRed = suit === 'hearts' || suit === 'diamonds';
      let value: number;
      if (rank === 'A') value = 11;
      else if (['J', 'Q', 'K'].includes(rank)) value = 10;
      else value = parseInt(rank);

      deck.push({ suit, rank, isRed, value });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateBlackjackValue(cards: Card[]): number {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return calculateBlackjackValue(cards) === 21;
}

export function getRankValue(rank: Card['rank']): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
}

function getHandScore(cards: Card[]): { score: number; hand: PokerHand; rankLabel: number } {
  if (cards.length < 5) return { score: 0, hand: 'high_card', rankLabel: 1 };

  const ranks = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const rankCounts: Record<number, number> = {};
  for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1;

  const groups = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: Number(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = new Set(ranks).size === 5 && ranks[0] - ranks[4] === 4;
  let isWheel = false;
  if (!isStraight && new Set(ranks).size === 5) {
    const sorted = [...ranks].sort((a, b) => a - b);
    if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5 && sorted[4] === 14) {
      isStraight = true;
      isWheel = true;
    }
  }

  const straightHigh = isWheel ? 5 : ranks[0];

  let handRank: number;
  let hand: PokerHand;
  let scoreCards: number[];

  if (isFlush && isStraight && ranks[0] === 14 && !isWheel) {
    handRank = 10; hand = 'royal_flush'; scoreCards = [14];
  } else if (isFlush && isStraight) {
    handRank = 9; hand = 'straight_flush'; scoreCards = [straightHigh];
  } else if (groups[0].count === 4) {
    handRank = 8; hand = 'four_of_a_kind'; scoreCards = [groups[0].rank, groups[1].rank];
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    handRank = 7; hand = 'full_house'; scoreCards = [groups[0].rank, groups[1].rank];
  } else if (isFlush) {
    handRank = 6; hand = 'flush'; scoreCards = ranks;
  } else if (isStraight) {
    handRank = 5; hand = 'straight'; scoreCards = [straightHigh];
  } else if (groups[0].count === 3) {
    handRank = 4; hand = 'three_of_a_kind';
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a);
    scoreCards = [groups[0].rank, ...kickers];
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    handRank = 3; hand = 'two_pair';
    const pairs = groups.filter(g => g.count === 2).map(g => g.rank).sort((a, b) => b - a);
    const kicker = groups.find(g => g.count === 1)?.rank || 0;
    scoreCards = [...pairs, kicker];
  } else if (groups[0].count === 2) {
    handRank = 2; hand = 'pair';
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a);
    scoreCards = [groups[0].rank, ...kickers];
  } else {
    handRank = 1; hand = 'high_card'; scoreCards = ranks;
  }

  let score = handRank * 1e10;
  for (let i = 0; i < scoreCards.length && i < 5; i++) {
    score += scoreCards[i] * Math.pow(15, 4 - i);
  }
  return { score, hand, rankLabel: handRank };
}

export function getBestHand(cards: Card[]): { score: number; hand: PokerHand; bestCards: Card[] } {
  if (cards.length <= 5) {
    const result = getHandScore(cards);
    return { score: result.score, hand: result.hand, bestCards: cards };
  }

  let bestScore = 0;
  let bestCards: Card[] = cards.slice(0, 5);
  let bestHand: PokerHand = 'high_card';

  const n = cards.length;
  for (let i = 0; i < n - 4; i++)
    for (let j = i + 1; j < n - 3; j++)
      for (let k = j + 1; k < n - 2; k++)
        for (let l = k + 1; l < n - 1; l++)
          for (let m = l + 1; m < n; m++) {
            const combo = [cards[i], cards[j], cards[k], cards[l], cards[m]];
            const result = getHandScore(combo);
            if (result.score > bestScore) {
              bestScore = result.score;
              bestCards = combo;
              bestHand = result.hand;
            }
          }

  return { score: bestScore, hand: bestHand, bestCards };
}

export function evaluatePokerHand(cards: Card[]): { hand: PokerHand; value: number } {
  if (cards.length < 5) return { hand: 'high_card', value: 0 };

  if (cards.length > 5) {
    const best = getBestHand(cards);
    const valueMap: Record<PokerHand, number> = {
      royal_flush: 10, straight_flush: 9, four_of_a_kind: 8, full_house: 7,
      flush: 6, straight: 5, three_of_a_kind: 4, two_pair: 3, pair: 2, high_card: 1,
    };
    return { hand: best.hand, value: valueMap[best.hand] };
  }

  const result = getHandScore(cards);
  return { hand: result.hand, value: result.rankLabel };
}
