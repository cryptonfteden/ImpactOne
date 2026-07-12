// Sprint 18A — Canonical Decision Architecture.
//
// The canonical Event Envelope named in INTELLIGENCE_PLATFORM_REVIEW.md
// §10 item 3 ("versioned and frozen early, since 3-4 of the five engines
// will depend on it") and designed in full in
// RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md §4. The Research Intelligence
// Engine's own ingestion pipeline isn't built yet — this module defines the
// real schema now and proves it against the one real event source that
// exists today, autonomousMarketService.js's feed, via
// adaptLegacyFeedItemToEnvelope.
//
// This is additive: DecisionTrace.evidenceReferences stores envelope-shaped
// evidence alongside, not instead of, the existing
// inputEvidence.matchedEvents shape other code and tests already depend on
// (review §6 names that shape as a contract to preserve).
const crypto = require("crypto");
const autonomousMarketService = require("./autonomousMarketService");
const scoringVocabulary = require("./scoringVocabulary");

const EVENT_ENVELOPE_VERSION = "1.0.0";

const REQUIRED_FIELDS = [
  "eventId",
  "eventType",
  "sourceType",
  "sourceName",
  "sourceUrl",
  "publishedAt",
  "ingestedAt",
  "entities",
  "symbols",
  "sectors",
  "countries",
  "summary",
  "rawReference",
  "credibilityScore",
  "freshnessScore",
  "relevanceScore",
  "confidence",
  "provenance",
  "deduplicationKey",
];

/**
 * Deterministic — the same (sourceType, sourceUrl or headline, publishedAt)
 * always produces the same key, so re-adapting the same underlying evidence
 * twice never creates two "different" envelopes for it.
 */
function buildDeduplicationKey({ sourceType, sourceUrl, headline, publishedAt } = {}) {
  const basis = [sourceType || "", sourceUrl || headline || "", publishedAt || ""]
    .join("|")
    .toLowerCase()
    .trim();
  return crypto.createHash("sha256").update(basis).digest("hex");
}

function buildEventEnvelope(raw = {}) {
  return {
    eventId: raw.eventId || buildDeduplicationKey(raw),
    eventType: raw.eventType || "unclassified",
    sourceType: raw.sourceType || "news",
    sourceName: raw.sourceName || null,
    sourceUrl: raw.sourceUrl || null,
    publishedAt: raw.publishedAt || null,
    ingestedAt: raw.ingestedAt || new Date().toISOString(),
    entities: raw.entities || [],
    symbols: raw.symbols || [],
    sectors: raw.sectors || [],
    countries: raw.countries || [],
    summary: raw.summary || "",
    rawReference: raw.rawReference || null,
    credibilityScore: Number.isFinite(raw.credibilityScore) ? raw.credibilityScore : null,
    freshnessScore: Number.isFinite(raw.freshnessScore) ? raw.freshnessScore : null,
    relevanceScore: Number.isFinite(raw.relevanceScore) ? raw.relevanceScore : null,
    confidence: Number.isFinite(raw.confidence) ? raw.confidence : null,
    provenance: raw.provenance || (raw.sourceName || raw.sourceUrl ? { sourceName: raw.sourceName || null, sourceUrl: raw.sourceUrl || null } : null),
    deduplicationKey: raw.deduplicationKey || buildDeduplicationKey(raw),
  };
}

function validateEventEnvelope(event = {}) {
  const missingFields = REQUIRED_FIELDS.filter((field) => !(field in event));
  return { valid: missingFields.length === 0, missingFields };
}

/**
 * Converts today's real matched-event shape (from
 * autonomousRecommendationEngine.findMatchedEvents, itself sourced from
 * autonomousMarketService's feed) into the canonical envelope. Reuses the
 * exact same classification/scoring functions the rest of the pipeline
 * already uses (classifyEventType, sourceCredibility, evidenceFreshness) —
 * this is a projection of already-computed data, not new analysis.
 */
function adaptLegacyFeedItemToEnvelope(feedItem = {}, { symbol } = {}) {
  return buildEventEnvelope({
    eventType: autonomousMarketService.classifyEventType(feedItem.headline || ""),
    sourceType: "news",
    sourceName: feedItem.sourceName || null,
    sourceUrl: feedItem.sourceUrl || null,
    publishedAt: feedItem.publishedAt || null,
    entities: [],
    symbols: symbol ? [symbol] : [],
    sectors: [],
    countries: [],
    summary: feedItem.whyItMatters || feedItem.headline || "",
    rawReference: feedItem.headline || null,
    credibilityScore: scoringVocabulary.normalizeSourceCredibility(feedItem.sourceName),
    freshnessScore: scoringVocabulary.normalizeEvidenceFreshness(feedItem.publishedAt),
    relevanceScore: Number.isFinite(feedItem.importanceScore) ? feedItem.importanceScore : null,
    confidence: Number.isFinite(feedItem.confidence) ? feedItem.confidence : null,
    provenance: { sourceName: feedItem.sourceName || null, sourceUrl: feedItem.sourceUrl || null },
    headline: feedItem.headline,
  });
}

module.exports = {
  EVENT_ENVELOPE_VERSION,
  REQUIRED_FIELDS,
  buildEventEnvelope,
  validateEventEnvelope,
  buildDeduplicationKey,
  adaptLegacyFeedItemToEnvelope,
};
