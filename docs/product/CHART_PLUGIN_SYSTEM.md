# Chart Plugin System — Phase X4

Architecture only, per the mission's explicit constraint: **no Fibonacci implementation**, no indicator math, no drawing tool. This is the real, tested plumbing a future implementation plugs into — extending `overlayRegistry.js` (Phase X2/X3), unchanged.

## `frontend/src/components/chart/managers.js`

Four classes, composed by one entry point:

- **`DrawingManager`** — owns the set of active, user-created drawings on the chart's dedicated drawing canvas layer (`AdvancedChart.jsx`'s `advanced-chart__layer--drawing`). `addDrawing(toolId, data)` / `removeDrawing(id)` / `clear()` / `list()`. A drawing's `toolId` must already be a real, registered `DRAWING`-category entry in `overlayRegistry.js` — this manager never invents a drawing type of its own.
- **`OverlayManager`** — tracks which registered overlays (indicators/signals — never drawings) are currently active on a chart instance. `activate(overlayId)` throws on an unknown id (`Unknown overlay: X`) and, separately, on a real-but-not-yet-implemented one (`"X" is architecture-only and not yet implemented` — this is exactly how `FIBONACCI` and `SMA` behave today). Hot-pluggable: activating an overlay registered moments ago (`implemented: true`) works immediately, no chart restart.
- **`IndicatorManager`** — a real, hot-pluggable registry specifically for indicator-category overlays. `registerIndicatorProfile(id, { compute, render })` rejects a profile missing either function (`must provide real compute() and render() functions`) — never accepts a fake indicator. Kept distinct from `OverlayManager` so a future "Indicators" panel can list exactly the computable, chart-math overlays.
- **`ToolManager`** — the top-level coordinator a chart instance actually talks to; composes the three managers above (`.drawings`, `.overlays`, `.indicators`). `loadCustomProfile(id, profile)` is the real hot-plug entry point: a future indicator implementation (Fibonacci or otherwise, once CEO-approved per `X3_COMPLETION_REPORT.md`'s Part 6) calls this once to become immediately usable, with no chart code changes.

## Wiring

`AdvancedChart.jsx` creates one `ToolManager` instance per chart via `useRef`, initialized once on first render (`toolManagerRef.current = new ToolManager(OVERLAY_REGISTRY)`), proving the manager stack initializes cleanly against the chart's real, existing `overlayRegistry.js` registry. No overlay is activated by default — this is infrastructure verification, not a UI feature.

## Testing

- `managers.test.js` (12 tests): every class's real behavior — add/remove/clear drawings, unknown vs. architecture-only overlay rejection, hot-plug activation, indicator profile validation and unregistration, and `ToolManager`'s composition + `loadCustomProfile` hot-plug path.
