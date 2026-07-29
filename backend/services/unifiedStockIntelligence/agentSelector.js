// Phase UNIFIED-STOCK-INTELLIGENCE-001 — "Compatible with Agent
// Registry": this engine never imports the Options/Earnings/Valuation
// agent modules directly. It looks them up from the REAL, live Agent
// Registry by id, so it always runs whatever is actually registered
// (including a future replacement implementation behind the same id)
// rather than a hardcoded reference frozen at this file's write time.
//
// Phase SENTIMENT-AGENT-001 extended this to a 4th agent,
// `symbol-sentiment` (the new, real per-symbol Sentiment Intelligence
// Agent) — deliberately not the original `sentiment` id, which stays a
// market-wide reading and is not part of this per-symbol aggregation.
const TARGET_AGENT_IDS = ["options", "earnings", "valuation", "symbol-sentiment"];

/**
 * @param {{ getRegisteredAgents: () => Array<object> }} orchestrator
 * @returns {Array<object>} the real registered agent objects for
 *   options/earnings/valuation, in whatever order the registry has them
 *   — never fabricated, and honestly a shorter list if one is missing
 *   from the registry for any reason.
 */
function selectUnifiedIntelligenceAgents(orchestrator) {
  const registered = orchestrator.getRegisteredAgents();
  return registered.filter((agent) => TARGET_AGENT_IDS.includes(agent.metadata.id));
}

module.exports = { selectUnifiedIntelligenceAgents, TARGET_AGENT_IDS };
