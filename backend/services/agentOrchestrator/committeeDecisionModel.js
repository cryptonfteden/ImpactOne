const { AGENT_WEIGHTS, getAgentWeight } = require("./strategyPolicy");
const { isDecisionEligible } = require("./decisionEligibility");

// Agents that frequently describe the same underlying fact belong to one
// evidence family.  A family is capped so a single news item cannot become
// three independent confirmations after passing through News, Sentiment and
// Alternative Data.
const EVIDENCE_FAMILIES = Object.freeze({
  setup: Object.freeze({ cap: 10, agents: ["fibonacci"] }),
  fundamentals: Object.freeze({ cap: 10, agents: ["earnings", "valuation"] }),
  ownership: Object.freeze({ cap: 10, agents: ["insider", "institutional"] }),
  positioning: Object.freeze({ cap: 8, agents: ["short-interest", "options"] }),
  catalysts: Object.freeze({ cap: 8, agents: ["news", "symbol-sentiment"] }),
  marketContext: Object.freeze({ cap: 8, agents: ["sentiment", "macro", "etf-flow", "alternative-data"] }),
  priceAction: Object.freeze({ cap: 3, agents: ["technical"] }),
  externalOpinion: Object.freeze({ cap: 3, agents: ["analyst-consensus"] }),
});

const FAMILY_BY_AGENT = Object.freeze(Object.fromEntries(
  Object.entries(EVIDENCE_FAMILIES).flatMap(([family, config]) => config.agents.map((agentId) => [agentId, family])),
));

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeDirection(value) {
  const direction = String(value || "").trim().toUpperCase();
  if (!direction) return "NONE";
  if (["BULLISH", "BUY", "POSITIVE", "UNDERVALUED", "RISK_ON"].some((token) => direction.includes(token))) return "BULLISH";
  if (["BEARISH", "SELL", "NEGATIVE", "OVERVALUED", "RISK_OFF"].some((token) => direction.includes(token))) return "BEARISH";
  if (["NEUTRAL", "HOLD", "MIXED", "FAIRLY_VALUED"].some((token) => direction.includes(token))) return "NEUTRAL";
  return "NONE";
}

function agentIdOf(agent) {
  return agent?.agentId || agent?.id || agent?.metadata?.id || null;
}

function priorityOf(agent) {
  const id = agentIdOf(agent);
  return getAgentWeight(id, Math.max(0.1, Number(agent?.priority || agent?.metadata?.priority) || 1));
}

function directionOf(agent) {
  return normalizeDirection(agent?.normalizedDirection || agent?.direction || agent?.result?.direction);
}

function familyForAgent(agentId) {
  return FAMILY_BY_AGENT[agentId] || `other:${agentId || "unknown"}`;
}

function familyCap(family, agents) {
  if (EVIDENCE_FAMILIES[family]) return EVIDENCE_FAMILIES[family].cap;
  return Math.max(...agents.map(priorityOf), 1);
}

function summarizeFamily(family, agents) {
  const cap = familyCap(family, agents);
  const eligible = agents.filter(isDecisionEligible);
  const evidenceWeight = Math.min(cap, eligible.reduce((sum, agent) => sum + priorityOf(agent), 0));
  const directional = eligible.filter((agent) => ["BULLISH", "BEARISH"].includes(directionOf(agent)));
  const directionalWeight = directional.reduce((sum, agent) => sum + priorityOf(agent), 0);
  const signedStrength = directionalWeight
    ? directional.reduce((sum, agent) => {
      const sign = directionOf(agent) === "BULLISH" ? 1 : -1;
      return sum + sign * (clamp(agent.confidence) / 100) * priorityOf(agent);
    }, 0) / directionalWeight
    : 0;
  const confidence = directionalWeight
    ? directional.reduce((sum, agent) => sum + clamp(agent.confidence) * priorityOf(agent), 0) / directionalWeight
    : 0;
  const direction = signedStrength > 0.1 ? "BULLISH" : signedStrength < -0.1 ? "BEARISH" : directional.length ? "NEUTRAL" : "NONE";
  return {
    family,
    cap,
    evidenceWeight,
    eligibleAgentCount: eligible.length,
    directionalAgentCount: directional.length,
    direction,
    strength: Math.round(Math.abs(signedStrength) * 100),
    signedStrength,
    confidence: Math.round(confidence),
    contribution: signedStrength * cap,
    agents: agents.map((agent) => ({
      id: agentIdOf(agent),
      eligible: isDecisionEligible(agent),
      direction: directionOf(agent),
      confidence: clamp(agent.confidence),
      weight: priorityOf(agent),
    })),
  };
}

function summarizeCommittee(agents = [], { reportedTotal = null } = {}) {
  const groups = new Map();
  agents.forEach((agent, index) => {
    const id = agentIdOf(agent);
    const family = id ? familyForAgent(id) : `other:anonymous-${index}`;
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push(agent);
  });
  const families = [...groups.entries()].map(([family, rows]) => summarizeFamily(family, rows));
  const knownFamilyCaps = Object.values(EVIDENCE_FAMILIES).reduce((sum, item) => sum + item.cap, 0);
  const presentKnownAgents = new Set(agents.map(agentIdOf));
  // The denominator always represents the declared strategy, not merely the
  // rows that happened to be serialized. Missing sources therefore reduce
  // coverage without receiving a synthetic neutral vote.
  const fullCommitteeExpected = Number(reportedTotal) >= Object.keys(AGENT_WEIGHTS).length || presentKnownAgents.size >= Object.keys(AGENT_WEIGHTS).length;
  const expectedWeight = (fullCommitteeExpected
    ? knownFamilyCaps
    : families.filter((family) => !family.family.startsWith("other:")).reduce((sum, family) => sum + family.cap, 0))
    + families.filter((family) => family.family.startsWith("other:")).reduce((sum, family) => sum + family.cap, 0);
  const coveredWeight = families.reduce((sum, family) => sum + family.evidenceWeight, 0);
  const coveragePct = expectedWeight ? coveredWeight / expectedWeight * 100 : 0;
  const directionalFamilies = families.filter((family) => family.direction !== "NONE");
  const directionalCapacity = directionalFamilies.reduce((sum, family) => sum + family.cap, 0);
  const netContribution = directionalFamilies.reduce((sum, family) => sum + family.contribution, 0);
  const netDirectionalScore = directionalCapacity ? netContribution / directionalCapacity : 0;
  const direction = netDirectionalScore > 0.1 ? "BULLISH" : netDirectionalScore < -0.1 ? "BEARISH" : "NEUTRAL";
  const conviction = Math.round(Math.abs(netDirectionalScore) * 100);
  const confidence = directionalCapacity
    ? directionalFamilies.reduce((sum, family) => sum + family.confidence * family.cap, 0) / directionalCapacity
    : 0;
  const independentBullishFamilies = families.filter((family) => family.direction === "BULLISH" && family.strength >= 35).map((family) => family.family);
  const independentBearishFamilies = families.filter((family) => family.direction === "BEARISH" && family.strength >= 35).map((family) => family.family);
  const vetoFamilies = families.filter((family) => ["fundamentals", "ownership"].includes(family.family)
    && family.direction === "BEARISH" && family.strength >= 65 && family.confidence >= 70);

  return {
    methodology: "family-capped-independent-evidence-v1",
    direction,
    conviction,
    confidence: Math.round(confidence),
    coveragePct: Math.round(coveragePct),
    representedAgentCount: agents.length,
    reportedAgentCount: Math.max(agents.length, Number(reportedTotal) || 0),
    eligibleAgentCount: agents.filter(isDecisionEligible).length,
    directionalAgentCount: agents.filter((agent) => isDecisionEligible(agent) && ["BULLISH", "BEARISH"].includes(directionOf(agent))).length,
    independentBullishFamilies,
    independentBearishFamilies,
    vetoFamilies: vetoFamilies.map((family) => family.family),
    families,
    warnings: [
      ...(!directionalFamilies.length ? ["No independent evidence family supplied a directional signal."] : []),
      ...(coveragePct < 60 ? ["Less than 60% of the declared strategy families have decision-grade evidence."] : []),
      ...(fullCommitteeExpected && presentKnownAgents.size < Object.keys(AGENT_WEIGHTS).length ? ["The committee response does not contain every registered strategy agent."] : []),
    ],
  };
}

module.exports = {
  EVIDENCE_FAMILIES,
  FAMILY_BY_AGENT,
  normalizeDirection,
  directionOf,
  familyForAgent,
  summarizeFamily,
  summarizeCommittee,
};
