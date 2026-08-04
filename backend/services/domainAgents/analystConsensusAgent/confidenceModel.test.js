const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

test("returns 0 when real data is unavailable", () => {
  const result = computeConfidence({ dataAvailable: false, periodCount: 0, coverageQuality: "UNKNOWN", priceTargetsAvailable: false });
  assert.equal(result.confidence, 0);
});

test("high coverage + multi-period + real price targets available scores highest", () => {
  const result = computeConfidence({ dataAvailable: true, periodCount: 4, coverageQuality: "HIGH", priceTargetsAvailable: true });
  assert.equal(result.confidence, 80);
});

test("applies the disclosed price-target penalty when real price targets are unavailable", () => {
  const withTargets = computeConfidence({ dataAvailable: true, periodCount: 4, coverageQuality: "HIGH", priceTargetsAvailable: true });
  const withoutTargets = computeConfidence({ dataAvailable: true, periodCount: 4, coverageQuality: "HIGH", priceTargetsAvailable: false });
  assert.ok(withoutTargets.confidence < withTargets.confidence);
});

test("single-period data (no real trend possible) scores lower than multi-period data", () => {
  const single = computeConfidence({ dataAvailable: true, periodCount: 1, coverageQuality: "MODERATE", priceTargetsAvailable: false });
  const multi = computeConfidence({ dataAvailable: true, periodCount: 3, coverageQuality: "MODERATE", priceTargetsAvailable: false });
  assert.ok(single.confidence < multi.confidence);
});
