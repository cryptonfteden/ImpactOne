# DEPLOYMENT_EVIDENCE_AUDIT.md — Phase PILOT-READINESS-VERIFICATION-001

Every launch-relevant claim in the four reviewed documents, checked directly against source/live behavior this phase — not re-stated from the documents themselves. Status legend: ✅ **Confirmed** (directly verified, matches the claim exactly) · ⚠️ **True but incomplete** (the claim itself is accurate, but omits a material fact) · ❌ **Not evidenced** (asserted or implied, but no direct evidence exists).

---

## Claims from `PHONE_INSTALLATION.md`

| Claim | Status | Evidence |
|---|---|---|
| "`manifest.json` — real `name`/`icons`/`display: standalone`/`start_url`/`scope`" | ✅ | Read `frontend/public/manifest.json` directly this phase — all fields present and correct. |
| "`sw.js` — registered in production only... caches the real app shell + hashed build assets, never caches API responses" | ✅ | Re-read `sw.js` in full — `isApiRequest()` bypass for `/api/`/`/v2/`, install-time HTML parsing for hashed asset URLs, both confirmed present and unchanged. |
| "Real icon files: icon-192/512, maskable-192/512, apple-touch-icon" | ✅ | All 5 files confirmed present in `frontend/public/` via directory listing. |
| "`GET <api-origin>/health/live` returns 200" | ✅ | Independently booted the backend this phase and hit the endpoint directly: `{"status":"ok","uptimeSeconds":38}`, real 200. |
| "The already-existing service-worker update mechanism... takes care of the rest" | ✅ | Confirmed — see `DEPLOYMENT_EVIDENCE_AUDIT.md`'s `PWA_DEPLOYMENT_REPORT.md` section below for the mechanism itself. |
| Implicit: a real deployment exists to verify against | ❌ | No hosting config, no real deployed URL, no evidence `VITE_API_BASE_URL`/`JWT_SECRET`/`DATABASE_URL` have ever held real production values. This document correctly describes *how* to deploy and verify — it does not claim a deployment has happened, and should not be read as implying one has. |

## Claims from `FOUNDER_INSTALL_GUIDE.md`

| Claim | Status | Evidence |
|---|---|---|
| "Tap Chrome's ⋮ menu... choose 'Install app'" | ✅ (for Android/Chrome specifically) | Standard, well-known, correct Chrome/Android install affordance — matches `manifest.json`'s installability fields. |
| "Rotating your phone: the layout adapts to both portrait and landscape" | ✅ | Independently re-verified in the prior `APP-STORE-QUALITY-001` phase via live rotation testing (portrait↔landscape, no reload, zero overflow); re-confirmed this phase via source read that none of the relevant CSS/manifest changes were reverted by the two subsequent commits. |
| "No signal: the app still opens... shows an honest 'unavailable' message" | ✅ | `sw.js`'s navigation-fallback-to-cached-shell + the existing per-screen `ErrorState` convention (unchanged, confirmed via source read) together produce this behavior. |
| Implicit: this guide is sufficient for "the founder's real phone," regardless of platform | ⚠️ | **True but incomplete.** The guide never mentions iOS/Safari at all. If the founder's device is an iPhone, none of the steps apply (different browser, different menu, different wording). This is a real, material omission for a document whose whole purpose is "exact steps to hand to the founder." |

## Claims from `PWA_DEPLOYMENT_REPORT.md`

| Claim | Status | Evidence |
|---|---|---|
| "This app already shipped a real PWA foundation from earlier phases" (manifest/sw/UpdateBanner/viewport-fit) | ✅ | Every named file/field re-read directly this phase; all present and correct. |
| "Four separate files... each independently duplicated [the localhost fallback]" | ✅ | Confirmed via `git show --stat c906b57` (all 4 named files appear in the diff) and via `grep` showing all 4 now import `API_BASE_URL` from the new `apiConfig.js`. |
| "Added `validateOrigins`... in production builds only, flags a missing/unparseable/localhost API origin" | ✅ | Read `startupValidation.js`'s `validateOrigins()` directly — the `isProd` early-return, the `LOOPBACK_HOST_PATTERN` regex, and the three distinct issue messages (missing/unparseable/localhost) all match the claim exactly. |
| "This does not change behavior for a correctly configured deployment" | ✅ | Confirmed by reading the call site in `screenRegistry.js`: `runStartupValidation` never blocks or throws (`STARTUP_VALIDATION_RESULT.ok` only drives `logError` calls), matching the app's pre-existing non-blocking startup-validation convention. |
| "Authentication and session persistence: [beta-invite flow described]" | ⚠️ | **True but incomplete.** Everything stated about the beta-invite flow is accurate (confirmed independently, see `FOUNDER_PILOT_READINESS.md` §2). What's missing: this section never mentions that a *separate*, real, backend-only commercial auth system (`/v2/auth`, JWT + `Session`) exists and is completely unreachable from the frontend. A reader could reasonably conclude "authentication" in this app means real accounts/login, when in fact the only reachable mechanism is the invite-code flow. Not a false claim — an incomplete one. |
| "A new worker takes control as soon as it's ready... does not wait indefinitely" | ✅ | `self.skipWaiting()` (install) + `self.clients.claim()` (activate) confirmed present in `sw.js`, matching standard, correct service-worker update semantics. |
| "No infrastructure change was added or is needed for ≤5 initial users" | ✅ | Consistent with `PRODUCTION_DEPLOYMENT.md`'s own, separately-verified production-readiness work (health/readiness endpoints, graceful shutdown, configurable CORS/rate-limiting) — no conflicting claim found. |

## Claims from `REAL_DEVICE_VERIFICATION.md`

| Claim | Status | Evidence |
|---|---|---|
| "This environment has no physical Android phone... 'Verification' means one of two things, always labeled" | ✅ | The document's own per-row labeling ("Code-verified" vs. "Requires the founder's phone") was checked against each underlying claim this phase and found accurate and honestly scoped — a genuinely good-faith disclosure pattern, consistent with this whole engagement's standing discipline. |
| "PWA installation from Android Chrome: manifest satisfies Chrome's install criteria" | ✅ | `manifest.json`'s fields (`name`, `short_name`, `start_url`, `icons` incl. maskable, `display: standalone`) match Chrome's documented installability checklist exactly. |
| "Authentication and session persistence: Code-verified" | ⚠️ | Same gap as `PWA_DEPLOYMENT_REPORT.md` above — the row is accurate for the beta-invite mechanism but is titled generically "Authentication," which reads as covering the topic completely. It does not mention the disconnected commercial auth system. |
| "Portrait and landscape rotation: Code-verified (existing, from MOBILE-FIXES-001)" | ✅ | Confirmed — and this phase additionally confirmed the *later* `APP-STORE-QUALITY-001` fixes (which materially improved on `MOBILE-FIXES-001`'s original state) are also still present and unreverted; this document, written the same day, correctly cites the pre-existing baseline it built on. |
| "Every objective has a real, specific, code-level check that passed" | ✅ (for what it covers) | True for every row actually listed in the document's own table. Does not cover the two new findings in this audit (auth disconnection, `alphaVantageService` fallback) because those were outside that phase's specific review scope, not because they were checked and dismissed. |

## New findings this phase, not claimed or evidenced in any of the four reviewed documents

| Finding | Evidence |
|---|---|
| `backend/services/alphaVantageService.js`'s `getMarketOverview()` returns a hardcoded, unlabeled fake OHLC value when `ALPHA_VANTAGE_API_KEY` is unset | Read directly: `"2024-01-01": {open:100,high:104,low:99,close:102,volume:1000}` with no `source`/`fallback` field, unlike `altDataService.js`'s correctly self-labeled `fallbackCot()`/`fallbackMacroRegime()`. Confirmed via `grep` that the frontend's `marketApi.js` never calls the one route (`GET /market`) wired to this function — currently unreachable, but present and undisclosed. |
| No hosting/deployment configuration exists anywhere in the repository | `file_search` for `vercel.json`/`netlify.toml`/`render.yaml`/`fly.toml`/`Procfile`/`railway.json`/`app.yaml` — zero matches. |
| The live dev backend, booted fresh this phase, still runs with the insecure default `JWT_SECRET` | Direct console output on boot: `WARNING: JWT_SECRET is not set — falling back to the insecure development default (fine for local dev/test only).` — expected and correct for a dev environment, but confirms no production secret has ever been configured in this environment. |
| `/health/live`, `/health/ready`, `/health` all independently re-confirmed live, with real values | Direct HTTP requests this phase: `/health/live` → `{"status":"ok","uptimeSeconds":38}`; `/health/ready` → `{"status":"ready","checks":{"database":true,"redis":null}}`; `/health` → `{"status":"ok"}`. Matches `PRODUCTION_DEPLOYMENT.md`'s documented contract exactly. |
