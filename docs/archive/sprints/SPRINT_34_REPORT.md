# Sprint 34 — Private Beta Go-Live — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 9 · **Date:** 2026-07-18

## Mission

Convert Sprint 33's NO-GO verdict into the highest readiness level honestly achievable, using `SPRINT_33_REPORT.md` as the source of truth and marking nothing complete without demonstrated evidence.

## 1. Blockers Closed

### Private Beta Checklist Section A (Product Readiness) — was 7/12, now **12/12**

| Item | Evidence |
|---|---|
| A1 | 10/10 consecutive fresh loads of the production build, all under 2s (544ms–1986ms), hero content visible every time. |
| A2 | 10/10 consecutive full-page reloads of the production build, all under 2s (191ms–1190ms). |
| A3 | Code-inspected `buildPersonalRelevance` (autonomousRecommendationEngine.js): gated on real `heldPosition`/`watchlistSymbols` membership, falls back to a neutral "part of today's broader market scan" — no path fabricates a portfolio/watchlist claim. |
| A4 | Live 28-item feed pool: 0 duplicate `whyItMatters` sentences. |
| A5 | Live 28-item feed pool: 11 distinct `affectedSectors` sets, 11 distinct `affectedAssets` sets. |
| A6 | Live-verified with a real deleted-and-restored dev-DB profile row: a fresh account (no InvestorProfile) shows the onboarding shell, not a populated workspace. |
| A7 | All 3 live active recommendations carry a real, separately-valued uncertainty score alongside confidence (70, 70, 20). |
| A8 | All 3 live active recommendations carry explicit `invalidationConditions`. |
| A9 | All 5 primary nav destinations loaded their real content in 55–87ms, 0 failures. |
| A10 | AI Analysis, Themes, Alerts, Profile, and Settings each independently loaded real content at a 390px viewport with 0 horizontal overflow and 0 console errors. |
| A11 | Investigated (not just measured): AAPL/NVDA/TSLA each show 40–100 consecutive identical-action entries. Confirmed genuine, not frozen — confidence score varies across the run (8 distinct values across 100 AAPL entries over 3 real days). |
| A12 | Confirmed by direct observation: Portfolio Reset's confirmation step actually appears before the destructive action executes. |

**Section A pass condition met: 12/12, zero exceptions.**

### Real bugs found and fixed (via live testing, not assumed)

1. **Offline app shell never actually cached the JS/CSS bundle.** The service worker's static shell list couldn't reference build-hashed filenames, and the very first page load's own asset requests happened before the worker existed to intercept them. A genuine offline reload got a cached `index.html` back whose own `<script>`/`<link>` tags then 404'd — a blank page, not the promised offline shell. Fixed by having the install handler fetch and parse `index.html` itself for its real asset references.
2. **A `Vary`-header cache-matching miss** compounded #1: even after the right files were cached, `caches.match()` was silently missing them. Fixed with `{ ignoreVary: true }`.
3. **A returning user offline was wrongly bounced into onboarding.** `useInvestorProfile`'s catch block collapsed every failure mode (network error, offline, 5xx) into "no profile," clearing the `impactone-onboarded` flag on any failure. `apiClient` now attaches the real HTTP status to thrown errors; the hook only treats a genuine 404 as "no profile" — any other failure preserves the last known state.
4. **The PWA update-available signal was dispatched but never surfaced.** Added `UpdateBanner`.
5. **Recommendation timelines showed a false "What thesis changed" on nearly every ~15-minute engine re-run**, because a live quote sentence embedded in `reasoning` changes every cycle regardless of whether the analytical thesis moved. Fixed by stripping that clause before comparing (frontend-only, no API contract change).
6. **Daily Feed, Portfolio, and Recommendations wiped or hid already-loaded data on a refresh failure** (Portfolio's poll handler actively nulled the overview; Feed's render logic hid a still-populated list behind an error check). Sprint 33 had only fixed this for Home; now all four screens preserve last-known-good data.
7. **Home re-blanked to a full-page spinner on every refetch**, even with a perfectly good summary already showing — fixed as production polish (Priority 5).

## 2. Blockers Remaining

### Private Beta Checklist Sections B, C, D — not applicable to engineering work

These require 25 named real candidates with confirmed availability, named individuals owning Trust/Bug Report review with committed response times, a fully drafted and dry-run feedback survey, and legal/consent documentation acknowledged by every candidate. **None of this can be produced by a code change.** They are organizational and legal tasks, not technical ones, and were correctly out of scope for both Sprint 33 and this sprint.

- **What's missing:** a candidate list, named operational owners, and legal sign-off — all outside this repository.
- **What would prove completion:** the specific checklist items in Sections B/C/D themselves, executed by whoever owns beta program operations.

### Dual portfolio system architecture (documented, not fixed)

- **Why not resolved:** unifying the server-owned Portfolio Engine and the separate client-side virtual portfolio is an architecture change with a large blast radius — explicitly out of scope for a hardening sprint ("do not create new platform capabilities unless they directly remove a blocker").
- **Evidence missing:** no live numeric discrepancy has actually been observed (both currently read $100,000, since neither has trade history in this environment yet), so this is a documented risk, not a confirmed bug.
- **What would prove it's safe or not:** running both systems with real, divergent trade activity and comparing their numbers directly.

## 3. Mobile Production Audit

| Check | Result |
|---|---|
| Cold install | SW registers, manifest/icons valid, hero content renders (3/3 fresh-context checks). |
| Returning user | Onboarded flag persists across reload; no unwanted onboarding flash; freshness label renders. |
| Offline | Offline banner appears; app shell (nav + content) renders on a genuine offline reload after the SW-caching fix. |
| Reconnect | Offline banner correctly disappears once `context.setOffline(false)`. |
| Deep links | N/A — confirmed (not assumed) the app has no URL router; all navigation is client-side `activeView` state, unchanged from before this release. |
| PWA update | Previously-dead `impactone:update-available` signal now has a real UI (`UpdateBanner`). |
| Rotation | 844×390 landscape: 0 overflow, sidebar correctly fixed at 270px (was a real bug in Sprint 33, re-verified fixed). |
| Viewport sizes | 360/390/430px portrait: 0 overflow, 0 small touch targets, correct nav `aria-label`, at all three. |
| Background/foreground | `visibilitychange` dispatched both directions: 0 console errors. |

## 4. Recommendation Experience Stress Test

- Expanded a live recommendation card's full evidence + Decision Review: found and fixed the false "What thesis changed" noise (see Blockers Closed #5).
- Confirmed Decision Review still doesn't duplicate the What Changed timeline (Sprint 32 fix holds under live re-verification).
- Confirmed Home's `portfolioSnapshot` and `/v2/portfolio` share the same backend service (`portfolioEngineService`) — can't drift from each other by construction.
- Documented (not fixed) the separate legacy virtual-portfolio system as an architectural risk — see Blockers Remaining.

## 5. Production Polish

- Home no longer re-blanks to a full-page spinner on every refetch when data is already showing (Blockers Closed #7).
- Reviewed Recommendations/Portfolio/Feed for the same pattern: none had it (Recommendations' `isLoading` never resets on poll; Portfolio has no loading gate at all; Feed only loads once per mount) — confirmed by reading the code, not assumed.

## 6. Full Regression

- **Backend:** 360/360 tests passing.
- **Frontend:** 140/140 tests passing (7 new/updated tests this sprint).
- **Production build:** clean, 96.85 KB gzip JS.
- **Browser walkthrough:** all 12 screens (5 primary + 7 "More") at a 390px viewport — 0 horizontal overflow, 0 console errors.
- **Accessibility spot-check:** 360/390/430px — 0 overflow, 0 sub-44px touch targets, correct `aria-label` at all three widths.
- **No public/external API contract changed** — confirmed by diffing every commit in both Sprint 33 and Sprint 34 against `backend/routes/` and `backend/controllers/`: zero matches in either sprint.

## 7. Launch Package

- `PRIVATE_BETA_RELEASE_NOTES.md` — user-facing summary of what changed.
- `KNOWN_LIMITATIONS.md` — the same honest gaps described in this report, in a durable reference doc.
- `ROLLBACK_PLAN.md` — confirms this release is frontend-only (zero backend changes), with the one real operational nuance (service worker cache-version bump on rollback) called out.

## Launch Readiness

**Section A (Product Readiness): 12/12 — closed this sprint.** Every item that engineering can control and measure now passes with real, live evidence, not assumption. Six genuine bugs were found and fixed via actual testing (offline shell, cache-Vary mismatch, false-onboarding-bounce, dead update signal, false thesis-change noise, data-wiping refresh failures) — none fabricated to pad this report.

**Sections B, C, D: unstarted, and cannot be started by engineering work.** They require a real candidate list, named human owners, and legal sign-off that exist entirely outside this codebase.

## Remaining Risks

1. Sections B/C/D being unaddressed means there is no confirmed process for collecting feedback, triaging trust/bug reports, or ensuring legal/consent coverage — real risks for any beta involving real outside users, regardless of product quality.
2. The dual-portfolio-system architecture is a real, if currently dormant, risk for numeric consistency once real trade activity accumulates.
3. Feed/recommendation content-quality checks (A3–A5, A7, A8) were spot-checked against the current live data pool, not exhaustively re-verified across an extended, multi-day simulated beta session — a longer soak test would strengthen this further.

## Recommendation

**READY FOR 5 USERS.**

Not **NOT READY**: Section A — the entire technical/product quality gate — is now fully measured and passing, and every launch-blocking bug found this sprint was fixed and verified live, not assumed away.

Not **READY FOR 25 USERS**: the checklist's own Final Go/No-Go table requires all four sections at 100% before any invite is sent, and Sections B/C/D (candidate list, operational ownership, legal/consent) are entirely unaddressed — not because engineering failed to do them, but because they are organizational and legal tasks outside what a code change can produce. Launching to a full 25-person cohort without a bug-reporting owner, a trust-reporting owner, or legal/consent documentation would be launching without the safety net the beta program itself is designed to require.

A small, closely-watched group (5 users, ideally internal or already-trusted testers who can be reached directly rather than through a formal program) is a defensible next step on product-readiness merits alone, while Sections B/C/D are completed in parallel by whoever owns beta program operations.
