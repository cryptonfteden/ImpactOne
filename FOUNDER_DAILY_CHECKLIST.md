# Founder Daily Checklist — Phase G1

The exact morning routine, every day of the beta, before market open — matching the product's own "Morning Brief" framing (Phase D1.5–D1.8 groundwork, Phase F1's own suggested cadence). Designed to take under 10 minutes for 5 users; if any item here starts taking longer, that's itself a signal something needs attention.

## Every Morning, in Order

1. **Engine health** — `GET /api/v2/recommendations/status`. Did the engine run in the last 24h? Did it produce anything? (Real risk, confirmed repeatedly across D1.6–D1.8: the engine can go quiet for real, diagnosable reasons — check before assuming it's fine.)

2. **Per-user activity (5 rows, not an aggregate)** — for each of the 5 `betaUserId`s: did they open the app yesterday? Did they view a recommendation? Did they touch Portfolio or AI Analysis? At n=5, read this as 5 individual facts, not a dashboard percentage.

3. **New feedback, both channels** — the per-recommendation feedback log (`feedback_submitted`, filterable by the last 24h) and the WhatsApp thread with each user. Anything flagged `DONT_UNDERSTAND` or similar gets read in full, not skimmed.

4. **Error reports** — if Phase F1's error-reporting endpoint is implemented, check it; if not yet implemented, this item is a placeholder reminding the founder that error visibility is currently console-only and any bug report must come from a user actively noticing and messaging.

5. **Silence check** — has any user gone 48+ hours with zero activity and zero response to a check-in? If yes, this is today's first priority, not an end-of-day afterthought.

6. **Failure-criteria scan** — a fast mental pass against `SUCCESS_METRICS.md`'s Failure Criteria section: any trust issue, data-integrity concern, or operational failure reported in the last 24h? If yes, stop and address before anything else on this list.

7. **One-line daily log entry** — date, DAU count (of 5), any new feedback themes, any concern. Cheap to write, invaluable at Day 7/Day 14 review — this is what turns 14 days of scattered impressions into a real, comparable record.

## Weekly (Day 7, Day 14 — layered on top of the daily routine)

- Send the structured async check-in to all 5 users (`BETA_EXECUTION_PLAN.md` Day 7/Day 14).
- Recompute the full `SUCCESS_METRICS.md` scorecard, not just the daily spot-check.
- Re-read the week's daily log entries in sequence — patterns are easier to see in aggregate than day-to-day.

## What This Checklist Deliberately Does Not Include

- No AI-quality grading or recommendation-accuracy review — the engine is frozen this phase (per mission constraint); daily review is about operations and trust, not re-litigating recommendation quality against the frozen baseline.
- No infrastructure/provider-health deep dive beyond the single engine-status check in item 1 — Phase D1.7's dependency certification already covers what "healthy" looks like; this checklist assumes that groundwork, not repeats it daily.
- No dashboard-building — this is a manual, personal routine appropriate for 5 known users, not a hint that a real founder dashboard UI needs to be built for this beta.
