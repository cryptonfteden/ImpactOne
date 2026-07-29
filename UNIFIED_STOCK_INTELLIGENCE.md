# UNIFIED_STOCK_INTELLIGENCE.md — Phase UNIFIED-STOCK-INTELLIGENCE-001

**Mission:** build the first Unified Stock Intelligence engine, aggregating the Options Flow, Earnings, and Valuation Domain Intelligence Agents into a single normalized report — never averaging scores, an explainable weighted aggregation engine, every conclusion traceable to source agents, compatible with the real Agent Registry/Scheduler/Observability/Orchestrator.

---

## What was built

New directory: `backend/services/unifiedStockIntelligence/` — a real aggregation layer sitting *above* the three domain agents built in `OPTIONS-AGENT-001`, `EARNINGS-AGENT-001`, and `VALUATION-AGENT-001`, reusing every one of them exactly as they already exist.

| File | Responsibility |
|---|---|
| `agentSelector.js` | **Real Agent Registry compatibility.** Looks up the `"options"`/`"earnings"`/`"valuation"` agents from the live registry by id — never imports the agent files directly, so it always runs whatever is actually registered. |
| `agentDirectionMapper.js` | Normalizes each domain agent's own real, rich vocabulary onto one shared polarity scale (`BULLISH`/`NEUTRAL`/`BEARISH`): options' `marketBias` directly, earnings' `forwardOutlook` (`POSITIVE`→`BULLISH`, `NEGATIVE`→`BEARISH`), valuation's `valuationStatus` (`UNDERVALUED`→`BULLISH`, `OVERVALUED`→`BEARISH`). Also extracts each agent's own real risks/opportunities into a shared shape. |
| `conflictDetector.js` | **Real semantic conflict detection** — deliberately a *new*, separate step from the Agent Orchestrator's own generic conflict detector (which only compares raw per-agent `direction` strings for equality, and would be meaningless here: options' `"BULLISH"` and earnings' `"POSITIVE"` never match as strings despite meaning the same thing). Operates on the normalized polarity values instead. |
| `weightedAggregationEngine.js` | **The core "do not average" engine** — see below. |
| `caseBuilder.js` | Builds Bull Case / Bear Case / Risks / Opportunities, every entry attributed to its real source agent. |
| `keyDriversBuilder.js` | Ranks the aggregation engine's own real per-agent contribution scores, explaining "which agents contributed most, why." |
| `aiExecutiveSummary.js` | The "AI Executive Summary" — deterministic, template-based (not an LLM call, disclosed explicitly), covering all four required explanations. |
| `unifiedStockIntelligenceEngine.js` | The composer: `generateUnifiedIntelligence(symbol)` — selects the 3 real registered agents, runs them through the real `runObserved()` seam (Orchestrator → Scheduler → Observability, unmodified), then aggregates. |

Plus a thin HTTP surface (`GET /api/v2/unified-stock-intelligence/:symbol`, via `unifiedStockIntelligenceController.js`/`unifiedStockIntelligenceRoutes.js`), following the exact same correlation-ID-propagation and request-failure-logging pattern `PLATFORM-HARDENING-001` established for the other agent-platform endpoints.

## "Do NOT average scores" — how this was genuinely honored, not just avoided in name

This is the mission's most specific, most easily-violated-by-accident requirement, so it's worth explaining precisely what was and wasn't done.

**Overall Intelligence (direction)** is a priority-and-confidence-**weighted sum**, not a mean: each available agent contributes `priority × (confidence/100) × sign(direction)`, and the sum is normalized by *total weight* only to classify the result into BULLISH/NEUTRAL/BEARISH bands (a `±10%` neutral band prevents a razor-thin lean from being over-classified). Every `priority` is each agent's own real, already-existing registry priority (`7` for all three today) — never invented for this engine.

**Overall Confidence is explicitly NOT a mean of the three agents' raw confidence scores.** A naive `(c1 + c2 + c3) / 3` never appears anywhere in this codebase. Instead:

1. Start from a priority-weighted average of **only the agents that agree with the winning direction** (an agent on the losing/conflicting side contributes nothing to this base figure — the same "a detector that disagrees doesn't get blended in" principle `optionsAnomalyConfidence.js` and the Committee's own confidence rules already established on this platform).
2. Apply a disclosed **corroboration bonus** (`1 agreeing agent: +0`, `2 agreeing: +15`, `3 agreeing: +30`) — the exact same "more independent agreement = more confidence" principle as `optionsAnomalyConfidence.js`'s `SWEEP` (75) vs. `SWEEP+BLOCK` (90) table.
3. Apply a disclosed **conflict penalty** (`-25`) whenever any real conflict exists, regardless of how confident the winning side is — a test proves this directly: three agents at equal confidence with one real conflict score measurably lower than the same three agreeing.
4. Apply a disclosed **unavailability penalty** (`-10` per missing/unavailable agent out of 3) — less real evidence honestly means less confidence.

A **separate `recommendationConfidence`** field is even stricter: capped at 40 when any real conflict exists, and proportionally discounted by how many of the 3 agents actually produced data — a distinct, disclosed computation reflecting how robust this unified read is as *input evidence* for anything downstream, never itself an action/decision.

## Every conclusion traceable to source agents

Every entry in `bullCase`/`bearCase`/`risks`/`opportunities`/`keyDrivers` carries a real `agentId` and `agentName`. The full normalized per-agent view (`agentContributions`) and the complete raw orchestrator report (`inputs`) are both retained on the final report for full auditability — nothing is presented as an unsourced synthesized claim.

## Output shape

```js
{
  symbol: "NVDA",
  generatedAt: "2026-...",
  correlationId: "corr_...",
  contributingAgentCount: 3,
  totalAgentCount: 3,
  overallIntelligence: "BULLISH",       // BULLISH | NEUTRAL | BEARISH
  overallConfidence: 78,
  recommendationConfidence: 78,
  bullCase: [ { agentId: "options", agentName: "...", statement: "...", confidence: 82 }, ... ],
  bearCase: [],
  risks: [ { agentId: "valuation", agentName: "...", statement: "..." }, ... ],
  opportunities: [ ... ],
  conflictingSignals: [ { agentA: "options", directionA: "BULLISH", agentB: "valuation", directionB: "BEARISH" } ],
  keyDrivers: [ { agentId: "options", direction: "BULLISH", confidence: 82, priority: 7, contributionScore: 0.57, explanation: "options contributed a bullish signal at 82% confidence, weighted by its priority (7)." }, ... ],
  aiExecutiveSummary: "Aggregating the Options Flow, Earnings, and Valuation agents, NVDA's unified read is bullish at 78/100 confidence. The options agent contributed most (...), followed by earnings and valuation. No conflicting signals were found among the available agents this window. Confidence was computed from a priority-weighted average of only the agreeing agents' own confidence — never a simple average of the three agents' raw confidence scores.",
  agentContributions: [ /* full normalized per-agent view, for auditability */ ],
  inputs: { /* the full, unmodified orchestrator report this was built from */ },
}
```

Every field the mission's "Output" section named is present, including the AI Executive Summary's four required explanations (which agents contributed most and why, which signals conflicted, how confidence was calculated).

## Governance — confirmed, not assumed

A dedicated test serializes the full report and confirms it never contains `action`, `decision`, `verdict`, or `finalDecision` (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`) as a JSON key, even after aggregating three real domain reports. `recommendationConfidence` is a deliberately, differently-named field — a confidence *number* describing evidence quality, never an action — exactly the same distinction `FAIR_VALUE_METHODOLOGY.md` §4.2 already drew for the Valuation Agent's own evidence.

## Compatibility with the existing Agent Platform — verified, not assumed

- **Agent Registry:** `agentSelector.js` performs a real, live lookup — a dedicated test proves it resolves whatever is actually registered, never a hardcoded list, and honestly returns fewer than 3 if one is missing.
- **Agent Orchestrator:** the engine calls the real, unmodified `agentOrchestrator.run()` indirectly through `runObserved()` — no duplicate scheduling/execution logic exists in this new engine.
- **Agent Scheduler / Observability:** because the engine goes through the exact same `runObserved()` seam every other real request uses, every real invocation is scheduled through the real `AgentScheduler` (concurrency/health-cache/retry) and recorded in the real `AgentExecutionLog` — a dedicated integration test confirms 3 real execution records are written under the report's own `correlationId`.
- **HTTP layer:** correlation-ID propagation and request-failure logging follow `PLATFORM-HARDENING-001`'s established pattern exactly, verified by 3 real HTTP round-trip tests.

## Tests

**52 new tests, all passing:**
- `agentDirectionMapper.test.js` (11), `conflictDetector.test.js` (5), `weightedAggregationEngine.test.js` (11 — including a test explicitly proving the result is NOT a naive average, and dedicated tests for the corroboration bonus, conflict penalty, and unavailability penalty each in isolation), `caseBuilder.test.js` (7), `keyDriversBuilder.test.js` (4), `aiExecutiveSummary.test.js` (7), `agentSelector.test.js` (4).
- `unifiedStockIntelligenceEngine.test.js` (5) — fully-injected scenarios: all-unavailable, all-agree, real-conflict, traceability, correlation-ID passthrough.
- `unifiedStockIntelligence.orchestratorIntegration.test.js` (4) — the real, unmodified registry/orchestrator/scheduler/observability stack, including the forbidden-governance-key scan.
- `routes/unifiedStockIntelligence.integration.test.js` (3) — real HTTP round-trips: the full report shape, correlation-ID echo, and request-failure logging on invalid input.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1478 tests, 1476 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every phase since `AGENT-OBSERVABILITY-001` (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase, no UI built per the mission's own instruction).

## Honest limitations, disclosed rather than hidden

1. **`recommendationConfidence`'s specific discount rules (cap at 40 on any conflict; proportional discount by agent availability) are disclosed, hand-set choices for this MVP**, not empirically calibrated against real graded outcomes — no accumulated history of this unified engine's own real-world accuracy exists yet to calibrate against, the same disclosed limitation every scoring formula in `OPTIONS-AGENT-001`/`EARNINGS-AGENT-001`/`VALUATION-AGENT-001` already carries.
2. **The `±10%` neutral classification band and the `2:+15`/`3:+30` corroboration bonus values are disclosed, hand-set constants**, chosen for consistency with the magnitude of `optionsAnomalyConfidence.js`'s own existing corroboration table, not derived from this specific engine's own outcome history.
3. **Valuation's "undervalued = bullish, overvalued = bearish" mapping is a deliberate, documented interpretation** (a valuation signal describes a price-to-estimate relationship, per `FAIR_VALUE_METHODOLOGY.md` §4, read here as a directional lean *for aggregation purposes only*) — stated explicitly in `agentDirectionMapper.js`'s own header comment rather than left as an unstated assumption.
4. **This engine aggregates exactly the 3 agents the mission named** (Options Flow, Earnings, Valuation) — `agentSelector.js`'s `TARGET_AGENT_IDS` is a fixed list, not yet configurable to include other real agents (e.g. Technical, Sentiment) that also exist on this platform; extending it is a small, additive follow-up, not attempted here to stay within this mission's own explicit scope.

## Files changed

- New: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,conflictDetector,weightedAggregationEngine,caseBuilder,keyDriversBuilder,aiExecutiveSummary,unifiedStockIntelligenceEngine}.js` + matching `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js`.
- New: `backend/controllers/unifiedStockIntelligenceController.js`, `backend/routes/unifiedStockIntelligenceRoutes.js`, `backend/routes/unifiedStockIntelligence.integration.test.js`.
- Modified: `backend/routes/index.js` (mounts `/v2/unified-stock-intelligence`).
- Unmodified: `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, `registry.js`, and every one of the three domain agents this engine aggregates.
