// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Fibonacci retracement analysis existed only as an internal,
// non-exported helper inside technicalIntelligenceService.js
// (analyzeFibonacci) — an honest "unavailable" registration rather than
// reaching into another agent's internals.
// Phase FIBONACCI-AGENT-001 — upgraded to a real Domain Intelligence
// Agent (backend/services/domainAgents/fibonacciAgent/): automatic
// swing detection, retracement/extension levels, confluence zones,
// multi-timeframe agreement, real price-reaction history, dynamic
// support/resistance, entry/risk zones, confidence, and a 2-4 sentence
// (deterministic, template-based — not an LLM call) plain-language
// summary. This file still only adapts that engine's already-real
// report into the generic Agent interface; it invents no analysis of
// its own, the same discipline every other real agent here follows.
const fibonacciAgentEngine = require("../../domainAgents/fibonacciAgent/fibonacciAgent");

async function execute(symbol) {
  const report = await fibonacciAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL trend context reports no opinion.
    direction: report.trendContext === "NEUTRAL" ? null : report.trendContext,
    evidence: [
      ...(report.primarySwing ? [{ observedFact: `Primary swing: ${report.primarySwing.direction} from ${report.primarySwing.swingLow.toFixed(2)} to ${report.primarySwing.swingHigh.toFixed(2)}.` }] : []),
      ...(report.entryZone ? [{ observedFact: `Entry zone: ${report.entryZone.centerPrice.toFixed(2)} (confluence score ${report.entryZone.confluenceScore}).` }] : []),
      ...(report.riskZone ? [{ observedFact: `Risk zone: ${report.riskZone.centerPrice.toFixed(2)}.` }] : []),
      { observedFact: `Multi-timeframe agreement: ${report.timeframeAgreement}.` },
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
  metadata: { id: "fibonacci", name: "Fibonacci Intelligence Agent", category: "TECHNICAL", priority: 4 },
  execute,
  confidence,
  health,
};
