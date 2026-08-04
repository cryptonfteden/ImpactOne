const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeFundConcentration } = require("./fundConcentrationAnalyzer");

test("analyzeFundConcentration always honestly reports unavailable, never a fabricated concentration figure", () => {
  const result = analyzeFundConcentration();
  assert.equal(result.dataAvailable, false);
  assert.equal(result.topHoldingsWeightPercent, null);
  assert.ok(result.unavailableReason.length > 0);
});
