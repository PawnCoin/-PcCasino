# $Pc Casino

A React + Vite + TypeScript casino web application featuring multiple card and casino games with premium visual effects, part of the Pawn Coin ecosystem. The Command Center is an external app at pawncoinpc.com — not included in this application.

## Games
Texas Hold'em Poker, Blackjack, Roulette, Craps, Spanish 21, Spades (Elite Edition), Slots, Bingo 75-Ball

### Spades — Elite Competitive Edition
- **4-level AI**: Easy / Medium / Hard / Elite (strategic, partner-aware, nil-aware play)
- **NIL & Blind NIL bidding**: Full scoring logic (+100/-100 for NIL, +200/-200 for Blind NIL)
- **House Rules**: Target score (300/500/750), sandbag penalty toggle, NIL/Blind NIL toggle, spades-always-broken option
- **Ranked Mode**: MMR tracking, tier system (Bronze→Diamond), win/loss record
- **Emoji Reactions**: 8 reactions, float animation, AI reactions
- **Last Trick Replay**: Click to view previous trick in a dialog
- **Tournament Bracket**: Visual 2-round bracket with live winner tracking
- **Tooltips/Practice Mode**: Contextual tips system with ON/OFF toggle
- **Round History**: Per-round score breakdown in sidebar
- **Legal card highlighting**: Playable cards glow, illegal cards dim
- **AI hook**: `src/hooks/useSpadesAI.ts` — separated AI logic for all 4 difficulty levels

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
│   │   │   ├── GameViewport.tsx      # 3D casino environment (Three.js)
│   │   │   ├── RouletteWheel3D.tsx   # True 3D roulette wheel (R3F): speed-based animation (targetSpeed prop), wheel+ball rotate opposite directions (ball 3x faster), ball drops into pocket with bounce, idle rotation, clean minimal design (no divider bars/torus rings/spokes), bright multi-light rig (ambient 2.5 + directional + dual spotlights + point lights), emissive pocket colors for visibility, 37 pockets, gold hub
│   │   │   ├── PokerGame.tsx         # Leather rail, 3D cards, pot chip stacks, action timer bars
│   │   │   ├── BlackjackGame.tsx     # Wood rail, glossy 3D cards, dealer nameplate, card shoe, win/bust animations
│   │   │   ├── RouletteGame.tsx      # Unity-matching 11-phase spin (~20s), expanded chips [1-10K] with scrollable selector + UNDO, visual chip stacking, 3s post-spin delay + YOU WIN!/LOST overlay, green felt betting table, La Partage, sounds + voice
│   │   │   ├── CrapsGame.tsx         # 80px beveled dice, tumble animation, ON/OFF puck, padded rail
│   │   │   ├── Spanish21Game.tsx     # Neon side bet circles (gold/purple/emerald), starburst bonus wins
│   │   │   ├── SpadesGame.tsx        # Fan spread cards, trick animations, metallic scoreboard
│   │   │   └── SlotsGame.tsx         # Chrome/gold cabinet, LED chase lights, pull handle, reel effects
│   │   └── ui/             # shadcn/ui components
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **3D Engine**: Three.js, @react-three/fiber, @react-three/drei (used by Roulette 3D wheel, GameViewport)
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
