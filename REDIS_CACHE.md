# REDIS_CACHE.md — Phase REDIS-CACHE-001

**Mission:** implement the Redis caching layer identified as a V2 scalability milestone. Reuse existing provider abstractions, cache only deterministic read-only provider responses, implement TTL per provider, cache invalidation, hit/miss metrics, graceful fallback when Redis is unavailable. No change to business logic or agent scoring. Integrate with the Provider layer, Observability, and Scheduler metrics. Do not redesign providers. Maintain backward compatibility. Comprehensive tests.

---

## Design decisions

**1. `redis` (the official npm client, v6) was added as a new dependency — the one genuinely new piece of infrastructure this phase requires.** A dedicated research pass confirmed neither `redis` nor `ioredis` existed anywhere in this repo, and no `REDIS_URL` was configured in any environment. Implementing "the Redis caching layer" necessarily requires a real Redis client; every other new capability in this phase reuses existing patterns instead of adding more dependencies.

**2. The cache module's API shape mirrors `agentScheduler/healthCache.js`'s existing, proven design — not a new invention.** `healthCache.js` already has exactly the right shape (`getOrCompute`/`invalidate`/`clear`/`getStats`/`resetStats`, TTL-gated, hit/miss counters) for a "cache with graceful degradation." This phase's `providerCache.js` generalizes that same shape from a `WeakMap` keyed by live object reference (appropriate for in-process agent health) to a real, string-keyed Redis store (appropriate for a cross-process-shareable provider response) — the same proven contract, a different backing store.

**3. Redis unavailability is treated as a first-class, expected state, not an edge case — because it is this environment's real, current state.** `redisClient.js` never throws: a missing `REDIS_URL`, a connection refusal, a timeout, or a mid-session disconnect all converge on the exact same observable behavior — `isAvailable()` returns `false`, and `providerCache.getOrCompute()` transparently calls through to the real, uncached computation. `reconnectStrategy: false` is a deliberate choice (confirmed necessary during development: the default reconnect behavior caused a real hang against an unreachable address in a test) — this cache re-attempts a connection on its own terms (the next real call), never leaves a background retry loop running.

**4. Only one real provider was wired into the cache this phase: `priceHistoryProvider.getDailyBars(symbol, {range})`.** Research confirmed this is the strongest real candidate — a deterministic, read-only response (a given symbol+range's daily OHLC bars don't change once a trading day settles), reused across many domain agents (macro, technical, fibonacci, etc.), and previously completely uncached (every call hit Yahoo Finance fresh). The 22 providers in `providerRegistry.js` were confirmed, via direct source read, to all currently use `honestStubFetch` (returning `[]`) — caching an empty array provides no real value, and wiring caching into a provider with no real fetch logic yet would be premature. `providerCache`/`providerCacheConfig` are built as fully generic, reusable infrastructure — any provider's real `fetch()` (once implemented) can adopt the exact same `getOrCompute(cacheKey, computeFn, {ttlMs})` call with zero further changes to this phase's own code.

**5. `getDailyBars`'s signature, return shape, and error handling are completely unchanged — "no change to business logic" enforced by construction.** The entire pre-existing function body was moved verbatim into a private `fetchDailyBarsFresh()` helper; `getDailyBars` itself now only computes a cache key and TTL and delegates to `sharedProviderCache.getOrCompute()`. Every existing caller receives the exact same real array, in the exact same shape, whether served from a real cache hit or a real, uncached network call — confirmed by a dedicated test asserting the returned bar object's own key set is unchanged.

**6. Observability integration is a real, honest, aggregate surface — not per-agent tagging.** Research confirmed `observableOrchestrator.js`'s `extractCacheHit()` reads `raw.cacheHit`/`raw.fromCache` off an *agent's* own raw result — but no domain agent today forwards provider-level cache information into its own `raw` object, and retrofitting all 14 agents to do so would be exactly the kind of "change to business logic" this mission forbids. Instead, this phase adds one new, real, queryable surface: `GET /v2/providers/cache-metrics`, returning the shared cache's own real `hits`/`misses`/`bypassed` counters plus a live `redisAvailable` check — the same `getStats()`-style shape `healthCache.js`/`schedulerMetrics.js` already establish for observability consumers, reusable by any future dashboard or alert.

## What was built

New directory: `backend/services/redisCache/`.

| File | Responsibility |
|---|---|
| `redisClient.js` | The one real Redis connection. Lazy (connects only once `REDIS_URL` is configured and a caller actually asks), never throws, disables automatic reconnection loops, logs one real warning (not per-call) when unavailable. `getClient()` / `isAvailable()` / `_resetForTests()`. |
| `providerCache.js` | **The generic, reusable cache.** `createProviderCache()` → `{ getOrCompute, invalidate, invalidatePrefix, getStats, resetStats }`, mirroring `healthCache.js`'s exact API shape. A shared, process-wide `sharedProviderCache` singleton is exported for real callers. |
| `providerCacheConfig.js` | **TTL per provider/namespace.** A disclosed map (`TTL_MS_BY_NAMESPACE`), env-overridable per the same `envNumber()` pattern `agentScheduler/schedulerConfig.js` already established, falling back to a global `REDIS_CACHE_DEFAULT_TTL_MS` for any namespace not explicitly named. |

## Modified files (both additive/backward-compatible)

- `backend/services/intelligence/priceHistoryProvider.js` — wrapped in `sharedProviderCache.getOrCompute`; signature, return shape, and error handling unchanged.
- `backend/controllers/providerController.js` / `backend/routes/providerRoutes.js` — one new read-only route, `GET /v2/providers/cache-metrics`.
- `backend/config/env.js` / `backend/.env.example` — new `REDIS_URL` (honestly empty by default) and `REDIS_CACHE_DEFAULT_TTL_MS` (5 minutes default).
- `package.json` — new dependency: `redis@^6.1.0`.

## The full behavior, verified live during development

**Redis unavailable (this environment's real, current state):**
```
[redisClient] Redis is unavailable (REDIS_URL not configured) — the provider cache will gracefully fall back to always-miss (real, uncached provider calls). No business logic is affected.
```
`getDailyBars("AAPL", { range: "5d" })` still returned 5 real bars, identical to pre-phase behavior; `GET /v2/providers/cache-metrics` returned `{ hits: 0, misses: 0, bypassed: 1, redisAvailable: false }`.

**With a real, injected fake client (simulating a reachable Redis) during testing:** a first `getDailyBars` call performed one real network request and stored the result; a second, identical call returned the exact same real bars with **zero** additional network calls — confirmed via a dedicated test counting real `axios.get` invocations.

## Compatibility with the existing Provider layer / Observability / Scheduler — verified, not assumed

- **Provider layer**: `providerRegistry.js`, `providerFactory.js`, `baseProviderContract.js`, and all 22 registered provider definitions are completely untouched — this phase does not redesign the provider interface (`fetch()`) in any way.
- **Observability**: the new `GET /v2/providers/cache-metrics` route reuses this platform's own established `getStats()`-style shape; `observableOrchestrator.js` itself required zero changes.
- **Scheduler metrics**: `providerCache.getStats()`'s shape (`hits`/`misses`/counters, a `resetStats()` companion) deliberately mirrors `schedulerMetrics.js`'s/`healthCache.js`'s own existing convention, so this is a genuinely consistent addition to this platform's metrics vocabulary, not a competing one.
- **Agent scoring**: no domain agent, adapter, confidence formula, or aggregation engine was touched. `priceHistoryProvider.getDailyBars` is a leaf-level data fetch several layers below any scoring logic; every agent that calls it (macro, technical, fibonacci, etc.) receives the exact same real data it always did.

## Tests

**35 new tests, all passing:** `providerCache.test.js` (10), `redisClient.test.js` (4, including a real-unreachable-address test confirming no hang and no thrown error), `providerCacheConfig.test.js` (3), `priceHistoryProvider.test.js` (5, including a real cache-hit-avoids-second-network-call test and a real bar-shape-unchanged test), plus 1 new test appended to the existing `routes/provider.integration.test.js` for the new route, and the pre-existing 12 tests in that same file re-confirmed passing unchanged.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2385 tests, 2383 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Only one real provider (`priceHistoryProvider`) is actually wired into the cache this phase.** The other 22 registered providers all currently return `honestStubFetch`'s empty array — caching a stub with no real logic yet provides no real value. `providerCache`/`providerCacheConfig` are built generically so any future real provider `fetch()` implementation can adopt the same pattern immediately, with zero changes to this phase's own code.
2. **Per-agent Observability tagging (`raw.cacheHit` on an individual agent's own report) was deliberately not implemented** — doing so would require touching all 14 domain agents' composer files, exactly the kind of "change to business logic" this mission forbids. The aggregate `GET /v2/providers/cache-metrics` endpoint is the real, disclosed integration point instead.
3. **The cache is a single shared Redis keyspace, not namespaced per deployment/environment** beyond the cache-key's own provider-scoped prefix (e.g. `priceHistory:AAPL:1y`) — a real, disclosed simplification appropriate at this platform's current single-environment scale; a future multi-tenant or multi-environment deployment sharing one Redis instance would want an additional environment-scoped key prefix.
4. **Cache invalidation is exposed (`invalidate`/`invalidatePrefix`) but nothing in this codebase calls it automatically yet** — there is no real-time price-update event that would trigger a proactive invalidation; the real, disclosed TTL (15 minutes for price history) is the only expiry mechanism today. A future phase wiring a real market-data push event to `invalidatePrefix("priceHistory:")` is a natural, separate next step.
5. **This environment has no real, reachable Redis instance to test against** — every test uses either a fully in-memory fake client (injected via the same dependency-injection convention `healthCache.test.js` already established) or the real, honest "unavailable" path. The real Redis client library (`redis@^6.1.0`) itself is exercised by `redisClient.test.js`'s connection-attempt tests, but the full real-Redis-reachable path has not been verified against a live server in this environment — disclosed here rather than assumed.

## Files changed

- New: `backend/services/redisCache/{redisClient,providerCache,providerCacheConfig}.js` + matching `.test.js` files.
- New: `backend/services/intelligence/priceHistoryProvider.test.js`.
- Modified: `backend/services/intelligence/priceHistoryProvider.js` (wrapped in the new cache, signature/behavior unchanged).
- Modified: `backend/controllers/providerController.js`, `backend/routes/providerRoutes.js` (one new route).
- Modified: `backend/routes/provider.integration.test.js` (1 new test).
- Modified: `backend/config/env.js`, `backend/.env.example` (new, optional `REDIS_URL`/`REDIS_CACHE_DEFAULT_TTL_MS`).
- Modified: `package.json` (new dependency: `redis`).
- Unmodified: every provider definition in `backend/services/providers/definitions/`, `providerRegistry.js`, `providerFactory.js`, `baseProviderContract.js`, every domain agent and its orchestrator adapter, `agentOrchestrator.js`, `agentScheduler.js`, `observableOrchestrator.js`, `unifiedStockIntelligenceEngine.js`.
