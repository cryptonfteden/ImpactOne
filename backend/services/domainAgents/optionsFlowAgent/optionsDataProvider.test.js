require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../../test/dbHelpers");
const optionsFlowProvider = require("../../providers/definitions/optionsFlowProvider");
const repository = require("../../optionsAgent/optionsFlowRepository");
const { createInternalOptionsDataProvider, emptyMetrics } = require("./optionsDataProvider");

test.beforeEach(async () => {
  await truncateAll();
});

test("with no options-flow provider configured, getSymbolMetrics honestly reports dataAvailable: false and every field empty/null", async () => {
  assert.equal(optionsFlowProvider.isConfigured(), false, "test assumes no OPTIONS_FLOW_PROVIDER_API_KEY is set");
  const provider = createInternalOptionsDataProvider({ occProvider: async () => ({ dataAvailable: false, unavailableReason: "No OCC data in test." }) });
  const metrics = await provider.getSymbolMetrics("NVDA");

  assert.equal(metrics.dataAvailable, false);
  assert.ok(metrics.unavailableReason);
  assert.deepEqual(metrics.optionVolume, { call: 0, put: 0, total: 0 });
  assert.deepEqual(metrics.openInterest, { call: null, put: null, total: null });
  assert.equal(metrics.putCallRatio, null);
  assert.deepEqual(metrics.largeBlockTrades, []);
  assert.deepEqual(metrics.unusualContracts, []);
  assert.deepEqual(metrics.greeks, { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null });
});

test("uses official OCC end-of-day Call/Put volume when no paid flow provider is configured", async () => {
  const provider = createInternalOptionsDataProvider({
    occProvider: async () => ({ dataAvailable: true, symbol: "NVDA", asOf: "2026-08-17T00:00:00.000Z", reportDate: "2026-08-17", callVolume: 1200, putVolume: 600, totalVolume: 1800, putCallRatio: 0.5, source: "OCC Volume Query", sourceUrl: "https://www.theocc.com/example", freshness: "end-of-day", limitations: ["Not real-time."] }),
  });
  const metrics = await provider.getSymbolMetrics("NVDA");
  assert.equal(metrics.dataAvailable, true);
  assert.deepEqual(metrics.optionVolume, { call: 1200, put: 600, total: 1800 });
  assert.equal(metrics.putCallRatio, 0.5);
  assert.equal(metrics.sourceProvider, "OCC Volume Query");
  assert.equal(metrics.dataFreshness, "end-of-day");
  assert.equal(metrics.greeks.gammaExposure, null);
});

test("emptyMetrics() matches the exact shape getSymbolMetrics returns in the unconfigured case", () => {
  const metrics = emptyMetrics("NVDA", "test reason");
  assert.equal(metrics.symbol, "NVDA");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "test reason");
});

// The following tests exercise the real, configured-provider path by
// seeding real Postgres rows directly through the repository (the same
// approach optionsAgentService's own tests would use once the provider
// is connected) and temporarily flipping the real env-var
// isConfigured() reads — restored in `finally` so no other test file run
// in the same process is affected.
function withConfiguredProvider(fn) {
  return async () => {
    process.env.OPTIONS_FLOW_PROVIDER_API_KEY = "test-key-for-options-data-provider-tests";
    try {
      await fn();
    } finally {
      delete process.env.OPTIONS_FLOW_PROVIDER_API_KEY;
    }
  };
}

test(
  "with the provider configured and real prints seeded, getSymbolMetrics computes a real call/put volume split and put/call ratio",
  withConfiguredProvider(async () => {
    assert.equal(optionsFlowProvider.isConfigured(), true);
    const now = new Date();
    await repository.createPrints([
      { symbol: "NVDA", expiry: new Date("2026-08-21"), strike: 900, optionType: "CALL", exchange: "CBOE", tradeTimestamp: now, price: 5, size: 300, notionalValue: 150000, aggressorSide: "BUY", sourceProviderId: "test" },
      { symbol: "NVDA", expiry: new Date("2026-08-21"), strike: 850, optionType: "PUT", exchange: "CBOE", tradeTimestamp: now, price: 4, size: 100, notionalValue: 40000, aggressorSide: "SELL", sourceProviderId: "test" },
    ]);

    const provider = createInternalOptionsDataProvider({ now: () => now });
    const metrics = await provider.getSymbolMetrics("NVDA");

    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.optionVolume.call, 300);
    assert.equal(metrics.optionVolume.put, 100);
    assert.equal(metrics.optionVolume.total, 400);
    assert.equal(metrics.putCallRatio, 100 / 300);
  })
);

test(
  "with a real OI snapshot seeded, getSymbolMetrics sums the most recent snapshot per contract and computes a real volume/OI ratio",
  withConfiguredProvider(async () => {
    const now = new Date();
    await repository.createPrints([
      { symbol: "NVDA", expiry: new Date("2026-08-21"), strike: 900, optionType: "CALL", exchange: "CBOE", tradeTimestamp: now, price: 5, size: 200, notionalValue: 100000, aggressorSide: "BUY", sourceProviderId: "test" },
    ]);
    await repository.upsertOpenInterestSnapshot({
      symbol: "NVDA",
      expiry: new Date("2026-08-21"),
      strike: 900,
      optionType: "CALL",
      openInterest: 1000,
      snapshotDate: now,
      sourceProviderId: "test",
    });

    const provider = createInternalOptionsDataProvider({ now: () => now });
    const metrics = await provider.getSymbolMetrics("NVDA");

    assert.equal(metrics.openInterest.call, 1000);
    assert.equal(metrics.openInterest.total, 1000);
    assert.equal(metrics.volumeOiRatio, 200 / 1000);
  })
);

test(
  "with a real BLOCK_TRADE signal seeded, it appears in both unusualContracts and largeBlockTrades",
  withConfiguredProvider(async () => {
    const now = new Date();
    await repository.createSignal({
      symbol: "NVDA",
      expiry: new Date("2026-08-21"),
      strike: 900,
      optionType: "CALL",
      signalType: "BLOCK_TRADE",
      aggressorSide: "BUY",
      totalVolume: 500,
      notionalValue: 900000,
      largestSinglePrintSize: 500,
      anomalyScore: 88,
      explanation: "A single 500-contract block print cleared the threshold.",
      evidenceSnapshot: {},
      methodologyVersion: "test-v1",
      sourceProviderId: "test",
    });

    const provider = createInternalOptionsDataProvider({ now: () => now });
    const metrics = await provider.getSymbolMetrics("NVDA");

    assert.equal(metrics.unusualContracts.length, 1);
    assert.equal(metrics.largeBlockTrades.length, 1);
    assert.equal(metrics.largeBlockTrades[0].size, 500);
    assert.equal(Number(metrics.largeBlockTrades[0].notionalValue), 900000);
  })
);

test(
  "with a real CALL_PUT_SKEW signal seeded, skew.direction follows the real detector's Z-score sign convention",
  withConfiguredProvider(async () => {
    const now = new Date();
    await repository.createSignal({
      symbol: "NVDA",
      expiry: new Date("2026-08-21"),
      strike: 900,
      optionType: "CALL",
      signalType: "CALL_PUT_SKEW",
      aggressorSide: "UNKNOWN",
      totalVolume: 1000,
      notionalValue: 500000,
      putCallSkewZScore: 2.1,
      anomalyScore: 60,
      explanation: "Call/put ratio elevated above baseline.",
      evidenceSnapshot: {},
      methodologyVersion: "test-v1",
      sourceProviderId: "test",
    });

    const provider = createInternalOptionsDataProvider({ now: () => now });
    const metrics = await provider.getSymbolMetrics("NVDA");

    assert.ok(metrics.skew);
    assert.equal(metrics.skew.direction, "BULLISH_LEANING");
    assert.equal(metrics.skew.putCallSkewZScore, 2.1);
  })
);

test(
  "a symbol with genuinely zero real rows still returns dataAvailable: true (provider configured) with honest zeros/nulls, never fabricated",
  withConfiguredProvider(async () => {
    const provider = createInternalOptionsDataProvider();
    const metrics = await provider.getSymbolMetrics("ZZZZ_NO_DATA");
    assert.equal(metrics.dataAvailable, true);
    assert.deepEqual(metrics.optionVolume, { call: 0, put: 0, total: 0 });
    assert.equal(metrics.putCallRatio, null);
    assert.equal(metrics.openInterest.total, null);
  })
);
