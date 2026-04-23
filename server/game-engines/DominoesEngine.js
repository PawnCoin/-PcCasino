import { BaseGameEngine } from './BaseGameEngine.js';

function makeDominoSet() {
  const set = [];
  let id = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      set.push({ left: i, right: j, id: `d${id++}` });
    }
  }
  return set;
}

function handPips(hand) { return hand.reduce((s, t) => s + t.left + t.right, 0); }

function canPlayEnd(tile, end, lv, rv) {
  if (end === 'left') return tile.left === lv || tile.right === lv;
  if (end === 'right') return tile.left === rv || tile.right === rv;
  return false;
}

export class DominoesEngine extends BaseGameEngine {
  constructor() {
    super('dominoes', { minPlayers: 2, maxPlayers: 4 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      hands: {},
      boneyard: [],
      chain: [],
      leftVal: -1,
      rightVal: -1,
      currentPlayerIdx: 0,
      playerOrder: [],
      consecutivePasses: 0,
      scores: {},
      targetScore: options.targetScore || 150,
      round: 1,
      lastPlay: null,
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size < 2) return;
    room.state = 'playing';
    room.phase = 'playing';
    this.initProvablyFair(room);
    this.dealTiles(room);
    this.broadcastState(room);

    const gs = room.gameState;
    const firstSid = gs.playerOrder[gs.currentPlayerIdx];
    this.setTurn(room, firstSid);
  }

  dealTiles(room) {
    const gs = room.gameState;
    const tiles = makeDominoSet();

    for (let i = tiles.length - 1; i > 0; i--) {
      const [f] = this.deriveOutcome(room, 1);
      const j = Math.floor(f * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    gs.playerOrder = [];
    const entries = this.getPlayerArray(room);
    const tilesPerPlayer = 7;
    gs.hands = {};

    for (let i = 0; i < entries.length; i++) {
      const [sid] = entries[i];
      gs.playerOrder.push(sid);
      gs.hands[sid] = tiles.splice(0, tilesPerPlayer);
      if (!gs.scores[sid]) gs.scores[sid] = 0;
    }
    gs.boneyard = tiles;
    gs.chain = [];
    gs.leftVal = -1;
    gs.rightVal = -1;
    gs.consecutivePasses = 0;
    gs.currentPlayerIdx = 0;

    let bestVal = -1, bestPlayer = 0;
    gs.playerOrder.forEach((sid, idx) => {
      const doubles = gs.hands[sid].filter(t => t.left === t.right);
      const highest = doubles.sort((a, b) => b.left - a.left)[0];
      if (highest && highest.left > bestVal) {
        bestVal = highest.left;
        bestPlayer = idx;
      }
    });
    gs.currentPlayerIdx = bestPlayer;
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;
    if (room.turnPlayerId !== socketId) return;

    switch (action) {
      case 'playTile': this.handlePlayTile(room, socketId, data); break;
      case 'draw': this.handleDraw(room, socketId); break;
      case 'pass': this.handlePass(room, socketId); break;
      default: return;
    }
  }

  handlePlayTile(room, socketId, data) {
    const gs = room.gameState;
    const hand = gs.hands[socketId];
    if (!hand) return;

    const tileId = data?.tileId;
    const end = data?.end || 'right';
    const tile = hand.find(t => t.id === tileId);
    if (!tile) return;

    const chainEmpty = gs.chain.length === 0;
    if (!chainEmpty && !canPlayEnd(tile, end, gs.leftVal, gs.rightVal)) return;

    const tileIdx = hand.indexOf(tile);
    hand.splice(tileIdx, 1);

    if (chainEmpty) {
      gs.chain.push({ tile, dispLeft: tile.left, dispRight: tile.right });
      gs.leftVal = tile.left;
      gs.rightVal = tile.right;
    } else if (end === 'right') {
      if (tile.left === gs.rightVal) {
        gs.chain.push({ tile, dispLeft: tile.left, dispRight: tile.right });
        gs.rightVal = tile.right;
      } else {
        gs.chain.push({ tile, dispLeft: tile.right, dispRight: tile.left });
        gs.rightVal = tile.left;
      }
    } else if (end === 'left') {
      if (tile.right === gs.leftVal) {
        gs.chain.unshift({ tile, dispLeft: tile.left, dispRight: tile.right });
        gs.leftVal = tile.left;
      } else {
        gs.chain.unshift({ tile, dispLeft: tile.right, dispRight: tile.left });
        gs.leftVal = tile.right;
      }
    }

    gs.consecutivePasses = 0;
    gs.lastPlay = { socketId, tile, end };
    this.broadcastToRoom(room, 'dominoes:tilePlayed', { socketId, tile, end });

    if (hand.length === 0) {
      this.resolveRound(room, socketId);
      return;
    }

    this.advanceTurn(room);
  }

  handleDraw(room, socketId) {
    const gs = room.gameState;
    if (gs.boneyard.length === 0) return this.handlePass(room, socketId);

    const tile = gs.boneyard.pop();
    gs.hands[socketId].push(tile);
    this.emitToPlayer(room, socketId, 'dominoes:drew', { tile });
    this.broadcastState(room);
  }

  handlePass(room, socketId) {
    const gs = room.gameState;
    if (gs.boneyard.length > 0) return;

    gs.consecutivePasses++;
    this.broadcastToRoom(room, 'dominoes:passed', { socketId });

    if (gs.consecutivePasses >= gs.playerOrder.length) {
      let lowestPips = Infinity, winnerId = gs.playerOrder[0];
      for (const sid of gs.playerOrder) {
        const pips = handPips(gs.hands[sid] || []);
        if (pips < lowestPips) { lowestPips = pips; winnerId = sid; }
      }
      this.resolveRound(room, winnerId);
      return;
    }

    this.advanceTurn(room);
  }

  advanceTurn(room) {
    const gs = room.gameState;
    gs.currentPlayerIdx = (gs.currentPlayerIdx + 1) % gs.playerOrder.length;
    const nextSid = gs.playerOrder[gs.currentPlayerIdx];
    this.broadcastState(room);
    this.setTurn(room, nextSid);
  }

  async resolveRound(room, winnerId) {
    const gs = room.gameState;
    room.phase = 'roundOver';

    let totalPips = 0;
    for (const sid of gs.playerOrder) {
      if (sid !== winnerId) totalPips += handPips(gs.hands[sid] || []);
    }
    const roundScore = Math.round(totalPips / 5) * 5;
    gs.scores[winnerId] = (gs.scores[winnerId] || 0) + roundScore;

    this.broadcastToRoom(room, 'dominoes:roundOver', {
      winner: winnerId, roundScore, scores: { ...gs.scores },
    });

    const maxScore = Math.max(...Object.values(gs.scores));
    if (maxScore >= gs.targetScore) {
      await this.finishGame(room, winnerId);
    } else {
      gs.round++;
      setTimeout(() => {
        this.dealTiles(room);
        room.phase = 'playing';
        this.broadcastState(room);
        const firstSid = gs.playerOrder[gs.currentPlayerIdx];
        this.setTurn(room, firstSid);
      }, 5000);
    }
  }

  async finishGame(room, winnerId) {
    room.state = 'finished';
    room.phase = 'finished';
    this.clearTurnTimer(room);

    const player = room.players.get(winnerId);
    if (player && !player.isBot && player.id && typeof player.id === 'number') {
      const winAmount = room.pot;
      await this.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [winAmount, player.id]).catch(() => {});
      player.balance += winAmount;
      await this.recordGameHistory(player.id, 'win', room.escrow.get(winnerId) || 0, winAmount);
    }

    for (const [sid, p] of room.players) {
      if (sid !== winnerId && !p.isBot && p.id && typeof p.id === 'number') {
        await this.recordGameHistory(p.id, 'loss', room.escrow.get(sid) || 0, 0);
      }
    }

    room.pot = 0;
    room.escrow.clear();
    this.broadcastState(room);
  }

  onTurnTimeout(room, socketId) {
    const gs = room.gameState;
    if (gs.boneyard.length > 0) {
      this.handleDraw(room, socketId);
    } else {
      this.handlePass(room, socketId);
    }
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    const hand = gs.hands[socketId] || [];
    const chainEmpty = gs.chain.length === 0;

    if (chainEmpty) {
      const tile = hand.sort((a, b) => (b.left + b.right) - (a.left + a.right))[0];
      if (tile) this.handlePlayTile(room, socketId, { tileId: tile.id, end: 'right' });
      return;
    }

    for (const tile of hand) {
      if (canPlayEnd(tile, 'right', gs.leftVal, gs.rightVal)) {
        this.handlePlayTile(room, socketId, { tileId: tile.id, end: 'right' });
        return;
      }
      if (canPlayEnd(tile, 'left', gs.leftVal, gs.rightVal)) {
        this.handlePlayTile(room, socketId, { tileId: tile.id, end: 'left' });
        return;
      }
    }

    if (gs.boneyard.length > 0) {
      this.handleDraw(room, socketId);
    } else {
      this.handlePass(room, socketId);
    }
  }

  getPublicState(room) {
    const base = super.getPublicState(room);
    const gs = room.gameState;

    const playerStates = {};
    for (const sid of (gs.playerOrder || [])) {
      const player = room.players.get(sid);
      playerStates[sid] = {
        userId: player && !player.isBot && typeof player.id === 'number' ? player.id : null,
        username: player?.username || 'Unknown',
        avatar: player?.avatar,
        avatarUrl: player?.avatarUrl,
        isBot: player?.isBot || false,
        seat: player?.seat || 0,
        tileCount: gs.hands[sid]?.length || 0,
        score: gs.scores[sid] || 0,
      };
    }

    return {
      ...base,
      chain: gs.chain,
      leftVal: gs.leftVal,
      rightVal: gs.rightVal,
      boneyardCount: gs.boneyard.length,
      playerStates,
      playerOrder: gs.playerOrder || [],
      scores: gs.scores || {},
      round: gs.round,
      targetScore: gs.targetScore,
      consecutivePasses: gs.consecutivePasses,
      lastPlay: gs.lastPlay,
    };
  }

  getPrivateState(room, socketId) {
    return {
      hand: room.gameState.hands[socketId] || [],
    };
  }
}
