# Pilot Success Metrics — ImpactOne Closed Beta

**Phase:** PILOT-PREPARATION-001. Companion to [CLOSED_BETA_PLAN.md](CLOSED_BETA_PLAN.md). Documentation only. Built directly on the real, already-computed metrics in `betaMetricsService.js` (confirmed live this session) rather than inventing a parallel measurement system.

---

## Primary KPIs (already computable today, real data)

| KPI | Real source | Target for a successful pilot |
|---|---|---|
| **Activation Rate** (opened → completed onboarding) | `betaMetricsService.computeActivationRate()` — real, session-grouped, `first_open`/`app_opened` → `onboarding_completed` | ≥ 60% — a lower bar than a mature product, appropriate for a first closed cohort still validating the brand-new registration flow |
| **Retention** (returned on a second distinct day) | `betaMetricsService.computeRetention()` — real, multi-day session grouping | ≥ 30% at the end of week 2 — directly tests whether the Daily Feed/Morning Brief retention loop (`COMMERCIAL_READINESS.md`'s own prior finding on this loop's real mechanic) works now that the templated-explanation trust defect is fixed (`AI-TRUST-001`, this same week) |
| **Daily Usage** | `betaMetricsService.computeDailyUsage()` | Directionally increasing or stable week-over-week — a declining trend by week 2 is an early-warning signal, not itself a failure condition given the small cohort size |
| **Error rate** | Real `ErrorReport` row count per session, per day | Zero **Critical**-severity errors sustained for more than 24h without a fix — reuses `OPERATIONS_RUNBOOK.md`'s own severity framing |
| **Feedback volume & sentiment** | Real `feedbackRepository.count()`/`countByType()` | At least 1 piece of real feedback per 3 active pilot users over the full pilot — a low volume itself is a signal to proactively solicit (see `FIRST_100_USERS.md`'s own outreach cadence), not to ignore |
| **Registration → first real Recommendation viewed** | New: composable from existing `AnalyticsEvent` rows (`user_registered`-equivalent event + `recommendation_viewed`), no new pipeline needed | ≥ 80% within the first session — a proxy for whether the new auth/onboarding path successfully gets a user to the platform's actual value proposition, not just through a signup form |

## Secondary/qualitative KPIs

- **Willingness-to-pay signal**: directly reusing this engagement's own much-earlier `BETA_SUCCESS_REVIEW.md` finding that this has never been directly asked of a real user — the closed beta is the first real opportunity to ask it, via a direct, planned conversation (see `FIRST_100_USERS.md`), not inferred from usage data alone.
- **Trust-defect recurrence**: given `AI-TRUST-001`'s own fix this same week, a specific qualitative check — did any pilot user notice or comment on a templated-feeling explanation? A single such report during the pilot should be treated as a real, high-priority signal, not statistical noise, given this defect's multi-session history in this engagement.
- **Support-channel gap impact**: given `CLOSED_BETA_PLAN.md`'s own finding that no real support channel exists beyond the Feedback widget, track how many pilot users attempt to reach out through an *unintended* channel (e.g., replying to a system email, if one exists) — a real signal that the gap is actively felt, not just theoretical.

## What this document deliberately does not do

- **Does not invent a second metrics pipeline** — every KPI above is either already computed by `betaMetricsService.js` or trivially composable from the same real, existing `AnalyticsEvent`/`ErrorReport`/`Feedback` tables.
- **Does not set an arbitrarily high bar for a first, small, closed cohort** — targets are deliberately modest (60%/30%) given this is validating a brand-new registration/auth path, not measuring a mature product's steady-state performance.
- **Does not treat a single trust-defect report as statistically dismissible** — given this specific defect's documented multi-session recurrence in this engagement's own history, even one pilot-user report warrants investigation, not averaging away.
