const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeNetInsiderActivity } = require("./netInsiderActivityAnalyzer");

function txn(code, shares, price) {
  return { transactionCode: code, shares, pricePerShare: price };
}

test("analyzeNetInsiderActivity only counts real open-market P/S transactions, ignoring grants/exercises/gifts", () => {
  const result = analyzeNetInsiderActivity([txn("P", 100, 10), txn("A", 500, 10), txn("M", 200, null), txn("G", 50, null)]);
  assert.equal(result.buyCount, 1);
  assert.equal(result.sellCount, 0);
});

test("analyzeNetInsiderActivity: real buys only => BULLISH with a positive score", () => {
  const result = analyzeNetInsiderActivity([txn("P", 100, 10), txn("P", 50, 10)]);
  assert.equal(result.insiderActivity, "BULLISH");
  assert.equal(result.netInsiderScore, 100);
  assert.equal(result.buyValue, 1500);
});

test("analyzeNetInsiderActivity: real sells only => BEARISH with a negative score", () => {
  const result = analyzeNetInsiderActivity([txn("S", 100, 10)]);
  assert.equal(result.insiderActivity, "BEARISH");
  assert.equal(result.netInsiderScore, -100);
  assert.equal(result.sellValue, 1000);
});

test("analyzeNetInsiderActivity: no real dollar activity => NEUTRAL with an honest 0 score, never a fabricated lean", () => {
  const result = analyzeNetInsiderActivity([]);
  assert.equal(result.insiderActivity, "NEUTRAL");
  assert.equal(result.netInsiderScore, 0);
});

test("analyzeNetInsiderActivity: a real, roughly balanced mix of buys/sells stays within the NEUTRAL band", () => {
  const result = analyzeNetInsiderActivity([txn("P", 100, 10), txn("S", 105, 10)]);
  assert.equal(result.insiderActivity, "NEUTRAL");
});

test("analyzeNetInsiderActivity ignores a P/S transaction with no real, finite price when computing dollar value", () => {
  const result = analyzeNetInsiderActivity([txn("P", 100, null)]);
  assert.equal(result.buyValue, 0);
  assert.equal(result.buyCount, 1, "the real transaction count still includes it, only its dollar value is honestly 0");
});
