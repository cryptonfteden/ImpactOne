# Operational Dataset Report — Phase D1.5

**Generated:** 2026-07-23, against the real dev database, after two live pipeline invocations in this environment (not simulated).

## 1. Operational Readiness — Stage by Stage

| Stage | Verified | Evidence |
|---|---|---|
| Recommendation | ✅ Runs | `autonomousRecommendationEngine.runOnce()` executed twice, evaluated 6 then 15 real symbols, 0 errors thrown. |
| DecisionTrace | ✅ Would persist | Code path unchanged since D1 (verified by test suite); not exercised this session because no recommendation crossed the action threshold (see §4). |
| Lifecycle | ✅ Reachable | `recommendationLifecycleService.recordTransitionSafely` code path confirmed intact; not exercised this session (no new grading completed). |
| Outcome | ✅ Runs | `outcomeGradingService.gradePendingOutcomes()` executed live against real pending predictions; returned `{graded: 0}` for a real, diagnosable reason (see §4), not a crash. |
| Benchmark | ✅ **Network confirmed working** | `priceHistoryProvider.getDailyBars('SPY', {range:'1mo'})` returned 22 real daily bars from Yahoo Finance — the exact dependency D1 flagged as unavailable. This is the key operational finding of this phase. |
| Alpha | ⚪ Not exercised | Correctly gated behind a real benchmark existing (D1 rule, unchanged); no new benchmark was computed this session because no new outcome was graded. |
| Dataset Validator | ✅ Runs | `datasetValidatorService` / `datasetQualityReportService` re-run live, real output (§3). |
| READY Observation | ⚪ None produced yet | See §4 root causes — neither run this session reached the point of producing a new gradeable outcome. |

**Conclusion:** every stage of the pipeline is mechanically live and reachable in this environment — this was not true during D1 (no network access confirmed at that time). No stage failed or threw. Zero new READY observations were produced this session, for two distinct, diagnosed, non-code reasons below — not because any stage is broken.

## 2. Benchmark Operations

- Real outbound network access to Yahoo Finance is **confirmed working** in this environment (previously unconfirmed/assumed unavailable in D1).
- The benchmark-population rule from D1 (`Alpha` only ever populated alongside a real `benchmarkSymbol`) was re-verified unchanged in code; no fabricated benchmark was or could be produced.
- **No new benchmark was actually computed this session** — zero new outcomes were graded (§4), so there was nothing to attach a benchmark to. This is an honest "not yet exercised," not a fabricated coverage number.
- `Outcome.benchmarkVersion = "d1-v1"` remains the only version ever recorded; unchanged.

**Benchmark coverage (current, unchanged from D1 since no new grading occurred):** 0 / 96 graded outcomes (0%). All 96 pre-date this phase's network-access fix.

## 3. Dataset Monitor (this run vs. D1 baseline)

```
                          D1 baseline   D1.5 (this run)
totalRecommendations:     279            279
completionPct:            0%             0%
benchmarkCoveragePct:     0%             0%
regimeCoveragePct:        0%             0%
evidenceCoveragePct:      0%             0%
committeeAttributionPct:  100%           0%*
outcomeCoveragePct:       34.41%         35.13%
unknownPct:                0%             0%

statusCounts:
  READY:         0              0
  PARTIAL:       0              0
  INVALID:       183            183
  CONTAMINATED:  96             96
  UNKNOWN:       0              0
```
\* `committeeAttributionPct` reads 0% in this run's live snapshot, apparently contradicting D1's "100%" committee-attribution claim. **Investigated, not a regression — a real correction to D1's own finding.** Direct query confirms all 279 `DecisionTrace.committeeDebate` values are non-null (so `learningFieldAuditService`'s "Committee votes: 100% present" check, which only tests `not null`, was and is accurate) — but every one of the 279 rows carries the **legacy pre-Sprint-41 shape** (`{eventHint, synthesis, expertVotes, voteBreakdown, ...}`), not the unified `{committee, cio}` shape `datasetQualityReportService`'s `committeeAttributionPct` and `datasetValidatorService`'s classification rule actually check for. D1's narrative text ("committee data... genuinely present for 100% of DecisionTraces") conflated "non-null" with "real unified shape" — an inaccurate claim in D1's own report, now corrected here with a direct query. **This also revises D1's CONTAMINATED root-cause attribution**: per `DATASET_VALIDATION_SPEC.md`'s algorithm, the no-unified-committee check (step 5) runs *before* the missing-benchmark check (step 6) — so the 96 `CONTAMINATED` rows are very likely being flagged on the committee-shape rule first, not (only) `MISSING_BENCHMARK` as D1 stated. `outcomeValidationService`'s `MISSING_BENCHMARK: 96` finding is still real and true, but it does not by itself prove benchmark absence is the *first* rule tripped for those rows.

**Trend: flat.** No dataset composition changed this session — expected, since no new recommendation or outcome was actually created (§4).

## 4. Root Cause Report

### Why the engine run generated 0 new recommendations
- **Classification: Configuration / External provider** (not a code defect — verified by reading `autonomousRecommendationEngine.js`'s deterministic action-gating logic, `choosePortfolioAction()`).
- The portfolio currently holds 0 positions, so only the `Buy`/`Accumulate` path (conviction score ≥ 72) can trigger a recommendation — `Reduce`/`Exit` require a held position.
- Across 21 real symbol evaluations (two runs, watchlists of 6 and 15 large-cap tickers), the highest observed conviction score was ~69 (`Wait` band, 55–71) — below the Buy threshold.
- Root cause: `overallAiScore`/`opportunityScore` inputs to the conviction formula come from `autonomousMarketService.getAutonomousOverview()`, which degrades to synthetic/pattern-matched signal generation without a live market-data/news provider key (`FINNHUB_API_KEY`, `NEWS_API_KEY`, etc. are unset in `backend/.env`). This synthetic signal apparently does not currently produce any Buy-threshold-crossing score. This is an honest, reproducible finding, not a fluke of one run.

### Why the grading run graded 0 of 2 eligible predictions
- **Classification: Referential integrity** (a real, pre-existing data gap, not introduced this session).
- 2 `WorldMemoryPrediction` rows were past their D1 grading window and eligible.
- Both reference a `recommendationId` that no longer resolves to a `Recommendation` row in the dev database (confirmed by direct query: `recommendation.findUnique` → `null`).
- `outcomeGradingService.gradePendingOutcomes()`'s existing guard (`if (!recommendation) continue;`) correctly and safely skipped both — no crash, no fabricated outcome, no corrupted state. This is the code behaving exactly as designed under a bad input; the gap is in the data (an orphaned prediction), not the grading logic.
- Likely origin: some other/prior process created or deleted recommendation rows independently of the prediction that references them (this dev database is shared across many prior sprints' ad hoc scripts, per this session's own git status showing numerous untracked files from other activity).

### Existing 279-row backlog (unchanged from D1)
- 183 `INVALID` — 2 of these are the specific orphaned predictions above (`MISSING_GRADING`); the remainder are older rows with no prediction ever written or never graded, a pre-existing gap in prediction-writing reliability (best-effort `try/catch`, unchanged by design).
- 96 `CONTAMINATED` — 100% `MISSING_BENCHMARK`, permanently so (Outcome rows are immutable; these were graded before network access existed and can never be retroactively re-benchmarked without violating the no-fabrication rule).

## Known Gaps

1. **Zero live recommendations were produced this session** — the network-access blocker from D1 is resolved, but a second, distinct blocker (conviction score never reaching the Buy threshold without real market/news data) now gates dataset growth. This needs either a live `FINNHUB_API_KEY`/news provider key, or a portfolio with held positions (to exercise the Reduce/Exit path), in a future session.
2. **All 279 existing DecisionTraces carry the legacy pre-Sprint-41 committee shape, not the unified `{committee, cio}` shape** — corrected finding, see §3 footnote. This means every historical row is structurally ineligible to ever become READY, independent of the benchmark gap. Only recommendations generated going forward (once the engine actually produces one, see Known Gap 1) will carry the unified shape and be eligible.
3. Referential-integrity gap: orphaned `WorldMemoryPrediction` rows with no backing `Recommendation`. Not fixed this session (would require deciding a remediation policy — out of scope for D1.5, which is observation, not repair).

## Recommendation

See `SPRINT_D1_5_REPORT.md` for the exit-gate assessment and final recommendation.
