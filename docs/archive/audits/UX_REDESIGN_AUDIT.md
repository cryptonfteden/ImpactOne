# UX Redesign Audit — Phase H3

Findings that grounded the futuristic redesign, drawn from direct inspection of `frontend/src` (extending Phase E1's earlier audit with what's changed since and what specifically blocks a "premium AI command center" feel).

## Visual Inconsistency

- The app already had a dark theme with partial glass effects (`--glass-border`, scattered `backdrop-filter: blur()` calls), but inconsistently applied — some cards used it, others (tables, sidebar, bottom nav) were flat. There was no single accent-glow language tying active/important states together.
- Status pills (`pill opportunity`/`risk`/`monitor`) existed but weren't visually distinct enough from the brand accent color — a REDUCE recommendation's risk pill and a routine "monitor" pill read too similarly at a glance.

## Excessive Density / Weak Hierarchy

- Headings (`<h1>`, `.eyebrow`) had no real weight/tracking separation from body copy — the whole page read at a fairly uniform visual weight, which works against "AI command center" clarity where the most important number should win the eye first.
- Numeric data (prices, P/L, quality scores) was not set in tabular figures — columns of numbers in tables and KPI grids didn't visually align, a small but real "not built by people who work with data all day" tell.

## Outdated Components

- `EmptyState`/`ErrorState` were plain, single-line text (before Phase E2's targeted fix to `RecommendationsScreen`'s specific empty state) — most other empty states across the app were still the bare version.
- Loading states (`Skeleton`) were flat gray blocks with no motion — functional, but the least "alive" part of an otherwise data-heavy product.

## Confusing Navigation

- The Sidebar (11+ items, later 12 with this phase's own new entry) is a flat, un-grouped list with no visual separation between core daily-use screens (Home, Recommendations, Portfolio) and secondary/rare ones (Themes, Intelligence Console). Every item has equal visual weight regardless of how often it's used.
- The existing bell icon (🔔) navigates to a pre-existing "Alerts" screen (market/feed-level alerts) — a naming collision risk once this phase adds real price alerts and a notification center; resolved by giving the new mechanism a distinct icon (📣) and its own "Watchlist Folders" nav destination rather than overloading the existing one.

## Poor Mobile Behavior

- 15 media queries existed pre-H3 (more than Phase E1's original finding of ~1, reflecting incremental fixes across E2/E3.5), but coverage was still uneven — no breakpoint governed the sidebar's behavior on narrow screens (it simply shrank rather than yielding to `BottomNav`, which already exists specifically for mobile).
- No mobile treatment existed for anything resembling a dropdown/panel pattern (needed for this phase's new Notification Center) — this phase adds the first real fixed-position mobile override for that shape.

## Screens That Don't Feel Premium

- `SettingsScreen` (already partially addressed in Phase E2) still reads as the least "product" screen in the app — plain text sections, no visual distinction from a docs page.
- The account menu's avatar was a static "G" for every session, regardless of who was using it — a small but real signal that the product doesn't know who's using it, undercutting the "command center, personalized to you" positioning this phase's Home redesign explicitly targets.

## Duplicate or Unnecessary Content

- `DashboardScreen`/`DashboardHome.jsx` remain in the codebase, unreachable from any nav (retired since Sprint 40) — confirmed still true; not deleted this phase (out of scope, a cleanup item, not a redesign blocker).
- Home's six adaptive cards themselves are not duplicative (Sprint 28 already resolved that) — the only real addition this phase makes is one new, non-overlapping card (Active Alerts), verified to not repeat information any existing card already shows.

## What This Audit Directly Fed Into

Every finding above maps to a specific change in `FUTURISTIC_DESIGN_SYSTEM.md` and this phase's component work — not a generic "make it look nicer" pass. See that document for the resulting token system and component treatments.
