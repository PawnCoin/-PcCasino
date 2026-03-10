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

function getRankValue(rank: Card['rank']): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
}

export function evaluatePokerHand(cards: Card[]): { hand: PokerHand; value: number } {
  if (cards.length < 5) return { hand: 'high_card', value: 0 };

  const ranks = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const rankCounts: Record<number, number> = {};
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  }

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = ranks.length === 5 &&
    ranks[0] - ranks[4] === 4 &&
    new Set(ranks).size === 5;

  const isRoyalFlush = isFlush && isStraight && ranks[0] === 14;

  if (isRoyalFlush) return { hand: 'royal_flush', value: 10 };
  if (isFlush && isStraight) return { hand: 'straight_flush', value: 9 };
  if (counts[0] === 4) return { hand: 'four_of_a_kind', value: 8 };
  if (counts[0] === 3 && counts[1] === 2) return { hand: 'full_house', value: 7 };
  if (isFlush) return { hand: 'flush', value: 6 };
  if (isStraight) return { hand: 'straight', value: 5 };
  if (counts[0] === 3) return { hand: 'three_of_a_kind', value: 4 };
  if (counts[0] === 2 && counts[1] === 2) return { hand: 'two_pair', value: 3 };
  if (counts[0] === 2) return { hand: 'pair', value: 2 };
  return { hand: 'high_card', value: 1 };
}
