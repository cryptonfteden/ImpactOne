# Intelligence Bus — Subscription Model (Phase AI-ENGINE-003)

**Status:** Implemented. Describes the real `backend/services/intelligenceBus/intelligenceBusSubscriptions.js` + `intelligenceBusService.js`'s `subscribe`/`getEvents` — not a proposal.

## 1. The rule: consumers never talk directly to engines

Every consumer named in the mission — Mission Control, Intelligence Workspace, Portfolio Workspace, the future Stock Workspace, Alerts, Watchlists, AI Chat, Mobile, and any future API — reads intelligence **only** through `intelligenceBusService`. A consumer never imports `optionsAgentService`, `marketSentimentService`, or any future engine's service module directly. This is enforceable today at the code-review level (no engine service is exported to a route a consumer calls); a future phase can add a structural lint rule once real routes exist.

## 2. Two ways to read: pull and push

### Pull — `getEvents(query)` / `getEventById(id)`

The one-shot, request/response read path — what a route handler or a server-rendered screen would call:

```js
const events = await intelligenceBusService.getEvents({ engineId: "options", symbol: "NVDA", lifecycleStatus: "ACTIVE" });
```

Every event returned has its `lifecycleStatus` freshly recomputed against `now` (never a stale cached value) and is re-sanitized for governance regardless of what was persisted. Ordering is always `(publishedAt, ingestedAt, id)` ascending — deterministic even for two events published in the same millisecond.

### Push — `subscribe(consumerName, filter, handler)`

The live, in-process path — what a long-running server process (or, in a future phase, a websocket-backed real-time surface) would use to react to new events as they publish:

```js
const unsubscribe = intelligenceBusService.subscribe(
  "MissionControl",
  { engineId: "options", symbol: "NVDA" },
  (event) => { /* real, sanitized, lifecycle-fresh-at-dispatch-time event */ }
);
// later: unsubscribe();
```

`filter` supports `engineId`, `eventType`, and `symbol`, independently or combined (an empty filter `{}` matches everything). Delivery order matches publish order for that subscriber. One subscriber's handler throwing is caught and reported in the delivery result — it never blocks delivery to any other subscriber (mission's "the Bus is responsible for... subscribers" implies reliable fan-out, not fragile fan-out).

No queue, no broker, no persistence of the subscription itself — a subscription lives for the process's lifetime, the same "single in-process mechanism today, real queue is a documented future extension point" posture every scheduler in this codebase already takes (`providerScheduler.js`'s own header comment). A future phase that adds a real message queue (BullMQ/Redis-backed) changes only `intelligenceBusSubscriptions.js`'s internals — `publishEvent`'s call site and every consumer's `subscribe()` call stay identical.

## 3. The consumer registry

`intelligenceBusRegistry.KNOWN_CONSUMERS` lists every consumer the mission names:

```js
["MissionControl", "IntelligenceWorkspace", "PortfolioWorkspace", "StockWorkspace", "Alerts", "Watchlists", "AiChat", "Mobile"]
```

This is a **soft** registry — `subscribe()` accepts any `consumerName` string; an unrecognized name is flagged (`isKnownConsumer: false` in `listSubscriptions()`'s output) rather than rejected. This is a deliberate choice, not an oversight: a real, legitimate new consumer (a future API, a new mobile surface) must never be blocked from reading the Bus just because this list hasn't been updated yet — the registry exists for observability ("who is actually subscribed right now, and is that expected") and documentation, not as an access-control gate. Future API consumers are covered by the same mechanism — any string identifying the new API is a valid `consumerName`, and the registry can be extended additively whenever a new consumer becomes real.

## 4. What a consumer receives

Exactly the canonical shape in `INTELLIGENCE_EVENT_SCHEMA.md` §2 — the same shape whether the consumer used `getEvents()` or `subscribe()`. No consumer-specific reshaping happens inside the Bus; if Mission Control and AI Chat need different presentations of the same event, that transformation belongs in each consumer's own layer, not the Bus's — the Bus's job is to guarantee one honest, governance-clean, lifecycle-accurate canonical shape for everyone, not a family of per-consumer shapes that could drift apart.

## 5. Filtering guidance per named consumer (documentation, not enforced code)

| Consumer | Typical filter |
|---|---|
| Mission Control | No filter, or `{ lifecycleStatus: "ACTIVE" }` — a cross-engine summary view |
| Intelligence Workspace | `{ engineId: "options" }` / `{ engineId: "sentiment" }` per section, or `{ symbol }` when a symbol is selected |
| Portfolio Workspace | `{ symbol }` per held position |
| Future Stock Workspace | `{ symbol }` — every engine's events for one symbol |
| Alerts | `{ engineId, symbol }` narrow filters, evaluated against `getEvents()` on a poll cadence (Alerts doesn't need push delivery in this phase — no scheduler was built) |
| Watchlists | `{ symbol }` per tracked symbol |
| AI Chat | `getEvents({ symbol, since })` — a pull-based context lookup when answering a question about a symbol |
| Mobile | Same `getEvents()`/`subscribe()` contract as web — no separate mobile-specific API exists or is needed |
| Future APIs | Any `consumerName` string + any combination of the 3 filter fields — the contract does not change per-consumer |

## 6. Deliberate scope decisions

- **No real consumer was wired to the Bus this phase** — no route exists yet for any consumer to call through (explicit "No UI"/no-routes scope). This document describes the contract every future consumer integration will use, verified real by the test suite (`intelligenceBusSubscriptions.test.js`, `intelligenceBusService.test.js`'s subscriber-delivery tests) rather than left as an unproven promise.
- **No websocket/real-time push to the browser exists** — `subscribe()` is an in-process JS callback, useful today for another backend module (e.g. a future Alerts evaluator) but not yet exposed to a frontend. Bridging it to a websocket is a real, separate future phase.
