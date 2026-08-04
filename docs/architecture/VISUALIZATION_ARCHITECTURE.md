# Visualization Architecture — DATA-VISUALIZATION-001

Real component structure and data flow for `frontend/src/features/flagshipScreen/DataVisualizationLayer.jsx` and `visualizationMappings.js`. Complements `3D_COMPONENT_MAP.md` (the original 3D component inventory) and `FLAGSHIP_IMPLEMENTATION.md`.

## Layering Principle

`DataVisualizationLayer.jsx` is a pure *rendering* layer — it receives already-fetched, already-shaped real data as props and turns it into geometry. It performs zero fetching, zero business-logic computation, and zero new derivation beyond simple, disclosed presentation math (ring layout, color mapping, intensity scaling) — every one of those small derivations lives in the separate, pure, unit-tested `visualizationMappings.js` module, kept out of the React/three.js components themselves so it can be tested without mounting a `<Canvas>`.

```
useFlagshipData.js (existing, unchanged)
    │  real API responses: recommendations, committee, claims,
    │  breakingNews, portfolio delta, etc.
    ▼
FlagshipScreen.jsx
    │  passes real sub-fields straight through as props — no
    │  transformation happens here either, beyond simple `?.` optional
    │  chaining and `|| []`/`|| null` honest defaults
    ▼
FlagshipEarthScene.jsx
    │  resolves each visualization's real anchor position (which of
    │  the 10 already-computed PANEL_POSITIONS it's near) and renders
    │  each DataVisualizationLayer export inside the <Canvas>
    ▼
DataVisualizationLayer.jsx exports:
    CapitalFlowLines    — reads panelPositions + panelStatuses + panelKeys
    CompanyClusters     — reads recommendations + anchorPosition
    AgentConstellation  — reads committee + anchorPosition
    ConfidenceHalo       — reads cioConfidence + anchorPosition
    ClaimNetwork        — reads claims + anchorPosition
    HistoricalTimeline  — reads breakingNewsItems + anchorPosition
    ImportancePulse     — reads ambientState.intensity + color
    │
    └─► visualizationMappings.js (pure, no React/three.js import)
          confidenceToIntensity(label)
          memberRole(memberId, committee)
          recommendationActionColor(action)
          localRingPosition(index, count, radius)
```

## Why Anchor Positions, Not New Layout Math

Every clustered visualization (`CompanyClusters`, `AgentConstellation`, `ClaimNetwork`, `HistoricalTimeline`) is positioned relative to an `anchorPosition` — the real, already-computed position of the one relevant orbital panel (AI Recommendations, Agent Consensus, Global Events, Breaking News respectively), taken directly from `FlagshipEarthScene.jsx`'s existing `PANEL_POSITIONS` array (from `panelConfig.js`, unchanged since `FLAGSHIP-SCREEN-001`). This means every new visualization is spatially coherent with the panel it elaborates on by construction — a company cluster genuinely floats near the AI Recommendations node, not at an arbitrary independent location — without this phase inventing a second, parallel layout system.

## Why One File, Not Seven

`DataVisualizationLayer.jsx` bundles all 7 new visual components in one module (mirroring the established `ActivityWaves.jsx` precedent from `CINEMATIC-EXPERIENCE-002`, which bundles `SectorActivityWaves` + `Shockwave`) rather than 7 separate files. Each is small (most under 30 lines), shares the same real data-flow shape (props in, geometry out), and — critically — several share real, small internal helpers (`localRingPosition`, the same cluster-radius constants) that would otherwise need to be duplicated or extracted into yet another shared module. One file keeps the real, tight coupling between these genuinely related visualizations honest in the code structure, not just in the docs.

## Rendering Technique Per Visualization

| Component | Technique | Why |
|---|---|---|
| `CapitalFlowLines` | One small sphere per panel (10, fixed), position lerped each frame via `useFrame` | Same technique as `EnergyBeam`/`Shockwave` pulses — cheap, already-proven in this codebase |
| `CompanyClusters` | Static-position spheres (one per real recommendation, capped) + `Html` label | No per-frame animation needed — a cluster's membership only changes when real data refreshes, not every frame |
| `AgentConstellation` | Static-position spheres + `Line` back to the panel node | Same reasoning as `CompanyClusters` |
| `ConfidenceHalo` | One static `RingGeometry`, scale/opacity set directly from props (no `useFrame` at all) | The confidence category only changes on a real data refresh — animating it every frame would be real, unnecessary work for a value that isn't continuously changing |
| `ClaimNetwork` | Static-position spheres + `Line` | Same reasoning as `CompanyClusters`/`AgentConstellation` |
| `HistoricalTimeline` | Static-position spheres along a computed arc, opacity fixed per index | Chronological order is encoded once in the real, already-ordered `breakingNewsItems` array — no animation needed to convey it |
| `ImportancePulse` | One ring mesh, scale/opacity driven by a real `useFrame` sine pulse whose *amplitude* (not existence) is set by real `intensity` | The one visualization in this set that's continuously animated, since it's meant to read as the Earth's own "pulse" — but its amplitude is still honestly zero-ish at zero real intensity, never faked activity |

Only `CapitalFlowLines` and `ImportancePulse` use a per-frame `useFrame` callback; the other five are static geometry that only re-renders when their own real props actually change (React's normal re-render behavior, no extra memoization needed given how infrequently this data refreshes relative to a 60fps frame budget).

## No Duplicated Rendering

Each of the 10 Earth-to-panel connecting lines and the panel nodes themselves are rendered exactly once, by the existing `FlagshipEarthScene.jsx` panel-mapping loop (unchanged this phase). `CapitalFlowLines` does not re-render those lines — it only adds the traveling pulse spheres, reading the same `PANEL_POSITIONS`/`panelStatuses` the existing loop already computed, passed through as props rather than recomputed a second time.
