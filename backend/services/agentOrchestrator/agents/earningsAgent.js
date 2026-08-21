// Phase AGENT-ORCHESTRATOR-001 — registration originally prepared as a
// stub (no analysis service existed yet).
// Phase EARNINGS-AGENT-001 — upgraded to a real Domain Intelligence
// Agent (backend/services/domainAgents/earningsAgent/): earnings
// health, growth score, surprise score, forward outlook, confidence,
// risks/opportunities, and a 2-4 sentence (deterministic, template-
// based — not an LLM call) plain-language summary. This file still only
// adapts that engine's already-real report into the generic Agent
// interface; it invents no analysis of its own, the same discipline
// every other real agent here follows.
const earningsAgentEngine = require("../../domainAgents/earningsAgent/earningsAgent");
const { isConfigured } = require("../../domainAgents/earningsAgent/earningsDataProvider");
const { isSecConfigured } = require("../../domainAgents/earningsAgent/secCompanyFactsProvider");

async function execute(symbol) {
  const report = await earningsAgentEngine.generateReport(symbol);

  return {
    summary: report.aiSummary,
    // The orchestrator only compares this string for equality with other
    // agents' directions (structural conflict detection) — it never
    // interprets it. UNKNOWN/NEUTRAL reports no opinion.
    direction: report.signalEligible === false || report.forwardOutlook === "UNKNOWN" || report.forwardOutlook === "NEUTRAL" ? null : report.forwardOutlook,
    evidence: [
      { observedFact: `Source: ${report.dataQuality.source}; ${report.dataQuality.usableEpsQuarters} reported EPS quarters and ${report.dataQuality.observedFundamentals} verified fundamental measures.` },
      ...[...report.risks, ...report.opportunities].map((observedFact) => ({ observedFact })),
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
  metadata: { id: "earnings", name: "Earnings Intelligence Agent", category: "EARNINGS", priority: 7 },
  execute,
  confidence,
  health,
};
