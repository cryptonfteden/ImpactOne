const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeBorrowStress } = require("./borrowStressAnalyzer");

test("analyzeBorrowStress always honestly reports unavailable, never a fabricated utilization/fee/shares-on-loan figure", () => {
  const result = analyzeBorrowStress();
  assert.equal(result.dataAvailable, false);
  assert.equal(result.utilizationPercent, null);
  assert.equal(result.borrowFeePercent, null);
  assert.equal(result.sharesOnLoan, null);
  assert.ok(result.unavailableReason.length > 0);
});
