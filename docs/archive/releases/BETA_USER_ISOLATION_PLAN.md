# Beta User Isolation Plan — Phase F2

Design only — no code changes. Smallest change that gives 5 known beta users separate data, without building authentication, sessions, or a multi-tenant platform.

## Current State (verified against real code)

Every relevant model today is a true global singleton or fully unscoped table:
- **Portfolio** — matched by hardcoded `name: "Default Portfolio"` (`portfolioRepository.findDefaultPortfolio`). One portfolio, ever.
- **InvestorProfile** — the oldest row, full stop (`findFirst({ orderBy: { createdAt: "asc" } })`).
- **Recommendation / DecisionTrace / Outcome / RecommendationFeedback** — no scoping field of any kind; every read is global across the whole table.
- **AnalyticsEvent** — a real, already-working anonymous `sessionId` (per-browser UUID, localStorage), but no identity beyond that.
- No request-level identity middleware exists in `backend/app.js`; no identifying header is attached to any API request today (`apiClient.js` sends none).

This is why the design below is additive and narrow — there is no existing per-user concept to migrate away from, only a singleton to add a key to.

## Design: A Single `BetaUser` Identifier, Not a Login System

### The identifier
A `BetaUser` row per beta participant: `id`, `label` (e.g. "Beta User 1" or a first name — founder's choice, not a username/password), `inviteCode` (a short, founder-issued string, unique), `createdAt`. Five rows, created once by the founder directly in the database or via a tiny one-off script — **not** a signup flow. This directly matches Phase F1's "beta cohort identifier" idea, now given a real, minimal schema shape.

### How a beta user's browser gets one
At onboarding (reusing Phase F1's proposed "how did you hear about this beta" field, now made functional): the user enters their invite code once. The frontend resolves it once against a new, tiny endpoint (`GET /api/v2/beta/resolve?code=...`), gets back a `betaUserId`, and stores it in `localStorage` under a new key (`impactone-beta-user-id`) — the exact same pattern already used for `impactone-session-id` and `impactone-onboarded`. No password, no session expiry, no login screen.

### How every request carries it
`apiClient.js` gains one line: attach `betaUserId` (if present in localStorage) as a header, `X-Beta-User-Id`, on every request — the same place `Content-Type` is already set today, extending an existing mechanism rather than inventing a new one.

### How the backend resolves it
One new, small Express middleware in `backend/app.js`, inserted between `express.json()` and the route mount — the exact insertion point the research confirmed is currently empty. It reads `X-Beta-User-Id`, validates it's a real `BetaUser` id (or silently no-ops if absent/invalid — see Backward Compatibility below), and attaches `req.betaUserId`. Every service that currently does a singleton lookup gains one optional parameter, defaulting to today's exact behavior when it's absent.

### What gets scoped, and how

| Requirement | Mechanism |
|---|---|
| Separate Portfolio | `Portfolio` gets a nullable `betaUserId` column. `getOrCreateDefaultPortfolio()` becomes `getOrCreateDefaultPortfolio(betaUserId)` — looks up by `betaUserId` when present, falls back to the existing `name: "Default Portfolio"` singleton lookup when absent. Each beta user's first portfolio action auto-creates their own row. |
| Separate InvestorProfile | Same pattern: `InvestorProfile` gets a nullable `betaUserId` column; lookup becomes `findFirst({ where: { betaUserId } })` when present, unchanged singleton behavior when absent. |
| Separate Recommendation History | `Recommendation` gets a nullable `betaUserId` column, set at creation time from the portfolio/watchlist context already flowing through `autonomousRecommendationEngine.js`'s `evaluateSymbol()`. `DecisionTrace` and `Outcome` need **no new column** — they key off `recommendationId`, so scoping is inherited transitively by joining through the already-existing relation. Listing/filtering endpoints add an optional `betaUserId` filter, matching the existing optional `status`/`symbol` filter pattern in `autonomousRecommendationRepository.js`. |
| Separate Analytics attribution | `AnalyticsEvent` gets a nullable `betaUserId` column, populated by the same new middleware, sent alongside the sessionId that's already collected — additive, not a replacement for the existing anonymous-by-default design. |
| Separate Feedback | `RecommendationFeedback` gets a nullable `betaUserId` column, populated the same way, at write time. |

### Backward Compatibility (critical design constraint)

Every column is **nullable**, every lookup **falls back to today's exact singleton/global behavior** when no `betaUserId` is present. This means:
- Local dev, existing tests, and any request without the new header behave identically to today — zero forced migration for non-beta usage.
- The 279+ pre-existing recommendations and the existing default Portfolio/InvestorProfile simply have `betaUserId: null` and remain reachable exactly as before, under a "no beta user" default identity.
- Rolling this out is reversible at any point by simply not sending the header — no data loss, no schema rollback required to disable it.

### Explicitly Not Built

- No password, no session expiry, no JWT/cookie auth — an invite code resolved once into a stored id is the entire "auth" surface, appropriate for 5 known, personally-onboarded people.
- No per-user rate limiting, permissions, or roles — all 5 users get identical product access; isolation is about data separation, not access control.
- No admin UI to manage `BetaUser` rows — founder manages the 5 rows directly (SQL or a one-off script), consistent with this being infrastructure for a 5-person beta, not a product feature.
- No change to `WorldMemoryRecord`/lessons/provider infrastructure — these are explicitly shared, cross-user learning substrate by original design (per the schema's own comments) and out of scope for per-user isolation.

## Why This Is the Smallest Sufficient Design

Every alternative considered and rejected:
- **Full auth (email+password, sessions)** — solves a problem this beta doesn't have (untrusted signups); the 5 users are known in advance.
- **Subdomain/database-per-user** — real infrastructure cost for 5 people; the nullable-column approach reuses one database, one deploy, one codebase path.
- **Cookie-based sessions** — requires session infrastructure (store, expiry, CSRF handling) that a static, founder-issued invite code doesn't need.
- **Scoping via the existing anonymous `sessionId`** — rejected because it's explicitly designed to regenerate/reset per Phase F1's own analytics design; a beta user's identity must survive a cleared localStorage in the sense of being re-resolvable via their invite code, which `sessionId` alone cannot provide.

See `DATABASE_MIGRATION_PLAN.md` for exact schema changes and `API_IMPACT_REPORT.md` for every touched endpoint/service.
