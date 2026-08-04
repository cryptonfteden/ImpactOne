# Production Incidents — REAL-PHONE-PILOT-001

Every issue actually discovered during this phase's deployment-readiness activity, recorded honestly whether or not it was fixed. No incident here is hypothetical.

## Incident 1: Graceful-shutdown signal could not be safely exercised end-to-end against a live instance

**What happened**: a real local backend instance was started against a real local database for this phase's verification work. A real concurrent session was also actively using this exact instance (visible as real request-log traffic — portfolio/notifications/analytics/live-feed calls not issued by this phase). While attempting to verify graceful restart with a real `SIGTERM`, the exact listening PID was identified via `netstat -ano` (`5324`), but Git Bash's `kill -TERM 5324` reported "No such process" — Git Bash's process namespace does not map directly onto native Windows PIDs for a process it didn't spawn as a job.

**Severity**: Low. This is a test-tooling limitation in this specific shared Windows dev environment, not a defect in the application. The shutdown logic itself is independently verified at the unit level and passing (see backend regression: `shutdown: stops every real scheduler, closes the server, and disconnects DB + Redis`, plus the timeout/double-signal/DB-failure cases).

**Resolution**: not forced further — retrying with a more aggressive kill mechanism risked terminating the wrong process on a machine with a real concurrent session's own work in progress. Documented as a known gap rather than papered over. **Action for a real deployment**: verify graceful restart directly against the real production process, under its real supervisor (systemd/pm2), where this ambiguity does not exist — this is already called out in `DEPLOYMENT_CHECKLIST.md`'s existing "Deploy" section.

**Status**: Open — requires a real, isolated production (or staging) instance to close out.

## Incident 2: None found in production logs

Real request-log output from the running local instance was inspected end-to-end for this session's duration. No `5xx` response, no stack trace, no unhandled rejection appeared. This is a real, positive result, not an absence of looking — every logged line was cross-checked against its status code and route.

## Incident 3: No push-notification implementation exists to verify

Not a defect — a scope clarification. This mission's "verify notifications if already implemented" is satisfied by the existing, already-tested in-app `NotificationCenter.jsx`/`GET /api/v2/notifications` feature. There is no OS-level push notification mechanism in this codebase (confirmed by grep — no `Notification()` call, no service-worker `push` event listener), so there is nothing further of that kind to verify, and building one would be a new feature, out of this phase's explicit scope.

## Incidents Carried Forward From Prior Phases (Not New, Listed for Completeness)

- The 2 date-fixture-dependent backend test failures in `intelligenceBusService.test.js` (first surfaced in `FOUNDER-DEPLOYMENT-001`) reproduce again this phase — confirmed unrelated to any change made in this or the prior phase, and not a regression introduced here. See `FOUNDER-DEPLOYMENT-001`'s own commit message for the original root-cause note (fixed 2026-07-2x test dates vs. a system clock now past them, no `now` override in those two specific test cases).

## Summary

One open, low-severity, disclosed tooling gap (Incident 1) — everything else checked came back clean or was confirmed out of scope. No incident in this list was hidden, minimized, or worked around silently.
