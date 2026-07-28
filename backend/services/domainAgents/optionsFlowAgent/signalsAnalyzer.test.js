const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSignals, mostUnusualContracts, institutionalActivity, accumulation, volatilityRegime } = require("./signalsAnalyzer");

function contract(overrides = {}) {
  return {
    symbol: "NVDA",
    expiry: new Date("2026-08-21"),
    strike: 900,
    optionType: "CALL",
    signalType: "VOLUME_SPIKE",
    anomalyScore: 50,
    volumeMultiple: 3,
    notionalValue: 100000,
    explanation: "Volume spike.",
    ...overrides,
  };
}

function baseMetrics(overrides = {}) {
  return {
    optionVolume: { call: 100, put: 50, total: 150 },
    largeBlockTrades: [],
    unusualContracts: [],
    greeks: { iv: null, ivRank: null },
    ...overrides,
  };
}

test("mostUnusualContracts ranks by anomaly score descending and respects topN", () => {
  const metrics = baseMetrics({
    unusualContracts: [contract({ strike: 100, anomalyScore: 20 }), contract({ strike: 200, anomalyScore: 90 }), contract({ strike: 300, anomalyScore: 55 })],
  });
  const ranked = mostUnusualContracts(metrics, { topN: 2 });
  assert.deepEqual(ranked.map((c) => c.strike), [200, 300]);
});

test("mostUnusualContracts converts Decimal-like strike/anomalyScore/volumeMultiple to plain numbers", () => {
  const metrics = baseMetrics({ unusualContracts: [contract({ strike: 900, anomalyScore: 42, volumeMultiple: 5 })] });
  const [result] = mostUnusualContracts(metrics);
  assert.equal(typeof result.strike, "number");
  assert.equal(typeof result.anomalyScore, "number");
  assert.equal(typeof result.volumeMultiple, "number");
});

test("institutionalActivity is honestly 'not detected' with zero block/sweep signals", () => {
  const result = institutionalActivity(baseMetrics());
  assert.equal(result.detected, false);
  assert.equal(result.contractCount, 0);
  assert.equal(result.largestSingleTrade, null);
});

test("institutionalActivity counts only BLOCK_TRADE/SWEEP signals, never VOLUME_SPIKE or CALL_PUT_SKEW", () => {
  const metrics = baseMetrics({
    unusualContracts: [
      contract({ signalType: "BLOCK_TRADE", notionalValue: 500000 }),
      contract({ signalType: "SWEEP", notionalValue: 300000 }),
      contract({ signalType: "VOLUME_SPIKE" }),
      contract({ signalType: "CALL_PUT_SKEW" }),
    ],
  });
  const result = institutionalActivity(metrics);
  assert.equal(result.contractCount, 2);
  assert.equal(result.totalNotionalValue, 800000);
});

test("institutionalActivity reports the real largest trade by notional value", () => {
  const metrics = baseMetrics({
    largeBlockTrades: [
      { notionalValue: 100000 },
      { notionalValue: 900000 },
      { notionalValue: 400000 },
    ],
  });
  const result = institutionalActivity(metrics);
  assert.equal(result.largestSingleTrade.notionalValue, 900000);
});

test("accumulation computes real call/put volume shares that sum to 1", () => {
  const result = accumulation(baseMetrics({ optionVolume: { call: 300, put: 100, total: 400 } }));
  assert.equal(result.callAccumulation.volume, 300);
  assert.equal(result.putAccumulation.volume, 100);
  assert.equal(result.callAccumulation.share, 0.75);
  assert.equal(result.putAccumulation.share, 0.25);
});

test("accumulation reports null shares (never NaN/Infinity) with zero total volume", () => {
  const result = accumulation(baseMetrics({ optionVolume: { call: 0, put: 0, total: 0 } }));
  assert.equal(result.callAccumulation.share, null);
  assert.equal(result.putAccumulation.share, null);
});

test("volatilityRegime honestly reports UNKNOWN with no IV data source connected", () => {
  const result = volatilityRegime(baseMetrics());
  assert.equal(result.regime, "UNKNOWN");
  assert.match(result.reason, /No implied-volatility data source/);
});

test("volatilityRegime classifies ELEVATED/SUPPRESSED/NORMAL once real IV Rank data exists", () => {
  assert.equal(volatilityRegime(baseMetrics({ greeks: { iv: 0.4, ivRank: 85 } })).regime, "ELEVATED");
  assert.equal(volatilityRegime(baseMetrics({ greeks: { iv: 0.4, ivRank: 15 } })).regime, "SUPPRESSED");
  assert.equal(volatilityRegime(baseMetrics({ greeks: { iv: 0.4, ivRank: 50 } })).regime, "NORMAL");
});

test("buildSignals composes every section into one object", () => {
  const metrics = baseMetrics({ unusualContracts: [contract()] });
  const signals = buildSignals(metrics);
  assert.ok(Array.isArray(signals.mostUnusualContracts));
  assert.ok(signals.institutionalActivity);
  assert.ok(signals.callAccumulation);
  assert.ok(signals.putAccumulation);
  assert.ok(signals.volatilityRegime);
});
