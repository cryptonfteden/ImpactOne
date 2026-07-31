const { createUnifiedProvider } = require("../providerAbstraction");
const autonomousMarketService = require("../../autonomousMarketService");

/**
 * The one provider with a real fetchImpl this sprint — it delegates to the
 * existing news pipeline (autonomousMarketService's personalized-news
 * fetch), filtered to wire-quality sources, proving the framework works
 * end-to-end against real data rather than only against stubs.
 *
 * Phase PROVIDER-ABSTRACTION-002 — migrated to `createUnifiedProvider`
 * (from `createProvider`), the first of this mission's incremental
 * migrations. `fetchWireNews` itself is completely unchanged; this
 * only adds a shared 10s timeout safety net and the uniform
 * getHealth()/getMetrics()/getDiagnostics()/getCacheStats() accessors.
 * Caching is NOT enabled (a live wire-news feed's whole purpose is to
 * surface new items — caching it would delay real ingestion), so
 * `fetch()`'s real behavior/output is identical to before this phase.
 */
async function fetchWireNews() {
  const overview = await autonomousMarketService.getAutonomousOverview({});
  const feed = Array.isArray(overview?.feed) ? overview.feed : [];
  return feed.filter((item) => {
    const source = (item.sourceName || "").toLowerCase();
    return ["reuters", "bloomberg"].some((name) => source.includes(name));
  });
}

module.exports = createUnifiedProvider(
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
