const test = require("node:test");
const assert = require("node:assert/strict");
const { computeEvidenceCalibrationError, aggregateCalibration } = require("./agentCalibrationStatistics");

test("computeEvidenceCalibrationError: a perfectly-calibrated, correct, 100-confidence read scores 0 real error", () => {
  assert.equal(computeEvidenceCalibrationError(100, true), 0);
});

test("computeEvidenceCalibrationError: a wildly overconfident, wrong read scores a real, large error", () => {
  assert.equal(computeEvidenceCalibrationError(100, false), 1);
});

test("computeEvidenceCalibrationError: the exact real Brier-style formula", () => {
  assert.equal(computeEvidenceCalibrationError(70, true), Math.abs(0.7 - 1));
  assert.equal(computeEvidenceCalibrationError(70, false), Math.abs(0.7 - 0));
});

test("aggregateCalibration: averages real calibration error across real graded, confident evidence", () => {
  const evidence = [
    { stance: "SUPPORTS", confidence: 100, directionCorrect: true }, // error 0
    { stance: "SUPPORTS", confidence: 0, directionCorrect: false }, // error 0
    { stance: "SUPPORTS", confidence: 100, directionCorrect: false }, // error 1
  ];
  const result = aggregateCalibration(evidence);
  assert.equal(result.sampleSize, 3);
  assert.equal(Math.round(result.avgCalibrationError * 100) / 100, 0.33);
});

test("aggregateCalibration: excludes real evidence with no real confidence value, never fabricating one", () => {
  const evidence = [{ stance: "SUPPORTS", confidence: null, directionCorrect: true }];
  const result = aggregateCalibration(evidence);
  assert.equal(result.sampleSize, 0);
  assert.equal(result.avgCalibrationError, null);
});

test("aggregateCalibration: honestly reports not-yet-statistically-meaningful below the real sample threshold", () => {
  const evidence = [{ stance: "SUPPORTS", confidence: 80, directionCorrect: true }];
  const result = aggregateCalibration(evidence);
  assert.equal(result.isStatisticallyMeaningful, false);
});
