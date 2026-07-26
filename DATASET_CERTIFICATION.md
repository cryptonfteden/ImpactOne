# Dataset Certification
## Phase D1.5 — Certify or Reject the Learning Dataset

**Method:** this certification is based on direct, read-only queries against the live Postgres database (still reachable on port 5432 despite the Express API on port 5000 remaining down — now its 6th consecutive session offline). All figures below reflect the dataset's actual current state, re-verified today and unchanged from Sprint D1's snapshot, because the autonomous engine itself has not run since the outage began (see Operational Failures). This certification treats every one of the 96 currently-graded `Outcome` rows as a claimed "READY observation" and attempts, item by item, to prove it should not be certified as such.

---

## Audit Findings

### READY Observations
There is no explicit "READY" flag anywhere in the schema or codebase — the closest real proxy is an `Outcome` row with a `gradeLabel` other than `UNGRADEABLE`. By that definition, **96 of 100 predictions are nominally "ready"** (0 are `UNGRADEABLE`, 4 remain pending). But nominal readiness (a row exists, a grade was assigned) is not the same claim as trustworthy readiness — see the Challenge section below.

### Benchmark Population
**0 of 96.** No graded outcome has a populated `benchmarkReturnPct`, `riskAdjustedReturnPct`, or `benchmarkSymbol`. Unchanged since Sprint D1's snapshot.

### Alpha Population
**0 of 96.** Alpha requires a benchmark-relative return; since no benchmark exists on any row, alpha does not exist anywhere in this dataset today. What exists instead is raw price return, which is internally consistent arithmetic (re-verified) but is not alpha.

### Validator Classifications
The only real "validator" output in this system is `Outcome.gradeLabel`. Current distribution: **1 `CORRECT`, 90 `PARTIALLY_CORRECT`, 5 `INCORRECT`, 0 `UNGRADEABLE`.** Zero `UNGRADEABLE` rows is worth noting on its own: the grading algorithm has a defined path for "no live quote was available" and has never once taken it in this dataset's history — either every grading attempt has had good luck with quote availability, or the underlying symbols (AAPL/NVDA/TSLA, all highly liquid) make that path structurally unlikely to ever trigger. Either way, this specific failure path is effectively untested in practice.

### Duplicate Observations
**Confirmed and unchanged from Sprint D1: 212 of 279 recommendations (76%) are exact-content duplicates across 9 groups; 68 of 96 graded outcomes (70.8%) are duplicate-content.**

### Broken References
**Confirmed and unchanged: 2 `WorldMemoryPrediction` rows reference a `recommendationId` that has never existed; 2 `SUPERSEDED` recommendations have a `supersededById` pointing to a nonexistent recommendation.**

### Historical Integrity
No new violations found on re-check: zero future-dated rows, zero outcomes graded before their recommendation's `createdAt`, and recomputed returns matched stored `windowReturnPct` in all 96 rows.

### Operational Failures
This is the most important new finding this pass, because it was not checked in Sprint D1:

- **The autonomous recommendation engine has not run since 2026-07-20T19:30:01 — its very last logged run.** 354 `AutonomousRunLog` rows exist in total, and the most recent 20+ show zero errors, but the engine has been completely silent for roughly two days, exactly matching the known backend outage. This dataset is not merely imperfect — it is **frozen**, and every finding in this report and in Sprint D1 describes a dataset that has not grown or changed at all during that time.
- **A large fraction of the engine's own run history produced zero recommendations** (many consecutive 30-minute cycles logged `recommendationsGenerated: 0`), while other periods produced the same exact recommendation repeatedly for hours (see Duplicate Observations). Neither pattern looks like a system responding proportionally to real, changing signal.
- **Provider run logs report 100% `SUCCESS` in the most recent 30 runs** (9,370 total logged historically), yet the entire database contains exactly one real, non-stub ingested `CanonicalEvent` row across its whole life. This is a "false success" pattern: the system's own operational logging says everything is healthy while the substance behind that health signal is nearly empty. An operator or auditor trusting the `SUCCESS` label alone would have no way to know this from the log itself.

---

## Challenge: Attempting to Disprove Every "READY" Observation

Taking each of the 96 graded outcomes as a claimed-ready data point and testing it against the criteria a genuine learning system would need:

| Test | Result | Verdict on readiness |
|---|---|---|
| Is this observation statistically independent of the others? | No — 68/96 (70.8%) belong to a duplicate-content group sharing the same underlying signal | **Fails.** Not independent; inflates apparent sample size. |
| Does this observation carry a benchmark-relative return? | No — 0/96 have any benchmark data | **Fails.** Cannot distinguish this "win" from the market moving. |
| Is this observation backed by real, attributable evidence? | No, effectively — only 1 real `CanonicalEvent` exists in the entire database; the rest of `evidenceReferences`'s 100% population rate reflects populated JSON, not real evidence volume | **Fails.** Evidence backing is nominal, not substantive. |
| Is this observation linked to a verifiably intact recommendation lineage? | Partially — none of the 96 `Outcome` rows themselves are orphaned, but 2 unrelated `WorldMemoryPrediction`/supersession links elsewhere in the same dataset are broken, indicating the underlying write pipeline is not fully reliable | **Passes narrowly, with a caveat.** |
| Is this observation attributable to a specific committee member or evidence category? | No — no member-to-outcome or evidence-category-to-outcome link exists | **Fails.** Cannot answer any per-member or per-category question with it. |
| Is this observation drawn from more than one time window or methodology, to rule out a window-specific artifact? | No — 100% of graded outcomes use `D1` and `sprint29-v1` exclusively | **Fails.** Single-window, single-methodology; unproven beyond 24-hour noise. |
| Is this observation part of a diverse, representative sample? | No — only 3 symbols exist in the dataset's entire history | **Fails.** Any pattern found is a pattern about three large-cap tech names, not a generalizable one. |

**Of seven substantive readiness tests, six fail outright and one passes only narrowly.** Zero of the 96 nominally "ready" observations survive this challenge as data a rigorous learning process should train on without remediation.
