// Phase ETF-FLOW-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — plain string concatenation, consistent with every other
// domain agent built this session.
function describeTarget(report) {
  const via = report.isDirectEtf ? `directly analyzing ${report.targetEtf}` : `via its sector proxy ${report.targetEtf} (${report.sector})`;
  return `ETF Flow analysis for ${report.symbol}, ${via}.`;
}

function describeBias(report) {
  return `ETF Flow Bias is ${report.etfFlowBias} (net flow score ${report.netFlowScore}), flow strength ${report.flowStrength.classification.toLowerCase()}, persistence ${report.flowPersistence.classification.toLowerCase()}.`;
}

function describeRotation(report) {
  if (report.sectorRotation.classification === "UNKNOWN") return "Sector rotation could not be assessed.";
  return `Sector rotation: ${report.sectorRotation.classification.replace("_", " ").toLowerCase()}.`;
}

function describePassiveActive(report) {
  return `Passive/active classification: ${report.passiveFlowImpact.classification.toLowerCase()}, flow magnitude ${report.passiveFlowImpact.magnitudeTier.toLowerCase()}.`;
}

/**
 * @param {object} report - the composed ETF flow report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `ETF flow analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
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
