# Dataset Audit
## Phase D — D1 Data Auditor: Can the Learning Dataset Be Trusted?

**Method — and why this audit differs from Sprints 42/43:** for this review, the live Postgres database (port 5432) was found to be running even though the Express API (port 5000) remains down for the fifth consecutive session. This made it possible to run direct, read-only queries against the **real, current dataset** rather than auditing the schema and code in the abstract. Every finding below is an empirical result from the actual stored data, not a hypothetical risk — dataset snapshot taken 2026-07-22, covering recommendations created 2026-07-12 through 2026-07-20 (279 total). No write, update, or delete operation was issued against the database at any point.

---

## Headline Finding

**76% of the entire recommendation dataset (212 of 279 rows) consists of exact-content duplicates** — groups of recommendations sharing identical symbol, action, confidence score, and reasoning text, each stored as its own row and each capable of producing its own independently-graded outcome. The largest single group is 39 byte-identical NVDA BUY recommendations spanning roughly nine hours. Of the 96 outcomes graded so far, **68 (70.8%) belong to one of these duplicate-content groups.** This is the single most important fact in this audit and is addressed first because it invalidates the independence assumption that any future learning or statistical process would need.

---

## Audit by Requested Area

### Recommendation Completeness
**Strong on structure, weak on coverage.** Every one of the 279 recommendations has exactly one `DecisionTrace` (279/279 — perfect 1:1, zero missing traces). But only 96 of 100 `WorldMemoryPrediction` rows have been graded into an `Outcome` (4 pending), and only the `D1` (24-hour) time window has ever been graded — `W1/M1/M3/M6/Y1` have zero rows despite being modeled in the schema. Coverage is real but shallow: 8 days of history, one grading window, one methodology version (`sprint29-v1`).

### Benchmark Correctness
**Absent, not merely incomplete.** Of 96 graded outcomes, **0 have a populated `benchmarkReturnPct`, 0 have a populated `riskAdjustedReturnPct`, and 0 even have a populated `benchmarkSymbol`.** This is a complete absence, empirically confirmed, not a partial gap — every single graded outcome in the database today reports a raw price return with no benchmark attached at all.

### Alpha Correctness
**No impossible values found; the math that exists is internally consistent.** Recomputing `windowReturnPct` from `windowStartPrice`/`windowEndPrice` for all 96 outcomes matched the stored value in every case (no discrepancy beyond rounding), no non-positive prices were found, and no outcome exceeded a sane return magnitude. This is a genuine strength — but "alpha" itself does not exist in this dataset today (see Benchmark Correctness); what was checked here is raw-return arithmetic, not alpha.

### Committee Attribution
**Structurally present, but not usably attributable.** 279/279 `DecisionTrace` rows have a populated `committeeDebate` JSON blob — better coverage than expected. But (consistent with Sprints 42/43) there is still no table linking an individual member's vote to a specific outcome grade, so this populated data cannot currently answer any per-member performance question.

### Evidence Attribution
**Severely thin.** The entire database contains exactly **one** `CanonicalEvent` row (`providerId: cftcCot`, category `macro`, ingested 2026-07-19). `DecisionTrace.evidenceReferences` is populated on all 279 rows (100%), but with virtually no real ingested canonical evidence behind it, this population rate measures that a JSON field was written, not that meaningful structured evidence exists to attribute performance to.

### Provider Attribution
Consistent with the single `CanonicalEvent` row: only one provider (`cftcCot`) has ever produced a real, persisted event in this dataset's entire history. Provider-level attribution of outcomes is not currently possible beyond that one provider, for lack of data from any other source.

### Market Regime Snapshots
No regime value is stored as a queryable field on any `Recommendation` or `Outcome` row (confirmed in Sprint 43); this audit did not find a separate regime-snapshot table populated either. Regime, if used at all, lives only inside unindexed JSON.

### Lifecycle Integrity
**Mostly strong, with two confirmed, real breaks.** Recommendation status breakdown: 278 `SUPERSEDED`, 1 `ACTIVE` — a healthy, expected churn pattern for a system that re-evaluates every 30 minutes. But:
- **2 `SUPERSEDED` recommendations have a `supersededById` pointing to a recommendation ID that does not exist anywhere in the table** — a broken supersession chain, confirmed by direct query, not inferred.
- **2 `WorldMemoryPrediction` rows reference a `recommendationId` that has never existed in the `Recommendation` table** (both predicted 2026-07-21T15:22:36, roughly a minute apart, both `BUY`) — a second, independently confirmed referential break.

Neither break is explainable by deletion (no delete code path exists anywhere in the repository, confirmed in Sprint 43) — these dangling references most likely originate from a write-ordering or transaction issue in whatever process created them, not from data being removed after the fact. Either way, they are real, present in the live dataset today, and would silently corrupt any join-based analysis that assumes referential integrity.

### DecisionTrace Immutability
No two `DecisionTrace` rows for the same `recommendationId` were found (1:1 confirmed), and no content-mismatch was found between rows with matching IDs, consistent with the "no update method exists" finding from Sprint 43. Empirically holds today; still convention-enforced rather than database-enforced (see Sprint 43's finding, unchanged).

### Outcome Grading
Grade label distribution across the 96 graded outcomes: **1 `CORRECT`, 90 `PARTIALLY_CORRECT`, 5 `INCORRECT`.** Given the grading algorithm requires a move of at least 2% to earn a full `CORRECT` label, this distribution says the system is calling direction right far more often than it's calling magnitude right — expected for 24-hour windows, but a reminder that "91 of 96 correct-ish" is not the same claim as "91 of 96 confidently, meaningfully correct."

---

## Attempts to Break the Dataset

| Attack | Result |
|---|---|
| Missing observations | 4 of 100 predictions still lack a graded outcome (likely just pending, within the grading window) — minor, not alarming on its own. |
| Duplicate observations | **Confirmed, severe.** 212/279 recommendations (76%) belong to an exact-content duplicate group; 68/96 (70.8%) of already-graded outcomes are duplicate-content. |
| Conflicting timestamps | None found — no outcome graded before its recommendation was created (`gradedBeforeCreatedConflicts`: empty). |
| Missing benchmarks | **Confirmed, complete.** 0 of 96 outcomes have any benchmark data (return, risk-adjusted, or even a benchmark symbol). |
| Impossible alpha | None found — all price/return math is internally consistent; no negative or zero prices, no extreme return magnitudes. |
| Future data | None found — zero recommendations, outcomes, or predictions dated after the current audit time. |
| Regime inconsistencies | Not testable — regime is not a stored, queryable field on any relevant row. |
| Provider inconsistencies | Not really testable at scale — only one provider has ever produced a real event in this dataset. |
| Evidence inconsistencies | Not really testable at scale — same reason; the evidence population is too thin to check for internal contradiction. |

---

## Answers to the Four Specific Questions

**Can two identical recommendations produce different learning observations?**
**Yes — this is not hypothetical, it is the dominant pattern in the live dataset.** 9 distinct groups of byte-identical recommendations exist (same symbol, action, confidence score, and reasoning text), the largest containing 39 rows spanning about nine hours. Each is a separate database row capable of receiving its own independent `Outcome` grade against a different price window — meaning the same underlying signal, stated once by the engine and repeated unchanged across many scan cycles, can and does contribute many "independent" observations to what should be one real decision.

**Can historical recommendations ever change?**
**No, not today.** No update code path exists for `Recommendation` or `DecisionTrace` anywhere in the repository, and no evidence of content drift was found across any row. This is a genuine, confirmed strength.

**Can missing data silently become valid?**
**Not through any currently active code path — but the dataset is completely unguarded against it happening in the future.** No aggregation service in the codebase currently reads `benchmarkReturnPct`, `riskAdjustedReturnPct`, or `benchmarkSymbol` at all (confirmed by repository-wide search), so a null value cannot currently be silently defaulted to zero anywhere — there's simply no consumer yet. But there is also no database constraint, validation guard, or test preventing a future feature from writing `outcome.benchmarkReturnPct ?? 0`, which would silently convert "we never measured this" into "this had zero alpha" — a classic, dangerous, and currently unguarded failure mode.

**Can benchmark revisions rewrite history?**
**Not empirically testable today, because no outcome has ever recorded a benchmark to revise** — but the underlying design leaves this open. `Portfolio.benchmarkSymbol` is a simple, mutable field, frozen only inside `PerformanceSnapshot` rows, not inside `Outcome` rows. If and when outcome-level benchmarking is implemented, it must snapshot the benchmark actually used at grading time onto the `Outcome` row itself — reusing the live, mutable portfolio setting for historical analysis would let a later benchmark change silently reinterpret every past grade.
