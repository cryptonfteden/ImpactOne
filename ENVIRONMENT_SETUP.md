# Environment Setup

Real, current instructions for configuring and running ImpactOne's backend outside of local dev — there is no Dockerfile in this repository, so this documents the actual, bare-Node.js deployment shape (a process manager or orchestrator invoking `node backend/server.js` directly).

## Required Environment Variables

These have no safe default and **must** be set for the process to start against a real deployment:

| Variable | Required in | Notes |
|---|---|---|
| `DATABASE_URL` | Always | Real Postgres connection string. Missing this is a fatal startup error in every environment. |
| `JWT_SECRET` | Production | A real, random secret. In `NODE_ENV=production`, leaving this unset (or equal to the known insecure dev default) is a fatal startup error — see `backend/config/startupValidation.js`. |

## Conditionally Required

| Variable | Required when | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `BILLING_PROVIDER=stripe` | Fatal startup error if missing while Stripe is selected. |
| `STRIPE_WEBHOOK_SECRET` | `BILLING_PROVIDER=stripe` | Same as above. |

## Recommended for Production (warn-only if missing)

| Variable | Effect if unset |
|---|---|
| `ADMIN_API_KEY` | Admin-only routes run unprotected. |
| `REDIS_URL` | Provider cache runs uncached — every provider call hits the real upstream API directly (functionally correct, just slower/costlier). |
| `CORS_ALLOWED_ORIGINS` | CORS allows every origin. |

## Frontend Build-Time Variables

| Variable | Effect if unset | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | Falls back to `http://localhost:5000/api`, baked into the production bundle — unreachable from a real device. Flagged by `startupValidation.js`'s `validateOrigins()` in production builds. | Set at frontend build time, not runtime. See `PRODUCTION_ENVIRONMENT_MATRIX.md`. |
| `VITE_PORTFOLIO_ENGINE` | Falls back to the legacy, localStorage-driven Portfolio screen. | `"api"` selects the newer, server-owned Portfolio Engine screen. Either value is a fully supported, working code path — not a work-in-progress flag. |
| `VITE_DEV_CONSOLE` | Internal-only nav items (Intelligence Console, Health Dashboard, Admin Dashboard, AI Performance Dashboard) stay hidden. | Set to `"true"` to reveal them in Sidebar/Profile "More" nav. Never set in a real production build — these are internal diagnostics only. |

## Full Variable Reference

```
PORT=5000
NODE_ENV=production

# Real database (required)
DATABASE_URL=postgresql://user:pass@host:5432/impactone_prod?schema=public
DATABASE_URL_TEST=                         # only needed to run the test suite

# Market/news/data providers (each degrades gracefully if unset — see
# each provider's own existing fallback behavior from prior phases)
OPENAI_API_KEY=
FINNHUB_API_KEY=
POLYGON_API_KEY=
NEWS_API_KEY=
ALPHA_VANTAGE_API_KEY=
SEC_EDGAR_USER_AGENT=YourOrgName YourAgent contact@your-real-domain.com

# Admin route protection (recommended)
ADMIN_API_KEY=a-real-random-string

# Provider cache (recommended)
REDIS_URL=redis://your-real-redis-host:6379
REDIS_CACHE_DEFAULT_TTL_MS=300000

# Commercial infrastructure (required in production)
JWT_SECRET=a-real-random-secret-at-least-32-bytes
JWT_EXPIRES_IN_SECONDS=604800
BILLING_PROVIDER=manual                    # or "stripe"
STRIPE_SECRET_KEY=                         # required if BILLING_PROVIDER=stripe
STRIPE_WEBHOOK_SECRET=                     # required if BILLING_PROVIDER=stripe

# Production infrastructure (this phase)
CORS_ALLOWED_ORIGINS=https://app.your-real-domain.com
SHUTDOWN_TIMEOUT_MS=10000

# Autonomous engine (optional; defaults to enabled)
AUTONOMOUS_ENGINE_ENABLED=true
AUTONOMOUS_ENGINE_INTERVAL_MINUTES=30
```

## Startup Sequence

1. `node backend/server.js` loads `.env`/`.env.local` (via `backend/config/env.js`, unchanged from prior phases).
2. `validateEnvironmentOrExit()` runs against the real, raw environment. Any fatal problem (see Required/Conditionally Required tables above) prints every real error found and exits with code `1` — the process never partially starts against a known-broken configuration. Non-fatal gaps (Recommended table) print as warnings but do not block startup.
3. The HTTP server starts listening on `PORT`.
4. The four background schedulers start (autonomous recommendation engine, theme snapshots, provider refresh, alerts) — unchanged from prior phases.

## Running Database Migrations

```
npm run db:generate    # regenerate the Prisma client
npm run db:deploy      # apply pending migrations (prisma migrate deploy — safe for production, never resets data)
```

## Process Management

There is no Dockerfile/container image in this repository today. Run the backend as a long-lived process under whatever supervisor your deployment target uses — e.g.:

- **systemd**: a unit file with `ExecStart=/usr/bin/node backend/server.js`, `Restart=on-failure`, and `TimeoutStopSec` set at least as high as `SHUTDOWN_TIMEOUT_MS` (so systemd doesn't `SIGKILL` before the app's own graceful shutdown finishes).
- **pm2**: `pm2 start backend/server.js --name impactone-backend`.
- **A container orchestrator** (if one is adopted later): send `SIGTERM` on stop (the default for most orchestrators), and set the pod/task's grace period at least as high as `SHUTDOWN_TIMEOUT_MS`.

## Health Endpoints for Orchestration

| Endpoint | Use it as |
|---|---|
| `GET /health/live` | Liveness probe — restart the process only if this fails. |
| `GET /health/ready` | Readiness probe — remove the instance from load-balancer rotation if this returns `503`. |
