# Go-Live Checklist — PRODUCTION-DEPLOYMENT-001

## Before Any Further Deployment Attempt

- [ ] Rotate `FINNHUB_API_KEY` at the Finnhub dashboard (per `KEY_ROTATION_RUNBOOK.md`) — **confirmed still unrotated as of this phase**, and the exposed value was independently confirmed still live in `SECURITY-INCIDENT-CLOSURE-001`.
- [ ] Confirm `OPENAI_API_KEY` is a genuinely new key (live-check it returns `200` from `GET https://api.openai.com/v1/models`, not `401`).
- [ ] Generate a real, random `JWT_SECRET` (≥32 bytes, e.g. `openssl rand -base64 48`) — currently empty.
- [ ] Generate a real, random `ADMIN_API_KEY` — currently empty.
- [ ] Obtain Render account access (or have the account owner perform the Render-console steps below directly).

## Render Setup (Once Unblocked)

1. **Backend — Web Service**
   - [ ] Connect the GitHub repo (`cryptonfteden/ImpactOne`, branch `sprint-16-live-data`), root directory `backend/` or repo root with the appropriate build/start commands (`npm install && npm run db:generate`, start command `node backend/server.js`).
   - [ ] Add a Render PostgreSQL instance; link it so `DATABASE_URL` auto-populates.
   - [ ] Set every "Blocking" environment variable from `PRODUCTION_ENVIRONMENT.md` as a Render secret.
   - [ ] Deploy. Run `npm run db:deploy` (Prisma migrate deploy) against the real database — additive-only, safe per `DEPLOYMENT_CHECKLIST.md`.
   - [ ] Confirm `GET <backend-url>/health/live` → `200` and `GET <backend-url>/health/ready` → `200` with `checks.database: true`.
2. **Frontend — Static Site**
   - [ ] Set `VITE_API_BASE_URL` to the real backend URL from step 1 (build-time env var — must be set before the first build).
   - [ ] Build command `cd frontend && npm install && npm run build`; publish directory `frontend/dist`.
   - [ ] Deploy. Confirm the live site loads and shows real data (not an error state).
   - [ ] Set the backend's `CORS_ALLOWED_ORIGINS` to this real frontend URL, then redeploy the backend so CORS takes effect.
3. **Post-deploy verification** — re-run `PRODUCTION_SMOKE_TEST.md` and `PRODUCTION_URLS.md`'s checklist against the real, live URLs; update both documents with real, observed results.
4. **Phone install** — follow `FOUNDER_INSTALL_GUIDE.md` on a real Android device once the frontend is live.

## Final Summary

| Field | Value |
|---|---|
| Frontend URL | Not deployed |
| Backend URL | Not deployed |
| Database status | Not provisioned |
| Health endpoints | Not verifiable — no running backend |
| PWA status | Not applicable — no live URL to install from |
| Scheduler status | Code-level only, unchanged since last real verification (`REAL-PHONE-PILOT-001`/`RC2-STABILIZATION-001`) — not re-verified live this phase (no running process exists) |
| Production secrets status | **Not ready** — `FINNHUB_API_KEY` confirmed still the exposed, previously-live-tested value (not rotated); `OPENAI_API_KEY` not confirmed as genuinely replaced; `JWT_SECRET` and `ADMIN_API_KEY` both empty (not generated) |
| Remaining risks | Deploying today would (a) reuse a credential already confirmed exposed and previously live, and (b) fail this application's own existing production startup validation outright (empty `JWT_SECRET` triggers a hard, already-built fail-fast exit) — so even absent the security concern, a deploy attempt right now would not boot |
| **Final verdict** | **BLOCKED** |
