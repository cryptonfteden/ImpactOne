# Market Positioning Spec — Phase X2

Implemented, tested, live-real (not a proposal). `backend/services/marketPositioningService.js` + `backend/controllers/marketPositioningController.js` + `frontend/src/screens/MarketPositioningScreen.jsx`.

## What This Is Not

Not "highest short interest," and — critically — **short interest, long interest, and float have no real data source anywhere in this codebase**, confirmed by direct research before writing any code (grep across every provider, `finnhubService.js`, and `.env.example` — zero hits). Rather than fabricate these three inputs, they are explicitly, permanently listed in every API response as `unavailableFactors`, each with a real reason, and excluded from the ranking math entirely. This is not a temporary gap papered over — it's the honest, correct behavior this whole engagement's "never fabricate" discipline requires.

## Real Inputs Actually Used

| Input | Source | How |
|---|---|---|
| Market cap | Finnhub `/stock/metric` or `/stock/profile2`, via existing `finnhubService.getQuote()` | Already-real, unchanged |
| Average daily volume | Existing `priceHistoryProvider.getDailyBars()` | Mean of real per-bar volume over `AVG_VOLUME_LOOKBACK_DAYS` (config, default 20) |
| Relative volume | Today's Finnhub volume ÷ the real N-day average above | Computed, never a separate vendor call |
| Liquidity | Average daily volume × price | A real, computed **proxy** (average dollar volume) — explicitly documented as a proxy, not claimed as true liquidity (bid/ask spread and order-book depth are genuinely unavailable, no source exists) |
| Momentum | % close-price change over `MOMENTUM_LOOKBACK_DAYS` (config, default 10) real historical bars | Computed |

## Universe Filtering — Very Small Companies Excluded

Two configurable, exposed constants gate universe eligibility (`marketPositioningService.CONFIG`):
- `MIN_MARKET_CAP_USD` (default $2B)
- `MIN_AVG_DAILY_DOLLAR_VOLUME` (default $5M/day)

A symbol failing either check is placed in `excludedFromUniverse` with a real, specific reason (which check failed, or that the underlying quote/history data itself couldn't be fetched) — never silently dropped, never scored zero.

## Ranking Logic — Combining Multiple Real Factors

**A real design bug was found and fixed by this phase's own test suite before shipping**: an earlier version let relative volume and liquidity — both inherently non-directional signals (high volume says nothing about *which way* pressure runs on its own) — contribute directly to the LONG/SHORT sign, which could let a highly liquid, high-volume stock get mis-ranked LONG_PRESSURE despite genuinely negative momentum. Fixed: **only real, signed momentum determines direction**; relative volume and liquidity only scale the *magnitude/confidence* of whichever direction momentum already established. Weights (exposed, `CONFIG.WEIGHTS`): momentum 0.45, relativeVolume 0.35, liquidity 0.2 — renormalized honestly across whichever of the magnitude factors are actually available for a given symbol, never treating a missing one as zero.

## API

`GET /api/v2/market/positioning?symbols=AAPL,NVDA,...` → `{ generatedAt, config, unavailableFactors, longPressure[], shortPressure[], excludedFromUniverse[], scoredButUndirected[] }`. Every entry in `longPressure`/`shortPressure` carries its real underlying numbers (marketCap, momentumPct, relativeVolume, etc.) alongside the computed `pressureScore`/`direction` — nothing is presented as a bare score without its real inputs visible.

## Tests

6 tests (`marketPositioningService.test.js`): universe-size validation, small-cap exclusion with a real reason, real positive-momentum → LONG_PRESSURE, real negative-momentum → SHORT_PRESSURE (the test that caught the directional bug above), the permanent unavailable-factors disclosure, and null-direction behavior when zero real signal exists.
