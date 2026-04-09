import type { Card } from '@/types';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'elite';

interface AIPlayer {
  id: string;
  hand: Card[];
  bid: number | null;
  tricks: number;
  nilBid?: boolean;
  blindNilBid?: boolean;
}

interface TrickCard {
  player: string;
  card: Card;
}

interface AIContext {
  player: AIPlayer;
  playerIndex: number;
  allPlayers: AIPlayer[];
  currentTrick: TrickCard[];
  tricksPlayed: number;
  spadesBroken: boolean;
  difficulty: AIDifficulty;
  partnerIndex: number;
}

function getCardPower(card: Card, leadSuit: string | null): number {
  if (card.suit === 'spades') return 100 + card.value;
  if (leadSuit && card.suit === leadSuit) return 50 + card.value;
  return card.value;
}

function isWinning(card: Card, trick: TrickCard[]): boolean {
  if (trick.length === 0) return true;
  const leadSuit = trick[0].card.suit;
  let bestCard = trick[0].card;
  for (const t of trick) {
    if (t.card.suit === 'spades') {
      if (bestCard.suit !== 'spades' || t.card.value > bestCard.value) bestCard = t.card;
    } else if (t.card.suit === leadSuit && bestCard.suit !== 'spades') {
      if (t.card.value > bestCard.value) bestCard = t.card;
    }
  }
  if (card.suit === 'spades') return bestCard.suit !== 'spades' || card.value > bestCard.value;
  if (card.suit === leadSuit) return bestCard.suit !== 'spades' && card.value > bestCard.value;
  return false;
}

function getLeadSuit(trick: TrickCard[]): string | null {
  return trick.length > 0 ? trick[0].card.suit : null;
}

function getLegalCards(hand: Card[], trick: TrickCard[], spadesBroken: boolean): Card[] {
  if (trick.length === 0) {
    if (!spadesBroken) {
      const nonSpades = hand.filter(c => c.suit !== 'spades');
      return nonSpades.length > 0 ? nonSpades : hand;
    }
    return hand;
  }
  const leadSuit = trick[0].card.suit;
  const followers = hand.filter(c => c.suit === leadSuit);
  return followers.length > 0 ? followers : hand;
}

export function calculateAIBid(
  hand: Card[],
  difficulty: AIDifficulty,
  nilAllowed: boolean,
  blindNilAllowed: boolean
): { bid: number; nilBid: boolean; blindNilBid: boolean } {
  const spades = hand.filter(c => c.suit === 'spades');
  const highCards = hand.filter(c => c.rank === 'A' || c.rank === 'K');
  const medCards = hand.filter(c => c.rank === 'Q' || c.rank === 'J');

  let estimatedTricks: number;

  switch (difficulty) {
    case 'easy':
      estimatedTricks = Math.floor(Math.random() * 5) + 1;
      break;
    case 'medium':
      estimatedTricks = Math.floor(spades.length * 0.6 + highCards.length * 0.5);
      estimatedTricks = Math.max(1, Math.min(13, estimatedTricks));
      break;
    case 'hard': {
      const highSpades = spades.filter(c => c.rank === 'A' || c.rank === 'K' || c.rank === 'Q').length;
      estimatedTricks = Math.floor(highSpades * 0.9 + (spades.length - highSpades) * 0.5 + highCards.length * 0.6 + medCards.length * 0.2);
      estimatedTricks = Math.max(1, Math.min(13, estimatedTricks));
      break;
    }
    case 'elite': {
      let score = 0;
      for (const card of hand) {
        if (card.suit === 'spades') {
          if (card.rank === 'A') score += 1.0;
          else if (card.rank === 'K') score += 0.85;
          else if (card.rank === 'Q') score += 0.7;
          else if (card.rank === 'J') score += 0.5;
          else if (card.value >= 9) score += 0.35;
          else score += 0.15;
        } else {
          if (card.rank === 'A') score += 0.85;
          else if (card.rank === 'K') score += 0.6;
          else if (card.rank === 'Q') score += 0.35;
          else if (card.rank === 'J') score += 0.15;
        }
      }
      estimatedTricks = Math.round(score);
      estimatedTricks = Math.max(1, Math.min(13, estimatedTricks));
      break;
    }
  }

  if (nilAllowed && difficulty !== 'easy') {
    const nilChance = hand.filter(c => c.rank === 'A' || c.rank === 'K').length;
    if (nilChance === 0 && spades.filter(c => c.value > 8).length === 0) {
      return { bid: 0, nilBid: true, blindNilBid: false };
    }
  }

  return { bid: estimatedTricks, nilBid: false, blindNilBid: false };
}

export function chooseAICard(ctx: AIContext): Card {
  const { player, playerIndex, allPlayers, currentTrick, tricksPlayed, spadesBroken, difficulty, partnerIndex } = ctx;
  const legal = getLegalCards(player.hand, currentTrick, spadesBroken);
  const leadSuit = getLeadSuit(currentTrick);
  const isNil = player.nilBid || player.blindNilBid;
  const partner = allPlayers[partnerIndex];
  const partnerPlayed = currentTrick.find(t => t.player === partner?.id);

  if (difficulty === 'easy') {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  if (isNil) {
    const nonWinning = legal.filter(c => !isWinning(c, currentTrick));
    if (nonWinning.length > 0) {
      return nonWinning.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
    }
    return legal.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
  }

  const tricksNeeded = (player.bid || 1) - player.tricks;
  const tricksLeft = 13 - tricksPlayed;

  if (difficulty === 'medium') {
    if (currentTrick.length === 0) {
      const nonSpades = legal.filter(c => c.suit !== 'spades');
      const pool = nonSpades.length > 0 ? nonSpades : legal;
      return pool.reduce((h, c) => c.value > h.value ? c : h);
    }
    const partnerWinningMed = partnerPlayed ? isWinning(partnerPlayed.card, currentTrick) : false;
    if (partnerWinningMed) {
      return legal.reduce((l, c) => c.value < l.value ? c : l);
    }
    const following = leadSuit ? legal.filter(c => c.suit === leadSuit) : [];
    if (following.length > 0) {
      return following.reduce((h, c) => c.value > h.value ? c : h);
    }
    const spadeCards = legal.filter(c => c.suit === 'spades');
    if (spadeCards.length > 0 && !currentTrick.some(t => t.card.suit === 'spades')) {
      return spadeCards.reduce((l, c) => c.value < l.value ? c : l);
    }
    return legal.reduce((l, c) => c.value < l.value ? c : l);
  }

  if (difficulty === 'hard' || difficulty === 'elite') {
    if (currentTrick.length === 0) {
      if (tricksNeeded <= 0) {
        const lowCards = legal.filter(c => c.suit !== 'spades' && c.value < 9);
        if (lowCards.length > 0) return lowCards.reduce((l, c) => c.value < l.value ? c : l);
        return legal.reduce((l, c) => c.value < l.value ? c : l);
      }
      const aces = legal.filter(c => c.rank === 'A');
      if (aces.length > 0) return aces[0];
      const kings = legal.filter(c => c.rank === 'K');
      if (kings.length > 0) return kings[0];
      const highSpades = legal.filter(c => c.suit === 'spades' && c.value > 10);
      if (highSpades.length > 0 && tricksLeft <= 4) return highSpades[0];
      const nonSpades = legal.filter(c => c.suit !== 'spades');
      if (nonSpades.length > 0) return nonSpades.reduce((h, c) => c.value > h.value ? c : h);
      return legal.reduce((h, c) => c.value > h.value ? c : h);
    }

    const partnerWinning = partnerPlayed ? isWinning(partnerPlayed.card, currentTrick) : false;

    if (partnerWinning) {
      return legal.reduce((l, c) => c.value < l.value ? c : l);
    }

    const canWin = legal.filter(c => isWinning(c, currentTrick));
    if (canWin.length > 0 && (tricksNeeded > 0 || tricksLeft <= 2)) {
      return canWin.reduce((l, c) => {
        const lp = getCardPower(l, leadSuit);
        const cp = getCardPower(c, leadSuit);
        return cp < lp ? c : l;
      });
    }

    const throwaway = legal.filter(c => !isWinning(c, currentTrick));
    if (throwaway.length > 0) {
      return throwaway.reduce((l, c) => c.value < l.value ? c : l);
    }

    return legal.reduce((l, c) => c.value < l.value ? c : l);
  }

  return legal[0];
}
