# Claim Intelligence Layer — Data Model (Phase AI-CORE-001)

**Status:** Implemented and migrated (`backend/prisma/migrations/20260726141925_claim_intelligence_layer`). Applied to both the dev and test databases.

## 1. Overview — four new tables, zero destructive changes

| Existing table/module (unchanged) | Role in this design |
|---|---|
| `IntelligenceBusEvent` | The evidence source — every `ClaimEvidence.intelligenceBusEventId` is a real Bus event id, never copied event data. |
| `TimeWindow` (enum) | Reused verbatim for `Claim.timeHorizon` — no parallel horizon vocabulary. |
| `GradeLabel` (enum) | Reused verbatim for `ClaimOutcome.gradeLabel` — maps 1:1 onto `ClaimStatus`'s `RESOLVED_*`/`INSUFFICIENT_DATA` values. |
| `canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS` | Reused (not a schema element, but the one governance vocabulary every table's rows are checked against). |
| `Scenario`, `Recommendation`, `WorldMemoryPrediction` | Referenced only via loose, nullable, non-cascading string ids (`Claim.scenarioId`/`recommendationId`/`worldMemoryPredictionId`) — no hard Prisma relation, so deleting any of these can never cascade into deleting claim history. None of these three links is populated by this phase's code (no scenario engine or recommendation-linking logic was wired this phase) — the columns exist for a future phase to populate. |
| `portfolioEngineService` | Read (never written) by `claimConsumerService.getClaimsByPortfolioRelevance()` — no new relation. |

## 2. New models

```prisma
enum ClaimStatus {
  DRAFT
  ACTIVE
  STRENGTHENING
  WEAKENING
  CONTESTED
  INVALIDATED
  EXPIRED
  RESOLVED_CORRECT
  RESOLVED_PARTIAL
  RESOLVED_INCORRECT
  INSUFFICIENT_DATA
}

enum ClaimDirection {
  BULLISH
  BEARISH
  NEUTRAL
}

enum ClaimEvidenceStance {
  SUPPORTS
  CONTRADICTS
  INVALIDATES
}

model Claim {
  id         String         @id @default(uuid())
  claimType  String
  subject    String
  market     String?
  symbols    String[]
  sectors    String[]
  regions    String[]

  statement              String @db.Text
  plainLanguageStatement String @db.Text

  expectedDirection ClaimDirection
  expectedMagnitude Json?          // honestly null — no real estimate this phase
  timeHorizon       TimeWindow     // reused enum

  probability Decimal? @db.Decimal(5, 2)  // NOT the same computation as confidence — see CLAIM_CONTRACT.md §4
  confidence  Decimal? @db.Decimal(5, 2)
  uncertainty Decimal? @db.Decimal(5, 2)

  assumptions            String[]
  confirmationConditions String[]
  invalidationConditions String[]
  portfolioImpact        Json?     // honestly null this phase

  sourceAgents String[]
  provenance   Json

  identityKey String @unique       // structural duplicate prevention (mission §4)

  firstObservedAt DateTime
  lastUpdatedAt   DateTime  @updatedAt
  expiresAt       DateTime?

  status     ClaimStatus @default(DRAFT)
  resolution Json?                 // denormalized summary; ClaimOutcome remains authoritative

  methodologyVersion  String
  supersededByClaimId String?

  scenarioId              String?  // loose, unpopulated this phase
  recommendationId        String?  // loose, unpopulated this phase
  worldMemoryPredictionId String?  // loose, unpopulated this phase

  createdAt DateTime @default(now())

  @@index([status])
  @@index([subject])
  @@map("claims")
}

model ClaimEvidence {  // append-only — create only, no update/delete method exposed
  id                     String              @id @default(uuid())
  claimId                String
  intelligenceBusEventId String?
  sourceEngine           String
  sourceProvider         String?
  stance                 ClaimEvidenceStance
  observedFact           String              @db.Text
  inference              String?             @db.Text
  freshness              Json
  confidence             Decimal?            @db.Decimal(5, 2)
  independenceGroup      String
  contributionToClaim    Decimal?            @db.Decimal(6, 2)
  addedAt                DateTime            @default(now())

  @@index([claimId])
  @@map("claim_evidence")
}

model ClaimTransition {  // append-only audit log
  id                   String       @id @default(uuid())
  claimId              String
  fromStatus           ClaimStatus?
  toStatus             ClaimStatus
  reason               String       @db.Text
  triggeringEvidenceId String?
  transitionedAt       DateTime     @default(now())

  @@index([claimId])
  @@map("claim_transitions")
}

model ClaimOutcome {
  id                 String     @id @default(uuid())
  claimId            String
  gradeLabel         GradeLabel  // reused enum

  predictedDirection ClaimDirection
  actualDirection    ClaimDirection?
  directionCorrect   Boolean?
  magnitudeErrorPct  Decimal?       @db.Decimal(8, 4)
  timingErrorDays    Int?
  calibrationError   Decimal?       @db.Decimal(8, 4)  // honestly null when probability was null

  windowReturnPct    Decimal? @db.Decimal(8, 4)
  benchmarkReturnPct Decimal? @db.Decimal(8, 4)

  learningFeedback Json  // bounded, disclosed — never automatically applied (mission §10)

  methodologyVersion String
  gradedAt           DateTime @default(now())

  @@unique([claimId, methodologyVersion])
  @@index([claimId])
  @@map("claim_outcomes")
}
```

## 3. Why one Claim table (not per-claim-type tables)

`claimType` is a plain string column (currently always `"DIRECTIONAL_FORECAST"`), the same "string, not enum, so a new category never requires a migration" pattern `CanonicalEvent.providerId`/`IntelligenceBusEvent.engineId` already use — a future claim type (e.g. an earnings-beat claim, a macro-regime claim) is a new value in this column, not a new table.

## 4. Retention and indexing

| Table | Expected volume | Retention |
|---|---|---|
| `Claim` | Moderate — one row per distinct identity, updated in place for its scalar fields | Retained indefinitely, same as `DecisionTrace`/`OptionsSignal`/`Scenario`. |
| `ClaimEvidence` | Moderate-high — one row per real evidence contribution | Retained indefinitely — this is the durable, auditable evidence trail. |
| `ClaimTransition` | Low-moderate — one row per real status change | Retained indefinitely — the lifecycle audit log. |
| `ClaimOutcome` | Low — one row per (claim, methodologyVersion) grading | Retained indefinitely, same as `Outcome`. |

Indexes chosen for the real query shapes `claimRepository.js`/`claimConsumerService.js` actually use: `[status]` (active/contested/resolved feeds), `[subject]` (per-symbol lookups), `[claimId]` on every satellite table (the ledger/audit/outcome joins) — no speculative indexing.

## 5. Append-only discipline, and the one bounded exception

`ClaimEvidence` and `ClaimTransition` are strictly create-only. `Claim` has exactly one bounded, disclosed update path — `claimRepository.updateClaimScalars()` — which touches only `confidence`/`probability`/`uncertainty`/`status`/`expiresAt`/`resolution`/`supersededByClaimId`/`sourceAgents`, never a generic patch, matching the same "narrow, single-purpose repository method" precedent as `OptionsSignal.confirmOpenInterest`.

## 6. Migration sequencing

Purely additive: four new tables, three new enums, and zero changes to any existing model — the same low-risk shape as every prior phase's migration (Options Agent, Sentiment Engine, Intelligence Bus). The three loose links to `Scenario`/`Recommendation`/`WorldMemoryPrediction` are plain nullable string columns, not foreign keys — nothing here can break an existing query or cascade a delete.
