# PLATFORM_HARDENING.md — Phase PLATFORM-HARDENING-001

**Mission:** harden the Agent Platform for production — no new investment features, platform robustness only. Configurable retention policies, configurable execution limits, request-level failure logging, correlation ID propagation end-to-end, configurable observability storage, a health cache, a scheduler configuration object, and a runtime diagnostics endpoint. Everything must remain backwards compatible.

---

## What was built

Every change is additive to `AGENT-ORCHESTRATOR-001`, `AGENT-OBSERVABILITY-001`, and `AGENT-SCHEDULER-001`. No investment/analysis logic was touched; nothing in `backend/services/agentOrchestrator/agents/` changed.

### 1. Configurable execution limits + Scheduler configuration object

`backend/services/agentScheduler/schedulerConfigObject.js` (new) — a single, mutable, validated configuration object holding every scheduler-mechanics knob: `concurrency`, `timeoutMs`, `maxRetries`, `baseDelayMs`, `maxDelayMs`, `agingFactorPerMs`, `healthCacheTtlMs`. `agentScheduler.js` now builds one of these per scheduler instance and reads every default from it live (not from constants captured once at construction). Two new scheduler methods:

- `scheduler.getConfig()` — the full current config as a plain object.
- `scheduler.updateConfig(partial)` — validates and applies a partial change; **all-or-nothing** (an invalid field in a batch update rejects the whole call, applying nothing), and takes effect **immediately**, including for already-queued jobs (verified by a test that raises `maxRetries` mid-flight and observes the very next call retry more).

`getConcurrencyLimit()`/`setConcurrencyLimit()` from `AGENT-SCHEDULER-001` are kept as thin, backward-compatible wrappers over the same config object.

`backend/services/agentScheduler/schedulerConfig.js` (the static-defaults module) now reads every default from an environment variable at process start, falling back to its original hardcoded value when unset: `AGENT_SCHEDULER_CONCURRENCY`, `AGENT_SCHEDULER_TIMEOUT_MS`, `AGENT_SCHEDULER_MAX_RETRIES`, `AGENT_SCHEDULER_BASE_DELAY_MS`, `AGENT_SCHEDULER_MAX_DELAY_MS`, `AGENT_SCHEDULER_AGING_FACTOR_PER_MS`, `AGENT_SCHEDULER_HEALTH_CACHE_TTL_MS`. With no environment variables set (the default, and every existing test's actual environment), every value is numerically identical to before — zero behavior change.

### 2. Health cache

`backend/services/agentScheduler/healthCache.js` (new) — a small TTL cache for `agent.health()` results, deliberately keyed by **the agent object itself** (a `WeakMap`), never by `agentId` string. This was a specific, considered choice: keying by id risks a stale cached result from one registered agent leaking onto a different object that happens to reuse the same id — exactly what happens across independent test runs (many `agentOrchestrator.test.js` tests register a fresh agent object under a reused id like `"a"`), and could in principle happen after a real unregister/re-register cycle in production. A `WeakMap` keyed by object reference cannot have that failure mode: a fresh object never collides with a prior one, and costs nothing extra for the normal case (one persistent registered agent reused across every real request). TTL is read live from `scheduler.getConfig().healthCacheTtlMs` on every call, so an `updateConfig({ healthCacheTtlMs: 0 })` disables caching immediately.

The scheduler's `runAgent()` now calls `healthCache.getOrCompute(agent, () => safeHealth(agent))` instead of calling `safeHealth(agent)` directly. `scheduler.getHealthCacheStats()` exposes `{ hits, misses }`. `scheduler.reset()` now also clears the health cache and its stats.

### 3. Configurable retention policies + Configurable observability storage

`backend/services/agentObservability/executionLogStore.js` (new) — the actual in-memory record-storage mechanics, extracted out of `agentExecutionLog.js` into a standalone module implementing a small, explicit interface (`append`/`getBySymbol`/`getByCorrelationId`/`getByExecutionId`/`recent`/`size`/`clear`/`setMaxRecords`/`getMaxRecords`). `agentExecutionLog.js` is now a thin wrapper: `createAgentExecutionLog({ maxRecords, store })` defaults to building its own in-memory store, or a caller may supply an alternative `store` implementing the same interface (e.g. a future persisted backend) — this is the "configurable observability storage" seam. `maxRecords` (retention) is now also configurable **at runtime**, not just at construction: `log.setMaxRecords(n)`/`log.getMaxRecords()`, and shrinking the ceiling evicts immediately. The default retention bound can also be set via `AGENT_OBSERVABILITY_MAX_RECORDS` at process start.

`backend/services/agentObservability/requestFailureLog.js` (new, see #4) follows the identical retention pattern (`setMaxRecords`/`getMaxRecords`, env-var default `AGENT_OBSERVABILITY_FAILURE_LOG_MAX_RECORDS`).

### 4. Request-level failure logging

`backend/services/agentObservability/requestFailureLog.js` (new) — a small, bounded log distinct from `AgentExecutionLog`. `AgentExecutionLog` already records every individual **agent's** execution outcome at fine grain (that's its whole job, from `AGENT-OBSERVABILITY-001`); this new log answers a different question — **did the request itself fail, and why** (a thrown error, a 400 for a missing symbol, an unexpected 500) — tagged with the same `correlationId` so the two logs can be cross-referenced for one real incident. Both `agentOrchestratorController.js` and `agentObservabilityController.js` now append to `sharedRequestFailureLog` on their respective failure paths.

### 5. Correlation ID propagation end-to-end

`backend/services/agentObservability/correlationModel.js` gained `resolveRequestCorrelationId(req)` — honors an inbound `X-Correlation-Id` request header if the caller already has one (e.g. from an upstream gateway, or a client retrying a request it already tagged), otherwise mints a fresh one exactly as before. Both agent-facing controllers now:

1. Resolve the correlation id from the inbound request (or mint one).
2. Echo it back on every response via the `X-Correlation-Id` header — a caller now always has an id to look up this exact request later.
3. Pass it into `runObserved(symbol, options, { correlationId })` (extended, backward compatibly — a caller-supplied id is used verbatim instead of `runObserved` generating its own) so every `AgentExecutionLog` record from that request is filed under the SAME id the caller has.
4. Tag any request-failure-log entry with the same id.

`agentObservabilityController.js`'s trace endpoint additionally accepts an optional `?correlationId=` query parameter to narrow a symbol's trace down to exactly one prior request — omitting it preserves the original "every record for this symbol" behavior.

### 6. Runtime diagnostics endpoint

`GET /api/v2/agent-diagnostics` (new controller + route, no dashboard, no UI — plain JSON, consistent with every prior phase's "infrastructure only" scope) returns one consolidated snapshot:

```json
{
  "generatedAt": "...",
  "process": { "uptimeSeconds": 123, "nodeVersion": "v24...", "platform": "win32", "memory": { "rssBytes": ..., "heapUsedBytes": ..., "heapTotalBytes": ... } },
  "scheduler": { "config": { "concurrency": 20, "timeoutMs": 5000, ... }, "metrics": { ... }, "healthCache": { "hits": 0, "misses": 0 } },
  "observability": {
    "executionLog": { "size": 0, "maxRecords": 5000 },
    "requestFailureLog": { "size": 0, "maxRecords": 1000, "recent": [] }
  }
}
```

A test confirms this snapshot reflects a real, live `updateConfig()` change immediately — it reads directly from the same shared scheduler instance every real request uses, never a cached/stale copy.

---

## Backward compatibility — how it was verified, not just asserted

- **`agentOrchestrator.run()`'s signature, defaults, and returned report shape are completely untouched** by this phase — it still imports `DEFAULT_TIMEOUT_MS`/`DEFAULT_MAX_RETRIES` from `schedulerConfig.js`, which now resolve from environment variables but fall back to the exact same numeric values used before, so with no new env vars set (every existing test's real environment), `run()` behaves identically.
- **Every pre-existing test in `agentOrchestrator.test.js` (15), `agentObservability` (37 across all its files), and `agentScheduler` (36 from `AGENT-SCHEDULER-001`) was re-run and passes unmodified** — no test file's assertions were weakened or removed to accommodate this phase's changes.
- **`agentExecutionLog.js`'s public functions (`append`/`getBySymbol`/`getByCorrelationId`/`getByExecutionId`/`recent`/`size`/`clear`) are unchanged in signature and behavior** — the storage-extraction into `executionLogStore.js` is purely internal; its own 8-test suite passes unmodified.
- **`observableOrchestrator.js`'s `runObserved(symbol, options, { log, correlationId })`** — `correlationId` is a new, optional field on the existing third argument object; every existing call site (including every test that only passes `{ log }`) is unaffected, verified by a new pair of tests proving both the "caller supplies one" and "none supplied, generates one exactly as before" paths.
- **`agentOrchestratorController.js` and `agentObservabilityController.js`'s response bodies are byte-identical** to before this phase — only a new response header (`X-Correlation-Id`) was added, which no existing test asserts the absence of.
- **`agentScheduler.js`'s `setConcurrencyLimit`/`getConcurrencyLimit`/`getMetrics`/`reset` keep their exact original signatures and behavior**, now implemented as thin wrappers over the new config object — verified by the full pre-existing `agentScheduler.test.js` suite passing unmodified, plus new tests proving the wrapper relationship explicitly (`setConcurrencyLimit` and `updateConfig({concurrency})` observably affect the same underlying value).

## Tests

New tests added this phase, all passing:
- `schedulerConfigObject.test.js` (7 tests) — defaults, overrides, valid/invalid updates, all-or-nothing validation, real-copy semantics.
- `healthCache.test.js` (7 tests) — hit/miss, TTL expiry, object-identity isolation (the specific bug this design avoids), TTL-0 bypass, live TTL changes, per-agent invalidation, clear/reset.
- `agentScheduler.test.js` (+7 tests) — `getConfig`/`updateConfig` (including a live mid-flight retry-count change), rejection of an invalid update, the `setConcurrencyLimit`/config-object relationship, health-cache integration (a real repeated-call hit), disabling the cache via `updateConfig`, and `reset()` clearing cache state.
- `executionLogStore.test.js` (4 tests) — `setMaxRecords` shrink-evicts-immediately and grow-never-evicts, rejection of an invalid value, `getMaxRecords`.
- `agentExecutionLog.pluggability.test.js` (3 tests) — a caller-supplied store is actually used, retention delegates through to the store, two independently-constructed logs never share state.
- `requestFailureLog.test.js` (6 tests) — append/retrieve by correlation id, rejection of a bad entry, bounded retention with eviction, runtime-configurable retention, `recent()`, `clear()`.
- `observableOrchestrator.test.js` (+2 tests) — a supplied correlationId is used verbatim; none supplied still generates a fresh one.
- `routes/agentObservability.integration.test.js` (+4 tests) — real HTTP round-trips proving the inbound header is honored and echoed, a fresh id is generated and echoed when none is supplied, and a real 400 is logged to the request-failure log with its correlation id.
- `routes/agentDiagnostics.integration.test.js` (2 tests) — the full snapshot shape, and that it reflects a real live config change.

**Total new tests this phase: 42, all passing.**

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1204 tests, 1195 passing, 9 failing.** Every failure was individually re-run in isolation to check for a real regression:

- **2 are the same standing, pre-existing flake already identified and disclosed in both `AGENT-OBSERVABILITY-001` and `AGENT-SCHEDULER-001`** (`services/intelligenceBus/intelligenceBusService.test.js`'s two `lifecycle:` tests — a real-time-based TTL/expiry assertion, fails identically even run completely alone, in a file this phase never touched).
- **The other 7** (`autonomousRecommendationEngine.test.js`, `autonomousRecommendationRepository.test.js`, `calibrationReportService.test.js`/`calibrationAnalysisService.test.js`) **all pass cleanly when re-run in isolation** — confirmed by running each file alone (`node --test <file>`), every one green. This is cross-test pollution from the shared real-Postgres test database when 1204 tests across unrelated subsystems run back-to-back in one process, not a regression from this phase — this session touched zero files in `autonomousRecommendationEngine.js`, `autonomousRecommendationRepository.js`, `calibrationReportService.js`, or their tests.

Zero real regressions from this phase's changes. The frontend production build was re-verified green (this phase touches backend only, no investment/UI features added).

## Honest limitations, disclosed rather than hidden

1. **"Configurable observability storage" today ships one real backend (in-memory) plus the seam to add another.** No persisted (database/file/Redis) backend was built this phase — the interface exists and is proven pluggable (a test constructs a caller-supplied store and confirms the log writes through to it), but building a real persisted store was out of this phase's stated scope (platform robustness, not a new subsystem) and would need its own schema/migration decision.
2. **Retention is count-based only** (`maxRecords`), for both `AgentExecutionLog` and `RequestFailureLog` — no time-based ("evict anything older than N hours") policy was built. This is a natural, additive follow-up.
3. **`agentOrchestrator.run()`'s own default parameters do not read live scheduler config.** They're evaluated once from the env-resolved constants in `schedulerConfig.js` at module load. If an operator calls `sharedScheduler.updateConfig({ timeoutMs: X })` at runtime, a caller of `run()` who doesn't explicitly pass `timeoutMs` will still get the module-load-time default, not the live-updated one — only calls that go through the scheduler directly (or don't override the option) after a config change see the new value applied inside the scheduler itself for retry/backoff mechanics; the orchestrator's own convenience default is a separate, smaller inconsistency. This was a deliberate choice to avoid changing `agentOrchestrator.js`'s public signature/defaults logic in a "backwards compatible" hardening phase — flagged here rather than silently left as an assumption.
4. **The health cache's WeakMap cannot report its own size** (a JS platform limitation) — `getHealthCacheStats()` reports hit/miss counts, not "how many agents are currently cached," which would need a separate counter subject to its own leak/accuracy tradeoffs. Not built, disclosed here.
5. **Correlation ID propagation covers the two agent-facing HTTP endpoints this phase touches** (`/v2/agent-orchestrator/:symbol`, `/v2/agent-observability/:symbol`) plus the new diagnostics endpoint's own request handling. It does not yet extend to the scheduler's own cancellation API (`cancelJob`/`cancelSymbol` from `AGENT-SCHEDULER-001`) or to a hypothetical future streaming/websocket path — both are natural extensions once those surfaces gain their own HTTP entry points.

## Files changed

- New: `backend/services/agentScheduler/{schedulerConfigObject,healthCache}.js` + matching `.test.js` files.
- New: `backend/services/agentObservability/{executionLogStore,requestFailureLog}.js` + matching `.test.js` files, plus `agentExecutionLog.pluggability.test.js`.
- New: `backend/controllers/agentDiagnosticsController.js`, `backend/routes/agentDiagnosticsRoutes.js`, `backend/routes/agentDiagnostics.integration.test.js`.
- Modified: `backend/services/agentScheduler/schedulerConfig.js` (env-var resolution + new `DEFAULT_HEALTH_CACHE_TTL_MS`), `agentScheduler.js` (config object + health cache integration, new `getConfig`/`updateConfig`/`getHealthCacheStats`), `executionQueue.js` (aging factor may now be a live getter function, backward compatible with a plain number).
- Modified: `backend/services/agentObservability/agentExecutionLog.js` (now a thin wrapper over `executionLogStore.js`, adds `setMaxRecords`/`getMaxRecords`), `correlationModel.js` (adds `resolveRequestCorrelationId`), `observableOrchestrator.js` (adds optional `correlationId` passthrough).
- Modified: `backend/controllers/agentOrchestratorController.js`, `agentObservabilityController.js` (correlation propagation, response header, request-failure logging).
- Modified: `backend/routes/index.js` (mounts `/v2/agent-diagnostics`).
- Unmodified: every agent implementation, `agentInterface.js`, `registry.js`, `agentOrchestrator.js`'s exported functions/signatures, `agentExecutionLog.js`'s public API, `metricsCollector.js`, `executionTimeline.js`, `failureTaxonomy.js`.
