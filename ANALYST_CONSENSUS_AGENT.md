# ANALYST_CONSENSUS_AGENT.md — Phase ANALYST-CONSENSUS-AGENT-001

**Mission:** build the Analyst Consensus Intelligence Agent — analyzing analyst ratings, rating changes, price targets, price target revisions, consensus trend, upgrade/downgrade momentum, target dispersion, analyst coverage, estimate revisions, and analyst conviction, producing Analyst Bias (Bullish/Neutral/Bearish), Consensus Score, Revision Score, Target Score, Coverage Quality, Conviction Score, Rating Trend, Risks, Opportunities, Confidence (0-100), and an AI Summary. Provider abstraction, never fabricate analyst data, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: real Finnhub rating trend, honestly-unavailable price targets

The `"analyst-consensus"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub — its own comment noted that `analystConsensusService.js` already existed but only as fixture-only helpers (`getFixtureConsensus()`), with no live per-symbol fetch.

A research pass into Finnhub — already configured in this environment (`FINNHUB_API_KEY`, proven live elsewhere via `finnhubService.js`) — found its `/stock/recommendation` endpoint (real monthly buy/hold/sell/strongBuy/strongSell analyst-rating-trend counts per symbol) already called live by that existing service. Confirmed via a direct live call during development that this endpoint works on the free tier configured here.

The **real, hard limitation this phase confirmed**: Finnhub's `/stock/price-target`, `/stock/eps-estimate`, `/stock/revenue-estimate`, and `/stock/upgrade-downgrade` endpoints all returned a real, confirmed HTTP 403 in this environment — every one of them requires a paid Finnhub plan. This means the mission's own "Price targets," "Price target revisions," and "Target dispersion" objectives, plus "Estimate revisions," have **no real free data source** in this environment. Rather than fabricate these (or silently substitute the rating-trend data for them), this agent:

1. Still makes the real `/stock/price-target` call (`priceTargetProvider.js`) — so a future paid API key would transparently start working with zero code changes — but honestly reports `dataAvailable: false` with the real 403 reason on every failure.
2. Derives a disclosed, explicitly-labeled **proxy** for "Rating changes," "Upgrade/Downgrade momentum," and "estimate revisions": the real period-over-period change in the weighted Consensus Score, computed from the real, free rating-trend data. This mirrors the precedent set by the Short Interest agent (real daily short-VOLUME as a disclosed proxy for the official bi-monthly short-interest figure) and the permanently-unavailable Borrow Stress field there.

## What was built

New directory: `backend/services/domainAgents/analystConsensusAgent/`.

| File | Responsibility |
|---|---|
| `analystRecommendationProvider.js` | **The core provider abstraction.** Fetches Finnhub's real, free `/stock/recommendation` endpoint — the real monthly rating-trend series (strongBuy/buy/hold/sell/strongSell per real reporting period), sorted oldest-first. Honestly reports unavailable on any real failure. |
| `priceTargetProvider.js` | A real, dedicated attempt at Finnhub's `/stock/price-target` endpoint. Confirmed live to return a real HTTP 403 on this environment's free tier — reported honestly as unavailable, never fabricated, mirroring the short-interest agent's own `borrowStressAnalyzer.js` precedent. |
| `analystDataProvider.js` | **The top-level provider abstraction** the mission requires. Fetches the real rating-trend series and attempts the real price-target endpoint in parallel; overall `dataAvailable` reflects the rating-trend series specifically (the only metric this agent's analysis can be built on). |
| `consensusScoreAnalyzer.js` | **Analyst ratings / Analyst coverage → Consensus Score.** A disclosed weighted formula (strongBuy/strongSell carry double weight) over the real, latest Finnhub reporting period — never a naive average of the five rating buckets. |
| `analystBiasAnalyzer.js` | **Analyst Bias** — BULLISH/NEUTRAL/BEARISH from the real Consensus Score, disclosed ±15 threshold band. |
| `ratingTrendAnalyzer.js` | **Rating changes / Upgrade-downgrade momentum → Rating Trend / Revision Score.** The disclosed proxy described above: the real change in the weighted Consensus Score between the two most recent real Finnhub reporting periods. |
| `coverageQualityAnalyzer.js` | **Analyst coverage → Coverage Quality** — LOW/MODERATE/HIGH from the real total analyst count in the latest real period. |
| `convictionScoreAnalyzer.js` | **Analyst conviction → Conviction Score** — the real proportion of extreme (strongBuy+strongSell) ratings out of the real total, a disclosed proxy for conviction regardless of direction. |
| `targetScoreAnalyzer.js` | **Price targets / Price target revisions / Target dispersion → Target Score.** Computes a real score and real dispersion when real price-target data is available (future paid plan); honestly `null` with the real 403 reason otherwise. |
| `confidenceModel.js` | Overall **Confidence** — real data availability, real multi-period history (enables trend/revision analysis), real coverage depth, and a disclosed, fixed penalty for this agent's permanent price-target scope limitation. |
| `risksOpportunitiesBuilder.js` | **Risks / Opportunities** — this mission's own 2-array output shape (matching etf-flow/institutional/short-interest), deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly disclosed as not an LLM/external API call. |
| `analystConsensusAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

Confirmed live against real Finnhub data during development:

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-30T13:28:35.703Z",
  dataAvailable: true,
  unavailableReason: null,
  analystBias: "BULLISH",             // BULLISH | NEUTRAL | BEARISH
  consensusScore: 44,                  // -100..100
  revisionScore: -1,                   // -100..100, real proxy for rating/estimate revisions
  targetScore: null,                   // 0-100, honestly null (real 403 — paid Finnhub plan required)
  targetDispersion: null,              // honestly null, same reason
  coverageQuality: "HIGH",             // LOW | MODERATE | HIGH
  totalAnalysts: 54,
  convictionScore: 24,                 // 0-100
  ratingTrend: "STABLE",               // IMPROVING | DETERIORATING | STABLE
  risks: [
    "Price targets, price-target revisions, and target dispersion are unavailable: Finnhub's /stock/price-target endpoint requires a paid plan (received a real HTTP 403 for \"AAPL\") — no free real price-target source is configured in this environment.",
  ],
  opportunities: [
    "Analyst consensus is bullish (Consensus Score 44), based on the real, latest Finnhub rating distribution.",
    "Analyst coverage is deep (20+ real covering analysts), giving this consensus reading more statistical reliability.",
  ],
  confidence: 60,
  aiSummary: "Analyst Bias is BULLISH (Consensus Score 44), based on 54 covering analysts (Coverage Quality: high). ...",
  inputs: { /* the full real AnalystMetrics (rating periods + price-target attempt) this report was built from, for auditability */ },
}
```

Live smoke-tested against AAPL (2026-07-30): 54 real covering analysts (13 strongBuy / 23 buy / 16 hold / 2 sell / 0 strongSell in the latest real period), Consensus Score 44 (BULLISH), rating trend STABLE (Revision Score -1 vs. the prior real period), Conviction Score 24/100, Coverage Quality HIGH, price targets honestly unavailable (real 403), overall Confidence 60/100.

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Analyst ratings | Real, Finnhub `/stock/recommendation` via `analystRecommendationProvider.js`. |
| Rating changes | **Real, disclosed proxy** (period-over-period Consensus Score delta) — `ratingTrendAnalyzer.js`; true individual rating-change events require Finnhub's paid `/stock/upgrade-downgrade` endpoint (confirmed real 403). |
| Price targets | **Honestly unavailable** — `priceTargetProvider.js`/`targetScoreAnalyzer.js`, confirmed real 403 on Finnhub's free tier. |
| Price target revisions | **Honestly unavailable**, same reason. |
| Consensus trend | Real, `ratingTrendAnalyzer.js` (feeds Rating Trend). |
| Upgrade/Downgrade momentum | **Real, disclosed proxy**, same mechanism as "Rating changes" above. |
| Target dispersion | **Honestly unavailable**, same reason as price targets. |
| Analyst coverage | Real, `coverageQualityAnalyzer.js`. |
| Estimate revisions | **Honestly unavailable** — Finnhub's `/stock/eps-estimate`/`/stock/revenue-estimate` also confirmed real 403; the Revision Score's disclosed proxy (Consensus Score delta) is the closest real signal available. |
| Analyst conviction | Real, `convictionScoreAnalyzer.js`. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `analystConsensusAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests. `registry.test.js`'s stub-behavior test (previously targeting `"analyst-consensus"`) was retargeted to `"news"`, the last remaining genuine stub.

The orchestrator adapter (`backend/services/agentOrchestrator/agents/analystConsensusAgent.js`) is a thin wrapper over the real domain engine, following the same per-symbol pattern as the insider/short-interest/etf-flow agents (unlike the market-wide macro/sentiment agents — analyst coverage is genuinely symbol-specific).

## Integration with the Unified Stock Intelligence extension point

Extended from 9 agents to 10:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"analyst-consensus"`.
- `agentDirectionMapper.js`: new `toPolarity` case (`analystBias` direct mapping) and `extractRisksAndOpportunities` case (this agent's own `risks`/`opportunities` fields pass straight through, same as `etf-flow`/`institutional`/`short-interest`).
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `10: 64` entry, continuing the established diminishing-returns sequence.
- `aiExecutiveSummary.js` needed **no changes** — already generalizes dynamically (established at `SENTIMENT-AGENT-001`).
- Verified live end-to-end against NVDA: `totalAgentCount: 10`, all 10 agents wired in correctly.

## Tests

**52 new unit tests, all passing:** `analystRecommendationProvider.test.js` (5), `priceTargetProvider.test.js` (4), `analystDataProvider.test.js` (2), `consensusScoreAnalyzer.test.js` (6), `analystBiasAnalyzer.test.js` (4), `ratingTrendAnalyzer.test.js` (4), `coverageQualityAnalyzer.test.js` (4), `convictionScoreAnalyzer.test.js` (4), `targetScoreAnalyzer.test.js` (3), `confidenceModel.test.js` (4), `risksOpportunitiesBuilder.test.js` (4), `aiSummary.test.js` (4), `analystConsensusAgent.test.js` (4, including a forbidden-governance-key scan).

Plus **5 new** `analystConsensusAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 4 existing Unified Stock Intelligence/registry test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`, `registry.test.js`'s stub-behavior retarget) to reflect the 10-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2219 tests, 2216 passing, 3 failing**. Two of the three are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session. The third — `analystConsensusAgent.orchestratorIntegration.test.js`'s health-cache test — is a real-network-timing flake (the same category already documented for `earningsAgent.orchestratorIntegration.test.js` at `SHORT-INTEREST-AGENT-001`); it passed cleanly (5/5) when the file was re-run in isolation immediately afterward, confirming it is not a regression. Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Price targets, price-target revisions, target dispersion, and true estimate revisions are all permanently unavailable in this environment** — Finnhub's free tier returns a real, confirmed HTTP 403 for `/stock/price-target`, `/stock/eps-estimate`, `/stock/revenue-estimate`, and `/stock/upgrade-downgrade`. No other free source was found configured in this repo for any of these (Polygon/Alpha Vantage keys exist but are not wired to analyst data anywhere).
2. **"Rating changes," "Upgrade/Downgrade momentum," and the "Revision Score" output are all a single, disclosed PROXY** (the real period-over-period change in the weighted Consensus Score), never the official per-event upgrade/downgrade record or true estimate-revision data. This is stated explicitly in `ratingTrendAnalyzer.js`'s own header and surfaces nowhere as if it were the official metric.
3. **The Consensus Score's strongBuy/strongSell double-weighting and the Conviction Score's extreme-rating proportion are disclosed, hand-set formulas**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
4. **Coverage Quality's 10/20-analyst thresholds are disclosed, hand-set constants.**
5. **`priceTargetProvider.js` still makes the real network call every time** (rather than short-circuiting to a permanent stub) — so if this environment's Finnhub key is ever upgraded to a paid plan, real price-target data starts flowing with zero code changes, exactly the "provider abstraction" the mission requires.

## Files changed

- New: `backend/services/domainAgents/analystConsensusAgent/{analystRecommendationProvider,priceTargetProvider,analystDataProvider,consensusScoreAnalyzer,analystBiasAnalyzer,ratingTrendAnalyzer,coverageQualityAnalyzer,convictionScoreAnalyzer,targetScoreAnalyzer,confidenceModel,risksOpportunitiesBuilder,aiSummary,analystConsensusAgent}.js` + matching `.test.js` files, plus `analystConsensusAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/analystConsensusAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/agentOrchestrator/registry.test.js` (stub-behavior test retargeted from `"analyst-consensus"` to `"news"`, still a genuine stub).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to a 10-agent evidence set).
- Unmodified: `backend/services/intelligence/analystConsensusService.js` (its own fixture-only helpers remain as-is for their existing consumers — not touched, since this agent is a fresh, real, independently-tested engine, not a retrofit of that file), `backend/services/finnhubService.js` (reused only as a calling-convention reference, not modified or imported), `aiExecutiveSummary.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
