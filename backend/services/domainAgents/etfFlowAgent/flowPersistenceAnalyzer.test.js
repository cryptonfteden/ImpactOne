const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeFlowPersistence } = require("./flowPersistenceAnalyzer");

function barsFromCloses(closes) {
  return closes.map((close) => ({ close }));
}

test("analyzeFlowPersistence honestly reports UNKNOWN with fewer than 2 real directional days", () => {
  const result = analyzeFlowPersistence(barsFromCloses([100]));
  assert.equal(result.classification, "UNKNOWN");
  assert.equal(result.persistenceRatio, null);
});

test("analyzeFlowPersistence: a real, consistently rising series reports HIGH persistence toward INFLOW", () => {
  const result = analyzeFlowPersistence(barsFromCloses([100, 101, 102, 103, 104, 105]));
  assert.equal(result.classification, "HIGH");
  assert.equal(result.dominantDirection, "INFLOW");
  assert.equal(result.persistenceRatio, 1);
});

test("analyzeFlowPersistence: a real, consistently falling series reports HIGH persistence toward OUTFLOW", () => {
  const result = analyzeFlowPersistence(barsFromCloses([105, 104, 103, 102, 101, 100]));
  assert.equal(result.classification, "HIGH");
  assert.equal(result.dominantDirection, "OUTFLOW");
});

test("analyzeFlowPersistence: a real, near-evenly-mixed direction series (5 vs 4) reports LOW persistence", () => {
  const result = analyzeFlowPersistence(barsFromCloses([100, 101, 100, 101, 100, 101, 100, 101, 100, 101]));
  assert.equal(result.classification, "LOW");
  assert.equal(result.persistenceRatio, Math.round((5 / 9) * 100) / 100);
});

test("analyzeFlowPersistence ignores real FLAT (no-change) days when computing the ratio", () => {
  const result = analyzeFlowPersistence(barsFromCloses([100, 100, 101, 102, 103]));
  assert.equal(result.dominantDirection, "INFLOW");
  assert.equal(result.persistenceRatio, 1);
});

test("analyzeFlowPersistence only considers the real disclosed lookback window", () => {
  const closes = [500, 400, 300, ...Array.from({ length: 10 }, (_, i) => 100 + i)]; // old wild swings, then a clean real uptrend
  const result = analyzeFlowPersistence(barsFromCloses(closes), { lookbackDays: 10 });
  assert.equal(result.dominantDirection, "INFLOW");
});
