import { useState } from 'react';
import { Tv, X, Maximize2, Minimize2, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VappTVPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const channels = [
  { id: 'sports', name: 'Sports Central', category: 'Sports', thumbnail: '🏈' },
  { id: 'movies', name: 'Cinema HD', category: 'Movies', thumbnail: '🎬' },
  { id: 'music', name: 'Music TV', category: 'Music', thumbnail: '🎵' },
  { id: 'news', name: '24/7 News', category: 'News', thumbnail: '📰' },
  { id: 'gaming', name: 'Esports TV', category: 'Gaming', thumbnail: '🎮' },
];

export function VappTVPlayer({ isOpen, onClose }: VappTVPlayerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(channels[0]);
  const [hasMembership, setHasMembership] = useState(false);

  if (!isOpen) return null;

  // Membership check placeholder
  if (!hasMembership) {
    return (
      <div className={`fixed z-40 transition-all duration-300 ${
        isMinimized ? 'bottom-4 right-4 w-80' : 'bottom-4 right-4 w-96'
      }`}>
        <div className="glass-panel-strong rounded-2xl overflow-hidden border border-purple-500/30">
          <div className="flex items-center justify-between p-3 bg-purple-900/30">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-sm">VappTV</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <div className="p-6 text-center">
              <Tv className="w-16 h-16 mx-auto mb-4 text-purple-400/50" />
              <h3 className="font-bold text-lg mb-2">VappTV Membership Required</h3>
              <p className="text-sm text-gray-400 mb-4">
                Watch live TV while playing your favorite games
              </p>
              <Button className="btn-primary w-full">
                Get Membership
              </Button>
              <button 
                onClick={() => setHasMembership(true)} 
                className="text-xs text-gray-500 mt-3 hover:text-purple-400"
              >
                Demo: Skip membership check
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed z-40 transition-all duration-300 ${
      isMinimized ? 'bottom-4 right-4 w-80' : 'bottom-4 right-4 w-[480px]'
    }`}>
      <div className="glass-panel-strong rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-purple-900/30">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-sm">{currentChannel.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Video Placeholder */}
            <div className="aspect-video bg-black relative flex items-center justify-center">
              <div className="text-center">
                {!isPlaying ? (
                  <>
                    <div className="text-6xl mb-4">{currentChannel.thumbnail}</div>
                    <Button 
                      onClick={() => setIsPlaying(true)}
                      className="btn-primary rounded-full px-6"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play {currentChannel.name}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-pulse text-purple-400 mb-2">● LIVE</div>
                        <div className="text-4xl">{currentChannel.thumbnail}</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsPlaying(false)}
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-4 left-4 bg-black/50 hover:bg-black/70"
                    >
                      <Pause className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Channel List */}
            <div className="p-3 border-t border-white/10">
              <div className="text-xs text-gray-400 mb-2">Channels</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setCurrentChannel(channel);
                      setIsPlaying(false);
                    }}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentChannel.id === channel.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-1">{channel.thumbnail}</span>
                    {channel.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
