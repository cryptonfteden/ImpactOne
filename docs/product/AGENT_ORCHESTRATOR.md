# Agent Orchestrator

**Phase:** AGENT-ORCHESTRATOR-001
**Mission:** Build the brain of ImpactOne's Stock Intelligence pipeline — a generic engine that runs analysis agents in parallel for a stock symbol and merges their outputs into one Unified Intelligence Report, with zero business-logic knowledge of its own.

```
Stock Symbol
      ↓
Agent Orchestrator
      ↓
Parallel Agent Execution
      ↓
Unified Intelligence Report
```

## What already existed, and why this is genuinely new

Before writing any code, the two closest existing subsystems were read in full to make sure this wasn't a duplicate:

- **`intelligenceCommitteeService.js`** (the "Committee") — architecturally the opposite of what this mission asks for. Its eight members are pure, synchronous functions (`evaluate(evidenceMatrix)`) over one shared, pre-fetched object — a plain `.map()`, not `Promise.all`. There is no concurrency, no per-member timeout, no retry, no health check, and — by explicit, tested, deliberate design (`safety.test.js`: *"the coordinator and CIO never produce a blended/averaged confidence field"*) — no numeric confidence aggregation at all. It exists to preserve disagreement, not resolve it into one number.
- **`symbolIntelligenceService.js`** — the closest existing "run several things for one symbol" entry point: a flat `Promise.all` over 5 fixed calls with a per-field try/catch (`settleField`) that degrades to `{ unavailable: true, reason }`. Real, but with no retry, no timeout, no health/priority ranking, and no confidence merging or conflict detection.

Neither is a generic, registrable, parallel, timeout/retry/health-aware multi-agent engine. This phase builds that as new, additive infrastructure — it does not touch, replace, or duplicate either existing subsystem. `symbolIntelligenceService.js`'s existing `/v2/symbol-intelligence/:symbol` endpoint is untouched and unaffected.

## The generic Agent interface

`backend/services/agentOrchestrator/agentInterface.js` — every current and future agent is a plain object with exactly four members, validated by `validateAgent()`/`assertValidAgent()`:

| Member | Contract |
|---|---|
| `metadata: { id, name, category, priority }` | `id`/`name` are non-empty strings; `priority` is a positive finite number (a weight, not an execution order — every agent still runs in parallel regardless) |
| `async execute(symbol) -> { summary, direction, evidence, raw }` | the agent's own real analysis; `direction` is a free-text, agent-defined string used only for opaque equality comparison; `evidence` is an array of plain objects, merged verbatim |
| `confidence(result) -> number (0-100)` | a pure function deriving confidence from the agent's own `execute()` result |
| `async health() -> { status: "healthy"\|"degraded"\|"unavailable", reason }` | a fast real check; `"unavailable"` skips `execute()` entirely |

This file contains zero analysis logic and never will — it only defines and validates the shape.

## The orchestrator itself

`backend/services/agentOrchestrator/agentOrchestrator.js` owns exactly the responsibilities named in the mission, and confirmed by its own test (*"the orchestrator never inspects or interprets an agent's summary/raw content"*, which literally greps the orchestrator's own source for `.summary`/`.raw` and fails if either appears):

- **Registration/scheduling** — `registerAgent`/`unregisterAgent`/`getRegisteredAgents`, keyed by `metadata.id`, rejecting a malformed agent or a duplicate id immediately.
- **Parallel execution** — `run(symbol, options)` calls every requested agent's `runOneAgent` concurrently via `Promise.all`; proven by a test that asserts both agents' `execute()` calls started before either resolved.
- **Health monitoring** — `health()` is checked before `execute()` for every agent; an `"unavailable"` result skips `execute()` entirely (proven by a test asserting `execute()` is never called for an unhealthy agent).
- **Timeouts** — `execute()` races against a per-run `timeoutMs` (default 5000ms); an agent that doesn't resolve in time is reported `"timeout"`, never left hanging.
- **Retry policy** — a failing or timed-out agent is retried up to `maxRetries` (default 1) additional attempts before being reported `"error"`/`"timeout"`; `run()` never throws because one agent failed.
- **Agent priority** — a positive weight used only in the overall-confidence calculation and as a rank tie-break — never an execution order.
- **Result aggregation / confidence calculation** — `rankByConfidence()` sorts agents by their own `confidence()` output (priority as tie-break); `computeOverallConfidence()` is a **transparent, priority-weighted average of successful agents' own confidence scores** — never a silently "the AI decided" number, and always returned alongside the full per-agent breakdown so it's checkable against its real inputs, unlike the Committee's stricter "never blend at all" rule (a deliberate, different design choice appropriate to this being generic infrastructure, not a verdict-generation system — see "Design decisions" below).
- **Conflict detection** — `detectConflicts()` flags every pair of successful agents whose `direction` strings differ — purely structural string comparison; the orchestrator has no idea what "BULLISH" vs "MIXED" means.
- **Evidence merging** — `mergeEvidence()` flattens every agent's own `evidence` array into one list, each entry attributed to its real `agentId`/`agentName`.
- **Final recommendation payload** — `run()` returns one object: `{ symbol, generatedAt, tookMs, agents (ranked), overallConfidence, conflicts, evidence, summary: { total, fulfilled, unavailable, failed } }`.

## Agents registered

`backend/services/agentOrchestrator/registry.js` registers all 13 named domains. **Three are real**, wrapping already-existing, already-tested services — the agent file adapts, it never invents:

| Agent | Wraps | Confidence source |
|---|---|---|
| Technical | `technicalIntelligenceService.analyzeSymbol()` | the real trend signal's `strength` |
| Options | `optionsAgentService.getSymbolView()` | the real `highestAnomalyScore` |
| Sentiment | `marketSentimentService.getMarketSentiment("US")` | the real `confidence` field |

**Ten are honest, interface-valid stubs** (News, Short Interest, Earnings, Valuation, Fibonacci, Insider, ETF Flow, Institutional, Macro, Analyst Consensus) built from one shared `createStubAgent()` factory — `health()` always reports `"unavailable"` with a real reason (e.g. *"No short-interest provider or service exists anywhere in this codebase yet"*), so the orchestrator skips `execute()` for every one of them. Each stub's own file comment states exactly why it isn't real yet (no existing service, existing service is fixture-only, existing service is embedded inside another domain's internals, etc. — verified against the actual codebase, not assumed). **No fabricated analysis was written for any of these ten domains.**

## A real bug found and fixed via live testing, not by a mock

`sentimentAgent`'s first version set `direction: reading.trend`, assuming `trend` was a simple string. Hitting the real running endpoint (`GET /v2/agent-orchestrator/NVDA`) surfaced a nonsensical conflict record with an *object* as `directionB` — `marketSentimentService`'s real `trend` field is actually `{ daily: { direction, changeAbs, changePct }, weekly: { ... } }`, not a string. This silently violated the Agent interface's own contract (direction must be an opaque, comparable string). Fixed to `reading.trend?.daily?.direction`, with a regression test added (`sentimentAgent.execute() always returns a plain string (or null) for direction, never the raw trend object`) — the same class of bug (assuming a nested object was a flat string) as `MARKET-INTELLIGENCE-001`'s `macroRegime` finding, caught the same way: by actually running it, not just unit-testing it in isolation.

## Design decisions worth stating explicitly

- **Overall confidence is computed here, unlike the Committee.** The Committee's "never blend confidence" rule exists specifically to avoid an opaque single verdict number replacing real, disclosed disagreement in an investment-recommendation context. This orchestrator is generic infrastructure, not a verdict system — the mission explicitly names "Confidence calculation" as a responsibility — so a transparent, disclosed, priority-weighted average is computed, but always alongside (never instead of) the full per-agent breakdown, and conflicts are surfaced separately and explicitly rather than smoothed away by the average.
- **The new endpoint is additive, not a replacement.** `GET /v2/agent-orchestrator/:symbol` is a new, separate route (`agentOrchestratorRoutes.js`/`agentOrchestratorController.js`, same `handleKnownError` house style as every other controller). It does not modify or replace `symbolIntelligenceService.js`'s existing `/v2/symbol-intelligence/:symbol` endpoint — wiring the Orchestrator in as *the* canonical Stock Intelligence path (per the mission's "every Stock Intelligence request... must flow through this engine") is the natural next step, deliberately left undone here to avoid an unreviewed behavior change to an existing, already-consumed endpoint.
- **Ten agents were built as stubs, not fabricated analyses.** Building 10 full new analytical subsystems (short interest, valuation, insider trading, ETF flow, institutional ownership and macro as standalone symbol-scoped services, a real analyst-consensus fetch, a symbol-relevance layer for news) is well beyond "prepare registration" and would itself violate the "no fabricated business logic" discipline this whole engagement has followed. Each stub is honest about exactly why it's inert.

## No duplicated orchestration logic

- The stub-creation logic lives in exactly one place (`stubAgentFactory.js`) — the 10 stub files are each a 3-line call into it, not 10 copies of the same skip-execute/report-unavailable logic.
- `registerAllAgents()` is idempotent against the orchestrator's **actual current registry state** (checked live, not a separate boolean flag) — an earlier draft used a module-level `let registered = false` flag that would have silently no-op'd after a test called `clearRegistry()`, re-introducing a real bug before it ever shipped; caught and fixed during this same phase, before commit.

## Tests

**41 new tests**, all passing:
- `agentInterface.test.js` (6 tests) — every validation rule.
- `agentOrchestrator.test.js` (18 tests) — parallel execution (proven, not assumed), health-based skipping, timeouts, retry policy (both eventual success and exhausted-retry failure), confidence-ranking with priority tie-break, the weighted overall-confidence formula (including the "everyone unavailable → honestly 0" case), conflict detection (including that a `null`-direction agent is never involved), evidence merging with attribution, symbol validation, explicit agent-subset runs, and the source-level guarantee that the orchestrator never reads `.summary`/`.raw`.
- `registry.test.js` (5 tests) — all 13 domains registered exactly once, every one interface-valid, no duplicate ids, idempotent re-registration, and that a stub is genuinely never executed by a real run.
- `agents/realAgents.test.js` (8 tests) — interface conformance for all three real agents, honest degraded-but-non-crashing behavior in this test environment's real "no live provider" conditions (matching how `technicalIntelligenceService.test.js`/`optionsAgentService.test.js` already test the same reality), and the sentiment-direction regression test above.

Full backend suite: **1088/1089 passing** (1089 tests total; the one failure, `intelligenceBusService.test.js`'s *"lifecycle: events from a different engine/symbol series are never superseded"*, is the same pre-existing, real-wall-clock-sensitive test already confirmed unrelated and reproducible in isolation in the prior phase's report — nothing in this phase touches that file or its dependencies). Frontend production build re-verified passing (this is a backend-only phase; no frontend file changed).

## Verified live

`GET /v2/agent-orchestrator/NVDA` against the real running backend returns a complete, correctly-shaped report: 3 agents fulfilled (Technical, Options, Sentiment) with real confidence scores and real evidence, 10 correctly reported `unavailable`, one real structural conflict correctly detected between Technical's `"MIXED"` and Sentiment's `"INSUFFICIENT_HISTORY"` daily trend direction (both real, honest values in this no-live-provider test environment), and a transparent `overallConfidence` computed only from the 3 successful agents.

## Known limitations

- The Orchestrator is not yet wired as the canonical path for existing Stock Intelligence consumers (see "Design decisions" above) — a deliberate, disclosed scope boundary.
- Sentiment is market-wide (`getMarketSentiment("US")`), not symbol-specific — no per-symbol sentiment engine exists in this codebase yet; the agent discloses this honestly in its own `summary` text rather than pretending otherwise.
- Ten of the thirteen named agents are honest stubs, not real analyses — see the registry table above for exactly why each one isn't real yet.
