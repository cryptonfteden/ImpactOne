# Sprint 18B — Research Intelligence Engine: First Production Slice
## Implementation Plan

**Status:** Planning only. No code, migrations, or commits are part of this deliverable.
**Scope:** The first usable vertical slice of the Research Intelligence Engine (RIE) — SEC filings, earnings releases, financial news, and macroeconomic releases, ingested through the canonical Event Envelope, normalized, deduplicated, scored, persisted, served via a retrieval API, and integrated into the existing Recommendation Engine and `DecisionTrace`.
**Explicitly out of scope for this slice:** Reddit, X, patents, shipping/supply-chain data, insider trading, 13F filings, geopolitical feeds. These are later phases per `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md`.
**Grounding constraint:** every contract this plan uses already exists as real, committed code from Sprint 18A — `backend/services/eventEnvelope.js`, `backend/services/scoringVocabulary.js`, `backend/services/canonicalVerdict.js`, and the `DecisionTrace.evidenceReferences`/`modelVersionMetadata` columns. This plan does not redesign those contracts; it builds the first real producer and consumer for them.

---

## 0. Scoping decisions made up front

Three deliberate, conservative choices shape everything below — stated once here rather than re-justified in every section:

1. **No new infrastructure dependency.** No Redis, no BullMQ, no Kafka. Background work runs on `node-cron`, the same pattern already proven in `schedulerService.js` (bootstrapped only from `server.js`, never `app.js`, to avoid leaking timers into test runs). The full `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md`'s distributed, leader-elected scheduler (§3) is real future work, not this slice's problem — this app runs as a single instance today, and building for a scale it doesn't have yet is exactly the over-engineering the CTO review warned against.
2. **Cross-source corroboration/Event Clustering is deferred.** The user's scope list asks for deduplication, not cross-source validation — those are different problems (§5 vs. §9 of the RIE design doc). This slice does exact + near-duplicate dedup only. Event Clusters, corroboration scoring, and contradiction detection are Sprint 18C+ work.
3. **`freshnessScore` and `relevanceScore` are computed on read, never persisted as stale columns.** Both are time/query-relative — freshness decays continuously from `publishedAt`, and relevance depends on which symbols/watchlist the *caller* cares about, not a fixed property of the event. Storing them as columns would mean serving stale numbers. Only `credibilityScore` (source-intrinsic) is persisted. This directly matches the RIE design doc §7's explicit "freshness recalculates on read" principle and avoids introducing a staleness bug into a system built specifically to fix one.

---

## 1. Architecture

```
 SEC EDGAR   Finnhub Earnings   NewsAPI (existing)   FRED
     │              │                  │              │
     ▼              ▼                  ▼              ▼
 rieSecFilings  rieEarnings       rieNews          rieMacro
 Adapter.js     Adapter.js        Adapter.js       Adapter.js
     │              │                  │              │
     └──────────────┴────────┬─────────┴──────────────┘
                              ▼
                  RieRawIntakeRecord (Postgres, durable, replayable)
                              │
                    rieIngestionScheduler.js
                    (node-cron "processing sweep")
                              ▼
                     rieNormalizer.js
              (eventEnvelope.buildEventEnvelope)
                              ▼
                    rieDeduplicator.js
          (exact: DB unique constraint on deduplicationKey
           near-dup: shingle check, news only)
                              ▼
                    rieScoringService.js
     (credibilityScore persisted; freshness/relevance NOT persisted)
                              ▼
                       rieEventStore.js
                              ▼
                        RieEvent (Postgres)
                              │
                 ┌────────────┴─────────────┐
                 ▼                           ▼
        rieRetrievalService.js      rieRecommendationBridge.js
        (GET /api/v2/intelligence/*)         │
                 │                           ▼
                 ▼              autonomousRecommendationEngine.js
          Frontend / API              findMatchedEvents() [additive]
                 consumers                   │
                                              ▼
                                   Recommendation.explanation
                                   DecisionTrace.evidenceReferences
                                   (real canonical envelopes, Sprint 18A columns)
```

Every box under "canonical Event Envelope" already exists as a contract from Sprint 18A; this sprint builds the boxes that produce and consume it for real.

---

## 2. Exact data flow

One event, source to Recommendation Engine, step by step:

1. `rieIngestionScheduler.js` fires a source's fetch job on its own cadence (e.g. SEC filings every 15 min, news every 10 min, macro every 60 min — see §6).
2. The adapter's `fetch(cursor)` calls the external source, bounded to the Recommendation Engine's active universe (held positions + watchlist + default watchlist symbols — never the full market).
3. Each raw record is written to `RieRawIntakeRecord` with `status = PENDING`, before any transformation — durable and replayable, so a bug downstream never loses raw data.
4. A separate, more frequent node-cron "processing sweep" job (every 2 minutes) claims `PENDING` records and runs them through:
   a. `rieNormalizer.js` → `eventEnvelope.buildEventEnvelope(raw)` — the canonical 19-field shape, `freshnessScore`/`relevanceScore` populated as `null` at this stage (satisfies the envelope's field-presence contract; values are computed later at read time, per §0.3).
   b. `rieDeduplicator.js` → checks `deduplicationKey` (from `eventEnvelope.buildDeduplicationKey`, already deterministic and tested in Sprint 18A) against `RieEvent`'s unique index. Exact match → link the raw record to the existing event, mark `PROCESSED`, stop. For `sourceType = NEWS` only, also runs a shingle-similarity check against recent events for the same symbols (near-duplicate — syndicated wire stories).
   c. `rieScoringService.js` → computes `credibilityScore` (source-type-aware; see §5) and stores it. Does **not** compute freshness/relevance here.
5. `rieEventStore.js` persists the finished `RieEvent` row, links `RieRawIntakeRecord.eventId`, marks the raw record `PROCESSED`.
6. On any failure in step 4, `processingAttempts` increments, `nextRetryAt` is set (exponential backoff), and the record stays `PENDING` for the next sweep — up to a max attempt count, after which it flips to `POISON` (quarantined, never retried forever, never silently dropped — see §8).
7. `rieRetrievalService.js` serves `RieEvent` rows via the read-only API (§12), computing `freshnessScore` (`scoringVocabulary.normalizeEvidenceFreshness(publishedAt)`) and `relevanceScore` (new `computeRelevanceScore`, symbol-source-aware) fresh on every read.
8. `rieRecommendationBridge.js`'s `getMatchedEventsForSymbol(symbol, context)` calls `rieRetrievalService.getSymbolTimeline(symbol)`, reshapes each `RieEvent` into the **exact legacy matchedEvent shape** (`headline, importanceScore, whyItMatters, sourceUrl, sourceName, publishedAt, confidence, reliability, impactType, riskLevel, timeHorizon, counterarguments, invalidationSignals, personalRelevance`) that `autonomousRecommendationEngine.js` already consumes — so nothing downstream (`buildExplanation`, `computeQualityScore`, the Sprint 18A committee-debate threading) needs to change shape-wise.
9. `autonomousRecommendationEngine.js`'s `findMatchedEvents` merges the legacy feed's matched events with the bridge's RIE-sourced ones (deduped by headline+sourceUrl, RIE preferred on overlap since it carries real, canonically-scored data), capped at the existing limit of 5.
10. `buildEvidenceReferences` (added in Sprint 18A) uses the **real original envelope** for RIE-sourced matched events (returned alongside the reshaped legacy-shape object by the bridge, no extra round-trip) instead of re-deriving one via `adaptLegacyFeedItemToEnvelope`. Non-RIE-sourced matched events keep using the existing legacy-adapter path, unchanged.
11. `DecisionTrace.evidenceReferences` and `modelVersionMetadata` (both already real Sprint 18A columns) are now populated with real, persisted, deduplicated, credibility-scored evidence for RIE-covered symbols — the concrete prerequisite the future Alpha Attribution Engine (`INTELLIGENCE_PLATFORM_BLUEPRINT.md`) needs: stable evidence IDs to grade against real outcomes.

---

## 3. Source adapters

| Source | Provider | Cost | Cadence | Cursor strategy | Notes |
|---|---|---|---|---|---|
| SEC filings | SEC EDGAR full-text search + company submissions API (`data.sec.gov`) | Free, public | Every 15 min | Last-seen accession number per CIK | Scoped to 10-K/10-Q/8-K for symbols in the active universe only, not the full market. Requires a descriptive `User-Agent` header per SEC's usage policy; capped at ≤10 req/sec. |
| Earnings releases | Finnhub earnings calendar (already-integrated provider, `finnhubService.js`) | Free tier covers calendar/EPS actual-vs-estimate; full transcript text requires a premium Finnhub add-on | Every 60 min | Last-seen earnings-calendar entry timestamp per symbol | **Honest scoping note:** full earnings-call *transcripts* are not free anywhere without a paid provider. This slice guarantees the earnings-release/EPS-surprise event (free, real, already-reachable via the existing Finnhub integration); transcript text ingestion is an explicitly flagged, cost-gated optional enhancement for a later phase, not assumed available here. |
| Financial news | NewsAPI.org, via the **existing** `newsService.js`/`autonomousMarketService.buildNewsQueryTerms`/`rankNewsArticles` (Sprint 16 Phase C) | Already in use, no new cost | Every 10 min | Handled by existing query-construction logic | Not a new integration — `rieNewsAdapter.js` is a thin wrapper that feeds the *existing* personalized news pipeline into the canonical envelope, rather than the legacy feed shape. Reuses Phase C's cost discipline unchanged. |
| Macro releases | FRED (Federal Reserve Economic Data) API (`api.stlouisfed.org`) | Free, public, ~120 req/min | Every 60 min, plus event-anticipated exact-time triggers for known release dates (CPI, NFP, FOMC — pulled from FRED's own release-calendar endpoint) | Last-seen observation date per series | A small, fixed set of series for this slice: CPI, unemployment rate, Fed funds rate, GDP growth — the same indicators `autonomousMarketService`'s `macroRegime` already reasons about informally; this makes that reasoning evidence-backed instead of implicit. |

All four adapters implement one shared interface: `fetch({ symbols, since }) → RawRecord[]`, matching the contract already named (but not yet built) in `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` §2.

---

## 4. Schemas

Two new Prisma models, two new enums. No existing table is altered — `Recommendation` and `DecisionTrace` already have everything they need from Sprint 18A.

**`RieRawIntakeRecord`**

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `sourceType` | `RieSourceType` (enum: `SEC_FILING`, `EARNINGS`, `NEWS`, `MACRO`) | |
| `sourceAdapterVersion` | `String` | for future replay/reprocessing after an adapter bugfix |
| `rawPayload` | `Json` | untouched adapter response |
| `fetchedAt` | `DateTime @default(now())` | |
| `status` | `RieIntakeStatus` (enum: `PENDING`, `PROCESSED`, `FAILED`, `POISON`) | |
| `processingAttempts` | `Int @default(0)` | |
| `nextRetryAt` | `DateTime?` | null until a failure schedules a retry |
| `lastError` | `String? @db.Text` | |
| `eventId` | `String?` | set once processed; FK to `RieEvent` |
| Indexes | `@@index([status, sourceType])`, `@@index([fetchedAt])` | |

**`RieEvent`** (the persisted, canonical, credibility-scored event — mirrors `eventEnvelope.js`'s 19 fields, minus the two computed-on-read scores, plus operational columns)

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | maps to the envelope's `eventId` |
| `eventType` | `String` | |
| `sourceType` | `RieSourceType` | |
| `sourceName` | `String?` | |
| `sourceUrl` | `String?` | |
| `publishedAt` | `DateTime?` | freshness is derived from this at read time, never stored |
| `ingestedAt` | `DateTime @default(now())` | |
| `entities` | `Json` | array |
| `symbols` | `String[]` | Postgres native array; GIN-indexed |
| `sectors` | `String[]` | |
| `countries` | `String[]` | |
| `summary` | `String @db.Text` | |
| `rawReference` | `String?` | |
| `credibilityScore` | `Decimal @db.Decimal(5,2)` | the one persisted score — source-intrinsic, doesn't change per query |
| `confidence` | `Decimal? @db.Decimal(5,2)` | from the source, when available |
| `provenance` | `Json` | `{ sourceName, sourceUrl }` |
| `deduplicationKey` | `String @unique` | deterministic hash from `eventEnvelope.buildDeduplicationKey` — DB-enforced idempotency, not just app logic |
| `rawIntakeRecordId` | `String` | FK to `RieRawIntakeRecord`, traceability to the untouched raw payload |
| `createdAt` | `DateTime @default(now())` | |
| Indexes | `@@index([symbols], type: Gin)`, `@@index([sourceType, publishedAt])` | |

**`RieAdapterCursor`** — `{ sourceType (unique), cursorValue (String), updatedAt }` — per-source fetch progress, so a restart resumes rather than re-fetching or missing a gap.

**`RieRunLog`** — mirrors the existing `AutonomousRunLog` model exactly: `{ id, startedAt, sourceType, recordsFetched, eventsCreated, duplicatesSkipped, errors (Json?) }` — one row per scheduled fetch *or* processing-sweep run.

---

## 5. Services

All new files follow the existing flat `backend/services/*.js` convention (no subdirectories, matching every existing service in this codebase) and the existing namespace-import/export style so they're monkey-patch-testable, per this repo's established test-seam convention.

| File | Responsibility |
|---|---|
| `rieEventStore.js` | Prisma repository: `createRawIntakeRecord`, `markRawIntakeProcessed`, `markRawIntakeFailed`, `listPendingRawIntake`, `createEvent` (idempotent — upsert on `deduplicationKey`, never insert-or-throw), `getEventById`, `listEventsBySymbol`, `listEvents`, `upsertAdapterCursor`, `getAdapterCursor`, `createRunLog`. |
| `rieSecFilingsAdapter.js` | `fetch({ symbols, since })` against SEC EDGAR. |
| `rieEarningsAdapter.js` | `fetch({ symbols, since })` against Finnhub's earnings calendar. |
| `rieNewsAdapter.js` | `fetch({ symbols, since })` — thin wrapper over the *existing* Phase C news pipeline, reshaped for the raw-intake table instead of the legacy feed. |
| `rieMacroAdapter.js` | `fetch({ since })` against FRED. |
| `rieNormalizer.js` | `normalizeRawRecord(rawIntakeRecord) → EventEnvelope`, via `eventEnvelope.buildEventEnvelope`. |
| `rieDeduplicator.js` | `checkDuplicate(envelope)` — DB-constraint-backed exact check; `checkNearDuplicate(envelope)` — shingle similarity, news only. |
| `rieScoringService.js` | `computeCredibilityScore(sourceType, sourceName)` — source-type-aware baseline (below); `computeFreshnessScore(publishedAt)` — thin call to `scoringVocabulary.normalizeEvidenceFreshness`; `computeRelevanceScore(event, { heldSymbols, watchlistSymbols })` — new, read-time only, reusing the same 100/70/40 portfolio/watchlist/market-scan tiering already established in `autonomousRecommendationEngine.computeQualityScore`'s `portfolioRelevance`, so "relevance" means the same thing everywhere in the platform. |
| `rieIngestionScheduler.js` | node-cron jobs: one fetch job per adapter, one processing-sweep job. Bootstrapped only from `server.js`, mirroring `schedulerService.js` exactly. Exposes `getStatus()`/per-source enable-disable, same shape as the existing scheduler. |
| `rieRetrievalService.js` | `getSymbolTimeline(symbol, { limit, since })`, `listEvents({ symbols, sourceType, since, limit })`, `getEventById(id)` — attaches computed `freshnessScore`/`relevanceScore` on every call. |
| `rieRecommendationBridge.js` | `getMatchedEventsForSymbol(symbol, context) → { legacyShapeEvents, envelopesByHeadlineKey }` — the compatibility seam described in §2 step 8. |

**`computeCredibilityScore` baselines** (extends, doesn't duplicate, `scoringVocabulary.SCORE_DEFINITIONS.sourceCredibility`):
- `SEC_FILING` → 100 (primary/official source by construction).
- `MACRO` → 100 (primary/official source by construction).
- `EARNINGS` → 90 (company/exchange-originated, not third-party, but not a government filing).
- `NEWS` → delegates to `scoringVocabulary.normalizeSourceCredibility(sourceName)` unchanged (95 known-outlet / 60 default).

---

## 6. Background jobs

| Job | Cadence | Owner |
|---|---|---|
| SEC filings fetch | Every 15 min | `rieIngestionScheduler.js` → `rieSecFilingsAdapter` |
| Earnings calendar fetch | Every 60 min | → `rieEarningsAdapter` |
| News fetch | Every 10 min | → `rieNewsAdapter` |
| Macro release fetch | Every 60 min, plus event-anticipated triggers on known release dates | → `rieMacroAdapter` |
| Processing sweep (normalize → dedup → score → persist) | Every 2 min | `rieIngestionScheduler.js` |

All jobs are independently enable/disable-able (mirroring `schedulerService.js`'s existing per-engine toggle), so a problem with one source (e.g. SEC EDGAR down) never stops the others.

---

## 7. Queueing

No message broker in this slice (§0.1). The "queue" is `RieRawIntakeRecord.status`, polled by the processing-sweep job. This is an accepted, explicitly-documented limitation: with a single app instance (true today), simple polling is correct. **If this app is ever horizontally scaled before a real queue is introduced, the processing-sweep claim step needs `SELECT ... FOR UPDATE SKIP LOCKED` (or equivalent) to avoid two instances double-processing the same record — flagged here so it isn't silently forgotten, not solved now because it isn't yet a real problem.**

---

## 8. Retry policy

- **Adapter fetch failures:** no busy-retry loop — the next scheduled cron tick is the retry. A per-source consecutive-failure counter (in-memory, reset on success) trips a circuit breaker after 5 consecutive failures: further fetch attempts for that source are skipped (logged, not silently dropped) until a 30-minute cooldown elapses.
- **Processing failures:** `processingAttempts` increments per failure; `nextRetryAt` is set via exponential backoff (1 min, 5 min, 15 min, 30 min, 60 min). The processing sweep never claims a record before its `nextRetryAt`. After 5 attempts, `status → POISON` — visible via the status endpoint (§12), never retried automatically again, never deleted.

---

## 9. Idempotency

- **Primary mechanism:** `RieEvent.deduplicationKey` is a DB-level `@unique` constraint, not just an application check. `rieEventStore.createEvent` is an upsert keyed on it — reprocessing the same raw record (e.g. after a retry, or after a full replay from `RieRawIntakeRecord`) is always a safe no-op, never a duplicate row.
- **Fetch idempotency:** `RieAdapterCursor` persists each source's last-seen position, so a restart resumes rather than re-fetching history or missing a gap.
- **Replay safety:** because raw payloads are durable in `RieRawIntakeRecord` before any transformation, a normalizer or scoring bug can be fixed and the affected raw records reprocessed from `PENDING`/`FAILED` without re-hitting the external provider at all.

---

## 10. Cost controls

- Universe bounding: every adapter fetches only for symbols in the Recommendation Engine's active universe (held + watchlist + default watchlist) — never the full market, regardless of provider.
- SEC EDGAR and FRED are free but rate-limited by policy; adapters respect documented limits (≤10 req/sec SEC, ~120 req/min FRED) via a simple delay between requests.
- Finnhub earnings calls reuse the existing `finnhubCache.js` TTL cache — no new cost pattern introduced.
- News reuses the existing Phase C query-construction/ranking/cost discipline unchanged.
- A hard per-source daily fetch-count ceiling (constant, e.g. 2,000/day) guards against a cursor bug causing a re-fetch-everything loop — logged and the adapter self-disables for the remainder of the day if hit, rather than looping silently against a provider.

---

## 11. Observability

- Structured `console.log` with a `[rie:<adapter>]` prefix — matching the existing `[ai-controller]`/`[openai]` prefixed-log convention already in this codebase, not a new logging framework (that's a separate, already-named CTO-review item, out of scope here).
- `RieRunLog` — one row per fetch or processing-sweep run (records fetched, events created, duplicates skipped, errors), the same pattern `AutonomousRunLog` already established.
- `GET /api/v2/intelligence/status` — mirrors `GET /api/v2/recommendations/status`'s shape exactly: per-source enabled/running state, last run, and the latest `RieRunLog` per source. This is the seed of real cost/health observability — a full dashboard is future work.

---

## 12. Retrieval API

All read-only. No endpoint ever writes an event or triggers ingestion — ingestion only happens via the scheduler, matching the RIE design's explicit "never a write as a side effect of a GET" principle.

| Endpoint | Purpose |
|---|---|
| `GET /api/v2/intelligence/events` | Filterable by `symbols` (comma list), `sourceType`, `since`, `limit`; paginated. |
| `GET /api/v2/intelligence/events/:id` | Single event detail, full canonical envelope with live-computed freshness/relevance. |
| `GET /api/v2/intelligence/symbols/:symbol/timeline` | Chronological feed for one symbol — the primary feed `rieRecommendationBridge.js` consumes. |
| `GET /api/v2/intelligence/status` | Engine/run status per source (§11). |

---

## 13. Integration into the Recommendation Engine

- `autonomousRecommendationEngine.findMatchedEvents(feed, symbol, context)` gains an additive path: after computing legacy matched events (unchanged), also calls `rieRecommendationBridge.getMatchedEventsForSymbol(symbol, context)` and merges the two arrays, deduped by `(headline, sourceUrl)` with RIE preferred on overlap (richer, canonically-scored), capped at the existing limit of 5. If RIE has no coverage yet for a symbol, the legacy feed behaves exactly as it does today — zero regression risk.
- **Cutover is flag-gated:** `RIE_MATCHED_EVENTS_ENABLED` (env var, default `false`). Ships dark first — both paths run and are logged/compared (shadow mode) with no behavior change, matching this codebase's established strangler-fig convention (`/api` → `/api/v2`, legacy vs. API portfolio engine). Flipped to `true` only once shadow-mode comparison shows RIE-sourced evidence is at least as good as the legacy feed for covered symbols.

---

## 14. Integration into `DecisionTrace`

- `buildEvidenceReferences({ matchedEvents, symbol })` (added in Sprint 18A) is extended: for matched events sourced from RIE, use the **real, original canonical envelope** returned alongside the reshaped legacy-shape object by `rieRecommendationBridge` — no extra DB round-trip, no re-derivation via `adaptLegacyFeedItemToEnvelope`. Non-RIE matched events keep the existing legacy-adapter path unchanged.
- `modelVersionMetadata.eventEnvelopeVersion` (already `eventEnvelope.EVENT_ENVELOPE_VERSION` since Sprint 18A) needs no change — it now simply reflects real data more often.
- Net effect: `DecisionTrace.evidenceReferences` becomes progressively backed by real, persisted, deduplicated, credibility-scored evidence with **stable IDs** as RIE coverage grows — the concrete prerequisite a future Alpha Attribution Engine needs to grade recommendations against real outcomes (`INTELLIGENCE_PLATFORM_BLUEPRINT.md`, Engine 4).
- `DecisionTrace` immutability is untouched: this sprint only changes what data flows *into* `createDecisionTrace` at creation time, never adds an update path.

---

## 15. Test matrix

| Area | Coverage |
|---|---|
| Adapters (×4) | Fixture-based, no live network calls in CI (matching this codebase's established convention) — each adapter's `fetch()` mapped correctly into `RawRecord` shape; rate-limit delay honored; cursor advances correctly. |
| `rieNormalizer.js` | Every source type produces a `validateEventEnvelope`-passing envelope; graceful degradation when source fields are missing (mirrors `eventEnvelope.test.js`'s existing fallback tests). |
| `rieDeduplicator.js` | Exact-dup via unique constraint (DB-level test); near-dup shingle test with adversarial news fixtures (syndicated wire stories, paraphrases) — asserts neither over-merging nor under-merging. |
| `rieScoringService.js` | Credibility baseline per `sourceType`; `computeRelevanceScore` ranks portfolio > watchlist > market-scan (same ordering already proven for `computeQualityScore`'s `portfolioRelevance`). |
| Idempotency | Reprocessing the same raw record twice (simulated retry) produces exactly one `RieEvent`, not two. |
| Retry/poison | Simulated repeated processing failure reaches `POISON` after 5 attempts, never retried again, never deleted. |
| Retrieval API | Integration tests per endpoint; pagination; freshness/relevance are recomputed (not stale) across two calls separated by mocked time. |
| Recommendation Engine bridge | Merged matched events respect the 5-item cap and RIE-preferred-on-overlap rule; `DecisionTrace.evidenceReferences` contains the real envelope for RIE-sourced evidence. |
| Regression | With `RIE_MATCHED_EVENTS_ENABLED=false`, behavior is byte-for-byte identical to pre-Sprint-18B — the existing Sprint 16-18A test suite must pass unmodified. |

---

## 16. Migration plan

One migration, additive only: `RieRawIntakeRecord`, `RieEvent`, `RieAdapterCursor`, `RieRunLog`, plus enums `RieSourceType` and `RieIntakeStatus`. **No existing table is altered** — `Recommendation` and `DecisionTrace` already carry everything Sprint 18A added. Applied to `impactone_dev` and `impactone_test`, same procedure as Sprint 18A's migration (verify new tables are genuinely new/empty before applying — zero risk, since nothing pre-existing is touched).

---

## 17. Commit sequence (for the future implementation sprint, tests before every commit)

1. `feat(backend): add RIE schema (RieRawIntakeRecord, RieEvent, RieAdapterCursor, RieRunLog)` — migration.
2. `feat(backend): add rieEventStore repository`
3. `feat(backend): add SEC filings adapter`
4. `feat(backend): add earnings calendar adapter`
5. `feat(backend): add news adapter (wraps existing Phase C pipeline)`
6. `feat(backend): add macro releases adapter`
7. `feat(backend): add rieNormalizer (canonical envelope construction)`
8. `feat(backend): add rieDeduplicator (exact + near-duplicate)`
9. `feat(backend): add rieScoringService (credibility; read-time freshness/relevance)`
10. `feat(backend): add rieIngestionScheduler (fetch + processing-sweep jobs)`
11. `feat(backend): add retrieval API (/api/v2/intelligence/*)`
12. `feat(backend): add rieRecommendationBridge and thread into findMatchedEvents (flag-gated)`
13. `feat(backend): populate DecisionTrace.evidenceReferences from real RIE envelopes`
14. `test(backend): full RIE test matrix (§15)`
15. `docs: update API_CONTRACTS.md, ARCHITECTURE.md, PROJECT_STATUS.md, RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md for Sprint 18B`

---

## 18. Rollback plan

- **Behavioral rollback is instant and safe:** `RIE_MATCHED_EVENTS_ENABLED=false` reverts the Recommendation Engine to legacy-only evidence with no deploy required.
- **Per-source rollback:** any single adapter can be disabled independently via the scheduler's existing enable/disable pattern without affecting the others or the rest of the app.
- **Data rollback is low-risk by construction:** RIE tables are purely additive — nothing mutates `Recommendation`, `DecisionTrace`, `Portfolio`, or any pre-existing table in place. If the new tables need to be dropped entirely, that's a clean migration-down with zero impact on any existing data, because nothing existing ever depended on them.
- **Partial rollback:** if only the processing pipeline is misbehaving (e.g. a scoring bug), the fetch jobs can keep running (raw data keeps accumulating safely in `RieRawIntakeRecord`) while the processing sweep is disabled — no data is lost, and reprocessing resumes once fixed.

---

## 19. Definition of done

- [ ] All four adapters (SEC, earnings, news, macro) fetch real data for the active universe on their documented cadence, with fixture-based tests passing and zero live network calls in CI.
- [ ] Every persisted `RieEvent` passes `eventEnvelope.validateEventEnvelope`.
- [ ] Exact duplicates are impossible at the DB level (`deduplicationKey` unique constraint); near-duplicate news is caught by the shingle check with a passing adversarial test suite.
- [ ] `credibilityScore` is persisted and source-type-aware; `freshnessScore`/`relevanceScore` are computed fresh on every retrieval call, never stored stale.
- [ ] Reprocessing the same raw record is proven idempotent (test + DB constraint).
- [ ] A simulated repeated failure reaches `POISON` status, not an infinite retry loop and not silent data loss.
- [ ] `GET /api/v2/intelligence/*` endpoints are live, read-only, paginated, and documented in `API_CONTRACTS.md`.
- [ ] With `RIE_MATCHED_EVENTS_ENABLED=false`, the full existing Sprint 16-18A test suite passes unmodified — zero regression.
- [ ] With the flag enabled, `DecisionTrace.evidenceReferences` for at least one real, manually-verified recommendation contains genuine RIE-sourced envelopes (not `adaptLegacyFeedItemToEnvelope` output) with stable, real `deduplicationKey`/`eventId` values.
- [ ] `DecisionTrace` remains create-and-read-only — no update path introduced anywhere, verified by extending the existing immutability regression test.
- [ ] Advisory-only invariant preserved — no code path in any new file imports `placeOrder` or any portfolio-mutating function.
- [ ] Live browser verification: `RecommendationsScreen` shows at least one recommendation whose evidence citations are traceable to a real RIE-ingested SEC filing, earnings release, news article, or macro release.
- [ ] Cost ceiling constants are in place and logged when hit, for all four adapters.
- [ ] `PROJECT_STATUS.md`, `API_CONTRACTS.md`, and `ARCHITECTURE.md` document the shipped slice; `RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md` is annotated to show which of its sections are now implemented vs. still future work.
