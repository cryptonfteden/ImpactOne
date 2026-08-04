# 07 — Roadmap

**Sources:** `CEO_NEXT_12_MONTHS.md`, `PRODUCT_ROADMAP_GAPS.md`, `PHASE2_RECOMMENDATIONS.md`, `FUTURE_PRODUCT_MAP.md`, `MVP_IMPLEMENTATION_ROADMAP.md`, `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`, `ENGINEERING_FOUNDATION_ROADMAP.md`, plus this export's own first-hand record of the Workspace Architecture arc (`01_PROJECT_TIMELINE.md`). Organized as: **Completed** (verified, in this repo, today), **Remaining** (named, planned, not yet done), **Future Vision** (multi-year, speculative by nature — labeled as such).

---

## Completed

### The original MVP arc (Sprints 1–19, 2026-07-09 to -13)
Live market data, real backend integration, OpenAI-backed analysis, watchlist intelligence, a Market Impact Engine, an alternative-data layer, an autonomous daily brief, an Autonomous Market Operating System (v1), an AI Investment Committee (v1), Alpha Discovery, and a virtual paper-trading portfolio — followed immediately by a real, Prisma-backed Portfolio Engine, an Autonomous Recommendation Engine (advisory-only from day one), and a canonical-contract layer (Canonical Event Envelope, Canonical Verdict) unifying the Committee and Recommendation Engine onto one non-contradicting verdict.

### The Personal/Learning Intelligence arc (Sprints 20–32, 2026-07-13 to -16)
Onboarding, Investor Profile, the "four questions" then "six questions" Home model, Daily Feed personalization, Theme Dashboard, the Provider layer (15 real data providers, contract/rate-limiter/retry-policy/health), World Memory (8 append-only models), the Morning Brief (a real merge of Recommendations/Portfolio/Timeline/personalization), User Feedback Capture, Theme Evolution, User Memory, the Personal Intelligence Engine, the Learning Loop, Outcome Intelligence, Calibration Reports, Personal Progress, Investor Memory, Adaptive Home, Decision Review, and an Educational Layer.

### The Private Beta arc (Sprints 33–36, 2026-07-16 to -18)
PWA installability, mobile-first navigation, offline/resilience hardening, honest empty-state discipline ("nothing changed" vs. "data unavailable," always distinguished), the Private Beta launch package, i18n/RTL foundation, anonymous analytics/telemetry, and Time-To-Value instrumentation.

### The Committee Unification and Explainability arc (Sprints 37–42, 2026-07-19 to -22)
The Market Intelligence Source Layer (canonical evidence categories feeding the Committee), the Investment Intelligence Committee framework (built on that evidence matrix), an Explainability Layer, conversational search, and — critically — **Sprint 41's unification to exactly one committee, one CIO, one execution path**, replacing any earlier duplicate committee logic, with tests proving the invariant. Recommendation lifecycle tracking, a performance engine, and committee/CIO/evidence scorecards followed.

### The Workspace Architecture arc (2026-07-26–27, this session)
Five new "Workspace" screens built on one shared architecture (Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace, Market Intelligence Workspace, Personal Intelligence Workspace — seven in total), a shared Design System (`DESIGN-SYSTEM-001`), shared cross-screen state and request de-duplication (`PLATFORM-INTEGRATION-001`), a shared claim-presentation module closing three real duplications (`DEDUPLICATION-001`), a shared Intelligence Engine consolidating ranking/reasoning logic across all Workspaces (`PLATFORM-INTELLIGENCE-001`), **the production build fixed at its root** (`RELEASE-BLOCKER-001`), **a real cross-user data leak in Investor Memory closed** (`PERSONALIZATION-PRIVACY-001`), and a new generic Agent Orchestrator engine for Stock Intelligence (`AGENT-ORCHESTRATOR-001`) with 3 real agents and 10 prepared registrations for future ones.

---

## Remaining (named, planned, not yet started or in progress)

### Immediate engineering foundation (per `ENGINEERING_FOUNDATION_ROADMAP.md`, `PHASE2_RECOMMENDATIONS.md`)
1. Stand up CI/CD (nothing exists today) — run the full test suite and `npm run build` on every push, blocking merge on failure. This is now unblocked by the production-build fix already completed, and is named across multiple sources as "the single most consequential remaining gap."
2. Adopt ESLint (repo has never been linted) and Prettier.
3. Pin the Node.js version (`.nvmrc`/`engines`); document a real version-upgrade policy.
4. Resolve the exposed API-key secrets in git history — requires a founder-level decision to rotate keys and rewrite history, not an engineering-only fix.

### Product/architecture consolidation (per `PRODUCT_ROADMAP_GAPS.md`, `PHASE2_RECOMMENDATIONS.md`, `PLATFORM_TECH_DEBT.md`)
5. Decide and execute a migration plan for the ~10 screens still on the older frontend architecture, or explicitly retire the ones that are redundant with a Workspace screen.
6. Build one canonical "is this held/relevant to me" service, one attention-arbitration layer, and one composed "what does the platform believe about this symbol" view — currently up to 4 independently-labeled opinions can exist for one symbol across different screens/engines.
7. Name and resolve the relationship between the growing set of "Workspace" screens (Mission Control, Intelligence Workspace, Portfolio Workspace, and the four newer ones from this session) — currently siblings with no stated hierarchy.
8. Wire the new Agent Orchestrator in as the canonical Stock Intelligence path (deliberately left as a separate, additive endpoint in `AGENT-ORCHESTRATOR-001` to avoid an unreviewed change to the existing consumer-facing endpoint).
9. Build the 10 not-yet-real analytical agents the Orchestrator has prepared registrations for (News, Short Interest, Earnings, Valuation, Fibonacci, Insider, ETF Flow, Institutional, Macro, Analyst Consensus) — each currently an honest, inert stub.

### Beta operations (per `CEO_NEXT_12_MONTHS.md` Q1, `TOP_10_OPERATIONAL_RISKS.md`, `RED_FLAGS.md`)
10. Run the first real, complete private beta to a documented finish (no evidence found in the audit trail that this has actually occurred with real external users yet, as of the most recent CEO-facing documents read for this export).
11. Stand up crash recovery (process supervision, restart-on-crash), real monitoring/error-tracking/alerting, and a working support/feedback channel beyond the existing 6-option reaction widget.
12. Ship a visible track-record/calibration screen — named across multiple documents as "the highest-leverage trust feature the product doesn't yet have."

### The learning loop (per `PRODUCT_ROADMAP_GAPS.md` Tier 3, `WORLD_CLASS_GAP_ANALYSIS.md` referenced in `CEO_FINAL_PRODUCT_REVIEW.md`)
13. Close the loop between graded outcomes and the decisions themselves — today, the feedback loop adjusts a confidence score attached to an already-decided action; it has never fed back into which action gets recommended, or into committee composition/weighting, which remain static hand-set logic by explicit design.

### Data breadth (per `PRODUCT_ROADMAP_GAPS.md` Tier 2, `CEO_RECOMMENDATIONS.md`)
14. Fund and connect a real paid data vendor for the Options Agent (foundation exists and is fully tested — 817/817 backend tests passing per one audit — but has no live vendor connection, no scheduler, and until this session's `AGENT-ORCHESTRATOR-001`, no reachable frontend surface at all). Named as "the single highest-leverage unlock" for both the Options Agent specifically and the broader "operating system" narrative.
15. Populate the Impact Graph/World Memory with real causal-link data — the query/schema logic is real but the actual data behind it is close to empty.

---

## Future Vision (multi-year; explicitly speculative/aspirational, sourced from planning documents rather than committed work)

### Year 1 (per `CEO_NEXT_12_MONTHS.md`)
Four quarters, each gated on the prior being *measurably* done, not calendar-scheduled: (Q1) close every Critical finding and run a real 25-person beta to completion; (Q2) grow 25→250 users with a staged 100-user gate, ship a visible track-record screen; (Q3) grow 250→1,000, ship Family/Mentor Mode and a non-cash referral mechanism, complete an accessibility pass; (Q4) decide, with evidence, whether to leave closed/invite-only growth, publish the platform's first annual honest retrospective, and begin a careful, narrow monetization test that never gates the free evidence/confidence/uncertainty core.

### The 5-year infrastructure path (per `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`)
A staged evolution from today's single-instance, single-database, in-memory-cache architecture through 100 → 1,000 → 10,000 → 100,000 → 1,000,000 users, each stage adding real infrastructure (Redis, read replicas, a real queue/broker, multi-provider AI routing, sharding, a dedicated graph database, eventually a proprietary model trained on the platform's own accumulated outcome data) only as each prior stage's evidence justifies it — explicitly not built ahead of need.

### What must never change, at any scale (per `FUTURE_PRODUCT_MAP.md`, `THE_100_YEAR_COMPANY.md`, `IMPACTONE_2031.md`)
The advisory-only boundary (structurally enforced, never just promised); exactly one canonical verdict per symbol, never two disagreeing answers; confidence and uncertainty kept as two separate, honest numbers, never blended into one; an honest, gradable track record including every miss, with no expiration; the free evidence-and-honesty core, permanently; no dark patterns, manufactured urgency, or engagement-optimized notifications, regardless of what a growth team could demonstrate "would work." The recurring governing test across these documents: **"a growth number achieved by relaxing a trust commitment is not growth — it is a different, worse company wearing this one's name."**

### What is expected to evolve (per `FUTURE_PRODUCT_MAP.md`)
Navigation and screen structure (today's ~16-item sidebar "has no business existing" at real scale); the education layer, from contextual to deeply adaptive; community, from a small private channel to a self-moderating structure; asset-class and geographic coverage; the Knowledge Graph, to genuine scale; personalization depth; monetization sophistication (tiers, household plans, institutional/education partnerships) — evolving structure, never the free-core commitment itself.

---

## A note on how to read this roadmap

The audit trail this document draws from is unusually candid about the gap between what has been *built* and what has been *proven with real users* — several sources (`CEO_FINAL_PRODUCT_REVIEW.md`, `PRODUCT_ROADMAP_GAPS.md`) state plainly that the platform currently "reasons more than it decides, observes more than it acts" and that its data layer is thinner than its reasoning layer. The "Completed" section above is long and real; it should not be read as evidence that the product is ready for a wide release — see `10_EXECUTIVE_NOTES.md` for the CEO-facing synthesis of that distinction.
