# Release Checklist

## Phase X6 — Automated Pre-Merge Release Validation (RC1)

Run before any future merge: `node backend/scripts/releaseValidation.js`. Exits `0` only if every check below passes; exits `1` on the first hard failure, printing exactly which check failed — the release fails automatically, per the mission, rather than requiring a human to notice.

### What each mission-named area maps to

| Mission area | How it's actually checked |
|---|---|
| Application boots | The real Vite production build (`npm run build`) succeeding — the one mechanical check that catches a broken import, a missing export, or a broken lazy import at build time. |
| Frontend available | Same build check — a successful production build is the frontend being buildable/deployable. |
| Backend available | Real `GET /api/v2/home-summary` against the live Express app, via `supertest`. |
| Identity | A real `BetaUser` row resolves via `betaUserRepository` (find-or-create, same pattern every X4/X5 integration test uses). |
| Protected routes | Real `GET /api/v2/decisions` rejects with no `X-Beta-User-Id` header (400) and succeeds with a real one (200). |
| Notifications | Real `GET /api/v2/notifications` with a real identity returns 200. |
| Shared providers, Theme, Routing, Charts, Decision Center (render), Side Panel | **Explicitly delegated to the frontend test suite** (`npm run test:frontend`), not faked here — see below. |

### Real bug found and fixed by this script

The very first run of this script (during this phase's own development) failed the build check with `[MISSING_EXPORT] "BETA_USER_LABEL_STORAGE_KEY" is not exported by "src/screens/onboarding/BetaInviteGate.jsx"`. `Header.jsx` had imported this key from the wrong file — it moved to `useBetaIdentity.js` during Phase X4's identity-flow rewrite, and this one import site was never updated. `npm run dev` and every Vitest run both tolerated the mismatch; only the real production build caught it. **This means the app has been silently broken in production since Phase X4**, discovered only now. Fixed as part of this phase (`Header.jsx` now imports from the correct module). See `STARTUP_VALIDATION.md` for the full account.

### What this script does not check, and why

Charts/Side Panel/Theme/Routing/Shared providers are frontend render-time concerns with no server-side signal — this script does not spin up a headless browser to fake-check them. They are real, already covered by the frontend test suite (`AdvancedChart.test.jsx`, `StockSidePanel.test.jsx`, theme-related component tests, `AppRoot.test.jsx` for routing/providers) — a release is only "safe" once both this script **and** `npm run test` (backend + frontend) pass. Neither alone is the full gate.

### The full pre-merge sequence

1. `node backend/scripts/releaseValidation.js` — fast (~5s once build/backend are warm), catches structural breakage.
2. `npm run test` — full backend + frontend regression, catches behavioral breakage.
3. Manual smoke check of the Health Dashboard (`SYSTEM_HEALTH_SPEC.md`) if the change touches a critical module, to confirm `overall: HEALTHY` in a real running instance.

If any of the three fail, the release does not proceed.

---

# Closed Beta Launch Checklist (5 users) — Phase F1

Design only — this is the checklist to execute before and during the beta, not a record of it having happened. No item here has been performed as part of Phase F1. Superseded in practice by the 2-user beta scope established in later phases (H2 onward) — kept here for its still-relevant operational content (config hygiene, rollback plan), not as a literal user count.

## Before Inviting Anyone

**Configuration**
- [ ] Confirm `backend/.env` has real `FINNHUB_API_KEY`, and ideally a working news/wire provider key (per Phase D1.7's dependency certification — without these, the recommendation engine may sit empty for real days).
- [ ] Confirm `frontend/.env` (or `.env.beta`) has `VITE_PORTFOLIO_ENGINE=api` (Phase E2's default) and `VITE_DEV_CONSOLE` unset/absent.
- [ ] Confirm `DATABASE_URL` points at a real, backed-up database — not the same instance used for local dev/test churn.

**Data hygiene**
- [ ] Decide: does the beta start from a clean database, or does it inherit the 279+ existing recommendations from prior sprints? (Recommend clean — the historical backlog is permanently `INVALID`/`CONTAMINATED` per D1's findings and would only confuse a first-time beta user browsing history.)
- [ ] If clean: run a fresh migration deploy (`npm run db:deploy` or equivalent), confirm `0` recommendations, `0` outcomes.

**Operational readiness (per D1.7/D1.8)**
- [ ] Confirm `FINNHUB_API_KEY` is live in whatever process will actually serve the beta (verify via `GET /api/quote?symbol=AAPL`, not just that the env file has it — Phase D1.8 caught exactly this gap once already).
- [ ] Confirm the scheduler (`providerScheduler`, `schedulerService`) is actually started in the deployed process, not just callable manually.
- [ ] Run one real engine cycle before inviting users, so the beta doesn't open on a guaranteed-empty Recommendations screen (per Phase E3's single highest-ROI finding).

**Version & error reporting (per this phase's design, `BETA_OPERATIONS_PLAN.md` §3/§5)**
- [ ] If implemented: confirm `GET /health` returns a real version/commit, and the version string is visible in Settings.
- [ ] If implemented: confirm the error-reporting endpoint receives a real test error end-to-end (throw a deliberate error in dev, confirm it lands in the table).

**Testing**
- [ ] `npm test` (root) passes in full — both backend and frontend suites.
- [ ] Manual smoke test of the full journey from Phase E1/E3's own map: Onboarding → Home → Recommendations → Portfolio (place + reset an order) → AI Analysis → Settings.
- [ ] Confirm the 5 Critical/High UX fixes from Phase E2 are live in whatever build ships (Portfolio Engine default, premium empty state, welcome overlay, branded loading, honest Settings labeling).

## Communication Before Launch

- [ ] Each of the 5 beta users receives: the invite link, the general-feedback channel (§2 of the operations plan), and a one-paragraph honest framing of what's real vs. simulated — matching the product's own "never fabricate" ethos rather than overselling.
- [ ] Founder has a shared doc/spreadsheet ready to log daily triage notes (per the support workflow in `BETA_OPERATIONS_PLAN.md` §9).

## During the Beta

- [ ] Daily: check the feedback channel and error-reporting table (once per morning, before market open).
- [ ] Daily: spot-check that the recommendation engine actually produced something in the last 24h (`GET /api/v2/recommendations/status`) — a silent multi-day empty period is the single biggest risk this whole engagement has surfaced repeatedly.
- [ ] Weekly: send the structured async check-in question to each user.
- [ ] Log every reported issue with its real recommendation/session ID, even before it's fixed.

## Rollback Plan

- [ ] Confirm there is a known-good previous state to revert to (a specific commit/tag) if a beta-blocking bug appears — this checklist assumes normal git discipline resumes after this planning phase; no rollback has been rehearsed as part of F1.
- [ ] Confirm the database can be restored to a pre-beta snapshot if beta data needs to be discarded before a wider release.

## At Beta End

- [ ] Run the exit debrief question with all 5 users (`BETA_OPERATIONS_PLAN.md` §9).
- [ ] Compile: feedback volume/themes, error-reporting volume/themes, analytics funnel (onboarding → first recommendation viewed → returning-user rate), and a plain readiness verdict for the next phase.
