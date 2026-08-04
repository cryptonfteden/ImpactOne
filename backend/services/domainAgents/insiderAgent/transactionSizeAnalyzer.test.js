const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTransactionSize, tierOf } = require("./transactionSizeAnalyzer");

test("tierOf classifies real dollar values into the disclosed tiers", () => {
  assert.equal(tierOf(50_000), "LOW");
  assert.equal(tierOf(100_000), "MODERATE");
  assert.equal(tierOf(999_999), "MODERATE");
  assert.equal(tierOf(1_000_000), "HIGH");
});

test("analyzeTransactionSize honestly reports NONE with no real, priced P/S transactions", () => {
  const result = analyzeTransactionSize([{ transactionCode: "A", shares: 1000, pricePerShare: null }]);
  assert.equal(result.overallSignificance, "NONE");
  assert.equal(result.largestTransaction, null);
});

test("analyzeTransactionSize computes real total dollar volume and identifies the real largest transaction", () => {
  const transactions = [
    { transactionCode: "P", shares: 100, pricePerShare: 10 }, // $1,000
    { transactionCode: "S", shares: 50, pricePerShare: 20000 }, // $1,000,000
  ];
  const result = analyzeTransactionSize(transactions);
  assert.equal(result.totalDollarVolume, 1_001_000);
  assert.equal(result.largestTransaction.shares, 50);
  assert.equal(result.overallSignificance, "HIGH");
});

test("analyzeTransactionSize ignores a grant/exercise transaction even when it has real share counts", () => {
  const result = analyzeTransactionSize([{ transactionCode: "M", shares: 100000, pricePerShare: 50 }]);
  assert.equal(result.overallSignificance, "NONE");
});
