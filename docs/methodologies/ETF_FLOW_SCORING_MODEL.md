# ETF Flow Scoring Model — ETF Flow Score, Flow Strength, Persistence Score, Rotation Score, Exposure Score, Confidence Model, Freshness Model

**Phase:** ETF-FLOW-RESEARCH-001. Pure research/design — no production code was written. Every formula below is grounded in `ETF_FLOW_RESEARCH.md`'s central finding — the primary-vs-secondary-market distinction (§2) — and reuses this platform's real, existing `sectorEtfMap.js` (§4/Rotation Score) rather than inventing a parallel taxonomy. Bound by the same governance as every other agent in this platform (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): every score below is evidence, never a verdict, and must never itself set or override `Recommendation.action`.

---

## 1. ETF Flow Score (0-100, with an explicit signed lean reported alongside)

**What it measures:** the overall magnitude of well-supported net fund-flow evidence — for a specific ETF, or, when this evidence is being surfaced in the context of an individual stock, the flow evidence aggregated across every ETF holding that stock, weighted by each fund's own position size in it (per `ETF_FLOW_RESEARCH.md` §6).

```
ETFFlowScore = clamp(
    flowStrengthComponent   * 0.45
  + persistenceScoreComponent * 0.30
  + rotationScoreComponent    * 0.25
  , 0, 100)          — magnitude-only; a SEPARATE signed field
                        (flowLean, in [-1,+1]) reports whether the net
                        evidence leans toward inflows or outflows,
                        reusing the same magnitude-vs-direction
                        separation established platform-wide
                        (ExecutionPressure, TrendAlignment, insiderLean,
                        Claim Layer confidence-vs-probability)
```

- **This score is only computed from genuine primary-market flow data (real shares-outstanding changes), never from secondary-market trading volume** — directly enforcing `ETF_FLOW_RESEARCH.md` §2's headline finding. If only volume data is available for a given fund (no real flow data source configured), `ETFFlowScore` must report an honest `insufficientData` result rather than silently substituting volume as a flow proxy — the single most important guardrail in this entire scoring model.
- **When applied at the individual-stock level** (aggregating across every ETF holding that stock), each contributing fund's flow evidence is weighted by that fund's **position size in the stock relative to the stock's own total shares outstanding** — not simply by the fund's own AUM — so a small fund with a large concentrated position in one stock can contribute meaningfully more to that stock's aggregate score than a much larger, broadly-diversified fund with only a token position in it.

## 2. Flow Strength (0-100)

**What it measures:** the magnitude of the *current* period's net flow, normalized against the fund's **own historical baseline** — never presented as a raw dollar figure alone, directly reusing this whole research series' established "normalize by the entity's own baseline, never an absolute threshold" principle (already applied to options volume-vs-baseline, sentiment velocity-vs-baseline, and insider ownership-percentage-vs-own-holdings).

```
FlowStrength = clamp(
    (currentPeriodNetFlow / fund's own trailing baseline average
     net flow magnitude) * FLOW_STRENGTH_SCALING
  , 0, 100)

+ accelerationAdjustment  (per ETF_FLOW_RESEARCH.md §9 — a SEPARATE,
                            disclosed, additive term measuring whether
                            the PACE of flow is itself increasing or
                            decreasing period-over-period, distinct from
                            the raw magnitude above; a real, bounded
                            bonus/penalty, not folded silently into the
                            base magnitude number)
```

- **A $50M inflow into a $500M fund is treated as a materially stronger signal than the same $50M inflow into a $50B fund** — the baseline-normalization is what makes this comparison honest; an un-normalized absolute-dollar approach would systematically overweight the largest, most well-known funds purely because of their size, not because their flows are more informative.
- **`accelerationAdjustment` is this score's own explicit encoding of Flow Acceleration** (rather than defining Acceleration as a wholly separate top-level score, since the mission's own requested score list does not name one independently) — kept as a clearly-labeled, separately-reported sub-component within `FlowStrength`, never blended so thoroughly into the base magnitude that a user cannot tell "is this a big flow" from "is the pace of this flow speeding up" as two distinct facts.

## 3. Persistence Score (0-100)

**What it measures:** whether a flow direction has been sustained across **multiple consecutive periods**, as opposed to a single, isolated event — per `ETF_FLOW_RESEARCH.md` §8, the direct corroborating check against §4/Rotation Score's own false-positive risk (a one-off rebalancing event misread as a genuine, sustained rotation).

```
PersistenceScore = clamp(
    consecutiveSameSignPeriods / EXPECTED_PERSISTENCE_WINDOW_PERIODS * 100
  , 0, 100)          (proposed EXPECTED_PERSISTENCE_WINDOW_PERIODS: 5
                       trading days/periods — a flow direction sustained
                       across most of a trading week is treated as
                       genuinely persistent, not merely a one-day event)
```

- **Deliberately distinct from `FlowStrength`'s `accelerationAdjustment` (§2)** — persistence measures whether the *sign/direction* continues; acceleration measures whether the *magnitude* is changing — the same genuinely distinct concepts already separated in this research series' Sentiment Trend vs. Sentiment Velocity design (`SENTIMENT_SCORING_MODEL.md` §2-3), reused here rather than reinvented. A fund can show high persistence (inflows every day this week) with low or even negative acceleration (each day's inflow slightly smaller than the last) — a real, informative combination this separation preserves rather than collapses.

## 4. Rotation Score (a signed value in [-1, +1], not a plain 0-100 magnitude)

**What it measures:** relative flow strength **across** the sector-ETF basket (`sectorEtfMap.js`'s real 11 SPDR sector ETFs) — a genuinely cross-sectional concept, distinct from `FlowStrength`'s single-fund, own-baseline-relative computation.

```
RotationScore(sector) = clamp(
    (sectorETF.flowStrength - crossSectionalMeanFlowStrength)
    / crossSectionalStdDevFlowStrength
  , -1, +1)          — a real, standard cross-sectional z-score-style
                        computation: how much this sector's own flow
                        strength deviates from the SAME-day average
                        across all 11 sector ETFs, not an absolute
                        threshold
```

- **Deliberately signed and bounded to `[-1, +1]`, not a plain 0-100 magnitude** — rotation is inherently a *relative, directional* concept (money moving *out of* one sector and *into* another), and collapsing it into a magnitude-only score would lose exactly the "which way is the rotation going" information that makes this signal useful, the same magnitude-vs-direction discipline applied consistently throughout this platform's scoring models.
- **Should only be reported alongside `PersistenceScore` (§3), never in isolation** — per `ETF_FLOW_RESEARCH.md` §4's own false-positive caution, a single day's rotation reading, however statistically large, should be presented with an explicit confidence discount when persistence is low, directly reused via `InsiderConfidence`-style composite design (§6 below).

## 5. Exposure Score (0-100, an explicitly contextual/moderating score, never a directional signal)

**What it measures:** how much of a given **stock's** own price action is mechanically linked to ETF-level flows — the direct operationalization of `ETF_FLOW_RESEARCH.md` §6's ETF Ownership Concentration finding.

```
ExposureScore = clamp(
    (aggregateETFHeldValue / stockTotalMarketCap) * 100 * EXPOSURE_SCALING
  , 0, 100)
```

- **This score is explicitly, deliberately NEVER treated as a directional/bullish-bearish signal on its own** — per `ETF_FLOW_RESEARCH.md` §5-6's own finding, high ETF ownership concentration is a *contextual* fact (a meaningful share of this stock's trading is fund-mechanics-driven, not purely stock-specific-information-driven), not itself evidence of anything bullish or bearish. Its real, correct use is as a **discount factor** applied to other, purely stock-specific signals (e.g., a Technical Agent's own breakout signal for a heavily ETF-owned stock should be reported with a disclosed note that a meaningful share of that stock's volume/price action may be fund-flow-mechanical rather than purely idiosyncratic) — this cross-agent moderating role should be designed as an explicit, disclosed input available to other agents/the Unified Scoring layer, not a hidden internal detail of the ETF Flow Agent alone.
- **A stock with a very low `ExposureScore` should honestly report that ETF-flow-derived evidence is largely inapplicable/low-relevance for it** — an honest "not applicable" framing, never a fabricated attempt to force a low-relevance signal into the same presentation as a high-relevance one.

## 6. Confidence Model

**What it measures:** how much to trust the overall `ETFFlowScore` composite — a disclosed weighted composite of data-quality factors, distinct from the score's own magnitude/direction.

```
ETFFlowConfidence = clamp(
    dataSourceQualityScore * 0.35   (100 if sourced from genuine
                                      shares-outstanding/creation-unit
                                      data per ETF_FLOW_RESEARCH.md §2;
                                      a disclosed, materially LOWER fixed
                                      value if any proxy/estimate is
                                      used instead — this weighting
                                      reflects that §2's primary-vs-
                                      secondary-market distinction is
                                      THE central risk in this whole
                                      domain, deserving the highest
                                      single weight in this composite)
  + persistenceCorroboration * 0.25  (reuses PersistenceScore directly —
                                       a rotation/flow reading corroborated
                                       by real persistence is more
                                       trustworthy than an isolated
                                       single-period reading)
  + sampleAdequacyScore      * 0.20  (per this research series' own
                                       repeated "don't over-claim from a
                                       thin sample" discipline — a
                                       genuinely short flow history for
                                       a newly-launched fund should
                                       report lower confidence, honestly)
  + freshnessScore            * 0.20  (§7)
  , 0, 100)
```

- **`dataSourceQualityScore` carries the highest single weight in this composite, deliberately** — reflecting that the primary-vs-secondary-market conflation risk (`ETF_FLOW_RESEARCH.md` §2) is the single most consequential, most likely-to-be-gotten-wrong risk in this entire research domain, and the confidence model should weight guarding against it more heavily than any other single factor.

## 7. Freshness Model

**What it measures:** how current the underlying flow evidence is — with a real, disclosed, **two-tier** complication unique to this domain, per `ETF_FLOW_RESEARCH.md` §11's own finding that SEC Form N-PORT data (the authoritative regulatory source) carries a genuine ~60-day public-disclosure delay, materially slower than a commercial vendor's typical daily shares-outstanding-based tracking.

```
freshnessScore(source) =
    IF sourced from daily shares-outstanding/NAV tracking
       (a commercial vendor, an exchange's own daily publication, or an
        issuer's own daily file, per ETF_FLOW_DATA_STRATEGY.md):
        clamp(100 - (daysSinceLastUpdate / EXPECTED_DAILY_WINDOW) * 100, FLOOR, 100)
          (proposed EXPECTED_DAILY_WINDOW: 2-3 days — this data SHOULD
           be current within a day or two under normal operation; a
           longer gap signals a real data-pipeline problem, not an
           expected condition)
    IF sourced from SEC Form N-PORT filings directly:
        a FIXED, disclosed, LOW ceiling (proposed: 40/100) regardless of
        how recently the filing itself was processed — honestly
        reflecting that N-PORT data is INHERENTLY ~60 days stale by
        regulatory design, a structural ceiling this platform cannot
        engineer its way past merely by processing a new filing
        promptly the moment it's published
```

- **This is a genuinely different freshness treatment than every other agent in this research series** — most of this platform's other new agents (Options, Sentiment, Insider) can meaningfully improve their own freshness by simply processing new data faster; **ETF flow data sourced from the authoritative regulatory filing itself has a hard, structural ~60-day ceiling no amount of processing speed can overcome**, and this должно be disclosed as a permanent characteristic of that specific data source, not a fixable latency problem — directly analogous to `ALGORITHMIC_ACTIVITY_SCORING.md`'s permanent, non-improvable confidence ceiling for momentum ignition, applied here to a data-freshness dimension instead of a signal-defensibility dimension.

---

## 8. Summary — how the 7 scores relate to each other

```
ETFFlowScore        — magnitude-and-lean headline composite, built from
                        FlowStrength + PersistenceScore + RotationScore,
                        computed ONLY from genuine primary-market flow
                        data, NEVER from secondary-market volume

FlowStrength        — own-baseline-normalized current-period magnitude,
                        WITH an explicit, separately-labeled acceleration
                        sub-component (rate of change of the magnitude)

PersistenceScore    — direction-continuity across consecutive periods,
                        genuinely distinct from FlowStrength's own
                        acceleration sub-component (sign-continuity vs.
                        magnitude-of-change)

RotationScore       — a SIGNED [-1,+1] cross-sectional (not single-fund)
                        z-score across the real sectorEtfMap.js basket,
                        should never be reported without PersistenceScore
                        alongside it

ExposureScore       — a DELIBERATELY non-directional, contextual/
                        moderating score (how much of a STOCK's own
                        action is ETF-flow-mechanical) — never itself a
                        bullish/bearish signal, correctly used to
                        discount OTHER agents' stock-specific signals
                        for heavily-ETF-owned stocks

ETFFlowConfidence   — a disclosed composite weighted most heavily
                        toward genuine-primary-market-data-sourcing
                        quality, since that is this domain's single
                        biggest risk

Freshness           — a genuinely TWO-TIER model: daily-tracking sources
                        can be near-real-time; SEC Form N-PORT sources
                        carry a PERMANENT, structural ~60-day ceiling
                        that cannot be engineered away
```

No code was written to implement any of the above — this document, together with `ETF_FLOW_RESEARCH.md` and `ETF_FLOW_DATA_STRATEGY.md`, is the design/decision record for whenever a real implementation phase begins, following the same "architecture → research → build" sequencing already proven for this platform's other agents.
