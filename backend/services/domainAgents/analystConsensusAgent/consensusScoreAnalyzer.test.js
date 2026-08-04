const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeConsensusScore, computeWeightedScore } = require("./consensusScoreAnalyzer");

test("computeWeightedScore: all strongBuy scores +100", () => {
  assert.equal(computeWeightedScore({ strongBuy: 10, buy: 0, hold: 0, sell: 0, strongSell: 0 }), 100);
});

test("computeWeightedScore: all strongSell scores -100", () => {
  assert.equal(computeWeightedScore({ strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 10 }), -100);
});

test("computeWeightedScore: all hold scores 0", () => {
  assert.equal(computeWeightedScore({ strongBuy: 0, buy: 0, hold: 10, sell: 0, strongSell: 0 }), 0);
});

test("computeWeightedScore: honestly returns null with zero real analysts", () => {
  assert.equal(computeWeightedScore({ strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 }), null);
});

test("analyzeConsensusScore: uses the real latest (last) period, not the first", () => {
  const periods = [
    { period: "2026-06-01", strongBuy: 0, buy: 0, hold: 0, sell: 10, strongSell: 0 },
    { period: "2026-07-01", strongBuy: 10, buy: 0, hold: 0, sell: 0, strongSell: 0 },
  ];
  const result = analyzeConsensusScore(periods);
  assert.equal(result.consensusScore, 100);
  assert.equal(result.totalAnalysts, 10);
  assert.equal(result.latestPeriod.period, "2026-07-01");
});

test("analyzeConsensusScore: honestly reports null/empty with no real periods", () => {
  const result = analyzeConsensusScore([]);
  assert.equal(result.consensusScore, null);
  assert.equal(result.totalAnalysts, 0);
  assert.equal(result.latestPeriod, null);
});
