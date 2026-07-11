# ImpactOne MVP Implementation Roadmap

**Document Type:** Implementation Roadmap  
**Scope:** Remaining MVP work only  
**Baseline:** Sprint 14 complete in current project status  
**Roadmap Start:** Sprint 16, per program numbering request  
**Constraint:** No application code is modified by this document

---

## 1. Roadmap Overview

This roadmap breaks the remaining MVP into four execution sprints. The goal is to finish the core user journey from first launch to daily use, then harden the product for launch readiness.

The remaining MVP should deliver:

- A polished first-run onboarding flow
- A home dashboard that becomes the daily starting point
- Search, ticker analysis, watchlists, and saved ideas
- Portfolio intelligence and alerts
- Settings, billing, and launch hardening

Sprint 15 is intentionally not used in this roadmap so the sequence resumes at Sprint 16, matching the current project numbering request.

---

## 2. Sprint Summary

| Sprint | Theme | Primary Outcome |
|---|---|---|
| Sprint 16 | First-launch experience + dashboard shell | User can sign up, onboard, and land on a personalized home dashboard |
| Sprint 17 | Research and ticker workflows | User can search, analyze tickers, manage watchlists, and save ideas |
| Sprint 18 | Portfolio, alerts, and intelligence expansion | User can inspect portfolio risk, live alerts, and global intelligence views |
| Sprint 19 | MVP completion, settings, billing, and hardening | Product is launch-ready with final polish, persistence, and regression coverage |

---

## 3. Sprint 16 - First Launch and Dashboard Shell

### Goal

Deliver the first-time user journey from public landing through onboarding into a fully personalized Home Dashboard.

### Features

- Public landing page
- Signup flow
- Welcome / setup confirmation
- First-time onboarding wizard
- Portfolio or watchlist connection step
- Home Dashboard shell
- Market context strip
- Daily brief hero
- Priority intelligence cards
- Basic empty/loading/error states
- Responsive shell for mobile, tablet, and desktop

### Files Expected to Change

Frontend:
- `frontend/src/screens/DashboardScreen.jsx`
- `frontend/src/components/DashboardHome.jsx`
- `frontend/src/components/AIInsightsSidebar.jsx`
- `frontend/src/layout/MainLayout.jsx`
- `frontend/src/layout/Sidebar.jsx`
- `frontend/src/components/KpiCard.jsx`
- `frontend/src/components/SectionCard.jsx`
- `frontend/src/components/SafeValue.jsx`
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/Card.jsx`
- `frontend/src/components/ui/Input.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/ui/ErrorState.jsx`
- `frontend/src/components/ui/LoadingSpinner.jsx`
- `frontend/src/styles.css`
- `frontend/src/main.jsx`

Backend:
- `backend/controllers/dailyBriefController.js`
- `backend/controllers/intelligenceController.js`
- `backend/services/dailyBriefService.js`
- `backend/services/autonomousMarketService.js`
- `backend/services/intelligenceCache.js`
- `backend/routes/intelligenceRoutes.js`
- `backend/routes/index.js`

Tests and docs:
- `frontend/src/screens/DashboardScreen.test.jsx` or equivalent new dashboard coverage
- `backend/services/dailyBriefService.test.js` or expanded coverage
- `backend/services/autonomousMarketService.test.js` or expanded coverage
- `PROJECT_STATUS.md`

### Backend Work

- Stabilize the dashboard data contract so the Home Dashboard receives one coherent payload.
- Ensure daily brief, overview, live feed, and priority cards can be composed into a single home view.
- Add or refine fallback behavior for missing market, AI, or portfolio context.
- Keep response shapes consistent so the frontend can render deterministic cards and skeleton states.
- If persistence for onboarding preferences is needed, define the smallest possible backend surface for it; otherwise keep onboarding state client-side for MVP.

### Frontend Work

- Make the app home-first and dashboard-first.
- Implement the first-run journey end-to-end.
- Build the dashboard shell and wire the major sections in the required order.
- Add the AI panel entry point and the market context strip.
- Apply the final MVP visual hierarchy and responsive behavior.
- Ensure all hero, card, and panel states exist in empty, loading, and error variants.

### Tests Required

- Dashboard screen render test
- Onboarding flow test
- Daily brief service test
- Overview payload shape test
- Empty/loading/error state coverage for the dashboard shell
- Responsive snapshot or layout regression test if available

### Definition of Done

- A new user can enter the product, sign up, onboard, and reach a personalized dashboard.
- The dashboard always shows a valid layout even when data is partial or missing.
- The daily brief appears before lower-priority content.
- The main dashboard sections render with stable, production-ready hierarchy.
- The sprint passes all relevant frontend and backend tests.

### Expected Git Commits

- `feat(dashboard): add home-first shell and daily brief hero`
- `feat(onboarding): add first-run signup and setup flow`
- `test(dashboard): add dashboard and onboarding coverage`

---

## 4. Sprint 17 - Research and Ticker Workflows

### Goal

Deliver the primary research workflow: ask a question, inspect a ticker, compare peers, and save ideas.

### Features

- Universal search / Ask ImpactOne panel
- Ticker intelligence screen
- Watchlist priority panel refinement
- Discovery / opportunity module
- Daily brief archive preview
- Decision history / track record view
- Better save, dismiss, compare, and follow actions

### Files Expected to Change

Frontend:
- `frontend/src/screens/AiAnalysisScreen.jsx`
- `frontend/src/screens/WatchlistScreen.jsx`
- `frontend/src/screens/DashboardScreen.jsx`
- `frontend/src/components/WatchlistTable.jsx`
- `frontend/src/components/DashboardHome.jsx`
- `frontend/src/components/AIInsightsSidebar.jsx`
- `frontend/src/components/SectionCard.jsx`
- `frontend/src/components/ScreenErrorBoundary.jsx`
- `frontend/src/services/api/apiClient.js`
- `frontend/src/services/api/aiApi.js` if created
- `frontend/src/services/api/watchlistApi.js` if created
- `frontend/src/services/api/comparisonApi.js` if created

Backend:
- `backend/controllers/aiController.js`
- `backend/controllers/quoteController.js`
- `backend/controllers/comparisonController.js`
- `backend/controllers/watchlistController.js`
- `backend/services/openaiService.js`
- `backend/services/comparisonService.js`
- `backend/services/finnhubService.js`
- `backend/services/marketImpactService.js`
- `backend/services/alternativeFusionService.js`
- `backend/routes/index.js`

Tests and docs:
- `backend/services/openaiService.test.js`
- `backend/services/comparisonService.test.js` if added
- `backend/controllers/*` coverage for AI, quote, compare, and watchlist routes
- `frontend/src/screens/AiAnalysisScreen.test.jsx` if added
- `frontend/src/screens/WatchlistScreen.test.jsx` if added

### Backend Work

- Expand and stabilize the AI analysis payload so the dashboard and ticker views share the same reasoning model.
- Ensure comparison, quote, and watchlist endpoints return data with predictable contracts for ranking and recommendations.
- Improve fallback messaging and confidence handling for cases where live providers are unavailable.
- Keep the decision-oriented response structure consistent across ticker and dashboard surfaces.

### Frontend Work

- Build the query-driven research experience around one search surface.
- Flesh out the ticker detail page with thesis, evidence, scenario, and peer comparison blocks.
- Make watchlists interactive and rankable.
- Add save, compare, follow, and dismiss flows.
- Introduce history and archive navigation so the user can revisit prior decisions.

### Tests Required

- Ask/search interaction test
- Ticker analysis rendering test
- Comparison table test
- Watchlist interaction test
- Backend AI analysis regression test
- OpenAI fallback test
- Route contract test for compare and watchlist endpoints

### Definition of Done

- The user can ask a question and receive a cited answer.
- A ticker view shows thesis, evidence, peers, and action paths.
- Watchlists can be ranked, edited, and used for discovery.
- The research workflow is usable on both mobile and desktop.
- The sprint passes all research-related regression tests.

### Expected Git Commits

- `feat(research): add search-driven ticker workflow`
- `feat(watchlists): rank tracked names and surface opportunities`
- `test(research): add ticker, compare, and watchlist coverage`

---

## 5. Sprint 18 - Portfolio, Alerts, and Intelligence Expansion

### Goal

Turn the product into a full investment intelligence workspace with portfolio risk, alerts, global intelligence, and decision context.

### Features

- Portfolio intelligence screen
- Alerts / intelligence feed
- Global intelligence screen
- Portfolio engine polish and integration path
- Better alert ranking and feed filtering
- Portfolio risk visualization and scenario insight
- Global map and decision center surfaces

### Files Expected to Change

Frontend:
- `frontend/src/screens/PortfolioScreen.jsx`
- `frontend/src/screens/PortfolioEngineScreen.jsx`
- `frontend/src/screens/AlertsScreen.jsx`
- `frontend/src/screens/GlobalIntelligenceScreen.jsx`
- `frontend/src/screens/DashboardScreen.jsx`
- `frontend/src/hooks/usePortfolioEngine.js`
- `frontend/src/services/api/portfolioEngineApi.js`
- `frontend/src/components/KpiCard.jsx`
- `frontend/src/components/SectionCard.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/ui/ErrorState.jsx`

Backend:
- `backend/controllers/portfolioEngineController.js`
- `backend/controllers/intelligenceController.js`
- `backend/controllers/autonomousMarketController.js`
- `backend/services/portfolioEngineService.js`
- `backend/services/portfolioRepository.js`
- `backend/services/portfolioIntelligenceService.js`
- `backend/services/autonomousMarketService.js`
- `backend/services/committeeTrackRecordService.js`
- `backend/routes/portfolioEngineRoutes.js`
- `backend/routes/intelligenceRoutes.js`

Tests and docs:
- `backend/services/portfolioEngineService.test.js`
- `backend/routes/portfolioEngine.integration.test.js`
- `frontend/src/screens/PortfolioScreen.test.jsx`
- `frontend/src/screens/PortfolioEngineScreen.test.jsx` if added
- `frontend/src/screens/AlertsScreen.test.jsx` if added
- `frontend/src/screens/GlobalIntelligenceScreen.test.jsx` if added

### Backend Work

- Finish the portfolio and intelligence payloads so the portfolio screen, alerts feed, and global map share a single source of truth.
- Keep portfolio engine and intelligence endpoints aligned with the dashboard’s relevance model.
- Strengthen feed suppression, ranking, and exposure scoring.
- Preserve the existing portfolio engine path while improving the MVP-facing UX.

### Frontend Work

- Build a meaningful portfolio command view with risk and exposure emphasis.
- Create a filtered alerts feed with severity and relevance controls.
- Expand the global intelligence page into a useful market context surface.
- Connect the dashboard’s summary cards to deep drill-down routes.
- Ensure navigation between portfolio, alerts, and global intelligence feels seamless.

### Tests Required

- Portfolio engine execution test
- Portfolio screen rendering test
- Alerts feed ranking test
- Global intelligence screen rendering test
- Route integration test for portfolio engine endpoints
- Dashboard-to-detail navigation regression test

### Definition of Done

- The user can see portfolio risk, alerts, and global intelligence without friction.
- The product surfaces actionable changes, not just information.
- The portfolio engine integration remains stable.
- The sprint passes all portfolio and intelligence tests.

### Expected Git Commits

- `feat(portfolio): add portfolio intelligence and risk surfaces`
- `feat(alerts): rank and filter intelligence feed`
- `test(intelligence): add portfolio and feed coverage`

---

## 6. Sprint 19 - MVP Completion, Settings, Billing, and Hardening

### Goal

Complete the MVP by adding account controls, billing surfaces, archive/history support, and final launch hardening.

### Features

- Settings and preferences screen
- Billing and upgrade screen
- Daily brief archive polish
- Decision history / track record polish
- Final design system and UX consistency pass
- Accessibility and error-state audit
- Performance and loading-state hardening
- Final release readiness checklist

### Files Expected to Change

Frontend:
- `frontend/src/screens/SettingsScreen.jsx`
- `frontend/src/screens/DashboardScreen.jsx`
- `frontend/src/screens/PortfolioScreen.jsx`
- `frontend/src/screens/AlertsScreen.jsx`
- `frontend/src/styles.css`
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/Card.jsx`
- `frontend/src/components/ui/Input.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/ui/ErrorState.jsx`
- `frontend/src/components/ui/LoadingSpinner.jsx`

Backend:
- `backend/controllers/chatController.js` if needed for final assistant routing
- `backend/controllers/dailyBriefController.js`
- `backend/controllers/committeeController.js`
- `backend/controllers/intelligenceController.js`
- `backend/services/dailyBriefService.js`
- `backend/services/investmentCommitteeService.js`
- `backend/services/committeeTrackRecordService.js`
- `backend/services/intelligenceCache.js`

Tests and docs:
- `frontend/src/screens/SettingsScreen.test.jsx` if added
- `backend/services/dailyBriefService.test.js` expanded coverage
- `backend/services/investmentCommitteeService.test.js` if added
- `frontend` visual regression or accessibility test updates if available
- `PROJECT_STATUS.md`
- `README.md` if launch instructions change

### Backend Work

- Tighten the last remaining fallback and error messaging paths.
- Ensure daily brief and committee outputs remain stable under edge conditions.
- Add any final preference or billing-related persistence hooks needed for MVP launch.
- Improve caching, retry handling, and response consistency across the remaining surfaces.

### Frontend Work

- Finish settings and billing surfaces.
- Ensure every MVP screen has production-ready empty, loading, and error states.
- Finalize spacing, typography, and component consistency across the app.
- Resolve any mobile/tablet/desktop layout inconsistencies.
- Polish interactions so the product feels complete, fast, and reliable.

### Tests Required

- Full frontend regression test pass
- Full backend regression test pass
- Accessibility smoke pass for all MVP screens
- Loading/empty/error state coverage for key screens
- Performance smoke checks for dashboard, analysis, and portfolio screens

### Definition of Done

- The MVP feature set is complete and internally coherent.
- Every MVP screen has the correct responsive behavior and state coverage.
- The product is stable enough for external launch or controlled pilot rollout.
- The roadmap no longer has open MVP-critical gaps.
- All relevant tests pass in CI or local validation.

### Expected Git Commits

- `feat(settings): add preferences and billing surfaces`
- `chore(ui): finish design system and responsive polish`
- `test(mvp): add launch readiness and regression coverage`

---

## 7. MVP Release Gate

Before declaring the MVP complete, the product must satisfy all of the following:

- A new user can enter, sign up, onboard, and reach a personalized dashboard.
- The dashboard answers what changed, what matters, and what to do next.
- Ticker research, watchlists, and alerts are usable and explainable.
- Portfolio and intelligence views are available and stable.
- Settings and billing are present.
- Empty, loading, and error states are implemented for all MVP screens.
- The app is responsive across mobile, tablet, and desktop.
- The relevant test suite passes.

---

## 8. Recommended Execution Order Within Each Sprint

For every sprint, execute work in this order:

1. Backend contract and data shape changes
2. Frontend screen and component work
3. Empty/loading/error state coverage
4. Responsive behavior validation
5. Automated tests
6. Final polish and documentation updates

This order minimizes rework and keeps the product shippable at each sprint boundary.
