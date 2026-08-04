// Phase INSIDER-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeActivity(report) {
  return `Insider Activity is ${report.insiderActivity} (net insider score ${report.netInsiderScore}).`;
}

function describeCluster(report) {
  if (report.clusterActivity.clusterBuy) return `Cluster buying was detected (${report.clusterActivity.distinctBuyers} distinct insiders within ${report.clusterActivity.windowDays} days).`;
  if (report.clusterActivity.clusterSell) return `Cluster selling was detected (${report.clusterActivity.distinctSellers} distinct insiders within ${report.clusterActivity.windowDays} days).`;
  return "No real cluster buying or selling was detected in this window.";
}

function describeExecutive(report) {
  const parts = [];
  if (report.executiveActivity.hasCeoActivity) parts.push("the CEO transacted");
  if (report.executiveActivity.hasCfoActivity) parts.push("the CFO transacted");
  return parts.length ? `Notably, ${parts.join(" and ")} in this window.` : "";
}

function describeSignificance(report) {
  if (report.transactionSize.overallSignificance === "NONE") return "No real, priced open-market transactions were available to size.";
  return `Transaction significance is ${report.transactionSize.overallSignificance.toLowerCase()} (largest real transaction: ${report.transactionSize.largestTransaction.transactionCode === "P" ? "purchase" : "sale"} of ${report.transactionSize.largestTransaction.shares} shares).`;
}

function describeOwnership(report) {
  return `Ownership trend is ${report.ownershipTrend.trend.toLowerCase()} across the analyzed real filings.`;
}

/**
 * @param {object} report - the composed insider report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Insider trading analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeActivity(report),
    describeCluster(report),
    describeExecutive(report),
    describeSignificance(report),
    describeOwnership(report),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
