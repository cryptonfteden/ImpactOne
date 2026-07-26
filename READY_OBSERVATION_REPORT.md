# READY Observation Certification Report — Phase D1.6

## Result: 0 new READY observations certified this session

This is not a partial or degraded result being underreported — it is the honest outcome given the blockers documented in `DATASET_POPULATION_REPORT.md`. No new `Recommendation` was generated this session (§1 of that report), so there is no new row to carry through the lifecycle. Certifying a READY observation without a new recommendation would mean either reusing one of the 279 pre-existing rows (already fully classified in D1/D1.5 — none are eligible; see below) or fabricating one, which this phase's own rules forbid.

## Lifecycle Verification — Stage by Stage (against the existing 279-row dataset)

| Stage | Status against existing data | Why |
|---|---|---|
| Recommendation | 279 exist | Pre-existing, unchanged this session. |
| DecisionTrace | 279 exist | 1:1 with recommendations, confirmed present. |
| Outcome | 96 exist | Confirmed graded (D1/D1.5), but see next row. |
| Benchmark | 0 of 96 | Every existing graded outcome predates real Finnhub/network access; `benchmarkSymbol` is null on all 96 (immutable, cannot be retroactively populated — D1 rule). |
| Alpha | 0 of 96 | Gated correctly behind Benchmark — never populated without one, by design. |
| Validator | Runs cleanly on all 279 | No validator crash; every row gets a real, non-`UNKNOWN` classification. |
| READY | **0 of 279** | Every row fails at Benchmark (96 rows) or earlier, at missing/never-graded Outcome (183 rows) — see `SPRINT_D1_5_REPORT.md` for the full root-cause breakdown, including the corrected finding that the 96 also fail the unified-committee-shape check. |

**No existing row can become a certified READY observation** — none of the 279 can pass Benchmark, and Outcome rows are immutable (no update/backfill path exists or was added, by design, across D1/D1.5/D1.6).

## What certification will look like once unblocked (for the next session)

Once a `FINNHUB_API_KEY` is supplied and at least one new recommendation is generated (per the population plan in `DATASET_POPULATION_REPORT.md`):

1. Confirm the new `Recommendation` row and its 1:1 `DecisionTrace` exist immediately (synchronous, same run).
2. Confirm its `DecisionTrace.committeeDebate` carries the real unified `{committee, cio}` shape (not the legacy shape found on all 279 existing rows — a specific thing to check, now that D1.6 revealed the legacy-shape issue).
3. Wait out the real 24-hour `GRADING_WINDOW_MS` (cannot be skipped or shortened without a lifecycle-logic change, which this mission forbids).
4. Re-run `outcomeGradingService.gradePendingOutcomes()` — confirm a real `benchmarkSymbol`/`benchmarkReturnPct`/`riskAdjustedReturnPct` (Alpha) populate together, using the now-confirmed-working Yahoo Finance network path.
5. Run `datasetValidatorService.validateRecommendation(id)` on that specific recommendation and confirm it returns `READY`.
6. Document the specific recommendation ID, its full field set, and its validator status here, in a future revision of this same file.

No part of this sequence requires new code — every function named above already exists and was proven callable live in D1.5/D1.6.

## Certification Table

| Recommendation ID | DecisionTrace | Outcome | Benchmark | Alpha | Validator Status |
|---|---|---|---|---|---|
| *(none — no new recommendation was generated this session)* | — | — | — | — | — |
