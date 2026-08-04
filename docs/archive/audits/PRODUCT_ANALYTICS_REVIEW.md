# Product Analytics Review — Phase X9
## Can a Product Manager Understand User Behavior Today?

Scope: analytics and telemetry only (Operations Areas 1–2 of `OPERATIONS_REVIEW.md`), examined specifically through the lens of "if I were a PM with no engineering access, what could I learn about how people use ImpactOne right now?"

---

## 1. The Pipeline, As It Actually Works

```
frontend/src/utils/analytics.js  trackEvent(name, props)
        │  fetch POST, keepalive:true, fire-and-forget, client-side allowlist check
        ▼
backend/routes/analyticsRoutes.js  POST /v2/event
        │
        ▼
backend/services/analyticsService.js  server-side allowlist re-check (independent of client)
        │  sanitizeProperties() strips any non-allowlisted key; sanitizeSessionId() validates UUID shape
        ▼
AnalyticsEvent table (Postgres)  { eventName, properties(json), sessionId, betaUserId, createdAt }
```

This is a genuinely sound design for a small beta: server-independent validation means a compromised or buggy client can't smuggle new event names or unexpected properties into storage; the anonymous `sessionId` (random UUID, not a fingerprint) plus the newer optional `betaUserId` column give a real, privacy-respecting way to attribute events to one of the two real invited users without building a full account system.

## 2. The 13 Events That Exist

| Event | Answers |
|---|---|
| `first_open` | Did a new browser ever open the app? |
| `onboarding_completed` / `onboarding_step_completed` / `onboarding_step_skipped` | Did they finish onboarding, and where did they stall? |
| `returning_user` | Did they come back? |
| `recommendation_viewed` / `recommendation_expanded` / `recommendation_understood` | Did they engage with a recommendation, and how deeply? |
| `feedback_submitted` | Did they react to a recommendation (including "don't understand")? |
| `morning_brief_read` / `first_useful_information` | Did they get real value on Home? |
| `first_recommendation_rendered` | Time-to-first-recommendation milestone |
| `search_conversational_used` | Did they try natural-language search? |

This answers a real, narrow question well: **"did a new user complete onboarding and reach a first recommendation quickly?"** That specific funnel is genuinely measurable today.

## 3. What a PM Cannot Answer Today

Every one of these is a "no instrumentation exists" answer, not a "the data shows no" answer:

- Did anyone open Portfolio? Add a position? Place a simulated order?
- Did anyone use Watchlist Folders / Workspaces?
- Did anyone open Decision Center — the feature multiple engineering phases (X3–X8) were built specifically to prove out?
- Did anyone open the Side Panel, interact with the Advanced Chart (zoom/pan/hover), or view Market Positioning / Market Dashboard?
- Did anyone open Settings, or check the Health/Quality dashboards (founder's own tools)?
- Did anyone log out or re-invite themselves with a new code?
- Which screens does a typical session actually visit, in what order, before leaving?
- What is the actual retention curve (Day-1/3/7) for the 2 real invited users? (No cohort/user-level retention query exists — see §4.)

In short: **everything built since roughly Sprint 40 (Decision Center, Workspaces, Market Dashboard, Side Panel, Advanced Chart, Market Positioning, Impact Graph UI) has zero usage signal.** These are exactly the flagship features the last dozen engineering phases centered on, and a PM today has no way to know if either beta user has ever opened them.

## 4. No Reporting Surface Exists — Even for the Data That IS Collected

This is the more fundamental gap. Even for the 13 events that are captured:

- `analyticsEventRepository.countByEventName()` is a real function — but it is called from nowhere. No route, no controller, no screen renders it. It is a raw building block, not a report.
- `GET /v2/analytics/ttv-metrics` is a real, working endpoint — but no frontend screen calls it. There is no UI anywhere that shows median time-to-first-recommendation, even though the backend can compute it today.
- There is no funnel view, no per-user timeline, no cohort comparison, no day-over-day trend chart, anywhere in the product — for founders, engineers, or PMs alike.

**The practical consequence:** answering *any* analytics question today — even "did our one real onboarding fix actually reduce drop-off?" — requires someone to write and run a one-off database query or `curl` the internal API directly. This is exactly the technique used throughout this engagement's own prior sessions (see repo memory: Sprint D1's throwaway Postgres scripts) to get real numbers — a workable technique for an engineer doing a one-time audit, not a repeatable operational practice a PM can use unaided.

## 5. Direct Answers to the Mission's Questions (Analytics Slice)

**"Can every important user action now be measured?"** No — the allowlist covers only onboarding, Home, and Recommendations; every screen shipped since is invisible.

**"Can product managers understand user behavior?"** No — even for the narrow slice that is captured, there is no dashboard, funnel, or report; reading the data requires direct database/API access, which is an engineering operation, not a product-management one.

**"Can feature adoption be measured?"** No, for any feature outside the original three screens. This is the single largest gap found in this review — a series of major, deliberately-built features (Decision Center, Workspaces, Market Dashboard, Side Panel, Advanced Chart) currently produce zero adoption signal.

## 6. What Is Genuinely Good and Should Be Preserved

- The server-side re-validation pattern (never trust the client's own allowlist) is a real security-conscious design choice, not just a convenience.
- No PII anywhere in the pipeline — deliberately, by allowlist design (age/income/risk-tolerance from the investor profile are explicitly never sent).
- The anonymous-but-attributable `sessionId` → optional `betaUserId` design threads a genuine needle: per-user attribution for a 2-person beta without a real login system.
- `ttvMetricsService`'s median/average time-to-milestone logic is real, tested, and correctly excludes sessions that never reached a milestone rather than fabricating a zero.

## 7. Minimum Bar to Change the Answer to "Yes" (Named, Not Designed Here)

1. Extend the event allowlist to cover at least one action per major screen (Decision Center opened, Workspace created, Side Panel opened, Chart interacted with, Market Dashboard viewed).
2. Build one real reporting surface — even a single internal table page listing `countByEventName()` and `ttv-metrics` output — so this data is reachable without a database query.
3. Add the cohort/retention query described conceptually in `BETA_SUCCESS_METRICS.md` (Day-1/3/7 by `betaUserId`), since the `betaUserId` column needed for it already exists on `AnalyticsEvent`.

None of the above is implemented today. This document does not implement them, per the mission's "no code" instruction — it names the gap precisely so the decision in `X9_VERDICT.md` is traceable to specific, fixable facts.
