const test = require("node:test");
const assert = require("node:assert/strict");

const optionsIntelligenceService = require("./optionsIntelligenceService");

test("a plain call with no sweep/block classification is AMBIGUOUS, never automatically BULLISH", () => {
  const bias = optionsIntelligenceService.classifyDirectionalBias({ optionType: "CALL" });
  assert.equal(bias, "AMBIGUOUS");
});

test("a call that is part of a spread is explicitly HEDGING_OR_STRATEGY_AMBIGUOUS, not bullish", () => {
  const bias = optionsIntelligenceService.classifyDirectionalBias({ optionType: "CALL", sweepOrBlock: "SWEEP", isPartOfSpread: true });
  assert.equal(bias, "HEDGING_OR_STRATEGY_AMBIGUOUS");
});

test("a closing call transaction is not classified as a fresh bullish bet", () => {
  const bias = optionsIntelligenceService.classifyDirectionalBias({ optionType: "CALL", sweepOrBlock: "SWEEP", isOpeningTransaction: false });
  assert.equal(bias, "CLOSING_TRANSACTION_AMBIGUOUS");
});

test("only a confirmed opening sweep/block call gets a BULLISH_BIAS read, and it's named as bias, not a verdict", () => {
  const bias = optionsIntelligenceService.classifyDirectionalBias({ optionType: "CALL", sweepOrBlock: "SWEEP", isOpeningTransaction: true });
  assert.equal(bias, "BULLISH_BIAS");
});

test("the equivalent confirmed put sweep gets BEARISH_BIAS", () => {
  const bias = optionsIntelligenceService.classifyDirectionalBias({ optionType: "PUT", sweepOrBlock: "BLOCK", isOpeningTransaction: true });
  assert.equal(bias, "BEARISH_BIAS");
});

test("normalizeOptionsSnapshot computes a real call/put ratio and marks isRecommendation false", () => {
  const snapshot = optionsIntelligenceService.normalizeOptionsSnapshot({ symbol: "NVDA", callVolume: 40000, putVolume: 20000 });
  assert.equal(snapshot.callPutRatio, 2);
  assert.equal(snapshot.isRecommendation, false);
});

test("getFixtureSnapshot is labeled FIXTURE and includes at least one call NOT classified as bullish, proving the ambiguity rule holds even in the demo data", () => {
  const result = optionsIntelligenceService.getFixtureSnapshot("NVDA");
  assert.equal(result.status, "FIXTURE");
  const nonBullishCall = result.snapshots.find((snap) => snap.directionalBias !== "BULLISH_BIAS");
  assert.ok(nonBullishCall, "fixture must include a call that is NOT auto-classified bullish");
});
