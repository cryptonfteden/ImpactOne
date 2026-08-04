# Founder Deployment Checklist — REAL-PHONE-PILOT-001

A single, real go/no-go checklist for the operator taking ImpactOne live for the founder's first real week. Every item links back to where it was actually verified — this is a consolidation, not new claims.

## Before Deploying

- [ ] **Hosting chosen** for backend (any Node-process host) and frontend (any static HTTPS host) — operator decision, not made by this or any prior phase.
- [ ] **Real production Postgres provisioned**, `DATABASE_URL` set to it. Verified code-level: startup refuses to run without this (`FOUNDER-DEPLOYMENT-001`'s `DEPLOYMENT_VERIFICATION.md` Case 1).
- [ ] **`JWT_SECRET`** set to a real, random, production-only value (not the disclosed dev default). Verified: startup refuses to run in `NODE_ENV=production` otherwise.
- [ ] **`NODE_ENV=production`** actually set — this is what turns on every hard-fail check above.
- [ ] **`VITE_API_BASE_URL`** set to the real deployed backend's public HTTPS origin at frontend *build* time. Verified this phase-line: a build with this set embeds the real origin; a build without it embeds `localhost:5000/api`, which `validateOrigins()` flags as a real startup issue (`PHONE-INSTALLATION-001`).
- [ ] **`CORS_ALLOWED_ORIGINS`** set to the real deployed frontend's exact origin. Verified code-level: `app.js` only restricts CORS when this is non-empty; left unset, it allows all origins (a real, disclosed default, not a silent one).
- [ ] **`ADMIN_API_KEY`** set if any admin-only route will be reachable from this deployment.
- [ ] Confirm `.env`/secrets are set directly on the real hosting platform, never committed — verified this phase-line: `.env` is gitignored and absent from git history.

## Deploy

- [ ] Start the backend under a real process supervisor (systemd/pm2/orchestrator) that restarts on crash and sends a real `SIGTERM` (not `SIGKILL`) on stop.
- [ ] Confirm the supervisor's stop grace period is at least `SHUTDOWN_TIMEOUT_MS` (default 10000ms).
- [ ] Deploy `frontend/dist/` (built with the real `VITE_API_BASE_URL`) to the chosen static HTTPS host.

## After Deploy — Verify Against the Real Instance

- [ ] `GET /health/live` returns `200`. (Method and expected shape verified this phase against a real local instance: `{"status":"ok","uptimeSeconds":N}`.)
- [ ] `GET /health/ready` returns `200` with `checks.database: true`. (Verified this phase against a real local instance and real local database.)
- [ ] Production logs show no unexpected `5xx`/stack traces during the first real session. (Method verified this phase — real log inspected end-to-end, clean.)
- [ ] A real `SIGTERM` sent to the real production process (via the real supervisor, not manually) triggers a clean stop within `SHUTDOWN_TIMEOUT_MS`. **Not yet verified end-to-end this phase** — see `PRODUCTION_INCIDENTS.md` Incident 1. Unit-level shutdown logic is verified and passing; a live signal against an isolated production process still needs to be observed once real hosting exists.

## Phone Install (Requires the Founder's Real Device)

- [ ] Open the real deployed frontend URL in Android Chrome; confirm real data loads (proves `VITE_API_BASE_URL` was set correctly).
- [ ] Install via Chrome's "Install app" / "Add to Home screen"; confirm the manifest-driven install prompt appears.
- [ ] Launch from the home-screen icon; confirm standalone mode (no browser chrome).
- [ ] Close and reopen the installed app; confirm no re-invite prompt (session persistence via `localStorage`).
- [ ] Rotate the device in a few real screens; confirm portrait and landscape both render correctly.
- [ ] Toggle airplane mode briefly; confirm the shell still opens and shows an honest "unavailable" state, not a blank screen or stale data.
- [ ] After a redeploy, confirm the "Reload to update" banner appears and updates cleanly.

Exact step-by-step wording for the founder is in `FOUNDER_INSTALL_GUIDE.md` (from `PHONE-INSTALLATION-001`) — unchanged and still current.

## Sign-Off

This checklist is ready to execute once an operator has made the hosting/domain/secret decisions listed above. No item on this checklist has been marked complete without a real, cited verification — items still requiring the founder's device or a live production process are explicitly left unchecked, not assumed.
