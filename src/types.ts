// PawnCoin Casino Types

export interface User {
  id: string;
  username: string;
  avatar: string;
  balance: number;
  isConnected: boolean;
  walletAddress?: string;
  socialProvider?: 'google' | 'twitter' | 'discord' | 'telegram' | 'wallet';
}

export interface UnifiedUser {
  id: string;
  username: string;
  email?: string;
  walletAddress?: string;
  socialProvider?: 'google' | 'twitter' | 'discord' | 'telegram';
  balance: number;
  avatar: string;
  isAdmin?: boolean;
  twoFactorEnabled?: boolean;
  withdrawAddress?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus';
  amount: number;
  game?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
}

export interface GameTable {
  id: string;
  game: string;
  name: string;
  minBet: number;
  maxBet: number;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  pot?: number;
}

export interface Player {
  id: string;
  username: string;
  avatar: string;
  balance: number;
  seat: number;
  isActive: boolean;
  isDealer?: boolean;
  cards?: Card[];
  bet?: number;
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  isRed: boolean;
  value: number;
}

export interface ChipStyle {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  pattern: 'solid' | 'striped' | 'dotted' | 'custom';
}

export interface SportsBet {
  id: string;
  event: string;
  sport: string;
  selection: string;
  odds: number;
  amount: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
  startTime: Date;
}

export interface LiveEvent {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'upcoming' | 'live' | 'finished';
  startTime: Date;
  odds: {
    home: number;
    away: number;
    draw?: number;
    spread?: { home: number; away: number };
    total?: { over: number; under: number; line: number };
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: Date;
  tableId?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  genre: string;
}

export interface VappTVChannel {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  isLive: boolean;
  requiresAuth: boolean;
}

export interface GameRules {
  game: string;
  description: string;
  objective: string;
  gameplay: string[];
  betting: string[];
  winning: string[];
  variations: string[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export type GameType = 'poker' | 'blackjack' | 'roulette' | 'craps' | 'spades' | 'slots' | 'bingo' | 'dominoes' | 'sports' | 'pool' | 'darts' | 'vip';

export type PokerHand = 
  | 'high_card' 
  | 'pair' 
  | 'two_pair' 
  | 'three_of_a_kind' 
  | 'straight' 
  | 'flush' 
  | 'full_house' 
  | 'four_of_a_kind' 
  | 'straight_flush' 
  | 'royal_flush';

export interface PokerGameState {
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerPosition: number;
  smallBlind: number;
  bigBlind: number;
}

export interface BlackjackHand {
  cards: Card[];
  value: number;
  isBust: boolean;
  isBlackjack: boolean;
  isStanding: boolean;
}

export interface RouletteBet {
  type: 'single' | 'split' | 'street' | 'corner' | 'line' | 'dozen' | 'column' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high';
  numbers: number[];
  amount: number;
  payout: number;
}

export interface CrapsBet {
  type: 'pass' | 'dontpass' | 'come' | 'dontcome' | 'field' | 'place' | 'hardway' | 'any7' | 'anycraps';
  number?: number;
  amount: number;
  payout: number;
}

export interface SpadesBid {
  player: string;
  bid: number;
  tricks: number;
}

export interface SpadesGameState {
  round: number;
  bids: SpadesBid[];
  currentTrick: Card[];
  trumpSuit: 'spades';
  nilAllowed: boolean;
  blindNilAllowed: boolean;
  sandbagPenalty: boolean;
}
