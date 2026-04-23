import { BaseGameEngine } from './BaseGameEngine.js';

const HAND_RANKS = {
  ROYAL_FLUSH: 10, STRAIGHT_FLUSH: 9, FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7, FLUSH: 6, STRAIGHT: 5, THREE_OF_A_KIND: 4,
  TWO_PAIR: 3, PAIR: 2, HIGH_CARD: 1,
};

const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function cardValue(card) { return RANK_VALUES[card.value] || 0; }

function evaluateHand(cards) {
  if (cards.length < 5) return { rank: 0, score: 0, name: 'incomplete' };
  const combos = getCombinations(cards, 5);
  let best = { rank: 0, score: 0, name: 'high_card' };
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (result.score > best.score) best = result;
  }
  return best;
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards) {
  const values = cards.map(c => cardValue(c)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const unique = [...new Set(values)];
  const isStraight = unique.length === 5 && (values[0] - values[4] === 4 || (values[0] === 14 && values[1] === 5));
  const lowStraight = values[0] === 14 && values[1] === 5;
  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const groups = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  let rank, name;
  const baseScore = (r) => r * 100000000;

  if (isFlush && isStraight && values[0] === 14 && values[1] === 13) {
    rank = HAND_RANKS.ROYAL_FLUSH; name = 'royal_flush';
    return { rank, score: baseScore(rank), name };
  }
  if (isFlush && isStraight) {
    rank = HAND_RANKS.STRAIGHT_FLUSH; name = 'straight_flush';
    return { rank, score: baseScore(rank) + (lowStraight ? 5 : values[0]), name };
  }
  if (groups[0][1] === 4) {
    rank = HAND_RANKS.FOUR_OF_A_KIND; name = 'four_of_a_kind';
    return { rank, score: baseScore(rank) + parseInt(groups[0][0]) * 100 + parseInt(groups[1][0]), name };
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    rank = HAND_RANKS.FULL_HOUSE; name = 'full_house';
    return { rank, score: baseScore(rank) + parseInt(groups[0][0]) * 100 + parseInt(groups[1][0]), name };
  }
  if (isFlush) {
    rank = HAND_RANKS.FLUSH; name = 'flush';
    return { rank, score: baseScore(rank) + values.reduce((s, v, i) => s + v * Math.pow(15, 4 - i), 0), name };
  }
  if (isStraight) {
    rank = HAND_RANKS.STRAIGHT; name = 'straight';
    return { rank, score: baseScore(rank) + (lowStraight ? 5 : values[0]), name };
  }
  if (groups[0][1] === 3) {
    rank = HAND_RANKS.THREE_OF_A_KIND; name = 'three_of_a_kind';
    return { rank, score: baseScore(rank) + parseInt(groups[0][0]) * 10000 + parseInt(groups[1][0]) * 100 + parseInt(groups[2][0]), name };
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    rank = HAND_RANKS.TWO_PAIR; name = 'two_pair';
    const pairs = [parseInt(groups[0][0]), parseInt(groups[1][0])].sort((a, b) => b - a);
    return { rank, score: baseScore(rank) + pairs[0] * 10000 + pairs[1] * 100 + parseInt(groups[2][0]), name };
  }
  if (groups[0][1] === 2) {
    rank = HAND_RANKS.PAIR; name = 'pair';
    return { rank, score: baseScore(rank) + parseInt(groups[0][0]) * 1000000 + values.filter(v => v !== parseInt(groups[0][0])).reduce((s, v, i) => s + v * Math.pow(15, 2 - i), 0), name };
  }
  rank = HAND_RANKS.HIGH_CARD; name = 'high_card';
  return { rank, score: baseScore(rank) + values.reduce((s, v, i) => s + v * Math.pow(15, 4 - i), 0), name };
}

export class PokerEngine extends BaseGameEngine {
  constructor() {
    super('poker', { minPlayers: 2, maxPlayers: 6 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      deck: [],
      communityCards: [],
      holeCards: {},
      bettingRound: 'preflop',
      currentBet: 0,
      playerBets: {},
      playerTotalBets: {},
      playerStacks: {},
      folded: new Set(),
      allIn: new Set(),
      actedThisRound: new Set(),
      dealerIndex: 0,
      smallBlind: options.minBet || 10,
      bigBlind: (options.minBet || 10) * 2,
      sidePots: [],
      winners: [],
      lastAction: null,
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size < 2) return;
    room.state = 'playing';
    room.phase = 'dealing';

    const gs = room.gameState;
    this.initProvablyFair(room);
    gs.deck = this.shuffleDeck(room);
    gs.communityCards = [];
    gs.holeCards = {};
    gs.bettingRound = 'preflop';
    gs.currentBet = 0;
    gs.playerBets = {};
    gs.playerTotalBets = {};
    gs.folded = new Set();
    gs.allIn = new Set();
    gs.actedThisRound = new Set();
    gs.sidePots = [];
    gs.winners = [];
    gs.lastAction = null;
    gs.lastRaiseSize = gs.bigBlind;

    room.pot = 0;

    const entries = this.getPlayerArray(room);
    for (const [sid] of entries) {
      gs.playerStacks[sid] = room.escrow.get(sid) || 0;
      gs.holeCards[sid] = [gs.deck.pop(), gs.deck.pop()];
      gs.playerBets[sid] = 0;
      gs.playerTotalBets[sid] = 0;
    }

    const dealerIdx = gs.dealerIndex % entries.length;
    const sbIdx = (dealerIdx + 1) % entries.length;
    const bbIdx = (dealerIdx + 2) % entries.length;

    const sbSid = entries[sbIdx][0];
    const bbSid = entries[bbIdx][0];

    await this.placeBet(room, sbSid, gs.smallBlind);
    await this.placeBet(room, bbSid, gs.bigBlind);
    gs.currentBet = gs.bigBlind;

    const firstToAct = entries[(bbIdx + 1) % entries.length][0];
    room.phase = 'preflop';
    this.broadcastState(room);
    this.setTurn(room, firstToAct);
  }

  async placeBet(room, socketId, amount) {
    const gs = room.gameState;
    const actual = Math.min(amount, gs.playerStacks[socketId] || 0);
    gs.playerBets[socketId] = (gs.playerBets[socketId] || 0) + actual;
    gs.playerTotalBets[socketId] = (gs.playerTotalBets[socketId] || 0) + actual;
    gs.playerStacks[socketId] = (gs.playerStacks[socketId] || 0) - actual;
    room.pot += actual;
    if (gs.playerStacks[socketId] <= 0) gs.allIn.add(socketId);
    return actual;
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;
    if (room.turnPlayerId !== socketId) return;
    const gs = room.gameState;
    if (gs.folded.has(socketId)) return;

    switch (action) {
      case 'fold': this.handleFold(room, socketId); break;
      case 'check': this.handleCheck(room, socketId); break;
      case 'call': this.handleCall(room, socketId); break;
      case 'raise': this.handleRaise(room, socketId, data?.amount || 0); break;
      case 'allIn': this.handleAllIn(room, socketId); break;
      default: return;
    }
  }

  handleFold(room, socketId) {
    const gs = room.gameState;
    gs.folded.add(socketId);
    gs.actedThisRound.add(socketId);
    gs.lastAction = { socketId, action: 'fold' };
    this.broadcastToRoom(room, 'poker:action', { socketId, action: 'fold' });

    const activePlayers = this.getActivePlayers(room);
    if (activePlayers.length === 1) {
      this.finishHand(room, [activePlayers[0]]);
      return;
    }
    this.advanceTurn(room);
  }

  handleCheck(room, socketId) {
    const gs = room.gameState;
    if (gs.playerBets[socketId] < gs.currentBet) return;
    gs.actedThisRound.add(socketId);
    gs.lastAction = { socketId, action: 'check' };
    this.broadcastToRoom(room, 'poker:action', { socketId, action: 'check' });
    this.advanceTurn(room);
  }

  async handleCall(room, socketId) {
    const gs = room.gameState;
    const toCall = gs.currentBet - (gs.playerBets[socketId] || 0);
    if (toCall <= 0) return this.handleCheck(room, socketId);
    await this.placeBet(room, socketId, toCall);
    gs.actedThisRound.add(socketId);
    gs.lastAction = { socketId, action: 'call', amount: toCall };
    this.broadcastToRoom(room, 'poker:action', { socketId, action: 'call', amount: toCall });
    this.advanceTurn(room);
  }

  async handleRaise(room, socketId, amount) {
    const gs = room.gameState;
    const stack = gs.playerStacks[socketId] || 0;
    const currentPlayerBet = gs.playerBets[socketId] || 0;
    const minRaiseSize = gs.lastRaiseSize || gs.bigBlind;
    const raiseSize = Math.max(amount, minRaiseSize);
    const newBetLevel = gs.currentBet + raiseSize;
    const toCall = newBetLevel - currentPlayerBet;

    if (stack <= toCall) {
      return this.handleAllIn(room, socketId);
    }

    await this.placeBet(room, socketId, toCall);
    gs.currentBet = newBetLevel;
    gs.lastRaiseSize = raiseSize;
    gs.actedThisRound = new Set([socketId]);
    for (const sid of gs.folded) gs.actedThisRound.add(sid);
    for (const sid of gs.allIn) gs.actedThisRound.add(sid);
    gs.lastAction = { socketId, action: 'raise', amount: raiseSize };
    this.broadcastToRoom(room, 'poker:action', { socketId, action: 'raise', amount: raiseSize });
    this.advanceTurn(room);
  }

  async handleAllIn(room, socketId) {
    const gs = room.gameState;
    const remaining = gs.playerStacks[socketId] || 0;
    await this.placeBet(room, socketId, remaining);
    const newBet = gs.playerBets[socketId] || 0;
    if (newBet > gs.currentBet) {
      const raiseBy = newBet - gs.currentBet;
      if (raiseBy >= (gs.lastRaiseSize || gs.bigBlind)) {
        gs.lastRaiseSize = raiseBy;
      }
      gs.currentBet = newBet;
      gs.actedThisRound = new Set([socketId]);
      for (const sid of gs.folded) gs.actedThisRound.add(sid);
      for (const sid of gs.allIn) gs.actedThisRound.add(sid);
    } else {
      gs.actedThisRound.add(socketId);
    }
    gs.lastAction = { socketId, action: 'allIn', amount: remaining };
    this.broadcastToRoom(room, 'poker:action', { socketId, action: 'allIn', amount: remaining });
    this.advanceTurn(room);
  }

  getActivePlayers(room) {
    const gs = room.gameState;
    return this.getPlayerArray(room)
      .filter(([sid]) => !gs.folded.has(sid))
      .map(([sid]) => sid);
  }

  getActionablePlayers(room) {
    const gs = room.gameState;
    return this.getActivePlayers(room)
      .filter(sid => !gs.allIn.has(sid));
  }

  advanceTurn(room) {
    const gs = room.gameState;
    const actionable = this.getActionablePlayers(room);
    const allActed = actionable.every(sid => gs.actedThisRound.has(sid));

    if (allActed || actionable.length <= 1) {
      this.advanceRound(room);
      return;
    }

    const entries = this.getPlayerArray(room);
    const currentIdx = entries.findIndex(([sid]) => sid === room.turnPlayerId);
    let nextIdx = (currentIdx + 1) % entries.length;
    let attempts = 0;
    while (attempts < entries.length) {
      const [sid] = entries[nextIdx];
      if (!gs.folded.has(sid) && !gs.allIn.has(sid) && !gs.actedThisRound.has(sid)) {
        this.broadcastState(room);
        this.setTurn(room, sid);
        return;
      }
      nextIdx = (nextIdx + 1) % entries.length;
      attempts++;
    }
    this.advanceRound(room);
  }

  advanceRound(room) {
    const gs = room.gameState;
    gs.actedThisRound = new Set();
    for (const sid of gs.folded) gs.actedThisRound.add(sid);
    for (const sid of gs.allIn) gs.actedThisRound.add(sid);

    for (const [sid] of room.players) {
      gs.playerBets[sid] = 0;
    }
    gs.currentBet = 0;
    gs.lastRaiseSize = gs.bigBlind;

    const rounds = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentRoundIdx = rounds.indexOf(gs.bettingRound);

    if (currentRoundIdx >= 3 || this.getActionablePlayers(room).length <= 1) {
      this.showdown(room);
      return;
    }

    gs.bettingRound = rounds[currentRoundIdx + 1];
    room.phase = gs.bettingRound;

    if (gs.bettingRound === 'flop') {
      gs.deck.pop();
      gs.communityCards.push(gs.deck.pop(), gs.deck.pop(), gs.deck.pop());
    } else if (gs.bettingRound === 'turn') {
      gs.deck.pop();
      gs.communityCards.push(gs.deck.pop());
    } else if (gs.bettingRound === 'river') {
      gs.deck.pop();
      gs.communityCards.push(gs.deck.pop());
    }

    const actionable = this.getActionablePlayers(room);
    if (actionable.length <= 1) {
      this.showdown(room);
      return;
    }

    this.broadcastState(room);

    const entries = this.getPlayerArray(room);
    const dealerIdx = gs.dealerIndex % entries.length;
    let startIdx = (dealerIdx + 1) % entries.length;
    let attempts = 0;
    while (attempts < entries.length) {
      const [sid] = entries[startIdx];
      if (!gs.folded.has(sid) && !gs.allIn.has(sid)) {
        this.setTurn(room, sid);
        return;
      }
      startIdx = (startIdx + 1) % entries.length;
      attempts++;
    }
    this.showdown(room);
  }

  showdown(room) {
    const gs = room.gameState;
    room.phase = 'showdown';

    while (gs.communityCards.length < 5) {
      gs.deck.pop();
      gs.communityCards.push(gs.deck.pop());
    }

    const activePlayers = this.getActivePlayers(room);
    const hands = {};
    for (const sid of activePlayers) {
      const allCards = [...(gs.holeCards[sid] || []), ...gs.communityCards];
      hands[sid] = evaluateHand(allCards);
    }

    const sidePots = this.calculateSidePots(room);
    const allWinnerSids = new Set();
    gs.winners = [];

    for (const pot of sidePots) {
      const eligible = pot.eligible.filter(sid => activePlayers.includes(sid));
      if (eligible.length === 0) continue;
      eligible.sort((a, b) => hands[b].score - hands[a].score);
      const bestScore = hands[eligible[0]].score;
      const potWinners = eligible.filter(sid => hands[sid].score === bestScore);
      const share = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount - (share * potWinners.length);
      for (let i = 0; i < potWinners.length; i++) {
        const sid = potWinners[i];
        allWinnerSids.add(sid);
        gs.winners.push({
          socketId: sid,
          hand: hands[sid],
          holeCards: gs.holeCards[sid],
          amount: share + (i === 0 ? remainder : 0),
        });
      }
    }

    this.finishHand(room, [...allWinnerSids]);
  }

  calculateSidePots(room) {
    const gs = room.gameState;
    const entries = this.getPlayerArray(room);
    const contributions = entries
      .map(([sid]) => ({ sid, total: gs.playerTotalBets[sid] || 0 }))
      .filter(e => e.total > 0)
      .sort((a, b) => a.total - b.total);

    const pots = [];
    let prevLevel = 0;

    for (let i = 0; i < contributions.length; i++) {
      const level = contributions[i].total;
      if (level <= prevLevel) continue;
      const diff = level - prevLevel;
      const eligible = contributions.filter(c => c.total >= level).map(c => c.sid);
      const amount = diff * contributions.filter(c => c.total >= level).length;
      if (amount > 0) {
        pots.push({ amount, eligible });
      }
      prevLevel = level;
    }

    if (pots.length === 0) {
      pots.push({
        amount: room.pot,
        eligible: entries.map(([sid]) => sid),
      });
    }

    return pots;
  }

  async finishHand(room, winnerSids) {
    const gs = room.gameState;
    room.phase = 'finished';
    room.state = 'finished';
    this.clearTurnTimer(room);

    const winnerPayouts = {};
    if (gs.winners && gs.winners.length > 0) {
      for (const w of gs.winners) {
        winnerPayouts[w.socketId] = (winnerPayouts[w.socketId] || 0) + (w.amount || 0);
      }
    } else {
      const share = Math.floor(room.pot / winnerSids.length);
      for (const sid of winnerSids) {
        winnerPayouts[sid] = share;
      }
    }

    for (const sid of winnerSids) {
      const payout = winnerPayouts[sid] || 0;
      gs.playerStacks[sid] = (gs.playerStacks[sid] || 0) + payout;
    }

    for (const [sid, player] of room.players) {
      if (!player.isBot && player.id && typeof player.id === 'number') {
        const escrowAmt = room.escrow.get(sid) || 0;
        const stack = gs.playerStacks[sid] || 0;
        if (stack > 0) {
          await this.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [stack, player.id]).catch(() => {});
          player.balance += stack;
        }
        const result = winnerSids.includes(sid) ? 'win' : 'loss';
        const winAmount = winnerSids.includes(sid) ? Math.max(0, stack - escrowAmt) : 0;
        await this.recordGameHistory(player.id, result, escrowAmt, winAmount);
        this.emitToPlayer(room, sid, 'game:balanceUpdate', { balance: player.balance });
      }
    }

    gs.showdownHands = {};
    for (const sid of this.getActivePlayers(room)) {
      gs.showdownHands[sid] = gs.holeCards[sid];
    }

    room.pot = 0;
    room.escrow.clear();
    this.broadcastState(room);

    gs.dealerIndex++;
    setTimeout(() => {
      if (room.players.size >= 2) {
        room.state = 'waiting';
        room.phase = 'waiting';
        this.broadcastState(room);
      }
    }, 8000);
  }

  onTurnTimeout(room, socketId) {
    this.handleFold(room, socketId);
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    const hand = gs.holeCards[socketId] || [];
    const handStrength = evaluateHand([...hand, ...gs.communityCards]);
    const toCall = gs.currentBet - (gs.playerBets[socketId] || 0);

    if (handStrength.rank >= HAND_RANKS.PAIR) {
      if (toCall > 0) {
        this.handleCall(room, socketId);
      } else if (Math.random() > 0.6) {
        this.handleRaise(room, socketId, gs.bigBlind * 2);
      } else {
        this.handleCheck(room, socketId);
      }
    } else if (toCall === 0) {
      this.handleCheck(room, socketId);
    } else if (toCall < gs.bigBlind * 3 && Math.random() > 0.4) {
      this.handleCall(room, socketId);
    } else {
      this.handleFold(room, socketId);
    }
  }

  getPublicState(room) {
    const base = super.getPublicState(room);
    const gs = room.gameState;
    const playerStates = {};
    for (const [sid, player] of room.players) {
      playerStates[sid] = {
        userId: !player.isBot && typeof player.id === 'number' ? player.id : null,
        username: player.username,
        avatar: player.avatar,
        avatarUrl: player.avatarUrl,
        isBot: player.isBot,
        seat: player.seat,
        stack: gs.playerStacks[sid] || 0,
        bet: gs.playerBets[sid] || 0,
        totalBet: gs.playerTotalBets[sid] || 0,
        folded: gs.folded.has(sid),
        allIn: gs.allIn.has(sid),
        hasCards: !!(gs.holeCards[sid]?.length),
      };
    }
    return {
      ...base,
      communityCards: gs.communityCards,
      bettingRound: gs.bettingRound,
      currentBet: gs.currentBet,
      playerStates,
      lastAction: gs.lastAction,
      winners: gs.winners,
      showdownHands: gs.showdownHands || {},
      dealerIndex: gs.dealerIndex,
    };
  }

  getPrivateState(room, socketId) {
    const gs = room.gameState;
    return {
      holeCards: gs.holeCards[socketId] || [],
    };
  }
}
