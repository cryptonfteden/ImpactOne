# Production Readiness Review — Agent Platform

**Phase:** PRODUCTION-READINESS-REVIEW-001
**Scope:** The entire Agent Platform as it exists on the real, committed history of `sprint-16-live-data` — `backend/services/agentOrchestrator/`, `backend/services/agentScheduler/`, `backend/services/agentObservability/`, and their controllers/routes, through commit `6cdf905` ("AGENT-SCHEDULER-001"). No code was written or modified to produce this review.

**Important disclosure before anything else:** at the time of this review, the working tree also contains a substantial, **uncommitted, in-progress** change set (self-labeled `PLATFORM-HARDENING-001` in an untracked `PLATFORM_HARDENING.md`) that directly addresses several of this review's findings — configurable concurrency/retention via environment variables, a health cache, request-level failure logging, end-to-end correlation ID propagation, and a new `/v2/agent-diagnostics` endpoint. This work was spot-checked (its own new test files were run and passed) but **is not committed, not stable, and is not the basis for this review's verdict** — production readiness has to be assessed against what is actually merged, not code that may still change. Every finding below states clearly whether the uncommitted work appears to address it, so nothing is lost, but nothing uncommitted is credited as "fixed." See the dedicated section at the end of this document.

---

## Executive summary

The Agent Platform has undergone three real, substantial commits in sequence, each directly responding to the previous phase's audit findings — a genuinely disciplined pattern: `AGENT-ORCHESTRATOR-001` (the execution/aggregation core) → `AGENT-OBSERVABILITY-001` (execution logging/metrics, built from `AGENT_ORCHESTRATOR_STRESS_AUDIT.md`) → `AGENT-SCHEDULER-001` (concurrency/retry/fairness/cancellation, built from the same audit's headline finding: **no concurrency ceiling existed at all**). That specific, most dangerous gap is now genuinely closed — a real, tested, platform-wide 20-slot concurrency pool exists and is credited as this phase's biggest win.

However, the platform is **not production-ready for 100+ agents today**, and has real gaps even at much lower agent counts, for reasons that are structural rather than cosmetic: an unbounded, ever-growing metrics data structure (a real memory leak, not hypothetical), a concurrency model that is a genuine safety net for platform *stability* but not for single-request *latency* at high agent counts, zero logging output anywhere in the subsystem, zero authentication/rate-limiting on endpoints that can each individually contend for the platform's entire concurrency budget, and — most consequentially for the explicit "100 agents" question — a "global" concurrency pool that is only global **per process**, silently fragmenting the moment this service is horizontally scaled, which is the natural infrastructure response to needing more capacity for 100 real agents.

---

## Findings by area

### Scheduler

**RELEASE BLOCKER.** `schedulerMetrics.js`'s `waitMsSamples` and `execMsSamples` arrays (`state.waitMsSamples.push(waitMs)` / `state.execMsSamples.push(execMs)`, on every single completed execution) are **never bounded and never evicted** — confirmed directly in source: the only place either array is ever cleared is `reset()`, and a direct grep across the entire backend confirms `sharedScheduler.reset()`/`getMetrics()` are **never called from any production code path** (only from test files). Every agent execution, forever, for the life of the process, adds one entry to each array; `average()` then does a full `O(n)` reduce over the entire array on every single `getMetrics()` call (itself never invoked in production either, today). At real production traffic and 100 agents, this is an unbounded memory growth pattern with no mitigating factor — a materially worse defect than the already-identified `AgentExecutionLog` 5,000-record cap (which is at least bounded, just insufficiently for scale), because this has **no cap of any kind**.
- **Evidence:** `backend/services/agentScheduler/schedulerMetrics.js`, `recordCompleted()`.
- **Why Release Blocker, not just High:** this is the one finding in this whole review that gets strictly worse over time on a running process regardless of agent count — it doesn't need 100 agents to eventually exhaust memory, only uptime and traffic.

**HIGH.** The scheduler's own rich metrics (`getMetrics()`: scheduled/completed/succeeded/failed/timed-out/cancelled/retried/deduped counts, queue depth, wait/exec averages) are **never exposed on any HTTP endpoint** in the committed code — confirmed via a repo-wide grep for `getMetrics`/`sharedScheduler`. The single most valuable signal for answering "is the platform currently healthy under its concurrency ceiling" exists, is well-designed, and is completely unreachable without a debugger attached to the live process.

**HIGH.** Cancellation (`cancelJob`/`cancelSymbol`) is real and well-tested at the scheduler level, but is **not reachable from any HTTP entry point** — `agentOrchestrator.run()` does not accept a `signal` parameter, so a client disconnecting mid-request (a very common real-world event: a page navigation, a timeout on the caller's side) cannot free the scheduler slot(s) it occupies. This is honestly disclosed as a known limitation in `AGENT_SCHEDULER.md` itself, credited as disclosed rather than hidden, but it remains a real gap: an abandoned client request continues consuming a share of the platform's fixed 20-slot pool until its own timeout/retry cycle completes on its own.

**MEDIUM.** A cancelled execution is reported as `status: "error", error: "CANCELLED"` — a real outcome is indistinguishable from a genuine agent bug in aggregate counts (`failureTaxonomy.js` has no `CANCELLED` code). Disclosed as a deliberate, scoped-out choice in `AGENT_SCHEDULER.md`; reasonable for this phase, but a real gap once cancellation is actually wired to real client disconnects (see above).

**LOW.** `ExecutionQueue.dequeue()` is an `O(n)` linear scan for the highest effective priority on every dequeue — negligible at today's queue depths, explicitly disclosed as a "natural upgrade to a heap if queue depth ever reaches the thousands." Not a current problem; worth tracking as registry size grows.

**Positive, credited directly:** the concurrency ceiling itself (`DEFAULT_CONCURRENCY = 20`), the full-jitter exponential backoff (a real, correct implementation of the standard AWS pattern, verified with injectable `random()` in tests), and the priority-aging fairness mechanism (verified by a dedicated starvation-prevention test) are all genuinely well-built and directly, correctly resolve the single Critical finding of the prior stress audit.

### Observability

*(Full detail already covered in `OBSERVABILITY_AUDIT.md` from the prior phase; restated here only where directly relevant to a production go/no-go, with anything changed since re-verified.)*

**RELEASE BLOCKER (unchanged from the prior audit, still true in the committed code).** `AgentExecutionLog`'s `DEFAULT_MAX_RECORDS = 5000` divides directly by agent count per run: ~384 requests of retained history at today's ~13 agents, collapsing to ~50 requests at the stated 100-agent target — an 8x effective-retention loss purely from agent-count growth, unchanged in the committed code.

**HIGH (unchanged from the prior audit, still true in the committed code).** `agentOrchestratorController.js` still destructures only `{ report } = await runObserved(...)` — `correlationId` is generated and stored in every execution-log record but is **not** returned to the real HTTP caller, so a user-visible response cannot be traced back to its own execution trace after the fact.

**HIGH (unchanged from the prior audit, still true in the committed code).** `runObserved()` still has no try/catch around `agentOrchestrator.run()` — a request-level failure (invalid symbol, or any exception before `report.agents` exists) produces zero execution-log record.

### Orchestrator

**LOW/clean.** The orchestrator's own scope discipline continues to hold under this phase's changes: `registerAgent`/`unregisterAgent`/`getRegisteredAgents`/`clearRegistry` and all four aggregation functions (`rankByConfidence`, `mergeEvidence`, `detectConflicts`, `computeOverallConfidence`) are confirmed byte-identical to before the scheduler swap, and the orchestrator still never inspects an agent's `summary`/`raw` content (verified by its own still-passing source-grep test). This is the third phase in a row this exact boundary has held under real refactoring pressure — a genuinely strong architectural discipline.

**MEDIUM.** `run(symbol, { agents, timeoutMs, maxRetries })`'s own default parameters are read once from `schedulerConfig.js`'s module-load-time constants — a caller of `run()` that doesn't explicitly pass `timeoutMs`/`maxRetries` always gets the values baked in at process start, never anything that could be live-tuned later (this matters more once/if the uncommitted `updateConfig()` work lands — see the disclosure section).

### Registry

**LOW/clean.** 13 agents registered (3 real: Technical, Options, Sentiment; 10 honest stubs: News, Short Interest, Earnings, Valuation, Fibonacci, Insider, ETF Flow, Institutional, Macro, Analyst Consensus). Every stub's `health()` always reports `"unavailable"` with a real, specific disclosed reason — confirmed directly in `stubAgentFactory.js` — meaning a stub is never dispatched into `execute()` and consumes negligible scheduler time. `registerAllAgents()` is correctly idempotent against the orchestrator's real current state, not a separate stale flag. No findings against the registry itself; the registry's low real-agent count today (3 of 13) means the scheduler's behavior under a full complement of *real, slow* agents has never actually been exercised in this codebase — worth stating plainly: **the "100 agents" question is currently answered from source-code reasoning and unit tests using synthetic delays, not from ever having run 100 real, independently-slow agents through this scheduler.**

### Metrics

*(Full detail in `METRICS_GAP_ANALYSIS.md` from the prior phase — restated only where new.)*

**HIGH.** Two independent metrics systems exist (`agentObservability/metricsCollector.js`'s per-agent execution metrics, and `agentScheduler/schedulerMetrics.js`'s scheduling-mechanics metrics) and **neither is exposed on any HTTP endpoint** in the committed code, and neither computes percentiles — both are simple arithmetic means. Combined with the scheduler metrics' unbounded-array Release Blocker above, "Metrics" as a review area is currently more of a liability (unbounded memory) than an asset (nothing it computes is externally visible).

### Health

**HIGH.** The platform's own pre-existing, general `/health`-style endpoint (`systemHealthRoutes.js` → `systemHealthController.js` → `systemHealthService.js`) has **zero references to the Agent Platform anywhere** — confirmed via grep. An operator or load balancer checking overall system health receives no signal about scheduler saturation, queue depth, concurrency exhaustion, or agent registry state. The Agent Platform is functionally invisible to the one health-check surface this codebase already has.

### Developer endpoints

**MEDIUM.** Two developer-only endpoints exist and work as documented: `GET /v2/agent-orchestrator/:symbol` (runs the real pipeline) and `GET /v2/agent-observability/:symbol` (reads the execution log/timeline/metrics for a symbol). Both are plain JSON, no dashboard — appropriately scoped as infrastructure, not product surface. The gap is coverage, not quality: neither the scheduler's own metrics nor a request-failure view are reachable via any endpoint in the committed code (see Scheduler/Metrics above) — "developer endpoints" today cover half of what an operator would need to actually diagnose a production incident.

### Configuration

**HIGH.** Every scheduler default (`DEFAULT_CONCURRENCY`, `DEFAULT_TIMEOUT_MS`, `DEFAULT_MAX_RETRIES`, backoff delays, aging factor) is a hardcoded JS constant in `schedulerConfig.js` with **zero environment-variable override** in the committed code — confirmed by reading the file directly and cross-checking `backend/config/env.js`, which has zero Agent Platform entries despite already being the established, working pattern this same codebase uses elsewhere (e.g. `AUTONOMOUS_ENGINE_ENABLED`, `AUTONOMOUS_ENGINE_INTERVAL_MINUTES`). Changing the concurrency ceiling for a production deployment — the single most important lever for the "100 agents" question — currently requires a code change and redeploy, not a config change.

### Diagnostics

**RELEASE BLOCKER (as of the committed code).** There is **no diagnostics endpoint of any kind** for the Agent Platform in the committed history — no way to inspect current concurrency utilization, queue depth, scheduler health-cache state, or recent request failures without attaching a debugger to a live process. This is listed as a Release Blocker specifically because it compounds every other finding in this review: without it, an operator cannot even *observe* the unbounded-memory-growth Release Blocker above happening in production before it causes an incident.

### Error handling

**MEDIUM/mostly sound.** Both agent-facing controllers correctly translate a thrown `error.statusCode` (e.g. the orchestrator's own `400` for a missing symbol) into the right HTTP status via a small shared `handleKnownError()` helper, and forward anything else to Express's generic error handler rather than swallowing it — a reasonable, consistent pattern. The one real gap already covered above: a request-level failure before `report.agents` exists is correctly HTTP-error-handled for the caller, but is invisible to the observability layer (no execution-log record, no failure-log at all in the committed code).

### Logging

**HIGH.** A direct grep across every file in `agentScheduler/`, `agentOrchestrator/`, and `agentObservability/` (source and route/controller files) returns **zero occurrences** of `console.log`/`console.error`/`console.warn`/any logger call anywhere. Every timeout, every retry, every cancellation, every agent failure, every scheduler-slot contention event happens completely silently from the perspective of stdout/stderr — meaning any standard production log-aggregation tool (which virtually always works by tailing process stdout/stderr) captures **nothing** about this subsystem's behavior. The only visibility that exists at all is the in-memory, bounded, symbol-scoped developer endpoint — which itself has the retention gap already identified. At 100 agents under real load, an operator would have no log trail to reconstruct what happened during an incident after the fact, only whatever still happens to be in the execution log's last ~50 requests' worth of history.

### Deployment

**MEDIUM (largely inherited from the whole repository's already-known state, restated here because the mission explicitly asks for it).** No Dockerfile, no CI pipeline, no graceful-shutdown handling anywhere in `backend/server.js` (confirmed via grep: no `SIGTERM`/`SIGINT` handlers) — consistent with every prior SRE/build audit in this engagement's history. Specific to the Agent Platform: because 100% of its state (execution log, scheduler metrics, health cache, in-progress jobs) is process-local memory with no persistence and no drain-on-shutdown logic, a rolling deploy or crash silently drops every in-flight agent execution and every byte of the execution log/metrics history with no warning to any caller and no record left behind.

### Resilience

**RELEASE BLOCKER.** Neither `/v2/agent-orchestrator/:symbol` nor `/v2/agent-observability/:symbol` (nor any other backend route, confirmed project-wide in earlier audits — `app.js` has only `cors()` with no options, no auth middleware, no rate limiter dependency in `package.json`) requires authentication or is rate-limited. Because every call to the orchestrator endpoint contends for the **same shared, fixed 20-slot concurrency pool**, an unauthenticated client — accidental (a retry loop with no backoff) or deliberate — can trivially monopolize the entire platform's agent-execution capacity for every other real caller, simply by issuing concurrent requests. The scheduler protects the platform from *its own* agents misbehaving; nothing protects the platform from *callers* misbehaving.

**HIGH.** As covered under Scheduler above, cancellation is not reachable via HTTP, so an abandoned/disconnected client request continues consuming a scheduler slot until its own timeout/retry cycle finishes naturally — a slow-drip resilience gap that compounds under real traffic with real client disconnects (mobile network drops, browser tab closures, upstream gateway timeouts).

### Scalability — including the platform's explicit "20/50/100 agents" question

This is addressed in its own dedicated section below, since it is the mission's explicit, most important question.

---

## Can this platform safely host 20 / 50 / 100 production agents?

The concurrency pool (`DEFAULT_CONCURRENCY = 20`) is **global and shared across every simultaneously in-flight HTTP request**, not per-request and not per-symbol — confirmed directly in `agentScheduler.js` (one process-wide `sharedScheduler`). Because `agentOrchestrator.run()` awaits `Promise.all` over all of its own requested agents before returning a response, **a single request's own response time is governed by how many sequential dispatch rounds its own agent count requires**, given whatever concurrency is actually free at that moment:

$$\text{rounds for one solo request} = \left\lceil \frac{\text{agents requested by that request}}{20} \right\rceil$$

| Registered agents | Rounds needed (solo request, full pool available) | Worst-case latency per round (timeout + 1 retry + backoff) | Worst-case total (illustrative, all rounds hit timeout) |
|---|---|---|---|
| 20 | 1 | up to ~5,000ms (no retry needed) to ~12,000ms (with the 1 default retry + backoff) | ~5–12 seconds |
| 50 | 3 | same per-round bound | ~15–36 seconds |
| 100 | 5 | same per-round bound | ~25–60 seconds |

This table describes a genuine **worst case** (every dispatch round happens to contain a timing-out agent) — realistic latency should be far lower whenever most agents respond well under the 5,000ms default timeout. But the scheduler provides **no upper bound at all** on single-request latency as agent count grows past the concurrency ceiling; it only bounds total platform-wide concurrent execution, which is a different (also necessary, but insufficient alone) guarantee.

- **20 agents: conditionally safe.** Concurrency exactly matches registry size, so a single solo request never needs to internally queue. The platform can safely absorb multiple concurrent requests up to the point where total in-flight agent executions, summed across every simultaneous request, exceeds 20 — beyond that, later requests begin queueing exactly as intended. This is the one agent count at which the current committed scheduler behaves closest to its ideal case.
- **50 agents: not fully safe without further work.** Platform-wide *stability* is still protected (the scheduler will not let 50 agents fire simultaneously and overload the platform or its upstream data providers) — a real, credited improvement over the pre-scheduler state. But *per-request latency* now has a real, unbounded-in-the-worst-case multi-round tail, with no SLA, no monitoring surface for it (metrics not exposed — see Metrics/Diagnostics above), and no way to tune the concurrency ceiling except a code change (see Configuration above).
- **100 agents: not safe without addressing the Release Blockers above first.** Everything true at 50 agents is worse: more rounds, longer worst-case tail latency, and the unbounded scheduler-metrics memory growth compounds faster under the higher execution volume 100 real (non-stub) agents implies. Additionally — and this is the single most important qualifier for this specific number — **today's registry is only 3 real agents and 10 honest, near-instant stubs**; the "100 agents" scenario has never actually been exercised against 100 real, independently-slow agents in this codebase, only reasoned about from the scheduler's own unit tests using synthetic delays. The real-world behavior at 100 genuine agents remains unverified, not just unready.

**The single most important structural caveat, not previously identified in any prior phase of this engagement:** the concurrency pool being "global" is true only **within one process**. There is no shared store (no Redis, no database-backed queue — confirmed: this repository's dependencies contain no such library) behind the scheduler; `sharedScheduler`, `AgentExecutionLog`, and every metric are plain in-memory JavaScript objects scoped to a single Node.js process. The natural infrastructure response to needing more real capacity for 100 agents — horizontally scaling to multiple backend instances behind a load balancer — silently multiplies the effective concurrency ceiling (N instances × 20 = an uncoordinated, un-enforced total) and fragments every piece of observability (a correlation ID minted on instance A is invisible on instance B; each instance's execution log only ever sees the requests it personally handled). **Neither `AGENT_SCHEDULER.md` nor `AGENT_OBSERVABILITY.md` discusses this anywhere** — both documents describe "the" concurrency pool and "the" execution log as if a single instance's view is the whole platform's view, which is only true today because the platform has never been horizontally scaled. This should be treated as a precondition, not an afterthought, for the 100-agent target: either accept a single, non-horizontally-scaled instance as the deployment model (in which case the 20-slot pool is genuinely global, but a single point of failure and a single latency bottleneck), or design a shared coordination layer before scaling out.

**Overall answer:** 20 agents — yes, conditionally, with the Release Blockers in this review still needing attention before any production traffic. 50 and 100 agents — not today; the concurrency mechanism that would need to protect the platform at that scale is real and well-built for *stability*, but the surrounding operational scaffolding (bounded metrics, exposed diagnostics, configurable limits, authentication, logging, and a horizontal-scaling story) is not yet in place, and one genuine memory-growth defect (unbounded scheduler-metrics arrays) needs fixing regardless of agent count before any sustained production uptime.

---

## In-progress, uncommitted work observed (not certified by this review)

The working tree at review time contains substantial uncommitted changes (`PLATFORM_HARDENING.md`, untracked) that — based on a direct reading of the new/changed source and a spot-check run of its own new test files, all of which passed — appear to directly address several findings above:

- Environment-variable-driven scheduler configuration (`AGENT_SCHEDULER_CONCURRENCY` and siblings) — would resolve the Configuration finding.
- A `getConfig()`/`updateConfig()` live configuration object plus a health-result cache — new capability, not yet assessed for production risk of its own.
- Runtime-configurable retention (`setMaxRecords`) for both the execution log and a new, separate request-failure log — would materially improve the Observability retention finding, though retention remains count-based, not time-based.
- End-to-end correlation ID propagation, including honoring an inbound `X-Correlation-Id` header and echoing it on every response — would resolve the "correlationId never reaches the caller" High finding.
- A new `GET /v2/agent-diagnostics` endpoint consolidating scheduler config/metrics, health-cache stats, and observability log sizes into one JSON snapshot — would resolve the Diagnostics Release Blocker, **but was itself confirmed to have no authentication either**, which would need to be addressed before this endpoint reaches production, since it exposes internal process memory and configuration.

None of this is certified, committed, or verified beyond a spot-check in this review. It should be independently re-reviewed once committed, exactly as this engagement has always treated in-progress work — real, credited only once it lands and is independently re-verified, never assumed complete from a working-tree snapshot or its own self-description.
