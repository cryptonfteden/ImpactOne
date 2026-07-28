require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../../test/dbHelpers");
const { generateReport } = require("./optionsFlowAgent");
const { emptyMetrics } = require("./optionsDataProvider");

test.beforeEach(async () => {
  await truncateAll();
});

test("generateReport with no provider configured returns the full normalized shape, honestly empty", async () => {
  const report = await generateReport("NVDA");

  assert.equal(report.symbol, "NVDA");
  assert.equal(report.dataAvailable, false);
  assert.equal(report.marketBias, "NEUTRAL");
  assert.equal(report.confidence, 0);
  assert.ok(Array.isArray(report.signals.mostUnusualContracts));
  assert.equal(report.signals.mostUnusualContracts.length, 0);
  assert.ok(report.riskSummary.notes.length > 0);
  assert.equal(typeof report.aiSummary, "string");
  assert.ok(report.aiSummary.length > 0);
});

test("generateReport accepts an injected provider — the swappable-provider seam the mission requires", async () => {
  const fakeProvider = {
    async getSymbolMetrics(symbol) {
      return {
        symbol,
        asOf: new Date().toISOString(),
        dataAvailable: true,
        unavailableReason: null,
        optionVolume: { call: 900, put: 100, total: 1000 },
        openInterest: { call: 2000, put: 2000, total: 4000 },
        putCallRatio: 100 / 900,
        volumeOiRatio: 1000 / 4000,
        largeBlockTrades: [{ optionType: "CALL", aggressorSide: "BUY", notionalValue: 1000000, size: 1000 }],
        unusualContracts: [],
        skew: null,
        greeks: { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null },
      };
    },
  };

  const report = await generateReport("NVDA", { provider: fakeProvider });
  assert.equal(report.dataAvailable, true);
  assert.equal(report.marketBias, "BULLISH");
  assert.ok(report.confidence > 0);
  assert.match(report.aiSummary, /bullish/i);
});

test("generateReport's marketBias/confidence/aiSummary are always mutually consistent (no contradiction between fields)", async () => {
  const bearishProvider = {
    async getSymbolMetrics(symbol) {
      return {
        symbol,
        asOf: new Date().toISOString(),
        dataAvailable: true,
        unavailableReason: null,
        optionVolume: { call: 100, put: 900, total: 1000 },
        openInterest: { call: 1000, put: 1000, total: 2000 },
        putCallRatio: 9,
        volumeOiRatio: 0.5,
        largeBlockTrades: [],
        unusualContracts: [],
        skew: null,
        greeks: { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null },
      };
    },
  };

  const report = await generateReport("SPY", { provider: bearishProvider });
  assert.equal(report.marketBias, "BEARISH");
  assert.match(report.aiSummary, /bearish/i);
  assert.ok(!/bullish/i.test(report.aiSummary));
});

test("generateReport retains the full raw inputs for auditability", async () => {
  const report = await generateReport("NVDA");
  assert.ok(report.inputs);
  assert.equal(report.inputs.symbol, "NVDA");
});

test("emptyMetrics-driven report and a directly-constructed empty report are shape-consistent", async () => {
  const viaGenerate = await generateReport("NVDA");
  const manual = emptyMetrics("NVDA", "x");
  assert.equal(viaGenerate.dataAvailable, manual.dataAvailable);
});
