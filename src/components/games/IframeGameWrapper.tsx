import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface IframeGameWrapperProps {
  gameId: string;
  gameName: string;
  gameEmoji: string;
  gamePath: string;
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
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
}: IframeGameWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const iframeSrc = `${gamePath}?balance=${balance}`;

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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(212,175,55,0.2)', background: 'rgba(6,6,12,0.95)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/10 text-[#C0C0C0] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Back to Lobby</span>
          </button>
          <div className="h-5 w-px bg-white/10" />
          <span className="text-xl">{gameEmoji}</span>
          <span className="font-casino font-bold text-[#D4AF37]">{gameName}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{ background: 'rgba(27,94,32,0.4)', border: '1px solid rgba(67,160,71,0.3)' }}
          >
            <img src="/logos/pc-logo.png" alt="$Pc" className="w-4 h-4" />
            <span className="font-bold text-[#D4AF37]">{balance.toLocaleString()}</span>
            <span className="text-[#808080] text-xs">$Pc</span>
          </div>

          <button
            onClick={handleReload}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[#808080] hover:text-white"
            title="Reload game"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleFullscreen}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[#808080] hover:text-white"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

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
          style={{ minHeight: 'calc(100vh - 57px)' }}
          allow="fullscreen"
          onLoad={() => setIsLoaded(true)}
          onError={() => { setLoadError(true); setIsLoaded(true); }}
          title={gameName}
        />
      </div>
    </div>
  );
}
