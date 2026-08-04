# Explainability Engine — Phase X7, Part 2

## Starting point

Sprint 39 already built a real, extensive explainability system: `decisionTraceExplainabilityService.js` assembles a full bundle per recommendation (immutable `DecisionTrace`, a freshly re-convened committee, disagreement classification, consistency checking, provenance, and `recommendationExplanationService.js`'s own real reasoning fields). Reading it, nearly every one of this phase's seven required questions was already answered somewhere in that bundle — just not labeled as the mission's seven questions, and scattered across differently-named fields a consumer would have to know to look for.

## What changed

`sevenQuestionsService.js` (new) — a pure, additive mapping layer. It computes nothing; it relabels. `buildSevenQuestions(bundle)` takes the already-assembled explainability bundle and derives:

| Question | Derived from |
|---|---|
| What happened? | `${symbol} received a ${action} recommendation.` — from `explanation.action` |
| Why does it matter? | `explanation.whyAction` — the recommendation's own real reasoning text |
| Who is affected? | `decisionTrace.rankingResult.symbolSource` (`portfolio`/`watchlist`/`market-scan`) mapped to a plain-language sentence — this is `scoringVocabulary.js`'s `relevance` score's real underlying classification, not a new computation |
| How confident are we? | `confidence` + `uncertainty` (both already on the bundle, per `SCORING_ARCHITECTURE.md`'s Family 1), plus a plain-language label (High/Moderate/Low) |
| What evidence supports this? | `explanation.evidenceMatteredMost` — the committee's own strongest supporting/contradictory evidence |
| What data is missing? | `explanation.missingEvidence` merged with `liveCommittee.unavailableEvidence` — two real, already-computed lists, never re-derived |
| What would invalidate this conclusion? | `explanation.singleFactThatWouldChangeThis` — Sprint 39's own real answer to exactly this question, just relabeled |

Wired in as `bundle.sevenQuestions`, additive on `decisionTraceExplainabilityService.explainRecommendationById`'s existing return shape — every existing consumer of that function is unaffected; anything reading the bundle gets this field for free.

## "No recommendation may exist without explanation" — already true, verified

`decisionTraceExplainabilityService.explainRecommendationById` already throws (never fabricates) if a recommendation or its `DecisionTrace` doesn't exist — this was Sprint 39's own explicit design ("no orphan recommendation"), re-confirmed passing by the existing test `"refuses to fabricate a trace for a real recommendation with no DecisionTrace row"`. This phase adds nothing here because nothing needed adding — the constraint was already enforced structurally, not just documented.

## What was deliberately not done

No new frontend screen renders `sevenQuestions` yet. `AiAnalysisScreen.jsx`'s existing explainability-adjacent UI is already large and complex; wiring in a new field is real, valuable follow-up work, but doing it carefully (matching this phase's design-consistency emphasis, Part 5) is better scoped as its own bounded task than rushed alongside seven other X7 parts. The field is real, tested, and available at `GET /api/v2/explainability/:recommendationId` today — a future UI pass has real data to build against immediately.

## Testing

`explainability.test.js`'s existing "assembles a full, real explainability bundle" test extended with direct assertions against `bundle.sevenQuestions`: `whatHappened` matches the real symbol/action, `howConfident.confidence`/`uncertainty` match the real recommendation's own stored values, `whatIsMissing` is a real array, `whatWouldInvalidate` is a real string. All 17 pre-existing tests in this file pass unchanged.
