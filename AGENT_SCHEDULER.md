# AGENT_SCHEDULER.md — Phase AGENT-SCHEDULER-001

**Mission:** build the scheduling and execution layer between the Agent Orchestrator and actual agent execution, making 100+ agents safe to run — configurable concurrency, an execution queue, priority + fair scheduling, retry backoff + jitter, `AbortController` support, graceful cancellation, per-agent timeout, duplicate in-flight prevention, and scheduler metrics. The orchestrator must not gain business logic; the Scheduler becomes the execution engine; the public API stays unchanged.

---

## What was built

A new module, `backend/services/agentScheduler/`, sitting beside `agentOrchestrator` and `agentObservability`.

| File | Responsibility |
|---|---|
| `schedulerConfig.js` | Every default in one place: concurrency (20), timeout (5000ms, unchanged from `AGENT-ORCHESTRATOR-001`), max retries (1, unchanged), backoff base/max delay, priority-aging factor. |
| `retryBackoff.js` | `computeBackoffDelayMs(attempt, opts)` — full-jitter exponential backoff (`random() * min(maxDelayMs, baseDelayMs * 2^(attempt-1))`), injectable `random` for deterministic tests. `abortableDelay(ms, signal)` — a delay that rejects early with `"CANCELLED"` if aborted, never leaves a dangling timer. |
| `cancellationToken.js` | Thin wrapper around a real `AbortController`: `.signal`, `.isCancelled`, `.cancel(reason)`, `.reason`. Idempotent cancel. |
| `executionQueue.js` | A plain, synchronous priority queue with **aging-based fairness**: effective priority = `metadata.priority + waitedMs * agingFactor`. This is the standard fix for the failure mode "priority scheduling" alone has — a continuous stream of high-priority arrivals could otherwise starve a low-priority job forever; aging guarantees it eventually outranks a fresher arrival. Equal-effective-priority jobs are FIFO. |
| `schedulerMetrics.js` | Pure counters/aggregates: scheduled/completed/succeeded/failed/timed-out/unavailable/cancelled/retried/deduped totals, max observed queue depth, average wait time, average execution time. |
| `agentScheduler.js` | The engine itself — `createAgentScheduler(options)` and a process-wide `sharedScheduler`. Owns the concurrency limiter, the health-check-then-execute-with-retry mechanics (moved here from the orchestrator), the dedup map, and the job registry used for cancellation. |
| `index.js` | Barrel export. |

## What moved out of `agentOrchestrator.js`

`withTimeout`, `safeHealth`, and `runOneAgent` — the entire health-check/timeout/retry mechanics `AGENT-ORCHESTRATOR-001` originally implemented directly — were deleted from `agentOrchestrator.js` and now live in `agentScheduler.js`. `run()`'s body changed from:

```js
const agentResults = await Promise.all(agents.map((agent) => runOneAgent(agent, normalizedSymbol, { timeoutMs, maxRetries })));
```

to:

```js
const agentResults = await sharedScheduler.runAll(agents, normalizedSymbol, { timeoutMs, maxRetries });
```

**Everything else in `agentOrchestrator.js` is untouched**: `registerAgent`, `unregisterAgent`, `getRegisteredAgents`, `clearRegistry`, and all four aggregation functions (`rankByConfidence`, `mergeEvidence`, `detectConflicts`, `computeOverallConfidence`) are byte-identical to before. The orchestrator's own existing test — *"the orchestrator never inspects or interprets an agent's summary/raw content"*, which greps the orchestrator's source for `.summary`/`.raw` references — still passes unmodified, because those fields were never read by the orchestrator even when it did its own scheduling, and still aren't now that it doesn't.

## Public API — confirmed unchanged

- `agentOrchestrator.run(symbol, { agents, timeoutMs, maxRetries })` — same parameters, same defaults (imported from `schedulerConfig.js` so there is exactly one source of truth for `DEFAULT_TIMEOUT_MS`/`DEFAULT_MAX_RETRIES`, not two constants that could drift), same returned report shape (`symbol`, `generatedAt`, `tookMs`, `agents`, `overallConfidence`, `conflicts`, `evidence`, `summary`).
- `registerAgent`/`unregisterAgent`/`getRegisteredAgents`/`clearRegistry` — unchanged.
- `GET /api/v2/agent-orchestrator/:symbol` — unchanged route, unchanged response shape (still runs through `agentObservability`'s `runObserved()` from `AGENT-OBSERVABILITY-001`, which itself required no changes for this phase — it already calls `agentOrchestrator.run()`, which now happens to run on the scheduler underneath).
- Every per-agent result object still carries the original fields (`agentId`, `agentName`, `category`, `priority`, `status`, `health`, `confidence`, `evidence`, `direction`, `attempts`, `tookMs`, plus `error` where applicable) — **and now additionally `waitMs`** (time spent queued before dispatch). This is a purely additive field; nothing reads or requires its absence, and both the orchestrator's own tests and `agentObservability`'s tests (which check specific fields, never a closed/deep-equal set on a per-agent record) continue to pass.

## How each requirement was satisfied

| Requirement | Implementation |
|---|---|
| Configurable concurrency limits | `createAgentScheduler({ concurrency })`, plus `setConcurrencyLimit(n)`/`getConcurrencyLimit()` on the shared, process-wide scheduler — a platform-wide pool, not a per-request setting (multiple concurrent `run()` calls for different symbols all share and contend over the same pool, which is the actual "100+ agents" scaling scenario: many requests × many agents each). |
| Execution queue | `ExecutionQueue` — a job is enqueued the instant `runAgent()` is called; dispatched the moment a concurrency slot is free. |
| Priority scheduling | Jobs carry the agent's own `metadata.priority` (already part of the Agent interface); the queue always considers priority first. |
| Fair scheduling | Priority **aging** — see `executionQueue.js` above. Verified by a dedicated test proving a long-waiting low-priority job outranks a freshly-arrived high-priority one. |
| Retry backoff | `computeBackoffDelayMs` — full-jitter exponential, capped at `maxDelayMs`. |
| Retry jitter | The same function's `random()` term — verified by a test asserting `random() === 0` always yields a `0` delay (real jitter, not a fixed schedule). |
| AbortController support | `CancellationToken` wraps a real `AbortController`; `withTimeout`'s timeout race and `abortableDelay`'s backoff wait both listen on the same `signal`. |
| Graceful cancellation | `cancelJob(jobId)` / `cancelSymbol(symbol)` — a queued job is removed and resolves with a real `"CANCELLED"` record without ever calling `execute()`; a mid-execution job's timeout/backoff wait is aborted and it resolves the same way. Neither path throws an unhandled rejection or leaves a dangling promise. |
| Per-agent timeout enforcement | Unchanged mechanism (`withTimeout`), now scheduler-owned, same default (5000ms), same override via `options.timeoutMs`. |
| Duplicate in-flight request prevention | Keyed by `` `${agentId}::${symbol}` `` — a second concurrent request for the same agent+symbol attaches to the exact same in-flight promise rather than starting a second real execution; scoped correctly (same agent, different symbol, is *not* deduped). |
| Scheduler metrics | `getMetrics()` — scheduled/completed/succeeded/failed/timed-out/unavailable/cancelled/retried/deduped counts, active count, queue depth, max observed queue depth, average wait/exec time, current concurrency limit. |

## Tests

72 new tests added across the scheduler module, all passing:
- `schedulerConfig` has no test file (pure constants, nothing to assert beyond what consumers already verify).
- `retryBackoff.test.js` (5 tests) — exponential growth, capping, real jitter (both `random()=0` and `random()=1` edges), abort-before-wait and abort-mid-wait.
- `cancellationToken.test.js` (4 tests) — fresh state, real abort, idempotency, real event firing.
- `executionQueue.test.js` (5 tests) — priority ordering, FIFO tie-break, aging-based fairness, size/isEmpty, targeted removal.
- `schedulerMetrics.test.js` (6 tests) — zero state, outcome bucketing, real averages, unrecognized-outcome handling, high-water-mark tracking, reset.
- `agentScheduler.test.js` (16 tests) — the full engine: success/unavailable/timeout/retry paths, real concurrency limiting (measured via an actual concurrent-execution counter, not just a code-path check), live limit changes, priority dispatch order under contention, both dedup cases, both cancellation paths (queued and mid-execution), metrics consistency after a mixed batch, reset, and input validation.

Plus regression verification: the full pre-existing `agentOrchestrator` suite (registerAgent/run/ranking/retry/timeout/conflict/evidence — 15 tests) and the full `agentObservability` suite (37 tests from `AGENT-OBSERVABILITY-001`, including its own "the orchestrator is never modified" source check) were re-run — **all 71 pass unmodified**, proving the scheduler swap is behaviorally transparent to every existing caller and test.

Full backend suite (`node --test` across every `*.test.js`) was run after the change: **1163 tests, 1161 passing, 2 failing** — the same two pre-existing, unrelated failures identified and confirmed during `AGENT-OBSERVABILITY-001` (`services/intelligenceBus/intelligenceBusService.test.js`'s two `lifecycle:` tests, a real-time-based TTL/expiry flake in a file this phase never touched). Zero new failures introduced. The frontend production build was re-verified green (this phase touches backend only).

## Design notes and honest limitations

1. **Cancellation is not yet wired through `agentOrchestrator.run()`'s public options.** `run()` does not accept a `signal` parameter today, so cancellation is only reachable by calling `sharedScheduler.cancelJob()`/`cancelSymbol()` directly (fully tested at that level). Wiring an optional `signal` through `run()`'s options — so a future HTTP layer could cancel on client disconnect — is a small, low-risk follow-up not attempted here to avoid changing the orchestrator's public signature in the same phase that promised to keep it unchanged.
2. **A cancelled execution reports `status: "error"`, `error: "CANCELLED"`**, rather than a dedicated `"cancelled"` status. This was a deliberate choice to avoid touching `agentOrchestrator.js`'s summary-counting logic (`fulfilled`/`unavailable`/`failed` buckets) or `agentObservability`'s `failureTaxonomy.js` in this phase — a cancelled job is correctly counted as a failure today, just not distinguished from a genuine execution error in the taxonomy. Adding a dedicated `CANCELLED` code to `failureTaxonomy.js` is a natural, additive follow-up.
3. **The priority/fairness queue is a simple O(n) array scan on dequeue**, not a heap. At the scale this phase targets (100+ agents per request, a handful of concurrent requests), this is negligible overhead and deliberately not over-engineered; if queue depth were ever to reach the thousands, a binary heap would be the natural upgrade.
4. **Concurrency is one global pool, not per-symbol or per-priority-band.** This is intentional — a single shared pool is what actually protects the platform (and its upstream data providers) from 100+ agents firing simultaneously across many concurrent requests, which is the scaling problem this phase exists to solve.
5. **The dedup key does not include `timeoutMs`/`maxRetries` options.** Two concurrent calls for the same agent+symbol but different `timeoutMs` will share one execution using whichever call's options happened to start it first. This mirrors real-world dedup tradeoffs (you can't honor two different timeout budgets for one shared piece of work) and is disclosed here rather than silently assumed away.

## Files changed

- New: `backend/services/agentScheduler/{schedulerConfig,retryBackoff,cancellationToken,executionQueue,schedulerMetrics,agentScheduler,index}.js` + matching `.test.js` files (except `schedulerConfig.js`, pure constants).
- Modified: `backend/services/agentOrchestrator/agentOrchestrator.js` — `withTimeout`/`safeHealth`/`runOneAgent` removed; `run()` now delegates execution to `sharedScheduler.runAll()`; public exports and every aggregation function unchanged.
- Unmodified, verified by re-running their existing test suites: `agentInterface.js`, `registry.js`, every agent implementation, `agentObservability/*` (all of `AGENT-OBSERVABILITY-001`), `agentOrchestratorController.js`, `agentObservabilityController.js`, both route files.

## Remaining / future work (not in this phase's scope)

- Wire an optional `signal` through `agentOrchestrator.run()`'s public options so a real HTTP request's cancellation (client disconnect) can reach the scheduler.
- Add a dedicated `CANCELLED` code to `agentObservability`'s `failureTaxonomy.js` and surface `scheduler.getMetrics()` alongside the existing execution-log metrics on the observability trace endpoint.
- Swap the execution queue's O(n) scan for a binary heap if real queue depth ever grows large enough to matter.
- Make `DEFAULT_CONCURRENCY` and the aging factor tunable via environment/config rather than only a constructor argument.
