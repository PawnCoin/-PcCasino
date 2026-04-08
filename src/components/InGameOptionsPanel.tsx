import { useState, useRef } from 'react';
import { X, Volume2, VolumeX, User, Palette, Mic, MessageSquare, Bot, Tv, Music, Sparkles, Star, Crown, Gem, Upload, Check, Zap } from 'lucide-react';
import { useGlobalGame } from '@/contexts/GlobalGameContext';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';
import { useCardDeck } from '@/hooks/useCardDeck';
import { useTableSkin, TABLE_SKINS } from '@/hooks/useTableSkin';
import { usePoolBallSkin, POOL_BALL_PRESETS } from '@/hooks/usePoolBallSkin';
import { usePoolCueSkin, CUE_SKINS } from '@/hooks/usePoolCueSkin';
import { useDominoSkin, DOMINO_SKINS } from '@/hooks/useDominoSkin';
import type { SkinKey as DominoSkinKey } from '@/hooks/useDominoSkin';

interface InGameOptionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMember?: boolean;
  activeGame?: string;
}

type Tab = 'settings' | 'table' | 'cards';

const RARITY_CONFIG = {
  common:    { color: '#808080', icon: Star,     label: 'Common' },
  rare:      { color: '#1E88E5', icon: Gem,      label: 'Rare' },
  epic:      { color: '#9C27B0', icon: Sparkles, label: 'Epic' },
  legendary: { color: '#D4AF37', icon: Crown,    label: 'Legendary' },
};

export function InGameOptionsPanel({ isOpen, onClose, isMember, activeGame }: InGameOptionsPanelProps) {
  const { settings, updateSettings } = useGlobalGame();
  const { selectedDeck, selectDeck, allDecks, addCustomDeck } = useCardDeck();
  const { activeSkin, selectSkin } = useTableSkin();
  const { activePreset: activeBallPreset, selectPreset: selectBallPreset } = usePoolBallSkin();
  const { activeCueSkin, selectCueSkin } = usePoolCueSkin();
  const { activeSkinKey: activeDominoKey, selectSkin: selectDominoSkin } = useDominoSkin();
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [nameInput, setNameInput] = useState(settings.displayName);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const name = uploadName.trim() || file.name.replace(/\.[^.]+$/, '');
      addCustomDeck(name, dataUrl);
      setShowUpload(false);
      setUploadName('');
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: 'Settings', icon: <User size={12} /> },
    { id: 'table',    label: 'Table Skins', icon: <Palette size={12} /> },
    { id: 'cards',    label: 'Card & Game Skins', icon: <Sparkles size={12} /> },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: 360, height: '100%',
        background: 'linear-gradient(180deg,#0f0f0f 0%,#080808 100%)',
        borderLeft: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
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

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '10px 4px',
                background: activeTab === tab.id ? 'rgba(212,175,55,0.08)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#D4AF37' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ color: activeTab === tab.id ? '#D4AF37' : '#4b5563' }}>{tab.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: activeTab === tab.id ? '#D4AF37' : '#4b5563', letterSpacing: '0.1em' }}>{tab.label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'settings' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
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
                <SectionLabel icon={<Volume2 size={12} />} label="MASTER VOLUME" />
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
                  <ToggleRow icon={<Sparkles size={13} />} label="Celebrations" sub="Emoji reactions & win bursts" value={settings.celebrationsEnabled} onChange={() => toggle('celebrationsEnabled')} />
                  {isMember ? (
                    <ToggleRow icon={<Tv size={13} />} label="VappTV Overlay" sub="Watch TV while you play" value={settings.vappTVEnabled} onChange={() => toggle('vappTVEnabled')} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6 }}>
                      <span style={{ color: '#4b5563' }}><Tv size={13} /></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>VappTV Overlay</div>
                        <div style={{ fontSize: 10, color: '#374151' }}>Hold 100M $Pc to unlock</div>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>LOCKED</div>
                    </div>
                  )}
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
          )}

          {activeTab === 'table' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <SectionLabel icon={<Palette size={12} />} label="TABLE SKINS" />
                <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12, lineHeight: 1.5 }}>
                  Choose a table surface design. Applied globally to all games and saved across sessions.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {TABLE_SKINS.map(skin => {
                  const isSelected = activeSkin.id === skin.id;
                  const rarity = RARITY_CONFIG[skin.rarity];
                  const RarityIcon = rarity.icon;
                  return (
                    <button
                      key={skin.id}
                      onClick={() => selectSkin(skin.id)}
                      style={{
                        border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                        background: isSelected ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                        boxShadow: isSelected ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
                        transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        height: 56,
                        background: skin.felt,
                        borderBottom: `2px solid ${skin.border}`,
                        position: 'relative', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          width: 40, height: 24, borderRadius: 3,
                          border: `1.5px solid ${skin.line}`,
                          background: 'rgba(255,255,255,0.04)',
                        }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${skin.line}22 10px, ${skin.line}22 11px)`,
                        }} />
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={10} color="#000" />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '6px 8px', textAlign: 'left' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#D4AF37' : '#e5e7eb', marginBottom: 3 }}>{skin.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <RarityIcon size={8} color={rarity.color} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: rarity.color, letterSpacing: '0.05em' }}>{rarity.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'cards' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <SectionLabel icon={<Sparkles size={12} />} label="CARD & GAME SKINS" />
                <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12, lineHeight: 1.5 }}>
                  Choose your card back design. Applied globally to all card games — Poker, Blackjack, Spades.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {allDecks.map(deck => {
                  const isSelected = selectedDeck === deck.id;
                  const rarity = RARITY_CONFIG[deck.rarity];
                  const RarityIcon = rarity.icon;
                  return (
                    <button
                      key={deck.id}
                      onClick={() => selectDeck(deck.id)}
                      style={{
                        border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                        background: isSelected ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                        boxShadow: isSelected ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
                        transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        height: 70, position: 'relative', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#0a0a0a',
                      }}>
                        {deck.image ? (
                          <img src={deck.image} alt={deck.name} style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.6)' }} />
                        ) : (
                          <div style={{
                            width: 44, height: 62, borderRadius: 4,
                            background: 'repeating-linear-gradient(45deg,#1a237e,#1a237e 6px,#283593 6px,#283593 12px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
                          }} />
                        )}
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={10} color="#000" />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '6px 8px', textAlign: 'left' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? '#D4AF37' : '#e5e7eb', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deck.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <RarityIcon size={8} color={rarity.color} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: rarity.color, letterSpacing: '0.05em' }}>{deck.isCustom ? 'Custom' : rarity.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={12} />
                  Upload Custom Card Back
                </div>
                {!showUpload ? (
                  <>
                    <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }}>
                      Upload your own card back image. Up to 3 custom designs.
                    </div>
                    <button
                      onClick={() => setShowUpload(true)}
                      style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Upload size={10} /> Upload Image
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Deck name (optional)"
                      value={uploadName}
                      onChange={e => setUploadName(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 11, outline: 'none', width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => fileRef.current?.click()}
                        style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#000', background: '#D4AF37', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        Choose File
                      </button>
                      <button
                        onClick={() => { setShowUpload(false); setUploadName(''); }}
                        style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    <div style={{ fontSize: 9, color: '#374151' }}>PNG, JPG, WebP — recommended 300×420px</div>
                  </div>
                )}
              </div>

              {activeGame === 'Pool Table' && (
                <>
                  {/* Ball Material */}
                  <div>
                    <SectionLabel icon={<Star size={12} />} label="POOL BALL MATERIAL" />
                    <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12, lineHeight: 1.5 }}>
                      Choose how the balls look on the table. Applied when you start a new game.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {POOL_BALL_PRESETS.map(preset => {
                        const isSelected = activeBallPreset.id === preset.id;
                        const matEmoji = { classic: '🎱', glass: '🔮', metallic: '⚙️', crystal: '💎', frosted: '❄️' }[preset.material] ?? '🎱';
                        return (
                          <button
                            key={preset.id}
                            onClick={() => selectBallPreset(preset.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                              border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                              background: isSelected ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.02)',
                              boxShadow: isSelected ? '0 0 10px rgba(212,175,55,0.2)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{matEmoji}</span>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#D4AF37' : '#e5e7eb' }}>{preset.name}</div>
                              <div style={{ fontSize: 9, color: '#4b5563', textTransform: 'capitalize' }}>{preset.material} finish</div>
                            </div>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {preset.colors.slice(0, 4).map((color, i) => (
                                <div key={i} style={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: color, border: '1px solid rgba(255,255,255,0.1)',
                                }} />
                              ))}
                            </div>
                            {isSelected && <Check size={12} color="#D4AF37" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cue Skins */}
                  <div style={{ marginTop: 16 }}>
                    <SectionLabel icon={<Zap size={12} />} label="CUE STICK SKINS" />
                    <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12, lineHeight: 1.5 }}>
                      Choose your cue stick style. Applied immediately.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {CUE_SKINS.map(cue => {
                        const isSelected = activeCueSkin.id === cue.id;
                        const RarityIcon = RARITY_CONFIG[cue.rarity].icon;
                        return (
                          <button
                            key={cue.id}
                            onClick={() => selectCueSkin(cue.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                              border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                              background: isSelected ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.02)',
                              boxShadow: isSelected ? '0 0 10px rgba(212,175,55,0.2)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            {/* Mini cue preview */}
                            <div style={{ width: 56, height: 10, borderRadius: 2, overflow: 'hidden', flexShrink: 0, display: 'flex' }}>
                              <div style={{ width: '5%', background: cue.tipColor }} />
                              <div style={{ width: '3%', background: '#F0F0F0' }} />
                              <div style={{ width: '54%', background: `linear-gradient(90deg,${cue.shaftLight},${cue.shaftDark},${cue.shaftLight})` }} />
                              <div style={{ width: '10%', background: cue.wrapColor }} />
                              <div style={{ width: '28%', background: `linear-gradient(90deg,${cue.buttLight},${cue.buttDark})` }} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#D4AF37' : '#e5e7eb' }}>{cue.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <RarityIcon size={9} color={RARITY_CONFIG[cue.rarity].color} />
                                <span style={{ fontSize: 9, color: RARITY_CONFIG[cue.rarity].color, textTransform: 'capitalize' }}>{cue.rarity}</span>
                              </div>
                            </div>
                            {isSelected && <Check size={12} color="#D4AF37" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeGame === 'Dominoes' && (
                <div>
                  <SectionLabel icon={<Palette size={12} />} label="DOMINO TILE SKINS" />
                  <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12, lineHeight: 1.5 }}>
                    Choose domino tile appearance. Applied immediately.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(Object.keys(DOMINO_SKINS) as DominoSkinKey[]).map(key => {
                      const skin = DOMINO_SKINS[key];
                      const isSelected = activeDominoKey === key;
                      return (
                        <button
                          key={key}
                          onClick={() => selectDominoSkin(key)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                            border: `2px solid ${isSelected ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                            background: isSelected ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.02)',
                            boxShadow: isSelected ? '0 0 10px rgba(212,175,55,0.2)' : skin.glow ? `0 0 6px ${skin.glow}` : 'none',
                            transition: 'all 0.15s', position: 'relative',
                          }}
                        >
                          {/* Mini tile preview */}
                          <div style={{
                            width: 42, height: 22, borderRadius: 4, overflow: 'hidden',
                            background: skin.bg, border: `1.5px solid ${skin.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: skin.glow ? `0 0 8px ${skin.glow}` : '0 1px 4px rgba(0,0,0,0.4)',
                          }}>
                            <div style={{ width: 1, height: '70%', background: skin.divider }} />
                            {[0, 1].map(side => (
                              <div key={side} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: skin.pip }} />
                              </div>
                            ))}
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 600, color: isSelected ? '#D4AF37' : '#9ca3af', textAlign: 'center', lineHeight: 1.2 }}>
                            {skin.name}
                          </span>
                          {isSelected && (
                            <div style={{ position: 'absolute', top: 4, right: 4 }}>
                              <Check size={10} color="#D4AF37" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
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
