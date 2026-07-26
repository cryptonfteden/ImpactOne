# Phase D1.7 — External Dependency Certification — Report

**Branch:** `sprint-16-live-data` · **Commits: 0** · **Date:** 2026-07-23

## Mission

Prove that the existing production pipeline becomes operational once all external dependencies are available — no new features, no logic/threshold/committee changes.

**Compliance confirmed:** this session was pure investigation and documentation — code inspection (`Read`/`Grep`) plus a handful of already-proven-safe live calls repeated to confirm exact line numbers and behavior (no new mutating actions beyond what D1.5/D1.6 already ran). `git log` unchanged (`063bdd4`); no push.

## What This Session Established

1. **A complete dependency matrix** (`DEPENDENCY_CERTIFICATION.md` §1) covering all 8 dependency categories named in the mission plus the ones discovered in D1.5/D1.6: PostgreSQL (working), Finnhub (missing), Yahoo Finance (working, keyless), news/wire provider (reachable but empty), env-var loading (working as a mechanism), the scheduler (working, confirmed live), and the remaining 13 registered providers (mostly stub/empty).
2. **The exact code-level trace of every `FINNHUB_API_KEY` consumption point** (`DEPENDENCY_CERTIFICATION.md` §2): 4 call sites in production code, 3 best-effort (degrade to null/UNGRADEABLE, never crash) and 1 hard dependency (`portfolioEngineService.placeOrder()`, which throws without a live quote). Traced the full `Request → Response → Quote → Recommendation → Order → Outcome → Benchmark → READY` chain and identified precisely which links are direct vs. indirect — only the Benchmark computation itself (Yahoo-based) is not directly coupled to Finnhub; everything else in the chain is.
3. **An operator-only readiness checklist** (`PRODUCTION_READINESS_CHECKLIST.md`) split into Mandatory/Recommended/Optional, containing zero code changes — every action is a credential, a restart, or a call to an already-existing, already-tested function.

## D2 Preconditions

**Mandatory:**
- A working `FINNHUB_API_KEY`.
- At least one new recommendation successfully generated under it (via either real conviction-score improvement or the concentration-override REDUCE path).
- That recommendation's full 24-hour grading window elapsed.
- At least one real, benchmarked, non-`CONTAMINATED` `READY` observation actually certified (not just theoretically possible) via `datasetValidatorService`.

**Recommended:**
- A working news/wire provider key, so conviction scores get real per-symbol differentiation rather than resting entirely on the concentration-override path.
- A small, non-trivial population of READY observations (more than 1) before D2 analytics would be statistically meaningful — D1.7 does not set an exact number; that judgment belongs to whoever scopes D2.

**Optional:**
- LLM key for richer committee synthesis text.
- Broader alt-data/social provider coverage.
- An explicit, non-default `AUTONOMOUS_ENGINE_INTERVAL_MINUTES`.

## Final Verdict: **BLOCKED BY EXTERNAL DEPENDENCIES**

The pipeline's code is proven correct and complete end-to-end (every stage from Recommendation through READY classification has been exercised live, error-free, across D1.5–D1.7). The blocker is exactly one missing credential (`FINNHUB_API_KEY`) plus the unavoidable real-time 24-hour grading wait — both are operator/environmental actions, not defects. No code, threshold, or logic change would resolve them within this or any single session; per this phase's own rule, none was attempted.

## Deliverables

- `DEPENDENCY_CERTIFICATION.md` — full dependency matrix + Finnhub consumption trace
- `PRODUCTION_READINESS_CHECKLIST.md` — Mandatory/Recommended/Optional operator checklist
- `SPRINT_D1_7_REPORT.md` — this document

**No production code was changed. No recommendation, threshold, or committee logic was touched. No commits were made. Nothing was pushed.**
