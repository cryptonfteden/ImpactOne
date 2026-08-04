// Phase OUTCOME-CALIBRATION-001 — "Integrate with Unified Stock
// Intelligence," strictly additive per the mission's own "do not
// modify existing agent scoring / do not change agent outputs" rule.
// This function NEVER mutates a Unified Stock Intelligence report or
// feeds reliability data back into `weightedAggregationEngine`'s own
// scoring — it returns a brand-new object with exactly one new,
// read-only field (`agentReliabilityContext`) attached, so a caller
// that wants this context opts in explicitly rather than it being
// silently baked into every existing report.
const { getAgentReliabilityHistory } = require("./agentReliabilityService");

/**
 * @param {object} unifiedReport - an already-generated Unified Stock Intelligence report (unifiedStockIntelligenceEngine.generateUnifiedIntelligence's own output) — read, never mutated
 * @param {{ getAgentReliabilityHistoryFn?: Function }} [options] - injectable for tests only
 * @returns {Promise<object>} a NEW object: every existing field of `unifiedReport` unchanged, plus one new `agentReliabilityContext` field
 */
async function attachAgentReliabilityContext(unifiedReport, { getAgentReliabilityHistoryFn = getAgentReliabilityHistory } = {}) {
  const contributingAgentIds = (unifiedReport.agentContributions || []).map((contribution) => contribution.agentId);

  const histories = await Promise.all(contributingAgentIds.map((agentId) => getAgentReliabilityHistoryFn(agentId)));
  const agentReliabilityContext = Object.fromEntries(contributingAgentIds.map((agentId, index) => [agentId, histories[index]]));

  return { ...unifiedReport, agentReliabilityContext };
}

module.exports = { attachAgentReliabilityContext };
