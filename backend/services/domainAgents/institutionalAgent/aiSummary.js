// Phase INSTITUTIONAL-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeBias(report) {
  return `Institutional Bias is ${report.institutionalBias} (score ${report.institutionalScore}), ownership trend ${report.ownershipTrend.trend.toLowerCase()}.`;
}

function describeAccumulation(report) {
  return `Accumulation score ${report.accumulationScore}/100, distribution score ${report.distributionScore}/100.`;
}

function describePositions(report) {
  return `${report.newPositions.length} new real position(s), ${report.closedPositions.length} closed, across ${report.topHolders.length} of the disclosed cohort currently holding.`;
}

function describeConviction(report) {
  return `Smart money participation ${report.smartMoneyParticipation}%, conviction score ${report.convictionScore}/100.`;
}

/**
 * @param {object} report - the composed institutional report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Institutional ownership analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeBias(report),
    describeAccumulation(report),
    describePositions(report),
    describeConviction(report),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
