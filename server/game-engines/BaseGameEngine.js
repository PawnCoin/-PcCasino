import { randomBytes } from 'crypto';
import { generateServerSeed, hashServerSeed, deriveOutcomes } from '../provably-fair.js';

export class BaseGameEngine {
  constructor(gameType, options = {}) {
    this.gameType = gameType;
    this.rooms = new Map();
    this.playerRoomMap = new Map();
    this.io = null;
    this.query = null;
    this.reconnectionTimeout = options.reconnectionTimeout || 30000;
    this.minPlayers = options.minPlayers || 2;
    this.maxPlayers = options.maxPlayers || 8;
  }

  setIO(io) { this.io = io; }
  setQuery(queryFn) { this.query = queryFn; }

  generateRoomId() {
    return `${this.gameType}_${randomBytes(4).toString('hex')}`;
  }

  createRoom(options = {}) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      gameType: this.gameType,
      players: new Map(),
      spectators: new Map(),
      state: 'waiting',
      phase: 'waiting',
      minBet: options.minBet || 10,
      maxBet: options.maxBet || 1000,
      pot: 0,
      escrow: new Map(),
      createdAt: Date.now(),
      gameState: {},
      turnIndex: 0,
      turnPlayerId: null,
      turnTimer: null,
      disconnectedPlayers: new Map(),
      serverSeed: null,
      serverSeedHash: null,
      clientSeed: null,
      nonce: 0,
      history: [],
    };
    this.rooms.set(roomId, room);
    return room;
  }

  addPlayer(room, socketId, playerData) {
    const player = {
      socketId,
      id: playerData.id || socketId,
      username: playerData.username || 'Guest',
      balance: playerData.balance || 0,
      avatar: playerData.avatar || null,
      avatarUrl: playerData.avatarUrl || null,
      vipTier: playerData.vipTier || 'bronze',
      isBot: playerData.isBot || false,
      isReady: false,
      seat: room.players.size,
      joinedAt: Date.now(),
    };
    room.players.set(socketId, player);
    this.playerRoomMap.set(socketId, room.id);
    return player;
  }

  removePlayer(room, socketId) {
    room.players.delete(socketId);
    this.playerRoomMap.delete(socketId);
    if (room.players.size === 0 && room.state === 'waiting') {
      this.rooms.delete(room.id);
    }
  }

  getPlayerRoom(socketId) {
    const roomId = this.playerRoomMap.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  async escrowBet(room, socketId, amount) {
    if (!Number.isInteger(amount) || amount <= 0) return false;
    if (room.minBet && amount < room.minBet) return false;
    if (room.maxBet && amount > room.maxBet) return false;

    const player = room.players.get(socketId);
    if (!player) return false;
    if (player.isBot) {
      room.escrow.set(socketId, (room.escrow.get(socketId) || 0) + amount);
      room.pot += amount;
      return true;
    }
    if (!player.id || player.id === socketId) return false;
    try {
      const result = await this.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
        [amount, player.id]
      );
      if (!result.rows || result.rows.length === 0) return false;
      room.escrow.set(socketId, (room.escrow.get(socketId) || 0) + amount);
      room.pot += amount;
      player.balance = parseInt(result.rows[0].balance);
      this.emitToPlayer(room, socketId, 'game:balanceUpdate', { balance: player.balance });
      return true;
    } catch (e) {
      console.error(`[${this.gameType}] Escrow error:`, e.message);
      return false;
    }
  }

  async distributePot(room, winners) {
    for (const { socketId, amount } of winners) {
      const player = room.players.get(socketId);
      if (!player || player.isBot) continue;
      if (!player.id || player.id === socketId) continue;
      try {
        await this.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, player.id]);
        player.balance += amount;
        this.emitToPlayer(room, socketId, 'game:balanceUpdate', { balance: player.balance });
        await this.recordWin(player.id, player.username, amount);
      } catch (e) {
        console.error(`[${this.gameType}] Payout error:`, e.message);
      }
    }
    room.pot = 0;
    room.escrow.clear();
  }

  async recordWin(userId, username, amount) {
    if (!this.query || typeof userId !== 'number') return;
    try {
      await this.query(
        `INSERT INTO leaderboard (user_id, username, total_won, balance, games_played, favorite_game, updated_at)
         VALUES ($1, $2, $3, 0, 1, $4, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           total_won = leaderboard.total_won + $3,
           games_played = leaderboard.games_played + 1,
           favorite_game = COALESCE(EXCLUDED.favorite_game, leaderboard.favorite_game),
           updated_at = NOW()`,
        [userId, username, amount, this.gameType]
      );
    } catch (e) { }
  }

  async recordGameHistory(userId, result, betAmount, winAmount) {
    if (!this.query || typeof userId !== 'number') return;
    try {
      await this.query(
        `INSERT INTO game_history (user_id, game, result, bet_amount, win_amount, net)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, this.gameType, result, betAmount, winAmount, winAmount - betAmount]
      );
    } catch (e) { }
  }

  initProvablyFair(room) {
    room.serverSeed = generateServerSeed();
    room.serverSeedHash = hashServerSeed(room.serverSeed);
    room.clientSeed = randomBytes(16).toString('hex');
    room.nonce = 0;
  }

  deriveOutcome(room, count = 1) {
    room.nonce++;
    return deriveOutcomes(room.serverSeed, room.clientSeed, room.nonce, count);
  }

  shuffleDeck(room) {
    const SUITS = ['♠', '♥', '♦', '♣'];
    const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const [f] = this.deriveOutcome(room, 1);
      const j = Math.floor(f * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  broadcastToRoom(room, event, data) {
    if (!this.io) return;
    for (const [sid, player] of room.players) {
      if (!player.isBot) {
        this.io.to(sid).emit(event, data);
      }
    }
  }

  emitToPlayer(room, socketId, event, data) {
    if (!this.io) return;
    const player = room.players.get(socketId);
    if (player && !player.isBot) {
      this.io.to(socketId).emit(event, data);
    }
  }

  getPublicState(room) {
    return {
      roomId: room.id,
      gameType: room.gameType,
      state: room.state,
      phase: room.phase,
      pot: room.pot,
      players: this.getPublicPlayers(room),
      turnPlayerId: room.turnPlayerId,
      serverSeedHash: room.serverSeedHash,
    };
  }

  getPublicPlayers(room) {
    return Array.from(room.players.values()).map(p => ({
      socketId: p.socketId,
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      avatarUrl: p.avatarUrl,
      vipTier: p.vipTier,
      isBot: p.isBot,
      seat: p.seat,
      isReady: p.isReady,
    }));
  }

  getPrivateState(room, socketId) {
    return this.getPublicState(room);
  }

  broadcastState(room) {
    const publicState = this.getPublicState(room);
    for (const [sid, player] of room.players) {
      if (!player.isBot) {
        const privateState = this.getPrivateState(room, sid);
        this.io.to(sid).emit(`${this.gameType}:state`, { ...publicState, ...privateState });
      }
    }
  }

  setTurn(room, socketId) {
    room.turnPlayerId = socketId;
    this.clearTurnTimer(room);
    const player = room.players.get(socketId);
    if (player && player.isBot) {
      setTimeout(() => this.handleBotTurn(room, socketId), 1000 + Math.random() * 2000);
      return;
    }
    room.turnTimer = setTimeout(() => {
      this.handleTurnTimeout(room, socketId);
    }, 30000);
  }

  clearTurnTimer(room) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
  }

  handleTurnTimeout(room, socketId) {
    this.onTurnTimeout(room, socketId);
  }

  onTurnTimeout(room, socketId) { }

  handleBotTurn(room, socketId) { }

  handleDisconnect(room, socketId) {
    const player = room.players.get(socketId);
    if (!player) return;

    if (room.state === 'waiting') {
      this.removePlayer(room, socketId);
      this.broadcastState(room);
      return;
    }

    if (room.turnPlayerId === socketId) {
      this.clearTurnTimer(room);
    }

    room.disconnectedPlayers.set(socketId, {
      player: { ...player },
      disconnectedAt: Date.now(),
      timer: setTimeout(() => {
        this.handleReconnectTimeout(room, socketId);
      }, this.reconnectionTimeout),
    });

    this.broadcastToRoom(room, `${this.gameType}:playerDisconnected`, {
      socketId, username: player.username,
    });
  }

  handleReconnect(room, oldSocketId, newSocketId, playerData) {
    const disconnected = room.disconnectedPlayers.get(oldSocketId);
    if (!disconnected) return false;

    clearTimeout(disconnected.timer);
    room.disconnectedPlayers.delete(oldSocketId);

    const player = disconnected.player;
    player.socketId = newSocketId;
    room.players.delete(oldSocketId);
    room.players.set(newSocketId, player);
    this.playerRoomMap.delete(oldSocketId);
    this.playerRoomMap.set(newSocketId, room.id);

    this.broadcastToRoom(room, `${this.gameType}:playerReconnected`, {
      oldSocketId, newSocketId, username: player.username,
    });
    this.broadcastState(room);
    return true;
  }

  handleReconnectTimeout(room, socketId) {
    room.disconnectedPlayers.delete(socketId);
    this.onTurnTimeout(room, socketId);
  }

  handleAction(room, socketId, action, data) { }

  getPlayerArray(room) {
    return Array.from(room.players.entries());
  }

  getPlayerByIndex(room, index) {
    const entries = this.getPlayerArray(room);
    return entries[index % entries.length];
  }

  getNextPlayerSocketId(room, currentSocketId) {
    const entries = this.getPlayerArray(room);
    const currentIdx = entries.findIndex(([sid]) => sid === currentSocketId);
    if (currentIdx === -1) return entries[0]?.[0];
    return entries[(currentIdx + 1) % entries.length][0];
  }

  cleanup() {
    for (const [roomId, room] of this.rooms) {
      this.clearTurnTimer(room);
      for (const [, dc] of room.disconnectedPlayers) {
        clearTimeout(dc.timer);
      }
    }
    this.rooms.clear();
    this.playerRoomMap.clear();
  }

  getRoomList() {
    const list = [];
    for (const [, room] of this.rooms) {
      list.push({
        id: room.id,
        gameType: room.gameType,
        state: room.state,
        playerCount: room.players.size,
        maxPlayers: this.maxPlayers,
        minBet: room.minBet,
        maxBet: room.maxBet,
      });
    }
    return list;
  }
}
