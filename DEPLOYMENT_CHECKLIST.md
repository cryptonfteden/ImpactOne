# Deployment Checklist

Real, actionable checklist for the first production deployment of ImpactOne's backend. See `ENVIRONMENT_SETUP.md` for full variable reference and `PRODUCTION_DEPLOYMENT.md` for design rationale.

## Before First Deploy

- [ ] `DATABASE_URL` points at a real, reachable production Postgres instance (not the dev/test database).
- [ ] `npm run db:deploy` has been run against that production database (applies all pending Prisma migrations).
- [ ] `JWT_SECRET` is set to a real, random, sufficiently long secret — **not** the disclosed dev default. Startup will refuse to start in `NODE_ENV=production` otherwise.
- [ ] `NODE_ENV=production` is actually set in the deployment environment.
- [ ] `BILLING_PROVIDER` is set deliberately (`manual` or `stripe`). If `stripe`: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are both real, live values — startup will refuse to start otherwise.
- [ ] `CORS_ALLOWED_ORIGINS` is set to the real frontend origin(s) — do not leave this unset in production (defaults to allow-all).
- [ ] `ADMIN_API_KEY` is set to a real, random value if any admin-only route will be reachable.
- [ ] `REDIS_URL` is set if a Redis instance is available for this deployment (optional — the app runs correctly without it, just uncached).
- [ ] `SEC_EDGAR_USER_AGENT` is set to your organization's real name and contact (required by SEC EDGAR's own terms — see `backend/config/env.js`'s existing comment).

## Deploy

- [ ] Start the process with a supervisor that will restart it on crash (systemd/pm2/orchestrator) and that sends `SIGTERM` (not `SIGKILL`) on a normal stop.
- [ ] Confirm the supervisor's stop/termination grace period is **at least** `SHUTDOWN_TIMEOUT_MS` (default 10000ms) so graceful shutdown can complete before a forced kill.
- [ ] Watch the startup log for `[startupValidation]` lines — zero `WARNING` lines is ideal for a first production deploy; any that remain (e.g. missing `REDIS_URL`) should be a deliberate, understood choice, not an oversight.

## After Deploy

- [ ] `GET /health/live` returns `200` from the running instance.
- [ ] `GET /health/ready` returns `200` with `checks.database: true`.
- [ ] A real request through the full stack succeeds (e.g. `GET /api/v2/billing/plans`, which requires no auth).
- [ ] A real register → login → `GET /api/v2/auth/me` round trip succeeds against the production database.
- [ ] Confirm the four background schedulers actually started (look for their own existing startup log lines from prior phases).
- [ ] Wire `GET /health/live` and `GET /health/ready` into your load balancer / orchestrator's liveness and readiness probes respectively (see `ENVIRONMENT_SETUP.md`).

## Rollback

- [ ] Confirm the previous known-good commit/version is identified before deploying (this deployment has not introduced any destructive migration — all Prisma migrations in this codebase to date are additive).
- [ ] If a rollback is needed: stop the new process (real graceful `SIGTERM`, not a forced kill, so in-flight requests finish), redeploy the prior version, and re-run the "After Deploy" checks above against it.

## Known, Disclosed Gaps (Not Blockers, But Read Before Relying On Them)

- No Dockerfile/container image exists in this repository — deployment today means running `node backend/server.js` directly under a process supervisor (see `ENVIRONMENT_SETUP.md`).
- Readiness (`/health/ready`) checks the database only — it does not check every downstream market-data/AI provider. Those already degrade gracefully per-request; a `503` from readiness means "the database is unreachable," not "every feature is unavailable."
- Stripe webhook raw-body signature verification has a known gap (see `COMMERCIAL_INFRASTRUCTURE.md`'s Known Limitations) — do not enable `BILLING_PROVIDER=stripe` against live Stripe webhook traffic until that's closed.
