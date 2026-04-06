/**
 * Singleton sound state — single source of truth for mute/volume/ambient shared by
 * MusicPlayer, useSoundEffects, and any other audio component in the app.
 * Changes propagate synchronously within the same tab via subscriber callbacks.
 */
const _listeners = new Set<() => void>();

let _isMuted: boolean = (() => {
  try { return JSON.parse(localStorage.getItem('pcasino_muted') ?? 'false'); } catch { return false; }
})();

let _volume: number = (() => {
  try { return parseFloat(localStorage.getItem('pcasino_volume') ?? '0.7'); } catch { return 0.7; }
})();

let _ambientEnabled: boolean = (() => {
  try {
    const s = localStorage.getItem('pcasino_game_settings');
    if (s) return JSON.parse(s).casinoSoundEnabled ?? true;
  } catch {}
  return true;
})();

export function getSoundMuted(): boolean { return _isMuted; }
export function getSoundVolume(): number { return _volume; }
export function getSoundAmbient(): boolean { return _ambientEnabled; }

export function setSoundMuted(val: boolean): void {
  _isMuted = val;
  localStorage.setItem('pcasino_muted', JSON.stringify(val));
  _listeners.forEach(fn => fn());
}

export function setSoundVolume(val: number): void {
  _volume = Math.max(0, Math.min(1, val));
  localStorage.setItem('pcasino_volume', String(_volume));
  _listeners.forEach(fn => fn());
}

export function setSoundAmbient(val: boolean): void {
  _ambientEnabled = val;
  try {
    const s = localStorage.getItem('pcasino_game_settings');
    const settings = s ? JSON.parse(s) : {};
    localStorage.setItem('pcasino_game_settings', JSON.stringify({ ...settings, casinoSoundEnabled: val }));
  } catch {}
  _listeners.forEach(fn => fn());
}

export function subscribeSoundState(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
