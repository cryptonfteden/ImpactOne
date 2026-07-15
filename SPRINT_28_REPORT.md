# Sprint 28 — Morning Intelligence — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 3 · **Date:** 2026-07-15

## Mission

ImpactOne must become the first app a user opens every morning. No new engines, no architectural rewrites — only user-visible value, built by merging and reusing what already exists rather than adding parallel systems.

## Priority 1 — Unified Morning Brief

`homeSummaryService.buildHomeSummary` was already the closest thing to a Morning Brief (Sprint 20/24's six-question Home). Extended it with fields that genuinely merge the five named sources, each via an existing repository/service call, not a new one:

- **Recommendations + DecisionTrace**: `topRecommendations` — top 3 active recommendations by `qualityScore`, via the same `autonomousRecommendationRepository.listActive` + `canonicalVerdict.buildCanonicalVerdictView` path the Recommendations screen itself uses.
- **Portfolio**: `portfolioSnapshot` — totalValue/cashBalance/positionCount from the same `portfolioEngineService.getPortfolioSummary` call already made.
- **World Memory + Daily Feed**: already covered by the existing `whatChangedInBeliefs` (thesis revisions) and `whatHappened`/`whyShouldICare` (event feed) — no change needed, confirmed by reading the existing implementation before building anything new.

No duplicated information: each new field reads from a distinct underlying source, and the frontend merges overlapping cards (see Priority 6) rather than presenting the same fact twice.

## Priority 2 — Today For You

Reused `feedPersonalizationService.rankFeedForInvestor` (Sprint 20) rather than writing a second ranking function — the same profile-weight inputs (risk tolerance, investment horizon, age, goal) that already rank Daily Feed now also drive Home's agenda. Added `describePriorityReason`, which names the *actual* signal that moved each item (held position, watchlist membership, or a specific profile match) — never a generic "personalized for you" label. Facts stay global (the feed itself is untouched); only ordering and the stated reason are personal, per the mission's own framing.

## Priority 3 — Intelligence Timeline

Built `classifyTimelineSection`, combining two fields `autonomousMarketService` already computes — `timeBucket` (`"overnight"`/`"since-open"`/`"last-hour"`) and `timeHorizon` (free-text like `"1-3 months"`, `"2-4 weeks"`) — into the five requested sections. No new classification model or engine.

**A live browser check caught a real bug the unit tests didn't**: the first version's regex checked `week` before `month`/`year`, so items with a `"1-3 months"` horizon (the majority of the feed, since it's `impactIntelligenceService`'s default) fell through to "Today" — 25 of 28 items were dishonestly bucketed as immediate when they were genuinely medium-term. Reordered the check so month/year matches first; re-verified live: Today went from 25 misclassified items to 0, Long Term correctly shows 25.

## Priority 4 — Recommendation evolution clarity

`RecommendationCard`'s `describeChange` (from Sprint 27) returned one run-on sentence mixing every dimension of change. Restructured it to return a typed object, rendered as explicitly labeled lines: **Why it changed** (action/status), **What confidence changed** (from → to, with direction), **What evidence changed** (new matched-event headlines), **What thesis changed** (new reasoning, only when it genuinely differs). Same underlying data as before — this is a presentation fix, not a new computation, so users can scan the dimension they care about instead of parsing a paragraph.

## Priority 5 — Portfolio Morning Summary

Added `buildPortfolioMorningSummary`: **biggest opportunity** (highest-`qualityScore` BUY among `topRecommendations`), **biggest risk** (highest-`riskScore` EXIT/REDUCE, falling back to a held-symbol feed item tagged `impactType: "risk"` if no recommendation qualifies), **matters today** (actionable recommendations + high-actionability feed items touching held symbols), **can wait** (a count of monitor-tier feed items). No new risk/opportunity model — every field is a real read of already-computed `action`/`qualityScore`/`riskScore`/`actionability` data, honestly `null` when nothing qualifies rather than fabricating an alert to fill the section ("no unnecessary alerts," per the mission).

## Priority 6 — Information density

Rather than stacking three new sections (Today For You, Portfolio Morning Summary, Intelligence Timeline) on top of the existing six cards, overlapping cards were merged: *What happened* + *Why should I care* + *What changed since yesterday* collapse into one **Morning Brief** card; *What changed for my portfolio* merges with the new Portfolio Morning Summary into one **Portfolio** card; *What should I pay attention to today* merges with the new ranked recommendations list into one **Recommendations** card. Net result: Home still renders exactly 6 cards — unchanged from Sprint 27 — despite three brand-new features. Measured live: Home's total scroll height (1998px) remains far below Dashboard's (3550px), confirming Home stayed the condensed, sub-60-second surface even after this sprint's additions.

## Verification

- **Backend:** 265/265 tests passing (full suite), up from 259 at the start of this sprint.
- **Frontend:** 108/108 tests passing (full suite), up from 104 at the start of this sprint.
- **Browser verification:** every change was checked live against the running dev servers. Two real issues were caught only by this live pass, not by unit tests alone: (1) a stale backend process serving pre-edit code after a file change, requiring a manual `taskkill`/restart to actually exercise the new fields — a reminder that this repo's backend has no auto-reload; (2) the timeline month/year classification bug described in Priority 3.
- **3 commits**, each preceded by its own test run, none pushed.

## What still remains (named, not hidden)

- **Dashboard vs. Home overlap** was measured, not eliminated. Home and Dashboard still cover conceptually adjacent ground (portfolio delta, recommendations, daily brief) through two separate component trees, per Sprint 27's established design ("Home is the condensed six-question version, Dashboard is the full-detail one"). This sprint verified that relationship still holds (Home is ~56% of Dashboard's height) rather than attempting to fold one into the other — a genuine merge of the two screens would be an architectural rewrite, explicitly out of scope for this sprint.
- **Today For You showed "nothing prioritized" in this dev environment** during manual testing, since no `InvestorProfile` row exists by default and the feed's personal-relevance matches were sparse for the default watchlist. This is the honest empty state working as designed (no fabricated agenda), not a bug — but it means the feature's value is only fully visible once a real investor profile and watchlist are populated, worth calling out for anyone demoing this cold.
- **Intelligence Timeline's Long Term bucket currently absorbs most feed items** (25 of 28 in the live check), since most events carry the same `"1-3 months"` default horizon rather than a differentiated one. The classification itself is now honest, but the underlying event data doesn't yet vary enough in `timeHorizon` to make all five sections feel equally populated — a genuine content problem upstream in `impactIntelligenceService`'s horizon assignment, not a bucketing bug, flagged for a future sprint focused on evidence quality rather than presentation.

## Recommendation

Home is now a materially more complete Morning Brief — merging Recommendations, Portfolio, World Memory, and a time-bucketed Daily Feed into one surface — without becoming a longer page than it was last sprint. The clearest remaining gap is upstream data variety (event horizons, investor profile population) rather than anything in this sprint's own logic, which is honestly reflected above rather than papered over.
