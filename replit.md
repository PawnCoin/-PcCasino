# $Pc Casino - Compressed

### Overview
The $Pc Casino is a React + Vite + TypeScript web application offering a rich collection of card and casino games. It is an integral part of the Pawn Coin ecosystem, designed to provide a premium gaming experience with advanced visual effects and real-time functionalities. The project aims to integrate a variety of popular casino games, support multiplayer interactions, and provide a secure, engaging platform for users, utilizing the $Pc token for all transactions.

### User Preferences
- All game-related financial values are presented in million-scale: 1M, 5M, 10M, 25M, 50M, 100M, 500M, 1B $Pc.
- The casino environment offers three perspective modes: Overview, 3rd Person, and 1st Person, switchable via a floating toggle.

### System Architecture

#### UI/UX Decisions
- **Design System**: Premium CSS classes for elements like `.premium-card`, `.premium-chip`, `.wood-rail`, `.premium-felt`, and `.neon-ring` are used across all games for a consistent high-end casino aesthetic. A shared `PremiumFeltOverlay` component (`src/components/PremiumFeltOverlay.tsx`) provides reusable cross-pattern SVG texture, felt weave, gold inner borders, and spotlight effects — applied uniformly to Poker, Roulette, Blackjack, Bingo, Darts, Dominoes, Spades, and Craps.
- **3D Graphics**: Utilizes Three.js, @react-three/fiber, and @react-three/drei for immersive 3D elements like the Roulette wheel and the overall casino viewport.
- **In-Game UI**: A unified `InGameTopBar` provides consistent navigation, balance display, quick-buy options, and settings accessible via `InGameOptionsPanel`.
- **Game Skins**: Game-specific skins for Roulette, Craps, Slots, Bingo, and Darts are implemented, allowing visual customization.
- **Accessibility & SEO**: `index.html` is optimized with full metadata, Open Graph, Twitter Cards, JSON-LD, skip-links, and semantic HTML for improved SEO and accessibility. Static pages like `/about`, `/contact`, `/privacy-policy`, and `/terms` are also provided.
- **Casino Icon Library**: All Unicode emojis replaced with custom SVG icon components from `src/components/CasinoIcons.tsx`. The `CasinoIcon` component renders icons by name (e.g., `<CasinoIcon name="cards" />`). Uses casino gold palette (#D4AF37, #F4D03F, #B8860B) with dark backgrounds. ICON_MAP has 80+ icons with aliases. `EmojiSpan` helper and `EMOJI_TO_ICON` mapping available for legacy emoji-to-icon conversion.
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
    - **Horse Racing Enhancements**: SVG chip system overlay (ChipSelector with standard/thousands/millions tiers via CChipPanel constructor patching), continuous play (auto-returns to betting after race result via patched gotoMenu/gotoBetPanel), 3 track scenery themes (Classic, Night Race, Desert) via CSS filters, crowd chant audio during races using 15 WAV clips played through Howler.js at 1–3s intervals, pre-race 3-2-1 countdown with gunshot sound effect (pauses game engine ticker during countdown), live play-by-play commentary via browser SpeechSynthesis API (throttled every 4s, reads horse positions from game engine), bet clearing (Clear Bets button in chip overlay), win/loss result banner showing net $Pc change, multiplayer room via socket.io (horseRacing:join/leave/betUpdate with avatar/bet broadcasting), and avatar strip at bottom showing other players with username/bet status. Files: `public/games/horse-racing/index.html`, `public/games/horse-racing/crowd-chants.js`, `public/games/horse-racing/sounds/`, `src/components/games/IframeGameWrapper.tsx`, `server/index.js`.
    - **Poker Hand History & Replay**: Stores and allows replay of poker hands, with public sharing capabilities.

#### Feature Specifications
- **Casino-Wide Bot Players**: Frontend-only bot system with 28 bot profiles using real randomuser.me photos, VIP tiers, and names. Bots are purely cosmetic — no database entries, no leaderboard/admin presence.
  - **Bingo-specific**: `src/hooks/useBingoBots.ts` — 5-12 bots with daub progress, emoji reactions, false bingo claims.
  - **All other games**: `src/hooks/useCasinoBots.ts` — lightweight, game-agnostic hook with configurable bot counts and status messages. Integrated into Blackjack, Roulette, Craps, Slots, Darts, Pool, Spades, Dominoes, Poker, and IframeGameWrapper (French Roulette, Horse Racing, etc.).
  - **UI**: `src/components/GameBotBar.tsx` — compact pill (green online dot + player count + stacked avatars) shown in each game's `InGameTopBar` rightSlot. Also has full sidebar and lobby row variants.
  - **Data**: `src/data/bingoBotProfiles.ts` — shared bot profile pool used by both hooks.
- **Games**: Texas Hold'em Poker, Blackjack, Roulette (3D), French Roulette (iframe), Craps, Spades (Elite Edition), Slots, Bingo 75-Ball, Dominoes, Horse Racing (iframe), Pool Table (8-ball canvas physics), Darts 501 (canvas dartboard vs AI), Spanish 21.
- **Navigation**: Includes WeParlay.io external link and an 18+ VIP area.
- **Admin**: Admin panel directly accessible for users with `isAdmin: true` flag (password gate removed).
- **Security**: Profanity filter in lobby chat, 2FA and self-exclusion options in user profiles.
- **Membership Tier Access Control**: Three-tier access system (Guest/Regular/VIP) with server-side enforcement. VIP = Silver tier and above (10M+ $Pc wagered). Guests can browse but not chat, play, or use social features. Regular users can play games and chat but cannot add friends, send DMs, or access VIP lounge. VIP users get full social features. Server enforces via `requireVip` middleware. Frontend uses `useAccessControl` hook and `VipBadge` component for consistent gating and visual tier display across lobby chat, leaderboard, friend lists, and profiles.

### Poker Hand Evaluation Engine
- `src/hooks/useGameEngine.ts` — `getBestHand(cards)` finds the optimal 5-card hand from 7 cards (C(7,5)=21 combinations), returns a numeric `score` for direct comparison including kicker resolution. Handles wheel straight (A-2-3-4-5).
- `resolveHand()` in PokerGame.tsx evaluates all active opponents' actual dealt hole cards vs player's hand — winner determined by hand score comparison, never by random chance.
- All opponents receive actual hole cards from the deck in `startNewHand()`. All active/non-folded opponents act each betting round (no skipping).

### LiveOne Music Integration
- Embedded as an iframe within the MusicPlayer panel (no external tab redirect). Users can stream LiveOne without leaving the casino.

### Email / SMTP

- **Canonical operator domain**: `pccasino.online` (not `pcasino.com` — that's a legacy typo that bounced every welcome email).
- **Required env vars**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (display + address). Optional: `UNSUBSCRIBE_SECRET` (HMAC for unsubscribe links), `SITE_URL`.
- **From-domain rule**: `SMTP_FROM`'s domain MUST match `SMTP_USER`'s domain or the SMTP relay (e.g. Hostinger) will SPF/DKIM-reject the message and bounce it back as a "mail daemon" failure. If the two don't align, the server automatically swaps `From:` to `SMTP_USER` and puts the friendly `noreply@pccasino.online` in `Reply-To` (logged once at boot).
- **Boot verification**: `initEmail()` runs `transporter.verify()` on startup and logs a single `[Email] READY` or `[Email] DISABLED` line. Cached state is exposed via `getEmailStatus()` and the `GET /api/admin/email/status` endpoint.
- **Per-send logging + counters**: Every outbound email logs `[Email:<label>] SENT|FAILED|SKIPPED to=… messageId=…|code=…|reason=…`. Daily sent/failed counters roll over at UTC midnight.
- **Admin debug**: `POST /api/admin/email/test { to }` (admin-only) sends a test message and returns the SMTP result. Wired in the admin dashboard's Broadcast tab as "SMTP Diagnostics".
- **Graceful signup fallback**: If SMTP is not ready at registration time, the user gets an in-app notification with the verification link instead of relying on email arriving.

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

### Testing

End-to-end tests live in `tests/e2e/` as Playwright TypeScript specs
(`*.spec.ts`) and run via `npm test` (alias `npm run test:e2e`). The
`playwright.config.ts` bootstraps the dev server (`npm run dev`) on
http://localhost:5000 with `reuseExistingServer`, so the same `npm test`
command works locally and in CI.

Helpers under `tests/e2e/helpers/` cover auth bootstrap (registers a fresh
user via `/api/auth/register` and seeds the JWT into `localStorage`) and lobby
navigation (the SPA uses in-memory routing, so games are entered by clicking
the lobby card rather than navigating by URL).

Current coverage:
- `poker-profile-popup.spec.ts` — clicks an AI seat (Taylor/Morgan/Jordan/
  Riley/Casey), asserts the PublicProfileCard heading, AI Opponent badge,
  Live · Poker header, Action / Wager / Stack columns, numeric stack value,
  and the AI Add-Friend gating message; closes via Escape.
- `dominoes-profile-popup.spec.ts` — starts a free practice game from the
  Dominoes setup screen so the AI seats render, then asserts the equivalent
  popup contract for Carlos/Maya/Zara with Action / Score / Tiles columns
  and PLAYING/KNOCKED/— action chip.