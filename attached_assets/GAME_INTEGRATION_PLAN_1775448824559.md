# $Pc Casino — CodeCanyon Game Integration Plan

---

## PLAN

### Phase 1 — Purchase Order (Do This First)
1. Buy **Horse Racing** — fills a gap, no overlap with existing games
2. Buy **French Roulette** — different variant from existing European Roulette, adds real dealer voice
3. Buy **Craps** (optional) — only if 3D graphics are noticeably better than current React version
4. Buy **Blackjack** (optional) — lowest priority, already have a working version

### Phase 2 — Setup (Before Any Game Arrives)
1. Create `/public/games/` directory in the project
2. Build a reusable `IframeGameWrapper` React component that:
   - Renders an `<iframe>` with the casino nav shell around it
   - Listens for `window.postMessage` events from inside the game
   - Routes `{ type: 'bet', amount: X }` → existing `handleBet()`
   - Routes `{ type: 'win', amount: X }` → existing `handleWin()`
   - Passes starting balance to the game via URL param (`?balance=XXXXXX`)
3. Add game route slots in `App.tsx` for `'horse-racing'`, `'french-roulette'` (and optionally `'craps-pro'`, `'blackjack-pro'`)
4. Add game cards to the lobby grid for the new entries

### Phase 3 — Per-Game Integration (Repeat for Each Purchased Game)
For each zip received from CodeCanyon:

1. **Drop files** — unzip into `/public/games/[gamename]/`
2. **Config patch** — open the game's main JS config object and set:
   - `money` → read from URL param `?balance=`
   - `min_bet` → 1000 (matches $Pc denomination)
   - `max_bet` → 10000000
   - `chip_values` → [1000, 5000, 10000, 50000, 100000, 500000]
   - Strip any ad hooks (`num_levels_for_ads: 0`)
3. **postMessage bridge** — locate the bet deduction function and win payout function in the game JS, insert two `window.parent.postMessage()` calls
4. **Visual reskin** — swap table felt images, chip colors, and branding to match $Pc casino dark/gold theme
5. **Remove external links** — strip any "Powered by codethislab" or author credits from the UI
6. **Test** — verify balance sync works in both directions, no balance desync on page refresh

### Phase 4 — Polish
1. Add each new game to the Leaderboard and Recent Winners systems on the backend
2. Add game thumbnail cards to the lobby matching existing card style
3. Update the footer game list links
4. Update `replit.md` with new game inventory

### Phase 5 — Quality Check
- Confirm each game runs on mobile (landscape orientation)
- Confirm $Pc chip denominations feel right (not too small, not too large)
- Confirm balance never goes negative
- Confirm win events fire correctly to the Socket.io leaderboard

---

## ANALYSIS — Full Game Compatibility Report

---

### How All 4 Games Are Built

All four are **standalone HTML5/JavaScript packages** — they ship as a folder of static files (`index.html`, `js/`, `assets/`). They are **not** built in React. They are designed to run as self-contained web pages.

This means they cannot be imported as React components directly. The integration method is the **iframe + postMessage bridge** pattern — the game runs inside an `<iframe>` hosted at a static path, and communicates bet/win events to the React parent via `window.parent.postMessage()`.

---

### Integration Architecture

```
React App (App.tsx)
    │
    ├── handleBet(amount)   ←──┐
    ├── handleWin(amount)   ←──┤  window.addEventListener('message', ...)
    │                          │
    └── <IframeGameWrapper>    │
            │                  │
            └── <iframe src="/games/horse-racing/index.html?balance=1000000">
                    │
                    └── Game JS fires:
                            window.parent.postMessage({ type: 'bet', amount: 5000 })
                            window.parent.postMessage({ type: 'win', amount: 12500 })
```

**Estimated time per game once source files are in hand: 2–3 hours**

---

### Game 1 — Craps HTML5

| Property | Detail |
|---|---|
| **CodeCanyon ID** | 17924256 |
| **Author** | codethislab |
| **Price** | ~$27 |
| **Engine** | CreateJS (EaselJS + TweenJS + SoundJS + PreloadJS) |
| **Language** | HTML5 / JavaScript |
| **Resolution** | 1280×768, responsive scaling |
| **Source Code** | Full unobfuscated JS included |

**Config Object (editable):**
```js
var oMain = new CMain({
  money: 1000000,          // ← inject from URL param
  min_bet: 1000,           // ← set to $Pc denomination
  max_bet: 10000000,
  chip_values: [1000, 5000, 10000, 50000, 100000, 500000],
  audio_enable_on_startup: true,
  fullscreen: true
});
```

**Overlap:** You already have a Craps game built natively in React. This purchased version has 3D graphics and professional animation that the current version likely does not match.

**Recommendation:** Optional upgrade — buy only if the 3D visuals are significantly better than the current in-house version. View the live demo before purchasing.

**Integration fit:** ✅ Excellent — same architecture as Horse Racing, same bridge applies

---

### Game 2 — Horse Racing HTML5

| Property | Detail |
|---|---|
| **CodeCanyon ID** | 20005304 |
| **Author** | codethislab |
| **Price** | ~$27 |
| **Engine** | HTML5 Canvas |
| **Language** | HTML5 / JavaScript |
| **Resolution** | 1216×832, responsive scaling |
| **Source Code** | Full unobfuscated `game/` folder + obfuscated `live_demo/` + WordPress plugin ZIP |

**Config Object (editable):**
```js
var oMain = new CMain({
  money: 1000000,          // ← inject from URL param
  min_bet: 1000,
  max_bet: 10000000,
  win_occurrence: 40,      // ← RTP tuning lever (lower = fewer wins)
  game_cash: 50000000,     // ← house bankroll cap
  chip_values: [1000, 5000, 10000, 25000, 50000, 100000],
  audio_enable_on_startup: true,
  fullscreen: true,
  check_orientation: true,
  num_levels_for_ads: 0    // ← disable ad hooks
});
```

**Overlap:** None. You have zero horse racing in the current game menu. This fills a real gap.

**Recommendation:** ✅ Buy this first. Brand new game type, unique in the lobby, highest value add.

**Integration fit:** ✅ Excellent — `win_occurrence` gives direct RTP control, chip values map cleanly to $Pc

---

### Game 3 — French Roulette HTML5

| Property | Detail |
|---|---|
| **CodeCanyon ID** | 53831511 |
| **Author** | ximroy |
| **Price** | ~$25 |
| **Engine** | Vanilla HTML5 / JS / CSS3 — no framework |
| **Language** | JavaScript, HTML5, CSS3 |
| **Audio** | 8 music tracks + croupier voiceover (EN/RU/FR) |
| **Languages** | English, Russian, French |
| **Source Code** | Full modular JS — `roulette.js`, `bets.js`, `ui.js`, `i18n.js` |

**French Roulette-Specific Rules (not in current European Roulette):**
| Rule | Description |
|---|---|
| La Partage | Player recovers half stake on even-money bets when 0 lands |
| En Prison | Bet is held for next spin instead of lost on 0 |
| Voisins du Zéro | 9-chip call bet covering 17 numbers near zero |
| Tiers du Cylindre | 6-chip call bet covering 12 numbers opposite zero |
| Orphelins | 5-chip bet on the 8 remaining numbers |

**Config hooks:** Chip denominations, min/max bets, La Partage toggle (affects house edge), language switcher

**Overlap:** You have European Roulette natively in React. French Roulette is a genuinely different game — different rules, different RTP, different bet types. Running both is standard at real casinos.

**Recommendation:** ✅ Buy second. The live croupier voiceover alone is a major UX upgrade. Cleanest codebase of the four — purest HTML5/JS, easiest to modify.

**Integration fit:** ✅ Excellent — modular JS makes bridge insertion easy, voiceover dealer adds legitimacy

---

### Game 4 — Blackjack HTML5

| Property | Detail |
|---|---|
| **CodeCanyon ID** | 60207314 |
| **Author** | Unknown (newer listing) |
| **Price** | ~$25 |
| **Engine** | HTML5 / JavaScript |
| **Language** | JavaScript, HTML5 |
| **Source Code** | Full source expected per CodeCanyon standard |

**Standard features expected:**
- Split hands, Double Down, Insurance
- Multi-deck shoe (configurable)
- Chip denominations via config
- Min/max bet limits via config

**Overlap:** You already have a Blackjack game built natively in React. This is a direct replacement, not a new game type.

**Recommendation:** Lowest priority — only purchase if the CodeCanyon version has features your current React version lacks (split hands, insurance, animated dealing, professional card art). View the live demo carefully before buying.

**Integration fit:** ✅ Good — same bridge pattern, standard config object

---

### Summary Table

| Game | Price | Type | Gap Filler | Work to Integrate | Buy Priority |
|---|---|---|---|---|---|
| Horse Racing | ~$27 | Brand new | ✅ Yes — no overlap | ~2-3 hrs | **1st** |
| French Roulette | ~$25 | New variant | ✅ Yes — different rules | ~2 hrs | **2nd** |
| Craps | ~$27 | Upgrade | ⚠️ Replaces existing | ~2-3 hrs | 3rd (optional) |
| Blackjack | ~$25 | Upgrade | ⚠️ Replaces existing | ~2-3 hrs | 4th (optional) |

---

### Licensing Notes

All four items use the **CodeCanyon Regular License**, which permits:
- ✅ Full source code access and modification
- ✅ Use in a single end product (this casino platform)
- ✅ Rebranding, reskinning, stripping author credits
- ✅ Adjusting RTP, bet limits, chip values
- ❌ Cannot resell or redistribute the source code
- ❌ Cannot use in multiple separate products without an Extended License

---

### What to Send After Purchase

Once you purchase any of these, share the downloaded ZIP file here. The integration process from there is:

1. Unzip → drop into `/public/games/[name]/`
2. Patch the config object with $Pc denomination values
3. Insert postMessage hooks into the bet and win functions
4. Reskin to match dark/gold casino theme
5. Wire into the React lobby and App.tsx routing
6. Test balance sync, mobile layout, and win events

**Total estimated time for all 4 games: 8–12 hours of integration work**
