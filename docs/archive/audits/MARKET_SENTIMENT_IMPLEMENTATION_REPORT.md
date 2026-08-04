# Market Sentiment Engine — Implementation Report (Phase AI-ENGINE-002.1)

## Mission

Implement the production-safe foundation of the Market Sentiment Engine per the three approved architecture documents (`MARKET_SENTIMENT_ENGINE.md`, `MARKET_SENTIMENT_API.md`, `MARKET_SENTIMENT_DATA_MODEL.md`): a canonical platform-level service, real-data-only dimensions, an enforced confidence-weighted rollup, 8-market segmentation, append-only persistence, governance reuse, per-contributor explainability. No Express routes, no UI, no scheduler this phase.

## What was built

All new code lives under `backend/services/marketSentiment/`.

### 1. Canonical service — `marketSentimentService.js`

`getMarketSentiment(market, { now })` is the one function every current/future screen or engine should call for "what does the market feel like right now." Every result contains exactly the 9 required fields: `market`, `score`, `trend`, `confidence`, `contributors`, `missingInputs`, `lastUpdated`, `dataFreshness`, `provenance` (plus the governance `label`). Each of the 6 underlying real data sources (news feed, recommendations, macro data, Polymarket, CFTC COT, price history) is fetched independently and wrapped in `safeFetch` — one provider throwing degrades only the dimension(s) that depended on it, never the whole reading (mission §8's "provider failure" requirement, tested explicitly).

`captureSnapshot(market, { now })` computes the same reading and persists one `OVERALL` row plus one row per dimension (including the 3 permanently-unavailable ones, so a day's full picture — including what was missing — is always in the historical record).

### 2. Dimensions — real data only, `marketSentimentScorers.js` + `marketSentimentDimensions.js`

Exactly 5 of the 8 named dimensions are implemented, matching the architecture doc's own honest audit (`MARKET_SENTIMENT_ENGINE.md` §3) — nothing was fabricated to reach 8:

| Dimension | Real source | Status |
|---|---|---|
| News Sentiment | `autonomousMarketService`'s live feed (`impactType`/`importanceScore`) | Implemented — disclosed as an impact/importance-derived proxy, never true NLP polarity |
| AI Recommendation Distribution | `autonomousRecommendationRepository.listActive()` | Implemented — US-only (the recommendation engine's real tracked universe) |
| Fear & Greed | `altDataService.deriveMacroRegime()` + `getPolymarketData()` | Implemented — a genuinely new composite, **not** a reuse of the existing (mislabeled) `fearGreedProxy` field |
| Volatility | `technicalIntelligenceService.analyzeVolatilityRegime()` | Implemented — realized-vol based, aggregated across each market's proxy-ETF universe, explicitly not VIX/implied-vol |
| Macro Events | `altDataService.getMacroData()` + `cftcCotProvider`/`cotIntelligenceService` | Implemented — regime half only; the event-calendar half is always disclosed as missing (Fed/ECB/FOMC/Treasury providers remain honest stubs) |
| Market Breadth | — | **Not implemented.** No advance/decline computation exists anywhere in this codebase. Always returns `unavailable: true` with a permanent, specific reason. |
| Sector Rotation | — | **Not implemented.** No relative-strength/rotation math exists (only unrelated news sector-tagging). Always `unavailable`. |
| Earnings Trend | — | **Not implemented.** `earningsProvider.js` remains an honest stub. Always `unavailable`. |

Every scorer is a pure function over already-fetched data (`marketSentimentScorers.js`) — no scorer performs its own network/DB I/O, mirroring the Options Agent's detector-purity discipline. A scorer that lacks sufficient real data returns `unavailable: true` with a specific reason and `score: null`/`confidence: null` — never a guessed midpoint.

### 3. Rollup — `marketSentimentRollup.js`

`computeRollup({ dimensionReadings })` implements every enforcement rule from mission §3:

- **No single dimension may dominate**: `capAndRedistributeWeights()` caps any dimension's confidence-derived weight at `MAX_SINGLE_DIMENSION_WEIGHT` (0.4) and proportionally redistributes the excess to the remaining available dimensions — proven with a test where one dimension's confidence (99) vastly outweighs the others (40 each); without the cap it would pull the score near its own extreme value, and with the cap it visibly does not.
- **Minimum contributor breadth**: fewer than `MIN_CONTRIBUTOR_BREADTH` (2) available dimensions yields an honestly `null` overall score, never a 1-dimension-only "overall" reading presented as composite.
- **Null-not-zero**: an unavailable dimension contributes zero *weight*, never a zero *score* blended in — proven by a test showing an identical score whether or not a third, unavailable dimension is present alongside two available ones.
- **Degraded confidence when inputs are missing**: `(availableCount / 8) * 60 + avgConfidence * 0.4` — the `/8` uses the full 8-dimension model (not just the 5 implemented), so overall confidence structurally reflects how much of the *complete* intended picture is present, exactly per the approved architecture's §6 formula.
- **Deterministic output**: dimension readings are sorted alphabetically before weighting, so identical input always produces byte-identical output regardless of input array order — proven by two tests (repeated call, and reordered input array).

`computeTrend()` (daily/weekly) reads from real persisted history only — a market/dimension with zero or insufficient prior snapshots honestly reports `INSUFFICIENT_HISTORY`, never an interpolated value. Weekly requires 5 prior snapshots (≈1 trading week at daily cadence), matching the approved architecture.

### 4. Market segmentation — `marketSentimentDimensions.js`'s `MARKET_REGISTRY`

All 8 canonical markets (US, Europe, China, Japan, India, Crypto, Commodities, Energy) are supported. Each market's real data availability is disclosed, not assumed:
- `macroRelevant: true` only for US/Commodities/Energy (FRED is US Fed data; CFTC COT covers US-listed gold/silver/crude/USD-index/Nasdaq-mini futures) — Fear & Greed and Macro Events are honestly `unavailable` for the other 5 markets, since no ECB/BOJ/PBOC/RBI data source exists anywhere in this codebase.
- `recommendationEligible: true` only for US — the recommendation engine's real tracked universe is US equities, not a per-market concept.
- Volatility and News Sentiment degrade *naturally* per market (via each scorer's own "insufficient real data" check against that market's proxy symbols/region tags) rather than a second hardcoded per-market allow/deny table — a market with genuinely no matching feed items or no fetchable price history is reported unavailable by the same mechanism that handles any other missing-data case, not a special-cased rule.

### 5. Persistence — `backend/prisma/schema.prisma` + `marketSentimentRepository.js`

One new table, `MarketSentimentSnapshot` (`market`, `dimension`, `snapshotDate`, nullable `score`/`confidence`, `contributors`, `missingInputs`, `methodologyVersion`), plus two new enums (`MarketSentimentDimension`, `MarketSentimentRegion`) — purely additive, zero changes to any existing model or column. Migration `20260726054952_market_sentiment_engine_foundation` was generated via `prisma migrate dev` and applied to the real dev database, then deployed to the isolated test database via `npm run db:deploy:test`. `backend/test/dbHelpers.js`'s `truncateAll()` was extended (additively) to clean the new table.

**Disclosed reconciliation**: the originally-approved `MARKET_SENTIMENT_DATA_MODEL.md` (Phase AI-ENGINE-002) did not yet specify a `market` column, since market segmentation was introduced as explicit new scope in this implementation phase (mission §4). The model was extended with `market: MarketSentimentRegion` and the unique constraint changed to `[market, dimension, snapshotDate]` — a first-time schema definition informed by the fuller mission scope, not a destructive change to an already-migrated table (nothing had been migrated yet). This is documented in the schema's own header comment as well as here.

The repository is append-only: `createSnapshot` only ever calls `prisma.marketSentimentSnapshot.create` — no update method is exposed. The real `@@unique([market, dimension, snapshotDate])` constraint enforces this at the DB level too; a second capture attempt for the same market+day fails loudly (tested) rather than silently overwriting history.

### 6. Governance — `marketSentimentGovernance.js`

Reuses `canonicalVerdict.js`'s exact `FORBIDDEN_COMMITTEE_KEYS` denylist verbatim (not a second, competing list) — identical shape to the Options Agent's `optionsSignalGovernance.js`. `sanitizeSentimentReading()` strips any forbidden key and attaches the required `label: "Signal — not a recommendation"`; `marketSentimentService.getMarketSentiment()` applies it to both the overall reading and every per-dimension reading before returning. Event Envelope and scoring-vocabulary reuse: two new additive `scoringVocabulary.js` entries (`marketSentimentComponentConfidence`, `marketSentimentOverallConfidence`) document the confidence formulas in the same one place every other canonical score already lives — no new/competing scoring glossary. (Event Envelope projection and provider-health wiring are the same reusable pieces named in the architecture doc; no new envelope shape or health-reporting mechanism was invented — see "Deliberate scope decisions" below for what wasn't wired this phase.)

### 7. Explainability — every contributor's 7 required fields

Every entry in every dimension's `contributors` array (and the overall reading's `contributors`, which breaks down by dimension) carries exactly the fields mission §7 requires: `source`, `rawValue`, `normalizedValue`, `weight`, `confidence`, `freshness`, `contributionToScore` — verified structurally in tests (`marketSentimentScorers.test.js` asserts all 7 keys are present on every contributor News Sentiment produces).

## Governance verification

Every one of `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` was tested absent both from a directly-constructed dirty object (`marketSentimentGovernance.test.js`) and from the real, fully-computed, DB-round-tripped canonical reading (`marketSentimentService.test.js`). No `action`/`decision`/`verdict`/`finalDecision`/`recommendation` field is ever emitted.

## Deliberate scope decisions (disclosed, not discovered later)

- **No Express routes/controller were wired this phase** — explicitly out of scope per the mission ("No Express routes"). Every function is directly callable/testable and already shaped to match `MARKET_SENTIMENT_API.md`'s contract.
- **No scheduler was built** — explicitly out of scope ("No scheduler"). `captureSnapshot()` is fully callable/testable without one; a future scheduler can call it with no redesign, mirroring the Options Agent's precedent.
- **No UI** — explicitly out of scope, per the mission.
- **Market Breadth, Sector Rotation, and Earnings Trend remain permanently unavailable** in this phase — no real data source exists for any of the three anywhere in this codebase (verified before Phase AI-ENGINE-002's architecture was even written), and none was fabricated to hit "8 of 8."
- **`fearGreedProxy` (the existing, mislabeled field) was not reused** — Fear & Greed is a genuinely new composite of two independently real inputs, exactly as the architecture doc's §5b specified.
- **Provider-health wiring** (a `GET .../providers/health`-equivalent) was not built as a standalone function this phase, since there is no route to serve it from and `providerHealthService.js` already covers registered providers generically — deferred to the routing phase.

## Files created or changed

**Created**
- `backend/services/marketSentiment/marketSentimentDimensions.js`
- `backend/services/marketSentiment/marketSentimentScorers.js` (+ `.test.js`)
- `backend/services/marketSentiment/marketSentimentRollup.js` (+ `.test.js`)
- `backend/services/marketSentiment/marketSentimentGovernance.js` (+ `.test.js`)
- `backend/services/marketSentiment/marketSentimentRepository.js`
- `backend/services/marketSentiment/marketSentimentEngine.js` (+ `.test.js`)
- `backend/services/marketSentiment/marketSentimentService.js` (+ `.test.js`)
- `backend/prisma/migrations/20260726054952_market_sentiment_engine_foundation/migration.sql`
- `MARKET_SENTIMENT_IMPLEMENTATION_REPORT.md`, `MARKET_SENTIMENT_TEST_REPORT.md`

**Changed (additive only)**
- `backend/prisma/schema.prisma` — 1 new model, 2 new enums, zero existing-model changes.
- `backend/services/scoringVocabulary.js` — 2 new `SCORE_DEFINITIONS` entries.
- `backend/services/scoringVocabulary.test.js` — updated expected-score-name list (10 → 12).
- `backend/test/dbHelpers.js` — 1 new `deleteMany()` cleanup call.

## Verification

Full backend suite: `npm run test:backend` → **871/872 passing** (55 new Market Sentiment Engine tests, all passing). The 1 failure (`worldMemoryRepository.immutability.test.js`'s concurrent-revision-numbering test) is a pre-existing, unrelated flaky concurrency test — confirmed by re-running that file in isolation, where it passes; its module has no relation to anything built this phase.

## Remaining limitations

- No route/controller/feature-flag wiring — nothing in this phase is reachable over HTTP (explicit scope boundary).
- No scheduler — snapshot capture must be invoked directly until a future phase.
- 3 of 8 dimensions remain permanently unavailable until a real data source is connected for each (Market Breadth, Sector Rotation, Earnings Trend).
- Macro Events' event-calendar half (Fed/ECB/FOMC/Treasury) remains permanently disclosed-missing until one of those providers is genuinely implemented.
- No commit or push was made, per instructions.
