# PILOT_START_DECISION.md — Phase PILOT-READINESS-VERIFICATION-001

## Verdict: **READY WITH CONDITIONS**

---

## Reasoning

Every piece of the *product and infrastructure* checked in this audit was directly, independently verified — not inferred, not trusted from a commit message or a prior document's own claim — and held up: the PWA foundation (manifest, service worker, icons, update mechanism), the mobile layout fixes from the immediately preceding `APP-STORE-QUALITY-001` phase, the production-deployment infrastructure (startup validation, health/readiness/liveness endpoints, graceful shutdown, configurable CORS/rate-limiting), the beta-invite identity/session mechanism, and the just-landed `localhost`-dependency fix all independently checked out true. 621/621 frontend tests re-run fresh this phase, matching the latest commit's own claim exactly. `/health/live`, `/health/ready`, and `/health` were hit directly against a freshly booted backend and returned real, correct responses.

This is **not** a NOT READY verdict, because nothing found is a defect in the product itself — every gap identified is either an operational action not yet taken, or a documentation/disclosure completeness gap, never a broken mechanism.

This is **not** a clean READY verdict, because of one fact this phase's own explicit instruction ("do not infer successful deployment without direct evidence") specifically exists to catch: **no real deployment has actually occurred.** No hosting configuration exists anywhere in the repository, no evidence any production secret or origin has ever been set to a real value, and a fresh backend boot in this environment still runs on the insecure development `JWT_SECRET` default. A founder pilot on a real phone cannot literally begin until a real backend is deployed to a real HTTPS origin and the frontend is rebuilt pointing at it — that is the single blocking condition below.

## Conditions required before Day 1 of the pilot

1. **Deploy the backend to a real, public HTTPS origin**, with real `DATABASE_URL` and `JWT_SECRET` values set (the app's own startup validation will refuse to boot in `NODE_ENV=production` without them — a real, already-tested safety net, not a hope).
2. **Rebuild the frontend with `VITE_API_BASE_URL` pointed at that real origin**, host `frontend/dist/` over HTTPS, and run `PHONE_INSTALLATION.md`'s own 4-step "Verifying the Deployment Before Handing It to the Founder" checklist for real — confirming a real screen (e.g. Home) shows real data before handing the URL to the founder.
3. **Confirm the founder's actual phone platform before Day 1.** If it is an iPhone, write the missing Safari/iOS install steps first — `FOUNDER_INSTALL_GUIDE.md` today only covers Android/Chrome. (The underlying manifest/icons/meta tags already support iOS installability; only the founder-facing instructions are missing.)
4. **Disclose, in whatever document accompanies the deployed build, that real user accounts/login/billing are not yet reachable** — the pilot runs entirely on the existing beta-invite identity flow, which is real and sufficient, but a separate commercial auth system exists on the backend with zero frontend reachability and should not be assumed to be "the" authentication for this pilot.

## Conditions worth closing but not blocking

- `alphaVantageService.js`'s unlabeled fabricated OHLC fallback (`REAL_DEVICE_RISK_REGISTER.md` Risk 4) — currently unreachable from any real screen; low urgency, but should be labeled or removed before any future feature is wired to the route it backs.

## What does NOT need to happen before Day 1

- No further mobile-layout, safe-area, or touch-target work — all independently re-confirmed still correct and unreverted.
- No further PWA/service-worker changes — the existing mechanism is sound and was re-verified, not just re-read.
- No changes to the founder-pilot planning documents (`FOUNDER_PILOT_PLAN.md`/`SEVEN_DAY_USAGE_SCRIPT.md`/`REAL_DEVICE_FEEDBACK_TEMPLATE.md`/`FOUNDER_GO_NO_GO.md`) — their navigation references were re-checked against the current codebase and remain accurate.

## Re-verification requirement

Once the deployment conditions above are met, this verdict should be re-confirmed against the *real, deployed* build specifically — the same discipline this whole engagement has applied throughout: a prior finding is only closed once independently re-observed as fixed on the actual artifact in question, not assumed fixed because the supporting code was verified in isolation.

---

**No production code was modified to produce this verdict or any of this phase's supporting documents. Nothing was committed.**
