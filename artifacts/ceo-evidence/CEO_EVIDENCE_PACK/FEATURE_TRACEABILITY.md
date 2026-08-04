# Feature Traceability

Every implemented feature, traced from its original requirement through the sprint that built it to its current status and future dependencies. Sourced from `CEO_AUDIT_EXPORT/05_FEATURE_MATRIX.md` and `01_PROJECT_TIMELINE.md`, cross-checked against `09_COMMITS.md`.

---

## Primary navigation

| Feature | Original requirement | Sprint implemented | Files | Tests | Current status | Future dependencies |
|---|---|---|---|---|---|---|
| Home ("Today") | "My First Daily Experience" — answer the user's most important daily questions | Sprint 20 (4 questions), widened Sprint 24 (6 questions) | `HomeScreen.jsx`, `homeSummaryService.js` | Covered in every sprint's regression suite from Sprint 20 onward | **Done** | Adaptive-Home weight tuning against real usage (never done) |
| Market Dashboard | Executive-level market overview | X7 | `ExecutiveDashboardScreen.jsx` | 292/292 frontend at X7 | **Done** | None named |
| Decision Center | Aggregate "what needs my attention" across sources | X3/X4 | `decisionCenterService.js`, `DecisionCenterScreen.jsx`, `DecisionState` model | 419/638 backend across X3/X4 | **Done**, 2 of 6 named sources honestly disclosed unimplemented | The 2 missing sources named in-product, not silently hidden |
| Portfolio | Real, persisted paper-trading | Sprint 14, default-enabled Phase E2 | `portfolioEngineService.js`, `portfolioRepository.js` | Since Sprint 14, growing | **Done** | Reconcile with the still-coexisting legacy client-side portfolio (M6) |
| Workspaces (Watchlist Folders) | Organize watchlist symbols into folders with alerts | Phase H3 | `WatchlistFolder`/`WatchlistFolderItem`/`PriceAlert`/`Notification` models | 382/382 backend, 182/182 frontend at H3 | **Done**, full CRUD, user-scoped | None named |

## Advanced navigation ("More tools")

| Feature | Original requirement | Sprint implemented | Files | Tests | Current status | Future dependencies |
|---|---|---|---|---|---|---|
| Mission Control | "First production-quality Mission Control screen" per Design Bible/Masterplan | This session, `MISSION-CONTROL-001`/`-002`/`LIVE-DATA-001` | `MissionControlHomeScreen.jsx` | Passing throughout | **Done** | None named |
| Intelligence Workspace | Pre-existing (X12C2) | X12C2 | (pre-session) | 369/369 frontend | **Done** | Real `impactType` field, no invented vocabulary |
| Portfolio Workspace | "How am I doing/why/what changed/attention/actions" | This session, `PORTFOLIO-001` | `PortfolioWorkspaceScreen.jsx` | Passing | **Done**, honest "not available" for rebalance (no backend concept) | If rebalance logic is ever built, this screen is ready to consume it |
| News Intelligence | Intelligence layer, not a feed | This session, `NEWS-INTELLIGENCE-001` | `NewsIntelligenceScreen.jsx` | Passing | **Done** | None named |
| Watchlist Workspace | Which symbols deserve attention/why/next action | This session, `WATCHLIST-001` | `WatchlistWorkspaceScreen.jsx` | Passing | **Done** | None named |
| AI Analysis Workspace | Platform's reasoning engine, not a chatbot | This session, `AI-ANALYSIS-001` | `AiAnalysisWorkspaceScreen.jsx` | Passing | **Done** | None named |
| Market Intelligence Workspace | Explain the market itself, not the portfolio | This session, `MARKET-INTELLIGENCE-001` | `MarketIntelligenceWorkspaceScreen.jsx` | Passing (1 live bug fixed: `macroRegime` object-vs-string) | **Done** | None named |
| Personal Intelligence Workspace | Transform into a personalized platform | This session, `PERSONAL-INTELLIGENCE-001` | `PersonalIntelligenceWorkspaceScreen.jsx`, `personalIntelligenceService.js` | Passing | **Done** | Depended on the privacy fix in `PERSONALIZATION-PRIVACY-001`, now closed |
| Decision Timeline | Merge 6 real sources | X4/X7 | `decisionTimelineService`, `DecisionTimelineScreen.jsx` | 292/292 at X7 | **Done**, 2 of 6 sources honestly disclosed unavailable | Same as Decision Center |
| Market Positioning | LONG/SHORT ranking from real data | X2 | `marketPositioningService.js` | 202/202 at X2 | **Partial** | Short interest/float provider (none exists — named data-breadth gap #14) |
| Global Intelligence | Pre-existing | Pre-session | (pre-session) | n/a to this pack | **Done** | None named |
| AI Analysis (legacy) | Original pre-Workspace reasoning screen | Sprint 18A onward, relabeled Phase E3.5 | (legacy path) | n/a to this pack | **Deprecated-in-spirit, still nav-reachable** | Up to 7 unranked confidence-like numbers on one screen, flagged not yet reconciled |
| Recommendations | The Recommendation Engine's own screen | Sprint 16 | `RecommendationsScreen.jsx` | Since Sprint 16 | **Done** | None named |
| Daily Feed | Real, personalized news | Sprint 20, metadata added Sprint 40 | `feedPersonalizationService.js` | Since Sprint 20 | **Done** | None named |
| Themes | Theme Dashboard + Evolution | Sprint 20 (Dashboard), Sprint 29 (Evolution) | `themeIntelligenceService.js` | Since Sprint 20 | **Done** | None named |
| Alerts | Price alerts, real quotes | Phase H3 | `PriceAlert` model | 382/382 at H3 | **Done** | None named |

## Internal / dev-console-only

| Feature | Original requirement | Sprint implemented | Files | Tests | Current status | Future dependencies |
|---|---|---|---|---|---|---|
| Intelligence Console | Internal diagnostics surface | Sprint 21A onward | Various console panels | n/a (internal) | **Planned/Internal** | None — deliberately internal |
| Health Dashboard | Read-only structured health | Named in roadmap docs | (internal) | n/a | **Planned/Internal** | None named |
| Admin Dashboard | Feature flags, error reports, beta metrics | X9 | `AdminDashboardScreen.jsx` | 701/701 backend, 298/298 frontend at X9 | **Planned/Internal** | None named |
| AI Performance Dashboard | Internal scorecards | Sprint 42 | `/v2/ai-performance-dashboard` | 516/164 at Sprint 42 | **Planned/Internal** | None named |

## Deprecated

| Feature | Original requirement | Sprint retired | Files | Current status | Future dependencies |
|---|---|---|---|---|---|
| Dashboard (`DashboardScreen.jsx`) | Original MVP dashboard | Retired Sprint 40 | Code retained, unreachable | **Deprecated** | None — candidate for deletion once confirmed truly dead |
| Legacy flat Watchlist screen | Original watchlist | Superseded by Watchlist Folders (Phase H3) | Code retained for test compatibility | **Deprecated** | Retire once its tests are ported or retired |
| Legacy pre-Workspace `AiAnalysisScreen.jsx`'s committee display | Original committee UI | Deleted Sprint 41 (screen persists reduced) | (legacy) | **Deprecated** | None named |
| Legacy client-side "virtual portfolio" | Original MVP paper-trading | Never formally retired | `localStorage`-backed | **Partially deprecated, unresolved** | Real risk if it diverges from the server-owned Portfolio Engine (M6) |

## Backend engines and subsystems

| Subsystem | Original requirement | Sprint implemented | Files | Tests | Current status | Future dependencies |
|---|---|---|---|---|---|---|
| Autonomous Recommendation Engine | Advisory-only decision-facing output | Sprint 16 | `autonomousRecommendationEngine.js` | Since Sprint 16 | **Done** | None named |
| Investment Intelligence Committee (unified) | One committee, one CIO, one path | Sprint 38 (built), Sprint 41 (actually unified) | `intelligenceCommittee/` | 488/164 at Sprint 41 | **Done** | None named |
| Explainability Layer | Trace verdict back to evidence | Sprint 39 | `decisionTraceExplainabilityService.js` | 489/150 at Sprint 39 | **Done** | None named |
| World Memory | Permanent causal/historical record | Sprint 21A | `worldMemoryRepository.js`, 8 models | Since Sprint 21A | **Partial** | Populate real causal-link data (currently close to empty) — Roadmap #15 |
| Claim Intelligence Layer | Formation/evidence/lifecycle/resolution of tracked claims | Pre-session | `claimIntelligence/` | Pre-session | **Done** | The data model 5 of 7 Workspace screens are built on |
| Provider layer (data ingestion) | Contract-based external data sourcing | Sprint 21A (15), grown to 22 by Sprint 37 | `providers/` | Since Sprint 21A | **Partial** | Only 2 of 22 genuinely live — fund real vendors (Roadmap #14) |
| Options Agent | Options-flow anomaly detection | Pre-session (backend), reachable via `AGENT-ORCHESTRATOR-001` (2026-07-27) | `optionsAgent/` | 817/817 backend per one audit | **Partial → improving** | Live vendor connection, scheduler |
| Market Sentiment Engine | Market-wide sentiment | Pre-session | `marketSentiment/` | Pre-session | **Done** | Reused as one of 3 real Agent Orchestrator agents |
| Technical Intelligence | Full indicator suite | Pre-session | Technical services | Pre-session | **Done** | Reused as one of 3 real Agent Orchestrator agents |
| Learning Loop | Self-measurement of platform outcomes | Sprint 30 (built), Sprint 42 (scorecards) | `learningLoopService.js` | Since Sprint 30 | **Partial** | Structurally does not feed back into live decisions except one narrow exception (Sprint 41 calibration) |
| Personalization (3 services) | Personalize ordering/relevance, never facts | Sprint 20, 30, X10 (three separate builds) | `feedPersonalizationService.js`, `personalIntelligenceService.js`, `personalizationService.js` | Each independently tested | **Done, architecturally fragmented** | Consolidate into one canonical object (Roadmap #6) |
| Agent Orchestrator | Generic parallel multi-agent engine for Stock Intelligence | This session, `AGENT-ORCHESTRATOR-001` | `agentOrchestrator/` | 41 new tests | **Partial (new)** | Build the 10 remaining real agents (Roadmap #9); wire as canonical path (Roadmap #8) |
| Investor/User/Personal Memory | Synthesize user history | Sprint 30/32 (built), `PERSONALIZATION-PRIVACY-001` (privacy-fixed, 2026-07-27) | `investorMemoryService.js`, `userMemoryRepository.js` | 1089 backend post-fix | **Done (privacy-fixed this session)** | Confirm no other model shares the same gap (open question) |
| i18n/RTL foundation | Internationalization | Sprint 35 | `I18nProvider` | 365/143 at Sprint 35 | **Partial** | ~25 of ~30 screens remain hardcoded English |
| Analytics/Telemetry | Anonymous usage tracking | Sprint 35 (events), grown to 17-event catalog by Sprint 42/X9 | `AnalyticsEvent` model | Since Sprint 35 | **Done** | None named |
| PWA / offline support | Installable, offline-aware | Sprint 33 | Service worker, manifest | 360/135 at Sprint 33 | **Partial** | Offline handling less complete on non-Home screens |

---

## A note on how "Done" should be read

Every "Done" status in this file, and in `CEO_AUDIT_EXPORT/05_FEATURE_MATRIX.md` it's sourced from, means **technically verified working** — passing tests, and in most cases a live-run confirmation. It does **not** mean validated by real external users. See `PROJECT_HEALTH.md`'s "User readiness" section and `EXECUTIVE_TIMELINE.md`'s closing note for the direct discussion of that gap.
