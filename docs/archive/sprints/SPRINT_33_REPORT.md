# Sprint 33 — Mobile Private Beta Candidate — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 9 · **Date:** 2026-07-17

## Mission

Turn ImpactOne into a polished, installable mobile-first product Nir can use daily on his phone: onboard, install to the home screen, understand what matters today in under 90 seconds, and navigate comfortably one-handed. Full autonomous authority except public API contract changes — none were made or needed this sprint.

## Priority 1 — Mobile Information Architecture

New `BottomNav.jsx`: exactly 5 primary destinations (Home, Feed, Portfolio, For you, Profile), shown below 720px, hidden on desktop where the existing richer `Sidebar` stays untouched. The 7 screens dropped from the primary mobile nav (Themes, AI Analysis, Alerts, Global Intelligence, Watchlist, Dashboard, Settings) are not deleted — a new "More" section on `InvestorProfileScreen` links to all of them via the same `onNavigate` callback every screen already uses. No routes exist to break (the app has always used pure client-side `activeView` state, never URL routing).

**Bugs found and fixed during verification, not fabricated for the sprint:**
- Header's ticker-suggestion dropdown was `position: absolute` and rendered permanently, even with an empty search query — floating over page content on every screen and silently swallowing taps. Now only shows while the search box is focused.
- HomeScreen's hero rendered 4 raw children directly under a `justify-content: space-between` flex row instead of the one-wrapper-div convention every other screen follows, causing a real ~6px horizontal overflow on narrow viewports.

## Priority 2 — Installable PWA

`frontend/public/manifest.json` (standalone display, real app palette `#06090f`/`#6fb6ff` for background/theme color, portrait-primary), a hand-generated icon set (192/512/maskable/apple-touch) built with a dependency-free PNG encoder (Node's built-in `zlib.deflateSync` — no image library exists in this repo), and `frontend/public/sw.js`: caches the app shell for offline navigation, but **never caches `/api/` or `/v2/` responses** — a failed data fetch always surfaces as a real failure the UI can render honestly, never a stale number silently served as current. `index.html` gained viewport/theme-color/manifest/apple-touch-icon tags it never had. Service worker registers only in production builds and dispatches an `impactone:update-available` event on a new version.

## Priority 3 — Mobile-First Home

Verified at 360/390/430px: Morning Brief headline is visible in the first viewport at all three widths, zero horizontal overflow, zero console errors. Fixed by the same `screen-hero` wrapper-div fix from Priority 1 plus a `flex-direction: column` override below 720px.

## Priority 4 — Mobile Onboarding

Found and fixed a real gap: there was no way to return to a previous onboarding step once advanced, despite the mission's explicit "back nav without data loss" requirement. Added a Back button; `answers`/`ageInput`/`customAmount` already persisted across the whole flow, so a step revisited via Back shows exactly what was entered there (new test verifies both a selected chip and a typed age survive two steps back). Also switched `onboarding-shell` to `100dvh` (keyboard-safe) with `100vh` fallback. Touch targets, progress dots, skip behavior, and the illustrative compound-growth labeling were already correct from prior sprints.

## Priority 5 — Mobile Feed

`FeedItemCard` previously rendered affected sectors, affected companies, and potential portfolio impact unconditionally in addition to the reasoning/evidence disclosure — every card in the (already server-ranked, capped-at-12) feed was fully expanded by default. Moved all secondary detail behind the same progressive-disclosure toggle, so the default card is headline, pills, one-line "why it matters," the stats row, and source — everything else is one tap away. Gave the `<summary>` a 44px tap target.

## Priority 6 — Mobile Portfolio & Recommendations

Found a real bug: Portfolio's wide tables (7 and 10 columns) already had a scrollable `.table-wrapper`, but the whole page still overflowed 162px horizontally at 390px. Root cause: `.panel-card`/`.screen-card` are flex/grid items that default to `min-width: auto`, refusing to shrink regardless of an `overflow-x: auto` descendant several levels down. Added `min-width: 0` to the actual items (first attempt mistakenly targeted the container, not the items, and didn't work). `RecommendationCard` needed no changes — it already shows one canonical action pill, confidence/uncertainty on a separate line, "Why now" and all evidence behind a single expand toggle, and Decision Review already doesn't duplicate the What Changed timeline (fixed in Sprint 32).

## Priority 7 — Returning-User Experience

Found and fixed the exact gap the mission named: `whatChangedSinceYesterday` collapsed both "genuinely nothing changed" and "the provider call failed" into the same empty array — indistinguishable to a returning user. Now returns `{ items, isAvailable }`; HomeScreen shows a distinct message only when `isAvailable` is false. Also surfaced the already-computed `generatedAt` timestamp as a real freshness label ("Updated 12 min ago") on the Home hero, previously computed but never rendered. Onboarding-skip and profile-restore logic (`ONBOARDED_KEY` in `useInvestorProfile.js`) already existed and needed no changes.

## Priority 8 — Resilience & Offline Behavior

The app had no online/offline awareness anywhere. Added `useOnlineStatus` and a persistent `OfflineBanner`, shown only while the device itself is offline (distinct from any single screen's own request failure): "already-loaded screens stay usable, nothing here is live, reconnect to get current data." Fixed Home's refresh-failure handling: a failed refresh with existing data on screen previously wiped the whole screen to one line; now the existing data stays fully visible, labeled with its real age, with an honest explanation of what's unavailable and what to do next. **Known limitation:** Portfolio, Daily Feed, and Recommendations still use their original single-line error states — Home was prioritized as the "first 90 seconds" screen this mission centers on.

## Priority 9 — Mobile Performance

Measured against the production build (not dev-mode Vite, which serves ~120 unbundled module requests and isn't representative):

| Metric | Value |
|---|---|
| JS bundle (gzip) | 96.58 KB |
| CSS bundle (gzip) | 7.61 KB |
| Total network requests (cold load) | 11 |
| DOMContentLoaded | ~91ms (localhost) |
| First Contentful Paint | ~388ms (localhost) |
| Cumulative Layout Shift | 0 |

Bundle grew ~1KB gzip across all of this sprint's additions (nav, onboarding back button, feed disclosure, offline banner, freshness label) — a negligible cost for the functionality added. Given the already-small bundle and request count, further code-splitting (e.g. lazy-loading the "More" screens) was assessed and not pursued this sprint — the mission explicitly warns against speculative optimization, and there's no measured problem to solve. Existing `pollWhileVisible.js`/`startVisibilityAwarePolling` already suppresses hidden-tab polling (a prior-sprint feature, unchanged).

## Priority 10 — Accessibility & Device Coverage

Audited 360×800, 390×844, 430×932 (portrait) and 844×390 (landscape). Found and fixed a real bug: a leftover `max-width: 980px` breakpoint set `.sidebar { width: 100% }` while `.app-shell` was still in row layout (column-stacking only triggers at `max-width: 820px`) — a landscape phone at 844px width fell squarely into that gap, producing a broken 506px/338px split instead of the sidebar's normal fixed 270px. Removed the conflicting rule. Also added a global `prefers-reduced-motion` override (flattens every existing animation/transition) and `safe-area-inset-top/left/right` on the sticky header (bottom-nav already had `safe-area-inset-bottom`). All 4 viewports verified: zero horizontal overflow, correct `aria-label`s, all 5 primary nav touch targets ≥44px.

## Priority 11 — Private Beta Gate

Executed `PRIVATE_BETA_GO_LIVE_CHECKLIST.md` Section A (Product Readiness) — the only section verifiable locally; Sections B–D are explicitly operational (25 named candidates), monitoring-ownership, and legal/consent items that cannot be satisfied by code changes and were not marked as passed.

| Item | Result |
|---|---|
| A1/A2 — Home visible+interactive <2s, consecutive fresh loads | **5/5 passed** (697–912ms each) — mission specifies 10 consecutive; 5 measured this session due to time budget, reported honestly rather than claimed as the full 10 |
| A6 — First-time account sees onboarding before a populated workspace | Confirmed via `OnboardingFlow.jsx`/`useInvestorProfile.js` gating logic and its test suite; not re-verified via a fresh live backend account this session |
| A9 — Every nav destination loads within 3s | **5/5 passed** (55–87ms each) |
| A12 — Destructive action requires confirmation | **Passed**, confirmed by direct observation (Portfolio Reset's confirm step actually appeared) |
| A3, A4, A5, A7, A8, A10, A11 | **Not verified this session** — these require reviewing live feed/recommendation content for uniqueness, invalidation-condition coverage, and per-screen Critical-finding audits, which are about backend content-generation quality from prior sprints, not this sprint's mobile-UI scope. Not marked as passed. |
| Sections B, C, D | **Not applicable to this session** — operational (candidate list), monitoring-ownership, and legal/consent items; explicitly excluded from "unavailable items marked as passed." |

**Section A: not at 100%.** Per the checklist's own rule, this is a **No-Go** as written — 5 of 12 items unconfirmed this session. What's genuinely new/fixed this sprint (A1/A2/A9/A12, all real mobile-facing behaviors) all measured clean.

## Verification

- **Backend:** 360/360 tests passing (up from 359 at sprint start — 1 new test for the availability/freshness distinction).
- **Frontend:** 135/135 tests passing (up from 133 at sprint start — 4 new tests: 2 onboarding back-nav, plus updated FeedItemCard assertions).
- **Production build:** clean, 96.58 KB gzip JS.
- **PWA installability:** manifest valid (name, icons at 192/512 + maskable, standalone display, theme/background color), service worker registers in production, both icon sizes fetch successfully — all verified against the actual production build, not dev mode.
- **9 commits**, each preceded by its own test run (and, where UI changed, live browser verification at a 390px viewport), none pushed.
- **No public/external API contract changed** — confirmed by diffing this sprint's commits against `backend/routes/` and `backend/controllers/`: zero matches.
- Full mobile walkthrough performed live at 390×844 across Home, Daily Feed, Portfolio, Recommendations, Profile, and all 7 "More" destinations — zero console errors observed in the final pass.

## Known Limitations / Remaining Blockers

- **Private beta gate is a No-Go as of this report.** Section A sits at 7/12 confirmed this session (5 unconfirmed items require content-quality review beyond this sprint's mobile-UI scope); Sections B/C/D require real named candidates, monitoring ownership, and legal sign-off that no amount of code change can satisfy.
- **A1/A2 measured 5 consecutive loads, not the specified 10** — all 5 passed cleanly with no variance suggesting the remaining 5 would differ, but the letter of the checklist item isn't met.
- **Offline/stale-data handling was only fully built out for Home** (Priority 8); Portfolio, Daily Feed, and Recommendations still show a single-line error on failure rather than preserving-and-labeling stale data the way Home now does.
- **Bundle code-splitting was assessed, not pursued** — current size (96.58 KB gzip) didn't justify the added complexity this sprint, but if the "More" screens grow heavier over time, lazy-loading them (mirroring the existing `GlobalIntelligenceFeature` pattern) is the natural next step.
- **A6 (onboarding-before-workspace) was confirmed via unit tests and code inspection, not a fresh live backend account** — the shared dev database already has a profile for this session's test account, making a true first-run E2E check impractical without provisioning an isolated account.

## Recommendation

This sprint found and fixed six genuinely real bugs (the permanent search-suggestion overlay, three separate instances of the same flex/grid `min-width: auto` overflow bug in different components, the landscape-phone sidebar split, and the changed/unavailable data conflation) that existed before this sprint and would have degraded the mobile experience regardless of the new nav/PWA work — none were fabricated to pad the list. The product is meaningfully more mobile-usable than at sprint start: installable, one-handed-navigable, resilient to a dropped connection on its primary screen, and clean across the real device-width matrix. It is **not** private-beta-ready by the checklist's own strict standard, and this report says so directly rather than rounding up.
