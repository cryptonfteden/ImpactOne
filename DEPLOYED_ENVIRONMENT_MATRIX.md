# Deployed Environment Matrix — GITHUB-BACKUP-AND-DEPLOYMENT-001

No real deployment exists yet (see `PRODUCTION_DEPLOYMENT_RESULT.md`). This matrix documents exactly what each required variable's real, deployed value must be — the operator's own values fill in the "Deployed Value" column when hosting actually happens; nothing here is fabricated as already set.

| Variable | Required for | Real deployed value | Status |
|---|---|---|---|
| `DATABASE_URL` | Backend boot | *(operator's real Postgres connection string)* | Not yet provisioned |
| `JWT_SECRET` | Backend boot (production) | *(operator-generated, ≥32 random bytes)* | Not yet generated |
| `NODE_ENV` | Enables all production hard-fail checks | `production` | Not yet set anywhere real |
| `PORT` | Backend listen port | *(host-assigned or operator choice)* | N/A until hosted |
| `CORS_ALLOWED_ORIGINS` | Frontend↔backend CORS | *(the real deployed frontend origin, e.g. `https://app.yourdomain.com`)* | Not yet known — depends on frontend hosting choice |
| `ADMIN_API_KEY` | Admin route protection | *(operator-generated random value)* | Not yet generated |
| `REDIS_URL` | Optional provider cache | *(not required for ≤5 users)* | Intentionally not provisioned |
| `BILLING_PROVIDER` | Billing behavior | `manual` (recommended for this scale) | Decision pending operator confirmation |
| `OPENAI_API_KEY` | AI analysis features | *(operator's own, rotated key — see Critical Finding below)* | **Must be rotated before use — old value is publicly exposed in git history** |
| `FINNHUB_API_KEY` | Market data | *(operator's own, rotated key — see Critical Finding below)* | **Must be rotated before use — old value is publicly exposed in git history** |
| `POLYGON_API_KEY` / `NEWS_API_KEY` / `ALPHA_VANTAGE_API_KEY` | Optional data providers | *(operator's own keys, if desired)* | Optional — each degrades gracefully if unset |
| `SEC_EDGAR_USER_AGENT` | SEC EDGAR compliance | *(operator's real org name + contact)* | Not yet set |
| `VITE_API_BASE_URL` | Frontend→backend connectivity (build-time) | *(the real deployed backend origin, e.g. `https://api.yourdomain.com/api`)* | Not yet known — depends on backend hosting choice |
| `VITE_PORTFOLIO_ENGINE` | Portfolio screen selection | `api` (already the `.env` default per prior phases) | Already decided, carries forward |
| `VITE_DEV_CONSOLE` | Internal diagnostics visibility | Must be **unset** (or `false`) in any real production build | Decision: never set in production |

## Critical Finding Carried Into This Matrix

The real, currently-configured `FINNHUB_API_KEY` and `OPENAI_API_KEY` values already present in this repo's local `.env` files are **the same values already exposed in this repository's git history** (commits `7676e23`/`5d855ea`, already on the pushed `origin/sprint-16-live-data` branch — see `GITHUB_BACKUP_REPORT.md`). These must be **rotated** (revoked and replaced with new, real values from the OpenAI/Finnhub dashboards) before being placed into any real production environment — reusing the exposed values in production would mean deploying with already-compromised credentials.

## Endpoints (Real Shape, Not Yet Reachable Anywhere)

| Endpoint | Purpose | Deployed URL |
|---|---|---|
| `GET /health/live` | Liveness probe | *(pending backend hosting)* |
| `GET /health/ready` | Readiness probe (checks real DB connectivity) | *(pending backend hosting)* |
| `GET /health` | Legacy unconditional health check (kept for backward compatibility) | *(pending backend hosting)* |
| Frontend root | The installable PWA itself | *(pending frontend hosting)* |

## What This Matrix Does Not Decide

Which real hosting platform, which real domain names — those remain the operator's own decisions (see `PRODUCTION_DEPLOYMENT_RESULT.md`'s operator checklist), consistent with every prior deployment-readiness phase in this session's history.
