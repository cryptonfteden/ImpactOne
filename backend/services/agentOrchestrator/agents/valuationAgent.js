// Phase AGENT-ORCHESTRATOR-001 — registration originally prepared as a
// stub (no valuation service existed yet).
// Phase VALUATION-AGENT-001 — upgraded to a real Domain Intelligence
// Agent (backend/services/domainAgents/valuationAgent/): a composite,
// multi-method Fair Value estimate, valuation status, confidence,
// supporting-metric breakdown, and a 2-4 sentence (deterministic,
// template-based — not an LLM call) plain-language summary. This file
// still only adapts that engine's already-real report into the generic
// Agent interface; it invents no analysis of its own, the same
// discipline every other real agent here follows.
const valuationAgentEngine = require("../../domainAgents/valuationAgent/valuationAgent");
const { isConfigured } = require("../../domainAgents/valuationAgent/valuationDataProvider");
const { isSecConfigured } = require("../../domainAgents/earningsAgent/secCompanyFactsProvider");

async function execute(symbol) {
  const report = await valuationAgentEngine.generateReport(symbol);

  return {
    summary: report.aiSummary,
    // The orchestrator only compares this string for equality with other
    // agents' directions (structural conflict detection) — it never
    // interprets it. FAIRLY_VALUED/UNKNOWN reports no opinion.
    direction: report.signalEligible === false || report.valuationStatus === "UNKNOWN" || report.valuationStatus === "FAIRLY_VALUED" ? null : report.valuationStatus,
    evidence: [
      ...(report.valuationExplanation ? [{ observedFact: report.valuationExplanation.pePlainLanguage }] : []),
      ...(report.dataQuality ? [{ observedFact: `Valuation evidence: ${report.dataQuality.contributingMethodCount} methods, peer source ${report.dataQuality.peerSource}, ${report.dataQuality.peerGroupSize} peers.` }] : []),
      ...report.supportingMetrics.map((entry) => ({ observedFact: `${entry.method.replace(/_/g, "/")}-implied price: $${entry.impliedPrice.toFixed(2)} (${entry.contributionPercent}% weight).` })),
      ...report.excludedMethods.map((entry) => ({ observedFact: `${entry.method.replace(/_/g, "/")} excluded: ${entry.reason}` })),
    ],
    raw: report,
  };
}

function confidence(result) {
  const score = result?.raw?.confidence;
  return Number.isFinite(score) ? score : 0;
}

async function health() {
  if (!isConfigured() && !isSecConfigured()) {
    return { status: "unavailable", reason: "Neither Finnhub nor an identified SEC EDGAR connection is configured." };
  }
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "valuation", name: "Valuation Intelligence Agent", category: "VALUATION", priority: 9 },
  execute,
  confidence,
  health,
};
