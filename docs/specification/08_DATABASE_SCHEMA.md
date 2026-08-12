# 08 — Database Schema

## Technology

PostgreSQL with Prisma 7. At import time, the schema contains 55 models and 32 enums, evolved through 29 migration directories from portfolio foundations to commercial infrastructure.

## Domain groups

- Portfolio ledger: `Portfolio`, `Position`, `Order`, `Trade`, `CashLedgerEntry`, `PerformanceSnapshot`.
- Recommendations: `Recommendation`, feedback, decision traces, run logs, lifecycle events.
- Investor state: profiles, memories, beta users, decision state, watchlist folders/items, workspace notes, alerts, notifications.
- Intelligence: canonical events, provider logs, theme/sentiment snapshots, world memory records/links/state/predictions, methodology versions.
- Learning and quality: outcomes, lessons, score snapshots, scoring adjustments, analytics, feedback, errors, flags, principles/backtests.
- Options: raw prints, open-interest snapshots, derived signals.
- Intelligence Bus: normalized events with lifecycle, deduplication, provenance, evidence, and payload.
- Claims: claim, evidence ledger, transition ledger, outcome.
- Commercial: `User`, revocable `Session`, `Plan`, `Subscription`, `UsageCounter`.

## Integrity patterns

UUID primary keys, unique identity/deduplication constraints, targeted indexes, Decimal financial/scoring fields, JSON evidence payloads, string arrays, and loose non-cascading ID references for cross-engine links. Several ledgers are append-only by repository convention, not universally enforced by database permissions.

## Migration requirements

Production uses `prisma migrate deploy`; tests use the dedicated deployment script. Backups, restore drills, connection limits, retention, and zero-downtime compatibility are operational requirements but not proven by repository configuration.

## Risks

- Loose string references favor decoupling but sacrifice referential integrity.
- JSON contracts require application-level validation and versioning.
- Append-only intent should be reinforced through permissions or database policies for high-value audit tables.
- Schema comments contain encoding artifacts, reducing readability but not schema semantics.
