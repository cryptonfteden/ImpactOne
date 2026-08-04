const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeMarketBias } = require("./marketBiasAnalyzer");
const { emptyMetrics } = require("./optionsDataProvider");

function baseMetrics(overrides = {}) {
  return {
    symbol: "NVDA",
    asOf: new Date().toISOString(),
    dataAvailable: true,
    unavailableReason: null,
    optionVolume: { call: 100, put: 100, total: 200 },
    openInterest: { call: 500, put: 500, total: 1000 },
    putCallRatio: 1,
    volumeOiRatio: 0.2,
    largeBlockTrades: [],
    unusualContracts: [],
    skew: null,
    greeks: { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null },
    ...overrides,
  };
}

test("no data available => NEUTRAL bias, 0 confidence, no fabricated lean", () => {
  const result = analyzeMarketBias(emptyMetrics("NVDA", "not connected"));
  assert.equal(result.bias, "NEUTRAL");
  assert.equal(result.confidence, 0);
});

test("heavy call volume with thin overall volume below the meaningful threshold does not drive a bullish call", () => {
  const metrics = baseMetrics({ optionVolume: { call: 10, put: 0, total: 10 }, putCallRatio: 0 });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "NEUTRAL");
});

test("a strongly call-heavy, high-volume put/call ratio produces a real bullish bias", () => {
  const metrics = baseMetrics({ optionVolume: { call: 900, put: 100, total: 1000 }, putCallRatio: 100 / 900 });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "BULLISH");
  assert.ok(result.confidence > 0);
});

test("a strongly put-heavy, high-volume put/call ratio produces a real bearish bias", () => {
  const metrics = baseMetrics({ optionVolume: { call: 100, put: 900, total: 1000 }, putCallRatio: 900 / 100 });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "BEARISH");
  assert.ok(result.confidence > 0);
});

test("an exactly balanced put/call ratio at meaningful volume is NEUTRAL, not a coin-flip bullish/bearish", () => {
  const metrics = baseMetrics({ optionVolume: { call: 500, put: 500, total: 1000 }, putCallRatio: 1 });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "NEUTRAL");
});

test("a positive skew Z-score (BULLISH_LEANING per the real detector convention) contributes a bullish lean", () => {
  const metrics = baseMetrics({
    optionVolume: { call: 0, put: 0, total: 0 },
    putCallRatio: null,
    skew: { direction: "BULLISH_LEANING", putCallSkewZScore: 2.5 },
  });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "BULLISH");
  assert.ok(result.contributions.skew > 0);
});

test("a negative skew Z-score (BEARISH_LEANING) contributes a bearish lean", () => {
  const metrics = baseMetrics({
    optionVolume: { call: 0, put: 0, total: 0 },
    putCallRatio: null,
    skew: { direction: "BEARISH_LEANING", putCallSkewZScore: -2.5 },
  });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "BEARISH");
  assert.ok(result.contributions.skew < 0);
});

test("call-side BUY block trades (bullish institutional flow) pull the bias bullish", () => {
  const metrics = baseMetrics({
    optionVolume: { call: 0, put: 0, total: 0 },
    putCallRatio: null,
    largeBlockTrades: [
      { optionType: "CALL", aggressorSide: "BUY", notionalValue: 500000 },
      { optionType: "CALL", aggressorSide: "BUY", notionalValue: 300000 },
    ],
  });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "BULLISH");
  assert.ok(result.contributions.blockTradeFlow > 0);
});

test("put-side BUY block trades (bearish institutional flow / hedging) pull the bias bearish", () => {
  const metrics = baseMetrics({
    optionVolume: { call: 0, put: 0, total: 0 },
    putCallRatio: null,
    largeBlockTrades: [{ optionType: "PUT", aggressorSide: "BUY", notionalValue: 1000000 }],
  });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.bias, "BEARISH");
  assert.ok(result.contributions.blockTradeFlow < 0);
});

test("balanced bullish and bearish block-trade notional cancels out — no fabricated lean from noise", () => {
  const metrics = baseMetrics({
    optionVolume: { call: 0, put: 0, total: 0 },
    putCallRatio: null,
    largeBlockTrades: [
      { optionType: "CALL", aggressorSide: "BUY", notionalValue: 500000 },
      { optionType: "PUT", aggressorSide: "BUY", notionalValue: 500000 },
    ],
  });
  const result = analyzeMarketBias(metrics);
  assert.equal(result.contributions.blockTradeFlow, 0);
});

test("confidence is always a finite number in [0, 100]", () => {
  const cases = [
    baseMetrics({ optionVolume: { call: 900, put: 100, total: 1000 }, putCallRatio: 100 / 900, skew: { putCallSkewZScore: 3 }, largeBlockTrades: [{ optionType: "CALL", aggressorSide: "BUY", notionalValue: 1000000 }] }),
    baseMetrics({ optionVolume: { call: 100, put: 900, total: 1000 }, putCallRatio: 9, skew: { putCallSkewZScore: -3 } }),
    emptyMetrics("NVDA", "x"),
  ];
  for (const metrics of cases) {
    const result = analyzeMarketBias(metrics);
    assert.ok(Number.isFinite(result.confidence));
    assert.ok(result.confidence >= 0 && result.confidence <= 100);
  }
});
