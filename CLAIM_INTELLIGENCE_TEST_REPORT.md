# Claim Intelligence Layer — Test Report (Phase AI-CORE-001)

## Summary

```
node --test --test-concurrency=1 "backend/services/claimIntelligence/**/*.test.js"
tests 82
pass  82
fail  0

npm run test:backend   (full suite)
tests 1018
pass  1018
fail  0
```

All new tests pass; the full backend suite (936 pre-existing tests, per the prior Intelligence Bus phase, now 1018 total) passes with zero regressions.

## Coverage against the mission's required test list

| Required case | Test file | Representative test(s) |
|---|---|---|
| Claim creation | `claimFormationService.test.js` | "a single real evidence entry creates a DRAFT claim, never immediately ACTIVE" |
| Supporting evidence update | `claimFormationService.test.js` | "a second real supporting event in the same series promotes the claim past DRAFT"; "cross-engine evidence (sentiment) in the SAME series also updates the claim" |
| Weakening from counter-evidence | `claimFormationService.test.js` | "a real opposing-direction event in the SAME series cross-links as counter-evidence and changes confidence" |
| Contested claims | `claimLifecycle.test.js`, `claimFormationService.test.js` | "contested when real evidence agreement drops below the threshold"; "strong, real disagreement transitions a claim to CONTESTED" |
| Invalidation | `claimLifecycle.test.js`, `claimFormationService.test.js` | "a real invalidation trigger always wins"; "an explicit real invalidation trigger moves an open claim straight to INVALIDATED" |
| Duplicate prevention | `claimIdentity.test.js`, `claimFormationService.test.js` | "semantically identical claims share one identity key"; "identity is structural — 2 evidence entries for the same identity never create two Claim rows" |
| Contradictory claim separation | `claimIdentity.test.js`, `claimFormationService.test.js` | "contradictory claims get DIFFERENT identity keys — never silently merged"; "a bearish claim about the same symbol/horizon is a SEPARATE claim" |
| Different time-horizon separation | `claimIdentity.test.js`, `claimFormationService.test.js` | "different time horizons for the same claim get DIFFERENT identity keys"; "an options (D1) claim and a sentiment (W1) claim ... are never merged" |
| Confidence versus probability separation | `claimConfidence.test.js` | "two claims with identical confidence-relevant inputs but different directional agreement produce different probability, same confidence-relevant components" |
| Dominance prevention | `claimConfidence.test.js` | "capAndRedistributeWeights never lets one weight exceed the configured cap"; "aggregateConfidence never lets a single overwhelming component dominate" |
| Provenance preservation | `claimFormationService.test.js` | "provenance is preserved exactly as the originating engine supplied it" |
| Lifecycle transition audit | `claimFormationService.test.js`, `claimResolutionService.test.js` | "every real status change is recorded, in order, and is fully replayable"; "resolution records a real transition from the pre-grade-terminal status" |
| Expiry | `claimLifecycle.test.js` | "an open claim past its real expiry transitions to EXPIRED"; "a claim still within its real horizon stays open" |
| Correct resolution | `claimResolutionService.test.js` | "an EXPIRED bullish claim whose real outcome moved up meaningfully resolves RESOLVED_CORRECT" |
| Partial resolution | `claimResolutionService.test.js` | "...moved the right direction but by a trivial magnitude resolves RESOLVED_PARTIAL" |
| Incorrect resolution | `claimResolutionService.test.js` | "...moved the opposite direction resolves RESOLVED_INCORRECT" |
| Learning feedback generation | `claimResolutionService.test.js` | "a CORRECT resolution produces a real, bounded positive feedback signal"; "an UNGRADEABLE resolution produces no feedback deltas at all" |
| Governance field prohibition | `claimGovernance.test.js`, `claimFormationService.test.js` | "reuses canonicalVerdict's exact denylist"; "a real, fully-formed claim never carries a forbidden field, top-level or in its evidence" |
| Subscriber or source failure isolation | `claimEvidenceLedger.test.js`, `claimFormationService.test.js` | "returns null for a non-integrated engine — source isolation, never processed"; "an event from a non-integrated engine is ignored and never contaminates or blocks real claim formation" |
| Deterministic output | `claimConfidence.test.js`, `claimLifecycle.test.js`, `claimFormationService.test.js` | "produce identical results for identical input, regardless of call order"; "two independent, identical evidence sequences produce identically-shaped claims" |

Every required case is covered by at least one real, behavior-asserting test — several are covered at both the pure-function level (identity/lifecycle/confidence/governance/evidence-ledger) and the DB-backed integration level (formation/resolution/consumer services).

## Additional coverage beyond the required list

- **Real, end-to-end Intelligence Bus integration**: one test publishes a genuine event through `intelligenceBusService.publishEvent()` (not a synthetic object shaped like one) and feeds the real, persisted, returned event into `claimFormationService.ingestBusEvent()` — proving the Claim Layer actually sits above the real Bus, not a mocked stand-in.
- **`canonical contract` test** (`claimConsumerService.test.js`): asserts every field in `claimContract.REQUIRED_CONTRACT_FIELDS` is present on a real claim returned by a consumer service — the full strict contract, not a partial one.
- **`getClaimHistory`/`getStrongestEvidence`** (`claimConsumerService.test.js`): verify the full audit-trail read path (claim + transitions + outcome) and evidence-ranking logic.
- **`getClaimsByPortfolioRelevance`** honest-empty test: confirms no claim is ever surfaced for a portfolio holding nothing relevant — never a generic market-wide leak under this name.
- **Calibration error** (`claimResolutionService.test.js`): a specific test proves the Brier-score-style formula is exactly `|probability/100 - actual|`, and honestly `null` when the claim's own probability was null.

## What was intentionally NOT tested this phase (and why)

- **No HTTP/route-level tests** — no Express routes were wired this phase (explicit mission exclusion).
- **No scheduler tests** — no scheduler exists yet this phase (explicit exclusion); `ingestBusEvent`/`resolveClaim` are tested as directly-callable functions.
- **No tests for macro/earnings/ownership/short-interest/correlation/news engine payloads** — none of these engines exist yet in this codebase; `claimEvidenceLedger.js` correctly ignores their (currently hypothetical) events, which is exactly what the "source failure isolation" tests verify for the one real non-integrated engine tested (`macro`, used as a stand-in for "any non-integrated engineId").
- **No test for applying learning feedback to `newsSourceScoringService`/`committeeScorecardService`** — the Claim Layer never does this, by explicit mission design; the tests instead verify the feedback is correctly *computed* and *never silently omitted or auto-applied*.

## Test environment

Real, isolated PostgreSQL test database (`impactone_test`, via `DATABASE_URL_TEST`/`backend/test/testEnv.js`) for every DB-backed test file (`claimFormationService.test.js`, `claimResolutionService.test.js`, `claimConsumerService.test.js`) — same pattern every other Prisma-backed service test in this codebase uses, including the real Intelligence Bus and its own real database rows. `truncateAll()` (extended this phase for the 4 new tables) runs before each test. `claimIdentity.test.js`, `claimLifecycle.test.js`, `claimConfidence.test.js`, `claimEvidenceLedger.test.js`, and `claimGovernance.test.js` are pure, no-I/O unit tests.
