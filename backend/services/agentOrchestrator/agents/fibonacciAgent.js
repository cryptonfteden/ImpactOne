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
    // Fibonacci has authority to vote only when the completed weekly close
    // is inside the approved 0-5% band above the weekly 0.886 point.
    direction: report.signalEligible ? "BULLISH" : null,
    evidence: [
      ...(report.primarySwing ? [{ observedFact: `Completed-week swing: low ${report.primarySwing.swingLow.toFixed(2)} (${report.primarySwing.swingLowDate}) to later high ${report.primarySwing.swingHigh.toFixed(2)} (${report.primarySwing.swingHighDate}).` }] : []),
      ...(report.weeklyStrategy ? [{ observedFact: `Weekly 0.886 point: ${report.weeklyStrategy.targetPrice.toFixed(2)}; completed weekly close: ${report.weeklyStrategy.currentPrice.toFixed(2)}; distance: ${report.weeklyStrategy.distancePct.toFixed(2)}%.` }] : []),
      { observedFact: `Data quality: ${report.dataQuality.status}; ${report.dataQuality.barsUsed} completed weekly candles; latest ${report.dataQuality.latestCompletedWeek || "unknown"}.` },
      { observedFact: report.signalEligible ? "Weekly entry-alert gate is open." : "Weekly entry-alert gate is closed; Fibonacci casts no directional vote." },
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
  metadata: { id: "fibonacci", name: "Fibonacci Intelligence Agent", category: "TECHNICAL", priority: 10, strategyScope: "WEEKLY_0.886_ONLY" },
  execute,
  confidence,
  health,
};
