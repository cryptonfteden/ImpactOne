const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePassiveActiveImpact, magnitudeTierOf } = require("./passiveActiveAnalyzer");

test("magnitudeTierOf classifies real dollar volumes into the disclosed tiers", () => {
  assert.equal(magnitudeTierOf(50_000_000), "LOW");
  assert.equal(magnitudeTierOf(100_000_000), "MODERATE");
  assert.equal(magnitudeTierOf(999_999_999), "MODERATE");
  assert.equal(magnitudeTierOf(1_000_000_000), "HIGH");
});

test("analyzePassiveActiveImpact honestly reports UNKNOWN classification for an unrecognized ticker", () => {
  const result = analyzePassiveActiveImpact(null, { direction: "INFLOW", dollarVolume: 1000 });
  assert.equal(result.classification, "UNKNOWN");
});

test("analyzePassiveActiveImpact passes through a real disclosed classification and real monthly flow direction/magnitude", () => {
  const result = analyzePassiveActiveImpact("PASSIVE", { direction: "OUTFLOW", dollarVolume: 2_000_000_000 });
  assert.equal(result.classification, "PASSIVE");
  assert.equal(result.direction, "OUTFLOW");
  assert.equal(result.magnitudeTier, "HIGH");
});

test("analyzePassiveActiveImpact honestly reports UNKNOWN magnitude with no real monthly flow", () => {
  const result = analyzePassiveActiveImpact("ACTIVE", null);
  assert.equal(result.magnitudeTier, "UNKNOWN");
  assert.equal(result.direction, null);
});
