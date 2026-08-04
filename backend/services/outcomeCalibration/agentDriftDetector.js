// Phase OUTCOME-CALIBRATION-001 — "Drift detection," scoped per-agent.
// Mirrors `calibrationAnalysisService.getCalibrationDrift`'s exact
// methodology (average real calibration error in the earlier half of
// real, chronologically-ordered graded history vs. the later half,
// split at the real midpoint) — reused here, not redesigned, applied
// to one real agent's own evidence-level calibration errors instead of
// the recommendation-family-wide ones that module already covers.
const { wasEvidenceCorrect } = require("./agentAccuracyTracker");
const { computeEvidenceCalibrationError } = require("./agentCalibrationStatistics");

const MIN_SAMPLE_SIZE = 10; // matches calibrationAnalysisService.getCalibrationDrift's own threshold

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * @param {Array<{ stance: string, confidence: number|null, directionCorrect: boolean|null, addedAt: string|Date }>} gradedEvidence - real evidence entries, any order (this function re-sorts chronologically)
 * @returns {{ earlierCalibrationError: number|null, laterCalibrationError: number|null, driftPts: number|null, reason: string|null }}
 */
function detectDrift(gradedEvidence) {
  const scorable = [...gradedEvidence]
    .filter((entry) => (entry.stance === "SUPPORTS" || entry.stance === "CONTRADICTS") && entry.directionCorrect !== null && entry.directionCorrect !== undefined && Number.isFinite(entry.confidence))
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());

  if (scorable.length < MIN_SAMPLE_SIZE) {
    return { earlierCalibrationError: null, laterCalibrationError: null, driftPts: null, reason: `Only ${scorable.length} real graded evidence entries — need at least ${MIN_SAMPLE_SIZE} to measure drift.` };
  }

  const errors = scorable.map((entry) => computeEvidenceCalibrationError(entry.confidence, wasEvidenceCorrect(entry.stance, entry.directionCorrect)));
  const midpoint = Math.floor(errors.length / 2);
  const earlierCalibrationError = Math.round(average(errors.slice(0, midpoint)) * 10000) / 10000;
  const laterCalibrationError = Math.round(average(errors.slice(midpoint)) * 10000) / 10000;

  return {
    earlierCalibrationError,
    laterCalibrationError,
    // Positive driftPts means this agent's calibration error grew (got worse); negative means it improved.
    driftPts: Math.round((laterCalibrationError - earlierCalibrationError) * 10000) / 10000,
    reason: null,
  };
}

module.exports = { detectDrift, MIN_SAMPLE_SIZE };
