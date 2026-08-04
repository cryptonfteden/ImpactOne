# Production Readiness Checklist — Phase D1.7

Operator actions only. No code changes are required for any item on this list — every function needed already exists and was proven callable live across D1.5–D1.7.

## Mandatory — before any live data collection

- [ ] Obtain a Finnhub API key (free tier is sufficient for quotes) and set `FINNHUB_API_KEY` in `backend/.env`.
- [ ] Restart the backend so `config/env.js` picks up the new value.
- [ ] Verify with a single live call: `finnhubService.getQuote('AAPL')` returns a real `{quote: {price, ...}}` payload, not the missing-key error.
- [ ] Re-run `providerScheduler.runNow()` and confirm `itemsFetched > 0` for at least the `reutersBloombergWire` provider (or configure `NEWS_API_KEY` if it still returns 0 — see Recommended below).
- [ ] Run `autonomousRecommendationEngine.runOnce()` once with a real watchlist and confirm `recommendationsGenerated > 0`. If it's still 0, place 10–20 concentrated same-sector paper trades via `portfolioEngineService.placeOrder()` (now unblocked) to trigger the existing 35% concentration-override REDUCE rule, then re-run.
- [ ] Confirm the newly-created `DecisionTrace.committeeDebate` carries the unified `{committee, cio}` shape (not the legacy shape found on all 279 pre-existing rows).
- [ ] Wait the real 24-hour grading window — this cannot be skipped operationally without a lifecycle-logic change, which is out of scope.
- [ ] Re-run `outcomeGradingService.gradePendingOutcomes()` and confirm at least one `Outcome` row has a real `benchmarkSymbol`/`benchmarkReturnPct`/`riskAdjustedReturnPct`.
- [ ] Run `datasetValidatorService.validateRecommendation(id)` on that recommendation and confirm it returns `READY`.

## Recommended — improves data quality, not strictly blocking

- [ ] Obtain a working news/wire provider key (`NEWS_API_KEY` or equivalent) so canonical events populate beyond the current near-zero baseline, giving conviction scores real per-symbol differentiation instead of flat sector bands.
- [ ] Configure at least a few of the remaining 13 keyless/stub providers (SEC, earnings, options flow are likely highest-signal) to broaden event coverage further.
- [ ] Confirm the scheduler (`schedulerService.js` / `providerScheduler.js`) is actually started in the target deployment (`server.js` wiring), not just callable manually.

## Optional — quality-of-life, not required for a valid dataset

- [ ] Configure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for richer committee synthesis text (the pipeline already degrades gracefully without it — no observation is blocked on this).
- [ ] Configure remaining social/alt-data providers (Reddit, X, Telegram, Polymarket) for broader sentiment signal.
- [ ] Set `AUTONOMOUS_ENGINE_INTERVAL_MINUTES` explicitly rather than relying on its default, if a non-default cadence is desired.

## Explicitly NOT on this checklist

Nothing here requires touching `autonomousRecommendationEngine.js`'s action-threshold logic, `intelligenceCommitteeService`, or the 24-hour grading window constant — all three are out of scope for D1.7 by mission rule, and none needed to be changed to reach a real READY observation. The blockers are entirely credentials and operator actions, not code.
