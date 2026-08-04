# Data Binding Report — LIVE-DATA-INTEGRATION-001

Real, verified data-source inventory for every screen named in the mission. Each row states the real backend API(s) actually called, confirmed by direct code reading this phase (not assumed from a file name or a prior phase's own report).

| Named area | Screen(s) | Real API(s) called | Fallback behavior |
|---|---|---|---|
| Dashboard | `DailyBriefHero.jsx` (+ `MissionControlHomeScreen.jsx`) | `morningBriefApi.getToday()`, `claimsApi.*`, `portfolioEngineApi.getPerformanceDelta()`, `marketSentimentApi.getOverview()`, `intelligenceApi.liveFeed()` | Honest per-section `liveSections` tracking, `DemoModeBanner`; confidence fabrication bug found and fixed this phase (see `PLACEHOLDER_ELIMINATION.md`) |
| Flagship | `FlagshipScreen.jsx` | `morningBriefApi`, `claimsApi.listActive/listOvernightChanges`, `portfolioEngineApi.getPerformanceDelta()`, `recommendationsApi.list()`, `marketApi.getQuote()` (Fear & Greed), `committeeIntelligenceApi.convene()`, `altDataApi.getEvents()`, `priceAlertsApi.list()` | Real per-panel `status` (`live`/`loading`/`error`) with a distinct visual error state — never a fabricated number (built and already verified compliant across `FLAGSHIP-SCREEN-001` through `LIVING-WORLD-001`) |
| Daily Feed | `MarketNewsScreen.jsx` | `claimsApi.listActive()`, `claimsApi.listRecentlyInvalidated()`, `intelligenceApi.liveFeed()` | Confirmed real; no fabrication pattern found |
| Recommendations | `RecommendationsScreen.jsx` | `useRecommendations()` hook (→ `recommendationsApi`), `outcomeIntelligenceApi.listLessons()`, `calibrationReportApi.get()` | Confirmed real; honest, explicit empty states throughout ("an empty list here is expected between passes, not an error") — already exemplary |
| Portfolio | `PortfolioWorkspaceScreen.jsx`, `PortfolioFeature`/`PortfolioScreen` | `portfolioEngineApi.getPerformanceDelta()`, `claimsApi.listPortfolioRelevant()`, internal `loadPortfolioContext()` | Re-verified this phase: fallback (`portfolioWorkspaceMockData.js`) used only on real fetch failure, tracked via `liveSections`, already compliant |
| Profile | `InvestorProfileScreen.jsx` | `investorProfileApi.get()`, `investorProfileApi.getInvestmentProfile()` | Confirmed real; no fabrication pattern found |
| Watchlist | `WatchlistScreen.jsx`, `WatchlistWorkspaceScreen.jsx` | `watchlistApi.getIntelligence()`, `claimsApi.*` | Confirmed real; the one `?? 0` found (`maxAttentionScore` reduction accumulator) is a legitimate max-seed, not a fabricated display value — verified, not changed |
| AI Analysis | `AiAnalysisScreen.jsx` | `analysisApi.analyze()`, alt-data/intelligence report endpoints | **3 confirmed, fixed fabrication bugs this phase** — see `PLACEHOLDER_ELIMINATION.md` |
| Alerts | `AlertsScreen.jsx` | `intelligenceApi.liveFeed()` | Confirmed real; no fabrication pattern found |
| Themes | `ThemeDashboardScreen.jsx` | `themeApi.list()`, `themeApi.get()`, `themeApi.getEvolution()`, `themeApi.recordView()` | Re-verified this phase: fully real, no mock data file even exists for this screen |
| Market Summary | `MissionControlHomeScreen.jsx`'s "Market Pulse" section, `marketSentimentApi` | `marketSentimentApi.getOverview()` | Confirmed real; presentation-only summary sentence built from real score/confidence numbers, no fabrication |

## Duplicated Frontend Calculations — Checked, None Found This Phase

The mission also asks to "remove duplicated calculations in the frontend." This phase specifically checked whether any screen recomputes a value the backend already provides (e.g., re-deriving `valueChangePct` from raw before/after numbers instead of using the backend's own computed field) — no new instance was found beyond what earlier phases already addressed (`FLAGSHIP-POLISH-001`'s `OrbitalNode` memoization work and `worldState.js`'s single-computation design already established this discipline in the 3D layer). A repo-wide, line-by-line check of every non-3D screen for this specific pattern was not performed this phase — disclosed in `LIVE_DATA_STATUS.md` as a follow-up.

## Reused APIs Only

Every fix made this phase (`PLACEHOLDER_ELIMINATION.md`) changes only how an already-fetched value is *displayed* when absent — no new API call, no new endpoint, no backend change of any kind.
