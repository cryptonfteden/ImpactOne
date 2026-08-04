# Decision Center Spec — Phase X3

Implemented, tested, real. `backend/services/decisionCenterService.js` + `frontend/src/screens/DecisionCenterScreen.jsx`.

## Question Answered

"What decisions require my attention today?" — a single, cross-cutting, per-beta-user aggregation screen.

## Honest Scope — Three Real Sources, Two Disclosed Gaps

The mission names six sources. Three have a real, already-persisted trail in this codebase and are implemented:

1. **Price Alerts** — real triggered `Notification` rows (Phase H3 infrastructure), surfaced as `HIGH` priority.
2. **AI Recommendation Changes (graded)** — real `RecommendationLifecycleEvent` rows (`SUCCEEDED`/`FAILED`) for symbols tracked in the beta user's own workspaces, cross-referenced to the real recommendation.
3. **AI Recommendation Changes (new)** — real new `ACTIVE` recommendations generated for a tracked symbol, surfaced as `MEDIUM` priority.

Two do not have a real historical source and are **not implemented, explicitly disclosed** rather than faked:

- **Workspace activity** — `WatchlistFolderItem` has no add/remove/rename event log, only current state. Building real history would require a new event-log table; out of this phase's scope, and disclosed in every API response (`unavailableSources`).
- **Opportunity Score movement** — the score is computed fresh on every request (`OPPORTUNITY_SCORE_SPEC.md`); no historical snapshot is persisted, so no real "movement" can be reported. Same honest disclosure.

**News impact** is not separately implemented as a fourth real source this phase (it would require joining `CanonicalEvent` importance data to tracked symbols) — flagged here as a known limitation, not silently omitted.

## Every Item's Real Fields

Per the mission's explicit requirement, every decision item carries: `reason` (why this needs attention), `evidence` (the real underlying fact — an alert's message, a recommendation's real reasoning text), `suggestedAction` (a real, specific next step), `priority` (`HIGH`/`MEDIUM`/`LOW`, derived from real severity — a failed thesis is `HIGH`, a new recommendation is `MEDIUM`), and `timestamp` (the real event time, used for sorting).

## Filtering & Grouping

`GET /api/v2/decisions?source=&priority=` — both real query filters. Every response also returns `grouped` (items bucketed by their real source) and `counts` (real totals per priority) — the screen renders one `SectionCard` per real group.

## Isolation

Every source query is scoped to the calling `betaUserId` — triggered alerts via `notificationRepository.listNotifications(betaUserId)`, tracked symbols via `watchlistFolderRepository.listFolders(betaUserId)`. Verified live in testing: User B's Decision Center never includes User A's triggered alert.

## Tests

7 tests (`decisionCenterService.test.js`): identity requirement, permanent unavailable-sources disclosure, a real triggered alert becoming a real HIGH item with all five required fields, per-user isolation, a real new recommendation becoming a MEDIUM item with real evidence text, source/priority filtering, and grouping. 5 frontend tests (`DecisionCenterScreen.test.jsx`) covering rendering, disclosure, empty state, filter re-fetching, and error state.
