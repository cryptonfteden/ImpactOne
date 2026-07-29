# SHORT_INTEREST_AGENT.md — Phase SHORT-INTEREST-AGENT-001

**Mission:** build the Short Interest Intelligence Agent — analyzing short interest, days to cover, short interest trend, borrow utilization, borrow fee, shares on loan, short squeeze probability, covering activity, crowded short positioning, and historical short pressure, producing Short Interest Bias (Bullish/Neutral/Bearish), Short Interest Score, Squeeze Probability, Borrow Stress, Covering Activity, Crowdedness Score, Risks, Opportunities, Confidence (0-100), and an AI Summary. Provider abstraction, never fabricate short-interest data, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: upgrade in place — real FINRA daily short-volume data as a disclosed proxy

The `"short-interest"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub — its own comment stated flatly that no short-interest provider or service existed anywhere in this codebase. A dedicated research pass confirmed this is deliberate and repeated elsewhere: `marketPositioningService.js` and `opportunityScoreService.js` both explicitly list `shortInterest` as an `UNAVAILABLE_FACTOR` ("No provider in this codebase publishes short interest — a FINRA/exchange biweekly figure typically sourced from a specialized vendor — none is configured").

**The real, hard problem this phase solved:** the *official* short interest figure (total open short shares, reported to FINRA on a settlement date and published bi-monthly) requires a registered FINRA API or paid vendor — every free bi-monthly file URL pattern guessed during development returned a real `403`. Real securities-lending metrics (`borrow utilization`, `borrow fee`, `shares on loan`) are genuinely proprietary data from vendors like Ortex, S3 Partners, or IHS Markit — no free source exists for these anywhere.

What **is** real, free, and no-auth: FINRA's **daily Reg SHO short-volume file** (`https://cdn.finra.org/equity/regsho/daily/CNMSshvol{YYYYMMDD}.txt`), confirmed live during development — a real, already-aggregated, one-row-per-symbol-per-day pipe-delimited file reporting real daily short-sale volume vs. total volume. This is a genuine, disclosed **proxy** for short-selling pressure (not the official open-short-position figure), and this agent is built entirely on it — the same "real, honest proxy where the true metric requires a paid vendor" discipline `ETF-FLOW-AGENT-001` established.

## What was built

New directory: `backend/services/domainAgents/shortInterestAgent/`.

| File | Responsibility |
|---|---|
| `shortVolumeFileParser.js` | Pure parsing of FINRA's real daily short-volume file — exact date+symbol row matching (never a substring match that could confuse "A" with "AAPL"), real short-volume ratio computed as `shortVolume / totalVolume`. |
| `finraShortVolumeDataProvider.js` | **The provider abstraction.** Fetches FINRA's real daily files for a real recent window of weekdays (skipping real weekends; a real holiday or fetch failure honestly yields fewer real data points, never a fabricated stand-in). |
| `shortInterestTrendAnalyzer.js` | **Short interest trend / Historical short pressure** — compares the real average short-volume ratio across the first vs. second half of the real recent window. |
| `coveringActivityAnalyzer.js` | **Covering activity** — counts real day-over-day declines in the real short-volume ratio, a disclosed proxy for short covering. |
| `crowdednessAnalyzer.js` | **Crowded short positioning → Crowdedness Score** — scales the real most-recent short-volume ratio against a disclosed reference ceiling. |
| `squeezeProbabilityAnalyzer.js` | **Short squeeze probability** — a disclosed, hand-set weighted combination of the real crowdedness score (60%) and real recent price momentum (40%, via the existing, unmodified `priceHistoryProvider.js`) — the classic squeeze setup is real elevated short volume alongside a real price rise. |
| `borrowStressAnalyzer.js` | **Borrow utilization / Borrow fee / Shares on loan → Borrow Stress** — always honestly unavailable; no real securities-lending data source exists in this environment. |
| `shortInterestScoreAnalyzer.js` | **Short Interest Bias / Short Interest Score** — a disclosed interpretation (documented explicitly, not left implicit): real decreasing short-selling volume maps to BULLISH, real increasing volume maps to BEARISH — the conventional, direct reading. |
| `confidenceModel.js` | Overall **Confidence** — data availability, real sample size, whether a real trend could be computed, whether real price data was available, and a fixed, disclosed penalty for this agent's permanent borrow-stress scope limitation. |
| `risksOpportunitiesBuilder.js` | **Risks / Opportunities** — deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly not an LLM call. |
| `shortInterestAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T...",
  dataAvailable: true,
  unavailableReason: null,
  shortInterestBias: "BULLISH",          // BULLISH | NEUTRAL | BEARISH
  shortInterestScore: 29,                 // -100..100
  shortInterestTrend: { trend: "DECREASING", priorAvgRatio: 0.5088, recentAvgRatio: 0.4802, delta: -0.0286 },
  squeezeProbability: 88,                 // 0-100
  borrowStress: { dataAvailable: false, unavailableReason: "No real securities-lending data source...", utilizationPercent: null, borrowFeePercent: null, sharesOnLoan: null },
  coveringActivity: { classification: "MODERATE", decliningDayRatio: 0.5, decliningDays: 7, totalComparableDays: 14 },
  crowdednessScore: 84,
  risks: [ "No real securities-lending data source...", "Every metric here is derived from FINRA's real DAILY short-VOLUME data, a disclosed proxy — not the official bi-monthly short-interest figure..." ],
  opportunities: [ "Short interest bias is bullish (score 29)...", "Squeeze probability is elevated (88/100)...", "Crowdedness score is high (84/100)..." ],
  confidence: { confidence: 75, components: { base: 30, sampleBonus: 25, trendBonus: 15, priceDataBonus: 15, structuralPenalty: 10 } },
  aiSummary: "Short Interest Bias is BULLISH (score 29), based on a real decreasing short-volume trend. ...",
  inputs: { /* the full ShortVolumeMetrics this report was built from, for auditability */ },
}
```

Confirmed live against real AAPL FINRA data during development — a genuine ~2.9-percentage-point decline in average short-volume ratio over the recent window, high crowdedness (84/100), and an elevated squeeze probability (88/100) driven by real price strength alongside real elevated short volume.

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Short interest | **Real proxy** (daily short-VOLUME ratio), not the official bi-monthly figure — disclosed explicitly and repeatedly. |
| Days to cover | **Honestly unavailable** — requires the official open-short-shares figure and average daily volume from a registered source; out of scope. |
| Short interest trend / Historical short pressure | Real, `shortInterestTrendAnalyzer.js`. |
| Borrow utilization / Borrow fee / Shares on loan | **Always honestly unavailable** — `borrowStressAnalyzer.js`, no real securities-lending vendor connected. |
| Short squeeze probability | Real, disclosed formula, `squeezeProbabilityAnalyzer.js`. |
| Covering activity | Real, `coveringActivityAnalyzer.js`. |
| Crowded short positioning | Real, `crowdednessAnalyzer.js`. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `shortInterestAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests. `registry.test.js`'s stub-behavior test (previously targeting `"short-interest"`) was retargeted to `"macro"`, still a genuine stub.

## Integration with the Unified Stock Intelligence extension point

Extended from 7 agents to 8:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"short-interest"`.
- `agentDirectionMapper.js`: new `toPolarity` case (`shortInterestBias` direct mapping) and `extractRisksAndOpportunities` case (this agent's own `risks`/`opportunities` fields pass straight through, same as `etf-flow`/`institutional`).
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `8: 61` entry.
- `aiExecutiveSummary.js` needed **no changes** — already generalizes dynamically (established at `SENTIMENT-AGENT-001`).
- Verified live end-to-end against AAPL: `totalAgentCount: 8`, all 8 agents wired in correctly.

## Tests

**62 new unit tests, all passing:** `shortVolumeFileParser.test.js` (6), `finraShortVolumeDataProvider.test.js` (5, including a real weekday-only-request assertion and a real single-day-failure graceful-degradation case), `shortInterestTrendAnalyzer.test.js` (5), `coveringActivityAnalyzer.test.js` (4), `crowdednessAnalyzer.test.js` (5), `squeezeProbabilityAnalyzer.test.js` (6), `borrowStressAnalyzer.test.js` (1), `shortInterestScoreAnalyzer.test.js` (5), `confidenceModel.test.js` (5), `risksOpportunitiesBuilder.test.js` (9), `aiSummary.test.js` (6), `shortInterestAgent.test.js` (5, including a forbidden-governance-key scan).

Plus **5 new** `shortInterestAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 4 existing Unified Stock Intelligence/registry test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`, `registry.test.js`'s stub-behavior retarget) to reflect the 8-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2071 tests, 2068 passing, 3 failing**. Two of the three are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). The third — `earningsAgent.orchestratorIntegration.test.js`'s health-cache test — is a real-network-timing flake in a file this phase never touched either; it passed cleanly (5/5) when re-run in isolation immediately afterward, confirming it is not a regression introduced by this phase. Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Every "short interest" figure in this report is a disclosed PROXY (real daily short-sale volume ÷ real daily total volume), never the official bi-monthly settlement-date short-interest figure.** This distinction is stated in `shortVolumeFileParser.js`'s own header, and is always included as the final entry in the composed report's own `risks` list.
2. **"Days to cover" is out of scope this phase** — computing it honestly requires the official open-short-shares figure (unavailable) divided by average daily volume; without the numerator, no real days-to-cover figure can be computed, so this mission objective has no dedicated output field this phase (see the risks list's proxy disclosure instead).
3. **Borrow utilization, borrow fee, and shares on loan are always honestly unavailable.** These are real, proprietary securities-lending metrics from paid vendors (Ortex, S3 Partners, IHS Markit) — no free source exists anywhere, confirmed by a dedicated research pass before writing any code.
4. **The daily short-volume file is fetched for up to 30 real candidate weekdays to find 15 real trading days of data** — a real, bounded cap; market holidays and any real fetch failures are honestly skipped, never fabricated.
5. **The BULLISH/BEARISH interpretation of rising vs. falling short-selling volume is a disclosed, direct-reading choice** (not a contrarian one) — documented explicitly in `shortInterestScoreAnalyzer.js`'s own header, since the mission's "Short Interest Bias" field doesn't specify which convention to use.
6. **All thresholds and weights (trend ±2pp, covering 50%/70%, crowdedness reference ceiling 60%, squeeze weights 60%/40%, bias ±20, confidence component caps) are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.

## Files changed

- New: `backend/services/domainAgents/shortInterestAgent/{shortVolumeFileParser,finraShortVolumeDataProvider,shortInterestTrendAnalyzer,coveringActivityAnalyzer,crowdednessAnalyzer,squeezeProbabilityAnalyzer,borrowStressAnalyzer,shortInterestScoreAnalyzer,confidenceModel,risksOpportunitiesBuilder,aiSummary,shortInterestAgent}.js` + matching `.test.js` files, plus `shortInterestAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/shortInterestAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/agentOrchestrator/registry.test.js` (stub-behavior test retargeted from `"short-interest"` to `"macro"`, still a genuine stub).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to an 8-agent evidence set).
- Unmodified: `backend/services/intelligence/priceHistoryProvider.js` (reused unmodified for real squeeze-probability price momentum), `backend/services/marketPositioningService.js`/`backend/services/opportunityScoreService.js` (both still honestly list short interest as unavailable for their own purposes — not touched, since fixing this agent doesn't retroactively wire those unrelated services), `aiExecutiveSummary.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
