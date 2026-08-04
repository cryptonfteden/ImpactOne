const providerRegistry = require("./providers/providerRegistry");
const { createLimiter } = require("./providers/rateLimiter");
const { withRetry } = require("./providers/retryPolicy");
const eventEnvelope = require("./eventEnvelope");
const scoringVocabulary = require("./scoringVocabulary");
const canonicalEventRepository = require("./canonicalEventRepository");
const providerRunLogRepository = require("./providerRunLogRepository");

// One rate limiter per provider, reused across runs within the process
// lifetime (a scheduler tick and a manual ops-route trigger share the same
// budget, as they should).
const limiters = new Map();
function getLimiterFor(provider) {
  if (!limiters.has(provider.providerId)) {
    limiters.set(provider.providerId, createLimiter(provider.rateLimit));
  }
  return limiters.get(provider.providerId);
}

/**
 * A raw item may already be envelope-shaped (has a deduplicationKey) or may
 * be a legacy feed-item-like shape (headline/whyItMatters/sourceName/...).
 * Either way this reuses the exact same normalizers
 * adaptLegacyFeedItemToEnvelope already uses, rather than reinventing
 * credibility/freshness scoring per provider.
 */
function mapRawItemToEnvelope(rawItem, provider) {
  return eventEnvelope.buildEventEnvelope({
    eventType: rawItem.eventType || provider.category,
    sourceType: rawItem.sourceType || provider.sourceType,
    sourceName: rawItem.sourceName || provider.label,
    sourceUrl: rawItem.sourceUrl || null,
    publishedAt: rawItem.publishedAt || null,
    entities: rawItem.entities || [],
    symbols: rawItem.symbols || [],
    sectors: rawItem.sectors || [],
    countries: rawItem.countries || [],
    companies: rawItem.companies || [],
    themes: rawItem.themes || (provider.defaultThemes.length ? provider.defaultThemes : undefined),
    language: rawItem.language,
    region: rawItem.region,
    category: rawItem.category || provider.category,
    summary: rawItem.summary || rawItem.whyItMatters || rawItem.headline || "",
    rawReference: rawItem.headline || rawItem.rawReference || null,
    credibilityScore: Number.isFinite(rawItem.credibilityScore)
      ? rawItem.credibilityScore
      : scoringVocabulary.normalizeSourceCredibility(rawItem.sourceName || provider.label),
    freshnessScore: Number.isFinite(rawItem.freshnessScore)
      ? rawItem.freshnessScore
      : scoringVocabulary.normalizeEvidenceFreshness(rawItem.publishedAt),
    relevanceScore: Number.isFinite(rawItem.relevanceScore) ? rawItem.relevanceScore : rawItem.importanceScore ?? null,
    confidence: Number.isFinite(rawItem.confidence) ? rawItem.confidence : null,
    provenance: rawItem.provenance || { sourceName: rawItem.sourceName || provider.label, sourceUrl: rawItem.sourceUrl || null },
    deduplicationKey: rawItem.deduplicationKey,
  });
}

/**
 * Runs one provider's ingestion cycle end to end: rate-limit check, retried
 * fetch, envelope mapping, DB-level dedup on persist, and a run-log row —
 * and never throws past this function. A failed or rate-limited run is a
 * recorded outcome, not an unhandled rejection, mirroring
 * dailyBriefArchiveService's "never breaks the caller" discipline.
 *
 * Ingestion only — this function never calls autonomousRecommendationEngine,
 * canonicalVerdict, or any recommendation/theme write path.
 */
async function runProviderIngestion(providerId) {
  const startedAt = new Date();
  const provider = providerRegistry.getProvider(providerId);

  if (!provider) {
    return finalizeRun({ providerId, startedAt, status: "FAILED", errorMessage: `Unknown provider: ${providerId}` });
  }

  const limiter = getLimiterFor(provider);
  if (!limiter.tryAcquire()) {
    return finalizeRun({ providerId, startedAt, status: "FAILED", errorMessage: "Rate limit exceeded for this provider" });
  }

  let rawItems;
  try {
    rawItems = await withRetry(() => provider.fetch());
  } catch (error) {
    return finalizeRun({ providerId, startedAt, status: "FAILED", errorMessage: error.message });
  }

  let itemsPersisted = 0;
  let itemsDeduped = 0;
  try {
    for (const rawItem of rawItems) {
      const envelope = mapRawItemToEnvelope(rawItem, provider);
      const { isNew } = await canonicalEventRepository.upsertIfNew(envelope, { providerId });
      if (isNew) itemsPersisted += 1;
      else itemsDeduped += 1;
    }
  } catch (error) {
    return finalizeRun({
      providerId,
      startedAt,
      status: "PARTIAL",
      itemsFetched: rawItems.length,
      itemsPersisted,
      itemsDeduped,
      errorMessage: error.message,
    });
  }

  return finalizeRun({
    providerId,
    startedAt,
    status: "SUCCESS",
    itemsFetched: rawItems.length,
    itemsPersisted,
    itemsDeduped,
  });
}

async function finalizeRun({ providerId, startedAt, status, itemsFetched = 0, itemsPersisted = 0, itemsDeduped = 0, errorMessage = null }) {
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const runLog = await providerRunLogRepository.createRunLog({
    providerId,
    startedAt,
    finishedAt,
    status,
    itemsFetched,
    itemsPersisted,
    itemsDeduped,
    errorMessage,
    durationMs,
  });
  return { providerId, status, itemsFetched, itemsPersisted, itemsDeduped, errorMessage, durationMs, runLog };
}

module.exports = { runProviderIngestion, mapRawItemToEnvelope, getLimiterFor };
