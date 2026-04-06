import { useRef, useCallback, useEffect } from 'react';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function resumeContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Generate chip clink sound using oscillators
function playChipClink(volume = 0.4) {
  try {
    const ctx = resumeContext();
    const now = ctx.currentTime;
    
    // Main strike tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(900 + Math.random() * 200, now);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    osc1.type = 'triangle';
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Click transient
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(2000, now);
    osc2.type = 'square';
    gain2.gain.setValueAtTime(volume * 0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc2.start(now);
    osc2.stop(now + 0.03);
  } catch {}
}

// Win fanfare - ascending musical motif
function playWinFanfare(volume = 0.5) {
  try {
    const ctx = resumeContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteLen = 0.12;
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * noteLen;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.setValueAtTime(volume, startTime + noteLen - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen + 0.1);
      
      osc.start(startTime);
      osc.stop(startTime + noteLen + 0.1);
    });

    // Final chord
    [523.25, 659.25, 783.99].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + notes.length * noteLen;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.6, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch {}
}

// Big jackpot win fanfare
function playJackpotFanfare(volume = 0.7) {
  try {
    const ctx = resumeContext();
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1046.5, 783.99, 1046.5];
    const noteLen = 0.1;
    
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * noteLen;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen + 0.05);
      osc.start(startTime);
      osc.stop(startTime + noteLen + 0.05);
    });
  } catch {}
}

// Card deal swoosh
function playCardDeal(volume = 0.25) {
  try {
    const ctx = resumeContext();
    const noise = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(200, ctx.currentTime);
    noise.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
    filter.type = 'highpass';
    filter.frequency.value = 500;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.1);
  } catch {}
}

// Button click
function playButtonClick(volume = 0.2) {
  try {
    const ctx = resumeContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = 'sine';
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
}

// Dice roll
function playDiceRoll(volume = 0.3) {
  try {
    const ctx = resumeContext();
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 300 + Math.random() * 500;
      osc.type = 'square';
      gain.gain.setValueAtTime(volume * (1 - i * 0.15), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  } catch {}
}

// Loss sound
function playLoss(volume = 0.3) {
  try {
    const ctx = resumeContext();
    const notes = [392, 311.13, 261.63]; // G4, Eb4, C4 (descending minor)
    const noteLen = 0.14;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * noteLen;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen + 0.05);
      osc.start(startTime);
      osc.stop(startTime + noteLen + 0.05);
    });
  } catch {}
}

let globalVolume = 0.7;
let soundEnabled = true;

export function useCasinoSound() {
  const enabledRef = useRef(soundEnabled);
  const volumeRef = useRef(globalVolume);

  useEffect(() => {
    const stored = localStorage.getItem('pcasino_sound');
    if (stored !== null) {
      soundEnabled = stored === 'true';
      enabledRef.current = soundEnabled;
    }
    const vol = localStorage.getItem('pcasino_sfx_volume');
    if (vol !== null) {
      globalVolume = parseFloat(vol);
      volumeRef.current = globalVolume;
    }
  }, []);

  const withCheck = useCallback((fn: (vol: number) => void) => {
    if (!enabledRef.current) return;
    fn(volumeRef.current);
  }, []);

  const playChip = useCallback(() => withCheck(v => playChipClink(v * 0.6)), [withCheck]);
  const playWin = useCallback(() => withCheck(v => playWinFanfare(v * 0.7)), [withCheck]);
  const playJackpot = useCallback(() => withCheck(v => playJackpotFanfare(v)), [withCheck]);
  const playCard = useCallback(() => withCheck(v => playCardDeal(v * 0.4)), [withCheck]);
  const playClick = useCallback(() => withCheck(v => playButtonClick(v * 0.3)), [withCheck]);
  const playDice = useCallback(() => withCheck(v => playDiceRoll(v * 0.5)), [withCheck]);
  const playLoseSound = useCallback(() => withCheck(v => playLoss(v * 0.4)), [withCheck]);

  const setEnabled = useCallback((enabled: boolean) => {
    soundEnabled = enabled;
    enabledRef.current = enabled;
    localStorage.setItem('pcasino_sound', String(enabled));
  }, []);

  const setVolume = useCallback((vol: number) => {
    globalVolume = vol;
    volumeRef.current = vol;
    localStorage.setItem('pcasino_sfx_volume', String(vol));
  }, []);

  const isEnabled = () => enabledRef.current;

  return { playChip, playWin, playJackpot, playCard, playClick, playDice, playLose: playLoseSound, setEnabled, setVolume, isEnabled };
}
