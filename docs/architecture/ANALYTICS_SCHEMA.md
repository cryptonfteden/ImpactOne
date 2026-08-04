# Analytics Schema — Phase X9, Part 1

## Storage

One table, `AnalyticsEvent` (Sprint 35, extended this phase) — every event, of every kind, one row each. No second pipeline was built for the new required catalog; it shares the exact same allowlist-and-persist path (`analyticsService.js` → `analyticsEventRepository.js`) every pre-existing event already used.

| Column | Maps to the mission's required field | Notes |
|---|---|---|
| `createdAt` | timestamp | Real, server-set, never client-supplied |
| `betaUserId` | userId | Nullable — real when a beta identity is resolved, honestly null otherwise (never fabricated) |
| `sessionId` | sessionId | A random, client-generated UUID (Sprint 36), persisted in localStorage per browser — anonymous, not a device fingerprint |
| `screen` | screen | New this phase — first-class column, not buried in `properties` JSON, validated against a real closed set (`KNOWN_SCREENS`) |
| `eventName` | event | Validated against a real, fixed allowlist — an unrecognized event is rejected, not silently accepted |
| `durationMs` | duration (when applicable) | New this phase — nullable, real, never a fabricated 0 when not applicable |
| `properties` | (extra context) | A small, explicit allowlisted set of extra keys (symbol, action, feedbackType, settingKey, workspaceId, notificationId, errorScope) |

## The event catalog

Every event the mission requires, and where it actually fires:

| Event | Fires from |
|---|---|
| `app_opened` | `main.jsx`, on every real page load |
| `login` | `useBetaIdentity.js` — both a fresh invite-code resolution and a returning `whoami`-confirmed session |
| `logout` | `useBetaIdentity.js`'s `logout()` and `SettingsScreen.jsx`'s logout button |
| `invite_accepted` | `useBetaIdentity.js`, on a successful invite-code resolution |
| `screen_viewed` | `MainLayout.jsx`'s `setActiveView` — the one real navigation choke point every nav path (Sidebar, BottomNav, deep-links, quick search) already flows through |
| `recommendation_opened` / `recommendation_viewed` | Pre-existing (Sprint 35) + this phase's addition to the allowlist for the mission's exact naming |
| `decision_center_viewed`, `portfolio_viewed`, `market_dashboard_viewed`, `ai_analysis_opened` | Fire alongside `screen_viewed` from the same `MainLayout.jsx` choke point, via a small screen→event lookup table |
| `impact_graph_viewed` | `ImpactGraph.jsx`'s own load effect — fires wherever the component actually renders real data, regardless of host screen (Side Panel, Workspace tab, Portfolio) |
| `notification_clicked` | `NotificationCenter.jsx`'s symbol click handler |
| `workspace_created` / `workspace_deleted` | `WatchlistFoldersScreen.jsx`'s real create/delete actions |
| `settings_changed` | `SettingsScreen.jsx`'s language selector |
| `error_encountered` | `errorHandling.js`'s `logError()` — the single choke point nearly every screen in this app already routes caught errors through (see `OBSERVABILITY_SPEC.md` from Phase X6 for the precedent) |
| `session_ended` | `main.jsx`'s `visibilitychange` listener, with a real elapsed duration — chosen over `beforeunload`, which mobile browsers frequently skip entirely |

## What was deliberately not duplicated

Phase X9 extends the existing allowlist and repository rather than building a second analytics system alongside the Sprint 35/36/40 Time-To-Value infrastructure. `ttvMetricsService.js` (Phase 36) is reused directly by `betaMetricsService.js` (Part 7) for Time-to-First-Value — not reimplemented.

## Privacy, unchanged

No investor-profile field (age, country, income, risk tolerance) is ever sent — this constraint predates this phase and was re-verified: the frontend's `ALLOWED_EVENTS`/property shape and the backend's independent re-validation both still enforce it structurally, not by convention.

## Testing

13 tests in `analyticsService.test.js` (4 new this phase: full required-catalog coverage, real/unknown screen handling, real/absent duration handling) plus the pre-existing 9, all passing.
