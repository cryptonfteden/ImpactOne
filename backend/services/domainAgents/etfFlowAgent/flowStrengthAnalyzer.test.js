const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeFlowStrength } = require("./flowStrengthAnalyzer");

function bars(count, volume) {
  return Array.from({ length: count }, () => ({ close: 100, volume }));
}

test("analyzeFlowStrength honestly reports UNKNOWN with no real monthly flow or insufficient bars", () => {
  assert.deepEqual(analyzeFlowStrength(bars(5, 1000), null), { classification: "UNKNOWN", strengthRatio: null });
  assert.deepEqual(analyzeFlowStrength(bars(5, 1000), { dollarVolume: 1000 }), { classification: "UNKNOWN", strengthRatio: null });
});

test("analyzeFlowStrength: real recent monthly average volume matching the real baseline reports NORMAL", () => {
  const baselineBars = bars(60, 1000); // avg daily dollar volume = 100*1000 = 100,000
  const monthlyFlow = { dollarVolume: 100000 * 21 }; // monthly avg daily = 100,000 too => ratio 1.0
  const result = analyzeFlowStrength(baselineBars, monthlyFlow);
  assert.equal(result.classification, "NORMAL");
  assert.equal(result.strengthRatio, 1);
});

test("analyzeFlowStrength: real recent activity well above the real baseline reports HIGH", () => {
  const baselineBars = bars(60, 1000);
  const monthlyFlow = { dollarVolume: 100000 * 21 * 2 }; // 2x the baseline
  const result = analyzeFlowStrength(baselineBars, monthlyFlow);
  assert.equal(result.classification, "HIGH");
});

test("analyzeFlowStrength: real recent activity well below the real baseline reports LOW", () => {
  const baselineBars = bars(60, 1000);
  const monthlyFlow = { dollarVolume: 100000 * 21 * 0.5 };
  const result = analyzeFlowStrength(baselineBars, monthlyFlow);
  assert.equal(result.classification, "LOW");
});
