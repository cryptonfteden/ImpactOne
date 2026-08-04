// Phase OUTCOME-CALIBRATION-001 — "Calibration statistics" +
// "Confidence calibration," scoped per-agent. Applies the exact same
// real, disclosed Brier-score-style formula
// (`|confidence/100 - actualOutcomeAsOneOrZero|`) that
// `claimResolutionService.computeCalibrationError` and
// `calibrationAnalysisService.getCalibrationDrift` already use — this
// is the same well-established statistical formula applied to a new
// grouping (one real agent's own real evidence-level confidence,
// stance-adjusted via agentAccuracyTracker.wasEvidenceCorrect), not a
// competing definition of calibration error. Reimplemented here rather
// than imported for the same reason `claimConfidence.js`'s own
// `capAndRedistributeWeights` reimplements (rather than imports)
// `marketSentimentRollup`'s weight-capping — each module owns its own
// narrow, self-contained formula application, matching this
// codebase's own established precedent.
const { wasEvidenceCorrect } = require("./agentAccuracyTracker");

const MIN_SAMPLE_SIZE = 5; // matches calibrationAnalysisService.MIN_BUCKET_SAMPLE_SIZE

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * @param {number} confidence - this agent's own real, already-reported evidence confidence (0-100)
 * @param {boolean} correct - this agent's real, stance-adjusted correctness (see agentAccuracyTracker)
 * @returns {number} a real Brier-style calibration error in [0, 1]
 */
function computeEvidenceCalibrationError(confidence, correct) {
  const actual = correct ? 1 : 0;
  return Math.abs(confidence / 100 - actual);
}

/**
 * @param {Array<{ stance: string, confidence: number|null, directionCorrect: boolean|null }>} gradedEvidence
 * @returns {{ avgCalibrationError: number|null, sampleSize: number, isStatisticallyMeaningful: boolean, reason: string|null }}
 */
function aggregateCalibration(gradedEvidence) {
  const errors = gradedEvidence
    .filter((entry) => (entry.stance === "SUPPORTS" || entry.stance === "CONTRADICTS") && entry.directionCorrect !== null && entry.directionCorrect !== undefined && Number.isFinite(entry.confidence))
    .map((entry) => computeEvidenceCalibrationError(entry.confidence, wasEvidenceCorrect(entry.stance, entry.directionCorrect)));

  const sampleSize = errors.length;
  const isStatisticallyMeaningful = sampleSize >= MIN_SAMPLE_SIZE;
  const avgCalibrationError = sampleSize > 0 ? Math.round(average(errors) * 10000) / 10000 : null;

  return {
    avgCalibrationError,
    sampleSize,
    isStatisticallyMeaningful,
    reason: isStatisticallyMeaningful ? null : `Only ${sampleSize} real graded evidence entries with a real confidence value — need at least ${MIN_SAMPLE_SIZE}.`,
  };
}

module.exports = { computeEvidenceCalibrationError, aggregateCalibration, MIN_SAMPLE_SIZE };
