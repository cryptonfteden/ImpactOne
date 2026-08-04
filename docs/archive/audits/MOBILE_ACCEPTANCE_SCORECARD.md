# Mobile Acceptance Scorecard
## Office of the Mobile Beta Director — ImpactOne

**Rule:** every criterion below is pass/fail or numerically measurable. No criterion is satisfied by an opinion, a impression, or "looks good." If a criterion cannot currently be measured, it is scored as **FAIL — unmeasured**, never assumed passing.

---

## 1. Installability
- **Criterion:** App installs and reaches its first screen in ≤10 seconds on a standard mid-tier device, over WiFi.
- **Pass condition:** 0 install failures across 10 consecutive install attempts.

## 2. First Load
- **Criterion:** Time from cold app launch to first meaningful content rendered.
- **Pass condition:** ≤2 seconds on WiFi, ≤4 seconds on standard 4G, measured across 10 consecutive cold starts, 0 failures to meet the threshold.

## 3. Layout Stability
- **Criterion:** No unintended layout shift after initial content paint.
- **Pass condition:** 0 instances of content overlapping, being pushed off-screen, or becoming unreachable, across 10 consecutive cold starts and 10 consecutive warm reloads.

## 4. Onboarding Time
- **Criterion:** Time from first launch to first real, sourced insight shown.
- **Pass condition:** Median ≤90 seconds across a 10-person test cohort; 100% complete onboarding within 3 minutes; 0 users require external help to complete it.

## 5. One-Hand Navigation
- **Criterion:** Every primary action is reachable within the bottom 60% of the screen (thumb-reach zone) on devices from 6.1" to 6.7".
- **Pass condition:** 100% of primary actions tested meet this criterion; 0 primary actions require a two-handed stretch or a reach above the midpoint of the screen.

## 6. Readability
- **Criterion:** Text contrast and size meet accessibility minimums.
- **Pass condition:** 100% of body text meets WCAG AA contrast (4.5:1 minimum) and supports OS-level dynamic type scaling without truncation or overlap.

## 7. Trust
- **Criterion:** Every confidence score is paired with an independently valued uncertainty score; no personalized claim is shown against data that doesn't exist for the account.
- **Pass condition:** 100% of confidence displays include a separate uncertainty value; 0 instances of a "portfolio" or "watchlist" claim referencing holdings not present in a test account with zero holdings.

## 8. Freshness
- **Criterion:** Every time-sensitive item displays a visible timestamp or "as of" label.
- **Pass condition:** 100% of time-sensitive content is labeled; 0 instances of data older than its defined staleness threshold shown without an explicit staleness indicator.

## 9. Offline Behavior
- **Criterion:** The app shows an explicit offline/stale state when connectivity drops.
- **Pass condition:** 100% of screens tested show a clear offline indicator across 5 forced-offline trials; 0 instances of stale data presented as if it were live.

## 10. Recovery From Failure
- **Criterion:** The app returns to a usable state after a forced failure (network loss, backgrounding, provider outage simulation).
- **Pass condition:** Recovery to usable state within 5 seconds of connectivity restoration in 100% of trials; 0 crashes across 20 forced-failure trials.

## 11. Home Usefulness
- **Criterion:** Home answers "do I need to do anything today" without further navigation.
- **Pass condition:** ≥90% of test sessions reach a clear answer to this question on the first screen, with no additional navigation required.

## 12. Feed Usefulness
- **Criterion:** No two distinct feed items share identical explanatory text.
- **Pass condition:** 0 instances of an identical explanation string appearing on two or more distinct items within a single session, across a minimum 20-item feed sample.

## 13. Portfolio Usefulness
- **Criterion:** Every displayed portfolio figure matches the actual underlying test-account data.
- **Pass condition:** 100% match rate between displayed figures (positions, exposure, cash) and actual test-account state, 0 discrepancies.

## 14. Recommendation Clarity
- **Criterion:** Every recommendation displays confidence, uncertainty, and an explicit invalidation condition.
- **Pass condition:** 100% of recommendations reviewed include all three elements; 0 recommendations missing any one of them.

## 15. Returning-User Value
- **Criterion:** Day-2 content is genuinely different from Day-1 content for the same test account.
- **Pass condition:** ≥70% of Day-2 test sessions surface at least one item not present, unchanged, on Day 1, measured across the test cohort.

---

## Scoring Summary

| # | Criterion | Result |
|---|---|---|
| 1 | Installability | ___ |
| 2 | First Load | ___ |
| 3 | Layout Stability | ___ |
| 4 | Onboarding Time | ___ |
| 5 | One-Hand Navigation | ___ |
| 6 | Readability | ___ |
| 7 | Trust | ___ |
| 8 | Freshness | ___ |
| 9 | Offline Behavior | ___ |
| 10 | Recovery From Failure | ___ |
| 11 | Home Usefulness | ___ |
| 12 | Feed Usefulness | ___ |
| 13 | Portfolio Usefulness | ___ |
| 14 | Recommendation Clarity | ___ |
| 15 | Returning-User Value | ___ |

**Overall pass condition:** all 15 criteria pass. Any single FAIL — including FAIL — unmeasured — means the scorecard as a whole does not pass, regardless of how many other criteria succeed.
