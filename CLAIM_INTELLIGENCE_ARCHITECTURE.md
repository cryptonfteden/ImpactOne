# Claim Intelligence Layer — Architecture (Phase AI-CORE-001)

**Status:** Implemented. Unlike the architecture-only docs that preceded some prior engines, this document describes what was actually built (`backend/services/claimIntelligence/`) — every module and table named below is real and tested.

## 1. What this is

The **Claim** becomes the canonical reasoning object of ImpactOne: *"What the platform currently believes may happen, why, how confident it is, what could disprove it, and what happened afterward."* Every intelligence engine's evidence ultimately flows into Claims — never a parallel per-engine belief structure.

## 2. Where this sits — above the Bus, not replacing it

```
Engine (options, sentiment) ──publishEvent()──► Intelligence Bus (unchanged, Phase AI-ENGINE-003)
                                                          │
                                                          │  getEvents() / real published events
                                                          ▼
                                            claimFormationService.ingestBusEvent()
                                                          │
                          ┌───────────────────────────────┼───────────────────────────┐
                          ▼                                ▼                           ▼
                  claimIdentity.js                claimEvidenceLedger.js      claimConfidence.js
              (dedup / reconciliation)          (Bus event → evidence)    (confidence ≠ probability)
                          │                                │                           │
                          └───────────────────┬─────────────┴───────────────────────────┘
                                               ▼
                                       claimLifecycle.js (deterministic transitions)
                                               │
                                               ▼
                              Claim + ClaimEvidence + ClaimTransition (persisted)
                                               │
                                               ▼
                          claimResolutionService.js (grading, on EXPIRED/INVALIDATED)
                                               │
                                               ▼
                                 ClaimOutcome + bounded learning feedback
                                               │
                                               ▼
                          claimConsumerService.js (the ONLY read surface — mission §9)
```

The architecture principle from the mission — `Engine → Intelligence Event → Claim → Evidence/Counter-Evidence → Confidence → Lifecycle → Outcome → Learning → Consumers` — is implemented as exactly this pipeline, one module per stage, each independently pure/testable.

## 3. Engine adoption this phase — exactly two, by design

Per mission §11, only `options` and `sentiment` (both already real, `KNOWN_ENGINES` in the Intelligence Bus's own registry) are integrated. `claimEvidenceLedger.buildEvidenceCandidateFromBusEvent()` returns `null` for any other `engineId` — a routine, expected filter, not an error. Macro/Earnings/Ownership/Short Interest/Correlation/News engines are not migrated this phase; when they exist and publish through the Bus, integrating them is an additive change to this one function (plus a direction-inference case for their payload shape), not a redesign.

## 4. Claim identity and reconciliation (mission §4)

`claimIdentity.computeIdentityKey({ subject, expectedDirection, timeHorizon, symbols, sectors, regions, causalContext })` is the deterministic dedup key — a `@@unique` DB constraint on `Claim.identityKey` makes duplicate prevention structural, not just an application-layer check.

Direction and time horizon are both part of identity — this is the load-bearing design decision for every reconciliation case the mission names:

- **Semantically identical** claims → same identity key → the existing claim is updated (new supporting evidence), never a second row.
- **Contradictory** claims (opposite direction, same subject/horizon) → a genuinely different identity key → a **separate** Claim is always created (never silently merged), and `claimFormationService` additionally cross-links the new evidence as real counter-evidence against the pre-existing opposing claim, which may transition to `CONTESTED` as a result.
- **Different time horizons** → different identity keys → separate claims, even for the same subject/direction (an options-derived D1 claim and a sentiment-derived W1 claim about the same symbol never merge).
- **Partially overlapping** claims (same subject, different causal context) → different identity keys → kept separate until real evidence explicitly links them (no automatic merging based on topical similarity alone).
- **Superseding** claims → no dedicated status (mission's approved list has none); represented via `Claim.supersededByClaimId` plus a terminal-status transition (`CLAIM_LIFECYCLE.md` §5).

## 5. Confidence and probability (mission §5)

Deliberately computed from disjoint input sets (`claimConfidence.js`):

- **Confidence** (evidence quality): `sourceReliability`, `freshness`, `independence` (distinct `independenceGroup` count), `breadth` (distinct contributing engines), `agreement` — combined via fixed, disclosed weights with a dominance cap (`capAndRedistributeWeights`, the same algorithm the Sentiment Engine's rollup already proved out, reimplemented here so this module stays self-contained) and a real counter-evidence penalty.
- **Probability** (likelihood of the predicted outcome): computed ONLY from real directional evidence agreement, optionally blended with a real historical calibration figure when supplied. Never touches confidence's inputs.
- **Bounded updates**: a single new evidence entry can move confidence/probability by at most `MAX_CONFIDENCE_DELTA_PER_UPDATE`/`MAX_PROBABILITY_DELTA_PER_UPDATE` (20 points) from the prior value — mission's explicit "bounded updates" requirement, enforced structurally, not by convention.
- **Null-not-zero**: every aggregation function returns `null`, never `0`/`50`, when there is nothing real to compute from.
- **No fabricated precision**: every component that can't be computed is simply excluded from the weighted average — never defaulted.

## 6. Evidence ledger (mission §6)

`ClaimEvidence` is append-only — `claimRepository.js` exposes only `createEvidence`, never an update/delete. Every entry carries the full required shape (`CLAIM_CONTRACT.md` §3): Bus event reference, source engine/provider, stance, observed fact, inference, freshness, confidence, independence group, `addedAt`, and (once computed) contribution to the claim.

## 7. Governance (mission §8)

`claimGovernance.js` reuses `canonicalVerdict.js`'s exact `FORBIDDEN_COMMITTEE_KEYS` denylist — the **4th** reuse of this one list (after the Committee, Options Agent, Sentiment Engine, and Intelligence Bus). Enforced twice: a hard, throwing assertion at formation time (a violating claim/evidence is never even persisted) and a silent strip at every read (defense in depth). A Claim's `claimType` this phase is always `"DIRECTIONAL_FORECAST"` — descriptive of a forecast, never an instruction.

## 8. Learning integration (mission §10)

`claimResolutionService.resolveClaim()` grades a pre-grade-terminal claim (`EXPIRED`/`INVALIDATED`) against a real, externally-supplied outcome descriptor, computing a real direction-correctness check, a magnitude-based grade (`CORRECT`/`PARTIALLY_CORRECT`/`INCORRECT`/`UNGRADEABLE`, reusing the existing `GradeLabel` enum), and a deterministic Brier-score-style calibration error. It then produces **bounded, disclosed** `learningFeedback` (`±5` points per contributing source/engine) — and explicitly does **not** call into `newsSourceScoringService`/`committeeScorecardService` to apply it. This is the mission's explicit boundary ("do not allow the Claim Layer to change action-selection policy directly in this phase"), honored literally: the feedback is computed and persisted on `ClaimOutcome.learningFeedback`, available for a future phase to actually apply.

## 9. Consumers (mission §9)

`claimConsumerService.js` — the only read surface, all composed through `claimContract.composeClaimView` so every consumer sees the identical, sanitized shape: `getActiveClaims`, `getClaimsBySymbol`, `getClaimsByPortfolioRelevance` (real portfolio positions via `portfolioEngineService`), `getContestedClaims`, `getRecentlyResolvedClaims`, `getClaimHistory` (full audit trail: claim + transitions + outcome), `getStrongestEvidence`. No Express routes this phase (explicit scope exclusion) — every function is directly callable/testable.

## 10. Deliberate scope decisions (disclosed, not discovered later)

- **No Express routes, no scheduler, no UI** — explicit mission exclusions. Claim formation/resolution must be invoked directly (by a future scheduler, or manually) until a later phase.
- **Only options/sentiment integrated** — every other named engine (macro, earnings, ownership, short interest, correlation, news) does not exist as a real engine yet in this codebase; `KNOWN_ENGINES`-style forward declaration was intentionally NOT added here (unlike the Intelligence Bus's own registry) since claim-formation logic needs real, engine-specific payload interpretation, which cannot be honestly written for an engine that doesn't exist.
- **`expectedMagnitude` and `portfolioImpact` are honestly null for every claim this phase** — no real magnitude-estimation or portfolio-impact computation is wired into `claimFormationService` yet (a single evidence entry doesn't support a real magnitude estimate; portfolio-impact scoring is real, existing logic in `autonomousRecommendationEngine.js` that a future phase should wire in, not reimplement).
- **Learning feedback is computed but never applied** — mission §10's explicit boundary, honored literally.
- **`plainLanguageStatement` is a simple, deterministic template this phase**, not an AI-generated translation (unlike `dailyBriefService.js`'s two-tier AI/fallback pattern) — wiring the real AI-translation contract is real, valuable follow-up work, deliberately out of scope for a foundation phase focused on the reasoning/persistence/governance core.
