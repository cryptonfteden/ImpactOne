# RC1 Blocker Report — RC1-BLOCKERS-001

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-08-02

## Mission

Close every objective Release Candidate blocker remaining after `RELEASE-CANDIDATE-001`, `PIXEL-PERFECT-001`, and `FOUNDER-WEEK-AUDIT-001` — no new features, no redesign, no architecture changes beyond correcting a verified defect.

## Status By Priority

### 1. Repeated/templated AI explanation defect — Fixed

Root-caused (not guessed) to category-coarse templating in `impactIntelligenceService.js`'s `classifyForAssets`/`adjustAffected` and `autonomousMarketService.js`'s `classifyEventType`/`buildCounterarguments`/`buildInvalidation` — see `AI_TRUST_FINAL_REPORT.md` for the full trace and fix. Fixed with real, per-event differentiation (literal-ticker extraction, event-anchored template interpolation, word-boundary matching), never artificial variation. 8 new regression tests added, both proving genuinely different events now differ and genuinely identical events still deterministically match.

### 2. Watchlist destination duplication — Resolved

Every watchlist destination identified; the real bug (a stale Profile "More" link still pointing at the legacy, Sidebar-deprecated `Watchlist` screen) found and fixed to point at the same canonical `Watchlist Folders` destination Sidebar already uses. See `NAVIGATION_CONSOLIDATION.md`.

### 3. Flagship vs. 3D Workspace duplication — Resolved

Determined Workspace3DFeature is a real, distinct 3D portal to Advanced-tier screens (not a byte-duplicate of Flagship), but the two read as co-equal, unexplained Primary-tier competitors to a real user. `3D Workspace` demoted from Primary to Advanced — Flagship is now the sole Primary 3D entry point, with all real functionality on both sides preserved and reachable. See `NAVIGATION_CONSOLIDATION.md`.

### 4. Repository dependency state — Repaired

`react-router-dom` removed (re-verified zero real consumers repo-wide) after confirming `bcryptjs`/`jsonwebtoken`/`stripe` are genuinely required by already-committed code and must be preserved. A fresh `npm install --package-lock-only` + `npm prune` confirms `node_modules` now exactly matches committed dependency declarations, with zero extraneous packages. See `DEPENDENCY_INTEGRITY_REPORT.md` for full attribution of the pre-existing, non-this-phase changes being carried in this commit.

### 5. Two persistent backend test failures — Fixed

Root-caused to two tests in `intelligenceBusService.test.js` reading with the real system clock instead of a fixed `now`, so real time advancing past their hardcoded 2026-07-2x fixture dates eventually pushed their events into `EXPIRED`. Fixed with explicit fixed-clock `now` overrides, matching the pattern the file's own other, already-passing expiry tests use — no assertion weakened, no production code changed (the expiry logic itself was already correct; only the tests' clock-dependence was the bug).

### 6. Safe, verified RC findings — Resolved (the safe subset)

- **Startup-validation shape mismatch**: resolved additively — both `backend/config/startupValidation.js` and `frontend/src/startupValidation.js` now also expose the other side's field name (`ok`/`valid`) as a plain alias, giving both a shared, working field name without renaming or removing anything either side's real consumers already depend on.
- **Obsolete/undocumented env var**: `VITE_DEV_CONSOLE` (real, already-used internal-only nav gate) was undocumented — added to `ENVIRONMENT_SETUP.md`.
- **Objectively dead code**: none newly found this phase beyond `RELEASE-CANDIDATE-001`'s already-fixed set; re-confirmed no new dead files introduced by this phase's own changes.
- **Inconsistent error/loading/empty handling**: re-confirmed real (per `RELEASE-CANDIDATE-001`'s `TECHNICAL_DEBT_REPORT.md` §12) but **not retrofitted this phase** — each screen's adoption is a real, individually-verifiable behavior change (as `HomeScreen.jsx`'s own cache fix required its own dedicated test-isolation work in an earlier phase), and this phase's own priority order placed items 1-5 first; the remaining safe scope budget went to the shape/env-var fixes above rather than a partial, rushed retrofit across several screens.

## Explicit Compliance With This Phase's Rules

- No product features added.
- No screen redesigned — every code change either fixes a traced defect's root cause, moves a nav-list entry between tiers, or repairs dependency/test/doc state.
- The one architecture-adjacent change (demoting 3D Workspace's nav tier) was made only because it directly resolves a verified, live-reviewed defect (two co-equal, unexplained navigation destinations) — not a redesign of either screen itself.

## Verification

- Full backend regression, full frontend regression, production frontend build, fresh dependency installation verification, repository status review: see `RC1_TECHNICAL_SIGNOFF.md` for the consolidated, evidence-backed sign-off.
- No hidden mock/fallback values were introduced by this phase's fixes — every new differentiator (literal-ticker extraction, event interpolation) derives from real, already-known input data.
- No localhost production dependency was introduced or reintroduced — `PHONE-INSTALLATION-001`'s `validateOrigins()` protection is unchanged and unaffected by this phase.
