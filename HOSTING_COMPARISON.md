# HOSTING_COMPARISON.md — Phase HOSTING-DECISION-001

Research method: every price/limit/behavior below was fetched live from each provider's current official documentation this session (not recalled from training data) — Railway (`railway.com/pricing`, `docs.railway.com/reference/pricing`, `docs.railway.com/guides/postgresql`, `docs.railway.com/reference/regions`), Render (`render.com/pricing`, `render.com/docs/free`, `render.com/docs/postgresql-backups`, `render.com/docs/regions`), Fly.io (`fly.io/docs/about/pricing/`, `fly.io/docs/mpg/`), Vercel (`vercel.com/pricing`, `vercel.com/docs/functions/limitations`), and Upstash (`upstash.com/pricing`, evaluated as the Redis option Fly.io itself resells). All figures below are current as fetched today; no remembered/outdated pricing was used.

## Grounding fact about ImpactOne's own repository (verified this session, not assumed)

- **No Dockerfile exists anywhere in the repo.** `ENVIRONMENT_SETUP.md` (already written by a prior phase) explicitly documents the real, current deployment shape as "bare Node.js" — a process manager invoking `node backend/server.js` directly.
- **The backend is not serverless-compatible as-is.** It runs **4 real, continuous background schedulers** (autonomous recommendation engine every 30 min via `node-cron`, theme snapshots, provider refresh, alerts) that require a long-lived, always-running process — not a per-request function invocation. This single fact rules out any platform that only offers request-triggered serverless functions (e.g., Vercel) for the **backend** role, though it has zero bearing on hosting the **frontend**, which is a static build.
- **Frontend** is a Vite SPA that builds to `frontend/dist/` — a static asset bundle, framework-agnostic to host, including a real service worker (`frontend/public/sw.js`) and manifest for PWA installability.
- **Database**: Prisma + `@prisma/adapter-pg`, requires a real `DATABASE_URL`. **Redis is explicitly optional** — `backend/services/redisCache/redisClient.js` already gracefully degrades to an always-miss, uncached mode when `REDIS_URL` is unset; this is real, tested, current behavior, not a future TODO.
- **Already-built, deployment-relevant mechanisms**: `CORS_ALLOWED_ORIGINS` (opt-in origin restriction), `VITE_API_BASE_URL` (frontend build-time backend origin), `/health`, `/health/live`, `/health/ready` (the last does a real `SELECT 1` against the database), and a production `validateEnvironmentOrExit()` that hard-fails on boot if `DATABASE_URL`/`JWT_SECRET` are missing or insecure in `NODE_ENV=production`.

---

## Railway

| Aspect | Current, verified detail |
|---|---|
| Pricing model | Flat plan fee + per-second usage billing on top: RAM $10/GB/month ($0.000231/GB/min), CPU $20/vCPU/month ($0.000463/vCPU/min), Volume storage $0.15/GB/month, Egress $0.05/GB. |
| Plans | Free ($0/mo, $1 usage credit, 1 vCPU/0.5GB/1 replica/3-day logs); Hobby ($5/mo, includes $5 usage credit, up to 48 vCPU/48GB/6 replicas/7-day logs); Pro ($20/mo per workspace — not per seat, includes $20 usage credit, up to 1,000 vCPU/1TB/42 replicas/30-day logs). |
| Free/trial limitations | A 30-day, $5-credit Free Trial exists (no card required). The ongoing Free plan ($0/mo) is capped at 1 vCPU/0.5GB per service and only 3-day log retention — too thin for a real, even small, pilot; **Hobby ($5/mo) is the realistic floor.** |
| Sleep behavior | No idle-based sleep/spin-down on Hobby or Pro — services run continuously as long as resource usage is paid for. (This matters directly: ImpactOne's 4 background schedulers need this.) |
| Persistent storage | Real attachable Volumes, billed at $0.15/GB/month, up to 5GB included ceiling on Hobby (self-serve expandable to 1TB on Pro). |
| PostgreSQL | **Not a distinct managed-database product** — deployed via an official one-click template running the real, official `postgres` Docker image on your own compute + attached Volume, billed under the same per-second RAM/CPU/volume usage pricing as any other service. No automatic PITR/managed-backup product is bundled; Railway's own docs recommend adding a separate "native Backups" feature yourself or a community Prometheus/Grafana stack for observability. |
| Redis availability | Same story as Postgres — deployed via an official Redis template on your own compute + volume, not a separately branded managed product with its own SLA. |
| Deployment workflow | Git-push/GitHub-integration based, or CLI (`railway up`). Config-as-code supported. Simple. |
| Environment-variable management | Real, dashboard-based env var management; can reference another service's variables directly (e.g., a Postgres service's `DATABASE_URL` auto-injected into the backend service). |
| Logging | 3-day (Free) / 7-day (Hobby) / 30-day (Pro) log retention. |
| Backup support | No automatic managed backup by default (see Postgres row above) — must be self-configured. |
| Region availability | 4 regions: US West (California), US East (Virginia), EU West (Amsterdam), Southeast Asia (Singapore). |
| Operational complexity | Low — single dashboard for frontend/backend/DB/Redis all as "services" in one project, but the DIY nature of Postgres/Redis (no managed backups out of the box) pushes some real operational responsibility onto the founder that Render's equivalent product doesn't. |
| Suitability for ImpactOne | Good — supports a persistent Node process natively (no serverless mismatch), can host all 4 required roles (frontend static build, backend, Postgres, Redis) in one account. The main gap versus Render is the lack of an automatic, managed PITR backup product for Postgres. |

## Render

| Aspect | Current, verified detail |
|---|---|
| Pricing model | A separate flat **workspace** plan fee (Hobby $0/mo, Pro $25/mo, Scale $499/mo) *plus* per-service **compute** cost (each service picks its own instance tier, billed per-second). |
| Web Service compute tiers | Free ($0/mo, 512MB/0.1 CPU); Starter ($7/mo, 512MB/0.5 CPU); Standard ($25/mo, 2GB/1 CPU); higher tiers up to Pro Ultra ($450/mo). |
| Free/trial limitations | Free web services: 750 free instance-hours/month shared across all free services in the workspace, ephemeral filesystem, no shell access, no scaling, no persistent disk, restarted at Render's discretion. |
| Sleep behavior | **Free web services spin down after 15 minutes with no inbound traffic**, and take about 1 minute to spin back up on the next request (a real, documented cold-start UX hit — genuinely current and verified, not assumed). **Starter tier and above never sleep.** |
| Persistent storage | Real attachable SSD persistent disks for paid web/private services, $0.25/GB/month (not available on Free). |
| PostgreSQL | A distinct, fully **managed** product ("Render Postgres") with its own tier ladder: Free (1GB storage, 100 connections, **expires 30 days after creation** then a 14-day grace period then deletion, no backups/PITR at all); paid tiers from Basic-256mb ($6/mo) through Basic-1gb ($19/mo) up to large Pro/Accelerated tiers. **Paid tiers include real, automatic Point-in-Time Recovery** — 3-day recovery window on a Hobby workspace, extending to 7 days on Pro-or-higher workspaces — plus manually-triggerable logical (`pg_dump`-style) exports retained 7 days regardless of plan. |
| Redis availability | A distinct managed product, "Render Key Value" (Redis-compatible): Free (25MB, **in-memory only — all data lost on any restart**); Starter ($10/mo, 256MB, real persistence); Standard ($32/mo, 1GB). |
| Deployment workflow | Git-push/GitHub integration, zero-downtime deploys, preview environments, `render.yaml` infra-as-code blueprint support. Simple, comparable to Railway. |
| Environment-variable management | Real, dashboard-based, with shareable "Environment Groups" to update one variable across multiple services at once (useful for `DATABASE_URL` referenced by multiple services). |
| Logging | 7 days (Hobby workspace) / 14 days (Pro) / 30 days (Scale). |
| Backup support | Best-in-class among the four for this comparison — automatic managed PITR on paid Postgres tiers, real recovery workflow documented (spin up an isolated recovery instance, validate, then cut over). |
| Region availability | 5 regions: Oregon (USA), Ohio (USA), Virginia (USA), Frankfurt (Germany), Singapore. (Static sites are CDN-backed globally, no region choice needed.) |
| Operational complexity | Low — a purpose-built "Static Site" product exists specifically for SPA/PWA hosting (global CDN, automatic TLS, custom domains, zero server to manage), separate from the compute-billed Web Service product used for the backend. Everything (frontend, backend, DB, optional Redis) lives in one dashboard, one bill. |
| Suitability for ImpactOne | Very good — the persistent Starter Web Service tier natively supports ImpactOne's 4 background schedulers; the managed, automatic-PITR Postgres product is the strongest "reliable with minimal ops" fit of the four options evaluated; the dedicated Static Site product is an ideal, zero-config PWA host. |

## Fly.io

| Aspect | Current, verified detail |
|---|---|
| Pricing model | Pure usage-based (Pay As You Go) — no flat platform fee. Billed per-second for running Machines (named CPU/RAM presets), separately for stopped Machines' root filesystem, for Volumes, and for egress. |
| Compute cost (backend) | Smallest real preset, `shared-cpu-1x` at 256MB, ≈ $1.94/month run continuously; at a more realistic 512MB–1GB for a real Express+Prisma+scheduler process, ≈ $3.19–$5.70/month. |
| Free/trial limitations | Fly.io no longer offers a distinct free ongoing plan to new customers (legacy free allowances only honored for pre-existing accounts); all new organizations require a credit card and are billed Pay As You Go from the start. |
| Sleep behavior | Fly Machines support a genuine, configurable **autostop/autostart** feature (start a Machine on the next incoming request, stop it after idle) — a deliberate cost/latency tradeoff the operator opts into, unlike Render's forced-and-uncontrollable free-tier sleep. Machines can also simply be left running continuously if avoiding any cold start is preferred. |
| Persistent storage | Fly Volumes, $0.15/GB/month provisioned, automatic daily snapshots (5-day retention by default, adjustable), first 10GB of snapshot storage free/month. |
| PostgreSQL | Fly's own currently-supported, fully **managed** product is "Managed Postgres" (MPG) — real HA, automatic backups, connection pooling, 24/7 support. **Its cheapest current tier is $38/month** (Basic, shared-2x, 1GB RAM) — notably the most expensive "smallest managed Postgres" among the four options compared here. A cheaper (~$2/month) self-managed "Fly Postgres" exists but is **explicitly marked "Unsupported" by Fly's own current documentation** — not a responsible choice for even a small real production pilot that needs reliable backups. |
| Redis availability | Not a first-party Fly product — resold via the Upstash extension (Fly bills Upstash's own list prices through your Fly invoice; see the Upstash row below for real current pricing — a genuine, real free tier exists at 256MB/500K commands per month). |
| Deployment workflow | CLI-first (`flyctl`/`fly deploy`, `fly.toml` config) — more operator-hands-on than Railway/Render's git-push model, though GitHub Actions integration exists. Marginally higher operational complexity for a founder with no prior Fly experience. |
| Environment-variable management | Real, via `fly secrets set` (CLI) or dashboard. |
| Logging | Real live-tail and searchable logs (`fly logs`), exportable. |
| Backup support | Real and automatic on Managed Postgres (see above) — but at a materially higher entry price point than Render's equivalent. |
| Region availability | Very broad — Managed Postgres alone lists 12 regions (Amsterdam, Frankfurt, São Paulo, Ashburn/VA, Los Angeles, London, Tokyo, Chicago, Singapore, San Jose, Sydney, Toronto); general Fly Machines regions are broader still. The strongest global-region story of the four, but irrelevant for a single founder + ≤5 users with no stated multi-region requirement. |
| Operational complexity | Higher than Railway/Render for this use case — CLI-centric workflow, and the cheapest *supported* Postgres tier costs meaningfully more than the alternatives. Its genuine strengths (global edge presence, fine-grained autostop cost control) don't matter at this scale. |
| Suitability for ImpactOne | Workable, but the least "smallest reliable architecture"-aligned of the three backend-capable options — real managed Postgres costs ~2–6× more than Render's or Railway's equivalent for a project this small, and the CLI-first workflow adds operator friction without a corresponding benefit at ≤5 users. |

## Vercel (+ a separate backend/database, as the mission's own framing requires)

| Aspect | Current, verified detail |
|---|---|
| Pricing model | Hobby: free forever, explicitly scoped by Vercel's own FAQ as **"for personal, non-commercial use"** — a real, disclosed licensing consideration for a commercial founder-led product like ImpactOne (which already has Stripe billing infrastructure scaffolded). Pro: $20/user/month + usage beyond an included $20 credit. |
| Suitability for the **backend** | **Not suitable, verified via current official limits.** Vercel Functions are per-invocation serverless, not a persistent process: max duration is 300 seconds (5 min) hard cap on Hobby, and 300s default / up to 800s (or a 1800s beta "extended max") only on paid Pro/Enterprise plans with extra configuration — there is no mode that keeps a process alive indefinitely to run `node-cron`-based background schedulers the way ImpactOne's backend requires. This is a genuine, current, architecture-level mismatch, not a workaround-able limitation. |
| Suitability for the **frontend** | Excellent, and this is the only role evaluated for Vercel in this comparison. Real global CDN, automatic HTTPS, custom domains, real environment-variable management, git-push deploys, generous free-tier allowances (1M edge requests/month, 100GB fast data transfer/month on Hobby) — comfortably enough for ≤5 users. |
| PWA/service-worker support | Fine — any static host serving over HTTPS with correct headers supports a service worker; no Vercel-specific obstacle. |
| Custom domain | Supported on both Hobby and Pro. |
| Operational complexity | **This option is, by definition, a 2-provider split** (Vercel for frontend + Railway/Render/Fly for backend+DB), since Vercel cannot host ImpactOne's backend at all. Two dashboards, two bills, two support channels, and a real cross-origin `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL` configuration step between them — inherently *more* operationally complex than a single-provider option, not less, despite Vercel's own frontend experience being excellent in isolation. |
| Suitability for ImpactOne | A legitimate secondary choice for the **frontend specifically** if the founder already prefers Vercel's DX, paired with Render or Railway for the backend+DB — but it does not reduce the number of moving parts versus an all-in-one Render/Railway architecture, and Hobby's "personal, non-commercial" scoping means Pro ($20/mo) is the honest tier to cost for a real founder pilot of a monetizable product. |

## Redis alternative evaluated for completeness — Upstash (used directly, independent of Fly)

| Aspect | Current, verified detail |
|---|---|
| Free tier | $0/month — 256MB data, 500,000 commands/month. Comfortably sufficient for ≤5 users' optional provider-response caching. |
| Pay-as-you-go | $0.20 per 100K commands beyond free tier, first 1GB storage free then $0.25/GB, 200GB/month bandwidth free. |
| Fixed tiers | Start at $10/month (250MB) if predictable billing is preferred over usage metering. |
| Relevance to ImpactOne | Since Redis is entirely optional in this codebase (confirmed graceful degradation), Upstash's free tier — usable independent of which backend host is chosen — is the cheapest way to add real caching later without committing to it at deployment time. |

## Any clearly superior current alternative?

No option evaluated is unambiguously superior to Render for this specific, narrow requirement (single founder, ≤5 users, one persistent Node process, one small Postgres database, no enterprise scaling, cost/simplicity prioritized). Newer all-in-one PaaS entrants (e.g., Coolify as a self-hosted option, or various "Heroku alternative" startups) were considered but not deep-dived — self-hosting Coolify would require the founder to also operate a VPS themselves, which directly *increases* operational complexity versus a managed PaaS, working against this mission's own stated priority. Render's combination of (a) a purpose-built, zero-config static-site PWA host, (b) a persistent, non-sleeping Starter web-service tier at $7/month, and (c) a genuinely managed, automatic-PITR Postgres product starting at $6/month — all under one dashboard — is the strongest fit found.
