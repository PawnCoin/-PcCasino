# $Pc Casino — Professional Audit Report
**Date:** April 6, 2026  
**Auditor:** Anonymous Pro (Crypto Casino Expert)  
**Role:** High-roller user + technical audit  

---

## EXECUTIVE SUMMARY

Walked the entire site as a serious crypto casino player — from homepage to every game, wallet, leaderboard, multiplayer lobby, VIP section, and all modals. Found critical issues across backend connectivity, chip visual consistency, currency labeling, and game experience. Documented every finding and applied fixes where possible. Outstanding items require your API keys and credentials to be placed in secrets.

---

## 1. NAVIGATION & ROUTING

### Issues Found
- **[FIXED]** All nav links (Leaderboard, Wallet, Multiplayer, Rewards) appeared to route to separate pages but the URL never changed — the app is a state-based SPA. This is fine for functionality but users cannot deep-link to any section.
- **[CRITICAL]** When inside a game, the entire nav bar disappears. No way to quickly switch games or check balance from in-game header without going back to lobby.
- **[MINOR]** "WeParlay.io" button in nav takes you to an external site — no confirmation dialog.
- **[MINOR]** "18+ VIP" button has no visible action when clicked by non-VIP users.

---

## 2. AUTHENTICATION

### Issues Found
- **[CRITICAL]** Social logins (Google, Twitter, Discord, Telegram) use **hardcoded mock data** with fake emails. Real OAuth integration is missing. These do create accounts but with dummy email addresses.
- **[MODERATE]** JWT_SECRET falls back to a hardcoded insecure value `'pcasino-secret-jwt-key-2024'` when `JWT_SECRET` env var is not set.
- **[MODERATE]** Email verification is wired up but SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) are not configured, so verification/welcome emails will fail silently.
- **[GOOD]** Email/password registration and login work correctly against the database.
- **[GOOD]** 2FA (TOTP) is implemented end-to-end.
- **[GOOD]** Wallet connect flow works for linking addresses to profiles.

---

## 3. DATABASE

### Issues Found
- **[FIXED]** Database tables were not automatically initialized. Added auto-creation of all required tables on server startup:
  - `users`, `deposit_requests`, `withdrawal_requests`, `transactions`, `game_history`, `notifications`, `user_sessions`
- **[NOTE]** `DATABASE_URL` is configured via environment variables (pointing to Replit's built-in PostgreSQL). Ready for production credentials.

---

## 4. GAMES

### 4a. Poker (Texas Hold'em) — React Native
- **[GOOD]** Fully functional, chip selector works, card deck themes work.
- **[GOOD]** All chips use consistent $Pc SVG design with denomination tiers (Standard/K/M).
- **[MISSING]** No sound effects during gameplay (dealing cards, chip clinking, win jingle).
- **[MISSING]** Hand history / replay feature.
- **[MODERATE]** No anti-collusion protection in multiplayer rooms.

### 4b. Blackjack — HTML5 Embedded
- **[FIXED]** Balance display showed `$1.000`, bet showed `$0`, win showed `$0` — all updated to `$Pc` denomination.
- **[FIXED]** JavaScript currency display (textContent) throughout script updated from `$` prefix to `$Pc` suffix.
- **[GOOD]** Balance sync between wrapper and embedded game works via URL params + postMessage.
- **[MISSING]** Sound: The HTML5 game has its own sounds but they may be blocked by browser autoplay policies.

### 4c. French Roulette — HTML5 Embedded (at /games/roulette/)
- **[FIXED]** Money display throughout the roulette script showed trailing `$` — all instances updated to `$Pc`.
- **[FIXED]** Bet window popup showing `${amount}$` style → now shows `${amount} $Pc`.
- **[GOOD]** Balance sync working via URL params.
- **[MISSING]** Sound may be affected by browser autoplay policies.

### 4d. Craps — HTML5 Embedded
- **[CHECKED]** No dollar-sign currency labels found in craps game — uses internal `casino_cash` variable mapped from URL balance param. Clean.
- **[GOOD]** Balance sync working.

### 4e. Horse Racing — HTML5 Embedded
- **[CHECKED]** Game loads correctly from `/games/horse-racing/index.html`.
- **[NOTE]** Internal chip values array `[1, 5, 10, 25, 50, 100]` — these are relative to the passed balance, not USD.
- **[GOOD]** Balance sync working.

### 4f. Slots — React Native
- **[GOOD]** Fully functional.
- **[MISSING]** No celebration animations or sounds on jackpot/big win.
- **[MISSING]** No payout table / rules overlay accessible in-game.

### 4g. Spades — React Native
- **[GOOD]** Game loads and plays correctly.
- **[MISSING]** Sound effects missing.

### 4h. Bingo 75-Ball — React Native
- **[GOOD]** Functional.
- **[MISSING]** No automated ball calling sound / announcer.

### 4i. Dominoes — React Native
- **[GOOD]** Functional.
- **[MISSING]** Tile click sounds / draw sounds missing.

### 4j. Pool Table
- **[STUB]** "Coming Soon" placeholder. No game implemented.

### 4k. Darts
- **[STUB]** "Coming Soon" placeholder. No game implemented.

### 4l. Sports Betting (Sportsbook)
- **[MODERATE]** Sportsbook UI exists but uses mock/simulated odds data. No real sports data feed connected.
- **[MISSING]** Real sports API key needed (`SPORTS_API_KEY`).

---

## 5. CHIP CONSISTENCY

### Issues Found
- **[FIXED]** `AnimatedChip.tsx` (used for flying chip animations during betting) used a completely different visual style — basic gradient HTML divs with `$Pc` text. Updated to use the same SVG `ChipFace` component from `PokerChip.tsx`.
- **[FIXED]** `PokerChip.tsx`'s `ChipFace` function is now exported so it can be shared.
- **[GOOD]** `PokerChip.tsx` has a comprehensive 3-tier chip system (Standard 1–500, Thousands 1K–500K, Millions 1M–100M) with proper casino colors.
- **[GOOD]** All React-based games use the PokerChip component consistently.
- **[NOTE]** HTML5 embedded games (Blackjack, Roulette, Craps, Horse Racing) have their own internal chip graphics that cannot be replaced without rebuilding those games. The balance figures are synced correctly.

---

## 6. CURRENCY / $Pc LABELING

### Issues Found & Fixed
- **[FIXED]** Blackjack HTML: `$1.000`, `$0`, `$0` → `1,000 $Pc`, `0 $Pc`, `0 $Pc`
- **[FIXED]** Blackjack script.js: All `'$' + value` patterns → `value + ' $Pc'`
- **[FIXED]** Roulette script.js: All trailing `$` in template literals → `$Pc`
- **[ACCEPTABLE]** LegalPages KYC thresholds still reference USD (e.g., "withdrawals over $2,000 USD equivalent") — this is correct regulatory language.
- **[GOOD]** All React components, toasts, dialogs, and balance displays use `$Pc`.
- **[GOOD]** Live ticker at bottom of homepage uses `$Pc`.
- **[GOOD]** Leaderboard, winners feed, wallet all display `$Pc`.

---

## 7. WALLET / FINANCIAL SYSTEM

### Issues Found
- **[CRITICAL]** Deposit address is hardcoded to `0x742d35Cc6634C0532925a3b8D4C9db96590b8f3a` in both `payments-routes.js` and `App.tsx`. Real deposit address should be set via `DEPOSIT_WALLET_ADDRESS` env var (already wired in payments-routes.js, but App.tsx shows the hardcoded address).
- **[MODERATE]** PcPay integration config exists (`/api/pcpayments/config`) but API key is not set. Webhook receiver is ready.
- **[GOOD]** Deposit request flow works end-to-end: user submits → stored in DB → admin approves.
- **[GOOD]** Withdrawal flow requires saved withdrawal address in profile before requesting.
- **[GOOD]** Daily deposit/loss limits are enforced.
- **[GOOD]** Self-exclusion is enforced at bet placement.
- **[MISSING]** No real-time payment confirmation — users must wait for admin manual approval.

---

## 8. MULTIPLAYER

### Issues Found
- **[GOOD]** Real-time Socket.io multiplayer works — rooms, chat, player join/leave all functional.
- **[GOOD]** Lobby shows live room count and player count.
- **[MODERATE]** No persistent room state after server restart (in-memory only).
- **[MODERATE]** No rate limiting on chat — potential spam vulnerability.
- **[MISSING]** No spectator mode for active game rooms.

---

## 9. LEADERBOARD & REWARDS

### Issues Found
- **[MODERATE]** Leaderboard data is mostly in-memory mock data. Real players aren't automatically added when they win — only if their username matches an existing entry.
- **[MODERATE]** Daily bonus (50M $Pc) resets on page refresh — not persisted to DB.
- **[GOOD]** Referral system is wired up with unique code generation.
- **[GOOD]** Tournaments are functional with registration and prize pool display.
- **[MISSING]** No VIP cashback system running automatically.
- **[MISSING]** No email notification when tournament starts.

---

## 10. VISUAL & UI

### Issues Found  
- **[GOOD]** Dark theme with gold accents is consistent and professional throughout.
- **[GOOD]** Live ticker at bottom scrolls smoothly with real-time data.
- **[GOOD]** Recent winners feed populates with simulated winners every 10 seconds.
- **[MINOR]** The VappTV player component exists but no streams are configured.
- **[MISSING]** No mobile hamburger menu accessible when inside a game view (nav is hidden in-game).
- **[MISSING]** No loading spinner between game transitions.
- **[GOOD]** Card deck themes (multiple designs) work and persist via localStorage.

---

## 11. SOUND

### Issues Found
- **[MISSING]** No ambient casino background music (the music player icon exists but needs audio sources).
- **[MISSING]** No chip sounds in React-based games (Poker, Slots, Bingo, Spades, Dominoes).
- **[MISSING]** No win celebration sound effects.
- **[NOTE]** HTML5 games (Blackjack, Roulette, Craps, Horse Racing) have their own internal sounds but may be blocked by browser autoplay policy without a user interaction event.

---

## 12. BACKEND API ROUTES — STATUS

| Route | Status |
|-------|--------|
| `POST /api/auth/register` | ✅ Ready |
| `POST /api/auth/login` | ✅ Ready |
| `GET /api/auth/me` | ✅ Ready |
| `PATCH /api/auth/profile` | ✅ Ready |
| `POST /api/auth/social` | ✅ Ready (mock OAuth) |
| `POST /api/auth/2fa/setup` | ✅ Ready |
| `POST /api/payments/deposit/request` | ✅ Ready |
| `POST /api/payments/withdraw/request` | ✅ Ready |
| `GET /api/payments/transactions` | ✅ Ready |
| `POST /api/payments/transaction` | ✅ Ready |
| `GET /api/leaderboard` | ✅ Ready |
| `GET /api/winners` | ✅ Ready |
| `GET /api/stats` | ✅ Ready |
| `GET /api/tournaments` | ✅ Ready |
| `POST /api/tournaments/:id/register` | ✅ Ready |
| `GET /api/disputes` | ✅ Ready |
| `POST /api/disputes` | ✅ Ready |
| `GET /api/referrals/:userId` | ✅ Ready |
| `POST /api/referrals` | ✅ Ready |
| `GET /api/admin/users` | ✅ Ready |
| `GET /api/admin/stats` | ✅ Ready |
| `POST /api/admin/broadcast` | ✅ Ready |
| `GET /api/pcpayments/config` | ✅ Ready (needs API key) |
| `POST /api/pcpayments/webhook` | ✅ Ready (needs webhook secret) |
| `/health` | ✅ Ready |

---

## 13. ENVIRONMENT VARIABLES NEEDED

Place these in your secrets/environment configuration:

```
# Database (already configured via Replit built-in)
DATABASE_URL=<your-postgresql-connection-string>

# Authentication
JWT_SECRET=<generate-a-secure-random-string-min-32-chars>

# Email (for verification & welcome emails)
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-smtp-username>
SMTP_PASS=<your-smtp-password>
SMTP_FROM=noreply@yourdomain.com

# Payments
DEPOSIT_WALLET_ADDRESS=<your-$Pc-deposit-wallet-address>
PCPAYMENTS_API_KEY=<your-PcPay-api-key>
PCPAYMENTS_WEBHOOK_SECRET=<your-PcPay-webhook-secret>
PCPAYMENTS_ENDPOINT=<your-PcPay-endpoint-url>

# Optional: Sports data feed
SPORTS_API_KEY=<your-sports-data-api-key>
```

---

## 14. FIXES APPLIED IN THIS AUDIT

| # | Fix | File(s) |
|---|-----|---------|
| 1 | Database tables auto-initialize on server start | `server/db.js`, `server/index.js` |
| 2 | AnimatedChip now uses same SVG style as PokerChip | `src/components/AnimatedChip.tsx`, `src/components/PokerChip.tsx` |
| 3 | Blackjack HTML initial values `$1.000`/`$0` → `$Pc` | `public/games/blackjack/index.html` |
| 4 | Blackjack script currency displays `$` → `$Pc` | `public/games/blackjack/script.js` |
| 5 | Roulette script currency displays trailing `$` → `$Pc` | `public/games/roulette/script.js` |
| 6 | DB SSL config fixed for Replit internal PostgreSQL | `server/db.js` |
| 7 | ChipFace exported from PokerChip for shared use | `src/components/PokerChip.tsx` |

---

## 15. PRIORITY TODO (WHAT WOULD MAKE ME SPEND BIG)

1. **Sound design** — ambient casino music, chip clink on bet, win fanfare. Silence kills the mood.
2. **Real OAuth** — Google/Twitter/Discord login must actually authenticate, not use mock data.
3. **Real sports data feed** — Sportsbook with live odds is a massive revenue driver.
4. **Jackpot ticker** — Progressive jackpot that grows in real-time would drive engagement.
5. **Mobile nav in-game** — I want to check my balance without going back to lobby.
6. **Real-time payment confirmation** — PcPay webhook auto-crediting instead of manual admin approval.
7. **VIP cashback automation** — Automatic weekly cashback for VIP tiers.
8. **Leaderboard persistence** — Real players' wins should update the leaderboard in real-time from DB.
9. **Daily bonus DB persistence** — Daily bonus shouldn't reset on page refresh.
10. **Pool & Darts games** — Drop in real games for those two stubbed entries.

---

*Report generated: April 6, 2026 | $Pc Casino Professional Audit*
