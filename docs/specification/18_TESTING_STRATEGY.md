# 18 — Testing Strategy

## Verified suites

- Backend: 394 `*.test.js` files executed serially with Node's built-in test runner; Supertest is available for HTTP tests.
- Frontend: 77 test files using Vitest, jsdom, Testing Library and jest-dom.
- CI provisions PostgreSQL 16, generates Prisma, deploys a test schema, runs backend tests, frontend tests, and a frontend production build.

## Coverage domains observed

Routes/health, schedulers, agents, data providers, normalization, governance, scoring, claims, options, sentiment, recommendation lifecycle, portfolio, quality, components, screens, startup validation, error states, navigation and NOVA primitives.

## Release gates

1. Secret scan succeeds.
2. Prisma generation and migrations succeed on a clean test database.
3. Backend and frontend tests pass.
4. Production frontend build succeeds.
5. Deployment smoke verifies liveness/readiness and critical authenticated flows.
6. Provider-backed contract tests run against controlled fixtures or sandboxes.
7. Mobile/accessibility/visual checks cover core journeys.

## Gaps

No enforced coverage threshold, browser E2E job, visual regression job, load test, dependency audit, migration rollback/restore drill, or production smoke workflow was observed in CI. File counts show breadth, not assertion quality.
