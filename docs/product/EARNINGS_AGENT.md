# EARNINGS_AGENT.md — Phase EARNINGS-AGENT-001

**Mission:** build the Earnings Intelligence Agent — analyze revenue growth, EPS growth, EPS surprise, revenue surprise, guidance changes, forward guidance, analyst revisions, historical earnings consistency, profit margins, and cash flow trends, producing a normalized report (Earnings Health, Growth Score, Surprise Score, Forward Outlook, Confidence, Risks, Opportunities, AI Summary), implemented as a standard Domain Agent integrated with the Registry/Scheduler/Observability/Orchestrator, no UI, provider abstraction required, comprehensive tests.

---

## Design decision: upgrade, not duplicate (same precedent as OPTIONS-AGENT-001)

This platform already reserves an agent registry slot under id `"earnings"`, registered since `AGENT-ORCHESTRATOR-001` as an honest, inert stub (`createStubAgent`) — no analysis service existed on top of the raw `earningsProvider` fetch definition at that time. This phase **upgrades that existing slot in place**: same id (`"earnings"`), same registry position, `metadata.name` updated from `"Earnings Agent"` to `"Earnings Intelligence Agent"` to match this phase's own mission title — but `execute()` now produces the full, structured report the mission describes instead of throwing `"not yet implemented"`.

This is the same engine-vs-adapter split and the same "upgrade the existing stub/agent rather than register a duplicate id" decision `OPTIONS-AGENT-001` made for the `"options"` agent, for the identical reason: avoiding two competing, overlapping registrations for the same real-world domain. Confirmed zero regression: `registry.js`'s `EXPECTED_AGENT_IDS` list, `registry.test.js`'s full suite, and every existing interface-conformance test pass unmodified — the only observable change is that this id now fulfills instead of reporting itself unavailable.

## What was built

New directory: `backend/services/domainAgents/earningsAgent/` — the reusable Domain Intelligence Agent engine, independent of the orchestrator-facing adapter.

| File | Responsibility |
|---|---|
| `earningsDataProvider.js` | **The provider abstraction.** Documents the `getSymbolEarnings(symbol) -> EarningsMetrics` interface any conforming provider must implement, and ships one real, default implementation (`createFinnhubEarningsDataProvider`) that calls Finnhub's real, already-configured (`FINNHUB_API_KEY`, the same credential this platform's `finnhubService.js` already uses for live quotes) `/stock/earnings` (quarterly actual/estimate/surprise EPS) and `/stock/metric` (real revenue/EPS growth, real net profit margin) endpoints. Any fetch failure — no key, network error, timeout — gracefully degrades to an honest, all-null `dataAvailable: false` result, exactly the discipline `technicalIntelligenceService`/`optionsAgentService` already use for their own live calls. |
| `growthAnalyzer.js` | Pure, deterministic `Growth Score` (0-100) from real revenue-growth-YoY and EPS-growth-YoY, each independently clamped/mapped, then averaged across whichever are actually available. |
| `surpriseAnalyzer.js` | Pure, deterministic `Surprise Score` (0-100) from real average EPS-surprise-percent and real beat rate across the actually-reported quarters; also computes `Historical earnings consistency` (`HIGH`/`MODERATE`/`LOW`/`UNKNOWN`) from the real beat rate and real surprise standard deviation. |
| `outlookAnalyzer.js` | Pure, deterministic `Forward Outlook` (`POSITIVE`/`NEUTRAL`/`NEGATIVE`/`UNKNOWN`) blending whichever of growth/surprise/guidance-direction/analyst-revision-direction are actually real this run; also computes the fraction of the full 4-category signal set that's genuinely present, which becomes the report's overall `Confidence`. |
| `earningsHealthAnalyzer.js` | Pure, deterministic `Earnings Health` (`STRONG`/`STABLE`/`WEAK`/`UNKNOWN`) blending real net profit margin, the real growth score, and real historical consistency. |
| `riskOpportunity.js` | Real, rule-based `Risks`/`Opportunities` lists — every entry fires only on a checkable real condition (negative growth, loss-making margin, low consistency, missing data sources, etc.), never a speculative filler entry. |
| `aiSummary.js` | The mission's "AI Summary" — **a deterministic, template-based composition, not an LLM/external-API call**, disclosed explicitly, following the exact same pattern `OPTIONS-AGENT-001`'s `aiSummary.js` established. Always 2-4 sentences, verified by test across multiple real scenarios. |
| `earningsAgent.js` | `generateReport(symbol, { provider })` — composes the above into the final normalized report. |

## The normalized report shape

```js
{
  symbol: "NVDA",
  generatedAt: "2026-...",
  dataAvailable: true,               // false when the real fetch failed/no key configured
  unavailableReason: null,
  earningsHealth: "STRONG",          // STRONG | STABLE | WEAK | UNKNOWN
  growthScore: 80,                   // 0-100
  surpriseScore: 76,                 // 0-100
  consistency: { rating: "HIGH", beatRate: 1, missRate: 0, stdDev: 4.2, sampleSize: 4 },
  forwardOutlook: "POSITIVE",        // POSITIVE | NEUTRAL | NEGATIVE | UNKNOWN
  confidence: 65,                    // 0-100 — the real fraction of the 4-category signal set actually present
  risks: [ "..." ],
  opportunities: [ "..." ],
  aiSummary: "Recent results show revenue growth of 22.0% YoY and EPS growth of 25.0% YoY. EPS surprises have scored 76/100 with high historical consistency. Overall earnings health is rated STRONG based on the available margin, growth, and consistency signals. Forward outlook reads positive based on the signals currently available.",
  inputs: { /* the full EarningsMetrics this report was built from, for auditability */ },
}
```

Every field the mission's "Output" section named is present: Earnings Health, Growth Score, Surprise Score, Forward Outlook, Confidence, Risks, Opportunities, AI Summary.

## Every mission "Analyze" input — how each is handled

| Input | Status |
|---|---|
| Revenue growth | Real — Finnhub's `revenueGrowthTTMYoy` metric, when the live call succeeds. |
| EPS growth | Real — Finnhub's `epsGrowthTTMYoy` metric. |
| EPS surprise | Real — Finnhub's `/stock/earnings` `surprise`/`surprisePercent` per quarter. |
| Revenue surprise | **Honestly unavailable** — Finnhub's free-tier `/stock/earnings` endpoint reports EPS surprise only, not a revenue-estimate-vs-actual figure. Disclosed explicitly rather than approximated from an unrelated proxy. |
| Guidance changes / Forward guidance | **Honestly unavailable** — no forward-guidance text/number feed is connected in this environment (this is a distinct, typically-paid data category — transcripts/guidance-tracking services — that Finnhub's base endpoints don't cover). Always `null` on `guidance.direction`; `outlookAnalyzer.js`'s `RAISED`/`LOWERED`/`MAINTAINED` handling is fully built and unit-tested, and activates automatically the moment a real feed populates this field. |
| Analyst revisions | **Honestly unavailable**, same reason — no analyst-revision feed is connected. Always `null` on `analystRevisions.direction`; the `UP`/`DOWN`/`MIXED` handling is fully built and tested, ready the moment a real feed is connected. |
| Historical earnings consistency | Real — computed from the real beat rate and real surprise-percent standard deviation across the reported quarters `/stock/earnings` returns. |
| Profit margins | Real — Finnhub's `netProfitMarginTTM`/`grossMarginTTM` metrics. |
| Cash flow trends | **Honestly unavailable** — Finnhub's free-tier `/stock/metric` set does not include a real free-cash-flow growth figure; would require `/stock/cash-flow` or a premium financials-as-reported feed. Always `null` on `cashFlow.freeCashFlowGrowthYoY`, disclosed as a real risk in every report's `risks` list rather than silently omitted. |

**Every "honestly unavailable" field above is reachable the moment a real data source is connected** — because of the provider abstraction, this requires only extending (or replacing) `getSymbolEarnings()`'s implementation; nothing in `growthAnalyzer.js`, `surpriseAnalyzer.js`, `outlookAnalyzer.js`, `earningsHealthAnalyzer.js`, `riskOpportunity.js`, or `aiSummary.js` needs to change — `outlookAnalyzer.js`'s guidance/analyst-revision branches are already implemented and unit-tested against real direction values, simply unreachable in production today because no real value has ever been supplied.

## Compatibility with the existing Agent Platform — verified, not assumed

- **Agent Registry:** same id, same registry slot, still one of the 13 named agents `registerAllAgents()` registers automatically; a dedicated test confirms it's no longer a stub (`metadata.name` updated, `execute()` no longer throws `notImplemented`).
- **Agent Orchestrator:** the adapter implements the exact 4-member Agent interface; a full-stack integration test runs it through the real, unmodified `agentOrchestrator.run()`.
- **Agent Scheduler:** exercised for real — a dedicated test calls `sharedScheduler.runAgent()` directly for the earnings agent twice and confirms the health cache records a real hit on the second call, exactly mirroring `OPTIONS-AGENT-001`'s equivalent test.
- **Observability:** a dedicated test runs the earnings agent through `runObserved()` and confirms a real `AgentExecutionLog` entry is recorded, correlation-id-tagged, with the correct `agentId`/`confidence`.
- **Metrics/Retry/Health:** unchanged mechanics — the adapter's `execute()` either resolves or throws exactly like every other agent, and `health()` reports `unavailable` only when no `FINNHUB_API_KEY` is configured (consistent with `technicalAgent.js`'s own precedent of not performing a live connectivity probe inside `health()` itself — graceful degradation is `execute()`'s job, tested directly).

## Provider abstraction — confirmed swappable

`earningsAgent.test.js` includes a dedicated test constructing a fully injected fake provider (no real network call at all) and confirming `generateReport()` produces a complete, internally-consistent report from it — proving the analysis engine depends only on the documented `EarningsMetrics` shape, never on Finnhub specifically.

## Tests

**56 new tests, all passing:**
- `growthAnalyzer.test.js` (9) — no-data honesty, midpoint mapping, cap/floor clamping, null-input honesty, combined/partial/absent growth signals, strong positive/negative cases.
- `surpriseAnalyzer.test.js` (9) — no-data honesty, consistency rating at every band (`HIGH`/`MODERATE`/`LOW`/`UNKNOWN`), strong positive/negative surprise cases, null-surprise exclusion (never treated as zero), genuinely-empty-history honesty.
- `outlookAnalyzer.test.js` (8) — zero-signal `UNKNOWN` honesty, growth+surprise-only positive/negative/neutral cases, real guidance/analyst-revision contribution when present, full-signal-set confidence reaching 100.
- `earningsHealthAnalyzer.test.js` (7) — margin-to-score mapping and null-honesty, zero-component `UNKNOWN`, `STRONG`/`STABLE`/`WEAK` combined cases, single-component honesty.
- `riskOpportunity.test.js` (9) — no-data honesty, every individual real risk/opportunity rule, the always-disclosed missing-data-source risks, health-driven entries, the always-at-least-one-entry guarantee.
- `aiSummary.test.js` (5) — no-data honesty naming the real reason, the 2-4-sentence guarantee across multiple real scenarios, explicit growth/health/outlook naming, honest `UNKNOWN`-outlook disclosure.
- `earningsDataProvider.test.js` (4) — the full empty-metrics shape, `isConfigured()` reflecting the real environment, a real live-call attempt that never throws regardless of outcome, and a forced-network-failure test proving graceful degradation (not a hang or an unhandled rejection).
- `earningsAgent.test.js` (4) — the composed report's full shape (no-data case), the injectable-provider seam with a fully-real fake-data scenario, a consistent weak/negative scenario, input retention for auditability.
- `earningsAgent.orchestratorIntegration.test.js` (5) — full-stack proof: registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording, opaque-direction contract.

Plus regression: `realAgents.test.js` was extended (not replaced) to include the earnings agent alongside the existing three, and `registry.test.js`'s complete pre-existing suite passes unmodified.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1317 tests, 1315 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across `AGENT-OBSERVABILITY-001`, `AGENT-SCHEDULER-001`, `PLATFORM-HARDENING-001`, and `OPTIONS-AGENT-001` (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase).

## Honest limitations, disclosed rather than hidden

1. **Revenue surprise, forward guidance, guidance changes, analyst revisions, and cash-flow trends are all honestly unavailable in this environment today** — none of Finnhub's free-tier endpoints this phase connects to expose them. This is disclosed field-by-field above and surfaced directly in every report's `risks` list, never silently dropped.
2. **The live Finnhub calls in this sandboxed test environment may succeed or gracefully degrade depending on real network egress** — unlike `OPTIONS-AGENT-001` (which explicitly forbade external paid APIs and used only this platform's own database), this phase reuses the already-configured, already-live `FINNHUB_API_KEY` the rest of the platform depends on. Tests are written to pass either way (asserting shape/graceful-degradation, never a specific live value), the same discipline `technicalAgent`'s own tests already use.
3. **The Growth Score / Surprise Score / Earnings Health scoring weights are reasoned, documented starting points, not empirically calibrated against real historical outcomes** — there is no accumulated real-earnings-outcome history in this environment to calibrate against yet, the same disclosed limitation `OPTIONS-AGENT-001`'s bias-scoring weights carry.
4. **Overall report `confidence` is defined as "the real fraction of the 4 possible signal categories (growth, surprise, guidance, analyst revisions) that are actually present this run,"** not a statistical confidence interval — a deliberate, documented, and honest definition rather than an invented precision the underlying data can't support.
5. **This phase upgraded the existing `"earnings"` stub rather than adding a second agent id** — the same interpretation `OPTIONS-AGENT-001` used for the `"options"` agent, for the identical reason (avoiding a duplicate, competing registration for the same domain).

## Files changed

- New: `backend/services/domainAgents/earningsAgent/{earningsDataProvider,growthAnalyzer,surpriseAnalyzer,outlookAnalyzer,earningsHealthAnalyzer,riskOpportunity,aiSummary,earningsAgent}.js` + matching `.test.js` files, plus `earningsAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/earningsAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (extended to smoke-test the earnings agent alongside the existing three, non-destructively).
- Unmodified: `earningsProvider.js` (the raw, still-honest-stub provider definition this phase's own provider does not depend on), `finnhubService.js`, `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
