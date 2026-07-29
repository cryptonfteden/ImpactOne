# FIBONACCI_AGENT.md — Phase FIBONACCI-AGENT-001

**Mission:** build the Fibonacci Intelligence Agent — analyzing automatic swing detection, Fibonacci Retracement, Fibonacci Extension, Confluence Zones, multiple timeframe agreement, price reaction history, dynamic support/resistance, and trend context, producing Trend Context, Primary Swing, Retracement Levels, Extension Targets, Confluence Score, High Probability Zones, Entry Zone, Risk Zone, Confidence (0-100), and an AI Summary. Provider abstraction, Registry/Scheduler/Observability/Orchestrator integration, no UI, comprehensive tests.

---

## Design decision: upgrade, not duplicate (same precedent as OPTIONS/EARNINGS/VALUATION)

The `"fibonacci"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub — Fibonacci retracement existed only as an internal, non-exported helper (`analyzeFibonacci`) inside `technicalIntelligenceService.js`, so the original registration deliberately stayed a stub rather than reach into another agent's internals. This phase upgrades it in place — same id, same registry slot, `metadata.name` updated to `"Fibonacci Intelligence Agent"`. Confirmed zero regression via the full pre-existing `registry.test.js` suite (which explicitly asserts the 13 named future-agent domains, `"fibonacci"` among them, still resolve to exactly one registration each).

As with `TECHNICAL-AGENT-001`, the already-real, already-tested `technicalIntelligenceService.js`/`priceHistoryProvider.js` are reused, not modified — this agent's swing/confluence/zone logic is new, additive composition built on top of them.

## What was built

`technicalIndicators.js` was additively extended with one new pure function this mission needed that didn't already exist: `fibonacciExtension(swingLow, swingHigh, direction)` — continuation targets beyond a swing (a disclosed convention: each target is the swing's end point plus `ratio * range` projected further in the swing's own direction). The existing `fibonacciRetracement(high, low)` was reused as-is.

New directory: `backend/services/domainAgents/fibonacciAgent/`.

| File | Responsibility |
|---|---|
| `weeklyBarAggregator.js` | Real ISO-week aggregation of real daily bars into weekly bars — the second timeframe "multiple timeframe agreement" needs. Pure, no separate network fetch. |
| `fibonacciDataProvider.js` | **The provider abstraction.** `getSymbolFibonacciData(symbol) -> FibonacciMetrics`. Fetches real daily bars once, aggregates them into real weekly bars, and runs the existing `technicalIntelligenceService.analyzeBars()` on each timeframe for a real trend signal. Honestly returns `dataAvailable: false` with a real reason when fewer than 20 real daily bars exist. |
| `swingDetector.js` | **Automatic swing detection** — deliberately simple and transparent (same discipline as `technicalIndicators.detectSupportResistance`'s own "honest first version" comment): finds the real highest high and real lowest low over a lookback window, then determines direction from which occurred first chronologically (low-before-high = up-swing, high-before-low = down-swing). Returns `null` when no distinct swing exists. |
| `retracementCalculator.js` | **Retracement Levels** — calls the existing `fibonacciRetracement(high, low)` directly on the real detected swing, labeling levels `support` (UP swing, pullback looking for support) or `resistance` (DOWN swing). |
| `extensionCalculator.js` | **Extension Targets** — calls the new `fibonacciExtension()` directly on the real detected swing, direction-aware. |
| `dynamicSupportResistanceAnalyzer.js` | **Dynamic support/resistance** — the existing `detectSupportResistance()`'s real range extremes and recent pivot highs/lows, recomputed fresh each call (unlike the static Fibonacci levels), fed into confluence as an independent real source. |
| `priceReactionHistory.js` | **Price reaction history** — for each real candidate level, honestly counts real historical touches (within a real tolerance band) and whether price subsequently stayed on the same side (`respected`) or crossed through (`broken`) — computed entirely from real bars; `reactionStrength` is `null` (never 0) for a level that was never tested. |
| `multiTimeframeAnalyzer.js` | **Multiple timeframe agreement** — compares the real daily swing/trend direction against the real weekly one; reports `AGREE`/`CONFLICT`/`SINGLE_TIMEFRAME_ONLY`/`UNKNOWN`, honestly disclosing when the weekly timeframe couldn't be computed rather than fabricating a second opinion. |
| `confluenceZoneAnalyzer.js` | **Confluence Zones / Confluence Score / High Probability Zones** — clusters real levels from every independent real source (retracement, extension, dynamic pivots) that land within a real price tolerance of each other; `confluenceScore` is the count of distinct real sources agreeing in a zone — never a fabricated probability. |
| `entryRiskZoneAnalyzer.js` | **Entry Zone / Risk Zone** — the nearest real confluence zone on the trend-consistent side of the real current price (Entry) and the next real zone further out (Risk); prefers real multi-source high-probability zones over single-source ones, honestly falling back when none exist. |
| `trendContextAnalyzer.js` | **Trend Context** — maps the existing real daily trend signal onto BULLISH/NEUTRAL/BEARISH (the same mapping `TECHNICAL-AGENT-001`'s own `trendAnalyzer.js` uses), the frame every retracement/extension/zone read below is interpreted against. |
| `confidenceModel.js` | Overall **Confidence** (0-100) — a disclosed, hand-set weighted formula (never a naive average): data completeness (30 pts), the real entry zone's confluence score (up to 30 pts), real multi-timeframe agreement (+20 AGREE / -15 CONFLICT), and real average historical price-reaction strength of the levels feeding the entry zone (up to 20 pts). |
| `aiSummary.js` | **AI Summary** — a deterministic, template-based 2-4 sentence composition of the report's own real fields. Explicitly **not** an LLM/external API call, disclosed in the file header, consistent with every other domain agent this session. |
| `fibonacciAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report, retaining `inputs: metrics` for auditability. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T12:02:08.390Z",
  dataAvailable: true,
  unavailableReason: null,
  trendContext: "BULLISH",             // BULLISH | NEUTRAL | BEARISH
  primarySwing: {
    direction: "UP",                   // UP | DOWN
    swingLow: 245.51, swingHigh: 339.57,
    swingLowDate: "2026-03-30", swingHighDate: "2026-07-27",
  },
  retracementLevels: [ { ratio: 0.236, price: 317.37, role: "support" }, ... ],
  extensionTargets: [ { ratio: 0.618, price: 397.70 }, ... ],
  confluenceZones: [ { centerPrice: 318.04, low: 317.37, high: 319.35, confluenceScore: 3, sources: [...] }, ... ],
  highProbabilityZones: [ /* confluenceScore >= 2, sorted by score descending */ ],
  entryZone: { centerPrice: 318.04, confluenceScore: 3, sources: [...] },
  riskZone: { centerPrice: 311.91, confluenceScore: 1, sources: [...] },
  timeframeAgreement: "AGREE",         // AGREE | CONFLICT | SINGLE_TIMEFRAME_ONLY | UNKNOWN
  confidence: { confidence: 78, components: { base: 30, confluenceBonus: 18, agreementDelta: 20, reactionBonus: 10 } },
  aiSummary: "Trend context is bullish, and the primary swing detected is an up-swing from 245.51 to 339.57. The strongest confluence zone sits near 318.04 (3 independent sources agree: ...). Entry zone near 318.04, risk zone near 311.91. Overall confidence in this read is 78/100.",
  inputs: { /* the full FibonacciMetrics this report was built from, for auditability */ },
}
```

Every field the mission's "Output" section named is present. (Confirmed live against AAPL during development.)

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Automatic swing detection | Real, `swingDetector.js` — highest-high/lowest-low over a lookback window, direction from chronological order. |
| Fibonacci Retracement | Real, `retracementCalculator.js`, reusing the existing `fibonacciRetracement()`. |
| Fibonacci Extension | Real, `extensionCalculator.js`, using the new `fibonacciExtension()` added this phase. |
| Confluence Zones | Real, `confluenceZoneAnalyzer.js` — real levels from 3 independent real sources clustered by real price proximity. |
| Multiple timeframe agreement | Real, `multiTimeframeAnalyzer.js` — real daily vs. real weekly (ISO-week-aggregated) swing/trend comparison. |
| Price reaction history | Real, `priceReactionHistory.js` — real historical touch/respect/break counts per level. |
| Dynamic support/resistance | Real, `dynamicSupportResistanceAnalyzer.js` — the existing `detectSupportResistance()`'s range extremes and pivots, recomputed fresh. |
| Trend context | Real, `trendContextAnalyzer.js`, reusing the existing daily trend signal. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `fibonacciAgent.orchestratorIntegration.test.js`, mirroring `TECHNICAL-AGENT-001`/`VALUATION-AGENT-001`'s own equivalent test suites. The existing `realAgents.test.js`/`registry.test.js` suites (which already exercised the `"fibonacci"` stub) were re-verified passing unchanged against the upgraded adapter.

## Tests

**66 new unit tests, all passing:** `weeklyBarAggregator.test.js` (4), `swingDetector.test.js` (5), `retracementCalculator.test.js` (3), `extensionCalculator.test.js` (3), `dynamicSupportResistanceAnalyzer.test.js` (2), `priceReactionHistory.test.js` (4), `multiTimeframeAnalyzer.test.js` (6), `confluenceZoneAnalyzer.test.js` (6), `entryRiskZoneAnalyzer.test.js` (6), `trendContextAnalyzer.test.js` (4), `confidenceModel.test.js` (7), `aiSummary.test.js` (8), `fibonacciDataProvider.test.js` (3), `fibonacciAgent.test.js` (5, including a forbidden-governance-key scan and a flat-series no-distinct-swing graceful-degradation test).

Plus **3 new tests** in `technicalIndicators.test.js` for the new `fibonacciExtension` pure function (27/27 in that file passing overall), and **5 new** `fibonacciAgent.orchestratorIntegration.test.js` full-stack tests (registry auto-registration confirmation, real orchestrator execution, real observability recording, scheduler health-cache reuse, opaque-direction-string contract).

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1627 tests, 1625 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Swing detection is deliberately simple, not a fitted or ML-based pattern recognizer.** It finds the single highest-high/lowest-low pair in a lookback window and infers direction from chronological order — the same "honest first version, not a claim of statistical optimality" discipline `detectSupportResistance()` already documents. Minor/secondary swings within the window are not separately modeled.
2. **`fibonacciExtension`'s projection convention (target = swing end + ratio × range) is one of several real-world conventions**, disclosed directly in `technicalIndicators.js`'s own header comment for the function.
3. **Confluence zone tolerance (1.5% of price) and the high-probability minimum score (2 independent sources) are disclosed, hand-set constants**, not derived from a backtested optimum — documented in `confluenceZoneAnalyzer.js`'s own header.
4. **Price reaction history's tolerance (0.5% of price) and lookahead window (3 bars) are disclosed, hand-set constants** — a level that was never touched in the available history honestly reports `reactionStrength: null`, never a fabricated 0.
5. **Confidence's component weights (30/30/20/20) are disclosed, hand-set constants**, mirroring every other domain agent's own disclosed-constant confidence formula this session (never a naive average).
6. **AI Summary is explicitly, always a deterministic template composition** — never an LLM or external API call, disclosed in the file's own header comment.

## Files changed

- New: `backend/services/domainAgents/fibonacciAgent/{weeklyBarAggregator,fibonacciDataProvider,swingDetector,retracementCalculator,extensionCalculator,dynamicSupportResistanceAnalyzer,priceReactionHistory,multiTimeframeAnalyzer,confluenceZoneAnalyzer,entryRiskZoneAnalyzer,trendContextAnalyzer,confidenceModel,aiSummary,fibonacciAgent}.js` + matching `.test.js` files, plus `fibonacciAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/intelligence/technicalIndicators.js` (additively extended with `fibonacciExtension` — all pre-existing exports untouched).
- Modified: `backend/services/intelligence/technicalIndicators.test.js` (3 new tests appended for the new function).
- Modified: `backend/services/agentOrchestrator/agents/fibonacciAgent.js` (stub → real; same id, same 4-member Agent interface).
- Unmodified: `backend/services/intelligence/technicalIntelligenceService.js`, `backend/services/intelligence/priceHistoryProvider.js` (both already-real, already-tested, reused as-is), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
