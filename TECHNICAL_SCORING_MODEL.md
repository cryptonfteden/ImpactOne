# Technical Scoring Model — Technical Score, Trend Score, Momentum Score, Breakout Score, Confidence Model

**Phase:** TECHNICAL-SCORING-RESEARCH-001. Pure research/design — no production code was written. Extends, rather than replaces, the real, shipped `technicalIntelligenceService.js`/`technicalIndicators.js` — every formula below is built from the **11 real, already-computed signals** documented in `TECHNICAL_METHODOLOGY.md` §1, plus the specific extensions (ADX, continuous RSI scaling, ATR-normalized breakout magnitude, pivot-based support/resistance touch-count) that research recommends adding. Bound by the same governance as every other agent in this platform (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): every score below is evidence, never a verdict, and must never itself set or override `Recommendation.action`.

---

## 1. Technical Score (0-100)

**What it measures:** the overall magnitude of well-supported, mutually-corroborating technical evidence for a symbol — directly fixing the real, verified gap in `TECHNICAL_METHODOLOGY.md` §1, where today's shipped `confidence()` reflects only the trend indicator, discarding 10 of 11 real signals.

```
TechnicalScore = clamp(
    trendFamilyScore   * 0.30
  + momentumFamilyScore * 0.25
  + structureFamilyScore * 0.25   (breakout + support/resistance + fibonacci)
  + volatilityFamilyScore * 0.20  (atr + bollinger + volatilityRegime — context, not directional)
  , 0, 100)
```

- **Family-based, not a flat 11-way average** — directly addresses `TECHNICAL_METHODOLOGY.md` §5's "indicator soup" finding: correlated indicators (e.g., `trend`, `movingAverages`, `vwap` — all substantially derived from moving averages of price) are grouped into one family and contribute as **one** weighted term, not three separately-counted, highly-correlated votes. Within each family, member indicators are averaged (not summed) so a family's own score cannot exceed what its most extreme honest member supports.
- **`volatilityFamilyScore`'s role is deliberately different from the other three** — `atr`/`volatilityRegime` are non-directional (this is already correctly reflected in the real code: `atr.strength` is `null` today) and contribute to `TechnicalScore` only as a **magnitude-of-context** term (how much real, measurable market activity exists around this symbol right now), never as directional evidence — consistent with treating volatility as context, not a bet, throughout this document.
- **Each family term is itself the corresponding score defined in §2-4 below** (`trendFamilyScore` = `TrendScore`, `momentumFamilyScore` = `MomentumScore`) — this composite is explicitly assembled from the other named scores this mission requests, not computed independently of them, guaranteeing full traceability (the same principle `UNIFIED_SCORING_MODEL.md` §2 already established for `OverallIntelligenceScore`).
- **Deliberately excludes `direction`** — `TechnicalScore` is a magnitude-only measure of "how much real technical evidence exists," never itself a bullish/bearish call; the net directional lean is reported as a separate, explicit field (computed from the same family scores' own signed contributions), mirroring the platform-wide magnitude-vs-direction separation already established in `ALGORITHMIC_ACTIVITY_SCORING.md` §1.4 (`ExecutionPressure`) and `UNIFIED_SCORING_MODEL.md` §2.

---

## 2. Trend Score (0-100)

**What it measures:** how strongly, and how consistently across timeframes, price is trending — directly answering `TECHNICAL_METHODOLOGY.md` §2's "no real trend-strength indicator" and §4's "no multi-timeframe confirmation" findings together.

```
TrendScore = clamp(
    (0.5 * crossoverStrength + 0.5 * adxStrength) * multiTimeframeAlignmentMultiplier
  , 0, 100)

crossoverStrength = the existing real SMA50/200 signal, upgraded from a binary
                     70/40 to a continuous scale via normalized distance:
                     clamp(50 + (lastClose - sma50) / atr * 10, 0, 100)
                       — reuses the ATR this service already computes; no new
                         indicator required for this specific improvement

adxStrength = a NEW, recommended addition (ADX, the standard, decades-old
              trend-strength indicator) — ADX itself is already conventionally
              0-100, requiring no rescaling; ADX < 20 conventionally indicates
              "no real trend" regardless of what the crossover says, and
              should be disclosed as a real, direct check on crossoverStrength
              (a crossover with ADX < 20 should not report a high TrendScore,
              since a weak/absent trend can still technically satisfy a
              crossover condition on noisy data)

multiTimeframeAlignmentMultiplier =
    1.15  if the higher timeframe (e.g. weekly) trend agrees in direction
    1.00  if the higher timeframe has insufficient data / is neutral
    0.70  if the higher timeframe trend genuinely opposes the daily trend
          — a real, disclosed, meaningful discount, not a small nudge,
            since a daily uptrend inside a weekly downtrend is a well-
            documented lower-conviction situation in real TA practice
```

- **The `multiTimeframeAlignmentMultiplier` is this document's single most important addition**, directly implementing `TECHNICAL_METHODOLOGY.md` §4's headline recommendation — computed by calling the real, already-working `analyzeSymbol()` a second time with a higher timeframe (e.g., weekly bars) and comparing its own `trend.signal` (after passing through the same canonical direction normalization already designed in `CONFLICT_RESOLUTION.md` §2, applied here within one agent's own cross-timeframe comparison) against the primary timeframe's trend.
- **A genuinely honest missing-data path:** if the higher-timeframe call itself returns `enoughDataStatus: INSUFFICIENT` (e.g., an IPO too recent to have a full year of weekly bars), the multiplier defaults to `1.00` (neutral, not penalized) — consistent with this platform's "never fabricate a penalty from absent data" discipline (the same principle `UNIFIED_SCORING_MODEL.md` §6 already established: missing data reduces confidence via coverage, never invents a phantom directional or penalty signal).

---

## 3. Momentum Score (0-100)

**What it measures:** the strength of trend-following/continuation momentum, distinctly informed but not contradicted by mean-reversion/exhaustion readings — directly implementing `TECHNICAL_METHODOLOGY.md` §3's two-families distinction.

```
MomentumScore = clamp(
    0.6 * continuationMomentumScore + 0.4 * exhaustionContextScore
  , 0, 100)

continuationMomentumScore = macd.strength   // already real, already continuous
                                             // (min(100, abs(histogram)*10)) —
                                             // kept exactly as-is, a genuine
                                             // existing strength of this codebase

exhaustionContextScore = a NEW, recommended continuous rescaling of RSI,
                          replacing today's flat 65/30 binary:
                          rsi > 70: clamp(50 + (rsi - 70) * 2, 0, 100)
                          rsi < 30: clamp(50 + (30 - rsi) * 2, 0, 100)
                          else:     30   (neutral zone, unchanged from today's
                                          existing NEUTRAL strength value)
```

- **Deliberately weighted 60/40 toward continuation (MACD) over exhaustion (RSI)** — per `TECHNICAL_METHODOLOGY.md` §3's own finding, an extreme RSI reading is context/caution, not on its own a reliable standalone reversal call; giving it less than half the weight reflects that it should inform, not dominate, the momentum read.
- **`exhaustionContextScore`'s real, disclosed meaning is asymmetric from the other family scores in this document** — a *high* `exhaustionContextScore` (deep overbought/oversold) is not unambiguously "more bullish" or "more bearish" the way a high `continuationMomentumScore` is; it should be reported alongside an explicit note (*"exhaustion context: elevated — historically associated with pauses/reversals, not a standalone signal"*) rather than folded silently into a number that reads the same as unambiguous continuation strength — the same "disclose the modeling judgment, don't hide it" discipline `CONFLICT_RESOLUTION.md` §2.3 already applied to the Valuation-Agent-onto-canonical-direction mapping.
- **Within-uptrend overbought handling (the `TECHNICAL_METHODOLOGY.md` §6 "expected co-occurrence, not a conflict" case) is handled here, not penalized**: `MomentumScore` does not reduce `TrendScore`, nor vice versa — both are reported as independent family scores feeding `TechnicalScore` (§1), exactly so that "strong uptrend, currently overbought" reads as high `TrendScore` + high `exhaustionContextScore`-flavored `MomentumScore`, an accurate, informative combination — not as a self-cancelling, averaged-down muddle.

---

## 4. Breakout Score (0-100)

**What it measures:** the strength of evidence for a genuine, holding breakout — directly extending the real, already-solid `analyzeBreakout()` logic (prior-range test, volume confirmation, retrospective failed-breakout check) per `TECHNICAL_METHODOLOGY.md` §7.

```
BreakoutScore = clamp(
    baseSignalScore
    + volumeConfirmationBonus
    + atrNormalizedMagnitudeBonus
    + holdDurationBonus
    - failedBreakoutPenalty
  , 0, 100)

baseSignalScore = 35 if NO_BREAKOUT (unchanged from today's real value)
                 = 75 if *_CONFIRMED (unchanged from today's real value)
                 = 60 if FAILED_BREAKOUT before other adjustments (unchanged)

volumeConfirmationBonus = a NEW continuous replacement for today's binary
                          1.2x cutoff:
                          clamp((lastVolume / avgVolume - 1) * 15, 0, 20)
                            — a breakout on 3x avg volume now meaningfully
                              outscores one on 1.21x, both of which score
                              identically today

atrNormalizedMagnitudeBonus = a NEW addition:
                               clamp(((lastClose - priorHigh) / atr) * 8, 0, 15)
                               for an upside breakout (mirrored for downside)
                                 — reuses the ATR this service already computes;
                                   a breakout closing 2 ATRs beyond the prior
                                   range now meaningfully outscores one closing
                                   0.05 ATRs beyond it

holdDurationBonus = a NEW addition, distinct from the existing retrospective
                     FAILED_BREAKOUT check:
                     +5 if the breakout has held (not reverted inside the
                        prior range) for >=2 sessions since it first triggered
                     +0 on the triggering session itself (no bonus yet —
                        honestly reflects that a same-day breakout has not
                        yet demonstrated it will hold)

failedBreakoutPenalty = -25 if signal === FAILED_BREAKOUT (already real,
                         retrospective; kept, made explicit as a named
                         penalty term rather than only a base-score swap)
```

- **Every added term reuses data `analyzeBreakout()` already computes internally today** (`avgVolume`, `lastVolume`, `priorHigh`/`priorLow`, `lastClose`, plus the ATR this same service computes elsewhere) — no new data source, no new indicator, purely a richer scoring function over what already exists, consistent with `TECHNICAL_METHODOLOGY.md` §7's "cheapest available improvement" framing.

---

## 5. Confidence Model

**What it measures:** how much to trust the `TechnicalScore` composite's own quality/completeness — a distinct axis from the score's magnitude, per this platform's established confidence-vs-magnitude separation.

```
TechnicalConfidence = clamp(
    dataSufficiencyScore * 0.35
  + familyAgreementScore * 0.30
  + freshnessScore        * 0.20
  + multiTimeframeCoverageScore * 0.15
  , 0, 100)
```

- **`dataSufficiencyScore`**: the fraction of the 11 underlying signals reporting `enoughDataStatus: SUFFICIENT` (already a real, computed fact today per-signal) — scaled to 0-100. A report built from 11 of 11 sufficient signals is structurally more trustworthy than one built from 5 of 11 (e.g., a recent IPO without 200 days of history for the trend indicator's full form) — reuses the existing `enoughDataStatus` field, adding no new computation, only a new aggregate.
- **`familyAgreementScore`**: per `TECHNICAL_METHODOLOGY.md` §6's conflict taxonomy — high when the family scores (Trend/Momentum/Structure) genuinely agree in direction after excluding expected co-occurrences (overbought-in-uptrend) and non-directional signals (volatility family); reduced, not zeroed, when a genuine cross-family divergence exists (e.g., `trend` bullish but `breakout` showing a confirmed downside break) — directly reuses the same disclosed, bounded conflict-discount mechanism `UNIFIED_SCORING_MODEL.md` §3 already designed for cross-agent conflicts, applied here within the Technical Agent's own families.
- **`freshnessScore`**: see `TECHNICAL_SIGNAL_PRIORITY.md` §4's per-indicator-category freshness model — a report is less confident when built from stale bars (an agent execution reusing yesterday's `priceHistoryProvider` fetch because the market is currently closed is honest and fine; one built from data several sessions old due to a real provider gap should score lower).
- **`multiTimeframeCoverageScore`**: `100` if the higher-timeframe check (§2) was actually performed and had sufficient data; a disclosed, lower fixed value (proposed: `60`) if only the single primary timeframe could be analyzed (e.g., insufficient weekly history) — never silently treated as equally confident as a genuinely multi-timeframe-confirmed read, mirroring the exact "a lower-tier data source caps rather than silently equals a higher-tier one" principle already used throughout this engagement (`OPTIONS_SCORING_MODEL.md`'s `provenanceCapAdjustment`).

No code was written to implement any of the above — this document, together with `TECHNICAL_METHODOLOGY.md` and `TECHNICAL_SIGNAL_PRIORITY.md`, is the design/decision record for whenever a real implementation phase begins, following the same "architecture → research → build" sequencing already proven for this platform's other agents.
