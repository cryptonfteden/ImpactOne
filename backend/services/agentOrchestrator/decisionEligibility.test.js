const test = require("node:test");
const assert = require("node:assert/strict");
const { decisionEligibilityFlag, isDecisionEligible } = require("./decisionEligibility");

test("explicitly ineligible fulfilled evidence never enters a committee decision", () => {
  const row = { status: "fulfilled", result: { raw: { signalEligible: false, dataAvailable: true } } };
  assert.equal(decisionEligibilityFlag(row), false);
  assert.equal(isDecisionEligible(row), false);
});

test("unavailable real data is excluded even when an old adapter omitted the flag", () => {
  assert.equal(isDecisionEligible({ status: "fulfilled", result: { raw: { dataAvailable: false } } }), false);
});

test("legacy/custom fulfilled agents remain eligible when no quality flag exists", () => {
  assert.equal(decisionEligibilityFlag({ status: "fulfilled", result: {} }), null);
  assert.equal(isDecisionEligible({ status: "fulfilled", result: {} }), true);
});
