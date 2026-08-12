# 19 — Roadmap

This roadmap is derived from current code gaps rather than treating historical sprint plans as current commitments.

## Immediate — establish release truth

- Replace or refresh stale `docs/product/PROJECT_STATUS.md` with a generated current-status page.
- Produce OpenAPI and authorization matrices from all route modules.
- Verify clean-clone install, full CI, migrations, and core smoke flows.
- Remove committed dependency trees in a separately approved cleanup change.
- Confirm production topology, backups, observability, and scheduler leadership.

## Near term — harden user trust

- Add end-to-end tests for authentication, portfolio, recommendations, claims, alerts, and billing webhooks.
- Centralize the AI model, prompt, and methodology inventory.
- Show data freshness, missing inputs, and methodology consistently.
- Complete accessibility and mobile acceptance testing.
- Formalize privacy, retention, account deletion/export, and financial disclaimers.

## Medium term — simplify the platform

- Resolve legacy/v2 API and portfolio-mode duplication.
- Generate service, provider, agent, component, and API catalogs.
- Consolidate repetitive service implementations behind stable contracts.
- Enforce append-only audit guarantees and cross-entity integrity where appropriate.

## Later

Scale after usage evidence: distributed scheduling, queues, partitioning, read replicas, stronger observability, and more commercial tiers should follow measured bottlenecks and product-market fit.
