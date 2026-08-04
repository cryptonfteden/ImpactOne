# 09 — Commit History (Chronological)

**Source of truth:** `git log --reverse` on branch `sprint-16-live-data`, repo root. 224 commits total, from the initial commit (2026-07-08) through the most recent (2026-07-27). All commits are by `cryptonfteden`. Every commit is listed below in chronological order (oldest first) with its hash, timestamp, subject line, and a purpose note. Where the subject line already states the purpose plainly, the purpose note is brief; where a commit is part of a larger arc (a sprint, a phase), that context is named.

**A note on branch state:** the first commit ever pushed to a shared remote in this project's most recent working session was `c51048c` (2026-07-26) — see `10_EXECUTIVE_NOTES.md` for what that means about what's actually live versus locally committed. Everything from `c51048c` through `72a6129` (the newest commit as of this export) is local-only on `sprint-16-live-data` unless stated otherwise.

---

## Founding commits (2026-07-08)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `d333b45` | 07-08 22:28 | Initial commit | Repository created. |
| `2ef9358` | 07-08 22:33 | Create architecture.md | First architecture note. |
| `e57560b` | 07-08 22:38 | Create README.md | First README. |
| `58d3844` | 07-08 22:39 | Create README.md | README revised. |

## Sprint 1 (2026-07-09)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `7676e23` | 07-09 23:00 | Sprint 1 - Live Market MVP | First working end-to-end product: live market data wired into a minimal UI. |

## Sprints 2–13 (2026-07-10) — the initial MVP sprint burst

A dense single-day sequence establishing the original product surface: backend integration, AI analysis, watchlists, dashboard, alternative data, the impact engine, the autonomous daily brief, the Autonomous Market Operating System, the AI Investment Committee (first version), Alpha Discovery, and the virtual/paper-trading portfolio.

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `5adf1ee` | 07-10 02:07 | Fix backend startup and AI analysis fallback | Stability fix immediately after Sprint 1. |
| `5d855ea` | 07-10 10:53 | Sprint 2 - Backend integration, OpenAI analysis, startup automation and end-to-end MVP | First OpenAI-backed analysis; startup automation. |
| `b34554e` | 07-10 11:03 | Sprint 3 - Investment-grade analysis, comparison, watchlist intelligence | Deeper analysis quality; symbol comparison; watchlist intelligence. |
| `8e641a8` | 07-10 12:05 | Sprint 4 - Market Impact Engine and AI reporting | First Market Impact Engine. |
| `b71b59a` | 07-10 12:14 | Fix AI Analysis route render crash | Bug fix. |
| `87ff9b8` | 07-10 12:22 | Fix AI Analysis object render crashes | Bug fix — React object-as-child crash class. |
| `04f338a` | 07-10 12:41 | AI Analysis fully working end-to-end | Stabilization checkpoint. |
| `615ba6f` | 07-10 12:57 | Sprint 4 - Watchlist intelligence and dashboard productization | Continuation of Sprint 4 scope. |
| `a5b9251` | 07-10 13:04 | Sprint 5 - Premium Fintech UI | First visual-design pass. |
| `10b537a` | 07-10 13:11 | Sprint 6 - Production architecture | Early production-readiness architecture pass. |
| `0541772` | 07-10 13:20 | Sprint 7 - Alternative data intelligence layer | Alt-data sources introduced. |
| `7d48489` | 07-10 13:32 | Sprint 8: add impact intelligence engine APIs and UI | Impact Intelligence Engine, first API + UI. |
| `445389a` | 07-10 14:48 | Sprint 9 - Autonomous daily intelligence brief | First autonomous daily brief. |
| `a477017` | 07-10 16:55 | Sprint 10 - Autonomous Market Operating System | Broader autonomous market system introduced. |
| `eb52a27` | 07-10 17:08 | Sprint 11 - AI Investment Committee | First Investment Committee concept (later unified in Sprint 41). |
| `4052953` | 07-10 17:20 | Sprint 12 - Autonomous Alpha Discovery Engine | Alpha Discovery Engine. |
| `6d023c1` | 07-10 17:30 | Sprint 13 - Virtual agent portfolio and paper trading | First paper-trading portfolio concept. |

## Sprint 14 — real Portfolio Engine (2026-07-11 morning)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `46f45f3` | 07-11 11:32 | chore(db): add Prisma, define portfolio engine schema and migration | **Prisma introduced** — the project's first real, migrated relational schema. |
| `59a2f56` | 07-11 11:37 | feat(backend): add portfolio repository and engine service | Real portfolio engine service layer. |
| `35ad264` | 07-11 11:38 | feat(api): add /api/v2/portfolio routes and controller | First `/v2` API surface. |
| `f57e196` | 07-11 11:40 | refactor(backend): access finnhubService.getQuote via property, not destructured | Defensive refactor for a live-data provider. |
| `bc1ab5c` | 07-11 11:43 | test(backend): unit + integration tests for portfolio engine | First backend test coverage of Portfolio. |
| `d58c783` | 07-11 11:45 | feat(frontend): add portfolio engine API client and hook | Frontend wiring for the new engine. |
| `13df703` | 07-11 11:58 | feat(frontend): wire PortfolioScreen to API engine behind feature flag | Feature-flagged rollout of the real engine. |
| `0b295f1` | 07-11 12:02 | test(frontend): add vitest infra and tests for the portfolio engine | **Vitest introduced** — the project's frontend test framework. |
| `40b2768` | 07-11 12:05 | docs: update PROJECT_STATUS.md for Sprint 14 | Status doc checkpoint. |

## Sprint 15 — MVP dashboard + Ask ImpactOne (2026-07-11 midday)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `692293f` | 07-11 12:29 | docs: add MVP product spec, implementation roadmap, test plan, and API contracts | Foundational planning docs. |
| `e46cffc` | 07-11 12:30 | feat(backend): add Ask ImpactOne chat endpoint | First conversational query endpoint. |
| `c74b12b` | 07-11 12:30 | feat(backend): add DailyBriefSnapshot model and archive endpoint | Historical snapshot capability. |
| `55f6e5b` | 07-11 12:32 | feat(backend): add dailyPnl to portfolio engine summary | Real daily P/L field. |
| `76f59fd` | 07-11 12:44 | docs: add architecture snapshot and code review findings | Architecture review checkpoint. |
| `e734caf` | 07-11 12:44 | fix(frontend): use real day % change for legacy portfolio's daily return | Correctness fix — real vs. approximated return. |
| `f02abd2` | 07-11 12:47 | feat(frontend): add Skeleton primitive + dashboard metrics utils | First loading-skeleton primitive. |
| `2e618b0` | 07-11 13:12 | docs: add competitor intelligence reference | Competitive research doc. |
| `fb0f0cc` | 07-11 13:13 | feat(frontend): add 9 MVP dashboard section components | Dashboard section components. |
| `c6b96ad` | 07-11 13:13 | feat(frontend): rewrite DashboardHome to compose the MVP spec sections | Dashboard composition rewrite. |
| `05554d8` | 07-11 13:20 | feat(frontend): extend Header with portfolio value, alerts, and account menu | Header upgrade. |
| `9bebae6` | 07-11 13:22 | test(frontend): DashboardHome composition test | Test coverage for the new dashboard. |
| `0345c18` | 07-11 13:27 | docs: update PROJECT_STATUS.md for Sprint 15 | Status doc checkpoint. |

## Sprint 16 (Phases A–D) — the Autonomous Recommendation Engine (2026-07-11 afternoon/evening)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `f6f833e` | 07-11 18:24 | feat(backend): export shared conviction/portfolio-action scoring from autonomousMarketService | Shared scoring extracted for reuse. |
| `44e2713` | 07-11 18:24 | feat(backend): add Recommendation + AutonomousRunLog schema | New persisted Recommendation model. |
| `9b6664e` | 07-11 18:24 | feat(backend): add autonomous recommendation engine (advisory-only, no execution) | **Foundational decision**: advisory-only, never executes trades. |
| `0ab4da5` | 07-11 18:25 | feat(backend): add scheduler service + recommendations API | Scheduled generation + API surface. |
| `aa02b29` | 07-11 18:25 | test(backend): recommendation engine, repository, scheduler, route coverage | Backend test coverage. |
| `3b113f6` | 07-11 18:25 | feat(frontend): add Recommendations screen | First Recommendations UI. |
| `d8dd42a` | 07-11 18:25 | test(frontend): recommendations hook + screen coverage | Frontend test coverage. |
| `43c7eac` | 07-11 18:26 | docs: update PROJECT_STATUS.md for Sprint 16 Phase A | Status checkpoint (Phase A). |
| `02efcad` | 07-11 18:37 | feat(backend): surface live quote data in recommendations (no new API calls) | Real live-quote enrichment. |
| `ca08f91` | 07-11 18:42 | feat(backend): connect live news feed into event detection | Real live news feed connected. |
| `cb1f747` | 07-11 18:45 | feat(backend): thread live news source URL into recommendation evidence | Source-attribution for evidence. |
| `ed973e0` | 07-11 18:48 | feat(frontend): add Recommendations preview to Dashboard | Dashboard integration. |
| `fc5162a` | 07-11 18:57 | docs: update PROJECT_STATUS.md for Sprint 16 Phase B | Status checkpoint (Phase B). |
| `1806d85` | 07-11 19:21 | feat(backend): build dynamic, prioritized news query terms from portfolio/watchlist/sector/recommendation context | Smarter news querying. |
| `2106461` | 07-11 19:25 | feat(backend): rank candidate news articles by relevance, source quality, and recency before analysis | Article ranking before analysis. |
| `c87cb80` | 07-11 19:31 | feat(backend): thread real watchlist into recommendation runs and attach symbol provenance | Real watchlist wired in; provenance tracked. |
| `9c11aa2` | 07-11 19:42 | feat(backend): add personalized relevance, confidence, and source citations to matched events | Personalization + citations. |
| `1ef7b93` | 07-11 19:47 | feat(frontend): surface personalized recommendation context and citations in the UI | UI surfacing of the above. |
| `7bf7339` | 07-11 19:56 | docs: update PROJECT_STATUS.md for Sprint 16 Phase C | Status checkpoint (Phase C). |
| `b1c8c64` | 07-11 21:07 | feat(backend): add explanation/scenarios/quality-score schema + DecisionTrace model | **`DecisionTrace` introduced** — the durable per-recommendation audit record. |
| `e0bae33` | 07-11 21:09 | feat(backend): thread publishedAt and export event-analysis helpers for reuse | Reuse-oriented refactor. |
| `3ed5a54` | 07-11 21:19 | feat(backend): generate explanation, bull/base/bear scenarios, quality score, and decision trace per recommendation | Bull/base/bear scenario generation. |
| `f59b3c3` | 07-11 21:28 | feat(frontend): upgrade Recommendations screen with explanation, scenarios, and quality score | UI upgrade to match. |
| `4c2e95a` | 07-11 21:38 | docs: document /api/v2/recommendations/* in API_CONTRACTS.md and update PROJECT_STATUS.md for Sprint 16 Phase D | Status/contract checkpoint (Phase D). |
| `2d1a042` | 07-11 22:24 | docs: Sprint 17 CTO architecture review | Architecture review ahead of Sprint 17/18A. |

## Sprint 18A — Canonical contracts + the Investment Committee's first debate layer (2026-07-12)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `f9acd9f` | 07-12 17:13 | feat(backend): add shared scoring vocabulary module | Shared vocabulary to prevent scoring drift. |
| `832cfdb` | 07-12 17:15 | feat(backend): add canonical event envelope schema and legacy adapter | **Canonical Event Envelope introduced.** |
| `338dbe1` | 07-12 17:30 | feat(backend): add canonical verdict contract and action normalization | **Canonical Verdict contract** — one normalized action vocabulary. |
| `609ebe6` | 07-12 17:33 | feat(backend): add DecisionTrace fields for committee debate, evidence references, and model version metadata | DecisionTrace extended for committee debate. |
| `5429442` | 07-12 18:18 | refactor(backend): fold Investment Committee into a debate layer, remove independent persistence | **Architectural decision**: Committee is a debate/explanation layer, not an independent decision-maker with its own persisted verdict. |
| `2906eeb` | 07-12 19:04 | feat(backend): thread committee debate and canonical event envelope into the Recommendation Engine and DecisionTrace | Integration into the one recommendation pipeline. |
| `85635f4` | 07-12 19:10 | test(backend): integration tests proving Committee and Recommendation Engine cannot return conflicting verdicts | Tests proving the "one canonical verdict" invariant. |
| `c0cc544` | 07-12 19:17 | feat(frontend): render committee debate as an explanation layer with a single canonical verdict | UI reflects the one-verdict rule. |
| `0256663` | 07-12 19:27 | docs: update API_CONTRACTS.md, ARCHITECTURE.md, PROJECT_STATUS.md, and INTELLIGENCE_PLATFORM_BLUEPRINT.md for Sprint 18A | Documentation checkpoint. |

## Sprint 18B / 19 lead-in — Investor Profile (2026-07-12 evening)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `d7568ae` | 07-12 21:43 | feat(backend): add InvestorProfile schema, repository, and service | **`InvestorProfile` model introduced.** |

## Sprint 20 — Onboarding, Home redesign, Daily Feed, Theme Dashboard (2026-07-13)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `d92874e` | 07-13 09:10 | feat(backend): add investor-profile API and deterministic AI investment profile generation | Deterministic (non-LLM) investment profile generation. |
| `c500707` | 07-13 16:42 | feat(frontend): add investor-profile API client and hook | Frontend wiring. |
| `64d449a` | 07-13 16:42 | feat(frontend): add onboarding flow (<60s, gated, Apple-style) | First onboarding flow, explicit &lt;60s design constraint. |
| `428eca6` | 07-13 18:16 | feat(frontend): add AI Investment Profile screen with compound-interest simulator and timeline | Investment Profile screen + simulator. |
| `6699e9f` | 07-13 18:25 | feat(backend): add home-summary aggregation (four questions) reusing canonicalVerdict | **"Four questions" Home model established** (later becomes six in Sprint 24). |
| `7329b86` | 07-13 18:29 | feat(frontend): redesign Home screen as the new default (four questions only) | Home becomes the default landing screen. |
| `80bb2f2` | 07-13 18:55 | feat(backend): add investor-profile-aware feed personalization | First feed personalization (`feedPersonalizationService`). |
| `7140ac0` | 07-13 18:56 | feat(frontend): replace mock Market News with a real personalized Daily Feed | Daily Feed becomes real, not mock. |
| `f2ddcaa` | 07-13 19:07 | feat(backend): add ThemeConfidenceSnapshot schema, themeIntelligenceService, snapshot job, and routes | Theme intelligence introduced. |
| `c00e9b3` | 07-13 19:08 | feat(frontend): add Theme Dashboard (expandable theme pages) | Theme Dashboard UI. |
| `4e8aa3d` | 07-13 19:15 | docs: update PROJECT_STATUS.md, API_CONTRACTS.md, and ARCHITECTURE.md for Sprint 20 | Documentation checkpoint. |

## Sprint 21A — Provider layer + World Memory (2026-07-13 evening)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `278a1ef` | 07-13 20:11 | feat(backend): extend canonical event envelope with companies, themes, language, region, category | Envelope enrichment. |
| `ffeefb1` | 07-13 20:12 | feat(backend): add CanonicalEvent and ProviderRunLog schema and migration | **Provider layer's persisted event log begins.** |
| `fef8d21` | 07-13 20:13 | feat(backend): add canonicalEventRepository with DB-level dedup | DB-level deduplication of ingested events. |
| `bcecab3` | 07-13 20:14 | feat(backend): add provider contract, rate limiter, retry policy, and provider factory | **Provider Contract established** — the shared interface every data provider implements. |
| `d54e4d6` | 07-13 20:16 | feat(backend): add all 15 provider definitions and registry | 15 real provider definitions registered. |
| `4abab9b` | 07-13 20:18 | feat(backend): add providerIngestionService orchestrator | Ingestion orchestration. |
| `5f06158` | 07-13 20:20 | feat(backend): add provider health service and scheduler | Health monitoring for providers. |
| `9f14145` | 07-13 20:22 | feat(backend): add provider ops routes and bootstrap scheduler | Ops-facing provider routes. |
| `c6a69b2` | 07-13 21:06 | docs: update ARCHITECTURE.md, API_CONTRACTS.md, PROJECT_STATUS.md for Sprint 21A and fix outstanding Sprint 20 doc drift | Documentation checkpoint + drift correction. |
| `4f9189c` | 07-13 22:27 | feat(backend): add World Memory schema (8 models, append-only) and migration | **World Memory introduced** — 8 append-only models, the platform's long-horizon memory layer. |
| `13872df` | 07-13 22:28 | feat(backend): add worldMemoryRepository with append-only enforcement | Repository-level enforcement of the append-only rule. |
| `aae97a0` | 07-13 22:29 | test(backend): prove append-only/immutability discipline and revision-numbering safety | Tests proving the immutability invariant. |
| `19908ca` | 07-13 22:36 | docs: document the World Memory model in ARCHITECTURE.md and PROJECT_STATUS.md | Documentation checkpoint. |
| `931060e` | 07-13 23:18 | docs: add CANONICAL_DOMAIN_MODEL.md, the single source of meaning for ImpactOne | **`CANONICAL_DOMAIN_MODEL.md` created** — the project's single source of meaning for its core vocabulary. |
| `71b61e0` | 07-13 23:27 | feat(backend): add provider metrics service and route | Provider metrics surfaced. |
| `202da96` | 07-13 23:29 | feat(backend): add provider diagnostics service (incl. rate-limiter state) and route | Provider diagnostics. |
| `8257d06` | 07-13 23:29 | feat(backend): add provider metadata route | Provider metadata route. |
| `c00babc` | 07-13 23:33 | feat(frontend): add developer-only Intelligence Console, gated by VITE_DEV_CONSOLE | **Intelligence Console introduced** — the internal/dev-only diagnostics surface that many later phases extend. |
| `8d8ea40` | 07-13 23:41 | docs: update PROJECT_STATUS.md, API_CONTRACTS.md, ARCHITECTURE.md for Sprint 23A | Documentation checkpoint. |

## Sprint 23A / pre-24 — first World Memory writer, portfolio delta, six-question Home (2026-07-14 early)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `9cb8d89` | 07-14 00:07 | feat(backend): wire the first real WorldMemoryThesisRevision writer | First real writer into World Memory. |
| `62b04e4` | 07-14 00:11 | feat(backend): add portfolio day-over-day performance delta | Real day-over-day portfolio delta. |
| `9cffe42` | 07-14 00:14 | feat(backend): extend homeSummaryService from four questions to six | Home expands from 4 to 6 questions. |

## Sprint 24 — Home redesign, RecommendationCard depth, Trust fixes begin (2026-07-14)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `27660eb` | 07-14 07:38 | feat(frontend): redesign Home to six questions (Sprint 24) | Home UI matches the six-question model. |
| `5d0234f` | 07-14 07:49 | feat(frontend): surface Uncertainty and symbol History on RecommendationCard | Uncertainty made visible. |
| `4233f2a` | 07-14 08:24 | feat(frontend): surface theme tags and invalidation signals on Daily Feed cards | Invalidation signals surfaced. |
| `07a0925` | 07-14 08:51 | feat(frontend): add Portfolio Intelligence narrative (today vs. yesterday) | Day-over-day narrative. |
| `c474d3c` | 07-14 09:15 | docs: add Sprint 24 final report and PROJECT_STATUS.md entry | `SPRINT_24_REPORT.md` created. |

## Sprint 25 — Trust fixes (2026-07-14)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `3d1861c` | 07-14 17:42 | fix(backend): replace identical fallback explanation with a genuinely per-symbol one | Trust fix — no more generic fallback text. |
| `68a09de` | 07-14 18:28 | feat(frontend): add labeled 'Why now' and 'What changed' sections to RecommendationCard | Explicit reasoning sections. |
| `dbc1685` | 07-14 18:36 | fix(frontend): every empty state now states why it's empty, not just that it is | Honest empty-state discipline established. |
| `441e3b0` | 07-14 18:41 | feat(frontend): require confirmation before resetting a portfolio | Destructive-action confirmation added. |
| `25216a1` | 07-14 18:51 | docs: add Sprint 25 final report and PROJECT_STATUS.md entry | `SPRINT_25_REPORT.md` created. |

## Sprint 26 — "Trust Breakers" (2026-07-14)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `106e7e9` | 07-14 19:38 | fix(backend): kill two confirmed Trust Breakers (false portfolio overlap, boilerplate why) | Named "Trust Breaker" defects fixed. |
| `58c4845` | 07-14 19:42 | fix(backend): differentiate affected sectors/companies across all 19 event categories | Per-category differentiation, no more one-size-fits-all. |
| `39128f0` | 07-14 19:45 | fix(frontend): explain the Guest account icon before it's clicked | UX clarity fix. |
| `5d9e0f3` | 07-14 20:08 | fix(frontend): eliminate real React duplicate-key console warnings on Global Intelligence | React correctness fix. |
| `a1ea4df` | 07-14 20:09 | docs: add Sprint 26 final report and PROJECT_STATUS.md entry | `SPRINT_26_REPORT.md` created. |

## Sprint 27 — Closed Beta Readiness (2026-07-14/15)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `1bc75e2` | 07-14 20:41 | fix(backend): replace source-availability confidence score with genuine signal-agreement scoring | Confidence scoring made genuine, not a proxy. |
| `d9d7055` | 07-14 20:46 | feat(frontend): widen recommendation timeline to confidence, evidence, and thesis changes | Timeline widened. |
| `a8a9105` | 07-14 20:52 | fix(frontend): filter recommendation timeline to genuine changes, not every scheduler tick | Noise reduction — genuine changes only. |
| `54a5e0d` | 07-14 21:14 | fix(feed): differentiate counterarguments/invalidation per event type, cap Daily Feed to top items | Feed quality + volume cap. |
| `5e68fe9` | 07-14 23:08 | feat(frontend): add at-a-glance strip to Home for a sub-60-second read | "Sub-60-second read" design constraint. |
| `22263d0` | 07-15 00:23 | perf(frontend): pause background polling when the tab isn't visible | Performance/battery fix. |
| `f318f93` | 07-15 00:37 | docs: add SPRINT_27_REPORT.md for Closed Beta Readiness | `SPRINT_27_REPORT.md` created. |

## Sprint 28 — Morning Brief / Morning Intelligence (2026-07-15)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `be46582` | 07-15 00:46 | feat(backend): merge Recommendations, Portfolio, Timeline, and personalization into Morning Brief | **Morning Brief introduced** — a real merge of four existing subsystems, not a new data source. |
| `a3d970b` | 07-15 01:06 | feat(frontend): surface Morning Brief on Home, fix timeline month-horizon classification | Morning Brief on Home. |
| `4bee2c0` | 07-15 01:06 | feat(frontend): label each dimension of recommendation evolution explicitly | Explicit labeling of evolution dimensions. |
| `f91d391` | 07-15 08:13 | docs: add SPRINT_28_REPORT.md for Morning Intelligence | `SPRINT_28_REPORT.md` created. |
| `fef46ef` | 07-15 09:16 | feat(backend): wire the Recommendation Outcome Pipeline into existing World Memory tables | Outcome pipeline wired into World Memory. |

## Sprint 29 — Feedback Intelligence Layer (2026-07-15)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `4eba6e4` | 07-15 17:06 | feat: build User Feedback Capture on recommendations | Real user feedback capture. |
| `24de8b3` | 07-15 17:06 | feat: build Theme Evolution (what's new/strengthened/weakened/disappeared/why) | Theme Evolution tracking. |
| `404efde` | 07-15 20:56 | feat: add internal Recommendation Quality Dashboard to the dev console | Internal quality dashboard. |
| `953b605` | 07-15 21:17 | docs: add SPRINT_29_REPORT.md for the Feedback Intelligence Layer | `SPRINT_29_REPORT.md` created. |

## Sprint 30 — Personal Intelligence Layer, v1 (2026-07-15)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `89b33ee` | 07-15 21:47 | feat: build User Memory (append-only reading/interaction tracking) | **`UserMemoryEvent` model introduced** (later found to need user-scoping — see `PERSONALIZATION-PRIVACY-001`, 2026-07-27). |
| `3e0eaa3` | 07-15 21:48 | feat: build Personal Intelligence Engine (rank recommendations by user relevance) | `personalIntelligenceService.rankByUserRelevance` introduced. |
| `9c2eeba` | 07-15 21:48 | feat: build Learning Loop (internal-only aggregation of feedback/outcome/theme signals) | `learningLoopService` introduced — internal-only, never feeds live recommendations. |
| `f92eb69` | 07-15 21:48 | feat: add Morning Personal Brief to Home | Personalized brief on Home. |
| `99d63ed` | 07-15 23:07 | docs: add SPRINT_30_REPORT.md for the Personal Intelligence Layer | `SPRINT_30_REPORT.md` created. |

## Sprint 31 — Learning made visible, measurable, trustworthy (2026-07-16)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `b48aba8` | 07-16 16:12 | feat: build Outcome Intelligence (lessons learned from completed recommendations) | Outcome Intelligence. |
| `fc541cb` | 07-16 16:12 | feat: build Calibration Reports (expected confidence vs. real outcomes, by family) | Calibration reporting — confidence held accountable against real outcomes. |
| `4f9f118` | 07-16 16:13 | feat: build Personal Progress (understanding, reading habits, portfolio discipline) | Personal Progress tracking. |
| `009b153` | 07-16 16:47 | fix: eliminate redundant lines from the Morning Personal Brief | Content-quality fix. |
| `d12a433` | 07-16 16:55 | docs: add SPRINT_31_REPORT.md for making learning visible, measurable, trustworthy | `SPRINT_31_REPORT.md` created. |

## Sprint 32 — the personal investment companion (2026-07-16)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `8f95055` | 07-16 17:34 | feat: build Investor Memory (synthesis layer: sectors, themes, reading depth, holding behavior, reactions, learning) | **`investorMemoryService` introduced** (the exact subsystem `PERSONALIZATION-PRIVACY-001` later fixed for cross-user leakage). |
| `3eeb90a` | 07-16 17:35 | feat: build Adaptive Home (personal card ordering, facts unchanged) | Adaptive Home — reorders, never changes facts. |
| `8c3f62f` | 07-16 17:49 | feat: build Decision Review (complete traceable review per recommendation) | Decision Review screen. |
| `e0454d9` | 07-16 18:18 | feat: build Educational Layer (teach on high uncertainty, low confidence, thesis change) | Educational Layer. |
| `f9547d3` | 07-16 18:30 | fix: remove duplicate timeline render in Decision Review (Full Product Audit) | Duplicate-render fix. |
| `56205f3` | 07-16 18:31 | docs: add SPRINT_32_REPORT.md for the personal investment companion sprint | `SPRINT_32_REPORT.md` created. |

## Sprint 33 — Mobile Private Beta Candidate (2026-07-16/17)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `e8af43d` | 07-16 19:04 | feat(frontend): make ImpactOne an installable PWA | **PWA installability introduced.** |
| `2e30e9f` | 07-16 19:24 | feat(frontend): mobile-first bottom navigation and profile "More" links | Mobile-first navigation. |
| `e73d9a2` | 07-17 08:34 | feat(frontend): add back navigation to mobile onboarding | Onboarding UX fix. |
| `be13cb2` | 07-17 09:07 | feat(frontend): concise collapsed state for mobile Daily Feed cards | Mobile card density fix. |
| `23f10cc` | 07-17 09:12 | fix(frontend): Portfolio's wide tables were blowing out the page on mobile | Mobile layout bug fix. |
| `5a75933` | 07-17 09:23 | feat: distinguish "nothing changed" from "data unavailable" + show freshness | Honesty discipline: two different empty states, never conflated. |
| `3fdfe2b` | 07-17 09:32 | feat(frontend): device-level offline banner + honest Home refresh failures | Offline-awareness introduced. |
| `218d62b` | 07-17 09:59 | fix(frontend): landscape-phone sidebar bug + reduced-motion + safe-area insets | Mobile/accessibility fixes. |
| `799e7e3` | 07-17 10:09 | docs: add SPRINT_33_REPORT.md for the Mobile Private Beta Candidate sprint | `SPRINT_33_REPORT.md` created. |
| `8c70f85` | 07-17 16:43 | fix(frontend): stop wiping/hiding good data on refresh failure (Daily Feed, Portfolio, Recommendations) | Stale-but-good-data preservation on failure. |
| `c48940f` | 07-17 17:26 | fix: offline app shell never actually cached the JS/CSS bundle; profile check failures wrongly bounced returning users into onboarding | Two real PWA/onboarding bugs fixed. |
| `ce9d8d0` | 07-17 19:00 | feat(frontend): surface the PWA update-available signal to the user | PWA update UX. |
| `619e755` | 07-18 00:05 | fix(frontend): live quote refresh was falsely triggering "What thesis changed" on nearly every recommendation re-run | False-positive fix. |
| `af0d703` | 07-18 08:16 | polish(frontend): stop re-blanking Home to a spinner on every refetch | Polish — avoid unnecessary loading flicker. |

## Sprint 34 — Private Beta Go-Live (2026-07-18)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `de20734` | 07-18 17:19 | docs: add private beta launch package (release notes, known limitations, rollback plan) | Launch package documented. |
| `515286f` | 07-18 18:31 | docs: add SPRINT_34_REPORT.md — Private Beta Go-Live | `SPRINT_34_REPORT.md` created — private beta go-live milestone. |

## Sprint 35 — Daily Value & Internationalization Foundation (2026-07-18)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `f07c1b6` | 07-18 21:17 | feat(frontend): internationalization foundation (i18n, RTL, locale-aware formatting) | **i18n/RTL foundation introduced.** |
| `c73bc29` | 07-18 21:17 | feat(frontend): migrate Home to i18n + remove duplicated headline (Morning Brief polish) | Home migrated to i18n. |
| `09d75c7` | 07-18 21:18 | feat(backend): add anonymous analytics events (Private Beta Telemetry) | **Analytics/telemetry introduced**, anonymous by design. |
| `76acdf1` | 07-18 21:18 | feat(frontend): wire up telemetry events + Recommendation Clarity (4 answers, zero taps) | Telemetry wired to real events. |
| `b513297` | 07-18 21:18 | fix(frontend): remove duplicated "Today's Agent Trades" section from Portfolio | Duplicate-section fix. |
| `eae4c89` | 07-18 21:19 | docs: add SPRINT_35_REPORT.md — Daily Value & Internationalization Foundation | `SPRINT_35_REPORT.md` created. |

## Sprint 36 — Time To Value (2026-07-18)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `6b30c6b` | 07-18 23:42 | feat(backend): instrument Time To Value + expose internal TTV metrics | TTV metric instrumented. |
| `8f35caf` | 07-18 23:42 | feat(frontend): wire up sessionId correlation + first_useful_information event | Session correlation + first-value event. |
| `fe96e0a` | 07-18 23:43 | feat(frontend): add "Skip remaining questions" to reduce onboarding friction | Onboarding friction reduction. |
| `81bfb78` | 07-18 23:43 | feat(frontend): recommendation reading reduction + list-render performance + recommendation_understood telemetry | Reading-reduction + performance + telemetry. |
| `aabd5dc` | 07-18 23:44 | docs: add SPRINT_36_REPORT.md — Time To Value | `SPRINT_36_REPORT.md` created. |

## Sprint 37 — Market Intelligence Source Layer (2026-07-19)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `a6ef6f8` | 07-19 20:28 | feat(backend): Market Intelligence Source Layer — canonical categories, source adapters, technical/social/analyst/COT/crypto/options intelligence, evidence matrix, research agent | **Evidence Matrix introduced** — canonical categories feeding the later Committee. Also the origin of technical/options/analyst-consensus/sentiment intelligence services later reused by the Agent Orchestrator (2026-07-27). |
| `83fd6a5` | 07-19 20:28 | feat(frontend): extend Intelligence Console with Market Intelligence Source Layer panel | Console extended to show the new layer. |
| `71b329e` | 07-19 20:32 | docs: add SPRINT_37_REPORT.md — Market Intelligence Source Layer | `SPRINT_37_REPORT.md` created. |

## Sprint 38 — Investment Intelligence Committee framework (2026-07-19/20)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `ba56581` | 07-20 01:28 | feat(backend): add Investment Intelligence Committee framework | **The Committee (v2), built on the Evidence Matrix** — the direct predecessor of the Sprint 41 unification. |
| `4f5d537` | 07-20 01:28 | feat(frontend): add internal Committee View to Intelligence Console | Committee View added to the Console. |
| `a6815be` | 07-20 01:29 | docs: add SPRINT_38_REPORT.md | `SPRINT_38_REPORT.md` created. |

## Sprint 39 — Explainability Layer (2026-07-20)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `3c1577e` | 07-20 16:56 | feat(backend): add Explainability Layer | Explainability service introduced. |
| `590fa70` | 07-20 16:56 | feat(frontend): add Explainability panels to Intelligence Console | Explainability surfaced in the Console. |
| `a5a2ea7` | 07-20 16:57 | docs: add SPRINT_39_REPORT.md | `SPRINT_39_REPORT.md` created. |

## Sprint 40 — Conversational search, "what would change my mind," performance instrumentation (2026-07-20)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `43e82b4` | 07-20 17:46 | feat(product): make search conversational, retire duplicate Dashboard nav | Conversational search; **Dashboard nav retired** (duplicated Home). |
| `ba2ede1` | 07-20 17:50 | feat(product): recommendation 'what would change my mind', Portfolio AI insights | Counterfactual framing added to recommendations. |
| `18206c2` | 07-20 17:57 | feat(product): Feed actionability/freshness/read-time, onboarding drop-off telemetry | Feed metadata + drop-off telemetry. |
| `9858086` | 07-20 18:19 | feat(product): client-side performance instrumentation | Client performance instrumentation. |
| `9a5f78d` | 07-20 22:39 | docs: add SPRINT_40_REPORT.md | `SPRINT_40_REPORT.md` created. |

## Sprint 41 — One committee, one CIO, one execution path (2026-07-21)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `f294b28` | 07-21 09:31 | refactor(backend): unify to exactly one committee, one CIO, one execution path | **Major consolidation**: retires any duplicate/legacy committee execution path — exactly one committee implementation from this point forward. |
| `1ebc36b` | 07-21 16:14 | refactor(frontend): render the ONE committee everywhere, retire committeeApi.js | Frontend follows the same unification; old API client retired. |
| `3eebdea` | 07-21 18:14 | test: prove exactly one committee, one CIO, one execution path (Sprint 41) | Tests proving the unification (still enforced today — see `unification.test.js`, read during `AGENT-ORCHESTRATOR-001`'s research). |
| `c18e2ca` | 07-21 18:27 | docs: add SPRINT_41_REPORT.md | `SPRINT_41_REPORT.md` created. |

## Sprint 42 — Recommendation lifecycle, performance engine, scorecards (2026-07-21/22)

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `c498d23` | 07-21 23:59 | feat(backend): add recommendation lifecycle + performance engine | Lifecycle tracking + performance engine. |
| `d05de9d` | 07-22 00:09 | feat(backend): add committee, CIO, and evidence scorecards | Scorecards for committee/CIO/evidence quality. |
| `581f641` | 07-22 08:24 | feat(backend): extend explainability history + internal Quality API | Explainability history + internal quality API. |
| `063bdd4` | 07-22 09:29 | docs: add SPRINT_42_REPORT.md | `SPRINT_42_REPORT.md` created. This is the last commit before a four-day gap (07-22 to 07-26) in the commit history. |

## The Workspace Architecture arc — Mission Control through Agent Orchestrator (2026-07-26 – 2026-07-27)

Every commit in this arc is documented in exhaustive first-hand detail in `01_PROJECT_TIMELINE.md`, `02_PROMPTS_CLAUDE.md`, and `03_SUMMARIES_CLAUDE.md` — these were executed directly in the session this export was generated from, phase by phase, each with its own report doc. Listed here for chronological completeness only.

| Hash | Date/Time | Subject | Purpose |
|---|---|---|---|
| `c51048c` | 07-26 21:59 | feat: real-data UI integration, Attention Engine, Design Bible, and Mission Control v1 | First commit of this arc — bundled the accumulated work since Sprint 42 (by explicit user choice); Mission Control v1, the Attention Engine, and `IMPACTONE_DESIGN_BIBLE.md` all land here. **First commit pushed to `origin/sprint-16-live-data`.** |
| `aa4f851` | 07-26 22:43 | MISSION-CONTROL-002: release-readiness pass for Mission Control | Metric-ambiguity audit (Confidence/Attention/Probability separation), Demo Mode, semantic-consistency audit, regression pass. |
| `da70ac9` | 07-26 23:03 | LIVE-DATA-001: connect Mission Control to real platform services | Mission Control connected to 7 real backend services with per-section Demo Mode fallback. |
| `2895aed` | 07-27 00:20 | PORTFOLIO-001: rebuild Portfolio Workspace on Mission Control's architecture | Portfolio Workspace rebuilt on the same three-tier architecture. |
| `e155d68` | 07-27 15:21 | DESIGN-SYSTEM-001: extract reusable component layer from Mission Control + Portfolio | `HeroCard`, `DemoModeBanner`, `IntelligenceCard`, `AttentionLevelBadge` extracted; `DESIGN_SYSTEM.md` created. |
| `23f5dbe` | 07-27 16:40 | feat(frontend): add News Intelligence screen (NEWS-INTELLIGENCE-001) | New intelligence-layer News screen (not a feed) built on the Design System. |
| `6aae4e5` | 07-27 17:25 | feat(frontend): integrate Mission Control, Portfolio Workspace, and News Intelligence (PLATFORM-INTEGRATION-001) | `PlatformContext` + `requestCache` introduced; the three screens share selection state and de-duplicated requests. |
| `8c43b5a` | 07-27 17:33 | refactor(frontend): extract shared claim-presentation logic (DEDUPLICATION-001) | `claimPresentation.js` created, closing 3 named duplications. |
| `403d816` | 07-27 17:50 | feat(frontend): add Watchlist Workspace (WATCHLIST-001) | New Watchlist intelligence workspace. |
| `70c01c6` | 07-27 18:16 | feat(frontend): add AI Analysis Workspace (AI-ANALYSIS-001) | New reasoning-engine workspace over the Claim contract. |
| `a9f9367` | 07-27 18:28 | refactor(frontend): extract shared Intelligence Engine (PLATFORM-INTELLIGENCE-001) | `intelligenceEngine.js` created, consolidating ranking/prioritization/reasoning logic across all five Workspaces. |
| `9a4bd04` | 07-27 18:56 | feat(frontend): add Market Intelligence Workspace (MARKET-INTELLIGENCE-001) | New market-wide (not portfolio) intelligence workspace. |
| `3a9111d` | 07-27 19:32 | fix(frontend): resolve production build blocker (RELEASE-BLOCKER-001) | Root-caused and fixed the `npm run build` failure that had been open and deferred since it was first flagged; dependencies pinned; `vite.config.js` added. |
| `4fdc5bd` | 07-27 19:49 | feat(frontend): add Personal Intelligence Workspace (PERSONAL-INTELLIGENCE-001) | New personalization-aware workspace; `personalizationApi.js` client added. |
| `ed3680b` | 07-27 20:58 | fix(backend): close cross-user data leak in Investor Memory (PERSONALIZATION-PRIVACY-001) | **Critical privacy fix** — `UserMemoryEvent` gained real per-user scoping; a real cross-user data leak in Investor Memory (dating to Sprint 30/32) closed at the root. |
| `72a6129` | 07-27 22:19 | feat(backend): build the Agent Orchestrator (AGENT-ORCHESTRATOR-001) | New generic, parallel, timeout/retry/health-aware multi-agent engine for Stock Intelligence; 3 real agents, 10 prepared stub registrations. |

---

**Total: 224 commits**, all authored by `cryptonfteden`, spanning 2026-07-08 through 2026-07-27 (19 calendar days, with a 4-day gap between Sprint 42 and the Workspace Architecture arc).
