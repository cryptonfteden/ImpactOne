# Metrics Gap Analysis

**Phase:** OBSERVABILITY-AUDIT-001
**Scope:** `backend/services/agentObservability/metricsCollector.js`, cross-referenced against the needs stated in the phase mission (100+ agents, future Prometheus compatibility, future OpenTelemetry compatibility). No code was written or modified to produce this analysis.

---

## What exists today (verified directly in `metricsCollector.js`)

| Metric | Computation | Honesty check |
|---|---|---|
| `totalExecutions` | Count of records | Correct, unconditional |
| `successCount` / `timeoutCount` / `failureCount` / `unavailableCount` | Counts filtered by `failureCode` | Correct; `failureCount` specifically filters `AGENT_ERROR` only |
| `successRate` | `successCount / totalExecutions` | Correct simple ratio |
| `avgDurationMs` | Arithmetic mean of `durationMs` across all records | Correct as a mean; see gap below |
| `avgRetryCount` | Arithmetic mean of `retryCount` | Correct as a mean |
| `avgConfidence` | Arithmetic mean of `confidence`, successes only | Correctly excludes failures from skewing the average |
| `cacheHitRate` | Ratio, computed **only** over records that reported a cache signal | Verified honest — returns `null`, not a fabricated `0`, when `cacheTrackedCount` is 0 |
| `cacheTrackedCount` | Count of records with a non-null cache signal | Correct, and the reason `cacheHitRate` can stay honest |

Every metric here is computed fresh, on demand, from whatever currently remains in the bounded, evicting `AgentExecutionLog` — there is no persisted, monotonic counter anywhere in this layer today.

---

## Gap 1 — No percentile/distribution metrics (Medium → High at 100 agents)

**Today:** Every latency-related figure (`avgDurationMs`, `avgRetryCount`, `avgConfidence`) is a simple arithmetic mean.

**Gap:** A mean cannot reveal tail behavior. One chronically-slow agent among 13 already partially distorts `avgDurationMs`; among 100, a small number of consistently slow agents (exactly the scenario the companion Orchestrator Stress Audit already flagged as a real, undefended risk — no timeout ceiling per agent) can be almost entirely invisible in an aggregate mean while still degrading real user-facing latency for every request that happens to invoke them.

**Needed:** p50/p95/p99 for `durationMs` at minimum, ideally also for `retryCount`. This is not a "nice to have" — it is the specific metric type that would have caught the exact risk the prior stress audit already identified by design, not by chance.

**Relevance to Prometheus:** Direct — Prometheus's native `Histogram` type exists specifically to answer this question at scrape time via `histogram_quantile()`. Building percentile buckets now, even before a real Prometheus exporter exists, means Stage 2 of [OBSERVABILITY_EVOLUTION.md](OBSERVABILITY_EVOLUTION.md) has real bucket boundaries to reuse rather than inventing them from scratch.

---

## Gap 2 — No concurrency / throughput / backpressure metrics (High at 100 agents)

**Today:** Nothing in `metricsCollector.js` measures how many executions are in flight concurrently, how many requests per second the orchestrator is handling, or any queueing/backpressure signal.

**Gap:** This is a direct consequence of the orchestrator itself having no concurrency ceiling (confirmed in the prior Orchestrator Stress Audit) — there is nothing yet to measure. But it means that even after Stage 1 fixes land, an operator would have no way to see "the system is under load" as a first-class metric; they would only be able to infer it indirectly from rising average durations.

**Needed:** A concurrent-executions gauge and a simple requests-per-interval counter, once (and only once) the orchestrator itself gains any concurrency awareness to report.

**Relevance to Prometheus:** Direct — this is exactly what a `Gauge` (current concurrency) and a `Counter` (total requests, rate-derived at scrape time) are for.

---

## Gap 3 — No schema/label versioning (Medium, compounds with Prometheus adoption)

**Today:** Metrics are grouped only by `agentId` (`collectMetrics()`'s `perAgent` breakdown). There is no additional dimensionality — no breakdown by `symbol`, by time bucket, or by `failureCode` beyond the fixed four counters already computed.

**Gap:** Prometheus's value comes substantially from label-based dimensionality (querying "duration for agent X on symbol Y over the last hour"), which the current flat per-agent summary cannot express at all.

**Needed:** When Stage 2 is pursued, metrics should be labeled by at minimum `agentId` and `failureCode`; `symbol`-level labeling should be considered but weighed against label cardinality cost (many symbols × many agents can produce a very large label space — a real Prometheus operational concern, not just a data-modeling one).

---

## Gap 4 — No persisted/monotonic counters (High, blocks real Prometheus compatibility entirely)

**Today:** Every metric is recomputed from whatever currently survives in the bounded, evicting log — a number can *decrease* between two successive queries simply because old records were evicted, which is fundamentally incompatible with Prometheus's expectation that counters only ever increase for the life of the process.

**Gap:** This is not a tuning problem — it is a structural mismatch between "metrics derived from a rolling window" and "metrics that must be monotonic for the process's lifetime." No amount of adjusting the current design closes this gap; it requires the parallel, non-evicting counter store described in Stage 2 of [OBSERVABILITY_EVOLUTION.md](OBSERVABILITY_EVOLUTION.md).

**Needed:** A metrics store that is explicitly separate from (but fed by the same events as) the bounded execution log.

---

## Gap 5 — No error-cause granularity in metrics (Medium, tied to the Failure Taxonomy finding)

**Today:** `failureCount` is a single number filtered on `failureCode === AGENT_ERROR`. This is accurate to what the taxonomy can currently express, but the taxonomy itself cannot distinguish a shared-cause failure (e.g., an upstream API outage affecting many agents at once) from an isolated one-off bug in a single agent.

**Gap:** At 100 agents, this is the difference between "one incident, ten symptoms" and "ten unrelated incidents" — a real operational distinction that current metrics cannot surface, purely because the underlying taxonomy (correctly, per its own scope) doesn't yet have the input to make it.

**Needed:** Out of this layer's own scope — requires the orchestrator/agent interface to expose structured error causes first (see Failure Taxonomy finding in [OBSERVABILITY_AUDIT.md](OBSERVABILITY_AUDIT.md)).

---

## Summary table — metrics needed at each stage

| Metric type | Exists today | Needed before 100+ agents | Needed for Prometheus | Needed for OpenTelemetry |
|---|---|---|---|---|
| Mean duration/retry/confidence | Yes | Yes (keep) | Yes (keep, as a fallback) | No |
| Percentile duration (p50/p95/p99) | No | **Yes** | Yes (Histogram) | No |
| Success/failure/timeout counts | Yes | Yes (keep) | Yes (Counter) | No |
| Cache hit rate (honest-null) | Yes | Yes (keep) | Yes (Gauge or ratio) | No |
| Concurrency / in-flight gauge | No | Yes, once orchestrator supports it | Yes (Gauge) | Useful for span concurrency context |
| Request-level failure count | No (see Observability Completeness finding) | **Yes** | Yes (Counter) | Useful as a span error attribute |
| Schema/label versioning | No | Recommended | Required for stable dashboards | N/A |
| Persisted/monotonic counters | No | Not required yet | **Required** | N/A |
| Trace/span ID format | Custom (`corr_`/`exec_` prefixed UUIDs) | No change needed | N/A | Format adaptation needed |
| Parent-child span linkage | Implicit only (shared `correlationId`) | No change needed | N/A | Explicit `parentSpanId` needed |

See [OBSERVABILITY_AUDIT.md](OBSERVABILITY_AUDIT.md) for the full narrative review and [OBSERVABILITY_EVOLUTION.md](OBSERVABILITY_EVOLUTION.md) for the sequencing of these changes.
