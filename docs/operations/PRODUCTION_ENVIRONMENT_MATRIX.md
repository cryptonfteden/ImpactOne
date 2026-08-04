# Production Environment Matrix — FOUNDER-DEPLOYMENT-001

Every environment variable this deployment actually reads, what happens if it's missing, and who is responsible for its real value. This is the exact configuration surface for a founder's own ≤5-user deployment — nothing here is new; it documents and verifies the existing `backend/config/startupValidation.js` / `backend/config/env.js` behavior with real evidence (see `DEPLOYMENT_VERIFICATION.md`).

## Backend — Fails Startup If Missing (Hard Error, Verified)

| Variable | Required in | What happens if missing | Real evidence |
|---|---|---|---|
| `DATABASE_URL` | Always | Process exits with code 1 before listening. | Verified this phase — see `DEPLOYMENT_VERIFICATION.md` Case 1. |
| `JWT_SECRET` | `NODE_ENV=production` | Process exits with code 1 if unset **or** still equal to the known insecure dev default. | Verified this phase — see Case 1/2. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `BILLING_PROVIDER=stripe` only | Process exits with code 1. | Not exercised this phase — this deployment uses `BILLING_PROVIDER=manual` (see below), so this path doesn't apply yet. |

## Backend — Warns Only, Does Not Block Startup (Verified)

| Variable | Effect if unset | Founder's decision needed? |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | CORS allows every origin (`cors()` with no options). | **Yes — operator decision.** Must be set to the real deployed frontend's exact origin (e.g. `https://app.yourdomain.com`) before real traffic. Verified: `app.js` only restricts `origin` when this is non-empty. |
| `ADMIN_API_KEY` | Admin-only routes run unprotected. | Yes, if any admin route will be reachable from this deployment. |
| `REDIS_URL` | Provider cache runs uncached — every call hits the real upstream provider directly. Functionally correct, just slower/costlier. | No — optional by design for a 5-user deployment; not required. |

## Backend — Application Behavior Config (Founder's Choice, Not Validated)

| Variable | This deployment's real value | Why |
|---|---|---|
| `PORT` | Operator's real hosting port | Validated as numeric/positive if set; defaults to `5000`. |
| `BILLING_PROVIDER` | `manual` | Simplest correct choice for a 5-user founder deployment — no live Stripe integration needed yet. |
| `NODE_ENV` | `production` | Required to actually engage the hard-fail checks above — leaving this unset would run the dev-mode (lenient) validation path instead. |
| `SEC_EDGAR_USER_AGENT` | Real org name + contact | Required by SEC EDGAR's own terms of use if that data source is used. |

## Frontend — Build-Time Only

| Variable | This deployment's real value | What happens if missing/wrong | Real evidence |
|---|---|---|---|
| `VITE_API_BASE_URL` | The real deployed backend's public HTTPS origin (e.g. `https://api.yourdomain.com/api`) | Falls back to `http://localhost:5000/api`, baked into the production bundle — unreachable from a real phone. `startupValidation.js`'s `validateOrigins()` (added in `PHONE-INSTALLATION-001`) flags this as a real startup issue in production builds. | Verified this phase — see `DEPLOYMENT_VERIFICATION.md`'s bundle-inspection evidence. |
| `VITE_PORTFOLIO_ENGINE` | `api` (per `.env`'s existing beta configuration comment) | Falls back to the legacy localStorage-driven portfolio screen. Not a deployment blocker either way. | Pre-existing, unchanged this phase. |

## What Is a Real Secret and Must Never Be Committed

`DATABASE_URL`, `JWT_SECRET`, `ADMIN_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, any provider API key (`OPENAI_API_KEY`, `FINNHUB_API_KEY`, `POLYGON_API_KEY`, `NEWS_API_KEY`, `ALPHA_VANTAGE_API_KEY`). Verified this phase: `.env` is listed in `.gitignore` (`.env`, `.env.local`, `.env.*.local`) and `git log --all -- .env` shows it has never been committed to this repository. These must be set directly in the real hosting platform's own secret/environment configuration — never placed in a tracked file.

## What This Matrix Does Not Decide

Which real hosting platform, which real domain names, and which real secret values — those are the founder's/operator's own decisions, not something a code change can make on their behalf. See `FOUNDER_DEPLOYMENT_REPORT.md` for exactly what's still pending an operator decision.
