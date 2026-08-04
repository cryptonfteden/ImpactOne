# Architecture Trace

Every one of the 23 architecture decisions documented in `CEO_AUDIT_EXPORT/04_ARCHITECTURE_DECISIONS.md`, traced here to its implementing files, its commits, its current status, and — explicitly, per this pack's mission — whether it is broken and whether it carries technical debt.

---

### D1. No dedicated authentication layer
- **Files implementing it:** absence is the implementation — no auth middleware, no JWT/session model anywhere in `backend/`.
- **Commits:** founding sprints through Sprint 16 (no single commit; a pervasive absence).
- **Current status:** Still true today. Beta-scale isolation exists (D15) but is not authentication.
- **Broken?** Not broken (it does what it was designed to do for a small closed beta), but **increasingly risky at any scale beyond a handful of trusted users** — see `RISK_REGISTER.md` R1.
- **Technical debt?** **Yes — Critical** (`06_TECHNICAL_DEBT.md` C1/C2 relate directly).

### D2. PostgreSQL/Prisma as sole persistence layer
- **Files:** `backend/prisma/schema.prisma` (50 models, 29 migrations as of this pack).
- **Commits:** `46f45f3` (Sprint 14) onward.
- **Current status:** True today, universally adopted, no dissent.
- **Broken?** No.
- **Technical debt?** No backup/disaster-recovery process exists for this one shared database (M8) — a debt adjacent to, not within, the decision itself.

### D3. Advisory-only, no trade execution — structurally enforced
- **Files:** `backend/services/autonomousRecommendationEngine.js` and every downstream consumer; verified by a source-grepping test (no `placeOrder` import exists in the recommendation path).
- **Commits:** `9b6664e` (Sprint 16).
- **Current status:** True today, confirmed intact by this session's own research for `AGENT-ORCHESTRATOR-001`.
- **Broken?** No.
- **Technical debt?** None.

### D4. DecisionTrace as permanent, immutable audit record
- **Files:** `backend/prisma/schema.prisma` (`DecisionTrace` model, create-only), `decisionTraceExplainabilityService.js`.
- **Commits:** `b1c8c64` (Sprint 16).
- **Current status:** True today; cited as the reference pattern for every later append-only record.
- **Broken?** No.
- **Technical debt?** None.

### D5. Canonical Verdict contract
- **Files:** `backend/services/canonicalVerdict.js`, `scoringVocabulary.js`.
- **Commits:** `338dbe1` (Sprint 18A).
- **Current status:** True today.
- **Broken?** No.
- **Technical debt?** None.

### D6. Committee is a debate/explanation layer, never an independent decision-maker
- **Files:** `backend/services/intelligenceCommittee/` (`committeeCoordinator.js`, `chiefInvestmentOfficerService.js`).
- **Commits:** `5429442` (Sprint 18A initial), `f294b28` (Sprint 41 actual unification).
- **Current status:** True today, confirmed by test-enforced invariant (`unification.test.js`), re-verified during `AGENT-ORCHESTRATOR-001`'s research (2026-07-27).
- **Broken?** **Was broken for 9 sprints** (the legacy committee remained the only one wired into live recommendations until Sprint 41 found this) — now fixed.
- **Technical debt?** None currently open; historically the single most-repeated violation-then-fix pattern in the project (see `04_ARCHITECTURE_DECISIONS.md`'s closing note).

### D7. Confidence scores never averaged/blended into one number
- **Files:** `committeeCoordinator.js`, test-enforced by `safety.test.js`.
- **Commits:** `ba56581` (Sprint 38).
- **Current status:** True today; deliberately, consciously respected (not merely inherited by default) when the Agent Orchestrator built its own, different confidence-calculation rule in `AGENT-ORCHESTRATOR-001` (2026-07-27) — the Orchestrator's rule was explicitly reasoned as a deliberate departure justified by a different context (generic infrastructure vs. investment verdicts), not a silent violation.
- **Broken?** No.
- **Technical debt?** None.

### D8. Confidence and Uncertainty are two permanently separate dimensions
- **Files:** `CANONICAL_DOMAIN_MODEL.md` §1.6 (documentation); `frontend/src/components/nova/MetricArc.jsx` (implementation).
- **Commits:** Sprint 18A onward (backend); `DESIGN-SYSTEM-001` (`e155d68`, frontend implementation, 2026-07-27).
- **Current status:** True today.
- **Broken?** **A real violation was found and fixed in `DESIGN-SYSTEM-001`** — Attention's badge tone was visually colliding with Confidence's "Moderate" band, three unrelated signals rendering identical amber. Fixed with a dedicated, exclusive `attention` tone.
- **Technical debt?** None currently open.

### D9. World Memory is permanent and append-only
- **Files:** `backend/services/worldMemoryRepository.js`, 8 Prisma models, immutability enforced by a source-scanning test.
- **Commits:** `4f9189c`, `13872df`, `aae97a0` (Sprint 21A).
- **Current status:** True today.
- **Broken?** No — the append-only discipline itself was never violated. A **different**, adjacent gap (missing user-scoping on `UserMemoryEvent`) was found and fixed in `PERSONALIZATION-PRIVACY-001` — not a violation of D9 itself, a gap in a different dimension (see D14).
- **Technical debt?** The Impact Graph feature this enables has close to zero populated causal-link data (see `KNOWN_GAPS.md` #15).

### D10. Provider Contract
- **Files:** `backend/services/providers/` (contract, rate limiter, retry policy, factory, 15+ provider definitions).
- **Commits:** `bcecab3`, `d54e4d6` (Sprint 21A).
- **Current status:** True today; registry grown to 22 providers by Sprint 37.
- **Broken?** No.
- **Technical debt?** **Yes — only 2 of 22 registered providers were genuinely live as of the most recent audit that checked this** (Sprint 37). Most remain unconfigured, a vendor/licensing gap, not a code gap.

### D11. `CANONICAL_DOMAIN_MODEL.md` as single source of meaning
- **Files:** `CANONICAL_DOMAIN_MODEL.md` (documentation, not code).
- **Commits:** `931060e` (Sprint 21A).
- **Current status:** True today; this session's `claimPresentation.js`/`intelligenceEngine.js` consolidations are direct descendants of this same discipline applied to frontend logic.
- **Broken?** No.
- **Technical debt?** None directly, though the broader "documented rule with no automated enforcement" pattern applies here too (see the closing note in `04_ARCHITECTURE_DECISIONS.md`).

### D12. `learningLoopService.js` is deliberately one-directional
- **Files:** `backend/services/learningLoopService.js`, test-enforced (never imported by the recommendation engine).
- **Commits:** `9c2eeba` (Sprint 30).
- **Current status:** True today; explicitly reconfirmed as correctly-scoped (not a gap) during this session's `AGENT-ORCHESTRATOR-001` research.
- **Broken?** No.
- **Technical debt?** None — this is one of the few decisions in the project explicitly confirmed to have held without any violation across its entire history.

### D13. Personalization changes ordering/presentation, never underlying facts
- **Files:** `feedPersonalizationService.js`, `personalIntelligenceService.js`, `personalizationService.js` (three separate implementations — see D-adjacent note below).
- **Commits:** Sprint 20 onward, reaffirmed at Sprints 30, 32, and this session's `PERSONAL-INTELLIGENCE-001`.
- **Current status:** True today, independently verified by `PERSONALIZATION_REVIEW.md` (Phase X10) and again by this session's own research.
- **Broken?** No.
- **Technical debt?** **Yes** — three separate, uncoordinated services implement this same principle independently, with no shared canonical object (`PLATFORM_TECH_DEBT.md` TD-adjacent, `06_TECHNICAL_DEBT.md` H2).

### D14. InvestorProfile as single-tenant singleton, later given nullable per-user scoping
- **Files:** `backend/prisma/schema.prisma` (`InvestorProfile.betaUserId`), `investorProfileService.js`.
- **Commits:** `d7568ae` (Sprint 20, no scoping), Phase H2 migration (2026-07-23, scoping added).
- **Current status:** The pattern (nullable, indexed `betaUserId`, singleton fallback) is now applied to `InvestorProfile`, `Portfolio`, `Recommendation`, `RecommendationFeedback`, `AnalyticsEvent`, and (as of `PERSONALIZATION-PRIVACY-001`, 2026-07-27) `UserMemoryEvent`.
- **Broken?** **Was broken for `UserMemoryEvent` specifically** — created one sprint after this rollout pattern was established (Sprint 30 vs. Phase H2's Sprint-23-adjacent timing) and missed by it, leaving a real cross-user leak open for roughly 4 months. **Fixed 2026-07-27.**
- **Technical debt?** **Open question, explicitly disclosed, not resolved by this pack:** whether any of the remaining ~45 Prisma models not explicitly re-checked also lack this scoping. See `KNOWN_GAPS.md` and `RISK_REGISTER.md` R2.

### D15. Beta user isolation via nullable, unconstrained `betaUserId`
- **Files:** `backend/middleware/betaUserContext.js`, `frontend/src/components/BetaInviteGate.jsx`.
- **Commits:** Phase H2 (2026-07-23).
- **Current status:** True today, live-verified with real two-user tests.
- **Broken?** No — but explicitly named in `FIVE_YEAR_ARCHITECTURE_ROADMAP.md` as something that must evolve into real accounts/roles well before real scale (this is a closed-beta pattern, not production auth).
- **Technical debt?** Yes, by the roadmap's own explicit statement — see D1.

### D16. NOVA two-layer token architecture, opt-in glass, logical CSS properties
- **Files:** `frontend/src/components/nova/`, design tokens.
- **Commits:** X12B (2026-07-24).
- **Current status:** True today.
- **Broken?** No — but the logical-property rule **did retroactively fix a real, previously-invisible RTL bug** in a shared `.stack-list` class (X12C1.1), evidence the rule is load-bearing, not decorative.
- **Technical debt?** No automated check currently enforces continued adoption of this system by new screens (M2).

### D17. MetricArc — Confidence banded, Attention/Probability fixed-hue
- **Files:** `frontend/src/components/nova/MetricArc.jsx`, `AttentionLevelBadge.jsx`.
- **Commits:** X12 series, refined in `DESIGN-SYSTEM-001` (`e155d68`, 2026-07-27).
- **Current status:** True today.
- **Broken?** **Was broken** (the exact Attention/Confidence color collision described under D8) — fixed in this session.
- **Technical debt?** None currently open.

### D18. Three-tier screen architecture (Brief/Signals/Context)
- **Files:** `.mc-tier-1/2/3` shared CSS classes, applied across all 7 Workspace screens.
- **Commits:** `c51048c` (initial), formalized `aa4f851` (`MISSION-CONTROL-002`).
- **Current status:** True today across all 7 Workspace screens.
- **Broken?** No.
- **Technical debt?** None — the shared-class approach specifically avoided per-screen duplication.

### D19. Per-section Demo Mode, never a global flag
- **Files:** every Workspace screen's `liveSections` state map, `DemoModeBanner.jsx`.
- **Commits:** `aa4f851`, `da70ac9`.
- **Current status:** True today across all 7 Workspace screens.
- **Broken?** No.
- **Technical debt?** None.

### D20. Shared cross-screen state and de-duplicated requests
- **Files:** `frontend/src/context/PlatformContext.jsx`, `frontend/src/services/requestCache.js`.
- **Commits:** `6aae4e5` (`PLATFORM-INTEGRATION-001`).
- **Current status:** True today.
- **Broken?** **A real ordering bug was found and fixed during the same phase that introduced this decision** (a screen's fallback state briefly overwrote shared context before a real fetch resolved) — caught before shipping, not a live production incident.
- **Technical debt?** **Yes** — `requestCache`'s keys are hand-written strings, not derived from real call parameters (M1); `PlatformContext` mixes selection state and cached domain-data fetching with no stated boundary for a third concern (M3).

### D21. Shared logic modules over screen-local duplication
- **Files:** `frontend/src/utils/claimPresentation.js`, `frontend/src/services/intelligenceEngine.js`.
- **Commits:** `8c43b5a` (`DEDUPLICATION-001`), `a9f9367` (`PLATFORM-INTELLIGENCE-001`).
- **Current status:** True today; the audit that triggered this found a byte-identical function copy-pasted between two files with no shared source.
- **Broken?** No — one deliberate, disclosed behavior refinement was made (evidence summarization now ranks by real contribution score) and explicitly called out rather than hidden.
- **Technical debt?** No automated check currently prevents a *new* duplication of this kind from being reintroduced (M2, generally).

### D22. New engines are additive, never silently replacing an existing endpoint
- **Files:** `backend/routes/agentOrchestratorRoutes.js` (mounted at `/v2/agent-orchestrator`, alongside the still-live `/v2/symbol-intelligence`).
- **Commits:** `3a9111d`, `72a6129`.
- **Current status:** True today — the Orchestrator is not the canonical Stock Intelligence path.
- **Broken?** No — this is a deliberate, disclosed deferral, not a defect.
- **Technical debt?** This is itself named as open remaining work (`07_ROADMAP.md` #8) — a decision to make, not yet made.

### D23. Agent Orchestrator's generic interface — metadata/execute/confidence/health only
- **Files:** `backend/services/agentOrchestrator/agentInterface.js`, `registry.js`.
- **Commits:** `72a6129` (`AGENT-ORCHESTRATOR-001`).
- **Current status:** True today, proven by a source-grepping test that the orchestrator never reads an agent's actual analysis content.
- **Broken?** No — but **a real "assumed shape" bug was found and fixed within an agent implementing this interface** (`sentimentAgent.js`'s `direction` field), the same class of bug as D17's precedent, recurring in a new subsystem.
- **Technical debt?** 10 of 13 registered agent domains are honest, inert stubs pending real data-source integration (`07_ROADMAP.md` #9).

---

## Summary: what this trace shows

- **0 of the 23 decisions are currently, actively broken** as of this pack's writing (2026-07-27).
- **6 of the 23 (D6, D8, D9-adjacent/D14, D17, D20, D23) were found broken or violated at some point in the project's history and were subsequently fixed** — several after a real gap of months (D6: 9 sprints; D14: ~12 sprints / ~4 months).
- **The single clearest pattern across all 23:** a sound decision is made, gets violated by a later feature under time pressure, and is only caught by an independent audit or live testing — never by an automated mechanism. See `RISK_REGISTER.md` R7 for this pattern treated as a standing project risk.
