const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeOwnershipTrend } = require("./ownershipTrendAnalyzer");

function txn(ownerCik, ownerName, date, sharesOwnedAfter) {
  return { ownerCik, ownerName, transactionDate: date, sharesOwnedAfter };
}

test("analyzeOwnershipTrend honestly reports STABLE with no real usable data", () => {
  const result = analyzeOwnershipTrend([]);
  assert.equal(result.trend, "STABLE");
  assert.equal(result.netOwnershipChange, 0);
});

test("analyzeOwnershipTrend computes a real per-owner change from their earliest to latest real reported share count", () => {
  const transactions = [txn("A", "Alice", "2026-01-01", 1000), txn("A", "Alice", "2026-02-01", 1500)];
  const result = analyzeOwnershipTrend(transactions);
  assert.equal(result.perOwnerChanges.length, 1);
  assert.equal(result.perOwnerChanges[0].change, 500);
  assert.equal(result.trend, "INCREASING");
});

test("analyzeOwnershipTrend sorts a real owner's transactions chronologically before computing the change, regardless of input order", () => {
  const transactions = [txn("A", "Alice", "2026-02-01", 1500), txn("A", "Alice", "2026-01-01", 1000)];
  const result = analyzeOwnershipTrend(transactions);
  assert.equal(result.perOwnerChanges[0].change, 500);
});

test("analyzeOwnershipTrend aggregates real changes across multiple distinct owners", () => {
  const transactions = [
    txn("A", "Alice", "2026-01-01", 1000),
    txn("A", "Alice", "2026-02-01", 1500), // +500
    txn("B", "Bob", "2026-01-01", 2000),
    txn("B", "Bob", "2026-02-01", 1000), // -1000
  ];
  const result = analyzeOwnershipTrend(transactions);
  assert.equal(result.netOwnershipChange, -500);
  assert.equal(result.trend, "DECREASING");
});

test("analyzeOwnershipTrend ignores a real transaction missing a usable ownerCik/date/sharesOwnedAfter", () => {
  const transactions = [{ ownerCik: null, transactionDate: "2026-01-01", sharesOwnedAfter: 1000 }];
  const result = analyzeOwnershipTrend(transactions);
  assert.deepEqual(result.perOwnerChanges, []);
});
