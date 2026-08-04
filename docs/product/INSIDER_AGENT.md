# INSIDER_AGENT.md — Phase INSIDER-AGENT-001

**Mission:** build the Insider Trading Intelligence Agent — analyzing insider purchases, insider sales, net insider activity, officer vs. director activity, CEO/CFO transactions, cluster buying, cluster selling, transaction size, ownership change, and historical insider trend, producing Insider Activity (Bullish/Neutral/Bearish), Net Insider Score, Cluster Activity, Executive Activity, Ownership Trend, Transaction Significance, Confidence (0-100), Bullish Factors, Bearish Factors, Risks, and an AI Summary. Provider abstraction, reuse SEC EDGAR data, never fabricate insider transactions, honest unavailable fields, Registry/Scheduler/Observability/Orchestrator/Unified Stock Intelligence integration, no UI, comprehensive tests.

---

## Design decision: upgrade in place — and a genuinely greenfield real data integration

The `"insider"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub — its own comment disclosed that "no insider-trading (Form 4 or equivalent) provider or service exists anywhere in this codebase yet." A dedicated research pass before writing any code confirmed this: no real SEC EDGAR client, no Form 4 parser, and no Finnhub insider-transactions call exists anywhere in the backend (`services/providers/definitions/secProvider.js` is only an inert `honestStubFetch` registry entry). This phase upgrades the `"insider"` id in place — same id, same registry slot, `metadata.name` updated to `"Insider Trading Intelligence Agent"` — but the underlying engine is entirely new, real work, not a refactor of existing logic.

## Real SEC EDGAR integration — no fabrication, no new dependency

Per the mission's own "reuse SEC EDGAR data where available" requirement, this agent talks to real, public, no-auth SEC EDGAR endpoints directly:

1. **`cikResolver.js`** fetches SEC's real `company_tickers.json` (the same file EDGAR's own search UI is built on) to resolve a stock symbol to its real CIK, cached in-memory per process.
2. **`submissionsParser.js`** parses the real `data.sec.gov/submissions/CIK##########.json` response — a real, unusual columnar shape (`filings.recent` stores one parallel array per field, not an array of row objects) — filtering to real Form 4 filings.
3. **`formFourXmlParser.js`** is a minimal, targeted extractor for Form 4's stable, decades-old XML tag set — deliberately not a general-purpose XML parser (no new npm dependency added for one narrow, well-documented schema), the same "deliberately simple, transparent, disclosed extraction" discipline this codebase's keyword-lexicon sentiment scoring already uses.
4. **`insiderDataProvider.js`** orchestrates all three, fetching each real filing's XML independently (one bad filing never blocks the others) and flattening every real, parsed non-derivative transaction with its real owner/filing metadata attached.

**A real bug was found and fixed during development**: SEC's submissions feed reports `primaryDocument` as a path like `xslF345X06/form4.xml` — that subfolder is SEC's own XSLT-rendered HTML viewer for the same real document, not the raw XML. `buildFilingDocumentUrl()` was corrected (verified against a real filing's own `index.json` directory listing) to fetch the true raw XML at the accession's root instead.

A new `SEC_EDGAR_USER_AGENT` config entry was added to `config/env.js` — SEC requires every requester to send a descriptive User-Agent identifying the requesting organization and a real contact, or requests are rejected; a disclosed local/dev default is provided.

## What was built

New directory: `backend/services/domainAgents/insiderAgent/`.

| File | Responsibility |
|---|---|
| `cikResolver.js` | Real symbol → CIK resolution via SEC's own `company_tickers.json`, in-memory cached. |
| `submissionsParser.js` | Parses EDGAR's real columnar submissions JSON into real Form 4 filing rows; builds the corrected raw-XML document URL. |
| `formFourXmlParser.js` | Extracts real reporting-owner identity/relationship flags and real non-derivative transactions from a real Form 4 XML document. Derivative transactions (options, RSUs) are explicitly out of scope this phase. |
| `insiderDataProvider.js` | **The provider abstraction.** Orchestrates CIK resolution, the submissions feed, and per-filing XML fetch+parse into one flattened, real transaction list. Honestly reports unavailable when EDGAR has no CIK for the symbol or the submissions feed fails; a single bad filing degrades independently. |
| `netInsiderActivityAnalyzer.js` | **Insider Activity / Net Insider Score** — only real open-market transactions (codes `P`/`S`) feed this signal; grants/exercises/gifts are real but non-discretionary, so they're excluded from the conviction signal (a well-established real-world convention). |
| `officerDirectorAnalyzer.js` | **Officer vs Director Activity** — real counts/dollar volumes tallied per real role flag; an insider who is both is honestly counted in both buckets. |
| `executiveActivityAnalyzer.js` | **CEO/CFO transactions** — filters to real transactions whose real, filed `officerTitle` text matches a disclosed CEO/CFO pattern. |
| `clusterActivityAnalyzer.js` | **Cluster buying / Cluster selling** — real, distinct insiders (by CIK, never double-counted) transacting the same real direction within a real, disclosed time window, anchored to the data's own most recent transaction date. |
| `transactionSizeAnalyzer.js` | **Transaction Size / Transaction Significance** — real dollar value per real, priced open-market transaction, classified into disclosed tiers. |
| `ownershipTrendAnalyzer.js` | **Ownership Change / Historical insider trend** — real, filed `sharesOwnedFollowingTransaction` values per owner, comparing each owner's earliest to latest real reported figure within the window, aggregated. |
| `confidenceModel.js` | Overall **Confidence** — a disclosed, hand-set weighted formula (never a naive average): data availability, real sample size, real filings-fetched count, a real cluster-corroboration bonus, and a real filing-recency bonus. |
| `bullishBearishFactorsBuilder.js` | **Bullish Factors / Bearish Factors / Risks** — deterministic templates over every real computed field above. |
| `aiSummary.js` | **AI Summary** — deterministic, template-based, explicitly not an LLM call. |
| `insiderAgent.js` | `generateReport(symbol, { provider })` — composes everything above into the final normalized report. |

## The normalized report shape

```js
{
  symbol: "AAPL",
  generatedAt: "2026-07-29T...",
  dataAvailable: true,
  unavailableReason: null,
  insiderActivity: "BEARISH",            // BULLISH | NEUTRAL | BEARISH
  netInsiderScore: -100,                  // -100..100
  clusterActivity: { clusterBuy: false, clusterSell: true, distinctBuyers: 0, distinctSellers: 4, windowDays: 30 },
  officerDirectorActivity: { officer: {...}, director: {...}, tenPercentOwner: {...} },
  executiveActivity: { ceoTransactions: [...], cfoTransactions: [...], hasCeoActivity: true, hasCfoActivity: true },
  ownershipTrend: { trend: "DECREASING", netOwnershipChange: -131576, perOwnerChanges: [...] },
  transactionSize: { overallSignificance: "HIGH", largestTransaction: {...}, totalDollarVolume: 128251539.05 },
  bullishFactors: [],
  bearishFactors: [ "Net insider activity is bearish (score -100, $128,251,539 sold vs. $0 bought).", ... ],
  risks: [],
  confidence: { confidence: 78, components: { base: 30, sampleBonus: 25, filingsBonus: 15, clusterBonus: 0, recencyBonus: 15 } },
  aiSummary: "Insider Activity is BEARISH (net insider score -100). ...",
  inputs: { /* the full InsiderMetrics this report was built from, for auditability */ },
}
```

Confirmed live against real AAPL SEC EDGAR data during development — real CEO (Tim Cook) sales, a real CFO transaction, and a real bearish net-insider read were all correctly surfaced.

## Every mission objective — how each is handled

| Objective | Status |
|---|---|
| Insider purchases / sales | Real, `netInsiderActivityAnalyzer.js`, from real Form 4 transaction codes P/S. |
| Net insider activity | Real, `netInsiderActivityAnalyzer.js`'s Net Insider Score. |
| Officer vs Director activity | Real, `officerDirectorAnalyzer.js`, from real filed relationship flags. |
| CEO/CFO transactions | Real, `executiveActivityAnalyzer.js`, from real filed officer titles. |
| Cluster buying / selling | Real, `clusterActivityAnalyzer.js`, from real distinct-insider counts within a real time window. |
| Transaction size | Real, `transactionSizeAnalyzer.js`, from real shares × real price. |
| Ownership change | Real, `ownershipTrendAnalyzer.js`, from real filed `sharesOwnedFollowingTransaction` deltas. |
| Historical insider trend | Real, the same `ownershipTrendAnalyzer.js` output, viewed across the full real analyzed window. |

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by `insiderAgent.orchestratorIntegration.test.js`, mirroring every prior domain agent's own equivalent test suite. `realAgents.test.js` extended with 2 new smoke tests.

## Integration with the Unified Stock Intelligence extension point

Extended from 4 agents to 5:

- `agentSelector.js`: `TARGET_AGENT_IDS` extended to include `"insider"`.
- `agentDirectionMapper.js`: new `toPolarity` case (`insiderActivity` BULLISH/BEARISH direct mapping) and `extractRisksAndOpportunities` case (`bullishFactors` → opportunities; `risks` + `bearishFactors` → risks) — the same shared-vocabulary mapping `symbol-sentiment` established.
- `weightedAggregationEngine.js`: `CORROBORATION_BONUS` gained a disclosed `5: 48` entry (the unavailable-agent penalty and recommendation-confidence discount were already fully generalized to the real evidence-set size as of `SENTIMENT-AGENT-001`, so no further change was needed there).
- `aiExecutiveSummary.js` needed **no changes** — it already builds its agent-name listing and "of N agents" language dynamically from the report's own real `agentContributions`/`totalAgentCount`.
- Verified live end-to-end against AAPL: `totalAgentCount: 5`, a real conflict correctly detected and surfaced between insider (bearish) and earnings/valuation (bullish), confidence correctly capped by the conflict penalty.

## Tests

**81 new unit tests, all passing:** `cikResolver.test.js` (5), `submissionsParser.test.js` (6), `formFourXmlParser.test.js` (6), `insiderDataProvider.test.js` (6, including a real single-filing-failure graceful-degradation case), `netInsiderActivityAnalyzer.test.js` (6), `officerDirectorAnalyzer.test.js` (4), `executiveActivityAnalyzer.test.js` (4), `clusterActivityAnalyzer.test.js` (6), `transactionSizeAnalyzer.test.js` (4), `ownershipTrendAnalyzer.test.js` (5), `confidenceModel.test.js` (6), `bullishBearishFactorsBuilder.test.js` (11), `aiSummary.test.js` (8), `insiderAgent.test.js` (5, including a forbidden-governance-key scan).

Plus **5 new** `insiderAgent.orchestratorIntegration.test.js` full-stack tests, **2 new** smoke tests in `realAgents.test.js`, and updates to 4 existing Unified Stock Intelligence test files (`agentSelector.test.js`, `agentDirectionMapper.test.js`, `unifiedStockIntelligence.orchestratorIntegration.test.js`, `weightedAggregationEngine.js`'s bonus table) to reflect the 5-agent evidence set.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1815 tests, 1813 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across every prior phase this session (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase; only the two pre-existing, already-known warnings appear).

## Honest limitations, disclosed rather than hidden

1. **Derivative transactions (stock options, RSUs, other derivative securities) are out of scope this phase.** Only `<nonDerivativeTransaction>` blocks (direct common-stock transactions) are parsed — a disclosed scope-narrowing decision, documented in `formFourXmlParser.js`'s own header, mirroring `VALUATION-AGENT-001`'s own "full DCF out of scope" precedent.
2. **Joint Form 4 filings (multiple reporting owners on one filing) attribute all transactions to the first listed owner.** A real but rare edge case, disclosed directly in code comments — most Form 4 filings have exactly one reporting owner.
3. **`formFourXmlParser.js` is a targeted regex extractor for Form 4's known tag set, not a general XML parser.** This is a deliberate choice (no new npm dependency for one narrow, decades-stable schema), the same discipline this codebase's keyword-lexicon sentiment scoring already uses — documented directly in the file's own header.
4. **Cluster-activity window (30 days), minimum distinct-insider count (3), transaction-significance tiers ($100K/$1M), and confidence weights are disclosed, hand-set constants**, not derived from a backtested optimum — the same disclosed-constant discipline every domain agent this session follows.
5. **`SEC_EDGAR_USER_AGENT`'s default value is a placeholder** — a real production deployment should set this environment variable to its own organization's real contact information, per SEC's own developer requirements.
6. **Only the most recent N Form 4 filings within a disclosed lookback window (default 15 filings / 180 days) are analyzed** — a real, bounded cap to keep the number of real per-filing HTTP requests reasonable; a symbol with very sparse insider activity may show fewer real transactions than its full public history contains.

## Files changed

- New: `backend/services/domainAgents/insiderAgent/{cikResolver,submissionsParser,formFourXmlParser,insiderDataProvider,netInsiderActivityAnalyzer,officerDirectorAnalyzer,executiveActivityAnalyzer,clusterActivityAnalyzer,transactionSizeAnalyzer,ownershipTrendAnalyzer,confidenceModel,bullishBearishFactorsBuilder,aiSummary,insiderAgent}.js` + matching `.test.js` files, plus `insiderAgent.orchestratorIntegration.test.js`.
- Modified: `backend/config/env.js` (added `SEC_EDGAR_USER_AGENT`).
- Modified: `backend/services/agentOrchestrator/agents/insiderAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (2 new smoke tests).
- Modified: `backend/services/unifiedStockIntelligence/{agentSelector,agentDirectionMapper,weightedAggregationEngine}.js` and their `.test.js` files, plus `unifiedStockIntelligence.orchestratorIntegration.test.js` (extended to a 5-agent evidence set).
- Unmodified: `backend/services/providers/definitions/secProvider.js` (a separate, still-inert provider-registry stub, not reused as-is), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, `aiExecutiveSummary.js` (already generic), every other agent.
