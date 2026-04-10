export type Personality = 'aggressive' | 'conservative' | 'social' | 'quiet' | 'lucky';

export interface BotProfile {
  id: string;
  name: string;
  photoUrl: string;
  vipTier: 'bronze' | 'silver' | 'gold';
  personality: Personality;
  betRange: [number, number];
  chatPool: string[];
}

const WIN_CHAT = [
  'Let\'s go!! 🔥', 'Big win!', 'EZ money 💰', 'Called it!', 'Too easy',
  'Yesss!', 'Huge W', 'My night tonight!', 'Stack growing 📈', 'On fire!',
];
const LOSE_CHAT = [
  'Ugh...', 'Pain 😩', 'Not my round', 'Bad beat', 'Rigged lol',
  'Next one for sure', 'So close!', 'Unlucky', 'Ouch...', 'Brutal',
];
const NEUTRAL_CHAT = [
  'GL all 🍀', 'New round let\'s go', 'What a game', 'Interesting...',
  'Here we go', 'Feeling lucky', 'This table is wild', 'Anyone else up big?',
  'Love this game', 'Late night grind', 'Vibes ✨', 'Full send',
];
const SOCIAL_CHAT = [
  'Hey everyone! 👋', 'Great table tonight', 'Who\'s winning?',
  'Nice play!', 'GG', 'Let\'s gooo', 'Welcome!', 'Sick hand!',
  'Anyone from EU?', 'This is fun', 'Respect ✊', 'Good luck all!',
];
const AGGRESSIVE_CHAT = [
  'All in baby!', 'Max bet!', 'No fear 💪', 'GO BIG OR GO HOME',
  'Scared money don\'t make money', 'YOLO', 'Full send!', 'Moon or bust 🚀',
];

export const BOT_CHAT_POOLS = { WIN_CHAT, LOSE_CHAT, NEUTRAL_CHAT, SOCIAL_CHAT, AGGRESSIVE_CHAT };

const BOT_PROFILES: BotProfile[] = [
  { id: 'bot-01', name: 'Jessica', photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg', vipTier: 'bronze', personality: 'social', betRange: [5, 100], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-02', name: 'Marcus', photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg', vipTier: 'silver', personality: 'aggressive', betRange: [50, 5000], chatPool: [...AGGRESSIVE_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-03', name: 'Priya', photoUrl: 'https://randomuser.me/api/portraits/women/3.jpg', vipTier: 'bronze', personality: 'quiet', betRange: [5, 50], chatPool: [...NEUTRAL_CHAT] },
  { id: 'bot-04', name: 'Tyler', photoUrl: 'https://randomuser.me/api/portraits/men/4.jpg', vipTier: 'bronze', personality: 'social', betRange: [10, 500], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-05', name: 'Sofia', photoUrl: 'https://randomuser.me/api/portraits/women/5.jpg', vipTier: 'gold', personality: 'aggressive', betRange: [500, 50000], chatPool: [...AGGRESSIVE_CHAT, ...WIN_CHAT] },
  { id: 'bot-06', name: 'Derek', photoUrl: 'https://randomuser.me/api/portraits/men/6.jpg', vipTier: 'bronze', personality: 'conservative', betRange: [5, 25], chatPool: [...NEUTRAL_CHAT, ...LOSE_CHAT] },
  { id: 'bot-07', name: 'Aaliyah', photoUrl: 'https://randomuser.me/api/portraits/women/7.jpg', vipTier: 'silver', personality: 'lucky', betRange: [25, 1000], chatPool: [...WIN_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-08', name: 'Cameron', photoUrl: 'https://randomuser.me/api/portraits/men/8.jpg', vipTier: 'bronze', personality: 'quiet', betRange: [5, 100], chatPool: [...NEUTRAL_CHAT] },
  { id: 'bot-09', name: 'Luna', photoUrl: 'https://randomuser.me/api/portraits/women/9.jpg', vipTier: 'bronze', personality: 'social', betRange: [10, 250], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-10', name: 'Jordan', photoUrl: 'https://randomuser.me/api/portraits/men/10.jpg', vipTier: 'silver', personality: 'aggressive', betRange: [100, 10000], chatPool: [...AGGRESSIVE_CHAT, ...WIN_CHAT] },
  { id: 'bot-11', name: 'Naomi', photoUrl: 'https://randomuser.me/api/portraits/women/11.jpg', vipTier: 'bronze', personality: 'conservative', betRange: [5, 50], chatPool: [...NEUTRAL_CHAT, ...LOSE_CHAT] },
  { id: 'bot-12', name: 'Ethan', photoUrl: 'https://randomuser.me/api/portraits/men/12.jpg', vipTier: 'bronze', personality: 'social', betRange: [10, 100], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-13', name: 'Chloe', photoUrl: 'https://randomuser.me/api/portraits/women/13.jpg', vipTier: 'gold', personality: 'lucky', betRange: [100, 25000], chatPool: [...WIN_CHAT, ...AGGRESSIVE_CHAT] },
  { id: 'bot-14', name: 'Ryan', photoUrl: 'https://randomuser.me/api/portraits/men/14.jpg', vipTier: 'bronze', personality: 'quiet', betRange: [5, 50], chatPool: [...NEUTRAL_CHAT] },
  { id: 'bot-15', name: 'Isabelle', photoUrl: 'https://randomuser.me/api/portraits/women/15.jpg', vipTier: 'silver', personality: 'social', betRange: [25, 500], chatPool: [...SOCIAL_CHAT, ...WIN_CHAT] },
  { id: 'bot-16', name: 'Nathan', photoUrl: 'https://randomuser.me/api/portraits/men/16.jpg', vipTier: 'bronze', personality: 'conservative', betRange: [5, 25], chatPool: [...NEUTRAL_CHAT, ...LOSE_CHAT] },
  { id: 'bot-17', name: 'Maya', photoUrl: 'https://randomuser.me/api/portraits/women/17.jpg', vipTier: 'bronze', personality: 'social', betRange: [10, 100], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-18', name: 'Leo', photoUrl: 'https://randomuser.me/api/portraits/men/18.jpg', vipTier: 'silver', personality: 'aggressive', betRange: [50, 5000], chatPool: [...AGGRESSIVE_CHAT, ...WIN_CHAT] },
  { id: 'bot-19', name: 'Harper', photoUrl: 'https://randomuser.me/api/portraits/women/19.jpg', vipTier: 'bronze', personality: 'quiet', betRange: [5, 50], chatPool: [...NEUTRAL_CHAT] },
  { id: 'bot-20', name: 'Kevin', photoUrl: 'https://randomuser.me/api/portraits/men/20.jpg', vipTier: 'bronze', personality: 'conservative', betRange: [5, 100], chatPool: [...NEUTRAL_CHAT, ...LOSE_CHAT] },
  { id: 'bot-21', name: 'Zara', photoUrl: 'https://randomuser.me/api/portraits/women/21.jpg', vipTier: 'gold', personality: 'lucky', betRange: [250, 50000], chatPool: [...WIN_CHAT, ...AGGRESSIVE_CHAT] },
  { id: 'bot-22', name: 'Brandon', photoUrl: 'https://randomuser.me/api/portraits/men/22.jpg', vipTier: 'bronze', personality: 'social', betRange: [10, 250], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-23', name: 'Olivia', photoUrl: 'https://randomuser.me/api/portraits/women/23.jpg', vipTier: 'silver', personality: 'aggressive', betRange: [100, 10000], chatPool: [...AGGRESSIVE_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-24', name: 'Dylan', photoUrl: 'https://randomuser.me/api/portraits/men/24.jpg', vipTier: 'bronze', personality: 'conservative', betRange: [5, 50], chatPool: [...NEUTRAL_CHAT] },
  { id: 'bot-25', name: 'Aria', photoUrl: 'https://randomuser.me/api/portraits/women/25.jpg', vipTier: 'bronze', personality: 'social', betRange: [10, 100], chatPool: [...SOCIAL_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-26', name: 'Trevor', photoUrl: 'https://randomuser.me/api/portraits/men/26.jpg', vipTier: 'silver', personality: 'lucky', betRange: [50, 2500], chatPool: [...WIN_CHAT, ...NEUTRAL_CHAT] },
  { id: 'bot-27', name: 'Stella', photoUrl: 'https://randomuser.me/api/portraits/women/27.jpg', vipTier: 'bronze', personality: 'quiet', betRange: [5, 50], chatPool: [...NEUTRAL_CHAT] },
  { id: 'bot-28', name: 'Kai', photoUrl: 'https://randomuser.me/api/portraits/men/28.jpg', vipTier: 'bronze', personality: 'aggressive', betRange: [25, 1000], chatPool: [...AGGRESSIVE_CHAT, ...NEUTRAL_CHAT] },
];

export default BOT_PROFILES;
