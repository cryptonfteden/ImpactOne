# Observability Spec — Phase X6, Part 5

This document is the narrower companion to `SYSTEM_HEALTH_SPEC.md` — it covers the logging/status *contract* itself; the health-check implementation and the dashboard that consumes it are documented there.

## The contract

Every critical module in this platform reports its status as exactly one of four values — `HEALTHY`, `WARNING`, `UNAVAILABLE`, `UNKNOWN` — via `systemHealthService.STATUS`. No module invents a fifth status string, and no module is silently omitted from the report.

## "Never expose raw stack traces" — enforced, not just stated

`timedCheck()` (`systemHealthService.js`) is the one place any of the nine module checks can throw. Its `catch` block never re-throws and never forwards `error.message` or `error.stack` into the returned `detail` — it substitutes the fixed string `"Check failed unexpectedly."` A dedicated test (`systemHealthService.test.js`'s "no module detail ever contains a raw stack trace") asserts this directly against real check output, not just by code review — it checks for `.js:` and `at Object.` substrings, the two most common tells of a leaked Node stack trace.

This extends the pattern `PRIVATE_BETA_POLISH.md` (Phase X5) established for user-facing error messages (`DecisionCenterScreen`, `PortfolioScreen`, `AiAnalysisScreen`) to the diagnostics layer itself — even a screen meant for the founder/operator shouldn't need to parse a raw exception to understand what's wrong.

## Where "structured logging" already existed, and what's new

`frontend/src/utils/errorHandling.js`'s `logError(scope, error)` was already real, structured client-side logging (normalizes any error shape, logs scope + message + stack to the console) — unchanged this phase. What was missing was the *backend* module-health equivalent: a single, queryable, real-time answer to "is module X working right now," which `systemHealthService.js` provides for the first time this phase.

`AppErrorBoundary.jsx` (Part 1) routes every uncaught render error through the same `logError()` path, so a full-app crash and a scoped screen error are logged through one consistent mechanism, not two.

## What is deliberately not built this phase

Persisted historical logging (a real log store, queryable by time range) does not exist — `systemHealthService` is a live, point-in-time check, not a time-series. `providerHealthService.js`'s `ProviderRunLog` table (Sprint 21A) is the closest existing precedent for what a future persisted-history version of this would look like, and is a reasonable model for later work — not built here, since this phase's mission is stability/polish/trust, not new persistence infrastructure.
