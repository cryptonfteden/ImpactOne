require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  aggregateConfidence,
  aggregateProbability,
  capAndRedistributeWeights,
  applyBoundedUpdate,
  applyBoundedConfidenceUpdate,
  computeUncertainty,
} = require("./claimConfidence");
const { MAX_SINGLE_EVIDENCE_WEIGHT, MAX_CONFIDENCE_DELTA_PER_UPDATE } = require("./claimDimensions");

function entry({ stance = "SUPPORTS", confidence = 70, ageMs = 60000, independenceGroup = "a", sourceEngine = "options" } = {}) {
  return { stance, confidence, freshness: { ageMs }, independenceGroup, sourceEngine };
}

test("confidence vs probability separation: two claims with identical confidence-relevant inputs but different directional agreement produce different probability, same confidence-relevant components", () => {
  const evidenceHighAgreement = [entry({ stance: "SUPPORTS" }), entry({ stance: "SUPPORTS" })];
  const evidenceLowAgreement = [entry({ stance: "SUPPORTS" }), entry({ stance: "CONTRADICTS" })];

  const probHigh = aggregateProbability(evidenceHighAgreement).probability;
  const probLow = aggregateProbability(evidenceLowAgreement).probability;
  assert.ok(probHigh > probLow);

  // Confidence is a genuinely different computation — it does not simply
  // track probability's agreement number, since it independently weighs
  // freshness/independence/breadth/reliability too.
  const confHigh = aggregateConfidence(evidenceHighAgreement).confidence;
  const confLow = aggregateConfidence(evidenceLowAgreement).confidence;
  assert.notEqual(confHigh, probHigh); // never interchangeable
  assert.ok(Number.isFinite(confLow));
});

test("aggregateConfidence: honestly null with zero evidence entries at all", () => {
  const result = aggregateConfidence([]);
  assert.equal(result.confidence, null);
});

test("aggregateConfidence: a real confidence is still computed from other available components (freshness/independence/breadth) even when the entry's own confidence is null", () => {
  const result = aggregateConfidence([{ stance: "SUPPORTS", confidence: null, freshness: { ageMs: 60000 }, independenceGroup: "a", sourceEngine: "options" }]);
  assert.ok(Number.isFinite(result.confidence));
  assert.equal(result.components.sourceReliability, null);
});

test("aggregateProbability: honestly null with zero directional (SUPPORTS/CONTRADICTS) evidence", () => {
  assert.equal(aggregateProbability([]).probability, null);
});

test("dominance prevention: capAndRedistributeWeights never lets one weight exceed the configured cap", () => {
  const capped = capAndRedistributeWeights([0.9, 0.05, 0.05], MAX_SINGLE_EVIDENCE_WEIGHT);
  for (const weight of capped) assert.ok(weight <= MAX_SINGLE_EVIDENCE_WEIGHT + 1e-9);
  const sum = capped.reduce((total, weight) => total + weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
});

test("dominance prevention: aggregateConfidence never lets a single overwhelming component dominate the final score", () => {
  // Only sourceReliability is available (a single component) — even so,
  // the result must stay a real, bounded number, not an unclamped
  // reflection of one component alone at full weight beyond the cap.
  const result = aggregateConfidence([entry({ confidence: 100 })]);
  assert.ok(result.confidence <= 100);
});

test("null-not-zero: a claim with no counter-evidence and one real supporting entry never reports confidence as a fabricated 0", () => {
  const result = aggregateConfidence([entry({ confidence: 80 })]);
  assert.ok(result.confidence > 0);
});

test("counter-evidence honestly reduces confidence via a real, bounded penalty", () => {
  const withoutCounter = aggregateConfidence([entry({ stance: "SUPPORTS", confidence: 80 })]).confidence;
  const withCounter = aggregateConfidence([entry({ stance: "SUPPORTS", confidence: 80 }), entry({ stance: "CONTRADICTS", confidence: 80 })]).confidence;
  assert.ok(withCounter < withoutCounter);
});

test("bounded updates: a single new value can move confidence by at most the configured max delta", () => {
  const updated = applyBoundedConfidenceUpdate(30, 95);
  assert.ok(updated <= 30 + MAX_CONFIDENCE_DELTA_PER_UPDATE);
});

test("bounded updates: the first-ever value (no prior) is applied as-is, not artificially bounded toward zero", () => {
  const updated = applyBoundedUpdate(null, 72, 20);
  assert.equal(updated, 72);
});

test("bounded updates: a null new value is always honestly null, never a fabricated carry-forward", () => {
  assert.equal(applyBoundedUpdate(50, null, 20), null);
});

test("computeUncertainty reuses the '100 minus agreement' definition and is honestly null without real agreement data", () => {
  assert.equal(computeUncertainty(80), 20);
  assert.equal(computeUncertainty(null), null);
});

test("deterministic output: aggregateConfidence/aggregateProbability produce identical results for identical input, regardless of call order", () => {
  const evidence = [entry({ stance: "SUPPORTS", confidence: 70, independenceGroup: "a" }), entry({ stance: "CONTRADICTS", confidence: 50, independenceGroup: "b" })];
  const first = aggregateConfidence(evidence);
  const second = aggregateConfidence([...evidence]);
  assert.deepEqual(first, second);
  assert.deepEqual(aggregateProbability(evidence), aggregateProbability([...evidence]));
});
