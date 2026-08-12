# 03 — System Architecture

## Runtime topology

```text
React/Vite client
  -> /api HTTP boundary
  -> Express global middleware
  -> route modules
  -> controllers
  -> domain/orchestration services
  -> repositories / provider adapters / caches
  -> PostgreSQL / Redis / external APIs / OpenAI
```

The backend also runs autonomous, theme-snapshot, provider-ingestion, and alert schedulers. Intelligence sources can publish standardized events to the Intelligence Bus; canonical events and claims then support committee reasoning, recommendations, briefs, explanations, outcomes, and personalized presentation.

## Major boundaries

- `backend/app.js`: HTTP composition and middleware order.
- `backend/server.js`: environment validation, listener, schedulers, graceful shutdown.
- `backend/routes/index.js`: public API composition under `/api`.
- `backend/controllers/`: transport-level request/response coordination.
- `backend/services/`: business logic, providers, agents, orchestration, governance.
- `backend/prisma/schema.prisma`: durable domain model.
- `frontend/src/AppRoot.jsx` and layout modules: client entry and navigation.
- `frontend/src/layout/screenRegistry.js`: canonical screen-to-feature mapping.

## Architectural characteristics

- Modular monolith, not microservices.
- Many service modules and specialized engines share one process and one primary database.
- Provider and billing abstractions reduce external-vendor coupling.
- Event, claim, provenance, methodology, and outcome models provide auditability.
- Transitional duplication exists: legacy and v2 APIs, legacy and server portfolios, beta identity and commercial users.
