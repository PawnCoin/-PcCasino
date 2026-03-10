import { useState, useCallback, useEffect } from 'react';

type SoundType = 'chip' | 'card' | 'win' | 'lose' | 'spin' | 'clear' | 'error' | 'click' | 'diceRoll';

// Use Web Audio API for synthesized sounds
const playSynthSound = (type: SoundType) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const soundConfigs: Record<SoundType, { freq: number; type: OscillatorType; duration: number; fade: number }> = {
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
  
  const config = soundConfigs[type];
  oscillator.frequency.value = config.freq;
  oscillator.type = config.type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + config.duration);
};

export function useSoundEffects() {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem('pcasino_muted');
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem('pcasino_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => !prev);
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;
    
    try {
      playSynthSound(type);
    } catch (e) {
      // Fallback: try to play from audio element if synthesis fails
      console.log('Sound playback failed:', e);
    }
  }, [isMuted]);

  return {
    isMuted,
    toggleMute,
    playSound,
  };
}
