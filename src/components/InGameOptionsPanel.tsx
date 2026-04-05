import { useState } from 'react';
import { X, Volume2, VolumeX, User, Palette, Mic, MessageSquare, Bot, Tv, Music } from 'lucide-react';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { useCardDeck, BUILTIN_DECKS } from '@/hooks/useCardDeck';

interface InGameOptionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMember?: boolean;
}

export function InGameOptionsPanel({ isOpen, onClose, isMember }: InGameOptionsPanelProps) {
  const { settings, updateSettings } = useGlobalGame();
  const { selectedDeck, selectDeck } = useCardDeck();
  const [nameInput, setNameInput] = useState(settings.displayName);

  let currentAvatarDef: AvatarDef = ALL_AVATARS[0];
  try { currentAvatarDef = JSON.parse(settings.avatarDef); } catch {}

  if (!isOpen) return null;

  const toggle = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key as keyof typeof settings] });
  };

  const saveName = () => {
    if (nameInput.trim()) updateSettings({ displayName: nameInput.trim() });
  };

  const selectAvatar = (av: AvatarDef) => {
    updateSettings({ avatarDef: JSON.stringify(av) });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: 320, height: '100%',
        background: 'linear-gradient(180deg,#0f0f0f 0%,#080808 100%)',
        borderLeft: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.1em' }}>OPTIONS</div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>Customize your experience</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <section>
            <SectionLabel icon={<User size={12} />} label="PROFILE" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212,175,55,0.08)', borderRadius: 12, border: '1px solid rgba(212,175,55,0.2)', overflow: 'hidden', flexShrink: 0 }}>
                <AvatarSprite avatar={currentAvatarDef} size={48} style={{ borderRadius: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  placeholder="Display name"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13, outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#4b5563', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>CHOOSE AVATAR</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
              {ALL_AVATARS.map((av, i) => {
                const isSelected = currentAvatarDef.sheet === av.sheet && currentAvatarDef.row === av.row && currentAvatarDef.col === av.col;
                return (
                  <button
                    key={i}
                    onClick={() => selectAvatar(av)}
                    style={{
                      width: 38, height: 38, borderRadius: 8, overflow: 'hidden',
                      border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                      background: isSelected ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer', padding: 0, transition: 'border-color 0.15s',
                    }}
                  >
                    <AvatarSprite avatar={av} size={34} style={{ borderRadius: 0 }} />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <SectionLabel icon={<Volume2 size={12} />} label="VOLUME" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <VolumeX size={14} color="#4b5563" />
              <input
                type="range" min={0} max={1} step={0.05}
                value={settings.volumeLevel}
                onChange={e => updateSettings({ volumeLevel: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: '#D4AF37' }}
              />
              <Volume2 size={14} color="#D4AF37" />
              <span style={{ fontSize: 11, color: '#D4AF37', fontWeight: 700, width: 30, textAlign: 'right' }}>
                {Math.round(settings.volumeLevel * 100)}%
              </span>
            </div>
          </section>

          <section>
            <SectionLabel icon={<Music size={12} />} label="AUDIO & DISPLAY" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ToggleRow icon={<Music size={13} />} label="Casino Crowd Sound" sub="Ambient crowd noise" value={settings.casinoSoundEnabled} onChange={() => toggle('casinoSoundEnabled')} />
              <ToggleRow icon={<Mic size={13} />} label="Voice Caller" sub="Spoken ball / dealer calls" value={settings.voiceEnabled} onChange={() => toggle('voiceEnabled')} />
              <ToggleRow icon={<MessageSquare size={13} />} label="On-Screen Text" sub="Captions and tips" value={settings.textEnabled} onChange={() => toggle('textEnabled')} />
              <ToggleRow icon={<Bot size={13} />} label="AI Help" sub="Strategy hints and tips" value={settings.aiHelpEnabled} onChange={() => toggle('aiHelpEnabled')} />
              {isMember && (
                <ToggleRow icon={<Tv size={13} />} label="VappTV Overlay" sub="Watch TV while you play" value={settings.vappTVEnabled} onChange={() => toggle('vappTVEnabled')} />
              )}
            </div>
          </section>

          <section>
            <SectionLabel icon={<Palette size={12} />} label="CARD DECK" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {BUILTIN_DECKS.map(deck => {
                const isSelected = selectedDeck === deck.id;
                return (
                  <button
                    key={deck.id}
                    onClick={() => selectDeck(deck.id)}
                    title={deck.name}
                    style={{
                      border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0,
                      background: isSelected ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                      boxShadow: isSelected ? '0 0 8px rgba(212,175,55,0.4)' : 'none',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}
                  >
                    <div style={{ width: '100%', height: 50, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {deck.image ? (
                        <img src={deck.image} alt={deck.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          background: 'repeating-linear-gradient(45deg,#1a237e 0px,#1a237e 6px,#283593 6px,#283593 12px)',
                        }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: 8, fontWeight: 700, color: isSelected ? '#D4AF37' : '#6b7280',
                      padding: '3px 2px', textAlign: 'center', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis', width: '100%',
                    }}>
                      {deck.name.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ marginTop: 'auto' }}>
            <div style={{ background: isMember ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isMember ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isMember ? '#D4AF37' : '#6b7280', letterSpacing: '0.1em', marginBottom: 4 }}>
                {isMember ? '★ $PC CASINO MEMBER' : 'PLAYER ACCOUNT'}
              </div>
              <div style={{ fontSize: 10, color: '#4b5563', lineHeight: 1.6 }}>
                {isMember
                  ? 'You hold 100M+ $Pc. All features unlocked including VappTV overlay and premium skins.'
                  : 'Hold 100,000,000 $Pc to unlock Casino Membership — VappTV, premium skins & more.'}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
      <span style={{ color: '#4b5563' }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', letterSpacing: '0.2em' }}>{label}</span>
    </div>
  );
}

function ToggleRow({ icon, label, sub, value, onChange }: { icon: React.ReactNode; label: string; sub: string; value: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: value ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${value ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.2s' }}
    >
      <span style={{ color: value ? '#D4AF37' : '#4b5563' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: value ? '#e5e7eb' : '#6b7280' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#374151' }}>{sub}</div>
      </div>
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
        background: value ? 'linear-gradient(135deg,#D4AF37,#B8860B)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 18 : 3, width: 14, height: 14,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      </div>
    </div>
  );
}
