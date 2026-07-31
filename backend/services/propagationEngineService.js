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
function propagateByTheme(event = "") {
  const text = String(event || "").toLowerCase();

  if (text.includes("oil")) {
    return [
      { from: "Oil", to: "Airlines", effect: "down" },
      { from: "Oil", to: "Shipping", effect: "up" },
      { from: "Oil", to: "Defense", effect: "up" },
      { from: "Oil", to: "Inflation", effect: "up" },
      { from: "Inflation", to: "Rates", effect: "up" },
      { from: "Rates", to: "Consumer", effect: "down" },
    ];
  }

  if (text.includes("fed") || text.includes("rate")) {
    return [
      { from: "Fed funds", to: "Bonds", effect: "down" },
      { from: "Fed funds", to: "USD", effect: "up" },
      { from: "USD", to: "Commodities", effect: "down" },
      { from: "Rates", to: "Growth equities", effect: "down" },
    ];
  }

  if (text.includes("ai") || text.includes("nvidia")) {
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
