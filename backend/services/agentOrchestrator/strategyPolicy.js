const POLICY_VERSION = "impactone-strategy-2026-08-18";
const { isDecisionEligible } = require("./decisionEligibility");

// The product strategy has one authoritative weight table. Unknown/custom
// agents retain their own metadata priority so tests and extensions remain
// backwards compatible.
const AGENT_WEIGHTS = Object.freeze({
  technical: 3,
  fibonacci: 10,
  "short-interest": 6,
  options: 6,
  insider: 10,
  institutional: 8,
  earnings: 7,
  valuation: 9,
  "analyst-consensus": 3,
  news: 7,
  "symbol-sentiment": 5,
  "etf-flow": 4,
  "alternative-data": 6,
  sentiment: 6,
  macro: 6,
});

const DECISION_GATES = Object.freeze({
  fibonacciDistancePct: 5,
  committeeApprovalScore: 65,
  minimumCommitteeCoveragePct: 60,
  goldMinimumIndependentConfirmations: 2,
  insiderReversalMinimumDrawdownPct: 15,
});

function getAgentWeight(agentId, fallback = 1) {
  return AGENT_WEIGHTS[agentId] ?? fallback;
}

function applyStrategyPriority(agent) {
  const configured = AGENT_WEIGHTS[agent?.metadata?.id];
  if (configured == null) return agent;
  return { ...agent, metadata: { ...agent.metadata, priority: configured, strategyWeight: configured } };
}

function policySnapshot() {
  return { version: POLICY_VERSION, agentWeights: { ...AGENT_WEIGHTS }, decisionGates: { ...DECISION_GATES } };
}

function weightedVotes(agents = []) {
  const output = { bullish: 0, neutral: 0, bearish: 0, availableWeight: 0 };
  agents.filter(isDecisionEligible).forEach((agent) => {
    const weight = getAgentWeight(agent.agentId || agent.id, Number(agent.priority) || 1);
    const direction = String(agent.normalizedDirection || agent.direction || "").toUpperCase();
    if (direction.includes("BULL") || direction === "BUY" || direction === "POSITIVE") {
      output.bullish += weight;
      output.availableWeight += weight;
    } else if (direction.includes("BEAR") || direction === "SELL" || direction === "NEGATIVE") {
      output.bearish += weight;
      output.availableWeight += weight;
    } else if (["NEUTRAL", "HOLD", "MIXED", "FAIRLY_VALUED"].includes(direction)) {
      output.neutral += weight;
      output.availableWeight += weight;
    }
  });
  return output;
}

module.exports = { POLICY_VERSION, AGENT_WEIGHTS, DECISION_GATES, getAgentWeight, applyStrategyPriority, policySnapshot, weightedVotes };
