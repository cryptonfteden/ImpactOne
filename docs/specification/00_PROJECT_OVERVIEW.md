# 00 — Project Overview

## Executive summary

ImpactOne is a full-stack market-intelligence and investor decision-support platform. It combines live and alternative data providers, specialized analysis agents, a committee/orchestration layer, portfolio and recommendation engines, explainability, claims and outcome tracking, personalization, beta operations, and commercial account infrastructure.

## Verified stack

- Frontend: React 19, Vite 8, Vitest, React Testing Library, Three.js, React Three Fiber/Drei.
- Backend: Node.js 20+, Express 4, CommonJS modules.
- Data: PostgreSQL through Prisma 7 and the `pg` adapter; 29 migration directories.
- Optional infrastructure: Redis provider cache; Stripe billing provider; OpenAI and numerous market/news providers.
- Automation: four startup schedulers and GitHub Actions CI.

## Repository shape

`backend/` contains 71 controller files, 59 route modules, approximately 450 non-test service files, middleware, Prisma schema/migrations, and 394 test files. `frontend/src/` contains the app shell, contexts, 29 feature directories, reusable components, styles, services, hooks, and 77 test files. `docs/` contains 738 first-party Markdown files across architecture, product, design, engineering, methodologies, operations, planning, and archive categories.

## Current status

The codebase is beyond the early MVP described by `docs/product/PROJECT_STATUS.md`. Implemented domains include authentication, billing abstractions, server-owned portfolios, recommendations, themes, claims, options signals, market sentiment, intelligence bus, personalized workspaces, watchlists, notifications, analytics, governance, quality dashboards, and extensive internal tooling. Production readiness cannot be certified from static inspection alone: live provider credentials, database state, deployment configuration, and end-to-end production behavior were not available.

## Authority order

1. Executable source and Prisma schema.
2. Package manifests, CI, environment examples, and migrations.
3. Current architecture/operations documentation.
4. Archived audits and sprint reports.

## Principal gaps

- No infrastructure-as-code or active hosting manifest was found.
- The main archive includes committed dependency trees, inflating repository size and audit noise.
- Several documents represent plans or prior phases and conflict with current code.
- No evidence from this static audit proves production deployment health, data quality, or paid billing behavior.
