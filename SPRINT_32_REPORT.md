# Sprint 32 — A Personal Investment Companion — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 5 · **Date:** 2026-07-16

## Mission

From this sprint onward, every improvement must make ImpactOne feel like a personal investment companion. Full implementation authority was granted this sprint — no approval gates beyond public API contract changes — so every architecture, migration, UI, and testing decision below was made autonomously.

## Priority 1 — Investor Memory

"The system should gradually understand the investor. Learn: favorite sectors, favorite themes, reading depth, holding behavior, reaction patterns, learning progress. Everything append-only." New `investorMemoryService.getInvestorMemory` is a synthesis layer, not a new data store: every dimension reuses an append-only source this engagement already built rather than inventing a competing one.

- **Favorite sectors/themes**: `userMemoryRepository`'s existing `UserMemoryEvent` stream (Sprint 30), extended with a new `getThemeInterestSummary` mirroring the existing sector pattern exactly.
- **Reading depth**: the real ratio of viewed recommendations that went on to receive feedback — a genuine "skimmer vs. deep reader" signal, not a fabricated engagement score.
- **Holding behavior**: pairs real BUY/SELL trades (FIFO by execution time) to compute an honest average holding period from actual closed round-trips.
- **Reaction patterns**: reuses `learningLoopService.aggregateFeedbackSignals` directly (Sprint 31) rather than re-aggregating feedback a second way.
- **Learning progress**: reuses `personalProgressService.computeUnderstandingProgress` directly (Sprint 31).

The service is confirmed read-only by a test asserting its only exports are the three read functions. New `GET /v2/investor-memory` route.

## Priority 2 — Adaptive Home

"Facts remain identical. Ordering, density, presentation, and emphasis become personal." New `homeSummaryService.computeAdaptiveCardOrder` scores each of Home's six existing cards using real data already assembled for that response plus real reading-depth data from Priority 1: a real action-needed recommendation ranks Recommendations higher, real belief changes rank that card higher, a real "deep reader" investor sees Intelligence Timeline ranked higher than a "skimmer" would. No card's content ever changes — only render order.

`HomeScreen.jsx` was refactored to render whatever order the backend returns, falling back to the original fixed order if it's ever absent. **Browser-verified live**: a real dev-DB response ordered Portfolio and Beliefs above Today For You/Recommendations/Timeline, and the rendered page matched that order exactly.

## Priority 3 — Decision Review

"For every recommendation create a complete review page. Timeline. Evidence. Thesis evolution. Outcome. Lesson. Calibration. Everything traceable." New `decisionReviewService.getDecisionReview` aggregates data this engagement already computes and persists — Timeline (real recommendation history for the symbol), Evidence/thesis (the recommendation's own fields), Outcome (Sprint 29, honestly null if not graded), Lesson (Sprint 31, honestly null if none exists), Calibration (this recommendation's action family's real calibration report, Sprint 31), and Feedback history.

New `GET /v2/recommendations/:id/review` route. `RecommendationCard` gets a "Show full decision review" toggle, lazily fetched only on demand. Browser-verified live: all four sections render correctly on a real recommendation, zero console errors.

## Priority 4 — Educational Layer

"Whenever uncertainty is high, teach. Whenever confidence is low, explain. Whenever a thesis changes, educate." New `buildEducationalNotes` on `RecommendationCard`, using thresholds consistent with the card's own existing quality bands (uncertainty ≥ 60, confidence < 50) rather than inventing new ones. Each note doesn't just label the condition — it explains what it means and what to actually do about it (e.g., high uncertainty: "treat the suggested position size and timing as provisional"). The thesis-change note only fires for the most recent real change in the timeline, since an old shift from months ago isn't news right now. Every note only appears when its real underlying condition is actually true.

Browser-verified live: a real recommendation with a genuine thesis change showed the correct educational note, zero console errors.

## Priority 5 — Full Product Audit

A full-screen browser sweep across all 12 sidebar screens found zero broken flows and zero console errors — this engagement's Sprints 27–31 had already done substantial density/audit work, so the sweep itself surfaced nothing new to fix. Auditing this *same sprint's* newest addition instead did: **Decision Review's own timeline list duplicated the "What changed" section already rendered directly above it on the same card**, both reading from the identical real data. Removed the duplicate render — Decision Review now only adds what "What changed" doesn't already cover (Outcome/Lesson/Calibration), verified live to show exactly one timeline-style section per card instead of two.

## Verification

- **Backend:** 333/333 tests passing (full suite), up from 319 at the start of this sprint.
- **Frontend:** 133/133 tests passing (full suite), up from 125 at the start of this sprint.
- **5 commits**, each preceded by its own test run, none pushed.
- Every new surface this sprint verified live against the running dev servers, not just unit-tested — and the Priority 5 audit finding was caught specifically *because* of that live verification discipline, not by static review.

## What still remains (named, not hidden)

- **Adaptive Home's scoring weights are a first, reasonable pass**, not tuned against real usage data — there is no A/B or outcome measurement yet confirming these specific weightings actually improve the morning experience versus the old fixed order. Worth revisiting once real usage patterns accumulate.
- **Investor Memory's "holding behavior" only pairs simple FIFO BUY→SELL round-trips.** A more sophisticated position-averaging approach (partial fills, multiple entries before one exit) would be more accurate for active traders, but the simple pairing was chosen to stay honest about what the data can currently support without overcomplicating a first version.
- **Decision Review's calibration section shows the recommendation's action-family calibration, not a per-symbol one.** This matches Sprint 31's existing "family" grouping exactly (by design, for statistical significance), but a user reviewing one specific NVDA recommendation might reasonably want to know how NVDA-specific calls have calibrated, not just BUY calls generally. That finer-grained view needs more volume to stay statistically meaningful and is a natural next step.

## Recommendation

This sprint pushed the platform from "the system learns" (Sprint 31) to "the system learns *about you specifically*, and shows its work everywhere" — every new number this sprint is traceable back to a real, already-persisted fact, and the one redundancy introduced along the way was caught and fixed within the same sprint rather than shipped and forgotten. The next sprint building on this should focus on validating Adaptive Home's weighting choices against real usage once enough investor interaction data exists to judge them honestly.
