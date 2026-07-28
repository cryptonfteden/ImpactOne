// Phase OPTIONS-AGENT-001 — the mission calls this section "AI Summary",
// but the implementation is a deterministic, template-based composition
// over the report's own already-computed real fields — NOT a call to an
// LLM/external paid API. This is a deliberate, disclosed choice
// consistent with this project's established pattern (see
// investorProfileService's own deterministic "AI Investment Profile"):
// every sentence below traces back to a specific real number computed
// earlier in this same report, so the summary can never say something
// the structured data doesn't support. Always 2-4 sentences, per the
// mission's own spec.
function describeVolume(metrics) {
  const { call, put, total } = metrics.optionVolume;
  if (total === 0) return "No options volume was observed for this symbol in the current window.";
  const callShare = Math.round((call / total) * 100);
  return `Options volume this window totaled ${total} contracts, split ${callShare}% calls / ${100 - callShare}% puts.`;
}

function describeBias(bias) {
  if (bias.bias === "NEUTRAL") {
    return "Options flow shows no clear directional lean right now.";
  }
  const direction = bias.bias === "BULLISH" ? "a bullish" : "a bearish";
  return `Options flow leans toward ${direction} bias, with ${bias.confidence}% confidence based on volume, skew, and block-trade evidence.`;
}

function describeInstitutional(signals) {
  if (!signals.institutionalActivity.detected) return null;
  const count = signals.institutionalActivity.contractCount;
  return `${count} block/sweep-sized trade${count === 1 ? "" : "s"} were detected, consistent with larger, more deliberate order flow.`;
}

function describeRisk(risk) {
  if (risk.dataConfidence === "NONE") return "No options-flow data is currently available for this symbol.";
  if (risk.dataConfidence === "LOW") return "Overall data depth this window is limited, so this read should be treated as directional context, not a firm signal.";
  return null;
}

function buildAiSummary({ metrics, bias, signals, risk }) {
  if (!metrics.dataAvailable) {
    return "No options-flow data source is currently connected for this symbol, so no market-bias read is available. This will resolve automatically once a real options-flow provider is configured.";
  }

  const sentences = [describeVolume(metrics), describeBias(bias), describeInstitutional(signals), describeRisk(risk)].filter(Boolean);

  // Keep to the mission's 2-4 sentence spec even if every clause fired.
  return sentences.slice(0, 4).join(" ");
}

module.exports = { buildAiSummary };
