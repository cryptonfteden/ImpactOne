require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { computeMarketSentiment, NOT_YET_IMPLEMENTED_DIMENSIONS } = require("./marketSentimentEngine");

const NOW = new Date("2026-07-26T20:00:00.000Z");

const FULL_INPUTS = {
  feed: [
    { impactType: "opportunity", importanceScore: 70, affectedRegions: [], publishedAt: "2026-07-26T18:00:00.000Z" },
    { impactType: "opportunity", importanceScore: 65, affectedRegions: [], publishedAt: "2026-07-26T17:00:00.000Z" },
  ],
  recommendations: [
    { action: "BUY", createdAt: "2026-07-26T10:00:00.000Z" },
    { action: "BUY", createdAt: "2026-07-26T11:00:00.000Z" },
  ],
  macroData: { source: "fred", regime: { riskMode: "risk-on", inflationPressure: "low", recessionRisk: "low" }, rates: { asOf: "2026-07-25" }, cpi: { asOf: "2026-07-01" } },
  polymarketData: [{ trend: "Up", source: "polymarket" }],
  cotResult: { status: "LIVE", errorState: null, netPositionChangePct: 4, asOf: "2026-07-20" },
  analyses: [{ symbol: "SPY", signals: { volatilityRegime: { enoughData: true, signal: "LOW_VOLATILITY", calculationInputs: {}, freshness: { lastBarDate: "2026-07-25" } } } }],
};

test("all inputs available: every implemented dimension is available and the overall score is a real, finite number", () => {
  const result = computeMarketSentiment({ market: "US", dimensionInputs: FULL_INPUTS, now: NOW });
  const implementedReadings = result.dimensionReadings.filter((reading) => !NOT_YET_IMPLEMENTED_DIMENSIONS.includes(reading.dimension));
  for (const reading of implementedReadings) {
    assert.equal(reading.unavailable, false, `${reading.dimension} should be available with full real inputs`);
  }
  assert.ok(Number.isFinite(result.score));
  assert.ok(Number.isFinite(result.confidence));
});

test("the 3 dimensions with no real data source are always reported unavailable, never fabricated", () => {
  const result = computeMarketSentiment({ market: "US", dimensionInputs: FULL_INPUTS, now: NOW });
  for (const dimension of NOT_YET_IMPLEMENTED_DIMENSIONS) {
    const reading = result.dimensionReadings.find((entry) => entry.dimension === dimension);
    assert.equal(reading.unavailable, true);
    assert.equal(reading.score, null);
    assert.ok(result.missingInputs.some((entry) => entry.startsWith(dimension)));
  }
});

test("partial inputs: only the dimensions with real data available are scored, others are honestly missing", () => {
  const partialInputs = { feed: FULL_INPUTS.feed, recommendations: [], macroData: null, polymarketData: [], cotResult: null, analyses: [] };
  const result = computeMarketSentiment({ market: "US", dimensionInputs: partialInputs, now: NOW });
  const newsReading = result.dimensionReadings.find((reading) => reading.dimension === "NEWS_SENTIMENT");
  const macroReading = result.dimensionReadings.find((reading) => reading.dimension === "MACRO_EVENTS");
  assert.equal(newsReading.unavailable, false);
  assert.equal(macroReading.unavailable, true);
  assert.ok(result.missingInputs.length > 0);
});

test("no inputs at all: overall score/confidence are honestly null, not a fabricated neutral value", () => {
  const result = computeMarketSentiment({ market: "US", dimensionInputs: {}, now: NOW });
  assert.equal(result.score, null);
  assert.equal(result.confidence, null);
  assert.ok(result.missingInputs.length > 0);
});

test("market isolation: computing US and JAPAN from the same shared inputs produces independent, non-identical readings with no cross-contamination", () => {
  const usResult = computeMarketSentiment({ market: "US", dimensionInputs: FULL_INPUTS, now: NOW });
  const japanResult = computeMarketSentiment({ market: "JAPAN", dimensionInputs: FULL_INPUTS, now: NOW });
  assert.equal(usResult.market, "US");
  assert.equal(japanResult.market, "JAPAN");
  assert.notDeepEqual(usResult.dimensionReadings, japanResult.dimensionReadings);
  // JAPAN has no real macro/recommendation data source — those two
  // dimensions must be unavailable for Japan even though the identical
  // input object made them available for US.
  const japanMacro = japanResult.dimensionReadings.find((reading) => reading.dimension === "MACRO_EVENTS");
  const japanRecs = japanResult.dimensionReadings.find((reading) => reading.dimension === "AI_RECOMMENDATION_DISTRIBUTION");
  assert.equal(japanMacro.unavailable, true);
  assert.equal(japanRecs.unavailable, true);
});

test("market isolation: calling computeMarketSentiment for one market never mutates the shared dimensionInputs object for another call", () => {
  const before = JSON.parse(JSON.stringify(FULL_INPUTS));
  computeMarketSentiment({ market: "US", dimensionInputs: FULL_INPUTS, now: NOW });
  computeMarketSentiment({ market: "ENERGY", dimensionInputs: FULL_INPUTS, now: NOW });
  assert.deepEqual(FULL_INPUTS, before);
});

test("deterministic scoring: identical market + inputs + now always produces an identical result", () => {
  const first = computeMarketSentiment({ market: "US", dimensionInputs: FULL_INPUTS, now: NOW });
  const second = computeMarketSentiment({ market: "US", dimensionInputs: FULL_INPUTS, now: NOW });
  assert.deepEqual(first, second);
});

test("computeMarketSentiment rejects an unknown market rather than silently defaulting", () => {
  assert.throws(() => computeMarketSentiment({ market: "ATLANTIS", dimensionInputs: FULL_INPUTS, now: NOW }), /Unknown market/);
});
