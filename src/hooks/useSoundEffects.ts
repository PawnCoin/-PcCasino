import { useState, useCallback, useEffect, useRef } from 'react';
import { getSoundMuted, getSoundVolume, getSoundAmbient, setSoundMuted, setSoundVolume, setSoundAmbient, subscribeSoundState } from './soundState';

type SoundType = 'chip' | 'card' | 'win' | 'lose' | 'spin' | 'clear' | 'error' | 'click' | 'diceRoll' | 'shuffle' | 'dealerCall' | 'jackpot' | 'ballClick' | 'wheelTick' | 'noMoreBets' | 'ballLand' | 'chipPlace';

let sharedAudioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
const chipAudio1 = typeof Audio !== 'undefined' ? new Audio('/games/roulette/src/sfx/sfx/chipPut.mp3') : null;
const chipAudio2 = typeof Audio !== 'undefined' ? new Audio('/games/roulette/src/sfx/sfx/chipPut2.mp3') : null;

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

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createPinkNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function addReverb(ctx: AudioContext, master: GainNode, dry: GainNode, wetGain = 0.18, decayTime = 0.4): GainNode {
  const convolver = ctx.createConvolver();
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * decayTime);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }
  convolver.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = wetGain;
  dry.connect(convolver);
  convolver.connect(wet);
  wet.connect(master);
  return wet;
}

function playCardFlip(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.06, 0.15);

  const snapBuffer = createNoiseBuffer(ctx, 0.012);
  const snapSrc = ctx.createBufferSource();
  snapSrc.buffer = snapBuffer;
  const snapFilter = ctx.createBiquadFilter();
  snapFilter.type = 'bandpass';
  snapFilter.frequency.value = 3800;
  snapFilter.Q.value = 0.7;
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.55 * vol, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
  snapSrc.connect(snapFilter);
  snapFilter.connect(snapGain);
  snapGain.connect(layer);
  snapSrc.start(now);
  snapSrc.stop(now + 0.015);

  const bodyBuffer = createPinkNoiseBuffer(ctx, 0.05);
  const bodySrc = ctx.createBufferSource();
  bodySrc.buffer = bodyBuffer;
  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'bandpass';
  bodyFilter.frequency.setValueAtTime(1800, now + 0.002);
  bodyFilter.frequency.linearRampToValueAtTime(800, now + 0.05);
  bodyFilter.Q.value = 1.2;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.001, now);
  bodyGain.gain.linearRampToValueAtTime(0.3 * vol, now + 0.004);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  bodySrc.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(layer);
  bodySrc.start(now + 0.002);
  bodySrc.stop(now + 0.06);

  const thumpOsc = ctx.createOscillator();
  thumpOsc.type = 'sine';
  thumpOsc.frequency.setValueAtTime(220, now);
  thumpOsc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.18 * vol, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  thumpOsc.connect(thumpGain);
  thumpGain.connect(layer);
  thumpOsc.start(now);
  thumpOsc.stop(now + 0.06);
}

function playChipClink(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const audio = Math.random() < 0.5 ? chipAudio1 : chipAudio2;
  if (audio) {
    try {
      audio.currentTime = 0;
      audio.volume = Math.min(1, Math.max(0, vol * 0.75));
      audio.play().catch(() => playChipClinkSynthetic(ctx, master, ctx.currentTime, vol));
      return;
    } catch (_) {}
  }
  playChipClinkSynthetic(ctx, master, now, vol);
}

function playChipClinkSynthetic(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.1, 0.25);

  const impactBuffer = createNoiseBuffer(ctx, 0.008);
  const impactSrc = ctx.createBufferSource();
  impactSrc.buffer = impactBuffer;
  const impactFilter = ctx.createBiquadFilter();
  impactFilter.type = 'highpass';
  impactFilter.frequency.value = 5000;
  const impactGain = ctx.createGain();
  impactGain.gain.setValueAtTime(0.4 * vol, now);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
  impactSrc.connect(impactFilter);
  impactFilter.connect(impactGain);
  impactGain.connect(layer);
  impactSrc.start(now);
  impactSrc.stop(now + 0.012);

  const metalFreqs = [1050, 2100, 3150, 4200, 5250];
  metalFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq + (Math.random() - 0.5) * 30;
    const oscGain = ctx.createGain();
    const amp = (0.2 / (i + 1)) * vol;
    oscGain.gain.setValueAtTime(amp, now + 0.001);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 - i * 0.03);
    osc.connect(oscGain);
    oscGain.connect(layer);
    osc.start(now + 0.001);
    osc.stop(now + 0.3);
  });

  const bodyOsc = ctx.createOscillator();
  bodyOsc.type = 'triangle';
  bodyOsc.frequency.setValueAtTime(920, now);
  bodyOsc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.25 * vol, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  bodyOsc.connect(bodyGain);
  bodyGain.connect(layer);
  bodyOsc.start(now);
  bodyOsc.stop(now + 0.14);
}

function playCardShuffle(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);

  for (let pass = 0; pass < 3; pass++) {
    const passOffset = pass * 0.18;
    const cardCount = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < cardCount; i++) {
      const t = now + passOffset + i * (0.13 / cardCount) + Math.random() * 0.01;
      const snapBuf = createNoiseBuffer(ctx, 0.018);
      const snapSrc = ctx.createBufferSource();
      snapSrc.buffer = snapBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200 + Math.random() * 1200;
      f.Q.value = 1.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
      snapSrc.connect(f);
      f.connect(g);
      g.connect(layer);
      snapSrc.start(t);
      snapSrc.stop(t + 0.022);
    }
    const rushBuf = createPinkNoiseBuffer(ctx, 0.15);
    const rushSrc = ctx.createBufferSource();
    rushSrc.buffer = rushBuf;
    const rushF = ctx.createBiquadFilter();
    rushF.type = 'bandpass';
    rushF.frequency.value = 1600;
    rushF.Q.value = 0.8;
    const rushG = ctx.createGain();
    rushG.gain.setValueAtTime(0.001, now + passOffset);
    rushG.gain.linearRampToValueAtTime(0.15 * vol, now + passOffset + 0.05);
    rushG.gain.linearRampToValueAtTime(0.12 * vol, now + passOffset + 0.1);
    rushG.gain.exponentialRampToValueAtTime(0.001, now + passOffset + 0.17);
    rushSrc.connect(rushF);
    rushF.connect(rushG);
    rushG.connect(layer);
    rushSrc.start(now + passOffset);
    rushSrc.stop(now + passOffset + 0.18);
  }
}

function playDiceRoll(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.12, 0.3);

  let delay = 0;
  const intervals = [0.08, 0.065, 0.05, 0.04, 0.033, 0.028, 0.025, 0.022, 0.02, 0.018, 0.017, 0.016, 0.016, 0.017, 0.018, 0.02];
  intervals.forEach((interval, i) => {
    delay += interval;
    const ampFade = Math.max(0.05, 1 - i / (intervals.length * 1.3));
    const snapBuf = createNoiseBuffer(ctx, 0.015);
    const snapSrc = ctx.createBufferSource();
    snapSrc.buffer = snapBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800 + Math.random() * 1200;
    f.Q.value = 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35 * vol * ampFade, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);
    snapSrc.connect(f);
    f.connect(g);
    g.connect(layer);
    snapSrc.start(now + delay);
    snapSrc.stop(now + delay + 0.025);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(280 + Math.random() * 80, now + delay);
    thump.frequency.exponentialRampToValueAtTime(100, now + delay + 0.04);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.2 * vol * ampFade, now + delay);
    tg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
    thump.connect(tg);
    tg.connect(layer);
    thump.start(now + delay);
    thump.stop(now + delay + 0.06);
  });
}

function playWinFanfare(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.25, 0.6);

  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, i) => {
    const offset = i * 0.1;
    ['sine', 'triangle'].forEach((type, j) => {
      const osc = ctx.createOscillator();
      osc.type = type as OscillatorType;
      osc.frequency.value = freq * (j === 1 ? 0.5 : 1);
      const g = ctx.createGain();
      const amp = (j === 0 ? 0.22 : 0.07) * vol;
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(amp, now + offset + 0.04);
      g.gain.setValueAtTime(amp * 0.85, now + offset + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.7);
      osc.connect(g);
      g.connect(layer);
      osc.start(now + offset);
      osc.stop(now + offset + 0.75);
    });
  });

  const crowdBuf = createPinkNoiseBuffer(ctx, 1.4);
  const crowdSrc = ctx.createBufferSource();
  crowdSrc.buffer = crowdBuf;
  const crowdF = ctx.createBiquadFilter();
  crowdF.type = 'bandpass';
  crowdF.frequency.value = 1200;
  crowdF.Q.value = 0.5;
  const crowdG = ctx.createGain();
  crowdG.gain.setValueAtTime(0.001, now + 0.15);
  crowdG.gain.linearRampToValueAtTime(0.12 * vol, now + 0.4);
  crowdG.gain.setValueAtTime(0.1 * vol, now + 0.9);
  crowdG.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  crowdSrc.connect(crowdF);
  crowdF.connect(crowdG);
  crowdG.connect(layer);
  crowdSrc.start(now + 0.15);
  crowdSrc.stop(now + 1.5);
}

function playLose(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);

  [200, 170, 140].forEach((freq, i) => {
    const offset = i * 0.22;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + offset);
    osc.frequency.linearRampToValueAtTime(freq * 0.85, now + offset + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18 * vol, now + offset);
    g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    osc.connect(filter);
    filter.connect(g);
    g.connect(layer);
    osc.start(now + offset);
    osc.stop(now + offset + 0.3);
  });
}

function playJackpot(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.3, 0.8);

  const chords = [
    [523.25, 659.25, 783.99],
    [587.33, 739.99, 880],
    [659.25, 830.61, 987.77],
    [783.99, 987.77, 1174.66],
  ];
  chords.forEach((chord, ci) => {
    chord.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now + ci * 0.18);
      g.gain.linearRampToValueAtTime(0.18 * vol, now + ci * 0.18 + 0.04);
      g.gain.setValueAtTime(0.15 * vol, now + ci * 0.18 + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + ci * 0.18 + 0.5);
      osc.connect(g);
      g.connect(layer);
      osc.start(now + ci * 0.18);
      osc.stop(now + ci * 0.18 + 0.55);
    });
  });

  for (let i = 0; i < 24; i++) {
    const t = now + 0.05 + i * 0.052;
    const coinBuf = createNoiseBuffer(ctx, 0.01);
    const coinSrc = ctx.createBufferSource();
    coinSrc.buffer = coinBuf;
    const coinF = ctx.createBiquadFilter();
    coinF.type = 'bandpass';
    coinF.frequency.value = 3500 + Math.random() * 2000;
    coinF.Q.value = 4;
    const coinG = ctx.createGain();
    coinG.gain.setValueAtTime(0.2 * vol, t);
    coinG.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    coinSrc.connect(coinF);
    coinF.connect(coinG);
    coinG.connect(layer);
    coinSrc.start(t);
    coinSrc.stop(t + 0.015);
  }
}

function playWheelSpin(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);

  const tickCount = 18;
  for (let i = 0; i < tickCount; i++) {
    const delay = i * (0.055 + i * 0.008);
    const amp = Math.max(0.04, 0.22 - i * 0.01) * vol;

    const nBuf = createNoiseBuffer(ctx, 0.015);
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = nBuf;
    const nF = ctx.createBiquadFilter();
    nF.type = 'highpass';
    nF.frequency.value = 3000;
    const nG = ctx.createGain();
    nG.gain.setValueAtTime(amp * 0.6, now + delay);
    nG.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.018);
    nSrc.connect(nF);
    nF.connect(nG);
    nG.connect(layer);
    nSrc.start(now + delay);
    nSrc.stop(now + delay + 0.02);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 1600 + Math.random() * 600;
    const oG = ctx.createGain();
    oG.gain.setValueAtTime(amp, now + delay);
    oG.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.022);
    osc.connect(oG);
    oG.connect(layer);
    osc.start(now + delay);
    osc.stop(now + delay + 0.025);
  }
}

function playBallInPocket(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.2, 0.4);

  const thudOsc = ctx.createOscillator();
  thudOsc.type = 'sine';
  thudOsc.frequency.setValueAtTime(220, now);
  thudOsc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.45 * vol, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  thudOsc.connect(thudGain);
  thudGain.connect(layer);
  thudOsc.start(now);
  thudOsc.stop(now + 0.22);

  const clickBuf = createNoiseBuffer(ctx, 0.025);
  const clickSrc = ctx.createBufferSource();
  clickSrc.buffer = clickBuf;
  const clickF = ctx.createBiquadFilter();
  clickF.type = 'bandpass';
  clickF.frequency.value = 4500;
  clickF.Q.value = 2;
  const clickG = ctx.createGain();
  clickG.gain.setValueAtTime(0.3 * vol, now);
  clickG.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  clickSrc.connect(clickF);
  clickF.connect(clickG);
  clickG.connect(layer);
  clickSrc.start(now);
  clickSrc.stop(now + 0.035);

  for (let i = 0; i < 4; i++) {
    const t = now + 0.08 + i * 0.065;
    const bumpOsc = ctx.createOscillator();
    bumpOsc.type = 'sine';
    bumpOsc.frequency.value = 1800 + i * 200;
    const bG = ctx.createGain();
    bG.gain.setValueAtTime((0.1 - i * 0.02) * vol, t);
    bG.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    bumpOsc.connect(bG);
    bG.connect(layer);
    bumpOsc.start(t);
    bumpOsc.stop(t + 0.04);
  }
}

function playDealerBell(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);
  addReverb(ctx, master, layer, 0.2, 0.5);

  const bellFreqs = [1400, 2800, 4200, 5600];
  bellFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const amp = (0.3 / (i + 1)) * vol;
    g.gain.setValueAtTime(amp, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8 / (i + 1));
    osc.connect(g);
    g.connect(layer);
    osc.start(now);
    osc.stop(now + 0.9);
  });
}

function playNoMoreBets(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);

  [1400, 1750].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3 * vol, now + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.45);
    osc.connect(g);
    g.connect(layer);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.5);
  });
}

function playClick(ctx: AudioContext, master: GainNode, now: number, vol: number) {
  const layer = ctx.createGain();
  layer.connect(master);

  const buf = createNoiseBuffer(ctx, 0.008);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25 * vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
  src.connect(f);
  f.connect(g);
  g.connect(layer);
  src.start(now);
  src.stop(now + 0.012);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2800, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.02);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.12 * vol, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
  osc.connect(og);
  og.connect(layer);
  osc.start(now);
  osc.stop(now + 0.025);
}

function playSynthSound(type: SoundType, volume: number) {
  const ctx = getAudioContext();
  const master = getMasterGain();
  const now = ctx.currentTime;

  switch (type) {
    case 'card': return playCardFlip(ctx, master, now, volume);
    case 'chip':
    case 'chipPlace': return playChipClink(ctx, master, now, volume);
    case 'shuffle': return playCardShuffle(ctx, master, now, volume);
    case 'diceRoll': return playDiceRoll(ctx, master, now, volume);
    case 'win': return playWinFanfare(ctx, master, now, volume);
    case 'lose': return playLose(ctx, master, now, volume);
    case 'jackpot': return playJackpot(ctx, master, now, volume);
    case 'spin':
    case 'wheelTick': return playWheelSpin(ctx, master, now, volume);
    case 'ballLand':
    case 'ballClick': return playBallInPocket(ctx, master, now, volume);
    case 'dealerCall': return playDealerBell(ctx, master, now, volume);
    case 'noMoreBets': return playNoMoreBets(ctx, master, now, volume);
    case 'click': return playClick(ctx, master, now, volume);
    case 'clear': return playClick(ctx, master, now, volume * 0.7);
    case 'error': return playLose(ctx, master, now, volume * 0.5);
  }
}

let ambientNodes: { stop: () => void } | null = null;

function startAmbientSound(volume: number) {
  const ctx = getAudioContext();
  const master = getMasterGain();

  const ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0.055 * volume, ctx.currentTime);
  ambientGain.connect(master);

  // ── ROOM TONE: low rumble of many voices ──────────────────────────────────
  const roomBuf = createPinkNoiseBuffer(ctx, 4);
  const roomSrc = ctx.createBufferSource();
  roomSrc.buffer = roomBuf;
  roomSrc.loop = true;
  const roomLP = ctx.createBiquadFilter();
  roomLP.type = 'lowpass';
  roomLP.frequency.value = 380;
  roomLP.Q.value = 0.6;
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0.4;
  roomSrc.connect(roomLP);
  roomLP.connect(roomGain);
  roomGain.connect(ambientGain);
  roomSrc.start();

  // ── CHATTER LAYER: voice-like formant band (300–3400 Hz mid band) ─────────
  const chatterBuf = createPinkNoiseBuffer(ctx, 6);
  const chatterSrc = ctx.createBufferSource();
  chatterSrc.buffer = chatterBuf;
  chatterSrc.loop = true;

  // Stack three bandpass filters to emulate voice formants
  const formants = [
    { freq: 520, Q: 3.5, gain: 0.28 },   // F1 chest resonance
    { freq: 1050, Q: 4.0, gain: 0.22 },  // F2 vowel colour
    { freq: 2400, Q: 5.0, gain: 0.12 },  // F3 speech clarity
  ];
  formants.forEach(f => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f.freq;
    bp.Q.value = f.Q;
    const fg = ctx.createGain();
    fg.gain.value = f.gain;
    chatterSrc.connect(bp);
    bp.connect(fg);
    fg.connect(ambientGain);
  });
  chatterSrc.start();

  // ── LFO to make crowd volume swell naturally ───────────────────────────────
  const swellLFO = ctx.createOscillator();
  swellLFO.type = 'sine';
  swellLFO.frequency.value = 0.07;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.015;
  swellLFO.connect(swellDepth);
  swellDepth.connect(ambientGain.gain);
  swellLFO.start();

  const swellLFO2 = ctx.createOscillator();
  swellLFO2.type = 'sine';
  swellLFO2.frequency.value = 0.031;
  const swellDepth2 = ctx.createGain();
  swellDepth2.gain.value = 0.009;
  swellLFO2.connect(swellDepth2);
  swellDepth2.connect(ambientGain.gain);
  swellLFO2.start();

  // ── SLOT MACHINE PINGS in background ──────────────────────────────────────
  const slotBuf = createPinkNoiseBuffer(ctx, 2);
  const slotSrc = ctx.createBufferSource();
  slotSrc.buffer = slotBuf;
  slotSrc.loop = true;
  const slotBP = ctx.createBiquadFilter();
  slotBP.type = 'bandpass';
  slotBP.frequency.value = 3200;
  slotBP.Q.value = 8;
  const slotGain = ctx.createGain();
  slotGain.gain.value = 0.06;
  slotSrc.connect(slotBP);
  slotBP.connect(slotGain);
  slotGain.connect(ambientGain);
  slotSrc.start();

  // ── RANDOM CHEER/LAUGH BURSTS ─────────────────────────────────────────────
  let cheerIntervalId: ReturnType<typeof setInterval>;
  let motivationIntervalId: ReturnType<typeof setInterval>;

  function playCheerBurst() {
    const now = ctx.currentTime;
    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0, now);
    burstGain.gain.linearRampToValueAtTime(0.08 * volume, now + 0.15);
    burstGain.gain.setValueAtTime(0.07 * volume, now + 0.4);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    burstGain.connect(master);

    const noiseBuf = createPinkNoiseBuffer(ctx, 2.0);
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuf;

    // Multiple formants for cheer character
    [600, 1200, 2200].forEach((freq, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq + Math.random() * 200;
      bp.Q.value = 2 + i;
      const bg = ctx.createGain();
      bg.gain.value = 0.4 - i * 0.1;
      nSrc.connect(bp);
      bp.connect(bg);
      bg.connect(burstGain);
    });
    nSrc.start(now);
    nSrc.stop(now + 2.0);
  }

  function playMotivationRise() {
    const now = ctx.currentTime;
    // Crowd pitch rise — filtered noise sweeping upward
    const riseGain = ctx.createGain();
    riseGain.gain.setValueAtTime(0, now);
    riseGain.gain.linearRampToValueAtTime(0.05 * volume, now + 0.6);
    riseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    riseGain.connect(master);

    const buf = createPinkNoiseBuffer(ctx, 1.6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400, now);
    bp.frequency.linearRampToValueAtTime(1400, now + 1.0);
    bp.Q.value = 3;
    src.connect(bp);
    bp.connect(riseGain);
    src.start(now);
    src.stop(now + 1.6);
  }

  // Random cheers every 8–20 seconds
  cheerIntervalId = setInterval(() => {
    if (Math.random() < 0.65) playCheerBurst();
  }, 8000 + Math.random() * 12000);

  // Motivation chant/rise every 15–35 seconds
  motivationIntervalId = setInterval(() => {
    if (Math.random() < 0.55) playMotivationRise();
  }, 15000 + Math.random() * 20000);

  ambientNodes = {
    stop: () => {
      try {
        roomSrc.stop();
        chatterSrc.stop();
        slotSrc.stop();
        swellLFO.stop();
        swellLFO2.stop();
        ambientGain.disconnect();
        clearInterval(cheerIntervalId);
        clearInterval(motivationIntervalId);
      } catch (_) {}
    },
  };

  return {
    updateVolume: (v: number) => {
      ambientGain.gain.setTargetAtTime(0.055 * v, ctx.currentTime, 0.3);
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
  // Read initial state from the shared singleton store
  const [isMuted, setIsMuted] = useState(getSoundMuted);
  const [volume, setVolume] = useState(getSoundVolume);

  const [ambientEnabled, setAmbientEnabled] = useState(getSoundAmbient);
  const ambientControlRef = useRef<{ updateVolume: (v: number) => void } | null>(null);

  // Subscribe to singleton changes so any external update (e.g. from MusicPlayer icon)
  // is reflected immediately in this hook instance within the same tab
  useEffect(() => {
    return subscribeSoundState(() => {
      setIsMuted(getSoundMuted());
      setVolume(getSoundVolume());
      setAmbientEnabled(getSoundAmbient());
    });
  }, []);

  // Keep Web Audio master gain in sync with mute/volume
  useEffect(() => {
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

  // toggleMute writes to the singleton (notifies all hooks and MusicPlayer)
  const toggleMute = useCallback(() => {
    setSoundMuted(!getSoundMuted());
  }, []);

  const toggleAmbient = useCallback(() => {
    setSoundAmbient(!getSoundAmbient());
  }, []);

  // Expose a volume setter that writes through the singleton
  const setVolumeGlobal = useCallback((val: number) => {
    setSoundVolume(val);
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
    setVolume: setVolumeGlobal,
    ambientEnabled,
    toggleAmbient,
  };
}
