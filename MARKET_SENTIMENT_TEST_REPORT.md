# Market Sentiment Engine — Test Report (Phase AI-ENGINE-002.1)

## Summary

```
node --test --test-concurrency=1 "backend/services/marketSentiment/**/*.test.js"
tests 55
pass  55
fail  0

npm run test:backend   (full suite)
tests 872
pass  871
fail  1   (pre-existing, unrelated — see below)
```

All 55 new tests pass. The one full-suite failure (`worldMemoryRepository.immutability.test.js`'s concurrent-revision-numbering test) is a pre-existing flaky concurrency test unrelated to this phase — confirmed by running that file alone, where it passes (5/5); its module (`worldMemoryRepository.js`) was not touched by this work.

## Coverage against the mission's required test list

| Required case | Test file | Representative test(s) |
|---|---|---|
| All inputs available | `marketSentimentEngine.test.js`, `marketSentimentService.test.js` | "all inputs available: every implemented dimension is available and the overall score is a real, finite number"; "all inputs available: getMarketSentiment returns the full required shape with a real score" |
| Partial inputs | `marketSentimentEngine.test.js` | "partial inputs: only the dimensions with real data available are scored, others are honestly missing" |
| No inputs | `marketSentimentEngine.test.js`, `marketSentimentService.test.js` | "no inputs at all: overall score/confidence are honestly null, not a fabricated neutral value"; "no inputs (every source fails): getMarketSentiment still returns the required shape with an honestly null score" |
| Stale inputs | `marketSentimentService.test.js` | "stale inputs: dataFreshness honestly reflects real input age relative to now" |
| Provider failure | `marketSentimentService.test.js` | "provider failure: one source throwing never blocks the rest of the reading" |
| Single-indicator dominance prevention | `marketSentimentRollup.test.js` | "single-indicator dominance prevention: no raw weight is ever allowed to exceed the cap"; "computeRollup: a single dimension cannot dominate the overall score even with a hugely higher confidence than the others" |
| Null-not-zero | `marketSentimentRollup.test.js` | "computeRollup: null-not-zero — an unavailable dimension never drags the score toward zero" |
| Market isolation | `marketSentimentScorers.test.js`, `marketSentimentEngine.test.js`, `marketSentimentService.test.js` | "News Sentiment: market isolation — Europe-tagged items never leak into a US reading and vice versa"; "market isolation: computing US and JAPAN from the same shared inputs produces independent, non-identical readings with no cross-contamination"; "market isolation: calling computeMarketSentiment for one market never mutates the shared dimensionInputs object for another call"; "market isolation: US and CHINA computed from the same mocked sources never share unavailable/available state" |
| Deterministic scoring | `marketSentimentRollup.test.js`, `marketSentimentEngine.test.js` | "computeRollup: deterministic — identical input always produces identical output, contributor order included"; "computeRollup: deterministic regardless of input array order"; "deterministic scoring: identical market + inputs + now always produces an identical result" |
| Snapshot persistence | `marketSentimentService.test.js` | "snapshot persistence: captureSnapshot writes one OVERALL row and one row per dimension, all real and readable back"; "snapshot persistence is append-only: capturing the same market+day twice violates the real unique constraint rather than silently overwriting" |
| Governance field prohibition | `marketSentimentGovernance.test.js`, `marketSentimentService.test.js` | "governance field prohibition: reuses canonicalVerdict's exact denylist, not a second competing list"; "governance field prohibition: sanitizeSentimentReading strips every forbidden key structurally"; "governance field prohibition: the real, fully-composed canonical reading never carries a forbidden field" |

Every required case is covered by at least one real, behavior-asserting test — several (all-inputs-available, no-inputs, market isolation, determinism, governance) are covered at both the pure-function (scorer/engine/rollup) level and the integration (service + real test database + mocked providers) level.

## Additional coverage beyond the required list

- **Per-dimension scorer honesty** (`marketSentimentScorers.test.js`): each of the 5 implemented scorers has both a "real data available" test and at least one "honestly unavailable" test (no matching feed items, market not recommendation-eligible, no macro data source for the market, insufficient price history, no active recommendations) — 15 tests total across the 5 scorers.
- **Fallback-vs-live confidence distinction**: a specific test proves Fear & Greed scores strictly lower confidence when `altDataService.getMacroData()` fell back to its disclosed static fallback vs. live FRED data — confidence isn't just present, it's honestly differentiated by real data quality.
- **Weight-capping algorithm correctness** (`marketSentimentRollup.test.js`): `capAndRedistributeWeights` is tested to always sum to 1, to leave already-balanced weights unchanged, and to cap every weight at the configured maximum regardless of how skewed the raw input is.
- **Trend computation edge cases** (`marketSentimentRollup.test.js`): insufficient daily history, insufficient weekly history (requires 5 prior snapshots), a null current score, and the real IMPROVING/DETERIORATING/STABLE classification thresholds — 7 tests.
- **`scoringVocabulary.test.js`** (pre-existing, updated additively): still asserts every one of the now-12 canonical scores documents range/meaning/formula/fallback — the 2 new Market Sentiment entries were verified to satisfy the same contract as every other score, not exempted.

## What was intentionally NOT tested this phase (and why)

- **No HTTP/route-level tests** — no Express routes were wired this phase (explicit mission scope exclusion). Every function is directly unit/integration-tested instead.
- **No scheduler tests** — no scheduler exists yet this phase (explicit exclusion). `captureSnapshot()` is tested as a directly-callable function, which is how a future scheduler would invoke it.
- **No live-network integration test** — `altDataService.getMacroData()`/`getPolymarketData()`, `cotIntelligenceService.getCotIntelligence()`, and `technicalIntelligenceService.analyzeSymbol()` are all mocked in `marketSentimentService.test.js` rather than hitting real FRED/Polymarket/CFTC/Yahoo Finance endpoints in CI — those underlying functions already have their own tests elsewhere in this codebase; this phase's tests verify the sentiment engine's own logic (composition, rollup, governance, persistence) against controlled inputs, not third-party network availability.
- **No Market Breadth/Sector Rotation/Earnings Trend scorer tests** — no scorer exists for these (by design); their permanent-unavailability is instead verified as part of the engine-level tests ("the 3 dimensions with no real data source are always reported unavailable, never fabricated").

## Test environment

Real, isolated PostgreSQL test database (`impactone_test`, via `DATABASE_URL_TEST`/`backend/test/testEnv.js`) for `marketSentimentService.test.js` — same pattern every other Prisma-backed service test in this codebase uses. `truncateAll()` (extended this phase for the new table) runs before each test that touches persistence. Underlying real-data-source functions (`autonomousMarketService`, `autonomousRecommendationRepository`, `altDataService`, `cotIntelligenceService`, `technicalIntelligenceService`) are monkey-patched per-test (same "swap the function, restore in `finally`" pattern `portfolioEngineService.test.js` already established) rather than mocked at the module-loader level, so real Prisma/DB behavior is exercised end-to-end while third-party network calls are controlled. All other test files (`marketSentimentScorers.test.js`, `marketSentimentRollup.test.js`, `marketSentimentGovernance.test.js`, `marketSentimentEngine.test.js`) are pure, no-I/O unit tests.
