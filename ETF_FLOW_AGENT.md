# ETF_FLOW_AGENT.md — Phase ETF-FLOW-AGENT-001

**Mission:** build the ETF Flow Intelligence Agent — analyzing daily/weekly/monthly ETF flows, sector ETF flows, thematic ETF flows, passive vs. active flows, flow acceleration, flow persistence, fund concentration, and stock exposure through ETFs, producing ETF Flow Bias (Bullish/Neutral/Bearish), Net Flow Score, Flow Strength, Flow Persistence, Sector Rotation, Passive Flow Impact, Stock ETF Exposure, Risks, Opportunities, Confidence (0-100), and an AI Summary. Provider abstraction, never fabricate ETF flow data, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: upgrade in place — and an honest, disclosed proxy where no real vendor exists

The `"etf-flow"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub. A dedicated research pass before writing any code confirmed: **no real, licensed ETF creation/redemption flow, AUM, or holdings data source exists anywhere in this codebase.** `services/providers/definitions/spdrProvider.js` is an honest stub for exactly this reason (its own comment states real-time flow data requires a licensed feed not integrated here). This phase upgrades the `"etf-flow"` id in place — same id, same registry slot, `metadata.name` updated to `"ETF Flow Intelligence Agent"`.

Rather than fabricate true fund-flow dollar figures, this agent is built entirely on **real, disclosed trading-activity proxies** computed from real price/volume data:

- **Real dollar-volume proxy** (real close × real volume, summed over a real window) stands in for daily/weekly/monthly flow magnitude.
- **Real price direction** over the same window stands in for flow direction (inflow/outflow).

This is the same "proxy, not the real underlying metric" discipline `marketSentimentScorers.scoreNewsSentiment` already discloses for its own feed-based sentiment proxy — every module's header comment states this explicitly, and the report's own `unavailableReason` fields make the two genuinely-unavailable dimensions (fund concentration, stock-level ETF exposure) honest rather than silently absent.

## Real data sources reused

- **`priceHistoryProvider.js`** (already real, unmodified) — real daily OHLCV bars for any ticker, including ETFs, via Yahoo Finance's no-auth chart endpoint.
- **Finnhub `/stock/profile2`** (`stockSectorResolver.js`) — the exact same real, already-proven `finnhubIndustry` field `valuationDataProvider.js` already uses, to resolve a real stock symbol to its real sector.
- **`sectorEtfMap.js`** (already real, unmodified, from `qualityPlatform/`) — the existing disclosed sector-name → sector-ETF-ticker map, reused rather than duplicated.

## What was built

New directory: `backend/services/domainAgents/etfFlowAgent/`.

| File | Responsibility |
|---|---|
| `etfClassificationReference.js` | Disclosed, hand-set reference tables: recognized sector ETF tickers (reused from `sectorEtfMap.js`), a thematic ETF → theme map, and a passive/active classification list — a ticker not listed honestly reports `null`, never a guess. |
| `stockSectorResolver.js` | Real, live Finnhub `finnhubIndustry` lookup for a stock symbol. |
| `etfFlowDataProvider.js` | **The provider abstraction.** Resolves the real target ETF (the symbol itself if recognized, or a stock's real sector ETF otherwise), fetches its real daily bars plus a real SPY reference series for sector-rotation comparison. Honestly unavailable when no real ETF can be resolved or no real price history exists. |
| `flowProxyCalculator.js` | **Daily/Weekly/Monthly ETF flows** — the real dollar-volume-and-direction proxy over 1/5/21-day real windows. |
| `flowAccelerationAnalyzer.js` | **Flow acceleration** — compares the real weekly-window daily rate against the real monthly-window baseline daily rate. |
| `flowPersistenceAnalyzer.js` | **Flow Persistence** — real day-over-day direction consistency over a real recent window. |
| `flowStrengthAnalyzer.js` | **Flow Strength** — real recent average daily dollar volume vs. the real longer-baseline average. |
| `sectorRotationAnalyzer.js` | **Sector Rotation** — real relative strength of the target ETF's monthly proxy vs. the real SPY reference. |
| `passiveActiveAnalyzer.js` | **Passive vs Active flows / Passive Flow Impact** — combines the disclosed classification with the real monthly flow's real magnitude tier. |
| `netFlowScoreAnalyzer.js` | **ETF Flow Bias / Net Flow Score** — a disclosed, hand-set weighted combination (monthly weighted most, then weekly, then daily — never a naive average) of the three real window directions. |
| `fundConcentrationAnalyzer.js` | **Fund concentration** — always honestly unavailable in this environment; no real holdings-weight data source is connected. |
| `stockExposureAnalyzer.js` | **Stock ETF Exposure** — always honestly unavailable for a stock symbol (no real reverse ETF-holdings lookup exists); honestly "not applicable" for a directly-analyzed ETF symbol. |
| `confidenceModel.js` | Overall **Confidence** — a disclosed, hand-set weighted formula: data availability, direct-ETF vs. indirect-sector-proxy (real, lower confidence for the indirect case), real bar sample size, real flow-persistence corroboration, and a fixed, disclosed penalty for the two structurally-unavailable dimensions. |
| `risksOpportunitiesBuilder.js` | **Risks / Opportunities** — deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly not an LLM call. |
| `etfFlowAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T...",
  dataAvailable: true,
  unavailableReason: null,
  targetEtf: "XLK",
  isDirectEtf: false,                    // AAPL resolved to its real sector ETF, XLK
  sector: "Technology",
  etfFlowBias: "BEARISH",                // BULLISH | NEUTRAL | BEARISH
  netFlowScore: -80,                      // -100..100
  flowStrength: { classification: "LOW", strengthRatio: 0.68 },
  flowPersistence: { classification: "HIGH", persistenceRatio: 0.8, dominantDirection: "OUTFLOW" },
  sectorRotation: { classification: "ROTATING_OUT", relativeStrengthPercent: -8.36 },
  passiveFlowImpact: { classification: "PASSIVE", direction: "OUTFLOW", magnitudeTier: "HIGH" },
  stockEtfExposure: { dataAvailable: false, unavailableReason: "No real ETF-holdings-by-constituent data source is connected...", exposureEstimate: null },
  fundConcentration: { dataAvailable: false, unavailableReason: "No real ETF holdings-weight data source is connected...", topHoldingsWeightPercent: null },
  risks: [ "Net ETF flow proxy is bearish.", "Real relative weakness suggests capital may be rotating out of this sector/theme (-8.36% vs. the market reference).", ... ],
  opportunities: [],
  confidence: { confidence: 65, components: { base: 30, directnessBonus: 10, sampleBonus: 20, persistenceBonus: 15, structuralPenalty: 10 } },
  aiSummary: "ETF Flow analysis for AAPL, via its sector proxy XLK (Technology). ...",
  inputs: { /* the full EtfFlowMetrics this report was built from, for auditability */ },
}
```

Confirmed live against real AAPL data during development — correctly resolved to XLK (Technology), computed a real bearish flow-proxy read with high persistence and sector-rotation-out.

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Daily / Weekly / Monthly ETF flows | Real, disclosed trading-activity proxy, `flowProxyCalculator.js`. |
| Sector ETF flows | Real, via `sectorEtfMap.js` + the same proxy calculator applied to the resolved sector ETF. |
| Thematic ETF flows | Real, disclosed thematic-ETF reference table (`etfClassificationReference.js`) + the same proxy calculator when the symbol is a recognized thematic ETF. |
| Passive vs Active flows | Real, disclosed classification table + real flow magnitude, `passiveActiveAnalyzer.js`. |
| Flow acceleration | Real, `flowAccelerationAnalyzer.js`. |
| Flow persistence | Real, `flowPersistenceAnalyzer.js`. |
| Fund concentration | **Honestly always unavailable** — no real holdings-weight data source exists in this environment. |
| Stock exposure through ETFs | **Honestly always unavailable** for a stock symbol (no real reverse-holdings lookup); honestly "not applicable" for a direct ETF symbol. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `etfFlowAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests.

## Integration with the Unified Stock Intelligence extension point

Extended from 5 agents to 6:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"etf-flow"`.
- `agentDirectionMapper.js`: new `toPolarity` case (`etfFlowBias` direct mapping) and `extractRisksAndOpportunities` case (this agent's own `risks`/`opportunities` fields pass straight through, since it already uses this shared vocabulary natively).
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `6: 54` entry.
- `aiExecutiveSummary.js` needed **no changes** — already generalizes dynamically from the report's own real `agentContributions`/`totalAgentCount` (established at `SENTIMENT-AGENT-001`).
- Verified live end-to-end against AAPL: `totalAgentCount: 6`, real multi-way conflicts correctly detected across insider/earnings/valuation/etf-flow, confidence correctly zeroed for a genuinely unresolved disagreement.

## Tests

**83 new unit tests, all passing:** `etfClassificationReference.test.js` (8), `stockSectorResolver.test.js` (4), `etfFlowDataProvider.test.js` (6), `flowProxyCalculator.test.js` (7), `flowAccelerationAnalyzer.test.js` (4), `flowPersistenceAnalyzer.test.js` (6), `flowStrengthAnalyzer.test.js` (4), `sectorRotationAnalyzer.test.js` (4), `passiveActiveAnalyzer.test.js` (4), `netFlowScoreAnalyzer.test.js` (5), `fundConcentrationAnalyzer.test.js` (1), `stockExposureAnalyzer.test.js` (2), `confidenceModel.test.js` (5), `risksOpportunitiesBuilder.test.js` (10), `aiSummary.test.js` (7), `etfFlowAgent.test.js` (5, including a forbidden-governance-key scan).

Plus **5 new** `etfFlowAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 3 existing Unified Stock Intelligence test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`) to reflect the 6-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1907 tests, 1905 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Every "flow" figure in this report is a disclosed trading-activity PROXY (real dollar volume + real price direction), never true creation/redemption unit data.** No licensed ETF flow vendor is connected in this environment — this is stated in every relevant module's own header comment and in the composed report's risk list.
2. **Fund concentration and stock-level ETF exposure are always honestly unavailable.** No real holdings-weight or reverse-holdings-by-constituent data source exists anywhere in this codebase; a real integration (e.g., a licensed feed, or parsing SSGA's public holdings CSVs as `spdrProvider.js`'s own comment notes as a possible future path) is out of scope for this phase.
3. **A stock symbol's ETF-flow read is always an indirect, one-hop sector proxy** (via its real Finnhub sector → the real corresponding sector ETF), not a claim about flows into any ETF that specifically holds that stock — disclosed both in the report's own risk list and in `confidenceModel.js`'s lower "indirect" confidence bonus.
4. **The thematic ETF and passive/active classification tables are small, hand-set, and not exhaustive** — a real but less-common ETF ticker will honestly report `UNKNOWN`/`null` rather than a guessed classification.
5. **All thresholds (flat-price 0.1%, acceleration 0.05 pts/day, persistence 60%/80%, rotation ±2%, magnitude $100M/$1B, strength 0.8x/1.5x, bias ±20) are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
6. **The market-reference ETF for Sector Rotation is fixed to SPY** — a real, disclosed, single broad-market benchmark, not a per-sector-tailored comparison.

## Files changed

- New: `backend/services/domainAgents/etfFlowAgent/{etfClassificationReference,stockSectorResolver,etfFlowDataProvider,flowProxyCalculator,flowAccelerationAnalyzer,flowPersistenceAnalyzer,flowStrengthAnalyzer,sectorRotationAnalyzer,passiveActiveAnalyzer,netFlowScoreAnalyzer,fundConcentrationAnalyzer,stockExposureAnalyzer,confidenceModel,risksOpportunitiesBuilder,aiSummary,etfFlowAgent}.js` + matching `.test.js` files, plus `etfFlowAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/etfFlowAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to a 6-agent evidence set).
- Unmodified: `backend/services/qualityPlatform/sectorEtfMap.js` (reused as-is), `backend/services/providers/definitions/spdrProvider.js` (a separate, still-inert provider-registry stub, not reused as-is), `backend/services/intelligence/priceHistoryProvider.js` (reused unmodified), `aiExecutiveSummary.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
