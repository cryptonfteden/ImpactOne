# OUTCOME_CALIBRATION.md — Phase OUTCOME-CALIBRATION-001

**Mission:** build the Outcome Calibration Engine — prediction recording, outcome recording, prediction→outcome linking, accuracy tracking, calibration statistics, confidence calibration, agent reliability history, and drift detection. Reuse existing Outcome and Claim infrastructure, never modify existing agent scoring or outputs, additive only. Integrate with Unified Stock Intelligence, Claim Intelligence, and Observability. Comprehensive tests.

---

## What already existed — and the one genuine gap

A dedicated research pass confirmed that six of this mission's eight objectives were **already fully implemented**, just never assembled into a per-agent view:

| Objective | Already existed? | Where |
|---|---|---|
| Prediction recording | Yes | `Claim` (Claim Intelligence, `CLAIM-INTELLIGENCE-INTEGRATION-001`) and `WorldMemoryPrediction` (World Memory) |
| Outcome recording | Yes | `ClaimOutcome` and `Outcome` (recommendation-level) |
| Prediction→Outcome linking | Yes | `ClaimOutcome.claimId`, `Outcome.recommendationId`/`worldMemoryPredictionId` |
| Accuracy tracking | Yes | `claimResolutionService.computeDirectionCorrect`, `outcomeGradingService.computeDirectionCorrect` |
| Calibration statistics | Yes | `calibrationReportService.js` (per-recommendation-"action"-family), `calibrationAnalysisService.js` (confidence-distribution reliability diagram + drift) |
| Confidence calibration | Yes | `claimResolutionService.computeCalibrationError` (`|predictedProbability/100 - actual|`), already written into every `ClaimOutcome.calibrationError` |
| **Agent reliability history** | **No — confirmed gap** | Nothing anywhere joined a specific agent's identity to real graded outcomes |
| Drift detection | Partially | `calibrationAnalysisService.getCalibrationDrift()` exists, but only at the recommendation-family level, never per-agent |

The one real, confirmed gap: **no existing code cross-references a specific agent's own contributions against real, already-graded ground truth.** `calibrationReportService`/`calibrationAnalysisService` group by recommendation `action` ("BUY"/"REDUCE"/etc.), never by `agentId`/`sourceEngine`. The in-memory `agentExecutionLog` (Observability) tracks per-agent confidence and success/failure, but is bounded/recency-only and never cross-referenced against durable outcomes. This phase's entire job was closing that one gap — and it turns out the previous phase (`CLAIM-INTELLIGENCE-INTEGRATION-001`) already built exactly the join key needed: every one of the 14 real Domain Intelligence Agents now writes real `ClaimEvidence.sourceEngine = agentId` rows, and once a claim resolves, `ClaimOutcome.directionCorrect`/`calibrationError` already carry the real ground truth. No new Prisma migration, no new prediction/outcome recording was needed — only a new **read-only join and aggregation layer**.

## Design decisions

**1. Two additive read-only queries, nothing else changed in `claimRepository.js`.** `listEvidenceBySourceEngine(sourceEngine, {limit})` and `listOutcomesForClaimIds(claimIds)` were added alongside the existing `list*`/`create*` functions — same file, same pattern, zero changes to any existing function's behavior.

**2. Every accuracy/calibration number reuses an existing, already-graded value — nothing is recomputed.** `agentAccuracyTracker.wasEvidenceCorrect(stance, directionCorrect)` reads the claim's own real `ClaimOutcome.directionCorrect` (computed by `claimResolutionService`, untouched) and re-expresses it from one agent's point of view: an agent that `SUPPORTS`ed a claim which resolved direction-correct was right; one that `CONTRADICTS`ed it was wrong (and vice versa). This is the one clean way to score an individual agent's real contribution without inventing new ground truth.

**3. Calibration error reuses the exact same, already-established Brier-style formula (`|confidence/100 - actual|`) — applied to a new grouping, not a new definition.** `claimResolutionService.computeCalibrationError` and `calibrationAnalysisService.getCalibrationDrift` both already use this formula at the claim/recommendation level. `agentCalibrationStatistics.js` reimplements the identical formula (not imported) applied to one agent's own evidence-level confidence — the same "each module owns its own narrow formula application" precedent `claimConfidence.js`'s own `capAndRedistributeWeights` comment already establishes for this codebase (it reimplements, rather than imports, `marketSentimentRollup`'s weight-capping for the same reason).

**4. Drift detection mirrors `calibrationAnalysisService.getCalibrationDrift()`'s exact methodology — average calibration error in the earlier half of real, chronologically-ordered history vs. the later half, split at the real midpoint — scoped per-agent instead of per-recommendation-family.** Same disclosed `MIN_SAMPLE_SIZE = 10` threshold.

**5. Agent reliability history combines two real, complementary sources — a durable one and a live one — never conflating them.** `getAgentReliabilityHistory(agentId)` returns both: (a) durable accuracy/calibration/drift computed from real, persisted `ClaimEvidence`/`ClaimOutcome` rows (full history, but only for evidence that has actually been graded), and (b) `recentActivity`, a live signal reusing the existing, unmodified `agentExecutionLog` (Observability) filtered to the requested agent — a recency-bounded complement (the log itself evicts oldest records, disclosed in its own header), never a replacement for the durable numbers.

**6. Unified Stock Intelligence integration is opt-in and provably non-mutating — the mission's own "do not modify agent scoring / do not change agent outputs" rule enforced by construction, not by discipline alone.** `attachAgentReliabilityContext(unifiedReport)` takes an already-generated report and returns a **new** object — every existing field copied through unchanged, plus one new `agentReliabilityContext` field. It is never wired into `unifiedStockIntelligenceEngine.generateUnifiedIntelligence()`'s own hot path (which would add a real DB round-trip per contributing agent to every production call); a caller that wants this context calls it explicitly on the resulting report. A dedicated test asserts the original report object is never mutated and every pre-existing field survives byte-for-byte.

## What was built

New directory: `backend/services/outcomeCalibration/`.

| File | Responsibility |
|---|---|
| `agentAccuracyTracker.js` | **Accuracy tracking**, per-agent. `wasEvidenceCorrect(stance, directionCorrect)` + `aggregateAccuracy(gradedEvidence)` — real correct/total counts and accuracy rate, honestly `null` with zero real graded evidence, honestly not-statistically-meaningful below `MIN_SAMPLE_SIZE = 5`. |
| `agentCalibrationStatistics.js` | **Calibration statistics / Confidence calibration**, per-agent. The same real Brier-style formula, applied per evidence entry. |
| `agentDriftDetector.js` | **Drift detection**, per-agent. Mirrors `calibrationAnalysisService.getCalibrationDrift()`'s exact chronological-split methodology. |
| `agentReliabilityRepository.js` | Read-only join layer: real evidence for one agent, enriched with its claim's real, already-graded outcome (when graded). Writes nothing. |
| `agentReliabilityService.js` | **Agent reliability history** — the composing entry point. `getAgentReliabilityHistory(agentId)`, `getAllAgentsReliabilitySummary(agentIds?)` (defaults to every currently-registered real agent), and `getRecentExecutionSignal(agentId, {log})` (reuses the existing `agentExecutionLog`). |
| `unifiedIntelligenceReliabilityContext.js` | **Unified Stock Intelligence integration** — `attachAgentReliabilityContext(unifiedReport)`, strictly additive, non-mutating. |

## Modified files (both additive)

- `backend/services/claimIntelligence/claimRepository.js` — 2 new read-only query functions (`listEvidenceBySourceEngine`, `listOutcomesForClaimIds`), nothing existing changed.

## The full pipeline, verified live end-to-end during development

```
publishAgentClaim("AAPL", macroAgentResult)  // 1st real evidence entry
publishAgentClaim("AAPL", macroAgentResult)  // 2nd real, agreeing evidence entry -> real claim probability now non-null
claimRepository.updateClaimScalars(claimId, { status: "EXPIRED" })
claimResolutionService.resolveClaim(claimId, { actualDirection: "BULLISH", windowReturnPct: 3.5 })
  -> real ClaimOutcome: { gradeLabel: "CORRECT", directionCorrect: true, calibrationError: 0, ... }
getAgentReliabilityHistory("macro")
  -> {
       agentId: "macro", totalEvidenceCount: 2, gradedEvidenceCount: 2,
       accuracy: { correctCount: 2, totalCount: 2, accuracyRate: 100, isStatisticallyMeaningful: false, reason: "Only 2 real graded evidence entries — need at least 5..." },
       calibration: { avgCalibrationError: 0.2, sampleSize: 2, isStatisticallyMeaningful: false, reason: "..." },
       drift: { earlierCalibrationError: null, laterCalibrationError: null, driftPts: null, reason: "Only 2 real graded evidence entries — need at least 10 to measure drift." },
       recentActivity: { recentExecutionCount: 0, recentAvgConfidence: null, recentSuccessRate: null },
     }
```
Every honest "not yet statistically meaningful" / "insufficient data" reason is real — this is exactly the correct, disclosed behavior with a small real sample, not a bug.

## Compatibility with the existing Agent Platform — verified, not assumed

- **Claim Intelligence**: reuses `claimResolutionService`, `claimRepository`, `claimLifecycle`'s existing statuses/transitions entirely unmodified; only two new read-only queries were added.
- **Unified Stock Intelligence**: `attachAgentReliabilityContext` composes real per-agent history for a real Unified-Stock-Intelligence-shaped report; a dedicated test proves every pre-existing field (`overallIntelligence`, `overallConfidence`, `agentContributions`, etc.) survives unchanged and the original object is never mutated.
- **Observability**: `getRecentExecutionSignal` reuses the existing, unmodified `agentExecutionLog`/`sharedLog` — no new storage, no new writer.
- **Orchestrator / Agent scoring**: zero changes. No domain agent, adapter, or the weighted aggregation engine was touched. A dedicated full-stack test runs a real agent through the real orchestrator (`publishClaims: true`) and asserts the agent's own execution result (`status`, `agentId`) is exactly what it always was — the calibration layer sits entirely downstream and cannot feed back into scoring.

## Tests

**34 new tests, all passing:** `agentAccuracyTracker.test.js` (7), `agentCalibrationStatistics.test.js` (6), `agentDriftDetector.test.js` (5), `agentReliabilityRepository.test.js` (4, real DB), `agentReliabilityService.test.js` (6, real DB), `unifiedIntelligenceReliabilityContext.test.js` (4), `outcomeCalibration.orchestratorIntegration.test.js` (2, full-stack real orchestrator → Bus → Claim → resolve → reliability history).

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2340 tests, 2338 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Reliability history is only as complete as real, graded claim outcomes.** Since claim resolution (`claimResolutionService.resolveClaim`) itself requires a claim to reach a pre-grade-terminal status (`EXPIRED`/`INVALIDATED`) and an externally-supplied real `actualDirection` — neither of which this phase automates — an agent's reliability history will honestly show `isStatisticallyMeaningful: false` until enough real claims involving it have actually been resolved over real time. This phase does not add an automated resolution scheduler; that remains a separate, disclosed future concern (mirroring `outcomeGradingService.gradePendingOutcomes()`'s own explicit design as a callable job, not a cron this phase wires up either).
2. **`recentActivity`'s in-memory `agentExecutionLog` is bounded and recency-only** (evicts oldest records past `maxRecords`) — it is a live complement to the durable Claim-based history, never a substitute for it, and this is disclosed in `agentReliabilityService.js`'s own header.
3. **Per-agent accuracy is derived from evidence *stance* (SUPPORTS/CONTRADICTS), not a separate agent-level prediction record.** This is a deliberate, disclosed reuse choice: every agent's real directional contribution to a claim is already captured this way by the existing Claim layer, and inventing a parallel, agent-level prediction table would duplicate data already present in `ClaimEvidence` — exactly what "reuse existing... infrastructure" asks us to avoid.
4. **`attachAgentReliabilityContext` is not wired into `unifiedStockIntelligenceEngine.generateUnifiedIntelligence()`'s own default call path** — a deliberate choice to avoid adding a real DB round-trip per contributing agent to every production Unified Stock Intelligence request by default. A caller that wants this context (e.g. a future dashboard) calls it explicitly on the already-generated report.

## Files changed

- New: `backend/services/outcomeCalibration/{agentAccuracyTracker,agentCalibrationStatistics,agentDriftDetector,agentReliabilityRepository,agentReliabilityService,unifiedIntelligenceReliabilityContext}.js` + matching `.test.js` files, plus `outcomeCalibration.orchestratorIntegration.test.js`.
- Modified: `backend/services/claimIntelligence/claimRepository.js` (2 new additive read-only query functions).
- Unmodified: every existing Claim Intelligence module (`claimResolutionService.js`, `claimFormationService.js`, `claimConfidence.js`, `claimLifecycle.js`, `claimDimensions.js`, `claimEvidenceLedger.js`, `claimGovernance.js`), every existing calibration module (`calibrationReportService.js`, `calibrationAnalysisService.js`), `outcomeGradingService.js`, `agentExecutionLog.js`/`executionLogStore.js`, `agentOrchestrator.js`, `agentScheduler.js`, `observableOrchestrator.js`, `unifiedStockIntelligenceEngine.js`, every domain agent and its orchestrator adapter.
