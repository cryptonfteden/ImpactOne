# INSTALL_EXPERIENCE.md — Phase APP-STORE-QUALITY-001

Scope: PWA manifest correctness, service worker behavior, and the real "install to home screen → first launch" path a real phone user goes through. No native app-store wrapper (Capacitor/Cordova/TWA) exists in this repo — this is a real installable web PWA, evaluated on those terms.

## Manifest (`frontend/public/manifest.json`)

```json
{
  "name": "ImpactOne",
  "short_name": "ImpactOne",
  "description": "Personal AI investment intelligence companion.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#06090f",
  "theme_color": "#06090f",
  "icons": [ ...192/512/maskable-192/maskable-512, all present as real PNG files... ]
}
```

- `name`/`short_name` — real, correct, no placeholder text.
- `display: "standalone"` — correct for a real app-like install (no browser chrome).
- `background_color`/`theme_color` — both `#06090f`, which matches this app's own real `--bg-0` design token (`styles.css`, `theme.js`) — i.e. the color shown during native install/splash actually matches the real rendered app background, not an arbitrary placeholder value. Verified this is the token that actually wins the CSS cascade for `body`'s real background (a later, more specific rule than the earlier `:root { background-color: #0b1020 }` fallback).
- `icons` — 4 real PNG files present (`icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`) plus a separate `apple-touch-icon.png` for iOS. All referenced paths resolve to real files in `public/` (confirmed via directory listing).
- **Fixed this phase:** `"orientation": "portrait-primary"` removed. This was written in Sprint 33 specifically because landscape was fundamentally broken at the time (no usable nav at all in landscape). Landscape has since been genuinely fixed and was re-verified live this session (real bottom nav, single-row header, zero overflow, in both rotation directions without reload) — locking orientation on install would have silently prevented every installed-app user from ever reaching the now-working landscape layout, the opposite of what "device rotation" readiness requires.
- **Not present, recommended not fabricated:** a `screenshots` array. Chrome/Android's "richer" install UI (a preview carousel in the install prompt) requires at least one real screenshot entry. Adding this would need genuine, current, polished-UI screenshots (not a Guest/dev-mode capture with visible error banners) — out of scope for a code-only fix pass. Recommendation: capture 2-3 real screenshots (one portrait mobile, one desktop-wide) of a populated, non-error state once real production data is flowing, and add them with correct `sizes`/`form_factor` metadata.
- **Not present, low priority:** an `id` field (lets the manifest survive an icon change without losing its installed identity on some platforms) and `shortcuts` (home-screen long-press quick actions). Neither is required for a correct install; both are nice-to-have future enhancements, not defects.

## Service worker (`frontend/public/sw.js`)

Read in full. Real, deliberate design, already sound:

- **Install:** caches a fixed app-shell list (`/`, `/index.html`, `/manifest.json`, icons) *and* fetches `/index.html` at install time to parse its real, hashed `/assets/*.js`/`.css` script/link URLs — correctly handles the fact that Vite's production bundle filenames change every build and can't be hardcoded. This directly avoids the "offline reload shows an index.html whose own script tags 404" failure mode called out in the service worker's own code comment.
- **Activate:** deletes every cache key except the current `CACHE_VERSION` — no stale-cache accumulation across versions.
- **Fetch — API/data requests (`/api/`, `/v2/`):** always network, never cached. This is a real, deliberate trust decision (a failed fetch surfaces as an honest "unavailable" state rather than silently showing stale financial data as if live) — correctly scoped, confirmed via `isApiRequest()`.
- **Fetch — navigations:** network-first, falls back to the cached shell only when the network is genuinely unreachable (real offline support, not a permanent stale-shell trap).
- **Fetch — static assets:** cache-first with a network fallback and opportunistic cache refresh.
- **Registration** (`registerServiceWorker.js`, called from `main.jsx`) — registered unconditionally on every load; not independently re-read this phase beyond confirming the call site exists, since `sw.js` itself (the higher-risk surface) was the focus.

No changes were made to `sw.js` this phase — it was already correct and did not need a fix.

## First launch — real path walked live

1. **Fresh session** (`localStorage.clear()` + `sessionStorage.clear()`, then a real navigation, not a soft reload): the branded boot/loading state (`.boot-loading`, "Loading ImpactOne" + spinner) renders immediately — confirmed, not a blank white flash.
2. **"Welcome to the beta" dialog** renders as a real modal (`role="dialog"`, correctly labeled), with 3 honest, plain-language disclosures (empty recommendations = normal, portfolio = simulated paper trading, everything advisory-only) — reconfirmed live this phase on a genuinely fresh, cleared-storage session, exactly as documented in prior sessions.
3. Dismissing the dialog ("Got it") reveals the real Home screen with the 5-item bottom nav, correctly sized touch targets (post-fix), and no layout defects at 390px width.
4. **Known, out-of-scope, previously-documented limitation, reconfirmed unchanged:** a genuinely fresh/cleared browser session still lands in the same server-side shared Guest account (existing portfolio/history), rather than a truly blank per-device identity. This is a long-standing identity/isolation architecture finding tracked extensively elsewhere in this engagement (not a mobile/install-readiness defect, and explicitly outside this mission's focus list) — reconfirmed present, not re-investigated or re-fixed here.

## iOS-specific notes (not independently verifiable without real hardware)

- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, and `apple-touch-icon` are all present and correct in `index.html`.
- `black-translucent` extends app content under the iOS status bar — this requires (and already has) `env(safe-area-inset-top)` padding on the header to avoid content sitting under the status bar/notch; confirmed present.
- No explicit `apple-touch-startup-image` tags exist for a custom per-device iOS splash. Apple's own documentation states iOS 11.3+ Safari synthesizes a splash from the manifest's icon + `background_color`, both of which are correct here — but genuine on-device rendering was not verifiable in this environment. Recommendation: verify on a real iPhone before shipping; if the auto-generated splash looks wrong, add explicit `apple-touch-startup-image` tags at that point (not fabricated speculatively here).

## Android-specific notes

- Manifest `display: "standalone"` + valid icons + a registered, functioning service worker are the 3 real requirements Chrome's install-ability heuristic checks — all 3 confirmed present and correct.
- Maskable icons (`icon-maskable-192.png`/`icon-maskable-512.png`) are present, which lets Android adaptive-icon shapes (circle/squircle/etc.) render the icon correctly instead of letterboxing a non-maskable icon — a real, already-solved requirement, not fixed this phase because it wasn't broken.
