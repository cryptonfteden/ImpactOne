# Learning Risk Register
## Sprint 43 — Phase D (Adaptive Intelligence) Failure Modes

Five most likely ways Phase D could damage the product, ranked by (probability × severity).

---

### Risk 1 — Confidence Inflation from an Untested Streak

**Description:** an adaptive process interprets a short run of correct calls (which could be luck, a bull-market tailwind, or one repeated symbol) as evidence of skill and raises stated confidence scores, which users see and act on directly.

- **Probability:** High. Nothing in the current foundation prevents this — there is no significance testing, no regime tagging, and no symbol/sector concentration check anywhere in the codebase today.
- **Severity:** High. Confidence scores are user-facing and directly shape trust and position-sizing decisions; inflated confidence that later fails is exactly the "false confidence" this sprint's mission was built to prevent.
- **Detection method:** a mandatory bucketed calibration curve (stated confidence vs. realized hit rate, by decile) checked on a recurring schedule; any bucket where realized accuracy trails stated confidence by more than a defined margin should raise an alert automatically.
- **Prevention:** hard floor on sample size per adapted dimension before any confidence adjustment is allowed; mandatory regime and symbol/sector concentration checks before treating a streak as signal; a ceiling on how far any single adaptation cycle can move a confidence score.
- **Recovery:** an immediate, pre-built rollback to the prior confidence-model version (requires the version-history table flagged as missing in Section 5 of the audit to exist first); user-facing disclosure if inflated confidence is confirmed to have been shown.

---

### Risk 2 — Committee-Member Collapse

**Description:** an adaptive process down-weights or effectively silences a committee member whose votes correlate with being "wrong" in the short term, collapsing the deliberate multi-perspective design into a single amplified voice.

- **Probability:** Medium. This would only happen if Phase D is scoped to include per-member weighting — but that is explicitly one of the eight business questions this sprint was asked to plan for ("which committee member adds real alpha"), so the temptation is architecturally built into the roadmap.
- **Severity:** High. `committeeCoordinator.js`'s own design documentation states the committee exists specifically to prevent one blended, AI-decided outcome; silently defeating that through adaptive weighting would undo a deliberate safety design, not just introduce a metrics bug.
- **Detection method:** a standing test asserting no committee member's effective influence can fall below a fixed floor; periodic audit of vote-influence distribution across members.
- **Prevention:** hard-coded minimum influence floor per member, enforced independently of any adaptive process; any change to committee composition or weighting requires the human governance approval defined in Section 6, not a data-driven trigger.
- **Recovery:** revert to equal-weighted committee input as an immediate fallback state; because committee debate JSON already stores each member's vote at the time, historical decisions remain re-auditable even after a rollback.

---

### Risk 3 — Leakage Through a Future "Regrade" or "Backfill" Feature

**Description:** a well-intentioned future feature (e.g., "let's regrade old outcomes now that we have better data" or "let's backfill sector/evidence data onto historical recommendations") quietly introduces look-ahead bias by applying information that did not exist at decision time to historical training data.

- **Probability:** Medium. The current schema's append-only, snapshot-based design actively prevents this today — but Section 3 of the audit identifies this as the most likely way that protection gets accidentally broken, since it would arrive as a "quality improvement," not an obviously risky change.
- **Severity:** High. Leakage silently and invisibly inflates a learning system's apparent accuracy; it is very difficult to detect after the fact and can invalidate an entire adaptation history.
- **Detection method:** a standing architectural rule enforced by tests, not just documentation, that all audit-critical tables (`DecisionTrace`, `Outcome`, `WorldMemoryPrediction`) have no update code path at all — any pull request adding one should fail a dedicated check.
- **Prevention:** any new information (real provider data replacing a stub, corrected sector classification, etc.) must only ever attach to newly created recommendations going forward, never retrofitted onto historical rows; enforce via code review checklist and, ideally, an automated schema/repository-level guard.
- **Recovery:** if leakage is discovered after the fact, the correct recovery is to invalidate and clearly label the contaminated methodology version (consistent with the existing `methodologyVersion` pattern) rather than silently correcting the historical rows in place.

---

### Risk 4 — Optimizing Against a Benchmark of Zero (No Real Alpha Measurement)

**Description:** because `Outcome.benchmarkReturnPct` is never populated, any adaptive process trained on raw `windowReturnPct` is implicitly optimizing against "the market went to zero" rather than a real benchmark — meaning it will reward strategies that simply track a rising market, not genuine skill.

- **Probability:** High if Phase D proceeds before this specific field is populated — this is not a subtle risk, it is a direct, structural consequence of a field that is already known to be empty.
- **Severity:** High. This is the single most fundamental way a "smarter" system could actually just be a more confident bull-market detector, which is precisely the kind of hidden instability this review exists to catch before it reaches production.
- **Detection method:** an explicit, mandatory pre-launch check that `Outcome.benchmarkReturnPct` is populated for a statistically adequate, representative sample before any adaptive process is allowed to read `Outcome` data at all.
- **Prevention:** populate benchmark-relative return as a hard prerequisite — not a nice-to-have — before Phase D begins, and gate any adaptive training pipeline on its presence.
- **Recovery:** if discovered after adaptation has begun, the adaptive process must be paused, all learned weights discarded (not just reverted one step), and retraining restarted from benchmark-relative data — a partial fix cannot untangle beta from alpha after the fact.

---

### Risk 5 — Non-Explainable Weight Changes Erode User and Auditor Trust

**Description:** Phase D ships an adaptive mechanism that changes a weight or a confidence calculation, but the system cannot produce the ten-part explanation (old value, new value, sample, period, market conditions, performance difference, uncertainty, change limit, reversal criteria, version history) defined in Section 5 of the audit — because none of the required infrastructure exists yet.

- **Probability:** High if Phase D ships on the current timeline without first building the weight-change-log table — today, zero of the ten required explanation elements are fully producible.
- **Severity:** Medium-High. This does not cause a financial loss by itself, but it directly damages the trust-based positioning this product has repeatedly been reviewed and recommended around in prior sprints (Company Strategy Review's stated moat is trust, not raw AI capability) — an unexplainable weight change is a trust failure even if the weight change itself was statistically sound.
- **Detection method:** a pre-launch checklist requiring every one of the ten explanation elements to be demonstrably producible, tested against a real example, before Phase D can be marked ready to ship.
- **Prevention:** build the append-only weight-change-log table (following the same versioned pattern already proven by `methodologyVersion` and `WorldMemoryThesisRevision.revisionNumber`) before any adaptive mechanism is allowed to run, not after.
- **Recovery:** if an unexplainable change ships anyway, the only honest recovery is full disclosure to users/auditors that a change occurred whose exact justification cannot be fully reconstructed, alongside an immediate rollback to the last fully-explainable state.

---

## Risk Summary Table

| # | Risk | Probability | Severity | Primary Prevention |
|---|---|---|---|---|
| 1 | Confidence inflation from an untested streak | High | High | Sample-size floor, regime/concentration checks, change-magnitude cap |
| 2 | Committee-member collapse | Medium | High | Hard-coded minimum member influence floor |
| 3 | Leakage via future regrade/backfill features | Medium | High | Enforce no-update-path rule on audit-critical tables |
| 4 | Optimizing against a benchmark of zero | High | High | Populate `benchmarkReturnPct` before Phase D begins |
| 5 | Non-explainable weight changes | High | Medium-High | Build weight-change-log table before any adaptation runs |
