# Fibonacci Integration Plan — Phase X5

Documentation only, per this phase's explicit constraint. No calculation, no rendering, no new files with compute logic. This plan connects two already-real, already-tested architecture pieces — `fibonacciProfileSchema.js` (Phase X3, the profile shape contract) and `managers.js` (Phase X4, the chart plugin system) — into one concrete integration point, so a future CEO-approved implementation has an exact list of what to fill in, not a redesign to perform.

## Where it plugs in, precisely

1. **Profile shape** — already defined: `fibonacciProfileSchema.js`'s `FibonacciProfile` shape (`id`, `name`, `levels[]`, `extensions[]`, `retracements[]`, each level carrying `ratio`/`label`/`color`/`lineStyle`/`visible`). `isValidFibonacciProfile()` already validates it. **No change needed here.**

2. **Registration** — the future implementation calls `ToolManager.loadCustomProfile(id, { compute, render })` (`managers.js`, Phase X4), which internally calls `IndicatorManager.registerIndicatorProfile`. This is the real, already-tested hot-plug entry point — it requires exactly two functions:
   - `compute(bars, profileLevels)` → real level price values for the visible chart range, derived from the actual high/low of the selected swing (not implemented anywhere today — this is the one genuinely new function the future work must write).
   - `render(ctx, levels, canvasGeometry)` → draws the computed levels onto `AdvancedChart.jsx`'s existing `advanced-chart__layer--drawing` canvas (the same layer `DrawingManager` already targets).

3. **Activation** — once registered, `OverlayManager.activate("FIBONACCI")` (`managers.js`) will succeed instead of throwing `"architecture-only and not yet implemented"` — the overlay registry entry (`overlayRegistry.js`'s `FIBONACCI` row) needs exactly one field flipped: `implemented: false` → `true`. Nothing else in `overlayRegistry.js` changes.

4. **Drawing the swing** — a Fibonacci retracement/extension needs a user-selected high/low anchor pair on the chart. This is a `DrawingManager.addDrawing("FIBONACCI", { highPoint, lowPoint })` call — `DrawingManager` already accepts any registered `DRAWING`-category `toolId` without modification, and `overlayRegistry.js` already lists `FIBONACCI` under `OVERLAY_CATEGORY.DRAWING` (`implemented: false`) — the same single boolean flip from step 3 covers this too; no new registry entry needed.

5. **Multi-profile support** — already real in the architecture: `IndicatorManager.registerIndicatorProfile`/`.unregister`/`.list()` support multiple concurrent profiles by `id`; a future "Standard" vs. "Extended" Fibonacci profile switcher UI reads `IndicatorManager.list()` directly. **No change needed here.**

## What the future implementation must actually write (and only this)

- `computeFibonacciLevels(highPrice, lowPrice, levels)` — the real ratio math (`low + (high - low) * ratio` for retracements, the equivalent extension formula for extensions). This is the only genuinely new calculation in the entire integration.
- `renderFibonacciLevels(ctx, levels, geometry)` — canvas draw calls using the chart's existing coordinate-mapping helpers already used by `AdvancedChart.jsx`'s crosshair/gridline rendering (not duplicated — reused).
- A UI affordance to start/end a Fibonacci drawing (two clicks on the chart, or a drag) — the one piece with no existing precedent to reuse, since no other drawing tool is implemented yet either.

## What must not be touched

`overlayRegistry.js`'s structure, `managers.js`'s four classes, and `fibonacciProfileSchema.js`'s shape all stay exactly as they are — this integration is additive (two boolean flips, two new functions, one registration call), not a redesign of any of the three.

## Blocked on

Unchanged from Phase X3: CEO approval, pending receipt of TradingView settings to match a known-good reference configuration (`FIBONACCI_EXTENSION_STATUS.blockedOn`, `fibonacciProfileSchema.js`).
