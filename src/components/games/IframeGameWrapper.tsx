import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Maximize2, Minimize2, AlertTriangle, Users } from 'lucide-react';
import { InGameTopBar } from '@/components/InGameTopBar';
import { getSoundMuted, getSoundVolume, getSoundAmbient, getSoundTrackTitle, subscribeSoundState } from '@/hooks/soundState';
import { getDefaultRouletteSkin, ROULETTE_SKINS } from '@/hooks/useRouletteSkin';
import { getSocket } from '@/lib/socket';

interface IframeGameWrapperProps {
  gameId: string;
  gameName: string;
  gameEmoji: string;
  gamePath: string;
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
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

export function IframeGameWrapper({
  gameId,
  gameName,
  gameEmoji,
  gamePath,
  balance,
  onBack,
  onBet,
  onWin,
  onShowWallet,
  onGameStateChange,
  username,
  userId,
  avatarUrl,
}: IframeGameWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;
  const gameInProgressRef = useRef(false);

  const [roulettePlayers, setRoulettePlayers] = useState<RoulettePlayer[]>([]);
  const [roulettePhase, setRoulettePhase] = useState<string>('waiting');
  const [rouletteTimer, setRouletteTimer] = useState(0);
  const rouletteRoundIdRef = useRef(0);
  const isRoulette = gameId === 'roulette';

  const iframeSrc = `${gamePath}?balance=${balance}`;

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return;
      const { type, amount } = event.data;

      if (type === 'bet' && typeof amount === 'number' && amount > 0) {
        if (!isRoulette) {
          const success = onBet(amount);
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'bet:result', success, balance: success ? balanceRef.current : balanceRef.current },
            '*'
          );
        }
      }

      if (type === 'win' && typeof amount === 'number' && amount > 0) {
        if (!isRoulette) {
          onWin(amount);
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'win:confirmed', amount, balance: balanceRef.current },
            '*'
          );
        }
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
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onBet, onWin, isRoulette]);

  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'balance:update', balance },
        '*'
      );
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
    const unsubMusic = subscribeSoundState(() => {
      sendMusicState();
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
  }, [isLoaded, sendMusicState, sendSkinState]);

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

    const onSpin = (data: { result: number; roundId: number; players: RoulettePlayer[]; payout?: number; betTotal?: number }) => {
      setRoulettePhase('spinning');
      rouletteRoundIdRef.current = data.roundId;
      if (data.players) setRoulettePlayers(data.players);
      iframeRef.current?.contentWindow?.postMessage({
        type: 'roulette:spin',
        result: data.result,
        roundId: data.roundId,
      }, '*');
      if (typeof data.betTotal === 'number' && data.betTotal > 0) {
        onBet(data.betTotal);
      }
      if (typeof data.payout === 'number' && data.payout > 0) {
        onWin(data.payout);
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
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
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
      <span style={{ fontSize: 20 }}>{gameEmoji}</span>
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
            <div className="text-6xl mb-4 animate-bounce">{gameEmoji}</div>
            <p className="text-[#D4AF37] font-casino text-xl mb-2">Loading {gameName}…</p>
            <p className="text-[#808080] text-sm">Game files loading from /games/{gameId}/</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.9)' }}>
            <div className="text-6xl mb-4">{gameEmoji}</div>
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

        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 52px)' }}
          allow="fullscreen"
          onLoad={() => setIsLoaded(true)}
          onError={() => { setLoadError(true); setIsLoaded(true); }}
          title={gameName}
        />

        {isRoulette && otherPlayers.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 6,
            pointerEvents: 'none', zIndex: 20,
          }}>
            {otherPlayers.slice(0, 6).map((p, i) => (
              <div key={p.socketId || i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: '4px 8px',
                border: '1px solid rgba(212,175,55,0.3)', minWidth: 52,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: p.avatarUrl ? `url(${p.avatarUrl}) center/cover` : 'linear-gradient(135deg, #D4AF37, #8B6914)',
                  border: '2px solid #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff',
                }}>
                  {!p.avatarUrl && (p.username?.[0]?.toUpperCase() || '?')}
                </div>
                <span style={{ fontSize: 9, color: '#D4AF37', fontWeight: 600, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.username}
                </span>
                <span style={{ fontSize: 8, color: p.betTotal > 0 ? '#22c55e' : '#666', fontWeight: 700 }}>
                  {p.betTotal > 0 ? `${p.betTotal.toLocaleString()} $Pc` : 'Watching'}
                </span>
              </div>
            ))}
          </div>
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
    </div>
  );
}
