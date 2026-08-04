# CEO Decision Matrix

One row per sprint/phase/mission, in chronological order. **Implemented** = code/artifact exists. **Verified** = confirmed working by a test run and/or live check (not merely "code was written"). **Risk** is this pack's own judgment, not a quote from any source document, informed by the evidence in `KNOWN_GAPS.md`/`RISK_REGISTER.md`. **CEO Recommendation** is a suggested next action, not a directive.

| Sprint/Phase | Mission | Implemented | Verified | Tests Passed | Build Passed | Commit | Dependencies | Remaining Work | Risk | CEO Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Live Market MVP | Yes | Yes | n/a (pre-tooling) | n/a | `7676e23` | None | Superseded | Low | None — historical |
| 2–13 | MVP feature burst | Yes | Yes | Not separately reported | n/a | `5adf1ee`–`6d023c1` | Sprint 1 | v1 committee/portfolio superseded | Low | None — historical |
| 14 | Production Portfolio Engine | Yes | Yes | Growing suite, count not isolated | n/a | `46f45f3`–`40b2768` | None | Legacy client portfolio never retired | **Medium** (M6, two-portfolio-systems risk still open) | Decide: retire or formally reconcile the legacy client portfolio |
| 15 | MVP Dashboard + Ask ImpactOne | Yes | Yes | Growing suite | n/a | `692293f`–`0345c18` | Sprint 14 | None named | Low | None |
| 16 (A–D) | Autonomous Recommendation Engine | Yes | Yes | Growing suite | n/a | `f6f833e`–`2d1a042` | None | Sprint 17's 20-item backlog | Low (core invariant code-enforced) | None — advisory-only guarantee holds |
| 17 | CTO Architecture Review | Yes (doc) | n/a (planning) | n/a | n/a | `2d1a042` | None | 20 items, several still open today (C1 API keys, C5 no CI) | **Critical** (named items still open 16 sprints later) | Revisit this exact backlog — several items never closed |
| 18A | Canonical Contracts + Committee Debate Layer | Yes | Partial ("READY WITH WARNINGS") | 125 backend/50 frontend | n/a | `f9acd9f`–`0256663` | None | Denylist gap; unreconciled rating pills recurred through Sprint 40 | Medium | None — later resolved (Sprint 41) |
| 20 | Onboarding/Home/Feed/Themes | Yes | **No** (independent review: NOT READY same sprint) | 180 backend/84 frontend | n/a | `d92874e`–`4e8aa3d` | Sprint 18A | Critical layout bug, no onboarding in reviewed build | High at the time; resolved by Sprint 27 | None — historical, resolved |
| 21A | Provider Layer + World Memory | Yes | Yes | Growing suite | n/a | `278a1ef`–`8d8ea40` | None | Most of 15 providers unconfigured for a long stretch | Medium (only 2/22 live even by Sprint 37) | Fund real vendor connections (see `KNOWN_GAPS.md` #14) |
| 23A | First World Memory writer, portfolio delta, six-Q Home | Yes | Yes | n/a | n/a | `9cb8d89`,`62b04e4`,`9cffe42` | Sprint 21A | Feeds Sprint 24 | Low | None |
| 24 | "First Daily User" | Yes | Yes | 248/92 | n/a | `27660eb`–`c474d3c` | Sprint 23A | No scheduler for `PerformanceSnapshot` | Low | None |
| 25 | "Increase Trust" | Yes | Yes | 249/96 | n/a | `3d1861c`–`25216a1` | None | Nav consolidation deferred | Low | None |
| 26 | "Beta Readiness"/Trust Breakers | Yes | Yes (6.5/10, Conditional GO) | 253/96 | n/a | `106e7e9`–`a1ea4df` | None | Confidence-variance flagged; nav complexity | Medium | None — historical |
| 27 | Closed Beta Readiness | Yes | Yes (GO for closed beta) | 259/104 | n/a | `1bc75e2`–`f318f93` | None | Polling architecture; missing skeletons | Low | None |
| 28 | "Morning Intelligence" | Yes | Yes | 265/108 | n/a | `be46582`–`fef46ef` | Sprints 16,20,24 | Home/Dashboard overlap (resolved Sprint 40) | Low | None |
| 29 | Feedback Intelligence Layer | Yes | Yes | 284/114 | n/a | `4eba6e4`–`953b605` | Sprint 21A | Only 24h grading window populated | Low | None |
| 30 | Personal Intelligence Layer v1 | Yes | **No — real privacy flaw introduced** | 301/119 | n/a | `89b33ee`–`99d63ed` | Sprint 20 | `UserMemoryEvent` missing user-scoping — **open ~4 months** | Was Critical, **fixed 2026-07-27** | None — fixed; confirm no other model has the same gap |
| 31 | Learning Made Visible/Measurable/Trustworthy | Yes | Yes | 319/125 | n/a | `b48aba8`–`d12a433` | Sprint 29 | None named | Low | None |
| 32 | "Personal Investment Companion" | Yes | Partial (privacy gap present, not yet found) | 333/133 | n/a | `8f95055`–`f9547d3` | Sprints 29,30,31 | Adaptive Home weights never tuned; the privacy leak (see Sprint 30) | Was Critical, **fixed 2026-07-27** | None — fixed |
| 33 | Mobile Private Beta Candidate | Yes | **No (NO-GO)** at review time | 360/135 | n/a | `e8af43d`–`af0d703` | All prior UX work | 5/12 Section A items unconfirmed | Was High; resolved next sprint | None — historical |
| 34 | Private Beta Go-Live | Yes | **Yes (READY FOR 5 USERS)** | 360/140 | n/a | `de20734`,`515286f` | Sprint 33 | Not ready for 25 (org, not eng) | Low at the time | None |
| 35 | Daily Value & i18n Foundation | Yes | Yes | 365/143 | n/a | `f07c1b6`–`eae4c89` | None | ~25/30 screens still hardcoded English | Low (disclosed scope limit) | Continue i18n rollout when there's real demand |
| 36 | Time To Value | Yes | **No (independent 3/10)** | 374/145 | n/a | `6b30c6b`–`aabd5dc` | None | Recurring false "overlap" claim; new layout regression | Medium (pattern recurrence, see `RISK_REGISTER.md`) | Investigate why this specific claim keeps recurring |
| 37 | Market Intelligence Source Layer | Yes | **No (independent 3/10)** | 462/147 | n/a | `a6ef6f8`–`71b329e` | None | Only 2/22 providers genuinely live | Medium | Same as Sprint 21A |
| 38 | Investment Intelligence Committee v2 | Yes | **No (independent 3/10)** — legacy committee still live and non-independent | 473/148 | n/a | `ba56581`–`a6815be` | Sprint 37 | Two coexisting committees, unreconciled until Sprint 41 | Was High; **resolved Sprint 41** | None |
| 39 | Explainability Engine | Yes | **No (independent 4/10, 4/10, 3/10)** | 489/150 | n/a | `3c1577e`,`590fa70`,`a5a2ea7` | Sprint 38 | Named the legacy-vs-live divergence as top priority | Was High; resolved Sprint 41 | None |
| 40 | Product Excellence/Full Audit | Yes | **No (independent 4/10)** — live reliability failure observed | 489/163 | n/a | `43e82b4`–`9a5f78d` | None | Two-committee problem still the top risk | Was High; resolved Sprint 41 | None |
| 41 | Committee Unification | Yes | **Verdict 0/10 due to uptime, not logic** | 488/164 | n/a | `f294b28`–`c18e2ca` | Sprints 37–40 | Uptime/reliability named as the real remaining problem, not committee logic | Medium (see C4/C5/C6 in `KNOWN_GAPS.md`) | Prioritize crash recovery/CI/monitoring |
| 42 | Intelligence Quality Platform | Yes | **No (independent 3/10, 3/10, 2/10)** | 516/164 | n/a | `c498d23`–`063bdd4` | Sprint 41,29 | System measures but cannot correct itself | Medium | See Roadmap item 13 |
| 43 | Adaptive Intelligence Architecture (design) | Yes (doc only) | **No (independent 2/10 for Phase D readiness)** | n/a | n/a | doc only | Sprint 42 | Training data almost entirely missing | Medium | Do not proceed to real learning until data remediation is real |
| D1 | Learning Data Remediation | Yes (audit) | Confirmed 0% readiness | 549/549 (existing code) | n/a | none (audit-only) | Sprint 43 | 70.8% of graded outcomes were duplicates | High (data quality) | Do not trust historical outcome data without this remediation |
| D1.5–D1.8 | Operational Learning Run through First READY Observations | Yes | Yes (5 real REDUCE recs produced) | n/a (ops runs) | n/a | none (ops-only) | D1 | Grading window wait; natural path still capped by data sparsity | Medium | None — process worked as designed |
| Phase C/D Review | Readiness reviews | Yes (docs) | **NOT APPROVED / NO-GO** | n/a | n/a | none | None | Multiple named blockers, later addressed piecemeal | Historical | None |
| Phase E1–E3.5 | Beta Experience Audit + fixes | Yes | Yes (164–166/164–166 frontend) | 164–166/164–166 | n/a | (see `09_COMMITS.md`) | None | Charts explicitly deferred (feature-add, not fix) | Low | None |
| Phase H1–H3 | Go-Live Audit, blocker resolution, redesign+folders+alerts | Yes | Yes | up to 382/382 backend, 182/182 frontend | n/a | (see commits list) | None | None named | Low | None |
| X2–X11 | Chart/Positioning/Impact Graph/Consolidation/RC/Beta Ops/Adaptive/Learning Loop | Yes | Mixed — X6 was REJECT, X7 fixed and approved | up to 760/760 backend, 298/298 frontend | n/a | (see commits list) | Sequential | X6's blocker class (export mismatch) recurred conceptually in later "assumed shape" bugs | Medium (recurring bug class, see `RISK_REGISTER.md` R7) | Consider a lightweight contract test between mock and real shapes |
| X12A–X12C3.1 | NOVA Design Foundation + first Workspace screens | Yes | Yes (up to 381/381 frontend) | up to 381/381 | n/a | (see commits list) | X-series | X12C3.1's field-name bug is the direct precedent for this session's `macroRegime`/`trend` bugs | Medium | Same recommendation as above |
| Workspace arc #1 | MISSION-CONTROL-001 | Yes | Partial (bundled commit, not isolated) | Passing (bundled) | Not isolated | `c51048c` | None | Superseded immediately | Low | None |
| Workspace arc #2 | MISSION-CONTROL-002 | Yes | Yes | Passing | Dev green | `aa4f851` | #1 | Live data deferred | Low | None |
| Workspace arc #3 | LIVE-DATA-001 | Yes | Yes | Passing | Dev green | `da70ac9` | #2 | Some services partially available | Low | None |
| Workspace arc #4 | PORTFOLIO-001 | Yes | Yes | Passing | Dev green | `2895aed` | #3 | Componentization deferred to #5 | Low | None |
| Workspace arc #5 | DESIGN-SYSTEM-001 | Yes | Yes | Passing, no visual regressions | Dev green | `e155d68` | #4 | No automated adoption-enforcement check | Medium (M2) | Add a lint rule preventing new screens from bypassing the Design System |
| Workspace arc #6 | NEWS-INTELLIGENCE-001 | Yes | Yes | Passing | Dev green | `23f5dbe` | #5 | Cross-screen state deferred to #7 | Low | None |
| Workspace arc #7 | PLATFORM-INTEGRATION-001 | Yes | Yes (real ordering bug found+fixed live) | Passing | Dev green | `6aae4e5` | #6 | Duplication audit deferred to #8 | Low | None |
| Workspace arc #8 | DEDUPLICATION-001 | Yes | Yes | Passing, behavior preserved | Dev green | `8c43b5a` | #7 | None named | Low | None |
| Workspace arc #9 | WATCHLIST-001 | Yes | Yes | Passing | Dev green | `403d816` | #7 | Reasoning centralization deferred to #11 | Low | None |
| Workspace arc #10 | AI-ANALYSIS-001 | Yes | Yes | Passing | Dev green | `70c01c6` | #7 | Same | Low | None |
| Workspace arc #11 | PLATFORM-INTELLIGENCE-001 | Yes | Yes | Passing | Dev green | `a9f9367` | #9,#10 | None named | Low | None |
| Workspace arc #12 | MARKET-INTELLIGENCE-001 | Yes | Yes (live bug found+fixed) | Passing | Dev green | `9a4bd04` | #11 | None named | Low | None |
| Workspace arc #13 | RELEASE-BLOCKER-001 | Yes | **Yes — production build verified passing** | All existing tests green | **Production build: PASSING (fixed)** | `3a9111d` | None | No CI to prevent recurrence | Medium (H1) | Stand up CI as the very next engineering step |
| Workspace arc #14 | PERSONAL-INTELLIGENCE-001 | Yes | Yes | Passing | Dev green | `4fdc5bd` | #11 | Depends on privacy fix (#15) | Was Medium; resolved next | None |
| Workspace arc #15 | PERSONALIZATION-PRIVACY-001 | Yes | **Yes — 1089 backend tests, real multi-user isolation proven** | 1089 backend | Backend + frontend green | `ed3680b` | #14 | 3-way personalization-service fragmentation still open | Medium (H2) | Consolidate the 3 personalization services |
| Workspace arc #16 | AGENT-ORCHESTRATOR-001 | Yes | Yes (2 live bugs found+fixed, 41 new tests) | 41 new + full suite green | Backend + frontend green | `72a6129` | None | 10/13 agents still honest stubs; not yet canonical Stock Intelligence path | Medium | Decide whether/when to fund real agent data sources |
| Workspace arc #17 | CEO-AUDIT-EXPORT-001 | Yes | Yes (all 10 files delivered) | n/a (docs) | n/a | **None (not committed, by design)** | All prior | None | Low | None |
| Workspace arc #18 | CEO-EVIDENCE-PACK-001 (this mission) | In progress | In progress | n/a (docs) | n/a | **None (not committed, by design)** | All prior | Remaining files in this pack | Low | None |

---

## Reading this matrix

The "Verified" column intentionally shows **many "No" entries in the middle of the project's history** — this is not this pack understating quality; it is an accurate reflection that this project was independently, adversarially reviewed at nearly every sprint boundary, and several reviews gave scores as low as 0/10. Nearly every "No"/low-score entry above was followed, within 1–3 sprints, by a "Yes"/resolved entry — the project's own pattern is real problems found, then real problems fixed, repeatedly. The one open exception spanning the longest duration is Sprint 30 → 2026-07-27 (`UserMemoryEvent`'s privacy gap, ~4 months) — now closed.
