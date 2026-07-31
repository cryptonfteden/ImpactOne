# PROVIDER_ABSTRACTION_2.md — Phase PROVIDER-ABSTRACTION-002

**Mission:** build a unified Provider Abstraction layer — a shared retry policy, shared timeout policy, shared cache hook, shared health reporting, shared diagnostics hook, and shared metrics hook. Reuse every existing provider. Do not change business logic or agent outputs. Existing providers must migrate incrementally. Backward compatibility is mandatory. Integrate with the Provider Registry, Redis Cache, Provider Health, and Observability.

---

## What already existed — and what this phase actually adds

A dedicated research pass confirmed that most of the individual cross-cutting mechanics this mission names already exist, just scattered across separate call sites rather than exposed as one uniform interface:

| Requirement | Already existed? | Where |
|---|---|---|
| Unified provider interface | Partially | `baseProviderContract.js`/`providerFactory.js` already define one real, validated shape (`providerId`, `label`, `sourceType`, `category`, `defaultThemes`, `rateLimit`, `fetch`) |
| Shared retry policy | Yes | `providerIngestionService.js` already wraps every `provider.fetch()` in `providers/retryPolicy.withRetry` |
| Shared timeout policy | No | No provider-side timeout existed anywhere; `agentScheduler.js` had an equivalent, already-tested `withTimeout` but it was private and unrelated to providers |
| Shared cache hook | No | Built last phase (`REDIS-CACHE-001`) but not yet wired into the provider layer itself |
| Shared health reporting | Yes | `providerHealthService.getHealthForProvider(providerId)` |
| Shared diagnostics hook | Yes | `providerDiagnosticsService.getDiagnosticsForProvider(providerId)` |
| Shared metrics hook | Yes | `providerMetricsService.getMetricsForProvider(providerId)` |

The real gap this phase closes: every one of the "already exists" items required the *caller* to know which separate service function to call, passing `providerId` as an argument each time. There was no single, uniform interface where **the provider object itself** exposes "ask me about my own health/metrics/diagnostics/cache," and no shared timeout or cache mechanism was wired into any real provider's `fetch()` at all.

## Design decisions

**1. `createUnifiedProvider()` is a new, additive, opt-in alternative to `createProvider()` — never a replacement.** It internally calls the exact same, unmodified `createProvider()` (which itself still calls the exact same, unmodified `validateProviderShape()`) to build the base object, then attaches four extra methods (`getHealth`, `getMetrics`, `getDiagnostics`, `getCacheStats`). `validateProviderShape()` was confirmed, via direct source read, to only check for the presence of six required fields and never rejects extra ones — so this is provably backward compatible with the base contract, requiring zero changes to `providerFactory.js`/`baseProviderContract.js`/`providerRegistry.js`.

**2. Shared retry policy is reused, not duplicated — and deliberately NOT re-applied at this new layer.** `providerIngestionService.js` already wraps the whole `provider.fetch()` call in `withRetry` (`maxAttempts: 3`). If `createUnifiedProvider()` wrapped `fetch()` in `withRetry` *again*, a persistent real failure would trigger 3×3=9 real attempts instead of 3 — a genuine, undisclosed change to business logic. Instead, `providerAbstraction.js` re-exports the exact same `withRetry` reference (not a re-implementation) for any future provider whose own internal sub-calls might want it, while the one real retry loop around the outer `fetch()` call stays exactly where it already was, unchanged.

**3. Shared timeout policy reuses `agentScheduler.js`'s own, already-tested `withTimeout` — additively exported, not duplicated.** `agentScheduler.js`'s `withTimeout(promise, timeoutMs, signal)` was already the exact right shape for this (a `Promise.race` against a rejecting timer, real `AbortSignal` support, real timer cleanup) — it just wasn't exported. This phase adds `withTimeout` to that module's existing `module.exports` line (the only change to `agentScheduler.js` in this entire phase) and reuses it verbatim inside `providerAbstraction.js`, guarding every migrated provider's real fetch call with a disclosed default of 10 seconds.

**4. Shared cache hook reuses `sharedProviderCache.getOrCompute()` verbatim from `REDIS-CACHE-001` — and defaults to fully disabled (`cacheTtlMs: 0`) for every provider unless explicitly configured.** This default-off choice is deliberate and disclosed: a live news-wire feed or a COT report's entire purpose is to surface *new* real events for ingestion's own dedup step — caching it by default would delay real event discovery, a subtle but real change in behavior, not merely a performance optimization. `providerCacheConfig.js` gained one new, additive export, `getTtlMsForProvider(providerId)`, backed by a disclosed, currently-empty `PROVIDER_TTL_MS_BY_ID` map (returns `0` — caching off — for any provider not explicitly listed) — the same "disclosed constant, never a silent default" discipline `TTL_MS_BY_NAMESPACE` already established for `priceHistory`.

**5. Only the two providers with genuinely real fetch logic were migrated this phase — "incremental migration," not a blanket rewrite.** A research pass confirmed 20 of the 22 registered providers still return `honestStubFetch`'s empty array; wrapping a stub that always returns `[]` in retry/timeout/cache provides no real value and would just be churn. `reutersBloombergWireProvider.js` and `cftcCotProvider.js` — the two providers with real, network/service-backed fetch logic — were migrated from `createProvider` to `createUnifiedProvider`. Their own real fetch implementations (`fetchWireNews`, `fetchCotEvents`) are **completely unchanged** — only the factory call at the bottom of each file changed.

**6. A real circular-dependency hazard was found and fixed during development, not assumed away.** `providerHealthService.js`/`providerMetricsService.js`/`providerDiagnosticsService.js` all transitively `require("./providers/providerRegistry")`, which itself requires every provider definition file — including the two now requiring `providerAbstraction.js`. Requiring those three services eagerly at the top of `providerAbstraction.js` created a real load-time cycle (confirmed live: `TypeError: createUnifiedProvider is not a function` when booting the registry). The fix — deferring those three requires to inside each accessor method, evaluated only when actually called, well after the registry has finished loading — is disclosed in the module's own header rather than silently patched around.

## What was built

| File | Responsibility |
|---|---|
| `backend/services/providers/providerAbstraction.js` | **The unified provider interface.** `createUnifiedProvider(config, coreFetchImpl, {timeoutMs, cacheTtlMs})` — builds a real, validated provider object (via the unmodified `createProvider`) whose `fetch()` is guarded by the shared timeout policy and, only when explicitly opted in, the shared cache hook; attaches `getHealth()`/`getMetrics()`/`getDiagnostics()`/`getCacheStats()`. Also re-exports `withRetry` (from `retryPolicy.js`) and `withTimeout` (from `agentScheduler.js`) verbatim as this mission's own disclosed "shared retry policy"/"shared timeout policy." |

## Modified files (all additive/backward-compatible)

- `backend/services/agentScheduler/agentScheduler.js` — `withTimeout` added to the existing `module.exports` line; nothing else in this file changed.
- `backend/services/redisCache/providerCacheConfig.js` — new `PROVIDER_TTL_MS_BY_ID` map + `getTtlMsForProvider(providerId)` export, both additive; `TTL_MS_BY_NAMESPACE`/`getTtlMsForNamespace` untouched.
- `backend/services/providers/definitions/reutersBloombergWireProvider.js` — factory call changed from `createProvider` to `createUnifiedProvider`; `fetchWireNews` itself is byte-identical.
- `backend/services/providers/definitions/cftcCotProvider.js` — factory call changed from `createProvider` to `createUnifiedProvider`; `fetchCotEvents` itself is byte-identical.

## Compatibility — verified, not assumed

- **Every one of the 22 registered providers still boots and validates cleanly** — `providerRegistry.test.js`'s existing "every registered provider conforms to the base provider contract" test passes unchanged.
- **Both migrated providers' own pre-existing tests pass unchanged** — `reutersBloombergWireProvider.test.js` and `cftcCotProvider.test.js` (which monkeypatch the real underlying services and call `.fetch()` directly) both pass with zero modifications, confirming the real fetch output is identical to before.
- **`providerHealthService`/`providerMetricsService`/`providerDiagnosticsService`/`providerIngestionService`'s own full existing test suites pass unchanged** — none of their logic was touched; they still read/write the exact same `ProviderRunLog` rows through the exact same repository.
- **`routes/provider.integration.test.js`'s full existing suite (including last phase's `cache-metrics` test) passes unchanged.**
- **`agentScheduler`'s own full test suite passes unchanged** — the only change to that file was adding one name to an existing export list.

## Tests

**17 new tests, all passing:** `providerAbstraction.test.js` (12) — base-contract conformance, fetch output identity, all four accessor methods present and real, `getHealth()` delegating correctly, shared timeout firing on a real hang and staying transparent on a fast real call, shared cache hook off-by-default and correctly caching once explicitly enabled, `withRetry`/`withTimeout` re-exported verbatim and functioning; `providerCacheConfig.test.js` (2 new) — `getTtlMsForProvider` defaulting to `0` and honoring a real configured override.

147 pre-existing tests across the full provider/scheduler/cache surface (`providers/*`, `providers/definitions/*`, `agentScheduler/*`, `redisCache/*`, `providerHealthService`, `providerMetricsService`, `providerDiagnosticsService`, `providerIngestionService`, `routes/provider.integration.test.js`) were re-run together and confirmed passing unchanged.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2399 tests, 2397 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Only 2 of 22 providers have been migrated.** The other 20 remain on `createProvider`/`honestStubFetch`, exactly as before — migrating a stub with no real logic to a richer interface would add code with zero real benefit. `createUnifiedProvider` is fully ready for any future provider's real `fetch()` implementation to adopt immediately, with zero further changes to this phase's own code.
2. **Caching is opt-in and currently enabled for no provider by default** (`PROVIDER_TTL_MS_BY_ID` is empty). Both migrated providers get the shared timeout and shared health/metrics/diagnostics accessors, but not caching — a deliberate choice disclosed above, not an oversight.
3. **`getCacheStats()` reports the whole shared cache's global hit/miss/bypassed counters, not per-provider ones** — `providerCache.js` (from `REDIS-CACHE-001`) does not track stats per cache key. This is the same disclosed limitation that phase's own documentation already named; this phase does not change it.
4. **Shared retry policy is a re-export, not a new mechanism** — the actual retry loop around a provider's outer `fetch()` call is still the one `providerIngestionService.js` already ran before this phase; nothing here adds a second layer of retrying.
5. **The circular-dependency workaround (deferred `require()` inside accessor methods) is a real, necessary pattern given this codebase's existing module graph** — not a design preference. A future refactor that breaks the `providerHealthService`/`providerMetricsService`/`providerDiagnosticsService` → `providerRegistry` → provider-definitions dependency direction could simplify this, but that is a separate, larger architectural change explicitly out of this phase's "do not redesign providers" scope.

## Files changed

- New: `backend/services/providers/providerAbstraction.js` + `providerAbstraction.test.js`.
- Modified: `backend/services/agentScheduler/agentScheduler.js` (one new named export, `withTimeout`).
- Modified: `backend/services/redisCache/providerCacheConfig.js` + `providerCacheConfig.test.js` (2 new additive exports + 2 new tests).
- Modified: `backend/services/providers/definitions/reutersBloombergWireProvider.js`, `backend/services/providers/definitions/cftcCotProvider.js` (factory call changed; real fetch logic byte-identical).
- Unmodified: `providerFactory.js`, `baseProviderContract.js`, `providerRegistry.js`, `providerHealthService.js`, `providerMetricsService.js`, `providerDiagnosticsService.js`, `providerIngestionService.js`, `providerRunLogRepository.js`, `providers/retryPolicy.js`, `providers/rateLimiter.js`, `redisCache/providerCache.js`, `redisCache/redisClient.js`, `providerRoutes.js`, `providerController.js`, the other 20 provider definitions, every domain agent, every Claim Intelligence/Intelligence Bus/Outcome Calibration module.
