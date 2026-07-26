// Phase X2 — Advanced Chart overlay/drawing-layer architecture. This is
// the extension point the mission asks for — NOT an implementation of any
// specific indicator. Fibonacci is explicitly excluded pending CEO
// approval; every other overlay named in the mission is registered here
// as a documented placeholder with no compute/render function, exactly
// mirroring the backend's alertTypeRegistry.js pattern for consistency
// across this phase's two "architecture only" requirements.
//
// An overlay's real contract, once implemented:
//   compute(bars) -> Array<{ index, value }> | Array<{ index, values: {} }>
//     Pure function over the real OHLCV bars already loaded into the
//     chart — never fetches its own data, never fabricates a value for a
//     bar it can't compute (e.g. the first N-1 bars of an N-period SMA
//     return no point for those bars, not a zero/duplicate).
//   render(ctx, points, viewport) -> void
//     Draws onto the overlay canvas layer using the chart's current
//     pan/zoom viewport mapping (see AdvancedChart.jsx's
//     `viewportToCanvasX/Y` helpers) — never manages its own scroll/zoom
//     state.
//
// A drawing tool's real contract, once implemented:
//   onPointerDown/onPointerMove/onPointerUp(event, viewport) -> void
//     Interactive, stateful, operates on the separate user-drawing canvas
//     layer (never the price/volume/overlay layers) so drawings can be
//     cleared/hidden independently of indicator overlays.

export const OVERLAY_CATEGORY = {
  INDICATOR: "INDICATOR", // computed from OHLCV, drawn as a line/band (SMA, EMA, VWAP, RSI, MACD)
  SIGNAL: "SIGNAL", // discrete markers at specific bars (AI Signals, News Events, Earnings)
  DRAWING: "DRAWING", // interactive, user-created (Fibonacci, trendlines, etc.)
};

export const OVERLAY_REGISTRY = {
  SMA: { label: "Simple Moving Average", category: OVERLAY_CATEGORY.INDICATOR, implemented: false, pane: "price" },
  EMA: { label: "Exponential Moving Average", category: OVERLAY_CATEGORY.INDICATOR, implemented: false, pane: "price" },
  VWAP: { label: "Volume Weighted Average Price", category: OVERLAY_CATEGORY.INDICATOR, implemented: false, pane: "price" },
  RSI: { label: "Relative Strength Index", category: OVERLAY_CATEGORY.INDICATOR, implemented: false, pane: "separate" },
  MACD: { label: "MACD", category: OVERLAY_CATEGORY.INDICATOR, implemented: false, pane: "separate" },
  AI_SIGNALS: { label: "AI Signals", category: OVERLAY_CATEGORY.SIGNAL, implemented: false, pane: "price", dataDependency: "Would mark bars where a real Recommendation was generated for this symbol (autonomousRecommendationRepository), not fabricated." },
  NEWS_EVENTS: { label: "News Events", category: OVERLAY_CATEGORY.SIGNAL, implemented: false, pane: "price", dataDependency: "Would mark bars aligned to real CanonicalEvent publishedAt timestamps for this symbol." },
  EARNINGS: { label: "Earnings", category: OVERLAY_CATEGORY.SIGNAL, implemented: false, pane: "price", dataDependency: "Would read the real earningsProvider.js calendar data, already ingested." },
  // Explicitly excluded pending CEO approval per this phase's mission —
  // registered so the architecture is provably ready, never wired to a
  // compute/render implementation.
  FIBONACCI: {
    label: "Fibonacci Retracement",
    category: OVERLAY_CATEGORY.DRAWING,
    implemented: false,
    pendingApproval: true,
    supportsMultipleProfiles: true,
    profileSchema: "see fibonacciProfileSchema.js — levels/labels/colors/lineStyles/visibility/extensions/retracements, none implemented",
  },
  USER_DRAWING: { label: "User Drawings (trendlines, shapes)", category: OVERLAY_CATEGORY.DRAWING, implemented: false },
  // Phase X7 — Part 6, Chart Ecosystem. Named, real registry entries for
  // every plugin the mission lists — architecture only, nothing
  // implemented. Each already fits the existing DrawingManager/
  // IndicatorManager contract documented above without any change to
  // either class; see CHART_PLUGIN_ROADMAP.md for the specific compute/
  // render shape each one will need.
  TREND_LINES: { label: "Trend Lines", category: OVERLAY_CATEGORY.DRAWING, implemented: false },
  CHANNELS: { label: "Channels", category: OVERLAY_CATEGORY.DRAWING, implemented: false },
  SUPPLY_DEMAND: { label: "Supply / Demand Zones", category: OVERLAY_CATEGORY.DRAWING, implemented: false },
  ANCHORED_VWAP: { label: "Anchored VWAP", category: OVERLAY_CATEGORY.INDICATOR, implemented: false, pane: "price" },
  RISK_REWARD: { label: "Risk / Reward", category: OVERLAY_CATEGORY.DRAWING, implemented: false },
};

export function getOverlay(id) {
  return OVERLAY_REGISTRY[id] || null;
}

export function listOverlays() {
  return Object.entries(OVERLAY_REGISTRY).map(([id, overlay]) => ({ id, ...overlay }));
}

export function isOverlayReady(id) {
  const overlay = getOverlay(id);
  return Boolean(overlay?.implemented);
}
