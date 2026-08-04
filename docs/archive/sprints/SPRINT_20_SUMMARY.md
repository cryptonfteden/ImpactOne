# Sprint 20 Summary — My First Daily Experience

**Branch:** `sprint-16-live-data` (not pushed) · **Commit range:** `d7568ae..4e8aa3d` (12 commits) · **Date:** 2026-07-13

## Executive Summary

Sprint 20's mission was daily usefulness, not more features: build the first version of ImpactOne worth opening every morning. It shipped a full onboarding-to-daily-habit loop — a <60-second investor-profile intake, a deterministic AI Investment Profile reveal, a four-question Home screen, a real (no longer mocked) personalized Daily Feed, and an expandable seven-theme intelligence dashboard. All 12 planned commits landed, both automated test suites are 100% green (180 backend / 84 frontend tests), and live browser verification confirms every new screen renders correctly on desktop and mobile with no regressions to existing screens. No trading, broker, or execution affordance was introduced anywhere — the platform remains strictly advisory.

## Objectives (from the sprint brief)

1. Onboarding in under 60 seconds, collecting only what's needed.
2. An immediate AI-generated investment profile with clearly-labeled illustrations, not promises.
3. A Home screen that answers exactly four questions and nothing else.
4. A Daily Feed with full per-item context (headline, summary, importance, confidence, sectors, companies, horizon, portfolio impact, sources, reasoning trace).
5. Feed ranking personalized by age, portfolio, interests, horizon, and risk profile.
6. An expandable Theme Dashboard for seven themes with maturity, thesis, evidence, counterarguments, companies/ETFs, and confidence trend.
7. Mobile-first, fast, simple, beautiful, advisory-only.

All seven objectives were implemented and are addressed below.

## What Was Completed

- **Investor Profile & Onboarding** — a new `InvestorProfile` singleton (age required; country, experience level, monthly amount, goal, risk tolerance, horizon all fast-skippable) collected via a full-screen, chip-based, auto-advancing onboarding flow gated in front of the entire app shell.
- **AI Investment Profile** — deterministic (non-LLM) generation of a suggested stock/bond/cash allocation, a plain-language diversification explanation, an expected volatility range, a client-side compound-interest simulator with an adjustable return-rate slider and an SVG future-value timeline, and an experience/goal-adapted educational explanation. Every return-dependent number carries an "Illustration only — not a promise" disclosure.
- **Home Screen** — replaced Dashboard as the default landing view; renders exactly four cards (What happened / Why should I care / How does it affect me / Should I do anything today), the last of which is sourced exclusively from the existing canonical verdict engine (`canonicalVerdict.buildCanonicalVerdictView`), never a second independent computation.
- **Daily Feed** — `MarketNewsScreen` (renamed "Daily Feed" in navigation) now calls the real live-feed API instead of rendering hardcoded mock content; each item shows headline, AI summary, importance, confidence, affected sectors/companies, time horizon, potential portfolio impact, sources, and an honestly-labeled "Why this analysis" reasoning trace (the event's own `explainability` block — not a fabricated formal DecisionTrace).
- **Personalized Ranking** — a new re-ranking layer weights feed items by risk tolerance, investment horizon, age, and goal, layered on top of the existing relevance/recency/source-quality scoring. It only ever reorders; it never mutates `impactType`, `riskLevel`, or any other fact, and it deliberately adds no boost where no honest signal exists (e.g., no fabricated "passive income" tagging).
- **Theme Dashboard** — seven expandable theme tiles (AI, Quantum, Defense, Energy, Space, Cybersecurity, Healthcare), each showing a deterministically-tiered maturity label, a templated thesis grounded in real matching events, real supporting evidence and counterarguments, a curated companies/ETFs list, and a confidence-trend sparkline backed by a new daily snapshot job.

## What Changed

- Default landing screen: Dashboard → Home (Dashboard remains reachable, unchanged).
- `MarketNewsScreen` (Daily Feed): mock data → real API-backed data.
- App entry point: `main.jsx` now renders `AppRoot` (an onboarding gate) instead of `MainLayout` directly.
- Navigation (`Sidebar.jsx`): added Home (first), Daily Feed (renamed from Market News), Themes, My Profile.

## New Capabilities

- Investor profile CRUD (`/api/v2/investor-profile`, `/api/v2/investor-profile/investment-profile`).
- Home summary aggregation (`/api/v2/home-summary`).
- Theme intelligence (`/api/v2/themes`, `/api/v2/themes/:themeKey`).
- Daily theme-confidence snapshot job (`themeSnapshotScheduler`, `node-cron`, `5 0 * * *`, bootstrapped from `server.js`).

## UI Improvements

- New onboarding flow (`frontend/src/screens/onboarding/OnboardingFlow.jsx`) with auto-advancing chip steps and a smooth reveal transition into the AI Investment Profile.
- New `InvestorProfileScreen` (dual-mode: onboarding reveal and persistent "My Profile").
- New `CompoundInterestSimulator` + hand-rolled SVG `FutureTimelineChart` (same charting convention as the existing `PriceChart`).
- New minimal `HomeScreen` (exactly four `.home-card` sections, enforced by a render test).
- New `FeedItemCard` component for the Daily Feed.
- New `ThemeDashboardScreen` with in-place accordion expansion (no extra navigation round-trip) and an SVG confidence-trend sparkline.
- All new screens built mobile-first against the existing design token system (`--bg-*`, `--glass`, `--accent`, etc.) — no new design language introduced.

## Backend Improvements

- `investorProfileService.js` — deterministic allocation/volatility/educational-content generation with documented formula constants.
- `homeSummaryService.js` — a new, narrowly-scoped aggregation service that deliberately reuses the canonical verdict source rather than introducing a second one.
- `feedPersonalizationService.js` — a personalization layer that changes ordering only, never underlying facts.
- `themeIntelligenceService.js` — reuses the existing `classifyEventType` classifier for real, non-fabricated theme evidence.
- Added `quantum` as an eighth `CORE_EVENT_TYPES`/scan-universe bucket in `autonomousMarketService.js` (small, additive).

## Architecture Improvements

- Established a clean "gate before shell" pattern (`AppRoot.jsx`) for first-run experiences, without touching the existing router-less `screenMap` navigation convention.
- Reused, rather than duplicated, three existing architectural patterns: the `Portfolio` singleton-repository pattern (for `InvestorProfile`), the "best-effort snapshot capture" pattern from `dailyBriefArchiveService.js` (for theme snapshots), and the single-instance `node-cron` scheduler pattern (for the theme snapshot job).

## Database / Schema Changes

- New model `InvestorProfile` (migration `20260712183917_add_investor_profile`) + 4 new enums (`InvestorExperienceLevel`, `InvestmentGoal`, `RiskTolerance`, `InvestmentHorizonBucket`).
- New model `ThemeConfidenceSnapshot` (migration `20260713155906_add_theme_confidence_snapshot`, unique on `[themeKey, date]`).
- `backend/test/dbHelpers.js`'s `truncateAll()` updated for both new models.
- Verified this sprint: schema matches migration SQL field-for-field, `prisma generate` is clean, `prisma migrate status` reports no pending migrations.

## Documentation Changes

- `PROJECT_STATUS.md` — new §26 (Sprint 20 outcomes).
- `API_CONTRACTS.md` — new §3.46–3.50 (Investor Profile, AI Investment Profile, Home Summary, live-feed personalization addendum, Themes).
- `ARCHITECTURE.md` — updated §2.3 (screen model) and new §6.6 (Personalization).
- **Not updated this sprint** (see Part 2 of the closeout audit): `API_CONTRACTS.md`'s §2 endpoint index, `ARCHITECTURE.md`'s §2.8 dependency diagram and §2.4 feature list and §10 background-jobs section, and `INTELLIGENCE_PLATFORM_BLUEPRINT.md` were left untouched despite Sprint 20 content being relevant to them.

## Tests Added

- **Backend (11 new files):** `investorProfileRepository.test.js`, `investorProfileService.test.js`, `routes/investorProfile.integration.test.js`, `homeSummaryService.test.js`, `routes/homeSummary.integration.test.js`, `feedPersonalizationService.test.js`, `routes/liveFeed.integration.test.js`, `themeSnapshotRepository.test.js`, `themeIntelligenceService.test.js`, `themeSnapshotScheduler.test.js`, `routes/theme.integration.test.js`.
- **Frontend (9 new files):** `useInvestorProfile.test.js`, `OnboardingFlow.test.jsx`, `AppRoot.test.jsx`, `InvestorProfileScreen.test.jsx`, `compoundInterest.test.js`, `HomeScreen.test.jsx`, `FeedItemCard.test.jsx`, `MarketNewsScreen.test.jsx`, `ThemeDashboardScreen.test.jsx`.
- **Full-suite results at closeout (re-run today, not carried over from development):** backend `180/180` passing across 28 files; frontend `84/84` passing across 21 files. Zero failures, zero skips.

## Browser Verification Results

Verified live against running dev servers (backend :5000, frontend :5174) with Playwright, desktop (1280×900) and mobile (390×844) viewports, using a pre-existing returning-user profile (age 17, IL, Beginner, ₪500/mo, Wealth, Medium risk, Long-term):

| Check | Result |
|---|---|
| Returning user lands directly on Home (no onboarding replay) | Pass |
| Home renders exactly 4 `.home-card` sections, all 4 questions present | Pass (confirmed with explicit selector wait; an initial fixed-timeout run under concurrent load produced a false negative — see Part 4) |
| Dashboard still reachable and renders | Pass |
| Portfolio, Recommendations, AI Analysis, Global Intelligence still render | Pass |
| Daily Feed shows real (non-mock) content, no "Mock market briefing" text | Pass |
| Theme Dashboard shows all 7 themes, 7 expandable tiles, expansion shows Maturity, no buy/execute affordance | Pass |
| My Profile shows persistent title and the illustration-only disclaimer | Pass |
| Alerts, Settings render without crashing | Pass |
| Mobile: Home shows 4 cards, no horizontal page overflow | Pass |
| Mobile console errors | None |
| Desktop console errors | 2 pre-existing React duplicate-key warnings and one pre-existing 502 on an unrelated `/api/compare` call — all traced to files **not modified by Sprint 20** (see Part 4/5 of the closeout audit) |

## Remaining Known Limitations

- Investor Profile API validates `age` but not the other enum/numeric fields server-side (low exposure today — the only client is the fixed-chip onboarding UI — but a real gap before any second client is built).
- Theme thesis and educational-explanation text are deterministic/templated by design, not LLM-generated, for this sprint.
- Confidence-trend history starts from today; it does not (and should not) simulate a backfilled past.
- Documentation completeness gaps listed above under Documentation Changes.
- Two pre-existing, out-of-Sprint-20-scope issues surfaced during regression testing (a duplicate-React-key warning in `GlobalIntelligenceScreen.jsx` and a 502 from the pre-existing `/api/compare` endpoint without live API keys) — see the closeout audit for detail.

Full findings, severity ratings, and the production-readiness determination are in the accompanying closeout audit delivered in-conversation, and forward-looking release framing is in `SPRINT_20_RELEASE_NOTES.md`.
