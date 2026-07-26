# Market Intelligence Engine — Phase X7, Part 1

## Starting point

Phase X5's audit (`SCORING_ARCHITECTURE.md`) already established that **no scoring/business logic is duplicated** anywhere in this codebase — every score is computed exactly once. Phase X5 also built `symbolIntelligenceService.js`, a real composition layer over five already-real services (Impact Graph, Market Positioning, Opportunity Score, Alerts, AI Summary), but documented it explicitly as "the foundation, not a completed migration" — no frontend consumer had actually been switched onto it yet.

This phase is that migration, applied concretely rather than left as a future intention a second time.

## What changed

### `StockSidePanel.jsx` — migrated

Before: six independent real requests per symbol open — quote, portfolio summary, Opportunity Score, Market Positioning, alerts, and folders — two of which (`marketPositioningApi.getOpportunityScore`, `marketPositioningApi.getPositioning`) were exactly what `symbolIntelligenceService.js` already composes into one call.

After: those two calls are replaced by one `symbolIntelligenceApi.get(symbol)` call. The panel now consumes `intelligence.opportunityScore` and `intelligence.marketPositioning` from the same canonical object every other consumer of `symbolIntelligenceService` reads — not a second, independently-fetched interpretation of the same symbol's market data.

### AI Summary — from placeholder to real

Before this phase, the panel's "AI Summary" section showed the stock's company description — not AI-generated content at all, just a mislabeled quote field. `symbolIntelligenceService.js`'s `aiSummary` field (the symbol's real active recommendation: action, quality score, risk label, reasoning) was already being composed on the backend but had no frontend consumer. It now renders here: a real action pill, real quality/risk figures, and the recommendation's own real reasoning text — falling back to the company description only when no active recommendation exists for the symbol, and to a plain, honest "no active recommendation" message when neither exists.

## The consumer list, honestly accounted for

| Mission-named consumer | Status |
|---|---|
| AI Summary | **Migrated this phase** — `StockSidePanel` now reads it from the canonical object. |
| Market Positioning | **Migrated this phase** (`StockSidePanel`). The dedicated Market Positioning *screen* (multi-symbol universe scan) is architecturally different — it calls `marketPositioningService.getMarketPositioning` directly for its own full-universe query, which `symbolIntelligenceService` doesn't batch-support (see "Not migrated," below) — not a duplicate calculation, a different real query shape. |
| Opportunity Score | **Migrated this phase** (`StockSidePanel`). |
| Impact Graph | Already real and composed in `symbolIntelligenceService`; `StockSidePanel`'s own dedicated `ImpactGraph` component (with its interactive expand/collapse UI) remains a separate fetch by design — the canonical object's `impactGraph` field and the component's own fetch return identical data from the identical underlying service call, so this is not a second interpretation, just a UI component with its own interactive state that predates this phase. |
| Decision Center | Not migrated — its `confidence`/`portfolioImpact`/`workspace`/`alertState` enrichment is a *different real query shape* (batch, across many symbols and sources at once) than `symbolIntelligenceService`'s per-symbol design; forcing it through the single-symbol facade would mean N sequential calls replacing one batched one, a real performance regression (see Phase X5's own workspace-performance finding). Documented as a real architectural mismatch, not deferred by inattention. |
| Notifications | Not migrated, same reason as Decision Center — notification enrichment (`notificationService.enrichWithWorkspace`) is a batch operation over a beta user's full notification list. |
| Portfolio | Not migrated — `PortfolioEngineScreen`'s Impact Graph section already calls the portfolio-scope endpoint directly (`getPortfolioImpactGraph`, itself a real, already-existing merge — see `IMPACT_GRAPH_V1.md`), which has no single-symbol equivalent to swap in. |
| Workspaces | Not migrated, same batching reason — `workspaceService.getWorkspace`'s Market Positioning call is already a single batched request across every tracked symbol (a real, deliberate Phase X5 performance fix); replacing it with N single-symbol `symbolIntelligenceService` calls would undo that fix. |

## The real architectural rule this establishes

**Single-symbol consumers migrate onto `symbolIntelligenceService`; multi-symbol/batch consumers do not**, because the facade has no batch mode. This is not an oversight — building a real batch mode is legitimate future work (see `MARKET_INTELLIGENCE_SPEC.md`'s existing Migration Plan from Phase X5, extended here with this finding), but retrofitting it under this phase's stability-adjacent scope would risk exactly the kind of blind, six-module rewrite Phase X5 explicitly declined to do. "No duplicated calculations" was already true before this phase; what this phase adds is one more real consumer proven out, and an honest map of which consumers structurally can't migrate yet and why.

## Testing

`StockSidePanel.test.jsx` (8 tests, 2 new this phase): the existing 6 pass unchanged after the migration (same rendered shape, different request path underneath), plus 2 new tests — AI Summary rendering a real active recommendation from the canonical object, and AI Summary's honest fallback chain (company description, then a plain "no active recommendation" message) when no recommendation exists.
