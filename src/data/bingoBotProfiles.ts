export interface BotProfile {
  id: string;
  name: string;
  photoUrl: string;
  vipTier: 'bronze' | 'silver' | 'gold';
}

const BOT_PROFILES: BotProfile[] = [
  { id: 'bot-01', name: 'Jessica', photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg', vipTier: 'bronze' },
  { id: 'bot-02', name: 'Marcus', photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg', vipTier: 'silver' },
  { id: 'bot-03', name: 'Priya', photoUrl: 'https://randomuser.me/api/portraits/women/3.jpg', vipTier: 'bronze' },
  { id: 'bot-04', name: 'Tyler', photoUrl: 'https://randomuser.me/api/portraits/men/4.jpg', vipTier: 'bronze' },
  { id: 'bot-05', name: 'Sofia', photoUrl: 'https://randomuser.me/api/portraits/women/5.jpg', vipTier: 'gold' },
  { id: 'bot-06', name: 'Derek', photoUrl: 'https://randomuser.me/api/portraits/men/6.jpg', vipTier: 'bronze' },
  { id: 'bot-07', name: 'Aaliyah', photoUrl: 'https://randomuser.me/api/portraits/women/7.jpg', vipTier: 'silver' },
  { id: 'bot-08', name: 'Cameron', photoUrl: 'https://randomuser.me/api/portraits/men/8.jpg', vipTier: 'bronze' },
  { id: 'bot-09', name: 'Luna', photoUrl: 'https://randomuser.me/api/portraits/women/9.jpg', vipTier: 'bronze' },
  { id: 'bot-10', name: 'Jordan', photoUrl: 'https://randomuser.me/api/portraits/men/10.jpg', vipTier: 'silver' },
  { id: 'bot-11', name: 'Naomi', photoUrl: 'https://randomuser.me/api/portraits/women/11.jpg', vipTier: 'bronze' },
  { id: 'bot-12', name: 'Ethan', photoUrl: 'https://randomuser.me/api/portraits/men/12.jpg', vipTier: 'bronze' },
  { id: 'bot-13', name: 'Chloe', photoUrl: 'https://randomuser.me/api/portraits/women/13.jpg', vipTier: 'gold' },
  { id: 'bot-14', name: 'Ryan', photoUrl: 'https://randomuser.me/api/portraits/men/14.jpg', vipTier: 'bronze' },
  { id: 'bot-15', name: 'Isabelle', photoUrl: 'https://randomuser.me/api/portraits/women/15.jpg', vipTier: 'silver' },
  { id: 'bot-16', name: 'Nathan', photoUrl: 'https://randomuser.me/api/portraits/men/16.jpg', vipTier: 'bronze' },
  { id: 'bot-17', name: 'Maya', photoUrl: 'https://randomuser.me/api/portraits/women/17.jpg', vipTier: 'bronze' },
  { id: 'bot-18', name: 'Leo', photoUrl: 'https://randomuser.me/api/portraits/men/18.jpg', vipTier: 'silver' },
  { id: 'bot-19', name: 'Harper', photoUrl: 'https://randomuser.me/api/portraits/women/19.jpg', vipTier: 'bronze' },
  { id: 'bot-20', name: 'Kevin', photoUrl: 'https://randomuser.me/api/portraits/men/20.jpg', vipTier: 'bronze' },
  { id: 'bot-21', name: 'Zara', photoUrl: 'https://randomuser.me/api/portraits/women/21.jpg', vipTier: 'gold' },
  { id: 'bot-22', name: 'Brandon', photoUrl: 'https://randomuser.me/api/portraits/men/22.jpg', vipTier: 'bronze' },
  { id: 'bot-23', name: 'Olivia', photoUrl: 'https://randomuser.me/api/portraits/women/23.jpg', vipTier: 'silver' },
  { id: 'bot-24', name: 'Dylan', photoUrl: 'https://randomuser.me/api/portraits/men/24.jpg', vipTier: 'bronze' },
  { id: 'bot-25', name: 'Aria', photoUrl: 'https://randomuser.me/api/portraits/women/25.jpg', vipTier: 'bronze' },
  { id: 'bot-26', name: 'Trevor', photoUrl: 'https://randomuser.me/api/portraits/men/26.jpg', vipTier: 'silver' },
  { id: 'bot-27', name: 'Stella', photoUrl: 'https://randomuser.me/api/portraits/women/27.jpg', vipTier: 'bronze' },
  { id: 'bot-28', name: 'Kai', photoUrl: 'https://randomuser.me/api/portraits/men/28.jpg', vipTier: 'bronze' },
];

export default BOT_PROFILES;
