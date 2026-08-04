# Agent Scalability

**Phase:** AGENT-ARCHITECTURE-001
**Purpose:** How [AGENT_PLATFORM_ARCHITECTURE.md](../architecture/AGENT_PLATFORM_ARCHITECTURE.md)'s design behaves at 50+ agents, and what changes (and what deliberately does not) as this platform moves toward distributed, horizontally-scaled execution. No code was written or changed to produce this document.

---

## What "50+ agents" actually stresses

Not raw compute — this platform's existing agents (Options Agent, the five Investment Committee members, the various autonomous engines) are not individually expensive. What 50+ agents genuinely stresses is **coordination**: the registry's ability to stay one coherent source of truth, the Scheduler's ability to avoid a thundering herd, the Bus's ability to stay the one legitimate event transport rather than fragmenting into per-agent side channels, and the database's ability to serve 50 agents' worth of concurrent reads/writes without becoming the bottleneck. Every section below is about coordination at scale, not about making any single agent faster.

## Registry at scale

At 5-10 agents, a registry is a nice-to-have. At 50+, it is the only thing standing between "a coherent platform" and "fifty independent scripts that happen to share a database." The registry must support:
- **Namespacing by domain** (market-wide, portfolio-specific, personalization, committee/reasoning) so a human or a future agent-of-agents can query "what runs in this domain" without reading all 50 manifests.
- **Dependency declaration** (which agents/services a given agent needs) so the Scheduler can detect a broken dependency chain *before* wasting a scheduled run on an agent that can't succeed, rather than discovering it via a failure log after the fact.
- **A versioned manifest schema** — the same discipline this platform already applies to its Event Envelope (`EVENT_ENVELOPE_VERSION`) — so the registry itself can evolve without breaking every existing agent's registration at once.

## Scheduling at scale

A single, central Scheduler (per [AGENT_PLATFORM_ARCHITECTURE.md](../architecture/AGENT_PLATFORM_ARCHITECTURE.md)) does not mean a single point of contention if built correctly:
- **Staggered scheduling**: 50 agents on round-number cron intervals (`*/15 * * * *`, `0 * * * *`) will naturally cluster and collide. The Scheduler should jitter dispatch times slightly per agent (deterministically, based on `agentId`, so behavior stays reproducible) rather than firing every 15-minute agent at the exact same instant.
- **A real concurrency ceiling**, not an implicit one — a configured maximum number of simultaneous agent runs, enforced by the worker pool (see Parallel execution below), so 50 agents' schedules aligning under unlucky timing cannot saturate the database the way an unbounded fan-out would.
- **Priority-aware dispatch**: when the concurrency ceiling is reached, `Critical`/`High`-priority agents (per their manifest, never per their output's Attention Score — see the priority-conflation warning in the Architecture doc) are dispatched first; `Low`-priority agents wait, honestly, rather than being silently dropped.

## Parallel and async execution at scale

The worker-pool concurrency model in [AGENT_PLATFORM_ARCHITECTURE.md](../architecture/AGENT_PLATFORM_ARCHITECTURE.md) scales linearly with the number of workers available, precisely because agents are stateless and Bus-mediated rather than holding in-process state — any worker can pick up any queued run. This is the single most important precondition for everything else in this document: **an agent that accumulates in-process state between runs cannot be safely run by an arbitrary worker**, which is why statelessness is treated as non-negotiable in the core architecture, not a style preference.

## Streaming at scale

Streaming's cost at scale is connection count, not agent count — a correlation-tagged Bus event is published exactly once regardless of how many clients are watching; the streaming gateway (not the agent) is what needs to scale its own connection-fan-out, and that is a transport-layer concern entirely separable from how many agents exist.

## Caching at scale

At 50+ agents sharing one cache layer, the structured key-builder discipline from the core architecture (never a hand-written string) becomes load-bearing rather than merely tidy — with 50 independent call sites, an unlinked string-key collision or mismatch is no longer a hypothetical risk, it is a near-certainty over time without a structural guarantee. The cache itself should be a shared, TTL-bounded store (the same conceptual shape as the frontend's existing `requestCache.js`, generalized), not 50 independent in-memory maps.

## Failure isolation at scale

The circuit-breaker pattern in the core architecture is what makes 50+ agents survivable operationally: without it, one systematically-failing agent (a provider that went down, a bad deploy) would otherwise burn a share of the concurrency ceiling on every scheduling cycle, starving healthy agents of worker capacity. At scale, a suspended agent isn't just "not producing output" — it's actively protecting the other 49 agents' ability to run on time.

## Explainability and memory at scale

Both already scale by construction, because both already rely on the database as the source of truth rather than in-process state — a `DecisionTrace`-equivalent record and a Personal/World Memory write are exactly as cheap at agent 50 as at agent 1. The only real scaling concern here is index and retention discipline on what will become a genuinely large table — the same operational concern this platform already manages for `Recommendation`/`DecisionTrace` today, not a new problem this design introduces.

---

## Future distributed execution

Today, everything (Scheduler, worker pool, every agent) runs inside one Node process. This is intentionally not treated as a limitation to design around prematurely — it is the correct starting point, and the architecture above (stateless agents, Postgres-backed Bus and Memory, a structured registry) is specifically chosen because every one of those properties is what makes a *later* move to multiple processes or machines an extension, not a rewrite.

**The evolution path, in order, only when actually needed:**
1. **Multiple worker processes on one machine**, each pulling eligible agent runs from the same registry/schedule via the database — no code change to any individual agent, since they were already stateless and already only communicated through the Bus/Postgres.
2. **A real message-queue-backed Bus** (e.g., the existing Postgres-backed Intelligence Bus fronted by or replaced with a broker like Redis Streams or SQS) once event volume genuinely outgrows a single database's comfortable write throughput — an evolution of the existing Bus's contract (the same Event Envelope shape), not a parallel system agents would need to learn twice.
3. **Multiple machines**, once (1) and (2) are both true and a single machine's worker pool is the actual bottleneck — at this point the architecture requires no further conceptual change, only more workers pointed at the same shared registry/Bus/database.

This platform should not build (2) or (3) speculatively. The core architecture's job is to make sure that when the day comes, the answer is "add more workers," not "redesign how agents talk to each other" — exactly the same lesson this engagement has already learned from watching five frontend Workspaces converge cleanly onto one shared foundation because that foundation was designed for reuse from the start, not retrofitted after the fact.

## Horizontal scaling

The concrete horizontal-scaling requirement this architecture must satisfy, stated plainly: **any worker process, on any machine, must be able to correctly execute any agent's scheduled run, using only the registry, the Bus, and the database as shared state.** Every design choice in [AGENT_PLATFORM_ARCHITECTURE.md](../architecture/AGENT_PLATFORM_ARCHITECTURE.md) — stateless service modules, event-driven coordination instead of direct calls, Postgres-backed memory and explainability, a structured cache keyed by real parameters — exists specifically to make that one sentence true. If a future engineer ever needs to ask "which specific worker does Agent X need to run on," something in the design has been violated; the correct answer, always, is "any of them."
