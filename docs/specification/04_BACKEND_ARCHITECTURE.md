# 04 — Backend Architecture

## Request lifecycle

Security headers → request logging → rate limiting → CORS → JSON parsing → beta identity context → latency metrics → `/api` or `/health` routing → centralized error handler.

## Layers

- Routes define paths and selectively apply `requireAuth` or `requireApiKey`.
- Controllers validate/extract request inputs and map service results to HTTP responses.
- Services contain domain logic. Major clusters cover recommendations, portfolio, market intelligence, agents, committee reasoning, claims, outcomes, personalization, providers, quality, billing, and operations.
- Repositories encapsulate Prisma persistence for portfolios, users/sessions, plans/subscriptions, claims, events, recommendations, alerts, analytics, and related ledgers.
- Provider modules normalize Finnhub, Polygon, Alpha Vantage, SEC, FRED, CFTC, FINRA, social, news, macro, options, analyst, and other sources.

## Notable engines

- `autonomousRecommendationEngine`
- `agentOrchestrator` and `committeeCoordinator`
- `unifiedStockIntelligenceEngine`
- `intelligenceBusService`
- claim formation, lifecycle, resolution, and confidence services
- scenario, propagation, historical similarity, world memory, outcome feedback
- market sentiment, options, technical, valuation, macro, news, ownership, short-interest agents

## Operational composition

`server.js` starts schedulers only after successful environment validation. Autonomous recommendations are flag-controlled; theme, provider, and alert schedulers start unconditionally but must tolerate missing optional integrations. Shutdown stops listeners and schedulers, disconnects Prisma and Redis, and enforces a timeout.

## Backend risks

- Approximately 450 service files create discoverability and ownership challenges.
- Authentication is not visibly global; protection must be verified route-by-route.
- Optional empty `ADMIN_API_KEY` and allow-all CORS behavior are appropriate only for development.
- In-memory diagnostics/log stores may not survive restarts unless backed by durable repositories.
