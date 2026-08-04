# Operations Review — Phase X9
## Head of Product Operations — Beta Operations Readiness

**Mandate:** ignore implementation/code quality entirely. The only question this document answers is whether ImpactOne, as it exists today, gives its operators the instruments to *learn from real users* — not whether the AI, the recommendations, or the UI are good.

Method: direct code/config inspection of every system named in the mission (no assumptions carried from prior AI-quality or UX audits). Every claim below is cited to a real file.

---

## 1. Analytics

**What exists, real and wired:** `frontend/src/utils/analytics.js` → `trackEvent()` → `POST /v2/analytics/event` → `analyticsService.js` (server-side allowlist re-validation) → `AnalyticsEvent` table. 13 allowlisted events: `first_open`, `onboarding_completed`, `onboarding_step_completed`, `onboarding_step_skipped`, `returning_user`, `recommendation_viewed`, `recommendation_expanded`, `recommendation_understood`, `feedback_submitted`, `morning_brief_read`, `first_useful_information`, `first_recommendation_rendered`, `search_conversational_used`.

**What's missing:** the allowlist only covers onboarding + Home + Recommendations. Zero events exist for Portfolio (add/remove position, place order), Watchlist/Workspaces, Alerts, Decision Center, AI Analysis, Side Panel, chart interaction, Market Dashboard, Settings changes, or logout — i.e. every screen shipped since roughly Sprint 40 has no usage signal at all. See §7 of `PRODUCT_ANALYTICS_REVIEW.md` for the full gap list.

**Verdict: Real foundation, narrow coverage.**

## 2. Telemetry

Telemetry here means "operational signal about the system, not the user." Two real pieces exist:
- `ttvMetricsService.js` / `GET /v2/analytics/ttv-metrics` — computes real median/average time-to-milestone per anonymous session, from the same event stream as §1.
- `systemHealthService.js` / `GET /v2/system-health` — nine live dependency checks (DB, identity store, Finnhub, News, AI, chart, notifications, decision center, impact graph), each returning a real status + latency, never a raw stack trace.

**Gap:** neither is exposed anywhere a non-engineer would see it. TTV metrics have no UI at all (API only). System health has a UI (`HealthDashboardScreen.jsx`) but it's gated behind `VITE_DEV_CONSOLE=true` with no nav entry — an internal, undiscoverable diagnostics screen, not an operations tool a founder would check daily without knowing the flag exists.

**Verdict: Real instruments, no visible readout.**

## 3. Crash Reporting

**Confirmed: does not exist.** `frontend/src/utils/errorHandling.js`'s `logError()` calls `console.error` and nothing else. `AppErrorBoundary.jsx` and `ScreenErrorBoundary.jsx` both call `logError` on every caught render failure, but the trail ends at the browser console. A repo-wide search for `/api/v2/errors` or any error-reporting route returns nothing (confirmed independently in `CRITICAL_BUGS.md`). `BETA_OPERATIONS_PLAN.md` §5 designs this exact endpoint — it has been designed, not built.

The one adjacent real mechanism is `backend/scripts/releaseValidation.js` (`RELEASE_CHECKLIST.md`), a pre-merge script that runs a real production build and a handful of live route checks — this catches *build-breaking* regressions before merge (and, per its own changelog, once caught a real broken import that had shipped silently). It is not crash reporting: it tells engineering nothing about a crash a live beta user actually experiences after the code ships.

**Verdict: A beta user's browser could crash on every single visit and no one at ImpactOne would ever know, unless that user personally reports it.**

## 4. Feature Flags

Three real, static, build-time environment variables: `VITE_PORTFOLIO_ENGINE` (legacy/api toggle), `VITE_DEV_CONSOLE` (gates the internal Health/Quality/Intelligence Console screens), `VITE_API_BASE_URL`. No runtime flag service, no per-user targeting, no percentage rollout, no kill-switch for an individual feature once shipped.

For a 2-person invite-only beta this is a defensible, intentionally minimal design (`BETA_OPERATIONS_PLAN.md` §4 explicitly argues against adding more). It is not, however, a system that lets an operator turn off one misbehaving feature (e.g. Decision Center) for users without a redeploy — there is no such lever anywhere in the codebase.

**Verdict: Sufficient for today's tiny, fixed cohort; not a real feature-flag system.**

## 5. Operations Dashboard

Two internal, `VITE_DEV_CONSOLE`-gated screens exist and are real:
- **Health Dashboard** (`HealthDashboardScreen.jsx`) — 9-module live status grid, described in §2.
- **Quality Dashboard** (embedded in `IntelligenceConsoleScreen.jsx`) — hit rate, confidence calibration, average holding period, average uncertainty, outcome completion, all real DB aggregations, honestly `null` when under-sampled.

**What does not exist:** anything resembling a *beta operations* dashboard — a single place to see analytics event volume, TTV metrics, feedback volume, error volume, and the five `BETA_SUCCESS_METRICS.md` categories (Product/Trust/Learning/Retention/Stability) together, refreshed daily. Today, operating the beta requires an engineer to query the database or hit internal API routes directly; there is no product-operations-facing surface at all.

**Verdict: Two good engineering diagnostics tools exist; zero operations tools exist.**

## 6. Feedback System

**Real and working:** per-recommendation reactions (`RecommendationCard.jsx` → `POST /v2/recommendations/:id/feedback`), 6 options including `DONT_UNDERSTAND`, stored per recommendation.

**Does not exist:** any general, product-wide feedback channel. `DashboardFooter.jsx`'s Help/Feedback/Terms/Product-updates links are inert `<span>` elements (`title="Not available yet"`), confirmed in code. `BETA_OPERATIONS_PLAN.md` §2 and `RED_FLAGS.md` §5 both independently name this same gap. The current operational plan for general feedback is an external email alias or shared form link handed to users at onboarding — a real, workable stopgap for 2 users, but not an in-product mechanism, and not yet confirmed to exist as an actual live inbox (design only as of this review).

**Verdict: Narrow, working feedback loop on one specific interaction; no general channel exists in-product.**

## 7. Beta Metrics

`BETA_SUCCESS_METRICS.md` is a well-structured five-category framework (Product / Trust / Learning / Retention / Stability) with a strong governing rule (no category may excuse a weakness in another). But cross-checking each listed metric against real instrumentation:

| Category | Metrics that ARE backed by real data today | Metrics that are NOT (no instrumentation exists) |
|---|---|---|
| Product | Time-to-first-insight (via TTV), screens-reached (partially, via event coverage gaps) | Daily opens per participant, taps-to-action |
| Trust | — | Trust Score components, source-verifiability rate, false-claim count (all manual/qualitative today) |
| Learning | Graded outcome count, World Memory lesson count (both real DB tables) | Recalibration proposal count (mechanism not yet exercised) |
| Retention | — | Day-1/3/7 retention, say-vs-do gap, referral signal (no cohort identifier exists to compute any of these — see `ANALYTICS_EVENT_MAP.md` §2 "beta_cohort_identified", proposed, not built) |
| Stability | — | Crash count, crash-free rate, recovery time, layout-stability incidents, offline-correctness rate (none instrumented; crash reporting doesn't exist per §3) |

**Verdict: A genuinely good measurement design on paper. Fewer than a third of its own named metrics are backed by any real, running instrumentation today.**

## 8. Performance Monitoring

One real, one-time measurement exists: `SPRINT_36_REPORT.md`'s before/after Time-To-Value audit (Playwright-scripted, explicitly caveated as directional/shared-machine, not lab-precise). `systemHealthService.js` reports live per-check latency on each request to `/v2/system-health`, but nothing persists this over time — there is no latency trend, no alerting threshold, no historical chart. No APM, no `prom-client`/Datadog/New Relic/OpenTelemetry dependency exists anywhere in `package.json` (confirmed in repo memory from an earlier SRE audit, independently re-confirmed here by the same absence in `systemHealthService.js`'s design).

**Verdict: A single historical snapshot exists. No ongoing performance monitoring exists.**

---

## Summary Table

| Area | Real & Wired | Visible to a Non-Engineer | Covers the Whole Product |
|---|---|---|---|
| Analytics | Yes | No | No (recent screens uninstrumented) |
| Telemetry (TTV) | Yes | No | Partial |
| Crash Reporting | **No** | No | No |
| Feature Flags | Yes (minimal) | N/A | N/A (by design, 2 flags) |
| Operations Dashboard | Partial (engineer-only) | **No** | No |
| Feedback System | Partial (one interaction only) | Yes (for that one interaction) | No |
| Beta Metrics | Partial (design >> instrumentation) | No | No |
| Performance Monitoring | One-time only | No | No |

See `PRODUCT_ANALYTICS_REVIEW.md` for a deeper look at analytics specifically, `BETA_READINESS_SCORE.md` for numeric scoring, and `X9_VERDICT.md` for the final call.
