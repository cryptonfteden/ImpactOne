# Dataset Population Report — Phase D1.6

**Generated:** 2026-07-23, from live invocations against the real dev database and real external network calls (not simulated).

## 1. Why the live engine produces zero recommendations — evidence per cause

| Candidate cause | Verdict | Evidence |
|---|---|---|
| **Market conditions** | Not the cause | `macroRegime` computed live (`risk-off`, high inflation pressure) — a real, plausible regime, not a degenerate/error value. Market conditions being unfavorable is exactly the kind of real signal the engine is supposed to act on (e.g. via REDUCE), not something blocking it structurally. |
| **Missing provider configuration / lack of market-news inputs** | **Confirmed, primary cause of the scoring ceiling** | Live-triggered `providerScheduler.runNow()` against all 15 registered providers: 14 of 15 returned `itemsFetched: 0` (several in <1ms, i.e. no real network attempt at all — stub/unconfigured); `reutersBloombergWire` did make a real ~1.9s network call but still returned 0 items. Only 1 `CanonicalEvent` exists in the entire database. A 30-symbol live watchlist scan shows conviction scores cluster into exactly 3 discrete bands (69/68/58) tied to which broad sector a symbol falls in, with a hard ceiling of **69** — never reaching the Buy threshold of 72. This is the direct, measurable consequence of an almost-empty canonical event feed: with no real matched events, the scoring formula falls back to a small number of static, sector-level bands instead of real per-symbol differentiation. |
| **Threshold configuration** | Not the cause | `choosePortfolioAction()`'s bands (Buy ≥86, Accumulate ≥72, Wait 55–71, Reduce 38–54, Exit <38) are hardcoded, not environment-configurable — confirmed no `*_THRESHOLD` env var exists anywhere in `backend/`. No misconfiguration was found; the thresholds are simply not being reached given the data available. |
| **Missing API keys** | **Confirmed, primary and singular blocker across multiple stages, not just scoring** | `backend/.env` has no `FINNHUB_API_KEY`, `NEWS_API_KEY`, `POLYGON_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` set. Directly confirmed live: `finnhubService.getQuote('AAPL')` throws `"FINNHUB_API_KEY is missing."` This single missing key blocks **three independent stages**, not one: (a) `rankingItem.currentPrice` enrichment (explains the `currentPrice: null` seen in every ranking), (b) `portfolioEngineService.placeOrder()` — cannot execute any paper trade without a live quote, so the portfolio cannot even be populated to test the Reduce/Exit or concentration-override (`sectorWeightPct ≥ 35%`) action paths, and (c) `outcomeGradingService`'s `windowEndPrice` lookup at grading time (the D1/D1.5-documented `MISSING_BENCHMARK`/`UNGRADEABLE` root cause). |
| **Lack of market/news inputs** | Confirmed — same evidence as row 2 | Same finding: real market-data/news provider connectivity (Finnhub for quotes, a news/wire provider for events) is what's absent, not network access in general (Yahoo Finance for historical bars is confirmed reachable and working — see `OPERATIONAL_DATASET_REPORT.md`, D1.5). |

**Conclusion: the missing `FINNHUB_API_KEY` is the single highest-leverage blocker.** It independently caps scoring, blocks portfolio population (which would otherwise unlock a second, independent path to real recommendations via REDUCE/concentration), and blocks grading. Fixing just this one key would very likely resolve most of the chain.

## 2. Operational Readiness — External Dependency Table

| Dependency | Configured | Reachable | Working | Blocking |
|---|---|---|---|---|
| PostgreSQL (`DATABASE_URL`) | ✅ | ✅ | ✅ | No |
| Yahoo Finance historical bars (`priceHistoryProvider`, no key needed) | N/A (keyless) | ✅ (confirmed: 22 real SPY bars) | ✅ | No |
| Finnhub live quotes (`FINNHUB_API_KEY`) | ❌ **Missing** | Untested (fails before any network call — key check is client-side) | ❌ | **Yes — blocks quote enrichment, order placement, and grading** |
| News/wire provider (`NEWS_API_KEY` / `reutersBloombergWire`) | ❌ **Missing** | ✅ reachable (made a real request) | ❌ (0 items returned) | **Yes — blocks canonical-event population, which caps conviction scoring** |
| 13 other registered providers (SEC, Reddit, X, Telegram, Polymarket, Fed, ECB, Treasury, NASA, FDA, patent, earnings, options flow, coinglass, spdr, zacks, tipranks, finviz, cftcCot) | Mostly ❌ (no keys where required) | Mostly untested — sub-millisecond runtimes indicate most did not attempt a real network call | ❌ (0 items across the board) | Contributing, not primary |
| OpenAI/Anthropic (LLM for committee synthesis) | ❌ **Missing** | Untested | Degrades gracefully to null (existing best-effort design, unchanged) | Secondary — only matters once an action is already triggered |

## 3. Dataset Population Plan — Shortest Real Path

**Preferred path (requires one external action outside this session's control):** add a real `FINNHUB_API_KEY` (a free-tier key is sufficient for quotes) to `backend/.env`. This alone would:
1. Populate `rankingItem.currentPrice` for every symbol (currently null).
2. Unblock `portfolioEngineService.placeOrder()`, allowing a small number of concentrated paper trades (e.g. 10–20 tech-sector BUY orders) to push `sectorWeightPct` past the existing, unmodified 35% concentration-override threshold — which triggers a real `REDUCE` recommendation per held symbol regardless of the conviction-score ceiling. This is the fastest realistic route to ≥20 recommendations without touching any recommendation logic.
3. Unblock real outcome grading (live `windowEndPrice` lookups), which is also required for step 4 (READY certification) — the D1/D1.5-identified `MISSING_BENCHMARK`/`UNGRADEABLE` chain traces to this same key.

**Secondary path (also requires an external action):** add a working news/wire provider key so real canonical events populate and the conviction-score ceiling of 69 is no longer structural — would unlock the ordinary BUY/Accumulate path without needing any portfolio positions at all.

**Why real recommendations could not be generated this session:** both paths above require a credential this sandboxed environment does not have and that I cannot obtain or fabricate. No code, threshold, or logic change would substitute for it without violating the mission's "never fabricate" principle (D1/D1.5's governing rule) — synthesizing a fake quote or fake event to force a recommendation through would produce exactly the kind of untrustworthy data this whole phase exists to prevent. This is an honest, evidenced dead end for *this specific session*, not a design flaw.

## Even if the key were supplied right now: the 24-hour grading window

`outcomeGradingService`'s grading window (`GRADING_WINDOW_MS`, D1) is a hardcoded 24 hours from prediction time — unmodified, by design (unchanged this phase, per the "no recommendation/lifecycle logic changes" rule). Even in a session where new recommendations were successfully generated, their `WorldMemoryPrediction` rows would not become eligible for grading until 24 hours later. **No session, however well-resourced, can walk a brand-new recommendation all the way to a graded, benchmarked, certified READY observation within a single sitting** — this is a real, structural timing constraint, not a data or configuration gap. See `READY_OBSERVATION_REPORT.md` for how this bounds what could be certified this session.
