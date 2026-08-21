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

function describeEodContext(metrics) {
  const context = metrics.historicalContext;
  if (!context || !Number.isFinite(context.volumeVsAverage)) return null;
  const multiple = context.volumeVsAverage.toFixed(1);
  const label = context.activityLevel === "UNUSUALLY_HIGH"
    ? "unusually high"
    : context.activityLevel === "ELEVATED"
      ? "elevated"
      : context.activityLevel === "LOW"
        ? "below normal"
        : "near its recent norm";
  return `Official end-of-day volume was ${multiple}x its ${context.baselineSessions}-session baseline (${label}); this does not identify real-time sweeps or trade direction.`;
}

function describeInstitutional(signals) {
  if (!signals.institutionalActivity.detected) return null;
  const count = signals.institutionalActivity.contractCount;
  return `${count} block/sweep-sized trade${count === 1 ? "" : "s"} were detected, consistent with larger, more deliberate order flow.`;
}

function describeRisk(risk) {
  if (risk.dataConfidence === "NONE") return "No options-flow data is currently available for this symbol.";
  if (risk.dataConfidence === "LOW") return "Overall data depth this window is limited, so this read should be treated as market context, not a firm signal.";
  return null;
}

function buildAiSummary({ metrics, bias, signals, risk, dataQuality = null }) {
  if (!metrics.dataAvailable) {
    return "No options-flow data source is currently connected for this symbol, so no market-bias read is available. This will resolve automatically once a real options-flow provider is configured.";
  }

  const eligibilitySentence = dataQuality && !dataQuality.signalEligible
    ? "No verified unusual options activity cleared the baseline and confidence gates, so this mix is context only—not a directional signal."
    : describeBias(bias);
  const sentences = [describeVolume(metrics), describeEodContext(metrics), eligibilitySentence, describeInstitutional(signals), describeRisk(risk)].filter(Boolean);

  // Keep to the mission's 2-4 sentence spec even if every clause fired.
  return sentences.slice(0, 4).join(" ");
}

module.exports = { buildAiSummary };
