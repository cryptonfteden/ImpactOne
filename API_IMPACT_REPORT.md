# API Impact Report — Phase F2

Design only — no code changed. Every endpoint/service below is listed with its exact current behavior (verified) and its proposed change, to scope the real blast radius before any implementation is requested.

## New Surface

| Endpoint | Method | Purpose | Request | Response |
|---|---|---|---|---|
| `/api/v2/beta/resolve` | GET | Resolve a founder-issued invite code to a `betaUserId`, once, at onboarding | `?code=ABC123` | `{ betaUserId, label }` or `404` if unknown |

This is the only genuinely new endpoint. Everything else below is an additive change to existing, already-shipped endpoints.

## New Middleware

`backend/app.js` — one new middleware inserted between `express.json()` and the route mount. Reads `X-Beta-User-Id` header, validates it against `BetaUser` (best-effort — invalid/absent header does not error the request), attaches `req.betaUserId` (string or `undefined`). No existing middleware (`cors`, `errorHandler`) is modified.

## Modified Services — Signature Changes, All Backward Compatible

Every function below gains one new **optional** parameter. Every existing call site (including all existing tests) continues to work unchanged by simply not passing it — default behavior is identical to today's singleton/global lookup.

| Service / Function | File | Current signature | Proposed signature | Current behavior when param omitted |
|---|---|---|---|---|
| `getOrCreateDefaultPortfolio()` | `backend/services/portfolioRepository.js` | `()` | `(betaUserId?)` | Exact current behavior — `findFirst({ name: "Default Portfolio" })` |
| `getInvestorProfile()` | `backend/services/investorProfileRepository.js` | `()` | `(betaUserId?)` | Exact current behavior — oldest row by `createdAt` |
| `listActive()`, `listAll()`, `getActiveForSymbol()` | `backend/services/autonomousRecommendationRepository.js` | `({status, symbol, limit})` | `({status, symbol, limit, betaUserId})` | Exact current behavior — global, unfiltered by user |
| `createFeedback()`, `listFeedbackForRecommendation()` | `backend/services/autonomousRecommendationRepository.js` | `({recommendationId, feedbackType})` | `({recommendationId, feedbackType, betaUserId})` | Exact current behavior — no user field written/read |
| `recordEvent()` | `backend/services/analyticsService.js` | `({eventName, properties, sessionId})` | `({eventName, properties, sessionId, betaUserId})` | Exact current behavior — anonymous, `sessionId`-only |
| `evaluateSymbol()` (writes `Recommendation`) | `backend/services/autonomousRecommendationEngine.js` | writes `betaUserId`-less row | writes `betaUserId: req.betaUserId ?? null` sourced from the calling controller | Existing rows/behavior unaffected when the engine runs without a resolved beta user (e.g. the scheduled global cron run — see "Open Design Question" below) |

## Controllers/Routes — Where `req.betaUserId` Gets Threaded Through

Every controller that currently calls one of the functions above passes `req.betaUserId` through, unchanged otherwise:
- `backend/controllers/portfolioEngineController.js` (all handlers — summary, place order, reset, etc.)
- `backend/controllers/investorProfileController.js`
- `backend/controllers/autonomousRecommendationController.js` (list, feedback endpoints)
- `backend/controllers/analyticsController.js`

No route path changes, no request/response shape changes to any existing field — `betaUserId` is read from the header by middleware, not from the request body or query string, so no existing frontend call site needs to change its payload shape (only `apiClient.js`'s header injection, see below).

## Frontend Changes

| File | Change |
|---|---|
| `frontend/src/services/api/apiClient.js` | One new line: if `localStorage.getItem("impactone-beta-user-id")` is set, attach it as `X-Beta-User-Id` on every request — same pattern as the existing `Content-Type` header. |
| `frontend/src/screens/onboarding/OnboardingFlow.jsx` | New optional step: enter invite code, call `/api/v2/beta/resolve`, store the returned `betaUserId` in `localStorage`. If skipped (or no code), the app behaves exactly as it does today (no header sent, singleton behavior). |
| `frontend/src/utils/analytics.js` | No change required — `betaUserId` is attached at the HTTP layer (`apiClient.js`), not inside `trackEvent`'s own payload construction. |

## Response Shape Changes

**None.** No existing endpoint's response JSON shape changes — `betaUserId` is an internal scoping key, never proposed to be exposed in any existing response payload (avoids any frontend component needing to change how it reads existing data).

## Test Impact

- All existing backend tests continue to pass unmodified — every touched function's new parameter is optional and defaults to current behavior; no existing test call site needs updating.
- New tests would be needed only for: the new `/api/v2/beta/resolve` endpoint, the new middleware's header-resolution logic, and one regression test per modified repository function proving "omitted `betaUserId` behaves identically to before this change" (the single most important test category, given backward compatibility is this design's core constraint).
- No existing frontend test needs updating — `apiClient.js`'s new header logic is additive and only activates when the new localStorage key is present, which no existing test sets.

## Open Design Question (flagged, not resolved — for founder decision before implementation)

The recommendation engine currently runs on a schedule (`schedulerService.js`), not per-request — there is no `req.betaUserId` in that context. Two options, not decided here:
1. **Shared recommendations, scoped portfolios** — the engine keeps running globally (one set of recommendations, `betaUserId: null`), and only Portfolio/InvestorProfile/Feedback/Analytics are truly per-user. Simpler, smaller blast radius.
2. **Per-user recommendation runs** — the scheduler loops over all 5 `BetaUser` rows, running `evaluateSymbol()` once per user's own portfolio/watchlist context, writing `betaUserId`-tagged recommendations for each. Matches the mission's literal "Separate Recommendation History" requirement more precisely, but is materially more implementation work (5x the engine runs per cycle) and was the one place this design could not stay "smallest possible" without a decision from the founder on which tradeoff the beta actually needs.

This report recommends **Option 1** as the default for the initial implementation (smallest change, matches "do not design a SaaS platform"), with Option 2 documented as the natural, additive next step if the beta reveals users need genuinely distinct recommendation feeds rather than a shared feed with per-user portfolios.
