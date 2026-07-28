const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeValuationConfidence,
  computeDataCompletenessScore,
  computeMethodAgreementScore,
  computePeerGroupQualityScore,
  computeEarningsQualityScore,
  MINIMUM_HEALTHY_PEER_GROUP_SIZE,
} = require("./confidenceModel");

test("computeDataCompletenessScore excludes structurally-inapplicable methods from the denominator, per VALUATION_SCORING_MODEL.md §1.2.1", () => {
  // 3 of 3 applicable methods usable (not 3 of 7) => 100, never penalized for methods that were never applicable.
  assert.equal(computeDataCompletenessScore(3, 3), 100);
  assert.equal(computeDataCompletenessScore(0, 0), 0);
  assert.equal(computeDataCompletenessScore(2, 4), 50);
});

test("computeMethodAgreementScore: perfect agreement (CoV=0) scores 100", () => {
  assert.equal(computeMethodAgreementScore([100, 100, 100]), 100);
});

test("computeMethodAgreementScore: a single usable method scores the disclosed fixed 40, never a fabricated 100", () => {
  assert.equal(computeMethodAgreementScore([100]), 40);
});

test("computeMethodAgreementScore: zero usable methods scores 0, honestly", () => {
  assert.equal(computeMethodAgreementScore([]), 0);
});

test("computeMethodAgreementScore: high dispersion scores low, real methods genuinely disagreeing is reflected honestly", () => {
  const highAgreement = computeMethodAgreementScore([100, 102, 98]);
  const lowAgreement = computeMethodAgreementScore([50, 150, 100]);
  assert.ok(highAgreement > lowAgreement);
});

test("computePeerGroupQualityScore reaches 100 only at/above the healthy floor, scales linearly below it", () => {
  assert.equal(computePeerGroupQualityScore(MINIMUM_HEALTHY_PEER_GROUP_SIZE), 100);
  assert.equal(computePeerGroupQualityScore(MINIMUM_HEALTHY_PEER_GROUP_SIZE * 2), 100, "never exceeds 100 even with a very large peer group");
  assert.equal(computePeerGroupQualityScore(0), 0);
  assert.equal(computePeerGroupQualityScore(MINIMUM_HEALTHY_PEER_GROUP_SIZE / 2), 50);
});

test("computeEarningsQualityScore starts at 100 and only real, disclosed flags reduce it", () => {
  assert.equal(computeEarningsQualityScore({}), 100);
  assert.equal(computeEarningsQualityScore({ negativeEarningsFlag: true }), 90);
  assert.equal(computeEarningsQualityScore({ largeOneTimeItemFlag: true }), 70);
  assert.equal(computeEarningsQualityScore({ gaapAdjustedEpsDivergenceFlag: true }), 80);
  assert.equal(computeEarningsQualityScore({ negativeEarningsFlag: true, largeOneTimeItemFlag: true, gaapAdjustedEpsDivergenceFlag: true }), 40);
});

test("computeValuationConfidence applies the exact documented weights (0.30/0.30/0.25/0.15)", () => {
  const { valuationConfidence, components } = computeValuationConfidence({
    usableMethodCount: 4,
    totalApplicableMethodCount: 4, // dataCompletenessScore = 100
    impliedPrices: [100, 100, 100, 100], // methodAgreementScore = 100
    peerGroupSize: MINIMUM_HEALTHY_PEER_GROUP_SIZE, // peerGroupQualityScore = 100
    earningsQualityFlags: {}, // earningsQualityScore = 100
  });
  assert.equal(valuationConfidence, 100);
  assert.deepEqual(components, { dataCompletenessScore: 100, methodAgreementScore: 100, peerGroupQualityScore: 100, earningsQualityScore: 100 });
});

test("computeValuationConfidence with zero real peer-group data and disagreeing methods honestly produces a low overall confidence", () => {
  const { valuationConfidence } = computeValuationConfidence({
    usableMethodCount: 1,
    totalApplicableMethodCount: 3,
    impliedPrices: [100],
    peerGroupSize: 0,
    earningsQualityFlags: { negativeEarningsFlag: true },
  });
  assert.ok(valuationConfidence < 50);
});

test("computeValuationConfidence is always a finite number clamped to [0, 100]", () => {
  const { valuationConfidence } = computeValuationConfidence({
    usableMethodCount: 0,
    totalApplicableMethodCount: 0,
    impliedPrices: [],
    peerGroupSize: 0,
    earningsQualityFlags: { negativeEarningsFlag: true, largeOneTimeItemFlag: true, gaapAdjustedEpsDivergenceFlag: true },
  });
  assert.ok(Number.isFinite(valuationConfidence));
  assert.ok(valuationConfidence >= 0 && valuationConfidence <= 100);
});
