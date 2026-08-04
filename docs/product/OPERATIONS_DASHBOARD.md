# Operations Dashboard — Phase X9, Part 5

## What it is

`AdminDashboardScreen.jsx` — internal, read-only, visible only when `VITE_DEV_CONSOLE=true` (the exact same gate `HealthDashboardScreen`/`IntelligenceConsoleScreen` already use — never part of the investor-facing product). Backed by `adminDashboardService.js`, `betaMetricsService.js`, and `performanceMetricsService.js` — every number displayed is read from one of those three, never recomputed in the component.

## The required fields, and their real source

| Field | Real source |
|---|---|
| Daily Active Users | `analyticsEventRepository.countActiveInWindow({ days: 1 })` — distinct real `sessionId`s and distinct real `betaUserId`s in the last 24h, reported as two separate honest numbers rather than blended into one guess |
| Sessions | Same function, `{ days: 7 }` for a weekly view |
| Average Session Length | `betaMetricsService.computeAverageSession()` — real `session_ended` event durations |
| Most Used Screens | `analyticsEventRepository.countByScreen()` — real `GROUP BY screen` over `AnalyticsEvent` |
| Most Used Features | `analyticsEventRepository.countByEventName()` |
| Errors | `errorReportRepository.countBySource()` — real frontend/backend breakdown |
| Crashes | Total real `ErrorReport` row count |
| Feedback Count | Real `Feedback` row count, plus a real by-type breakdown |
| Top Recommendations Viewed | `analyticsEventRepository.countSymbolPropertyForEvent("recommendation_viewed")` — real per-symbol tally from the `properties.symbol` field already carried on that event |
| Decision Center Usage | Real `decision_center_viewed` count |

## Testing

2 tests in `AdminDashboardScreen.test.jsx` (real rendering of all sections, friendly error state with a real working retry) plus 1 backend integration test asserting every required field is present on the real HTTP response, plus the underlying `adminDashboardService`'s data all independently covered by `betaMetricsService.test.js`/`feedbackService.test.js`/`errorReportService.test.js`.
