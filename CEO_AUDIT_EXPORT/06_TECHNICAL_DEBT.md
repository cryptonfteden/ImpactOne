# 06 — Technical Debt & Known Issues

**Sources:** this file synthesizes findings directly from the repo's own audit trail — `CRITICAL_BUGS.md`, `RED_FLAGS.md`, `TOP_10_OPERATIONAL_RISKS.md`, `RELEASE_BLOCKERS.md`, `PLATFORM_TECH_DEBT.md`, `TOOLING_GAPS.md`, `POST_BETA_BACKLOG.md`, `KNOWN_LIMITATIONS.md`, and this export's own `RELEASE_BLOCKER_REPORT.md`/`PERSONALIZATION_PRIVACY_REPORT.md`. Ranked Critical / High / Medium / Low. **A rank here reflects what the source document said at the time it was written** — several Critical items below were subsequently fixed in this session (noted explicitly); this file does not silently update history, it states both the original finding and its current resolution status.

**Read this file with one caveat in mind:** many of these audit documents are themselves dated at different points in the project's history and may describe a state that has since changed. Where this export can confirm a fix directly (because this session performed it), that is stated. Where it cannot, the original finding is reported as-is with its original date/phase — do not assume it is still open OR still fixed without direct current verification.

---

## CRITICAL

### C1. Live API keys committed to git history — **STILL OPEN**
`frontend/.env` containing real, live `FINNHUB_API_KEY` and `OPENAI_API_KEY` was committed in plaintext since Sprint 1/2 (commits `7676e23`, `5d855ea`, 2026-07-09/10) and confirmed still present in git history and still functioning as of `CRITICAL_BUGS.md` (Phase H1). **Flagged repeatedly across multiple sessions in this engagement, including this one, and never remediated** — rotating the keys and scrubbing git history is a user/founder decision (requires coordinating a key rotation with the live provider accounts), not something an engineering session should do unilaterally. This is the single most-repeated unresolved finding in the entire audit trail.

### C2. No real user/account isolation for the paper-trading Portfolio and Investor Profile — **PARTIALLY FIXED, NOT FULLY CLOSED**
Originally: `Portfolio` and `InvestorProfile` were true singletons (`findFirst()`, no `userId`/`betaUserId` column), meaning every beta user would share one portfolio and overwrite one another's profile (`CRITICAL_BUGS.md` Phase H1, `TOP_10_OPERATIONAL_RISKS.md` #1). **Since then**, a real `BetaUser` model and a nullable, unconstrained `betaUserId` column were added across `InvestorProfile`, `Portfolio`, `Recommendation`, `RecommendationFeedback`, `AnalyticsEvent` (the "H2 Beta User Isolation" migration, `20260723194539_h2_beta_user_isolation`) — real, working per-user scoping now exists for these models. **However**, this session's own `PERSONALIZATION-PRIVACY-001` phase found and fixed a related, separate instance of the *same class* of bug in `UserMemoryEvent` (Investor Memory) — meaning the isolation work, while real, was not applied uniformly to every model that needed it. **Open question for a future audit**: whether any other model still lacks this scoping (this export did not exhaustively re-check all 50 Prisma models for this pattern).

### C3. Production build (`npm run build`) — **FIXED IN THIS SESSION**
Was reported broken 100% of the time across multiple independent audit passes (`BUILD_HEALTH_REPORT.md`, `PRODUCTION_BUILD_FIX_PLAN.md`, `TOOLING_GAPS.md`, `ENGINEERING_FOUNDATION_ROADMAP.md` all named this the single most consequential engineering gap). Root cause, found and fixed in this session's `RELEASE-BLOCKER-001` phase: a literal `*/` inside a comment's own descriptive text in `theme.css` prematurely closed the file's header comment, desyncing the rest of the file — invisible in dev-mode, fatal to Vite 8's production `lightningcss` minifier. Fixed with a one-character-effective edit; dependencies pinned; `vite.config.js` added (previously absent entirely). Verified: build succeeds, tests unaffected (555/555 at the time). **Status: closed**, but see H1 below (no CI to prevent recurrence).

### C4. No crash recovery for the backend process
`npm run server` is a bare `node backend/server.js` with no nodemon/pm2/systemd, no `uncaughtException`/`unhandledRejection` handlers, no graceful shutdown (`TOP_10_OPERATIONAL_RISKS.md` #2). Confirmed to have caused real, repeated multi-day undetected outages during independent testing (`RED_FLAGS.md` #6). **Not addressed in this session** — this is an infrastructure/ops change, not an application code fix, and was outside the scope of every phase this session executed.

### C5. No CI/CD pipeline of any kind
Confirmed by direct search: no GitHub Actions, GitLab CI, CircleCI, Jenkins, Azure Pipelines, or Travis config anywhere in the repo (`TOOLING_GAPS.md`). Named as "the root enabling condition for every other tooling gap" — the broken build (C3) went undetected for as long as it did specifically because nothing automated ever ran `npm run build`. **Not addressed in this session.**

### C6. No monitoring, error tracking, or alerting
`GET /health` returns a static `{"status": "ok"}` with zero real dependency checks (`TOP_10_OPERATIONAL_RISKS.md` #4, `RELEASE_BLOCKERS.md` #2) — confirmed directly, in one audit pass, to report healthy while the frontend was completely broken. No APM, no error-tracking SDK, no uptime alerting anywhere. **Not addressed in this session.**

---

## HIGH

### H1. No automated build/test verification gate (a consequence of C5)
Even with the build now fixed (C3), nothing prevents a future change from silently re-breaking it — there is no CI step that runs `npm run build` on every push. This is the most direct, actionable next step following this session's build fix.

### H2. Two coexisting frontend architectures with no migration plan
`PLATFORM_TECH_DEBT.md` (TD1): 5 screens (Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace) share the mature Design System/`PlatformContext`/`requestCache`/`claimPresentation.js` stack; roughly 10 other screens (Recommendations, Daily Feed, Alerts, Themes, Global Intelligence, Intelligence Console/Workspace, Decision Timeline, Market Positioning, and the superseded legacy screens) remain on the older `components/ui`/`SectionCard` foundation. **Since this finding, two more Workspace screens were added** (Market Intelligence Workspace, Personal Intelligence Workspace) on the modern stack, widening the gap rather than closing it — this is a compounding debt, not a static one.

### H3. No user isolation for `UserMemoryEvent` (Investor Memory) — **FIXED IN THIS SESSION**
Found by an external review (`PERSONAL_INTELLIGENCE_REVIEW.md`) as the "single most important thing to fix" in the personalization architecture: `UserMemoryEvent` had no `betaUserId` field at all, and every read queried it globally across all users — meaning "this investor's favorite sectors/reading depth" was actually every user's combined activity. Fixed at the root in this session's `PERSONALIZATION-PRIVACY-001` phase: schema migration adding `betaUserId`, every repository read now requires and filters by it (returning an honest empty result rather than a global blend when identity is missing), `investorMemoryService.js` now hard-requires identity, 5 new real multi-user isolation tests added. **Status: closed**, verified with real, database-backed tests proving one user's activity cannot affect another's memory.

### H4. Secrets management has no real process (compounds C1)
No secrets manager, no documented rotation process — `.env`-file-based secrets are described as "near-term and security-critical" across multiple planning documents (`ENGINEERING_FOUNDATION_ROADMAP.md`, `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`'s "technologies likely replaced" table).

### H5. No working general support/feedback channel
Only functioning feedback mechanism is a 6-option reaction widget on Recommendation cards; "Help," "Feedback," "Terms," and "Product updates" links are inert placeholders (`TOP_10_OPERATIONAL_RISKS.md` #3, `CRITICAL_BUGS.md` #3, `RED_FLAGS.md` #5). Judged survivable at very small (5-user) beta scale where a founder can personally track every user, but not beyond it.

### H6. No ESLint, Prettier, or real TypeScript despite appearing to have one
`TOOLING_GAPS.md`: zero lint config anywhere; zero format config anywhere; `typescript` is listed as a devDependency but **no `tsconfig.json` and zero `.ts`/`.tsx` files exist anywhere** — described as "worse than not having TypeScript at all," because it creates a false impression of type safety that isn't real. Confirmed still true as of this session (no lint/format config was found or added in any phase executed here).

---

## MEDIUM

### M1. `requestCache` cache keys are hand-written strings, not tied to real query parameters
`PLATFORM_TECH_DEBT.md` (TD2): e.g. `"claims:overnight-changes:10"` is duplicated as a literal string across multiple files rather than derived from the actual call's parameters — real risk of a future edit silently serving stale or wrong-shaped cached data if a parameter changes but the hand-written key doesn't.

### M2. No automated check enforces continued architectural adoption
`PLATFORM_TECH_DEBT.md` (TD3) — nothing in CI or lint currently catches a new screen reintroducing the older `components/ui` pattern instead of the Design System.

### M3. `PlatformContext` mixes two responsibilities
`PLATFORM_TECH_DEBT.md` (TD4) — cross-screen selection/navigation state and cached domain-data fetching (`portfolioContext`) live in the same context, with no stated boundary for where a third concern would go.

### M4. Per-screen mock-data files have no shared contract with real backend response shapes
`PLATFORM_TECH_DEBT.md` (TD5) — each Workspace screen's fallback mock module was hand-written to mirror what its author believed the real shape was; at least two real bugs this session (`macroRegime` being an object not a string in Market Intelligence Workspace; `trend` being a structured object not a string in the Agent Orchestrator's Sentiment agent) were exactly this class of mismatch, caught only by live testing, not by any shared type contract.

### M5. Watchlist-priority next-action threshold logic has no shared home
`PLATFORM_TECH_DEBT.md` (TD6) — flagged as already once duplicated before being consolidated (see `04_ARCHITECTURE_DECISIONS.md`'s account of `DEDUPLICATION-001` and `PLATFORM-INTELLIGENCE-001`); a specific remaining instance was named at the time of the tech-debt audit and has since been folded into the shared `intelligenceEngine.js` (`recommendNextAction`) as part of this session's work — **effectively addressed**, though the audit that named it predates that fix.

### M6. Two coexisting portfolio systems with no unification plan
`KNOWN_LIMITATIONS.md` (Sprint 34): a server-owned Portfolio Engine and a separate client-side "virtual portfolio" (localStorage-backed) both exist; both currently start from the same $100,000 baseline so no divergence has been observed, but nothing prevents future divergence if either accumulates independent trade history.

### M7. `npm audit` reports known vulnerabilities in dev-tooling dependencies
`POST_BETA_BACKLOG.md`: 4 known vulnerabilities in backend dev-tooling transitive dependencies (`@prisma/dev`'s `@hono/node-server`, `fast-uri`) — none in the runtime request path. This session's own `RELEASE-BLOCKER-001` phase separately reconfirmed "1 high severity vulnerability" via `npm audit` on the frontend, also left unaddressed as out of that phase's scope.

### M8. No backup/disaster-recovery process for the database
`TOP_10_OPERATIONAL_RISKS.md` #7 — no scheduled `pg_dump`, retention policy, or restore runbook exists anywhere for the one shared Postgres database that now holds real (if beta-scale) user and portfolio data.

### M9. No rate limiting on cost-bearing AI/data endpoints
`TOP_10_OPERATIONAL_RISKS.md` #8 — real, if currently small (personal-budget-scale), exposure to an unexpected cost spike from repeated or automated calls to OpenAI/Finnhub-backed endpoints.

---

## LOW

### L1. Legacy, unreachable screens retained for test compatibility only
`PLATFORM_TECH_DEBT.md` (TD9): `WatchlistScreen.jsx` and the pre-Workspace `AiAnalysisScreen.jsx` are kept solely because their existing tests still pass, not because they're reachable from navigation.

### L2. Two competing CSS color-token systems
`POST_BETA_BACKLOG.md`: legacy `--success`/`--danger` vs. spec `--h3-positive`/`--h3-negative` coexist in `styles.css` — visual-only, no functional impact.

### L3. Several small, cosmetic UI inconsistencies
Documented across multiple audits: an "0 item" pluralization bug, a numbering mismatch between two sections of the Design Bible, a couple of hardcoded (untracked) hex colors on two legacy CSS selectors, a component with a corner radius 2px over its own documented ceiling, a missing Escape-key handler on one side panel.

### L4. No Node.js version pinning
`TOOLING_GAPS.md`/`ENGINEERING_FOUNDATION_ROADMAP.md`: no `.nvmrc`, no `engines` field in either `package.json` — the exact Node version this project runs correctly on is undocumented.

---

## A pattern worth naming explicitly

Several of this export's own source phases (`RELEASE-BLOCKER-001`, `PERSONALIZATION-PRIVACY-001`, `AGENT-ORCHESTRATOR-001`) each independently found and fixed a **real, previously-undetected bug via live testing that no unit test alone had caught** — a broken production build, a cross-user data leak, and two separate "assumed a nested object was a flat string" bugs. This is not a coincidence particular to any one phase; it reflects the gap named directly in C5/H1 above: **without CI running the real build and without any automated contract between mock data and real API shapes (M4), these classes of bugs will keep recurring**, each one only as reliably caught as the next engineer's willingness to actually run the thing live rather than trust the test suite alone.
