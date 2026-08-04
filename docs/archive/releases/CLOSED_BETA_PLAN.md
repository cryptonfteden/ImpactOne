# Closed Beta Plan — ImpactOne

**Phase:** PILOT-PREPARATION-001. Documentation only unless a deterministic blocker is found (none was — no production code was modified). Grounded in a fresh `git log` check (2 new commits since `AI-TRUST-001`: `e63fb6c MVP-COMPLETION-001` and `fc010dc` — a substantial new **commercial infrastructure** build: real credentialed `User` accounts, JWT sessions, a `Plan`/`Subscription`/`UsageCounter` model, and a vendor-agnostic billing facade, confirmed real via `COMMERCIAL_INFRASTRUCTURE.md`'s own detailed report — 2478/2480 backend tests passing, 566/566 frontend) and a fresh survey of this platform's real, already-existing beta-operations stack (`betaMetricsService.js`, `errorReportService.js`, `feedbackService.js`, `adminDashboardService.js` — all confirmed real via direct source read this session).

**Headline framing for this whole plan**: ImpactOne's first closed beta is **not starting from zero on the operational side** — a real analytics pipeline, real error reporting, real feedback persistence, and (as of today) a real credentialed-user auth/billing system all already exist and are tested. The job this plan does is **staging and sequencing what's already real**, not specifying new infrastructure from scratch.

---

## A decision this plan must make explicit: two coexisting identity systems

Confirmed via direct source read of `COMMERCIAL_INFRASTRUCTURE.md`: this platform now has **two parallel, only loosely-linked identity systems** — the original `BetaUser` model (an invite-code-based identifier, extensively live-tested across this whole engagement's history, confirmed working end-to-end via a real URL-based invite flow) and the brand-new `User` model (real email/password registration, JWT sessions, billing). `User.betaUserId` is an optional, unenforced string link between the two — **they do not merge automatically.**

**This plan's explicit recommendation**: run the first closed beta on the **new `User`/auth system**, not the legacy `BetaUser` invite-code system. Reasoning: a genuine closed beta with real external users needs real account recovery (password reset — currently a disclosed gap, see below), real session management, and a real path to eventual monetization — all of which only the new system provides. The `BetaUser` system should be treated as **deprecated for new cohorts** going forward, not extended.

---

## Review by area

### First-run experience
Confirmed live (this engagement's own prior session): a genuinely strong, honest "Welcome to the Beta" onboarding modal (3 plain-language trust disclosures). **Gap, newly relevant given the new auth system**: no onboarding flow has been built yet for the new `register` → `verify email` (no email verification exists — a disclosed MVP-scope gap) → `first login` → `welcome modal` sequence — the existing modal was built against the old `BetaUser` flow and has not been re-verified against the new auth system's own first-run path.

### Feedback collection
Real, persisted (`feedbackService.js`/`feedbackRepository.js`, confirmed live this session), surfaced via 2 separate mechanisms today: a floating Feedback widget (confirmed live, with a known, real, previously-found layout-collision bug against the mobile bottom nav) and a per-Recommendation 6-option reaction picker. **Neither is currently linked to which specific user submitted it in a way that supports real 1:1 follow-up conversations** — worth closing before broad pilot outreach.

### Error reporting
**A genuinely stronger foundation than this engagement's own prior reviews assumed** — confirmed real this session: `ErrorReport` (Prisma model), `errorReportService.js`, `errorReportController.js`, and `errorHandler.js` middleware writing a real row for every backend error, in addition to console output. **Open, unverified question**: whether the *frontend's* own error boundaries (`AppErrorBoundary`/`ScreenErrorBoundary`, confirmed to exist in earlier engagement sessions) actually POST to this real backend endpoint, or still only `console.error` locally — this was not re-verified this session and should be the first thing confirmed before the pilot begins, since a frontend crash with no backend record would be invisible to the team.

### Analytics
Real, tested (`analytics.js`'s frontend allowlist, independently re-validated server-side; `betaMetricsService.js` computing real Activation Rate/Retention/Daily Usage from actual `AnalyticsEvent` rows, with an honest "report zero, never estimate" discipline confirmed via direct source read). A strong foundation for `PILOT_SUCCESS_METRICS.md`.

### User support
**Still a real, disclosed gap** — this engagement's own extensive prior history found `DashboardFooter.jsx`'s Help/Feedback/Terms links to be literal inert `<span>` elements; no dedicated support-ticket/contact channel exists beyond the Feedback widget and per-recommendation reactions. This was not re-verified live this session (no browser walkthrough performed) and should be confirmed before the pilot, but no commit in this engagement's recent history suggests it has changed.

### Beta onboarding
See the identity-system decision above — recommend building/verifying the new `User`-system's own first-run onboarding path before pilot start, reusing the existing welcome-modal copy.

### Feature flags
Real, tested (`FeatureFlag` model, `featureFlagService.js`), but **zero flags have ever been created** in this platform's real history. This is a real, usable, currently-idle capability — the pilot should adopt it as its primary kill-switch mechanism (e.g., a `pilot_cohort_enabled` flag gating the new registration flow) rather than leaving it unused for a third consecutive review cycle.

### Release strategy
This platform already has a mature, established release-gate discipline (`GO_LIVE_CRITERIA.md`, `LAUNCH_CHECKLIST.md`, `LAUNCH_ROADMAP.md`) — this plan does not duplicate that; see the **Release Timeline** section below for how the pilot specifically sequences relative to those already-defined gates.

### Success metrics
See `PILOT_SUCCESS_METRICS.md`.

### Rollback plan
`OPERATIONS_RUNBOOK.md` already documents a rollback-strategy summary table for the Agent Platform's own recent changes. This plan extends that discipline to the pilot specifically — see below.

---

## Closed Beta structure

- **Cohort size**: 25-100 real users (per the mission's own "First 100 Users" framing) — recommend starting with a smaller sub-cohort (10-15) in week 1 to validate the brand-new auth/onboarding path before opening to the full 100, directly reusing this whole engagement's own repeatedly-successful "validate one real path first" discipline.
- **Access mechanism**: real self-service registration via `/api/v2/auth/register`, gated by a `FeatureFlag` (new, to be created) rather than a hardcoded environment check — reversible without a deploy.
- **Default plan**: every new registrant starts on the real, already-seeded `free` plan (`entitlementService`'s own honest default) — no pilot user is charged during the closed beta; `BILLING_PROVIDER=manual` should remain the default for the entire pilot duration, deferring real Stripe traffic until after the pilot concludes and the disclosed webhook raw-body gap (see `COMMERCIAL_INFRASTRUCTURE.md`) is closed.

## Rollback plan (pilot-specific)

| Trigger | Action |
|---|---|
| A critical bug affects new registrations specifically | Disable the pilot's own `FeatureFlag` — reverts to invite-only access instantly, no deploy required |
| A critical bug affects the whole platform | Follow `OPERATIONS_RUNBOOK.md`'s existing incident-response playbook (already established) |
| The new auth/billing system itself is found unstable | Fall back to onboarding new pilot participants via the legacy `BetaUser` invite-code flow (proven, extensively tested) while the auth system is fixed — the two systems' coexistence (rather than a hard cutover) is exactly what makes this fallback possible |
