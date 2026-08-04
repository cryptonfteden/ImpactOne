# News Source Scoring (Phase X10 — Part 4)

## What it is

The first real, dynamic, outcome-informed trust score per news source. Genuinely new work — the only prior source-scoring path (`scoringVocabulary.js`'s `sourceCredibility`) delegates to a fixed, static table (95 for known outlets, 60 default) with no learning component.

## Files

- `backend/services/newsSourceScoringService.js` — `getSourceScore(sourceName)`, `listSourceScores()`.
- `backend/controllers/newsSourceScoringController.js`, `backend/routes/newsSourceScoringRoutes.js` — mounted at `GET /api/v2/news-source-scoring` and `GET /api/v2/news-source-scoring/:sourceName`.

## How the trust score is computed

Every component is a real aggregation, joined through the real `CanonicalEvent → WorldMemoryRecord → WorldMemoryPrediction → Outcome` chain:

- **Accuracy** — real `directionCorrect` hit rate of graded outcomes traced back to this source.
- **False-positive rate** — `1 − accuracy`, same real sample.
- **Market impact** — average absolute `Outcome.windowReturnPct` for this source's graded outcomes.
- **Timeliness** — average real `ingestedAt − publishedAt` gap over the source's `CanonicalEvent` rows.
- **Credibility** — average of the real, already-persisted static `CanonicalEvent.credibilityScore` for this source.
- **User engagement** — real `AnalyticsEvent` count with `properties.sourceName` matching (Part 1's `sourceName` property, added this phase).

`trustScore` is the average of only the components that have real data (accuracy, inverse false-positive rate, credibility) — a source with zero graded outcomes yet still returns a score of `null` with an explicit `trustScoreReason`, never a fabricated number.

## Not yet computed (honestly disclosed)

"Prediction quality" beyond accuracy (e.g. magnitude calibration) is not separately broken out this phase — accuracy and market impact are the two real proxies currently available.

## Tests

`backend/services/newsSourceScoringService.test.js` — 5 tests: required-sourceName validation, honest incomplete score with zero graded outcomes, a real correct-prediction trust score, per-source-isolated engagement counting, and multi-source listing/sorting.
