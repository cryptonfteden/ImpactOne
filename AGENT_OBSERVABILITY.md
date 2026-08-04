# AGENT_OBSERVABILITY.md — Phase AGENT-OBSERVABILITY-001

**Mission:** build the observability layer for the Agent Platform — complete visibility into every agent execution, with no business logic, low overhead, extensible to 100+ agents. Infrastructure only; no dashboards.

---

## What was built

A new module, `backend/services/agentObservability/`, sitting alongside (not inside) `backend/services/agentOrchestrator/`. It observes the orchestrator's real, unmodified execution — it does not change what the orchestrator does, only records what already happened.

| File | Responsibility |
|---|---|
| `correlationModel.js` | Generates `correlationId` (one per `orchestrator.run()` call) and `executionId` (one per single agent execution within that run). |
| `timingUtils.js` | `Stopwatch` class + `durationMs()` helper — generic wall-clock measurement, injectable clock for deterministic tests. |
| `failureTaxonomy.js` | A fixed, closed vocabulary (`NONE`, `AGENT_UNAVAILABLE`, `TIMEOUT`, `AGENT_ERROR`, `UNKNOWN`) that classifies the orchestrator's own opaque `status` field — never an agent's business content. |
| `agentExecutionLog.js` | **AgentExecutionLog** — the execution-record store. In-memory, bounded (5,000 records by default, oldest evicted first), indexed by symbol / correlationId / executionId for O(1)-ish lookup. Exposes a factory (`createAgentExecutionLog`) for test isolation and one process-wide `sharedLog` for real traffic. |
| `metricsCollector.js` | Pure aggregation over a list of execution records: per-agent and overall success rate, average duration, average retry count, average confidence (successes only), cache-hit rate (only over records that actually reported a cache signal). |
| `executionTimeline.js` | Turns a flat record list into a chronological timeline with relative offsets from the earliest event — ordering and presentation only. |
| `observableOrchestrator.js` | The seam: `runObserved(symbol, options)` calls the real `agentOrchestrator.run()` unchanged, then derives one execution record per agent from its already-returned report and appends each to the log. |
| `index.js` | Barrel export for the whole layer. |

Every file above is genuinely additive. **`backend/services/agentOrchestrator/agentOrchestrator.js` and `agentInterface.js` were not modified at all** — a test in `observableOrchestrator.test.js` proves this by grepping the orchestrator's own source for any reference to the observability layer and asserting there is none. This mirrors the same "additive, never a silent rewrite of tested infrastructure" discipline `AGENT-ORCHESTRATOR-001` itself used when it kept the new engine off the existing `/v2/symbol-intelligence/:symbol` path.

## How every required field is captured

| Required field | Source |
|---|---|
| Agent name | `agentResult.agentName` (copied verbatim from the orchestrator's own per-agent result) |
| Symbol | `report.symbol` (already normalized/uppercased by the orchestrator) |
| Start time | `runStartMs` — captured immediately before calling `agentOrchestrator.run()`; every agent in one run is dispatched together via the orchestrator's own `Promise.all`, so this is each agent's real start time, not an approximation of when it happened, only of exactly which millisecond within the run — see "Known limitation" below |
| End time | `startedAtMs + agentResult.tookMs` (the orchestrator already measures this precisely per agent) |
| Duration | `agentResult.tookMs`, copied directly |
| Success / Failure | `agentResult.status === "fulfilled"` |
| Timeout | `agentResult.status === "timeout"` |
| Retry count | `Math.max(0, (agentResult.attempts ?? 1) - 1)` — the orchestrator already counts real attempts; this layer only subtracts 1 to express it as "retries" rather than "attempts" |
| Health status | `agentResult.health.status` |
| Confidence | `agentResult.confidence`, copied directly |
| Cache hit / miss | Best-effort, **honestly optional**: read from `agentResult.result.raw.cacheHit` or `.fromCache` if an agent chooses to report it; `null` (explicitly unknown, never fabricated) otherwise — see "Known limitation" below |
| Data sources used | Same pattern: `agentResult.result.raw.dataSources` or `.sources` if present, else `null` |
| Execution ID | Freshly generated per record via `correlationModel.newExecutionId()` |
| Correlation ID | One generated per `runObserved()` call, shared across every agent's record from that run |

## Design goals, addressed directly

- **No business logic.** Every function in this layer reads only fields the orchestrator's own `AgentExecutionLog`-relevant contract already exposes (status, tookMs, attempts, confidence, health) or a `raw.cacheHit`/`raw.dataSources` field an agent opts into — never a `summary`, never interprets `direction`, never touches `evidence` content. The failure taxonomy classifies the orchestrator's own `status` string, not what any agent concluded.
- **Low overhead.** No I/O, no database, no network call. `AgentExecutionLog` is a `Map`-indexed in-memory array with O(1) append and bounded size (never unbounded growth). Recording happens strictly after the orchestrator's own `Promise.all` has already resolved — instrumentation adds no latency to any agent's actual execution.
- **Extensible.** The cache-hit/data-source extraction is forward-compatible by design: no agent is required to change today, but any agent that starts reporting `raw.cacheHit`/`raw.dataSources` is automatically picked up with no change to this layer. `createAgentExecutionLog()` lets a future phase swap the in-memory store for a persisted one (e.g. a Prisma model) without changing any caller's contract.
- **Works for 100+ agents.** Nothing here iterates over agents beyond a single `for...of` over whatever list the orchestrator's own report already contains; the bounded log and Map-based indices keep per-lookup cost independent of total agent count.

## The developer endpoint

`GET /api/v2/agent-observability/:symbol` returns:

```json
{
  "symbol": "NVDA",
  "recordCount": 3,
  "timeline": { "startedAtMs": ..., "endedAtMs": ..., "totalDurationMs": ..., "events": [ ... ] },
  "metrics": { "overall": { ... }, "perAgent": [ { "agentId": "technical", ... }, ... ] }
}
```

This is the full execution trace for a symbol — every agent execution ever recorded for it (bounded by the shared log's retention), in chronological order, plus aggregated metrics. No dashboard, no HTML, no chart — a plain JSON endpoint, per the mission's explicit instruction ("Do NOT implement dashboards. Only infrastructure.").

The existing, already-consumer-facing `/api/v2/agent-orchestrator/:symbol` endpoint now calls `runObserved()` instead of `agentOrchestrator.run()` directly — this is the one live wiring change, and it is deliberately invisible to callers: the JSON response is byte-identical to what the unmodified orchestrator would have returned (`observableOrchestrator.test.js` proves this by comparing key sets against a direct `agentOrchestrator.run()` call). Recording execution history is a side effect of that endpoint, never a change to its contract.

## Known, disclosed limitations

1. **Per-agent start time is approximate, not individually timestamped by the orchestrator.** `agentOrchestrator.run()` dispatches every agent's `runOneAgent()` together via `Promise.all`, and each agent's own `health()` + `execute()` sequence begins essentially simultaneously — but the orchestrator itself does not expose an absolute start timestamp per agent, only a relative `tookMs`. This layer therefore treats every agent in one run as starting at the same `runStartMs` captured immediately before the call. This is accurate to within the JS event-loop's own dispatch jitter (sub-millisecond to low-single-digit-millisecond in practice), not a fabrication, and is disclosed here rather than presented as more precise than it is.
2. **Cache hit/miss and data sources used are honestly `null` for every agent shipped in `AGENT-ORCHESTRATOR-001`.** None of the 3 real agents (technical, options, sentiment) or the 10 stub agents currently report a `cacheHit`/`dataSources` field on their `raw` result — there was no existing concept of an agent-level cache to observe. Rather than fabricate a value, every execution record's `cacheHit`/`dataSourcesUsed` fields are `null` today, and will only ever report `true`/`false`/a real array once — and if — an agent chooses to add that reporting to its own `execute()` result. `metricsCollector.js`'s `cacheHitRate` is computed only over records that actually reported a value (`cacheTrackedCount`), and is `null` (not `0`) when no agent has ever reported one, so this absence is visible in the metrics output rather than silently defaulting to a misleading number.
3. **The log is in-memory and process-local.** A server restart clears all execution history. This is consistent with "low overhead" and the mission's "infrastructure only" scope — a persisted store is a natural next step (the factory function `createAgentExecutionLog()` was written specifically so that swap doesn't require touching any caller), but was not built here because the mission did not ask for durability.
4. **The `maxRecords` bound (5,000) is a fixed default, not yet configurable via environment/config.** At 100+ agents running per request, this bound could be reached within a modest number of real requests; raising it or wiring an env var is a one-line follow-up, not a structural limitation.

## Tests

37 new tests added, all passing:
- `correlationModel.test.js` (1 test)
- `timingUtils.test.js` (4 tests)
- `failureTaxonomy.test.js` (3 tests)
- `agentExecutionLog.test.js` (8 tests) — including a real bounded-eviction test proving every index stays consistent after eviction
- `metricsCollector.test.js` (5 tests) — including proof that `cacheHitRate` stays honestly `null` when no record reports cache status
- `executionTimeline.test.js` (3 tests)
- `observableOrchestrator.test.js` (10 tests) — full integration against the real, unmodified `agentOrchestrator.js`, covering success/timeout/unavailable/retry paths and proving the orchestrator itself was never touched
- `routes/agentObservability.integration.test.js` (3 tests) — real HTTP round-trip: a real call to the existing `/api/v2/agent-orchestrator/:symbol` populates the log, then the new `/api/v2/agent-observability/:symbol` returns it

All 37 pass. The full backend suite (`node --test` across every `*.test.js`) was also run: **1127 tests, 1125 passing, 2 failing.** Both failures are in `services/intelligenceBus/intelligenceBusService.test.js` (`lifecycle: a newer event in the same series...supersedes the prior ACTIVE one` and `lifecycle: events from a different engine/symbol series are never superseded...`), a file untouched by this phase — confirmed pre-existing by re-running that file in isolation (fails identically with no observability code loaded at all) and by `git status` showing zero changes to that file or its subsystem in this phase. This is a real, disclosed, unrelated flake (real-time-based TTL/expiry assertion), not a regression introduced by this work.

## Files changed

- New: `backend/services/agentObservability/{correlationModel,timingUtils,failureTaxonomy,agentExecutionLog,metricsCollector,executionTimeline,observableOrchestrator,index}.js` + matching `.test.js` files.
- New: `backend/controllers/agentObservabilityController.js`, `backend/routes/agentObservabilityRoutes.js`, `backend/routes/agentObservability.integration.test.js`.
- Modified: `backend/controllers/agentOrchestratorController.js` (now calls `runObserved()` instead of `agentOrchestrator.run()` directly — response shape unchanged).
- Modified: `backend/routes/index.js` (mounts the new route at `/v2/agent-observability`).
- Unmodified, verified by test: `backend/services/agentOrchestrator/agentOrchestrator.js`, `agentInterface.js`, every agent implementation.

## Remaining / future work (not in this phase's scope)

- Wire `cacheHit`/`dataSourcesUsed` reporting into the real agents (technical/options/sentiment) once each has an actual cache layer worth observing.
- Persist `AgentExecutionLog` beyond process memory if execution history needs to survive a restart or be queried across instances.
- Make `maxRecords` configurable.
- A real dashboard consuming this endpoint — explicitly out of scope per this mission ("Do NOT implement dashboards").
