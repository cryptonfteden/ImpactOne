// Phase SENTIMENT-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — it is plain string concatenation, consistent with every other
// domain agent built this session.
function describeState(report) {
  return `Sentiment State is ${report.sentimentState} (score ${report.sentimentScore}/100), trending ${report.sentimentTrend.toLowerCase()}.`;
}

function describeVelocityAndActivity(report) {
  const parts = [];
  if (!report.sentimentVelocity.insufficientData) {
    parts.push(`Sentiment velocity is ${report.sentimentVelocity.value} ${report.sentimentVelocity.unit}.`);
  }
  if (report.abnormalActivity.hasAbnormalActivity) {
    parts.push("Abnormal sentiment/volume activity was detected in this window.");
  }
  return parts.join(" ");
}

function describeSourceQuality(report) {
  return `Based on ${report.sourceQuality.totalArticleCount} real article(s) from ${report.sourceQuality.distinctSourceCount} distinct source(s) (credibility score ${report.sourceQuality.credibilityScore}/100).`;
}

function describeFactors(report) {
  const parts = [];
  if (report.bullishFactors.length) parts.push(`Bullish factors: ${report.bullishFactors.join(" ")}`);
  if (report.bearishFactors.length) parts.push(`Bearish factors: ${report.bearishFactors.join(" ")}`);
  return parts.join(" ");
}

/**
 * @param {object} report - the composed sentiment report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Sentiment analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeState(report),
    describeVelocityAndActivity(report),
    describeSourceQuality(report),
    describeFactors(report),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
