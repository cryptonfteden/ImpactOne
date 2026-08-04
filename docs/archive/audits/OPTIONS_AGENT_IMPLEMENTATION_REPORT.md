# Unusual Options Agent — Implementation Report (Phase AI-ENGINE-001.1)

## Mission

Implement the first production-safe foundation of the Unusual Options Agent per the three approved architecture documents (`OPTIONS_AGENT_ARCHITECTURE.md`, `OPTIONS_AGENT_API.md`, `OPTIONS_AGENT_DATA_MODEL.md`): provider integration, canonical normalization, the 5 detectors, governance, persistence, and the service layer. No frontend UI this phase.

## What was built

### 1. Provider integration — `backend/services/providers/definitions/optionsFlowProvider.js`

Extended, not replaced. The provider's default `fetch` (used by `providerRegistry`/`providerIngestionService`) is still `honestStubFetch` — unchanged behavior. Added:
- `isConfigured()` — a real credential check (`process.env.OPTIONS_FLOW_PROVIDER_API_KEY`), never hardcoded `false`.
- `fetchTradePrints()` / `fetchOpenInterestSnapshots()` — two named, contract-shaped functions (trade prints and OI snapshots are genuinely different feeds/cadences per the architecture doc). Both resolve through `honestStubFetch` today; no vendor request/parsing logic was written against a vendor this environment has no credentials for. No market data is invented anywhere in this file.

### 2. Canonical normalization — `backend/services/optionsAgent/optionsFlowNormalizer.js`

`normalizeRawPrint(raw)` validates symbol, expiry, strike, option type, exchange, trade timestamp, premium (price), volume (size), and (when present) open interest and bid/ask-at-trade. Returns `{ valid, print, errors }` — never throws on malformed input; a bad vendor record is an expected, routine event. Every violation is reported at once, not just the first.

- Aggressor side is inferred **only** when both a real bid and ask are present (architecture §5c's explicit rule) — never guessed from price alone.
- `normalizeBatch(rawRecords)` separates malformed records from valid ones and drops in-batch duplicates via a deterministic natural key (`computePrintDedupKey`) — the same real trade reported twice never double-counts toward a detector's volume total.
- `computeDataFreshness(timestamp, options)` — a real, disclosed freshness check; a missing timestamp is honestly reported as stale, never assumed fresh.

### 3. Aggregation — `backend/services/optionsAgent/optionsFlowAggregator.js`

Pure grouping functions: `aggregateByContract` (by symbol+expiry+strike+optionType, giving detectors real total volume/notional/largest-print-size/aggressor-side splits) and `aggregateSymbolCallPutVolume` (real per-symbol call/put totals for the skew detector). No I/O, no fabrication — pure sums over whatever prints were actually ingested.

### 4. Detection engine — `backend/services/optionsAgent/optionsSignalDetectors.js`

All 5 detectors from architecture §5, each a pure function returning `null`/an honest "insufficient baseline history" marker when required input is missing — never a guessed value:

- `detectVolumeBaseline` — trigger multiple **and** an absolute-size floor, both required.
- `detectCallPutSkew` — Z-score against the symbol's **own** baseline ratio, never a market-wide constant.
- `detectSweep` — requires ≥2 distinct exchanges, a single real (non-`UNKNOWN`) aggressor side, and a tight time window — never inferred from a mixed cluster.
- `detectBlock` — a single print clearing a size or notional threshold.
- `detectOiConfirmation` — `PENDING` when current-session OI isn't available yet (always, at detection time — OI is one session in arrears by real market structure), `CONFIRMED_NEW_POSITION`/`CONFIRMED_CLOSING` once a real prior-session comparison exists, `UNCONFIRMED` when no real prior session exists to compare against.

### 5. Confidence rollup — `backend/services/optionsAgent/optionsAnomalyConfidence.js` + `scoringVocabulary.js`

Implements architecture §6's exact formula (`sizeScore*0.35 + classificationStrength*0.30 + oiConfirmationAdjustment + skewCorroborationAdjustment`, clamped 0-100). `computeAnomalyScore` returns `null` (never a fabricated number) when there's no real classification signal to score. Documented as a new `scoringVocabulary.js` `SCORE_DEFINITIONS` entry (`optionsAnomalyConfidence`) — additive, not a parallel scoring system — with the existing `scoringVocabulary.test.js` updated to expect the 10th score name.

### 6. Explanation generator — `backend/services/optionsAgent/optionsSignalExplanation.js`

`buildOptionsSignalExplanation` **requires** the signal's own numeric fields as arguments and throws if they're absent — it structurally cannot run against a generic "signal happened" shape, the explicit design rule from architecture §7 aimed at preventing the documented Daily Feed explanation-template-collision bug. Verified: two different signals never produce the same sentence (see test report).

### 7. Governance — `backend/services/optionsAgent/optionsSignalGovernance.js`

Reuses `canonicalVerdict.js`'s exact `FORBIDDEN_COMMITTEE_KEYS` denylist (`action`, `decision`, `verdict`, `finalDecision`, `recommendation`) rather than a second, competing list. `sanitizeOptionsSignal` strips any of these keys structurally and attaches the required `label: "Signal — not a recommendation"` — applied to every signal before it is persisted or returned by the service layer. `assertNoGovernanceViolation` provides a hard, throwing invariant check for tests. **Every code path in `optionsAgentService.js` that returns a signal calls `sanitizeOptionsSignal` first** — there is no bypass.

### 8. Persistence — `backend/prisma/schema.prisma`

Added exactly the three tables and four enums from `OPTIONS_AGENT_DATA_MODEL.md` (`OptionsFlowPrint`, `OptionsOpenInterestSnapshot`, `OptionsSignal`; `OptionRight`, `AggressorSide`, `OptionsSignalType`, `OiConfirmationStatus`) — purely additive, zero changes to any existing model or column, no foreign key from any existing table. Migration `20260725195156_options_agent_foundation` was generated via `prisma migrate dev` and applied to the real dev database (`impactone_dev`), then deployed to the isolated test database (`impactone_test`) via the existing `npm run db:deploy:test` script. `backend/test/dbHelpers.js`'s `truncateAll()` was extended (additively) to clean the three new tables between tests.

### 9. Repository — `backend/services/optionsAgent/optionsFlowRepository.js`

`OptionsFlowPrint`/`OptionsOpenInterestSnapshot` are create+read only (with app-layer duplicate detection for prints, since no DB-level unique constraint governs a print's natural key, and a real DB-level unique constraint + upsert for OI snapshots). `OptionsSignal` is append-only with **exactly one** disclosed, bounded exception: `confirmOpenInterest(signalId, ...)` — a narrow, single-purpose method that transitions `oiConfirmationStatus` exactly once, never a general-purpose `update`. Decimal-typed Prisma columns are converted to plain JS numbers on every read (`toPlainSignal`) so callers/API consumers never have to know which columns are Decimal-backed.

### 10. Service layer — `backend/services/optionsAgent/optionsAgentService.js`

One function per `OPTIONS_AGENT_API.md` read endpoint (`getStatus`, `listSignals`, `getSignalById`, `getSymbolView`, `getProviderHealth`), each already shaped to match the contract's documented response bodies, plus `ingestAndDetect` (the full architecture §4 pipeline: normalize → persist prints → aggregate → detect → score → explain → sanitize → persist signal) and `confirmPendingOpenInterest` (the daily OI-confirmation pass, callable directly). Every read path honestly reports `{ status: "not_connected" }`-equivalent output (never a fabricated placeholder) while the provider is unconfigured, matching the API contract's §1 rule verbatim.

## Governance verification

Every one of `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` was tested absent from every signal this pipeline produces, both via direct `sanitizeOptionsSignal` unit tests and an end-to-end `ingestAndDetect` test that inspects a real, fully-computed sweep signal. No `action`/`decision`/`verdict`/`finalDecision`/`recommendation` field is ever emitted.

## Deliberate scope decisions (disclosed, not discovered later)

- **No Express routes/controller were wired this phase.** The mission's scope list (§1-7) names "service layer," not "API layer" — every service function is already shaped to match `OPTIONS_AGENT_API.md`'s response bodies and is independently testable/callable, but no `/api/v2/options-agent/*` route exists yet. Wiring routes + the `FeatureFlag`-gated rollout (`key: "options-agent"`) is the natural next phase (AI-ENGINE-001.2).
- **No background schedulers were built.** Architecture §9 proposes two `node-cron` schedulers (`optionsFlowIngestionScheduler`, `optionsOiConfirmationScheduler`); this phase's scope list doesn't include them, and `ingestAndDetect`/`confirmPendingOpenInterest` are fully callable/testable without one. A future phase can add the scheduler shell around these exact functions with no redesign.
- **No baseline-history accumulation mechanism was built.** Every detector correctly reports `insufficientBaselineHistory: true` (or an equivalent `null`) when no baseline is supplied — this phase does not yet persist/roll up historical volume or skew-ratio baselines, since the architecture doc states this must be bootstrapped from the engine's own accumulated history, which does not exist until real ingestion has run for weeks. `getStatus()`'s `trackedSymbolCount` is honestly `0` and `getProviderHealth()`'s `baselineBootstrapInProgress` is honestly `true` for the same reason.
- **No real options-flow vendor was connected**, per the architecture doc's own explicit, disclosed limitation — `optionsFlowProvider.isConfigured()` returns `false` in this environment and every code path honestly reflects that.

## Files created or changed

**Created**
- `backend/services/optionsAgent/optionsFlowNormalizer.js` (+ `.test.js`)
- `backend/services/optionsAgent/optionsFlowAggregator.js`
- `backend/services/optionsAgent/optionsSignalDetectors.js` (+ `.test.js`)
- `backend/services/optionsAgent/optionsAnomalyConfidence.js` (+ `.test.js`)
- `backend/services/optionsAgent/optionsSignalExplanation.js` (+ `.test.js`)
- `backend/services/optionsAgent/optionsSignalGovernance.js` (+ `.test.js`)
- `backend/services/optionsAgent/optionsFlowRepository.js`
- `backend/services/optionsAgent/optionsAgentService.js` (+ `.test.js`)
- `backend/prisma/migrations/20260725195156_options_agent_foundation/migration.sql`
- `OPTIONS_AGENT_IMPLEMENTATION_REPORT.md`, `OPTIONS_AGENT_TEST_REPORT.md`

**Changed (additive only)**
- `backend/services/providers/definitions/optionsFlowProvider.js` — extended, honest-stub behavior preserved.
- `backend/prisma/schema.prisma` — 3 new models, 4 new enums, zero existing-model changes.
- `backend/services/scoringVocabulary.js` — 1 new `SCORE_DEFINITIONS` entry.
- `backend/services/scoringVocabulary.test.js` — updated expected-score-name list (9 → 10).
- `backend/test/dbHelpers.js` — 3 new `deleteMany()` cleanup calls.

## Verification

Full backend suite: `npm run test:backend` → **817/817 passing**, 0 failures (includes 59 new options-agent tests). No existing test was weakened or skipped to make this pass.

## Remaining limitations

- No route/controller/feature-flag wiring yet (see above) — nothing in this phase is reachable over HTTP.
- No scheduler — ingestion/detection/OI-confirmation must be invoked directly (by a future scheduler, or manually) until AI-ENGINE-001.2.
- No real vendor connection — every path is honest-stub until a real options-flow vendor or OPRA license is procured.
- No migration rollback was tested (not requested this phase; the migration is purely additive so a rollback would only need to `DROP` the 3 new tables/4 enums).
