import { BaseGameEngine } from './BaseGameEngine.js';

const TABLE_WIDTH = 1000;
const TABLE_HEIGHT = 500;
const BALL_RADIUS = 12;
const POCKET_RADIUS = 22;
const POCKETS = [
  { x: 0, y: 0 }, { x: TABLE_WIDTH / 2, y: 0 }, { x: TABLE_WIDTH, y: 0 },
  { x: 0, y: TABLE_HEIGHT }, { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT }, { x: TABLE_WIDTH, y: TABLE_HEIGHT },
];

function initBalls() {
  const balls = [{ id: 0, x: 250, y: TABLE_HEIGHT / 2, pocketed: false, color: 'white' }];
  const rackX = 700, rackY = TABLE_HEIGHT / 2;
  const order = [1, 9, 2, 10, 8, 3, 11, 6, 14, 4, 7, 12, 5, 13, 15];
  let row = 0, col = 0, rowCount = 1;
  for (let i = 0; i < order.length; i++) {
    const x = rackX + row * (BALL_RADIUS * 2 + 1);
    const y = rackY + (col - (rowCount - 1) / 2) * (BALL_RADIUS * 2 + 1);
    const num = order[i];
    balls.push({
      id: num, x, y, pocketed: false,
      group: num <= 7 ? 'solids' : num >= 9 ? 'stripes' : 'eight',
      color: num === 8 ? 'black' : num <= 7 ? 'solid' : 'stripe',
    });
    col++;
    if (col >= rowCount) { row++; rowCount++; col = 0; }
  }
  return balls;
}

function isPocketed(ball) {
  return POCKETS.some(p => {
    const dx = ball.x - p.x, dy = ball.y - p.y;
    return Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS;
  });
}

export class PoolEngine extends BaseGameEngine {
  constructor() {
    super('pool', { minPlayers: 2, maxPlayers: 2 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      balls: [],
      playerOrder: [],
      currentPlayerIdx: 0,
      playerGroups: {},
      groupsAssigned: false,
      fouls: [],
      gameMode: options.gameMode || '8ball',
      shotHistory: [],
      winner: null,
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size !== 2) return;
    room.state = 'playing';
    room.phase = 'playing';
    this.initProvablyFair(room);

    const gs = room.gameState;
    gs.balls = initBalls();
    gs.playerOrder = [];
    gs.playerGroups = {};
    gs.groupsAssigned = false;
    gs.fouls = [];
    gs.shotHistory = [];
    gs.winner = null;
    gs.currentPlayerIdx = 0;

    for (const [sid] of room.players) {
      gs.playerOrder.push(sid);
    }

    this.broadcastState(room);
    this.setTurn(room, gs.playerOrder[0]);
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;
    if (room.turnPlayerId !== socketId) return;

    switch (action) {
      case 'shoot': this.handleShot(room, socketId, data); break;
      case 'placeCueBall': this.handlePlaceCueBall(room, socketId, data); break;
      default: return;
    }
  }

  handlePlaceCueBall(room, socketId, data) {
    const gs = room.gameState;
    const cueBall = gs.balls.find(b => b.id === 0);
    if (!cueBall || !cueBall.pocketed) return;
    cueBall.x = Math.max(BALL_RADIUS, Math.min(data?.x || 250, TABLE_WIDTH - BALL_RADIUS));
    cueBall.y = Math.max(BALL_RADIUS, Math.min(data?.y || TABLE_HEIGHT / 2, TABLE_HEIGHT - BALL_RADIUS));
    cueBall.pocketed = false;
    this.broadcastState(room);
  }

  handleShot(room, socketId, data) {
    const gs = room.gameState;
    const { angle, power } = data || {};
    if (typeof angle !== 'number' || typeof power !== 'number') return;

    const cueBall = gs.balls.find(b => b.id === 0);
    if (!cueBall || cueBall.pocketed) return;

    const clampedPower = Math.min(Math.max(power, 0), 100);
    const speed = clampedPower * 8;

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;

    const steps = 200;
    const friction = 0.985;
    const pocketedThisShot = [];

    cueBall.vx = vx;
    cueBall.vy = vy;

    for (let step = 0; step < steps; step++) {
      for (const ball of gs.balls) {
        if (ball.pocketed) continue;
        if (!ball.vx) ball.vx = 0;
        if (!ball.vy) ball.vy = 0;

        ball.x += ball.vx * 0.016;
        ball.y += ball.vy * 0.016;

        if (ball.x <= BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = Math.abs(ball.vx); }
        if (ball.x >= TABLE_WIDTH - BALL_RADIUS) { ball.x = TABLE_WIDTH - BALL_RADIUS; ball.vx = -Math.abs(ball.vx); }
        if (ball.y <= BALL_RADIUS) { ball.y = BALL_RADIUS; ball.vy = Math.abs(ball.vy); }
        if (ball.y >= TABLE_HEIGHT - BALL_RADIUS) { ball.y = TABLE_HEIGHT - BALL_RADIUS; ball.vy = -Math.abs(ball.vy); }

        ball.vx *= friction;
        ball.vy *= friction;
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.1) ball.vy = 0;

        if (!ball.pocketed && isPocketed(ball)) {
          ball.pocketed = true;
          pocketedThisShot.push(ball.id);
        }
      }

      for (let i = 0; i < gs.balls.length; i++) {
        for (let j = i + 1; j < gs.balls.length; j++) {
          const a = gs.balls[i], b = gs.balls[j];
          if (a.pocketed || b.pocketed) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < BALL_RADIUS * 2 && dist > 0) {
            const nx = dx / dist, ny = dy / dist;
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;
            if (dvn > 0) {
              a.vx -= dvn * nx;
              a.vy -= dvn * ny;
              b.vx += dvn * nx;
              b.vy += dvn * ny;
              const overlap = BALL_RADIUS * 2 - dist;
              a.x -= overlap / 2 * nx;
              a.y -= overlap / 2 * ny;
              b.x += overlap / 2 * nx;
              b.y += overlap / 2 * ny;
            }
          }
        }
      }
    }

    for (const ball of gs.balls) { ball.vx = 0; ball.vy = 0; }

    gs.shotHistory.push({ socketId, angle, power: clampedPower, pocketed: pocketedThisShot });

    this.broadcastToRoom(room, 'pool:shotResult', {
      socketId, balls: gs.balls.map(b => ({ id: b.id, x: b.x, y: b.y, pocketed: b.pocketed })),
      pocketed: pocketedThisShot,
    });

    this.resolveShot(room, socketId, pocketedThisShot);
  }

  resolveShot(room, socketId, pocketed) {
    const gs = room.gameState;
    const cuePocketed = pocketed.includes(0);
    const eightPocketed = pocketed.includes(8);
    const otherPocketed = pocketed.filter(id => id !== 0 && id !== 8);

    if (!gs.groupsAssigned && otherPocketed.length > 0) {
      const first = gs.balls.find(b => b.id === otherPocketed[0]);
      if (first) {
        gs.playerGroups[socketId] = first.group;
        const otherSid = gs.playerOrder.find(s => s !== socketId);
        if (otherSid) gs.playerGroups[otherSid] = first.group === 'solids' ? 'stripes' : 'solids';
        gs.groupsAssigned = true;
      }
    }

    if (eightPocketed) {
      const playerGroup = gs.playerGroups[socketId];
      const allGroupPocketed = gs.balls
        .filter(b => b.group === playerGroup && b.id !== 8)
        .every(b => b.pocketed);

      if (allGroupPocketed && !cuePocketed) {
        gs.winner = socketId;
      } else {
        gs.winner = gs.playerOrder.find(s => s !== socketId);
      }
      this.finishGame(room);
      return;
    }

    if (cuePocketed) {
      const cueBall = gs.balls.find(b => b.id === 0);
      cueBall.pocketed = true;
      gs.fouls.push({ socketId, type: 'cueBallPocketed' });
    }

    let continueTurn = false;
    if (!cuePocketed && otherPocketed.length > 0) {
      const playerGroup = gs.playerGroups[socketId];
      if (playerGroup) {
        continueTurn = otherPocketed.some(id => {
          const ball = gs.balls.find(b => b.id === id);
          return ball && ball.group === playerGroup;
        });
      } else {
        continueTurn = true;
      }
    }

    if (continueTurn) {
      this.broadcastState(room);
      this.setTurn(room, socketId);
    } else {
      gs.currentPlayerIdx = (gs.currentPlayerIdx + 1) % gs.playerOrder.length;
      const nextSid = gs.playerOrder[gs.currentPlayerIdx];

      if (cuePocketed) {
        const cueBall = gs.balls.find(b => b.id === 0);
        cueBall.x = 250;
        cueBall.y = TABLE_HEIGHT / 2;
        cueBall.pocketed = false;
      }

      this.broadcastState(room);
      this.setTurn(room, nextSid);
    }
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
    gs.currentPlayerIdx = (gs.currentPlayerIdx + 1) % gs.playerOrder.length;
    const nextSid = gs.playerOrder[gs.currentPlayerIdx];
    this.broadcastToRoom(room, 'pool:turnSkipped', { socketId });
    this.broadcastState(room);
    this.setTurn(room, nextSid);
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    const cueBall = gs.balls.find(b => b.id === 0);
    if (!cueBall || cueBall.pocketed) {
      this.handlePlaceCueBall(room, socketId, { x: 250, y: TABLE_HEIGHT / 2 });
      setTimeout(() => this.handleBotTurn(room, socketId), 500);
      return;
    }

    const targets = gs.balls.filter(b => !b.pocketed && b.id !== 0);
    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const angle = Math.atan2(target.y - cueBall.y, target.x - cueBall.x);
    const power = 40 + Math.random() * 40;
    this.handleShot(room, socketId, { angle, power });
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
        group: gs.playerGroups[sid] || null,
      };
    }

    return {
      ...base,
      balls: gs.balls.map(b => ({ id: b.id, x: b.x, y: b.y, pocketed: b.pocketed, group: b.group })),
      playerStates,
      playerOrder: gs.playerOrder || [],
      groupsAssigned: gs.groupsAssigned,
      winner: gs.winner,
      gameMode: gs.gameMode,
      fouls: gs.fouls,
    };
  }
}
