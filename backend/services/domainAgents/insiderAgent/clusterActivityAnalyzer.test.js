const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeClusterActivity } = require("./clusterActivityAnalyzer");

function txn(ownerCik, code, date) {
  return { ownerCik, transactionCode: code, transactionDate: date };
}

test("analyzeClusterActivity honestly reports no cluster for an empty real transaction set", () => {
  const result = analyzeClusterActivity([]);
  assert.equal(result.clusterBuy, false);
  assert.equal(result.clusterSell, false);
});

test("analyzeClusterActivity detects a real cluster buy: 3+ distinct real insiders buying within the window", () => {
  const transactions = [txn("A", "P", "2026-01-01"), txn("B", "P", "2026-01-05"), txn("C", "P", "2026-01-10")];
  const result = analyzeClusterActivity(transactions);
  assert.equal(result.clusterBuy, true);
  assert.equal(result.distinctBuyers, 3);
});

test("analyzeClusterActivity does not flag a cluster for fewer than the disclosed minimum distinct insiders", () => {
  const transactions = [txn("A", "P", "2026-01-01"), txn("B", "P", "2026-01-05")];
  const result = analyzeClusterActivity(transactions);
  assert.equal(result.clusterBuy, false);
  assert.equal(result.distinctBuyers, 2);
});

test("analyzeClusterActivity never double-counts the same real insider transacting multiple times", () => {
  const transactions = [txn("A", "P", "2026-01-01"), txn("A", "P", "2026-01-02"), txn("A", "P", "2026-01-03")];
  const result = analyzeClusterActivity(transactions);
  assert.equal(result.distinctBuyers, 1);
  assert.equal(result.clusterBuy, false);
});

test("analyzeClusterActivity excludes a real transaction outside the disclosed window, anchored to the most recent real transaction", () => {
  const transactions = [
    txn("A", "P", "2026-01-01"), // outside a 30-day window anchored to 2026-03-01
    txn("B", "P", "2026-02-25"),
    txn("C", "P", "2026-03-01"),
  ];
  const result = analyzeClusterActivity(transactions, { windowDays: 30, minDistinctInsiders: 3 });
  assert.equal(result.distinctBuyers, 2, "the Jan 1 transaction is outside the 30-day window anchored to the latest real transaction");
});

test("analyzeClusterActivity detects real cluster selling independently of buying", () => {
  const transactions = [txn("A", "S", "2026-01-01"), txn("B", "S", "2026-01-02"), txn("C", "S", "2026-01-03"), txn("D", "P", "2026-01-03")];
  const result = analyzeClusterActivity(transactions);
  assert.equal(result.clusterSell, true);
  assert.equal(result.clusterBuy, false);
});
