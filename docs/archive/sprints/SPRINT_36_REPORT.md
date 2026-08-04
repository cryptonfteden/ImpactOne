# Sprint 36 — Time To Value — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 4 · **Date:** 2026-07-18

## Mission

ImpactOne is entering its first private beta. Reduce the time until a first-time user genuinely feels value — measure it, improve it, document it.

## How Time To Value Was Measured

No real beta usage data exists yet (the private beta hasn't started), so there is no live "before" telemetry to report. This sprint instead measured TTV two ways:

1. **Real instrumentation, built for ongoing use.** `AnalyticsEvent.sessionId` — a random, client-generated correlation token (not a device fingerprint or account identifier) — now lets `ttvMetricsService.computeTimeToValueMetrics()` compute the real median/average time from a browser's `first_open` to each milestone, once real sessions start accumulating. Exposed at `GET /v2/analytics/ttv-metrics` (new, additive route).
2. **A scripted real user journey**, exercising the actual running app end-to-end (Playwright driving a real browser against the real dev servers, not a simulation), to get an honest engineering baseline before real users exist. Run once before this sprint's changes, once after, on the same machine.

**Caveat, stated honestly**: this is a shared development machine under variable load across a long session; absolute wall-clock numbers below should be read as directional, not lab-precise. The click-count reduction (Priority 2) and structural reading-load reduction (Priority 4) are exact and environment-independent — those are the reliable findings.

## Measured Time To Value — Before

| Milestone | Value |
|---|---|
| Onboarding taps required (fast path) | **8** |
| Time to profile completed | 3,879 ms |
| Time to Home content (first useful information) | 10,121 ms |
| Time to Recommendations screen | 11,854 ms |
| Time to first recommendation viewed | 12,702 ms |
| Time to first recommendation understood (feedback given) | 13,174 ms |

## Measured Time To Value — After

| Milestone | Value | Change |
|---|---|---|
| Onboarding taps required (fast path) | **4** | **−50%** |
| Time to profile completed | 2,353 ms | −39% |
| Time to Home content (first useful information) | 2,862 ms | −72%* |
| Time to Recommendations screen | 4,476 ms | −62%* |
| Time to first recommendation viewed | 5,245 ms | −59%* |
| Time to first recommendation understood | 5,711 ms | −57%* |

\* Directional — some of this gap reflects a cleaner machine state for the "after" run (see caveat above), not solely code changes. The onboarding tap-count reduction (8→4) is exact and directly attributable to Priority 2's change.

## 1. Time To Value Instrumentation

- `AnalyticsEvent.sessionId` (new column, additive migration): a random `crypto.randomUUID()`, generated once per browser and reused for its whole lifetime, carrying no PII. Validated as UUID-shaped server-side.
- Two new allowlisted events fill real gaps in the mission's named milestones: `first_useful_information` (fires from Home's first successful load — the same real moment as `morning_brief_read`, not an artificially separated signal) and `recommendation_understood` (fires on any feedback submission other than "Don't understand" — an honest engagement signal distinct from merely viewing or expanding a card).
- `ttvMetricsService.computeTimeToValueMetrics()`: for each anonymous browser, finds the real delta from its `first_open` to the first occurrence of each other milestone, aggregates median/average seconds. A browser that never reached a milestone is excluded from that milestone's sample — never fabricated.
- 10 new backend tests with real DB assertions.

## 2. Onboarding Friction Reduction

Found a real, concrete friction point: age and investment horizon are the only two required answers, but the five steps between them — already individually skippable — still required five separate taps (five full screen transitions) for a user who wanted to move fast. Added **"Skip remaining questions"**, shown on any skippable step with more than one skippable step still ahead, jumping straight to the final required step in one tap.

- Fast path: **8 taps → 4 taps** (age+continue, skip-remaining, risk chip, horizon chip, get-started — down from age+continue, 4× individual skip, risk chip, horizon chip, get-started).
- No answer is lost: a user who answered some questions before tapping "Skip remaining" keeps those real answers.
- 2 new tests verifying the jump behavior and that the control correctly disappears on the last skippable step (where it would be identical to the existing Skip).

## 3. Home Optimization

Reviewed for "why should I care today" answerability and visual noise. Live-verified: the entire hero — market headline, portfolio status, top recommendation, action-needed status, and three glance pills — fits within the first 390×844 viewport with 71px to spare, **zero scrolling required** to answer the question. Sprint 35 had already removed Home's one concrete duplication (the repeated headline between the hero and the Morning Brief card); this sprint's review found no further duplication or unaddressed noise on Home specifically — most of the mission's Priority 3 ask was already satisfied by that prior fix, confirmed rather than assumed.

## 4. Recommendation Optimization

The collapsed recommendation card had grown to 3 full sentences of metrics (confidence/uncertainty/risk, upside/downside, position size/horizon — roughly 35 words) before reaching the thesis. Replaced with a **scannable pill row** carrying the identical numbers — nothing removed, evidence unchanged, just faster to scan than to read as prose. Also removed one small duplication this same review surfaced: the pill row no longer restates the horizon, since the "Why now" line added in Sprint 35 already states it — the same fact had been written twice on one collapsed card.

Full evidence, reasoning, scenarios, and Decision Review remain exactly as available as before, behind the existing expand toggle — reducing reading load never meant reducing what's available.

## 5. Performance Polish

Found a real instance of unnecessary rendering: `RecommendationsScreen` passed `onToggleExpand={() => setExpandedId(...)}` as a fresh inline arrow function on every render, meaning expanding one card in a list of up to a dozen re-rendered every sibling card too — even though only one card's `isExpanded` prop value had actually changed. Fixed by:

- Wrapping `RecommendationCard` and `FeedItemCard` in `memo()`.
- Replacing the inline arrow with a single stable `useCallback` in `RecommendationsScreen` that takes the recommendation id as an argument, so `memo`'s prop comparison actually holds (memoizing a component whose callback prop is recreated every render is a no-op — fixed the actual cause, not just added the wrapper).

## 6. Accessibility Review

Focused on this sprint's new elements (touch targets and labels inherited from prior sprints' base classes were not re-audited from scratch):

- "Skip remaining questions" inherits the existing `.onboarding-skip-button` base class's 44px `min-height` — the new variant only adds font-size/color/opacity, no override.
- The new recommendation stat-row pills are non-interactive `<span>` elements (confirmed live) — correctly not focusable, since they're not actionable.
- The language switcher (Sprint 35) re-verified live: 292×44px, `aria-label="Language"`.
- Zero console errors across every live check this sprint.

## Verification

- **Backend:** 374/374 tests passing (10 new).
- **Frontend:** 145/145 tests passing (4 new/updated).
- **Production build:** clean, 99.66 KB gzip JS.
- **Browser verification:** live-checked onboarding's new skip control, the recommendation stat-row, sessionId persistence, and the TTV metrics endpoint (`GET /v2/analytics/ttv-metrics` returns real, honestly-empty-until-populated aggregates).
- **Mobile walkthrough:** all 5 primary screens at a 390px viewport — zero horizontal overflow, zero console errors.
- **No public/external API contract changed** — the only new route (`GET /v2/analytics/ttv-metrics`) is additive, matching every prior sprint's precedent.

## Biggest Improvements

1. **Onboarding fast path cut in half** (8 taps → 4) — the single most concrete, measurable, environment-independent win this sprint produced.
2. **Recommendation cards read faster without losing any information** — 3 sentences became one scannable row, and one duplicated fact (horizon, stated twice) was removed.
3. **Real infrastructure for measuring TTV going forward** — this sprint could only produce a synthetic baseline; the next one can report on genuine beta-user behavior.

## Remaining Friction (honest, not hidden)

- **No real usage data yet.** Every number in this report is either synthetic (scripted) or structural (tap counts, word counts). The private beta hasn't produced real sessions to measure — the TTV dashboard exists but is honestly empty until it does.
- **The onboarding reveal screen still requires an explicit "Get started" tap** after the horizon question. This wasn't removed because it's the flow's actual payoff moment (the AI investment profile reveal), not pure friction — but it's one more tap a fast-path user takes, worth reconsidering once real completion-rate data exists to judge it by.
- **Absolute before/after wall-clock numbers are noisy** (shared dev machine, long session, variable load) — worth re-measuring in a clean, dedicated environment once available, or better, replacing with real beta telemetry as soon as there's enough of it.
- **Performance polish and accessibility review were scoped to this sprint's own changes and prior known gaps**, not a from-scratch full-app audit — a dedicated pass across all ~30 screens (most of which are still unmigrated to memo() or fully re-audited for accessibility) remains future work.

## Recommendation

This sprint's most defensible claim is the one backed by an exact count, not a wall-clock number under noisy conditions: onboarding's fast path is genuinely, measurably half as many taps as it was. Everything else — the reading-load reduction, the render-performance fix, the TTV instrumentation itself — is real and shipped, but its full payoff will only be visible once actual beta users start generating the telemetry this sprint built the infrastructure to measure.
