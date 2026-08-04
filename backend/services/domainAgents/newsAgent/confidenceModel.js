// Phase NEWS-AGENT-001 — "Confidence (0-100)". A disclosed, weighted
// blend of real data availability and quality — never a naive average.
// Base confidence requires real articles; bonuses for a real
// meaningful sample size and real multi-source confirmation; a
// disclosed penalty when the real company profile (feeding Affected
// Sectors) is unavailable.
const BASE = 25;
const SAMPLE_SIZE_CEILING = 10; // 10+ real articles maps to a full real sample-size bonus
const SAMPLE_SIZE_BONUS_MAX = 30;
const CONFIRMATION_BONUS_WEIGHT = 0.35; // of confirmationScore (0-100)
const PROFILE_PENALTY = 10;

/**
 * @param {{ dataAvailable: boolean, articleCount: number, confirmationScore: number, profileAvailable: boolean }} inputs
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, articleCount, confirmationScore, profileAvailable }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, sampleSizeBonus: 0, confirmationBonus: 0, profilePenalty: 0 } };
  }

  const base = BASE;
  const sampleSizeBonus = Math.round(Math.min(1, articleCount / SAMPLE_SIZE_CEILING) * SAMPLE_SIZE_BONUS_MAX);
  const confirmationBonus = Math.round(confirmationScore * CONFIRMATION_BONUS_WEIGHT);
  const profilePenalty = profileAvailable ? 0 : PROFILE_PENALTY;

  const confidence = Math.max(0, Math.min(100, base + sampleSizeBonus + confirmationBonus - profilePenalty));

  return { confidence, components: { base, sampleSizeBonus, confirmationBonus, profilePenalty } };
}

module.exports = { computeConfidence, BASE, SAMPLE_SIZE_CEILING, SAMPLE_SIZE_BONUS_MAX, CONFIRMATION_BONUS_WEIGHT, PROFILE_PENALTY };
