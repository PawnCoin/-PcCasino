import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Maximize2, Minimize2, AlertTriangle, Users } from 'lucide-react';
import { CasinoIcon } from '@/components/CasinoIcons';
import { InGameTopBar } from '@/components/InGameTopBar';
import { getSoundMuted, getSoundVolume, getSoundAmbient, getSoundTrackTitle, subscribeSoundState } from '@/hooks/soundState';
import { getDefaultRouletteSkin, ROULETTE_SKINS } from '@/hooks/useRouletteSkin';
import { getSocket } from '@/lib/socket';
import { ChipSelector, formatChipLabel } from '@/components/PokerChip';
import { useCasinoBots } from '@/hooks/useCasinoBots';
import { GameBotBar } from '@/components/GameBotBar';

interface IframeGameWrapperProps {
  gameId: string;
  gameName: string;
  gameEmoji: string;
  gamePath: string;
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onBalanceSync?: (newBalance: number) => void;
  onShowWallet?: () => void;
  onGameStateChange?: (active: boolean) => void;
  username?: string;
  userId?: string | number;
  avatarUrl?: string | null;
}

interface RoulettePlayer {
  id: string | number;
  socketId: string;
  username: string;
  avatarUrl: string | null;
  avatar: string | null;
  betTotal: number;
}

type HorseRacePhase = 'loading' | 'menu' | 'betting' | 'racing' | 'result';

interface SceneryOption {
  id: string;
  label: string;
  filter: string;
  icon: string;
}

const SCENERY_OPTIONS: SceneryOption[] = [
  { id: 'classic', label: 'Classic', filter: 'none', icon: '🌿' },
  { id: 'night', label: 'Night Race', filter: 'brightness(0.55) contrast(1.2) saturate(0.7) hue-rotate(200deg)', icon: '🌙' },
  { id: 'desert', label: 'Desert', filter: 'sepia(0.5) saturate(1.3) brightness(1.05) hue-rotate(-10deg)', icon: '🏜️' },
];

export function IframeGameWrapper({
  gameId,
  gameName,
  gameEmoji,
  gamePath,
  balance,
  onBack,
  onBet,
  onWin,
  onBalanceSync,
  onShowWallet,
  onGameStateChange,
  username,
  userId,
  avatarUrl,
}: IframeGameWrapperProps) {
  const { activeBots, onlinePlayerCount } = useCasinoBots({ gameName, minBots: 3, maxBots: 8, statusMessages: ['Watching', 'Playing', 'Betting', 'At table'] });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;
  const gameInProgressRef = useRef(false);
  const onBetRef = useRef(onBet);
  onBetRef.current = onBet;
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;
  const onBalanceSyncRef = useRef(onBalanceSync);
  onBalanceSyncRef.current = onBalanceSync;

  const [roulettePlayers, setRoulettePlayers] = useState<RoulettePlayer[]>([]);
  const [roulettePhase, setRoulettePhase] = useState<string>('waiting');
  const [rouletteTimer, setRouletteTimer] = useState(0);
  const rouletteRoundIdRef = useRef(0);
  const isRoulette = gameId === 'roulette';
  const isHorseRacing = gameId === 'horse-racing';

  const [hrPhase, setHrPhase] = useState<HorseRacePhase>('loading');
  const [hrSelectedChip, setHrSelectedChip] = useState(5);
  const [hrScenery, setHrScenery] = useState('classic');
  const [hrShowChips, setHrShowChips] = useState(true);

  const [iframeSrc, setIframeSrc] = useState('');
  const iframeSrcSet = useRef(false);
  useEffect(() => {
    if (iframeSrcSet.current) return;
    if (balance > 0) {
      setIframeSrc(`${gamePath}?balance=${balance}`);
      iframeSrcSet.current = true;
      return;
    }
    const timer = setTimeout(() => {
      if (!iframeSrcSet.current) {
        setIframeSrc(`${gamePath}?balance=${balance}`);
        iframeSrcSet.current = true;
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [balance, gamePath]);

  const sendMusicState = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({
      type: 'music:state',
      playing: getSoundAmbient(),
      volume: getSoundVolume(),
      muted: getSoundMuted(),
      trackTitle: getSoundTrackTitle(),
    }, '*');
  }, []);

  const sendHrChantState = useCallback(() => {
    if (!isHorseRacing) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'hr:chantMute', muted: getSoundMuted() }, '*');
    win.postMessage({ type: 'hr:chantVolume', volume: getSoundVolume() }, '*');
  }, [isHorseRacing]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return;
      const { type, amount } = event.data;

      if (type === 'bet' && typeof amount === 'number' && amount > 0) {
        const success = onBet(amount);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'bet:result', success, balance: success ? balanceRef.current : balanceRef.current },
          '*'
        );
      }

      if (type === 'win' && typeof amount === 'number' && amount > 0) {
        onWin(amount);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'win:confirmed', amount, balance: balanceRef.current },
          '*'
        );
      }

      if (isRoulette && type === 'roulette:betsSnapshot') {
        const bets = Array.isArray(event.data.bets) ? event.data.bets : [];
        getSocket().emit('roulette:betsSnapshot', {
          bets: bets.map((b: { numbers: number[]; amount: number }) => ({
            numbers: Array.isArray(b.numbers) ? b.numbers : [],
            amount: typeof b.amount === 'number' ? b.amount : 0,
          })),
          betTotal: typeof event.data.betTotal === 'number' ? event.data.betTotal : 0,
        });
      }

      if (type === 'getBalance') {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'balance', balance: balanceRef.current },
          '*'
        );
      }

      if (type === 'gameState' && typeof event.data.active === 'boolean') {
        gameInProgressRef.current = event.data.active;
        onGameStateChange?.(event.data.active);
      }

      if (isHorseRacing && type === 'hr:phase' && typeof event.data.phase === 'string') {
        const phase = event.data.phase as HorseRacePhase;
        setHrPhase(phase);
        if (phase === 'racing') {
          gameInProgressRef.current = true;
          onGameStateChange?.(true);
        } else if (phase === 'betting' || phase === 'result') {
          gameInProgressRef.current = false;
          onGameStateChange?.(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onBet, onWin, isRoulette, isHorseRacing]);

  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'balance:update', balance },
        '*'
      );
      const t = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'balance:update', balance: balanceRef.current },
          '*'
        );
      }, 500);
      return () => clearTimeout(t);
    }
  }, [balance, isLoaded]);

  const sendSkinState = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const skin = getDefaultRouletteSkin();
    win.postMessage({ type: 'skin:update', skin }, '*');
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    sendMusicState();
    sendSkinState();
    if (isHorseRacing) sendHrChantState();
    const unsubMusic = subscribeSoundState(() => {
      sendMusicState();
      if (isHorseRacing) sendHrChantState();
    });
    const handleSkinChange = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const found = ROULETTE_SKINS.find(s => s.id === id);
      if (found) {
        iframeRef.current?.contentWindow?.postMessage({ type: 'skin:update', skin: found }, '*');
      }
    };
    window.addEventListener('pcasino_roulette_skin_change', handleSkinChange);
    return () => {
      unsubMusic();
      window.removeEventListener('pcasino_roulette_skin_change', handleSkinChange);
    };
  }, [isLoaded, sendMusicState, sendSkinState, isHorseRacing, sendHrChantState]);

  useEffect(() => {
    if (!isRoulette || !isLoaded) return;
    const socket = getSocket();

    socket.emit('roulette:join', {
      username: username || 'Guest',
      avatarUrl: avatarUrl || null,
      avatar: null,
      userId: userId || null,
    });

    const onState = (data: { phase: string; timer: number; roundId: number; players: RoulettePlayer[]; history?: number[] }) => {
      setRoulettePhase(data.phase);
      setRouletteTimer(data.timer);
      setRoulettePlayers(data.players);
      rouletteRoundIdRef.current = data.roundId;
      iframeRef.current?.contentWindow?.postMessage({
        type: 'roulette:state',
        phase: data.phase,
        timer: data.timer,
        roundId: data.roundId,
        players: data.players,
        history: data.history,
      }, '*');
    };

    const onSpin = (data: { result: number; roundId: number; players: RoulettePlayer[]; netChange?: number; newBalance?: number }) => {
      setRoulettePhase('spinning');
      rouletteRoundIdRef.current = data.roundId;
      if (data.players) setRoulettePlayers(data.players);
      iframeRef.current?.contentWindow?.postMessage({
        type: 'roulette:spin',
        result: data.result,
        roundId: data.roundId,
      }, '*');
      const playerCount = data.players ? data.players.length : roulettePlayers.length;
      if (playerCount > 1) {
        if (typeof data.newBalance === 'number' && onBalanceSyncRef.current) {
          onBalanceSyncRef.current(data.newBalance);
        } else if (typeof data.netChange === 'number' && data.netChange !== 0) {
          if (data.netChange > 0) {
            onWinRef.current(data.netChange);
          } else {
            onBetRef.current(Math.abs(data.netChange));
          }
        }
      }
    };

    const onPlayers = (data: { players: RoulettePlayer[] }) => {
      setRoulettePlayers(data.players);
      iframeRef.current?.contentWindow?.postMessage({
        type: 'roulette:players',
        players: data.players,
      }, '*');
    };

    socket.on('roulette:state', onState);
    socket.on('roulette:spin', onSpin);
    socket.on('roulette:players', onPlayers);

    return () => {
      socket.emit('roulette:leave');
      socket.off('roulette:state', onState);
      socket.off('roulette:spin', onSpin);
      socket.off('roulette:players', onPlayers);
    };
  }, [isRoulette, isLoaded, username, avatarUrl, userId]);

  useEffect(() => {
    if (!isHorseRacing || !isLoaded) return;
    iframeRef.current?.contentWindow?.postMessage({ type: 'hr:chipSelect', value: hrSelectedChip }, '*');
  }, [hrSelectedChip, isHorseRacing, isLoaded]);

  const handleHrChipSelect = useCallback((amount: number) => {
    setHrSelectedChip(amount);
    iframeRef.current?.contentWindow?.postMessage({ type: 'hr:chipSelect', value: amount }, '*');
  }, []);

  const handleHrSceneryChange = useCallback((sceneryId: string) => {
    setHrScenery(sceneryId);
    const opt = SCENERY_OPTIONS.find(s => s.id === sceneryId);
    if (opt) {
      iframeRef.current?.contentWindow?.postMessage({ type: 'hr:scenery', filter: opt.filter }, '*');
    }
  }, []);

  const requestBack = useCallback(() => {
    if (gameInProgressRef.current) {
      setShowLeaveModal(true);
    } else {
      onBack();
    }
  }, [onBack]);

  const confirmLeave = useCallback(() => {
    setShowLeaveModal(false);
    onBack();
  }, [onBack]);

  const cancelLeave = useCallback(() => {
    setShowLeaveModal(false);
  }, []);

  const handleReload = () => {
    setIsLoaded(false);
    setLoadError(false);
    if (isHorseRacing) {
      setHrPhase('loading');
    }
    if (iframeRef.current) {
      iframeRef.current.src = `${gamePath}?balance=${balanceRef.current}`;
    }
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      iframeRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const otherPlayers = roulettePlayers.filter(p => {
    if (userId) return p.id !== userId;
    return p.socketId !== getSocket().id;
  });

  const rightSlot = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <GameBotBar bots={activeBots} onlineCount={onlinePlayerCount} compact />
      {isRoulette && roulettePlayers.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
          borderRadius: 8, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)',
          fontSize: 12, color: '#D4AF37', fontWeight: 600,
        }}>
          <Users size={12} />
          <span>{roulettePlayers.length}</span>
        </div>
      )}
      {isRoulette && roulettePhase === 'betting' && rouletteTimer > 0 && (
        <div style={{
          padding: '3px 10px', borderRadius: 8,
          background: rouletteTimer <= 5 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
          border: `1px solid ${rouletteTimer <= 5 ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.3)'}`,
          fontSize: 12, fontWeight: 700,
          color: rouletteTimer <= 5 ? '#ef4444' : '#22c55e',
          fontFamily: 'monospace',
        }}>
          {rouletteTimer}s
        </div>
      )}

      {isHorseRacing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
          borderRadius: 8,
          background: hrPhase === 'racing' ? 'rgba(239,68,68,0.15)' : hrPhase === 'betting' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${hrPhase === 'racing' ? 'rgba(239,68,68,0.3)' : hrPhase === 'betting' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
          fontSize: 11, fontWeight: 700,
          color: hrPhase === 'racing' ? '#ef4444' : hrPhase === 'betting' ? '#22c55e' : '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {hrPhase === 'racing' ? 'RACING' : hrPhase === 'betting' ? 'PLACE BETS' : hrPhase === 'result' ? 'RESULTS' : hrPhase === 'menu' ? 'READY' : 'LOADING'}
        </div>
      )}

      <CasinoIcon name={gameEmoji} size={20} />
      <button
        onClick={handleReload}
        title="Reload game"
        style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
      >
        <RefreshCw size={13} />
      </button>
      <button
        onClick={handleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
      >
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </button>
    </div>
  );

  const hrChipOverlay = isHorseRacing && isLoaded && (hrPhase === 'betting' || hrPhase === 'menu') && (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 25,
      background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0) 100%)',
      padding: '20px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
        <div style={{
          fontSize: 11, color: '#D4AF37', fontWeight: 700, letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Bet Chip: {formatChipLabel(hrSelectedChip)} $Pc
        </div>
        <button
          onClick={() => setHrShowChips(v => !v)}
          style={{
            padding: '3px 10px',
            borderRadius: 12,
            border: '1px solid rgba(212,175,55,0.4)',
            background: hrShowChips ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.08)',
            color: '#D4AF37',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {hrShowChips ? '▴ HIDE CHIPS' : '▾ SHOW ALL CHIPS'}
        </button>
      </div>

      {hrShowChips && (
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 16,
          padding: '10px 14px',
          border: '1px solid rgba(212,175,55,0.2)',
          maxHeight: 220,
          overflowY: 'auto',
          width: '100%',
          maxWidth: 600,
        }}>
          <ChipSelector
            selectedChip={hrSelectedChip}
            onSelect={handleHrChipSelect}
            balance={balance}
            compact
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {SCENERY_OPTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => handleHrSceneryChange(s.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 10,
              border: hrScenery === s.id ? '1.5px solid #D4AF37' : '1px solid rgba(255,255,255,0.12)',
              background: hrScenery === s.id ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)',
              color: hrScenery === s.id ? '#D4AF37' : '#888',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );

  const hrRacingOverlay = isHorseRacing && isLoaded && hrPhase === 'racing' && (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 25,
      background: 'rgba(0,0,0,0.7)',
      borderRadius: 12,
      padding: '6px 14px',
      border: '1px solid rgba(239,68,68,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#ef4444',
        animation: 'pulse 1s infinite',
      }} />
      <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, letterSpacing: '1px' }}>
        LIVE
      </span>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%)' }}
    >
      <InGameTopBar
        gameName={gameName}
        balance={balance}
        onBack={requestBack}
        onShowWallet={onShowWallet}
        rightSlot={rightSlot}
      />

      <div className="flex-1 relative">
        {!isLoaded && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.9)' }}>
            <div className="mb-4 animate-bounce"><CasinoIcon name={gameEmoji} size={64} /></div>
            <p className="text-[#D4AF37] font-casino text-xl mb-2">Loading {gameName}…</p>
            <p className="text-[#808080] text-sm">Game files loading from /games/{gameId}/</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.9)' }}>
            <div className="mb-4"><CasinoIcon name={gameEmoji} size={64} /></div>
            <h2 className="font-casino text-2xl font-bold mb-2 metallic-gold-text">{gameName}</h2>
            <p className="text-[#A0A0A0] text-base mb-2">Game files not found</p>
            <p className="text-[#606060] text-sm mb-6 text-center max-w-sm">
              Drop the game files into <code className="text-[#D4AF37]">/public/games/{gameId}/</code> to activate this game.
            </p>
            <button
              onClick={onBack}
              className="px-6 py-2 rounded-xl font-bold text-black transition-all"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}
            >
              Back to Lobby
            </button>
          </div>
        )}

        {iframeSrc && <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 52px)' }}
          allow="fullscreen"
          onLoad={() => setIsLoaded(true)}
          onError={() => { setLoadError(true); setIsLoaded(true); }}
          title={gameName}
        />}

        {hrChipOverlay}
        {hrRacingOverlay}

        {isRoulette && (
          <>
            <div style={{
              position: 'absolute', bottom: 60, left: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              pointerEvents: 'none', zIndex: 20,
              background: 'rgba(0,0,0,0.82)', borderRadius: 12, padding: '6px 10px',
              border: '1.5px solid rgba(212,175,55,0.5)', minWidth: 60,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(135deg, #D4AF37, #8B6914)',
                border: '2.5px solid #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#fff', boxShadow: '0 0 8px rgba(212,175,55,0.4)',
              }}>
                {!avatarUrl && (username?.[0]?.toUpperCase() || '?')}
              </div>
              <span style={{ fontSize: 10, color: '#D4AF37', fontWeight: 700, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username || 'You'}
              </span>
              <span style={{ fontSize: 8, color: '#22c55e', fontWeight: 600 }}>YOU</span>
            </div>
            {otherPlayers.slice(0, 6).map((p, i) => {
              const positions = [
                { top: '15%', right: 12 },
                { top: '30%', right: 12 },
                { top: '45%', right: 12 },
                { bottom: 120, right: 12 },
                { bottom: 60, right: 12 },
                { bottom: 60, right: 90 },
              ];
              const pos = positions[i];
              return (
                <div key={p.socketId || i} style={{
                  position: 'absolute', ...pos,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  background: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: '5px 8px',
                  border: '1px solid rgba(212,175,55,0.25)', minWidth: 54,
                  pointerEvents: 'none', zIndex: 20,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: p.avatarUrl ? `url(${p.avatarUrl}) center/cover` : 'linear-gradient(135deg, #666, #444)',
                    border: '2px solid rgba(212,175,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#fff',
                  }}>
                    {!p.avatarUrl && (p.username?.[0]?.toUpperCase() || '?')}
                  </div>
                  <span style={{ fontSize: 8, color: '#ccc', fontWeight: 600, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.username}
                  </span>
                  <span style={{ fontSize: 7, color: p.betTotal > 0 ? '#22c55e' : '#666', fontWeight: 700 }}>
                    {p.betTotal > 0 ? `${p.betTotal.toLocaleString()} $Pc` : 'Watching'}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showLeaveModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-7 flex flex-col items-center gap-4 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)', border: '1px solid rgba(212,175,55,0.3)', maxWidth: 360, width: '90%' }}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={28} style={{ color: '#ef4444' }} />
            </div>
            <h3 className="font-casino text-xl font-bold metallic-gold-text text-center">Leave Game?</h3>
            <p className="text-[#A0A0A0] text-sm text-center leading-relaxed">
              Nothing will be saved — your bets and any active round will be lost. Are you sure you want to exit?
            </p>
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={cancelLeave}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              >
                Stay
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {isHorseRacing && (
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      )}
    </div>
  );
}
