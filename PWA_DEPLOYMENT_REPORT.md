# PWA Deployment Report — PHONE-INSTALLATION-001

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-08-01

## Mission

Make ImpactOne installable and usable on the founder's real phone as a production-like PWA, using the existing deployment and PWA infrastructure — no new product features, no UI redesign, no AI/backend business-logic changes.

## What Already Existed (Verified, Not Rebuilt)

This app already shipped a real PWA foundation from earlier phases:

- **`frontend/public/manifest.json`** — `name`, `short_name`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, real theme/background colors, and four real icon entries (192/512, plus maskable 192/512 for Android's adaptive-icon mask).
- **`frontend/public/sw.js`** — an app-shell service worker: caches the shell + hashed build assets (parsed live from `index.html` at install time, since bundle filenames change every build), always network-only for `/api/`/`/v2/` requests (never serves stale financial data), network-first for navigations with a cached-shell fallback offline, cache-first-with-refresh for static assets.
- **`frontend/src/registerServiceWorker.js`** — registers `sw.js` only in production builds (`import.meta.env.DEV` guard), and dispatches a real `impactone:update-available` event the instant a new worker installs while an old one still controls the page.
- **`frontend/src/components/UpdateBanner.jsx`** — listens for that event and shows a real "Reload to update" banner.
- **`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`** in `index.html` — already enables `env(safe-area-inset-*)` CSS, which `styles.css` and `workspace3d.css` already reference (confirmed via grep — this predates this phase, from the `MOBILE-FIXES-001` line of work).
- Backend deployment (`DEPLOYMENT_CHECKLIST.md`, `ENVIRONMENT_SETUP.md`) already documents a real bare-Node.js production deployment shape, required env vars, and `/health/live` / `/health/ready` probes.

None of the above needed to change. The real gap was narrower: the frontend's own public API origin.

## The Real Gap Found and Fixed

Four separate files (`apiClient.js`, `analytics.js`, `DashboardFooter.jsx`, `AIInsightsSidebar.jsx`) each independently duplicated:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
```

This is harmless on the machine that built the app — but "localhost" resolves to *the phone itself* on a real device, not to a dev machine. A production build shipped without `VITE_API_BASE_URL` set would install correctly, launch correctly, and then silently fail every real API call once opened on the founder's phone — the exact class of failure this phase's objectives call out ("no hardcoded local-machine URLs," "add environment validation for the public frontend/API origins").

**Fix:**
1. Extracted the duplicated logic into a single source of truth: `frontend/src/config/apiConfig.js` (`export const API_BASE_URL = ...`). All four call sites now import from it instead of repeating the literal.
2. Added `validateOrigins({ apiBaseUrl, isProd })` to the existing `frontend/src/startupValidation.js` (the app's established, already-wired startup-validation layer — see `screenRegistry.js`'s `runStartupValidation` call, which never blocks rendering but always logs and surfaces issues). In production builds only, it flags: a missing API origin, an unparseable one, or one that still resolves to `localhost`/`127.0.0.1`/`[::1]`. In dev, it's a deliberate no-op — a developer's own localhost API is expected and correct there.
3. Wired `origins: { apiBaseUrl: API_BASE_URL, isProd: import.meta.env.PROD }` into the existing `runStartupValidation` call in `screenRegistry.js`.

This does not change behavior for a correctly configured deployment — it only makes a misconfigured one *visible* (via the app's existing startup-issue logging/health-dashboard surface) instead of silently broken.

## Update Safety (No Stale-Version Trap)

Confirmed the existing mechanism is already sound and needed no change:

- `sw.js` bumps `CACHE_VERSION` to invalidate old caches on `activate`, and calls `self.skipWaiting()` unconditionally on `install` + `self.clients.claim()` on `activate` — a new worker takes control as soon as it's ready, it does not wait indefinitely behind an old one.
- The already-open page keeps running its already-loaded (old) JS until reloaded — `UpdateBanner.jsx` surfaces this as a real, visible "Reload to update" prompt rather than leaving the user on stale code with no signal.
- With only up to five real users on this deployment, a manual reload prompt is the correct, honest trade-off — a fully automatic hot-swap risks reloading someone mid-input on a form.

## Suitability for ≤5 Initial Users

No infrastructure change was added or is needed for this user count: the existing single-process Node backend + static-hosted frontend + service worker already documented in `DEPLOYMENT_CHECKLIST.md` handles this scale. This phase deliberately did not introduce a CDN, a build pipeline, or containerization — that would be solving a problem this deployment doesn't have yet.

## What This Phase Did Not Touch

- No AI/backend business logic.
- No UI redesign — every screen's visual output is unchanged.
- No new product feature.
- No change to the service worker's caching strategy itself (it was already correct).

See `PHONE_INSTALLATION.md` for the full verification checklist, `FOUNDER_INSTALL_GUIDE.md` for the exact install steps to hand to the founder, and `REAL_DEVICE_VERIFICATION.md` for the honest disclosure of what could and could not be verified in this environment.
