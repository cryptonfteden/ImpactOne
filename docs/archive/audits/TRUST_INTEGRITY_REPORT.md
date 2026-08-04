# Trust Integrity Report — LIVE-DATA-FINAL-001

## The Defect

Two backend services generate the explanatory text and historical-comparison scores shown across Home, Daily Feed, Alerts, and Market Intelligence: `historicalSimilarityService.js` (produces "...most comparable to '{event}' ({similarity}% historical similarity)") and `propagationEngineService.js` (produces "...propagating from {from} to {to} ({effect})"). Both determine a topical match using plain substring containment: `text.includes(keyword)`.

This is a real word-boundary bug, not a business-logic or architectural one: a short keyword can match **inside** an unrelated word.

- `"Shipping rates surge"` (a freight/logistics headline) contains the literal substring `"rate"` inside `"rates"` → matched the `"rate"` keyword → scored 88% similar to **"Rate Hikes"** (a Fed interest-rate-policy historical analog) and inherited the **Fed funds → Bonds/USD → Rates → Growth equities** propagation chain — none of which has anything to do with shipping.
- `"Semiconductor capacity constraint"` contains the literal substring `"ai"` inside `"constraint"` → matched the `"ai"` keyword → scored 88% similar to **"AI Boom"** and inherited the **AI demand → Semiconductors → Cloud → Power demand → Utilities** chain — a coincidental letter sequence, not a real topical connection.

## Why This Was the Most Damaging Finding of the Full-Stack Review

This product's stated design principle (established in `AI-TRUST-001` and reconfirmed across every subsequent phase) is: **never fabricate a specific-sounding match; if there's no real evidence, honestly return nothing.** `AI-TRUST-001` already fixed the flat-fallback version of this problem (every unmatched event used to score a fabricated 42% against "Covid"). This session found the surviving sibling defect: a **real keyword match that shouldn't have fired**, not a fabricated one. The user-visible effect was identical either way — genuinely unrelated events showing byte-identical, confident-sounding "reasoning" — which is precisely the failure mode a "no fabrication, ever" product cannot afford, because it is the one thing a skeptical user can catch without any special knowledge, in under five minutes of normal use.

It was independently, live-confirmed as still present as of this morning across three separate reviews in this engagement (`FINAL-CEO-REVIEW-001`, `MOBILE-EXPERIENCE-001`, and this session's own re-check) before being root-caused and fixed here.

## The Fix

Added a local `hasWord(text, word)` helper (`new RegExp(`\\b${word}\\b`, "i").test(text)`) to each file independently — matching this codebase's own established convention of each engine owning its own small matching helper rather than importing a shared one (the same pattern already used by `claimConfidence.js`'s own `capAndRedistributeWeights`, per its own code comment). Every `.includes(keyword)` call in both files' theme/keyword matching was replaced with `hasWord(text, keyword)`.

**What changed:** "Shipping rates surge" and "Semiconductor capacity constraint" now honestly return no historical match / no propagation chain (the same honest-empty behavior `AI-TRUST-001` already established for genuinely unmatched events), instead of a fabricated-by-accident 88% match.

**What did not change:** "Fed rate hike" and "FOMC Rate Decision" — two headlines that are genuinely both about Fed interest-rate policy — still correctly, identically match "Rate Hikes." Two real, related events sharing one real historical analog is the system working as designed, not a defect; the fix only removes matches where the underlying evidence was never real.

## Verification

- 2 new regression tests per file (4 total) directly reproduce and assert against both false-positive headlines.
- 1 new regression test per file (2 total) asserts the genuine Fed-policy match is preserved identically.
- All 3 real, known downstream consumers re-run: `impactIntelligenceService.test.js` (the module that actually renders this text into the Daily Feed's `buildWhy`), `autonomousMarketService.test.js`, `homeSummaryService.test.js` — 19 + 47 tests, zero failures.
- Full frontend suite re-run: **615/615 passing, 77/77 test files, zero regressions.**
- Change committed locally to `sprint-16-live-data` (`70aee70`); **not pushed**, per mission instruction.

## Residual Risk (Disclosed, Not a New Defect)

The fix narrows false positives but does not eliminate every theoretical word-boundary collision — e.g. a real headline literally containing the standalone word "war" would still (correctly, per the existing design) match the Ukraine-War analog even in an unrelated context (e.g. "price war," "trade war," "bidding war"). This is the same class of risk this whole keyword-based system has always carried, disclosed since its original design, and out of scope for an isolated word-boundary fix — a genuinely more robust fix would require real NLP/topic-classification, which is an architectural change, not a deterministic one-line fix, and was correctly not attempted here.
