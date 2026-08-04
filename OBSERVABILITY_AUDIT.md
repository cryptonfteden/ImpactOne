# Observability Audit

**Phase:** OBSERVABILITY-AUDIT-001
**Subject:** `backend/services/agentObservability/` (`correlationModel.js`, `timingUtils.js`, `failureTaxonomy.js`, `agentExecutionLog.js`, `metricsCollector.js`, `executionTimeline.js`, `observableOrchestrator.js`), as committed (`5ef552a`, "feat(backend): build the Agent Observability layer"). Every finding below is grounded in the actual current source, read in full — not inferred from `AGENT_OBSERVABILITY.md`'s own (genuinely careful and honest) description of itself. No code was written or modified to produce this audit.

**What this layer gets right, stated first:** the additive discipline is real and independently verifiable, not just asserted — the orchestrator itself is untouched (confirmed directly: no observability import anywhere in `agentOrchestrator.js`), the response shape to real callers is unchanged, and every honestly-optional field (`cacheHit`, `dataSourcesUsed`) is `null` rather than fabricated when an agent doesn't report it, with the metrics layer correctly excluding un-reported records from `cacheHitRate` rather than treating `null` as `false`. This is a genuinely careful piece of infrastructure. The findings below are about what changes before 100+ agents, not about defects in what exists today at 13.

---

## Data model

The execution record shape (`executionId`, `correlationId`, `agentId`, `symbol`, `startedAtMs`/`endedAtMs`/`durationMs`, `success`/`timeout`/`retryCount`, `healthStatus`, `confidence`, `cacheHit`, `dataSourcesUsed`, `failureCode`, `error`) is flat, generic, and genuinely free of business-logic fields — confirmed directly against every file in the layer.

**Gap — Medium.** There is no version tag on the record shape itself, unlike the platform's own already-established `EVENT_ENVELOPE_VERSION` convention on the Intelligence Bus. `AgentExecutionLog`'s own header comment states a future phase may persist this shape "without changing the shape callers depend on" — but nothing enforces or even records that assumption. The first time this record shape needs to change (a new field, a renamed one), there will be no way for a consumer — or a future persisted store's migration — to distinguish an old-shape record from a new one.
- **Impact:** A future schema change becomes a silent breaking change to any consumer that assumed the current shape, rather than a versioned, detectable evolution.
- **Likelihood:** Certain to matter the first time the shape needs to change; zero impact today.
- **Recommended fix:** Add a `schemaVersion` field to every record now, before any consumer (the metrics collector, the timeline builder, a future persisted store) comes to depend on an unversioned shape.

## Memory usage

**Finding — Critical, and the most consequential in this audit.** `AgentExecutionLog`'s default capacity is a fixed **5,000 records**, evicted oldest-first once exceeded — confirmed directly in source. One orchestrator run appends **one record per registered agent**. At today's 13 agents, 5,000 records ≈ 384 requests' worth of history. At the explicitly stated 100+ agent target, the identical 5,000-record cap shrinks to **~50 requests' worth of history** — an 8x reduction in effective retention, triggered purely by agent count growing, with no code change and no warning. The one thing this layer exists to provide — enough execution history to actually debug a production issue — degrades sharply and silently at precisely the scale event that motivates building it in the first place.

- **Severity:** Critical
- **Impact:** At 100+ agents under any meaningful request volume, the log could hold only minutes of history — the observability layer would frequently have already evicted the exact record an operator needs by the time they go looking for it.
- **Likelihood:** Certain, not probabilistic — this is arithmetic, not a chance occurrence, and it activates exactly when the registry reaches the scale this whole initiative was built for.
- **Recommended fix:** The retention bound should scale with (or be explicitly re-derived from) the number of registered agents, not be a flat constant — e.g., a target *time* window (retain the last N minutes) rather than a target *record count*, or a per-symbol/per-agent cap layered on top of a much larger global cap. `AGENT_OBSERVABILITY.md`'s own "Remaining work" section already names `maxRecords` configurability as a follow-up; this audit elevates it from a minor housekeeping item to the single most urgent fix before the registry grows.

**Secondary finding — Medium.** Eviction (`records.shift()` plus a linear `indexOf()`/`splice()` scan within each affected symbol/correlation bucket) is O(n) per eviction, not O(1) — confirmed directly in source. At a fixed 5,000-record cap this is a small, bounded cost today; if the cap above is *not* fixed and is instead raised significantly to compensate for agent-count growth, eviction cost grows with it and deserves re-measurement, not an assumption that it will remain negligible.

## Log retention

**Finding — High.** Retention is a single, global FIFO across every symbol combined — confirmed directly: there is no per-symbol or per-agent floor, only one shared array capacity. A burst of traffic on a handful of popular symbols can evict **all** history for less-popular or rare symbols almost immediately, even if that rare symbol's history is exactly what an operator most wants to inspect (an edge case, an unusual failure). Retention today favors recency-across-the-whole-system over completeness-per-symbol, with no way to protect a specific symbol's or failure's history from being pushed out by unrelated traffic.

- **Severity:** High
- **Impact:** The symbols and failures most worth investigating (rare, unusual) are the ones least protected by a purely global FIFO — the opposite of what a debugging tool should prioritize.
- **Likelihood:** Rises directly with agent count and with any traffic skew toward popular symbols (both realistic at 100+ agents in real production use).
- **Recommended fix:** Consider a retention policy with at least two tiers — a smaller per-symbol guaranteed floor (e.g., always keep the last N records for any symbol that has ever been queried) alongside the global cap, or explicit sampling that always retains 100% of failures/timeouts regardless of global pressure (see Sampling below).

## Metrics quality

See [METRICS_GAP_ANALYSIS.md](METRICS_GAP_ANALYSIS.md) for the full treatment. In summary: every current metric (`avgDurationMs`, `avgRetryCount`, `avgConfidence`, `successRate`, `cacheHitRate`) is a simple arithmetic mean or ratio — genuinely correct for what it computes, but a mean hides tail behavior entirely. A single chronically-slow agent among 100 (the exact scenario this audit's companion Orchestrator Stress Audit already identified as a real risk) would be substantially masked by an average duration computed across 99 fast agents.

- **Severity:** High
- **Impact:** An operator watching `avgDurationMs` could see a healthy-looking number while a real, user-facing tail-latency problem (a specific agent or a specific symbol consistently slow) goes completely invisible in the aggregate.
- **Likelihood:** Certain to matter at 100 agents, where tail behavior from any single agent is exactly the kind of problem averages are known to hide.
- **Recommended fix:** Add percentile computation (p50/p95/p99) for duration at minimum, and consider it for confidence and retry count. This is also the single most direct precondition for genuine Prometheus compatibility (see below), where histograms are the standard idiom for exactly this problem.

## Timeline correctness

**Finding, honestly disclosed and independently confirmed accurate.** Within one orchestrator run, every agent shares the identical `startedAtMs` (the run's own start time, captured once) — confirmed directly in `observableOrchestrator.js` (`const startedAtMs = runStartMs`). This means `buildTimeline`'s per-event `offsetMs` is always `0` for every agent within a single run's timeline — the timeline cannot show real relative stagger between agents that were genuinely dispatched together via `Promise.all`. This is disclosed honestly in `AGENT_OBSERVABILITY.md` rather than presented as more precise than it is, and it is an accurate reflection of how the orchestrator itself actually dispatches agents (simultaneously, not staggered) — **not a bug**, but a real precision limit worth restating plainly: **a single run's timeline currently shows *what* ran and *for how long*, not genuine *relative start order* within that run**, because there genuinely isn't one to show yet.

Across multiple runs (different `correlationId`s for the same symbol over time), timeline ordering is genuinely correct, since each run's own `runStartMs` is a real, distinct timestamp.

- **Severity:** Medium
- **Impact:** Anyone reading a single run's timeline expecting to see "agent A started slightly before agent B" will not — every agent will appear to start at the same instant, accurately reflecting reality but potentially reading as a bug to someone unfamiliar with the disclosed limitation.
- **Likelihood:** Will be noticed the first time someone inspects a single run's timeline closely.
- **Recommended fix:** No code change required necessarily — but the developer-facing endpoint's response (or its accompanying documentation) should make this limitation visible in the payload itself (e.g., a `perAgentTimingPrecision: "run-level"` flag on the timeline object), not only in a markdown file a future engineer may not read.

## Correlation IDs

**Finding — High, and the most concrete, verifiable gap in this whole audit.** `correlationId` and `executionId` are well-designed as two clearly distinct concepts (confirmed via `correlationModel.js`) and correctly attached to every execution record. **However**, tracing the actual call path (`agentOrchestratorController.js` → `runObserved()`): the controller destructures only `{ report }` from `runObserved()`'s return value and sends `report` alone to the client — confirmed directly in source. **The `correlationId` is generated, stored in every log record, and then immediately discarded at the one place a real caller could have received it.**

- **Severity:** High
- **Impact:** A user or frontend developer looking at a specific, real API response has no way to reference "this exact request" when later querying the observability endpoint for its execution trace — they can only search by symbol, which is ambiguous the moment more than one request for that symbol happens within the log's retention window (a near-certainty at any real traffic volume). This defeats one of a correlation ID's two primary purposes (the other being internal log-linking, which does work correctly) — external referenceability.
- **Likelihood:** Certain to be needed the first time a real debugging session tries to trace a specific user-reported slow or wrong response back to its execution trace.
- **Recommended fix:** Return `correlationId` alongside `report` in the actual HTTP response (e.g., as a response header like `X-Correlation-Id`, or as a field in the JSON body) — a small, low-risk addition that makes the ID actually usable for its intended purpose.

## Failure taxonomy

**Finding — Medium, and a disclosed, reasonable boundary rather than a hidden gap.** The five-code closed taxonomy (`NONE`/`AGENT_UNAVAILABLE`/`TIMEOUT`/`AGENT_ERROR`/`UNKNOWN`) is a clean, correct classification of the orchestrator's own opaque `status` field — confirmed directly, and appropriately scoped to never touch agent business content. Its one real limitation: `AGENT_ERROR` collapses every non-timeout, non-unavailable failure into one bucket, regardless of underlying cause — a malformed result, a thrown network error, and an actual bug in an agent's own analysis code are all indistinguishable in this taxonomy. This is a direct, correct consequence of the orchestrator itself only exposing a raw error-message string (confirmed in the prior Orchestrator Stress Audit), not a gap this layer introduced or could unilaterally fix.

- **Severity:** Medium
- **Impact:** At 100 agents, "10 agents all failed for the same underlying reason" and "1 agent has a one-off bug" look identical in aggregate metrics — a real diagnostic limitation once failure volume is high enough that pattern-spotting matters.
- **Likelihood:** Will matter increasingly as agent count and failure volume grow; low impact at today's scale.
- **Recommended fix:** A future phase, out of this layer's own scope, would need the Agent interface itself to expose a structured error classification (an error *code*, not just a message string) for this taxonomy to meaningfully subdivide `AGENT_ERROR` — worth tracking as a joint follow-up with the orchestrator itself, not something this layer can resolve alone.

## Observability completeness

**Finding — High.** `runObserved()` calls `agentOrchestrator.run()` directly and lets any synchronous validation error (e.g., a missing/invalid symbol, which `run()` throws for immediately) propagate up through `runObserved()` unrecorded — confirmed directly in source: there is no try/catch around the `agentOrchestrator.run()` call inside `runObserved()`. This means **request-level failures (invalid input, an unexpected orchestrator-level exception) are entirely invisible to this observability layer** — only agent-level outcomes *within* a successfully-started run are ever recorded. A spike in malformed requests, or any future orchestrator-level exception, would leave zero trace in `AgentExecutionLog`.

- **Severity:** High
- **Impact:** The observability layer's blind spot is precisely the class of failure most likely to indicate a client-side integration bug or an orchestrator-level regression — exactly the kind of failure worth being able to see in aggregate.
- **Likelihood:** Currently low (input validation failures should be rare from a well-behaved frontend); rises with any new consumer of this endpoint, and is a real gap regardless of current probability.
- **Recommended fix:** Wrap the `agentOrchestrator.run()` call in `runObserved()` with its own try/catch, recording a request-level failure event (a new, small record shape or a dedicated counter) before re-throwing — so a spike in request-level failures is visible in the same place agent-level failures already are.

## Sampling

**Finding — High, and a direct architectural tension with the Memory usage finding above.** There is no sampling of any kind — confirmed directly: every single agent execution from every single request is unconditionally appended to the log. Combined with the fixed 5,000-record cap, 100% capture at 100+ agent scale means the buffer fills (and evicts) very quickly, diluting the rare, interesting events (failures, timeouts, anomalies) among a much larger volume of routine successful executions that are individually far less valuable to retain.

- **Severity:** High
- **Impact:** Without differential retention, a burst of routine successful traffic can evict the failure record an operator most needs, simply because it wasn't recent enough relative to the volume of uninteresting-but-more-recent successes.
- **Likelihood:** Certain to matter at 100+ agents under real traffic; the current design has no lever to prevent it.
- **Recommended fix:** Retain 100% of non-success records (timeouts, errors, unavailable) regardless of any sampling applied to successes; apply statistical sampling (e.g., retain 1-in-N, or time-bucketed sampling) only to `success: true` records once volume genuinely requires it. This directly compounds with the Memory usage fix — a smarter retention policy and differential sampling should be designed together, not as two separate patches.

## Future Prometheus compatibility

**Finding — Medium, forward-looking, correctly out of this phase's stated scope.** The current metrics model (on-demand aggregation over whatever remains in the bounded, evicting in-memory log) is structurally different from Prometheus's expectation: monotonically-increasing counters and gauges that persist for the process's lifetime, scraped at the *monitoring system's* own interval, not computed fresh over a shrinking window at query time. A future `/metrics` endpoint would need real counters (total executions, total failures by taxonomy code, labeled by `agentId`) that are never evicted, alongside (not instead of) the current bounded execution log for detailed trace inspection.

- **Impact if unaddressed:** No path to real alerting/dashboarding without a parallel metrics system, since the current design's only metrics source is explicitly bounded and lossy by design.
- **Likelihood/timeline:** Zero urgency today (explicitly out of this phase's scope); a real, non-trivial adaptation layer whenever monitoring integration is actually pursued.
- **Recommended approach:** See [OBSERVABILITY_EVOLUTION.md](OBSERVABILITY_EVOLUTION.md).

## Future OpenTelemetry compatibility

**Finding — Future, and the most encouraging forward-looking item in this audit.** The `correlationId`/`executionId` pair maps cleanly onto OpenTelemetry's `traceId`/`spanId` concept (one run = one trace, one agent execution = one child span) — a genuinely well-aligned conceptual model, likely more by sound design instinct than deliberate OTel targeting. The gaps are mechanical, not structural: current IDs are custom-prefixed UUID strings rather than OTel's specific binary-then-hex trace/span ID formats, and there is no explicit parent-span linkage recorded (each execution record only carries a shared `correlationId`, not a formal `parentSpanId` pointing back to a synthetic "run" span).

- **Impact if unaddressed:** No automatic interoperability with existing OTel tooling without a translation layer; but the underlying data already contains everything an OTel exporter would need.
- **Likelihood/timeline:** Zero urgency today; a comparatively small adaptation whenever OTel integration is pursued, smaller than the Prometheus adaptation above.
- **Recommended approach:** See [OBSERVABILITY_EVOLUTION.md](OBSERVABILITY_EVOLUTION.md).

---

## What must change before 100+ agents (summary)

Ranked by how directly each finding above is triggered by agent count growth specifically, not just general scale:

1. **Memory usage / retention cap (Critical)** — the fixed 5,000-record bound divides directly by agent count; this is arithmetic, not a probability, and is the one item that cannot wait.
2. **Sampling (High)** — without it, the retention fix above is only a partial answer; the two should be designed together.
3. **Correlation ID exposure (High)** — cheap to fix, and becomes actually necessary the first time a real production issue needs tracing back from a user-visible response.
4. **Observability completeness / request-level failures (High)** — a real, current blind spot, independent of agent count, but more consequential the more request volume the endpoint sees.
5. **Metrics quality / percentiles (High)** — averages become more misleading, not less, as the number of agents (and thus the variance across them) grows.
6. **Log retention fairness (High)** — directly a function of traffic concentration across more possible symbols/agents.

Everything else in this document (data model versioning, failure taxonomy granularity, Prometheus/OTel adaptation) is real and worth planning for, but does not specifically worsen as a direct function of agent count the way the six items above do.

See [ORCHESTRATOR_RISK_REGISTER.md](ORCHESTRATOR_RISK_REGISTER.md) (from the companion Orchestrator Stress Audit) for the orchestrator-side risks this observability layer will eventually need to help surface, and [OBSERVABILITY_EVOLUTION.md](OBSERVABILITY_EVOLUTION.md) for the concrete path forward.
