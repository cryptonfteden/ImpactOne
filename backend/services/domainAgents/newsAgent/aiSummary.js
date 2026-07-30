// Phase NEWS-AGENT-001 — "AI Summary" is a deterministic, template-
// based composition of clauses derived from the report's own real,
// already-computed fields. This is NOT an LLM or external API call —
// plain string concatenation, consistent with every other domain agent
// built this session.
function describeBias(report) {
  return `News Bias is ${report.newsBias} (News Score ${report.newsScore}), with an Importance Score of ${report.importanceScore}/100.`;
}

function describeFreshnessAndConfirmation(report) {
  return `Freshness Score is ${report.freshnessScore}/100 and Confirmation Score is ${report.confirmationScore}/100, giving an Impact Horizon of ${report.impactHorizon.toLowerCase()}.`;
}

function describeSectors(report) {
  if (!report.affectedSectors.length) return "No specific sector coverage beyond this symbol was identified.";
  return `Affected sectors: ${report.affectedSectors.join(", ")}.`;
}

function describeFactors(report) {
  const parts = [];
  if (report.bullishFactors.length) parts.push(`Bullish factors: ${report.bullishFactors.join(" ")}`);
  if (report.bearishFactors.length) parts.push(`Bearish factors: ${report.bearishFactors.join(" ")}`);
  if (report.risks.length) parts.push(`Risks: ${report.risks.join(" ")}`);
  return parts.join(" ");
}

/**
 * @param {object} report - the composed news report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `News analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeBias(report),
    describeFreshnessAndConfirmation(report),
    describeSectors(report),
    describeFactors(report),
    `Overall confidence in this read is ${report.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
