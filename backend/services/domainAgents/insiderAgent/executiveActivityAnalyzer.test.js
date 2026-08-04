const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeExecutiveActivity } = require("./executiveActivityAnalyzer");

test("analyzeExecutiveActivity matches real CEO title variants", () => {
  const transactions = [
    { officerTitle: "Chief Executive Officer", transactionCode: "S" },
    { officerTitle: "President and CEO", transactionCode: "P" },
    { officerTitle: "Senior Vice President", transactionCode: "S" },
  ];
  const result = analyzeExecutiveActivity(transactions);
  assert.equal(result.ceoTransactions.length, 2);
  assert.equal(result.hasCeoActivity, true);
});

test("analyzeExecutiveActivity matches real CFO title variants", () => {
  const transactions = [
    { officerTitle: "Chief Financial Officer", transactionCode: "S" },
    { officerTitle: "Senior Vice President, CFO", transactionCode: "P" },
  ];
  const result = analyzeExecutiveActivity(transactions);
  assert.equal(result.cfoTransactions.length, 2);
  assert.equal(result.hasCfoActivity, true);
});

test("analyzeExecutiveActivity honestly reports no activity when no real title matches", () => {
  const transactions = [{ officerTitle: "General Counsel", transactionCode: "S" }, { officerTitle: null, transactionCode: "P" }];
  const result = analyzeExecutiveActivity(transactions);
  assert.equal(result.hasCeoActivity, false);
  assert.equal(result.hasCfoActivity, false);
  assert.deepEqual(result.ceoTransactions, []);
});

test("analyzeExecutiveActivity never matches a CEO title against CFO or vice versa", () => {
  const result = analyzeExecutiveActivity([{ officerTitle: "Chief Executive Officer", transactionCode: "S" }]);
  assert.equal(result.cfoTransactions.length, 0);
});
