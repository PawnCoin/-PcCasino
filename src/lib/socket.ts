import { io, Socket } from 'socket.io-client';

export interface RoomPlayer {
  id: string;
  username: string;
  balance: number;
  avatar: string;
  avatarUrl?: string | null;
  vipTier?: string;
  seat: number;
  isReady: boolean;
}

export interface Room {
  id: string;
  game: string;
  name: string;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  players: RoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  pot: number;
  createdAt: number;
  isPrivate: boolean;
  hostId: string | null;
  gameState: unknown;
  chat: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  playerId: string;
  username: string;
  message: string;
  timestamp: number;
}

// In dev, vite proxies /socket.io → :3001; in production use same origin
const SOCKET_URL = window.location.port === '5000' || window.location.port === ''
  ? window.location.origin
  : `${window.location.protocol}//${window.location.hostname}:3001`;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function identifyPlayer(username: string, balance: number, avatar: string, avatarUrl?: string | null, userId?: string) {
  getSocket().emit('player:identify', { username, balance, avatar, avatarUrl: avatarUrl || null, userId: userId || undefined });
}

export function getLobby() {
  getSocket().emit('lobby:get');
}

export function createRoom(
  game: string,
  name: string,
  minBet: number,
  maxBet: number,
  isPrivate: boolean,
  username: string,
  balance: number,
  avatar: string,
  cb: (res: { success: boolean; roomId?: string; error?: string }) => void,
  avatarUrl?: string | null
) {
  getSocket().emit('room:create', { game, name, minBet, maxBet, isPrivate, username, balance, avatar, avatarUrl: avatarUrl || null }, cb);
}

export function joinRoom(
  roomId: string,
  username: string,
  balance: number,
  avatar: string,
  cb: (res: { success: boolean; roomId?: string; error?: string }) => void,
  avatarUrl?: string | null
) {
  getSocket().emit('room:join', { roomId, username, balance, avatar, avatarUrl: avatarUrl || null }, cb);
}

export function leaveRoom() {
  getSocket().emit('room:leave');
}

export function setReady(isReady: boolean) {
  getSocket().emit('player:ready', { isReady });
}

export function sendChatMessage(message: string) {
  getSocket().emit('chat:message', { message });
}

export function sendReaction(emoji: string) {
  getSocket().emit('reaction', { emoji });
}

export function sendGameAction(action: string, data: unknown) {
  getSocket().emit('game:action', { action, data });
}

export function syncGameState(gameState: unknown) {
  getSocket().emit('game:stateSync', { gameState });
}

export function startGame() {
  getSocket().emit('game:start');
}

export function endGame(winners: Array<{ id: string; username: string; amount: number }>) {
  getSocket().emit('game:end', { winners });
}

export function updateBalance(balance: number) {
  getSocket().emit('player:balanceUpdate', { balance });
}
