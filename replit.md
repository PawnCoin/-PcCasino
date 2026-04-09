# $Pc Casino - Compressed

### Overview
The $Pc Casino is a React + Vite + TypeScript web application offering a rich collection of card and casino games. It is an integral part of the Pawn Coin ecosystem, designed to provide a premium gaming experience with advanced visual effects and real-time functionalities. The project aims to integrate a variety of popular casino games, support multiplayer interactions, and provide a secure, engaging platform for users, utilizing the $Pc token for all transactions.

### User Preferences
- All game-related financial values are presented in million-scale: 1M, 5M, 10M, 25M, 50M, 100M, 500M, 1B $Pc.
- The casino environment offers three perspective modes: Overview, 3rd Person, and 1st Person, switchable via a floating toggle.

### System Architecture

#### UI/UX Decisions
- **Design System**: Premium CSS classes for elements like `.premium-card`, `.premium-chip`, `.wood-rail`, `.premium-felt`, and `.neon-ring` are used across all games for a consistent high-end casino aesthetic.
- **3D Graphics**: Utilizes Three.js, @react-three/fiber, and @react-three/drei for immersive 3D elements like the Roulette wheel and the overall casino viewport.
- **In-Game UI**: A unified `InGameTopBar` provides consistent navigation, balance display, quick-buy options, and settings accessible via `InGameOptionsPanel`.
- **Game Skins**: Game-specific skins for Roulette, Craps, Slots, Bingo, and Darts are implemented, allowing visual customization.
- **Accessibility & SEO**: `index.html` is optimized with full metadata, Open Graph, Twitter Cards, JSON-LD, skip-links, and semantic HTML for improved SEO and accessibility. Static pages like `/about`, `/contact`, `/privacy-policy`, and `/terms` are also provided.
- **Responsive Design**: Mobile detection is handled by `use-mobile.ts`.

#### Technical Implementations
- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS, shadcn/ui components.
- **State Management**: React hooks with `localStorage` for persistence.
- **Multiplayer**: Real-time interaction powered by Socket.io, enabling features like live rooms, chat, game state synchronization, and emoji reactions.
- **Sound Design**: Programmatically generated sound effects using Web Audio API for chip clinks, wins, card deals, dice rolls, etc.
- **Authentication**: Real OAuth 2.0 integration with Google, Discord, and Twitter. Session-table-backed auth with retry logic on /api/auth/me (3 attempts for network errors, immediate clear on 401). Global 401 interceptor triggers centralized logout with toast. Logout invalidates all sessions across devices. Hourly expired session cleanup.
- **Persistence**: PostgreSQL database for user profiles, game history, leaderboards, daily bonuses, and jackpot data.
- **Payment Processing**: PcPay webhook integration for automatic balance crediting and real-time payment confirmation.
- **Game Features**:
    - **User Profiles**: Editable profiles with display name, bio, avatar upload, social links, and privacy toggles. Includes public casino cards for users.
    - **Favorite Games**: Tracks top 5 most played games.
    - **Progressive Jackpot**: Real-time ticker updated via WebSocket, grows from bets, with win animations and reset functionality.
    - **VIP Cashback**: Automated cashback based on wagered amount, credited periodically.
    - **Live Data**: Integration with The Odds API for live sports data and DexScreener/GeckoTerminal for live $Pc price ticker. All mock data has been removed.
    - **Daily Bonus**: Persistence and server-side validation for daily bonus claims.
    - **Spades - Elite Competitive Edition**: Features 4 AI levels, NIL/Blind NIL bidding, house rules customization, ranked mode with MMR tracking, emoji reactions, and trick replay.
    - **Pool Table & Darts 501**: Canvas-based games with realistic physics and AI opponents.
    - **Iframe Game Integration**: `IframeGameWrapper` facilitates embedding external HTML5 games (French Roulette, Blackjack, Craps, Horse Racing) with balance synchronization and event bridging via `window.postMessage`.
    - **Poker Hand History & Replay**: Stores and allows replay of poker hands, with public sharing capabilities.

#### Feature Specifications
- **Games**: Texas Hold'em Poker, Blackjack, Roulette (3D), French Roulette (iframe), Craps, Spades (Elite Edition), Slots, Bingo 75-Ball, Dominoes, Horse Racing (iframe), Pool Table (8-ball canvas physics), Darts 501 (canvas dartboard vs AI), Spanish 21.
- **Navigation**: Includes WeParlay.io external link and an 18+ VIP area.
- **Admin**: Admin panel directly accessible for users with `isAdmin: true` flag (password gate removed).
- **Security**: Profanity filter in lobby chat, 2FA and self-exclusion options in user profiles.

### Poker Hand Evaluation Engine
- `src/hooks/useGameEngine.ts` — `getBestHand(cards)` finds the optimal 5-card hand from 7 cards (C(7,5)=21 combinations), returns a numeric `score` for direct comparison including kicker resolution. Handles wheel straight (A-2-3-4-5).
- `resolveHand()` in PokerGame.tsx evaluates all active opponents' actual dealt hole cards vs player's hand — winner determined by hand score comparison, never by random chance.
- All opponents receive actual hole cards from the deck in `startNewHand()`. All active/non-folded opponents act each betting round (no skipping).

### LiveOne Music Integration
- Embedded as an iframe within the MusicPlayer panel (no external tab redirect). Users can stream LiveOne without leaving the casino.

### External Dependencies

- **PostgreSQL**: Primary database for all persistent data.
- **Socket.io**: Real-time communication for multiplayer games, chat, and live updates.
- **The Odds API**: Used for fetching live sports data.
- **DexScreener / GeckoTerminal**: Used for fetching live $Pc token price data.
- **Google OAuth 2.0**: External authentication provider.
- **Discord OAuth 2.0**: External authentication provider.
- **Twitter OAuth 2.0**: External authentication provider.
- **PcPay Webhook**: External service for payment processing and confirmations.
- **WeParlay Inc.**: External platform for sports gambling, linked from the casino.
- **CodeCanyon**: Source for several iframe-integrated games (French Roulette, Blackjack, Craps, Horse Racing).