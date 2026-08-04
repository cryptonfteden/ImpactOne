# Architectural Decision Record — ImpactOne Agent Platform

**Phase:** V2-ROADMAP-REFINEMENT-001. Companion to [V2_EXECUTION_PLAN.md](../planning/V2_EXECUTION_PLAN.md) and [TECHNICAL_RISK_REGISTER.md](../planning/TECHNICAL_RISK_REGISTER.md). Documentation only. Records the major architectural decisions made across this engagement's Agent Platform arc, in the standard ADR shape (decision, alternatives considered, trade-offs, future review triggers).

---

## ADR-1: Each domain agent owns its own confidence formula (no shared formula mandated)

**Decision**: 14 domain agents each independently compute their own confidence score, using their own hand-set weights and components, rather than a single shared formula.

**Alternatives considered**: (a) a single shared confidence formula applied uniformly to all agents; (b) a shared base formula with per-agent override hooks.

**Trade-off accepted**: cross-agent confidence numbers are not directly comparable today (a real, disclosed limitation, addressed only partially via the `basis`-field labeling approach in `UNIFIED_CONFIDENCE_ARCHITECTURE.md`), in exchange for each agent's formula being genuinely well-suited to its own domain's actual data shape (confirmed via direct review: Institutional's coverage-and-conviction model and Macro's pure data-availability model are both legitimately different, not one being "wrong").

**Why this was the right call, not just the path of least resistance**: forcing a shared formula onto agents with genuinely different underlying epistemics (a curated-cohort coverage question vs. a data-source-availability question) would have replaced honest heterogeneity with false uniformity — directly reaffirmed in `CALIBRATION_STRATEGY.md`'s own explicit rejection of this alternative.

**Future review trigger**: revisit if/when real per-agent Outcome-grading data (per the now-real Outcome Calibration Engine) accumulates enough to show that two agents' confidence numbers *should* be numerically equivalent at a given level but empirically are not — at that point, a shared calibration curve (not a shared formula) becomes the right next step, per `CALIBRATION_STRATEGY.md`'s own Stage C.

---

## ADR-2: The Intelligence Bus/Claim Layer connection is opt-in via a single flag, not a forced default

**Decision**: `runObserved()`'s `publishClaims` flag defaults to `false`; it is wired to `true` at exactly one call site (`unifiedStockIntelligenceEngine.js`).

**Alternatives considered**: (a) make Claim publishing the default behavior for every orchestrator run; (b) wire only one agent (Options) into the Bus first, per `NEXT_GEN_ARCHITECTURE.md`'s own original narrower recommendation, before considering the rest.

**Trade-off accepted**: the actual implementation went further than the originally-recommended narrow proof-of-concept (all 14 agents were allowlisted at once via `claimDimensions.js`'s `INTEGRATED_ENGINES`), but did so safely by keeping the *blast radius* equivalent to a single-call-site change regardless of how many engines are allowlisted — a real, deliberate reconciliation between "move fast" and "validate one path first" that this ADR records as a considered trade-off, not an oversight.

**Future review trigger**: once this one call site's real production behavior is observed for a meaningful period without incident, revisit whether `publishClaims` should become the orchestrator's own default rather than requiring each new caller to opt in explicitly.

---

## ADR-3: The Outcome Calibration Engine is built as a read-only join layer, not a schema migration

**Decision**: per-agent reliability history is computed by joining `ClaimEvidence.sourceEngine` to already-graded `ClaimOutcome` rows at read time, rather than adding a new persisted column linking outcomes to agents.

**Alternatives considered**: (a) a schema migration adding a direct `agentId` foreign key to `Outcome`/`ClaimOutcome`; (b) a separate aggregation table pre-computed on a schedule.

**Trade-off accepted**: every reliability query re-derives its answer from the join at request time rather than reading a pre-computed value — a real, accepted performance cost in exchange for **zero schema risk** and **zero migration to roll back if the approach needs to change**. Confirmed via this session's own independent test run (34/34 passing) that this approach is real and correctly handles the honest-insufficient-data case.

**Future review trigger**: if/when this read-time join becomes a genuine performance bottleneck (measurable via real production latency data, not assumed), revisit toward a scheduled pre-aggregation table — but only once real evidence of the need exists, consistent with this platform's own repeated "don't build for a scale problem that doesn't exist yet" principle.

---

## ADR-4: Data Quality is modeled as an input to confidence, never merged into it

**Decision**: the new Data Quality Score, Provider Health Score, Freshness Quality Score, Completeness Score, and Conflict Score are explicitly designed as separate from, and feeding into, each agent's own confidence computation — never replacing or being computed circularly from it.

**Alternatives considered**: (a) fold data-quality signals directly into each agent's existing confidence formula; (b) build a single combined "trust score" merging confidence and data quality into one number.

**Trade-off accepted**: consumers must now reason about two related-but-distinct numbers (confidence and data quality) instead of one — a real, accepted complexity cost — in exchange for preserving the ability to diagnose *why* a report might be untrustworthy (bad underlying data vs. a low-confidence-but-well-sourced signal) rather than collapsing both possible causes into one undifferentiated number.

**Future review trigger**: if user research or real product usage shows that presenting two separate numbers to end users creates genuine confusion (as opposed to internal/operator-facing use, where the separation is unambiguously valuable), revisit whether a single blended user-facing presentation is warranted — while still keeping the two computations internally separate.

---

## ADR-5: Provider health must distinguish "uptime" from "data yield" as two separate signals

**Decision**: the new Provider Health Score adds a Data Yield component alongside the existing Uptime component, explicitly to distinguish an honest, intentionally-unconfigured stub provider from a genuinely failing real one.

**Alternatives considered**: (a) leave `providerHealthService.js`'s existing `successRate` as the sole health signal; (b) simply exclude all stub providers from any health reporting entirely.

**Trade-off accepted**: alternative (b) was rejected because it would hide the real, useful fact that a given capability is *intentionally* not yet configured (valuable operator context) rather than silently absent from the dashboard — the chosen design (explicit `HONEST_STUB` category) preserves this visibility while still preventing false alerts.

**Future review trigger**: once a stub provider is genuinely configured with real credentials, its own historical `HONEST_STUB`-category run history should be expected to transition to `REAL_AND_HEALTHY`/`REAL_BUT_DEGRADED` — if it does not transition cleanly, that itself would be a signal the category thresholds need revisiting.

---

## ADR-6: Registry/Scheduler shared-state migration is deferred; a caching layer is not

**Decision**: the Agent Registry and Scheduler remain per-process, in-memory singletons (no Redis migration for either), while a **separate**, narrowly-scoped Redis *caching* layer was built for provider data (`REDIS-CACHE-001`).

**Alternatives considered**: (a) migrate the registry to Redis-backed shared state now that a real Redis dependency exists in the codebase for other reasons; (b) defer Redis entirely until a registry migration is also justified.

**Trade-off accepted**: this creates a real, disclosed asymmetry — Redis now exists in this codebase for caching, but not for the registry/scheduler's own shared state — which could plausibly confuse a future engineer into assuming "we already have Redis, so the registry could easily move too." This ADR explicitly records that **these are two separate decisions with two separate trigger conditions**, not one bundled migration.

**Future review trigger**: only revisit the registry/scheduler migration once real multi-instance deployment is imminent — the existence of a caching-layer Redis dependency is not, by itself, a sufficient reason to also migrate the registry.
