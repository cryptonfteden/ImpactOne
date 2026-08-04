# Watchlist Folders & Price Alerts Spec — Phase H3

Implemented, tested, and verified live (not a proposal). Backend: `backend/services/watchlistFolderService.js`, `priceAlertService.js`, `notificationService.js`. Frontend: `frontend/src/screens/WatchlistFoldersScreen.jsx`, `frontend/src/components/NotificationCenter.jsx`.

## Data Model

- **`BetaUser`** (Phase H2, unchanged) — the identity every model below requires.
- **`WatchlistFolder`**: `id, betaUserId (required), name, createdAt, updatedAt`.
- **`WatchlistFolderItem`**: `id, folderId, symbol, addedAt` — unique on `(folderId, symbol)`, cascade-deleted with its folder.
- **`PriceAlert`**: `id, betaUserId (required), symbol, direction (ABOVE|BELOW), targetPrice, status (ACTIVE|TRIGGERED|INACTIVE), createdAt, triggeredAt, triggerPrice`.
- **`Notification`**: `id, betaUserId (required), priceAlertId, symbol, message, targetPrice, triggerPrice, triggeredAt, isRead, createdAt`.

Unlike Phase H2's Portfolio/InvestorProfile (nullable `betaUserId`, fallback to a legacy singleton), every model here **requires** `betaUserId` — there is no meaningful "global" folder or alert, and a request without a resolved beta user is rejected with `400`.

## API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v2/watchlist-folders` | GET | List the caller's own folders (with items) |
| `/api/v2/watchlist-folders` | POST | Create a folder (`{name}`) |
| `/api/v2/watchlist-folders/:id` | PATCH | Rename (`{name}`) |
| `/api/v2/watchlist-folders/:id` | DELETE | Delete |
| `/api/v2/watchlist-folders/:id/symbols` | POST | Add a symbol (`{symbol}`) |
| `/api/v2/watchlist-folders/:id/symbols/:symbol` | DELETE | Remove a symbol |
| `/api/v2/watchlist-folders/:id/move` | POST | Move a symbol to another folder (`{toFolderId, symbol}`) |
| `/api/v2/price-alerts` | GET | List the caller's alerts, enriched with a real live quote |
| `/api/v2/price-alerts` | POST | Create (`{symbol, direction, targetPrice}`) |
| `/api/v2/price-alerts/:id/deactivate` | PATCH | Deactivate (ACTIVE → INACTIVE) |
| `/api/v2/price-alerts/:id` | DELETE | Delete |
| `/api/v2/price-alerts/check` | POST | Manually run the real trigger check (same function the scheduler calls) |
| `/api/v2/notifications` | GET | List + real unread count |
| `/api/v2/notifications/:id/read` | PATCH | Mark read |
| `/api/v2/notifications/:id` | DELETE | Clear |

Every route is scoped by the `X-Beta-User-Id` header (Phase H2's middleware); every service function re-verifies ownership by querying `(id, betaUserId)` together — a folder/alert/notification belonging to a different user returns `404`, never a distinguishing `403` that would leak its existence.

## Price Source — Never Fabricated

`priceAlertService.js` uses the existing `finnhubService.getQuote()` — the exact same live-quote infrastructure the portfolio engine and outcome grading already use. No new price source was introduced. A quote fetch failure leaves `currentPrice`/`distanceFromTarget` honestly `null` on `listAlerts`, and simply skips that alert (retried next cycle) during `checkAndTriggerAlerts` — never a fabricated or stale-cached value.

## Trigger Mechanism

`priceAlertService.checkAndTriggerAlerts()`: iterates every `ACTIVE` alert across all users, fetches a real live quote per symbol, and triggers when `direction === ABOVE ? price > target : price < target`. Runs on two paths sharing one implementation:
1. **Scheduled** — `backend/services/alertScheduler.js`, a `node-cron` job every 5 minutes, matching the existing `providerScheduler.js` convention exactly.
2. **Manual** — `POST /api/v2/price-alerts/check`, used for on-demand/testing verification.

## One-Time Trigger Behavior

A `PriceAlert` only ever moves `ACTIVE → TRIGGERED`, once, via `priceAlertRepository.markTriggered()` — no code path in the repository can move a `TRIGGERED` alert back to `ACTIVE`. Verified live: re-running the trigger check against an already-triggered alert (with the live price still past target) returns an empty result — no duplicate trigger, no duplicate notification.

## Notification Content

Built entirely from real, already-verified fields at the moment of triggering (`notificationService.notifyAlertTriggered`) — symbol, direction, target, and the real trigger price — never fabricated or templated with placeholder data.

## Isolation — Verified Live (see `H3_COMPLETION_REPORT.md` for the full transcript)

- Two real `BetaUser`s each created their own folder; neither could see the other's.
- User B's attempts to rename, add to, or delete User A's folder all returned `404`.
- Both users created an identical `NVDA ABOVE $1` alert; both triggered independently off the same real live quote, each producing their own isolated notification.
- User B's attempt to mark User A's notification as read returned `404`.

## Explicitly Out of Scope This Phase

- Email or push notifications (mission's explicit exclusion) — in-app only.
- More than two alert directions (only `ABOVE`/`BELOW`, per the mission's "initial alert types").
- Any change to recommendation, committee, or learning logic — this feature is entirely additive infrastructure.
