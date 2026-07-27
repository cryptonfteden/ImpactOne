# Watchlist Gaps

Every finding below was verified directly against the current source of `WatchlistScreen.jsx`, `WatchlistFoldersScreen.jsx`, and `Sidebar.jsx`. Ranked CRITICAL / HIGH / MEDIUM / LOW.

---

## CRITICAL

### C1. No "Watchlist Workspace" exists on the current platform architecture
Confirmed: no file imports `components/nova` (the Design System), `PlatformContext`, or `requestCache` anywhere in the watchlist-related screens. The screen users actually reach today (`WatchlistFoldersScreen.jsx`) predates all three of these systems entirely. Every other "Workspace" screen in this app (Mission Control, Portfolio Workspace, News Intelligence) has been rebuilt on this shared foundation; the Watchlist has not. This is the root cause of nearly every other finding below.

### C2. The reachable watchlist screen shows zero intelligence signal per symbol
`WatchlistFoldersScreen.jsx` lists a symbol with only its ticker and action buttons — no Confidence, no Attention Score, no claim status, nothing. A user cannot tell, from the one screen whose entire purpose is "things I'm watching," which of those things currently deserves their attention. This is a direct, measurable regression relative to the platform's own established Attention Engine integration everywhere else.

---

## HIGH

### H1. The nav-linked "Workspaces" label doesn't say what it is, and collides with two sibling labels
`Sidebar.jsx`: `{ key: "Watchlist Folders", label: "Workspaces" }`, sitting in the same menu as "Portfolio Workspace" and "Intelligence Workspace." A user has no way to infer this destination is about watchlist folders and price alerts from its label alone, and the generic plural "Workspaces" directly conflicts with the naming pattern its neighbors already establish.

### H2. The legacy, unreachable `WatchlistScreen.jsx` has more real intelligence integration than the screen that replaced it in navigation
`WatchlistScreen.jsx` ranks by real Attention Score and shows a real per-symbol "why today" reason; `WatchlistFoldersScreen.jsx` (the one users can actually reach) has neither. Whatever the reason folders/alerts were prioritized over the ranked list, the net effect today is a loss of the platform's core "why does this deserve my attention" signal from the one screen dedicated to a user's chosen symbols.

### H3. Native `window.prompt()`/`window.confirm()` used for two destructive/editing actions, inconsistent with the file's own custom Modal used one flow over
`WatchlistFoldersScreen.jsx`'s `renameFolder()` and `deleteFolder()` use unstyled OS dialogs; `openAlertModal()`'s flow uses a real, in-app `Modal` component defined in the same file. No technical reason prevents the same `Modal` from covering rename/delete — this is an internal inconsistency, not a missing capability.

---

## MEDIUM

### M1. No tiered information hierarchy
The screen is a flat sequence of equally-weighted sections and equally-weighted folder cards, with no "most important thing first" structure — no hero, no ranking by anything real. Every other Workspace screen in this app now has this structure; Watchlist does not.

### M2. Empty-state icon inconsistency
`WatchlistFoldersScreen.jsx`'s empty state uses `◎`; every NOVA `EmptyState` elsewhere in the app (Mission Control, Portfolio Workspace, News Intelligence) uses `◇`. A small, directly visible inconsistency for a user moving between screens.

### M3. Duplicated attention-ranking and claim-status-to-reason logic in the legacy screen
`WatchlistScreen.jsx` independently reimplements the same "max real Attention Score across a symbol's claims" pattern already centralized in Portfolio Workspace's `positionAttention`, and independently maps claim status to short reason strings adjacent to (but not sharing) `claimPresentation.js`'s `statusPlainLabel()`. Lower priority than the platform's already-resolved duplications since this screen is marked legacy and unreachable, but present in the current source.

### M4. No `requestCache` usage
`watchlistFoldersApi.list()` / `priceAlertsApi.list()` are called unwrapped on every refresh. No evidence of a resulting concurrency bug, but it's a real, verifiable gap relative to the rest of the app's now-standard pattern.

---

## LOW

### L1. Internal naming inconsistency between UI copy and analytics events
The UI calls this screen "Watchlist Folders"; its own analytics calls are named `trackEvent("workspace_created")` / `trackEvent("workspace_deleted")` — reinforcing the same "Workspace" vs "Watchlist Folders" naming drift found in H1, this time inside the code itself rather than just the nav label.
