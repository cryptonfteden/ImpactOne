# Chart Plugin Roadmap — Phase X7, Part 6

Architecture only, per this phase's explicit constraint. Nothing computed, nothing rendered. Extends `CHART_PLUGIN_SYSTEM.md` (Phase X4's `managers.js` — `DrawingManager`/`OverlayManager`/`IndicatorManager`/`ToolManager`) and `overlayRegistry.js` (Phase X2), neither of which changes shape this phase — five new named entries were added to the existing registry, using the exact same `{ label, category, implemented: false }` shape every other placeholder overlay already uses.

## The five plugins, and which existing contract each will need

| Plugin | Registry category | Real contract it will implement (already defined in `overlayRegistry.js`/`managers.js`, unchanged) |
|---|---|---|
| **Custom Fibonacci** | `DRAWING` | Already fully planned in `FIBONACCI_INTEGRATION_PLAN.md` (Phase X5) — unchanged, still blocked on CEO approval + TradingView configuration, per this phase's explicit constraint. |
| **Trend Lines** | `DRAWING` | `DrawingManager.addDrawing("TREND_LINES", { points: [p1, p2] })` — a real two-point anchor, same shape `DrawingManager` already accepts for any `DRAWING`-category tool. `render(ctx, points, viewport)` draws one line segment; no `compute()` needed (a trend line is user-anchored, not derived from OHLCV). |
| **Channels** | `DRAWING` | A real extension of Trend Lines, not a separate mechanism: two parallel trend lines, the second anchored by a real perpendicular offset from a third user-clicked point. `DrawingManager.addDrawing("CHANNELS", { points: [p1, p2, p3] })` — three anchors, same manager, no new class. |
| **Supply/Demand Zones** | `DRAWING` | A real rectangle anchored to two real OHLCV bar indices + a price range (the zone's top/bottom), not two free pixel points — the one plugin here needing the drawing's `data` shape to reference real bar data (`{ startIndex, endIndex, priceHigh, priceLow }`) rather than raw canvas coordinates, so the zone stays correctly anchored to its bars when the user pans/zooms. |
| **Anchored VWAP** | `INDICATOR` | The one plugin in this list that's a real computed indicator, not a drawing — `IndicatorManager.registerIndicatorProfile("ANCHORED_VWAP", { compute, render })`. `compute(bars, anchorBarIndex)` is real, well-defined math (cumulative price×volume ÷ cumulative volume from a real user-chosen anchor bar forward) — the anchor point itself is a real user interaction (a single bar click), making this indicator genuinely hybrid: computed like an indicator, anchored like a drawing. |
| **Risk/Reward** | `DRAWING` | A real three-level annotation (entry, stop, target — each a real user-set price), rendered as three horizontal lines plus the real computed ratio between them. The ratio computation (`(target - entry) / (entry - stop)`) is trivial real arithmetic over three real user inputs, not a modeled prediction — closer to a drawing’s reach than an indicator's. |

## What none of these plugins need from the existing architecture

`ToolManager`, `DrawingManager`, `OverlayManager`, and `IndicatorManager` (Phase X4) require **zero changes** to support any of the five — every one fits an already-real contract:

- Anchored-to-points-only (Trend Lines, Channels, Risk/Reward) → `DrawingManager.addDrawing`, unchanged.
- Anchored-to-bar-data (Supply/Demand) → `DrawingManager.addDrawing` with a bar-referencing `data` shape instead of raw pixels — a convention for the future implementation to follow, not a new manager method.
- Computed-from-OHLCV (Anchored VWAP) → `IndicatorManager.registerIndicatorProfile` / `ToolManager.loadCustomProfile`, the exact same hot-plug entry point already proven working by `managers.test.js`.

This is the direct payoff of Phase X4's original "architecture, not implementation" investment: five new real trading tools, and the extension point already handles all of them without modification.

## What must not be built yet

No `compute()`, no `render()`, no pointer-event handler for any of the five. `overlayRegistry.js`'s five new entries all carry `implemented: false` — flipping any one to `true` without a real, tested compute/render pair would be the exact "architecture only, nothing implemented" violation this phase's mission explicitly forbids.
