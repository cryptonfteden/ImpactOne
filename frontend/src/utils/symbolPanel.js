// Phase X2 — the one, shared way any screen opens the Chart Panel for a
// symbol, in place, without navigating away from wherever it's called.
// Kept in its own module (not exported from MainLayout.jsx) specifically
// to avoid a circular import: every feature screen that wants to open the
// panel would otherwise need to import from the layout that renders it.
export function openSymbolPanel(symbol) {
  window.dispatchEvent(new CustomEvent("impactone:open-symbol-panel", { detail: symbol }));
}

export const OPEN_SYMBOL_PANEL_EVENT = "impactone:open-symbol-panel";
