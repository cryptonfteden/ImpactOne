// Phase MACRO-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeBias(report) {
  return `Macro Bias is ${report.macroBias} (Macro Score ${report.macroScore}/-100..100), within a ${report.economicCycle.toLowerCase()} phase of the economic cycle.`;
}

function describeConditions(report) {
  return `Inflation pressure is ${report.inflationPressure.toLowerCase()}, employment is ${report.employmentTrend.toLowerCase()}, and monetary policy is ${report.policyDirection.toLowerCase()}.`;
}

function describeRiskAndStress(report) {
  return `Recession risk is ${report.recessionRisk.toLowerCase()} and market stress is ${report.marketStress.toLowerCase()} (liquidity score ${report.liquidityScore}/100).`;
}

function describeFactors(report) {
  const parts = [];
  if (report.bullishFactors.length) parts.push(`Bullish factors: ${report.bullishFactors.join(" ")}`);
  if (report.bearishFactors.length) parts.push(`Bearish factors: ${report.bearishFactors.join(" ")}`);
  if (report.risks.length) parts.push(`Risks: ${report.risks.join(" ")}`);
  return parts.join(" ");
}

/**
 * @param {object} report - the composed macro report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Macro analysis is unavailable: ${report.unavailableReason}`;
  }

  const sentences = [
    describeBias(report),
    describeConditions(report),
    describeRiskAndStress(report),
    describeFactors(report),
    `Overall confidence in this read is ${report.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
