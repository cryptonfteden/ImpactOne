# Phase D1.6 — Dataset Population & Certification — Report

**Branch:** `sprint-16-live-data` · **Commits: 0** · **Date:** 2026-07-23

## Mission

Produce the first real READY learning observations — no new features, no architecture changes, no recommendation/committee logic changes.

**Compliance confirmed:** no production code was modified this session. All work was live investigation and live (unmodified) function calls against the real dev database and real external services. `git log` unchanged since Sprint 42 (`063bdd4`); no push occurred.

## Summary

This session traced D1.5's open question ("why zero recommendations?") to a definitive, single-root-cause answer: **`FINNHUB_API_KEY` is unset**, and this one missing credential independently blocks three separate pipeline stages — live quote enrichment (caps conviction scoring at 69, never reaching the 72 Buy threshold), paper-trade order placement (blocks populating the portfolio, which would otherwise unlock a second real path to recommendations via the concentration-override rule), and outcome grading's live price lookup. Separately, canonical-event ingestion is confirmed almost entirely empty (14 of 15 providers return 0 items; only 1 event exists in the whole database), which independently caps conviction-score variance even where quotes aren't the issue.

**Number of READY observations produced this session: 0.**
**Number of CONTAMINATED observations: 96 (unchanged from D1/D1.5).**

No new recommendation was generated (evidence in `DATASET_POPULATION_REPORT.md` §1–3), so no new observation could be carried through the lifecycle to certification. Additionally, even a successfully-generated new recommendation could not be certified READY within this same session, because `outcomeGradingService`'s grading window is a real, unmodified 24-hour wait — a structural timing constraint, not a bug.

## Section-by-Section

1. **Data population investigation** — completed with direct evidence for every candidate cause (market conditions, provider configuration, thresholds, API keys, market/news inputs). See `DATASET_POPULATION_REPORT.md` §1.
2. **Operational readiness** — every external dependency assessed for Configured/Reachable/Working/Blocking. See `DATASET_POPULATION_REPORT.md` §2. One dependency (PostgreSQL) and one keyless provider (Yahoo Finance historical bars) are fully working; Finnhub and the news/wire provider are the two blocking gaps.
3. **Dataset population plan** — the shortest real path to ≥20 recommendations is documented precisely: supply `FINNHUB_API_KEY`, then place ~10–20 concentrated paper trades in one sector to trigger the existing, unmodified 35% concentration-override rule (`REDUCE` action), which is threshold-independent and does not require conviction scores to ever cross 72. This is the fastest legitimate path and requires zero code changes. See `DATASET_POPULATION_REPORT.md` §3.
4. **READY observation certification** — 0 produced. Full lifecycle stage-by-stage status against the existing 279-row dataset, and the exact certification procedure for the next session once unblocked, are both documented in `READY_OBSERVATION_REPORT.md`.
5. **Exit report** — this document, plus the two above.

## Remaining Blockers

1. **`FINNHUB_API_KEY` missing** — the single highest-leverage blocker; resolves quote enrichment, order placement, and grading simultaneously.
2. **News/wire provider effectively non-functional** — 0 real items ingested; caps conviction-score variance independent of the Finnhub issue.
3. **24-hour grading window** — structural, not a bug; means even a fully successful population run cannot reach a certified READY observation in the same session it was generated in. A future session must run at least 24 hours after recommendation generation to complete certification.
4. **All 279 existing rows are permanently ineligible** (immutable, no benchmark, legacy committee shape) — confirmed dead ends, not something a future session should re-attempt to salvage.

## Whether D2 can begin

**No.** D2 requires a real, non-trivial population of READY/PARTIAL observations to analyze. Zero exist. The blockers are now fully diagnosed, singular, and actionable (one API key + one ~20-trade population run + a 24-hour wait), which is real progress from D1's diffuse uncertainty and D1.5's two-blocker state — but the population itself has not happened yet.

## Deliverables

- `DATASET_POPULATION_REPORT.md` — root-cause investigation, dependency table, population plan
- `READY_OBSERVATION_REPORT.md` — lifecycle verification, certification table (empty, honestly), next-session procedure
- `SPRINT_D1_6_REPORT.md` — this document

**No production code was changed. No recommendation or committee logic was touched. No commits were made. Nothing was pushed.**
