const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

test("returns 0 when real data is unavailable", () => {
  const result = computeConfidence({ dataAvailable: false, articleCount: 0, confirmationScore: 0, profileAvailable: false });
  assert.equal(result.confidence, 0);
});

test("scores highest with a large real sample, strong real confirmation, and an available real profile", () => {
  const result = computeConfidence({ dataAvailable: true, articleCount: 20, confirmationScore: 100, profileAvailable: true });
  assert.equal(result.confidence, 90);
});

test("applies the disclosed profile penalty when the real company profile is unavailable", () => {
  const withProfile = computeConfidence({ dataAvailable: true, articleCount: 10, confirmationScore: 50, profileAvailable: true });
  const withoutProfile = computeConfidence({ dataAvailable: true, articleCount: 10, confirmationScore: 50, profileAvailable: false });
  assert.ok(withoutProfile.confidence < withProfile.confidence);
});

test("a small real sample scores lower than a large real sample, all else equal", () => {
  const small = computeConfidence({ dataAvailable: true, articleCount: 1, confirmationScore: 50, profileAvailable: true });
  const large = computeConfidence({ dataAvailable: true, articleCount: 20, confirmationScore: 50, profileAvailable: true });
  assert.ok(small.confidence < large.confidence);
});
