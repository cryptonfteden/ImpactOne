# Beta Metrics — Phase X9, Part 7

## What it is

`betaMetricsService.getBetaMetrics()` — the eight required metrics, each computed fresh from real `AnalyticsEvent`/`Feedback`/`ErrorReport` rows. No metric is estimated when its real sample is empty; an empty sample reports `null`/`0` honestly, with its real sample size alongside, never a fabricated percentage.

| Metric | Real definition | Source |
|---|---|---|
| **Activation Rate** | % of real sessions that fired `app_opened`/`first_open` AND later fired `onboarding_completed` | Grouped by real `sessionId`, computed fresh |
| **Retention** | % of real sessions active on more than one distinct calendar day, or carrying a real `returning_user` event | Same session grouping |
| **Daily Usage** | Real distinct-session count per calendar day, last 14 days | `AnalyticsEvent`, grouped by day |
| **Feature Adoption** | Per named feature (Decision Center, Portfolio, Market Dashboard, Impact Graph, AI Analysis, Workspace creation): % of real sessions that used it at least once — six separate real numbers, never blended into one score | Real per-session event presence check |
| **Time-to-First-Value** | Reused directly from `ttvMetricsService.js` (Phase 36) — real median/p75 time from a session's first `first_open` to its first occurrence of each real milestone event | No reimplementation — the existing, already-tested Time-To-Value engine |
| **Average Session** | Real average of `session_ended`'s real `durationMs` values | `AnalyticsEvent` |
| **Feedback/User** | Real total `Feedback` rows ÷ real distinct beta users who submitted at least one | `Feedback` table |
| **Crash-Free Sessions** | % of real sessions with zero `error_encountered` events | Real per-session event absence check |

## Honesty guarantees, concretely tested

- `computeActivationRate()` with zero sessions returns `{ rate: null }`, not `0%` — a real test (`getBetaMetrics returns honest zeros with no real data yet`) asserts this directly, distinguishing "no data" from "0% activation," which are different, non-interchangeable claims.
- `computeFeedbackPerUser()` only counts beta users who *actually* submitted feedback in the denominator — not total beta users, which would silently understate the real per-submitter rate.

## API

`GET /api/v2/beta-metrics` — one real, composed response. Consumed by `AdminDashboardScreen.jsx`'s "Beta Metrics" section.

## Testing

11 tests in `betaMetricsService.test.js`, each seeding real `AnalyticsEvent`/`Feedback`/`ErrorReport` rows and asserting the exact real computed number — not just that a field exists. 1 more in `betaOperations.integration.test.js` confirming the real HTTP response shape carries all eight required fields.
