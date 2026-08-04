# Technical Debt Report — RELEASE-CANDIDATE-001

Full findings from this phase's 14-category repository audit. Each item is marked **Fixed**, **Reported (not fixed — see reason)**, or **No confirmed finding**.

## 1. Duplicated components — Reported (not fixed)

- `frontend/src/components/ui/EmptyState.jsx` (real, wired into 16+ screens) vs. `frontend/src/components/nova/Loading.jsx`'s own `export function EmptyState({ icon, title, description })` (lines 26–36) — two differently-shaped components sharing a name.
- `frontend/src/components/OfflineBanner.jsx` (real, wired into `MainLayout.jsx` via `useOnlineStatus`) vs. `nova/Loading.jsx`'s own `export function OfflineBanner({ lastUpdatedLabel })` (lines 38–44, `.nova-banner` class) — consumed only by `novaShowcase/sections/LoadingSection.jsx`.
- `frontend/src/components/ui/LoadingSpinner.jsx`/`Skeleton.jsx` overlap in purpose with `nova/Loading.jsx`'s own `Skeleton`/`ProgressBar` pair.

**Reason not fixed**: `nova/Loading.jsx` is consumed by a dedicated design-system showcase screen; safely determining whether it's an intentional "component catalog" reference or true dead-weight duplication, and retiring the right one, needs more verification than this pass's grep-level pass supports without risking the showcase screen. See `RELEASE_CANDIDATE_AUDIT.md`.

## 2. Duplicated services/business logic — No confirmed finding

Confidence/scoring logic is spread across ~28 backend files (`canonicalVerdict.js`, `recommendationQualityService.js`, `scoringVocabulary.js`, `marketSentimentScorers.js`, `weightedAggregationEngine.js`, `committeeCoordinator.js`, etc.). This reads as an intentionally layered pipeline (raw scorer → aggregator → canonical verdict → explanation), not copy-pasted duplication. No two functions were confirmed to compute the identical formula from the same inputs. Flagged for a future, dedicated line-by-line comparison — not acted on here.

## 3. Duplicated CSS — No confirmed finding

Checked `frontend/src/styles.css`, `styles/components.css`, `flagshipScreen.css`, `workspace3d.css` for cross-file duplicate rule blocks. The only repeated class names found (`.nova-card`, `.nova-button`, `.flagship-panel__state`, `.workspace3d-glass-panel`) are pseudo-class/attribute-selector variants within a single file, not cross-file duplication.

## 4. Dead code / unused exports — Fixed

- `frontend/src/components/KpiCard.jsx` — removed. Zero real importers confirmed.
- `frontend/src/components/WatchlistTable.jsx` — removed. Zero real importers confirmed.
- `frontend/src/components/AIInsightsSidebar.jsx` — removed. Zero real importers (one non-import comment mention in `apiConfig.js`, now updated to no longer reference it).

## 5. Unused imports — No confirmed finding

Sampled 8 screen files (`AlertsScreen.jsx`, `SettingsScreen.jsx`, `WorkspaceDetail.jsx`, `StockSidePanel.jsx`, `HomeScreen.jsx`, `MarketNewsScreen.jsx`, `ThemeDashboardScreen.jsx`, plus spot checks) — every import in each is referenced in the file's body.

## 6. Unused npm dependencies — Identified (one), not committed this phase; rest confirmed used

- **Identified, not committed**: `react-router-dom` (root `package.json`) — this app doesn't use routing (state-driven screen swap instead); zero real usage found anywhere in `frontend/src` or `backend`, and it wasn't even declared in `frontend/package.json`. Removing it was attempted, then reverted: `package.json`'s working tree already carried unrelated, pre-existing uncommitted dependency additions (`bcryptjs`, `jsonwebtoken`, `stripe`) from outside this session's phases, and committing the file now would have swept those in as if this phase made them. See `REPOSITORY_CLEANUP.md`.
- All other root dependencies (`stripe`, `redis`, `bcryptjs`, `node-cron`, `axios`, `cors`, `dotenv`, `express`, `jsonwebtoken`, `pg`, `@prisma/*`) confirmed used via grep.
- All `frontend/package.json` dependencies (`@react-three/drei`, `@react-three/fiber`, `three`) confirmed used in the 3D workspace/flagship-screen/chart components.

## 7. Unused assets — No confirmed finding

`frontend/public/` contains only the manifest, service worker, and 5 icon files — all confirmed referenced from `index.html`/`manifest.json`/`registerServiceWorker.js`. No `frontend/src/assets` directory exists.

## 8. Obsolete/dead files — Fixed (same as §4)

## 9. Stale feature flags — Reported (partially fixed)

- `VITE_PORTFOLIO_ENGINE` still genuinely branches (`PortfolioScreen.jsx` — both the legacy and Portfolio Engine code paths are live), so it's not a dead conditional. It was, however, **undocumented** — fixed this phase by adding it to `ENVIRONMENT_SETUP.md`.
- Backend's `requireFeature(featureKey)` gating (`backend/middleware/requireFeature.js`) is entitlement/plan-driven at runtime, not a build-time flag — no dead branches found.

## 10. Stale environment variables — Fixed (one), rest need follow-up

- `VITE_API_BASE_URL` and `VITE_PORTFOLIO_ENGINE` were read in real code but absent from `ENVIRONMENT_SETUP.md` — both now documented.
- A full line-by-line cross-reference of every var `backend/config/startupValidation.js` reads against the docs was not completed to exhaustion this phase — flagged as a worthwhile follow-up, not a confirmed additional gap.

## 11. Inconsistent naming — Reported (not fixed — architectural)

- Dashboard-related files use three different suffix conventions: `DashboardScreen.jsx` (Screen), `DashboardHome.jsx` (no suffix), `DashboardFeature.jsx` (Feature).
- Most screens have both a `*Screen.jsx` and a matching `*Feature.jsx` wrapper — an extra indirection layer not present for every screen (e.g. `AlertsScreen.jsx`/`SettingsScreen.jsx` have no Feature wrapper).
- Per this mission's "never rewrite working architecture" rule, this is reported only.

## 12. Inconsistent error/loading/empty states — Reported (not fixed)

- **Full shared-component adoption** (`LoadingSpinner`/`ErrorState`/`EmptyState` from `ui/`): `AdminDashboardScreen.jsx`, `AiPerformanceDashboardScreen.jsx`, `DecisionCenterScreen.jsx`, `DecisionTimelineScreen.jsx`, `ExecutiveDashboardScreen.jsx`, `HealthDashboardScreen.jsx`, `MarketPositioningScreen.jsx`, `WatchlistFoldersScreen.jsx`.
- **Partial adoption**: `HomeScreen.jsx`/`AiAnalysisScreen.jsx` (no `ErrorState`); `PortfolioScreen.jsx`/`PortfolioEngineScreen.jsx`/`RecommendationsScreen.jsx`/`WatchlistScreen.jsx` (no shared `LoadingSpinner`).
- **No shared import at all**: `AlertsScreen.jsx`, `GlobalIntelligenceScreen.jsx`, `SettingsScreen.jsx`, `NovaShowcaseScreen.jsx`.

Not changed this phase — retrofitting a shared component onto an existing, working, already-tested screen changes real runtime behavior and needs its own per-screen verification (as `HomeScreen.jsx`'s cache fix required in `REAL-WORLD-USAGE-001`), which is beyond a "cleanup only" pass's safe scope.

## 13. Inconsistent cache usage — Reported (not fixed)

- **Use `withRequestCache`**: `AiAnalysisWorkspaceScreen.jsx`, `HomeScreen.jsx`, `MarketIntelligenceWorkspaceScreen.jsx`, `MissionControlHomeScreen.jsx`, `NewsIntelligenceScreen.jsx`, `PersonalIntelligenceWorkspaceScreen.jsx`, `WatchlistWorkspaceScreen.jsx`.
- **Same on-mount summary-fetch pattern, no cache**: `AlertsScreen.jsx`, `MarketNewsScreen.jsx`, `RecommendationsScreen.jsx`, `PortfolioScreen.jsx`, `WatchlistScreen.jsx`, `AdminDashboardScreen.jsx`.

Not changed this phase for the same reason as §12 — each addition is a real behavior change requiring its own test-isolation verification per screen.

## 14. Inconsistent startup validation — Reported (not fixed — structural)

`backend/config/startupValidation.js` returns `{ valid, errors: string[], warnings: string[] }` and provides a `process.exit(1)`-calling `validateEnvironmentOrExit`. `frontend/src/startupValidation.js` returns `{ ok, issues: [{ area, key, message }] }` with no severity split and no analogous fail-hard helper. Unifying these would require touching every consumer on both sides (`server.js`, `screenRegistry.js`, and their tests) — a structural change, explicitly out of this mission's scope.

## Summary

**Fixed this phase**: 3 dead files removed, 2 undocumented env vars documented. **Identified but not committed**: 1 unused dependency (`react-router-dom`) — the fix itself was correct, but the file it lives in already carried unrelated, pre-existing uncommitted changes from outside this session, so committing it now would misattribute those changes to this phase. **Everything else** found real and reported, with an explicit reason each was left alone — consistent with this mission's "fix only objective issues" and "never rewrite working architecture" rules.
