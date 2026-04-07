import { useCallback, useEffect } from 'react';

// ── Module-level singleton ─────────────────────────────────────────────────
// Shared across all hook instances so voices load once and are available
// to every component without race conditions.

let _synth: SpeechSynthesis | null = null;
let _voices: SpeechSynthesisVoice[] = [];
let _ready = false;

function ensureSynth() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (_synth) return;
  _synth = window.speechSynthesis;
  const load = () => {
    _voices = _synth!.getVoices();
    if (_voices.length > 0) _ready = true;
  };
  load();
  if (!_ready) {
    _synth.onvoiceschanged = () => { load(); };
    // Fallback: retry after a short delay for browsers that are slow
    setTimeout(load, 500);
    setTimeout(load, 1500);
  }
}

// Preferred voices — female-first for a smooth dealer sound
const PREFERRED_VOICES = [
  'Google UK English Female',
  'Microsoft Aria Online (Natural)',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Michelle Online (Natural)',
  'Samantha',
  'Victoria',
  'Karen',
  'Google US English',
  'Microsoft Zira Desktop',
  'Microsoft Zira',
  'Google UK English Male',
  'Microsoft Guy Online (Natural)',
  'Microsoft Davis Online (Natural)',
  'Alex',
];

function pickVoice(): SpeechSynthesisVoice | null {
  if (_voices.length === 0) return null;
  for (const name of PREFERRED_VOICES) {
    const v = _voices.find(v => v.name === name || v.name.startsWith(name));
    if (v) return v;
  }
  const en = _voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'));
  return en || _voices[0] || null;
}

function doSpeak(text: string, rate: number, pitch = 0.96, volume = 0.92) {
  if (!_synth || !text) return;
  _synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) utt.voice = v;
  utt.rate = rate;
  utt.pitch = pitch;
  utt.volume = volume;
  _synth.speak(utt);
}

// ── Base hook ──────────────────────────────────────────────────────────────

export function useGameVoice() {
  useEffect(() => {
    ensureSynth();
  }, []);

  const speak = useCallback((text: string, rate = 0.88) => {
    ensureSynth();
    if (!_synth) return;
    if (!_ready) {
      // Voices not loaded yet — wait a tick then try again
      setTimeout(() => doSpeak(text, rate), 600);
    } else {
      doSpeak(text, rate);
    }
  }, []);

  const stop = useCallback(() => {
    _synth?.cancel();
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSupported };
}

// ── Bingo voice ────────────────────────────────────────────────────────────

export function useBingoVoice() {
  useEffect(() => {
    ensureSynth();
  }, []);

  const callNumber = useCallback((letter: string, num: number) => {
    ensureSynth();
    if (!_synth) return;
    // Format: "B... 15" — a comma creates a natural pause between letter and number
    const text = `${letter}, ${num}`;
    const call = () => doSpeak(text, 0.82, 1.0, 0.95);
    if (!_ready) {
      setTimeout(call, 600);
    } else {
      call();
    }
  }, []);

  const announceWin = useCallback((winnerName: string, pattern: string, amount: number) => {
    ensureSynth();
    if (!_synth) return;
    const text = `Bingo! ${winnerName} wins with ${pattern}! ${amount} pawn coin!`;
    const call = () => doSpeak(text, 0.84, 1.02, 0.96);
    if (!_ready) setTimeout(call, 600); else call();
  }, []);

  const announceNotYet = useCallback(() => {
    ensureSynth();
    if (!_synth) return;
    const call = () => doSpeak('Not yet. Keep playing!', 0.86, 0.98, 0.92);
    if (!_ready) setTimeout(call, 600); else call();
  }, []);

  const stop = useCallback(() => {
    _synth?.cancel();
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { callNumber, announceWin, announceNotYet, stop, isSupported };
}

// ── Poker voice ────────────────────────────────────────────────────────────

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

// ── Roulette voice ─────────────────────────────────────────────────────────

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

// ── Blackjack voice ────────────────────────────────────────────────────────

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
