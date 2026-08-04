# Production Environment — PRODUCTION-DEPLOYMENT-001 (Render)

Not deployed this phase (see `PRODUCTION_DEPLOYMENT_REPORT.md`). This is the exact Render-specific environment configuration required once Step 1's security prerequisites are genuinely met — extends `DEPLOYED_ENVIRONMENT_MATRIX.md`/`ENVIRONMENT_SETUP.md` from prior phases with Render's own specific variable-injection mechanics, not a duplicate of their content.

## Render Backend (Web Service) Environment Variables

| Variable | Source | Status |
|---|---|---|
| `DATABASE_URL` | Auto-populated by Render when the Web Service is linked to a Render PostgreSQL instance (Render's own "Internal Database URL" mechanism) | Not yet provisioned — no database created |
| `JWT_SECRET` | Operator-generated (`openssl rand -base64 48` or equivalent), set as a Render "Secret" environment variable (never committed) | **Blocking** — currently empty; must be newly generated, never reused |
| `ADMIN_API_KEY` | Operator-generated random value, set as a Render secret | **Blocking** — currently empty |
| `FINNHUB_API_KEY` | Operator's newly-rotated Finnhub key (see `KEY_ROTATION_RUNBOOK.md`), set as a Render secret | **Blocking** — the current value is the confirmed-exposed one; must not be reused |
| `OPENAI_API_KEY` | Operator's confirmed-new OpenAI key | **Blocking** — not confirmed as genuinely replaced |
| `SEC_EDGAR_USER_AGENT` | Operator's real org name + contact (required by SEC EDGAR's own terms) | Not yet set |
| `CORS_ALLOWED_ORIGINS` | The real Render Static Site URL, once known (chicken-and-egg with frontend deployment — deploy backend first per Step 4, get its URL, deploy frontend pointed at it, then set this to the frontend's real URL) | Not yet knowable — no Static Site exists yet |
| `NODE_ENV` | `production` | Not yet set anywhere real |
| `BILLING_PROVIDER` | `manual` (recommended for this scale, per every prior deployment phase's own recommendation) | Decision pending operator confirmation |
| `REDIS_URL` | Not required — see `PRODUCTION_URLS.md`'s Redis check | Intentionally not provisioned |
| `POLYGON_API_KEY` / `NEWS_API_KEY` / `ALPHA_VANTAGE_API_KEY` | Optional — each provider already degrades gracefully if unset | Operator's choice |

## Render Frontend (Static Site) Build Configuration

| Setting | Value | Status |
|---|---|---|
| Build command | `cd frontend && npm install && npm run build` (or Render's own root-directory + build-command split, per its Static Site setup flow) | Not yet configured — no Static Site exists |
| Publish directory | `frontend/dist` | Not yet configured |
| `VITE_API_BASE_URL` (build-time env var) | The real Render backend Web Service's URL + `/api` (e.g. `https://impactone-backend.onrender.com/api`) — **must be set before the build runs**, since Vite bakes this into the static bundle at build time, not runtime | Not yet knowable — no backend URL exists yet |
| `VITE_PORTFOLIO_ENGINE` | `api` (already the established default per prior phases) | Ready to set once the site exists |
| `VITE_DEV_CONSOLE` | Must be **unset** (never `"true"` in production) | Decision already made, ready to apply |

## Verification Plan (Not Yet Executable)

Once every "Blocking" row above is resolved and Render access exists:
1. Confirm `GET <backend-url>/health/live` → `200`.
2. Confirm `GET <backend-url>/health/ready` → `200` with `checks.database: true`.
3. Confirm the frontend's built bundle contains the real backend URL, not `localhost:5000/api` (grep the built `apiConfig-*.js` chunk, same method used in `FOUNDER-DEPLOYMENT-001`).
4. Confirm CORS: a request from the real frontend origin to the real backend origin succeeds; a request from an unlisted origin is rejected.
5. Confirm the scheduler (autonomous recommendation engine, theme snapshots, provider refresh, alerts) logs its own startup lines with no undocumented warnings.

## Why Nothing Here Is Filled In With Real Values

Every row above requires either a real Render account (not available in this environment) or a real, freshly-generated/rotated secret (an operator-only action, not something this environment can generate on the operator's behalf for a real production system). Filling in placeholder-looking real values would risk being mistaken for real configuration already in place.
