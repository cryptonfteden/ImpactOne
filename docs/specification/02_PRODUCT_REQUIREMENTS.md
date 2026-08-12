# 02 — Product Requirements

## Core functional requirements

| Domain | Verified behavior | Required quality condition |
|---|---|---|
| Home and morning brief | Aggregated daily intelligence, archive, priority items | Disclose freshness and missing inputs |
| AI analysis | Symbol analysis through GET/POST APIs and workspace UI | Preserve evidence, confidence, errors |
| Recommendations | List, detail, run, view, feedback, review, decision trace | Every action traceable to methodology and evidence |
| Portfolio | Legacy local mode plus optional server-owned portfolio engine | Avoid mixing legacy and API state silently |
| Watchlists | Basic watchlist, folders, item flags | Isolate data by resolved user identity |
| Alerts and notifications | Price-alert lifecycle and notification inbox | Idempotent evaluation and clear status |
| Themes and market positioning | Confidence snapshots, sentiment, charts, opportunity scores | Show as-of timestamps and provider coverage |
| Intelligence | Overview, feed, changes, scenarios, impact, history, global map | Normalize contracts across engines |
| Claims | Active/contested/resolved claims, evidence and history | Separate fact, inference, probability, confidence |
| Workspaces | Notes and multiple focused workspaces | Persist user-owned state safely |
| Authentication | Register, login, logout, current user | Production JWT secret and revocable sessions |
| Commercial | Plans, account upgrade/cancel, provider abstraction, webhooks | Verify webhook signatures; enforce entitlements |
| Operations | Health, diagnostics, dashboards, feedback/error reports | Internal/admin surfaces must be access-controlled |

## Non-functional requirements observed in code

- Node.js 20+ and PostgreSQL are baseline runtime dependencies.
- API JSON bodies are capped at 1 MB.
- Startup validates configuration; shutdown is bounded and graceful.
- Global middleware provides headers, logging, rate limiting, CORS, beta context, latency metrics, and centralized errors.
- CI runs secret scanning, database-backed backend tests, frontend tests, and a production build.
- Three-dimensional screens are lazy-loaded to contain bundle cost.

## Acceptance caveat

Presence in source establishes implementation intent, not production acceptance. Provider-backed flows, schedulers, authentication, billing, migration safety, PWA installation, and mobile UX still require environment-specific verification.
