const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence, directionalAgreement } = require("./confidenceModel");

function metrics({ dataAvailable = true, enoughDataStatus = "SUFFICIENT", ageDays = 1 } = {}) {
  return { dataAvailable, enoughDataStatus, freshness: { ageDays } };
}

test("directionalAgreement: matching bullish trend + bullish momentum agree", () => {
  assert.equal(directionalAgreement("BULLISH", "STRONG_BULLISH"), "AGREE");
  assert.equal(directionalAgreement("BEARISH", "BEARISH"), "AGREE");
});

test("directionalAgreement: opposing directions conflict", () => {
  assert.equal(directionalAgreement("BULLISH", "STRONG_BEARISH"), "CONFLICT");
  assert.equal(directionalAgreement("BEARISH", "BULLISH"), "CONFLICT");
});

test("directionalAgreement: NEUTRAL on either side reports NONE, never a fabricated agreement/conflict", () => {
  assert.equal(directionalAgreement("NEUTRAL", "STRONG_BULLISH"), "NONE");
  assert.equal(directionalAgreement("BULLISH", "NEUTRAL"), "NONE");
});

test("computeConfidence: unavailable data reports 0 confidence, honestly", () => {
  const result = computeConfidence(metrics({ dataAvailable: false }), "NEUTRAL", "NEUTRAL");
  assert.equal(result.confidence, 0);
  assert.equal(result.dataCompleteness, "UNAVAILABLE");
});

test("computeConfidence: sufficient data + directional agreement + fresh data scores highest", () => {
  const result = computeConfidence(metrics({ enoughDataStatus: "SUFFICIENT", ageDays: 1 }), "BULLISH", "STRONG_BULLISH");
  assert.equal(result.confidence, 75); // 55 base + 20 agreement bonus
  assert.equal(result.agreement, "AGREE");
  assert.equal(result.freshnessPenaltyApplied, false);
});

test("computeConfidence: conflicting trend/momentum applies a real penalty", () => {
  const result = computeConfidence(metrics(), "BULLISH", "STRONG_BEARISH");
  assert.equal(result.confidence, 40); // 55 base - 15 conflict penalty
  assert.equal(result.agreement, "CONFLICT");
});

test("computeConfidence: stale data (>5 days old) applies a real freshness penalty", () => {
  const result = computeConfidence(metrics({ ageDays: 10 }), "NEUTRAL", "NEUTRAL");
  assert.equal(result.freshnessPenaltyApplied, true);
  assert.equal(result.confidence, 40); // 55 base - 15 stale penalty
});

test("computeConfidence: insufficient underlying data uses the lower base and never crosses into the sufficient-data range", () => {
  const result = computeConfidence(metrics({ enoughDataStatus: "INSUFFICIENT" }), "NEUTRAL", "NEUTRAL");
  assert.equal(result.dataCompleteness, "INSUFFICIENT");
  assert.equal(result.confidence, 20);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const result = computeConfidence(metrics({ enoughDataStatus: "INSUFFICIENT", ageDays: 30 }), "BULLISH", "STRONG_BEARISH");
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
});
