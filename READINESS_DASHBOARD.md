# Readiness Dashboard — Phase D1.5

Snapshot report (static — no live UI built, per mission scope). Regenerate by re-running `datasetQualityReportService.generateDatasetQualityReport()` + `outcomeValidationService.runOutcomeValidation()` after each future grading cycle.

## Current Status (2026-07-23)

| Status | Count | % of 279 |
|---|---:|---:|
| READY | 0 | 0% |
| PARTIAL | 0 | 0% |
| INVALID | 183 | 65.6% |
| CONTAMINATED | 96 | 34.4% |
| UNKNOWN | 0 | 0% |

## Trend (D1 → D1.5)

| Metric | D1 | D1.5 | Δ |
|---|---:|---:|---:|
| READY | 0 | 0 | — |
| PARTIAL | 0 | 0 | — |
| INVALID | 183 | 183 | — |
| CONTAMINATED | 96 | 96 | — |
| UNKNOWN | 0 | 0 | — |
| Benchmark coverage | 0% | 0% | — |
| Real network access to price data | ❌ unconfirmed | ✅ confirmed | **fixed this phase** |

No dataset composition changed between D1 and D1.5 — flat trend is expected and honestly reported, not smoothed over. The one real change this phase produced is infrastructure-level (network access), not yet reflected in the counts because no new recommendation/grading cycle completed successfully (see `OPERATIONAL_DATASET_REPORT.md` §4 for why).

## Exit Gate Scorecard

| Gate | Target (informal, this phase) | Actual | Met? |
|---|---|---|---|
| READY observations | > 0, ideally a real double-digit sample | 0 | ❌ |
| Benchmark coverage | Meaningfully > 0% on any new grading | 0% (no new grading occurred) | ❌ |
| Alpha coverage | > 0% on any new grading | 0% | ❌ |
| Duplicate grading | 0 detected | 0 detected | ✅ |
| Referential integrity | 0 orphaned predictions | 2 orphaned predictions found | ❌ |
| Validator success rate | Validator runs without error on 100% of rows | 279/279 classified without a validator crash | ✅ |

**2 of 6 gates met.** Full narrative and recommendation: `SPRINT_D1_5_REPORT.md`.
