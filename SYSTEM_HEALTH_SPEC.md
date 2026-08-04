# System Health Spec — Phase X6, Part 4 & 5

## Observability (Part 5)

`backend/services/systemHealthService.js` checks nine real, critical modules and reports each as exactly one of four statuses — never a raw stack trace, never a fifth ad-hoc status string:

| Status | Meaning |
|---|---|
| `HEALTHY` | The real check succeeded and returned a real, expected result. |
| `WARNING` | The check succeeded but returned a degraded result (e.g. a live quote with no real price). |
| `UNAVAILABLE` | The check itself failed (an exception was thrown). |
| `UNKNOWN` | The module's dependency isn't configured in this environment (e.g. no API key) — genuinely different from "broken": nothing is wrong, there's just nothing to check. |

Every check is wrapped in `timedCheck()`, which always returns a real `latencyMs` and never lets a raw error/stack trace escape into the `detail` field — a caught exception becomes the fixed string `"Check failed unexpectedly."`, with the real error going to the server's own log (not the response body).

### The nine modules

| Module | Real check |
|---|---|
| `backend` | `SELECT 1` against the real Postgres connection |
| `identity` | `BetaUser` table count |
| `marketData` | Live Finnhub quote for AAPL (or `UNKNOWN` if `FINNHUB_API_KEY` unset) |
| `news` | `NEWS_API_KEY` configuration presence |
| `ai` | `OPENAI_API_KEY` configuration presence |
| `chart` | Same Finnhub dependency as `marketData`, checked separately since chart rendering is its own named area in the mission |
| `notifications` | `Notification` table count |
| `decisionCenter` | `DecisionState` table count |
| `impactGraph` | `WorldMemoryRecord` table count |

`chart`/`notifications`/`decisionCenter`/`impactGraph` are checked individually rather than aliased to `backend` — a real per-table issue (e.g. a bad migration touching one model) shows up against the specific module, not hidden inside a generic "backend" entry.

`overall` is derived by severity: any `UNAVAILABLE` module makes the whole system `UNAVAILABLE`; otherwise any `WARNING` makes it `WARNING`; otherwise any `UNKNOWN` makes it `UNKNOWN`; only all-`HEALTHY` reports `HEALTHY`.

**Route:** `GET /api/v2/system-health` — no auth gate (same precedent as `/v2/quality-dashboard`), since nothing in the response is sensitive; visibility is controlled entirely on the frontend (below).

## Health Dashboard (Part 4)

`frontend/src/screens/HealthDashboardScreen.jsx` — a read-only internal diagnostics screen showing:

- **Frontend status**: always `HEALTHY` (if you're reading it, it rendered) plus the real `STARTUP_VALIDATION_RESULT` from `startupValidation.js` (Part 1) — any real issue found at boot is listed here by area and message.
- **Backend status**: all nine modules above, each as a status pill with its real latency in milliseconds, plus a detail line for any module that isn't `HEALTHY`.
- **Last sync**: the real timestamp of the last successful fetch from `/api/v2/system-health`, shown in the section subtitle.
- **API latency**: the real per-module `latencyMs` from the backend response — no separate round-trip measurement needed, since the backend already times each check.

**Visible only in Beta**, per the mission — implemented via the same `VITE_DEV_CONSOLE=true` gate `IntelligenceConsoleScreen` already established: the screen exists in the bundle but has no nav entry and `activeView` can never equal `"Health Dashboard"` unless the flag is set. This is a deliberate interpretation: the mission calls this an "internal diagnostics screen," which is exactly what `Intelligence Console`/`Quality Dashboard` already are in this codebase — for the founder/operator, not the investor-facing product — so it follows their exact precedent rather than inventing a new gating mechanism.

Retrying a failed fetch is real: `ErrorState`'s `onRetry` (Part 3) is wired to the same `load()` function the initial fetch uses.

## Testing

- `systemHealthService.test.js` (4 tests): all nine modules present with valid statuses and real latencies; backend/identity are real `HEALTHY` against the real test database; no module detail ever contains stack-trace-shaped text; `overall` derivation is correct.
- `systemHealth.integration.test.js` (1 test, real HTTP via supertest): the route returns all nine modules.
- `HealthDashboardScreen.test.jsx` (4 tests): real per-module rendering, real detail line for a non-healthy module, real startup-validation status display, and a working retry action after a fetch failure.
