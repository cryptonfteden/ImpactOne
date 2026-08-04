# Intelligence Platform Review — Chief Systems Architect Assessment

**Status:** Read-only architectural review. No application code was modified to produce this document.
**Reviewer role:** Chief Systems Architect.
**Scope:** The proposed Intelligence Platform — the current + planned "brain" of ImpactOne, evaluated as five engines (confirmed grouping):

1. **Research Intelligence Engine (RIE)** — proposed, per [RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md](../../architecture/RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md). Ingestion → normalization → dedup/clustering → scoring → classification → storage → APIs, feeding the Recommendation Engine and `DecisionTrace`.
2. **Autonomous Market / Impact Intelligence Engine** — existing. `autonomousMarketService.js` (event pipeline, scoring, global map, alpha discovery, decision center), `impactIntelligenceService.js` (`analyzeIntelligence`/`analyzeImpact`/`analyzePortfolioIntelligence`, orchestrating `relationshipGraphService`, `historicalSimilarityService`, `scenarioEngineService`, `propagationEngineService`, `portfolioIntelligenceService`, `alternativeFusionService`), and `dailyBriefService.js` (daily brief, relevance scoring, action cards).
3. **Recommendation Engine** — `autonomousRecommendationEngine.js` + `autonomousRecommendationRepository.js` + the `Recommendation`/`DecisionTrace` Prisma models. Advisory-only, portfolio-aware, quality-scored BUY/REDUCE/EXIT recommendations.
4. **Investment Committee Engine** — `investmentCommitteeService.js` + `committeeTrackRecordService.js`. Six-persona debate (Macro Strategist, Equity Analyst, Technical Analyst, Alt-Data Analyst, Risk Manager, CIO) producing a vote and CIO synthesis.
5. **Portfolio Engine** — `portfolioEngineService.js` + `portfolioRepository.js`, backed by `Portfolio`/`Position`/`Order`/`Trade`/`CashLedgerEntry`/`PerformanceSnapshot`. Real, transactional buy/sell execution and P&L.

Every claim below is grounded in the current code and the RIE design document, cited by file where relevant.

---

## 1. Is the separation into five engines correct?

**Partially.** Two of the five boundaries are architecturally sound; three are not yet real boundaries so much as three historical layers built at different times over increasingly overlapping inputs.

- **Correct and well-enforced:** Portfolio Engine ↔ everything else. `autonomousRecommendationEngine.js`'s own header comment states the invariant directly: it "never imports `portfolioEngineService.placeOrder` or any portfolio-mutating repository function." This is a real, structurally-checkable boundary, not just an intention.
- **Correct as scoped:** the Research Intelligence Engine (proposed). RIE is explicitly scoped as *infrastructure* (collection, normalization, scoring, storage) that feeds verdict-generating engines rather than generating verdicts itself (§1, §12 of the design doc). That is the right shape for a fifth engine.
- **Not yet a real boundary:** the Autonomous Market/Impact Intelligence Engine, the Recommendation Engine, and the Investment Committee Engine all independently consume overlapping inputs (quote, alt-data summary, market impact score, macro regime) and each produces its own version of "here's the call on this symbol" — a daily-brief action card, a BUY/REDUCE/EXIT recommendation, and a Strong-Buy…Strong-Sell committee vote, respectively — with no reconciliation between them. This is answered in depth in §2-3 below.

**Verdict on this question:** the five-engine model is the right *target* shape once the changes in §3 and §10 are made, but is not yet correct as currently drawn, because three of the five have overlapping ownership of "what should the user do about this."

---

## 2. Which responsibilities overlap?

- **Verdict/signal generation.** The Investment Committee Engine (vote score, -3..+3, mapped to Strong Buy…Strong Sell) and the Recommendation Engine (`qualityScore`, 0-100, mapped to BUY/REDUCE/EXIT) both independently answer "what's the call on this symbol," from materially overlapping inputs, with no shared vocabulary and no reconciliation layer. Nothing prevents them from disagreeing in front of the same user on the same symbol.
- **Attention-surfacing.** `dailyBriefService.js`'s `buildActionCards` (Needs attention / Opportunity detected / Risk increasing / Macro event today / Watchlist movement / Ignore for now) is a third, independent "here's what matters" surface, conceptually redundant with both of the above.
- **Scenario generation.** Both `impactIntelligenceService.js` (`analyzeIntelligence`) and `autonomousRecommendationEngine.js` import `scenarioEngineService` directly and independently — a shared dependency consumed by two engines with no single owning contract for what a "scenario" object means across them.
- **Historical analog / similarity.** `historicalSimilarityService.js` is used today by the Impact Intelligence Engine, and is explicitly named in the RIE design doc (§10) as the thing its vector store is built to replace. This responsibility currently sits in Engine 2 and is slated to migrate into Engine 1 — a planned overlap, not an accidental one, but one that must be tracked to completion (see §10).
- **Alt-data consumption.** `investmentCommitteeService.js` and `dailyBriefService.js`/`impactIntelligenceService.js` each independently call `getAltDataSummary`, rather than sharing one evidence-assembly stage — duplicated integration surface for the same underlying data.
- **Scoring vocabularies.** Three incompatible scoring systems exist for adjacent concepts: Recommendation Engine's `qualityComponents` (`sourceQuality`, `evidenceFreshness`, `portfolioRelevance`, `evidenceAgreement`, `dataCompleteness`, `modelConfidence` — documented weights in `autonomousRecommendationEngine.js`), the Committee's per-agent `confidence` + vote score, and RIE's proposed credibility/freshness/importance/corroboration scores (§6-9 of the design doc). RIE's own design commits to reconciling with Recommendation Engine's quality components (§12) but never mentions the Committee's independent scoring at all — a gap, not just an overlap.

---

## 3. Which engines should be merged?

**Merge the Investment Committee Engine's verdict output into the Recommendation Engine / `DecisionTrace` pipeline.** Keep the committee's multi-agent debate framing — it is a genuinely good explainability device (bull/bear arguments and confidence per persona) — but stop treating it as a second, independently-persisted verdict system. Concretely:

- The committee's six-persona debate becomes one more evidence/explanation input assembled into a single `Recommendation` + immutable `DecisionTrace` record, rather than writing to its own JSON-file-backed track record (`committeeTrackRecordService.js`) with its own Strong-Buy…Strong-Sell scale.
- This removes the "two independent, potentially-disagreeing buy signals" UX and trust problem named in §2, and gives committee output the same auditability (Postgres-backed, immutable-by-convention `DecisionTrace`) the Recommendation Engine already has — the committee's decision history is currently *less* auditable than the Recommendation Engine's, despite both claiming to produce investment verdicts.
- **Do not merge RIE and the Autonomous Market/Impact Intelligence Engine as two permanent, separately-deployed systems** — but do not treat Engine 2 as a stable, permanent member of the five either. RIE's own design doc explicitly plans to "generalize and subsume" `historicalSimilarityService.js` and `autonomousMarketService.js`'s event catalog (§12). Engine 2 should be understood as *scheduled for internal replacement*, with its externally-visible contract (the matched-events/feed shape Recommendation Engine consumes) preserved across the swap, not as a permanent fifth of the platform.
- **Portfolio Engine should remain fully separate.** This boundary is already correct (§1) and should not be touched.

---

## 4. Which engines are missing?

- **An Outcome/Calibration Engine.** The RIE design doc itself names the outcome-calibration flywheel (recommendation → outcome → recalibrated credibility/freshness/importance weights) as "the moat" (§20), then explicitly defers building it to "a separate, later initiative." Given every prior CTO-level review of this codebase has identified exactly this loop as the platform's actual defensible advantage, its absence from the five-engine plan is a real gap, not a minor one — it should be named as a sixth engine on the roadmap, not left implicit.
- **A Personalization/Preference Engine.** No engine today owns user risk tolerance, investment horizon, exclusions, or personalized alert thresholds — each of the five engines currently infers "personal relevance" ad hoc (e.g., `autonomousRecommendationEngine.js`'s `buildPersonalRelevance` is a one-line heuristic based on held-position/watchlist membership, not a stored preference).
- **An Identity/Tenancy layer.** Not a sixth "intelligence" engine in its own right, but its absence undermines all five: nothing in the schema ties a `Recommendation`, `DecisionTrace`, `AutonomousRunLog`, or committee decision to a specific user. This should be named explicitly as a hard dependency before any of the personalization work implied by Q3's merge or Q4's Personalization Engine can be done correctly.
- **A Notification/Delivery Engine.** Recommendations, committee verdicts, and daily-brief items are all computed, but nothing proactively pushes or alerts a user — every surface is poll-only (fixed 60s refresh). Turning a computed signal into a delivered notification is a distinct responsibility none of the five engines currently own.

---

## 5. Which parts will become bottlenecks?

- **The Impact Intelligence Engine's synchronous fan-out.** `impactIntelligenceService.js`'s `analyzeIntelligence` already does a `Promise.all` across `getUnifiedFusion`, historical matching, propagation, and graph-building per call, feeding both the Daily Brief and (indirectly) the Recommendation Engine. This will only worsen as RIE adds more source categories onto the same real-time paths, unless RIE's evidence is precomputed/pulled from its own store rather than triggering fresh fan-out per request.
- **The Committee Engine's local JSON-file store.** `committeeTrackRecordService.js` persists via synchronous, unlocked `fs.readFileSync`/`writeFileSync` — a hard bottleneck and single point of failure the moment write volume increases or more than one instance runs. This is resolved as a side effect of the Q3 merge (moving committee history into the same Postgres-backed `DecisionTrace` model).
- **RIE's Raw Intake Queue + Scheduler**, if under-provisioned, becomes the whole platform's bottleneck, since every one of the five engines' freshness depends on it. The design is correctly built for horizontal scaling (leader-elected scheduler, stateless workers — §3, §16), but this is a *projected* bottleneck on unproven infrastructure, not a current one, and should be load-tested before full cutover, not assumed correct because the design document says so.
- **Recommendation Engine's `runOnce()` sequential per-symbol loop.** Already flagged in prior review as a sequential `for...of` loop; RIE will increase the volume and depth of evidence per symbol, multiplying this bottleneck's severity if it isn't parallelized before RIE evidence volume grows.
- **The shared `intelligenceCache.js`.** The Impact Intelligence Engine, Daily Brief, and (indirectly) the Committee Engine all read/write through the same single in-process TTL cache, already flagged for high key-cardinality (`JSON.stringify(context)`-based keys). As RIE adds real corroboration/embedding lookups on top, this cache's hit rate will degrade further, becoming a bottleneck exactly where freshness matters most.
- **Vector similarity search (RIE §10, §11).** No query-time budget is specified for `POST /api/v2/intelligence/search`. Nearest-neighbor search over a growing embedding corpus, if executed inline on a live request path, is a likely latency bottleneck as the corpus grows — see §8/§9 for the required async/precompute treatment.

---

## 6. Which interfaces should be stable public contracts?

- **The matched-events/Event feed shape** consumed by the Recommendation Engine from the Impact Intelligence Engine today (`headline`, `importanceScore`, `whyItMatters`, `sourceUrl`/`sourceName`/`publishedAt`, `confidence`, `reliability`, `impactType`, `riskLevel`, `timeHorizon`, `counterarguments`, `invalidationSignals`, `personalRelevance`) — RIE's design doc already commits to this as additive/preserved (§12); it should be formally versioned and locked, since it will soon be depended on by 3-4 of the five engines, not just one.
- **RIE's symbol-timeline API** (`GET /api/v2/intelligence/symbols/:symbol/timeline`) — the primary feed multiple engines will consume; needs a versioned, paginated, documented contract from the day it ships, not one that evolves ad hoc after engines have already integrated against it.
- **The `Recommendation`/`DecisionTrace` schema** — already effectively a stable, immutable-by-convention contract, and should remain the single canonical "verdict" record that Committee output is folded into (§3), rather than each engine inventing its own persisted verdict shape.
- **RIE's versioned score contract** (credibility/freshness/importance/corroboration, §6-13 of the design doc) — should be locked as the *one* shared vocabulary for "how good is this evidence," consumed identically by the Recommendation Engine and, post-merge, the Committee — replacing today's three incompatible scoring systems (§2).
- **The Portfolio Engine's read-only position/allocation surface** consumed by the Recommendation Engine — already stable and narrow, and should remain exactly that shape as a locked, *structurally* enforced boundary (a module-boundary/lint rule, not just a code comment, given how much the advisory-only invariant is relied on).

---

## 7. Which data should remain immutable?

- **`DecisionTrace` rows** — already immutable by convention (repository exposes create + read only). This should be enforced at the repository/DB layer (no update method reachable at all, ideally backed by a DB-level restriction), not left as a convention that a future change could accidentally violate — especially once the Committee merge (§3) adds a second producer writing into the same model.
- **RIE's Raw Intake Queue records** — already specified as append-only/replayable (§2 of the design doc); this must remain true even as retention/partitioning policy moves old data to cold storage — rollover, never delete-then-mutate.
- **Evidence snapshots referenced by a `DecisionTrace`** — evidence IDs and the score values *as they existed at decision time* (RIE §13's versioned-score mechanism) must be frozen at creation. This pattern is correct and should be locked in before any engine writes a `DecisionTrace` against RIE-sourced evidence.
- **Committee decision history**, once folded into `DecisionTrace` (§3), inherits this same guarantee — the single biggest reliability upgrade the merge buys.
- **Historical/backtest evidence used by a future Outcome/Calibration Engine (§4)** — inputs used to grade a past decision must never be retroactively altered, or the calibration loop itself becomes untrustworthy.
- Everything else — live scores, credibility ratings, cache contents, "today's" daily-brief state — is correctly mutable/versioned today and should stay that way; immutability should be reserved for audit/decision records, not applied indiscriminately to working data.

---

## 8. Which computations should be asynchronous?

- RIE's entire ingestion → normalization → dedup/clustering → scoring → classification pipeline — already designed this way (§2-9 of the design doc) and must never run synchronously inline with a user request.
- Embedding generation and any LLM-assisted summarization (RIE §17) — explicitly batch/async in the design; this should be locked as a hard requirement, not something that quietly moves onto the request path during implementation "for simplicity."
- The Committee Engine's multi-agent debate (six personas × OpenAI-context construction per analysis) — today invoked synchronously per request; should move to background execution with a polling/webhook result pattern, especially once folded into the Recommendation pipeline (§3).
- The Recommendation Engine's `runOnce()` full-universe scan — already a scheduled background job (correct), and must stay strictly off any user-request path as RIE-sourced evidence depth grows.
- The Daily Brief's OpenAI-generated executive summary — already has a rule-based fallback (good precedent to keep), but the AI-generation call itself should be precomputed on a schedule ahead of first dashboard view, not generated synchronously on first page load.
- The (currently missing, §4) outcome-calibration loop — inherently a scheduled/batch process (it grades historical decisions against realized outcomes) and must never be conflated with any real-time path.

---

## 9. What should never happen on the request path?

- **Any direct third-party call** (OpenAI, Finnhub, NewsAPI, or RIE's own source adapters) triggered synchronously by an inbound user HTTP request. Every one of the five engines has at least one place this happens today (`aiController.js`, `chatService.js`, the Committee's per-agent construction, the Daily Brief's OpenAI summary call) — RIE must not add a sixth instance of the same pattern for its own adapters.
- **Vector/embedding similarity search** over a large, growing corpus (RIE §10-11) run inline for a live user query, with no precomputed/cached fast path for commonly-viewed symbols.
- **Any write to `Recommendation`/`DecisionTrace`** (or, post-merge, the folded-in Committee verdict) as a side effect of a GET request — these should only ever be written by the scheduled `runOnce()`-style background job.
- **Full-universe or multi-symbol fan-out scans.** Today, `POST /api/v2/recommendations/run` is directly reachable over HTTP with no distinction between "internal scheduled trigger" and "user-initiated request" — this conflates a background job with a public endpoint and is both a performance and a cost-control risk (a full-universe AI-backed scan should never be one unauthenticated HTTP call away).
- **Blocking file I/O.** The Committee's synchronous JSON-file persistence is confirmed happening today on what is effectively a request-adjacent path and must be eliminated as part of the Q3 merge.
- **Note the one correct exception:** the Portfolio Engine's order-placement path (`placeOrder`) *should* remain synchronous on the request path — a user placing a simulated trade expects an immediate, consistent result. This is the one place "synchronous on request" is the right design, and it should not be swept into the same async-everything treatment as the four intelligence engines.

---

## 10. What architecture decisions should be locked before implementation?

1. **The single canonical "verdict" contract.** Decide now that Committee output folds into `Recommendation`/`DecisionTrace` (§3) rather than remaining a second, permanently separate signal. Every sprint the two coexist independently deepens the "two engines disagree" trust problem.
2. **The single shared scoring vocabulary** (credibility/freshness/importance/corroboration, RIE §6-9) as the one source of truth for evidence quality, adopted by both the Recommendation Engine and the (merged) Committee — lock this before RIE's cutover begins; retrofitting a second scoring system later is far more expensive than designing one now.
3. **RIE's Event envelope (§4) as versioned and frozen early**, since 3-4 of the five engines will depend on it. Changing this shape after multiple engines have integrated against it is a breaking change across the whole platform, not a local one.
4. **A single owning scheduler/queue for all background computation** — extend RIE's proposed leader-elected scheduler (§3) to also own the Recommendation Engine's `runOnce()` and the (merged) Committee's debate runs, rather than each engine keeping its own ad hoc trigger (`node-cron`, manual HTTP call). Decide this before RIE's scheduler is built, so it is built to serve all engines, not just RIE's own sources.
5. **Where multi-tenancy/user identity attaches.** Every engine's data model currently assumes a single tenant. Decide now that a dedicated Identity/Tenancy layer (§4) owns "whose portfolio/watchlist/preferences is this," rather than letting RIE, the Committee merge, and any future personalization work each reference user identity in incompatible, ad hoc ways.
6. **The retention/partitioning policy for hot-store data**, extended beyond RIE's own store (§10 already gets this right for itself) to `Recommendation`/`DecisionTrace`, which currently has no retention/archival policy at all. Don't let RIE ship with a retention policy while the engines it feeds still don't have one.
7. **`DecisionTrace` immutability enforced structurally**, not by convention/comment — a repository-layer restriction or DB-level guard preventing any `UPDATE`, locked in before the Committee merge introduces a second write path that could otherwise violate the guarantee by accident.
8. **An explicit internal-only vs. public-facing endpoint distinction** for anything that fans out across the full symbol universe or calls a paid third-party API (service-to-service auth, per RIE §19) — locked before `/run`-style endpoints proliferate further across engines.

---

## Summary Table

| # | Question | One-line answer |
|---|---|---|
| 1 | Correct 5-way split? | Partially — Portfolio Engine and RIE's boundaries are correct; Impact Intelligence, Committee, and Recommendation currently overlap. |
| 2 | Overlaps? | Verdict generation, attention-surfacing, scenario generation, historical-analog ownership, alt-data consumption, and three incompatible scoring vocabularies. |
| 3 | Merge? | Fold Committee's verdict output into Recommendation/DecisionTrace; keep Portfolio Engine fully separate; treat Impact Intelligence Engine as scheduled for internal replacement by RIE. |
| 4 | Missing? | Outcome/Calibration Engine, Personalization/Preference Engine, Identity/Tenancy layer, Notification/Delivery Engine. |
| 5 | Bottlenecks? | Synchronous fan-out in Impact Intelligence Engine, Committee's JSON-file store, RIE's unproven queue/scheduler at scale, `runOnce()`'s sequential loop, shared `intelligenceCache.js`, inline vector search. |
| 6 | Stable contracts? | Matched-events/Event feed shape, RIE's symbol-timeline API, the Recommendation/DecisionTrace schema, RIE's versioned score contract, Portfolio Engine's read-only surface. |
| 7 | Immutable data? | DecisionTrace rows, RIE's raw intake records, evidence/score snapshots referenced by a trace, (post-merge) committee decision history, future calibration inputs. |
| 8 | Async computations? | RIE's full ingestion pipeline, embedding/LLM summarization, Committee debate, `runOnce()`, Daily Brief AI summary, future calibration loop. |
| 9 | Never on request path? | Third-party calls, inline vector search, verdict-record writes, full-universe scans, blocking file I/O — except Portfolio Engine's order placement, which correctly stays synchronous. |
| 10 | Lock before implementation? | Canonical verdict contract, shared scoring vocabulary, frozen Event envelope, single scheduler, tenancy ownership, retention policy, structural trace immutability, internal-vs-public endpoint boundary. |

---

## Final Determination

**GO WITH CHANGES**

The Research Intelligence Engine design is sound, correctly scoped, and directly addresses real, previously-named gaps (keyword-matching-as-AI, in-process scheduling, no retention policy, no cost governance, no eval harness). It should proceed. However, it should not proceed as the fifth engine bolted onto an unresolved four-engine overlap problem: the Committee Engine and Recommendation Engine currently produce two independent, unreconciled investment verdicts from overlapping evidence, no engine owns outcome calibration despite it being named repeatedly as the platform's actual moat, and there is no identity/tenancy layer for any of the five engines to personalize against. Lock the eight decisions in §10 — especially the Committee/Recommendation merge and the shared scoring vocabulary — before writing implementation code, since every one of them is far cheaper to decide now than to retrofit after two or three engines have already integrated against an unlocked contract.
