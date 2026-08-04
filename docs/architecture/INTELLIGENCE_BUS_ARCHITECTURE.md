# Platform Intelligence Bus — Architecture (Phase AI-ENGINE-003)

**Status:** Implemented foundation. Unlike the architecture-only docs that preceded the Options Agent and Market Sentiment Engine builds, this document describes what was actually built this phase (`backend/services/intelligenceBus/`) — every module, table, and function named below is real and tested. No Express route, scheduler, or UI was built (explicit mission scope exclusions); those remain future work, disclosed at the end.

## 1. What this is

The **Platform Intelligence Bus** is the one canonical pipeline every intelligence engine — Options, Sentiment, Macro, Earnings, Ownership, Short Interest, Correlation, News, and any future engine — publishes exactly one event into. It is the nervous system named in the mission: engines produce signals, the Bus ingests/normalizes/persists/dispatches them, and every consumer (Mission Control, Intelligence Workspace, Portfolio Workspace, the future Stock Workspace, Alerts, Watchlists, AI Chat, Mobile, future APIs) reads only from the Bus — never from an engine directly.

This is not a new idea grafted onto the platform; it is the **formalization** of a pattern already half-present. `eventEnvelope.js` (Phase 18A) already defined one canonical 19-field envelope; `CanonicalEvent` (existing table) already stores it; `providerIngestionService.js` already deduplicates on it. The Options Agent (Phase AI-ENGINE-001.1) and Market Sentiment Engine (Phase AI-ENGINE-002.1) each independently built their own signal/snapshot tables and their own governance sanitizers, because neither had a shared bus to publish into yet. This phase builds that shared bus — and, going forward, a new engine publishes into `intelligenceBusService.publishEvent()` once, rather than building its own repository/governance/lifecycle module from scratch each time.

## 2. Where this sits in the real platform

```
Options Agent ─┐
Sentiment Eng. ─┤
Macro (future) ─┤
Earnings (fut.) ─┼─► intelligenceBusService.publishEvent() ─► IntelligenceBusEvent (new, durable)
Ownership (fut) ─┤                    │                              │
Short Int (fut) ─┤                    ▼                              ▼
Correlation(fut) ─┤         eventEnvelope.buildEventEnvelope()   subscriber dispatch
News (future)   ─┘                    │                              │
                                       ▼                              ▼
                            CanonicalEvent (existing,        Mission Control, Intelligence
                            unchanged — legacy bridge)        Workspace, Portfolio Workspace,
                                                               Alerts, Watchlists, AI Chat,
                                                               Mobile, future APIs (all via
                                                               intelligenceBusService.getEvents())
```

`CanonicalEvent` is not replaced. It remains the substrate `findMatchedEvents`/Daily Feed/Themes already depend on. A Bus event is additionally, best-effort, projected onto it (via the same `eventEnvelope.buildEventEnvelope()` + `canonicalEventRepository.upsertIfNew()` every other provider's events already use) so legacy consumers never need special-case code to "know about" Bus events. `IntelligenceBusEvent` (new) is the Bus's own administrative record — lifecycle, dedup, subscriber-relevant fields — not a duplicate of `CanonicalEvent`'s shape.

## 3. The 9 Bus responsibilities, and where each lives

| Responsibility | Module |
|---|---|
| Ingestion | `intelligenceBusService.publishEvent()` |
| Deduplication | `intelligenceBusDedup.js` (`computeDedupKey`) + the real `@@unique(deduplicationKey)` DB constraint |
| Provenance | `intelligenceEventContract.js` (requires `provenance.sourceEngine`) — carried through unmodified, never fabricated |
| Confidence normalization | `intelligenceBusConfidence.js` (`normalizeConfidence`, `aggregateEvidence`) |
| Evidence aggregation | `intelligenceBusConfidence.js` (`aggregateEvidence`) — reuses `scoringVocabulary.js`'s existing `evidenceAgreement` concept |
| Freshness | `intelligenceBusLifecycle.js` (`computeFreshness`) |
| Lifecycle | `intelligenceBusLifecycle.js` (`computeExpiry`, `resolveLifecycleStatus`) + `intelligenceBusRepository.markSuperseded` |
| Subscribers | `intelligenceBusSubscriptions.js` |
| Persistence | `intelligenceBusRepository.js` + the new `IntelligenceBusEvent` table |

## 4. The canonical event contract

Every engine submits a **raw event** matching `intelligenceEventContract.js`'s `REQUIRED_RAW_FIELDS`: `engineId`, `eventType`, `symbols`, `payload`, `provenance` (with a real `sourceEngine`), `publishedAt`, `methodologyVersion`. `confidence` and `evidenceRefs` are optional but type-checked when present. `engineId` must be one of `intelligenceBusRegistry.KNOWN_ENGINES` — a soft, in-application registry (a `String` column at the DB layer, same precedent as `CanonicalEvent.providerId`), so a 9th real engine never requires a migration, but a typo'd engine id is caught immediately rather than silently creating an uncoordinated new category. See `INTELLIGENCE_EVENT_SCHEMA.md` for the full schema and worked examples per named engine.

Validation never throws for the caller to catch blind — `validateRawEvent()` returns `{ valid, errors }` with every violation listed at once, and `publishEvent()` turns an invalid submission into a real `400`-style error with `validationErrors` attached, so a malformed publish from one engine is a routine, diagnosable event, never a Bus-wide crash.

## 5. Confidence normalization and evidence aggregation

Every engine already scores confidence on the same `[0, 100]` scale (the existing `scoringVocabulary.js` convention both the Options Agent's `anomalyScore` and the Sentiment Engine's `confidence` already follow) — normalization is therefore an honest clamp-and-null-preservation pass (`normalizeConfidence`), not a unit conversion. This is disclosed, not hidden: a future engine that scores on a genuinely different native scale would need a real per-engine converter added to this function, not an assumption that every engine already agrees.

`aggregateEvidence(events)` combines confidence/direction across multiple Bus events that speak to the same real-world question (e.g. several engines' events for one symbol) into one `aggregateConfidence` + `evidenceAgreement` pair — reusing `scoringVocabulary.js`'s existing `evidenceAgreement` definition (fraction of directional evidence that agrees) rather than inventing a second one. `evidenceAgreement` stays honestly `null` when no contributing event supplied a real `direction` — never guessed.

## 6. Freshness, expiry, and lifecycle

Every engine has a genuinely different natural cadence — an options sweep and a twice-monthly FINRA short-interest reading are not stale on the same clock. `intelligenceBusRegistry.KNOWN_ENGINES` declares a real, disclosed `staleAfterMs` per engine (options: 15 min; sentiment/macro/earnings/correlation: 24h; news: 1h; ownership: 7 days; short interest: 14 days — matching the real publication cadence of each concept, not an arbitrary constant), and `computeExpiry()` uses it unless the publishing engine supplies an explicit `expiresAt`.

`lifecycleStatus` is **recomputed at every read**, never trusted from a stale cache: `resolveLifecycleStatus()` returns `EXPIRED` once `now > expiresAt`, `ACTIVE` otherwise — with one exception: a persisted `SUPERSEDED` status always wins, since being superseded is a stronger, more specific fact than merely being old.

**Supersession** (a bounded, disclosed exception to append-only, same precedent as the Options Agent's `oiConfirmationStatus` transition): every event carries an `identityKey` — `(engineId, eventType, sorted symbols)`, identifying a *series* (e.g. "options sweep signals for NVDA," "overall sentiment for the US market") independent of `publishedAt`/payload. When a new event publishes into a series that already has an ACTIVE prior event, that prior event is marked `SUPERSEDED` and linked via `supersededByEventId` — real, once, never a general-purpose update. This never touches events in a different `identityKey` series, verified by test.

## 7. Governance — "signal, never a verdict," now for every engine at once

The Bus is the one remaining place a forbidden verdict-style field could leak through, since "consumers read only from the Bus" means a consumer no longer sees an individual engine's raw output to catch a violation there itself. `intelligenceBusGovernance.js` reuses `canonicalVerdict.js`'s exact `FORBIDDEN_COMMITTEE_KEYS` denylist — the same one the Committee, the Options Agent, and the Sentiment Engine already each independently enforce — checked **both** at the top level of the event **and** nested inside `payload` (the one place an engine's own output actually lives), both at `publishEvent()` (a hard, throwing assertion — a violating event is never even persisted) and again at every read (`sanitizeEvent()`, a silent strip, defense in depth). No `action`/`decision`/`verdict`/`finalDecision`/`recommendation` field can reach a consumer through the Bus.

## 8. Subscribers

`intelligenceBusSubscriptions.js` is a real, in-process publish/subscribe registry — no external queue/broker, matching the same "single in-process mechanism, real queue is a documented future extension point" posture `providerScheduler.js` already established. A consumer calls `intelligenceBusService.subscribe(consumerName, filter, handler)` (filter: any of `engineId`/`eventType`/`symbol`) and receives every matching event, in the exact order it was published, for the lifetime of the process. One subscriber's handler throwing never blocks delivery to the others — the Bus's job is reliable fan-out, not to let one consumer's bug break every other consumer (verified by test). See `INTELLIGENCE_SUBSCRIPTION_MODEL.md` for the full consumer-facing contract.

## 9. Persistence

One new table, `IntelligenceBusEvent` (`INTELLIGENCE_EVENT_SCHEMA.md` §3 has the full Prisma definition), purely additive — zero changes to any existing model. Append-mostly: `createEvent` is the only creation path, and `markSuperseded`/`setCanonicalEventId` are the two narrow, disclosed, single-purpose exceptions (never a general update). The real `@@unique(deduplicationKey)` constraint makes deduplication correct even under concurrent publish attempts, not just at the application layer.

## 10. Deliberate scope decisions (disclosed, not discovered later)

- **No Express routes/controller** — explicit mission exclusion ("No UI" plus no routing requested). Every function is directly callable/testable; a future phase wires `/api/v2/intelligence-bus/*`.
- **No scheduler** — no engine's own ingestion loop was changed to call `publishEvent()` automatically this phase; that wiring happens per-engine, incrementally, as each engine adopts the Bus.
- **The Options Agent and Sentiment Engine were not migrated to publish through the Bus this phase.** Both remain fully functional exactly as built in their own prior phases. Migrating them to call `intelligenceBusService.publishEvent()` instead of (or in addition to) their own repositories is real, valuable follow-up work — deliberately deferred so this phase's scope stayed "build the Bus," not "rewrite two already-shipped engines," matching the mission's own phased-adoption framing ("every FUTURE intelligence engine must publish into ONE canonical pipeline").
- **Macro, Earnings, Ownership, Short Interest, Correlation, News engines do not exist as engines yet** — they are named in `KNOWN_ENGINES` as forward-declared identities (with real, disclosed `staleAfterMs` defaults) so the Bus is ready for them the moment they're built, not because they were implemented this phase.
