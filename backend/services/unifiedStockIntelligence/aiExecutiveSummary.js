// Phase UNIFIED-STOCK-INTELLIGENCE-001 — the "AI Executive Summary,"
// same disclosed discipline as every domain agent before it: a
// deterministic, template-based composition over this report's own
// already-computed real fields, NOT an LLM/external API call. Must
// explain: which agents contributed most and why, which signals
// conflicted, and how the final confidence was calculated — so this
// one is intentionally longer than a domain agent's 2-4 sentence
// summary, since it has more required content to cover honestly.
// Phase SENTIMENT-AGENT-001 — describes whichever agents actually
// contributed, by their real agentName, rather than a hardcoded
// "Options Flow, Earnings, and Valuation" phrase that would silently
// go stale the moment a 4th (or 5th) agent joins this aggregation.
function listAgentNames(report) {
  const names = report.agentContributions.map((agent) => agent.agentName);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function describeOverall(report) {
  const symbol = report.symbol;
  const word = report.overallIntelligence.toLowerCase();
  return `Aggregating the ${listAgentNames(report)} agents, ${symbol}'s unified read is ${word} at ${report.overallConfidence}/100 confidence.`;
}

function describeKeyDrivers(report) {
  if (!report.keyDrivers.length) return "No agent produced usable data this window, so no driver could be identified.";
  const top = report.keyDrivers[0];
  const rest = report.keyDrivers.slice(1);
  const restPhrase = rest.length ? `, followed by ${rest.map((d) => d.agentId).join(" and ")}` : "";
  return `The ${top.agentId} agent contributed most (${top.explanation})${restPhrase}.`;
}

function describeConflicts(report) {
  if (!report.conflictingSignals.length) return "No conflicting signals were found among the available agents this window.";
  const pairs = report.conflictingSignals.map((c) => `${c.agentA} (${c.directionA}) vs. ${c.agentB} (${c.directionB})`).join("; ");
  return `Real conflicting signals were found: ${pairs} — this disagreement is why confidence was capped rather than blended away.`;
}

function describeConfidenceCalculation(report) {
  const unavailableCount = report.totalAgentCount - report.contributingAgentCount;
  const parts = [];
  parts.push(`Confidence was computed from a priority-weighted average of only the agreeing agents' own confidence`);
  if (report.conflictingSignals.length > 0) parts.push("reduced by a real conflict penalty since at least one genuine disagreement was found");
  if (unavailableCount > 0) parts.push(`reduced further because ${unavailableCount} of ${report.totalAgentCount} agents could not produce usable data this window`);
  return `${parts.join(", ")} — never a simple average of the agents' own raw confidence scores.`;
}

function buildAiExecutiveSummary(report) {
  if (report.contributingAgentCount === 0) {
    const names = report.agentContributions.map((agent) => agent.agentName).join(", ");
    return `No real data was available from the ${names} agents for ${report.symbol} this window, so no unified intelligence read is possible. This will resolve automatically once at least one of those agents can produce data.`;
  }

  return [describeOverall(report), describeKeyDrivers(report), describeConflicts(report), describeConfidenceCalculation(report)].join(" ");
}

module.exports = { buildAiExecutiveSummary };
