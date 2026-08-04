# Market Sentiment Engine — Architecture (Phase AI-ENGINE-002)

**Status:** Architecture only. Nothing in this document is implemented. No code was written, no migration was run, no provider was wired up. Every reference to an existing file/service below is real and was read directly from this repository to ground the design — every new module/table/endpoint named below is proposed, not built. This document follows the exact documentation convention `OPTIONS_AGENT_ARCHITECTURE.md` established in Phase AI-ENGINE-001 (later built in Phase AI-ENGINE-001.1) — that build is cited throughout as the real, working precedent for this engine's pattern.

## 1. What this is, and what it deliberately is not

The **Market Sentiment Engine** becomes the **canonical market sentiment source for the entire platform** — every screen, recommendation, and downstream engine that needs "what does the market feel like right now" reads from this one engine, never from an ad hoc per-screen computation. It must **not depend on any single indicator**: it is a modular scoring engine that combines multiple independent sentiment dimensions into one overall read, with the combination itself designed so that any one dimension going missing, stale, or low-confidence degrades the overall confidence honestly rather than silently reweighting toward whatever is left as if nothing changed.

It is **not** a sixth verdict-producing engine. Exactly like the Options Agent (`OPTIONS_AGENT_ARCHITECTURE.md` §1, now real code in `backend/services/optionsAgent/`), this engine emits **evidence** — a `SentimentReading`, scored and explained — never an `action`/`decision`/`verdict`/`recommendation`. It is bound by the same governance rule `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` (`action`, `decision`, `verdict`, `finalDecision`, `recommendation`) already enforces for the Committee and the Options Agent (`optionsSignalGovernance.js`'s `sanitizeOptionsSignal`/`assertNoGovernanceViolation` — real, built, tested code this design reuses the same pattern for, not a redesign).

## 2. Where this sits in the real platform

Provider-based, exactly like every other source-of-truth in this codebase:

```
News feed (existing)        ─┐
Recommendation repository    ─┤
Market/price data (existing) ─┼─► componentScorers (new, one per dimension)
Macro/FRED data (existing)   ─┤          │
COT positioning (existing)   ─┘          ▼
                                 sentimentRollupService (new)
                                          │
                                          ▼
                          MarketSentimentSnapshot (new, daily persisted)
                                          │
                                          ▼
                    CanonicalEvent (existing) + DecisionTrace.evidenceReferences (existing)
```

Every one of the 8 dimensions below is a **component scorer** — a function that reads already-existing real data (or an honest stub) and returns one dimension's reading. The **rollup** combines however many component readings are actually available that run into one overall `SentimentReading`, following the exact "provider + detector pair" shape the Options Agent already proved out: real ingestion where it exists, honest stubs where it doesn't, and a scoring/confidence layer that never fabricates a number a component couldn't actually compute.

## 3. The 8 dimensions — grounded in what's real today, not invented

Every dimension below was checked against the actual codebase before this design was written. Several genuinely useful signals already exist; several dimensions are honest gaps. Both are disclosed here, not discovered later.

| Dimension | Real signal today | Source | What's missing |
|---|---|---|---|
| **News Sentiment** | `autonomousMarketService.js`'s `classifyEventType()` (topic, not polarity), `impactType` (`opportunity`/`risk`/`neutral`, importance-derived), `sourceQualityScore()` | Real (live feed + credibility weighting) | No real per-headline polarity classifier and no existing aggregate sentiment tally — this dimension's scorer is new aggregation logic over real fields, honestly labeled as an `impactType`-derived proxy, never presented as true NLP sentiment analysis |
| **AI Recommendation Distribution** | `autonomousRecommendationRepository.listActive()` — real, DB-backed, each row carries a real `action` (`BUY`/`REDUCE`/`EXIT`) | Real (DB) | No existing tally exists; the scorer is new (but trivial and honest) aggregation over real rows — a real distribution, not a fabricated one |
| **Market Breadth** | None | — | **Total gap.** No advance/decline or "% above moving average" computation exists anywhere in this codebase today. This dimension's scorer must be built from scratch (§5a) and is honestly reported `unavailable` until it is |
| **Fear & Greed** | `autonomousMarketService.js`'s `currentMarketSentiment.fearGreedProxy` | **Mislabeled today** — it is literally the AI daily-brief's `confidenceScore` reused a second time, not an independent fear/greed computation | No real multi-factor Fear & Greed composite exists. This design does **not** reuse `fearGreedProxy` as-is (see §5b) — reusing a mislabeled field would be exactly the kind of "borrow a synthetic number and call it something else" mistake this platform has already had to correct once (Phase X12C.3.1's `heldPosition`/`portfolioContext` bug is the most recent precedent for why field provenance must be checked, not assumed) |
| **Volatility** | `technicalIntelligenceService.js`'s `analyzeVolatilityRegime()` — real, price-history-derived ATR-percentile + Bollinger bandwidth, per symbol | Real (live price history via `priceHistoryProvider`) | No market-wide VIX-equivalent (implied volatility) signal exists — this dimension is realized-volatility-based, aggregated across a small ETF universe (§5c), and must disclose that distinction, never imply it's a real VIX read |
| **Sector Rotation** | `autonomousMarketService.js`'s `sectorRotation`/`sectorPropagation` fields | Real, but these are news/event sector-tagging conveniences, not a relative-strength computation | No real "which sectors are gaining/losing relative strength" math exists. This dimension's scorer is new (§5d), built on the same real price-history primitives `technicalIntelligenceService.js` already uses per symbol, applied to sector ETFs |
| **Macro Events** | `altDataService.getMacroData()`/`deriveMacroRegime()` (real, live FRED data) + `cftcCotProvider.js` (real, live CFTC COT) | Real for **regime** data; Fed/ECB/FOMC/Treasury event-calendar providers (`fedProvider.js`, `ecbProvider.js`, `fomcProvider.js`, `treasuryProvider.js`) are all honest stubs (`honestStubFetch`) | No real macro **event calendar** (scheduled meeting outcomes/statements) exists — only the regime half. This dimension's scorer uses the real regime data and honestly reports the event-calendar half as unavailable |
| **Earnings Trend** | None beyond keyword tagging | `earningsProvider.js` is an honest stub | **Essentially a total gap.** No real earnings-beat/miss aggregation exists. This dimension is honestly reported `unavailable` until `earningsProvider.js` gets a real vendor connection — same disclosed-gap discipline as the Options Agent's own provider (`optionsFlowProvider.js`) |

This table is the single most important part of this document: **3 of 8 dimensions have no real signal at all today** (Market Breadth, Earnings Trend, and Sector Rotation's rotation-specific math), and 2 more have a real underlying signal that needs new aggregation logic to become a sentiment reading (News Sentiment, AI Recommendation Distribution). The engine's honest-missing-data handling (§6) is not a defensive afterthought — it is the load-bearing design decision for day one, since the majority of dimensions start out partially or fully unavailable.

## 4. Modular scoring engine design

Every dimension is implemented as a **component scorer** — a pure-ish function (may read already-fetched data, never performs its own network I/O, exactly like the Options Agent's detectors in `optionsSignalDetectors.js`) conforming to one contract:

```js
async function scoreComponent(input) → {
  dimension,        // one of the 8 keys, or a scorer-internal sub-reading
  score,            // 0-100, or null when genuinely uncomputable
  confidence,       // 0-100, or null
  contributors,     // real evidence this scorer actually used — never boilerplate
  unavailable,      // boolean — true when score/confidence are null
  reason,           // required when unavailable — a real, specific reason, never generic
}
```

A scorer that cannot compute a real score returns `unavailable: true` with a specific `reason` (e.g. `"No live earnings vendor configured"`, `"Fewer than 20 sessions of accumulated history"`) — never a guessed midpoint value (no scorer ever defaults to `50`). This mirrors the Options Agent's `insufficientBaselineHistory` discipline (`optionsSignalDetectors.js`) applied across 8 independent scorers instead of one detector family.

The **`sentimentRollupService`** (new) is the only place the 8 scorers are combined:

1. Run every registered component scorer (whichever are enabled per the feature flag scope, §9) against the current data.
2. Partition into `available` (real score+confidence) and `missing` (unavailable, with reasons).
3. Compute the overall `score` as a **confidence-weighted average of only the available components** — a component that is unavailable contributes zero weight, not a fabricated neutral value. If zero components are available, the overall reading is itself `unavailable` (never a fabricated 50).
4. Compute overall `confidence` from **both** how many components are available (breadth of evidence) **and** each available component's own confidence (depth of evidence) — a reading built from 2 of 8 low-confidence components must score a visibly lower overall confidence than one built from 6 of 8 high-confidence components, never the same number.
5. Populate `missingInputs` with every unavailable dimension's key + reason — always disclosed, never hidden by a confident-looking score.

This "never depend on any single indicator" requirement is enforced structurally: no single component's weight is fixed high enough that its absence goes unnoticed in the confidence number (§6 details the exact weighting rule).

## 5. Per-dimension design notes

### 5a. Market Breadth (new, from scratch)

Since no real advance/decline data exists anywhere in this codebase, this scorer is built directly on top of `technicalIntelligenceService.js`'s already-real, already-tested per-symbol trend/momentum computation (`analyzeSymbol`), applied across a bounded, disclosed universe (the same `AUTONOMOUS_SCAN_UNIVERSE`/watchlist/portfolio symbols the rest of this platform already uses — reusing the exact anti-pattern lesson `ADAPTIVE_INTELLIGENCE_AUDIT.md` and the Options Agent architecture doc §3 both already name: never invent a second hardcoded universe). The score is the real percentage of that universe with a positive trend signal today; `contributors` lists the actual advancing/declining counts, never a synthesized breadth index formula this codebase has no real inputs for.

### 5b. Fear & Greed (rebuilt honestly, not reused)

Does **not** reuse `autonomousMarketService.js`'s `fearGreedProxy` field, because it is a mislabeled duplicate of an unrelated confidence score (§3). Instead, this dimension composites from genuinely independent, real inputs already available: `altDataService.deriveMacroRegime()`'s `riskMode` (`risk-on`/`risk-off`), the Polymarket `trend` field (`altDataService.getPolymarketData()`), and — once built — the Volatility (§5c) and Market Breadth (§5a) dimensions' own readings as sub-inputs. This is disclosed explicitly as a **proxy composite**, not a CNN-style Fear & Greed Index — the UI-facing label must say so (a future frontend phase's responsibility, out of scope here per "No UI").

### 5c. Volatility (aggregated from real per-symbol data)

Runs `technicalIntelligenceService.analyzeVolatilityRegime()` across a small, disclosed ETF universe (e.g. SPY + major sector ETFs — reusing the same universe-discipline as §5a) and aggregates the real `HIGH_VOLATILITY`/`NORMAL_VOLATILITY`/`LOW_VOLATILITY` classifications into one score. Explicitly disclosed as **realized volatility**, not implied volatility/VIX — no VIX data source exists in this codebase, and none is invented here.

### 5d. Sector Rotation (new relative-strength computation)

Built on the same real price-history primitives `technicalIntelligenceService.js` already uses (not the news-tagging `sectorPropagation`/`sectorRotation` fields, which are honestly a different, unrelated concept per §3). Computes real relative momentum across sector ETFs over a rolling window, ranking which sectors are gaining/losing relative strength. `contributors` names the real sector ETFs and their real momentum figures.

### 5e. Macro Events (real regime half, honest gap on the calendar half)

Reuses `altDataService.getMacroData()`/`deriveMacroRegime()` (real, live FRED-backed) and `cftcCotProvider.js` (real, live CFTC data) as-is — no reimplementation. The event-calendar half (Fed/ECB/FOMC/Treasury scheduled events) stays an honest stub until one of those providers gets a real implementation; this scorer's `missingInputs`/`contributors` must say so explicitly (e.g. `contributors: [macroRegime, cotPositioning]`, `missingInputs: ["scheduled Fed/ECB/FOMC events — providers not yet connected"]`).

### 5f. Earnings Trend (honest unavailable until a real vendor exists)

Always returns `unavailable: true` with reason `"No live earnings-beat/miss data source is connected (earningsProvider.js is an honest stub)"` until `earningsProvider.js` is given a real implementation — the same disclosed-gap discipline the Options Agent's own provider used from day one, not a fabricated placeholder trend.

### 5g. News Sentiment & AI Recommendation Distribution (new aggregation over real data)

- News Sentiment's scorer buckets the live feed's real `impactType` (opportunity/risk/neutral) and `importanceScore` fields into a proxy sentiment score, explicitly labeled as importance/impact-derived, not true polarity NLP.
- AI Recommendation Distribution's scorer calls `autonomousRecommendationRepository.listActive()` (real, already exists) and tallies real `BUY`/`REDUCE`/`EXIT` counts into a score (e.g. net bullish tilt = (BUY − EXIT − REDUCE) / total). No new repository method is required to source the raw data — only the tally, which is new.

## 6. Confidence model — per component, and overall

Documented as new `scoringVocabulary.js` `SCORE_DEFINITIONS` entries, following the exact precedent `optionsAnomalyConfidence` set in Phase AI-ENGINE-001.1 (a new, additive entry — never a parallel scoring system):

```js
marketSentimentComponentConfidence: {
  range: [0, 100],
  meaning: "How much real, fresh, sufficient data backed this one dimension's reading.",
  formula: "Per-dimension — a function of data recency, sample size, and (where applicable) the same freshness/reliability fields autonomousMarketService.recencyScore already computes elsewhere in this platform.",
  fallback: "null when the dimension is unavailable — never a fabricated mid-range confidence.",
  apiField: "SentimentReading.contributors[].confidence",
}
marketSentimentOverallConfidence: {
  range: [0, 100],
  meaning: "How much of the full 8-dimension picture is genuinely available and how strong that available evidence is — breadth AND depth, not just an average.",
  formula: "(availableComponentCount / 8) * 60 + averageAvailableComponentConfidence * 0.4, clamped 0-100 — a reading missing half the dimensions cannot score above ~65 no matter how confident the available half is.",
  fallback: "null (never fabricated) when zero components are available.",
  apiField: "SentimentReading.confidence",
}
```

The `(availableComponentCount / 8) * 60` term is the structural enforcement of "must not depend on any single indicator" — losing any one dimension visibly costs ~7.5 points of overall confidence ceiling, regardless of how well the remaining dimensions are doing.

## 7. Historical snapshots, daily trend, weekly trend

Reuses the exact real precedent already built and running in this codebase — `ThemeConfidenceSnapshot` (`schema.prisma`) + `themeSnapshotScheduler.js`'s single daily `node-cron` job — generalized from "one snapshot per theme per day" to "one snapshot per sentiment dimension (plus one `OVERALL` row) per day." See `MARKET_SENTIMENT_DATA_MODEL.md` §2 for the exact proposed table.

- **Daily trend** = today's snapshot vs. yesterday's snapshot for the same dimension.
- **Weekly trend** = today's snapshot vs. the snapshot from 5 trading sessions ago (mirrors how `technicalIntelligenceService.js`'s own trailing-window logic already reasons about "a week" in trading-session terms, not calendar days).
- Both trends are computed **at read time** from the snapshot history, never stored as a separately-maintained column that could drift from the underlying snapshots — same "derive, don't duplicate" discipline as `computeThemeEvolution()` (the real function backing Theme Dashboard's own trend reporting) already follows.
- A dimension/day with no snapshot (the scheduler didn't run, or the dimension was unavailable that day) makes the trend honestly `INSUFFICIENT_HISTORY`, never interpolated.

## 8. Explainability

Every `SentimentReading` (per-dimension or overall) carries a real `contributors` array — the actual evidence that produced the score, not a template. For the overall reading, `contributors` is the per-dimension breakdown (score, confidence, weight actually applied); for a single dimension, `contributors` is that dimension's own real inputs (e.g. Market Breadth's real advancing/declining counts, Macro Events' real `riskMode`/COT read). This mirrors `decisionTraceExplainabilityService.js`'s existing single-decision traceability pattern and the Options Agent's `buildOptionsSignalExplanation`'s "requires the specific fields, never a generic template" rule — applied here as a structured `contributors` array rather than prose, since a composite of 8 dimensions is better shown as a breakdown table than a single sentence.

## 9. Event Envelope compatibility

A material overall-sentiment change (e.g. daily trend crosses a disclosed threshold) is projected through the existing `eventEnvelope.buildEventEnvelope()` with `eventType: "market-sentiment-update"` — the same 19-required-field envelope every other provider's events already produce (`eventEnvelope.js`'s `REQUIRED_FIELDS`), persisted as a `CanonicalEvent` exactly like the Options Agent's signals are (`OPTIONS_AGENT_DATA_MODEL.md` §6 precedent) — so `findMatchedEvents`/Daily Feed/Themes never need special-case code to "know about" sentiment readings. No bespoke envelope shape is invented.

## 10. Feature flag support

Gated behind a new `FeatureFlag` row, `key: "market-sentiment-engine"`, reusing the existing `FeatureFlag` model (`mode`: `DISABLED`/`ENABLED`/`BETA_ONLY`/`USER_SPECIFIC`, `enabledForUsers: String[]`) exactly as `featureFlagService.js` already governs every other gated feature — no new ad hoc env var or config mechanism. A **per-dimension** sub-flag is deliberately **not** proposed in v1 (keeps the rollout mechanism to the one already-proven pattern); a dimension that has no real data source yet is already handled honestly via `unavailable`/`missingInputs`, which is a data-availability concern, not a rollout-gating concern — conflating the two would blur "is this feature on" with "does this feature have data," which this platform's other engines keep deliberately separate (e.g. the Options Agent is feature-flaggable independent of whether a vendor is connected).

## 11. Governance — "sentiment, never a verdict"

- A `SentimentReading` **never contains** any of `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`. Enforced the same structural way the Options Agent already does it: a `sanitizeSentimentReading()` function (proposed, mirroring `optionsSignalGovernance.js`'s `sanitizeOptionsSignal` verbatim in shape) strips any of those keys before a reading is ever persisted or returned, independent of what a component scorer happens to compute.
- When a `SentimentReading` is cited as evidence for an existing `Recommendation` (via `DecisionTrace.evidenceReferences`), it participates in `evidenceAgreement`/`uncertainty` like any other matched evidence — never a privileged vote because it's a composite of 8 things instead of 1.
- No field on any table in this design has any relation to `Portfolio`, `Order`, or `Trade`. The engine informs; it never executes — same `TradingPrinciple`/Options Agent precedent.

## 12. Background jobs

One new scheduler, `marketSentimentSnapshotScheduler.js`, following the exact single-instance `node-cron` shape already used by `themeSnapshotScheduler.js`/`providerScheduler.js`/`alertScheduler.js` — `start()`/`stop()`/`runNow()`/`getStatus()`, started only from `server.js`. Once daily (mirroring `themeSnapshotScheduler.js`'s "once daily, just after a fixed real-world data-availability point" pattern — after US market close, so intraday-derived dimensions like Volatility/Market Breadth/Sector Rotation reflect a completed session), it runs every enabled component scorer, computes the rollup, and persists one `MarketSentimentSnapshot` row per dimension (+ one `OVERALL` row) for that day. No second, higher-frequency ingestion scheduler is proposed in v1 — the Options Agent's 3-5 minute intraday cadence exists because sweep detection is time-sensitive; daily-composite market sentiment is not, and a once-daily job is the honest cadence this data actually supports.

## 13. Known gaps and honest limitations (disclosed up front)

- **3 of 8 dimensions have no real signal source at all today** (Market Breadth, Earnings Trend, and Sector Rotation's actual rotation math) — see §3's table. This engine will report `unavailable` for these from day one, by design, not as a bug.
- **`fearGreedProxy` (existing field) is not reused** — it is mislabeled today, and this design explicitly avoids repeating that mistake in a new engine (§5b, and the X12C.3.1 precedent named above for why field provenance matters).
- **No VIX/implied-volatility data source exists** — Volatility is realized-vol-based, disclosed as such (§5c).
- **Macro Events is real for regime, stub for calendar** — disclosed per-dimension in `missingInputs`, never blended into a single "macro is available" claim (§5e).
- **Fixed, hand-set component weights until real Outcome history exists for sentiment specifically** — same honest simplification `scoringVocabulary.js`'s own documented note on `conviction`/`confidence` and the Options Agent's `optionsAnomalyConfidence` both already disclose; not hidden here either.
