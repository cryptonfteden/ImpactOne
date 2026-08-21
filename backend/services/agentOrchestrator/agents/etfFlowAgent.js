// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Only a static sector-to-ETF lookup table existed (sectorEtfMap.js) —
// no real ETF fund-flow data provider or analysis service.
// Phase ETF-FLOW-AGENT-001 — upgraded to a real Domain Intelligence
// Agent (backend/services/domainAgents/etfFlowAgent/): a disclosed,
// real trading-activity flow PROXY (no licensed creation/redemption
// feed exists in this environment) computed from real price/volume
// data — ETF Flow Bias, Net Flow Score, Flow Strength, Flow
// Persistence, Sector Rotation, Passive Flow Impact, honestly-
// unavailable Fund Concentration/Stock ETF Exposure, Confidence,
// Risks, Opportunities, and a 2-4 sentence (deterministic,
// template-based — not an LLM call) plain-language summary. This file
// still only adapts that engine's already-real report into the
// generic Agent interface; it invents no analysis of its own, the
// same discipline every other real agent here follows.
const etfFlowAgentEngine = require("../../domainAgents/etfFlowAgent/etfFlowAgent");

async function execute(symbol) {
  const report = await etfFlowAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL ETF flow bias reports no opinion.
    direction: report.signalEligible === false || report.etfFlowBias === "NEUTRAL" ? null : report.etfFlowBias,
    evidence: [
      { observedFact: `Sector ETF price/volume proxy: ${report.etfFlowBias} (proxy score ${report.netFlowScore}) via ${report.targetEtf}${report.isDirectEtf ? "" : ` (${report.sector} sector proxy)`}.` },
      { observedFact: `Trading-activity strength: ${report.flowStrength.classification}, persistence: ${report.flowPersistence.classification}.` },
      ...(report.sectorRotation.classification !== "UNKNOWN" ? [{ observedFact: `Sector rotation: ${report.sectorRotation.classification}.` }] : []),
      { observedFact: `${report.dataQuality.targetEtf || "No ETF"} proxy uses ${report.dataQuality.barCount} verified bars. ${report.dataQuality.limitation}` },
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
  metadata: { id: "etf-flow", name: "Sector ETF Momentum Agent", category: "ETF_FLOW", priority: 4 },
  execute,
  confidence,
  health,
};
