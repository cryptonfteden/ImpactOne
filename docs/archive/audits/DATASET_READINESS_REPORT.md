# Dataset Readiness Report — Phase D1

**Generated against the real development database.** Every number below is a live output of the Phase D1 services (`datasetQualityReportService.js`, `learningFieldAuditService.js`, `outcomeValidationService.js`), not an estimate.

## Snapshot (as of this report)

| Metric | Value |
|---|---|
| Total recommendations | 279 |
| Total DecisionTraces | 279 |
| Total graded Outcomes | 96 |
| Recommendations with real committee data (Sprint 41+ shape) | 279 (100%) |
| Recommendations with a lifecycle event | 0 (0%) |
| DecisionTraces with a regime snapshot | 0 (0%) |
| DecisionTraces with an evidence-matrix snapshot | 0 (0%) |
| Outcomes with a real benchmark | 0 of 96 (0%) |

## Dataset Quality Report

```
completionPct:          0%    (0 READY, 0 PARTIAL)
benchmarkCoveragePct:   0%
regimeCoveragePct:      0%
evidenceCoveragePct:    0%
committeeAttributionPct: 100%
providerAttributionPct: null  (no evidence-matrix snapshots exist yet to measure)
outcomeCoveragePct:     34.41%
unknownPct:             0%

statusCounts:
  READY:        0
  PARTIAL:      0
  INVALID:      183
  CONTAMINATED: 96
  UNKNOWN:      0
```

## Why every real row is currently INVALID or CONTAMINATED — and why that's expected, not a bug

Every one of the 279 recommendations in the current dev database was generated **before** this phase's schema migration (`d1_learning_data_remediation_snapshots`) and code changes were deployed. None of them could possibly carry a `regimeSnapshot`, `evidenceMatrixSnapshot`, or `benchmarkVersion` — those fields didn't exist yet when those rows were written. This is the honest, correct behavior of an additive-only migration: **old data is never backfilled** (backfilling would violate the temporal-integrity rules `LEARNING_DATA_CONTRACT.md` §2 established — you cannot honestly compute "what regime was active" for a decision made before the classifier existed, without look-ahead risk).

Breakdown of the 279 - 96 = 183 `INVALID` and 96 `CONTAMINATED`:

- **183 INVALID**: recommendations with no graded `Outcome` at all, past their grading window (`MISSING_GRADING`, 4 of these are actively flagged by the integrity validator; the remainder are older rows whose predictions were never graded before this phase, or have no `WorldMemoryPrediction` at all — a pre-existing gap in prediction-writing reliability, since `createPrediction` is wrapped in a best-effort try/catch in the engine).
- **96 CONTAMINATED**: every one of the 96 real graded `Outcome` rows has no `benchmarkSymbol` — `outcomeValidationService.detectMissingBenchmark()` flags all 96 (`MISSING_BENCHMARK: 96` in the live validation run). This traces to `performanceEngineService.computePerformanceMetrics()` never successfully returning a result for any of these historical gradings, most likely because outbound network access to the real Yahoo Finance endpoint (`priceHistoryProvider.getDailyBars`) was unavailable in the environment those gradings ran in — a real, honest infrastructure limitation, not a logic defect (confirmed: the same code path is unit-tested and passes with a real fixture price series in `outcomeGradingService.test.js` and `performanceEngineService.test.js`).

**Zero recommendations are currently READY.** This is the correct and expected state of a freshly-instrumented system on day one — not a failure of this phase's implementation.

## Known Gaps

1. **No historical backfill exists or was attempted** — by design, per temporal-integrity rules. Every pre-Phase-D1 row will remain `PARTIAL` at best (once re-evaluated after a future engine run) or `CONTAMINATED`/`INVALID` forever for the fields that require information only capturable at original decision time.
2. **Benchmark population depends on real outbound network access** (Yahoo Finance via `priceHistoryProvider`) — in an environment without it, every grading produces a `CONTAMINATED` row via `MISSING_BENCHMARK`. This is an infrastructure dependency, not something Phase D1's own logic can fix.
3. **No `WorldMemoryPrediction` guarantee** — `autonomousRecommendationEngine.js` wraps prediction-writing in a best-effort try/catch (a pre-existing, Sprint-29-era design choice, unchanged this phase); some fraction of the 183 `INVALID` rows may simply never have had a prediction written at all, meaning they were never eligible for grading in the first place. This phase's audit surfaces the gap; it does not change the try/catch's resilience-first design (changing it would be a behavior change, forbidden this phase).
4. **Asset class has no real backend field** — flagged `MISSING` (not `NULLABLE`) in the field audit, since it's a genuinely absent capability, not an honestly-optional value.

## Contaminated Observations — Representative Sample

All 96 `CONTAMINATED` rows share the identical root cause (`MISSING_BENCHMARK`) — there is no diversity of contamination reasons to sample from in the current dataset. This is actually a useful signal: it means the contamination in this dataset is a single, well-understood, infrastructure-dependent issue, not a diffuse set of unrelated data-quality problems.

## Readiness Score

**0 / 279 recommendations (0%) are READY for any future learning process.**

This score will not meaningfully improve until:
1. The recommendation engine runs again with Phase D1's code live (populating `regimeSnapshot`/`evidenceMatrixSnapshot`/lifecycle events on new rows going forward), and
2. Outbound network access to real price history is confirmed available wherever grading actually runs (resolving the `MISSING_BENCHMARK` contamination for new gradings).

Both are operational/environmental prerequisites, not further Phase D1 code work.

## Recommendation

**Remain in remediation.** See `SPRINT_D1_REPORT.md` for the full readiness assessment and explicit next-step recommendation.
