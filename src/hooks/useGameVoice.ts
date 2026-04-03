import { useCallback, useRef } from 'react';

export function useGameVoice() {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const initSynth = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      voicesRef.current = synthRef.current.getVoices();
      if (voicesRef.current.length === 0) {
        synthRef.current.onvoiceschanged = () => {
          voicesRef.current = synthRef.current?.getVoices() || [];
        };
      }
    }
  }, []);

  const getVoice = useCallback(() => {
    const voices = voicesRef.current;
    const preferredVoices = [
      'Google UK English Male',
      'Google US English',
      'Microsoft Guy Online (Natural)',
      'Microsoft Davis Online (Natural)',
      'Microsoft Mark Online (Natural)',
      'Microsoft Ryan Online (Natural)',
      'Microsoft Eric Online (Natural)',
      'Microsoft David Desktop',
      'Microsoft Mark',
      'Samantha',
      'Alex',
    ];
    for (const name of preferredVoices) {
      const voice = voices.find(v => v.name === name || v.name.startsWith(name));
      if (voice) return voice;
    }
    const enVoice = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'));
    return enVoice || voices[0];
  }, []);

  const speak = useCallback((text: string, rate = 0.88) => {
    if (!synthRef.current) initSynth();
    if (synthRef.current && text) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice();
      utterance.rate = rate;
      utterance.pitch = 0.96;
      utterance.volume = 0.92;
      synthRef.current.speak(utterance);
    }
  }, [getVoice, initSynth]);

  const stop = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSupported };
}

export function usePokerVoice() {
  const { speak, stop, isSupported } = useGameVoice();

  const announceHand = useCallback((hand: string, winPercent: number) => {
    if (!isSupported) return;
    const pct = winPercent.toFixed(0);
    const messages: Record<string, string> = {
      'Royal Flush': `Royal Flush. The very best hand possible. You are guaranteed to win.`,
      'Straight Flush': `Straight Flush. An excellent hand. You have a ${pct} percent chance of winning.`,
      'Four of a Kind': `Four of a Kind. A very strong hand. ${pct} percent win probability.`,
      'Full House': `Full House. A great hand. You have a ${pct} percent chance of winning.`,
      'Flush': `Flush. A solid hand. ${pct} percent win probability.`,
      'Straight': `Straight. A decent hand. ${pct} percent chance of winning.`,
      'Three of a Kind': `Three of a Kind. ${pct} percent win probability.`,
      'Two Pair': `Two Pair. ${pct} percent chance of winning.`,
      'Pair': `One Pair. ${pct} percent win probability.`,
      'High Card': `High card only. ${pct} percent chance of winning.`,
    };
    speak(messages[hand] || `${hand}. ${pct} percent win probability.`, 0.86);
  }, [speak, isSupported]);

  const suggestAction = useCallback((action: 'fold' | 'call' | 'raise' | 'check', reason: string) => {
    if (!isSupported) return;
    const messages: Record<string, string> = {
      fold: `Consider folding. ${reason}`,
      call: `Calling looks good. ${reason}`,
      raise: `Raising is recommended. ${reason}`,
      check: `Checking is fine here. ${reason}`,
    };
    speak(messages[action], 0.86);
  }, [speak, isSupported]);

  const announceEvent = useCallback((event: string) => {
    if (!isSupported) return;
    speak(event, 0.88);
  }, [speak, isSupported]);

  return { announceHand, suggestAction, announceEvent, stop, isSupported };
}

export function useRouletteVoice() {
  const { speak, stop, isSupported } = useGameVoice();

  const announceBetsOpen = useCallback(() => {
    if (!isSupported) return;
    speak('Place your bets, please.', 0.86);
  }, [speak, isSupported]);

  const announceNoMoreBets = useCallback(() => {
    if (!isSupported) return;
    speak('No more bets.', 0.86);
  }, [speak, isSupported]);

  const announceResult = useCallback((number: number, isRed: boolean) => {
    if (!isSupported) return;
    const color = isRed ? 'red' : number === 0 ? 'green' : 'black';
    speak(`Number ${number}, ${color}.`, 0.84);
  }, [speak, isSupported]);

  const announceWin = useCallback((amount: number) => {
    if (!isSupported) return;
    speak(`Winner. You win ${amount} pawn coin.`, 0.88);
  }, [speak, isSupported]);

  const announceLoss = useCallback(() => {
    if (!isSupported) return;
    speak('Better luck next time.', 0.86);
  }, [speak, isSupported]);

  return { announceBetsOpen, announceNoMoreBets, announceResult, announceWin, announceLoss, stop, isSupported };
}

export function useBlackjackVoice() {
  const { speak, stop, isSupported } = useGameVoice();

  const announceCard = useCallback((card: string, total: number) => {
    if (!isSupported) return;
    speak(`${card}. Total is ${total}.`, 0.86);
  }, [speak, isSupported]);

  const suggestAction = useCallback((action: 'hit' | 'stand' | 'double' | 'split') => {
    if (!isSupported) return;
    const messages: Record<string, string> = {
      hit: 'You should hit.',
      stand: 'Standing is recommended.',
      double: 'Double down if you can.',
      split: 'Split your cards.',
    };
    speak(messages[action], 0.86);
  }, [speak, isSupported]);

  return { announceCard, suggestAction, stop, isSupported };
}
