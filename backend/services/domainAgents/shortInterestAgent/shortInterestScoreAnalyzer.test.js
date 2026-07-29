const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeShortInterestScore } = require("./shortInterestScoreAnalyzer");

test("analyzeShortInterestScore honestly reports NEUTRAL at score 0 with no real delta", () => {
  const result = analyzeShortInterestScore({ delta: null });
  assert.equal(result.shortInterestBias, "NEUTRAL");
  assert.equal(result.shortInterestScore, 0);
});

test("analyzeShortInterestScore: a real DECREASE in short-selling volume (negative delta) maps to a positive, BULLISH score", () => {
  const result = analyzeShortInterestScore({ delta: -0.05 });
  assert.equal(result.shortInterestBias, "BULLISH");
  assert.equal(result.shortInterestScore, 50);
});

test("analyzeShortInterestScore: a real INCREASE in short-selling volume (positive delta) maps to a negative, BEARISH score", () => {
  const result = analyzeShortInterestScore({ delta: 0.05 });
  assert.equal(result.shortInterestBias, "BEARISH");
  assert.equal(result.shortInterestScore, -50);
});

test("analyzeShortInterestScore: a real small delta within the neutral band reports NEUTRAL", () => {
  const result = analyzeShortInterestScore({ delta: 0.005 });
  assert.equal(result.shortInterestBias, "NEUTRAL");
});

test("analyzeShortInterestScore clamps a real large delta to the full ±100 scale", () => {
  const result = analyzeShortInterestScore({ delta: -1 });
  assert.equal(result.shortInterestScore, 100);
});
