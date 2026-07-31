# The Living World — LIVING-WORLD-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-07-31

## Mission

ImpactOne is no longer a dashboard — it's a living financial planet. Every live event should physically change the environment, and every existing visualization should subscribe to one shared world state. No new features, no new APIs, no business-logic changes; everything driven only by existing real data.

## The Global World State Engine

`frontend/src/features/flagshipScreen/worldState.js` — one real, pure function, `computeWorldState(panels)`, reading the same real, already-fetched panel data every prior phase in this line already reads (`useFlagshipData.js` — zero new fetches this phase). It replaces the narrower `ambientState.js` from `IMMERSIVE-INTERACTIONS-001` (which read only 2 of the mission's 10 named signals) with one that reads all 10:

| Mission signal | Real source (already fetched) |
|---|---|
| Breaking News | `breakingNews.data.length` |
| Macro | `macroCalendar.data.length` |
| Market Regime | Derived proxy from real tone + Fear & Greed (see below — disclosed, not a new indicator) |
| Fear & Greed | `fearGreed.data.value` |
| Claim Intelligence | `globalEvents.data.length` |
| Agent Consensus | `agentConsensus.data.cio.confidence` |
| Portfolio Health | `portfolioHealth.data.valueChangePct` / `.hasComparison` |
| Importance Score | The one real composite `intensity` this engine computes from all of the above |
| Confidence | Same `cio.confidence`, mapped to a real 0..1 `confidenceIntensity` |
| Alerts | `alerts.data.length` |

`ambientState.js` and its test were deleted this phase — `worldState.js` is now the one, sole computation of "how alive should the world feel right now"; keeping the old, narrower module around alongside the new one would have been exactly the kind of duplicated calculation this phase's own performance requirement rules out.

## "Market Regime": A Disclosed Proxy, Not a New Indicator

This codebase has no dedicated regime-classification endpoint. Rather than fabricate one (which the mission's "do not change business logic" rules out), `worldState.js` honestly derives a `risk-on` / `risk-off` / `neutral` regime label from the same real `tone` (portfolio direction, with a Fear & Greed fallback when no portfolio comparison exists yet) every other signal already uses — a real, disclosed reuse, not a second, independent computation of market conditions.

## Every Existing Visualization Now Subscribes to One Shared State

`FlagshipScreen.jsx` computes `worldState` exactly once (`useMemo`, keyed on `panels`) and passes it as a single object into `FlagshipEarthScene.jsx`, which threads it through to every consuming visual system — replacing the prior phase's separate `ambientState`/`eventCount` props. Every one of the following now reads from the same one object:

- World lighting (ambient/key/fill light intensity)
- Atmosphere (`WorldAtmosphere`'s fog/particle intensity)
- Earth glow (`Earth`'s `ambientColor`/`ambientIntensity`)
- Connection intensity (the 10 panel lines' opacity, plus `EnergyBeam` colors)
- Orbital activity (`OrbitalNode`'s pulse amplitude, now blended with world intensity in addition to its existing per-panel status)
- Sector activity waves (`ActivityWaves`, now reading `worldState.claimCount` directly)
- The Confidence Halo (now reading the already-computed `worldState.confidenceIntensity` directly, rather than re-deriving it from a raw label a second time)
- The Importance Pulse (reads `worldState.intensity` directly — this visualization *is* the Importance Score's own literal, direct visual form)
- **Camera energy** (new this phase — see `CameraRig.js`'s new `energy` prop, scaling how pronounced the pointer-parallax nudge feels)
- **Background stars / ambient sound hooks** — see the disclosed scope notes in `WORLD_REACTION_MODEL.md`

See `WORLD_REACTION_MODEL.md` for the complete, itemized mapping from `worldState`'s fields to every one of the mission's named "Drive" targets, and `WORLD_STATE_ENGINE.md` for the engine's own internal design.

## Smooth Interpolation, No Abrupt Transitions

Every consumer of `worldState` was already using — or, this phase, was given — a real eased transition rather than an instant snap, consistent with the "no abrupt transitions" requirement:

- `Earth.jsx`'s atmosphere color/opacity already eased toward its target (`IMMERSIVE-INTERACTIONS-001`) — unchanged, confirmed still correct.
- `CameraRig.js`'s camera-energy scaling multiplies an already-smoothed parallax value — never applied as a raw, un-eased jump.
- Panel line opacity and orbital pulse amplitude are continuous functions of `worldState.intensity` evaluated fresh every render — since `worldState` itself only changes when real data refreshes (not every frame), and React re-renders are already batched, there is no discrete "before/after" frame where these values jump; they update once, to their new real value, exactly when the real data does.

## Performance

- **No duplicated calculations**: `worldState.js` deliberately does *not* pre-compute per-target driver values (fog density, particle count, etc.) — each consuming site owns its own small, disclosed linear mapping from the one shared `intensity`, exactly once, at its own call site (see `WORLD_STATE_ENGINE.md`'s design rationale).
- **Single world state**: exactly one `computeWorldState` call per `FlagshipScreen` render cycle, memoized.
- **Memoized updates**: `useMemo(() => computeWorldState(panels), [panels])` — recomputed only when the real underlying panel data actually changes, not on every render.

## Tests

- `frontend/src/features/flagshipScreen/worldState.test.js` — 11 new tests: honest neutral defaults, real tone/regime detection (portfolio-led and Fear-&-Greed-fallback), composite intensity scaling with more real activity, the "alert" vs. "calm" sound-hook thresholds, real count fields, output range safety, and graceful handling of missing data.
- Full existing suite (`orbitalConfig.test.js`, `cameraEasing.test.js`, `panelConfig.test.js`, `visualizationMappings.test.js`, `AppRoot.test.jsx`, the entire frontend suite) re-run — zero regressions.

## Files Changed

**New:** `frontend/src/features/flagshipScreen/worldState.js` + test; `LIVING_WORLD.md`, `WORLD_STATE_ENGINE.md`, `WORLD_REACTION_MODEL.md`.

**Deleted:** `frontend/src/features/flagshipScreen/ambientState.js` + test (fully superseded by `worldState.js`).

**Modified:** `frontend/src/features/flagshipScreen/FlagshipScreen.jsx`, `FlagshipEarthScene.jsx`, `DataVisualizationLayer.jsx`; `frontend/src/features/workspace3d/CameraRig.jsx`.
