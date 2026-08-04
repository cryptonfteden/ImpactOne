# Product Consolidation Plan — Phase X5, Part 1

## The fragmentation, specifically

Before this phase, `Sidebar.jsx` was a flat list of 14 destinations with no grouping, no visual hierarchy, and two genuinely competing paths to the same job: "Watchlist" (a simple, client-side, localStorage-driven list) and "Watchlist Folders" (the real, backend-persisted, notes/alerts/impact-graph-equipped Workspace 2.0 from Phase X3). A first-time user landing on Home had no visible connection to Decision Center or Portfolio — three screens that, per this phase's mission, are supposed to "feel connected," reachable only by independently discovering each one in the flat sidebar list.

## What changed

### Single entry point

`Home` was already the default landing screen (`AppRoot.jsx`/`MainLayout.jsx`, unchanged this phase) — it already functions as "Today." What it lacked was an obvious next step. `HomeScreen.jsx`'s hero now includes two buttons — "Review today's decisions" and "Open portfolio" — the two screens Today's content is actually about, so the connection is a real click, not an implied one.

### Reduced sidebar complexity, grouped logically

`Sidebar.jsx` now renders three tiers instead of one flat list:
- **Primary** (always visible): Today, Decision Center, Portfolio, Workspaces.
- **Advanced** (collapsed by default, one click to expand — "More tools ▾"): Market Positioning, Global Intelligence, AI Analysis, Recommendations, Daily Feed, Themes, Alerts. Auto-expands if the user is already on one of these (e.g. via a deep link), so the sidebar never hides where you currently are.
- **Account** (visually separated at the bottom): My Profile, Settings.

No screen was deleted, no routing key changed — `MainLayout.jsx`'s `screenMap` and `BottomNav.jsx`'s five mobile destinations are untouched. This is purely a sidebar information-architecture change, consistent with the mission's explicit "do not redesign the approved Product Experience Blueprint."

### Removed duplicate navigation path

"Watchlist" (the legacy flat list) was removed from the sidebar's top-level nav entirely — "Workspaces" (Watchlist Folders, renamed for clarity in display label only; the internal routing key `"Watchlist Folders"` is unchanged) is the one real path to organizing tracked symbols. This matches the exact precedent Sprint 40 set removing the duplicate Dashboard/Home pair: `WatchlistScreen.jsx` and its own tests are untouched and still pass — the screen simply isn't linked from primary navigation anymore. The sidebar's separate favorites quick-list (a different, complementary surface — one-click access to a few starred tickers) is unaffected.

### No dead ends

Every screen already reachable before this phase remains reachable — either from Primary, from "More tools," or from Account. Nothing was deleted. The one new connector (Home → Decision Center/Portfolio) adds a path; none was removed except the confirmed duplicate above.

## What was deliberately not done

A full route/URL-based navigation rebuild, breadcrumbs, or a redesigned visual layout for `MainLayout.jsx` itself — all would exceed "do not redesign the approved Product Experience Blueprint." This plan is an information-architecture consolidation within the existing shell, not a new shell.

## Testing

No dedicated `Sidebar.test.jsx` existed before or after this change (confirmed by search). `HomeScreen.test.jsx` (14 tests) and the full frontend suite (260 tests, 39 files) pass unchanged, confirming the new hero buttons and sidebar restructuring introduced no regression.
