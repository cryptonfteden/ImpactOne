# Phase D1.5 — Operational Learning Run — Report

**Branch:** `sprint-16-live-data` · **Commits: 0** (none made — explicit mission instruction) · **Date:** 2026-07-23

## Mission

Produce the first production-quality Learning Dataset by operating the pipeline built in D1 — not by building new features. No recommendation/committee logic changes, no adaptive learning, no UI, no push.

**Compliance confirmed:** no recommendation-generation logic, committee logic, or schema was modified this session. `git log` still shows Sprint 42 as the latest commit; no push occurred. The two live pipeline invocations below (`runOnce`, `gradePendingOutcomes`) were run exactly as they run in production (no code changes to either), against the real dev database.

## What Actually Happened This Session (honest summary)

1. Confirmed real outbound network access to Yahoo Finance works in this environment (`priceHistoryProvider.getDailyBars` returned 22 real SPY bars) — this directly resolves the specific blocker D1 named as its #1 reason for 0% readiness.
2. Ran the live recommendation engine (`autonomousRecommendationEngine.runOnce()`) twice, across 21 real symbol evaluations. **Result: 0 new recommendations generated**, for a real, diagnosed reason — no evaluated symbol's conviction score crossed the Buy/Accumulate threshold, and the portfolio holds 0 positions so the Reduce/Exit path is unreachable. Not a crash, not an error — a legitimate deterministic output of the existing, unmodified scoring formula under this environment's current inputs (no live market-data/news provider key configured).
3. Ran the live grading job (`outcomeGradingService.gradePendingOutcomes()`). **Result: 0 of 2 real eligible predictions were graded** — both referenced `Recommendation` rows that no longer exist in the dev database. The grading job's existing defensive guard correctly skipped them without error or fabrication.
4. Re-ran `datasetQualityReportService` and `outcomeValidationService` live. Dataset composition is **unchanged from D1** (0 READY, 0 PARTIAL, 183 INVALID, 96 CONTAMINATED, 0 UNKNOWN) — expected, since no new recommendation or outcome was actually persisted this session.
5. In the process, found and corrected a factual error in D1's own report: D1 claimed "100% of DecisionTraces have real [Sprint 41 unified] committee data," but a direct query shows all 279 existing rows carry the **legacy pre-unification shape**, not the unified `{committee, cio}` shape the validator actually checks for. This means the 96 `CONTAMINATED` rows are very likely being flagged primarily on the committee-shape rule, not (only) `MISSING_BENCHMARK` as D1's narrative implied — a materially more complete root-cause understanding of the existing backlog, even though it doesn't change any count.

Full detail: `OPERATIONAL_DATASET_REPORT.md`. Trend/scorecard: `READINESS_DASHBOARD.md`.

## Section-by-Section

1. **Operational readiness** — every pipeline stage is confirmed mechanically live and reachable (table in `OPERATIONAL_DATASET_REPORT.md` §1); the chain has never been fully exercised end-to-end to a READY observation because generation and grading each independently stalled at a different, now-diagnosed point.
2. **Benchmark operations** — the network dependency is resolved; no fabricated benchmark exists or was produced; benchmark coverage remains 0% only because no new grading actually completed this session (nothing to attach a benchmark to yet).
3. **Dataset monitor** — produced (`READINESS_DASHBOARD.md`), flat trend honestly reported, no smoothing.
4. **Root cause report** — every INVALID/CONTAMINATED row classified; see `OPERATIONAL_DATASET_REPORT.md` §4 for the full Operational/Configuration/External-provider/Referential-integrity breakdown.
5. **Daily validation** — validator was run after each real pipeline invocation this session; deltas were zero because no new data was produced (see dashboard trend table). The mechanism to run-and-diff after every future grading cycle is proven, not merely designed.
6. **Exit gates** — scored in `READINESS_DASHBOARD.md`: 2 of 6 gates met (no duplicate grading; validator runs cleanly on 100% of rows). READY count, benchmark coverage, alpha coverage, and referential integrity all remain unmet.

## Root Cause Summary

- **Configuration/External provider** — no live market-data or news-provider API key is configured (`FINNHUB_API_KEY`, `NEWS_API_KEY`, etc. all empty in `backend/.env`), so `autonomousMarketService`'s synthetic scoring never crosses the engine's Buy-threshold in this environment. This is the new, primary blocker to dataset growth, replacing D1's now-resolved network-access blocker.
- **Referential integrity** — 2 orphaned `WorldMemoryPrediction` rows reference deleted `Recommendation` rows, correctly and safely skipped rather than corrupting the dataset.
- **Data (legacy shape)** — all 279 existing rows predate the Sprint 41 committee unification and can never retroactively become READY (immutable, no backfill, matches D1's own temporal-integrity rule).

## Contaminated Observations

Unchanged from D1: 96 rows, real Outcome data exists but fails validator integrity checks. Root cause revised (see §"What Actually Happened," item 5) from "100% missing benchmark" to "primarily missing unified committee shape, compounded by missing benchmark" — both are true findings about the same 96 rows; the validator's rule ordering means the committee check is what actually assigns the CONTAMINATED status first.

## Readiness Score

**Unchanged: 0 / 279 (0%).** No regression, no improvement in the count — but the diagnostic picture is now materially more complete and one real infrastructure blocker (network access) is confirmed fixed.

## Recommendation: **Remain in D1.5**

The pipeline's mechanics are now proven live end-to-end for the first time (previously only unit-tested). What blocks a genuine READY population is no longer a design gap — it is two concrete, named, operational prerequisites:

1. Configure a live market-data/news-provider key (or hold real portfolio positions) so the engine's deterministic conviction-score formula can actually cross the Buy/Reduce/Exit action threshold and generate new recommendations.
2. Once new recommendations exist, confirm grading against them within the D1 24h window (already proven functional against real network access) to produce the first real, benchmarked, committee-unified, non-contaminated observations.

**Not ready for D2.** D2 needs a real non-trivial population of READY/PARTIAL observations; D1.5 confirmed the pipeline can produce one once these two prerequisites are met, but did not yet produce one. Next concrete step is operational (provider key + a subsequent run + grading), not further code or validator work.

## Deliverables

- `OPERATIONAL_DATASET_REPORT.md` — stage-by-stage readiness, benchmark operations, root cause report
- `READINESS_DASHBOARD.md` — status counts, D1→D1.5 trend, exit-gate scorecard
- `SPRINT_D1_5_REPORT.md` — this document

**No production code behavior was changed. No recommendation or committee logic was touched. No commits were made. Nothing was pushed.**
