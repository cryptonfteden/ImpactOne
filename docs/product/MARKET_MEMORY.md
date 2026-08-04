# Market Memory (Phase X10 — Part 6)

## What it is

The first real similarity-matching query over the persisted `WorldMemoryRecord` table. Genuinely new work — the only prior "historical similarity" feature (`historicalSimilarityService.js`) is a hardcoded stub over a static 8-event array with keyword-substring matching, never wired to real data, and never mounted on any route.

## Files

- `backend/services/marketMemoryService.js` — `findSimilarHistory({ symbols, sectors, excludeRecordId, limit })`.
- `backend/controllers/marketMemoryController.js`, `backend/routes/marketMemoryRoutes.js` — mounted at `GET /api/v2/market-memory/similar?symbols=NVDA&sectors=Technology`.

## How matching works

Scores every real `WorldMemoryRecord` (most recent 500, a disclosed bound) by real symbol/sector overlap with the query, ranks by overlap score then recency, and returns the top matches. For each match, composes:

- **Previous event** — the record's real `headline`/`occurredAt`.
- **Previous reasoning** — real `WorldMemoryCausalLink.explanation`/`confidence` rows for that event.
- **Previous prediction** — real `WorldMemoryPrediction.predictedAction`/`predictedConfidence`.
- **Previous outcome** — the real, graded `Outcome.directionCorrect`/`gradeLabel`/`windowReturnPct` for that prediction, or an honest "Not yet graded" when ungraded.

A query with no symbols or sectors, or no historical overlap, returns an empty match list with a real, stated `reason` — never a fabricated "similar event."

## Tests

`backend/services/marketMemoryService.test.js` — 3 tests: honest empty-input handling, honest no-overlap handling, and a full real match composing a causal link, prediction, and graded outcome together.
