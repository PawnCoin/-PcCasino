# $Pc Casino

A React + Vite + TypeScript casino web application featuring multiple card and casino games with premium visual effects, part of the Pawn Coin ecosystem. The Command Center is an external app at pawncoinpc.com — not included in this application.

## Games
Texas Hold'em Poker, Blackjack, Roulette (3D), French Roulette (iframe), Craps, Spades (Elite Edition), Slots, Bingo 75-Ball, Dominoes, Horse Racing (iframe), Pool Table (8-ball canvas physics), Darts 501 (canvas dartboard vs AI)

## Task 42: Profile Editing, Favorite Games & Public Casino Card (Implemented)
- **DB schema**: Added `display_name`, `bio`, `avatar_url`, `social_twitter`, `social_instagram`, `social_telegram`, `social_discord`, `public_stats_visible`, `public_socials_visible` columns to users table
- **Avatar upload**: `POST /api/auth/profile/avatar` — accepts raw image bytes, validates type/size (max 5MB), stores to `public/uploads/avatars/`, updates `avatar_url`
- **Expanded PATCH /api/auth/profile**: Now accepts all new profile fields + privacy toggles
- **Favorite games**: `GET /api/auth/profile/favorite-games` — top 5 games by play count from `game_history` table
- **Public profile**: `GET /api/auth/profile/public/:username` — returns non-sensitive public data respecting privacy toggles
- **UserProfile.tsx**: Added "Edit Profile" mode with photo upload widget, display name/bio inputs, social handles, privacy toggles; added "Favorite Games" panel with Play Now buttons
- **PublicProfileCard.tsx**: New modal showing avatar, display name, VIP tier, casino stats, social links — opened by clicking any username in the app
- **LobbyChat.tsx**: Usernames are now clickable links to open the Public Casino Card
- **Leaderboard.tsx**: Usernames in podium and table are clickable links to open the Public Casino Card
- **App.tsx**: Wired up PublicProfileCard, passed onViewProfile to LobbyChat and Leaderboard, passed onUserUpdated and onNavigateToGame to UserProfile
- **Static serving**: `/uploads` path served for avatar images

## High-Priority Improvements (Implemented)

### 1. Sound Design
- `src/hooks/useCasinoSound.ts` — Web Audio API sounds (no files): chip clink, win fanfare, jackpot fanfare, card deal, button click, dice roll, loss
- All sounds generated programmatically; works offline without any CDN

### 2. Real OAuth
- Google, Discord, Twitter OAuth 2.0 in `server/index.js`
- Routes: `GET /api/auth/oauth/{google,discord,twitter}` → provider → callback → `/?oauth_token=TOKEN&oauth_provider=PROVIDER`
- `App.tsx` reads URL params on load to complete login
- Env vars needed: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`

### 3. Live Sports Data
- `GET /api/game/sports` — fetches from The Odds API when `ODDS_API_KEY` env var is set
- 5-minute server-side cache to avoid rate limits
- Realistic mock fallback events if no API key

### 4. Progressive Jackpot Ticker
- `src/components/JackpotTicker.tsx` — real-time ticker updated via WebSocket every 5s
- Grows only from real bets via `POST /api/jackpot/contribute` (1% of each bet); starts at 0
- Win flash animation when jackpot is won; reset via `POST /api/jackpot/win`
- Server emits `jackpot:update` and `jackpot:won` events

### 5. VIP Cashback Automation
- Runs every 6 hours in `server/index.js`
- Rates: bronze=0%, silver=1%, gold=2%, platinum=5%, diamond=10%
- Based on last 7-day wagered amount; creates notification + transaction record
- Emits `cashback:credited` socket event to connected user

### 6. Real-time Payment Confirmation
- PcPay webhook `POST /api/pcpayments/webhook` auto-credits user balance
- Deduplicates by tx hash; emits `payment:deposit:confirmed` to user's socket room
- `App.tsx` listens and updates balance + shows toast instantly

### 7. Leaderboard DB Persistence
- `/api/leaderboard` now queries DB only — no fake fallback data
- Returns empty array when DB has no players yet
- Broadcast every 30s from DB data; empty state shown in UI

### 9. Live $Pc Price Ticker (NEW)
- `src/components/PcPriceTicker.tsx` — live price widget in nav bar, clicks to expand
- Backend proxy: `GET /api/pc-price` — proxies DexScreener → GeckoTerminal → GeckoTerminal tokens
- Env var required: `PC_TOKEN_CONTRACT` (token contract address, e.g. Ethereum 0x...)
- Optional: `PC_TOKEN_NETWORK` (default: `eth`, also supports `bsc`, `polygon`, etc.)
- No API key needed — DexScreener and GeckoTerminal are both free
- Shows price, 24h change %, volume, liquidity, market cap; links to DexScreener and CoinGecko
- Updates every 30 seconds; shows flash animation on price change

### 10. Real Data Platform Launch (NEW)
- All fake/mock data removed: no fake winners, no fake leaderboard, no fake player counts
- HeroSection fetches real stats from `/api/stats` every 30s (real wins, real players, real jackpot)
- JackpotTicker starts at 0; grows only from real bets
- RecentWinners and Leaderboard show empty state when no real data exists yet
- WalletConnect: removed demo/fake address generation; Coinbase/Trust show install prompts; WalletConnect shows "coming soon"
- Treasury wallet: `DEPOSIT_WALLET_ADDRESS` must be set in env secrets; server warns + rejects deposits if not configured

### Environment Variables Required for Launch
| Variable | Purpose |
|---|---|
| `PC_TOKEN_CONTRACT` | $Pc ERC-20 token contract address for live price feed |
| `PC_TOKEN_NETWORK` | Token network: `eth`, `bsc`, `polygon` (default: `eth`) |
| `DEPOSIT_WALLET_ADDRESS` | Treasury wallet to receive crypto deposits |
| `JWT_SECRET` | JWT signing secret for sessions |
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `DISCORD_CLIENT_ID/SECRET` | Discord OAuth |
| `TWITTER_CLIENT_ID/SECRET` | Twitter OAuth |
| `ODDS_API_KEY` | Live sports odds (The Odds API) |

### 8. Daily Bonus DB Persistence
- `GET /api/game/daily-bonus` — check if claimed today (persisted in `users.daily_bonus_claimed_at`)
- `POST /api/game/daily-bonus` — claim bonus with server-side validation
- `App.tsx` calls DB on login to get current claim status

### 9. Pool Table Game
- `src/components/games/PoolGame.tsx` — HTML5 Canvas 8-ball pool
- Physics: friction, ball-wall bounce, ball-ball collisions, pocket detection
- Aim line with power indicator, betting 1K–500K $Pc, 2x payout

### 10. Darts 501 Game
- `src/components/games/DartsGame.tsx` — HTML5 Canvas dartboard
- Full segment rendering: singles, doubles, triples, bull, outer bull
- AI opponent with realistic throwing; click to throw with aim wobble
- Score tracking, bust detection, 3 throws per turn, betting system

### Special Sections
- **Sports Gambling card** → links to WeParlay Inc. (external, opens in new tab)
- **Adult V.I.P. Area** → age-gated 18+ exclusive lounge with all games at higher limits. Component: `src/components/VipArea.tsx`

### CodeCanyon Iframe Game Integration
- **IframeGameWrapper** — `src/components/games/IframeGameWrapper.tsx` — reusable wrapper that embeds any standalone HTML5 game in an iframe, passes balance via URL param `?balance=`, and bridges bet/win events via `window.postMessage`. Handles both directions.
- **French Roulette** — route `roulette` — files extracted from CodeCanyon zip into `/public/games/roulette/`. Fully integrated. CodeCanyon ID: 53831511. Balance read from URL `?balance=`. Sends `{ type: 'bet' }` on spin start and `{ type: 'win' }` on net-positive round end.
- **Blackjack** — route `blackjack` — files in `/public/games/blackjack/`. Fully integrated. Balance read from URL `?balance=`. Sends `{ type: 'win' }` or `{ type: 'bet' }` at round end based on net P&L.
- **Craps** — route `craps` — files in `/public/games/craps/`. Fully integrated via jQuery `save_score` event. Sends net change to parent on each round end.
- **Horse Racing** — route `horse-racing` — files in `/public/games/horse-racing/`. Fully integrated via jQuery `save_score` event. Sends net change to parent on each race result.
- postMessage protocol: game sends `{ type: 'bet', amount }` and `{ type: 'win', amount }`. Wrapper replies `{ type: 'bet:result', success, balance }` and `{ type: 'win:confirmed', amount, balance }`. Parent sends `{ type: 'balance:update', balance }` on external balance changes.

### Bug Fixes Applied
- **Admin auth**: Removed redundant hardcoded password (`pcadmin2024`). Admin panel now opens directly if user has `isAdmin: true` flag. Password gate removed.
- **Game wins → Leaderboard**: `handleWin()` in App.tsx now emits `game:win` socket event to server on every win, which updates the live leaderboard and recent winners feed in real-time.
- **Lobby chat profanity filter**: `LobbyChat.tsx` filters a list of blocked words (replacing with asterisks) before sending to server.

### Navigation Menu
- **WeParlay.io image button** — `/public/images/weparlay-menu.png` — links externally to `weparlay.io`, shows the WeParlay branded image
- **18+ VIP image button** — `/public/images/adult-menu-banner.png` — AI-generated dark luxury adult gaming banner

### Real Multiplayer (Socket.io)
- **Backend server**: `server/index.js` — Express + Socket.io on port 3001. Manages real-time rooms, players, chat, reactions, game state sync.
- `src/lib/socket.ts` — Frontend socket client. Functions: `identifyPlayer`, `createRoom`, `joinRoom`, `leaveRoom`, `sendChatMessage`, `sendReaction`, `sendGameAction`, `syncGameState`, `startGame`, `endGame`, `updateBalance`.
- `MultiplayerLobby.tsx` — Live modal with real socket connections. Shows real rooms from server, create/join with callbacks. Filters by game, name, min bet.
- `GameRoom.tsx` — Floating in-game panel: live player list, ready state, emoji reactions (float animation), chat, leave room.
- Vite proxies `/socket.io` → port 3001 for seamless dev connection.
- Both servers run concurrently via `concurrently` in the `dev` npm script.

### Casino Environment
- `CasinoBackground.tsx` — fixed-position canvas renderer. Supports 3 perspective modes: **Overview**, **3rd Person**, **1st Person** (switch via floating toggle in bottom-right corner). Also supports `videoUrl` prop for streaming an Unreal Engine environment as background video.

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

## Shared In-Game UI System

All games use `InGameTopBar` as a unified top navigation bar:
- **`InGameTopBar`** — fixed top bar with game name, $Pc balance display, back button, VappTV PiP overlay (members-only), options panel, quick-buy button, social share, and optional `rightSlot` for game-specific controls
- **`InGameOptionsPanel`** — avatar picker, volume, voice/text/AI toggles; opens from top bar
- **`InGameQuickBuy`** — quick balance reload drawer
- **`GlobalGameContext`** — shared state (balance formatting, membership threshold 100M $Pc, QUICK_BETS)
- **`CasinoBackground`** — animated casino lobby backdrop (checkerboard carpet, spotlights, floating suit chars, vignette)
- All chip/bet values are million-scale: 1M, 5M, 10M, 25M, 50M, 100M, 500M, 1B $Pc
- `onAddBalance` prop wired from App.tsx to every game for quick reload functionality

## Games

- Texas Hold'em Poker
- Blackjack
- Spanish 21 (with side bets: 3 Card Poker, Match The Dealer, Perfect Pair)
- Roulette (European)
- Craps & Dice
- Spades (4-player)
- Slots (3x5 reel)
- Bingo (75-ball)
- Dominoes (Draw, Double-Six, 4-player)
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

## SEO Audit — All Items Resolved

All actionable audit items are complete:

| # | Item | Status |
|---|------|--------|
| 1 | About page (`/about`) | ✅ `public/about.html` + Vite clean-URL middleware |
| 2 | Contact page (`/contact`) | ✅ `public/contact.html` + Vite clean-URL middleware |
| 3 | Privacy Policy clean URL (`/privacy-policy`) | ✅ Vite middleware rewrites to `.html` + Express route alias |
| 4 | Sitemap updated with About/Contact clean URLs | ✅ `public/sitemap.xml` |
| 5 | Color contrast on static pages (`#ccc` → `#e5e5e5`) | ✅ All 4 static pages updated |

Auto-resolves on deployment: sitemap domain mismatch, canonical/noindex conflict, JS minification.

---

## SEO & Accessibility

All SEO work targets `index.html` (static shell) because the app is CSR (React renders client-side — crawlers see bare HTML before JS runs).

- **index.html**: Full title (55 chars), meta description (≤160 chars), canonical URL, Open Graph, Twitter Card, JSON-LD WebSite structured data, robots meta, visually-hidden H1 inside `#root`, skip-link for keyboard users, static `<main id="main-content">` wrapping `#root`, static `<footer>` with privacy policy link
- **robots.txt** (`public/robots.txt`): `Allow: /`, points to sitemap
- **sitemap.xml** (`public/sitemap.xml`): Covers `/`, `/privacy-policy.html`, `/terms.html`
- **privacy-policy.html** (`public/privacy-policy.html`): Static standalone privacy policy page
- **terms.html** (`public/terms.html`): Static standalone terms of service page
- **UserProfile hook fix**: Moved `useMemo` above the `if (!user) return null` early-return in `UserProfile.tsx` to fix Rules of Hooks violation
- **UserProfile VIP badge**: Reads real `user.vipTier` (bronze/silver/gold/platinum/diamond) from DB and renders matching tier color
- **UserProfile 2FA**: Fully wired to `authApi.setup2FA()` (QR generation), `authApi.enable2FA(code)` (verify), `authApi.disable2FA(code)` (with confirmation prompt)
- **UserProfile self-exclusion**: Wired to `authApi.selfExclude(days)` with correct period-to-days mapping; buttons disabled while loading or when exclusion already active; admin-only removal
- **UserProfile daily limit**: Wired to `authApi.updateProfile({ dailyLossLimit })` instead of localStorage
- **UserProfile avatar**: Renders `AvatarSprite` component; `avatarDef` prop now correctly passed from App.tsx
- **App.tsx → UserProfile**: Added `avatarDef={userAvatarDef}` and `user={user as any}` so all extended user fields (vipTier, totpEnabled, etc.) flow through
- **Audit scores** (squirrelscan): 38 → 46 → 54/100. Legal Compliance: 100%, Accessibility: 99%, Social Media: 100%, Structured Data: 100%
- Remaining warnings are dev-environment-only (sitemap canonical points to prod domain `pcasino.replit.app`); will resolve on deployment

## Workflow

- **Start application**: `npm run dev` on port 5000

## Poker Hand History & Replay (Task #21)

- **DB table**: `poker_hand_history` — stores hole cards, community cards, all player actions by street, pot, winner, hand name, net, share token
- **Backend API**:
  - `POST /api/game/poker/hands` — save a hand (auth required); returns `shareToken`
  - `GET /api/game/poker/hands` — list last 50 hands for authenticated user
  - `GET /api/game/poker/hands/share/:token` — fetch any single hand publicly by share token (no auth required)
- **Frontend**:
  - `src/components/PokerHandReplay.tsx` — shared replay component (mini cards, action timeline by street, step-through replay controls, share button)
  - `src/components/PokerHandHistory.tsx` — authenticated panel showing the last 50 hands with expandable replays
  - `src/components/PokerHandSharePage.tsx` — public page for shared hand URLs
  - `PokerGame.tsx` — tracks actions per street, saves hand to DB at showdown, History toggle button in top bar
  - `App.tsx` — handles `/poker/hand/:token` URL pattern and renders public share page without requiring login

## Deployment

- Type: Static site
- Build command: `npm run build`
- Public directory: `dist`
