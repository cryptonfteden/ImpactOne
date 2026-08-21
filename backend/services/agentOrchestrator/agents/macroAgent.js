// Phase MACRO-AGENT-001 — a real agent, not a stub. All of the actual
// macro analysis lives in domainAgents/macroAgent/macroAgent.js
// (real FRED + real market-proxy data, already tested) — this file
// only adapts its existing output into the generic Agent interface.
//
// Honesty note: macro conditions are market-wide, not symbol-specific
// — there is no per-symbol macro engine, nor should there be. This
// agent's `execute(symbol)` deliberately ignores the symbol and
// reports the real, market-wide macro reading, disclosed as such in
// its own summary text — mirroring the existing market-wide
// "sentiment" agent's own honesty pattern.
const macroDomainAgent = require("../../domainAgents/macroAgent/macroAgent");

async function execute() {
  const report = await macroDomainAgent.generateReport();

  return {
    summary: `Macro Intelligence (market-wide, not symbol-specific) — ${report.aiSummary}`,
    direction: report.signalEligible === false || report.macroBias === "UNKNOWN" ? null : report.macroBias,
    evidence: [
      { observedFact: `Macro coverage: ${report.dataQuality.availableSourceCount}/${report.dataQuality.totalSourceCount} identified sources; ${report.dataQuality.criticalAvailable}/6 critical series.` },
      ...(report.contrarianWatch.active ? [{ observedFact: report.contrarianWatch.meaning }] : []),
      ...report.bullishFactors.map((factor) => ({ observedFact: factor })),
      ...report.bearishFactors.map((factor) => ({ observedFact: factor })),
      ...report.risks.map((risk) => ({ observedFact: risk })),
    ],
    raw: report,
  };
}

function confidence(result) {
  return Number.isFinite(result?.raw?.confidence) ? result.raw.confidence : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "macro", name: "Macro Intelligence Agent", category: "MACRO", priority: 6 },
  execute,
  confidence,
  health,
};
