// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// analystConsensusService.js exists but as normalization/fixture-only
// helpers (normalizeRating, crossCheckRatings, getFixtureConsensus) —
// no live per-symbol fetch entrypoint was found, so a real agent here
// would either wrap fixture data (dishonest — would look live) or
// require new provider wiring outside this phase's scope.
// Phase ANALYST-CONSENSUS-AGENT-001 — upgraded to a real Domain
// Intelligence Agent (backend/services/domainAgents/analystConsensusAgent/):
// Finnhub's real, already-configured `/stock/recommendation` endpoint
// (proven live elsewhere in this codebase, e.g. finnhubService.js)
// analyzed into Analyst Bias, Consensus Score, Revision Score, Target
// Score, Coverage Quality, Conviction Score, Rating Trend, Risks,
// Opportunities, Confidence, and a deterministic (not an LLM call) AI
// Summary. Price targets, price-target revisions, target dispersion,
// and estimate revisions all require a paid Finnhub plan (confirmed
// via a real HTTP 403 in this environment) — honestly reported
// unavailable rather than fabricated. This file still only adapts
// that engine's already-real report into the generic Agent interface;
// it invents no analysis of its own, the same discipline every other
// real agent here follows.
const analystConsensusAgentEngine = require("../../domainAgents/analystConsensusAgent/analystConsensusAgent");

async function execute(symbol) {
  const report = await analystConsensusAgentEngine.generateReport(symbol);

  if (!report.dataAvailable) {
    return {
      summary: report.aiSummary,
      direction: null,
      evidence: [],
      raw: report,
    };
  }

  return {
    summary: report.aiSummary,
    // The orchestrator only compares this string for equality with other
    // agents' directions (structural conflict detection) — it never
    // interprets it. NEUTRAL analyst bias reports no opinion.
    direction: report.signalEligible === false || report.analystBias === "NEUTRAL" ? null : report.analystBias,
    evidence: [
      { observedFact: `Analyst Bias: ${report.analystBias} (Consensus Score ${report.consensusScore}), Rating Trend ${report.ratingTrend}.` },
      { observedFact: `Coverage Quality ${report.coverageQuality} (${report.totalAnalysts} analysts), Conviction Score ${report.convictionScore}/100.` },
      { observedFact: `Analyst evidence: ${report.dataQuality.periodCount} periods; latest ${report.dataQuality.latestPeriod || "unknown"}; price targets ${report.dataQuality.priceTargetsAvailable ? "available" : "unavailable"}.` },
    ],
    raw: report,
  };
}

function confidence(result) {
  return Number.isFinite(result?.raw?.confidence) ? result.raw.confidence : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "analyst-consensus", name: "Analyst Consensus Intelligence Agent", category: "ANALYST_CONSENSUS", priority: 3 },
  execute,
  confidence,
  health,
};
