# Unusual Options Agent — Data Model (Phase AI-ENGINE-001)

**Status:** Architecture only. The Prisma model definitions below are a design proposal in this codebase's real `schema.prisma` style (verified against the actual file) — no migration has been written or run, no model exists yet.

## 1. Overview — how this extends the real schema, not a parallel one

Three new tables are proposed. Everything else this design needs **already exists**:

| Existing table (unchanged) | Role in this design |
|---|---|
| `CanonicalEvent` | Options signals are additionally projected onto the canonical Event Envelope and persisted here, exactly like every other provider's events — so `findMatchedEvents`/Daily Feed/Themes never need special-case code to "know about" options signals. |
| `ProviderRunLog` | Reused as-is for `optionsFlow` provider ingestion run health (`providerId: "optionsFlow"` is already a valid value — the provider is already registered in `providerRegistry.js`). No new run-log table. |
| `DecisionTrace.evidenceReferences` | Where an `OptionsSignal`, once matched to a symbol's active evaluation, appears as evidence — additive JSONB, no schema change needed there. |
| `WorldMemoryRecord` / `WorldMemoryPrediction` / `Outcome` | Reused for outcome-grading a signal's real predictive value over time — no parallel grading system. |
| `FeatureFlag` | Reused for rollout gating (`key: "options-agent"`). |
| `Position` / `WatchlistFolderItem` | Read (never written) to determine "portfolio-relevant"/"workspace-relevant" scoping in the API layer — this design adds no new relation table for that; it's a runtime filter, same pattern `decisionCenterService.loadContext()` already uses. |

Only the raw ingestion/detection data — which has no existing home — is new:

```
OptionsFlowPrint            (raw, normalized trade prints — high volume, pruned)
OptionsOpenInterestSnapshot  (daily OI per contract — moderate volume, retained)
OptionsSignal                (the detected anomaly — low volume, retained indefinitely)
```

## 2. New models

```prisma
// Phase AI-ENGINE-001 (proposed) — raw, normalized options trade prints,
// the ingestion-layer detail the 5 detectors in OPTIONS_AGENT_ARCHITECTURE.md
// §5 run against. Deliberately NOT the durable record (see §3, retention) —
// OptionsSignal is. No betaUserId: options market data is not personal,
// same precedent as CanonicalEvent.
model OptionsFlowPrint {
  id              String       @id @default(uuid())
  symbol          String
  expiry          DateTime     @db.Date
  strike          Decimal      @db.Decimal(12, 4)
  optionType      OptionRight
  exchange        String
  tradeTimestamp  DateTime
  price           Decimal      @db.Decimal(12, 4)
  size            Int
  notionalValue   Decimal      @db.Decimal(18, 2)
  bidAtTrade      Decimal?     @db.Decimal(12, 4)
  askAtTrade      Decimal?     @db.Decimal(12, 4)
  // Inferred from price vs. bidAtTrade/askAtTrade at ingestion time — never
  // guessed without both real values present (see architecture §5c).
  aggressorSide   AggressorSide @default(UNKNOWN)
  sourceProviderId String       // always "optionsFlow" today — kept as a
                                 // string, not a hardcoded constant, so a
                                 // future second vendor doesn't require a
                                 // schema change (same pattern CanonicalEvent
                                 // already uses for providerId).
  ingestedAt      DateTime     @default(now())

  @@index([symbol, tradeTimestamp])
  @@index([symbol, expiry, strike, optionType])
  @@map("options_flow_prints")
}

enum OptionRight {
  CALL
  PUT
}

enum AggressorSide {
  BUY
  SELL
  UNKNOWN
}

// Phase AI-ENGINE-001 (proposed) — one row per (contract, session) open
// interest snapshot, published end-of-day by the exchanges/OCC. The one
// input the OI-confirmation detector (architecture §5e) needs and that
// intraday trade prints alone cannot supply.
model OptionsOpenInterestSnapshot {
  id               String      @id @default(uuid())
  symbol           String
  expiry           DateTime    @db.Date
  strike           Decimal     @db.Decimal(12, 4)
  optionType       OptionRight
  openInterest     Int
  snapshotDate     DateTime    @db.Date
  sourceProviderId String
  ingestedAt       DateTime    @default(now())

  @@unique([symbol, expiry, strike, optionType, snapshotDate])
  @@index([symbol, snapshotDate])
  @@map("options_open_interest_snapshots")
}

// Phase AI-ENGINE-001 (proposed) — the durable, queryable output of the
// detection pipeline. Append-only by convention (same discipline as
// DecisionTrace/WorldMemory*): the repository built on this model should
// expose create + read only, never an update — a re-evaluated OI
// confirmation status is a controlled exception (§4), not open-ended
// mutability.
//
// No betaUserId: this is market-wide evidence, not a personal
// recommendation — matches CanonicalEvent, not Recommendation/PriceAlert.
// No action/decision/verdict field anywhere on this model, ever — enforced
// structurally the same way canonicalVerdict.js's FORBIDDEN_COMMITTEE_KEYS
// enforces it for the Committee (see architecture §8).
model OptionsSignal {
  id          String            @id @default(uuid())
  symbol      String
  expiry      DateTime          @db.Date
  strike      Decimal           @db.Decimal(12, 4)
  optionType  OptionRight
  signalType  OptionsSignalType
  detectedAt  DateTime          @default(now())

  aggressorSide           AggressorSide
  totalVolume             Int
  baselineVolume          Int?      // null during the baseline-bootstrap window (architecture §5a/§12) — never fabricated
  volumeMultiple          Decimal?  @db.Decimal(8, 2)
  notionalValue           Decimal   @db.Decimal(18, 2)

  // Sweep-specific (null when signalType doesn't involve a sweep)
  sweepExchangeCount      Int?
  // Block-specific (null when no single print cleared the block threshold)
  largestSinglePrintSize  Int?

  // OI confirmation — staged, honest, one-session-lagged (architecture §5e)
  openInterestPriorSession Int?
  openInterestDelta       Int?
  oiConfirmationStatus    OiConfirmationStatus @default(PENDING)

  // Skew corroboration (architecture §5b/§6)
  putCallSkewZScore       Decimal?  @db.Decimal(6, 3)

  anomalyScore  Decimal @db.Decimal(5, 2)
  explanation   String  @db.Text // always generated per-signal (architecture §7), never a shared template
  evidenceSnapshot Json          // the raw aggregated detector inputs — auditability, same role as DecisionTrace's inputEvidence
  methodologyVersion String      // e.g. "options-agent-v1" — versions the confidence formula (architecture §6), same discipline as Outcome.methodologyVersion

  sourceProviderId String

  // Loose, non-cascading links — same nullable "FK-ish string, not a hard
  // relation" pattern WorldMemoryPrediction/WorldMemoryCausalLink already
  // use, so this table's own append-only guarantee is never put at risk by
  // a cascading delete from another table.
  canonicalEventId    String? // set once projected onto the Event Envelope and persisted as a CanonicalEvent
  worldMemoryRecordId String? // set once promoted into World Memory (architecture §8)

  createdAt DateTime @default(now())

  @@index([symbol, detectedAt])
  @@index([signalType])
  @@index([symbol, expiry, strike, optionType])
  @@map("options_signals")
}

enum OptionsSignalType {
  VOLUME_SPIKE
  SWEEP
  BLOCK_TRADE
  CALL_PUT_SKEW
}

enum OiConfirmationStatus {
  PENDING
  CONFIRMED_NEW_POSITION
  CONFIRMED_CLOSING
  UNCONFIRMED
}
```

## 3. Retention and indexing

| Table | Expected volume | Retention |
|---|---|---|
| `OptionsFlowPrint` | High — every ingested trade print, per contract, per session | Prune rows older than the longest detection window (proposed default: 30 days) via a scheduled job matching the shape of the existing schedulers (architecture §9) — the durable record is `OptionsSignal.evidenceSnapshot`, not the raw prints themselves. |
| `OptionsOpenInterestSnapshot` | Moderate — one row per (contract, session) | Retain indefinitely; volume is naturally bounded (one row per contract per trading day) and useful for future baseline/backtesting work. |
| `OptionsSignal` | Low — anomalies only, not every print | Retain indefinitely, same as `DecisionTrace`/`WorldMemory*` — this is the durable, queryable evidence trail. |

Indexes on all three are chosen for the two real query shapes this design's own API contract (`OPTIONS_AGENT_API.md`) requires: "recent activity for one symbol" (`[symbol, timestamp/date]`) and "recent activity for one exact contract" (`[symbol, expiry, strike, optionType]`) — no speculative indexes beyond what §2's endpoints actually need.

## 4. The one intentional exception to "append-only"

`OptionsSignal.oiConfirmationStatus` (and its accompanying `openInterestDelta`) is the **one** field on this model that a later process is expected to set after creation — the daily OI-confirmation job (architecture §9) transitions `PENDING` → `CONFIRMED_NEW_POSITION`/`CONFIRMED_CLOSING`/`UNCONFIRMED` exactly once, the session after detection. This is disclosed here explicitly rather than silently violating the "immutable by convention" pattern the rest of this schema (and `DecisionTrace`) follows — it is a single, bounded, one-time transition on one enum field, not open-ended mutability, and should be implemented as its own narrow repository method (e.g. `confirmOpenInterest(signalId, ...)`), never a general-purpose `update`.

## 5. Migration sequencing

Purely additive — three new tables, two new enums (`OptionRight`, `AggressorSide`, `OptionsSignalType`, `OiConfirmationStatus` — four, precisely) referenced by no existing table's foreign key, and zero changes to any existing model. This follows the same low-risk migration shape already used for the Phase D1 `DecisionTrace` additions (`regimeSnapshot`/`evidenceMatrixSnapshot`/`benchmarkVersion` — all nullable, additive JSONB/string columns) — nothing here requires backfilling, and nothing here can break an existing query, since no existing table is touched.

## 6. Relationship to `eventEnvelope.js` / `scoringVocabulary.js`

- Every `OptionsSignal` that graduates to evidence is projected through `eventEnvelope.buildEventEnvelope()` with `eventType: "unusual-options-activity"` and `category` set to the lowercase `signalType` (e.g. `"sweep"`) — reusing the exact same 19-required-field envelope every other provider's events already produce, not a bespoke shape.
- `optionsAnomalyConfidence` (proposed, `OPTIONS_AGENT_ARCHITECTURE.md` §6) is documented as a new entry in `scoringVocabulary.js`'s `SCORE_DEFINITIONS`, with `apiField: "OptionsSignal.anomalyScore"` — the single source of truth for what this number means stays in the one place every other canonical score is documented, never a second, competing scoring glossary.
