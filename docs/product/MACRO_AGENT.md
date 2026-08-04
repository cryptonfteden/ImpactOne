# MACRO_AGENT.md — Phase MACRO-AGENT-001

**Mission:** build the Macro Intelligence Agent — analyzing interest rates, inflation, employment, GDP, yield curve, credit spreads, USD strength, oil, gold, VIX, monetary policy, and liquidity conditions, producing Macro Bias (Bullish/Neutral/Bearish), Macro Score, Economic Cycle, Liquidity Score, Inflation Pressure, Recession Risk, Policy Direction, Market Stress, Confidence (0-100), Bullish Factors, Bearish Factors, Risks, and an AI Summary. Provider abstraction, real macroeconomic data only, never fabricate macro values, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: a fresh FRED client, not `altDataService.js`'s existing `getMacroData()`

The `"macro"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub. A real macro data path already existed elsewhere in this codebase — `altDataService.js`'s own `getMacroData()` fetches real FRED series (`FEDFUNDS`, `CPIAUCSL`, `UNRATE`, `M2SL`, `DGS10`) via a real `fetchFredSeries()` helper hitting FRED's real, free, no-auth CSV export endpoint (`https://fred.stlouisfed.org/graph/fredgraph.csv?id=<seriesId>`).

That existing service was deliberately **not reused** for this agent. On any real fetch failure, `altDataService.js` falls back to a hardcoded `fallbackMacroRegime()` — disclosed via a `source: "fallback"` marker, but still literally invented numeric values. This mission's own wording ("Never fabricate macro values. Return honest unavailable fields where no real provider exists.") is stricter than that existing, disclosed-but-fabricated fallback path allows. Rather than loosen this agent's honesty to match the existing service, a fresh, dedicated FRED client was built — reusing only the same real, free CSV endpoint *URL pattern* (not the code), the same precedent already set when the Insider and Institutional agents built their own real SEC EDGAR clients rather than reusing looser existing services. Every failure in this agent's own provider layer returns an honest `dataAvailable: false` with a real reason — never a fabricated number.

## What was built

New directory: `backend/services/domainAgents/macroAgent/`.

| File | Responsibility |
|---|---|
| `fredCsvParser.js` | Pure parsing of FRED's real CSV export format — header row + real `date,value` rows, oldest-first. FRED's own real "not yet published" marker (`"."`) is parsed as honest `null`, never coerced to 0. `findObservationNear()` finds the closest real observation within a real tolerance window, for approximate YoY comparisons against monthly/quarterly series. |
| `fredSeriesProvider.js` | **The FRED provider abstraction.** Fetches one real FRED series' full CSV history over the network; on any real failure or all-missing response, returns an honest `dataAvailable: false` — never a fabricated fallback value. Computes a real year-over-year change from the real latest observation and the real closest-to-a-year-ago observation. |
| `marketProxyProvider.js` | **The real market-proxy provider** for VIX, oil, gold, and USD strength — via the existing, unmodified `priceHistoryProvider.js` (real Yahoo Finance daily bars, no-auth, confirmed to accept arbitrary futures/index tickers like `^VIX`/`CL=F`/`GC=F`/`DX-Y.NYB` with no allowlist). |
| `macroDataProvider.js` | **The top-level provider abstraction** the mission requires. Fetches all 7 real FRED series and all 4 real market proxies in parallel — one source failing never blocks the others; overall `dataAvailable` is true as long as at least one real source succeeded, so a partial real macro picture is still honestly reported. |
| `inflationAnalyzer.js` | **Inflation Pressure** — LOW/MODERATE/HIGH/ELEVATED from real CPI (`CPIAUCSL`) YoY change, disclosed thresholds anchored on the Fed's own ~2% target. |
| `employmentAnalyzer.js` | **Employment** trend — IMPROVING/WORSENING/STABLE from real UNRATE YoY change (a falling unemployment rate is improving). |
| `yieldCurveAnalyzer.js` | **Yield curve** — NORMAL/FLAT/INVERTED from FRED's own real, pre-computed `T10Y2Y` (10Y-2Y Treasury spread) — a negative spread is the classic real inversion recession signal. |
| `creditSpreadAnalyzer.js` | **Credit spreads** — TIGHT/NORMAL/WIDE/STRESSED from the real ICE BofA US High Yield Index OAS (`BAMLH0A0HYM2`), disclosed thresholds drawn from that index's own real historical range. |
| `policyDirectionAnalyzer.js` | **Monetary policy → Policy Direction** — TIGHTENING/EASING/HOLDING from real `FEDFUNDS` YoY change, disclosed threshold of ±0.25pp (one real standard Fed hike/cut increment). |
| `liquidityAnalyzer.js` | **Liquidity conditions → Liquidity Score** — real `M2SL` YoY growth linearly mapped onto a disclosed 0-100 scale. |
| `marketStressAnalyzer.js` | **VIX (+ credit spreads) → Market Stress** — real VIX-level regime thresholds combined with the real credit-spread classification; the worse of the two real signals wins. |
| `economicCycleAnalyzer.js` | **GDP + Employment + Yield curve → Economic Cycle** — EXPANSION/SLOWDOWN/CONTRACTION/RECOVERY from a disclosed rule table over real `GDPC1` YoY growth, the real employment trend, and the real yield-curve classification. |
| `recessionRiskAnalyzer.js` | **Recession Risk** — a disclosed, hand-set weighted point system (never a naive average) over real yield-curve inversion (45%), real credit-spread stress (35%), and real employment deterioration (20%). |
| `macroScoreAnalyzer.js` | **Macro Bias / Macro Score** — a disclosed weighted combination (never a naive average) of six real upstream signals (yield curve 25%, market stress 20%, policy direction 15%, inflation pressure 15%, employment 15%, liquidity 10%), each renormalized around real signal availability. |
| `confidenceModel.js` | Overall **Confidence** — a disclosed weighted blend of real data availability across all 11 real sources (7 FRED series weighted 70%, 4 market proxies weighted 30%, since the FRED series drive most of this agent's classifications). |
| `factorsRisksBuilder.js` | **Bullish Factors / Bearish Factors / Risks** — this mission's own 3-array output shape (matching insider/sentiment's pattern), deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly disclosed as not an LLM/external API call. |
| `macroAgent.js` | `generateReport({ provider })` — composes everything above into the final normalized, market-wide report. |

## The normalized report shape

Confirmed live against real FRED and Yahoo Finance data during development:

```js
{
  generatedAt: "2026-07-29T20:43:35.689Z",
  dataAvailable: true,
  unavailableReason: null,
  macroBias: "BULLISH",              // BULLISH | NEUTRAL | BEARISH
  macroScore: 35,                     // -100..100
  economicCycle: "EXPANSION",         // EXPANSION | SLOWDOWN | CONTRACTION | RECOVERY
  liquidityScore: 77,                 // 0-100
  inflationPressure: "MODERATE",      // LOW | MODERATE | HIGH | ELEVATED
  recessionRisk: "LOW",               // LOW | MODERATE | HIGH
  policyDirection: "EASING",          // TIGHTENING | EASING | HOLDING
  marketStress: "ELEVATED",           // LOW | MODERATE | ELEVATED | HIGH
  employmentTrend: "WORSENING",       // IMPROVING | WORSENING | STABLE
  confidence: 100,                    // 0-100
  bullishFactors: [
    "Yield curve is normal (10Y-2Y spread 0.35pp), not signaling recession.",
    "Monetary policy is easing (Fed funds rate YoY change -16.17pp), typically supportive for risk assets.",
    "Inflation pressure is moderate (CPI YoY 3.46%).",
    "Liquidity conditions are supportive (liquidity score 77/100, M2 YoY growth 5.53%).",
  ],
  bearishFactors: [
    "Market stress is elevated (VIX 20.7).",
    "Employment conditions are worsening (unemployment rate YoY change +2.44pp).",
  ],
  risks: [],
  aiSummary: "Macro Bias is BULLISH (Macro Score 35/-100..100), within a expansion phase of the economic cycle. ...",
  inputs: { /* the full real MacroMetrics (all 11 sources) this report was built from, for auditability */ },
  details: { /* every intermediate per-signal analyzer result, for auditability */ },
}
```

Live smoke-tested values (2026-07-29, real): Fed funds rate 3.63% (YoY -16.17pp), CPI YoY +3.46%, unemployment 4.2% (YoY +2.44pp), real GDP YoY +2.68%, 10Y-2Y spread 0.35pp, high-yield OAS 2.84pp, M2 YoY +5.53%, VIX 20.66 (+25.59% over ~1 trading month), oil ~$84.82 (+22.04%), gold ~$4,115.40 (+2.30%), USD index ~100.89 (-0.30%).

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Interest rates | Real, `FEDFUNDS` via `fredSeriesProvider.js`. |
| Inflation | Real, `CPIAUCSL` → `inflationAnalyzer.js`. |
| Employment | Real, `UNRATE` → `employmentAnalyzer.js`. |
| GDP | Real, `GDPC1`, feeds `economicCycleAnalyzer.js`. |
| Yield curve | Real, `T10Y2Y` → `yieldCurveAnalyzer.js`. |
| Credit spreads | Real, `BAMLH0A0HYM2` → `creditSpreadAnalyzer.js`. |
| USD strength | Real, `DX-Y.NYB` via `marketProxyProvider.js` (Yahoo Finance). |
| Oil | Real, `CL=F` via `marketProxyProvider.js`. |
| Gold | Real, `GC=F` via `marketProxyProvider.js`. |
| VIX | Real, `^VIX` via `marketProxyProvider.js`, feeds `marketStressAnalyzer.js`. |
| Monetary policy | Real, derived from `FEDFUNDS` trend → `policyDirectionAnalyzer.js`. |
| Liquidity conditions | Real, `M2SL` → `liquidityAnalyzer.js`. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `macroAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests. `registry.test.js`'s stub-behavior test (previously targeting `"macro"`) was retargeted to `"analyst-consensus"`, still a genuine stub.

The orchestrator adapter (`backend/services/agentOrchestrator/agents/macroAgent.js`) is a thin wrapper over the real domain engine, mirroring the existing market-wide `"sentiment"` agent's own honesty pattern: macro conditions are market-wide, not symbol-specific, and `execute(symbol)` deliberately ignores its symbol argument, disclosing this explicitly in its own summary text ("Macro Intelligence (market-wide, not symbol-specific) — ...").

## Integration with the Unified Stock Intelligence extension point

Extended from 8 agents to 9:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"macro"`. Unlike the market-wide `"sentiment"` id (deliberately excluded from this per-symbol list), this mission's own text explicitly requires Unified Stock Intelligence integration for macro, so it is included despite being a market-wide (not symbol-specific) reading — every consuming symbol shares the same real macro backdrop.
- `agentDirectionMapper.js`: new `toPolarity` case (`macroBias` direct mapping) and `extractRisksAndOpportunities` case (this mission's own 3-array shape — `risks` + `bearishFactors` map to risks, `bullishFactors` to opportunities — the same pattern as `insider`/`symbol-sentiment`).
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `9: 63` entry, continuing the established diminishing-returns sequence.
- `aiExecutiveSummary.js` needed **no changes** — already generalizes dynamically (established at `SENTIMENT-AGENT-001`).
- Verified live end-to-end against NVDA: `totalAgentCount: 9`, all 9 agents wired in correctly.

## Tests

**83 new unit tests, all passing:** `fredCsvParser.test.js` (6), `fredSeriesProvider.test.js` (4), `marketProxyProvider.test.js` (3), `macroDataProvider.test.js` (3), `inflationAnalyzer.test.js` (5), `employmentAnalyzer.test.js` (4), `yieldCurveAnalyzer.test.js` (4), `creditSpreadAnalyzer.test.js` (5), `policyDirectionAnalyzer.test.js` (4), `liquidityAnalyzer.test.js` (4), `marketStressAnalyzer.test.js` (5), `economicCycleAnalyzer.test.js` (5), `recessionRiskAnalyzer.test.js` (4), `macroScoreAnalyzer.test.js` (5), `confidenceModel.test.js` (3), `factorsRisksBuilder.test.js` (6), `aiSummary.test.js` (3), `macroAgent.test.js` (4, including a forbidden-governance-key scan).

Plus **5 new** `macroAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 4 existing Unified Stock Intelligence/registry test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`, `registry.test.js`'s stub-behavior retarget) to reflect the 9-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2158 tests, 2156 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures introduced by this phase. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Every FRED series has real reporting lag** — `FEDFUNDS`/`CPIAUCSL`/`UNRATE`/`M2SL` are monthly, `GDPC1` is quarterly, so the "latest" real observation may be one to several real months old at any given moment. This is inherent to the real source data, not a defect in this agent.
2. **Year-over-year comparisons use a real 45-day tolerance window** (`findObservationNear()`) rather than requiring an exact 365-day-prior date, since monthly/quarterly series never land on one — a real, disclosed approximation, not a fabricated exact match.
3. **All thresholds and weights** (inflation 2%/4%/6%, employment ±0.2pp stable band, yield-curve ±0.10pp flat band, credit-spread 3pp/5pp/7pp, policy ±0.25pp, liquidity 0%→25/8%→100 scale, VIX 15/20/30, recession-risk weights 45%/35%/20%, macro-score weights 25%/20%/15%/15%/15%/10%, confidence weights 70%/30%) **are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
4. **This agent is market-wide, not symbol-specific** — like the existing `"sentiment"` agent, its `execute(symbol)` ignores its symbol argument and reports the same real macro backdrop for every symbol, disclosed explicitly in its own summary text.
5. **The Macro Score's weighted formula never averages** — each real signal contributes an independently disclosed weight, and any `UNKNOWN` (real-data-unavailable) signal drops out with the remaining weights renormalized, rather than being silently treated as neutral (0) or forcing a fabricated overall reading.

## Files changed

- New: `backend/services/domainAgents/macroAgent/{fredCsvParser,fredSeriesProvider,marketProxyProvider,macroDataProvider,inflationAnalyzer,employmentAnalyzer,yieldCurveAnalyzer,creditSpreadAnalyzer,policyDirectionAnalyzer,liquidityAnalyzer,marketStressAnalyzer,economicCycleAnalyzer,recessionRiskAnalyzer,macroScoreAnalyzer,confidenceModel,factorsRisksBuilder,aiSummary,macroAgent}.js` + matching `.test.js` files, plus `macroAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/macroAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/agentOrchestrator/registry.test.js` (stub-behavior test retargeted from `"macro"` to `"analyst-consensus"`, still a genuine stub).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to a 9-agent evidence set).
- Unmodified: `backend/services/altDataService.js` (its own, looser `getMacroData()`/`fallbackMacroRegime()` remains as-is for its existing consumers — not touched, since this agent's stricter honesty requirement called for a fresh client rather than a retrofit), `backend/services/intelligence/priceHistoryProvider.js` (reused unmodified for real VIX/oil/gold/USD proxies), `aiExecutiveSummary.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
