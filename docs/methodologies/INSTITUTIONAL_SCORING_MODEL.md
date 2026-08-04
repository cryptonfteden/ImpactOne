# Institutional Scoring Model — Institutional Score, Ownership Score, Conviction Score, Concentration Score, Smart Money Score, Confidence Model, Freshness Model

**Phase:** INSTITUTIONAL-RESEARCH-001. Pure research/design — no production code was written. Every formula below is grounded in `INSTITUTIONAL_RESEARCH.md`'s findings — most importantly, the ~45-135-day structural staleness of 13F data (§1/§9) and the real epistemic caution around "smart money" labeling (§8). Bound by the same governance as every other agent in this platform (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): every score below is evidence, never a verdict, and must never itself set or override `Recommendation.action`.

---

## 1. Institutional Score (0-100, with an explicit signed lean reported alongside)

**What it measures:** the overall magnitude of well-supported institutional-ownership evidence for a symbol — the headline composite.

```
InstitutionalScore = clamp(
    ownershipScoreComponent    * 0.25
  + convictionScoreComponent   * 0.40
  + concentrationScoreComponent * 0.15
  + smartMoneyScoreComponent    * 0.20
  , 0, 100)          — magnitude-only; a SEPARATE signed field
                        (institutionalLean, in [-1,+1]) reports whether
                        the net evidence leans toward net accumulation
                        or net distribution, reusing the same
                        magnitude-vs-direction separation established
                        platform-wide (ExecutionPressure, insiderLean,
                        flowLean, Claim Layer confidence-vs-probability)
```

- **`ConvictionScore` carries the highest single weight (0.40)**, deliberately — per `INSTITUTIONAL_RESEARCH.md` §2's own finding, raw ownership *level* alone is a weak signal (it conflates passive index-driven ownership with genuine active conviction), while a fund's actual, disclosed *change* in position (the basis of Conviction Score, §3) is the more genuinely informative fact this whole domain has to offer.
- **Every component of this score inherits the real, disclosed ~45-135-day staleness from `INSTITUTIONAL_RESEARCH.md` §1/§9** — `InstitutionalScore` must never be presented without its own `Freshness Model` (§7) result immediately alongside it, since this domain's defining limitation is temporal, not methodological.

## 2. Ownership Score (0-100, explicitly a contextual, not directional, score)

**What it measures:** the aggregate percentage of a stock's shares held by 13F-filing institutions — directly reusing the same "raw ownership level is contextual, not directional" principle already established for the ETF Flow Agent's Exposure Score (`ETF_FLOW_SCORING_MODEL.md` §5).

```
OwnershipScore = clamp(aggregateInstitutionalHoldingsValue / stockTotalMarketCap * 100, 0, 100)
```

- **Explicitly, deliberately never treated as a standalone directional signal** — a stock with 95% institutional ownership is not thereby "more bullish" than one with 40%; it is simply a fact about that stock's shareholder base composition, directly informing how much weight the *other* scores in this model (and other agents' own stock-specific signals) should carry for it, the same disclosed-context-not-verdict role `ETF_FLOW_SCORING_MODEL.md` §5 already established for its own Exposure Score.
- **Should be reported alongside the real, already-established `ETF_FLOW_SCORING_MODEL.md` Exposure Score for the same stock, not computed in isolation** — a meaningful share of "institutional ownership" for many stocks is itself ETF/index-fund-driven (per `INSTITUTIONAL_RESEARCH.md` §2's own cross-reference), and presenting these two related-but-distinct scores without acknowledging their overlap risks double-counting the same underlying passive-ownership fact under two different agent names.

## 3. Conviction Score (0-100, with its own signed lean)

**What it measures:** the strength of genuine, disclosed **position-change** evidence (accumulation/distribution, new/closed positions) — directly implementing `INSTITUTIONAL_RESEARCH.md` §4-6, discounted by each contributing fund's own Portfolio Turnover context (§7 of the research doc).

```
ConvictionScore = clamp(
    Σ over each fund's quarter-over-quarter position change:
        positionChangeSignificance(fund, symbol)
        * turnoverContextDiscount(fund)
  , 0, 100)

positionChangeSignificance(fund, symbol) = the change in position size,
    normalized by that FUND's own total portfolio value (a percentage-
    of-fund's-own-portfolio measure, directly analogous to the Insider
    Agent's own "percentage of the insider's own holdings" Ownership
    Score design, INSIDER_SCORING_MODEL.md §4) — never an absolute
    dollar value alone, since a $50M position change by a $500M fund is
    far more significant evidence of conviction than the same $50M
    change by a $50B fund

turnoverContextDiscount(fund) = a disclosed, hand-set multiplier in
    [0.5, 1.2] — LOWER for historically high-turnover funds (their
    routine, frequent changes carry less individual conviction-signal
    weight) and HIGHER for historically low-turnover, buy-and-hold-style
    funds (a rare, deliberate change from such a fund is genuinely
    stronger evidence) — directly implementing INSTITUTIONAL_RESEARCH.md
    §7's own moderating-context finding
```

- **A closed position (per `INSTITUTIONAL_RESEARCH.md` §6's own disclosed ambiguity) contributes at a real, deliberately reduced confidence weighting relative to a clearly continuing accumulation/distribution signal** — the genuine uncertainty about *why* a position disappeared from a filing (full sale vs. a *de minimis* reporting threshold vs. the fund itself ceasing to file) should be reflected as a real discount on this specific sub-signal's contribution, not silently treated as an unambiguous full-conviction bearish fact.
- **New positions receive a modest positive weighting bonus relative to simple accumulation of an existing position** — a fresh initiation is a real, discrete decision point (similar in spirit to why a confirmed breakout event outranks a slower-moving trailing statistic in `TECHNICAL_SIGNAL_PRIORITY.md` §2's own indicator-priority reasoning), genuinely more information-dense than an incremental add to an already-held position.

## 4. Concentration Score (0-100, explicitly a contextual, not directional, score)

**What it measures:** how concentrated a stock's institutional ownership is among a few large holders vs. spread across many — directly reusing the Herfindahl-style concentration-index approach already established repeatedly across this research series.

```
ConcentrationScore = clamp(herfindahlIndex(institutionalHolderShares) * 100, 0, 100)
```

- **Explicitly, deliberately never a directional signal on its own** — a high concentration score is a real, useful **risk/context** fact (a stock whose institutional base is dominated by a few large holders may show more exaggerated price reaction if any single one of them meaningfully changes its position — a real, disclosed volatility-risk implication), never itself evidence of bullish or bearish sentiment.
- **Should feed the Confidence Model (§6) as a real, disclosed risk-context input**, not the directional `InstitutionalScore`/`institutionalLean` composite directly.

## 5. Smart Money Score (0-100, the single most epistemically cautious score in this entire model)

**What it measures:** the strength of evidence specifically from funds this platform has **itself** verified, via its own accumulated graded-outcome history, to have a real, statistically meaningful track record — explicitly **not** a reputation-based "famous investor" score.

```
SmartMoneyScore = clamp(
    Σ over each contributing fund's position-change evidence
      (reusing the SAME per-fund position-change data as ConvictionScore, §3):
        positionChangeSignificance(fund, symbol)
        * verifiedTrackRecordWeight(fund)
  , 0, MVP_CEILING)

verifiedTrackRecordWeight(fund) =
    0    if this platform has NOT YET accumulated a real, sample-size-
         gated graded-outcome history for this specific fund (the
         HONEST default for essentially every fund at MVP, per
         INSTITUTIONAL_RESEARCH.md §8's own finding that 13F alone
         provides zero performance data)
    a disclosed, bounded, hand-set value in (0, 1.5] ONCE this
         platform's own Outcome/calibrationReportService.js-style
         infrastructure (reused, not duplicated, per this whole
         research series' established convention) has accumulated a
         real, sample-size-gated track record showing that fund's
         historical position changes preceded statistically favorable
         subsequent stock performance — the ONLY legitimate path to a
         non-zero weight in this platform's own methodology

MVP_CEILING = a disclosed, explicit, LOW ceiling (proposed: 20/100) for
              as long as this platform has NOT yet built genuine,
              sample-size-gated track-record verification — honestly
              reflecting that, absent this platform's own verified
              history, this score cannot responsibly claim more than
              minimal, largely-unearned significance, regardless of how
              "famous" any contributing fund's name might be
```

- **This is the single most important design decision in this entire research phase**: recommend `SmartMoneyScore` **default to a near-zero, heavily-ceilinged value for essentially every fund at MVP**, since this platform has not yet built any real, independent performance-verification infrastructure for institutional investors — explicitly, deliberately **rejecting** the common competitor-product pattern of labeling well-known funds "smart money" purely from reputation, per `INSTITUTIONAL_RESEARCH.md` §8's own central epistemic finding.
- **The correct, honest, deferred path to a genuinely meaningful `SmartMoneyScore`**: reuse this platform's own already-real `Outcome`/`WorldMemoryPrediction`/`calibrationReportService.js` infrastructure (the same infrastructure this whole research series has repeatedly recommended reusing rather than duplicating, e.g. `AGGREGATION_METHODOLOGY.md` §2/§4, `OPTIONS_SCORING_MODEL.md` §2.2) to track, over real accumulated time, whether a specific fund's disclosed position changes actually preceded statistically favorable subsequent returns for the stocks involved — only once that real, sample-size-gated history exists should `verifiedTrackRecordWeight` rise above zero for that specific fund.

## 6. Confidence Model

**What it measures:** how much to trust the overall `InstitutionalScore` composite — a disclosed weighted composite of data-quality factors, distinct from the score's own magnitude/direction.

```
InstitutionalConfidence = clamp(
    dataCompletenessScore   * 0.30   (fraction of expected 13F fields
                                       present/parseable across the
                                       contributing filings — position
                                       size, filer identity, filing date,
                                       all real, always-present fields
                                       on a genuine 13F)
  + sampleAdequacyScore     * 0.25   (per this research series' own
                                       repeated "don't over-claim from a
                                       thin sample" discipline — a
                                       single fund's position change is
                                       weaker evidence than a genuine,
                                       multi-fund pattern)
  + concentrationRiskDiscount * 0.20  (ConcentrationScore, §4, feeds
                                        confidence here as a real risk-
                                        context input — a highly
                                        concentrated ownership base
                                        introduces real, disclosed
                                        additional uncertainty about
                                        how representative any single
                                        fund's move is of the broader
                                        institutional base)
  + freshnessScore            * 0.25  (§7 — deliberately a HIGHER weight
                                        in this composite than in most
                                        of this research series' other
                                        confidence models, reflecting
                                        that staleness is THE defining
                                        limitation of this entire data
                                        domain, per INSTITUTIONAL_RESEARCH.md
                                        §1/§9)
  , 0, 100)
```

- **`freshnessScore`'s elevated 0.25 weight (compared to a more typical 0.15-0.20 elsewhere in this research series) is a deliberate, disclosed reflection of just how structurally severe this domain's staleness limitation is** — no other agent this research series has designed has a data-freshness problem this fundamental to its entire premise.

## 7. Freshness Model

**What it measures:** how current the underlying institutional-ownership evidence is — with a **structurally low, largely non-improvable ceiling**, directly analogous to (but more severe than) the ETF Flow Agent's own two-tier SEC Form N-PORT freshness treatment (`ETF_FLOW_SCORING_MODEL.md` §7).

```
freshnessScore = clamp(
    100 - (daysSinceQuarterEndSnapshot / EXPECTED_STALENESS_CEILING_DAYS) * 100
  , FLOOR, FRESHNESS_CEILING)

EXPECTED_STALENESS_CEILING_DAYS = 135  — the real, disclosed worst-case
                                          staleness window from
                                          INSTITUTIONAL_RESEARCH.md §1/§9

FRESHNESS_CEILING = a disclosed, PERMANENT, structural ceiling
                     (proposed: 55/100) — even a 13F filed the DAY it
                     becomes legally due (the earliest realistic moment
                     this platform could ever see it) still describes a
                     position as of up to 45 days prior — meaning
                     freshnessScore for 13F-sourced evidence can NEVER
                     legitimately reach the same ceiling this platform's
                     other, faster-moving agents (Options/Sentiment/
                     Insider Form 4) can, regardless of how promptly
                     this platform processes a new filing the moment
                     it's published — directly analogous to
                     ALGORITHMIC_ACTIVITY_SCORING.md's permanent
                     confidence ceiling for momentum ignition and
                     ETF_FLOW_SCORING_MODEL.md's permanent freshness
                     ceiling for SEC Form N-PORT data, applied here as
                     this whole agent's OWN defining, permanent
                     characteristic rather than an edge-case exception
```

- **This is the most severe permanent freshness ceiling designed anywhere in this whole research series** — every other agent's freshness model describes a *typical* expected cadence that fast, diligent engineering could realistically approach; this one describes a **hard regulatory floor no engineering effort can improve**, and this distinction should be stated with real prominence anywhere this platform ever surfaces institutional-ownership evidence to a user, consistent with the "distinguish a permanent epistemic boundary from a fixable engineering gap" discipline this whole research series has applied consistently (`ALGORITHMIC_ACTIVITY_RESEARCH.md`'s identical treatment of "execution speed" at the HFT-infrastructure-latency meaning being permanently out of reach vs. its own honestly-scoped inter-trade-time statistic).

---

## 8. Summary — how the 7 scores relate to each other

```
InstitutionalScore    — magnitude-and-lean headline composite, weighted
                          most heavily toward ConvictionScore (0.40),
                          since raw ownership level alone is weak
                          evidence per the Ownership Score's own
                          contextual-not-directional design

OwnershipScore        — DELIBERATELY non-directional/contextual, should
                          be cross-referenced against ETF_FLOW's own
                          Exposure Score for the same stock to avoid
                          double-counting the same passive-ownership fact

ConvictionScore       — the highest-weighted component, per-fund
                          position-change significance discounted by
                          each fund's own historical portfolio-turnover
                          context; closed positions weighted down for
                          their real, disclosed ambiguity; new positions
                          weighted up for their discrete-decision-point
                          information density

ConcentrationScore    — DELIBERATELY non-directional, feeds
                          InstitutionalConfidence as a risk-context input,
                          never the directional composite directly

SmartMoneyScore       — the single most epistemically cautious score in
                          this whole model: a heavily-ceilinged (20/100
                          MVP default), near-zero-by-default score until
                          this platform builds its OWN real, sample-size-
                          gated track-record verification via existing
                          Outcome/calibrationReportService.js
                          infrastructure — EXPLICITLY REJECTS reputation-
                          based "famous investor" labeling as a
                          legitimate basis for a meaningful score

InstitutionalConfidence — a disclosed composite weighted more heavily
                            toward freshness (0.25) than most of this
                            research series' other confidence models,
                            reflecting staleness as this domain's
                            defining limitation

Freshness              — a PERMANENT, structurally-low ceiling (55/100)
                            that no engineering effort can improve past,
                            the most severe such ceiling in this whole
                            research series
```

No code was written to implement any of the above — this document, together with `INSTITUTIONAL_RESEARCH.md` and `INSTITUTIONAL_DATA_STRATEGY.md`, is the design/decision record for whenever a real implementation phase begins.
