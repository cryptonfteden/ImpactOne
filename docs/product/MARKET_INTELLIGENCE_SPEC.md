# Market Intelligence Layer — Phase X5

## Naming note (read this first)

The mission names this abstraction "Market Intelligence." The codebase already has a distinct, unrelated, already-mounted system under that exact name: Sprint 37's `marketIntelligenceService`/`marketIntelligenceController`/`marketIntelligenceRoutes`, mounted at `/api/v2/market-intelligence` — provider inventory, evidence matrix, technical/social/analyst/crypto/options/COT intelligence, and research-agent principles. Reusing the name for this phase's new concept would have silently collided with a real, live route.

This phase's abstraction is implemented as **`symbolIntelligenceService.js`**, mounted at `/api/v2/symbol-intelligence/:symbol`. It fills the *role* the mission describes — one composed object per symbol, consumed by the six named modules — under a name that doesn't collide with existing, unrelated infrastructure.

## What it is

`getSymbolIntelligence(symbol, { betaUserId })` returns one object:

```json
{
  "symbol": "AAPL",
  "generatedAt": "...",
  "impactGraph": { "...": "impactGraphService.getImpactGraph(symbol)" },
  "marketPositioning": { "...": "marketPositioningService.getMarketPositioning({ symbols: [symbol] })" },
  "opportunityScore": { "...": "opportunityScoreService.getOpportunityScore(symbol)" },
  "aiSummary": { "action": "...", "qualityScore": 0, "riskLabel": "...", "reasoning": "..." },
  "alerts": [ "...real, betaUserId-scoped alerts for this symbol..." ]
}
```

**It computes nothing new.** Every field is a direct, unmodified call into an already-real, already-tested service. The audit behind `SCORING_ARCHITECTURE.md` — reading every scoring function in `backend/services/` before writing either document — found **zero duplicated business logic** across Impact Graph, Decision Center, Market Positioning, Opportunity Score, Alerts, and the recommendation engine today. The fragmentation the mission describes is real, but it's an absence of a shared *read path*, not duplicated *calculation* — five screens each independently fetching overlapping data from their own single dependency, not five screens each recomputing the same math differently.

## Real, per-field honesty

Each of the five composed fields is wrapped in `settleField()`: if the underlying service throws, that field becomes `{ unavailable: true, reason }` — the rest of the object still returns. `alerts` is `{ unavailable: true, reason: "No beta user identity..." }` when no `betaUserId` is present, never a fabricated empty array implying "this symbol has no alerts."

## Migration plan (not built this phase)

Rewiring six live, independently-tested modules (`decisionCenterService.js`, the Market Positioning screen, `opportunityScoreService.js`'s own callers, `priceAlertService.js`'s consumers, `impactGraphService.js`'s consumers, and wherever an "AI Summary" is shown) to read from this facade instead of calling their own dependency directly is real, valuable follow-up work — but rushing it across six tested modules in one phase, under a mission whose Part 5 explicitly asks for *performance measurement* on several of those same modules, would trade a real regression risk for a code-organization win that has no user-facing effect today. Recommended sequencing for a future phase:

1. `symbolIntelligenceService.js` gains integration tests proving parity with each individual service's existing output (started this phase — see `symbolIntelligenceService.test.js`).
2. One consumer migrates at a time, starting with the lowest-risk one (the Market Positioning screen's single-symbol detail view, which already only reads `marketPositioningService` + `opportunityScoreService` — the two cheapest fields here).
3. Decision Center and Impact Graph migrate last, since they're both multi-symbol aggregators (`mergeGraphs`, portfolio/workspace scope) that would need the facade extended to batch multiple symbols efficiently first — a real, non-trivial addition, not a rename.

## Testing

- `symbolIntelligenceService.test.js` (4 tests): empty-symbol rejection, full composition for a no-data symbol, honest `alerts.unavailable` with no identity, real symbol-filtered alerts with a real identity.
- `symbolIntelligence.integration.test.js` (1 test, real HTTP via supertest): confirms the route returns all five composed fields.
