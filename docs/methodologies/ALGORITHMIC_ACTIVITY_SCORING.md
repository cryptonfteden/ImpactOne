# Algorithmic Activity Scoring Model

**Phase:** ALGORITHMIC-ACTIVITY-RESEARCH-001. Pure research/design — no production code was written. Every score defined here is **evidence about tape behavior, never a verdict about intent, identity, or manipulation** — bound by the same governance already enforced across this platform's other engines (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`; the Options Agent's and Valuation Agent's identical discipline in their own architecture docs). Follows the same disclosed, hand-set, bounded-adjustment convention already real and tested in `backend/services/optionsAgent/optionsAnomalyConfidence.js` — a sibling scoring model for a new domain, proposed as a future `scoringVocabulary.js` entry, not a parallel scoring system.

---

## 1. The four requested scores

### 1.1 Algorithmic Activity Score (0-100)

**What it measures:** the overall statistical evidence, across all signals in `ALGORITHMIC_ACTIVITY_RESEARCH.md` §2, that a security's current tape behavior shows systematic/programmatic execution patterns — **not** whether any specific algorithm, firm, or strategy is present, and **not** a judgment about legality or intent.

```
AlgorithmicActivityScore =
    vwapTwapTrackingComponent   * 0.25
  + fragmentationComponent      * 0.20
  + sweepDetectionComponent     * 0.20
  + obiComponent                * 0.15
  + quoteToTradeRatioComponent  * 0.10
  + hiddenLiquidityComponent    * 0.10
```

- **Weighting rationale (disclosed, hand-set, not fitted — no graded-outcome history exists yet for this brand-new domain, matching this platform's own "don't calibrate against too small a sample" discipline used elsewhere):** the two highest weights (VWAP/TWAP-tracking, fragmentation) are given to the signals rated **Strong** scientific defensibility in `ALGORITHMIC_ACTIVITY_RESEARCH.md` §2.1/§2.2/§2.10 and computable from the cheapest (L1) data tier — meaning this composite score should be **meaningfully computable even at MVP tier**, not gated entirely behind an enterprise data contract. Sweep detection (also Strong, §2.5) is weighted highly for the same reason. Quote-to-trade ratio and hidden-liquidity receive the lowest weights not because they're unimportant, but because — per §2.9/§2.4 — their "abnormality" determination depends on a real baseline that may be thinner at MVP (before the SEC/FINRA free calibration layer, per `ALGORITHMIC_ACTIVITY_RESEARCH.md` §4, is fully integrated).
- **Explicitly excluded from this composite:** quote stuffing (§2.6) and momentum ignition (§2.7) — both rated Speculative-to-Weak in the underlying research. Including them in a headline 0-100 score at anything but the lowest possible weight would misrepresent how little the tape alone can actually establish about either. Recommend these two remain **separately reported, low-confidence, heavily-caveated flags**, never folded into the main composite number where their weakness would be invisible to a consumer of the single headline score.
- **Iceberg confirmation (§2.3)** is included in the `hiddenLiquidityComponent` bucket only when L2/L3 data is actually available for that symbol; when only trade-tape data is available, the iceberg proxy contributes at a disclosed, reduced weight within that bucket — mirroring `OPTIONS_SCORING_MODEL.md`'s already-recommended `provenanceCapAdjustment` pattern (a lower-fidelity data tier caps, rather than silently equals, the contribution of a signal built from it).

### 1.2 Institutional Execution Score (0-100)

**What it measures:** specifically how consistent current tape behavior is with a **large, patient, institutional-style parent order being worked over time** — a narrower, more specific claim than the general Algorithmic Activity Score above.

```
InstitutionalExecutionScore =
    sustainedDirectionalityComponent * 0.35   // same-direction trade clustering,
                                                //  sustained over an extended window
                                                //  (not a single burst)
  + venuediversityComponent          * 0.25   // execution spread across multiple
                                                //  venues rather than one
  + vwapTwapTrackingComponent        * 0.25   // reused directly from §1.1, not
                                                //  recomputed independently
  + priceOpportunismComponent        * 0.15   // executions clustering near the
                                                //  prevailing NBBO rather than
                                                //  consistently crossing the full
                                                //  spread aggressively
```

- **Explicit design decision:** per `ALGORITHMIC_ACTIVITY_RESEARCH.md` §2.12, this score is a **composite reusing components already computed for the Algorithmic Activity Score**, not an independently re-derived detector — the two scores share real inputs and should be documented as related, not presented as if fully independent corroborating signals of each other (doing so would double-count the same underlying evidence under two different headline numbers, a real, avoidable error).
- **Confidence ceiling:** cannot exceed the confidence of its lowest-confidence contributing component (§2 of this document) — in practice, this is usually `vwapTwapTrackingComponent`'s own Moderate ceiling (per the research doc's own "the tape alone cannot attribute a pattern to one order/desk" limitation), meaning this score should rarely, if ever, be presented as high-confidence in absolute terms, only relative to other securities.

### 1.3 Liquidity Quality Score (0-100)

**What it measures:** how healthy/orderly the security's current liquidity provision looks — **a distinct axis from the two scores above**, oriented toward market-quality assessment rather than algorithmic-footprint detection, though it shares underlying data.

```
LiquidityQualityScore =
    spreadTightnessComponent      * 0.30   // bid-ask spread relative to the
                                             //  security's own historical baseline
  + depthComponent                * 0.25   // resting size at/near NBBO relative
                                             //  to baseline (L2-dependent; degrades
                                             //  gracefully to a top-of-book-only
                                             //  proxy at L1)
  + obiStabilityComponent         * 0.20   // how stable/mean-reverting the order
                                             //  book imbalance (§2.8) is, as
                                             //  distinct from its raw magnitude
  + quoteLifetimeComponent        * 0.15   // how long quotes persist before being
                                             //  updated/cancelled, benchmarked
                                             //  against the SEC's own free, public
                                             //  Quote Life Data Series (confirmed
                                             //  live, ALGORITHMIC_ACTIVITY_RESEARCH.md §3)
  + darkPoolShareComponent        * 0.10   // this security's dark/lit volume
                                             //  split vs. its own and the market's
                                             //  baseline (FINRA ATS data)
```

- **A genuinely different scoring direction from §1.1/§1.2**: a *high* Algorithmic Activity Score is a neutral-to-positive fact (systematic execution is normal, routine, and not inherently bad), whereas a *low* Liquidity Quality Score is closer to an actual, actionable market-quality concern (wide spreads, thin depth, erratic imbalance) — these two scores must never be blended into one number, since conflating "the tape looks systematic" with "the tape looks unhealthy" would be a real, misleading category error.
- **Directly benchmarkable against a free, official, government source**: the SEC's own Quote Life Data Series (hazard/survivor/cumulative-distribution functions of quote lifetimes, confirmed live) gives this platform a real, independent, credible baseline for `quoteLifetimeComponent` without needing to build that baseline from scratch out of its own accumulated history — a genuine, MVP-relevant advantage this domain has over, e.g., the Options Agent's bootstrap-from-nothing baseline problem.

### 1.4 Execution Pressure (a directional gauge, not a 0-100 score)

**What it measures:** the *directional* intensity of current execution activity — is buying or selling pressure currently dominant, and how strongly — as distinct from the three magnitude-only scores above.

```
ExecutionPressure = clamp(
    (buyInitiatedVolume - sellInitiatedVolume) / (buyInitiatedVolume + sellInitiatedVolume)
    * (1 + normalizedSweepIntensity)
  , -1, +1)
```

- **Buy/sell-initiated classification** uses the standard, well-established Lee-Ready-style tick-rule / quote-rule approach (a trade executing at/above the prevailing ask is presumptively buyer-initiated; at/below the bid, seller-initiated) — a real, decades-old, academically standard methodology, not a novel heuristic invented for this platform.
- **Deliberately expressed as a signed value in [-1, +1], not a 0-100 score** — direction is a first-class, distinct piece of information from magnitude, and collapsing it into a one-directional 0-100 scale (as the other three scores are) would either lose the sign entirely or require an awkward "50 = neutral" convention that most consumers would misread. This mirrors this platform's own hard-won "confidence and probability must never be collapsed into one axis" principle (verified real in the Claim Intelligence Layer's `aggregateConfidence`/`aggregateProbability` separation), applied here to magnitude vs. direction instead.
- **`normalizedSweepIntensity` term** amplifies the raw buy/sell imbalance when genuine sweep activity (§2.5, Strong defensibility) is present and directionally consistent with the imbalance — a real, disclosed corroboration bonus, capped to avoid the same runaway-amplification risk `optionsAnomalyConfidence.js`'s own bounded adjustment terms are designed to avoid.

---

## 2. Confidence model

### 2.1 Confidence is measured per-signal AND at the composite level, and is never a single number for the whole engine

Because the underlying signals span a very wide range of scientific defensibility (Strong: sweep detection, OBI, fragmentation; Moderate: VWAP/TWAP-tracking, institutional composite; Weak-to-Speculative: quote stuffing without L3, momentum ignition), **a single "confidence: 82" attached to the whole `AlgorithmicActivityScore` would actively mislead** by implying uniform evidentiary strength across a composite that is not uniform at all. Recommend instead:

```
signalConfidence(signal) = dataTierAvailableScore(signal) * scientificDefensibilityCeiling(signal)
                            * sampleAdequacyScore(signal)
```

- **`dataTierAvailableScore`**: 100 if the signal's *required* data tier (per `ALGORITHMIC_ACTIVITY_RESEARCH.md` §2's per-signal table) is actually available for this symbol/vendor combination today; a disclosed, lower fixed value (proposed: 40) if only a lower-tier proxy is being used instead (e.g., trade-tape-only iceberg inference instead of true L2/L3 confirmation) — never silently treated as equivalent to the full-tier version.
- **`scientificDefensibilityCeiling`**: a **hard, disclosed cap** per signal, directly derived from the Strong/Moderate/Speculative ratings in `ALGORITHMIC_ACTIVITY_RESEARCH.md` §2 (proposed: Strong → cap 100, Moderate → cap 70, Speculative → cap 35) — this is the single most important mechanism in this whole confidence model, since it prevents a signal that is *inherently* limited in what it can establish (e.g., momentum ignition, which cannot observe intent no matter how much data exists) from ever presenting as fully confident regardless of data quality or sample size.
- **`sampleAdequacyScore`**: a real minimum-observation-count gate (e.g., a security with only a handful of trades in the analysis window cannot support a statistically meaningful periodicity test for TWAP-tracking) — reuses this platform's own already-established "don't compute a statistic from too small a sample" discipline (`calibrationReportService.js`'s `MIN_SAMPLE_SIZE`, the Options Agent's bootstrap-window honesty).

### 2.2 Composite-score confidence is the weighted average of contributing signal confidences, never a separately-fitted number

`AlgorithmicActivityScore`'s own reported confidence should be the same weights used in §1.1's formula, applied to each signal's `signalConfidence` instead of its raw value — ensuring the composite's confidence structurally cannot exceed what its lowest-defensibility, highest-weighted component supports, rather than being an independently-chosen number that could accidentally overstate the whole.

### 2.3 A dedicated, mandatory momentum-ignition and quote-stuffing disclosure

Per §1.1's exclusion of these two signals from the main composite: whenever either is reported at all (as a separate, clearly-labeled flag, never inside the headline score), it must carry a fixed, non-negotiable disclosure string — e.g., *"Consistent with, but not proof of, [momentum ignition / coordinated rapid quote activity]. This pattern can also result from legitimate market activity including genuine news, large information-driven orders, or short squeezes. Market data alone cannot establish intent."* This is the single most important labeling requirement in this entire scoring model, directly following this mission's own explicit framing that the goal is never algorithm/actor identification.

---

## 3. Signal weighting — summary table

| Signal | Contributes to | Weight basis | Scientific defensibility ceiling |
|---|---|---|---|
| VWAP-tracking | Algorithmic Activity (0.25), Institutional Execution (0.25 via reuse) | Strong signal, L1-available, high weight | 100 (Moderate attribution ceiling reduces effective confidence, not the raw weight) |
| Fragmentation | Algorithmic Activity (0.20) | Strong, L1-available | 100 |
| Sweep detection | Algorithmic Activity (0.20) | Strong, precise Reg NMS definition | 100 |
| Order Book Imbalance | Algorithmic Activity (0.15), Liquidity Quality (0.20 via `obiStabilityComponent`) | Strong but L2-dependent for full rigor | 100 |
| Quote-to-trade ratio | Algorithmic Activity (0.10) | Strong metric, Moderate threshold-setting | 70 |
| Hidden liquidity / dark pool | Algorithmic Activity (0.10), Liquidity Quality (0.10) | Strong for labeled venue facts, Moderate for reserve-order inference | 100 (labeled fact) / 70 (inferred) |
| TWAP-tracking | Institutional Execution (via VWAP/TWAP shared component) | Strong statistical regularity, Moderate attribution | 100 / 70 |
| Iceberg confirmation | Hidden-liquidity bucket, reduced weight without L2/L3 | Strong at L2/L3, Speculative from trade-tape alone | 100 (L2/L3) / 35 (trade-tape proxy) |
| Quote stuffing | Separate flag, excluded from composite | Requires L3; Weak below that | 35 |
| Momentum ignition | Separate flag, excluded from composite | Cannot observe intent from any data tier | 35 (fixed, permanent ceiling regardless of data tier) |
| Execution speed (scoped) | Not a standalone score; feeds fragmentation/VWAP timing analysis | Strong for the honestly-scoped inter-trade-time statistic | 100 (scoped); not applicable for HFT-infrastructure-latency meaning |

---

## 4. Caching strategy

Reuses this engagement's own already-established recommendation (`OPTIONS_SCORING_MODEL.md` §6.1: do not build a 6th independent in-process cache; this platform already has 5+ per prior tech-debt findings) — adapted for this domain's specific data-freshness shape:

| Cached artifact | Recommended TTL | Rationale |
|---|---|---|
| Real-time trade/quote tape (for live signal computation) | Not cached — streamed/consumed once, persisted into this engine's own rolling aggregation window, not re-fetched | Same principle as the Options Agent's raw-print handling (`OPTIONS_SCORING_MODEL.md` §6.2) |
| Per-security historical baselines (VWAP-tracking tightness, fragmentation norms, quote-lifetime norms) | Recomputed once per session close, cached until the next close | These are slow-moving statistics; recomputing intraday wastes resources for no freshness benefit, identical reasoning to the Options/Valuation research's own baseline-caching recommendations |
| SEC Market Structure Data / FINRA ATS data (free, official, external) | Refreshed on the source's own actual publication cadence (SEC's series appear to publish with roughly a 1-2 month lag per the confirmed live page's "Dec. 2025" labeling seen this session; FINRA ATS data publishes weekly) — never re-pulled more frequently than the source itself updates | Matches `VALUATION_SCORING_MODEL.md` §3.3's identical reasoning for the Damodaran dataset — an external, slow-refreshing calibration source should be pulled on its own schedule, not an arbitrary internal one |
| Computed scores (`AlgorithmicActivityScore` etc.) for a given security/window | Short TTL during market hours (proposed: 1-5 minutes, matching typical vendor quote-refresh cadence per `OPTIONS_SCORING_MODEL.md` §6.2's chain-snapshot precedent); unbounded/last-known after close | No value recomputing faster than the underlying trade/quote data itself refreshes |

---

## 5. Rate limits

Directly inherited from whichever data-tier vendor is chosen per `ALGORITHMIC_ACTIVITY_RESEARCH.md` §4 — no new rate-limiting concern is introduced by this scoring model beyond what `OPTIONS_DATA_RESEARCH.md` §7 already established for the options-flow domain (Databento's usage-based/$-per-GB model vs. a hard per-minute call cap, depending on vendor). One domain-specific consideration: **L3/MBO data volume is substantially larger than L1/trade-tape data** (every individual order message, not just executions) — this has real implications for ingestion infrastructure cost/throughput that should be modeled explicitly before committing to a full-market L3 ingestion scope, rather than assumed to scale linearly from an L1 pilot's observed cost. Recommend piloting L3 ingestion against a small, deliberately-chosen symbol set (e.g., this platform's own already-tracked watchlist/portfolio universe) before any full-market rollout — the same "start scoped, prove the pattern, then expand" sequencing this engagement has recommended for every other new engine.

---

## 6. Scalability

- **Reuse this platform's existing `agentScheduler`/`providerIngestionService` infrastructure** (per the real, tested, committed Scheduler work reviewed in `PRODUCTION_READINESS_REVIEW.md`) rather than building a bespoke ingestion pipeline for this new agent — the same concurrency-ceiling, retry/backoff, and per-provider rate-limiting mechanisms already proven for the other agents apply identically here.
- **The single biggest scalability-shaping decision unique to this domain**: whether L3/MBO ingestion runs **per-symbol on demand** (only when a user/agent actually requests algorithmic-activity intelligence for a specific security) versus **continuously across a fixed universe** — given L3 data's materially higher volume (§5), recommend **on-demand, per-symbol ingestion scoped to this platform's own tracked-symbol universe** (the same "reuse the existing scan universe, don't invent a second one" principle already established in `OPTIONS_AGENT_ARCHITECTURE.md` §3) rather than attempting full-market continuous L3 ingestion, which would be a materially larger, more expensive undertaking disproportionate to this platform's actual current registry size (per `PRODUCTION_READINESS_REVIEW.md`'s own finding that today's real registry is only 3 real agents plus honest stubs, not yet exercised at scale).
- **Horizontal-scaling caveat, directly inherited from `PRODUCTION_READINESS_REVIEW.md`'s own headline finding**: if this new agent is ever deployed across multiple backend instances, its own in-process baselines/caches (§4) would fragment exactly the same way the Scheduler's concurrency pool and Observability's execution log were found to fragment — this is not a new risk this research introduces, but an existing, already-documented platform-wide gap this new agent would simply inherit, and should be accounted for in the same remediation effort (a shared coordination layer) rather than solved a second, separate time specifically for this agent.

---

## 7. Summary — what to build first, and what to defer

1. **Ship first (Strong defensibility, L1-sufficient, free-calibratable):** fragmentation, VWAP/TWAP-tracking, sweep detection, execution-speed (scoped), the labeled dark/lit venue split.
2. **Ship second, once L2/L3 access exists (Production tier):** rigorous iceberg confirmation, true multi-level Order Book Imbalance, a stronger (though still not enterprise-grade) quote-to-trade-ratio signal.
3. **Ship only as clearly-labeled, low-confidence, heavily-caveated flags, never inside the headline composite score, at any tier:** quote stuffing (until true L3/enterprise data exists), momentum ignition (permanently, regardless of data tier, since its core limitation is about observability of intent, not data richness).
4. **Reuse, don't rebuild:** this platform's existing scheduler/ingestion infrastructure, its existing tracked-symbol universe (no second hardcoded universe), and the free SEC/FINRA calibration data as a permanent baseline source alongside whichever paid vendor is chosen.

No code was written to implement any of the above — this document is the design/decision record for whenever a real implementation phase (following the same "architecture → research → build" sequencing already proven for the Options and Valuation Agents) begins.
