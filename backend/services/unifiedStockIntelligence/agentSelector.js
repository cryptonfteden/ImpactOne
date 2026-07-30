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
// Phase INSIDER-AGENT-001 added a 5th, `insider` (real SEC EDGAR Form 4
// insider-trading intelligence), upgraded in place from its prior stub
// registration — same id, no new id conflict to resolve.
// Phase ETF-FLOW-AGENT-001 added a 6th, `etf-flow` (real trading-
// activity-based ETF flow proxy), also upgraded in place from its
// prior stub registration.
// Phase INSTITUTIONAL-AGENT-001 added a 7th, `institutional` (real SEC
// EDGAR 13F-HR institutional-ownership intelligence), also upgraded in
// place from its prior stub registration.
// Phase SHORT-INTEREST-AGENT-001 added an 8th, `short-interest` (real
// FINRA daily short-volume intelligence), also upgraded in place from
// its prior stub registration.
// Phase MACRO-AGENT-001 added a 9th, `macro` (real FRED + real
// market-proxy macroeconomic intelligence), also upgraded in place from
// its prior stub registration. Unlike the market-wide `sentiment` id
// (deliberately excluded from this per-symbol list), this mission's own
// text explicitly requires Unified Stock Intelligence integration for
// macro, so it is included here even though its reading is market-wide
// rather than symbol-specific — every consuming symbol shares the same
// real macro backdrop.
const TARGET_AGENT_IDS = ["options", "earnings", "valuation", "symbol-sentiment", "insider", "etf-flow", "institutional", "short-interest", "macro"];

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
