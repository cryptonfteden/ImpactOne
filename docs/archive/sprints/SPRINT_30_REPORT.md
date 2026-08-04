# Sprint 30 — Personal Intelligence Layer — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 4 · **Date:** 2026-07-15

## Mission

The platform now understands markets. It must begin understanding the user. No new AI engines, only real evidence-driven personalization — facts stay global, ordering and presentation become personal.

## Priority 1 — User Memory

Research confirmed this was genuinely greenfield: no sector/theme-interest tracking or view/impression capture existed anywhere in the codebase before this sprint. New `UserMemoryEvent` model, via a real migration — one generic append-only event table (`RECOMMENDATION_VIEWED`, `THEME_VIEWED`) rather than five narrow ones, since "favorite sectors," "ignored sectors," and "reading behavior" are all *derived* at query time from this one real stream rather than stored as separate, competing facts. Feedback history was deliberately **not** duplicated here — it's read directly from Sprint 29's existing `RecommendationFeedback` table.

Create-only by repository design: no update or delete method exists anywhere in `userMemoryRepository.js`. `getSectorInterestSummary` only ever names a sector "ignored" when it was a real candidate the user was genuinely offered (passed in explicitly, never inferred) — never fabricates an ignored sector from thin air.

New `POST /v2/recommendations/:id/view` and `POST /v2/themes/:themeKey/view` endpoints fire (fire-and-forget) only when `RecommendationCard` or the Theme Dashboard are actually expanded — a real reading-behavior signal, never counted on mere list rendering.

## Priority 2 — Personal Intelligence Engine

"Use only existing evidence. Rank recommendations by user relevance. Never change facts. Only change ordering and presentation." New `personalIntelligenceService.rankByUserRelevance` is a stable re-sort — same discipline as Sprint 20's `feedPersonalizationService.rankFeedForInvestor`, whose `computeProfileWeight` it reuses directly rather than writing a second profile-weighting function. Boosts a recommendation whose sector the user has actually viewed before, boosts previously-viewed symbols (capped), and applies the existing investor-profile weighting.

Wired into `homeSummaryService.buildTopRecommendations`: the candidate pool widened from top-3-by-quality to top-10-by-quality, re-ranked by real user relevance, then trimmed to the final top 3 — so personalization chooses among genuinely strong recommendations, never a fabricated one. A dedicated test asserts the input recommendations are never mutated (deep-equal snapshot before/after) and every ranked item is a reference to an original input object, not a copy.

## Priority 3 — Learning Loop

"Use RecommendationFeedback. Use Outcome history. Use Theme evolution. Generate internal learning signals. Never allow immediate feedback to bias today's recommendations." New `learningLoopService.computeLearningSignals` aggregates real data from three existing sources — `RecommendationFeedback`, `Outcome` history (via `qualityDashboardService.computeQualityDashboard`, reused rather than recomputed a second way), and Theme evolution (via `themeIntelligenceService.computeThemeEvolution`) — into feedback-by-type/by-symbol, hit-rate/calibration/completion, and strengthened/weakened/disappeared theme lists.

Deliberately one-directional and read-only: this module is never imported by `autonomousRecommendationEngine.js` (recommendation generation/scoring) or `personalIntelligenceService.js` (ranking) — a dedicated test enforces this structurally by reading both files' source and asserting zero references either direction, not just relying on convention. Extends the existing `VITE_DEV_CONSOLE`-gated Intelligence Console (no new dashboard) with a "Learning loop (internal)" section.

## Priority 4 — Morning Personal Brief

"One concise personalized summary, maximum 60 seconds to consume." New `homeSummaryService.buildMorningPersonalBrief` condenses fields the function already computed — market headline, portfolio delta, the top personally-ranked recommendation, biggest opportunity, whether action is needed — into at most 5 short lines. Runs last, after `topRecommendations` has already been through Priority 2's personal ranking, so "top for you" genuinely reflects real relevance. No new fetch, no new fact — purely a condensation step; any honestly-empty input is skipped rather than padded with a filler line.

Rendered at the very top of Home's hero section, not a seventh card — stays within Sprint 27/28's existing density budget, so it's the first thing read before the six detailed cards below.

## Priority 5 — Beta readiness

- **Browser verification**: every new surface checked live against the running dev servers — Home's Morning Personal Brief (real market/portfolio/recommendation lines), Recommendation feedback capture and view tracking, Theme evolution and view tracking, and the internal Learning Loop panel (with `VITE_DEV_CONSOLE=true`). One check initially came back empty (Theme evolution, then the Learning Loop panel) purely from Sprint 29's known cold-start latency on the provider-fan-out endpoints — re-verified with a longer wait and confirmed correct both times, not a regression.
- **Full regression**: backend 301/301, frontend 119/119, run twice each (once immediately after each priority, once as a final full pass after Priority 5's live verification).
- **A real cross-file bug was caught by regression, not by my own new tests**: `RecommendationCard.jsx` now unconditionally calls the new `recordView` endpoint on expand, which broke `RecommendationsScreen.test.jsx`'s mock of `recommendationsApi` (missing the new method). Found and fixed by running the full frontend suite rather than only the directly-touched test files — exactly the value of the "full regression" step named in this priority.

## Verification

- **Backend:** 301/301 tests passing (full suite), up from 284 at the start of this sprint.
- **Frontend:** 119/119 tests passing (full suite), up from 114 at the start of this sprint.
- **1 new Prisma migration** (`add_user_memory_event`), applied to both the dev and test databases.
- **4 commits**, each preceded by its own test run, none pushed.

## What still remains (named, not hidden)

- **User Memory currently only captures two event types** (recommendation views, theme views). The mission's full list — favorite/ignored sectors, reading behavior, recommendation interactions, feedback history — is genuinely covered, but entirely *derived* from these two event types plus the existing feedback table, rather than each being its own explicit signal. If richer signals are wanted later (e.g., dwell time, scroll depth), the same append-only `UserMemoryEvent` table can carry new event types without a schema change to the table itself, only a new enum value.
- **Personal ranking currently only affects Home's `topRecommendations`/`personalBrief`.** The Recommendations screen's own list (`RecommendationsScreen.jsx`) still shows the unranked, chronological/status-filtered view — a deliberate scope boundary this sprint, not an oversight: Home was the mission's explicit focus ("Morning Personal Brief"), and extending personal ranking to every recommendation surface is a natural next step once this sprint's ranking logic has been observed with real usage data.
- **The Learning Loop's theme-signal aggregation calls `computeThemeEvolution` for all 7 themes on every dashboard load** (`Promise.all`, not cached) — acceptable at this internal-only, low-traffic surface's real usage pattern, but worth revisiting if the dev console ever sees frequent automated polling.

## Recommendation

Every rule from the mission's "never" list was honored in a way that's independently checkable, not just asserted: personal ranking never mutates a fact (test-enforced via reference/deep-equal checks), the Learning Loop never feeds into recommendation generation or ranking (test-enforced by reading source files directly), and User Memory never overwrites (test-enforced by asserting no update/delete export exists). The platform now has a real, evidence-based foundation for understanding its user — the next sprint that builds on this should extend personal ranking to more surfaces once real usage data exists to validate the current weighting choices.
