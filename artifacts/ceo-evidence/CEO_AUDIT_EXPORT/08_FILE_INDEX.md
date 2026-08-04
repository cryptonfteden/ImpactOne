# 08 — File Index

**Purpose:** an index of the current codebase's most important files and directories, with a plain-English purpose for each — a map for anyone (including a non-engineer) who needs to know "where does X live" without reading the code. This reflects the codebase as it exists today; historical/retired files are noted where relevant but this is not a historical archive (see `01_PROJECT_TIMELINE.md`/`09_COMMITS.md` for history).

---

## 1. Backend — top-level structure

```
backend/
├── controllers/     — one thin file per route group; parses the request, calls a service, returns JSON
├── routes/          — Express route definitions; maps a URL path to a controller function
├── services/        — where all real business logic lives (see below)
├── prisma/          — the database schema (schema.prisma) and every migration
├── db/              — the Prisma client singleton
├── middleware/       — cross-cutting request handling (e.g. beta user identity resolution)
└── test/            — shared test helpers (DB truncation, test environment setup)
```

**Routing convention:** `backend/routes/index.js` is the single file that mounts every route group. As of this export it mounts **51 distinct route groups**, each under its own URL prefix (see the full table below). Every controller follows the same house style: a thin function that calls into exactly one service and either returns JSON or maps a thrown `error.statusCode` to the right HTTP status.

### Full route-mount table (from `backend/routes/index.js`)

| Mount prefix | What it serves |
|---|---|
| `/news`, `/watchlist`, `/market`, `/ai/analyze`, `/compare`, `/portfolio`, `/quote`, `/alt-data/*` | Legacy, pre-`/v2` top-level routes from the earliest sprints (still live) |
| `/v2/home-summary` | The six-question Home aggregation |
| `/intelligence` | Market-wide intelligence overview, live feed, global map, changes, watchlist priority |
| `/v2/portfolio` | The real Portfolio Engine (paper-trading) |
| `/v2/recommendations` | The Autonomous Recommendation Engine |
| `/v2/investor-profile` | Real InvestorProfile CRUD + deterministic investment-profile generation |
| `/v2/themes` | Theme Intelligence (Theme Dashboard's data source) |
| `/v2/providers` | Data-provider health/metrics/diagnostics/metadata |
| `/v2/quality-dashboard` | Internal recommendation-quality dashboard |
| `/v2/lessons` | Outcome Intelligence ("lessons learned") |
| `/v2/calibration-reports` | Calibration Reports (confidence vs. real outcome) |
| `/v2/personal-progress` | Personal Progress tracking |
| `/v2/investor-memory` | Investor Memory (the subsystem fixed for cross-user leakage in `PERSONALIZATION-PRIVACY-001`) |
| `/v2/analytics` | Anonymous analytics event ingestion |
| `/v2/market-intelligence` | A distinct, unrelated provider-source aggregation system (not to be confused with the frontend's "Market Intelligence Workspace") |
| `/v2/committee-intelligence` | The ONE unified Investment Committee (Sprint 41) |
| `/v2/explainability` | Explainability Layer |
| `/v2/quality-platform` | Quality Platform (lifecycle/performance engine) |
| `/v2/beta` | Beta invite/identity management |
| `/v2/watchlist-folders` | Watchlist Folders ("Workspaces" in the sidebar) |
| `/v2/price-alerts` | Price alerts |
| `/v2/notifications` | Notification Center |
| `/v2/market` (second mount) | Market Positioning |
| `/v2/impact-graph` | Impact Graph (cause-and-effect chains) |
| `/v2/decisions` | Decision Center |
| `/v2/workspaces` | Watchlist Folders' workspace detail view |
| `/v2/symbol-intelligence` | Composed per-symbol intelligence (impact graph + market positioning + opportunity score + recommendation + alerts) |
| `/v2/agent-orchestrator` | **The new Agent Orchestrator** (`AGENT-ORCHESTRATOR-001`) |
| `/v2/system-health` | System health |
| `/v2/decision-timeline` | Decision Timeline |
| `/v2/executive-dashboard` | Executive Dashboard |
| `/v2/feedback`, `/v2/error-reports`, `/v2/feature-flags` | Product-ops utilities |
| `/v2/admin-dashboard`, `/v2/beta-metrics`, `/v2/performance-metrics`, `/v2/ai-performance-dashboard` | Internal/admin-only dashboards |
| `/v2/user-learning` | User learning profile |
| `/v2/personalization` | **The personalization snapshot** consumed by Personal Intelligence Workspace |
| `/v2/recommendation-quality` | Recommendation quality scoring |
| `/v2/news-source-scoring` | News source quality scoring |
| `/v2/explainability-insights` | Explainability insights |
| `/v2/market-memory` | Market Memory |
| `/v2/methodology-versions` | Methodology versioning |
| `/v2/outcome-feedback` | Outcome feedback |
| `/v2/dynamic-source-scoring` | Dynamic source scoring |
| `/v2/calibration-analysis` | Calibration analysis |
| `/chat` | Ask ImpactOne chat endpoint |
| `/v2/claims` | The Claim Intelligence Layer |
| `/v2/options-agent` | Options-flow anomaly detection |
| `/v2/market-sentiment` | The Market Sentiment Engine |
| `/v2/morning-brief` | The Morning Brief |

## 2. Backend — the most significant service files/subsystems

| File / directory | Purpose |
|---|---|
| `services/autonomousRecommendationEngine.js` | The Autonomous Recommendation Engine — advisory only, generates and persists `Recommendation` rows from market events + portfolio exposure. Never places a trade. |
| `services/portfolioEngineService.js` | The real (paper-trading) Portfolio Engine — quotes, positions, trades, performance. |
| `services/homeSummaryService.js` | Aggregates the Home screen's six questions; never computes its own verdict, only reads what other services already decided. |
| `services/investorProfileService.js` | Deterministic (non-LLM), documented allocation-formula generator for the onboarding "AI Investment Profile." |
| `services/investorMemoryService.js` | Synthesizes a user's reading/holding/reaction/learning history from other append-only sources. **Fixed for a real cross-user data leak in `PERSONALIZATION-PRIVACY-001`.** |
| `services/userMemoryRepository.js` | The append-only event log behind Investor Memory (`UserMemoryEvent`). Every read now requires and filters by a real `betaUserId`. |
| `services/feedPersonalizationService.js` | Re-ranks the Daily Feed by investor-profile fit — reorders only, never changes facts. |
| `services/personalizationService.js` | The newest personalization surface — real preferred sectors (from held positions), risk tolerance, holding period, recommendation-style preference. |
| `services/personalIntelligenceService.js` | Re-ranks Recommendations by user relevance (favorite/ignored sectors, view counts) — reorders only. |
| `services/autonomousMarketService.js` | Core market-overview/news-ranking engine; defines the platform's event-type taxonomy. Underlies Home and Impact Intelligence. |
| `services/impactIntelligenceService.js` | Composes relationship-graph, historical-similarity, scenario, propagation, and portfolio-intelligence services into one impact analysis. |
| `services/impactGraphService.js` | The Impact Graph — cause-and-effect chains built entirely from World Memory. Named a "signature feature." Shows "no recorded causal chain" honestly rather than fabricating one. |
| `services/decisionCenterService.js` | Aggregates real signals into "what decisions need my attention today." |
| `services/symbolIntelligenceService.js` | Composes six other services into one per-symbol intelligence payload (predates the Agent Orchestrator; still live, not replaced). |
| `services/researchAgentService.js` | A safety-critical research/knowledge agent — explicitly forbidden from placing trades or claiming unproven strategies, enforced by both import restrictions and a dedicated safety test. |
| `services/scenarioEngineService.js` | Theme detection + bull/base/bear scenario templates. |
| `services/marketPositioningService.js` | LONG/SHORT pressure ranking using only real available data; short interest/float honestly marked unavailable where no provider exists. |
| `services/intelligenceCommittee/` (`intelligenceCommitteeService.js`, `committeeCoordinator.js`, `chiefInvestmentOfficerService.js`, `members/*`) | **The ONE unified Investment Committee** (Sprint 41) — eight synchronous specialist "members" evaluating one shared evidence matrix, a CIO layer that summarizes disagreement without ever blending confidence into one number. |
| `services/marketSentiment/` | The Market Sentiment Engine — dimension scorers, rollup, governance, repository. |
| `services/claimIntelligence/` | The Claim Intelligence Layer — formation, evidence ledger, lifecycle, resolution of tracked investment "Claims." The data model several newer frontend Workspaces (Mission Control, Portfolio Workspace, AI Analysis Workspace) are built on. |
| `services/agentOrchestrator/` | **The new Agent Orchestrator** — see `04_ARCHITECTURE_DECISIONS.md` and `AGENT_ORCHESTRATOR.md` for full detail. |
| `services/optionsAgent/` | Options-flow anomaly detection engine. |
| `services/providers/` | The provider layer — contract, rate limiter, retry policy, and 15 real provider definitions. |

## 3. Frontend — screens and features

`frontend/src/screens/` holds one `.jsx` file per screen (each with its own `.test.jsx`). `frontend/src/features/` holds one thin wrapper component per nav-reachable feature — this indirection lets `screenRegistry.js` lazy-load and gate screens uniformly.

### The current, real navigation structure (`Sidebar.jsx`)

**Primary (always visible):** Today (Home), Market Dashboard, Decision Center, Portfolio, Workspaces (Watchlist Folders).

**Advanced (collapsed by default, under "More tools"):** Mission Control, Intelligence Workspace, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace, Market Intelligence Workspace, Personal Intelligence Workspace, Decision Timeline, Market Positioning, Global Intelligence, AI Analysis, Recommendations, Daily Feed, Themes, Alerts.

**Dev-console-only (unreachable in production, gated by `VITE_DEV_CONSOLE`):** Intelligence Console, Health Dashboard, Admin Dashboard, AI Performance Dashboard.

**Retired/unreachable, not deleted:** "Dashboard" (`DashboardScreen.jsx`, removed from nav in Sprint 40 as a duplicate of Home); the legacy flat "Watchlist" screen (superseded by Watchlist Folders, kept for its still-passing tests).

### The five newest "Workspace" screens (built in this session's final arc, 2026-07-26/27)

| Screen | Purpose |
|---|---|
| `MissionControlHomeScreen.jsx` | The first Workspace — a three-tier (Brief/Signals/Context) briefing built on the Claim Intelligence Layer. |
| `PortfolioWorkspaceScreen.jsx` | "How am I doing, why, what changed, which positions need attention" — rebuilt on Mission Control's architecture. |
| `NewsIntelligenceScreen.jsx` | An intelligence layer over real news events (not a second news feed) — what happened/why it matters/why you should care/holdings affected/what changed. |
| `WatchlistWorkspaceScreen.jsx` | Real watchlist priority ranking, why, what changed, next action, which symbols became more important. |
| `AiAnalysisWorkspaceScreen.jsx` | The platform's reasoning engine over one real Claim — what's happening, why believed, supporting/contradicting evidence, invalidation conditions, what to monitor. |
| `MarketIntelligenceWorkspaceScreen.jsx` | The market itself (not the user's portfolio) — sentiment, sector leaders/laggards, macro events, capital flow, what to monitor. |
| `PersonalIntelligenceWorkspaceScreen.jsx` | The user's own real risk profile, preferred sectors, and watchlist, filtering real Claims into "why this matters to YOU." |

## 4. Frontend — the shared Design System (`frontend/src/components/nova/`)

The reusable component layer extracted (`DESIGN-SYSTEM-001`) from the first two Workspace screens, documented in full in `DESIGN_SYSTEM.md`:

| Component | Purpose |
|---|---|
| `HeroCard.jsx` | The one large "emphasis" surface per screen — largest scale, one-time entrance pulse. At most one per screen. |
| `MetricArc.jsx` | The one scoring primitive — renders Confidence, Attention, or Probability as a partial-arc gauge. Confidence is color-banded; Attention/Probability use fixed hues — the three metrics are never conflated. |
| `IntelligenceCard.jsx` | The canonical "Claim" card — generalized via a `sections` prop to answer any screen's own Q&A structure without a new component. |
| `AttentionLevelBadge.jsx` | Always renders the one fixed "attention" badge tone — never colliding with Confidence's or Status's banded tones (a real bug found and fixed in `DESIGN-SYSTEM-001`). |
| `DemoModeBanner.jsx` | Per-section Demo Mode disclosure — silent when fully live, names exactly which section(s) fell back when partial. |
| `Badge.jsx`, `Card.jsx`, `Button.jsx` | General-purpose primitives underlying the above. |
| `Loading.jsx` (`Skeleton`, `EmptyState`, `ProgressBar`, `OfflineBanner`, `ReconnectBanner`) | Loading and honest-empty-state primitives. |

## 5. Frontend — shared cross-cutting infrastructure

| File | Purpose |
|---|---|
| `frontend/src/context/PlatformContext.jsx` | Shared `selectedClaim`/`selectedSymbol`/`portfolioContext` state and `navigateTo` across all Workspace screens (`PLATFORM-INTEGRATION-001`). |
| `frontend/src/services/requestCache.js` | A small keyed cache de-duplicating identical concurrent/recent API requests across screens — not a blanket cache, opt-in per call site. |
| `frontend/src/utils/claimPresentation.js` | The one shared implementation of `statusTone`/`statusPlainLabel`/`attentionLevel`/`computeChangedClaimsText` (`DEDUPLICATION-001`), closing three real duplications. |
| `frontend/src/services/intelligenceEngine.js` | The shared ranking/prioritization/reasoning-pipeline module (`PLATFORM-INTELLIGENCE-001`) every Workspace screen now consumes instead of its own local reimplementation. |
| `frontend/src/services/api/` | One thin client module per backend route group — see the codebase index for the full list (38 client modules as of this export). |
| `frontend/src/layout/screenRegistry.js` | The single source of truth mapping a nav key to its feature component. |
| `frontend/src/layout/Sidebar.jsx` | The real, current navigation structure (see above). |

## 6. Database — Prisma schema

`backend/prisma/schema.prisma` currently defines **50 models**, migrated via 29 sequential migrations under `backend/prisma/migrations/` (the most recent being `20260727172718_personalization_privacy_user_memory_scoping`). Notable model groups:

- **Portfolio Engine**: `Portfolio`, `Position`, `Order`, `Trade`, `CashLedgerEntry`, `PerformanceSnapshot`.
- **Recommendations**: `Recommendation`, `RecommendationFeedback`, `DecisionTrace`, `AutonomousRunLog`, `RecommendationLifecycleEvent`.
- **Personal Intelligence**: `InvestorProfile`, `UserMemoryEvent` (the model at the center of `PERSONALIZATION-PRIVACY-001`).
- **World Memory** (append-only, 8 models): `WorldMemoryRecord`, `WorldMemoryCausalLink`, `WorldMemoryStateChange`, `WorldMemoryPrediction`, `Outcome`, `WorldMemoryThesisRevision`, `WorldMemorySectorImpact`, `WorldMemoryLesson`.
- **Provider layer**: `CanonicalEvent`, `ProviderRunLog`.
- **Beta/identity**: `BetaUser`, `DecisionState`.
- **Options**: `OptionsFlowPrint`, `OptionsOpenInterestSnapshot`, `OptionsSignal`.
- **Market Sentiment**: `MarketSentimentSnapshot`.
- **Intelligence Bus**: `IntelligenceBusEvent`.
- **Claim Intelligence Layer**: `Claim`, `ClaimEvidence`, `ClaimTransition`, `ClaimOutcome`.
- **Workspace/watchlist**: `WatchlistFolder`, `WorkspaceNote`, `WatchlistFolderItem`, `PriceAlert`, `Notification`.
- **Quality/governance**: `MethodologyVersion`, `ScoringAdjustmentAudit`, `SourceScoreSnapshot`, `ThemeConfidenceSnapshot`, `TradingPrinciple`, `PrincipleBacktestResult`.
- **Ops**: `AnalyticsEvent`, `Feedback`, `ErrorReport`, `FeatureFlag`.

## 7. Root-level documentation — a note on volume

The repository root contains **over 350 markdown documents** — specs, architecture docs, sprint reports, audits, CEO memos, and reviews accumulated across this project's history. This is an unusually (for most codebases) extensive documentary trail; see `10_EXECUTIVE_NOTES.md` for commentary on what this volume means in practice. The most load-bearing, current ones are:

- **`PROJECT_STATUS.md`** — the running status doc, updated at nearly every sprint boundary.
- **`ARCHITECTURE.md`**, **`CANONICAL_DOMAIN_MODEL.md`**, **`API_CONTRACTS.md`** — the three documents that together define "what the system means" and "what it exposes."
- **`DESIGN_SYSTEM.md`**, **`IMPACTONE_DESIGN_BIBLE.md`** — the frontend's design/component contract.
- **This export's own source documents** — `PLATFORM_INTEGRATION.md`, `DEDUPLICATION_REPORT.md`, `PLATFORM_INTELLIGENCE.md`, `RELEASE_BLOCKER_REPORT.md`, `PERSONALIZATION_PRIVACY_REPORT.md`, `AGENT_ORCHESTRATOR.md` — each a first-hand, detailed report of one phase in the final Workspace Architecture arc.
