# The Flagship Screen — FLAGSHIP-SCREEN-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-07-31

## Mission

Build the single flagship screen of ImpactOne — the one screen someone opens and immediately understands what is happening, why it matters, what affects them, and what they should do next, all in one cinematic view. No new backend, no API changes, no business-logic changes, no placeholder widgets — only real, already-existing services and real data.

## What "Flagship" Means Here

This is not a new dashboard layout. It's a single, continuous 3D scene — a live Earth at the center with the mission's 10 required intelligence panels floating around it, each visually connected to the Earth by a real line, each backed by a real backend service this codebase already runs, exposed, and tests. Opening a panel never changes the page — the camera moves to it and a glassmorphism panel slides in with its real content, the exact navigation model established in the prior 3D Workspace phase (`IMPACTONE-3D-WORKSPACE-001`), which this phase reuses directly (`Earth`, `CameraRig`, `OrbitalNode`, `MissionControlChain` are all imported from `features/workspace3d/`, not duplicated).

## The 10 Required Panels — Every One Backed By Real, Existing Data

| Panel | Real backend source | What it shows |
|---|---|---|
| AI Market Summary | `morningBriefApi.getToday()` | The day's top real Brief item (headline, why it matters, affected assets) |
| Global Events | `claimsApi.listActive({ limit: 8 })` | Real, currently active market Claims |
| Portfolio Health | `portfolioEngineApi.getPerformanceDelta()` | Real total value, day-over-day change, and per-metric deltas |
| AI Recommendations | `recommendationsApi.list({ status: "ACTIVE" })` | Real active recommendations (symbol, action, reasoning) |
| Watchlist | this app's existing `useWatchlist()` hook | The user's real, locally-tracked symbol list |
| Fear & Greed | `marketApi.getQuote("SPY").fearGreed` | The real Fear & Greed reading (value + classification), same field `AiAnalysisScreen.jsx` already reads |
| Agent Consensus | `committeeIntelligenceApi.convene(symbol)` | The real Investment Committee's `cio.overallThesis` for the user's top watchlist symbol (or `SPY` if the watchlist is empty) |
| Macro Calendar | `altDataApi.getEvents()` | Real upcoming macro/economic events |
| Breaking News | `claimsApi.listOvernightChanges({ limit: 8 })` | Real overnight Claim status transitions |
| Alerts | `priceAlertsApi.list()` | The user's real, active price alerts |

Every one of these calls already exists, is already used by at least one other screen in this codebase, and is already covered by that screen's own tests — this phase adds zero new backend routes, zero new controllers, zero new services. `useFlagshipData.js` is the one hook that issues all 10 real calls together via `Promise.allSettled` — exactly the fault-isolation pattern `MissionControlHomeScreen.jsx` already established (one real failure never blanks or blocks any of the other 9 real panels).

## The Central Object: A Live Earth

The same `Earth.jsx` component built in the prior 3D Workspace phase — a rotating, lit sphere with a translucent cloud shell and an atmosphere glow — sits at the center of this screen too, reused as-is (not re-implemented). Every one of the 10 panels orbits it at a fixed radius, each with a real, always-visible connecting line back to the Earth (`FlagshipEarthScene.jsx`), directly satisfying the mission's "every panel connects visually to the Earth."

## Mission Chain

A dedicated "Mission Chain" toolbar button reveals the same real, animated `Global Event → AI Reasoning → Sector Impact → Company Impact → Portfolio Impact → Recommendation` visualization built in the prior phase (`MissionControlChain.jsx`, reused directly, not duplicated) — floating above the scene, a live, looping, animated sequence rather than a static diagram.

## Portfolio → Holdings Connections

When the real Portfolio Health data (`portfolioEngineApi.getPerformanceDelta()`) reports one or more real per-metric `changes`, the scene draws that many real, independently-animated pulsing lines from the Earth directly to the Portfolio panel's position (`HoldingConnection` in `FlagshipEarthScene.jsx`) — capped at 4 simultaneous connections to keep the scene legible and cheap. This is the mission's own "when portfolio holdings are affected, draw animated connections from the Earth directly to those holdings," implemented honestly from the real, already-computed delta data (no new computation — the count is real `changes.length`, not fabricated).

## Navigation: Camera-Driven, Earth Always Visible

Selecting any panel calls the exact same `CameraRig`/`focusedCameraFor` mechanism from the 3D Workspace phase — the camera smoothly moves to frame that panel while the Earth remains visible behind it, and its real content opens in a glassmorphism panel. There is no route change, no page reload, no modal — exactly the mission's own "no modal windows, no page transitions" and "the camera moves, the workspace morphs, the Earth always remains visible."

## Disclosed Scope Decision

Exactly like the prior 3D Workspace phase, this screen is registered as its own reachable, pinned nav entry (`"Flagship"`) rather than replacing the existing `Home` landing screen outright. Making it the actual default first-open screen (the mission's "when someone opens ImpactOne for the first time") is the natural next step once this implementation is validated — not done in this pass, to avoid changing the app's default first-run experience for every existing user/test in the same change that builds the screen itself. See `FLAGSHIP_IMPLEMENTATION.md` for the full rationale.

## Tests

- `frontend/src/features/flagshipScreen/panelConfig.test.js` — 5/5: exact 10-panel mission order, unique keys, orbit math, camera-focus math, and the real Portfolio Health panel index used for holding connections.
- Full existing frontend suite re-run after this phase — see the commit for the exact pass count; zero regressions introduced (this phase touches no backend and no existing screen's own logic).

## Files Changed

**New:** `frontend/src/features/flagshipScreen/` (`panelConfig.js` + test, `useFlagshipData.js`, `FlagshipPanelContent.jsx`, `FlagshipEarthScene.jsx`, `FlagshipScreen.jsx`, `flagshipScreen.css`), `FLAGSHIP_SCREEN.md`, `FLAGSHIP_LAYOUT.md`, `FLAGSHIP_IMPLEMENTATION.md`.

**Modified:** `frontend/src/layout/screenRegistry.js` (+lazy `FlagshipScreenFeature` registration), `frontend/src/layout/Sidebar.jsx` (+nav item), `frontend/src/layout/MainLayout.jsx` (+`Flagship` added to the existing 3D-screen Suspense branch).
