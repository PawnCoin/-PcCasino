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

// ---- In-memory data stores ----
const rooms = new Map();
const players = new Map();
const disputes = new Map();
const tournaments = new Map();
const referrals = new Map();
const adminLogs = [];
const pcpaymentsConfig = { apiKey: '', webhookSecret: '', endpoint: '', enabled: false };

// ---- Leaderboard (updated by wins) ----
const leaderboard = [
  { id: 'u1', username: 'HighRoller_King', totalWon: 8900000, balance: 2450000, winStreak: 12, favoriteGame: 'Poker', gamesPlayed: 342 },
  { id: 'u2', username: 'VegasQueen', totalWon: 6200000, balance: 1890000, winStreak: 8, favoriteGame: 'Blackjack', gamesPlayed: 289 },
  { id: 'u3', username: 'LuckyAce', totalWon: 4800000, balance: 1560000, winStreak: 15, favoriteGame: 'Bingo', gamesPlayed: 415 },
  { id: 'u4', username: 'CryptoWhale', totalWon: 3500000, balance: 1230000, winStreak: 5, favoriteGame: 'Roulette', gamesPlayed: 198 },
  { id: 'u5', username: 'DiamondHands', totalWon: 2800000, balance: 980000, winStreak: 7, favoriteGame: 'Craps', gamesPlayed: 267 },
  { id: 'u6', username: 'NightOwl', totalWon: 2100000, balance: 850000, winStreak: 4, favoriteGame: 'Poker', gamesPlayed: 312 },
  { id: 'u7', username: 'RoyalFlush', totalWon: 1800000, balance: 720000, winStreak: 9, favoriteGame: 'Poker', gamesPlayed: 188 },
  { id: 'u8', username: 'JackpotHunter', totalWon: 1500000, balance: 650000, winStreak: 3, favoriteGame: 'Slots', gamesPlayed: 502 },
  { id: 'u9', username: 'CardShark', totalWon: 1200000, balance: 580000, winStreak: 6, favoriteGame: 'Blackjack', gamesPlayed: 224 },
  { id: 'u10', username: 'SpadesMaster', totalWon: 980000, balance: 490000, winStreak: 11, favoriteGame: 'Spades', gamesPlayed: 165 },
];

// ---- Recent winners feed ----
const recentWinners = [];
const winnerNames = ['CryptoKing','PokerFace','DiceMaster','Lucky7','SpadesPro','BlackjackBJ','MoonShot','DiamondHands','LuckyStrike','HighRoller','CryptoQueen','WhaleAlert','AllIn','RoyalFlush','GoldRush','NightOwl','BingoBoss','SlotKing'];
const winnerGames = ['Slots','Texas Hold\'em','Blackjack','Roulette','Craps','Spades','Bingo','Dominoes'];

function generateWinner() {
  const name = winnerNames[Math.floor(Math.random() * winnerNames.length)];
  const game = winnerGames[Math.floor(Math.random() * winnerGames.length)];
  const amount = Math.floor(Math.random() * 95000) + 500;
  const multiplier = Math.floor(Math.random() * 50) + 2;
  return { id: Date.now().toString(), name, game, amount, multiplier, timestamp: Date.now() };
}

// Seed initial winners
for (let i = 0; i < 8; i++) recentWinners.push(generateWinner());

// Broadcast a new winner every 8-15 seconds
setInterval(() => {
  if (Math.random() > 0.4) {
    const winner = generateWinner();
    recentWinners.unshift(winner);
    if (recentWinners.length > 50) recentWinners.pop();
    io.emit('winners:new', winner);
  }
}, 10000);

// Broadcast leaderboard updates every 30 seconds
setInterval(() => {
  io.emit('leaderboard:update', { leaderboard });
}, 30000);

// ---- Default rooms ----
const defaultGames = ['poker', 'blackjack', 'roulette', 'craps', 'spades', 'slots', 'bingo', 'dominoes'];
const defaultNames = ['High Rollers Den','Beginners Welcome','VIP Lounge','Quick Match','Night Owls Table','Crypto Kings','Diamond Hands','Moon Shot Room','Weekend Warriors','Pro Circuit','The Gold Room','Lucky Sevens'];

for (let i = 0; i < 16; i++) {
  const game = defaultGames[i % defaultGames.length];
  const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
  const id = `default_${i}`;
  rooms.set(id, { id, game, name: `${defaultNames[i % defaultNames.length]} #${i + 1}`, minBet: [5,10,25,50,100,250,500][i%7], maxBet: [500,1000,5000,10000,50000,100000][i%6], maxPlayers, players: [], status: 'waiting', pot: 0, createdAt: Date.now(), isPrivate: false, hostId: null, gameState: null, chat: [] });
}

// Default tournaments
const defaultTournaments = [
  { id: 't1', name: 'Sunday Poker Championship', game: 'poker', entryFee: 5000, prizePool: 500000, maxPlayers: 100, registeredPlayers: 67, startTime: Date.now() + 7200000, status: 'registering', type: 'knockout' },
  { id: 't2', name: 'Blackjack Masters', game: 'blackjack', entryFee: 2500, prizePool: 200000, maxPlayers: 50, registeredPlayers: 34, startTime: Date.now() + 14400000, status: 'registering', type: 'points' },
  { id: 't3', name: 'Slots Jackpot Race', game: 'slots', entryFee: 1000, prizePool: 100000, maxPlayers: 200, registeredPlayers: 156, startTime: Date.now() + 3600000, status: 'registering', type: 'race' },
  { id: 't4', name: 'Roulette Championship', game: 'roulette', entryFee: 10000, prizePool: 1000000, maxPlayers: 30, registeredPlayers: 28, startTime: Date.now() + 86400000, status: 'registering', type: 'knockout' },
  { id: 't5', name: 'Spades Open', game: 'spades', entryFee: 500, prizePool: 50000, maxPlayers: 40, registeredPlayers: 12, startTime: Date.now() + 172800000, status: 'registering', type: 'round-robin' },
];
defaultTournaments.forEach(t => tournaments.set(t.id, t));

// ---- Helper functions ----
function generateRoomId() { return `room_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

function getPublicRooms() {
  return Array.from(rooms.values()).filter(r => !r.isPrivate).map(r => ({
    id: r.id, game: r.game, name: r.name, minBet: r.minBet, maxBet: r.maxBet, maxPlayers: r.maxPlayers,
    players: r.players.map(p => ({ id: p.id, username: p.username, balance: p.balance, seat: p.seat, isReady: p.isReady })),
    status: r.status, pot: r.pot, createdAt: r.createdAt, isPrivate: r.isPrivate,
  }));
}

function broadcastLobby() { io.emit('lobby:update', { rooms: getPublicRooms() }); }

function logAdmin(action, data) { adminLogs.unshift({ id: Date.now(), action, data, timestamp: Date.now() }); if (adminLogs.length > 500) adminLogs.pop(); }

// ---- REST API ----

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size, players: players.size }));

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const sorted = [...leaderboard].sort((a, b) => b.totalWon - a.totalWon).map((p, i) => ({ ...p, rank: i + 1 }));
  res.json({ leaderboard: sorted, totalPlayers: players.size + 100, lastUpdated: Date.now() });
});

// Recent winners
app.get('/api/winners', (req, res) => {
  res.json({ winners: recentWinners.slice(0, 20) });
});

// Stats for lobby banner
app.get('/api/stats', (req, res) => {
  const totalWon = leaderboard.reduce((s, p) => s + p.totalWon, 0);
  res.json({
    playersOnline: players.size + Math.floor(Math.random() * 500) + 500,
    activeTables: rooms.size,
    totalWonToday: totalWon,
    jackpot: 500000 + Math.floor(Math.random() * 100000),
    gamesPlayed24h: 8472 + Math.floor(Math.random() * 200),
  });
});

// Disputes
app.get('/api/disputes', (req, res) => { res.json({ disputes: Array.from(disputes.values()) }); });

app.post('/api/disputes', (req, res) => {
  const { userId, username, game, sessionId, description, amount, evidence } = req.body;
  if (!userId || !game || !description) return res.status(400).json({ error: 'Missing required fields' });
  const dispute = { id: `dispute_${Date.now()}`, userId, username, game, sessionId, description, amount: amount || 0, evidence: evidence || '', status: 'open', createdAt: Date.now(), updatedAt: Date.now(), resolution: null, refundAmount: null };
  disputes.set(dispute.id, dispute);
  logAdmin('dispute:created', dispute);
  io.emit('admin:disputeNew', dispute);
  res.json({ dispute });
});

app.patch('/api/disputes/:id', (req, res) => {
  const dispute = disputes.get(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Not found' });
  const { status, resolution, refundAmount, adminNote } = req.body;
  Object.assign(dispute, { status, resolution, refundAmount: refundAmount || 0, adminNote, updatedAt: Date.now() });
  disputes.set(dispute.id, dispute);
  logAdmin('dispute:updated', dispute);
  io.to(`user_${dispute.userId}`).emit('dispute:updated', dispute);
  res.json({ dispute });
});

// Tournaments
app.get('/api/tournaments', (req, res) => {
  res.json({ tournaments: Array.from(tournaments.values()) });
});

app.post('/api/tournaments/:id/register', (req, res) => {
  const t = tournaments.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.registeredPlayers >= t.maxPlayers) return res.status(400).json({ error: 'Tournament full' });
  const { userId, username } = req.body;
  if (!t.registeredUserIds) t.registeredUserIds = [];
  if (t.registeredUserIds.includes(userId)) return res.status(400).json({ error: 'Already registered' });
  t.registeredUserIds.push(userId);
  t.registeredPlayers++;
  tournaments.set(t.id, t);
  logAdmin('tournament:register', { userId, username, tournamentId: t.id });
  io.emit('tournament:update', t);
  res.json({ tournament: t, success: true });
});

// Referrals
app.post('/api/referrals', (req, res) => {
  const { referrerId, referrerUsername } = req.body;
  const code = `${referrerUsername.toUpperCase().slice(0, 6)}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const referral = { code, referrerId, referrerUsername, uses: 0, earnings: 0, createdAt: Date.now() };
  referrals.set(code, referral);
  res.json({ referral });
});

app.post('/api/referrals/use', (req, res) => {
  const { code, newUserId } = req.body;
  const ref = referrals.get(code);
  if (!ref) return res.status(404).json({ error: 'Invalid referral code' });
  ref.uses++;
  ref.earnings += 50000000;
  referrals.set(code, ref);
  logAdmin('referral:used', { code, newUserId });
  res.json({ success: true, bonusAmount: 50000000 });
});

app.get('/api/referrals/:userId', (req, res) => {
  const userRefs = Array.from(referrals.values()).filter(r => r.referrerId === req.params.userId);
  res.json({ referrals: userRefs });
});

// PcPayments API integration
app.get('/api/pcpayments/config', (req, res) => { res.json({ config: { ...pcpaymentsConfig, apiKey: pcpaymentsConfig.apiKey ? '***configured***' : '' } }); });

app.post('/api/pcpayments/config', (req, res) => {
  const { apiKey, webhookSecret, endpoint, enabled } = req.body;
  if (apiKey) pcpaymentsConfig.apiKey = apiKey;
  if (webhookSecret) pcpaymentsConfig.webhookSecret = webhookSecret;
  if (endpoint) pcpaymentsConfig.endpoint = endpoint;
  if (enabled !== undefined) pcpaymentsConfig.enabled = enabled;
  logAdmin('pcpayments:configured', { endpoint: pcpaymentsConfig.endpoint, enabled: pcpaymentsConfig.enabled });
  res.json({ success: true, config: { ...pcpaymentsConfig, apiKey: '***set***' } });
});

app.post('/api/pcpayments/webhook', (req, res) => {
  const { type, userId, amount, txHash } = req.body;
  logAdmin('pcpayments:webhook', { type, userId, amount, txHash });
  if (type === 'deposit') io.to(`user_${userId}`).emit('payment:deposit', { amount, txHash });
  if (type === 'withdrawal') io.to(`user_${userId}`).emit('payment:withdrawal', { amount, txHash });
  res.json({ received: true });
});

// Admin routes
app.get('/api/admin/users', (req, res) => {
  const list = Array.from(players.values()).map(p => ({ id: p.id, username: p.username, balance: p.balance, roomId: p.roomId, connectedAt: p.connectedAt }));
  res.json({ users: list, total: list.length });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    playersOnline: players.size,
    activeTables: rooms.size,
    activeDisputes: Array.from(disputes.values()).filter(d => d.status === 'open').length,
    activeTournaments: Array.from(tournaments.values()).filter(t => t.status !== 'finished').length,
    totalReferrals: referrals.size,
    totalWon: leaderboard.reduce((s, p) => s + p.totalWon, 0),
    adminLogs: adminLogs.slice(0, 20),
  });
});

app.get('/api/admin/logs', (req, res) => { res.json({ logs: adminLogs }); });

app.post('/api/admin/broadcast', (req, res) => {
  const { message, type } = req.body;
  io.emit('admin:broadcast', { message, type: type || 'info', timestamp: Date.now() });
  logAdmin('broadcast', { message });
  res.json({ success: true });
});

app.post('/api/admin/disputes/:id/resolve', (req, res) => {
  const dispute = disputes.get(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Not found' });
  const { resolution, refundAmount, status } = req.body;
  Object.assign(dispute, { status: status || 'resolved', resolution, refundAmount: refundAmount || 0, updatedAt: Date.now() });
  disputes.set(dispute.id, dispute);
  logAdmin('admin:dispute:resolved', dispute);
  io.to(`user_${dispute.userId}`).emit('dispute:updated', dispute);
  if (refundAmount) io.to(`user_${dispute.userId}`).emit('payment:refund', { amount: refundAmount, disputeId: dispute.id });
  res.json({ dispute });
});

// ---- Socket.io events ----
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on('player:identify', ({ username, balance, avatar, userId }) => {
    const player = { id: userId || socket.id, socketId: socket.id, username, balance, avatar, roomId: null, seat: null, isReady: false, connectedAt: Date.now() };
    players.set(socket.id, player);
    if (userId) socket.join(`user_${userId}`);
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    socket.emit('leaderboard:update', { leaderboard });
    socket.emit('winners:list', { winners: recentWinners.slice(0, 10) });
    io.emit('lobby:stats', { playersOnline: players.size });
  });

  socket.on('lobby:get', () => {
    socket.emit('lobby:update', { rooms: getPublicRooms() });
    socket.emit('lobby:stats', { playersOnline: players.size });
    socket.emit('leaderboard:update', { leaderboard });
    socket.emit('winners:list', { winners: recentWinners.slice(0, 10) });
  });

  socket.on('room:create', ({ game, name, minBet, maxBet, isPrivate, username, balance, avatar }, cb) => {
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, isReady: false };
    players.set(socket.id, { ...player, roomId: null, seat: 0 });
    const maxPlayers = game === 'poker' ? 6 : game === 'spades' ? 4 : game === 'dominoes' ? 4 : game === 'bingo' ? 20 : 8;
    const roomId = generateRoomId();
    const newRoom = { id: roomId, game, name: name || `${username}'s Table`, minBet: minBet || 10, maxBet: maxBet || 1000, maxPlayers, players: [{ id: socket.id, username, balance, avatar, seat: 0, isReady: false }], status: 'waiting', pot: 0, createdAt: Date.now(), isPrivate: !!isPrivate, hostId: socket.id, gameState: null, chat: [] };
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    players.get(socket.id).roomId = roomId;
    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room: newRoom, playerId: socket.id });
  });

  socket.on('room:join', ({ roomId, username, balance, avatar }, cb) => {
    const room = rooms.get(roomId);
    if (!room) { if (cb) cb({ success: false, error: 'Room not found' }); return; }
    if (room.players.length >= room.maxPlayers) { if (cb) cb({ success: false, error: 'Room is full' }); return; }
    const seat = room.players.length;
    const player = players.get(socket.id) || { id: socket.id, username, balance, avatar, isReady: false };
    player.roomId = roomId; player.seat = seat;
    players.set(socket.id, player);
    room.players.push({ id: socket.id, username, balance, avatar, seat, isReady: false });
    socket.join(roomId);
    io.to(roomId).emit('room:update', { room });
    io.to(roomId).emit('room:playerJoined', { player: { id: socket.id, username, seat } });
    broadcastLobby();
    if (cb) cb({ success: true, roomId });
    socket.emit('room:joined', { room, playerId: socket.id });
  });

  socket.on('room:leave', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(player.roomId);
    const roomId = player.roomId;
    player.roomId = null;
    if (room.players.length === 0 && roomId.startsWith('room_')) { rooms.delete(roomId); }
    else {
      if (room.hostId === socket.id && room.players.length > 0) room.hostId = room.players[0].id;
      io.to(roomId).emit('room:update', { room });
      io.to(roomId).emit('room:playerLeft', { playerId: socket.id, username: player.username });
    }
    broadcastLobby();
  });

  socket.on('player:ready', ({ isReady }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    const rp = room.players.find(p => p.id === socket.id);
    if (rp) rp.isReady = isReady;
    io.to(player.roomId).emit('room:update', { room });
  });

  socket.on('game:action', ({ action, data }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    io.to(player.roomId).emit('game:action', { playerId: socket.id, username: player.username, action, data, timestamp: Date.now() });
  });

  socket.on('game:stateSync', ({ gameState }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    room.gameState = gameState;
    room.status = gameState.status || room.status;
    socket.to(player.roomId).emit('game:stateSync', { gameState });
  });

  socket.on('game:start', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    room.status = 'playing';
    io.to(player.roomId).emit('game:started', { roomId: player.roomId });
    broadcastLobby();
  });

  socket.on('game:win', ({ amount, game, username }) => {
    const winner = generateWinner();
    winner.name = username || winner.name;
    winner.game = game || winner.game;
    winner.amount = amount || winner.amount;
    recentWinners.unshift(winner);
    if (recentWinners.length > 50) recentWinners.pop();
    io.emit('winners:new', winner);
    const lb = leaderboard.find(p => p.username === username);
    if (lb) { lb.totalWon += amount; lb.gamesPlayed++; }
    io.emit('leaderboard:update', { leaderboard });
  });

  socket.on('game:end', ({ winners }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.status = 'waiting'; room.gameState = null;
    io.to(player.roomId).emit('game:ended', { winners });
    broadcastLobby();
  });

  socket.on('chat:message', ({ message }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const msg = { id: Date.now(), playerId: socket.id, username: player.username, message, timestamp: Date.now() };
    const room = rooms.get(player.roomId);
    if (room) { room.chat = [...(room.chat || []).slice(-50), msg]; io.to(player.roomId).emit('chat:message', msg); }
  });

  socket.on('reaction', ({ emoji }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    io.to(player.roomId).emit('reaction', { playerId: socket.id, username: player.username, emoji });
  });

  socket.on('player:balanceUpdate', ({ balance }) => {
    const player = players.get(socket.id);
    if (player) {
      player.balance = balance;
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) { const rp = room.players.find(p => p.id === socket.id); if (rp) { rp.balance = balance; io.to(player.roomId).emit('room:update', { room }); } }
      }
    }
  });

  // Submit game win to leaderboard
  socket.on('leaderboard:submitWin', ({ username, amount, game }) => {
    const entry = leaderboard.find(p => p.username === username);
    if (entry) { entry.totalWon += amount; entry.gamesPlayed++; }
    io.emit('leaderboard:update', { leaderboard });
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player?.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0 && player.roomId.startsWith('room_')) rooms.delete(player.roomId);
        else {
          if (room.hostId === socket.id && room.players.length > 0) room.hostId = room.players[0].id;
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

httpServer.listen(PORT, '0.0.0.0', () => console.log(`Multiplayer server running on :${PORT}`));
