// Phase AI-ENGINE-003 — Platform Intelligence Bus. The canonical service
// — the ONE entry point every engine publishes into and every consumer
// reads from (mission: "Consumers must NEVER talk directly to engines").
// Ties together: contract validation, dedup, identity/supersession,
// confidence normalization, lifecycle/expiry, governance, persistence,
// subscriber dispatch, and (best-effort) projection onto the existing
// CanonicalEvent substrate for legacy consumers.
const eventEnvelope = require("../eventEnvelope");
const canonicalEventRepository = require("../canonicalEventRepository");

const { validateRawEvent } = require("./intelligenceEventContract");
const { computeDedupKey, computeIdentityKey } = require("./intelligenceBusDedup");
const { normalizeConfidence, aggregateEvidence } = require("./intelligenceBusConfidence");
const { computeExpiry, computeFreshness, resolveLifecycleStatus } = require("./intelligenceBusLifecycle");
const { sanitizeEvent, assertNoGovernanceViolation } = require("./intelligenceBusGovernance");
const repository = require("./intelligenceBusRepository");
const subscriptions = require("./intelligenceBusSubscriptions");

const METHODOLOGY_VERSION = "intelligence-bus-v1";

/**
 * Projects an accepted Bus event onto the existing CanonicalEvent table
 * via the existing eventEnvelope contract — the same real 19-required-
 * field envelope every other provider's events already produce (options
 * agent architecture precedent). Best-effort: a projection failure never
 * fails the publish itself — the Bus event is still the durable source
 * of truth; CanonicalEvent is an interop bridge for legacy consumers
 * (findMatchedEvents/Daily Feed/Themes), not a second source of truth.
 */
async function projectToCanonicalEvent(event) {
  try {
    const envelope = eventEnvelope.buildEventEnvelope({
      eventType: `${event.engineId}:${event.eventType}`,
      sourceType: "intelligence-bus",
      sourceName: event.provenance?.sourceEngine || event.engineId,
      sourceUrl: event.provenance?.sourceUrl || null,
      publishedAt: event.publishedAt,
      symbols: event.symbols || [],
      summary: event.payload?.explanation || event.payload?.summary || `${event.engineId} published a ${event.eventType} event.`,
      confidence: Number.isFinite(event.confidence) ? event.confidence : null,
      provenance: event.provenance || null,
      deduplicationKey: event.deduplicationKey,
    });
    const { isNew } = await canonicalEventRepository.upsertIfNew(envelope, { providerId: `intelligence-bus:${event.engineId}` });
    if (isNew) {
      const canonicalRow = await canonicalEventRepository.findByDeduplicationKey(event.deduplicationKey);
      if (canonicalRow) {
        await repository.setCanonicalEventId(event.id, canonicalRow.id);
      }
    }
  } catch {
    // Best-effort projection — see function header. The Bus event itself
    // already persisted successfully; this never unwinds that.
  }
}

/**
 * The one publish path every engine must use. Returns the persisted,
 * sanitized, lifecycle-resolved event. Never throws for a duplicate —
 * returns the existing event with `duplicate: true` so a retried/
 * overlapping publish from an engine's own polling cadence is a normal,
 * observable outcome, not an error.
 */
async function publishEvent(rawEvent, { now = new Date() } = {}) {
  const { valid, errors } = validateRawEvent(rawEvent);
  if (!valid) {
    const error = new Error(`Invalid intelligence event: ${errors.join("; ")}`);
    error.statusCode = 400;
    error.validationErrors = errors;
    throw error;
  }

  assertNoGovernanceViolation(rawEvent);
  assertNoGovernanceViolation(rawEvent.payload || {});

  const dedupKey = rawEvent.deduplicationKey || computeDedupKey(rawEvent);
  const identityKey = computeIdentityKey(rawEvent);
  const normalizedConfidence = normalizeConfidence(rawEvent.confidence);
  const expiresAt = computeExpiry({ engineId: rawEvent.engineId, publishedAt: rawEvent.publishedAt, explicitExpiresAt: rawEvent.expiresAt });

  const { event: persisted, created } = await repository.createEvent({
    engineId: rawEvent.engineId,
    eventType: rawEvent.eventType,
    symbols: (rawEvent.symbols || []).map((symbol) => String(symbol).toUpperCase()),
    confidence: normalizedConfidence,
    rawConfidence: Number.isFinite(Number(rawEvent.confidence)) ? Number(rawEvent.confidence) : null,
    provenance: rawEvent.provenance,
    evidenceRefs: rawEvent.evidenceRefs || [],
    payload: rawEvent.payload,
    identityKey,
    deduplicationKey: dedupKey,
    publishedAt: rawEvent.publishedAt instanceof Date ? rawEvent.publishedAt : new Date(rawEvent.publishedAt),
    expiresAt,
    methodologyVersion: rawEvent.methodologyVersion || METHODOLOGY_VERSION,
  });

  if (!created) {
    return { ...sanitizeEvent(persisted), duplicate: true };
  }

  // Supersession: any other ACTIVE event in the same series is now
  // superseded by this newer one (architecture §7). Never touches an
  // event outside this exact identityKey series.
  const priorActive = await repository.findActiveByIdentityKey(identityKey);
  for (const prior of priorActive) {
    if (prior.id !== persisted.id && new Date(prior.publishedAt).getTime() < new Date(persisted.publishedAt).getTime()) {
      // eslint-disable-next-line no-await-in-loop
      await repository.markSuperseded(prior.id, persisted.id);
    }
  }

  await projectToCanonicalEvent(persisted);

  const sanitized = sanitizeEvent(persisted);
  await subscriptions.dispatchToSubscribers(sanitized);

  return { ...sanitized, duplicate: false };
}

function attachLifecycle(event, now) {
  const lifecycleStatus = resolveLifecycleStatus({ persistedStatus: event.lifecycleStatus, expiresAt: event.expiresAt, now });
  const freshness = computeFreshness({ publishedAt: event.publishedAt, now });
  return sanitizeEvent({ ...event, lifecycleStatus, dataFreshness: freshness });
}

/**
 * Consumers' one read path. Lifecycle status is honestly recomputed at
 * read time (never a stale cached status) and every event is re-
 * sanitized before it leaves the Bus, regardless of what was persisted.
 */
async function getEvents(query = {}, { now = new Date() } = {}) {
  const rows = await repository.listEvents(query);
  return rows.map((row) => attachLifecycle(row, now));
}

async function getEventById(id, { now = new Date() } = {}) {
  const row = await repository.getEventById(id);
  if (!row) return null;
  return attachLifecycle(row, now);
}

function subscribe(consumerName, filter, handler) {
  return subscriptions.subscribe(consumerName, filter, handler);
}

module.exports = {
  METHODOLOGY_VERSION,
  publishEvent,
  getEvents,
  getEventById,
  subscribe,
  aggregateEvidence,
  listSubscriptions: subscriptions.listSubscriptions,
};
