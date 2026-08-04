# Professional Notification Center — Phase X4

## Before this phase

Phase H3's `NotificationCenter.jsx` was a flat, ungrouped list of triggered price-alert notifications with mark-read and clear. Real data, but no timeline structure, no pinning, and no way to jump from a notification into the feature it's actually about.

## What's new

### Schema

- `Notification.isPinned` (`Boolean @default(false)`).

### Backend — `notificationService.js`

- `enrichWithWorkspace(notifications, betaUserId)` — looks up each notification's symbol against the beta user's real `WatchlistFolder` items. A tracked symbol gets a real `workspace: { id, name }`; an untracked one honestly gets `workspace: null` — never a guessed folder. Every notification also gets a `deepLink: { symbol, workspaceId }` object built from the same real lookup.
- `groupByDay` / `groupByWorkspace` / `groupBySymbol` — real, pure groupings over the enriched list. `groupByDay` buckets by the notification's real `triggeredAt` calendar date (UTC, `YYYY-MM-DD`, stable and sortable). `groupByWorkspace` uses `"Untracked"` as the honest bucket name for symbols with no workspace. Selected via `?groupBy=day|workspace|symbol`; omitted entirely (`grouped: null`) when no grouping is requested.
- `setPinned(betaUserId, notificationId, isPinned)` — `POST /api/v2/notifications/:id/pin` and `/unpin`. Pinned notifications always sort to the top of the list (and within each group), most-recent first among pinned/unpinned respectively.
- `listNotifications` response now also returns `pinnedCount`.

### Frontend — `NotificationCenter.jsx`

- A group-mode row (All / By day / By workspace / By symbol) drives `notificationsApi.list({ groupBy })`; grouped responses render a header per real group key (day dates formatted for readability, e.g. "Wed, Jul 23") with that group's notifications underneath.
- Pin/unpin button per notification, calling the real endpoint and re-sorting pinned items to the top client-side to match the server's own ordering without waiting for a full reload.
- Three real deep-links per notification, added via `utils/navigation.js` (a new module following the same `window.dispatchEvent(CustomEvent)` pattern `symbolPanel.js` already established):
  - **Chart** — reuses the existing `openSymbolPanel(symbol)` event; works from any screen already, no change needed.
  - **Workspace** — new `navigateToWorkspace(workspaceId)` dispatches `impactone:navigate-workspace`, caught in `MainLayout.jsx`, which switches to the "Watchlist Folders" screen and re-dispatches `impactone:open-workspace-detail` with the folder id; `WatchlistFoldersScreen.jsx` listens for that event and opens its existing `WorkspaceDetail` modal — the same modal a manual "Open workspace" click opens, so there is one workspace-detail UI, not two.
  - **Decision** — new `navigateToDecisionCenter()` dispatches `impactone:navigate-decision-center`, caught in `MainLayout.jsx`, which switches to the Decision Center screen.
  - An untracked notification (`deepLink.workspaceId === null`) honestly shows "Untracked — not in any workspace" instead of a broken or fabricated link.

## Testing

- `notificationCenterV1.integration.test.js` (7 tests, real HTTP via supertest): workspace enrichment + deep-link fields, untracked-symbol honesty, pin persistence and top-sort, all three grouping modes against real seeded notifications, cross-user pin isolation.
- `NotificationCenter.test.jsx` (rewritten, 9 tests): grouped rendering, pin toggle, and both new navigation events verified by asserting the real `CustomEvent` fires with the expected `detail`.
