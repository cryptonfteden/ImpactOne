# ImpactOne - Project Status

Last updated: 2026-07-10 (Sprint 3)

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
- AI report quality was upgraded:
  - Uses quote, profile, recommendation, recommendation trend, news, and metrics context
  - Enforces decision-oriented rating scale: Strong Buy / Buy / Hold / Sell
  - Returns bounded confidence score (0-100)
- Watchlist intelligence is live:
  - Saved favorites are evaluated with latest price, daily change, AI rating, AI score, and alert badge (Risk/Opportunity/Monitor)
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
  - `quoteController`, `aiController`, `comparisonController`, `watchlistController`
- Services:
  - `finnhubService` (quote/profile/recommendation/recommendation trend/news/chart/peers)
  - `openaiService` (structured AI analysis + cache + fallback)
  - `comparisonService` (base ticker + peer comparison with AI score)
  - `finnhubCache` (quote cache)

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

## 8. Known Issues
- OpenAI may fail due to quota/credentials. App now falls back safely but premium generation quality depends on valid quota.
- Some providers return sparse payloads for less-covered tickers, which can reduce report richness.
- Port 5000 collisions can still occur on local machines if stale node processes are running.
- Development logs are verbose by design for debugging and can be reduced in production hardening.

## 9. Recommended Sprint 3

Sprint 3 execution status: delivered core investment-grade MVP upgrades in AI report quality, comparison, watchlist intelligence, and error quality.

Remaining Sprint 3 hardening tasks:
- Add integration tests for quote/analyze/compare/watchlist endpoints.
- Add frontend E2E smoke tests for AAPL and PLTR workflows.
- Add production-safe logging levels and request tracing.

## Quick Handoff For New Developers
1. Install dependencies at root (`npm install`) and frontend if needed (`npm --prefix frontend install`).
2. Configure keys in env files (`FINNHUB_API_KEY`, `OPENAI_API_KEY`, `VITE_API_BASE_URL`).
3. Start with `npm run start:all`.
4. Open AI Analysis and test `AAPL` then `PLTR`.
5. Validate watchlist intelligence by saving favorites and opening Watchlist screen.
