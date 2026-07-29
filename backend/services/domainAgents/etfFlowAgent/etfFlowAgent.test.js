const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./etfFlowAgent");
const canonicalVerdict = require("../../canonicalVerdict");

function makeBars(count, { startPrice = 100, dailyMove = 1, volume = 1_000_000 } = {}) {
  const bars = [];
  let price = startPrice;
  for (let i = 0; i < count; i += 1) {
    price += dailyMove;
    bars.push({ date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, open: price, high: price + 1, low: price - 1, close: price, volume });
  }
  return bars;
}

function fakeProvider(metrics) {
  return { getSymbolEtfFlowData: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "No recognized sector ETF mapping." };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.etfFlowBias, "NEUTRAL");
  assert.equal(report.confidence.confidence, 0);
  assert.equal(report.fundConcentration.dataAvailable, false);
  assert.equal(report.stockEtfExposure.dataAvailable, false);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data (a real uptrending direct ETF)", async () => {
  const metrics = {
    symbol: "XLK",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    targetEtf: "XLK",
    isDirectEtf: true,
    sector: "Technology",
    theme: null,
    passiveActiveClassification: "PASSIVE",
    etfBars: makeBars(60, { dailyMove: 0.5 }),
    marketBars: makeBars(60, { dailyMove: 0.1 }),
  };

  const report = await generateReport("XLK", { provider: fakeProvider(metrics) });

  assert.equal(report.symbol, "XLK");
  assert.equal(report.dataAvailable, true);
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.etfFlowBias));
  assert.ok(Number.isFinite(report.netFlowScore));
  assert.ok(["LOW", "NORMAL", "HIGH", "UNKNOWN"].includes(report.flowStrength.classification));
  assert.ok(["HIGH", "MODERATE", "LOW", "UNKNOWN"].includes(report.flowPersistence.classification));
  assert.ok(["ROTATING_IN", "ROTATING_OUT", "NEUTRAL", "UNKNOWN"].includes(report.sectorRotation.classification));
  assert.ok(["PASSIVE", "ACTIVE", "UNKNOWN"].includes(report.passiveFlowImpact.classification));
  assert.equal(report.stockEtfExposure.dataAvailable, false);
  assert.equal(report.fundConcentration.dataAvailable, false);
  assert.ok(Array.isArray(report.risks));
  assert.ok(Array.isArray(report.opportunities));
  assert.ok(Number.isFinite(report.confidence.confidence));
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
  assert.ok(report.inputs);
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const metrics = {
    symbol: "XLK", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null,
    targetEtf: "XLK", isDirectEtf: true, sector: "Technology", theme: null, passiveActiveClassification: "PASSIVE",
    etfBars: makeBars(60), marketBars: [],
  };
  const report = await generateReport("XLK", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const metrics = {
    symbol: "XLK", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null,
    targetEtf: "XLK", isDirectEtf: true, sector: "Technology", theme: null, passiveActiveClassification: "PASSIVE",
    etfBars: makeBars(60), marketBars: makeBars(60),
  };
  const report = await generateReport("XLK", { provider: fakeProvider(metrics) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});

test("generateReport: an indirect stock-symbol read honestly discloses the proxy nature via isDirectEtf/sector and a risk entry", async () => {
  const metrics = {
    symbol: "AAPL", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null,
    targetEtf: "XLK", isDirectEtf: false, sector: "Technology", theme: null, passiveActiveClassification: "PASSIVE",
    etfBars: makeBars(60), marketBars: makeBars(60),
  };
  const report = await generateReport("AAPL", { provider: fakeProvider(metrics) });
  assert.equal(report.isDirectEtf, false);
  assert.equal(report.sector, "Technology");
  assert.ok(report.risks.some((r) => r.includes("indirect sector-ETF proxy")));
});
