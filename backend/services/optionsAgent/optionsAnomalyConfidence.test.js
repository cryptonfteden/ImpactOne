require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const confidence = require("./optionsAnomalyConfidence");

test("computeSizeScore maps the trigger multiple to 60 and saturates near 100 well above it", () => {
  assert.equal(confidence.computeSizeScore(5, 5), 60);
  assert.equal(confidence.computeSizeScore(20, 5), 100);
});

test("computeSizeScore is honestly null when there is no real multiple (baseline bootstrap window)", () => {
  assert.equal(confidence.computeSizeScore(null), null);
  assert.equal(confidence.computeSizeScore(undefined), null);
});

test("oiConfirmationAdjustment rewards confirmed new positioning and penalizes confirmed closing", () => {
  assert.equal(confidence.oiConfirmationAdjustment("CONFIRMED_NEW_POSITION"), 15);
  assert.equal(confidence.oiConfirmationAdjustment("CONFIRMED_CLOSING"), -20);
  assert.equal(confidence.oiConfirmationAdjustment("UNCONFIRMED"), -10);
  assert.equal(confidence.oiConfirmationAdjustment("PENDING"), 0);
});

test("skewCorroborationAdjustment rewards agreement and penalizes contradiction", () => {
  assert.equal(confidence.skewCorroborationAdjustment({ hasSkewSignal: true, skewDirection: "BULLISH_LEANING", tradeDirection: "BUY" }), 10);
  assert.equal(confidence.skewCorroborationAdjustment({ hasSkewSignal: true, skewDirection: "BEARISH_LEANING", tradeDirection: "BUY" }), -10);
  assert.equal(confidence.skewCorroborationAdjustment({ hasSkewSignal: false }), 0);
});

test("computeAnomalyScore returns null when there is no computable evidence at all", () => {
  assert.equal(confidence.computeAnomalyScore({}), null);
});

test("computeAnomalyScore stays within 0-100 and rewards a sweep+block combination over volume alone", () => {
  const volumeOnly = confidence.computeAnomalyScore({ volumeMultiple: 6, hasVolumeSpike: true });
  const sweepAndBlock = confidence.computeAnomalyScore({ volumeMultiple: 6, hasVolumeSpike: true, hasSweep: true, hasBlock: true, oiConfirmationStatus: "CONFIRMED_NEW_POSITION" });
  assert.ok(volumeOnly >= 0 && volumeOnly <= 100);
  assert.ok(sweepAndBlock >= 0 && sweepAndBlock <= 100);
  assert.ok(sweepAndBlock > volumeOnly);
});

test("computeAnomalyScore never exceeds 100 even with every positive adjustment stacked", () => {
  const score = confidence.computeAnomalyScore({ volumeMultiple: 100, hasVolumeSpike: true, hasSweep: true, hasBlock: true, oiConfirmationStatus: "CONFIRMED_NEW_POSITION", hasSkewSignal: true, skewDirection: "BULLISH_LEANING", tradeDirection: "BUY" });
  assert.ok(score <= 100);
});
