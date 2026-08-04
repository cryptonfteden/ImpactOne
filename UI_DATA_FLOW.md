# UI Data Flow — Phase UI-INTEGRATION-001

Each flow below: Screen → api service → HTTP route → controller → consumer
service → repository. Nothing is computed outside the consumer service layer.

## Mission Control

```
MissionControlHomeScreen
  useEffect → claimsApi.listActive({limit}) ──► GET /v2/claims/active
            → claimsApi.listRecentlyInvalidated ──► GET /v2/claims/invalidated
  claimConsumerService.getActiveClaims / getRecentlyInvalidatedClaims
  claimRepository.listActive / listInvalidated → Prisma → Postgres

Derived (presentation-only, in-component):
  topActiveClaims        = claims, unsorted slice
  highestConfidenceClaims = claims sorted by confidence desc
  gainingConfidenceClaims = claims where status === STRENGTHENING
  losingConfidenceClaims  = claims where status === WEAKENING
  recentlyInvalidatedClaims = invalidatedClaims, as fetched
  topMarketRisks          = claims where expectedDirection === BEARISH, by confidence
  topOpportunities        = claims where expectedDirection === BULLISH, by confidence
```

## Daily Feed (News)

```
MarketNewsScreen
  useEffect → intelligenceApi.liveFeed(...)         (existing, unchanged)
            → claimsApi.listActive({limit:200})  ──► GET /v2/claims/active
            → claimsApi.listRecentlyInvalidated  ──► GET /v2/claims/invalidated
  merged into `activeClaims`, passed as a prop to every FeedItemCard

FeedItemCard.computeChangedClaimsText(item, activeClaims):
  overlap = activeClaims.filter(claim → claim.symbols ∩ item.affectedAssets ≠ ∅)
  for each overlapping claim:
    if status is a real recent transition (DRAFT/STRENGTHENING/WEAKENING/INVALIDATED)
       within 48h of item.publishedAt → "This news {verb} a Claim: '...'"
    else → "This news relates to an active Claim: '...' (same symbol, no
            confirmed recent transition)"
  no overlap → "No active Claims affected."
```

## Portfolio Workspace

```
PortfolioWorkspaceScreen
  useEffect → claimsApi.listPortfolioRelevant() ──► GET /v2/claims/portfolio-relevant
  claimConsumerService.getPortfolioRelevantClaims
    → claimRepository.listActive, filtered to symbols held in the real portfolio

Derived (presentation-only):
  sortedPortfolioClaims = sort by portfolioImpact.magnitude desc,
                          then confidence desc, then days-to-expiry asc

Per-claim render: direction/confidence/status badges, plainLanguageStatement,
supporting evidence (claim.evidence), counter evidence (claim.counterEvidence).
```

## Watchlist

```
WatchlistScreen
  existing useEffect → watchlistApi.getIntelligence(watchlist)   (unchanged)
  new useEffect, per symbol independently:
    claimsApi.listBySymbol(symbol, {limit:20}) ──► GET /v2/claims/symbols/:symbol
    optionsAgentApi.getSymbolView(symbol)      ──► GET /v2/options-agent/symbols/:symbol
  reasons[] built from real claim.status values (DRAFT/STRENGTHENING/WEAKENING)
  and optionsView.activeSignalCount > 0 → "Unusual options activity"
  no reasons → "Nothing new today."
```

## Symbol Page (StockSidePanel)

```
StockSidePanel
  Promise.allSettled([
    marketApi.getQuote, portfolioEngineApi.getSummary, symbolIntelligenceApi.get,
    priceAlertsApi.list, watchlistFoldersApi.list,
    claimsApi.listBySymbol(symbol, {limit:50})     ──► GET /v2/claims/symbols/:symbol
    optionsAgentApi.getSymbolView(symbol)          ──► GET /v2/options-agent/symbols/:symbol
    marketSentimentApi.getOverview("US")           ──► GET /v2/market-sentiment/overview
  ])

Derived (presentation-only):
  activeClaims        = claims where status is open (DRAFT/ACTIVE/STRENGTHENING/WEAKENING/CONTESTED)
  resolvedClaims       = claims where status starts with RESOLVED_ or is INSUFFICIENT_DATA
  currentBelief        = activeClaims sorted by confidence desc, first
  historicalTimeline   = all claims sorted by lastUpdatedAt desc

Sections rendered directly from these: Current Platform View, Active Claims,
Supporting/Counter Evidence (from currentBelief.evidence/counterEvidence),
Market Sentiment (disclosed as market-wide, not symbol-specific), Options
Signals, Portfolio Relevance, Historical Claim Timeline, Resolved Claims,
Scenario Preview (honest "not yet available").
```

## AI Analysis

```
AiAnalysisScreen
  existing Promise.allSettled(...) extended with:
    claimsApi.listBySymbol(normalizedTicker, {limit:50}) ──► GET /v2/claims/symbols/:symbol

Derived (presentation-only):
  openClaims        = claims where status is open
  currentBeliefClaim = openClaims sorted by confidence desc, first

New "Claims-Based Analysis" section renders directly from currentBeliefClaim:
  Summary/Current belief/Why  ← plainLanguageStatement, statement, status
  Evidence / Counter evidence ← claim.evidence / claim.counterEvidence
  Probability / Confidence    ← claim.probability / claim.confidence
  Portfolio impact            ← claim.portfolioImpact (or honest "not yet computed")
  Possible scenarios          ← honest "Scenario Engine is architecture-only today"
  What would invalidate this view ← claim.invalidationConditions
```
