# First READY Observation Run — Phase D1.8

**Generated:** 2026-07-23, from live invocations against the real dev database and real Finnhub/Yahoo Finance network calls. No code changes.

## Step 1 — Natural Engine Run

`autonomousRecommendationEngine.runOnce()` run live with 20 real symbols, now with a working `FINNHUB_API_KEY`. **Result: 0 recommendations generated.** Confirms D1.7's finding was correct and complete: resolving Finnhub alone does not raise conviction scores past the 72 Buy threshold — the scoring ceiling is capped by sparse canonical-event coverage, a separate, still-unresolved gap. No recommendation logic was touched to investigate or work around this.

## Step 2 — Concentration-Override Path (existing, unmodified logic)

Placed 5 real paper trades through the app's own existing `portfolioEngineService.placeOrder()` — no synthetic data, no code path invented:

| Symbol | Side | Qty | Real fill price (live Finnhub) | Executed at |
|---|---|---:|---:|---|
| AAPL | BUY | 30 | $320.84 | 2026-07-23T16:57:09.081Z |
| MSFT | BUY | 20 | $381.18 | 2026-07-23T16:57:13.530Z |
| NVDA | BUY | 40 | $209.74 | 2026-07-23T16:57:18.048Z |
| GOOGL | BUY | 40 | $319.28 | 2026-07-23T16:57:22.541Z |
| AVGO | BUY | 20 | $390.83 | 2026-07-23T16:57:26.963Z |

Resulting Technology sector concentration: **46.23%** of the $100,000 virtual portfolio — above the existing, unmodified 35% `CONCENTRATION_OVERRIDE_THRESHOLD_PCT`.

Re-ran `runOnce()`: **5 of 5 held symbols generated a real `REDUCE` recommendation**, via the pre-existing concentration-override rule (`autonomousRecommendationEngine.js:467`), not the conviction-score path. No threshold, no logic, no code was changed to make this happen — this rule already existed and was simply reached for the first time this phase.

## Step 3 — DecisionTrace / Attribution Verification (all 5, verified live)

| Recommendation | DecisionTrace | Unified committee `{committee, cio}` | Evidence snapshot | Regime snapshot | Provider attribution |
|---|---|---|---|---|---|
| AAPL REDUCE `062de653-2517-4208-af50-8f07c879b325` | ✅ `716ccc00-...` | ✅ | ✅ 10 categories | ✅ `MIXED_UNKNOWN` (real, from 63 real SPY bars) | ✅ (TECHNICAL, SOCIAL, OPTIONS, ANALYSTS, SENTIMENT non-UNAVAILABLE) |
| MSFT REDUCE `c360ab22-bd74-4980-833d-b2f8d42a7965` | ✅ `3f782d94-...` | ✅ | ✅ 10 categories | ✅ `MIXED_UNKNOWN` | ✅ |
| NVDA REDUCE `3f2226b0-55ec-460a-84a5-5ade5f4acfa3` | ✅ `7ecde8d9-...` | ✅ | ✅ 10 categories | ✅ `MIXED_UNKNOWN` | ✅ |
| GOOGL REDUCE `5ed86883-581a-447c-afb5-998131dea599` | ✅ `b2942a40-...` | ✅ | ✅ 10 categories | ✅ `MIXED_UNKNOWN` | ✅ |
| AVGO REDUCE `4af6ae88-b09c-4147-926e-48d3bb6d311b` | ✅ `10450dc9-...` | ✅ | ✅ 10 categories | ✅ `MIXED_UNKNOWN` | ✅ |

**All 5 recommendations pass every attribution check.** This is the first time in D1–D1.8 that a live-generated `DecisionTrace` carries the unified Sprint-41 committee shape (all 279 pre-existing rows carry the legacy shape, per D1.5's correction) — direct proof the pipeline is currently producing eligible-for-READY data going forward, unlike the historical backlog.

The regime snapshot is real and honestly computed (`MIXED_UNKNOWN`, not `UNKNOWN`) — 63 real SPY daily bars were available this time (vs. 0 in earlier D1 test runs), consistent with real, working Yahoo Finance access.

## Step 4 — Grading Window

Not bypassed. `outcomeGradingService`'s `GRADING_WINDOW_MS` (24h, hardcoded, unmodified) means these 5 predictions are not eligible for grading until **2026-07-24**, exactly 24 hours after each was created. See `GRADING_FOLLOWUP_CHECKLIST.md` for exact IDs and timestamps.

## Step 5 — Validator Run (after every completed stage)

Ran `datasetValidatorService.validateRecommendation(id)` live on all 5 immediately after creation:

```
AAPL  -> UNKNOWN — "Grading is still pending — not yet determinable, not a defect."
MSFT  -> UNKNOWN — same
NVDA  -> UNKNOWN — same
GOOGL -> UNKNOWN — same
AVGO  -> UNKNOWN — same
```

This is the **correct, expected result** per `DATASET_VALIDATION_SPEC.md`'s own rule (step 3a: grading window not elapsed → `UNKNOWN`). It is not a failure — it is the validator correctly refusing to guess.

## Verdict: **WAITING FOR GRADING WINDOW**

Five real, fully-attributed, unified-committee, non-fabricated recommendations exist and are structurally eligible to become the pipeline's first READY observations — pending only the unavoidable, unmodified 24-hour real-time wait. No CONTAMINATED or INVALID result occurred at any stage reached so far.
