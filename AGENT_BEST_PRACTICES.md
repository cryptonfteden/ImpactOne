# Agent Best Practices

**Phase:** AGENT-ARCHITECTURE-001
**Purpose:** The practical, checklist-style guide for building one new agent correctly against [AGENT_PLATFORM_ARCHITECTURE.md](AGENT_PLATFORM_ARCHITECTURE.md) — the agent-platform equivalent of the role this platform's `DESIGN_SYSTEM.md` already plays for a new frontend Workspace screen. No code was written or changed to produce this document.

---

## Before writing any code

- **Does this capability already exist as (part of) another agent, provider, or service?** This platform has already, more than once, discovered duplicated logic living in two or three places that should have been one (`statusTone`/`attentionLevel` across three Workspace screens; three separate backend personalization services). Check the registry first. Building a 51st agent that quietly re-implements the 12th agent's logic is the single most likely failure mode at this scale, not a hypothetical one.
- **Write the manifest before the implementation.** `agentId`, `capability`, `trigger`, `priority`, `dependencies`, `timeoutMs`, `outputContract` — decide and register these first. If you can't state your agent's capability in one honest sentence, it isn't scoped yet.
- **Decide what your agent reads versus what it produces**, and confirm neither is a duplicate. An agent reads real, already-computed platform data (Claims, Attention Scores, Personal Memory with a real `betaUserId`, World Memory); it produces new Claims/Events onto the Bus. An agent that computes a "new" score already available elsewhere under a different name is a duplication risk, not a new capability.

## Implementation checklist

- [ ] **Stateless module, not a class.** Export a `run(context)` function and a manifest object; hold no instance state between invocations. This is required for horizontal scaling (see [AGENT_SCALABILITY.md](AGENT_SCALABILITY.md)), not a style preference.
- [ ] **Every external call is real, or honestly absent.** No fabricated data, no silent fallback that looks like a real result. If a dependency is unavailable, the agent's run should honestly fail or produce an honest "insufficient data" output — never a plausible-looking guess. This is the same discipline this platform has enforced (sometimes only after a real audit found it missing) for every other user-facing surface reviewed across this engagement.
- [ ] **Time-box your own work internally, don't rely only on the Scheduler's external timeout.** A well-behaved agent checks its own elapsed time for long internal loops and fails gracefully before the external timeout has to intervene.
- [ ] **Never call another agent directly.** Publish a real Bus event or Claim; let the registry's event-driven coordination handle anything downstream. A direct call is the single fastest way to recreate the N² coupling this architecture exists to prevent.
- [ ] **Use the structured cache key-builder, never a hand-written string.** If your agent needs to cache anything, the key must be mechanically derived from your agent's ID and its actual call parameters — not a string literal a sibling agent might accidentally reuse for different parameters.
- [ ] **Require real identity for anything user-specific, exactly like `personalizationService.js`/`investorMemoryService.js` already do.** If your agent reads Personal Memory or produces per-user output, it must require a real `betaUserId` and fail honestly without one — never fall back to a cross-user aggregate. This platform found and fixed exactly this class of bug once already; a new agent should not reintroduce it.
- [ ] **Produce a real, traceable record of every run.** Inputs, reasoning, outputs, confidence, timestamp — written once, immutable, queryable. An agent whose reasoning can't be inspected after the fact does not meet this platform's explainability bar, regardless of how good its output looks.
- [ ] **Distinguish your agent's scheduling priority from its output's Attention Score.** These are two different numbers, computed differently, meaning different things, and must never share a label, a badge color, or a single "priority" field in your manifest and your output payload.
- [ ] **Write the failure-mode tests before the happy-path ones.** What happens when a dependency times out? When the input is empty? When two agents' outputs genuinely disagree? This platform's own review history has repeatedly found that failure and disagreement handling is where the real trust problems hide, not the common case.

## Testing checklist

- [ ] A real, dependency-injected or Postgres-backed test proving the agent's output is correctly derived from real inputs (no snapshot-only tests that would pass on fabricated data).
- [ ] A test proving the agent degrades honestly (not silently, not by crashing) when a dependency is unavailable.
- [ ] If the agent touches any per-user data: a real multi-user isolation test, in the same shape as this platform's own recently-added Investor Memory isolation tests — prove User A's activity cannot influence User B's output from this agent.
- [ ] A test proving the agent's own manifest fields (`timeoutMs`, `priority`, `trigger`) are actually honored by the code, not just declared.

## Before registering the agent as Active

- [ ] The manifest is complete and passes registry validation (valid cron/event trigger, declared dependencies actually exist and are Active).
- [ ] The agent has run successfully at least once in a non-production environment, with its `DecisionTrace`-equivalent record inspected by a human, not just its test suite passing.
- [ ] A rollback path exists — the agent can be moved to `Suspended` without a deploy, the same way any other agent's circuit breaker would trip.

## Common mistakes this guide exists to prevent

Every item below has a real, verified precedent somewhere in this platform's own history — they are not hypothetical:
- **Reinventing a shared primitive locally** instead of reaching for the one that already exists (the exact pattern behind `statusTone`/`attentionLevel` being duplicated across three Workspace screens before consolidation).
- **A new service quietly missing the user-scoping discipline** an established sibling service already has (`investorMemoryService.js`'s original cross-user leak, found and fixed this engagement).
- **A new integration point that's technically safe but functionally incomplete** — code that *can* accept a real identity but whose actual caller never supplies one, so a real capability silently never activates (found in `homeSummaryService.js`'s `rankByUserRelevance` call site during the privacy-fix review).
- **A cache key that isn't mechanically tied to its real parameters**, drifting silently once a second caller with different parameters reuses it.
- **Treating a design document's stated intent as proof the code matches it**, rather than independently verifying — the single most repeated lesson of this entire engagement, and the one this guide most wants a new agent's author to internalize before writing the first line of code.
