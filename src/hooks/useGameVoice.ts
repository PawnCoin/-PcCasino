import { useCallback, useRef } from 'react';

export function useGameVoice() {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Initialize speech synthesis
  const initSynth = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      voicesRef.current = synthRef.current.getVoices();
      
      // Load voices if not available immediately
      if (voicesRef.current.length === 0) {
        synthRef.current.onvoiceschanged = () => {
          voicesRef.current = synthRef.current?.getVoices() || [];
        };
      }
    }
  }, []);

  // Get a good English voice
  const getVoice = useCallback(() => {
    const voices = voicesRef.current;
    // Prefer a male voice for casino dealer feel
    const preferredVoices = [
      'Google US English',
      'Microsoft David Desktop',
      'Microsoft Mark',
      'Samantha',
      'Alex'
    ];
    
    for (const name of preferredVoices) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    
    // Fallback to first English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }, []);

  // Speak text
  const speak = useCallback((text: string, rate: number = 1) => {
    if (!synthRef.current) {
      initSynth();
    }
    
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice();
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      synthRef.current.speak(utterance);
    }
  }, [getVoice, initSynth]);

  // Stop speaking
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  // Check if speech is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSupported };
}

// Poker hand analysis and voice announcements
export function usePokerVoice() {
  const { speak, stop, isSupported } = useGameVoice();

  // Announce what hand the player has
  const announceHand = useCallback((hand: string, winPercent: number) => {
    if (!isSupported) return;
    
    let message = '';
    
    if (hand === 'Royal Flush') {
      message = `Royal Flush! The best hand possible! You're guaranteed to win!`;
    } else if (hand === 'Straight Flush') {
      message = `Straight Flush! Excellent hand! You have a ${winPercent.toFixed(0)} percent chance of winning.`;
    } else if (hand === 'Four of a Kind') {
      message = `Four of a Kind! Very strong hand! ${winPercent.toFixed(0)} percent win probability.`;
    } else if (hand === 'Full House') {
      message = `Full House! Great hand! You have a ${winPercent.toFixed(0)} percent chance of winning.`;
    } else if (hand === 'Flush') {
      message = `Flush! Good hand! ${winPercent.toFixed(0)} percent win probability.`;
    } else if (hand === 'Straight') {
      message = `Straight! Decent hand! ${winPercent.toFixed(0)} percent chance of winning.`;
    } else if (hand === 'Three of a Kind') {
      message = `Three of a Kind! ${winPercent.toFixed(0)} percent win probability.`;
    } else if (hand === 'Two Pair') {
      message = `Two Pair! ${winPercent.toFixed(0)} percent chance of winning.`;
    } else if (hand === 'Pair') {
      message = `Pair of ${hand.split(' ')[1] || 'cards'}. ${winPercent.toFixed(0)} percent win probability.`;
    } else if (hand === 'High Card') {
      message = `High card ${hand.split(' ')[2] || ''}. ${winPercent.toFixed(0)} percent chance of winning.`;
    }
    
    speak(message, 0.9);
  }, [speak, isSupported]);

  // Announce action suggestions
  const suggestAction = useCallback((action: 'fold' | 'call' | 'raise' | 'check', reason: string) => {
    if (!isSupported) return;
    
    const messages: Record<string, string> = {
      fold: `Consider folding. ${reason}`,
      call: `Calling looks good. ${reason}`,
      raise: `Raising is recommended. ${reason}`,
      check: `Checking is fine here. ${reason}`,
    };
    
    speak(messages[action], 1);
  }, [speak, isSupported]);

  // Announce game events
  const announceEvent = useCallback((event: string) => {
    if (!isSupported) return;
    speak(event, 1);
  }, [speak, isSupported]);

  return { announceHand, suggestAction, announceEvent, stop, isSupported };
}

// Roulette voice announcements
export function useRouletteVoice() {
  const { speak, stop, isSupported } = useGameVoice();

  const announceBetsOpen = useCallback(() => {
    if (!isSupported) return;
    speak('Place your bets', 0.9);
  }, [speak, isSupported]);

  const announceNoMoreBets = useCallback(() => {
    if (!isSupported) return;
    speak('No more bets', 0.9);
  }, [speak, isSupported]);

  const announceResult = useCallback((number: number, isRed: boolean) => {
    if (!isSupported) return;
    const color = isRed ? 'red' : number === 0 ? 'green' : 'black';
    speak(`Number ${number}, ${color}`, 0.85);
  }, [speak, isSupported]);

  const announceWin = useCallback((amount: number) => {
    if (!isSupported) return;
    speak(`Winner! You win ${amount} pawn coin`, 1.0);
  }, [speak, isSupported]);

  const announceLoss = useCallback(() => {
    if (!isSupported) return;
    speak('Better luck next time', 0.9);
  }, [speak, isSupported]);

  return { announceBetsOpen, announceNoMoreBets, announceResult, announceWin, announceLoss, stop, isSupported };
}

// Blackjack voice announcements
export function useBlackjackVoice() {
  const { speak, stop, isSupported } = useGameVoice();

  const announceCard = useCallback((card: string, total: number) => {
    if (!isSupported) return;
    speak(`${card}. Total is ${total}.`, 0.9);
  }, [speak, isSupported]);

  const suggestAction = useCallback((action: 'hit' | 'stand' | 'double' | 'split') => {
    if (!isSupported) return;
    
    const messages: Record<string, string> = {
      hit: 'You should hit.',
      stand: 'Standing is recommended.',
      double: 'Double down if you can.',
      split: 'Split your cards.',
    };
    
    speak(messages[action], 1);
  }, [speak, isSupported]);

  return { announceCard, suggestAction, stop, isSupported };
}
