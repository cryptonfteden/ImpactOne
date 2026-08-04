# ImpactOne — Intelligence Platform Blueprint
## Sprint 18: Next-Generation Architecture Design

**Status:** Design only. No code, migrations, or commits are part of this deliverable.
**Purpose:** Define the architecture that turns the current recommendation engine into a continuously learning investment intelligence platform, built around five core engines.

**Continuity with prior work:** This blueprint builds directly on two existing artifacts and does not re-litigate them:
- `IMPACTONE_CTO_REVIEW.md` (Sprint 17) — the gap analysis this platform is designed to close, especially the AI-pipeline and moat findings.
- `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` (Sprint 17) — the full 20-section design for Engine 1 below. This document summarizes it under the required 12 headings and focuses the detail budget on the four new engines.

**What does not change:** The existing Sprint 16 Recommendation Engine (`autonomousRecommendationEngine.js`) and `DecisionTrace` are preserved as the platform's **synthesis/decision layer** — the component that turns everything the five engines know into one sized, explained, quality-scored, advisory-only recommendation with an immutable audit trail. Its structural invariant (no `placeOrder` import, ever) is unchanged. What changes is the *quality of what feeds it*: today it reads a keyword-matched event catalog and a hardcoded sector table; under this platform it reads real cross-validated evidence, durable theses, and real portfolio exposure. This is deliberate — the platform is designed to upgrade the inputs to a decision layer that already works, not to replace a working system.

**Implementation status update (Sprint 18A):** an independent architecture review (`INTELLIGENCE_PLATFORM_REVIEW.md`) examined this blueprint alongside the current codebase and found the Investment Committee Engine (six-persona debate, `investmentCommitteeService.js`) independently computed a second verdict alongside the Recommendation Engine's synthesis/decision layer above — a real gap in this design, since a fifth engine (Research Intelligence) was about to be built on top of an unresolved two-verdict problem. Sprint 18A corrected this before RIE work proceeds: the Investment Committee is now implemented as a debate/explanation layer feeding the synthesis/decision layer's `DecisionTrace`, never an independent verdict, via `canonicalVerdict.js`. The **shared scoring vocabulary** and **canonical Event Envelope** described conceptually for Engine 1/RIE below are also now real, committed code (`scoringVocabulary.js`, `eventEnvelope.js`) — frozen ahead of RIE's own build, exactly as this blueprint and the review both recommended. Full detail: `PROJECT_STATUS.md` §25, `API_CONTRACTS.md` §3.44-3.45.

**Terminology:** Every node/engine output named below (Event, Thesis, Entity, Recommendation, DecisionTrace, Outcome, and the rest) is defined exactly once in `CANONICAL_DOMAIN_MODEL.md`, including the reconciled Thesis lifecycle (§1.3) that supersedes this document's 5-state `active`/`strengthening`/`weakening`/`invalidated`/`realized` enum in Engine 3 below — that enum is retained here as historical design detail, but `CANONICAL_DOMAIN_MODEL.md` §1.3's maturity/standing-status/closure model governs any future implementation.

---

## Engine 1 — Research Intelligence Engine (RIE)

**Mission.** Continuously collect, normalize, score, and cross-validate investment intelligence from all source categories (SEC filings, transcripts, Reddit, X, news, macro, commodities, supply chain, shipping, insider trading, 13F, patents, government, geopolitical), producing a stable, queryable stream of scored Events and Event Clusters that every other engine builds on. Full design: `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md`.

- **Inputs:** Raw external sources across all 14 categories.
- **Outputs:** Scored/classified Events, Event Clusters (with corroboration/contradiction flags), embeddings, per-symbol timelines.
- **Internal services:** source adapters, distributed scheduler, normalizer, dedup/clustering, credibility/freshness/importance scorers, cross-source validator.
- **Storage model:** hot Postgres (time-partitioned), cold/raw object store, vector store for embeddings.
- **APIs:** `/api/v2/intelligence/*` — events, clusters, symbol timelines, semantic search.
- **Background jobs:** per-source scheduled fetch (interval and calendar-anticipated), batch dedup/clustering pass, embedding generation batch.
- **Scalability strategy:** stateless worker pool, leader-elected scheduler (not per-instance cron), distributed cache — every layer horizontally scalable by construction.
- **Failure handling:** per-source circuit breakers, graceful partial-source degradation with an explicit `dataCompleteness` penalty, durable raw-intake queue, poison-message quarantine.
- **Integration points:** feeds Knowledge Graph (entity/relationship extraction), Thesis Engine (evidence), Alpha Attribution Engine (versioned evidence for outcome grading), and the existing Recommendation Engine (replaces today's hardcoded event catalog).
- **Testing strategy:** per-adapter fixture contract tests, golden-set scoring regression tests, adversarial dedup tests, chaos/failure-injection tests.
- **Future evolution:** outcome-calibration loop closure (via Engine 4), multi-language sources, real-time importance alerts, a second data-licensing business line.

---

## Engine 2 — Knowledge Graph

**Mission.** Maintain a continuously updated graph of entities — companies, executives/insiders, sectors, commodities, supply-chain nodes, geographies, government bodies — and typed, evidence-derived relationships between them (supplier-of, competitor-of, subsidiary-of, exposed-to-commodity, insider-of, cites-in-patent, correlated-with). This replaces the current hardcoded ~15-node `relationshipGraphService.js` graph with a real graph that lets intelligence about one entity propagate to related entities.

- **Inputs:** RIE Events/Event Clusters (entity fields and structured payloads — 13F holdings, Form 4 filer/company links, patent citations, supply-chain records); a seed reference dataset (standard sector/industry classifications, known corporate structures) for bootstrapping before evidence-derived edges accumulate.
- **Outputs:** Queryable graph — nodes with attributes, typed edges with confidence and evidence provenance, and precomputed multi-hop **exposure paths** (e.g., "Company A is two hops from a Taiwan shipping disruption via supplier B").
- **Internal services:**
  - *Entity resolver/deduper* — collapses name variants ("Apple Inc.", "AAPL", "Apple") into one canonical node, shared identity resolution with RIE but graph-scoped.
  - *Relationship extractor* — derives typed edges from structured RIE payloads directly; for unstructured sources (news, transcripts), a constrained rule-based extraction with an LLM-assisted fallback only when necessary, every edge carrying a confidence score and provenance — never asserted as fact without a source.
  - *Graph maintenance/versioning* — edges carry a validity window; the graph is **temporal**, not a single current-state snapshot, so "what did the graph look like on date X" remains answerable (required for point-in-time evidence integrity into DecisionTrace, §Engine 4/5 below).
  - *Exposure-path computation* — precomputed/cached N-hop traversal so downstream engines never run expensive graph queries synchronously per request.
- **Storage model:** Start relational — an edges table in the existing Postgres investment (typed relationship, validity window, confidence, evidence references), avoiding a new operational dependency. Revisit a dedicated graph database only if traversal patterns genuinely outgrow it — an explicit decision not to over-build ahead of validated need.
- **APIs:** `GET /api/v2/graph/entities/:id`, `GET /api/v2/graph/entities/:id/relationships`, `GET /api/v2/graph/entities/:id/exposure-paths`, internal `POST /api/v2/graph/query` for structured traversal.
- **Background jobs:** incremental, event-driven edge extraction as new RIE events arrive; periodic full-graph consistency/dedup sweep; exposure-path cache refresh (incremental — only recompute paths touching changed edges).
- **Scalability strategy:** entity resolution and edge extraction are stateless consumers of RIE's event stream (same worker-pool pattern as RIE); exposure-path precomputation is the main hot spot, mitigated by incremental (not full-graph) recomputation.
- **Failure handling:** low-confidence or ambiguous extractions are stored with their confidence rather than forced into a guess or discarded; conflicting edges from different sources are retained side-by-side with provenance rather than one silently overwriting the other.
- **Integration points:** consumes RIE events; feeds Thesis Engine (checking thesis propagation to related entities); feeds Portfolio Intelligence Engine (real exposure, replacing the hardcoded sector table); feeds Alpha Attribution Engine (was a thesis's predicted graph-propagation actually correct — a gradable claim).
- **Testing strategy:** fixture-based extraction tests (known filings → expected edges), entity-resolution collision tests (ticker reuse, mergers/renames), temporal-query correctness tests, exposure-path correctness against small known subgraphs.
- **Future evolution:** richer relationship types as more source categories mature (geopolitical and litigation networks), graph-based anomaly detection (a new edge cluster forming as a leading signal in itself), a dedicated graph-database migration if and when traversal complexity outgrows the relational model.

---

## Engine 3 — Thesis Engine

**Mission.** Synthesize RIE evidence and Knowledge Graph context into durable, falsifiable investment theses — multi-event, multi-timeframe narratives that persist, accumulate evidence, strengthen or weaken over time, and are explicitly invalidated when their stated conditions are violated. This elevates the existing `buildExplanation`/`buildScenarios`/`scenarioEngineService` logic from a per-recommendation, point-in-time artifact into a first-class, long-lived object the platform reasons about continuously — the mechanism that makes the platform "continuously learning" rather than "continuously re-scanning."

- **Inputs:** RIE Events/Clusters, Knowledge Graph exposure paths and relationships, the historical-analog/scenario logic (evolved to query RIE's vector store instead of a hardcoded table).
- **Outputs:** **Thesis** objects — statement, direction (bullish/bearish/neutral), affected entities (via graph propagation, not just the triggering symbol), supporting/opposing evidence (continuously appended, not fixed at creation), confidence (recalculated as evidence accumulates), explicit invalidation conditions (continuously checked), status (`active`/`strengthening`/`weakening`/`invalidated`/`realized`), time horizon.
- **Internal services:**
  - *Thesis generator* — proposes new theses from high-importance, well-corroborated Event Clusters plus graph context, using evidence-grounded scenario/analog logic.
  - *Thesis evidence binder* — continuously matches new incoming RIE events against **existing active theses**, appending evidence and recalculating confidence. This is the core continuous-learning mechanic: today's engine only reasons at the moment of a scheduled run with no persistent memory of prior evidence; this service gives theses a genuine, evolving memory.
  - *Invalidation monitor* — checks each active thesis's invalidation conditions against new evidence and flips status to `invalidated` when violated, with the triggering evidence always recorded, never silently expired.
  - *Confidence recalibration hook* — consumes Alpha Attribution Engine's outcome grades to adjust how thesis confidence is computed going forward, closing the learning loop at the thesis level specifically.
- **Storage model:** `Thesis` table with append-only status history (never overwritten, only superseded — mirroring `DecisionTrace`'s immutability discipline) plus a `ThesisEvidence` linking table (thesis ↔ RIE event, role: supporting/opposing, confidence delta contributed) so a thesis's full confidence trajectory is reconstructable.
- **APIs:** `GET /api/v2/theses` (filterable: entity, status, direction, confidence floor), `GET /api/v2/theses/:id` (full evidence history and confidence trajectory), `GET /api/v2/theses/:id/evidence-timeline`, internal `POST /api/v2/theses/:id/evidence` (service-auth only, the binder's write path).
- **Background jobs:** event-driven thesis generation on new high-importance clusters; **event-driven** (not interval) evidence binding on every new RIE event, so theses update the moment relevant evidence arrives rather than up to 30 minutes later; periodic invalidation sweep; periodic confidence-decay pass (an unconfirmed thesis's confidence should slowly decay absent new evidence, reflecting genuine uncertainty growth).
- **Scalability strategy:** evidence binding is the hot path — every new event potentially touches many active theses. Mitigated by using the Knowledge Graph's exposure paths and RIE's entity tags to narrow candidate theses per event to a small relevant set, not a full scan; horizontally scaled stateless binder workers on the same event stream RIE produces.
- **Failure handling:** a failed binding pass for one thesis never blocks others (per-thesis isolation, not one atomic batch); genuinely ambiguous evidence is recorded as ambiguous rather than forced into a supporting/opposing bucket.
- **Integration points:** consumes RIE + Knowledge Graph; **feeds the existing Recommendation Engine** — its evidence-gathering step queries active theses for a symbol instead of (or alongside) RIE's raw timeline, giving recommendations durable evolving context rather than only point-in-time evidence; feeds Alpha Attribution Engine (a thesis's eventual `realized`/`invalidated` outcome is exactly what gets graded).
- **Testing strategy:** thesis-lifecycle tests (generation → evidence accumulation → confidence change → invalidation, on fixture event sequences), confidence-trajectory regression tests against a golden set, continuous-binding correctness tests (new evidence reaches the right theses and only those), decay-function tests.
- **Future evolution:** multi-entity/portfolio-level theses, thesis competition/ranking when two active theses about the same entity conflict, a thesis-authoring API for human analysts alongside machine-generated ones, thesis clustering/de-duplication as volume grows.

---

## Engine 4 — Alpha Attribution Engine

**Mission.** Close the learning loop. Continuously grade Recommendations, Theses, and their underlying evidence against actual subsequent market outcomes, decompose *why* a call was right or wrong down to the contributing component, and feed recalibration signals back into every upstream engine. This is the concrete build-out of the moat flywheel named in `IMPACTONE_CTO_REVIEW.md` and flagged as future work in `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` §20 — promoted here to a first-class engine because a platform cannot claim to be "continuously learning" while this loop remains open.

- **Inputs:** Realized market data (price history for every symbol referenced by a Recommendation/Thesis, at defined grading horizons), immutable `DecisionTrace` snapshots (existing, unchanged — read-only), Thesis lifecycle records, the RIE event/score versions referenced by those traces.
- **Outputs:** **Outcome grades** (per Recommendation: did the sized action outperform a relevant benchmark over its stated horizon; per Thesis: realized, correctly invalidated, incorrectly invalidated, or ambiguous; per evidence source/component: did high-credibility sources actually correlate with correct calls) and **recalibration proposals** — suggested adjustments to RIE's credibility/importance weights, Thesis Engine's confidence parameters, and the existing Recommendation Engine's `QUALITY_WEIGHTS` constant.
- **Internal services:**
  - *Outcome grader* — at each item's defined horizon, pulls realized price data and computes a documented, risk-adjusted grade against a symbol-appropriate benchmark (not raw price change alone, so grading can't be gamed by market beta).
  - *Attribution decomposer* — walks back through a graded outcome's `DecisionTrace` snapshot to attribute the grade's variance to specific inputs (which evidence was cited, its credibility/importance scores, the thesis confidence at the time) — a decomposition step, not a black box, so a wrong call is explainable ("over-weighted a low-corroboration social signal") rather than merely scored.
  - *Recalibration proposal generator* — aggregates attribution results across many graded outcomes into proposed weight adjustments, surfaced as **proposals**, never silent mutations — every recalibration is itself an auditable event, gated behind an approval path (human-in-the-loop initially; whether to ever allow controlled automatic-apply is an explicit governance decision to be made later, not assumed here).
  - *Calibration backtest harness* — before a proposal is applied, it is back-tested against the existing graded-outcome history to confirm it would genuinely have improved past grading, not just fit noise.
- **Storage model:** `OutcomeGrade` table (recommendation/thesis reference, grading methodology version, grade, graded-at, realized-data snapshot), `AttributionResult` table (grade reference, decomposed contribution per evidence/source/component), `RecalibrationProposal` table (proposed changes, backtest result, status `proposed`/`approved`/`applied`/`rejected`, append-only — a proposal's history is superseded, never overwritten).
- **APIs:** `GET /api/v2/attribution/recommendations/:id`, `GET /api/v2/attribution/theses/:id`, `GET /api/v2/attribution/sources/:sourceId/track-record` (the real, evidence-derived counterpart to RIE's initial credibility baseline), `GET /api/v2/attribution/recalibration-proposals`, internal `POST /api/v2/attribution/recalibration-proposals/:id/apply` (gated, audited).
- **Background jobs:** scheduled grading sweep (finds Recommendations/Theses that reached their grading horizon), event-driven attribution decomposition on newly graded outcomes, periodic (e.g. weekly/monthly, not continuous) recalibration-proposal generation — batch, since it needs enough accumulated grades to be statistically meaningful.
- **Scalability strategy:** grading is inherently batch-bounded by how much realized data exists, not by request volume; the real scale dimension is the growing history of `DecisionTrace`s to walk back through, addressed by the same time-partitioned storage discipline used across the platform.
- **Failure handling:** a symbol with missing/gapped realized price data is graded `ungradeable` explicitly, never silently skipped or defaulted to a misleading zero; a recalibration proposal that fails its backtest is retained as `rejected` with its reason, not discarded — a visible record of what was tried and didn't work is itself useful institutional memory.
- **Integration points:** reads `DecisionTrace` and Thesis lifecycle (read-only — never the write path that would violate `DecisionTrace`'s immutability guarantee); writes recalibration proposals consumed by RIE, Thesis Engine, and the existing Recommendation Engine, always through the proposal/approval path, never a direct silent write into another engine's live configuration.
- **Testing strategy:** grading-methodology tests against known historical price sequences (including delistings and corporate actions/splits), attribution-decomposition tests with synthetic DecisionTraces of known composition, backtest-harness correctness tests (does it actually reject a proposal that would have performed worse historically), a regression test asserting proposals never silently auto-apply outside the defined approval path.
- **Future evolution:** factor-adjusted grading (not just symbol-vs-index benchmarks), attribution granularity down to individual evidence items once volume supports it, a fully automated but still audited recalibration path once enough track record exists to trust it, cross-thesis attribution (did an entire class of theses, e.g. supply-chain-driven, systematically outperform another class).

---

## Engine 5 — Portfolio Intelligence Engine

**Mission.** Provide a continuously computed, accurate view of a portfolio's real exposure — sector, factor, geography, commodity, thesis, and concentration — grounded in the Knowledge Graph's real relationship data rather than a static lookup table, and connect that exposure view to both active Theses (what the portfolio structurally believes) and Alpha Attribution's outcome history (how exposure of this kind has historically performed). This absorbs and replaces `portfolioIntelligenceService.js`'s current 5-symbol hardcoded sector/beta table, named explicitly in `IMPACTONE_CTO_REVIEW.md` as technical debt to eliminate.

- **Inputs:** Real portfolio state (existing `Portfolio`/`Position` tables — Sprint 14's transactional engine, unchanged), Knowledge Graph relationships/exposure paths, active Theses touching held/watchlist symbols, Alpha Attribution track records for exposure classes.
- **Outputs:** **Exposure profile** (sector/factor/geography/commodity breakdown from real graph relationships), **concentration/risk metrics** (single-name concentration, plus graph-mediated hidden correlation — e.g., three nominally unrelated holdings all exposed to the same shipping chokepoint), **thesis-exposure map** (which active theses, and at what confidence, the portfolio is structurally exposed to, including unheld symbols a thesis suggests are relevant), **scenario stress outputs** (portfolio-wide impact of a thesis's bear case, reusing the existing per-symbol scenario logic aggregated across all holdings).
- **Internal services:**
  - *Exposure calculator* — walks the Knowledge Graph from each held/watchlisted position to compute real sector/factor/commodity/geography exposure, fixing the hardcoded-table debt at its source (the same fix already applied once ad hoc inside the recommendation engine, this time fixed centrally so every consumer benefits).
  - *Concentration/correlation analyzer* — detects both obvious (single-name weight) and non-obvious (graph-mediated shared exposure across nominally different holdings) concentration risk.
  - *Thesis-exposure mapper* — joins positions against active Theses via the Knowledge Graph, surfacing structural exposure the user may not have directly acted on yet.
  - *Portfolio-level scenario stress runner* — reuses the existing bull/base/bear scenario logic (`buildScenarios`, already built for single symbols) aggregated across the whole portfolio.
- **Storage model:** mostly computed-on-read from existing `Portfolio`/`Position` tables joined against the Knowledge Graph and Thesis Engine — no large new persistent store. A materialized `PortfolioExposureSnapshot` table, short-TTL cached (matching the existing TTL-cache pattern used elsewhere in the app), recomputed on position change or on a freshness interval, whichever comes first.
- **APIs:** `GET /api/v2/portfolio/exposure`, `GET /api/v2/portfolio/concentration-risks`, `GET /api/v2/portfolio/thesis-exposure`, `POST /api/v2/portfolio/stress-test`.
- **Background jobs:** exposure-snapshot refresh on position change (event-driven off the existing Portfolio Engine's transaction commits) and on a fallback interval (a graph edge change alone — e.g., a newly discovered shared-supplier relationship — can create new concentration risk with no trade having occurred); periodic concentration-risk sweep independent of position changes.
- **Scalability strategy:** computed-on-read with short-TTL caching keeps this engine's own storage footprint small; the real scaling dependency is the Knowledge Graph's exposure-path precomputation being fast — this engine consumes precomputed paths rather than running raw traversal per request.
- **Failure handling:** if the Knowledge Graph or Thesis Engine is degraded, exposure computation falls back to the last cached snapshot with an explicit staleness flag shown to the consumer, rather than blocking or silently returning an empty/wrong result.
- **Integration points:** reads the existing Portfolio Engine (unchanged, still the single source of truth for real positions), Knowledge Graph, Thesis Engine, Alpha Attribution track records; feeds the existing Recommendation Engine's sizing/concentration-override logic (`buildPortfolioAction`, already built) with real exposure data instead of the hardcoded table; feeds Alpha Attribution with exposure context at grading time (was this recommendation's risk properly sized given true portfolio exposure, not just its own position weight).
- **Testing strategy:** exposure-calculation tests against known graph fixtures (does a 3-hop supplier exposure compute correctly), concentration-detection tests (does the graph-mediated hidden-correlation case get flagged), snapshot cache-staleness tests, stress-test-output tests against known scenario inputs.
- **Future evolution:** factor-model exposure beyond sector/geography (style/factor tilts), what-if portfolio construction (simulate a candidate position's effect on exposure before acting), cross-portfolio aggregate views once multi-tenancy exists — this engine is designed against real per-portfolio data and will multiply cleanly once multi-tenancy lands, not require a rewrite.

---

## Information flow between the five engines

The platform is a **loop**, not a pipeline — the defining property that makes it "continuously learning" rather than "continuously re-scanning."

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                                                               │
 │   ①  EXTERNAL SOURCES                                                        │
 │        │                                                                     │
 │        ▼                                                                     │
 │   ENGINE 1 — Research Intelligence Engine                                    │
 │        │  scored Events / Event Clusters                                     │
 │        ├─────────────────────────────┐                                       │
 │        ▼                             ▼                                       │
 │   ENGINE 2 — Knowledge Graph    (evidence also flows directly to Engine 3)   │
 │        │  entities / relationships / exposure paths                          │
 │        ▼                                                                     │
 │   ENGINE 3 — Thesis Engine  ◀── continuous evidence binding from Engine 1    │
 │        │  active Theses (evolving confidence, invalidation status)           │
 │        │                                                                     │
 │        │        ┌── ENGINE 5 — Portfolio Intelligence Engine                │
 │        │        │      (real exposure, from Engine 2 + existing Portfolio)   │
 │        ▼        ▼                                                           │
 │   EXISTING RECOMMENDATION ENGINE  (synthesis / decision layer, unchanged)   │
 │        │  sized, explained, quality-scored Recommendation                    │
 │        ▼                                                                     │
 │   EXISTING DecisionTrace  (immutable snapshot of the evidence used)          │
 │        │                                                                     │
 │        │  time passes; realized market data becomes available                │
 │        ▼                                                                     │
 │   ENGINE 4 — Alpha Attribution Engine                                        │
 │        │  Outcome Grades + Attribution + Recalibration Proposals             │
 │        │  (reviewed / approved)                                              │
 │        └──────────────┬───────────────┬───────────────┬─────────────────┘   │
 │                        ▼               ▼               ▼                    │
 │                  back into      back into        back into                  │
 │                  Engine 1        Engine 3       existing Rec. Engine        │
 │                  (credibility/   (confidence      (QUALITY_WEIGHTS)         │
 │                  importance      calculation)                               │
 │                  weights)                                                    │
 │                        │                                                     │
 │                        └──────────── loop closes: step ① repeats, ──────────┘
 │                                      now measurably better calibrated
 └─────────────────────────────────────────────────────────────────────────────┘
```

**Narrative of the loop:**

1. **Collection.** Engine 1 continuously ingests, normalizes, scores, and cross-validates raw evidence from all 14 source categories.
2. **Structuring.** Engine 1's events feed Engine 2, which resolves entities and derives typed, evidence-backed relationships, producing exposure paths that let a signal about one entity propagate to related entities.
3. **Synthesis into belief.** Engine 1's evidence plus Engine 2's relationship context feed Engine 3, which generates durable Theses and — critically — keeps binding new incoming evidence to *existing* theses continuously, so belief evolves in near-real-time rather than only at scheduled-run boundaries.
4. **Grounding in reality.** Engine 5 continuously computes the portfolio's true exposure from Engine 2's graph, and maps active Theses (Engine 3) onto that exposure — including exposure the user hasn't directly acted on.
5. **Decision.** The existing Recommendation Engine consumes active Theses (Engine 3) and real exposure (Engine 5) — replacing today's keyword-matched catalog and hardcoded sector table — to produce a sized, quality-scored, explained Recommendation, still advisory-only, still backed by an immutable DecisionTrace.
6. **Grading.** Once enough time has passed for outcomes to be observable, Engine 4 grades Recommendations and Theses against realized market data, decomposes *why* each call was right or wrong down to the contributing evidence/component, and proposes recalibrations.
7. **Learning.** Approved recalibration proposals adjust Engine 1's credibility/importance weights, Engine 3's confidence calculations, and the existing Recommendation Engine's quality weights — so the *next* iteration of steps 1-5 is measurably better calibrated than the last, closing the loop. This is the concrete mechanism behind "continuously learning": not a metaphor, but a scheduled, audited, backtested weight-adjustment cycle with a full paper trail from raw evidence to graded outcome and back.

**What stays constant across every iteration of the loop:** the advisory-only invariant (no engine, including recalibration, ever gains write access to trade execution), `DecisionTrace` immutability (Engine 4 only reads it), and the auditability discipline established in Sprint 16 — extended here so that even the *recalibration of the system itself* is proposed, backtested, and approved rather than silently self-modifying.
