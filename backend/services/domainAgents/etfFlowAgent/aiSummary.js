// Phase ETF-FLOW-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeTarget(report) {
  const via = report.isDirectEtf ? `directly analyzing ${report.targetEtf}` : `via its sector proxy ${report.targetEtf} (${report.sector})`;
  return `Sector ETF momentum for ${report.symbol}, ${via}.`;
}

function describeBias(report) {
  return `Price-and-volume momentum is ${report.etfFlowBias} (proxy score ${report.netFlowScore}), with ${report.flowStrength.classification.toLowerCase()} activity and ${report.flowPersistence.classification.toLowerCase()} persistence.`;
}

function describeRotation(report) {
  if (report.sectorRotation.classification === "UNKNOWN") return "Sector rotation could not be assessed.";
  return `Sector rotation: ${report.sectorRotation.classification.replace("_", " ").toLowerCase()}.`;
}

function describePassiveActive(report) {
  return `The ETF is classified as ${report.passiveFlowImpact.classification.toLowerCase()}; observed trading-activity magnitude is ${report.passiveFlowImpact.magnitudeTier.toLowerCase()}. This is not creation/redemption cash flow.`;
}

/**
 * @param {object} report - the composed ETF flow report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Sector ETF momentum is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    describeTarget(report),
    describeBias(report),
    describeRotation(report),
    describePassiveActive(report),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
