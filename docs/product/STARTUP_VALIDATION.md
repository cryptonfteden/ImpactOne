# Startup Validation — Phase X6, Part 1

## The problem, concretely

Before this phase, nothing wrapped `<AppProviders><AppRoot /></AppProviders>` in `main.jsx`. Any render-time throw — a broken provider, a bad lazy import, a screen map entry that resolved to `undefined` — unmounted React straight to a blank white page with no recovery path and no diagnostic trail. This was not a hypothetical: Part 2's release validation script (built the same phase) immediately caught a real, already-shipped instance of exactly this failure mode — see below.

## The two-layer defense

### 1. `AppErrorBoundary.jsx` — the backstop

A React error boundary wrapping the entire app (`main.jsx`: `<AppErrorBoundary><AppProviders><AppRoot /></AppProviders></AppErrorBoundary>`). Catches any render-time throw, anywhere in the tree, and replaces it with a real recovery screen: "Something went wrong loading the app," a plain-language reassurance that nothing saved was lost, and a "Reload ImpactOne" button. The raw error and component stack are logged via `logError()` — never rendered.

**One failure mode this cannot catch**: if `document.getElementById("root")` itself returns `null`, React never gets a tree to catch into. `main.jsx` handles this separately with a plain-DOM fallback (`document.body.innerHTML = ...`) — the one place in the app where a graceful screen is built without React, because React isn't available yet.

### 2. `startupValidation.js` — the predictive check

A pure, framework-free module (`runStartupValidation`) that runs once at `screenRegistry.js`'s module load, before any screen renders:

- `validateScreenMap(screenMap, navigableKeys)` — confirms every registered screen resolves to a real component (function or `React.lazy`-shaped object with `$$typeof`), and that every nav-reachable key (from `Sidebar.jsx`'s `SIDEBAR_NAV_KEYS` and `BottomNav.jsx`'s `BOTTOM_NAV_KEYS`, both exported for exactly this purpose) has a matching `screenMap` entry — a dead nav link.
- `validateRequiredModules(namedValues)` — confirms a set of critical imports (`HomeFeature`, `PortfolioFeature`, `DecisionCenterFeature`) aren't `undefined`/`null`.

This is honestly scoped: a genuinely missing named export fails at **bundle time** in this Vite/ESM setup, not runtime — that class of failure is caught by Part 2's release-validation build check, not this module. What `startupValidation.js` catches is the class that *does* survive to runtime: a conditional import that silently resolved to nothing, a typo'd re-export that resolved to `undefined` instead of throwing, or a nav item that was added without a matching screen.

**Never blocks.** A validation failure is logged and surfaced on the Health Dashboard (Part 4) — it never prevents the app from rendering. `AppErrorBoundary` is the true backstop for anything this can't predict.

## The bug it (and Part 2) actually found

While building this phase, `Header.jsx` was found importing `BETA_USER_LABEL_STORAGE_KEY` from `BetaInviteGate.jsx` — an export that moved to `useBetaIdentity.js` during Phase X4's identity-flow rewrite, but this one import site was never updated. It worked in `npm run dev` and in every Vitest run (both tolerate the mismatch differently), but **failed the real production build** with `[MISSING_EXPORT]`. This means the app has been silently broken in production since Phase X4 — caught only now, by Part 2's release validation script. Fixed this phase (see `RELEASE_CHECKLIST.md`).

## Testing

`startupValidation.test.js` (9 tests): valid screen map passes, a `screenMap` entry resolved to `undefined` is flagged by name, a nav key with no screen entry is flagged as a dead end, a `React.lazy`-shaped value is accepted, missing/null required modules are flagged by name, and the combined report aggregates both categories correctly. `AppErrorBoundary.test.jsx` (3 tests): normal children render unaffected, a thrown error is caught and replaced with the friendly screen (never showing the raw message), and the reload button calls `window.location.reload`.
