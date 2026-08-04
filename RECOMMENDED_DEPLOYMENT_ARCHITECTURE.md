# RECOMMENDED_DEPLOYMENT_ARCHITECTURE.md — Phase HOSTING-DECISION-001

## Primary architecture: Render (single provider, four services, one dashboard)

```
                        ┌──────────────────────────────┐
   Browser / PWA  ───▶  │  Render Static Site           │  (frontend/dist, built with
                        │  ImpactOne frontend            │   VITE_API_BASE_URL pointing
                        │  (Vite build output)           │   at the backend's real URL)
                        └──────────────┬────────────────┘
                                       │ HTTPS, CORS-restricted
                                       ▼
                        ┌──────────────────────────────┐
                        │  Render Web Service (Starter) │  node backend/server.js
                        │  ImpactOne backend             │  4 background schedulers run
                        │  (persistent, no sleep)        │  continuously in-process
                        └──────────────┬────────────────┘
                                       │ private network (same region)
                     ┌─────────────────┼─────────────────┐
                     ▼                                   ▼
       ┌───────────────────────────┐        ┌───────────────────────────┐
       │ Render Postgres (Basic)   │        │ (Optional) Render Key     │
       │ real, persistent, with    │        │ Value — Redis-compatible │
       │ automatic PITR backups    │        │ provider-response cache  │
       └───────────────────────────┘        └───────────────────────────┘
```

Why this is the smallest architecture that satisfies the mission: 4 services, 1 provider, 1 dashboard, 1 bill, 1 support channel. No Kubernetes, no container orchestration, no multi-region complexity the founder pilot doesn't need.

### Recommended provider: **Render**

### Frontend service
- **Type:** Render Static Site (not a Web Service — no server process needed for a Vite SPA build).
- **Build command:** `cd frontend && npm ci && npm run build`
- **Publish directory:** `frontend/dist`
- **Custom domain:** included free (2 domains included on the Hobby workspace plan), automatic TLS.
- **PWA note:** add a custom header rule (via Render's static-site headers configuration) forcing `Cache-Control: no-cache` on `/sw.js` specifically, so the existing `impactone:update-available` update-banner mechanism can detect a new service worker promptly instead of serving a CDN-cached stale one.

### Backend service
- **Type:** Render Web Service, **Starter** instance tier ($7/month, 512MB/0.5 CPU) — deliberately **not** the Free tier, because Free web services spin down after 15 minutes idle with a real ~1-minute cold-start penalty, which would directly disrupt the 4 always-running background schedulers (autonomous recommendation engine, theme snapshots, provider refresh, alerts) this backend depends on running continuously.
- **Start command:** `node backend/server.js` (already the correct, existing script — no change needed).
- **Build command:** `npm ci && npm run db:generate` (the RC2-audit-confirmed required Prisma Client generation step).
- **Health check path:** `/health/live` (liveness — never fails due to a slow DB, matches this backend's own already-implemented liveness/readiness distinction).

### PostgreSQL service
- **Type:** Render Postgres, **Basic-256mb** tier ($6/month) to start — real, persistent, automatic Point-in-Time Recovery included (3-day recovery window on the free Hobby workspace plan). Upgrade to Basic-1gb ($19/month) if/when real data volume warrants it; this is a live, in-place resize, not a migration.
- **Connection:** Render auto-generates a real `DATABASE_URL` and can inject it directly into the backend service's environment via a shared Environment Group.
- **Region:** choose the same region as the backend service (private networking only works within one region) — Oregon or Virginia are reasonable defaults for a US-based founder; Frankfurt if the founder/users are EU-based.

### Redis decision: **skip at launch, add later only if needed**
- ImpactOne's own `redisClient.js` already gracefully degrades to an always-miss, uncached mode when `REDIS_URL` is unset — this is real, tested, existing behavior, not a gap.
- At ≤5 users, the cost of running without a cache is negligible (every provider call simply hits the real upstream API directly, which is already the documented fallback behavior).
- **If desired anyway**, add Render Key Value **Starter** ($10/month, 256MB, real persistence) rather than the Free tier (25MB, in-memory only, data lost on every restart — not worth relying on even as a "free" option, since it can silently discard state). This is explicitly optional and does not block launch.

---

## Fallback architecture: Railway (single provider, usage-based)

Use this if Render is unavailable for any reason, or if the founder prefers Railway's pure per-second usage billing over Render's plan+compute split.

```
   Browser / PWA  ───▶  Render Static Site (frontend, $0/mo — reused from primary
                         architecture even in the fallback, since it's free and
                         purpose-built; or Vercel Hobby/Pro if preferred)
                                       │
                                       ▼
                        Railway Hobby plan ($5/mo + usage)
                        ┌───────────────────────────┐
                        │  Backend service            │  node backend/server.js
                        │  (no idle sleep on Hobby)   │
                        └──────────────┬──────────────┘
                                       │ private network (same project)
                                       ▼
                        ┌───────────────────────────┐
                        │  Postgres (official image  │
                        │  template + attached volume)│
                        └───────────────────────────┘
```

- **Backend service:** deploy `node backend/server.js` directly from GitHub via Railway's git integration; Hobby plan ($5/month base, includes $5 of usage credit).
- **PostgreSQL:** Railway's official Postgres template (the real, official `postgres` Docker image on Railway compute + an attached Volume) — **not** a distinct managed-backup product like Render's. **Operator action required**: manually configure Railway's own "native Backups" volume-backup feature (or a scheduled `pg_dump`-to-object-storage job) immediately after provisioning, since automatic PITR is not bundled the way it is on Render.
- **Redis (optional):** same reasoning as primary — skip at launch; Railway's official Redis template if ever needed.
- **Frontend:** since Railway has no purpose-built, zero-config static-site/CDN product the way Render and Vercel do, keep the frontend on Render's free Static Site (or Vercel Hobby/Pro) even in this fallback — there's no benefit to forcing it onto Railway's general-purpose compute billing.

---

## Deployment order (applies to either architecture)

1. **Rotate the exposed API keys first** (`FINNHUB_API_KEY`/`OPENAI_API_KEY` — confirmed present in this repository's git history by the immediately-preceding `REMOTE-AND-DEPLOYMENT-VERIFICATION-001` audit). Do this before any real key is placed into a hosted environment.
2. Create the Render account (or Railway account for the fallback), add a payment method.
3. Provision the **PostgreSQL service first** (so its real `DATABASE_URL` exists before the backend needs it).
4. Provision the **backend Web Service**, pointed at the GitHub repository, branch `sprint-16-live-data` (or whichever branch the operator designates as the deploy branch), with the build/start commands above.
5. Set backend environment variables: `DATABASE_URL` (from step 3), `NODE_ENV=production`, `JWT_SECRET` (a real, freshly generated ≥32-byte secret — `openssl rand -base64 48`), the rotated `FINNHUB_API_KEY`/`OPENAI_API_KEY` (and any other optional provider keys desired), `CORS_ALLOWED_ORIGINS` (left blank for now — see step 8).
6. Run the database schema against the new instance: `npm run db:deploy` (Prisma `migrate deploy` — additive-only, safe).
7. Confirm the backend boots and `GET https://<backend-origin>/health/ready` returns `200` with `checks.database: true`.
8. Provision the **frontend Static Site**, with `VITE_API_BASE_URL` set at **build time** to the real backend origin from step 4 (e.g., `https://impactone-backend.onrender.com/api`) — this must be set before the build runs, since Vite bakes it into the static bundle.
9. Go back and set the backend's `CORS_ALLOWED_ORIGINS` to the real frontend origin from step 8, then redeploy the backend (a config-only redeploy, no rebuild needed).
10. Open the real frontend URL, confirm Home renders real data (not an error state), and confirm the PWA install prompt/manifest resolves correctly.
11. Follow the existing `FOUNDER_INSTALL_GUIDE.md` to complete a real physical-device install/verification pass — this is the one step no hosting choice can substitute for.

## Risks and limitations

- **Free-tier Postgres (Render) is not a real production option** — 30-day expiry, no backups, 1GB cap. The recommended paid Basic tier ($6/month) is a hard requirement for the pilot, not a nice-to-have.
- **Render's Starter web-service tier ($7/month) has no autoscaling** — irrelevant at ≤5 users, but worth knowing if usage ever grows unexpectedly beyond this pilot's stated scope.
- **Region choice is not changeable in-place on Render** (per its own docs, changing region requires creating a new service/database and migrating) — choose the backend/database region deliberately once at setup, based on where the founder and pilot users actually are.
- **Railway's Postgres has no bundled automatic PITR** — the fallback architecture is real and workable, but carries genuine, disclosed operational risk (a manual backup step is required and easy to forget) that the primary Render architecture does not have.
- **Neither architecture includes a CI pipeline or staging environment** — out of scope for this mission (hosting selection only), but worth a future phase once the pilot is running.
- **Neither architecture addresses the still-open Critical findings from the immediately-preceding verification phase** (unrotated exposed API keys, the AI-trust reasoning-duplication defect) — hosting architecture selection does not, and should not, substitute for closing those separately.
