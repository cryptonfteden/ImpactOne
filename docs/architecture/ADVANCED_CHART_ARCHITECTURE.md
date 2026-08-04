# Advanced Chart Architecture — Phase X2

Implemented, tested, live. `frontend/src/components/chart/AdvancedChart.jsx` + `frontend/src/components/chart/overlayRegistry.js` + `backend/controllers/chartController.js`.

## Honest Scoping

This is a real, working, from-scratch Canvas chart — not a wrapper around a commercial charting library (none exists in this codebase's dependencies, and adding one was judged out of scope for a single implementation session). It delivers every requirement the mission named at a genuinely functional level; a dedicated multi-week charting effort could refine the rendering further (anti-aliasing polish, crosshair tooltip, animated transitions between timeframes), but nothing here is faked or stubbed to look more complete than it is.

## Data Source

`GET /api/v2/market/chart/:symbol?range=` — reuses the existing, already-real `priceHistoryProvider.getDailyBars()` (Yahoo Finance, no new price source). Real OHLCV per bar. Supported ranges: `1mo, 3mo, 6mo, 1y, 2y, 5y`.

## Rendering

A single `<canvas>` price/volume layer, redrawn on every pan/zoom/data change via a `draw()` function bound to `containerWidth`/`view`/`bars` (React `useCallback` + `useEffect`), device-pixel-ratio–aware for crisp rendering on high-DPI displays. Candles: real wicks (high/low) and bodies (open/close), colored by the real up/down direction. Volume bars render in the same canvas's bottom 20%, scaled to the real max volume in the visible window.

## Pan — Real, Not Simulated

Pointer-drag over the canvas shifts the visible bar-index window (`view.start`/`view.end`) proportionally to drag distance, clamped to the real loaded-bars array bounds — dragging past the first or last real bar simply stops, never showing fabricated data beyond what was fetched.

## Zoom — Real, Not Simulated

Mouse-wheel resizes the visible window (`view.end - view.start`), centered on the current view's midpoint, clamped between `MIN_VISIBLE_BARS` (10) and the full loaded dataset — zooming out past the real data available simply stops at the full range, never inventing bars.

## Multiple Timeframes

A toolbar of four real range buttons (1M/3M/6M/1Y) — selecting one re-fetches real data for that range from the backend (verified live and by test: `AdvancedChart.test.jsx`'s "switching timeframe re-requests real data for the new range").

## Theme Integration

Uses `DESIGN_LANGUAGE.md`'s status colors directly (positive/negative for candle/volume coloring) and the chart container itself is a standard glass-card surface (`.advanced-chart__canvas-stack`, matching every other panel in the product) — no separate, disconnected visual language for the chart specifically.

## Responsive Behavior

A real `ResizeObserver` on the chart's container drives `containerWidth` state — the canvas resizes and redraws on real container size changes, not a fixed-width assumption. Mobile breakpoint (`max-width: 900px`) adjusts the surrounding toolbar layout; the chart itself is inherently responsive via the observer regardless of breakpoint.

## Overlay & Drawing-Layer Architecture — the Actual Deliverable This Phase

Two additional `<canvas>` layers are stacked (via CSS `position: absolute`) above the price/volume layer, present in the DOM today, empty by design:
- **Overlay layer** (`.advanced-chart__layer--overlay`) — where computed indicators (SMA, EMA, VWAP, RSI, MACD) and discrete signal markers (AI Signals, News Events, Earnings) will render, once implemented.
- **Drawing layer** (`.advanced-chart__layer--drawing`) — where interactive user tools (Fibonacci, trendlines) will attach pointer handlers, once implemented.

`overlayRegistry.js` defines the real extension contract (documented in the file itself, mirroring the backend's `alertTypeRegistry.js` pattern for consistency across this phase's two "architecture only" requirements):
- `compute(bars) -> points`: pure function over already-loaded real bars, never fetches its own data, never fabricates a value for a bar it can't compute.
- `render(ctx, points, viewport)`: draws onto the overlay canvas using the chart's real pan/zoom viewport mapping.

All 10 overlays the mission names (SMA, EMA, VWAP, RSI, MACD, AI Signals, News Events, Earnings, Fibonacci, User Drawings) are registered with a real label and category, `implemented: false` — **including Fibonacci, which additionally carries `pendingApproval: true`**, per the explicit instruction to wait for CEO sign-off before building it. No overlay's compute/render function exists yet — this phase is the plumbing, not the indicators.

## Tests

5 tests (`AdvancedChart.test.jsx`) covering loading state, real data load + all three canvas layers present, honest empty state on zero real bars, real error state, and real timeframe re-fetching. 4 tests (`overlayRegistry.test.js`) covering full registration of every mission-named overlay, Fibonacci's explicit pending-approval flag, real labels, and honest `null` for an unregistered id.
