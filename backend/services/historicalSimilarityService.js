const historyDb = [
  {
    key: "covid",
    name: "Covid",
    winningSectors: ["Cloud", "Software", "E-commerce"],
    losingSectors: ["Airlines", "Hospitality", "Energy"],
    recoveryTimeMonths: 18,
    marketReaction: "Initial crash followed by liquidity-driven rebound",
  },
  {
    key: "2008",
    name: "2008 Financial Crisis",
    winningSectors: ["Long bonds", "Gold"],
    losingSectors: ["Banks", "Real Estate", "Consumer discretionary"],
    recoveryTimeMonths: 30,
    marketReaction: "Systemic de-risking and prolonged credit stress",
  },
  {
    key: "ukraine",
    name: "Ukraine War",
    winningSectors: ["Defense", "Energy"],
    losingSectors: ["European Industrials", "Travel"],
    recoveryTimeMonths: 12,
    marketReaction: "Commodity spike and regional risk repricing",
  },
  {
    key: "tariff",
    name: "Trump Tariffs",
    winningSectors: ["Domestic Industrials", "Defense"],
    losingSectors: ["Semiconductors", "Export-heavy manufacturing"],
    recoveryTimeMonths: 9,
    marketReaction: "Trade-sensitive equities sold off",
  },
  {
    key: "bank",
    name: "Bank Failures",
    winningSectors: ["Mega-cap tech", "Treasuries"],
    losingSectors: ["Regional banks", "Small caps"],
    recoveryTimeMonths: 8,
    marketReaction: "Flight to quality and liquidity preference",
  },
  {
    key: "rate",
    name: "Rate Hikes",
    winningSectors: ["Value", "Cash-flow rich defensives"],
    losingSectors: ["Long-duration growth", "REITs"],
    recoveryTimeMonths: 10,
    marketReaction: "Valuation compression across growth cohorts",
  },
  {
    key: "oil",
    name: "Oil Shocks",
    winningSectors: ["Energy", "Shipping"],
    losingSectors: ["Airlines", "Consumer"],
    recoveryTimeMonths: 14,
    marketReaction: "Inflation impulse and margin pressure",
  },
  {
    key: "ai",
    name: "AI Boom",
    winningSectors: ["Semiconductors", "Cloud", "Utilities"],
    losingSectors: ["Legacy hardware"],
    recoveryTimeMonths: 6,
    marketReaction: "Concentrated leadership in AI-linked names",
  },
];

// Phase AI-TRUST-001 — Daily Feed trust fix. The prior fallback returned a
// flat 42 for ANY event that didn't hit one of the specific keyword rules
// below. Since most real event headlines (e.g. "AAPL earnings", "Earnings
// calendar concentration") don't contain any of these keywords, EVERY such
// event scored exactly 42 against EVERY historical record, making "Covid"
// (first in historyDb, so first after a stable sort on a tie) the top
// match for all of them — producing byte-identical "most comparable to
// 'Covid' (42% historical similarity)" text for genuinely unrelated events.
// Returning 0 here (never fabricating a specific, sourced-sounding
// percentage for a real keyword match that didn't happen) and filtering
// zero-score entries out in getHistoricalMatches lets callers (buildWhy in
// impactIntelligenceService.js, which already checks `topAnalog?.event`)
// honestly omit the historical-analogy clause instead of fabricating one.
function similarityScore(event, record) {
  const text = String(event || "").toLowerCase();
  if (text.includes(record.key)) {
    return 88;
  }

  if (record.key === "ai" && (text.includes("nvidia") || text.includes("ai"))) return 84;
  if (record.key === "oil" && (text.includes("oil") || text.includes("energy"))) return 83;
  if (record.key === "rate" && (text.includes("fed") || text.includes("rate"))) return 86;
  if (record.key === "ukraine" && (text.includes("israel") || text.includes("war") || text.includes("conflict"))) return 79;
  if (record.key === "bank" && text.includes("liquidity")) return 76;
  if (record.key === "tariff" && text.includes("trade")) return 78;
  if (record.key === "covid" && text.includes("pandemic")) return 83;
  return 0;
}

/**
 * Returns up to 3 real, keyword-matched historical analogs, sorted by
 * similarity, HIGHEST FIRST — never a fabricated match. An event that
 * doesn't hit any specific keyword rule above honestly returns an empty
 * array rather than a flat, non-differentiated default.
 */
function getHistoricalMatches(event) {
  return historyDb
    .map((item) => ({
      event: item.name,
      similarity: similarityScore(event, item),
      marketReaction: item.marketReaction,
      winningSectors: item.winningSectors,
      losingSectors: item.losingSectors,
      recoveryTimeMonths: item.recoveryTimeMonths,
    }))
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

module.exports = { getHistoricalMatches };
