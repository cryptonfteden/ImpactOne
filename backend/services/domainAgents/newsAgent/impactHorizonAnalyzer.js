// Phase NEWS-AGENT-001 — "Expected market impact" → "Impact Horizon".
// A disclosed rule table (never a naive average) over three real
// upstream signals: real Importance Score, real freshness (is this
// breaking), and real event persistence — a fresh, important,
// sustained story is read as a longer-horizon impact; a stale,
// low-importance, single-day story as a short-lived one.
/**
 * @param {number} importanceScore - 0-100
 * @param {boolean} isBreaking
 * @param {"SINGLE_DAY"|"MULTI_DAY"|"SUSTAINED"|"UNKNOWN"} persistenceClassification
 * @returns {"SHORT"|"MEDIUM"|"LONG"|"UNKNOWN"}
 */
function analyzeImpactHorizon(importanceScore, isBreaking, persistenceClassification) {
  if (persistenceClassification === "UNKNOWN") return "UNKNOWN";

  if (persistenceClassification === "SUSTAINED" && importanceScore >= 50) return "LONG";
  if (persistenceClassification === "MULTI_DAY" && importanceScore >= 40) return "MEDIUM";
  if (isBreaking && importanceScore >= 60) return "MEDIUM";

  return "SHORT";
}

module.exports = { analyzeImpactHorizon };
