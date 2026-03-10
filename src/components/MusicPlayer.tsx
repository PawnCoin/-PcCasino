import { useState, useEffect } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre: string;
}

const tracks: Track[] = [
  { id: '1', title: 'Casino Nights', artist: 'Lounge Masters', duration: 240, genre: 'Lounge' },
  { id: '2', title: 'High Roller', artist: 'Vegas Beats', duration: 195, genre: 'Electronic' },
  { id: '3', title: 'Royal Flush', artist: 'Poker Jazz', duration: 280, genre: 'Jazz' },
  { id: '4', title: 'Jackpot Dreams', artist: 'Slot Symphony', duration: 210, genre: 'Ambient' },
  { id: '5', title: 'Vegas Lights', artist: 'Neon Collective', duration: 225, genre: 'Electronic' },
];

export function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);

  const currentTrackData = tracks[currentTrack];

  // Simulate progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= currentTrackData.duration) {
            // Auto skip to next track
            setCurrentTrack((prevTrack) => (prevTrack + 1) % tracks.length);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrackData.duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
    setProgress(0);
  };

  const handlePrevious = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
    setProgress(0);
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 left-4 z-40 rounded-full w-12 h-12 transition-all ${
          isPlaying ? 'animate-pulse-purple bg-purple-500/20' : 'glass-panel'
        }`}
      >
        <Music className="w-5 h-5" />
      </Button>

      {/* Player Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 z-40 w-80 glass-panel-strong rounded-2xl border border-purple-500/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm">Music Player</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>

          {/* Now Playing */}
          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Music className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{currentTrackData.title}</div>
                <div className="text-sm text-gray-400">{currentTrackData.artist}</div>
                <div className="text-xs text-purple-400">{currentTrackData.genre}</div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <Slider
                value={[progress]}
                max={currentTrackData.duration}
                step={1}
                onValueChange={(value) => setProgress(value[0])}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(currentTrackData.duration)}</span>
              </div>
            </div>

            {/* Controls */}
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

            {/* Volume */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(value) => {
                  setVolume(value[0]);
                  setIsMuted(value[0] === 0);
                }}
                className="flex-1"
              />
            </div>
          </div>

          {/* Playlist */}
          <div className="border-t border-white/10 max-h-40 overflow-y-auto">
            <div className="p-2 text-xs text-gray-400 flex items-center gap-2">
              <ListMusic className="w-3 h-3" />
              Playlist ({tracks.length} tracks)
            </div>
            {tracks.map((track, index) => (
              <button
                key={track.id}
                onClick={() => {
                  setCurrentTrack(index);
                  setProgress(0);
                  setIsPlaying(true);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between ${
                  currentTrack === index ? 'bg-purple-500/20 text-purple-400' : ''
                }`}
              >
                <span className="truncate">{track.title}</span>
                <span className="text-xs text-gray-500">{formatTime(track.duration)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
