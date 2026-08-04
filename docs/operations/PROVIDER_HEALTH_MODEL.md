# Provider Health Model — ImpactOne

**Phase:** DATA-QUALITY-001. Companion to [DATA_QUALITY_ARCHITECTURE.md](../engineering/DATA_QUALITY_ARCHITECTURE.md). Documentation only. Full design for the Provider Health Score, extending the real, already-tested `providerHealthService.js`/`providerMetricsService.js`/`providerDiagnosticsService.js` layer rather than replacing it.

---

## The central problem this model solves

Confirmed via direct source read this session: `providerHealthService.js`'s real `summarizeRuns()` computes `successRate` purely from `ProviderRunLog.status === "SUCCESS"`. An honest-stub provider (using `honestStubFetch`, the pattern this platform uses for the ~14+ of its 22 registered providers that lack a real, licensed data connection) **returns an empty array successfully, by design** — meaning it reports `SUCCESS` on every run, achieving a perfect 100% `successRate`, while never delivering a single real piece of data. This is not a bug — `honestStubFetch` is deliberately, honestly designed this way — but it means **`successRate` alone cannot answer "is this provider actually useful," only "did this provider's call complete without throwing."**

---

## Design: three components, two of which already exist

### 1. Uptime Component (reused unchanged from `providerHealthService.js`)
The existing real `successRate` (last 10 runs) — this component is not redesigned, only relabeled as one of three inputs rather than the sole health signal.

### 2. Data Yield Component (new — the fix)
The fraction of a provider's recent runs where `providerMetricsService.js`'s real, already-tracked `totalItemsFetched` (or an equivalent per-run item count, if not already broken out per-run) was genuinely non-zero. **This single new component is what separates a real provider from an honest stub** — a stub scores 0 here regardless of its perfect uptime; a real, working provider scores high here even during a period with a temporary genuine 0-items run (e.g., a quiet news day for a real news provider), since it is computed as a *rate over recent runs*, not an instantaneous pass/fail.

### 3. Freshness Component (reused, lightly extended)
`providerMetricsService.js`'s real `lastSuccessAt` field, converted to a 0-100 recency score using the same decay-curve shape already established platform-wide (`autonomousMarketService.recencyScore()`'s 100-at-6h-decaying-to-a-floor-by-168h pattern) — reused, not reinvented, consistent with `UNIFIED_CONFIDENCE_ARCHITECTURE.md`'s own "reuse the already-real `recencyScore()` function" recommendation.

## Formula

```
ProviderHealthScore = uptimeComponent * 0.40 + dataYieldComponent * 0.40 + freshnessComponent * 0.20
```

- **Uptime and Data Yield are weighted equally** — deliberately, since this model's whole purpose is preventing uptime from dominating the picture the way it currently does alone.
- **Freshness is weighted lowest** — a provider that is currently stale but has a strong recent track record of real data delivery is a materially better provider than one with perfect uptime and zero real data, even if the freshness score is temporarily low (e.g., between scheduled release windows for a monthly-cadence government data source).

## Explicit status categories (for dashboard/alerting use, not a new numeric score)

| Category | Condition | Meaning |
|---|---|---|
| **REAL_AND_HEALTHY** | Data Yield Component ≥ 60 AND Uptime ≥ 80 | A genuinely working, data-delivering provider |
| **REAL_BUT_DEGRADED** | Data Yield Component ≥ 60 AND Uptime < 80 | A real provider currently experiencing reliability issues — the priority incident category |
| **HONEST_STUB** | Data Yield Component < 10 AND Uptime ≥ 95 | The expected, correct signature of an intentionally-unconfigured `honestStubFetch` provider — **not an incident**, must be excluded from alerting entirely (see `DATA_QUALITY_OPERATIONS.md`) |
| **SILENTLY_FAILING** | Data Yield Component < 10 AND Uptime < 95 | A real provider that has stopped delivering data AND is also failing outright — the most urgent incident category, since this combination cannot be an honest stub (stubs never fail, they honestly succeed-empty) |

**The `HONEST_STUB` vs. `SILENTLY_FAILING` distinction is the single most operationally important output of this whole model** — without it, an operator monitoring provider health today has no automated way to distinguish "this is a provider we haven't configured yet, working as intended" from "this is a provider we thought was configured, quietly broken."

## Reuse, not redesign

This model adds **zero new persistence** — every input (`successRate`, `totalItemsFetched`, `lastSuccessAt`) already exists in `ProviderRunLog`/`providerMetricsService.js`. The Provider Health Score is a pure, read-only computation layered on top of already-real, already-tested data, exactly matching this platform's own established convention (`providerDiagnosticsService.js`'s own header comment: *"Reuses validateProviderShape... and the SAME limiter instance... never a fresh one — so the reported budget is real, not a simulation"*).

## Recommended per-provider dashboard row (see `DATA_QUALITY_OPERATIONS.md` for the full dashboard design)

`providerId | label | category (REAL_AND_HEALTHY/REAL_BUT_DEGRADED/HONEST_STUB/SILENTLY_FAILING) | ProviderHealthScore | uptimeComponent | dataYieldComponent | freshnessComponent | lastSuccessAt`
