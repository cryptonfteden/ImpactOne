// Phase AGENT-ORCHESTRATOR-001 — a real agent, not a stub.
// Phase OPTIONS-AGENT-001 — upgraded to the full Options Flow Domain
// Intelligence Agent (backend/services/domainAgents/optionsFlowAgent/):
// market bias, confidence, ranked unusual contracts, institutional-
// activity/accumulation/volatility-regime signals, a risk summary, and a
// 2-4 sentence (deterministic, template-based — not an LLM call) plain-
// language summary. This file still only adapts that engine's already-
// real report into the generic Agent interface; it invents no analysis
// of its own, the same discipline every other real agent here follows.
const optionsFlowAgent = require("../../domainAgents/optionsFlowAgent/optionsFlowAgent");
const optionsAgentService = require("../../optionsAgent/optionsAgentService");

async function execute(symbol) {
  const report = await optionsFlowAgent.generateReport(symbol);

  return {
    summary: report.aiSummary,
    // The orchestrator only compares this string for equality with other
    // agents' directions (structural conflict detection) — it never
    // interprets it. NEUTRAL (or no data) reports no opinion, exactly
    // like this agent's own prior, thinner implementation.
    direction: report.signalEligible === false || report.marketBias === "NEUTRAL" ? null : report.marketBias,
    evidence: report.available ? [
      { observedFact: `Options source: ${report.dataQuality.source}; ${report.dataQuality.scope}; ${report.dataQuality.totalVolume} contracts.` },
      ...report.signals.mostUnusualContracts.map((contract) => ({
      observedFact: contract.explanation || `${contract.optionType} ${contract.strike} (${contract.signalType}), anomaly score ${contract.anomalyScore}.`,
      })),
    ] : [],
    raw: report,
  };
}

function confidence(result) {
  const score = result?.raw?.confidence;
  return Number.isFinite(score) ? score : 0;
}

async function health() {
  try {
    const providerHealth = await optionsAgentService.getProviderHealth();
    const provider = providerHealth?.providerHealth;
    if (!provider || provider.lastStatus === null) {
      return { status: "degraded", reason: "Options-flow provider has no run history yet." };
    }
    if (provider.lastStatus === "SUCCESS") return { status: "healthy", reason: null };
    return { status: "degraded", reason: `Options-flow provider's last run reported status "${provider.lastStatus}".` };
  } catch (error) {
    return { status: "unavailable", reason: error?.message || "Options-flow provider health check failed." };
  }
}

module.exports = {
  metadata: { id: "options", name: "Options Flow Agent", category: "OPTIONS", priority: 6 },
  execute,
  confidence,
  health,
};
