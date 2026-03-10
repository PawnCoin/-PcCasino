import { useState, useCallback, useEffect, useRef } from 'react';

type SoundType = 'chip' | 'card' | 'win' | 'lose' | 'spin' | 'clear' | 'error' | 'click' | 'diceRoll' | 'shuffle' | 'dealerCall' | 'jackpot';

let sharedAudioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGainNode = sharedAudioContext.createGain();
    masterGainNode.connect(sharedAudioContext.destination);
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

function getMasterGain(): GainNode {
  getAudioContext();
  return masterGainNode!;
}

const soundConfigs: Record<string, { freq: number; type: OscillatorType; duration: number; fade: number }> = {
  chip: { freq: 800, type: 'sine', duration: 0.1, fade: 0.05 },
  card: { freq: 400, type: 'triangle', duration: 0.15, fade: 0.08 },
  win: { freq: 1200, type: 'sine', duration: 0.5, fade: 0.3 },
  lose: { freq: 200, type: 'sawtooth', duration: 0.4, fade: 0.2 },
  spin: { freq: 600, type: 'sine', duration: 0.3, fade: 0.15 },
  clear: { freq: 500, type: 'square', duration: 0.2, fade: 0.1 },
  error: { freq: 150, type: 'sawtooth', duration: 0.3, fade: 0.15 },
  click: { freq: 1000, type: 'sine', duration: 0.05, fade: 0.02 },
  diceRoll: { freq: 250, type: 'sawtooth', duration: 0.8, fade: 0.4 },
};

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playSynthSound(type: SoundType, volume: number) {
  const ctx = getAudioContext();
  const master = getMasterGain();
  const now = ctx.currentTime;

  if (type === 'shuffle') {
    playShuffleSound(ctx, master, now, volume);
    return;
  }
  if (type === 'dealerCall') {
    playDealerCallSound(ctx, master, now, volume);
    return;
  }
  if (type === 'jackpot') {
    playJackpotSound(ctx, master, now, volume);
    return;
  }

  const config = soundConfigs[type];
  if (!config) return;

  const layerGain = ctx.createGain();
  layerGain.connect(master);

  const osc = ctx.createOscillator();
  osc.frequency.value = config.freq;
  osc.type = config.type;

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.3 * volume, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
  osc.connect(oscGain);
  oscGain.connect(layerGain);
  osc.start(now);
  osc.stop(now + config.duration);

  const harmOsc = ctx.createOscillator();
  harmOsc.frequency.value = config.freq * 2;
  harmOsc.type = config.type;
  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.08 * volume, now);
  harmGain.gain.exponentialRampToValueAtTime(0.01, now + config.duration * 0.8);
  harmOsc.connect(harmGain);
  harmGain.connect(layerGain);
  harmOsc.start(now);
  harmOsc.stop(now + config.duration);

  if (type === 'chip' || type === 'diceRoll' || type === 'card') {
    const noiseBuffer = createNoiseBuffer(ctx, config.duration);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06 * volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration * 0.6);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = config.freq * 1.5;
    noiseFilter.Q.value = 2;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(layerGain);
    noiseSource.start(now);
    noiseSource.stop(now + config.duration);
  }

  if (type === 'win') {
    const arpFreqs = [config.freq, config.freq * 1.25, config.freq * 1.5, config.freq * 2];
    arpFreqs.forEach((f, i) => {
      const arpOsc = ctx.createOscillator();
      arpOsc.frequency.value = f;
      arpOsc.type = 'sine';
      const arpGain = ctx.createGain();
      const offset = i * 0.08;
      arpGain.gain.setValueAtTime(0.001, now);
      arpGain.gain.linearRampToValueAtTime(0.15 * volume, now + offset + 0.02);
      arpGain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.2);
      arpOsc.connect(arpGain);
      arpGain.connect(layerGain);
      arpOsc.start(now + offset);
      arpOsc.stop(now + offset + 0.25);
    });
  }

  if (type === 'lose') {
    const subOsc = ctx.createOscillator();
    subOsc.frequency.value = config.freq * 0.5;
    subOsc.type = 'sine';
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.1 * volume, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
    subOsc.connect(subGain);
    subGain.connect(layerGain);
    subOsc.start(now);
    subOsc.stop(now + config.duration);
  }
}

function playShuffleSound(ctx: AudioContext, master: GainNode, now: number, volume: number) {
  const duration = 0.5;
  const layerGain = ctx.createGain();
  layerGain.connect(master);

  const noiseBuffer = createNoiseBuffer(ctx, duration);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.linearRampToValueAtTime(6000, now + duration * 0.5);
  filter.frequency.linearRampToValueAtTime(2000, now + duration);
  filter.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(0.18 * volume, now + 0.05);
  noiseGain.gain.setValueAtTime(0.18 * volume, now + duration * 0.7);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(layerGain);
  noiseSource.start(now);
  noiseSource.stop(now + duration);

  for (let i = 0; i < 6; i++) {
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.value = 3000 + Math.random() * 2000;
    const clickGain = ctx.createGain();
    const t = now + i * (duration / 8) + Math.random() * 0.02;
    clickGain.gain.setValueAtTime(0.12 * volume, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(layerGain);
    clickOsc.start(t);
    clickOsc.stop(t + 0.03);
  }
}

function playDealerCallSound(ctx: AudioContext, master: GainNode, now: number, volume: number) {
  const layerGain = ctx.createGain();
  layerGain.connect(master);

  const bellFreq = 1400;
  const duration = 0.6;

  [1, 2, 3].forEach((harmonic) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = bellFreq * harmonic;
    const gain = ctx.createGain();
    const amp = (0.25 / harmonic) * volume;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration / harmonic);
    osc.connect(gain);
    gain.connect(layerGain);
    osc.start(now);
    osc.stop(now + duration);
  });
}

function playJackpotSound(ctx: AudioContext, master: GainNode, now: number, volume: number) {
  const layerGain = ctx.createGain();
  layerGain.connect(master);

  const chordFreqs = [523.25, 659.25, 783.99, 1046.5];
  const totalDuration = 1.2;

  chordFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const offset = i * 0.1;
    gain.gain.setValueAtTime(0.001, now + offset);
    gain.gain.linearRampToValueAtTime(0.2 * volume, now + offset + 0.05);
    gain.gain.setValueAtTime(0.2 * volume, now + offset + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + totalDuration);
    osc.connect(gain);
    gain.connect(layerGain);
    osc.start(now + offset);
    osc.stop(now + totalDuration + 0.1);

    const harm = ctx.createOscillator();
    harm.type = 'sine';
    harm.frequency.value = freq * 2;
    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.001, now + offset);
    harmGain.gain.linearRampToValueAtTime(0.06 * volume, now + offset + 0.05);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration * 0.6);
    harm.connect(harmGain);
    harmGain.connect(layerGain);
    harm.start(now + offset);
    harm.stop(now + totalDuration);
  });

  const riserOsc = ctx.createOscillator();
  riserOsc.type = 'sine';
  riserOsc.frequency.setValueAtTime(400, now);
  riserOsc.frequency.exponentialRampToValueAtTime(2000, now + totalDuration);
  const riserGain = ctx.createGain();
  riserGain.gain.setValueAtTime(0.08 * volume, now);
  riserGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
  riserOsc.connect(riserGain);
  riserGain.connect(layerGain);
  riserOsc.start(now);
  riserOsc.stop(now + totalDuration);
}

let ambientNodes: { stop: () => void } | null = null;

function startAmbientSound(volume: number) {
  const ctx = getAudioContext();
  const master = getMasterGain();

  const ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0.04 * volume, ctx.currentTime);
  ambientGain.connect(master);

  const bufferLength = ctx.sampleRate * 4;
  const noiseBuffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferLength; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const crowdSource = ctx.createBufferSource();
  crowdSource.buffer = noiseBuffer;
  crowdSource.loop = true;
  const crowdFilter = ctx.createBiquadFilter();
  crowdFilter.type = 'lowpass';
  crowdFilter.frequency.value = 500;
  crowdFilter.Q.value = 0.7;
  const crowdGain = ctx.createGain();
  crowdGain.gain.value = 0.6;
  crowdSource.connect(crowdFilter);
  crowdFilter.connect(crowdGain);
  crowdGain.connect(ambientGain);
  crowdSource.start();

  const slotSource = ctx.createBufferSource();
  slotSource.buffer = noiseBuffer;
  slotSource.loop = true;
  const slotFilter = ctx.createBiquadFilter();
  slotFilter.type = 'bandpass';
  slotFilter.frequency.value = 3000;
  slotFilter.Q.value = 5;
  const slotGain = ctx.createGain();
  slotGain.gain.value = 0.15;
  slotSource.connect(slotFilter);
  slotFilter.connect(slotGain);
  slotGain.connect(ambientGain);
  slotSource.start();

  const lfoOsc = ctx.createOscillator();
  lfoOsc.type = 'sine';
  lfoOsc.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfoOsc.connect(lfoGain);
  lfoGain.connect(ambientGain.gain);
  lfoOsc.start();

  ambientNodes = {
    stop: () => {
      try {
        crowdSource.stop();
        slotSource.stop();
        lfoOsc.stop();
        ambientGain.disconnect();
      } catch (_) {}
    },
  };

  return {
    updateVolume: (v: number) => {
      ambientGain.gain.setTargetAtTime(0.04 * v, ctx.currentTime, 0.1);
    },
  };
}

function stopAmbientSound() {
  if (ambientNodes) {
    ambientNodes.stop();
    ambientNodes = null;
  }
}

export function useSoundEffects() {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem('pcasino_muted');
    return stored ? JSON.parse(stored) : false;
  });

  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem('pcasino_volume');
    return stored ? parseFloat(stored) : 0.7;
  });

  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const ambientControlRef = useRef<{ updateVolume: (v: number) => void } | null>(null);

  useEffect(() => {
    localStorage.setItem('pcasino_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('pcasino_volume', String(volume));
    if (masterGainNode) {
      const ctx = getAudioContext();
      masterGainNode.gain.setTargetAtTime(isMuted ? 0 : volume, ctx.currentTime, 0.05);
    }
    if (ambientControlRef.current) {
      ambientControlRef.current.updateVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (ambientEnabled && !isMuted) {
      ambientControlRef.current = startAmbientSound(volume);
    } else {
      stopAmbientSound();
      ambientControlRef.current = null;
    }
    return () => {
      stopAmbientSound();
      ambientControlRef.current = null;
    };
  }, [ambientEnabled, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => !prev);
  }, []);

  const toggleAmbient = useCallback(() => {
    setAmbientEnabled((prev) => !prev);
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;

    try {
      playSynthSound(type, volume);
    } catch (e) {
      console.log('Sound playback failed:', e);
    }
  }, [isMuted, volume]);

  return {
    isMuted,
    toggleMute,
    playSound,
    volume,
    setVolume,
    ambientEnabled,
    toggleAmbient,
  };
}
