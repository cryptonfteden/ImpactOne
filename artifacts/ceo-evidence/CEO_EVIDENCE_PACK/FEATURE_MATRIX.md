# 05 — Feature Matrix

**Status key:**
- **Done** — real, reachable, working with real (or gracefully-degrading) data, as confirmed by this repo's own tests and/or live verification.
- **Partial** — real and reachable, but with a named, disclosed gap (e.g., some data honestly unavailable, or an internal-only surface).
- **Planned** — designed and/or scaffolded, but not reachable by a real user today.
- **Deprecated** — real, working code that still exists but is no longer reachable from navigation (kept for test compatibility, not for use).

**Sources:** `frontend/src/layout/screenRegistry.js`, `Sidebar.jsx`, `backend/routes/index.js`, and every sprint/phase report cited in `01_PROJECT_TIMELINE.md`.

---

## Primary navigation (always visible)

| Feature | Status | Notes |
|---|---|---|
| Home ("Today") | **Done** | Six-question model (Sprint 24), Morning Brief, Adaptive card ordering (Sprint 32), personal brief. |
| Market Dashboard | **Done** | Executive Dashboard, capped at 6 curated lists (X7). |
| Decision Center | **Done** | Aggregates real signals; 2 of 6 named sources honestly disclosed as unimplemented (X3). |
| Portfolio | **Done** | The real, server-owned Portfolio Engine (paper trading) — the default-enabled screen since Phase E2. |
| Workspaces (Watchlist Folders) | **Done** | Full CRUD, price alerts, notifications, user-scoped (Phase H3). |

## Advanced navigation ("More tools")

| Feature | Status | Notes |
|---|---|---|
| Mission Control | **Done** | First Workspace screen (this session); real data via 7 backend services, per-section Demo Mode fallback. |
| Intelligence Workspace | **Done** | Pre-dates this session's arc (X12C2); real `impactType` field used, no invented vocabulary. |
| Portfolio Workspace | **Done** | Rebuilt this session on Mission Control's architecture (`PORTFOLIO-001`); honest "not available" for rebalance suggestions (no backend concept exists). |
| News Intelligence | **Done** | New this session (`NEWS-INTELLIGENCE-001`) — an intelligence layer, deliberately not a second news feed. |
| Watchlist Workspace | **Done** | New this session (`WATCHLIST-001`) — real watchlist priority ranking + next-action rule. |
| AI Analysis Workspace | **Done** | New this session (`AI-ANALYSIS-001`) — the platform's reasoning engine over one real Claim. |
| Market Intelligence Workspace | **Done** | New this session (`MARKET-INTELLIGENCE-001`) — market-wide (not portfolio) sentiment/sectors/macro. |
| Personal Intelligence Workspace | **Done** | New this session (`PERSONAL-INTELLIGENCE-001`) — real risk profile + preferred sectors filtering real Claims. |
| Decision Timeline | **Done** | Merges 6 real sources, discloses 2 unavailable (X4). |
| Market Positioning | **Partial** | Real LONG/SHORT ranking from real quotes/price history; short interest and float **honestly and explicitly marked unavailable** — no provider exists for them (X2). |
| Global Intelligence | **Done** | Pre-dates this session. |
| AI Analysis (legacy) | **Deprecated-in-spirit, still primary for some users** | The older, pre-Workspace reasoning screen. An external review (`AI_ANALYSIS_REVIEW.md`) credited a genuine trust fix here (the "Wall Street Analyst Consensus" relabeling, Phase E3.5) but flagged up to 7 unranked confidence-like numbers on one screen as a real, un-reconciled complexity risk. Still nav-reachable, not formally retired. |
| Recommendations | **Done** | The Autonomous Recommendation Engine's own screen — explanation, bull/base/bear scenarios, quality score. |
| Daily Feed | **Done** | Real, personalized (not mock) since Sprint 20; freshness/read-time/actionability metadata added Sprint 40. |
| Themes | **Done** | Theme Dashboard + Theme Evolution (what's new/strengthened/weakened/why). |
| Alerts | **Done** | Price alerts, real quotes, scheduler-driven. |

## Internal / dev-console-only (gated by `VITE_DEV_CONSOLE`, unreachable in a normal build)

| Feature | Status | Notes |
|---|---|---|
| Intelligence Console | **Planned/Internal** | Houses the Committee View, Market Intelligence Source Layer panel, Explainability panels — all real, all internal-only by design. |
| Health Dashboard | **Planned/Internal** | Read-only structured health status. |
| Admin Dashboard | **Planned/Internal** | Feature flags, error reports, beta metrics. |
| AI Performance Dashboard | **Planned/Internal** | Internal AI/committee/CIO/evidence scorecards (Sprint 42). |

## Deprecated (code exists, not reachable from navigation)

| Feature | Status | Notes |
|---|---|---|
| Dashboard (`DashboardScreen.jsx`) | **Deprecated** | Retired from nav in Sprint 40 as a duplicate of Home; code kept, unreachable. |
| Legacy flat Watchlist screen | **Deprecated** | Superseded by Watchlist Folders; kept solely for existing test compatibility (`PLATFORM_TECH_DEBT.md` TD9). |
| Legacy pre-Workspace `AiAnalysisScreen.jsx`'s specific committee display | **Deprecated** | The legacy Investment Committee display it once showed was deleted in Sprint 41's unification; the screen itself persists in a reduced/different form. |
| Legacy client-side "virtual portfolio" | **Partially deprecated, unresolved** | Coexists with the real Portfolio Engine; not formally retired, flagged repeatedly as a risk if it and the real engine ever diverge (`KNOWN_LIMITATIONS.md`). |

---

## Backend engines and subsystems (not directly nav-reachable, but load-bearing)

| Subsystem | Status | Notes |
|---|---|---|
| Autonomous Recommendation Engine | **Done** | Advisory-only; the platform's core decision-facing output. |
| Investment Intelligence Committee (unified) | **Done** | One committee, one CIO, one execution path since Sprint 41 — structurally test-enforced. |
| Explainability Layer | **Done** | Full trace-back from verdict to evidence; disagreement classified and disclosed, never smoothed over. |
| World Memory | **Partial** | Real, append-only schema and query logic; **actual populated causal-link data is close to empty** (`PRODUCT_ROADMAP_GAPS.md`) — the Impact Graph feature it powers is honest about showing "no recorded causal chain" rather than fabricating one. |
| Claim Intelligence Layer | **Done** | Formation/evidence ledger/lifecycle/resolution — the data model 5 of the 7 Workspace screens are built on. |
| Provider layer (data ingestion) | **Partial** | Real contract/rate-limiter/registry for 22 providers; **only a small minority are genuinely live** (2 of 22 per Sprint 37's audit) — the rest are honest, disclosed foundations awaiting a vendor relationship. |
| Options Agent | **Partial → improving** | Fully tested foundation (backend-only) existed with no reachable frontend surface for a long stretch (`PRODUCT_ROADMAP_GAPS.md` Tier 2). This session's Agent Orchestrator gives it its first real, reachable integration (as one of 3 real agents). |
| Market Sentiment Engine | **Done** | Market-wide (not per-symbol) sentiment; one of the 3 real agents reused by the Agent Orchestrator. |
| Technical Intelligence | **Done** | Full indicator suite (trend, MAs, RSI, MACD, ATR, VWAP, Bollinger, Fibonacci, support/resistance, breakout, volatility regime); one of the 3 real Agent Orchestrator agents. |
| Learning Loop (self-measurement) | **Partial** | Measures itself in real detail (Sprint 42's scorecards); **explicitly, structurally does not feed back into live decisions** except for one narrow, deliberate exception (Sprint 41's confidence-calibration adjustment) — by design, not oversight. |
| Personalization (3 separate services) | **Done, but architecturally fragmented** | `feedPersonalizationService`, `personalIntelligenceService`, and `personalizationService` each compute a related-but-distinct notion of user preference, with no shared canonical object between them (`PERSONAL_INTELLIGENCE_REVIEW.md`) — a real, flagged duplication risk, not yet consolidated the way `claimPresentation.js`/`intelligenceEngine.js` consolidated frontend logic. |
| Agent Orchestrator | **Partial (new this session)** | Generic engine complete and tested; 3 of 13 named agent domains are real, 10 are honest inert stubs; not yet wired as the canonical Stock Intelligence path (deliberately, to avoid an unreviewed change to the existing endpoint). |
| Investor/User/Personal Memory | **Done (privacy-fixed this session)** | Real synthesis of reading/holding/reaction/learning history; the cross-user data leak found in `UserMemoryEvent` was closed at the root in `PERSONALIZATION-PRIVACY-001` (2026-07-27). |
| i18n/RTL foundation | **Partial** | Real Intl-based framework shipped (Sprint 35); only nav/Header/Home actually migrated — roughly 25 of ~30 screens remain hardcoded English, an explicitly disclosed scope limit. |
| Analytics/Telemetry | **Done** | Anonymous by schema design (no PII columns possible), 17-event catalog as of Sprint 42/X9. |
| PWA / offline support | **Partial** | Installable, real service worker; offline/stale-data handling is most complete on Home, less complete on other screens (`KNOWN_LIMITATIONS.md`). |

---

## What this matrix does not show

This matrix reflects **what exists and is reachable**, not **what has been validated with real external users**. As `01_PROJECT_TIMELINE.md`'s closing section and `10_EXECUTIVE_NOTES.md` both note, this repo's own audit trail contains no evidence of a completed real-user private beta — every "Done" status above describes engineering/product completeness, verified by tests and/or live technical checks, not user validation.
