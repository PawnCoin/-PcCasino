# $Pc Casino

A React + Vite + TypeScript casino web application featuring multiple card and casino games with premium 3D visual effects, part of the Pawn Coin ecosystem. Linked to the Pawn Coin Command Center for finance tracking, stats, and bot management.

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
│   ├── index.css           # Global styles (metallic effects, badge glows, animations)
│   ├── App.css             # App-level styles
│   ├── types.ts            # TypeScript type definitions
│   ├── lib/
│   │   └── utils.ts        # Utility functions (cn helper)
│   ├── hooks/
│   │   ├── useCardDeck.ts  # Card deck selection logic
│   │   ├── useGameEngine.ts # Game engine (deck creation, card evaluation)
│   │   ├── useGameVoice.ts # Voice/audio hooks
│   │   └── useSoundEffects.ts # Enhanced sound effects (multi-layer synthesis, ambient casino audio)
│   ├── components/
│   │   ├── Navigation.tsx    # Nav bar with Command Center link
│   │   ├── HeroSection.tsx   # Enhanced hero with metallic text effects
│   │   ├── GamesGrid.tsx     # Game cards with 3D tilt, particle background, badge glows
│   │   ├── CommandCenter.tsx  # Pawn Coin Command Center dashboard
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
│   │   ├── PlayingCard.tsx
│   │   ├── PokerChip.tsx
│   │   ├── PokerHandAnalyzer.tsx
│   │   ├── PlayerAvatar.tsx
│   │   ├── AnimatedChip.tsx
│   │   ├── Sportsbook.tsx
│   │   ├── games/
│   │   │   ├── GameViewport.tsx  # 3D casino environment (Three.js + post-processing)
│   │   │   ├── PokerGame.tsx     # Enhanced with spotlights, chip trails, dealer markers
│   │   │   ├── BlackjackGame.tsx # Enhanced with 3D backdrop, card animations, spotlight
│   │   │   ├── RouletteGame.tsx  # Enhanced with chrome rim, ball glow, neon display
│   │   │   ├── CrapsGame.tsx     # Enhanced with dice glow, spotlight tracking, gold rails
│   │   │   ├── Spanish21Game.tsx # Enhanced with neon side bets, celebration particles
│   │   │   ├── SpadesGame.tsx    # Enhanced with card flip, trick animations, spotlights
│   │   │   └── SlotsGame.tsx     # NEW: Full slot machine with chrome frame, LED effects
│   │   └── ui/             # shadcn/ui components
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **3D Engine**: Three.js, @react-three/fiber, @react-three/drei
- **Post-Processing**: @react-three/postprocessing (Bloom, N8AO, Vignette, ToneMapping)
- **State**: React hooks + localStorage persistence
- **Build**: Vite (dev on port 5000)

## Games

- Texas Hold'em Poker
- Blackjack
- Spanish 21 (with side bets)
- Roulette (European)
- Craps & Dice
- Spades (4-player)
- Slots (3x5 reel)
- Sportsbook (linked to WeParlay.io)

## Visual Enhancements

All games feature premium casino-quality visual enhancements:
- 3D GameViewport backdrop with PBR materials, bloom, ambient occlusion, reflective floors
- Cinematic camera animations, floating particles, $Pc branded chip stacks
- Per-game enhancements: card dealing animations, spotlight effects, neon glows, metallic sheens
- Enhanced sound system with multi-layered synthesis and ambient casino audio
- Lobby with 3D tilt cards, particle backgrounds, animated badge glows

## Pawn Coin Integration

- Command Center accessible from navigation (finance tracking, stats, session history)
- Links to external Pawn Coin Command Center at pawncoinpc.com
- Consistent "$Pc Casino" branding throughout

## Workflow

- **Start application**: `npm run dev` on port 5000

## Deployment

- Type: Static site
- Build command: `npm run build`
- Public directory: `dist`
