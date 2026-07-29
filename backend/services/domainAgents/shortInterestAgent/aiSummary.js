// Phase SHORT-INTEREST-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeBias(report) {
  return `Short Interest Bias is ${report.shortInterestBias} (score ${report.shortInterestScore}), based on a real ${report.shortInterestTrend.trend.toLowerCase()} short-volume trend.`;
}

function describeSqueeze(report) {
  return `Squeeze probability is ${report.squeezeProbability}/100, crowdedness score ${report.crowdednessScore}/100.`;
}

function describeCovering(report) {
  return `Covering activity is ${report.coveringActivity.classification.toLowerCase()}.`;
}

function describeBorrowStress(report) {
  return "Borrow stress (utilization/fee/shares on loan) could not be assessed — no real securities-lending data source is connected.";
}

/**
 * @param {object} report - the composed short interest report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Short interest analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeBias(report),
    describeSqueeze(report),
    describeCovering(report),
    describeBorrowStress(report),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
