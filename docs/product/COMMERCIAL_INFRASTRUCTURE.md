# Commercial Infrastructure — COMMERCIAL-MVP-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-07-31

## Mission

The Commercial Readiness review confirmed engineering was essentially complete, but no monetization infrastructure existed. This phase implements: authentication, user registration, login, session management, a subscription model, a vendor-agnostic billing abstraction, feature gating, usage limits, free vs. pro permissions, an upgrade API, and account management. Requirements: reuse existing architecture, never hardcode a payment vendor, all secrets via environment variables, clean REST endpoints, all premium endpoints protected, comprehensive tests.

## Final Architecture

```
User (new, real credentials)              BetaUser (existing, unchanged)
    │  passwordHash (bcryptjs)                 — an identifier, not a secret,
    │  betaUserId? (loose, optional link)      for the small trusted beta.
    │                                          Never replaced or touched.
    ▼
authService (register/login/logout/verifyToken)
    │  issues a real JWT (jsonwebtoken) + a real, revocable
    │  Session row (server-side, listable/revocable — not just a
    │  stateless bearer token)
    ▼
requireAuth middleware — fails closed always (401 on missing/invalid/
    expired/revoked token — no operator-toggled bypass, unlike the
    existing requireApiKey.js precedent it deliberately diverges from)
    │
    ├─► entitlementService — resolves the real active Plan for a user
    │     (Subscription ACTIVE/TRIALING, else honest fallback to "free")
    │     │
    │     ├─► requireFeature(key) — 403 if the resolved plan lacks it
    │     └─► requireUsageLimit(key, limitKey) — atomic UsageCounter
    │           upsert+increment per (userId, featureKey, calendar month);
    │           429 once the plan's real numeric limit is hit (null = unlimited)
    │
    └─► accountService — getAccount / upgradePlan / cancelPlan
              │
              ▼
        billingService (vendor-agnostic facade, selects provider via
              env.BILLING_PROVIDER — "manual" default | "stripe")
              │
              ├─► manualBillingProvider — real, honest, no-vendor-call
              │     default (no Stripe account required for the MVP to work)
              └─► stripeBillingProvider — real Stripe SDK calls, injectable
                    client for tests, never imported outside services/billing/

/api/v2/auth/*     — register, login, logout, me
/api/v2/billing/*  — plans (public), provider (public), webhook (vendor-facing)
/api/v2/account/*  — all routes behind requireAuth: get, upgrade, cancel
```

Nothing outside `services/billing/` ever imports the `stripe` package or references a Stripe-specific concept — `billingService`'s public surface (`createCustomer`, `createSubscription`, `cancelSubscription`, `handleWebhookEvent`, `getProviderName`) is the only contract the rest of the app depends on, mirroring this codebase's existing `baseProviderContract.js` / `providerFactory.js` pattern.

## Key Design Decisions

- **`User` is new and coexists with `BetaUser`** — not a replacement. `BetaUser` was explicitly designed as an identifier for a small trusted beta, not an auth system. `User.betaUserId` is a loose, optional string (no FK), following this schema's existing convention for beta-linkage fields, for the case where a beta participant later creates a real paying account.
- **`FeatureFlag` was not reused for plan gating.** It's an orthogonal, admin-managed ops/rollout kill-switch (`ENABLED/DISABLED/BETA_ONLY/USER_SPECIFIC`) with no notion of a plan or usage quota. Subscription-tier gating is a wholly separate `Plan`/`Subscription`/`UsageCounter`/`entitlementService` stack.
- **Real, revocable sessions**, not just stateless JWTs. Each login writes a `Session` row (`tokenHash`, `expiresAt`, `revokedAt`); logout revokes it; `requireAuth` checks both JWT validity and the session's live-in-DB status, so a stolen token stops working the instant a user logs out.
- **`requireAuth` fails closed unconditionally.** This deliberately diverges from `requireApiKey.js`, which warns-once-then-passes-through when unconfigured (an operator-toggled admin gate, fine for that use case). Real user auth must never have a silent bypass state — missing/invalid/expired/revoked is always a real 401.
- **Usage-limit enforcement is atomic.** `UsageCounter` increments via a single Prisma `upsert` with `{ count: { increment: 1 } }`, never a read-then-write, eliminating a race where two concurrent requests could both slip under a limit.
- **Account-enumeration protection.** `authService.login` throws the exact same error (`"Invalid email or password.", 401, INVALID_CREDENTIALS`) whether the email is unknown or the password is wrong.
- **`Plan.features` mixes booleans and nullable numeric limits** (e.g. `unifiedStockIntelligence: true`, `maxAiAnalysesPerMonth: 5` where `null` means genuinely unlimited — never inferred, always an explicit plan-authored value).

## Implemented Capabilities

### 1. Authentication & Registration
`authService.register(email, password)` — validates email format and an 8-character minimum password, hashes via bcryptjs, creates a real `User` row, and issues a session (see below). `authService.login(email, password)` — same session issuance on success; identical error on any failure to prevent account enumeration.

### 2. Session Management
Each successful register/login issues a real JWT (`jsonwebtoken`, `HS256`, `JWT_SECRET`/`JWT_EXPIRES_IN_SECONDS`-configured, 7-day default) carrying a random `jti` (`crypto.randomUUID()`) — added specifically after a real collision was caught in development (see Errors Found & Fixed) — alongside a server-side `Session` row keyed by the token's hash. `logout` revokes that row. `requireAuth` validates both the JWT signature/expiry and that the matching session is unrevoked.

### 3. Subscription Model & Entitlements
`Plan` (key/name/price/billingPeriod/features JSON), `Subscription` (one per user, status/billingProvider/external ids), `UsageCounter` (per user/feature/calendar-month). `entitlementService.resolveActivePlan(userId)` honestly falls back to the real `"free"` plan whenever there's no subscription or its status isn't `ACTIVE`/`TRIALING` — never fabricated or stale paid access.

### 4. Billing Abstraction
`billingService.js` is the single vendor-agnostic entry point the rest of the app calls. It resolves and caches a provider implementation purely from `env.BILLING_PROVIDER`, validating its shape against `billingProviderInterface.js`'s `REQUIRED_METHODS` before use. Two providers ship today:
- **`manualBillingProvider`** (default) — a real, honest provider with no external network calls; generates its own `manual_sub_<uuid>` ids and marks new subscriptions `ACTIVE` immediately. This is what lets the whole commercial flow work end-to-end with zero payment-vendor setup.
- **`stripeBillingProvider`** — real Stripe SDK calls (`customers.create`, `subscriptions.create/cancel`, `webhooks.constructEvent`), built via an injectable-client factory so it's fully unit-testable without a live Stripe account or network access. `mapStripeStatus` is a total, disclosed mapping from every known Stripe status to this app's own status vocabulary; any unrecognized status honestly falls back to `PAST_DUE`, never a fabricated `ACTIVE`.

Switching providers in any environment is a single env var — no code change, no conditional branches outside `services/billing/`.

### 5. Feature Gating & Usage Limits
`requireFeature(featureKey)` and `requireUsageLimit(featureKey, limitKey)` are middleware factories (composable after `requireAuth`, which must set `req.userId`). A missing feature is a 403 (`FEATURE_NOT_ENTITLED`); an exhausted numeric limit is a 429 (`USAGE_LIMIT_EXCEEDED`); a `null` limit value means unlimited and is never rejected.

### 6. Upgrade API & Account Management
`accountService.getAccount(userId)` returns the user's real profile, resolved entitlements, and current subscription (or `null`). `upgradePlan(userId, planKey, {priceId})` resolves the target `Plan` (404 `PLAN_NOT_FOUND` if unknown), reuses an existing billing-vendor customer id if one exists, delegates the actual provider call to `billingService`, and persists the result. `cancelPlan(userId)` cancels via the vendor when an external subscription id exists, else marks canceled locally (the manual provider has no external subscription to cancel against).

### 7. REST Endpoints
```
POST /api/v2/auth/register        — 201, real user + token
POST /api/v2/auth/login           — 200, real token
POST /api/v2/auth/logout          — 200, revokes the real session
GET  /api/v2/auth/me              — 200 (requireAuth) / 401

GET  /api/v2/billing/plans        — 200, public, real plan catalog
GET  /api/v2/billing/provider     — 200, public, honestly reports the configured provider
POST /api/v2/billing/webhook      — vendor-facing, not requireAuth-gated (comes from the billing vendor, not a logged-in user)

GET  /api/v2/account              — 200 (requireAuth)
POST /api/v2/account/upgrade      — 200 (requireAuth), 404 on unknown plan
POST /api/v2/account/cancel       — 200 (requireAuth), 404 if no subscription
```

## Environment Variables

```
JWT_SECRET=...                    # disclosed insecure dev/test default — MUST be overridden in real deployment
JWT_EXPIRES_IN_SECONDS=604800     # 7 days
BILLING_PROVIDER=manual           # "manual" | "stripe"
STRIPE_SECRET_KEY=                # empty by default; required only if BILLING_PROVIDER=stripe
STRIPE_WEBHOOK_SECRET=            # empty by default; required only if BILLING_PROVIDER=stripe
```

## Live End-to-End Verification

Manually verified the full real flow via HTTP (`supertest` against the live app instance): register (201, real token) → GET `/me` with token (200) → GET `/me` without token (401 `MISSING_TOKEN`) → GET `/billing/plans` (200, real free/pro catalog) → GET `/account` before upgrade (200, `plan.planKey: "free"`, `subscription: null`) → POST `/account/upgrade {planKey: "pro"}` (200, real `ACTIVE` subscription via the `manual` provider) → GET `/account` after upgrade (200, `plan.planKey: "pro"`) → POST `/auth/logout` (200) → GET `/me` after logout (401 `INVALID_TOKEN`, confirming real session revocation). Every step behaved exactly as designed.

## Errors Found & Fixed During Development

1. **JWT token collision.** `jwt.sign({ sub: userId }, ...)` with an identical payload/secret/`expiresIn` produced a byte-identical token when issued twice for the same user within the same real second (`iat` is second-granularity) — reproduced by a real register-then-login test, which hit `Session.tokenHash`'s unique constraint. **Fix:** added a random `jti` (`crypto.randomUUID()`) to every issued JWT.
2. **Prisma `upsert`'s `create` branch requiring `planId` on an update-only call.** `cancelPlan` called `subscriptionRepository.upsertForUser(userId, { status, cancelAtPeriodEnd })` for an existing subscription, but Prisma type-checks the `create` object even when only the `update` branch executes, and it's missing `planId`. **Fix:** added a dedicated `updateForUser(userId, data)` using a plain `prisma.subscription.update()` with no `create` branch; `cancelPlan` and the billing webhook handler now use it, while `upgradePlan` (a real create-or-update path) still correctly uses `upsertForUser`.

## Tests

- `authService.test.js` — 12/12
- `entitlementService.test.js` — 7/7
- `accountService.test.js` — 7/7
- `billing/billingService.test.js` — 7/7
- `billing/billingProviderInterface.test.js` — 3/3
- `billing/providers/stripeBillingProvider.test.js` — 7/7 (injected fake Stripe client, no real network)
- `middleware/requireAuth.test.js` — 7/7
- `middleware/requireFeature.test.js` — 5/5
- `routes/commercial.integration.test.js` (new, `supertest` + real HTTP) — 15/15: register/login/me flows, duplicate-email 409, wrong-password 401, every `/account/*` route rejecting unauthenticated requests, a real upgrade round trip reflected on a subsequent `GET /account`, unknown-plan 404, cancel flow, logout-then-rejected, and a governance-field-denylist check on a protected response body.

**Full backend regression** (`node --test --test-concurrency=1` across the entire suite): **2478/2480 passing.** The only 2 failures are the pre-existing, already-disclosed `intelligenceBus` `lifecycle:` supersession flakes (unrelated to this phase, documented in prior sprint reports) — zero new failures introduced.

**Frontend** (`npm run test`): passing, no regressions from this phase (this phase touched no frontend code).

## Known Limitations (Disclosed, MVP Scope)

- **Stripe webhook raw-body verification.** `app.js`'s global `express.json()` middleware parses the request body before the webhook route ever sees it, which would break real Stripe signature verification (`webhooks.constructEvent` needs the raw, unparsed body) in a live Stripe deployment. Restructuring global middleware for one route was judged out of scope/risk for this phase; the `stripeBillingProvider`'s webhook logic itself is real and fully unit-tested against an injected client, but the raw-body wiring in `app.js` is a real gap to close before enabling `BILLING_PROVIDER=stripe` against production Stripe traffic.
- No password-reset flow.
- No email-verification flow.
- No rate-limiting specific to auth endpoints beyond the existing global rate limiter.
- `stripeBillingProvider` has never been exercised against a live Stripe account — only unit-tested via an injected fake client.

## Files Changed

**Schema:** `backend/prisma/schema.prisma` (+`User`, `Session`, `Plan`, `Subscription`, `UsageCounter`), migration `20260731080416_commercial_infrastructure`.

**Config:** `backend/config/env.js`, `backend/.env.example` — `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `BILLING_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

**New services:** `userRepository.js`, `sessionRepository.js`, `planRepository.js`, `subscriptionRepository.js`, `usageCounterRepository.js`, `authService.js`, `entitlementService.js`, `accountService.js`, `billing/billingProviderInterface.js`, `billing/billingService.js`, `billing/providers/manualBillingProvider.js`, `billing/providers/stripeBillingProvider.js`.

**New middleware:** `requireAuth.js`, `requireFeature.js`.

**New controllers:** `authController.js`, `billingController.js`, `accountController.js`.

**New routes:** `authRoutes.js`, `billingRoutes.js`, `accountRoutes.js`; mounted in `routes/index.js` at `/v2/auth`, `/v2/billing`, `/v2/account`.

**New script:** `scripts/seedPlans.js` (idempotent; seeded `free`/`pro` against the dev DB).

**Test infra:** `backend/test/dbHelpers.js` extended to truncate the 5 new tables.

**New tests:** all files listed under Tests above, plus `backend/routes/commercial.integration.test.js`.
