# 04 — Architecture Decisions

**Sources:** `ARCHITECTURE.md`, `CANONICAL_DOMAIN_MODEL.md`, `API_CONTRACTS.md`, plus every sprint/phase report cited in `01_PROJECT_TIMELINE.md` and this session's own first-hand execution record. Every entry is a real, stated architectural choice — not a feature description — with its date/sprint, the reasoning given for it, and its downstream impact.

---

## Foundational (Sprints 1–16)

### D1. No dedicated authentication layer
- **Date/Sprint:** Founding sprints through Sprint 16 (later partially revisited, see D20).
- **Decision:** The system is effectively single-tenant; all endpoints are public with no signup/login/session/JWT/role model.
- **Why:** MVP speed — a solo/small-team early product with no real multi-user requirement yet.
- **Impact:** Directly caused the shared-portfolio/shared-profile cross-user risk later flagged as Critical in `CRITICAL_BUGS.md` (Phase H1) and only partially addressed by the beta-user-isolation work (D20). No endpoint has real authentication as of the most recent `API_CONTRACTS.md` reading available to this export.

### D2. PostgreSQL/Prisma as the sole persistence layer
- **Date/Sprint:** Sprint 14 (2026-07-11).
- **Decision:** Replace all prior in-memory/mock state with a real, migrated relational schema.
- **Why:** The Portfolio Engine needed real, durable state to be a credible paper-trading product.
- **Impact:** Every subsequent feature (World Memory, Recommendations, Claims, Options, etc.) builds on this one schema — 50 models across 29 migrations as of this export.

### D3. Advisory-only, no trade execution — structurally enforced
- **Date/Sprint:** Sprint 16 (2026-07-11), re-affirmed as a permanent invariant in `CANONICAL_DOMAIN_MODEL.md` §2.16 and `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`'s "never change" list.
- **Decision:** The recommendation engine can never place a trade — verified as a code-level guarantee (no `placeOrder` import exists anywhere in the recommendation-generating path), not merely a policy statement.
- **Why:** Regulatory/trust posture — the product informs, it never acts on a user's behalf.
- **Impact:** Every future engine (Options Agent, Agent Orchestrator, etc.) inherits this boundary by construction; named across CEO-facing documents as one of the handful of decisions that must never change "at any scale."

### D4. DecisionTrace as the permanent, immutable audit record
- **Date/Sprint:** Sprint 16 (2026-07-11).
- **Decision:** Every recommendation gets a durable, create-and-read-only trace record — no update path exists anywhere in the codebase.
- **Why:** A recommendation's reasoning must be reconstructable after the fact, unaltered, forever.
- **Impact:** Became "the platform's reference implementation of immutability," cited by name in later documents (`TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, `KNOWLEDGE_GRAPH_ARCHITECTURE.md`) as the pattern every other immutable record in the system follows (World Memory, Claim Intelligence Layer, etc.).

---

## Canonical contracts and the Committee's boundary (Sprint 18A, 2026-07-12)

### D5. Canonical Verdict contract
- **Decision:** One normalized action vocabulary (`canonicalVerdict.js`) that every recommendation-facing surface reads from.
- **Why:** Multiple subsystems (Committee, Recommendation Engine, `/ai/analyze`) were computing action-shaped opinions independently, risking silent disagreement.
- **Impact:** Structurally guards against a second subsystem ever emitting a competing verdict — the guarantee an external CEO review (`CEO_FINAL_PRODUCT_REVIEW.md`) later called out as genuinely rare among competitors.

### D6. The Investment Committee is a debate/explanation layer, never an independent decision-maker
- **Decision:** The Committee's role is folded into producing structured debate and evidence — it has no independently persisted verdict of its own.
- **Why:** A prior committee design risked producing a second, potentially-disagreeing verdict alongside the canonical Recommendation.
- **Impact:** **The single most-repeated architectural rule in the project's history.** It was violated in practice for the next 9 sprints (the legacy committee remained the only one wired into live recommendations until Sprint 41 found and fixed this), re-affirmed explicitly at Sprint 41, and generalized permanently in `CANONICAL_DOMAIN_MODEL.md` §1.7 to cover any future governance layer, including a hypothetical human "Investment Council."

### D7. Confidence scores are never averaged or blended into one number
- **Date/Sprint:** Sprint 38 (2026-07-19/20), foreshadowed by Sprint 18A.
- **Decision:** When multiple committee members or evidence sources disagree, their individual confidence values are never mathematically combined into a single figure.
- **Why:** Blending would hide real disagreement behind a false sense of consensus — "the AI decided" opacity the whole explainability effort exists to prevent.
- **Impact:** Test-enforced (`safety.test.js`: *"the coordinator and CIO never produce a blended/averaged confidence field"*) and confirmed still intact by this session's own research for `AGENT-ORCHESTRATOR-001` — which deliberately designed a *different*, disclosed rule for its own, separate confidence calculation, explicitly reasoning through why the Orchestrator's context (generic infrastructure, not investment verdicts) justified a different choice rather than silently ignoring the precedent.

### D8. Confidence and Uncertainty are two permanently separate dimensions
- **Date/Sprint:** Sprint 18A onward, formalized in `CANONICAL_DOMAIN_MODEL.md` §1.6.
- **Decision:** Confidence measures signal strength; uncertainty measures disagreement/data quality — they are never collapsed into one dial.
- **Why:** A single blended score would hide *why* a claim is uncertain (weak signal vs. genuine disagreement are different problems requiring different user responses).
- **Impact:** Directly inherited by the frontend's `MetricArc` component (Confidence/Attention/Probability rendered as three visually distinct, never-conflated metrics — a rule whose violation was found and fixed as a real bug in `DESIGN-SYSTEM-001`, this session). Named in `THE_100_YEAR_COMPANY.md`/`FUTURE_PRODUCT_MAP.md` as a decision that must survive every future leadership change.

---

## Data and memory model (Sprint 20–32)

### D9. World Memory is permanent and append-only
- **Date/Sprint:** Sprint 21A (2026-07-13).
- **Decision:** 8 models recording the platform's long-horizon "memory" of the world — every table is create-only, enforced by a source-scanning immutability test.
- **Why:** A causal/historical record that could be silently edited would undermine every claim built on top of it later.
- **Impact:** Became the template for every subsequent append-only subsystem (User Memory, RecommendationFeedback, the Claim Intelligence Layer's ledger). Directly enables the Impact Graph feature. Also directly implicated in this session's `PERSONALIZATION-PRIVACY-001` fix — the append-only discipline was sound, but one specific table (`UserMemoryEvent`) was missing the *user-scoping* dimension entirely, a different axis from immutability.

### D10. Provider Contract — one shared interface for every external data source
- **Date/Sprint:** Sprint 21A (2026-07-13).
- **Decision:** Every data provider (15 initially, grown to 22 by Sprint 37) implements the same contract, rate limiter, and retry policy.
- **Why:** Avoid N independent, inconsistent integration patterns as more data sources are added.
- **Impact:** Enabled rapid registration of new sources without new plumbing each time — though most registered providers remained unconfigured/inactive for most of the project's history (only 2 of 22 genuinely live as of Sprint 37's audit).

### D11. `CANONICAL_DOMAIN_MODEL.md` as the single source of meaning
- **Date/Sprint:** Sprint 21A (2026-07-13), itself created to reconcile two previously-uncoordinated documentation strata that had been found **INCONSISTENT** with each other.
- **Decision:** One document defines every core term (Belief, Thesis, Recommendation, Outcome, Confidence/Uncertainty, evidence classes, source tiers) with one canonical meaning.
- **Why:** Multiple prior documents had defined overlapping concepts differently, risking silent semantic drift as more engineers/phases touched the codebase.
- **Impact:** Referenced as the tie-breaking authority in later disputes (e.g., clarifying that "Investment Committee" the shipped engine and "Investment Council" a hypothetical human-governance concept are never the same thing, D1.7). This session's `claimPresentation.js` and `intelligenceEngine.js` consolidations are direct descendants of this same discipline, applied to frontend logic instead of documentation.

### D12. `learningLoopService.js` is deliberately, structurally one-directional
- **Date/Sprint:** Sprint 30 (2026-07-15).
- **Decision:** The service that aggregates feedback/outcome/theme signals is test-enforced to never be imported by the recommendation engine or the personal ranking engine.
- **Why:** Immediate feedback must never bias today's recommendations without a deliberate, audited, human-approved process (established fully as policy in Sprint 43/Phase D).
- **Impact:** Held for 11 sprints until Sprint 41's committee unification, and remains true today per this session's own confirmation while researching `AGENT-ORCHESTRATOR-001` — `learningLoopService.js`'s own header comment states this explicitly, and this session's research treated it as settled, correctly-scoped architecture rather than a gap to close.

### D13. Personalization changes ordering/presentation, never underlying facts
- **Date/Sprint:** Sprint 20 (2026-07-13), reaffirmed at every subsequent personalization feature (Sprint 30, 32; and this session's Personal Intelligence Workspace).
- **Decision:** Every personalization function is a stable re-sort or a tone/emphasis change — never a mutation of the facts, confidence, or evidence a user sees.
- **Why:** Two users must never be shown different truths about the same real event, only differently prioritized/framed views of the identical truth.
- **Impact:** Formalized as `PERSONALIZATION_PRINCIPLES.md`'s explicit table of what may/must never be personalized, later independently verified as actually followed in code by a dedicated review (`PERSONALIZATION_REVIEW.md`, Phase X10) and again by this session's own research for the Personal Intelligence Workspace (`PERSONAL_INTELLIGENCE.md`, deliberately not reimplementing the backend's own personalization scoring client-side).

### D14. InvestorProfile as a single-tenant singleton, later given nullable per-user scoping
- **Date/Sprint:** Sprint 20 (2026-07-13) → Phase H2 (2026-07-23).
- **Decision:** Started with zero user-scoping field at all; later given a nullable, unconstrained `betaUserId` column with a documented singleton-fallback behavior.
- **Why:** Sprint 20 needed a working profile concept fast; Phase H2 needed real per-user isolation for a closed beta without building full authentication.
- **Impact:** This exact pattern (nullable, unconstrained, indexed `betaUserId`, singleton fallback) became the template applied to Portfolio, Recommendation, RecommendationFeedback, and AnalyticsEvent in the same migration — but was **not** applied to `UserMemoryEvent`, created one sprint earlier and missed by this rollout, leaving the gap this session's `PERSONALIZATION-PRIVACY-001` phase found and closed four months of project-time later.

---

## Beta identity and isolation (Phase H2/H3, 2026-07-23)

### D15. Beta user isolation via a nullable, unconstrained `betaUserId`, not real authentication
- **Date/Sprint:** Phase H2 (2026-07-23).
- **Decision:** Add `betaUserId` to the tables that needed it, resolved via an `X-Beta-User-Id` header and best-effort middleware (`betaUserContext.js`) that never blocks a request if the header is missing/unrecognized.
- **Why:** A full authentication system was judged unnecessary for a 2-5 person invite-only closed beta; this was the minimum real fix for the isolation risk found in Phase H1.
- **Impact:** Real, verified per-user isolation for the tables it covers (live-tested with two real beta identities). Explicitly a "closed beta" pattern, not a production auth system — named in `FIVE_YEAR_ARCHITECTURE_ROADMAP.md` as something that must evolve into real accounts/roles well before real scale.

---

## Confidence-blending discipline extended to the frontend (X12 series, 2026-07-24 onward)

### D16. NOVA Design System — two-layer token architecture, opt-in-only glass, no physical CSS directions
- **Date/Sprint:** X12B (2026-07-24).
- **Decision:** Primitive tokens feed semantic tokens; visual "glass" elevation is opt-in, never default (and disabled automatically under High Contrast/reduced-transparency preferences); every stylesheet uses logical CSS properties (`padding-inline-start`, never `padding-left`) exclusively.
- **Why:** A prior design-language review found a real WCAG-AA contrast failure and a brand-accent conflict; RTL support (already shipped in Sprint 35) had zero design-system guidance.
- **Impact:** The logical-property rule directly fixed a real, previously-invisible RTL bug in a shared CSS class used across multiple screens (X12C1.1) — one fix that silently corrected the same latent bug everywhere that class was already used.

### D17. MetricArc — the one scoring primitive, Confidence banded, Attention/Probability fixed-hue
- **Date/Sprint:** X12 series, refined in `DESIGN-SYSTEM-001` (this session, 2026-07-27).
- **Decision:** Confidence's color bands by score; Attention and Probability always use their own fixed, non-banded hue — the three metrics can never visually collide.
- **Why:** A real bug (`PRODUCT_STYLE_GAPS.md`) found Attention's badge tone colliding visually with Confidence's "Moderate" band and a claim's "Weakening" status — three unrelated real signals all rendering identical amber.
- **Impact:** Fixed with a dedicated, exclusive `attention` badge tone; this is a direct frontend implementation of D8's backend-level Confidence/Uncertainty separation principle, extended to a third dimension (Attention).

---

## This session's arc — Workspace Architecture (2026-07-26/27)

### D18. Three-tier screen architecture (Brief / Signals / Context)
- **Date/Sprint:** Mission Control v1 (bundled in `c51048c`), formalized `MISSION-CONTROL-002`.
- **Decision:** Every Workspace screen organizes into exactly three visual/motion tiers — never a fourth, screen-specific treatment.
- **Why:** Consistency across a growing family of intelligence screens; avoids each new screen inventing its own visual hierarchy.
- **Impact:** Every one of the 7 Workspace screens built this session follows this same structure, made possible by extracting it into shared CSS classes (`.mc-tier-1/2/3`) rather than duplicating per screen.

### D19. Per-section Demo Mode, never a single global flag
- **Date/Sprint:** `MISSION-CONTROL-002`, `LIVE-DATA-001`.
- **Decision:** Demo Mode is computed per section of a screen (`liveSections: {section: boolean}`), never as one flag for the whole screen; a section is only "not live" on a real fetch failure, never merely because real data was honestly empty.
- **Why:** A single global flag would either hide a real partial outage or falsely cry "demo" over a section that's genuinely, honestly empty.
- **Impact:** Became the standard pattern for all 7 Workspace screens' `DemoModeBanner` usage; explicitly tested at every phase for the distinction between "real fetch failure" and "real, honest empty result."

### D20. Shared cross-screen state and de-duplicated requests (`PlatformContext`, `requestCache`)
- **Date/Sprint:** `PLATFORM-INTEGRATION-001` (2026-07-27).
- **Decision:** One React context shares `selectedClaim`/`selectedSymbol`/`portfolioContext` across all Workspace screens; a small, explicit, keyed cache de-duplicates identical concurrent/recent requests (never a blanket cache over every API call).
- **Why:** Screens were about to duplicate the same real API calls (e.g., overnight Claim changes) independently; navigating between related screens lost all context.
- **Impact:** A real ordering bug was found and fixed during this same phase (a screen's hero-contribution effect fired against transient fallback data before its real fetch resolved) — directly informing how carefully this kind of shared state needs testing.

### D21. Shared logic modules over screen-local duplication (`claimPresentation.js`, `intelligenceEngine.js`)
- **Date/Sprint:** `DEDUPLICATION-001` and `PLATFORM-INTELLIGENCE-001` (2026-07-27).
- **Decision:** Status/attention presentation logic and ranking/reasoning-pipeline logic each get exactly one shared implementation, consumed by every Workspace screen, rather than each screen writing its own.
- **Why:** An audit (`PLATFORM_DUPLICATION_AUDIT.md`) found three real, independently-drifting duplications, including a byte-identical function copy-pasted between two files with no shared source.
- **Impact:** One deliberate, documented exception: the shared evidence-summarization function ranks by real contribution score before truncating (matching the backend's own rule) rather than the old "first N in API order" — a real behavior refinement, not a silent regression, called out explicitly rather than hidden.

### D22. New engines are additive, never silently replacing an existing consumer-facing endpoint
- **Date/Sprint:** `RELEASE-BLOCKER-001`, `AGENT-ORCHESTRATOR-001` (both 2026-07-27).
- **Decision:** The Agent Orchestrator is deployed as a new, separate route (`/v2/agent-orchestrator/:symbol`), not a replacement of the existing `/v2/symbol-intelligence/:symbol` — even though the mission's own framing suggested it should become "the" Stock Intelligence path.
- **Why:** Wiring a new engine in as a replacement for an existing, already-consumed endpoint is a real behavior change to something already in use; deferring that decision avoids an unreviewed regression.
- **Impact:** Documented explicitly as a known limitation/next-step rather than silently deciding it — the kind of judgment call this document is meant to make visible to a reader who wasn't in the room.

### D23. The Agent Orchestrator's generic Agent interface — metadata/execute/confidence/health only
- **Date/Sprint:** `AGENT-ORCHESTRATOR-001` (2026-07-27).
- **Decision:** Any current or future analytical agent implements exactly four members; the orchestrator itself is proven (via a source-grepping test) to never read an agent's actual analysis content.
- **Why:** The mission required "the Orchestrator must not know business logic" — every agent owns its own analysis, the orchestrator only schedules, aggregates, and reports.
- **Impact:** 3 real agents (Technical, Options, Sentiment) built by adapting already-existing services, never inventing new analysis; 10 more domains registered as honest, inert stubs rather than fabricated placeholder logic. A real bug (an agent assuming a nested object was a flat string) was found via live testing and fixed, with a regression test added — the same class of bug as D17's fix, recurring in a different subsystem.

---

## A pattern across all 23 decisions above worth naming once, explicitly

Nearly every decision in this document that has since been "reaffirmed" or "found violated and re-fixed" shares the same shape: **a real, sound architectural rule was established, then violated in practice by a later feature built under time pressure, then independently rediscovered by an audit, then fixed.** This happened to the Committee's "never a second verdict source" rule (D6, violated for 9 sprints), to `UserMemoryEvent`'s missing user-scoping (D14, undetected for roughly 12 sprints / 4 months of project time), and to two separate "assumed shape didn't match real API response" bugs found only by live testing during this session (D17's precedent, D23's recurrence). This is not evidence any individual decision was wrong — each one, read on its own, is well-reasoned. It is evidence that **this project has no automated mechanism (tests, CI, or otherwise) that catches a *new* violation of an *already-decided* architectural rule** — see `06_TECHNICAL_DEBT.md`'s closing note for the direct connection to the CI/tooling gap.
