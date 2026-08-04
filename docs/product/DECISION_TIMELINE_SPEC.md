# Decision Timeline — Phase X7, Part 3

## What it is

`decisionTimelineService.getDecisionTimeline(betaUserId)` — one real, chronologically-merged story from six real sources, scoped to a beta user's real tracked/held symbols. Computes nothing new: every entry is read directly from an already-real, already-tested source.

| Mission source | Real origin |
|---|---|
| News | `canonicalEventRepository.listRecent`, filtered to events whose real `symbols` array intersects the user's tracked/held symbols |
| AI Decisions | `RecommendationLifecycleEvent` rows, filtered to recommendations on tracked/held symbols |
| Portfolio Actions | `portfolioEngineService.getTradeHistory` — real executed trades |
| Alerts | `notificationRepository.listNotifications` — real triggered price alerts |
| Workspace Activity | Real `WatchlistFolderItem.addedAt` + `WorkspaceNote.createdAt` across every owned folder |
| Impact Graph Updates | Real `WorldMemoryCausalLink.recordedAt`, joined in JS to `WorldMemoryRecord` (no Prisma relation exists between the two — the same join pattern `impactGraphService.js` already uses, not a new one) |

Two mission-named sources are honestly disclosed as unavailable, matching `decisionCenterService.js`'s pre-existing, identical disclosure for the same two gaps:

- **Market Positioning changes** — no historical snapshot is persisted; Market Positioning is computed fresh on every request.
- **Opportunity Score changes** — same reason.

## Real bug this endpoint's build caught

While wiring the frontend screen, `npm run build` failed with `[MISSING_EXPORT] "symbolIntelligenceApi" is not exported`. Part 1's `StockSidePanel.jsx` migration (this same phase) imported `symbolIntelligenceApi` from `services/api/index.js`, but the actual `symbolIntelligenceApi.js` file was never created — Phase X5 built the backend service and documented a frontend migration plan, but the frontend API wrapper itself was never written. Vitest's mocked `vi.mock("../services/api", ...)` in `StockSidePanel.test.jsx` tolerated the missing module completely (the mock never touches the real file), so every test passed while the app was structurally broken — **exactly** the failure class `RELEASE_CHECKLIST.md` (Phase X6) was built to catch. Fixed this phase (`symbolIntelligenceApi.js` created, exported).

## Frontend

`DecisionTimelineScreen.jsx` (new, nav-reachable as "Decision Timeline" under Sidebar's Advanced tools) — a type-filterable, chronological list. Every symbol-linked event opens the shared chart panel (`openSymbolPanel`), the same one-implementation pattern every other X3/X4 feature already uses — no new symbol-detail UI was built.

## Testing

- `decisionTimelineService.test.js` (5 tests): identity requirement, honest empty state with both disclosed gaps, real merged workspace/alert events isolated per user, real Impact Graph filtering by symbol relevance (confirmed an unrelated symbol's causal link is correctly excluded), newest-first sort ordering across every source.
- `decisionTimeline.integration.test.js` (2 tests, real HTTP via supertest): identity requirement, honest empty response for a fresh real beta user.
- `DecisionTimelineScreen.test.jsx` (5 tests): real merged rendering, honest disclosure, honest empty state, client-side type filtering, friendly error state with a real working retry.
