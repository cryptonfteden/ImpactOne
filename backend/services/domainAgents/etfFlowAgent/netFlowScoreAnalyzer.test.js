const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeNetFlowScore } = require("./netFlowScoreAnalyzer");

function flow(direction) {
  return { direction };
}

test("analyzeNetFlowScore: all real windows INFLOW reports the maximum real bullish score", () => {
  const result = analyzeNetFlowScore({ daily: flow("INFLOW"), weekly: flow("INFLOW"), monthly: flow("INFLOW") });
  assert.equal(result.netFlowScore, 100);
  assert.equal(result.etfFlowBias, "BULLISH");
});

test("analyzeNetFlowScore: all real windows OUTFLOW reports the maximum real bearish score", () => {
  const result = analyzeNetFlowScore({ daily: flow("OUTFLOW"), weekly: flow("OUTFLOW"), monthly: flow("OUTFLOW") });
  assert.equal(result.netFlowScore, -100);
  assert.equal(result.etfFlowBias, "BEARISH");
});

test("analyzeNetFlowScore: a real, dominant monthly INFLOW outweighs a shorter-term OUTFLOW (monthly weighted most heavily)", () => {
  const result = analyzeNetFlowScore({ daily: flow("OUTFLOW"), weekly: flow("OUTFLOW"), monthly: flow("INFLOW") });
  assert.equal(result.netFlowScore, 0); // 0.5 - 0.3 - 0.2 = 0
});

test("analyzeNetFlowScore: missing real windows honestly contribute 0, never a fabricated lean", () => {
  const result = analyzeNetFlowScore({ daily: null, weekly: null, monthly: flow("INFLOW") });
  assert.equal(result.netFlowScore, 50);
});

test("analyzeNetFlowScore: a real, small net score inside the neutral band reports NEUTRAL", () => {
  const result = analyzeNetFlowScore({ daily: flow("INFLOW"), weekly: flow("OUTFLOW"), monthly: flow("FLAT") });
  assert.equal(result.etfFlowBias, "NEUTRAL");
});
