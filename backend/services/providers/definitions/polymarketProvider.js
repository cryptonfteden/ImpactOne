const { createUnifiedProvider } = require("../providerAbstraction");
const { getPolymarketData } = require("../../altDataService");

async function fetchPolymarketEvents() {
  const rows = await getPolymarketData({ symbol: "SPY" });
  return rows.map((row) => ({
    eventType: "prediction-market",
    sourceType: "prediction-market",
    sourceName: "Polymarket Gamma API",
    sourceUrl: "https://docs.polymarket.com/api-reference/introduction",
    publishedAt: new Date().toISOString(),
    symbols: row.relatedTickers || [],
    sectors: row.relatedSectors || [],
    summary: `${row.event}: ${(Number(row.probability || 0) * 100).toFixed(0)}% implied probability; ${row.trend || "flat"} recent direction. Prediction-market pricing is not a forecast guarantee.`,
    rawReference: row,
    credibilityScore: 65,
    freshnessScore: 85,
    confidence: 60,
  }));
}

module.exports = createUnifiedProvider(
  {
    providerId: "polymarket",
    label: "Polymarket",
    sourceType: "prediction-market",
    category: "macro",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  fetchPolymarketEvents,
  { cacheTtlMs: 20 * 60 * 1000 }
);
module.exports.fetchPolymarketEvents = fetchPolymarketEvents;
