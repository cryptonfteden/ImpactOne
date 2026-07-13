const { createProvider } = require("../providerFactory");
const autonomousMarketService = require("../../autonomousMarketService");

/**
 * The one provider with a real fetchImpl this sprint — it delegates to the
 * existing news pipeline (autonomousMarketService's personalized-news
 * fetch), filtered to wire-quality sources, proving the framework works
 * end-to-end against real data rather than only against stubs.
 */
async function fetchWireNews() {
  const overview = await autonomousMarketService.getAutonomousOverview({});
  const feed = Array.isArray(overview?.feed) ? overview.feed : [];
  return feed.filter((item) => {
    const source = (item.sourceName || "").toLowerCase();
    return ["reuters", "bloomberg"].some((name) => source.includes(name));
  });
}

module.exports = createProvider(
  {
    providerId: "reutersBloombergWire",
    label: "Reuters / Bloomberg Wire",
    sourceType: "news",
    category: "macro",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 30 },
  },
  fetchWireNews
);
