// Phase FIBONACCI-AGENT-001 — overall "Confidence" (0-100), a
// disclosed, hand-set weighted formula (never a naive average)
// blending four real factors: data completeness (30 pts), the real
// entry zone's confluence score (up to 30 pts — more independent real
// sources agreeing raises confidence), real multi-timeframe agreement
// (+20 AGREE / -15 CONFLICT / 0 otherwise), and the real average
// historical price-reaction strength of the levels feeding the entry
// zone (up to 20 pts).
const BASE_SUFFICIENT = 30;
const BASE_INSUFFICIENT = 10;
const MAX_CONFLUENCE_BONUS = 30;
const CONFLUENCE_SCORE_CAP = 5;
const AGREEMENT_BONUS = 20;
const CONFLICT_PENALTY = 15;
const MAX_REACTION_BONUS = 20;

/**
 * @param {{ dataAvailable: boolean, enoughDataStatus: string, entryZone: object|null, timeframeAgreement: string, avgReactionStrength: number|null }} params
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, enoughDataStatus, entryZone, timeframeAgreement, avgReactionStrength }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, confluenceBonus: 0, agreementDelta: 0, reactionBonus: 0 } };
  }

  const base = enoughDataStatus === "SUFFICIENT" ? BASE_SUFFICIENT : BASE_INSUFFICIENT;

  const confluenceBonus = entryZone ? Math.min(entryZone.confluenceScore, CONFLUENCE_SCORE_CAP) * (MAX_CONFLUENCE_BONUS / CONFLUENCE_SCORE_CAP) : 0;

  let agreementDelta = 0;
  if (timeframeAgreement === "AGREE") agreementDelta = AGREEMENT_BONUS;
  else if (timeframeAgreement === "CONFLICT") agreementDelta = -CONFLICT_PENALTY;

  const reactionBonus = Number.isFinite(avgReactionStrength) ? Math.round(avgReactionStrength * MAX_REACTION_BONUS) : 0;

  const confidence = Math.round(Math.max(0, Math.min(100, base + confluenceBonus + agreementDelta + reactionBonus)));

  return { confidence, components: { base, confluenceBonus, agreementDelta, reactionBonus } };
}

module.exports = { computeConfidence };
