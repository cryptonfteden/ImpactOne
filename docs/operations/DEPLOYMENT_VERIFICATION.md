# Deployment Verification — FOUNDER-DEPLOYMENT-001

Real evidence for every objective this phase's mission lists. Each item is marked **Verified in this environment** (with the exact command/output) or **Requires operator credentials or a hosting decision** (cannot be completed without a real host, domain, or secret this environment doesn't have).

## 1. Deploy the frontend to a real HTTPS origin

**Requires a hosting decision.** No specific host was named by the mission or the founder. The build artifact is ready (`frontend/dist/`, produced by `npm run build`, verified below) and is a plain static bundle deployable to any HTTPS static host. Choosing and provisioning that host is an operator decision outside this environment — see `FOUNDER_DEPLOYMENT_REPORT.md`.

## 2. Deploy the backend to a real HTTPS origin

**Requires a hosting decision.** Same reasoning — `backend/server.js` is ready to run under any Node process supervisor per the existing `DEPLOYMENT_CHECKLIST.md`/`ENVIRONMENT_SETUP.md`, unchanged this phase. No container/orchestrator was introduced (per this phase's own rule against Kubernetes/distributed infra).

## 3. Connect a persistent production database

**Requires operator credentials.** `DATABASE_URL` has no safe default (verified below — startup refuses to start without it). A real Postgres instance and its connection string must be provisioned by the operator; this environment has no such instance to connect to.

## 4. Configure the existing authentication system

**Code-verified, no change needed.** `JWT_SECRET` is already enforced as fatal-if-missing-or-insecure-default in `NODE_ENV=production` (see Case 1/2 below). The frontend's beta-invite identity flow (`X-Beta-User-Id` header, `apiClient.js`) is unchanged and already correct for this deployment's scale.

## 5. Configure the existing API-origin validation

**Code-verified.** This is exactly what `PHONE-INSTALLATION-001` added (`validateOrigins()` in `startupValidation.js`) — confirmed still working:

```
$ VITE_API_BASE_URL=https://api.impactone-founder.example.com/api npm run build   (in frontend/)
✓ built in 1.82s
$ grep -o "https://api.impactone-founder.example.com/api" dist/assets/apiConfig-*.js
https://api.impactone-founder.example.com/api
```
With the real origin set at build time, that exact origin is what's embedded in the shipped bundle — confirmed by grepping the actual built file, not by reading source alone. Rebuilding without it falls back to `localhost:5000/api`, confirmed by the same grep against the default build:
```
$ grep -o "localhost[^\"']*" dist/assets/apiConfig-*.js
localhost:5000/api`;...
```
This is the literal case `validateOrigins()` exists to flag in a production runtime — see `PRODUCTION_ENVIRONMENT_MATRIX.md`.

## 6. Configure CORS for the deployed frontend

**Requires a hosting/domain decision, mechanism code-verified.** `CORS_ALLOWED_ORIGINS` is read in `config/env.js` and applied in `app.js` (`corsOptions = CORS_ALLOWED_ORIGINS.length > 0 ? { origin: CORS_ALLOWED_ORIGINS } : undefined`) — confirmed by reading the actual code, unchanged and already correct. The real value (the deployed frontend's real domain) can't be set until that domain exists.

## 7. Configure production secrets securely

**Code-verified.** `.env` is gitignored (`.gitignore` lines 4–6: `.env`, `.env.local`, `.env.*.local`) and confirmed via `git log --all --full-history -- .env` to have never been committed to this repository. Real secret values must be set directly on the real hosting platform — an operator action, not a code change.

## 8. Configure Redis only if required

**Code-verified — not required.** `REDIS_URL` is warn-only; `services/redisCache/redisClient.js` already degrades to always-miss (functionally correct, just uncached) without it. For ≤5 users, this phase deliberately does not provision Redis — introducing it would be infrastructure this scale doesn't need.

## 9. Verify health/readiness endpoints

**Code-verified, real evidence gathered.** `backend/routes/healthRoutes.js` exposes `/health/live` (process-only check, never fails on a slow dependency) and `/health/ready` (real `SELECT 1` against the database via Prisma; checks Redis only if `REDIS_URL` is set). Reading the actual route handlers confirms both are already correctly wired — this phase changed neither. **Requires a running production instance with a real database** to observe an actual `200`/`503` response; not exercised against a live instance in this environment (no real `DATABASE_URL` available here).

## 10. Verify graceful restart behavior

**Code-verified.** `backend/server.js` registers a real `SIGTERM` handler (line 46) that calls the existing shutdown routine bounded by `SHUTDOWN_TIMEOUT_MS` (default 10000ms) — confirmed by reading the code, unchanged this phase. **Requires a real process supervisor** (systemd/pm2) sending a real `SIGTERM` to observe end-to-end; not exercised against a live supervised process in this environment.

## 11. Verify the PWA service worker and update banner

**Code-verified, unchanged from `PHONE-INSTALLATION-001`.** `sw.js`'s versioned cache + `skipWaiting`/`clients.claim`, and `UpdateBanner.jsx`'s real "Reload to update" prompt — both already verified correct in that phase; re-confirmed by re-reading, no regression.

## 12. Verify installation on Android Chrome

**Requires the founder's real phone.** No device is available in this environment. `manifest.json`'s installability fields (name, icons, `display: standalone`, `start_url`) are code-verified present and correct. See `PHONE_INSTALLATION_RESULT.md`.

## 13. Verify login and session persistence in standalone mode

**Requires the founder's real phone for the standalone-mode part; the persistence mechanism itself is code-verified.** The beta-identity value is written to `localStorage`, which is origin-scoped and survives app close/reopen by browser design — this needs no PWA-specific code. Actually confirming it survives a real installed-app relaunch needs a real device.

## 14. Verify real API data in the installed application

**Requires a live deployed backend + the founder's phone.** Cannot be produced without both a real reachable backend and a real device in the same test. What is verified: the frontend correctly renders whatever `VITE_API_BASE_URL` was set to at build time (evidence in item 5).

## 15. Verify portrait and landscape use

**Code-verified (pre-existing, unchanged).** Landscape/short-viewport media queries confirmed present in `workspace3d.css` and `styles.css` from `MOBILE-FIXES-001`. **Requires a real phone** to confirm the felt/visual result.

---

## Test/Build Evidence Run This Phase

- Backend + frontend full regression (`npm run test` at repo root, which runs `test:backend` then `test:frontend`): see commit message for the exact final pass counts.
- Frontend production build: succeeded (`✓ built in 2.02s`–`2.08s` across the runs performed this phase), same pre-existing `[INEFFECTIVE_DYNAMIC_IMPORT]`/chunk-size warnings as every prior phase, no new warnings.
- Backend production startup validation exercised directly (not just read) — three real scenarios via `validateEnvironmentOrExit`:

```
--- Case 1: production, nothing set ---
[startupValidation] WARNING: ADMIN_API_KEY is not set — admin-only routes are running without protection.
[startupValidation] WARNING: REDIS_URL is not set — the provider cache will run uncached (every provider call hits the real upstream API directly).
[startupValidation] WARNING: CORS_ALLOWED_ORIGINS is not set — CORS currently allows every origin. Set this to your real frontend origin(s) before serving real production traffic.
[startupValidation] Refusing to start — the following real configuration problems must be fixed first:
  - DATABASE_URL is not set. A real database connection string is required to start.
  - JWT_SECRET is not set (or is still the insecure development default). A real, random secret is required in production.
would exit with code 1

--- Case 2: production, DATABASE_URL + real JWT_SECRET set, CORS/REDIS/ADMIN unset ---
[startupValidation] WARNING: ADMIN_API_KEY is not set — admin-only routes are running without protection.
[startupValidation] WARNING: REDIS_URL is not set — the provider cache will run uncached (every provider call hits the real upstream API directly).
[startupValidation] WARNING: CORS_ALLOWED_ORIGINS is not set — CORS currently allows every origin. Set this to your real frontend origin(s) before serving real production traffic.
(valid: true — no exit)

--- Case 3: production, fully configured (DATABASE_URL, JWT_SECRET, CORS_ALLOWED_ORIGINS, ADMIN_API_KEY, REDIS_URL all set) ---
(no warnings, no errors, valid: true — no exit)
```

This confirms, with real executed code (not just source-reading), that the existing fail-fast behavior is correct and that this deployment's exact real-world configuration path (Case 2 → Case 3 as an operator sets each recommended var) behaves as documented in `PRODUCTION_ENVIRONMENT_MATRIX.md`.
