// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// No short-interest provider or service existed anywhere in this
// codebase yet (confirmed by a full-repo search) — an honest
// "unavailable" registration, never a fabricated short-interest score.
// Phase SHORT-INTEREST-AGENT-001 — upgraded to a real Domain
// Intelligence Agent (backend/services/domainAgents/shortInterestAgent/):
// FINRA's real, free, no-auth daily Reg SHO short-volume data (a
// disclosed proxy — the official bi-monthly short-interest figure and
// real securities-lending metrics like borrow fee/utilization require
// a registered vendor this environment does not have) analyzed into
// Short Interest Bias, Short Interest Score, Squeeze Probability,
// Borrow Stress, Covering Activity, Crowdedness Score, Confidence,
// Risks, Opportunities, and a 2-4 sentence (deterministic,
// template-based — not an LLM call) plain-language summary. This file
// still only adapts that engine's already-real report into the
// generic Agent interface; it invents no analysis of its own, the
// same discipline every other real agent here follows.
const shortInterestAgentEngine = require("../../domainAgents/shortInterestAgent/shortInterestAgent");

async function execute(symbol) {
  const report = await shortInterestAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL short interest bias reports no opinion.
    direction: report.shortInterestBias === "NEUTRAL" ? null : report.shortInterestBias,
    evidence: [
      { observedFact: `Short Interest Bias: ${report.shortInterestBias} (score ${report.shortInterestScore}), trend ${report.shortInterestTrend.trend}.` },
      { observedFact: `Squeeze probability ${report.squeezeProbability}/100, crowdedness ${report.crowdednessScore}/100, covering activity ${report.coveringActivity.classification}.` },
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
  metadata: { id: "short-interest", name: "Short Interest Intelligence Agent", category: "SHORT_INTEREST", priority: 5 },
  execute,
  confidence,
  health,
};
