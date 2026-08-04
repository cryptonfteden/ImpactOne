# Orchestrator Risk Register

**Phase:** AGENT-ORCHESTRATOR-STRESS-AUDIT-001
**Purpose:** A single, ranked reference table summarizing every finding in [AGENT_ORCHESTRATOR_STRESS_AUDIT.md](../archive/audits/AGENT_ORCHESTRATOR_STRESS_AUDIT.md), for tracking and prioritization. "Theoretical" items are marked explicitly and excluded from the priority ranking, per the mission's instruction not to conflate them with live risks.

---

## Ranked, live/near-term risks (in priority order)

| Rank | Category | Finding | Severity | Likelihood at 100 agents | Status |
|---|---|---|---|---|---|
| 1 | Backpressure | No concurrency ceiling — `run()` fans out unconditionally via `Promise.all` | Critical | Near-certain | **Open** |
| 2 | Retry storms | No backoff/jitter between retry attempts; synchronized retries on shared-dependency failure | High | High | **Open** |
| 3 | Duplicate execution | No in-flight request coalescing for concurrent requests on the same symbol | Medium-High | Medium-High | **Open** |
| 4 | Thread safety (forward-looking) | In-memory registry is a structural blocker to any multi-process deployment | High | Certain, once distributed | **Open (design prerequisite)** |
| 5 | Memory leaks | Timed-out agent work is abandoned, not cancelled (no `AbortController`) | Medium | Medium-High | **Open** |
| 6 | Health degradation | Health checked fresh on every request for every agent, no caching | Medium | Certain to compound with agent count | **Open** |
| 7 | Timeout cascades | A single chronically-timing-out agent sets the latency floor for every request | Medium | Rises with agent count | **Open** |
| 8 | Cache coherence | Inherited risk from wrapped agents' own possible internal caching; not directly audited this pass | Medium | Unknown (flagged, not confirmed) | **Open — needs follow-up audit** |
| 9 | Priority starvation (forward-looking) | `priority` has no scheduling teeth today; will need one once backpressure controls exist | Medium | Certain, once concurrency limiting is added | **Open (design prerequisite)** |
| 10 | Registry corruption | Class of bug already found and fixed once (stale idempotency flag); no new instance found this pass | Low | Low (already mitigated once) | **Resolved once; remain vigilant** |
| 11 | Race conditions | Minor snapshot-consistency question if dynamic registration is ever added | Low | Low; theoretical at current scope | **Open, low priority** |

## Confirmed not applicable (genuinely ruled out, not just unlikely)

| Category | Why it's ruled out |
|---|---|
| Deadlocks | No lock/mutex/semaphore exists anywhere in the implementation — nothing to deadlock on. |
| Circular dependencies | No agent can depend on another's output in the current interface — no dependency graph exists to form a cycle in. |

## Confirmed theoretical / correctly out of scope for this phase

| Category | Why it's theoretical today |
|---|---|
| Event ordering | The orchestrator does not publish to the Intelligence Bus or any event stream yet — a synchronous request/response engine only. Relevant once it becomes event-driven, not before. |
| Idempotency | No persistent writes exist in `run()` today — nothing to have a duplicate-write problem yet. Relevant once a `DecisionTrace`-equivalent write or Bus publish is added. |

## Positive findings (not risks — stated for balance)

| Category | Finding |
|---|---|
| Partial failures | Genuinely excellent — `run()` provably never throws due to one agent's failure; failure state is explicitly, honestly disclosed in the response's `summary` field. |
| Registration validation | Malformed agents and duplicate IDs are rejected at registration time, before they can enter the registry. |
| Test discipline | 17 tests cover registration, parallel execution, health-gating, timeouts, retries, ranking, confidence weighting, conflict detection, evidence merging, and even a source-purity check (the orchestrator never reads an agent's own analysis fields) — a genuinely strong baseline to build the above fixes on top of. |

---

## Reading this register

Ranks 1–4 are the items that should be addressed **before** the registry grows meaningfully past its current size — they are not equally urgent, but all four become substantially harder to retrofit once more agents (and more real production traffic) depend on the current behavior. Ranks 5–9 are real and worth planning for, but tolerate a normal prioritization process. Ranks 10–11 and the "not applicable"/"theoretical" sections exist so this register isn't mistaken for a list of things to fix — several categories the mission asked about are genuinely, structurally not a problem in this design today, and saying so plainly is as important as flagging what is.
