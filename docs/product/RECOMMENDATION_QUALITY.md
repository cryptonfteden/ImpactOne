# Recommendation Quality Engine (Phase X10 — Part 3)

## What it is

Composes three already-real systems into the mission's required per-recommendation vocabulary — no new scoring model, no second recommendation path.

## Files

- `backend/services/recommendationQualityService.js` — `getRecommendationQuality(recommendationId)`, `getModelConfidenceScore()`.
- `backend/controllers/recommendationQualityController.js`, `backend/routes/recommendationQualityRoutes.js` — mounted at `GET /api/v2/recommendation-quality/:recommendationId` and `GET /api/v2/recommendation-quality/model-confidence`.

## Engagement status (real, priority-ordered)

1. `EXPIRED` — a real `RecommendationLifecycleEvent` with state `EXPIRED`
2. `BOUGHT` — a real lifecycle event with state `PAPER_TRADED`
3. `WATCHLISTED` — a real `symbol_watchlisted` AnalyticsEvent tagged with this `recommendationId`
4. `OPENED` — a real `recommendation_opened` AnalyticsEvent, or lifecycle state `VIEWED`
5. `IGNORED` — a real `recommendation_viewed` AnalyticsEvent with no stronger signal
6. `UNKNOWN` — no real signal at all

## Outcome status

`CORRECT` / `INCORRECT` / `UNKNOWN`, read directly from the real `Outcome.directionCorrect` (Sprint 16D onward's existing grading pipeline — `outcomeGradingService.js`). Never recomputed.

## Confidence score

`getModelConfidenceScore()` reuses `qualityDashboardService.computeQualityDashboard()`'s existing, real hit-rate/confidence-calibration computation (Sprint 29) rather than building a second one. Honestly reports a `reason` when zero outcomes have been graded yet.

## Tests

`backend/services/recommendationQualityService.test.js` — 7 tests covering the required-id/404 cases, honest-unknown state, IGNORED derivation, WATCHLISTED priority over VIEWED, real CORRECT/INCORRECT mapping, and honest zero-sample confidence reporting.
