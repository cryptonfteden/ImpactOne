# Success Metrics — Phase G1

KPIs and thresholds for a **5-user** closed beta. Every threshold below is deliberately stated as an absolute user count, not a percentage — with n=5, "60% retention" and "3 of 5 users" are the same fact, but the count is the honest way to say it. Sourced from real, already-shipped instrumentation (Phase F1's analytics inventory) plus Phase F2's per-user attribution, wherever possible; anything not yet measurable is flagged as such.

## Core KPIs

| Metric | Definition | Data source | Success threshold (n=5) | Watch threshold |
|---|---|---|---|---|
| **Daily Active Users (DAU)** | Distinct `betaUserId`s with ≥1 session on a given day | `AnalyticsEvent`, scoped by `betaUserId` (Phase F2) | ≥3 of 5 active on most days by Day 7 | <2 active for 2+ consecutive days |
| **Onboarding completion** | `onboarding_completed` fired | Already-instrumented `onboarding_completed` event | 5 of 5 by end of Day 0 | Any user not completed by Day 1 |
| **Recommendation open rate** | Of users with ≥1 recommendation available, % who fired `recommendation_viewed` | Already-instrumented `recommendation_viewed` | 4 of 5 users view at least one recommendation by Day 3 | 2 or fewer by Day 7 |
| **AI Analysis usage** | Distinct users who load the AI Analysis screen for ≥1 ticker | No dedicated event exists yet — would need a new `ai_analysis_viewed` event (additive, matches Phase F1's analytics-map pattern); until implemented, track manually via WhatsApp check-ins | 3 of 5 users try it by Day 7 | 1 or fewer by Day 14 |
| **Portfolio return visits** | Distinct days a user reopens Portfolio after their first visit | No dedicated event exists yet — same gap as above; screen-view events aren't currently instrumented beyond the specific ones listed in `ANALYTICS_EVENT_MAP.md` | Each user reopens Portfolio on ≥2 separate days by Day 7 | A user who never returns to Portfolio after Day 1 |
| **Feedback rate** | Distinct users who submit ≥1 piece of feedback (either channel — per-recommendation `feedback_submitted` or the general WhatsApp line) | `feedback_submitted` event + manual WhatsApp log | 3 of 5 users give at least one piece of feedback by Day 14 | 1 or fewer by Day 14 (silence is not success — see Failure Criteria) |
| **Day-7 retention** | Of the 5 onboarded users, how many have a session on Day 7 itself (not "any day in the first week") | `AnalyticsEvent`, scoped, filtered to Day 7's calendar date | ≥3 of 5 | ≤1 of 5 |
| **Day-14 retention** | Same definition, Day 14 | Same | ≥2 of 5 (a genuine morning habit is a high bar even for a good product at this stage) | 0 of 5 |
| **Trust-breaking bug reports** | Count of reports matching Phase E1's Critical/High severity bar (looks broken, contradicts itself, silently fails) | Manual WhatsApp log + error-reporting table (F1 §5, if implemented) | 0 unresolved past 48h | Any unresolved past 48h |

## What "Success" Means at Day 14 (Composite)

The beta is a genuine success if **all** of the following hold, not just a majority of individual metrics:
1. ≥3 of 5 users are still opening the app on their own by Day 14 (no prompting).
2. ≥3 of 5 users have given real feedback (either channel) — silence with continued usage is ambiguous, not success.
3. Zero unresolved trust-breaking bugs at the Day 14 checkpoint.
4. No Failure Criterion (`BETA_EXECUTION_PLAN.md` / below) was triggered at any point.

A beta that hits the individual KPI thresholds but fails condition 2 (active but silent users) should be treated as **inconclusive, not successful** — 5 people is too small a sample to trust behavioral metrics alone without knowing *why*.

## Failure Criteria — When the Beta Stops

Stated as explicit stop conditions, not vague discomfort. Any **one** of these triggers an immediate pause (not necessarily a permanent stop) and a founder decision before continuing:

### Trust issues
- Any user reports a recommendation, price, or portfolio value that is factually wrong (not just "unconvincing" — genuinely incorrect) — matches this phase's "critical bug" definition and the whole engagement's "never fabricate" discipline.
- Any user explicitly says (WhatsApp or feedback) they no longer believe the product's numbers are real.

### Recommendation quality
- 3 or more of 5 users report the recommendations feel irrelevant or repetitive within the first 7 days — note: per this phase's explicit assumption (recommendations stay globally generated, personalized only at presentation), this is a *known structural risk*, not a surprise; it's a stop condition specifically because it would mean the presentation-layer personalization isn't sufficient, which is a real, actionable finding.
- The engine produces zero new recommendations for 3+ consecutive days with no diagnosed operational cause (distinguish from a known, communicated blocker like D1.7's Finnhub dependency).

### Operational failures
- The app is unreachable or broken for any user for more than 4 continuous hours during market hours.
- A deploy introduces a regression that fails the existing test suite in production (should never happen if `RELEASE_CHECKLIST.md` is followed, but named as a hard stop regardless).

### Data integrity
- Any evidence of one beta user seeing another user's portfolio, profile, or recommendation history — an isolation failure (Phase F2) is treated as an automatic, immediate stop, not a graded severity, because it's a privacy breach among real people who trusted the founder personally.
- Any duplicate grading, corrupted outcome, or lifecycle-state violation detected by the existing dataset validator (`datasetValidatorService`, Phase D1) against beta-generated data.

### Silence (a softer, cumulative criterion)
- Not a hard stop on its own, but 2 or more users going fully silent (no session, no response to outreach) by Day 7 should trigger the founder treating the beta as already-failed for those users, and reallocating attention rather than waiting for Day 14 to notice.

## Instrumentation Gaps, Named Honestly

Two of the seven core KPIs above (AI Analysis usage, Portfolio return visits) have no dedicated analytics event today — confirmed against the real inventory in `ANALYTICS_EVENT_MAP.md`. This plan does not assume they exist; it names the gap and proposes the manual fallback (WhatsApp check-ins) for a beta this small, where manual tracking of 5 people is genuinely tractable. Adding the two missing events is a small, additive follow-up (matching Phase F1's proposed-additions pattern) worth doing before a wider beta, not before this one.
