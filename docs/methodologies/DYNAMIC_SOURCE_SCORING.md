# Dynamic Source Scoring (Phase X11 — Part 2)

## What it is

Replaces the static provider trust model (`autonomousMarketService.sourceQualityScore`'s fixed 95/60 lookup table) with a real, evolving, outcome-informed score wherever a source has enough real evidence — with a disclosed, honest fallback to the exact static score otherwise. Builds directly on X10's `newsSourceScoringService.js` rather than duplicating it.

## Files

- `backend/services/dynamicSourceScoringService.js` — `computeAndSnapshotSourceScore()`, `getDynamicCredibility()`, `getSourceCredibilityOverrides()`, `getSnapshotHistory()`.
- `backend/controllers/dynamicSourceScoringController.js`, `backend/routes/dynamicSourceScoringRoutes.js` — mounted at `GET /api/v2/dynamic-source-scoring/:sourceName` and `/:sourceName/history`.
- New Prisma model: `SourceScoreSnapshot` (append-only audit history).

## The six real components

| Component | Source |
|---|---|
| Prediction accuracy | X10's `newsSourceScoringService` — real `directionCorrect` hit rate, joined through `CanonicalEvent → WorldMemoryRecord → WorldMemoryPrediction → Outcome` |
| Timeliness | X10 — real `ingestedAt − publishedAt` gap |
| False positives | X10 — `1 − accuracy` on graded, judged predictions |
| False negatives | **New this phase** — the real fraction of a source's `CanonicalEvent` rows that never got matched into any `WorldMemoryPrediction` at all (evidence that never had the chance to be judged right or wrong — a distinct, honestly-scoped proxy from false positives) |
| User engagement | X10 — real `AnalyticsEvent` count referencing the source |
| Outcome quality | X10 — average absolute real market-impact return on graded outcomes |

## Complete audit history

Every call to `computeAndSnapshotSourceScore()` writes an immutable row to `SourceScoreSnapshot` — trust score, every component, sample size, and the active methodology version at computation time. A source's trust trajectory is therefore always a real, queryable history, not a value recomputed after the fact.

## Safety fallback

`getDynamicCredibility()` only returns a dynamic score once the source has at least `learningSafety.MIN_SAMPLE_SIZE` (15) graded predictions; below that, it returns the exact static `sourceQualityScore` value with `isDynamic: false` and a disclosed reason.

## Wiring into the live engine

`autonomousRecommendationEngine.js`'s `evaluateSymbol()` fetches real-time overrides for every source in a symbol's matched events via `getSourceCredibilityOverrides()` (best-effort — a failure falls back to the exact pre-X11 static lookup). `computeQualityScore()`'s `sourceQuality` component now prefers the dynamic override per event, falling back per-event to the static score when no override exists for that source.

## Tests

`backend/services/dynamicSourceScoringService.test.js` — 5 tests: honest static fallback below threshold, real snapshot persistence, real false-negative computation, real dynamic scoring once meaningful, and multi-source override map building.
