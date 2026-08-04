// Phase DATA-VISUALIZATION-001 — pure, dependency-free mappings from
// real backend response shapes (committeeIntelligenceApi.convene,
// recommendationsApi.list, claimsApi) to visual parameters. No three.js
// import — unit-testable directly under jsdom, matching this feature's
// established orbitalConfig.js/ambientState.js convention. Nothing here
// computes new investment meaning — every function is a presentation-
// only read of a real, already-defined backend field.

// The real, total, disclosed vocabulary chiefInvestmentOfficerService.js
// uses for `cio.confidence` (see backend/services/intelligenceCommittee/
// chiefInvestmentOfficerService.js) — mapped to a real 0..1 visual
// intensity. An unrecognized value honestly falls back to the lowest
// intensity rather than assuming confidence that wasn't reported.
const CONFIDENCE_INTENSITY = {
  HIGH_UNANIMOUS: 1,
  MODERATE_MAJORITY: 0.66,
  LOW_SPLIT: 0.4,
  LOW_NO_SIGNAL: 0.15,
};

/**
 * @param {string|undefined} confidenceLabel real cio.confidence value
 * @returns {number} 0..1
 */
export function confidenceToIntensity(confidenceLabel) {
  return CONFIDENCE_INTENSITY[confidenceLabel] ?? 0.15;
}

/**
 * A real committee member's role in the real agreement/disagreement
 * structure — "agree" if named in agreement.members or
 * disagreement.supportiveMembers, "disagree" if named in
 * disagreement.contraryMembers, "neutral" otherwise (a real member with
 * no directional lean, per this codebase's own established convention
 * — see committeeCoordinator.js's `leanOf`).
 * @param {string} memberId
 * @param {{ agreement?: { members?: string[] }, disagreement?: { supportiveMembers?: string[], contraryMembers?: string[] } }} committee
 * @returns {"agree"|"disagree"|"neutral"}
 */
export function memberRole(memberId, committee) {
  const agreementMembers = committee?.agreement?.members || [];
  const supportive = committee?.disagreement?.supportiveMembers || [];
  const contrary = committee?.disagreement?.contraryMembers || [];
  if (agreementMembers.includes(memberId) || supportive.includes(memberId)) return "agree";
  if (contrary.includes(memberId)) return "disagree";
  return "neutral";
}

/**
 * Real recommendation action → a real, existing color already used
 * elsewhere in this scene's palette (never a new color vocabulary).
 * @param {string} action real RecommendationAction ("BUY"|"REDUCE"|"EXIT")
 */
export function recommendationActionColor(action) {
  if (action === "BUY") return "#4fffb0";
  if (action === "EXIT") return "#ff5f5f";
  return "#ffe14f"; // REDUCE or any other real, disclosed action value
}

/**
 * Evenly distributes `count` real items around a small local ring —
 * used to lay out company clusters / agent constellation members
 * without overlapping. Deterministic given the same count/index.
 * @param {number} index
 * @param {number} count
 * @param {number} radius
 * @returns {[number, number, number]}
 */
export function localRingPosition(index, count, radius) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.6, 0];
}
