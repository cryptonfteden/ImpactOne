# 15 — Background Jobs

## Startup schedulers

| Scheduler | Responsibility | Start condition |
|---|---|---|
| `schedulerService` | Autonomous recommendation/engine cycles | `AUTONOMOUS_ENGINE_ENABLED` |
| `themeSnapshotScheduler` | Theme confidence snapshots | Always started |
| `providerScheduler` | Provider ingestion/refresh | Always started |
| `alertScheduler` | Price-alert evaluation and notifications | Always started |

An additional `services/agentScheduler/` subsystem provides queued agent execution, concurrency limits, timeouts, retry/backoff, priority aging, metrics, and health caching.

## Lifecycle

Environment validation runs before listening. Schedulers start in the server listen callback. SIGTERM/SIGINT invoke a shared shutdown handler that stops schedulers, closes HTTP acceptance, disconnects database and Redis, and forces completion after `SHUTDOWN_TIMEOUT_MS`.

## Requirements

- Jobs must be idempotent across restart and overlapping ticks.
- Distributed deployment requires a single-leader or database-lock strategy; none was established by this static audit.
- Every run should record start/end/status, methodology, failure taxonomy, and affected entities.
- Provider and alert backlogs need limits and observability.
- Clock/time-zone semantics must be explicit for market sessions and daily snapshots.
