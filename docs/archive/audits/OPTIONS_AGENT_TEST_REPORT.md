# Unusual Options Agent — Test Report (Phase AI-ENGINE-001.1)

## Summary

```
node --test --test-concurrency=1 "backend/services/optionsAgent/**/*.test.js"
tests 59
pass  59
fail  0

npm run test:backend   (full suite)
tests 817
pass  817
fail  0
```

All new tests pass; the full backend suite (including 758 pre-existing tests) passes with zero regressions.

## Coverage against the mission's required test list

| Required case | Test file | Representative test(s) |
|---|---|---|
| Malformed input | `optionsFlowNormalizer.test.js` | "missing symbol is rejected safely, not thrown"; "invalid optionType is rejected with a specific reason"; "non-finite / negative numeric fields are all rejected, not coerced to zero"; "invalid expiry/tradeTimestamp dates are rejected"; "reports every violation at once, not just the first" |
| Duplicate prints | `optionsFlowNormalizer.test.js`, `optionsAgentService.test.js` | "drops an exact repeat of the same real trade within one batch"; "two distinct real trades (different price) are never treated as duplicates"; "ingestAndDetect drops in-batch duplicate prints before persisting" |
| Stale data | `optionsFlowNormalizer.test.js`, `optionsAgentService.test.js` | "computeDataFreshness reports isStale honestly once past the threshold"; "no timestamp at all is honestly reported as stale, never assumed fresh"; "ingestAndDetect's freshness reflects the real most-recent print timestamp against now" |
| Unavailable provider | `optionsAgentService.test.js` | "getStatus honestly reports not connected when no vendor credential exists"; "listSignals returns an honestly empty array with unavailableReason, never a fabricated placeholder row"; "getSymbolView honestly reports unavailable rather than a zero-value score" |
| CALL anomaly | `optionsSignalDetectors.test.js` | "detectCallPutSkew fires bullish-leaning when call volume is far above the symbol's own baseline ratio" |
| PUT anomaly | `optionsSignalDetectors.test.js` | "detectCallPutSkew fires bearish-leaning when put volume dominates far past the symbol's own baseline ratio" |
| Sweep detection | `optionsSignalDetectors.test.js`, `optionsAgentService.test.js` | "fires for a real cross-exchange, single-aggressor-side, tight-window cluster"; "no signal when only one exchange is represented"; "no signal when the cluster spans longer than the tight time window"; "never guesses a sweep from a mixed/unknown aggressor-side cluster"; "ingestAndDetect produces a sweep signal with no forbidden governance fields..." |
| Block detection | `optionsSignalDetectors.test.js` | "fires for a single print clearing the size threshold"; "fires for a single print clearing only the notional threshold"; "no signal when no print clears either threshold" |
| OI pending state | `optionsSignalDetectors.test.js` | "current session OI not yet available is always PENDING, never guessed" |
| OI confirmed state | `optionsSignalDetectors.test.js` | "a real OI increase confirms new positioning"; "a real OI decrease confirms closing/rolling activity"; "honestly UNCONFIRMED when there is no real prior session to compare against" |
| Governance field prohibition | `optionsSignalGovernance.test.js`, `optionsAgentService.test.js` | "reuses canonicalVerdict's exact denylist, not a second competing list"; "sanitizeOptionsSignal strips every forbidden key structurally"; "assertNoGovernanceViolation throws when a forbidden key is present"; the end-to-end `ingestAndDetect` test that asserts a real, fully-computed sweep signal carries none of `FORBIDDEN_GOVERNANCE_KEYS` |

Every required case from the mission is covered by at least one real, behavior-asserting test (not a smoke test) — several are covered at both the pure-function (detector/normalizer) level and the integration (service + real test database) level.

## Additional coverage beyond the required list

- **Explanation generator** (`optionsSignalExplanation.test.js`): asserts the function throws without its required fields, that two different signals produce genuinely different text (the specific bug — Daily Feed's template collision — this design exists to prevent), and that absent fields are omitted rather than rendered as a fabricated "N/A."
- **Confidence rollup** (`optionsAnomalyConfidence.test.js`): asserts `null` (not a fabricated number) when there's no computable evidence, that scores stay within `[0, 100]` even with every positive adjustment stacked, and that a sweep+block combination scores higher than volume-spike-alone (the architecture's documented classification-strength ordering).
- **Volume-vs-baseline trigger discipline** (`optionsSignalDetectors.test.js`): a specific test proves a 10x multiple on a tiny absolute size does *not* fire (the architecture's "went from 2 to 20 contracts" anti-false-positive example), distinct from a 10x multiple on a real size, which does.
- **`scoringVocabulary.test.js`** (pre-existing, updated additively): still asserts every one of the now-10 canonical scores documents range/meaning/formula/fallback — `optionsAnomalyConfidence` was verified to satisfy the same contract as every other score, not exempted.

## What was intentionally NOT tested this phase (and why)

- **No HTTP/route-level tests.** No Express routes were wired this phase (see the implementation report's "deliberate scope decisions") — there is nothing to `supertest` yet. Every service function this phase built is directly unit/integration-tested instead.
- **No scheduler tests.** No scheduler exists yet this phase (see implementation report). `ingestAndDetect`/`confirmPendingOpenInterest` are tested as directly-callable functions, which is how a future scheduler would invoke them.
- **No real-vendor integration test.** There is no real vendor to integrate against in this environment (disclosed in the architecture doc itself) — `isConfigured()` returning `false` and every downstream honest-stub/honest-empty behavior is what's tested instead.
- **No migration-rollback test.** Not requested; the migration is purely additive.

## Test environment

Real, isolated PostgreSQL test database (`impactone_test`, via `DATABASE_URL_TEST` / `backend/test/testEnv.js`) — the same pattern every other Prisma-backed service test in this codebase already uses. `truncateAll()` (extended this phase for the 3 new tables) runs before each test that touches persistence. No mocked Prisma client — `optionsAgentService.test.js`'s ingestion tests write real rows and read them back.
