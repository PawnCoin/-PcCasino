import { BaseGameEngine } from './BaseGameEngine.js';

const CARD_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11 };

function handValue(cards) {
  let total = 0, aces = 0;
  for (const card of cards) {
    total += CARD_VALUES[card.value] || 0;
    if (card.value === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

export class BlackjackEngine extends BaseGameEngine {
  constructor() {
    super('blackjack', { minPlayers: 1, maxPlayers: 3 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      deck: [],
      dealerHand: [],
      playerHands: {},
      playerBets: {},
      playerHandIndex: {},
      playerStatus: {},
      currentPlayerIdx: 0,
      playerOrder: [],
      showDealer: false,
      results: {},
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size < 1) return;
    room.state = 'playing';
    room.phase = 'dealing';

    const gs = room.gameState;
    this.initProvablyFair(room);
    gs.deck = this.shuffleDeck(room);
    gs.dealerHand = [];
    gs.playerHands = {};
    gs.playerBets = {};
    gs.playerHandIndex = {};
    gs.playerStatus = {};
    gs.results = {};
    gs.showDealer = false;
    gs.currentPlayerIdx = 0;

    gs.playerOrder = [];
    for (const [sid] of room.players) {
      gs.playerOrder.push(sid);
    }

    for (const sid of gs.playerOrder) {
      const bet = room.escrow.get(sid) || room.minBet;
      gs.playerBets[sid] = [bet];
      gs.playerHands[sid] = [[gs.deck.pop(), gs.deck.pop()]];
      gs.playerHandIndex[sid] = 0;
      gs.playerStatus[sid] = 'playing';
    }

    gs.dealerHand = [gs.deck.pop(), gs.deck.pop()];

    room.phase = 'playing';

    for (const sid of gs.playerOrder) {
      if (isBlackjack(gs.playerHands[sid][0])) {
        gs.playerStatus[sid] = 'blackjack';
      }
    }

    const firstActive = gs.playerOrder.find(sid => gs.playerStatus[sid] === 'playing');
    if (firstActive) {
      this.broadcastState(room);
      this.setTurn(room, firstActive);
    } else {
      this.dealerPlay(room);
    }
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;
    if (room.turnPlayerId !== socketId) return;
    const gs = room.gameState;
    if (gs.playerStatus[socketId] !== 'playing') return;

    switch (action) {
      case 'hit': this.handleHit(room, socketId); break;
      case 'stand': this.handleStand(room, socketId); break;
      case 'double': this.handleDouble(room, socketId); break;
      case 'split': this.handleSplit(room, socketId); break;
      default: return;
    }
  }

  handleHit(room, socketId) {
    const gs = room.gameState;
    const handIdx = gs.playerHandIndex[socketId] || 0;
    const hand = gs.playerHands[socketId][handIdx];
    hand.push(gs.deck.pop());

    if (handValue(hand) > 21) {
      this.advanceHand(room, socketId);
    } else if (handValue(hand) === 21) {
      this.advanceHand(room, socketId);
    } else {
      this.broadcastState(room);
    }
  }

  handleStand(room, socketId) {
    this.advanceHand(room, socketId);
  }

  async handleDouble(room, socketId) {
    const gs = room.gameState;
    const handIdx = gs.playerHandIndex[socketId] || 0;
    const hand = gs.playerHands[socketId][handIdx];
    if (hand.length !== 2) return;

    const currentBet = gs.playerBets[socketId][handIdx];
    const player = room.players.get(socketId);
    if (player && !player.isBot) {
      const canBet = await this.escrowBet(room, socketId, currentBet);
      if (!canBet) return;
    }
    gs.playerBets[socketId][handIdx] = currentBet * 2;
    hand.push(gs.deck.pop());
    this.advanceHand(room, socketId);
  }

  async handleSplit(room, socketId) {
    const gs = room.gameState;
    const handIdx = gs.playerHandIndex[socketId] || 0;
    const hand = gs.playerHands[socketId][handIdx];
    if (hand.length !== 2 || CARD_VALUES[hand[0].value] !== CARD_VALUES[hand[1].value]) return;

    const currentBet = gs.playerBets[socketId][handIdx];
    const player = room.players.get(socketId);
    if (player && !player.isBot) {
      const canBet = await this.escrowBet(room, socketId, currentBet);
      if (!canBet) return;
    }

    const card1 = hand[0];
    const card2 = hand[1];
    gs.playerHands[socketId][handIdx] = [card1, gs.deck.pop()];
    gs.playerHands[socketId].splice(handIdx + 1, 0, [card2, gs.deck.pop()]);
    gs.playerBets[socketId].splice(handIdx + 1, 0, currentBet);
    this.broadcastState(room);
  }

  advanceHand(room, socketId) {
    const gs = room.gameState;
    const handIdx = gs.playerHandIndex[socketId] || 0;
    const hands = gs.playerHands[socketId];

    if (handIdx < hands.length - 1) {
      gs.playerHandIndex[socketId] = handIdx + 1;
      this.broadcastState(room);
      return;
    }

    gs.playerStatus[socketId] = 'done';
    this.advancePlayer(room);
  }

  advancePlayer(room) {
    const gs = room.gameState;
    gs.currentPlayerIdx++;

    while (gs.currentPlayerIdx < gs.playerOrder.length) {
      const sid = gs.playerOrder[gs.currentPlayerIdx];
      if (gs.playerStatus[sid] === 'playing') {
        this.broadcastState(room);
        this.setTurn(room, sid);
        return;
      }
      gs.currentPlayerIdx++;
    }

    this.dealerPlay(room);
  }

  async dealerPlay(room) {
    const gs = room.gameState;
    room.phase = 'dealer';
    gs.showDealer = true;
    this.clearTurnTimer(room);

    const anyNonBust = gs.playerOrder.some(sid => {
      return gs.playerHands[sid].some(hand => handValue(hand) <= 21) && gs.playerStatus[sid] !== 'blackjack';
    });

    if (anyNonBust) {
      while (handValue(gs.dealerHand) < 17) {
        gs.dealerHand.push(gs.deck.pop());
      }
    }

    this.broadcastState(room);
    setTimeout(() => this.resolveHands(room), 1500);
  }

  async resolveHands(room) {
    const gs = room.gameState;
    room.phase = 'finished';
    room.state = 'finished';

    const dealerVal = handValue(gs.dealerHand);
    const dealerBust = dealerVal > 21;
    const dealerBJ = isBlackjack(gs.dealerHand);

    gs.results = {};
    const winners = [];

    for (const sid of gs.playerOrder) {
      const hands = gs.playerHands[sid];
      const bets = gs.playerBets[sid];
      let totalWin = 0;
      const handResults = [];

      for (let i = 0; i < hands.length; i++) {
        const hand = hands[i];
        const bet = bets[i];
        const val = handValue(hand);
        const bust = val > 21;
        const playerBJ = gs.playerStatus[sid] === 'blackjack' && i === 0;

        let result, payout = 0;
        if (bust) {
          result = 'bust';
        } else if (playerBJ && !dealerBJ) {
          result = 'blackjack';
          payout = Math.floor(bet * 2.5);
        } else if (playerBJ && dealerBJ) {
          result = 'push';
          payout = bet;
        } else if (dealerBust || val > dealerVal) {
          result = 'win';
          payout = bet * 2;
        } else if (val === dealerVal) {
          result = 'push';
          payout = bet;
        } else {
          result = 'loss';
        }
        totalWin += payout;
        handResults.push({ result, payout, handValue: val });
      }

      gs.results[sid] = handResults;
      if (totalWin > 0) {
        winners.push({ socketId: sid, amount: totalWin });
      }
    }

    for (const { socketId, amount } of winners) {
      const player = room.players.get(socketId);
      if (player && !player.isBot && player.id && typeof player.id === 'number') {
        try {
          await this.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, player.id]);
          player.balance += amount;
          this.emitToPlayer(room, socketId, 'game:balanceUpdate', { balance: player.balance });
        } catch (e) {}
      }
    }

    for (const sid of gs.playerOrder) {
      const player = room.players.get(sid);
      if (player && !player.isBot && player.id && typeof player.id === 'number') {
        const escrow = room.escrow.get(sid) || 0;
        const totalPayout = (gs.results[sid] || []).reduce((s, r) => s + r.payout, 0);
        const result = totalPayout > escrow ? 'win' : totalPayout === escrow ? 'push' : 'loss';
        await this.recordGameHistory(player.id, result, escrow, totalPayout);
      }
    }

    room.pot = 0;
    room.escrow.clear();
    this.broadcastState(room);

    setTimeout(() => {
      room.state = 'waiting';
      room.phase = 'waiting';
      this.broadcastState(room);
    }, 5000);
  }

  onTurnTimeout(room, socketId) {
    this.handleStand(room, socketId);
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    const handIdx = gs.playerHandIndex[socketId] || 0;
    const hand = gs.playerHands[socketId]?.[handIdx];
    if (!hand) return;

    const val = handValue(hand);
    if (val < 17) {
      this.handleHit(room, socketId);
    } else {
      this.handleStand(room, socketId);
    }
  }

  getPublicState(room) {
    const base = super.getPublicState(room);
    const gs = room.gameState;
    const playerStates = {};

    for (const sid of (gs.playerOrder || [])) {
      const player = room.players.get(sid);
      playerStates[sid] = {
        username: player?.username || 'Unknown',
        avatar: player?.avatar,
        avatarUrl: player?.avatarUrl,
        isBot: player?.isBot || false,
        seat: player?.seat || 0,
        hands: (gs.playerHands[sid] || []).map(hand => ({
          cards: hand,
          value: handValue(hand),
        })),
        bets: gs.playerBets[sid] || [],
        status: gs.playerStatus[sid] || 'waiting',
        currentHandIndex: gs.playerHandIndex[sid] || 0,
      };
    }

    return {
      ...base,
      dealerHand: gs.showDealer ? gs.dealerHand : [gs.dealerHand?.[0] || null],
      dealerValue: gs.showDealer ? handValue(gs.dealerHand) : null,
      showDealer: gs.showDealer,
      playerStates,
      playerOrder: gs.playerOrder || [],
      results: gs.results || {},
    };
  }

  getPrivateState(room, socketId) {
    return {};
  }
}
