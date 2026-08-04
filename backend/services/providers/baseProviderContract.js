/**
 * Sprint 21A — Global Intelligence Platform.
 *
 * The interface every provider must implement, whatever the underlying
 * source (wire news, a regulator's RSS feed, a social platform's API, a
 * prediction market). Nothing in this module talks to a network or a
 * database — it only defines and enforces the shape, so the registry and
 * tests can catch a malformed provider before it's ever scheduled.
 *
 * Required shape:
 *   providerId    string, unique, stable (used as the FK-ish key in
 *                 CanonicalEvent.providerId and ProviderRunLog.providerId)
 *   label         string, human-readable
 *   sourceType    string (e.g. "news", "regulatory-filing", "social",
 *                 "prediction-market", "central-bank", "government")
 *   category      string, one of autonomousMarketService's CORE_EVENT_TYPES
 *                 keys where applicable, else a free-text category
 *   defaultThemes string[] — themes this provider's events default to when
 *                 an individual item doesn't derive its own
 *   rateLimit     { maxPerMinute: number }
 *   fetch()       async () => RawEvent[] — RawEvent is whatever shape the
 *                 provider's own source returns; providerIngestionService
 *                 maps it through eventEnvelope.buildEventEnvelope, so
 *                 fetch() itself never has to build an envelope.
 */
const REQUIRED_STRING_FIELDS = ["providerId", "label", "sourceType", "category"];

function validateProviderShape(provider) {
  const missingFields = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof provider?.[field] !== "string" || !provider[field].trim()) {
      missingFields.push(field);
    }
  }
  if (!Array.isArray(provider?.defaultThemes)) missingFields.push("defaultThemes");
  if (!provider?.rateLimit || !Number.isFinite(provider.rateLimit.maxPerMinute)) missingFields.push("rateLimit.maxPerMinute");
  if (typeof provider?.fetch !== "function") missingFields.push("fetch");

  return { valid: missingFields.length === 0, missingFields };
}

module.exports = { validateProviderShape };
