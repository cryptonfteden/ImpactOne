# Learning Loop (Phase X11 — Part 1)

## What it is

Connects real, graded `Outcome` history to future recommendation scoring — but only when the evidence is statistically meaningful, and always in a bounded, disclosed, and audited way. This is the mission's "close the loop": the recommendation engine's live quality score now genuinely reflects what actually happened to past recommendations of the same action type.

## Files

- `backend/services/learningSafety.js` — shared safety primitives (Part 6): `MIN_SAMPLE_SIZE` (15), `wilsonConfidenceInterval`, `meetsMinimumSample`, `boundedAdjustmentFromRate` (capped at ±8 points).
- `backend/services/outcomeFeedbackService.js` — `computeAndAuditActionAdjustments()`, `getScoringAdjustmentMap()`, `getAuditHistory()`.
- `backend/controllers/outcomeFeedbackController.js`, `backend/routes/outcomeFeedbackRoutes.js` — mounted at `GET /api/v2/outcome-feedback/adjustments` and `/audit`.
- `backend/services/autonomousRecommendationEngine.js` — wired in (see below).
- New Prisma model: `ScoringAdjustmentAudit` (append-only).

## How it works

For every real recommendation action (BUY/REDUCE/EXIT), aggregates all graded `Outcome` rows for that action:

1. If fewer than `MIN_SAMPLE_SIZE` (15) graded outcomes exist, the adjustment is **withheld** — `applied: false`, `adjustmentValue: 0`, with a real, human-readable reason. This is still persisted to the audit table (a withheld computation is not the same as no computation).
2. Once the sample is statistically meaningful, computes the real hit rate and a 95% Wilson confidence interval, then converts the hit rate into a **bounded** point adjustment (±8 points max, scaled from how far the hit rate is from a neutral 50%).
3. Every computation — applied or withheld — is written as an immutable row to `ScoringAdjustmentAudit`, so the real trend of this action's adjustment over time is queryable history, not something recomputed after the fact.

## Wiring into the live engine

`autonomousRecommendationEngine.js`'s `runOnce()` fetches the adjustment map **once per run** (not once per symbol) via `outcomeFeedbackService.getScoringAdjustmentMap()`, best-effort (a learning-loop outage never blocks recommendation generation — falls back to no adjustment). `computeQualityScore()` gained two new, purely additive parameters (`outcomeFeedbackAdjustment`) that default to no-op when absent, so every pre-X11 test and caller is unaffected. The applied adjustment (or the real reason it was withheld) is recorded in the recommendation's own `qualityComponents.outcomeFeedbackAdjustment` — explainable at the level of a single recommendation, not just in aggregate.

## Tests

`backend/services/learningSafety.test.js` (6 tests) + `backend/services/outcomeFeedbackService.test.js` (4 tests): threshold enforcement, honest withholding with audit, bounded application once meaningful, per-action isolation, and full audit-history persistence. `backend/services/autonomousRecommendationEngine.test.js`'s existing 14 tests re-verified passing unchanged after the wiring.
