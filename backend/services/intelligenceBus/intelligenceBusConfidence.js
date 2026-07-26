// Phase AI-ENGINE-003 — Platform Intelligence Bus. Confidence
// normalization and cross-event evidence aggregation
// (INTELLIGENCE_BUS_ARCHITECTURE.md §5). Every engine already scores its
// own confidence on the same [0,100] scale (scoringVocabulary.js's
// existing convention, followed by both the Options Agent's
// anomalyScore and the Sentiment Engine's confidence) — normalization
// here is therefore honestly a clamp + null-preservation pass, not a
// unit-conversion (documented, not hidden, since a future engine that
// scores on a different native scale would need a real per-engine
// converter added here, not assumed away).
const { clamp } = require("../../utils/portfolioRiskMetrics");

/**
 * Normalizes one engine's raw confidence into the Bus's canonical
 * [0,100] scale. `null`/`undefined` (the engine reported no confidence,
 * e.g. an unavailable dimension) stays honestly `null` — never
 * defaulted to a fabricated mid-range value.
 */
function normalizeConfidence(rawConfidence) {
  if (rawConfidence === null || rawConfidence === undefined) return null;
  const value = Number(rawConfidence);
  if (!Number.isFinite(value)) return null;
  return clamp(Math.round(value * 100) / 100, 0, 100);
}

/**
 * Aggregates confidence/agreement across multiple Bus events that speak
 * to the same real-world question (e.g. several engines' events for the
 * same symbol) — reuses scoringVocabulary.js's existing
 * evidenceAgreement concept (fraction of directional evidence that
 * agrees) rather than inventing a second one. `events` must each expose
 * a real `confidence` (already-normalized) and, optionally, a real
 * `direction` derived by the calling engine's own payload (e.g.
 * "bullish"/"bearish"/"neutral") — this function never guesses a
 * direction that wasn't supplied.
 */
function aggregateEvidence(events = []) {
  const withConfidence = events.filter((event) => Number.isFinite(event.confidence));
  if (!withConfidence.length) {
    return { aggregateConfidence: null, evidenceAgreement: null, contributingEventCount: 0 };
  }

  const aggregateConfidence = clamp(Math.round((withConfidence.reduce((sum, event) => sum + event.confidence, 0) / withConfidence.length) * 100) / 100, 0, 100);

  const directional = withConfidence.filter((event) => event.direction === "bullish" || event.direction === "bearish");
  let evidenceAgreement = null;
  if (directional.length) {
    const bullish = directional.filter((event) => event.direction === "bullish").length;
    const bearish = directional.length - bullish;
    const majority = Math.max(bullish, bearish);
    evidenceAgreement = clamp(Math.round((majority / directional.length) * 10000) / 100, 0, 100);
  }

  return { aggregateConfidence, evidenceAgreement, contributingEventCount: withConfidence.length };
}

module.exports = { normalizeConfidence, aggregateEvidence };
