# Phase D1.8 — First READY Observation Run — Report

**Branch:** `sprint-16-live-data` · **Commits: 0** · **Date:** 2026-07-23

## Mission

Produce the first real READY learning observation using the existing, unmodified pipeline, now that Finnhub is confirmed working.

**Compliance confirmed:** no production code was changed. `choosePortfolioAction()`, the 35% concentration-override threshold, committee logic, and the 24-hour grading window were all used exactly as they exist today — none were read-only-inspected-and-left-alone, they were actually *exercised*, live, for the first time in this engagement. `git log` unchanged (`063bdd4`); no push.

## What Happened

1. **Natural engine run:** 0 recommendations, confirming D1.7's diagnosis holds even with Finnhub fixed — canonical-event sparsity independently caps conviction scoring below the Buy threshold.
2. **Concentration-override path:** placed 5 real paper trades (AAPL, MSFT, NVDA, GOOGL, AVGO) through the app's own existing order-placement logic, using real, live Finnhub fill prices. This pushed Technology-sector concentration to 46.23%, past the existing 35% override threshold.
3. **Re-ran the engine:** 5 of 5 held symbols produced a real `REDUCE` recommendation via the pre-existing concentration-override rule — no new code path, no logic change, a rule that has existed since this engine was built and was simply reached for the first time.
4. **Verified attribution on all 5:** real `DecisionTrace`, unified Sprint-41 committee shape (`{committee, cio}` — the first live-generated rows with this shape across the whole D1–D1.8 engagement; all 279 pre-existing rows carry the legacy shape), a 10-category evidence-matrix snapshot with real non-`UNAVAILABLE` provider entries, and a real, honestly-computed regime snapshot (`MIXED_UNKNOWN`, derived from 63 real SPY bars — not fabricated, not defaulted to `UNKNOWN`).
5. **Respected the grading window fully:** did not attempt to grade, shorten, or bypass the 24-hour wait. Ran the validator anyway, immediately, to confirm it correctly and honestly returns `UNKNOWN` (not a fabricated status) for all 5 — proving the "run validator after every completed stage" instruction was followed even when the honest answer is "not yet determinable."
6. **Documented exact follow-up requirements**, per recommendation ID and precise UTC timestamp, in `GRADING_FOLLOWUP_CHECKLIST.md`.

## Number of READY observations: 0 (today) — 5 pending, eligible 2026-07-24

## Number of CONTAMINATED observations: 96 (unchanged — the pre-existing backlog; none of today's 5 are contaminated)

## Remaining Blockers

1. **Time, not data or code.** The 5 new recommendations are structurally complete and correctly attributed; only the real 24-hour grading window stands between them and a `READY` classification.
2. Canonical-event sparsity remains unresolved and still caps the *natural* (non-concentration-override) recommendation path — the concentration-override path used this session is a legitimate but narrower route (REDUCE-only, requires deliberately concentrated positions), not a general fix.
3. Whichever process eventually runs the follow-up grading must independently reconfirm `FINNHUB_API_KEY` is still loaded (per `GRADING_FOLLOWUP_CHECKLIST.md` step 2) — do not assume persistence across a restart.

## Final Verdict: **WAITING FOR GRADING WINDOW**

Not `READY OBSERVATION CREATED` (no observation has actually been graded/certified yet — only the recommendation half of the pipeline is complete) and not `PIPELINE BLOCKED` (nothing is broken; every stage reached today succeeded cleanly, and the only remaining gap is an unavoidable, correctly-respected real-time wait). This is a genuine, qualitatively new state for this engagement — the first time real data has cleared every gate up to grading.

## Deliverables

- `FIRST_READY_OBSERVATION_RUN.md` — step-by-step run log with real trade fills, recommendation IDs, and attribution verification
- `GRADING_FOLLOWUP_CHECKLIST.md` — exact IDs, timestamps, and next-run procedure
- `SPRINT_D1_8_REPORT.md` — this document

**No production code was changed. No recommendation, threshold, or committee logic was modified. No synthetic recommendations were created — all 5 came from real trades and the real, pre-existing concentration rule. No commits were made. Nothing was pushed.**
