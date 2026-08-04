# Scaling Failure Scenarios

**Phase:** AGENT-ORCHESTRATOR-STRESS-AUDIT-001
**Purpose:** Concrete, narrative failure scenarios showing how [AGENT_ORCHESTRATOR_STRESS_AUDIT.md](../archive/audits/AGENT_ORCHESTRATOR_STRESS_AUDIT.md)'s findings would actually manifest once the registry grows from today's 13 agents (3 real, 10 stubs) toward the stated 100+ target. Each scenario is traced to the specific code behavior that causes it — this is not speculative fiction, it is the current implementation's real logic, run forward at a larger scale.

---

## Scenario 1 — "The morning open" (Backpressure + Retry storms, compounding)

It's market open. Fifty real agents are registered, most wrapping a small number of shared upstream data providers (a quotes API, a news API, an options-flow API). A burst of 40 users open the app within the same ten seconds and each request a different symbol's Stock Intelligence report.

Each of those 40 requests independently triggers `run()`, which fans out to all 50 agents via unconditional `Promise.all` — **2,000 simultaneous agent executions**, no ceiling, no queue. A meaningful fraction of those agents share the same three or four upstream providers. Those providers, receiving a sudden multiple of their normal load, start responding slowly. Agents wrapping them approach their `timeoutMs` window at roughly the same moment (since they share the same default), time out together, and — because there is no backoff — **retry immediately, in the same instant**, adding a second wave of load to the exact providers that just started struggling. The providers, now under retry-amplified load, degrade further. More agents time out on their *retry* attempt too, this time reported as `"error"` after exhausting `maxRetries`.

**End state:** every one of the 40 users' reports comes back slow (bounded by `timeoutMs × (maxRetries + 1)` per the Timeout cascades finding) and with a meaningfully lower `overallConfidence` (many agents reporting `"error"`/`"timeout"`, contributing zero confidence), during exactly the highest-value moment (market open) for the report to be both fast and complete. Nothing crashes — the orchestrator's partial-failure handling is genuinely good — but the product silently gets much worse exactly when it matters most, and no alert fires, because every individual agent's failure is "handled" by design.

**Root causes, traced directly to findings:** Backpressure (#1) + Retry storms (#2) + Timeout cascades (#7).

## Scenario 2 — "The viral stock" (Duplicate execution)

A symbol trends. Two hundred users open the same stock's Intelligence report within a thirty-second window. Because `run()` has no in-flight request coalescing, **each of those 200 requests independently re-executes the full 50-agent registry** for the identical symbol, producing 200 functionally-identical reports computed 200 separate times.

**End state:** 10,000 redundant agent executions for content that could have been computed once and served 200 times, at the exact moment the system is under the most real user attention. This doesn't just waste compute — it directly feeds Scenario 1's dynamic, since a popular-symbol spike is precisely the kind of burst that also triggers shared-provider overload.

**Root cause:** Duplicate execution (#3).

## Scenario 3 — "The quiet leak" (Memory leaks / abandoned work)

No dramatic spike this time — just ordinary operation over several weeks, at 80 registered agents, with one upstream provider that is mildly, chronically flaky (occasionally slow, never fully down). A few times per hour, one of the dozen agents wrapping that provider hits its timeout. `withTimeout` correctly stops the *orchestrator* from waiting — but the agent's actual `execute()` call, with its real underlying fetch or query, is never cancelled and keeps running in the background.

**End state:** over days and weeks, a slow, cumulative buildup of abandoned in-flight operations — open sockets, pending queries — that were never explicitly closed. Nothing crashes suddenly; instead, the process's resource usage (open connections, memory held by pending promises) trends slowly upward, and — depending on the underlying provider's own connection-pool limits — the *provider itself* may eventually start rejecting new connections from this process, manifesting as a rising baseline timeout rate that looks like "the provider got worse" rather than "we never let go of our old requests to it."

**Root cause:** Memory leaks / no cancellation signal (#5).

## Scenario 4 — "Two processes, two answers" (Thread safety / registry structure, forward-looking)

This scenario requires a change beyond today's implementation, and is included specifically because it is the most consequential *structural* limitation this audit found — the point at which the current design stops working at all, not just under strain. The team scales the orchestrator horizontally, running it across two Node processes behind a load balancer, exactly as the platform's own long-term Agent Platform design (`AGENT_SCALABILITY.md`) anticipates. Agent registration still happens via each process's own module-level `Map`.

**End state:** if the two processes' startup registration ever drifts even slightly (a deploy rolls out to one process before the other, or a future dynamic-registration feature registers an agent at runtime on only one instance), **two users requesting the same symbol at the same moment, routed to different processes, receive reports built from different agent sets** — different `overallConfidence`, potentially different `conflicts`, with no error, no warning, and no way for either user to know their report isn't the same as their neighbor's. This is not a crash; it is a silent, structural inconsistency baked into treating an in-memory `Map` as if it were a shared source of truth once more than one process exists.

**Root cause:** Thread safety / in-memory registry structure (#4) — the one scenario in this document that is not a matter of "under enough load," but a direct, mechanical consequence of the current registry's storage choice the moment a second process exists.

## Scenario 5 — "Death by a thousand health checks" (Health degradation)

At 100 registered agents, and steady, unremarkable request volume — no spike, no viral symbol, nothing unusual — every single incoming request still triggers 100 fresh `health()` calls before any `execute()` happens, because health is never cached. If even a modest fraction of those 100 `health()` implementations perform any real I/O (a lightweight ping to confirm a provider is reachable, a quick config check), the *aggregate* cost of 100 health checks per request, multiplied across ordinary request volume, becomes a real, steady tax on latency and infrastructure load — not from any single expensive check, but from doing all of them, every time, for every request, when the underlying health of most agents realistically doesn't change between one request and the next a few seconds later.

**End state:** a system that "works fine" in every individual test and every reasonable load test that doesn't specifically measure aggregate health-check overhead, but runs measurably, avoidably slower and more expensively in steady-state production than a version with even a short (5–10 second) health-result cache would.

**Root cause:** Health degradation / no health-result caching (#6).

---

## What these five scenarios have in common

None of them require a bug in the sense of incorrect logic — every line of code involved does exactly what it was written to do. Every scenario is what happens when a design decision that is completely reasonable at 13 agents and modest traffic (immediate retries, no request coalescing, no concurrency ceiling, a per-process in-memory registry, no health caching) is carried forward unchanged to 100+ agents and real production load. This is the central lesson of this audit: **this implementation is not broken — it is correctly scoped for what it was asked to be first, and the risk is entirely in treating that first scope as though it were already the final one.**
