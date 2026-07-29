const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeOfficerDirectorActivity } = require("./officerDirectorAnalyzer");

function txn({ code, shares, price, isOfficer = false, isDirector = false, isTenPercentOwner = false }) {
  return { transactionCode: code, shares, pricePerShare: price, isOfficer, isDirector, isTenPercentOwner };
}

test("analyzeOfficerDirectorActivity tallies real officer-only transactions separately from director-only", () => {
  const transactions = [
    txn({ code: "P", shares: 100, price: 10, isOfficer: true }),
    txn({ code: "S", shares: 50, price: 20, isDirector: true }),
  ];
  const result = analyzeOfficerDirectorActivity(transactions);
  assert.equal(result.officer.buyCount, 1);
  assert.equal(result.officer.sellCount, 0);
  assert.equal(result.director.buyCount, 0);
  assert.equal(result.director.sellCount, 1);
});

test("analyzeOfficerDirectorActivity counts a real insider who is both officer AND director in both buckets", () => {
  const transactions = [txn({ code: "P", shares: 100, price: 10, isOfficer: true, isDirector: true })];
  const result = analyzeOfficerDirectorActivity(transactions);
  assert.equal(result.officer.buyCount, 1);
  assert.equal(result.director.buyCount, 1);
});

test("analyzeOfficerDirectorActivity tallies real ten-percent-owner transactions independently", () => {
  const transactions = [txn({ code: "S", shares: 1000, price: 5, isTenPercentOwner: true })];
  const result = analyzeOfficerDirectorActivity(transactions);
  assert.equal(result.tenPercentOwner.sellCount, 1);
  assert.equal(result.tenPercentOwner.sellValue, 5000);
});

test("analyzeOfficerDirectorActivity honestly reports all-zero tallies for an empty real transaction set", () => {
  const result = analyzeOfficerDirectorActivity([]);
  assert.equal(result.officer.buyCount, 0);
  assert.equal(result.director.sellValue, 0);
});
