# Decision Center V1 — Phase X4

Extends `DECISION_CENTER_SPEC.md` (Phase X3's original three real sources — triggered price alerts, graded AI recommendation outcomes, new recommendations on tracked symbols — and its honest disclosure of the two sources with no real historical data yet: workspace activity, Opportunity Score movement). All of that is unchanged; this phase makes it the default *action* workspace, not just a read-only feed.

## What's new

### Schema

- `DecisionState` model — `{ betaUserId, decisionKey, status }` with `@@unique([betaUserId, decisionKey])`, `status ∈ { PINNED, DISMISSED, COMPLETED }`. A `decisionKey` is the same synthetic id already used for each item (`alert-<id>`, `lifecycle-<id>`, `new-rec-<id>`) — no new identity scheme, just persisted status against the existing one.

### Backend — `decisionCenterService.js`

- Every item response now carries the mission's full required field set: `reason`, `evidence`, `priority`, `confidence` (real — a triggered alert is 100, a lifecycle/new-rec item reuses the recommendation's own real `qualityScore`, never a separately invented number), `portfolioImpact` (real boolean from a real held-position check), `workspace` (real folder name(s), or `null` if genuinely untracked), `alertState` (real active/triggered counts for that symbol), `suggestedAction`, and now `status` (`PINNED`/`DISMISSED`/`COMPLETED`/`null`).
- `setDecisionStatus(betaUserId, decisionKey, status)` / `clearDecisionStatus` — upsert/delete against `DecisionState`, exposed as:
  - `POST /api/v2/decisions/:id/pin`
  - `POST /api/v2/decisions/:id/dismiss`
  - `POST /api/v2/decisions/:id/complete`
  - `DELETE /api/v2/decisions/:id/status` (clears pin/dismiss/complete back to untouched)
- Sorting — `applySort(items, sortBy)` supports `urgency` (priority rank, default), `confidence`, `portfolioImpact`, `time`. Pinned items always float to the top of whatever sort is chosen, matching the mission's "Pin" requirement working alongside sorting rather than against it.
- Dismissed items are excluded from the default response (`includeDismissed=false`); the mission's "Dismiss" action removes an item from view without deleting its history.

### Frontend — `DecisionCenterScreen.jsx`

- Every card now renders all ten mission-required fields: Decision (reason), Evidence, Priority, Portfolio impact, Workspace, Alert state, Confidence, Suggested next action, plus Pin/Mark completed/Dismiss buttons.
- A second filter row for the four sort modes, backed by the server's own `availableSorts` list rather than a hardcoded frontend array.
- Pin/complete are toggles: clicking an already-pinned/-completed item calls `DELETE .../status` to clear it back to untouched, rather than a separate "unpin" endpoint — one clear-status primitive covers both toggle directions.

## Testing

- `decisionCenterV1.integration.test.js` (6 tests, real HTTP via supertest): pin/dismiss/complete/clear against a real persisted `DecisionState` row, sorting correctness, cross-user isolation.
- `DecisionCenterScreen.test.jsx` (rewritten, 10 tests): new field rendering, sort-triggered re-fetch with the real `sortBy` param, and the three action buttons each calling their real endpoint and reloading.
