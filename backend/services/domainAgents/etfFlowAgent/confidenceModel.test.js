const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

test("computeConfidence: no real data reports 0 confidence, honestly", () => {
  const { confidence } = computeConfidence({ dataAvailable: false, isDirectEtf: false, barsCount: 0, persistenceClassification: "UNKNOWN" });
  assert.equal(confidence, 0);
});

test("computeConfidence: a direct ETF read scores higher than an indirect sector-proxy read, all else equal", () => {
  const direct = computeConfidence({ dataAvailable: true, isDirectEtf: true, barsCount: 60, persistenceClassification: "LOW" });
  const indirect = computeConfidence({ dataAvailable: true, isDirectEtf: false, barsCount: 60, persistenceClassification: "LOW" });
  assert.ok(direct.confidence > indirect.confidence);
});

test("computeConfidence: real high flow persistence adds more confidence than moderate, which adds more than low", () => {
  const high = computeConfidence({ dataAvailable: true, isDirectEtf: true, barsCount: 60, persistenceClassification: "HIGH" });
  const moderate = computeConfidence({ dataAvailable: true, isDirectEtf: true, barsCount: 60, persistenceClassification: "MODERATE" });
  const low = computeConfidence({ dataAvailable: true, isDirectEtf: true, barsCount: 60, persistenceClassification: "LOW" });
  assert.ok(high.confidence > moderate.confidence);
  assert.ok(moderate.confidence > low.confidence);
});

test("computeConfidence: a real, fixed structural penalty is always applied for the always-unavailable dimensions", () => {
  const { components } = computeConfidence({ dataAvailable: true, isDirectEtf: true, barsCount: 60, persistenceClassification: "HIGH" });
  assert.equal(components.structuralPenalty, 10);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const { confidence } = computeConfidence({ dataAvailable: true, isDirectEtf: true, barsCount: 1000, persistenceClassification: "HIGH" });
  assert.ok(confidence <= 100);
});
