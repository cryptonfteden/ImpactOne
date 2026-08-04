// Phase OUTCOME-CALIBRATION-001 — "Accuracy tracking." Reuses the
// Claim Intelligence layer's own, already-computed ground truth
// (`ClaimOutcome.directionCorrect`, produced by
// `claimResolutionService.computeDirectionCorrect` — never recomputed
// here) to determine whether a real agent's own real evidence
// contribution (`ClaimEvidence.stance`) was correct: an agent that
// SUPPORTED a claim which resolved direction-correct was right; an
// agent that CONTRADICTED a claim which resolved direction-correct was
// wrong (it was pushing against the side that turned out true), and
// vice versa. Every claim this reads was already graded by the
// existing Claim layer — this module only re-expresses that same real
// ground truth from one real agent's point of view.
const MIN_SAMPLE_SIZE = 5; // same disclosed threshold precedent as calibrationReportService.MIN_SAMPLE_SIZE

/**
 * @param {"SUPPORTS"|"CONTRADICTS"} stance - this agent's real evidence stance toward the claim
 * @param {boolean} directionCorrect - the claim's own real, already-graded outcome
 * @returns {boolean} whether this agent's real directional contribution was correct
 */
function wasEvidenceCorrect(stance, directionCorrect) {
  if (stance === "SUPPORTS") return directionCorrect === true;
  if (stance === "CONTRADICTS") return directionCorrect === false;
  return false; // INVALIDATES-stance evidence carries no real directional claim to score
}

/**
 * @param {Array<{ stance: string, directionCorrect: boolean|null }>} gradedEvidence - real evidence entries whose claim has a real, graded outcome (directionCorrect !== null)
 * @returns {{ correctCount: number, totalCount: number, accuracyRate: number|null, isStatisticallyMeaningful: boolean, reason: string|null }}
 */
function aggregateAccuracy(gradedEvidence) {
  const scorable = gradedEvidence.filter((entry) => entry.directionCorrect !== null && entry.directionCorrect !== undefined && (entry.stance === "SUPPORTS" || entry.stance === "CONTRADICTS"));
  const totalCount = scorable.length;
  const correctCount = scorable.filter((entry) => wasEvidenceCorrect(entry.stance, entry.directionCorrect)).length;
  const isStatisticallyMeaningful = totalCount >= MIN_SAMPLE_SIZE;

  return {
    correctCount,
    totalCount,
    accuracyRate: totalCount > 0 ? Math.round((correctCount / totalCount) * 10000) / 100 : null,
    isStatisticallyMeaningful,
    reason: isStatisticallyMeaningful ? null : `Only ${totalCount} real graded evidence entries — need at least ${MIN_SAMPLE_SIZE} to be statistically meaningful.`,
  };
}

module.exports = { wasEvidenceCorrect, aggregateAccuracy, MIN_SAMPLE_SIZE };
