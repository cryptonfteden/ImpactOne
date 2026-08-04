// Phase AI-TRUST-001 — Daily Feed trust fix. The prior fallback returned
// the SAME generic ["Macro shock" -> "Risk assets" -> "mixed"] path for
// ANY event that didn't hit one of the 3 specific theme keywords below —
// meaning two genuinely unrelated events (e.g. "AAPL earnings" and
// "Earnings calendar concentration", neither containing "oil"/"fed"/
// "rate"/"ai"/"nvidia") produced the identical "propagating from Macro
// shock to Risk assets (mixed)" clause in the Daily Feed's explanation
// text. Returning an empty array here (never fabricating a specific-
// sounding propagation chain for a theme match that didn't happen) lets
// callers (buildWhy in impactIntelligenceService.js, which already
// checks `propagation?.[0]`) honestly omit the propagation clause
// instead of fabricating one.
//
// Phase LIVE-DATA-FINAL-001 — the same plain-substring matching also let a
// short keyword match INSIDE an unrelated word: "Shipping rates surge"
// (freight pricing, via "rates") and "Semiconductor capacity constraint"
// (via "constraint") both wrongly triggered the Fed-funds/AI-demand chains
// below. hasWord() requires a real word-boundary match, kept as its own
// local copy rather than a shared import to match this codebase's existing
// precedent of each engine owning its own small matching helper (see
// claimConfidence.js's own comment on capAndRedistributeWeights).
function hasWord(text, word) {
  return new RegExp(`\\b${word}\\b`, "i").test(text);
}

function propagateByTheme(event = "") {
  const text = String(event || "").toLowerCase();

  if (hasWord(text, "oil")) {
    return [
      { from: "Oil", to: "Airlines", effect: "down" },
      { from: "Oil", to: "Shipping", effect: "up" },
      { from: "Oil", to: "Defense", effect: "up" },
      { from: "Oil", to: "Inflation", effect: "up" },
      { from: "Inflation", to: "Rates", effect: "up" },
      { from: "Rates", to: "Consumer", effect: "down" },
    ];
  }

  if (hasWord(text, "fed") || hasWord(text, "rate")) {
    return [
      { from: "Fed funds", to: "Bonds", effect: "down" },
      { from: "Fed funds", to: "USD", effect: "up" },
      { from: "USD", to: "Commodities", effect: "down" },
      { from: "Rates", to: "Growth equities", effect: "down" },
    ];
  }

  if (hasWord(text, "ai") || hasWord(text, "nvidia")) {
    return [
      { from: "AI demand", to: "Semiconductors", effect: "up" },
      { from: "Semiconductors", to: "Cloud", effect: "up" },
      { from: "Cloud", to: "Power demand", effect: "up" },
      { from: "Power demand", to: "Utilities", effect: "up" },
    ];
  }

  return [];
}

module.exports = { propagateByTheme };
