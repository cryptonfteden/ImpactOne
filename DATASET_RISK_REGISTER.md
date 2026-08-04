# Dataset Risk Register
## Phase D — D1 Data Auditor

All risks below are grounded in direct query results against the live database (2026-07-22 snapshot), not hypothetical projections.

---

### Risk 1 — Duplicate-Content Recommendations Inflate Effective Sample Size

**Description:** 212 of 279 recommendations (76%) belong to one of 9 exact-content duplicate groups (same symbol, action, confidence score, reasoning), the largest spanning 39 rows over ~9 hours. 68 of 96 already-graded outcomes (70.8%) are duplicate-content.

- **Probability:** Certain — already present in the current dataset, confirmed by direct query, not a future risk.
- **Severity:** Critical. Any learning process trained on this data would treat one real signal, repeated 39 times, as 39 independent confirmations — a severe, silent inflation of statistical confidence with no true increase in evidence.
- **Detection method:** a standing duplicate-content check (symbol + action + confidence + reasoning hash) run against the recommendation table on a schedule, surfacing the duplication rate as a first-class dataset-health metric.
- **Prevention:** de-duplicate at the observation level before any learning process consumes this data — either by collapsing a duplicate-content run into a single observation, or by explicitly down-weighting observations proportional to how many duplicates they belong to.
- **Recovery:** if adaptive learning has already trained on this data, discard and retrain from a de-duplicated view; do not attempt to "correct" weights in place, since the contamination is structural, not a small offset.

---

### Risk 2 — Complete Absence of Benchmark Data

**Description:** 0 of 96 graded outcomes have any benchmark information at all — no return, no risk-adjusted return, no benchmark symbol.

- **Probability:** Certain — confirmed present state, not a future risk.
- **Severity:** Critical. Every "hit" in the current dataset could simply be the market going up; there is no way today to tell a real edge from broad market movement.
- **Detection method:** a mandatory check, before any learning pipeline runs, that a minimum percentage of the training sample has a populated benchmark; block the pipeline if it does not.
- **Prevention:** populate `benchmarkReturnPct`/`benchmarkSymbol` on every future `Outcome` row as part of the grading process itself, not as an optional enrichment step.
- **Recovery:** none available retroactively for existing ungraded-benchmark rows without re-fetching historical benchmark prices for the exact grading windows already used — feasible, but must be done deliberately and labeled as a backfill, never silently blended with any future outcomes that were benchmarked correctly the first time.

---

### Risk 3 — Broken Referential Links (Confirmed, Not Hypothetical)

**Description:** 2 `SUPERSEDED` recommendations point to a `supersededById` that does not exist; 2 `WorldMemoryPrediction` rows reference a `recommendationId` that has never existed in the `Recommendation` table.

- **Probability:** Certain — found in the live dataset today, in a database with only 279 recommendation rows total, meaning the actual rate of this problem (2/279 ≈ 0.7% on each axis) is nontrivial for a dataset this size and young (8 days old).
- **Severity:** Medium-High. Not catastrophic in isolation, but a system that already produces dangling references at this rate, this early, will produce more of them as volume grows — and any join-based analysis that doesn't defensively check for this will silently drop or mis-analyze affected rows.
- **Detection method:** a standing referential-integrity check (equivalent to what a real foreign key would enforce) run against `Outcome.recommendationId`, `WorldMemoryPrediction.recommendationId`, and `Recommendation.supersededById`, alerting on any dangling reference.
- **Prevention:** add real database-level foreign key constraints where currently only a plain `String` column exists (most importantly `Outcome.recommendationId`), so the database itself rejects a write that would create a dangling reference, rather than relying on application code to always get it right.
- **Recovery:** investigate the specific write path that produced the 4 known dangling rows (2 supersession links, 2 predictions) to determine root cause before Phase D begins — an unexplained integrity break should never be left unexplained going into an adaptive-learning phase.

---

### Risk 4 — Zero Symbol Diversity

**Description:** the entire 279-row dataset covers exactly 3 symbols (NVDA 90, TSLA 46, AAPL 143) — no other ticker appears anywhere in the recommendation history.

- **Probability:** Certain — confirmed present state.
- **Severity:** High. Any claim of generalizable skill from this dataset is, today, a claim about three large-cap technology names during one specific eight-day window — nothing more.
- **Detection method:** track symbol-diversity count and distribution as a standing dataset-health metric; require a minimum diversity threshold before treating aggregate statistics as representative.
- **Prevention:** expand the evaluated universe beyond the hardcoded `DEFAULT_WATCHLIST` before drawing any conclusion intended to generalize beyond these three symbols.
- **Recovery:** none needed for existing data — simply label any conclusion drawn from this dataset as scoped to these three symbols only, and do not extrapolate.

---

### Risk 5 — Near-Total Evidence and Provider Thinness

**Description:** the entire database contains exactly one real, persisted `CanonicalEvent` row, from exactly one provider (`cftcCot`), despite 279 recommendations and 279 `DecisionTrace` rows each carrying a populated `evidenceReferences` field.

- **Probability:** Certain — confirmed present state.
- **Severity:** High. Evidence-attribution and provider-attribution questions (which evidence category performs worst, which provider's data is trustworthy) are not just hard to answer — they are backed by essentially a single data point today, no matter how populated the JSON fields around them look.
- **Detection method:** track real (non-stub) `CanonicalEvent` count per provider over time as a standing health metric, distinct from the existing `providerHealthService` uptime tracking (which reports 100% "success" for stub providers that return nothing).
- **Prevention:** do not treat a populated JSON field (`evidenceReferences`) as equivalent to real evidence coverage; require a minimum count of real, non-stub `CanonicalEvent` rows before any evidence-attribution question is considered answerable.
- **Recovery:** none available retroactively; this requires the underlying provider integrations (currently 14 of 15 are stubs, per Sprint 42) to be built out before evidence attribution can be meaningfully audited at all.

---

## Risk Summary Table

| # | Risk | Probability | Severity | Primary Prevention |
|---|---|---|---|---|
| 1 | Duplicate-content recommendations inflate sample size | Certain | Critical | De-duplicate observations before any learning process consumes them |
| 2 | Complete absence of benchmark data | Certain | Critical | Populate benchmark fields as part of grading itself |
| 3 | Broken referential links (2 + 2 confirmed) | Certain | Medium-High | Add real database-level foreign key constraints |
| 4 | Zero symbol diversity (3 symbols total) | Certain | High | Expand evaluated universe before generalizing |
| 5 | Near-total evidence/provider thinness (1 real event) | Certain | High | Require minimum real evidence count before attribution claims |
