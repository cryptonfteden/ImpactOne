# Market Sentiment Engine — Data Model (Phase AI-ENGINE-002)

**Status:** Architecture only. The Prisma model definitions below are a design proposal in this codebase's real `schema.prisma` style (verified against the actual file) — no migration has been written or run, no model exists yet.

## 1. Overview — how this extends the real schema, not a parallel one

Only **one new table** is proposed. Everything else this design needs already exists:

| Existing table/module (unchanged) | Role in this design |
|---|---|
| `ThemeConfidenceSnapshot` | Not reused directly (different key shape — `themeKey` vs. a fixed dimension enum), but is the exact real precedent this design's new snapshot table copies verbatim: `id`, a key field, `date: String // YYYY-MM-DD`, a `Decimal(5,2)` score, `capturedAt`, and `@@unique([key, date])` (confirmed at `schema.prisma:482-492`). |
| `CanonicalEvent` | Material sentiment changes are additionally projected onto the canonical Event Envelope and persisted here, exactly like every other provider's events and the Options Agent's signals — so `findMatchedEvents`/Daily Feed/Themes never need special-case code to "know about" sentiment readings. |
| `ProviderRunLog` | Reused as-is for whichever component scorers are backed by a registered provider (e.g. a future real `earningsProvider`/`fedProvider` once connected) — no new run-log table. |
| `DecisionTrace.evidenceReferences` | Where a `SentimentReading`, once matched to a symbol's active evaluation, appears as evidence — additive JSONB, no schema change needed there. |
| `FeatureFlag` | Reused for rollout gating (`key: "market-sentiment-engine"`). |
| `Recommendation` | Read (never written) by the AI Recommendation Distribution component scorer via the existing `autonomousRecommendationRepository.listActive()` — no new relation, a runtime read exactly like `decisionCenterService.loadContext()` already does elsewhere. |

```
MarketSentimentSnapshot   (one row per dimension per day — low volume, retained indefinitely)
```

That's it. Component scorers compute their readings from data that is already either persisted elsewhere (recommendations, price history) or fetched live at run time (FRED, Polymarket, CFTC) — there is no need for a raw-ingestion table analogous to the Options Agent's `OptionsFlowPrint`, because this engine doesn't ingest a high-volume raw feed of its own; it reads already-existing platform data and existing provider fetches, and persists only the **result** of each day's computation.

## 2. New model

```prisma
// Phase AI-ENGINE-002 (proposed) — one row per (dimension, day), the
// durable historical record the daily/weekly trend endpoints read from
// (MARKET_SENTIMENT_API.md's /history/daily, /history/weekly,
// /snapshots/:date). Directly modeled on the real, already-running
// ThemeConfidenceSnapshot (schema.prisma:482-492) — same
// String-date/@@unique/@@map shape, generalized from "one key per theme"
// to "one key per sentiment dimension, plus one OVERALL row." No
// betaUserId: market sentiment is not personal data, same precedent as
// CanonicalEvent/ThemeConfidenceSnapshot.
enum MarketSentimentDimension {
  NEWS_SENTIMENT
  AI_RECOMMENDATION_DISTRIBUTION
  MARKET_BREADTH
  FEAR_GREED
  VOLATILITY
  SECTOR_ROTATION
  MACRO_EVENTS
  EARNINGS_TREND
  OVERALL
}

model MarketSentimentSnapshot {
  id           String                   @id @default(uuid())
  dimension    MarketSentimentDimension
  snapshotDate String // YYYY-MM-DD, same convention as ThemeConfidenceSnapshot.date

  // Nullable, not defaulted to 0/50 — a dimension unavailable that day
  // (architecture §3/§6) persists a real null, never a fabricated
  // placeholder score. This is the single most important field-level
  // decision in this schema: querying for "was this dimension available
  // on this day" is `score IS NOT NULL`, not a separate boolean the
  // score could silently disagree with.
  score      Decimal? @db.Decimal(5, 2)
  confidence Decimal? @db.Decimal(5, 2)

  // The real evidence that produced this score (architecture §8) — same
  // role as OptionsSignal.evidenceSnapshot. Empty array (not null) when
  // score is null.
  contributors Json

  // Every dimension this specific snapshot could NOT compute, with a
  // real reason each — for the OVERALL row, this is every unavailable
  // component; for a leaf dimension's own row, this is empty unless that
  // dimension itself depends on missing sub-inputs (architecture §5e's
  // Macro Events is the clearest example: real regime data, honestly
  // missing the event-calendar half).
  missingInputs String[]

  methodologyVersion String // e.g. "sentiment-engine-v1" — versions the rollup/confidence formula (architecture §6), same discipline as OptionsSignal.methodologyVersion
  capturedAt         DateTime @default(now())

  @@unique([dimension, snapshotDate])
  @@index([dimension, snapshotDate])
  @@map("market_sentiment_snapshots")
}
```

## 3. Why one table, not eight (or nine)

A single table keyed by `(dimension, snapshotDate)` — rather than one table per dimension, or a wide row with 8 score columns — was chosen for the same reason `ThemeConfidenceSnapshot` is one table for a dynamic set of themes rather than one column per theme: it is the natural shape for "N independently-available time series," it lets a future 9th dimension be added with zero schema change (just a new enum value), and every one of the API contract's endpoints (`/history/daily?dimension=X`, `/snapshots/:date`) maps directly onto a simple `WHERE dimension = ? AND snapshotDate = ?` / `WHERE snapshotDate = ?` query — no pivoting required. The `OVERALL` row is stored the same way as the 8 leaf dimensions (not a separate table/shape) because it has exactly the same fields and the same trend/history questions apply to it identically.

## 4. Retention and indexing

| Table | Expected volume | Retention |
|---|---|---|
| `MarketSentimentSnapshot` | Low — 9 rows/day (8 dimensions + `OVERALL`), once daily (architecture §12) | Retain indefinitely, same as `ThemeConfidenceSnapshot`/`DecisionTrace`/`WorldMemory*` — this is the durable, queryable trend history, and at ~3,300 rows/year the volume never approaches a pruning concern. |

The `@@unique([dimension, snapshotDate])` constraint makes the daily scheduler's write naturally idempotent (an upsert, same pattern `OptionsOpenInterestSnapshot`'s `@@unique([symbol, expiry, strike, optionType, snapshotDate])` already uses) — a re-run of the same day's snapshot job never creates a duplicate row. The one index on `[dimension, snapshotDate]` is exactly what both history endpoints and the single-date audit endpoint need — no speculative indexing beyond what `MARKET_SENTIMENT_API.md`'s endpoints actually query.

## 5. Append-only, no exceptions

Unlike `OptionsSignal` (which has one disclosed, bounded exception for OI confirmation), `MarketSentimentSnapshot` has **zero** update paths. A day's snapshot, once captured, is never revised — if a component scorer's inputs were later corrected, that would be reflected in a **future** day's snapshot, never a retroactive edit to a past one, exactly matching `ThemeConfidenceSnapshot`'s own existing behavior (`themeSnapshotScheduler.js` only ever upserts *today's* row) and the platform-wide `DecisionTrace`/`WorldMemory*` convention of preserving the real historical record rather than editing it.

## 6. Migration sequencing

Purely additive — one new table, one new enum, referenced by no existing table's foreign key, and zero changes to any existing model. This follows the same low-risk migration shape as the Options Agent's own three-table addition in Phase AI-ENGINE-001.1 — nothing here requires backfilling, and nothing here can break an existing query, since no existing table is touched.

## 7. Relationship to `eventEnvelope.js` / `scoringVocabulary.js`

- A material `OVERALL` sentiment change (architecture §9's disclosed threshold) is projected through `eventEnvelope.buildEventEnvelope()` with `eventType: "market-sentiment-update"` and `category: "overall"` (or the lowercase dimension name for a material single-dimension move) — reusing the exact same 19-required-field envelope every other provider's events already produce, not a bespoke shape.
- `marketSentimentComponentConfidence` and `marketSentimentOverallConfidence` (proposed, `MARKET_SENTIMENT_ENGINE.md` §6) are documented as new entries in `scoringVocabulary.js`'s `SCORE_DEFINITIONS`, with `apiField`s pointing at `SentimentReading.contributors[].confidence` and `SentimentReading.confidence` respectively — the single source of truth for what these numbers mean stays in the one place every other canonical score (now 12, once these 2 are added to the existing 10) is documented, never a second, competing scoring glossary.
