import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { AvatarSprite } from '@/components/AvatarSprite';
import type { AvatarDef } from '@/components/AvatarSprite';

interface PlayerAvatarProps {
  name: string;
  balance: number;
  avatar?: string;
  avatarDef?: AvatarDef;
  isActive?: boolean;
  isTalking?: boolean;
  onTalkStart?: () => void;
  onTalkEnd?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showTalkButton?: boolean;
}

const sizeConfig = {
  sm: { avatar: 32, font: 'text-xs', balanceFont: 'text-[10px]' },
  md: { avatar: 48, font: 'text-sm', balanceFont: 'text-xs' },
  lg: { avatar: 64, font: 'text-base', balanceFont: 'text-sm' },
};

export function PlayerAvatar({
  name,
  balance,
  avatar,
  avatarDef,
  isActive = false,
  isTalking = false,
  onTalkStart,
  onTalkEnd,
  size = 'md',
  showTalkButton = true,
}: PlayerAvatarProps) {
  const [isPressed, setIsPressed] = useState(false);
  const config = sizeConfig[size];

  const handleMouseDown = () => {
    setIsPressed(true);
    onTalkStart?.();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    onTalkEnd?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    onTalkStart?.();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(false);
    onTalkEnd?.();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Avatar with talk button */}
      <div className="relative">
        {/* Avatar image, sprite, or placeholder */}
        {avatarDef ? (
          <AvatarSprite
            avatar={avatarDef}
            size={config.avatar}
            active={isActive}
            className={`${isTalking ? 'ring-2 ring-[#43A047] ring-offset-2 ring-offset-black' : ''}`}
          />
        ) : (
          <div
            className={`rounded-full overflow-hidden flex items-center justify-center font-bold transition-all ${
              isTalking ? 'ring-2 ring-[#43A047] ring-offset-2 ring-offset-black' : ''
            } ${isActive ? 'ring-2 ring-[#D4AF37]' : ''}`}
            style={{
              width: config.avatar,
              height: config.avatar,
              background: avatar
                ? `url(${avatar}) center/cover`
                : 'linear-gradient(135deg, #5D4037, #3E2723)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            {!avatar && (
              <span className="text-white/80" style={{ fontSize: config.avatar * 0.4 }}>
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Press to talk button */}
        {showTalkButton && (
          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isPressed
                ? 'bg-[#43A047] scale-110'
                : 'bg-[#5D4037] hover:bg-[#6D5047]'
            }`}
            style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
            title="Hold to talk"
          >
            {isPressed ? (
              <Mic className="w-3 h-3 text-white" />
            ) : (
              <MicOff className="w-3 h-3 text-[#C0C0C0]" />
            )}
          </button>
        )}

        {/* Talking indicator */}
        {isTalking && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#43A047] rounded-full animate-pulse" />
        )}
      </div>

      {/* Name and balance */}
      <div className="flex flex-col items-center">
        <span className={`${config.font} font-medium text-white truncate max-w-[80px]`}>
          {name}
        </span>
        <span className={`${config.balanceFont} text-[#D4AF37]`}>
          {balance.toLocaleString()} $Pc
        </span>
      </div>
    </div>
  );
}

export default PlayerAvatar;
