# Beta UX Audit — Phase E1

Ranked findings from `FIRST_TIME_USER_FLOW.md`, evaluated against Clarity, Speed, Trust, Visual Hierarchy, Empty States, Error Handling, Loading States, Mobile Readiness, Accessibility, Onboarding, First Impression, Feature Discoverability, and Navigation Consistency. No code was modified to produce this audit.

## Critical

### 1. No charts anywhere in the product
- **Dimension:** Trust, First Impression, Clarity
- **User impact:** A financial product with zero data visualization is a severe credibility gap for any investor-facing beta user — portfolio value, price history, and performance are all shown as numbers/pills, never a graph. This is likely the single biggest thing 5 real beta testers will comment on unprompted.
- **Suggested improvement:** At minimum, a portfolio-value-over-time line and a price sparkline per position/recommendation before beta launch.
- **Estimated effort:** High (new dependency, new components, real data wiring across Portfolio/Home/AI Analysis).

### 2. Default Portfolio screen has unverified loading/error handling
- **Dimension:** Error Handling, Loading States, Trust
- **User impact:** `PortfolioScreen.jsx` — the screen every beta user sees by default (the flagged `PortfolioEngineScreen.jsx` is opt-in only) — does not clearly reuse the shared `Skeleton`/`ErrorState` components other screens use. A failed fetch or slow network could show a blank or broken screen to a beta user's very first Portfolio visit, with no path to understand what happened.
- **Suggested improvement:** Either flip the default to the better-instrumented `PortfolioEngineScreen.jsx` for the beta cohort, or audit/patch the legacy screen's error/loading paths specifically.
- **Estimated effort:** Low if simply defaulting the flag on for beta; Medium if patching the legacy screen directly.

## High

### 3. No onboarding guidance for a zero-data first session
- **Dimension:** Onboarding, First Impression, Empty States
- **User impact:** After the (skip-less) onboarding form, the Home screen and Recommendations screen both render essentially empty for a brand-new user, with no "here's what to do first" framing. Combined with D1.6–D1.8's finding that the recommendation engine may take an unpredictable amount of time to produce anything organically, a beta user's first session could be a wall of empty cards with no explanation.
- **Suggested improvement:** A one-time first-session banner or checklist ("Add a position or wait for your first recommendation — here's roughly when to expect one").
- **Estimated effort:** Medium.

### 4. Recommendations empty state is honest but not actionable
- **Dimension:** Empty States, Clarity, Feature Discoverability
- **User impact:** *"No active recommendations. Run the engine or wait for the next scheduled pass"* tells a user what's true but gives them no button and no sense of timing — "wait for the next scheduled pass" with no ETA reads as a dead end to a non-technical beta tester.
- **Suggested improvement:** Show next-scheduled-run time if available, or at minimum reframe the copy to set concrete expectations (e.g., "recommendations run every 15–30 minutes").
- **Estimated effort:** Low (copy + surfacing existing scheduler status) to Medium (if a "next run at" timestamp needs new plumbing).

### 5. Settings page shows controls that don't work
- **Dimension:** Trust, Clarity
- **User impact:** "Appearance" and "Notifications" are static text formatted to look like settings ("Breakout alerts: Enabled") with nothing behind them. A user who tries to change what they see written on the page will conclude the product is broken or unfinished — a serious trust hit for a first beta impression.
- **Suggested improvement:** Either wire minimal real toggles before beta, or relabel these sections clearly as "Coming soon" / informational-only so they don't read as broken controls.
- **Estimated effort:** Low (relabeling) to Medium (real toggles).

### 6. No login/account concept at all
- **Dimension:** Trust, Onboarding
- **User impact:** For 5 named beta users this may be an acceptable simplification, but there's no way to distinguish users, no session, and reportedly a hidden dev-console-only reset path — meaning a user has no self-service way to start over if their local state gets confusing.
- **Suggested improvement:** Not necessarily full auth for a 5-person beta, but at minimum a visible, non-dev-gated "reset my data" affordance in Settings.
- **Estimated effort:** Low (surface the existing reset function in Settings UI).

## Medium

### 7. Thin mobile/responsive coverage
- **Dimension:** Mobile Readiness
- **User impact:** Only one `@media` rule found repo-wide, despite a `BottomNav.jsx` component clearly intended for mobile use. Beta users testing on a phone may encounter desktop-oriented layouts (especially the text-heavy AI Analysis and Recommendation cards) that don't adapt well.
- **Suggested improvement:** A pass focused specifically on the highest-traffic screens (Home, Recommendations, Portfolio) at common phone widths.
- **Estimated effort:** Medium.

### 8. Accessibility coverage is minimal
- **Dimension:** Accessibility
- **User impact:** `aria-` attributes appear in only 15 files and `alt=` in just 1, across the whole frontend. Not disqualifying for a small closed beta, but worth flagging before any wider rollout — screen-reader users would have a materially degraded experience today.
- **Suggested improvement:** Baseline pass on the primary journey screens (landmark roles, form labels, image alt text) ahead of any public launch, not necessarily before this 5-person beta.
- **Estimated effort:** Medium.

### 9. No toast/transient notification system
- **Dimension:** Error Handling, Clarity
- **User impact:** All errors surface as permanent inline text rather than dismissible toasts. Functional, but every error becomes a piece of persistent page furniture rather than a moment that resolves — this can make the app feel more broken/cluttered than it is after a transient failure (e.g., one failed provider call) has actually resolved.
- **Suggested improvement:** A lightweight toast component for transient/recoverable errors, reserving inline `ErrorState` for persistent/blocking ones.
- **Estimated effort:** Medium.

### 10. "Dashboard" vs "Home" naming leftover
- **Dimension:** Navigation Consistency
- **User impact:** `DashboardScreen.jsx`/`DashboardHome.jsx` still exist in the codebase but are unreachable from nav (removed in Sprint 40 as duplicative of Home) — low direct user impact since it's unreachable, but signals unfinished cleanup that could resurface confusion if it's ever re-added inconsistently.
- **Suggested improvement:** Remove the dead files, or explicitly document why they're kept, in a future cleanup sprint (not urgent for beta).
- **Estimated effort:** Low.

## Low

### 11. Blank loading state before onboarding/profile check resolves
- **Dimension:** First Impression, Loading States
- **User impact:** `AppRoot.jsx` shows an unstyled `aria-busy` blank div while `useInvestorProfile()` loads — no branding, no spinner. Brief in practice, but it's the literal first pixel every user ever sees.
- **Suggested improvement:** A minimal branded loading state (logo + spinner) for this specific moment.
- **Estimated effort:** Low.

### 12. Feature-flagged screens invisible to beta testers by default
- **Dimension:** Feature Discoverability
- **User impact:** The better-instrumented Portfolio experience and the Intelligence Console both sit behind env flags a beta user would never see or know exist. Not a bug, but worth an explicit decision on which flags the beta cohort should actually run with.
- **Suggested improvement:** Decide and document the beta-specific `.env` flag set (this audit recommends `VITE_PORTFOLIO_ENGINE=api` on, per Critical #2).
- **Estimated effort:** Low (configuration decision only).
