import { useRef, useState, useEffect, useCallback } from 'react';
import { InGameTopBar } from '@/components/InGameTopBar';
import { toast } from 'sonner';
import { CelebrationSystem, EmojiReactionPicker, useReactions, TableBrand } from '@/components/CelebrationSystem';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { useTableSkin } from '@/hooks/useTableSkin';
import { PremiumFeltOverlay } from '@/components/PremiumFeltOverlay';
import { useDartsSkin } from '@/hooks/useDartsSkin';
import { PcTokenLabel } from '@/components/PcTokenLabel';
import { AvatarSprite, parseAvatarDef } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { useCasinoBots } from '@/hooks/useCasinoBots';
import { GameBotBar } from '@/components/GameBotBar';
import { useServerGame } from '@/hooks/useServerGame';

const DARTS_AI_AVATAR: AvatarDef = { sheet: 2, row: 2, col: 0, name: 'AI' };

interface DartsGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
}

interface DartThrow {
  x: number;
  y: number;
  score: number;
  label: string;
}

const BOARD_SIZE = 360;
const CX = BOARD_SIZE / 2;
const CY = BOARD_SIZE / 2;

// Dartboard segment numbers (clockwise from top)
const NUMBERS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

// Radii for different zones (relative to center, board radius = 150)
const BOARD_R = 150;
const BULL_R = 8;
const BULL_OUTER_R = 20;
const TRIPLE_INNER = 95;
const TRIPLE_OUTER = 107;
const DOUBLE_INNER = 140;
const DOUBLE_OUTER = 150;

function getScore(x: number, y: number): { score: number; label: string } {
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= BULL_R) return { score: 50, label: 'BULLSEYE!' };
  if (dist <= BULL_OUTER_R) return { score: 25, label: 'Bull' };
  if (dist > BOARD_R) return { score: 0, label: 'Miss' };

  // Determine segment
  let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  if (angle < 0) angle += 360;
  const segIdx = Math.floor(((angle + 9) % 360) / 18) % 20;
  const num = NUMBERS[segIdx];

  if (dist >= TRIPLE_INNER && dist <= TRIPLE_OUTER) return { score: num * 3, label: `Triple ${num}` };
  if (dist >= DOUBLE_INNER && dist <= DOUBLE_OUTER) return { score: num * 2, label: `Double ${num}` };
  return { score: num, label: String(num) };
}

interface BoardSkinColors {
  color1: string;
  color2: string;
  wireColor: string;
  bullColor: string;
  bullOuterColor: string;
  numberColor: string;
  rimColor: string;
}

function drawBoard(ctx: CanvasRenderingContext2D, darts: DartThrow[], aim: { x: number; y: number } | null, skin?: BoardSkinColors) {
  const c1 = skin?.color1 || '#cc0000';
  const c2 = skin?.color2 || '#00aa00';
  const wireCol = skin?.wireColor || 'rgba(85,85,85,1)';
  const bullCol = skin?.bullColor || '#cc0000';
  const bullOuterCol = skin?.bullOuterColor || '#00aa00';
  const numCol = skin?.numberColor || '#fff';
  const rimCol = skin?.rimColor || '#333';

  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  for (let i = 0; i < 20; i++) {
    const startAngle = ((i * 18) - 99) * Math.PI / 180;
    const endAngle = startAngle + 18 * Math.PI / 180;
    const isEven = i % 2 === 0;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, DOUBLE_INNER, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = isEven ? '#1a0a00' : '#f5e6c8';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CX, CY, DOUBLE_OUTER, startAngle, endAngle);
    ctx.arc(CX, CY, DOUBLE_INNER, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isEven ? c1 : c2;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CX, CY, TRIPLE_OUTER, startAngle, endAngle);
    ctx.arc(CX, CY, TRIPLE_INNER, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isEven ? c1 : c2;
    ctx.fill();

    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(startAngle) * BULL_OUTER_R, CY + Math.sin(startAngle) * BULL_OUTER_R);
    ctx.lineTo(CX + Math.cos(startAngle) * DOUBLE_OUTER, CY + Math.sin(startAngle) * DOUBLE_OUTER);
    ctx.stroke();

    const numAngle = startAngle + 9 * Math.PI / 180;
    const nr = DOUBLE_OUTER + 12;
    ctx.fillStyle = numCol;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(NUMBERS[i]), CX + Math.cos(numAngle) * nr, CY + Math.sin(numAngle) * nr);
  }

  ctx.beginPath();
  ctx.arc(CX, CY, BULL_OUTER_R, 0, Math.PI * 2);
  ctx.fillStyle = bullOuterCol;
  ctx.fill();
  ctx.strokeStyle = rimCol;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, BULL_R, 0, Math.PI * 2);
  ctx.fillStyle = bullCol;
  ctx.fill();

  [TRIPLE_INNER, TRIPLE_OUTER, DOUBLE_INNER, DOUBLE_OUTER].forEach(r => {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = wireCol;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Aim crosshair
  if (aim) {
    ctx.strokeStyle = 'rgba(255,255,0,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(aim.x - 15, aim.y);
    ctx.lineTo(aim.x + 15, aim.y);
    ctx.moveTo(aim.x, aim.y - 15);
    ctx.lineTo(aim.x, aim.y + 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,0,0.4)';
    ctx.fill();
  }

  // Draw thrown darts
  darts.forEach((d, i) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    ctx.beginPath();
    ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = colors[i % 3];
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Dart shaft
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x, d.y - 14);
    ctx.strokeStyle = colors[i % 3];
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

export function DartsGame({ balance, onBack, onBet, onWin, onAddBalance, onShowWallet }: DartsGameProps) {
  const { activeSkin: tableSkin } = useTableSkin();
  const { activeSkin: dartsSkin } = useDartsSkin();
  const { settings } = useGlobalGame();
  const playerAvatarDef = parseAvatarDef(settings.avatarDef);
  const { reactions, winBursts, addReaction, triggerWinBurst, removeBurst, addAIReaction } = useReactions(settings.celebrationsEnabled);
  const { activeBots, onlinePlayerCount, chatMessages, triggerGameEvent } = useCasinoBots({ gameName: 'Darts', minBots: 2, maxBots: 6, statusMessages: ['Watching', 'Warming up', 'Next match', 'Spectating'] });
  const { sendAction: serverSendAction, createRoom: serverCreateRoom, addBots: serverAddBots, gameState: serverState, connected: serverConnected, socketId: mySocketId } = useServerGame({ gameType: 'darts' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerScore, setPlayerScore] = useState(501);
  const [aiScore, setAiScore] = useState(501);
  const [darts, setDarts] = useState<DartThrow[]>([]);
  const [throwCount, setThrowCount] = useState(0); // 0-2 per turn
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [gamePhase, setGamePhase] = useState<'betting' | 'playing' | 'won' | 'lost'>('betting');
  const [betAmount, setBetAmount] = useState(5000);
  const [betPlaced, setBetPlaced] = useState(false);
  const [message, setMessage] = useState('');
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [roundHistory, setRoundHistory] = useState<string[]>([]);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDisplayBalance(balance); }, [balance]);

  useEffect(() => {
    if (!serverState || !serverConnected) return;
    const s = serverState as Record<string, unknown>;
    if (s.scores && typeof s.scores === 'object' && Array.isArray(s.playerOrder)) {
      const scores = s.scores as Record<string, number>;
      const playerOrder = s.playerOrder as string[];
      if (mySocketId && playerOrder.includes(mySocketId)) {
        setPlayerScore(scores[mySocketId] ?? 501);
        const opponentSid = playerOrder.find(sid => sid !== mySocketId);
        if (opponentSid) setAiScore(scores[opponentSid] ?? 501);
      } else if (playerOrder.length >= 2) {
        setPlayerScore(scores[playerOrder[0]] ?? 501);
        setAiScore(scores[playerOrder[1]] ?? 501);
      }
    }
    if (typeof s.throwsThisTurn === 'number') setThrowCount(s.throwsThisTurn);
    if (typeof s.turnPlayerId === 'string') {
      const isMyTurn = s.turnPlayerId === mySocketId;
      setTurn(isMyTurn ? 'player' : 'ai');
    }
  }, [serverState, serverConnected, mySocketId]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_SIZE / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  };

  const boardSkinColors: BoardSkinColors = {
    color1: dartsSkin.boardColor1,
    color2: dartsSkin.boardColor2,
    wireColor: dartsSkin.wireColor,
    bullColor: dartsSkin.bullColor,
    bullOuterColor: dartsSkin.bullOuterColor,
    numberColor: dartsSkin.numberColor,
    rimColor: dartsSkin.boardRimColor,
  };

  const redraw = useCallback((currentDarts: DartThrow[], currentAim: { x: number; y: number } | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBoard(ctx, currentDarts, currentAim, boardSkinColors);
  }, [dartsSkin]);

  useEffect(() => {
    redraw(darts, aim);
  }, [darts, aim, redraw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (turn !== 'player' || gamePhase !== 'playing') return;
    const pos = getCanvasPos(e);
    setAim(pos);
  };

  const addNoise = (val: number, spread: number) => val + (Math.random() - 0.5) * spread;

  const throwDart = useCallback((x: number, y: number, isPlayer: boolean) => {
    if (isPlayer && serverConnected) { serverSendAction('throw', { x, y }); return; }
    const result = getScore(x, y);
    const dart: DartThrow = { x, y, score: result.score, label: result.label };

    setDarts(prev => {
      const next = [...prev, dart];
      redraw(next, isPlayer ? aim : null);
      return next;
    });

    return result;
  }, [aim, redraw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (turn !== 'player' || gamePhase !== 'playing') return;
    const pos = getCanvasPos(e);
    // Add slight aim wobble (skill element)
    const finalX = addNoise(pos.x, 6);
    const finalY = addNoise(pos.y, 6);
    const result = throwDart(finalX, finalY, true);

    setRoundHistory(prev => [`You: ${result.label} (${result.score})`, ...prev.slice(0, 9)]);

    const newScore = playerScore - result.score;
    if (newScore === 0) {
      setPlayerScore(0);
      setGamePhase('won');
      setMessage('You win! 501 reached exactly!');
      if (betPlaced) onWin(betAmount * 2);
      triggerWinBurst();
      addReaction('target', 'you');
      triggerGameEvent('win');
      return;
    } else if (newScore < 0) {
      setMessage('Bust! Score went below 0. Turn forfeited.');
      setTimeout(() => {
        setDarts([]);
        setThrowCount(0);
        setTurn('ai');
        setMessage('AI is throwing...');
      }, 1200);
      return;
    }
    setPlayerScore(newScore);

    const nextThrow = throwCount + 1;
    if (nextThrow >= 3) {
      setThrowCount(0);
      setTimeout(() => {
        setDarts([]);
        setTurn('ai');
        setMessage('AI is throwing...');
      }, 800);
    } else {
      setThrowCount(nextThrow);
      setMessage(`${result.label}! Score: ${newScore}. Throw ${nextThrow + 1}/3`);
    }
  };

  // AI turn
  useEffect(() => {
    if (turn !== 'ai' || gamePhase !== 'playing') return;

    let aiThrows = 0;
    let currentAiScore = aiScore;

    const doAiThrow = () => {
      if (aiThrows >= 3 || gamePhase !== 'playing') {
        setTurn('player');
        setMessage('Your turn! Click to throw.');
        setThrowCount(0);
        return;
      }

      // AI accuracy: aims at triple 20 or bull with some spread
      const targetAngle = -90 * Math.PI / 180; // top (20)
      const targetR = currentAiScore <= 40 ? BULL_R * 2 : TRIPLE_INNER + 6;
      const spread = 25;
      const aimX = CX + Math.cos(targetAngle) * targetR + addNoise(0, spread);
      const aimY = CY + Math.sin(targetAngle) * targetR + addNoise(0, spread);

      const result = getScore(aimX, aimY);
      setDarts(prev => {
        const next = [...prev, { x: aimX, y: aimY, score: result.score, label: result.label }];
        redraw(next, null);
        return next;
      });

      setRoundHistory(prev => [`AI: ${result.label} (${result.score})`, ...prev.slice(0, 9)]);

      if (result.label === 'BULLSEYE!' || result.score >= 57) {
        addAIReaction('ai');
      }

      const newAiScore = currentAiScore - result.score;
      if (newAiScore <= 0) {
        if (newAiScore === 0) {
          setAiScore(0);
          setGamePhase('lost');
          setMessage('AI wins! Game over.');
          addAIReaction('ai');
          triggerGameEvent('lose');
          return;
        }
        // AI bust
        aiThrows++;
        aiTimerRef.current = setTimeout(doAiThrow, 800);
        return;
      }
      currentAiScore = newAiScore;
      setAiScore(newAiScore);
      aiThrows++;
      aiTimerRef.current = setTimeout(doAiThrow, 800);
    };

    aiTimerRef.current = setTimeout(() => {
      setDarts([]);
      doAiThrow();
    }, 600);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [turn, gamePhase]);

  useEffect(() => {
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, []);

  const placeBet = () => {
    if (!onBet(betAmount)) return;
    setBetPlaced(true);
    setGamePhase('playing');
    setMessage('Your turn! Click the board to throw. 3 throws per round.');
    toast.success(`Bet of ${betAmount.toLocaleString()} $Pc placed!`);
  };

  const resetGame = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setPlayerScore(501);
    setAiScore(501);
    setDarts([]);
    setThrowCount(0);
    setTurn('player');
    setGamePhase('betting');
    setBetPlaced(false);
    setMessage('');
    setRoundHistory([]);
    setAim(null);
    redraw([], null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <CelebrationSystem
        enabled={settings.celebrationsEnabled}
        reactions={reactions}
        winBursts={winBursts}
        onBurstComplete={removeBurst}
        playerPositions={{ you: 'bottom', ai: 'top' }}
      />
      <InGameTopBar gameName="Darts 501" balance={displayBalance} onBack={onBack} onAddBalance={onAddBalance} onShowWallet={onShowWallet}
        rightSlot={<GameBotBar bots={activeBots} onlineCount={onlinePlayerCount} compact chatMessages={chatMessages} />}
      />

      <div style={{ flex: 1, display: 'flex', gap: 20, padding: 16, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', overflowY: 'auto', background: tableSkin.felt, position: 'relative', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)' }}>
        <PremiumFeltOverlay borderRadius="0px" goldBorderInset={10} />
        <div style={{ position: 'absolute', bottom: 8, left: 12, display: 'flex', alignItems: 'center', gap: 6, zIndex: 10, opacity: 0.8, pointerEvents: 'none' }}>
          {activeBots.slice(0, 3).map((bot) => (
            <div key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ position: 'relative' }}>
                <img src={bot.photoUrl} alt={bot.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover',
                  border: `1.5px solid ${bot.vipTier === 'gold' ? '#D4AF37' : bot.vipTier === 'silver' ? '#9E9E9E' : '#8D6E63'}` }} />
                {bot.lastReactionEmoji && Date.now() - bot.lastReactionTime < 5000 && (
                  <span style={{ position: 'absolute', top: -6, right: -4, fontSize: 8, animation: 'reactionPop 0.3s ease-out' }}>{bot.lastReactionEmoji}</span>
                )}
              </div>
              <span style={{ fontSize: 7, color: '#aaa' }}>{bot.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        {/* Board */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 380 }}>
          <div style={{ position: 'relative', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.9), 0 0 0 8px #3E2723', width: '100%', maxWidth: 360, aspectRatio: '1' }}>
            <TableBrand style={{ borderRadius: '50%', bottom: '50%', opacity: 0.08 }} />
            <canvas
              ref={canvasRef}
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              style={{ display: 'block', cursor: turn === 'player' && gamePhase === 'playing' ? 'crosshair' : 'default', width: '100%', height: '100%', borderRadius: '50%' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
              onMouseLeave={() => setAim(null)}
            />
          </div>

          {message && (
            <div style={{ padding: '8px 20px', borderRadius: 10, background: 'rgba(22,101,52,0.3)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, color: '#86efac', textAlign: 'center', maxWidth: 360 }}>
              {message}
            </div>
          )}

          {gamePhase === 'playing' && settings.celebrationsEnabled && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <EmojiReactionPicker onReact={emoji => addReaction(emoji, 'you')} enabled={settings.celebrationsEnabled} />
            </div>
          )}

          {gamePhase === 'betting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <ChipSelector selectedChip={betAmount} onSelect={setBetAmount} balance={balance} compact />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Bet: <PcTokenLabel amount={formatChipLabel(betAmount)} size={12} /></span>
                <button onClick={placeBet} style={{ padding: '8px 24px', borderRadius: 8, background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: 14 }}>
                  Start Game
                </button>
              </div>
            </div>
          )}

          {(gamePhase === 'won' || gamePhase === 'lost') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 40 }}>{gamePhase === 'won' ? '\u2316' : '\u2639'}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {gamePhase === 'won'
                  ? <><span style={{ color: '#43A047' }}>+</span><PcTokenLabel amount={betAmount * 2} size={20} /></>
                  : <><span style={{ color: '#ef4444' }}>Lost </span><PcTokenLabel amount={betAmount} size={20} /></>
                }
              </div>
              <button onClick={resetGame} style={{ padding: '8px 24px', borderRadius: 8, background: '#D4AF37', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: 14 }}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 180 }}>
          {/* Player */}
          <div style={{ padding: '16px', borderRadius: 12, background: turn === 'player' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${turn === 'player' ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AvatarSprite avatar={playerAvatarDef} size={28} active={turn === 'player'} />
              <div style={{ fontSize: 11, color: '#6b7280' }}>YOU {turn === 'player' && gamePhase === 'playing' ? '\u2316' : ''}</div>
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#D4AF37', lineHeight: 1 }}>{playerScore}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Throw {throwCount + 1}/3</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#374151', padding: '4px 0' }}>VS</div>

          {/* AI */}
          <div style={{ padding: '16px', borderRadius: 12, background: turn === 'ai' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${turn === 'ai' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AvatarSprite avatar={DARTS_AI_AVATAR} size={28} active={turn === 'ai'} />
              <div style={{ fontSize: 11, color: '#6b7280' }}>AI</div>
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>{aiScore}</div>
          </div>

          {/* Game info */}
          <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#6b7280' }}>
            <div style={{ fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>501 Rules</div>
            <div>• 3 throws per turn</div>
            <div>• Reach exactly 0 to win</div>
            <div>• Going below 0 = bust</div>
            <div style={{ marginTop: 6 }}>Bet: <PcTokenLabel amount={betAmount} size={11} /></div>
            <div>Win: <PcTokenLabel amount={betAmount * 2} size={11} /></div>
          </div>

          {/* History */}
          {roundHistory.length > 0 && (
            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 160, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 700 }}>THROW HISTORY</div>
              {roundHistory.map((h, i) => (
                <div key={i} style={{ fontSize: 11, color: h.startsWith('You') ? '#D4AF37' : '#ef4444', padding: '2px 0' }}>{h}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
