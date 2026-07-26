# Claim Intelligence Layer — Review (Phase AI-CORE-001)

**Reviewer role:** strict architecture and implementation review — no redesign, no new features, no cosmetic concerns. Every finding below is grounded in direct inspection of the real, current source under `backend/services/claimIntelligence/` and `backend/services/intelligenceBus/`, plus the real `Claim`/`ClaimEvidence`/`ClaimTransition`/`ClaimOutcome` Prisma models — not the implementation report's claims taken on faith.

---

## 1. Layer placement

**Verified, with one important production-readiness caveat.**

- Claims genuinely sit above the Bus in code structure: `claimFormationService.ingestBusEvent(busEvent, ...)` takes a Bus-event-shaped object (`engineId`, `symbols`, `payload`, `provenance`, `publishedAt`, `confidence`, `id`) as its only input — there is no code path anywhere in `claimIntelligence/` that reads from an engine's own service module directly.
- The Bus remains the canonical transport: confirmed via `intelligenceBusRegistry.js`'s `KNOWN_ENGINES`/`KNOWN_CONSUMERS` registries, unchanged by this phase.
- **No engine bypasses the Bus to write Claims directly** — confirmed by an exhaustive `grep` for `claimFormationService`/`claimIntelligence` across `backend/services/optionsAgent/` and `backend/services/marketSentiment/`: zero matches. Neither engine imports anything from the Claim Layer.
- **Consumers are not coupled to individual engines** — `claimConsumerService.js`'s six read functions take a symbol/portfolio/claimId, never an `engineId` parameter; a consumer cannot even express "give me options-engine claims only."
- **The caveat:** a `grep` for `intelligenceBusService.publishEvent` across the entire backend shows it is called from exactly two files — `intelligenceBusService.test.js` and `claimFormationService.test.js` — **never from any real engine's production code**. Neither the Options Agent nor the Market Sentiment Engine currently publishes a single real event onto the Bus in production. This means the correct layer placement is real and enforced, but **the entire Engine → Bus → Claim pipeline is currently unexercised outside tests** — consistent with, not contradicting, this phase's own disclosed "no scheduler/route/UI" scope, but worth stating plainly: today, zero real Claims are ever formed by a live system.

## 2. Claim semantics — fact / inference / prediction / uncertainty / probability / confidence

**Verified, rigorously separated, no synonym violation found.**

- `claimContract.composeReasoningBreakdown()` produces an explicit `reasoning` block with four distinct sub-fields (`observed`, `inferred`, `predicted`, `uncertainty`), each sourced from a different real field, never conflated.
- **Confidence and probability are computed by two functions (`aggregateConfidence`, `aggregateProbability` in `claimConfidence.js`) that share zero input variables**, confirmed by direct code reading: confidence's five components (`sourceReliability`, `freshness`, `independence`, `breadth`, `agreement`) are entirely about evidence *quality*; probability is computed *only* from the directional-agreement ratio (optionally blended with a real historical calibration figure) — neither function calls the other, and neither reads a component the other produces. **This review does not reject the phase on this point** — confidence and probability are demonstrably not treated as synonyms anywhere in the real code.
- Uncertainty is `100 - agreement%`, reusing `scoringVocabulary.js`'s own prior definition of the term, not a new taxonomy.

## 3. Claim identity and reconciliation

**Mostly verified — one explicitly-named case (superseding claims) has real schema support but zero real implementation or test coverage.**

- **Duplicate claims:** a real `@@unique` DB constraint on `Claim.identityKey` makes this structural, not just an application check. Verified in `schema.prisma`.
- **Similar-but-non-identical claims:** `computeIdentityKey()` includes `causalContext` — two claims about the same symbol/direction/horizon but different causal reasoning get different identity keys and are kept separate until real evidence links them. Correct, and matches the mission's own framing of this case.
- **Opposing claims:** verified directly in `claimFormationService.ingestBusEvent()` — when no matching claim exists, the code explicitly searches for an opposing-direction claim in the same subject/horizon series (`listOpenBySubjectHorizon` + `isOpposingDirection`) and cross-links the new evidence as real `CONTRADICTS` evidence against it, **never merging the two**. This is a real, working mechanism, not just a documented intention.
- **Different time horizons:** `timeHorizon` is part of the identity key — verified directly in `computeIdentityKey()`. A D1 claim and a W1 claim about the same symbol/direction never collide.
- **Superseding claims — real gap, not disclosed.** `Claim.supersededByClaimId` is a real column, and `claimRepository.updateClaimScalars()` is capable of setting it — but **an exhaustive `grep` across every file in `claimIntelligence/` found zero call sites that ever set it to a non-null value, and zero test coverage of superseding anywhere** (`claimIdentity.test.js` and `claimFormationService.test.js` both contain zero references to "supersed"). `CLAIM_LIFECYCLE.md` §5 describes this as the mechanism for handling superseding claims — the mechanism as actually built is an unused column, not a working feature. **This gap is not listed anywhere in `CLAIM_INTELLIGENCE_IMPLEMENTATION_REPORT.md`'s own "deliberate scope decisions" section**, unlike several other honestly-disclosed limitations (magnitude estimation, portfolio-impact wiring, AI translation) — this one was not disclosed, and this review found it only by direct inspection.

**Contradictory claims remain visible, not silently merged** — verified directly, confirmed correct.

## 4. Evidence integrity

- **Append-only ledger:** verified — `claimRepository.js` exposes `createEvidence` and read functions only; no update/delete method exists for `ClaimEvidence` anywhere.
- **Original Bus event references:** verified — every evidence candidate carries a real `intelligenceBusEventId` traced back to the originating Bus event, never copied event data.
- **Source and provider provenance:** verified — `sourceEngine`/`sourceProvider` are real fields on every evidence row.
- **Evidence independence:** verified — `independenceGroup` (keyed on `engineId:sourceProvider`) is a real input to `aggregateConfidence`'s independence component; two correlated readings from the same provider are not counted as two independent confirmations.
- **Supporting evidence:** verified (`stance: "SUPPORTS"`).
- **Counter-evidence:** verified (`stance: "CONTRADICTS"`, real cross-linking against opposing claims).
- **Invalidating evidence — partial gap.** `ClaimEvidenceStance` includes `INVALIDATES` in the schema, and three consumer-side functions (`claimConfidence.aggregateConfidence`, `claimContract.composeClaimView`, `claimConsumerService.getStrongestEvidence`) all correctly handle it defensively. **But no producer code anywhere ever creates an evidence row with `stance: "INVALIDATES"`** — `claimEvidenceLedger.computeStance()` only ever returns `"SUPPORTS"`, `"CONTRADICTS"`, or `null`. Claim-level invalidation is real and does work, but through a *separate*, correctly-designed mechanism (`claimFormationService.invalidateClaim()`, driven by a real externally-supplied boolean fact) — the evidence-level `INVALIDATES` stance specifically is dead code today, defined and defended against but never produced.
- **Freshness:** verified — a real, disclosed linear decay (`evidenceFreshnessScore`, fully fresh at 0h, fully stale by 50h), honestly `null` when `ageMs` can't be computed.
- **Contribution calculation — real gap, not disclosed.** Every single `createEvidence` call site in `claimFormationService.js` (three of them, confirmed by direct reading) passes `contributionToClaim: null` unconditionally. **No function anywhere in `claimIntelligence/` ever computes a non-null `contributionToClaim` value.** `claimConsumerService.getStrongestEvidence()`'s own ranking function has to fall back to raw `confidence` specifically because `contributionToClaim` is always null in practice — the fallback is real and reasonable, but it exists to route around a genuinely missing computation, not a rare edge case. This gap, like superseding claims, is **not listed in the implementation report's disclosed limitations.**

## 5. Lifecycle

**Verified — deterministic, validated, persisted, auditable, no impossible transitions found.**

- `computeNextStatusAfterEvidence()` is a pure function (confirmed by direct reading — no I/O, no randomness, no hidden state) with a strict, ordered rule sequence: terminal claims never reopen (checked first, unconditionally) → real invalidation always wins → a `DRAFT` claim under `MIN_EVIDENCE_BREADTH_FOR_ACTIVE` (2) always stays `DRAFT` → real structural disagreement (`agreement < 55%`) always resolves to `CONTESTED` regardless of confidence trend → then strengthening/weakening/active by confidence delta. Every rule is checked in a fixed order with no branch that could produce two different answers for the same inputs.
- Every transition is persisted to the real, append-only `ClaimTransition` table, with a real `reason` string and (when applicable) the specific `triggeringEvidenceId` — the full lifecycle of any claim is genuinely replayable from this log.
- The two-tier terminal model (`isPreGradeTerminal` vs. `isFullyTerminal`) is correctly enforced: `acceptsNewEvidence()` gates every mutation path, and `resolveClaim()` itself throws (not silently no-ops) if called on a claim that isn't pre-grade-terminal — confirmed directly in `claimResolutionService.js`.
- No undocumented transition was found — every one of the 11 statuses' entry/exit conditions is named in `CLAIM_LIFECYCLE.md` and matches the real code exactly.

## 6. Governance

**Verified, strongly.**

- `claimGovernance.js` reuses `canonicalVerdict.js`'s exact `FORBIDDEN_COMMITTEE_KEYS` list (confirmed identical via a direct test assertion: `assert.deepEqual(FORBIDDEN_GOVERNANCE_KEYS, FORBIDDEN_COMMITTEE_KEYS)`), never a competing list.
- Enforced twice, confirmed by reading both call sites: `assertNoGovernanceViolation()` throws at formation time (before persistence) and `sanitizeClaimView()` strips defensively at every read — genuine defense in depth, not just a single gate.
- `claimType` is hardcoded to `"DIRECTIONAL_FORECAST"` everywhere a claim is created — no code path produces any other value.
- No `action`/`decision`/`verdict`/`finalDecision`/`recommendation` field was found on any persisted or composed shape.
- Every predictive claim exposes known/inferred/predicted/uncertain content via the `reasoning` block — verified structurally present on every `composeClaimView()` output.

## 7. Honest intelligence

**Verified.**

- **No single source can create unjustified certainty:** `MAX_SINGLE_EVIDENCE_WEIGHT` (0.4) plus `capAndRedistributeWeights()` caps any single confidence component's contribution — the same dominance-cap algorithm already proven in the Sentiment Engine, independently reimplemented (not imported, per the module's own stated self-containment choice).
- **Dominance caps work:** confirmed by reading the redistribution algorithm — a capped component's excess weight is proportionally redistributed to the remaining components, iteratively, until no component exceeds the cap.
- **Missing data degrades confidence, doesn't fabricate it:** confirmed — every component of `aggregateConfidence` is excluded from the weighted average (not defaulted to a mid-range guess) when it can't be computed; the function returns `confidence: null` outright when *no* component is computable.
- **Unavailable inputs remain null:** verified throughout — `sourceReliability`/`freshness`/`independence`/`breadth`/`agreement`/`probability`/`confidence`/`uncertainty` are all `null`-capable and never silently zeroed.
- **No fabricated probability precision:** probability is a rounded integer derived from a real, disclosed formula (`rawAgreementPct` optionally blended with a real calibration figure) — no invented decimal precision.
- **Counter-evidence can weaken or contest a Claim:** verified — `counterEvidencePenalty` (real, disclosed: `contradicts.length * 5 + invalidates.length * 15`, capped at 60) directly reduces confidence, and the `CONTESTED_AGREEMENT_THRESHOLD` (55%) check in the lifecycle transition function can move a claim to `CONTESTED` regardless of its raw confidence trend.

## 8. Outcome and learning

**Direction, magnitude, and calibration are genuinely, separately evaluated. Timing is not — it is a pass-through field, not a computation.**

- **Direction:** `computeDirectionCorrect()` — a real, direct comparison of `predictedDirection` vs. a real `actualDirection`, honestly `null` when no real outcome exists.
- **Magnitude:** `computeGradeLabel()` uses a real, disclosed threshold (`MAGNITUDE_PARTIAL_THRESHOLD_PCT`, 2%) to distinguish `CORRECT` from `PARTIALLY_CORRECT` — a real, separate evaluation from direction alone.
- **Timing — gap, not disclosed as a limitation.** `ClaimOutcome.timingErrorDays` exists as a real column, and `resolveClaim()` writes it — but the value written is `actualOutcome?.timingErrorDays ?? null`, a **pure pass-through of whatever the external caller already supplies**. No function anywhere in `claimResolutionService.js` computes a timing error from real data; the Claim Layer does not itself evaluate timing at all, despite the mission explicitly listing it as one of four things "resolution grading separately evaluates." This should have been disclosed alongside the honestly-stated magnitude/portfolio-impact gaps, in the same voice — it was not.
- **Calibration:** `computeCalibrationError()` is a real, deterministic Brier-score-style calculation (`|probability/100 - actualOutcomeAsOneOrZero|`), honestly `null` when probability itself was null. Genuinely computed, not passed through.
- **Feedback is bounded and does not mutate action-selection policy:** verified directly — `buildLearningFeedback()`'s per-source/per-agent deltas are clamped to `±5` points (`PER_SOURCE_FEEDBACK_BOUND`), and `claimResolutionService.js` imports nothing from `newsSourceScoringService.js`/`committeeScorecardService.js`/`autonomousRecommendationEngine.js` — the feedback is computed and persisted to `ClaimOutcome.learningFeedback`, and nothing in this phase's code ever applies it anywhere. This is a real, verified, and correctly-honored boundary.

## 9. Initial adoption

**Architecturally correct; practically unexercised.** Confirmed via `claimDimensions.INTEGRATED_ENGINES = ["options", "sentiment"]` and `claimEvidenceLedger.buildEvidenceCandidateFromBusEvent()`'s hard `isIntegratedEngine()` gate (returns `null`, not an error, for any other engine). Every field this function produces traces to a real Bus-event field, with an honest `NEUTRAL` fallback when a payload lacks directional data (e.g., no `aggressorSide` → `NEUTRAL`, never guessed bullish/bearish). **One real, genuine integration test exists** (`claimFormationService.test.js`, "the Claim Layer consumes REAL, persisted Intelligence Bus events") that calls the actual `intelligenceBusService.publishEvent()` and feeds its real return value into `ingestBusEvent()` — proving the two modules' real contracts align, not just an assumed shape. As noted in §1, this entire path has zero real production callers today — the adoption is correctly scoped and proven-in-principle, not yet live.

## 10. Testing

A fresh, independent full backend suite run was initiated as part of this review (not trusted from the implementation report's claimed 1018/1018 figure) — see `CLAIM_INTELLIGENCE_RISK_REPORT.md` for the completion status at review time.

**Test-fixture quality:** the large majority of Claim Intelligence tests use hand-built `optionsBusEvent()`/`sentimentBusEvent()` fixture helpers shaped to match the real Bus event contract (`engineId`/`symbols`/`payload`/`provenance`/`publishedAt`/`confidence`) — a reasonable, disciplined choice given the Bus event shape is itself a well-documented canonical contract. Critically, **at least one test bypasses the fixture entirely and round-trips through the real `intelligenceBusService.publishEvent()`**, directly verifying the producer/consumer contract alignment rather than assuming it — this is exactly the discipline the recently-designed Contract Testing Standard calls for, demonstrated here even before that standard has been formally operationalized. No test fixture was found inventing a field that doesn't exist on either module's real contract.
