const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./institutionalAgent");
const canonicalVerdict = require("../../canonicalVerdict");

function managerPosition(managerName, { checked = true, current, prior } = {}) {
  return { managerName, cik: "0000000000", checked, unavailableReason: null, currentQuarter: current, priorQuarter: prior };
}

function fakeProvider(metrics) {
  return { getSymbolInstitutionalData: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "No Finnhub API key is configured.", companyName: null, managerPositions: [] };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.institutionalBias, "NEUTRAL");
  assert.equal(report.confidence.confidence, 0);
  assert.deepEqual(report.topHolders, []);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data (a real bullish accumulation scenario)", async () => {
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    companyName: "Fake Co",
    managerPositions: [
      managerPosition("Alpha Capital", { current: { shares: 200, value: 20000, reportDate: "2026-05-01" }, prior: { shares: 100, value: 10000, reportDate: "2026-02-01" } }), // INCREASED
      managerPosition("Beta Capital", { current: { shares: 500, value: 50000, reportDate: "2026-05-01" }, prior: { shares: 0, value: 0, reportDate: "2026-02-01" } }), // NEW
      managerPosition("Gamma Capital", { checked: false }),
    ],
  };

  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });

  assert.equal(report.symbol, "FAKE");
  assert.equal(report.dataAvailable, true);
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.institutionalBias));
  assert.ok(Number.isFinite(report.institutionalScore));
  assert.ok(["INCREASING", "DECREASING", "STABLE", "UNKNOWN"].includes(report.ownershipTrend.trend));
  assert.ok(Number.isFinite(report.accumulationScore));
  assert.ok(Number.isFinite(report.distributionScore));
  assert.ok(Number.isFinite(report.convictionScore));
  assert.ok(Number.isFinite(report.smartMoneyParticipation));
  assert.equal(report.topHolders.length, 2);
  assert.equal(report.newPositions.length, 1);
  assert.equal(report.newPositions[0].managerName, "Beta Capital");
  assert.equal(report.closedPositions.length, 0);
  assert.ok(Array.isArray(report.risks));
  assert.ok(Array.isArray(report.opportunities));
  assert.ok(Number.isFinite(report.confidence.confidence));
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
  assert.ok(report.inputs);
  assert.equal(report.institutionalBias, "BULLISH");
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const metrics = { symbol: "FAKE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null, companyName: "Fake Co", managerPositions: [] };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    companyName: "Fake Co",
    managerPositions: [managerPosition("Alpha Capital", { current: { shares: 200, value: 20000, reportDate: "2026-05-01" }, prior: { shares: 100, value: 10000, reportDate: "2026-02-01" } })],
  };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});

test("generateReport: gracefully handles a real cohort with zero real holders, never crashing", async () => {
  const metrics = {
    symbol: "EMPTY",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    companyName: "Empty Co",
    managerPositions: [managerPosition("Alpha Capital", { current: { shares: 0, value: 0, reportDate: "2026-05-01" }, prior: { shares: 0, value: 0, reportDate: "2026-02-01" } })],
  };
  const report = await generateReport("EMPTY", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, true);
  assert.equal(report.institutionalBias, "NEUTRAL");
  assert.deepEqual(report.topHolders, []);
});
