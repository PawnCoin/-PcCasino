import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

const g = {
  gold1: '#D4AF37',
  gold2: '#F4D03F',
  gold3: '#B8860B',
  dark: '#1a1a1a',
  darker: '#0a0a0a',
  green: '#1B5E20',
  red: '#B71C1C',
};

function Svg({ size = 24, className, style, color, children, vb = '0 0 24 24' }: IconProps & { children: React.ReactNode; vb?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, color: color || 'inherit', ...style }}
    >
      <defs>
        <linearGradient id="casinoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={g.gold2} />
          <stop offset="50%" stopColor={g.gold1} />
          <stop offset="100%" stopColor={g.gold3} />
        </linearGradient>
        <linearGradient id="casinoGoldV" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={g.gold2} />
          <stop offset="100%" stopColor={g.gold3} />
        </linearGradient>
        <radialGradient id="casinoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={g.gold1} stopOpacity="0.4" />
          <stop offset="100%" stopColor={g.gold1} stopOpacity="0" />
        </radialGradient>
      </defs>
      {children}
    </svg>
  );
}

function FireIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2c0 4-3 6-3 10a5 5 0 0010 0c0-4-3-6-5-10-1 2-2 3-2 3s-1-1.5 0-3z" fill="url(#casinoGold)" />
      <path d="M12 14a2 2 0 01-2-2c0-1.5 2-4 2-4s2 2.5 2 4a2 2 0 01-2 2z" fill={g.gold2} opacity="0.9" />
    </Svg>
  );
}

function MoneyBagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2l-2 3h4l-2-3z" fill={g.gold2} />
      <path d="M7 7c-2 3-3 6-3 9 0 4 3.5 6 8 6s8-2 8-6c0-3-1-6-3-9H7z" fill="url(#casinoGold)" />
      <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="900" fill={g.darker} fontFamily="serif">$</text>
    </Svg>
  );
}

function CrownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 18h18v2H3zM3 16l3-8 3 4 3-6 3 6 3-4 3 8H3z" fill="url(#casinoGold)" />
      <circle cx="6" cy="8" r="1" fill={g.gold2} />
      <circle cx="12" cy="6" r="1" fill={g.gold2} />
      <circle cx="18" cy="8" r="1" fill={g.gold2} />
    </Svg>
  );
}

function GemIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h12l4 7-10 12L2 10l4-7z" fill="url(#casinoGold)" />
      <path d="M2 10h20L12 22 2 10z" fill={g.gold3} opacity="0.6" />
      <path d="M6 3l4 7H2l4-7zM18 3l4 7h-8l4-7z" fill={g.gold2} opacity="0.4" />
      <path d="M6 3h12l-3 7H9l-3-7z" fill={g.gold2} opacity="0.7" />
    </Svg>
  );
}

function SkullIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2C7 2 4 6 4 10c0 3 1.5 5 3 6v3h2v-2h6v2h2v-3c1.5-1 3-3 3-6 0-4-3-8-8-8z" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="2" fill={g.darker} />
      <circle cx="15" cy="10" r="2" fill={g.darker} />
      <path d="M10 15h4v1h-4z" fill={g.darker} />
      <path d="M9 15v2M11 15v2M13 15v2M15 15v2" stroke={g.darker} strokeWidth="0.7" />
    </Svg>
  );
}

function ClapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 11l4-7c.5-.8 1.5-.5 1.5.3L11 8l3-5c.5-.8 1.5-.5 1.5.3L14 8l2-3c.4-.6 1.3-.3 1.2.4L16 10" stroke="url(#casinoGold)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M16 10c1.5 0 2.5 1 2.5 2.5S17 16 14 19H9c-3-3-4-5-4-7.5S6.5 8 8 9l3 3" stroke="url(#casinoGold)" strokeWidth="1.5" fill="url(#casinoGold)" fillOpacity="0.3" strokeLinecap="round" />
      <line x1="4" y1="5" x2="5" y2="7" stroke={g.gold2} strokeWidth="1" />
      <line x1="19" y1="5" x2="18" y2="7" stroke={g.gold2} strokeWidth="1" />
    </Svg>
  );
}

function LaughIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <path d="M8 9v2M16 9v2" stroke={g.darker} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14c1.5 2 6.5 2 8 0" stroke={g.darker} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function SaluteIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1" fill={g.darker} />
      <circle cx="15" cy="10" r="1" fill={g.darker} />
      <path d="M9 15c1 1.5 5 1.5 6 0" stroke={g.darker} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M17 5l3-2" stroke={g.gold3} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 7l5-3" stroke={g.gold1} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function AngryIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <path d="M7 8l3 2M17 8l-3 2" stroke={g.darker} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="11" r="1" fill={g.darker} />
      <circle cx="15" cy="11" r="1" fill={g.darker} />
      <path d="M9 16c1.5-1 4.5-1 6 0" stroke={g.darker} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function MoneyFaceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <text x="9" y="12" textAnchor="middle" fontSize="6" fontWeight="900" fill={g.darker}>$</text>
      <text x="15" y="12" textAnchor="middle" fontSize="6" fontWeight="900" fill={g.darker}>$</text>
      <path d="M8 16c2 2 6 2 8 0" stroke={g.darker} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function ShakaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 8v7c0 2 1.5 3.5 3.5 3.5H15c1.5 0 3-1 3-2.5V12c0-1-.8-1.8-1.8-1.8-.5 0-1 .2-1.2.5V9c0-1-.8-1.8-1.8-1.8-.5 0-1 .2-1.2.5V8c0-1-.8-1.8-1.8-1.8-1 0-1.8.8-1.8 1.8v3l-1-2c-.6-.8-1.8-.5-2 .5L6 11" fill="url(#casinoGold)" stroke={g.gold3} strokeWidth="0.5" />
    </Svg>
  );
}

function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 2h12v2c0 4-2 8-6 9-4-1-6-5-6-9V2z" fill="url(#casinoGold)" />
      <path d="M6 4H3c0 3 1.5 5 3 5M18 4h3c0 3-1.5 5-3 5" stroke={g.gold1} strokeWidth="1.5" fill="none" />
      <rect x="9" y="13" width="6" height="2" fill={g.gold3} />
      <rect x="7" y="15" width="10" height="2" rx="1" fill="url(#casinoGold)" />
      <path d="M10 6l1 2h2l1-2-1.5 1.5L12 6l-.5 1.5L10 6z" fill={g.darker} opacity="0.3" />
    </Svg>
  );
}

function StarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2l3 6.5L22 10l-5.5 4.5L18 22l-6-3.5L6 22l1.5-7.5L2 10l7-1.5L12 2z" fill="url(#casinoGold)" />
    </Svg>
  );
}

function SparkleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" fill="url(#casinoGold)" />
      <path d="M18 14l.8 2.5L21.5 17.5l-2.7.8L18 21l-.8-2.7-2.7-.8 2.7-.8L18 14z" fill={g.gold2} opacity="0.7" />
      <path d="M5 14l.5 1.8 1.8.5-1.8.5L5 18.5l-.5-1.7-1.8-.5 1.8-.5L5 14z" fill={g.gold2} opacity="0.5" />
    </Svg>
  );
}

function WarningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2L1 21h22L12 2z" fill="url(#casinoGold)" />
      <text x="12" y="18" textAnchor="middle" fontSize="12" fontWeight="900" fill={g.darker}>!</text>
    </Svg>
  );
}

function CelebrateIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21l3-10 7 7-10 3z" fill="url(#casinoGold)" />
      <path d="M9.5 12.5l2-5M11 13l5-2" stroke={g.gold2} strokeWidth="1" strokeLinecap="round" />
      <circle cx="14" cy="5" r="1.5" fill={g.gold2} />
      <circle cx="18" cy="9" r="1" fill={g.gold1} />
      <circle cx="20" cy="4" r="1" fill={g.gold3} />
      <path d="M15 2l1 2M19 6l2 1M17 2l.5 1.5" stroke={g.gold2} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

function ConfettiIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="4" height="3" rx="0.5" fill={g.gold1} transform="rotate(-15 5 7.5)" />
      <rect x="17" y="4" width="4" height="3" rx="0.5" fill={g.gold2} transform="rotate(20 19 5.5)" />
      <rect x="10" y="2" width="3" height="2.5" rx="0.5" fill={g.gold3} transform="rotate(-5 11.5 3.25)" />
      <circle cx="7" cy="14" r="1.5" fill={g.gold2} />
      <circle cx="16" cy="12" r="1" fill={g.gold1} />
      <circle cx="19" cy="16" r="1.5" fill={g.gold3} />
      <path d="M5 18l2-3M12 16l1-4M18 19l1-3" stroke={g.gold1} strokeWidth="1" strokeLinecap="round" />
      <path d="M9 19l.5-2M15 20l.5-2" stroke={g.gold2} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

function CardsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="12" height="16" rx="1.5" fill={g.dark} stroke={g.gold1} strokeWidth="1" transform="rotate(-8 9 12)" />
      <rect x="9" y="4" width="12" height="16" rx="1.5" fill={g.dark} stroke={g.gold1} strokeWidth="1" transform="rotate(8 15 12)" />
      <text x="7" y="14" textAnchor="middle" fontSize="8" fontWeight="900" fill={g.gold1} transform="rotate(-8 7 14)">A</text>
      <text x="17" y="14" textAnchor="middle" fontSize="8" fontWeight="900" fill={g.gold2} transform="rotate(8 17 14)">K</text>
    </Svg>
  );
}

function SpadeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c-4 4-8 7-8 11 0 3 2 5 5 4.5-.5 1.5-1.5 2.5-3 3.5h12c-1.5-1-2.5-2-3-3.5 3 .5 5-1.5 5-4.5 0-4-4-7-8-11z" fill="url(#casinoGold)" />
    </Svg>
  );
}

function DiceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="url(#casinoGold)" />
      <circle cx="7" cy="7" r="1.5" fill={g.darker} />
      <circle cx="17" cy="7" r="1.5" fill={g.darker} />
      <circle cx="12" cy="12" r="1.5" fill={g.darker} />
      <circle cx="7" cy="17" r="1.5" fill={g.darker} />
      <circle cx="17" cy="17" r="1.5" fill={g.darker} />
    </Svg>
  );
}

function SlotMachineIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1.2" />
      <rect x="5" y="7" width="4" height="6" rx="0.5" fill={g.darker} stroke={g.gold3} strokeWidth="0.5" />
      <rect x="10" y="7" width="4" height="6" rx="0.5" fill={g.darker} stroke={g.gold3} strokeWidth="0.5" />
      <rect x="15" y="7" width="4" height="6" rx="0.5" fill={g.darker} stroke={g.gold3} strokeWidth="0.5" />
      <text x="7" y="12" textAnchor="middle" fontSize="5" fontWeight="900" fill={g.gold1}>7</text>
      <text x="12" y="12" textAnchor="middle" fontSize="5" fontWeight="900" fill={g.gold2}>7</text>
      <text x="17" y="12" textAnchor="middle" fontSize="5" fontWeight="900" fill={g.gold1}>7</text>
      <rect x="3" y="15" width="18" height="2" fill={g.gold3} opacity="0.3" />
      <circle cx="20" cy="10" r="1.5" fill={g.gold1} />
    </Svg>
  );
}

function PoolBallIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="12" cy="12" r="4.5" fill="white" />
      <text x="12" y="14.5" textAnchor="middle" fontSize="6" fontWeight="900" fill={g.darker}>8</text>
      <ellipse cx="9" cy="8" rx="3" ry="1.5" fill="white" opacity="0.3" transform="rotate(-20 9 8)" />
    </Svg>
  );
}

function HorseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 3c-1 0-2 1-3 2l-2 3h-3c-2 0-3 1-4 3l-2 5c-.5 1.5 0 3 1.5 3h1l1-3 2 6h2l-1-5 3-1 2 6h2l-1-7c1-1 2-3 2-5V5c0-1-1-2-2-2h-1z" fill="url(#casinoGold)" />
      <circle cx="16" cy="6" r="0.8" fill={g.darker} />
    </Svg>
  );
}

function TargetIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={g.gold1} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="none" stroke={g.gold2} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill={g.gold2} />
    </Svg>
  );
}

function DominoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="2" width="16" height="20" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={g.gold3} strokeWidth="1" />
      <circle cx="9" cy="7" r="1.5" fill={g.gold1} />
      <circle cx="15" cy="7" r="1.5" fill={g.gold1} />
      <circle cx="12" cy="17" r="1.5" fill={g.gold1} />
    </Svg>
  );
}

function FootballIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="12" rx="10" ry="7" fill="url(#casinoGold)" transform="rotate(-30 12 12)" />
      <path d="M8 8l8 8M10 7l-2 3M14 17l2-3" stroke={g.darker} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="9" x2="15" y2="15" stroke={g.darker} strokeWidth="0.8" opacity="0.3" />
    </Svg>
  );
}

function SoccerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <path d="M12 2l2.5 4.5h5L17 10l2 4h-5L12 18l-2-4H5l2-4-2.5-3.5h5L12 2z" fill={g.gold3} opacity="0.4" />
    </Svg>
  );
}

function AgeRestrictedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={g.gold1} strokeWidth="2" />
      <line x1="4" y1="4" x2="20" y2="20" stroke={g.gold1} strokeWidth="2" />
      <text x="12" y="14.5" textAnchor="middle" fontSize="7" fontWeight="900" fill={g.gold1}>18</text>
    </Svg>
  );
}

function SmileIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1" fill={g.darker} />
      <circle cx="15" cy="10" r="1" fill={g.darker} />
      <path d="M8 14c1.5 2 6.5 2 8 0" stroke={g.darker} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function SadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1" fill={g.darker} />
      <circle cx="15" cy="10" r="1" fill={g.darker} />
      <path d="M8 16c1.5-2 6.5-2 8 0" stroke={g.darker} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function PeopleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="7" r="3" fill="url(#casinoGold)" />
      <path d="M3 20c0-3 2.5-6 6-6s6 3 6 6" fill={g.gold3} opacity="0.7" />
      <circle cx="16" cy="7" r="2.5" fill={g.gold2} />
      <path d="M12 20c0-2.5 1.8-5 4-5s4 2.5 4 5" fill={g.gold1} opacity="0.5" />
    </Svg>
  );
}

function GlobeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={g.gold1} strokeWidth="1.2" />
      <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke={g.gold1} strokeWidth="0.8" />
      <line x1="2" y1="12" x2="22" y2="12" stroke={g.gold3} strokeWidth="0.8" />
      <path d="M4 7h16M4 17h16" stroke={g.gold3} strokeWidth="0.6" />
    </Svg>
  );
}

function PersonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="7" r="4" fill="url(#casinoGold)" />
      <path d="M4 21c0-4 3.5-8 8-8s8 4 8 8" fill={g.gold3} />
    </Svg>
  );
}

function GamepadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9h12c2 0 3 1.5 3 3.5S20 16 18 17l-1 2c-.5 1-1 1.5-2 1.5s-1.5-.5-2-1.5L12 17l-1 2c-.5 1-1 1.5-2 1.5s-1.5-.5-2-1.5L6 17c-2-1-3-2.5-3-4.5S4 9 6 9z" fill="url(#casinoGold)" />
      <circle cx="8" cy="12" r="1" fill={g.darker} />
      <circle cx="16" cy="12" r="1" fill={g.darker} />
      <line x1="7" y1="12" x2="9" y2="12" stroke={g.darker} strokeWidth="0.8" />
      <line x1="8" y1="11" x2="8" y2="13" stroke={g.darker} strokeWidth="0.8" />
    </Svg>
  );
}

function GoldMedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2l2 5h-4l2 5 4-3 4 3 2-5h-4l2-5" fill={g.gold1} opacity="0.4" />
      <circle cx="12" cy="15" r="6" fill="url(#casinoGold)" stroke={g.gold2} strokeWidth="1" />
      <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="900" fill={g.darker}>1</text>
    </Svg>
  );
}

function SilverMedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2l2 5h-4l2 5 4-3 4 3 2-5h-4l2-5" fill="#C0C0C0" opacity="0.4" />
      <circle cx="12" cy="15" r="6" fill="#C0C0C0" stroke="#E0E0E0" strokeWidth="1" />
      <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="900" fill={g.darker}>2</text>
    </Svg>
  );
}

function BronzeMedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2l2 5h-4l2 5 4-3 4 3 2-5h-4l2-5" fill="#CD7F32" opacity="0.4" />
      <circle cx="12" cy="15" r="6" fill="#CD7F32" stroke="#DDA15E" strokeWidth="1" />
      <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="900" fill={g.darker}>3</text>
    </Svg>
  );
}

function DancerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="14" cy="4" r="2.5" fill="url(#casinoGold)" />
      <path d="M14 7c-1 0-2 1-3 3l-4 5c-.5.7 0 1.5.8 1.5h3l-2 5c-.3.8.3 1.5 1 1.5.3 0 .6-.1.8-.4l5-7c.5-.7 0-1.6-.8-1.6h-2l2-4" fill="url(#casinoGold)" />
      <path d="M8 10l-3 2" stroke={g.gold2} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function ChampagneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2h8l-1 10c0 1-1 2-2.5 2h-1c-1.5 0-2.5-1-2.5-2L8 2z" fill="url(#casinoGold)" />
      <rect x="11" y="14" width="2" height="4" fill={g.gold3} />
      <rect x="8" y="18" width="8" height="2" rx="1" fill="url(#casinoGold)" />
      <path d="M10 2v3M14 2v3" stroke={g.gold2} strokeWidth="0.5" opacity="0.5" />
      <circle cx="16" cy="4" r="0.8" fill={g.gold2} />
      <circle cx="18" cy="3" r="0.5" fill={g.gold1} />
      <circle cx="17" cy="6" r="0.5" fill={g.gold2} />
    </Svg>
  );
}

function EyesIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke={g.gold1} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="url(#casinoGold)" />
      <circle cx="12" cy="12" r="2" fill={g.darker} />
      <circle cx="11" cy="11" r="0.7" fill="white" opacity="0.6" />
    </Svg>
  );
}

function ShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2L3 6v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z" fill="url(#casinoGold)" />
      <path d="M12 6l-5 2.5v3c0 3.5 2.1 6.5 5 7.5 2.9-1 5-4 5-7.5v-3L12 6z" fill={g.darker} opacity="0.3" />
    </Svg>
  );
}

function LightningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 2L4 14h6l-3 8 10-12h-6l4-8h-2z" fill="url(#casinoGold)" />
    </Svg>
  );
}

function MuscleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 14c-1-3 0-6 2-8 1-1 3-2 5-1l2 1c2 1 3 3 3 5 0 1-.5 3-2 4l-1 1v3c0 1-1 2-2 2h-2c-1 0-2-1-2-2v-2c-2 0-3-1-3-2z" fill="url(#casinoGold)" />
      <path d="M9 8c0-2 2-4 4-3" stroke={g.gold2} strokeWidth="1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function ThumbsUpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 22V11H4c-1 0-2-1-2-2v-2c0-1 1-2 2-2h4l2-4c.5-1 1.5-1 2 0l.5 2c.3 1 0 2-1 2.5V11h6c1.5 0 2.5 1 2.5 2.5l-1.5 7c-.3 1-1 1.5-2 1.5H7z" fill="url(#casinoGold)" />
    </Svg>
  );
}

function OkHandIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6c-1.5 0-2.5 1-2.5 2.5 0 1 .5 1.8 1.2 2.2l-3.2 5.3c-.5.8 0 2 1 2h7c1 0 1.5-1.2 1-2l-3.2-5.3c.7-.4 1.2-1.2 1.2-2.2C14.5 7 13.5 6 12 6z" fill="url(#casinoGold)" />
      <circle cx="12" cy="8.5" r="1.5" fill="none" stroke={g.darker} strokeWidth="1" />
    </Svg>
  );
}

function HandshakeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 11l4-3 3 1 3-3 3 3 3-1 4 3" stroke="url(#casinoGold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11v6M18 11v6" stroke={g.gold3} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 14l3 3 3-3" stroke={g.gold1} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function CloverIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="7" r="4" fill={g.green} />
      <circle cx="7" cy="12" r="4" fill={g.green} />
      <circle cx="17" cy="12" r="4" fill={g.green} />
      <circle cx="12" cy="17" r="4" fill={g.green} />
      <line x1="12" y1="17" x2="12" y2="22" stroke={g.green} strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill={g.gold1} opacity="0.5" />
    </Svg>
  );
}

function CherryIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="17" r="4" fill="#c62828" stroke={g.gold3} strokeWidth="0.5" />
      <circle cx="16" cy="17" r="4" fill="#c62828" stroke={g.gold3} strokeWidth="0.5" />
      <path d="M8 13c0-5 4-9 4-11M16 13c0-5-4-9-4-11" stroke={g.green} strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="3" rx="3" ry="2" fill={g.green} />
      <circle cx="6.5" cy="15.5" r="1.5" fill="white" opacity="0.25" />
      <circle cx="14.5" cy="15.5" r="1.5" fill="white" opacity="0.25" />
    </Svg>
  );
}

function LemonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="12" rx="8" ry="6" fill="#F9A825" stroke={g.gold3} strokeWidth="0.5" transform="rotate(-30 12 12)" />
      <path d="M18 6c1-1 2-1 2.5-.5s.5 1.5-.5 2.5" stroke={g.green} strokeWidth="1.5" fill="none" />
      <ellipse cx="10" cy="10" rx="2" ry="1" fill="white" opacity="0.2" transform="rotate(-30 10 10)" />
    </Svg>
  );
}

function OrangeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13" r="8" fill="#E65100" stroke={g.gold3} strokeWidth="0.5" />
      <ellipse cx="12" cy="5" rx="2" ry="1.5" fill={g.green} />
      <circle cx="10" cy="11" r="2" fill="white" opacity="0.15" />
    </Svg>
  );
}

function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c-4 0-7 3-7 7v4l-2 2v1h18v-1l-2-2v-4c0-4-3-7-7-7z" fill="url(#casinoGold)" />
      <circle cx="12" cy="20" r="2" fill={g.gold2} />
      <path d="M10 3c0-1 1-2 2-2s2 1 2 2" stroke={g.gold1} strokeWidth="1" fill="none" />
    </Svg>
  );
}

function SevenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="3" width="16" height="18" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="900" fill="url(#casinoGold)" fontFamily="serif">7</text>
    </Svg>
  );
}

function BingoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <text x="12" y="10" textAnchor="middle" fontSize="5" fontWeight="900" fill={g.gold1} letterSpacing="1">BINGO</text>
      <g fill={g.gold1}>
        <circle cx="7" cy="14" r="1.2" /><circle cx="12" cy="14" r="1.2" /><circle cx="17" cy="14" r="1.2" />
        <circle cx="7" cy="18" r="1.2" /><circle cx="12" cy="18" r="1.2" /><circle cx="17" cy="18" r="1.2" />
      </g>
    </Svg>
  );
}

function SmirkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1" fill={g.darker} />
      <circle cx="15" cy="9" r="1" fill={g.darker} />
      <path d="M15 9c.5-.5 1-1 1.5-.5" stroke={g.darker} strokeWidth="0.8" fill="none" />
      <path d="M9 15c2 1.5 5 .5 6-1" stroke={g.darker} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function ScaredIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1.5" fill={g.darker} />
      <circle cx="15" cy="10" r="1.5" fill={g.darker} />
      <circle cx="12" cy="16" r="2" fill={g.darker} />
    </Svg>
  );
}

function GrimaceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1" fill={g.darker} />
      <circle cx="15" cy="10" r="1" fill={g.darker} />
      <rect x="7" y="14" width="10" height="3" rx="1.5" fill={g.darker} />
      <line x1="9" y1="14" x2="9" y2="17" stroke={g.gold1} strokeWidth="0.5" />
      <line x1="11" y1="14" x2="11" y2="17" stroke={g.gold1} strokeWidth="0.5" />
      <line x1="13" y1="14" x2="13" y2="17" stroke={g.gold1} strokeWidth="0.5" />
      <line x1="15" y1="14" x2="15" y2="17" stroke={g.gold1} strokeWidth="0.5" />
    </Svg>
  );
}

function FistIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 7c0-1 .8-2 2-2s2 1 2 2v3h2V7c0-1 .8-2 2-2s2 1 2 2v6c0 4-2 7-5 7h-2c-3 0-5-3-5-7V9c0-1 .8-2 2-2s2 1 2 2" fill="url(#casinoGold)" stroke={g.gold3} strokeWidth="0.5" />
    </Svg>
  );
}

function ShuffleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 7h4l4 5-4 5H2" stroke={g.gold1} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 7h-4l-4 5 4 5h4" stroke={g.gold1} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17l6-5M22 17l-6-5" stroke={g.gold3} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M19 4l3 3-3 3M19 14l3 3-3 3" fill={g.gold1} />
    </Svg>
  );
}

function CrystalBallIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="11" r="8" fill="none" stroke={g.gold1} strokeWidth="1.2" />
      <circle cx="12" cy="11" r="6" fill="rgba(160,32,240,0.3)" />
      <ellipse cx="10" cy="9" rx="2" ry="1.5" fill="white" opacity="0.2" />
      <rect x="6" y="19" width="12" height="2" rx="1" fill="url(#casinoGold)" />
    </Svg>
  );
}

function GearIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" fill="none" stroke={g.gold1} strokeWidth="1.5" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke={g.gold1} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function SnowflakeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <line x1="12" y1="2" x2="12" y2="22" stroke={g.gold1} strokeWidth="1.5" />
      <line x1="2" y1="12" x2="22" y2="12" stroke={g.gold1} strokeWidth="1.5" />
      <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" stroke={g.gold1} strokeWidth="1" />
      <line x1="19.1" y1="4.9" x2="4.9" y2="19.1" stroke={g.gold1} strokeWidth="1" />
      <circle cx="12" cy="12" r="2" fill={g.gold2} />
    </Svg>
  );
}

function AtomIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2" fill={g.gold1} />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke={g.gold1} strokeWidth="1" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke={g.gold2} strokeWidth="0.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke={g.gold3} strokeWidth="0.8" transform="rotate(-60 12 12)" />
    </Svg>
  );
}

function HourglassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="2" width="14" height="2" rx="1" fill="url(#casinoGold)" />
      <rect x="5" y="20" width="14" height="2" rx="1" fill="url(#casinoGold)" />
      <path d="M7 4l5 8-5 8M17 4l-5 8 5 8" stroke={g.gold1} strokeWidth="1.2" fill="none" />
      <path d="M9 6h6l-3 4-3-4z" fill={g.gold1} opacity="0.4" />
    </Svg>
  );
}

function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="url(#casinoGold)" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke={g.gold1} strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="16" r="1.5" fill={g.darker} />
    </Svg>
  );
}

function BasketballIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <path d="M2 12h20M12 2v20M5 4c3 3 3 13 0 16M19 4c-3 3-3 13 0 16" stroke={g.darker} strokeWidth="1" fill="none" opacity="0.4" />
    </Svg>
  );
}

function BoxingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 8c-1 0-2 1-2 2v5c0 2 1.5 3.5 3.5 3.5H11c2 0 3-1 3-3v-4c0-2-1.5-3.5-3.5-3.5H6z" fill="url(#casinoGold)" />
      <path d="M9 8V5c0-1 1-2 2-2h1c1 0 2 1 2 2v3" stroke={g.gold3} strokeWidth="1.2" fill="none" />
      <path d="M11 12h3" stroke={g.darker} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function OilBarrelIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <line x1="5" y1="7" x2="19" y2="7" stroke={g.gold1} strokeWidth="1" />
      <line x1="5" y1="17" x2="19" y2="17" stroke={g.gold1} strokeWidth="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="url(#casinoGold)" opacity="0.5" />
    </Svg>
  );
}

function FoxIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 3l4 8-2 3h12l-2-3 4-8-6 4h-4L4 3z" fill="url(#casinoGold)" />
      <path d="M6 14v4c0 2 2.5 3 6 3s6-1 6-3v-4H6z" fill={g.gold3} />
      <circle cx="10" cy="11" r="1" fill={g.darker} />
      <circle cx="14" cy="11" r="1" fill={g.darker} />
      <path d="M11 14h2l-1 1.5-1-1.5z" fill={g.darker} />
    </Svg>
  );
}

function GhostIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2C7.5 2 4 5.5 4 10v10l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V10c0-4.5-3.5-8-8-8z" fill="url(#casinoGold)" />
      <circle cx="9" cy="10" r="1.5" fill={g.darker} />
      <circle cx="15" cy="10" r="1.5" fill={g.darker} />
    </Svg>
  );
}

function CircleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <circle cx="12" cy="12" r="6" fill={g.darker} opacity="0.3" />
    </Svg>
  );
}

function LinkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 14a3.5 3.5 0 005-5l-1-1" stroke={g.gold1} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M14 10a3.5 3.5 0 00-5 5l1 1" stroke={g.gold2} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function ChartDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 3v18h18" stroke={g.gold1} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M7 10l4 4 3-3 5 5" stroke={g.red} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 16l4 0 0-4" stroke={g.red} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function DocumentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 2h8l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <path d="M14 2v5h5" stroke={g.gold1} strokeWidth="1" fill="none" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={g.gold3} strokeWidth="0.8" />
      <line x1="8" y1="15" x2="14" y2="15" stroke={g.gold3} strokeWidth="0.8" />
    </Svg>
  );
}

function SelfieIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1" />
      <circle cx="12" cy="10" r="3" fill="url(#casinoGold)" />
      <path d="M8 16c0-2 1.8-3 4-3s4 1 4 3" fill={g.gold3} />
      <circle cx="12" cy="4" r="0.8" fill={g.gold1} />
    </Svg>
  );
}

function ProhibitedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={g.gold1} strokeWidth="2" />
      <line x1="5" y1="5" x2="19" y2="19" stroke={g.gold1} strokeWidth="2" />
    </Svg>
  );
}

function PointIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c-1 0-2 1-2 2v8l-3 3c-.5.5-.2 1.3.5 1.3h9c.7 0 1-.8.5-1.3l-3-3V5c0-1-1-2-2-2z" fill="url(#casinoGold)" />
      <path d="M9 20h6" stroke={g.gold1} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function MaskIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8c0-2 4-4 9-4s9 2 9 4v3c0 5-4 9-9 9s-9-4-9-9V8z" fill="url(#casinoGold)" />
      <path d="M7 10c0-1 1-2 2.5-2s2.5 1 2.5 2" stroke={g.darker} strokeWidth="1.2" fill="none" />
      <path d="M11.5 10c0-1 1-2 2.5-2s2.5 1 2.5 2" stroke={g.darker} strokeWidth="1.2" fill="none" />
      <path d="M10 15c1 1 3 1 4 0" stroke={g.darker} strokeWidth="1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function SwordIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <line x1="5" y1="19" x2="17" y2="3" stroke={g.gold1} strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="13" x2="15" y2="13" stroke={g.gold2} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="15" x2="13" y2="11" stroke={g.gold3} strokeWidth="1" />
    </Svg>
  );
}

function CheckmarkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="url(#casinoGold)" />
      <path d="M7 12l3 3 7-7" stroke={g.darker} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HeartSuitIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21l-1.5-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.2L12 21z" fill="#c62828" />
    </Svg>
  );
}

function DiamondSuitIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2l8 10-8 10-8-10L12 2z" fill="#c62828" />
    </Svg>
  );
}

function ClubSuitIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" fill={g.dark} stroke={g.gold1} strokeWidth="0.5" />
      <circle cx="7" cy="13" r="4" fill={g.dark} stroke={g.gold1} strokeWidth="0.5" />
      <circle cx="17" cy="13" r="4" fill={g.dark} stroke={g.gold1} strokeWidth="0.5" />
      <path d="M10 17l2 5 2-5" fill={g.dark} />
    </Svg>
  );
}

function FourthPlaceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="15" r="6" fill={g.dark} stroke={g.gold3} strokeWidth="1" />
      <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="900" fill={g.gold3}>4</text>
    </Svg>
  );
}

function RouletteWheelIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill={g.dark} stroke={g.gold1} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={g.gold1} strokeWidth="0.8" />
      <circle cx="12" cy="12" r="3" fill="url(#casinoGold)" />
      <line x1="12" y1="2" x2="12" y2="5" stroke={g.gold1} strokeWidth="0.8" />
      <line x1="12" y1="19" x2="12" y2="22" stroke={g.gold1} strokeWidth="0.8" />
      <line x1="2" y1="12" x2="5" y2="12" stroke={g.gold1} strokeWidth="0.8" />
      <line x1="19" y1="12" x2="22" y2="12" stroke={g.gold1} strokeWidth="0.8" />
      <line x1="4.9" y1="4.9" x2="7" y2="7" stroke={g.gold3} strokeWidth="0.6" />
      <line x1="17" y1="17" x2="19.1" y2="19.1" stroke={g.gold3} strokeWidth="0.6" />
      <line x1="19.1" y1="4.9" x2="17" y2="7" stroke={g.gold3} strokeWidth="0.6" />
      <line x1="7" y1="17" x2="4.9" y2="19.1" stroke={g.gold3} strokeWidth="0.6" />
    </Svg>
  );
}

function PartyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 21L3 3l7.5 7.5L18 3l-2.5 18" fill="none" stroke={p.color || g.gold1} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7" cy="8" r="1.5" fill={p.color || g.gold2} />
      <circle cx="17" cy="8" r="1.5" fill={p.color || g.gold2} />
      <circle cx="12" cy="5" r="1.5" fill={p.color || g.gold1} />
      <path d="M8 14l4-3 4 3" fill="none" stroke={p.color || g.gold1} strokeWidth="1.2" />
    </Svg>
  );
}

function WaveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 12c0-2 1-3 2.5-3s2 1.5 2 3c0-2.5 1-4 2.5-4s2.5 1.5 2.5 4v2c0 3-2 5-5.5 5S4 18 4 15v-1c0-2 1-3.5 3-3.5" fill="none" stroke={p.color || g.gold1} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 10c1-1 2-1.5 3-1" fill="none" stroke={p.color || g.gold2} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M19 7c0.5-1 1.5-1.5 2.5-1" fill="none" stroke={p.color || g.gold2} strokeWidth="1" strokeLinecap="round" />
    </Svg>
  );
}

function ShockedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill={g.dark} stroke={p.color || g.gold1} strokeWidth="1.5" />
      <circle cx="8.5" cy="9.5" r="1.8" fill="none" stroke={p.color || g.gold1} strokeWidth="1.2" />
      <circle cx="15.5" cy="9.5" r="1.8" fill="none" stroke={p.color || g.gold1} strokeWidth="1.2" />
      <ellipse cx="12" cy="16" rx="2.5" ry="3" fill="none" stroke={p.color || g.gold1} strokeWidth="1.5" />
    </Svg>
  );
}

function RocketIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2c-2 4-2 8-2 12h4c0-4 0-8-2-12z" fill={g.dark} stroke={p.color || g.gold1} strokeWidth="1.5" />
      <path d="M10 14l-3 3h2v3h2v-3h2v-3" fill={p.color || g.gold3} stroke={p.color || g.gold1} strokeWidth="1" />
      <circle cx="12" cy="9" r="2" fill={p.color || g.gold2} />
      <path d="M10 6c-3 2-5 5-5 8h5" fill="none" stroke={p.color || g.gold3} strokeWidth="1" />
      <path d="M14 6c3 2 5 5 5 8h-5" fill="none" stroke={p.color || g.gold3} strokeWidth="1" />
    </Svg>
  );
}

function GiftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="10" width="18" height="11" rx="1.5" fill={g.dark} stroke={p.color || g.gold1} strokeWidth="1.5" />
      <rect x="2" y="7" width="20" height="4" rx="1" fill={g.dark} stroke={p.color || g.gold1} strokeWidth="1.5" />
      <line x1="12" y1="7" x2="12" y2="21" stroke={p.color || g.gold2} strokeWidth="1.5" />
      <path d="M12 7c-1-3-4-4-5-3s0 3 5 3" fill="none" stroke={p.color || g.gold1} strokeWidth="1.2" />
      <path d="M12 7c1-3 4-4 5-3s0 3-5 3" fill="none" stroke={p.color || g.gold1} strokeWidth="1.2" />
    </Svg>
  );
}

function ChatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={g.dark} stroke={g.gold1} strokeWidth="1.5" />
      <circle cx="8" cy="10" r="1" fill={g.gold1} />
      <circle cx="12" cy="10" r="1" fill={g.gold1} />
      <circle cx="16" cy="10" r="1" fill={g.gold1} />
    </Svg>
  );
}

function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <line x1="6" y1="6" x2="18" y2="18" stroke={g.gold1} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="6" y2="18" stroke={g.gold1} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill={g.dark} stroke={g.gold1} strokeWidth="1.5" />
      <line x1="12" y1="16" x2="12" y2="12" stroke={g.gold1} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1.2" fill={g.gold1} />
    </Svg>
  );
}

function SpeakerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill={g.dark} stroke={g.gold1} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke={g.gold1} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke={g.gold3} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

function TvIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="4" width="20" height="14" rx="2" fill={g.dark} stroke={g.gold1} strokeWidth="1.5" />
      <line x1="8" y1="21" x2="16" y2="21" stroke={g.gold1} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke={g.gold1} strokeWidth="1.5" />
      <polygon points="10,8 10,14 15,11" fill={g.gold1} />
    </Svg>
  );
}

const ICON_MAP: Record<string, React.FC<IconProps>> = {
  'fire': FireIcon,
  'money-bag': MoneyBagIcon,
  'crown': CrownIcon,
  'gem': GemIcon,
  'skull': SkullIcon,
  'clap': ClapIcon,
  'laugh': LaughIcon,
  'salute': SaluteIcon,
  'angry': AngryIcon,
  'money-face': MoneyFaceIcon,
  'shaka': ShakaIcon,
  'trophy': TrophyIcon,
  'star': StarIcon,
  'sparkle': SparkleIcon,
  'warning': WarningIcon,
  'celebrate': CelebrateIcon,
  'confetti': ConfettiIcon,
  'cards': CardsIcon,
  'spade': SpadeIcon,
  'dice': DiceIcon,
  'slot-machine': SlotMachineIcon,
  'pool-ball': PoolBallIcon,
  'horse': HorseIcon,
  'target': TargetIcon,
  'domino': DominoIcon,
  'football': FootballIcon,
  'soccer': SoccerIcon,
  'age-restricted': AgeRestrictedIcon,
  'smile': SmileIcon,
  'sad': SadIcon,
  'people': PeopleIcon,
  'globe': GlobeIcon,
  'person': PersonIcon,
  'gamepad': GamepadIcon,
  'gold-medal': GoldMedalIcon,
  'silver-medal': SilverMedalIcon,
  'bronze-medal': BronzeMedalIcon,
  'dancer': DancerIcon,
  'champagne': ChampagneIcon,
  'eyes': EyesIcon,
  'shield': ShieldIcon,
  'lightning': LightningIcon,
  'muscle': MuscleIcon,
  'thumbs-up': ThumbsUpIcon,
  'ok-hand': OkHandIcon,
  'handshake': HandshakeIcon,
  'clover': CloverIcon,
  'cherry': CherryIcon,
  'lemon': LemonIcon,
  'orange': OrangeIcon,
  'bell': BellIcon,
  'seven': SevenIcon,
  'bingo': BingoIcon,
  'smirk': SmirkIcon,
  'scared': ScaredIcon,
  'grimace': GrimaceIcon,
  'fist': FistIcon,
  'shuffle': ShuffleIcon,
  'crystal-ball': CrystalBallIcon,
  'gear': GearIcon,
  'snowflake': SnowflakeIcon,
  'atom': AtomIcon,
  'hourglass': HourglassIcon,
  'lock': LockIcon,
  'roulette-wheel': RouletteWheelIcon,
  'basketball': BasketballIcon,
  'boxing': BoxingIcon,
  'oil-barrel': OilBarrelIcon,
  'fox': FoxIcon,
  'ghost': GhostIcon,
  'circle': CircleIcon,
  'link': LinkIcon,
  'chart-down': ChartDownIcon,
  'document': DocumentIcon,
  'selfie': SelfieIcon,
  'prohibited': ProhibitedIcon,
  'point': PointIcon,
  'mask': MaskIcon,
  'sword': SwordIcon,
  'checkmark': CheckmarkIcon,
  'heart-suit': HeartSuitIcon,
  'diamond-suit': DiamondSuitIcon,
  'club-suit': ClubSuitIcon,
  'fourth-place': FourthPlaceIcon,
  'dominoes': DominoIcon,
  'roulette': RouletteWheelIcon,
  'users': PeopleIcon,
  'chat': ChatIcon,
  'close': CloseIcon,
  'info': InfoIcon,
  'speaker': SpeakerIcon,
  'tv': TvIcon,
  'party': PartyIcon,
  'wave': WaveIcon,
  'shocked': ShockedIcon,
  'rocket': RocketIcon,
  'gift': GiftIcon,
};

export type CasinoIconName = keyof typeof ICON_MAP;

interface CasinoIconProps extends IconProps {
  name: CasinoIconName | string;
}

export function CasinoIcon({ name, size = 24, className, style, color }: CasinoIconProps) {
  const IconComponent = ICON_MAP[name] || ICON_MAP['gamepad'];
  return <IconComponent size={size} className={className} style={color ? { ...style, '--ci-color': color, color } as React.CSSProperties : style} color={color} />;
}

export const EMOJI_TO_ICON: Record<string, string> = {
  '🔥': 'fire',
  '💰': 'money-bag',
  '👑': 'crown',
  '💎': 'gem',
  '💀': 'skull',
  '👏': 'clap',
  '😂': 'laugh',
  '🫡': 'salute',
  '😤': 'angry',
  '🤑': 'money-face',
  '🤙': 'shaka',
  '🏆': 'trophy',
  '⭐': 'star',
  '✨': 'sparkle',
  '⚠️': 'warning',
  '⚠': 'warning',
  '🎉': 'celebrate',
  '🎊': 'confetti',
  '🃏': 'cards',
  '♠️': 'spade',
  '♠': 'spade',
  '🎲': 'dice',
  '🎰': 'slot-machine',
  '🎱': 'pool-ball',
  '🏇': 'horse',
  '🎯': 'target',
  '🁣': 'domino',
  '🏈': 'football',
  '⚽': 'soccer',
  '🔞': 'age-restricted',
  '😊': 'smile',
  '😔': 'sad',
  '👥': 'people',
  '🌐': 'globe',
  '👤': 'person',
  '🎮': 'gamepad',
  '🥇': 'gold-medal',
  '🥈': 'silver-medal',
  '🥉': 'bronze-medal',
  '💃': 'dancer',
  '🥂': 'champagne',
  '👀': 'eyes',
  '🛡️': 'shield',
  '💪': 'muscle',
  '👍': 'thumbs-up',
  '👌': 'ok-hand',
  '🤝': 'handshake',
  '☘️': 'clover',
  '🍀': 'clover',
  '🍒': 'cherry',
  '🍋': 'lemon',
  '🍊': 'orange',
  '🔔': 'bell',
  '7️⃣': 'seven',
  '😏': 'smirk',
  '😱': 'scared',
  '😬': 'grimace',
  '🤜': 'fist',
  '🔀': 'shuffle',
  '🔮': 'crystal-ball',
  '⚙️': 'gear',
  '❄️': 'snowflake',
  '⚛️': 'atom',
  '⏳': 'hourglass',
  '🅱️': 'bingo',
  '🎡': 'roulette-wheel',
  '⚡': 'lightning',
  '🏀': 'basketball',
  '🥊': 'boxing',
  '🛢️': 'oil-barrel',
  '🦊': 'fox',
  '👻': 'ghost',
  '🔵': 'circle',
  '🔐': 'lock',
  '🔗': 'link',
  '📉': 'chart-down',
  '📄': 'document',
  '🤳': 'selfie',
  '🚫': 'prohibited',
  '🫵': 'point',
  '🎭': 'mask',
  '⚔️': 'sword',
  '♥': 'heart-suit',
  '♦': 'diamond-suit',
  '♣': 'club-suit',
  '✓': 'checkmark',
  '4️⃣': 'fourth-place',
  '🂡': 'cards',
};

export function EmojiSpan({ emoji, size = 20, className, style }: { emoji: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const iconName = EMOJI_TO_ICON[emoji];
  if (iconName) return <CasinoIcon name={iconName} size={size} className={className} style={style} />;
  return <span style={style} className={className}>{emoji}</span>;
}

export { ICON_MAP };
export default CasinoIcon;
