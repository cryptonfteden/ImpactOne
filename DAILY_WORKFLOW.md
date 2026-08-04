# Daily Workflow Trace — REAL-WORLD-USAGE-001

The real navigation trace this phase's method was based on — a founder's realistic few-minutes "check in" session, followed screen-by-screen through the actual code paths each step triggers.

## The Trace

1. **Open app → Home.** Real fetch: `homeApi.getSummary(watchlist)`. Full loading spinner shown (expected — first load of the session).
2. **Glance at Recommendations.** Real fetch: engine/calibration data, genuinely expected fresh each view — no caching gap here.
3. **Check Portfolio.** Real fetch: `portfolioEngineApi.getPerformanceDelta()`, already behind `withRequestCache` — near-instant if recently viewed this session.
4. **Back to Home** (the single most common real round-trip — "just checking the summary again before moving on"). **Before this phase's fix**: full spinner + full re-fetch again, even though the exact same data had loaded under a minute earlier. **After this phase's fix**: near-instant, served from the 15-second request cache — matching what already happens in step 3.
5. **Check Alerts.** Real fetch: live feed, correctly always fresh — no change expected or made here.
6. **Close the app.**

## What This Trace Is For

Steps 1–3 and 5–6 were traced to confirm they already behave correctly (see `FOUNDER_FRICTION.md` for each one's specific verification). Step 4 is where this phase's one real, measurable finding lives — a founder repeating the single most natural real action in this loop (returning to the landing screen) paid a real, avoidable network round-trip and a real, avoidable spinner flash every time, until this phase's fix (see `USABILITY_FIXES.md`).

## Why This Trace, Not a Longer One

This mission explicitly scoped the work to *real friction discovered during continuous use*, not an exhaustive tour of every screen combination. This trace covers the realistic, highest-frequency loop (the screens a founder actually opens in a normal check-in, in the order they'd actually open them) rather than an artificial combinatorial sweep of every possible navigation path — consistent with every other phase's own honest-scope disclosure this session.
