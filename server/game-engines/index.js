import { PokerEngine } from './PokerEngine.js';
import { BlackjackEngine } from './BlackjackEngine.js';
import { SpadesEngine } from './SpadesEngine.js';
import { DominoesEngine } from './DominoesEngine.js';
import { PoolEngine } from './PoolEngine.js';
import { DartsEngine } from './DartsEngine.js';
import { BingoEngine } from './BingoEngine.js';
import { MatchmakingSystem } from './matchmaking.js';

export function createGameEngines(io, queryFn) {
  const pokerEngine = new PokerEngine();
  const blackjackEngine = new BlackjackEngine();
  const spadesEngine = new SpadesEngine();
  const dominoesEngine = new DominoesEngine();
  const poolEngine = new PoolEngine();
  const dartsEngine = new DartsEngine();
  const bingoEngine = new BingoEngine();

  const engines = {
    poker: pokerEngine,
    blackjack: blackjackEngine,
    spades: spadesEngine,
    dominoes: dominoesEngine,
    pool: poolEngine,
    darts: dartsEngine,
    bingo: bingoEngine,
  };

  for (const engine of Object.values(engines)) {
    engine.setIO(io);
    engine.setQuery(queryFn);
  }

  const matchmaking = new MatchmakingSystem();
  matchmaking.setIO(io);
  matchmaking.setEngines(engines);

  function registerSocketHandlers(socket, players) {
    if (socket._engineHandlersRegistered) return;
    socket._engineHandlersRegistered = true;

    socket.on('matchmaking:join', ({ gameType, betAmount }) => {
      if (!Number.isInteger(betAmount) || betAmount <= 0) { socket.emit('matchmaking:error', { error: 'Invalid bet amount' }); return; }
      const player = players.get(socket.id);
      if (!player) return;
      matchmaking.joinQueue(socket.id, gameType, betAmount, {
        id: player.id,
        username: player.username,
        balance: player.balance,
        avatar: player.avatar,
        avatarUrl: player.avatarUrl,
        vipTier: player.vipTier,
      });
      socket.emit('matchmaking:joined', { gameType, betAmount });
    });

    socket.on('matchmaking:leave', () => {
      matchmaking.leaveQueue(socket.id);
      socket.emit('matchmaking:left', {});
    });

    socket.on('matchmaking:status', () => {
      socket.emit('matchmaking:status', {
        queues: matchmaking.getQueueStatus(),
        activeGames: matchmaking.getActiveGames(),
      });
    });

    for (const [gameType, engine] of Object.entries(engines)) {
      socket.on(`${gameType}:action`, ({ action, data }) => {
        const room = engine.getPlayerRoom(socket.id);
        if (!room) return;
        engine.handleAction(room, socket.id, action, data);
      });

      socket.on(`${gameType}:ready`, () => {
        const room = engine.getPlayerRoom(socket.id);
        if (!room) return;
        const player = room.players.get(socket.id);
        if (player) player.isReady = true;

        const allReady = Array.from(room.players.values()).every(p => p.isReady || p.isBot);
        if (allReady && room.players.size >= engine.minPlayers && room.state === 'waiting') {
          engine.startGame(room);
        }
        engine.broadcastState(room);
      });

      socket.on(`${gameType}:getState`, () => {
        const room = engine.getPlayerRoom(socket.id);
        if (!room) return;
        const publicState = engine.getPublicState(room);
        const privateState = engine.getPrivateState(room, socket.id);
        socket.emit(`${gameType}:state`, { ...publicState, ...privateState });
      });
    }

    socket.on('engine:createRoom', async ({ gameType, betAmount }) => {
      const engine = engines[gameType];
      if (!engine) { socket.emit('engine:error', { error: 'Unknown game type' }); return; }
      if (!Number.isInteger(betAmount) || betAmount <= 0) { socket.emit('engine:error', { error: 'Invalid bet amount' }); return; }

      const player = players.get(socket.id);
      if (!player) { socket.emit('engine:error', { error: 'Not identified' }); return; }

      const room = engine.createRoom({ minBet: betAmount, maxBet: betAmount });
      engine.addPlayer(room, socket.id, {
        id: player.id,
        username: player.username,
        balance: player.balance,
        avatar: player.avatar,
        avatarUrl: player.avatarUrl,
        vipTier: player.vipTier,
      });
      socket.join(room.id);

      if (betAmount > 0) {
        const ok = await engine.escrowBet(room, socket.id, betAmount);
        if (!ok) {
          engine.removePlayer(room, socket.id);
          socket.emit('engine:error', { error: 'Insufficient balance' });
          return;
        }
      }

      socket.emit('engine:roomCreated', { roomId: room.id, gameType });
      engine.broadcastState(room);
    });

    socket.on('engine:joinRoom', async ({ roomId, gameType, betAmount }) => {
      const engine = engines[gameType];
      if (!engine) { socket.emit('engine:error', { error: 'Unknown game type' }); return; }

      const player = players.get(socket.id);
      if (!player) { socket.emit('engine:error', { error: 'Not identified' }); return; }
      if (betAmount !== undefined && (!Number.isInteger(betAmount) || betAmount <= 0)) { socket.emit('engine:error', { error: 'Invalid bet amount' }); return; }

      const existingRoom = engine.getPlayerRoom(socket.id);
      if (existingRoom) {
        socket.join(existingRoom.id);
        socket.emit('engine:roomJoined', { roomId: existingRoom.id, gameType });
        engine.broadcastState(existingRoom);
        return;
      }

      for (const [, r] of engine.rooms) {
        for (const [oldSid, dc] of r.disconnectedPlayers) {
          if (dc.player.id === player.id) {
            const success = engine.handleReconnect(r, oldSid, socket.id, player);
            if (success) {
              socket.join(r.id);
              socket.emit('engine:roomJoined', { roomId: r.id, gameType });
              return;
            }
          }
        }
      }

      const room = engine.rooms.get(roomId);
      if (!room) { socket.emit('engine:error', { error: 'Room not found' }); return; }
      if (room.players.size >= engine.maxPlayers) { socket.emit('engine:error', { error: 'Room full' }); return; }
      if (room.state !== 'waiting') { socket.emit('engine:error', { error: 'Game in progress' }); return; }

      engine.addPlayer(room, socket.id, {
        id: player.id,
        username: player.username,
        balance: player.balance,
        avatar: player.avatar,
        avatarUrl: player.avatarUrl,
        vipTier: player.vipTier,
      });
      socket.join(room.id);

      const escrowAmount = room.minBet || 0;
      if (escrowAmount > 0) {
        const ok = await engine.escrowBet(room, socket.id, escrowAmount);
        if (!ok) {
          engine.removePlayer(room, socket.id);
          socket.emit('engine:error', { error: 'Insufficient balance for room minimum bet' });
          return;
        }
      }

      socket.emit('engine:roomJoined', { roomId: room.id, gameType });
      engine.broadcastState(room);
    });

    socket.on('engine:leaveRoom', ({ gameType }) => {
      const engine = engines[gameType];
      if (!engine) return;
      const room = engine.getPlayerRoom(socket.id);
      if (!room) return;

      if (room.state === 'playing') {
        engine.handleDisconnect(room, socket.id);
      } else {
        engine.removePlayer(room, socket.id);
        engine.broadcastState(room);
      }
      socket.leave(room.id);
    });

    socket.on('engine:addBots', ({ gameType, count }) => {
      const engine = engines[gameType];
      if (!engine) return;
      const room = engine.getPlayerRoom(socket.id);
      if (!room || room.state !== 'waiting') return;

      const numToAdd = Math.min(count || 1, engine.maxPlayers - room.players.size);
      for (let i = 0; i < numToAdd; i++) {
        matchmaking.addBotToRoom(engine, room, room.minBet);
        const botEntries = Array.from(room.players.entries()).filter(([, p]) => p.isBot);
        const lastBot = botEntries[botEntries.length - 1];
        if (lastBot) {
          const [, botPlayer] = lastBot;
          botPlayer.isReady = true;
        }
      }
      engine.broadcastState(room);
    });
  }

  function handleDisconnect(socketId) {
    matchmaking.leaveQueue(socketId);
    for (const engine of Object.values(engines)) {
      const room = engine.getPlayerRoom(socketId);
      if (room) {
        engine.handleDisconnect(room, socketId);
      }
    }
  }

  return {
    engines,
    matchmaking,
    registerSocketHandlers,
    handleDisconnect,
  };
}
