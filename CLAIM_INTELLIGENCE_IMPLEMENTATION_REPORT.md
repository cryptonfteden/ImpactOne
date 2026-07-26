# Claim Intelligence Layer — Implementation Report (Phase AI-CORE-001)

## Mission

Design and implement the Claim Intelligence Layer — the canonical reasoning object of ImpactOne — sitting above the existing Intelligence Bus (Phase AI-ENGINE-003), consuming its events, forming/updating Claims, tracking their lifecycle, grading their eventual outcome, and producing bounded learning feedback. Initial adoption: Options Agent and Sentiment Engine only.

## What was built

All new code lives under `backend/services/claimIntelligence/` (11 implementation files + 8 test files).

### 1. Canonical Claim contract — `claimContract.js`

`composeClaimView(claimRow, evidenceRows)` composes the full, strict contract (every field mission §1 lists) at read time — `evidence`/`counterEvidence` are always derived from the real, append-only `ClaimEvidence` ledger, never duplicated on the `Claim` row itself. A `reasoning` block makes the observed/inferred/predicted/uncertain distinction explicit (mission §1's final requirement), built from the same real fields, not a new taxonomy. See `CLAIM_CONTRACT.md` for the full shape.

### 2. Claim lifecycle — `claimLifecycle.js`

All 11 required statuses, with a deterministic, pure transition function (`computeNextStatusAfterEvidence`) and a total grade-to-status mapping (`statusForGradeLabel`, reusing the existing `GradeLabel` enum). Every transition is recorded in the append-only `ClaimTransition` audit log. See `CLAIM_LIFECYCLE.md` for the full rule set and thresholds.

### 3. Claim formation — `claimFormationService.js`

`ingestBusEvent(busEvent, { now })` is the one orchestration point: translates a real Bus event into evidence (`claimEvidenceLedger.js`), computes/looks up identity (`claimIdentity.js`), either creates a new `DRAFT` claim or updates an existing one, detects and cross-links direct contradictions (never silently merging them), recomputes confidence/probability/uncertainty (`claimConfidence.js`), and records every real status change. A brand-new claim always starts `DRAFT` with one evidence entry and is never promoted until `MIN_EVIDENCE_BREADTH_FOR_ACTIVE` (2) real entries exist — mission §3's "never converts a single raw signal into unjustified certainty," enforced structurally.

### 4. Claim identity and reconciliation — `claimIdentity.js`

`computeIdentityKey({ subject, expectedDirection, timeHorizon, symbols, sectors, regions, causalContext })` — direction and time horizon are both part of identity, which is the single design decision that correctly handles every reconciliation case mission §4 names: semantically identical claims (same key → update), contradictory claims (opposite direction → different key → separate claim, cross-linked as counter-evidence, never merged), different time horizons (different key → separate claim), and partially overlapping claims (different causal context → different key, kept separate until real evidence links them). A real `@@unique` DB constraint on `Claim.identityKey` makes duplicate prevention structural.

### 5. Confidence and probability — `claimConfidence.js`

Two functions, zero shared inputs: `aggregateConfidence` (evidence quality — sourceReliability/freshness/independence/breadth/agreement, dominance-capped, disclosed fixed weights) and `aggregateProbability` (likelihood — real directional-agreement ratio, optionally blended with real historical calibration). `applyBoundedConfidenceUpdate`/`applyBoundedProbabilityUpdate` cap how far a single new evidence entry can move either value. Both honestly `null` when there's nothing real to compute from.

### 6. Evidence ledger — `claimEvidenceLedger.js` + `ClaimEvidence` (append-only)

`buildEvidenceCandidateFromBusEvent()` translates a real Bus event (options or sentiment payload shape) into a candidate carrying every required field (mission §6): source engine/provider, stance-eligible direction, observed fact, inference, freshness, confidence, independence group. `computeStance()` determines SUPPORTS/CONTRADICTS relative to a specific claim's own expected direction — the same evidence supports one claim and contradicts its opposite.

### 7. Persistence — 4 new tables, fully additive

`Claim`, `ClaimEvidence` (append-only), `ClaimTransition` (append-only audit), `ClaimOutcome`. Migration `20260726141925_claim_intelligence_layer`, applied to both dev and test databases. Reuses `TimeWindow` and `GradeLabel` enums verbatim. `Claim.scenarioId`/`recommendationId`/`worldMemoryPredictionId` are loose, nullable, non-cascading links (unpopulated this phase — no scenario engine or recommendation-linking logic was wired). See `CLAIM_DATA_MODEL.md`.

### 8. Governance — `claimGovernance.js`

Reuses `canonicalVerdict.js`'s exact `FORBIDDEN_COMMITTEE_KEYS` denylist — the 4th reuse of this one list in this codebase (Committee → Options Agent → Sentiment Engine → Intelligence Bus → Claim Layer). Enforced both as a hard, throwing assertion at formation time and a silent strip at every read, checked both at the top level and nested inside every evidence entry.

### 9. Consumer services — `claimConsumerService.js`

`getActiveClaims`, `getClaimsBySymbol`, `getClaimsByPortfolioRelevance` (real portfolio positions via `portfolioEngineService`), `getContestedClaims`, `getRecentlyResolvedClaims`, `getClaimHistory` (full audit trail), `getStrongestEvidence`. No Express routes (explicit scope exclusion) — every function directly callable/testable.

### 10. Learning integration — `claimResolutionService.js`

`resolveClaim(claimId, actualOutcome, { now })` grades a pre-grade-terminal claim against a real, externally-supplied outcome, computing direction-correctness, a magnitude-aware grade, and a deterministic Brier-score-style calibration error. `buildLearningFeedback()` produces bounded (`±5` points), per-source/per-engine feedback deltas and an explicit note that they are **not automatically applied** — mission §10's boundary honored literally: the Claim Layer computes and persists feedback, it never calls into `newsSourceScoringService`/`committeeScorecardService` to mutate anything.

### 11. Initial engine adoption

Only `options` and `sentiment` are recognized by `claimEvidenceLedger.buildEvidenceCandidateFromBusEvent()`. Every other engine's Bus events are ignored (return `null`), a routine, tested outcome — not an error.

## Governance verification

Every one of `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` was tested absent from: a directly-constructed dirty object, a real formation-time submission (rejected before persistence), and a real, fully-formed, DB-round-tripped claim (stripped at read time regardless).

## Deliberate scope decisions (disclosed, not discovered later)

- **No Express routes, scheduler, or UI** — explicit mission exclusions.
- **Only options/sentiment integrated** — every other named engine doesn't exist yet as a real engine in this codebase; adding one later is a bounded, additive change to `claimEvidenceLedger.js`, not a redesign.
- **`expectedMagnitude`/`portfolioImpact` are honestly `null` this phase** — no magnitude-estimation or portfolio-impact computation is wired into claim formation yet; `autonomousRecommendationEngine.js` already has real portfolio-impact logic a future phase should wire in rather than reimplement.
- **`plainLanguageStatement` is a simple, deterministic template**, not an AI translation — `dailyBriefService.js`'s real AI/fallback contract is real, valuable follow-up work, deliberately deferred.
- **Learning feedback is computed but never applied** — mission's explicit boundary.
- **`Scenario`/`Recommendation`/`WorldMemoryPrediction` links exist but are unpopulated** — the columns are ready; no linking logic was built this phase.

## Files created or changed

**Created**
- `backend/services/claimIntelligence/claimDimensions.js`
- `backend/services/claimIntelligence/claimIdentity.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimLifecycle.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimConfidence.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimEvidenceLedger.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimGovernance.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimContract.js`
- `backend/services/claimIntelligence/claimRepository.js`
- `backend/services/claimIntelligence/claimFormationService.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimResolutionService.js` (+ `.test.js`)
- `backend/services/claimIntelligence/claimConsumerService.js` (+ `.test.js`)
- `backend/prisma/migrations/20260726141925_claim_intelligence_layer/migration.sql`
- `CLAIM_INTELLIGENCE_ARCHITECTURE.md`, `CLAIM_CONTRACT.md`, `CLAIM_LIFECYCLE.md`, `CLAIM_DATA_MODEL.md`, this file, `CLAIM_INTELLIGENCE_TEST_REPORT.md`

**Changed (additive only)**
- `backend/prisma/schema.prisma` — 4 new models, 3 new enums, zero existing-model changes.
- `backend/test/dbHelpers.js` — 4 new `deleteMany()` cleanup calls.

## Verification

Full backend suite: `npm run test:backend` → **1018/1018 passing**, 0 failures (includes 82 new Claim Intelligence Layer tests). No existing test was weakened or skipped.

## Remaining limitations

- No route/scheduler/UI wiring — nothing in this phase is reachable over HTTP or automatically triggered.
- Only 2 of the 8 named engines are integrated (by explicit mission design).
- No real magnitude/portfolio-impact estimation, no AI plain-language translation, no automatic learning-feedback application — all disclosed, deferred follow-up work.
- No commit or push was made, per instructions.
