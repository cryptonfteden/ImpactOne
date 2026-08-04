# Agent Orchestrator — Stress Audit

**Phase:** AGENT-ORCHESTRATOR-STRESS-AUDIT-001
**Subject:** `backend/services/agentOrchestrator/agentOrchestrator.js` (+ `agentInterface.js`, `registry.js`, `agentOrchestratorController.js`/`agentOrchestratorRoutes.js`), as actually committed (`72a6129`, "feat(backend): build the Agent Orchestrator"). Every finding below is grounded in the real, current source — read in full, not inferred from `AGENT_ORCHESTRATOR.md`'s own description of itself — and assumes the stated future load of 100+ independent agents. No code was written or modified to produce this audit.

**Method:** adversarial. The question asked of every line was "what real input, timing, or concurrency condition makes this behave incorrectly, unsafely, or unacceptably slowly — today, or once 100 agents are registered instead of 13?" Where a concern only materializes at a scale or a future architectural stage this implementation hasn't reached yet, that is stated explicitly rather than presented as a live defect.

**What this implementation gets right, stated first so the findings below are read in proportion:** partial-failure handling is genuinely excellent (`run()` provably never throws because one agent failed — confirmed directly in source, not just asserted in a comment), the health-before-execute gate is real and tested, retries and timeouts exist and are tested, and the "never inspect an agent's own analysis" boundary is enforced by a test that actually greps the orchestrator's own source. This is a well-built first version of exactly what it claims to be. The findings below are about what happens when its current, honest scope (a single in-process, unbounded-fan-out, 13-agent registry) meets the stated future target of 100+ agents — not about defects in what it already does.

---

## Race conditions

**Finding:** Node's single-threaded event loop means no classic data-race exists on the in-memory `registry` `Map` today — every synchronous mutation (`registerAgent`/`unregisterAgent`/`clearRegistry`) completes atomically between any two async operations. **Not a live defect.**

**Real, adjacent risk found:** `run()` captures `agents = getRegisteredAgents()` once, at call time. If a long-running `run()` is in flight while another part of the process calls `unregisterAgent()`, the in-flight run is unaffected (correct, and arguably desirable) — but this also means there is no guarantee that two concurrent `run()` calls for the same symbol, started microseconds apart, see the same registry snapshot if a registration change happens to land between them. At 13 agents, registrations only happen once at process start, so this is currently inert.

- **Severity:** Low
- **Impact:** Inconsistent agent sets between two near-simultaneous runs for the same symbol — a correctness/consistency concern, not a crash.
- **Likelihood:** Low today (registration is a one-time, startup-only event); would rise only if agent registration ever becomes dynamic at runtime (hot-reloading an agent without a process restart) — **theoretical at current scope.**
- **Recommended fix:** If dynamic registration is ever added, snapshot the registry with an explicit version/generation number and record it on the resulting report, so two runs can be compared against the exact agent set each one actually used.

## Deadlocks

**Finding:** No lock, mutex, semaphore, or blocking-wait primitive exists anywhere in this file — every operation is `Promise`-based. Classic deadlock (two operations each waiting on a resource the other holds) is **structurally impossible** in the current design, because there is nothing to hold or wait on. **Confirmed not applicable, not theoretical — genuinely ruled out by the absence of any synchronization primitive.**

- **Severity:** N/A
- **Impact:** N/A
- **Likelihood:** N/A
- **Recommended fix:** None needed today. If a future concurrency-limiting worker pool (see Backpressure below) is added using a semaphore-style primitive, that specific addition should be re-audited for deadlock potential at that time — the absence of risk today is a property of the current design, not a permanent guarantee.

## Retry storms

**Finding — real, not theoretical.** `runOneAgent`'s retry loop (`while (attempts <= maxRetries)`) retries a failed or timed-out agent **immediately, with zero backoff delay and zero jitter**, confirmed directly in source — there is no `setTimeout`/backoff between attempts at all. At today's scale (1 default retry, 3 real agents), this is invisible. At 100 agents, if a shared downstream dependency (a data provider, a database, an internal service several agents all wrap) becomes slow or briefly unavailable, every agent wrapping it will time out at approximately the same moment (since they all share the same default `timeoutMs`) and **immediately retry in the same instant**, compounding load on the exact dependency that just failed — a textbook retry storm, made structurally likely (not just possible) by the fact that all agents currently share one global `timeoutMs`/`maxRetries` default and run in lockstep parallel.

- **Severity:** High
- **Impact:** A single struggling downstream dependency could be pushed from "briefly degraded" to "fully down" by the orchestrator's own synchronized retry behavior, affecting every agent depending on it, not just the one that first noticed.
- **Likelihood:** Low today (3 real agents, unlikely to share a single point of failure); **High at 100 agents**, where multiple agents plausibly wrap the same handful of underlying data providers.
- **Recommended fix:** Add jittered exponential backoff between retry attempts (even a small random delay, e.g. 100–500ms, breaks the synchronized-retry pattern). Consider a shared, cross-agent circuit breaker per downstream dependency (not per agent) so 20 agents wrapping the same failing provider fail fast together after the first few, rather than each independently exhausting its own retry budget against it.

## Priority starvation

**Finding:** `metadata.priority` is used only for (a) a tie-break in `rankByConfidence` and (b) a weight in `computeOverallConfidence` — it has **zero effect on execution**, since `run()` invokes every requested agent via unconditional `Promise.all`. This means, correctly: **no agent can currently starve another**, because there is no scheduling contention for priority to resolve in the first place — every agent runs, every time. **Confirmed not a live defect.**

**The real, adjacent finding:** this is only true because there is no concurrency ceiling at all (see Backpressure). The moment a future concurrency-limiting worker pool is added — which the stated 100-agent target will require — `priority` will need to actually govern queue admission order, and nothing in the current interface or implementation does that yet; `priority` today is pure metadata with no scheduling teeth.

- **Severity:** Medium (forward-looking)
- **Impact:** If a bounded worker pool is added later without also wiring `priority` into its admission order, low-priority agents could genuinely starve under load — the exact failure mode the metadata field's name implies it already prevents, but does not yet.
- **Likelihood:** Certain to become relevant the moment backpressure controls are added; **not yet possible today.**
- **Recommended fix:** When a concurrency ceiling is introduced, admission into the worker pool must be priority-ordered, with a fairness mechanism (e.g., aging — a long-waiting low-priority agent's effective priority increases over time) so `Low` agents are eventually guaranteed to run, not merely deprioritized indefinitely.

## Circular dependencies

**Finding:** No agent in this implementation can depend on another agent's output — every agent's `execute(symbol)` receives only the raw symbol string, confirmed directly in `agentInterface.js`'s contract and every registered agent's signature. There is no dependency graph, so a cycle cannot exist. **Confirmed not applicable, not theoretical, at the current interface version.**

- **Severity:** N/A today
- **Impact:** N/A today
- **Likelihood:** N/A today — genuinely ruled out, not just unlikely.
- **Recommended fix:** None needed now. This is flagged only because `AGENT_PLATFORM_ARCHITECTURE.md` (the long-term design this implementation is a first step toward) explicitly proposes a `dependencies` field on a future agent manifest — if and when that's added, cycle detection at registration time (reject a manifest that would create a circular dependency, the same way `registerAgent` already rejects a duplicate id) must be added at the same time, not treated as a later hardening pass.

## Memory leaks

**Finding — real, not theoretical, though currently low-impact.** `withTimeout` races the agent's `execute()` promise against a timer, but **never cancels or aborts the losing side** — confirmed directly in source: there is no `AbortController`, no cancellation token, nothing passed into `agent.execute(symbol)` that would let it know the orchestrator has stopped waiting. When an agent times out, `withTimeout` stops the *orchestrator* from waiting on it, but the agent's own real work (a pending fetch, a database query, a computation) continues running in the background, unobserved, until it eventually resolves or rejects into the void.

- **Severity:** Medium
- **Impact:** Each timed-out agent leaves one orphaned, still-running operation behind. At 3 real agents with rare timeouts, this is negligible. At 100 agents under real-world provider flakiness, a meaningful fraction of runs could leave multiple orphaned operations per request, each still consuming a network socket, a DB connection, or CPU — a slow, cumulative resource pressure that would not show up as a crash, only as gradually degrading throughput and eventually connection-pool exhaustion.
- **Likelihood:** Low today; **Medium-to-High at 100-agent scale** under any sustained provider instability.
- **Recommended fix:** Thread a real cancellation signal (`AbortController`/`AbortSignal`) into the `Agent` interface's `execute(symbol, { signal })`, and require every agent implementation to pass it into its own underlying fetch/query calls so a timeout actually stops the work, not just the orchestrator's wait on it.

## Thread safety

**Finding:** Genuinely safe today — Node's single-threaded execution model means there is no multi-thread access to the `registry` Map or any other shared state in this file. **Not a live defect.**

**Forward-looking finding:** the entire registry is a single, in-process `Map`. The moment this orchestrator is run across multiple worker processes or machines (the explicit end-state target of this whole initiative), each process will have its **own, independent, unsynchronized registry** — an agent registered in process A is invisible to process B. This is not a thread-safety bug in the classic sense; it is a structural mismatch between an in-memory registry and any multi-process deployment.

- **Severity:** High (forward-looking; not applicable to the current single-process deployment)
- **Impact:** Inconsistent agent availability depending on which worker process happens to handle a given request — two users hitting two different processes for the same symbol could get materially different reports (different agents represented) with no visible explanation.
- **Likelihood:** Certain, the moment a second process is introduced; zero today.
- **Recommended fix:** Move the registry's source of truth to the database (or a shared cache) before any horizontal scaling is attempted — exactly the sequencing already prescribed in `AGENT_SCALABILITY.md`. This should be treated as a hard prerequisite for running more than one process, not an optimization to consider afterward.

## Timeout cascades

**Finding:** Not a cascade in the classic multiplicative sense — every agent's timeout is independent and they all run in parallel, so one agent's retry cycle does not add to another's latency. **However**, the overall `run()` call's wall-clock latency is bounded by whichever single agent takes the longest, including its own retries — with current defaults, a single consistently-timing-out agent adds up to `timeoutMs × (maxRetries + 1)` = 10 seconds to *every* call to this endpoint, for *every* symbol, regardless of how fast the other 99 agents are.

- **Severity:** Medium
- **Impact:** A single misbehaving agent among 100 can single-handedly set the effective response time floor for the entire endpoint, for every request, silently — nothing in the current design detects or reports "this specific agent is the reason every response takes 10 seconds" as a distinct, actionable signal beyond its own per-agent `tookMs`.
- **Likelihood:** Low today (few agents, low chance of sustained timeout); rises directly with agent count and with any shared unreliable dependency.
- **Recommended fix:** Track a rolling per-agent timeout rate (extending the existing health-check concept) and automatically exclude a chronically-timing-out agent from future runs (the circuit-breaker pattern already proposed in `AGENT_PLATFORM_ARCHITECTURE.md`), rather than letting every request pay its full retry cost indefinitely.

## Partial failures

**Finding: genuinely well-handled, confirmed by direct source reading and a passing test suite, not just claimed.** `runOneAgent` never throws under any agent misbehavior (malformed result, thrown error, timeout); `run()`'s own `summary: { total, fulfilled, unavailable, failed }` explicitly and honestly discloses partial-failure state to the caller. **This is a strength, not a finding requiring a fix.**

- **Severity:** N/A (positive finding)
- **Impact:** N/A
- **Likelihood:** N/A
- **Recommended fix:** None. Worth explicitly preserving this discipline as the registry grows — any future addition (e.g., a shared circuit breaker) must not compromise the "one agent's failure never blocks the response" guarantee this version already has.

## Duplicate execution

**Finding — real, verifiable, not addressed anywhere in the current implementation.** Nothing in `run()` de-duplicates concurrent in-flight requests for the *same symbol*. Two (or two hundred) simultaneous HTTP calls to `GET /v2/agent-orchestrator/NVDA` each independently trigger a full, fresh execution of every registered agent — confirmed directly: `run()` has no request-coalescing, no in-flight-tracking map, nothing resembling the frontend's own already-proven `requestCache.js`/`withRequestCache` pattern.

- **Severity:** Medium-High
- **Impact:** For a popular symbol during a burst of real user traffic (e.g., a stock in the news, many users opening the same symbol within the same second), every one of those requests independently re-triggers the full agent set — at 100 agents, that's 100× the real downstream load per redundant concurrent request, for identical output.
- **Likelihood:** Low today at expected beta traffic; **Medium-to-High** once this becomes the canonical Stock Intelligence path for real user-facing traffic on popular symbols.
- **Recommended fix:** Add in-flight request coalescing keyed by `symbol` (and the requested agent subset, if ever parameterized) — the same conceptual pattern the frontend's `requestCache.js` already implements, applied server-side: a second concurrent request for a symbol already being computed should receive the same in-flight promise rather than triggering a second full run.

## Event ordering

**Finding: not applicable to the current implementation.** This orchestrator does not publish to the Intelligence Bus or any other event stream — confirmed by the absence of any Bus import anywhere in the file. It is a synchronous request/response engine today, not an event-emitting one. **Genuinely theoretical, correctly out of scope for this phase.**

- **Severity:** N/A today
- **Impact:** N/A today
- **Likelihood:** N/A today
- **Recommended fix:** None needed now. When (per `AGENT_ORCHESTRATOR.md`'s own stated next step) this becomes the canonical path and agent outputs begin flowing onto the Bus as events, ordering guarantees (does a later, corrected report for the same symbol supersede an earlier one cleanly, matching the Bus's existing supersession lifecycle) must be designed at that time, using the Bus's already-proven lifecycle/supersession mechanism rather than inventing a parallel one.

## Idempotency

**Finding:** `run()` is naturally idempotent today — it performs no persistent writes of its own (confirmed: no Prisma/database call anywhere in this file), so calling it twice for the same symbol simply computes twice, independently, with no side effect beyond the response itself. **Not a live defect.**

- **Severity:** N/A today
- **Impact:** N/A today
- **Likelihood:** N/A today
- **Recommended fix:** None needed now. The moment a future phase adds persistent output (a `DecisionTrace`-equivalent record, a Bus publish) for each run, idempotency at the *write* level (does re-running for the same symbol within a short window create a meaningful duplicate record, or correctly recognize and skip/update it) becomes a real design question that does not exist yet and should be addressed explicitly when that write path is added — not assumed to be automatically safe just because the current read-only version is.

## Registry corruption

**Finding: low risk today, but a directly relevant precedent already exists and was caught.** `AGENT_ORCHESTRATOR.md`'s own documentation discloses that an earlier draft used a module-level `let registered = false` flag for `registerAllAgents()`'s idempotency, which would have silently gone stale after a test called `clearRegistry()` — a real, caught-before-commit instance of exactly the class of bug this category asks about (a piece of state describing the registry becoming inconsistent with the registry's actual contents). This was fixed by checking live registry state instead of a separate flag. **Credited as a real, already-resolved risk, not a currently-open one** — but its existence is itself evidence that this class of bug is realistic for this codebase, not a hypothetical concern invented for this audit.

- **Severity:** Low (currently; already mitigated once, worth remaining vigilant about)
- **Impact:** A stale "is this registered" flag disagreeing with the registry's real contents could cause a legitimate re-registration to be silently skipped, or a duplicate-registration guard to be bypassed.
- **Likelihood:** Low, given the fix already applied — but the same category of bug (a derived flag drifting from the source of truth it describes) could recur in any future addition that adds its own tracking state alongside the registry rather than deriving from it directly.
- **Recommended fix:** As a standing practice for this file going forward: any new piece of state describing the registry (health caches, priority overrides, anything) should be a pure derivation from `registry`'s actual contents at read time, never a separately-maintained flag or cache that could silently diverge — exactly the lesson the already-fixed bug demonstrates.

## Health degradation

**Finding — real, not theoretical, but a performance concern rather than a correctness one.** `safeHealth(agent)` is called fresh, for every agent, on every single `run()` invocation — confirmed in source: no caching or memoization of health results exists anywhere. At 100 agents, every stock-symbol request triggers 100 fresh health checks, even for agents whose health realistically changes on the order of minutes, not per-request.

- **Severity:** Medium
- **Impact:** If any agent's `health()` implementation performs real I/O (a network call, a DB query) rather than an in-memory check, 100 health checks per request adds meaningful, likely unnecessary latency and load to every single request, scaling directly with agent count.
- **Likelihood:** Currently low impact (3 real agents; health-check cost unknown but likely small); **will scale directly and predictably with agent count** as the registry grows toward 100.
- **Recommended fix:** Cache each agent's health result for a short, explicit TTL (seconds, not minutes — health should still be reasonably fresh) using the same structured, parameter-derived cache-key discipline already recommended in `AGENT_PLATFORM_ARCHITECTURE.md`'s caching section, rather than re-checking on every single request.

## Backpressure

**Finding — the single most consequential finding in this audit, real and directly verifiable.** `run()` invokes **every requested agent simultaneously via unconditional `Promise.all`, with no concurrency ceiling of any kind** — confirmed directly in source: there is no worker pool, no semaphore, no batching, nothing bounding how many agents execute at once. At 13 agents (3 real, 10 instantly-resolving stubs), this is invisible. At 100 agents — the explicitly stated target load for this audit — a single incoming request would trigger up to 100 simultaneous `execute()` calls (after up to 100 simultaneous `health()` calls), with no limit on how much concurrent load that places on the database, on shared downstream providers, or on the process's own event loop and memory.

- **Severity:** Critical
- **Impact:** At 100 agents, a burst of even a handful of concurrent user requests could trigger hundreds to thousands of simultaneous outbound operations with no throttle — the single most likely cause of a real production incident in this design once agent count grows, more likely than any other finding in this document.
- **Likelihood:** Currently zero impact (13 agents, mostly stubs); **near-certain to become a real problem well before reaching 100 agents** if concurrency limiting is not added first.
- **Recommended fix:** This is the one finding in this audit that should not wait for a "later hardening pass" — introduce a bounded worker pool (a configurable maximum concurrent agent executions per run, and ideally a global ceiling across concurrent requests) before the registry grows meaningfully past its current size, exactly as already prescribed in `AGENT_PLATFORM_ARCHITECTURE.md`'s Parallel execution section. Concurrency limiting is not a scalability nicety here — it is the precondition for this design surviving contact with its own stated target load.

## Cache coherence

**Finding:** The orchestrator itself has no cache layer of its own (confirmed: no cache-related import or logic anywhere in this file), so it cannot itself suffer cache incoherence. **The real risk is inherited, not introduced here.** This engagement's own history has already found and documented multiple independent, process-local, in-memory TTL caches inside other backend services (data-provider caches, several years earlier in this platform's history) — if any of the three currently-real wrapped agents (`technicalIntelligenceService`, `optionsAgentService`, `marketSentimentService`) maintain their own such cache internally, the orchestrator has no visibility into or control over its freshness, and would silently surface stale data without any way to detect it.

- **Severity:** Medium (inherited risk, not introduced by this phase)
- **Impact:** Two runs for the same symbol, moments apart, could receive different underlying data through a wrapped agent's own cache expiring mid-window — a real but bounded (TTL-limited) inconsistency, not an unbounded one.
- **Likelihood:** Unknown without directly auditing each of the three wrapped services' own caching (out of scope for this audit, which focused on the orchestrator itself) — **flagged as an open question, not a confirmed defect**, pending that follow-up.
- **Recommended fix:** Audit each currently-real wrapped agent's own service for internal caching, and once this orchestrator moves to multiple processes (see Thread safety), any surviving process-local cache inside a wrapped service becomes a genuine cross-process coherence problem — the same caching should be centralized (e.g., in the shared, structured Agent Cache already proposed in `AGENT_PLATFORM_ARCHITECTURE.md`) rather than left scattered across each wrapped service's own implementation.

---

See [ORCHESTRATOR_RISK_REGISTER.md](ORCHESTRATOR_RISK_REGISTER.md) for a single, ranked summary of every finding above, and [SCALING_FAILURE_SCENARIOS.md](SCALING_FAILURE_SCENARIOS.md) for concrete, narrative failure scenarios at 100+ agents.
