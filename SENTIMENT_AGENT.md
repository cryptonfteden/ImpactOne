# SENTIMENT_AGENT.md — Phase SENTIMENT-AGENT-001

**Mission:** build the Sentiment Intelligence Agent — analyzing news sentiment, social sentiment, sentiment trend, sentiment velocity, positive/negative article ratio, source credibility, source diversity, event-driven sentiment shifts, sentiment-price divergence, and abnormal sentiment spikes, producing Sentiment State (Positive/Neutral/Negative), Sentiment Trend (Improving/Stable/Deteriorating), Sentiment Score (0-100), Sentiment Velocity, Source Quality, Abnormal Activity, Bullish Factors, Bearish Factors, Risks, Confidence (0-100), and an AI Summary. Provider abstraction, never fabricate social/news data, honest null/unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: a genuinely new, distinct agent — not an upgrade of the existing `"sentiment"` id

Before writing any code, this phase surveyed the existing sentiment infrastructure in depth (a dedicated research pass) and found:

- `backend/services/agentOrchestrator/agents/sentimentAgent.js` (id `"sentiment"`) is already real — but it wraps `marketSentiment/marketSentimentService.js`, a **market-wide** reading. Its own `execute(symbol)` **ignores the symbol argument entirely** and always returns the same US-market-wide sentiment regardless of which stock was asked about. This is honestly disclosed in its own summary text and in `realAgents.test.js`'s own test name.
- `services/marketSentiment/` is a mature, real, already-tested 12-file subsystem (dimensions, scorers, engine, rollup, governance, repository, service) — but architecturally market-wide by design (proxy symbols, region tags, no per-symbol keying anywhere).
- No real per-symbol news-sentiment or social-sentiment engine exists anywhere in this codebase. `services/newsService.js` has no sentiment scoring and — critically — returns a **fabricated static fallback article** when `NEWS_API_KEY` is unset, which this mission's own "never fabricate" requirement rules out reusing directly. `services/providers/definitions/redditProvider.js`/`xProvider.js` are honest stubs with no real Reddit/X integration.

Since this mission asks for a genuinely different capability (real, per-symbol sentiment across 10 distinct analytical objectives) than the existing market-wide agent answers, this phase registers a **new, 14th agent id, `symbol-sentiment`** ("Sentiment Intelligence Agent") alongside — not replacing — the existing `"sentiment"` id. `backend/services/agentOrchestrator/registry.test.js`'s closed 13-id list was deliberately updated to 14, documented inline as an intentional expansion, not an oversight.

## What was built

New directory: `backend/services/domainAgents/sentimentAgent/`.

| File | Responsibility |
|---|---|
| `newsSentimentDataProvider.js` | **The primary provider abstraction.** Calls NewsAPI's `/v2/everything` directly (bypassing `newsService.js`'s fabricated fallback entirely) for real, per-symbol articles over a lookback window. Honestly returns `dataAvailable: false` with a real reason whenever `NEWS_API_KEY` is unset, the request fails, or zero real articles come back — never a placeholder. |
| `socialSentimentDataProvider.js` | The social sentiment provider abstraction — always honestly reports `dataAvailable: false` (Reddit/X are honest stubs in this codebase, no real integration exists), satisfying the mission's explicit "never fabricate social data" requirement directly. The interface exists so a real provider can be swapped in later without any other file changing. |
| `sentimentLexicon.js` | A disclosed, hand-set finance-domain positive/negative keyword list (the same accepted keyword-heuristic pattern `socialInfluenceService.js` already uses) — deterministic, never NLP/ML/LLM. |
| `articleSentimentScorer.js` | Scores each real article's title+description via the lexicon, classifying POSITIVE/NEGATIVE/NEUTRAL from real word-hit counts. |
| `sentimentTimeSeriesBuilder.js` | Buckets real, already-scored articles by their real `publishedAt` date into a real daily time series over the lookback window — no persistence layer needed since every article carries its own real timestamp. |
| `sentimentTrendAnalyzer.js` | **Sentiment State / Sentiment Score / Sentiment Trend / Sentiment Velocity** — Score is a real average of all article scores normalized to 0-100 (honest 50 midpoint for zero articles); State/Trend use disclosed thresholds; Velocity compares the first half vs. second half of the real daily series. |
| `articleRatioAnalyzer.js` | **Positive/negative article ratio** — real counts, honestly `null` (never Infinity) when there are zero negative articles. |
| `sourceQualityAnalyzer.js` | **Source Quality** (credibility + diversity combined) — real distinct-source count, and a real credibility score from a disclosed, hand-set tier-1 outlet allowlist (Reuters, Bloomberg, WSJ, CNBC, etc.) — never a per-article editorial judgment call. |
| `abnormalActivityDetector.js` | **Abnormal Activity** (event-driven sentiment shifts + abnormal sentiment spikes, combined) — real z-score outlier detection on daily article volume, and real day-over-day sentiment-score swings past a disclosed threshold. |
| `sentimentPriceDivergenceAnalyzer.js` | **Sentiment-price divergence** — compares the real sentiment trend direction against real price direction over the same window (reusing the existing, unmodified `priceHistoryProvider.js`) — flags BULLISH_DIVERGENCE/BEARISH_DIVERGENCE only on a genuine disagreement. |
| `bullishBearishFactorsBuilder.js` | **Bullish Factors / Bearish Factors / Risks** — deterministic templates over every real computed field above; `risks` are data-quality/methodology caveats (social unavailability, low source diversity, small sample size, detected volume spikes), distinct from bearish sentiment content. |
| `confidenceModel.js` | Overall **Confidence** — a disclosed, hand-set weighted formula (never a naive average): data completeness, real sample size, real source diversity/credibility, a disclosed penalty for social sentiment's permanent unavailability in this environment, and a disclosed penalty when abnormal activity was detected. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly not an LLM call. |
| `sentimentDataProvider.js` | The top-level provider composing the three independent real sources (news, social, price) into one `SentimentMetrics` fetch. |
| `sentimentAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T...",
  dataAvailable: true,
  unavailableReason: null,
  sentimentState: "POSITIVE",           // POSITIVE | NEUTRAL | NEGATIVE
  sentimentTrend: "IMPROVING",          // IMPROVING | STABLE | DETERIORATING
  sentimentScore: 68.4,                  // 0-100
  sentimentVelocity: { value: 3.2, unit: "score points per day", insufficientData: false },
  sourceQuality: { distinctSourceCount: 6, sources: [...], tier1ArticleCount: 9, totalArticleCount: 14, credibilityScore: 64 },
  abnormalActivity: { volumeSpikes: [...], sentimentShifts: [...], hasAbnormalActivity: false },
  articleRatio: { positiveCount: 9, negativeCount: 3, neutralCount: 2, ratio: 3 },
  divergence: { divergence: "NONE", priceDirection: "UP", priceChangePercent: 4.2 },
  bullishFactors: [ "Overall sentiment is positive (score 68.4/100).", ... ],
  bearishFactors: [],
  risks: [ "Social sentiment could not be assessed: ...", ... ],
  confidence: { confidence: 62, components: { base: 40, sampleSizeBonus: 14, diversityBonus: 15, credibilityBonus: 10, socialPenalty: 10, abnormalPenalty: 0 } },
  aiSummary: "Sentiment State is POSITIVE (score 68.4/100), trending improving. ...",
  inputs: { /* the full SentimentMetrics this report was built from, for auditability */ },
}
```

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| News sentiment | Real, `newsSentimentDataProvider.js` + `articleSentimentScorer.js`. |
| Social sentiment | **Honestly unavailable, always, in this environment** — `socialSentimentDataProvider.js` never fabricates; the interface is real and swappable. |
| Sentiment trend | Real, `sentimentTrendAnalyzer.js`, from the real daily time series. |
| Sentiment velocity | Real, `sentimentTrendAnalyzer.js`. |
| Positive/negative article ratio | Real, `articleRatioAnalyzer.js`. |
| Source credibility | Real, `sourceQualityAnalyzer.js` (disclosed tier-1 allowlist). |
| Source diversity | Real, `sourceQualityAnalyzer.js` (real distinct-source count). |
| Event-driven sentiment shifts | Real, `abnormalActivityDetector.js` (day-over-day score swings). |
| Sentiment-price divergence | Real, `sentimentPriceDivergenceAnalyzer.js` (reuses the existing real `priceHistoryProvider.js`). |
| Abnormal sentiment spikes | Real, `abnormalActivityDetector.js` (real z-score volume outliers). |

## Integration with Registry / Scheduler / Observability / Orchestrator

- `backend/services/agentOrchestrator/agents/symbolSentimentAgent.js` — the thin adapter, id `"symbol-sentiment"`, name `"Sentiment Intelligence Agent"`, registered in `registry.js`'s `ALL_AGENTS`.
- `registry.test.js` updated: 13 → 14 named agent domains, `"symbol-sentiment"` added and documented as an intentional expansion.
- `realAgents.test.js` extended with 2 new smoke tests for the new agent, alongside the existing 5 real agents.
- Full-stack integration confirmed via `sentimentAgent.orchestratorIntegration.test.js` (5 tests): registry auto-registration (and coexistence with the unreplaced `"sentiment"` id), real orchestrator execution, real scheduler health-cache reuse, real observability recording, opaque-direction-string contract.

## Integration with the Unified Stock Intelligence extension point

Extended from 3 agents (Options/Earnings/Valuation) to 4:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to `["options", "earnings", "valuation", "symbol-sentiment"]`.
- `agentDirectionMapper.js`: new `toPolarity` case (`sentimentState` POSITIVE/NEGATIVE → BULLISH/BEARISH) and `extractRisksAndOpportunities` case (`bullishFactors` → opportunities; `risks` + `bearishFactors` → risks).
- `weightedAggregationEngine.js`: **generalized**, not just extended — the previously-hardcoded `3` (both in the unavailable-agent penalty and the recommendation-confidence discount) now derives from the real `normalizedAgents.length` passed in, so this engine scales honestly to any future agent-count change without another edit. `CORROBORATION_BONUS` gained an explicit, disclosed `4: 40` entry.
- `aiExecutiveSummary.js`: **generalized** — the previously-hardcoded "Options Flow, Earnings, and Valuation" phrase and the hardcoded `3`/`of 3 agents` text now build dynamically from the report's own real `agentContributions`/`totalAgentCount`, so this file no longer silently goes stale as the evidence set grows.
- `conflictDetector.js`, `caseBuilder.js`, `keyDriversBuilder.js` needed **no changes** — already generic over any-length `normalizedAgents`/`contributions` arrays.
- Verified live end-to-end against AAPL: `totalAgentCount: 4`, dynamic agent-name listing in the executive summary, correct proportional confidence discounting.

## Tests

**79 new unit tests, all passing:** `sentimentLexicon.test.js` (5), `articleSentimentScorer.test.js` (6), `sentimentTimeSeriesBuilder.test.js` (4), `sentimentTrendAnalyzer.test.js` (9), `articleRatioAnalyzer.test.js` (3), `sourceQualityAnalyzer.test.js` (4), `abnormalActivityDetector.test.js` (5), `sentimentPriceDivergenceAnalyzer.test.js` (7), `bullishBearishFactorsBuilder.test.js` (9), `confidenceModel.test.js` (6), `aiSummary.test.js` (8), `newsSentimentDataProvider.test.js` (5, including real axios-mocked network-failure and zero-article cases), `socialSentimentDataProvider.test.js` (1), `sentimentDataProvider.test.js` (2), `sentimentAgent.test.js` (5, including a forbidden-governance-key scan).

Plus **5 new** `sentimentAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 4 existing Unified Stock Intelligence test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`, `aiExecutiveSummary.test.js`) to reflect the 4-agent evidence set — all passing, zero regressions in the pre-existing, unchanged assertions.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1725 tests, 1723 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Social sentiment is permanently unavailable in this environment**, by design — this is the mission's own explicit requirement being honored, not a gap to be quietly worked around. `confidenceModel.js` applies a disclosed, fixed penalty for it every time.
2. **News sentiment classification is a disclosed keyword-lexicon heuristic, not NLP/ML/LLM sentiment analysis.** The same accepted pattern this codebase's own `socialInfluenceService.js` already uses for real post text. A word like "cut" always counts as negative even in a context like "cut costs to improve margins" — a real, disclosed limitation of keyword-based scoring.
3. **Source credibility's tier-1 allowlist is a disclosed, hand-set list of well-established outlets**, not a claim about any specific outlet's actual editorial quality — documented directly in `sourceQualityAnalyzer.js`'s own header.
4. **Sentiment trend/velocity have no persistent history** — every read is computed fresh from the real articles returned in the current lookback window (default 14 days); a longer historical baseline would require a snapshot-storage layer (out of scope for this phase, unlike `marketSentimentRepository.js`'s Prisma-backed snapshots for the market-wide engine).
5. **Abnormal-activity thresholds (z-score ≥ 2, score-shift > 30 points) and confidence weights (40/20/15/15, penalties of 10) are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
6. **NewsAPI's free-tier query is symbol-only** (no company-name resolution) — a real, disclosed limitation; a ticker with a generic/ambiguous symbol may return less relevant real articles than a full company-name search would.

## Files changed

- New: `backend/services/domainAgents/sentimentAgent/{newsSentimentDataProvider,socialSentimentDataProvider,sentimentLexicon,articleSentimentScorer,sentimentTimeSeriesBuilder,sentimentTrendAnalyzer,articleRatioAnalyzer,sourceQualityAnalyzer,abnormalActivityDetector,sentimentPriceDivergenceAnalyzer,bullishBearishFactorsBuilder,confidenceModel,aiSummary,sentimentDataProvider,sentimentAgent}.js` + matching `.test.js` files, plus `sentimentAgent.orchestratorIntegration.test.js`.
- New: `backend/services/agentOrchestrator/agents/symbolSentimentAgent.js`.
- Modified: `backend/services/agentOrchestrator/registry.js` (added `symbolSentimentAgent` to `ALL_AGENTS`).
- Modified: `backend/services/agentOrchestrator/registry.test.js` (13 → 14 named agent domains, documented).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine,aiExecutiveSummary}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended/generalized to a 4-agent evidence set).
- Unmodified: `backend/services/marketSentiment/*` (the canonical market-wide engine — untouched), `backend/services/agentOrchestrator/agents/sentimentAgent.js` (the existing market-wide adapter — untouched, still registered, still real), `services/newsService.js`, `services/intelligence/socialInfluenceService.js`, `services/providers/definitions/{redditProvider,xProvider}.js`, `conflictDetector.js`, `caseBuilder.js`, `keyDriversBuilder.js` (already generic), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
