const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTopHolders } = require("./topHoldersAnalyzer");

function position(managerName, { checked = true, shares, value, reportDate = "2026-03-31" }) {
  return { managerName, checked, currentQuarter: shares > 0 ? { shares, value, reportDate } : { shares: 0, value: 0, reportDate } };
}

test("analyzeTopHolders excludes real managers with no current real position", () => {
  const result = analyzeTopHolders([position("A", { shares: 0, value: 0 })]);
  assert.deepEqual(result, []);
});

test("analyzeTopHolders excludes an unchecked real manager", () => {
  const result = analyzeTopHolders([position("A", { checked: false, shares: 100, value: 1000 })]);
  assert.deepEqual(result, []);
});

test("analyzeTopHolders sorts real holders by real dollar value descending", () => {
  const result = analyzeTopHolders([position("Small Holder", { shares: 10, value: 100 }), position("Big Holder", { shares: 1000, value: 100000 })]);
  assert.equal(result.length, 2);
  assert.equal(result[0].managerName, "Big Holder");
  assert.equal(result[1].managerName, "Small Holder");
});

test("analyzeTopHolders reports the real reportDate alongside each holder", () => {
  const result = analyzeTopHolders([position("A", { shares: 10, value: 100, reportDate: "2026-06-30" })]);
  assert.equal(result[0].reportDate, "2026-06-30");
});
