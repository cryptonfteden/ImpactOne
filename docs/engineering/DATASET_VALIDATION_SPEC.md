# Dataset Validation Spec — Phase D1

Specification for the Dataset Validator Engine (`backend/services/qualityPlatform/datasetValidatorService.js`) and its supporting checks. Read-only throughout — nothing described here corrects, rewrites, or deletes any persisted row.

## Status Definitions

| Status | Meaning | Assigned when |
|---|---|---|
| **READY** | Every required and every honestly-nullable field this phase can capture is present. Fully usable for any future learning process. | DecisionTrace exists, Outcome is gradeable (not UNGRADEABLE), a real unified committee (Sprint 41+) is present, a real benchmark and end price exist, sector is known, regime is known (not UNKNOWN), evidence-matrix snapshot and benchmark version are both present. |
| **PARTIAL** | Core learnable fields are present (real committee, real graded outcome, real benchmark) but one or more honestly-nullable fields are absent (no known sector, regime UNKNOWN, no evidence-matrix snapshot, no benchmark version, no performance metrics). Usable for aggregate learning; must be excluded from any segment keyed by the missing field. | Everything in READY except at least one of the above. |
| **INVALID** | Missing a field with no honest fallback, or no real win/loss signal exists at all. Never usable for learning. | No `Recommendation` row (structurally shouldn't happen); no `DecisionTrace` row; grading window has elapsed with no `Outcome` recorded; `Outcome.gradeLabel === "UNGRADEABLE"`. |
| **CONTAMINATED** | Passes the above checks but fails an integrity rule — the data exists but cannot be honestly trusted for comparison. | `DecisionTrace.committeeDebate` predates the Sprint 41 unified committee or has no committee data; a graded `Outcome` has no benchmark or no real end price; flagged by any of the six `outcomeValidationService` integrity checks (duplicate grading, invalid lifecycle, time inconsistency, future timestamp). |
| **UNKNOWN** | Not yet determinable — grading is still pending. Not a defect. | `DecisionTrace` exists, no `Outcome` exists yet, and the D1 (24h) grading window has not yet elapsed for this recommendation. |

## Classification Algorithm (as implemented)

```
1. Recommendation missing            → INVALID
2. DecisionTrace missing             → INVALID
3. Outcome missing:
     a. grading window not elapsed   → UNKNOWN
     b. grading window elapsed       → INVALID
4. Outcome.gradeLabel === UNGRADEABLE → INVALID
5. DecisionTrace has no unified committee data → CONTAMINATED
6. Outcome has no benchmark          → CONTAMINATED
7. Outcome has no real end price     → CONTAMINATED
8. [Bulk mode only] Flagged by outcome/lifecycle integrity validation → CONTAMINATED
   (reclassifies any non-INVALID result)
9. Any honestly-nullable field absent (sector, regime, evidence-matrix
   snapshot, benchmark version, performance metrics) → PARTIAL
10. Otherwise                        → READY
```

Step 8 only runs in `validateAllRecommendations()` (the bulk path), which cross-references every row against one shared pass of `outcomeValidationService.runOutcomeValidation()` rather than re-querying per row — this is a performance optimization, not a difference in rules.

## Outcome Validation Checks (`outcomeValidationService.js`)

| Check | Detects | Method |
|---|---|---|
| Duplicate grading | More than one `Outcome` row for the same `(recommendationId, timeWindow, methodologyVersion)` | Structurally prevented by the database's own unique constraint; this check is a defensive regression proof, not expected to ever find anything in practice. |
| Missing grading | A `WorldMemoryPrediction` older than the D1 grading window with no corresponding `Outcome` | Real query: predictions past cutoff, minus recommendation ids already graded. |
| Invalid lifecycle | A `RecommendationLifecycleEvent` sequence that violates the real, defined state-transition graph (e.g. a terminal state followed by a non-VIEWED event, or a state whose real predecessor never occurred) | Walks each recommendation's real lifecycle events in order against a fixed `VALID_PREDECESSORS` table. |
| Missing benchmark | A gradeable `Outcome` (`gradeLabel !== UNGRADEABLE`) with no `benchmarkSymbol` | Direct query. |
| Missing prices | A gradeable `Outcome` with a non-finite or missing end price | Direct query (start price is a required DB column and can never be missing at the schema level). |
| Time inconsistencies / future timestamps | A lifecycle event or `Outcome.gradedAt` dated before its own recommendation's `createdAt`, or dated in the future | Real timestamp comparison against `Date.now()` and the recommendation's own `createdAt`. |

## Dataset Quality Report Metrics (`datasetQualityReportService.js`)

| Metric | Formula |
|---|---|
| Completion % | `(READY + PARTIAL) / totalRecommendations × 100` |
| Benchmark coverage % | `outcomes with a real benchmarkSymbol / gradeable outcomes × 100` |
| Regime coverage % | `DecisionTraces with a known (non-UNKNOWN) regime / total DecisionTraces × 100` |
| Evidence coverage % | `DecisionTraces whose committee members carry at least one real evidence citation / total DecisionTraces × 100` |
| Committee attribution % | `DecisionTraces with real committee.members[] / total DecisionTraces × 100` |
| Provider attribution % | `DecisionTraces whose evidence-matrix snapshot has at least one non-UNAVAILABLE category / DecisionTraces with a snapshot at all × 100` |
| Outcome coverage % | `total Outcomes / total Recommendations × 100` |
| Unknown % | `recommendations classified UNKNOWN / totalRecommendations × 100` |

Every metric is `null`, never a fabricated `0%`/`100%`, when its denominator is zero.

## Data Completeness Audit (`learningFieldAuditService.js`)

Every field named in `LEARNING_DATA_CONTRACT.md` §1.1 is classified exactly once, into one of five categories:

- **MISSING** — should exist as a real backend field, does not yet (currently: **Asset class** only — no canonical backend field exists anywhere in this codebase; only ad hoc frontend heuristics).
- **NULLABLE** — honestly absent sometimes, by design (Sector, Entry price, Exit price, Benchmark, Benchmark return, Absolute return, Outcome).
- **DERIVED** — computed from other already-stored fields rather than stored independently (Recommendation ID, DecisionTrace ID, Asset symbol, Time window, Alpha).
- **IMPOSSIBLE** — not currently assigned to any field in this phase; reserved for a future field that genuinely cannot be captured without violating temporal integrity even going forward.
- **LEGACY** — real, capturable field that simply didn't exist before a specific migration/sprint boundary; older rows honestly lack it forever (Market regime, Committee votes, CIO decision, Evidence categories, Provider snapshot, Data freshness, Lifecycle state).

Each field's audit entry also carries a real, computed `presencePct` over the current dataset — never a static or assumed number.
