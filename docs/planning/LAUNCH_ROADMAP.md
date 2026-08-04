# Launch Roadmap — ImpactOne

**Phase:** LAUNCH-PLAN-001. Documentation only — no production code was modified. Synthesizes `FINAL_PRODUCTION_READINESS.md`, `LAUNCH_CHECKLIST.md`, `OPERATIONS_RUNBOOK.md`, `POST_MVP_ARCHITECTURE.md`, `NEXT_GEN_ARCHITECTURE.md`, and `SCALABILITY_RECOMMENDATIONS.md` (all produced this same day).

**Important update since those documents were written**: a new commit, `OUTCOME-CALIBRATION-001`, landed after `FINAL_PRODUCTION_READINESS.md` was written. This roadmap incorporates it rather than working from a stale snapshot. Verified this session (not trusted from the commit message): `backend/services/outcomeCalibration/` is real, and its **34/34 tests pass** on a fresh, independent re-run. It builds real per-agent reliability history (accuracy, calibration statistics, drift detection) by joining each agent's already-tagged `ClaimEvidence.sourceEngine` rows to their already-graded `ClaimOutcome` — a genuinely clever, **no-schema-migration** solution to the exact prerequisite `CALIBRATION_STRATEGY.md` (this same day) had flagged as "Stage B: requires a real schema/data-model prerequisite... a future, separate phase." **That prerequisite is now built**, earlier and more cheaply than anticipated. It correctly, honestly reports "insufficient data" below its own real minimum-sample-size thresholds rather than fabricating a calibration reading — meaning the *engineering capability* now exists, but the *data volume* to use it meaningfully does not yet, since real Claim-Layer evidence only began flowing via the immediately-preceding `CLAIM-INTELLIGENCE-INTEGRATION-001` commit.

---

## Remaining milestones

### Milestone 1 — Security & Access Control (Blocking)
Add authentication, authorization, and rate-limiting to every public and Agent Platform endpoint. Confirmed via fresh grep (twice, across two same-day phases) to be entirely absent. **No dependency on any other milestone** — can begin immediately.

### Milestone 2 — Operational Foundation (Blocking)
Stand up CI/CD, add structured logging to the Agent Platform, re-verify `npm run build` succeeds fresh, and establish a database backup/DR procedure. **No dependency on Milestone 1** — can proceed in parallel.

### Milestone 3 — Data Quality Re-Verification (Blocking)
Re-run a live Postgres audit (this engagement's own established Sprint-D1-style technique) to get a **current** duplicate-content-contamination figure for the graded Recommendation/Outcome dataset — the prior ~70-76% figure is now several phases old and must not be assumed either stale-but-accurate or silently improved. **Depends on nothing** — can run immediately, and should run before Milestone 5 (see below), since a contaminated dataset would undermine any reliability signal the new Outcome Calibration Engine produces.

### Milestone 4 — Cheap Architectural Cleanups (High priority, not blocking)
Add `technical`/`fibonacci` to `unifiedStockIntelligenceEngine`'s target list; confirm `schedulerMetrics.js`'s sample-array bounding; register the 14 agents' confidence formulas in `scoringVocabulary.js`. All three are small, independently shippable, zero-risk-to-revert changes (`CONFIDENCE_MIGRATION_PLAN.md` Stage 0, `SCALABILITY_RECOMMENDATIONS.md` Priority 0/1). **No dependencies.**

### Milestone 5 — Let real reliability data accumulate (not an active workstream — a waiting period)
With the Outcome Calibration Engine's technical prerequisite now built, the only remaining gap to real per-agent calibration is **time and real production traffic** — real graded Claims need to accumulate past each metric's own honest minimum-sample-size gate. **Depends on Milestone 3** (a clean dataset) and implicitly on launch itself having occurred (real traffic requires real users). This is not a task to be "worked on" — it is a clock that only starts once the platform is live and generating real, ungamed activity.

### Milestone 6 — Confidence unification rollout (Medium priority, staged, not blocking)
Follow `CONFIDENCE_MIGRATION_PLAN.md`'s own 5-stage sequence (register formulas → add `basis` field → extract `structuralPenalties` → extract shared utilities one call site at a time). Each stage is independently shippable and does not block launch.

### Milestone 7 — Claim Layer proof-of-concept expansion (Medium priority, already partially overtaken by events)
`NEXT_GEN_ARCHITECTURE.md` recommended wiring **one** agent (Options) into the Claim Layer as a proof-of-concept before wider adoption; `CLAIM-INTELLIGENCE-INTEGRATION-001` instead wired all 14 at once — but did so safely (an opt-in flag defaulting `false`, a single call site). This milestone is now about **monitoring that decision's real-world outcome** (via the new Outcome Calibration Engine, once Milestone 5's data accumulates), not about further code changes.

---

## Dependency graph (text form)

```
Milestone 1 (Security)         — independent, start immediately
Milestone 2 (Ops Foundation)   — independent, start immediately
Milestone 3 (Data Quality)     — independent, start immediately, blocks Milestone 5
Milestone 4 (Cheap Cleanups)   — independent, start immediately
Milestone 5 (Reliability data) — depends on: Milestone 3, and on launch having occurred
Milestone 6 (Confidence unification) — independent, can proceed any time, non-blocking
Milestone 7 (Monitor Claim integration outcome) — depends on: Milestone 5
```

## Recommended execution order

1. **Milestones 1, 2, 3, and 4 in parallel** — none depend on each other, and together they close every genuine launch blocker plus the cheapest high-value cleanups. This is the critical path to launch.
2. **Launch** (gated on Milestones 1-3 passing `GO_LIVE_CRITERIA.md`'s objective gates).
3. **Milestone 6** can begin any time before or after launch — it is documentation-driven, low-risk, and non-blocking.
4. **Milestone 5** begins the clock the moment real traffic starts (i.e., at launch) — no separate "start" action is needed beyond launching.
5. **Milestone 7** follows naturally once Milestone 5 produces its first statistically meaningful per-agent reliability reading.

## Risk ranking

| Risk | Severity | Why |
|---|---|---|
| Launching without auth/rate-limiting (Milestone 1 incomplete) | **Critical** | Directly enables the already-documented shared-Scheduler-pool monopolization risk; the single most significant gap in the entire review history of this platform |
| Launching without re-verifying the dataset's real current contamination rate (Milestone 3 incomplete) | **High** | Any reliability/calibration signal built on a contaminated dataset would itself be unreliable — undermines the very system meant to build trust |
| Launching without CI/logging (Milestone 2 incomplete) | **High** | No way to catch a regression before it reaches users, and no way to diagnose an incident after it happens |
| Deferring Milestone 4's cheap fixes indefinitely | **Low** | Individually low-impact, but cheap enough that deferring them has no real justification |
| Attempting to force real calibration before Milestone 5's data accumulates | **Low but explicitly called out** | Not a risk of inaction — a risk of over-eager action; `CALIBRATION_STRATEGY.md` already explicitly rejects fabricating calibration ahead of real data, and this roadmap reaffirms that rejection |
