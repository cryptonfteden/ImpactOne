# Unusual Options Agent — API Contract (Phase AI-ENGINE-001)

**Status:** Architecture only — no route, controller, or service described below has been implemented. This defines the contract new code would need to satisfy, in the same documentation style as `API_CONTRACTS.md`.

## 1. Contract rules (inherited from `API_CONTRACTS.md`)

- Mounted under `/api/v2/options-agent/*`, alongside the platform's other v2, betaUser-aware surfaces (`/api/v2/recommendations`, `/api/v2/providers`, etc.) — not under the legacy unversioned `/api/*` namespace.
- Every endpoint below that reads **market-wide** data (a symbol's signals) requires **no** beta user identity — options signals are not personal data, matching `CanonicalEvent`'s existing no-`betaUserId` precedent.
- Every endpoint that reads **portfolio-relative** data (e.g. "signals on symbols I hold") requires a beta user identity via the existing `X-Beta-User-Id`-header middleware (`betaUserContext.js`), and returns `400` with a clear message when absent — same convention as `workspaceService.requireBetaUser()`.
- Rollout is gated behind a new `FeatureFlag` row (`key: "options-agent"`), reusing the existing `FeatureFlag` model (`mode`: `DISABLED` / `ENABLED` / `USER_SPECIFIC`, `enabledForUsers: String[]`) rather than a new ad-hoc env var — consistent with `featureFlagService.js` (Phase X9).
- Until a real vendor is connected (see `OPTIONS_AGENT_ARCHITECTURE.md` §3/§12), every endpoint below returns `200` with an honest `{ status: "not_connected", provider: "pending" }` payload (same shape as `altDataService.buildOptionsPlaceholder()` today) rather than a `404`/`501` — consistent with this codebase's "degrade honestly within a 200, never a broken-looking error for an intentionally-unbuilt feature" convention (see `MarketPositioningScreen.jsx`'s `unavailableFactors` handling for precedent).

## 2. Endpoint index

### Read — market-wide (no beta user identity required)

- `GET /api/v2/options-agent/status`
- `GET /api/v2/options-agent/signals`
- `GET /api/v2/options-agent/signals/:signalId`
- `GET /api/v2/options-agent/symbols/:symbol`
- `GET /api/v2/options-agent/symbols/:symbol/history`

### Read — portfolio/workspace-relative (beta user identity required)

- `GET /api/v2/options-agent/portfolio-relevant`
- `GET /api/v2/options-agent/workspaces/:folderId`

### Internal / operational (dev-console gated, same pattern as `/api/v2/providers/:providerId/run`)

- `GET /api/v2/options-agent/providers/health`
- `POST /api/v2/options-agent/ingest/run` *(manual trigger, mirrors `POST /api/v2/providers/:providerId/run`)*
- `POST /api/v2/options-agent/oi-confirmation/run` *(manual trigger for the daily OI-reconciliation job)*

---

## 3. Endpoint detail

### `GET /api/v2/options-agent/status`

Health/configuration status — always safe to call, never requires identity, mirrors `GET /api/v2/providers/:providerId/health`.

```json
{
  "connected": false,
  "provider": "pending",
  "message": "Options flow provider is not connected yet.",
  "trackedSymbolCount": 0,
  "lastIngestionRunAt": null,
  "lastOiConfirmationRunAt": null
}
```

Once connected:

```json
{
  "connected": true,
  "provider": "vendor-name-tbd",
  "message": null,
  "trackedSymbolCount": 42,
  "lastIngestionRunAt": "2026-07-25T19:45:00.000Z",
  "lastOiConfirmationRunAt": "2026-07-25T05:10:00.000Z",
  "baselineBootstrap": { "inProgress": false, "sessionsCollected": 24, "sessionsRequired": 20 }
}
```

`baselineBootstrap` is surfaced explicitly (not hidden) so the frontend can honestly say "still building a baseline" instead of silently returning empty results, per the architecture doc's §5a/§12 disclosure.

### `GET /api/v2/options-agent/signals`

The market-wide feed of recent signals, across the tracked universe (no `betaUserId`).

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `since` | ISO timestamp | last 24h | |
| `symbol` | string | — | filter to one symbol |
| `signalType` | `VOLUME_SPIKE`\|`SWEEP`\|`BLOCK_TRADE`\|`CALL_PUT_SKEW` | — | filter to one primary classification |
| `minAnomalyScore` | number 0–100 | `0` | |
| `limit` | int | `50` | max `200` |

**Response:**

```json
{
  "generatedAt": "2026-07-25T20:00:00.000Z",
  "count": 2,
  "signals": [
    {
      "id": "sig_...",
      "symbol": "NVDA",
      "expiry": "2026-08-21",
      "strike": 150,
      "optionType": "CALL",
      "signalType": "SWEEP",
      "detectedAt": "2026-07-25T19:42:11.000Z",
      "aggressorSide": "BUY",
      "totalVolume": 4200,
      "baselineVolume": 500,
      "volumeMultiple": 8.4,
      "notionalValue": 2184000,
      "sweepExchangeCount": 3,
      "largestSinglePrintSize": 1200,
      "openInterestPriorSession": 3100,
      "openInterestDelta": null,
      "oiConfirmationStatus": "PENDING",
      "putCallSkewZScore": 2.1,
      "anomalyScore": 78,
      "explanation": "NVDA Aug-21 $150 calls traded 8.4x their 20-session average volume today ($2.18M notional), with 3 of the largest prints executing as a cross-exchange sweep at the ask — consistent with aggressive, urgent buying. Open interest confirmation is pending until tomorrow's session.",
      "methodologyVersion": "options-agent-v1",
      "label": "Signal — not a recommendation"
    }
  ],
  "unavailableReason": null
}
```

When not yet connected: `{ "generatedAt": "...", "count": 0, "signals": [], "unavailableReason": "Options flow provider is not connected yet." }` — `count`/`signals` are honestly empty, never fabricated placeholder rows.

### `GET /api/v2/options-agent/signals/:signalId`

One full signal, including its `evidenceSnapshot` (the raw aggregated detector inputs that produced it) — the auditability surface, mirroring `GET /api/v2/recommendations/:id/decision-trace`'s existing "show your work" precedent. Returns `404` if the id doesn't exist (a real not-found, distinct from the honest-empty-array case above).

### `GET /api/v2/options-agent/symbols/:symbol`

The canonical, composed per-symbol view — designed to be the same shape `symbolIntelligenceService.getSymbolIntelligence()` would attach as its new `unusualOptionsActivity` field (see architecture §11.5), so this endpoint and that composition path never drift into two different shapes for the same data.

```json
{
  "symbol": "NVDA",
  "generatedAt": "2026-07-25T20:00:00.000Z",
  "activeSignalCount": 1,
  "highestAnomalyScore": 78,
  "recentSignals": [ /* same shape as GET /signals entries, this symbol only */ ],
  "unavailable": false,
  "reason": null
}
```

### `GET /api/v2/options-agent/symbols/:symbol/history`

Paginated, chronological signal history for one symbol — the data source for a future chart overlay (architecture §11.5) and for `symbolIntelligenceService`'s workspace-history views. Same query params as `GET /signals` minus `symbol` (already in the path), plus `cursor`/`limit` pagination (matching this codebase's existing cursor-style pagination on other high-volume endpoints rather than a new pattern).

### `GET /api/v2/options-agent/portfolio-relevant` *(requires beta user identity)*

Signals on symbols the caller actually holds (`Position`) or tracks (`WatchlistFolderItem`) — never a generic market-wide feed under this path, matching Decision Center's existing "never surfaced for an untracked symbol" design intent (architecture §11.4). `400` with `"A beta user identity is required for portfolio-relevant options signals."` when no identity is present — same error shape/style as `workspaceService.requireBetaUser`/`decisionCenterService.requireBetaUser`.

```json
{
  "generatedAt": "2026-07-25T20:00:00.000Z",
  "heldSymbolSignals": [ { "symbol": "NVDA", "portfolioWeightPct": 8.0, "signal": { /* signal shape */ } } ],
  "trackedSymbolSignals": [ /* same shape, watchlist-folder symbols not currently held */ ]
}
```

### `GET /api/v2/options-agent/workspaces/:folderId` *(requires beta user identity)*

The `optionsActivitySummary` composed field described in architecture §11.2, exposed directly for cases where `workspaceService.getWorkspace()` itself is not the caller (e.g. a future dedicated widget). Ownership-checked the same way `watchlistFolderService.requireOwnedFolder()` already checks every other per-folder read — `404` if the folder doesn't belong to the caller, not a `403` (matching this codebase's existing convention of not confirming another user's folder even exists).

### `GET /api/v2/options-agent/providers/health` *(dev-console gated)*

Thin wrapper around the **existing** `GET /api/v2/providers/optionsFlow/health` (the provider is already registered — see architecture §2) plus this engine's own detector-level health (distinct from raw fetch success, precisely to avoid Sprint 43's already-documented "false success" pattern, where a provider reports 100% success while returning zero real data):

```json
{
  "providerHealth": { "providerId": "optionsFlow", "lastRunAt": "...", "successRate": 100 },
  "detectionHealth": {
    "signalsProducedLast24h": 0,
    "baselineBootstrapInProgress": true,
    "note": "100% provider fetch success does not by itself mean real anomalies are being found — see detectionHealth for the metric that actually matters."
  }
}
```

### `POST /api/v2/options-agent/ingest/run` / `POST /api/v2/options-agent/oi-confirmation/run` *(dev-console gated)*

Manual triggers for the two schedulers in architecture §9, mirroring the existing `POST /api/v2/providers/:providerId/run` manual-trigger precedent. Returns the same run-result shape `providerIngestionService.runProviderIngestion()`/`ProviderRunLog` already produce — no new run-result shape invented.

## 4. Error semantics

| Case | Status | Body |
|---|---|---|
| Vendor not connected | `200` | `{ status: "not_connected", ... }` — never an error, per §1 |
| Unknown `signalId` | `404` | `{ error: "Signal not found." }` |
| Missing beta user identity on a scoped endpoint | `400` | `{ error: "A beta user identity is required for ..." }` |
| Folder not owned by caller | `404` | `{ error: "Workspace not found." }` — never `403`, matching existing convention |
| Feature flag disabled | `404` | Same "as if the route doesn't exist" treatment already used elsewhere for dev-console-gated routes, not a `403` that would confirm the feature's existence |

## 5. Versioning

- `methodologyVersion` (`"options-agent-v1"` initially) is carried on every persisted `OptionsSignal` and echoed in every API response containing one — same discipline as `Outcome.methodologyVersion`/`DecisionTrace.modelVersionMetadata`, so a future change to the confidence formula (§6 of the architecture doc) never silently reinterprets historical signals.
- This is a genuinely new API surface (`/api/v2/options-agent/*`), not an extension of an existing unversioned route — no backward-compatibility constraint applies, unlike the Sprint 18A `committee`→`committeeDebate` rename on the legacy `/api/ai/analyze` endpoint (a cautionary precedent explicitly avoided here by starting versioned from day one).
