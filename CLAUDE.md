# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ImpactOne is an AI-powered global news and market intelligence platform. Full docs portal: `docs/README.md`.

## Setup

Requires Node 20+ and Postgres.

```
npm install                 # root (backend deps live at root, not in backend/)
cd frontend && npm install  # frontend is a separate npm package
npm run db:generate         # required — not run automatically by npm install
# copy .env.example -> .env in both backend/ and frontend/
npm run db:deploy
npm run dev                 # backend :5000 + frontend :5173
```

Health check: `curl http://localhost:5000/health/ready`

## Common commands

Run from repo root unless noted.

```
npm run dev              # backend + frontend concurrently (ports 5000 / 5173)
npm run server           # backend only (node backend/server.js)
npm run client           # frontend only (cd frontend && vite dev)

npm run build            # frontend production build (cd frontend && vite build)

npm run db:generate      # prisma generate
npm run db:migrate       # prisma migrate dev
npm run db:deploy        # prisma migrate deploy
npm run db:studio        # prisma studio
npm run db:deploy:test   # node backend/prisma/deployTestDb.js — used by CI before backend tests

npm run test:backend     # node --test --test-concurrency=1 backend/**/*.test.js
npm run test:frontend    # cd frontend && vitest run
npm test                 # backend then frontend
```

To run a single backend test file: `node --test backend/path/to/file.test.js`
To run a single frontend test file: `cd frontend && npx vitest run src/path/to/file.test.jsx`

There is no lint/format tooling configured in this repo (no ESLint/Prettier config, no lint script).

### Release/seed/perf scripts (backend)

- `node backend/scripts/releaseValidation.js` — pre-merge validation gate
- `node backend/scripts/seedBetaUsers.js`, `node backend/scripts/seedPlans.js` — one-off DB seeds
- `node backend/scripts/x5PerformanceCheck.js`, `x6PerformanceBaseline.js` — perf checks via supertest

### RC / manual E2E checks (Playwright, ad hoc — no playwright.config)

`scripts/rc/rcHumanFlow.js`, `rcReturningSession.js`, `rcScreenCheck.js`, `rcSidePanelCheck.js`, `rcStorageClear.js` — drive a real running server through onboarding, Today, Decision Center, Portfolio, Market Dashboard, Workspace, Stock Side Panel, AI Analysis, Notifications, Impact Graph.

## Architecture

Two-tree layout, not a formal monorepo (no workspaces/turborepo/nx): root `package.json` holds backend dependencies directly and backend code lives at `backend/`; `frontend/` is a fully separate npm package invoked via `cd frontend && ...`.

### Backend (`backend/`)

Plain Node.js + Express (entry: `backend/server.js` → `backend/app.js`), Prisma ORM (`@prisma/client` + `@prisma/adapter-pg`) against Postgres. Schema at `backend/prisma/schema.prisma`; migrations in `backend/prisma/migrations`. Schema/database config driven by `prisma.config.ts` at repo root (reads `backend/.env`, `DATABASE_URL`).

Top-level dirs: `config`, `controllers`, `data`, `db`, `middleware`, `prisma`, `routes`, `scripts`, `services`, `test`, `utils`. Tests are colocated `*.test.js` files run via Node's built-in test runner.

`services/` is the domain core and the most important directory to understand before making changes — it's organized by capability, not by layer:
- **Intelligence pipeline**: `intelligence`, `intelligenceBus`, `intelligenceCommittee`, `unifiedStockIntelligence`, `claimIntelligence`, `providers`
- **Agents**: `agentOrchestrator`, `agentScheduler`, `agentClaimBridge`, `agentObservability`, `domainAgents`, `optionsAgent`
- **Market signal / scoring**: `marketSentiment`, `attentionEngine`, `outcomeCalibration`, `explainability`
- **Product surfaces**: `morningBrief`, `qualityPlatform`, `billing`
- **Infra**: `redisCache`

Prisma models (~65) cluster into: watchlist/portfolio/trading (Portfolio, Position, Order, Trade, PriceAlert...), user/account (User, Session, Plan, Subscription...), recommendations/decisions (Recommendation, DecisionState, DecisionTrace, AutonomousRunLog...), "world memory" market intelligence (CanonicalEvent, WorldMemoryRecord, WorldMemoryCausalLink, WorldMemoryPrediction, ThemeConfidenceSnapshot...), scoring/methodology (MethodologyVersion, ScoringAdjustmentAudit, TradingPrinciple...), options/sentiment (OptionsFlowPrint, OptionsSignal, MarketSentimentSnapshot), claims/intelligence bus (Claim, ClaimEvidence, ClaimTransition, IntelligenceBusEvent), and analytics/ops (AnalyticsEvent, Feedback, ErrorReport, FeatureFlag).

### Frontend (`frontend/`)

React 19 + Vite. Uses `@react-three/fiber`/`@react-three/drei`/`three` for 3D visualization. Test stack: Vitest + Testing Library + jsdom (`frontend/vitest.config.js`, `frontend/vitest.setup.js`).

`frontend/src/` dirs: `assets, components, config, context, features, hooks, i18n, layout, pages, screens, services, styles, utils`.

## Documentation

`docs/` is large and organized by lifecycle/category:
- `docs/architecture/` — subsystem specs (agent platform, claim intelligence, learning, options agent, scenario engine, world state); main doc `docs/architecture.md`
- `docs/design/` — visual/UX/design-system specs
- `docs/engineering/` — API contracts, test plan, feature flags, performance, data quality
- `docs/methodologies/` — scoring methodology per signal type (insider, macro, sentiment, technical, valuation)
- `docs/operations/` — `PRODUCTION_DEPLOYMENT.md`, `ENVIRONMENT_SETUP.md`, `DEPLOYMENT_CHECKLIST.md`, `OPERATIONS_RUNBOOK.md`, `KEY_ROTATION_RUNBOOK.md`, `SECRET_EXPOSURE_REGISTER.md`
- `docs/planning/` — roadmaps, backlogs, risk registers
- `docs/product/` — per-feature/agent product specs, `VISION.md`, `PROJECT_STATUS.md`
- `docs/archive/` — historical audits, releases, sprints

## CI (`.github/workflows/ci.yml`)

Three jobs on every push/PR:
- `secret-scan` — full-history checkout + `gitleaks/gitleaks-action@v2` (config: `.gitleaks.toml`)
- `backend` — Postgres 16 service container, then `npm install`, `npm run db:generate`, `npm run db:deploy:test`, `npm run test:backend`
- `frontend` — `npm install`, `npm run test`, `npm run build` (in `frontend/`)

## Secret scanning

`.gitleaks.toml` extends gitleaks' default ruleset and allowlists two specific historical commits containing an already-rotated secret (documented in `docs/operations/SECRET_EXPOSURE_REGISTER.md`) — do not add further allowlist entries without equivalent documentation.

A pre-commit hook at `.githooks/pre-commit` (dependency-free bash, scans only the staged diff for API keys/AWS keys/private keys/DB URLs with passwords/secret env assignments) is available but not installed by default — enable with `git config core.hooksPath .githooks`.
