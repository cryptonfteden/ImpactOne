// Phase VALUATION-AGENT-001 — the mission calls this section "AI
// Summary", but as with OPTIONS-AGENT-001/EARNINGS-AGENT-001, the
// implementation is a deterministic, template-based composition over
// the report's own already-computed real fields — NOT a call to an
// LLM/external API. Every sentence traces back to a specific real
// number computed earlier in this same report. Always 2-4 sentences.
// Per FAIR_VALUE_METHODOLOGY.md §4, this never uses directive language
// ("buy"/"sell") — only price-to-estimate relationship language.
const STATUS_PHRASE = {
  UNDERVALUED: "is trading below its estimated fair value",
  OVERVALUED: "is trading above its estimated fair value",
  FAIRLY_VALUED: "is trading close to its estimated fair value",
  UNKNOWN: "cannot be assessed against a fair value estimate right now",
};

function describeStatus(report) {
  const phrase = STATUS_PHRASE[report.valuationStatus] || STATUS_PHRASE.UNKNOWN;
  if (report.estimatedFairValue === null) {
    return `This symbol ${phrase} (${report.unavailableForFairValueReason || "insufficient data"}).`;
  }
  const discountPercent = Math.abs(Math.round((report.discountToFairValue || 0) * 100));
  return `At $${report.inputs.price?.toFixed(2)} against an estimated fair value of $${report.estimatedFairValue.toFixed(2)}, this symbol ${phrase}${discountPercent > 0 ? ` by roughly ${discountPercent}%` : ""}.`;
}

function describeSupportingMetrics(report) {
  if (!report.supportingMetrics.length) return null;
  const top = report.supportingMetrics[0];
  return `The ${top.method.replace(/_/g, "/")} method contributed most to this estimate (${top.contributionPercent}% weight), alongside ${report.supportingMetrics.length - 1} other method(s).`;
}

function describeZones(report) {
  if (report.highMarginOfSafety) return "This represents a large, well-corroborated discount with genuine value-creation evidence (ROIC above its cost-of-capital proxy).";
  if (report.attractiveRangeCaveat) return report.attractiveRangeCaveat;
  if (report.attractiveRange) return "This discount clears this report's standard margin-of-safety threshold.";
  return null;
}

function describeConfidence(report) {
  if (report.confidence < 40) return `Confidence in this estimate is limited (${report.confidence}/100) — treat it as indicative only.`;
  return null;
}

function buildAiSummary(report) {
  if (!report.dataAvailable) {
    return `No real valuation data source is currently connected for this symbol (${report.unavailableReason || "reason unavailable"}), so no fair-value estimate is possible. This will resolve automatically once a real data source is configured.`;
  }
  if (report.estimatedFairValue === null) {
    const reason = String(report.unavailableForFairValueReason || "insufficient usable valuation methods this window").replace(/[.!?]+$/, "");
    return `A composite fair-value estimate could not be honestly computed for this symbol — ${reason}. A valuation signal, not a recommendation — evaluate this alongside your own research and the platform's other evidence.`;
  }

  const sentences = [describeStatus(report), describeSupportingMetrics(report), describeZones(report), describeConfidence(report)].filter(Boolean);
  return sentences.slice(0, 4).join(" ");
}

module.exports = { buildAiSummary };
