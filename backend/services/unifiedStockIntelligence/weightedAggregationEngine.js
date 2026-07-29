// Phase UNIFIED-STOCK-INTELLIGENCE-001 — "Do NOT average scores.
// Implement an explainable weighted aggregation engine." This module is
// the one place that decision gets made, and it deliberately does NOT
// compute `(optionsConfidence + earningsConfidence + valuationConfidence) / 3`
// anywhere. Two genuinely distinct mechanisms, mirroring this
// platform's own established "confidence and probability/agreement are
// never blended into one naive number" convention (the Committee's own
// never-averaged confidence rule; optionsAnomalyConfidence.js's
// corroboration-rewards-corroboration table; VALUATION_SCORING_MODEL.md's
// disclosed, gated multi-component formula):
//
//   1. Overall Intelligence (direction) — a PRIORITY-AND-CONFIDENCE-
//      WEIGHTED SUM of each available agent's signed lean, normalized
//      by total weight only to classify into BULLISH/NEUTRAL/BEARISH
//      bands — every weight (`priority`) is the agent's own real,
//      already-existing registry priority, not invented for this engine.
//   2. Overall Confidence — NOT a mean of the 3 raw confidence scores.
//      It starts from a weighted average of ONLY the agents that agree
//      with the winning direction, then applies disclosed, hand-set
//      corroboration bonuses (more independent agreeing agents = higher
//      confidence, the same principle as SWEEP+BLOCK scoring higher
//      than either alone) and disclosed penalties for real conflicts and
//      for missing/unavailable agents — conflicting evidence can never
//      produce an artificially high blended confidence.
const NEUTRAL_BAND = 0.1; // +/-10% of the total possible weighted score counts as "no real lean"
// Disclosed, hand-set — more independent agreement = more confidence.
// Phase SENTIMENT-AGENT-001 added the `4` entry when the evidence set
// grew from 3 agents (Options/Earnings/Valuation) to 4
// (+ symbol-sentiment) — a fallback of 30 still covers any further
// growth honestly rather than silently under-crediting it.
const CORROBORATION_BONUS = { 1: 0, 2: 15, 3: 30, 4: 40 };
const CONFLICT_PENALTY = 25; // a real, disclosed penalty applied whenever ANY genuine conflict exists
const UNAVAILABLE_AGENT_PENALTY = 10; // per missing/unavailable agent, out of the full evidence set

function directionSign(direction) {
  if (direction === "BULLISH") return 1;
  if (direction === "BEARISH") return -1;
  return 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {Array<{agentId, available, direction, confidence, priority}>} normalizedAgents
 * @param {Array<object>} conflicts - from conflictDetector.js
 * @returns {{
 *   overallIntelligence: "BULLISH"|"NEUTRAL"|"BEARISH",
 *   overallConfidence: number,
 *   recommendationConfidence: number,
 *   normalizedScore: number,
 *   contributions: Array<{agentId, direction, confidence, priority, contributionScore}>,
 * }}
 */
function aggregate(normalizedAgents, conflicts) {
  const available = normalizedAgents.filter((agent) => agent.available);

  const contributions = available.map((agent) => {
    const sign = directionSign(agent.direction);
    const contributionScore = agent.priority * (agent.confidence / 100) * sign;
    return { agentId: agent.agentId, direction: agent.direction, confidence: agent.confidence, priority: agent.priority, contributionScore };
  });

  if (!available.length) {
    return { overallIntelligence: "NEUTRAL", overallConfidence: 0, recommendationConfidence: 0, normalizedScore: 0, contributions: [] };
  }

  const totalWeight = available.reduce((sum, agent) => sum + agent.priority, 0);
  const netScore = contributions.reduce((sum, c) => sum + c.contributionScore, 0);
  const normalizedScore = totalWeight > 0 ? netScore / totalWeight : 0;

  let overallIntelligence = "NEUTRAL";
  if (normalizedScore > NEUTRAL_BAND) overallIntelligence = "BULLISH";
  else if (normalizedScore < -NEUTRAL_BAND) overallIntelligence = "BEARISH";

  let overallConfidence;
  if (overallIntelligence === "NEUTRAL") {
    // No real directional claim is being made — honestly low/zero
    // confidence rather than a fabricated number for a non-claim.
    overallConfidence = 0;
  } else {
    const agreeing = contributions.filter((c) => c.direction === overallIntelligence);
    const agreeingWeight = agreeing.reduce((sum, c) => sum + c.priority, 0);
    const weightedBaseConfidence = agreeingWeight > 0 ? agreeing.reduce((sum, c) => sum + c.confidence * c.priority, 0) / agreeingWeight : 0;

    const bonus = CORROBORATION_BONUS[agreeing.length] ?? 30;
    const conflictPenalty = conflicts.length > 0 ? CONFLICT_PENALTY : 0;
    // `normalizedAgents.length` is the real, full evidence-set size for
    // THIS run (whatever agents were actually selected), never a
    // hardcoded agent count — this scales honestly as the evidence set
    // grows (3 agents at UNIFIED-STOCK-INTELLIGENCE-001, 4 as of
    // SENTIMENT-AGENT-001) without needing another edit here.
    const unavailablePenalty = (normalizedAgents.length - available.length) * UNAVAILABLE_AGENT_PENALTY;

    overallConfidence = clamp(Math.round(weightedBaseConfidence + bonus - conflictPenalty - unavailablePenalty), 0, 100);
  }

  // "Recommendation Confidence" — a distinct, stricter figure describing
  // how robust this unified read is as INPUT EVIDENCE for anything
  // downstream, never itself an action/decision (canonicalVerdict.js's
  // FORBIDDEN_COMMITTEE_KEYS denylist is a different field name and this
  // is a confidence NUMBER, not a verdict). Real conflicts and missing
  // agents discount it further than they discount the raw directional
  // confidence above.
  let recommendationConfidence = overallConfidence;
  if (conflicts.length > 0) recommendationConfidence = Math.min(recommendationConfidence, 40);
  recommendationConfidence = Math.round(recommendationConfidence * (normalizedAgents.length > 0 ? available.length / normalizedAgents.length : 0));
  recommendationConfidence = clamp(recommendationConfidence, 0, 100);

  return { overallIntelligence, overallConfidence, recommendationConfidence, normalizedScore, contributions };
}

module.exports = { aggregate, NEUTRAL_BAND, CORROBORATION_BONUS, CONFLICT_PENALTY, UNAVAILABLE_AGENT_PENALTY };
