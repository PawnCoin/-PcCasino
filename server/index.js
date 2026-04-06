import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const PORT = 3001;

// ---- In-memory state ----
const rooms = new Map();
const players = new Map(); // socketId -> player info

function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getPublicRooms() {
  const list = [];
  for (const [id, room] of rooms.entries()) {
    if (!room.isPrivate) {
      list.push({
        id,
        game: room.game,
        name: room.name,
        minBet: room.minBet,
        maxBet: room.maxBet,
        maxPlayers: room.maxPlayers,
        players: room.players.map(p => ({
          id: p.id,
          username: p.username,
          balance: p.balance,
          seat: p.seat,
          isReady: p.isReady,
        })),
        status: room.status,
        pot: room.pot,
        createdAt: room.createdAt,
        isPrivate: room.isPrivate,
      });
    }
  }
  return list;
}

function broadcastLobby() {
  io.emit('lobby:update', { rooms: getPublicRooms() });
}

// Create some initial "AI" rooms to fill the lobby
const defaultGames = ['poker', 'blackjack', 'roulette', 'craps', 'spades', 'slots', 'bingo', 'dominoes'];
const defaultNames = [
  'High Rollers Den', 'Beginners Welcome', 'VIP Lounge', 'Quick Match',
  'Night Owls Table', 'Crypto Kings', 'Diamond Hands', 'Moon Shot Room',
  'Weekend Warriors', 'Pro Circuit', 'The Gold Room', 'Lucky Sevens',
];

for (let i = 0; i < 16; i++) {
  const game = defaultGames[i % defaultGames.length];
  const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
  const id = `default_${i}`;
  rooms.set(id, {
    id,
    game,
    name: `${defaultNames[i % defaultNames.length]} #${i + 1}`,
    minBet: [5, 10, 25, 50, 100, 250, 500][i % 7],
    maxBet: [500, 1000, 5000, 10000, 50000, 100000][i % 6],
    maxPlayers,
    players: [],
    status: 'waiting',
    pot: 0,
    createdAt: Date.now(),
    isPrivate: false,
    hostId: null,
    gameState: null,
    chat: [],
  });
}

// ---- Socket events ----
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // Player identifies themselves
  socket.on('player:identify', ({ username, balance, avatar }) => {
    players.set(socket.id, { id: socket.id, username, balance, avatar, roomId: null, seat: null, isReady: false });
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    io.emit('lobby:stats', { playersOnline: players.size });
  });

  // Fetch lobby
  socket.on('lobby:get', () => {
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    socket.emit('lobby:stats', { playersOnline: players.size });
  });

  // Create room
  socket.on('room:create', ({ game, name, minBet, maxBet, isPrivate, username, balance, avatar }, cb) => {
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, isReady: false };
    players.set(socket.id, { ...player, roomId: null, seat: 0 });

    const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
    const roomId = generateRoomId();

    const newRoom = {
      id: roomId,
      game,
      name: name || `${username}'s Table`,
      minBet: minBet || 10,
      maxBet: maxBet || 1000,
      maxPlayers,
      players: [{ id: socket.id, username, balance, avatar, seat: 0, isReady: false }],
      status: 'waiting',
      pot: 0,
      createdAt: Date.now(),
      isPrivate: !!isPrivate,
      hostId: socket.id,
      gameState: null,
      chat: [],
    };

    rooms.set(roomId, newRoom);
    socket.join(roomId);
    players.get(socket.id).roomId = roomId;

    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room: newRoom, playerId: socket.id });
  });

  // Join room
  socket.on('room:join', ({ roomId, username, balance, avatar }, cb) => {
    const room = rooms.get(roomId);
    if (!room) { if (cb) cb({ success: false, error: 'Room not found' }); return; }
    if (room.players.length >= room.maxPlayers) { if (cb) cb({ success: false, error: 'Room is full' }); return; }

    const seat = room.players.length;
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, isReady: false };
    player.roomId = roomId;
    player.seat = seat;
    players.set(socket.id, player);

    room.players.push({ id: socket.id, username, balance, avatar, seat, isReady: false });
    socket.join(roomId);

    io.to(roomId).emit('room:update', { room });
    io.to(roomId).emit('room:playerJoined', { player: { id: socket.id, username, seat } });
    broadcastLobby();

    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room, playerId: socket.id });
  });

  // Leave room
  socket.on('room:leave', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const roomId = player.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(roomId);
    player.roomId = null;

    if (room.players.length === 0 && roomId.startsWith('room_')) {
      rooms.delete(roomId);
    } else {
      if (room.hostId === socket.id && room.players.length > 0) {
        room.hostId = room.players[0].id;
      }
      io.to(roomId).emit('room:update', { room });
      io.to(roomId).emit('room:playerLeft', { playerId: socket.id, username: player.username });
    }

    broadcastLobby();
  });

  // Player ready state
  socket.on('player:ready', ({ isReady }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;

    const rp = room.players.find(p => p.id === socket.id);
    if (rp) rp.isReady = isReady;

    io.to(player.roomId).emit('room:update', { room });
  });

  // Game action broadcast (game state relay)
  socket.on('game:action', ({ action, data }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;

    // Host/server relays game actions to all players in room
    io.to(player.roomId).emit('game:action', {
      playerId: socket.id,
      username: player.username,
      action,
      data,
      timestamp: Date.now(),
    });
  });

  // Game state sync (host sends state to room)
  socket.on('game:stateSync', ({ gameState }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;

    room.gameState = gameState;
    room.status = gameState.status || room.status;
    socket.to(player.roomId).emit('game:stateSync', { gameState });
  });

  // Game start
  socket.on('game:start', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;

    room.status = 'playing';
    io.to(player.roomId).emit('game:started', { roomId: player.roomId });
    broadcastLobby();
  });

  // Game end
  socket.on('game:end', ({ winners }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;

    room.status = 'waiting';
    room.gameState = null;
    io.to(player.roomId).emit('game:ended', { winners });
    broadcastLobby();
  });

  // Chat message
  socket.on('chat:message', ({ message }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;

    const msg = {
      id: Date.now(),
      playerId: socket.id,
      username: player.username,
      message,
      timestamp: Date.now(),
    };

    const room = rooms.get(player.roomId);
    if (room) {
      room.chat = [...(room.chat || []).slice(-50), msg];
      io.to(player.roomId).emit('chat:message', msg);
    }
  });

  // Reaction
  socket.on('reaction', ({ emoji }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    io.to(player.roomId).emit('reaction', { playerId: socket.id, username: player.username, emoji });
  });

  // Update balance in room
  socket.on('player:balanceUpdate', ({ balance }) => {
    const player = players.get(socket.id);
    if (player) {
      player.balance = balance;
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
          const rp = room.players.find(p => p.id === socket.id);
          if (rp) rp.balance = balance;
          io.to(player.roomId).emit('room:update', { room });
        }
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    const player = players.get(socket.id);
    if (player?.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0 && player.roomId.startsWith('room_')) {
          rooms.delete(player.roomId);
        } else {
          if (room.hostId === socket.id && room.players.length > 0) {
            room.hostId = room.players[0].id;
          }
          io.to(player.roomId).emit('room:playerLeft', { playerId: socket.id, username: player.username });
          io.to(player.roomId).emit('room:update', { room });
        }
      }
    }
    players.delete(socket.id);
    broadcastLobby();
    io.emit('lobby:stats', { playersOnline: players.size });
  });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size, players: players.size }));

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Multiplayer server running on port ${PORT}`);
});
