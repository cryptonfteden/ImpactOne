const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./analystConsensusAgent");

const FORBIDDEN_COMMITTEE_KEYS = ["action", "decision", "verdict", "finalDecision", "recommendation"];

function fakeAvailableProvider() {
  return {
    async getSymbolAnalystData() {
      return {
        symbol: "AAPL",
        asOf: "2026-07-30T00:00:00Z",
        dataAvailable: true,
        unavailableReason: null,
        periods: [
          { period: "2026-06-01", strongBuy: 14, buy: 24, hold: 15, sell: 2, strongSell: 0 },
          { period: "2026-07-01", strongBuy: 13, buy: 23, hold: 16, sell: 2, strongSell: 0 },
        ],
        priceTargets: { symbol: "AAPL", dataAvailable: false, unavailableReason: "403 paid plan required", targetHigh: null, targetLow: null, targetMedian: null, targetMean: null, lastUpdated: null },
      };
    },
  };
}

function fakeUnavailableProvider(reason) {
  return {
    async getSymbolAnalystData(symbol) {
      return { symbol, asOf: "2026-07-30T00:00:00Z", dataAvailable: false, unavailableReason: reason };
    },
  };
}

test("generateReport: produces a fully populated, well-formed report from real (fixture) analyst data", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  assert.equal(report.dataAvailable, true);
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.analystBias));
  assert.ok(Number.isFinite(report.consensusScore));
  assert.ok(Number.isFinite(report.revisionScore));
  assert.equal(report.targetScore, null);
  assert.ok(["LOW", "MODERATE", "HIGH"].includes(report.coverageQuality));
  assert.ok(Number.isFinite(report.convictionScore));
  assert.ok(["IMPROVING", "DETERIORATING", "STABLE"].includes(report.ratingTrend));
  assert.ok(Array.isArray(report.risks));
  assert.ok(Array.isArray(report.opportunities));
  assert.ok(Number.isFinite(report.confidence));
  assert.equal(typeof report.aiSummary, "string");
  assert.ok(report.aiSummary.length > 0);
});

test("generateReport: honestly reports unavailable when the real provider itself has no data", async () => {
  const report = await generateReport("AAPL", { provider: fakeUnavailableProvider("no real key configured") });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.analystBias, "UNKNOWN");
  assert.equal(report.consensusScore, null);
  assert.match(report.unavailableReason, /no real key configured/);
});

test("generateReport: the full composed report never contains a forbidden governance key", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  const serialized = JSON.stringify(report);
  for (const forbidden of FORBIDDEN_COMMITTEE_KEYS) {
    assert.ok(!new RegExp(`"${forbidden}"\\s*:`).test(serialized), `report must not contain the forbidden key "${forbidden}"`);
  }
});

test("generateReport: risks always disclose the permanent price-target limitation when unavailable", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  assert.ok(report.risks.some((risk) => risk.includes("Price targets")));
});
