import { BaseGameEngine } from './BaseGameEngine.js';

function getScore(x, y) {
  const cx = 250, cy = 250;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  let angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;

  if (dist <= 8) return { score: 50, multiplier: 1, segment: 'bullseye' };
  if (dist <= 20) return { score: 25, multiplier: 1, segment: 'outer-bull' };

  const segments = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const segAngle = 360 / 20;
  const adjustedAngle = (angle + segAngle / 2) % 360;
  const segIdx = Math.floor(adjustedAngle / segAngle);
  const baseScore = segments[segIdx] || 20;

  if (dist > 162 && dist <= 178) return { score: baseScore * 3, multiplier: 3, segment: `T${baseScore}` };
  if (dist > 98 && dist <= 114) return { score: baseScore * 2, multiplier: 2, segment: `D${baseScore}` };
  if (dist > 178) return { score: 0, multiplier: 0, segment: 'miss' };

  return { score: baseScore, multiplier: 1, segment: `${baseScore}` };
}

export class DartsEngine extends BaseGameEngine {
  constructor() {
    super('darts', { minPlayers: 2, maxPlayers: 4 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      mode: options.gameMode || '501',
      playerOrder: [],
      scores: {},
      currentPlayerIdx: 0,
      throwsThisTurn: 0,
      turnScores: [],
      roundHistory: [],
      winner: null,
      cricketState: {},
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size < 2) return;
    room.state = 'playing';
    room.phase = 'playing';
    this.initProvablyFair(room);

    const gs = room.gameState;
    gs.playerOrder = [];
    gs.scores = {};
    gs.currentPlayerIdx = 0;
    gs.throwsThisTurn = 0;
    gs.turnScores = [];
    gs.roundHistory = [];
    gs.winner = null;
    gs.cricketState = {};

    for (const [sid] of room.players) {
      gs.playerOrder.push(sid);
      gs.scores[sid] = gs.mode === '501' ? 501 : 0;
      if (gs.mode === 'cricket') {
        gs.cricketState[sid] = { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 };
      }
    }

    this.broadcastState(room);
    this.setTurn(room, gs.playerOrder[0]);
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;
    if (room.turnPlayerId !== socketId) return;

    switch (action) {
      case 'throw': this.handleThrow(room, socketId, data); break;
      default: return;
    }
  }

  handleThrow(room, socketId, data) {
    const gs = room.gameState;
    if (gs.throwsThisTurn >= 3) return;

    const { x, y } = data || {};
    if (typeof x !== 'number' || typeof y !== 'number') return;

    const result = getScore(x, y);
    gs.throwsThisTurn++;
    gs.turnScores.push(result);

    this.broadcastToRoom(room, 'darts:throwResult', {
      socketId, result, throwNumber: gs.throwsThisTurn,
    });

    if (gs.mode === '501') {
      const currentScore = gs.scores[socketId];
      const turnTotal = gs.turnScores.reduce((s, r) => s + r.score, 0);
      const newScore = currentScore - turnTotal;

      if (newScore === 0 && result.multiplier === 2) {
        gs.scores[socketId] = 0;
        gs.winner = socketId;
        this.finishGame(room);
        return;
      }

      if (newScore < 0 || newScore === 0 || newScore === 1) {
        this.broadcastToRoom(room, 'darts:bust', { socketId });
        gs.turnScores = [];
        gs.throwsThisTurn = 0;
        this.advanceTurn(room);
        return;
      }
    }

    if (gs.mode === 'cricket') {
      this.applyCricketScore(room, socketId, result);
      if (this.checkCricketWin(room, socketId)) {
        gs.winner = socketId;
        this.finishGame(room);
        return;
      }
    }

    if (gs.throwsThisTurn >= 3) {
      if (gs.mode === '501') {
        const turnTotal = gs.turnScores.reduce((s, r) => s + r.score, 0);
        gs.scores[socketId] -= turnTotal;
      }
      gs.roundHistory.push({ socketId, scores: [...gs.turnScores] });
      gs.turnScores = [];
      gs.throwsThisTurn = 0;
      this.advanceTurn(room);
    } else {
      this.broadcastState(room);
    }
  }

  applyCricketScore(room, socketId, result) {
    const gs = room.gameState;
    const state = gs.cricketState[socketId];
    if (!state) return;

    const segment = result.segment;
    let key = null;
    if (segment === 'bullseye' || segment === 'outer-bull') key = 'bull';
    else {
      const num = parseInt(segment.replace(/[TD]/g, ''));
      if ([15, 16, 17, 18, 19, 20].includes(num)) key = String(num);
    }
    if (!key) return;

    const marks = result.multiplier;
    state[key] = Math.min((state[key] || 0) + marks, 3);
  }

  checkCricketWin(room, socketId) {
    const gs = room.gameState;
    const state = gs.cricketState[socketId];
    if (!state) return false;
    return Object.values(state).every(v => v >= 3);
  }

  advanceTurn(room) {
    const gs = room.gameState;
    gs.currentPlayerIdx = (gs.currentPlayerIdx + 1) % gs.playerOrder.length;
    const nextSid = gs.playerOrder[gs.currentPlayerIdx];
    this.broadcastState(room);
    this.setTurn(room, nextSid);
  }

  async finishGame(room) {
    const gs = room.gameState;
    room.state = 'finished';
    room.phase = 'finished';
    this.clearTurnTimer(room);

    const winnerId = gs.winner;
    if (winnerId) {
      const player = room.players.get(winnerId);
      if (player && !player.isBot && player.id && typeof player.id === 'number') {
        const winAmount = room.pot;
        await this.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [winAmount, player.id]).catch(() => {});
        player.balance += winAmount;
        await this.recordGameHistory(player.id, 'win', room.escrow.get(winnerId) || 0, winAmount);
      }
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
    gs.turnScores = [];
    gs.throwsThisTurn = 0;
    this.broadcastToRoom(room, 'darts:turnSkipped', { socketId });
    this.advanceTurn(room);
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    const throwDart = () => {
      if (gs.throwsThisTurn >= 3 || room.state !== 'playing') return;

      const cx = 250, cy = 250;
      const spread = 60;
      const x = cx + (Math.random() - 0.5) * spread * 2;
      const y = cy + (Math.random() - 0.5) * spread * 2;
      this.handleThrow(room, socketId, { x, y });

      if (gs.throwsThisTurn < 3 && room.state === 'playing' && room.turnPlayerId === socketId) {
        setTimeout(throwDart, 800);
      }
    };
    throwDart();
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
        score: gs.scores[sid] || 0,
        cricketState: gs.cricketState[sid] || null,
      };
    }

    return {
      ...base,
      mode: gs.mode,
      playerStates,
      playerOrder: gs.playerOrder || [],
      scores: gs.scores || {},
      throwsThisTurn: gs.throwsThisTurn,
      turnScores: gs.turnScores,
      winner: gs.winner,
      roundHistory: gs.roundHistory,
    };
  }
}
