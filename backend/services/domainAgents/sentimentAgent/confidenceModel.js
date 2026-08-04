// Phase SENTIMENT-AGENT-001 — overall "Confidence" (0-100), a
// disclosed, hand-set weighted formula (never a naive average):
// data completeness (40 pts if real news data is available at all, 0
// otherwise — no news means no real read is possible), real sample
// size (up to 20 pts), real source diversity (up to 15 pts), real
// source credibility (up to 15 pts), a disclosed penalty for social
// sentiment being unavailable (always applies in this environment —
// see socialSentimentDataProvider.js), and a disclosed penalty when
// abnormal activity was detected (a real, flagged uncertainty — a spike
// makes the current read less representative of a sustained trend).
const NEWS_AVAILABLE_BASE = 40;
const MAX_SAMPLE_SIZE_BONUS = 20;
const SAMPLE_SIZE_CAP = 20; // articles
const MAX_DIVERSITY_BONUS = 15;
const DIVERSITY_CAP = 5; // distinct sources
const MAX_CREDIBILITY_BONUS = 15;
const SOCIAL_UNAVAILABLE_PENALTY = 10;
const ABNORMAL_ACTIVITY_PENALTY = 10;

/**
 * @param {{ newsAvailable: boolean, articleCount: number, sourceQuality: object, socialAvailable: boolean, hasAbnormalActivity: boolean }} params
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ newsAvailable, articleCount, sourceQuality, socialAvailable, hasAbnormalActivity }) {
  if (!newsAvailable) {
    return { confidence: 0, components: { base: 0, sampleSizeBonus: 0, diversityBonus: 0, credibilityBonus: 0, socialPenalty: 0, abnormalPenalty: 0 } };
  }

  const base = NEWS_AVAILABLE_BASE;
  const sampleSizeBonus = Math.round((Math.min(articleCount, SAMPLE_SIZE_CAP) / SAMPLE_SIZE_CAP) * MAX_SAMPLE_SIZE_BONUS);
  const diversityBonus = Math.round((Math.min(sourceQuality.distinctSourceCount, DIVERSITY_CAP) / DIVERSITY_CAP) * MAX_DIVERSITY_BONUS);
  const credibilityBonus = Math.round((sourceQuality.credibilityScore / 100) * MAX_CREDIBILITY_BONUS);
  const socialPenalty = socialAvailable ? 0 : SOCIAL_UNAVAILABLE_PENALTY;
  const abnormalPenalty = hasAbnormalActivity ? ABNORMAL_ACTIVITY_PENALTY : 0;

  const confidence = Math.round(Math.max(0, Math.min(100, base + sampleSizeBonus + diversityBonus + credibilityBonus - socialPenalty - abnormalPenalty)));

  return { confidence, components: { base, sampleSizeBonus, diversityBonus, credibilityBonus, socialPenalty, abnormalPenalty } };
}

module.exports = { computeConfidence };
