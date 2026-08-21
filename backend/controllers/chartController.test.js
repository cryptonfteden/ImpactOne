const test = require("node:test");
const assert = require("node:assert/strict");
const { assessCoverage } = require("./chartController");

function weeklyBars(count, start = "2025-08-04") {
  const date = new Date(`${start}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => ({ date: new Date(date.getTime() + index * 7 * 86400000).toISOString(), open: 1, high: 2, low: 1, close: 2, volume: 1 }));
}

test("one-year chart refuses to describe partial listing history as a complete year", () => {
  const result = assessCoverage(weeklyBars(11), "1y");
  assert.equal(result.complete, false);
  assert.match(result.reason, /Only 11 verified bars/);
});

test("one-year chart accepts a real year of weekly coverage", () => {
  assert.equal(assessCoverage(weeklyBars(53), "1y").complete, true);
});
