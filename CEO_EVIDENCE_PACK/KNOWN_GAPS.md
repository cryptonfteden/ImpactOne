# Known Gaps

Everything still missing, grouped Critical/High/Medium/Low. This is the same ranking as `CEO_AUDIT_EXPORT/06_TECHNICAL_DEBT.md`, restated here in gap form (what's missing, not what's wrong) for this pack's independent-review purpose, with nothing softened.

---

## CRITICAL

1. **Live API keys committed to git history, still open.** `frontend/.env` with real, live `FINNHUB_API_KEY` and `OPENAI_API_KEY` has been committed since Sprint 1/2 (2026-07-09/10). Flagged at least 4 separate times across this project's history (Phase H1, `TOP_10_OPERATIONAL_RISKS.md`, `RED_FLAGS.md`, this session). Never rotated, never scrubbed. **Fixing this requires a founder-level decision** (coordinate key rotation with the live provider accounts; rewriting git history is a destructive, team-impacting operation) — not something an engineering session can do unilaterally.
2. **No confirmed real-user private beta has been completed.** Every "GO"/"READY" verdict in this project's audit trail describes readiness for a beta to *begin*, never evidence one *finished* with real external humans. `CEO_NEXT_12_MONTHS.md`'s own Q1 is built entirely around closing this exact gap.
3. **No crash recovery for the backend process.** Plain `node backend/server.js`, no supervisor, no `uncaughtException`/`unhandledRejection` handlers. Confirmed to have caused real, repeated multi-day undetected outages during independent testing.
4. **No CI/CD pipeline exists at all.** No GitHub Actions/GitLab CI/CircleCI/Jenkins/Azure Pipelines/Travis config anywhere. Named as the root enabling condition for the production-build defect (C3 in `06_TECHNICAL_DEBT.md`) going undetected as long as it did.
5. **No monitoring, error tracking, or alerting.** `GET /health` is a static `{"status":"ok"}` with zero real dependency checks — confirmed, in one prior audit, to report healthy while the frontend was completely broken.
6. **User/account isolation is not confirmed complete across all 50 Prisma models.** Real, working scoping exists for 6 models (`InvestorProfile`, `Portfolio`, `Recommendation`, `RecommendationFeedback`, `AnalyticsEvent`, and — as of this session — `UserMemoryEvent`). This pack did **not** exhaustively re-check the remaining ~44 models for the same gap. This is stated as an open question, not a closed one.

## HIGH

7. **No automated build/test verification gate.** Even with the production build now fixed, nothing prevents a future change from silently re-breaking it.
8. **Two coexisting frontend architectures with no migration plan.** 7 Workspace screens (mature Design System/`PlatformContext`/`requestCache`/`claimPresentation.js`) vs. ~10 screens on the older `components/ui`/`SectionCard` foundation — and this gap widened, not narrowed, this session (2 more Workspace screens added).
9. **No secrets management process.** No secrets manager, no documented rotation process — compounds gap #1.
10. **No working general support/feedback channel.** Only mechanism is a 6-option reaction widget on Recommendation cards; "Help"/"Feedback"/"Terms"/"Product updates" links are inert placeholders. Survivable at 5-user scale, not beyond.
11. **No linting, formatting, or real TypeScript despite appearing to have one.** `typescript` is a listed devDependency with zero `tsconfig.json` and zero `.ts`/`.tsx` files anywhere — described in the project's own audit trail as "worse than not having it at all."
12. **10 of 13 registered Agent Orchestrator agent domains are still honest, inert stubs** (News, Short Interest, Earnings, Valuation, Fibonacci, Insider, ETF Flow, Institutional, Macro, Analyst Consensus) — no real data source connected.
13. **The Agent Orchestrator is not wired as the canonical Stock Intelligence path.** Deliberately left additive to avoid an unreviewed change to `/v2/symbol-intelligence/:symbol` — this decision itself still needs to be made.

## MEDIUM

14. **`requestCache` cache keys are hand-written strings, not derived from real query parameters** — risk of a future edit silently serving stale/wrong-shaped cached data.
15. **No automated check enforces continued Design System adoption** — nothing in CI or lint catches a new screen reintroducing the older pattern.
16. **`PlatformContext` mixes two responsibilities** (selection/navigation state and cached domain-data fetching) with no stated boundary for a third concern.
17. **Per-screen mock-data fallback modules have no shared contract with real backend response shapes** — directly implicated in at least 2 real bugs found this session alone (`macroRegime`, sentiment `trend`).
18. **Three separate, uncoordinated personalization services** (`feedPersonalizationService`, `personalIntelligenceService`, `personalizationService`) compute related-but-distinct notions of user preference with no shared canonical object.
19. **Two coexisting portfolio systems** (server-owned Portfolio Engine and a client-side "virtual portfolio") with no unification plan — currently no observed divergence, but nothing prevents future divergence.
20. **Known `npm audit` vulnerabilities** in dev-tooling transitive dependencies (backend: 4 known; frontend: 1 high-severity as of `RELEASE-BLOCKER-001`) — none in the runtime request path, none remediated this session (out of scope).
21. **No backup/disaster-recovery process for the database.**
22. **No rate limiting on cost-bearing AI/data endpoints** — real, currently small, exposure to a cost spike from repeated/automated calls.
23. **The learning loop has never fed back into which action gets recommended or into committee composition** — only a single, narrow, audited confidence-calibration adjustment (Sprint 41) exists; this remains true today.
24. **Impact Graph / World Memory's actual populated causal-link data is close to empty** — the query/schema logic is real, the underlying data is not yet there.
25. **A real paid data vendor for the Options Agent is not connected** — fully tested foundation, no live vendor connection, no scheduler.

## LOW

26. **Legacy, unreachable screens retained only for test compatibility** (`WatchlistScreen.jsx`, pre-Workspace `AiAnalysisScreen.jsx`).
27. **Two competing CSS color-token systems coexist** (legacy `--success`/`--danger` vs. spec `--h3-positive`/`--h3-negative`) — visual-only, no functional impact.
28. **Several small, cosmetic UI inconsistencies**: an "0 item" pluralization bug, a numbering mismatch in the Design Bible, a couple of untracked hardcoded hex colors, a component 2px over its own corner-radius ceiling, a missing Escape-key handler on one side panel.
29. **No Node.js version pinning** — no `.nvmrc`, no `engines` field; the exact Node version this project runs correctly on is undocumented.

---

## What this session (2026-07-26/27) closed, for direct comparison

For context on what has actually moved since the most recent prior audits: this session closed the production-build defect (was Critical, now fixed and verified), and closed the `UserMemoryEvent` cross-user privacy leak (was Critical/High, now fixed and verified with real multi-user tests). Both are removed from the Critical list above and are **not** re-listed as open gaps — they are the two most consequential items this session actually resolved, out of the full list the project's audit trail has accumulated.
