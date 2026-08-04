# Scaling Gates — Phase G2

Hard go/no-go thresholds between each stage of `PMF_SCORECARD.md`. Unlike the scorecard (which describes what evidence should exist), this document states what specifically blocks moving to the next stage. A gate is binary: cleared or not. Partial credit does not open the gate.

## Gate 1: 5 → 50 users

**Cleared only if all of the following are true, at Day 14 of the closed beta (per `BETA_EXECUTION_PLAN.md`):**
- No Failure Criterion from `SUCCESS_METRICS.md` was triggered during the 5-user beta.
- ≥3 of 5 users are still active without prompting.
- ≥3 of 5 users gave real feedback (not just usage — actual signal about what they think).
- Zero unresolved trust-breaking bugs.

**If not cleared:** do not invite 50. Fix the specific failed condition and re-run a second closed cohort of similar size first. Scaling past a failed 5-user gate does not average the problem away — it multiplies it by 10.

## Gate 2: 50 → 500 users

**Cleared only if:**
- Day-7 retention at 50 users is within a reasonable band of what was observed at 5 users (a material drop means the founder's personal involvement, not the product, was driving retention — the single most likely false-positive in a beta this small).
- At least one user who was NOT personally invited by the founder (a referral, or self-discovered) has completed onboarding and remained active for 7+ days — first proof the product works without the founder's personal trust vouching for it.
- Recommendation feedback ratio (positive:negative) has not degraded as portfolio/watchlist diversity increased.
- No data-integrity or isolation failure occurred (Phase F2's `BetaUser` isolation, now under real multi-user load for the first time).

**If not cleared:** stop growth, do not proceed to 500 on hope. A product that works for 50 founder-adjacent users but shows retention collapse or trust erosion at the edges of that group is not ready for 500 strangers.

## Gate 3: 500 → 5,000 users

**Cleared only if:**
- A real Day-30 (not just Day-7) retention cohort curve exists and shows the classic PMF signature: decay that flattens to a non-zero floor rather than continuing toward zero.
- Willingness-to-pay has moved from "stated interest" (Stage 2's gate) to a real signal — a functioning paid waitlist with a meaningful conversion-intent rate, or an actual limited paid pilot.
- Recommendation quality is measured, not assumed — real calibration data exists (`calibrationReportApi`) showing accuracy holds across at least two distinct recommendation families, not just in aggregate.
- The product has survived at least one real operational incident (a provider outage, a data quality issue, a scaling hiccup) without a Failure-Criterion-level trust breach — proof the operational maturity built in Phases D–F actually holds under real, not simulated, pressure.

**If not cleared:** 500 users who are engaged but not paying, with retention that hasn't been measured past a week, is not evidence of a business — it's evidence of a good demo. Do not raise capital or make hiring commitments against this stage without clearing this gate honestly.

## The Meta-Rule

**No gate is cleared by growing past it anyway.** If leadership (present or future) is tempted to invite the next tier of users because the current tier "seems fine" without the specific evidence above, that is the single highest-risk failure mode this document exists to prevent — mistaking growth for validation. Growth is cheap. The evidence in `PMF_SCORECARD.md` is the actual product. See `ONE_METRIC_THAT_MATTERS.md` for the tie-breaker when the gates above are ambiguous.
