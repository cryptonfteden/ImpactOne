# REAL_DEVICE_RISK_REGISTER.md — Phase PILOT-READINESS-VERIFICATION-001

Every finding from `FOUNDER_PILOT_READINESS.md`/`DEPLOYMENT_EVIDENCE_AUDIT.md`, ranked by real risk to a one-person founder pilot — severity assigned from the observed/verified effect, reusing `BUG_SEVERITY_STANDARD.md`'s Critical/High/Medium/Low scale rather than a new one.

---

## Risk 1 — No real deployment has occurred yet

**Severity: Critical (blocks pilot start, not the product itself)**

**What was verified:** zero hosting configuration exists anywhere in the repository; zero evidence `JWT_SECRET`/`DATABASE_URL`/`VITE_API_BASE_URL` have ever been set to real production values; a fresh backend boot in this environment still falls back to the insecure dev `JWT_SECRET` default.

**Why it's Critical for pilot start specifically:** `SEVEN_DAY_USAGE_SCRIPT.md`'s Day 1 literally cannot begin without a real, reachable HTTPS origin to install from. This is not a product defect — the infrastructure to deploy onto is real, tested, and sound (`PRODUCTION_DEPLOYMENT.md`, independently re-verified this phase) — but the deployment *action* itself has not happened, and the mission's own instruction ("do not infer successful deployment without direct evidence") means this must be stated plainly rather than assumed complete because the supporting code is ready.

**Mitigation:** deploy the backend to a real HTTPS host with a real `JWT_SECRET`/`DATABASE_URL` (startup validation will refuse to boot in `NODE_ENV=production` without them — a real, tested safety net, not a hope); rebuild the frontend with `VITE_API_BASE_URL` pointed at that real origin; host `frontend/dist/` over HTTPS; run `PHONE_INSTALLATION.md`'s own 4-step pre-handoff verification checklist for real before Day 1.

---

## Risk 2 — `FOUNDER_INSTALL_GUIDE.md` is Android/Chrome-only

**Severity: High (blocks Day 1 if the founder's device is an iPhone; zero risk otherwise)**

**What was verified:** the guide's every instruction names Chrome and "your Android phone" explicitly; no iOS/Safari path is documented anywhere in the four reviewed deployment docs.

**Mitigation:** confirm the founder's actual device before Day 1. If iOS, write the equivalent Safari "Add to Home Screen" steps (Share sheet → "Add to Home Screen," not a browser menu) before the pilot begins — this is a documentation gap, not a code gap; the underlying manifest/service-worker already support iOS installability (`display: standalone`, real icons including `apple-touch-icon.png`, `apple-mobile-web-app-capable` meta tags already present in `index.html`, confirmed in the prior `APP-STORE-QUALITY-001` phase).

---

## Risk 3 — The new commercial auth system's disconnection from the frontend is undisclosed

**Severity: Medium (not a functional blocker for this specific pilot; a real disclosure/expectation-setting gap)**

**What was verified:** a real, backend-mounted `/v2/auth` route (JWT + `Session` model) exists with zero frontend integration (zero references anywhere in `frontend/src` to `/v2/auth`, JWT, `Authorization`/`Bearer`, or any login/password UI). The founder pilot's actual, working identity mechanism is the older beta-invite flow (`localStorage` + `X-Beta-User-Id`), which is real, tested, and sufficient for a one-person pilot.

**Why Medium, not blocking:** the pilot doesn't need the commercial auth system — the beta-invite flow already does everything a one-person pilot requires (persistent identity across restarts, honest expiry handling). The risk is purely one of **undisclosed scope**: without this being named explicitly, a reader of `PWA_DEPLOYMENT_REPORT.md`'s "Authentication and session persistence" section could reasonably believe the topic is fully covered.

**Mitigation:** add one explicit sentence to the deployment documentation (or this audit stands in for it) stating that real user accounts/login/billing are not yet reachable from the app, and that the pilot runs entirely on the invite-code identity mechanism.

---

## Risk 4 — `alphaVantageService.js`'s unlabeled fabricated fallback data

**Severity: Low today (confirmed unreachable), Medium if ever wired to a screen without re-checking this**

**What was verified:** `getMarketOverview()` returns a hardcoded fake OHLC candle with no `source`/`fallback` label when `ALPHA_VANTAGE_API_KEY` is unset — a real violation of this codebase's own established "fabricated fallback data must self-label" convention (contrast with `altDataService.js`'s correctly-labeled `fallbackCot()`/`fallbackMacroRegime()`). Confirmed via `grep` that the frontend's `marketApi.js` never calls the one backend route (`GET /market`) wired to this function, so it does not currently reach any real user.

**Mitigation:** either add the missing `source: "fallback"` label (a one-line, low-risk fix matching the existing convention elsewhere) or remove the dead route/service if it's confirmed to have no planned future use — either is a future, explicitly-scoped fix, not performed in this audit-only phase per the mission's "do not modify code" instruction.

---

## Risk 5 — Startup-misconfiguration detection is developer-visible, not founder-visible

**Severity: Low**

**What was verified:** `validateOrigins()`'s findings are logged to the console and best-effort POSTed to the backend's error-report endpoint, but produce no distinct, founder-facing UI message. A founder without remote-debugging access who installs a misconfigured build would see every screen's own generic "unavailable" state, not a specific "your app is pointed at the wrong server" message.

**Mitigation:** acceptable as-is for a one-person pilot with direct access to whoever configured the deployment (the founder and the person running this pilot are effectively the same trust boundary); would be worth a more visible surface (e.g. a dedicated banner) only if this app were being handed to a less technical operator.

---

## Summary table

| # | Risk | Severity | Blocks Day 1? |
|---|---|---|---|
| 1 | No real deployment has occurred | Critical | **Yes** |
| 2 | Install guide is Android-only | High | Only if founder's device is iOS |
| 3 | Auth-system disconnection undisclosed | Medium | No |
| 4 | Undisclosed AlphaVantage fallback | Low (currently dead code) | No |
| 5 | Misconfiguration detection not founder-visible | Low | No |

No Critical finding was found in the product/code itself — the sole Critical item (#1) is an operational action (deploy it) that has not yet been taken, not a defect in what's been built.
