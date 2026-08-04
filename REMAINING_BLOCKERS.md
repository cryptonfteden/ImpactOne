# REMAINING_BLOCKERS.md — Phase MVP-COMPLETION-001

Consolidated, current list of every item left for manual review after this phase's full-repository audit (`MVP_COMPLETION_AUDIT.md`). **No BLOCKING items exist.** Every item below is HIGH — significant, but not launch-blocking for a trusted-beta-user MVP scope — and every one is a **pre-existing, already-disclosed** item this audit re-confirmed rather than newly discovered. None require an architecture change or a business-logic change to resolve; each requires either a real external dependency this environment doesn't have configured, or a deliberate operator/product decision outside engineering's own authority to make unilaterally.

---

## HIGH — requires a real external dependency or an operator decision

### 1. No production authentication/authorization system
**Status**: A minimal, real, opt-in API-key gate exists (`PLATFORM-HARDENING-002`, `backend/middleware/requireApiKey.js`), applied to the one route explicitly named as unprotected (`/v2/admin-dashboard`), inert until `ADMIN_API_KEY` is configured. This is **not** a full user-identity/session/JWT system — building one would be a new feature and an architecture change, explicitly out of every hardening phase's scope so far.
**Why it can't be auto-completed**: requires a product decision (what auth model — email/password, OAuth, magic link?) this audit has no authority to make.
**Action needed before a public (non-trusted-beta) launch**: choose and implement a real user-auth system.

### 2. No production logging/monitoring/APM pipeline
**Status**: Real, structured per-request logging exists (`backend/middleware/requestLogger.js`), and a real CI pipeline runs backend/frontend tests on every push (`.github/workflows/ci.yml`, `PLATFORM-HARDENING-002`). No log aggregation, retention policy, error-tracking (Sentry-style), or APM dependency exists.
**Why it can't be auto-completed**: requires choosing and provisioning a real third-party service/account, an infrastructure decision outside this audit's scope.
**Action needed before launch**: provision a real logging/monitoring vendor and wire it in.

### 3. No database backup/disaster-recovery runbook
**Status**: Unchanged since this engagement's first SRE audit.
**Why it can't be auto-completed**: requires real infrastructure (a backup target, a retention policy, a tested restore procedure) this environment doesn't have.
**Action needed before launch**: stand up real automated backups and a tested restore drill.

### 4. 20 of 22 registered providers remain honest stubs (`honestStubFetch`)
**Status**: Fully disclosed since `AGENT-ORCHESTRATOR-001`; each stub returns an honest empty array rather than fabricated data. Only `reutersBloombergWireProvider` and `cftcCotProvider` have real fetch logic (both confirmed live, both migrated to the unified Provider Abstraction layer in `PROVIDER-ABSTRACTION-002`).
**Why it can't be auto-completed**: each remaining provider (SEC filings beyond what the Insider/Institutional agents already cover, Reddit, X/Twitter, Telegram, Polymarket, Fed/ECB/FOMC releases, FDA, NASA, Treasury, Congress, earnings calendars, patents, Finviz/TipRanks/Zacks, SPDR flows, Coinglass, options flow) requires either a real paid vendor account or a bespoke real-data integration — genuine new engineering work per provider, not a deterministic fix.
**Action needed**: prioritize and fund real integrations for the providers with the highest signal value, one at a time (the existing `createUnifiedProvider` abstraction is ready for each to adopt immediately).

### 5. No Redis instance configured in any environment
**Status**: The full Redis caching layer is built, tested, and gracefully degrades to real, uncached calls when Redis is absent (`REDIS-CACHE-001`) — this is not broken, it is honestly running in its "no cache" mode.
**Why it can't be auto-completed**: requires provisioning a real Redis instance (self-hosted or managed), an infrastructure/cost decision.
**Action needed before relying on caching for real scale**: provision a real Redis instance and set `REDIS_URL`.

### 6. `NEWS_API_KEY` / paid Finnhub plan not configured
**Status**: The News Intelligence Agent and Analyst Consensus Agent both honestly report `dataAvailable: false` for the specific fields that require these (confirmed live during `NEWS-AGENT-001`/`ANALYST-CONSENSUS-AGENT-001`), never fabricating a substitute.
**Why it can't be auto-completed**: requires a real, paid third-party subscription decision.
**Action needed**: provision the real API keys/plans if these data sources are wanted for launch.

### 7. Graded-outcome dataset contamination level unverified this session
**Status**: A prior Sprint D1/D1.5 audit found ~70–76% duplicate-content contamination in the graded-`Recommendation` dataset. This was not re-queried live this session (`FINAL_PRODUCTION_READINESS.md`'s own recommendation).
**Why it can't be auto-completed**: requires a live Postgres query against production/staging data and a judgment call about what to do with any contamination found — not a deterministic code fix.
**Action needed before trusting calibration/learning-loop outputs**: re-run the Sprint D1-style live dataset query and act on the current, not stale, figure.

### 8. `schedulerMetrics.js` sample-array bounding unconfirmed
**Status**: `agentScheduler.js` has a `reset()` call, but its exact periodicity in a long-running production process was not traced this session (`FINAL_PRODUCTION_READINESS.md`).
**Why it can't be auto-completed**: requires tracing real production call patterns over a long-running process, not something a repo-scan can determine.
**Action needed**: confirm `waitMsSamples`/`execMsSamples` are genuinely bounded under real, sustained production load before relying on this metric long-term.

### 9. No circuit-breaker/backpressure for a systemic downstream-vendor outage
**Status**: Named in this engagement's own prior stress audit; unchanged.
**Why it can't be auto-completed**: adding a circuit breaker is itself a real architecture change (new failure-mode handling across every agent's provider calls) — explicitly out of this audit's "do not redesign architecture" scope.
**Action needed**: a dedicated, deliberate phase to design and add this, if warranted at real production traffic levels.

---

## What is explicitly NOT a blocker (confirmed this audit, not just assumed)

- No hidden/fabricated data path was found anywhere in the 14 Domain Intelligence Agents, the Claim Intelligence layer, the Outcome Calibration engine, or the Provider layer — every honest-unavailable path was confirmed to degrade gracefully, never silently substituting fake data.
- No hardcoded secrets are committed anywhere in the repository.
- No broken/partial service wiring was found.
- The full backend and frontend test/build suites pass (see `MVP_READY_CHECKLIST.md` for exact counts).
