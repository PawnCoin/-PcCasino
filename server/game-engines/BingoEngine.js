import { BaseGameEngine } from './BaseGameEngine.js';

function generateBingoCard(rng) {
  const card = [];
  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  for (let col = 0; col < 5; col++) {
    const [min, max] = ranges[col];
    const pool = [];
    for (let n = min; n <= max; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    card.push(pool.slice(0, 5));
  }
  card[2][2] = 0;
  return card;
}

function checkWin(daubed) {
  for (let r = 0; r < 5; r++) {
    if (daubed[r].every(Boolean)) return 'row';
  }
  for (let c = 0; c < 5; c++) {
    if (daubed.every(row => row[c])) return 'column';
  }
  if ([0, 1, 2, 3, 4].every(i => daubed[i][i])) return 'diagonal';
  if ([0, 1, 2, 3, 4].every(i => daubed[i][4 - i])) return 'diagonal';
  if (daubed[0][0] && daubed[0][4] && daubed[4][0] && daubed[4][4]) return 'corners';
  if (daubed.every(row => row.every(Boolean))) return 'blackout';
  return null;
}

export class BingoEngine extends BaseGameEngine {
  constructor() {
    super('bingo', { minPlayers: 1, maxPlayers: 20 });
  }

  createRoom(options = {}) {
    const room = super.createRoom(options);
    room.gameState = {
      calledNumbers: [],
      numberPool: [],
      playerCards: {},
      playerDaubed: {},
      callInterval: null,
      callSpeed: options.callSpeed || 5000,
      winner: null,
      winType: null,
    };
    return room;
  }

  async startGame(room) {
    if (room.players.size < 1) return;
    room.state = 'playing';
    room.phase = 'playing';
    this.initProvablyFair(room);

    const gs = room.gameState;
    gs.calledNumbers = [];
    gs.winner = null;
    gs.winType = null;

    gs.numberPool = [];
    for (let i = 1; i <= 75; i++) gs.numberPool.push(i);
    for (let i = gs.numberPool.length - 1; i > 0; i--) {
      const [f] = this.deriveOutcome(room, 1);
      const j = Math.floor(f * (i + 1));
      [gs.numberPool[i], gs.numberPool[j]] = [gs.numberPool[j], gs.numberPool[i]];
    }

    gs.playerCards = {};
    gs.playerDaubed = {};
    const makeRng = () => () => {
      const [f] = this.deriveOutcome(room, 1);
      return f;
    };

    for (const [sid] of room.players) {
      const rng = makeRng();
      gs.playerCards[sid] = generateBingoCard(rng);
      gs.playerDaubed[sid] = Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => (r === 2 && c === 2))
      );
    }

    this.broadcastState(room);
    this.startCalling(room);
  }

  startCalling(room) {
    const gs = room.gameState;
    gs.callInterval = setInterval(() => {
      if (room.state !== 'playing' || gs.numberPool.length === 0) {
        clearInterval(gs.callInterval);
        gs.callInterval = null;
        if (gs.numberPool.length === 0 && !gs.winner) {
          this.finishGame(room, null);
        }
        return;
      }

      const number = gs.numberPool.pop();
      gs.calledNumbers.push(number);

      this.broadcastToRoom(room, 'bingo:numberCalled', { number, total: gs.calledNumbers.length });

      for (const [sid] of room.players) {
        const card = gs.playerCards[sid];
        const daubed = gs.playerDaubed[sid];
        if (!card || !daubed) continue;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            if (card[r][c] === number) {
              daubed[r][c] = true;
            }
          }
        }
      }

      this.broadcastState(room);
    }, gs.callSpeed);
  }

  handleAction(room, socketId, action, data) {
    if (room.state !== 'playing') return;

    switch (action) {
      case 'daub': this.handleDaub(room, socketId, data); break;
      case 'callBingo': this.handleCallBingo(room, socketId); break;
      default: return;
    }
  }

  handleDaub(room, socketId, data) {
    const gs = room.gameState;
    const { row, col } = data || {};
    if (typeof row !== 'number' || typeof col !== 'number') return;
    if (row < 0 || row > 4 || col < 0 || col > 4) return;

    const card = gs.playerCards[socketId];
    const daubed = gs.playerDaubed[socketId];
    if (!card || !daubed) return;

    const number = card[row][col];
    if (number === 0 || !gs.calledNumbers.includes(number)) return;

    daubed[row][col] = true;
    this.emitToPlayer(room, socketId, 'bingo:daubed', { row, col });
  }

  handleCallBingo(room, socketId) {
    const gs = room.gameState;
    const daubed = gs.playerDaubed[socketId];
    if (!daubed) return;

    const winType = checkWin(daubed);
    if (winType) {
      gs.winner = socketId;
      gs.winType = winType;
      this.finishGame(room, socketId);
    } else {
      this.emitToPlayer(room, socketId, 'bingo:falseClaim', { message: 'Not a valid Bingo!' });
    }
  }

  async finishGame(room, winnerId) {
    const gs = room.gameState;
    room.state = 'finished';
    room.phase = 'finished';

    if (gs.callInterval) {
      clearInterval(gs.callInterval);
      gs.callInterval = null;
    }

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

    this.broadcastToRoom(room, 'bingo:gameOver', {
      winner: winnerId,
      winType: gs.winType,
      username: winnerId ? room.players.get(winnerId)?.username : null,
    });
    this.broadcastState(room);
  }

  handleBotTurn(room, socketId) {
    const gs = room.gameState;
    const daubed = gs.playerDaubed[socketId];
    if (!daubed) return;
    const winType = checkWin(daubed);
    if (winType) {
      this.handleCallBingo(room, socketId);
    }
  }

  getPublicState(room) {
    const base = super.getPublicState(room);
    const gs = room.gameState;

    const playerStates = {};
    for (const [sid, player] of room.players) {
      playerStates[sid] = {
        username: player.username,
        avatar: player.avatar,
        avatarUrl: player.avatarUrl,
        isBot: player.isBot,
        seat: player.seat,
      };
    }

    return {
      ...base,
      calledNumbers: gs.calledNumbers,
      totalNumbers: 75,
      playerStates,
      winner: gs.winner,
      winType: gs.winType,
    };
  }

  getPrivateState(room, socketId) {
    const gs = room.gameState;
    return {
      card: gs.playerCards[socketId] || [],
      daubed: gs.playerDaubed[socketId] || [],
    };
  }
}
