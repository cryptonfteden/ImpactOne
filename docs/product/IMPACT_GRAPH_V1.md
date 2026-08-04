# Impact Graph V1 — Phase X4

Extends `IMPACT_GRAPH_SPEC.md` (Phase X3's per-symbol Impact Graph — interactive expand/collapse, real edge confidence, real evidence panel, explicit unknown-cause rendering). All of that is unchanged; this phase adds the two remaining named scopes.

## What's new

### Backend — `impactGraphService.js`

- `mergeGraphs(perSymbolGraphs)` — takes an array of already-computed per-symbol graphs and merges their nodes/edges by id (a `Map` dedupes any node/edge shared across symbols), producing one combined graph plus `symbolsWithChain` (symbols that contributed a real `REAL_CHAIN`) and `symbolsWithNoData` (symbols honestly reported with their own status/message, never silently dropped).
- `getPortfolioImpactGraph(betaUserId)` — reads real open positions via `portfolioEngineService.getPortfolioSummary`, fetches each held symbol's real graph, merges them. Zero positions returns an honest `NO_DATA` with a real message, not an error.
- `getWorkspaceImpactGraph(betaUserId, folderId)` — same merge, scoped to one real, owned `WatchlistFolder`'s tracked symbols. Ownership is enforced via `watchlistFolderService.requireOwnedFolder` — a different user's folder id returns 404, not another user's data.
- Routes: `GET /api/v2/impact-graph/portfolio`, `GET /api/v2/impact-graph/workspace/:folderId` — both mounted **before** the existing `GET /api/v2/impact-graph/:symbol` wildcard in `impactGraphRoutes.js`, so `"portfolio"`/`"workspace"` are never matched as if they were ticker symbols.

### Frontend — `ImpactGraph.jsx`

- New `scope` prop (`"symbol"` default | `"portfolio"` | `"workspace"`). All three scopes return the identical `{ nodes, edges, status, message }` shape, so the existing expand/collapse `EdgeNode` rendering is fully shared — no duplicated graph UI per scope.
- For merged scopes, an additional disclosure line lists which symbols actually contributed a real chain (`symbolsWithChain`) and which didn't yet (`symbolsWithNoData`, with each symbol's own real reason) — the same "never fabricate, always disclose" pattern as every other X3/X4 feature.
- **Portfolio scope** is surfaced on `PortfolioEngineScreen.jsx` (the real, server-owned portfolio engine reachable behind `VITE_PORTFOLIO_ENGINE=api`) — deliberately *not* the legacy `PortfolioScreen`, whose positions are a client-side, localStorage-simulated portfolio unrelated to the real `betaUserId`-scoped positions the backend endpoint actually queries. Wiring it into the legacy screen would have shown a graph that doesn't correspond to what's on screen.
- **Workspace scope** is a new "Whole workspace" toggle in `WorkspaceDetail.jsx`'s existing "Impact Graph" tab, alongside the pre-existing per-symbol toggle buttons. Selecting it renders `<ImpactGraph symbol={folderId} scope="workspace" />`. A small state-management fix went with this: the tab used to reset its symbol selection to the folder's first symbol on every `refresh()` (e.g. after adding a note), which would have silently overridden a user's "Whole workspace" choice back to a single symbol — fixed with a `hasSetDefaultImpactSymbol` ref so the default is only applied once per workspace, not on every refresh.

## Testing

- `impactGraphV1.integration.test.js` (5 tests, real HTTP via supertest): symbol `NO_DATA`, portfolio with zero positions, portfolio merging a real order + a real seeded `WorldMemoryCausalLink`, workspace with zero tracked symbols, workspace merging a real tracked symbol with a real null-`causeRecordId` edge (proving the honest "unknown upstream" state survives the merge) plus cross-user isolation (a second beta user gets 404 on the first user's folder).
- Existing `ImpactGraph.test.jsx` and `WorkspaceDetail.test.jsx` pass unchanged — the new `scope` prop defaults to the old symbol behavior, so no existing usage needed updating.
