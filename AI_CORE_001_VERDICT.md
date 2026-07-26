# AI-CORE-001 Verdict — Claim Intelligence Layer

## Verdict: REVISE CLAIM INTELLIGENCE

## Basis

This review inspected the real source under `backend/services/claimIntelligence/` and `backend/services/intelligenceBus/` directly — not the implementation report's claims — against every one of the mission's 10 verification categories, and re-ran the full backend test suite independently rather than trusting the reported `1018/1018` figure.

**What is genuinely excellent and should not be redesigned:**
- Layer placement is architecturally correct — Claims consume Bus events only, no engine bypasses the Bus, no consumer is coupled to an individual engine.
- Confidence and probability are computed from disjoint inputs by two functions that never share a variable — the mission's explicit reject-trigger condition ("confidence and probability treated as synonyms") **does not occur anywhere in this code**.
- The lifecycle state machine is deterministic, exhaustively ordered, fully auditable, and free of impossible or undocumented transitions.
- Governance is genuinely strong — the same forbidden-key denylist reused a fourth time, enforced twice (formation-time throw, read-time strip), verified in tests.
- Dominance caps, null-not-fabricated degradation, and bounded confidence/probability updates are all real, verified mechanisms, not just claims.
- Bounded learning feedback is computed and persisted but is verifiably never applied to mutate action-selection policy — the mission's explicit boundary, honored literally.
- Duplicate, similar-but-non-identical, opposing, and different-time-horizon claim reconciliation are all real, working, correctly-designed mechanisms.

**What blocks a clean APPROVED today:**

1. **Two of the mission's own explicitly-named verification targets — superseding claims (§3) and contribution calculation (§4) — have real schema/contract support but zero working implementation anywhere in the code**, and (unlike every other real limitation in this phase) **neither gap is disclosed in the implementation report's own scope section.** This is not a matter of missing polish; the mission specifically asked this review to test these two exact mechanisms, and both were found to be silently non-functional.
2. **Timing is named in the mission (§8) as one of four things resolution grading must separately evaluate — it is not.** `timingErrorDays` is a pure pass-through of an externally-supplied value, never computed by the Claim Layer itself, and this too is undisclosed alongside the honestly-stated magnitude/portfolio-impact gaps.
3. A smaller, related gap: the evidence-level `INVALIDATES` stance is fully defined and defensively handled by three consumer functions but never produced by any real code path — narrower in impact than items 1–2, but the same underlying pattern (a documented capability that doesn't actually run).

None of these are structural problems, and none require redesigning the pipeline, the contract, or the governance model — each is a bounded, specific implementation gap in a system whose foundation is otherwise sound and rigorously verified.

## Final line

**REVISE CLAIM INTELLIGENCE.**

The Claim Intelligence Layer's architecture, governance, semantics separation, and lifecycle discipline are all genuinely strong and independently verified by direct code inspection, not taken on the implementation report's word. It is not yet approved because two of the mission's own explicitly-named test targets (superseding claims, contribution calculation) and one named grading dimension (timing) are documented as if real but do not actually work — and, notably, this is the first phase in this review history where a real implementation gap was **not** proactively disclosed in the same honest voice this codebase has otherwise consistently used. Closing those three items, and disclosing them if they are deferred rather than fixed, is the full path back to approval — no architectural rework is required.
