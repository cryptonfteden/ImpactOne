const { createUnifiedProvider } = require("../providerAbstraction");
const { getCongressData } = require("../../altDataService");

async function fetchCongressEvents() {
  const data = await getCongressData({ symbol: "SPY" });
  if (data?.source === "unavailable") return [];
  return (data?.trades || []).map((trade) => ({
    eventType: "congressional-financial-disclosure",
    sourceType: "government-disclosure",
    sourceName: "House financial disclosure mirror",
    sourceUrl: "https://disclosures-clerk.house.gov/FinancialDisclosure",
    publishedAt: trade.date ? new Date(`${trade.date}T12:00:00Z`).toISOString() : new Date().toISOString(),
    symbols: trade.ticker ? [trade.ticker] : [],
    sectors: trade.sector ? [trade.sector] : [],
    summary: `${trade.politician}: ${trade.transactionType} ${trade.ticker || trade.asset}, disclosed amount ${trade.amount}. Congressional disclosures can be delayed and are not trade recommendations.`,
    rawReference: trade,
    credibilityScore: 65,
    freshnessScore: 55,
    confidence: 55,
  }));
}

module.exports = createUnifiedProvider(
  {
    providerId: "congress",
    label: "US Congress",
    sourceType: "government",
    category: "regulation",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchCongressEvents,
  { cacheTtlMs: 6 * 60 * 60 * 1000 }
);
module.exports.fetchCongressEvents = fetchCongressEvents;
