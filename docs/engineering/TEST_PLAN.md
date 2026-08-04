# ImpactOne MVP Test Plan

**Document Type:** Test Plan  
**Scope:** Entire MVP  
**Status:** Planning document only; no application code is changed by this file  
**Date:** 2026-07-11

---

## 1. Purpose

This document defines the testing strategy for the remaining ImpactOne MVP. It covers automated and manual validation for the user journey from first launch through daily use, including onboarding, dashboard, search, ticker analysis, watchlists, portfolio intelligence, alerts, settings, and billing.

The goal is to ensure the MVP is:

- Correct
- Stable
- Fast enough for daily use
- Secure enough for user and portfolio data
- Ready for controlled launch or pilot rollout

---

## 2. Testing Principles

- Test user journeys, not only isolated functions.
- Verify both happy paths and failure modes.
- Prefer deterministic assertions for AI-backed flows where possible.
- Every MVP screen must have coverage for empty, loading, and error states.
- Backend contract changes must be validated before frontend assumptions are finalized.
- Tests should protect the decision-first UX, not only UI rendering.

---

## 3. Current Test Surface

The repository currently includes the following runnable test surfaces:

- Backend unit tests via `npm run test:backend`
- Frontend tests via `npm run test:frontend`
- Combined test command via `npm test`

Known existing test files at the time of this plan:

- `backend/services/openaiService.test.js`
- `backend/services/portfolioEngineService.test.js`
- `backend/routes/portfolioEngine.integration.test.js`
- `frontend/src/screens/PortfolioScreen.test.jsx`
- `frontend/src/hooks/usePortfolioEngine.test.js`

This plan assumes those tests remain part of the baseline and that new coverage will be added for the rest of the MVP.

---

## 4. Test Scope by Layer

### 4.1 Unit Tests

#### Purpose

Validate individual functions, services, hooks, and helper logic in isolation.

#### Target Areas

Backend unit tests:
- `backend/services/openaiService.js`
- `backend/services/marketImpactService.js`
- `backend/services/dailyBriefService.js`
- `backend/services/autonomousMarketService.js`
- `backend/services/impactIntelligenceService.js`
- `backend/services/comparisonService.js`
- `backend/services/finnhubService.js`
- `backend/services/altDataService.js`
- `backend/services/portfolioEngineService.js`
- `backend/services/portfolioRepository.js`
- `backend/services/investmentCommitteeService.js`
- `backend/services/committeeTrackRecordService.js`
- `backend/services/intelligenceCache.js`
- `backend/services/finnhubCache.js`
- `backend/services/altDataCache.js`

Frontend unit tests:
- `frontend/src/hooks/usePortfolioEngine.js`
- `frontend/src/hooks/useWatchlist.js`
- `frontend/src/services/api/*`
- `frontend/src/components/ui/*`
- `frontend/src/components/KpiCard.jsx`
- `frontend/src/components/SectionCard.jsx`
- `frontend/src/components/SafeValue.jsx`
- `frontend/src/components/WatchlistTable.jsx`

#### Required Assertions

- Correct return shapes
- Fallback behavior when providers fail
- Cache hit and cache expiry behavior
- Calculation correctness for P/L, exposure, rankings, and scores
- Error normalization and user-friendly messages
- Hook state transitions and mutation side effects

#### Priority

High

---

### 4.2 Integration Tests

#### Purpose

Validate that controllers, routes, services, and persistence layers work together correctly.

#### Target Areas

Backend integration tests:
- `/api/quote`
- `/api/ai/analyze`
- `/api/compare`
- `/api/watchlist`
- `/api/news`
- `/api/market`
- `/api/alt-data/*`
- `/api/intelligence/*`
- `/api/v2/portfolio/*`

#### Required Assertions

- Correct HTTP status codes
- Stable response contracts
- Required fields present in payloads
- Graceful degradation when upstream providers are unavailable
- Prisma-backed portfolio persistence and transaction atomicity
- Correct route mounting and router composition
- Correct query param handling and input validation

#### Priority

Very high

---

### 4.3 End-to-End Tests

#### Purpose

Validate complete user flows in a browser from first launch through daily use.

#### Target Journeys

1. Public landing to signup
2. Signup to onboarding
3. Onboarding to dashboard
4. Dashboard to ask/search experience
5. Dashboard to ticker analysis
6. Watchlist management
7. Portfolio view and risk review
8. Alerts and intelligence feed review
9. Settings and billing flows

#### Required Assertions

- A new user can complete first-run setup without blockers.
- The dashboard renders in its intended hierarchy.
- Search and ticker analysis produce usable results.
- Watchlists and saved ideas persist correctly.
- Portfolio and alert views are reachable from the main shell.
- Empty states and error states are visible and understandable.

#### Tooling Recommendation

The repo does not currently show an E2E framework. Add one of the following for launch readiness:
- Playwright preferred
- Cypress acceptable if already in team use

#### Priority

High for launch readiness

---

## 5. Unit Test Plan

### 5.1 Backend Unit Test Coverage

#### OpenAI / AI fallback logic
- Falls back when API quota is exhausted
- Returns structured summary with symbol, thesis, risks, and source metadata
- Handles provider errors without crashing

#### Market impact and intelligence scoring
- Computes scores deterministically
- Applies expected weighting for news, momentum, sentiment, and volatility
- Produces bounded confidence and actionability values

#### Daily brief generation
- Produces summary even when AI provider is unavailable
- Includes what changed since yesterday
- Prioritizes relevance scores correctly

#### Autonomous market system
- Ranks alerts by relevance
- Suppresses low-signal noise
- Generates overview and change windows consistently

#### Comparison service
- Compares base ticker against peers
- Preserves stable sort order and score ordering
- Handles missing peer data gracefully

#### Portfolio engine service
- Creates new portfolio on first access
- Buys and sells update cash, positions, trades, and ledger correctly
- Rejects invalid orders
- Calculates realized and unrealized P/L correctly
- Captures snapshots and resets state correctly

#### Committee and track record logic
- Aggregates agent views into a CIO summary
- Calculates disagreement and confidence correctly
- Stores and retrieves track record entries correctly

### 5.2 Frontend Unit Test Coverage

#### Hooks
- `usePortfolioEngine`
- `useWatchlist`
- Any future dashboard-specific hook used for fetching or local state

Assertions:
- Initial load behavior
- Loading/error transitions
- Mutation refresh behavior
- Recovery after failed mutations

#### UI primitives
- Button variants and states
- Card variants
- Input validation and state display
- Empty state and error state components

#### Screen-level render tests
- Dashboard screen
- Portfolio screen
- Watchlist screen
- AI analysis screen
- Alerts screen
- Settings screen

Assertions:
- Correct heading and section presence
- No crashes in empty state
- Primary CTA presence
- Correct conditional rendering by feature flags

---

## 6. Integration Test Plan

### 6.1 Backend Route Integration

#### Required Scenarios

- `GET /health` returns healthy status
- `GET /api/quote?symbol=AAPL` returns normalized quote payload
- `GET /api/compare?symbol=AAPL` returns base and peer comparison payload
- `POST /api/ai/analyze` returns structured report and fallback behavior
- `GET /api/intelligence/overview` returns a coherent home payload
- `GET /api/intelligence/daily-brief` returns relevance-ranked brief data
- `GET /api/intelligence/live-feed` returns normalized live feed items
- `GET /api/v2/portfolio` returns persisted portfolio summary
- `POST /api/v2/portfolio/order` executes atomic order flow

#### Required Assertions

- 200 / 400 / 404 / 500 behavior is consistent
- Inputs are validated
- Response shape matches frontend expectations
- External provider failures do not break the route

### 6.2 Database Integration

#### Required Scenarios

- Prisma schema is valid
- Migrations apply to dev and test databases
- Test database isolation is preserved
- Portfolio tables are truncated between tests
- Order, trade, ledger, and snapshot records persist correctly

#### Required Assertions

- No cross-test data leakage
- No accidental writes to test vs dev databases
- Transaction rollbacks or validation failures preserve state integrity

---

## 7. End-to-End Test Plan

### 7.1 First Launch Flow

1. Visit landing page.
2. Start signup.
3. Complete account creation.
4. Enter onboarding.
5. Select investor style and goals.
6. Add watchlist or portfolio.
7. Land on dashboard.

Assertions:
- Progression is smooth.
- No dead ends.
- Personalized content appears after setup.

### 7.2 Daily Usage Flow

1. Open dashboard.
2. Read daily brief.
3. Review prioritized items.
4. Open Ask ImpactOne.
5. Inspect a ticker.
6. Save or dismiss an item.

Assertions:
- Dashboard surfaces meaningful actions immediately.
- User can move from summary to detail without friction.

### 7.3 Portfolio Flow

1. Open portfolio screen.
2. Review risk and allocation.
3. Open a position.
4. Run a scenario or inspect exposure.

Assertions:
- Portfolio data is understandable.
- Actions are discoverable.

### 7.4 Alerts and Discovery Flow

1. Open alerts feed.
2. Filter by severity.
3. Open a high-priority item.
4. Save an opportunity or mute a noisy source.

Assertions:
- Feed ranking feels relevant.
- User can control noise.

### 7.5 Settings and Billing Flow

1. Open settings.
2. Adjust notification or personalization preferences.
3. Open billing.
4. Compare plan tiers.

Assertions:
- Changes are saved correctly.
- Upgrade path is clear.

---

## 8. Edge Cases

The following edge cases must be tested across screens and APIs:

- Empty watchlist
- Empty portfolio
- Empty daily brief history
- No market data available
- AI provider unavailable
- Search query too vague
- Duplicate tickers in import
- Invalid ticker symbol
- Partial provider response
- Stale cache data
- Delayed market feed
- Zero positions in portfolio engine
- Sell order larger than current holdings
- Buy order exceeding available cash
- Network timeout during dashboard load
- Refresh while a previous request is in flight
- Mobile viewport too narrow for dense tables
- Very long ticker names or company names
- High volatility causing rapid alert updates

Expected behavior:
- Never crash the screen.
- Always show meaningful fallback copy.
- Preserve user input when possible.
- Make failure visible and understandable.

---

## 9. Error Scenarios

### Backend Errors

- Provider 429 quota exhaustion
- Provider 401 / unauthorized
- Provider 500 / upstream failure
- Database unavailable
- Prisma migration mismatch
- Transaction failure
- Invalid payload or malformed request

### Frontend Errors

- Route failure
- Component fetch failure
- State hydration failure
- Feature flag mismatch
- Rendering failure in a deep child component

### Required Error Handling Expectations

- Surface a user-friendly message.
- Keep the rest of the UI usable where possible.
- Offer retry actions when appropriate.
- Avoid silent failures.

---

## 10. Performance Tests

### Backend Performance Checks

- Dashboard overview endpoint response time
- Daily brief generation latency
- Quote and compare endpoint latency
- Portfolio engine summary retrieval latency
- Route concurrency under repeated calls

### Frontend Performance Checks

- Time to first meaningful paint on dashboard
- Time to usable dashboard after initial load
- Initial render cost of dense tables and cards
- Route switch time between dashboard, analysis, and portfolio

### Load Expectations

- Dashboard should remain responsive under normal retail usage patterns.
- AI fallback and cached paths should reduce latency spikes.
- Live-feed views should remain usable under bursty updates.

### Acceptance Guidance

- No single MVP screen should feel blocked by heavy loading.
- Data should appear progressively, not all at once.
- Long lists should not freeze the interface.

---

## 11. Security Checks

### Required Security Validation

- No secrets committed to repo files
- Environment variables loaded from env files only, not hardcoded
- Input validation on all user-facing endpoints
- Protection against malformed ticker input and query injection patterns
- Safe handling of external provider failures and response data
- No sensitive portfolio information exposed in public routes
- Route access should respect intended feature boundaries
- Local storage should not store secrets
- Error messages must not expose stack traces or credentials

### Operational Security Checks

- Confirm dev and test databases are separated
- Confirm test suite never writes to production-equivalent data
- Confirm fallback behavior does not leak private provider details

---

## 12. Manual QA Checklist

### First-Run Setup

- Landing page explains the product clearly.
- Signup completes without confusion.
- Onboarding feels short and skippable where appropriate.
- A personalized dashboard appears after setup.

### Dashboard

- Daily brief is visible above the fold.
- Priority cards are ranked and understandable.
- AI panel responds to a question.
- Empty states feel intentional, not broken.

### Search and Analysis

- Ticker search finds a valid result.
- AI analysis opens with a coherent summary.
- Comparison view is readable.
- Sources and confidence are visible.

### Watchlists

- Watchlist entries can be added and removed.
- Priority ranking is understandable.
- Suggestions are relevant.

### Portfolio

- Portfolio summary renders correctly.
- Exposure and risk are easy to interpret.
- Order flow works in the intended MVP path.

### Alerts and Intelligence

- Alerts are prioritized sensibly.
- Feed can be filtered.
- Global intelligence views render and are navigable.

### Settings and Billing

- Preferences can be changed and saved.
- Billing page shows the correct plan tiers.
- Upgrade path is clear.

### Responsive QA

- Mobile layout is usable.
- Tablet layout preserves hierarchy.
- Desktop layout has no overlap or clipping.

### Error Handling QA

- Simulate provider failure.
- Simulate empty data.
- Simulate slow network.
- Simulate stale data.
- Confirm the app stays usable.

---

## 13. Test Data Requirements

Use representative sample data for:

- High-liquidity large-cap equities
- Lower-liquidity symbols
- Multiple sectors
- Empty portfolio
- Small portfolio
- Concentrated portfolio
- Bullish, bearish, and neutral market days
- Simulated provider outage cases

Suggested examples:
- AAPL
- NVDA
- MSFT
- AMAT
- AMD
- PLTR
- TSLA
- SPY

---

## 14. Test Execution Order

1. Run backend unit tests.
2. Run backend integration tests.
3. Run frontend component and hook tests.
4. Run end-to-end tests.
5. Run manual QA checklist.
6. Run security and performance smoke checks.
7. Re-run targeted regressions for any failed area.

Recommended commands from the existing repo:

- `npm run test:backend`
- `npm run test:frontend`
- `npm test`

If an E2E framework is added later, include its command here in the same section.

---

## 15. Exit Criteria for MVP Readiness

The MVP is test-ready for launch when all of the following are true:

- Core user flows are covered by tests.
- Backend APIs return stable, validated payloads.
- The dashboard and major screens have empty/loading/error state coverage.
- Known edge cases are handled gracefully.
- Security checks pass for the MVP surface.
- Performance is acceptable for the intended daily-use workflow.
- Manual QA confirms the product is coherent on mobile, tablet, and desktop.

---

## 16. Open Testing Gaps to Address Later

The following are likely to require follow-up as the MVP matures:

- Full browser-based E2E automation if not added in MVP
- Visual regression tooling for high-density dashboard surfaces
- Broader accessibility automation
- Performance baselines with real-world data volume
- More extensive security scanning and dependency auditing

These are not blockers for a test plan, but they should be scheduled before broad launch.
