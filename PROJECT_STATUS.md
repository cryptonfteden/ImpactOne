# ImpactOne - Project Status

Last updated: 2026-07-11 (Sprint 15)

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
- Sprint 11 AI Investment Committee is now live:
  - Added multi-agent committee analysis with the following roles:
    - Chief Investment Officer (final decision)
    - Macro Strategist
    - Equity Analyst
    - Technical Analyst
    - Alternative Data Analyst
    - Risk Manager
  - Each agent now outputs:
    - bull arguments
    - bear arguments
    - confidence
    - supporting evidence
    - unknowns
    - final vote
  - CIO summary now returns:
    - executive summary
    - decision
    - expected return
    - risk
    - confidence
    - catalysts
    - threats
    - investment horizon
    - portfolio allocation suggestion
  - Added disagreement analysis:
    - committee agreement %
    - disagreement score
    - experts disagree explanation when alignment is low
  - Added decision persistence and track record storage with current-return evaluation support.
  - Added dashboard and AI Analysis committee views.
- Sprint 12 Autonomous Alpha Discovery Engine is now live:
  - Added autonomous cross-asset scan coverage for:
    - global macro
    - market
    - sector
    - stock
    - ETF
    - crypto
    - commodity
    - bond
    - currency
    - prediction markets
    - COT
    - congress trading
    - insider-buying proxy coverage
    - unusual options activity proxy coverage
    - earnings calendar
    - economic calendar
    - central bank events
    - geopolitical events
    - supply chain disruptions
    - shipping data
    - energy, defense, AI, semiconductors, space, nuclear, cybersecurity, healthcare, consumer, financials
  - Every event now includes:
    - impact score
    - probability
    - confidence
    - expected duration
    - affected sectors
    - affected companies/assets
    - historical analogs
    - best historical outcome
    - worst historical outcome
  - Added alpha discovery outputs:
    - top 10 investment ideas
    - top 10 risks
    - top macro themes
    - top sectors
    - capital rotation
    - institutional positioning
    - hidden opportunities
    - emerging narratives
    - contrarian opportunities
  - Added portfolio action guidance for opportunities:
    - buy / accumulate / wait / reduce / exit
    - position size
    - stop level
    - time horizon
    - expected upside
    - risk/reward ratio
  - Expanded global market map with country-level metrics:
    - market sentiment
    - political risk
    - economic momentum
    - inflation trend
    - currency trend
    - trade activity
    - military escalation
    - investment attractiveness
  - Added homepage answer layer for:
    - what matters today
    - where money is flowing
    - what changed
    - what should I buy
    - what should I avoid
    - biggest global risk
- Sprint 13 Virtual Agent Portfolio is now live:
  - Added a simulated paper-trading portfolio with localStorage persistence.
  - Portfolio starts with virtual capital `$100,000`.
  - Added portfolio rules:
    - max 10% per position
    - max 25% per sector
    - no leverage
    - no short selling
    - minimum confidence 75
    - minimum risk/reward 1.5
  - Added automatic trade-log generation for simulated agent actions:
    - Buy
    - Accumulate
    - Reduce
    - Exit
    - Hold
  - Added agent decision gating before simulated trade creation:
    - investment committee vote
    - alpha score / conviction
    - risk score
    - market regime check
    - event impact check
  - Added portfolio analytics:
    - cash balance
    - open positions
    - average entry price
    - current price
    - unrealized P/L
    - realized P/L
    - total portfolio value
    - daily return
    - total return
    - allocation by sector
    - allocation by asset type
  - Added trade history and performance tracking:
    - win rate
    - average gain
    - average loss
    - max drawdown
    - benchmark vs SPY
    - best trade
    - worst trade
  - Added explicit safety label:
    - "Virtual portfolio - simulated trades only"
- Sprint 14 Production-Grade Virtual Portfolio Engine is now live (opt-in):
  - Added the first persistent database in the project: PostgreSQL via Prisma 7 (driver-adapter model).
  - New server-owned portfolio engine at `/api/v2/portfolio/*`, additive alongside the existing `/api/*` routes (nothing removed or changed).
  - Schema: `Portfolio`, `Position`, `Order`, `Trade`, `CashLedgerEntry`, `PerformanceSnapshot`.
  - Atomic buy/sell execution (Order + Trade + Position + CashLedgerEntry in one transaction), realized/unrealized P/L, sector/asset-type allocation, trade history, transaction log, on-demand performance snapshots.
  - New frontend screen (`PortfolioEngineScreen`) behind `VITE_PORTFOLIO_ENGINE=api` (default remains `legacy`, i.e. the existing localStorage-driven Sprint 13 engine, completely unchanged).
  - 23 automated tests added (15 backend, 8 frontend) — first frontend test infrastructure in the repo (Vitest).
  - The new engine has no autonomous trading loop yet — orders are placed manually via a form; wiring AI committee signals into automatic execution against this engine is a future sprint.
- Sprint 15 MVP Home Dashboard is now live — the Dashboard screen is fully rebuilt against `MVP_HOME_DASHBOARD_SPEC.md`:
  - Replaced the previous ~45-widget kitchen-sink `DashboardHome.jsx` (grown sprint-by-sprint since Sprint 8) with exactly the spec's 9 dashboard-owned sections, in order: Market Context Strip, Daily Brief Hero, Priority Intelligence Cards, Portfolio Risk Panel, Watchlist Priority Panel, Ask ImpactOne Panel, Opportunity Module, Daily Brief Archive Preview, Footer Utility Area.
  - Top App Bar (spec §4.1) applied to the existing global `Header.jsx`: real portfolio value + daily P/L, an alerts bell with a live unread-count badge, a quick-actions menu, and a minimal account menu (no auth yet — "Guest workspace").
  - New backend: `POST /api/chat/ask` (Ask ImpactOne, OpenAI + deterministic fallback, same pattern as the rest of the AI layer) and a `DailyBriefSnapshot` Prisma model + `GET /api/intelligence/daily-brief/archive`, capturing one real snapshot per day whenever the brief is freshly computed — the archive fills in from real usage, never seeded/fake history.
  - Dashboard now reads the Sprint 14 server-owned portfolio engine (`usePortfolioEngine`) instead of the legacy localStorage engine — a clean cut for this screen specifically, not a flagged migration (the Portfolio screen's own `VITE_PORTFOLIO_ENGINE` flag is untouched).
  - `portfolioEngineService.getPortfolioSummary()` gained a real `dailyPnl`/`dailyPnlPct` field, and `finnhubService.getQuote` now also returns `changePercent` (Finnhub's real day % change) alongside the pre-existing `change` field.
  - New shared UI primitive: `Skeleton.jsx`, used across every dashboard section's loading state per the spec's Global Loading Rules.
  - New pure, unit-tested calculation module: `dashboardMetrics.js` (risk score, diversification, priority-card ranking, movers sort).
  - Fixed a real pre-existing bug (caught by an automated code review during this sprint): the legacy portfolio engine's `dailyReturn` divided Finnhub's absolute-dollar `change` by 100 as if it were a percentage — now uses the new `changePercent` field. `WatchlistTable.jsx`/`WatchlistScreen.jsx` still have the same display mislabeling and were intentionally left alone (broader, separate fix; `WatchlistTable` is no longer used by the Dashboard after this sprint anyway).
  - 4 new planning documents were added to the repo this sprint as reference material: `MVP_HOME_DASHBOARD_SPEC.md` (authoritative for this sprint), `MVP_IMPLEMENTATION_ROADMAP.md` (Sprints 16-19), `TEST_PLAN.md`, `API_CONTRACTS.md`, plus `ARCHITECTURE.md`, `CODE_REVIEW.md`, and `COMPETITOR_INTELLIGENCE.md`.
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
  - `investmentCommitteeService` (Sprint 11 committee debate, votes, CIO synthesis, disagreement scoring)
  - `committeeTrackRecordService` (Sprint 11 persistent decision storage and evaluation metrics)
  - `autonomousMarketService` now also owns Sprint 12 alpha discovery, scan coverage, portfolio action generation, and country-level market map metrics.
  - `virtualPortfolioStorage` (Sprint 13 client-side persistence layer for simulated portfolio state)
  - `useVirtualPortfolio` (Sprint 13 client-side trade simulation, position management, and performance tracking)
  - `portfolioRepository` (Sprint 14 — sole owner of Prisma access for the portfolio engine)
  - `portfolioEngineService` (Sprint 14 — buy/sell execution, P/L, allocation, trade history, transaction log, snapshots)
  - `chatService` (Sprint 15 — Ask ImpactOne: OpenAI call + fallback, same shape as `openaiService`)
  - `dailyBriefArchiveRepository` / `dailyBriefArchiveService` (Sprint 15 — daily brief snapshot capture + archive retrieval/compare)

### Database (Prisma / PostgreSQL, introduced Sprint 14)
- PostgreSQL via Prisma 7, driver-adapter model (`@prisma/adapter-pg` + `pg`).
- Schema: `backend/prisma/schema.prisma`; client singleton: `backend/db/prismaClient.js`.
- Config: `prisma.config.ts` at repo root (Prisma 7 requirement — connection URL no longer lives in the schema file).
- Local dev/test databases: `impactone_dev`, `impactone_test` (see Environment Variables below).
- Models: `Portfolio`, `Position`, `Order`, `Trade`, `CashLedgerEntry`, `PerformanceSnapshot` (Sprint 14), `DailyBriefSnapshot` (Sprint 15 — one row per calendar day, upserted on cache miss).

## 3. Folder Structure

```text
ImpactOne/
  backend/
    app.js                       # Express app (Sprint 14 — split from server.js for testability)
    server.js                    # just imports app.js and calls listen()
    config/env.js
    db/prismaClient.js           # Prisma Client singleton (Sprint 14)
    prisma/
      schema.prisma
      migrations/
      deployTestDb.js            # applies migrations to DATABASE_URL_TEST
    test/
      testEnv.js                 # points DATABASE_URL at the test DB for the suite
      dbHelpers.js                # truncates portfolio tables between tests
    controllers/
      aiController.js
      comparisonController.js
      quoteController.js
      watchlistController.js
      marketController.js
      newsController.js
      portfolioController.js     # legacy v1 mock, untouched
      portfolioEngineController.js  # Sprint 14
    middleware/errorHandler.js
    routes/index.js
    routes/portfolioEngineRoutes.js       # Sprint 14, mounted at /api/v2/portfolio
    routes/portfolioEngine.integration.test.js
    services/
      comparisonService.js
      finnhubCache.js
      finnhubService.js
      openaiService.js
      openaiService.test.js
      alphaVantageService.js
      newsService.js
      polygonService.js
      portfolioRepository.js         # Sprint 14
      portfolioEngineService.js      # Sprint 14
      portfolioEngineService.test.js # Sprint 14
      chatService.js                 # Sprint 15 — Ask ImpactOne
      chatService.test.js            # Sprint 15
      dailyBriefArchiveRepository.js # Sprint 15
      dailyBriefArchiveService.js    # Sprint 15
      dailyBriefArchiveService.test.js # Sprint 15
    routes/chatRoutes.js             # Sprint 15, mounted at /api/chat
    routes/dailyBriefArchive.integration.test.js  # Sprint 15
    .env.example
  frontend/
    vitest.config.js               # Sprint 14
    vitest.setup.js
    src/
      components/
        DashboardHome.jsx          # rewritten Sprint 15 — composes the 9 MVP sections
        DashboardHome.test.jsx     # Sprint 15
        dashboard/                 # Sprint 15 — one component per spec section
          MarketContextStrip.jsx
          DailyBriefHero.jsx
          PriorityIntelligenceCards.jsx
          PortfolioRiskPanel.jsx
          WatchlistPriorityPanel.jsx
          AskImpactOnePanel.jsx
          OpportunityModule.jsx
          DailyBriefArchive.jsx
          DashboardFooter.jsx
        ui/Skeleton.jsx             # Sprint 15 — shared loading-state primitive
      layout/
      screens/
        PortfolioScreen.jsx        # feature-flag router (Sprint 14)
        PortfolioEngineScreen.jsx  # new server-backed screen (Sprint 14)
      hooks/
        usePortfolioEngine.js      # Sprint 14
        useVirtualPortfolio.js     # Sprint 13, recomputeState fixed + exported Sprint 15
      services/api/
        portfolioEngineApi.js      # Sprint 14
        chatApi.js                 # Sprint 15
      utils/
        dashboardMetrics.js        # Sprint 15 — pure risk/diversification/ranking calculations
      main.jsx
      styles.css
    .env.example
    package.json
  docs/
    architecture.md
    PROJECT_STATUS.md             # stale snapshot from early sprints — root PROJECT_STATUS.md is canonical
  prisma.config.ts                # Sprint 14, Prisma 7 config (repo root)
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
  - Ask ImpactOne freeform Q&A (Sprint 15, `POST /api/chat/ask`)
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
- `DATABASE_URL` (Sprint 14 — required for any `/api/v2/portfolio/*` route or `npm run test:backend`; not required for the rest of the app, which is unaffected if it's absent)

### Optional but strongly recommended
- `OPENAI_API_KEY`

### New in Sprint 14
- `DATABASE_URL` — PostgreSQL connection string for the portfolio engine, e.g. `postgresql://postgres:PASSWORD@127.0.0.1:5432/impactone_dev?schema=public`.
- `DATABASE_URL_TEST` — separate database used only by `npm run test:backend`, so the test suite never touches dev data. Apply migrations to it with `npm run db:deploy:test`.
- `VITE_PORTFOLIO_ENGINE` (frontend) — `legacy` (default) or `api` to preview the new server-owned Portfolio screen.

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
curl "http://localhost:5000/api/v2/portfolio"
```

### Database setup (Sprint 14, only needed for the portfolio engine)
```bash
# 1. Install PostgreSQL locally and create two databases: impactone_dev, impactone_test
# 2. Set DATABASE_URL and DATABASE_URL_TEST in backend/.env (see backend/.env.example)
npm run db:migrate        # applies migrations to DATABASE_URL (dev)
npm run db:deploy:test    # applies the same migrations to DATABASE_URL_TEST
```

### Running tests
```bash
npm run test              # backend (node --test) + frontend (vitest), 51 tests total (27 backend, 24 frontend)
npm run test:backend      # requires DATABASE_URL_TEST to be set and migrated
npm run test:frontend
```

## 7. Remaining Roadmap
- Persistent portfolio storage: **done in Sprint 14** (opt-in via `VITE_PORTFOLIO_ENGINE=api`). Persist watchlist/favorites the same way is still open.
- MVP Home Dashboard: **done in Sprint 15** per `MVP_HOME_DASHBOARD_SPEC.md`. Per `MVP_IMPLEMENTATION_ROADMAP.md`, Sprints 16-19 continue with first-launch/onboarding, research workflows, portfolio/alerts/intelligence expansion, and settings/billing/hardening.
- Add auth and per-user sessions (the Sprint 14 portfolio engine is still single-portfolio, no accounts — matches today's single-user scope exactly, but doesn't yet support multiple users).
- Wire AI committee/intelligence signals into automatic order placement against the new server-owned engine — **Sprint 16 Phase A added the recommendation layer** (`/api/v2/recommendations`, advisory only, never places a trade); actual execution remains explicitly out of scope until a future sprint revisits it.
- Add background workers/scheduler so portfolio performance snapshots and daily brief archive capture run continuously rather than on-demand/on-cache-miss — **Sprint 16 Phase A added the first scheduler** (`node-cron`-based, for the recommendation engine only); performance snapshots and daily brief capture are still on-demand/on-cache-miss.
- Cut the legacy `PortfolioScreen`/`useVirtualPortfolio` path over to the new engine once validated, then retire both it and the `/api/portfolio` v1 mock.
- Add CI pipeline with lint/test/build gates (51 tests now exist locally but nothing runs them automatically yet).
- Add API schema validation and typed contracts.
- Add observability primitives (request IDs, structured logging, endpoint timings).
- Add AI prompt/versioning controls and report history.
- Expand market impact logic with sector-specific catalyst patterns and event history.
- Fix the `change` (absolute $) vs `changePercent` (real %) display mislabeling in `WatchlistTable.jsx`, `WatchlistScreen.jsx`, and any other screen still rendering `change` with a "%" suffix — Sprint 15 fixed the one live instance in the legacy portfolio engine's daily-return math, but the display-layer version of this bug is broader (see Known Issues).

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
- The Sprint 14 portfolio engine's `benchmarkReturnPct` is intentionally left `null` — there is no tracked baseline SPY price to compare against yet, so it is not populated with a computed-looking value.
- The Sprint 14 portfolio engine has no autonomous trading loop; orders are placed manually via its "Place Order" form. The legacy engine's autonomous decision loop has not been ported over.
- `node_modules/` and `frontend/dist/` are committed to git, and `frontend/.env` was committed with real API keys in its history (flagged separately, not addressed by Sprint 14 — rotating those keys and cleaning git history is still outstanding).
- `WatchlistTable.jsx` and `WatchlistScreen.jsx` (and any other screen reading `/api/watchlist`'s `change` field) still display Finnhub's absolute-dollar change with a "%" suffix — the same class of bug fixed in the legacy portfolio engine's `dailyReturn` calculation this sprint, but not swept across every display consumer. `WatchlistTable.jsx` is no longer used by the Dashboard as of Sprint 15 (kept in the repo, just unreferenced).
- The Sprint 15 Daily Brief Archive only captures a snapshot when `dailyBriefService.getDailyBrief()` computes fresh (a 5-minute in-memory cache miss) — there's no scheduler yet, so on a quiet day with no traffic the archive may not gain a new entry even though a day has passed. Matches the spec's own "appears after a few days" empty-state framing but is worth knowing.
- The Sprint 15 Top App Bar's account menu is a static "Guest workspace" placeholder — no real auth exists yet (tracked in Remaining Roadmap).
- Help/Feedback/Terms/Product updates links in the new Dashboard Footer are intentionally inert (no real destination exists anywhere in the app yet) rather than fabricated links that go nowhere.
- The Sprint 16 Phase A recommendation engine's universe is held positions plus the app's existing 3-symbol default watchlist (`AAPL`/`NVDA`/`TSLA`) — there is no persisted per-user watchlist server-side yet (`useWatchlist` is client localStorage only), so the engine cannot see a user's actual saved watchlist. Same underlying gap as the rest of the app's server-side/localStorage split, not new to this sprint.

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

## 16. Sprint 11 - AI Investment Committee

Sprint 11 outcomes:
- Added backend committee services and controller:
  - `backend/services/investmentCommitteeService.js`
  - `backend/services/committeeTrackRecordService.js`
  - `backend/controllers/committeeController.js`
- Added committee routes in `backend/routes/index.js`:
  - `GET/POST /api/committee/analyze`
  - `GET /api/committee/track-record`
- Existing AI analysis endpoint now includes additive committee output without changing existing behavior:
  - `analysis.committee`
  - `analysis.committeeTrackRecord`
- Added frontend committee API client:
  - `frontend/src/services/api/committeeApi.js`
- Dashboard now includes an auto-loaded "Investment Committee" section:
  - `frontend/src/components/DashboardHome.jsx`
- AI Analysis now includes a dedicated committee section/tab:
  - `frontend/src/screens/AiAnalysisScreen.jsx`

Sprint 11 verification:
- Production build passed.
- Committee endpoint validated for:
  - `AAPL`
  - `NVDA`
  - `MSFT`
  - `TSLA`
  - `BTC`
  - `OIL`
- Track record endpoint validated for persisted committee history.
- Regression validation passed for:
  - `/api/ai/analyze?symbol=NVDA`
  - `/api/intelligence/daily-brief?watchlist=AAPL,NVDA,TSLA`
  - `/api/intelligence/overview?watchlist=AAPL,NVDA,TSLA`

## 17. Sprint 12 - Autonomous Alpha Discovery Engine

Sprint 12 outcomes:
- Extended backend autonomous intelligence service:
  - `backend/services/autonomousMarketService.js`
- Extended autonomous controller and routes:
  - `backend/controllers/autonomousMarketController.js`
  - `backend/routes/intelligenceRoutes.js`
  - Added `GET /api/intelligence/alpha-discovery`
- Extended frontend intelligence API client:
  - `frontend/src/services/api/intelligenceApi.js`
- Dashboard now surfaces alpha-discovery outputs:
  - `frontend/src/components/DashboardHome.jsx`
- Global Intelligence screen now includes:
  - country-level market map metrics
  - autonomous scan coverage
  - alpha discovery summaries
  - `frontend/src/screens/GlobalIntelligenceScreen.jsx`

Sprint 12 verification:
- Production build passed.
- `GET /api/intelligence/overview?watchlist=AAPL,NVDA,TSLA` returned:
  - `scanCoverage`
  - `alphaDiscovery`
  - `homepageAnswers`
  - enriched feed items with probability and historical outcomes
- `GET /api/intelligence/alpha-discovery?watchlist=AAPL,NVDA,TSLA` returned top ideas and macro themes.
- `GET /api/intelligence/global-map?watchlist=AAPL,NVDA,TSLA` returned country-level market map metrics.
- Regression validation passed for:
  - `/api/ai/analyze?symbol=NVDA`
  - `/api/intelligence/daily-brief?watchlist=AAPL,NVDA,TSLA`
  - `/api/committee/analyze?symbol=NVDA`

## 18. Sprint 13 - Virtual Agent Portfolio

Sprint 13 outcomes:
- Added persistent virtual portfolio storage:
  - `frontend/src/services/virtualPortfolioStorage.js`
- Added portfolio simulation hook:
  - `frontend/src/hooks/useVirtualPortfolio.js`
- Dashboard now surfaces virtual portfolio widgets in:
  - `frontend/src/components/DashboardHome.jsx`
  - Virtual Portfolio Value
  - Today’s Agent Trades
  - Best Open Trade
  - Worst Open Trade
  - Agent Win Rate
  - Current Cash
  - Risk Exposure
- Portfolio screen now shows the simulated portfolio and trade history:
  - `frontend/src/screens/PortfolioScreen.jsx`
- The engine is localStorage-backed for now and structured so it can later move to a database-backed service layer.

Sprint 13 verification:
- Production build passed.
- Verified overview-driven portfolio inputs for:
  - `AAPL`
  - `NVDA`
  - `TSLA`
  - `BTC`
  - oil signal coverage
- Verified committee decisions for:
  - `AAPL`
  - `NVDA`
  - `TSLA`
  - `BTC`
- Verified alpha-discovery portfolio actions are present in overview payloads.

## 19. Sprint 14 - Production-Grade Virtual Portfolio Engine

Sprint 14 outcomes:
- Added the project's first persistent database: PostgreSQL via Prisma 7 (driver-adapter model, `@prisma/adapter-pg` + `pg` — Prisma 7 no longer supports a `url` field directly in `schema.prisma`; the connection string now lives in `prisma.config.ts`).
  - `backend/prisma/schema.prisma`, `backend/prisma/migrations/`
  - `backend/db/prismaClient.js` (singleton client)
  - `prisma.config.ts` (repo root)
- Added the portfolio engine data/service layer:
  - `backend/services/portfolioRepository.js` — sole owner of Prisma access
  - `backend/services/portfolioEngineService.js` — atomic buy/sell (Order + Trade + Position + CashLedgerEntry in one transaction), mark-to-market via the existing `finnhubService.getQuote`, realized/unrealized P/L, sector/asset-type allocation, trade history, transaction log, on-demand performance snapshots, reset
- Added the API layer, purely additive:
  - `backend/controllers/portfolioEngineController.js`
  - `backend/routes/portfolioEngineRoutes.js`, mounted at `/api/v2/portfolio/*` via one new line in `backend/routes/index.js`
  - The existing `/api/portfolio` v1 mock is untouched
- Split `backend/server.js` into `backend/app.js` (Express app) + `backend/server.js` (just calls `.listen()`), so the app can be exercised in tests without binding a port. No behavior change — verified before committing.
- Added the frontend layer, behind a feature flag:
  - `frontend/src/services/api/portfolioEngineApi.js`, `frontend/src/hooks/usePortfolioEngine.js`
  - `frontend/src/screens/PortfolioEngineScreen.jsx` — a new, honest layout (not an adapter forcing the new data into the legacy screen's shape, since the new engine has no autonomous trading loop yet)
  - `frontend/src/screens/PortfolioScreen.jsx` now branches on `VITE_PORTFOLIO_ENGINE` (`legacy` default / `api`) before calling any hooks
- Added full test coverage:
  - Backend: `backend/services/portfolioEngineService.test.js` (9 unit tests, `node:test`, matching the existing `openaiService.test.js` convention) + `backend/routes/portfolioEngine.integration.test.js` (5 tests, `supertest`)
  - Frontend: `frontend/vitest.config.js` + `vitest.setup.js` (first frontend test infra in the repo — standalone from a `vite.config` since none existed), `usePortfolioEngine.test.js` (5 tests), `PortfolioScreen.test.jsx` (3 tests)
  - `npm run test` from root: 23/23 passing

Sprint 14 verification:
- `npm run build` — frontend build passed, unchanged output shape.
- `npm run test` — 23/23 backend + frontend tests passed.
- Local PostgreSQL installed and verified (`impactone_dev`, `impactone_test`); migration applied to both; Prisma Client connection smoke-tested directly against the dev database before building on top of it.
- Regression check: `GET /api/portfolio` (v1) and `GET /health` still respond exactly as before.
- Browser verification (Playwright, headless Chromium) in both `VITE_PORTFOLIO_ENGINE` modes:
  - `legacy` (default): renders byte-identical to pre-Sprint-14 output.
  - `api`: Cash Balance/Total Value show $100,000, Place Order form present, all tables (positions/trades/transactions/performance) correctly show empty state, order placement fails gracefully with the expected "FINNHUB_API_KEY is missing" message (no live key configured in this environment) rather than crashing, and Reset works.
  - Found and fixed one real CSS specificity bug during this pass: the Buy/Sell toggle reused `.analysis-search`'s blanket `button` rule, which out-specificity'd the intended selected/unselected styling. Fixed with a dedicated `.order-form` class.
  - No new console errors introduced in either mode; pre-existing ones (missing API keys, an unrelated duplicate-React-key warning in `DashboardHome`'s live feed list) are untouched by this sprint.

Not in scope for Sprint 14 (see Remaining Roadmap):
- Auth / multi-user accounts.
- Autonomous order placement against the new engine (manual only, via the Place Order form).
- Background workers/scheduler for continuous snapshotting.
- Migrating the legacy screen/Dashboard widgets over to the new engine.
- `benchmarkReturnPct` tracking (left `null`, not faked).

## 20. Sprint 15 - MVP Home Dashboard

Sprint 15 outcomes:
- Rebuilt the Dashboard screen from scratch against `MVP_HOME_DASHBOARD_SPEC.md` (confirmed authoritative over an earlier, shorter chat-pasted version of the same spec). Replaced the previous ~45-widget `DashboardHome.jsx` (930 lines, grown since Sprint 8) with exactly the spec's 9 dashboard-owned sections, in order:
  - `frontend/src/components/dashboard/MarketContextStrip.jsx` — market status, S&P/Nasdaq/Russell proxies (SPY/QQQ/IWM via the existing `finnhubService.getQuote`), macro one-liner, key event chip
  - `DailyBriefHero.jsx` — executive summary, confidence badge, "why this matters" bullets, sparkline (reuses `getQuote`'s existing `chart` field), primary/secondary actions
  - `PriorityIntelligenceCards.jsx` — 3-5 alert/opportunity/risk/catalyst cards, ranked via the new `rankPriorityCards` utility
  - `PortfolioRiskPanel.jsx` — concentration, risk score, sector exposure meter, rule-based suggestions, all from real portfolio + macro data
  - `WatchlistPriorityPanel.jsx` — ranked watchlist rows reusing `watchlistRankings`
  - `AskImpactOnePanel.jsx` — self-contained chat panel
  - `OpportunityModule.jsx` — ranked ideas with a real "Add to Watchlist" action
  - `DailyBriefArchive.jsx` — recent brief history
  - `DashboardFooter.jsx` — real Settings/Status links, inert placeholders for Help/Feedback/Terms/Product updates
- Extended the existing global `Header.jsx` (Top App Bar, spec §4.1) rather than adding a second Dashboard-only header: portfolio value + daily P/L, an alerts bell with a live unread count, a quick-actions menu, and a minimal account menu.
- New backend surface:
  - `POST /api/chat/ask` (`backend/services/chatService.js` + controller + route) — Ask ImpactOne, same OpenAI-with-fallback pattern as the rest of the AI layer
  - `DailyBriefSnapshot` Prisma model + migration, `backend/services/dailyBriefArchiveRepository.js` / `dailyBriefArchiveService.js`, `GET /api/intelligence/daily-brief/archive` — captures one real snapshot per day whenever `dailyBriefService.getDailyBrief()` computes fresh; the archive fills in from real usage, never seeded
  - `portfolioEngineService.getPortfolioSummary()` gained `dailyPnl`/`dailyPnlPct`, computed from each open position's live day % change
  - `finnhubService.getQuote` now also returns `changePercent` (Finnhub's `dp`) alongside the pre-existing `change` (`d`, absolute dollar — kept as-is since existing screens already consume it)
- New shared frontend primitives: `components/ui/Skeleton.jsx` (loading states per the spec's Global Loading Rules) and `utils/dashboardMetrics.js` (pure, unit-tested: `computeRiskScore`, `computeDiversification`, `rankPriorityCards`, `sortMoversByChange`)
- Dashboard now reads the Sprint 14 server-owned portfolio engine (`usePortfolioEngine`) instead of the legacy localStorage engine — a clean cut for this screen only; the Portfolio screen's own `VITE_PORTFOLIO_ENGINE` flag is untouched
- Fixed a real bug an automated code-review pass caught mid-sprint: the legacy portfolio engine's `dailyReturn` divided the absolute-dollar `change` field by 100 as if it were a percentage — now uses `changePercent`. Regression test added (`useVirtualPortfolio.test.js`, `recomputeState` exported for direct testing).
- Fixed a real bug found during this sprint's own browser verification: `OpportunityModule` used `idea.symbol` as a React key, but `alphaDiscovery.top10InvestmentIdeas` can legitimately contain multiple entries for the same symbol with different theses — fixed with a composite key + index tiebreaker.
- Fixed a test-infrastructure bug found while adding this sprint's tests: `node --test` runs test files concurrently by default, which raced against the shared test database once enough test files existed (FK constraint violations during `truncateAll()`). Fixed with `--test-concurrency=1` in `npm run test:backend`.
- Four new planning documents appeared in the repo mid-sprint and were incorporated: `MVP_HOME_DASHBOARD_SPEC.md` (confirmed authoritative for this sprint over the original chat-pasted spec), `MVP_IMPLEMENTATION_ROADMAP.md` (Sprints 16-19 — confirmed `Daily Brief Archive Preview` should stay in Sprint 15 rather than move to Sprint 17 as that document suggested), `TEST_PLAN.md`, `API_CONTRACTS.md` (aligned the archive endpoint's response key to `briefs` per its proposed contract). `ARCHITECTURE.md`, `CODE_REVIEW.md`, and `COMPETITOR_INTELLIGENCE.md` were added as reference material.

Sprint 15 verification:
- `npm run build` — frontend build passed.
- `npm run test` — 51/51 passing (27 backend, 24 frontend; +28 net new tests this sprint: chat service, daily brief archive service + integration, dashboard metrics, DashboardHome composition, portfolio dailyPnl, legacy dailyReturn regression).
- Browser verification (Playwright, headless Chromium) at desktop (1440px) and mobile (390px) widths: all 9 dashboard sections render with real data; all other screens (Watchlist, AI Analysis, Portfolio, Alerts, Settings, Global Intelligence, Market News) still mount cleanly with zero crash errors; Header's quick-actions/account-menu/alerts-bell navigation all verified landing on the correct screen.

Not in scope for Sprint 15 (see Remaining Roadmap and Known Issues):
- Real auth / account system (account menu is a static placeholder).
- Scheduled background capture for the daily brief archive (currently capture-on-cache-miss only).
- Sweeping the `change`-vs-`changePercent` display fix across every remaining consumer (`WatchlistTable.jsx`, `WatchlistScreen.jsx`).
- Streaming Ask ImpactOne responses, multi-turn clarifying questions, persisted chat history.
- Real destinations for Help/Feedback/Terms/Product updates in the footer.

## 21. Sprint 16 Phase A - Autonomous Recommendation Engine (advisory only)

Scope note: Phase 1 planning for Sprint 16 initially proposed an execution-capable "Autonomous Decision & Execution Engine." The user narrowed Phase A before implementation: a **recommendation engine, not an execution engine**. It analyzes market events and real portfolio exposure and produces explainable, confidence-scored recommendations — it never places a trade. Execution, broker connectivity, and automated trading remain fully out of scope for Sprint 16.

Sprint 16 Phase A outcomes:
- New Prisma models: `Recommendation` (symbol, action, confidenceScore, expectedUpside/expectedDownside, riskScore/riskLabel, positionSizeSuggestion, reasoning, evidence JSON, portfolioContext JSON, ACTIVE/SUPERSEDED/EXPIRED status) and `AutonomousRunLog` (per-run symbol/recommendation counts + errors) — no changes to `Order`/`Position`/`Portfolio`.
- `backend/services/autonomousRecommendationEngine.js` — the core logic. Composes already-cached signals rather than adding new provider calls: `autonomousMarketService.getAutonomousOverview()` (events + per-symbol AI scores, 5-minute cache) and `portfolioEngineService.getPortfolioSummary()` (real positions/sector allocation, not the older hardcoded 5-symbol `portfolioIntelligenceService` lookup). Extracted `computeConvictionScore`/`buildPortfolioAction` out of `autonomousMarketService.js` (previously inline, only used for the top-10 alpha-discovery slice) so any symbol in the engine's universe can be scored consistently with what the rest of the app already shows.
  - Universe = held position symbols ∪ the app's existing server-side default watchlist (`["AAPL","NVDA","TSLA"]` — there is no persisted per-user watchlist server-side yet, `useWatchlist` is client localStorage only; stated here as a real coverage limitation, not hidden).
  - Only persists actionable recommendations (BUY for a strong signal on a symbol not held, REDUCE/EXIT for a weak/negative signal on a symbol held) — a "Wait"-tier signal on an unheld symbol generates nothing, by design.
  - A held position whose sector exceeds a concentration threshold can independently trigger a REDUCE recommendation even when the underlying AI score alone says Wait — this is what makes it a genuine portfolio-exposure analysis, not a repackaged opportunity list.
  - `backend/utils/portfolioRiskMetrics.js` — backend port of the Sprint 15 `dashboardMetrics.js` concentration/risk formulas (same math, duplicated rather than cross-imported since backend is CommonJS and the frontend module is ESM in a separate package).
  - Every persisted recommendation reruns supersede logic (`autonomousRecommendationRepository.supersedeActiveForSymbol`, `updateMany`-based so it's correct even with concurrent stale ACTIVE rows) so only one ACTIVE recommendation exists per symbol at a time.
  - **No import of `placeOrder` or any portfolio-mutating repository function anywhere in the engine file** — a structural, not just conventional, non-execution guarantee. Verified by an explicit test asserting `placeOrder` is never called, and by a route-level test confirming `/api/v2/portfolio/trades` stays empty after a run.
- `backend/services/schedulerService.js` — thin `node-cron` wrapper (no BullMQ/Redis — a single in-process interval trigger matches this app's actual scale). Bootstrapped from `backend/server.js` only, guarded by `AUTONOMOUS_ENGINE_ENABLED` (default on — safe, since this phase never touches money or portfolio state). Deliberately **not** added to `backend/app.js`, since integration tests `require("../app")` directly and a live cron timer would leak into test runs.
- New API surface, mounted at `/api/v2/recommendations`: `GET /` (list, `?status=`/`?symbol=`), `GET /:id` (full detail incl. reasoning/evidence), `POST /run` (on-demand trigger), `GET /status` (enabled/interval/last run).
- New frontend screen: `frontend/src/screens/RecommendationsScreen.jsx` (+ `useRecommendations` hook, `recommendationsApi`, `RecommendationsFeature`, new "Recommendations" nav item). Reuses the existing `.opportunity-grid`/`.opportunity-item`/`.pill` card patterns from Sprint 15's Opportunity Module rather than introducing a new visual language. States plainly, on the screen itself, that the engine never executes trades.

Sprint 16 Phase A verification:
- `npm run build` — frontend build passed.
- `npm run test` — 78/78 passing (46 backend, 32 frontend; +25 net new tests: recommendation engine, repository, scheduler, route integration, frontend hook + screen).
- Manual end-to-end run against the live (no-API-key fallback) intelligence pipeline: `POST /api/v2/recommendations/run` produced real, reasoned BUY recommendations with confidence/upside/downside/risk/evidence; `GET /api/v2/portfolio` and `/trades` were byte-identical before and after the run, confirming no execution side effect.
- Browser verification (Playwright, headless Chromium): Recommendations screen renders real recommendation cards, "Show reasoning" expands correctly, "Run now" triggers a fresh pass, no order-placement control exists anywhere on the screen, and no new console errors were introduced (pre-existing `/api/quote?symbol=SPY|QQQ|IWM` 404s from Sprint 15's `MarketContextStrip` on the Dashboard are unrelated and untouched by this sprint).

Not in scope for Sprint 16 Phase A (see Remaining Roadmap):
- Execution, broker connectivity, and automated trading — explicitly excluded by the user for all of Sprint 16, not just deferred within this feature.
- A calibration/backtesting feedback loop grading recommendation accuracy against `committeeTrackRecordService` — needs a real recommendation history to exist first; a natural Sprint 17 candidate.
- Persisted per-user server-side watchlist (the engine's universe is held positions + the existing 3-symbol default, same limitation as elsewhere in the app).
- Auth / multi-user accounts, billing/entitlements, and broker execution more broadly — real business-viability gaps (flagged during this sprint's planning by an externally-appearing `PRODUCT_GAP_ANALYSIS.md`), but a separate, larger initiative from this feature.

## 22. Sprint 16 Phase B - Connect Live Data, Surface Recommendations Everywhere

Scope note: two of the five Phase B requirements were already satisfied by Phase A and weren't rebuilt — portfolio holdings connection (`portfolioEngineService.getPortfolioSummary()`) and automatic generation every 30 minutes (`schedulerService.js` + `node-cron`, verified still correct by rereading the code). Phase B added the three genuinely new pieces: live market data surfaced in recommendation output, a real live news connection replacing a synthetic event catalog, and recommendations visible on the Dashboard, not just the dedicated screen. The advisory-only guarantee is unchanged — nothing in Phase B touches `placeOrder`.

Sprint 16 Phase B outcomes:
- **Live market data surfaced in recommendations** — `autonomousMarketService.buildWatchlistRanks` already fetched a live Finnhub quote per symbol to compute momentum, then discarded it. Now exposes `currentPrice`/`dayChangePercent` on each ranking item (`null` when unavailable, same graceful pattern as the rest of the pipeline). The recommendation engine threads this into `evidence` and into `reasoning` ("Currently trading at $X, +Y% today") — zero new network calls, pure reuse of data already fetched.
- **Live news feed connected into event detection** — found and closed a real gap: the event pipeline feeding every recommendation (`getRepresentativeEvents`) was entirely synthetic, a hardcoded ~30-entry scenario catalog (`AUTONOMOUS_SCAN_UNIVERSE`), never real news, even though a complete, working live news integration (`newsService.js`, real NewsAPI.org calls via `NEWS_API_KEY`, graceful fallback) already existed unused. `getAutonomousOverview` now fetches real headlines and merges them in: up to 6 live articles first, deduped against and backfilled by the existing synthetic catalog, same 28-item cap as before. Each event now carries a `sourceUrl` (the real article link for live entries, `null` for synthetic ones), threaded through into a recommendation's `evidence.matchedEvents` — a real citation, not just a derived score. This also improved data quality for the Priority Intelligence Cards and Opportunity Module on the Dashboard, since they read the same shared `feed`.
  - Switched `newsService`'s import in `autonomousMarketService.js` to namespace-style (matching `portfolioEngineService`'s existing `finnhubService` pattern) so the new code path could actually be tested — `autonomousMarketService.js` had no test file before this sprint; added `backend/services/autonomousMarketService.test.js`.
- **Recommendations now show on the Dashboard** — new `frontend/src/components/dashboard/RecommendationsPreview.jsx`, using the same `useRecommendations` hook (already polling every 60s) the dedicated screen uses. Renders right after Opportunities: top 3 active recommendations, action/confidence/upside/downside, "View all" link to the full Recommendations screen. No place-order control, matching the dedicated screen.

Sprint 16 Phase B verification:
- `npm run build` — frontend build passed.
- `npm run test` run before every commit in this phase, not just at the end — 91/91 passing at completion (55 backend, 36 frontend; +13 net new tests this phase).
- Manual end-to-end run: `POST /api/v2/recommendations/run` against the real (unmocked) pipeline in this environment (no `NEWS_API_KEY`/`FINNHUB_API_KEY` configured beyond whatever is already set) produced recommendations with real `currentPrice`/`dayChangePercent` and `evidence.matchedEvents` correctly carrying `newsService`'s own fallback article's `sourceUrl` for the live-sourced event and `null` for synthetic ones; `/api/v2/portfolio/trades` stayed empty before and after, confirming the advisory-only invariant still holds.
- Browser verification (Playwright, headless Chromium): Dashboard renders the new Recommendations section with real cards; Recommendations screen unaffected in layout and still fully functional; no new console errors (the pre-existing Sprint 15 `MarketContextStrip` 404s are untouched, same as noted in Phase A).

Not in scope for Sprint 16 Phase B:
- Everything already excluded from Phase A (execution/broker connectivity, calibration loop, auth/billing) — unchanged.
- A persisted per-user server-side watchlist — the engine's news query is a single fixed `"markets"` term, not personalized per watchlist symbol; a natural refinement once server-side watchlists exist.

## Quick Handoff For New Developers
1. Install dependencies at root (`npm install`) and frontend if needed (`npm --prefix frontend install`).
2. Configure keys in env files (`FINNHUB_API_KEY`, `OPENAI_API_KEY`, `VITE_API_BASE_URL`).
3. Start with `npm run start:all`.
4. Open AI Analysis and test `AAPL` then `PLTR`.
5. Validate watchlist intelligence by saving favorites and opening Watchlist screen.
6. Validate Market Impact Engine sections on the AI Analysis screen.
7. (Optional, Sprint 14) Set up PostgreSQL and `DATABASE_URL`/`DATABASE_URL_TEST` per the Database setup steps above, run `npm run db:migrate`, then set `VITE_PORTFOLIO_ENGINE=api` to try the new server-owned Portfolio screen. Run `npm run test` to exercise it end-to-end.
8. (Optional, Sprint 16) Open the "Recommendations" screen and click "Run now" to trigger an on-demand pass of the advisory-only recommendation engine — it never places a trade. It also runs automatically every `AUTONOMOUS_ENGINE_INTERVAL_MINUTES` (default 30) while the backend server process is running, controlled by `AUTONOMOUS_ENGINE_ENABLED`.
