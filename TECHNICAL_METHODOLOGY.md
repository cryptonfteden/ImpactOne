# Technical Intelligence — Scoring Methodology Research

**Phase:** TECHNICAL-SCORING-RESEARCH-001. Pure research — no production code was written. Unlike the Options/Valuation/Algorithmic-Activity research phases (each starting from an honest stub), the Technical Agent is **already real, already shipped, and already tested** (`backend/services/intelligence/technicalIntelligenceService.js` + `technicalIndicators.js`, wrapped by `backend/services/agentOrchestrator/agents/technicalAgent.js`) — this research evaluates and extends that real implementation directly, grounded in its actual source, not a hypothetical design.

---

## 1. What already exists — read directly from source

`analyzeBars()` computes **11 real, independent signals** per call, each honestly marked `enoughDataStatus: SUFFICIENT|INSUFFICIENT`, each with its own `strength` (0-100), `invalidationLevel`, and shared `freshness`: `trend` (SMA50/200 crossover), `movingAverages` (SMA20/EMA20), `rsi` (14-period), `macd` (12/26/9), `atr` (14-period, no directional signal — correctly `strength: null`), `vwap`, `bollingerBands` (20/2), `fibonacciRetracement`, `supportResistance`, `breakout` (20-bar range + volume confirmation + a genuine `FAILED_BREAKOUT` retrospective check), `volatilityRegime` (ATR percentile-of-60-days).

**The single most important finding of this research, confirmed by direct source read of `technicalAgent.js`:**

```js
function confidence(result) {
  const trend = result?.raw?.signals?.trend;
  return Number.isFinite(trend?.strength) ? trend.strength : 0;
}
```

Both the Technical Agent's `direction` (`trend?.signal || null`) **and** its `confidence()` (`trend.strength`, a hand-set constant of either 70 or 40) are derived from **exactly one of the 11 real, computed signals** — the SMA50/200 trend crossover. The other 10 signals (RSI, MACD, ATR, VWAP, Bollinger, Fibonacci, Support/Resistance, Breakout, Volatility Regime, short-MA) are all real, computed, and included in the agent's `evidence` array — but **none of them currently affect what the orchestrator, the Unified Scoring layer, or any downstream Claim/Recommendation ever sees as the Technical Agent's own confidence or direction.** This single, concrete, verified fact is the central problem this whole research phase exists to solve — the mission's "Technical Score" (defined in `TECHNICAL_SCORING_MODEL.md`) is, in effect, the fix for this exact gap.

---

## 2. Trend scoring

- **What's real today:** a binary SMA50/200 crossover classification (`UPTREND`/`DOWNTREND`/`MIXED`, or a 2-tier `ABOVE_50D_AVERAGE`/`BELOW_50D_AVERAGE` fallback when 200 days of history isn't available), with a **hand-set, non-continuous strength** (70 if trending, 40 otherwise) — the crossover's own *magnitude* (how far above/below SMA50 is SMA200, or how far the last close sits above/below SMA50) plays no role in the strength value at all today.
- **Real, well-established gap: no trend-***strength*** indicator exists at all.** The standard, decades-old technical-analysis tool for measuring trend strength independent of direction is the **ADX (Average Directional Index)** — a 0-100 measure of how strongly a market is trending, regardless of which way. This platform currently conflates "is there a trend" (the crossover) with "how strong is it" (a hand-set constant) — recommend adding a real ADX-based trend-strength component so `TrendScore`'s magnitude reflects an actual, continuous, well-established statistic rather than a fixed 70-vs-40 step function.
- **A second, cheaper improvement available without adding a new indicator:** scale trend strength by the **normalized distance** between the last close and SMA50/SMA200 (e.g., `(lastClose − sma50) / atr`, expressing the gap in volatility-adjusted units) — a close that's 3 ATRs above a rising SMA50 is meaningfully stronger evidence of an uptrend than one that's 0.1 ATRs above it, and this is computable today from data the service already fetches, with no new indicator required.

## 3. Momentum scoring

- **A real, important conceptual distinction this research surfaces:** "momentum" indicators split into two genuinely different families that are often conflated:
  1. **Trend-following / continuation momentum** (MACD, Rate-of-Change) — further from zero, in the direction of the prevailing trend, is *more* bullish/bearish confirmation.
  2. **Mean-reversion / exhaustion momentum** (RSI, Stochastic) — an *extreme* reading (deeply overbought/oversold) is often a *warning* of an approaching reversal or pause, not a simple "more is more bullish" signal.
- **What's real today, and its gaps:** MACD's strength (`min(100, round(abs(histogram) * 10))`) is already a genuine, continuous, magnitude-based score — a real strength, worth keeping as-is. **RSI's strength, by contrast, is a flat binary (65 if overbought/oversold, 30 otherwise)** — an RSI of 95 (extreme exhaustion) scores identically to an RSI of 71 (barely over the 70 line) today, discarding real, available magnitude information. Recommend scaling RSI's strength continuously by its distance from the neutral 30-70 band (e.g., `strength = 50 + min(50, (rsi - 70) * 2)` above 70, mirrored below 30), consistent with how MACD already does this.
- **A real, well-established practitioner nuance this research recommends encoding explicitly, not silently:** RSI-overbought occurring *within* a confirmed uptrend is a normal, expected, historically common combination (strong trends routinely produce overbought oscillator readings for extended periods) — not, on its own, a bearish reversal signal. Treating every overbought reading as equally bearish regardless of the prevailing trend context is a well-documented novice mistake in technical-analysis practice. This directly motivates §5's signal-conflict taxonomy.

## 4. Multi-timeframe confirmation

- **Confirmed, by direct source read: this does not exist in the codebase today, at all.** `analyzeSymbol(symbol, { timeframe = "1D", range = "1y" })` accepts a `timeframe` parameter — but a full repo-wide check of every call site confirms it is **never invoked with more than one timeframe value, and no function anywhere combines results across timeframes.** The interface appears to have been deliberately designed to *support* multi-timeframe analysis later (the parameter exists, is threaded through every signal's own `timeframe` field), but no such analysis is actually performed.
- **Why this is the single most significant methodological gap this research identifies:** the standard, well-established practitioner discipline (e.g., the "triple screen" approach: require a higher timeframe's trend to be at least non-contradictory before trusting a lower-timeframe entry signal) exists specifically because a daily-chart signal computed in isolation can be flatly contradicted by the weekly or monthly trend, and a report that never checks the weekly chart cannot know this. **A "UPTREND" reported today, with 70/100 strength, could be occurring squarely inside a weekly downtrend — the platform currently has no way to know or disclose this.**
- **Recommended, additive design** (fully specified in `TECHNICAL_SCORING_MODEL.md` §2): call `analyzeSymbol()` (already real, already working) at 2-3 timeframes (e.g., daily + weekly, and optionally an intraday timeframe if/when this platform's data provider supports it) and compute a **Multi-Timeframe Alignment** term that boosts `TrendScore`/`TechnicalScore` when timeframes agree and discounts it when they conflict — reusing the exact same real function this platform already has, called more than once, rather than building a second analysis engine.

## 5. Indicator weighting

- **What's real today:** no weighting or composite scheme exists at all — 10 of the 11 signals simply sit unused in `evidence`, per §1's finding.
- **A real, well-documented risk this research must guard against when building the composite (`TECHNICAL_SCORING_MODEL.md` §1): "indicator soup" / correlated-evidence inflation.** Several of these 11 signals are **not independent** of one another — e.g., `trend` (SMA50/200), `movingAverages` (SMA20), and `vwap` all substantially derive from the same underlying moving-average-of-price concept, and will very often agree simply because they're measuring closely related things, not because they represent 3 independently-corroborating pieces of evidence. Naively averaging all 11 raw strengths would systematically overstate conviction whenever price is simply trending cleanly (all the trend-family and moving-average-family indicators agree almost by construction), exactly the same correlated-evidence risk this engagement's own `UNIFIED_SCORING_MODEL.md` §4 already identified and solved (via a disclosed `independenceFactor`) one level up, at the cross-agent level — this research recommends applying the **same principle one level down**, within the Technical Agent's own 11 sub-signals, via **indicator families** (Trend, Momentum, Volatility, Structure — fully specified in `TECHNICAL_SIGNAL_PRIORITY.md` §1) rather than treating all 11 as equally independent votes.

## 6. Signal conflicts

- **What's real today:** zero conflict-detection or reconciliation logic exists among the Technical Agent's own 11 signals — they are independently computed and independently listed in `evidence`, with no relationship between them ever surfaced.
- **A taxonomy, directly reusing this engagement's own `CONFLICT_RESOLUTION.md` framework (built one level up, for cross-agent conflicts) applied here within one agent:**
  1. **Genuine directional conflict** — e.g., `trend = UPTREND` while `macd = BEARISH_CROSSOVER` (both are trend-following-family signals, genuinely measuring related things, and disagreeing) — this is real, informative divergence (a classic, well-known technical-analysis warning sign — "trend/momentum divergence" is itself a named, established concept, not a novel idea) and should be surfaced and modestly penalize the composite score.
  2. **Expected co-occurrence, not a conflict** — e.g., `trend = UPTREND` while `rsi = OVERBOUGHT` — per §3, this is a *normal*, well-documented combination in a genuinely strong trend, and must **not** be scored as a conflict; doing so would actively mislead by penalizing exactly the kind of strong, sustained trend a user would want to be told about clearly.
  3. **Different-question, not directly comparable** — e.g., `volatilityRegime` (a magnitude/regime classification, not a directional bet) and `atr` (a pure volatility measure, `strength: null` already, correctly non-directional) should never enter a directional conflict tally at all — already correctly excluded today by having no directional `signal` semantics, but this exclusion should be made an explicit, disclosed rule (mirroring `CONFLICT_RESOLUTION.md` §3's `NOT_DIRECTIONAL` category) rather than an implicit side effect of how these two indicators happen to be coded.

## 7. Breakout confidence

- **What's real today, and genuinely solid:** a 20-bar prior high/low range, a volume-confirmation check (`lastVolume > avgVolume * 1.2`), and — notably strong, already-honest design — a genuine **retrospective `FAILED_BREAKOUT`** check (was a breakout in the last 2-5 bars, that has since closed back inside the prior range) rather than a vague, unfalsifiable "reversal" claim. This is a real, credit-worthy piece of existing engineering, not a gap.
- **Real, concrete extensions this research recommends, each using data the service already computes, requiring no new indicator:**
  1. **Continuous volume-confirmation strength**, not a binary 1.2x cutoff — a breakout on 3x average volume is materially stronger evidence than one on 1.21x, and the current binary check discards this real, already-available magnitude.
  2. **ATR-normalized breakout magnitude** — how far beyond the prior high/low the close finished, expressed in ATR units (reusing the ATR indicator this service already computes) — a breakout that closes 2 ATRs beyond the prior range is far stronger evidence than one that closes 0.05 ATRs beyond it, and the current binary `BREAKOUT_UP_CONFIRMED`/`BREAKOUT_UP_UNCONFIRMED` classification discards this too.
  3. **A same-day-forward-looking "hold" check** distinct from the existing retrospective `FAILED_BREAKOUT` logic — many real breakouts fail within the first 1-3 sessions; a breakout that has already survived 2-3 sessions without closing back inside the prior range is more credible evidence than one confirmed only moments ago, a real, additional freshness-adjacent confidence input (see `TECHNICAL_SIGNAL_PRIORITY.md` §3's freshness model).

## 8. Support/Resistance confidence

- **Confirmed by direct source read of `technicalIndicators.js`'s real `detectSupportResistance()`: today's "resistance"/"support" values are simply the single maximum high / minimum low over a 60-bar lookback window** — the single most extreme point in the window, **not** a real, multiple-touch consolidation level. Real, well-established technical-analysis practice defines a genuinely strong support/resistance *level* by **how many times price has approached and respected it** (a "level" tested and held 4 times is far stronger evidence than a level that is simply the single highest print in 60 days, which may have occurred exactly once and never been retested).
- **A directly actionable, concrete, already-available fix: `detectSupportResistance()` already computes `recentPivotHighs`/`recentPivotLows` (real local-pivot-point detection, a genuine touch-count precursor) — but `analyzeSupportResistance()` in `technicalIntelligenceService.js` never uses either field, only the single max/min.** This is the exact same "the data is already computed but discarded at the layer above" pattern this engagement's `VALUATION_RESEARCH.md` found in `finnhubService.js`'s underused metrics response — the cheapest, highest-leverage first improvement available for this signal is simply **using data this service already computes**, not adding a new indicator.
- **Recommended additions, fully specified in `TECHNICAL_SCORING_MODEL.md` §5:** a touch-count-based level-strength score (clustering `recentPivotHighs`/`recentPivotLows` near the reported level), a proximity term (how close the last close currently sits to the level, since "AT_RESISTANCE" today is a binary `>=`/`<=` test with no notion of "approaching" vs. "just touched"), and a level-recency term (a level formed 3 weeks ago is more currently relevant than one formed 11 months ago, within the same 60-bar lookback).

---

## 9. Summary of concrete, evidence-grounded findings driving this research's design (see `TECHNICAL_SCORING_MODEL.md` and `TECHNICAL_SIGNAL_PRIORITY.md`)

1. The Technical Agent's real, shipped `confidence()`/`direction` today reflect only 1 of 11 real, computed signals (the trend crossover) — the headline finding motivating a real composite `TechnicalScore`.
2. Multi-timeframe confirmation does not exist at all, despite the interface already anticipating it (`timeframe` parameter, never called more than once) — the single most significant methodology gap.
3. RSI's strength is a flat binary, discarding real, already-computed magnitude — MACD's is already continuous and should be the template.
4. Indicator correlation ("indicator soup") is a real risk for any naive composite — recommend indicator families with within-family correlation discounting, mirroring `UNIFIED_SCORING_MODEL.md`'s cross-agent independence discount one level down.
5. Signal conflicts require a taxonomy distinguishing genuine divergence from normal, expected co-occurrence (e.g., overbought-in-an-uptrend) — treating the latter as a conflict would actively mislead.
6. Breakout detection is already a genuine strength of this codebase (real failed-breakout logic) — extend with continuous volume/ATR-normalized magnitude rather than binary cutoffs.
7. Support/Resistance's real touch-count data (`recentPivotHighs`/`recentPivotLows`) is already computed by the underlying indicator library but silently discarded at the service layer — the single cheapest, highest-leverage fix available in this entire research.
