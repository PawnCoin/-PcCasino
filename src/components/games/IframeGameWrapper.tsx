import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import { InGameTopBar } from '@/components/InGameTopBar';
import { getSoundMuted, getSoundVolume, getSoundAmbient, subscribeSoundState } from '@/hooks/soundState';

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
}: IframeGameWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;
  const gameInProgressRef = useRef(false);

  const iframeSrc = `${gamePath}?balance=${balance}`;

  // Send current music state to the iframe
  const sendMusicState = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({
      type: 'music:state',
      playing: getSoundAmbient(),
      volume: getSoundVolume(),
      muted: getSoundMuted(),
    }, '*');
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
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
  }, [onBet, onWin]);

  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'balance:update', balance },
        '*'
      );
    }
  }, [balance, isLoaded]);

  // Send initial music state when iframe loads; subscribe to future changes
  useEffect(() => {
    if (!isLoaded) return;
    sendMusicState();
    return subscribeSoundState(() => {
      sendMusicState();
    });
  }, [isLoaded, sendMusicState]);

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

  const rightSlot = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
