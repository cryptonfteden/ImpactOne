# Database Migration Plan — Phase F2

Design only — no migration has been created or applied. Every change below is additive-only (new table, new nullable columns, new indexes), matching this codebase's established migration convention (see D1's `regimeSnapshot`/`evidenceMatrixSnapshot` additions for precedent). No existing column, constraint, or required field changes.

## New Model: `BetaUser`

```prisma
model BetaUser {
  id         String   @id @default(uuid())
  label      String
  inviteCode String   @unique
  createdAt  DateTime @default(now())

  @@map("beta_users")
}
```

- `label` — human-readable, founder-assigned (e.g. a first name). Not used for lookup, display only.
- `inviteCode` — the only thing a beta user ever provides. Unique, short, founder-generated (e.g. 6-8 alphanumeric characters), not a password (no hashing needed — it's an identifier, not a secret guarding sensitive data, consistent with this being a 5-person trusted beta).
- Five rows created once, directly, before beta launch — not via a signup flow (no such flow is being built).

## Modified Models — All Changes Additive/Nullable

```prisma
model Portfolio {
  // ...existing fields unchanged...
  betaUserId String?

  @@index([betaUserId])
}

model InvestorProfile {
  // ...existing fields unchanged...
  betaUserId String?

  @@index([betaUserId])
}

model Recommendation {
  // ...existing fields unchanged...
  betaUserId String?

  @@index([betaUserId])
}

model AnalyticsEvent {
  // ...existing fields unchanged...
  betaUserId String?

  @@index([betaUserId])
}

model RecommendationFeedback {
  // ...existing fields unchanged...
  betaUserId String?

  @@index([betaUserId])
}
```

No foreign-key constraint to `BetaUser.id` is proposed for the initial migration (deliberately — see "On Foreign Keys" below); each is a plain nullable string column with an index for query performance, matching the existing `sessionId` column's own treatment on `AnalyticsEvent`.

## Explicitly NOT Modified

- `DecisionTrace`, `Outcome`, `RecommendationLifecycleEvent` — inherit scoping transitively via their existing `recommendationId` relation; no new column needed. Confirmed by the isolation plan's design: any query needing "this beta user's outcomes" joins through `Recommendation.betaUserId`.
- `WorldMemoryRecord` and its whole cluster (`WorldMemoryPrediction`, `WorldMemoryCausalLink`, `WorldMemoryStateChange`, `WorldMemoryThesisRevision`, `WorldMemorySectorImpact`, `WorldMemoryLesson`) — explicitly shared cross-user learning substrate by original design; out of scope.
- `ProviderRunLog` — infra-level, correctly has no per-user concept, untouched.

## Migration Sequence (as it would be run, when implementation is requested)

1. `npx prisma migrate dev --name f2_beta_user_isolation` from repo root (per this codebase's established convention — see D1's migration notes).
2. Prisma generates the new `BetaUser` table and the 5 new nullable+indexed columns. Because every new column is nullable with no default constraint violation possible, this is a zero-downtime, zero-backfill-required migration — every existing row simply gets `betaUserId: NULL`.
3. `npm run db:deploy:test` to propagate to the test database (existing convention).
4. `npm run db:generate` to regenerate the Prisma client.
5. Manually insert the 5 `BetaUser` rows (SQL or a one-off script) before beta launch — not part of the migration itself.

## Backfill Policy

**None required, and none recommended.** Every pre-existing row (279+ recommendations, the single existing Portfolio/InvestorProfile, all historical AnalyticsEvents/Feedback) is legitimately "no beta user" data — it predates the beta and was never associated with any of the 5 people. Setting `betaUserId: NULL` for all of it is the *honest* backfill, not a placeholder to fix later. This mirrors D1's own "never fabricate, never backfill historical data with information that didn't exist at the time" principle exactly.

## On Foreign Keys

A real `@relation` foreign key (`betaUserId String? \n betaUser BetaUser? @relation(...)`) is the more "correct" long-term shape and is not ruled out — but the initial design deliberately proposes a plain unconstrained column for the first migration, for one practical reason: it keeps the migration trivially reversible (dropping a plain column vs. dropping a column with a constraint and any dependent index) while this scheme is still being validated against 5 real users. Adding the formal relation constraint later, once the beta confirms this is the right shape, is itself a small additive follow-up migration — not a blocker to including it from day one if preferred at implementation time.

## Rollback

Every change here is additive. Rollback (if ever needed) is `betaUserId` column drops + the `BetaUser` table drop — no existing data, constraint, or application code path is altered, so a rollback cannot corrupt or lose any pre-existing recommendation, portfolio, profile, feedback, or analytics data.
