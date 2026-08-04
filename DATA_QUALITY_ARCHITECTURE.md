# Data Quality Architecture — ImpactOne

**Phase:** DATA-QUALITY-001. Documentation only — no production code was modified. Grounded in a fresh `git log` check (1 new commit since `LAUNCH-PLAN-001`: `ea925ef PLATFORM-HARDENING-002`, confirmed to close exactly the 4 named blockers from `FINAL_PRODUCTION_READINESS.md` — auth/rate-limiting, CI, Agent Platform logging, and a fresh `npm run build` re-verification, 26 new tests + a clean 2362-test full-suite run) and a direct source read of this platform's own real, already-existing provider-health infrastructure (`providerHealthService.js`, `providerMetricsService.js`, `providerDiagnosticsService.js`, `providerRunLogRepository.js`/`ProviderRunLog`).

**Guiding principle, directly grounded in a real, previously-confirmed finding from earlier in this engagement**: `providerHealthService.js`'s own real `successRate` metric measures **uptime, not data quality** — a stub provider using `honestStubFetch` (14+ of this platform's 22 registered providers) reports `SUCCESS` on every run because it successfully returns an empty array by design, not because it delivered real, useful data. **This distinction — "the call succeeded" vs. "the call returned real, useful data" — is the single most important design principle this whole framework is built around**, and is the primary gap this new architecture closes in the platform's existing, otherwise well-built provider-observability layer.

---

## 1. Review of existing infrastructure (what already exists, and its real gap)

- **`providerHealthService.js`** (real, tested): point-in-time status over the last 10 runs per provider — `lastRunAt`/`lastStatus`/`successRate`. Honestly reports `null` for a provider with zero run history, never fabricating a healthy status. **Gap**: `successRate` cannot distinguish a real data-bearing success from an honest-stub empty success.
- **`providerMetricsService.js`** (real, tested): aggregated full-history metrics — `totalItemsFetched`/`totalItemsPersisted`/`totalItemsDeduped`/`dedupRate`/`errorRate`/`avgDurationMs`/`lastSuccessAt`. **This is the closest existing signal to real data quality** — a provider whose `totalItemsFetched` stays at 0 across all runs is distinguishable from one that fetches real items, but this distinction is not currently surfaced as its own named metric or fed into any confidence/quality score anywhere in the platform.
- **`providerDiagnosticsService.js`** (real, tested): deep, point-in-time introspection — contract validity (`validateProviderShape`), live rate-limiter budget, most recent error detail. Excellent for incident diagnosis, not designed for aggregate quality scoring.
- **`optionsFlowNormalizer.js`'s `computeDataFreshness()`** (real, tested): a real, working per-signal staleness computation (`isStale` past a configurable threshold) — the closest existing precedent for a formal Freshness Quality Score, currently scoped to one agent only.
- **This whole research series' own 14 domain-agent scoring models** each independently designed their own freshness tiers (Macro's 3-tier real-time/monthly/quarterly model, Short Interest's 2-tier official/commercial model, Insider's transaction-date-vs-filing-lateness split) — a rich, already-designed body of freshness thinking that has never been unified into one cross-platform Freshness Quality Score.
- **`CONFLICT_RESOLUTION.md`** (this engagement's own prior deliverable): a real, already-adopted governance checklist for cross-agent disagreement (never average, always surface, never resolve by picking a winner) — the correct foundation for this phase's Conflict Score, not something to redesign.

---

## 2. Provider failures

- **What already exists**: `ProviderRunLog`'s `status` field (`SUCCESS`/`FAILED`/`PARTIAL`), `errorMessage`, real rate-limiter state via `providerDiagnosticsService`.
- **The real, confirmed gap**: an honest-stub provider's `SUCCESS` status is indistinguishable from a real provider's genuine, data-bearing success in `providerHealthService`'s own summary — both simply say `SUCCESS`. **This is not a bug in the existing code** (each is individually honest about its own narrow scope), but it is a real blind spot when the two are compared side-by-side without additional context.
- **Design response**: the new Provider Health Score (§9 below) explicitly incorporates `providerMetricsService`'s real `totalItemsFetched` alongside `providerHealthService`'s `successRate`, closing this exact gap by combining two already-real, already-tested metrics that were never combined before.

## 3. Missing data

- Every one of the 14 domain agents already handles this consistently and honestly (confirmed across this whole engagement's research/review series): a hard `dataAvailable: false → confidence: 0` gate, never a fabricated partial value. This is the single most consistently well-implemented dimension in the whole platform and **requires no redesign** — the new Completeness Score (§11) formalizes and extends this existing discipline to the report level (how many of a report's *expected* inputs are present), not the agent level (which already handles this well internally).

## 4. Stale data

- The platform has extensive existing freshness handling, but distributed and formula-per-agent (§1). **The real gap is cross-agent freshness comparability**, not any single agent's own freshness logic — directly extending this engagement's own already-designed `basis`-field precedent (`UNIFIED_CONFIDENCE_ARCHITECTURE.md`) to freshness: a consumer today cannot easily tell "Macro's Tier-1 real-time reading" from "Institutional's inherently ~45-135-day-stale 13F reading" without reading each agent's own source.

## 5. Partial responses

- `ProviderRunLog`'s `PARTIAL` status already exists as a distinct value from `FAILED`, and `optionsFlowNormalizer`'s honest-unavailable-during-bootstrap pattern is a real, working precedent for partial-data handling at the signal level. The new Completeness Score (§11) generalizes this to any report composed of multiple sub-signals, some present and some honestly absent.

## 6. Cross-provider disagreement

- `analystConsensusService.js`'s real `crossCheckRatings()` (confirmed real and well-designed in this engagement's own prior Analyst Consensus research) is the strongest existing precedent: explicit spread computation, a disagreement threshold, never averaging. The new Conflict Score (§12) generalizes this exact mechanism beyond analyst ratings to any pair of agents/providers reporting on the same underlying fact.

## 7. Data completeness

See §3/§5 above and the Completeness Score design (§11) — the key insight is that completeness must be assessed **both** at the individual-agent level (already well-handled) **and** at the aggregate-report level (not currently formalized as its own score anywhere).

## 8. Freshness consistency

See §4 above — the real gap is a shared vocabulary for comparing freshness across genuinely different cadences (real-time market data vs. quarterly regulatory filings), not a lack of freshness logic itself.

## 9. Confidence interaction

**This must not duplicate `UNIFIED_CONFIDENCE_ARCHITECTURE.md`'s own work** (this engagement's own prior deliverable, produced the day before this phase). That document already designed a `basis` field and staged migration for cross-agent confidence comparability. This Data Quality framework's role is narrower and complementary: **data quality scores are an *input* to confidence, not a replacement for it.** A Data Quality Score should feed into (not be confused with, and not be computed from) any agent's own confidence formula — directly mirroring the already-established principle that Freshness, Completeness, and Source Quality are each individually-named `scoringVocabulary.js` dimensions that *feed into* a composite quality score (`QUALITY_WEIGHTS`), never computed circularly from it.

## 10. Operational monitoring

See `DATA_QUALITY_OPERATIONS.md` (companion document) for the full dashboard/alerting/incident-workflow design — summarized here: this platform currently has **zero automated alerting of any kind** (confirmed across this engagement's own history, most recently in `FINAL_PRODUCTION_READINESS.md`), meaning every one of the 5 new scores this phase designs must initially be **read on demand**, not pushed — the operational maturity to support real push-alerting does not yet exist and is out of scope for this phase's own "documentation only" constraint (building an alerting pipeline is a future implementation phase, not a design decision this document can make real today).

---

## 11. Design: the five scores

### Data Quality Score (0-100, composite)
**Purpose**: a single top-level gauge of how much a specific report (a Unified Stock Intelligence report, or any individual agent's output) can be trusted from a pure data-quality standpoint — deliberately **separate from, and an input to**, that report's own confidence number (per §9).

- **Composition**: `completenessScore * 0.30 + freshnessQualityScore * 0.25 + providerHealthScore * 0.25 + (100 - conflictScore) * 0.20` — Conflict Score is inverted since a *higher* conflict score means *worse* data quality (more unresolved disagreement), the only inverted term in the composite.
- **Never computed per-symbol only** — this score must be computable at both the individual-report level (was this specific report built from good data?) and the platform level (aggregated across all reports in a time window, for the Operations dashboard).

### Provider Health Score (0-100, per provider)
**Purpose**: directly extends `providerHealthService.js`'s real `successRate`, explicitly correcting the "uptime ≠ data quality" gap (§2).

- **Composition**: `uptimeComponent * 0.40 + dataYieldComponent * 0.40 + freshnessComponent * 0.20` where `uptimeComponent` reuses the existing real `successRate` unchanged, `dataYieldComponent` is **new** — the fraction of recent runs where `providerMetricsService`'s real `totalItemsFetched` was actually non-zero (an honest-stub provider scores 0 here even while scoring 100 on uptime, correctly separating the two concepts for the first time), and `freshnessComponent` reuses `lastSuccessAt`'s real recency.
- **Full design in the companion document**, `PROVIDER_HEALTH_MODEL.md`.

### Freshness Quality Score (0-100, per signal/report)
**Purpose**: a cross-agent-comparable freshness gauge, extending `optionsFlowNormalizer.computeDataFreshness()`'s real staleness-threshold pattern platform-wide.

- **Composition**: each domain agent's own already-designed freshness tiers (Macro's 3-tier, Short Interest's 2-tier, etc.) are preserved unchanged as the *source* computation — this score adds a **normalized `freshnessTier` label** (`REAL_TIME`/`SCHEDULED_PERIODIC`/`REGULATORY_LAGGED`) alongside the existing numeric ceiling, directly extending the `basis`-field pattern from `UNIFIED_CONFIDENCE_ARCHITECTURE.md` to the freshness dimension specifically — never recomputing any agent's own existing freshness ceiling, only labeling it for cross-agent comparability.

### Completeness Score (0-100, per report)
**Purpose**: what fraction of a report's *expected* inputs are actually present, honestly.

- **Composition**: directly reuses `UNIFIED_SCORING_MODEL.md`'s own already-designed `coverageRatioFactor` concept (`0.5 + 0.5 * (fulfilled/totalRegistered)`) — this is not a new formula, it is the formal registration of a formula this engagement already designed but never named as its own standalone score.

### Conflict Score (0-100, per report — a magnitude of *disagreement*, not a directional signal)
**Purpose**: directly generalizes `analystConsensusService.js`'s real `crossCheckRatings()` spread-detection mechanism and `CONFLICT_RESOLUTION.md`'s own governance checklist beyond analyst ratings to any two agents/providers describing the same underlying fact.

- **Composition**: for every genuinely comparable pair of signals in a report (using `UNIFIED_SCORING_MODEL.md`'s own already-designed canonical direction taxonomy to determine genuine comparability), compute a normalized disagreement magnitude; the Conflict Score is the maximum (not average) disagreement found — a single severe disagreement should not be diluted by many agreeing pairs, directly matching `CONFLICT_RESOLUTION.md`'s own "never average out a genuine disagreement" principle.
- **Explicitly never used to silently resolve the disagreement** — a high Conflict Score is a prompt to *display* the disagreement more prominently, never to pick a side.
