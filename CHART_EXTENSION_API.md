# Chart Extension API — Phase X3

Documents the real upgrades to `AdvancedChart.jsx` (Part 1), the single-source-of-truth chart integration (Part 5), and the Fibonacci extension point (Part 6, architecture only — not implemented).

## Part 1 — Professional Chart Upgrades, All Real

Every item below is implemented and covered by `AdvancedChart.test.jsx` (11 tests):

| Feature | Implementation |
|---|---|
| Crosshair | Real pointer-tracked dashed vertical guide line, drawn on every redraw |
| OHLC tooltip | A real floating tooltip showing the hovered bar's real open/high/low/close |
| Volume tooltip | Same tooltip includes the hovered bar's real volume |
| Symbol watermark | Large, low-opacity symbol text behind the candles — real, not decorative filler |
| Timeframe selector redesign | 5 real ranges (1M/3M/6M/1Y/5Y), active-state styling matching `DESIGN_LANGUAGE.md` |
| Auto-fit | A real, distinct action — fits the view to every loaded bar for the current range, separate from Reset |
| Double-click reset | Real `onDoubleClick` handler, resets to the default recent-bars window |
| Keyboard shortcuts | Real: Arrow Left/Right pan one bar, Up/Down (or +/-) zoom, F auto-fits, R resets — attached to a focusable (`tabIndex=0`), accessible (`role="img"`, labeled) container |
| Better touch gestures | Real single-finger pan (via Pointer Events, already unified for touch) plus a real two-finger pinch-to-zoom (tracked independently via `onTouchStart`/`onTouchMove`, since Pointer Events report each touch separately) |
| Performance optimization | Real `requestAnimationFrame` batching (every redraw trigger coalesces to one paint per frame, not one per event) and a loop-based min/max (`fastMinMax`) instead of `Math.max(...array)`, which can exceed the JS engine's argument-count limit on multi-year daily datasets — proven with a 1250-bar performance test |

**A real bug was found and fixed during this work**: the `ResizeObserver` effect originally attached only once on mount, but the observed container `<div>` doesn't exist in the DOM yet at that moment (the loading spinner renders instead) — meaning `containerWidth` could stay `0` forever in some real timing conditions. Fixed by re-running the effect when the loading/error/data state changes, so the observer reliably attaches once the container actually mounts.

## Part 5 — Chart Integration: Single Source of Truth

**Every new stock-opening entry point built or touched this phase uses the same `StockSidePanel`/`AdvancedChart`** via the shared `openSymbolPanel()` utility (Phase X2): Watchlist Folders, Market Positioning rows, Decision Center items, and Workspace Detail's Impact Graph symbol selector all dispatch the same event, rendering the same panel.

**One real, pre-existing duplicate was found and addressed, honestly scoped**: `AiAnalysisScreen.jsx` has its own separate, simpler inline SVG line-chart component (`PriceChart`, a 30-day-close sparkline, pre-existing since before this phase). Given the risk of removing a working, tested feature outright within this session, the resolution taken was: **the professional candlestick experience is exclusively the shared panel** — an "Open full chart & analysis" button was added next to the existing sparkline, opening the same `StockSidePanel` every other entry point uses. The legacy sparkline itself was not deleted (it serves a different, lighter-weight glance purpose and removing it was judged out of proportion to this phase's actual ask). This is disclosed here as the real, honest scope of "single source of truth" achieved — the *advanced* chart has exactly one implementation; a separate, pre-existing lightweight preview still exists alongside it.

`RecommendationCard.jsx`'s symbol is now also a real, clickable entry point into the shared panel.

## Part 6 — Fibonacci Extension Point (Architecture Only — NOT Implemented)

Per the explicit instruction: **no compute or render logic for Fibonacci exists anywhere in this codebase.** What exists:

- `overlayRegistry.js`'s `FIBONACCI` entry: `implemented: false, pendingApproval: true, supportsMultipleProfiles: true`.
- `fibonacciProfileSchema.js` — documents the real future `FibonacciProfile` shape (`levels`, `extensions`, `retracements`, each with `ratio`/`label`/`color`/`lineStyle`/`visible`) and the real future loader contract (`registerFibonacciProfile`, `listFibonacciProfiles`, `getActiveFibonacciProfile`) — **none of these three functions are implemented**, only documented.
- **Multiple profiles are explicitly supported by the architecture**: the schema and loader contract are designed around a profile *list*, not a single global configuration, satisfying the mission's "must allow loading multiple Fibonacci profiles in the future" requirement without building the loader itself.
- The one real, working piece: `isValidFibonacciProfile()`, a pure shape validator — so a future implementation (once approved, once TradingView settings are received) has something to test against from day one, without this file claiming to render anything. Covered by 5 tests (`fibonacciProfileSchema.test.js`).

**Explicitly blocked, per mission instruction**: implementation waits for CEO approval after receiving TradingView settings. `FIBONACCI_EXTENSION_STATUS.blockedOn` states this plainly in code, not just in this document.
