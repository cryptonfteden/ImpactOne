const test = require("node:test");
const assert = require("node:assert/strict");

const { generateReport } = require("./earningsAgent");
const { emptyMetrics } = require("./earningsDataProvider");

test("generateReport with an injected 'no data' provider returns the full normalized shape, honestly empty", async () => {
  const provider = { async getSymbolEarnings(symbol) { return emptyMetrics(symbol, "not connected"); } };
  const report = await generateReport("NVDA", { provider });

  assert.equal(report.symbol, "NVDA");
  assert.equal(report.dataAvailable, false);
  assert.equal(report.earningsHealth, "UNKNOWN");
  assert.equal(report.growthScore, null);
  assert.equal(report.surpriseScore, null);
  assert.equal(report.forwardOutlook, "UNKNOWN");
  assert.equal(report.confidence, 0);
  assert.ok(report.risks.length >= 1);
  assert.deepEqual(report.opportunities, [], "no real opportunity can be honestly claimed with zero data available");
  assert.equal(typeof report.aiSummary, "string");
  assert.ok(report.aiSummary.length > 0);
});

test("generateReport accepts an injected provider — the swappable-provider seam the mission requires", async () => {
  const fakeProvider = {
    async getSymbolEarnings(symbol) {
      return {
        symbol,
        asOf: new Date().toISOString(),
        dataAvailable: true,
        unavailableReason: null,
        epsHistory: [
          { period: "2026-Q2", actual: 1.2, estimate: 1.0, surprise: 0.2, surprisePercent: 20 },
          { period: "2026-Q1", actual: 1.1, estimate: 1.0, surprise: 0.1, surprisePercent: 10 },
        ],
        revenue: { growthYoY: 22 },
        eps: { growthYoY: 25 },
        margins: { netProfitMargin: 24, grossMargin: 60 },
        cashFlow: { freeCashFlowGrowthYoY: null },
        guidance: { changed: true, direction: "RAISED" },
        analystRevisions: { direction: "UP", count: 5 },
      };
    },
  };

  const report = await generateReport("NVDA", { provider: fakeProvider });
  assert.equal(report.dataAvailable, true);
  assert.equal(report.forwardOutlook, "POSITIVE");
  assert.equal(report.confidence, 100, "all four signal categories are present in this fake provider");
  assert.equal(report.earningsHealth, "STRONG");
  assert.ok(report.growthScore >= 75);
  assert.ok(report.surpriseScore > 70);
  assert.match(report.aiSummary, /POSITIVE|positive/);
});

test("a weak, declining fundamentals profile produces a consistent WEAK/NEGATIVE report, never a contradictory mix", async () => {
  const fakeProvider = {
    async getSymbolEarnings(symbol) {
      return {
        symbol,
        asOf: new Date().toISOString(),
        dataAvailable: true,
        unavailableReason: null,
        epsHistory: [
          { period: "2026-Q2", actual: 0.5, estimate: 0.7, surprise: -0.2, surprisePercent: -28 },
          { period: "2026-Q1", actual: 0.4, estimate: 0.6, surprise: -0.2, surprisePercent: -33 },
        ],
        revenue: { growthYoY: -15 },
        eps: { growthYoY: -20 },
        margins: { netProfitMargin: -3, grossMargin: 20 },
        cashFlow: { freeCashFlowGrowthYoY: null },
        guidance: { changed: true, direction: "LOWERED" },
        analystRevisions: { direction: "DOWN", count: 3 },
      };
    },
  };

  const report = await generateReport("XYZ", { provider: fakeProvider });
  assert.equal(report.forwardOutlook, "NEGATIVE");
  assert.equal(report.earningsHealth, "WEAK");
  assert.ok(report.risks.length > 0);
  assert.ok(!/STRONG/.test(report.aiSummary));
});

test("generateReport retains the full raw inputs for auditability", async () => {
  const provider = { async getSymbolEarnings(symbol) { return emptyMetrics(symbol, "x"); } };
  const report = await generateReport("NVDA", { provider });
  assert.ok(report.inputs);
  assert.equal(report.inputs.symbol, "NVDA");
});
