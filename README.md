# ImpactOne
AI-powered global news and market intelligence platform

## Documentation

Use the [documentation portal](docs/README.md) to browse current product, architecture, engineering, design, methodology, operations, and planning documents. Historical audits, sprint records, and release evidence are kept under `docs/archive/`.

## Quick start (clean clone)

Prerequisites: Node.js 20+, a running Postgres instance.

```
git clone <this repository>
cd ImpactOne

# 1. Install both the backend (root) and frontend dependency trees
npm install
cd frontend && npm install && cd ..

# 2. Generate the Prisma client — REQUIRED before the backend can load.
#    npm install alone does not do this; skipping this step causes an
#    immediate "Cannot find module '.prisma/client/default'" crash.
npm run db:generate

# 3. Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# then edit backend/.env — DATABASE_URL is required, everything else has
# a safe default. See ENVIRONMENT_SETUP.md for the full reference.

# 4. Apply the database schema
npm run db:deploy

# 5. Run it
npm run dev   # starts backend (:5000) and frontend (:5173) together
```

Verify the backend booted correctly: `curl http://localhost:5000/health/ready` should return `{"status":"ready",...}`.

See [ENVIRONMENT_SETUP.md](docs/operations/ENVIRONMENT_SETUP.md) for the full environment-variable reference and production process-management guidance, and [PRODUCTION_DEPLOYMENT.md](docs/operations/PRODUCTION_DEPLOYMENT.md) for the health/readiness/shutdown contract.

## Running tests

```
npm run test:backend    # backend/**/*.test.js via node --test
npm run test:frontend   # frontend Vitest suite
npm run build           # production frontend build (cd frontend && npm run build)
```
