# ImpactOne Master Specification

Code-grounded specification baseline prepared from the `cryptonfteden/ImpactOne` `main` branch on 2026-08-04 and imported into the repository on the same date. Executable source, the Prisma schema, migrations, and runtime configuration remain authoritative; this set is the concise specification layer and must be updated when those sources materially change.

> Import note: the source archive also contained `DOCUMENTATION_ARCHIVE_PLAN.md`. It was intentionally not imported because the repository documentation reorganization had already been completed before this specification was added. See the live [documentation portal](../README.md) and [manifest](../DOCUMENTATION_MANIFEST.md).

## Reading order

1. [00 Project Overview](00_PROJECT_OVERVIEW.md)
2. [02 Product Requirements](02_PRODUCT_REQUIREMENTS.md)
3. [03 System Architecture](03_SYSTEM_ARCHITECTURE.md)
4. [08 Database Schema](08_DATABASE_SCHEMA.md)
5. [09 API Specification](09_API_SPECIFICATION.md)
6. [16 Security](16_SECURITY.md)
7. [20 Known Limitations](20_KNOWN_LIMITATIONS.md)

## Sections

| # | Document | Purpose |
|---|---|---|
| 00 | [Project overview](00_PROJECT_OVERVIEW.md) | Scope, stack, status, evidence |
| 01 | [Product vision](01_PRODUCT_VISION.md) | Problem, users, differentiation |
| 02 | [Product requirements](02_PRODUCT_REQUIREMENTS.md) | Implemented capabilities and requirements |
| 03 | [System architecture](03_SYSTEM_ARCHITECTURE.md) | Runtime topology and boundaries |
| 04 | [Backend architecture](04_BACKEND_ARCHITECTURE.md) | Express layers and service domains |
| 05 | [Frontend architecture](05_FRONTEND_ARCHITECTURE.md) | React shell, state, navigation |
| 06 | [AI engine](06_AI_ENGINE.md) | Agents, committee, claims, explainability |
| 07 | [Data pipeline](07_DATA_PIPELINE.md) | Providers through UI |
| 08 | [Database schema](08_DATABASE_SCHEMA.md) | Prisma domain model and migrations |
| 09 | [API specification](09_API_SPECIFICATION.md) | HTTP surface and conventions |
| 10 | [UI/UX design system](10_UI_UX_DESIGN_SYSTEM.md) | NOVA tokens, motion, accessibility |
| 11 | [Component library](11_COMPONENT_LIBRARY.md) | Shared UI inventory |
| 12 | [User flows](12_USER_FLOWS.md) | Core journeys |
| 13 | [Screen specifications](13_SCREEN_SPECIFICATIONS.md) | Registered screens |
| 14 | [Feature specifications](14_FEATURE_SPECIFICATIONS.md) | Feature behavior and ownership |
| 15 | [Background jobs](15_BACKGROUND_JOBS.md) | Schedulers and lifecycle |
| 16 | [Security](16_SECURITY.md) | Controls, risks, secrets |
| 17 | [Deployment](17_DEPLOYMENT.md) | Build, runtime, CI, operations |
| 18 | [Testing strategy](18_TESTING_STRATEGY.md) | Test suites and release gates |
| 19 | [Roadmap](19_ROADMAP.md) | Evidence-based priorities |
| 20 | [Known limitations](20_KNOWN_LIMITATIONS.md) | Gaps and contradictions |
| 21 | [Decisions log](21_DECISIONS_LOG.md) | Recovered architecture decisions |

## Audit rules and confidence

- **Verified** means directly observed in source, schema, package manifest, or CI configuration.
- **Documented** means asserted by existing Markdown but not necessarily proven at runtime.
- **Gap** means missing evidence, stale text, or a contradiction.
- This specification does not override executable contracts or certify production behavior.
- Update the relevant section when routes, Prisma models, navigation, providers, security controls, deployment topology, or major workflows change.
