# ImpactOne Agent Platform — Scalability Recommendations

**Phase:** POST-MVP-ARCHITECTURE-001. Companion to [POST_MVP_ARCHITECTURE.md](POST_MVP_ARCHITECTURE.md) and [NEXT_GEN_ARCHITECTURE.md](NEXT_GEN_ARCHITECTURE.md). Documentation only. Focused specifically on scale/performance/operational-readiness recommendations, ranked by priority and grounded in this session's own direct verification of the Scheduler's real post-`PLATFORM-HARDENING-001` state.

---

## Priority 0 — Verify, don't assume

1. **Confirm `schedulerMetrics.js`'s sample-array bounding.** `metrics.reset()` is confirmed called from within `agentScheduler.js` — directly read the surrounding code to determine whether this is a genuine periodic safeguard (good — closes the previously-flagged unbounded-growth risk) or a narrower reset path (e.g., only invoked in a specific lifecycle event, leaving the general-request path still unbounded). This is the cheapest, highest-value verification step in this whole document — a few minutes of reading, not a design change — and should happen before prioritizing any other Scheduler work.
2. **Confirm the real behavior of the now-real `/v2/agent-diagnostics` endpoint under sustained load** — it is confirmed to exist and pass its integration test, but that test (like most in this codebase) almost certainly exercises a single request, not a sustained-traffic scenario.

## Priority 1 — Cheap, high-leverage fixes

1. **Add `"technical"` and `"fibonacci"` to `agentSelector.js`'s `TARGET_AGENT_IDS`** — a one-line change, zero risk, closes a confirmed real gap in the Unified Stock Intelligence engine's per-symbol coverage (see `POST_MVP_ARCHITECTURE.md` §1).
2. **Register each of the 13 domain agents' real confidence formulas as new `scoringVocabulary.js` entries**, documenting (not changing) their existing weights — makes 13 currently-undiscoverable formulas discoverable and auditable at effectively zero engineering risk, since no computation changes.
3. **Formalize each provider's real/stub/fixture status as a queryable field** on `providerRegistry.js`'s existing provider shape, reusing the already-present `configurationRequirement` string — a metadata addition, not a contract change.

## Priority 2 — Structural fixes with moderate effort

1. **Wire one real domain agent (recommended: Options) into the Intelligence Bus/Claim Layer as a proof-of-concept** (`NEXT_GEN_ARCHITECTURE.md` §1) — the single highest-value structural change identified in this review, but scoped deliberately narrow (one agent, not all 13) to validate the real end-to-end path before wider adoption.
2. **Convert `agentSelector.js` from an inclusion-allowlist to an exclusion-denylist model** (`NEXT_GEN_ARCHITECTURE.md` §2) — makes the class of gap found in Priority 1 item 1 structurally impossible for any future agent, not just fixed for today's two.
3. **Extract a thin `RegistryStateProvider` interface** around the registry's current in-process `Map` (`NEXT_GEN_ARCHITECTURE.md` §4) — a safe, behavior-preserving refactor that de-risks a future shared-state migration without performing that migration now.

## Priority 3 — Defer until real demand is demonstrated

1. **Do not migrate the agent registry to Redis/shared state** until a real multi-instance deployment is imminent — this remains correctly deferred, consistent with this platform's own `AGENT_SCALABILITY.md` sequencing.
2. **Do not build a tiered/priority-aware concurrency scheduler** until real per-agent execution-time data (already being collected by `schedulerMetrics.js`) shows a genuine, material spread between fast and slow agents at real production traffic volumes.
3. **Do not attempt cross-agent numeric confidence calibration** until real Outcome-grading history accumulates per agent — forcing calibration today would replace an honest "not yet comparable" state with a fabricated one.

## Quantified scale outlook (extending this engagement's own prior 20/50/100-agent analysis)

This engagement's own prior `PRODUCTION_READINESS_REVIEW.md` computed worst-case single-request latency at 20/50/100 registered agents (1/3/5 sequential dispatch rounds through the Scheduler's `DEFAULT_CONCURRENCY=20`). At today's real 14 registered agents (13 real + 1 stub), a single request still fits within **1 dispatch round** — the platform has not yet crossed the first meaningful scaling threshold that analysis identified. The next agent (News, "currently in progress" per this mission) would bring the registry to 15 — still within 1 round. **No new latency-tier finding is warranted at today's scale**; the prior analysis's thresholds (50 agents = 3 rounds, 100 = 5 rounds) remain the correct forward-looking reference points, not yet reached.

## Summary table

| Item | Priority | Effort | Risk if deferred |
|---|---|---|---|
| Verify `schedulerMetrics.js` reset periodicity | P0 | Minutes | Unknown — could already be resolved or could still be a live unbounded-growth risk |
| Add technical/fibonacci to `agentSelector.js` | P1 | Minutes | Two real agents' signals permanently absent from the platform's own "unified" report |
| Register 13 confidence formulas in `scoringVocabulary.js` | P1 | Hours | Formulas remain undiscoverable/unauditable outside each agent's own source file |
| Formalize provider real/stub/fixture status | P1 | Hours | Registry discoverability degrades further as it grows past 22 entries |
| Wire 1 agent into the Claim Layer (proof-of-concept) | P2 | Days | The platform's best-designed reasoning layer remains permanently unused |
| Convert `agentSelector.js` to exclusion-denylist | P2 | Hours-Days | The technical/fibonacci class of gap can recur for any future agent |
| Extract `RegistryStateProvider` interface | P2 | Days | A future shared-state migration becomes a larger, riskier one-shot change instead of a safe cutover |
| Redis/shared-state registry migration | P3 (deferred) | Weeks | Correctly deferred — no real multi-instance deployment exists yet |
| Tiered/priority-aware scheduler | P3 (deferred) | Weeks | Correctly deferred — no evidence yet of a material fast/slow agent execution-time spread |
| Cross-agent numeric confidence calibration | P3 (deferred) | Requires real Outcome data first | Correctly deferred — no real graded-outcome history exists per agent yet |
