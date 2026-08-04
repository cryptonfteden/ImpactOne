# Technical Signal Priority — Weighting, Indicator Priority, False-Positive Reduction, Freshness

**Phase:** TECHNICAL-SCORING-RESEARCH-001. Pure research/design — no production code was written. Companion to `TECHNICAL_METHODOLOGY.md` (research) and `TECHNICAL_SCORING_MODEL.md` (the 5 defined scores) — this document is the "Recommend" deliverable: concrete signal weighting, indicator priority, false-positive reduction, and a freshness model, all grounded in the real, shipped `technicalIntelligenceService.js`/`technicalIndicators.js`.

---

## 1. Signal weighting — indicator families

Directly implements `TECHNICAL_METHODOLOGY.md` §5's "indicator soup" finding: the 11 real signals are grouped into 4 families so that correlated members do not each count as independent corroborating votes.

| Family | Members (all real, already computed) | Within-family weighting | Correlation note |
|---|---|---|---|
| **Trend** | `trend` (SMA50/200), `movingAverages` (SMA20/EMA20), `vwap` | `trend` 0.6 / `movingAverages` 0.25 / `vwap` 0.15 | All three substantially derive from moving-averages-of-price — deliberately down-weighted as a *family* in `TechnicalScore` (0.30, per `TECHNICAL_SCORING_MODEL.md` §1) relative to a naive equal-split-across-11-signals approach, precisely because 3 of the 11 signals living in this one family are the most mutually correlated of the whole set |
| **Momentum** | `rsi`, `macd` | `macd` 0.6 / `rsi` 0.4 (matches `MomentumScore`'s own real weighting, `TECHNICAL_SCORING_MODEL.md` §3) | Genuinely two different momentum *concepts* (continuation vs. exhaustion, per `TECHNICAL_METHODOLOGY.md` §3) — meaningfully more independent of each other than the Trend family's 3 members are, hence no further correlation discount applied within this family |
| **Structure** | `breakout`, `supportResistance`, `fibonacciRetracement` | `breakout` 0.5 / `supportResistance` 0.35 / `fibonacciRetracement` 0.15 | `breakout` and `supportResistance` are related (a breakout is, definitionally, a move through a support/resistance level) but each captures genuinely distinct information (breakout adds volume/momentum-of-the-move; support/resistance adds level-quality/touch-count, per §3 below) — a moderate, not severe, correlation; `fibonacciRetracement` is weighted lowest since it currently only reports `LEVELS_COMPUTED`/`UNKNOWN` with no real directional signal of its own (a real, disclosed limitation, not an oversight — see §2) |
| **Volatility (context, not directional)** | `atr`, `bollingerBands`, `volatilityRegime` | Averaged, since none are directional and there is no real corroboration/conflict concept to weight among non-directional context signals | Correctly excluded from any directional conflict/agreement tally per `TECHNICAL_METHODOLOGY.md` §6's `NOT_DIRECTIONAL` category |

**A general principle stated explicitly, not left implicit:** within-family weights above are disclosed, hand-set values — not fitted — consistent with this platform's established convention (`optionsAnomalyConfidence.js`'s `CLASSIFICATION_STRENGTH`, `scoringVocabulary.js`'s `QUALITY_WEIGHTS`). They should be revisited only once real graded-outcome history exists for the Technical Agent's own composite score specifically, reusing (not duplicating) this platform's existing `Outcome`/`calibrationReportService.js` infrastructure — the same deferred-calibration principle `AGGREGATION_METHODOLOGY.md` §2/§4 already established for the cross-agent Unified Scoring work.

---

## 2. Indicator priority — which signals should dominate when they disagree

Beyond family-level weighting (§1), recommend an explicit priority ordering for **tie-breaking and disclosure emphasis** when genuine cross-family conflicts occur (per `TECHNICAL_METHODOLOGY.md` §6's "genuine directional conflict" category):

1. **`breakout`** (highest priority) — a confirmed breakout is a real, discrete, volume-corroborated *event*, not a continuous/lagging statistical read; when a confirmed breakout genuinely contradicts the trend/moving-average family's own read, the breakout should be surfaced first and most prominently in the composite's explanation, since it typically represents the most recent, most information-dense evidence.
2. **`trend`** (SMA50/200) — the single most standard, widely-understood trend read; second priority specifically because it is a **lagging** indicator by construction (moving averages are, definitionally, backward-looking smoothed values) — real, valuable, but structurally slower to reflect a genuine change than a breakout event.
3. **`macd`** — a genuine, already-continuous momentum measure; third priority as a corroborating/contradicting signal to the two above.
4. **`supportResistance`** — informative context (proximity to a real, multi-touch level, per §3 below), but a level being nearby doesn't itself indicate direction the way a confirmed breakout or trend read does.
5. **`rsi`**, **`bollingerBands`**, **`vwap`**, **`movingAverages`**, **`fibonacciRetracement`**, **`volatilityRegime`**, **`atr`** — supporting/contextual signals, individually valuable (all real, disclosed, non-fabricated), but none should individually override the top 3's read in the composite's own headline explanation.

**Explicit, disclosed rationale for this specific order, not an arbitrary list:** it follows a real, defensible principle — **event-based signals (breakout) outrank trailing/lagging statistical signals (moving averages), which outrank oscillator/context signals (RSI, Bollinger)** — a standard practitioner heuristic (the more a signal reflects a genuine, recent, discrete change in market behavior rather than a smoothed historical average, the more weight it deserves when signals disagree), not a novel invention for this platform.

---

## 3. False-positive reduction

### 3.1 Cheapest, highest-leverage fix: use data this service already computes but currently discards

Per `TECHNICAL_METHODOLOGY.md` §8's central finding: `detectSupportResistance()` already computes `recentPivotHighs`/`recentPivotLows` (real local-pivot-point detection) but `analyzeSupportResistance()` never uses either field, relying only on the single 60-bar max/min. Recommend:

```
levelStrength(level, pivots, tolerancePct = 0.5%) =
    count of pivots within tolerancePct of `level`
      — a level with 4+ real, distinct historical touches should report
        materially higher confidence than one that is simply the single
        highest print in the lookback window (which may have occurred
        exactly once and never been retested)
```

This single change — using data the codebase already computes rather than adding anything new — directly reduces the most concrete, verified false-positive risk this research found: today's `AT_RESISTANCE`/`AT_SUPPORT` classification cannot distinguish a well-tested, credible level from a one-off spike.

### 3.2 Proximity, not just a binary threshold test

Today's `AT_RESISTANCE` test is a bare `lastClose >= resistance` comparison — recommend an explicit **proximity band** (e.g., within 0.5-1 ATR of the level counts as "approaching," only a genuine touch/breach counts as "at"), so a close that is merely *near* a level is not silently classified identically to one that has actually reached it — reduces false "AT_RESISTANCE"/"AT_SUPPORT" classifications caused by normal day-to-day price noise near a level that hasn't genuinely been tested.

### 3.3 Breakout false-positive reduction — reusing `TECHNICAL_SCORING_MODEL.md` §4's new terms

The `volumeConfirmationBonus` and `atrNormalizedMagnitudeBonus` (both newly proposed, both continuous rather than binary) are themselves the primary false-positive-reduction mechanism for breakouts — a marginal, low-volume, small-magnitude "breakout" (which would today register as a flat `BREAKOUT_UP_CONFIRMED` at strength 75 the moment volume exceeds 1.2x average, however marginally) now scores meaningfully lower than a large, high-volume, high-conviction one, directly reducing the rate at which noise-driven marginal breaks are reported at the same confidence as genuine ones.

### 3.4 Trend false-positive reduction — the ADX floor

Per `TECHNICAL_SCORING_MODEL.md` §2: a real ADX reading below the conventional "no real trend" threshold (proposed: 20) should directly suppress `TrendScore`'s magnitude even when the SMA50/200 crossover condition is technically satisfied — a crossover on genuinely directionless, choppy data is a well-documented source of false trend signals in real technical-analysis practice (moving-average crossover systems are famously prone to "whipsaws" in range-bound markets), and ADX is the standard, established tool for filtering exactly this failure mode.

### 3.5 Multi-timeframe disagreement as a false-positive filter

Per `TECHNICAL_SCORING_MODEL.md` §2's `multiTimeframeAlignmentMultiplier` (a real 0.70 discount when the higher timeframe genuinely opposes the primary one) — this is, in substance, a false-positive-reduction mechanism as much as a confidence-calibration one: a daily-chart signal that directly contradicts the weekly trend is a well-known source of lower-quality, more easily reversed signals in real practitioner experience, and this multiplier directly discounts exactly that case rather than reporting it at full strength.

---

## 4. Freshness model

### 4.1 The real gap: one shared freshness value for signals with very different natural decay rates

Confirmed by direct source read: `analyzeBars()` computes a single `freshness` object (`{lastBarDate, ageDays}`) once, and passes the identical value into every one of the 11 signals — meaning a fast-changing signal (RSI, which can move from neutral to extreme within a single session) and a slow-changing one (the SMA200 component of the trend read, which is mathematically almost unchanged from one day to the next) are reported with identical "freshness," despite having very different real staleness implications.

### 4.2 Recommended: per-indicator-family expected volatility-of-signal, not a single global age threshold

```
freshnessDecay(signal, family) = clamp(
    1 - (ageDays / family.expectedSignalHalfLifeDays)
  , FLOOR, 1)                    (proposed floor: 0.4)
```

| Family | Proposed `expectedSignalHalfLifeDays` | Rationale |
|---|---|---|
| Structure (breakout, support/resistance) | 1-2 days | A breakout's whole informational value is time-sensitive — a "confirmed breakout" from a week-old bar is materially less actionable than one from today's bar, directly mirroring `OPTIONS_SCORING_MODEL.md` §5.1's "sweep freshness is existential" principle applied to this domain's own fastest-moving structural signal |
| Momentum (RSI, MACD) | 2-4 days | Meaningfully time-sensitive, but somewhat slower to fully invalidate than a discrete breakout event |
| Trend (SMA crossovers, moving averages) | 7-10 days | Genuinely slow-moving by construction (a 50-day or 200-day moving average barely shifts day-to-day) — a several-day-old trend read remains highly relevant |
| Volatility (ATR, Bollinger, regime) | 5-7 days | A volatility *regime* (per the real, already-computed 60-day ATR percentile) is a genuinely slower-changing classification than a single day's raw ATR reading |

- **This freshness decay applies to the SAME per-signal `strength` value already computed everywhere in this document (§1's family weights, `TECHNICAL_SCORING_MODEL.md`'s formulas) as a multiplicative discount** — not a separate, disconnected freshness display, ensuring a stale signal genuinely contributes less to every composite score it feeds, not merely displaying an "age" number a user must interpret themselves.
- **A specific, important, honest exception, stated explicitly:** the *ordinary*, expected case — a request made after market close reusing the same trading day's final bar as the most recent close — should **not** be treated as staleness at all (`ageDays` will correctly read `0` or `1` in the normal course of business); this freshness model exists to catch genuinely delayed/stalled data (a `priceHistoryProvider` outage, a data-gap, a symbol that stopped updating), not to penalize the ordinary overnight gap between a market's close and the next morning's analysis request.

---

## 5. Summary — concrete, actionable recommendations

1. **Group the 11 real signals into 4 families (Trend/Momentum/Structure/Volatility)** with disclosed, hand-set within-family and across-family weights, directly fixing the "indicator soup" correlation risk.
2. **Establish an explicit indicator priority order** (breakout > trend > MACD > support/resistance > the remaining contextual signals) for tie-breaking and disclosure emphasis when genuine conflicts occur, grounded in the real practitioner principle that event-based signals outrank lagging statistical ones.
3. **Use data already computed but currently discarded** (`recentPivotHighs`/`recentPivotLows` for a real touch-count-based support/resistance confidence) as the single cheapest, highest-leverage false-positive-reduction fix available.
4. **Replace binary volume/magnitude cutoffs with continuous, ATR-normalized scores** for breakout confirmation, and add a real ADX floor for trend confirmation — both directly reduce well-documented, classic technical-analysis false-positive failure modes (marginal breakouts, whipsaws in choppy/directionless markets).
5. **Apply a per-family, not global, freshness decay** to every signal's contribution to every composite score, distinguishing genuinely fast-moving signals (breakout/structure) from genuinely slow-moving ones (trend), while explicitly not penalizing the ordinary overnight market-close-to-next-morning gap.

No code was written to implement any of the above — this document, together with `TECHNICAL_METHODOLOGY.md` and `TECHNICAL_SCORING_MODEL.md`, is the design/decision record for whenever a real implementation phase begins.
