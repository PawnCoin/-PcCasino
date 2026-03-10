# $Pc Casino

A React + Vite + TypeScript casino web application featuring multiple card and casino games with premium visual effects, part of the Pawn Coin ecosystem. The Command Center is an external app at pawncoinpc.com — not included in this application.

## Project Structure

```
/
├── index.html              # Entry HTML file
├── vite.config.ts          # Vite config (port 5000, host 0.0.0.0)
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind CSS config
├── components.json         # shadcn/ui configuration
├── tsconfig*.json          # TypeScript configs
├── src/
│   ├── main.tsx            # App entry point
│   ├── App.tsx             # Root component (view routing, auth, transactions)
│   ├── index.css           # Global styles (premium casino CSS: wood-rail, premium-card, premium-chip, neon rings, animations)
│   ├── App.css             # App-level styles
│   ├── types.ts            # TypeScript type definitions
│   ├── lib/
│   │   └── utils.ts        # Utility functions (cn helper)
│   ├── hooks/
│   │   ├── useCardDeck.ts  # Card deck selection logic
│   │   ├── useGameEngine.ts # Game engine (deck creation, card evaluation)
│   │   ├── useGameVoice.ts # Voice/audio hooks
│   │   ├── use-mobile.ts   # Mobile detection hook
│   │   └── useSoundEffects.ts # Enhanced sound effects
│   ├── components/
│   │   ├── Navigation.tsx    # Nav bar (Games, Leaderboard, Sports, Rewards)
│   │   ├── HeroSection.tsx   # Hero with metallic text effects
│   │   ├── GamesGrid.tsx     # Game cards with 3D tilt, particle background
│   │   ├── Leaderboard.tsx
│   │   ├── RecentWinners.tsx
│   │   ├── WeParlaySection.tsx
│   │   ├── AuthModal.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── FinancialModal.tsx
│   │   ├── CardDeckSelector.tsx
│   │   ├── MusicPlayer.tsx
│   │   ├── MultiplayerLobby.tsx
│   │   ├── VappTVPlayer.tsx
│   │   ├── PlayingCard.tsx    # Premium cards (sm/md/lg/xl sizes, gold trim, glossy shine)
│   │   ├── PokerChip.tsx     # 3D metallic chips with stacking, ChipStack, BetArea
│   │   ├── PokerHandAnalyzer.tsx
│   │   ├── PlayerAvatar.tsx
│   │   ├── AnimatedChip.tsx
│   │   ├── Sportsbook.tsx
│   │   ├── games/
│   │   │   ├── CasinoEnvironment.tsx # Casino room wrapper (ceiling lights, columns, dust particles, floor reflections)
│   │   │   ├── GameViewport.tsx      # 3D casino environment (Three.js, currently unused by games)
│   │   │   ├── PokerGame.tsx         # Leather rail, 3D cards, pot chip stacks, action timer bars
│   │   │   ├── BlackjackGame.tsx     # Wood rail, glossy 3D cards, dealer nameplate, card shoe, win/bust animations
│   │   │   ├── RouletteGame.tsx      # Chrome wheel rim, metallic ball, gold grid, chip drop animations
│   │   │   ├── CrapsGame.tsx         # 80px beveled dice, tumble animation, ON/OFF puck, padded rail
│   │   │   ├── Spanish21Game.tsx     # Neon side bet circles (gold/purple/emerald), starburst bonus wins
│   │   │   ├── SpadesGame.tsx        # Fan spread cards, trick animations, metallic scoreboard
│   │   │   └── SlotsGame.tsx         # Chrome/gold cabinet, LED chase lights, pull handle, reel effects
│   │   └── ui/             # shadcn/ui components
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **3D Engine**: Three.js, @react-three/fiber, @react-three/drei (available but games use CSS-based effects)
- **State**: React hooks + localStorage persistence
- **Build**: Vite (dev on port 5000)

## Games

- Texas Hold'em Poker
- Blackjack
- Spanish 21 (with side bets: 3 Card Poker, Match The Dealer, Perfect Pair)
- Roulette (European)
- Craps & Dice
- Spades (4-player)
- Slots (3x5 reel)
- Sportsbook (linked to WeParlay.io — external)

## Visual Design System

Premium CSS classes in index.css used across all games:
- `.premium-card` — glossy diagonal shine overlay, deep shadow, hover lift
- `.premium-chip` — metallic gradient rim, edge striping, depth shadow
- `.wood-rail` — wood grain gradient with gold pinstripe edge
- `.premium-felt` — rich textured green with fiber grain pattern
- `.casino-spotlight` — overhead golden light cone
- `.card-deal-3d` — 3D card deal animation (slide + rotateY flip)
- `.card-hover-lift` — hover lift with enhanced shadow
- `.chip-bounce` — bounce-in animation for chip placement
- `.win-celebration` / `.bust-effect` — dramatic win/loss effects
- `.neon-ring-gold/red/green/purple` — animated neon border rings
- `.text-slam` — large text impact animation
- `.dice-tumble` — multi-axis dice rotation

All games wrapped in `CasinoEnvironment` for ambient casino room framing.

## Pawn Coin Integration

- Command Center is external at pawncoinpc.com (not in-app)
- Consistent "$Pc Casino" branding throughout
- $Pc token used for all betting

## Workflow

- **Start application**: `npm run dev` on port 5000

## Deployment

- Type: Static site
- Build command: `npm run build`
- Public directory: `dist`
