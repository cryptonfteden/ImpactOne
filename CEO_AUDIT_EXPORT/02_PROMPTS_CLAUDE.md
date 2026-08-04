# 02 — Prompts Executed by Claude Code

**Scope, stated honestly:** this file covers the prompts (phase missions) issued to Claude Code **within the single continuous session this export was generated from** — the Workspace Architecture arc, 2026-07-26 through -27, spanning 16 phases from `MISSION-CONTROL-001` through this `CEO-AUDIT-EXPORT-001` phase itself. Every sprint and phase before this arc (Sprints 1–43, the D1 series, Phases C/D/E/H/X2–X12C3.1) was executed in prior sessions this export's author does not have direct access to the literal prompts for — those are documented from their own output artifacts (`SPRINT_*_REPORT.md`, etc.) in `01_PROJECT_TIMELINE.md` instead, since only their results, not their exact input wording, survive in this repository. Wording below is preserved verbatim from this session's actual messages, in chronological order.

---

## Phase: MISSION-CONTROL-001

> Build first production-quality Mission Control screen implementing `IMPACTONE_DESIGN_BIBLE.md` and `MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md`, using deterministic mock data (not live APIs), three-tier layout, premium spacing/glass/depth/motion, run tests, commit as `MISSION-CONTROL-001`, push to repository, provide files changed/screenshots/test summary/limitations.

*(Reconstructed from this session's own compaction summary at the point this export's context began — this phase had already completed before the author's visibility into this session started, and is recorded here as accurately as that summary preserved it.)*

---

## Phase: MISSION-CONTROL-002

> Prepare Mission Control for release readiness. Focus only on the implementation. Do not redesign the UX. Required: (1) remove metric ambiguity — Confidence/Probability/Attention must be three independent concepts, audit every component; (2) implement Demo Mode with clear indicator when mock data active; (3) audit semantic consistency (labels/tooltips/ARIA/names/docs vs Design Bible); (4) regression testing — run all tests, fix regressions, run build if possible, document blockers. Output: files changed, tests, remaining blockers, release readiness assessment. Commit: MISSION-CONTROL-002.

---

## Phase: LIVE-DATA-001

> Replace Mission Control's deterministic demo data with the real platform services that already exist. Do not redesign the UI. Do not change the user experience. Do not build new intelligence engines. Connect to: Morning Brief, Claims, Attention Engine, Portfolio Intelligence, Risk Assessment, Opportunity Assessment. Requirements: preserve current UX exactly; Demo Mode must automatically disappear when live data is available; if any service unavailable, gracefully fall back to Demo Mode with existing disclosure; do not fabricate missing data; log which services are connected/unavailable. Validation: run all tests, verify renders correctly with live data, verify fallback behavior, document remaining integration gaps. Output: connected services, remaining missing integrations, test summary, screenshots, commit summary. "Only commit if the implementation is complete and stable."

---

## Phase: PORTFOLIO-001

> Redesign and implement the Portfolio screen using the same architecture and design language established by Mission Control. Do not redesign the Design Bible. Reuse existing platform services where possible. Objectives: build production-quality Portfolio experience answering: How am I doing? Why well/badly? What changed since yesterday? Which positions need attention? What actions deserve consideration? Requirements: follow Design Bible, reuse MetricArc where appropriate, preserve Confidence/Probability/Attention separation, use live services where available, honest empty states, Demo Mode only if a required service is unavailable. Run tests. Document limitations. Commit locally only if stable.

*(A follow-up clarifying question was asked and answered mid-phase: which literal screen was meant — the "Portfolio" paper-trading nav item, or the "Portfolio Workspace" intelligence screen. The user selected "Portfolio Workspace (Recommended).")*

---

## Phase: DESIGN-SYSTEM-001

> Extract the reusable design system from the implemented Mission Control and Portfolio screens. Do not redesign existing screens. Generalize what already works. Build reusable platform components (examples given: Hero Cards, MetricArc, Intelligence Cards, Risk Cards, Opportunity Cards, Empty States, Demo Mode Banner, Section Headers, Expandable Cards, Priority Indicators). Create `DESIGN_SYSTEM.md` documenting component purpose/props/states/variants/accessibility/motion/usage rules. Refactor only where duplication clearly exists. No visual redesign. Run tests. Commit locally only if stable.

---

## Phase: NEWS-INTELLIGENCE-001

> Build the News Intelligence screen. Do NOT build a news feed. Build an intelligence layer. The screen must answer: What happened? · Why does it matter? · Why should I care? · Which holdings are affected? · What changed compared to yesterday? Use the existing Design System. Reuse: HeroCard, IntelligenceCard, MetricArc, DemoModeBanner, EmptyState. Do not duplicate components. Use live services where available. If data is unavailable: Use honest empty states. Run all tests. Document limitations. Commit locally only if stable.

---

## Phase: PLATFORM-INTEGRATION-001

> Integrate Mission Control, Portfolio and News Intelligence into one continuous experience. Requirements: Shared selectedClaim; Shared selectedSymbol; Shared portfolioContext; Shared navigation context; Prevent duplicate API requests; Reuse cached data; Preserve Demo Mode behavior; Preserve Design System; No UI redesign; No new components. Deliverables: PLATFORM_INTEGRATION.md; Tests; Local commit only if stable.

---

## Phase: DEDUPLICATION-001

> Eliminate every duplication reported in PLATFORM_DUPLICATION_AUDIT.md. Fix ONLY: 1. statusTone(); 2. statusPlainLabel(); 3. Attention threshold logic; 4. "What Changed Since Yesterday" shared correlation logic. Requirements: Single implementation. Shared utility/module. No duplicated business logic. Preserve behavior. Update every consumer. Run all tests. Output: DEDUPLICATION_REPORT.md. Commit locally only.

---

## Phase: WATCHLIST-001

> Build the Watchlist Workspace. Do NOT build a simple watchlist. Build an intelligence workspace. Answer: Which symbols deserve attention today? Why? What changed? What is my next action? Which symbols became more important? Reuse ONLY existing Design System. Reuse existing services. Reuse PlatformContext. Reuse requestCache. No duplicated logic. No duplicated components. No new design language. Run all tests. Commit locally only if stable.

---

## Phase: AI-ANALYSIS-001

> Build the AI Analysis Workspace. This is NOT a chatbot. This is the platform's reasoning engine. Answer: What is happening? Why does the platform believe it? What evidence supports it? What evidence contradicts it? What could invalidate this thesis? What should the user monitor next? Reuse ONLY: HeroCard, IntelligenceCard, MetricArc, AttentionLevelBadge, DemoModeBanner, EmptyState, PlatformContext, requestCache, claimPresentation. No duplicated logic. No duplicated components. No new design language. Run all tests. Commit locally only if stable.

---

## Phase: PLATFORM-INTELLIGENCE-001

> Build the shared Intelligence Engine used by every Workspace. Extract and centralize all reasoning that is currently screen-specific. Move into shared modules: claim prioritization; ranking; recommendation generation; reasoning pipeline; contradiction detection; next-action generation; evidence weighting. Every Workspace must consume the shared engine. No duplicated business logic. No UI changes. No Design System changes. Run all tests. Output: PLATFORM_INTELLIGENCE.md. Commit locally only if stable.

---

## Phase: MARKET-INTELLIGENCE-001

> Build the Market Intelligence Workspace. This workspace explains the market itself, not the user's portfolio. Answer: What is happening across the market? Which sectors are leading? Which sectors are weakening? What macro events drive this? Where is attention flowing? What should investors monitor next? Reuse ONLY: intelligenceEngine; Design System; PlatformContext; requestCache; claimPresentation. No duplicated logic. No duplicated components. Run all tests. Commit locally only if stable.

*(This exact mission was sent twice in immediate succession, one turn apart — the second occurrence, addressed separately below, resulted in no further action since the phase was already complete.)*

## Phase: MARKET-INTELLIGENCE-001 (repeat, no-op)

> *(Identical mission text repeated.)* — Response: confirmed the phase was already complete (commit `9a4bd04` already at HEAD, working tree clean) and took no further action.

---

## Phase: RELEASE-BLOCKER-001

> Resolve every production blocker. Priority order: 1. Fix npm run build. 2. Pin all dependencies. 3. Add vite.config.js. 4. Remove lightningcss failure. 5. Verify production build succeeds. 6. Do not modify product behavior. Success criteria: npm run build passes; Zero build errors; Existing tests remain green. Output: RELEASE_BLOCKER_REPORT.md. Commit locally only if stable.

---

## Phase: PERSONAL-INTELLIGENCE-001

> Build the Personal Intelligence Workspace. Purpose: Transform ImpactOne from a market platform into a personalized investment intelligence platform. Capabilities: Build Investor Profile model; Preferred sectors; Watchlist priorities; Risk profile; Investment horizon; Personalized AI reasoning; "Why this matters to YOU"; Personalized opportunities; Personalized risks. Reuse ONLY: intelligenceEngine; Design System; PlatformContext; requestCache; claimPresentation. No duplicated logic. No duplicated components. Run all tests. Output: PERSONAL_INTELLIGENCE.md. Commit locally only if stable.

---

## Phase: PERSONALIZATION-PRIVACY-001

> Fix the critical user-scoping flaw in Investor Memory. Requirements: investorMemoryService must require betaUserId. Every underlying repository query must filter by betaUserId. No cross-user aggregation. Controllers must pass the authenticated/current user identity. Add multi-user isolation tests. Verify one user's behavior cannot affect another user's memory. Preserve existing single-user behavior. Do not expand features. Do not redesign UI. Also audit and fix the same scoping issue in: userMemoryRepository; autonomousRecommendationRepository; learningLoopService. Run full tests and production build. Output: PERSONALIZATION_PRIVACY_REPORT.md. Commit locally only if stable.

*(This mission's own execution was interrupted mid-task by an intervening user message asking to check on a specific background test-run task; that request was handled, then the phase's own remaining steps — report, commit — were completed in the following turn as originally scoped.)*

---

## Phase: AGENT-ORCHESTRATOR-001

> Build the Agent Orchestrator. The Orchestrator is the brain of ImpactOne. Every Stock Intelligence request (example: NVDA) must flow through this engine. Responsibilities: Execute agents in parallel; Agent scheduling; Timeouts; Health monitoring; Retry policy; Agent priority; Result aggregation; Confidence calculation; Conflict detection; Evidence merging; Final recommendation payload. Architecture: Stock Symbol → Agent Orchestrator → Parallel Agent Execution → Unified Intelligence Report. The Orchestrator MUST NOT know business logic. Every agent owns its own analysis. The Orchestrator only: starts agents; collects outputs; ranks confidence; merges evidence; returns one object. Create a generic Agent interface. Every future agent must implement only: metadata; execute(); confidence(); health(). No duplicated orchestration logic. Prepare registration for future agents: News; Options; Short Interest; Earnings; Valuation; Technical; Fibonacci; Sentiment; Insider; ETF Flow; Institutional; Macro; Analyst Consensus. Run all tests. Output: AGENT_ORCHESTRATOR.md. Commit locally only if stable.

*(This mission's own test-run was likewise interrupted by an intervening user message asking to check on the background test task specifically — handled, then the phase's remaining report/commit steps completed as originally scoped, identically to the pattern in `PERSONALIZATION-PRIVACY-001` above.)*

---

## Phase: CEO-AUDIT-EXPORT-001 (this phase)

> Export EVERYTHING required for a complete executive audit of the ImpactOne project. Do not summarize unless requested. Prefer completeness over brevity. Create a folder: CEO_AUDIT_EXPORT/. Inside it generate the following Markdown files: 01_PROJECT_TIMELINE.md (chronological timeline of the project, every sprint, with Sprint Number/Goal/Files changed/Commits/Decisions/Status/Dependencies/Outstanding work); 02_PROMPTS_CLAUDE.md (every prompt executed by Claude Code, wording preserved, grouped chronologically); 03_SUMMARIES_CLAUDE.md (for every completed mission: Mission/Work completed/Files changed/Tests/Build status/Remaining work/Commit hash); 04_ARCHITECTURE_DECISIONS.md (every architectural decision ever made, with Date/Sprint/Decision/Why/Impact); 05_FEATURE_MATRIX.md (every implemented feature, status Done/Partial/Planned/Deprecated); 06_TECHNICAL_DEBT.md (every known issue, ranked Critical/High/Medium/Low); 07_ROADMAP.md (current roadmap: Completed/Remaining/Future vision); 08_FILE_INDEX.md (index every important file, explain purpose); 09_COMMITS.md (chronological commit list, purpose of each commit); 10_EXECUTIVE_NOTES.md (anything important the CEO must know — do NOT omit anything because you think it is obvious). No code changes. No commits. Only documentation.

---

## A note on prompt fidelity

Every mission above (except `MISSION-CONTROL-001`, reconstructed from a compaction summary as noted) is reproduced from this session's actual message history, preserved as closely to verbatim as this document format allows (some phase missions used a header block — `PHASE:`/`TARGET: Claude Code` — around the mission text itself; that formatting wrapper is omitted here for readability, but no wording of the actual mission was altered, added, or removed).
