const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

test("computeConfidence: unavailable data reports 0 confidence, honestly", () => {
  const { confidence } = computeConfidence({ dataAvailable: false });
  assert.equal(confidence, 0);
});

test("computeConfidence: sufficient data with no entry zone and no timeframe agreement uses only the base", () => {
  const { confidence, components } = computeConfidence({
    dataAvailable: true,
    enoughDataStatus: "SUFFICIENT",
    entryZone: null,
    timeframeAgreement: "UNKNOWN",
    avgReactionStrength: null,
  });
  assert.equal(confidence, 30);
  assert.equal(components.base, 30);
  assert.equal(components.confluenceBonus, 0);
});

test("computeConfidence: insufficient underlying data uses the lower base", () => {
  const { confidence } = computeConfidence({
    dataAvailable: true,
    enoughDataStatus: "INSUFFICIENT",
    entryZone: null,
    timeframeAgreement: "UNKNOWN",
    avgReactionStrength: null,
  });
  assert.equal(confidence, 10);
});

test("computeConfidence: a real entry zone's confluence score raises confidence, capped at the disclosed max", () => {
  const low = computeConfidence({ dataAvailable: true, enoughDataStatus: "SUFFICIENT", entryZone: { confluenceScore: 1 }, timeframeAgreement: "UNKNOWN", avgReactionStrength: null });
  const high = computeConfidence({ dataAvailable: true, enoughDataStatus: "SUFFICIENT", entryZone: { confluenceScore: 10 }, timeframeAgreement: "UNKNOWN", avgReactionStrength: null });
  assert.ok(high.confidence > low.confidence);
  assert.equal(high.components.confluenceBonus, 30); // capped at the disclosed max even for a very high score
});

test("computeConfidence: real timeframe AGREE adds a bonus, real CONFLICT subtracts a penalty", () => {
  const agree = computeConfidence({ dataAvailable: true, enoughDataStatus: "SUFFICIENT", entryZone: null, timeframeAgreement: "AGREE", avgReactionStrength: null });
  const conflict = computeConfidence({ dataAvailable: true, enoughDataStatus: "SUFFICIENT", entryZone: null, timeframeAgreement: "CONFLICT", avgReactionStrength: null });
  assert.equal(agree.confidence, 50); // 30 + 20
  assert.equal(conflict.confidence, 15); // 30 - 15
});

test("computeConfidence: real average price-reaction strength adds a proportional bonus", () => {
  const { confidence, components } = computeConfidence({
    dataAvailable: true,
    enoughDataStatus: "SUFFICIENT",
    entryZone: null,
    timeframeAgreement: "UNKNOWN",
    avgReactionStrength: 0.5,
  });
  assert.equal(components.reactionBonus, 10); // 0.5 * 20
  assert.equal(confidence, 40);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const { confidence } = computeConfidence({
    dataAvailable: true,
    enoughDataStatus: "SUFFICIENT",
    entryZone: { confluenceScore: 20 },
    timeframeAgreement: "AGREE",
    avgReactionStrength: 1,
  });
  assert.ok(confidence <= 100);
});
