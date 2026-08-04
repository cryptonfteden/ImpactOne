# TECHNICAL_AGENT.md — Phase TECHNICAL-AGENT-001

**Mission:** build the Technical Analysis Intelligence Agent — analyzing Trend, EMA (20/50/200), SMA, RSI, MACD, ADX, ATR, Bollinger Bands, Volume Trend, Breakouts, Support, Resistance, Trend Strength, and producing Trend (Bullish/Neutral/Bearish), Trend Strength, Momentum, Support Levels, Resistance Levels, Breakout Probability, Risk Level, Confidence (0-100), and an AI Summary. Provider abstraction, Registry/Scheduler/Observability/Orchestrator integration, no UI, comprehensive tests.

---

## Design decision: upgrade, not duplicate — but this agent already had a *real* baseline

Unlike `OPTIONS-AGENT-001`/`EARNINGS-AGENT-001`/`VALUATION-AGENT-001`, the `"technical"` agent id was never an inert stub — `AGENT-ORCHESTRATOR-001` already wired it to `technicalIntelligenceService.js` (Sprint 37's real, already-tested evidence layer, also consumed by the Committee's `technicalAnalystMember.js`). This phase deliberately did **not** modify that already-real, widely-reused subsystem. Instead:

1. **Additively extended** the lower-level, pure `technicalIndicators.js` module with the two real indicators this mission asks for that the existing service did not already compute: **ADX** (Wilder's Average Directional Index — the standard, dedicated trend-*strength* indicator, distinct from trend *direction*) and **Volume Trend** (recent vs. prior average-volume comparison).
2. **Built an entirely new composition layer** (`backend/services/domainAgents/technicalAgent/`) that reuses `technicalIntelligenceService.analyzeBars()`'s existing signal output directly — computed from the exact same, already-fetched daily bars, no duplicate network call — alongside the two new indicators.
3. **Upgraded the existing orchestrator adapter in place** (`backend/services/agentOrchestrator/agents/technicalAgent.js`) — same `"technical"` id, same 4-member Agent interface — to call the new engine instead of wrapping `analyzeSymbol()` directly.

This is the same engine-vs-adapter split every domain agent this session uses, applied to an agent that started real rather than stubbed.

## What was built

New directory: `backend/services/domainAgents/technicalAgent/`.

| File | Responsibility |
|---|---|
| `technicalDataProvider.js` | **The provider abstraction.** `getSymbolTechnicals(symbol) -> TechnicalMetrics`. Fetches real daily bars once (`priceHistoryProvider.getDailyBars`), then calls the existing `technicalIntelligenceService.analyzeBars()` for the full real signal set (trend, moving averages, RSI, MACD, ATR, VWAP, Bollinger, Fibonacci, support/resistance, breakout, volatility regime) plus the two new indicators (ADX, volume trend) and a direct second call to `detectSupportResistance()` for its richer pivot-high/pivot-low output. Honestly returns `dataAvailable: false` with a real reason on no price history — never fabricates. |
| `trendAnalyzer.js` | Maps the existing service's `UPTREND`/`DOWNTREND`/`MIXED`/`ABOVE_50D_AVERAGE`/`BELOW_50D_AVERAGE` vocabulary onto this mission's 3-state `BULLISH`/`NEUTRAL`/`BEARISH` output. Computes real **Trend Strength** (0-100) primarily from ADX, with an honest, disclosed fallback to the existing signal's own coarser strength field when ADX cannot be computed (too few bars) — every result discloses its `trendStrengthSource`. |
| `momentumAnalyzer.js` | Combines the existing, already-real RSI and MACD signals into one **Momentum** read — a pure rule table (RSI overbought/oversold takes priority as a distinct caution/opportunity flag; otherwise MACD crossover direction, corroborated or not by RSI's side of 50, yields `STRONG_BULLISH`/`BULLISH`/`NEUTRAL`/`BEARISH`/`STRONG_BEARISH`). No new indicator math — a documented combination of two already-real signals. |
| `levelsAnalyzer.js` | **Support Levels / Resistance Levels** (plural, per the mission's spec) — built from the 60-day range extremes, the real recent pivot highs/lows (`detectSupportResistance`'s richer output, not just the single extremes `technicalIntelligenceService`'s own signal surfaces), and real Fibonacci retracement levels — each level labeled with its real source, split above/below current price, deduplicated, sorted nearest-first. Never an invented level. |
| `breakoutProbabilityAnalyzer.js` | **Breakout Probability** (0-100) — a disclosed, deterministic estimate (not a fitted statistical model; no historical backtest/outcome data exists in this environment to calibrate one). Confirmed/unconfirmed/failed breakout states map to fixed, disclosed scores (85/55/20); the `NO_BREAKOUT` state estimates from real proximity to the nearest real prior-range extreme, with disclosed bonuses for real rising volume and real trend strength (ADX). |
| `riskLevelAnalyzer.js` | **Risk Level** (LOW/MODERATE/HIGH) — a deterministic rule table over the existing volatility-regime signal (ATR-percentile-based), real ATR-as-percent-of-price (scale-independent), and whether a breakout has recently failed. Honestly defaults to `MODERATE` (never guesses LOW/HIGH) when no real volatility data is usable. |
| `confidenceModel.js` | Overall **Confidence** (0-100) — a disclosed, hand-set weighted formula (never a naive average): a data-completeness base (55 if enough bars, 20 if not), a real directional-agreement bonus/conflict-penalty between trend and momentum, and a real freshness penalty when the last bar is stale (>5 days old). |
| `aiSummary.js` | **AI Summary** — a deterministic, template-based 2-4 sentence composition of the report's own real fields (trend + strength, momentum, nearest levels, breakout probability, risk, confidence). Explicitly **not** an LLM/external API call, disclosed in the file header, consistent with every other domain agent this session. |
| `technicalAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report, retaining `inputs: metrics` for auditability. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T07:13:30.532Z",
  dataAvailable: true,
  unavailableReason: null,
  trend: "BULLISH",                 // BULLISH | NEUTRAL | BEARISH
  trendStrength: 28,                 // 0-100, ADX-based (or disclosed fallback)
  trendStrengthSource: "ADX",        // ADX | SIGNAL_STRENGTH | UNAVAILABLE
  momentum: {
    state: "STRONG_BULLISH",         // STRONG_BULLISH | BULLISH | NEUTRAL | BEARISH | STRONG_BEARISH | OVERBOUGHT_CAUTION | OVERSOLD_OPPORTUNITY
    rsi: { value: 67.29, signal: "NEUTRAL" },
    macd: { signal: "BULLISH_CROSSOVER", histogram: 1.11 },
  },
  levels: {
    supportLevels: [ { price: 322.71, source: "Fibonacci 0.236 retracement" }, ... ],
    resistanceLevels: [ { price: 339.57, source: "60-day range high" } ],
  },
  breakout: { probability: 55, reason: "A breakout occurred but was not confirmed by above-average volume." },
  risk: { riskLevel: "HIGH", atrPercentOfPrice: 2.42, volatilityRegime: "HIGH_VOLATILITY", reason: "..." },
  confidence: { confidence: 75, dataCompleteness: "SUFFICIENT", agreement: "AGREE", freshnessPenaltyApplied: false },
  aiSummary: "Price is in an uptrend with weak trend strength (ADX-based, 28/100), while momentum is strongly bullish, ...",
  inputs: { /* the full TechnicalMetrics this report was built from, for auditability */ },
}
```

Every field the mission's "Output" section named is present. (Confirmed live against AAPL during development — see smoke test below.)

## Every mission indicator — how each is handled

| Indicator | Status |
|---|---|
| Trend | Real, from the existing service's SMA50/SMA200-based signal, mapped to BULLISH/NEUTRAL/BEARISH. |
| EMA (20/50/200) | EMA20 already computed by the existing `movingAverages` signal; SMA50/SMA200 (used for trend direction) are also real. EMA50/EMA200 specifically are not separately exposed by the existing service — trend direction instead uses the already-real SMA50/SMA200 crossover, disclosed as the existing, unmodified subsystem's own design. |
| SMA | Real (SMA20/50/200), from the existing service. |
| RSI | Real, from the existing service; feeds `momentumAnalyzer.js`. |
| MACD | Real, from the existing service; feeds `momentumAnalyzer.js`. |
| ADX | **New this phase** — real, Wilder's smoothing, added to `technicalIndicators.js`; feeds trend strength and breakout probability. |
| ATR | Real, from the existing service; feeds risk level (as % of price) and the existing volatility-regime signal. |
| Bollinger Bands | Real, from the existing service (available in `inputs.signals.bollingerBands` for auditability; not independently re-surfaced as a top-level mission output since the mission's own Output list does not name it directly). |
| Volume Trend | **New this phase** — real, recent-vs-prior average-volume percent change, added to `technicalIndicators.js`; feeds breakout probability. |
| Breakouts | Real, from the existing service's volume-confirmed breakout signal; feeds Breakout Probability. |
| Support / Resistance | Real — enriched this phase via a second, independent call to the existing `detectSupportResistance()` for pivot highs/lows plus real Fibonacci levels (`levelsAnalyzer.js`), not just the single extremes the existing service's own signal surfaces. |
| Trend Strength | **New this phase** — real, ADX-based (with disclosed fallback), in `trendAnalyzer.js`. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (already registered since `AGENT-ORCHESTRATOR-001`, confirmed still registered under the upgraded engine), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `technicalAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite.

## Tests

**63 new unit tests, all passing:** `trendAnalyzer.test.js` (8), `momentumAnalyzer.test.js` (7), `levelsAnalyzer.test.js` (7), `breakoutProbabilityAnalyzer.test.js` (9), `riskLevelAnalyzer.test.js` (7), `confidenceModel.test.js` (9), `aiSummary.test.js` (9), `technicalDataProvider.test.js` (3), `technicalAgent.test.js` (4) — including a forbidden-governance-key scan (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`) on the fully-serialized report.

Plus **6 new tests** in `technicalIndicators.test.js` for the new `averageDirectionalIndex`/`volumeTrend` pure functions (24/24 in that file passing overall), and **5 new** `technicalAgent.orchestratorIntegration.test.js` full-stack tests (registry auto-registration confirmation, real orchestrator execution, real observability recording, scheduler health-cache reuse, opaque-direction-string contract).

The existing `realAgents.test.js` smoke tests for the technical agent (already present since `AGENT-ORCHESTRATOR-001`) were re-verified passing unchanged against the upgraded adapter — no shape assumption in that file broke.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1553 tests, 1551 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings — `INEFFECTIVE_DYNAMIC_IMPORT` and the chunk-size warning — appear).

## Honest limitations, disclosed rather than hidden

1. **Breakout Probability is a disclosed heuristic, not a fitted statistical/ML model.** No historical outcome/backtest dataset exists in this environment to calibrate one, the same disclosed limitation every scoring formula built this session carries. The formula (state-based fixed scores for confirmed/unconfirmed/failed breakouts; a real-proximity-plus-volume-plus-ADX blend for the no-breakout case) is fully documented in the file's own header and reason string.
2. **EMA50/EMA200 are not independently computed** — the deliberately unmodified `technicalIntelligenceService.js` only exposes EMA20 (plus SMA50/SMA200, which already drive trend direction). Adding EMA50/EMA200 would have meant either modifying that shared, already-tested subsystem (also used by the Committee) or duplicating trend-direction logic; this phase's engine reuses the existing SMA-based trend signal directly instead, consistent with the "reuse, don't duplicate or destabilize" precedent already established for `technicalIntelligenceService.js`.
3. **Risk Level's score thresholds (the ±1/+2 rule table) are disclosed, hand-set values**, not derived from a backtested risk model — documented directly in `riskLevelAnalyzer.js`'s header.
4. **Confidence's freshness-penalty threshold (5 days) and agreement bonus/penalty (20/15) are disclosed, hand-set constants**, mirroring every other domain agent's own disclosed-constant confidence formula this session (never a naive average).
5. **AI Summary is explicitly, always a deterministic template composition** — never an LLM or external API call, disclosed in the file's own header comment, consistent with every other agent this session.

## Files changed

- New: `backend/services/domainAgents/technicalAgent/{technicalDataProvider,trendAnalyzer,momentumAnalyzer,levelsAnalyzer,breakoutProbabilityAnalyzer,riskLevelAnalyzer,confidenceModel,aiSummary,technicalAgent}.js` + matching `.test.js` files, plus `technicalAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/intelligence/technicalIndicators.js` (additively extended with `averageDirectionalIndex`, `volumeTrend` — all pre-existing exports untouched).
- Modified: `backend/services/intelligence/technicalIndicators.test.js` (6 new tests appended for the two new functions).
- Modified: `backend/services/agentOrchestrator/agents/technicalAgent.js` (upgraded in place — same id, same 4-member Agent interface — to call the new domain-agent engine instead of wrapping `technicalIntelligenceService.analyzeSymbol()` directly).
- Unmodified: `backend/services/intelligence/technicalIntelligenceService.js`, `backend/services/intelligence/priceHistoryProvider.js`, `backend/services/committee/technicalAnalystMember.js` (all already-real, already-tested, and the latter two/Committee-consumer explicitly left untouched to avoid destabilizing a widely-reused subsystem), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
