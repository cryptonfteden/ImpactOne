const { createUnifiedProvider } = require("../providerAbstraction");
const { createFinraShortVolumeDataProvider } = require("../../domainAgents/shortInterestAgent/finraShortVolumeDataProvider");

// A small liquid watchlist keeps this public daily-file source useful without
// treating it as a market-wide short-interest feed.
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"];

function toFinraEvent(record) {
  if (!record?.symbol || !record?.date || !Number.isFinite(record.shortVolumeRatio)) return null;
  const date = `${record.date.slice(0, 4)}-${record.date.slice(4, 6)}-${record.date.slice(6, 8)}`;
  return {
    eventType: "finra-daily-short-volume",
    sourceType: "market-structure",
    sourceName: "FINRA Reg SHO Daily Short Sale Volume",
    sourceUrl: "https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data",
    publishedAt: new Date(`${date}T23:00:00Z`).toISOString(),
    symbols: [record.symbol],
    sectors: [],
    summary: `${record.symbol}: FINRA daily short-selling volume was ${(record.shortVolumeRatio * 100).toFixed(1)}% of reported volume on ${date}. This is daily short volume, not total short interest.`,
    rawReference: {
      date,
      shortVolume: record.shortVolume,
      shortExemptVolume: record.shortExemptVolume,
      totalVolume: record.totalVolume,
      shortVolumeRatio: record.shortVolumeRatio,
    },
    credibilityScore: 95,
    freshnessScore: 80,
    confidence: 75,
  };
}

async function fetchFinraShortVolumeEvents() {
  const provider = createFinraShortVolumeDataProvider({ lookbackTradingDays: 1 });
  const results = await Promise.all(DEFAULT_SYMBOLS.map((symbol) => provider.getSymbolShortVolumeData(symbol)));
  return results
    .filter((result) => result.dataAvailable)
    .map((result) => result.dailyShortVolume.at(-1))
    .map(toFinraEvent)
    .filter(Boolean);
}

module.exports = createUnifiedProvider(
  {
    providerId: "finraShortVolume",
    label: "FINRA Daily Short Volume",
    sourceType: "market-structure",
    category: "equities",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchFinraShortVolumeEvents,
  { cacheTtlMs: 15 * 60 * 1000 }
);

module.exports.toFinraEvent = toFinraEvent;
