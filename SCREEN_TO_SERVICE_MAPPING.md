# Screen → Service Mapping — Phase UI-INTEGRATION-001

| Screen | File | api/* module(s) | HTTP route(s) | Backend consumer service |
|---|---|---|---|---|
| Mission Control | `frontend/src/screens/MissionControlHomeScreen.jsx` | `claimsApi` | `GET /v2/claims/active`, `GET /v2/claims/invalidated` | `claimIntelligence/claimConsumerService.js` (`getActiveClaims`, `getRecentlyInvalidatedClaims`) |
| Daily Feed (News) | `frontend/src/screens/MarketNewsScreen.jsx` + `frontend/src/components/feed/FeedItemCard.jsx` | `intelligenceApi` (unchanged), `claimsApi` | `GET /v2/claims/active`, `GET /v2/claims/invalidated` | `claimIntelligence/claimConsumerService.js` |
| Portfolio Workspace | `frontend/src/screens/PortfolioWorkspaceScreen.jsx` | `claimsApi` | `GET /v2/claims/portfolio-relevant` | `claimIntelligence/claimConsumerService.js` (`getPortfolioRelevantClaims`) |
| Watchlist | `frontend/src/screens/WatchlistScreen.jsx` | `watchlistApi` (unchanged), `claimsApi`, `optionsAgentApi` | `GET /v2/claims/symbols/:symbol`, `GET /v2/options-agent/symbols/:symbol` | `claimIntelligence/claimConsumerService.js`, `optionsAgentService.js` |
| Symbol Page | `frontend/src/components/StockSidePanel.jsx` | (existing 5 apis) + `claimsApi`, `optionsAgentApi`, `marketSentimentApi` | `GET /v2/claims/symbols/:symbol`, `GET /v2/options-agent/symbols/:symbol`, `GET /v2/market-sentiment/overview` | `claimIntelligence/claimConsumerService.js`, `optionsAgentService.js`, `marketSentimentService.js` |
| AI Analysis | `frontend/src/screens/AiAnalysisScreen.jsx` | (existing apis) + `claimsApi` | `GET /v2/claims/symbols/:symbol` | `claimIntelligence/claimConsumerService.js` |

## New frontend api modules

| File | Functions | Backing route |
|---|---|---|
| `frontend/src/services/api/claimsApi.js` | `listActive`, `listBySymbol`, `listPortfolioRelevant`, `listContested`, `listRecentlyInvalidated`, `listRecentlyResolved`, `getHistory`, `getStrongestEvidence` | `backend/routes/claimsRoutes.js` |
| `frontend/src/services/api/optionsAgentApi.js` | `getStatus`, `getSymbolView` | `backend/routes/optionsAgentRoutes.js` |
| `frontend/src/services/api/marketSentimentApi.js` | `getOverview` | `backend/routes/marketSentimentRoutes.js` |

## New backend routes/controllers

| Route file | Controller | Verb + path | Consumer service function |
|---|---|---|---|
| `claimsRoutes.js` | `claimsController.js` | `GET /active` | `getActiveClaims` |
| | | `GET /contested` | `getContestedClaims` |
| | | `GET /invalidated` | `getRecentlyInvalidatedClaims` (new) |
| | | `GET /resolved` | `getRecentlyResolvedClaims` |
| | | `GET /portfolio-relevant` | `getPortfolioRelevantClaims` |
| | | `GET /symbols/:symbol` | `getClaimsBySymbol` |
| | | `GET /:claimId/history` | `getClaimHistory` |
| | | `GET /:claimId/strongest-evidence` | `getStrongestEvidence` |
| `optionsAgentRoutes.js` | `optionsAgentController.js` | `GET /status` | `getStatus` |
| | | `GET /signals` | `listSignals` |
| | | `GET /signals/:signalId` | `getSignalById` |
| | | `GET /symbols/:symbol` | `getSymbolView` |
| `marketSentimentRoutes.js` | `marketSentimentController.js` | `GET /overview` | `getOverview` |

All three route files are mounted in `backend/routes/index.js` under `/v2/claims`,
`/v2/options-agent`, and `/v2/market-sentiment` respectively.

## One additive backend change (not route/controller layer)

`claimIntelligence/claimRepository.js` gained `listInvalidated({limit}={})`
(mirrors the existing `listContested`), and
`claimIntelligence/claimConsumerService.js` gained
`getRecentlyInvalidatedClaims({limit}={})` on top of it — the only new read
path added this phase, because no existing function covered Mission Control's
"Recently invalidated Claims" requirement.
