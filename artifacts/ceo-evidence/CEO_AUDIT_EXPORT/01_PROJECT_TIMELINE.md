# 01 — Project Timeline

**Sources:** `PROJECT_STATUS.md`, every `SPRINT_*_REPORT.md`/`*_VERDICT.md`/`*_EXECUTIVE_MEMO.md`, every `PHASE_*_REPORT.md`/`*_REVIEW.md`, every `X*_COMPLETION_REPORT.md`/`*_VERDICT.md`, `SPRINT17_MASTER_PLAN.md`, `SPRINT_18A_AUDIT.md`, `SPRINT_18B_RIE_IMPLEMENTATION_PLAN.md`, the full `git log`, and — for the final arc — this session's own first-hand execution record. Every sprint/phase the repo's own documentation names is included below, in chronological order. Where a sprint has no dedicated report (Sprints 2–13, MVP burst day), it is grouped and described from `PROJECT_STATUS.md` and commit messages.

**A note on precision:** many "Status" fields below quote a verdict a review document issued *at the time it was written* (e.g. "NO-GO," "BLOCKED," "REJECT"). Several of these were reversed by a subsequent sprint (e.g. Sprint 33's "NO-GO" became Sprint 34's "READY FOR 5 USERS"; X6's "REJECT" became X7's approval). Read each entry's status as a point-in-time snapshot, not a final verdict on the whole project — the project's current, most-recent state is summarized at the end of this file and in `10_EXECUTIVE_NOTES.md`.

---

## Sprint 1 — Live Market MVP
- **Date:** 2026-07-09
- **Goal:** First working end-to-end product with live market data.
- **Files changed:** Initial application scaffold.
- **Commits:** `7676e23`.
- **Decisions:** None documented beyond "get something live."
- **Status:** Complete.
- **Dependencies:** None (founding sprint).
- **Outstanding work:** Everything — this is the starting point.

## Sprints 2–13 — MVP feature burst (single day)
- **Date:** 2026-07-10
- **Goal:** Rapidly establish the original product surface: backend integration, real AI analysis, comparison/watchlist intelligence, a Market Impact Engine, a premium UI pass, a production-architecture pass, an alternative-data layer, an Impact Intelligence Engine, an autonomous daily brief, an Autonomous Market Operating System, an AI Investment Committee (v1), an Alpha Discovery Engine, and a virtual paper-trading portfolio.
- **Files changed:** Broad, undifferentiated per-sprint commits (no per-file breakdown recorded in `PROJECT_STATUS.md` at this granularity).
- **Commits:** `5adf1ee`, `5d855ea`, `b34554e`, `8e641a8`, `b71b59a`, `87ff9b8`, `04f338a`, `615ba6f`, `a5b9251`, `10b537a`, `0541772`, `7d48489`, `445389a`, `a477017`, `eb52a27`, `4052953`, `6d023c1`.
- **Decisions:** No `DATABASE_URL`/persistence yet (Prisma introduced next sprint) — this entire arc ran on in-memory/mock state.
- **Status:** Complete, later substantially rebuilt (the v1 Investment Committee here is not the same system as the Sprint 38/41 unified Committee; the v1 portfolio is the "virtual/legacy" portfolio later found to coexist, unresolved, with the real Portfolio Engine).
- **Dependencies:** None.
- **Outstanding work:** Real persistence, real auth, a non-mock news pipeline — all addressed starting Sprint 14.

## Sprint 14 — Production-Grade Portfolio Engine
- **Date:** 2026-07-11
- **Goal:** Replace the virtual portfolio concept with a real, persisted Portfolio Engine.
- **Files changed:** `prisma/schema.prisma` (first schema), `portfolioRepository.js`, `portfolioEngineService.js`, `/api/v2/portfolio` routes/controller, `finnhubService.js` refactor, frontend `portfolioEngineApi`/hook, `PortfolioScreen.jsx` (behind feature flag), first Vitest infra.
- **Commits:** `46f45f3` through `40b2768` (9 commits).
- **Decisions:** **Prisma/Postgres introduced** as the sole persistence layer. **Vitest introduced** as the frontend test framework. Feature-flagged rollout (`VITE_PORTFOLIO_ENGINE=api`) rather than a hard cutover.
- **Status:** Complete.
- **Dependencies:** A running Postgres instance, now required for the first time.
- **Outstanding work:** The legacy client-localStorage portfolio was not retired — this created the "two coexisting portfolio systems" architectural decision (and later-flagged risk) that persists through most of the project's history.

## Sprint 15 — MVP Dashboard + Ask ImpactOne
- **Date:** 2026-07-11
- **Goal:** Real MVP dashboard composition; first conversational query endpoint.
- **Files changed:** `DashboardHome.jsx` rewrite, 9 new dashboard section components, `Header.jsx` extension, `chatService.js`/chat endpoint, `DailyBriefSnapshot` model.
- **Commits:** `692293f` through `0345c18` (13 commits).
- **Decisions:** MVP product spec, roadmap, test plan, and API contracts formally documented for the first time.
- **Status:** Complete.
- **Dependencies:** Sprint 14's Portfolio Engine.
- **Outstanding work:** None specifically named; superseded by Sprint 16's Recommendation Engine focus.

## Sprint 16 (Phases A–D) — Autonomous Recommendation Engine
- **Date:** 2026-07-11
- **Goal:** Build the advisory-only Autonomous Recommendation Engine and its full explanation/evidence chain.
- **Files changed:** `Recommendation`/`AutonomousRunLog`/`DecisionTrace` schema, `autonomousRecommendationEngine.js`, `schedulerService.js`, `RecommendationsScreen.jsx`, live-quote/live-news wiring, dynamic news-query building, personalized relevance/citations, bull/base/bear scenario generation, quality score.
- **Commits:** 24 commits from `f6f833e` through `2d1a042`.
- **Decisions:** **"Advisory-only, no execution" established as a foundational, structural invariant** — confirmed later (`CANONICAL_DOMAIN_MODEL.md` §2.16) as a code-level guarantee (no `placeOrder` import exists anywhere in the recommendation path), not just a policy. **`DecisionTrace` introduced** as the permanent, immutable per-recommendation audit record.
- **Status:** Complete.
- **Dependencies:** Live news feed, live quote data, Sprint 14's Portfolio Engine (for portfolio-aware recommendations).
- **Outstanding work:** Sprint 17's CTO architecture review (next) identified 20 platform-hardening items not yet addressed.

## Sprint 17 — CTO Architecture Review (planning only)
- **Date:** 2026-07-11
- **Goal:** Assess production readiness ahead of institutional/AI-agent consumers; no implementation.
- **Files changed:** None (document only — `SPRINT17_MASTER_PLAN.md`).
- **Commits:** `2d1a042`.
- **Decisions:** Ranked 20 items (7 critical, 6 high, 5 medium, 2 nice-to-have) into 6 planned sub-sprints. Named, for the first time in writing: leaked API keys in git, no auth/tenancy, wildcard CORS, an `err.status`/`error.statusCode` mismatch causing wrong HTTP codes, 5 duplicated in-process caches, no CI, dependencies pinned to `"latest"`.
- **Status:** Planning complete; execution deferred and only partially picked up across many later sprints (the API-key and dependency-pinning items, notably, remained unresolved for most of the project's subsequent history — see `06_TECHNICAL_DEBT.md`).
- **Dependencies:** None.
- **Outstanding work:** All 20 items — this document effectively became the project's standing backlog for engineering hygiene.

## Sprint 18A — Canonical Contracts + Committee Debate Layer
- **Date:** 2026-07-12
- **Goal:** Prevent the Committee and Recommendation Engine from ever returning conflicting verdicts.
- **Files changed:** `scoringVocabulary.js`, `eventEnvelope.js`, `canonicalVerdict.js`, `investmentCommitteeService.js`, `committeeController.js`, `aiController.js`, `autonomousRecommendationEngine.js`, `RecommendationCard.jsx`, `AiAnalysisScreen.jsx`.
- **Commits:** 9 commits from `f9acd9f` through `0256663`.
- **Decisions:** **Canonical Verdict contract established** — one normalized action vocabulary. **The Investment Committee is folded into a debate/explanation layer with no independent persisted verdict** — the single most-repeated architectural rule in the project's history (re-affirmed at Sprint 41, and again structurally in `CANONICAL_DOMAIN_MODEL.md` §1.7/§2.17).
- **Status:** "READY WITH WARNINGS" per independent audit (`SPRINT_18A_AUDIT.md`) — 125 backend/50 frontend tests passing.
- **Dependencies:** Sprint 16's DecisionTrace/Recommendation Engine.
- **Outstanding work (from the audit):** `FORBIDDEN_COMMITTEE_KEYS` denylist omitted the literal word "rating"; an unversioned breaking rename on a legacy route; AI Analysis screen still showed 3 other unreconciled rating pills alongside the now-neutral committee panel. **This exact class of issue (multiple unreconciled "opinion" surfaces on one screen) recurred and was independently re-found in Sprints 38, 39, and 40, and was not fully resolved until Sprint 41.**

## Sprint 18B — Research Intelligence Engine plan (not executed as its own sprint)
- **Date:** ~2026-07-12
- **Goal:** Plan a first production slice of a Research Intelligence Engine (SEC filings, earnings, news, macro releases via the canonical Event Envelope).
- **Files changed:** None (planning document).
- **Commits:** None directly.
- **Decisions:** No new infrastructure (reuse `node-cron`, no Redis/Kafka); defer cross-source corroboration; flag-gated cutover with shadow mode first.
- **Status:** Superseded — this specific numbered plan does not appear to have been implemented as written; its intent was absorbed into the later, broader provider framework (Sprint 21A) and Market Intelligence Source Layer (Sprint 37).
- **Dependencies:** N/A.
- **Outstanding work:** The plan itself, as written, was never directly executed.

## Sprint 20 — Onboarding, Home Redesign, Daily Feed, Theme Dashboard
- **Date:** 2026-07-13
- **Goal:** "My First Daily Experience" — real onboarding, a four-question Home model, a real (not mock) Daily Feed, personalized ranking, and a Theme Dashboard.
- **Files changed:** `InvestorProfile` model/service, `homeSummaryService.js`, `feedPersonalizationService.js`, `themeIntelligenceService.js`, `ThemeConfidenceSnapshot` model, `OnboardingFlow.jsx`, `HomeScreen.jsx`, `ThemeDashboardScreen.jsx`.
- **Commits:** 12 commits from `d92874e` through `4e8aa3d`.
- **Decisions:** **Home becomes the default landing screen**, replacing the prior Dashboard. **"Four questions" Home model established** (widened to six in Sprint 24). **Deterministic (non-LLM) generation** chosen for the AI Investment Profile — every number an explicit, disclosed assumption, never a live computation presented as fact.
- **Status:** Complete per the engineering report (180 backend/84 frontend tests, live-verified) but **NOT READY per the independent Product Review** (`SPRINT_20_PRODUCT_REVIEW.md`) run the same sprint: Critical first-load layout breakage, no onboarding running in the reviewed build, up to 4 unreconciled "verdict" signals on AI Analysis, several placeholder screens, a branding/audience mismatch.
- **Dependencies:** Sprint 18A's canonical verdict contract.
- **Outstanding work:** Every Critical/High item from the Product Review — largely addressed across Sprints 24–27's "Trust" and "Beta Readiness" focus.

## Sprint 21A — Provider Layer + World Memory
- **Date:** 2026-07-13
- **Goal:** Build a real, contract-based data-provider framework and the platform's permanent long-horizon memory layer.
- **Files changed:** `CanonicalEvent`/`ProviderRunLog` schema, `canonicalEventRepository.js`, provider contract/rate-limiter/retry-policy/factory, 15 provider definitions, `providerIngestionService.js`, provider health/scheduler/ops routes, `World Memory` schema (8 models), `worldMemoryRepository.js`, `CANONICAL_DOMAIN_MODEL.md`, dev-only Intelligence Console.
- **Commits:** 18 commits from `278a1ef` through `8d8ea40`.
- **Decisions:** **Provider Contract established** as the one shared interface every data provider implements. **World Memory introduced** as 8 append-only models — the project's first explicit "never edit, only append/supersede" commitment, later reaffirmed as a permanent architectural rule (`ARCHITECTURE.md` §6.7, `CANONICAL_DOMAIN_MODEL.md`). **`CANONICAL_DOMAIN_MODEL.md` created** as the single source of meaning for the platform's core vocabulary. **Dev-only Intelligence Console introduced**, gated by `VITE_DEV_CONSOLE` — the precedent every later dev-console-gated screen follows.
- **Status:** Complete.
- **Dependencies:** None new beyond existing Postgres/Prisma.
- **Outstanding work:** Of the 15 providers registered, most remained unconfigured/inactive for a long stretch of the project's history (see Sprint 37, which grew the registry to 22 and found only 2 genuinely live).

## Sprint 23A / pre-24 — First World Memory Writer, Portfolio Delta, Six-Question Home
- **Date:** 2026-07-14 (early)
- **Goal:** Wire the first real writer into World Memory; add real day-over-day portfolio performance; widen Home from four to six questions.
- **Files changed:** `WorldMemoryThesisRevision` writer, `portfolioEngineService.getPerformanceDelta()`, `homeSummaryService.js` extension.
- **Commits:** `9cb8d89`, `62b04e4`, `9cffe42`.
- **Decisions:** The "four questions" Home model (Sprint 20) is retired in favor of six.
- **Status:** Complete.
- **Dependencies:** Sprint 21A's World Memory schema; Sprint 20's Home model.
- **Outstanding work:** Feeds directly into Sprint 24.

## Sprint 24 — "First Daily User"
- **Date:** 2026-07-14
- **Goal:** Ship the six-question Home UI; surface previously-computed-but-hidden fields (Uncertainty, invalidation signals).
- **Files changed:** `HomeScreen.jsx` redesign, `RecommendationCard.jsx`, Daily Feed cards, Portfolio Intelligence narrative card.
- **Commits:** 6 commits, `27660eb` through `c474d3c`.
- **Decisions:** Real numeric thresholds set for when a Portfolio Intelligence narrative should appear (≥0.5% value change, ≥$1 P/L change) — avoiding narrating noise.
- **Status:** Complete (248 backend / 92 frontend tests).
- **Dependencies:** Sprint 23A's portfolio delta.
- **Outstanding work:** No automated `PerformanceSnapshot` scheduler yet; broader Portfolio "AI conversation" rewrite deferred; systematic empty-state audit of untouched screens deferred (picked up in Sprint 25).

## Sprint 25 — "Increase Trust"
- **Date:** 2026-07-14
- **Goal:** Remove everything that reads as fake, with no new features.
- **Files changed:** `autonomousMarketService.js`/`autonomousRecommendationEngine.js` (fallback explanation fix), `RecommendationCard.jsx` ("Why now" section), empty-state copy across the app, new dependency-free `ConfirmButton`.
- **Commits:** 5 commits, `3d1861c` through `25216a1`.
- **Decisions:** **Every empty state must state why it's empty, not just that it is** — an explicit, durable house rule from this point forward.
- **Status:** Complete (249 backend / 96 frontend tests).
- **Dependencies:** None new.
- **Outstanding work:** Nav consolidation investigated but not executed (insufficient evidence to justify it at the time).

## Sprint 26 — "Beta Readiness" / Trust Breakers
- **Date:** 2026-07-14
- **Goal:** Kill confirmed "Trust Breaker" defects before a closed beta.
- **Files changed:** `impactIntelligenceService.js` (event-category differentiation expanded from 4 to all 19 categories), false portfolio-overlap fix, Global Intelligence React key fix.
- **Commits:** 5 commits, `106e7e9` through `a1ea4df`.
- **Decisions:** None new architecturally; a quality-bar commitment (no boilerplate/generic text presented as personalized).
- **Status:** Complete; beta-readiness self-score moved from 2/10 to 6.5/10 (253 backend / 96 frontend tests). **Conditional GO for a small closed beta.**
- **Dependencies:** None new.
- **Outstanding work:** Confidence score's narrow real-world variance flagged as structural, deferred to Sprint 27; navigation complexity (12 items) still unresolved.

## Sprint 27 — Closed Beta Readiness
- **Date:** 2026-07-14/15
- **Goal:** Six priorities for closed-beta readiness.
- **Files changed:** `alternativeFusionService.js` (genuine signal-agreement confidence scoring, replacing an availability-based proxy), recommendation timeline widened, `startVisibilityAwarePolling` shared utility (fixing 6 independent always-on polling loops), Home "at a glance" strip.
- **Commits:** 7 commits, `1bc75e2` through `f318f93`.
- **Decisions:** Confidence scoring must reflect genuine signal agreement, not merely whether data sources were available.
- **Status:** Complete. **GO for closed beta** (259 backend / 104 frontend tests).
- **Dependencies:** None new.
- **Outstanding work:** Header/Dashboard overlapping polling (needs a shared data layer — deferred as architecture-level); 6 screens still missing loading skeletons.

## Sprint 28 — "Morning Intelligence"
- **Date:** 2026-07-15
- **Goal:** Unify the morning brief experience by composing existing services, not building a new engine.
- **Files changed:** `homeSummaryService.js` (topRecommendations/portfolioSnapshot), Intelligence Timeline, month/year classification bug fix.
- **Commits:** 5 commits, `be46582` through `fef46ef`.
- **Decisions:** **Morning Brief is a real merge of four already-existing subsystems** (Recommendations, Portfolio, Timeline, personalization) — explicitly not a new data source.
- **Status:** Complete (265 backend / 108 frontend tests).
- **Dependencies:** Sprints 16, 20, 24's respective subsystems.
- **Outstanding work:** Home/Dashboard conceptual overlap measured, not eliminated (later resolved by Sprint 40's retirement of Dashboard); "Long Term" timeline bucket absorbs most items due to an upstream horizon-assignment gap, not a bucketing bug.

## Sprint 29 — Feedback Intelligence Layer
- **Date:** 2026-07-15
- **Goal:** Start learning from the platform's own outcomes, without adding a new AI engine.
- **Files changed:** First writers for `WorldMemoryPrediction`/`Outcome`, real `expiresAt`/`expireStaleRecommendations()`, new `outcomeGradingService.js`, new `RecommendationFeedback` model, Theme Evolution section, internal Recommendation Quality Dashboard.
- **Commits:** 4 commits, `4eba6e4` through `953b605`.
- **Decisions:** Recommendations that go ungraded due to no live quote are honestly marked `UNGRADEABLE`, never silently dropped or guessed. User feedback reactions are captured but explicitly **not yet fed back into scoring** — a deliberate first step, not a shortcut.
- **Status:** Complete (284 backend / 114 frontend tests, 1 migration).
- **Dependencies:** Sprint 21A's World Memory models (finally given their first real writers).
- **Outstanding work:** Only the 24-hour grading window implemented; weekly/monthly/quarterly/annual windows schema-ready but unused.

## Sprint 30 — Personal Intelligence Layer (v1)
- **Date:** 2026-07-15
- **Goal:** Begin understanding the individual user — facts stay global, only relevance/ordering personalizes.
- **Files changed:** New `UserMemoryEvent` model, `personalIntelligenceService.rankByUserRelevance`, `learningLoopService.js`, Morning Personal Brief.
- **Commits:** 5 commits, `89b33ee` through `99d63ed`.
- **Decisions:** **`learningLoopService.js` is deliberately, structurally one-directional** — test-enforced to never be imported by the recommendation engine (a rule that held for 12 more sprints, until Sprint 41's unification, and was only reconsidered as design work in Sprint 43/Phase D). **`UserMemoryEvent` introduced with no user-scoping column** — later found (Sprint 32's `investorMemoryService`, and independently by an external review) to be a real cross-user data leak, closed at the root in this session's `PERSONALIZATION-PRIVACY-001` (2026-07-27).
- **Status:** Complete (301 backend / 119 frontend tests, 1 migration).
- **Dependencies:** Sprint 20's InvestorProfile.
- **Outstanding work (per the sprint's own Executive Memo):** the gap between honest reasoning and Daily Feed's still-templated content was named as the single biggest risk before scaling past a handful of users — directly anticipating the "Trust Breaker" pattern that recurred through Sprint 40.

## Sprint 31 — Making Learning Visible, Measurable, Trustworthy
- **Date:** 2026-07-16
- **Goal:** Give the platform's self-measurement a real, honest, minimum-sample-gated presentation.
- **Files changed:** Calibration Reports (grouped by action-family, min sample size 5), Personal Progress (explicitly no scores/points/streaks/badges), first `WorldMemoryLesson` writer, Morning Brief deduplication.
- **Commits:** 5 commits, `b48aba8` through `d12a433`.
- **Decisions:** Personal Progress deliberately excludes any gamification mechanic — test-enforced. A refuse-to-build list was formally adopted this sprint (see `04_ARCHITECTURE_DECISIONS.md`).
- **Status:** Complete (319 backend / 125 frontend tests).
- **Dependencies:** Sprint 29's outcome grading.
- **Outstanding work (per Executive Memo):** the single named bottleneck to becoming a "default" investing app is *time itself* applied honestly to a real track record — not any further feature.

## Sprint 32 — "A Personal Investment Companion"
- **Date:** 2026-07-16
- **Goal:** Synthesize everything known about a user into one Investor Memory; make Home adaptive; build a full Decision Review trail; add an Educational Layer.
- **Files changed:** `investorMemoryService.js`, Adaptive Home, `Decision Review` screen, Educational Layer (auto-notes on high uncertainty/low confidence).
- **Commits:** 5 commits, `8f95055` through `f9547d3`.
- **Decisions:** **Adaptive Home reorders card emphasis only — the underlying facts never change**, an extension of Sprint 25's "no fabrication" rule into personalization specifically. `investorMemoryService.js` established as a read-only synthesis layer over other append-only sources.
- **Status:** Complete (333 backend / 133 frontend tests).
- **Dependencies:** Sprint 30's User Memory, Sprint 29's Outcome grading, Sprint 31's Personal Progress.
- **Outstanding work:** Adaptive Home weights never tuned against real usage; holding-behavior computation is simple FIFO pairing only. **`investorMemoryService.js` itself is the exact subsystem found and fixed for a real cross-user data leak in this session's `PERSONALIZATION-PRIVACY-001` phase, 2026-07-27** — the leak existed, unaddressed, from this sprint through that fix.

## Sprint 33 — Mobile Private Beta Candidate
- **Date:** 2026-07-16/17
- **Goal:** Make the product installable, one-handed, and understandable within 90 seconds on mobile.
- **Files changed:** PWA manifest/service worker (hand-built icons, no dependency), `BottomNav`, mobile onboarding back-button, offline banner, 6 real bugs found and fixed (permanent search overlay, layout-overflow instances, landscape sidebar gap, changed-vs-unavailable data conflation).
- **Commits:** 14 commits, `e8af43d` through `af0d703`.
- **Decisions:** "Nothing changed" and "data unavailable" must always be two distinguishable states, never conflated — an extension of the Sprint 25 honesty rule into a new dimension (freshness).
- **Status:** Engineering complete (360 backend / 135 frontend tests) but **Private Beta Gate: NO-GO** per its own executive gate document — Section A (Product Readiness) only 7/12 items confirmed at review time.
- **Dependencies:** All prior sprints' Home/Feed/Portfolio/Recommendations work (mobile is a rendering/UX layer over the same real data).
- **Outstanding work:** The 5/12 unconfirmed Section A items — closed the very next sprint (34).

## Sprint 34 — Private Beta Go-Live
- **Date:** 2026-07-18
- **Goal:** Convert Sprint 33's NO-GO into the platform's first real go-live readiness verdict.
- **Files changed:** 6 real bugs found via live testing and fixed (offline shell never actually cached JS/CSS due to build-hashed filenames; a `Vary`-header cache-match miss; returning users wrongly bounced into onboarding on *any* profile-check failure, not just a genuine 404; a dead PWA update signal; false "thesis changed" noise from embedded live-quote text; 3 screens wiping already-loaded data on a refresh failure).
- **Commits:** 2 commits, `de20734`, `515286f` (plus the fixes were committed across the tail of Sprint 33's commit range).
- **Decisions:** None new architecturally — this sprint is entirely about closing measurement gaps with live evidence (10/10 consecutive fresh loads under 2 seconds, etc.).
- **Status:** **First real "READY" verdict issued: READY FOR 5 USERS** (360 backend / 140 frontend tests). Explicitly **not** ready for 25 — Sections B/C/D (candidate list, ops ownership, legal/consent) are named as organizational, not engineering, blockers.
- **Dependencies:** Sprint 33's mobile work.
- **Outstanding work:** The dual-portfolio-system risk (legacy client-side vs. server-owned) documented, not fixed, at this point.

## Sprint 35 — Daily Value & Internationalization Foundation
- **Date:** 2026-07-18
- **Goal:** First sprint after "READY FOR 5 USERS" — lay an i18n foundation and add anonymous telemetry.
- **Files changed:** `I18nProvider` (Intl-based formatting, RTL detection by language), nav/Header/Home migrated to i18n (as proof, not a full migration), a real duplicated Portfolio section removed, new anonymous `AnalyticsEvent` model (no userId/IP/device-ID columns at all — anonymous by schema design, not just by policy).
- **Commits:** 6 commits, `f07c1b6` through `eae4c89`.
- **Decisions:** **Analytics are anonymous by schema design** — the `AnalyticsEvent` table structurally cannot carry personally-identifying columns.
- **Status:** Complete (365 backend / 143 frontend tests); still READY FOR 5 USERS, no regression.
- **Dependencies:** None new.
- **Outstanding work (per Executive Memo):** ~25 of ~30 screens remained hardcoded English at the end of this sprint — an explicitly disclosed scope limit, not an oversight.

## Sprint 36 — Time To Value
- **Date:** 2026-07-18
- **Goal:** Reduce the time until a first-time user feels real value.
- **Files changed:** `sessionId` correlation + `first_useful_information`/`recommendation_understood` events, onboarding "Skip remaining questions," recommendation card metric collapse, `RecommendationsScreen` re-render performance fix.
- **Commits:** 5 commits, `6b30c6b` through `aabd5dc`.
- **Decisions:** None new architecturally.
- **Status:** Complete (374 backend / 145 frontend tests). **Independent Product Critic verdict: 3/10** — reconfirmed the still-open false "portfolio overlap detected" claim from Sprint 26 recurring, plus a *new* critical finding (a landscape-orientation layout regression reverting to the old 12-item sidebar) and a silent invalid-search-input fallback.
- **Dependencies:** None new.
- **Outstanding work:** Both the recurring and the newly-found Critical items — the recurrence of the "false claim" pattern across Sprints 26/36/37/39/40 is itself named as a pattern worth executive attention (see `06_TECHNICAL_DEBT.md`'s closing note and `10_EXECUTIVE_NOTES.md`).

## Sprint 37 — Market Intelligence Source Layer
- **Date:** 2026-07-19
- **Goal:** Build the foundation to combine market/social/analyst/institutional/derivatives/technical/research signals into one evidence matrix.
- **Files changed:** Provider registry grown from 15 to 22, 6 new adapters, `Evidence Matrix` introduced, on-demand Technical Analysis endpoint, research agent.
- **Commits:** 3 commits, `a6ef6f8` through `71b329e`.
- **Decisions:** **Evidence Matrix introduced** as the canonical, categorized input every future Committee member reads from — the direct architectural predecessor to Sprint 38's Committee and this session's Agent Orchestrator's reused Technical/Sentiment/Analyst-Consensus services. Explicit safety guards adopted: no fabrication, options-calls not auto-treated as bullish, disagreement stays visible, crowding treated as a contrarian counter-signal not confirmation.
- **Status:** Complete (462 backend / 147 frontend tests). **Independent verdict: Source Transparency Score 3/10** — only 2 of 22 registered providers were genuinely live at review time; the recurring false-portfolio-overlap claim was still open; two named must-fix items before this could be called safe for 5 beta users, on architecture alone, with no new source required.
- **Dependencies:** Sprint 21A's provider framework.
- **Outstanding work:** The bulk of the 22-provider registry remained unconfigured (named vendor/licensing dependencies, not code gaps).

## Sprint 38 — Investment Intelligence Committee (v2, evidence-matrix-based)
- **Date:** 2026-07-19/20
- **Goal:** Build a real multi-specialist Committee reading the Sprint 37 evidence matrix — explicitly never voting, never feeding the live Recommendation Engine at this point.
- **Files changed:** 8 pure-function committee-member modules, `committeeCoordinator.js` (agreement/disagreement without averaging), `chiefInvestmentOfficerService.js`, new `/v2/committee-intelligence/:symbol` route, 9 safety tests.
- **Commits:** 3 commits, `ba56581` through `a6815be`.
- **Decisions:** **Confidence scores are never averaged/blended into one number** — an explicit, test-enforced rule from this sprint forward, still true today (confirmed directly by this session's own research for `AGENT-ORCHESTRATOR-001`, which found this rule intact and deliberately designed its own, separate "confidence calculation" differently for that reason).
- **Status:** Complete (473 backend / 148 frontend tests). **Independent verdict: Committee Independence Score 3/10** — found the *legacy* (v1, still-live-in-production) committee display had byte-identical confidence numbers across unrelated tickers, evidence of shared underlying calculation rather than genuinely independent reasoning as presented. (Important: this verdict was reviewing the old system still running in production, not the new evidence-matrix committee this sprint just built — the two systems coexisted, unreconciled, until Sprint 41.)
- **Dependencies:** Sprint 37's Evidence Matrix.
- **Outstanding work:** Macro/Institutional/Fear&Greed evidence categories still unavailable (carried from Sprint 37); the two-committee-systems problem itself, unresolved.

## Sprint 39 — Explainability Engine
- **Date:** 2026-07-20
- **Goal:** Trace every recommendation from verdict back to evidence; detect and disclose disagreement explicitly.
- **Files changed:** `decisionTraceExplainabilityService.js`, `disagreementEngine.js`, `consistencyCheckService.js`, a What-If Engine (excludes one evidence category, compares leans, never exposes a numeric weight).
- **Commits:** 2 commits, `3c1577e`, `590fa70`, plus `a5a2ea7` for the report.
- **Decisions:** Disagreement is classified into named states (AGREEMENT/PARTIAL_AGREEMENT/STRONG_DISAGREEMENT/CONFLICTING_EVIDENCE/INSUFFICIENT_EVIDENCE) and surfaced explicitly, never silently resolved.
- **Status:** Complete (489 backend / 150 frontend tests). **Independent verdict: Explainability 4/10, Trust 4/10, Traceability 3/10** — found the single most damaging pattern in the whole audit trail up to this point: 5 expert votes, none saying "Buy," directly beneath a "Buy" headline with no reconciliation shown (again, the still-unreconciled legacy committee).
- **Dependencies:** Sprint 38's Committee.
- **Outstanding work (explicitly named by the report itself as the top priority for the next sprint):** the legacy-vs-live committee divergence — this is the direct, named lead-in to Sprint 41.

## Sprint 40 — Product Excellence / Full Product Audit
- **Date:** 2026-07-20
- **Goal:** Maximize "investing-improvement-per-5-minutes"; full whole-product audit.
- **Files changed:** Retired the duplicate "two Home screens" (legacy Dashboard vs. Home) from all navigation, made search conversational, added "what would change my mind" framing, Portfolio AI Advisor Insights panel, Feed freshness/read-time/actionability metadata, real client-side performance timing.
- **Commits:** 5 commits, `43e82b4` through `9a5f78d`.
- **Decisions:** **Dashboard formally retired from navigation** as a duplicate of Home (kept in the codebase, unreachable — the precedent for how this project retires screens without deleting code).
- **Status:** Complete (489 backend / 163 frontend tests). **Independent verdict: Overall 4/10** — a live reliability failure was observed during review (the app loaded completely blank with no explanation), plus Sprint 39's self-contradicting expert-panel-vs-headline finding, still open.
- **Dependencies:** None new.
- **Outstanding work (the report's own top-named item):** the two-coexisting-committee-systems problem — explicitly named as the single largest architectural inconsistency and the top beta-readiness risk in the whole project at this point.

## Sprint 41 — Committee Unification
- **Date:** 2026-07-21
- **Goal:** Exactly one Investment Committee, one CIO, one recommendation-interpretation path — resolving the problem named repeatedly across Sprints 38, 39, and 40.
- **Files changed:** Deleted `investmentCommitteeService.js`, `committeeController.js`, `committeeTrackRecordService.js` + its JSON store, legacy `/committee/*` routes, frontend `committeeApi.js` (~800 lines removed). Rewired `autonomousRecommendationEngine.js` and `aiController.js` onto the unified (Sprint 38) committee. 8 new regression tests structurally proving single-path execution.
- **Commits:** 4 commits, `f294b28` through `c18e2ca`.
- **Decisions:** **The audit found the "unified" Sprint 38 committee had, in fact, never actually been wired into live recommendations** — the legacy (v1) committee was still the only one in the real path, with Sprint 38's evidence-matrix committee sitting unused behind the dev console this whole time. This sprint is the actual unification, not merely a confirmation of one.
- **Status:** Complete (488 backend / 164 frontend tests, verified end-to-end live for TSLA/NVDA/AAPL/SPY). **Independent verdict: Trust Consistency Score 0/10** — not because the unification failed, but because **the product was unreachable for the entire review session** (the third consecutive review session of downtime by this point) — the reviewer could not even test the question this sprint was meant to answer.
- **Dependencies:** Sprints 37, 38, 39, 40.
- **Outstanding work:** `committeeTrackRecordService` retired with no direct rebuild yet; evidence-matrix categories (institutions, macro, fear & greed) still unavailable; **uptime/reliability itself, not committee logic, is named as the real, more urgent unresolved problem.**

## Sprint 42 — Intelligence Quality Platform
- **Date:** 2026-07-21/22
- **Goal:** Measure every recommendation from birth to outcome.
- **Files changed:** New `RecommendationLifecycleEvent` model (9 states, wired into 6 real production events), Performance Engine (real return-vs-benchmark/drawdown/volatility from real price history), Committee/CIO/Evidence Scorecards, new internal `/v2/quality-platform/*` API (no public UI).
- **Commits:** 4 commits, `c498d23` through `063bdd4`.
- **Decisions:** All scorecards are strictly read-only reporting over the join of Outcome+DecisionTrace+Recommendation — computing nothing new, never influencing a live decision.
- **Status:** Complete (516 backend / 164 frontend tests, 48 new tests). **Independent verdict: Measurement Completeness 3/10, Scientific Validity 3/10, Future Learning Potential 2/10** — the definitive finding: the system can measure itself narrowly but **cannot correct itself** — `learningLoopService.js` remains structurally one-directional by its own code comments, and the grading pipeline writes to a surface nothing upstream ever reads.
- **Dependencies:** Sprint 41's unified committee, Sprint 29's outcome grading.
- **Outstanding work:** `PAPER_TRADED` lifecycle state has no automatic trigger; scorecards have zero historical depth at launch (only post-unification outcomes count); only the 24-hour grading window is populated. This is the last commit before a 4-day gap in the commit history (2026-07-22 to 2026-07-26).

## Sprint 43 — Adaptive Intelligence Architecture (design only, zero code)
- **Date:** 2026-07-22
- **Goal:** Design — not build — how the system could safely learn from graded outcomes.
- **Files changed:** None (`LEARNING_ARCHITECTURE.md`, `LEARNING_DATA_CONTRACT.md`, `ADAPTIVE_SAFETY_POLICY.md`, `PHASE_D_ROADMAP.md`).
- **Commits:** None (design deliverable only).
- **Decisions:** A staged, human-approval-gated rollout plan for eventual learning: (1) regime-conditioned scorecards, pure measurement; (2) Bayesian confidence calibration, read-only; (3) bounded, shadow-only weight *proposals*, requiring human approval — never automatic. Walk-forward validation only, explicitly forbidding random train/test splits. Adaptation is explicitly scoped to confidence calibration only — never action-selection logic, risk limits, or regime-classification rules.
- **Status:** Complete as a design deliverable. **Independent Red Team verdict: Overall Readiness for Phase D 2/10** — the append-only architecture already prevents classic data leakage (scored 7/10), but the actual training data needed (populated alpha, committee attribution, regime tags, transaction costs, significance testing) was almost entirely missing. **Verdict: READY ONLY AFTER DATA REMEDIATION.**
- **Dependencies:** Sprint 42's Quality Platform.
- **Outstanding work:** Everything named "Phase D" from this point is data remediation, not learning implementation — see the D1 series below.

## Sprint D1 — Learning Data Remediation
- **Date:** 2026-07-22
- **Goal:** Fix data integrity problems before any adaptive weight can be considered — explicitly zero adaptive logic this phase.
- **Files changed:** `learningFieldAuditService.js`, `regimeClassifierService.js` (deterministic, versioned, honest `UNKNOWN` below 20 bars), `providerQualityService.js`, `outcomeValidationService.js` (7 detectors), `datasetValidatorService.js`.
- **Commits:** None (audit/design-heavy phase; 549/549 tests passing against existing code).
- **Decisions:** Backfilling historical rows with the new required fields is explicitly forbidden as a form of data leakage — a real, disclosed cost of the append-only discipline.
- **Status:** Readiness measured at **0% (0 of 279 real recommendations "READY")** — an expected, honest result, not a failure of this phase's work. 96 of 279 (34%) flagged CONTAMINATED, all attributable to a missing benchmark field. **Independent audit found the actual number worse than this phase's own report implied: 70.8% of already-graded outcomes were exact-content duplicates of the same signal repeated across scan cycles**, and only 3 tickers / 1 real ingested evidence event existed in total. **Verdict: REMAIN IN DATA REMEDIATION.**
- **Dependencies:** Sprint 43's design.
- **Outstanding work:** Everything — this phase diagnosed the problem precisely; it did not yet fix the underlying data scarcity.

## Sprint D1.5 — Operational Learning Run
- **Date:** 2026-07-23
- **Goal:** Actually *run* the D1 pipeline live, rather than build more of it.
- **Files changed:** None (operational run).
- **Commits:** None.
- **Decisions:** Confirmed real outbound network access worked (22 real SPY bars fetched). Corrected a factual error in D1's own report: all 279 existing rows use the *legacy*, pre-Sprint-41 committee shape — meaning the 96 flagged-CONTAMINATED rows are primarily a committee-shape mismatch, not solely a missing benchmark as D1 implied.
- **Status:** Readiness unchanged at 0%. Live engine run produced 0 new recommendations (a legitimate, deterministic outcome — no symbol crossed threshold, and 0 held positions meant the Reduce/Exit path was structurally unreachable, not broken).
- **Dependencies:** Sprint D1.
- **Outstanding work:** No live market-data API key configured (`FINNHUB_API_KEY` empty) — identified as the new, singular primary blocker.

## Sprint D1.6 — Dataset Population & Certification
- **Date:** 2026-07-23
- **Goal:** Produce the first real "READY" observations.
- **Files changed:** None (root-cause investigation).
- **Commits:** None.
- **Decisions:** Root-caused the zero-recommendation problem definitively to the single missing `FINNHUB_API_KEY` credential, which independently blocked quote enrichment (capping a conviction score below the Buy threshold), order placement, and grading — three separate downstream effects from one missing key.
- **Status:** Still 0 READY observations. D2 cannot begin.
- **Dependencies:** Sprint D1.5.
- **Outstanding work:** Supply the credential; place concentrated paper trades to trigger the existing 35% concentration-override rule (a threshold-independent path to a real recommendation); wait the required 24-hour grading window.

## Sprint D1.7 — External Dependency Certification
- **Date:** 2026-07-23
- **Goal:** Prove the pipeline works correctly once its external dependencies exist — pure investigation, zero code changes.
- **Files changed:** None (`PRODUCTION_READINESS_CHECKLIST.md`, operator-only).
- **Commits:** None.
- **Decisions:** Built a complete 8-category external-dependency matrix; traced every consumption point of the missing API key.
- **Status:** **BLOCKED BY EXTERNAL DEPENDENCIES** — the pipeline's own code proven correct end-to-end; the blocker is exactly one missing credential plus an unavoidable time-based wait, both operator/environmental, not code defects.
- **Dependencies:** Sprint D1.6.
- **Outstanding work:** Supplying the credential (operator action, outside engineering scope).

## Sprint D1.8 — First READY Observation Run
- **Date:** 2026-07-23
- **Goal:** With Finnhub now confirmed working, produce the platform's first real, gradable observations.
- **Files changed:** None (real paper trades placed through the app's existing, real order-placement logic).
- **Commits:** None.
- **Decisions:** Placed 5 real paper trades (AAPL, MSFT, NVDA, GOOGL, AVGO) deliberately concentrated in Technology, pushing sector concentration to 46.23% — past the pre-existing 35% override threshold. Re-ran the engine with **no new code and no logic change**: 5/5 real REDUCE recommendations were produced via the pre-existing, previously-never-reached concentration-override rule.
- **Status:** **WAITING FOR GRADING WINDOW** — 5 recommendations pending, eligible 2026-07-24. First-ever live rows carrying the unified Sprint 41 committee shape and a real regime snapshot (`MIXED_UNKNOWN`).
- **Dependencies:** Sprint D1.7.
- **Outstanding work:** The 24-hour grading wait; re-confirming the API key persists across a server restart; the natural (non-override) recommendation path remains capped by canonical-event sparsity.

---

## The Phase C / D / E / H / X series (beta-readiness and product-quality audits, 2026-07-23 to -25)

*(These run partly in parallel with, and partly interleaved chronologically among, the Sprint D1 series above — both series were active in the same window, 2026-07-22 to -25.)*

### Phase C Review — NOT APPROVED
- **Goal:** Independent review of Sprint 16 Phase C readiness (no standalone Phase C plan existed).
- **Decisions/status:** No auth/tenancy foundation; watchlist still browser-local; provenance not enforced consistently; the open API-key security incident; Market News still a static mock. **Outcome: NOT APPROVED.**

### Phase D Review — NO-GO
- **Goal:** Review readiness to begin Sprint 16 Phase D (no committed plan existed).
- **Decisions/status:** No formal explanation-model schema, no measurably calibrated scenario framework, no deterministic quality-score spec, no decision-trace audit/retention policy, no API compatibility policy, no test matrix. **Outcome: NO-GO** — 6 blockers, 4 high, 2 medium, 2 low.

### Phase E1 — Beta Experience Audit
- **Date:** 2026-07-23. **Goal:** UX/product-only audit for the first 5 beta users, intelligence pipeline frozen.
- **Decisions/status:** 12 issues found (2 Critical — no data visualization anywhere in the product; the default Portfolio screen had weaker error handling than the flagged alternative for no functional reason). Audit only, 0 code changes.

### Phase E2 — Fix E1's Critical + High findings
- **Date:** 2026-07-23. **Files changed:** `PortfolioEngineScreen` enabled by default (fixing the E1 Critical #2), premium Recommendations empty state, `WelcomeOverlay.jsx`, branded loading spinner, honest static-vs-live Settings disclosure.
- **Status:** Complete (164/164 frontend tests). Charts (E1 Critical #1) deliberately excluded as out of scope (feature-adding, not fixing).

### Phase E3 — Founder Beta Simulation (judgment only, no code)
- **Date:** 2026-07-23. **Goal:** Experience the product as a first external beta user would.
- **Decisions:** Named the single highest-ROI fix as giving the Recommendations empty state a visible, concrete answer to "when will something happen" — directly executed next phase.

### Phase E3.5 — Implement the 3 highest-ROI fixes
- **Date:** 2026-07-23. **Files changed:** "Wall Street Analyst Consensus" relabeling (with "not an ImpactOne recommendation" subtitle) — closing a trust defect this engagement's own later reviews (`AI_ANALYSIS_REVIEW.md`) explicitly credited as a genuine, overdue fix; Daily Feed redundant-lead-in stripping; Lessons Learned de-duplication.
- **Status:** Complete (166/166 frontend tests).

### Phase H1 — Go-Live Audit — BLOCKED
- **Date:** 2026-07-23. **Goal:** Audit readiness for real production go-live with 5 beta users.
- **Decisions/status:** Two blockers: secrets committed to git history; no real user isolation (designed in Phase F2, never built). **BLOCKED.**

### H2 — Resolve Phase H1's blockers
- **Date:** 2026-07-23. **Files changed:** `frontend/.env` untracked from git (rotation itself deferred — outside session access); real `BetaUser` isolation implemented (nullable `betaUserId` on 5 tables, `betaUserContext` middleware, `BetaInviteGate.jsx`).
- **Status:** Both blockers resolved (355/356 backend, 1 pre-existing unrelated flake; 170/170 frontend). Live-verified two real beta users cannot see or affect each other's data.

### H3 — Visual Redesign + Watchlist Folders + Alerts + Notifications
- **Date:** 2026-07-23. **Files changed:** Real design-token cascade, full Watchlist Folder CRUD (user-scoped, 404-not-403 for ownership violations), price alerts, `NotificationCenter.jsx`.
- **Status:** Complete (381/382 backend, 182/182 frontend). Live 2-user isolation verified via `curl` (no browser tooling available that session, honestly disclosed).

### X2 — Advanced Chart, Market Positioning, Opportunity Score
- **Date:** 2026-07-24. **Files changed:** From-scratch Canvas candlestick+volume chart, `overlayRegistry.js` (10 future tools, all honestly `implemented:false`), Market Positioning (explicitly discloses no real short-interest/float data exists), Opportunity Score (explicitly not consulted by the recommendation engine).
- **Status:** Complete (397/398 backend, 202/202 frontend). Beta remained at 2 users.

### X3 — Institutional Workspace: Impact Graph, Decision Center, Workspace 2.0
- **Date:** 2026-07-24. **Files changed:** Chart upgrades (crosshair, tooltip, timeframe selector, pinch-zoom), Impact Graph (honestly shows `NO_DATA` rather than fabricating example causal chains), Decision Center (honestly discloses 2 of 6 named sources unimplemented), Fibonacci architecture (schema/validator only, zero compute logic).
- **Status:** Complete (418/419 backend, 229/229 frontend).

### X4 — Beta Identity/Usability + Decision Center V1 Persistence
- **Date:** 2026-07-24. **Files changed:** `useBetaIdentity.js`, new `DecisionState` model, chart plugin architecture (`managers.js`) — real hot-pluggable stack, zero indicator math implemented yet.
- **Status:** Complete (637/638 backend, 259/259 frontend).

### X5 — Consolidation: One Product Entry, One Scoring Architecture
- **Date:** 2026-07-24. **Files changed:** Sidebar restructured into Primary/Advanced/Account tiers, `symbolIntelligenceService.js` (deliberately distinctly named to avoid colliding with the unrelated Sprint 37 "market intelligence" system), parallelized workspace fetches.
- **Decisions:** Audited ~10 scoring functions and found **zero duplicated calculation logic** — the real gap was documentation (`SCORING_ARCHITECTURE.md`), not code.
- **Status:** Complete (647/648 backend, 260/260 frontend).

### X6 — Release Candidate Audit — REJECT
- **Date:** 2026-07-24. **Decisions/status:** The application did not start — a blank white screen in every fresh browser context, caused by an export mismatch between `Header.jsx` and `BetaInviteGate.jsx`, confirmed unfixed across two independent checks. **Verdict: REJECT.**

### X7 — RC1 Approved: Market Intelligence Engine Migration, Explainability, Decision Timeline
- **Date:** 2026-07-24. **Files changed:** Fixed the X6 blocker (plus a second real gap the same class of release-validation script caught: `symbolIntelligenceApi.js` was referenced by code but never actually created); Decision Timeline (merges 6 real sources, discloses 2 unavailable); Executive Dashboard (capped at 6 curated lists, an explicit anti-overload constraint).
- **Status:** Complete (662/663 backend, 292/292 frontend).

### X8 — Private Beta Readiness — final gate before real beta users
- **Date:** 2026-07-24. **Decisions:** Found and fixed a real identity-leak bug: an unscoped "first profile ever created by anyone" lookup meant a brand-new browser could silently inherit another real user's onboarding state. Fixed to scope explicitly to `betaUserId: null`.
- **Status:** Complete (666/666 backend, 292/292 frontend). **Verdict: private beta may proceed. Zero Critical/High issues remain open** at this point in the audit trail.

### X9 — Private Beta Operations Platform
- **Date:** 2026-07-25. **Files changed:** 17-event analytics catalog, `Feedback`/`ErrorReport`/`FeatureFlag` models, `AdminDashboardScreen.jsx` (dev-gated).
- **Status:** Complete (701/701 backend, 298/298 frontend).

### X10 — Adaptive Intelligence Engine (learning infrastructure, no live-decision changes)
- **Date:** ~2026-07-25. **Files changed:** `userLearningService.js`, `personalizationService.js`, `recommendationQualityService.js`, `newsSourceScoringService.js` (first real dynamic, outcome-informed source trust score), `marketMemoryService.js` (first real symbol/sector similarity query over World Memory — the prior `historicalSimilarityService.js` was a hardcoded, unmounted stub).
- **Status:** Complete (734/734 backend, 298/298 frontend).

### X11 — Closed Learning Loop
- **Date:** ~2026-07-25. **Files changed:** New `MethodologyVersion`/`ScoringAdjustmentAudit`/`SourceScoreSnapshot` models, `outcomeFeedbackService.js` (min sample 15, bounded ±8-point adjustment, 95% confidence interval, every computation audited whether applied or withheld), wired into `autonomousRecommendationEngine.js`.
- **Decisions:** **This is the first sprint in the entire project where a graded outcome structurally feeds back into a live score** — closing the exact gap Sprint 42's verdict named as the platform's biggest weakness. Scoped deliberately narrow: confidence calibration only, never action-selection or committee composition.
- **Status:** Complete (760/760 backend, 298/298 frontend — backend-only sprint). 1 migration.

---

## The X12 series — NOVA Design Foundation and the first Workspace screens

### X12A — Design Bible Certification Review (no code)
- **Decisions/status:** Found two contradictory, uncontradicted visual-identity documents (only one ever implemented); screen specs built for an IA that never shipped; a factually wrong typography claim; zero RTL guidance despite RTL already being shipped. **Verdict: REVISE DESIGN LANGUAGE.**

### X12B — NOVA Design Foundation
- **Files changed:** Two-layer primitive+semantic token architecture, 4 theme states, Space Grotesk/Inter/JetBrains Mono typography, 7 layout primitives, glass as opt-in-only, real WCAG contrast-checker, zero physical left/right CSS properties (grep-verified).
- **Decisions:** Fixed the real WCAG-AA failure and brand-accent conflict a parallel review flagged *before* building anything on top.
- **Status:** Complete (329/329 frontend; 760/760 backend unaffected).

### X12C0 — NOVA Visual Showcase
- **Files changed:** ~30-component real, reusable NOVA library, 13 showcase sections, dev-console-and-pathname-gated route.
- **Status:** Complete (348/348 frontend).

### X12C1 — Mission Control Home (first NOVA-composed, nav-reachable screen)
- **Status:** Complete (354/354 frontend). Not manually browser-verified this pass (honestly disclosed).

### X12C1.1 — 5 corrections to Mission Control (from a live design review)
- **Files changed:** Fixed duplicated KPI titles, a misleading `0/100` fallback (collapsed real-zero and absent-data into one confusing visual), replaced a legacy button/typography classes with NOVA equivalents, **fixed a real inherited RTL bug in the shared `.stack-list` class** (`padding-left` → `padding-inline-start`) that silently also corrected the same bug everywhere else that class was used.
- **Status:** Complete (359/359 frontend).

### X12C2 — Intelligence Workspace
- **Decisions:** Pre-build research confirmed no literal "bullish/bearish" field exists anywhere in the real API — used the real `impactType` field instead of inventing one.
- **Status:** Complete (369/369 frontend).

### X12C3 — Portfolio Intelligence Workspace
- **Decisions:** Pre-build grep confirmed rebalance suggestions, a real diversification score, a real portfolio-level risk score, and real-position-based HHI **do not exist in the backend** — Section 9 (Rebalance) shows an honest "not available" state rather than fabricating a number.
- **Status:** Complete (381/381 frontend).

### X12C3.1 — Real integration bug fix
- **Decisions:** Root cause: the screen filtered on a field name (`heldPosition`) that never existed on the real wire response (only an internal engine variable) — the real field is `portfolioContext`. Fixed the filter, the test's mock shape, and a stale doc claim.
- **Status:** Complete (381/381 frontend, zero regressions).

---

## The Workspace Architecture arc — this session, 2026-07-26 to -27

This is the final, most recent arc, executed directly in the session this export was generated from. Every phase in it has its own exhaustive first-hand entry in `02_PROMPTS_CLAUDE.md` and `03_SUMMARIES_CLAUDE.md` — listed here only for chronological completeness:

`MISSION-CONTROL-001` (bundled into commit `c51048c`) → `MISSION-CONTROL-002` → `LIVE-DATA-001` → `PORTFOLIO-001` → `DESIGN-SYSTEM-001` → `NEWS-INTELLIGENCE-001` → `PLATFORM-INTEGRATION-001` → `DEDUPLICATION-001` → `WATCHLIST-001` → `AI-ANALYSIS-001` → `PLATFORM-INTELLIGENCE-001` → `MARKET-INTELLIGENCE-001` → `RELEASE-BLOCKER-001` → `PERSONAL-INTELLIGENCE-001` → `PERSONALIZATION-PRIVACY-001` → `AGENT-ORCHESTRATOR-001` → `CEO-AUDIT-EXPORT-001` (this document).

**What this arc changed, in one sentence each:** a new three-tier Workspace UI architecture (Mission Control) proved out and then extracted into a reusable Design System; six more Workspace screens built on it (Portfolio, News Intelligence, Watchlist, AI Analysis, Market Intelligence, Personal Intelligence); cross-screen shared state and request de-duplication introduced; three real cross-screen logic duplications closed; the project's production build fixed at its literal root cause after being broken across the entire prior history of every audit that checked it; a real cross-user privacy leak in Investor Memory (open since Sprint 30/32) closed; and a new generic, parallel, timeout/retry/health-aware Agent Orchestrator engine built for Stock Intelligence.

---

## Where the project stands today (as of this export)

- **The most recent commit is `72a6129`** (Agent Orchestrator), on branch `sprint-16-live-data`, local-only from `c51048c` onward (only `c51048c` itself has been pushed to `origin`).
- **The production build is fixed and verified.** **A real cross-user privacy leak is closed and verified.** Both were long-standing, previously-unresolved, repeatedly-flagged issues.
- **No evidence exists in this repo's own audit trail of a completed real-user private beta** (with actual external humans, not synthetic/founder-simulated testing) having occurred — every "GO"/"READY" verdict found describes engineering/product readiness for a beta to *begin*, not its completion. See `10_EXECUTIVE_NOTES.md` for the CEO-facing synthesis of this and other open items.
