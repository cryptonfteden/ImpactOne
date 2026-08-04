# Sentiment Scoring Model — Sentiment Score, Trend, Velocity, Source Quality, Source Diversity, Manipulation Risk, Confidence, Freshness

**Phase:** SENTIMENT-RESEARCH-001. Pure research/design — no production code was written. Every formula below reuses this platform's real, already-shipped Market Sentiment Engine governance (`MAX_SINGLE_DIMENSION_WEIGHT = 0.4`, `MIN_CONTRIBUTOR_BREADTH = 2`, confirmed live in `marketSentimentDimensions.js`) and the real two-tier source-credibility mechanism (`autonomousMarketService.sourceQualityScore()` + `dynamicSourceScoringService.js`/`newsSourceScoringService.js`), extended to the new **per-symbol** scope this research designs (per `SENTIMENT_RESEARCH.md`'s headline finding). Bound by the same governance as every other agent (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): every score below is evidence, never a verdict.

---

## 1. Sentiment Score (0-100, with an explicit signed lean reported alongside)

**What it measures:** the overall magnitude and mix of sentiment evidence for a specific symbol — deliberately a **two-tier composite**, per `SENTIMENT_RESEARCH.md` §2-3's finding that financial-news sentiment and social sentiment carry materially different reliability.

```
SentimentScore = clamp(
    newsSentimentComponent   * 0.65
  + socialSentimentComponent * 0.35
  , 0, 100)          — where each component is itself a [0,100] magnitude
                        of well-supported sentiment evidence, and a
                        SEPARATE signed field (sentimentLean, in [-1,+1])
                        reports whether the evidence leans positive or
                        negative, reusing the same magnitude-vs-direction
                        separation established platform-wide
                        (ExecutionPressure, TrendAlignment, Claim Layer
                        confidence-vs-probability)

newsSentimentComponent  = a real NLP-derived polarity/intensity score
                            over symbol-specific news (SENTIMENT_RESEARCH.md
                            §2), weighted by each contributing article's
                            Source Quality Score (§4) — NOT a flat average,
                            so a highly-credible outlet's coverage counts
                            more than a low-credibility one's

socialSentimentComponent = a real NLP-derived polarity/intensity score
                            over symbol-specific social posts
                            (SENTIMENT_RESEARCH.md §3), weighted by each
                            post's own Source Quality Score (§4, applied
                            to social-account credibility rather than
                            outlet credibility) AND discounted by
                            Manipulation Risk (§6) — a post cluster
                            flagged as high manipulation-risk contributes
                            less to this component, never zero (a
                            disclosed, bounded discount, not a silent
                            exclusion)
```

- **The 65/35 weighting is a disclosed, hand-set reflection of `SENTIMENT_RESEARCH.md` §2-3's own reliability finding** — financial news sentiment is built on edited, attributed, professionally-produced content with an established credibility mechanism already proven elsewhere in this platform; social sentiment is real, valuable, additional signal, but categorically noisier and more exposed to manipulation (§6), and should never be weighted equally with news sentiment until real graded-outcome history justifies revisiting this split (the same deferred-calibration principle used throughout this engagement).
- **`MIN_CONTRIBUTOR_BREADTH`-style gating, reused directly from the real Market Sentiment Engine**: `SentimentScore` should not be reported at all (an honest `insufficientData` result instead) when fewer than 2 independent sources contribute across both components combined — directly reusing the real, already-enforced `MIN_CONTRIBUTOR_BREADTH = 2` constant from `marketSentimentDimensions.js`, not a new threshold invented for this per-symbol design.

## 2. Sentiment Trend

**What it measures:** the direction of change in `SentimentScore` over a rolling window — directly reuses the real, already-shipped `computeTrendDirection()` logic in `marketSentimentRollup.js` (the same function producing today's market-wide `STABLE`/`IMPROVING`/`DETERIORATING` classification), applied here to the new per-symbol score instead of the market-wide one.

```
SentimentTrend = computeTrendDirection(currentSentimentScore, referenceSentimentScore)
                   — the EXACT SAME real function, same STABLE/IMPROVING/
                     DETERIORATING vocabulary, same TREND_STABLE_THRESHOLD
                     constant — no new trend-computation logic invented
```

- **A direct, important cross-reference to this engagement's own `CONFLICT_RESOLUTION.md` §2 finding**: this vocabulary (`STABLE`/`IMPROVING`/`DETERIORATING`) measures the **rate of change of the sentiment score itself**, not the sentiment's own positive/negative polarity — the same important distinction already identified there. `SentimentTrend` should **never** be compared directly against another agent's bullish/bearish `direction` field without first passing through the canonical direction taxonomy's `NOT_DIRECTIONAL` exclusion (`CONFLICT_RESOLUTION.md` §2.2) — reusing that exact, already-designed governance rather than re-deriving it here.

## 3. Sentiment Velocity

**What it measures:** the rate of change of sentiment *volume/intensity* (how much sentiment activity is occurring, not merely which direction the score is trending) — a genuinely distinct concept from Sentiment Trend, per `SENTIMENT_RESEARCH.md` §6.

```
SentimentVelocity = clamp(
    (currentWindowContributorCount - baselineContributorCount) / baselineContributorCount
  , VELOCITY_FLOOR, VELOCITY_CEILING)   — expressed as a bounded percentage
                                           change against the symbol's OWN
                                           historical baseline volume of
                                           sentiment-contributing items,
                                           never an absolute item count
                                           (which would be meaningless
                                           without knowing what's normal
                                           for that specific symbol)
```

- **Honestly unavailable during the bootstrap window** (`insufficientBaselineHistory: true`) for a symbol this new per-symbol engine has not yet accumulated enough history for — the identical bootstrap-honesty pattern already proven in `optionsAnomalyConfidence.js`, reused here rather than reinvented.
- **Feeds directly into, but is explicitly distinct from, Abnormal Sentiment Spikes (a downstream consumer of this same statistic, cross-checked against the earnings calendar per `SENTIMENT_RESEARCH.md` §11)** — `SentimentVelocity` itself is a neutral, descriptive rate-of-change statistic; the "is this abnormal" judgment (with its earnings-calendar false-positive guard) is a separate, higher-level interpretation layered on top, not conflated into the same number.

## 4. Source Quality Score (0-100)

**What it measures:** the credibility of a sentiment-contributing source — **directly reuses this platform's real, existing two-tier mechanism**, per `SENTIMENT_RESEARCH.md` §4, extended (not rebuilt) to also cover social-account credibility.

```
SourceQualityScore(source) =
    IF source is a known financial-news outlet:
        dynamicSourceScoringService.getSourceScore(source)  // real, outcome-informed
        ?? autonomousMarketService.sourceQualityScore(source)  // real, static fallback
           (the exact same sourceCredibilityOverrides[...] ?? ... pattern
            already real and live in autonomousRecommendationEngine.js —
            reused verbatim, not reimplemented)
    IF source is a social-media account:
        a NEW, disclosed formula (no equivalent exists today):
        clamp(accountAgeScore * 0.3 + engagementAuthenticityScore * 0.3
              + postingConsistencyScore * 0.4, 0, 100)
          — a materially cheaper, less rigorous mechanism than the
            outcome-informed news-source scoring, honestly reflecting
            that no comparable "track record of accuracy" concept exists
            for an individual social account the way it does for a
            professional news outlet's history of coverage
```

- **The social-account formula's low rigor relative to the news-source mechanism is a deliberate, disclosed asymmetry**, not an oversight — directly consistent with `SENTIMENT_RESEARCH.md` §9's finding that bot/manipulation risk is the least scientifically mature area of this research; `SourceQualityScore` for a social account should never present with the same confidence-implying precision as the news-outlet version.

## 5. Source Diversity Score (0-100)

**What it measures:** how concentrated vs. spread-out a symbol's sentiment evidence is across distinct, independent sources — directly reuses the concentration-index approach already established in `TECHNICAL_SIGNAL_PRIORITY.md` for trade-fragmentation venue concentration, applied here to sentiment sources.

```
SourceDiversityScore = clamp(100 - (herfindahlIndex(sourceSharesAfterDuplicateFiltering) * 100), 0, 100)
                          — computed AFTER duplicate-content filtering
                            (SENTIMENT_RESEARCH.md §8) is applied, never
                            before — an un-deduplicated share distribution
                            would silently inflate apparent diversity by
                            counting syndicated re-reports of one story
                            as if they were independent sources
```

- **This ordering dependency (dedupe first, then compute diversity) is this document's single most important design constraint** — directly implementing `SENTIMENT_RESEARCH.md` §5's own finding that wire-syndication inflation is the primary false-positive risk for this specific score.

## 6. Manipulation Risk (0-100, a risk flag, not a magnitude-of-evidence score)

**What it measures:** how much a given cluster of (primarily social) sentiment activity resembles coordinated/inauthentic behavior — deliberately structured differently from every other score in this document, per `SENTIMENT_RESEARCH.md` §9's finding that this is the least scientifically mature signal in the whole research.

```
ManipulationRisk = clamp(
    postingBurstAnomalyScore    * 0.4
  + accountClusterSimilarityScore * 0.35
  + engagementAuthenticityDeficit * 0.25
  , 0, MANIPULATION_RISK_CEILING)     (proposed ceiling: 60, NOT 100 —
                                        a hard, permanent cap reflecting
                                        that third-party sentiment-
                                        consumer data can never
                                        conclusively PROVE coordinated
                                        manipulation, only flag a
                                        resemblance to it, directly
                                        mirroring ALGORITHMIC_ACTIVITY_
                                        SCORING.md's identical treatment
                                        of momentum ignition's permanent
                                        low confidence ceiling)
```

- **Never applied to financial-news sentiment sources** — per `SENTIMENT_RESEARCH.md` §9, coordinated manipulation of major, reputable news outlets is a categorically different (and, for this platform's purposes, effectively out-of-scope) risk from social-media manipulation; `ManipulationRisk` is computed only over the social-sentiment component.
- **Mandatory disclosure string, non-negotiable, directly modeled on `ALGORITHMIC_ACTIVITY_SCORING.md` §2.3's identical requirement for momentum ignition**: whenever `ManipulationRisk` is reported above a disclosed threshold (proposed: 30), it must carry a fixed caveat — *"Posting activity for this symbol shows patterns that can resemble coordinated/inauthentic behavior. This cannot be confirmed from available data and may also reflect genuine, organic interest."*

## 7. Confidence Model

**What it measures:** how much to trust the overall Sentiment Score composite — a disclosed weighted composite of the other scores in this document, following this platform's established convention.

```
SentimentConfidence = clamp(
    sourceQualityScore    * 0.30   (the weighted-average Source Quality
                                     across all contributing sources)
  + sourceDiversityScore  * 0.25
  + dataCompletenessScore * 0.25   (fraction of the 2 components — news,
                                     social — that met MIN_CONTRIBUTOR_
                                     BREADTH independently)
  + freshnessScore        * 0.20   (§8)
  , 0, 100)
```

- **Deliberately excludes `ManipulationRisk` from the confidence composite** — a high manipulation-risk reading already discounts its own component's contribution to `SentimentScore` directly (§1); folding it a second time into `SentimentConfidence` would double-penalize the same evidence, the same "don't double-count" discipline already applied throughout this engagement's other scoring models.

## 8. Freshness Model

**What it measures:** how current the underlying sentiment evidence is — reuses this platform's real, existing `buildDataFreshness()` staleness convention (confirmed live in `marketSentimentService.js`: a 24-hour `STALE_THRESHOLD_MS`, "one trading day — this engine's readings are daily-cadence by design"), but recommends a **shorter, per-symbol threshold** for the new capability.

```
freshnessScore = clamp(100 - (oldestContributingItemAgeHours / EXPECTED_FRESHNESS_WINDOW_HOURS) * 100, FLOOR, 100)
                    (proposed EXPECTED_FRESHNESS_WINDOW_HOURS: 6-8 for
                     news, 2-4 for social — meaningfully SHORTER than the
                     market-wide engine's 24-hour daily-cadence design,
                     since per-symbol sentiment is a materially faster-
                     moving signal than a market-wide daily rollup,
                     directly analogous to TECHNICAL_SIGNAL_PRIORITY.md
                     §4's own finding that different signal families
                     require different freshness half-lives, not one
                     global threshold)
```

- **A specific, disclosed exception for the news component**: unlike social sentiment (which should decay quickly, since a day-old post is genuinely less relevant), a single, still-relevant major news story can remain meaningfully "fresh" for longer than a single social post — recommend the news-component freshness window be somewhat longer than the social-component window, both shorter than the market-wide engine's 24-hour design, but not identical to each other.

---

## 9. Summary — how the 8 scores relate to each other

```
SentimentScore       — magnitude-and-lean composite, the headline number,
                        built from weighted news + social components

SentimentTrend       — a SEPARATE rate-of-change-of-score classification,
                        reusing the real computeTrendDirection() function,
                        NOT comparable to another agent's bullish/bearish
                        direction without canonical-taxonomy normalization

SentimentVelocity    — a SEPARATE rate-of-change-of-VOLUME statistic,
                        distinct from SentimentTrend (which tracks the
                        score, not the volume)

SourceQualityScore   — a per-source input feeding SentimentScore's
                        weighting AND SentimentConfidence, reusing the
                        real two-tier news-source mechanism, with a new,
                        deliberately-less-rigorous social-account formula

SourceDiversityScore — computed AFTER duplicate-content filtering,
                        feeding SentimentConfidence

ManipulationRisk     — a bounded, permanently-capped (60, not 100) risk
                        flag applied ONLY to social sentiment, discounting
                        (never zeroing) that component's contribution to
                        SentimentScore, deliberately EXCLUDED from
                        SentimentConfidence to avoid double-penalizing

SentimentConfidence  — a disclosed composite of SourceQuality +
                        SourceDiversity + dataCompleteness + freshness

Freshness            — per-component (news vs. social) decay windows,
                        both shorter than the market-wide engine's
                        24-hour design
```

No code was written to implement any of the above — this document, together with `SENTIMENT_RESEARCH.md` and `SENTIMENT_SOURCE_STRATEGY.md`, is the design/decision record for whenever a real implementation phase begins, following the same "architecture → research → build" sequencing already proven for this platform's other agents.
