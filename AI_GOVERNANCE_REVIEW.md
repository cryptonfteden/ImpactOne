# AI Governance Review — Phase X11

**Scope:** Can every model/methodology change be audited? Is the learning process statistically and operationally safe against runaway or unauthorized self-modification? Cross-checked `VISION.md`'s explicit governance principles, `OUTCOME_INTELLIGENCE_ENGINE.md`'s designed (not built) governance model, `schema.prisma`, and live repo state (git log/status).

---

## 1. What governance model is *designed*

`VISION.md` states, as ratified platform principles (not aspirational copy — this document is treated elsewhere in this repo's own audit trail as a binding standard):

> "Recalibration is proposed, backtested, and reviewed — never silently applied. A scoring constant changes via a normal, git-reviewed code change with a documented rationale and a passing backtest, not a live database toggle flipped by an automated process without a human in the loop..."
> "A silently self-modifying system... Every constant that shapes a recommendation changes through a reviewable process with a name attached to the decision — never an opaque, automatic mutation with no audit trail."

`OUTCOME_INTELLIGENCE_ENGINE.md` §12 designs the concrete mechanism for this: a `RecalibrationProposal` table (`proposedChange` JSON naming a specific constant, `rationale` citing specific `AttributionSnapshot`/`CalibrationBucket`/`DriftAlert` rows, `backtestResult`, a `PROPOSED → APPROVED → APPLIED/REJECTED` status enum, `reviewedBy`, `appliedCommitSha` linking the proposal to the actual code commit that changed the constant), plus a `DriftAlert` mechanism (§11) that only ever *observes* — "drift detection never triggers an automatic change — it only makes drift visible... not an authorization to act."

This is a genuinely sound design: proposal → cited evidence → backtest → human approval → normal git commit → linked commit SHA is a real, auditable chain if built.

## 2. What actually exists

**None of it.** Confirmed directly against `schema.prisma`: `RecalibrationProposal`, `DriftAlert`, `CalibrationBucket`, and `AttributionSnapshot` — all four tables named in the design — **do not exist**. Only `BetaUser` and `FeatureFlag` exist as schema additions beyond what earlier sessions already reviewed. `PROJECT_STATUS.md`'s own Sprint 21B scope note confirms this was a deliberate, disclosed deferral ("left for the grading-engine sprint that actually needs them"), and no subsequent sprint (through Sprint 42 and Phase X10/D1) has built them.

Where does that leave the actual audit trail today?

| Governance need | What exists | What's missing |
|---|---|---|
| A record of *what* the methodology is | `METHODOLOGY_VERSION = "sprint29-v1"` stamped on every `Outcome`; `BENCHMARK_PIPELINE_VERSION = "d1-v1"` stamped alongside real benchmarks | No changelog object — just a string constant in source |
| A record of *when/why* it changed | Git commit history, in principle | **Never exercised**: live query confirms 100% of 138 graded outcomes carry the single value `"sprint29-v1"` — the methodology has literally never changed since it shipped, so there is nothing yet to audit a transition of |
| A record of a *proposed* weight/constant change | — | Does not exist. No `RecalibrationProposal` table, no PR template, no process artifact anywhere in the repo tying a `QUALITY_WEIGHTS` edit to a cited rationale |
| Detection that recalibration is *needed* | — | No `DriftAlert` equivalent. `calibrationReportService`'s trend label (`improving`/`declining`/`stable`) is the closest real analogue, but it is a read-only report, not a monitored/alerted signal, and nothing consumes it automatically |
| A record of *who* approved a change | — | No `reviewedBy`/approval workflow exists for methodology/weight changes specifically. `featureFlagService.js` (Phase X9) is real, working infrastructure for *toggling features* (`ENABLED/DISABLED/BETA_ONLY/USER_SPECIFIC`), but live query confirms **0 flags have ever been created** — it is not in use for gating any learning-related change today |

## 3. Is this safe?

**Yes, but only because the system cannot currently do the thing being asked about.**

There is no code path anywhere in the reviewed services (`autonomousRecommendationEngine.js`, `autonomousMarketService.js`, `outcomeGradingService.js`, `calibrationReportService.js`, `newsSourceScoringService.js`, `marketMemoryService.js`) that writes to `QUALITY_WEIGHTS`, `HIGH_QUALITY_NEWS_SOURCES`, `sourceQualityScore()`'s thresholds, or any other scoring constant at runtime. Every constant is a hardcoded JS object or literal, changeable only by editing the source file and committing — i.e., the *only* mechanism that exists today for changing methodology is already exactly the one `VISION.md` mandates ("a normal, git-reviewed code change"). This is a real, valid form of safety: **the absence of an automated self-modification pathway is itself a safety guarantee**, just an accidental/default one rather than a deliberately engineered gate.

This has a specific, important consequence for certification: **the platform is not "safely self-improving" — it is safe because it is not self-improving at all.** A system that cannot change itself cannot violate a governance policy about how it changes itself. If and when stage 6 of `LEARNING_LOOP_REVIEW.md` (feeding outcome data back into generation) is ever built, this governance gap becomes load-bearing rather than moot — and today, none of the four designed safety tables exist to catch it.

## 4. Adjacent, previously-identified integrity gaps that bear directly on auditability

Reused from prior-session findings, reconfirmed relevant here rather than re-investigated from scratch:

- **`DecisionTrace` immutability is convention-only, not DB-enforced** — no `.update()` method exists in the repository layer, but no database trigger/constraint prevents one being added later. The audit trail's core "this decision, once made, is never rewritten" guarantee rests on code discipline, not a hard constraint.
- **`WorldMemoryRepository`'s append-only guarantee is enforced by a source-scanning test**, not a database constraint either — a real, clever mitigation (a test that strips comments and asserts no `.update()`/`.delete()`/`.upsert()` exists anywhere in the file), but still a convention backstopped by CI, not a structural guarantee.
- **Referential integrity gaps exist in the live dataset**: `Outcome.recommendationId` has no enforced FK to `Recommendation` (a plain string, unlike almost every other relation in the schema) — confirmed in an earlier session to have produced 2 real orphaned `WorldMemoryPrediction` rows referencing a nonexistent recommendation. Any future audit trail that assumes 1:1 lineage integrity should verify this hasn't grown.
- **70% duplicate-content contamination** (`LEARNING_LOOP_REVIEW.md` §6) is itself a governance-relevant fact: even if `RecalibrationProposal`'s `backtestResult` were built today, backtesting "the accumulated `Outcome` corpus" per the design doc's own wording would be backtesting against a corpus that is 70% non-independent repeats — a real risk of a future recalibration proposal citing an artificially large, artificially confident sample as its rationale.

## 5. Answering the mission's governance questions directly

- **"Can every model change be audited?"** Trivially yes today, because there has been exactly one model/methodology version ever (`sprint29-v1`) and it has never changed — git history is a fully sufficient audit trail for zero transitions. This has not been tested against a real methodology change, because none has happened. The infrastructure specifically designed to make a *future* change auditable (`RecalibrationProposal`) does not exist yet.
- **"Is the learning process statistically safe?"** Yes, in the narrow sense that nothing currently learns (self-modifies) at all, so there is no statistical process to be unsafe. The components that *do* compute statistics (`calibrationReportService`, `newsSourceScoringService`) do so honestly (real null-when-insufficient-data handling throughout) but without correcting for the duplicate-content non-independence problem, and are not yet connected to anything that would act on their output — so today's real risk is not "unsafe learning" but "any future wiring of these components would inherit an uncorrected sample-independence flaw from day one."

See `X11_VERDICT.md` for the certification decision synthesizing this with `LEARNING_LOOP_REVIEW.md` and `CALIBRATION_REVIEW.md`.
