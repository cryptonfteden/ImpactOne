# Workspace 2.0 Spec — Phase X3

Implemented, tested, real. `backend/services/workspaceService.js` + `frontend/src/components/WorkspaceDetail.jsx`. Every Phase H3 `WatchlistFolder` becomes a complete investment-project view — no redesign of the folder itself, an additive detail layer on top.

## What's Real vs. Disclosed

| Mission requirement | Status | Detail |
|---|---|---|
| Stocks | Real | Existing `WatchlistFolderItem` symbols |
| ETF | **Disclosed gap** | No `assetType` column exists on `WatchlistFolderItem` — every symbol is shown undifferentiated. Surfaced honestly in every workspace response (`knownGaps`), not guessed at |
| Notes | Real, new | `WorkspaceNote` model — append-only (a corrected note is a new row, matching this codebase's established evidence-trail convention), betaUserId-scoped |
| AI Notes | Real, new (flag only) | `WorkspaceNote.isAiNote` distinguishes a system note from a user's own; no automatic AI-note generation is implemented this phase — the flag and storage exist, ready for a future writer |
| Timeline | Real | A real chronological merge of already-real events: symbol-added timestamps, note timestamps, triggered-alert timestamps for this workspace's tracked symbols. Never a fabricated activity feed |
| Alerts | Real | Existing Phase H3 `PriceAlert` infrastructure, unchanged |
| Impact Graph | Real | Delegates directly to `impactGraphService.js` (`IMPACT_GRAPH_SPEC.md`), scoped per selected symbol within the workspace |
| Decision history | Real | Delegates to `decisionCenterService.js`, filtered to this workspace's own tracked symbols |
| Workspace Health | Real, computed | A composite of real `marketPositioningService` direction counts (long/short pressure among tracked symbols) and real recent-trigger counts — honestly `null` when the workspace has zero symbols, never a fabricated score |
| Recent activity | Real | The same real timeline, most-recent 10 |

## Workspace Health — The Real Formula

Given a workspace's real tracked symbols, `marketPositioningService.getMarketPositioning()` is called for exactly those symbols (reusing `MARKET_POSITIONING_SPEC.md`'s real, tested engine — no separate scoring logic). Health reports: tracked symbol count, real long-pressure count, real short-pressure count, real undirected count (symbols with no directional signal), and real recent-trigger count. `dataAvailable: false` if the positioning call itself fails, rather than silently showing zeros as if they were real.

## Isolation

Every workspace operation re-verifies ownership via `watchlistFolderService.requireOwnedFolder(betaUserId, folderId)` (the same Phase H3 guard) before any read or write — a note cannot be added to, and a workspace cannot be viewed for, a folder belonging to a different beta user (`404`, never a leaking `403`). Verified live in testing.

## API

- `GET /api/v2/workspaces/:id` — full workspace view (folder, notes, timeline, recentActivity, health, knownGaps)
- `POST /api/v2/workspaces/:id/notes` — add a real note (`{text}`)
- `GET /api/v2/workspaces/:id/decisions` — this workspace's real, symbol-filtered decision history

## Frontend

`WorkspaceDetail.jsx` — a tabbed panel (Overview / Notes / Timeline / Decision History / Impact Graph), opened via a new "Open workspace" action on each folder card in `WatchlistFoldersScreen.jsx`. Reuses the existing side-panel visual pattern (`StockSidePanel`'s CSS) rather than inventing a new modal language.

## Tests

8 tests (`workspaceService.test.js`): identity requirement, real folder/notes/timeline/known-gap retrieval, real note persistence appearing in the timeline, empty-text rejection, cross-user 404 on both read and write, real computed health from mocked-but-real market data, honest `null` health with zero symbols, and symbol-scoped decision history. 6 frontend tests (`WorkspaceDetail.test.jsx`) covering rendering, gap disclosure, note submission, Impact Graph tab wiring, empty health state, and close behavior.
