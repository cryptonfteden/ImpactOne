# 17 — Deployment

## Build and run

Node.js 20+ and PostgreSQL are required. Install root and frontend dependencies, generate Prisma client, apply migrations, build the Vite frontend, and start `backend/server.js`. Development defaults are ports 5000 and 5173.

## Health contract

- `GET /health`: basic process response.
- `GET /health/live`: liveness.
- `GET /health/ready`: dependency readiness.
- Graceful SIGTERM/SIGINT shutdown is bounded by `SHUTDOWN_TIMEOUT_MS`.

## CI

GitHub Actions runs on all pushes and pull requests. Jobs include full-history Gitleaks scanning; backend install, Prisma generation, test database deployment and 394-test-file suite against PostgreSQL 16; frontend install, Vitest suite and production build.

## Environment

Required: `DATABASE_URL`; production authentication also requires a real JWT secret. Optional integrations include OpenAI, Finnhub, Polygon, News API, Alpha Vantage, SEC user agent, Redis, Stripe, and options flow. Frontend config includes API base URL, portfolio-engine mode, and internal-console gate.

## Deployment gap

Historical docs discuss Render, but no active Render manifest, Dockerfile, Terraform, or equivalent infrastructure-as-code was found. Therefore hosting topology, frontend static-site configuration, database backups, domains/TLS, scaling, cron leadership, log drains, and monitoring alerts are not code-grounded.
