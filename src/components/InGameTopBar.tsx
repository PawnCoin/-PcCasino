import { useState } from 'react';
import { ArrowLeft, Settings, Share2, Zap, Tv, X, Maximize2, Minimize2, Wallet } from 'lucide-react';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { InGameOptionsPanel } from './InGameOptionsPanel';
import { InGameQuickBuy } from './InGameQuickBuy';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';

interface InGameTopBarProps {
  gameName: string;
  balance: number;
  onBack: () => void;
  onAddBalance?: (amount: number) => void;
  onShowWallet?: () => void;
  winAmount?: number;
  rank?: number;
  showShare?: boolean;
  rightSlot?: React.ReactNode;
}

export function InGameTopBar({
  gameName, balance, onBack, onAddBalance, onShowWallet, winAmount, rank, showShare, rightSlot,
}: InGameTopBarProps) {
  const { settings, membership, formatPc, shareWin } = useGlobalGame();
  const [showOptions, setShowOptions] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [showTV, setShowTV] = useState(false);
  const [tvExpanded, setTvExpanded] = useState(false);

  let avatarDef: AvatarDef = ALL_AVATARS[0];
  try { avatarDef = JSON.parse(settings.avatarDef); } catch {}

  const handleShare = () => {
    shareWin(gameName, winAmount || 0, rank ? `Rank #${rank}` : undefined);
  };

  return (
    <>
      <nav style={{
        background: 'rgba(6,6,6,0.97)', borderBottom: '1px solid rgba(212,175,55,0.2)',
        flexShrink: 0, zIndex: 100,
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* $Pc Casino Logo */}
          <button
            onClick={onBack}
            title="Back to Lobby"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, flexShrink: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <img src="/logos/pc-logo.png" alt="$Pc Casino" style={{ width: 26, height: 26, borderRadius: '50%' }} />
          </button>

          {/* Back arrow */}
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, transition: 'all 0.2s', letterSpacing: '0.04em' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
            <ArrowLeft size={12} />
            <span>LOBBY</span>
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          {/* Game name + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <AvatarSprite avatar={avatarDef} size={28} style={{ borderRadius: 0 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, color: '#D4AF37', fontSize: 12, letterSpacing: '0.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gameName.toUpperCase()}</div>
              <div style={{ fontSize: 9, color: '#374151', whiteSpace: 'nowrap' }}>{settings.displayName}</div>
            </div>
          </div>

          {membership.isMember && (
            <div style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', fontSize: 9, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.08em', flexShrink: 0 }}>
              ★ MEMBER
            </div>
          )}

          <div style={{ flex: 1 }} />

          {rightSlot}

          {/* Balance pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 10, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', flexShrink: 0 }}>
            <img src="/logos/pc-logo.png" alt="" style={{ width: 14, height: 14 }} />
            <span style={{ fontWeight: 700, color: '#D4AF37', fontSize: 12 }}>{formatPc(balance)}</span>
            <span style={{ fontSize: 9, color: '#4b5563' }}>$Pc</span>
          </div>

          {/* Wallet quick-access */}
          {onShowWallet && (
            <button
              onClick={onShowWallet}
              title="Wallet — Deposit / Withdraw"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer', color: '#D4AF37', fontSize: 11, fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
            >
              <Wallet size={13} />
            </button>
          )}

          {onAddBalance && (
            <button onClick={() => setShowBuy(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(30,136,229,0.12)', border: '1px solid rgba(30,136,229,0.3)', cursor: 'pointer', color: '#42A5F5', fontSize: 11, fontWeight: 700, transition: 'all 0.2s', flexShrink: 0,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,136,229,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,136,229,0.12)'; }}>
              <Zap size={12} /> TOP UP
            </button>
          )}

          {membership.isMember && settings.vappTVEnabled && (
            <button
              onClick={() => setShowTV(t => !t)}
              style={{ padding: '5px 8px', borderRadius: 8, background: showTV ? 'rgba(156,39,176,0.25)' : 'rgba(156,39,176,0.12)', border: `1px solid ${showTV ? 'rgba(156,39,176,0.6)' : 'rgba(156,39,176,0.3)'}`, cursor: 'pointer', color: '#CE93D8', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', flexShrink: 0 }}>
              <Tv size={12} /> {showTV ? 'HIDE TV' : 'VAPPTV'}
            </button>
          )}

          {showShare && (
            <button onClick={handleShare} style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, transition: 'all 0.2s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              <Share2 size={12} /> SHARE WIN
            </button>
          )}

          <button onClick={() => setShowOptions(true)} style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}>
            <Settings size={14} />
          </button>
        </div>
      </nav>

      {showTV && membership.isMember && (
        <div style={{
          position: 'fixed',
          bottom: 24, right: 24, zIndex: 9990,
          width: tvExpanded ? 480 : 280,
          height: tvExpanded ? 270 : 158,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1.5px solid rgba(156,39,176,0.5)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(156,39,176,0.15)',
          background: '#000',
          transition: 'width 0.3s, height 0.3s',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', zIndex: 1, borderBottom: '1px solid rgba(156,39,176,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tv size={10} color="#CE93D8" />
              <span style={{ fontSize: 9, color: '#CE93D8', fontWeight: 700, letterSpacing: '0.1em' }}>VAPPTV LIVE</span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CE93D8', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setTvExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                {tvExpanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
              </button>
              <button onClick={() => setShowTV(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                <X size={10} />
              </button>
            </div>
          </div>
          <iframe
            src="https://vapptv.com"
            style={{ width: '100%', height: '100%', border: 'none', paddingTop: 28 }}
            title="VappTV"
            allow="autoplay; fullscreen"
          />
        </div>
      )}

      <InGameOptionsPanel isOpen={showOptions} onClose={() => setShowOptions(false)} isMember={membership.isMember} />

      {onAddBalance && (
        <InGameQuickBuy
          isOpen={showBuy}
          onClose={() => setShowBuy(false)}
          onAddBalance={amount => { onAddBalance(amount); setShowBuy(false); }}
          currentBalance={balance}
        />
      )}
    </>
  );
}
