const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPriceEarningsSynthesis } = require("./priceEarningsSynthesis");

const result = (agentId, raw) => ({ agentId, result: { raw } });

test("joins healthy earnings and undervaluation into a plain-language supported-price assessment", () => {
  const report = buildPriceEarningsSynthesis([
    result("valuation", { dataAvailable: true, valuationStatus: "UNDERVALUED", estimatedFairValue: 120, discountToFairValue: 0.2, confidence: 76, sourceProvider: "SEC" }),
    result("earnings", { dataAvailable: true, earningsHealth: "STRONG", forwardOutlook: "POSITIVE", growthScore: 82, surpriseScore: 70, sourceProvider: "SEC" }),
  ]);
  assert.equal(report.assessment, "PRICE_SUPPORTED");
  assert.equal(report.valuation.priceGapPct, 20);
  assert.equal(report.complete, true);
});

test("never creates an assessment when verified inputs are missing", () => {
  const report = buildPriceEarningsSynthesis([]);
  assert.equal(report.assessment, "INSUFFICIENT_DATA");
  assert.equal(report.complete, false);
  assert.equal(report.blockers.length, 2);
});
