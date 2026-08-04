# CLAIM_INTELLIGENCE_INTEGRATION.md — Phase CLAIM-INTELLIGENCE-INTEGRATION-001

**Mission:** integrate the completed Intelligence Platform (14 real Domain Intelligence Agents) with the existing, previously-disconnected Claim Intelligence / Intelligence Bus infrastructure. For every domain agent: publish structured claims, supporting evidence, confidence, freshness, provenance, contradictions, and uncertainty. Reuse existing infrastructure — do not redesign the Claim layer, do not duplicate confidence logic, do not change scoring behavior. Integrate with Intelligence Bus, Claim Intelligence, Unified Stock Intelligence, and Observability. Maintain deterministic behavior. Comprehensive tests.

---

## The disconnect this phase fixes

A dedicated research pass confirmed the mission's own framing exactly: `intelligenceBusService.publishEvent()` and `claimFormationService.ingestBusEvent()` both existed, were both real and already tested — but **every single call site for either function, anywhere in `backend/`, was inside a `*.test.js` file.** No scheduler, cron, orchestrator hook, or agent adapter called either one in a real execution path. Separately, `claimDimensions.js`'s `INTEGRATED_ENGINES` allowlist named only `["options", "sentiment"]` — even if an agent *had* published to the Bus, 12 of the 14 real Domain Intelligence Agents built across this session's prior phases would have had their events silently ignored by Claim formation.

This phase closes both gaps **additively** — no existing file's core logic was rewritten, only extended.

## Design decisions

**1. Reuse, don't duplicate, the two existing real entry points.** The new `agentClaimBridge/agentClaimPublisher.js` module's entire job is mapping a real, already-executed agent result onto the Bus's real raw-event contract, then calling `intelligenceBusService.publishEvent()` followed by `claimFormationService.ingestBusEvent()` in sequence. Every one of the mission's required published fields is satisfied by an *existing* mechanism, not new code:

| Requirement | How it's satisfied | New code? |
|---|---|---|
| Structured claims | `claimFormationService.ingestBusEvent()` (existing, unmodified) | No |
| Supporting evidence | Bus `payload.evidence` + `evidenceRefs`, flowing into `ClaimEvidence` rows via the existing evidence ledger | No — just field-mapping |
| Confidence | The agent's own already-computed `agentResult.confidence` (itself the adapter's own `confidence(result)` — see prior phases) is passed straight through; `claimConfidence.aggregateConfidence` (existing, unmodified) computes the claim's own confidence from the evidence ledger | No — explicitly never recomputed |
| Freshness | The Bus's own `computeFreshness`/`dataFreshness` (existing, unmodified) and the evidence ledger's own `freshness.ageMs` (existing, unmodified), both derived from an honest `publishedAt` this bridge supplies | No |
| Provenance | Bus `provenance.sourceEngine`/`agentName`, flowing into `Claim.provenance`/`ClaimEvidence.sourceEngine` via the existing ledger | No — just field-mapping |
| Contradictions | `claimFormationService.ingestBusEvent()`'s own existing `claimIdentity.isOpposingDirection()` check against open claims on the same subject/horizon (existing, unmodified) — already creates real `CONTRADICTS` evidence and can mark a claim `CONTESTED` | No |
| Uncertainty | `claimConfidence.computeUncertainty()` (existing, unmodified), already invoked inside `claimFormationService.recomputeAndPersist` from the real evidence agreement ratio | No |

The only genuinely new code is: (a) the mapping function itself, (b) two additive registry extensions (below), and (c) one small generic-fallback addition to `claimEvidenceLedger.js`'s existing per-engine dispatch (also below) — every one of these is additive, not a redesign.

**2. Two additive registry extensions, nothing renamed or removed.**
- `intelligenceBusRegistry.js`'s `KNOWN_ENGINES` gained 8 new entries (the 14 real agent ids minus the 6 that already matched an existing entry: `options`, `sentiment`, `macro`, `earnings`, `news`, plus `technical`), each with a disclosed, real `staleAfterMs` reflecting that agent's own real data cadence (e.g. Insider/Institutional at 7 days, matching real SEC filing lag; Short Interest's own real daily FINRA cadence gets a distinct `"short-interest"` entry, kept separate from the pre-existing, unrelated `shortInterest` camelCase entry). Nothing above the new entries was touched.
- `claimDimensions.js`'s `INTEGRATED_ENGINES` was extended from `["options", "sentiment"]` to all 14 real agent ids — the literal fix for "connect every Intelligence Agent to the Claim Intelligence pipeline."

**3. One small, generic addition to `claimEvidenceLedger.js`'s existing per-engine dispatch.** `inferEvidenceDirection(engineId, payload)` already special-cased `options` (reading `payload.aggressorSide`) and `sentiment` (reading `payload.score`) before falling through to a hardcoded `"NEUTRAL"`. This phase adds one generic fallback branch — read a real, already-normalized `payload.direction` string (`"BULLISH"`/`"BEARISH"`) — used by every one of the 12 newly-integrated engines. This is not "duplicated direction logic": `agentClaimBridge` always publishes the agent's own already-computed, opaque `direction` string (the exact same value the Agent Orchestrator's own conflict detector already compares by equality) onto `payload.direction`; this fallback just reads that one real, pre-normalized field instead of re-deriving a direction from engine-specific raw fields, which none of the 12 new engines have anyway. `inferTimeHorizon()` got a matching disclosed, per-agent default-bucket table (e.g. `institutional`→`M3` for real quarterly 13F filings, `technical`→`D1` for real intraday reads), the same honest-approximation discipline the original `options`/`sentiment` mapping already used.

**4. Publishing is opt-in (`publishClaims`), not a silent global default — a concrete, disclosed risk-avoidance choice.** `observableOrchestrator.runObserved()` gained one new optional parameter, `publishClaims` (default `false`). Every pre-existing caller and test — over 2,285 tests across this session, many calling `runObserved()` dozens of times against a single shared test database (`DATABASE_URL_TEST`) — keeps its exact current behavior, zero new side effects, zero new DB writes. The one real production surface that already exercises every agent together, `unifiedStockIntelligenceEngine.generateUnifiedIntelligence()`, was updated to pass `publishClaims: true` at its own `runObservedFn` call — this is the actual "connect real agent execution" wiring the mission asks for, applied at the one place it matters in production, without silently changing the default behavior of a function used pervasively across the existing test suite.

**5. Best-effort, defense in depth.** `publishAgentClaim()` itself never throws (a publish/ingest failure returns `{ skipped: true, reason }`, the same discipline `intelligenceBusService.projectToCanonicalEvent()`'s own "best-effort projection" comment already establishes). `runObserved()`'s own per-agent loop additionally wraps the call in its own `try/catch` as defense in depth — a Claim-pipeline problem can never break the real agent run that triggered it, and `runObserved()`'s return value (`report`, `correlationId`) is provably unchanged by this flag, since nothing in the loop mutates either.

## What was built

New directory: `backend/services/agentClaimBridge/`.

| File | Responsibility |
|---|---|
| `agentClaimPublisher.js` | `buildRawEventFromAgentResult(symbol, agentResult, now)` — pure mapping, no I/O; honestly skips (never fabricates) a non-fulfilled result, a missing symbol, or an agent id with no registered Bus engine. `publishAgentClaim(symbol, agentResult, options)` — calls the real `publishEvent` then the real `ingestBusEvent` in sequence; never throws. |

## Modified files (all additive)

- `backend/services/intelligenceBus/intelligenceBusRegistry.js` — 8 new `KNOWN_ENGINES` entries.
- `backend/services/claimIntelligence/claimDimensions.js` — `INTEGRATED_ENGINES` extended from 2 to 14 entries.
- `backend/services/claimIntelligence/claimEvidenceLedger.js` — one generic `payload.direction` fallback branch in `inferEvidenceDirection()`; one disclosed per-agent default-bucket table for `inferTimeHorizon()`.
- `backend/services/agentObservability/observableOrchestrator.js` — new opt-in `publishClaims` parameter (default `false`); per-agent, best-effort, try/caught publish call.
- `backend/services/unifiedStockIntelligence/unifiedStockIntelligenceEngine.js` — one line: `publishClaims: true` at its existing `runObservedFn` call.

## The full pipeline, verified live end-to-end during development

```js
const agentResult = {
  agentId: "macro", agentName: "Macro Intelligence Agent", status: "fulfilled",
  confidence: 80, direction: "BULLISH",
  result: { summary: "Macro Bias is BULLISH.", evidence: [{ observedFact: "Yield curve is normal." }], raw: {} },
};
await publishAgentClaim("AAPL", agentResult);
```
produced, against the real test database:
1. A real, persisted `IntelligenceBusEvent` — `engineId: "macro"`, `symbols: ["AAPL"]`, real `confidence: 80`, real `provenance`, `lifecycleStatus: "ACTIVE"`, `label: "Signal — not a recommendation"` (governance-sanitized automatically).
2. A real, persisted `Claim` (`DRAFT` status, 1 real evidence entry) — `expectedDirection: "BULLISH"`, `timeHorizon: "M1"`, `sourceAgents: ["macro"]`, real `provenance.intelligenceBusEventId` linking back to the Bus event.
3. A second real publish from the same engine/direction/horizon (i.e. the same real agent re-running) updated the **same** claim (matching `identityKey`) rather than creating a duplicate, added a second real evidence entry, and — having now met `MIN_EVIDENCE_BREADTH_FOR_ACTIVE` (2) — promoted it to `ACTIVE`, at which point it became visible through the real, public `GET /api/v2/claims/active` route.

## Compatibility with the existing Agent Platform — verified, not assumed

- **Intelligence Bus**: every one of the 14 real agent ids is now a registered `KNOWN_ENGINES` entry and can publish; confirmed via a dedicated test asserting all 14 pass `buildRawEventFromAgentResult`'s eligibility check.
- **Claim Intelligence**: every one of the 14 real agent ids is now in `INTEGRATED_ENGINES`; confirmed via the full pipeline test above and via updated `claimEvidenceLedger.test.js`/`claimFormationService.test.js` assertions (both had used `"macro"` as their own "non-integrated engine" example — retargeted to `"ownership"`, a genuinely still-non-integrated Bus-only id with no corresponding agent).
- **Observability**: `runObserved()`'s existing per-agent loop (execution-log append) is untouched in its own behavior; the new `publishClaims` branch runs strictly after the log append, using the same already-available `agentResult` fields.
- **Unified Stock Intelligence**: `generateUnifiedIntelligence()` now transparently publishes claims for its own 11-agent run whenever it executes; all 74 of its own existing tests (agent counts, aggregation, conflict detection, confidence math) pass unchanged, proving zero effect on scoring.
- **Orchestrator**: untouched (`agentOrchestrator.js` itself has, and needs, zero awareness of the Claim/Bus layers — confirmed by the pre-existing "the orchestrator module itself is never modified by this layer" test, which still passes).

## Tests

**~30 new/updated tests, all passing:**
- `agentClaimPublisher.test.js` (11 new) — pure mapping correctness, honest skip conditions, all 14 agent ids eligible, publish/ingest sequencing via injected fakes, never-throws guarantee.
- `observableOrchestrator.test.js` (3 new) — `publishClaims` defaults to `false` with zero side effects on every pre-existing test; `publishClaims: true` calls the bridge once per agent; a real publish failure never changes `runObserved`'s own return value.
- `claimEvidenceLedger.test.js` (3 new + 1 retargeted) — generic `payload.direction` fallback for newly-integrated engines; a real macro Bus event produces a real, traceable candidate; every newly-integrated agent maps to a real `TimeWindow` bucket; the "non-integrated engine" example retargeted from `"macro"` (now integrated) to `"ownership"`.
- `claimFormationService.test.js` (1 retargeted) — same `"macro"` → `"ownership"` retarget for its own "source isolation" test.
- `agentClaimBridge.orchestratorIntegration.test.js` (4 new, full-stack) — a real orchestrator run with `publishClaims: true` produces a real Bus event; two real, agreeing publishes accumulate evidence and reach the real, public `/api/v2/claims/active` route; a forbidden-governance-key scan across both the published Bus event and the resulting Claim; an unavailable/error agent result never publishes a fabricated claim.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2306 tests, 2304 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures introduced by this phase (confirmed by an earlier isolated, sequential re-run of every touched Claim/Bus/bridge test file specifically — a same-process *parallel* run of just those files had produced unrelated, pre-existing shared-test-database race symptoms that fully disappeared once run under the established sequential `--test-concurrency=1` convention). The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Claim convergence across different agents is limited by design, inherited from the existing Claim layer's own identity semantics (not something this phase changed).** `claimIdentity.computeIdentityKey()` includes `causalContext` in a claim's identity, and `claimEvidenceLedger.buildCausalContext()`'s generic fallback for every newly-integrated engine is `` `${engineId}:unknown` `` — meaning two different agents' events about the same symbol/direction currently form two independent DRAFT claims rather than converging into one, evidence-richer claim, even when they agree. This is the existing Claim layer's own "different causal reasoning is never silently merged" rule (mission §4, pre-existing) applied honestly to engines that don't yet supply a real causal-context string of their own. Defining per-domain causal-context buckets that would let genuinely-related agents converge is real, valuable future work — explicitly out of scope here, since inventing those buckets would be a judgment call this integration phase's mission didn't ask for, and risks being exactly the kind of "redesign the Claim layer" this phase was told not to do.
2. **`publishClaims` is opt-in, not a global default.** Only `unifiedStockIntelligenceEngine`'s own production call site was wired to `true`. Any other future caller of `runObserved()` that wants its agent runs to also feed the Claim pipeline must explicitly pass `publishClaims: true` — a deliberate, disclosed choice to avoid silently changing the DB-write behavior of a function this session's entire existing test suite already depends on.
3. **Time horizons for the 12 newly-integrated agents are disclosed, hand-set approximations** (e.g. Insider/Macro/Analyst-Consensus → `M1`; Institutional/Valuation/Earnings → `M3`), not derived from each agent's own actual analysis window — the same honest-simplification discipline the original `options`(`D1`)/`sentiment`(`W1`) mapping already used.
4. **This phase does not add any new UI** and does not touch `claimsController.js`/`claimsRoutes.js`/`claimConsumerService.js` — every existing `/api/v2/claims/*` route now simply has real data flowing into it from real agent executions, with zero changes to the routes themselves.

## Files changed

- New: `backend/services/agentClaimBridge/{agentClaimPublisher,agentClaimBridge.orchestratorIntegration}.js` + `agentClaimPublisher.test.js`.
- Modified: `backend/services/intelligenceBus/intelligenceBusRegistry.js` (additive `KNOWN_ENGINES` entries).
- Modified: `backend/services/claimIntelligence/claimDimensions.js` (`INTEGRATED_ENGINES` extended to 14).
- Modified: `backend/services/claimIntelligence/claimEvidenceLedger.js` (generic direction/time-horizon fallbacks) + `claimEvidenceLedger.test.js` (3 new tests, 1 retargeted).
- Modified: `backend/services/claimIntelligence/claimFormationService.test.js` (1 retargeted "non-integrated engine" test).
- Modified: `backend/services/agentObservability/observableOrchestrator.js` (opt-in `publishClaims` flag) + `observableOrchestrator.test.js` (3 new tests).
- Modified: `backend/services/unifiedStockIntelligence/unifiedStockIntelligenceEngine.js` (one line: `publishClaims: true` at its real production call site).
- Unmodified: every existing Claim Intelligence module's own core logic (`claimFormationService.js`, `claimConfidence.js`, `claimIdentity.js`, `claimGovernance.js`, `claimRepository.js`, `claimResolutionService.js`, `claimLifecycle.js`), every existing Intelligence Bus module's own core logic (`intelligenceBusService.js`, `intelligenceEventContract.js`, `intelligenceBusGovernance.js`, `intelligenceBusConfidence.js`, `intelligenceBusLifecycle.js`, `intelligenceBusDedup.js`, `intelligenceBusSubscriptions.js`, `intelligenceBusRepository.js`), `canonicalVerdict.js`, `agentOrchestrator.js`, `agentScheduler.js`, every domain agent and its orchestrator adapter, `claimsController.js`/`claimsRoutes.js`.
