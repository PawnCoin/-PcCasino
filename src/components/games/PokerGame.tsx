import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, RotateCcw, Mic, MicOff, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createDeck, shuffleDeck, evaluatePokerHand } from '@/hooks/useGameEngine';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { usePokerVoice } from '@/hooks/useGameVoice';
import { PokerChip, ChipSelector } from '@/components/PokerChip';
import { AvatarSprite, getAvatarStyle, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { PokerHandAnalyzer } from '@/components/PokerHandAnalyzer';
import { PlayingCard } from '@/components/PlayingCard';
import { CasinoEnvironment } from '@/components/games/CasinoEnvironment';
import { InGameTopBar } from '@/components/InGameTopBar';
import type { Card } from '@/types';

interface PokerGameProps {
  balance: number;
  onBack: () => void;
  onBet: (amount: number) => boolean;
  onWin: (amount: number) => void;
  onAddBalance?: (amount: number) => void;
  cardBackStyle?: { type: 'css'; style: React.CSSProperties } | { type: 'image'; image: string };
}

const CHIP_VALUES = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 500_000_000];

const handRankings: Record<string, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_of_a_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_of_a_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  pair: 'Pair',
  high_card: 'High Card',
};

const DEALER_ROSTER = [
  { name: 'Marcus Vega', avatarIdx: 6 },
  { name: 'Sophia Lane', avatarIdx: 9 },
  { name: 'Victor Noir', avatarIdx: 12 },
  { name: 'Diana Cole', avatarIdx: 15 },
  { name: 'Lorenzo King', avatarIdx: 18 },
  { name: 'Bianca Rush', avatarIdx: 21 },
  { name: 'Rafael Stone', avatarIdx: 24 },
  { name: 'Celeste Hart', avatarIdx: 27 },
  { name: 'Anton Cruz', avatarIdx: 30 },
  { name: 'Vivienne Bell', avatarIdx: 33 },
];


function AnimatedChipFly({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 100;
    const endX = window.innerWidth / 2;
    const endY = window.innerHeight / 2 - 50;
    setPosition({ x: startX, y: startY });
    const duration = 400;
    const startTime = Date.now();
    let lastTrailTime = 0;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newX = startX + (endX - startX) * easeOut;
      const newY = startY + (endY - startY) * easeOut;
      setPosition({ x: newX, y: newY });
      if (elapsed - lastTrailTime > 30 && progress < 0.85) {
        lastTrailTime = elapsed;
        trailIdRef.current += 1;
        setTrail(prev => [...prev.slice(-8), { x: newX, y: newY, id: trailIdRef.current }]);
      }
      if (progress < 0.5) setScale(1 + Math.sin(progress * Math.PI) * 0.3);
      else setScale(1);
      if (progress >= 0.9) setOpacity(1 - (progress - 0.9) * 10);
      if (progress < 1) requestAnimationFrame(animate);
      else onComplete();
    };
    requestAnimationFrame(animate);
  }, [onComplete]);

  const chipColors: Record<number, string> = {
    5: 'from-red-500 to-red-700',
    10: 'from-blue-500 to-blue-700',
    25: 'from-green-500 to-green-700',
    50: 'from-orange-500 to-orange-700',
    100: 'from-gray-800 to-black',
    500: 'from-[#D4AF37] to-[#B8860B]',
  };

  return (
    <>
      {trail.map((t, i) => (
        <div
          key={t.id}
          className="fixed z-49 rounded-full pointer-events-none"
          style={{
            left: t.x, top: t.y, width: `${6 + i}px`, height: `${6 + i}px`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(212,175,55,${0.3 + i * 0.05}), transparent)`,
            animation: 'pokerTrailFade 0.4s ease-out forwards',
          }}
        />
      ))}
      <div
        className={`fixed z-50 w-12 h-12 rounded-full bg-gradient-to-br ${chipColors[amount] || chipColors[5]} border-2 border-white/30 flex flex-col items-center justify-center pointer-events-none`}
        style={{
          left: position.x, top: position.y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity,
          boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
        }}
      >
        <div className="absolute inset-2 rounded-full border border-dashed border-white/40" />
        <span className="text-[7px] font-bold text-white/80">$Pc</span>
        <span className="text-[9px] font-bold text-white">{amount}</span>
      </div>
    </>
  );
}

function PotChipStack({ pot }: { pot: number }) {
  const chipBreakdown = [];
  let remaining = pot;
  for (const denom of [500, 100, 50, 25, 10, 5]) {
    const count = Math.floor(remaining / denom);
    if (count > 0) { chipBreakdown.push({ amount: denom, count: Math.min(count, 3) }); remaining -= denom * count; }
  }
  const chipColors: Record<number, string> = { 5: '#ef4444', 10: '#3b82f6', 25: '#22c55e', 50: '#f97316', 100: '#374151', 500: '#D4AF37' };
  return (
    <div className="flex items-end justify-center gap-1">
      {chipBreakdown.slice(0, 4).map((chip, stackIdx) => (
        <div key={stackIdx} className="relative flex flex-col-reverse items-center">
          {Array.from({ length: chip.count }, (_, i) => (
            <div key={i} className="premium-chip" style={{
              width: '22px', height: '22px', marginTop: i > 0 ? '-14px' : '0',
              background: `radial-gradient(circle at 35% 35%, ${chipColors[chip.amount]}dd, ${chipColors[chip.amount]}88)`,
              border: '2px solid rgba(255,255,255,0.3)', zIndex: i, fontSize: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
            }}>
              {i === chip.count - 1 ? chip.amount : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DealerSeat({ dealer }: { dealer: { name: string; avatarIdx: number } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(12,8,28,0.97), rgba(22,14,36,0.99))',
        border: '1.5px solid rgba(212,175,55,0.7)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 18px rgba(212,175,55,0.2)',
        minWidth: 140,
      }}>
        <div style={{ width: 54, height: 62, flexShrink: 0, overflow: 'hidden', borderRight: '1px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212,175,55,0.06)' }}>
          <AvatarSprite avatar={ALL_AVATARS[dealer.avatarIdx % ALL_AVATARS.length]} size={54} style={{ borderRadius: 0 }} />
        </div>
        <div style={{ padding: '6px 10px', flex: 1 }}>
          <div style={{ fontSize: 8, color: '#D4AF37', letterSpacing: '0.2em', fontWeight: 800, textTransform: 'uppercase' }}>♠ Dealer</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 2, whiteSpace: 'nowrap' }}>{dealer.name}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(212,175,55,0.55)', marginTop: 2, letterSpacing: '0.1em' }}>$Pc Casino</div>
        </div>
      </div>
    </div>
  );
}

/* ── Player info box (matches reference panel style) ── */
interface OpponentData {
  id: number;
  name: string;
  balance: number;
  bet: number;
  active: boolean;
  position: string;
  avatarIdx: number;
}

function OpponentSeat({
  opponent,
  cardBackStyle,
  cardDirection = 'up',
}: {
  opponent: OpponentData;
  cardBackStyle?: PokerGameProps['cardBackStyle'];
  cardDirection?: 'up' | 'left' | 'right' | 'down';
}) {
  if (!opponent.active) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1.5px dashed rgba(212,175,55,0.3)',
        borderRadius: 10,
        padding: '8px 14px',
        textAlign: 'center',
        minWidth: 90,
      }}>
        <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.6)', letterSpacing: '0.15em', fontWeight: 700 }}>SEAT {opponent.id}</div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Sit Here</div>
      </div>
    );
  }

  const cards = (
    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
      <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
      <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
    </div>
  );

  const isLeft = cardDirection === 'left';
  const isRight = cardDirection === 'right';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* cards above for top seats */}
      {cardDirection === 'up' && (
        <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
          <PlayingCard hidden size="sm" cardBackStyle={cardBackStyle} />
        </div>
      )}

      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        background: 'rgba(10,10,18,0.88)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        minWidth: 140,
      }}>
        {/* cards left for left-side seats */}
        {isLeft && <div style={{ marginRight: 4, marginLeft: 4 }}>{cards}</div>}

        {/* avatar */}
        <div style={{
          width: 52, height: 60, flexShrink: 0, overflow: 'hidden',
          borderRight: isLeft ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderLeft: isLeft ? '1px solid rgba(255,255,255,0.08)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AvatarSprite avatar={ALL_AVATARS[opponent.avatarIdx % ALL_AVATARS.length]} size={52} style={{ borderRadius: 0 }} />
        </div>

        {/* name & balance */}
        <div style={{ padding: '6px 10px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{opponent.name}</div>
          <div style={{ fontSize: 11, color: '#43A047', fontWeight: 700, marginTop: 2 }}>
            {opponent.balance.toLocaleString()}
          </div>
          {opponent.position && (
            <div style={{
              marginTop: 3, display: 'inline-block',
              padding: '1px 6px', borderRadius: 4,
              background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)',
              fontSize: 8, color: '#D4AF37', fontWeight: 700,
            }}>{opponent.position}</div>
          )}
        </div>

        {/* cards right for right-side seats */}
        {isRight && <div style={{ marginRight: 6, marginLeft: 2 }}>{cards}</div>}
      </div>

      {/* bet chip */}
      {opponent.bet > 0 && (
        <div style={{ marginTop: 2 }}>
          <PokerChip amount={opponent.bet} size="sm" />
        </div>
      )}
    </div>
  );
}

/* ── User seat at bottom ── */
function UserSeat({
  balance, playerBet, playerHand, showdownWinner, userAvatar, onAvatarChange,
}: {
  balance: number; playerBet: number; playerHand: Card[];
  showdownWinner?: 'player' | 'opponent' | null; userAvatar: string | null;
  onAvatarChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDef, setSelectedDef] = useState<AvatarDef>(ALL_AVATARS[0]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) { onAvatarChange(ev.target.result as string); setPickerOpen(false); } };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>

      {/* avatar picker popup */}
      {pickerOpen && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,18,0.97)', border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: 12, padding: 12, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          minWidth: 260,
        }}>
          <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>CHOOSE YOUR AVATAR</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 }}>
            {ALL_AVATARS.slice(0, 24).map((av, i) => (
              <div
                key={i}
                onClick={() => { setSelectedDef(av); onAvatarChange(''); setPickerOpen(false); }}
                style={{
                  cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
                  border: (selectedDef === av && !userAvatar) ? '2px solid #D4AF37' : '2px solid transparent',
                  transition: 'border-color 0.15s',
                }}
              >
                <AvatarSprite avatar={av} size={36} style={{ borderRadius: 0 }} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, textAlign: 'center' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 10, color: '#9ca3af', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
            >
              📷 Upload photo instead
            </button>
          </div>
        </div>
      )}

      {/* hole cards */}
      <div style={{ display: 'flex', gap: 10 }}>
        {playerHand.map((card, i) => (
          <div key={i} style={{ filter: showdownWinner === 'player' ? 'drop-shadow(0 0 14px rgba(212,175,55,0.7))' : undefined }}>
            <PlayingCard card={card} size="xl" />
          </div>
        ))}
      </div>

      {/* player info box */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        background: showdownWinner === 'player' ? 'rgba(212,175,55,0.15)' : 'rgba(10,10,18,0.92)',
        border: showdownWinner === 'player' ? '1.5px solid rgba(212,175,55,0.8)' : '1.5px solid rgba(255,255,255,0.18)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: showdownWinner === 'player' ? '0 0 20px rgba(212,175,55,0.35)' : '0 4px 16px rgba(0,0,0,0.6)',
        minWidth: 160,
      }}>
        {/* avatar — click to open picker */}
        <div
          style={{ width: 56, height: 64, flexShrink: 0, position: 'relative', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPickerOpen(p => !p)}
          title="Click to choose avatar"
        >
          {userAvatar
            ? <div style={{ width: 56, height: 64, backgroundImage: `url(${userAvatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            : <AvatarSprite avatar={selectedDef} size={56} style={{ borderRadius: 0 }} />
          }
          <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(212,175,55,0.85)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera style={{ width: 9, height: 9, color: '#000' }} />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        {/* info */}
        <div style={{ padding: '6px 12px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: showdownWinner === 'player' ? '#D4AF37' : '#fff' }}>You</div>
          <div style={{ fontSize: 11, color: '#43A047', fontWeight: 700, marginTop: 2 }}>{balance.toLocaleString()}</div>
          {playerBet > 0 && <div style={{ fontSize: 9, color: '#D4AF37', marginTop: 2 }}>{playerBet} $Pc bet</div>}
        </div>
      </div>
    </div>
  );
}

export function PokerGame({ balance, onBack, onBet, onWin, onAddBalance, cardBackStyle }: PokerGameProps) {
  const [gamePhase, setGamePhase] = useState<'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('waiting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [revealedCommunity, setRevealedCommunity] = useState(0);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [playerBet, setPlayerBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState(25);
  const [showRules, setShowRules] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(true);
  const [showVoice, setShowVoice] = useState(true);
  const [message, setMessage] = useState("Welcome to Texas Hold'em!");
  const [playerChips, setPlayerChips] = useState<{ amount: number; count: number }[]>([]);
  const [flyingChips, setFlyingChips] = useState<number[]>([]);
  const [winEffect, setWinEffect] = useState(false);
  const [loseEffect, setLoseEffect] = useState(false);
  const [winText, setWinText] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [potSweepToUser, setPotSweepToUser] = useState(false);
  const [dealer, setDealer] = useState(DEALER_ROSTER[0]);
  const [opponents, setOpponents] = useState<OpponentData[]>([
    { id: 1, name: 'Taylor', balance: 1540, bet: 0, active: true, position: 'BB', avatarIdx: 1 },
    { id: 2, name: '', balance: 0, bet: 0, active: false, position: '', avatarIdx: 0 },
    { id: 3, name: 'Morgan', balance: 2475, bet: 0, active: true, position: '', avatarIdx: 3 },
    { id: 4, name: 'Jordan', balance: 2500, bet: 0, active: true, position: 'SB', avatarIdx: 4 },
    { id: 5, name: 'Riley', balance: 3883, bet: 0, active: true, position: '', avatarIdx: 5 },
    { id: 6, name: 'Casey', balance: 1190, bet: 0, active: true, position: '', avatarIdx: 2 },
    { id: 7, name: '', balance: 0, bet: 0, active: false, position: '', avatarIdx: 7 },
    { id: 8, name: '', balance: 0, bet: 0, active: false, position: '', avatarIdx: 8 },
  ]);

  const [showdownData, setShowdownData] = useState<{
    winner: 'player' | 'opponent';
    handName: string;
    winAmount: number;
    opponentName?: string;
    opponentCards?: Card[];
    playerCards?: Card[];
  } | null>(null);
  const [showdownTimer, setShowdownTimer] = useState(0);

  const { isMuted, toggleMute, playSound } = useSoundEffects();
  const { announceEvent, stop, isSupported: voiceSupported } = usePokerVoice();
  const chipAreaRef = useRef<HTMLDivElement>(null);

  const startNewHand = useCallback(() => {
    setDealer(DEALER_ROSTER[Math.floor(Math.random() * DEALER_ROSTER.length)]);
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[1]];
    const newOpponents = opponents.map((opp, idx) => ({
      ...opp, bet: 0,
      active: opp.name !== '' ? (idx < 4 || Math.random() > 0.3) : false,
    }));
    setDeck(newDeck.slice(8));
    setPlayerHand(playerCards);
    setCommunityCards([]);
    setRevealedCommunity(0);
    setPot(60);
    setCurrentBet(20);
    setPlayerBet(20);
    setPlayerChips([{ amount: 20, count: 1 }]);
    setOpponents(newOpponents.map(o => ({ ...o, bet: o.active ? 20 : 0 })));
    setGamePhase('preflop');
    setMessage("Pre-flop: Your turn. Call, raise, or fold?");
    setWinEffect(false);
    setLoseEffect(false);
    setWinText('');
    if (showVoice) announceEvent('New hand. Pre-flop betting.');
  }, [opponents, showVoice, announceEvent]);

  const dealCommunity = useCallback((count: number) => {
    const newCards = deck.slice(0, count);
    setCommunityCards(prev => [...prev, ...newCards]);
    setDeck(prev => prev.slice(count));
    setTimeout(() => setRevealedCommunity(prev => prev + count), 100);
  }, [deck]);

  const animateChip = (amount: number) => {
    setFlyingChips(prev => [...prev, amount]);
    playSound('chip');
    setTimeout(() => setFlyingChips(prev => prev.filter(a => a !== amount)), 500);
  };

  const placeBet = (amount: number) => {
    if (!onBet(amount)) { setMessage('Insufficient balance!'); playSound('error'); return false; }
    animateChip(amount);
    const existing = playerChips.find(c => c.amount === amount);
    if (existing) setPlayerChips(playerChips.map(c => c.amount === amount ? { ...c, count: c.count + 1 } : c));
    else setPlayerChips([...playerChips, { amount, count: 1 }]);
    setPot(prev => prev + amount);
    setPlayerBet(prev => prev + amount);
    return true;
  };

  const handleFold = () => {
    setMessage('You folded. Starting new hand...');
    playSound('clear');
    if (showVoice) announceEvent('You folded.');
    setPlayerChips([]);
    setTimeout(startNewHand, 2000);
  };

  const handleCheck = () => {
    setMessage('You checked.');
    playSound('click');
    if (showVoice) announceEvent('You checked.');
    advancePhase();
  };

  const handleCall = () => {
    const callAmount = currentBet - playerBet;
    if (placeBet(callAmount)) {
      setMessage(`You called ${callAmount} $Pc`);
      if (showVoice) announceEvent(`You called ${callAmount}.`);
      advancePhase();
    }
  };

  const handleRaise = () => {
    const raiseAmount = selectedChip;
    const totalNeeded = (currentBet - playerBet) + raiseAmount;
    if (placeBet(totalNeeded)) {
      setCurrentBet(playerBet + raiseAmount);
      setMessage(`You raised to ${playerBet + raiseAmount} $Pc`);
      if (showVoice) announceEvent(`You raised to ${playerBet + raiseAmount}.`);
      advancePhase();
    }
  };

  const handleAllIn = () => {
    const allInAmount = balance;
    if (placeBet(allInAmount)) {
      setCurrentBet(playerBet);
      setMessage('ALL IN!');
      playSound('win');
      if (showVoice) announceEvent('All in!');
      advancePhase();
    }
  };

  const advancePhase = () => {
    setTimeout(() => {
      switch (gamePhase) {
        case 'preflop':
          dealCommunity(3); setGamePhase('flop'); setCurrentBet(0); setPlayerBet(0);
          setPlayerChips([]); setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setMessage('The Flop. Check or bet?');
          if (showVoice) announceEvent('The flop.');
          break;
        case 'flop':
          dealCommunity(1); setGamePhase('turn'); setCurrentBet(0); setPlayerBet(0);
          setPlayerChips([]); setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setMessage('The Turn. Check or bet?');
          if (showVoice) announceEvent('The turn.');
          break;
        case 'turn':
          dealCommunity(1); setGamePhase('river'); setCurrentBet(0); setPlayerBet(0);
          setPlayerChips([]); setOpponents(prev => prev.map(o => ({ ...o, bet: 0 })));
          setMessage('The River. Final betting round.');
          if (showVoice) announceEvent('The river.');
          break;
        case 'river':
          setGamePhase('showdown'); resolveHand();
          break;
      }
    }, 500);
  };

  const resolveHand = () => {
    const allCards = [...playerHand, ...communityCards];
    const result = evaluatePokerHand(allCards);
    const playerWins = Math.random() > 0.6;
    const handName = handRankings[result.hand];
    const oppCards: Card[] = [
      deck[0] || { rank: 'K', suit: 'spades' },
      deck[1] || { rank: 'Q', suit: 'hearts' },
    ];
    if (playerWins) {
      const winAmount = pot;
      onWin(winAmount);
      setWinEffect(true);
      setPotSweepToUser(true);
      setTimeout(() => setPotSweepToUser(false), 1200);
      setWinText(`${handName} — ${winAmount} $Pc!`);
      setMessage(`YOU WIN! ${handName}`);
      playSound('win');
      if (showVoice) announceEvent(`Winner. You won ${winAmount} with ${handName}.`);
      setShowdownData({ winner: 'player', handName, winAmount, opponentCards: oppCards, playerCards: playerHand });
    } else {
      setLoseEffect(true);
      const winnerIdx = Math.floor(Math.random() * 5);
      const opponentName = opponents[winnerIdx]?.name || 'Taylor';
      setMessage(`${opponentName} wins with ${handName}`);
      playSound('lose');
      if (showVoice) announceEvent(`${opponentName} wins with ${handName}.`);
      setShowdownData({ winner: 'opponent', handName, winAmount: pot, opponentName, opponentCards: oppCards });
    }
    setShowdownTimer(4);
    const countdown = setInterval(() => {
      setShowdownTimer(prev => {
        if (prev <= 1) { clearInterval(countdown); setPlayerChips([]); setShowdownData(null); startNewHand(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const clearBet = () => {
    const total = playerChips.reduce((sum, c) => sum + c.amount * c.count, 0);
    if (total > 0) { onWin(total); setPlayerChips([]); setPlayerBet(0); setMessage('Bet cleared'); playSound('clear'); }
  };

  useEffect(() => { startNewHand(); return () => stop(); }, []);

  const getPhaseLabel = () => {
    switch (gamePhase) {
      case 'preflop': return 'PRE-FLOP';
      case 'flop': return 'THE FLOP';
      case 'turn': return 'THE TURN';
      case 'river': return 'THE RIVER';
      case 'showdown': return 'SHOWDOWN';
      default: return '';
    }
  };

  /* 9-seat layout: 8 opponents around oval + user at bottom center */
  const seatPositions: { style: React.CSSProperties; dir: 'up' | 'left' | 'right' | 'down'; betOffset: { x: number; y: number } }[] = [
    // seat 0 → top-left
    { style: { top: '2%', left: '18%', transform: 'translateX(-50%)' }, dir: 'up', betOffset: { x: -65, y: -55 } },
    // seat 1 → top-center
    { style: { top: '0%', left: '50%', transform: 'translateX(-50%)' }, dir: 'up', betOffset: { x: 0, y: -62 } },
    // seat 2 → top-right
    { style: { top: '2%', right: '18%', transform: 'translateX(50%)' }, dir: 'up', betOffset: { x: 65, y: -55 } },
    // seat 3 → right upper
    { style: { top: '20%', right: '-4px' }, dir: 'left', betOffset: { x: 80, y: -15 } },
    // seat 4 → right lower
    { style: { top: '52%', right: '-4px' }, dir: 'left', betOffset: { x: 80, y: 15 } },
    // seat 5 → bottom-right
    { style: { bottom: '4%', right: '14%' }, dir: 'up', betOffset: { x: 52, y: 52 } },
    // seat 6 → bottom-left
    { style: { bottom: '4%', left: '14%' }, dir: 'up', betOffset: { x: -52, y: 52 } },
    // seat 7 → left side
    { style: { top: '36%', left: '-4px' }, dir: 'right', betOffset: { x: -80, y: 0 } },
  ];

  return (
    <CasinoEnvironment gameType="poker">
      <div className="h-screen bg-[#0a0a0a] relative flex flex-col overflow-hidden">
        <style>{`
          @keyframes pokerTrailFade { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(0.3)} }
          @keyframes pokerPotGlow { 0%,100%{box-shadow:0 0 20px rgba(212,175,55,0.3),0 0 40px rgba(212,175,55,0.1)} 50%{box-shadow:0 0 30px rgba(212,175,55,0.5),0 0 60px rgba(212,175,55,0.2)} }
          @keyframes pokerMetallicShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
          @keyframes pokerCommunityReveal {
            0%{transform:perspective(800px) translateX(120px) rotateY(-90deg) scale(0.6);opacity:0;filter:blur(3px)}
            50%{transform:perspective(800px) translateX(10px) rotateY(-20deg) scale(1.05);opacity:1;filter:blur(0)}
            100%{transform:perspective(800px) translateX(0) rotateY(0deg) scale(1);opacity:1;filter:blur(0)}
          }
          @keyframes pokerWinPulse {
            0%{box-shadow:inset 0 0 60px rgba(34,197,94,0),0 0 0 0 rgba(212,175,55,0)}
            30%{box-shadow:inset 0 0 100px rgba(34,197,94,0.25),0 0 40px 10px rgba(212,175,55,0.3)}
            60%{box-shadow:inset 0 0 60px rgba(34,197,94,0.1),0 0 80px 20px rgba(212,175,55,0.15)}
            100%{box-shadow:inset 0 0 60px rgba(34,197,94,0),0 0 0 0 rgba(212,175,55,0)}
          }
          @keyframes pokerLoseShake {
            0%,100%{transform:translateX(0)} 10%{transform:translateX(-6px) rotate(-0.5deg)} 20%{transform:translateX(6px) rotate(0.5deg)}
            30%{transform:translateX(-4px) rotate(-0.3deg)} 40%{transform:translateX(4px) rotate(0.3deg)} 50%{transform:translateX(-2px)} 60%{transform:translateX(2px)}
          }
          @keyframes pokerWinTextAppear {
            0%{transform:translate(-50%,-50%) scale(0.3);opacity:0} 40%{transform:translate(-50%,-50%) scale(1.2);opacity:1}
            60%{transform:translate(-50%,-50%) scale(0.95)} 100%{transform:translate(-50%,-50%) scale(1);opacity:1}
          }
          @keyframes pokerGoldRing {
            0%{transform:translate(-50%,-50%) scale(0.3);opacity:1;border-width:4px} 100%{transform:translate(-50%,-50%) scale(2.5);opacity:0;border-width:1px}
          }
          @keyframes pokerChipsSweep { 0%{transform:translate(-50%,0) scale(1);opacity:1} 100%{transform:translate(-50%,160px) scale(0.3);opacity:0} }
          @keyframes chipToss { 0%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0.4)} 30%{opacity:1} 80%{opacity:0.9;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(0,0) scale(0.6)} }
          @keyframes betChipAppear { 0%{opacity:0;transform:scale(0) translateY(8px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes pokerSpotlight { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
        `}</style>

        {flyingChips.map((amount, i) => (
          <AnimatedChipFly key={`${amount}-${i}-${Date.now()}`} amount={amount} onComplete={() => {}} />
        ))}

        <PokerHandAnalyzer
          holeCards={playerHand}
          communityCards={communityCards}
          isVisible={showAnalyzer && playerHand.length > 0}
        />

        {winEffect && (
          <>
            <div className="fixed inset-0 z-[60] pointer-events-none" style={{ animation: 'pokerWinPulse 1.5s ease-out forwards' }} />
            <div className="fixed z-[61] pointer-events-none rounded-full border-[#D4AF37]" style={{ top: '50%', left: '50%', width: '100px', height: '100px', borderStyle: 'solid', animation: 'pokerGoldRing 1.2s ease-out forwards' }} />
            {winText && (
              <div className="fixed z-[63] pointer-events-none" style={{ top: '40%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'pokerWinTextAppear 0.8s ease-out forwards' }}>
                <div className="text-center">
                  <div className="text-4xl font-casino font-bold mb-2" style={{ background: 'linear-gradient(135deg,#D4AF37,#FFD700,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.8))' }}>WINNER!</div>
                  <div className="text-lg text-white font-bold" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>{winText}</div>
                </div>
              </div>
            )}
          </>
        )}

        {loseEffect && (
          <div className="fixed inset-0 z-[60] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center,rgba(183,28,28,0.15) 0%,transparent 70%)', animation: 'pokerLoseShake 0.6s ease-out' }} />
        )}

        {/* ── NAV ── */}
        <InGameTopBar
          gameName="Texas Hold'em"
          balance={balance}
          onBack={onBack}
          onAddBalance={onAddBalance}
          showShare
          rightSlot={
            <div style={{ display: 'flex', gap: 4 }}>
              {voiceSupported && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setShowVoice(!showVoice)} className={showVoice ? 'text-[#D4AF37]' : 'text-gray-500'}>
                        {showVoice ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{showVoice ? 'Voice ON' : 'Voice OFF'}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowAnalyzer(!showAnalyzer)} className={showAnalyzer ? 'text-[#43A047]' : 'text-gray-500'}>
                      <span className="text-xs font-bold">AI</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{showAnalyzer ? 'Hand analyzer ON' : 'Hand analyzer OFF'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowRules(true)}>
                      <Info className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Poker rules & hand rankings</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        />

        {/* ── MAIN LAYOUT ── */}
        <div className="flex-1 flex flex-col relative z-10" style={{ minHeight: 0 }}>
          {/* TABLE */}
          <div className="flex-1 relative px-6 pt-3 pb-0 min-h-0">
            <div
              className="relative w-full max-w-5xl mx-auto h-full"
              style={{ animation: loseEffect ? 'pokerLoseShake 0.6s ease-out' : undefined }}
            >
              {/* Casino table decorations */}
              <div className="absolute top-[8%] left-[8%] z-[16] pointer-events-none select-none" style={{ opacity: 0.75, fontSize: 22, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🥃</div>
              <div className="absolute top-[8%] right-[8%] z-[16] pointer-events-none select-none" style={{ opacity: 0.7, fontSize: 20, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🚬</div>
              <div className="absolute bottom-[8%] left-[8%] z-[16] pointer-events-none select-none" style={{ opacity: 0.68, fontSize: 20, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🍸</div>
              <div className="absolute bottom-[8%] right-[8%] z-[16] pointer-events-none select-none" style={{ opacity: 0.7, fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🍺</div>

              {/* Wood rail */}
              <div className="absolute inset-0 rounded-[50%/38%]" style={{
                background: 'linear-gradient(180deg,#6D4C2E 0%,#5D4037 20%,#4E342E 50%,#3E2723 80%,#2E1F18 100%)',
                boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.1),inset 0 -4px 8px rgba(0,0,0,0.5),0 8px 40px rgba(0,0,0,0.8),0 0 0 2px rgba(212,175,55,0.4)',
              }} />
              {/* Gold notch rim */}
              <div className="absolute inset-0 rounded-[50%/38%] pointer-events-none" style={{
                background: 'repeating-conic-gradient(from 0deg,transparent 0deg 8deg,rgba(212,175,55,0.15) 8deg 9deg,transparent 9deg 18deg)',
                mask: 'radial-gradient(ellipse at center,transparent 85%,black 90%,black 100%)',
                WebkitMask: 'radial-gradient(ellipse at center,transparent 85%,black 90%,black 100%)',
              }} />

              {/* Green felt */}
              <div className="absolute rounded-[50%/38%]" style={{
                inset: 14,
                background: 'radial-gradient(ellipse at 50% 40%,#2E7D32 0%,#1B5E20 30%,#0D3312 60%,#051a08 100%)',
                boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)',
              }}>
                <div className="absolute inset-0 opacity-50 rounded-[50%/38%]" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg,transparent 0px,rgba(255,255,255,0.015) 1px,transparent 2px,transparent 3px),repeating-linear-gradient(90deg,transparent 0px,rgba(255,255,255,0.01) 1px,transparent 2px,transparent 3px)',
                }} />
                <div className="absolute inset-[5%] border-2 border-dashed border-[#D4AF37]/20 rounded-[50%/38%]" />
                <div className="absolute inset-[4%] rounded-[50%/38%] pointer-events-none" style={{ border: '1.5px solid rgba(212,175,55,0.25)', boxShadow: 'inset 0 0 40px rgba(212,175,55,0.06)' }} />

                {/* Branding */}
                <div className="absolute top-[8%] left-1/2 -translate-x-1/2 pointer-events-none select-none" style={{ fontFamily:"'Cinzel',serif", fontSize:14, letterSpacing:'0.4em', color:'rgba(212,175,55,0.3)', whiteSpace:'nowrap' }}>
                  TEXAS HOLD'EM POKER
                </div>
                <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center gap-2" style={{ opacity:0.15 }}>
                  <img src="/logos/pc-logo.png" alt="" className="w-8 h-8" />
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:18, color:'#D4AF37', letterSpacing:'0.3em' }}>$Pc CASINO</span>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[45%] pointer-events-none rounded-[50%/38%]" style={{ background:'radial-gradient(ellipse at center top,rgba(255,255,220,0.08) 0%,transparent 60%)', animation:'pokerSpotlight 4s ease-in-out infinite' }} />
              </div>

              {/* Phase badge */}
              <div className="absolute top-[2%] left-1/2 -translate-x-1/2 z-[15]">
                <div className="px-5 py-1.5 rounded-full" style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.85) 0%,rgba(20,20,20,0.95) 100%)', border:'1px solid rgba(212,175,55,0.5)', boxShadow:'0 4px 15px rgba(0,0,0,0.5)' }}>
                  <span className="text-[#D4AF37] font-casino text-sm tracking-[0.2em]">{getPhaseLabel()}</span>
                </div>
              </div>

              {/* Table limits */}
              <div className="absolute z-[15] pointer-events-none" style={{ top:'12%', left:'14%', background:'linear-gradient(135deg,rgba(0,0,0,0.95),rgba(20,20,20,0.98))', border:'1px solid rgba(212,175,55,0.6)', borderRadius:6, padding:'5px 10px' }}>
                <div style={{ fontSize:8, color:'#D4AF37', letterSpacing:'0.15em', fontWeight:700 }}>TABLE LIMITS</div>
                <div style={{ fontSize:9, color:'#C0C0C0', marginTop:2 }}>MIN 5 $Pc</div>
                <div style={{ fontSize:9, color:'#C0C0C0' }}>MAX 500 $Pc</div>
              </div>

              {/* (chip tray and card shoe removed) */}
              <div className="absolute z-[15] pointer-events-none" style={{ top:'12%', right:'14%', width:35, height:50, background:'linear-gradient(180deg,#1a1a1a,#0a0a0a)', border:'2px solid rgba(212,175,55,0.5)', borderRadius:4 }}>
                {[3,10,17].map(t => <div key={t} style={{ position:'absolute', top:t, left:4, right:4, height:5, background:'linear-gradient(180deg,#283593,#1a237e)', borderRadius:2 }} />)}
                <div style={{ position:'absolute', bottom:3, left:'50%', transform:'translateX(-50%)', fontSize:6, color:'rgba(212,175,55,0.6)', fontWeight:700 }}>SHOE</div>
              </div>

              {/* Opponent bet chip indicators near the pot */}
              {opponents.map((opp, idx) => {
                const pos = seatPositions[idx];
                if (!pos || !opp.active || opp.bet <= 0) return null;
                const offset = pos.betOffset;
                return (
                  <div key={`bet-${opp.id}`} className="absolute z-[16] pointer-events-none"
                    style={{
                      top: '32%', left: '50%',
                      transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
                      animation: 'betChipAppear 0.3s ease-out forwards',
                    }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#8B6914)', border: '2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,0.5)' }}>
                        {opp.bet >= 1000 ? `${Math.round(opp.bet/1000)}k` : opp.bet}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pot — also a drop target for chips (with large invisible hit area) */}
              <div
                className="absolute top-[14%] left-1/2 -translate-x-1/2 text-center z-[15]"
                style={{ width: 200, paddingTop: 20, paddingBottom: 14 }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const amount = parseInt(e.dataTransfer.getData('chip-amount'), 10);
                  if (amount > 0) placeBet(amount);
                }}
              >
              <div
                className="mx-auto"
                style={{ animation: pot > 0 ? 'pokerPotGlow 2s ease-in-out infinite' : 'none', background:'radial-gradient(ellipse at center,rgba(212,175,55,0.08) 0%,transparent 70%)', borderRadius:20, padding:'6px 20px', minWidth: 80, display:'inline-block' }}
              >
                <div style={{ fontSize:9, color:'#C0C0C0', letterSpacing:'0.3em', fontWeight:700, marginBottom:2 }}>POT</div>
                <div className="text-2xl font-bold text-[#D4AF37] gold-text">{pot.toLocaleString()}</div>
                <div className="text-xs text-[#C0C0C0]">$Pc</div>
                {pot > 0 && (
                  <div className="mt-1 relative" style={{ animation: potSweepToUser ? 'pokerChipsSweep 0.9s ease-in forwards' : undefined }}>
                    <PotChipStack pot={pot} />
                    {potSweepToUser && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37', textShadow: '0 0 10px #D4AF37', whiteSpace: 'nowrap', marginTop: -24 }}>
                          +{pot.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>

              {/* Community cards — larger, centered */}
              <div className="absolute left-1/2 -translate-x-1/2 z-[15] flex gap-3" style={{ top: '46%', transform: 'translate(-50%, -50%)' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ animation: communityCards[i] && i < revealedCommunity ? `pokerCommunityReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.15}s both` : undefined }}>
                    {communityCards[i] ? (
                      <PlayingCard card={communityCards[i]} size="lg" />
                    ) : (
                      <div style={{ width: 70, height: 100, borderRadius: 8, border: '2px dashed rgba(212,175,55,0.2)', background: 'rgba(0,0,0,0.15)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Dealer button */}
              <div className="absolute z-[15]" style={{ bottom: '28%', left: '48%' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f0f0f0,#c0c0c0,#ffffff,#e0e0e0)', border: '2px solid rgba(212,175,55,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1a1a1a', boxShadow: '0 4px 12px rgba(0,0,0,0.6)', animation: 'pokerMetallicShine 4s linear infinite', backgroundSize: '200% 100%' }}>
                  D
                </div>
              </div>

              {/* Opponent seats — seat 1 (top-center) is the dealer position */}
              {opponents.map((opp, idx) => {
                const pos = seatPositions[idx];
                if (!pos) return null;
                if (idx === 1) {
                  return (
                    <div key="dealer-seat" className="absolute z-[20]" style={pos.style}>
                      <DealerSeat dealer={dealer} />
                    </div>
                  );
                }
                return (
                  <div key={opp.id} className="absolute z-[20]" style={pos.style}>
                    <OpponentSeat opponent={opp} cardBackStyle={cardBackStyle} cardDirection={pos.dir} />
                  </div>
                );
              })}

              {/* User seat at 8 o'clock (bottom-left) */}
              <div className="absolute z-[20]" style={{ bottom: '3%', left: '10%' }}>
                <UserSeat
                  balance={balance}
                  playerBet={playerBet}
                  playerHand={playerHand}
                  showdownWinner={showdownData?.winner}
                  userAvatar={userAvatar}
                  onAvatarChange={setUserAvatar}
                />
              </div>

              {/* Showdown overlay */}
              {showdownData && (
                <div className="absolute inset-0 z-[25] flex items-center justify-center pointer-events-none">
                  <div className="text-center px-6 py-4 rounded-2xl" style={{ background: 'radial-gradient(ellipse at center,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.82) 70%,transparent 100%)', minWidth: 360, maxWidth: 480 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 6, fontWeight: 800, color: 'rgba(212,175,55,0.75)' }}>♠ SHOWDOWN ♠</div>
                    <div className="text-2xl font-casino font-bold mb-1" style={{ color: showdownData.winner === 'player' ? '#D4AF37' : '#ef4444', textShadow: showdownData.winner === 'player' ? '0 0 24px rgba(212,175,55,0.7)' : '0 0 24px rgba(239,68,68,0.5)' }}>
                      {showdownData.handName.toUpperCase()}
                    </div>
                    <div className="text-base font-bold mb-4" style={{ color: showdownData.winner === 'player' ? '#43A047' : '#9ca3af' }}>
                      {showdownData.winner === 'player' ? `🏆 YOU WIN ${showdownData.winAmount.toLocaleString()} $Pc!` : `${showdownData.opponentName} wins this hand`}
                    </div>

                    {/* Community cards (board) */}
                    {communityCards.length > 0 && (
                      <div className="mb-3">
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>Board</div>
                        <div className="flex justify-center gap-1.5 items-center">
                          {communityCards.map((c, i) => (
                            <div key={i} style={{ animation: `pokerCommunityReveal 0.45s ease-out ${i * 0.08}s both` }}>
                              <PlayingCard card={c} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent)', marginBottom: 10 }} />

                    {/* Hole cards row: player + opponent side by side */}
                    <div className="flex justify-center gap-6 items-start">
                      {/* Player hole cards */}
                      {showdownData.playerCards && (
                        <div>
                          <div style={{ fontSize: 8, color: showdownData.winner === 'player' ? '#D4AF37' : 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>
                            {showdownData.winner === 'player' ? '★ Your Cards' : 'Your Cards'}
                          </div>
                          <div className="flex justify-center gap-1.5 items-center">
                            {showdownData.playerCards.map((c, i) => (
                              <div key={i} style={{ animation: `pokerCommunityReveal 0.5s ease-out ${i * 0.12 + 0.2}s both`, filter: showdownData.winner === 'player' ? 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' : 'none' }}>
                                <PlayingCard card={c} size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Opponent hole cards */}
                      {showdownData.opponentCards && (
                        <div>
                          <div style={{ fontSize: 8, color: showdownData.winner === 'opponent' ? '#ef4444' : 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>
                            {showdownData.winner === 'opponent' ? `★ ${showdownData.opponentName}` : showdownData.opponentName}
                          </div>
                          <div className="flex justify-center gap-1.5 items-center">
                            {showdownData.opponentCards.map((c, i) => (
                              <div key={i} style={{ animation: `pokerCommunityReveal 0.5s ease-out ${i * 0.12 + 0.35}s both`, filter: showdownData.winner === 'opponent' ? 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' : 'none' }}>
                                <PlayingCard card={c} size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-4">Next hand in {showdownTimer}s</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── STATUS MESSAGE + CHIPS ── */}
          <div className="relative z-20 px-4 py-2" style={{ background: 'linear-gradient(180deg,rgba(10,10,10,0.95) 0%,rgba(5,5,5,0.98) 100%)', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="max-w-4xl mx-auto">
              {message && (
                <div className="text-center mb-2">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'linear-gradient(135deg,rgba(0,0,0,0.9),rgba(20,15,10,0.95))', color: '#fff', border: '1px solid rgba(212,175,55,0.3)', textShadow: '0 0 8px rgba(212,175,55,0.4)' }}>
                    {message}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cash</span>
                    <span className="text-sm font-bold text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bet</span>
                    <span className="text-sm font-bold text-[#D4AF37]">{playerBet.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                  </div>
                  {winEffect && (
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Win</span>
                      <span className="text-sm font-bold text-[#43A047]">{pot.toLocaleString('en-US', { minimumFractionDigits: 2 })} $Pc</span>
                    </div>
                  )}
                </div>

                <div ref={chipAreaRef}>
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelect={setSelectedChip}
                    onDoubleClick={(amount) => placeBet(amount)}
                    balance={balance}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={{ background: 'linear-gradient(180deg,rgba(15,15,15,0.98),rgba(5,5,5,1))', borderTop: '2px solid rgba(212,175,55,0.3)', boxShadow: '0 -4px 20px rgba(0,0,0,0.6)' }}>
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex justify-center gap-3">
                {gamePhase === 'showdown' ? (
                  <span className="text-gray-400 text-sm">Next hand in {showdownTimer}s...</span>
                ) : (
                  <>
                    <Button onClick={handleFold} variant="destructive" className="px-6 py-3 rounded-lg font-bold text-sm bg-[#B71C1C] hover:bg-[#8B0000]" style={{ boxShadow: '0 3px 10px rgba(183,28,28,0.4)' }}>
                      FOLD
                    </Button>
                    {currentBet === 0 || playerBet >= currentBet ? (
                      <Button onClick={handleCheck} className="px-6 py-3 rounded-lg font-bold text-sm bg-[#1E88E5] hover:bg-[#1565C0]" style={{ boxShadow: '0 3px 10px rgba(30,136,229,0.4)' }}>
                        CHECK
                      </Button>
                    ) : (
                      <Button onClick={handleCall} className="px-6 py-3 rounded-lg font-bold text-sm bg-[#43A047] hover:bg-[#2E7D32]" style={{ boxShadow: '0 3px 10px rgba(67,160,71,0.4)' }}>
                        CALL ({currentBet - playerBet})
                      </Button>
                    )}
                    <Button onClick={handleRaise} className="px-6 py-3 rounded-lg font-bold text-sm bg-[#D4AF37] hover:bg-[#B8860B] text-black" style={{ boxShadow: '0 3px 10px rgba(212,175,55,0.4)' }}>
                      RAISE +{selectedChip}
                    </Button>
                    <Button onClick={handleAllIn} className="px-6 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-[#8B0000] to-[#B71C1C]" style={{ boxShadow: '0 3px 10px rgba(139,0,0,0.4)' }}>
                      ALL IN
                    </Button>
                    {playerChips.length > 0 && (
                      <Button onClick={clearBet} variant="outline" className="px-3 py-3 rounded-lg border-[#5D4037] text-[#C0C0C0]">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rules dialog */}
        <Dialog open={showRules} onOpenChange={setShowRules}>
          <DialogContent className="max-w-2xl glass-panel-strong max-h-[80vh] overflow-y-auto border-[#5D4037]/30">
            <DialogHeader>
              <DialogTitle className="font-casino text-2xl text-gradient-gold">Texas Hold'em Rules</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Hand Rankings (Best to Worst)</h3>
                <div className="grid grid-cols-1 gap-1 text-gray-300">
                  {['Royal Flush - A♦ K♦ Q♦ J♦ 10♦','Straight Flush - Five in a row, same suit','Four of a Kind - Four same rank','Full House - Three of a kind + pair','Flush - All five same suit','Straight - Five in order mixed suits','Three of a Kind','Two Pair','One Pair','High Card'].map((hand, i) => (
                    <div key={i} className="flex items-start gap-2 p-1 rounded hover:bg-white/5">
                      <span className="text-[#D4AF37] font-bold w-6">{i + 1}.</span>
                      <span>{hand}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Betting Actions</h3>
                <ul className="space-y-1 text-gray-300">
                  {["Check - Stay in, don't bet","Bet - Put chips into the pot","Call - Match another player's bet","Raise - Increase the current bet","Fold - Give up your hand","All-In - Bet all remaining chips"].map((a, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-[#D4AF37]">•</span>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">Game Flow</h3>
                <ol className="space-y-1 text-gray-300">
                  {['Pre-Flop: Bet after receiving 2 hole cards','The Flop: 3 community cards dealt','The Turn: 4th community card','The River: 5th community card','Showdown: Best 5-card hand wins'].map((s, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-[#D4AF37] font-bold">{i + 1}.</span>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CasinoEnvironment>
  );
}
