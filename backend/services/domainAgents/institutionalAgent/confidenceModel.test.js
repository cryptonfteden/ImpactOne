const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

test("computeConfidence: no real data reports 0 confidence, honestly", () => {
  const { confidence } = computeConfidence({ dataAvailable: false, totalManagers: 7, checkedCount: 0, comparableManagerCount: 0, convictionScore: 0 });
  assert.equal(confidence, 0);
});

test("computeConfidence: full real coverage, full comparability, and full conviction reaches the ceiling minus the fixed structural penalty", () => {
  const { confidence, components } = computeConfidence({ dataAvailable: true, totalManagers: 7, checkedCount: 7, comparableManagerCount: 7, convictionScore: 100 });
  assert.equal(confidence, 80); // 30 + 25 + 20 + 15 - 10
  assert.equal(components.structuralPenalty, 10);
});

test("computeConfidence: partial real coverage scores lower than full coverage", () => {
  const full = computeConfidence({ dataAvailable: true, totalManagers: 7, checkedCount: 7, comparableManagerCount: 7, convictionScore: 50 });
  const partial = computeConfidence({ dataAvailable: true, totalManagers: 7, checkedCount: 3, comparableManagerCount: 3, convictionScore: 50 });
  assert.ok(partial.confidence < full.confidence);
});

test("computeConfidence: higher real conviction scores higher confidence, all else equal", () => {
  const highConviction = computeConfidence({ dataAvailable: true, totalManagers: 7, checkedCount: 5, comparableManagerCount: 5, convictionScore: 100 });
  const lowConviction = computeConfidence({ dataAvailable: true, totalManagers: 7, checkedCount: 5, comparableManagerCount: 5, convictionScore: 0 });
  assert.ok(highConviction.confidence > lowConviction.confidence);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const { confidence } = computeConfidence({ dataAvailable: true, totalManagers: 7, checkedCount: 7, comparableManagerCount: 7, convictionScore: 100 });
  assert.ok(confidence >= 0 && confidence <= 100);
});
