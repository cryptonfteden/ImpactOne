# Fibonacci Scoring Model — Confluence Score, Confidence Model, Swing Quality Score, Trend Alignment, Zone Strength

**Phase:** FIBONACCI-RESEARCH-001. Pure research/design — no production code was written. Every formula below extends the real, shipped `technicalIndicators.js`/`technicalIntelligenceService.js` and directly reuses the Technical Agent's own scoring machinery already designed in `TECHNICAL_SCORING_MODEL.md`/`TECHNICAL_SIGNAL_PRIORITY.md` (same engagement, immediately preceding phase) rather than inventing a parallel scoring system. Bound by the same governance as every other agent (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): every score below is evidence, never a verdict, and must never itself set or override `Recommendation.action`.

---

## 1. Confluence Score (0-100)

**What it measures:** how strongly a given Fibonacci level is corroborated by other, independently-derived technical facts — cross-timeframe Fibonacci agreement (`FIBONACCI_RESEARCH.md` §5) and cross-indicator agreement (§6).

```
ConfluenceScore = clamp(
    Σ over each independent confluence source within the ATR-normalized
      tolerance band of this level:
        sourceWeight(source) * independenceDiscount(source, alreadyCountedSources)
  , 0, 100)

sourceWeight:
    otherTimeframeFibLevel      = 30   (highest — an independently-anchored
                                         Fibonacci level from a different
                                         timeframe is the strongest, most
                                         Fibonacci-specific corroboration)
    supportResistancePivot      = 25   (reuses the same recentPivotHighs/
                                         recentPivotLows data recommended
                                         for reuse in FIBONACCI_RESEARCH.md §1/§6)
    movingAverageConfluence     = 20   (SMA20/50/200, EMA20 — already real,
                                         already computed by the Technical Agent)
    roundNumberConfluence       = 10   (a real, disclosed, lower-weighted
                                         factor — psychologically notable
                                         but not derived from price
                                         structure the way the other 3 are)

independenceDiscount(source, alreadyCountedSources) = a disclosed,
    hand-set value in [0,1], reduced when a newly-considered source is
    itself correlated with a source already counted for this same level
    (e.g., a 50-day SMA and a support/resistance pivot that happen to sit
    at nearly the same price because both reflect the same recent price
    history) — proposed default 1.0 (full weight) unless a specific,
    stated reason for discounting exists, mirroring the exact disclosed-
    default-independence convention already used in UNIFIED_SCORING_MODEL.md §4
    and TECHNICAL_SIGNAL_PRIORITY.md §1
```

- **Deliberately capped contribution per source category** (no single confluence source type can alone drive the score to its ceiling) — directly guards against the correlated-evidence-inflation risk `FIBONACCI_RESEARCH.md` §6 identifies, the same principle already applied one level up for cross-agent agreement (`UNIFIED_SCORING_MODEL.md` §4) and one level down for cross-indicator agreement within the Technical Agent (`TECHNICAL_SIGNAL_PRIORITY.md` §1).
- **A confluence score of 0 is a real, honest, valid result** — a Fibonacci level with no corroborating confluence is not fabricated as "somewhat confluent" by default; it is reported plainly as an isolated level, which is itself useful, disclosed information (a level with no other technical support is real but weaker evidence, not evidence to be hidden).

---

## 2. Confidence Model

**What it measures:** how much to trust this specific Fibonacci analysis overall — a composite of the other 4 named scores in this document, following this platform's established "confidence is a disclosed composite of named sub-scores, never independently fitted" convention.

```
FibonacciConfidence = clamp(
    swingQualityScore   * 0.35
  + trendAlignmentScore * 0.25
  + confluenceScore      * 0.25
  + freshnessScore       * 0.15
  , 0, 100)
```

- **`swingQualityScore`** carries the highest weight, deliberately — a Fibonacci analysis is only as good as the swing it's anchored to (§3 below); no amount of confluence or trend alignment can compensate for an anchor selected from a genuinely noisy, insignificant, or incoherent price move.
- **This composite explicitly excludes any notion of "was the retracement/extension level actually respected historically" as a confidence input for a *newly computed* analysis** — that is precisely what `ZoneStrength` (§5) measures, and it is reported as its own separate, explicit field rather than folded into overall confidence, since a level can be well-anchored, well-aligned with the trend, and well-confluent (all real, present-tense facts) even on the very first time it is ever approached, with no prior "zone strength" history yet to draw on — conflating the two would penalize every Fibonacci level's very first approach as if it were a defect, which it is not.

---

## 3. Swing Quality Score (0-100)

**What it measures:** how significant, clean, and well-formed the anchor swing itself is — directly implementing `FIBONACCI_RESEARCH.md` §1-2's swing-detection/anchor-selection research.

```
SwingQualityScore = clamp(
    magnitudeScore * 0.40
  + efficiencyScore * 0.35
  + recencyScore     * 0.25
  , 0, 100)

magnitudeScore = clamp((swingSizeATRNormalized / MIN_QUALIFYING_SWING_ATR - 1) * 40 + 50, 0, 100)
                   — a swing right at the minimum qualifying size (the
                     ZigZag-style filter's own threshold, FIBONACCI_RESEARCH.md
                     §1) scores near 50; a swing several multiples larger
                     scores toward 100

efficiencyScore = a NEW, recommended application of Kaufman's Efficiency
                   Ratio (a real, well-established, decades-old technical-
                   analysis concept — not invented for this platform):
                   efficiencyRatio = |swingEndPrice - swingStartPrice|
                                      / Σ|close_t - close_(t-1)| over the
                                        swing's own bar range
                   efficiencyScore = clamp(efficiencyRatio * 100, 0, 100)
                     — a swing that moved relatively directly from its
                       start to its end (a high ratio, close to 1/100)
                       is a "clean" swing; one with a great deal of back-
                       and-forth chop along the way (a low ratio) is a
                       noisier, less confidently-anchored swing even if
                       its net magnitude qualifies

recencyScore = clamp(100 - (barsSinceSwingCompleted / RECENCY_HALF_LIFE_BARS) * 50, FLOOR, 100)
                 (proposed RECENCY_HALF_LIFE_BARS: 20 trading days; proposed
                  FLOOR: 30 — an older, still-qualifying swing remains real,
                  disclosed evidence, just weighted down, never discarded
                  entirely, consistent with this platform's established
                  "decay, don't discard" freshness convention)
```

- **`efficiencyScore`'s use of Kaufman's Efficiency Ratio is this document's single most valuable original methodological contribution** — a real, decades-old, named, well-established technical-analysis statistic (best known as the core input to Kaufman's Adaptive Moving Average) applied here to a genuinely appropriate new purpose: distinguishing a clean, decisive swing (more likely to represent a real, structurally significant move that other market participants also perceive and will react to at its Fibonacci-derived levels) from a noisy, choppy one that happens to span a qualifying net distance almost by accident.

---

## 4. Trend Alignment (a signed value, not a plain 0-100 magnitude)

**What it measures:** whether the retracement/extension's implied directional bias agrees with the broader, independently-validated trend — directly reusing, not re-deriving, the Technical Agent's real `TrendScore`/ADX work.

```
TrendAlignment = clamp(
    trendDirectionAgreementSign * (technicalAgentTrendScore / 100) * adxFloorGate
  , -1, +1)

trendDirectionAgreementSign = +1 if the Fibonacci swing's implied bias
                                  (an uptrend pullback expecting eventual
                                  upside continuation, or a downtrend
                                  rally expecting eventual downside
                                  continuation) matches the Technical
                                  Agent's own canonical trend direction
                                  (reusing the SAME canonical direction
                                  taxonomy already designed in
                                  CONFLICT_RESOLUTION.md §2)
                             = -1 if it genuinely opposes the Technical
                                  Agent's trend direction
                             =  0 if the Technical Agent itself reports
                                  NEUTRAL/insufficient trend data

adxFloorGate = 0 if the Technical Agent's own real ADX-based trend-
               strength floor (TECHNICAL_SCORING_MODEL.md §2) reports
               "no real trend" — a Fibonacci retracement computed
               during a genuinely directionless, low-ADX regime should
               report ZERO trend alignment (neither agreeing nor
               disagreeing), not a fabricated small positive or
               negative value, since there is no real trend for it to
               align with or against in the first place
             = 1 otherwise
```

- **Deliberately a signed value in `[-1, +1]`, not a 0-100 magnitude score**, mirroring the same magnitude-vs-direction separation this engagement has applied consistently at every other layer (`ALGORITHMIC_ACTIVITY_SCORING.md`'s `ExecutionPressure`, `UNIFIED_SCORING_MODEL.md`'s explicit exclusion of direction from `OverallIntelligenceScore`) — a Fibonacci level whose bias *opposes* the dominant trend is real, useful, disclosed information (a "counter-trend" retracement setup, generally understood in practitioner terms to be lower-quality/higher-risk than a trend-aligned one, but not information to be hidden or silently zeroed out), and collapsing this into an unsigned 0-100 "alignment score" would lose exactly that distinction.
- **Only `abs(TrendAlignment)` feeds `FibonacciConfidence` (§2)** — both strong agreement and strong disagreement represent a *clear, well-validated* trend context (high confidence in knowing the relationship, even if that relationship is opposition); a value near 0 (genuinely no trend, or trend data unavailable) is the actual low-confidence case, and the composite formula in §2 should use `abs(TrendAlignment)` accordingly, not the raw signed value.

---

## 5. Zone Strength (0-100)

**What it measures:** how many times, historically, price has already approached and reacted to (paused at, reversed from, or otherwise respected) this specific Fibonacci-derived price level on this chart — the Fibonacci-specific analog of the touch-count-based support/resistance confidence already recommended in `TECHNICAL_SIGNAL_PRIORITY.md` §3.1.

```
ZoneStrength = clamp(
    Σ over each historical bar within the ATR-normalized tolerance band
      of this level, that also qualifies as a real local pivot
      (recentPivotHighs/recentPivotLows, reused directly per
      FIBONACCI_RESEARCH.md §1):
        touchWeight(touch)
  , 0, 100)

touchWeight(touch) = a disclosed, hand-set base value per genuine
                      qualifying touch (proposed: 20 points per touch,
                      diminishing for touches very close together in
                      time — e.g. touches within the same few sessions
                      of each other likely reflect one continuous
                      consolidation event, not multiple independent
                      tests, and should not each count at full weight,
                      the same "don't double-count correlated evidence"
                      principle applied here to TIME-clustering rather
                      than source-clustering)
```

- **A `ZoneStrength` of 0 (a level never previously touched/tested) is a genuine, honest, expected result for a freshly-computed retracement/extension** — not an error state, and explicitly **not** folded into `FibonacciConfidence` (§2), for the reason already stated there: penalizing every never-yet-tested level as low-confidence would be a real, avoidable distortion, since a level's *anchor quality* (§3), *trend alignment* (§4), and *confluence* (§1) are all knowable and meaningful before it has ever been tested even once.
- **`ZoneStrength` is the one score in this document explicitly designed to *grow* over time as new data arrives** — every other score in this document is computed fresh from the current swing/trend/confluence state, while `ZoneStrength` is a genuinely cumulative, historically-accreting measure, and should be recomputed/refreshed on the same cadence as this platform's other slow-moving baseline statistics (daily, not per-request — consistent with `OPTIONS_SCORING_MODEL.md` §6.2's and `VALUATION_SCORING_MODEL.md` §3.3's shared "recompute slow-moving baselines once per session close" convention).

---

## 6. Summary — how the 5 scores relate to each other

```
FibonacciConfidence = f(SwingQualityScore, |TrendAlignment|, ConfluenceScore, freshness)
                        — the report's headline "how much to trust this" number

ConfluenceScore  — an independent input to FibonacciConfidence, ALSO reported
                    on its own since a user may care specifically about
                    "how corroborated is this level" separate from overall trust

SwingQualityScore — the highest-weighted input to FibonacciConfidence,
                     reported on its own as the honest answer to
                     "was this a good anchor swing"

TrendAlignment    — a SIGNED, separate field (agreement vs. opposition vs.
                     no-real-trend), never collapsed into a magnitude-only
                     number, feeding FibonacciConfidence via its absolute value

ZoneStrength      — explicitly NOT an input to FibonacciConfidence — a
                     separate, cumulative, historically-accreting field
                     answering a genuinely different question ("has this
                     level already proven itself") than the other 4 scores
                     (which answer "is this a well-constructed analysis
                     right now")
```

No code was written to implement any of the above — this document, together with `FIBONACCI_RESEARCH.md` and `FIBONACCI_METHODOLOGY.md`, is the design/decision record for whenever a real implementation phase begins, contingent on the separate, already-noted frontend governance gate (`overlayRegistry.js`'s `pendingApproval`) being resolved.
