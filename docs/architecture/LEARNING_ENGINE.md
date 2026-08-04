# Learning Engine (Phase X10 — Part 1)

## What it is

A continuously evolving per-user interaction profile, computed on demand from the real, existing `AnalyticsEvent` table. No second tracking pipe, no materialized snapshot that can go stale — every read recomputes directly from the growing event log.

## Files

- `backend/services/analyticsService.js` — extended `ALLOWED_EVENTS` with 5 new event names (`recommendation_saved`, `recommendation_dismissed`, `chart_opened`, `symbol_watchlisted`, `explanation_collapsed`) and `ALLOWED_PROPERTY_KEYS` with `recommendationId`, `sourceName`.
- `backend/services/userLearningService.js` — `getUserLearningProfile(betaUserId)`.
- `backend/controllers/userLearningController.js`, `backend/routes/userLearningRoutes.js` — mounted at `GET /api/v2/user-learning`.

## What's tracked

Every interaction the mission named — recommendations viewed/opened/saved/dismissed, an ignored-recommendation signal (derived: viewed but never opened/saved/dismissed), explanations expanded/collapsed, charts opened + average watch time, Decision Center interactions, portfolio actions, notifications opened, and the symbols a user engages with most.

## Why on-the-fly, not incremental

"Continuously evolving" is satisfied by recomputing from the real event log on every read. This is simpler than an incrementally-updated snapshot table and structurally cannot drift stale — there is nothing to keep in sync.

## Tests

`backend/services/userLearningService.test.js` — 5 tests: beta-user requirement, honest all-zero empty state, real counting, ignored-recommendation derivation, most-engaged-symbol ranking. `backend/services/analyticsService.test.js` gained one test confirming the 5 new events are allowlisted and property-supported.
