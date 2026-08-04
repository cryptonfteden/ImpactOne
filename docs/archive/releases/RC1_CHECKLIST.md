# RC1 Checklist — RELEASE-CANDIDATE-001

Go/no-go list for Release Candidate 1, consolidating this phase's audit and the three prior deployment-readiness phases (`PHONE-INSTALLATION-001`, `FOUNDER-DEPLOYMENT-001`, `REAL-PHONE-PILOT-001`).

## Code Cleanliness (This Phase)

- [x] Dead components removed (`KpiCard.jsx`, `WatchlistTable.jsx`, `AIInsightsSidebar.jsx`).
- [ ] Remove the confirmed-unused `react-router-dom` from root `package.json` — identified this phase but not committed, since the file already carries unrelated, pre-existing uncommitted additions (`bcryptjs`, `jsonwebtoken`, `stripe`) from outside this session that would otherwise be swept into this commit. Whoever owns those pending additions should commit them (or explicitly abandon them) first, then this removal can go in cleanly. See `REPOSITORY_CLEANUP.md`.
- [x] Previously undocumented env vars documented (`VITE_API_BASE_URL`, `VITE_PORTFOLIO_ENGINE`).
- [ ] Decide the fate of `frontend/src/components/nova/Loading.jsx`'s duplicate `EmptyState`/`OfflineBanner` (either retire them in favor of the real, wired-in `ui/`/`OfflineBanner.jsx` versions, or explicitly document `nova/` as an intentional, standalone design-system catalog that isn't meant to be deduplicated against production components).
- [ ] Consider a follow-up phase to extend `withRequestCache` to the remaining screens identified in `TECHNICAL_DEBT_REPORT.md` §13 (`AlertsScreen.jsx`, `MarketNewsScreen.jsx`, `RecommendationsScreen.jsx`, `PortfolioScreen.jsx`, `WatchlistScreen.jsx`, `AdminDashboardScreen.jsx`) — each needs its own test-isolation verification, same as `HomeScreen.jsx`'s fix.
- [ ] Consider a follow-up phase to retrofit shared `LoadingSpinner`/`ErrorState`/`EmptyState` onto the screens identified in §12 with no shared import at all.

## Deployment Readiness (Prior Phases, Still Current)

- [x] PWA manifest/service worker/update mechanism verified (`PHONE-INSTALLATION-001`).
- [x] Production API-origin validation in place (`validateOrigins()`).
- [x] Startup validation fails fast on missing `DATABASE_URL`/`JWT_SECRET` in production; warns on missing `CORS_ALLOWED_ORIGINS`/`ADMIN_API_KEY`/`REDIS_URL` (`FOUNDER-DEPLOYMENT-001`).
- [x] Health/readiness endpoints verified against a real running instance (`REAL-PHONE-PILOT-001`).
- [ ] Real hosting platform, domain, and production secrets — still an operator decision, not made by any phase to date.
- [ ] Live `SIGTERM`/graceful-restart test against an isolated production process under a real supervisor — open per `PRODUCTION_INCIDENTS.md` Incident 1.
- [ ] Founder's real Android phone install/launch/rotate/offline verification — requires the physical device.

## Regression Evidence (This Phase)

- [x] Backend full regression — 2502/2504 passing (2 pre-existing, unrelated date-fixture failures — see `PRODUCTION_INCIDENTS.md`).
- [x] Frontend full regression — 621/621 passing.
- [x] Production build — succeeded after every cleanup change.

## Sign-Off

RC1 is code-clean of the objective, safely-fixable debt found this phase. It is not yet "shipped" — the remaining unchecked items above are either follow-up engineering work (candidates for a future phase, not blockers to calling this RC1) or operator/physical-device actions no phase in this session can perform. Nothing on this list was marked done without a real, cited verification.
