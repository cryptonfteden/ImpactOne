// Phase EARNINGS-AGENT-001 — the mission calls this section "AI
// Summary", but as with OPTIONS-AGENT-001, the implementation is a
// deterministic, template-based composition over the report's own
// already-computed real fields — NOT a call to an LLM/external API.
// Every sentence traces back to a specific real number computed earlier
// in this same report. Always 2-4 sentences, per the mission's spec.
function describeGrowth(metrics, growth) {
  if (growth.growthScore === null) return "No real revenue or EPS growth data is currently available for this symbol.";
  const parts = [];
  if (metrics.revenue.growthYoY !== null) parts.push(`revenue growth of ${metrics.revenue.growthYoY.toFixed(1)}% YoY`);
  if (metrics.eps.growthYoY !== null) parts.push(`EPS growth of ${metrics.eps.growthYoY.toFixed(1)}% YoY`);
  if (!parts.length) return `A growth score of ${growth.growthScore}/100 was computed from the available data.`;
  return `Recent results show ${parts.join(" and ")}.`;
}

function describeHealth(health) {
  if (health.earningsHealth === "UNKNOWN") return null;
  return `Overall earnings health is rated ${health.earningsHealth} based on the available margin, growth, and consistency signals.`;
}

function describeSurprise(surprise) {
  if (surprise.surpriseScore === null) return null;
  const consistencyPhrase = surprise.consistency.rating !== "UNKNOWN" ? ` with ${surprise.consistency.rating.toLowerCase()} historical consistency` : "";
  return `EPS surprises have scored ${surprise.surpriseScore}/100${consistencyPhrase}.`;
}

function describeOutlook(outlook) {
  if (outlook.outlook === "UNKNOWN") return "Forward outlook cannot be assessed without a connected guidance or analyst-revision data source.";
  return `Forward outlook reads ${outlook.outlook.toLowerCase()} based on the signals currently available.`;
}

function buildAiSummary({ metrics, growth, surprise, outlook, health }) {
  if (!metrics.dataAvailable) {
    return `No real earnings data source is currently connected for this symbol (${metrics.unavailableReason || "reason unavailable"}), so no earnings-intelligence read is possible. This will resolve automatically once a real data source is configured.`;
  }

  const sentences = [describeGrowth(metrics, growth), describeSurprise(surprise), describeHealth(health), describeOutlook(outlook)].filter(Boolean);

  return sentences.slice(0, 4).join(" ");
}

module.exports = { buildAiSummary };
