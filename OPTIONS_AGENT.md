# OPTIONS_AGENT.md — Phase OPTIONS-AGENT-001

**Mission:** build the first production Domain Intelligence Agent — an Options Flow Agent that analyzes unusual options activity and produces a normalized report (market bias, confidence, signals, risk summary, AI summary), implemented as a standard Domain Agent on the existing Agent Platform (registry/orchestrator/scheduler/observability/metrics/retry/health), with a swappable provider abstraction, no external paid APIs, no UI.

---

## Design decision: upgrade, not duplicate

This platform already registers an agent under id `"options"` (built in `AGENT-ORCHESTRATOR-001`), adapting the existing `optionsAgentService.getSymbolView()` into the generic Agent interface — one of the platform's original 3 real agents. Rather than register a second, competing "options" domain agent under a new id (which would either collide with the registry's one-id-per-agent invariant, or leave two overlapping options-related agents running side by side with no stated relationship — the exact kind of duplication this project's own audit trail has repeatedly flagged and then had to clean up), this phase **upgrades that existing agent in place**: same id (`"options"`), same registry slot, same `metadata.name` (`"Options Flow Agent"`) it already had — but its `execute()` now produces the full, structured report the mission describes instead of its previous one-line "N signals detected" summary.

This is the same "engine vs. adapter" split `technicalAgent.js` and `sentimentAgent.js` already use: the real analysis lives in its own reusable module; the file under `agentOrchestrator/agents/` is a thin shape-adapter. Confirmed zero regression: every pre-existing test that exercises the `"options"` agent id (`realAgents.test.js`, `registry.test.js`, `agentOrchestrator.test.js`) passes unmodified.

## What was built

New directory: `backend/services/domainAgents/optionsFlowAgent/` — the reusable Domain Intelligence Agent engine, independent of the orchestrator-facing adapter.

| File | Responsibility |
|---|---|
| `optionsDataProvider.js` | **The provider abstraction.** Documents the `getSymbolMetrics(symbol) -> OptionsMetrics` interface any conforming provider must implement, and ships one real, default implementation (`createInternalOptionsDataProvider`) that computes every metric it can from this platform's own already-ingested data (`OptionsFlowPrint`, `OptionsOpenInterestSnapshot`, `OptionsSignal` — via the existing `optionsFlowRepository`/`optionsFlowAggregator`) — no external paid API of any kind. Fields with no available data source today (`iv`, `ivRank`, `ivPercentile`, `delta`, `gammaExposure`) are honestly `null`, never fabricated. |
| `marketBiasAnalyzer.js` | Pure, deterministic scoring (no ML model, no LLM) producing `{ bias: BULLISH\|BEARISH\|NEUTRAL, confidence: 0-100 }` from real put/call ratio, real call/put skew Z-score (reusing the existing, already-tested `detectCallPutSkew` detector's output), and real block-trade aggressor-side notional flow. Every weight is a documented constant; every contribution is individually inspectable via the returned `contributions` object. |
| `signalsAnalyzer.js` | Ranks the real, already-detected anomalous contracts by anomaly score (`mostUnusualContracts`); summarizes real block/sweep activity (`institutionalActivity`); reports real call/put volume splits (`callAccumulation`/`putAccumulation`); and honestly reports `volatilityRegime: "UNKNOWN"` with the real reason when no IV data source is connected (which is always, in this environment today). |
| `riskSummary.js` | A short, rule-based (never speculative) list of risk notes — thin volume, missing OI, institutional flow alongside a directional bias, single-contract concentration, missing Greeks — plus an honest `dataConfidence` rating (`NONE`/`LOW`/`MODERATE`). |
| `aiSummary.js` | The mission's "AI Summary" section — **a deterministic, template-based composition, not an LLM/external paid API call**, disclosed explicitly in the file's own header comment. This mirrors this project's established pattern for `investorProfileService`'s own deterministic "AI Investment Profile": every sentence traces back to a real number computed earlier in the same report, so it can never assert something the structured data doesn't support. Always 2-4 sentences per the mission's spec, verified by test across a range of inputs. |
| `optionsFlowAgent.js` | `generateReport(symbol, { provider })` — composes the above into the final normalized report object. |

Repository addition: `optionsFlowRepository.js` gained one new read-only function, `findRecentOpenInterestSnapshots(symbol, sinceDate)` — every OI snapshot for a symbol in a window (the one read the existing repository had no function for; `findOpenInterestSnapshot` only looks up one specific contract). No existing repository function was changed.

## The normalized report shape

```js
{
  symbol: "NVDA",
  generatedAt: "2026-...",
  dataAvailable: true,               // false when no options-flow provider is configured
  unavailableReason: null,
  marketBias: "BULLISH",             // BULLISH | BEARISH | NEUTRAL
  confidence: 77,                    // 0-100
  signals: {
    mostUnusualContracts: [ { symbol, expiry, strike, optionType, signalType, anomalyScore, volumeMultiple, explanation }, ... ],
    institutionalActivity: { detected: true, contractCount: 3, totalNotionalValue: 1200000, largestSingleTrade: {...} },
    callAccumulation: { volume: 900, share: 0.9 },
    putAccumulation: { volume: 100, share: 0.1 },
    volatilityRegime: { regime: "UNKNOWN", reason: "No implied-volatility data source is connected yet..." },
  },
  riskSummary: { notes: [ "..." ], dataConfidence: "MODERATE" },
  aiSummary: "Options volume this window totaled 1000 contracts, split 90% calls / 10% puts. Options flow leans toward a bullish bias, with 77% confidence based on volume, skew, and block-trade evidence.",
  inputs: { /* the full OptionsMetrics this report was built from, for auditability */ },
}
```

Every field the mission's "Outputs" section named is present: Market Bias, Confidence, Signals (most unusual contracts, institutional activity, call accumulation, put accumulation, volatility regime), Risk summary, AI Summary.

## Every mission "Input" — how each is handled

| Input | Status |
|---|---|
| Option volume | Real — summed per call/put from real `OptionsFlowPrint` rows in the lookback window. |
| Open Interest | Real — most-recent-snapshot-per-contract summed from real `OptionsOpenInterestSnapshot` rows; `null` when no snapshot exists yet for a symbol. |
| Put/Call Ratio | Real — computed directly from the volume above. |
| Volume/OI ratio | Real — computed from the volume and OI above; `null` when OI is unavailable. |
| Large block trades | Real — sourced from the existing, already-tested `detectBlock` detector's persisted `BLOCK_TRADE` signals. |
| Expiration, Strike | Real — carried through verbatim from every contract/signal record. |
| Premium | Real — carried as `notionalValue` on every print/signal (this platform's existing schema does not separately store a per-contract "premium" field distinct from notional value; disclosed here rather than inventing a new one). |
| Delta | **Honestly unavailable** — no Greeks data source is connected in this environment (no paid vendor). Always `null` on `greeks.delta`. |
| IV, IV Rank, IV Percentile | **Honestly unavailable** for the same reason — always `null`; `volatilityRegime` reports `"UNKNOWN"` with the real reason rather than guessing. |
| Gamma Exposure | **Honestly unavailable**, same reason — `greeks.gammaExposure` is always `null` (the mission itself says "if available" for this one). |

**Every "honestly unavailable" field above is reachable the moment a real Greeks/IV vendor is connected** — because of the provider abstraction, that requires implementing a second `getSymbolMetrics()` (or extending the internal one to call a new provider for just those fields) and nothing in `marketBiasAnalyzer.js`, `signalsAnalyzer.js`, `riskSummary.js`, or `aiSummary.js` needs to change; `volatilityRegime`'s `ELEVATED`/`SUPPRESSED`/`NORMAL` branches already exist and are unit-tested against real IV Rank values, just currently unreachable in production because no real value has ever been supplied.

## Compatibility with the existing Agent Platform — verified, not assumed

- **Agent Registry:** unchanged id, still one of the 13 named agents `registerAllAgents()` registers automatically; `registry.test.js`'s full suite (including "every one of the 13 named future-agent domains has exactly one registration" and "no two agents share the same id") passes unmodified.
- **Agent Orchestrator:** the adapter still implements the exact 4-member Agent interface (`metadata`/`execute`/`confidence`/`health`); a new integration test runs it through the real, unmodified `agentOrchestrator.run()` and confirms a `"fulfilled"` status with the rich report inside `result.result`.
- **Agent Scheduler:** exercised for real — a dedicated test calls `sharedScheduler.runAgent()` directly for the options agent twice and confirms the health cache (`AGENT-SCHEDULER-001`/`PLATFORM-HARDENING-001`) records a real hit on the second call.
- **Observability:** a dedicated test runs the options agent through `runObserved()` and confirms a real `AgentExecutionLog` entry is recorded, correlation-id-tagged, with the correct `agentId`/`confidence`/`healthStatus`.
- **Metrics:** flows through the exact same `agentScheduler.getMetrics()`/`AgentExecutionLog` metrics every other agent already does — no special-casing.
- **Retry:** unchanged — the adapter's `execute()` still either resolves or throws, and the scheduler's existing retry/backoff mechanics apply exactly as they do to every other agent.
- **Health:** unchanged from the prior implementation — still based on the real options-flow provider's own run-log/connection status, not on this new analysis engine's internal state.

## No external paid APIs — confirmed

`optionsDataProvider.js`'s internal implementation makes zero HTTP calls, zero vendor SDK calls, and reads no API key beyond checking whether one is configured (to decide honest-availability, never to call out). Every number comes from this platform's own Postgres tables, already populated by the existing (and unchanged) `optionsAgentService.ingestAndDetect()` pipeline.

## Tests

**58 new tests, all passing:**
- `marketBiasAnalyzer.test.js` (11) — no-data honesty, thin-volume non-triggering, real bullish/bearish cases from ratio/skew/block-flow individually and combined, balanced-flow cancellation, confidence bounds.
- `signalsAnalyzer.test.js` (10) — ranking, Decimal-to-number conversion, institutional-activity detection and exclusions, accumulation shares (including the zero-volume edge case), volatility-regime honesty and classification once real IV data exists.
- `riskSummary.test.js` (7) — every rule-based note individually, data-confidence thresholds, the always-at-least-one-note guarantee.
- `aiSummary.test.js` (6) — the 2-4-sentence guarantee across multiple real scenarios, correct bias labeling, institutional-activity mention, low-confidence disclosure.
- `optionsDataProvider.test.js` (7) — real Postgres integration: unconfigured-provider honesty, and (with the provider temporarily flagged configured and real rows seeded directly through the existing repository) real volume/OI/ratio computation, real block-trade and skew-signal surfacing with the correct sign convention.
- `optionsFlowAgent.test.js` (5) — the composed report's full shape, the injectable-provider seam, bias/summary consistency, input retention for auditability.
- `optionsAgent.orchestratorIntegration.test.js` (5) — full-stack proof: registry auto-registration, real orchestrator execution, real scheduler health-cache reuse, real observability recording, opaque-direction contract.

Plus full regression: `realAgents.test.js`, `registry.test.js`, and `agentOrchestrator.test.js`'s complete pre-existing suites (28 tests) were re-run and pass unmodified.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1255 tests, 1253 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified in `AGENT-OBSERVABILITY-001`, `AGENT-SCHEDULER-001`, and `PLATFORM-HARDENING-001` (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase).

## Honest limitations, disclosed rather than hidden

1. **No real Greeks/IV data source exists in this environment.** Every field depending on one (`delta`, `iv`, `ivRank`, `ivPercentile`, `gammaExposure`, and therefore `volatilityRegime`) is honestly `null`/`"UNKNOWN"` today. The interface and analysis code are ready for a real vendor; the vendor relationship itself is a business/procurement decision, not an engineering gap this phase could close.
2. **"Premium" is represented as `notionalValue`**, this platform's existing real field, rather than a separate per-contract premium column — no such column exists on `OptionsFlowPrint`/`OptionsSignal`, and adding one would be a schema change outside this phase's stated scope (build the agent, not redesign the data model).
3. **The "AI Summary" is deterministic templating, not a language-model call.** This is a disclosed, deliberate choice consistent with this project's established preference (see `investorProfileService`), not an oversight — it means the summary can never say something the structured report doesn't support, at the cost of being less varied in phrasing than a real LLM would produce.
4. **The market-bias scoring weights (40/30/30 split across put/call ratio, skew, and block-flow) are a reasoned, documented starting point, not empirically calibrated against real historical outcomes** — there is no accumulated real-flow history in this environment to calibrate against yet (the same "baseline-bootstrap" gap `optionsAgentService.js` already discloses for its own detectors). Recalibrating once real history accumulates is a natural follow-up, not a defect today.
5. **This phase upgraded the existing `"options"` agent rather than adding a second one.** A reviewer expecting a brand-new agent id should read this as the intended interpretation, explained above, not an oversight.

## Files changed

- New: `backend/services/domainAgents/optionsFlowAgent/{optionsDataProvider,marketBiasAnalyzer,signalsAnalyzer,riskSummary,aiSummary,optionsFlowAgent}.js` + matching `.test.js` files, plus `optionsAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/optionsAgent.js` (now calls the new engine; same `metadata`, same 4-member Agent interface).
- Modified: `backend/services/optionsAgent/optionsFlowRepository.js` (one new additive read function, `findRecentOpenInterestSnapshots`).
- Unmodified: `optionsAgentService.js`, `optionsFlowNormalizer.js`, `optionsFlowAggregator.js`, `optionsSignalDetectors.js`, `optionsAnomalyConfidence.js`, `optionsSignalExplanation.js`, `optionsSignalGovernance.js`, `optionsFlowProvider.js`, `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability` — every existing subsystem this agent depends on or plugs into.
