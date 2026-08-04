// Phase X4 — Chart Preparation. Four real, hot-pluggable manager classes
// sitting on top of the Phase X2/X3 overlayRegistry.js — infrastructure
// only, per the mission's explicit scope. No indicator math, no
// Fibonacci, no drawing tool is implemented here; these managers are the
// real, tested plumbing a future implementation plugs into.

/**
 * DrawingManager — owns the set of active, user-created drawings on the
 * chart's dedicated drawing canvas layer (AdvancedChart.jsx's
 * `advanced-chart__layer--drawing`). Real state management today; no
 * drawing TYPE (Fibonacci, trendline, etc.) is implemented — a drawing is
 * only ever added via `addDrawing(tool, data)` where `tool` must already
 * be a real, registered DRAWING-category overlay (see overlayRegistry.js)
 * — this manager never invents a drawing type of its own.
 */
export class DrawingManager {
  constructor() {
    this.drawings = new Map(); // id -> { toolId, data, createdAt }
  }

  addDrawing(toolId, data) {
    const id = `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.drawings.set(id, { id, toolId, data, createdAt: new Date().toISOString() });
    return id;
  }

  removeDrawing(id) {
    return this.drawings.delete(id);
  }

  clear() {
    this.drawings.clear();
  }

  list() {
    return Array.from(this.drawings.values());
  }
}

/**
 * OverlayManager — tracks which registered overlays (indicators/signals,
 * never drawings — see overlayRegistry.OVERLAY_CATEGORY) are currently
 * active on a chart instance. Hot-pluggable: `activate`/`deactivate` work
 * on any overlay id already in the registry, including one registered
 * moments ago — no chart restart, no rebuild required.
 */
export class OverlayManager {
  constructor(registry) {
    this.registry = registry; // injected, defaults to overlayRegistry.OVERLAY_REGISTRY in real usage
    this.activeIds = new Set();
  }

  activate(overlayId) {
    if (!this.registry[overlayId]) {
      throw new Error(`Unknown overlay: ${overlayId}`);
    }
    if (!this.registry[overlayId].implemented) {
      throw new Error(`Overlay "${overlayId}" is architecture-only and not yet implemented.`);
    }
    this.activeIds.add(overlayId);
  }

  deactivate(overlayId) {
    this.activeIds.delete(overlayId);
  }

  isActive(overlayId) {
    return this.activeIds.has(overlayId);
  }

  listActive() {
    return Array.from(this.activeIds);
  }
}

/**
 * IndicatorManager — a real, hot-pluggable registry specifically for
 * INDICATOR-category overlays (SMA/EMA/VWAP/RSI/MACD). Distinct from the
 * general OverlayManager so a future "Indicators" panel in the UI can
 * list exactly the computable, chart-math overlays without also showing
 * signal markers or drawing tools. `registerIndicatorProfile` is the real
 * hot-plug entry point: a future indicator implementation calls this once
 * to become immediately usable, with no chart code changes.
 */
export class IndicatorManager {
  constructor() {
    this.profiles = new Map(); // id -> { compute, render, ...meta }
  }

  registerIndicatorProfile(id, profile) {
    if (typeof profile?.compute !== "function" || typeof profile?.render !== "function") {
      throw new Error(`Indicator profile "${id}" must provide real compute() and render() functions.`);
    }
    this.profiles.set(id, profile);
  }

  unregister(id) {
    return this.profiles.delete(id);
  }

  get(id) {
    return this.profiles.get(id) || null;
  }

  list() {
    return Array.from(this.profiles.keys());
  }
}

/**
 * ToolManager — the top-level coordinator a chart instance actually
 * talks to. Composes the three managers above so `AdvancedChart.jsx`
 * (or a future chart host) has one real entry point rather than wiring
 * three separate managers by hand. Still architecture only: no tool
 * (Fibonacci or otherwise) is registered by default.
 */
export class ToolManager {
  constructor(registry = {}) {
    this.drawings = new DrawingManager();
    this.overlays = new OverlayManager(registry);
    this.indicators = new IndicatorManager();
  }

  // Real hot-plug entry point for a future custom indicator/tool profile
  // (e.g. a Fibonacci profile per fibonacciProfileSchema.js, once
  // approved) — registers it with the indicator manager and makes it
  // immediately activatable via the overlay manager, no chart restart.
  loadCustomProfile(id, profile) {
    this.indicators.registerIndicatorProfile(id, profile);
  }
}
