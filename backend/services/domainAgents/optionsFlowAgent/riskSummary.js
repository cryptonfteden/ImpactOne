// Phase OPTIONS-AGENT-001 — a short, structured risk note. Deterministic
// rule-based, not a model: every clause below fires only on a real,
// checkable condition already present on the metrics/bias/signals
// objects already computed — no clause is ever speculative.
function buildRiskSummary({ metrics, bias, signals }) {
  const notes = [];

  if (!metrics.dataAvailable) {
    notes.push("No options-flow data source is currently connected for this symbol — this report cannot assess risk beyond that gap.");
    return { notes, dataConfidence: "NONE" };
  }

  if (metrics.optionVolume.total < 20) {
    notes.push(`Total option volume this window was thin (${metrics.optionVolume.total} contracts) — any bias reading here carries low statistical weight.`);
  }

  if (metrics.openInterest.total === null) {
    notes.push("No open-interest snapshot is available yet for this symbol — volume/OI ratio and positioning context are incomplete.");
  }

  if (signals.institutionalActivity.detected && bias.bias !== "NEUTRAL") {
    notes.push(`Real block/sweep activity was detected alongside a ${bias.bias.toLowerCase()} lean — this concentrates risk if that flow reverses or was a hedge rather than a directional bet (this report cannot distinguish the two with certainty).`);
  }

  const contractCount = new Set(metrics.unusualContracts.map((signal) => `${signal.expiry}|${signal.strike}|${signal.optionType}`)).size;
  if (contractCount === 1 && metrics.unusualContracts.length > 0) {
    notes.push("Every unusual signal this window traces back to a single contract — this is concentration risk, not broad-based positioning.");
  }

  if (metrics.greeks.iv === null) {
    notes.push("Implied volatility, IV Rank, IV Percentile, delta, and gamma exposure are not available from any connected data source — this report's read is based on volume/open-interest/block-flow evidence only.");
  }

  if (!notes.length) {
    notes.push("No specific elevated-risk conditions were flagged this window beyond the general limits of volume/flow-based analysis.");
  }

  const dataConfidence = metrics.optionVolume.total >= 100 && metrics.openInterest.total !== null ? "MODERATE" : "LOW";
  return { notes, dataConfidence };
}

module.exports = { buildRiskSummary };
