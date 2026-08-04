# Predictive Scenario Engine — API Contract (Phase SCENARIO-ENGINE-001)

**Status:** Architecture only — no route, controller, or service described below has been implemented. This defines the contract new code would need to satisfy, in the same documentation style as `API_CONTRACTS.md`/`OPTIONS_AGENT_API.md`/`MARKET_SENTIMENT_API.md`.

## 1. Contract rules (inherited from prior engine API docs)

- Mounted under `/api/v2/scenarios/*`, alongside this platform's other v2, betaUser-aware surfaces.
- The single most important rule, restating the mission's product experience: **there is no "ask a question" or "formulate a scenario" endpoint.** Every read endpoint below returns an already-generated, already-ranked result — the engine identifies scenarios proactively (architecture §4); the API only ever serves what it already produced.
- Market-wide/symbol-level reads require **no** beta user identity (scenarios about a symbol or the market are not personal data, matching `CanonicalEvent`/`IntelligenceBusEvent` precedent). Portfolio-personalized reads (ranked by a specific user's real holdings) require `X-Beta-User-Id`, same convention as `workspaceService.requireBetaUser()`.
- Rollout gated behind `FeatureFlag` `key: "scenario-engine"`.
- Until enough real evidence/history exists for a given symbol/scenario type, endpoints return `200` with an honest empty/degraded result (`scenarios: []`, `insufficientData: true` with a real reason) — never a fabricated placeholder scenario, matching every prior engine's "degrade honestly within a 200" convention.

## 2. Endpoint index

### Read — proactive scenario feed (personalized when beta user identity present, market-wide otherwise)

- `GET /api/v2/scenarios/today` — the one primary endpoint: today's ranked scenario feed, personalized if a beta user identity is present.
- `GET /api/v2/scenarios/:scenarioId` — one full scenario, including its evidence breakdown.
- `GET /api/v2/scenarios/symbols/:symbol` — all active scenarios for one symbol.

### Read — learning/quality (dev-console gated, mirrors existing quality-platform precedent)

- `GET /api/v2/scenarios/quality/calibration` — probability calibration, grouped by scenario type (extends `calibrationReportService`'s existing shape).
- `GET /api/v2/scenarios/quality/selection` — scenario-selection quality report (the genuinely new metric, architecture §8).
- `GET /api/v2/scenarios/:scenarioId/outcome` — the graded `ScenarioOutcome` history for one scenario, once resolved.

### Internal / operational (dev-console gated)

- `POST /api/v2/scenarios/generate/run` — manual trigger for `scenarioIdentificationService` + `scenarioGenerationService` (mirrors the Options Agent's `POST .../ingest/run` precedent; no scheduler is proposed in this architecture-only phase).
- `POST /api/v2/scenarios/grade/run` — manual trigger for `scenarioOutcomeGradingService`.

## 3. Endpoint detail

### `GET /api/v2/scenarios/today`

The primary surface — the literal implementation of the mission's product-experience line.

**Query params:** none required. `limit` (default `10`, max `50`).

```json
{
  "generatedAt": "2026-07-26T13:00:00.000Z",
  "personalized": true,
  "scenarios": [
    {
      "scenarioId": "scn_...",
      "scenarioSetId": "set_...",
      "symbol": "NVDA",
      "scenarioType": "BASE",
      "rankPosition": 1,
      "whatIsExpected": "NVDA is likely to keep climbing over the next few weeks.",
      "whyItMatters": "This is 12% of your portfolio — one of your largest holdings.",
      "whatWouldChangeOurView": "If NVDA falls below $130, or Q3 earnings miss guidance, we'd expect this to reverse.",
      "translationSource": "openai",
      "probability": 62,
      "urgencyScore": 55,
      "personalImpactScore": 81,
      "compositeRank": 71.4,
      "confirmationCondition": "NVDA closes above $165 before the next earnings date.",
      "invalidationCondition": "NVDA closes below $130, or Q3 earnings miss consensus EPS.",
      "resolutionAnchorAt": "2026-08-20T00:00:00.000Z",
      "evidence": [
        { "category": "observed", "source": "options:sig_...", "summary": "A cross-exchange call sweep traded 8.4x average volume today." },
        { "category": "inferred", "source": "worldMemoryCausalLink:...", "summary": "Similar sweep patterns preceded a 5-day rally in 3 of the last 4 historical analogs." },
        { "category": "predicted", "source": "scenarioEngine", "summary": "62% probability of continued upside over the next 2 weeks." },
        { "category": "uncertain", "source": "scoringVocabulary.uncertainty", "summary": "Moderate disagreement — 2 of 5 evidence categories are contradictory." }
      ],
      "status": "ACTIVE",
      "label": "Signal — not a recommendation"
    }
  ],
  "insufficientData": false
}
```

When `X-Beta-User-Id` is absent, `personalized: false` and `personalImpactScore` is honestly `null` for every scenario (never a fabricated generic value) — ranking falls back to probability + urgency only, disclosed via a `rankingBasis: "probability_and_urgency_only"` field (omitted from the example above for brevity, always present in the real response).

### `GET /api/v2/scenarios/:scenarioId`

One full scenario. `404` with `{ "error": "Scenario not found." }` for an unknown id — a real not-found, distinct from an honestly-empty `/today` feed.

### `GET /api/v2/scenarios/symbols/:symbol`

Same scenario shape as `/today`, filtered to one symbol, including non-ACTIVE (CONFIRMED/INVALIDATED/EXPIRED) scenarios when `includeResolved=true` is passed — the "what did we think would happen, and what actually happened" audit view for one symbol.

### `GET /api/v2/scenarios/quality/calibration`

```json
{
  "byScenarioType": [
    { "scenarioType": "BASE", "sampleSize": 42, "expectedProbability": 61, "actualHitRate": 58, "calibrationTrend": "STABLE", "insufficientData": false },
    { "scenarioType": "UPSIDE", "sampleSize": 3, "insufficientData": true, "insufficientDataMessage": "Fewer than 5 graded UPSIDE scenarios exist yet — calibration is not yet statistically meaningful." }
  ]
}
```

Directly extends `calibrationReportService.computeCalibrationReports()`'s real shape and `MIN_SAMPLE_SIZE` gate — grouped by `scenarioType` instead of (or in addition to) recommendation `action`.

### `GET /api/v2/scenarios/quality/selection`

The genuinely new report (architecture §8):

```json
{
  "windowDays": 90,
  "sampleSize": 12,
  "insufficientData": true,
  "insufficientDataMessage": "Fewer than 30 fully-resolved scenario sets exist in the last 90 days — scenario-selection quality is not yet statistically meaningful.",
  "rank1AccuracyRate": null,
  "note": "This measures whether the #1-ranked scenario each day was actually the one that turned out to matter most — a different question from per-scenario probability calibration (see /quality/calibration)."
}
```

### `GET /api/v2/scenarios/:scenarioId/outcome`

The real `ScenarioOutcome` row(s) for one scenario, one per graded `timeWindow` — `404` if the scenario hasn't resolved yet (`{ "error": "This scenario has not been graded yet." }`), distinct from a `200` with an empty array (which would incorrectly imply grading ran and found nothing).

### `POST /api/v2/scenarios/generate/run` / `POST /api/v2/scenarios/grade/run`

Manual triggers, dev-console gated, mirroring the Options Agent's `POST .../ingest/run` precedent exactly — no new run-result shape invented.

## 4. Error semantics

| Case | Status | Body |
|---|---|---|
| No scenarios currently identified (honest, not an error) | `200` | `{ "scenarios": [], "insufficientData": true, "insufficientDataMessage": "..." }` |
| Unknown `scenarioId` | `404` | `{ "error": "Scenario not found." }` |
| Scenario not yet graded | `404` | `{ "error": "This scenario has not been graded yet." }` |
| Missing beta user identity on a scoped endpoint | `400` | `{ "error": "A beta user identity is required for ..." }` — same style as `workspaceService.requireBetaUser` |
| Feature flag disabled | `404` | Same "as if the route doesn't exist" treatment used elsewhere for gated routes |

## 5. Versioning

`methodologyVersion` (`"scenario-engine-v1"` initially) carried on every `Scenario`/`ScenarioOutcome`, same discipline as every prior engine's `methodologyVersion` field — a future change to the ranking/grading formula never silently reinterprets historical scenarios. Genuinely new API surface (`/api/v2/scenarios/*`), not an extension of an existing unversioned route.
