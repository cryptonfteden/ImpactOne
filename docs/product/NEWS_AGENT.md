# NEWS_AGENT.md — Phase NEWS-AGENT-001

**Mission:** build the News Intelligence Agent — analyzing breaking news, news importance, event classification, company-specific news, sector news, macro news, news freshness, event persistence, multi-source confirmation, and expected market impact, producing News Bias (Bullish/Neutral/Bearish), News Score, Importance Score, Freshness Score, Confirmation Score, Impact Horizon, Affected Sectors, Bullish Factors, Bearish Factors, Risks, Confidence (0-100), and an AI Summary. Reuse existing news infrastructure wherever possible, provider abstraction, never fabricate news, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: reuse, don't duplicate, SENTIMENT-AGENT-001's news infrastructure

The `"news"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub — its own comment noted that the generic `newsService.getNews(query)` was query-scoped, not symbol-scoped analysis, and that wiring it in honestly required a real per-symbol relevance/analysis layer this codebase didn't have yet.

That layer now exists: `SENTIMENT-AGENT-001` already built a real, honest, per-symbol NewsAPI provider (`backend/services/domainAgents/sentimentAgent/newsSentimentDataProvider.js`) plus a source-credibility analyzer (`sourceQualityAnalyzer.js`) and a deterministic keyword-lexicon article scorer (`articleSentimentScorer.js`) — all already real, already tested, and (critically) already honest, never fabricating an article or a fallback sentiment reading. Per this mission's own explicit "Reuse existing news infrastructure wherever possible," this phase **directly requires and reuses all three modules** from the sentiment agent's own directory rather than duplicating a second NewsAPI client, a second credibility scorer, or a second keyword lexicon. This is a different reuse decision than prior phases (Macro/Analyst Consensus built fresh clients because the existing looser services there fabricated fallback values on failure) — here the existing infrastructure is already exactly as honest as this mission requires, so reuse is the correct call.

New, genuinely novel work this phase adds on top: real event classification (COMPANY/SECTOR/MACRO), real freshness/persistence/confirmation/importance scoring, real Impact Horizon derivation, and a real Affected-Sectors read via a new, dedicated Finnhub `/stock/profile2` fetch (mirroring the exact calling convention already proven in `finnhubService.js`).

**Honest note on this environment's own live state:** `NEWS_API_KEY` is confirmed unset in this environment's `.env` (the same as the existing `symbol-sentiment` agent already discloses). Live smoke-testing this agent against real AAPL therefore produces an honest `dataAvailable: false` — proving the "if no verified news exists, explicitly report unavailable" requirement works correctly, not a failure of the agent itself. All analysis logic was verified against realistic fixture data (see below) and is production-ready the moment a real key is configured.

## What was built

New directory: `backend/services/domainAgents/newsAgent/`.

| File | Responsibility |
|---|---|
| `companyProfileProvider.js` | A real, dedicated fetch of Finnhub's real `/stock/profile2` endpoint (same calling convention as `finnhubService.js`) for the real `finnhubIndustry` field — this codebase's only real, free sector signal, used for Affected Sectors. |
| `newsDataProvider.js` | **The top-level provider abstraction.** Reuses `sentimentAgent/newsSentimentDataProvider.js`'s real `createNewsSentimentDataProvider()` (not duplicated) for the real article fetch, in parallel with the real company-profile fetch. |
| `eventClassifier.js` | **Event classification / Company-specific / Sector / Macro news** — a disclosed keyword/name-match heuristic: a real symbol or company-name mention is COMPANY; failing that, a real macro-keyword hit (Fed, inflation, GDP, etc.) is MACRO; otherwise SECTOR. |
| `freshnessAnalyzer.js` | **Breaking news / News freshness → Freshness Score** — disclosed time-decay bands over the real most-recent article's timestamp. |
| `confirmationAnalyzer.js` | **Multi-source confirmation → Confirmation Score** — reuses `sentimentAgent/sourceQualityAnalyzer.js`'s real `analyzeSourceQuality()` for real credibility + real source-diversity, combined via a disclosed weighted formula. |
| `importanceAnalyzer.js` | **News importance → Importance Score** — a disclosed weighted combination of real freshness, real confirmation, and a real, disclosed severity-keyword hit rate (bankruptcy, lawsuit, recall, acquisition, etc.). |
| `persistenceAnalyzer.js` | **Event persistence** — the real count of distinct real calendar days with at least one real article in the fetched window. |
| `impactHorizonAnalyzer.js` | **Expected market impact → Impact Horizon** — a disclosed rule table over real importance, real breaking-news status, and real persistence. |
| `affectedSectorsAnalyzer.js` | **Sector news → Affected Sectors** — the real company-profile industry, returned only when real SECTOR/MACRO-classified coverage exists alongside it; honestly empty otherwise. |
| `newsBiasScoreAnalyzer.js` | **News Bias / News Score** — reuses `sentimentAgent/articleSentimentScorer.js`'s real, deterministic keyword-lexicon scorer, combined into a disclosed News Score via real per-article classification counts. |
| `confidenceModel.js` | Overall **Confidence** — real data availability, real sample size, real confirmation strength, and a disclosed penalty when the real company profile is unavailable. |
| `factorsRisksBuilder.js` | **Bullish Factors / Bearish Factors / Risks** — this mission's own 3-array output shape (matching insider/sentiment/macro), deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly disclosed as not an LLM/external API call. |
| `newsAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

Live-verified two ways during development: (1) against real AAPL with this environment's actual (unset) `NEWS_API_KEY`, honestly reporting unavailable; (2) against a realistic 3-article fixture (one COMPANY earnings story, one SECTOR acquisition story, one MACRO Fed-policy story) to prove every analyzer computes correctly once real news is flowing:

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-30T14:50:46.823Z",
  dataAvailable: true,
  unavailableReason: null,
  newsBias: "NEUTRAL",             // BULLISH | NEUTRAL | BEARISH
  newsScore: 0,                     // -100..100
  importanceScore: 67,               // 0-100
  freshnessScore: 100,                // 0-100
  confirmationScore: 80,              // 0-100
  impactHorizon: "MEDIUM",           // SHORT | MEDIUM | LONG
  affectedSectors: ["Technology"],
  bullishFactors: [
    "News Importance is elevated (67/100), meaning this window's real coverage is unusually significant.",
    "Multi-source confirmation is strong (80/100) — this real news is corroborated across multiple real, credible sources.",
  ],
  bearishFactors: [
    "News Importance is elevated (67/100) alongside a non-bullish read, warranting attention.",
  ],
  risks: [],
  confidence: 62,
  aiSummary: "News Bias is NEUTRAL (News Score 0), with an Importance Score of 67/100. ...",
  inputs: { /* the full real NewsMetrics (articles + company profile) this report was built from, for auditability */ },
}
```

Real, honest degraded shape confirmed live against AAPL in this environment: `dataAvailable: false`, `unavailableReason: "No NEWS_API_KEY configured — real per-symbol news sentiment cannot be computed."`, every score field honestly `null`/`"UNKNOWN"`, and `risks: ["No verified real news is available: ..."]`.

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Breaking news | Real, `freshnessAnalyzer.js`'s `isBreaking` flag (≤6h since latest real article). |
| News importance | Real, `importanceAnalyzer.js`. |
| Event classification | Real, `eventClassifier.js` (COMPANY/SECTOR/MACRO). |
| Company-specific news | Real, `eventClassifier.js`'s COMPANY branch. |
| Sector news | Real, `eventClassifier.js`'s SECTOR branch + `affectedSectorsAnalyzer.js`. |
| Macro news | Real, `eventClassifier.js`'s MACRO branch (disclosed macro-keyword list). |
| News freshness | Real, `freshnessAnalyzer.js`. |
| Event persistence | Real, `persistenceAnalyzer.js`. |
| Multi-source confirmation | Real, `confirmationAnalyzer.js` (reuses `sourceQualityAnalyzer.js`). |
| Expected market impact | Real, `impactHorizonAnalyzer.js`. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `newsAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests.

**`registry.test.js`'s stub-behavior test is retired, not retargeted.** `"news"` was the last remaining genuine stub — every one of the 14 named agent domains is now real, and `stubAgentFactory.js`'s `createStubAgent` has zero remaining call sites. Retargeting the old "not-yet-implemented stub agents" test at a fake stand-in would have been dishonest test coverage, so it was replaced with a new test asserting no stub agents remain (every registered agent's real `health()` call returns something other than the stub's fixed "not yet implemented" reason).

The orchestrator adapter (`backend/services/agentOrchestrator/agents/newsAgent.js`) is a thin wrapper over the real domain engine, following the same per-symbol pattern as insider/short-interest/analyst-consensus.

## Integration with the Unified Stock Intelligence extension point

Extended from 10 agents to 11:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"news"`.
- `agentDirectionMapper.js`: new `toPolarity` case (`newsBias` direct mapping) and `extractRisksAndOpportunities` case (this mission's own 3-array shape — `risks` + `bearishFactors` map to risks, `bullishFactors` to opportunities — the same pattern as insider/symbol-sentiment/macro).
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `11: 65` entry, continuing the established diminishing-returns sequence.
- `aiExecutiveSummary.js` needed **no changes** — already generalizes dynamically (established at `SENTIMENT-AGENT-001`).
- Verified live end-to-end against NVDA: `totalAgentCount: 11`, all 11 agents wired in correctly.

## Tests

**57 new unit tests, all passing:** `companyProfileProvider.test.js` (4), `newsDataProvider.test.js` (2), `eventClassifier.test.js` (5), `freshnessAnalyzer.test.js` (5), `confirmationAnalyzer.test.js` (3), `importanceAnalyzer.test.js` (4), `persistenceAnalyzer.test.js` (4), `impactHorizonAnalyzer.test.js` (5), `affectedSectorsAnalyzer.test.js` (3), `newsBiasScoreAnalyzer.test.js` (3), `confidenceModel.test.js` (4), `factorsRisksBuilder.test.js` (6), `aiSummary.test.js` (5), `newsAgent.test.js` (4, including a forbidden-governance-key scan).

Plus **5 new** `newsAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 4 existing Unified Stock Intelligence/registry test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`, `registry.test.js`'s stub-behavior test retired and replaced) to reflect the 11-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2285 tests, 2283 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures introduced by this phase. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **`NEWS_API_KEY` is confirmed unset in this environment** — every live call to this agent honestly reports `dataAvailable: false`, exactly matching the pre-existing `symbol-sentiment` agent's own disclosed limitation. This is not a defect introduced by this phase; it is the correct, honest behavior this mission's own "if no verified news exists, explicitly report unavailable" requirement demands.
2. **Event classification (COMPANY/SECTOR/MACRO) is a disclosed keyword/name-match heuristic**, not an ML/LLM classifier — a real article that discusses a company without naming it or the symbol (e.g. a pronoun-only follow-up story) will be classified SECTOR by the documented default, not fabricated as COMPANY.
3. **Affected Sectors is limited to this codebase's one real free sector signal** (Finnhub's `finnhubIndustry` field) — a single-sector array, never a fabricated multi-sector taxonomy.
4. **All thresholds and weights** (freshness bands 6h/24h/72h/168h, importance weights 30%/30%/40%, confirmation weights 50%/50%, persistence 2-day/5-day bands, confidence components) **are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
5. **The News Score reuses the sentiment agent's own keyword lexicon** (`sentimentLexicon.js`, unmodified) — the same disclosed strengths/limitations of that deterministic, non-ML lexicon apply here (documented in `SENTIMENT_AGENT.md`).

## Files changed

- New: `backend/services/domainAgents/newsAgent/{companyProfileProvider,newsDataProvider,eventClassifier,freshnessAnalyzer,confirmationAnalyzer,importanceAnalyzer,persistenceAnalyzer,impactHorizonAnalyzer,affectedSectorsAnalyzer,newsBiasScoreAnalyzer,confidenceModel,factorsRisksBuilder,aiSummary,newsAgent}.js` + matching `.test.js` files, plus `newsAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/newsAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/agentOrchestrator/registry.test.js` (stub-behavior test retired and replaced with a "no stub agents remain" test, since `"news"` was the last genuine stub).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to an 11-agent evidence set).
- Unmodified (reused directly): `backend/services/domainAgents/sentimentAgent/{newsSentimentDataProvider,sourceQualityAnalyzer,articleSentimentScorer,sentimentLexicon}.js` — required cross-directory, exactly per this mission's own "reuse existing news infrastructure wherever possible."
- Unmodified: `backend/services/newsService.js` (its own fabricated-fallback behavior remains as-is for its existing consumers — not touched, since this mission's stricter honesty requirement is exactly why `newsSentimentDataProvider.js` was reused instead), `backend/services/finnhubService.js` (reused only as a calling-convention reference for `companyProfileProvider.js`, not modified or imported), `aiExecutiveSummary.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
