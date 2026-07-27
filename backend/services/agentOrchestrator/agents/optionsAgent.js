// Phase AGENT-ORCHESTRATOR-001 — a real agent, not a stub. All of the
// actual options-flow detection lives in optionsAgentService.js
// (already real, already tested) — this file only adapts its existing
// per-symbol view into the generic Agent interface.
const optionsAgentService = require("../../optionsAgent/optionsAgentService");

async function execute(symbol) {
  const view = await optionsAgentService.getSymbolView(symbol);
  if (view.unavailable) {
    return { summary: view.reason || "Options flow data is not available.", direction: null, evidence: [], raw: view };
  }

  return {
    summary: view.activeSignalCount
      ? `${view.activeSignalCount} recent options-flow signal(s) detected.`
      : "No recent options-flow signals for this symbol.",
    direction: null, // this agent surfaces anomaly activity, not a directional call
    evidence: view.recentSignals.slice(0, 5).map((signal) => ({ observedFact: signal.label || "Options-flow signal detected." })),
    raw: view,
  };
}

function confidence(result) {
  const score = result?.raw?.highestAnomalyScore;
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
  metadata: { id: "options", name: "Options Flow Agent", category: "OPTIONS", priority: 7 },
  execute,
  confidence,
  health,
};
