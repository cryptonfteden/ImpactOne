# Observability Evolution

**Phase:** OBSERVABILITY-AUDIT-001
**Purpose:** The forward path for the Agent Observability layer — what changes before 100+ agents, and how the current design evolves toward Prometheus and OpenTelemetry compatibility without a rewrite. No code was written or modified to produce this document.

---

## Guiding principle

Every recommendation below extends the current design's own stated philosophy — additive, honest about what it doesn't know, low-overhead — rather than replacing it. The current layer's biggest structural strength (it observes the orchestrator without touching it) should hold true one layer up as well: the evolution path should observe and extend `agentObservability/`, not rewrite it.

---

## Stage 1 — Before 100+ agents (must happen)

These directly address the "what must change before 100+ agents" findings in [OBSERVABILITY_AUDIT.md](OBSERVABILITY_AUDIT.md), and should be treated as a single, coordinated change rather than five separate patches, since they compound:

1. **Replace the fixed record-count cap with a policy that doesn't shrink as agent count grows.** A time-windowed retention target (e.g., "keep the last 2 hours" or "keep the last N requests per symbol, plus a smaller global floor for everything else") decouples effective retention from how many agents happen to be registered.
2. **Add differential retention for non-success records.** Timeouts, errors, and unavailable results should never be evicted purely due to volume of unrelated successful traffic — retain 100% of failures within the retention window, and apply any volume-driven sampling only to successes.
3. **Expose `correlationId` in the actual API response** (header or body) so a real, specific request can be traced back to its execution record after the fact — the single cheapest fix in this entire evolution path relative to its practical value.
4. **Wrap `runObserved()`'s call to the orchestrator in its own try/catch**, recording request-level failures (invalid symbol, an unexpected orchestrator exception) as their own event, closing the current blind spot where only agent-level outcomes within an already-started run are visible.
5. **Add percentile computation (p50/p95/p99) for duration** to `metricsCollector.js`, alongside the existing averages — the minimum needed for tail-latency visibility at 100 agents, and a direct precondition for Stage 2's Prometheus histograms.

None of these require touching the orchestrator itself, and none require a persisted store — they are all achievable within the current in-memory, additive design.

## Stage 2 — Prometheus compatibility (when monitoring integration is actually pursued)

**Do not build this speculatively.** It should be triggered by an actual need for alerting/dashboarding, not built ahead of that need. When it is pursued:

- Introduce a **parallel, non-evicting metrics store** — counters and histograms that persist for the process's lifetime, distinct from (not replacing) the bounded `AgentExecutionLog` used for detailed trace inspection. The execution log stays the "what exactly happened, recently, in detail" tool; the new metrics store becomes the "how has this behaved over the process's whole life" tool. Both read from the same underlying execution events, emitted once, consumed by two different sinks.
- Model the core Prometheus types directly from data already computed in `metricsCollector.js`: a `Counter` for total executions per `agentId`/`failureCode`, a `Histogram` for duration (using the percentiles already added in Stage 1 as the basis for bucket boundaries), and a `Gauge` for the current log size / eviction rate (itself a useful operational signal for Stage 1's own retention health).
- Expose a standard `/metrics` endpoint in Prometheus's plain-text exposition format, scraped at the monitoring system's own interval — this is an additive endpoint alongside the existing developer-facing `/v2/agent-observability/:symbol` JSON endpoint, not a replacement for it.
- Labels should map directly onto dimensions already present in every execution record today (`agentId`, `symbol`, `failureCode`) — no new data needs to be collected, only re-exposed in Prometheus's shape.

## Stage 3 — OpenTelemetry compatibility (when distributed tracing is actually pursued)

This is the smaller of the two adaptations, because the current `correlationId`/`executionId` model already maps conceptually onto OTel's `traceId`/`spanId`:

- `correlationId` becomes (or is translated to) the OTel `traceId` for the whole `run()` call.
- Each agent's `executionId` becomes a child `spanId`, with an explicit `parentSpanId` pointing back to a synthetic "run" span — a small, additive field, not a redesign.
- ID *format* needs adaptation (OTel's specific hex-encoded trace/span ID byte lengths) but not the underlying *model* — the correlation scheme chosen in `AGENT-OBSERVABILITY-001` was, whether deliberately or not, already shaped correctly for this future step.
- Once this platform's own Agent Platform grows to genuinely distributed, multi-process execution (per `AGENT_SCALABILITY.md`), OTel-style trace propagation becomes far more valuable than it is today — a single symbol's request tracing across multiple worker processes is exactly the problem distributed tracing exists to solve, and is a much stronger motivator for this stage than anything about the current single-process deployment.

## What should not be built yet

- **A persisted store for `AgentExecutionLog`.** The factory function (`createAgentExecutionLog()`) already exists specifically to make this swap possible later without touching callers — building it now, before real usage patterns reveal what actually needs to survive a restart, would be premature.
- **A dashboard of any kind.** Explicitly out of scope for this whole initiative twice over now (once in the Orchestrator phase, once in this Observability phase) — the discipline of staying infrastructure-only, without a UI to maintain, should continue.
- **Prometheus/OTel integration itself**, ahead of an actual, named need for either — per the guiding principle above, this evolution path exists to make each stage cheap *when* it's needed, not to build ahead of need.

## Sequencing summary

| Stage | Trigger | Depends on |
|---|---|---|
| 1 — Retention, sampling, correlation exposure, request-level failures, percentiles | The registry approaching 100 agents (already the stated target) | Nothing — achievable today, within the current design |
| 2 — Prometheus | An actual need for alerting/dashboarding | Stage 1's percentiles and non-evicting counters as a foundation |
| 3 — OpenTelemetry | Genuine multi-process/distributed agent execution (per `AGENT_SCALABILITY.md`) | Stage 1's correlation exposure; otherwise independent of Stage 2 |
