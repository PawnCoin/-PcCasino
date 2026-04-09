import { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { getSoundMuted, getSoundVolume, getSoundAmbient, setSoundMuted, setSoundVolume, setSoundAmbient, setSoundTrackTitle, subscribeSoundState } from '@/hooks/soundState';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre: string;
  url: string;
}

const tracks: Track[] = [
  { id: '1', title: 'Casino Royale Lounge', artist: 'Vegas Beats', duration: 180, genre: 'Jazz Lounge', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c3cc48ac48.mp3' },
  { id: '2', title: 'High Stakes Night', artist: 'Lounge Masters', duration: 195, genre: 'Electronic', url: 'https://cdn.pixabay.com/download/audio/2022/01/27/audio_d0c6ff1bde.mp3' },
  { id: '3', title: 'Royal Flush', artist: 'Poker Jazz', duration: 200, genre: 'Jazz', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: '4', title: 'Jackpot Dreams', artist: 'Slot Symphony', duration: 210, genre: 'Ambient', url: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_a1d62a14e7.mp3' },
  { id: '5', title: 'Vegas Lights', artist: 'Neon Collective', duration: 225, genre: 'Electronic', url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3' },
];

type MusicTab = 'casino' | 'liveone';

export function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MusicTab>('casino');
  const [isPlaying, setIsPlaying] = useState(getSoundAmbient);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState(false);

  // Use the shared singleton store — same source of truth as useSoundEffects
  const [isMuted, setIsMuted] = useState(getSoundMuted);
  const [volume, setVolume] = useState(() => Math.round(getSoundVolume() * 100));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to singleton changes from any other component
  // (e.g. in-game mute toggle, in-game ambient toggle)
  useEffect(() => {
    return subscribeSoundState(() => {
      setIsMuted(getSoundMuted());
      setVolume(Math.round(getSoundVolume() * 100));
      setIsPlaying(getSoundAmbient());
    });
  }, []);

  const currentTrackData = tracks[currentTrack];

  // Create / update audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.preload = 'none';
    }
    const audio = audioRef.current;
    audio.src = currentTrackData.url;
    audio.volume = isMuted ? 0 : volume / 100;
    setProgress(0);
    setAudioError(false);
    setSoundTrackTitle(currentTrackData.title);

    const onEnded = () => setCurrentTrack(prev => (prev + 1) % tracks.length);
    const onError = () => { setAudioError(true); setIsPlaying(false); };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [currentTrack]);

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setAudioError(true));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Volume / mute sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Progress tracking
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) setProgress(Math.floor(audioRef.current.currentTime));
      }, 1000);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setAudioError(false);
    setIsPlaying(p => {
      const next = !p;
      setSoundAmbient(next);
      return next;
    });
  };

  // Clicking the music icon directly plays/pauses music AND toggles ambient loop
  const handleIconClick = () => {
    setAudioError(false);
    setIsPlaying(p => {
      const next = !p;
      if (next) setIsOpen(true);
      setSoundAmbient(next);
      return next;
    });
  };

  const handleNext = () => {
    setIsPlaying(false);
    setTimeout(() => { setCurrentTrack(prev => (prev + 1) % tracks.length); setIsPlaying(true); setSoundAmbient(true); }, 100);
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setTimeout(() => { setCurrentTrack(prev => (prev - 1 + tracks.length) % tracks.length); setIsPlaying(true); setSoundAmbient(true); }, 100);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) { audioRef.current.currentTime = value[0]; setProgress(value[0]); }
  };

  const selectTrack = (index: number) => {
    setIsPlaying(false);
    setTimeout(() => { setCurrentTrack(index); setIsPlaying(true); setSoundAmbient(true); }, 100);
  };

  return (
    <>
      {/* Music icon: single-click = play/pause; panel toggle via ChevronDown button */}
      <div className="fixed bottom-4 left-4 z-40 flex items-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleIconClick}
          className={`rounded-full w-12 h-12 transition-all ${
            isPlaying ? 'animate-pulse-purple bg-purple-500/20' : 'glass-panel'
          }`}
          title={isPlaying ? 'Pause Music' : 'Play Casino Music'}
        >
          <Music className={`w-5 h-5 ${isPlaying ? 'text-purple-400' : ''}`} />
        </Button>

        {/* Small chevron to open/close the panel without affecting playback */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(p => !p)}
          className="glass-panel rounded-full w-6 h-6 mb-0.5 opacity-60 hover:opacity-100 transition-opacity"
          title="Open music controls"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-0' : 'rotate-180'}`} />
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-20 left-4 z-40 w-80 glass-panel-strong rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm">Casino Music</span>
              {isPlaying && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('casino')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'casino'
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Casino Tracks
            </button>
            <button
              onClick={() => setActiveTab('liveone')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'liveone'
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              LiveOne
            </button>
          </div>

          {activeTab === 'casino' && (
            <>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
                    <Music className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-white">{currentTrackData.title}</div>
                    <div className="text-sm text-gray-400">{currentTrackData.artist}</div>
                    <div className="text-xs text-purple-400">{currentTrackData.genre}</div>
                    {audioError && <div className="text-xs text-red-400 mt-0.5">Stream error — try next track</div>}
                  </div>
                </div>

                <div className="mb-4">
                  <Slider
                    value={[progress]}
                    max={currentTrackData.duration}
                    step={1}
                    onValueChange={handleSeek}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(currentTrackData.duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mb-4">
                  <Button variant="ghost" size="icon" onClick={handlePrevious} className="hover:bg-white/10">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handlePlayPause}
                    className="w-12 h-12 rounded-full btn-primary flex items-center justify-center"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNext} className="hover:bg-white/10">
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setSoundMuted(!getSoundMuted())} className="h-8 w-8 flex-shrink-0">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={(value) => {
                      setSoundVolume(value[0] / 100);
                      if (value[0] === 0) setSoundMuted(true);
                      else if (isMuted) setSoundMuted(false);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 max-h-40 overflow-y-auto">
                <div className="p-2 text-xs text-gray-400 flex items-center gap-2">
                  <ListMusic className="w-3 h-3" />
                  Playlist ({tracks.length} tracks)
                </div>
                {tracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => selectTrack(index)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between ${
                      currentTrack === index ? 'bg-purple-500/20 text-purple-400' : 'text-gray-300'
                    }`}
                  >
                    <span className="truncate">{track.title}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTime(track.duration)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'liveone' && (
            <div className="flex flex-col items-center gap-2 p-2">
              <div
                className="w-full rounded-xl overflow-hidden flex flex-col items-center"
                style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0620 100%)', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                <div className="flex items-center gap-2 py-2 px-3 w-full" style={{ borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff' }}
                  >
                    L1
                  </div>
                  <div className="font-bold text-white text-sm">LiveOne</div>
                  <div className="text-[10px] text-gray-400 ml-auto">Stream while you play</div>
                </div>
                <iframe
                  src="https://play.liveone.com"
                  title="LiveOne Music"
                  className="w-full border-0"
                  style={{ height: 420, background: '#0d0620' }}
                  allow="autoplay; encrypted-media"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
              <p className="text-[10px] text-gray-600 text-center">
                Stream music directly without leaving the casino.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
