# V2 Execution Plan — ImpactOne

**Phase:** V2-ROADMAP-REFINEMENT-001. Documentation only — no production code was modified. Synthesizes every platform-level planning document produced across this engagement's Agent Platform arc: `POST_MVP_ARCHITECTURE.md`, `NEXT_GEN_ARCHITECTURE.md`, `SCALABILITY_RECOMMENDATIONS.md`, `UNIFIED_CONFIDENCE_ARCHITECTURE.md`, `CONFIDENCE_MIGRATION_PLAN.md`, `CALIBRATION_STRATEGY.md`, `FINAL_PRODUCTION_READINESS.md`, `LAUNCH_CHECKLIST.md`, `OPERATIONS_RUNBOOK.md`, `LAUNCH_ROADMAP.md`, `MVP_VS_V2.md`, `GO_LIVE_CRITERIA.md`, `DATA_QUALITY_ARCHITECTURE.md`, `PROVIDER_HEALTH_MODEL.md`, `DATA_QUALITY_OPERATIONS.md`.

**State as of this phase, confirmed via fresh `git log`**: all 6 named prerequisites are now real and committed — 14 Intelligence Agents, Claim Intelligence Integration (`CLAIM-INTELLIGENCE-INTEGRATION-001`), Outcome Calibration (`OUTCOME-CALIBRATION-001`), Production Hardening (`PLATFORM-HARDENING-002`), Redis Cache (`REDIS-CACHE-001`, confirmed real via a direct commit read this session: a generic, reusable, never-throws-on-failure cache mirroring the already-proven `agentScheduler/healthCache.js` API shape, with exactly **one** provider wired so far — `priceHistoryProvider.getDailyBars()`), and this same day's own Data Quality Architecture. **This is a genuinely mature state for a V2 planning exercise** — every major architectural gap this engagement's platform reviews repeatedly tracked (Claim Layer disconnection, calibration readiness, security/ops hardening, registry scalability) now has either a real fix shipped or a real, staged plan already written.

---

## Development phases

### Phase V2.0 — Verification (not new development, but a required first step)
Independently re-verify, fresh, the claims of the 3 most recent commits this session hasn't yet directly re-tested (`PLATFORM-HARDENING-002`'s 26 new tests + 2362-test full suite; `REDIS-CACHE-001`'s own test suite) — directly following this engagement's own established "verify, don't trust the commit message" discipline, already successfully applied to `CLAIM-INTELLIGENCE-INTEGRATION-001` and `OUTCOME-CALIBRATION-001`.

### Phase V2.1 — Confidence Unification rollout (per `CONFIDENCE_MIGRATION_PLAN.md`)
Stages 0-2 (register 14 formulas in `scoringVocabulary.js`, add the `basis` field, extract `structuralPenalties`) — all additive, zero-risk-to-revert, no dependency on anything else in this plan.

### Phase V2.2 — Data Quality instrumentation (per `DATA_QUALITY_ARCHITECTURE.md`/`PROVIDER_HEALTH_MODEL.md`)
Implement the Provider Health Score's new Data Yield component and the 4 status categories (`REAL_AND_HEALTHY`/`REAL_BUT_DEGRADED`/`HONEST_STUB`/`SILENTLY_FAILING`) as real code — this is a pure read-only aggregation layer over already-existing `ProviderRunLog` data, per that document's own "zero new persistence" design.

### Phase V2.3 — Redis cache expansion (per `SCALABILITY_RECOMMENDATIONS.md` + the new real `redisCache/` module)
Wire the remaining domain-agent-facing providers into the now-real, generic Redis cache module, one provider at a time — directly following the same "validate one real path first" discipline `REDIS-CACHE-001` itself already used (only `priceHistoryProvider` wired in V1 of this work).

### Phase V2.4 — Registry/Scheduler shared-state readiness (per `NEXT_GEN_ARCHITECTURE.md` §4, `SCALABILITY_RECOMMENDATIONS.md`)
Extract the `RegistryStateProvider` interface around the in-process `Map` — a safe, behavior-preserving refactor, **not** a Redis migration itself (that remains explicitly deferred until real multi-instance deployment is imminent, unchanged from this engagement's prior recommendation — the new Redis cache work in V2.3 is a caching layer, not a shared-registry-state migration, and these two must not be conflated).

### Phase V2.5 — Claim Layer expansion & Outcome Calibration data accumulation (per `NEXT_GEN_ARCHITECTURE.md` §1, `CALIBRATION_STRATEGY.md`)
Not an active build workstream — this is the "let real production traffic accumulate" waiting period already identified in `LAUNCH_ROADMAP.md` Milestone 5, now with a real, already-shipped Outcome Calibration Engine (confirmed real, 34/34 tests, this same week) actively collecting the data it needs.

---

## Parallel workstreams

**V2.1 (Confidence), V2.2 (Data Quality), and V2.4 (Registry interface extraction) are mutually independent** and can proceed fully in parallel — none shares a file, module, or data dependency with the others. **V2.3 (Redis expansion) depends only on the already-real `redisCache/` module (V1, already shipped)**, not on any of V2.1/V2.2/V2.4, and can also proceed in parallel. **V2.5 is not a workstream to schedule** — it runs automatically as a background consequence of real production usage, requiring no engineering allocation beyond what V2.0's verification and the already-shipped Calibration Engine already provide.

## Dependencies

```
V2.0 (Verification)          — no dependencies, do first
V2.1 (Confidence Unification) — no dependencies, parallel-safe
V2.2 (Data Quality)            — no dependencies, parallel-safe
V2.3 (Redis Expansion)         — depends on: REDIS-CACHE-001 (already shipped)
V2.4 (Registry Interface)      — no dependencies, parallel-safe
V2.5 (Data accumulation)       — depends on: real production traffic (i.e., launch)
```

## Critical path

**There is no single dominant critical path** — this is itself a notable, positive finding: every one of V2.1-V2.4 is independently shippable with no cross-dependency, meaning the true "critical path" to a complete V2 is simply **the longest of the four parallel workstreams**, not a chained sequence. Based on each workstream's own already-documented staging:
- V2.1 (5 staged sub-steps, each individually small) is likely the shortest.
- V2.3 (13 remaining providers to wire, one at a time, each requiring its own validation) is likely the longest, and therefore the closest thing to a critical path this plan has.

## Estimated implementation order

1. **V2.0 first, always** — verification is cheap and de-risks everything that follows.
2. **V2.1, V2.2, V2.4 in parallel** immediately after — independent, low-risk, high-value.
3. **V2.3 proceeds continuously**, provider by provider, throughout the same window as 1-2, since its own internal sequencing (one provider validated before the next) is the actual pacing constraint, not calendar time.
4. **V2.5 requires no scheduling** — it is already running in the background as of `CLAIM-INTELLIGENCE-INTEGRATION-001`/`OUTCOME-CALIBRATION-001` shipping.
