// Phase OUTCOME-CALIBRATION-001 — read-only join layer. Reuses
// `claimRepository.js`'s existing (plus this phase's two additive)
// query functions — writes nothing, computes nothing itself. Combines
// a real agent's real evidence contributions with their real claims'
// real, already-graded outcomes (when graded) into one enriched row
// per evidence entry, the one real input every calibration/accuracy/
// drift function in this phase's other modules needs.
const claimRepository = require("../claimIntelligence/claimRepository");

/**
 * @param {string} sourceEngine - a real agent's own `metadata.id` (e.g. "macro")
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Array<{ claimId: string, stance: string, confidence: number|null, addedAt: string, observedFact: string, directionCorrect: boolean|null, calibrationError: number|null, gradeLabel: string|null, gradedAt: string|null }>>}
 */
async function listEnrichedEvidenceForEngine(sourceEngine, { limit = 500 } = {}) {
  const evidence = await claimRepository.listEvidenceBySourceEngine(sourceEngine, { limit });
  if (!evidence.length) return [];

  const claimIds = [...new Set(evidence.map((entry) => entry.claimId))];
  const outcomes = await claimRepository.listOutcomesForClaimIds(claimIds);
  const outcomeByClaimId = new Map(outcomes.map((outcome) => [outcome.claimId, outcome]));

  return evidence.map((entry) => {
    const outcome = outcomeByClaimId.get(entry.claimId) || null;
    return {
      claimId: entry.claimId,
      stance: entry.stance,
      confidence: entry.confidence,
      addedAt: entry.addedAt,
      observedFact: entry.observedFact,
      directionCorrect: outcome ? outcome.directionCorrect : null,
      calibrationError: outcome ? outcome.calibrationError : null,
      gradeLabel: outcome ? outcome.gradeLabel : null,
      gradedAt: outcome ? outcome.gradedAt : null,
    };
  });
}

module.exports = { listEnrichedEvidenceForEngine };
