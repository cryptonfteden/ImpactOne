# 21 — Decisions Log

These decisions are recovered from executable structure and schema comments. Dates and authors should be backfilled from Git history before this becomes a formal ADR ledger.

| ID | Decision | Evidence and consequence |
|---|---|---|
| D-001 | Use a Node/Express modular monolith | One process composes all routes, engines and schedulers; simple deployment, growing module count |
| D-002 | Use PostgreSQL and Prisma | Durable financial/event ledgers, typed migrations and Decimal fields |
| D-003 | Normalize providers behind adapters | Registries, factories and contracts permit fallback and substitution |
| D-004 | Separate routes, controllers, services and repositories | Transport, business logic and persistence have distinct modules |
| D-005 | Introduce canonical events and an Intelligence Bus | Engines publish normalized, deduplicated evidence for shared consumption |
| D-006 | Make claims the canonical reasoning object | Claims separate evidence, lifecycle, probability, confidence, uncertainty and outcome |
| D-007 | Prefer append-oriented audit ledgers | Evidence, transitions, outcomes and snapshots preserve history; some enforcement is conventional |
| D-008 | Keep beta identity separate from commercial users | Invite-code context coexists with credentialed User/Session models |
| D-009 | Keep billing provider-neutral | Plans and entitlements are internal; manual and Stripe providers implement an interface |
| D-010 | Retain a portfolio migration flag | `VITE_PORTFOLIO_ENGINE` allows legacy or API behavior, creating transitional duplication |
| D-011 | Use app-state navigation instead of React Router | Simple registry-driven shell; limited deep linking and browser history |
| D-012 | Lazy-load heavy visual experiences | 3D and flagship bundles load only when opened |
| D-013 | Gate internal screens through configuration | `VITE_DEV_CONSOLE` controls diagnostics and NOVA showcase reachability |
| D-014 | Fail fast and shut down gracefully | Startup validation and bounded teardown improve operations |
| D-015 | Treat Redis, AI and most providers as optional | Local development degrades gracefully; production completeness depends on configuration |
