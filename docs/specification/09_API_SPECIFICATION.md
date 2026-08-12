# 09 — API Specification

## Base and conventions

Default development base: `http://localhost:5000/api`. JSON requests are limited to 1 MB. Errors flow through a centralized handler. `/health`, `/health/live`, and `/health/ready` sit outside the `/api` prefix.

## Legacy/core endpoints

`GET /api/news`, `/watchlist`, `/market`, `/quote`, `/compare`, `/portfolio`; `GET|POST /api/ai/analyze`; alternative-data routes for COT, Polymarket, macro, SEC, Congress, events and summary; `/api/v2/home-summary`; `/api/chat/ask`.

## V2 route groups

| Prefix | Purpose |
|---|---|
| `/v2/auth`, `/billing`, `/account` | Identity, plans/provider/webhook, subscription account |
| `/v2/portfolio`, `/recommendations` | Server portfolio and autonomous recommendations |
| `/v2/investor-profile`, `/personalization`, `/user-learning`, `/investor-memory` | Personal intelligence |
| `/v2/themes`, `/market`, `/market-intelligence`, `/market-sentiment` | Market state and positioning |
| `/v2/committee-intelligence`, `/agent-orchestrator`, `/agent-observability`, `/agent-diagnostics` | Multi-agent execution |
| `/v2/claims`, `/options-agent`, `/unified-stock-intelligence`, `/symbol-intelligence` | Intelligence products |
| `/v2/explainability`, `/explainability-insights`, `/outcome-feedback`, `/lessons` | Trust and learning |
| `/v2/watchlist-folders`, `/price-alerts`, `/notifications`, `/workspaces` | User workflow state |
| `/v2/decisions`, `/decision-timeline`, `/impact-graph`, `/morning-brief` | Decision experience |
| `/v2/quality-*`, `/recommendation-quality`, `/calibration-*`, `/methodology-versions` | Quality governance |
| `/v2/system-health`, `/executive-dashboard`, `/admin-dashboard`, `/beta-metrics`, `/performance-metrics` | Operations |
| `/v2/analytics`, `/feedback`, `/error-reports`, `/feature-flags`, `/beta` | Telemetry and beta operations |

## Detailed examples

- Auth: `POST register`, `POST login`, `POST logout`, `GET me` (the latter requires auth).
- Recommendations: list/status/detail/run, decision trace, feedback, view, review.
- Claims: active, contested, invalidated, resolved, portfolio-relevant, overnight changes, symbol view, history, strongest evidence.
- Health: liveness proves process response; readiness verifies required dependencies.

## Security note

`/v2/admin-dashboard` is explicitly API-key protected. Authentication is otherwise applied selectively inside route modules. A generated OpenAPI contract was not found; request/response schemas and status codes therefore require route/controller inspection and should be formalized.
