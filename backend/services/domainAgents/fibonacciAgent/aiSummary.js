// Phase FIBONACCI-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — it is plain string concatenation, consistent with every other
// domain agent built this session.
function describeTrendContext(trendContext) {
  if (trendContext === "NEUTRAL") return "Trend context shows no clear directional lean";
  return `Trend context is ${trendContext.toLowerCase()}`;
}

function describeSwing(primarySwing) {
  if (!primarySwing) return "no clear primary swing could be detected";
  const directionWord = primarySwing.direction === "UP" ? "an up-swing" : "a down-swing";
  return `the primary swing detected is ${directionWord} from ${primarySwing.swingLow.toFixed(2)} to ${primarySwing.swingHigh.toFixed(2)}`;
}

function describeConfluence(highProbabilityZones) {
  if (!highProbabilityZones.length) return "No real multi-source confluence zone was found.";
  const top = highProbabilityZones[0];
  return `The strongest confluence zone sits near ${top.centerPrice.toFixed(2)} (${top.confluenceScore} independent sources agree: ${top.sources.join(", ")}).`;
}

function describeZones(entryZone, riskZone) {
  const parts = [];
  if (entryZone) parts.push(`Entry zone near ${entryZone.centerPrice.toFixed(2)}`);
  if (riskZone) parts.push(`risk zone near ${riskZone.centerPrice.toFixed(2)}`);
  return parts.length ? `${parts.join(", ")}.` : "";
}

/**
 * @param {object} report - the composed fibonacci report
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Fibonacci analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    `${describeTrendContext(report.trendContext)}, and ${describeSwing(report.primarySwing)}.`,
    describeConfluence(report.highProbabilityZones),
    describeZones(report.entryZone, report.riskZone),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
