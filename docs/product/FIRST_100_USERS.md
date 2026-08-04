# First 100 Users — ImpactOne Closed Beta

**Phase:** PILOT-PREPARATION-001. Companion to [CLOSED_BETA_PLAN.md](../archive/releases/CLOSED_BETA_PLAN.md) and [PILOT_SUCCESS_METRICS.md](PILOT_SUCCESS_METRICS.md). Documentation only. Covers the User Feedback Workflow, Bug Triage Workflow, and Release Timeline the mission's own "Design" section requests, plus the concrete first-100-user rollout sequencing.

---

## Release Timeline

| Week | Milestone | Gate to proceed |
|---|---|---|
| Week 0 | Verify the frontend-error-boundary-to-backend-`ErrorReport` wiring (the one open, unverified question from `CLOSED_BETA_PLAN.md`); create the pilot's own `FeatureFlag`; confirm the new auth system's first-run onboarding path renders the existing welcome modal correctly | Both confirmed working via a live test |
| Week 1 | Open registration to a 10-15 user sub-cohort via the `FeatureFlag` | Zero Critical errors in the first 48 hours (`PILOT_SUCCESS_METRICS.md`'s error-rate KPI) |
| Week 2 | Expand to the full 25-100 user cohort | Week 1's Activation Rate ≥ 50% (a deliberately lower interim bar than the full-pilot 60% target, since week 1 is explicitly the smaller validation cohort) |
| Week 3-4 | Full cohort active; begin direct user conversations (see below) | Ongoing — no hard gate, this is the main observation window |
| End of pilot | Compile results against `PILOT_SUCCESS_METRICS.md`'s targets; decide GA-track continuation | All Primary KPIs reviewed with real, dated evidence — no metric assumed without a fresh check, per this engagement's own established discipline |

## User Feedback Workflow

1. **In-product**: the existing Feedback widget and per-Recommendation reaction picker remain the primary always-on channels — both already real and persisted.
2. **Direct outreach**: reusing this engagement's own much-earlier `USER_INTERVIEW_GUIDE.md` (Day 1/7/14 structured conversation scripts) — this document already exists and should be reused verbatim for the pilot rather than rewritten, since it was purpose-built for exactly this kind of small-cohort qualitative check-in.
3. **Triage cadence**: real feedback rows (`feedbackRepository`) should be reviewed at least every 48 hours during weeks 1-2 (the highest-risk window for the brand-new auth path), weekly thereafter.
4. **Closing the loop**: every piece of feedback that leads to a real fix should be acknowledged back to the specific user who reported it, wherever the feedback mechanism allows attribution — a real, low-cost trust-building action for a small, closed cohort.

## Bug Triage Workflow

Directly reuses this engagement's own already-established `BUG_SEVERITY_STANDARD.md` and `IMPACTONE_DEFINITION_OF_DONE.md` (both pre-existing documents from earlier in this engagement) rather than defining a new severity taxonomy. Pilot-specific additions:

1. **Any bug affecting the new registration/auth/billing flow is triaged as at least High severity by default during weeks 1-2** — this is the least-battle-tested part of the whole platform (shipped the same week the pilot plan is being written), and a broken first-run experience for a real new user is the single most damaging failure mode for a closed beta's word-of-mouth.
2. **A recurrence of the `AI-TRUST-001` templated-explanation defect (or a sibling instance of the same root-cause pattern — a shared, non-differentiated fallback value in a context-assembly function) is automatically triaged as Critical**, regardless of its apparent cosmetic severity, given this specific defect class's documented multi-session recurrence history in this engagement.
3. **Use the real `FeatureFlag` mechanism as the first response to any registration-path bug**, before a code fix ships — disable new signups, keep existing pilot users' access intact, then fix and re-enable.

## First-100-users rollout sequencing

1. **Recruit from a mix of sources** — reusing this engagement's own much-earlier `FIRST_25_USERS_PROFILE.md` persona work (if still applicable) rather than starting persona research from scratch.
2. **Stagger invitations, don't mass-invite** — 10-15 in week 1, the remainder in week 2+ (per the Release Timeline above) — directly extending this whole engagement's own repeatedly-successful "validate one real path first" discipline to user acquisition itself, not just code changes.
3. **Every pilot user registers through the new, real `User`/auth system** (per `CLOSED_BETA_PLAN.md`'s explicit recommendation) — do not onboard new pilot participants through the legacy `BetaUser` invite-code system, which should be reserved as a fallback only (see `CLOSED_BETA_PLAN.md`'s rollback plan).
4. **Set explicit expectations in the first-run experience** about the product's current real limitations** — no real broker connection, simulated portfolio only, advisory-only, no real support-ticket channel yet — directly reusing the existing, already-strong "Welcome to the Beta" modal copy, which already covers most of this.
