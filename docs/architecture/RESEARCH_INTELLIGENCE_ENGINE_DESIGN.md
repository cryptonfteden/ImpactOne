# ImpactOne — Research Intelligence Engine (RIE)
## Technical Design Document

**Author role:** Chief Architect
**Status:** Design only. No code, migrations, or commits are part of this deliverable.
**Purpose:** Define the long-term competitive moat system — a continuous, multi-source, cross-validated investment intelligence pipeline that feeds the existing Recommendation Engine and DecisionTrace, replacing today's ad hoc, keyword-matched, single-source event catalog with a real, extensible, auditable intelligence infrastructure.

This design is written as the direct implementation path for the highest-leverage findings of the CTO Architecture Review (`IMPACTONE_CTO_REVIEW.md`): specifically §3.4 (AI Pipeline — "redesign now: replace keyword/hardcoded-table pseudo-ML with real embeddings"), §4 ("the actual moat: DecisionTrace plus outcome tracking"), and Top-50 items #22-25. Every section below is written to correct a named, existing gap rather than to introduce speculative infrastructure. Where the current codebase already does something right (the advisory-only invariant, the DecisionTrace immutability pattern, the deterministic-fallback philosophy, the strangler-fig migration convention), this design preserves and extends it rather than replacing it.

---

## 1. High-level architecture

The Research Intelligence Engine (RIE) is a distinct bounded system sitting between raw external sources and the existing Recommendation Engine / DecisionTrace layer. It owns collection, normalization, scoring, classification, and storage of investment intelligence; it does not own recommendation logic, portfolio state, or execution — those remain the Recommendation Engine's and Portfolio Engine's responsibility, unchanged.

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                    EXTERNAL SOURCES                      │
                        │  SEC · Transcripts · Reddit · X · News · Macro · Commod- │
                        │  ities · Supply Chain · Shipping · Insider · 13F ·       │
                        │  Patents · Government · Geopolitical                     │
                        └───────────────────────────┬───────────────────────────────┘
                                                      │ (per-source adapters, §2)
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │  SCHEDULER  (§3)  — leader-elected, per-source cadence,     │
                        │  interval + event-anticipated (calendar-driven) triggers   │
                        └───────────────────────────┬───────────────────────────────┘
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │  RAW INTAKE QUEUE  — durable, append-only, replayable       │
                        └───────────────────────────┬───────────────────────────────┘
                                                      ▼
              ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
              │ NORMALIZATION │──▶│  DEDUP /      │──▶│   SCORING     │──▶│ CLASSIFICATION │
              │     (§4)      │   │  CLUSTERING   │   │  (§6,7,8,9)   │   │   & TAGGING    │
              │               │   │     (§5)      │   │               │   │                │
              └───────────────┘   └───────────────┘   └───────────────┘   └───────┬────────┘
                                                                                    ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │  STORAGE  (§10):  Hot (Postgres, partitioned) ·             │
                        │  Cold/raw (object store) · Vector (embeddings)              │
                        └───────────────────────────┬───────────────────────────────┘
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │  APIs (§11)  →  Recommendation Engine (§12)  →  DecisionTrace│
                        │                 (§13)                                       │
                        └───────────────────────────────────────────────────────────┘
```

RIE generalizes and subsumes what `newsService.js`, `autonomousMarketService.js`'s event catalog, `historicalSimilarityService.js`, and `scenarioEngineService.js` do today in a narrower, single-source, largely hardcoded form. It is designed as an additive system introduced behind a flag and cut over per source category via the same strangler-fig pattern already proven twice in this codebase (`/api` → `/api/v2`, legacy vs. API portfolio engine) — see §12.

---

## 2. Data ingestion pipeline

Every source is wrapped in an **adapter** implementing one common contract: `fetch(cursor) → RawRecord[]`, plus static metadata (`sourceId`, `sourceType`, `authMode`, `rateLimit`, `licenseClass`). Two ingestion modes:

- **Pull (poll-based):** SEC filings (EDGAR index/full-text search), 13F filings (quarterly + amendments), insider trading (Form 4 feed), patents (USPTO/bulk + API), government announcements (agency RSS/press APIs), commodities (exchange/futures feeds), macro releases (calendar-driven — see §3), supply chain/shipping (AIS vessel tracking, port throughput APIs), earnings transcripts (provider API, batch around earnings dates).
- **Push/stream:** X (filtered stream by cashtag/keyword), select premium news wires where a streaming tier exists.
- **High-volume/noisy sources (Reddit, X):** pass through a cheap **pre-filter stage** (symbol/keyword match against the active watchlist/portfolio universe, plus a lightweight relevance classifier) *before* entering the full pipeline — this is a cost control (§17) as much as a quality one; the majority of raw social volume never reaches normalization.

All raw records land first in a **Raw Intake Queue** — durable and append-only — before any transformation. This is the system's black-box recorder: normalization, scoring, and classification logic can be corrected and *replayed* against historical raw data without re-hitting external APIs (import for cost control, for fixing a scoring bug retroactively, and for building the golden-set regression tests in §18). Nothing downstream is allowed to be the only copy of a fact.

---

## 3. Scheduler architecture

The current scheduler (`schedulerService.js`, `node-cron`, single in-process instance) is explicitly flagged in the CTO review as not horizontally-safe — multiple instances would each independently fire and double-process. RIE's scheduler is designed correctly from the outset, since it is the moat system:

- **Schedule Registry:** one entry per source with its cadence class and parameters — not a single global interval.
- **Two cadence classes:**
  - *Interval-based* — steady polling (SEC filing index, Reddit/X, commodities, supply chain/shipping) with adaptive backoff on error/rate-limit.
  - *Event-anticipated* — exact-time triggers pulled from a known release calendar (macro data release times, earnings dates, 13F filing deadlines). Being first to ingest a scheduled release is itself a source of edge, so these are pre-scheduled jobs, not generic polling.
- **Distributed, leader-elected trigger:** a single logical scheduler (leader election, not per-instance cron) emits "fetch due" jobs onto a work queue; any number of stateless worker instances consume from it. This is the direct fix for the CTO review's flagged multi-instance duplication risk, applied here before it's ever built the wrong way.
- **Priority lanes:** high-priority, time-sensitive jobs (macro releases at release time, insider Form 4 filings) get dedicated worker capacity so they are never queued behind low-priority bulk work (e.g., a patent-corpus backfill).

---

## 4. Event normalization

Every adapter's output is mapped into one canonical **Event** envelope, decoupling every downstream stage from source-specific shapes:

| Field group | Contents |
|---|---|
| Identity | `eventId`, `sourceType`, `sourceName`, `sourceUrl`, `rawPayloadRef` (pointer into the raw/cold store) |
| Timing | `publishedAt`, `ingestedAt` |
| Entities | resolved `symbols`, `companies` (CIK/ticker-resolved), `sectors`, `commodities`, `geographies` — each resolution carries its own confidence, not a silent best guess |
| Classification | `eventCategory` (one of the 14 source domains), `eventType` (sub-classification, e.g. "Form 4 — insider sale", "CPI release", "port congestion spike") |
| Content | `headline`, `summary` (extracted deterministically wherever the source structure allows; LLM-assisted only where necessary, consistent with the app's existing fallback-first philosophy), `structuredPayload` (category-specific fields — e.g. 13F: filer + position deltas; macro: indicator + actual/forecast/prior) |
| Integrity | `language`, `contentHash` (feeds dedup, §5) |

Entity resolution (mapping free text like "Apple" or "$AAPL" to a canonical symbol/CIK) is its own explicit stage with an output confidence field — ambiguous matches (ticker collisions, private companies, multiple listings) are surfaced, not silently guessed or dropped.

---

## 5. Duplicate detection

Duplication takes different forms across 14 source types, so this is layered:

1. **Exact duplicate** — `contentHash` match within a rolling window. Catches identical re-publication (wire syndication, the same filing fetched twice by two adapters).
2. **Near-duplicate** — shingling/min-hash or embedding-similarity above a threshold. Catches the same story rewritten by multiple outlets, or the same fact restated across several Reddit/X posts.
3. **Cross-source linking (not dedup)** — when a filing, a news article, and an X post describe the *same underlying event*, they are not duplicates to discard; they are corroborating evidence. These are clustered under one **Event Cluster ID**, each member retained independently. This is the direct bridge into §9.

Exact-hash dedup runs inline at ingestion (cheap, real-time). Near-duplicate detection and cross-source clustering run in a short-delay batch pass (seconds-to-minutes latency is acceptable and lets the more expensive similarity computation batch efficiently).

---

## 6. Source credibility scoring

Generalizes the existing `sourceQualityScore` (today a small hardcoded outlet-tier array) into a maintained, per-source model:

- **Static baseline by source type** — primary/structured sources (SEC, government data) start highest by construction; wire services next; established financial media next; social platforms lowest baseline, but never zero — social signal is real, especially for narrative/sentiment, just noisier.
- **Dynamic per-outlet/per-account adjustment** within a type — a rolling accuracy/retraction rate, and historical correlation between a source's flagged-important claims and subsequently corroborated events (fed by §9, and eventually by the outcome-calibration loop in §20).
- **Social-specific signal** (Reddit/X) — author-level reputation (account age, historical post-to-outcome correlation) used as a *weak* prior only; follower/karma counts are explicitly excluded as a primary signal since they're trivially gameable.
- Credibility scores are **versioned and stored separately from events** — a source's score can be revised after the fact without mutating any historical event record, which is required for DecisionTrace's immutability guarantee (§13).

---

## 7. Freshness scoring

Generalizes the existing `recencyScore` decay function with a per-source-type-appropriate half-life, since "fresh" means different things across these domains:

- **Fast decay** (X, breaking news, intraday commodity moves) — relevance decays over hours.
- **Medium decay** (Reddit discussion, general financial news) — decays over 1-3 days.
- **Slow decay / filing-driven sources** (SEC filings, 13F, patents, government announcements) — freshness reflects *how new this information is to the market*, not raw content age. A 13F filed today describing last quarter's positions is "fresh" as a disclosure event even though the underlying position data is 45 days old — filing-freshness and data-staleness are modeled as two separate fields, never conflated.
- Freshness is computed **on read**, from stored `publishedAt` + a decay-curve parameter — not cached as a scalar that itself goes stale — consistent with the TTL-on-read philosophy already used elsewhere in the app, applied correctly here (a continuous function, not a cached snapshot).

---

## 8. Event importance scoring

A composite 0-100 score with exposed components (never a single opaque number, matching the existing quality-score design philosophy):

- **Magnitude** — category-specific: macro (deviation from consensus forecast, in standard deviations), insider trading (transaction size relative to the filer's existing position and to average daily volume), 13F (position-change size relative to fund AUM and to the stock's float), patents (novelty/citation-velocity proxy), supply chain/shipping (deviation from baseline throughput).
- **Entity relevance** — reuses the existing `portfolioRelevance` concept: does this event touch a symbol in an active portfolio or watchlist.
- **Historical precedent weight** — how much similar past events have actually moved markets, per the historical-analog/calibration system (§20) — this is where the calibration loop plugs directly into scoring, rather than importance being asserted once and left static.
- **Cross-source corroboration boost** — independently corroborated events (§9) score higher than single-source claims of the same nominal magnitude.

---

## 9. Cross-source validation

The most differentiated section of this design — the actual "does independent evidence agree" layer that generic news aggregation doesn't do.

- Every **Event Cluster** (§5) is evaluated for corroboration: how many *distinct, uncorrelated source types* support the same underlying claim (e.g., a shipping anomaly + a commodity price move + a news article all pointing the same direction).
- **Contradiction is a signal, not noise.** When sources disagree (e.g., insider selling against a bullish news narrative), that disagreement is surfaced explicitly rather than averaged away — this maps directly onto the Recommendation Engine's existing `counterarguments`/opposing-evidence structure, giving it real cross-source backing instead of single-source keyword matches.
- Output: a **corroboration score** and a **contradiction flag** on the Event Cluster, feeding both §8 (importance) and, downstream, the Recommendation Engine's `evidenceAgreement` quality component (already computed today — currently fed by a shallow keyword-matched set, upgraded here to real independent corroboration).
- **Independence weighting** — corroboration from sources that are themselves correlated (five outlets citing the same single wire report) must not be double-counted as five independent confirmations. Corroboration scoring tracks source lineage/citation chains where detectable and discounts accordingly.

---

## 10. Storage model

Three tiers, extending rather than replacing the existing Prisma/Postgres investment:

- **Hot store (Postgres)** — normalized `Event` and `EventCluster` records, queryable by symbol/category/time/importance, indexed for the Recommendation Engine's real-time reads. **Time-partitioned from day one** — this directly avoids the unbounded-growth/no-retention-policy gap the CTO review flagged on `Recommendation`/`DecisionTrace`; RIE is not permitted to repeat that mistake.
- **Cold/raw store (object storage)** — append-only raw payloads referenced by `rawPayloadRef` (§2/§4). Cheap, replayable, never queried directly by the app.
- **Vector store** — embeddings for events, filings, and transcripts, enabling genuine semantic nearest-neighbor search. This is the concrete infrastructure that replaces the current 8-row hardcoded historical-analog table (`historicalSimilarityService.js`) with real similarity retrieval over a growing corpus — the single highest-leverage item named in the CTO review's AI Pipeline section.
- **Retention policy is defined per tier at design time, not deferred**: hot store keeps a bounded window of full-detail data with partitioned rollover to summarized cold storage; raw-store retention is driven by source licensing/cost constraints (§19), not indefinite-by-default.

---

## 11. APIs

A small, versioned surface, consumed primarily by the Recommendation Engine but designed as a real product surface from the start — auth-required and paginated by construction, not retrofitted the way today's `/api/v2` surface was flagged for lacking both:

| Endpoint | Purpose |
|---|---|
| `GET /api/v2/intelligence/events` | Filterable (symbol, category, since, importance floor), paginated |
| `GET /api/v2/intelligence/events/:id` | Full event, including linked cluster and evidence |
| `GET /api/v2/intelligence/clusters/:id` | Corroboration/contradiction detail for an event cluster |
| `GET /api/v2/intelligence/symbols/:symbol/timeline` | Chronological intelligence feed for one symbol — the primary feed the Recommendation Engine consumes |
| `POST /api/v2/intelligence/search` | Combined semantic (embedding) + structured filter query — the historical-analog use case |
| *(internal only)* source health, backfill triggers, credibility overrides | Ops/admin namespace, service-to-service auth only |

---

## 12. Integration with Recommendation Engine

- RIE replaces `autonomousMarketService.js`'s ad hoc `AUTONOMOUS_SCAN_UNIVERSE`/keyword-matched catalog as the evidence source. The engine's `findMatchedEvents` step becomes a query against RIE's symbol-timeline API instead of an in-process synthetic catalog.
- The evidence shape the Recommendation Engine already expects — `impactType`, `riskLevel`, `counterarguments`, `invalidationSignals`, `sourceName`/`sourceUrl`/`publishedAt`, `personalRelevance` — is preserved as a contract. RIE's Event schema is a strict superset, so integration is additive to `autonomousRecommendationEngine.js`, not a rewrite of it — consistent with this engagement's established "reuse existing infra" discipline.
- Quality-score components already computed downstream (`sourceQuality`, `evidenceFreshness`, `evidenceAgreement`, `dataCompleteness`) become direct pass-throughs of RIE's credibility/freshness/corroboration scores, rather than being independently re-derived.
- **Migration path:** the same strangler-fig pattern already used twice in this codebase. RIE-backed evidence is introduced behind a flag, run in shadow mode alongside the existing keyword pipeline for comparison, then cut over one source category at a time — structured, highest-confidence categories first (SEC filings, 13F, insider trading), noisiest last (Reddit, X).

---

## 13. Integration with DecisionTrace

- `DecisionTrace.inputEvidence` gains structured references to the exact RIE Event/Cluster IDs **and the exact score values as they existed at decision time** — not a live pointer, since credibility/freshness/importance scores are explicitly versioned and mutable over time (§6-§9), while `DecisionTrace` must remain immutable per its existing "no update method" invariant.
- RIE therefore exposes an explicit **score-versioning mechanism**: every score carries a version; `DecisionTrace` records which version was read. No new mutation path is introduced into `DecisionTrace` itself — RIE only changes how evidence is *assembled* before a `Recommendation`/`DecisionTrace` pair is created.
- This versioning is what makes the outcome-calibration flywheel (§20, and the CTO review's named moat) actually buildable: because `DecisionTrace` already captures exactly which evidence, at exactly what scores, drove a recommendation, and RIE events have stable IDs, a later outcome-grading job can join "what evidence existed" against "what actually happened" — producing the training signal for recalibrating credibility, freshness, and importance weights.

---

## 14. Failure handling

- **Per-source circuit breaker** — repeated adapter failures (auth failure, schema change, rate-limit exhaustion) trip a breaker that stops hammering the source and surfaces an alert, rather than silently degrading data quality.
- **Graceful partial-source degradation** — if one adapter is down, the pipeline continues on remaining sources with an explicit `dataCompleteness` penalty (an existing modeled quality-score component) instead of failing the whole run, consistent with the app's existing deterministic-fallback philosophy.
- **Durability by construction** — because the Raw Intake Queue (§2) persists everything before processing, a source outage never loses data permanently; once the adapter recovers, backfill runs from the source's own history where the API supports it, and any true gap is logged explicitly rather than hidden.
- **Poison-message quarantine** — a raw record that repeatedly fails normalization is quarantined after N attempts into a visible ops queue for review, not retried forever or silently dropped.

---

## 15. Retry strategy

- **Exponential backoff with jitter**, ceilings tuned per source class — a 13F quarterly batch job can retry over hours; a macro-release exact-time job has a tight retry window since lateness defeats its purpose.
- **Idempotent by construction** — because dedup runs on `contentHash` at ingestion (§5), re-fetching and re-submitting a raw record on retry is a safe no-op; retries don't require separate "did this already happen" bookkeeping.
- **Retries and circuit-breaking are deliberately separate concerns** — retries absorb transient failures (a network blip, a momentary rate limit); the breaker (§14) handles sustained failures (source down, credentials revoked). Conflating them either retries forever into a dead source or gives up too early on a blip.

---

## 16. Scalability

- Every layer is stateless and horizontally scalable **by design**, directly correcting the two scalability blockers named in the CTO review: the scheduler is leader-elected/queue-based (§3, not in-process cron), and shared state (caches, dedup windows) lives in a distributed cache, not per-instance memory.
- **Volume-tiered cost/compute scaling** — the cheap pre-filter stage (§2, §17) on high-volume sources means infrastructure cost scales with *relevant* volume, not raw firehose volume.
- **Read and write paths scale independently** — API/Recommendation-Engine reads scale via read replicas/cached query layers; ingestion writes scale via queue depth and worker count.
- The design is intended to work correctly (not merely "fit") at small scale (a single instance set) and to carry to much larger scale by adding workers/replicas to the *same* architecture — statelessness designed in now, not retrofitted later, is what makes that true.

---

## 17. Cost optimization

- **Tiered fetch cadence by source value** — slow-moving, low-value-per-poll sources are not polled as often as fast-moving, high-value ones (§3's per-source schedule registry is the cost lever, not just a freshness one).
- **Pre-filter before expensive stages** — embedding generation and any LLM-assisted summarization only run on records that survive relevance pre-filtering; the majority of raw social volume is discarded before it reaches a costly stage.
- **Batched, cached embedding/LLM calls** — post-dedup, identical or near-identical content is embedded/summarized once, not once per downstream consumer.
- **Source-tier cost awareness** — free/cheap structured government sources (SEC, USPTO, BLS) are treated as primary signal; paid/rate-limited commercial APIs (transcripts, premium news) are used more selectively, gated behind relevance pre-filtering rather than pulled indiscriminately.
- **Per-source cost dashboard as a first-class concern** — spend is tracked per source so a runaway adapter (e.g., a filter bug causing abnormal call volume) is caught immediately, directly addressing the CTO review's flagged absence of any cost-governance layer.

---

## 18. Test strategy

- **Per-adapter contract tests** — each adapter tested against recorded fixture responses (never live API calls in CI), asserting correct mapping into the canonical Event envelope (§4) — consistent with this codebase's existing fixture-based test conventions.
- **Golden-set regression tests for scoring** — a fixed set of known historical events with expected credibility/freshness/importance/corroboration score ranges, run on every change, so scoring logic can't silently drift. This is a capability the CTO review flagged as missing entirely from the current AI pipeline ("no prompt/eval harness") — RIE is designed with one from the start.
- **Adversarial dedup/clustering tests** — near-duplicate paraphrases, syndicated wire stories, and coordinated social posts as fixtures, validating the clustering boundary is neither too aggressive (over-merging distinct events) nor too loose (treating one event as many).
- **End-to-end integration tests** — from a raw fixture record through to a queryable Event, and from RIE's API through to the Recommendation Engine's evidence assembly, verifying the §12 contract holds.
- **Chaos/failure-injection tests** — simulated source outages, malformed payloads, and rate-limit responses, asserting graceful degradation per §14/§15 (no silent data loss, no pipeline crash).
- **Immutability regression test** — extends the existing "no update method" test pattern already applied to `DecisionTrace` today, asserting RIE evidence snapshots referenced by a `DecisionTrace` never change after creation.

---

## 19. Security

- **Real secrets management from day one** — every external credential (news/social/commercial data-provider keys) lives in a secrets manager, not `.env` files, directly correcting the gap the CTO review named as the single most urgent item in the whole engagement.
- **Auth-required APIs from day one** — RIE's endpoints (§11) require service-to-service auth (for the Recommendation Engine) and real user auth for any external-facing surface — no endpoint ships with "Authentication requirements: None," unlike the current API surface.
- **Provenance and licensing tracking** — many of these sources (commercial transcripts, premium news, paid data feeds) carry redistribution restrictions. Every Event carries a license/usage-restriction tag so downstream consumers — including any future external-facing product — cannot inadvertently violate a provider's terms.
- **PII minimization** — social content (Reddit/X) may contain personal information incidental to a financial discussion. Normalization strips/redacts non-entity personal data rather than retaining raw social content indefinitely, which also reduces storage footprint and legal exposure (ties into §10's retention policy).
- **Untrusted-input handling at the adapter boundary** — raw content from open sources, especially social, is treated as untrusted: never interpolated unsanitized into a query, a prompt, or rendered UI. This guards against both traditional injection and prompt-injection via crafted post content reaching any LLM-assisted summarization step.

---

## 20. Future extensions

- **Close the outcome-calibration loop** — RIE evidence → Recommendation → DecisionTrace → actual market outcome → feedback into credibility/importance/freshness weights. This is the moat flywheel named in the CTO review; RIE is the infrastructure that makes it buildable, not the loop itself (the loop is a separate, later initiative once sufficient decision-trace history has accumulated).
- **Multi-language sources** — non-US filings, international news, non-English social — once the core English-language pipeline is proven.
- **Real-time importance alerts** — push notifications for high-importance events on watched symbols, once the auth/multi-tenancy foundation named in the CTO review exists.
- **Additional source categories** as they prove valuable: satellite imagery (economic-activity proxies), job postings (hiring-trend signal), app-store/web-traffic analytics (consumer-demand proxies), litigation/court filings.
- **Self-serve source/entity watching** for power users, once a real product and auth layer exists.
- **A second business line** — RIE's structured, cross-validated, scored event stream is itself a sellable data asset once mature, built on the same infrastructure as the core product rather than a separate system.

---

## Summary: what this design corrects

| CTO review finding | How this design addresses it |
|---|---|
| Keyword-matching dressed as AI (§3.4) | Real embeddings + vector store (§10), semantic search API (§11) |
| No cross-source corroboration | Event Clusters + corroboration/contradiction scoring (§5, §9) |
| In-process, non-distributed scheduler | Leader-elected, queue-based scheduler (§3) |
| In-memory, per-instance caches | Distributed cache, stateless workers throughout (§16) |
| No retention/partitioning policy | Time-partitioned hot store, tiered retention by design (§10) |
| No cost governance | Pre-filtering, batching, per-source cost dashboard (§17) |
| No eval/regression harness for scoring | Golden-set regression tests (§18) |
| Secrets in `.env`, no auth on APIs | Secrets manager and auth-required APIs from day one (§11, §19) |
| Moat asset (`DecisionTrace`) unexploited | Explicit score-versioning + snapshot contract enabling future calibration (§13, §20) |
