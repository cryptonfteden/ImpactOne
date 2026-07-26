// Phase AI-CORE-001 — Claim Intelligence Layer. Translates a real
// Intelligence Bus event (mission §11: only "options" and "sentiment"
// this phase) into one real evidence-ledger candidate. Every field
// produced here traces to a real field on the Bus event's payload —
// nothing is invented when a payload field is absent (e.g. no
// aggressorSide → NEUTRAL, never guessed as bullish or bearish).
const { isIntegratedEngine } = require("./claimDimensions");

/**
 * The engine-specific translation of "what direction does this evidence
 * imply." Returns "BULLISH" | "BEARISH" | "NEUTRAL" — never fabricated
 * beyond what the payload actually states.
 */
function inferEvidenceDirection(engineId, payload = {}) {
  if (engineId === "options") {
    if (payload.aggressorSide === "BUY") return "BULLISH";
    if (payload.aggressorSide === "SELL") return "BEARISH";
    return "NEUTRAL";
  }
  if (engineId === "sentiment") {
    if (Number.isFinite(payload.score)) {
      if (payload.score > 55) return "BULLISH";
      if (payload.score < 45) return "BEARISH";
    }
    return "NEUTRAL";
  }
  return "NEUTRAL";
}

// Real, disclosed, approximate mapping onto the reused TimeWindow enum —
// neither engine's real native horizon lines up exactly with D1/W1/etc.,
// so this is an honest simplification, not a precise conversion (stated
// here, not hidden): options signals are intraday/next-few-sessions
// (closest real bucket: D1); sentiment is a daily-cadence composite read
// best treated as a near-term (closest real bucket: W1) outlook.
function inferTimeHorizon(engineId) {
  if (engineId === "options") return "D1";
  if (engineId === "sentiment") return "W1";
  return "D1";
}

function buildObservedFact(engineId, payload = {}) {
  if (payload.explanation) return payload.explanation;
  if (payload.summary) return payload.summary;
  if (engineId === "options") {
    return `${payload.symbol || "This symbol"} showed a ${payload.signalType || "notable"} options-flow signal.`;
  }
  if (engineId === "sentiment") {
    return `Market sentiment reading of ${Number.isFinite(payload.score) ? payload.score : "an unavailable score"}/100.`;
  }
  return "An intelligence event was published.";
}

function buildCausalContext(engineId, payload = {}) {
  if (engineId === "options") return `options:${payload.signalType || "unknown"}`;
  if (engineId === "sentiment") return "sentiment:overall";
  return `${engineId}:unknown`;
}

/**
 * `independenceGroup` — evidence entries sharing this key are NOT
 * counted as independent of each other by claimConfidence.js. Grouped by
 * (sourceEngine, sourceProvider) — two readings from the same underlying
 * provider are correlated, never treated as two independent
 * confirmations.
 */
function buildIndependenceGroup(busEvent) {
  const provider = busEvent.provenance?.sourceEventId ? busEvent.engineId : busEvent.engineId;
  return `${busEvent.engineId}:${busEvent.provenance?.sourceProvider || provider}`;
}

/**
 * Never throws — an event from a non-integrated engine (mission §11)
 * returns `null`, not an error, since this is an expected, routine
 * filter, not a malformed-input case.
 */
function buildEvidenceCandidateFromBusEvent(busEvent, { now = new Date() } = {}) {
  if (!busEvent || !isIntegratedEngine(busEvent.engineId)) {
    return null;
  }

  const evidenceDirection = inferEvidenceDirection(busEvent.engineId, busEvent.payload || {});
  const publishedAt = busEvent.publishedAt instanceof Date ? busEvent.publishedAt : new Date(busEvent.publishedAt);
  const ageMs = Number.isNaN(publishedAt.getTime()) ? null : now.getTime() - publishedAt.getTime();

  return {
    intelligenceBusEventId: busEvent.id || null,
    sourceEngine: busEvent.engineId,
    sourceProvider: busEvent.provenance?.sourceProvider || busEvent.provenance?.sourceEngine || busEvent.engineId,
    evidenceDirection,
    confidence: Number.isFinite(busEvent.confidence) ? busEvent.confidence : null,
    freshness: { ageMs },
    independenceGroup: buildIndependenceGroup(busEvent),
    observedFact: buildObservedFact(busEvent.engineId, busEvent.payload || {}),
    inference: busEvent.payload?.inference || null,
    causalContext: buildCausalContext(busEvent.engineId, busEvent.payload || {}),
    timeHorizon: inferTimeHorizon(busEvent.engineId),
    symbols: busEvent.symbols || [],
    subject: (busEvent.symbols || [])[0] || busEvent.provenance?.market || busEvent.engineId,
  };
}

/**
 * The stance is relative to a SPECIFIC claim's expectedDirection — the
 * same evidence candidate SUPPORTS a bullish claim and CONTRADICTS a
 * bearish one about the same subject. NEUTRAL-direction evidence never
 * produces a stance (mission: never fabricate a directional read the
 * evidence doesn't actually contain) — callers should not create/update
 * a claim from NEUTRAL-direction evidence alone.
 */
function computeStance(evidenceDirection, claimExpectedDirection) {
  if (evidenceDirection === "NEUTRAL") return null;
  return evidenceDirection === claimExpectedDirection ? "SUPPORTS" : "CONTRADICTS";
}

module.exports = {
  inferEvidenceDirection,
  inferTimeHorizon,
  buildObservedFact,
  buildCausalContext,
  buildIndependenceGroup,
  buildEvidenceCandidateFromBusEvent,
  computeStance,
};
