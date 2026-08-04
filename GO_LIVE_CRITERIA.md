# Go-Live Criteria — ImpactOne

**Phase:** LAUNCH-PLAN-001. Companion to [LAUNCH_ROADMAP.md](LAUNCH_ROADMAP.md) and [MVP_VS_V2.md](MVP_VS_V2.md). Documentation only. Follows this engagement's own established `IMPACTONE_RELEASE_GATES.md` precedent: **objective, evidence-based gates, no exceptions to Blocking gates, no doc-only sign-off.**

---

## Gate 1 — Security & Access Control (Blocking)

| Criterion | Pass condition | Required evidence |
|---|---|---|
| Authentication exists on every non-public endpoint | A real auth middleware is present and enforced | A passing test that a request without valid credentials is rejected (401/403), run fresh, not assumed from a code read |
| Rate limiting exists on every public-facing route | A real rate-limiting mechanism is present and enforced | A passing test demonstrating a request is throttled past a defined threshold |
| The Agent Scheduler's shared concurrency pool cannot be monopolized by a single unauthenticated caller | The auth/rate-limit layer above specifically covers Agent Platform routes | Confirmed via the same test evidence as the two rows above, explicitly scoped to `/v2/agent-orchestrator`/`/v2/unified-stock-intelligence`/`/v2/agent-diagnostics` |

**Fail condition**: any row above without passing, fresh test evidence. A code review or a design document describing intended auth is not sufficient evidence — this engagement's own history includes multiple instances of designed-but-unverified fixes turning out to be incomplete on live re-test.

## Gate 2 — Operational Foundation (Blocking)

| Criterion | Pass condition | Required evidence |
|---|---|---|
| CI runs the full test suite on every commit | A real CI pipeline exists and has run successfully at least once against the current `HEAD` | A CI run log/output showing the full backend and frontend suites passing |
| `npm run build` succeeds | A fresh, direct run of the production build command completes without error | Terminal output of a fresh `npm run build` run, not assumed from a prior session |
| Basic structured logging exists in the Agent Platform | `agentScheduler`/`agentOrchestrator`/`agentObservability`/`agentClaimBridge` emit real log lines for key lifecycle events | A direct code read confirming logger calls exist, plus a live request producing a real log line |
| A database backup/DR procedure exists | A documented, tested backup-and-restore procedure exists | A successful test restore from a real backup, or at minimum a documented, reviewed procedure if a full restore test is not yet feasible |

**Fail condition**: any row without the required evidence. A "we plan to add this" statement does not satisfy any row.

## Gate 3 — Data Quality (Blocking)

| Criterion | Pass condition | Required evidence |
|---|---|---|
| The graded Recommendation/Outcome dataset's current duplicate-content contamination rate is known | A fresh live-database query (this engagement's own established Sprint-D1-style technique) has been run against the current dataset | The query's real output, with an explicit percentage figure, dated to this specific gate check — not the ~70-76% figure from several phases ago, treated as current without re-verification |
| No new referential-integrity breaks exist | A fresh check for orphaned `WorldMemoryPrediction`/`SUPERSEDED`-recommendation references | The query's real output |

**Fail condition**: proceeding to launch without a *current*, dated contamination figure — reusing a stale number from an earlier phase as if it were still accurate is an explicit fail, not a pass with a caveat.

## Gate 4 — Intelligence Architecture Integrity (Blocking, but already substantially passing)

| Criterion | Pass condition | Required evidence |
|---|---|---|
| The Claim Intelligence integration functions correctly | The `agentClaimBridge` test suite passes | **Already satisfied this session**: 15/15 tests independently re-run and passing |
| The Outcome Calibration Engine functions correctly (even if its data volume is not yet sufficient) | The `outcomeCalibration` test suite passes, and it honestly reports insufficient-data rather than fabricating | **Already satisfied this session**: 34/34 tests independently re-run and passing, confirmed to honestly gate on real minimum-sample-size thresholds |
| No agent fabricates a confidence value when its own `dataAvailable` is false | Spot-check at least 3 of the 14 agents' `confidenceModel.js` files | **Already satisfied**: confirmed across 6 agents reviewed this same day (Institutional, Macro, Insider, ETF Flow, Analyst Consensus, plus the Claim Layer's own dominance-cap logic) |

**This gate is currently PASSING** based on this session's own direct verification — listed here for completeness and as the template for how future re-verification of this gate should be performed (re-run the tests fresh, do not trust a prior pass count).

## Gate 5 — Nice-to-Have Cleanups (Non-blocking, tracked for completeness)

| Criterion | Pass condition | Required evidence |
|---|---|---|
| `technical`/`fibonacci` added to Unified Stock Intelligence | The one-line `TARGET_AGENT_IDS` change has shipped | A diff/commit reference |
| 14 confidence formulas registered in `scoringVocabulary.js` | New `SCORE_DEFINITIONS` entries exist for each agent | A diff/commit reference |

**This gate does not block launch** — included here only so it is not silently forgotten, per `LAUNCH_ROADMAP.md` Milestone 4.

---

## Overall Go-Live decision rule

**GO** requires Gates 1, 2, 3, and 4 all PASS with the specific evidence listed above — no exceptions, no "mostly passing," consistent with this engagement's own established `IMPACTONE_RELEASE_GATES.md` "no exceptions to Blocking Issues" rule. Gate 5's status does not affect the GO/NO-GO decision.

**As of this document's writing**: Gate 4 is confirmed PASSING (independently verified this session). Gates 1, 2, and 3 have **not yet been verified** — their pass/fail status must be checked fresh, with real evidence, before any launch decision is made. This document does not itself constitute that verification; it defines what verification must look like.
