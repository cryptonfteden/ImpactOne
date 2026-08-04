# AI Trust Analysis — Daily Feed Identical Explanations

**Phase:** AI-TRUST-001. Investigates the Daily Feed trust issue discovered live during `COMMERCIAL-READINESS-001` (two unrelated headlines, "AAPL earnings" and "Earnings calendar concentration," sharing byte-identical explanation text and scores). This document determines *why*; [DAILY_FEED_ROOT_CAUSE.md](DAILY_FEED_ROOT_CAUSE.md) traces the exact code path; [AI_EXPLANATION_VALIDATION.md](../planning/AI_EXPLANATION_VALIDATION.md) records the fix's verification.

**Outcome: a deterministic, isolated, non-architectural fix was identified and implemented** (per this phase's own explicit instruction to implement rather than only document when those 3 conditions are met). 61 tests independently run this session, 0 failures, 0 regressions.

---

## 1. Determining why different news items receive identical explanations and scores

**This is not an AI/LLM problem at all.** No prompt, model call, or non-deterministic generation is involved anywhere in this pipeline — `impactIntelligenceService.js`'s `buildWhy()` function assembles a plain-language sentence from 3 pure, synchronous, rule-based JavaScript computations:

1. `adjustAffected(event)` — classifies the event into 1 of 19 categories via keyword matching (`CATEGORY_KEYWORDS`), returning that category's real, differentiated stock/sector list.
2. `getHistoricalMatches(event)` (in `historicalSimilarityService.js`) — matches the event against 8 hardcoded historical analogs via a small set of specific keywords.
3. `propagateByTheme(event)` (in `propagationEngineService.js`) — matches the event against a handful of specific "theme" keywords, returning a propagation chain.

**Item 1 was already well-built** (its own header comment cites a prior "Sprint 26 — Trust Breaker fix" that correctly widened this from 4 to 19 categories). **Items 2 and 3 were not** — both had exactly the same latent design flaw: a small number of specific keyword rules, plus **one single, non-differentiated fallback value returned for every event that didn't match any of them.**

Any event headline that doesn't contain one of a handful of specific words (`covid`, `nvidia`/`ai`, `oil`/`energy`, `fed`/`rate`, `israel`/`war`/`conflict`, `liquidity`, `trade`, `pandemic` for item 2; `oil`, `fed`/`rate`, `ai`/`nvidia` for item 3) — which describes the large majority of realistic financial headlines, including both example events from the commercial review — received the **exact same fallback output** as every other such event: a flat `42` "similarity" score matched to "Covid" (first in the historical-analog list, so first after a stable sort on a tie), and a generic `"Macro shock" → "Risk assets" (mixed)` propagation chain. Two different events with no genuine keyword match therefore always produced byte-identical historical-analogy and propagation clauses — and since the platform's `Confidence`/`Importance` scores are themselves partly derived from the historical-similarity score (`impactIntelligenceService.js`'s `confidenceScore` directly averages in `history[0].similarity`; `autonomousMarketService.js`'s `importanceScore` is directly derived from `confidenceScore`), the numeric scores collapsed to identical values too.

## 2. Which of the 6 named areas this originates from

| Area | Responsible? |
|---|---|
| Prompt construction | **No** — no LLM prompt exists anywhere in this pipeline |
| Context assembly | **Yes — the primary source.** The historical-analogy and theme-propagation context-assembly steps used an impoverished keyword-matching scheme that couldn't differentiate the large majority of real event text |
| Caching | No — each distinct event string produces its own cache key (`JSON.stringify({event, symbol})`); caching does not conflate distinct events |
| Fallback logic | **Yes — the proximate cause.** The specific defect was each function's *fallback* value (returned when no real keyword matched) being a single, shared, non-differentiated constant instead of an honest "no match" result |
| AI orchestration | No — no orchestration/agent-selection logic is involved in this specific pipeline |
| Feed rendering | No — the frontend renders exactly what the backend computes; verified this session via live browser testing that the backend's own JSON response already contained the identical text before any rendering occurred |

**Summary**: this is a **context assembly / fallback logic** defect, entirely deterministic and entirely backend-side, in 2 small, previously-untested pure functions.

## 3. Deterministic fix plan (implemented this session)

Since the defect is isolated to 2 small, pure, side-effect-free functions (`similarityScore()`/`getHistoricalMatches()` in `historicalSimilarityService.js`, `propagateByTheme()` in `propagationEngineService.js`), does not require any schema change, new service, or architectural change, and every downstream consumer (`buildWhy()`, `confidenceScore`'s computation) **already had graceful, honest handling built in for a missing/falsy historical or propagation match** (confirmed by direct source read before implementing) — this met this phase's own explicit criteria to implement directly rather than only document.

**The fix**: replace each function's single shared fallback value with an honest "no confident match" result (a `0` similarity score, filtered out before sorting/slicing; an empty propagation-chain array) — see [DAILY_FEED_ROOT_CAUSE.md](DAILY_FEED_ROOT_CAUSE.md) for the exact diff-level detail and [AI_EXPLANATION_VALIDATION.md](../planning/AI_EXPLANATION_VALIDATION.md) for the full test verification.

## 4. A disclosed, deliberately out-of-scope residual risk

`impactIntelligenceService.js`'s `confidenceScore` also incorporates `fusion.unifiedConfidence` (from `alternativeFusionService.js`), which is scoped per-*symbol*, not per-*event*. Two different events analyzed against the **same** symbol could still, in principle, produce a coincidentally-similar confidence score for a reason unrelated to this session's fix. This is a materially smaller, different, and more architecturally-involved question than the fabricated-explanation defect this session fixed, and was deliberately left out of scope — implementing a fix there would require touching `alternativeFusionService.js`'s own confidence model, a larger change than this session's "isolated, deterministic, no architecture change" mandate permits. Flagged here for a future, separate, appropriately-scoped phase.
