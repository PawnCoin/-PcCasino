import { BaseGameEngine } from './BaseGameEngine.js';

const RANK_ORDER = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
const PARTNER_MAP = { 0: 2, 1: 3, 2: 0, 3: 1 };

function cardRank(card) { return RANK_ORDER[card.value] || 0; }

export class SpadesEngine extends BaseGameEngine {
  constructor() {
    super('spades', { minPlayers: 4, maxPlayers: 4 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      hands: {},
      bids: {},
      tricks: {},
      teamScores: { team1: 0, team2: 0 },
      bags: { team1: 0, team2: 0 },
      currentTrick: [],
      trickLeader: null,
      spadesBroken: false,
      round: 1,
      phase: 'bidding',
      completedTricks: [],
      targetScore: options.targetScore || 500,
      lastTrickWinner: null,
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size !== 4) return;
    room.state = 'playing';
    this.initProvablyFair(room);
    this.dealCards(room);
    room.phase = 'bidding';
    room.gameState.phase = 'bidding';

    const entries = this.getPlayerArray(room);
    room.gameState.bids = {};
    room.gameState.tricks = {};
    for (const [sid] of entries) {
      room.gameState.tricks[sid] = 0;
    }

    this.broadcastState(room);
    this.setTurn(room, entries[0][0]);
  }

  dealCards(room) {
    const gs = room.gameState;
    const deck = this.shuffleDeck(room);
    const entries = this.getPlayerArray(room);
    gs.hands = {};
    for (let i = 0; i < 4; i++) {
      const [sid] = entries[i];
      gs.hands[sid] = deck.slice(i * 13, (i + 1) * 13).sort((a, b) => {
        const suitOrder = { '♥': 0, '♣': 1, '♦': 2, '♠': 3 };
        return (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0) || cardRank(b) - cardRank(a);
      });
    }
    gs.currentTrick = [];
    gs.spadesBroken = false;
    gs.completedTricks = [];
    for (const [sid] of entries) {
      gs.tricks[sid] = 0;
    }
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;
    if (room.turnPlayerId !== socketId) return;

    const gs = room.gameState;
    switch (action) {
      case 'bid': this.handleBid(room, socketId, data); break;
      case 'playCard': this.handlePlayCard(room, socketId, data); break;
      default: return;
    }
  }

  handleBid(room, socketId, data) {
    const gs = room.gameState;
    if (gs.phase !== 'bidding') return;
    const bid = parseInt(data?.bid);
    if (isNaN(bid) || bid < 0 || bid > 13) return;

    gs.bids[socketId] = { amount: bid, nil: bid === 0 };
    this.broadcastToRoom(room, 'spades:bid', { socketId, bid });

    const entries = this.getPlayerArray(room);
    if (Object.keys(gs.bids).length === 4) {
      gs.phase = 'playing';
      room.phase = 'playing';
      gs.trickLeader = entries[0][0];
      this.broadcastState(room);
      this.setTurn(room, entries[0][0]);
    } else {
      const currentIdx = entries.findIndex(([sid]) => sid === socketId);
      const nextSid = entries[(currentIdx + 1) % 4][0];
      this.broadcastState(room);
      this.setTurn(room, nextSid);
    }
  }

  handlePlayCard(room, socketId, data) {
    const gs = room.gameState;
    if (gs.phase !== 'playing') return;

    const cardIdx = data?.cardIndex;
    const hand = gs.hands[socketId];
    if (!hand || cardIdx == null || cardIdx < 0 || cardIdx >= hand.length) return;

    const card = hand[cardIdx];
    if (!this.isLegalPlay(room, socketId, card)) return;

    hand.splice(cardIdx, 1);
    gs.currentTrick.push({ socketId, card });

    if (card.suit === '♠' && !gs.spadesBroken) {
      gs.spadesBroken = true;
      this.broadcastToRoom(room, 'spades:broken', {});
    }

    this.broadcastToRoom(room, 'spades:cardPlayed', { socketId, card });

    if (gs.currentTrick.length === 4) {
      this.resolveTrick(room);
    } else {
      const entries = this.getPlayerArray(room);
      const currentIdx = entries.findIndex(([sid]) => sid === socketId);
      const nextSid = entries[(currentIdx + 1) % 4][0];
      this.broadcastState(room);
      this.setTurn(room, nextSid);
    }
  }

  isLegalPlay(room, socketId, card) {
    const gs = room.gameState;
    const hand = gs.hands[socketId];
    if (!hand) return false;

    if (gs.currentTrick.length === 0) {
      if (card.suit === '♠' && !gs.spadesBroken) {
        return !hand.some(c => c.suit !== '♠');
      }
      return true;
    }

    const leadSuit = gs.currentTrick[0].card.suit;
    if (card.suit === leadSuit) return true;
    return !hand.some(c => c.suit === leadSuit);
  }

  resolveTrick(room) {
    const gs = room.gameState;
    const trick = gs.currentTrick;
    const leadSuit = trick[0].card.suit;

    let winningSid = trick[0].socketId;
    let winningCard = trick[0].card;

    for (let i = 1; i < trick.length; i++) {
      const { socketId, card } = trick[i];
      if (card.suit === '♠' && winningCard.suit !== '♠') {
        winningSid = socketId; winningCard = card;
      } else if (card.suit === winningCard.suit && cardRank(card) > cardRank(winningCard)) {
        winningSid = socketId; winningCard = card;
      }
    }

    gs.tricks[winningSid] = (gs.tricks[winningSid] || 0) + 1;
    gs.lastTrickWinner = winningSid;
    gs.completedTricks.push({ cards: [...trick], winner: winningSid });

    this.broadcastToRoom(room, 'spades:trickWon', { winner: winningSid, trick: [...trick] });

    gs.currentTrick = [];

    if (gs.completedTricks.length === 13) {
      this.scoreRound(room);
    } else {
      gs.trickLeader = winningSid;
      this.broadcastState(room);
      this.setTurn(room, winningSid);
    }
  }

  async scoreRound(room) {
    const gs = room.gameState;
    room.phase = 'scoring';
    const entries = this.getPlayerArray(room);

    const team1Sids = [entries[0][0], entries[2][0]];
    const team2Sids = [entries[1][0], entries[3][0]];

    const calcTeamScore = (sids) => {
      let totalBid = 0, totalTricks = 0, score = 0;
      let nilBonus = 0;

      for (const sid of sids) {
        const bid = gs.bids[sid]?.amount || 0;
        const tricks = gs.tricks[sid] || 0;
        if (gs.bids[sid]?.nil) {
          nilBonus += tricks === 0 ? 100 : -100;
        } else {
          totalBid += bid;
          totalTricks += tricks;
        }
      }

      if (totalTricks >= totalBid) {
        score = totalBid * 10;
        const bags = totalTricks - totalBid;
        score += bags;
        return { score: score + nilBonus, bags };
      } else {
        return { score: -totalBid * 10 + nilBonus, bags: 0 };
      }
    };

    const team1Result = calcTeamScore(team1Sids);
    const team2Result = calcTeamScore(team2Sids);

    gs.teamScores.team1 += team1Result.score;
    gs.teamScores.team2 += team2Result.score;
    gs.bags.team1 += team1Result.bags;
    gs.bags.team2 += team2Result.bags;

    if (gs.bags.team1 >= 10) { gs.teamScores.team1 -= 100; gs.bags.team1 -= 10; }
    if (gs.bags.team2 >= 10) { gs.teamScores.team2 -= 100; gs.bags.team2 -= 10; }

    this.broadcastToRoom(room, 'spades:roundScore', {
      team1: { score: team1Result.score, totalScore: gs.teamScores.team1, bags: gs.bags.team1 },
      team2: { score: team2Result.score, totalScore: gs.teamScores.team2, bags: gs.bags.team2 },
    });

    if (gs.teamScores.team1 >= gs.targetScore || gs.teamScores.team2 >= gs.targetScore) {
      await this.finishGame(room);
    } else {
      gs.round++;
      setTimeout(() => {
        this.dealCards(room);
        gs.phase = 'bidding';
        gs.bids = {};
        room.phase = 'bidding';
        this.broadcastState(room);
        this.setTurn(room, entries[0][0]);
      }, 5000);
    }
  }

  async finishGame(room) {
    const gs = room.gameState;
    room.state = 'finished';
    room.phase = 'finished';
    this.clearTurnTimer(room);

    const entries = this.getPlayerArray(room);
    const winningTeam = gs.teamScores.team1 >= gs.targetScore ? 'team1' : 'team2';
    const winnerSids = winningTeam === 'team1' ? [entries[0]?.[0], entries[2]?.[0]] : [entries[1]?.[0], entries[3]?.[0]];
    const loserSids = winningTeam === 'team1' ? [entries[1]?.[0], entries[3]?.[0]] : [entries[0]?.[0], entries[2]?.[0]];

    const share = Math.floor(room.pot / 2);
    for (const sid of winnerSids.filter(Boolean)) {
      const player = room.players.get(sid);
      if (player && !player.isBot && player.id && typeof player.id === 'number') {
        await this.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [share, player.id]).catch(() => {});
        player.balance += share;
        await this.recordGameHistory(player.id, 'win', room.escrow.get(sid) || 0, share);
      }
    }
    for (const sid of loserSids.filter(Boolean)) {
      const player = room.players.get(sid);
      if (player && !player.isBot && player.id && typeof player.id === 'number') {
        await this.recordGameHistory(player.id, 'loss', room.escrow.get(sid) || 0, 0);
      }
    }

    room.pot = 0;
    room.escrow.clear();
    this.broadcastState(room);
  }

  onTurnTimeout(room, socketId) {
    const gs = room.gameState;
    if (gs.phase === 'bidding') {
      this.handleBid(room, socketId, { bid: 3 });
    } else {
      const hand = gs.hands[socketId];
      if (hand && hand.length > 0) {
        for (let i = 0; i < hand.length; i++) {
          if (this.isLegalPlay(room, socketId, hand[i])) {
            this.handlePlayCard(room, socketId, { cardIndex: i });
            return;
          }
        }
      }
    }
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    if (gs.phase === 'bidding') {
      const hand = gs.hands[socketId] || [];
      let bid = 0;
      for (const card of hand) {
        if (card.suit === '♠' && cardRank(card) >= 12) bid++;
        else if (cardRank(card) === 14) bid++;
        else if (cardRank(card) === 13 && Math.random() > 0.3) bid++;
      }
      this.handleBid(room, socketId, { bid: Math.max(1, Math.min(bid, 6)) });
    } else {
      const hand = gs.hands[socketId] || [];
      for (let i = 0; i < hand.length; i++) {
        if (this.isLegalPlay(room, socketId, hand[i])) {
          this.handlePlayCard(room, socketId, { cardIndex: i });
          return;
        }
      }
    }
  }

  getPublicState(room) {
    const base = super.getPublicState(room);
    const gs = room.gameState;
    const entries = this.getPlayerArray(room);

    const playerStates = {};
    for (const [sid, player] of entries) {
      playerStates[sid] = {
        username: player.username,
        avatar: player.avatar,
        avatarUrl: player.avatarUrl,
        isBot: player.isBot,
        seat: player.seat,
        bid: gs.bids[sid]?.amount ?? null,
        nilBid: gs.bids[sid]?.nil || false,
        tricks: gs.tricks[sid] || 0,
        cardCount: gs.hands[sid]?.length || 0,
      };
    }

    return {
      ...base,
      phase: gs.phase,
      currentTrick: gs.currentTrick,
      playerStates,
      teamScores: gs.teamScores,
      bags: gs.bags,
      spadesBroken: gs.spadesBroken,
      round: gs.round,
      targetScore: gs.targetScore,
      lastTrickWinner: gs.lastTrickWinner,
    };
  }

  getPrivateState(room, socketId) {
    return {
      hand: room.gameState.hands[socketId] || [],
    };
  }
}
