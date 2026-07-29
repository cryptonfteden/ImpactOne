// Phase AGENT-ORCHESTRATOR-001 — registration originally wrapped
// technicalIntelligenceService.analyzeSymbol() directly (already real,
// already tested, but only the coarser signal set — trend, RSI, MACD,
// ATR, Bollinger, Fibonacci, support/resistance, breakout).
// Phase TECHNICAL-AGENT-001 — upgraded to the fuller Domain
// Intelligence Agent (backend/services/domainAgents/technicalAgent/):
// adds ADX-based trend strength, a combined RSI+MACD momentum read,
// richer support/resistance levels (pivots + Fibonacci, not just the
// single range extremes), a disclosed breakout-probability estimate, a
// volatility/ATR-based risk level, a blended confidence score, and a
// deterministic (not an LLM call) AI summary. This file still only
// adapts that engine's already-real report into the generic Agent
// interface — the same discipline every other real agent here follows.
const technicalAgentEngine = require("../../domainAgents/technicalAgent/technicalAgent");

async function execute(symbol) {
  const report = await technicalAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL trend reports no opinion.
    direction: report.trend === "NEUTRAL" ? null : report.trend,
    evidence: [
      { observedFact: `Trend: ${report.trend} (trend strength ${report.trendStrength}/100, ${report.trendStrengthSource}).` },
      { observedFact: `Momentum: ${report.momentum.state}.` },
      ...(report.levels.supportLevels[0] ? [{ observedFact: `Nearest support: ${report.levels.supportLevels[0].price.toFixed(2)} (${report.levels.supportLevels[0].source}).` }] : []),
      ...(report.levels.resistanceLevels[0] ? [{ observedFact: `Nearest resistance: ${report.levels.resistanceLevels[0].price.toFixed(2)} (${report.levels.resistanceLevels[0].source}).` }] : []),
      { observedFact: `Risk level: ${report.risk.riskLevel} (${report.risk.reason})` },
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
  metadata: { id: "technical", name: "Technical Analysis Agent", category: "TECHNICAL", priority: 8 },
  execute,
  confidence,
  health,
};
