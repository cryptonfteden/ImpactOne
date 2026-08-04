# Valuation Scoring Model — Confidence, Negative Earnings, and Sector Normalization

**Phase:** VALUATION-RESEARCH-001. Pure research/design — no production code was written. Companion to `VALUATION_RESEARCH.md` (formulas/data sources) and `FAIR_VALUE_METHODOLOGY.md` (Fair Value/Buy Zone/Strong Buy Zone calculations, which this confidence model gates). Follows the same disclosed, hand-set, bounded-adjustment convention already real and tested in `backend/services/optionsAgent/optionsAnomalyConfidence.js` — this is a sibling scoring model for a new domain, not a redesign of that one, and should eventually be proposed as its own `scoringVocabulary.js` entry (e.g. `valuationConfidence`) rather than a parallel scoring system, exactly as `OPTIONS_SCORING_MODEL.md` already recommended for the Options Agent.

---

## 1. Confidence model

### 1.1 Design principle: confidence measures evidence quality, not price attractiveness

The Fair Value estimate's `discountToFairValue` (how cheap/expensive the stock looks) and its `fairValueConfidence` (how much to trust that estimate) are **two independent axes**, exactly mirroring this platform's own already-established, hard-won principle that confidence and probability/likelihood must never be collapsed into one number (`AI_CORE_001_REVIEW`'s confirmed finding that the Claim Layer's `aggregateConfidence`/`aggregateProbability` share zero input variables — the same discipline applies here). A large discount computed from thin data must read as **"a large but *uncertain* discount,"** never as an equally strong signal as the same discount computed from rich, mutually-agreeing data.

### 1.2 The four confidence components

```
valuationConfidence = dataCompletenessScore * 0.30
                    + methodAgreementScore   * 0.30
                    + peerGroupQualityScore  * 0.25
                    + earningsQualityScore   * 0.15
```

Every term is a bounded 0-100 sub-score with a disclosed, hand-set formula (never a fitted/opaque weight, matching `optionsAnomalyConfidence.js`'s own convention) — each documented below.

#### 1.2.1 `dataCompletenessScore` — how many of the 7 methods could actually be computed

```
dataCompletenessScore = (usableMethodCount / totalApplicableMethodCount) * 100
```

Critically, `totalApplicableMethodCount` is **not always 7** — for a negative-earnings company, P/E, Forward P/E, and PEG are structurally inapplicable from the start (§2 below), so they must be excluded from the denominator entirely, not counted as "missing" data that lowers the score unfairly. A negative-earnings company that has good revenue, book-value, and cash-flow data available should be able to reach a high `dataCompletenessScore` using only its 3-4 structurally-applicable methods — the score measures "how complete is the data we could reasonably expect," not "did all 7 formulas produce a number."

#### 1.2.2 `methodAgreementScore` — do the usable methods roughly agree?

```
impliedPrices = [list of each usable method's implied fair price, per FAIR_VALUE_METHODOLOGY.md §1.2]
coefficientOfVariation = stdDev(impliedPrices) / mean(impliedPrices)

methodAgreementScore = clamp(100 - (coefficientOfVariation * 200), 0, 100)
  // a CoV of 0 (perfect agreement) -> 100
  // a CoV of 0.5 (methods disagree by roughly half the mean) -> 0
  // the exact scaling constant (200) is a disclosed, hand-set choice for this MVP,
  // not a fitted value — flagged explicitly as a candidate for recalibration once
  // real graded-outcome history exists, following this platform's own established
  // "don't calibrate against too small a sample" discipline (CALIBRATION_REVIEW.md)
```

Requires at least 2 usable methods to compute at all; with exactly 1 usable method, `methodAgreementScore` is undefined and should be treated as a fixed, disclosed low value (proposed: 40/100) rather than a fabricated "perfect agreement with itself" 100 — a single-method fair-value estimate is real, honest, and worth showing, but should never present as equally confident as a multi-method one, mirroring the same "one detector firing scores lower than two corroborating ones" principle already used by `optionsAnomalyConfidence.js`'s `CLASSIFICATION_STRENGTH` table (`SWEEP` alone = 75, `SWEEP+BLOCK` together = 90).

#### 1.2.3 `peerGroupQualityScore` — is the sector comparison group big enough to mean anything?

```
peerGroupQualityScore = clamp((peerGroupSize / MINIMUM_HEALTHY_PEER_GROUP_SIZE) * 100, 0, 100)
  // proposed MINIMUM_HEALTHY_PEER_GROUP_SIZE: 8-10 real peers with usable data in the
  // same finnhubIndustry classification
```

Directly addresses the real gap named in `VALUATION_RESEARCH.md` §9: this platform's own tracked-symbol universe may only contain a handful of names in a niche `finnhubIndustry` bucket. A sector-relative multiple computed against 2 peers is real, but far less trustworthy than one computed against 15 — this score makes that distinction explicit and visible rather than silently treating every sector-median calculation as equally solid regardless of sample size, directly reusing the sample-size-honesty lesson already learned the hard way in `calibrationReportService.js`'s `MIN_SAMPLE_SIZE` gate and the Options Agent's own bootstrap-window discipline.

#### 1.2.4 `earningsQualityScore` — a check against GAAP-vs-adjusted and one-time-item distortion

```
earningsQualityScore = 100
  - (largeOneTimeItemFlag ? 30 : 0)     // a disclosed one-time gain/charge materially
                                         // distorts trailing EPS/EBITDA for this period
  - (gaapAdjustedEpsDivergenceFlag ? 20 : 0)   // GAAP and non-GAAP adjusted EPS diverge
                                                // by more than a disclosed threshold
                                                // (proposed: 15%) — a real, checkable
                                                // divergence, not an accusation, simply
                                                // a reason for lower confidence in
                                                // whichever EPS figure was used
  - (negativeEarningsFlag ? 10 : 0)      // a smaller, separate penalty from the
                                         // dataCompletenessScore treatment above —
                                         // even when P/E is correctly excluded rather
                                         // than fabricated, a negative-earnings company's
                                         // remaining metrics (P/S, FCF Yield) still carry
                                         // somewhat more inherent uncertainty about the
                                         // business's eventual profitable-scale economics
```

### 1.3 Confidence-to-zone gating (cross-referenced from `FAIR_VALUE_METHODOLOGY.md`)

| Confidence band | Zone labeling permitted |
|---|---|
| `valuationConfidence < 40` | No zone label at all — show the Fair Value estimate and discount with an explicit **"limited data — treat this estimate as indicative only"** disclosure, never a Buy Zone/Strong Buy Zone badge |
| `40 <= valuationConfidence < 65` | Standard Buy Zone eligible (if the discount/ROIC gates in `FAIR_VALUE_METHODOLOGY.md` §2 also pass); Strong Buy Zone not eligible regardless of discount size |
| `valuationConfidence >= 65` | Both Buy Zone and Strong Buy Zone eligible (subject to their own respective, stricter discount/ROIC/agreement gates) |

These specific numeric thresholds (40/65) are disclosed, hand-set starting points for an MVP — explicitly flagged, like every other constant in this document, as provisional and appropriate to revisit once real graded-outcome history exists (reusing this platform's already-built `Outcome`/`calibrationReportService.js` infrastructure rather than inventing a parallel calibration mechanism for this engine, exactly as `OPTIONS_SCORING_MODEL.md` §2.2 already recommended for the Options Agent).

---

## 2. Handling companies with negative earnings

### 2.1 The core rule: exclude, never compute-and-display a nonsensical value

A negative P/E (price divided by negative EPS) is **mathematically valid but practically meaningless** — it does not mean "the stock is incredibly cheap," and naively computing it produces a real, well-known screener bug class (a company with -$0.10 EPS at a $50 share price yields a P/E of -500, which sorts and displays nonsensically alongside genuinely low, meaningful P/E values like 8 or 12). The rule for this platform, consistent with its "never fabricate, honestly return null" discipline used everywhere else (the Options Agent's bootstrap-window handling, `qualityDashboardService.js`'s undersampled-null convention):

```
if (EPS <= 0):
    peRatio = null            // never computed
    forwardPeRatio = null (if forwardEPS <= 0 too — computed independently,
                             since a company can have negative trailing EPS
                             but a positive forward estimate, or vice versa)
    pegRatio = null            // depends on P/E, excluded whenever P/E is excluded
```

### 2.2 What remains usable, and in what order of preference

Per `VALUATION_RESEARCH.md` §6-7's findings, the fallback hierarchy for a negative-earnings company is:

1. **Free Cash Flow Yield, if FCF > 0** — the single best fallback signal, since it directly measures real cash generation even when GAAP accounting (depreciation, stock-based comp, one-time charges) produces a negative reported profit.
2. **Price/Sales** — always computable as long as revenue is positive and known (true for almost every real operating company, pre-revenue or shell companies being the rare genuine exception), and the standard primary multiple for growth-stage companies in professional practice.
3. **Price/Book** — usable if book value is meaningfully positive, though less informative for asset-light businesses (`VALUATION_RESEARCH.md` §6's own caveat applies regardless of earnings sign).
4. **EV/EBITDA** — usable only if EBITDA itself is positive; a company with negative EBITDA (not just negative net income) has no usable multiples-based method left at all from this list, and should receive an honest `insufficientDataForFairValue` result rather than any composite estimate — mirroring the Options Agent's own `computeAnomalyScore()` returning `null` rather than fabricating a score from zero real classification signal.

### 2.3 A genuinely unresolvable case, and the honest response

Pre-revenue or near-zero-revenue companies (e.g., early-stage biotech) with negative earnings, negative FCF, and minimal book value have **no usable method from this entire suite** — the correct response is an explicit `"insufficientDataForFairValueEstimate: true"` result with a plain-language reason (e.g., *"This company does not yet generate meaningful revenue or cash flow, so a multiples-based fair value estimate cannot be honestly computed today."*) — never a forced estimate from whatever partial data exists, and never silently omitting the symbol from view without explanation. This is the same honesty pattern this whole engagement has praised repeatedly (`altDataService.js`'s fallback labeling, the Impact Graph's "the chain is genuinely unknown, not fabricated" empty state) — extended here to a case this specific domain will genuinely and routinely encounter, not a hypothetical edge case.

### 2.4 Disclosure requirement

Whenever any method is excluded per §2.1-2.3, the resulting Fair Value output must carry an explicit, itemized list of which methods were excluded and why (`excludedMethods: [{method: "P/E", reason: "Negative trailing EPS"}, ...]`) — never a silent gap a user could mistake for the platform simply not having bothered to compute it.

---

## 3. Sector normalization — scoring mechanics

*(Conceptual rationale already covered in `VALUATION_RESEARCH.md` §9; this section defines the specific scoring/computation mechanics.)*

### 3.1 Two complementary representations, not just one

For every multiple, compute **both**:

1. **Percentile rank within the sector peer group** (e.g., "cheaper than 78% of its `finnhubIndustry` peers on EV/EBITDA") — robust to outliers, intuitive, and does not assume the peer distribution is normally shaped.
2. **Z-score within the sector peer group** (`(companyValue - peerMean) / peerStdDev`) — more precise about *how far* outside the norm a company sits, useful for the `methodAgreementScore`/dispersion calculations in §1.2.2, but more sensitive to outlier peers than the percentile-rank view.

Recommend presenting the percentile rank as the primary user-facing figure (more intuitive, less likely to be misread by a non-technical user — consistent with this platform's stated retail/beginner-friendly audience per `COMPANY_STRATEGY_REVIEW.md`) while using the z-score internally for the confidence and gating calculations in §1-2 and `FAIR_VALUE_METHODOLOGY.md`.

### 3.2 Peer-group construction rules

1. Group by `finnhubIndustry` (already live in this codebase, per `VALUATION_RESEARCH.md` §1) — never invent a second, parallel sector taxonomy.
2. Exclude the company itself from its own peer group's median/mean/stdDev calculation (a basic but easy-to-miss correctness requirement — self-inclusion silently biases every company's own z-score/percentile slightly toward the "average" band).
3. Exclude peers whose own data for that specific metric is null/excluded per §2 (e.g., don't let a peer's excluded P/E silently become a `0` that drags down the peer group's average P/E) — apply the exact same exclude-don't-fabricate rule to the peer group's own construction, not just to the subject company's own metrics.
4. When `peerGroupSize` is below the healthy-sample floor (§1.2.3), supplement with the broader Damodaran industry-average dataset (`VALUATION_RESEARCH.md` §10) as a disclosed, explicitly-labeled fallback comparison group, rather than silently proceeding with a too-small in-platform peer group as if it were fully reliable.

### 3.3 Refresh cadence

Sector peer-group statistics (median/mean/stdDev per industry per metric) should be recomputed on a **daily** cadence (not per-request) — these are slow-moving aggregate statistics, not real-time signals, and recomputing them on every single valuation request would be wasted work for no meaningful freshness benefit, exactly the same reasoning already applied to `OPTIONS_SCORING_MODEL.md` §6.2's "computed baseline, recomputed once per session close" caching recommendation. The Damodaran dataset (an external supplement) refreshes on its own independent, much slower cadence (periodic, not daily) and should simply be re-pulled whenever the platform checks for a new published version, not on a fixed internal schedule.

---

## 4. Summary of concrete, actionable design decisions for whenever implementation resumes

1. `valuationConfidence` composite (`dataCompletenessScore*0.30 + methodAgreementScore*0.30 + peerGroupQualityScore*0.25 + earningsQualityScore*0.15`), each sub-score disclosed and hand-set, none fitted at MVP.
2. Confidence-gated zone labeling: <40 no zone label, 40-65 standard Buy Zone only, ≥65 both zones eligible (subject to `FAIR_VALUE_METHODOLOGY.md`'s own discount/ROIC/agreement gates).
3. Negative-earnings handling: exclude P/E/Forward P/E/PEG outright (never compute a nonsensical negative-divided-by-negative value); fall back in order to FCF Yield (if positive) → P/S → P/B → EV/EBITDA (if EBITDA positive); an honest `insufficientDataForFairValueEstimate` result for the genuinely unresolvable pre-revenue/pre-cash-flow case.
4. Every exclusion itemized and disclosed (`excludedMethods` with a plain-language reason per entry) — never a silent gap.
5. Sector normalization via `finnhubIndustry` peer grouping, both percentile-rank (user-facing) and z-score (internal gating) computed, self-exclusion and excluded-peer-data-exclusion enforced, Damodaran dataset as a disclosed fallback for thin peer groups, daily refresh cadence.

No code was written to implement any of the above — this document is the design/decision record for whenever a real implementation phase (following the same "architecture → research → build" sequencing already proven for the Options Agent) resumes.
