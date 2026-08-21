// One strategy, one aggregation model.  The legacy engine used a large bonus
// for every agreeing agent, even when two agents repeated the same underlying
// fact.  It now delegates to the same family-capped committee used by the
// weekly Fibonacci and insider radars.
const { summarizeCommittee } = require("../agentOrchestrator/committeeDecisionModel");

const NEUTRAL_BAND = 0.1;
// Kept as zero-valued compatibility exports for older consumers. Artificial
// corroboration and per-agent absence penalties are intentionally retired.
const CORROBORATION_BONUS = Object.freeze({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 });
const CONFLICT_PENALTY = 0;
const UNAVAILABLE_AGENT_PENALTY = 0;

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

  const committeeRows = normalizedAgents.map((agent) => ({
    agentId: agent.agentId,
    status: agent.available ? "fulfilled" : "unavailable",
    direction: agent.direction,
    confidence: agent.confidence,
    priority: agent.priority,
    result: { raw: { dataAvailable: agent.available, signalEligible: agent.available } },
  }));
  const committee = summarizeCommittee(committeeRows, { reportedTotal: normalizedAgents.length });
  const overallIntelligence = committee.direction;
  const normalizedScore = overallIntelligence === "BULLISH"
    ? committee.conviction / 100
    : overallIntelligence === "BEARISH" ? -committee.conviction / 100 : 0;
  const coverageFactor = committee.coveragePct / 100;
  const overallConfidence = overallIntelligence === "NEUTRAL"
    ? 0
    : clamp(Math.round(Math.min(committee.confidence, committee.conviction) * coverageFactor), 0, 100);
  const independentSupport = overallIntelligence === "BULLISH"
    ? committee.independentBullishFamilies.length
    : overallIntelligence === "BEARISH" ? committee.independentBearishFamilies.length : 0;
  let recommendationConfidence = overallConfidence;
  if (independentSupport < 2) recommendationConfidence = Math.min(recommendationConfidence, 35);
  if ((conflicts || []).length || committee.vetoFamilies.length) recommendationConfidence = Math.min(recommendationConfidence, 40);

  return {
    overallIntelligence,
    overallConfidence,
    recommendationConfidence,
    normalizedScore,
    contributions,
    committee,
    methodology: committee.methodology,
  };
}

module.exports = { aggregate, NEUTRAL_BAND, CORROBORATION_BONUS, CONFLICT_PENALTY, UNAVAILABLE_AGENT_PENALTY };
