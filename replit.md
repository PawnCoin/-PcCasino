# PawnCoin Casino ($Pc Casino)

A React + Vite + TypeScript casino web application featuring multiple card and casino games.

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
│   ├── App.tsx             # Root component
│   ├── index.css           # Global styles
│   ├── App.css             # App-level styles
│   ├── types.ts            # TypeScript type definitions
│   ├── lib/
│   │   └── utils.ts        # Utility functions (cn helper)
│   ├── hooks/
│   │   ├── useCardDeck.ts  # Card deck selection logic
│   │   ├── useGameEngine.ts # Game engine (deck creation, card evaluation)
│   │   ├── useGameVoice.ts # Voice/audio hooks
│   │   └── useSoundEffects.ts # Sound effects hook
│   ├── components/
│   │   ├── Navigation.tsx
│   │   ├── HeroSection.tsx
│   │   ├── GamesGrid.tsx
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
│   │   │   ├── PokerGame.tsx
│   │   │   ├── BlackjackGame.tsx
│   │   │   ├── RouletteGame.tsx
│   │   │   ├── CrapsGame.tsx
│   │   │   ├── Spanish21Game.tsx
│   │   │   └── SpadesGame.tsx
│   │   └── ui/             # shadcn/ui components
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State**: React hooks + localStorage persistence
- **Build**: Vite (dev on port 5000)

## Workflow

- **Start application**: `npm run dev` on port 5000

## Deployment

- Type: Static site
- Build command: `npm run build`
- Public directory: `dist`

## Notes

- The project was originally cloned with all source files at root level; they were reorganized into proper `src/` subdirectory structure during setup.
- `src/hooks/useGameEngine.ts` was created during setup as it was missing from the repo but referenced by game components.
- `src/lib/utils.ts` was created during setup (standard shadcn/ui utility).
