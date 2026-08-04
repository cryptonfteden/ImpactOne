# Platform Capability Architecture — Phase PLATFORM-ARCH-001

**Status:** Architecture only. Nothing below is implemented. Every existing file/field referenced was verified directly in the real codebase (not assumed) to ground the design in what genuinely exists today.

---

## 1. Held Position Resolution

### The problem this closes

Confirmed, live, reproducible evidence from the immediately preceding Portfolio Workspace review: the screen filtered recommendations on `rec.heldPosition`, a field that **does not exist** on the real `GET /api/v2/recommendations` response. The real backend represents "is this held" via `Recommendation.portfolioContext` (non-null, populated when held: `{sector, quantity, weightPct, marketValue, unrealizedPnlPct}`) and `Recommendation.explanation.affectedPositions` (populated array when held). Three different real screens (Portfolio Workspace, Decision Center's `portfolioImpact`, `StockSidePanel.jsx`'s `portfolioPosition` lookup) each independently re-derive this same concept today, with at least one confirmed broken. This is exactly the kind of concept a platform-level service exists to prevent from being reinvented per screen.

### Ownership of the logic

One new backend module, `heldPositionResolver` (service-layer, not a controller) — the single place in the entire codebase permitted to answer "does the user hold this symbol, and how." Every current re-implementation (Portfolio Workspace's broken filter, Decision Center's `portfolioImpact` boolean, Side Panel's `portfolioPosition` find) is retired in favor of calling this one resolver. It owns:
- Reading the real portfolio contract (`portfolioEngineService.getPortfolioSummary()` → `positions[]`).
- Reconciling a symbol (or a batch of symbols) against those real positions.
- Producing one canonical, versioned output shape every consumer can rely on without re-deriving anything.

It does **not** own scoring, recommendation generation, or UI decisions — it answers exactly one question, precisely, for every caller.

### Input contract

```
resolveHeldPositions({
  betaUserId?: string,        // omitted = the current global/default portfolio, matching
                               // portfolioEngineService's existing behavior
  symbols: string[],          // the symbols to resolve; batched, never one-at-a-time in a loop
}) -> Promise<HeldPositionMap>
```

A single-symbol convenience wrapper (`resolveHeldPosition(symbol, { betaUserId })`) is a thin pass-through to the batch form — there is exactly one real implementation underneath both.

### Output contract

```
HeldPositionMap = {
  generatedAt: string (ISO timestamp),
  portfolioTotalValue: number,           // real totalValue at resolution time, so weight% is always
                                          // computed against the same snapshot it's reported with
  resolved: {
    [symbol]: {
      held: boolean,
      quantity: number | null,           // null when held: false — never 0 standing in for "not held"
      marketValue: number | null,
      weightPct: number | null,          // real marketValue / real portfolioTotalValue — null-safe,
                                          // never divides by a zero/missing total
      unrealizedPnlPct: number | null,
      sector: string | null,
    }
  },
}
```

This is a strict superset of what `Recommendation.portfolioContext` already carries, so `autonomousRecommendationEngine.js` can (in a future phase, not this one) be refactored to populate `portfolioContext` **from** this resolver's output rather than computing its own `heldPosition` lookup independently — the same single source of truth on both the write side (recommendation generation) and the read side (every screen).

### Caching

- **Request-scoped, not time-based.** A single resolution call already batches every symbol a screen needs in one pass against one real portfolio snapshot — the risk this prevents is not "too many calls" but "two different answers about the same portfolio state within one screen render" (e.g., a KPI tile and a list disagreeing about whether AVGO is held because they were each computed at a slightly different instant). No TTL cache is proposed; the underlying `portfolioEngineService.getPortfolioSummary()` call itself is the expensive part and is already a single real DB read per request.
- **Explicitly not cached across requests.** Portfolio positions can change (a real order fills) between one screen load and the next; a stale held-position answer is a worse failure mode than one extra DB read per page load. This mirrors this codebase's existing precedent of *not* adding a cache to `portfolioEngineService` itself.

### Failure behavior

- If `portfolioEngineService.getPortfolioSummary()` fails, `resolveHeldPositions` returns an explicit failure shape (`{ available: false, reason }`), **never** a map where every symbol is silently `held: false` — a resolver failure must never be indistinguishable from "genuinely not held," since that is exactly the shape of bug this service exists to prevent (an always-empty result that looks like a correct empty result).
- Callers (screens) are contractually required to branch on `available` before reading `resolved` — the same discipline `symbolIntelligenceService.settleField()` already applies per-field, generalized here to the resolver's own top-level availability.

### Test strategy

- **Pure-logic tests** (no DB): given a fixed set of real-shaped positions, correct `weightPct`/`held`/`quantity` resolution for held, not-held, and zero-total-value inputs.
- **Contract test** (see `CONTRACT_TESTING_STANDARD.md`): a schema-validated fixture asserts the resolver's input assumption (`portfolioEngineService.getPortfolioSummary()`'s real shape) never silently drifts without this test failing first — this is the exact test category that would have caught the Portfolio Workspace bug, generalized to protect the new shared resolver itself.
- **Consumer tests**: each of the three real consumers (Portfolio Workspace, Decision Center, Side Panel) gets a test asserting it calls the shared resolver and renders its `held`/`weightPct` fields — not a re-implementation of held-position logic inside the consumer's own test fixture (the root cause of the original bug).

---

## 2. Capability Registry

### Purpose

One place that answers, for any of the platform's intelligence capabilities: is this real today, how real, and where can it be used. This directly prevents the two things this audit's own history has repeatedly found — a screen presenting fixture/fallback data as if live, and a capability being invisible to product/design decisions because its real status lives only in scattered code comments.

### Schema (per capability)

```
Capability = {
  capabilityId: string,               // stable, e.g. "options-unusual-activity"
  label: string,
  availability: "not_started" | "foundation" | "partial" | "live",
  providerStatus: {
    configured: boolean,
    providerId: string | null,        // maps to the real providerRegistry.js entry, when one exists
    vendorRequired: string | null,    // honest description of what real vendor/license is needed
  },
  freshness: {
    lastRealDataAt: string | null,    // null when never real, not "never" as a guess
    cadence: string | null,           // e.g. "15-minute poll", "daily", "on-demand" — honest, not aspirational
  },
  provenance: "live" | "fixture" | "fallback" | "none",   // the single most important field — see below
  confidence: {
    hasRealConfidenceModel: boolean,
    scoreDefinitionKey: string | null,  // the scoringVocabulary.js entry name, when one exists
  },
  supportedMarkets: string[],          // e.g. ["US-equities"] — never implies breadth that doesn't exist
  supportedSymbols: "all" | "tracked-universe" | string[],
  featureFlag: string | null,          // the real FeatureFlag.key gating this, when applicable
  consumerSurfaces: string[],          // real screen/component names currently reading this capability
}
```

`provenance` is the field this registry exists to make impossible to fudge: a capability whose real code path returns fixture data (the Committee's own evidence-matrix comments already say this out loud for several inputs) must self-report `"fixture"`, not `"live"` — this is a structural honesty gate, not a documentation nicety, directly modeled on this codebase's own existing `source: "fallback"` tagging convention (`altDataService.js`) generalized to every capability, not just alt-data.

### The 8 named capabilities, current real status (verified directly in code, not assumed)

| Capability | Availability | Provenance | Evidence |
|---|---|---|---|
| **Options (unusual activity)** | `foundation` | `none` (no vendor connected) | `optionsFlowProvider.js` registered, `isConfigured()` reads a real env var, currently `false`; `optionsAgentService.js` is real and tested (59 backend tests) but has no HTTP route, no scheduler, no frontend — unreachable by any user today. |
| **Market Sentiment** | `partial` | `fixture` | The Committee's own evidence-matrix output literally discloses: *"SENTIMENT: this reflects fixture data, not a live CoinGlass feed."* Registered provider (`coinglassProvider`) exists; not connected. |
| **Earnings** | `partial` | `live` (rate-limited) | `earningsProvider.js` is a real, registered ingestion provider; `altDataService.getEconomicEvents()` also makes a real call to a third-party earnings calendar endpoint — but with a public `apikey: "demo"` parameter (a demo/limited credential, not a licensed one). Real, but thin. |
| **Short Interest** | `not_started` | `none` | `alertTypeRegistry.js`'s own entry states outright: *"no real data source... cannot be implemented honestly until one is configured."* |
| **Ownership / institutional** | `foundation` | `none` | The Committee's evidence-matrix discloses: *"INSTITUTIONS: SEC/SPDR institutional adapters are UNCONFIGURED this sprint."* `spdrProvider`/`tipranksProvider`/`zacksProvider`/`finvizProvider` are registered but stubbed (Sprint 37). SEC *filing* data (`altDataService.getSecData()`) is real, but filings are not ownership/13F data. |
| **Fibonacci** | `not_started` | `none` | `overlayRegistry.js`'s own entry: `implemented: false, pendingApproval: true` — explicitly excluded pending approval, by design, not by gap. |
| **Macro** | `live` | `live` (with honest fallback) | `altDataService.getMacroData()` makes real FRED API calls (`fetchFredSeries`) for rates/CPI/unemployment/M2/10-year yield, with a clearly-labeled `source: "fallback"` static snapshot only on real fetch failure. The most genuinely real capability on this list. |
| **Correlation (cross-asset)** | `not_started` | `none` | Repo-wide search found zero matches for any market/statistical correlation engine anywhere in the backend — not even a registered stub. The only "correlation" concept in the codebase is unrelated request-tracing (`correlationId` on error reports). |

### Consumer contract

Every screen or engine that wants to display or reason over a capability queries the registry first (`getCapability(capabilityId)`), and is required to branch its rendering on `provenance` — a `fixture` or `none` capability must render its own honest disclosure (matching the existing `EmptyState`/"not connected" conventions already used across Mission Control, Portfolio Workspace, and the Options Agent's own designed API contract), never the same visual treatment as a `live` one.

---

## 4. Attention Arbitration

### The problem this closes

Mission Control, Intelligence Workspace, Portfolio Workspace, and Decision Center each independently compute their own answer to "what deserves the user's attention right now" from overlapping underlying data. This is both a duplication problem (§4 of the Product Architecture Audit) and a correctness risk — four independently-tuned heuristics can silently disagree about what's important without anyone noticing.

### Design

One new platform service, `attentionArbitrationService`, owning exactly one function:

```
rankAttentionItems({ betaUserId, symbols? }) -> Promise<AttentionRanking>
```

It does not fetch its own raw data — it composes real, already-computed signals from the services that already own them (never re-deriving a number a canonical service already produces):

| Input category | Real source consumed |
|---|---|
| Holdings | `heldPositionResolver` (§1) + `Position`-derived P&L |
| Watchlist | `WatchlistFolderItem` via `watchlistFolderRepository` |
| News | `CanonicalEvent` / `findMatchedEvents` (existing) |
| Options anomalies | `optionsAgentService.listSignals()` (Options Agent Foundation, once reachable) |
| Earnings | `earningsProvider.js`'s ingested calendar events |
| Risk | `Recommendation.riskScore`/`riskLabel` (existing) |
| Sentiment changes | the Capability Registry's Market Sentiment entry — honestly excluded from ranking while its `provenance` is `fixture`, not silently included as if real |
| Macro events | `altDataService.getMacroData()`'s real regime + economic-calendar events |

### Ranking contract

```
AttentionRanking = {
  generatedAt: string,
  items: [{
    itemId: string,
    category: "holding" | "watchlist" | "news" | "options" | "earnings" | "risk" | "sentiment" | "macro",
    symbol: string | null,
    score: number (0-100),           // composite, see below
    scoreBreakdown: { [factor]: number },  // always included — never a single opaque number,
                                            // matching scoringVocabulary.js's own documentation discipline
    reason: string,                  // a real, per-item sentence (never a shared template — same
                                      // discipline as the Options Agent's explanation generator)
    provenance: "live" | "fixture" | "fallback",  // inherited from the Capability Registry entry
                                                   // that produced this item, so a fixture-backed
                                                   // item can never silently outrank a live one
                                                   // without the consumer knowing why
  }],
  excludedCategories: [{ category, reason }],  // e.g. sentiment excluded while its provenance is fixture
}
```

### Composite scoring principle

`score` is a documented, weighted combination of: **portfolio materiality** (is this a held/large position — sourced from `heldPositionResolver`), **urgency** (existing `importanceScore`/`riskScore` style fields), and **provenance trust** (a `live` signal is never outranked by a `fixture` signal of the same nominal urgency — provenance is a multiplicative trust factor, not just a disclosure label). This composite is proposed as a new, documented entry in `scoringVocabulary.js` (e.g. `attentionScore`), not a parallel scoring system — the same discipline this codebase already applies to every other cross-cutting score.

### Consumer contract

Mission Control, Intelligence Workspace, Portfolio Workspace, and Decision Center each become **consumers**, not independent producers, of one ranked list — each screen may filter the same ranking to its own scope (Portfolio Workspace shows only `holding`/`risk` categories; Intelligence Workspace shows `news`/`macro`/`sentiment`; Decision Center shows the union) but none of them re-derives what "deserves attention" means. This is the direct structural fix for the workspace-duplication finding in the Product Architecture Audit.
