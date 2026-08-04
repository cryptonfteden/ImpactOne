# AI Performance Dashboard (Phase X10 — Part 7)

## What it is

An internal, read-only dashboard composing the real systems built across this phase (and earlier sprints) into one view. No new scoring model — every metric is a real read or a real, disclosed aggregation.

## Files

- `backend/services/aiPerformanceDashboardService.js` — `getAiPerformanceDashboard()`.
- `backend/controllers/aiPerformanceDashboardController.js`, `backend/routes/aiPerformanceDashboardRoutes.js` — mounted at `GET /api/v2/ai-performance-dashboard`.
- `frontend/src/screens/AiPerformanceDashboardScreen.jsx`, `frontend/src/features/admin/AiPerformanceDashboardFeature.jsx`, `frontend/src/services/api/betaOperationsApi.js` (`aiPerformanceDashboardApi`).
- Gated behind `VITE_DEV_CONSOLE=true`, same precedent as the Health/Admin Dashboard and Intelligence Console (`frontend/src/layout/screenRegistry.js`, `frontend/src/layout/Sidebar.jsx`).

## What's composed, and from where

| Section | Source |
|---|---|
| Recommendation accuracy, confidence calibration | `qualityDashboardService.computeQualityDashboard()` (Sprint 29, unchanged, reused) |
| Source quality | Part 4's `newsSourceScoringService.listSourceScores()`, summarized |
| User engagement | Real, global `AnalyticsEvent` counts (total interactions, distinct active users, saves/dismissals) |
| Personalization quality | Real coverage rate — fraction of `InvestorProfile` rows with both `riskTolerance` and `investmentHorizon` set |
| Model drift | New this phase: real hit-rate comparison between the earlier and later halves of graded `Outcome` history, split at the real median `gradedAt`. Requires at least 10 graded outcomes; otherwise an honest `reason` is returned instead of a fabricated trend |
| Learning progress | Total graded outcomes + outcome completion rate, both from the reused quality-dashboard aggregation |

## Tests

`backend/services/aiPerformanceDashboardService.test.js` — 2 tests: an honest, fully-empty-state dashboard with no real data, and a dashboard reflecting real recorded engagement + personalization coverage.
