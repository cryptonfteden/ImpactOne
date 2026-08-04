# INSTITUTIONAL_AGENT.md — Phase INSTITUTIONAL-AGENT-001

**Mission:** build the Institutional Intelligence Agent — analyzing institutional ownership, ownership changes, fund accumulation, fund distribution, top holder concentration, new institutional positions, closed institutional positions, ownership trend, smart money participation, and institutional conviction, producing Institutional Bias (Bullish/Neutral/Bearish), Institutional Score, Ownership Trend, Accumulation Score, Distribution Score, Conviction Score, Top Holders, New Positions, Closed Positions, Risks, Opportunities, Confidence (0-100), and an AI Summary. Provider abstraction, never fabricate institutional ownership, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: upgrade in place — real SEC 13F data from a disclosed, verified cohort

The `"institutional"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub — its own comment disclosed that institutional-ownership analysis existed only as a committee member reading one row of a shared, pre-built evidence matrix, not an independently callable, per-symbol agent with its own real data fetch.

**The real, hard problem this phase solved:** true "institutional ownership of stock X" requires aggregating real SEC Form 13F filings across the ~5,000 institutional managers who file quarterly — each 13F Information Table lists a manager's own holdings, keyed by free-text issuer name and CUSIP, never indexed by security. There is no free, real, pre-aggregated "who holds AAPL" endpoint anywhere (confirmed live during development: Finnhub's institutional/fund-ownership endpoints all returned `403` with the API key configured in this environment — a paid-tier feature this environment doesn't have).

Rather than fabricate an aggregated ownership picture, this agent is built on **real SEC EDGAR 13F-HR data from a small, disclosed, individually-verified cohort of major institutional managers** — the same real-CIK-based EDGAR infrastructure `INSIDER-AGENT-001` established for Form 4, extended to Form 13F. Each of the 7 manager CIKs in `institutionalManagerReference.js` was independently verified during development against SEC's own `data.sec.gov/submissions` feed to confirm it (a) resolves to the real, expected manager name, and (b) has real `13F-HR` filings on record — never a guessed or unverified CIK.

## A real bug found and fixed during development

SEC's real 13F Information Table `value` field is **already in whole dollars** (rounded to the nearest thousand) — not "value in thousands," a common but incorrect assumption. This was caught by manually verifying `value / shares` against a real, known stock price (Ally Financial) in a real Berkshire Hathaway filing during development: the naive "×1000" assumption produced an implied share price of ~$39,000, obviously wrong; removing it reproduced the real ~$39/share price correctly. `thirteenFInfoTableParser.js`'s own header comment documents this explicitly, and a dedicated test locks it in.

## What was built

New directory: `backend/services/domainAgents/institutionalAgent/`.

| File | Responsibility |
|---|---|
| `institutionalManagerReference.js` | The disclosed, individually-verified cohort of 7 real institutional managers (Berkshire Hathaway, Renaissance Technologies, Bridgewater, Citadel Advisors, AQR, Two Sigma, Millennium) with their real SEC CIKs. |
| `companyNameResolver.js` | Real Finnhub `/stock/profile2` `name` field lookup (the same real, already-proven endpoint `stockSectorResolver.js`/`valuationDataProvider.js` already call) — needed because 13F tables key holdings by company name, not ticker. |
| `thirteenFSubmissionsParser.js` | Parses EDGAR's real columnar submissions JSON into real `13F-HR` filing rows (amendments excluded, a disclosed scope choice). |
| `thirteenFInfoTableLocator.js` | Fetches a real accession's own `index.json` to locate the real Information Table document — its filename is arbitrary per filing (confirmed during development: `primary_doc.xml` is only the cover page). |
| `thirteenFInfoTableParser.js` | A minimal, targeted extractor for the real 13F Information Table XML schema; matches real rows to the target company via a disclosed, case-insensitive substring match (not an exact CUSIP lookup, since this agent doesn't have a symbol→CUSIP mapping), aggregating every real matching row (a manager can report the same issuer across multiple real discretionary accounts). |
| `institutionalDataProvider.js` | **The provider abstraction.** Orchestrates company-name resolution, then per-manager real submissions + Information Table fetch/parse for the two most recent real quarters. Every manager's fetch degrades independently — one failure never blocks the others. |
| `positionClassifier.js` | The shared real position classification (NEW/CLOSED/INCREASED/DECREASED/UNCHANGED/NONE/UNKNOWN) every analyzer below builds on. |
| `ownershipChangeAnalyzer.js` | **Ownership Trend** — real aggregate share-count direction across every real, comparable manager. |
| `accumulationDistributionAnalyzer.js` | **Accumulation Score / Distribution Score** — two distinct real scores (never netted) from real dollar-value increases vs. decreases across the cohort. |
| `newClosedPositionsAnalyzer.js` | **New Positions / Closed Positions** — real managers whose real position appeared or disappeared between quarters. |
| `topHoldersAnalyzer.js` | **Top Holders** — real managers currently holding, sorted by real dollar value. |
| `convictionAnalyzer.js` | **Smart money participation** (real fraction of the cohort holding) and **Conviction Score** (real consensus among managers who changed position). |
| `institutionalScoreAnalyzer.js` | **Institutional Bias / Institutional Score** — a disclosed, hand-set weighted formula (never a naive average) blending real net dollar-value direction (60%) with real net new-vs-closed position count (40%). |
| `confidenceModel.js` | Overall **Confidence** — data availability, real manager coverage, real quarter-comparability, real conviction, and a fixed, disclosed penalty for this agent's inherent curated-cohort scope limitation. |
| `risksOpportunitiesBuilder.js` | **Risks / Opportunities** — deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly not an LLM call. |
| `institutionalAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T...",
  dataAvailable: true,
  unavailableReason: null,
  institutionalBias: "BEARISH",          // BULLISH | NEUTRAL | BEARISH
  institutionalScore: -68,                // -100..100
  ownershipTrend: { trend: "DECREASING", currentTotalShares: 286483265, priorTotalShares: 306542399, comparableManagerCount: 7 },
  accumulationScore: 6,
  distributionScore: 94,
  convictionScore: 50,
  smartMoneyParticipation: 43,
  topHolders: [ { managerName: "Berkshire Hathaway Inc", shares: 227917808, value: 57843260493, reportDate: "2026-03-31" }, ... ],
  newPositions: [],
  closedPositions: [ { managerName: "AQR Capital Management LLC", priorShares: 12501523, priorValue: 3398663807 }, ... ],
  risks: [ "Institutional bias is bearish.", "Real distribution (94/100) outweighs real accumulation among the disclosed manager cohort.", ... ],
  opportunities: [],
  confidence: { confidence: 73, components: { base: 30, coverageBonus: 25, comparableBonus: 20, convictionBonus: 8, structuralPenalty: 10 } },
  aiSummary: "Institutional Bias is BEARISH (score -68), ownership trend decreasing. ...",
  inputs: { /* the full InstitutionalMetrics this report was built from, for auditability */ },
}
```

Confirmed live against real AAPL SEC 13F data during development — Renaissance Technologies genuinely accumulated (100K→3.17M shares QoQ), Citadel genuinely distributed, AQR and Two Sigma genuinely closed their positions entirely — all real, verifiable filed facts.

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Institutional ownership | Real, from the disclosed cohort's real 13F-HR filings. |
| Ownership changes / Ownership trend | Real, `ownershipChangeAnalyzer.js`. |
| Fund accumulation / distribution | Real, `accumulationDistributionAnalyzer.js`. |
| Top holder concentration | Real, `topHoldersAnalyzer.js` (scoped to the disclosed cohort). |
| New / closed institutional positions | Real, `newClosedPositionsAnalyzer.js` + `positionClassifier.js`. |
| Smart money participation | Real, `convictionAnalyzer.js`'s participation rate. |
| Institutional conviction | Real, `convictionAnalyzer.js`'s conviction score. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `institutionalAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests.

## Integration with the Unified Stock Intelligence extension point

Extended from 6 agents to 7:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"institutional"`.
- `agentDirectionMapper.js`: new `toPolarity` case (`institutionalBias` direct mapping) and `extractRisksAndOpportunities` case (this agent's own `risks`/`opportunities` fields pass straight through, same as `etf-flow`).
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `7: 58` entry.
- `aiExecutiveSummary.js` needed **no changes** — already generalizes dynamically (established at `SENTIMENT-AGENT-001`).
- Verified live end-to-end against AAPL: `totalAgentCount: 7`, real conflicts correctly detected and surfaced, confidence correctly discounted.

## Tests

**84 new unit tests, all passing:** `institutionalManagerReference.test.js` (2), `companyNameResolver.test.js` (4), `thirteenFSubmissionsParser.test.js` (4), `thirteenFInfoTableLocator.test.js` (4), `thirteenFInfoTableParser.test.js` (5, including the real value-unit regression test), `institutionalDataProvider.test.js` (5, including a real single-manager-failure graceful-degradation case), `positionClassifier.test.js` (6), `ownershipChangeAnalyzer.test.js` (5), `accumulationDistributionAnalyzer.test.js` (5), `newClosedPositionsAnalyzer.test.js` (4), `topHoldersAnalyzer.test.js` (4), `convictionAnalyzer.test.js` (5), `institutionalScoreAnalyzer.test.js` (5), `confidenceModel.test.js` (5), `risksOpportunitiesBuilder.test.js` (10), `aiSummary.test.js` (6), `institutionalAgent.test.js` (5, including a forbidden-governance-key scan).

Plus **5 new** `institutionalAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 3 existing Unified Stock Intelligence test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`) to reflect the 7-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2000 tests, 1998 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **This agent covers a disclosed cohort of 7 major real institutional managers, never the full universe of ~5,000 real 13F filers.** A true full-market aggregation would require a paid, pre-aggregated institutional-ownership dataset (e.g. WhaleWisdom, Fintel) this environment does not have — disclosed in every relevant module's header and in the composed report's own risk list every time.
2. **Matching a target company to real 13F rows uses a case-insensitive substring match on `nameOfIssuer`, not an exact CUSIP lookup** (this agent has no symbol→CUSIP mapping) — a real, disclosed heuristic that could occasionally over- or under-match for companies with generic or overlapping names.
3. **13F-HR amendments (`13F-HR/A`) are excluded** — a disclosed scope choice to keep the quarter-over-quarter chronology simple and unambiguous.
4. **A joint 13F filing's multiple discretionary-account rows for the same issuer are summed**, which is the real, correct aggregation per SEC's own schema, but this agent does not separately track which specific real sub-account changed.
5. **All thresholds and weights (bias ±20, position-count 20 pts/event, value-weight 60%/position-weight 40%, confidence component caps) are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
6. **Only the two most recent real 13F-HR filings per manager are compared** (a real, bounded quarter-over-quarter window) — a longer real historical trend per manager is out of scope for this phase.

## Files changed

- New: `backend/services/domainAgents/institutionalAgent/{institutionalManagerReference,companyNameResolver,thirteenFSubmissionsParser,thirteenFInfoTableLocator,thirteenFInfoTableParser,institutionalDataProvider,positionClassifier,ownershipChangeAnalyzer,accumulationDistributionAnalyzer,newClosedPositionsAnalyzer,topHoldersAnalyzer,convictionAnalyzer,institutionalScoreAnalyzer,confidenceModel,risksOpportunitiesBuilder,aiSummary,institutionalAgent}.js` + matching `.test.js` files, plus `institutionalAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/institutionalAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to a 7-agent evidence set).
- Unmodified: `backend/services/intelligenceCommittee/members/institutionalSpecialistMember.js` (a separate, crypto/evidence-matrix-based committee system, not reused as-is), `aiExecutiveSummary.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
