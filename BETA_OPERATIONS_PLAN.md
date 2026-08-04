# Beta Operations Plan — Phase F1

Design only — no code changes in this phase. Grounded in what already exists in the codebase (cited per section) plus the specific gaps a 5-person closed beta needs filled. AI quality, recommendation logic, and committee behavior are explicitly out of scope.

## 1. Beta Onboarding Flow

**Already exists:** a real, working onboarding gate (`AppRoot.jsx` → `OnboardingFlow`), with `onboarding_completed`/`onboarding_step_completed`/`onboarding_step_skipped` analytics already instrumented, plus Phase E2's one-time `WelcomeOverlay` for post-onboarding expectation-setting.

**What a 5-person beta needs on top of this (design, not build):**
- A pre-onboarding "beta" framing screen (one static card, no new data): who this is, what's real vs. simulated, and a direct line to the founder for support — the product currently drops a user straight into the profile form with no context, which E1 already flagged.
- A named cohort identifier. Since there's no account system, the simplest non-invasive addition is a single required onboarding field — "How did you hear about this beta?" or a pre-shared invite code — captured once, so the 5 users are distinguishable in feedback/analytics without building auth.
- A "Day 1 checklist" surfaced once (reusing `WelcomeOverlay`'s pattern): add a position or two, check Recommendations, try AI Analysis on one ticker. Purely to seed a first real session with content, per Phase E3's own highest-ROI finding.

## 2. Feedback Collection

**Already exists:** a real, working feedback mechanism on individual recommendations (`RecommendationCard.jsx` → `POST /v2/recommendations/:id/feedback`, types including `DONT_UNDERSTAND`).

**Gap:** there is no general, product-wide feedback channel — only per-recommendation. For 5 named beta users, the highest-leverage low-effort addition is **not** a new in-app widget (that's implementation, out of scope this phase) but an **operational** channel: a shared, monitored inbox or a single shared doc/form link given directly to the 5 users at onboarding, explicitly separate from the per-recommendation mechanism (which stays scoped to "I don't understand this specific call"). Recommend:
- Per-recommendation feedback (existing): stays as-is, for reasoning-quality signal.
- General product feedback (new, operational only): a direct email alias or a shared form link, given once during onboarding, checked daily by the founder during the beta window.
- Weekly structured check-in: one short async question sent to each of the 5 users ("what did you almost stop using this week, and why") — cheaper and more reliable than waiting for unprompted feedback.

## 3. Version Information

**Gap — nothing exists today.** No `/api/version` endpoint, no UI version display, `frontend/package.json` has `"version": "0.1.0"`, root `package.json` has no version field at all.

**Design:**
- Backend: extend the existing `GET /health` endpoint (`backend/app.js`) to also return `{status, version, commit, deployedAt}` — `version` read from `package.json`, `commit` from `git rev-parse --short HEAD` at boot (or a build-time env var if deploys are containerized), `deployedAt` set once at process start.
- Frontend: a small, unobtrusive version string in Settings (which Phase E2 already made an honest place for "here's what's real") — e.g. "ImpactOne beta · v0.1.0 · build a1b2c3d." Lets a beta user quote an exact version when reporting an issue, and lets the founder know instantly if a user is on stale cached JS.

## 4. Feature Flags

**Already exist:** `VITE_PORTFOLIO_ENGINE` (legacy/api, now defaulted to `api` for beta per Phase E2), `VITE_DEV_CONSOLE` (undocumented, dev-only, correctly hidden from beta users), `VITE_API_BASE_URL`.

**Design for the beta specifically:**
- Formalize a single `frontend/.env.beta` (or documented `.env` block) as the canonical beta configuration, separate from local dev defaults — avoids the exact kind of accidental-default drift Phase E2 had to work around with `.env.test`.
- No new flags are needed to operate the beta itself; the existing two are sufficient. Resist adding beta-specific feature flags beyond what's already here — more flags mean more untested permutations for 5 users who should all see the same product.
- Document flag state explicitly in `RELEASE_CHECKLIST.md` (below) so "which build has which flags on" is never ambiguous during the beta window.

## 5. Error Reporting

**Gap — errors are currently console-only.** `AppErrorBoundary`/`ScreenErrorBoundary` both call `logError`, which only `console.error`s. Nothing reaches the founder unless a beta user happens to open devtools and report it verbatim — unrealistic for 5 non-technical testers.

**Design (minimal, no new dependency required for a 5-person beta):**
- A new, small backend endpoint, `POST /api/v2/errors`, mirroring the existing analytics endpoint's shape (allowlist-validated payload, no PII) — accepts `{message, stack, componentName, sessionId, url, timestamp}`.
- `errorHandling.js`'s `logError` gains a second, best-effort branch: after `console.error`, fire-and-forget POST to the new endpoint (same `keepalive: true` pattern already used by `analytics.js` — proven, low-risk).
- Both error boundaries already call `logError` in exactly the place needed — no boundary logic changes, just what `logError` does internally.
- For a 5-person beta, skip a third-party service (Sentry, etc.) entirely — the data volume doesn't justify the integration cost, and a simple DB table + the founder checking it daily is sufficient operationally.

## 6. Analytics Events

Full inventory and additions: see `ANALYTICS_EVENT_MAP.md`. Summary: 12 events already instrumented and flowing to a real backend endpoint with allowlist validation on both ends — a genuinely solid foundation. This phase's design adds a small number of beta-operations-specific events (error reported, feedback submitted generally, version viewed) rather than touching anything AI/recommendation-quality related.

## 7. User Session Tracking

**Already exists:** an anonymous per-browser correlation UUID (`impactone-session-id`, localStorage) attached to every analytics event, plus a server-side singleton `InvestorProfile` (no multi-account model).

**Gap for a 5-person named beta:** the current model can't distinguish "5 different people" from "1 person on 5 different days" — sessionId is per-browser, not per-person, and regenerates if storage is cleared. For a beta this small, building real auth is disproportionate. Recommend instead:
- At onboarding, capture the cohort-identifier field from §1 (invite code / "how did you hear about this") and attach it to the `InvestorProfile` record (already the natural place — one real profile exists per install today) — this de-anonymizes the existing sessionId without building login.
- Explicitly document to the 5 users: "this beta is one browser = one identity; don't switch devices mid-beta" — an operational rule, not a technical one, appropriate for this phase's scope.

## 8. Release Checklist

See `RELEASE_CHECKLIST.md` — a standalone, actionable pre-launch checklist.

## 9. Beta Support Workflow

- **Intake:** the general-feedback channel from §2 is the single intake point. Per-recommendation feedback stays separate (reasoning-quality signal, already routed to the existing feedback API).
- **Triage cadence:** founder checks the feedback inbox/form and the new error-reporting table (§5) once daily during the beta window (suggested: every morning before market open, consistent with the product's own "Morning Brief" framing).
- **Response SLA (informal, 5-person scale):** acknowledge within 24 hours; a same-day reply is the goal for anything that looks like a trust-breaking bug (per Phase E1's Critical/High findings — e.g. anything that makes a Settings-style control look broken).
- **Escalation:** anything that looks like a data-integrity issue (wrong price, wrong recommendation reasoning, a lost portfolio) gets logged immediately with the exact recommendation/session ID from the error-reporting payload, even if not yet fixed — matching this whole engagement's "never fabricate, always trace" discipline from the D1–D1.8 phases.
- **Beta-end debrief:** a short structured exit question to each of the 5 users ("would you keep using this tomorrow, why or why not") — deliberately mirroring Phase E3's own founder-simulation framing, so the founder's own judgment and the 5 real users' judgment are directly comparable.
