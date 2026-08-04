const test = require("node:test");
const assert = require("node:assert/strict");
const { wasEvidenceCorrect, aggregateAccuracy } = require("./agentAccuracyTracker");

test("wasEvidenceCorrect: SUPPORTS is correct exactly when the claim resolved direction-correct", () => {
  assert.equal(wasEvidenceCorrect("SUPPORTS", true), true);
  assert.equal(wasEvidenceCorrect("SUPPORTS", false), false);
});

test("wasEvidenceCorrect: CONTRADICTS is correct exactly when the claim resolved direction-INcorrect", () => {
  assert.equal(wasEvidenceCorrect("CONTRADICTS", false), true);
  assert.equal(wasEvidenceCorrect("CONTRADICTS", true), false);
});

test("wasEvidenceCorrect: an INVALIDATES-stance entry carries no real directional claim, never fabricated as correct", () => {
  assert.equal(wasEvidenceCorrect("INVALIDATES", true), false);
});

test("aggregateAccuracy: computes a real accuracy rate from real graded evidence", () => {
  const evidence = [
    { stance: "SUPPORTS", directionCorrect: true },
    { stance: "SUPPORTS", directionCorrect: true },
    { stance: "SUPPORTS", directionCorrect: false },
    { stance: "CONTRADICTS", directionCorrect: false },
  ];
  const result = aggregateAccuracy(evidence);
  assert.equal(result.correctCount, 3);
  assert.equal(result.totalCount, 4);
  assert.equal(result.accuracyRate, 75);
});

test("aggregateAccuracy: honestly reports not-yet-statistically-meaningful below the real sample threshold", () => {
  const evidence = [{ stance: "SUPPORTS", directionCorrect: true }];
  const result = aggregateAccuracy(evidence);
  assert.equal(result.isStatisticallyMeaningful, false);
  assert.match(result.reason, /need at least/);
});

test("aggregateAccuracy: excludes ungraded (directionCorrect null) evidence from the real denominator", () => {
  const evidence = [
    { stance: "SUPPORTS", directionCorrect: true },
    { stance: "SUPPORTS", directionCorrect: null },
  ];
  const result = aggregateAccuracy(evidence);
  assert.equal(result.totalCount, 1);
});

test("aggregateAccuracy: honestly returns null accuracyRate with zero real graded evidence", () => {
  const result = aggregateAccuracy([]);
  assert.equal(result.accuracyRate, null);
  assert.equal(result.totalCount, 0);
});
