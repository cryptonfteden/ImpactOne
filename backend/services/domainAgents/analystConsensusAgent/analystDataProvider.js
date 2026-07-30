// Phase ANALYST-CONSENSUS-AGENT-001 — the top-level provider
// abstraction this mission requires. Fetches the real Finnhub rating-
// trend series and attempts the real Finnhub price-target endpoint in
// parallel — one failing never blocks the other; overall
// `dataAvailable` reflects the rating-trend series specifically (the
// only metric this agent's analysis can be built on), while
// `priceTargets` carries its own independent, honest availability.
const analystRecommendationProvider = require("./analystRecommendationProvider");
const priceTargetProvider = require("./priceTargetProvider");

function createAnalystDataProvider() {
  async function getSymbolAnalystData(symbol) {
    const [recommendations, priceTargets] = await Promise.all([
      analystRecommendationProvider.getSymbolAnalystRecommendations(symbol),
      priceTargetProvider.getSymbolPriceTargets(symbol),
    ]);

    return {
      symbol: recommendations.symbol,
      asOf: new Date().toISOString(),
      dataAvailable: recommendations.dataAvailable,
      unavailableReason: recommendations.dataAvailable ? null : recommendations.unavailableReason,
      periods: recommendations.periods,
      priceTargets,
    };
  }

  return { getSymbolAnalystData };
}

module.exports = { createAnalystDataProvider };
