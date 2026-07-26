# Calibration Report (Phase X11 — Part 5)

## What it is

Composes the existing, real per-family calibration report (`calibrationReportService.js`, Sprint 31 — predicted confidence vs. observed outcome hit rate, calibration trend, sample size, all already gated on statistical meaningfulness) with two genuinely new computations this mission's Part 5 names that didn't exist before.

## Files

- `backend/services/calibrationAnalysisService.js` — `getConfidenceDistribution()`, `getCalibrationDrift()`, `getCalibrationReport()`.
- `backend/controllers/calibrationAnalysisController.js`, `backend/routes/calibrationAnalysisRoutes.js` — mounted at `GET /api/v2/calibration-analysis`.

## The four required comparisons

| Comparison | Source |
|---|---|
| Predicted confidence vs. observed outcome | Reused unchanged from `calibrationReportService.computeCalibrationReports()` (Sprint 31), grouped by recommendation action family |
| Calibration drift | **New this phase** — real average calibration error (`\|predictedConfidence/100 − actualCorrectness\|`) in the earlier half of graded outcome history vs. the later half, split at the real median `gradedAt`. Requires ≥10 graded outcomes with a real linked prediction confidence; otherwise an honest `reason` is returned instead of a fabricated trend |
| Confidence distribution | **New this phase** — a real reliability-diagram breakdown: every graded outcome bucketed by its real predicted-confidence range (0-20, 20-40, ..., 80-100), each bucket reporting its real observed hit rate once it has ≥5 samples, or an honest insufficient-data reason otherwise |

## Why compose, not duplicate

Sprint 31's per-family report already satisfies "predicted confidence, observed outcome, sample-size gating" — rebuilding it would be exactly the kind of redesign this phase's mission explicitly forbids. `calibrationAnalysisService.js` only adds what was genuinely missing: a distribution view (is a "75% confident" prediction actually right ~75% of the time, independent of which action family it belongs to?) and a drift signal (is calibration getting better or worse over time?).

## Tests

`backend/services/calibrationAnalysisService.test.js` — 5 tests: honest per-bucket insufficient-data reporting, a real computed bucket hit rate once meaningful, honest drift insufficient-data reporting, a real earlier-vs-later calibration-error split, and full report composition.
