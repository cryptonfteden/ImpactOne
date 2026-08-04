const { validateProviderShape } = require("./baseProviderContract");

/**
 * Builds a provider object satisfying baseProviderContract from a plain
 * config + a fetchImpl function. Every one of the 14 named providers is
 * built through this factory, so the interface is enforced structurally —
 * a provider definition file can't "forget" a required field the way it
 * could if each wrote its own object literal.
 */
function createProvider(config, fetchImpl) {
  const provider = {
    providerId: config.providerId,
    label: config.label,
    sourceType: config.sourceType,
    category: config.category,
    defaultThemes: config.defaultThemes || [],
    rateLimit: config.rateLimit || { maxPerMinute: 30 },
    fetch: fetchImpl,
  };

  const { valid, missingFields } = validateProviderShape(provider);
  if (!valid) {
    throw new Error(`Provider "${config.providerId || "(unnamed)"}" is missing required field(s): ${missingFields.join(", ")}`);
  }

  return provider;
}

/**
 * Shared honest stub for providers with no live integration yet. Returns an
 * empty array rather than fabricating placeholder events presented as real
 * — consistent with this codebase's deterministic-fallback-first
 * philosophy (see Sprint 20's precedent in themeIntelligenceService.js).
 */
async function honestStubFetch() {
  return [];
}

module.exports = { createProvider, honestStubFetch };
