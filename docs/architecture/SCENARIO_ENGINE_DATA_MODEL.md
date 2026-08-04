# Predictive Scenario Engine — Data Model (Phase SCENARIO-ENGINE-001)

**Status:** Architecture only. The Prisma model definitions below are a design proposal in this codebase's real `schema.prisma` style — no migration has been written or run, no model exists yet.

## 1. Overview — two new tables; everything else reused

| Existing table/module (unchanged) | Role in this design |
|---|---|
| `IntelligenceBusEvent` | The evidence source — a `Scenario`'s `evidenceRefs` are real Bus event ids, never copied/duplicated data. |
| `WorldMemoryRecord` / `WorldMemoryCausalLink` / `WorldMemoryPrediction` | The observed-fact/inferred-relationship/predicted-outcome chain (`SCENARIO_ENGINE_ARCHITECTURE.md` §6) — reused for the "observed"/"inferred"/"predicted" labels, not reimplemented. A `WorldMemoryPrediction` row is created for each scenario's base-case prediction, exactly like a `Recommendation`'s prediction is today, with a new nullable `scenarioId` link (see §3). |
| `Outcome`, `TimeWindow`, `GradeLabel` | `TimeWindow`/`GradeLabel` enums are reused verbatim by the new `ScenarioOutcome` table (§2) — not redefined. `Outcome` itself stays `Recommendation`-scoped, unchanged; scenarios get their own outcome table because a scenario is a different, more specific claim (architecture §2 item 3). |
| `Recommendation` | A scenario may cite a real recommendation as supporting evidence (via `evidenceRefs`, by id) — never re-derives or restates its `action`. |
| `newsSourceScoringService`, `calibrationReportService`, `committeeScorecardService` | Extended (application-layer, not schema changes) to also read `ScenarioOutcome` rows — see architecture §8. |
| `FeatureFlag` | Reused for rollout gating (`key: "scenario-engine"`), same convention as the Options Agent/Sentiment Engine. |

Only two new tables are proposed:

```
Scenario          (the proactive, ranked, evidence-backed forecast — moderate volume, retained)
ScenarioOutcome   (the graded resolution of one scenario — low volume, retained indefinitely)
```

## 2. New models

```prisma
// Phase SCENARIO-ENGINE-001 (proposed) — one row per proactively-identified,
// ranked scenario. Never contains an action/decision/verdict field — see
// architecture §9; enforced the same structural way canonicalVerdict.js's
// FORBIDDEN_COMMITTEE_KEYS and the Options Agent/Sentiment Engine/
// Intelligence Bus already enforce it, by a sanitization step, not by
// convention alone.
enum ScenarioType {
  BASE
  UPSIDE
  DOWNSIDE
}

enum ScenarioStatus {
  ACTIVE       // still open, not yet confirmed/invalidated/expired
  CONFIRMED    // its stated confirmation condition was met
  INVALIDATED  // its stated invalidation condition was met
  EXPIRED      // its time horizon passed with neither condition met
  SUPERSEDED   // a newer scenario in the same series replaced it (same precedent as IntelligenceBusEvent)
}

model Scenario {
  id           String       @id @default(uuid())
  symbol       String?      // null for a market-wide/macro scenario (e.g. "Fed holds rates")
  scenarioType ScenarioType
  // Groups the BASE/UPSIDE/DOWNSIDE triad generated together, so they're
  // always displayed/graded as one set — mirrors buildScenarios()'s
  // existing per-recommendation triad, generalized to a standalone id
  // rather than being implicitly grouped by recommendationId.
  scenarioSetId String

  // Plain-language layer (architecture §7) — always both present; the
  // rule-based fallback is never silently upgraded to look AI-authored.
  whatIsExpected        String  @db.Text
  whyItMatters          String  @db.Text
  whatWouldChangeOurView String @db.Text
  translationSource     String  // "openai" | "fallback" — honest provenance, same tag dailyBriefService.js already uses

  // Real, reused fields — not recomputed, sourced from
  // scenarioEngineService.getScenario()/buildScenarios() (architecture §1)
  narrative        String  @db.Text
  probability      Decimal? @db.Decimal(5, 2) // null, never fabricated, when no real theme-matched probability exists
  priceImpactText  String?
  portfolioImpact  Json?   // null when not held — same honesty as buildPortfolioImpact()'s existing null-when-not-held behavior

  // Ranking (architecture §5) — every component stored, not just the
  // final rank, so the ranking itself is auditable/explainable.
  urgencyScore        Decimal? @db.Decimal(5, 2) // null when no real time-anchor exists — never guessed
  personalImpactScore Decimal? @db.Decimal(5, 2)
  compositeRank       Decimal? @db.Decimal(7, 2)
  rankPosition        Int?     // this scenario's position (1 = most important) among that day's ranked set — the input scenarioSelectionQualityService later grades against

  // Evidence — real Bus event ids only, never copied event bodies (avoids
  // a second, potentially-stale copy of evidence data).
  evidenceRefs Json // array of { intelligenceBusEventId, engineId, evidenceCategory: "observed"|"inferred"|"predicted"|"uncertain" }

  // The real, checkable conditions (architecture §6's "uncertainty" row)
  confirmationCondition String @db.Text
  invalidationCondition  String @db.Text
  // A real, known date/level this condition resolves against, when one
  // exists (e.g. an earnings date, a FOMC date, a price level) — null,
  // never fabricated, when no such real anchor exists (feeds urgencyScore).
  resolutionAnchorAt DateTime?

  status              ScenarioStatus @default(ACTIVE)
  supersededByScenarioId String?

  worldMemoryPredictionId String? // set once this scenario's base case is written into the existing WorldMemoryPrediction chain (architecture §6)
  methodologyVersion      String  // e.g. "scenario-engine-v1"

  generatedAt DateTime @default(now())
  expiresAt   DateTime?

  @@index([symbol, generatedAt])
  @@index([scenarioSetId])
  @@index([status])
  @@map("scenarios")
}

// Phase SCENARIO-ENGINE-001 (proposed) — the graded resolution of one
// scenario. Reuses the existing TimeWindow/GradeLabel enums verbatim
// (schema.prisma's Outcome model) rather than redefining them — a
// scenario's grading question ("was this specific claim right, over
// this window") is the same shape as a recommendation's, just scoped to
// a different claim. Append-only, same discipline as Outcome/DecisionTrace.
model ScenarioOutcome {
  id         String     @id @default(uuid())
  scenarioId String
  timeWindow TimeWindow
  gradeLabel GradeLabel

  // Same real, price-history-derived fields outcomeGradingService.js
  // already computes for Outcome — reused shape, not reinvented.
  windowReturnPct       Decimal? @db.Decimal(8, 4)
  benchmarkReturnPct    Decimal? @db.Decimal(8, 4)
  confirmationTriggered Boolean  // did the real confirmationCondition actually occur
  invalidationTriggered Boolean  // did the real invalidationCondition actually occur

  methodologyVersion String
  gradedAt           DateTime @default(now())

  @@unique([scenarioId, timeWindow, methodologyVersion])
  @@index([scenarioId])
  @@map("scenario_outcomes")
}
```

## 3. The one additive change to an existing model

`WorldMemoryPrediction` gains one new **nullable** column, `scenarioId String?`, alongside its existing nullable `recommendationId`/`decisionTraceId` — the exact same "loose, non-cascading FK-ish string" pattern that model already uses (`schema.prisma`'s own header comment on this model: "a thin link into the existing Recommendation/DecisionTrace tables"). This is additive and nullable — zero impact on any existing row (which will simply have `scenarioId: null`) and zero change to any existing query that doesn't reference the new column.

## 4. Retention and indexing

| Table | Expected volume | Retention |
|---|---|---|
| `Scenario` | Moderate — proactively generated, ranked, and superseded/expired regularly (not one per raw event, unlike `IntelligenceBusEvent`) | Retain indefinitely, same as `DecisionTrace`/`OptionsSignal`/`MarketSentimentSnapshot` — this is the durable, queryable forecast history `scenarioSelectionQualityService` needs. |
| `ScenarioOutcome` | Low — one row per (scenario, time window) graded | Retain indefinitely, same as `Outcome`. |

Indexes chosen for the two real query shapes this design needs: "scenarios for one symbol, most recent first" (`[symbol, generatedAt]`) and "the full triad generated together" (`[scenarioSetId]`) — no speculative indexing beyond what the architecture doc's ranking/grading flows actually require.

## 5. Migration sequencing

Purely additive: two new tables, two new enums (`ScenarioType`, `ScenarioStatus`), and one new nullable column on one existing table (`WorldMemoryPrediction.scenarioId`) — the same low-risk shape as every prior phase's migration (Options Agent, Sentiment Engine, Intelligence Bus). Nothing here requires backfilling, and nothing here can break an existing query, since no existing column is altered or removed and the one existing-table change is a nullable addition.

## 6. Why not extend `Outcome`/`Recommendation` directly instead of adding new tables?

Considered and rejected: adding a nullable `scenarioId` to the existing `Outcome` model (alongside its `recommendationId`) would have meant loosening `Outcome`'s existing `@@unique([recommendationId, timeWindow, methodologyVersion])` constraint to accommodate a row that has a `scenarioId` but no `recommendationId` — a real behavior change to an already-shipped, already-tested model that every existing `outcomeGradingService`/`calibrationReportService`/`committeeScorecardService` query already depends on. A new `ScenarioOutcome` table with the identical real grading shape avoids touching that contract at all, matching this platform's established "additive new table over destructive existing-table change" precedent from every prior phase.
