const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

function sourceQuality(distinctSourceCount, credibilityScore) {
  return { distinctSourceCount, credibilityScore };
}

test("computeConfidence: no real news data reports 0 confidence, honestly", () => {
  const { confidence } = computeConfidence({ newsAvailable: false, articleCount: 0, sourceQuality: sourceQuality(0, 0), socialAvailable: false, hasAbnormalActivity: false });
  assert.equal(confidence, 0);
});

test("computeConfidence: real news with maximum sample size, diversity, and credibility, no penalties, reaches the full base+bonus ceiling", () => {
  const { confidence, components } = computeConfidence({
    newsAvailable: true,
    articleCount: 50,
    sourceQuality: sourceQuality(10, 100),
    socialAvailable: true,
    hasAbnormalActivity: false,
  });
  assert.equal(confidence, 90); // 40 base + 20 sample + 15 diversity + 15 credibility
  assert.equal(components.socialPenalty, 0);
  assert.equal(components.abnormalPenalty, 0);
});

test("computeConfidence: real social unavailability applies the disclosed penalty", () => {
  const withSocial = computeConfidence({ newsAvailable: true, articleCount: 50, sourceQuality: sourceQuality(10, 100), socialAvailable: true, hasAbnormalActivity: false });
  const withoutSocial = computeConfidence({ newsAvailable: true, articleCount: 50, sourceQuality: sourceQuality(10, 100), socialAvailable: false, hasAbnormalActivity: false });
  assert.equal(withSocial.confidence - withoutSocial.confidence, 10);
});

test("computeConfidence: real detected abnormal activity applies the disclosed uncertainty penalty", () => {
  const stable = computeConfidence({ newsAvailable: true, articleCount: 50, sourceQuality: sourceQuality(10, 100), socialAvailable: true, hasAbnormalActivity: false });
  const abnormal = computeConfidence({ newsAvailable: true, articleCount: 50, sourceQuality: sourceQuality(10, 100), socialAvailable: true, hasAbnormalActivity: true });
  assert.equal(stable.confidence - abnormal.confidence, 10);
});

test("computeConfidence: a real small sample size and low diversity reduce confidence below the ceiling", () => {
  const { confidence } = computeConfidence({ newsAvailable: true, articleCount: 1, sourceQuality: sourceQuality(1, 0), socialAvailable: true, hasAbnormalActivity: false });
  assert.ok(confidence < 90);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const { confidence } = computeConfidence({ newsAvailable: true, articleCount: 0, sourceQuality: sourceQuality(0, 0), socialAvailable: false, hasAbnormalActivity: true });
  assert.ok(confidence >= 0 && confidence <= 100);
});
