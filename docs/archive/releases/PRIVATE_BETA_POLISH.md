# Private Beta Polish — Phase X5

## Audit method

A codebase-wide sweep of `frontend/src/**/*.jsx`/`*.js` (excluding tests) for the anti-patterns this phase names explicitly: raw `error.message` rendered to the user, bare "Loading..." states with no context, terse empty-state dead ends, and any leaked engineering vocabulary (endpoint, API, stack trace, null/undefined/NaN literals). Findings were prioritized by screen traffic (Home, Decision Center, Portfolio, Workspaces first) over lower-traffic or dev-gated surfaces.

## Fixed this phase

**Root-cause pattern: `catch(err) { setError(err?.message || "friendly text") }`.** This construct shows the *friendly* text only when `err.message` is falsy — in practice, nearly every real JS error has a `.message`, so the friendly fallback almost never actually fired. Fixed at every real (non-dev-gated) occurrence found:

- `DecisionCenterScreen.jsx` — load failures now always show "Couldn't load the Decision Center right now. Try again in a moment." The real error is still captured via the existing `logError()` call, for diagnostics — never for display.
- `PortfolioScreen.jsx` — same fix: "We couldn't refresh portfolio intelligence right now." replaces a raw fetch-failure message. The existing Sprint 34 behavior (keep the last good data on screen rather than blanking it) is unchanged — only the error text itself was fixed.
- `AiAnalysisScreen.jsx` — four separate leaks, all from the same pattern applied to `Promise.allSettled` rejection reasons (`aiResponse.reason?.message`, `compareResponse.reason?.message`, `altResult?.reason?.message`, `intelResult?.reason?.message`). All four now show a fixed friendly message and log the real rejection via `logError` instead of surfacing it.
- `EmptyState.jsx`'s default message ("No data available.") replaced with "Nothing here yet — check back once there's real data to show." — every caller that supplies its own `message` is unaffected; this only changes the rare caller that doesn't.
- `WorkspaceDetail.jsx`'s modal title showed a bare "Loading..." while the workspace name hadn't loaded yet — changed to "Loading workspace…" for minimal but real context.

## Explicitly not touched, and why

`IntelligenceConsoleScreen.jsx`'s diagnostics panel (rate-limiter counts, contract-validation issues, raw provider error messages) is inherently engineering-facing content, reachable only behind `VITE_DEV_CONSOLE=true` — it is never part of a real beta user's experience (see `Sidebar.jsx`'s same gating). Softening its wording would be polishing a screen investors never see; it was left as-is.

`normalizeError()`'s own fallback (`"Unexpected error"`) was left unchanged — it's the shared utility `logError()` uses for *console* diagnostics, where the raw message is exactly what's wanted. The fix belongs at each *display* call site (done above), not in the shared logging utility.

## What "teaches" vs. what doesn't (per the mission's "every error must teach")

The fixes above stop at "never show a scary raw error" — they do not yet each individually explain *why* the failure happened or what specifically to do about it (e.g. "check your connection" vs. "our servers are catching up"). Real per-failure-mode differentiation (network vs. timeout vs. 5xx vs. auth) is real, valuable follow-up work, distinct from this phase's fix (removing raw leaks): the `X4_COMPLETION_REPORT.md`'s identity-flow error codes (`MISSING_CODE`/`INVALID_CODE`/`EXPIRED_CODE`) are the one place in this codebase that already does this well, and are the pattern a future differentiation pass should extend to Decision Center/Portfolio/AI Analysis.

## Loading and empty states already found in good shape

Most loading states already carry real context (`"Gathering today's decisions"`, `"Loading watchlist intelligence..."`, `"Building the Impact Graph for {symbol}"`) and most empty states already explain a next step (`"Add your first symbol to start tracking it"`-style copy in Watchlist Folders, Decision Center's `"No decisions need your attention right now."`) — these were not templated defaults, so they were left alone rather than rewritten for the sake of rewriting.
