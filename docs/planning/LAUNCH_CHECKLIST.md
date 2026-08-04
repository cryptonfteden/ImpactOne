# Launch Checklist — ImpactOne Agent Platform

**Phase:** PRODUCTION-READINESS-001. Companion to [FINAL_PRODUCTION_READINESS.md](../operations/FINAL_PRODUCTION_READINESS.md). Documentation only. Follows this engagement's own established `IMPACTONE_RELEASE_CHECKLIST.md`/`IMPACTONE_RELEASE_GATES.md` precedent (Feature Gate → Beta Gate → GA Gate, "no exceptions to Blocking Issues") rather than inventing a new process.

---

## Blocking (must close before any exposure beyond the current trusted beta cohort)

- [ ] **Add authentication/authorization to every Agent Platform endpoint.** Confirmed absent this session via a fresh grep (zero matches for `rateLimit`/`express-rate-limit`/`requireAuth`/`authMiddleware` anywhere). Directly enables the already-flagged "unauthenticated caller monopolizes the shared Scheduler pool" risk.
- [ ] **Add rate limiting to every public-facing route**, not just the Agent Platform's own endpoints — the same missing piece named above.
- [ ] **Stand up a CI pipeline** that runs the full backend/frontend test suites on every commit. Confirmed absent across this engagement's entire history (no `.github/workflows`, no equivalent, at any prior checkpoint).
- [ ] **Add basic structured logging to the Agent Platform** (`agentScheduler`/`agentOrchestrator`/`agentObservability`/`agentClaimBridge`) — confirmed zero `console.*`/logger calls exist in this subsystem as of the most recent direct check.
- [ ] **Re-verify `npm run build` succeeds fresh** — this engagement's own history includes multiple prior sessions where the frontend build was found broken for extended periods before being caught; do not assume it currently passes without a fresh, direct check immediately before launch.
- [ ] **Re-run a live query of the graded-Recommendation/Outcome dataset's current duplicate-content contamination rate** — this engagement's own prior Sprint D1/D1.5 audits found ~70-76% contamination at the time; this was not re-verified this session and must not be assumed either resolved or unchanged without a fresh check.

## High priority (should close before a wider cohort, not necessarily before the current small beta)

- [ ] Confirm `schedulerMetrics.js`'s sample-array bounding (`SCALABILITY_RECOMMENDATIONS.md` Priority 0) — a fast, cheap verification, not yet completed.
- [ ] Add `technical` and `fibonacci` to `unifiedStockIntelligenceEngine`'s `TARGET_AGENT_IDS` — a one-line fix closing a confirmed, real integration gap.
- [ ] Add a database backup/disaster-recovery runbook — confirmed absent since this engagement's earliest SRE audit, unchanged since.
- [ ] Add at least a minimal APM/error-tracking dependency (no such dependency exists in `package.json` as of the most recent check).

## Medium priority (real, disclosed, but not launch-blocking)

- [ ] Register each of the 14 domain agents' confidence formulas as new `scoringVocabulary.js` entries (`CONFIDENCE_MIGRATION_PLAN.md` Stage 0) — documentation-only, zero behavioral risk.
- [ ] Formalize provider real/stub/fixture status as queryable metadata on `providerRegistry.js`.
- [ ] Expose per-agent confidence-component breakdowns through a shared Observability surface.
- [ ] Begin the opt-in `clampedAdditiveScore`/`capAndRedistributeWeights` shared-utility extraction (`CONFIDENCE_MIGRATION_PLAN.md` Stages 3-4), one call site at a time.

## Explicitly NOT required before launch (correctly deferred, per this engagement's own established discipline)

- Cross-agent numeric confidence calibration (`CALIBRATION_STRATEGY.md` — requires real Outcome data this platform does not yet have; forcing it now would fabricate false comparability).
- Migrating the agent registry to Redis/shared state (no multi-instance deployment is imminent).
- A tiered/priority-aware Scheduler (no evidence yet of a material fast/slow agent execution-time spread at real production volume).
- Wiring all 14 agents' confidence formulas onto one shared numeric scale (would replace honest domain-appropriate heterogeneity with false uniformity).

## Sign-off gate

Per this engagement's own established `IMPACTONE_RELEASE_GATES.md` discipline: **every item in the Blocking section above must be closed with no exceptions** before this platform is exposed beyond its current trusted beta cohort. Items in High Priority should be tracked and scheduled, but do not themselves block the *current* small-cohort operation, consistent with this platform's own tiered Feature Gate → Beta Gate → GA Gate model.
