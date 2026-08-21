// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// No insider-trading (Form 4 or equivalent) provider or service existed
// anywhere in this codebase yet.
// Phase INSIDER-AGENT-001 — upgraded to a real Domain Intelligence
// Agent (backend/services/domainAgents/insiderAgent/): real SEC EDGAR
// Form 4 data (CIK resolution, submissions feed, real filing XML
// parsing) analyzed into Insider Activity, Net Insider Score, Cluster
// Activity, Officer/Director + Executive (CEO/CFO) Activity, Ownership
// Trend, Transaction Significance, Confidence, and a 2-4 sentence
// (deterministic, template-based — not an LLM call) plain-language
// summary. This file still only adapts that engine's already-real
// report into the generic Agent interface; it invents no analysis of
// its own, the same discipline every other real agent here follows.
const insiderAgentEngine = require("../../domainAgents/insiderAgent/insiderAgent");

async function execute(symbol) {
  const report = await insiderAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL insider activity reports no opinion.
    direction: report.signalEligible ? "BULLISH" : null,
    signalEligible: report.signalEligible,
    evidence: [
      { observedFact: `Insider Activity: ${report.insiderActivity} (net insider score ${report.netInsiderScore}).` },
      ...(report.clusterActivity.clusterBuy ? [{ observedFact: `Cluster buying: ${report.clusterActivity.distinctBuyers} distinct insiders within ${report.clusterActivity.windowDays} days.` }] : []),
      ...(report.clusterActivity.clusterSell ? [{ observedFact: `Cluster selling: ${report.clusterActivity.distinctSellers} distinct insiders within ${report.clusterActivity.windowDays} days.` }] : []),
      ...(report.executiveActivity.hasCeoActivity ? [{ observedFact: "The CEO transacted in this window." }] : []),
      ...(report.executiveActivity.hasCfoActivity ? [{ observedFact: "The CFO transacted in this window." }] : []),
      { observedFact: `Ownership trend: ${report.ownershipTrend.trend}.` },
      { observedFact: `${report.verifiedOpenMarketPurchases.count} verified SEC Form 4 open-market purchase(s); latest ${report.verifiedOpenMarketPurchases.latestDate || "none"}.` },
      { observedFact: `Source quality: ${report.dataQuality.filingsFetched} filing(s) parsed from SEC EDGAR; actionable freshness ${report.dataQuality.actionableFreshness ? "passed" : "not passed"}.` },
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
  metadata: { id: "insider", name: "Insider Trading Intelligence Agent", category: "INSIDER", priority: 10 },
  execute,
  confidence,
  health,
};
