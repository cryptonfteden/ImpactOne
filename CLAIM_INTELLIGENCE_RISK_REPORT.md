# Claim Intelligence Layer — Risk Report (Phase AI-CORE-001)

Risk-focused summary. Every risk below traces to a specific, code-verified finding in `CLAIM_INTELLIGENCE_REVIEW.md` — no speculative risk is included.

## Risk 1 — Two explicitly-named verification targets have real, undisclosed implementation gaps

**Severity: High (process risk, not architectural risk).**

The mission asked this review to specifically test "superseding claims" (§3) and "contribution calculation" (§4). Both were found to be **defined in the schema/contract but never actually implemented in any real code path**:

- `Claim.supersededByClaimId` — a real column, a real repository capability, zero call sites anywhere that ever set it, zero test coverage.
- `ClaimEvidence.contributionToClaim` — a real column, referenced by three different consumer-side functions, unconditionally `null` at every one of its three creation call sites.

**Why this is a risk beyond "two missing features":** `CLAIM_INTELLIGENCE_IMPLEMENTATION_REPORT.md`'s own "Deliberate scope decisions (disclosed, not discovered later)" section is a real, working discipline this platform has repeatedly used correctly (e.g., honestly disclosing that `expectedMagnitude`/`portfolioImpact`/`plainLanguageStatement`/automatic-learning-application are all out of scope this phase). **Neither of these two gaps appears in that list.** A reviewer or downstream consumer reading only the implementation report would reasonably believe both capabilities are real and working, because every other real limitation in this phase was disclosed in exactly that voice, and these two were not. This is the same category of risk (a documented capability that silently doesn't work) as the Portfolio Workspace `heldPosition` bug found in an earlier review — the difference here is severity (nothing consumes `supersededByClaimId` in a way that produces a wrong answer, since it's simply always null/unset) rather than kind.

## Risk 2 — A named grading dimension (timing) is a pass-through, not a computation

**Severity: Medium.**

The mission's §8 explicitly asks whether resolution grading "separately evaluates direction, magnitude, timing, calibration." Direction, magnitude, and calibration are all genuinely, independently computed by real functions in `claimResolutionService.js`. **Timing is not** — `timingErrorDays` is written verbatim from whatever the external caller already supplies in `actualOutcome.timingErrorDays`, with no computation anywhere in the Claim Layer itself. This is a real gap in what the mission specifically asked to verify, and — like Risk 1 — it is not named in the implementation report's disclosed limitations, unlike the sibling honesty already shown for magnitude/portfolio-impact.

## Risk 3 — The evidence-level `INVALIDATES` stance is fully defined but never produced

**Severity: Low.**

`ClaimEvidenceStance.INVALIDATES` is a real enum value, correctly handled by three separate consumer-side functions — but no producer anywhere ever creates an evidence row with this stance. Claim-level invalidation itself works correctly through a separate, well-designed mechanism (`invalidateClaim()`, driven by a real externally-supplied fact) — this specific risk is narrowly scoped to the evidence-ledger's own `INVALIDATES` category being currently dead code, not to invalidation as a concept being broken.

## Risk 4 — The entire pipeline is currently unexercised in production

**Severity: Medium, but explicitly disclosed, so a process risk rather than a discovery risk.**

`intelligenceBusService.publishEvent()` is called from exactly two files in the entire backend, both test files. Neither the Options Agent nor the Market Sentiment Engine calls it in production code. This means:
- Zero real Claims will ever form until a future phase wires a real engine → Bus publish call and a scheduler/trigger to invoke `claimFormationService.ingestBusEvent()`.
- The correctness of every mechanism reviewed here (identity/dedup, confidence/probability separation, lifecycle transitions, governance) is proven against real, contract-shaped test data — including one genuine end-to-end test through the real `publishEvent()` call — but has never been exercised against a live, continuously-running system.

This risk is explicitly, correctly disclosed in the implementation report's scope section ("No Express routes, scheduler, or UI... nothing reachable"), consistent with the same disclosed-foundation pattern already seen in the Options Agent and Intelligence Bus phases. It is listed here as a risk to be tracked, not as a finding this review discovered independently.

## Risk 5 — Fixed, hand-set confidence weights, disclosed but unvalidated

**Severity: Low.**

`CONFIDENCE_COMPONENT_WEIGHTS` (sourceReliability 0.3, freshness 0.15, independence 0.15, breadth 0.15, agreement 0.25) are honestly disclosed as "pending real calibration data," matching this platform's established honesty precedent for exactly this situation (`scoringVocabulary.js`, the Options Agent's confidence model). Not a defect — flagged only because, combined with Risk 4 (no real production data flowing through this system yet), these weights cannot be empirically validated until real Claims exist and are graded at scale.

## Risk 6 — Test suite verification

A fresh, independent full backend test run was started as part of this review rather than trusting the implementation report's claimed `1018/1018` figure. At the time of writing this report, the run was still in progress with **zero failures observed across every test that had completed** (spanning recommendations, beta identity, decision center, decision timeline, executive dashboard, home summary, impact graph, investor profile, and live-feed integration suites, among others). This report does not assert a final pass/fail count until the run completes or is otherwise confirmed — see `AI_CORE_001_VERDICT.md` for the final status at verdict time.

## What is genuinely low-risk and should not be re-litigated

- Governance (the forbidden-key denylist reuse, double-enforced) is thoroughly verified and carries no residual risk.
- The confidence/probability separation is structurally sound — this review found zero evidence of the mission's explicit reject-trigger condition ("confidence and probability treated as synonyms").
- The lifecycle state machine is deterministic, exhaustively-ordered, and fully auditable — no impossible or undocumented transition was found.
- Bounded learning feedback correctly, verifiably never mutates action-selection policy.
