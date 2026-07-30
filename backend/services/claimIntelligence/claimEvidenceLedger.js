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
  // Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — the generic path for
  // every one of the 14 real Domain Intelligence Agents newly
  // integrated this phase (agentClaimBridge always publishes its own
  // already-computed, opaque `direction` string onto `payload.direction`
  // — see agentClaimBridge/agentClaimPublisher.js). Reading a real,
  // already-normalized field here is not "duplicated confidence/
  // direction logic" — it is the one place this module accepts a
  // pre-normalized direction instead of re-deriving one from
  // engine-specific raw fields, exactly the same real value the
  // orchestrator's own conflict detection already compares by equality.
  if (payload.direction === "BULLISH") return "BULLISH";
  if (payload.direction === "BEARISH") return "BEARISH";
  return "NEUTRAL";
}

// Real, disclosed, approximate mapping onto the reused TimeWindow enum —
// neither engine's real native horizon lines up exactly with D1/W1/etc.,
// so this is an honest simplification, not a precise conversion (stated
// here, not hidden): options signals are intraday/next-few-sessions
// (closest real bucket: D1); sentiment is a daily-cadence composite read
// best treated as a near-term (closest real bucket: W1) outlook.
// Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — real, disclosed,
// approximate horizon buckets for the 12 newly-integrated agents, same
// honest-simplification discipline as the original options/sentiment
// mapping above (no agent's real native horizon lines up exactly with
// the reused TimeWindow enum either).
const AGENT_TIME_HORIZONS = {
  technical: "D1",
  "symbol-sentiment": "W1",
  news: "D1",
  "short-interest": "M1", // FINRA's real short-volume data is daily, but short-interest theses play out over weeks
  earnings: "M3", // the next real reporting quarter
  valuation: "M3", // valuation theses are medium-term, not intraday
  fibonacci: "D1",
  insider: "M1", // real Form 4 filings lag and the resulting thesis plays out over weeks
  "etf-flow": "W1",
  institutional: "M3", // real 13F-HR filings are quarterly
  macro: "M1", // macro conditions move slowly
  "analyst-consensus": "M1",
};

function inferTimeHorizon(engineId) {
  if (engineId === "options") return "D1";
  if (engineId === "sentiment") return "W1";
  return AGENT_TIME_HORIZONS[engineId] || "D1";
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
