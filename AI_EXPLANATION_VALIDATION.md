# AI Explanation Validation — AI-TRUST-001

**Phase:** AI-TRUST-001. Companion to [AI_TRUST_ANALYSIS.md](AI_TRUST_ANALYSIS.md) and [DAILY_FEED_ROOT_CAUSE.md](DAILY_FEED_ROOT_CAUSE.md). Records the test verification performed this session — every test below was actually run, not merely written.

---

## Explanations differ for different news events

Verified via a fresh, independent test run (`node --test --test-concurrency=1`) across 3 files:

- **`historicalSimilarityService.test.js`** (new, 5 tests): confirms `getHistoricalMatches("AAPL earnings")` returns `[]` (no fabricated match), confirms two different keyword-less events (`"AAPL earnings"`, `"Earnings calendar concentration"`) both honestly return `[]` rather than a shared fabricated result, confirms a genuine keyword match (`"Fed rate hike"`) still returns a real, non-zero, correctly-identified match (`"Rate Hikes"`), confirms a literal historical-event-name mention scores the real top tier (88), confirms no zero-similarity entry ever leaks through the filter.
- **`propagationEngineService.test.js`** (new, 4 tests): the same pattern for `propagateByTheme()` — keyword-less events honestly return `[]`, genuine matches (`oil`, `fed`/`rate`) still return their own real, distinct chains.
- **`impactIntelligenceService.test.js`** (2 new tests added to the existing file, 3 pre-existing tests re-verified unmodified): confirms the exact live-observed symptom is fixed end-to-end — `analyzeIntelligence({ event: "AAPL earnings" })` and `analyzeIntelligence({ event: "Earnings calendar concentration" })` no longer contain `"most comparable to \"Covid\""` or `"propagating from Macro shock"` anywhere in their `explainability.why` text, and their `why` sentences are no longer equal to each other (`assert.notEqual`). A genuine keyword match (`"Fed rate hike"`) is confirmed to still correctly cite its real historical analog (`"Rate Hikes"`).

**Result: 14/14 passing** across these 3 files (this session's own fresh run).

## Scoring is event-specific

- `historicalSimilarityService.test.js`'s own tests directly assert `matches[0].similarity > 0` for every genuine match and confirm the empty-array case for non-matches — verifying the score itself, not just the surrounding text.
- `impactIntelligenceService.test.js`'s new test asserts `result.historicalSimilarity[0].similarity > 0` for a genuine match and `assert.deepEqual(aapl.historicalSimilarity, [])` for a non-match — directly verifying the `historicalSimilarity` field (which feeds `confidenceScore`) is no longer a fabricated flat value.

## No regressions — broader suite re-run

Beyond the 3 directly-changed files' own tests, this session independently re-ran the full test suites of every other file confirmed (via grep) to consume the changed functions or their downstream outputs:

- `autonomousMarketService.test.js` — **24/24 passing** (this file consumes `importanceScore`, itself derived from `confidenceScore`).
- `homeSummaryService.test.js` — **23/23 passing** (this file composes the Home screen's Morning Brief/Recommendations/Intelligence Timeline cards, which surface the same explanation pipeline).

**Total this session: 61/61 tests passing, 0 failures, 0 regressions**, across both the newly-added tests and every pre-existing test in every file confirmed to depend on the changed code.

## What was deliberately NOT re-verified this session

- The full backend test suite (2000+ tests, ~15-20 minutes) was not run in full — the targeted subset above was chosen specifically because it covers every real consumer of the 2 changed functions, confirmed via a dedicated grep for `getHistoricalMatches`/`propagateByTheme` beforehand (only `impactIntelligenceService.js` imports either function; every one of its own consumers' tests above passed).
- The live browser was not re-opened to visually re-confirm the fix in the running dev UI this session (the dev servers from the prior `COMMERCIAL-READINESS-001` session were shut down at the end of that phase) — the fix is verified at the API/service level via the tests above, which exercise the exact same code path the live UI calls.

## Commit status

Per this phase's own explicit instruction ("commit locally only if stable"): the fix is committed **locally only** (no push), since all targeted verification passed cleanly with zero regressions.
