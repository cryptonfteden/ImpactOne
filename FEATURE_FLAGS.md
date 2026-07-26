# Feature Flags — Phase X9, Part 4

## What it is

`FeatureFlag` — a real, server-side table (`key`, `mode`, `enabledForUsers`, `description`). Every evaluation reads this table fresh (`featureFlagService.isFeatureEnabled(key, betaUserId)`) — nothing is cached at process start or baked into a build, so "no code changes required for toggling" is literally true: an operator changes a flag's real database row, and the very next request evaluates the new mode.

## The four required modes

| Mode | Behavior |
|---|---|
| `ENABLED` | On for everyone, including anonymous/no-identity requests |
| `DISABLED` | Off for everyone |
| `BETA_ONLY` | On only for requests carrying a real, resolved `betaUserId` — off for anonymous |
| `USER_SPECIFIC` | On only for the exact real beta users listed in `enabledForUsers` |

An **undeclared flag evaluates to `false`** — never fabricated as enabled. A future feature checking a flag that was never explicitly created stays off by default, the safe direction.

## API

- `GET /api/v2/feature-flags` — list every real flag and its current mode.
- `GET /api/v2/feature-flags/:key/evaluate` — the real evaluation a feature checks at runtime, resolved against `req.betaUserId` (from the existing `betaUserContext` middleware).
- `PATCH /api/v2/feature-flags/:key` — set a flag's mode (and, for `USER_SPECIFIC`, its real user list). Upserts — setting a never-before-seen key creates it.

No admin UI ships this phase beyond the read side already visible on the Admin Dashboard's data model — toggling today is a direct `PATCH` call (e.g. via `curl` or a future Admin Dashboard control panel, real follow-up work, not built this phase to stay within "no major product features").

## How a future feature uses this

```js
const featureFlagService = require("../services/featureFlagService");
if (await featureFlagService.isFeatureEnabled("new_chart_tool", req.betaUserId)) {
  // real gated behavior
}
```

## Testing

7 tests in `featureFlagService.test.js`: undeclared-flag-defaults-false, invalid-mode rejection, and one test per real mode (including the `USER_SPECIFIC` exact-match case and confirming a flag can be re-toggled live with no code change, verified by re-evaluating the same key after a second `setFlag` call). 3 more in `betaOperations.integration.test.js` proving the real HTTP set→evaluate round trip.
