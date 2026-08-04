# Operations Runbook — ImpactOne Agent Platform

**Phase:** PRODUCTION-READINESS-001. Companion to [FINAL_PRODUCTION_READINESS.md](FINAL_PRODUCTION_READINESS.md) and [LAUNCH_CHECKLIST.md](../planning/LAUNCH_CHECKLIST.md). Documentation only. **This document did not previously exist in this repository** — it is a genuinely new artifact, not an update to an existing runbook.

---

## 1. What exists today to operate against

- **Health check**: `GET /health` (`backend/app.js`) — a static `{status:"ok"}` with **no dependency check** (confirmed absent across this engagement's history, unchanged). Do not treat a 200 from this endpoint as proof the database, Agent Scheduler, or any provider is actually healthy.
- **Agent diagnostics**: `GET /v2/agent-diagnostics` — a real, tested, newly-hardened endpoint (`PLATFORM-HARDENING-001`) providing a consolidated snapshot of Scheduler + Observability state. **This is the closest thing to a real operator dashboard this platform currently has for the Agent Platform specifically.**
- **Claims read surface**: `GET /api/v2/claims/active` — real, confirmed live and tested this session (the Claim Intelligence Integration's own full-stack test reaches it).
- **No logging, no APM, no alerting exists anywhere in the Agent Platform** — an operator today has no way to be proactively notified of a problem; every check must be performed manually against the endpoints above.

## 2. Routine operational checks (until real monitoring exists)

Given the absence of automated alerting, an operator should periodically (manually, until this is automated):

1. Hit `GET /v2/agent-diagnostics` and confirm the Scheduler's active/queued counts look sane relative to expected traffic, and that no agent shows a persistently elevated retry/timeout count.
2. Confirm `GET /health` returns 200 — understanding this only proves the process is up, not that its dependencies are healthy.
3. Directly query Postgres (reusing this engagement's own established technique: a throwaway Node script in a temp directory using `backend/db/prismaClient.js` with an absolute require path) to spot-check recent `Recommendation`/`Outcome`/`AgentExecutionLog` row counts and freshness — the only way today to detect if the autonomous engine or Agent Platform has silently stalled.

## 3. Incident response — Agent Platform appears slow or unresponsive

1. **Check `GET /v2/agent-diagnostics` first** — look for an elevated queue depth or a specific agent with abnormally high `execMs`/retry counts, which would indicate a single slow downstream vendor is the root cause (per this engagement's own prior stress-audit finding: a single chronically-slow agent silently sets the latency floor for the entire endpoint since agents run in parallel but the request waits on all of them).
2. **Check whether a specific provider is degraded** — cross-reference the slow agent against `providerRegistry.js`'s real/stub status; a real provider (e.g., CFTC COT, Options Flow) experiencing an outage is a more likely root cause than a stub (stubs return near-instantly by design).
3. **There is currently no way to cancel an in-flight request via HTTP** (a previously-flagged, still-open gap) — a disconnected client's request will continue consuming a Scheduler slot until its own timeout/retry cycle completes on its own.
4. **Restart the backend process if needed** — since the registry/scheduler/observability state is entirely in-process (no shared external state), a clean restart fully resets all in-memory state with no data loss to any *persisted* data (Postgres-backed data is unaffected by a backend restart).

## 4. Incident response — a Claim Intelligence event fails to publish

1. **This is designed to fail safely by construction** — `agentClaimPublisher.js`'s own `publishAgentClaim()` is confirmed (via this session's own test run) to never throw; a real publish/ingest failure is reported as an honest skip, not an unhandled rejection. **A failed Claim publish should never crash or degrade the underlying Unified Stock Intelligence report itself** — the Claim Layer integration is additive/best-effort by design.
2. **To fully disable Claim publishing** (the real, already-built rollback mechanism): the `publishClaims` flag defaults to `false` on `runObserved()` and is only set to `true` at `unifiedStockIntelligenceEngine.js`'s own single call site — reverting that one line to `false` (or omitting the option) fully restores pre-integration behavior with zero other code changes required.

## 5. Incident response — suspected data-quality issue in recommendations/outcomes

1. **Re-run this engagement's own established Sprint D1-style live dataset audit** (a throwaway read-only Node script against the real Postgres database) to check for duplicate-content contamination, broken referential links (`WorldMemoryPrediction`/`SUPERSEDED` recommendation references pointing to nonexistent rows — both previously found, real, confirmed issues), and symbol/source diversity.
2. **Do not assume the ~70-76% duplicate-content contamination figure from the prior Sprint D1/D1.5 audits still holds** — it was not re-verified this session; re-check it directly before drawing any conclusion.

## 6. Rollback strategy summary

| Component | Rollback mechanism | Data loss risk |
|---|---|---|
| Claim Intelligence Integration | Flip `publishClaims: true` back to `false`/omit at the one call site | None — Claims already formed remain in the database; only new publishing stops |
| Agent Scheduler config changes | Revert `schedulerConfig.js`'s env-var overrides to defaults | None — purely a runtime config change |
| A newly-added domain agent | The registry's `registerAllAgents()` is idempotent and additive; removing an agent from `ALL_AGENTS` cleanly de-registers it | None — agents carry no persistent state of their own |
| A bad backend deploy generally | Standard process restart/redeploy to the prior commit — no database migration is coupled to any Agent Platform change reviewed this session | None, since no schema changes were part of the Claim Intelligence Integration (confirmed additive-only via source read) |

## 7. Known standing gaps this runbook cannot currently cover (explicitly disclosed, not silently omitted)

- **No automated alerting** — every check in this runbook is manual until real monitoring is built.
- **No circuit breaker for a systemic downstream-vendor outage** — a shared dependency failing for many agents simultaneously will currently degrade the whole platform's latency rather than being isolated.
- **No backup/disaster-recovery procedure exists for the Postgres database** — this runbook cannot provide a real recovery procedure because none has been built; this is named in `LAUNCH_CHECKLIST.md` as a High Priority item, not silently glossed over here.
