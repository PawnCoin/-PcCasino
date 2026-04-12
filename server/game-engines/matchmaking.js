const BOT_NAMES = [
  'AceHigh', 'LuckyDraw', 'RoyalFlush', 'CardShark', 'ChipMaster',
  'BigBluff', 'SilverStack', 'GoldRush', 'DiamondDan', 'JackpotJoe',
  'WildCard', 'HighRoller', 'BetMaster', 'PokerFace', 'AllInAndy',
  'SlickRick', 'FastFold', 'CoolHand', 'DoublDown', 'RiverRat',
];

export class MatchmakingSystem {
  constructor() {
    this.queues = new Map();
    this.engines = {};
    this.io = null;
    this.botInterval = null;
  }

  setIO(io) { this.io = io; }
  setEngines(engines) { this.engines = engines; }

  getQueueKey(gameType, betAmount) {
    return `${gameType}:${betAmount}`;
  }

  joinQueue(socketId, gameType, betAmount, playerData) {
    const key = this.getQueueKey(gameType, betAmount);
    if (!this.queues.has(key)) {
      this.queues.set(key, []);
    }

    const queue = this.queues.get(key);
    if (queue.some(p => p.socketId === socketId)) return;

    queue.push({
      socketId,
      playerData,
      joinedAt: Date.now(),
    });

    this.broadcastQueueUpdate(key);
    this.tryMatch(key, gameType, betAmount);
  }

  leaveQueue(socketId) {
    for (const [key, queue] of this.queues) {
      const idx = queue.findIndex(p => p.socketId === socketId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        this.broadcastQueueUpdate(key);
        if (queue.length === 0) this.queues.delete(key);
        return;
      }
    }
  }

  async tryMatch(key, gameType, betAmount) {
    const queue = this.queues.get(key);
    if (!queue) return;

    const engine = this.engines[gameType];
    if (!engine) return;

    const minPlayers = engine.minPlayers;
    if (queue.length < minPlayers) {
      this.scheduleBotFill(key, gameType, betAmount);
      return;
    }

    const matched = queue.splice(0, Math.min(queue.length, engine.maxPlayers));
    if (queue.length === 0) this.queues.delete(key);

    const room = engine.createRoom({ minBet: betAmount, maxBet: betAmount });

    const seated = [];
    for (const entry of matched) {
      engine.addPlayer(room, entry.socketId, entry.playerData);
      if (this.io) {
        const socket = this.io.sockets.sockets.get(entry.socketId);
        if (socket) socket.join(room.id);
      }
      const escrowOk = await engine.escrowBet(room, entry.socketId, betAmount);
      if (!escrowOk) {
        engine.removePlayer(room, entry.socketId);
        if (this.io) this.io.to(entry.socketId).emit('matchmaking:error', { error: 'Insufficient balance' });
      } else {
        seated.push(entry);
      }
    }

    if (seated.length === 0) return;

    const botsNeeded = Math.max(0, minPlayers - seated.length);
    for (let i = 0; i < botsNeeded; i++) {
      this.addBotToRoom(engine, room, betAmount);
    }

    for (const entry of seated) {
      if (this.io) {
        this.io.to(entry.socketId).emit('matchmaking:matched', {
          roomId: room.id,
          gameType,
        });
      }
    }

    if (room.players.size >= minPlayers) {
      await engine.startGame(room);
    }
  }

  scheduleBotFill(key, gameType, betAmount) {
    setTimeout(async () => {
      const queue = this.queues.get(key);
      if (!queue || queue.length === 0) return;

      const engine = this.engines[gameType];
      if (!engine) return;

      const room = engine.createRoom({ minBet: betAmount, maxBet: betAmount });

      const matched = queue.splice(0, queue.length);
      if (queue.length === 0) this.queues.delete(key);

      const seated = [];
      for (const entry of matched) {
        engine.addPlayer(room, entry.socketId, entry.playerData);
        if (this.io) {
          const socket = this.io.sockets.sockets.get(entry.socketId);
          if (socket) socket.join(room.id);
        }
        const escrowOk = await engine.escrowBet(room, entry.socketId, betAmount);
        if (!escrowOk) {
          engine.removePlayer(room, entry.socketId);
          if (this.io) this.io.to(entry.socketId).emit('matchmaking:error', { error: 'Insufficient balance' });
        } else {
          seated.push(entry);
        }
      }

      if (seated.length === 0) return;

      const botsNeeded = Math.max(0, engine.minPlayers - seated.length);
      for (let i = 0; i < Math.max(botsNeeded, 1); i++) {
        this.addBotToRoom(engine, room, betAmount);
      }

      for (const entry of seated) {
        if (this.io) {
          this.io.to(entry.socketId).emit('matchmaking:matched', {
            roomId: room.id,
            gameType,
          });
        }
      }

      if (room.players.size >= engine.minPlayers) {
        await engine.startGame(room);
      }
    }, 10000);
  }

  addBotToRoom(engine, room, betAmount) {
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    engine.addPlayer(room, botId, {
      id: botId,
      username: botName,
      balance: betAmount * 100,
      avatar: `bot_${Math.floor(Math.random() * 20)}`,
      isBot: true,
    });
    engine.escrowBet(room, botId, betAmount);
  }

  broadcastQueueUpdate(key) {
    if (!this.io) return;
    const queue = this.queues.get(key);
    const [gameType, betAmount] = key.split(':');
    this.io.emit('matchmaking:queueUpdate', {
      gameType,
      betAmount: parseInt(betAmount),
      count: queue ? queue.length : 0,
    });
  }

  getQueueStatus() {
    const status = {};
    for (const [key, queue] of this.queues) {
      const [gameType, betAmount] = key.split(':');
      if (!status[gameType]) status[gameType] = [];
      status[gameType].push({
        betAmount: parseInt(betAmount),
        count: queue.length,
      });
    }
    return status;
  }

  getActiveGames() {
    const games = [];
    for (const [gameType, engine] of Object.entries(this.engines)) {
      for (const room of engine.getRoomList()) {
        games.push(room);
      }
    }
    return games;
  }

  cleanup() {
    this.queues.clear();
    if (this.botInterval) {
      clearInterval(this.botInterval);
      this.botInterval = null;
    }
  }
}
