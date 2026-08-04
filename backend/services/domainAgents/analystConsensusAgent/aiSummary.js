// Phase ANALYST-CONSENSUS-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeBias(report) {
  return `Analyst Bias is ${report.analystBias} (Consensus Score ${report.consensusScore}), based on ${report.coverageQuality === "UNKNOWN" ? "an unknown number of" : report.totalAnalysts} covering analysts (Coverage Quality: ${report.coverageQuality.toLowerCase()}).`;
}

function describeTrendAndConviction(report) {
  return `Rating Trend is ${report.ratingTrend.toLowerCase()} (Revision Score ${report.revisionScore}), with a Conviction Score of ${report.convictionScore}/100.`;
}

function describeTargets(report) {
  if (report.targetScore === null) {
    return "Price targets are unavailable for this symbol.";
  }
  return `Target Score is ${report.targetScore}/100 (dispersion ${report.targetDispersion}% of the mean target).`;
}

function describeFactors(report) {
  const parts = [];
  if (report.opportunities.length) parts.push(`Opportunities: ${report.opportunities.join(" ")}`);
  if (report.risks.length) parts.push(`Risks: ${report.risks.join(" ")}`);
  return parts.join(" ");
}

/**
 * @param {object} report - the composed analyst-consensus report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Analyst consensus analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeBias(report),
    describeTrendAndConviction(report),
    describeTargets(report),
    describeFactors(report),
    `Overall confidence in this read is ${report.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
