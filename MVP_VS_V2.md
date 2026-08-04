# MVP vs. V2 — ImpactOne

**Phase:** LAUNCH-PLAN-001. Companion to [LAUNCH_ROADMAP.md](LAUNCH_ROADMAP.md). Documentation only.

---

## What ships in MVP

### The full 14-agent Domain Intelligence Platform, as currently built
All 14 real agents (Technical, Options, Sentiment, Symbol-Sentiment, News, Short Interest, Earnings, Valuation, Fibonacci, Insider, ETF Flow, Institutional, Macro, Analyst Consensus), the Unified Stock Intelligence engine, and the newly-connected Claim Intelligence pipeline. **Why**: this is not aspirational — it is already built, tested, and (per this session's own independent test re-runs) genuinely working. Withholding an already-complete, already-tested capability from MVP would be artificial scope-narrowing with no real benefit.

### Honest, disclosed confidence per agent (14 independently-designed formulas, unmodified)
**Why**: every one of the 14 formulas is individually honest (a hard `dataAvailable: false → confidence: 0` gate, never fabricated) and independently tested. The fact that they are not yet cross-agent-calibrated (`CALIBRATION_STRATEGY.md`) is a real, disclosed limitation — but disclosure, not calibration, is the MVP bar here, and disclosure already exists via each agent's own `components` breakdown.

### The Claim Intelligence integration, exactly as shipped (opt-in, single call site)
**Why**: it is real, tested, and safely scoped (a `publishClaims` flag defaulting to `false`, wired `true` at exactly one call site). There is no reason to hold this back — it is additive, non-breaking, and already independently verified this session.

### Basic operational hygiene: auth, rate-limiting, CI, logging, a re-verified build, a confirmed-current dataset contamination figure
**Why**: these are not "nice to have" — per `LAUNCH_CHECKLIST.md`'s own Blocking section, exposure beyond the current small trusted cohort without these is not a scope decision, it is a real security/operational risk. These belong in MVP by necessity, not by choice.

## What moves to V2

### True cross-agent numeric confidence calibration
**Why deferred**: `CALIBRATION_STRATEGY.md` is explicit and correct that this requires real, sufficient, per-agent-attributed graded-Outcome history that does not exist yet — the Outcome Calibration Engine's own honest "insufficient data" gating (verified this session, 34/34 tests passing) proves the *engineering* is ready but the *data* is not. Shipping fabricated calibration in MVP would actively harm the platform's own stated trust differentiator.

### Shared confidence contract adoption (the `basis` field, shared utility extraction)
**Why deferred**: `CONFIDENCE_MIGRATION_PLAN.md`'s own staged approach is correct — none of these changes are launch-blocking, all are additive/low-risk, and rushing them into MVP would add unnecessary last-mile change surface to a codebase that is otherwise stable and tested. V2 is the natural home for polish work that does not change user-facing behavior.

### Registry migration to shared/Redis-backed state
**Why deferred**: `SCALABILITY_RECOMMENDATIONS.md` (Priority 3, explicitly deferred) is correct that no multi-instance deployment is imminent — building this now would be solving a problem that does not yet exist, at real engineering cost that could instead go toward Milestone 1-3's genuine blockers.

### Tiered/priority-aware Agent Scheduler
**Why deferred**: same reasoning — no evidence yet of a material fast/slow agent execution-time spread at real production volume. Building this speculatively risks over-engineering against an assumption that may not hold once real traffic data exists.

### `technical`/`fibonacci` addition to Unified Stock Intelligence, `scoringVocabulary.js` registration of all 14 formulas, provider-metadata formalization
**Why these are borderline, and recommended for MVP despite being individually "nice to have"**: unlike the items above, these are all one-line-to-hours-of-effort, zero-behavior-change fixes (`LAUNCH_CHECKLIST.md` Medium priority). They are included in MVP not because they are required to launch safely, but because deferring them to V2 has no real cost-saving benefit given how cheap they are — see `LAUNCH_ROADMAP.md` Milestone 4.

### A real individual-rating-action/real-time event feed for Analyst Consensus, a second real analyst-ratings vendor, deeper macro data (PCE/GDP/VIX), a real-time securities-lending vendor for Short Interest, and every other domain-specific "Production tier" vendor recommendation from this engagement's own 14-phase research series
**Why deferred**: every one of these was already explicitly staged as "Production" or "Enterprise" tier in its own research phase's Data Strategy document (e.g., `SHORT_INTEREST_DATA_STRATEGY.md`, `ANALYST_CONSENSUS_DATA_STRATEGY.md`, `MACRO_DATA_STRATEGY.md`) — MVP for each of those domains was always scoped to the already-configured, free/cheap data sources each agent currently uses. This MVP/V2 boundary was decided per-domain, months of research effort ago, and this document reaffirms rather than reopens those decisions.

## Summary table

| Item | MVP | V2 | Reasoning |
|---|---|---|---|
| 14 real Domain Agents | ✅ | | Already built, tested, working |
| Unified Stock Intelligence | ✅ | | Already built, tested, working |
| Claim Intelligence integration (as shipped) | ✅ | | Real, safely-scoped, independently verified |
| Per-agent honest confidence (uncalibrated) | ✅ | | Individually honest; disclosure ≠ calibration |
| Auth/rate-limiting/CI/logging/backup | ✅ (required) | | Not a scope choice — a real risk if absent |
| Cross-agent numeric calibration | | ✅ | Requires real data this platform doesn't have yet |
| Shared confidence contract (`basis` field, utilities) | | ✅ | Additive polish, non-blocking, staged deliberately |
| Redis/shared-state registry migration | | ✅ | No real multi-instance need yet |
| Tiered/priority-aware Scheduler | | ✅ | No evidence yet of material need |
| Cheap architectural cleanups (technical/fibonacci, scoringVocabulary registration) | ✅ | | Trivially cheap, no reason to defer |
| Domain-specific "Production/Enterprise tier" vendor upgrades | | ✅ | Already deliberately staged this way per-domain, months ago |
