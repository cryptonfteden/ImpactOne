# 20 — Known Limitations, Gaps, and Contradictions

## Confirmed contradictions

- `docs/product/PROJECT_STATUS.md` describes an early analysis-only MVP, while current source contains broad portfolio, agent, claims, sentiment, options, operations, personalization, and commercial systems.
- Historical documents discuss deployments and signoffs; the repository has no active hosting manifest proving the current deployment.
- Documentation often labels phases complete, but static code presence does not prove production operation or user acceptance.
- The repository describes a clean-clone workflow while the downloaded branch includes root and frontend `node_modules`, which should normally be excluded.

## Technical limitations

- Modular-monolith breadth and approximately 450 service files create coupling and discoverability risk.
- Legacy and v2 endpoints coexist; portfolio state has legacy/browser and server modes.
- Most client navigation is not URL-addressable.
- Loose string references in the database lack referential guarantees.
- Optional providers create uneven symbol and market coverage.
- Scheduler behavior in multiple replicas is unspecified.
- No OpenAPI source of truth or generated SDK was found.

## Verification gaps

No live production environment, secrets, database contents, billing account, provider account, browser E2E run, load test, backup restore, or security test was part of this audit. Production claims remain conditional until those checks are performed.

## Documentation gap

At the time of the source audit, the repository had 738 first-party Markdown files. Many were valuable evidence, but repetition, phase language, stale plans, and historical signoffs made current truth difficult to identify. The subsequent documentation reorganization separates active categories, specifications, and historical archives.
