// Phase AGENT-ORCHESTRATOR-001 — a real agent, not a stub. All of the
// actual technical analysis lives in technicalIntelligenceService.js
// (already real, already tested) — this file only adapts its existing
// output into the generic Agent interface; it invents no new analysis.
const technicalIntelligenceService = require("../../intelligence/technicalIntelligenceService");

async function execute(symbol) {
  const analysis = await technicalIntelligenceService.analyzeSymbol(symbol);
  if (analysis.enoughDataStatus === "INSUFFICIENT") {
    return {
      summary: analysis.errorState || "Not enough price history to analyze this symbol yet.",
      direction: null,
      evidence: [],
      raw: analysis,
    };
  }

  const trend = analysis.signals?.trend || null;
  return {
    summary: trend ? `Trend signal: ${trend.signal}.` : "Technical analysis complete.",
    direction: trend?.signal || null,
    evidence: Object.values(analysis.signals || {})
      .filter((signal) => signal && signal.enoughDataStatus === "SUFFICIENT")
      .map((signal) => ({ observedFact: `${signal.name}: ${signal.signal}` })),
    raw: analysis,
  };
}

function confidence(result) {
  const trend = result?.raw?.signals?.trend;
  return Number.isFinite(trend?.strength) ? trend.strength : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "technical", name: "Technical Analysis Agent", category: "TECHNICAL", priority: 8 },
  execute,
  confidence,
  health,
};
