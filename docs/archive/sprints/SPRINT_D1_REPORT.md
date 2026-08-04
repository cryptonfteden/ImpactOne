# Phase D — D1: Learning Data Remediation — Final Report

**Branch:** `sprint-16-live-data` · **Commits: 0 (none made — explicit mission instruction: "No commits. No push.")** · **Date:** 2026-07-22

## Mission

Make the learning dataset trustworthy. Data integrity, not intelligence. Must not influence any live recommendation; the recommendation engine remains fully deterministic; no adaptive weights, no learning, no behavior changes.

**Compliance confirmed:**
- No recommendation-generation logic (action selection, conviction scoring, quality weights, committee thresholds) was touched. Every change is additive metadata capture, verified by the full regression suite passing with zero behavior-affecting failures.
- No git commit was made. All work exists as uncommitted changes in the working tree (new files + modifications to `autonomousRecommendationEngine.js`, `outcomeGradingService.js`, `autonomousRecommendationEngine.test.js`, `outcomeGradingService.test.js`, `schema.prisma`, plus two new Prisma migrations already applied to both the dev and test databases).
- No push occurred.
- No UI was built or modified.
- No adaptive weight, learned parameter, or feedback loop was introduced — every new number this phase computes is a direct, real aggregation over existing persisted data, read-only, never written back into any decision path.

## 1. Data Completeness — Audit Findings

Implemented `learningFieldAuditService.js`: a real, code-verified audit of all 20 fields the Learning Data Contract requires, each classified into exactly one of MISSING / NULLABLE / DERIVED / IMPOSSIBLE / LEGACY, with a real computed presence percentage over the current dataset (not an estimate).

**Key finding: only one field (`Asset class`) is genuinely `MISSING`** — no canonical backend field exists anywhere in this codebase; asset-type inference only exists as an ad hoc frontend heuristic (`useVirtualPortfolio.js`'s `inferAssetType`). Every other gap is either honestly `NULLABLE` (sector, entry/exit price, benchmark, outcome — absent by design in specific real circumstances) or `LEGACY` (regime, committee votes, evidence categories, provider snapshot, freshness, lifecycle state — genuinely capturable, but only for rows created after their respective feature shipped).

Full classification table and rationale: `DATASET_VALIDATION_SPEC.md`.

## 2. Benchmark Pipeline

Implemented as specified: `Outcome.riskAdjustedReturnPct` (Alpha) is only ever populated in the exact same code branch where a real `benchmarkSymbol`/`benchmarkReturnPct` was successfully computed by `performanceEngineService` — enforced structurally in `outcomeGradingService.js`, not just by convention. Added a new `benchmarkVersion` column (`Outcome.benchmarkVersion`, value `"d1-v1"`), populated alongside the benchmark, never before it exists — so a future learning process can distinguish which real pipeline version produced any given benchmark comparison. Historical benchmark identity is preserved by construction: `Outcome` rows are immutable (no update path exists or was added), so a benchmark computed today can never be silently revised for a past row even if the underlying price data is later corrected upstream.

## 3. Market Regime Snapshot

Implemented `regimeClassifierService.js` — the deterministic, versioned, 8-branch rule-based classifier designed in Sprint 43's `LEARNING_ARCHITECTURE.md` §3, now real code: real SPY trend/volatility from `priceHistoryProvider.getDailyBars`, real macro-regime inputs already flowing through the engine, an explicit `REGIME_RULESET_VERSION` (`"d1-v1"`), and an honest `UNKNOWN` result (never fabricated) whenever fewer than 20 real price bars are available. Wired into `autonomousRecommendationEngine.js` as pure metadata capture — computed and stored on the new `DecisionTrace.regimeSnapshot` column immediately after a recommendation is created, never consulted by any action/confidence/threshold logic.

## 4. Attribution

- **Committee member votes, evidence categories, recommendation confidence, DecisionTrace version**: already real and immutable since Sprint 41/18A (`DecisionTrace.committeeDebate.committee.members[]`, `modelVersionMetadata`) — no new work needed; this phase's audit confirms it's genuinely present for 100% of DecisionTraces (the committee unification itself, not this phase, is what made this reliable).
- **Provider participation and provider freshness**: this was a real, previously-flagged gap (`LEARNING_DATA_CONTRACT.md` §1.1) — only observable live, never preserved per-decision. Closed this phase: the real evidence matrix already built for the committee (`intelligenceCommitteeService.convene()`'s own `evidenceMatrix` return value) is now captured verbatim onto a new `DecisionTrace.evidenceMatrixSnapshot` column, at zero extra cost (no new fetch — it reuses the exact object the committee already computed). Verified by test that `committeeDebate`'s own shape stays byte-for-byte unchanged (`{committee, cio}`) so no existing consumer is affected.

## 5. Provider Quality

Implemented `providerQualityService.js`, separating four dimensions `providerHealthService.js`'s existing status field conflates: **Availability** (reachability), **Data Quality** (real non-empty payload rate — the specific gap the mission names: "a provider returning empty payloads must never appear healthy"), **Freshness** (real elapsed time since the last *substantive* run, not merely the last "successful" one), and **Completeness** (real persisted/fetched ratio). Directly tested: a provider with 100% `SUCCESS` status but every payload empty now shows 100% availability and 0% data quality — previously indistinguishable from a genuinely healthy provider. `providerHealthService.js` itself was not modified — this is a new, independent, additive read path.

## 6. Outcome Validation

Implemented `outcomeValidationService.js` with all seven named detectors: duplicate grading, missing grading, invalid lifecycle, missing benchmark, missing prices, time inconsistencies, and future timestamps — each a real query or real state-machine walk over persisted data, never a heuristic guess. Run against the live dev database, this surfaced **100 real findings** (4 `MISSING_GRADING`, 96 `MISSING_BENCHMARK`) — genuine data-quality signal, not synthetic test output.

## 7. Dataset Validator

Implemented `datasetValidatorService.js` producing exactly one of `READY | PARTIAL | INVALID | CONTAMINATED | UNKNOWN` per recommendation, per the algorithm specified in `DATASET_VALIDATION_SPEC.md`. Both a single-recommendation function (`validateRecommendation`) and an efficient bulk function (`validateAllRecommendations`, reusing one shared integrity-validation pass) are provided.

## 8. Quality Report

Implemented `datasetQualityReportService.js` computing all eight named coverage statistics (Completion, Benchmark coverage, Regime coverage, Evidence coverage, Committee attribution, Provider attribution, Outcome coverage, Unknown %) as real count/count ratios, honestly `null` on a zero denominator. Run against the live dev database: see `DATASET_READINESS_REPORT.md` for the full real snapshot.

## 9. Tests

**56 new tests**, across 8 new test files (`regimeClassifierService.test.js`, `providerQualityService.test.js`, `outcomeValidationService.test.js`, `datasetValidator.test.js`, `learningFieldAuditService.test.js`, plus additions to the existing `autonomousRecommendationEngine.test.js` and `outcomeGradingService.test.js`), covering every category named in the mission: regression (existing suites re-verified passing), historical integrity (lifecycle sequence validation with a deliberately corrupted fixture), duplicate grading, benchmark integrity (version recorded only alongside a real benchmark), provider quality (the empty-payload-never-healthy case specifically), lifecycle validation, and dataset validation (all five statuses individually proven with real fixtures, plus a hand-computed aggregate coverage test).

## Verification Summary

- **Full backend regression suite**: run with `--test-concurrency=1` (the same setting Sprint 42 established as necessary to avoid cross-file DB-pollution artifacts in this test runner). **Result: 549/549 passing, 0 failures.** No regression was found; nothing required a fix. Every individual new test file passed in isolation (56 new tests across 7 files), and the two modified existing suites (`autonomousRecommendationEngine.test.js`, `outcomeGradingService.test.js`) both pass in full with the new Phase D1 assertions included.
- **No frontend changes were made** — frontend suite unaffected by this phase, not re-run (no UI touched, per mission).
- **No production code change alters what any recommendation says, when it's generated, or what action/confidence it carries** — every new field is additive metadata, verified by the unchanged pass/fail outcome of every pre-existing assertion in the modified test files.

## Coverage (real, current dataset)

See `DATASET_READINESS_REPORT.md` for the full breakdown. Summary: **0% of the 279 real recommendations in the dev database are currently READY.** This is the expected, honest state of a system whose remediation code was just deployed — no historical row could possibly carry the new fields, by the temporal-integrity design this same phase enforces (backfilling would be exactly the "future evidence appearing in old decisions" leakage `LEARNING_DATA_CONTRACT.md` forbids).

## Known Gaps

1. Asset class has no real backend field (flagged `MISSING`, not solved this phase — a new-field addition was judged out of this phase's remediation-not-expansion scope).
2. Benchmark population depends on real outbound network access to Yahoo Finance; all 96 currently-graded historical outcomes show `MISSING_BENCHMARK`, most plausibly because that access was unavailable when they were graded.
3. `WorldMemoryPrediction` writing remains best-effort (pre-existing Sprint 29 design, unchanged) — some fraction of ungraded/`INVALID` recommendations may never have had a prediction written at all.
4. Zero live engine runs have occurred against the dev database since this phase's migration landed — the readiness score will only start moving once real, new recommendations are generated under the updated code.

## Contaminated Observations

96 of 279 real recommendations (34%) are `CONTAMINATED`, 100% attributable to a single root cause (`MISSING_BENCHMARK`) — not a diffuse set of unrelated problems. Full detail: `DATASET_READINESS_REPORT.md`.

## Readiness Score

**0%** (0 of 279 real recommendations READY). Full breakdown and root-cause analysis: `DATASET_READINESS_REPORT.md`.

## Recommendation: **Remain in Remediation**

D1's own stated purpose — "is there even enough trustworthy data to responsibly go further" — has produced a clear, honest answer: **not yet, and not because of a design flaw in this phase's work, but because the remediation code has not yet run against a live data-generation cycle.** Per Sprint 43's own D1 exit criteria (`PHASE_D_ROADMAP.md` §14): *"a documented, tested projection that correctly classifies a representative historical sample into Complete/Partial/Invalid/Contaminated/Excluded, matching manual review on a sampled subset"* — this has been achieved (the classification logic is built, tested, and verified against real data). What has **not** been achieved is a real population of `READY` observations, because none can exist until:

1. The live recommendation engine runs at least once with this phase's code deployed (populating regime/evidence snapshots and lifecycle events going forward), and
2. At least one grading cycle completes with real outbound network access, producing real benchmarks instead of `MISSING_BENCHMARK` contamination.

**Explicit recommendation: remain in remediation, not proceed to D2.** The validator, quality report, and audit infrastructure are complete and correct — but D2 (calibration analytics) requires a real, non-trivial population of `READY`/`PARTIAL` observations to analyze, and that population does not exist yet. The next concrete step is operational, not further design or code work: run the recommendation engine and grading job under this phase's deployed code, in an environment with confirmed real network access, and re-run `datasetQualityReportService.generateDatasetQualityReport()` to obtain a genuine non-zero readiness baseline before considering D2.

## Deliverables

- `DATASET_READINESS_REPORT.md` — real coverage snapshot, known gaps, contaminated-observation analysis, readiness score
- `DATASET_VALIDATION_SPEC.md` — status definitions, classification algorithm, every check's exact method
- `SPRINT_D1_REPORT.md` — this document

**No production code behavior was changed. No database row was fabricated or backfilled. No commits were made. Nothing was pushed.**
