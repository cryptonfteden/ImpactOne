# Code Review Findings

## 1. High: Quote unit mismatch breaks legacy portfolio math and UI labels

- Locations:
  - [backend/services/finnhubService.js](../../../backend/services/finnhubService.js#L230)
  - [frontend/src/hooks/useVirtualPortfolio.js](../../../frontend/src/hooks/useVirtualPortfolio.js#L122)
  - `frontend/src/components/WatchlistTable.jsx` (historical path; file no longer exists)
- Issue:
  - `finnhubService` now returns both `change` as the absolute dollar move and `changePercent` as the real percentage move, but the legacy virtual portfolio still computes daily return from `quote.change / 100`, and the watchlist table still renders `change` with a `%` suffix.
- Impact:
  - Daily P/L is mathematically wrong for most prices, and the UI misrepresents absolute moves as percentages.
- Recommended fix:
  - Use `changePercent` anywhere a percentage is required, keep `change` only for absolute-dollar displays, and add a regression test for the legacy portfolio calculation.

## 2. Medium: Watchlist route serializes provider calls and accepts empty symbols

- Locations:
  - [backend/controllers/watchlistController.js](../../../backend/controllers/watchlistController.js#L19)
  - [backend/controllers/watchlistController.js](../../../backend/controllers/watchlistController.js#L22)
  - [backend/controllers/dailyBriefController.js](../../../backend/controllers/dailyBriefController.js#L4)
  - [backend/controllers/autonomousMarketController.js](../../../backend/controllers/autonomousMarketController.js#L3)
- Issue:
  - The watchlist controller hand-rolls CSV parsing, does not filter out empty entries, and then awaits `getQuote` plus `analyzeTicker` sequentially for each symbol.
  - The CSV parsing helper is duplicated in multiple controllers, but only the daily-brief and autonomous-market controllers filter empties consistently.
- Impact:
  - A malformed query like `symbols=AAPL,,TSLA` can silently produce a phantom default row, and the default watchlist path scales linearly with network latency because the provider calls are serialized.
- Recommended fix:
  - Move CSV normalization into a shared helper, filter empty tokens everywhere, and process watchlist symbols with parallel or bounded-concurrency fan-out.

## 3. Medium: Missing tests for the changed quote contract and legacy consumers

- Locations:
  - [backend/services/finnhubService.js](../../../backend/services/finnhubService.js#L230)
  - [frontend/src/hooks/useVirtualPortfolio.js](../../../frontend/src/hooks/useVirtualPortfolio.js#L122)
  - [backend/controllers/watchlistController.js](../../../backend/controllers/watchlistController.js#L17)
- Issue:
  - There are backend tests for the portfolio engine and archive flow, but no tests cover the frontend legacy portfolio math or the watchlist CSV normalization path.
- Impact:
  - The `change` versus `changePercent` mismatch and empty-symbol behavior can regress silently.
- Recommended fix:
  - Add a unit test for `useVirtualPortfolio` that asserts daily return is based on percentage change, and add controller coverage for malformed watchlist queries.
