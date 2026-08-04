# Grading Follow-up Checklist — Phase D1.8

Do not run grading before the timestamps below — the 24-hour window is real and unmodified. Running `outcomeGradingService.gradePendingOutcomes({ timeWindow: "D1" })` before eligibility simply returns these rows unchanged (they won't appear in `listPredictionsPendingOutcome`); it will not corrupt anything, but it also won't do anything useful before the window elapses.

## Recommendations awaiting grading

| # | Symbol | Action | Recommendation ID | Entry price (real, Finnhub) | Predicted at (UTC) | Eligible for grading at (UTC) |
|---|---|---|---|---:|---|---|
| 1 | AAPL | REDUCE | `062de653-2517-4208-af50-8f07c879b325` | $320.83 | 2026-07-23T16:57:39.978Z | **2026-07-24T16:57:39.978Z** |
| 2 | MSFT | REDUCE | `c360ab22-bd74-4980-833d-b2f8d42a7965` | $381.34 | 2026-07-23T16:57:40.236Z | **2026-07-24T16:57:40.236Z** |
| 3 | NVDA | REDUCE | `3f2226b0-55ec-460a-84a5-5ade5f4acfa3` | $209.80 | 2026-07-23T16:57:40.435Z | **2026-07-24T16:57:40.435Z** |
| 4 | GOOGL | REDUCE | `5ed86883-581a-447c-afb5-998131dea599` | $319.35 | 2026-07-23T16:57:40.637Z | **2026-07-24T16:57:40.637Z** |
| 5 | AVGO | REDUCE | `4af6ae88-b09c-4147-926e-48d3bb6d311b` | $390.83 | 2026-07-23T16:57:40.838Z | **2026-07-24T16:57:40.838Z** |

## Exact next-run procedure

1. After **2026-07-24T16:57:41Z** (all 5 eligible), run — through the existing app, no code change:
   ```
   outcomeGradingService.gradePendingOutcomes({ timeWindow: "D1" })
   ```
2. Confirm `FINNHUB_API_KEY` is still loaded in whatever backend process runs this (verify via the same `GET /api/quote?symbol=AAPL` check used in the D1.7→D1.8 handoff) — do not assume it persists across a restart without checking.
3. For each of the 5 `recommendationId`s above, confirm the resulting `Outcome` row has a real `benchmarkSymbol` (`"SPY"`), a non-null `benchmarkVersion` (`"d1-v1"`), and — if `directionCorrect` is non-null — a real `riskAdjustedReturnPct` (Alpha).
4. Re-run `datasetValidatorService.validateRecommendation(id)` on each of the 5 IDs. Expected result: `READY`, unless a genuine data issue surfaces (e.g. Finnhub returns no quote for one symbol at that moment, which correctly produces `UNGRADEABLE`/`CONTAMINATED` — not a defect, an honest outcome).
5. Re-run `datasetQualityReportService.generateDatasetQualityReport()` and confirm `statusCounts.READY` is now > 0 for the first time across D1–D1.8.
6. Document the certified result in a new revision of `READY_OBSERVATION_REPORT.md` (from D1.6) or a new dated follow-up report — operator's choice, not prescribed here.

## What NOT to do in the follow-up run

- Do not shorten or bypass `GRADING_WINDOW_MS`.
- Do not create new synthetic predictions to "help" these 5 grade sooner.
- Do not modify `choosePortfolioAction()`, the concentration threshold, or committee logic to force a different outcome.
- Do not close/sell these 5 positions before grading completes — grading reads `recommendation.evidence.currentPrice` as the entry price and a live quote as the exit price; the positions themselves don't need to still be held, but the recommendation and prediction rows must remain untouched.
