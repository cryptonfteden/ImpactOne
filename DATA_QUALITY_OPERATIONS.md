# Data Quality Operations — ImpactOne

**Phase:** DATA-QUALITY-001. Companion to [DATA_QUALITY_ARCHITECTURE.md](DATA_QUALITY_ARCHITECTURE.md) and [PROVIDER_HEALTH_MODEL.md](PROVIDER_HEALTH_MODEL.md). Documentation only.

**Framing constraint**: this platform currently has zero automated alerting or monitoring infrastructure of any kind (confirmed across this engagement's own history, most recently `FINAL_PRODUCTION_READINESS.md`). Every recommendation below is designed to be **immediately actionable via manual/on-demand checks today**, with a clearly separated "once real alerting infrastructure exists" tier — this document does not pretend automated alerting already exists or can be built as a side effect of a documentation phase.

---

## Alert thresholds

| Signal | Threshold | Severity | Rationale |
|---|---|---|---|
| A **REAL** provider (not an honest stub, per `PROVIDER_HEALTH_MODEL.md`'s category system) enters `SILENTLY_FAILING` | Immediate | **Critical** | This is the one category that cannot be an intentional/expected state — a real provider that both stopped delivering data and started failing |
| A **REAL** provider's `dataYieldComponent` drops below 40 while `uptimeComponent` stays above 80 | Sustained for 3+ consecutive runs | **High** | A "REAL_BUT_DEGRADED" provider — still technically responding, but delivering meaningfully less real data than its own baseline |
| Any Conflict Score exceeds 70 on a report involving a **held portfolio position** | Immediate | **High** | Directly extends this platform's own established "held-position relevance" prioritization principle (`NEWS_PRIORITIZATION_RULES.md`'s precedent) — a genuine cross-agent disagreement about a stock the user actually holds warrants more attention than the same disagreement on an unrelated symbol |
| Any Conflict Score exceeds 70 on any other report | Sustained for 3+ occurrences in 24h for the same symbol | **Medium** | A single disagreement can be a one-off data hiccup; a repeated one across multiple runs for the same symbol is more likely a genuine, persistent signal disagreement worth surfacing |
| Completeness Score drops below 50 for the Unified Stock Intelligence report | Immediate | **Medium** | Fewer than half of the report's expected contributing agents produced a usable result — the report is still honestly generated (per `POST_MVP_ARCHITECTURE.md`'s "never fabricate from absence" discipline) but its overall usefulness is materially reduced |
| Data Quality Score (platform-wide aggregate) drops below its own trailing 7-day baseline by more than 15 points | Daily check | **Medium** | A relative, self-baselined threshold rather than an arbitrary fixed number — appropriate given this platform has not yet accumulated enough history to know what an absolute "good" Data Quality Score looks like |

**Do NOT alert on `HONEST_STUB` providers ever**, under any threshold — this is the single most important negative rule in this whole document, directly following from `PROVIDER_HEALTH_MODEL.md`'s own category design. An `HONEST_STUB` provider's perpetual 0 Data Yield is its correct, intended, honestly-disclosed state, not a degradation.

---

## Dashboard metrics

**Recommended new read-only endpoint**: `GET /v2/data-quality-dashboard`, directly modeled on the already-real, already-tested `/v2/agent-diagnostics` endpoint's own pattern (a consolidated, read-only aggregation over already-existing data, no new persistence) — not proposed as code in this documentation-only phase, but named here as the concrete shape this design implies.

**Top-level summary panel**:
- Platform-wide Data Quality Score (current, and its trailing 7-day trend)
- Count of providers in each Provider Health category (REAL_AND_HEALTHY / REAL_BUT_DEGRADED / HONEST_STUB / SILENTLY_FAILING) — the `SILENTLY_FAILING` count should be the single most visually prominent number on this dashboard, since it is the one category requiring action
- Count of reports generated in the last 24h with a Conflict Score above the Medium threshold

**Per-provider table** (per `PROVIDER_HEALTH_MODEL.md`'s recommended row shape): sortable by category, then by Provider Health Score ascending (worst-first).

**Per-agent freshness panel**: each of the 14 domain agents' own current freshness tier label (`REAL_TIME`/`SCHEDULED_PERIODIC`/`REGULATORY_LAGGED`) and most recent successful data timestamp — directly surfaces the cross-agent freshness comparability this whole framework's Freshness Quality Score was designed to enable.

**Recent Conflict Score incidents**: the last 20 reports whose Conflict Score exceeded the Medium threshold, with the specific disagreeing agent pair named (never averaged/hidden), directly reusing `CONFLICT_RESOLUTION.md`'s own "itemized conflict list always shown" principle.

---

## Operational KPIs

These are the metrics an operator/product owner should track over time, distinct from the real-time dashboard above:

1. **% of registered providers in `REAL_AND_HEALTHY` status**, tracked weekly — the platform's real, honest measure of "how much of our data infrastructure genuinely works today," directly answering the question this engagement's own prior research series repeatedly had to answer per-domain (e.g., "only Options/CFTC-COT are genuinely real among 22 registered providers").
2. **Mean time-to-detection for a `SILENTLY_FAILING` transition**, once real alerting exists — until then, tracked as "time between the failure's real occurrence (per `ProviderRunLog` timestamps) and an operator's next manual dashboard check," an honest proxy metric given today's manual-check-only reality.
3. **Conflict Score incident rate per 1,000 reports generated** — a genuine leading indicator of cross-agent scoring-methodology drift (e.g., if `UNIFIED_SCORING_MODEL.md`'s own already-identified direction-taxonomy gaps produce false-positive conflicts, this KPI would surface that pattern before it's diagnosed individually).
4. **Completeness Score distribution** (median and 10th-percentile) across all reports in a rolling window — a low 10th-percentile with a healthy median indicates a real, narrow subset of symbols/times with a systemic issue worth investigating specifically, rather than a platform-wide problem.

---

## Incident workflow

### Step 1 — Triage using the Provider Health category, never the raw `successRate` alone
Per `PROVIDER_HEALTH_MODEL.md`'s central finding, a raw `successRate` reading cannot distinguish an intentional stub from a real failure. **Always check the full category (REAL_AND_HEALTHY/REAL_BUT_DEGRADED/HONEST_STUB/SILENTLY_FAILING) before escalating anything.**

### Step 2 — For a `SILENTLY_FAILING` provider (Critical)
1. Check `providerDiagnosticsService.getDiagnosticsForProvider()`'s real, already-built output — contract validity, live rate-limiter state, most recent error detail — this is the existing, correct first diagnostic step, reused unchanged from this platform's own established Sprint 23A design.
2. Cross-reference against `providerMetricsService`'s aggregated history — is this a new regression, or has this provider always been this unreliable (in which case it may have been mis-registered as `REAL` when it should be reclassified)?
3. Follow `OPERATIONS_RUNBOOK.md`'s own already-established "Agent Platform appears slow or unresponsive" playbook if the failing provider is causing downstream latency, per that document's own guidance that a single chronically-failing/slow dependency can set the latency floor for an entire request.

### Step 3 — For a high Conflict Score
1. **Never resolve it by picking a side** — display both disagreeing signals with equal prominence, per `CONFLICT_RESOLUTION.md`'s own governance checklist.
2. Determine whether the disagreement reflects a genuine, real underlying signal conflict (both agents are working correctly and simply disagree — itself valuable, disclosable information) or a **taxonomy/methodology artifact** (e.g., `UNIFIED_SCORING_MODEL.md`'s own already-documented naive-string-equality direction-comparison bug producing a false-positive conflict) — only the latter is a real incident requiring a fix; the former is the system working as intended.

### Step 4 — For a low Completeness Score
1. Check which specific agents failed to contribute, using the Unified Stock Intelligence report's own already-real `agentContributions`/`totalAgentCount`/`contributingAgentCount` fields (confirmed real in this engagement's own prior architecture review).
2. If the same subset of agents is missing repeatedly, treat it as a Provider Health incident (Step 2) for whichever provider those agents depend on, rather than treating each low-completeness report as its own independent incident.

---

## What this document explicitly does not do

- **Does not propose building a real alerting/paging pipeline** — that is future implementation work, correctly out of scope for a documentation-only phase; this document defines the thresholds and workflow that pipeline should eventually implement.
- **Does not alert on `HONEST_STUB` providers** — reiterated here as the single most important negative rule, since accidentally including stub providers in any alerting logic would generate constant, meaningless noise and quickly train operators to ignore all alerts.
- **Does not compute any new persisted data** — every metric in this document is a read-only aggregation over data this platform's own `ProviderRunLog`, Claim Intelligence, and Unified Stock Intelligence layers already produce.
