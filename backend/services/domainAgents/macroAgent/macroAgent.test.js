const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./macroAgent");

const FORBIDDEN_COMMITTEE_KEYS = ["action", "decision", "verdict", "finalDecision", "recommendation"];

function fakeSeries(seriesId, value, priorValue, changeYoY) {
  return { seriesId, dataAvailable: true, unavailableReason: null, latest: { date: "2026-06-01", value }, priorYearAgo: { date: "2025-06-01", value: priorValue }, changeYoY, observations: [] };
}
function fakeProxy(symbol, latestClose, priorClose, changePercent) {
  return { symbol, dataAvailable: true, unavailableReason: null, latestClose, priorClose, changePercent };
}

function fakeAvailableProvider() {
  return {
    async getMacroData() {
      return {
        asOf: "2026-07-29T00:00:00Z",
        dataAvailable: true,
        unavailableReason: null,
        interestRates: fakeSeries("FEDFUNDS", 3.63, 4.33, -16.17),
        inflation: fakeSeries("CPIAUCSL", 332.568, 321.435, 3.46),
        employment: fakeSeries("UNRATE", 4.2, 4.1, 2.44),
        gdp: fakeSeries("GDPC1", 24180.419, 23548.21, 2.68),
        yieldCurve: fakeSeries("T10Y2Y", 0.35, 0.51, -31.37),
        creditSpread: fakeSeries("BAMLH0A0HYM2", 2.84, 2.82, 0.71),
        liquidity: fakeSeries("M2SL", 23155.2, 21942.7, 5.53),
        vix: fakeProxy("^VIX", 20.66, 16.45, 25.59),
        oil: fakeProxy("CL=F", 84.82, 69.5, 22.04),
        gold: fakeProxy("GC=F", 4115.4, 4022.9, 2.3),
        usdStrength: fakeProxy("DX-Y.NYB", 100.89, 101.19, -0.3),
      };
    },
  };
}

function fakeUnavailableProvider(reason) {
  return {
    async getMacroData() {
      return { asOf: "2026-07-29T00:00:00Z", dataAvailable: false, unavailableReason: reason };
    },
  };
}

test("generateReport: produces a fully populated, well-formed report from real (fixture) macro data", async () => {
  const report = await generateReport({ provider: fakeAvailableProvider() });
  assert.equal(report.dataAvailable, true);
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.macroBias));
  assert.ok(Number.isFinite(report.macroScore));
  assert.ok(["EXPANSION", "SLOWDOWN", "CONTRACTION", "RECOVERY"].includes(report.economicCycle));
  assert.ok(Number.isFinite(report.liquidityScore));
  assert.ok(["LOW", "MODERATE", "HIGH", "ELEVATED"].includes(report.inflationPressure));
  assert.ok(["LOW", "MODERATE", "HIGH"].includes(report.recessionRisk));
  assert.ok(["TIGHTENING", "EASING", "HOLDING"].includes(report.policyDirection));
  assert.ok(["LOW", "MODERATE", "ELEVATED", "HIGH"].includes(report.marketStress));
  assert.ok(Number.isFinite(report.confidence));
  assert.ok(Array.isArray(report.bullishFactors));
  assert.ok(Array.isArray(report.bearishFactors));
  assert.ok(Array.isArray(report.risks));
  assert.equal(typeof report.aiSummary, "string");
  assert.ok(report.aiSummary.length > 0);
});

test("generateReport: honestly reports unavailable when the real provider itself has no data", async () => {
  const report = await generateReport({ provider: fakeUnavailableProvider("all real sources unreachable") });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.macroBias, "UNKNOWN");
  assert.equal(report.macroScore, null);
  assert.match(report.unavailableReason, /all real sources unreachable/);
});

test("generateReport: the full composed report never contains a forbidden governance key", async () => {
  const report = await generateReport({ provider: fakeAvailableProvider() });
  const serialized = JSON.stringify(report);
  for (const forbidden of FORBIDDEN_COMMITTEE_KEYS) {
    assert.ok(!new RegExp(`"${forbidden}"\\s*:`).test(serialized), `report must not contain the forbidden key "${forbidden}"`);
  }
});

test("generateReport: with 100% real data availability, confidence is a real high value", async () => {
  const report = await generateReport({ provider: fakeAvailableProvider() });
  assert.equal(report.confidence, 100);
});
