# ImpactOne — Outcome Intelligence Engine
## Sprint 19: Technical Design

**Status:** Design only. No application code, migrations, or commits are part of this deliverable.
**Priority:** Highest strategic priority — this closes the loop every prior review (`IMPACTONE_CTO_REVIEW.md`, `INTELLIGENCE_PLATFORM_REVIEW.md`) named as ImpactOne's actual moat and, until now, its most conspicuous gap.
**Grounding constraint:** every mechanism below reuses real, committed Sprint 18A contracts — `backend/services/canonicalVerdict.js`, `backend/services/scoringVocabulary.js`, `backend/services/eventEnvelope.js`, and the `DecisionTrace.committeeDebate`/`evidenceReferences`/`modelVersionMetadata` columns — plus the stable evidence IDs `SPRINT_18B_RIE_IMPLEMENTATION_PLAN.md` establishes. This is not a new set of contracts; it is the first real *consumer* of the ones that already exist, closing the loop those documents were explicitly built toward.
**Terminology:** `Outcome`, `Prediction`, `Lesson`, and every other domain term this design touches are defined exactly once, and this design's Outcome/Recommendation lifecycle is reconciled with `INVESTMENT_INTELLIGENCE_MODEL.md`'s mechanism-vs-timing proposal, in `CANONICAL_DOMAIN_MODEL.md` §1.5 and §2.21.

**Current flow → target flow:**

```
Evidence → Recommendation → DecisionTrace
                                             (this design adds:)
Evidence → Recommendation → DecisionTrace → Outcome → Calibration → Learning → Better Recommendation
```

The Outcome Intelligence Engine (OIE) is a **read-only consumer** of `Recommendation`/`DecisionTrace`. It never mutates them, and it never gains write access to anything upstream of a recommendation being created — the advisory-only invariant is untouched. It only adds new, purely additive tables and a feedback path that terminates in a human-reviewed proposal, never an automatic mutation of a live scoring constant.

---

## Question → mechanism map

The engine must answer eleven specific questions. Each is answered by a named, concrete mechanism below — not a vague aspiration:

| Question | Answered by |
|---|---|
| Was the recommendation correct? By how much? | `Outcome.gradeLabel` / `Outcome.grade` (§1, §3) |
| How long did it take? | `Outcome.timeWindow` graded across all six windows; `Outcome.realizedAtWindowFraction` (§1, §5) |
| Which evidence turned out to be correct? Which was misleading? | `EvidenceOutcomeLink` (§9) |
| Which committee members were right? | `AttributionSnapshot(dimension=COMMITTEE_AGENT)`, built on `canonicalVerdict.normalizeCommitteeVoteToAction` (§7) |
| Which sources consistently outperform? | `AttributionSnapshot(dimension=SOURCE)` (§8) |
| Which sectors have the highest prediction accuracy? | `AttributionSnapshot(dimension=SECTOR)` (§6) |
| Which recommendation patterns work best? | `AttributionSnapshot(dimension=ACTION\|SYMBOL_SOURCE\|QUALITY_BUCKET\|RISK_LABEL\|EVENT_TYPE)` (§6) |
| Which confidence levels are well calibrated? | `CalibrationBucket(scoreType=CONFIDENCE)` (§2, §10) |
| Which recommendation types should become more conservative? | `RecalibrationProposal`, backed by `AttributionSnapshot` + `CalibrationBucket` evidence (§12) |

---

## 1. Outcome model

An `Outcome` is the graded result of **one `Recommendation` at one time window** — not one row per recommendation. A single recommendation accumulates up to six `Outcome` rows over its life, one per window (§5), each created the moment that window matures and never updated afterward (immutable, matching `DecisionTrace`'s existing create-and-read-only discipline).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `recommendationId` | `String` | FK to `Recommendation` |
| `decisionTraceId` | `String` | FK to `DecisionTrace`, denormalized for direct provenance joins |
| `symbol` | `String` | denormalized from `Recommendation` |
| `action` | `RecommendationAction` | denormalized (`BUY`/`REDUCE`/`EXIT`) |
| `timeWindow` | `OutcomeTimeWindow` (enum: `D1`,`W1`,`M1`,`M3`,`M6`,`Y1`) | |
| `windowStartPrice` | `Decimal @db.Decimal(18,6)` | price at `Recommendation.createdAt` |
| `windowEndPrice` | `Decimal @db.Decimal(18,6)` | price at `createdAt + window` |
| `windowReturnPct` | `Decimal @db.Decimal(9,4)` | raw price return over the window |
| `benchmarkSymbol` | `String` | `Portfolio.benchmarkSymbol` at grading time (default `SPY`) |
| `benchmarkReturnPct` | `Decimal @db.Decimal(9,4)` | same window, benchmark |
| `riskAdjustedReturnPct` | `Decimal @db.Decimal(9,4)` | `windowReturnPct - benchmarkReturnPct` — documented as excess-return, not a full factor/beta model; see §3 |
| `directionCorrect` | `Boolean` | see §3 methodology |
| `magnitudeWithinExpectedRange` | `Boolean` | actual return vs. `Recommendation.expectedUpside`/`expectedDownside` |
| `realizedAtWindowFraction` | `Decimal? @db.Decimal(4,3)` | 0-1; how early within the window the expected move substantially realized (timeliness input, §3) |
| `grade` | `Decimal @db.Decimal(5,2)` | 0-100 composite, formula in §3 |
| `gradeLabel` | `OutcomeGradeLabel` (enum: `CORRECT`,`PARTIALLY_CORRECT`,`INCORRECT`,`UNGRADEABLE`) | |
| `ungradeableReason` | `String?` | e.g. `"delisted"`, `"missing_price_data"`, `"corporate_action_unadjusted"` |
| `methodologyVersion` | `String` | e.g. `"1.0.0"` — see §20; a methodology fix never rewrites old rows, it produces new ones |
| `dataSourceSnapshot` | `Json` | the exact price series/provider response used, so a later dispute is auditable against what was actually seen, not recomputed differently |
| `gradedAt` | `DateTime @default(now())` | |
| Indexes | `@@unique([recommendationId, timeWindow, methodologyVersion])`, `@@index([symbol, timeWindow])`, `@@index([gradedAt])` | the unique constraint is the idempotency guarantee (§ implicit throughout) |

---

## 2. Calibration model

Calibration is an **aggregate**, not a per-recommendation concept: "of all recommendations where confidence was X, what fraction actually turned out correct?" One table serves both confidence and quality-score calibration via a `scoreType` field, avoiding two near-identical schemas.

**`CalibrationBucket`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `scoreType` | `CalibrationScoreType` (enum: `CONFIDENCE`,`QUALITY`) | reuses the exact score names documented in `scoringVocabulary.SCORE_DEFINITIONS` |
| `bucketRangeLow` / `bucketRangeHigh` | `Int` | 10-point buckets, 0-10 … 90-100 |
| `timeWindow` | `OutcomeTimeWindow` | calibration is computed per window, since a recommendation's 1D accuracy and 1Y accuracy calibrate differently |
| `sampleSize` | `Int` | count of graded `Outcome` rows in this bucket/window |
| `actualSuccessRate` | `Decimal @db.Decimal(5,2)` | fraction graded `CORRECT` (0-100) |
| `expectedSuccessRate` | `Decimal @db.Decimal(5,2)` | bucket midpoint |
| `calibrationError` | `Decimal @db.Decimal(6,2)` | `actualSuccessRate - expectedSuccessRate`; positive = underconfident, negative = overconfident |
| `methodologyVersion` | `String` | |
| `computedAt` | `DateTime @default(now())` | |
| Indexes | `@@index([scoreType, timeWindow, computedAt])` | append-only — every computation is a new row, so calibration *trend* over time is queryable, not just the latest snapshot |

---

## 3. Success metrics

**Direction correctness** (methodology, not a single number):
- `BUY`: `directionCorrect = riskAdjustedReturnPct > 0` (beat the benchmark, not merely "went up" — a `BUY` that returned +2% while the benchmark returned +5% underperformed and should not be scored as simply correct).
- `REDUCE` / `EXIT`: `directionCorrect = windowReturnPct < 0` (absolute, not benchmark-relative — the claim being tested is "this specific position would decline," not "this position would underperform the market").

**Magnitude score** (0-100): parses the midpoint of `Recommendation.expectedUpside`/`expectedDownside` (reusing the exact `parseMidpointPercent`-style approach already used in `autonomousRecommendationEngine.js`'s scenario portfolio-impact calculation) and scores `100 - min(100, |actual - expectedMidpoint| / |expectedMidpoint| * 100)`, clamped to 0. `magnitudeWithinExpectedRange = true` when `actual` falls within `[expectedDownside, expectedUpside]` as literally stated.

**Timeliness score** (0-100): derived from `realizedAtWindowFraction` — if the outcome's direction was already achieved by 50% of the way through the stated `timeHorizon`, timeliness scores high; a move that only appears at the very edge of the window (or not at all within it) scores low. Computed from the same price series used for `windowEndPrice`, checking intermediate points.

**Composite grade formula** (documented named weights, mirroring `QUALITY_WEIGHTS`'s existing pattern in `autonomousRecommendationEngine.js`):

```
grade = directionScore * 0.50 + magnitudeScore * 0.30 + timelinessScore * 0.20
```
where `directionScore = 100` if `directionCorrect` else `0`.

**`gradeLabel` thresholds:** `grade ≥ 75` → `CORRECT`; `40 ≤ grade < 75` → `PARTIALLY_CORRECT`; `grade < 40` → `INCORRECT`; missing/unusable price data → `UNGRADEABLE` with a required `ungradeableReason` (never silently defaulted to a misleading `0`).

---

## 4. Recommendation lifecycle

A **derived**, not persisted, state — computed from the set of `Outcome` rows that exist for a `Recommendation`, so there is no second mutable status column to keep in sync with the existing `Recommendation.status` (`ACTIVE`/`SUPERSEDED`/`EXPIRED`, unchanged):

- `PENDING_OUTCOME` — no window has matured yet.
- `PARTIALLY_GRADED` — some windows graded, others not yet due.
- `FULLY_GRADED` — every window whose duration has elapsed since `createdAt` has a graded `Outcome` row (a 2-week-old recommendation is "fully graded" once `D1` and `W1` exist — `M1`+ simply aren't due yet).
- `GRADING_STALLED` — a due window has failed grading repeatedly (see §18) without reaching `UNGRADEABLE` or success; surfaced for operator attention.

---

## 5. Time windows

`D1, W1, M1, M3, M6, Y1` — each graded independently the first time `now() ≥ createdAt + window` **and** clean price data exists for both endpoints. A recommendation's `timeHorizon` free-text field (e.g. `"1-3 months"`) is used only to flag which window is the **primary** window for headline reporting and for weighting calibration most heavily toward the window closest to what was actually claimed — every window is still graded regardless, since seeing a recommendation's `D1` vs. `Y1` accuracy is itself valuable signal about whether the stated horizon was right.

---

## 6. Performance attribution

"Which recommendation patterns work best" spans several independent dimensions (action type, sector, symbol source, quality-score bucket, risk label, event type). Rather than one bespoke table per dimension, one generic table serves all of them plus committee (§7) and source (§8) attribution:

**`AttributionSnapshot`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `dimension` | `AttributionDimension` (enum: `ACTION`,`SECTOR`,`SYMBOL_SOURCE`,`QUALITY_BUCKET`,`RISK_LABEL`,`EVENT_TYPE`,`SOURCE`,`COMMITTEE_AGENT`) | |
| `dimensionValue` | `String` | e.g. `"BUY"`, `"Semiconductors"`, `"portfolio"`, `"75-85"`, `"Reuters"`, `"Equity Analyst"` |
| `timeWindow` | `OutcomeTimeWindow` | |
| `sampleSize` | `Int` | |
| `avgGrade` | `Decimal @db.Decimal(5,2)` | |
| `successRate` | `Decimal @db.Decimal(5,2)` | fraction `CORRECT` |
| `avgRiskAdjustedReturnPct` | `Decimal @db.Decimal(9,4)` | |
| `methodologyVersion` | `String` | |
| `computedAt` | `DateTime @default(now())` | |
| Indexes | `@@index([dimension, dimensionValue, timeWindow, computedAt])` | append-only, same trend-over-time property as `CalibrationBucket` |

`sector`/`event_type` are read from `Recommendation.evidence.matchedEvents`/`Position.sector`; `symbol_source` from the existing `evidence.symbolSource` field (unchanged since Sprint 16 Phase C).

---

## 7. Committee attribution

For every graded `Outcome` whose `DecisionTrace.committeeDebate` is non-null (only symbols where an action triggered and the committee call succeeded, per Sprint 18A's gating — nulls are excluded from this specific attribution, never treated as a wrong vote), each `expertVotes[i]` entry is normalized via **`canonicalVerdict.normalizeCommitteeVoteToAction(vote)`** — the exact Sprint 18A function, reused rather than reimplemented — and compared against `Outcome.directionCorrect`. Rolled up per agent (`Macro Strategist`, `Equity Analyst`, `Technical Analyst`, `Alternative Data Analyst`, `Risk Manager`) into `AttributionSnapshot(dimension=COMMITTEE_AGENT)`.

This is the first real, outcome-grounded use of `normalizeCommitteeVoteToAction` beyond the defensive internal reconciliation it was built for in Sprint 18A — exactly the kind of reuse that module's own code comments anticipated.

---

## 8. Source attribution

Walks `DecisionTrace.evidenceReferences` — real `EventEnvelope` objects (Sprint 18A `eventEnvelope.js`; stable, real IDs once `SPRINT_18B_RIE_IMPLEMENTATION_PLAN.md` ships; legacy-adapted-but-still-deterministic envelopes before that). Each evidence item contributing to a recommendation receives a fractional `1/N` credit toward that recommendation's outcome grade (N = evidence count) — a documented simplification, not a claim of causal isolation of one article's effect. Rolled up per `sourceName` into `AttributionSnapshot(dimension=SOURCE)`.

This is the outcome-grounded counterpart to `scoringVocabulary.normalizeSourceCredibility`'s currently-hardcoded outlet tier list — the explicit, named purpose of building this engine in the first place (per `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` §6 and the CTO review).

---

## 9. Evidence attribution

Finer-grained than source: per **individual** evidence item, not aggregated. New table:

**`EvidenceOutcomeLink`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `outcomeId` | `String` | FK to `Outcome` |
| `evidenceDeduplicationKey` | `String` | from the `EventEnvelope.deduplicationKey` at decision time — stable and deterministic per Sprint 18A, works identically whether the evidence is RIE-sourced or legacy-adapted |
| `sourceName` | `String?` | denormalized |
| `impliedDirection` | `String` (`"opportunity"`\|`"risk"`\|`"neutral"`) | from the envelope/matched-event `impactType` at decision time |
| `credibilityScoreAtDecisionTime` | `Decimal @db.Decimal(5,2)` | frozen snapshot — never recomputed retroactively, matching the "inputs used to grade a past decision must never be retroactively altered" principle from `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` §7 |
| `wasConsistentWithOutcome` | `Boolean` | did `impliedDirection` match `Outcome.directionCorrect`'s implied direction |
| `createdAt` | `DateTime @default(now())` | |
| Indexes | `@@index([evidenceDeduplicationKey])`, `@@index([outcomeId])` | |

**"Misleading evidence"** is a direct query, not a separate mechanism: evidence with high `credibilityScoreAtDecisionTime` (or high `relevanceScore` at decision time) but `wasConsistentWithOutcome = false`, aggregated by `evidenceDeduplicationKey` or `sourceName` across many outcomes.

---

## 10. Confidence calibration

The process that populates `CalibrationBucket(scoreType=CONFIDENCE)` (§2): for every graded `Outcome`, bucket the source `Recommendation.confidenceScore` into a 10-point range, and separately bucket `qualityScore` for `scoreType=QUALITY`. Because Sprint 18A's `scoringVocabulary.js` already documents that `confidence`/`conviction`/`modelConfidence` are the same underlying number today (an intentional, named simplification), calibrating confidence *is* calibrating conviction — this design does not pretend otherwise or double-count them as independent signals. `qualityScore`'s calibration is genuinely independent, since it's a real weighted composite of six different components, not an alias.

---

## 11. Drift detection

Compares each new `CalibrationBucket`/`AttributionSnapshot` computation against its trailing history (8-snapshot rolling window) for the same `scoreType`/`dimension`+`dimensionValue`/`timeWindow`. Flags a `DriftAlert` when:
- `calibrationError` for a bucket moves beyond ±15 percentage points, sustained across 2+ consecutive weekly snapshots (not a single noisy week), or
- an `AttributionSnapshot`'s `avgGrade` for a dimension drops more than 10 points month-over-month with `sampleSize ≥ 20` (avoids alerting on small-sample noise).

**`DriftAlert`**: `{ id, alertType (CALIBRATION_DRIFT|ATTRIBUTION_DRIFT), scoreType?, dimension?, dimensionValue?, timeWindow, priorValue, currentValue, delta, detectedAt }` — append-only, purely observational. **Drift detection never triggers an automatic change** — it only makes drift visible, feeding §12's proposal process as evidence, not as an authorization to act.

---

## 12. Learning feedback loop

The mechanism that actually closes `Learning → Better Recommendation`, and the one place this design deliberately stops short of full automation — matching the explicit, named governance decision already on record in `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 4 ("human-in-the-loop initially... an explicit governance decision to be made later, not assumed").

**`RecalibrationProposal`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `proposedChange` | `Json` | e.g. `{ target: "QUALITY_WEIGHTS.evidenceAgreement", from: 0.20, to: 0.17 }` or `{ target: "HIGH_QUALITY_NEWS_SOURCES", add: ["Barron's"] }` — a structured description of a specific constant in specific existing code, not a vague narrative |
| `rationale` | `String @db.Text` | which `AttributionSnapshot`/`CalibrationBucket`/`DriftAlert` rows motivated this, cited by id |
| `backtestResult` | `Json` | re-running the proposed weights against the accumulated `Outcome` corpus — did grading actually improve, or did this just fit noise |
| `status` | `RecalibrationStatus` (enum: `PROPOSED`,`APPROVED`,`APPLIED`,`REJECTED`) | |
| `reviewedBy` | `String?` | |
| `reviewedAt` | `DateTime?` | |
| `appliedAt` | `DateTime?` | |
| `appliedCommitSha` | `String?` | see below |
| `createdAt` | `DateTime @default(now())` | |

**Critically: "applied" means a normal code change, not a runtime toggle.** Approving a proposal produces a PR that edits the actual constant (e.g. `QUALITY_WEIGHTS` in `autonomousRecommendationEngine.js`, `HIGH_QUALITY_NEWS_SOURCES` in `autonomousMarketService.js`) — the same file, the same review process, the same git history as any other change. This deliberately avoids introducing a second, hidden, database-mutable source of truth for constants that `DecisionTrace.modelVersionMetadata` already assumes are stable per code version. `appliedCommitSha` links the proposal to the commit that actually changed the constant, so the causal chain (drift observed → proposal → backtest → human approval → code change → new `DecisionTrace`s reflect it) is fully auditable end to end.

---

## 13. APIs

All read-only except the two explicitly gated approval endpoints, which are internal/service-auth only — never publicly reachable, matching the "internal-only vs. public-facing" distinction named in `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` §19.

| Endpoint | Purpose |
|---|---|
| `GET /api/v2/outcomes` | Filterable by `symbol`, `timeWindow`, `gradeLabel`, `since`; paginated. |
| `GET /api/v2/outcomes/:id` | Single outcome, including `dataSourceSnapshot`. |
| `GET /api/v2/recommendations/:id/outcomes` | All graded windows for one recommendation — the natural extension of the existing `/decision-trace` sub-resource pattern. |
| `GET /api/v2/attribution?dimension=SECTOR&timeWindow=M1` | Generic attribution query (§6-§8). |
| `GET /api/v2/calibration?scoreType=CONFIDENCE&timeWindow=M1` | §2/§10. |
| `GET /api/v2/drift-alerts` | §11. |
| `GET /api/v2/recalibration-proposals`, `GET /api/v2/recalibration-proposals/:id` | §12, public read. |
| `POST /api/v2/recalibration-proposals/:id/approve` \| `/reject` | Internal-only, service-to-service auth, produces an audit-logged status change — never applies the change itself (§12). |

---

## 14. Database schema

Full new-table list, all additive, **zero alteration to `Recommendation`, `DecisionTrace`, `Portfolio`, or any existing table** — this engine is a pure read-only consumer, the same discipline `SPRINT_18B_RIE_IMPLEMENTATION_PLAN.md` established:

`Outcome`, `EvidenceOutcomeLink`, `AttributionSnapshot`, `CalibrationBucket`, `DriftAlert`, `RecalibrationProposal`, `OutcomeGradingRunLog` (mirrors the existing `AutonomousRunLog`/`RieRunLog` pattern exactly: `{ id, startedAt, windowsChecked, outcomesGraded, ungradeable, errors }`).

New enums: `OutcomeTimeWindow`, `OutcomeGradeLabel`, `CalibrationScoreType`, `AttributionDimension`, `RecalibrationStatus`.

---

## 15. Background jobs

All `node-cron`, bootstrapped only from `server.js` — the same convention `schedulerService.js` and `SPRINT_18B_RIE_IMPLEMENTATION_PLAN.md`'s scheduler established, deliberately not introducing a queue/broker for what is fundamentally a batch analytical workload:

| Job | Cadence | Responsibility |
|---|---|---|
| Outcome grading sweep | Daily | Finds `(recommendation, window)` pairs newly matured since last run, fetches price data (Finnhub, reusing the existing `finnhubCache.js` TTL cache), computes and persists `Outcome` rows. |
| Calibration snapshot | Weekly | Recomputes `CalibrationBucket` from the latest `Outcome` corpus. |
| Attribution snapshot | Weekly | Recomputes `AttributionSnapshot` across all eight dimensions. |
| Drift detection | Weekly, after the above two | Compares latest snapshots to trailing history, creates `DriftAlert` rows. |
| Recalibration proposal generation | Monthly, or manually triggered | Only runs when sample size clears a minimum threshold (≥100 graded outcomes in the relevant bucket) — proposes changes, runs the backtest harness, creates `RecalibrationProposal` rows. Never auto-applies. |

---

## 16. Scalability

Table growth is bounded and predictable: at most `(recommendations × 6 windows)` `Outcome` rows — modest even at meaningful volume, unlike RIE's raw-event ingestion. Unlike the CTO review's flagged retention-policy gap on `Recommendation`/`DecisionTrace` (which shipped without one and had to be named as a defect), this engine specifies time-partitioning by `gradedAt`/`computedAt` **as a day-one design choice**, not a later retrofit. Read-heavy attribution/calibration queries are served from the periodic snapshot tables (§6, §2), not computed live on every API call — the expensive aggregation happens once per week in a background job, not per request.

---

## 17. Cost estimation

Grading itself is **deterministic, not AI-based** — a price-data lookup and arithmetic, not an LLM call — a deliberate design choice keeping this engine cheap by construction, in contrast to the Committee's OpenAI-backed synthesis. Cost is bounded by Finnhub API usage for price history, reusing the existing cache; at the volumes implied by the current single-portfolio, small-watchlist reality, this is negligible. The one optional, explicitly non-required enhancement is an LLM-generated human-readable summary of a `RecalibrationProposal`'s rationale (nice for a reviewer, not needed for the engine to function) — gated behind the existing fallback-first pattern (works fine with a deterministic template summary when no API key is configured).

---

## 18. Failure handling

Missing or gapped price data → `gradeLabel = UNGRADEABLE` with a required `ungradeableReason`, never silently skipped and never defaulted to a misleading `grade = 0` — the exact principle already named in `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 4's own failure-handling section, now made concrete. Corporate actions: Finnhub's candle data is assumed split-adjusted (standard practice); dividend/total-return effects are **not** captured by price-only returns — documented here as an accepted, named simplification (price-return vs. total-return), not silently ignored. A `(recommendation, window)` pair that fails grading repeatedly (e.g., a persistent price-data gap) is retried on each daily sweep up to a bounded attempt count, then flagged `GRADING_STALLED` (§4) for operator visibility rather than retried forever.

---

## 19. Test strategy

- **Golden-set regression tests** — a fixed set of synthetic recommendation + price-outcome fixtures with hand-verified expected grades, run on every change to the grading formula (§3). This is the exact "eval harness" the CTO review flagged as missing from the AI pipeline entirely — this engine is where that gap actually gets closed, not just designed around.
- **Idempotency tests** — grading the same `(recommendation, window)` twice produces one `Outcome` row, never two (DB-unique-constraint-backed, same pattern as `eventEnvelope.deduplicationKey`).
- **Committee attribution tests** — synthetic `DecisionTrace.committeeDebate` fixtures with known votes, asserting `normalizeCommitteeVoteToAction` is called correctly and per-agent accuracy rolls up correctly.
- **Evidence attribution tests** — synthetic evidence fixtures asserting "misleading evidence" queries return the expected set.
- **Calibration/attribution aggregation tests** — known input `Outcome` sets produce known `CalibrationBucket`/`AttributionSnapshot` values.
- **Backtest-harness correctness test** — asserts the harness actually rejects a `RecalibrationProposal` that would have performed worse against historical `Outcome` data, not merely "runs without erroring."
- **Governance regression test** — asserts no code path can move a `RecalibrationProposal` to `APPLIED` except via the explicit, audited approval endpoint; asserts nothing in this engine ever writes to `Recommendation` or `DecisionTrace`.

---

## 20. Rollback strategy

Purely additive schema — zero risk to `Recommendation`, `DecisionTrace`, `Portfolio`, or any existing table, identical discipline to `SPRINT_18B_RIE_IMPLEMENTATION_PLAN.md`. Any background job (§15) can be disabled independently without affecting the others or the live product. A grading-methodology bug is **never** fixed by rewriting existing `Outcome` rows in place — `methodologyVersion` is bumped and affected windows are re-graded as **new** rows under the new version, preserving a full, honest audit trail of what the engine believed at each point in time (the same "inputs used to grade a past decision must never be retroactively altered" principle carried through from the RIE design). If the engine needs to be fully rolled back, dropping its tables has no effect on any existing data, because nothing pre-existing ever depended on them — and because `RecalibrationProposal.status=APPLIED` changes are ordinary code commits, rolling back a bad recalibration is exactly as safe and familiar as reverting any other commit.
