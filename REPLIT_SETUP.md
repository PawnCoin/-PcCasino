# $Pc Casino Platform - Replit Setup Guide

## Quick Start for Replit

### Step 1: Create New Replit
1. Go to [replit.com](https://replit.com)
2. Click "Create" → "Import from GitHub" (or create blank if no GitHub)
3. If blank: Choose "Node.js" template

### Step 2: Upload Project Files
**Option A - Upload ZIP:**
1. Download `pc-casino.tar.gz` from this folder
2. In Replit: Click "..." menu → "Upload file/folder"
3. Upload the tar.gz file
4. In Shell: `tar -xzf pc-casino.tar.gz`

**Option B - GitHub:**
1. Push this project to GitHub
2. Import directly into Replit

### Step 3: Move Files to Root
In Replit Shell:
```bash
mv app/* .
mv app/.* . 2>/dev/null
rm -rf app
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Run the Project
```bash
npm run dev
```

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── games/           # All casino games
│   │   │   ├── BlackjackGame.tsx
│   │   │   ├── CrapsGame.tsx        # 3D dice rolling
│   │   │   ├── PokerGame.tsx
│   │   │   ├── RouletteGame.tsx     # 3D Vegas wheel
│   │   │   ├── Spanish21Game.tsx
│   │   │   └── SpadesGame.tsx
│   │   ├── ui/              # shadcn/ui components
│   │   ├── AuthModal.tsx
│   │   ├── GamesGrid.tsx
│   │   ├── HeroSection.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── MusicPlayer.tsx
│   │   ├── Navigation.tsx
│   │   ├── PokerChip.tsx
│   │   ├── PokerHandAnalyzer.tsx
│   │   ├── Sportsbook.tsx
│   │   ├── VappTVPlayer.tsx
│   │   ├── WalletConnect.tsx
│   │   └── WeParlaySection.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCardDeck.ts
│   │   ├── useGameEngine.ts
│   │   ├── useGameVoice.ts
│   │   ├── useSoundEffects.ts
│   │   └── useWallet.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── public/
│   ├── cards/               # Card deck images
│   ├── images/              # Casino backgrounds
│   └── logos/               # $Pc logos
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── index.html
```

---

## Features Included

### Games
- **Poker** (Texas Hold'em) - Multiplayer, AI opponents, hand analyzer
- **Blackjack** - Standard + side bets (3 Card Poker, Match Dealer, Perfect Pair)
- **Roulette** - 3D Vegas-style wheel with La Partage rule
- **Craps** - Realistic 3D dice rolling with arc physics
- **Spades** - Trick-taking card game
- **Spanish 21** - Blackjack variant with special rules
- **Slots** - Coming soon

### Features
- **Wallet Integration** - MetaMask, Phantom, Coinbase, Trust, WalletConnect
- **Social Login** - Google, Twitter, Discord, Telegram (unified profile)
- **Leaderboards** - Player rankings
- **Sound Effects** - Web Audio API synthesized sounds
- **Voice Announcements** - Speech synthesis for game calls
- **Music Player** - Background casino music
- **VappTV Integration** - Stream while playing
- **$Pc Token System** - Full betting with chip animations
- **3D Visuals** - CSS 3D transforms for realistic feel

### Color Scheme
- Gold: `#D4AF37`
- Green Felt: `#1B5E20`, `#2E7D32`
- Wood: `#5D4037`
- Silver: `#C0C0C0`

---

## Environment Variables (Optional)

Create `.env` file for production:
```env
VITE_API_URL=your_backend_url
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
```

---

## Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

---

## Troubleshooting

### Port Already in Use
Change port in `vite.config.ts`:
```typescript
server: {
  port: 3000, // Change this
  host: true
}
```

### Node Version Issues
Replit uses Node 18+ by default. If issues:
```bash
nvm use 20
```

### Missing Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Customization

### Add New Games
1. Create `src/components/games/YourGame.tsx`
2. Add to `GamesGrid.tsx`
3. Add route in `App.tsx`

### Change Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  gold: '#D4AF37',
  'green-felt': '#1B5E20',
  // ...
}
```

### Add Sound Effects
Edit `src/hooks/useSoundEffects.ts`

---

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State**: React hooks + localStorage
- **3D Effects**: CSS transforms
- **Audio**: Web Audio API
- **Voice**: Speech Synthesis API

---

## Support
For issues or questions, check the original conversation history.

**Live Demo**: https://d3vrgcuo456tc.ok.kimi.link
