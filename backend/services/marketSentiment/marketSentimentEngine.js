// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. The pure
// compute core: given already-fetched data for one market, runs every
// implemented scorer, adds honest unavailable stubs for the 3 dimensions
// with no real data source, and rolls up into one OVERALL reading. No
// I/O happens in this file — that discipline is what makes this module
// directly unit-testable for determinism/market-isolation without a
// database or network.
const { ALL_DIMENSIONS, IMPLEMENTED_DIMENSIONS, NOT_YET_IMPLEMENTED_REASONS, MARKET_REGISTRY, isValidMarket } = require("./marketSentimentDimensions");
const scorers = require("./marketSentimentScorers");
const { computeRollup } = require("./marketSentimentRollup");

const NOT_YET_IMPLEMENTED_DIMENSIONS = ALL_DIMENSIONS.filter((dimension) => !IMPLEMENTED_DIMENSIONS.includes(dimension));

/**
 * `dimensionInputs` carries only the already-fetched real data each
 * scorer needs — the service layer (marketSentimentService.js) is
 * responsible for fetching it; this function never reaches out for its
 * own data:
 *   { feed, recommendations, macroData, polymarketData, cotResult, analyses }
 */
function computeDimensionReadings({ market, dimensionInputs = {}, now = new Date() }) {
  if (!isValidMarket(market)) {
    throw new Error(`Unknown market: ${market}`);
  }

  const readings = [
    scorers.scoreNewsSentiment({ feed: dimensionInputs.feed || [], market, now }),
    scorers.scoreAiRecommendationDistribution({ recommendations: dimensionInputs.recommendations || [], market, now }),
    scorers.scoreFearGreed({ macroData: dimensionInputs.macroData, polymarketData: dimensionInputs.polymarketData || [], market, now }),
    scorers.scoreVolatility({ analyses: dimensionInputs.analyses || [], market, now }),
    scorers.scoreMacroEvents({ macroData: dimensionInputs.macroData, cotResult: dimensionInputs.cotResult, market, now }),
  ];

  for (const dimension of NOT_YET_IMPLEMENTED_DIMENSIONS) {
    readings.push({
      dimension,
      score: null,
      confidence: null,
      contributors: [],
      missingInputs: [],
      unavailable: true,
      reason: NOT_YET_IMPLEMENTED_REASONS[dimension],
    });
  }

  return readings;
}

/**
 * The full pure computation for one market: dimension readings + the
 * OVERALL rollup, with no trend (trend requires persisted history, which
 * is I/O — attached by the service layer) and no governance sanitization
 * yet (also the service layer's job, applied uniformly at the boundary).
 */
function computeMarketSentiment({ market, dimensionInputs, now = new Date() }) {
  const dimensionReadings = computeDimensionReadings({ market, dimensionInputs, now });
  const rollup = computeRollup({ dimensionReadings });
  return { market, dimensionReadings, ...rollup };
}

module.exports = {
  NOT_YET_IMPLEMENTED_DIMENSIONS,
  computeDimensionReadings,
  computeMarketSentiment,
};
