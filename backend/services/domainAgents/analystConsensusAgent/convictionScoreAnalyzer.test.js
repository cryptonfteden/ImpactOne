const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeConviction } = require("./convictionScoreAnalyzer");

test("scores 100 when every real rating is extreme (strongBuy/strongSell)", () => {
  const result = analyzeConviction({ strongBuy: 5, buy: 0, hold: 0, sell: 0, strongSell: 5 });
  assert.equal(result.convictionScore, 100);
});

test("scores 0 when every real rating is moderate (buy/hold/sell)", () => {
  const result = analyzeConviction({ strongBuy: 0, buy: 5, hold: 5, sell: 5, strongSell: 0 });
  assert.equal(result.convictionScore, 0);
});

test("honestly reports null with no real latest period", () => {
  assert.equal(analyzeConviction(null).convictionScore, null);
});

test("honestly reports null with zero real analysts", () => {
  assert.equal(analyzeConviction({ strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 }).convictionScore, null);
});
