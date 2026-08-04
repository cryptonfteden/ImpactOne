# Intelligence Bus — Canonical Event Schema (Phase AI-ENGINE-003)

**Status:** Implemented. This is the real schema `intelligenceEventContract.js` validates against and `intelligenceBusRepository.js` persists — not a proposal.

## 1. The raw event every engine submits

```ts
{
  engineId: string,          // must be a key in intelligenceBusRegistry.KNOWN_ENGINES
  eventType: string,         // engine-defined, e.g. "SWEEP", "OVERALL_UPDATE"
  symbols: string[],         // may be empty for a market-wide event (e.g. sentiment)
  payload: object,           // engine-specific body — already governance-sanitized by the engine
  provenance: {
    sourceEngine: string,    // required
    sourceEventId?: string,  // the engine's own id for this event, for audit
    sourceUrl?: string,
    sourceName?: string,
    ...engine-specific fields (e.g. sentiment's `market`)
  },
  confidence?: number,       // 0-100, or omit/null when the engine has none
  evidenceRefs?: array,      // optional, same role as DecisionTrace.evidenceReferences
  publishedAt: string | Date,
  expiresAt?: string | Date, // optional override of the engine's registry-default expiry
  methodologyVersion: string,
  deduplicationKey?: string, // optional — the Bus computes one deterministically if omitted
}
```

`intelligenceEventContract.validateRawEvent(raw)` returns `{ valid: boolean, errors: string[] }` — every violation reported at once. Required: `engineId`, `eventType`, `symbols`, `payload`, `provenance` (with `provenance.sourceEngine`), `publishedAt`, `methodologyVersion`.

## 2. What the Bus adds — the persisted, canonical shape

Every field mission §1 requires, plus the fields needed to satisfy the other 8 responsibilities:

```ts
{
  id: string,
  engineId: string,
  eventType: string,
  symbols: string[],           // uppercased by the Bus
  confidence: number | null,   // normalized (intelligenceBusConfidence.normalizeConfidence)
  rawConfidence: number | null,// exactly what the engine submitted, before normalization
  provenance: object,          // carried through unmodified
  evidenceRefs: array,
  payload: object,             // re-sanitized by the Bus regardless of what the engine already did
  identityKey: string,         // (engineId, eventType, sorted symbols) — the series identity
  deduplicationKey: string,
  publishedAt: string,
  ingestedAt: string,
  expiresAt: string | null,
  lifecycleStatus: "ACTIVE" | "EXPIRED" | "SUPERSEDED",  // recomputed at every read
  supersededByEventId: string | null,
  methodologyVersion: string,
  canonicalEventId: string | null,  // set once projected onto CanonicalEvent
  dataFreshness: { ageMs: number | null, isFresh: boolean, asOf?: string }, // attached at read time
  label: "Signal — not a recommendation",  // governance marker, always present
}
```

No `action`/`decision`/`verdict`/`finalDecision`/`recommendation` field can ever appear on this shape — `intelligenceBusGovernance.assertNoGovernanceViolation()` throws at publish time if one is present (top-level or nested in `payload`), and `sanitizeEvent()` strips defensively at every read regardless.

## 3. The Prisma model (real, migrated)

```prisma
enum IntelligenceBusLifecycleStatus {
  ACTIVE
  EXPIRED
  SUPERSEDED
}

model IntelligenceBusEvent {
  id        String @id @default(uuid())
  engineId  String
  eventType String
  symbols   String[]

  confidence    Decimal? @db.Decimal(5, 2)
  rawConfidence Decimal? @db.Decimal(5, 2)

  provenance   Json
  evidenceRefs Json
  payload      Json

  identityKey      String
  deduplicationKey String @unique

  publishedAt DateTime
  ingestedAt  DateTime  @default(now())
  expiresAt   DateTime?

  lifecycleStatus     IntelligenceBusLifecycleStatus @default(ACTIVE)
  supersededByEventId String?

  methodologyVersion String
  canonicalEventId   String?

  createdAt DateTime @default(now())

  @@index([engineId, publishedAt])
  @@index([identityKey])
  @@index([lifecycleStatus])
  @@map("intelligence_bus_events")
}
```

Migration: `backend/prisma/migrations/20260726062932_intelligence_bus_foundation/migration.sql` — purely additive, applied to both the dev and test databases.

## 4. Worked examples per named engine

Every `engineId` in `intelligenceBusRegistry.KNOWN_ENGINES`, with a realistic `eventType`/`payload`/`provenance` shape and its real `staleAfterMs` default:

| engineId | Example eventType | Example payload keys | staleAfterMs default | Why |
|---|---|---|---|---|
| `options` | `SWEEP`, `BLOCK_TRADE`, `VOLUME_SPIKE`, `CALL_PUT_SKEW` | `anomalyScore`, `explanation`, `oiConfirmationStatus` (real `OptionsSignal` fields) | 15 min | Options flow is intraday-time-sensitive (`OPTIONS_AGENT_ARCHITECTURE.md` §9) |
| `sentiment` | `OVERALL_UPDATE`, `DIMENSION_UPDATE` | `score`, `contributors`, `missingInputs` (real `SentimentReading` fields) | 24 h | Daily-cadence snapshot engine (`MARKET_SENTIMENT_ENGINE.md` §12) |
| `macro` | *(future engine — not yet built)* | — | 24 h | Placeholder default; to be revisited when a real macro-event engine exists |
| `earnings` | *(future engine — not yet built)* | — | 24 h | Placeholder default |
| `ownership` | *(future engine — not yet built)* | — | 7 days | Institutional ownership filings change quarterly/monthly, not daily |
| `shortInterest` | *(future engine — not yet built)* | — | 14 days | FINRA short-interest data is real but published only twice monthly |
| `correlation` | *(future engine — not yet built)* | — | 24 h | Placeholder default |
| `news` | *(future engine — not yet built)* | — | 1 h | Wire news is highly time-sensitive |

Only `options` and `sentiment` are real, already-built engines as of this phase (Phases AI-ENGINE-001.1/002.1). The other 6 are forward-declared identities with disclosed, reasoned defaults — not fabricated integrations.

## 5. Versioning

`methodologyVersion` is carried on every event exactly as the engine submitted it (e.g. `"options-agent-v1"`, `"sentiment-engine-v1"`) — the Bus never overwrites or reinterprets an engine's own methodology version. The Bus's own internal logic (dedup/confidence/lifecycle formulas) is versioned separately as `intelligenceBusService.METHODOLOGY_VERSION = "intelligence-bus-v1"`, used only as the fallback when an engine submission omits its own version.
