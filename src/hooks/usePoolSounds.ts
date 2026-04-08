import { useRef } from 'react';

export function usePoolSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }

  function playCueStrike(power: number) {
    try {
      const ac = getCtx();
      const dur = 0.08;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.018));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(Math.max(0.2, power) * 0.9, ac.currentTime);
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.6;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      src.start();
    } catch (_) {}
  }

  function playBallCollision(velocity: number) {
    try {
      const ac = getCtx();
      const dur = 0.05;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.012));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const gain = ac.createGain();
      const vol = Math.min(1, Math.max(0.05, velocity * 0.05)) * 0.55;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      const filter = ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2200;
      filter.Q.value = 1.2;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      src.start();
    } catch (_) {}
  }

  function playPocketDrop() {
    try {
      const ac = getCtx();
      const dur = 0.22;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const data = buf.getChannelData(0);
      const decayRate = ac.sampleRate * 0.07;
      for (let i = 0; i < data.length; i++) {
        const t = i / ac.sampleRate;
        data[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / decayRate)
                + Math.sin(2 * Math.PI * 80 * t) * 0.5 * Math.exp(-i / (ac.sampleRate * 0.04));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.7, ac.currentTime);
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      src.start();
    } catch (_) {}
  }

  function playBreakShot() {
    try {
      const ac = getCtx();
      const dur = 0.18;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.03));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(1.0, ac.currentTime);
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.4;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      src.start();
    } catch (_) {}
  }

  return { playCueStrike, playBallCollision, playPocketDrop, playBreakShot };
}
