// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Institutional-ownership analysis existed only as a committee member
// (institutionalSpecialistMember.js) reading one row of a shared,
// pre-built evidence matrix — not an independently callable, per-symbol
// agent with its own real data fetch.
// Phase INSTITUTIONAL-AGENT-001 — upgraded to a real Domain
// Intelligence Agent (backend/services/domainAgents/institutionalAgent/):
// real SEC EDGAR 13F-HR data from a disclosed cohort of major
// institutional managers, analyzed into Institutional Bias,
// Institutional Score, Ownership Trend, Accumulation/Distribution
// Score, Conviction Score, Top Holders, New/Closed Positions,
// Confidence, Risks, Opportunities, and a 2-4 sentence (deterministic,
// template-based — not an LLM call) plain-language summary. This file
// still only adapts that engine's already-real report into the
// generic Agent interface; it invents no analysis of its own, the
// same discipline every other real agent here follows.
const institutionalAgentEngine = require("../../domainAgents/institutionalAgent/institutionalAgent");

async function execute(symbol) {
  const report = await institutionalAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL institutional bias reports no opinion.
    direction: report.signalEligible === false || report.institutionalBias === "NEUTRAL" ? null : report.institutionalBias,
    evidence: [
      { observedFact: `Source: ${report.dataQuality.source}; verified coverage ${report.dataQuality.checkedManagers}/${report.dataQuality.totalManagers}, latest period ${report.dataQuality.latestReportDate || "unavailable"}.` },
      { observedFact: `Institutional Bias: ${report.institutionalBias} (score ${report.institutionalScore}), ownership trend ${report.ownershipTrend.trend}.` },
      { observedFact: `Accumulation ${report.accumulationScore}/100, distribution ${report.distributionScore}/100, conviction ${report.convictionScore}/100.` },
      ...(report.newPositions.length ? [{ observedFact: `${report.newPositions.length} real new institutional position(s) opened.` }] : []),
      ...(report.closedPositions.length ? [{ observedFact: `${report.closedPositions.length} real institutional position(s) closed.` }] : []),
    ],
    raw: report,
  };
}

function confidence(result) {
  const score = result?.raw?.confidence?.confidence;
  return Number.isFinite(score) ? score : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "institutional", name: "Institutional Intelligence Agent", category: "INSTITUTIONAL", priority: 8 },
  execute,
  confidence,
  health,
};
