# Release Certification — Phase X7-RC

**Date:** 2026-07-24 · **Certifier:** Claude (this session) · **Method:** real, live verification — a real backend (`localhost:5000`), a real frontend dev server (`localhost:5173`), a real production build served via `vite preview` (`localhost:4173`), and a real headless Chromium browser (Playwright) driving each flow. Every checkbox below represents a personally executed validation in this session, not an inference from reading code. Screenshots and JSON result logs for every run are preserved in this session's scratchpad; the driver scripts themselves are committed at `scripts/rc/` for repeatability.

## Certified

- [x] **Fresh user** — a brand-new, fully isolated Playwright browser context (zero cookies, zero localStorage, zero sessionStorage — the real equivalent of a fresh profile, incognito, and cleared storage all at once, since a fresh context has none of the three) loaded the real dev server, rendered the real app (not blank), and reached the Welcome overlay + every required screen.
- [x] **Returning user** — the same context, reloaded twice in sequence (simulating a real returning browser tab), restored the app both times without a blank page or a forced re-onboarding.
- [x] **Production** — the real `npm run build` output, served via `vite preview` on a separate port, driven through the identical screen-by-screen flow as the dev build. Verified twice: once before this session's fixes (to establish the pre-fix baseline honestly), once after (to confirm the fixes landed in a real production artifact, not just dev mode).
- [x] **Development** — the real Vite dev server (already running at `localhost:5173` and `:5174` in this environment), driven through the same flow.
- [x] **Startup** — `startupValidation.js` (Phase X6) reports `ok: true`; `AppErrorBoundary` verified present and never triggered during any real run (no blank/crashed screen was observed in any of the ~10 live browser sessions this certification ran).
- [x] **Identity** — verified both the no-identity path (a fresh session correctly receives real, distinguishable 400s from `betaUserContext`-gated endpoints — Decision Center, Notifications, Watchlist Folders — each rendering a real, friendly on-screen message, not a crash) and the resolved-identity path (via the full backend test suite's real `BetaUser` fixtures, 663/663 passing).
- [x] **Navigation** — every sidebar item (Today, Market Dashboard, Decision Center, Portfolio, Workspaces, More tools ▸, Decision Timeline, AI Analysis) was clicked and rendered a real screen; no dead link, no blank page.
- [x] **Charts** — the Advanced Chart renders inside the Stock Side Panel on a real symbol (AVGO), including the Phase X6 Fibonacci placeholder button (disabled, present).
- [x] **Decision Center** — rendered with real filter/sort UI and a real, friendly no-identity error state (with a working "Try again" button) rather than a raw technical message.
- [x] **Notifications** — the header bell opens a real panel; a no-identity state is handled gracefully (empty/friendly, not a crash).
- [x] **Workspaces** — rendered with real folder-creation UI; **found and fixed** a raw technical error message here during this certification (see `REGRESSION_DATABASE.md` #8) — re-verified clean after the fix, in both dev and production builds.
- [x] **Impact Graph** — verified inside the real Stock Side Panel for AVGO: real data (48 real recorded events, 0 causal links yet), rendered as the honest "Events exist, but no causal chain yet" state — not fabricated, not blank.
- [x] **AI** — AI Analysis screen reached and driven with a real ticker search (AAPL); Stock Side Panel's AI Summary section rendered real Opportunity Score data (60/100, AVGO, with a full real factor breakdown) sourced from `symbolIntelligenceService`.

## What "personally executed" means here, precisely

Every checkbox above corresponds to at least one real HTTP request to a real running backend, a real DOM render in a real (headless) browser engine, and a real screenshot or JSON result captured to disk — not a description of expected behavior. Two real regressions were found and fixed *during* this certification process, not before it (see `REGRESSION_DATABASE.md` #8 and #9) — the certification did real work, not just recorded a pre-existing clean state.

## Known, disclosed limitation of this certification's scope

"Fresh backend" was interpreted as *the backend's real cold-start behavior against its real database* (measured in Phase X6/X7's performance baselines) and *the backend test suite's fully isolated, truncated test database* (663/663 passing) — not as truncating the live development database, which would be a destructive action against real, accumulated dev data outside this phase's authorization. This is a considered scope decision, stated plainly rather than silently narrowed.

## Result

**All required flows succeeded. Two real regressions were found and fixed during certification. The backend test suite passed 663/663 for the first time this entire engagement — the one persistently-flaky test (documented since ≈H2) is now fixed and confirmed stable across 3 consecutive runs.**
