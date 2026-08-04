# External Dependency Certification — Phase D1.7

**Generated:** 2026-07-23, from direct code inspection and live calls against the real dev environment.

## 1. Dependency Matrix

| Dependency | Purpose | Required / Optional | Current Status | Configuration Source | Failure Impact |
|---|---|---|---|---|---|
| **PostgreSQL** | System of record — Recommendation, DecisionTrace, Outcome, WorldMemory, ProviderRunLog, etc. | **Required** | ✅ Configured, reachable, working (confirmed: 279 recommendations queried live) | `DATABASE_URL` in `backend/.env`, loaded via root `prisma.config.ts` | Total outage — nothing in the app functions without it. |
| **Finnhub** (live quotes) | `finnhubService.getQuote()` — real-time price for ranking/scoring, order execution, and outcome grading | **Required** for live data collection | ❌ Not configured — `FINNHUB_API_KEY` unset; confirmed live: calling `getQuote('AAPL')` throws `"FINNHUB_API_KEY is missing."` | `FINNHUB_API_KEY` in `backend/.env` | See §2 — blocks 4 independent consumption points across scoring, portfolio management, and grading. |
| **Yahoo Finance** (historical bars) | `priceHistoryProvider.getDailyBars()` — regime classification (SPY trend/vol) and benchmark computation (Alpha) | Required for regime/benchmark, not for basic recommendation generation | ✅ Configured (keyless), reachable, working — confirmed live: 22 real SPY daily bars returned | No key required; hits Yahoo's public endpoint directly | If unreachable: regime honestly degrades to `UNKNOWN` and benchmark honestly stays unpopulated — never fabricated (D1 rule, unchanged and reconfirmed working this phase). |
| **News/wire provider** (`reutersBloombergWire` + `NEWS_API_KEY`-gated providers) | Populates `CanonicalEvent` rows that drive per-symbol event matching and score differentiation | Recommended (not hard-required, but caps scoring quality without it) | ❌ Not configured — `NEWS_API_KEY` unset; `reutersBloombergWire` provider does make a real network call but returns 0 items | `NEWS_API_KEY` and related keys in `backend/.env` | Conviction scores fall back to a small number of flat sector-level bands (confirmed live ceiling of 69, never reaching the 72 Buy threshold) instead of real per-symbol differentiation. |
| **Environment variables** (all keys) | Central configuration surface | Required (as a mechanism) | ✅ Loading mechanism confirmed working (`config/env.js`, `.env` parsed correctly) — the *mechanism* works; the specific *values* for optional-provider keys are simply unset | `backend/.env` (git-ignored; `.env.example` documents the full expected key set) | N/A — this is infrastructure, not a dependency itself. |
| **Scheduler** (`providerScheduler.js`, `schedulerService.js`) | In-process `node-cron`, 15-minute provider ingestion cadence + engine `runOnce()` cadence | Required for continuous operation (not for a manual/one-off run) | ✅ Confirmed working — `providerScheduler.runNow()` was called live this phase and executed all 15 providers sequentially without error, each respecting its own rate limiter | `AUTONOMOUS_ENGINE_INTERVAL_MINUTES` (unset → defaults to 30 min); cron pattern hardcoded `*/15 * * * *` in `providerScheduler.js` | If the scheduler process isn't started (only wired in `server.js`), ingestion/engine runs simply don't happen automatically — manual `runNow()`/`runOnce()` calls remain available as a fallback, as used throughout D1.5–D1.7. |
| **13 remaining registered providers** (SEC, Reddit, X, Telegram, Polymarket, Fed, ECB, Treasury, NASA, FDA, patent, earnings, options flow, coinglass, spdr, zacks, tipranks, finviz, cftcCot) | Broaden canonical-event coverage beyond wire news | Optional — each incrementally improves scoring differentiation, none is individually blocking | ❌ All report `itemsFetched: 0`; most complete in <1ms (no real network attempt — configuration/key-gated stubs), confirmed via a live `providerScheduler.runNow()` this phase | Various provider-specific keys, mostly unset | Cumulative: thinner event coverage → flatter, less differentiated conviction scores. No single one of these 13 is a hard blocker on its own. |
| **OpenAI/Anthropic** (LLM for committee synthesis) | `buildCommitteeDebate()` — richer qualitative committee reasoning | Optional — the existing best-effort design degrades to null, never throws | ❌ Not configured | `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` in `backend/.env` | Committee debate content is thinner/absent; does not block recommendation generation, DecisionTrace creation, or grading. |

## 2. Finnhub Validation — Exact Consumption Points

```
Request  → finnhubService.getQuote(symbol)  [backend/services/finnhubService.js]
             reads FINNHUB_API_KEY from config/env.js; throws synchronously
             ("FINNHUB_API_KEY is missing...") before any HTTP call is made
             if the key is absent — confirmed live this phase.

Response → { quote: { price, change, changePercent, ... } }  (when key is present)

Quote    → consumed at exactly 4 call sites in production code:

  1. autonomousMarketService.js:544 (buildWatchlistRanks)
       quotesBySymbol[symbol].quote → livePayload → currentPrice, dayChangePercent
       on every ranked symbol. Feeds directly into the conviction-score inputs
       (rankingItem.currentPrice / momentum). BEST-EFFORT — degrades to null,
       does not throw.

  2. portfolioEngineService.js:28 (getPortfolioSummary → markPositions)
       Marks existing held positions to live market value. BEST-EFFORT
       (.catch(() => null)) — a missing quote leaves that position unmarked,
       does not crash the summary.

  3. portfolioEngineService.js:139 (placeOrder)
       HARD DEPENDENCY — throws badRequest("No live price available...")
       if no quote. This is the one call site with no graceful degradation:
       without Finnhub, no paper trade can ever be placed, which blocks the
       only alternate path to a recommendation (the concentration-override
       REDUCE rule) that doesn't depend on conviction-score thresholds.

  4. outcomeGradingService.js:58 (gradePendingOutcomes)
       BEST-EFFORT (.catch(() => null)) — a missing/failed quote makes
       windowEndPrice non-finite, which routes the outcome to gradeLabel:
       "UNGRADEABLE" rather than throwing. This is the exact mechanism
       behind the MISSING_BENCHMARK/UNGRADEABLE pattern documented in
       D1 and D1.5.

↓ Recommendation
   evaluateSymbol() only creates a Recommendation once portfolioAction.action
   resolves to Buy/Accumulate/Reduce/Exit (autonomousRecommendationEngine.js:472,
   "if (!action) return null;"). Conviction score (fed partly by consumption
   point #1 above, and independently capped by sparse canonical-event coverage)
   never reached the Buy threshold in any live test this phase (ceiling: 69,
   threshold: 72) — so Recommendation creation was never reached this session.

↓ Order
   portfolioEngineService.placeOrder() (consumption point #3) is a hard
   dependency — confirmed it throws immediately without a Finnhub quote.
   This is also the path that would populate held positions to trigger the
   concentration-override REDUCE rule as a threshold-independent alternative.

↓ Outcome
   outcomeGradingService.gradePendingOutcomes() (consumption point #4) needs
   a live quote for windowEndPrice; without one, the outcome is created but
   marked UNGRADEABLE — never silently treated as a success.

↓ Benchmark
   performanceEngineService.computePerformanceMetrics() does NOT itself call
   Finnhub (it uses the keyless Yahoo Finance path, confirmed working) — but
   it is only ever invoked after a real windowEndPrice exists, which itself
   requires Finnhub. So Benchmark is indirectly gated on Finnhub through
   Outcome, not directly dependent on it.

↓ READY Observation
   datasetValidatorService requires a real Outcome with a real benchmark to
   ever classify a row READY. Indirectly blocked by Finnhub through the
   entire chain above.
```

**Stages that depend on `FINNHUB_API_KEY`, directly or indirectly: Quote (direct), Recommendation (indirect, via scoring), Order (direct, hard-blocking), Outcome (direct), Benchmark (indirect, via Outcome), READY Observation (indirect, via the whole chain).** Only the Yahoo-Finance-based Benchmark computation itself is not directly coupled to Finnhub — everything upstream of it is.
