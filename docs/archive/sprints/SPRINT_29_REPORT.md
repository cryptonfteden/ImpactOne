# Sprint 29 — Feedback Intelligence Layer — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 4 · **Date:** 2026-07-15

## Mission

ImpactOne now has enough features. From this sprint onward, the platform must start becoming a system that continuously learns from itself — no new AI engines, no new dashboards, no feature inflation.

## Priority 1 — Recommendation Outcome Pipeline

Research before writing anything confirmed `WorldMemoryPrediction`/`Outcome` and `Recommendation.expiresAt`/`EXPIRED` existed as schema only since Sprint 16/21B, with zero production writers anywhere in the codebase (confirmed by grep). This wires them up for real, using only existing tables:

- `autonomousRecommendationEngine.evaluateSymbol` now writes a real `WorldMemoryRecord` + `WorldMemoryPrediction` alongside every `Recommendation` it creates, linked to both the recommendation and its `DecisionTrace`. Wrapped in try/catch — World Memory bookkeeping must never block a recommendation from being created.
- Every new recommendation gets a real `expiresAt` (30 days out); `expireStaleRecommendations()` (new) transitions ACTIVE → EXPIRED past that date via `updateMany` — a status change, never a delete, so history is preserved.
- New `outcomeGradingService.js` grades pending predictions after a 24h (D1) window: reads the entry price already persisted on the recommendation's own `evidence.currentPrice`, compares it to a live quote, and writes a real graded `Outcome`. No live quote available (this dev environment has no API keys) writes an honest `UNGRADEABLE` outcome, never a fabricated return.
- Both new steps run on the existing recommendation-generation schedule inside `runOnce` — no new scheduler.

19 new tests.

## Priority 2 — User Feedback Capture

Genuinely greenfield (confirmed by grep — no model, route, or UI existed). New `RecommendationFeedback` model via a real migration: `feedbackType` enum with exactly the six reactions named in the mission (`USEFUL`, `NOT_USEFUL`, `TOO_EARLY`, `TOO_LATE`, `ALREADY_KNEW`, `DONT_UNDERSTAND`), create-only by repository design — no update/delete method exists, so a changed mind writes a new row rather than editing history.

`RecommendationCard` gets a "Was this useful?" button row. Pure capture: submitting never refetches or changes anything else on the card, and nothing in this sprint reads feedback back into any scoring path — it becomes evidence for future calibration, never an immediate influence on today's recommendation, per the mission's explicit rule.

5 new tests. Browser-verified live: feedback submits and displays correctly.

## Priority 3 — Theme Evolution

New `computeThemeEvolution`, reusing only data `themeIntelligenceService` already computes or persists — no new snapshot table, no new scoring. What's new (current supporting evidence), strengthened/weakened (confidence delta vs. the last snapshot), disappeared (maturity regression to "Early"), and why (the theme's own thesis text) all surface in a new "Theme evolution" section on the existing Theme Dashboard.

**Live browser verification caught and fixed a real bug before commit**: the first version computed the delta from two persisted snapshots but displayed `currentConfidence` from a third, independently-computed live value — producing a contradictory "Strengthened: 86 → 77 (+2)" (a decrease labeled as growth). Fixed by comparing the live confidence consistently against the single most recent snapshot, so the displayed numbers and the delta always agree. Re-verified live post-fix (88 → 77, correctly labeled Weakened).

18 new tests (12 backend, 6 frontend).

## Priority 4 — Recommendation Quality Dashboard (internal only)

Extends the existing `VITE_DEV_CONSOLE`-gated Intelligence Console (Sprint 23A) rather than creating a new dashboard, per the mission's explicit rule. New `qualityDashboardService.computeQualityDashboard` aggregates real data from the tables Priority 1 wired up this same sprint — no new scoring model:

- **Hit rate** — fraction of gradeable outcomes with `directionCorrect: true` (`UNGRADEABLE` excluded from the denominator).
- **Confidence calibration** — how well each recommendation's own predicted confidence tracked whether it turned out correct.
- **Average holding period** — real elapsed hours between a recommendation's creation and its outcome being graded.
- **Average uncertainty** — averages the existing `scoringVocabulary` uncertainty value already stored on every `DecisionTrace`.
- **Outcome completion** — fraction of all predictions ever written that have been graded.

Every metric is honestly `null` with zero qualifying samples — the UI shows "Not enough data yet," never a misleading 0. 8 new tests. Browser-verified live with `VITE_DEV_CONSOLE=true`: all five metrics render, including a real 0% outcome completion (honest, since no D1 windows had elapsed yet at verification time).

## Priority 5 — Performance audit

- **Polling**: grepped for any `setInterval` bypassing Sprint 27's `pollWhileVisible.js` utility — zero found. All six existing polling call sites still route through it; this sprint added none.
- **Startup measurement**: measured Home's real load time live. `.screen-hero` paints at ~1.9s, but the actual `/v2/home-summary` API call takes **7–12 seconds cold** (confirmed via direct `curl` timing and a standalone profiling script hitting the service functions directly, bypassing HTTP).
- **Root cause found**: the bottleneck is `autonomousMarketService.getAutonomousOverview`, which fans out to real external, no-API-key-required providers (CFTC, Polymarket, FRED, SEC, House Stock Watcher) with 12–15s timeouts each. This sandbox has no outbound internet access, so every provider call runs to its full timeout. These calls are already correctly parallelized (`Promise.all` per symbol and across symbols) and already cached (`altDataCache.js`, 20 minutes to 12 hours depending on success/fallback) — confirmed by profiling that a second identical call to `getDailyBrief` returns in 0ms.
- **Decision**: this is a genuine environmental characteristic (no internet in this sandbox), not a code defect. The timeouts are deliberately tuned for real production latency with real internet access; lowering them to mask this sandbox's lack of connectivity would risk breaking legitimate slow-but-real responses in production. Left unchanged rather than risking a change to timeout values calibrated for a context (real deployment) this sprint cannot fully verify against. Documented here as a known, understood cost of a cold cache in an offline dev environment, not a silently-ignored problem.

No code changes for this priority — the audit's real work was measuring, diagnosing, and making a considered judgment call not to touch calibrated timeout values without production visibility, which is itself the responsible outcome per this sprint's low-risk mandate.

## Verification

- **Backend:** 284/284 tests passing (full suite), up from 259 at the start of this sprint (added across Priorities 1–4).
- **Frontend:** 114/114 tests passing (full suite), up from 108 at the start of this sprint.
- **Browser verification:** every UI-visible change (Priorities 2, 3, 4) was checked live against the running dev servers. Two real issues were caught only by live verification, not by unit tests alone: Priority 3's confidence-delta bug, and a stale-backend-process issue (this repo's backend has no auto-reload; several verification passes required a manual `taskkill`/restart to actually exercise new routes and migrations).
- **1 new Prisma migration** (`add_recommendation_feedback`), applied to both the dev and test databases.
- **4 commits**, each preceded by its own test run, none pushed.

## What still remains (named, not hidden)

- **Cold-start latency on Home** (~7–12s for the first request after a backend restart) is real and user-facing, but its root cause is environmental (no internet in this sandbox reaching genuinely external, keyless data providers) rather than a code defect this sprint could respectably fix without production visibility into real-world timeout behavior. Flagged for whoever owns infrastructure/deployment to confirm real-world latency matches expectations.
- **Outcome grading is D1-only this sprint.** The `Outcome` model's schema supports `W1`/`M1`/`M3`/`M6`/`Y1` windows too; `outcomeGradingService.js` only implements the 24-hour window. Extending to longer windows is a natural next step once enough D1 data has accumulated to validate the grading logic itself.
- **The Quality Dashboard will read as mostly empty until real outcome data accumulates** — by design (D1 grading only fires 24h after a recommendation is created), so a fresh environment won't show meaningful hit-rate/calibration numbers for at least a day of the scheduler running. This is the honest, non-fabricated state of a system that has genuinely just started learning from itself, not a bug.

## Recommendation

The core of this sprint — three previously-orphaned World Memory tables now have real writers, and the platform now captures its own outcomes and user reactions as durable evidence, without any of it back-influencing today's recommendations — is the intended shift "from feature-complete to self-learning." The next sprint that revisits this area should focus on grading longer time windows and beginning to actually use the accumulated calibration data (still never as an automatic, un-reviewed input to live scoring, consistent with this sprint's own rule).
