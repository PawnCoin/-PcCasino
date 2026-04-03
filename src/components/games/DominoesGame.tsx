import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX, Settings, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tile { left: number; right: number; id: string }
interface PlacedTile { tile: Tile; flipped: boolean; direction: 'h' | 'v' }
interface DomPlayer {
  id: string; name: string; avatar: string;
  hand: Tile[]; isHuman: boolean; score: number;
}
type Phase = 'setup' | 'playing' | 'roundOver' | 'gameOver';

interface DominoesGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
}

// ─── Skin configs ─────────────────────────────────────────────────────────────
const DOMINO_SKINS = {
  ivory: { name: 'Classic Ivory', bg: '#F5F5DC', pip: '#1a1a1a', border: '#C8B89A', dot: '#2a2a2a' },
  black: { name: 'Obsidian', bg: '#1a1a1a', pip: '#F5F5DC', border: '#444', dot: '#eee' },
  neon: { name: 'Neon Cyber', bg: '#0D0D1A', pip: '#00FFFF', border: '#FF00FF', dot: '#00FFFF' },
  gold: { name: 'Vegas Gold', bg: '#1A1200', pip: '#D4AF37', border: '#B8860B', dot: '#FFD700' },
};
const TABLE_SKINS = {
  wood: { name: 'Mahogany', bg: 'radial-gradient(ellipse at 40% 40%, #5D3A1A 0%, #3B2008 50%, #1C0F00 100%)', felt: '#2D4A1E', line: '#4A7A32' },
  marble: { name: 'Marble', bg: 'radial-gradient(ellipse at 30% 30%, #e0e0e0 0%, #c0c0c0 50%, #a0a0a0 100%)', felt: '#2A4060', line: '#4A70A0' },
  neon: { name: 'Neon Grid', bg: 'radial-gradient(ellipse at 50% 50%, #0A001F 0%, #050010 100%)', felt: '#0D001F', line: '#4400FF' },
  glass: { name: 'Glass Table', bg: 'radial-gradient(ellipse at 50% 50%, rgba(100,150,200,0.15) 0%, rgba(20,30,60,0.95) 100%)', felt: 'rgba(20,60,100,0.4)', line: 'rgba(100,200,255,0.3)' },
};

// ─── Generate full double-six set ─────────────────────────────────────────────
function makeDominoSet(): Tile[] {
  const set: Tile[] = [];
  let id = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      set.push({ left: i, right: j, id: `d${id++}` });
    }
  }
  return set;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Audio Engine ─────────────────────────────────────────────────────────────
class DominoAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }

  setMuted(m: boolean) { this.muted = m; }

  private playNoise(duration: number, freq: number, gain: number, type: OscillatorType = 'sine', decay = 0.3) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + duration);
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  private playClickNoise(gainVal: number) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = gainVal;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2800;
      filter.Q.value = 0.8;
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
    } catch (_) {}
  }

  pickUp() { this.playClickNoise(0.4); }

  place() {
    this.playClickNoise(0.7);
    this.playNoise(0.12, 180, 0.3, 'triangle', 0.12);
  }

  slam() {
    if (this.muted) return;
    this.playClickNoise(1.5);
    this.playNoise(0.4, 60, 1.0, 'sawtooth', 0.4);
    setTimeout(() => this.playNoise(0.3, 120, 0.6, 'triangle', 0.3), 80);
    // deep thud
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        data[i] = Math.sin(2 * Math.PI * 40 * t * Math.exp(-t * 8)) * Math.exp(-t * 4) * (Math.random() * 0.2 + 0.9);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 2.0;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  crack() {
    if (this.muted) return;
    // Cinematic table crack
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const crack = Math.random() * 2 - 1;
        data[i] = crack * Math.exp(-t * 6) * (t < 0.05 ? 1 : 0.3);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 1.8;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  draw() { this.playNoise(0.06, 400, 0.2, 'sine', 0.06); }
  win() {
    [0, 100, 200, 350].forEach((delay, i) => {
      setTimeout(() => this.playNoise(0.3, 440 + i * 110, 0.5, 'sine', 0.3), delay);
    });
  }
}

const audio = new DominoAudio();

// ─── Pip renderer ─────────────────────────────────────────────────────────────
const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function PipFace({ value, skin, size = 36 }: { value: number; skin: typeof DOMINO_SKINS[keyof typeof DOMINO_SKINS]; size?: number }) {
  const pipSize = size * 0.12;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {PIP_POSITIONS[value]?.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={pipSize * 100 / size} fill={skin.pip}
          style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.6))` }} />
      ))}
    </svg>
  );
}

function DominoTile({
  tile, flipped, selected, playable, faceDown, skin, horizontal = true, size = 'md', onClick
}: {
  tile: Tile; flipped?: boolean; selected?: boolean; playable?: boolean; faceDown?: boolean;
  skin: typeof DOMINO_SKINS[keyof typeof DOMINO_SKINS]; horizontal?: boolean;
  size?: 'sm' | 'md' | 'lg'; onClick?: () => void;
}) {
  const sizeMap = { sm: { w: 52, h: 26, pip: 22 }, md: { w: 68, h: 34, pip: 28 }, lg: { w: 84, h: 42, pip: 34 } };
  const s = sizeMap[size];
  const left = flipped ? tile.right : tile.left;
  const right = flipped ? tile.left : tile.right;

  const style: React.CSSProperties = horizontal
    ? { width: s.w, height: s.h }
    : { width: s.h, height: s.w };

  return (
    <div
      onClick={onClick}
      style={{
        ...style,
        background: faceDown ? 'linear-gradient(135deg, #2a2a2a, #1a1a1a)' : skin.bg,
        border: `2px solid ${selected ? '#D4AF37' : playable ? '#43A047' : skin.border}`,
        borderRadius: 6,
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected
          ? '0 0 16px rgba(212,175,55,0.8), 0 4px 12px rgba(0,0,0,0.6)'
          : playable
          ? '0 0 10px rgba(67,160,71,0.6), 0 4px 8px rgba(0,0,0,0.5)'
          : '0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        transform: selected ? 'translateY(-8px) scale(1.05)' : playable ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {faceDown ? (
        <div style={{
          width: '100%', height: '100%', position: 'absolute',
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 8px)',
        }} />
      ) : (
        <>
          <PipFace value={left} skin={skin} size={s.pip} />
          <div style={{
            background: skin.border, flexShrink: 0,
            width: horizontal ? 2 : '80%', height: horizontal ? '80%' : 2,
          }} />
          <PipFace value={right} skin={skin} size={s.pip} />
        </>
      )}
    </div>
  );
}

// ─── Table crack overlay ───────────────────────────────────────────────────────
function CrackOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100,
      animation: 'crackIn 0.1s ease-out',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0 }}>
        {[
          'M200,200 L120,80 L90,20', 'M200,200 L310,100 L380,60',
          'M200,200 L80,250 L30,290', 'M200,200 L330,280 L390,340',
          'M200,200 L190,320 L170,400', 'M200,200 L240,340 L260,400',
          'M200,200 L150,160 L100,100', 'M200,200 L260,170 L320,130',
        ].map((d, i) => (
          <path key={i} d={d} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5 - i * 0.1}
            fill="none" strokeLinecap="round"
            style={{ animation: `crackLine 0.3s ${i * 0.02}s ease-out forwards`, opacity: 0 }} />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(255,200,50,0.25) 0%, transparent 60%)',
        animation: 'flashOut 0.4s ease-out',
      }} />
    </div>
  );
}

// ─── Main game component ───────────────────────────────────────────────────────
export function DominoesGame({ balance, onBack, onBet, onWin }: DominoesGameProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [players, setPlayers] = useState<DomPlayer[]>([]);
  const [boneyard, setBoneyard] = useState<Tile[]>([]);
  const [chain, setChain] = useState<PlacedTile[]>([]);
  const [leftEnd, setLeftEnd] = useState(0);
  const [rightEnd, setRightEnd] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [playableTileIds, setPlayableTileIds] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(false);
  const [slamEffect, setSlamEffect] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dominoSkin, setDominoSkin] = useState<keyof typeof DOMINO_SKINS>('ivory');
  const [tableSkin, setTableSkin] = useState<keyof typeof TABLE_SKINS>('wood');
  const [bet, setBet] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  const skin = DOMINO_SKINS[dominoSkin];
  const table = TABLE_SKINS[tableSkin];

  useEffect(() => { audio.setMuted(muted); }, [muted]);

  // ─── Compute playable tiles for given player ──────────────────────────────
  const getPlayable = useCallback((hand: Tile[], lEnd: number, rEnd: number, chainEmpty: boolean): Set<string> => {
    if (chainEmpty) return new Set(hand.map(t => t.id));
    const ids = new Set<string>();
    hand.forEach(t => {
      if (t.left === lEnd || t.right === lEnd || t.left === rEnd || t.right === rEnd) ids.add(t.id);
    });
    return ids;
  }, []);

  // ─── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!betPlaced) return;
    const set = shuffle(makeDominoSet());
    const newPlayers: DomPlayer[] = [
      { id: 'human', name: 'You', avatar: '🎲', hand: set.slice(0, 7), isHuman: true, score: 0 },
      { id: 'ai1', name: 'Carlos', avatar: '🤖', hand: set.slice(7, 14), isHuman: false, score: 0 },
      { id: 'ai2', name: 'Maya', avatar: '🦾', hand: set.slice(14, 21), isHuman: false, score: 0 },
      { id: 'ai3', name: 'Zara', avatar: '🎰', hand: set.slice(21, 28), isHuman: false, score: 0 },
    ];
    const bone = set.slice(28);
    setPlayers(newPlayers);
    setBoneyard(bone);
    setChain([]);
    setLeftEnd(-1);
    setRightEnd(-1);
    setCurrentPlayer(0);
    setSelectedTile(null);
    setConsecutivePasses(0);
    setPhase('playing');
    setStatusMsg("Your turn — play a tile or draw from the boneyard");
    // Find who has double-6 to go first — simplified: player 0 starts
    const firstPlayable = getPlayable(newPlayers[0].hand, -1, -1, true);
    setPlayableTileIds(firstPlayable);
  }, [betPlaced, getPlayable]);

  // ─── Place tile on chain ──────────────────────────────────────────────────
  const placeTile = useCallback((playerId: string, tileId: string, end: 'left' | 'right' | 'any') => {
    setPlayers(prev => {
      const newPlayers = prev.map(p => ({ ...p, hand: [...p.hand] }));
      const pIdx = newPlayers.findIndex(p => p.id === playerId);
      const player = newPlayers[pIdx];
      const tile = player.hand.find(t => t.id === tileId)!;
      player.hand = player.hand.filter(t => t.id !== tileId);

      setChain(prevChain => {
        const isEmpty = prevChain.length === 0;
        let flipped = false;
        let newLeft = leftEnd;
        let newRight = rightEnd;
        const chosenEnd = isEmpty ? 'right' : end;

        if (isEmpty) {
          newLeft = tile.left;
          newRight = tile.right;
        } else if (chosenEnd === 'left' || (chosenEnd === 'any' && tile.left === leftEnd)) {
          // attach to left
          if (tile.right === leftEnd) { flipped = false; newLeft = tile.left; }
          else { flipped = true; newLeft = tile.right; }
        } else {
          // attach to right
          if (tile.left === rightEnd) { flipped = false; newRight = tile.right; }
          else { flipped = true; newRight = tile.left; }
        }

        setLeftEnd(newLeft);
        setRightEnd(newRight);

        // Check domino-out (slam!)
        if (player.hand.length === 0) {
          const isHuman = player.isHuman;
          if (slamEffect) {
            setShaking(true);
            setCracking(true);
            setTimeout(() => { setShaking(false); setCracking(false); }, 800);
            audio.slam();
            setTimeout(() => audio.crack(), 150);
          }
          // Score = sum of all opponents' pip counts
          const score = newPlayers.filter((_, i) => i !== pIdx).reduce((sum, p) =>
            sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
          newPlayers[pIdx].score += score;
          setRoundScore(score);
          setRoundWinner(player.name);
          if (isHuman) {
            audio.win();
            const winAmt = bet * 3;
            onWin(winAmt);
            toast.success(`DOMINO! You won ${winAmt} $Pc!`);
          } else {
            toast.error(`${player.name} dominoed out! -${bet} $Pc`);
          }
          setTimeout(() => setPhase('roundOver'), slamEffect ? 900 : 100);
        }

        const direction: 'h' | 'v' = (prevChain.length % 8 < 4) ? 'h' : 'v';
        return chosenEnd === 'left'
          ? [{ tile, flipped, direction }, ...prevChain]
          : [...prevChain, { tile, flipped, direction }];
      });

      return newPlayers;
    });
  }, [leftEnd, rightEnd, slamEffect, bet, onWin]);

  // ─── Next player ──────────────────────────────────────────────────────────
  const advanceTurn = useCallback((nextIdx: number, newPlayers: DomPlayer[], newBoneyard: Tile[], newLeft: number, newRight: number, newChain: PlacedTile[]) => {
    setCurrentPlayer(nextIdx);
    const next = newPlayers[nextIdx];
    const playable = getPlayable(next.hand, newLeft, newRight, newChain.length === 0);
    setPlayableTileIds(playable);
    if (next.isHuman) {
      if (playable.size === 0 && newBoneyard.length === 0) {
        setStatusMsg("No moves available — passing your turn");
      } else if (playable.size === 0) {
        setStatusMsg("No playable tile — draw from the boneyard");
      } else {
        setStatusMsg("Your turn — click a highlighted tile to play");
      }
    } else {
      setStatusMsg(`${next.name} is thinking...`);
    }
  }, [getPlayable]);

  // ─── AI turn ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const player = players[currentPlayer];
    if (!player || player.isHuman) return;

    aiTimerRef.current = setTimeout(() => {
      const playable = getPlayable(player.hand, leftEnd, rightEnd, chain.length === 0);

      if (playable.size > 0) {
        // AI strategy: play highest pip total that fits
        const playableTiles = player.hand.filter(t => playable.has(t.id));
        playableTiles.sort((a, b) => (b.left + b.right) - (a.left + a.right));
        const best = playableTiles[0];
        // Determine end
        let end: 'left' | 'right' | 'any' = 'any';
        if (chain.length > 0) {
          const fitsLeft = best.left === leftEnd || best.right === leftEnd;
          const fitsRight = best.left === rightEnd || best.right === rightEnd;
          end = fitsLeft && !fitsRight ? 'left' : fitsRight && !fitsLeft ? 'right' : 'right';
        }
        audio.place();
        placeTile(player.id, best.id, end);
        setConsecutivePasses(0);
        setTimeout(() => {
          setPlayers(prev => {
            const next = (currentPlayer + 1) % prev.length;
            const bone = boneyard;
            advanceTurn(next, prev, bone, leftEnd, rightEnd, chain);
            return prev;
          });
        }, 300);
      } else if (boneyard.length > 0) {
        // Draw
        audio.draw();
        const drawn = boneyard[0];
        setBoneyard(b => b.slice(1));
        setPlayers(prev => {
          const np = prev.map(p => p.id === player.id ? { ...p, hand: [...p.hand, drawn] } : p);
          const next = (currentPlayer + 1) % np.length;
          advanceTurn(next, np, boneyard.slice(1), leftEnd, rightEnd, chain);
          return np;
        });
        setConsecutivePasses(0);
      } else {
        // Pass
        const newPasses = consecutivePasses + 1;
        setConsecutivePasses(newPasses);
        if (newPasses >= players.length) {
          // Blocked game — lowest pip count wins
          setPhase('roundOver');
          const pips = players.map(p => ({ name: p.name, pips: p.hand.reduce((s, t) => s + t.left + t.right, 0), isHuman: p.isHuman }));
          const winner = pips.reduce((a, b) => a.pips <= b.pips ? a : b);
          setRoundWinner(winner.name);
          setRoundScore(0);
          if (winner.isHuman) { audio.win(); onWin(bet); toast.success('Game blocked — you win with lowest count!'); }
          else toast.error(`Game blocked — ${winner.name} wins!`);
        } else {
          const next = (currentPlayer + 1) % players.length;
          advanceTurn(next, players, boneyard, leftEnd, rightEnd, chain);
        }
      }
    }, 800 + Math.random() * 600);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [currentPlayer, phase, players, boneyard, chain, leftEnd, rightEnd, consecutivePasses, getPlayable, placeTile, advanceTurn, bet, onWin]);

  // ─── Human: select tile ───────────────────────────────────────────────────
  const handleTileClick = (tileId: string) => {
    if (phase !== 'playing' || players[currentPlayer]?.id !== 'human') return;
    if (!playableTileIds.has(tileId)) { toast.error('That tile cannot be played here'); return; }
    audio.pickUp();
    setSelectedTile(prev => prev === tileId ? null : tileId);
  };

  // ─── Human: choose end to play ────────────────────────────────────────────
  const handlePlaySelected = (end: 'left' | 'right') => {
    if (!selectedTile) return;
    audio.place();
    placeTile('human', selectedTile, end);
    setSelectedTile(null);
    setConsecutivePasses(0);
    setTimeout(() => {
      setPlayers(prev => {
        const next = (currentPlayer + 1) % prev.length;
        advanceTurn(next, prev, boneyard, leftEnd, rightEnd, chain);
        return prev;
      });
    }, 300);
  };

  // ─── Human: draw from boneyard ────────────────────────────────────────────
  const handleDraw = () => {
    if (boneyard.length === 0) { toast.error('Boneyard is empty!'); return; }
    audio.draw();
    const drawn = boneyard[0];
    setBoneyard(b => b.slice(1));
    setPlayers(prev => {
      const np = prev.map(p => p.id === 'human' ? { ...p, hand: [...p.hand, drawn] } : p);
      const playable = getPlayable(np[0].hand, leftEnd, rightEnd, chain.length === 0);
      setPlayableTileIds(playable);
      return np;
    });
    toast.info(`Drew ${drawn.left}|${drawn.right}`);
  };

  // ─── Human: pass turn ────────────────────────────────────────────────────
  const handlePass = () => {
    const newPasses = consecutivePasses + 1;
    setConsecutivePasses(newPasses);
    if (newPasses >= players.length) {
      setPhase('roundOver');
      const pips = players.map(p => ({ name: p.name, pips: p.hand.reduce((s, t) => s + t.left + t.right, 0), isHuman: p.isHuman }));
      const winner = pips.reduce((a, b) => a.pips <= b.pips ? a : b);
      setRoundWinner(winner.name);
      setRoundScore(0);
    } else {
      const next = (currentPlayer + 1) % players.length;
      advanceTurn(next, players, boneyard, leftEnd, rightEnd, chain);
    }
  };

  const placeBet = () => {
    if (onBet(bet)) { setBetPlaced(true); toast.success(`Bet ${bet} $Pc placed!`); }
  };

  const humanPlayer = players.find(p => p.isHuman);
  const humanPlayable = playableTileIds;
  const isHumanTurn = phase === 'playing' && players[currentPlayer]?.id === 'human';
  const canDraw = isHumanTurn && humanPlayable.size === 0 && boneyard.length > 0;
  const canPass = isHumanTurn && humanPlayable.size === 0 && boneyard.length === 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes crackIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes flashOut { 0% { opacity:1 } 100% { opacity:0 } }
        @keyframes crackLine { 0% { opacity:0; stroke-dashoffset:200 } 100% { opacity:0.7; stroke-dashoffset:0 } }
        @keyframes screenShake {
          0% { transform:translate(0,0) rotate(0deg) }
          10% { transform:translate(-6px,-4px) rotate(-1deg) }
          20% { transform:translate(6px,4px) rotate(1deg) }
          30% { transform:translate(-4px,2px) rotate(-0.5deg) }
          40% { transform:translate(4px,-2px) rotate(0.5deg) }
          50% { transform:translate(-2px,4px) rotate(-0.3deg) }
          60% { transform:translate(2px,-4px) rotate(0.3deg) }
          70% { transform:translate(-1px,2px) rotate(-0.1deg) }
          80% { transform:translate(1px,-1px) rotate(0.1deg) }
          100% { transform:translate(0,0) rotate(0deg) }
        }
        @keyframes slideIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes tileEntrance { from { opacity:0; transform:scale(0.5) rotate(-10deg) } to { opacity:1; transform:scale(1) rotate(0deg) } }
        @keyframes pulseGlow { 0%,100% { box-shadow:0 0 10px rgba(67,160,71,0.4) } 50% { box-shadow:0 0 20px rgba(67,160,71,0.8) } }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(10,8,0,0.98) 0%, rgba(25,15,0,0.98) 100%)',
        borderBottom: '1px solid rgba(212,175,55,0.3)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="ghost" onClick={onBack} style={{ color: '#D4AF37', padding: '8px 12px' }}>
            <ArrowLeft size={18} style={{ marginRight: 6 }} /> Back
          </Button>
          <div>
            <div style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 700, color: '#D4AF37', letterSpacing: 2 }}>
              🁢 DOMINOES
            </div>
            <div style={{ fontSize: 11, color: '#808080' }}>Double-Six Draw • 4 Players</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            padding: '6px 16px', borderRadius: 20,
            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
            color: '#D4AF37', fontWeight: 700, fontSize: 14,
          }}>
            {balance.toLocaleString()} $Pc
          </div>
          <button onClick={() => setMuted(m => !m)} style={{ background: 'none', border: 'none', color: '#808080', cursor: 'pointer', padding: 8 }}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button onClick={() => setShowSettings(s => !s)} style={{ background: 'none', border: 'none', color: '#808080', cursor: 'pointer', padding: 8 }}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 200,
          background: 'rgba(8,6,0,0.98)', borderLeft: '1px solid rgba(212,175,55,0.3)',
          padding: 24, overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 18 }}>Settings</div>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#808080', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          <div style={{ color: '#D4AF37', fontWeight: 600, marginBottom: 10 }}>Domino Skin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {(Object.keys(DOMINO_SKINS) as (keyof typeof DOMINO_SKINS)[]).map(k => (
              <button key={k} onClick={() => setDominoSkin(k)} style={{
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                background: dominoSkin === k ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${dominoSkin === k ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
                color: dominoSkin === k ? '#D4AF37' : '#aaa',
              }}>{DOMINO_SKINS[k].name}</button>
            ))}
          </div>

          <div style={{ color: '#D4AF37', fontWeight: 600, marginBottom: 10 }}>Table Theme</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {(Object.keys(TABLE_SKINS) as (keyof typeof TABLE_SKINS)[]).map(k => (
              <button key={k} onClick={() => setTableSkin(k)} style={{
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                background: tableSkin === k ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${tableSkin === k ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
                color: tableSkin === k ? '#D4AF37' : '#aaa',
              }}>{TABLE_SKINS[k].name}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ color: '#D4AF37', fontWeight: 600, fontSize: 14 }}>Slam Effect</div>
              <div style={{ color: '#808080', fontSize: 11 }}>Table crack on domino-out</div>
            </div>
            <button onClick={() => setSlamEffect(s => !s)} style={{
              width: 48, height: 26, borderRadius: 13, cursor: 'pointer', border: 'none',
              background: slamEffect ? '#D4AF37' : '#333',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: slamEffect ? 24 : 3, width: 20, height: 20,
                borderRadius: '50%', background: 'white', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      )}

      {/* Setup screen */}
      {phase === 'setup' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            background: 'rgba(15,10,0,0.95)', border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: 20, padding: 40, maxWidth: 420, width: '100%',
            boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
            animation: 'slideIn 0.4s ease',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🁣🁢🁡</div>
              <div style={{ fontFamily: 'serif', fontSize: 28, fontWeight: 700, color: '#D4AF37', letterSpacing: 3, marginBottom: 8 }}>DOMINOES</div>
              <div style={{ color: '#808080', fontSize: 13 }}>Classic Draw • Double-Six • 4 Players</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#D4AF37', fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Place Your Bet</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[5, 10, 25, 50, 100].map(b => (
                  <button key={b} onClick={() => setBet(b)} style={{
                    flex: '1 1 60px', padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                    background: bet === b ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${bet === b ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
                    color: bet === b ? '#D4AF37' : '#aaa', fontWeight: 700, fontSize: 14,
                  }}>{b}</button>
                ))}
              </div>
              <div style={{ color: '#808080', fontSize: 11, marginTop: 8, textAlign: 'center' }}>Win 3× on domino-out!</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {!betPlaced ? (
                <Button onClick={placeBet} disabled={balance < bet} style={{
                  flex: 1, height: 48, fontWeight: 700, fontSize: 16,
                  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                  color: '#000', border: 'none',
                }}>
                  Place Bet ({bet} $Pc)
                </Button>
              ) : (
                <Button onClick={startGame} style={{
                  flex: 1, height: 48, fontWeight: 700, fontSize: 16,
                  background: 'linear-gradient(135deg, #43A047, #1B5E20)',
                  color: 'white', border: 'none',
                }}>
                  <Zap size={18} style={{ marginRight: 8 }} /> Deal Tiles!
                </Button>
              )}
            </div>

            {betPlaced && (
              <div style={{ marginTop: 12, textAlign: 'center', color: '#43A047', fontSize: 13, fontWeight: 600 }}>
                ✓ Bet placed — click Deal to start!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Round over screen */}
      {phase === 'roundOver' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            background: 'rgba(15,10,0,0.97)', border: '1px solid rgba(212,175,55,0.5)',
            borderRadius: 20, padding: 48, maxWidth: 380, width: '100%', textAlign: 'center',
            boxShadow: '0 40px 80px rgba(0,0,0,0.9)',
            animation: 'slideIn 0.5s ease',
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>
              {roundWinner === 'You' ? '🏆' : '😔'}
            </div>
            <div style={{ fontFamily: 'serif', fontSize: 26, fontWeight: 700, color: roundWinner === 'You' ? '#D4AF37' : '#EF5350', marginBottom: 8 }}>
              {roundWinner === 'You' ? 'DOMINO OUT!' : `${roundWinner} wins!`}
            </div>
            {roundScore > 0 && (
              <div style={{ color: '#808080', marginBottom: 8, fontSize: 14 }}>
                Score earned: {roundScore} pips
              </div>
            )}
            {roundWinner === 'You' && (
              <div style={{ color: '#43A047', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
                +{bet * 3} $Pc won!
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button onClick={() => {
                setBetPlaced(false);
                setPhase('setup');
                setChain([]);
                setSelectedTile(null);
              }} style={{
                flex: 1, height: 48, fontWeight: 700,
                background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                color: '#000', border: 'none', fontSize: 15,
              }}>
                <RotateCcw size={16} style={{ marginRight: 8 }} /> Play Again
              </Button>
              <Button onClick={onBack} variant="outline" style={{
                flex: 1, height: 48, borderColor: 'rgba(212,175,55,0.4)', color: '#D4AF37',
              }}>
                Leave Table
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      {phase === 'playing' && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          animation: shaking ? 'screenShake 0.8s ease' : 'none',
          overflow: 'hidden',
        }}>
          {/* AI players row (top) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 16px', gap: 8 }}>
            {players.filter(p => !p.isHuman).map((p, i) => (
              <div key={p.id} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 12,
                background: currentPlayer === i + 1 ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${currentPlayer === i + 1 ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{p.avatar}</span>
                  <span style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                  {currentPlayer === i + 1 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', animation: 'pulseGlow 1s infinite' }} />}
                </div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {p.hand.map((_, ti) => (
                    <DominoTile key={ti} tile={{ left: 0, right: 0, id: '' }} flipped={false}
                      faceDown skin={skin} horizontal size="sm" />
                  ))}
                </div>
                <div style={{ color: '#808080', fontSize: 10 }}>{p.hand.length} tiles</div>
              </div>
            ))}
          </div>

          {/* Square table */}
          <div style={{ flex: 1, padding: '0 16px', position: 'relative', minHeight: 0 }}>
            <div style={{
              height: '100%', minHeight: 280,
              borderRadius: 20,
              background: table.bg,
              border: `3px solid ${table.line}`,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Felt inner */}
              <div style={{
                position: 'absolute', inset: 12, borderRadius: 14,
                background: table.felt, border: `1px solid ${table.line}`,
                opacity: 0.6,
              }} />

              {/* Crack overlay */}
              <CrackOverlay active={cracking} />

              {/* Chain of dominoes */}
              <div style={{
                position: 'relative', zIndex: 2,
                display: 'flex', flexWrap: 'wrap', gap: 4,
                alignItems: 'center', justifyContent: 'center',
                maxWidth: '90%', padding: 16,
              }}>
                {chain.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontStyle: 'italic' }}>
                    Play a tile to start the chain
                  </div>
                ) : (
                  chain.map((pt, i) => (
                    <div key={pt.tile.id} style={{
                      animation: i === chain.length - 1 ? 'tileEntrance 0.3s ease' : 'none',
                    }}>
                      <DominoTile tile={pt.tile} flipped={pt.flipped} skin={skin}
                        horizontal={pt.direction === 'h'} size="sm" />
                    </div>
                  ))
                )}
              </div>

              {/* End values indicator */}
              {chain.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 3,
                  display: 'flex', justifyContent: 'space-between', padding: '0 20px',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)',
                    color: '#D4AF37', fontWeight: 700, fontSize: 13,
                  }}>← {leftEnd}</div>
                  <div style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)',
                    color: '#D4AF37', fontWeight: 700, fontSize: 13,
                  }}>{rightEnd} →</div>
                </div>
              )}

              {/* Boneyard counter */}
              <div style={{
                position: 'absolute', top: 14, right: 14, zIndex: 3,
                padding: '6px 12px', borderRadius: 10,
                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#aaa', fontSize: 12,
              }}>
                🁣 {boneyard.length} left
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            padding: '8px 20px', textAlign: 'center',
            color: isHumanTurn ? '#D4AF37' : '#808080', fontSize: 13, fontWeight: 500,
          }}>
            {statusMsg}
          </div>

          {/* Human controls */}
          {isHumanTurn && selectedTile && chain.length > 0 && (
            <div style={{
              display: 'flex', gap: 10, justifyContent: 'center', padding: '0 16px 8px',
              animation: 'slideIn 0.2s ease',
            }}>
              <Button onClick={() => handlePlaySelected('left')} style={{
                background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)',
                color: '#D4AF37', fontWeight: 700, gap: 6,
              }}>← Play Left ({leftEnd})</Button>
              <Button onClick={() => handlePlaySelected('right')} style={{
                background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)',
                color: '#D4AF37', fontWeight: 700, gap: 6,
              }}>Play Right ({rightEnd}) →</Button>
              <Button onClick={() => setSelectedTile(null)} variant="ghost" style={{ color: '#808080' }}>Cancel</Button>
            </div>
          )}
          {isHumanTurn && selectedTile && chain.length === 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: '0 16px 8px' }}>
              <Button onClick={() => handlePlaySelected('any')} style={{
                background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                color: '#000', fontWeight: 700,
              }}>Play Tile to Start</Button>
              <Button onClick={() => setSelectedTile(null)} variant="ghost" style={{ color: '#808080' }}>Cancel</Button>
            </div>
          )}
          {isHumanTurn && !selectedTile && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: '0 16px 8px' }}>
              {canDraw && (
                <Button onClick={handleDraw} style={{
                  background: 'rgba(30,136,229,0.2)', border: '1px solid rgba(30,136,229,0.5)',
                  color: '#42A5F5', fontWeight: 700,
                }}>Draw from Boneyard</Button>
              )}
              {canPass && (
                <Button onClick={handlePass} style={{
                  background: 'rgba(183,28,28,0.2)', border: '1px solid rgba(183,28,28,0.5)',
                  color: '#EF5350', fontWeight: 700,
                }}>Pass Turn</Button>
              )}
            </div>
          )}

          {/* Human hand */}
          <div style={{
            padding: '10px 16px 16px',
            background: 'rgba(0,0,0,0.4)',
            borderTop: '1px solid rgba(212,175,55,0.15)',
          }}>
            <div style={{ color: '#D4AF37', fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
              Your Hand ({humanPlayer?.hand.length ?? 0} tiles)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {humanPlayer?.hand.map(tile => (
                <div key={tile.id} style={{ animation: 'tileEntrance 0.3s ease' }}>
                  <DominoTile
                    tile={tile}
                    selected={selectedTile === tile.id}
                    playable={isHumanTurn && humanPlayable.has(tile.id) && selectedTile !== tile.id}
                    skin={skin}
                    size="md"
                    onClick={() => handleTileClick(tile.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
