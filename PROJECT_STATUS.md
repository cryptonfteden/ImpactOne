# ImpactOne - Project Status

Last updated: 2026-07-10 (Sprint 10)

## 1. What Is Already Completed
- Full React + Express app is running with screen-based dashboard UX and `/api` backend routing.
- AI Analysis workflow is live for US tickers and now includes:
  - Live quote snapshot
  - Company profile
  - Recommendation + recommendation trend summary
  - Recent company news
  - 30-day chart
  - AI report with rating, confidence, and What changed today section
  - Ticker comparison against two peers
- Market Impact Engine is live and now includes:
  - Market Impact Score (0-100)
  - Why is this stock moving today?
  - Sector impact summary
  - Market opportunities / related companies
- AI report quality was upgraded:
  - Uses quote, profile, recommendation, recommendation trend, news, and metrics context
  - Enforces decision-oriented rating scale: Strong Buy / Buy / Hold / Sell
  - Returns bounded confidence score (0-100)
- Watchlist intelligence is live:
  - Saved favorites are evaluated with latest price, daily change, AI rating, AI score, and alert badge (Risk/Opportunity/Monitor)
- Sprint 4 productization pass is now live:
  - Shared watchlist state is centralized via `frontend/src/hooks/useWatchlist.js`
  - Watchlist add/remove now persists in localStorage and syncs across screens
  - Sidebar watchlist tickers can be clicked to jump directly into AI Analysis for that symbol
  - Dashboard KPI cards are now driven by user watchlist intelligence:
    - Tracked tickers count
    - Strongest opportunity
    - Highest risk
    - Latest analyzed ticker + timestamp
  - AI Analysis now shows report "Last updated" timestamp and clearer provider/partial-data notices
- Sprint 7 alternative data intelligence layer is now live:
  - Added normalized multi-source alternative intelligence endpoints:
    - `/api/alt-data/cot`
    - `/api/alt-data/polymarket`
    - `/api/alt-data/macro`
    - `/api/alt-data/sec`
    - `/api/alt-data/congress`
    - `/api/alt-data/events`
    - `/api/alt-data/summary?symbol=...`
  - AI Analysis now includes a dedicated "Alternative Data Signals" section.
  - AI analysis endpoint now enriches report payload with `analysis.alternativeDataSignals`.
  - Added provider placeholders for options flow and crypto on-chain (`not_connected`) without paid API dependency.
  - Added source-level caching and graceful fallbacks for all alternative-data services.
- Sprint 8 Impact Intelligence Engine is now live:
  - Added intelligence endpoints:
    - `/api/intelligence/analyze`
    - `/api/intelligence/scenario`
    - `/api/intelligence/impact`
    - `/api/intelligence/history`
    - `/api/intelligence/portfolio`
  - Added modular backend intelligence services for:
    - Relationship graph modeling
    - Historical analog matching
    - Scenario generation (bull/base/bear)
    - Sector propagation mapping
    - Alternative + market fusion confidence scoring
    - Portfolio exposure intelligence
    - Explainability output (`why`, evidence, sources, confidence, risks)
  - Dashboard now includes Sprint 8 intelligence widgets:
    - Global Risk Monitor
    - Market Regime
    - Sector Rotation
    - Capital Flow
    - AI Conviction Meter
    - Top Macro Risks
    - Top Opportunities
    - Global Heatmap
  - AI Analysis now includes an "Impact Intelligence Engine" section with event-driven explainability, historical analogs, and scenario output.
- Sprint 9 Autonomous Daily Intelligence Brief is now live:
  - Added autonomous brief endpoint:
    - `/api/intelligence/daily-brief`
  - Dashboard now auto-loads "Today's Intelligence Brief" with no user input.
  - Daily brief includes:
    - Overnight market changes
    - Top market-moving events
    - Impacted sectors and impacted tickers
    - Portfolio/watchlist exposure
    - Top risks and top opportunities
    - What changed since yesterday
    - What to monitor today
  - Added personal relevance engine outputs per item:
    - importance score (0-100)
    - urgency (low/medium/high)
    - impact type (risk/opportunity/neutral)
    - related tickers/sectors
    - time horizon and explanation
  - Added autonomous action cards:
    - Needs attention
    - Opportunity detected
    - Risk increasing
    - Macro event today
    - Watchlist movement
    - Ignore for now
  - Added session data model support for:
    - morning brief
    - market close recap
    - weekly summary
  - Added OpenAI-generated concise professional summary with fallback notice and rule-based continuity.
- Sprint 10 Autonomous Market Operating System is now live:
  - Added a reusable event pipeline that processes events through:
    - Event detection
    - Event classification
    - Importance scoring
    - Market impact prediction
    - Portfolio impact prediction
    - Historical comparison
    - AI explanation
    - Dashboard delivery
  - Added live operating-system endpoints:
    - `/api/intelligence/overview`
    - `/api/intelligence/live-feed`
    - `/api/intelligence/changes`
    - `/api/intelligence/watchlist-priority`
    - `/api/intelligence/global-map`
    - `/api/intelligence/decision-center`
  - Added a continuously updating dashboard intelligence feed with:
    - headline
    - why it matters
    - affected assets
    - confidence
    - actionability
    - supporting data
    - historical analogue
    - risk level
  - Added meaningful change windows:
    - last 15 minutes
    - last hour
    - since market open
    - overnight
    - weekly
  - Added thresholded intelligent alerts that suppress low-confidence or low-exposure noise.
  - Added dynamic watchlist priority scores:
    - opportunity score
    - risk score
    - momentum
    - institutional activity
    - prediction market signal
    - macro exposure
    - event exposure
    - overall AI score
  - Added a new lazy-loaded Global Intelligence page with world event map, capital flows, macro regime, sentiment, and explainability context.
  - Added AI Decision Center outputs to the dashboard:
    - Today’s Highest Conviction Ideas
    - Today’s Biggest Risks
    - Most Important Macro Event
    - Most Important Company Event
    - Sector Rotation
    - Capital Flow
    - Most Important News Ignored By Markets
- Provider-resilient error handling is in place:
  - Finnhub failures return user-friendly messages
  - OpenAI failures expose user-friendly notice and fallback report instead of crashing UI
- Startup automation implemented at root:
  - `npm run start:all` launches backend + frontend together (5000 + 5174)

## 2. Current Architecture

### Frontend
- Stack: React + Vite
- Entry point: `frontend/src/main.jsx`
- App shell: `frontend/src/layout/MainLayout.jsx`, `frontend/src/layout/Sidebar.jsx`
- Primary screens:
  - `frontend/src/screens/AiAnalysisScreen.jsx`
  - `frontend/src/screens/WatchlistScreen.jsx`
- Supporting widget:
  - `frontend/src/components/WatchlistTable.jsx`
- Data flow:
  1. User searches ticker
  2. Frontend calls `GET /api/quote?symbol=...`
  3. Frontend sends context to `POST /api/ai/analyze`
  4. Frontend calls `GET /api/compare?symbol=...`
  5. Watchlist calls `GET /api/watchlist?symbols=...`

### Backend
- Stack: Express + Axios
- Entry point: `backend/server.js`
- Router: `backend/routes/index.js`
- Controllers:
  - `quoteController`, `aiController`, `comparisonController`, `watchlistController`, `intelligenceController`
- Services:
  - `marketImpactService` (event-driven score, sector impact, movement rationale, opportunities)
  - `finnhubService` (quote/profile/recommendation/recommendation trend/news/chart/peers)
  - `openaiService` (structured AI analysis + cache + fallback)
  - `comparisonService` (base ticker + peer comparison with AI score)
  - `finnhubCache` (quote cache)
  - `impactIntelligenceService` (Sprint 8 orchestration for intelligence outputs)
  - `relationshipGraphService`, `historicalSimilarityService`, `scenarioEngineService`
  - `propagationEngineService`, `portfolioIntelligenceService`, `alternativeFusionService`
  - `intelligenceCache` (TTL cache for intelligence computations)
  - `dailyBriefService` (Sprint 9 autonomous brief orchestration, relevance scoring, action cards, AI/fallback summary)
  - `autonomousMarketService` (Sprint 10 cached operating-system overview, event pipeline, live feed, alerts, watchlist ranking, global map, decision center)

## 3. Folder Structure

```text
ImpactOne/
  backend/
    config/env.js
    controllers/
      aiController.js
      comparisonController.js
      quoteController.js
      watchlistController.js
      marketController.js
      newsController.js
      portfolioController.js
    middleware/errorHandler.js
    routes/index.js
    services/
      comparisonService.js
      finnhubCache.js
      finnhubService.js
      openaiService.js
      openaiService.test.js
      alphaVantageService.js
      newsService.js
      polygonService.js
    .env.example
    server.js
  frontend/
    src/
      components/
      layout/
      screens/
      main.jsx
      styles.css
    .env.example
    package.json
  docs/
    architecture.md
    PROJECT_STATUS.md
  PROJECT_STATUS.md
  package.json
  README.md
```

## 4. APIs In Use
- Finnhub
  - Quote, profile, recommendation series, metrics, company news, peer tickers
- Yahoo Finance chart endpoint
  - Historical close series used for chart rendering
- Alternative.me Fear & Greed
  - Market sentiment signal
- OpenAI Chat Completions
  - Structured investment report generation
- Backend market impact engine
  - Derived score from news sentiment, analyst trend, price momentum, fear & greed, and volatility
- Backend impact intelligence engine (Sprint 8)
  - Event-driven global relationship graphing
  - Historical analog detection and ranking
  - Probabilistic scenario generation
  - Sector propagation and portfolio exposure insights
- CFTC public reporting dataset (COT)
  - Institutional/speculator positioning and net/weekly signal normalization
- Polymarket gamma API
  - Prediction probabilities, volume/liquidity, trend, related sectors/tickers
- FRED public CSV feeds
  - FEDFUNDS, CPIAUCSL, UNRATE, M2SL, DGS10 with macro regime normalization
- SEC EDGAR submissions API
  - Latest 10-K/10-Q/8-K/Form 4 filings and AI/fallback filing signal summary
- House Stock Watcher dataset
  - Congressional trade normalization and ticker/sector matching signal
- Financial Modeling Prep demo calendar feeds
  - Economic + earnings calendar ingestion with fallback events

## 5. Environment Variables

### Required
- `FINNHUB_API_KEY`
- `VITE_API_BASE_URL` (frontend, usually `http://localhost:5000/api`)

### Optional but strongly recommended
- `OPENAI_API_KEY`

### Additional placeholders (supported in env config)
- `PORT`
- `NODE_ENV`
- `POLYGON_API_KEY`
- `NEWS_API_KEY`
- `ALPHA_VANTAGE_API_KEY`

Sprint 7 notes:
- No secrets are hardcoded for alternative data integrations.
- Options flow and on-chain integrations are scaffolded placeholders and do not require paid provider keys.

Backend env loading is handled by `backend/config/env.js` and reads from root/frontend/backend env files (`.env` and `.env.local`).

## 6. How To Start The Project

From repository root:

### One-command startup
```bash
npm run start:all
```

Expected ports:
- Frontend: `http://127.0.0.1:5174`
- Backend: `http://localhost:5000`

### Manual mode (two terminals)
```bash
npm run server
```
```bash
npm run client:5174
```

### Verification commands
```bash
curl http://localhost:5000/health
curl "http://localhost:5000/api/quote?symbol=AAPL"
curl "http://localhost:5000/api/ai/analyze?symbol=AAPL"
curl "http://localhost:5000/api/compare?symbol=AAPL"
curl "http://localhost:5000/api/watchlist?symbols=AAPL,PLTR,NVDA"
```

## 7. Remaining Roadmap
- Persist watchlist/favorites server-side (database-backed user profiles).
- Add auth and per-user sessions.
- Add CI pipeline with lint/test/build gates.
- Add API schema validation and typed contracts.
- Add observability primitives (request IDs, structured logging, endpoint timings).
- Add AI prompt/versioning controls and report history.
- Expand market impact logic with sector-specific catalyst patterns and event history.

## 8. Watchlist Behavior (Productized)
- Storage model:
  - Canonical key: `impactone-watchlist`
  - Backward-compatible mirror key: `impactone-favorites`
- Cross-screen sync:
  - Uses browser `storage` event for cross-tab updates
  - Uses custom event `impactone:watchlist-updated` for in-tab sync
- User actions:
  - Add ticker from Watchlist screen input
  - Remove ticker from Watchlist screen table/cards
  - Toggle ticker from AI Analysis
  - Click ticker in Sidebar or Watchlist screen to route context into AI Analysis
- Intelligence data:
  - Watchlist and Dashboard both call `/api/watchlist?symbols=...` using saved user symbols.

## 9. Known Issues
- OpenAI may fail due to quota/credentials. App now falls back safely but premium generation quality depends on valid quota.
- Some providers return sparse payloads for less-covered tickers, which can reduce report richness.
- Port 5000 collisions can still occur on local machines if stale node processes are running.
- Development logs are verbose by design for debugging and can be reduced in production hardening.
- Watchlist persistence is browser-local only (no server account sync yet).
- "Highest risk" currently uses lowest AI score heuristic; it is not yet event-factor weighted.

## 10. Sprint 4 Status

Sprint 4 execution status: delivered market impact engine plus productization for daily usability.

Sprint 4 outcomes:
- Market Impact Score now summarizes the event signal for each ticker.
- AI Analysis now includes a "Why is this stock moving today?" explanation.
- Sector impact and market opportunity cards are available for the selected ticker.
- AI loading state now shows an explicit analysis animation.
- Watchlist UX now supports direct add/remove and cross-screen persistence.
- Dashboard now reflects user watchlist intelligence instead of static KPI placeholders.
- AI report UX now surfaces timestamp and clearer provider state messaging.

## 11. Next Sprint Recommendations
- Add integration tests for quote/analyze/compare/watchlist endpoints.
- Add frontend E2E smoke tests for AAPL and NVDA watchlist + AI flow.
- Move watchlist persistence to backend user profiles.
- Add AI report history and per-symbol timeline.
- Add production-safe logging levels and request tracing.

## 12. Sprint 7 - Alternative Data Intelligence

Sprint 7 outcomes:
- Added alternative data backend service layer with caching + fallback:
  - `backend/services/altDataService.js`
  - `backend/services/altDataCache.js`
- Added dedicated controller and routes:
  - `backend/controllers/altDataController.js`
  - `backend/routes/index.js` (`/api/alt-data/*`)
- Added frontend API module:
  - `frontend/src/services/api/altDataApi.js`
- Dashboard now includes alternative-data widgets:
  - Smart Money Positioning
  - Prediction Market Signals
  - Macro Regime
  - Upcoming Events
  - Political/Regulatory Watch
- AI Analysis now includes "Alternative Data Signals":
  - Smart money positioning
  - Prediction market probabilities
  - Macro regime
  - SEC filing signal
  - Political trading signal
  - Options/on-chain status
  - Upcoming event risk
  - Impacted sectors
  - Related tickers
  - Confidence score

Verification set used for Sprint 7:
- Symbols: `AAPL`, `NVDA`, `TSLA`, `BTC`, `XOM` (oil/energy proxy)
- Confirmed endpoint-level responses for all `/api/alt-data/*` routes.
- Confirmed `POST /api/ai/analyze` remains functional and includes `alternativeDataSignals`.

## 13. Sprint 8 - Impact Intelligence Engine

Sprint 8 outcomes:
- Added new backend controller and route module:
  - `backend/controllers/intelligenceController.js`
  - `backend/routes/intelligenceRoutes.js`
- Integrated routes under `backend/routes/index.js` via `/api/intelligence/*`.
- Added backend intelligence services:
  - `backend/services/impactIntelligenceService.js`
  - `backend/services/intelligenceCache.js`
  - `backend/services/relationshipGraphService.js`
  - `backend/services/historicalSimilarityService.js`
  - `backend/services/scenarioEngineService.js`
  - `backend/services/propagationEngineService.js`
  - `backend/services/portfolioIntelligenceService.js`
  - `backend/services/alternativeFusionService.js`
- Added frontend intelligence API client:
  - `frontend/src/services/api/intelligenceApi.js`
  - Exported from `frontend/src/services/api/index.js`
- Dashboard integration expanded in `frontend/src/components/DashboardHome.jsx`.
- AI Analysis integration expanded in `frontend/src/screens/AiAnalysisScreen.jsx`.

Verification set used for Sprint 8:
- Events validated: `AAPL earnings`, `NVDA AI announcement`, `Oil spike`, `Fed rate hike`, `Israel conflict`, `BTC ETF approval`.
- Endpoints validated: `/api/intelligence/analyze`, `/api/intelligence/scenario`, `/api/intelligence/impact`, `/api/intelligence/history`, `/api/intelligence/portfolio`.
- Frontend build validated successfully after Sprint 8 changes.

## 14. Sprint 9 - Autonomous Daily Intelligence Brief

Sprint 9 outcomes:
- Added backend daily brief service and controller:
  - `backend/services/dailyBriefService.js`
  - `backend/controllers/dailyBriefController.js`
- Added intelligence route support:
  - `backend/routes/intelligenceRoutes.js` now exposes `/daily-brief` (GET/POST)
- Added frontend API integration:
  - `frontend/src/services/api/intelligenceApi.js` now exposes `dailyBrief(...)`
- Dashboard integration in `frontend/src/components/DashboardHome.jsx`:
  - Auto-fetches brief using watchlist + scenario defaults (`Oil spike`, `Fed rate hike`, `BTC ETF approval`, `Israel conflict`)
  - Renders "Today's Intelligence Brief" with executive summary, risk/opportunity lists, monitor list, exposure, action cards, and relevance table
  - Displays provider notice and remains stable on OpenAI failure

Sprint 9 verification:
- Build: `npm run build` passed.
- Regression: `/api/ai/analyze?symbol=NVDA` still returns analysis, marketImpact, and alternativeDataSignals.
- Daily brief smoke test with watchlist `AAPL,NVDA,TSLA` and required scenarios returned:
  - `sessionType: morning`
  - `relevanceItems: 4`
  - `actionCards: 6`
  - valid top event and AI summary payload.

## 15. Sprint 10 - Autonomous Market Operating System

Sprint 10 outcomes:
- Added backend operating-system service and controller:
  - `backend/services/autonomousMarketService.js`
  - `backend/controllers/autonomousMarketController.js`
- Extended intelligence routing in `backend/routes/intelligenceRoutes.js`.
- Extended frontend intelligence client in `frontend/src/services/api/intelligenceApi.js`.
- Dashboard now consumes the shared operating-system overview payload in `frontend/src/components/DashboardHome.jsx`.
- Added lazy-loaded Global Intelligence feature/screen:
  - `frontend/src/features/intelligence/GlobalIntelligenceFeature.jsx`
  - `frontend/src/screens/GlobalIntelligenceScreen.jsx`
- Updated navigation:
  - `frontend/src/layout/MainLayout.jsx`
  - `frontend/src/layout/Sidebar.jsx`
- Updated Alerts screen to use thresholded autonomous alerts:
  - `frontend/src/screens/AlertsScreen.jsx`

Sprint 10 verification:
- Production build passed after lazy-loading optimization.
- `/api/intelligence/overview` returned feed, alerts, watchlist rankings, global map, and decision center payloads.
- Regression validation passed for:
  - `/api/ai/analyze?symbol=NVDA`
  - `/api/intelligence/daily-brief?watchlist=AAPL,NVDA,TSLA`
- Verified operating-system overview with watchlist `AAPL,NVDA,TSLA`.

## Quick Handoff For New Developers
1. Install dependencies at root (`npm install`) and frontend if needed (`npm --prefix frontend install`).
2. Configure keys in env files (`FINNHUB_API_KEY`, `OPENAI_API_KEY`, `VITE_API_BASE_URL`).
3. Start with `npm run start:all`.
4. Open AI Analysis and test `AAPL` then `PLTR`.
5. Validate watchlist intelligence by saving favorites and opening Watchlist screen.
6. Validate Market Impact Engine sections on the AI Analysis screen.
