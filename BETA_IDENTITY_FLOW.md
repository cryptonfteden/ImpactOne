# Beta Identity Flow — Phase X4

## Problem

Before this phase, reaching any protected feature required a beta user to manually type an invite code into `BetaInviteGate`, and there was no way to confirm a stored identity was still valid, no expiry mechanism, and no logout. A dead link, a cleared invite, or an expired code all produced the same generic "beta user identity is required" 400 from the backend — a raw technical message the frontend never translated.

## What changed

### Backend

- `BetaUser.expiresAt` (nullable `DateTime`) added to the schema. `null` honestly means "no expiry set" — never treated as expired by assumption.
- `betaUserService.js` (new): `resolveInviteCode(code)` and `whoami(betaUserId)`, both real, both distinguishing failure modes via `error.errorCode`:
  - `MISSING_CODE` (400) — no code submitted
  - `INVALID_CODE` (404) — code doesn't resolve to a real `BetaUser`
  - `EXPIRED_CODE` (410 Gone) — code resolves, but `expiresAt` is in the past
  - `NO_IDENTITY` (404, from `whoami`) — the id in the request header doesn't resolve
- `GET /api/v2/beta/whoami` (new) — reads `req.betaUserId` (set by the existing `betaUserContext` middleware from the `X-Beta-User-Id` header) and returns `{ betaUserId, label }` if the identity is real and non-expired, or 404/`NO_IDENTITY` otherwise. Lets the frontend confirm a locally stored identity is still good without waiting for a protected feature to fail first.

### Frontend

- `useBetaIdentity.js` (new hook) — the single source of truth for identity state, replacing the ad hoc storage read/write that used to live inside `BetaInviteGate`. States: `CHECKING`, `NEEDS_CODE`, `RECOVERING`, `READY`, `EXPIRED`, `INVALID`.
  - **Automatic invite resolution**: on mount, checks `window.location.search` for `?invite=CODE`. If present, resolves it with zero manual steps and strips the query param from the URL via `history.replaceState` so refreshing doesn't re-resolve.
  - **Session restoration**: if no URL code but a `betaUserId` is already in `localStorage`, calls `whoami()` to confirm it's still real. A network failure during this check does **not** invalidate the stored identity — that would be a fabricated diagnosis; only a real, resolved "this id doesn't exist" response clears it.
  - **Friendly errors only**: every `errorCode` maps to a plain-English `FRIENDLY_MESSAGE` — no raw error, no `errorCode` string, ever reaches JSX. This satisfies the mission's explicit "the user must never see a technical identity error."
  - **Recovery flow**: `EXPIRED`/`INVALID` render the same `BetaInviteGate` shell with a distinct title/description ("Your invite has expired" / "We couldn't find your session") and the existing skip/retry mechanics — the user can always continue without a code.
  - **Logout**: `logout()` clears the stored identity and returns to `NEEDS_CODE`. Exposed in Settings (`SettingsScreen.jsx`) under a new "Beta identity" card, which clears storage and reloads so the hook re-initializes cleanly rather than trying to reconcile in-place state across the whole app tree.
- `AppRoot.jsx` now runs `useBetaIdentity()` before the existing `hasProfile`/`onboardingInProgress` branching, so `CHECKING`/`RECOVERING` show the same branded loading state as profile loading, and `EXPIRED`/`INVALID` short-circuit straight to the recovery gate — no protected screen (`MainLayout`, Decision Center, Notifications, Workspaces) ever mounts with a broken identity.
- `apiClient.js` now attaches `errorCode` from the server's JSON body onto every thrown `Error`, so callers (like the hook) can branch on the exact failure without parsing the message string.
- `BetaInviteGate.jsx` is now a thin, presentational shell — `resolveCode`/`message`/`title`/`description` are all props, driven by the hook. This is the same component used for first-time onboarding and for expired/invalid recovery, so there is exactly one invite-resolution UI, not two.

## What is explicitly not built

- No password/session/JWT system — this remains a bare invite-code-to-id mapping, matching Phase H2's original scope. `whoami` confirms an id is real; it is not authentication.
- No email delivery of invite codes or expiry notices — out of scope, 2-user beta.

## Testing

- `useBetaIdentity.test.js` (new, 7 tests): URL auto-resolution + param stripping, expired-URL-code friendly state, session restoration via `whoami`, stale/deleted stored identity clearing storage, network-failure-during-restore trusting the stored identity, logout.
- `BetaInviteGate.test.jsx` (rewritten, 4 tests): now exercises the prop-driven shell against a mocked `resolveCode`.
- `betaIdentity.integration.test.js` (10 tests, real HTTP via supertest): full resolve/whoami flow against a real Postgres-backed `BetaUser` row, including the expired-code 410 path.
