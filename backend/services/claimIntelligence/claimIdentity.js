// Phase AI-CORE-001 — Claim Intelligence Layer. Deterministic claim
// identity (mission §4): subject + expected direction + time horizon +
// affected symbols/sectors/markets + causal context. Two evidence
// submissions that agree on all of these are the SAME claim (dedup);
// changing any one of them is a DIFFERENT claim — most importantly,
// direction and time horizon are both part of identity, so a bullish and
// a bearish claim about the same symbol are never the same claim (never
// silently merged, mission §4), and a "3-day" claim and a "3-month" claim
// about the same symbol/direction are also never the same claim.
const crypto = require("crypto");

function sortedUnique(values = []) {
  return [...new Set(values.map((value) => String(value).toUpperCase()))].sort();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

/**
 * `causalContext` is a short, real, engine-supplied string identifying
 * WHY this claim exists in causal terms (e.g. "sweep-driven-momentum",
 * "macro-regime-shift") — distinct claims about the same
 * subject/direction/horizon but resting on genuinely different causal
 * reasoning are intentionally kept separate (e.g. "NVDA likely up because
 * of a sweep" vs. "NVDA likely up because of sector rotation" are related
 * but not identical claims until real evidence links them).
 */
function computeIdentityKey({ subject, expectedDirection, timeHorizon, symbols = [], sectors = [], regions = [], causalContext = "" }) {
  const basis = stableStringify({
    subject: String(subject || "").toUpperCase(),
    expectedDirection,
    timeHorizon,
    symbols: sortedUnique(symbols),
    sectors: sortedUnique(sectors),
    regions: sortedUnique(regions),
    causalContext: String(causalContext || "").toLowerCase().trim(),
  });
  return crypto.createHash("sha256").update(basis).digest("hex");
}

/**
 * Two claims are the "same subject+horizon series" (used to detect
 * direct contradiction) when they share subject/timeHorizon/symbols but
 * NOT necessarily causalContext or direction — this is intentionally
 * broader than computeIdentityKey, since a contradiction check must find
 * an opposing claim even if it arose from different causal reasoning.
 */
function computeSubjectHorizonKey({ subject, timeHorizon, symbols = [] }) {
  const basis = stableStringify({ subject: String(subject || "").toUpperCase(), timeHorizon, symbols: sortedUnique(symbols) });
  return crypto.createHash("sha256").update(basis).digest("hex");
}

function isOpposingDirection(directionA, directionB) {
  return (directionA === "BULLISH" && directionB === "BEARISH") || (directionA === "BEARISH" && directionB === "BULLISH");
}

module.exports = { computeIdentityKey, computeSubjectHorizonKey, isOpposingDirection, sortedUnique };
