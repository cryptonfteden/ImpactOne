// Phase PROVIDER-ABSTRACTION-002 — "Build a unified Provider
// Abstraction layer." This module is deliberately NOT a redesign of
// `providerFactory.js`/`providerRegistry.js`/`baseProviderContract.js`
// — every one of those is reused completely unmodified. This is an
// additive, opt-in alternative to `createProvider()` that gives a
// provider definition access to every one of this mission's named
// shared hooks (retry, timeout, cache, health, diagnostics, metrics)
// through one uniform call, while producing an object that still
// satisfies `validateProviderShape()` exactly as before — the required
// six fields (`providerId`, `label`, `sourceType`, `category`,
// `defaultThemes`, `rateLimit`, `fetch`) are untouched; every hook
// method this layer attaches is an *additional* property
// `validateProviderShape()` has never inspected and still doesn't.
//
// "Existing providers must migrate incrementally": nothing forces any
// of the 22 registered providers to adopt this. `createProvider()`
// keeps working exactly as it always has for the 20 providers still on
// `honestStubFetch`. Only the two providers with genuinely real fetch
// logic (`reutersBloombergWireProvider`, `cftcCotProvider`) are
// migrated in this same phase, as the natural, highest-value starting
// point — see PROVIDER_ABSTRACTION_2.md for the full migration
// rationale.
//
// Shared retry policy: DELIBERATELY not re-applied here.
// `providerIngestionService.js` already wraps every provider's
// `fetch()` in `providers/retryPolicy.withRetry` — wrapping it AGAIN at
// this layer would silently multiply real retry attempts (e.g. 3×3=9
// real attempts on a persistent failure instead of 3), a genuine,
// undisclosed change to business logic. This module re-exports the
// exact same `withRetry` policy instead, so a provider's own internal
// sub-calls (not the outer `fetch()` ingestion already retries) can
// reuse the identical, already-tested policy if a future provider
// needs it — never a second, competing implementation.
const { createProvider } = require("./providerFactory");
const { withRetry } = require("./retryPolicy");
const { withTimeout } = require("../agentScheduler/agentScheduler");
const { sharedProviderCache } = require("../redisCache/providerCache");
const { getTtlMsForProvider } = require("../redisCache/providerCacheConfig");

// Phase PROVIDER-ABSTRACTION-002 — deliberately lazy (required inside
// the accessor functions below, not at module load time).
// `providerHealthService`/`providerMetricsService`/
// `providerDiagnosticsService` all transitively require
// `providerRegistry.js`, which itself requires every provider
// definition — including the two migrated in this same phase, which
// require *this* module. Requiring those three services eagerly here
// would create a real require-cycle (`providerAbstraction.js` →
// `providerDiagnosticsService.js` → `providerRegistry.js` →
// `cftcCotProvider.js` → `providerAbstraction.js`) that breaks
// `providerRegistry.js`'s own module-load-time validation. Deferring
// the require to call time (well after the registry has finished
// loading) avoids the cycle entirely without changing any of those
// modules.

const DEFAULT_TIMEOUT_MS = 10000;

function providerCacheKey(providerId) {
  return `provider:${providerId}`;
}

/**
 * The unified provider interface's own `fetch()` construction: cache
 * (opt-in per provider, `cacheTtlMs` defaults to 0/off — "no change to
 * business logic" for every provider that doesn't explicitly ask for
 * caching) wrapping a shared-timeout-guarded call to the provider's own
 * real `coreFetchImpl`. Retry is intentionally NOT applied here (see
 * this module's own header) — `providerIngestionService` still retries
 * the whole thing exactly as it always has.
 */
function buildUnifiedFetch(providerId, coreFetchImpl, { timeoutMs = DEFAULT_TIMEOUT_MS, cacheTtlMs = 0 } = {}) {
  const guardedFetch = () => withTimeout(Promise.resolve().then(() => coreFetchImpl()), timeoutMs);

  if (!(cacheTtlMs > 0)) {
    return guardedFetch;
  }

  return () => sharedProviderCache.getOrCompute(providerCacheKey(providerId), guardedFetch, { ttlMs: cacheTtlMs });
}

/**
 * The additive, opt-in alternative to `createProvider()`. Builds the
 * exact same real, validated provider object `createProvider()` always
 * has, plus four uniform, no-argument accessor methods delegating to
 * the existing, unmodified Health/Metrics/Diagnostics/Cache services —
 * "shared health reporting," "shared diagnostics hook," and "shared
 * metrics hook" are satisfied by giving every migrated provider one
 * consistent way to ask about itself, never by rewriting what those
 * services already compute.
 *
 * @param {{providerId, label, sourceType, category, defaultThemes, rateLimit}} config
 * @param {() => Promise<Array>} coreFetchImpl - the provider's own real fetch logic, completely unchanged
 * @param {{ timeoutMs?: number, cacheTtlMs?: number }} [options]
 */
function createUnifiedProvider(config, coreFetchImpl, { timeoutMs = DEFAULT_TIMEOUT_MS, cacheTtlMs } = {}) {
  const resolvedCacheTtlMs = cacheTtlMs ?? getTtlMsForProvider(config.providerId);
  const unifiedFetch = buildUnifiedFetch(config.providerId, coreFetchImpl, { timeoutMs, cacheTtlMs: resolvedCacheTtlMs });

  const provider = createProvider(config, unifiedFetch);

  provider.getHealth = () => require("../providerHealthService").getHealthForProvider(config.providerId);
  provider.getMetrics = () => require("../providerMetricsService").getMetricsForProvider(config.providerId);
  provider.getDiagnostics = () => require("../providerDiagnosticsService").getDiagnosticsForProvider(config.providerId);
  // Global, not per-provider — providerCache.js tracks hit/miss/bypassed
  // counts for the whole shared cache, not broken out per cache key.
  // Disclosed here rather than presented as provider-specific.
  provider.getCacheStats = () => sharedProviderCache.getStats();

  return provider;
}

module.exports = { createUnifiedProvider, withRetry, withTimeout, DEFAULT_TIMEOUT_MS };
